/**
 * Incremental Sync Pipeline
 * 增量同步管线 - 批量上传优化版本
 * 
 * 主要功能：
 * - 变化检测：对比 lastLibrarySyncAt 与 annotation modified time
 * - 智能分组：按父条目归并注释
 * - 批量上传：分批调用 bulkCreateHighlights
 * - 两阶段提交：仅在成功后更新 stateStore
 * - 统计报告：提供详细的同步统计信息
 * - 错误处理：重试机制、断路器保护
 */

import { Logger } from '../../utils/logger';
import { StateStore } from '../../storage/stateStore';
import { ReadwiseClient } from '../../api/readwiseClient';
import { ZoteroAdapter } from '../../adapters/zoteroAdapter';
import { ZoteroToReadwiseMapper } from '../../mappers/zoteroToReadwise';
import { BatchRetryManager, ErrorClassifier, ErrorType } from '../../utils/retry';
import { ApiError, SyncError } from '../../utils/errors';
import { 
  SyncPipelineOptions, 
  SyncBatch, 
  SyncStatistics, 
  ChangeDetectionResult,
  BatchUploadResult,
  SyncItem,
  SyncStatus
} from './types';

export class IncrementalSyncPipeline {
  private readonly logger: Logger;
  private readonly stateStore: StateStore;
  private readonly readwiseClient: ReadwiseClient;
  private readonly zoteroAdapter: ZoteroAdapter;
  private readonly mapper: ZoteroToReadwiseMapper;
  private readonly batchRetryManager: BatchRetryManager;
  
  // Pipeline state
  private currentStatus: SyncStatus = 'idle';
  private statistics: SyncStatistics;
  private abortController?: AbortController;
  
  // Cache for book IDs
  private bookIdCache: Map<string, string> = new Map();
  
  // Error tracking
  private failedItemsDetails: Map<string, { error: Error; attempts: number }> = new Map();
  
  constructor(
    stateStore: StateStore,
    readwiseClient: ReadwiseClient,
    zoteroAdapter: ZoteroAdapter,
    mapper: ZoteroToReadwiseMapper,
    logger: Logger
  ) {
    this.stateStore = stateStore;
    this.readwiseClient = readwiseClient;
    this.zoteroAdapter = zoteroAdapter;
    this.mapper = mapper;
    this.logger = logger;
    this.statistics = this.createEmptyStatistics();
    
    // 初始化批量重试管理器
    this.batchRetryManager = new BatchRetryManager(
      {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 30000,
        backoffMultiplier: 2,
        jitter: true,
        onRetry: (error, attempt) => {
          this.logger.warn(`Retry attempt ${attempt}:`, error);
        }
      },
      {
        failureThreshold: 5,
        resetTimeout: 60000,
        halfOpenMaxAttempts: 3
      },
      this.logger.createChild('BatchRetry')
    );
  }

  /**
   * 执行增量同步管线
   */
  async executePipeline(options: SyncPipelineOptions = {}): Promise<SyncStatistics> {
    if (this.currentStatus !== 'idle') {
      throw new Error(`Sync pipeline already in progress: ${this.currentStatus}`);
    }

    this.abortController = new AbortController();
    this.statistics = this.createEmptyStatistics();
    this.statistics.startTime = Date.now();
    
    try {
      // Step 1: 变化检测
      this.currentStatus = 'detecting';
      this.logger.info('Starting change detection...');
      const changes = await this.detectChanges(options);
      
      if (changes.newItems.length === 0 && changes.modifiedItems.length === 0) {
        this.logger.info('No changes detected, skipping sync');
        this.statistics.itemsSkipped = changes.unchangedItems.length;
        return this.finalizeStatistics();
      }
      
      // Step 2: 分组准备
      this.currentStatus = 'grouping';
      this.logger.info('Grouping items by parent...');
      const batches = await this.groupItemsByParent(changes);
      
      // Step 3: 批量上传
      this.currentStatus = 'uploading';
      this.logger.info(`Uploading ${batches.length} batches...`);
      const uploadResults = await this.batchUpload(batches, options);
      
      // 检查断路器状态
      if (this.batchRetryManager.getCircuitBreakerState() === 'open') {
        this.logger.error('Circuit breaker is open, stopping sync');
        this.showUserInterventionDialog();
        throw new Error('Sync stopped due to too many consecutive failures');
      }
      
      // Step 4: 两阶段提交
      this.currentStatus = 'committing';
      this.logger.info('Committing sync state...');
      await this.commitSyncState(uploadResults, options);
      
      // Step 5: 生成统计报告
      this.currentStatus = 'finalizing';
      return this.finalizeStatistics();
      
    } catch (error) {
      this.currentStatus = 'error';
      this.logger.error('Sync pipeline failed:', error);
      this.statistics.errors.push(error as Error);
      throw error;
    } finally {
      this.currentStatus = 'idle';
      this.abortController = undefined;
    }
  }

  /**
   * Step 1: 检测变化
   * 对比 lastLibrarySyncAt 与注释 modified time
   */
  private async detectChanges(options: SyncPipelineOptions): Promise<ChangeDetectionResult> {
    this.checkAborted();
    
    const result: ChangeDetectionResult = {
      newItems: [],
      modifiedItems: [],
      unchangedItems: [],
      deletedItems: []
    };
    
    // 获取库的最后同步时间
    const libraryId = options.libraryId || 'default';
    const lastSyncTime = await this.stateStore.getLibraryLastSync(libraryId);
    
    // 扫描 Zotero 条目和注释
    const scanOptions = {
      modifiedAfter: options.incremental ? lastSyncTime : undefined,
      collections: options.collections,
      tags: options.tags,
      includeItemsWithoutAnnotations: false
    };
    
    const items = await this.zoteroAdapter.getItemsWithAnnotations(scanOptions);
    this.logger.info(`Scanned ${items.length} items from Zotero`);
    
    // 分析每个条目的变化状态
    for (const item of items) {
      const itemKey = item.item.key;
      const existingRecord = await this.stateStore.getAnnotationRecord(itemKey);
      
      if (!existingRecord) {
        // 新条目
        result.newItems.push(item);
        this.statistics.itemsNew++;
      } else {
        // 检查注释是否有变化
        const hasChanges = await this.checkAnnotationChanges(item, lastSyncTime);
        
        if (hasChanges) {
          result.modifiedItems.push(item);
          this.statistics.itemsModified++;
        } else {
          result.unchangedItems.push(item);
        }
      }
    }
    
    // 检测已删除的条目（可选）
    if (options.detectDeleted) {
      const allSyncedKeys = await this.stateStore.getAllSyncedItemKeys();
      const currentKeys = new Set(items.map(i => i.item.key));
      
      for (const syncedKey of allSyncedKeys) {
        if (!currentKeys.has(syncedKey)) {
          result.deletedItems.push(syncedKey);
          this.statistics.itemsDeleted++;
        }
      }
    }
    
    this.logger.info(`Change detection complete: ${result.newItems.length} new, ${result.modifiedItems.length} modified, ${result.unchangedItems.length} unchanged`);
    return result;
  }

  /**
   * 检查注释是否有变化
   */
  private async checkAnnotationChanges(item: any, lastSyncTime?: Date): Promise<boolean> {
    if (!lastSyncTime) return true;
    
    // 检查每个注释的修改时间
    for (const annotation of item.annotations) {
      const modifiedTime = new Date(annotation.dateModified);
      if (modifiedTime > lastSyncTime) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Step 2: 按父条目分组
   */
  private async groupItemsByParent(changes: ChangeDetectionResult): Promise<SyncBatch[]> {
    this.checkAborted();
    
    const batches: SyncBatch[] = [];
    const allItems = [...changes.newItems, ...changes.modifiedItems];
    
    for (const item of allItems) {
      try {
        // 映射条目到 Readwise 格式
        const mappedItem = await this.mapper.mapItem(item);
        if (!mappedItem) continue;
        
        // 解析或缓存 book_id
        let bookId = this.bookIdCache.get(item.item.key);
        if (!bookId && mappedItem.book) {
          // 尝试查找或创建书籍
          bookId = await this.readwiseClient.upsertBook(mappedItem.book);
          this.bookIdCache.set(item.item.key, bookId);
        }
        
        // 创建同步批次
        const batch: SyncBatch = {
          parentItemKey: item.item.key,
          bookId,
          bookInfo: mappedItem.book,
          highlights: mappedItem.highlights || [],
          annotations: item.annotations.map(a => ({
            key: a.id,
            hash: this.calculateAnnotationHash(a),
            readwiseHighlightId: undefined
          })),
          status: 'pending'
        };
        
        batches.push(batch);
      } catch (error) {
        this.logger.error(`Failed to prepare batch for item ${item.item.key}:`, error);
        this.statistics.itemsFailed++;
      }
    }
    
    this.logger.info(`Prepared ${batches.length} batches for upload`);
    return batches;
  }

  /**
   * Step 3: 批量上传
   */
  private async batchUpload(batches: SyncBatch[], options: SyncPipelineOptions): Promise<BatchUploadResult[]> {
    this.checkAborted();
    
    const results: BatchUploadResult[] = [];
    const batchSize = options.batchSize || 50;
    
    // 使用批量重试管理器处理上传
    const uploadResult = await this.batchRetryManager.executeBatch(
      batches,
      async (batch) => this.uploadSingleBatchWithRetry(batch, options),
      {
        concurrency: options.concurrency || 5,
        continueOnError: true,
        onItemError: (batch, error, index) => {
          this.handleBatchError(batch, error, index);
        }
      }
    );
    
    // 处理成功的批次
    for (const { item: batch, result, index } of uploadResult.successful) {
      results.push(result);
      batch.status = 'success';
      this.statistics.itemsSuccess++;
      this.statistics.highlightsUploaded += result.highlightIds.length;
    }
    
    // 处理失败的批次
    for (const { item: batch, error, index } of uploadResult.failed) {
      const errorResult: BatchUploadResult = {
        batchId: batch.parentItemKey,
        success: false,
        highlightIds: [],
        error
      };
      results.push(errorResult);
      batch.status = 'failed';
      this.statistics.itemsFailed++;
      this.statistics.errors.push(error);
      
      // 记录失败详情
      this.failedItemsDetails.set(batch.parentItemKey, {
        error,
        attempts: this.failedItemsDetails.get(batch.parentItemKey)?.attempts || 1
      });
    }
    
    // 记录失败项汇总
    if (uploadResult.failed.length > 0) {
      this.logFailedItemsSummary();
    }
    
    return results;
  }

  /**
   * 上传单个批次（带重试）
   */
  private async uploadSingleBatchWithRetry(batch: SyncBatch, options: SyncPipelineOptions): Promise<BatchUploadResult> {
    try {
      // 调用 bulkCreateHighlights
      const highlights = await this.readwiseClient.bulkCreateHighlights(
        batch.highlights,
        batch.bookInfo
      );
      
      // 记录返回的 highlight IDs
      const highlightIds = highlights.map(h => h.id);
      
      // 更新批次中的注释记录
      for (let i = 0; i < Math.min(batch.annotations.length, highlightIds.length); i++) {
        batch.annotations[i].readwiseHighlightId = highlightIds[i];
      }
      
      return {
        batchId: batch.parentItemKey,
        success: true,
        highlightIds,
        uploadedAt: new Date()
      };
    } catch (error) {
      // 分析错误类型
      const errorType = ErrorClassifier.classify(error);
      const errorMessage = this.formatErrorMessage(error, errorType);
      
      this.logger.error(`Failed to upload batch ${batch.parentItemKey}: ${errorMessage}`);
      
      // 对于不可重试的错误，提供具体指导
      if (errorType === ErrorType.AUTH_ERROR) {
        this.logger.error('Authentication failed. Please check your Readwise API token.');
        this.showAuthErrorDialog();
      } else if (errorType === ErrorType.VALIDATION) {
        this.logger.error('Validation error:', {
          batch: batch.parentItemKey,
          highlights: batch.highlights.length,
          example: batch.highlights[0]
        });
      }
      
      throw error;
    }
  }
  
  /**
   * 处理批次错误
   */
  private handleBatchError(batch: SyncBatch, error: Error, index: number): void {
    const errorType = ErrorClassifier.classify(error);
    
    this.logger.logStructured('error', 'Batch processing failed', {
      batchId: batch.parentItemKey,
      errorType,
      errorMessage: error.message,
      itemIndex: index,
      attempts: this.failedItemsDetails.get(batch.parentItemKey)?.attempts || 1
    });
  }
  
  /**
   * 格式化错误消息
   */
  private formatErrorMessage(error: any, errorType: ErrorType): string {
    const parts = [`[${errorType}]`];
    
    if (error.statusCode) {
      parts.push(`Status: ${error.statusCode}`);
    }
    
    parts.push(error.message || 'Unknown error');
    
    if (error.response?.data) {
      parts.push(`Response: ${JSON.stringify(error.response.data)}`);
    }
    
    return parts.join(' - ');
  }
  
  /**
   * 记录失败项汇总
   */
  private logFailedItemsSummary(): void {
    const failuresByType = new Map<ErrorType, number>();
    
    for (const [itemKey, details] of this.failedItemsDetails) {
      const errorType = ErrorClassifier.classify(details.error);
      failuresByType.set(errorType, (failuresByType.get(errorType) || 0) + 1);
    }
    
    this.logger.logStructured('warn', 'Failed items summary', {
      totalFailed: this.failedItemsDetails.size,
      failuresByType: Object.fromEntries(failuresByType),
      items: Array.from(this.failedItemsDetails.entries()).map(([key, details]) => ({
        key,
        error: details.error.message,
        attempts: details.attempts
      }))
    });
  }
  
  /**
   * 显示认证错误对话框
   */
  private showAuthErrorDialog(): void {
    // 在 UI 中显示认证错误提示
    if (typeof Zotero !== 'undefined' && Zotero.alert) {
      Zotero.alert(
        null,
        'Authentication Failed',
        'Your Readwise API token appears to be invalid or expired.\n\n' +
        'Please check your token in the plugin preferences and try again.'
      );
    }
  }
  
  /**
   * 显示用户介入对话框
   */
  private showUserInterventionDialog(): void {
    if (typeof Zotero !== 'undefined' && Zotero.alert) {
      Zotero.alert(
        null,
        'Sync Stopped',
        'Too many consecutive failures detected.\n\n' +
        'The sync has been stopped to prevent further issues.\n' +
        'Please check your network connection and Readwise API status,\n' +
        'then try again later.'
      );
    }
  }

  /**
   * Step 4: 两阶段提交
   * 仅在批量成功后更新 stateStore
   */
  private async commitSyncState(results: BatchUploadResult[], options: SyncPipelineOptions): Promise<void> {
    this.checkAborted();
    
    // Phase 1: 准备提交数据
    const commitRecords: any[] = [];
    
    for (const result of results) {
      if (result.success) {
        // 准备成功的记录
        commitRecords.push({
          itemKey: result.batchId,
          highlightIds: result.highlightIds,
          uploadedAt: result.uploadedAt
        });
      }
    }
    
    // Phase 2: 批量提交到 stateStore
    if (commitRecords.length > 0) {
      try {
        // 开始事务（如果支持）
        await this.stateStore.beginTransaction?.();
        
        // 批量更新注释记录
        for (const record of commitRecords) {
          await this.stateStore.batchUpdateAnnotationRecords([{
            annotationKey: record.itemKey,
            hash: this.calculateItemHash(record),
            readwiseHighlightId: record.highlightIds[0] // 主高亮ID
          }]);
        }
        
        // 更新库的最后同步时间
        const libraryId = options.libraryId || 'default';
        await this.stateStore.setLibraryLastSync(libraryId, new Date());
        
        // 提交事务
        await this.stateStore.commitTransaction?.();
        
        this.logger.info(`Committed ${commitRecords.length} successful uploads to state store`);
      } catch (error) {
        // 回滚事务
        await this.stateStore.rollbackTransaction?.();
        throw error;
      }
    }
  }

  /**
   * Step 5: 生成最终统计
   */
  private finalizeStatistics(): SyncStatistics {
    this.statistics.endTime = Date.now();
    this.statistics.duration = this.statistics.endTime - this.statistics.startTime;
    
    // 计算成功率
    const total = this.statistics.itemsSuccess + this.statistics.itemsFailed;
    this.statistics.successRate = total > 0 ? 
      (this.statistics.itemsSuccess / total) * 100 : 100;
    
    this.logger.info(`Sync pipeline completed:
      - Success: ${this.statistics.itemsSuccess}
      - Failed: ${this.statistics.itemsFailed}
      - Skipped: ${this.statistics.itemsSkipped}
      - New: ${this.statistics.itemsNew}
      - Modified: ${this.statistics.itemsModified}
      - Deleted: ${this.statistics.itemsDeleted}
      - Highlights uploaded: ${this.statistics.highlightsUploaded}
      - Duration: ${this.statistics.duration}ms
      - Success rate: ${this.statistics.successRate.toFixed(2)}%
    `);
    
    return this.statistics;
  }

  /**
   * 获取当前同步状态
   */
  getStatus(): SyncStatus {
    return this.currentStatus;
  }

  /**
   * 获取当前统计信息
   */
  getStatistics(): SyncStatistics {
    return { ...this.statistics };
  }

  /**
   * 中止同步
   */
  abort(): void {
    this.abortController?.abort();
    this.currentStatus = 'aborted';
    this.logger.info('Sync pipeline aborted by user');
  }

  /**
   * 检查是否已中止
   */
  private checkAborted(): void {
    if (this.abortController?.signal.aborted) {
      throw new Error('Sync pipeline aborted');
    }
  }

  /**
   * 创建空统计对象
   */
  private createEmptyStatistics(): SyncStatistics {
    return {
      startTime: 0,
      endTime: 0,
      duration: 0,
      itemsSuccess: 0,
      itemsFailed: 0,
      itemsSkipped: 0,
      itemsNew: 0,
      itemsModified: 0,
      itemsDeleted: 0,
      highlightsUploaded: 0,
      successRate: 0,
      errors: []
    };
  }

  /**
   * 计算注释哈希
   */
  private calculateAnnotationHash(annotation: any): string {
    const content = `${annotation.type}:${annotation.text}:${annotation.comment}:${annotation.pageNumber}`;
    return this.simpleHash(content);
  }

  /**
   * 计算条目哈希
   */
  private calculateItemHash(item: any): string {
    const content = JSON.stringify(item);
    return this.simpleHash(content);
  }

  /**
   * 简单哈希函数
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export * from './types';

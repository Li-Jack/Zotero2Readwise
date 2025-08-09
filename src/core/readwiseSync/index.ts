/**
 * Readwise Sync Orchestrator
 * 核心同步编排器 - 负责协调整个同步流程
 * 遵循 ZR 设计：无 UI 依赖，纯业务逻辑
 */

import { ZoteroAdapter } from '../../adapters/zoteroAdapter';
import { ReadwiseClient } from '../../api/readwiseClient';
import { ZoteroToReadwiseMapper } from '../../mappers/zoteroToReadwise';
import { StateStore } from '../../storage/stateStore';
import { Logger } from '../../utils/logger';
import { chunk } from '../../utils/chunk';
import { SyncOptions, SyncResult, SyncStatus } from './types';

export class ReadwiseSyncOrchestrator {
  private readonly logger: Logger;
  private readonly zoteroAdapter: ZoteroAdapter;
  private readonly readwiseClient: ReadwiseClient;
  private readonly mapper: ZoteroToReadwiseMapper;
  private readonly stateStore: StateStore;
  
  private currentSyncStatus: SyncStatus = 'idle';
  private abortController?: AbortController;

  constructor(
    zoteroAdapter: ZoteroAdapter,
    readwiseClient: ReadwiseClient,
    mapper: ZoteroToReadwiseMapper,
    stateStore: StateStore,
    logger: Logger
  ) {
    this.zoteroAdapter = zoteroAdapter;
    this.readwiseClient = readwiseClient;
    this.mapper = mapper;
    this.stateStore = stateStore;
    this.logger = logger;
  }

  /**
   * 执行完整的同步流程
   * 扫描 → 映射 → 批量上传 → 确认 → 状态更新
   */
  async sync(options: SyncOptions = {}): Promise<SyncResult> {
    if (this.currentSyncStatus !== 'idle') {
      throw new Error(`Sync already in progress: ${this.currentSyncStatus}`);
    }

    this.abortController = new AbortController();
    const startTime = Date.now();
    const result: SyncResult = {
      success: false,
      itemsSynced: 0,
      itemsFailed: 0,
      errors: [],
      duration: 0
    };

    try {
      this.currentSyncStatus = 'scanning';
      this.logger.info('Starting Readwise sync...');

      // Step 1: 扫描 Zotero 数据
      const items = await this.scanZoteroItems(options);
      this.logger.info(`Found ${items.length} items to sync`);

      if (items.length === 0) {
        result.success = true;
        return result;
      }

      // Step 2: 映射到 Readwise 格式
      this.currentSyncStatus = 'mapping';
      const mappedData = await this.mapToReadwiseFormat(items);

      // Step 3: 批量上传到 Readwise
      this.currentSyncStatus = 'uploading';
      const uploadResults = await this.batchUpload(mappedData, options);

      // Step 4: 确认同步结果
      this.currentSyncStatus = 'confirming';
      await this.confirmSync(uploadResults);

      // Step 5: 更新本地状态
      this.currentSyncStatus = 'updating';
      await this.updateSyncState(uploadResults);

      // 计算最终结果
      result.success = true;
      result.itemsSynced = uploadResults.successful.length;
      result.itemsFailed = uploadResults.failed.length;
      result.errors = uploadResults.errors;
      result.duration = Date.now() - startTime;

      this.logger.info(`Sync completed: ${result.itemsSynced} synced, ${result.itemsFailed} failed`);
      return result;

    } catch (error) {
      this.logger.error('Sync failed:', error);
      result.errors.push(error as Error);
      throw error;
    } finally {
      this.currentSyncStatus = 'idle';
      this.abortController = undefined;
    }
  }

  /**
   * 扫描 Zotero 条目和注释
   */
  private async scanZoteroItems(options: SyncOptions) {
    this.checkAborted();
    
    const lastSyncTime = await this.stateStore.getLastSyncTime();
    const scanOptions = {
      modifiedAfter: options.incremental ? lastSyncTime : undefined,
      collections: options.collections,
      tags: options.tags
    };

    const items = await this.zoteroAdapter.getItemsWithAnnotations(scanOptions);
    
    // 过滤已同步的项目（去重）
    if (options.skipDuplicates !== false) {
      return this.filterDuplicates(items);
    }
    
    return items;
  }

  /**
   * 映射 Zotero 数据到 Readwise 格式
   */
  private async mapToReadwiseFormat(items: any[]) {
    this.checkAborted();
    
    const mapped = [];
    for (const item of items) {
      try {
        const readwiseData = await this.mapper.mapItem(item);
        if (readwiseData) {
          mapped.push(readwiseData);
        }
      } catch (error) {
        this.logger.warn(`Failed to map item ${item.key}:`, error);
      }
    }
    
    return mapped;
  }

  /**
   * 批量上传到 Readwise
   */
  private async batchUpload(items: any[], options: SyncOptions) {
    this.checkAborted();
    
    const batchSize = options.batchSize || 50;
    const batches = chunk(items, batchSize);
    
    const results = {
      successful: [] as any[],
      failed: [] as any[],
      errors: [] as Error[]
    };

    for (let i = 0; i < batches.length; i++) {
      this.logger.info(`Uploading batch ${i + 1}/${batches.length}`);
      
      try {
        const response = await this.readwiseClient.uploadBatch(batches[i]);
        results.successful.push(...response.successful);
        results.failed.push(...response.failed);
      } catch (error) {
        this.logger.error(`Batch ${i + 1} failed:`, error);
        results.errors.push(error as Error);
        
        if (options.stopOnError) {
          throw error;
        }
      }
    }
    
    return results;
  }

  /**
   * 确认同步结果
   */
  private async confirmSync(results: any) {
    this.checkAborted();
    
    // 验证上传的数据
    for (const item of results.successful) {
      try {
        await this.readwiseClient.verifyUpload(item.id);
      } catch (error) {
        this.logger.warn(`Failed to verify item ${item.id}:`, error);
      }
    }
  }

  /**
   * 更新同步状态
   */
  private async updateSyncState(results: any) {
    this.checkAborted();
    
    // 保存成功同步的项目
    for (const item of results.successful) {
      await this.stateStore.markAsSynced(item.sourceId, item.id, item.hash);
    }
    
    // 更新最后同步时间
    await this.stateStore.setLastSyncTime(new Date());
  }

  /**
   * 过滤已同步的重复项
   */
  private async filterDuplicates(items: any[]) {
    const filtered = [];
    
    for (const item of items) {
      const hash = await this.stateStore.getItemHash(item.key);
      const currentHash = this.mapper.calculateHash(item);
      
      if (hash !== currentHash) {
        filtered.push(item);
      }
    }
    
    return filtered;
  }

  /**
   * 检查是否已中止
   */
  private checkAborted() {
    if (this.abortController?.signal.aborted) {
      throw new Error('Sync aborted by user');
    }
  }

  /**
   * 中止当前同步
   */
  abort() {
    this.abortController?.abort();
  }

  /**
   * 获取当前同步状态
   */
  getStatus(): SyncStatus {
    return this.currentSyncStatus;
  }
}

export * from './types';

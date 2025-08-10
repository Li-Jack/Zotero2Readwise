/**
 * Enhanced Progress Window Usage Example
 * 展示如何使用增强的进度窗口
 */

import { EnhancedProgressWindow } from './enhancedProgressWindow';
import { ReadwiseSyncOrchestrator } from '../../core/readwiseSync';
import { Logger } from '../../utils/logger';

/**
 * 使用增强进度窗口进行同步
 */
export async function syncWithEnhancedProgress(
  orchestrator: ReadwiseSyncOrchestrator,
  logger: Logger,
  document: Document,
  Zotero: any
) {
  // 创建增强的进度窗口
  const progressWindow = new EnhancedProgressWindow(
    orchestrator,
    logger,
    document,
    Zotero
  );

  try {
    // 获取总项目数（可以从预扫描获得）
    const totalItems = await getTotalItemCount();
    
    // 显示进度窗口
    await progressWindow.show({
      totalItems,
      batchSize: 50,
      onCancel: () => {
        logger.info('User cancelled sync operation');
        orchestrator.abort();
      }
    });

    // 开始同步操作
    const syncPromise = orchestrator.sync({
      batchSize: 50,
      stopOnError: false,
      incremental: true
    });

    // 监听同步事件并更新进度窗口
    let uploadedCount = 0;
    let skippedCount = 0;
    let currentBatch = 1;

    // 设置事件监听器
    orchestrator.on('batch-start', (event: any) => {
      progressWindow.updateBatchInfo(
        event.batchNumber,
        0,
        event.batchSize
      );
    });

    orchestrator.on('item-uploaded', (event: any) => {
      uploadedCount++;
      progressWindow.updateStatistics({
        uploadedItems: uploadedCount
      });
      
      // 更新批次内进度
      progressWindow.updateBatchInfo(
        currentBatch,
        event.processedInBatch,
        event.batchSize
      );
    });

    orchestrator.on('item-skipped', (event: any) => {
      skippedCount++;
      progressWindow.updateStatistics({
        skippedItems: skippedCount
      });
    });

    orchestrator.on('item-failed', (event: any) => {
      // 添加失败项详情
      progressWindow.addFailedItem({
        id: event.itemId,
        title: event.itemTitle || 'Unknown Item',
        error: event.error.message,
        timestamp: new Date(),
        annotation: event.annotation?.text?.substring(0, 100),
        retryCount: event.retryCount || 0,
        diagnosticInfo: generateDiagnosticInfo(event),
        zoteroLink: `zotero://select/items/${event.itemId}`
      });
    });

    orchestrator.on('batch-complete', (event: any) => {
      currentBatch++;
      progressWindow.updateStatistics({
        currentBatch
      });
    });

    // 等待同步完成
    const result = await syncPromise;

    // 同步完成后，进度窗口会自动处理UI更新
    logger.info(`Sync completed: ${result.itemsSynced} synced, ${result.itemsFailed} failed`);

  } catch (error) {
    logger.error('Sync failed:', error);
    progressWindow.close();
    throw error;
  }
}

/**
 * 获取总项目数
 */
async function getTotalItemCount(): Promise<number> {
  // 这里应该调用实际的扫描逻辑
  // 示例返回
  return 150;
}

/**
 * 生成诊断信息
 */
function generateDiagnosticInfo(event: any): string {
  const info: string[] = [
    `Item Type: ${event.itemType || 'unknown'}`,
    `Library ID: ${event.libraryId || 'N/A'}`,
    `Collection: ${event.collection || 'N/A'}`,
    `Tags: ${event.tags?.join(', ') || 'None'}`,
    `Modified: ${event.modifiedDate || 'N/A'}`,
    `Error Type: ${event.error?.name || 'Unknown'}`,
    `Error Stack: ${event.error?.stack?.substring(0, 500) || 'N/A'}`,
    `API Response: ${event.apiResponse || 'N/A'}`,
    `Retry Attempts: ${event.retryCount || 0}`,
    `Batch Number: ${event.batchNumber || 'N/A'}`
  ];

  return info.join('\n');
}

/**
 * 集成到主同步流程
 */
export class SyncManager {
  private orchestrator: ReadwiseSyncOrchestrator;
  private logger: Logger;
  private progressWindow?: EnhancedProgressWindow;

  constructor(orchestrator: ReadwiseSyncOrchestrator, logger: Logger) {
    this.orchestrator = orchestrator;
    this.logger = logger;
  }

  /**
   * 执行同步并显示进度
   */
  async syncWithProgress(document: Document, Zotero: any): Promise<void> {
    // 创建进度窗口
    this.progressWindow = new EnhancedProgressWindow(
      this.orchestrator,
      this.logger,
      document,
      Zotero
    );

    try {
      // 预扫描获取统计信息
      const scanResult = await this.preScan();
      
      // 显示进度窗口
      await this.progressWindow.show({
        totalItems: scanResult.totalItems,
        batchSize: 50,
        onCancel: () => this.handleCancel()
      });

      // 执行同步
      await this.performSync(scanResult);
      
    } catch (error) {
      this.logger.error('Sync failed:', error);
      if (this.progressWindow) {
        this.progressWindow.close();
      }
      throw error;
    }
  }

  /**
   * 预扫描
   */
  private async preScan(): Promise<{totalItems: number; collections: string[]}> {
    // 实际的预扫描逻辑
    return {
      totalItems: 200,
      collections: ['Research', 'Articles', 'Books']
    };
  }

  /**
   * 执行同步
   */
  private async performSync(scanResult: any): Promise<void> {
    // 设置批次处理监听器
    this.setupBatchListeners();
    
    // 开始同步
    const result = await this.orchestrator.sync({
      batchSize: 50,
      incremental: true,
      stopOnError: false
    });

    this.logger.info(`Sync completed: ${JSON.stringify(result)}`);
  }

  /**
   * 设置批次监听器
   */
  private setupBatchListeners(): void {
    let uploadedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    let currentBatch = 1;

    // 批次开始
    this.orchestrator.on('batch-start', (event: any) => {
      this.logger.info(`Starting batch ${event.batchNumber}`);
      this.progressWindow?.updateBatchInfo(
        event.batchNumber,
        0,
        event.batchSize
      );
    });

    // 项目处理
    this.orchestrator.on('item-processed', (event: any) => {
      if (event.status === 'uploaded') {
        uploadedCount++;
      } else if (event.status === 'skipped') {
        skippedCount++;
      } else if (event.status === 'failed') {
        failedCount++;
        this.handleFailedItem(event);
      }

      this.progressWindow?.updateStatistics({
        uploadedItems: uploadedCount,
        skippedItems: skippedCount,
        failedItems: failedCount
      });

      // 更新批次进度
      this.progressWindow?.updateBatchInfo(
        currentBatch,
        event.processedInBatch,
        event.batchSize
      );
    });

    // 批次完成
    this.orchestrator.on('batch-complete', (event: any) => {
      this.logger.info(`Batch ${event.batchNumber} completed`);
      currentBatch = event.batchNumber + 1;
      this.progressWindow?.updateStatistics({
        currentBatch
      });
    });

    // 错误处理
    this.orchestrator.on('error', (error: any) => {
      this.logger.error('Sync error:', error);
    });
  }

  /**
   * 处理失败项
   */
  private handleFailedItem(event: any): void {
    const failedItem = {
      id: event.itemId,
      title: event.itemTitle || 'Unknown Item',
      error: event.error?.message || 'Unknown error',
      timestamp: new Date(),
      annotation: this.extractAnnotationSnippet(event),
      retryCount: event.retryCount || 0,
      diagnosticInfo: this.generateDiagnosticInfo(event),
      zoteroLink: `zotero://select/items/${event.itemId}`
    };

    this.progressWindow?.addFailedItem(failedItem);
    this.logger.warn(`Failed item: ${failedItem.title}`, failedItem);
  }

  /**
   * 提取注释片段
   */
  private extractAnnotationSnippet(event: any): string | undefined {
    if (!event.annotation) return undefined;
    
    const text = event.annotation.text || event.annotation.comment || '';
    const maxLength = 100;
    
    if (text.length <= maxLength) {
      return text;
    }
    
    return text.substring(0, maxLength) + '...';
  }

  /**
   * 生成诊断信息
   */
  private generateDiagnosticInfo(event: any): string {
    const diagnosticData = {
      itemType: event.itemType,
      libraryId: event.libraryId,
      collection: event.collection,
      tags: event.tags,
      modifiedDate: event.modifiedDate,
      errorType: event.error?.name,
      errorMessage: event.error?.message,
      errorStack: event.error?.stack?.substring(0, 500),
      apiResponse: event.apiResponse,
      httpStatus: event.httpStatus,
      retryCount: event.retryCount,
      batchNumber: event.batchNumber,
      timestamp: new Date().toISOString()
    };

    return JSON.stringify(diagnosticData, null, 2);
  }

  /**
   * 处理取消操作
   */
  private handleCancel(): void {
    this.logger.info('User requested sync cancellation');
    this.orchestrator.abort();
  }
}

/**
 * 工厂函数：创建同步管理器
 */
export function createSyncManager(
  orchestrator: ReadwiseSyncOrchestrator,
  logger: Logger
): SyncManager {
  return new SyncManager(orchestrator, logger);
}

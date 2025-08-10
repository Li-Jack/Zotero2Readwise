/**
 * Enhanced Progress Window
 * 增强的同步进度对话框，支持详细统计、批次信息、取消功能和失败诊断
 */

import { ReadwiseSyncOrchestrator } from '../../core/readwiseSync';
import { SyncProgress, SyncStatus } from '../../core/readwiseSync/types';
import { Logger } from '../../utils/logger';

/**
 * 同步统计信息
 */
interface SyncStatistics {
  totalItems: number;           // 总任务数
  uploadedItems: number;        // 已上传数
  skippedItems: number;         // 跳过数
  failedItems: number;          // 失败数
  currentBatch: number;         // 当前批次
  totalBatches: number;         // 总批次数
  batchSize: number;            // 批次大小
  startTime: Date;              // 开始时间
  estimatedTimeRemaining?: number; // 预计剩余时间（秒）
}

/**
 * 失败项详情
 */
interface FailedItem {
  id: string;                   // 条目ID
  title: string;                // 条目标题
  error: string;                // 错误信息
  timestamp: Date;              // 失败时间
  annotation?: string;          // 相关注释片段
  retryCount: number;          // 重试次数
  diagnosticInfo: string;      // 诊断信息
  zoteroLink?: string;         // Zotero深链
}

/**
 * 批次信息
 */
interface BatchInfo {
  batchNumber: number;
  totalItems: number;
  processedItems: number;
  failedItems: number;
  startTime: Date;
  endTime?: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export class EnhancedProgressWindow {
  private readonly orchestrator: ReadwiseSyncOrchestrator;
  private readonly logger: Logger;
  private readonly document: Document;
  private readonly Zotero: any;
  
  private dialogWindow: any;
  private statistics: SyncStatistics;
  private failedItems: FailedItem[] = [];
  private batches: BatchInfo[] = [];
  private currentBatch?: BatchInfo;
  private statusUpdateInterval?: number;
  private isCancelled: boolean = false;
  private onCancelCallback?: () => void;

  constructor(
    orchestrator: ReadwiseSyncOrchestrator,
    logger: Logger,
    doc: Document,
    zoteroGlobal: any
  ) {
    this.orchestrator = orchestrator;
    this.logger = logger;
    this.document = doc;
    this.Zotero = zoteroGlobal;
    
    this.statistics = {
      totalItems: 0,
      uploadedItems: 0,
      skippedItems: 0,
      failedItems: 0,
      currentBatch: 0,
      totalBatches: 0,
      batchSize: 50,
      startTime: new Date()
    };
  }

  /**
   * 显示增强的进度窗口
   */
  async show(options?: { 
    totalItems?: number; 
    batchSize?: number;
    onCancel?: () => void;
  }): Promise<void> {
    if (options?.totalItems) {
      this.statistics.totalItems = options.totalItems;
      this.statistics.totalBatches = Math.ceil(options.totalItems / (options.batchSize || 50));
    }
    
    if (options?.batchSize) {
      this.statistics.batchSize = options.batchSize;
    }
    
    if (options?.onCancel) {
      this.onCancelCallback = options.onCancel;
    }

    this.createDialog();
    this.startStatusMonitoring();
  }

  /**
   * 创建对话框
   */
  private createDialog(): void {
    const windowFeatures = 'chrome,centerscreen,resizable=yes,width=600,height=500';
    
    this.dialogWindow = this.document.defaultView?.openDialog(
      'data:text/html;charset=utf-8,' + encodeURIComponent(this.generateDialogHTML()),
      'readwise-sync-progress',
      windowFeatures
    );

    if (!this.dialogWindow) {
      // 使用备用方法
      this.dialogWindow = this.document.defaultView?.open(
        '',
        'readwise-sync-progress',
        'width=600,height=500,resizable=yes,scrollbars=yes'
      );
      
      if (this.dialogWindow) {
        this.dialogWindow.document.write(this.generateDialogHTML());
        this.dialogWindow.document.close();
      }
    }

    // 绑定事件处理器
    this.bindEventHandlers();
  }

  /**
   * 生成对话框HTML
   */
  private generateDialogHTML(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Readwise Sync Progress</title>
        <meta charset="utf-8">
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            font-size: 13px;
            background: #f5f5f5;
            color: #333;
            padding: 20px;
          }
          
          .container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            position: relative;
          }
          
          .header h1 {
            font-size: 20px;
            margin-bottom: 5px;
          }
          
          .header .status {
            font-size: 14px;
            opacity: 0.9;
          }
          
          .progress-bar-container {
            background: rgba(255,255,255,0.2);
            border-radius: 10px;
            height: 10px;
            margin-top: 15px;
            overflow: hidden;
          }
          
          .progress-bar {
            background: white;
            height: 100%;
            border-radius: 10px;
            transition: width 0.3s ease;
            box-shadow: 0 0 10px rgba(255,255,255,0.5);
          }
          
          .statistics {
            padding: 20px;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
          }
          
          .stat-card {
            background: #f9f9f9;
            border-radius: 6px;
            padding: 12px;
            border-left: 3px solid #667eea;
          }
          
          .stat-card .label {
            color: #666;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
          }
          
          .stat-card .value {
            font-size: 20px;
            font-weight: bold;
            color: #333;
          }
          
          .stat-card.success {
            border-left-color: #10b981;
          }
          
          .stat-card.warning {
            border-left-color: #f59e0b;
          }
          
          .stat-card.error {
            border-left-color: #ef4444;
          }
          
          .batch-info {
            padding: 0 20px 20px;
          }
          
          .batch-info-header {
            font-weight: bold;
            margin-bottom: 10px;
            color: #666;
          }
          
          .batch-progress {
            background: #e5e7eb;
            border-radius: 4px;
            padding: 10px;
            font-size: 12px;
          }
          
          .batch-details {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
          }
          
          .failed-items {
            max-height: 150px;
            overflow-y: auto;
            padding: 0 20px 20px;
          }
          
          .failed-items-header {
            font-weight: bold;
            margin-bottom: 10px;
            color: #ef4444;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .failed-item {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 4px;
            padding: 8px;
            margin-bottom: 8px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s;
          }
          
          .failed-item:hover {
            background: #fee2e2;
            transform: translateX(2px);
          }
          
          .failed-item-title {
            font-weight: bold;
            color: #991b1b;
            margin-bottom: 3px;
          }
          
          .failed-item-error {
            color: #7f1d1d;
            font-size: 11px;
            margin-bottom: 3px;
          }
          
          .failed-item-annotation {
            color: #666;
            font-style: italic;
            font-size: 11px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          
          .controls {
            padding: 20px;
            background: #f9f9f9;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-top: 1px solid #e5e7eb;
          }
          
          .button {
            padding: 8px 16px;
            border-radius: 6px;
            border: none;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
          }
          
          .button-primary {
            background: #667eea;
            color: white;
          }
          
          .button-primary:hover {
            background: #5a67d8;
          }
          
          .button-secondary {
            background: #e5e7eb;
            color: #4b5563;
          }
          
          .button-secondary:hover {
            background: #d1d5db;
          }
          
          .button-danger {
            background: #ef4444;
            color: white;
          }
          
          .button-danger:hover {
            background: #dc2626;
          }
          
          .button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          
          .time-info {
            font-size: 11px;
            color: #6b7280;
          }
          
          .spinner {
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255,255,255,0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            display: inline-block;
            margin-right: 8px;
            vertical-align: middle;
          }
          
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          
          .tooltip {
            position: fixed;
            background: #1f2937;
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            z-index: 1000;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s;
            max-width: 300px;
            word-wrap: break-word;
          }
          
          .tooltip.visible {
            opacity: 1;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1><span class="spinner"></span>Syncing to Readwise</h1>
            <div class="status" id="status-text">Initializing...</div>
            <div class="progress-bar-container">
              <div class="progress-bar" id="progress-bar" style="width: 0%"></div>
            </div>
          </div>
          
          <div class="statistics">
            <div class="stat-card">
              <div class="label">Total Items</div>
              <div class="value" id="stat-total">0</div>
            </div>
            <div class="stat-card success">
              <div class="label">Uploaded</div>
              <div class="value" id="stat-uploaded">0</div>
            </div>
            <div class="stat-card warning">
              <div class="label">Skipped</div>
              <div class="value" id="stat-skipped">0</div>
            </div>
            <div class="stat-card error">
              <div class="label">Failed</div>
              <div class="value" id="stat-failed">0</div>
            </div>
          </div>
          
          <div class="batch-info">
            <div class="batch-info-header">Batch Progress</div>
            <div class="batch-progress">
              <div class="batch-details">
                <span>Batch <span id="current-batch">0</span> of <span id="total-batches">0</span></span>
                <span>Size: <span id="batch-size">0</span> items</span>
              </div>
              <div class="batch-details">
                <span>Processing: <span id="batch-processed">0</span>/<span id="batch-total">0</span></span>
                <span id="batch-status">Pending</span>
              </div>
            </div>
          </div>
          
          <div class="failed-items" id="failed-items-container" style="display: none;">
            <div class="failed-items-header">
              <span>Failed Items (click to copy diagnostic info)</span>
              <span id="failed-count">0</span>
            </div>
            <div id="failed-items-list"></div>
          </div>
          
          <div class="controls">
            <div class="time-info">
              <span>Elapsed: <span id="elapsed-time">00:00</span></span>
              <span> | Est. remaining: <span id="remaining-time">--:--</span></span>
            </div>
            <div>
              <button class="button button-secondary" id="btn-details" onclick="showDetails()">
                View Logs
              </button>
              <button class="button button-danger" id="btn-cancel" onclick="cancelSync()">
                Cancel Sync
              </button>
            </div>
          </div>
        </div>
        
        <div class="tooltip" id="tooltip"></div>
        
        <script>
          // 全局函数供按钮调用
          function cancelSync() {
            if (confirm('Cancel sync at the next batch boundary?\\n\\nThis will safely stop the sync process after the current batch completes.')) {
              window.syncCancelled = true;
              document.getElementById('btn-cancel').disabled = true;
              document.getElementById('btn-cancel').textContent = 'Cancelling...';
              document.getElementById('status-text').textContent = 'Cancelling at batch boundary...';
              
              // 通知父窗口
              if (window.opener && window.opener.handleSyncCancel) {
                window.opener.handleSyncCancel();
              }
            }
          }
          
          function showDetails() {
            if (window.opener && window.opener.showSyncLogs) {
              window.opener.showSyncLogs();
            }
          }
          
          // 复制诊断信息到剪贴板
          function copyDiagnosticInfo(itemId) {
            const item = window.failedItemsData?.find(i => i.id === itemId);
            if (item) {
              const diagnosticText = formatDiagnosticInfo(item);
              navigator.clipboard.writeText(diagnosticText).then(() => {
                showTooltip('Diagnostic info copied to clipboard!');
              }).catch(err => {
                console.error('Failed to copy:', err);
                showTooltip('Failed to copy. Please try again.');
              });
            }
          }
          
          function formatDiagnosticInfo(item) {
            return \`
=== FAILED ITEM DIAGNOSTIC INFO ===
Title: \${item.title}
ID: \${item.id}
Time: \${item.timestamp.toISOString()}
Error: \${item.error}
Retry Count: \${item.retryCount}
Annotation: \${item.annotation || 'N/A'}
Zotero Link: \${item.zoteroLink || 'N/A'}

Diagnostic Details:
\${item.diagnosticInfo}
===================================
            \`.trim();
          }
          
          function showTooltip(message) {
            const tooltip = document.getElementById('tooltip');
            tooltip.textContent = message;
            tooltip.classList.add('visible');
            
            // Position near mouse
            const event = window.event;
            if (event) {
              tooltip.style.left = event.pageX + 10 + 'px';
              tooltip.style.top = event.pageY + 10 + 'px';
            }
            
            setTimeout(() => {
              tooltip.classList.remove('visible');
            }, 2000);
          }
          
          // 更新时间显示
          let startTime = Date.now();
          setInterval(() => {
            const elapsed = Date.now() - startTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            document.getElementById('elapsed-time').textContent = 
              \`\${minutes.toString().padStart(2, '0')}:\${seconds.toString().padStart(2, '0')}\`;
          }, 1000);
        </script>
      </body>
      </html>
    `;
  }

  /**
   * 绑定事件处理器
   */
  private bindEventHandlers(): void {
    if (!this.dialogWindow) return;

    // 暴露处理函数到窗口对象
    this.dialogWindow.handleSyncCancel = () => {
      this.handleCancel();
    };

    this.dialogWindow.showSyncLogs = () => {
      this.showDetailedLogs();
    };

    // 监听窗口关闭
    this.dialogWindow.addEventListener('beforeunload', () => {
      if (!this.isCancelled && this.orchestrator.getStatus() !== 'idle') {
        return 'Sync is still in progress. Are you sure you want to close?';
      }
    });
  }

  /**
   * 更新统计信息
   */
  updateStatistics(stats: Partial<SyncStatistics>): void {
    Object.assign(this.statistics, stats);
    this.updateUI();
  }

  /**
   * 更新批次信息
   */
  updateBatchInfo(batchNumber: number, processed: number, total: number): void {
    if (!this.currentBatch || this.currentBatch.batchNumber !== batchNumber) {
      // 完成上一个批次
      if (this.currentBatch) {
        this.currentBatch.endTime = new Date();
        this.currentBatch.status = 'completed';
      }
      
      // 开始新批次
      this.currentBatch = {
        batchNumber,
        totalItems: total,
        processedItems: processed,
        failedItems: 0,
        startTime: new Date(),
        status: 'processing'
      };
      
      this.batches.push(this.currentBatch);
    } else {
      this.currentBatch.processedItems = processed;
    }
    
    this.statistics.currentBatch = batchNumber;
    this.updateUI();
  }

  /**
   * 添加失败项
   */
  addFailedItem(item: FailedItem): void {
    this.failedItems.push(item);
    this.statistics.failedItems++;
    
    if (this.currentBatch) {
      this.currentBatch.failedItems++;
    }
    
    this.updateFailedItemsUI();
    this.updateUI();
  }

  /**
   * 更新UI
   */
  private updateUI(): void {
    if (!this.dialogWindow || this.dialogWindow.closed) return;

    const doc = this.dialogWindow.document;
    
    // 更新统计
    this.setElementText(doc, 'stat-total', this.statistics.totalItems.toString());
    this.setElementText(doc, 'stat-uploaded', this.statistics.uploadedItems.toString());
    this.setElementText(doc, 'stat-skipped', this.statistics.skippedItems.toString());
    this.setElementText(doc, 'stat-failed', this.statistics.failedItems.toString());
    
    // 更新批次信息
    this.setElementText(doc, 'current-batch', this.statistics.currentBatch.toString());
    this.setElementText(doc, 'total-batches', this.statistics.totalBatches.toString());
    this.setElementText(doc, 'batch-size', this.statistics.batchSize.toString());
    
    if (this.currentBatch) {
      this.setElementText(doc, 'batch-processed', this.currentBatch.processedItems.toString());
      this.setElementText(doc, 'batch-total', this.currentBatch.totalItems.toString());
      this.setElementText(doc, 'batch-status', this.getStatusLabel(this.currentBatch.status));
    }
    
    // 更新进度条
    const progress = this.statistics.totalItems > 0 
      ? Math.round((this.statistics.uploadedItems + this.statistics.skippedItems) / this.statistics.totalItems * 100)
      : 0;
    
    const progressBar = doc.getElementById('progress-bar');
    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }
    
    // 更新预计剩余时间
    this.updateRemainingTime(doc);
  }

  /**
   * 更新失败项UI
   */
  private updateFailedItemsUI(): void {
    if (!this.dialogWindow || this.dialogWindow.closed) return;

    const doc = this.dialogWindow.document;
    const container = doc.getElementById('failed-items-container');
    const list = doc.getElementById('failed-items-list');
    const count = doc.getElementById('failed-count');
    
    if (!container || !list || !count) return;
    
    // 显示失败项容器
    if (this.failedItems.length > 0) {
      container.style.display = 'block';
      count.textContent = this.failedItems.length.toString();
      
      // 暴露失败项数据供客户端脚本使用
      this.dialogWindow.failedItemsData = this.failedItems;
      
      // 生成失败项列表
      list.innerHTML = this.failedItems.map(item => `
        <div class="failed-item" onclick="copyDiagnosticInfo('${item.id}')">
          <div class="failed-item-title">${this.escapeHtml(item.title)}</div>
          <div class="failed-item-error">${this.escapeHtml(item.error)}</div>
          ${item.annotation ? `<div class="failed-item-annotation">${this.escapeHtml(item.annotation)}</div>` : ''}
        </div>
      `).join('');
    }
  }

  /**
   * 更新剩余时间
   */
  private updateRemainingTime(doc: Document): void {
    const remainingElement = doc.getElementById('remaining-time');
    if (!remainingElement) return;
    
    if (this.statistics.estimatedTimeRemaining) {
      const minutes = Math.floor(this.statistics.estimatedTimeRemaining / 60);
      const seconds = this.statistics.estimatedTimeRemaining % 60;
      remainingElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      const processed = this.statistics.uploadedItems + this.statistics.skippedItems;
      if (processed > 0 && this.statistics.totalItems > processed) {
        const elapsed = (Date.now() - this.statistics.startTime.getTime()) / 1000;
        const rate = processed / elapsed;
        const remaining = (this.statistics.totalItems - processed) / rate;
        const minutes = Math.floor(remaining / 60);
        const seconds = Math.floor(remaining % 60);
        remainingElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }
    }
  }

  /**
   * 开始状态监控
   */
  private startStatusMonitoring(): void {
    this.statusUpdateInterval = window.setInterval(() => {
      const status = this.orchestrator.getStatus();
      
      if (this.dialogWindow && !this.dialogWindow.closed) {
        const statusElement = this.dialogWindow.document.getElementById('status-text');
        if (statusElement) {
          statusElement.textContent = this.getStatusLabel(status);
        }
        
        // 检查是否完成或出错
        if (status === 'idle' || status === 'error') {
          this.handleSyncComplete(status === 'idle');
        }
      } else {
        // 窗口已关闭，停止监控
        this.stopStatusMonitoring();
      }
    }, 500);
  }

  /**
   * 停止状态监控
   */
  private stopStatusMonitoring(): void {
    if (this.statusUpdateInterval) {
      window.clearInterval(this.statusUpdateInterval);
      this.statusUpdateInterval = undefined;
    }
  }

  /**
   * 处理同步完成
   */
  private handleSyncComplete(success: boolean): void {
    this.stopStatusMonitoring();
    
    if (!this.dialogWindow || this.dialogWindow.closed) return;
    
    const doc = this.dialogWindow.document;
    
    // 更新状态显示
    const header = doc.querySelector('.header h1');
    const spinner = doc.querySelector('.spinner');
    const statusText = doc.getElementById('status-text');
    const cancelBtn = doc.getElementById('btn-cancel');
    
    if (spinner) {
      spinner.style.display = 'none';
    }
    
    if (header) {
      header.innerHTML = success ? '✅ Sync Completed' : '❌ Sync Failed';
    }
    
    if (statusText) {
      if (success) {
        const summary = `Successfully synced ${this.statistics.uploadedItems} items`;
        statusText.textContent = this.statistics.failedItems > 0 
          ? `${summary} (${this.statistics.failedItems} failed)`
          : summary;
      } else {
        statusText.textContent = 'Sync encountered errors. Please check the logs for details.';
      }
    }
    
    if (cancelBtn) {
      cancelBtn.style.display = 'none';
    }
    
    // 自动关闭（如果成功且无错误）
    if (success && this.statistics.failedItems === 0) {
      setTimeout(() => {
        if (this.dialogWindow && !this.dialogWindow.closed) {
          this.dialogWindow.close();
        }
      }, 3000);
    }
  }

  /**
   * 处理取消操作
   */
  private handleCancel(): void {
    this.isCancelled = true;
    this.orchestrator.abort();
    
    if (this.onCancelCallback) {
      this.onCancelCallback();
    }
    
    this.logger.info('Sync cancelled by user at batch boundary');
  }

  /**
   * 显示详细日志
   */
  private showDetailedLogs(): void {
    // 这里可以打开一个新窗口显示详细日志
    const logWindow = this.document.defaultView?.open(
      '',
      'readwise-sync-logs',
      'width=800,height=600,resizable=yes,scrollbars=yes'
    );
    
    if (logWindow) {
      // 生成日志HTML（可以复用原有的日志生成逻辑）
      logWindow.document.write(this.generateLogsHTML());
      logWindow.document.close();
    }
  }

  /**
   * 生成日志HTML
   */
  private generateLogsHTML(): string {
    // 简化的日志显示，实际可以更详细
    const logs = this.batches.map(batch => {
      const duration = batch.endTime 
        ? (batch.endTime.getTime() - batch.startTime.getTime()) / 1000 
        : 0;
      
      return `
        <div class="log-batch">
          <strong>Batch ${batch.batchNumber}</strong>
          <div>Status: ${batch.status}</div>
          <div>Items: ${batch.processedItems}/${batch.totalItems}</div>
          <div>Failed: ${batch.failedItems}</div>
          <div>Duration: ${duration.toFixed(1)}s</div>
        </div>
      `;
    }).join('');
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Sync Logs</title>
        <style>
          body { font-family: monospace; padding: 20px; }
          .log-batch { margin-bottom: 15px; padding: 10px; background: #f5f5f5; }
        </style>
      </head>
      <body>
        <h2>Sync Batch Logs</h2>
        ${logs}
      </body>
      </html>
    `;
  }

  /**
   * 获取状态标签
   */
  private getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'idle': 'Ready',
      'scanning': 'Scanning Zotero items...',
      'mapping': 'Mapping data...',
      'uploading': 'Uploading to Readwise...',
      'confirming': 'Confirming sync...',
      'updating': 'Updating local state...',
      'error': 'Error occurred',
      'pending': 'Pending',
      'processing': 'Processing',
      'completed': 'Completed',
      'failed': 'Failed'
    };
    
    return labels[status] || status;
  }

  /**
   * 设置元素文本
   */
  private setElementText(doc: Document, id: string, text: string): void {
    const element = doc.getElementById(id);
    if (element) {
      element.textContent = text;
    }
  }

  /**
   * HTML转义
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  /**
   * 关闭窗口
   */
  close(): void {
    this.stopStatusMonitoring();
    
    if (this.dialogWindow && !this.dialogWindow.closed) {
      this.dialogWindow.close();
    }
    
    this.dialogWindow = null;
  }
}

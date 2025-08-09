/**
 * Enhanced Progress Window
 * 增强的同步进度对话框，支持详细统计、批次信息、取消功能和失败诊断
 */

import { ReadwiseSyncOrchestrator } from '../../core/readwiseSync';
import { SyncProgress, SyncStatus } from '../../core/readwiseSync/types';
import { Logger } from '../../utils/logger';

export class ProgressWindow {
  private readonly orchestrator: ReadwiseSyncOrchestrator;
  private readonly logger: Logger;
  private readonly document: Document;
  private readonly Zotero: any;
  private window: any;
  private logMessages: LogMessage[] = [];

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
  }

  /**
   * 显示进度窗口
   */
  async show(): Promise<void> {
    this.window = this.Zotero.ProgressWindow({
      closeOnClick: false,
      window: this.document.defaultView
    });

    this.window.changeHeadline('Syncing to Readwise...');
    this.window.show();

    // 监听同步状态变化
    this.startStatusMonitoring();
  }

  /**
   * 更新进度
   */
  updateProgress(progress: SyncProgress): void {
    if (!this.window) return;

    const statusText = this.getStatusText(progress.status);
    const progressText = `${statusText}: ${progress.current}/${progress.total} (${progress.percentage}%)`;
    
    this.window.addLines(progressText);
    this.addLogMessage('info', progress.message);

    if (progress.percentage >= 100) {
      this.window.startCloseTimer(3000);
    }
  }

  /**
   * 显示错误
   */
  showError(error: Error): void {
    if (!this.window) return;

    this.window.changeHeadline('Sync Error');
    this.window.addLines(error.message, 'chrome://zotero/skin/cross.png');
    this.addLogMessage('error', error.message);
    
    this.window.startCloseTimer(5000);
  }

  /**
   * 关闭窗口
   */
  close(): void {
    if (this.window) {
      this.window.close();
      this.window = null;
    }
  }

  /**
   * 开始监控同步状态
   */
  private startStatusMonitoring(): void {
    const checkInterval = setInterval(() => {
      const status = this.orchestrator.getStatus();
      
      if (status === 'idle' || status === 'error') {
        clearInterval(checkInterval);
        return;
      }

      // 更新状态显示
      const statusText = this.getStatusText(status);
      if (this.window) {
        this.window.changeHeadline(`Syncing: ${statusText}`);
      }
    }, 500);
  }

  /**
   * 获取状态文本
   */
  private getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      'idle': 'Ready',
      'scanning': 'Scanning Zotero items',
      'mapping': 'Mapping data',
      'uploading': 'Uploading to Readwise',
      'confirming': 'Confirming sync',
      'updating': 'Updating local state',
      'error': 'Error occurred'
    };

    return statusMap[status] || status;
  }

  /**
   * 添加日志消息
   */
  private addLogMessage(level: LogLevel, message: string): void {
    this.logMessages.push({
      timestamp: new Date(),
      level,
      message
    });

    // 限制日志消息数量
    if (this.logMessages.length > 100) {
      this.logMessages.shift();
    }

    this.logger[level](message);
  }

  /**
   * 显示详细日志窗口
   */
  showDetailedLog(): void {
    const logWindow = this.document.defaultView?.open(
      '',
      'readwise-sync-log',
      'width=800,height=600,resizable=yes,scrollbars=yes'
    );

    if (!logWindow) return;

    const logHtml = this.generateLogHtml();
    logWindow.document.write(logHtml);
    logWindow.document.close();
  }

  /**
   * 生成日志 HTML
   */
  private generateLogHtml(): string {
    const logEntries = this.logMessages.map(msg => {
      const timestamp = msg.timestamp.toLocaleTimeString();
      const levelClass = `log-${msg.level}`;
      return `
        <div class="log-entry ${levelClass}">
          <span class="timestamp">[${timestamp}]</span>
          <span class="level">${msg.level.toUpperCase()}</span>
          <span class="message">${this.escapeHtml(msg.message)}</span>
        </div>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Readwise Sync Log</title>
        <style>
          body {
            font-family: monospace;
            font-size: 12px;
            padding: 10px;
            background: #1e1e1e;
            color: #d4d4d4;
          }
          .log-entry {
            margin: 2px 0;
            padding: 2px 5px;
            border-left: 3px solid transparent;
          }
          .log-info {
            border-left-color: #3794ff;
          }
          .log-warn {
            border-left-color: #ffcc00;
            color: #ffcc00;
          }
          .log-error {
            border-left-color: #f48771;
            color: #f48771;
          }
          .log-debug {
            border-left-color: #808080;
            color: #808080;
          }
          .timestamp {
            color: #808080;
            margin-right: 10px;
          }
          .level {
            font-weight: bold;
            margin-right: 10px;
            min-width: 50px;
            display: inline-block;
          }
          .message {
            white-space: pre-wrap;
          }
          .zotero-link {
            color: #3794ff;
            text-decoration: underline;
            cursor: pointer;
          }
          .zotero-link:hover {
            color: #5fa6ff;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <h2>Readwise Sync Log</h2>
        <div id="log-container">
          ${logEntries}
        </div>
      </body>
      </html>
    `;
  }

  /**
   * HTML 转义并处理深链
   * 检测 zotero:// 链接并转换为可点击的链接
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    
    // 先进行 HTML 转义
    let escaped = text.replace(/[&<>"']/g, m => map[m]);
    
    // 然后检测并转换 zotero:// 链接
    escaped = this.makeZoteroLinksClickable(escaped);
    
    return escaped;
  }

  /**
   * 将 zotero:// 链接转换为可点击的 HTML 链接
   */
  private makeZoteroLinksClickable(text: string): string {
    // 匹配 zotero:// 链接
    const zoteroLinkRegex = /(zotero:\/\/[^\s<>]+)/g;
    
    return text.replace(zoteroLinkRegex, (match) => {
      // 创建可点击的链接
      return `<a href="${match}" class="zotero-link" onclick="window.open('${match}', '_self'); return false;">${match}</a>`;
    });
  }
}

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogMessage {
  timestamp: Date;
  level: LogLevel;
  message: string;
}

// 导出增强的进度窗口
export { EnhancedProgressWindow } from './enhancedProgressWindow';

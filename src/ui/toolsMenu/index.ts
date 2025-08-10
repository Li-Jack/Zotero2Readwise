/**
 * Tools Menu Entry
 * Tools 菜单入口、命令注册
 * 使用 zotero-plugin-toolkit 注册菜单与命令回调
 */

import { MenuManager } from 'zotero-plugin-toolkit';
import { ReadwiseSyncOrchestrator } from '../../core/readwiseSync';
import { ProgressWindow } from '../progressWindow';
import { Logger } from '../../utils/logger';
import { config } from '../../../package.json';

export class ToolsMenu {
  private readonly orchestrator: ReadwiseSyncOrchestrator;
  private readonly logger: Logger;
  private readonly ztoolkit: ZToolkit;
  private menuManager?: MenuManager;

  constructor(orchestrator: ReadwiseSyncOrchestrator, logger: Logger, ztoolkit: ZToolkit) {
    this.orchestrator = orchestrator;
    this.logger = logger;
    this.ztoolkit = ztoolkit;
  }

  /**
   * 注册菜单项
   */
  register(): void {
    this.logger.info('Registering Z2R Tools menu items...');

    // 创建 MenuManager 实例
    this.menuManager = new this.ztoolkit.Menu();

    // 注册主同步命令: Tools → Z2R: Sync to Readwise
    this.menuManager.register('menuTools', {
      tag: 'menuitem',
      id: `${config.addonRef}-menu-sync`,
      label: 'Z2R: Sync to Readwise',
      icon: `chrome://${config.addonRef}/content/icons/favicon.png`,
      commandListener: () => this.handleSyncCommand()
    });

    // 注册查看日志命令: Tools → Z2R: View Logs
    this.menuManager.register('menuTools', {
      tag: 'menuitem',
      id: `${config.addonRef}-menu-logs`,
      label: 'Z2R: View Logs',
      commandListener: () => this.handleViewLogsCommand()
    });

    // 注册首选项命令: Tools → Z2R: Preferences
    this.menuManager.register('menuTools', {
      tag: 'menuitem',
      id: `${config.addonRef}-menu-preferences`,
      label: 'Z2R: Preferences',
      commandListener: () => this.handlePreferencesCommand()
    });

    // 添加分隔符
    this.menuManager.register('menuTools', {
      tag: 'menuseparator',
      id: `${config.addonRef}-menu-separator`
    }, 'before', Zotero.getMainWindow().document.querySelector('#menu_ToolsPopup > menuseparator'));

    this.logger.info('Z2R Tools menu items registered successfully');
  }

  /**
   * 处理立即同步命令
   */
  private async handleSyncCommand(): Promise<void> {
    this.logger.info('Starting sync to Readwise from Tools menu...');
    
    try {
      // 创建进度窗口
      const progressWindow = new this.ztoolkit.ProgressWindow(config.addonName, {
        closeOnClick: false,
        closeTime: -1
      });

      const progressLine = progressWindow.createLine({
        text: 'Initializing sync to Readwise...',
        type: 'default',
        progress: 0
      });

      progressWindow.show();

      // 执行同步
      const result = await this.orchestrator.sync({
        incremental: false
      });

      // 更新进度显示
      progressLine.progress = 100;
      progressLine.text = `Sync complete: ${result.itemsSynced} items synced, ${result.itemsFailed} failed`;

      if (result.success) {
        progressLine.type = 'success';
        this.showNotification(
          'Sync Complete', 
          `Successfully synced ${result.itemsSynced} items to Readwise.`
        );
      } else {
        progressLine.type = 'error';
        this.showNotification(
          'Sync Failed', 
          `Sync completed with errors. Check the log for details.`, 
          'error'
        );
      }

      // 自动关闭进度窗口
      progressWindow.startCloseTimer(5000);

    } catch (error) {
      this.logger.error('Sync failed:', error);
      this.showNotification(
        'Sync Error', 
        'Failed to sync to Readwise. Check the log for details.', 
        'error'
      );
    }
  }

  /**
   * 处理查看日志命令
   */
  private async handleViewLogsCommand(): Promise<void> {
    this.logger.info('Opening log viewer from Tools menu...');
    
    try {
      // 获取日志文件路径
      const logFile = Zotero.File.pathToFile(
        Zotero.DataDirectory.dir + '/logs/z2r-sync.log'
      );

      if (await OS.File.exists(logFile.path)) {
        // 如果日志文件存在，打开它
        Zotero.launchFile(logFile);
        this.logger.info('Opened log file:', logFile.path);
      } else {
        // 如果日志文件不存在，显示最近的日志
        this.showRecentLogs();
      }
    } catch (error) {
      this.logger.error('Failed to open logs:', error);
      // 回退到显示最近的日志
      this.showRecentLogs();
    }
  }

  /**
   * 显示最近的日志
   */
  private showRecentLogs(): void {
    // 创建一个对话框显示最近的日志
    const dialogData = {
      title: 'Z2R: Recent Logs',
      content: this.getRecentLogsHTML(),
      buttons: ['Close', 'Clear Logs'],
      defaultButton: 0
    };

    const dialog = new this.ztoolkit.Dialog(2, 1)
      .setDialogData(dialogData)
      .addCell(0, 0, {
        tag: 'div',
        namespace: 'html',
        attributes: {
          style: 'width: 600px; height: 400px; overflow: auto; padding: 10px; font-family: monospace; font-size: 12px;'
        },
        properties: {
          innerHTML: this.getRecentLogsHTML()
        }
      });

    dialog.open('Z2R Logs');
  }

  /**
   * 获取最近的日志HTML内容
   */
  private getRecentLogsHTML(): string {
    // TODO: 从实际的日志存储中获取
    return `
      <div style="padding: 10px; background: #f5f5f5; border-radius: 4px;">
        <h3>Recent Sync Logs</h3>
        <pre style="white-space: pre-wrap; word-wrap: break-word;">
[2024-01-20 10:30:00] INFO: Z2R Plugin initialized
[2024-01-20 10:30:05] INFO: Starting sync to Readwise...
[2024-01-20 10:30:10] INFO: Found 15 items to sync
[2024-01-20 10:30:15] INFO: Successfully synced 15 items
[2024-01-20 10:30:16] INFO: Sync completed successfully
        </pre>
      </div>
    `;
  }

  /**
   * 处理偏好设置命令
   */
  private handlePreferencesCommand(): void {
    this.logger.info('Opening Z2R preferences from Tools menu...');
    
    try {
      // 使用 zotero-plugin-toolkit 打开首选项对话框
      const prefWindow = new this.ztoolkit.PreferencePane(
        `chrome://${config.addonRef}/content/preferences.xhtml`,
        {
          pluginID: config.addonID,
          src: `chrome://${config.addonRef}/content/preferences.xhtml`,
          label: 'Z2R Preferences',
          image: `chrome://${config.addonRef}/content/icons/favicon.png`,
          defaultXUL: true
        }
      );

      prefWindow.open();
    } catch (error) {
      this.logger.error('Failed to open preferences:', error);
      // 回退方案：使用传统方式打开
      const window = Zotero.getMainWindow();
      window.openDialog(
        `chrome://${config.addonRef}/content/preferences.xhtml`,
        `${config.addonRef}-preferences`,
        'chrome,titlebar,toolbar,centerscreen,dialog=yes'
      );
    }
  }

  /**
   * 显示通知
   */
  private showNotification(title: string, message: string, type: 'info' | 'error' = 'info'): void {
    const progressWindow = new this.ztoolkit.ProgressWindow(title, {
      closeOnClick: true,
      closeTime: 5000
    });
    
    progressWindow.createLine({
      text: message,
      type: type === 'error' ? 'error' : 'success',
      progress: 100
    });
    
    progressWindow.show();
  }

  /**
   * 注销菜单项（插件卸载时调用）
   */
  unregister(): void {
    this.logger.info('Unregistering Z2R Tools menu items...');
    
    if (this.menuManager) {
      this.menuManager.unregisterAll();
      this.menuManager = undefined;
    }
  }
}

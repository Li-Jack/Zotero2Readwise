/**
 * Task Scheduler
 * 手动触发与可选的后台监听/定时
 */

import { ReadwiseSyncOrchestrator } from '../../core/readwiseSync';
import { StateStore } from '../../storage/stateStore';
import { Logger } from '../../utils/logger';
import { debounce } from '../../utils/debounce';
import { getPref, setPref } from '../../utils/prefs';

export class SyncScheduler {
  private readonly orchestrator: ReadwiseSyncOrchestrator;
  private readonly stateStore: StateStore;
  private readonly logger: Logger;
  private readonly Zotero: any;
  
  private intervalTimer?: NodeJS.Timeout;
  private notifierID?: string | number;
  private isRunning = false;
  private syncLock = false; // 重入锁
  private debouncedSync: ReturnType<typeof debounce>;
  private lastSyncTime?: Date;

  constructor(
    orchestrator: ReadwiseSyncOrchestrator,
    stateStore: StateStore,
    logger: Logger,
    zoteroGlobal: any
  ) {
    this.orchestrator = orchestrator;
    this.stateStore = stateStore;
    this.logger = logger;
    this.Zotero = zoteroGlobal;

    // 创建防抖的同步函数（避免频繁触发）
    const debounceDelay = getPref('annotationDebounceDelay') || 30000;
    this.debouncedSync = debounce(
      this.performIncrementalSync.bind(this),
      debounceDelay, // 可配置的防抖延迟
      { leading: false, trailing: true }
    );
  }

  /**
   * 启动调度器
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Scheduler is already running');
      return;
    }

    this.isRunning = true;
    this.logger.info('Starting sync scheduler...');

    // 使用 Zotero.Prefs 获取首选项
    const enableBackgroundSync = getPref('enableBackgroundSync');
    const enableScheduledSync = getPref('enableScheduledSync');
    const syncOnStartup = getPref('syncOnStartup');
    const syncInterval = getPref('syncIntervalMinutes') || 60;

    // 启动时同步（如果启用）
    if (syncOnStartup) {
      await this.performStartupSync();
    }

    // 设置定时同步（如果启用）
    if (enableScheduledSync && syncInterval > 0) {
      this.startIntervalSync(syncInterval);
    }

    // 监听 Zotero 项目变化（如果启用后台监听）
    if (enableBackgroundSync) {
      this.startItemObserver();
    }
  }

  /**
   * 停止调度器
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('Stopping sync scheduler...');
    this.isRunning = false;

    // 清理定时器
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = undefined;
    }

    // 停止观察器
    if (this.notifierID !== undefined) {
      this.Zotero.Notifier.unregisterObserver(this.notifierID);
      this.notifierID = undefined;
    }

    // 取消防抖的同步
    this.debouncedSync.cancel();
    
    // 释放锁
    this.syncLock = false;
  }

  /**
   * 手动触发同步
   */
  async triggerManualSync(incremental = false): Promise<void> {
    this.logger.info(`Manual sync triggered (incremental: ${incremental})`);
    
    try {
      const result = await this.orchestrator.sync({ incremental });
      
      if (result.success) {
        await this.stateStore.incrementSyncCount();
        this.showNotification(
          'Sync Complete',
          `Successfully synced ${result.itemsSynced} items`
        );
      } else {
        this.showNotification(
          'Sync Failed',
          `Sync completed with ${result.itemsFailed} failures`,
          'error'
        );
      }
    } catch (error) {
      this.logger.error('Manual sync failed:', error);
      this.showNotification(
        'Sync Error',
        (error as Error).message,
        'error'
      );
    }
  }

  /**
   * 执行启动时同步
   */
  private async performStartupSync(): Promise<void> {
    this.logger.info('Performing startup sync...');
    
    // 延迟执行，等待 Zotero 完全加载
    setTimeout(async () => {
      try {
        await this.orchestrator.sync({ incremental: true });
        await this.stateStore.incrementSyncCount();
      } catch (error) {
        this.logger.error('Startup sync failed:', error);
      }
    }, 5000); // 5秒延迟
  }

  /**
   * 执行增量同步（带并发保护）
   */
  private async performIncrementalSync(): Promise<void> {
    // 重入锁检查
    if (this.syncLock) {
      this.logger.debug('Sync already in progress (locked), skipping...');
      return;
    }

    // 检查 orchestrator 状态
    if (this.orchestrator.getStatus() !== 'idle') {
      this.logger.debug('Orchestrator busy, skipping incremental sync...');
      return;
    }

    // 获取并发保护设置
    const minSyncInterval = getPref('minSyncInterval') || 60000; // 默认最小间隔1分钟
    if (this.lastSyncTime) {
      const timeSinceLastSync = Date.now() - this.lastSyncTime.getTime();
      if (timeSinceLastSync < minSyncInterval) {
        this.logger.debug(`Too soon since last sync (${timeSinceLastSync}ms < ${minSyncInterval}ms), skipping...`);
        return;
      }
    }

    // 获取锁
    this.syncLock = true;
    this.logger.info('Performing scheduled incremental sync...');
    
    try {
      const result = await this.orchestrator.sync({ incremental: true });
      
      if (result.itemsSynced > 0) {
        await this.stateStore.incrementSyncCount();
        this.logger.info(`Incremental sync completed: ${result.itemsSynced} items synced`);
      }
      
      this.lastSyncTime = new Date();
    } catch (error) {
      this.logger.error('Incremental sync failed:', error);
    } finally {
      // 释放锁
      this.syncLock = false;
    }
  }

  /**
   * 启动定时同步
   */
  private startIntervalSync(intervalMinutes: number): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
    }

    const intervalMs = intervalMinutes * 60 * 1000;
    this.logger.info(`Starting interval sync every ${intervalMinutes} minutes`);

    this.intervalTimer = setInterval(() => {
      this.performIncrementalSync();
    }, intervalMs);
  }

  /**
   * 启动 Zotero.Notifier 监听器
   */
  private startItemObserver(): void {
    this.logger.info('Starting Zotero.Notifier observer for annotations and items...');

    // 获取监听配置
    const listenToAnnotations = getPref('listenToAnnotations') !== false;
    const listenToItems = getPref('listenToItems') !== false;
    
    const typesToObserve: string[] = [];
    if (listenToAnnotations) typesToObserve.push('annotation');
    if (listenToItems) typesToObserve.push('item');
    
    if (typesToObserve.length === 0) {
      this.logger.warn('No types selected for observation');
      return;
    }

    // 注册 Zotero.Notifier 观察器
    this.notifierID = this.Zotero.Notifier.registerObserver({
      notify: async (event: string, type: string, ids: number[], extraData: any) => {
        // 只监听相关事件
        if (!['add', 'modify', 'delete'].includes(event)) {
          return;
        }

        // 只监听配置的类型
        if (!typesToObserve.includes(type)) {
          return;
        }

        // 过滤掉非用户操作的变更（如插件自身的变更）
        if (extraData?.skipNotifier?.includes('readwise-sync')) {
          return;
        }

        this.logger.debug(`Zotero ${type} ${event}: ${ids.length} items`);

        // 检查是否应该触发同步
        if (this.shouldTriggerSync(event, type, ids)) {
          // 使用防抖函数避免频繁同步
          this.debouncedSync();
        }
      }
    }, typesToObserve, 'readwise-sync');

    this.logger.info(`Notifier registered with ID: ${this.notifierID}`);
  }

  /**
   * 判断是否应该触发同步
   */
  private shouldTriggerSync(event: string, type: string, ids: number[]): boolean {
    // 可以在这里添加更多过滤逻辑
    // 例如：只同步特定集合的项目、忽略某些标签等
    
    const minItemsToTrigger = getPref('minItemsToTriggerSync') || 1;
    if (ids.length < minItemsToTrigger) {
      this.logger.debug(`Not enough items to trigger sync (${ids.length} < ${minItemsToTrigger})`);
      return false;
    }
    
    return true;
  }

  /**
   * 更新调度器设置（响应首选项变化）
   */
  async updateSettings(): Promise<void> {
    this.logger.info('Updating scheduler settings from preferences...');
    
    const enableBackgroundSync = getPref('enableBackgroundSync');
    const enableScheduledSync = getPref('enableScheduledSync');
    const syncInterval = getPref('syncIntervalMinutes') || 60;
    const debounceDelay = getPref('annotationDebounceDelay') || 30000;

    // 重新配置定时同步
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = undefined;
    }

    if (enableScheduledSync && syncInterval > 0) {
      this.startIntervalSync(syncInterval);
    }

    // 重新配置项目观察器
    if (enableBackgroundSync && this.notifierID === undefined) {
      this.startItemObserver();
    } else if (!enableBackgroundSync && this.notifierID !== undefined) {
      this.Zotero.Notifier.unregisterObserver(this.notifierID);
      this.notifierID = undefined;
    }
    
    // 更新防抖延迟
    this.debouncedSync = debounce(
      this.performIncrementalSync.bind(this),
      debounceDelay,
      { leading: false, trailing: true }
    );
    
    this.logger.info('Scheduler settings updated');
  }

  /**
   * 获取下次同步时间
   */
  async getNextSyncTime(): Promise<Date | null> {
    const prefs = await this.stateStore.getPreferences();
    
    if (!prefs.autoSync || prefs.syncInterval <= 0) {
      return null;
    }

    const lastSync = await this.stateStore.getLastSyncTime();
    if (!lastSync) {
      return new Date(); // 立即同步
    }

    const nextSync = new Date(lastSync);
    nextSync.setMinutes(nextSync.getMinutes() + prefs.syncInterval);
    
    return nextSync;
  }

  /**
   * 显示通知
   */
  private showNotification(title: string, message: string, type: 'info' | 'error' = 'info'): void {
    const prefs = this.stateStore.getPreferences();
    
    // 检查是否启用通知
    prefs.then(p => {
      if (!p.showNotifications) {
        return;
      }

      const progressWindow = new this.Zotero.ProgressWindow({ closeOnClick: true });
      progressWindow.changeHeadline(title);
      
      const icon = type === 'error' 
        ? 'chrome://zotero/skin/cross.png' 
        : 'chrome://zotero/skin/tick.png';
      
      progressWindow.addLines(message, icon);
      progressWindow.show();
      progressWindow.startCloseTimer(3000);
    });
  }

  /**
   * 获取调度器状态
   */
  getStatus(): SchedulerStatus {
    return {
      isRunning: this.isRunning,
      hasIntervalTimer: !!this.intervalTimer,
      hasItemObserver: this.notifierID !== undefined,
      syncStatus: this.orchestrator.getStatus(),
      lastSyncTime: this.lastSyncTime,
      syncLocked: this.syncLock
    };
  }
}

export interface SchedulerStatus {
  isRunning: boolean;
  hasIntervalTimer: boolean;
  hasItemObserver: boolean;
  syncStatus: string;
  lastSyncTime?: Date;
  syncLocked: boolean;
}

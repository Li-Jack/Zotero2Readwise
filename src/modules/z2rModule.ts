/**
 * Z2R Main Module
 * 主插件模块，负责初始化和管理所有组件
 */

import { ReadwiseSyncOrchestrator } from '../core/readwiseSync';
import { ReadwiseClient } from '../api/readwiseClient';
import { ZoteroAdapter } from '../adapters/zoteroAdapter';
import { ZoteroToReadwiseMapper } from '../mappers/zoteroToReadwise';
import { StateStore } from '../storage/stateStore';
import { ToolsMenu } from '../ui/toolsMenu';
import { SyncScheduler } from '../tasks/scheduler';
import { Logger } from '../utils/logger';
import { config } from '../../package.json';
import { getPref } from '../utils/prefs';

export class Z2RModule {
  private logger: Logger;
  private orchestrator?: ReadwiseSyncOrchestrator;
  private toolsMenu?: ToolsMenu;
  private scheduler?: SyncScheduler;
  private ztoolkit: ZToolkit;
  private initialized: boolean = false;
  private prefsObserverID?: symbol;

  constructor(ztoolkit: ZToolkit) {
    this.ztoolkit = ztoolkit;
    this.logger = new Logger({
      prefix: `[${config.addonName}]`,
      level: __env__ === 'development' ? 'debug' : 'info'
    });
  }

  /**
   * 初始化插件
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      this.logger.warn('Z2R Module already initialized');
      return;
    }

    this.logger.info('Initializing Z2R Module...');

    try {
      // 初始化日志实例
      const componentLogger = this.logger.createChild ? this.logger.createChild('Components') : this.logger;
      
      // 初始化组件（按照各组件的构造函数签名）
      const stateStore = new StateStore(componentLogger);
      const mapper = new ZoteroToReadwiseMapper(componentLogger);
      const zoteroAdapter = new ZoteroAdapter(componentLogger, this.ztoolkit);
      
      // 获取 API token 配置
      const apiToken = getPref('apiToken') || '';
      const readwiseClient = new ReadwiseClient(
        {
          apiToken,
          maxRetries: 3,
          rateLimit: {
            maxRequests: 240,
            windowMs: 60000
          }
        },
        componentLogger
      );

      // 初始化同步协调器（注意参数顺序：zoteroAdapter 在前，readwiseClient 在后）
      this.orchestrator = new ReadwiseSyncOrchestrator(
        zoteroAdapter,
        readwiseClient,
        mapper,
        stateStore,
        this.logger
      );

      // 初始化 Tools 菜单
      this.toolsMenu = new ToolsMenu(
        this.orchestrator,
        this.logger.createChild('ToolsMenu'),
        this.ztoolkit
      );
      this.toolsMenu.register();

      // 初始化调度器
      this.scheduler = new SyncScheduler(
        this.orchestrator,
        stateStore,
        this.logger.createChild('Scheduler'),
        Zotero // 传入 Zotero 全局对象
      );
      
      // 根据首选项启动调度器
      const enableBackgroundSync = getPref('enableBackgroundSync');
      const enableScheduledSync = getPref('enableScheduledSync');
      
      if (enableBackgroundSync || enableScheduledSync) {
        await this.scheduler.start();
        this.logger.info('Scheduler started with current preferences');
      }
      
      // 监听首选项变化
      this.registerPreferenceObserver();

      this.initialized = true;
      this.logger.info('Z2R Module initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Z2R Module:', error);
      throw error;
    }
  }

  /**
   * 清理插件资源
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Z2R Module...');

    try {
      // 停止调度器
      if (this.scheduler) {
        this.scheduler.stop();
      }
      
      // 注销首选项观察器
      if (this.prefsObserverID) {
        Zotero.Prefs.unregisterObserver(this.prefsObserverID);
        this.prefsObserverID = undefined;
      }

      // 注销菜单
      if (this.toolsMenu) {
        this.toolsMenu.unregister();
      }

      // 清理协调器
      if (this.orchestrator) {
        // 如果有需要清理的资源
      }

      this.initialized = false;
      this.logger.info('Z2R Module shut down successfully');
    } catch (error) {
      this.logger.error('Error during Z2R Module shutdown:', error);
    }
  }

  /**
   * 获取同步协调器实例
   */
  getOrchestrator(): ReadwiseSyncOrchestrator | undefined {
    return this.orchestrator;
  }

  /**
   * 手动触发同步
   */
  async sync(options?: { incremental?: boolean }): Promise<void> {
    if (!this.orchestrator) {
      throw new Error('Z2R Module not initialized');
    }

    await this.orchestrator.sync(options);
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized;
  }
  
  /**
   * 注册首选项观察器
   */
  private registerPreferenceObserver(): void {
    const prefsToWatch = [
      'enableBackgroundSync',
      'enableScheduledSync',
      'syncIntervalMinutes',
      'annotationDebounceDelay',
      'listenToAnnotations',
      'listenToItems'
    ];
    
    // 注册 Zotero 首选项观察器
    this.prefsObserverID = Zotero.Prefs.registerObserver(
      `extensions.zotero.${config.addonRef}`,
      async (value: any) => {
        this.logger.info('Preference changed, updating scheduler settings...');
        
        if (!this.scheduler) return;
        
        // 检查是否需要启动或停止调度器
        const enableBackgroundSync = getPref('enableBackgroundSync');
        const enableScheduledSync = getPref('enableScheduledSync');
        const status = this.scheduler.getStatus();
        
        if ((enableBackgroundSync || enableScheduledSync) && !status.isRunning) {
          // 需要启动调度器
          await this.scheduler.start();
          this.logger.info('Scheduler started due to preference change');
        } else if (!enableBackgroundSync && !enableScheduledSync && status.isRunning) {
          // 需要停止调度器
          this.scheduler.stop();
          this.logger.info('Scheduler stopped due to preference change');
        } else if (status.isRunning) {
          // 更新调度器设置
          await this.scheduler.updateSettings();
          this.logger.info('Scheduler settings updated');
        }
      },
      true
    );
  }
}

// 导出单例实例管理器
let moduleInstance: Z2RModule | null = null;

export function getZ2RModule(ztoolkit: ZToolkit): Z2RModule {
  if (!moduleInstance) {
    moduleInstance = new Z2RModule(ztoolkit);
  }
  return moduleInstance;
}

export function clearZ2RModule(): void {
  moduleInstance = null;
}

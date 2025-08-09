/**
 * Z2R Application Bootstrap
 * 应用程序初始化和依赖注入
 */

import {
  ReadwiseSyncOrchestrator,
  ReadwiseClient,
  ZoteroAdapter,
  ZoteroToReadwiseMapper,
  StateStore,
  ToolsMenu,
  PreferencesPanel,
  SyncScheduler,
  Logger
} from './modules';

export class Z2RApplication {
  private readonly logger: Logger;
  private readonly stateStore: StateStore;
  private readonly zoteroAdapter: ZoteroAdapter;
  private readonly readwiseClient: ReadwiseClient;
  private readonly mapper: ZoteroToReadwiseMapper;
  private readonly orchestrator: ReadwiseSyncOrchestrator;
  private readonly scheduler: SyncScheduler;
  private readonly toolsMenu: ToolsMenu;
  private preferencesPanel?: PreferencesPanel;
  
  private initialized = false;

  constructor(private readonly Zotero: any) {
    // 初始化日志记录器
    this.logger = new Logger({
      prefix: '[Z2R]',
      level: 'info'
    });

    this.logger.info('Initializing Z2R Application...');

    // 初始化存储
    this.stateStore = new StateStore(this.logger);

    // 初始化适配器
    this.zoteroAdapter = new ZoteroAdapter(this.logger);

    // 初始化映射器
    this.mapper = new ZoteroToReadwiseMapper(this.logger);

    // 初始化 API 客户端（稍后配置）
    this.readwiseClient = this.createReadwiseClient();

    // 初始化核心编排器
    this.orchestrator = new ReadwiseSyncOrchestrator(
      this.zoteroAdapter,
      this.readwiseClient,
      this.mapper,
      this.stateStore,
      this.logger
    );

    // 初始化调度器
    this.scheduler = new SyncScheduler(
      this.orchestrator,
      this.stateStore,
      this.logger,
      this.Zotero
    );

    // 初始化 UI
    this.toolsMenu = new ToolsMenu(
      this.orchestrator,
      this.logger,
      this.Zotero
    );
  }

  /**
   * 初始化应用程序
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      this.logger.warn('Application already initialized');
      return;
    }

    try {
      this.logger.info('Starting application initialization...');

      // 注册菜单
      this.toolsMenu.register();

      // 加载配置并更新客户端
      await this.updateReadwiseClient();

      // 启动调度器
      await this.scheduler.start();

      this.initialized = true;
      this.logger.info('Application initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize application:', error);
      throw error;
    }
  }

  /**
   * 关闭应用程序
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down application...');

    try {
      // 停止调度器
      this.scheduler.stop();

      // 注销菜单
      this.toolsMenu.unregister();

      // 中止正在进行的同步
      this.orchestrator.abort();

      this.initialized = false;
      this.logger.info('Application shutdown complete');

    } catch (error) {
      this.logger.error('Error during shutdown:', error);
    }
  }

  /**
   * 创建 Readwise 客户端
   */
  private createReadwiseClient(): ReadwiseClient {
    // 创建一个临时客户端，稍后会更新配置
    return new ReadwiseClient(
      {
        apiToken: '',
        maxRetries: 3,
        rateLimit: {
          maxRequests: 240,
          windowMs: 60000
        }
      },
      this.logger
    );
  }

  /**
   * 更新 Readwise 客户端配置
   */
  private async updateReadwiseClient(): Promise<void> {
    const prefs = await this.stateStore.getPreferences();
    
    if (prefs.apiToken) {
      // 重新创建客户端with新配置
      const newClient = new ReadwiseClient(
        {
          apiToken: prefs.apiToken,
          maxRetries: 3,
          rateLimit: {
            maxRequests: 240,
            windowMs: 60000
          }
        },
        this.logger
      );

      // 更新引用
      (this.orchestrator as any).readwiseClient = newClient;
      (this as any).readwiseClient = newClient;
    }
  }

  /**
   * 打开偏好设置面板
   */
  async openPreferences(document: Document): Promise<void> {
    if (!this.preferencesPanel) {
      this.preferencesPanel = new PreferencesPanel(
        this.stateStore,
        this.zoteroAdapter,
        this.logger,
        document,
        this.Zotero
      );
    }

    const container = document.getElementById('zotero-readwise-preferences-container');
    if (container) {
      await this.preferencesPanel.render(container as HTMLElement);
    }
  }

  /**
   * 手动触发同步
   */
  async syncNow(incremental = false): Promise<void> {
    await this.scheduler.triggerManualSync(incremental);
  }

  /**
   * 获取应用程序状态
   */
  getStatus(): ApplicationStatus {
    return {
      initialized: this.initialized,
      syncStatus: this.orchestrator.getStatus(),
      schedulerStatus: this.scheduler.getStatus()
    };
  }

  /**
   * 获取同步统计
   */
  async getStats() {
    return await this.stateStore.getSyncStats();
  }

  /**
   * 测试 Readwise 连接
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.updateReadwiseClient();
      return await this.readwiseClient.testConnection();
    } catch (error) {
      this.logger.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * 清除同步状态
   */
  async clearSyncState(): Promise<void> {
    await this.stateStore.clearSyncState();
    this.logger.info('Sync state cleared');
  }

  /**
   * 导出数据
   */
  async exportData() {
    return await this.stateStore.exportData();
  }

  /**
   * 导入数据
   */
  async importData(data: any): Promise<void> {
    await this.stateStore.importData(data);
    this.logger.info('Data imported successfully');
  }
}

// Types
export interface ApplicationStatus {
  initialized: boolean;
  syncStatus: string;
  schedulerStatus: any;
}

// 单例实例
let appInstance: Z2RApplication | null = null;

/**
 * 获取或创建应用程序实例
 */
export function getApplication(Zotero?: any): Z2RApplication {
  if (!appInstance && Zotero) {
    appInstance = new Z2RApplication(Zotero);
  }
  
  if (!appInstance) {
    throw new Error('Application not initialized. Please provide Zotero object.');
  }
  
  return appInstance;
}

/**
 * 销毁应用程序实例
 */
export async function destroyApplication(): Promise<void> {
  if (appInstance) {
    await appInstance.shutdown();
    appInstance = null;
  }
}

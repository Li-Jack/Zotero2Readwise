import { config } from "../package.json";
import { ColumnOptions, DialogHelper } from "zotero-plugin-toolkit";
import hooks from "./hooks";
import { createZToolkit } from "./utils/ztoolkit";
import { initializeLogger, cleanupLogger, log } from "./utils/loggerInit";
import { Logger } from "./utils/logger";
import { FileLogger } from "./utils/fileLogger";

class Addon {
  public data: {
    alive: boolean;
    config: typeof config;
    // Env type, see build.js
    env: "development" | "production";
    initialized?: boolean;
    ztoolkit: ZToolkit;
    locale?: {
      current: any;
    };
    prefs?: {
      window: Window;
      columns: Array<ColumnOptions>;
      rows: Array<{ [dataKey: string]: string }>;
    };
    dialog?: DialogHelper;
    logger?: Logger;
    fileLogger?: FileLogger;
  };
  // Lifecycle hooks
  public hooks: typeof hooks;
  // APIs
  public api: object;

  constructor() {
    this.data = {
      alive: true,
      config,
      env: __env__,
      initialized: false,
      ztoolkit: createZToolkit(),
    };
    this.hooks = hooks;
    this.api = {};
    
    // 初始化日志系统
    this.initializeLogging();
  }
  
  /**
   * 初始化日志系统
   */
  private initializeLogging(): void {
    try {
      const { logger, fileLogger } = initializeLogger();
      this.data.logger = logger;
      this.data.fileLogger = fileLogger;
      
      // 记录插件启动
      logger.info('Z2R Addon initialized', {
        version: config.version,
        environment: this.data.env,
        platform: Zotero.platform,
        zoteroVersion: Zotero.version
      });
    } catch (error) {
      console.error('Failed to initialize logging system:', error);
    }
  }
  
  /**
   * 清理资源
   */
  public cleanup(): void {
    this.data.logger?.info('Z2R Addon shutting down');
    cleanupLogger();
    this.data.alive = false;
  }
}

export default Addon;

/**
 * Logger Initialization Module
 * 初始化全局日志系统
 */

import { Logger } from './logger';
import { FileLogger } from './fileLogger';

// 全局日志实例
let globalLogger: Logger | null = null;
let globalFileLogger: FileLogger | null = null;

/**
 * 初始化日志系统
 */
export function initializeLogger(): { logger: Logger; fileLogger: FileLogger } {
  // 如果已经初始化，返回现有实例
  if (globalLogger && globalFileLogger) {
    return { logger: globalLogger, fileLogger: globalFileLogger };
  }

  // 创建文件日志记录器
  globalFileLogger = new FileLogger({
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
    enableRotation: true,
    filePrefix: 'z2r'
  });

  // 检查是否为开发模式
  const isDevelopment = checkDevelopmentMode();
  const logLevel = getLogLevel(isDevelopment);

  // 创建主日志记录器
  globalLogger = new Logger({
    prefix: '[Z2R]',
    level: logLevel,
    enableConsole: true,
    enableZoteroDebug: true,
    sanitizeTokens: !isDevelopment, // 开发模式不脱敏
    maxMessageLength: isDevelopment ? 10000 : 5000,
    enableFileLogging: true,
    isDevelopment,
    fileLogger: globalFileLogger
  });

  // 记录初始化信息
  globalLogger.info('Logger system initialized', {
    mode: isDevelopment ? 'development' : 'production',
    level: logLevel,
    fileLogging: true,
    version: getVersion()
  });

  // 设置全局错误处理
  setupGlobalErrorHandlers(globalLogger);

  // 设置性能监控（开发模式）
  if (isDevelopment) {
    setupPerformanceMonitoring(globalLogger);
  }

  return { logger: globalLogger, fileLogger: globalFileLogger };
}

/**
 * 检查是否为开发模式
 */
function checkDevelopmentMode(): boolean {
  // 环境变量检查
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
    return true;
  }

  // Zotero调试模式检查
  if (typeof Zotero !== 'undefined' && Zotero.Debug?.enabled) {
    return true;
  }

  // 用户偏好设置检查
  if (typeof Zotero !== 'undefined' && Zotero.Prefs) {
    return Zotero.Prefs.get('z2r.debug.enabled') === true;
  }

  return false;
}

/**
 * 获取日志级别
 */
function getLogLevel(isDevelopment: boolean): 'debug' | 'info' | 'warn' | 'error' {
  // 优先使用用户配置
  if (typeof Zotero !== 'undefined' && Zotero.Prefs) {
    const configuredLevel = Zotero.Prefs.get('z2r.log.level');
    if (configuredLevel && ['debug', 'info', 'warn', 'error'].includes(configuredLevel)) {
      return configuredLevel as any;
    }
  }

  // 开发模式默认debug，生产模式默认info
  return isDevelopment ? 'debug' : 'info';
}

/**
 * 获取版本信息
 */
function getVersion(): string {
  try {
    if (typeof Zotero !== 'undefined' && Zotero.Z2R?.version) {
      return Zotero.Z2R.version;
    }
    // 尝试从package.json获取
    return require('../../package.json').version || 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * 设置全局错误处理
 */
function setupGlobalErrorHandlers(logger: Logger): void {
  // 处理未捕获的错误
  if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      logger.error('Uncaught error:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.stack
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      logger.error('Unhandled promise rejection:', {
        reason: event.reason,
        promise: event.promise
      });
    });
  }

  // Node.js环境错误处理
  if (typeof process !== 'undefined') {
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection:', { reason, promise });
    });
  }
}

/**
 * 设置性能监控（开发模式）
 */
function setupPerformanceMonitoring(logger: Logger): void {
  if (typeof performance === 'undefined' || !performance.mark) {
    return;
  }

  // 监控长任务
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) { // 超过50ms的任务
            logger.debug('Long task detected:', {
              name: entry.name,
              duration: `${entry.duration.toFixed(2)}ms`,
              startTime: `${entry.startTime.toFixed(2)}ms`
            });
          }
        }
      });
      
      observer.observe({ entryTypes: ['measure', 'navigation'] });
    } catch (error) {
      logger.warn('Failed to setup performance monitoring:', error);
    }
  }

  // 监控内存使用（如果可用）
  if ('memory' in performance) {
    setInterval(() => {
      const memory = (performance as any).memory;
      if (memory) {
        const usedMB = (memory.usedJSHeapSize / 1048576).toFixed(2);
        const totalMB = (memory.totalJSHeapSize / 1048576).toFixed(2);
        const limitMB = (memory.jsHeapSizeLimit / 1048576).toFixed(2);
        
        logger.debug('Memory usage:', {
          used: `${usedMB} MB`,
          total: `${totalMB} MB`,
          limit: `${limitMB} MB`,
          percentage: `${((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100).toFixed(1)}%`
        });
      }
    }, 30000); // 每30秒记录一次
  }
}

/**
 * 创建模块专用日志记录器
 */
export function createModuleLogger(moduleName: string): Logger {
  if (!globalLogger) {
    const { logger } = initializeLogger();
    globalLogger = logger;
  }
  
  return globalLogger.createChild(moduleName);
}

/**
 * 获取全局日志记录器
 */
export function getGlobalLogger(): Logger {
  if (!globalLogger) {
    const { logger } = initializeLogger();
    globalLogger = logger;
  }
  
  return globalLogger;
}

/**
 * 获取文件日志记录器
 */
export function getFileLogger(): FileLogger {
  if (!globalFileLogger) {
    const { fileLogger } = initializeLogger();
    globalFileLogger = fileLogger;
  }
  
  return globalFileLogger;
}

/**
 * 清理日志系统
 */
export function cleanupLogger(): void {
  if (globalFileLogger) {
    globalFileLogger.destroy();
    globalFileLogger = null;
  }
  
  if (globalLogger) {
    globalLogger.info('Logger system shutting down');
    globalLogger = null;
  }
}

// 导出便捷方法
export const log = {
  debug: (...args: any[]) => getGlobalLogger().debug(...args),
  info: (...args: any[]) => getGlobalLogger().info(...args),
  warn: (...args: any[]) => getGlobalLogger().warn(...args),
  error: (...args: any[]) => getGlobalLogger().error(...args),
  time: (label: string) => getGlobalLogger().time(label),
  timeEnd: (label: string) => getGlobalLogger().timeEnd(label)
};

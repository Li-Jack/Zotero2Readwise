/**
 * Logger Utility
 * 提供统一的日志记录功能
 * 兼容 Zotero 环境和标准控制台
 * 支持日志分级、隐私保护、结构化日志、文件日志和开发模式
 */

import { FileLogger, LogEntry } from './fileLogger';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LoggerConfig {
  prefix?: string;
  level?: LogLevel;
  enableConsole?: boolean;
  enableZoteroDebug?: boolean;
  sanitizeTokens?: boolean;
  maxMessageLength?: number;
  enableFileLogging?: boolean;
  isDevelopment?: boolean;
  fileLogger?: FileLogger;
}

export class Logger {
  private readonly prefix: string;
  private readonly level: LogLevel;
  private readonly enableConsole: boolean;
  private readonly enableZoteroDebug: boolean;
  private readonly sanitizeTokens: boolean;
  private readonly maxMessageLength: number;
  private readonly enableFileLogging: boolean;
  private readonly isDevelopment: boolean;
  private readonly fileLogger?: FileLogger;
  private readonly levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };
  
  // 敏感信息模式
  private readonly sensitivePatterns = [
    /([Tt]oken|[Kk]ey|[Pp]assword|[Ss]ecret)[\s]*[:=]\s*["']?([^\s"']+)["']?/gi,
    /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
    /[A-Za-z0-9+/]{40,}={0,2}/g, // Base64 encoded strings
    /\b[A-F0-9]{40}\b/gi, // SHA-1 hashes
    /\b[A-Z0-9]{20,}\b/g // API keys
  ];

  constructor(config: LoggerConfig = {}) {
    this.prefix = config.prefix || '[Z2R]';
    this.level = config.level || this.getDefaultLogLevel();
    this.enableConsole = config.enableConsole !== false;
    this.enableZoteroDebug = config.enableZoteroDebug !== false;
    this.sanitizeTokens = config.sanitizeTokens !== false;
    this.maxMessageLength = config.maxMessageLength || 5000;
    this.enableFileLogging = config.enableFileLogging !== false;
    this.isDevelopment = config.isDevelopment || this.checkDevelopmentMode();
    this.fileLogger = config.fileLogger;
    
    // 开发模式自动设置
    if (this.isDevelopment) {
      this.setupDevelopmentMode();
    }
  }
  
  /**
   * 获取默认日志级别
   */
  private getDefaultLogLevel(): LogLevel {
    // 检查用户偏好设置
    if (typeof Zotero !== 'undefined' && Zotero.Prefs) {
      const configuredLevel = Zotero.Prefs.get('z2r.log.level') as LogLevel;
      if (configuredLevel) return configuredLevel;
    }
    
    // 开发模式默认debug，生产模式默认info
    return this.checkDevelopmentMode() ? 'debug' : 'info';
  }
  
  /**
   * 检查是否为开发模式
   */
  private checkDevelopmentMode(): boolean {
    // 检查环境变量
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
      return true;
    }
    
    // 检查Zotero调试模式
    if (typeof Zotero !== 'undefined' && Zotero.Debug?.enabled) {
      return true;
    }
    
    // 检查用户偏好设置
    if (typeof Zotero !== 'undefined' && Zotero.Prefs) {
      return Zotero.Prefs.get('z2r.debug.enabled') === true;
    }
    
    return false;
  }
  
  /**
   * 设置开发模式
   */
  private setupDevelopmentMode(): void {
    // 开发模式下的特殊设置
    if (this.isDevelopment) {
      console.log(`${this.prefix} Development mode enabled - verbose logging active`);
      
      // 添加性能监控
      if (typeof performance !== 'undefined' && performance.mark) {
        performance.mark('z2r-logger-init');
      }
    }
  }

  /**
   * 检查是否应该记录该级别的日志
   */
  private shouldLog(level: LogLevel): boolean {
    return this.levelPriority[level] >= this.levelPriority[this.level];
  }

  /**
   * 格式化日志消息
   */
  private formatMessage(level: LogLevel, args: any[]): string {
    const timestamp = new Date().toISOString();
    const levelStr = `[${level.toUpperCase()}]`;
    
    // 处理参数
    let message = args.map(arg => {
      if (typeof arg === 'object') {
        if (arg instanceof Error) {
          return this.formatError(arg);
        }
        return JSON.stringify(this.sanitizeObject(arg), null, 2);
      }
      return String(arg);
    }).join(' ');
    
    // 脱敏处理
    if (this.sanitizeTokens) {
      message = this.sanitizeMessage(message);
    }
    
    // 限制长度
    if (message.length > this.maxMessageLength) {
      message = message.substring(0, this.maxMessageLength) + '... [truncated]';
    }
    
    return `${this.prefix} ${timestamp} ${levelStr} ${message}`;
  }
  
  /**
   * 格式化错误对象
   */
  private formatError(error: Error): string {
    const parts = [`${error.name}: ${error.message}`];
    
    if (error.stack && this.level === 'debug') {
      parts.push(`\nStack: ${error.stack}`);
    }
    
    // 添加额外的错误属性
    const extraProps = Object.keys(error)
      .filter(key => !['name', 'message', 'stack'].includes(key))
      .reduce((acc, key) => {
        acc[key] = (error as any)[key];
        return acc;
      }, {} as Record<string, any>);
    
    if (Object.keys(extraProps).length > 0) {
      parts.push(`\nExtra: ${JSON.stringify(extraProps, null, 2)}`);
    }
    
    return parts.join('');
  }
  
  /**
   * 脱敏处理消息
   */
  private sanitizeMessage(message: string): string {
    let sanitized = message;
    
    for (const pattern of this.sensitivePatterns) {
      sanitized = sanitized.replace(pattern, (match) => {
        // 保留前缀，隐藏实际值
        if (match.includes(':') || match.includes('=')) {
          const [prefix] = match.split(/[:=]/);
          return `${prefix}: [REDACTED]`;
        }
        if (match.startsWith('Bearer')) {
          return 'Bearer [REDACTED]';
        }
        // 保留前后各3个字符
        if (match.length > 10) {
          return match.substring(0, 3) + '[...]' + match.substring(match.length - 3);
        }
        return '[REDACTED]';
      });
    }
    
    return sanitized;
  }
  
  /**
   * 脱敏处理对象
   */
  private sanitizeObject(obj: any): any {
    if (!this.sanitizeTokens) return obj;
    
    const sensitiveKeys = [
      'token', 'key', 'password', 'secret', 'apiKey', 'api_key',
      'authorization', 'auth', 'credential', 'private'
    ];
    
    const sanitize = (value: any): any => {
      if (value === null || value === undefined) return value;
      
      if (Array.isArray(value)) {
        return value.map(sanitize);
      }
      
      if (typeof value === 'object') {
        const result: any = {};
        for (const [key, val] of Object.entries(value)) {
          const lowerKey = key.toLowerCase();
          if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
            result[key] = '[REDACTED]';
          } else {
            result[key] = sanitize(val);
          }
        }
        return result;
      }
      
      if (typeof value === 'string' && value.length > 20) {
        // 检查是否看起来像敏感信息
        if (/^[A-Za-z0-9+/]{20,}={0,2}$/.test(value)) {
          return '[REDACTED]';
        }
      }
      
      return value;
    };
    
    return sanitize(obj);
  }

  /**
   * 输出到 Zotero 调试控制台
   */
  private logToZotero(message: string): void {
    if (this.enableZoteroDebug && typeof Zotero !== 'undefined' && Zotero.debug) {
      Zotero.debug(message);
    }
  }

  /**
   * 输出到控制台
   */
  private logToConsole(level: LogLevel, message: string, args: any[]): void {
    if (!this.enableConsole) return;

    // 开发模式下的增强输出
    if (this.isDevelopment) {
      const style = this.getConsoleStyle(level);
      console.log(`%c${message}`, style);
      
      // 输出原始参数以便调试
      if (args.length > 0 && level === 'debug') {
        console.group('Debug Details');
        args.forEach((arg, index) => {
          console.log(`Arg ${index}:`, arg);
        });
        console.groupEnd();
      }
    } else {
      switch (level) {
        case 'debug':
          console.log(message);
          break;
        case 'info':
          console.info(message);
          break;
        case 'warn':
          console.warn(message);
          break;
        case 'error':
          console.error(message);
          break;
      }
    }
  }
  
  /**
   * 获取控制台样式（开发模式）
   */
  private getConsoleStyle(level: LogLevel): string {
    const styles: Record<LogLevel, string> = {
      debug: 'color: #666; font-style: italic;',
      info: 'color: #2196F3; font-weight: normal;',
      warn: 'color: #FF9800; font-weight: bold;',
      error: 'color: #F44336; font-weight: bold; font-size: 1.1em;'
    };
    return styles[level];
  }
  
  /**
   * 写入文件日志
   */
  private async writeToFile(level: LogLevel, message: string, metadata?: Record<string, any>): Promise<void> {
    if (!this.enableFileLogging || !this.fileLogger) return;
    
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata,
      source: this.prefix
    };
    
    try {
      await this.fileLogger.writeLog(entry);
    } catch (error) {
      console.error('Failed to write to file log:', error);
    }
  }

  /**
   * 记录调试信息
   */
  debug(...args: any[]): void {
    if (!this.shouldLog('debug')) return;
    
    const message = this.formatMessage('debug', args);
    this.logToZotero(message);
    this.logToConsole('debug', message, args);
    this.writeToFile('debug', message).catch(console.error);
    
    // 开发模式下的额外调试信息
    if (this.isDevelopment && typeof console.trace === 'function') {
      console.trace('Debug trace');
    }
  }

  /**
   * 记录一般信息
   */
  info(...args: any[]): void {
    if (!this.shouldLog('info')) return;
    
    const message = this.formatMessage('info', args);
    this.logToZotero(message);
    this.logToConsole('info', message, args);
    this.writeToFile('info', message).catch(console.error);
  }

  /**
   * 记录警告信息
   */
  warn(...args: any[]): void {
    if (!this.shouldLog('warn')) return;
    
    const message = this.formatMessage('warn', args);
    this.logToZotero(message);
    this.logToConsole('warn', message, args);
    this.writeToFile('warn', message).catch(console.error);
  }

  /**
   * 记录错误信息
   */
  error(...args: any[]): void {
    if (!this.shouldLog('error')) return;
    
    const message = this.formatMessage('error', args);
    this.logToZotero(message);
    this.logToConsole('error', message, args);
    
    // 错误信息总是写入文件
    const errorMetadata = args.find(arg => arg instanceof Error) ? 
      { stack: (args.find(arg => arg instanceof Error) as Error).stack } : 
      undefined;
    this.writeToFile('error', message, errorMetadata).catch(console.error);
  }

  /**
   * 创建子日志记录器
   */
  createChild(childPrefix: string): Logger {
    return new Logger({
      prefix: `${this.prefix}[${childPrefix}]`,
      level: this.level,
      enableConsole: this.enableConsole,
      enableZoteroDebug: this.enableZoteroDebug,
      sanitizeTokens: this.sanitizeTokens,
      maxMessageLength: this.maxMessageLength,
      enableFileLogging: this.enableFileLogging,
      isDevelopment: this.isDevelopment,
      fileLogger: this.fileLogger
    });
  }
  
  /**
   * 记录性能测量
   */
  time(label: string): void {
    if (typeof console.time === 'function') {
      console.time(`${this.prefix} ${label}`);
    }
  }
  
  timeEnd(label: string): void {
    if (typeof console.timeEnd === 'function') {
      console.timeEnd(`${this.prefix} ${label}`);
    }
  }
  
  /**
   * 记录结构化日志
   */
  logStructured(level: LogLevel, message: string, metadata?: Record<string, any>): void {
    if (!this.shouldLog(level)) return;
    
    const structuredLog = {
      timestamp: new Date().toISOString(),
      level,
      prefix: this.prefix,
      message,
      ...this.sanitizeObject(metadata || {})
    };
    
    const formattedMessage = this.formatMessage(level, [message, metadata]);
    this.logToZotero(formattedMessage);
    
    // 对于结构化日志，在控制台中使用 console.table 或 console.dir
    if (this.enableConsole && metadata && Object.keys(metadata).length > 0) {
      console.group(`${this.prefix} ${message}`);
      console.table(this.sanitizeObject(metadata));
      console.groupEnd();
    } else {
      this.logToConsole(level, formattedMessage, []);
    }
    
    // 写入文件日志
    this.writeToFile(level, message, metadata).catch(console.error);
  }

  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel): void {
    (this as any).level = level;
  }
}

// 创建默认的全局日志记录器
export const defaultLogger = new Logger();

// 保持向后兼容性
export class Z2RLogger {
  static debug(...args: any[]) {
    defaultLogger.debug(...args);
  }

  static info(...args: any[]) {
    defaultLogger.info(...args);
  }

  static warn(...args: any[]) {
    defaultLogger.warn(...args);
  }

  static error(...args: any[]) {
    defaultLogger.error(...args);
  }

  static log(...args: any[]) {
    defaultLogger.info(...args);
  }
}

// Export a default instance for convenience
export const log = Z2RLogger;

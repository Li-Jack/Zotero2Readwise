/**
 * File Logger Module
 * 提供文件日志记录、日志轮转和导出功能
 */

import { LogLevel } from './logger';

export interface FileLoggerConfig {
  logDir?: string;
  maxFileSize?: number; // 最大文件大小（字节）
  maxFiles?: number; // 最大文件数量
  enableRotation?: boolean; // 是否启用日志轮转
  filePrefix?: string; // 日志文件前缀
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  metadata?: Record<string, any>;
  source?: string;
}

export class FileLogger {
  private config: Required<FileLoggerConfig>;
  private currentLogFile: string | null = null;
  private logBuffer: LogEntry[] = [];
  private flushTimer: number | null = null;
  private readonly FLUSH_INTERVAL = 1000; // 1秒刷新一次
  private readonly BUFFER_SIZE = 100; // 缓冲区大小

  constructor(config: FileLoggerConfig = {}) {
    this.config = {
      logDir: this.getDefaultLogDir(),
      maxFileSize: 10 * 1024 * 1024, // 默认10MB
      maxFiles: 5, // 默认保留5个文件
      enableRotation: true,
      filePrefix: 'z2r'
    };
    
    Object.assign(this.config, config);
    this.ensureLogDirectory();
    this.currentLogFile = this.getCurrentLogFileName();
    this.setupFlushTimer();
  }

  /**
   * 获取默认日志目录
   */
  private getDefaultLogDir(): string {
    if (typeof Zotero !== 'undefined' && Zotero.DataDirectory) {
      return OS.Path.join(Zotero.DataDirectory.dir, 'logs', 'z2r');
    }
    // 开发环境使用临时目录
    return OS.Path.join(OS.Constants.Path.tmpDir, 'z2r-logs');
  }

  /**
   * 确保日志目录存在
   */
  private async ensureLogDirectory(): Promise<void> {
    try {
      await OS.File.makeDir(this.config.logDir, { 
        ignoreExisting: true,
        from: OS.Constants.Path.profileDir 
      });
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  /**
   * 获取当前日志文件名
   */
  private getCurrentLogFileName(): string {
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return `${this.config.filePrefix}_${timestamp}.log`;
  }

  /**
   * 获取日志文件完整路径
   */
  private getLogFilePath(fileName: string): string {
    return OS.Path.join(this.config.logDir, fileName);
  }

  /**
   * 设置刷新定时器
   */
  private setupFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.FLUSH_INTERVAL) as unknown as number;
  }

  /**
   * 写入日志条目
   */
  async writeLog(entry: LogEntry): Promise<void> {
    this.logBuffer.push(entry);
    
    if (this.logBuffer.length >= this.BUFFER_SIZE) {
      await this.flush();
    }
  }

  /**
   * 刷新日志缓冲区到文件
   */
  private async flush(): Promise<void> {
    if (this.logBuffer.length === 0) return;
    
    const entries = [...this.logBuffer];
    this.logBuffer = [];
    
    try {
      const filePath = this.getLogFilePath(this.currentLogFile!);
      
      // 检查是否需要轮转
      if (this.config.enableRotation) {
        await this.checkAndRotate(filePath);
      }
      
      // 格式化日志条目
      const logLines = entries.map(entry => this.formatLogEntry(entry));
      const content = logLines.join('\n') + '\n';
      
      // 追加到文件
      await this.appendToFile(filePath, content);
    } catch (error) {
      console.error('Failed to flush logs:', error);
      // 恢复缓冲区
      this.logBuffer = entries.concat(this.logBuffer);
    }
  }

  /**
   * 格式化日志条目
   */
  private formatLogEntry(entry: LogEntry): string {
    const parts = [
      entry.timestamp,
      `[${entry.level.toUpperCase()}]`,
      entry.source || 'Z2R',
      entry.message
    ];
    
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      parts.push(JSON.stringify(entry.metadata));
    }
    
    return parts.join(' | ');
  }

  /**
   * 追加内容到文件
   */
  private async appendToFile(filePath: string, content: string): Promise<void> {
    try {
      // 使用 OS.File API (Zotero环境)
      const encoder = new TextEncoder();
      const array = encoder.encode(content);
      
      await OS.File.writeAtomic(
        filePath, 
        array,
        { 
          tmpPath: filePath + '.tmp',
          mode: { append: true }
        }
      );
    } catch (error) {
      // 降级到基础文件API
      console.error('OS.File write failed, falling back:', error);
    }
  }

  /**
   * 检查并执行日志轮转
   */
  private async checkAndRotate(filePath: string): Promise<void> {
    try {
      const fileInfo = await OS.File.stat(filePath);
      
      if (fileInfo.size >= this.config.maxFileSize) {
        await this.rotateLogFiles();
        this.currentLogFile = this.getCurrentLogFileName();
      }
    } catch (error) {
      // 文件不存在，无需轮转
      if (error.becauseNoSuchFile) {
        return;
      }
      console.error('Failed to check file size:', error);
    }
  }

  /**
   * 执行日志文件轮转
   */
  private async rotateLogFiles(): Promise<void> {
    const logFiles = await this.getLogFiles();
    
    // 按修改时间排序（最新的在前）
    logFiles.sort((a, b) => b.lastModified - a.lastModified);
    
    // 删除超过最大数量的旧文件
    if (logFiles.length >= this.config.maxFiles) {
      const filesToDelete = logFiles.slice(this.config.maxFiles - 1);
      
      for (const file of filesToDelete) {
        try {
          await OS.File.remove(file.path);
        } catch (error) {
          console.error('Failed to delete old log file:', error);
        }
      }
    }
    
    // 重命名当前文件
    if (this.currentLogFile) {
      const currentPath = this.getLogFilePath(this.currentLogFile);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rotatedName = `${this.config.filePrefix}_${timestamp}_rotated.log`;
      const rotatedPath = this.getLogFilePath(rotatedName);
      
      try {
        await OS.File.move(currentPath, rotatedPath);
      } catch (error) {
        console.error('Failed to rotate current log file:', error);
      }
    }
  }

  /**
   * 获取所有日志文件
   */
  private async getLogFiles(): Promise<Array<{path: string, lastModified: number}>> {
    const files: Array<{path: string, lastModified: number}> = [];
    
    try {
      const iterator = new OS.File.DirectoryIterator(this.config.logDir);
      let entry;
      
      while (true) {
        try {
          entry = await iterator.next();
        } catch (ex) {
          if (ex === StopIteration) {
            break;
          }
          throw ex;
        }
        
        if (entry.name.startsWith(this.config.filePrefix) && entry.name.endsWith('.log')) {
          const fileInfo = await OS.File.stat(entry.path);
          files.push({
            path: entry.path,
            lastModified: fileInfo.lastModificationDate.getTime()
          });
        }
      }
      
      iterator.close();
    } catch (error) {
      console.error('Failed to list log files:', error);
    }
    
    return files;
  }

  /**
   * 导出日志为压缩包
   */
  async exportLogs(): Promise<Blob | null> {
    try {
      const logFiles = await this.getLogFiles();
      const zipWriter = new Zotero.ZipWriter();
      
      for (const file of logFiles) {
        const content = await OS.File.read(file.path);
        const fileName = OS.Path.basename(file.path);
        zipWriter.addFile(fileName, content);
      }
      
      // 添加系统信息
      const systemInfo = this.getSystemInfo();
      zipWriter.addFile('system-info.json', JSON.stringify(systemInfo, null, 2));
      
      // 添加配置信息
      const configInfo = await this.getConfigInfo();
      zipWriter.addFile('config-info.json', JSON.stringify(configInfo, null, 2));
      
      return zipWriter.generate();
    } catch (error) {
      console.error('Failed to export logs:', error);
      return null;
    }
  }

  /**
   * 获取系统信息
   */
  private getSystemInfo(): Record<string, any> {
    const info: Record<string, any> = {
      timestamp: new Date().toISOString(),
      platform: Zotero.platform,
      version: Zotero.version,
      locale: Zotero.locale,
      debug: Zotero.Debug.enabled
    };
    
    if (typeof navigator !== 'undefined') {
      info.userAgent = navigator.userAgent;
    }
    
    return info;
  }

  /**
   * 获取配置信息
   */
  private async getConfigInfo(): Promise<Record<string, any>> {
    const prefs = {
      syncEnabled: Zotero.Prefs.get('z2r.sync.enabled'),
      syncInterval: Zotero.Prefs.get('z2r.sync.interval'),
      apiEndpoint: Zotero.Prefs.get('z2r.api.endpoint'),
      debugMode: Zotero.Prefs.get('z2r.debug.enabled'),
      logLevel: Zotero.Prefs.get('z2r.log.level')
    };
    
    // 脱敏处理
    const sanitized = { ...prefs };
    const token = Zotero.Prefs.get('z2r.api.token');
    if (token) {
      sanitized.hasToken = true;
      sanitized.tokenLength = token.length;
    }
    
    return sanitized;
  }

  /**
   * 清理旧日志文件
   */
  async cleanOldLogs(daysToKeep: number = 7): Promise<void> {
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    const logFiles = await this.getLogFiles();
    
    for (const file of logFiles) {
      if (file.lastModified < cutoffTime) {
        try {
          await OS.File.remove(file.path);
        } catch (error) {
          console.error('Failed to delete old log file:', error);
        }
      }
    }
  }

  /**
   * 获取日志统计信息
   */
  async getLogStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    oldestLog: Date | null;
    newestLog: Date | null;
  }> {
    const logFiles = await this.getLogFiles();
    let totalSize = 0;
    let oldestTime: number | null = null;
    let newestTime: number | null = null;
    
    for (const file of logFiles) {
      try {
        const fileInfo = await OS.File.stat(file.path);
        totalSize += fileInfo.size;
        
        const modTime = fileInfo.lastModificationDate.getTime();
        if (!oldestTime || modTime < oldestTime) {
          oldestTime = modTime;
        }
        if (!newestTime || modTime > newestTime) {
          newestTime = modTime;
        }
      } catch (error) {
        console.error('Failed to get file stats:', error);
      }
    }
    
    return {
      totalFiles: logFiles.length,
      totalSize,
      oldestLog: oldestTime ? new Date(oldestTime) : null,
      newestLog: newestTime ? new Date(newestTime) : null
    };
  }

  /**
   * 销毁日志记录器
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    
    // 最后一次刷新
    this.flush().catch(console.error);
  }
}

// 创建默认文件日志记录器实例
export const fileLogger = new FileLogger();

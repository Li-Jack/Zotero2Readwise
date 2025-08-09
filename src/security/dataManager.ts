/**
 * Data Manager
 * 数据管理器：清除本地状态、登出操作和数据导出
 * 
 * Data Management Features:
 * - Clear local sync state
 * - Secure logout with data cleanup
 * - Export/import user data
 * - Backup and restore
 */

import { Logger } from '../utils/logger';
import { AuthManager } from './authManager';
import { PrivacyManager } from './privacyManager';
import { StateStore } from '../storage/stateStore';
import * as fs from 'fs';
import * as path from 'path';

export interface DataCleanupOptions {
  clearSyncState?: boolean;
  clearPreferences?: boolean;
  clearCache?: boolean;
  clearLogs?: boolean;
  clearToken?: boolean;
  keepBackup?: boolean;
}

export interface DataExportOptions {
  includeSyncState?: boolean;
  includePreferences?: boolean;
  includePrivacySettings?: boolean;
  anonymize?: boolean;
  format?: 'json' | 'csv';
}

export interface BackupInfo {
  id: string;
  timestamp: Date;
  version: string;
  items: {
    syncState: boolean;
    preferences: boolean;
    privacySettings: boolean;
  };
  size: number;
  path: string;
}

export class DataManager {
  private static instance: DataManager;
  private readonly logger: Logger;
  private readonly authManager: AuthManager;
  private readonly privacyManager: PrivacyManager;
  private readonly stateStore: StateStore;
  private readonly Zotero: any;
  private readonly backupDir: string;

  private constructor(stateStore: StateStore) {
    // @ts-ignore
    this.Zotero = window.Zotero || Zotero;
    
    this.logger = new Logger({
      prefix: '[Z2R:DataMgr]',
      sanitizeTokens: true
    });
    
    this.authManager = AuthManager.getInstance();
    this.privacyManager = PrivacyManager.getInstance();
    this.stateStore = stateStore;
    
    // Setup backup directory
    const dataDir = this.Zotero.DataDirectory.dir;
    this.backupDir = path.join(dataDir, 'z2r-plugin', 'backups');
    this.ensureBackupDir();
  }

  public static getInstance(stateStore: StateStore): DataManager {
    if (!DataManager.instance) {
      DataManager.instance = new DataManager(stateStore);
    }
    return DataManager.instance;
  }

  /**
   * 确保备份目录存在
   */
  private ensureBackupDir(): void {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * 清除本地状态
   */
  public async clearLocalState(options: DataCleanupOptions = {}): Promise<void> {
    this.logger.info('Starting local state cleanup', options);
    
    const {
      clearSyncState = true,
      clearPreferences = false,
      clearCache = true,
      clearLogs = false,
      clearToken = false,
      keepBackup = true
    } = options;
    
    try {
      // Create backup before clearing
      if (keepBackup) {
        await this.createBackup('pre-cleanup');
      }
      
      // Clear sync state
      if (clearSyncState) {
        await this.clearSyncState();
      }
      
      // Clear preferences
      if (clearPreferences) {
        await this.clearPreferences();
      }
      
      // Clear cache
      if (clearCache) {
        await this.clearCache();
      }
      
      // Clear logs
      if (clearLogs) {
        await this.clearLogs();
      }
      
      // Clear token (logout)
      if (clearToken) {
        await this.authManager.clearToken();
      }
      
      this.logger.info('Local state cleanup completed');
      
      // Log privacy event
      this.privacyManager.logPrivacyEvent('data_cleanup', {
        options: options,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      this.logger.error('Failed to clear local state:', error);
      throw error;
    }
  }

  /**
   * 登出操作
   */
  public async logout(options: { clearData?: boolean } = {}): Promise<void> {
    this.logger.info('Starting logout process');
    
    try {
      // Create backup before logout
      await this.createBackup('pre-logout');
      
      // Clear authentication
      await this.authManager.clearToken();
      
      // Optionally clear all data
      if (options.clearData) {
        await this.clearLocalState({
          clearSyncState: true,
          clearPreferences: false, // Keep user preferences
          clearCache: true,
          clearLogs: false,
          clearToken: true,
          keepBackup: true
        });
      }
      
      // Log privacy event
      this.privacyManager.logPrivacyEvent('user_logout', {
        clearData: options.clearData,
        timestamp: new Date().toISOString()
      });
      
      this.logger.info('Logout completed successfully');
      
      // Show confirmation to user
      this.showNotification('Logged out successfully', 'info');
      
    } catch (error) {
      this.logger.error('Logout failed:', error);
      this.showNotification('Logout failed', 'error');
      throw error;
    }
  }

  /**
   * 清除同步状态
   */
  private async clearSyncState(): Promise<void> {
    this.logger.debug('Clearing sync state');
    await this.stateStore.clearSyncState();
  }

  /**
   * 清除偏好设置
   */
  private async clearPreferences(): Promise<void> {
    this.logger.debug('Clearing preferences');
    // Reset to defaults rather than completely removing
    await this.stateStore.resetPreferences();
  }

  /**
   * 清除缓存
   */
  private async clearCache(): Promise<void> {
    this.logger.debug('Clearing cache');
    
    const cacheDir = path.join(this.Zotero.DataDirectory.dir, 'z2r-plugin', 'cache');
    if (fs.existsSync(cacheDir)) {
      // Remove cache directory
      fs.rmSync(cacheDir, { recursive: true, force: true });
      // Recreate empty cache directory
      fs.mkdirSync(cacheDir, { recursive: true });
    }
  }

  /**
   * 清除日志
   */
  private async clearLogs(): Promise<void> {
    this.logger.debug('Clearing logs');
    
    const logsDir = path.join(this.Zotero.DataDirectory.dir, 'z2r-plugin', 'logs');
    if (fs.existsSync(logsDir)) {
      // Remove logs directory
      fs.rmSync(logsDir, { recursive: true, force: true });
      // Recreate empty logs directory
      fs.mkdirSync(logsDir, { recursive: true });
    }
  }

  /**
   * 导出用户数据
   */
  public async exportData(options: DataExportOptions = {}): Promise<string> {
    this.logger.info('Exporting user data', options);
    
    const {
      includeSyncState = true,
      includePreferences = true,
      includePrivacySettings = true,
      anonymize = false,
      format = 'json'
    } = options;
    
    try {
      const exportData: any = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        plugin: {
          name: 'Zotero-Readwise Sync',
          version: this.Zotero.Z2R?.version || '1.0.0'
        }
      };
      
      // Add sync state
      if (includeSyncState) {
        const syncState = await this.stateStore.exportSyncState();
        exportData.syncState = anonymize ? 
          this.privacyManager.anonymizeData(syncState) : syncState;
      }
      
      // Add preferences
      if (includePreferences) {
        const preferences = await this.stateStore.getPreferences();
        // Never export token
        const safePrefs = { ...preferences, apiToken: '[REDACTED]' };
        exportData.preferences = anonymize ? 
          this.privacyManager.anonymizeData(safePrefs) : safePrefs;
      }
      
      // Add privacy settings
      if (includePrivacySettings) {
        exportData.privacySettings = this.privacyManager.getSettings();
      }
      
      // Format data
      let exportString: string;
      if (format === 'csv') {
        // Convert to CSV (simplified format)
        exportString = this.convertToCSV(exportData);
      } else {
        exportString = JSON.stringify(exportData, null, 2);
      }
      
      // Save to file
      const filename = `z2r-export-${Date.now()}.${format}`;
      const exportPath = path.join(this.Zotero.DataDirectory.dir, 'z2r-plugin', 'exports', filename);
      
      // Ensure export directory exists
      const exportDir = path.dirname(exportPath);
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }
      
      fs.writeFileSync(exportPath, exportString, 'utf-8');
      
      this.logger.info(`Data exported to: ${exportPath}`);
      
      // Log privacy event
      this.privacyManager.logPrivacyEvent('data_export', {
        options: options,
        path: exportPath,
        size: exportString.length
      });
      
      return exportPath;
      
    } catch (error) {
      this.logger.error('Failed to export data:', error);
      throw error;
    }
  }

  /**
   * 导入用户数据
   */
  public async importData(filePath: string, options: { merge?: boolean } = {}): Promise<void> {
    this.logger.info('Importing user data', { path: filePath, options });
    
    try {
      // Create backup before import
      await this.createBackup('pre-import');
      
      // Read and parse import file
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const importData = JSON.parse(fileContent);
      
      // Validate import data
      if (!importData.version || !importData.exportDate) {
        throw new Error('Invalid import file format');
      }
      
      // Import sync state
      if (importData.syncState) {
        if (options.merge) {
          await this.stateStore.mergeSyncState(importData.syncState);
        } else {
          await this.stateStore.importSyncState(importData.syncState);
        }
      }
      
      // Import preferences (except token)
      if (importData.preferences) {
        const { apiToken, ...safePrefs } = importData.preferences;
        await this.stateStore.updatePreferences(safePrefs);
      }
      
      // Import privacy settings
      if (importData.privacySettings) {
        this.privacyManager.updateSettings(importData.privacySettings);
      }
      
      this.logger.info('Data import completed successfully');
      
      // Log privacy event
      this.privacyManager.logPrivacyEvent('data_import', {
        source: filePath,
        merge: options.merge
      });
      
    } catch (error) {
      this.logger.error('Failed to import data:', error);
      
      // Attempt to restore from backup
      await this.restoreLatestBackup();
      
      throw error;
    }
  }

  /**
   * 创建备份
   */
  public async createBackup(label: string = 'manual'): Promise<BackupInfo> {
    this.logger.debug(`Creating backup: ${label}`);
    
    const backupId = `${label}-${Date.now()}`;
    const backupPath = path.join(this.backupDir, `${backupId}.json`);
    
    try {
      const backupData = {
        id: backupId,
        timestamp: new Date().toISOString(),
        version: this.Zotero.Z2R?.version || '1.0.0',
        label: label,
        syncState: await this.stateStore.exportSyncState(),
        preferences: await this.stateStore.getPreferences(),
        privacySettings: this.privacyManager.getSettings()
      };
      
      // Never backup token
      backupData.preferences.apiToken = '';
      
      const backupString = JSON.stringify(backupData, null, 2);
      fs.writeFileSync(backupPath, backupString, 'utf-8');
      
      const stats = fs.statSync(backupPath);
      
      const backupInfo: BackupInfo = {
        id: backupId,
        timestamp: new Date(),
        version: backupData.version,
        items: {
          syncState: true,
          preferences: true,
          privacySettings: true
        },
        size: stats.size,
        path: backupPath
      };
      
      this.logger.info(`Backup created: ${backupId}`);
      
      // Clean old backups (keep last 10)
      await this.cleanOldBackups(10);
      
      return backupInfo;
      
    } catch (error) {
      this.logger.error('Failed to create backup:', error);
      throw error;
    }
  }

  /**
   * 恢复最新备份
   */
  public async restoreLatestBackup(): Promise<void> {
    const backups = await this.listBackups();
    
    if (backups.length === 0) {
      throw new Error('No backups available');
    }
    
    const latest = backups[0]; // Already sorted by date
    await this.restoreBackup(latest.id);
  }

  /**
   * 恢复指定备份
   */
  public async restoreBackup(backupId: string): Promise<void> {
    this.logger.info(`Restoring backup: ${backupId}`);
    
    const backupPath = path.join(this.backupDir, `${backupId}.json`);
    
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup not found: ${backupId}`);
    }
    
    try {
      const backupContent = fs.readFileSync(backupPath, 'utf-8');
      const backupData = JSON.parse(backupContent);
      
      // Restore sync state
      if (backupData.syncState) {
        await this.stateStore.importSyncState(backupData.syncState);
      }
      
      // Restore preferences (except token)
      if (backupData.preferences) {
        const { apiToken, ...safePrefs } = backupData.preferences;
        await this.stateStore.updatePreferences(safePrefs);
      }
      
      // Restore privacy settings
      if (backupData.privacySettings) {
        this.privacyManager.updateSettings(backupData.privacySettings);
      }
      
      this.logger.info('Backup restored successfully');
      
    } catch (error) {
      this.logger.error('Failed to restore backup:', error);
      throw error;
    }
  }

  /**
   * 列出所有备份
   */
  public async listBackups(): Promise<BackupInfo[]> {
    const backups: BackupInfo[] = [];
    
    if (!fs.existsSync(this.backupDir)) {
      return backups;
    }
    
    const files = fs.readdirSync(this.backupDir);
    
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      
      try {
        const filePath = path.join(this.backupDir, file);
        const stats = fs.statSync(filePath);
        const content = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content);
        
        backups.push({
          id: data.id || file.replace('.json', ''),
          timestamp: new Date(data.timestamp),
          version: data.version,
          items: {
            syncState: !!data.syncState,
            preferences: !!data.preferences,
            privacySettings: !!data.privacySettings
          },
          size: stats.size,
          path: filePath
        });
      } catch (error) {
        this.logger.warn(`Failed to read backup ${file}:`, error);
      }
    }
    
    // Sort by timestamp (newest first)
    backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return backups;
  }

  /**
   * 清理旧备份
   */
  private async cleanOldBackups(keepCount: number): Promise<void> {
    const backups = await this.listBackups();
    
    if (backups.length <= keepCount) {
      return;
    }
    
    const toDelete = backups.slice(keepCount);
    
    for (const backup of toDelete) {
      try {
        fs.unlinkSync(backup.path);
        this.logger.debug(`Deleted old backup: ${backup.id}`);
      } catch (error) {
        this.logger.warn(`Failed to delete backup ${backup.id}:`, error);
      }
    }
  }

  /**
   * 转换为 CSV 格式
   */
  private convertToCSV(data: any): string {
    const lines: string[] = ['Type,Key,Value'];
    
    const flatten = (obj: any, prefix = ''): void => {
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        
        if (value === null || value === undefined) {
          lines.push(`data,"${fullKey}",""`);
        } else if (typeof value === 'object' && !Array.isArray(value)) {
          flatten(value, fullKey);
        } else if (Array.isArray(value)) {
          lines.push(`data,"${fullKey}","${JSON.stringify(value)}"`);
        } else {
          lines.push(`data,"${fullKey}","${value}"`);
        }
      }
    };
    
    flatten(data);
    return lines.join('\n');
  }

  /**
   * 显示通知
   */
  private showNotification(message: string, type: 'info' | 'error' | 'warning' = 'info'): void {
    if (this.Zotero.Notifier) {
      this.Zotero.Notifier.trigger(type, [], message);
    }
  }

  /**
   * 获取数据统计
   */
  public async getDataStatistics(): Promise<object> {
    const syncState = await this.stateStore.exportSyncState();
    const backups = await this.listBackups();
    
    const cacheDir = path.join(this.Zotero.DataDirectory.dir, 'z2r-plugin', 'cache');
    let cacheSize = 0;
    
    if (fs.existsSync(cacheDir)) {
      const files = fs.readdirSync(cacheDir);
      for (const file of files) {
        const stats = fs.statSync(path.join(cacheDir, file));
        cacheSize += stats.size;
      }
    }
    
    return {
      syncedItems: Object.keys(syncState.items || {}).length,
      syncedAnnotations: Object.keys(syncState.annotations || {}).length,
      backupCount: backups.length,
      totalBackupSize: backups.reduce((sum, b) => sum + b.size, 0),
      cacheSize: cacheSize,
      lastBackup: backups[0]?.timestamp || null
    };
  }
}

// Export singleton getter
export const getDataManager = (stateStore: StateStore) => DataManager.getInstance(stateStore);

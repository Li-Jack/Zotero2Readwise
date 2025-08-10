/**
 * State Store
 * 本地状态存储：增量同步与去重，偏好项管理
 * 支持按注释级别的细粒度状态追踪
 */

import { Logger } from '../../utils/logger';
import { hash, hashObject } from '../../utils/hash';

export class StateStore {
  private readonly logger: Logger;
  private readonly storageKey = 'zotero-readwise-sync';
  private readonly prefsKey = 'zotero-readwise-prefs';
  private readonly stateFileName = 'z2r-state.json';
  private readonly Zotero: any;
  private stateFilePath: string;
  private memoryCache: AnnotationSyncState | null = null;
  private isDirty: boolean = false;
  private saveTimer: NodeJS.Timeout | null = null;

  constructor(logger: Logger) {
    this.logger = logger;
    // @ts-ignore
    this.Zotero = window.Zotero || Zotero;
    
    // Initialize state file path
    this.stateFilePath = this.getStateFilePath();
    
    // Load initial state into memory
    this.loadStateToMemory();
  }

  /**
   * 获取状态文件路径
   */
  private getStateFilePath(): string {
    // Get Zotero data directory using OS.Path
    const dataDir = this.Zotero.DataDirectory.dir;
    const pluginDir = this.Zotero.File.pathToFile(
      OS.Path.join(dataDir, 'z2r-plugin')
    );
    
    // Ensure plugin directory exists
    if (!pluginDir.exists()) {
      pluginDir.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0o755);
    }
    
    return OS.Path.join(dataDir, 'z2r-plugin', this.stateFileName);
  }

  /**
   * 加载状态到内存
   */
  private loadStateToMemory(): void {
    try {
      const file = this.Zotero.File.pathToFile(this.stateFilePath);
      if (file.exists()) {
        const data = this.Zotero.File.getContents(file);
        this.memoryCache = JSON.parse(data);
        this.logger.debug('State loaded from file');
      } else {
        this.memoryCache = this.getDefaultAnnotationSyncState();
        this.logger.debug('Using default state (no existing state file)');
      }
    } catch (error) {
      this.logger.error('Failed to load state file, using default:', error);
      this.memoryCache = this.getDefaultAnnotationSyncState();
    }
  }

  /**
   * 原子写入状态文件
   */
  private async atomicWriteState(): Promise<void> {
    if (!this.memoryCache || !this.isDirty) {
      return;
    }

    const tempPath = `${this.stateFilePath}.tmp`;
    
    try {
      // Write to temp file
      const tempFile = this.Zotero.File.pathToFile(tempPath);
      const content = JSON.stringify(this.memoryCache, null, 2);
      await this.Zotero.File.putContentsAsync(tempFile, content);
      
      // Atomic rename
      const targetFile = this.Zotero.File.pathToFile(this.stateFilePath);
      tempFile.moveTo(targetFile.parent, targetFile.leafName);
      
      this.isDirty = false;
      this.logger.debug('State persisted to disk');
    } catch (error) {
      this.logger.error('Failed to write state file:', error);
      
      // Clean up temp file if it exists
      try {
        const tempFile = this.Zotero.File.pathToFile(tempPath);
        if (tempFile.exists()) {
          tempFile.remove(false);
        }
      } catch (e) {
        // Ignore cleanup errors
      }
      
      throw error;
    }
  }

  /**
   * 计算注释的指纹哈希
   */
  computeAnnotationHash(annotation: AnnotationHashInput): string {
    const fingerprint = {
      annotationKey: annotation.annotationKey,
      text: annotation.text || '',
      comment: annotation.comment || '',
      color: annotation.color || '',
      page: annotation.pageIndex,
      parentItemKey: annotation.parentItemKey
    };
    
    return hashObject(fingerprint);
  }

  /**
   * 获取注释同步状态
   */
  async getAnnotationSyncState(annotationKey: string): Promise<AnnotationSyncRecord | undefined> {
    if (!this.memoryCache) {
      this.loadStateToMemory();
    }
    
    return this.memoryCache?.annotations[annotationKey];
  }

  /**
   * 检查注释是否需要同步
   */
  async needsSync(annotation: AnnotationHashInput): Promise<SyncDecision> {
    const currentHash = this.computeAnnotationHash(annotation);
    const syncRecord = await this.getAnnotationSyncState(annotation.annotationKey);
    
    if (!syncRecord) {
      // Never synced before
      return {
        needsSync: true,
        action: 'create',
        currentHash
      };
    }
    
    if (syncRecord.hash !== currentHash) {
      // Content changed
      return {
        needsSync: true,
        action: 'update',
        currentHash,
        previousHash: syncRecord.hash,
        readwiseHighlightId: syncRecord.readwiseHighlightId
      };
    }
    
    // Already synced and unchanged
    return {
      needsSync: false,
      action: 'skip',
      currentHash,
      readwiseHighlightId: syncRecord.readwiseHighlightId
    };
  }

  /**
   * 标记注释为已同步
   */
  async markAnnotationSynced(
    annotationKey: string, 
    readwiseHighlightId: string, 
    annotationHash: string
  ): Promise<void> {
    if (!this.memoryCache) {
      this.loadStateToMemory();
    }
    
    this.memoryCache!.annotations[annotationKey] = {
      hash: annotationHash,
      readwiseHighlightId,
      lastSyncedAt: new Date().toISOString()
    };
    
    this.isDirty = true;
    await this.scheduleSave();
  }

  /**
   * 批量标记注释为已同步
   */
  async batchMarkAnnotationsSynced(
    records: Array<{
      annotationKey: string;
      readwiseHighlightId: string;
      hash: string;
    }>
  ): Promise<void> {
    if (!this.memoryCache) {
      this.loadStateToMemory();
    }
    
    const now = new Date().toISOString();
    
    for (const record of records) {
      this.memoryCache!.annotations[record.annotationKey] = {
        hash: record.hash,
        readwiseHighlightId: record.readwiseHighlightId,
        lastSyncedAt: now
      };
    }
    
    this.isDirty = true;
    await this.scheduleSave();
  }

  /**
   * 获取库的最后同步时间
   */
  async getLibraryLastSync(libraryId: string): Promise<Date | undefined> {
    if (!this.memoryCache) {
      this.loadStateToMemory();
    }
    
    const timestamp = this.memoryCache?.lastLibrarySyncAt[libraryId];
    return timestamp ? new Date(timestamp) : undefined;
  }

  /**
   * 设置库的最后同步时间
   */
  async setLibraryLastSync(libraryId: string, timestamp: Date): Promise<void> {
    if (!this.memoryCache) {
      this.loadStateToMemory();
    }
    
    this.memoryCache!.lastLibrarySyncAt[libraryId] = timestamp.toISOString();
    this.isDirty = true;
    await this.scheduleSave();
  }

  /**
   * 延迟保存（防抖）
   */
  private async scheduleSave(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    
    return new Promise((resolve) => {
      this.saveTimer = setTimeout(async () => {
        await this.atomicWriteState();
        resolve();
      }, 1000); // 1 second debounce
    });
  }

  /**
   * 立即保存
   */
  async flush(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    
    await this.atomicWriteState();
  }

  /**
   * 获取同步状态（向后兼容）
   */
  async getSyncState(): Promise<SyncState> {
    try {
      const state = this.Zotero.Prefs.get(this.storageKey);
      if (state) {
        return JSON.parse(state);
      }
    } catch (error) {
      this.logger.error('Failed to get sync state:', error);
    }

    return this.getDefaultSyncState();
  }

  /**
   * 保存同步状态
   */
  async setSyncState(state: SyncState): Promise<void> {
    try {
      this.Zotero.Prefs.set(this.storageKey, JSON.stringify(state));
    } catch (error) {
      this.logger.error('Failed to save sync state:', error);
      throw error;
    }
  }

  /**
   * 获取最后同步时间
   */
  async getLastSyncTime(): Promise<Date | undefined> {
    const state = await this.getSyncState();
    return state.lastSyncTime ? new Date(state.lastSyncTime) : undefined;
  }

  /**
   * 设置最后同步时间
   */
  async setLastSyncTime(time: Date): Promise<void> {
    const state = await this.getSyncState();
    state.lastSyncTime = time.toISOString();
    await this.setSyncState(state);
  }

  /**
   * 标记项目为已同步
   */
  async markAsSynced(sourceId: string, readwiseId: string, hash: string): Promise<void> {
    const state = await this.getSyncState();
    
    if (!state.syncedItems) {
      state.syncedItems = {};
    }

    state.syncedItems[sourceId] = {
      readwiseId,
      hash,
      lastSynced: new Date().toISOString()
    };

    await this.setSyncState(state);
  }

  /**
   * 获取项目的哈希值
   */
  async getItemHash(sourceId: string): Promise<string | undefined> {
    const state = await this.getSyncState();
    return state.syncedItems?.[sourceId]?.hash;
  }

  /**
   * 检查项目是否已同步
   */
  async isItemSynced(sourceId: string, currentHash: string): Promise<boolean> {
    const storedHash = await this.getItemHash(sourceId);
    return storedHash === currentHash;
  }

  /**
   * 获取已同步项目的 Readwise ID
   */
  async getReadwiseId(sourceId: string): Promise<string | undefined> {
    const state = await this.getSyncState();
    return state.syncedItems?.[sourceId]?.readwiseId;
  }

  /**
   * 清除同步状态
   */
  async clearSyncState(): Promise<void> {
    await this.setSyncState(this.getDefaultSyncState());
    this.logger.info('Sync state cleared');
  }

  /**
   * 清除注释同步状态
   */
  async clearAnnotationSyncState(): Promise<void> {
    this.memoryCache = this.getDefaultAnnotationSyncState();
    this.isDirty = true;
    await this.flush();
    this.logger.info('Annotation sync state cleared');
  }

  /**
   * 获取同步统计（增强版）
   */
  async getAnnotationSyncStats(): Promise<AnnotationSyncStats> {
    if (!this.memoryCache) {
      this.loadStateToMemory();
    }
    
    const annotationCount = Object.keys(this.memoryCache?.annotations || {}).length;
    const libraryCount = Object.keys(this.memoryCache?.lastLibrarySyncAt || {}).length;
    
    // Find oldest and newest sync times
    let oldestSync: Date | undefined;
    let newestSync: Date | undefined;
    
    for (const record of Object.values(this.memoryCache?.annotations || {})) {
      const syncTime = new Date(record.lastSyncedAt);
      if (!oldestSync || syncTime < oldestSync) {
        oldestSync = syncTime;
      }
      if (!newestSync || syncTime > newestSync) {
        newestSync = syncTime;
      }
    }
    
    return {
      totalAnnotationsSynced: annotationCount,
      totalLibrariesSynced: libraryCount,
      oldestSyncTime: oldestSync,
      newestSyncTime: newestSync,
      stateFileSize: (() => {
        try {
          const file = this.Zotero.File.pathToFile(this.stateFilePath);
          return file.exists() ? file.fileSize : 0;
        } catch (e) {
          return 0;
        }
      })()
    };
  }

  /**
   * 删除注释同步记录
   */
  async removeAnnotationSyncRecord(annotationKey: string): Promise<void> {
    if (!this.memoryCache) {
      this.loadStateToMemory();
    }
    
    if (this.memoryCache?.annotations[annotationKey]) {
      delete this.memoryCache.annotations[annotationKey];
      this.isDirty = true;
      await this.scheduleSave();
      this.logger.debug(`Removed sync record for annotation: ${annotationKey}`);
    }
  }

  /**
   * 批量删除注释同步记录
   */
  async batchRemoveAnnotationSyncRecords(annotationKeys: string[]): Promise<void> {
    if (!this.memoryCache) {
      this.loadStateToMemory();
    }
    
    let removed = 0;
    for (const key of annotationKeys) {
      if (this.memoryCache?.annotations[key]) {
        delete this.memoryCache.annotations[key];
        removed++;
      }
    }
    
    if (removed > 0) {
      this.isDirty = true;
      await this.scheduleSave();
      this.logger.debug(`Removed ${removed} sync records`);
    }
  }

  /**
   * 获取偏好设置
   */
  async getPreferences(): Promise<Preferences> {
    try {
      const prefs = this.Zotero.Prefs.get(this.prefsKey);
      if (prefs) {
        return JSON.parse(prefs);
      }
    } catch (error) {
      this.logger.error('Failed to get preferences:', error);
    }

    return this.getDefaultPreferences();
  }

  /**
   * 保存偏好设置
   */
  async setPreferences(prefs: Preferences): Promise<void> {
    try {
      this.Zotero.Prefs.set(this.prefsKey, JSON.stringify(prefs));
      this.logger.info('Preferences saved');
    } catch (error) {
      this.logger.error('Failed to save preferences:', error);
      throw error;
    }
  }

  /**
   * 更新单个偏好设置
   */
  async updatePreference<K extends keyof Preferences>(
    key: K, 
    value: Preferences[K]
  ): Promise<void> {
    const prefs = await this.getPreferences();
    prefs[key] = value;
    await this.setPreferences(prefs);
  }

  /**
   * 获取 API Token
   */
  async getApiToken(): Promise<string | undefined> {
    const prefs = await this.getPreferences();
    return prefs.apiToken;
  }

  /**
   * 设置 API Token
   */
  async setApiToken(token: string): Promise<void> {
    await this.updatePreference('apiToken', token);
  }

  /**
   * 获取同步统计
   */
  async getSyncStats(): Promise<SyncStats> {
    const state = await this.getSyncState();
    const itemCount = Object.keys(state.syncedItems || {}).length;
    
    return {
      totalItemsSynced: itemCount,
      lastSyncTime: state.lastSyncTime ? new Date(state.lastSyncTime) : undefined,
      firstSyncTime: state.firstSyncTime ? new Date(state.firstSyncTime) : undefined,
      syncCount: state.syncCount || 0
    };
  }

  /**
   * 增加同步计数
   */
  async incrementSyncCount(): Promise<void> {
    const state = await this.getSyncState();
    state.syncCount = (state.syncCount || 0) + 1;
    
    if (!state.firstSyncTime) {
      state.firstSyncTime = new Date().toISOString();
    }
    
    await this.setSyncState(state);
  }

  /**
   * 获取默认注释同步状态
   */
  private getDefaultAnnotationSyncState(): AnnotationSyncState {
    return {
      version: '1.0',
      annotations: {},
      lastLibrarySyncAt: {},
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };
  }

  /**
   * 获取默认同步状态
   */
  private getDefaultSyncState(): SyncState {
    return {
      lastSyncTime: undefined,
      firstSyncTime: undefined,
      syncedItems: {},
      syncCount: 0
    };
  }

  /**
   * 获取默认偏好设置
   */
  private getDefaultPreferences(): Preferences {
    return {
      apiToken: '',
      syncOnStartup: false,
      syncInterval: 0, // 0 means manual only
      batchSize: 50,
      includeNotes: true,
      includeHighlights: true,
      includeImages: false,
      syncScope: 'all',
      selectedCollections: [],
      selectedTags: [],
      autoSync: false,
      showNotifications: true,
      debugMode: false
    };
  }

  /**
   * 导出同步数据（用于备份）
   */
  async exportData(): Promise<ExportData> {
    const state = await this.getSyncState();
    const prefs = await this.getPreferences();
    
    return {
      version: '1.0',
      exportDate: new Date().toISOString(),
      syncState: state,
      preferences: {
        ...prefs,
        apiToken: '***' // 不导出 API token
      }
    };
  }

  /**
   * 导入同步数据（从备份恢复）
   */
  async importData(data: ExportData): Promise<void> {
    if (data.version !== '1.0') {
      throw new Error(`Unsupported export version: ${data.version}`);
    }

    await this.setSyncState(data.syncState);
    
    // 不覆盖 API token
    const currentPrefs = await this.getPreferences();
    await this.setPreferences({
      ...data.preferences,
      apiToken: currentPrefs.apiToken
    });

    this.logger.info('Data imported successfully');
  }
}

// Types

/**
 * 注释同步状态（新的细粒度状态）
 */
export interface AnnotationSyncState {
  version: string;
  annotations: Record<string, AnnotationSyncRecord>;
  lastLibrarySyncAt: Record<string, string>; // libraryId -> ISO timestamp
  createdAt: string;
  lastModified: string;
}

/**
 * 单个注释的同步记录
 */
export interface AnnotationSyncRecord {
  hash: string;
  readwiseHighlightId: string;
  lastSyncedAt: string;
}

/**
 * 注释哈希计算输入
 */
export interface AnnotationHashInput {
  annotationKey: string;
  text?: string;
  comment?: string;
  color?: string;
  pageIndex: number;
  parentItemKey: string;
}

/**
 * 同步决策结果
 */
export interface SyncDecision {
  needsSync: boolean;
  action: 'create' | 'update' | 'skip';
  currentHash: string;
  previousHash?: string;
  readwiseHighlightId?: string;
}

/**
 * 注释同步统计
 */
export interface AnnotationSyncStats {
  totalAnnotationsSynced: number;
  totalLibrariesSynced: number;
  oldestSyncTime?: Date;
  newestSyncTime?: Date;
  stateFileSize: number;
}

/**
 * 旧版同步状态（向后兼容）
 */
export interface SyncState {
  lastSyncTime?: string;
  firstSyncTime?: string;
  syncedItems?: Record<string, SyncedItem>;
  syncCount?: number;
}

export interface SyncedItem {
  readwiseId: string;
  hash: string;
  lastSynced: string;
}

export interface Preferences {
  apiToken: string;
  syncOnStartup: boolean;
  syncInterval: number; // minutes, 0 = manual only
  batchSize: number;
  includeNotes: boolean;
  includeHighlights: boolean;
  includeImages: boolean;
  syncScope: 'all' | 'collection' | 'tag';
  selectedCollections: string[];
  selectedTags: string[];
  autoSync: boolean;
  showNotifications: boolean;
  debugMode: boolean;
}

export interface SyncStats {
  totalItemsSynced: number;
  lastSyncTime?: Date;
  firstSyncTime?: Date;
  syncCount: number;
}

export interface ExportData {
  version: string;
  exportDate: string;
  syncState: SyncState;
  preferences: Preferences;
}

/**
 * Annotation Preferences Module
 * 管理注释采集的用户偏好设置
 */

import { Logger } from '../../utils/logger';
import { AnnotationScanOptions } from './annotationCollector';

/**
 * 注释采集偏好设置
 */
export interface AnnotationPreferences {
  // 库选择偏好
  librarySettings: {
    includeMyLibrary: boolean;
    includeGroupLibraries: boolean;
    selectedGroupLibraries: number[];  // 选中的群组库ID
    excludedLibraries: number[];       // 排除的库ID
  };

  // 注释类型偏好
  annotationTypes: {
    includeHighlights: boolean;
    includeNotes: boolean;
    includeUnderlines: boolean;
    includeImages: boolean;  // 预留给未来版本
    includeInks: boolean;    // 预留给未来版本
  };

  // 同步选项
  syncOptions: {
    incrementalSync: boolean;          // 增量同步
    syncIntervalMinutes: number;        // 同步间隔（分钟）
    lastSyncTime?: Date;               // 上次同步时间
    syncOnStartup: boolean;            // 启动时同步
    syncOnModification: boolean;       // 修改时自动同步
  };

  // 过滤选项
  filterOptions: {
    excludeTrashed: boolean;           // 排除垃圾箱项目
    excludeCollections: string[];      // 排除的集合
    excludeTags: string[];             // 排除的标签
    onlyWithComments: boolean;         // 只同步有评论的注释
    minHighlightLength: number;        // 最小高亮长度
  };

  // 高级选项
  advancedOptions: {
    batchSize: number;                 // 批处理大小
    maxRetries: number;                // 最大重试次数
    timeoutSeconds: number;            // 超时时间（秒）
    debugMode: boolean;                // 调试模式
  };
}

/**
 * 默认偏好设置
 */
export const DEFAULT_ANNOTATION_PREFERENCES: AnnotationPreferences = {
  librarySettings: {
    includeMyLibrary: true,
    includeGroupLibraries: false,
    selectedGroupLibraries: [],
    excludedLibraries: []
  },
  annotationTypes: {
    includeHighlights: true,
    includeNotes: true,
    includeUnderlines: true,
    includeImages: false,
    includeInks: false
  },
  syncOptions: {
    incrementalSync: true,
    syncIntervalMinutes: 30,
    syncOnStartup: false,
    syncOnModification: true
  },
  filterOptions: {
    excludeTrashed: true,
    excludeCollections: [],
    excludeTags: [],
    onlyWithComments: false,
    minHighlightLength: 10
  },
  advancedOptions: {
    batchSize: 100,
    maxRetries: 3,
    timeoutSeconds: 30,
    debugMode: false
  }
};

/**
 * 注释偏好管理器
 */
export class AnnotationPreferencesManager {
  private readonly logger: Logger;
  private readonly Zotero: any;
  private preferences: AnnotationPreferences;
  private readonly PREF_KEY = 'z2r.annotation.preferences';

  constructor(logger: Logger) {
    this.logger = logger;
    // @ts-ignore - Zotero is a global in the plugin environment
    this.Zotero = window.Zotero || Zotero;
    this.preferences = this.loadPreferences();
  }

  /**
   * 加载偏好设置
   */
  private loadPreferences(): AnnotationPreferences {
    try {
      const savedPrefs = this.Zotero.Prefs.get(this.PREF_KEY);
      if (savedPrefs) {
        const parsed = JSON.parse(savedPrefs);
        // 合并默认值和保存的值，确保新字段有默认值
        return this.mergeWithDefaults(parsed);
      }
    } catch (error) {
      this.logger.error('Failed to load annotation preferences:', error);
    }
    return { ...DEFAULT_ANNOTATION_PREFERENCES };
  }

  /**
   * 合并默认值和保存的偏好
   */
  private mergeWithDefaults(saved: Partial<AnnotationPreferences>): AnnotationPreferences {
    const merged: AnnotationPreferences = JSON.parse(JSON.stringify(DEFAULT_ANNOTATION_PREFERENCES));
    
    // 深度合并
    if (saved.librarySettings) {
      Object.assign(merged.librarySettings, saved.librarySettings);
    }
    if (saved.annotationTypes) {
      Object.assign(merged.annotationTypes, saved.annotationTypes);
    }
    if (saved.syncOptions) {
      Object.assign(merged.syncOptions, saved.syncOptions);
      if (saved.syncOptions.lastSyncTime) {
        merged.syncOptions.lastSyncTime = new Date(saved.syncOptions.lastSyncTime);
      }
    }
    if (saved.filterOptions) {
      Object.assign(merged.filterOptions, saved.filterOptions);
    }
    if (saved.advancedOptions) {
      Object.assign(merged.advancedOptions, saved.advancedOptions);
    }

    return merged;
  }

  /**
   * 保存偏好设置
   */
  savePreferences(preferences: Partial<AnnotationPreferences>): void {
    try {
      this.preferences = this.mergeWithDefaults(preferences);
      this.Zotero.Prefs.set(this.PREF_KEY, JSON.stringify(this.preferences));
      this.logger.info('Annotation preferences saved');
    } catch (error) {
      this.logger.error('Failed to save annotation preferences:', error);
      throw error;
    }
  }

  /**
   * 获取当前偏好设置
   */
  getPreferences(): AnnotationPreferences {
    return { ...this.preferences };
  }

  /**
   * 更新偏好设置的特定部分
   */
  updatePreferences(path: string, value: any): void {
    const keys = path.split('.');
    let current: any = this.preferences;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    this.savePreferences(this.preferences);
  }

  /**
   * 将偏好设置转换为扫描选项
   */
  toScanOptions(): AnnotationScanOptions {
    const prefs = this.preferences;
    const annotationTypes: any[] = [];

    if (prefs.annotationTypes.includeHighlights) {
      annotationTypes.push('highlight');
    }
    if (prefs.annotationTypes.includeNotes) {
      annotationTypes.push('note');
    }
    if (prefs.annotationTypes.includeUnderlines) {
      annotationTypes.push('underline');
    }
    if (prefs.annotationTypes.includeImages) {
      annotationTypes.push('image');
    }
    if (prefs.annotationTypes.includeInks) {
      annotationTypes.push('ink');
    }

    return {
      includeMyLibrary: prefs.librarySettings.includeMyLibrary,
      includeGroupLibraries: prefs.librarySettings.includeGroupLibraries,
      specificLibraryIDs: prefs.librarySettings.selectedGroupLibraries,
      modifiedAfter: prefs.syncOptions.incrementalSync && prefs.syncOptions.lastSyncTime
        ? prefs.syncOptions.lastSyncTime
        : undefined,
      annotationTypes: annotationTypes,
      excludeTrashed: prefs.filterOptions.excludeTrashed,
      includeItemsWithoutAnnotations: false
    };
  }

  /**
   * 更新最后同步时间
   */
  updateLastSyncTime(): void {
    this.updatePreferences('syncOptions.lastSyncTime', new Date());
  }

  /**
   * 重置为默认设置
   */
  resetToDefaults(): void {
    this.preferences = { ...DEFAULT_ANNOTATION_PREFERENCES };
    this.savePreferences(this.preferences);
    this.logger.info('Annotation preferences reset to defaults');
  }

  /**
   * 获取可用的群组库
   */
  async getAvailableGroupLibraries(): Promise<Array<{ id: number; name: string }>> {
    const groups = this.Zotero.Groups.getAll();
    const libraries = [];

    for (const group of groups) {
      libraries.push({
        id: group.libraryID,
        name: group.name
      });
    }

    return libraries;
  }

  /**
   * 验证偏好设置
   */
  validatePreferences(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const prefs = this.preferences;

    // 验证同步间隔
    if (prefs.syncOptions.syncIntervalMinutes < 5) {
      errors.push('Sync interval must be at least 5 minutes');
    }

    // 验证批处理大小
    if (prefs.advancedOptions.batchSize < 1 || prefs.advancedOptions.batchSize > 1000) {
      errors.push('Batch size must be between 1 and 1000');
    }

    // 验证超时时间
    if (prefs.advancedOptions.timeoutSeconds < 5 || prefs.advancedOptions.timeoutSeconds > 300) {
      errors.push('Timeout must be between 5 and 300 seconds');
    }

    // 验证最小高亮长度
    if (prefs.filterOptions.minHighlightLength < 0) {
      errors.push('Minimum highlight length cannot be negative');
    }

    // 至少要选择一种注释类型
    const hasSelectedType = prefs.annotationTypes.includeHighlights ||
                           prefs.annotationTypes.includeNotes ||
                           prefs.annotationTypes.includeUnderlines ||
                           prefs.annotationTypes.includeImages ||
                           prefs.annotationTypes.includeInks;
    
    if (!hasSelectedType) {
      errors.push('At least one annotation type must be selected');
    }

    // 至少要选择一个库
    if (!prefs.librarySettings.includeMyLibrary && 
        !prefs.librarySettings.includeGroupLibraries) {
      errors.push('At least one library must be selected');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 导出偏好设置
   */
  exportPreferences(): string {
    return JSON.stringify(this.preferences, null, 2);
  }

  /**
   * 导入偏好设置
   */
  importPreferences(json: string): void {
    try {
      const imported = JSON.parse(json);
      const merged = this.mergeWithDefaults(imported);
      const validation = this.validatePreferences();
      
      if (!validation.valid) {
        throw new Error(`Invalid preferences: ${validation.errors.join(', ')}`);
      }

      this.savePreferences(merged);
      this.logger.info('Preferences imported successfully');
    } catch (error) {
      this.logger.error('Failed to import preferences:', error);
      throw error;
    }
  }
}

export default AnnotationPreferencesManager;

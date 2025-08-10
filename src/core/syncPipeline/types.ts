/**
 * Type Definitions for Incremental Sync Pipeline
 */

import { ReadwiseBook, ReadwiseHighlight } from '../../api/readwiseClient/types';

/**
 * 同步管线选项
 */
export interface SyncPipelineOptions {
  /** 库 ID */
  libraryId?: string;
  
  /** 是否启用增量同步 */
  incremental?: boolean;
  
  /** 是否检测已删除的条目 */
  detectDeleted?: boolean;
  
  /** 批量大小 */
  batchSize?: number;
  
  /** 批次之间的延迟（毫秒） */
  delayBetweenBatches?: number;
  
  /** 并发数 */
  concurrency?: number;
  
  /** 指定要同步的集合 */
  collections?: string[];
  
  /** 指定要同步的标签 */
  tags?: string[];
  
  /** 失败重试次数 */
  maxRetries?: number;
  
  /** 重试延迟（毫秒） */
  retryDelay?: number;
  
  /** 是否在失败后继续 */
  continueOnError?: boolean;
  
  /** 断路器阈值 */
  circuitBreakerThreshold?: number;
  
  /** 是否试运行（不实际上传） */
  dryRun?: boolean;
  
  /** 进度回调 */
  onProgress?: (progress: SyncProgress) => void;
}

/**
 * 同步状态
 */
export type SyncStatus = 
  | 'idle'
  | 'detecting'
  | 'grouping'
  | 'uploading'
  | 'committing'
  | 'finalizing'
  | 'error'
  | 'aborted';

/**
 * 同步进度
 */
export interface SyncProgress {
  status: SyncStatus;
  phase: string;
  current: number;
  total: number;
  percentage: number;
  message: string;
}

/**
 * 变化检测结果
 */
export interface ChangeDetectionResult {
  /** 新增的条目 */
  newItems: any[];
  
  /** 修改的条目 */
  modifiedItems: any[];
  
  /** 未变化的条目 */
  unchangedItems: any[];
  
  /** 已删除的条目键 */
  deletedItems: string[];
}

/**
 * 同步批次
 */
export interface SyncBatch {
  /** 父条目键 */
  parentItemKey: string;
  
  /** Readwise 书籍 ID */
  bookId?: string;
  
  /** 书籍信息 */
  bookInfo?: Partial<ReadwiseBook>;
  
  /** 高亮列表 */
  highlights: Partial<ReadwiseHighlight>[];
  
  /** 注释元数据 */
  annotations: AnnotationMeta[];
  
  /** 批次状态 */
  status: 'pending' | 'uploading' | 'success' | 'failed';
  
  /** 错误信息 */
  error?: Error;
}

/**
 * 注释元数据
 */
export interface AnnotationMeta {
  /** 注释键 */
  key: string;
  
  /** 内容哈希 */
  hash: string;
  
  /** Readwise 高亮 ID */
  readwiseHighlightId?: string;
  
  /** 上传时间 */
  uploadedAt?: Date;
}

/**
 * 批量上传结果
 */
export interface BatchUploadResult {
  /** 批次 ID */
  batchId: string;
  
  /** 是否成功 */
  success: boolean;
  
  /** 创建的高亮 IDs */
  highlightIds: string[];
  
  /** 上传时间 */
  uploadedAt?: Date;
  
  /** 错误信息 */
  error?: Error;
}

/**
 * 同步统计信息
 */
export interface SyncStatistics {
  /** 开始时间 */
  startTime: number;
  
  /** 结束时间 */
  endTime: number;
  
  /** 总耗时（毫秒） */
  duration: number;
  
  /** 成功条目数 */
  itemsSuccess: number;
  
  /** 失败条目数 */
  itemsFailed: number;
  
  /** 跳过条目数 */
  itemsSkipped: number;
  
  /** 新增条目数 */
  itemsNew: number;
  
  /** 修改条目数 */
  itemsModified: number;
  
  /** 删除条目数 */
  itemsDeleted: number;
  
  /** 上传的高亮数 */
  highlightsUploaded: number;
  
  /** 成功率 */
  successRate: number;
  
  /** 错误列表 */
  errors: Error[];
  
  /** 错误分类统计 */
  errorsByType?: {
    network: number;
    rateLimit: number;
    serverError: number;
    authError: number;
    validation: number;
    unknown: number;
  };
  
  /** 重试统计 */
  retryStats?: {
    totalRetries: number;
    successfulRetries: number;
    failedRetries: number;
    averageRetryDelay: number;
  };
  
  /** 详细统计（可选） */
  details?: {
    /** 按类型统计 */
    byType?: {
      books: number;
      articles: number;
      papers: number;
      other: number;
    };
    
    /** 按来源统计 */
    bySource?: {
      pdf: number;
      epub: number;
      web: number;
      other: number;
    };
    
    /** 按注释类型统计 */
    byAnnotationType?: {
      highlight: number;
      note: number;
      underline: number;
      area: number;
    };
  };
}

/**
 * 同步条目
 */
export interface SyncItem {
  /** 条目键 */
  key: string;
  
  /** 条目标题 */
  title: string;
  
  /** 条目类型 */
  type: string;
  
  /** 注释数量 */
  annotationCount: number;
  
  /** 内容哈希 */
  hash: string;
  
  /** 最后修改时间 */
  lastModified: Date;
  
  /** Readwise 书籍 ID */
  readwiseBookId?: string;
  
  /** 同步状态 */
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed';
}

/**
 * 同步事件
 */
export interface SyncEvent {
  /** 事件类型 */
  type: 'start' | 'progress' | 'success' | 'error' | 'abort';
  
  /** 时间戳 */
  timestamp: Date;
  
  /** 事件数据 */
  data?: any;
  
  /** 错误信息 */
  error?: Error;
}

/**
 * 同步会话
 */
export interface SyncSession {
  /** 会话 ID */
  id: string;
  
  /** 开始时间 */
  startedAt: Date;
  
  /** 结束时间 */
  endedAt?: Date;
  
  /** 会话状态 */
  status: SyncStatus;
  
  /** 统计信息 */
  statistics: SyncStatistics;
  
  /** 选项 */
  options: SyncPipelineOptions;
  
  /** 事件日志 */
  events: SyncEvent[];
}

/**
 * 批量操作结果
 */
export interface BulkOperationResult<T> {
  /** 成功的条目 */
  successful: T[];
  
  /** 失败的条目 */
  failed: Array<{
    item: T;
    error: Error;
  }>;
  
  /** 总数 */
  total: number;
  
  /** 成功数 */
  successCount: number;
  
  /** 失败数 */
  failureCount: number;
}

/**
 * 同步冲突
 */
export interface SyncConflict {
  /** 条目键 */
  itemKey: string;
  
  /** 冲突类型 */
  type: 'version' | 'content' | 'deleted';
  
  /** 本地版本 */
  localVersion: any;
  
  /** 远程版本 */
  remoteVersion: any;
  
  /** 解决策略 */
  resolution?: 'local' | 'remote' | 'merge' | 'skip';
}

/**
 * 同步策略
 */
export interface SyncStrategy {
  /** 冲突解决策略 */
  conflictResolution: 'local-first' | 'remote-first' | 'newest' | 'manual';
  
  /** 是否合并重复项 */
  mergeDuplicates: boolean;
  
  /** 是否保留已删除项的历史 */
  preserveDeleted: boolean;
  
  /** 是否同步标签 */
  syncTags: boolean;
  
  /** 是否同步集合 */
  syncCollections: boolean;
}

/**
 * 同步过滤器
 */
export interface SyncFilter {
  /** 包含的条目类型 */
  includeTypes?: string[];
  
  /** 排除的条目类型 */
  excludeTypes?: string[];
  
  /** 包含的集合 */
  includeCollections?: string[];
  
  /** 排除的集合 */
  excludeCollections?: string[];
  
  /** 包含的标签 */
  includeTags?: string[];
  
  /** 排除的标签 */
  excludeTags?: string[];
  
  /** 日期范围 */
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  
  /** 自定义过滤函数 */
  customFilter?: (item: any) => boolean;
}

/**
 * 同步验证结果
 */
export interface SyncValidationResult {
  /** 是否有效 */
  isValid: boolean;
  
  /** 验证错误 */
  errors: Array<{
    field: string;
    message: string;
  }>;
  
  /** 验证警告 */
  warnings: Array<{
    field: string;
    message: string;
  }>;
}

/**
 * 错误恢复策略
 */
export interface ErrorRecoveryStrategy {
  /** 是否启用自动恢复 */
  autoRecover: boolean;
  
  /** 最大恢复尝试次数 */
  maxRecoveryAttempts: number;
  
  /** 恢复间隔（毫秒） */
  recoveryInterval: number;
  
  /** 是否保存失败项以便后续重试 */
  saveFailedItems: boolean;
  
  /** 失败项保存路径 */
  failedItemsPath?: string;
  
  /** 自定义恢复处理器 */
  customRecoveryHandler?: (error: Error, context: any) => Promise<boolean>;
}

/**
 * 错误上下文
 */
export interface ErrorContext {
  /** 错误发生的阶段 */
  phase: string;
  
  /** 相关条目 */
  itemKey?: string;
  
  /** 批次 ID */
  batchId?: string;
  
  /** 尝试次数 */
  attemptNumber: number;
  
  /** 额外元数据 */
  metadata?: Record<string, any>;
}

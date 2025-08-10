/**
 * Readwise Sync Types
 */

export type SyncStatus = 
  | 'idle'
  | 'scanning'
  | 'mapping'
  | 'uploading'
  | 'confirming'
  | 'updating'
  | 'error';

export interface SyncOptions {
  /** 增量同步 - 仅同步自上次以来的更改 */
  incremental?: boolean;
  
  /** 跳过重复项检查 */
  skipDuplicates?: boolean;
  
  /** 批量上传大小 */
  batchSize?: number;
  
  /** 遇到错误时停止 */
  stopOnError?: boolean;
  
  /** 指定要同步的集合 */
  collections?: string[];
  
  /** 指定要同步的标签 */
  tags?: string[];
  
  /** 试运行模式 - 不实际上传 */
  dryRun?: boolean;
}

export interface SyncResult {
  success: boolean;
  itemsSynced: number;
  itemsFailed: number;
  errors: Error[];
  duration: number;
  details?: {
    books?: number;
    highlights?: number;
    notes?: number;
  };
}

export interface SyncProgress {
  status: SyncStatus;
  current: number;
  total: number;
  message: string;
  percentage: number;
}

export type SyncEventType = 
  | 'progress'
  | 'item-synced'
  | 'item-failed'
  | 'error'
  | 'complete';

export interface SyncEvent {
  type: SyncEventType;
  timestamp: Date;
  data: any;
}

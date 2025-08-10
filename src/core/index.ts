/**
 * Core Module Exports
 * 核心模块导出 - 同步和管线组件
 */

// Readwise Sync Orchestrator
export { ReadwiseSyncOrchestrator } from './readwiseSync';
export * from './readwiseSync/types';

// Incremental Sync Pipeline
export { IncrementalSyncPipeline } from './syncPipeline';
export * from './syncPipeline/types';

// Re-export commonly used types
export type {
  SyncStatus,
  SyncOptions,
  SyncResult,
  SyncProgress,
  SyncEvent
} from './readwiseSync/types';

export type {
  SyncPipelineOptions,
  SyncStatistics,
  SyncBatch,
  BatchUploadResult,
  ChangeDetectionResult,
  SyncSession,
  SyncFilter,
  SyncStrategy
} from './syncPipeline/types';

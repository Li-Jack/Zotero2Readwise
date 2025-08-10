/**
 * Storage Module
 * 导出所有存储相关的组件
 */

export {
  StateStore,
  type AnnotationSyncState,
  type AnnotationSyncRecord,
  type AnnotationHashInput,
  type SyncDecision,
  type AnnotationSyncStats,
  type SyncState,
  type SyncedItem,
  type Preferences,
  type SyncStats,
  type ExportData
} from './stateStore';

// 为方便使用，也导出默认实例工厂
import { StateStore } from './stateStore';
import { Logger } from '../utils/logger';

/**
 * 创建 StateStore 实例
 */
export function createStateStore(logger?: Logger): StateStore {
  const storeLogger = logger || new Logger('StateStore');
  return new StateStore(storeLogger);
}

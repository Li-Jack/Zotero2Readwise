/**
 * Annotations Module Index
 * 导出所有注释采集相关的组件
 */

export {
  AnnotationCollector,
  type AnnotationType,
  type AnnotationPosition,
  type ZoteroAnnotationEntity,
  type ParentItemMetadata,
  type PDFAttachment,
  type ItemWithAnnotations,
  type AnnotationScanOptions
} from './annotationCollector';

export {
  AnnotationPreferencesManager,
  type AnnotationPreferences,
  DEFAULT_ANNOTATION_PREFERENCES
} from './annotationPreferences';

// Re-export for convenience
export { default as AnnotationCollectorClass } from './annotationCollector';
export { default as AnnotationPreferencesManagerClass } from './annotationPreferences';

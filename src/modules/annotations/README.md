# Zotero 注释采集系统

这是 Z2R 插件的核心模块，实现了完整的 Zotero 7 注释采集功能。

## 功能特性

### MVP 版本（当前实现）
- ✅ 高亮（highlight）注释采集
- ✅ 文字笔记（note）采集
- ✅ 下划线（underline）注释采集
- ✅ 多库支持（我的文库 + 群组库）
- ✅ 增量同步
- ✅ 用户偏好配置
- ✅ 完整的元数据关联

### 未来版本计划
- 🔲 图像框选（image）注释
- 🔲 手绘（ink）注释
- 🔲 实时同步监听
- 🔲 批量导出功能

## 核心组件

### 1. AnnotationCollector
主要的注释采集器，负责从 Zotero 库中读取注释数据。

```typescript
import { AnnotationCollector } from './annotationCollector';
import { BasicTool } from 'zotero-plugin-toolkit';

const collector = new AnnotationCollector(logger, ztoolkit);

// 采集注释
const results = await collector.collectAnnotations({
  includeMyLibrary: true,
  includeGroupLibraries: false,
  annotationTypes: ['highlight', 'note'],
  modifiedAfter: lastSyncDate
});
```

### 2. AnnotationPreferencesManager
管理用户偏好设置，支持持久化存储。

```typescript
import { AnnotationPreferencesManager } from './annotationPreferences';

const prefsManager = new AnnotationPreferencesManager(logger);

// 更新偏好设置
prefsManager.updatePreferences('librarySettings.includeMyLibrary', true);
prefsManager.updatePreferences('syncOptions.incrementalSync', true);

// 转换为扫描选项
const scanOptions = prefsManager.toScanOptions();
```

## 数据结构

### ZoteroAnnotationEntity
完整的注释实体，包含所有必要字段：

```typescript
interface ZoteroAnnotationEntity {
  // 标识符
  annotationKey: string;      // 注释的唯一键
  parentItemKey: string;      // 父条目键
  attachmentKey: string;      // 附件键
  
  // 内容
  type: AnnotationType;       // 注释类型
  text: string;              // 高亮文本
  comment: string;           // 用户评论
  
  // 位置
  pageLabel?: string;        // 页面标签
  pageIndex: number;         // 页面索引
  position?: AnnotationPosition; // 详细位置信息
  
  // 元数据
  color: string;             // 颜色代码
  dateCreated: Date;         // 创建时间
  dateModified: Date;        // 修改时间
  tags: string[];           // 标签
}
```

### ParentItemMetadata
父条目的完整元数据：

```typescript
interface ParentItemMetadata {
  key: string;
  title: string;
  creators: Creator[];
  date: string;
  DOI?: string;
  url?: string;
  publicationTitle?: string;
  journalAbbreviation?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  abstractNote?: string;
  itemType: string;
  libraryID: number;
  groupID?: number;
  tags: Tag[];
}
```

## 使用示例

### 基本使用
```typescript
// 初始化
const logger = new Logger({ prefix: '[Z2R]' });
const ztoolkit = new BasicTool();
const collector = new AnnotationCollector(logger, ztoolkit);

// 采集所有注释
const results = await collector.collectAnnotations({
  includeMyLibrary: true,
  includeGroupLibraries: true,
  annotationTypes: ['highlight', 'note']
});

// 处理结果
for (const item of results) {
  console.log(`${item.item.title}: ${item.annotations.length} annotations`);
}
```

### 增量同步
```typescript
const prefsManager = new AnnotationPreferencesManager(logger);
const lastSync = prefsManager.getPreferences().syncOptions.lastSyncTime;

// 只获取上次同步后的修改
const results = await collector.collectAnnotations({
  modifiedAfter: lastSync,
  includeMyLibrary: true
});

// 更新同步时间
prefsManager.updateLastSyncTime();
```

### 过滤特定集合
```typescript
const results = await collector.collectAnnotations({
  collections: ['ABCD1234', 'EFGH5678'],
  tags: ['important', 'review'],
  annotationTypes: ['highlight'],
  excludeTrashed: true
});
```

### 获取库统计
```typescript
const stats = await collector.getLibraryStatistics();
console.log(`Total items: ${stats.totalItems}`);
console.log(`Total annotations: ${stats.totalAnnotations}`);
console.log('By type:', stats.annotationsByType);
```

## 配置选项

### AnnotationScanOptions
扫描选项的完整配置：

```typescript
interface AnnotationScanOptions {
  // 库选择
  includeMyLibrary?: boolean;         // 默认: true
  includeGroupLibraries?: boolean;    // 默认: false
  specificLibraryIDs?: number[];      // 指定库ID
  
  // 过滤条件
  modifiedAfter?: Date;               // 时间过滤
  collections?: string[];             // 集合过滤
  tags?: string[];                    // 标签过滤
  
  // 注释类型
  annotationTypes?: AnnotationType[]; // 默认: ['highlight', 'note']
  
  // 其他选项
  includeItemsWithoutAnnotations?: boolean; // 默认: false
  excludeTrashed?: boolean;           // 默认: true
}
```

### AnnotationPreferences
用户偏好设置结构：

```typescript
interface AnnotationPreferences {
  librarySettings: {
    includeMyLibrary: boolean;
    includeGroupLibraries: boolean;
    selectedGroupLibraries: number[];
    excludedLibraries: number[];
  };
  
  annotationTypes: {
    includeHighlights: boolean;
    includeNotes: boolean;
    includeUnderlines: boolean;
    includeImages: boolean;      // 未来版本
    includeInks: boolean;        // 未来版本
  };
  
  syncOptions: {
    incrementalSync: boolean;
    syncIntervalMinutes: number;
    lastSyncTime?: Date;
    syncOnStartup: boolean;
    syncOnModification: boolean;
  };
  
  filterOptions: {
    excludeTrashed: boolean;
    excludeCollections: string[];
    excludeTags: string[];
    onlyWithComments: boolean;
    minHighlightLength: number;
  };
  
  advancedOptions: {
    batchSize: number;
    maxRetries: number;
    timeoutSeconds: number;
    debugMode: boolean;
  };
}
```

## 与 ZoteroAdapter 集成

ZoteroAdapter 已经集成了新的注释采集系统，提供了向后兼容的 API：

```typescript
import { ZoteroAdapter } from '../../adapters/zoteroAdapter';

const adapter = new ZoteroAdapter(logger, ztoolkit);

// 使用新的增强 API
const results = await adapter.collectAnnotationsEnhanced({
  includeMyLibrary: true,
  annotationTypes: ['highlight', 'note']
});

// 或使用兼容的旧 API
const legacyResults = await adapter.getItemsWithAnnotations({
  modifiedAfter: new Date()
});
```

## 性能优化

1. **批处理**：通过 `batchSize` 选项控制每批处理的条目数量
2. **增量同步**：使用 `modifiedAfter` 只获取修改的内容
3. **库选择**：通过 `specificLibraryIDs` 精确指定要扫描的库
4. **类型过滤**：通过 `annotationTypes` 只获取需要的注释类型

## 错误处理

所有方法都包含了完善的错误处理：

```typescript
try {
  const results = await collector.collectAnnotations(options);
} catch (error) {
  logger.error('Collection failed:', error);
  // 处理错误...
}
```

## API 兼容性

- **Zotero 7**: 完全支持，使用最新的注释 API
- **zotero-plugin-toolkit**: 需要 v5.1.0 或更高版本
- **向后兼容**: 保留了旧的 API 接口，确保现有代码继续工作

## 贡献指南

欢迎贡献代码！请确保：

1. 遵循现有的代码风格
2. 添加适当的类型定义
3. 包含完整的注释
4. 更新相关文档
5. 添加测试用例（如适用）

## 许可证

本模块遵循 Z2R 项目的 AGPL-3.0 许可证。

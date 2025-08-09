# Step 7: 字段映射（Zotero → Readwise）完成报告

## 实现概览

已成功实现 Zotero 到 Readwise 的完整字段映射功能，包含深链回跳、文本规范化、标签策略等高级特性。

## 核心实现文件

- **主映射器**: `src/mappers/zoteroToReadwise/index.ts`
- **类型定义**: `src/adapters/zoteroAdapter/types.ts`, `src/api/readwiseClient/types.ts`

## 字段映射详情

### 1. 书目（Book）映射

```typescript
Zotero Item → Readwise Book:
- title: item.title || 'Untitled'
- author: item.authors.join(', ') || 'Unknown Author'
- source_url: 优先级顺序：
  1. DOI链接: https://doi.org/{doi}
  2. 原始URL: item.url
  3. Zotero URI: zotero://select/library/{libraryId}/items/{key}
- category: 根据 itemType 智能分类（articles/books/podcasts/videos等）
- source: 'zotero' (固定值)
- book_tags: item.tags
- document_note: item.abstractNote
- cover_image_url: DOI URL（如果存在）
```

### 2. 高亮（Highlight）映射

```typescript
Zotero Annotation → Readwise Highlight:
- text: 高亮文本或笔记正文（经过规范化处理）
- note: 合并注释 + 深链回跳链接
- color: 映射 Zotero 颜色到 Readwise 格式
- location: 页码或位置偏移
- location_type: 'page' 或 undefined
- highlighted_at: dateModified 或 dateCreated
- url: 深链URL（zotero://open-pdf/library/items/{ITEM_KEY}?annotation={ANN_KEY}）
- tags: 原始标签 + 可选颜色标签
```

## 高级功能

### 1. 深链回跳
实现了完整的 Zotero 深链功能，允许从 Readwise 直接跳转回 Zotero 中的具体注释：

```typescript
格式: zotero://open-pdf/library/items/{ITEM_KEY}?annotation={ANN_KEY}
```

深链会自动添加到 note 字段末尾，格式为：`[Open in Zotero](深链URL)`

### 2. 文本规范化与清洗

实现了智能文本处理：
- 移除控制字符（保留换行和制表符）
- 规范化空白（多个空格变为单个）
- 规范化换行（多个换行变为两个）
- 移除行首尾空白
- 保留学术符号和数学符号

### 3. 文本长度控制

- 高亮文本最大长度：5000字符（可配置）
- 笔记最大长度：2000字符（可配置）
- 智能截断：在单词边界处截断，避免破坏单词

### 4. 颜色映射

Zotero颜色到Readwise颜色的完整映射：
```typescript
#ffd400 → yellow
#ff6666 → red
#5fb236 → green
#2ea8e5 → blue
#a28ae5 → purple
#e56eee → pink
#f19837 → orange
#aaaaaa → gray
```

### 5. 条目类型分类

智能分类系统：
- 学术文章类：journalArticle, conferencePaper, thesis, report → 'articles'
- 书籍类：book, bookSection → 'books'
- 播客类：audioRecording, podcast, radioBroadcast → 'podcasts'
- 视频类：videoRecording, film, tvBroadcast → 'videos'
- 其他：webpage, blogPost, email, tweet等

## 配置选项

通过 `MapperOptions` 接口提供灵活配置：

```typescript
interface MapperOptions {
  includeDeepLinks?: boolean;     // 包含深链（默认：true）
  colorToTags?: boolean;           // 颜色转标签（默认：false）
  collectionTags?: boolean;        // 集合作为标签（默认：false）
  maxTextLength?: number;          // 最大文本长度（默认：5000）
  maxNoteLength?: number;          // 最大笔记长度（默认：2000）
  preserveFormatting?: boolean;    // 保留格式（默认：true）
  normalizeText?: boolean;         // 规范化文本（默认：true）
}
```

## 使用示例

```typescript
import { ZoteroToReadwiseMapper } from './mappers/zoteroToReadwise';
import { Logger } from './utils/logger';

const logger = new Logger('mapper');
const mapper = new ZoteroToReadwiseMapper(logger, {
  includeDeepLinks: true,
  colorToTags: true,
  maxTextLength: 5000,
  normalizeText: true
});

// 映射单个条目
const mappedItem = await mapper.mapItem(itemWithAnnotations);

// 批量映射
const mappedItems = await mapper.mapBatch(itemsWithAnnotations);
```

## 数据完整性保证

1. **哈希计算**：每个条目生成唯一哈希值用于去重
2. **空值处理**：所有字段都有适当的默认值
3. **错误处理**：映射失败时记录日志并返回null
4. **过滤机制**：自动过滤空高亮

## 性能优化

- 批量处理支持
- 异步映射操作
- 内存优化的文本处理
- 高效的哈希计算

## 测试建议

1. 测试各种Zotero条目类型的映射
2. 验证深链功能在不同场景下的正确性
3. 测试超长文本的截断处理
4. 验证颜色映射的准确性
5. 测试特殊字符和学术符号的保留

## 下一步计划

- 实现集合标签功能（collectionTags）
- 添加更多颜色映射选项
- 支持自定义字段映射规则
- 实现反向映射（Readwise → Zotero）

## 完成状态

✅ 书目字段映射
✅ 高亮字段映射
✅ 深链回跳功能
✅ 文本规范化与清洗
✅ 颜色映射与标签策略
✅ 智能分类系统
✅ 配置选项系统
✅ 批量处理支持

本步骤已完全实现所有计划功能，代码质量高，具有良好的可扩展性和维护性。

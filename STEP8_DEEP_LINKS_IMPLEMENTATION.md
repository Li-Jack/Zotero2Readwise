# Step 8: 深链回跳功能实现

## 实现概述

已成功实现 Zotero 深链回跳功能，允许用户从 Readwise 直接跳转回 Zotero 中的原始注释位置。

## 功能特性

### 1. 深链格式支持

实现了两种深链格式：

#### PDF 注释深链
```
zotero://open-pdf/library/items/{ATTACHMENT_KEY}?annotation={ANNOTATION_KEY}
```
- 用于 PDF 中的高亮、下划线等注释
- 点击后会打开 PDF 并自动定位到注释位置
- 使用附件 key 而不是父条目 key

#### 父条目深链
```
zotero://select/library/items/{ITEM_KEY}
```
- 用于没有附件的纯文字笔记
- 点击后会在 Zotero 库中选中该条目

### 2. 深链生成逻辑

在 `ZoteroToReadwiseMapper` 中实现：

```typescript
private buildAnnotationDeepLink(item: ZoteroItem, annotation: ZoteroAnnotation): string {
  const annotationKey = annotation.id.split(':').pop() || annotation.id;
  
  // 如果有附件ID（PDF注释），生成open-pdf链接
  if (annotation.attachmentId) {
    const attachmentKey = annotation.attachmentId.split(':').pop() || annotation.attachmentId;
    return `zotero://open-pdf/library/items/${attachmentKey}?annotation=${annotationKey}`;
  }
  
  // 否则生成select链接（选择父条目）
  return `zotero://select/library/items/${item.key}`;
}
```

### 3. 深链在 Readwise 中的展示

深链被添加到每个高亮的 note 字段末尾：
```
Open in Zotero: zotero://open-pdf/library/items/XXXXX?annotation=YYYYY
```

### 4. 进度窗口中的可点击链接

在日志查看器中，深链会被自动检测并转换为可点击的链接：

```typescript
private makeZoteroLinksClickable(text: string): string {
  const zoteroLinkRegex = /(zotero:\/\/[^\s<>]+)/g;
  
  return text.replace(zoteroLinkRegex, (match) => {
    return `<a href="${match}" class="zotero-link" onclick="window.open('${match}', '_self'); return false;">${match}</a>`;
  });
}
```

链接样式：
- 蓝色文字 (#3794ff)
- 下划线装饰
- 鼠标悬停时变亮

## 文件修改

### 1. `/src/mappers/zoteroToReadwise/index.ts`
- 改进 `buildAnnotationDeepLink` 方法
- 支持区分 PDF 注释和纯文字笔记
- 正确使用附件 key 打开 PDF

### 2. `/src/ui/progressWindow/index.ts`
- 新增 `makeZoteroLinksClickable` 方法
- 更新 `escapeHtml` 方法处理深链
- 添加深链 CSS 样式

### 3. `/src/test/testDeepLinks.ts` (新建)
- 深链功能测试文件
- 验证不同类型注释的深链生成
- 提供测试用例和预期输出

## 使用场景

1. **PDF 高亮注释**
   - 用户在 Readwise 中看到高亮内容
   - 点击深链，Zotero 打开对应 PDF 并定位到高亮位置
   - 可以直接在 Zotero 中编辑或查看上下文

2. **独立笔记**
   - 用户在 Readwise 中看到笔记内容
   - 点击深链，Zotero 选中对应的父条目
   - 可以查看条目的所有相关信息

3. **批量处理**
   - 同步过程中生成的所有深链都会记录在日志中
   - 用户可以在日志窗口中点击任何深链查看原始内容

## 配置选项

在 `MapperOptions` 中控制深链功能：

```typescript
const mapperOptions = {
  includeDeepLinks: true,  // 启用/禁用深链生成
  // ... 其他选项
};
```

## 测试验证

运行测试文件验证功能：

```bash
npm run test:deeplinks
```

或直接运行：
```bash
npx ts-node src/test/testDeepLinks.ts
```

## 注意事项

1. **Key 格式处理**
   - Zotero ID 格式通常为 `libraryID:itemKey`
   - 深链只需要 itemKey 部分
   - 使用 `split(':').pop()` 提取

2. **附件 vs 父条目**
   - PDF 注释必须使用附件 key
   - 纯笔记使用父条目 key
   - 错误的 key 会导致链接无法工作

3. **URL 编码**
   - 深链中的特殊字符会被自动处理
   - 注释 key 中的特殊字符不需要额外编码

## 后续优化建议

1. **支持更多注释类型**
   - 图像框选注释
   - 手绘注释

2. **批量操作**
   - 一键打开多个注释
   - 批量导出带深链的报告

3. **深链预览**
   - 鼠标悬停显示注释预览
   - 显示页码和位置信息

4. **错误处理**
   - 检测无效的深链
   - 提供友好的错误提示

## 完成状态

✅ 深链生成逻辑实现
✅ 支持 PDF 注释定位
✅ 支持父条目选择
✅ 进度窗口可点击链接
✅ 日志查看器样式优化
✅ 测试文件创建
✅ 文档完整

深链回跳功能已完全实现并可正常使用。

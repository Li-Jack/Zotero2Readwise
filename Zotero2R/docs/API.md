# API 文档

## Readwise API 集成

### 认证

所有 API 请求需要在 Header 中包含认证令牌：

```http
Authorization: Token YOUR_READWISE_TOKEN
```

### 端点说明

#### 1. 认证验证

**端点**: `GET https://readwise.io/api/v2/auth`

**用途**: 验证 API Token 是否有效

**响应**:
- `204 No Content`: Token 有效
- `401 Unauthorized`: Token 无效

**示例代码**:
```typescript
async function testConnection(token: string): Promise<boolean> {
  const response = await Zotero.HTTP.request("GET", 
    "https://readwise.io/api/v2/auth", {
    headers: {
      "Authorization": `Token ${token}`
    },
    timeout: 10000
  });
  
  return response.status === 204;
}
```

#### 2. 创建高亮

**端点**: `POST https://readwise.io/api/v2/highlights`

**请求体**:
```json
{
  "highlights": [
    {
      "text": "高亮文本内容",
      "title": "文献标题",
      "author": "作者名称",
      "source_url": "zotero://select/items/ITEM_KEY",
      "source_type": "zotero_annotation",
      "location": 42,
      "location_type": "page",
      "note": "用户笔记",
      "highlighted_at": "2024-01-01T12:00:00Z",
      "tags": ["tag1", "tag2"]
    }
  ]
}
```

**字段说明**:

| 字段 | 类型 | 必需 | 说明 |
|-----|------|------|------|
| text | string | ✅ | 高亮的文本内容 |
| title | string | ✅ | 来源文献的标题 |
| author | string | ❌ | 作者名称 |
| source_url | string | ❌ | 源链接，使用 Zotero URI |
| source_type | string | ❌ | 来源类型标识 |
| location | number | ❌ | 位置（如页码） |
| location_type | string | ❌ | 位置类型（page/order/time） |
| note | string | ❌ | 附加笔记 |
| highlighted_at | string | ❌ | ISO 8601 格式的时间戳 |
| tags | string[] | ❌ | 标签数组 |

**响应**:
- `200 OK`: 成功创建
- `400 Bad Request`: 请求格式错误
- `401 Unauthorized`: 认证失败

#### 3. 创建书籍/文献

**端点**: `POST https://readwise.io/api/v2/books`

**请求体**:
```json
{
  "title": "文献标题",
  "author": "作者名称",
  "category": "article",
  "source": "zotero",
  "unique_url": "zotero://select/items/ITEM_KEY",
  "tags": ["tag1", "tag2"]
}
```

**响应**:
- `201 Created`: 成功创建
- `200 OK`: 书籍已存在（更新）

### 批量处理

为了避免 API 限制，建议：
- 高亮批量发送，每批最多 100 条
- 请求间隔至少 100ms
- 实现重试机制（指数退避）

**批量发送示例**:
```typescript
async function sendHighlightsBatch(
  highlights: ReadwiseHighlight[],
  token: string
): Promise<void> {
  const BATCH_SIZE = 100;
  
  for (let i = 0; i < highlights.length; i += BATCH_SIZE) {
    const batch = highlights.slice(i, i + BATCH_SIZE);
    
    await Zotero.HTTP.request("POST", 
      "https://readwise.io/api/v2/highlights", {
      headers: {
        "Authorization": `Token ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ highlights: batch }),
      timeout: 30000
    });
    
    // 延迟避免限流
    if (i + BATCH_SIZE < highlights.length) {
      await Zotero.Promise.delay(100);
    }
  }
}
```

## Zotero API 使用

### 获取条目

```typescript
// 获取所有条目
const items = await Zotero.Items.getAll(libraryID);

// 获取选中的条目
const selectedItems = ZoteroPane.getSelectedItems();

// 根据 ID 获取条目
const item = await Zotero.Items.getAsync(itemID);
```

### 获取标注

```typescript
async function getAnnotations(item: Zotero.Item) {
  const attachments = await Zotero.Items.getAsync(
    item.getAttachments()
  );
  
  const annotations = [];
  for (const attachment of attachments) {
    if (attachment.isPDFAttachment()) {
      const annots = attachment.getAnnotations();
      annotations.push(...annots);
    }
  }
  
  return annotations;
}
```

### 获取笔记

```typescript
async function getNotes(item: Zotero.Item) {
  const noteIDs = item.getNotes();
  const notes = await Zotero.Items.getAsync(noteIDs);
  
  return notes.map(note => ({
    content: note.getNote(), // HTML 格式
    plainText: note.getNote().replace(/<[^>]*>/g, "")
  }));
}
```

### 偏好设置管理

```typescript
// 获取偏好设置
const prefBranch = Services.prefs.getBranch(
  "extensions.zotero2readwise."
);
const token = prefBranch.getCharPref("readwiseToken");

// 设置偏好
prefBranch.setCharPref("readwiseToken", newToken);
prefBranch.setBoolPref("includeNotes", true);
prefBranch.setIntPref("lastSyncTime", Date.now());
```

### 事件监听

```typescript
// 注册监听器
const notifierID = Zotero.Notifier.registerObserver({
  notify: async (event, type, ids, extraData) => {
    if (type === "item" && event === "add") {
      // 处理新增条目
    }
  }
}, ["item", "annotation"]);

// 注销监听器
Zotero.Notifier.unregisterObserver(notifierID);
```

## 数据模型

### Zotero Item

```typescript
interface ZoteroItem {
  // 基本属性
  id: number;
  key: string;
  libraryID: number;
  itemType: string;
  dateAdded: string;
  dateModified: string;
  
  // 方法
  getField(field: string): string;
  setField(field: string, value: string): void;
  getCreators(): Creator[];
  getTags(): Tag[];
  getAttachments(): number[];
  getNotes(): number[];
  isRegularItem(): boolean;
  isAttachment(): boolean;
  isNote(): boolean;
  isPDFAttachment(): boolean;
}
```

### Zotero Annotation

```typescript
interface ZoteroAnnotation {
  annotationText: string;
  annotationComment?: string;
  annotationColor?: string;
  annotationPageLabel?: string;
  annotationPosition?: {
    pageIndex: number;
    rects: number[][];
  };
  dateModified: string;
}
```

## 错误处理

### 常见错误码

| 错误码 | 说明 | 处理方法 |
|-------|------|----------|
| 401 | 认证失败 | 检查 API Token |
| 429 | 请求过多 | 实现重试机制 |
| 500 | 服务器错误 | 重试或联系支持 |
| ETIMEDOUT | 连接超时 | 增加超时时间 |

### 错误处理示例

```typescript
async function safeApiCall<T>(
  fn: () => Promise<T>,
  retries = 3
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      
      // 指数退避
      const delay = Math.pow(2, i) * 1000;
      await Zotero.Promise.delay(delay);
    }
  }
  throw new Error("Max retries exceeded");
}
```

## 性能优化

### 防抖处理

```typescript
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T {
  let timeout: NodeJS.Timeout | null = null;
  
  return ((...args) => {
    if (timeout) clearTimeout(timeout);
    
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  }) as T;
}

// 使用示例
const debouncedSync = debounce(syncToReadwise, 5000);
```

### 缓存策略

```typescript
class Cache<T> {
  private cache = new Map<string, { data: T; expires: number }>();
  
  set(key: string, data: T, ttl = 3600000): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + ttl
    });
  }
  
  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }
}
```

## 测试示例

### 单元测试

```typescript
// 测试 API Token 验证
async function testTokenValidation() {
  const validToken = "valid_token";
  const invalidToken = "invalid_token";
  
  assert(await testConnection(validToken) === true);
  assert(await testConnection(invalidToken) === false);
}

// 测试数据转换
function testDataConversion() {
  const zoteroItem = createMockItem();
  const readwiseBook = createBookFromItem(zoteroItem);
  
  assert(readwiseBook.title === zoteroItem.getField("title"));
  assert(readwiseBook.source === "zotero");
}
```

### 集成测试

```typescript
// 测试完整同步流程
async function testFullSync() {
  // 1. 创建测试数据
  const testItem = await createTestItem();
  
  // 2. 执行同步
  await syncToReadwise([testItem]);
  
  // 3. 验证结果
  const lastSync = getPref("lastSyncTime");
  assert(lastSync > 0);
}
```

---

更多 API 详情请参考：
- [Readwise API Documentation](https://readwise.io/api_deets)
- [Zotero JavaScript API](https://www.zotero.org/support/dev/client_coding/javascript_api)

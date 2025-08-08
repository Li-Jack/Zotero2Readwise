// Readwise API Client for Browser Extension

export class ReadwiseClient {
  constructor(options) {
    this.token = options.token;
    this.baseUrl = 'https://readwise.io/api/v2';
    this.failedItems = [];
    this.maxTextLength = 8191; // Readwise 文本长度限制
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Authorization': `Token ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Readwise API 请求失败: ${response.status} ${response.statusText}\n${errorText}`);
    }

    return response.json();
  }

  async createHighlights(highlights) {
    if (!highlights || highlights.length === 0) {
      return { success: true, message: '没有高亮需要创建', failedItems: [] };
    }

    // 处理超长文本
    const processedHighlights = highlights.map(h => this.truncateHighlight(h));

    // 分批处理，每批最多100个
    const batchSize = 100;
    const batches = [];
    let successCount = 0;
    this.failedItems = [];
    
    for (let i = 0; i < processedHighlights.length; i += batchSize) {
      batches.push(processedHighlights.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      try {
        await this.makeRequest('/highlights/', {
          method: 'POST',
          body: { highlights: batch }
        });
        successCount += batch.length;
      } catch (error) {
        console.error('批次上传失败:', error);
        // 尝试单个上传失败的项目
        for (const highlight of batch) {
          try {
            await this.makeRequest('/highlights/', {
              method: 'POST',
              body: { highlights: [highlight] }
            });
            successCount++;
          } catch (itemError) {
            console.error('单项上传失败:', itemError, highlight);
            this.failedItems.push({
              highlight,
              error: itemError.message
            });
          }
        }
      }
    }

    return {
      success: true,
      message: `成功创建 ${successCount} 个高亮，失败 ${this.failedItems.length} 个`,
      failedItems: this.failedItems
    };
  }

  formatHighlight(zoteroItem) {
    // 生成 Zotero 深度链接
    const zoteroUrl = this.generateZoteroDeepLink(zoteroItem);
    
    const highlight = {
      text: zoteroItem.text,
      title: zoteroItem.title || 'Untitled',
      author: zoteroItem.creators || '',
      source_url: zoteroItem.sourceUrl || null,
      source_type: this.getSourceType(zoteroItem.documentType),
      category: this.getCategory(zoteroItem.documentType),
      highlighted_at: zoteroItem.annotatedAt,
      highlight_url: zoteroUrl || zoteroItem.annotationUrl || null
    };

    // 处理笔记和标签
    const note = this.formatNote(zoteroItem.tags, zoteroItem.comment);
    if (note) {
      highlight.note = note;
    }

    // 处理位置信息
    if (zoteroItem.pageLabel && /^\d+$/.test(zoteroItem.pageLabel)) {
      highlight.location = parseInt(zoteroItem.pageLabel);
      highlight.location_type = 'page';
    }

    // 移除空值
    return Object.fromEntries(
      Object.entries(highlight).filter(([_, value]) => value !== null && value !== undefined && value !== '')
    );
  }

  formatNote(tags, comment) {
    let note = '';
    
    // 添加标签
    if (tags && tags.length > 0) {
      const formattedTags = tags
        .map(tag => `.${this.sanitizeTag(tag.toLowerCase())}`)
        .join(' ');
      note += formattedTags + '\n';
    }
    
    // 添加评论
    if (comment) {
      note += comment;
    }
    
    return note.trim() || null;
  }

  sanitizeTag(tag) {
    // 移除特殊字符，保留字母数字和连字符
    return tag.replace(/[^a-zA-Z0-9\u4e00-\u9fff\-_]/g, '').substring(0, 50);
  }

  getSourceType(documentType) {
    const typeMapping = {
      'journalArticle': 'article',
      'magazineArticle': 'article',
      'newspaperArticle': 'article',
      'blogPost': 'article',
      'webpage': 'article',
      'book': 'book',
      'bookSection': 'book',
      'thesis': 'book',
      'report': 'book',
      'podcast': 'podcast',
      'videoRecording': 'video',
      'tweet': 'tweet'
    };
    
    return typeMapping[documentType] || 'article';
  }

  getCategory(documentType) {
    const categoryMapping = {
      'journalArticle': 'articles',
      'magazineArticle': 'articles',
      'newspaperArticle': 'articles',
      'blogPost': 'articles',
      'webpage': 'articles',
      'book': 'books',
      'bookSection': 'books',
      'thesis': 'books',
      'report': 'books',
      'podcast': 'podcasts',
      'tweet': 'tweets'
    };
    
    return categoryMapping[documentType] || 'articles';
  }

  // 新增：处理超长文本
  truncateHighlight(highlight) {
    if (highlight.text && highlight.text.length > this.maxTextLength) {
      const truncatedText = highlight.text.substring(0, this.maxTextLength - 3) + '...';
      return {
        ...highlight,
        text: truncatedText,
        note: (highlight.note || '') + '\n[文本已截断]'
      };
    }
    return highlight;
  }

  // 新增：生成 Zotero 深度链接
  generateZoteroDeepLink(item) {
    if (!item.key) return null;
    
    // 使用 zotero://select/library/items/[itemKey] 格式
    // 注意：这需要与 Zotero 客户端协调以获取正确的库路径
    return `zotero://select/library/items/${item.key}`;
  }

  // 新增：保存失败项到 JSON
  saveFailedItemsToJson() {
    if (this.failedItems.length === 0) {
      return null;
    }
    
    const failedData = {
      timestamp: new Date().toISOString(),
      count: this.failedItems.length,
      items: this.failedItems
    };
    
    return JSON.stringify(failedData, null, 2);
  }

  // 新增：获取失败项摘要
  getFailedItemsSummary() {
    if (this.failedItems.length === 0) {
      return '所有项目同步成功';
    }
    
    const summary = this.failedItems.map(item => ({
      title: item.highlight.title || 'Untitled',
      text: item.highlight.text?.substring(0, 100) + '...',
      error: item.error
    }));
    
    return summary;
  }
}

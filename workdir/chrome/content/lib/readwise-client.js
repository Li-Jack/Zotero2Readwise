// Readwise API Client for Browser Extension
/* global Components */

var ReadwiseClient = class {
  constructor(options) {
    this.token = options.token;
    this.baseUrl = 'https://readwise.io/api/v2';
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
      return { success: true, message: '没有高亮需要创建' };
    }

    // 分批处理，每批最多100个
    const batchSize = 100;
    const batches = [];
    
    for (let i = 0; i < highlights.length; i += batchSize) {
      batches.push(highlights.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      await this.makeRequest('/highlights/', {
        method: 'POST',
        body: { highlights: batch }
      });
    }

    return {
      success: true,
      message: `成功创建 ${highlights.length} 个高亮`
    };
  }

  formatHighlight(zoteroItem) {
    const highlight = {
      text: zoteroItem.text,
      title: zoteroItem.title || 'Untitled',
      author: zoteroItem.creators || '',
      source_url: zoteroItem.sourceUrl || null,
      source_type: this.getSourceType(zoteroItem.documentType),
      category: this.getCategory(zoteroItem.documentType),
      highlighted_at: zoteroItem.annotatedAt,
      highlight_url: zoteroItem.annotationUrl || null
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
}
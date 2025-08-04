// Zotero API Client for Browser Extension
/* global Components, Zotero */

var ZoteroClient = class {
  constructor(options) {
    this.apiKey = options.apiKey;
    this.libraryId = options.libraryId;
    this.libraryType = options.libraryType || 'user';
    this.baseUrl = 'https://api.zotero.org';
    this.cache = new Map();
    this.parentMapping = new Map();
  }

  async makeRequest(endpoint, params = {}) {
    const url = new URL(`${this.baseUrl}/${this.libraryType}s/${this.libraryId}/${endpoint}`);
    
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key]);
      }
    });

    const response = await fetch(url, {
      headers: {
        'Zotero-API-Key': this.apiKey,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Zotero API 请求失败: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getAllItems(options = {}) {
    const {
      includeAnnotations = true,
      includeNotes = false,
      since = 0
    } = options;

    const items = [];

    if (includeAnnotations) {
      const annotations = await this.retrieveAll('annotation', since);
      items.push(...annotations);
    }

    if (includeNotes) {
      const notes = await this.retrieveAll('note', since);
      items.push(...notes);
    }

    // 格式化项目
    const formattedItems = [];
    for (const item of items) {
      try {
        const formatted = await this.formatItem(item);
        if (formatted) {
          formattedItems.push(formatted);
        }
      } catch (error) {
        Zotero.debug('格式化项目失败: ' + error.message);
      }
    }

    return formattedItems;
  }

  async retrieveAll(itemType, since = 0) {
    const items = [];
    let start = 0;
    const limit = 100;

    while (true) {
      const batch = await this.makeRequest('items', {
        itemType,
        since,
        start,
        limit,
        sort: 'dateModified',
        direction: 'desc'
      });

      if (batch.length === 0) break;
      
      items.push(...batch);
      
      if (batch.length < limit) break;
      
      start += limit;
    }

    return items;
  }

  async getItemMetadata(item) {
    const data = item.data;
    const parentItemKey = data.parentItem;

    if (!parentItemKey) {
      throw new Error('项目缺少父项目引用');
    }

    // 检查缓存
    let topItemKey = this.parentMapping.get(parentItemKey);
    if (topItemKey && this.cache.has(topItemKey)) {
      return this.cache.get(topItemKey);
    }

    // 获取父项目
    const parentItem = await this.makeRequest(`items/${parentItemKey}`);
    topItemKey = parentItem.data.parentItem || parentItemKey;
    this.parentMapping.set(parentItemKey, topItemKey);

    // 获取顶级项目
    let topItem;
    if (parentItem.data.parentItem) {
      topItem = await this.makeRequest(`items/${topItemKey}`);
    } else {
      topItem = parentItem;
    }

    const topData = topItem.data;
    const metadata = {
      title: topData.title || '',
      tags: topData.tags || [],
      documentType: topData.itemType,
      sourceUrl: topItem.links?.alternate?.href || '',
      creators: this.formatCreators(topData.creators || []),
      attachmentUrl: topItem.links?.attachment?.href || ''
    };

    this.cache.set(topItemKey, metadata);
    return metadata;
  }

  formatCreators(creators) {
    const maxLength = 1024;
    const maxAuthorLength = 256;
    const separator = ', ';
    const etAl = ' et al.';

    if (!creators || creators.length === 0) return '';

    // 格式化作者名称
    let authorNames = creators.map(creator => {
      const firstName = creator.firstName || '';
      const lastName = creator.lastName || '';
      const name = `${firstName} ${lastName}`.trim();
      return name.substring(0, maxAuthorLength);
    }).filter(name => name);

    if (authorNames.length === 0) return '';

    let result = authorNames.join(separator);

    // 如果太长，逐步移除作者直到合适
    while (result.length > maxLength && authorNames.length > 1) {
      authorNames.pop();
      result = authorNames.join(separator) + etAl;
    }

    return result;
  }

  async formatItem(item) {
    const data = item.data;
    const itemType = data.itemType;
    const annotationType = data.annotationType;

    // 获取元数据
    const metadata = await this.getItemMetadata(item);

    let text = '';
    let comment = '';

    if (itemType === 'annotation') {
      if (annotationType === 'highlight') {
        text = data.annotationText || '';
        comment = data.annotationComment || '';
      } else if (annotationType === 'note') {
        text = data.annotationComment || '';
      }
    } else if (itemType === 'note') {
      text = this.stripHtml(data.note || '');
    }

    if (!text.trim()) {
      return null;
    }

    return {
      key: data.key,
      version: data.version,
      itemType,
      text: text.trim(),
      annotatedAt: data.dateModified,
      annotationUrl: item.links?.self?.href || '',
      comment: comment.trim() || null,
      title: metadata.title,
      tags: (data.tags || []).map(tag => tag.tag || tag),
      documentTags: (metadata.tags || []).map(tag => tag.tag || tag),
      documentType: metadata.documentType,
      annotationType,
      creators: metadata.creators,
      sourceUrl: metadata.sourceUrl,
      attachmentUrl: metadata.attachmentUrl,
      pageLabel: data.annotationPageLabel || null,
      color: data.annotationColor || null
    };
  }

  stripHtml(html) {
    // 简单的 HTML 标签移除
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  }
}
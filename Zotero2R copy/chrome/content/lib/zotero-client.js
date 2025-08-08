// Zotero API Client for Browser Extension

export class ZoteroClient {
  constructor(options) {
    this.apiKey = options.apiKey;
    this.libraryId = options.libraryId;
    this.libraryType = options.libraryType || 'user';
    this.baseUrl = 'https://api.zotero.org';
    this.cache = new Map();
    this.parentMapping = new Map();
    
    // 过滤选项 - 从 Python 版本移植
    this.filterColors = options.filterColors || [];
    this.filterTags = options.filterTags || [];
    this.includeFilteredTagsInNote = options.includeFilteredTagsInNote || false;
    
    // 支持的高亮颜色映射
    this.colorMapping = {
      '#ffd400': 'yellow',
      '#ff6666': 'red',
      '#5fb236': 'green',
      '#2ea8e5': 'blue',
      '#a28ae5': 'purple',
      '#e56eee': 'magenta',
      '#f19837': 'orange',
      '#aaaaaa': 'gray',
      '#cccccc': 'grey'
    };
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
      since = 0,
      filterColors = this.filterColors,
      filterTags = this.filterTags
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

    // 格式化并过滤项目
    const formattedItems = [];
    for (const item of items) {
      try {
        const formatted = await this.formatItem(item);
        if (formatted && this.shouldIncludeItem(formatted, filterColors, filterTags)) {
          formattedItems.push(formatted);
        }
      } catch (error) {
        console.warn('格式化项目失败:', error, item);
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

  // 新增：颜色过滤和标签过滤逻辑
  shouldIncludeItem(item, filterColors, filterTags) {
    // 颜色过滤
    if (filterColors && filterColors.length > 0 && item.color) {
      const colorName = this.colorMapping[item.color] || item.color;
      if (!filterColors.includes(colorName)) {
        return false;
      }
    }

    // 标签过滤
    if (filterTags && filterTags.length > 0) {
      const itemTags = [...(item.tags || []), ...(item.documentTags || [])];
      const hasMatchingTag = filterTags.some(filterTag => 
        itemTags.some(tag => tag.toLowerCase().includes(filterTag.toLowerCase()))
      );
      if (!hasMatchingTag) {
        return false;
      }
    }

    return true;
  }

  // 新增：生成 Zotero 深度链接
  generateZoteroUrl(item) {
    if (!item.key || !this.libraryId) return null;
    
    // 生成 zotero://select/library/items/[itemKey] 格式的链接
    const libraryPath = this.libraryType === 'group' ? `groups/${this.libraryId}` : 'library';
    return `zotero://select/${libraryPath}/items/${item.key}`;
  }

  // 新增：获取最大版本号（用于增量同步）
  getMaxVersion(items) {
    if (!items || items.length === 0) return 0;
    return Math.max(...items.map(item => item.version || 0));
  }
}

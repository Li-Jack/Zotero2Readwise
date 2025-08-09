/**
 * Zotero to Readwise Mapper
 * 字段映射：Zotero 注释/条目 → Readwise book/highlight
 */

import { ItemWithAnnotations, ZoteroItem, ZoteroAnnotation } from '../../adapters/zoteroAdapter/types';
import { ReadwiseBook, ReadwiseHighlight } from '../../api/readwiseClient/types';
import { hash } from '../../utils/hash';
import { Logger } from '../../utils/logger';
import { getPref } from '../../utils/prefs';

/**
 * Mapper configuration options
 */
export interface MapperOptions {
  /** Include deep links back to Zotero annotations */
  includeDeepLinks?: boolean;
  /** Convert colors to tags */
  colorToTags?: boolean;
  /** Include collection names as tags */
  collectionTags?: boolean;
  /** Maximum text length for highlights */
  maxTextLength?: number;
  /** Maximum note length */
  maxNoteLength?: number;
  /** Preserve academic symbols and formatting */
  preserveFormatting?: boolean;
  /** Clean and normalize text */
  normalizeText?: boolean;
}

export class ZoteroToReadwiseMapper {
  private readonly logger: Logger;
  private readonly options: MapperOptions;

  constructor(logger: Logger, options?: MapperOptions) {
    this.logger = logger;
    this.options = {
      includeDeepLinks: true,
      colorToTags: false,
      collectionTags: false,
      maxTextLength: 5000,
      maxNoteLength: 2000,
      preserveFormatting: true,
      normalizeText: true,
      ...options
    };
  }

  /**
   * 映射 Zotero 条目到 Readwise 格式
   */
  async mapItem(itemWithAnnotations: ItemWithAnnotations): Promise<MappedItem | null> {
    const { item, annotations } = itemWithAnnotations;

    try {
      const book = this.mapToBook(item);
      const highlights = this.mapToHighlights(annotations, item);
      const itemHash = this.calculateHash(itemWithAnnotations);

      return {
        sourceId: item.id,
        book,
        highlights,
        hash: itemHash
      };
    } catch (error) {
      this.logger.error(`Failed to map item ${item.id}:`, error);
      return null;
    }
  }

  /**
   * 映射 Zotero 条目到 Readwise 书籍
   */
  private mapToBook(item: ZoteroItem): Partial<ReadwiseBook> {
    const authors = item.authors.join(', ');
    
    // 根据条目类型确定类别
    const category = this.mapItemTypeToCategory(item.type);
    
    // 构建唯一 URL（用于 Readwise 去重）
    const uniqueUrl = this.buildUniqueUrl(item);

    return {
      title: item.title || 'Untitled',
      author: authors || 'Unknown Author',
      category: category,
      source: 'zotero',
      unique_url: uniqueUrl,
      book_tags: item.tags,
      document_note: item.abstractNote,
      source_id: item.id,
      source_type: 'zotero',
      // 如果有 DOI，添加到封面图片 URL（可选）
      cover_image_url: item.doi ? `https://doi.org/${item.doi}` : undefined
    };
  }

  /**
   * 映射 Zotero 注释到 Readwise 高亮
   */
  private mapToHighlights(annotations: ZoteroAnnotation[], item: ZoteroItem): Partial<ReadwiseHighlight>[] {
    return annotations.map(annotation => {
      // 组合注释文本和评论
      let text = annotation.text;
      let note = annotation.comment;

      // 对于纯笔记类型，将内容作为高亮文本
      if (annotation.type === 'note' && !text) {
        text = annotation.comment || annotation.text;
        note = '';
      }

      // 规范化和清洗文本
      if (this.options.normalizeText) {
        text = this.normalizeText(text);
        note = this.normalizeText(note);
      }

      // 控制文本长度
      if (text && this.options.maxTextLength) {
        text = this.truncateText(text, this.options.maxTextLength);
      }
      if (note && this.options.maxNoteLength) {
        note = this.truncateText(note, this.options.maxNoteLength);
      }

      // 构建深链回跳 URL
      let deepLinkUrl: string | undefined;
      if (this.options.includeDeepLinks) {
        deepLinkUrl = this.buildAnnotationDeepLink(item, annotation);
        // 将深链添加到 note 末尾，格式化为 Markdown 链接
        if (deepLinkUrl) {
          const linkText = `\n\nOpen in Zotero: ${deepLinkUrl}`;
          note = note ? `${note}${linkText}` : linkText;
        }
      }

      // 映射颜色到 Readwise 支持的格式
      const color = this.mapAnnotationColor(annotation.color);

      // 构建标签列表
      let tags = [...(annotation.tags || [])];
      
      // 将颜色转为标签（可选）
      if (this.options.colorToTags && color) {
        tags.push(`color:${color}`);
      }

      // 构建位置信息
      const location = annotation.pageNumber || 
                       (annotation.position?.pageIndex ? annotation.position.pageIndex + 1 : undefined);
      const locationType = location ? 'page' : undefined;

      return {
        text: text || '',
        note: note,
        location: location,
        location_type: locationType,
        highlighted_at: annotation.dateModified?.toISOString() || annotation.dateCreated.toISOString(),
        tags: tags,
        color: color,
        source_id: item.id,
        source_annotation_id: annotation.id,
        // 使用深链 URL 或条目 URL
        url: deepLinkUrl || item.url || undefined
      };
    }).filter(h => h.text && h.text.length > 0); // 过滤空高亮
  }

  /**
   * 映射条目类型到 Readwise 类别
   */
  private mapItemTypeToCategory(itemType: string): string {
    const categoryMap: Record<string, string> = {
      'journalArticle': 'articles',
      'book': 'books',
      'bookSection': 'books',
      'conferencePaper': 'articles',
      'thesis': 'articles',
      'report': 'articles',
      'webpage': 'articles',
      'blogPost': 'articles',
      'magazineArticle': 'articles',
      'newspaperArticle': 'articles',
      'audioRecording': 'podcasts',
      'podcast': 'podcasts',
      'videoRecording': 'videos',
      'film': 'videos',
      'tvBroadcast': 'videos',
      'radioBroadcast': 'podcasts',
      'email': 'emails',
      'tweet': 'tweets'
    };

    return categoryMap[itemType] || 'articles';
  }

  /**
   * 映射注释颜色
   */
  private mapAnnotationColor(zoteroColor: string): string {
    if (!zoteroColor) return '';

    // Zotero 使用 RGB 或预定义颜色
    const colorMap: Record<string, string> = {
      '#ffd400': 'yellow',
      '#ff6666': 'red',
      '#5fb236': 'green',
      '#2ea8e5': 'blue',
      '#a28ae5': 'purple',
      '#e56eee': 'pink',
      '#f19837': 'orange',
      '#aaaaaa': 'gray'
    };

    return colorMap[zoteroColor.toLowerCase()] || zoteroColor;
  }

  /**
   * 构建唯一 URL
   */
  private buildUniqueUrl(item: ZoteroItem): string {
    // 优先使用 DOI
    if (item.doi) {
      return `https://doi.org/${item.doi}`;
    }

    // 其次使用原始 URL
    if (item.url) {
      return item.url;
    }

    // 最后使用 Zotero URI
    return `zotero://select/library/${item.libraryId}/items/${item.key}`;
  }

  /**
   * 计算项目哈希值（用于去重）
   */
  calculateHash(itemWithAnnotations: ItemWithAnnotations): string {
    const { item, annotations } = itemWithAnnotations;
    
    const content = {
      id: item.id,
      title: item.title,
      modified: item.dateModified.toISOString(),
      annotations: annotations.map(a => ({
        id: a.id,
        text: a.text,
        comment: a.comment,
        modified: a.dateModified.toISOString()
      }))
    };

    return hash(JSON.stringify(content));
  }

  /**
   * 构建注释深链
   * 支持两种格式：
   * - 打开 PDF 并定位注释：zotero://open-pdf/library/items/{ITEM_KEY}?annotation={ANN_KEY}
   * - 选择父条目：zotero://select/library/items/{ITEM_KEY}
   */
  private buildAnnotationDeepLink(item: ZoteroItem, annotation: ZoteroAnnotation): string {
    // Extract annotation key from ID (format: "library_id:annotation_key")
    const annotationKey = annotation.id.split(':').pop() || annotation.id;
    
    // 如果有附件ID（PDF注释），生成open-pdf链接
    if (annotation.attachmentId) {
      // 使用附件key而不是item key来打开PDF
      const attachmentKey = annotation.attachmentId.split(':').pop() || annotation.attachmentId;
      return `zotero://open-pdf/library/items/${attachmentKey}?annotation=${annotationKey}`;
    }
    
    // 否则生成select链接（选择父条目）
    return `zotero://select/library/items/${item.key}`;
  }

  /**
   * 规范化文本
   * - 去除多余空白
   * - 保留学术符号
   * - 清理控制字符
   */
  private normalizeText(text: string | undefined): string {
    if (!text) return '';

    let normalized = text;

    // 移除控制字符（保留换行和制表符）
    normalized = normalized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // 规范化空白（多个空格/制表符变为单个空格）
    normalized = normalized.replace(/[ \t]+/g, ' ');

    // 规范化换行（多个换行变为两个）
    normalized = normalized.replace(/\n{3,}/g, '\n\n');

    // 移除行首尾空白
    normalized = normalized.split('\n').map(line => line.trim()).join('\n');

    // 移除整体首尾空白
    normalized = normalized.trim();

    // 如果需要保留格式，保留学术符号和特殊字符
    if (this.options.preserveFormatting) {
      // 保留数学符号、希腊字母、上下标等
      // 这里不做额外处理，保持原样
    }

    return normalized;
  }

  /**
   * 截断文本到指定长度
   * 在单词边界处截断，避免截断单词
   */
  private truncateText(text: string | undefined, maxLength: number): string {
    if (!text || text.length <= maxLength) return text || '';

    // 在最大长度附近找到单词边界
    let truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > maxLength * 0.8) {
      // 如果最后一个空格在80%位置之后，在此处截断
      truncated = truncated.substring(0, lastSpace);
    }

    // 添加省略号
    return truncated + '...';
  }

  /**
   * 批量映射
   */
  async mapBatch(items: ItemWithAnnotations[]): Promise<MappedItem[]> {
    const mapped: MappedItem[] = [];

    for (const item of items) {
      const result = await this.mapItem(item);
      if (result) {
        mapped.push(result);
      }
    }

    return mapped;
  }
}

export interface MappedItem {
  sourceId: string;
  book: Partial<ReadwiseBook>;
  highlights: Partial<ReadwiseHighlight>[];
  hash: string;
}

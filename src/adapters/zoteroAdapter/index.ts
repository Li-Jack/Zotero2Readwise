/**
 * Zotero Data Adapter
 * 访问 Zotero 数据：注释、条目、附件、元数据
 */

import { Logger } from '../../utils/logger';
import { BasicTool } from 'zotero-plugin-toolkit';
import { 
  ZoteroItem, 
  ZoteroAnnotation, 
  ZoteroAttachment,
  ZoteroCollection,
  ScanOptions,
  ItemWithAnnotations 
} from './types';
import { 
  AnnotationCollector,
  AnnotationPreferencesManager,
  type ItemWithAnnotations as NewItemWithAnnotations,
  type AnnotationScanOptions
} from '../../modules/annotations';

export class ZoteroAdapter {
  private readonly logger: Logger;
  private readonly Zotero: any; // Zotero global object
  private annotationCollector?: AnnotationCollector;
  private preferencesManager?: AnnotationPreferencesManager;
  private readonly ztoolkit?: BasicTool;

  constructor(logger: Logger, ztoolkit?: BasicTool) {
    this.logger = logger;
    // @ts-ignore - Zotero is a global in the plugin environment
    this.Zotero = window.Zotero || Zotero;
    this.ztoolkit = ztoolkit;
    
    // Initialize annotation components if toolkit is available
    if (ztoolkit) {
      this.annotationCollector = new AnnotationCollector(logger, ztoolkit);
      this.preferencesManager = new AnnotationPreferencesManager(logger);
    }
  }

  /**
   * 获取带有注释的条目
   * 支持新旧两种API，优先使用新的AnnotationCollector
   */
  async getItemsWithAnnotations(options: ScanOptions = {}): Promise<ItemWithAnnotations[]> {
    // 如果有新的注释采集器，使用它
    if (this.annotationCollector && this.preferencesManager) {
      this.logger.info('Using enhanced annotation collector...');
      
      // 转换选项格式
      const scanOptions: AnnotationScanOptions = {
        modifiedAfter: options.modifiedAfter,
        collections: options.collections,
        tags: options.tags,
        includeItemsWithoutAnnotations: options.includeItemsWithoutAnnotations,
        includeMyLibrary: true,
        includeGroupLibraries: false
      };
      
      // 如果有偏好设置，使用偏好设置
      const prefOptions = this.preferencesManager.toScanOptions();
      const mergedOptions = { ...prefOptions, ...scanOptions };
      
      // 收集注释
      const newResults = await this.annotationCollector.collectAnnotations(mergedOptions);
      
      // 转换为旧格式以保持兼容性
      return this.convertNewFormatToOld(newResults);
    }
    
    // 降级到原始实现
    this.logger.info('Scanning Zotero items with annotations (legacy mode)...');
    
    let items = await this.getItems(options);
    const results: ItemWithAnnotations[] = [];

    for (const item of items) {
      const annotations = await this.getAnnotationsForItem(item);
      
      if (annotations.length > 0 || options.includeItemsWithoutAnnotations) {
        results.push({
          item,
          annotations,
          attachments: await this.getAttachmentsForItem(item)
        });
      }
    }

    this.logger.info(`Found ${results.length} items with annotations`);
    return results;
  }

  /**
   * 使用新的注释采集器收集注释
   */
  async collectAnnotationsEnhanced(options?: AnnotationScanOptions): Promise<NewItemWithAnnotations[]> {
    if (!this.annotationCollector) {
      throw new Error('Annotation collector not initialized. Please provide ztoolkit.');
    }
    
    // 如果没有提供选项，使用偏好设置
    const scanOptions = options || (this.preferencesManager?.toScanOptions() ?? {});
    
    return await this.annotationCollector.collectAnnotations(scanOptions);
  }

  /**
   * 获取注释偏好管理器
   */
  getPreferencesManager(): AnnotationPreferencesManager | undefined {
    return this.preferencesManager;
  }

  /**
   * 转换新格式到旧格式（保持向后兼容）
   */
  private convertNewFormatToOld(newItems: NewItemWithAnnotations[]): ItemWithAnnotations[] {
    return newItems.map(newItem => ({
      item: {
        id: newItem.item.key,
        type: newItem.item.itemType,
        title: newItem.item.title,
        authors: newItem.item.creators
          .filter(c => c.creatorType === 'author')
          .map(c => {
            if (c.firstName && c.lastName) {
              return `${c.firstName} ${c.lastName}`;
            }
            return c.lastName || c.name || '';
          }),
        publicationTitle: newItem.item.publicationTitle || '',
        date: newItem.item.date,
        doi: newItem.item.DOI || '',
        isbn: '',
        url: newItem.item.url || '',
        abstractNote: newItem.item.abstractNote || '',
        tags: newItem.item.tags.map(t => t.tag),
        collections: [],
        dateAdded: new Date(),
        dateModified: new Date(),
        extra: '',
        libraryId: newItem.item.libraryID,
        key: newItem.item.key,
        version: 0
      },
      annotations: newItem.annotations.map(ann => ({
        id: ann.annotationKey,
        type: ann.type,
        text: ann.text,
        comment: ann.comment,
        color: ann.color,
        pageNumber: ann.pageIndex,
        sortIndex: parseInt(ann.sortIndex) || 0,
        dateCreated: ann.dateCreated,
        dateModified: ann.dateModified,
        tags: ann.tags,
        itemId: ann.parentItemKey,
        attachmentId: ann.attachmentKey,
        position: ann.position
      })),
      attachments: newItem.attachments.map(att => ({
        id: att.key,
        title: att.title,
        filename: att.filename,
        contentType: att.contentType,
        path: att.path || '',
        url: att.url || '',
        dateAdded: att.dateAdded,
        dateModified: att.dateModified,
        parentItemId: att.parentItemKey
      }))
    }));
  }

  /**
   * 获取 Zotero 条目
   */
  private async getItems(options: ScanOptions): Promise<ZoteroItem[]> {
    let search = new this.Zotero.Search();
    
    // 设置搜索条件
    if (options.modifiedAfter) {
      search.addCondition('dateModified', 'isAfter', options.modifiedAfter.toISOString());
    }

    if (options.collections && options.collections.length > 0) {
      for (const collectionId of options.collections) {
        search.addCondition('collection', 'is', collectionId);
      }
    }

    if (options.tags && options.tags.length > 0) {
      for (const tag of options.tags) {
        search.addCondition('tag', 'is', tag);
      }
    }

    // 排除垃圾箱中的项目
    search.addCondition('deleted', 'is', 'false');
    
    // 只获取顶级条目（不包括附件和注释）
    search.addCondition('itemType', 'isNot', 'attachment');
    search.addCondition('itemType', 'isNot', 'annotation');
    search.addCondition('itemType', 'isNot', 'note');

    const itemIds = await search.search();
    const items: ZoteroItem[] = [];

    for (const id of itemIds) {
      const item = await this.Zotero.Items.getAsync(id);
      if (item) {
        items.push(this.mapZoteroItem(item));
      }
    }

    return items;
  }

  /**
   * 获取条目的注释
   */
  private async getAnnotationsForItem(item: ZoteroItem): Promise<ZoteroAnnotation[]> {
    const annotations: ZoteroAnnotation[] = [];
    
    // 获取条目的所有 PDF 附件
    const attachments = await this.getAttachmentsForItem(item);
    
    for (const attachment of attachments) {
      if (attachment.contentType === 'application/pdf') {
        const pdfAnnotations = await this.getAnnotationsForAttachment(attachment.id);
        annotations.push(...pdfAnnotations);
      }
    }

    // 获取条目的笔记
    const notes = await this.getNotesForItem(item.id);
    for (const note of notes) {
      annotations.push({
        id: note.id,
        type: 'note',
        text: note.content,
        comment: '',
        color: '',
        pageNumber: 0,
        sortIndex: 0,
        dateCreated: note.dateCreated,
        dateModified: note.dateModified,
        tags: note.tags || [],
        itemId: item.id,
        attachmentId: ''
      });
    }

    return annotations;
  }

  /**
   * 获取附件的注释
   */
  private async getAnnotationsForAttachment(attachmentId: string): Promise<ZoteroAnnotation[]> {
    const annotations: ZoteroAnnotation[] = [];
    
    try {
      const attachment = await this.Zotero.Items.getAsync(attachmentId);
      if (!attachment) return annotations;

      // 获取 PDF 注释
      const pdfAnnotations = attachment.getAnnotations();
      
      for (const annotation of pdfAnnotations) {
        const annotationData = annotation.toJSON();
        
        annotations.push({
          id: annotationData.key,
          type: annotationData.annotationType || 'highlight',
          text: annotationData.annotationText || '',
          comment: annotationData.annotationComment || '',
          color: annotationData.annotationColor || '',
          pageNumber: annotationData.annotationPageLabel || annotationData.annotationPosition?.pageIndex || 0,
          sortIndex: annotationData.annotationSortIndex || 0,
          dateCreated: new Date(annotationData.dateAdded),
          dateModified: new Date(annotationData.dateModified),
          tags: annotationData.tags || [],
          itemId: attachment.parentItemID,
          attachmentId: attachmentId,
          position: annotationData.annotationPosition
        });
      }
    } catch (error) {
      this.logger.error(`Failed to get annotations for attachment ${attachmentId}:`, error);
    }

    return annotations;
  }

  /**
   * 获取条目的附件
   */
  private async getAttachmentsForItem(item: ZoteroItem): Promise<ZoteroAttachment[]> {
    const attachments: ZoteroAttachment[] = [];
    
    try {
      const zoteroItem = await this.Zotero.Items.getAsync(item.id);
      if (!zoteroItem) return attachments;

      const itemAttachments = await zoteroItem.getAttachments();
      
      for (const attachmentId of itemAttachments) {
        const attachment = await this.Zotero.Items.getAsync(attachmentId);
        if (attachment) {
          const attachmentData = attachment.toJSON();
          
          attachments.push({
            id: attachmentData.key,
            title: attachmentData.title || '',
            filename: attachmentData.filename || '',
            contentType: attachmentData.contentType || '',
            path: attachmentData.path || '',
            url: attachmentData.url || '',
            dateAdded: new Date(attachmentData.dateAdded),
            dateModified: new Date(attachmentData.dateModified),
            parentItemId: item.id
          });
        }
      }
    } catch (error) {
      this.logger.error(`Failed to get attachments for item ${item.id}:`, error);
    }

    return attachments;
  }

  /**
   * 获取条目的笔记
   */
  private async getNotesForItem(itemId: string): Promise<any[]> {
    const notes = [];
    
    try {
      const item = await this.Zotero.Items.getAsync(itemId);
      if (!item) return notes;

      const noteIds = await item.getNotes();
      
      for (const noteId of noteIds) {
        const note = await this.Zotero.Items.getAsync(noteId);
        if (note) {
          const noteData = note.toJSON();
          notes.push({
            id: noteData.key,
            content: noteData.note || '',
            dateCreated: new Date(noteData.dateAdded),
            dateModified: new Date(noteData.dateModified),
            tags: noteData.tags || []
          });
        }
      }
    } catch (error) {
      this.logger.error(`Failed to get notes for item ${itemId}:`, error);
    }

    return notes;
  }

  /**
   * 映射 Zotero 条目到内部格式
   */
  private mapZoteroItem(zoteroItem: any): ZoteroItem {
    const data = zoteroItem.toJSON();
    
    return {
      id: data.key,
      type: data.itemType,
      title: data.title || '',
      authors: this.extractAuthors(data.creators),
      publicationTitle: data.publicationTitle || data.bookTitle || '',
      date: data.date || '',
      doi: data.DOI || '',
      isbn: data.ISBN || '',
      url: data.url || '',
      abstractNote: data.abstractNote || '',
      tags: data.tags?.map((t: any) => t.tag) || [],
      collections: [], // Will be populated separately if needed
      dateAdded: new Date(data.dateAdded),
      dateModified: new Date(data.dateModified),
      extra: data.extra || '',
      libraryId: zoteroItem.libraryID,
      key: data.key,
      version: data.version
    };
  }

  /**
   * 提取作者信息
   */
  private extractAuthors(creators: any[]): string[] {
    if (!creators || !Array.isArray(creators)) return [];
    
    return creators
      .filter(c => c.creatorType === 'author')
      .map(c => {
        if (c.firstName && c.lastName) {
          return `${c.firstName} ${c.lastName}`;
        }
        return c.lastName || c.name || '';
      })
      .filter(name => name.length > 0);
  }

  /**
   * 获取集合列表
   */
  async getCollections(): Promise<ZoteroCollection[]> {
    const collections: ZoteroCollection[] = [];
    
    try {
      const allCollections = await this.Zotero.Collections.getAll();
      
      for (const collection of allCollections) {
        const data = collection.toJSON();
        collections.push({
          id: data.key,
          name: data.name,
          parentId: data.parentCollection || null
        });
      }
    } catch (error) {
      this.logger.error('Failed to get collections:', error);
    }

    return collections;
  }

  /**
   * 获取标签列表
   */
  async getTags(): Promise<string[]> {
    try {
      const tags = await this.Zotero.Tags.getAll();
      return tags.map((tag: any) => tag.name);
    } catch (error) {
      this.logger.error('Failed to get tags:', error);
      return [];
    }
  }
}

export * from './types';

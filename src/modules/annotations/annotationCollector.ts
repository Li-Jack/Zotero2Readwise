/**
 * Annotation Collector Module
 * 完整的 Zotero 注释采集实现，支持高亮和文字笔记
 * MVP 版本 - 图像框选留作后续版本
 */

import { Logger } from '../../utils/logger';
import { BasicTool } from 'zotero-plugin-toolkit';

/**
 * 注释类型定义
 */
export type AnnotationType = 'highlight' | 'note' | 'image' | 'ink' | 'underline';

/**
 * 注释位置信息
 */
export interface AnnotationPosition {
  pageIndex: number;
  rects?: number[][];
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Zotero 注释实体
 */
export interface ZoteroAnnotationEntity {
  // 核心标识字段
  annotationKey: string;
  parentItemKey: string;
  attachmentKey: string;
  
  // 注释类型和内容
  type: AnnotationType;
  text: string;           // 高亮的文本内容
  comment: string;        // 用户添加的评论
  
  // 页面信息
  pageLabel?: string;     // 页面标签（如 "23"）
  pageIndex: number;      // 页面索引（从0开始）
  
  // 视觉属性
  color: string;          // 颜色代码（如 "#ff6666"）
  
  // 时间戳
  dateCreated: Date;
  dateModified: Date;
  
  // 位置信息
  position?: AnnotationPosition;
  sortIndex: string;      // 排序索引
  
  // 标签
  tags: string[];
}

/**
 * 父条目元数据
 */
export interface ParentItemMetadata {
  key: string;
  title: string;
  creators: Array<{
    firstName?: string;
    lastName?: string;
    name?: string;
    creatorType: string;
  }>;
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
  tags: Array<{ tag: string; type: number }>;
}

/**
 * PDF 附件信息
 */
export interface PDFAttachment {
  key: string;
  title: string;
  filename: string;
  contentType: string;
  path?: string;
  url?: string;
  dateAdded: Date;
  dateModified: Date;
  parentItemKey: string;
}

/**
 * 带注释的条目完整信息
 */
export interface ItemWithAnnotations {
  item: ParentItemMetadata;
  attachments: PDFAttachment[];
  annotations: ZoteroAnnotationEntity[];
}

/**
 * 扫描选项
 */
export interface AnnotationScanOptions {
  // 库选择
  includeMyLibrary?: boolean;        // 包含"我的文库"（默认true）
  includeGroupLibraries?: boolean;   // 包含群组库（默认false）
  specificLibraryIDs?: number[];     // 指定的库ID列表
  
  // 过滤条件
  modifiedAfter?: Date;              // 只获取此日期后修改的注释
  collections?: string[];             // 指定集合
  tags?: string[];                    // 指定标签
  
  // 注释类型过滤
  annotationTypes?: AnnotationType[]; // 要包含的注释类型（默认 ['highlight', 'note']）
  
  // 其他选项
  includeItemsWithoutAnnotations?: boolean; // 包含没有注释的条目
  excludeTrashed?: boolean;          // 排除垃圾箱中的项目（默认true）
}

/**
 * 注释采集器
 */
export class AnnotationCollector {
  private readonly logger: Logger;
  private readonly ztoolkit: BasicTool;
  private readonly Zotero: any;

  constructor(logger: Logger, ztoolkit: BasicTool) {
    this.logger = logger;
    this.ztoolkit = ztoolkit;
    // @ts-ignore - Zotero is a global in the plugin environment
    this.Zotero = window.Zotero || Zotero;
  }

  /**
   * 获取带注释的条目（主入口方法）
   */
  async collectAnnotations(options: AnnotationScanOptions = {}): Promise<ItemWithAnnotations[]> {
    const startTime = Date.now();
    this.logger.info('Starting annotation collection...', { options });

    // 设置默认选项
    const scanOptions = this.normalizeOptions(options);
    
    try {
      // 获取要扫描的库
      const libraries = await this.getTargetLibraries(scanOptions);
      this.logger.info(`Scanning ${libraries.length} libraries`);

      const allResults: ItemWithAnnotations[] = [];

      // 遍历每个库
      for (const library of libraries) {
        const libraryResults = await this.collectFromLibrary(library, scanOptions);
        allResults.push(...libraryResults);
      }

      const duration = Date.now() - startTime;
      this.logger.info(`Annotation collection completed in ${duration}ms`, {
        totalItems: allResults.length,
        totalAnnotations: allResults.reduce((sum, item) => sum + item.annotations.length, 0)
      });

      return allResults;
    } catch (error) {
      this.logger.error('Failed to collect annotations:', error);
      throw error;
    }
  }

  /**
   * 规范化扫描选项
   */
  private normalizeOptions(options: AnnotationScanOptions): Required<AnnotationScanOptions> {
    return {
      includeMyLibrary: options.includeMyLibrary ?? true,
      includeGroupLibraries: options.includeGroupLibraries ?? false,
      specificLibraryIDs: options.specificLibraryIDs ?? [],
      modifiedAfter: options.modifiedAfter,
      collections: options.collections ?? [],
      tags: options.tags ?? [],
      annotationTypes: options.annotationTypes ?? ['highlight', 'note'],
      includeItemsWithoutAnnotations: options.includeItemsWithoutAnnotations ?? false,
      excludeTrashed: options.excludeTrashed ?? true
    };
  }

  /**
   * 获取要扫描的库列表
   */
  private async getTargetLibraries(options: Required<AnnotationScanOptions>): Promise<any[]> {
    const libraries = [];

    if (options.specificLibraryIDs.length > 0) {
      // 使用指定的库
      for (const id of options.specificLibraryIDs) {
        const library = this.Zotero.Libraries.get(id);
        if (library) {
          libraries.push(library);
        }
      }
    } else {
      // 根据选项获取库
      if (options.includeMyLibrary) {
        const userLibrary = this.Zotero.Libraries.userLibrary;
        if (userLibrary) {
          libraries.push(userLibrary);
        }
      }

      if (options.includeGroupLibraries) {
        const groups = this.Zotero.Groups.getAll();
        for (const group of groups) {
          const groupLibrary = this.Zotero.Libraries.get(group.libraryID);
          if (groupLibrary) {
            libraries.push(groupLibrary);
          }
        }
      }
    }

    return libraries;
  }

  /**
   * 从特定库收集注释
   */
  private async collectFromLibrary(
    library: any, 
    options: Required<AnnotationScanOptions>
  ): Promise<ItemWithAnnotations[]> {
    this.logger.info(`Collecting from library: ${library.name} (ID: ${library.libraryID})`);

    // 构建搜索条件
    const search = new this.Zotero.Search();
    search.libraryID = library.libraryID;

    // 排除垃圾箱
    if (options.excludeTrashed) {
      search.addCondition('deleted', 'is', 'false');
    }

    // 只获取顶级条目（不包括附件和注释）
    search.addCondition('itemType', 'isNot', 'attachment');
    search.addCondition('itemType', 'isNot', 'annotation');
    search.addCondition('itemType', 'isNot', 'note');

    // 添加时间过滤
    if (options.modifiedAfter) {
      search.addCondition('dateModified', 'isAfter', options.modifiedAfter.toISOString());
    }

    // 添加集合过滤
    if (options.collections.length > 0) {
      for (const collectionKey of options.collections) {
        search.addCondition('collection', 'is', collectionKey);
      }
    }

    // 添加标签过滤
    if (options.tags.length > 0) {
      for (const tag of options.tags) {
        search.addCondition('tag', 'is', tag);
      }
    }

    // 执行搜索
    const itemIDs = await search.search();
    const results: ItemWithAnnotations[] = [];

    // 处理每个条目
    for (const itemID of itemIDs) {
      const itemResult = await this.processItem(itemID, options);
      if (itemResult) {
        results.push(itemResult);
      }
    }

    return results;
  }

  /**
   * 处理单个条目
   */
  private async processItem(
    itemID: number,
    options: Required<AnnotationScanOptions>
  ): Promise<ItemWithAnnotations | null> {
    try {
      const item = await this.Zotero.Items.getAsync(itemID);
      if (!item) return null;

      // 获取条目元数据
      const metadata = this.extractItemMetadata(item);

      // 获取PDF附件
      const attachments = await this.getItemAttachments(item);

      // 收集所有注释
      const annotations: ZoteroAnnotationEntity[] = [];

      // 从每个PDF附件获取注释
      for (const attachment of attachments) {
        if (attachment.contentType === 'application/pdf') {
          const pdfAnnotations = await this.getAttachmentAnnotations(
            attachment,
            metadata.key,
            options
          );
          annotations.push(...pdfAnnotations);
        }
      }

      // 获取条目级别的笔记（如果包含在注释类型中）
      if (options.annotationTypes.includes('note')) {
        const itemNotes = await this.getItemNotes(item, metadata.key);
        annotations.push(...itemNotes);
      }

      // 检查是否应该包含此条目
      if (annotations.length === 0 && !options.includeItemsWithoutAnnotations) {
        return null;
      }

      return {
        item: metadata,
        attachments,
        annotations
      };
    } catch (error) {
      this.logger.error(`Failed to process item ${itemID}:`, error);
      return null;
    }
  }

  /**
   * 提取条目元数据
   */
  private extractItemMetadata(item: any): ParentItemMetadata {
    const data = item.toJSON();
    
    return {
      key: data.key,
      title: data.title || '',
      creators: data.creators || [],
      date: data.date || '',
      DOI: data.DOI,
      url: data.url,
      publicationTitle: data.publicationTitle,
      journalAbbreviation: data.journalAbbreviation,
      volume: data.volume,
      issue: data.issue,
      pages: data.pages,
      abstractNote: data.abstractNote,
      itemType: data.itemType,
      libraryID: item.libraryID,
      groupID: item.libraryID > 1 ? item.libraryID : undefined,
      tags: data.tags || []
    };
  }

  /**
   * 获取条目的附件
   */
  private async getItemAttachments(item: any): Promise<PDFAttachment[]> {
    const attachments: PDFAttachment[] = [];
    const attachmentIDs = await item.getAttachments();

    for (const attachmentID of attachmentIDs) {
      const attachment = await this.Zotero.Items.getAsync(attachmentID);
      if (attachment) {
        const data = attachment.toJSON();
        attachments.push({
          key: data.key,
          title: data.title || '',
          filename: data.filename || '',
          contentType: data.contentType || '',
          path: data.path,
          url: data.url,
          dateAdded: new Date(data.dateAdded),
          dateModified: new Date(data.dateModified),
          parentItemKey: item.key
        });
      }
    }

    return attachments;
  }

  /**
   * 获取附件的注释
   */
  private async getAttachmentAnnotations(
    attachment: PDFAttachment,
    parentItemKey: string,
    options: Required<AnnotationScanOptions>
  ): Promise<ZoteroAnnotationEntity[]> {
    const annotations: ZoteroAnnotationEntity[] = [];

    try {
      const attachmentItem = this.Zotero.Items.getByLibraryAndKey(
        this.Zotero.Libraries.userLibraryID,
        attachment.key
      );

      if (!attachmentItem) return annotations;

      // 使用 Zotero 7 API 获取注释
      const annotationItems = attachmentItem.getAnnotations();

      for (const annotationItem of annotationItems) {
        const data = annotationItem.toJSON();
        
        // 检查注释类型是否在过滤列表中
        const annotationType = this.mapAnnotationType(data.annotationType);
        if (!options.annotationTypes.includes(annotationType)) {
          continue;
        }

        // 检查修改时间
        if (options.modifiedAfter && 
            new Date(data.dateModified) < options.modifiedAfter) {
          continue;
        }

        // 构建注释实体
        const annotation: ZoteroAnnotationEntity = {
          annotationKey: data.key,
          parentItemKey: parentItemKey,
          attachmentKey: attachment.key,
          type: annotationType,
          text: data.annotationText || '',
          comment: data.annotationComment || '',
          pageLabel: data.annotationPageLabel,
          pageIndex: data.annotationPosition?.pageIndex || 0,
          color: data.annotationColor || '#ffd400',
          dateCreated: new Date(data.dateAdded),
          dateModified: new Date(data.dateModified),
          position: this.extractPosition(data),
          sortIndex: data.annotationSortIndex || '00000',
          tags: data.tags?.map((t: any) => t.tag) || []
        };

        annotations.push(annotation);
      }
    } catch (error) {
      this.logger.error(`Failed to get annotations for attachment ${attachment.key}:`, error);
    }

    return annotations;
  }

  /**
   * 获取条目笔记
   */
  private async getItemNotes(item: any, parentItemKey: string): Promise<ZoteroAnnotationEntity[]> {
    const notes: ZoteroAnnotationEntity[] = [];
    const noteIDs = await item.getNotes();

    for (const noteID of noteIDs) {
      const note = await this.Zotero.Items.getAsync(noteID);
      if (note) {
        const data = note.toJSON();
        
        notes.push({
          annotationKey: data.key,
          parentItemKey: parentItemKey,
          attachmentKey: '', // 笔记没有附件
          type: 'note',
          text: data.note || '',
          comment: '',
          pageIndex: 0,
          color: '',
          dateCreated: new Date(data.dateAdded),
          dateModified: new Date(data.dateModified),
          sortIndex: '00000',
          tags: data.tags?.map((t: any) => t.tag) || []
        });
      }
    }

    return notes;
  }

  /**
   * 映射注释类型
   */
  private mapAnnotationType(zoteroType: string): AnnotationType {
    const typeMap: Record<string, AnnotationType> = {
      'highlight': 'highlight',
      'note': 'note',
      'image': 'image',
      'ink': 'ink',
      'underline': 'underline'
    };

    return typeMap[zoteroType] || 'highlight';
  }

  /**
   * 提取位置信息
   */
  private extractPosition(data: any): AnnotationPosition | undefined {
    if (!data.annotationPosition) return undefined;

    return {
      pageIndex: data.annotationPosition.pageIndex || 0,
      rects: data.annotationPosition.rects,
      position: data.annotationPosition.position
    };
  }

  /**
   * 获取库统计信息
   */
  async getLibraryStatistics(libraryID?: number): Promise<{
    totalItems: number;
    totalAttachments: number;
    totalAnnotations: number;
    annotationsByType: Record<AnnotationType, number>;
  }> {
    const library = libraryID 
      ? this.Zotero.Libraries.get(libraryID) 
      : this.Zotero.Libraries.userLibrary;

    if (!library) {
      throw new Error(`Library ${libraryID} not found`);
    }

    // 获取统计信息
    const search = new this.Zotero.Search();
    search.libraryID = library.libraryID;
    
    // 统计条目
    search.addCondition('itemType', 'isNot', 'attachment');
    search.addCondition('itemType', 'isNot', 'annotation');
    search.addCondition('itemType', 'isNot', 'note');
    const itemIDs = await search.search();

    // 统计附件和注释
    let totalAttachments = 0;
    let totalAnnotations = 0;
    const annotationsByType: Record<AnnotationType, number> = {
      highlight: 0,
      note: 0,
      image: 0,
      ink: 0,
      underline: 0
    };

    for (const itemID of itemIDs) {
      const item = await this.Zotero.Items.getAsync(itemID);
      if (item) {
        const attachmentIDs = await item.getAttachments();
        totalAttachments += attachmentIDs.length;

        for (const attachmentID of attachmentIDs) {
          const attachment = await this.Zotero.Items.getAsync(attachmentID);
          if (attachment && attachment.isPDFAttachment()) {
            const annotations = attachment.getAnnotations();
            totalAnnotations += annotations.length;

            for (const annotation of annotations) {
              const type = this.mapAnnotationType(annotation.annotationType);
              annotationsByType[type]++;
            }
          }
        }

        // 统计笔记
        const noteIDs = await item.getNotes();
        totalAnnotations += noteIDs.length;
        annotationsByType.note += noteIDs.length;
      }
    }

    return {
      totalItems: itemIDs.length,
      totalAttachments,
      totalAnnotations,
      annotationsByType
    };
  }
}

export default AnnotationCollector;

/**
 * Zotero Adapter Types
 */

export interface ZoteroItem {
  id: string;
  type: string;
  title: string;
  authors: string[];
  publicationTitle: string;
  date: string;
  doi: string;
  isbn: string;
  url: string;
  abstractNote: string;
  tags: string[];
  collections: string[];
  dateAdded: Date;
  dateModified: Date;
  extra: string;
  libraryId: number;
  key: string;
  version: number;
}

export interface ZoteroAnnotation {
  id: string;
  type: 'highlight' | 'note' | 'image' | 'ink' | 'underline';
  text: string;
  comment: string;
  color: string;
  pageNumber: number;
  sortIndex: number;
  dateCreated: Date;
  dateModified: Date;
  tags: string[];
  itemId: string;
  attachmentId: string;
  position?: {
    pageIndex: number;
    rects: number[][];
  };
}

export interface ZoteroAttachment {
  id: string;
  title: string;
  filename: string;
  contentType: string;
  path: string;
  url: string;
  dateAdded: Date;
  dateModified: Date;
  parentItemId: string;
}

export interface ZoteroCollection {
  id: string;
  name: string;
  parentId: string | null;
}

export interface ScanOptions {
  modifiedAfter?: Date;
  collections?: string[];
  tags?: string[];
  includeItemsWithoutAnnotations?: boolean;
}

export interface ItemWithAnnotations {
  item: ZoteroItem;
  annotations: ZoteroAnnotation[];
  attachments: ZoteroAttachment[];
}

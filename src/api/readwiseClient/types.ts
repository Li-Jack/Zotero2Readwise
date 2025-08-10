/**
 * Readwise API Types
 */

export interface ReadwiseBook {
  id: string;
  title: string;
  author?: string;
  category?: string;
  source?: string;
  cover_image_url?: string;
  unique_url?: string;
  book_tags?: string[];
  document_note?: string;
  created_at?: string;
  updated_at?: string;
  // Custom fields for Zotero integration
  source_id?: string;
  source_type?: 'zotero';
}

export interface ReadwiseHighlight {
  id?: string;
  book_id?: string;
  text: string;
  note?: string;
  location?: number;
  location_type?: 'page' | 'location' | 'time';
  highlighted_at?: string;
  created_at?: string;
  updated_at?: string;
  tags?: string[];
  color?: string;
  url?: string;
  // Custom fields
  source_id?: string;
  source_annotation_id?: string;
}

export interface ReadwiseApiResponse<T> {
  count: number;
  next?: string;
  previous?: string;
  results: T[];
}

export interface ReadwiseClientConfig {
  apiToken: string;
  baseUrl?: string;
  maxRetries?: number;
  batchSize?: number;
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
  cache?: {
    enabled: boolean;
    maxSize?: number;
    ttlMinutes?: number;
  };
}

export interface UploadBatchResult {
  successful: Array<{
    sourceId: string;
    id: string;
    hash: string;
    highlights?: number;
  }>;
  failed: any[];
  errors: Error[];
}

export interface BulkHighlightsPayload {
  highlights: Array<{
    text: string;
    title?: string;
    author?: string;
    source_url?: string;
    source_type?: string;
    category?: string;
    note?: string;
    location?: number;
    location_type?: string;
    highlighted_at?: string;
    tags?: string[];
  }>;
}

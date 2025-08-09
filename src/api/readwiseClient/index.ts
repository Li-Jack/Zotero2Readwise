/**
 * Readwise API v2 Client
 * 实现速率限制、重试机制和批量操作
 */

import { Logger } from '../../utils/logger';
import { exponentialBackoff, RateLimiter } from './rateLimiter';
import { BookCache } from './bookCache';
import { 
  ReadwiseError,
  RateLimitError,
  AuthenticationError,
  ValidationError,
  NetworkError,
  ServerError
} from './errors';
import { 
  ReadwiseBook, 
  ReadwiseHighlight, 
  ReadwiseApiResponse,
  UploadBatchResult,
  ReadwiseClientConfig,
  BulkHighlightsPayload
} from './types';

export class ReadwiseClient {
  private readonly apiToken: string;
  private readonly baseUrl: string;
  private readonly logger: Logger;
  private readonly rateLimiter: RateLimiter;
  private readonly maxRetries: number;
  private readonly batchSize: number;
  private readonly bookCache?: BookCache;

  constructor(config: ReadwiseClientConfig, logger: Logger) {
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl || 'https://readwise.io/api/v2';
    this.logger = logger;
    this.maxRetries = config.maxRetries || 5; // Max 5 retries as per requirements
    this.batchSize = config.batchSize || 150; // 100-200 per batch
    
    // 初始化速率限制器 (Readwise API: 240 requests per minute)
    this.rateLimiter = new RateLimiter({
      maxRequests: config.rateLimit?.maxRequests || 240,
      windowMs: config.rateLimit?.windowMs || 60000
    });

    // Initialize book cache if enabled
    if (config.cache?.enabled) {
      this.bookCache = new BookCache(
        logger,
        config.cache.maxSize,
        config.cache.ttlMinutes
      );
    }
  }

  /**
   * 创建或更新书籍 (upsertBook)
   * 基于 title + authors + source_url 查询或创建书目
   */
  async upsertBook(book: Partial<ReadwiseBook>): Promise<string> {
    if (!book.title) {
      throw new ValidationError('Book title is required');
    }

    // Check cache first
    if (this.bookCache) {
      const cachedId = this.bookCache.get(
        book.title,
        book.author,
        book.unique_url || book.source_id
      );
      
      if (cachedId) {
        this.logger.debug(`Using cached book ID for: ${book.title}`);
        return cachedId;
      }
    }

    // Try to find existing book first
    try {
      const existingBooks = await this.getBooks({
        title: book.title,
        author: book.author,
        source_url: book.unique_url || book.source_id
      });

      if (existingBooks.results.length > 0) {
        const existingBook = existingBooks.results[0];
        
        // Cache the found book
        if (this.bookCache) {
          this.bookCache.set(existingBook);
        }
        
        this.logger.debug(`Found existing book: ${existingBook.title} (ID: ${existingBook.id})`);
        return existingBook.id;
      }
    } catch (error) {
      this.logger.warn('Error searching for existing book:', error);
      // Continue to create new book
    }

    // Create new book
    const newBook = await this.request<ReadwiseBook>('POST', '/books', book);
    
    // Cache the new book
    if (this.bookCache) {
      this.bookCache.set(newBook);
    }
    
    this.logger.info(`Created new book: ${newBook.title} (ID: ${newBook.id})`);
    return newBook.id;
  }

  /**
   * Get books with optional filters
   */
  async getBooks(params?: {
    title?: string;
    author?: string;
    source_url?: string;
    category?: string;
    page?: number;
  }): Promise<ReadwiseApiResponse<ReadwiseBook>> {
    const queryParams = new URLSearchParams();
    if (params?.title) queryParams.append('title', params.title);
    if (params?.author) queryParams.append('author', params.author);
    if (params?.source_url) queryParams.append('source_url', params.source_url);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.page) queryParams.append('page', params.page.toString());

    const query = queryParams.toString();
    return this.request<ReadwiseApiResponse<ReadwiseBook>>(
      'GET', 
      `/books${query ? `?${query}` : ''}`
    );
  }

  /**
   * 创建高亮
   */
  async createHighlight(highlight: Partial<ReadwiseHighlight>): Promise<ReadwiseHighlight> {
    return this.request<ReadwiseHighlight>('POST', '/highlights', highlight);
  }

  /**
   * 批量创建高亮 (bulkCreateHighlights)
   * 按批次创建高亮，支持按书目分组
   */
  async bulkCreateHighlights(
    highlights: Partial<ReadwiseHighlight>[],
    bookInfo?: { title?: string; author?: string; source_url?: string }
  ): Promise<ReadwiseHighlight[]> {
    if (!highlights || highlights.length === 0) {
      return [];
    }

    const results: ReadwiseHighlight[] = [];
    const batches = this.createBatches(highlights, this.batchSize);
    
    this.logger.info(`Creating ${highlights.length} highlights in ${batches.length} batches`);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      this.logger.debug(`Processing batch ${i + 1}/${batches.length} with ${batch.length} highlights`);
      
      try {
        // Prepare bulk highlights payload
        const payload: BulkHighlightsPayload = {
          highlights: batch.map(h => ({
            text: h.text,
            title: bookInfo?.title,
            author: bookInfo?.author,
            source_url: bookInfo?.source_url || h.url,
            source_type: 'zotero',
            note: h.note,
            location: h.location,
            location_type: h.location_type,
            highlighted_at: h.highlighted_at,
            tags: h.tags
          }))
        };

        const batchResults = await this.request<ReadwiseHighlight[]>(
          'POST',
          '/highlights',
          payload
        );
        
        results.push(...(Array.isArray(batchResults) ? batchResults : []));
        
        // Add small delay between batches to avoid rate limiting
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        this.logger.error(`Batch ${i + 1} failed:`, error);
        throw error;
      }
    }

    return results;
  }

  /**
   * Create batches from array
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * 批量上传（书籍和高亮）
   */
  async uploadBatch(items: any[]): Promise<UploadBatchResult> {
    const result: UploadBatchResult = {
      successful: [],
      failed: [],
      errors: []
    };

    // Process items in batches to avoid overwhelming the API
    const itemBatches = this.createBatches(items, 10); // Process 10 items at a time
    
    for (const batch of itemBatches) {
      await Promise.all(
        batch.map(async (item) => {
          try {
            // 先创建或更新书籍
            let bookId: string | undefined;
            
            if (item.book) {
              bookId = await this.upsertBook(item.book);
              item.bookId = bookId;
            }

            // 然后创建高亮
            if (item.highlights && item.highlights.length > 0) {
              const highlights = await this.bulkCreateHighlights(
                item.highlights,
                item.book
              );
              
              result.successful.push({
                sourceId: item.sourceId,
                id: bookId || item.bookId,
                hash: item.hash,
                highlights: highlights.length
              });
            } else {
              result.successful.push({
                sourceId: item.sourceId,
                id: bookId || item.bookId,
                hash: item.hash,
                highlights: 0
              });
            }
          } catch (error) {
            this.logger.error(`Failed to upload item ${item.sourceId}:`, error);
            result.failed.push(item);
            result.errors.push(error as Error);
          }
        })
      );
      
      // Add delay between item batches
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return result;
  }

  /**
   * 验证上传
   */
  async verifyUpload(bookId: string): Promise<boolean> {
    try {
      const book = await this.getBook(bookId);
      return !!book;
    } catch {
      return false;
    }
  }

  /**
   * 获取书籍
   */
  async getBook(bookId: string): Promise<ReadwiseBook> {
    return this.request<ReadwiseBook>('GET', `/books/${bookId}`);
  }

  /**
   * 获取高亮列表
   */
  async getHighlights(params?: {
    book_id?: string;
    updated_after?: string;
    page?: number;
  }): Promise<ReadwiseApiResponse<ReadwiseHighlight>> {
    const queryParams = new URLSearchParams();
    if (params?.book_id) queryParams.append('book_id', params.book_id);
    if (params?.updated_after) queryParams.append('updated__gt', params.updated_after);
    if (params?.page) queryParams.append('page', params.page.toString());

    return this.request<ReadwiseApiResponse<ReadwiseHighlight>>(
      'GET', 
      `/highlights?${queryParams.toString()}`
    );
  }

  /**
   * 删除高亮
   */
  async deleteHighlight(highlightId: string): Promise<void> {
    return this.request<void>('DELETE', `/highlights/${highlightId}`);
  }

  /**
   * 执行 API 请求（带重试和速率限制）
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<T> {
    // 等待速率限制
    await this.rateLimiter.waitForSlot();

    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Token ${this.apiToken}`,
      'Content-Type': 'application/json'
    };

    let lastError: ReadwiseError | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        this.logger.debug(`API Request: ${method} ${url} (attempt ${attempt + 1}/${this.maxRetries})`);

        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined
        });

        // Handle rate limiting (429)
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
          
          if (attempt === this.maxRetries - 1) {
            throw new RateLimitError(retryAfter);
          }
          
          this.logger.warn(`Rate limited. Waiting ${retryAfter} seconds...`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          continue;
        }

        // Handle authentication errors (401)
        if (response.status === 401) {
          const errorText = await response.text();
          throw new AuthenticationError(`Authentication failed: ${errorText}`);
        }

        // Handle validation errors (400)
        if (response.status === 400) {
          const errorText = await response.text();
          throw new ValidationError(`Validation error: ${errorText}`);
        }

        // Handle server errors (5xx)
        if (response.status >= 500 && response.status < 600) {
          const errorText = await response.text();
          const error = new ServerError(response.status, `Server error: ${errorText}`);
          
          if (attempt === this.maxRetries - 1) {
            throw error;
          }
          
          lastError = error;
          const delay = exponentialBackoff(attempt, 1000, 8000, this.maxRetries);
          this.logger.warn(`Server error ${response.status}, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // Handle other non-OK responses
        if (!response.ok) {
          const errorText = await response.text();
          throw new ReadwiseError(`API Error ${response.status}: ${errorText}`, {
            status: response.status,
            retriable: false
          });
        }

        // Handle 204 No Content
        if (response.status === 204) {
          return undefined as any;
        }

        return await response.json();

      } catch (error) {
        // Handle network errors
        if (error instanceof TypeError && error.message.includes('fetch')) {
          const netError = new NetworkError(`Network error: ${error.message}`);
          
          if (attempt === this.maxRetries - 1) {
            throw netError;
          }
          
          lastError = netError;
          const delay = exponentialBackoff(attempt, 1000, 8000, this.maxRetries);
          this.logger.warn(`Network error, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // Re-throw ReadwiseError types
        if (error instanceof ReadwiseError) {
          throw error;
        }

        // Handle other errors
        lastError = new ReadwiseError(
          error instanceof Error ? error.message : 'Unknown error',
          { retriable: false }
        );
        
        if (attempt === this.maxRetries - 1) {
          throw lastError;
        }
        
        this.logger.warn(`Request failed (attempt ${attempt + 1}):`, error);
        const delay = exponentialBackoff(attempt, 1000, 8000, this.maxRetries);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError || new ReadwiseError('Request failed after all retries');
  }

  /**
   * 测试 API 连接
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.request('GET', '/auth');
      return true;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        this.logger.error('Invalid API token');
      } else {
        this.logger.error('API connection test failed:', error);
      }
      return false;
    }
  }

  /**
   * Clear book cache if enabled
   */
  clearCache(): void {
    if (this.bookCache) {
      this.bookCache.clear();
      this.logger.info('Book cache cleared');
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { enabled: boolean; stats?: any } {
    if (this.bookCache) {
      return {
        enabled: true,
        stats: this.bookCache.getStats()
      };
    }
    return { enabled: false };
  }
}

export * from './types';
export * from './rateLimiter';
export * from './errors';
export * from './bookCache';

/**
 * Book cache for Readwise API
 * Caches book IDs to reduce API calls
 */

import { Logger } from '../../utils/logger';
import { ReadwiseBook } from './types';

interface CachedBook {
  id: string;
  title: string;
  author?: string;
  source_url?: string;
  cached_at: number;
  last_accessed: number;
}

export class BookCache {
  private cache: Map<string, CachedBook> = new Map();
  private readonly maxSize: number;
  private readonly ttl: number; // Time to live in milliseconds
  private readonly logger: Logger;

  constructor(logger: Logger, maxSize: number = 1000, ttlMinutes: number = 60) {
    this.logger = logger;
    this.maxSize = maxSize;
    this.ttl = ttlMinutes * 60 * 1000;
  }

  /**
   * Generate cache key from book properties
   */
  private generateKey(title: string, author?: string, sourceUrl?: string): string {
    const parts = [
      title.toLowerCase().trim(),
      author?.toLowerCase().trim() || '',
      sourceUrl?.toLowerCase().trim() || ''
    ];
    return parts.join('|');
  }

  /**
   * Get book from cache
   */
  get(title: string, author?: string, sourceUrl?: string): string | undefined {
    const key = this.generateKey(title, author, sourceUrl);
    const cached = this.cache.get(key);
    
    if (!cached) {
      return undefined;
    }

    // Check if cache entry has expired
    if (Date.now() - cached.cached_at > this.ttl) {
      this.cache.delete(key);
      this.logger.debug(`Cache entry expired for key: ${key}`);
      return undefined;
    }

    // Update last accessed time
    cached.last_accessed = Date.now();
    this.logger.debug(`Cache hit for book: ${title}`);
    
    return cached.id;
  }

  /**
   * Add book to cache
   */
  set(book: ReadwiseBook): void {
    if (!book.title) {
      this.logger.warn('Cannot cache book without title');
      return;
    }

    const key = this.generateKey(
      book.title,
      book.author,
      book.unique_url || book.source_id
    );

    // Check cache size and evict LRU if necessary
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    const cached: CachedBook = {
      id: book.id,
      title: book.title,
      author: book.author,
      source_url: book.unique_url || book.source_id,
      cached_at: Date.now(),
      last_accessed: Date.now()
    };

    this.cache.set(key, cached);
    this.logger.debug(`Cached book: ${book.title} with ID: ${book.id}`);
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let lruKey: string | undefined;
    let lruTime = Date.now();

    for (const [key, value] of this.cache) {
      if (value.last_accessed < lruTime) {
        lruTime = value.last_accessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      this.logger.debug(`Evicted LRU cache entry: ${lruKey}`);
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.logger.debug('Book cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; ttl: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttl: this.ttl
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, value] of this.cache) {
      if (now - value.cached_at > this.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired cache entries`);
    }
  }
}

/**
 * Test file for Readwise API v2 Client
 * Usage: npm run test:readwise
 */

import { ReadwiseClient } from './index';
import { Logger } from '../../utils/logger';
import { ReadwiseClientConfig } from './types';

// Mock logger for testing
const mockLogger: Logger = {
  debug: (message: string, ...args: any[]) => console.debug(`[DEBUG] ${message}`, ...args),
  info: (message: string, ...args: any[]) => console.info(`[INFO] ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`[WARN] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args),
} as Logger;

async function testReadwiseClient() {
  console.log('=== Testing Readwise API v2 Client ===\n');

  // Configuration
  const config: ReadwiseClientConfig = {
    apiToken: process.env.READWISE_API_TOKEN || 'test_token',
    baseUrl: 'https://readwise.io/api/v2',
    maxRetries: 5,
    batchSize: 150,
    rateLimit: {
      maxRequests: 240,
      windowMs: 60000
    },
    cache: {
      enabled: true,
      maxSize: 1000,
      ttlMinutes: 60
    }
  };

  const client = new ReadwiseClient(config, mockLogger);

  try {
    // Test 1: Connection test
    console.log('Test 1: Testing API connection...');
    const isConnected = await client.testConnection();
    console.log(`Connection test result: ${isConnected ? 'SUCCESS' : 'FAILED'}\n`);

    if (!isConnected) {
      console.log('Please set READWISE_API_TOKEN environment variable to test with real API');
      return;
    }

    // Test 2: Upsert book
    console.log('Test 2: Testing book upsert...');
    const bookId = await client.upsertBook({
      title: 'Test Book from Zotero',
      author: 'Test Author',
      unique_url: 'https://example.com/test-book',
      category: 'articles',
      source_type: 'zotero'
    });
    console.log(`Book upserted with ID: ${bookId}\n`);

    // Test 3: Bulk create highlights
    console.log('Test 3: Testing bulk highlight creation...');
    const testHighlights = [
      {
        text: 'This is a test highlight from Zotero integration.',
        note: 'Test note 1',
        location: 42,
        location_type: 'page' as const,
        tags: ['test', 'zotero']
      },
      {
        text: 'Another test highlight to verify bulk creation.',
        note: 'Test note 2',
        location: 43,
        location_type: 'page' as const,
        tags: ['test', 'bulk']
      }
    ];

    const highlights = await client.bulkCreateHighlights(
      testHighlights,
      {
        title: 'Test Book from Zotero',
        author: 'Test Author',
        source_url: 'https://example.com/test-book'
      }
    );
    console.log(`Created ${highlights.length} highlights\n`);

    // Test 4: Get books
    console.log('Test 4: Testing book retrieval...');
    const books = await client.getBooks({
      title: 'Test Book from Zotero'
    });
    console.log(`Found ${books.count} book(s)\n`);

    // Test 5: Cache statistics
    console.log('Test 5: Testing cache functionality...');
    const cacheStats = client.getCacheStats();
    console.log('Cache stats:', cacheStats);
    
    // Test cache hit
    const cachedBookId = await client.upsertBook({
      title: 'Test Book from Zotero',
      author: 'Test Author',
      unique_url: 'https://example.com/test-book'
    });
    console.log(`Second upsert (should use cache): ${cachedBookId}\n`);

    // Test 6: Batch upload
    console.log('Test 6: Testing batch upload...');
    const batchItems = [
      {
        sourceId: 'zotero-item-1',
        hash: 'hash123',
        book: {
          title: 'Batch Test Book 1',
          author: 'Batch Author 1',
          source_url: 'https://example.com/batch-1'
        },
        highlights: [
          {
            text: 'Batch highlight 1',
            location: 1,
            location_type: 'page' as const
          }
        ]
      },
      {
        sourceId: 'zotero-item-2',
        hash: 'hash456',
        book: {
          title: 'Batch Test Book 2',
          author: 'Batch Author 2',
          source_url: 'https://example.com/batch-2'
        },
        highlights: [
          {
            text: 'Batch highlight 2',
            location: 2,
            location_type: 'page' as const
          }
        ]
      }
    ];

    const batchResult = await client.uploadBatch(batchItems);
    console.log(`Batch upload results:`);
    console.log(`  Successful: ${batchResult.successful.length}`);
    console.log(`  Failed: ${batchResult.failed.length}`);
    console.log(`  Errors: ${batchResult.errors.length}\n`);

    // Test 7: Clear cache
    console.log('Test 7: Clearing cache...');
    client.clearCache();
    console.log('Cache cleared\n');

    console.log('=== All tests completed successfully! ===');

  } catch (error) {
    console.error('Test failed:', error);
    
    // Check for specific error types
    if (error && typeof error === 'object' && 'retriable' in error) {
      console.log(`Error is retriable: ${error.retriable}`);
      if ('status' in error) {
        console.log(`HTTP status: ${error.status}`);
      }
      if ('retryAfter' in error) {
        console.log(`Retry after: ${error.retryAfter} seconds`);
      }
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testReadwiseClient().catch(console.error);
}

export { testReadwiseClient };

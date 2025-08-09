/**
 * Readwise Sync Integration Tests
 * 端到端测试完整的同步流程
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { ReadwiseSyncOrchestrator } from '../../src/core/readwiseSync';
import { ZoteroAdapter } from '../../src/adapters/zoteroAdapter';
import { ReadwiseClient } from '../../src/api/readwiseClient';
import { ZoteroToReadwiseMapper } from '../../src/mappers/zoteroToReadwise';
import { StateStore } from '../../src/storage/stateStore';
import { Logger } from '../../src/utils/logger';

// Mock dependencies
jest.mock('../../src/adapters/zoteroAdapter');
jest.mock('../../src/api/readwiseClient');
jest.mock('../../src/mappers/zoteroToReadwise');
jest.mock('../../src/storage/stateStore');

describe('Readwise Sync Integration', () => {
  let orchestrator: ReadwiseSyncOrchestrator;
  let mockZoteroAdapter: jest.Mocked<ZoteroAdapter>;
  let mockReadwiseClient: jest.Mocked<ReadwiseClient>;
  let mockMapper: jest.Mocked<ZoteroToReadwiseMapper>;
  let mockStateStore: jest.Mocked<StateStore>;
  let logger: Logger;

  beforeEach(() => {
    // Initialize mocks
    mockZoteroAdapter = new ZoteroAdapter() as jest.Mocked<ZoteroAdapter>;
    mockReadwiseClient = new ReadwiseClient('test-token') as jest.Mocked<ReadwiseClient>;
    mockMapper = new ZoteroToReadwiseMapper() as jest.Mocked<ZoteroToReadwiseMapper>;
    mockStateStore = new StateStore() as jest.Mocked<StateStore>;
    logger = new Logger({ prefix: '[Test]' });

    orchestrator = new ReadwiseSyncOrchestrator(
      mockZoteroAdapter,
      mockReadwiseClient,
      mockMapper,
      mockStateStore,
      logger
    );
  });

  describe('Complete sync workflow', () => {
    it('should sync highlights only', async () => {
      // Setup test data
      const mockAnnotations = [
        {
          key: 'ANNO1',
          type: 'highlight',
          text: 'Important highlight',
          color: 'yellow',
          page: 10,
          parentItem: { title: 'Test Paper', authors: ['Author 1'] }
        },
        {
          key: 'ANNO2',
          type: 'highlight',
          text: 'Another highlight',
          color: 'blue',
          page: 20,
          parentItem: { title: 'Test Paper', authors: ['Author 1'] }
        }
      ];

      // Mock Zotero adapter
      mockZoteroAdapter.getItemsWithAnnotations.mockResolvedValue(mockAnnotations);

      // Mock mapper
      mockMapper.mapItem.mockImplementation((item) => ({
        highlights: [{
          text: item.text,
          note: '',
          location: item.page,
          location_type: 'page',
          highlighted_at: new Date().toISOString(),
          color: item.color
        }],
        source_type: 'article',
        title: item.parentItem.title,
        author: item.parentItem.authors.join(', ')
      }));

      // Mock Readwise client
      mockReadwiseClient.uploadBatch.mockResolvedValue({
        successful: mockAnnotations.map(a => ({ id: a.key, status: 'created' })),
        failed: []
      });

      mockReadwiseClient.verifyUpload.mockResolvedValue(true);

      // Mock state store
      mockStateStore.getLastSyncTime.mockResolvedValue(null);
      mockStateStore.updateSyncState.mockResolvedValue(undefined);

      // Execute sync
      const result = await orchestrator.sync();

      // Verify results
      expect(result.success).toBe(true);
      expect(result.itemsSynced).toBe(2);
      expect(result.itemsFailed).toBe(0);

      // Verify calls
      expect(mockZoteroAdapter.getItemsWithAnnotations).toHaveBeenCalledTimes(1);
      expect(mockMapper.mapItem).toHaveBeenCalledTimes(2);
      expect(mockReadwiseClient.uploadBatch).toHaveBeenCalledTimes(1);
      expect(mockStateStore.updateSyncState).toHaveBeenCalled();
    });

    it('should sync notes only', async () => {
      const mockNotes = [
        {
          key: 'NOTE1',
          type: 'note',
          text: 'My thoughts on this',
          comment: 'Extended commentary',
          parentItem: { title: 'Research Article', authors: ['Smith, J.'] }
        }
      ];

      mockZoteroAdapter.getItemsWithAnnotations.mockResolvedValue(mockNotes);
      
      mockMapper.mapItem.mockImplementation((item) => ({
        highlights: [{
          text: item.text,
          note: item.comment,
          location_type: 'page',
          highlighted_at: new Date().toISOString()
        }],
        source_type: 'article',
        title: item.parentItem.title,
        author: item.parentItem.authors[0]
      }));

      mockReadwiseClient.uploadBatch.mockResolvedValue({
        successful: [{ id: 'NOTE1', status: 'created' }],
        failed: []
      });

      mockReadwiseClient.verifyUpload.mockResolvedValue(true);
      mockStateStore.getLastSyncTime.mockResolvedValue(null);

      const result = await orchestrator.sync();

      expect(result.success).toBe(true);
      expect(result.itemsSynced).toBe(1);
      expect(result.itemsFailed).toBe(0);
    });

    it('should handle mixed highlights and notes', async () => {
      const mockMixed = [
        {
          key: 'HIGH1',
          type: 'highlight',
          text: 'Highlighted text',
          color: 'yellow',
          parentItem: { title: 'Book', authors: ['Author'] }
        },
        {
          key: 'NOTE1',
          type: 'note',
          text: 'Note text',
          comment: 'My comment',
          parentItem: { title: 'Book', authors: ['Author'] }
        },
        {
          key: 'HIGH2',
          type: 'highlight',
          text: 'Another highlight',
          color: 'blue',
          parentItem: { title: 'Book', authors: ['Author'] }
        }
      ];

      mockZoteroAdapter.getItemsWithAnnotations.mockResolvedValue(mockMixed);
      
      mockMapper.mapItem.mockImplementation((item) => ({
        highlights: [{
          text: item.text,
          note: item.comment || '',
          location_type: 'page',
          highlighted_at: new Date().toISOString(),
          color: item.color
        }],
        source_type: 'book',
        title: item.parentItem.title,
        author: item.parentItem.authors[0]
      }));

      mockReadwiseClient.uploadBatch.mockResolvedValue({
        successful: mockMixed.map(m => ({ id: m.key, status: 'created' })),
        failed: []
      });

      mockReadwiseClient.verifyUpload.mockResolvedValue(true);
      mockStateStore.getLastSyncTime.mockResolvedValue(null);

      const result = await orchestrator.sync();

      expect(result.success).toBe(true);
      expect(result.itemsSynced).toBe(3);
      expect(mockMapper.mapItem).toHaveBeenCalledTimes(3);
    });
  });

  describe('Color mapping', () => {
    it('should apply color mapping when enabled', async () => {
      const mockColoredHighlights = [
        { key: 'H1', type: 'highlight', text: 'Text 1', color: '#ffd400', parentItem: { title: 'Doc' } },
        { key: 'H2', type: 'highlight', text: 'Text 2', color: '#ff6666', parentItem: { title: 'Doc' } },
        { key: 'H3', type: 'highlight', text: 'Text 3', color: '#5fb236', parentItem: { title: 'Doc' } },
        { key: 'H4', type: 'highlight', text: 'Text 4', color: '#2ea8e5', parentItem: { title: 'Doc' } },
        { key: 'H5', type: 'highlight', text: 'Text 5', color: '#a28ae5', parentItem: { title: 'Doc' } }
      ];

      mockZoteroAdapter.getItemsWithAnnotations.mockResolvedValue(mockColoredHighlights);
      
      // Mock color mapping
      const colorMap = {
        '#ffd400': 'yellow',
        '#ff6666': 'red',
        '#5fb236': 'green',
        '#2ea8e5': 'blue',
        '#a28ae5': 'purple'
      };

      mockMapper.mapItem.mockImplementation((item) => ({
        highlights: [{
          text: item.text,
          note: '',
          color: colorMap[item.color] || 'yellow',
          highlighted_at: new Date().toISOString()
        }],
        source_type: 'article',
        title: item.parentItem.title
      }));

      mockReadwiseClient.uploadBatch.mockResolvedValue({
        successful: mockColoredHighlights.map(h => ({ id: h.key, status: 'created' })),
        failed: []
      });

      mockReadwiseClient.verifyUpload.mockResolvedValue(true);
      mockStateStore.getLastSyncTime.mockResolvedValue(null);

      const result = await orchestrator.sync();

      expect(result.success).toBe(true);
      expect(result.itemsSynced).toBe(5);
      
      // Verify color mapping was applied
      const mappedItems = mockMapper.mapItem.mock.results;
      expect(mappedItems[0].value.highlights[0].color).toBe('yellow');
      expect(mappedItems[1].value.highlights[0].color).toBe('red');
      expect(mappedItems[2].value.highlights[0].color).toBe('green');
      expect(mappedItems[3].value.highlights[0].color).toBe('blue');
      expect(mappedItems[4].value.highlights[0].color).toBe('purple');
    });

    it('should handle color mapping disabled', async () => {
      const mockHighlight = [{
        key: 'H1',
        type: 'highlight',
        text: 'Text',
        color: '#ffd400',
        parentItem: { title: 'Doc' }
      }];

      mockZoteroAdapter.getItemsWithAnnotations.mockResolvedValue(mockHighlight);
      
      // Without color mapping, use original color
      mockMapper.mapItem.mockImplementation((item) => ({
        highlights: [{
          text: item.text,
          note: '',
          highlighted_at: new Date().toISOString()
          // No color field when mapping disabled
        }],
        source_type: 'article',
        title: item.parentItem.title
      }));

      mockReadwiseClient.uploadBatch.mockResolvedValue({
        successful: [{ id: 'H1', status: 'created' }],
        failed: []
      });

      mockReadwiseClient.verifyUpload.mockResolvedValue(true);
      mockStateStore.getLastSyncTime.mockResolvedValue(null);

      const result = await orchestrator.sync();

      expect(result.success).toBe(true);
      const mappedItem = mockMapper.mapItem.mock.results[0].value;
      expect(mappedItem.highlights[0].color).toBeUndefined();
    });
  });

  describe('Error handling and recovery', () => {
    it('should handle network errors with retry', async () => {
      const mockAnnotations = [{
        key: 'ANNO1',
        type: 'highlight',
        text: 'Test',
        parentItem: { title: 'Doc' }
      }];

      mockZoteroAdapter.getItemsWithAnnotations.mockResolvedValue(mockAnnotations);
      mockMapper.mapItem.mockReturnValue({ highlights: [{ text: 'Test' }] });

      // Simulate network error then success
      let attemptCount = 0;
      mockReadwiseClient.uploadBatch.mockImplementation(async () => {
        attemptCount++;
        if (attemptCount === 1) {
          const error: any = new Error('Network error');
          error.code = 'ECONNREFUSED';
          throw error;
        }
        return {
          successful: [{ id: 'ANNO1', status: 'created' }],
          failed: []
        };
      });

      mockReadwiseClient.verifyUpload.mockResolvedValue(true);
      mockStateStore.getLastSyncTime.mockResolvedValue(null);

      // Should retry and succeed
      const result = await orchestrator.sync();

      expect(attemptCount).toBe(2);
      expect(result.success).toBe(true);
    });

    it('should handle 429 rate limiting', async () => {
      const mockAnnotations = Array.from({ length: 100 }, (_, i) => ({
        key: `ANNO${i}`,
        type: 'highlight',
        text: `Highlight ${i}`,
        parentItem: { title: 'Large Document' }
      }));

      mockZoteroAdapter.getItemsWithAnnotations.mockResolvedValue(mockAnnotations);
      mockMapper.mapItem.mockImplementation(item => ({
        highlights: [{ text: item.text }]
      }));

      let batchCount = 0;
      mockReadwiseClient.uploadBatch.mockImplementation(async (batch) => {
        batchCount++;
        if (batchCount === 2) {
          // Simulate rate limit on second batch
          const error: any = new Error('Rate limited');
          error.statusCode = 429;
          error.response = {
            headers: { 'retry-after': '1' }
          };
          throw error;
        }
        return {
          successful: batch.map((_, i) => ({ id: `BATCH${batchCount}_${i}`, status: 'created' })),
          failed: []
        };
      });

      mockReadwiseClient.verifyUpload.mockResolvedValue(true);
      mockStateStore.getLastSyncTime.mockResolvedValue(null);

      // Should handle rate limiting
      try {
        await orchestrator.sync({ stopOnError: true });
      } catch (error: any) {
        expect(error.statusCode).toBe(429);
        expect(batchCount).toBe(2);
      }
    });

    it('should handle timeout errors', async () => {
      const mockAnnotations = [{
        key: 'ANNO1',
        type: 'highlight',
        text: 'Test',
        parentItem: { title: 'Doc' }
      }];

      mockZoteroAdapter.getItemsWithAnnotations.mockResolvedValue(mockAnnotations);
      mockMapper.mapItem.mockReturnValue({ highlights: [{ text: 'Test' }] });

      mockReadwiseClient.uploadBatch.mockImplementation(async () => {
        const error: any = new Error('Request timeout');
        error.code = 'ETIMEDOUT';
        throw error;
      });

      mockStateStore.getLastSyncTime.mockResolvedValue(null);

      await expect(orchestrator.sync({ stopOnError: true }))
        .rejects.toThrow('Request timeout');
    });

    it('should handle partial batch failures', async () => {
      const mockAnnotations = Array.from({ length: 10 }, (_, i) => ({
        key: `ANNO${i}`,
        type: 'highlight',
        text: `Highlight ${i}`,
        parentItem: { title: 'Doc' }
      }));

      mockZoteroAdapter.getItemsWithAnnotations.mockResolvedValue(mockAnnotations);
      mockMapper.mapItem.mockImplementation(item => ({
        highlights: [{ text: item.text }]
      }));

      // Simulate partial failures
      mockReadwiseClient.uploadBatch.mockResolvedValue({
        successful: mockAnnotations.slice(0, 7).map(a => ({ id: a.key, status: 'created' })),
        failed: mockAnnotations.slice(7).map(a => ({ 
          id: a.key, 
          error: 'Validation failed' 
        }))
      });

      mockReadwiseClient.verifyUpload.mockResolvedValue(true);
      mockStateStore.getLastSyncTime.mockResolvedValue(null);

      const result = await orchestrator.sync();

      expect(result.success).toBe(true);
      expect(result.itemsSynced).toBe(7);
      expect(result.itemsFailed).toBe(3);
    });
  });

  describe('Incremental sync', () => {
    it('should sync only new items since last sync', async () => {
      const lastSyncTime = new Date('2024-01-01T00:00:00Z');
      const newAnnotations = [
        {
          key: 'NEW1',
          type: 'highlight',
          text: 'New highlight',
          modifiedTime: new Date('2024-01-02T00:00:00Z'),
          parentItem: { title: 'Doc' }
        }
      ];

      mockStateStore.getLastSyncTime.mockResolvedValue(lastSyncTime);
      mockZoteroAdapter.getItemsWithAnnotations.mockImplementation(async (options) => {
        expect(options.modifiedAfter).toEqual(lastSyncTime);
        return newAnnotations;
      });

      mockMapper.mapItem.mockReturnValue({ highlights: [{ text: 'New highlight' }] });
      mockReadwiseClient.uploadBatch.mockResolvedValue({
        successful: [{ id: 'NEW1', status: 'created' }],
        failed: []
      });
      mockReadwiseClient.verifyUpload.mockResolvedValue(true);

      const result = await orchestrator.sync({ incremental: true });

      expect(result.success).toBe(true);
      expect(result.itemsSynced).toBe(1);
      expect(mockZoteroAdapter.getItemsWithAnnotations).toHaveBeenCalledWith(
        expect.objectContaining({ modifiedAfter: lastSyncTime })
      );
    });

    it('should handle state store migration after reinstall', async () => {
      // Simulate fresh install with no state
      mockStateStore.getLastSyncTime.mockResolvedValue(null);
      mockStateStore.getSyncedItems.mockResolvedValue(new Set());

      const allAnnotations = Array.from({ length: 50 }, (_, i) => ({
        key: `ANNO${i}`,
        type: 'highlight',
        text: `Highlight ${i}`,
        parentItem: { title: 'Doc' }
      }));

      mockZoteroAdapter.getItemsWithAnnotations.mockResolvedValue(allAnnotations);
      mockMapper.mapItem.mockImplementation(item => ({
        highlights: [{ text: item.text }]
      }));

      // Mock Readwise to indicate some items already exist
      mockReadwiseClient.uploadBatch.mockImplementation(async (batch) => {
        const results = batch.map((item, i) => {
          // First 20 items already exist
          if (i < 20) {
            return { id: item.id, status: 'already_exists' };
          }
          return { id: item.id, status: 'created' };
        });

        return {
          successful: results.filter(r => r.status === 'created'),
          failed: []
        };
      });

      mockReadwiseClient.verifyUpload.mockResolvedValue(true);

      const result = await orchestrator.sync();

      expect(result.success).toBe(true);
      // Only new items should be counted as synced
      expect(result.itemsSynced).toBeLessThan(50);
    });
  });

  describe('Batch processing', () => {
    it('should process large datasets in batches', async () => {
      const largeDataset = Array.from({ length: 237 }, (_, i) => ({
        key: `ANNO${i}`,
        type: i % 3 === 0 ? 'note' : 'highlight',
        text: `Content ${i}`,
        color: i % 2 === 0 ? 'yellow' : 'blue',
        parentItem: { title: `Document ${Math.floor(i / 10)}` }
      }));

      mockZoteroAdapter.getItemsWithAnnotations.mockResolvedValue(largeDataset);
      mockMapper.mapItem.mockImplementation(item => ({
        highlights: [{ text: item.text, color: item.color }]
      }));

      const uploadedBatches: number[] = [];
      mockReadwiseClient.uploadBatch.mockImplementation(async (batch) => {
        uploadedBatches.push(batch.length);
        return {
          successful: batch.map((_, i) => ({ id: `B${uploadedBatches.length}_${i}`, status: 'created' })),
          failed: []
        };
      });

      mockReadwiseClient.verifyUpload.mockResolvedValue(true);
      mockStateStore.getLastSyncTime.mockResolvedValue(null);

      const result = await orchestrator.sync({ batchSize: 50 });

      expect(result.success).toBe(true);
      expect(result.itemsSynced).toBe(237);
      expect(uploadedBatches).toEqual([50, 50, 50, 50, 37]);
    });

    it('should handle batch size configuration', async () => {
      const annotations = Array.from({ length: 25 }, (_, i) => ({
        key: `ANNO${i}`,
        type: 'highlight',
        text: `Text ${i}`,
        parentItem: { title: 'Doc' }
      }));

      mockZoteroAdapter.getItemsWithAnnotations.mockResolvedValue(annotations);
      mockMapper.mapItem.mockImplementation(item => ({
        highlights: [{ text: item.text }]
      }));

      const batchSizes: number[] = [];
      mockReadwiseClient.uploadBatch.mockImplementation(async (batch) => {
        batchSizes.push(batch.length);
        return {
          successful: batch.map((_, i) => ({ id: `${i}`, status: 'created' })),
          failed: []
        };
      });

      mockReadwiseClient.verifyUpload.mockResolvedValue(true);
      mockStateStore.getLastSyncTime.mockResolvedValue(null);

      // Test with custom batch size
      await orchestrator.sync({ batchSize: 10 });

      expect(batchSizes).toEqual([10, 10, 5]);
    });
  });

  describe('State persistence', () => {
    it('should update state store after successful sync', async () => {
      const mockAnnotations = [{
        key: 'ANNO1',
        type: 'highlight',
        text: 'Test',
        parentItem: { title: 'Doc' }
      }];

      mockZoteroAdapter.getItemsWithAnnotations.mockResolvedValue(mockAnnotations);
      mockMapper.mapItem.mockReturnValue({ highlights: [{ text: 'Test' }] });
      mockReadwiseClient.uploadBatch.mockResolvedValue({
        successful: [{ id: 'ANNO1', status: 'created' }],
        failed: []
      });
      mockReadwiseClient.verifyUpload.mockResolvedValue(true);
      mockStateStore.getLastSyncTime.mockResolvedValue(null);

      const syncTime = new Date();
      await orchestrator.sync();

      expect(mockStateStore.updateSyncState).toHaveBeenCalledWith(
        expect.objectContaining({
          successful: expect.arrayContaining([
            expect.objectContaining({ id: 'ANNO1' })
          ])
        })
      );
    });

    it('should recover from interrupted sync', async () => {
      // Simulate previous interrupted sync with partial state
      const partialSyncState = {
        lastSyncTime: new Date('2024-01-01T00:00:00Z'),
        syncedItems: new Set(['ANNO1', 'ANNO2']),
        pendingItems: ['ANNO3', 'ANNO4']
      };

      mockStateStore.getLastSyncTime.mockResolvedValue(partialSyncState.lastSyncTime);
      mockStateStore.getSyncedItems.mockResolvedValue(partialSyncState.syncedItems);
      mockStateStore.getPendingItems.mockResolvedValue(partialSyncState.pendingItems);

      const remainingAnnotations = [
        { key: 'ANNO3', type: 'highlight', text: 'Text 3', parentItem: { title: 'Doc' } },
        { key: 'ANNO4', type: 'highlight', text: 'Text 4', parentItem: { title: 'Doc' } }
      ];

      mockZoteroAdapter.getItemsWithAnnotations.mockResolvedValue(remainingAnnotations);
      mockMapper.mapItem.mockImplementation(item => ({
        highlights: [{ text: item.text }]
      }));

      mockReadwiseClient.uploadBatch.mockResolvedValue({
        successful: remainingAnnotations.map(a => ({ id: a.key, status: 'created' })),
        failed: []
      });
      mockReadwiseClient.verifyUpload.mockResolvedValue(true);

      const result = await orchestrator.sync({ incremental: true });

      expect(result.success).toBe(true);
      expect(result.itemsSynced).toBe(2);
    });
  });
});

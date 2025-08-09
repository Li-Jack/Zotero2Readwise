/**
 * Chunk Utility Unit Tests
 * 测试数组分块和批处理功能
 */

import { describe, it, expect, jest } from '@jest/globals';
import { chunk, processInChunks, processInChunksParallel } from '../../src/utils/chunk';

describe('Chunk Utility', () => {
  describe('chunk()', () => {
    it('should split array into chunks of specified size', () => {
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result = chunk(array, 3);
      
      expect(result).toEqual([
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
        [10]
      ]);
    });

    it('should handle chunk size equal to array length', () => {
      const array = [1, 2, 3, 4, 5];
      const result = chunk(array, 5);
      
      expect(result).toEqual([[1, 2, 3, 4, 5]]);
    });

    it('should handle chunk size larger than array length', () => {
      const array = [1, 2, 3];
      const result = chunk(array, 10);
      
      expect(result).toEqual([[1, 2, 3]]);
    });

    it('should handle empty array', () => {
      const result = chunk([], 5);
      expect(result).toEqual([]);
    });

    it('should throw error for invalid chunk size', () => {
      const array = [1, 2, 3];
      
      expect(() => chunk(array, 0)).toThrow('Chunk size must be greater than 0');
      expect(() => chunk(array, -1)).toThrow('Chunk size must be greater than 0');
    });

    it('should preserve original array', () => {
      const array = [1, 2, 3, 4, 5];
      const original = [...array];
      
      chunk(array, 2);
      
      expect(array).toEqual(original);
    });

    it('should work with different data types', () => {
      const strings = ['a', 'b', 'c', 'd'];
      const objects = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const mixed = [1, 'a', true, null, undefined];
      
      expect(chunk(strings, 2)).toEqual([['a', 'b'], ['c', 'd']]);
      expect(chunk(objects, 2)).toEqual([[{ id: 1 }, { id: 2 }], [{ id: 3 }]]);
      expect(chunk(mixed, 2)).toEqual([[1, 'a'], [true, null], [undefined]]);
    });

    it('should handle large arrays efficiently', () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i);
      const result = chunk(largeArray, 100);
      
      expect(result.length).toBe(100);
      expect(result[0].length).toBe(100);
      expect(result[99].length).toBe(100);
    });
  });

  describe('processInChunks()', () => {
    it('should process array in sequential chunks', async () => {
      const array = [1, 2, 3, 4, 5, 6];
      const processOrder: number[][] = [];
      
      const processor = jest.fn(async (chunk: number[]) => {
        processOrder.push(chunk);
        return chunk.map(x => x * 2);
      });
      
      const result = await processInChunks(array, 2, processor);
      
      expect(result).toEqual([2, 4, 6, 8, 10, 12]);
      expect(processOrder).toEqual([[1, 2], [3, 4], [5, 6]]);
      expect(processor).toHaveBeenCalledTimes(3);
    });

    it('should handle async errors gracefully', async () => {
      const array = [1, 2, 3, 4];
      
      const processor = jest.fn(async (chunk: number[]) => {
        if (chunk.includes(3)) {
          throw new Error('Processing error');
        }
        return chunk.map(x => x * 2);
      });
      
      await expect(processInChunks(array, 2, processor)).rejects.toThrow('Processing error');
      expect(processor).toHaveBeenCalledTimes(2);
    });

    it('should handle empty array', async () => {
      const processor = jest.fn(async (chunk: any[]) => chunk);
      const result = await processInChunks([], 5, processor);
      
      expect(result).toEqual([]);
      expect(processor).not.toHaveBeenCalled();
    });

    it('should process annotations in batches', async () => {
      const annotations = [
        { id: 1, text: 'highlight 1' },
        { id: 2, text: 'highlight 2' },
        { id: 3, text: 'note 1' },
        { id: 4, text: 'note 2' },
        { id: 5, text: 'highlight 3' }
      ];
      
      const uploadedBatches: any[][] = [];
      
      const uploadProcessor = async (batch: any[]) => {
        uploadedBatches.push(batch);
        // Simulate API response
        return batch.map(item => ({ ...item, uploaded: true }));
      };
      
      const result = await processInChunks(annotations, 2, uploadProcessor);
      
      expect(uploadedBatches).toHaveLength(3);
      expect(uploadedBatches[0]).toHaveLength(2);
      expect(uploadedBatches[2]).toHaveLength(1);
      expect(result).toHaveLength(5);
      expect(result.every(item => item.uploaded)).toBe(true);
    });
  });

  describe('processInChunksParallel()', () => {
    it('should process chunks with concurrency limit', async () => {
      const array = Array.from({ length: 10 }, (_, i) => i);
      const activePromises = new Set<number>();
      let maxConcurrent = 0;
      
      const processor = async (chunk: number[]) => {
        const id = Math.random();
        activePromises.add(id);
        maxConcurrent = Math.max(maxConcurrent, activePromises.size);
        
        // Simulate async work
        await new Promise(resolve => setTimeout(resolve, 10));
        
        activePromises.delete(id);
        return chunk.map(x => x * 2);
      };
      
      const result = await processInChunksParallel(array, 2, 3, processor);
      
      expect(result).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16, 18]);
      expect(maxConcurrent).toBeLessThanOrEqual(3);
    });

    it('should handle partial batch failures', async () => {
      const array = [1, 2, 3, 4, 5, 6];
      let callCount = 0;
      
      const processor = async (chunk: number[]) => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Batch 2 failed');
        }
        return chunk.map(x => x * 2);
      };
      
      await expect(
        processInChunksParallel(array, 2, 2, processor)
      ).rejects.toThrow('Batch 2 failed');
    });

    it('should respect concurrency limit', async () => {
      const array = Array.from({ length: 100 }, (_, i) => i);
      const concurrentExecutions: number[] = [];
      let currentlyExecuting = 0;
      
      const processor = async (chunk: number[]) => {
        currentlyExecuting++;
        concurrentExecutions.push(currentlyExecuting);
        
        await new Promise(resolve => setTimeout(resolve, 5));
        
        currentlyExecuting--;
        return chunk;
      };
      
      await processInChunksParallel(array, 10, 5, processor);
      
      const maxConcurrent = Math.max(...concurrentExecutions);
      expect(maxConcurrent).toBeLessThanOrEqual(5);
    });

    it('should handle edge case: single chunk', async () => {
      const array = [1, 2, 3];
      const processor = async (chunk: number[]) => chunk.map(x => x * 2);
      
      const result = await processInChunksParallel(array, 10, 5, processor);
      
      expect(result).toEqual([2, 4, 6]);
    });

    it('should process large datasets efficiently', async () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        data: `item_${i}`
      }));
      
      const processedIds = new Set<number>();
      
      const processor = async (chunk: any[]) => {
        return chunk.map(item => {
          processedIds.add(item.id);
          return { ...item, processed: true };
        });
      };
      
      const result = await processInChunksParallel(largeArray, 50, 10, processor);
      
      expect(result).toHaveLength(1000);
      expect(processedIds.size).toBe(1000);
      expect(result.every(item => item.processed)).toBe(true);
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle Readwise API batch upload simulation', async () => {
      const annotations = Array.from({ length: 237 }, (_, i) => ({
        id: `annotation_${i}`,
        text: `Highlight text ${i}`,
        color: i % 2 === 0 ? 'yellow' : 'blue'
      }));
      
      const uploadedBatches: any[] = [];
      const apiCallTimestamps: number[] = [];
      
      const mockReadwiseUpload = async (batch: any[]) => {
        apiCallTimestamps.push(Date.now());
        uploadedBatches.push(batch.length);
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Simulate 95% success rate
        return batch.map(item => ({
          ...item,
          uploaded: Math.random() > 0.05
        }));
      };
      
      const result = await processInChunks(annotations, 50, mockReadwiseUpload);
      
      expect(uploadedBatches).toEqual([50, 50, 50, 50, 37]);
      expect(result).toHaveLength(237);
      
      // Check that batches were processed sequentially
      for (let i = 1; i < apiCallTimestamps.length; i++) {
        expect(apiCallTimestamps[i] - apiCallTimestamps[i - 1]).toBeGreaterThanOrEqual(50);
      }
    });

    it('should handle rate limiting with chunk processing', async () => {
      const items = Array.from({ length: 20 }, (_, i) => i);
      let rateLimitHit = false;
      let retryCount = 0;
      
      const processor = async (chunk: number[]) => {
        // Simulate rate limit on 3rd batch
        if (!rateLimitHit && chunk[0] >= 10) {
          rateLimitHit = true;
          retryCount++;
          if (retryCount === 1) {
            throw new Error('Rate limit exceeded (429)');
          }
        }
        
        return chunk.map(x => x * 2);
      };
      
      // First attempt should fail
      await expect(
        processInChunks(items, 5, processor)
      ).rejects.toThrow('Rate limit exceeded');
      
      // Reset and retry
      rateLimitHit = false;
      retryCount = 0;
      
      // Add delay before retry
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should work on retry
      const result = await processInChunks(items, 5, processor);
      expect(result).toHaveLength(20);
    });
  });
});

/**
 * Retry Utility Unit Tests
 * 测试重试机制、错误分类、断路器和批量重试功能
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import {
  ErrorType,
  ErrorClassifier,
  RetryManager,
  CircuitBreaker,
  BatchRetryManager,
  CircuitBreakerState
} from '../../src/utils/retry';

describe('ErrorClassifier', () => {
  describe('classify()', () => {
    it('should classify network errors', () => {
      const errors = [
        { code: 'ECONNREFUSED' },
        { code: 'ENOTFOUND' },
        { code: 'ETIMEDOUT' },
        { message: 'network error occurred' },
        { message: 'fetch failed' }
      ];
      
      errors.forEach(error => {
        expect(ErrorClassifier.classify(error)).toBe(ErrorType.NETWORK);
      });
    });

    it('should classify rate limit errors', () => {
      const errors = [
        { statusCode: 429 },
        { response: { status: 429 } }
      ];
      
      errors.forEach(error => {
        expect(ErrorClassifier.classify(error)).toBe(ErrorType.RATE_LIMIT);
      });
    });

    it('should classify auth errors', () => {
      const errors = [
        { statusCode: 401 },
        { statusCode: 403 },
        { response: { status: 401 } },
        { response: { status: 403 } }
      ];
      
      errors.forEach(error => {
        expect(ErrorClassifier.classify(error)).toBe(ErrorType.AUTH_ERROR);
      });
    });

    it('should classify validation errors', () => {
      const errors = [
        { statusCode: 422 },
        { statusCode: 400 },
        { response: { status: 422 } },
        { response: { status: 400 } }
      ];
      
      errors.forEach(error => {
        expect(ErrorClassifier.classify(error)).toBe(ErrorType.VALIDATION);
      });
    });

    it('should classify server errors', () => {
      const errors = [
        { statusCode: 500 },
        { statusCode: 502 },
        { statusCode: 503 },
        { response: { status: 500 } }
      ];
      
      errors.forEach(error => {
        expect(ErrorClassifier.classify(error)).toBe(ErrorType.SERVER_ERROR);
      });
    });

    it('should return UNKNOWN for unrecognized errors', () => {
      const errors = [
        null,
        undefined,
        {},
        { randomProp: 'value' },
        'string error'
      ];
      
      errors.forEach(error => {
        expect(ErrorClassifier.classify(error)).toBe(ErrorType.UNKNOWN);
      });
    });
  });

  describe('isRetriable()', () => {
    it('should mark network errors as retriable', () => {
      expect(ErrorClassifier.isRetriable({ code: 'ECONNREFUSED' })).toBe(true);
    });

    it('should mark rate limit errors as retriable', () => {
      expect(ErrorClassifier.isRetriable({ statusCode: 429 })).toBe(true);
    });

    it('should mark server errors as retriable', () => {
      expect(ErrorClassifier.isRetriable({ statusCode: 500 })).toBe(true);
    });

    it('should NOT mark auth errors as retriable', () => {
      expect(ErrorClassifier.isRetriable({ statusCode: 401 })).toBe(false);
    });

    it('should NOT mark validation errors as retriable', () => {
      expect(ErrorClassifier.isRetriable({ statusCode: 422 })).toBe(false);
    });
  });

  describe('getRetryDelay()', () => {
    it('should extract Retry-After header for rate limits', () => {
      const error = {
        statusCode: 429,
        response: {
          headers: {
            'retry-after': '5'
          }
        }
      };
      
      const delay = ErrorClassifier.getRetryDelay(error, 1000);
      expect(delay).toBe(5000);
    });

    it('should double delay for rate limits without Retry-After', () => {
      const error = { statusCode: 429 };
      const delay = ErrorClassifier.getRetryDelay(error, 1000);
      expect(delay).toBe(2000);
    });

    it('should return base delay for other errors', () => {
      const error = { statusCode: 500 };
      const delay = ErrorClassifier.getRetryDelay(error, 1000);
      expect(delay).toBe(1000);
    });
  });
});

describe('RetryManager', () => {
  let retryManager: RetryManager;

  beforeEach(() => {
    retryManager = new RetryManager({
      maxRetries: 3,
      initialDelay: 100,
      maxDelay: 1000,
      backoffMultiplier: 2,
      jitter: false,
      timeout: 5000
    });
  });

  describe('execute()', () => {
    it('should succeed on first attempt', async () => {
      const fn = jest.fn(async () => 'success');
      
      const result = await retryManager.execute(fn);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      let attempts = 0;
      const fn = jest.fn(async () => {
        attempts++;
        if (attempts < 3) {
          throw { code: 'ECONNREFUSED' };
        }
        return 'success';
      });
      
      const result = await retryManager.execute(fn);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries', async () => {
      const fn = jest.fn(async () => {
        throw { code: 'ECONNREFUSED' };
      });
      
      await expect(retryManager.execute(fn)).rejects.toEqual({ code: 'ECONNREFUSED' });
      expect(fn).toHaveBeenCalledTimes(4); // initial + 3 retries
    });

    it('should not retry non-retriable errors', async () => {
      const fn = jest.fn(async () => {
        throw { statusCode: 401 };
      });
      
      await expect(retryManager.execute(fn)).rejects.toEqual({ statusCode: 401 });
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should use custom retry predicate', async () => {
      const fn = jest.fn(async () => {
        throw new Error('custom error');
      });
      
      const shouldRetry = (error: any) => error.message === 'custom error';
      
      await expect(retryManager.execute(fn, shouldRetry)).rejects.toThrow('custom error');
      expect(fn).toHaveBeenCalledTimes(4); // initial + 3 retries
    });

    it('should respect timeout', async () => {
      const manager = new RetryManager({ timeout: 100 });
      
      const fn = async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        return 'success';
      };
      
      await expect(manager.execute(fn)).rejects.toThrow('Operation timed out');
    });

    it('should apply exponential backoff', async () => {
      const delays: number[] = [];
      const startTime = Date.now();
      
      let attempts = 0;
      const fn = async () => {
        if (attempts > 0) {
          delays.push(Date.now() - startTime);
        }
        attempts++;
        if (attempts <= 3) {
          throw { code: 'ECONNREFUSED' };
        }
        return 'success';
      };
      
      await retryManager.execute(fn);
      
      // Check exponential backoff pattern (100, 200, 400)
      expect(delays[0]).toBeGreaterThanOrEqual(100);
      expect(delays[1]).toBeGreaterThanOrEqual(200);
      expect(delays[2]).toBeGreaterThanOrEqual(400);
    });

    it('should apply jitter when enabled', async () => {
      const manager = new RetryManager({
        maxRetries: 5,
        initialDelay: 100,
        jitter: true
      });
      
      const delays: number[] = [];
      let lastAttemptTime = Date.now();
      
      let attempts = 0;
      const fn = async () => {
        const now = Date.now();
        if (attempts > 0) {
          delays.push(now - lastAttemptTime);
        }
        lastAttemptTime = now;
        attempts++;
        
        if (attempts <= 5) {
          throw { code: 'ECONNREFUSED' };
        }
        return 'success';
      };
      
      await manager.execute(fn);
      
      // With jitter, delays should vary
      const uniqueDelays = new Set(delays);
      expect(uniqueDelays.size).toBeGreaterThan(1);
    });

    it('should call onRetry callback', async () => {
      const onRetry = jest.fn();
      const manager = new RetryManager({
        maxRetries: 2,
        initialDelay: 10,
        onRetry
      });
      
      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts <= 2) {
          throw new Error('test error');
        }
        return 'success';
      };
      
      await manager.execute(fn);
      
      expect(onRetry).toHaveBeenCalledTimes(2);
      expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1);
      expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 2);
    });
  });
});

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 100,
      halfOpenMaxAttempts: 2
    });
  });

  describe('State transitions', () => {
    it('should start in closed state', () => {
      expect(circuitBreaker.getState()).toBe('closed');
    });

    it('should open after reaching failure threshold', async () => {
      const failingFn = async () => {
        throw new Error('failure');
      };
      
      // Fail 3 times
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingFn);
        } catch (e) {
          // Expected
        }
      }
      
      expect(circuitBreaker.getState()).toBe('open');
    });

    it('should reject calls when open', async () => {
      const failingFn = async () => {
        throw new Error('failure');
      };
      
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingFn);
        } catch (e) {
          // Expected
        }
      }
      
      // Should reject immediately
      await expect(circuitBreaker.execute(failingFn))
        .rejects.toThrow('Circuit breaker is open');
    });

    it('should transition to half-open after reset timeout', async () => {
      const failingFn = async () => {
        throw new Error('failure');
      };
      
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingFn);
        } catch (e) {
          // Expected
        }
      }
      
      expect(circuitBreaker.getState()).toBe('open');
      
      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should allow one attempt
      const successFn = async () => 'success';
      await circuitBreaker.execute(successFn);
      
      // State should have transitioned through half-open
      expect(circuitBreaker.getState()).toBe('half-open');
    });

    it('should close after successful recovery in half-open', async () => {
      const failingFn = async () => {
        throw new Error('failure');
      };
      
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingFn);
        } catch (e) {
          // Expected
        }
      }
      
      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Succeed twice in half-open
      const successFn = async () => 'success';
      await circuitBreaker.execute(successFn);
      await circuitBreaker.execute(successFn);
      
      expect(circuitBreaker.getState()).toBe('closed');
    });

    it('should reopen on failure in half-open state', async () => {
      const failingFn = async () => {
        throw new Error('failure');
      };
      
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingFn);
        } catch (e) {
          // Expected
        }
      }
      
      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Fail again in half-open
      try {
        await circuitBreaker.execute(failingFn);
      } catch (e) {
        // Expected
      }
      
      expect(circuitBreaker.getState()).toBe('open');
    });

    it('should reset properly', () => {
      circuitBreaker.reset();
      expect(circuitBreaker.getState()).toBe('closed');
    });
  });
});

describe('BatchRetryManager', () => {
  let batchManager: BatchRetryManager;

  beforeEach(() => {
    batchManager = new BatchRetryManager(
      { maxRetries: 2, initialDelay: 10 },
      { failureThreshold: 3, resetTimeout: 100 }
    );
  });

  describe('executeBatch()', () => {
    it('should process all items successfully', async () => {
      const items = [1, 2, 3, 4, 5];
      const processor = async (item: number) => item * 2;
      
      const result = await batchManager.executeBatch(items, processor);
      
      expect(result.successful).toHaveLength(5);
      expect(result.failed).toHaveLength(0);
      expect(result.successful.map(s => s.result)).toEqual([2, 4, 6, 8, 10]);
    });

    it('should handle partial failures with continueOnError', async () => {
      const items = [1, 2, 3, 4, 5];
      const processor = async (item: number) => {
        if (item === 3) {
          throw new Error(`Failed on ${item}`);
        }
        return item * 2;
      };
      
      const result = await batchManager.executeBatch(items, processor, {
        continueOnError: true
      });
      
      expect(result.successful).toHaveLength(4);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].item).toBe(3);
    });

    it('should stop on error when continueOnError is false', async () => {
      const items = [1, 2, 3, 4, 5];
      const processor = async (item: number) => {
        if (item === 3) {
          throw new Error(`Failed on ${item}`);
        }
        return item * 2;
      };
      
      await expect(
        batchManager.executeBatch(items, processor, {
          continueOnError: false
        })
      ).rejects.toThrow('Failed on 3');
    });

    it('should respect concurrency limit', async () => {
      const items = Array.from({ length: 20 }, (_, i) => i);
      let maxConcurrent = 0;
      let currentConcurrent = 0;
      
      const processor = async (item: number) => {
        currentConcurrent++;
        maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
        await new Promise(resolve => setTimeout(resolve, 10));
        currentConcurrent--;
        return item * 2;
      };
      
      await batchManager.executeBatch(items, processor, {
        concurrency: 3
      });
      
      expect(maxConcurrent).toBeLessThanOrEqual(3);
    });

    it('should call onItemError for failures', async () => {
      const items = [1, 2, 3];
      const onItemError = jest.fn();
      
      const processor = async (item: number) => {
        if (item === 2) {
          throw new Error('Item 2 failed');
        }
        return item * 2;
      };
      
      await batchManager.executeBatch(items, processor, {
        continueOnError: true,
        onItemError
      });
      
      expect(onItemError).toHaveBeenCalledTimes(1);
      expect(onItemError).toHaveBeenCalledWith(2, expect.any(Error), 1);
    });

    it('should use circuit breaker for protection', async () => {
      const items = Array.from({ length: 10 }, (_, i) => i);
      let failCount = 0;
      
      const processor = async (item: number) => {
        failCount++;
        throw new Error('Always fails');
      };
      
      const result = await batchManager.executeBatch(items, processor, {
        continueOnError: true
      });
      
      // Circuit should open after failure threshold
      expect(result.failed.length).toBeGreaterThan(0);
      expect(batchManager.getCircuitBreakerState()).toBe('open');
    });

    it('should handle Readwise-like batch processing', async () => {
      // Simulate Readwise annotations
      const annotations = Array.from({ length: 50 }, (_, i) => ({
        id: `note_${i}`,
        text: `Note content ${i}`,
        type: i % 2 === 0 ? 'highlight' : 'note'
      }));
      
      const uploadedItems: any[] = [];
      
      const processor = async (annotation: any) => {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 5));
        
        // Simulate 90% success rate
        if (Math.random() > 0.9) {
          throw new Error(`Upload failed for ${annotation.id}`);
        }
        
        uploadedItems.push(annotation.id);
        return { ...annotation, uploaded: true };
      };
      
      const result = await batchManager.executeBatch(annotations, processor, {
        concurrency: 5,
        continueOnError: true
      });
      
      expect(result.successful.length + result.failed.length).toBe(50);
      expect(uploadedItems.length).toBe(result.successful.length);
    });
  });
});

describe('Real-world retry scenarios', () => {
  it('should handle Readwise API 429 rate limiting', async () => {
    const retryManager = new RetryManager({
      maxRetries: 3,
      initialDelay: 1000
    });
    
    let attemptCount = 0;
    const mockApiCall = async () => {
      attemptCount++;
      if (attemptCount <= 2) {
        const error: any = new Error('Rate limited');
        error.statusCode = 429;
        error.response = {
          headers: { 'retry-after': '1' }
        };
        throw error;
      }
      return { success: true };
    };
    
    const startTime = Date.now();
    const result = await retryManager.execute(mockApiCall);
    const duration = Date.now() - startTime;
    
    expect(result).toEqual({ success: true });
    expect(attemptCount).toBe(3);
    expect(duration).toBeGreaterThanOrEqual(2000); // Should wait at least 2 seconds total
  });

  it('should handle intermittent network failures', async () => {
    const retryManager = new RetryManager({
      maxRetries: 5,
      initialDelay: 100,
      jitter: true
    });
    
    let attemptCount = 0;
    const unreliableNetworkCall = async () => {
      attemptCount++;
      // Fail 60% of the time
      if (Math.random() < 0.6 && attemptCount < 4) {
        const error: any = new Error('Network timeout');
        error.code = 'ETIMEDOUT';
        throw error;
      }
      return { data: 'success' };
    };
    
    const result = await retryManager.execute(unreliableNetworkCall);
    
    expect(result).toEqual({ data: 'success' });
    expect(attemptCount).toBeGreaterThanOrEqual(1);
    expect(attemptCount).toBeLessThanOrEqual(6);
  });

  it('should handle circuit breaker in high-failure scenarios', async () => {
    const circuitBreaker = new CircuitBreaker({
      failureThreshold: 2,
      resetTimeout: 50
    });
    
    const alwaysFails = async () => {
      throw new Error('Service unavailable');
    };
    
    // Open the circuit
    for (let i = 0; i < 2; i++) {
      try {
        await circuitBreaker.execute(alwaysFails);
      } catch (e) {
        // Expected
      }
    }
    
    // Circuit should be open
    expect(circuitBreaker.getState()).toBe('open');
    
    // Fast fail for next requests
    const startTime = Date.now();
    try {
      await circuitBreaker.execute(alwaysFails);
    } catch (e) {
      // Expected
    }
    const failTime = Date.now() - startTime;
    
    // Should fail immediately without executing function
    expect(failTime).toBeLessThan(10);
  });
});

/**
 * Retry Utility
 * 高级重试机制，包含指数退避、断路器和重试策略
 */

import { Logger } from './logger';

/**
 * 重试策略配置
 */
export interface RetryConfig {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  jitter?: boolean;
  timeout?: number;
  onRetry?: (error: Error, attempt: number) => void;
}

/**
 * 断路器配置
 */
export interface CircuitBreakerConfig {
  failureThreshold?: number;  // 连续失败次数阈值
  resetTimeout?: number;       // 重置超时时间（毫秒）
  halfOpenMaxAttempts?: number; // 半开状态最大尝试次数
}

/**
 * 断路器状态
 */
export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

/**
 * 错误分类
 */
export enum ErrorType {
  NETWORK = 'NETWORK',           // 网络错误
  RATE_LIMIT = 'RATE_LIMIT',     // 速率限制
  SERVER_ERROR = 'SERVER_ERROR', // 服务器错误
  AUTH_ERROR = 'AUTH_ERROR',     // 认证错误
  VALIDATION = 'VALIDATION',     // 验证错误
  UNKNOWN = 'UNKNOWN'            // 未知错误
}

/**
 * 错误分类器
 */
export class ErrorClassifier {
  /**
   * 判断错误类型
   */
  static classify(error: any): ErrorType {
    if (!error) return ErrorType.UNKNOWN;

    // 网络错误
    if (error.code === 'ECONNREFUSED' || 
        error.code === 'ENOTFOUND' ||
        error.code === 'ETIMEDOUT' ||
        error.message?.includes('network') ||
        error.message?.includes('fetch')) {
      return ErrorType.NETWORK;
    }

    // HTTP 状态码判断
    const statusCode = error.statusCode || error.response?.status;
    if (statusCode) {
      if (statusCode === 429) return ErrorType.RATE_LIMIT;
      if (statusCode === 401 || statusCode === 403) return ErrorType.AUTH_ERROR;
      if (statusCode === 422 || statusCode === 400) return ErrorType.VALIDATION;
      if (statusCode >= 500) return ErrorType.SERVER_ERROR;
    }

    return ErrorType.UNKNOWN;
  }

  /**
   * 判断是否可重试
   */
  static isRetriable(error: any): boolean {
    const errorType = this.classify(error);
    return [
      ErrorType.NETWORK,
      ErrorType.RATE_LIMIT,
      ErrorType.SERVER_ERROR
    ].includes(errorType);
  }

  /**
   * 获取重试延迟建议
   */
  static getRetryDelay(error: any, baseDelay: number): number {
    const errorType = this.classify(error);
    
    // 速率限制：检查 Retry-After 头
    if (errorType === ErrorType.RATE_LIMIT) {
      const retryAfter = error.response?.headers?.['retry-after'];
      if (retryAfter) {
        return parseInt(retryAfter) * 1000;
      }
      return baseDelay * 2; // 默认加倍延迟
    }

    return baseDelay;
  }
}

/**
 * 高级重试管理器
 */
export class RetryManager {
  private readonly config: Required<RetryConfig>;
  private readonly logger: Logger;

  constructor(config: RetryConfig = {}, logger?: Logger) {
    this.config = {
      maxRetries: config.maxRetries ?? 3,
      initialDelay: config.initialDelay ?? 1000,
      maxDelay: config.maxDelay ?? 30000,
      backoffMultiplier: config.backoffMultiplier ?? 2,
      jitter: config.jitter ?? true,
      timeout: config.timeout ?? 60000,
      onRetry: config.onRetry ?? (() => {})
    };
    this.logger = logger || new Logger({ prefix: '[RetryManager]' });
  }

  /**
   * 执行带重试的操作
   */
  async execute<T>(
    fn: () => Promise<T>,
    shouldRetry?: (error: any) => boolean
  ): Promise<T> {
    const retryPredicate = shouldRetry || ErrorClassifier.isRetriable;
    let lastError: any;
    
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        // 添加超时控制
        return await this.withTimeout(fn(), this.config.timeout);
      } catch (error) {
        lastError = error;
        
        // 检查是否应该重试
        if (attempt === this.config.maxRetries || !retryPredicate(error)) {
          this.logger.error(`Failed after ${attempt + 1} attempts:`, error);
          throw error;
        }
        
        // 计算延迟
        const delay = this.calculateDelay(error, attempt);
        this.logger.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        
        // 触发重试回调
        this.config.onRetry(error as Error, attempt + 1);
        
        // 等待
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }

  /**
   * 计算重试延迟
   */
  private calculateDelay(error: any, attempt: number): number {
    let delay = ErrorClassifier.getRetryDelay(
      error,
      this.config.initialDelay * Math.pow(this.config.backoffMultiplier, attempt)
    );
    
    // 限制最大延迟
    delay = Math.min(delay, this.config.maxDelay);
    
    // 添加抖动
    if (this.config.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }
    
    return Math.floor(delay);
  }

  /**
   * 添加超时控制
   */
  private async withTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        setTimeout(() => reject(new Error(`Operation timed out after ${timeout}ms`)), timeout);
      })
    ]);
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 断路器
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = 'closed';
  private failureCount = 0;
  private lastFailureTime?: Date;
  private successCount = 0;
  private readonly config: Required<CircuitBreakerConfig>;
  private readonly logger: Logger;

  constructor(config: CircuitBreakerConfig = {}, logger?: Logger) {
    this.config = {
      failureThreshold: config.failureThreshold ?? 5,
      resetTimeout: config.resetTimeout ?? 60000,
      halfOpenMaxAttempts: config.halfOpenMaxAttempts ?? 3
    };
    this.logger = logger || new Logger({ prefix: '[CircuitBreaker]' });
  }

  /**
   * 执行受保护的操作
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // 检查断路器状态
    if (!this.canExecute()) {
      throw new Error(`Circuit breaker is open. Last failure: ${this.lastFailureTime}`);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * 检查是否可以执行
   */
  private canExecute(): boolean {
    switch (this.state) {
      case 'closed':
        return true;
      
      case 'open':
        // 检查是否应该转为半开状态
        if (this.shouldTransitionToHalfOpen()) {
          this.state = 'half-open';
          this.logger.info('Circuit breaker transitioning to half-open');
          return true;
        }
        return false;
      
      case 'half-open':
        return true;
      
      default:
        return false;
    }
  }

  /**
   * 处理成功
   */
  private onSuccess(): void {
    switch (this.state) {
      case 'closed':
        this.failureCount = 0;
        break;
      
      case 'half-open':
        this.successCount++;
        if (this.successCount >= this.config.halfOpenMaxAttempts) {
          this.state = 'closed';
          this.failureCount = 0;
          this.successCount = 0;
          this.logger.info('Circuit breaker closed after successful recovery');
        }
        break;
    }
  }

  /**
   * 处理失败
   */
  private onFailure(): void {
    this.lastFailureTime = new Date();
    
    switch (this.state) {
      case 'closed':
        this.failureCount++;
        if (this.failureCount >= this.config.failureThreshold) {
          this.state = 'open';
          this.logger.error(`Circuit breaker opened after ${this.failureCount} failures`);
        }
        break;
      
      case 'half-open':
        this.state = 'open';
        this.successCount = 0;
        this.logger.warn('Circuit breaker reopened due to failure in half-open state');
        break;
    }
  }

  /**
   * 检查是否应该转为半开状态
   */
  private shouldTransitionToHalfOpen(): boolean {
    if (!this.lastFailureTime) return false;
    
    const now = new Date();
    const timeSinceLastFailure = now.getTime() - this.lastFailureTime.getTime();
    return timeSinceLastFailure >= this.config.resetTimeout;
  }

  /**
   * 获取当前状态
   */
  getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * 重置断路器
   */
  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
    this.logger.info('Circuit breaker reset');
  }
}

/**
 * 批量操作重试管理器
 */
export class BatchRetryManager {
  private readonly retryManager: RetryManager;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly logger: Logger;

  constructor(
    retryConfig?: RetryConfig,
    circuitConfig?: CircuitBreakerConfig,
    logger?: Logger
  ) {
    this.logger = logger || new Logger({ prefix: '[BatchRetryManager]' });
    this.retryManager = new RetryManager(retryConfig, this.logger);
    this.circuitBreaker = new CircuitBreaker(circuitConfig, this.logger);
  }

  /**
   * 执行批量操作，支持部分失败
   */
  async executeBatch<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    options: {
      concurrency?: number;
      continueOnError?: boolean;
      onItemError?: (item: T, error: Error, index: number) => void;
    } = {}
  ): Promise<{
    successful: Array<{ item: T; result: R; index: number }>;
    failed: Array<{ item: T; error: Error; index: number }>;
  }> {
    const { 
      concurrency = 5, 
      continueOnError = true, 
      onItemError = () => {} 
    } = options;

    const successful: Array<{ item: T; result: R; index: number }> = [];
    const failed: Array<{ item: T; error: Error; index: number }> = [];

    // 创建处理队列
    const queue = [...items.map((item, index) => ({ item, index }))];
    const processing = new Set<Promise<void>>();

    while (queue.length > 0 || processing.size > 0) {
      // 填充处理槽
      while (processing.size < concurrency && queue.length > 0) {
        const { item, index } = queue.shift()!;
        
        const processItem = async () => {
          try {
            // 通过断路器执行
            const result = await this.circuitBreaker.execute(
              () => this.retryManager.execute(() => processor(item))
            );
            
            successful.push({ item, result, index });
          } catch (error) {
            const err = error as Error;
            failed.push({ item, error: err, index });
            onItemError(item, err, index);
            
            if (!continueOnError) {
              throw error;
            }
          }
        };
        
        const promise = processItem().finally(() => {
          processing.delete(promise);
        });
        
        processing.add(promise);
      }
      
      // 等待至少一个完成
      if (processing.size > 0) {
        await Promise.race(processing);
      }
    }

    // 记录结果
    this.logger.info(`Batch processing completed: ${successful.length} successful, ${failed.length} failed`);
    
    return { successful, failed };
  }

  /**
   * 获取断路器状态
   */
  getCircuitBreakerState(): CircuitBreakerState {
    return this.circuitBreaker.getState();
  }

  /**
   * 重置断路器
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
  }
}

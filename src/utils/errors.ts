/**
 * Error utilities
 * 自定义错误类和错误处理
 */

/**
 * 基础自定义错误类
 */
export class BaseError extends Error {
  public readonly timestamp: Date;
  public readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date();
    this.code = code;
    
    // 维护原型链
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * API 错误
 */
export class ApiError extends BaseError {
  public readonly statusCode?: number;
  public readonly response?: any;

  constructor(message: string, statusCode?: number, response?: any) {
    super(message, 'API_ERROR');
    this.statusCode = statusCode;
    this.response = response;
  }
}

/**
 * 同步错误
 */
export class SyncError extends BaseError {
  public readonly itemId?: string;
  public readonly phase?: string;

  constructor(message: string, itemId?: string, phase?: string) {
    super(message, 'SYNC_ERROR');
    this.itemId = itemId;
    this.phase = phase;
  }
}

/**
 * 验证错误
 */
export class ValidationError extends BaseError {
  public readonly field?: string;
  public readonly value?: any;

  constructor(message: string, field?: string, value?: any) {
    super(message, 'VALIDATION_ERROR');
    this.field = field;
    this.value = value;
  }
}

/**
 * 配置错误
 */
export class ConfigError extends BaseError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR');
  }
}

/**
 * 错误重试包装器
 */
export async function retryOnError<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries || 3;
  const delay = options.delay || 1000;
  const backoff = options.backoff || 2;
  const shouldRetry = options.shouldRetry || (() => true);

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (!shouldRetry(error as Error, attempt)) {
        throw error;
      }

      if (attempt < maxRetries - 1) {
        const waitTime = delay * Math.pow(backoff, attempt);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

/**
 * 错误处理装饰器
 */
export function handleErrors(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    try {
      return await originalMethod.apply(this, args);
    } catch (error) {
      // 记录错误
      console.error(`Error in ${propertyKey}:`, error);
      
      // 重新抛出或处理
      if (error instanceof BaseError) {
        throw error;
      }
      
      throw new BaseError(
        `Unexpected error in ${propertyKey}: ${(error as Error).message}`
      );
    }
  };

  return descriptor;
}

/**
 * 错误格式化
 */
export function formatError(error: Error): string {
  if (error instanceof BaseError) {
    const parts = [
      `[${error.code || error.name}]`,
      error.message
    ];

    if (error instanceof ApiError && error.statusCode) {
      parts.push(`(Status: ${error.statusCode})`);
    }

    if (error instanceof SyncError) {
      if (error.itemId) parts.push(`Item: ${error.itemId}`);
      if (error.phase) parts.push(`Phase: ${error.phase}`);
    }

    return parts.join(' ');
  }

  return `${error.name}: ${error.message}`;
}

/**
 * 判断是否为可重试的错误
 */
export function isRetriableError(error: Error): boolean {
  // 网络错误
  if (error.message.includes('network') || error.message.includes('fetch')) {
    return true;
  }

  // API 速率限制
  if (error instanceof ApiError && error.statusCode === 429) {
    return true;
  }

  // 临时服务器错误
  if (error instanceof ApiError && error.statusCode && error.statusCode >= 500) {
    return true;
  }

  return false;
}

// Types
export interface RetryOptions {
  maxRetries?: number;
  delay?: number;
  backoff?: number;
  shouldRetry?: (error: Error, attempt: number) => boolean;
}

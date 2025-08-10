/**
 * Rate Limiter for API requests
 */

export interface RateLimiterConfig {
  maxRequests: number;
  windowMs: number;
}

export class RateLimiter {
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private requests: number[] = [];

  constructor(config: RateLimiterConfig) {
    this.maxRequests = config.maxRequests;
    this.windowMs = config.windowMs;
  }

  /**
   * 等待可用的请求槽位
   */
  async waitForSlot(): Promise<void> {
    this.cleanOldRequests();

    while (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = oldestRequest + this.windowMs - Date.now();
      
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      this.cleanOldRequests();
    }

    this.requests.push(Date.now());
  }

  /**
   * 清理过期的请求记录
   */
  private cleanOldRequests(): void {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
  }

  /**
   * 重置速率限制器
   */
  reset(): void {
    this.requests = [];
  }
}

/**
 * 指数退避算法 with configurable parameters
 * Implements exponential backoff with jitter for better distribution
 */
export function exponentialBackoff(
  attempt: number, 
  baseDelay: number = 1000,
  maxDelay: number = 8000,
  maxAttempts: number = 5
): number {
  if (attempt >= maxAttempts) {
    throw new Error(`Maximum retry attempts (${maxAttempts}) exceeded`);
  }
  
  // Calculate delay: 1s, 2s, 4s, 8s with max cap
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  
  // Add jitter (0-25% of delay) to prevent thundering herd
  const jitter = Math.random() * delay * 0.25;
  
  return Math.floor(delay + jitter);
}

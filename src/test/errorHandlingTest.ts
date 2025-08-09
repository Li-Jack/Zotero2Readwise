/**
 * Error Handling Test
 * 测试错误处理、重试机制和断路器功能
 */

import { 
  RetryManager, 
  CircuitBreaker, 
  BatchRetryManager,
  ErrorClassifier,
  ErrorType 
} from '../utils/retry';
import { ApiError } from '../utils/errors';
import { Logger } from '../utils/logger';

// 创建测试logger
const logger = new Logger({ 
  prefix: '[ErrorTest]', 
  level: 'debug',
  sanitizeTokens: true 
});

/**
 * 模拟API调用
 */
class MockApiClient {
  private callCount = 0;
  private failureRate = 0.5;

  setFailureRate(rate: number) {
    this.failureRate = rate;
  }

  async makeRequest(shouldFail?: boolean): Promise<any> {
    this.callCount++;
    
    if (shouldFail || Math.random() < this.failureRate) {
      // 随机生成不同类型的错误
      const errorTypes = [
        { statusCode: 429, message: 'Rate limit exceeded' },
        { statusCode: 500, message: 'Internal server error' },
        { statusCode: 401, message: 'Unauthorized' },
        { code: 'ECONNREFUSED', message: 'Connection refused' }
      ];
      
      const error = errorTypes[Math.floor(Math.random() * errorTypes.length)];
      throw new ApiError(error.message, error.statusCode || 0);
    }
    
    return { success: true, data: `Response ${this.callCount}` };
  }

  getCallCount() {
    return this.callCount;
  }
}

/**
 * 测试重试管理器
 */
async function testRetryManager() {
  console.log('\n=== Testing Retry Manager ===\n');
  
  const retryManager = new RetryManager({
    maxRetries: 3,
    initialDelay: 100,
    maxDelay: 5000,
    backoffMultiplier: 2,
    jitter: true,
    onRetry: (error, attempt) => {
      logger.warn(`Retry attempt ${attempt} due to:`, error.message);
    }
  }, logger);

  const client = new MockApiClient();
  client.setFailureRate(0.7); // 70% 失败率

  try {
    const result = await retryManager.execute(
      () => client.makeRequest(),
      (error) => ErrorClassifier.isRetriable(error)
    );
    logger.info('Request succeeded:', result);
  } catch (error) {
    logger.error('Request failed after retries:', error);
  }

  logger.info(`Total API calls made: ${client.getCallCount()}`);
}

/**
 * 测试断路器
 */
async function testCircuitBreaker() {
  console.log('\n=== Testing Circuit Breaker ===\n');
  
  const circuitBreaker = new CircuitBreaker({
    failureThreshold: 3,
    resetTimeout: 5000,
    halfOpenMaxAttempts: 2
  }, logger);

  const client = new MockApiClient();
  client.setFailureRate(1); // 100% 失败率，触发断路器

  // 尝试多次调用，触发断路器开启
  for (let i = 0; i < 5; i++) {
    try {
      await circuitBreaker.execute(() => client.makeRequest());
      logger.info(`Request ${i + 1} succeeded`);
    } catch (error) {
      logger.error(`Request ${i + 1} failed:`, error.message);
      logger.info(`Circuit breaker state: ${circuitBreaker.getState()}`);
    }
  }

  // 等待重置超时
  logger.info('Waiting for circuit breaker reset timeout...');
  await new Promise(resolve => setTimeout(resolve, 5500));

  // 降低失败率，测试恢复
  client.setFailureRate(0);
  logger.info('Testing recovery with reduced failure rate...');

  for (let i = 0; i < 3; i++) {
    try {
      await circuitBreaker.execute(() => client.makeRequest());
      logger.info(`Recovery request ${i + 1} succeeded`);
      logger.info(`Circuit breaker state: ${circuitBreaker.getState()}`);
    } catch (error) {
      logger.error(`Recovery request ${i + 1} failed:`, error.message);
    }
  }
}

/**
 * 测试批量重试管理器
 */
async function testBatchRetryManager() {
  console.log('\n=== Testing Batch Retry Manager ===\n');
  
  const batchRetryManager = new BatchRetryManager(
    {
      maxRetries: 2,
      initialDelay: 100,
      backoffMultiplier: 2
    },
    {
      failureThreshold: 5,
      resetTimeout: 10000
    },
    logger
  );

  // 准备测试数据
  const items = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    name: `Item ${i + 1}`,
    shouldFail: i % 3 === 0 // 每3个失败一个
  }));

  const client = new MockApiClient();
  client.setFailureRate(0.3);

  // 处理批量操作
  const result = await batchRetryManager.executeBatch(
    items,
    async (item) => {
      if (item.shouldFail) {
        throw new ApiError(`Forced failure for ${item.name}`, 422);
      }
      return client.makeRequest();
    },
    {
      concurrency: 3,
      continueOnError: true,
      onItemError: (item, error, index) => {
        logger.warn(`Item ${item.name} failed:`, error.message);
      }
    }
  );

  // 输出结果统计
  logger.info('Batch processing results:', {
    successful: result.successful.length,
    failed: result.failed.length,
    failedItems: result.failed.map(f => f.item.name),
    circuitBreakerState: batchRetryManager.getCircuitBreakerState()
  });
}

/**
 * 测试错误分类器
 */
function testErrorClassifier() {
  console.log('\n=== Testing Error Classifier ===\n');
  
  const testErrors = [
    new ApiError('Rate limit exceeded', 429),
    new ApiError('Unauthorized', 401),
    new ApiError('Server error', 500),
    new ApiError('Bad request', 400),
    { code: 'ECONNREFUSED', message: 'Connection refused' },
    { message: 'network timeout' },
    new Error('Unknown error')
  ];

  for (const error of testErrors) {
    const errorType = ErrorClassifier.classify(error);
    const isRetriable = ErrorClassifier.isRetriable(error);
    
    logger.info('Error classification:', {
      error: error.message || error.toString(),
      type: errorType,
      retriable: isRetriable,
      statusCode: (error as any).statusCode
    });
  }
}

/**
 * 测试日志脱敏
 */
function testLogSanitization() {
  console.log('\n=== Testing Log Sanitization ===\n');
  
  const sensitiveData = {
    apiKey: 'sk-1234567890abcdefghijklmnop',
    token: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0',
    password: 'supersecret123',
    data: {
      user: 'john.doe',
      secret: 'another-secret-value',
      normalField: 'This is normal data'
    }
  };

  logger.info('Logging sensitive data:', sensitiveData);
  logger.debug('API call with token:', {
    url: 'https://api.example.com',
    headers: {
      'Authorization': 'Bearer sk-verylongtokenstring123456',
      'Content-Type': 'application/json'
    }
  });
}

/**
 * 运行所有测试
 */
async function runAllTests() {
  console.log('Starting Error Handling Tests...\n');
  
  testErrorClassifier();
  testLogSanitization();
  await testRetryManager();
  await testCircuitBreaker();
  await testBatchRetryManager();
  
  console.log('\n=== All Tests Completed ===\n');
}

// 如果直接运行此文件
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

export { 
  testRetryManager,
  testCircuitBreaker,
  testBatchRetryManager,
  testErrorClassifier,
  testLogSanitization,
  runAllTests
};

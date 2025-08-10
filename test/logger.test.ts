/**
 * Logger System Tests
 * 测试日志系统功能
 */

import { Logger } from '../src/utils/logger';
import { FileLogger } from '../src/utils/fileLogger';
import { initializeLogger, createModuleLogger, log } from '../src/utils/loggerInit';

describe('Logger System', () => {
  let logger: Logger;
  let fileLogger: FileLogger;

  beforeAll(() => {
    const result = initializeLogger();
    logger = result.logger;
    fileLogger = result.fileLogger;
  });

  afterAll(() => {
    fileLogger.destroy();
  });

  describe('Basic Logging', () => {
    test('should log different levels', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      const infoSpy = jest.spyOn(console, 'info');
      const warnSpy = jest.spyOn(console, 'warn');
      const errorSpy = jest.spyOn(console, 'error');

      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');

      // 根据日志级别，某些消息可能不会输出
      expect(consoleSpy).toHaveBeenCalled();
      expect(infoSpy).toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
      infoSpy.mockRestore();
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    });

    test('should handle objects and errors', () => {
      const testObject = { key: 'value', nested: { data: 123 } };
      const testError = new Error('Test error');

      expect(() => {
        logger.info('Object:', testObject);
        logger.error('Error:', testError);
      }).not.toThrow();
    });
  });

  describe('Sensitive Data Sanitization', () => {
    test('should sanitize tokens and passwords', () => {
      const testLogger = new Logger({ sanitizeTokens: true });
      const consoleSpy = jest.spyOn(console, 'info');

      testLogger.info('API token: abc123secret456');
      testLogger.info({ apiKey: 'super-secret-key', data: 'public' });

      const calls = consoleSpy.mock.calls;
      expect(calls.some(call => 
        call[0].includes('[REDACTED]') || 
        JSON.stringify(call).includes('[REDACTED]')
      )).toBe(true);

      consoleSpy.mockRestore();
    });
  });

  describe('Child Loggers', () => {
    test('should create child logger with prefix', () => {
      const childLogger = logger.createChild('TestModule');
      const consoleSpy = jest.spyOn(console, 'info');

      childLogger.info('Child logger message');

      expect(consoleSpy).toHaveBeenCalled();
      const message = consoleSpy.mock.calls[0][0];
      expect(message).toContain('[Z2R]');
      expect(message).toContain('[TestModule]');

      consoleSpy.mockRestore();
    });
  });

  describe('Module Logger', () => {
    test('should create module-specific logger', () => {
      const moduleLogger = createModuleLogger('TestModule');
      expect(moduleLogger).toBeDefined();
      
      const consoleSpy = jest.spyOn(console, 'info');
      moduleLogger.info('Module message');
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Performance Timing', () => {
    test('should measure performance', () => {
      const timeSpy = jest.spyOn(console, 'time');
      const timeEndSpy = jest.spyOn(console, 'timeEnd');

      logger.time('test-operation');
      // Simulate some operation
      logger.timeEnd('test-operation');

      expect(timeSpy).toHaveBeenCalledWith('[Z2R] test-operation');
      expect(timeEndSpy).toHaveBeenCalledWith('[Z2R] test-operation');

      timeSpy.mockRestore();
      timeEndSpy.mockRestore();
    });
  });

  describe('Structured Logging', () => {
    test('should log structured data', () => {
      const consoleSpy = jest.spyOn(console, 'group');
      const tablespy = jest.spyOn(console, 'table');

      logger.logStructured('info', 'User action', {
        action: 'sync',
        items: 10,
        duration: 1500
      });

      expect(consoleSpy).toHaveBeenCalled();
      expect(tablespy).toHaveBeenCalled();

      consoleSpy.mockRestore();
      tablespy.mockRestore();
    });
  });

  describe('File Logger', () => {
    test('should write log entries', async () => {
      const entry = {
        timestamp: new Date().toISOString(),
        level: 'info' as const,
        message: 'Test log entry',
        metadata: { test: true }
      };

      await expect(fileLogger.writeLog(entry)).resolves.not.toThrow();
    });

    test('should get log statistics', async () => {
      const stats = await fileLogger.getLogStats();
      
      expect(stats).toHaveProperty('totalFiles');
      expect(stats).toHaveProperty('totalSize');
      expect(stats).toHaveProperty('oldestLog');
      expect(stats).toHaveProperty('newestLog');
    });
  });

  describe('Development Mode', () => {
    test('should detect development mode', () => {
      const devLogger = new Logger({ isDevelopment: true });
      const consoleSpy = jest.spyOn(console, 'log');

      devLogger.debug('Development debug message');

      // In development mode, debug messages should include styling
      const calls = consoleSpy.mock.calls;
      expect(calls.some(call => call[0].includes('%c'))).toBe(true);

      consoleSpy.mockRestore();
    });
  });

  describe('Global Log Helper', () => {
    test('should use global log methods', () => {
      const consoleSpy = jest.spyOn(console, 'info');

      log.info('Global log message');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});

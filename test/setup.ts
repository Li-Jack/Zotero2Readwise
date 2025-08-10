/**
 * Test Setup
 * 全局测试配置和 Mock 设置
 */

import { jest } from '@jest/globals';

// Mock Zotero global object
(global as any).Zotero = {
  version: '7.0.0',
  locale: 'en-US',
  Prefs: {
    get: jest.fn(),
    set: jest.fn(),
    clear: jest.fn(),
    registerObserver: jest.fn(),
    unregisterObserver: jest.fn()
  },
  Items: {
    get: jest.fn(),
    getAll: jest.fn()
  },
  Annotations: {
    get: jest.fn(),
    getAll: jest.fn()
  },
  debug: jest.fn(),
  log: jest.fn(),
  logError: jest.fn(),
  Debug: {
    enabled: false
  },
  DataDirectory: {
    dir: '/tmp/zotero'
  },
  ZipWriter: jest.fn(),
  platform: 'MacIntel',
  Z2R: {
    version: '0.1.0'
  }
} as any;

// Mock browser APIs (cast to satisfy TS types)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
global.fetch = jest.fn() as any;
global.setTimeout = setTimeout;
global.clearTimeout = clearTimeout;

// Mock crypto for testing
global.crypto = {
  randomUUID: () => 'test-uuid-' + Math.random().toString(36).substring(7),
  getRandomValues: (array: any) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }
} as any;

// Mock localStorage
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).localStorage = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getItem: jest.fn() as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setItem: jest.fn() as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  removeItem: jest.fn() as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  clear: jest.fn() as any,
  length: 0,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  key: jest.fn() as any
};

// Mock console methods for cleaner test output
const originalConsole = { ...console };

beforeAll(() => {
  // Silence console during tests unless explicitly needed
  console.log = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
  // Keep error for debugging
  console.error = originalConsole.error;
});

afterAll(() => {
  // Restore console
  console.log = originalConsole.log;
  console.info = originalConsole.info;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});

// Custom matchers
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
  
  toContainObject(received: any[], expected: any) {
    const pass = received.some(item => 
      Object.keys(expected).every(key => item[key] === expected[key])
    );
    
    if (pass) {
      return {
        message: () => `expected array not to contain object matching ${JSON.stringify(expected)}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected array to contain object matching ${JSON.stringify(expected)}`,
        pass: false,
      };
    }
  }
});

// Test utilities
export const mockReadwiseResponse = (highlights: any[] = []) => ({
  results: highlights,
  count: highlights.length,
  next: null,
  previous: null
});

export const mockZoteroItem = (overrides: any = {}) => ({
  key: 'TESTKEY',
  itemType: 'journalArticle',
  title: 'Test Article',
  creators: [{ firstName: 'Test', lastName: 'Author' }],
  date: '2024-01-01',
  ...overrides
});

export const mockAnnotation = (overrides: any = {}) => ({
  key: 'ANNOKEY',
  type: 'highlight',
  text: 'Test highlight text',
  comment: '',
  color: '#ffd400',
  pageLabel: '10',
  sortIndex: 0,
  dateAdded: new Date().toISOString(),
  dateModified: new Date().toISOString(),
  ...overrides
});

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const createMockLogger = () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
});

// Type declarations for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R;
      toContainObject(expected: any): R;
    }
  }
}

/**
 * Jest Test Configuration
 * 配置单元测试和集成测试环境
 */

export default {
  // Use TypeScript preset
  preset: 'ts-jest',
  // Use jsdom to provide window/document during tests
  testEnvironment: 'jsdom',

  // Test file patterns
  testMatch: [
    '**/test/**/*.test.ts',
    '**/test/**/*.spec.ts'
  ],

  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    // Only collect coverage from pure logic modules that can run in Node
    'src/utils/chunk.ts',
    'src/utils/hash.ts',
    'src/utils/retry.ts',
    'src/utils/debounce.ts',
    'src/utils/constants.ts',
    'src/api/readwiseClient/errors.ts',
    'src/api/readwiseClient/rateLimiter.ts',
    'src/api/readwiseClient/bookCache.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    },
    './src/utils/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/core/': {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // Module name mapping for imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@test/(.*)$': '<rootDir>/test/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@api/(.*)$': '<rootDir>/src/api/$1'
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],

  // Transform configuration
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: '<rootDir>/test/tsconfig.json',
      diagnostics: true
    }]
  },

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/'
  ],

  // Global timeout
  testTimeout: 10000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};

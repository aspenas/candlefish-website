/**
 * Jest configuration for Security Dashboard backend tests
 * Optimized for Go service testing and TimescaleDB integration
 */

module.exports = {
  displayName: 'Security Dashboard Backend',
  testEnvironment: 'node',
  roots: ['<rootDir>/../backend'],
  testMatch: [
    '**/__tests__/**/*.test.{ts,js}',
    '**/?(*.)+(spec|test).{ts,js}',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.{ts,js}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/*.config.{ts,js}',
    '!**/test-helpers/**',
  ],
  coverageDirectory: '<rootDir>/../coverage/backend',
  coverageReporters: ['text', 'lcov', 'json', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // Service-specific thresholds
    'services/security-service.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testTimeout: 30000, // 30 seconds for integration tests
  maxConcurrency: 4, // Limit concurrent tests to avoid overwhelming database
  // Test environment variables
  testEnvironmentOptions: {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://test_user:test_pass@localhost:5432/security_dashboard_test',
    REDIS_URL: 'redis://localhost:6379/1',
    JWT_SECRET: 'test-jwt-secret-key',
  },
  // Module name mapping for Go-style imports
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/../../../services/security-dashboard/internal/$1',
    '^@tests/(.*)$': '<rootDir>/../$1',
  },
  // Global test setup and teardown
  globalSetup: '<rootDir>/global-setup.js',
  globalTeardown: '<rootDir>/global-teardown.js',
  // Performance monitoring
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/../coverage/backend',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
      },
    ],
    [
      '@jest/reporters',
      {
        threshold: {
          statements: 80,
          branches: 80,
          functions: 80,
          lines: 80,
        },
      },
    ],
  ],
  // Database and external service mocks
  setupFiles: [
    '<rootDir>/setup-database.js',
    '<rootDir>/setup-redis.js',
  ],
  // Custom test sequencer for database tests
  testSequencer: '<rootDir>/database-test-sequencer.js',
};
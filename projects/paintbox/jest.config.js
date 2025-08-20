const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  // Test environment
  testEnvironment: 'jsdom',

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Module paths
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/hooks/(.*)$': '<rootDir>/hooks/$1',
    '^@/utils/(.*)$': '<rootDir>/utils/$1',
    '^@/types/(.*)$': '<rootDir>/types/$1',
    '^@/store/(.*)$': '<rootDir>/store/$1',
    '^@/app/(.*)$': '<rootDir>/app/$1',
  },

  // Transform ignore patterns for ES modules that need to be processed
  transformIgnorePatterns: [
    'node_modules/(?!(graphql-ws|@apollo/client|graphql-tag|@aws-sdk|jose|uuid)/)',
  ],

  // Force TypeScript files to be treated as ES modules
  preset: undefined, // Let next/jest handle everything

  // Test patterns
  testMatch: [
    '<rootDir>/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/**/*.{test,spec}.{js,jsx,ts,tsx}',
  ],

  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/build/',
    '<rootDir>/__tests__/fixtures/',
    '<rootDir>/__tests__/utils/',
    '<rootDir>/__tests__/data/test-data-setup.ts',
  ],

  // Transform patterns
  transformIgnorePatterns: [
    '/node_modules/(?!(graphql-ws|@apollo/client|graphql-tag)/)',
  ],

  // Coverage settings
  collectCoverage: false, // Enable only when running with --coverage flag
  collectCoverageFrom: [
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    'apollo-graphos/subgraph-estimates/src/**/*.{js,jsx,ts,tsx}',
    'hooks/**/*.{js,jsx,ts,tsx}',
    'store/**/*.{js,jsx,ts,tsx}',
    'utils/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!**/dist/**',
    '!**/*.config.{js,ts}',
    '!**/index.{js,ts}',
  ],

  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
  ],

  coverageDirectory: 'coverage',

  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './components/': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    './lib/services/': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },

  // Test timeout
  testTimeout: 10000,

  // Max workers
  maxWorkers: '50%',

  // Mock settings
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Verbose output in CI
  verbose: process.env.CI === 'true',

  // Test result processor
  reporters: [
    'default',
  ],

  // Projects configuration for different test types
  projects: [
    // Frontend component tests
    {
      displayName: 'Frontend Components',
      testMatch: [
        '<rootDir>/__tests__/components/**/*.{test,spec}.{js,jsx,ts,tsx}',
      ],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    },

    // API tests (includes auth, health, etc.)
    {
      displayName: 'API Tests',
      testMatch: [
        '<rootDir>/__tests__/api/**/*.{test,spec}.{js,ts}',
      ],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    },

    // Backend GraphQL tests
    {
      displayName: 'Backend GraphQL',
      testMatch: [
        '<rootDir>/apollo-graphos/subgraph-estimates/src/__tests__/**/*.{test,spec}.{js,ts}',
      ],
      testEnvironment: 'node',
    },

    // Security tests
    {
      displayName: 'Security Tests',
      testMatch: [
        '<rootDir>/__tests__/security/**/*.{test,spec}.{js,ts}',
      ],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    },

    // Unit tests
    {
      displayName: 'Unit Tests',
      testMatch: [
        '<rootDir>/__tests__/unit/**/*.{test,spec}.{js,ts,tsx}',
      ],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    },

    // Integration tests
    {
      displayName: 'Integration Tests',
      testMatch: [
        '<rootDir>/__tests__/integration/**/*.{test,spec}.{js,ts}',
      ],
      testEnvironment: 'node',
      testTimeout: 30000,
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    },

    // Performance tests
    {
      displayName: 'Performance Tests',
      testMatch: [
        '<rootDir>/__tests__/performance/**/*.{test,spec}.{js,ts}',
      ],
      testEnvironment: 'node',
      testTimeout: 120000,
    },
  ],

  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)

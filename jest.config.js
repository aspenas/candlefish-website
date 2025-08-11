/** @type {import('jest').Config} */
module.exports = {
  // Use projects to organize different test configurations
  projects: [
    {
      displayName: 'Unit Tests',
      testMatch: ['<rootDir>/__tests__/unit/**/*.test.{ts,tsx}'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/$1',
        '^@components/(.*)$': '<rootDir>/components/$1',
        '^@lib/(.*)$': '<rootDir>/lib/$1',
        '^@apps/(.*)$': '<rootDir>/apps/$1',
        '^@packages/(.*)$': '<rootDir>/packages/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__tests__/__mocks__/fileMock.js',
      },
      transform: {
        '^.+\\.(ts|tsx)$': ['@swc/jest', {
          jsc: {
            parser: {
              syntax: 'typescript',
              tsx: true,
            },
            transform: {
              react: {
                runtime: 'automatic',
              },
            },
          },
        }],
      },
      collectCoverageFrom: [
        'components/**/*.{ts,tsx}',
        'lib/**/*.{ts,tsx}',
        'apps/**/*.{ts,tsx}',
        'packages/**/*.{ts,tsx}',
        '!**/*.d.ts',
        '!**/*.stories.{ts,tsx}',
        '!**/node_modules/**',
        '!**/build/**',
        '!**/dist/**',
      ],
      coverageThreshold: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    {
      displayName: 'Integration Tests',
      testMatch: ['<rootDir>/__tests__/integration/**/*.test.{ts,tsx}'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/jest.integration.setup.js'],
      moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/$1',
        '^@components/(.*)$': '<rootDir>/components/$1',
        '^@lib/(.*)$': '<rootDir>/lib/$1',
        '^@apps/(.*)$': '<rootDir>/apps/$1',
        '^@packages/(.*)$': '<rootDir>/packages/$1',
      },
      transform: {
        '^.+\\.(ts|tsx)$': ['@swc/jest'],
      },
      testTimeout: 30000,
    },
    {
      displayName: 'Backend Tests',
      testMatch: ['<rootDir>/__tests__/backend/**/*.test.{ts,js}'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/jest.backend.setup.js'],
      moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/$1',
      },
      transform: {
        '^.+\\.(ts|js)$': ['@swc/jest'],
      },
      testTimeout: 30000,
    },
    {
      displayName: 'Collaboration Unit Tests',
      testMatch: ['<rootDir>/__tests__/collaboration/unit/**/*.test.{ts,tsx}'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js', '<rootDir>/__tests__/collaboration/setup/unit.setup.js'],
      moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/$1',
        '^@components/(.*)$': '<rootDir>/components/$1',
        '^@lib/(.*)$': '<rootDir>/lib/$1',
        '^@graphql/(.*)$': '<rootDir>/graphql/$1',
        '^@collaboration/(.*)$': '<rootDir>/apps/collaboration-editor/src/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__tests__/__mocks__/fileMock.js',
      },
      transform: {
        '^.+\\.(ts|tsx)$': ['@swc/jest', {
          jsc: {
            parser: {
              syntax: 'typescript',
              tsx: true,
            },
            transform: {
              react: {
                runtime: 'automatic',
              },
            },
          },
        }],
      },
      collectCoverageFrom: [
        'graphql/**/*.{ts,tsx}',
        'apps/collaboration-editor/**/*.{ts,tsx}',
        'apps/mobile-collaboration/**/*.{ts,tsx}',
        '!**/*.d.ts',
        '!**/*.stories.{ts,tsx}',
        '!**/node_modules/**',
      ],
      coverageThreshold: {
        global: {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
      },
    },
    {
      displayName: 'Collaboration Integration Tests',
      testMatch: ['<rootDir>/__tests__/collaboration/integration/**/*.test.{ts,tsx}'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/__tests__/collaboration/setup/integration.setup.js'],
      moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/$1',
        '^@graphql/(.*)$': '<rootDir>/graphql/$1',
      },
      transform: {
        '^.+\\.(ts|tsx)$': ['@swc/jest'],
      },
      testTimeout: 60000,
      maxConcurrency: 5,
    },
    {
      displayName: 'Collaboration E2E Tests',
      testMatch: ['<rootDir>/__tests__/collaboration/e2e/**/*.test.{ts,tsx}'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/__tests__/collaboration/setup/e2e.setup.js'],
      transform: {
        '^.+\\.(ts|tsx)$': ['@swc/jest'],
      },
      testTimeout: 120000,
      maxConcurrency: 2,
    },
    {
      displayName: 'Performance Tests',
      testMatch: ['<rootDir>/__tests__/collaboration/performance/**/*.test.{ts,tsx}'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/__tests__/collaboration/setup/performance.setup.js'],
      transform: {
        '^.+\\.(ts|tsx)$': ['@swc/jest'],
      },
      testTimeout: 300000,
      maxConcurrency: 1,
    },
  ],

  // Global configuration
  collectCoverageFrom: [
    'components/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    'apps/**/*.{ts,tsx}',
    'packages/**/*.{ts,tsx}',
    'projects/paintbox/lib/**/*.{ts,tsx}',
    'projects/paintbox/components/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/*.stories.{ts,tsx}',
    '!**/node_modules/**',
    '!**/build/**',
    '!**/dist/**',
  ],

  coverageReporters: ['text', 'lcov', 'json', 'html'],
  coverageDirectory: 'coverage',

  // Watch configuration
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],

  // Performance optimization
  maxWorkers: '50%',
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',

  // Global test utilities
  globalSetup: '<rootDir>/__tests__/collaboration/setup/global.setup.js',
  globalTeardown: '<rootDir>/__tests__/collaboration/setup/global.teardown.js',
};

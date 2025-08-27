const { pathsToModuleNameMapper } = require('ts-jest');

// Safely load tsconfig.json
let compilerOptions = {};
try {
  compilerOptions = require('./tsconfig.json').compilerOptions || {};
} catch (error) {
  console.warn('tsconfig.json not found, using default compiler options');
}

/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Test patterns
  testMatch: [
    '<rootDir>/**/__tests__/**/*.{ts,tsx,js,jsx}',
    '<rootDir>/**/*.(test|spec).{ts,tsx,js,jsx}'
  ],

  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'apps/**/*.{ts,tsx}',
    'packages/**/*.{ts,tsx}',
    'graphql/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    '5470_S_Highline_Circle/frontend/src/**/*.{ts,tsx}',
    '5470_S_Highline_Circle/backend/**/*.go',
    '!**/*.d.ts',
    '!**/*.config.{ts,js}',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!**/*.test.{ts,tsx,js,go}',
    '!**/*.spec.{ts,tsx,js,go}',
    '!**/main.go',
    '!**/main.ts'
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    // Inventory-specific thresholds
    './5470_S_Highline_Circle/frontend/src/**/*.{ts,tsx}': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './apps/mobile-inventory/src/**/*.{ts,tsx}': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    // Security Dashboard thresholds - comprehensive testing required
    './apps/security-dashboard/src/components/**/*.{ts,tsx}': {
      branches: 85,
      functions: 90,
      lines: 85,
      statements: 85
    },
    './apps/security-dashboard/src/graphql/resolvers/**/*.{ts,tsx}': {
      branches: 90,
      functions: 95,
      lines: 90,
      statements: 90
    },
    './apps/mobile-security-dashboard/src/components/**/*.{ts,tsx}': {
      branches: 80,
      functions: 85,
      lines: 80,
      statements: 80
    },
    './services/security-dashboard/internal/services/**/*.go': {
      branches: 85,
      functions: 90,
      lines: 85,
      statements: 85
    }
  },

  // Module resolution
  moduleNameMapper: {
    ...(compilerOptions.paths ? pathsToModuleNameMapper(compilerOptions.paths, {
      prefix: '<rootDir>/'
    }) : {}),
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/components/$1',
    '^@graphql/(.*)$': '<rootDir>/graphql/$1',
    '^@lib/(.*)$': '<rootDir>/lib/$1',
    '^@apps/(.*)$': '<rootDir>/apps/$1',
    '^@utils/(.*)$': '<rootDir>/__tests__/utils/$1',
    '^@mobile/(.*)$': '<rootDir>/apps/mobile-security-dashboard/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/__tests__/__mocks__/fileMock.js'
  },

  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@apollo/client|@testing-library|uuid))'
  ],

  // Test environments for different project types
  projects: [
    {
      displayName: 'Inventory Backend',
      testMatch: [
        '<rootDir>/5470_S_Highline_Circle/backend/**/*.test.go',
        '<rootDir>/__tests__/backend/inventory/**/*.test.{ts,js}'
      ],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/jest.backend.setup.js'],
      testTimeout: 15000
    },
    {
      displayName: 'Security Dashboard Backend',
      testMatch: [
        '<rootDir>/services/security-dashboard/**/*.test.go',
        '<rootDir>/__tests__/backend/security-dashboard/**/*.test.{ts,js}'
      ],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/jest.backend.setup.js'],
      testTimeout: 15000
    },
    {
      displayName: 'Inventory Frontend',
      testMatch: [
        '<rootDir>/5470_S_Highline_Circle/frontend/src/**/*.test.{ts,tsx}',
        '<rootDir>/__tests__/frontend/inventory/**/*.test.{ts,tsx}'
      ],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
    },
    {
      displayName: 'Security Dashboard Frontend',
      testMatch: [
        '<rootDir>/apps/security-dashboard/src/**/*.test.{ts,tsx}',
        '<rootDir>/__tests__/frontend/security-dashboard/**/*.test.{ts,tsx}'
      ],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
    },
    {
      displayName: 'GraphQL',
      testMatch: [
        '<rootDir>/graphql/**/*.test.{ts,js}',
        '<rootDir>/__tests__/graphql/**/*.test.{ts,tsx}'
      ],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/jest.backend.setup.js']
    },
    {
      displayName: 'Mobile Inventory',
      testMatch: [
        '<rootDir>/apps/mobile-inventory/**/*.test.{ts,tsx}',
        '<rootDir>/__tests__/mobile/inventory/**/*.test.{ts,tsx}'
      ],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      moduleNameMapper: {
        '^react-native$': 'react-native-web',
        '^@react-native-async-storage/async-storage$': '<rootDir>/__tests__/__mocks__/async-storage.js',
        '^react-native-camera$': '<rootDir>/__tests__/__mocks__/camera.js'
      }
    },
    {
      displayName: 'Mobile Security Dashboard',
      testMatch: [
        '<rootDir>/apps/mobile-security-dashboard/**/*.test.{ts,tsx}',
        '<rootDir>/__tests__/mobile/security-dashboard/**/*.test.{ts,tsx}'
      ],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      moduleNameMapper: {
        '^react-native$': 'react-native-web',
        '^@react-native-async-storage/async-storage$': '<rootDir>/__tests__/__mocks__/async-storage.js',
        '^react-native-camera$': '<rootDir>/__tests__/__mocks__/camera.js',
        '^@react-navigation/native$': '<rootDir>/__tests__/__mocks__/react-navigation.js'
      }
    },
    {
      displayName: 'Integration',
      testMatch: ['<rootDir>/__tests__/integration/**/*.test.{ts,tsx}'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/jest.integration.setup.js'],
      testTimeout: 30000
    },
    {
      displayName: 'Performance',
      testMatch: ['<rootDir>/__tests__/performance/**/*.test.{ts,tsx,js}'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/jest.integration.setup.js'],
      testTimeout: 60000
    }
  ],

  // Global settings
  testTimeout: 10000,
  maxWorkers: '50%',
  verbose: true,

  // Watch mode settings
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/.next/',
    '<rootDir>/coverage/'
  ],

  // Error handling
  bail: false,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Performance optimizations
  cacheDirectory: '<rootDir>/.jest-cache'
};

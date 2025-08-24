const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

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
    '!**/*.d.ts',
    '!**/*.config.{ts,js}',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/.next/**',
    '!**/coverage/**'
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Module resolution
  moduleNameMapper: {
    ...pathsToModuleNameMapper(compilerOptions.paths || {}, {
      prefix: '<rootDir>/'
    }),
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/components/$1',
    '^@graphql/(.*)$': '<rootDir>/graphql/$1',
    '^@lib/(.*)$': '<rootDir>/lib/$1',
    '^@apps/(.*)$': '<rootDir>/apps/$1',
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
      displayName: 'Backend',
      testMatch: ['<rootDir>/graphql/**/*.test.{ts,js}'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/jest.backend.setup.js']
    },
    {
      displayName: 'Frontend',
      testMatch: [
        '<rootDir>/apps/**/src/**/*.test.{ts,tsx}',
        '<rootDir>/components/**/*.test.{ts,tsx}'
      ],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
    },
    {
      displayName: 'Integration',
      testMatch: ['<rootDir>/__tests__/integration/**/*.test.{ts,tsx}'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/jest.integration.setup.js'],
      testTimeout: 30000
    },
    {
      displayName: 'Mobile',
      testMatch: ['<rootDir>/apps/mobile-*/**/*.test.{ts,tsx}'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      moduleNameMapper: {
        '^react-native$': 'react-native-web'
      }
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

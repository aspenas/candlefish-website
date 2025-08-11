/**
 * Tyler Setup Platform - Jest Configuration
 * Comprehensive test configuration for all platforms
 */

const path = require('path');

// Base Jest configuration
const baseConfig = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
  testMatch: [
    '**/__tests__/**/*.(test|spec).(js|jsx|ts|tsx)',
    '**/*.(test|spec).(js|jsx|ts|tsx)'
  ],
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'node'],
  collectCoverage: true,
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageDirectory: '<rootDir>/coverage',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  verbose: true,
  testTimeout: 30000,
  maxWorkers: '50%'
};

// Backend-specific configuration
const backendConfig = {
  ...baseConfig,
  displayName: 'Backend',
  testMatch: [
    '<rootDir>/backend/**/*.(test|spec).(js|ts)',
    '<rootDir>/serverless-lean/**/*.(test|spec).(js|ts)',
    '<rootDir>/__tests__/backend/**/*.(test|spec).(js|ts)',
    '<rootDir>/__tests__/integration/**/*.(test|spec).(js|ts)'
  ],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest'
  },
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/backend/src/$1',
    '^@serverless/(.*)$': '<rootDir>/serverless-lean/src/$1',
    '^@graphql/(.*)$': '<rootDir>/graphql/$1',
    '^@test/(.*)$': '<rootDir>/__tests__/$1'
  },
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/setup.js',
    '<rootDir>/backend/__tests__/setup.js'
  ],
  collectCoverageFrom: [
    'backend/src/**/*.{js,ts}',
    'serverless-lean/src/**/*.{js,ts}',
    'graphql/**/*.{js,ts}',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/*.d.ts',
    '!**/dist/**'
  ]
};

// Frontend-specific configuration
const frontendConfig = {
  ...baseConfig,
  displayName: 'Frontend',
  testEnvironment: 'jsdom',
  testMatch: [
    '<rootDir>/frontend/**/*.(test|spec).(js|jsx|ts|tsx)',
    '<rootDir>/__tests__/frontend/**/*.(test|spec).(js|jsx|ts|tsx)'
  ],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
    '^.+\\.css$': 'jest-transform-css'
  },
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/frontend/src/$1',
    '^@components/(.*)$': '<rootDir>/frontend/src/components/$1',
    '^@hooks/(.*)$': '<rootDir>/frontend/src/hooks/$1',
    '^@pages/(.*)$': '<rootDir>/frontend/src/pages/$1',
    '^@lib/(.*)$': '<rootDir>/frontend/src/lib/$1',
    '^@test/(.*)$': '<rootDir>/__tests__/$1',
    '\\.(css|less|scss)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/__tests__/__mocks__/fileMock.js'
  },
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/setup.js',
    '<rootDir>/frontend/__tests__/setup.ts'
  ],
  collectCoverageFrom: [
    'frontend/src/**/*.{js,jsx,ts,tsx}',
    '!frontend/src/**/*.d.ts',
    '!frontend/src/main.tsx',
    '!frontend/src/vite-env.d.ts',
    '!**/node_modules/**',
    '!**/coverage/**'
  ]
};

// Mobile-specific configuration
const mobileConfig = {
  ...baseConfig,
  displayName: 'Mobile',
  preset: 'react-native',
  testMatch: [
    '<rootDir>/mobile/**/*.(test|spec).(js|jsx|ts|tsx)',
    '<rootDir>/__tests__/mobile/**/*.(test|spec).(js|jsx|ts|tsx)'
  ],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest'
  },
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/mobile/src/$1',
    '^@components/(.*)$': '<rootDir>/mobile/src/components/$1',
    '^@screens/(.*)$': '<rootDir>/mobile/src/screens/$1',
    '^@navigation/(.*)$': '<rootDir>/mobile/src/navigation/$1',
    '^@hooks/(.*)$': '<rootDir>/mobile/src/hooks/$1',
    '^@services/(.*)$': '<rootDir>/mobile/src/services/$1',
    '^@utils/(.*)$': '<rootDir>/mobile/src/utils/$1',
    '^@test/(.*)$': '<rootDir>/__tests__/$1'
  },
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/setup.js',
    '<rootDir>/__tests__/mobile-setup.js'
  ],
  collectCoverageFrom: [
    'mobile/src/**/*.{js,jsx,ts,tsx}',
    '!mobile/src/**/*.d.ts',
    '!**/node_modules/**',
    '!**/coverage/**'
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-vector-icons|@react-navigation|react-navigation|@apollo/client|react-native-reanimated|react-native-gesture-handler)/)'
  ]
};

// E2E configuration
const e2eConfig = {
  ...baseConfig,
  displayName: 'E2E',
  testMatch: [
    '<rootDir>/__tests__/e2e/**/*.(test|spec).(js|ts)',
    '<rootDir>/frontend/e2e/**/*.(test|spec).(js|ts)'
  ],
  setupFilesAfterEnv: ['<rootDir>/__tests__/e2e-setup.js'],
  testTimeout: 60000,
  collectCoverageFrom: []
};

// Multi-project configuration
module.exports = {
  projects: [
    backendConfig,
    frontendConfig,
    mobileConfig,
    e2eConfig
  ],
  collectCoverage: false, // Disable at root level
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'coverage',
      outputName: 'junit.xml'
    }],
    ['jest-html-reporters', {
      publicPath: './coverage',
      filename: 'report.html'
    }]
  ]
};

const path = require('path');

module.exports = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/src/test/setup.ts',
    '<rootDir>/jest.setup.js'
  ],
  
  // Module name mapping for aliases and static assets
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/test/(.*)$': '<rootDir>/src/test/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/__mocks__/fileMock.js'
  },
  
  // Test file patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.(test|spec).{js,jsx,ts,tsx}',
    '<rootDir>/__tests__/**/*.{js,jsx,ts,tsx}'
  ],
  
  // Files to ignore
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/build/',
    '<rootDir>/coverage/',
    '<rootDir>/cypress/',
    '<rootDir>/__tests__/e2e/',
    '<rootDir>/__tests__/performance/',
    '<rootDir>/__tests__/security/'
  ],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json',
    'json-summary',
    'clover',
    'cobertura'
  ],
  
  // Files to collect coverage from
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/test/**',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
    '!src/**/*.test.{js,jsx,ts,tsx}',
    '!src/**/*.spec.{js,jsx,ts,tsx}',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/main.tsx',
    '!src/App.tsx',
    '!src/debug.tsx',
    '!src/vite-env.d.ts'
  ],
  
  // Coverage thresholds - 80% minimum across all metrics
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    // Specific thresholds for critical modules
    './src/lib/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/hooks/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/services/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/security/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },
  
  // Transform configuration
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }],
        '@babel/preset-typescript'
      ],
      plugins: [
        '@babel/plugin-transform-runtime',
        '@babel/plugin-proposal-class-properties',
        '@babel/plugin-proposal-optional-chaining',
        '@babel/plugin-proposal-nullish-coalescing-operator'
      ]
    }]
  },
  
  // Module file extensions
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],
  
  // Global variables
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  },
  
  // Test timeout
  testTimeout: 30000,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Watch options
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/build/',
    '<rootDir>/coverage/'
  ],
  
  // Reporters
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '<rootDir>/coverage',
      outputName: 'junit.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }],
    ['jest-html-reporters', {
      publicPath: '<rootDir>/coverage',
      filename: 'report.html',
      expand: true,
      hideIcon: false,
      pageTitle: 'Security Dashboard Test Report',
      logoImgPath: undefined,
      inlineSource: false
    }]
  ],
  
  // Projects configuration for different test types
  projects: [
    {
      displayName: 'unit',
      testMatch: [
        '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
        '<rootDir>/src/**/*.(test|spec).{js,jsx,ts,tsx}'
      ],
      testPathIgnorePatterns: [
        '<rootDir>/src/**/*.integration.test.{js,jsx,ts,tsx}',
        '<rootDir>/src/**/*.e2e.test.{js,jsx,ts,tsx}'
      ]
    },
    {
      displayName: 'integration',
      testMatch: [
        '<rootDir>/__tests__/integration/**/*.{js,jsx,ts,tsx}',
        '<rootDir>/src/**/*.integration.test.{js,jsx,ts,tsx}'
      ],
      setupFilesAfterEnv: [
        '<rootDir>/src/test/setup.ts',
        '<rootDir>/jest.integration.setup.js'
      ]
    }
  ],
  
  // Max workers for parallel execution
  maxWorkers: '50%',
  
  // Cache configuration
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // Snapshot configuration
  snapshotSerializers: [
    '@emotion/jest/serializer'
  ],
  
  // Custom matchers
  setupFilesAfterEnv: [
    '<rootDir>/src/test/setup.ts',
    '<rootDir>/jest.setup.js'
  ]
};
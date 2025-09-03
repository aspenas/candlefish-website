const { pathsToModuleNameMapper } = require('ts-jest')

/** @type {import('jest').Config} */
module.exports = {
  displayName: 'Candlefish Animation Tests',
  testEnvironment: 'jsdom',
  
  // Test file patterns
  testMatch: [
    '<rootDir>/web/aquarium/__tests__/**/*.(test|spec).{js,jsx,ts,tsx}',
    '<rootDir>/__tests__/integration/fish-*.test.{js,ts}',
    '<rootDir>/__tests__/integration/websocket-*.test.{js,ts}'
  ],
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js'
  ],
  
  // Module name mapping for aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/web/(.*)$': '<rootDir>/web/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/hooks/(.*)$': '<rootDir>/hooks/$1',
    // Handle CSS imports
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // Handle image imports
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.js'
  },
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json'
    }],
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  
  // Coverage configuration
  collectCoverageFrom: [
    'web/aquarium/**/*.{js,ts,jsx,tsx}',
    '!web/aquarium/**/*.d.ts',
    '!web/aquarium/**/*.test.{js,ts,jsx,tsx}',
    '!web/aquarium/**/__tests__/**/*',
    '!web/aquarium/**/node_modules/**',
  ],
  
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    'web/aquarium/candlefish.ts': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  
  // Performance settings
  maxWorkers: '50%',
  testTimeout: 30000, // 30 seconds for complex animation tests
  
  // Mock configuration
  clearMocks: true,
  restoreMocks: true,
  
  // Module file extensions
  moduleFileExtensions: [
    'js',
    'jsx',
    'ts',
    'tsx',
    'json'
  ],
  
  // Global test environment variables
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  },
  
  // Test results processors
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './test-reports/html',
      filename: 'candlefish-animation-report.html',
      pageTitle: 'Candlefish Animation Test Results',
      logoImgPath: './public/img/candlefish-static.svg',
      expand: true
    }],
    ['jest-junit', {
      outputDirectory: './test-reports/junit',
      outputName: 'candlefish-animation-results.xml',
      suiteName: 'Candlefish Animation Tests',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      includeConsoleOutput: true
    }]
  ],
  
  // Verbose output for debugging
  verbose: true,
  
  // Custom test environment options
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  }
}
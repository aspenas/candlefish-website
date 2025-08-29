// Jest configuration for test coverage reporting
module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Root directories for tests
  roots: ['<rootDir>/tests'],
  
  // Test patterns
  testMatch: [
    '**/__tests__/**/*.(test|spec).(ts|tsx|js|jsx)',
    '**/*.(test|spec).(ts|tsx|js|jsx)',
  ],
  
  // File extensions to consider
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Transform files with TypeScript
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: [
    'text',           // Console output
    'lcov',           // For IDE integration and CI/CD
    'html',           // Human-readable HTML report
    'json',           // Machine-readable JSON report
    'cobertura',      // For CI/CD systems that support Cobertura
  ],
  
  // Files to include in coverage
  collectCoverageFrom: [
    'src/**/*.{ts,tsx,js,jsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx,js,jsx}',
    '!src/**/*.spec.{ts,tsx,js,jsx}',
    '!src/**/__tests__/**/*',
    '!src/**/__mocks__/**/*',
    '!src/**/node_modules/**',
    '!src/**/vendor/**',
  ],
  
  // Coverage thresholds (will fail if not met)
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // Specific thresholds for critical modules
    './src/services/valuation.{ts,js}': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './src/services/market-data.{ts,js}': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    './src/services/cache.{ts,js}': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/config/jest.setup.js',
  ],
  
  // Module name mapping for imports
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
  },
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/vendor/',
    '/build/',
    '/dist/',
  ],
  
  // Coverage path ignore patterns
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/vendor/',
    '/build/',
    '/dist/',
    '/tests/',
    'main.go',
    '.*\\.config\\.(js|ts)$',
    '.*\\.d\\.ts$',
  ],
  
  // Test timeout
  testTimeout: 10000,
  
  // Verbose output
  verbose: true,
  
  // Detect open handles
  detectOpenHandles: true,
  
  // Force exit
  forceExit: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Global setup and teardown
  globalSetup: '<rootDir>/tests/config/global-setup.js',
  globalTeardown: '<rootDir>/tests/config/global-teardown.js',
  
  // Custom reporters
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '<rootDir>/test-results',
      outputName: 'junit.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true,
    }],
    ['jest-html-reporters', {
      publicPath: '<rootDir>/test-results',
      filename: 'report.html',
      expand: true,
    }],
  ],
  
  // Error handling
  errorOnDeprecated: true,
  
  // Snapshot options
  updateSnapshot: false,
  
  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
};
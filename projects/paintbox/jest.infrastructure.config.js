/**
 * Jest Configuration for Infrastructure Testing
 * Specialized configuration for comprehensive infrastructure test coverage
 */

const baseConfig = require('./jest.config.js');

module.exports = {
  ...baseConfig,
  displayName: 'Infrastructure Tests',
  testMatch: [
    '<rootDir>/__tests__/api/infrastructure/**/*.test.{js,ts}',
    '<rootDir>/__tests__/components/infrastructure/**/*.test.{tsx,ts}',
    '<rootDir>/__tests__/hooks/useInfrastructureWebSocket.test.ts',
    '<rootDir>/__tests__/performance/infrastructure-performance.test.ts',
    '<rootDir>/__tests__/security/infrastructure-security.test.ts'
  ],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage/infrastructure',
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json',
    'clover'
  ],
  
  // Coverage thresholds for infrastructure components
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    },
    // Stricter requirements for critical infrastructure components
    './app/api/health/**/*.ts': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './components/infrastructure/**/*.tsx': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './hooks/useInfrastructureWebSocket.ts': {
      branches: 95,
      functions: 100,
      lines: 95,
      statements: 95
    },
    './stores/useInfrastructureStore.ts': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },
  
  // Files to include in coverage
  collectCoverageFrom: [
    'app/api/health/**/*.{js,ts}',
    'app/api/workflows/**/*.{js,ts}',
    'app/api/webhooks/**/*.{js,ts}',
    'components/infrastructure/**/*.{tsx,ts}',
    'hooks/useInfrastructureWebSocket.ts',
    'stores/useInfrastructureStore.ts',
    'lib/services/healthService.ts',
    'lib/services/temporalService.ts',
    'lib/services/slackService.ts',
    'lib/services/loadTestService.ts',
    'lib/services/drService.ts',
    'lib/middleware/**/*.{js,ts}',
    'lib/security/**/*.{js,ts}',
    '!**/*.d.ts',
    '!**/*.config.{js,ts}',
    '!**/*.test.{js,ts,tsx}',
    '!**/__tests__/**',
    '!**/__mocks__/**',
    '!**/node_modules/**'
  ],
  
  // Test environment setup
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/setup/infrastructure-setup.ts'
  ],
  
  // Module name mapping for infrastructure components
  moduleNameMapping: {
    '^@/components/infrastructure/(.*)$': '<rootDir>/components/infrastructure/$1',
    '^@/hooks/useInfrastructureWebSocket$': '<rootDir>/hooks/useInfrastructureWebSocket',
    '^@/stores/useInfrastructureStore$': '<rootDir>/stores/useInfrastructureStore',
    '^@/lib/services/(.*)$': '<rootDir>/lib/services/$1',
    '^@/lib/middleware/(.*)$': '<rootDir>/lib/middleware/$1',
    '^@/lib/security/(.*)$': '<rootDir>/lib/security/$1'
  },
  
  // Custom test timeout for infrastructure tests
  testTimeout: 30000,
  
  // Performance testing configuration
  maxWorkers: '50%',
  
  // Global test variables
  globals: {
    'process.env.NODE_ENV': 'test',
    'process.env.TEST_SUITE': 'infrastructure'
  },
  
  // Test result processor for custom reporting
  testResultsProcessor: '<rootDir>/__tests__/utils/infrastructureTestProcessor.js',
  
  // Custom reporters
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: '<rootDir>/coverage/infrastructure/html-report',
        filename: 'infrastructure-test-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'Infrastructure Test Report',
        logoImgPath: '<rootDir>/public/logo.png'
      }
    ],
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/coverage/infrastructure',
        outputName: 'infrastructure-junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true
      }
    ]
  ],
  
  // Transform configuration for TypeScript and React
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true
        }
      }
    ]
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Test environment
  testEnvironment: 'jsdom',
  
  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};
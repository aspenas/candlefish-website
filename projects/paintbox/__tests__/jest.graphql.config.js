/**
 * Jest Configuration for GraphQL Testing
 * Specialized configuration for testing GraphQL resolvers, schema, and subscriptions
 */

module.exports = {
  displayName: 'GraphQL Tests',
  
  // Test environment
  testEnvironment: 'node',
  
  // Root directory
  rootDir: '../',
  
  // Test file patterns - only GraphQL related tests
  testMatch: [
    '<rootDir>/__tests__/unit/graphql/**/*.(test|spec).(js|ts)',
    '<rootDir>/__tests__/integration/graphql/**/*.(test|spec).(js|ts)',
    '<rootDir>/lib/graphql/**/__tests__/**/*.(test|spec).(js|ts)',
  ],
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/setup/graphql.setup.js'
  ],
  
  // Module name mapping
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@lib/(.*)$': '<rootDir>/lib/$1',
    '^@test/(.*)$': '<rootDir>/__tests__/$1',
    '^@mocks/(.*)$': '<rootDir>/__tests__/mocks/$1',
    '^@factories/(.*)$': '<rootDir>/__tests__/factories/$1',
  },
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        compilerOptions: {
          module: 'commonjs',
          target: 'es2020',
          lib: ['es2020'],
          moduleResolution: 'node',
          allowSyntheticDefaultImports: true,
          esModuleInterop: true,
          skipLibCheck: true,
          strict: true,
        },
      },
    }],
    '^.+\\.graphql$': 'jest-transform-graphql',
    '^.+\\.gql$': 'jest-transform-graphql',
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'graphql', 'gql'],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/dist/',
    '<rootDir>/build/',
  ],
  
  // Coverage configuration for GraphQL files
  collectCoverageFrom: [
    '<rootDir>/lib/graphql/**/*.{ts,js}',
    '<rootDir>/lib/services/**/*.{ts,js}',
    '!<rootDir>/lib/**/*.d.ts',
    '!<rootDir>/lib/**/__tests__/**',
    '!<rootDir>/lib/**/*.test.{ts,js}',
    '!<rootDir>/lib/**/*.spec.{ts,js}',
  ],
  
  coverageDirectory: '<rootDir>/coverage/graphql',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    '<rootDir>/lib/graphql/resolvers.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  
  // GraphQL specific globals
  globals: {
    'ts-jest': {
      useESM: false,
    },
    __GRAPHQL_ENDPOINT__: 'http://localhost:4000/graphql',
    __SUBSCRIPTIONS_ENDPOINT__: 'ws://localhost:4000/graphql',
  },
  
  // Test timeout for complex GraphQL operations
  testTimeout: 15000,
  
  // Verbose output for GraphQL tests
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks
  restoreMocks: true,
  
  // Error on deprecated
  errorOnDeprecated: true,
  
  // Detect open handles (important for GraphQL subscriptions)
  detectOpenHandles: true,
  
  // Force exit after tests complete
  forceExit: true,
  
  // Max workers for GraphQL tests (fewer due to complexity)
  maxWorkers: process.env.CI ? 1 : 2,
  
  // Reporters
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '<rootDir>/coverage/graphql',
      outputName: 'junit-graphql.xml',
      suiteName: 'GraphQL Tests',
    }],
  ],
  
  // Module mocks for GraphQL testing
  moduleNameMapping: {
    // Mock external GraphQL services
    '^apollo-server-express$': '<rootDir>/__tests__/mocks/apolloServer.js',
    '^graphql-subscriptions$': '<rootDir>/__tests__/mocks/graphqlSubscriptions.js',
    '^dataloader$': '<rootDir>/__tests__/mocks/dataloader.js',
    
    // Mock database connections
    '^../services/database$': '<rootDir>/__tests__/mocks/database.js',
    
    // Mock external APIs
    '^axios$': '<rootDir>/__tests__/mocks/axios.js',
    '^dockerode$': '<rootDir>/__tests__/mocks/dockerode.js',
  },
  
  // Preset for GraphQL testing
  preset: 'ts-jest/presets/default',
  
  // Cache configuration
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest-graphql',
  
  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
};
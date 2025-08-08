/**
 * Jest Configuration for React Native Mobile App
 * Configures testing environment for React Native components, screens, and services
 */

module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: [
    '@testing-library/jest-native/extend-expect',
    '<rootDir>/src/test/setup.ts'
  ],

  // Test environment
  testEnvironment: 'jsdom',

  // Module name mapping for React Native
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@test/(.*)$': '<rootDir>/__tests__/$1',
    '^@mocks/(.*)$': '<rootDir>/__tests__/mocks/$1',
    '^@factories/(.*)$': '<rootDir>/__tests__/factories/$1',
  },

  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['babel-jest', {
      presets: [
        ['babel-preset-expo', { jsxImportSource: '@emotion/react' }],
        '@babel/preset-typescript'
      ]
    }],
    '^.+\\.(js|jsx)$': 'babel-jest',
  },

  // File extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.(test|spec).(ts|tsx|js|jsx)',
    '**/src/**/__tests__/**/*.(test|spec).(ts|tsx|js|jsx)',
  ],

  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.expo/',
    '<rootDir>/dist/',
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/test/**',
    '!src/**/__tests__/**',
    '!src/**/*.story.{ts,tsx}',
    '!src/**/*.stories.{ts,tsx}',
  ],

  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],

  coverageThreshold: {
    global: {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  },

  // Module mocks
  moduleNameMapping: {
    // React Native modules
    '^react-native$': 'react-native-web',
    '^@react-native-async-storage/async-storage$': '<rootDir>/__tests__/mocks/AsyncStorage.js',
    '^@react-native-community/netinfo$': '<rootDir>/__tests__/mocks/NetInfo.js',
    '^react-native-flash-message$': '<rootDir>/__tests__/mocks/FlashMessage.js',
    '^react-native-haptic-feedback$': '<rootDir>/__tests__/mocks/HapticFeedback.js',
    '^lottie-react-native$': '<rootDir>/__tests__/mocks/Lottie.js',
    '^react-native-vector-icons/(.*)$': '<rootDir>/__tests__/mocks/VectorIcons.js',
    '^react-native-chart-kit$': '<rootDir>/__tests__/mocks/ChartKit.js',
    '^react-native-svg$': '<rootDir>/__tests__/mocks/Svg.js',
    '^react-native-super-grid$': '<rootDir>/__tests__/mocks/SuperGrid.js',
    '^expo-notifications$': '<rootDir>/__tests__/mocks/Notifications.js',
    '^expo-linking$': '<rootDir>/__tests__/mocks/Linking.js',
    '^expo-background-fetch$': '<rootDir>/__tests__/mocks/BackgroundFetch.js',
    '^expo-task-manager$': '<rootDir>/__tests__/mocks/TaskManager.js',

    // Navigation
    '^@react-navigation/native$': '<rootDir>/__tests__/mocks/Navigation.js',
    '^@react-navigation/stack$': '<rootDir>/__tests__/mocks/NavigationStack.js',
    '^@react-navigation/bottom-tabs$': '<rootDir>/__tests__/mocks/NavigationTabs.js',

    // UI components
    '^react-native-paper$': '<rootDir>/__tests__/mocks/Paper.js',
    '^react-native-linear-gradient$': '<rootDir>/__tests__/mocks/LinearGradient.js',

    // GraphQL and Apollo
    '^@apollo/client$': '@apollo/client',
    '^graphql$': 'graphql',
    '^graphql-ws$': '<rootDir>/__tests__/mocks/GraphQLWS.js',
  },

  // Global setup
  globalSetup: '<rootDir>/__tests__/setup/globalSetup.js',
  globalTeardown: '<rootDir>/__tests__/setup/globalTeardown.js',

  // Test timeout
  testTimeout: 30000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,

  // Setup files
  setupFiles: [
    '<rootDir>/__tests__/setup/jest.setup.js'
  ],

  // Reporters
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '<rootDir>/coverage',
      outputName: 'junit.xml',
      suiteName: 'React Native Tests',
    }],
  ],

  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],

  // Snapshot serializers
  snapshotSerializers: [
    'enzyme-to-json/serializer'
  ],

  // Error on deprecated
  errorOnDeprecated: true,

  // Notify mode
  notify: false,
  notifyMode: 'failure-change',

  // Cache
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',

  // Max workers for CI
  maxWorkers: process.env.CI ? 2 : '50%',

  // Collect coverage in CI
  collectCoverage: Boolean(process.env.CI),

  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost:8081',
  },

  // Global variables
  globals: {
    __DEV__: true,
    __TEST__: true,
  },
};

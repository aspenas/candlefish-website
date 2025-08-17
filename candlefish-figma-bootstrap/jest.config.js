module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__', '<rootDir>/plugin/src', '<rootDir>/scripts'],
  testMatch: [
    '**/__tests__/**/*.test.(ts|js)',
    '**/?(*.)+(spec|test).(ts|js)'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'plugin/src/**/*.ts',
    'scripts/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  testTimeout: 10000,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  // Mock modules that don't exist in test environment
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/plugin/src/$1'
  },
  // Handle Figma-specific globals
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  }
};

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__', '<rootDir>/dashboard/src'],
  testMatch: [
    '**/__tests__/**/*.test.{js,ts,tsx}',
    '**/*.test.{js,ts,tsx}',
    '**/*.spec.{js,ts,tsx}'
  ],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    '^.+\\.jsx?$': 'babel-jest'
  },
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/setup/jest.setup.js'
  ],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/dashboard/src/$1',
    '^@tests/(.*)$': '<rootDir>/__tests__/$1'
  },
  collectCoverageFrom: [
    'dashboard/src/**/*.{ts,tsx}',
    '!dashboard/src/**/*.d.ts',
    '!dashboard/src/vite-env.d.ts'
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
  testTimeout: 30000,
  verbose: true,
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/__tests__/unit/**/*.test.{js,ts,tsx}']
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/__tests__/integration/**/*.test.{js,ts,tsx}']
    },
    {
      displayName: 'e2e',
      testMatch: ['<rootDir>/__tests__/e2e/**/*.test.{js,ts,tsx}']
    },
    {
      displayName: 'performance',
      testMatch: ['<rootDir>/__tests__/performance/**/*.test.{js,ts,tsx}']
    }
  ]
}

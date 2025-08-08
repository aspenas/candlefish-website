// Global test setup
import { jest } from '@jest/globals';

// Set environment variables for testing
process.env.AWS_REGION = 'us-east-1';
process.env.SECRETS_PREFIX = 'test-app-dev';
process.env.STAGE = 'test';
process.env.AWS_REQUEST_ID = 'test-request-id';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test timeout
jest.setTimeout(30000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

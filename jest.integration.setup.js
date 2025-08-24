// Jest setup for integration tests

// Mock environment variables for integration tests
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://candlefish_test:password@localhost:5432/candlefish_integration_test';
process.env.REDIS_URL = 'redis://localhost:6379/2';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'integration-test-jwt-secret-key-for-testing-only';
process.env.API_URL = 'http://localhost:4000';
process.env.WS_URL = 'ws://localhost:4001';

// Extended timeout for integration tests
jest.setTimeout(60000);

// Setup and teardown for integration tests
let testDatabase;
let testRedis;

beforeAll(async () => {
  // Database setup would go here
  console.log('Setting up integration test environment...');
});

afterAll(async () => {
  // Cleanup would go here
  console.log('Cleaning up integration test environment...');
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global error handling for integration tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

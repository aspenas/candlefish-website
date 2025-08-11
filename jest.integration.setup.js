import { server } from './__tests__/__mocks__/server';

// Start MSW server before all tests
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'error',
  });
});

// Reset handlers after each test
afterEach(() => {
  server.resetHandlers();
});

// Stop MSW server after all tests
afterAll(() => {
  server.close();
});

// Global test timeout for integration tests
jest.setTimeout(60000);

// Environment variables for testing
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/candlefish_test';
process.env.REDIS_URL = 'redis://localhost:6379/1';
process.env.JWT_SECRET = 'test-jwt-secret-key';

// Mock external services
global.fetch = require('node-fetch');

// Database test utilities
export const setupTestDatabase = async () => {
  // Database setup logic would go here
  console.log('Setting up test database...');
};

export const teardownTestDatabase = async () => {
  // Database cleanup logic would go here
  console.log('Tearing down test database...');
};

// Global setup and teardown hooks
beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

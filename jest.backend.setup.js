// Jest setup for backend/Node.js tests

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.REDIS_URL = 'redis://localhost:6379/1';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';

// Mock AWS SDK
jest.mock('@aws-sdk/client-secrets-manager', () => ({
  SecretsManagerClient: jest.fn(() => ({
    send: jest.fn(),
  })),
  GetSecretValueCommand: jest.fn(),
}));

// Mock Redis client
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    flushall: jest.fn(),
    on: jest.fn(),
  })),
}));

// Mock PostgreSQL client
jest.mock('pg', () => ({
  Pool: jest.fn(() => ({
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
  })),
  Client: jest.fn(() => ({
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
  })),
}));

// Global test timeout for backend tests
jest.setTimeout(30000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

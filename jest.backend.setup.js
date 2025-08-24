// Jest setup for backend/Node.js tests

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.REDIS_URL = 'redis://localhost:6379/1';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';
process.env.INVENTORY_DB_PATH = ':memory:';
process.env.INVENTORY_API_URL = 'http://localhost:8080/api/v1';

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

// Mock SQLite for inventory backend
jest.mock('sqlite3', () => ({
  Database: jest.fn().mockImplementation(() => ({
    run: jest.fn((sql, params, callback) => {
      if (typeof params === 'function') callback = params;
      callback && callback(null);
    }),
    get: jest.fn((sql, params, callback) => {
      if (typeof params === 'function') callback = params;
      callback && callback(null, {});
    }),
    all: jest.fn((sql, params, callback) => {
      if (typeof params === 'function') callback = params;
      callback && callback(null, []);
    }),
    close: jest.fn((callback) => callback && callback(null)),
    serialize: jest.fn((callback) => callback && callback()),
    parallelize: jest.fn()
  }))
}));

// Mock HTTP client for Go backend testing
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    headers: new Headers(),
    clone: () => ({ json: () => Promise.resolve({}) })
  })
);

// Mock file system operations for image uploads
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  writeFile: jest.fn((path, data, callback) => callback && callback(null)),
  unlink: jest.fn((path, callback) => callback && callback(null)),
  mkdir: jest.fn((path, options, callback) => {
    if (typeof options === 'function') callback = options;
    callback && callback(null);
  })
}));

// Global test timeout for backend tests
jest.setTimeout(30000);

// Setup and cleanup for each test
beforeEach(() => {
  fetch.mockClear();
});

afterEach(() => {
  jest.clearAllMocks();
});

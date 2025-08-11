/**
 * Tyler Setup Platform - Global Test Setup
 * Shared configuration for all test environments
 */

// Global test timeout
jest.setTimeout(30000);

// Mock console methods in tests unless explicitly enabled
const originalError = console.error;
const originalWarn = console.warn;
const originalLog = console.log;

beforeAll(() => {
  // Suppress console output unless VERBOSE_TESTS is set
  if (!process.env.VERBOSE_TESTS) {
    console.error = jest.fn();
    console.warn = jest.fn();
    console.log = jest.fn();
  }

  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.AWS_REGION = 'us-east-1';
  process.env.GRAPHQL_ENDPOINT = 'http://localhost:4000/graphql';
  process.env.WEBSOCKET_ENDPOINT = 'ws://localhost:4000/graphql';
});

afterAll(() => {
  // Restore console methods
  console.error = originalError;
  console.warn = originalWarn;
  console.log = originalLog;
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit in test environment, just log
});

// Mock AWS SDK globally
jest.mock('aws-sdk', () => {
  const mockSecretsManager = {
    getSecretValue: jest.fn(() => ({
      promise: jest.fn(() => Promise.resolve({
        SecretString: JSON.stringify({
          database_url: 'test://localhost:5432/test_db',
          jwt_secret: 'test-jwt-secret',
          encryption_key: 'test-encryption-key'
        })
      }))
    })),
    updateSecret: jest.fn(() => ({
      promise: jest.fn(() => Promise.resolve({}))
    })),
    createSecret: jest.fn(() => ({
      promise: jest.fn(() => Promise.resolve({ ARN: 'test-arn' }))
    }))
  };

  const mockCloudWatch = {
    putMetricData: jest.fn(() => ({
      promise: jest.fn(() => Promise.resolve({}))
    }))
  };

  const mockLambda = {
    invoke: jest.fn(() => ({
      promise: jest.fn(() => Promise.resolve({
        Payload: JSON.stringify({ statusCode: 200, body: '{}' })
      }))
    }))
  };

  return {
    SecretsManager: jest.fn(() => mockSecretsManager),
    CloudWatch: jest.fn(() => mockCloudWatch),
    Lambda: jest.fn(() => mockLambda),
    config: {
      update: jest.fn()
    }
  };
});

// Mock Redis globally
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
    quit: jest.fn()
  }))
}));

// Mock WebSocket for subscription tests
global.WebSocket = class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 1; // OPEN
    this.onopen = null;
    this.onclose = null;
    this.onmessage = null;
    this.onerror = null;

    // Simulate connection
    setTimeout(() => {
      if (this.onopen) this.onopen();
    }, 0);
  }

  send(data) {
    // Mock implementation
  }

  close() {
    this.readyState = 3; // CLOSED
    if (this.onclose) this.onclose();
  }
};

// Mock fetch globally
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    headers: new Map()
  })
);

// Mock crypto for tests
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'mock-uuid',
    getRandomValues: (arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }
  }
});

// Helper functions for tests
global.waitFor = (fn, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const check = () => {
      try {
        const result = fn();
        if (result) {
          resolve(result);
        } else if (Date.now() - startTime > timeout) {
          reject(new Error('Timeout waiting for condition'));
        } else {
          setTimeout(check, 10);
        }
      } catch (error) {
        if (Date.now() - startTime > timeout) {
          reject(error);
        } else {
          setTimeout(check, 10);
        }
      }
    };

    check();
  });
};

global.sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Test data factory helpers
global.createMockUser = (overrides = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  organizationId: 'org-123',
  role: 'USER',
  isActive: true,
  firstName: 'Test',
  lastName: 'User',
  timezone: 'America/New_York',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides
});

global.createMockOrganization = (overrides = {}) => ({
  id: 'org-123',
  name: 'Test Organization',
  slug: 'test-org',
  plan: 'PREMIUM',
  maxUsers: 100,
  currentUsers: 5,
  isActive: true,
  settings: {
    timezone: 'America/New_York',
    currency: 'USD'
  },
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides
});

global.createMockDashboard = (overrides = {}) => ({
  id: 'dashboard-123',
  name: 'Test Dashboard',
  organizationId: 'org-123',
  createdBy: 'user-123',
  isActive: true,
  config: {
    layout: 'grid',
    theme: 'default',
    widgets: []
  },
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides
});

global.createMockWidget = (overrides = {}) => ({
  id: 'widget-123',
  type: 'metric',
  title: 'Test Widget',
  query: 'SELECT count(*) as count FROM events',
  config: {
    format: 'number',
    color: '#3B82F6'
  },
  position: { x: 0, y: 0, width: 6, height: 4 },
  ...overrides
});

// Database test helpers
global.setupTestDb = async () => {
  // Mock database setup
  return {
    cleanup: async () => {
      // Mock cleanup
    }
  };
};

// GraphQL test helpers
global.createGraphQLContext = (user = global.createMockUser()) => ({
  req: {
    user,
    headers: {
      authorization: 'Bearer mock-token'
    }
  },
  res: {},
  pubsub: {
    publish: jest.fn(),
    subscribe: jest.fn(),
    asyncIterator: jest.fn()
  }
});

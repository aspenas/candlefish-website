// Jest setup file - runs before all tests

// Extend Jest matchers
import '@testing-library/jest-dom';

// Mock console methods to reduce noise in tests unless explicitly needed
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = (...args) => {
  // Only show console.error if it's not a React warning we want to suppress
  if (typeof args[0] === 'string' && args[0].includes('Warning:')) {
    return;
  }
  originalConsoleError.apply(console, args);
};

console.warn = (...args) => {
  // Suppress specific warnings during tests
  if (typeof args[0] === 'string') {
    if (args[0].includes('React.createFactory') ||
        args[0].includes('componentWillReceiveProps') ||
        args[0].includes('componentWillUpdate')) {
      return;
    }
  }
  originalConsoleWarn.apply(console, args);
};

// Global test utilities
global.testUtils = {
  // Helper to create mock timers and clean them up
  withFakeTimers: (callback) => {
    jest.useFakeTimers();
    try {
      return callback();
    } finally {
      jest.useRealTimers();
    }
  },
  
  // Helper to wait for async operations
  waitFor: (callback, timeout = 5000) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const check = () => {
        try {
          const result = callback();
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
  },
  
  // Helper to create mock functions with call tracking
  createMockFunction: (name, implementation) => {
    const mockFn = jest.fn(implementation);
    mockFn.mockName = name;
    return mockFn;
  },
};

// Global test configuration
global.testConfig = {
  // Test timeouts
  timeouts: {
    short: 1000,
    medium: 5000,
    long: 10000,
  },
  
  // Test data
  testData: {
    validItemId: 'test-item-123',
    validRoomId: 'test-room-456',
    validUserId: 'test-user-789',
  },
  
  // Mock API responses
  mockResponses: {
    success: (data) => ({ data, status: 200 }),
    error: (message, status = 500) => ({ error: message, status }),
    loading: { loading: true },
  },
};

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test_db';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_SECRET = 'test-jwt-secret';

// Mock fetch globally for tests
global.fetch = jest.fn();

// Mock WebSocket for tests
global.WebSocket = jest.fn(() => ({
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1, // WebSocket.OPEN
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: jest.fn(),
});

// Setup and teardown hooks
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Reset fetch mock
  if (global.fetch) {
    global.fetch.mockClear();
  }
  
  // Clear any timers
  jest.clearAllTimers();
});

afterEach(() => {
  // Clean up any remaining timers
  jest.clearAllTimers();
  
  // Clear any DOM changes
  if (document.body) {
    document.body.innerHTML = '';
  }
  
  // Reset any global state
  if (global.testState) {
    global.testState = {};
  }
});

// Global error handler for unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit process in tests, just log the error
});

// Increase timeout for async tests
jest.setTimeout(10000);

// Mock Date.now() to return consistent values in tests
const mockDate = new Date('2024-01-15T10:30:00Z');
const originalDateNow = Date.now;

// Utility to mock Date.now() in tests
global.mockDateNow = (date = mockDate) => {
  Date.now = jest.fn(() => date.getTime());
};

global.restoreDateNow = () => {
  Date.now = originalDateNow;
};

// Test utilities for React components
global.renderWithProviders = (ui, options = {}) => {
  // This would be implemented based on your specific provider setup
  // Example structure:
  return {
    // Return render result with providers wrapped
    ...ui,
    options,
  };
};

// Custom matchers for better test assertions
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
  
  toHaveBeenCalledWithObjectContaining(received, expected) {
    const pass = received.mock.calls.some(call => {
      return call.some(arg => {
        if (typeof arg === 'object' && arg !== null) {
          return Object.keys(expected).every(key => {
            return arg.hasOwnProperty(key) && arg[key] === expected[key];
          });
        }
        return false;
      });
    });
    
    if (pass) {
      return {
        message: () => `expected function not to have been called with object containing ${JSON.stringify(expected)}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected function to have been called with object containing ${JSON.stringify(expected)}`,
        pass: false,
      };
    }
  },
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Performance monitoring for tests
global.testPerformance = {
  startTime: null,
  endTime: null,
  
  start() {
    this.startTime = performance.now();
  },
  
  end() {
    this.endTime = performance.now();
    return this.endTime - this.startTime;
  },
  
  measure(name, fn) {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    console.log(`${name} took ${end - start} milliseconds`);
    return result;
  },
};

// Memory leak detection helper
global.detectMemoryLeaks = () => {
  if (typeof gc !== 'undefined') {
    gc();
    const memUsage = process.memoryUsage();
    return {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
    };
  }
  return null;
};

// Database test helpers
global.dbTestHelpers = {
  // Helper to clean up test data
  cleanup: async () => {
    // Implementation would depend on your database setup
    console.log('Cleaning up test database...');
  },
  
  // Helper to seed test data
  seed: async (data) => {
    // Implementation would depend on your database setup
    console.log('Seeding test database with:', data);
  },
};

console.log('Jest setup complete - ready for testing!');
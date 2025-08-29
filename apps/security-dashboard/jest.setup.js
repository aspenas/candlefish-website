// Jest setup file for global test configuration
import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { server } from './src/test/__mocks__/server';

// Configure React Testing Library
configure({
  testIdAttribute: 'data-testid',
  computedStyleSupportsPseudoElements: false,
});

// Extend Jest matchers
expect.extend({
  // Custom matcher for testing authentication
  toHaveValidAuthToken(received) {
    const pass = typeof received === 'string' && 
                 received.startsWith('Bearer ') && 
                 received.length > 20;
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid auth token`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid auth token`,
        pass: false,
      };
    }
  },
  
  // Custom matcher for testing security headers
  toHaveSecurityHeaders(received) {
    const requiredHeaders = [
      'x-content-type-options',
      'x-frame-options',
      'x-xss-protection',
      'strict-transport-security'
    ];
    
    const missingHeaders = requiredHeaders.filter(
      header => !received.headers || !received.headers[header]
    );
    
    const pass = missingHeaders.length === 0;
    
    if (pass) {
      return {
        message: () => `expected response not to have all security headers`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected response to have security headers: ${missingHeaders.join(', ')}`,
        pass: false,
      };
    }
  },
  
  // Custom matcher for testing error responses
  toBeSecureError(received) {
    const pass = received.status >= 400 && 
                 received.body && 
                 !received.body.includes('stack trace') &&
                 !received.body.includes('internal server error') &&
                 !received.body.includes('database error');
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a secure error response`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a secure error response without information disclosure`,
        pass: false,
      };
    }
  }
});

// Global test configuration
global.console = {
  ...console,
  // Suppress console.error during tests unless explicitly needed
  error: jest.fn((...args) => {
    if (process.env.NODE_ENV !== 'test' || process.env.SHOW_CONSOLE_ERRORS === 'true') {
      console.error(...args);
    }
  }),
  // Suppress console.warn during tests unless explicitly needed
  warn: jest.fn((...args) => {
    if (process.env.NODE_ENV !== 'test' || process.env.SHOW_CONSOLE_WARNINGS === 'true') {
      console.warn(...args);
    }
  }),
};

// Mock window.matchMedia for responsive components
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

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn(() => Promise.resolve()),
    readText: jest.fn(() => Promise.resolve('mocked clipboard content')),
  },
  writable: true,
});

// Mock geolocation
Object.defineProperty(navigator, 'geolocation', {
  value: {
    getCurrentPosition: jest.fn((success) => {
      success({
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
        },
      });
    }),
    watchPosition: jest.fn(),
    clearWatch: jest.fn(),
  },
  writable: true,
});

// Mock WebSocket for real-time features
global.WebSocket = class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = WebSocket.CONNECTING;
    this.CONNECTING = 0;
    this.OPEN = 1;
    this.CLOSING = 2;
    this.CLOSED = 3;
    
    // Simulate connection opening
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) this.onopen(new Event('open'));
    }, 10);
  }
  
  send(data) {
    if (this.readyState === WebSocket.OPEN && this.onmessage) {
      // Echo back for testing
      setTimeout(() => {
        this.onmessage(new MessageEvent('message', { data }));
      }, 10);
    }
  }
  
  close() {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) this.onclose(new CloseEvent('close'));
  }
  
  addEventListener(type, listener) {
    this[`on${type}`] = listener;
  }
  
  removeEventListener(type, listener) {
    this[`on${type}`] = null;
  }
};

// Mock EventSource for server-sent events
global.EventSource = class MockEventSource {
  constructor(url) {
    this.url = url;
    this.readyState = EventSource.CONNECTING;
    this.CONNECTING = 0;
    this.OPEN = 1;
    this.CLOSED = 2;
    
    setTimeout(() => {
      this.readyState = EventSource.OPEN;
      if (this.onopen) this.onopen(new Event('open'));
    }, 10);
  }
  
  close() {
    this.readyState = EventSource.CLOSED;
    if (this.onclose) this.onclose(new Event('close'));
  }
  
  addEventListener(type, listener) {
    this[`on${type}`] = listener;
  }
  
  removeEventListener(type, listener) {
    this[`on${type}`] = null;
  }
};

// Mock fetch for HTTP requests
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    headers: new Headers(),
  })
);

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn((key) => {
    return localStorageMock.store[key] || null;
  }),
  setItem: jest.fn((key, value) => {
    localStorageMock.store[key] = value;
  }),
  removeItem: jest.fn((key) => {
    delete localStorageMock.store[key];
  }),
  clear: jest.fn(() => {
    localStorageMock.store = {};
  }),
  store: {},
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn((key) => {
    return sessionStorageMock.store[key] || null;
  }),
  setItem: jest.fn((key, value) => {
    sessionStorageMock.store[key] = value;
  }),
  removeItem: jest.fn((key) => {
    delete sessionStorageMock.store[key];
  }),
  clear: jest.fn(() => {
    sessionStorageMock.store = {};
  }),
  store: {},
};

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Mock URL.createObjectURL for file downloads
global.URL.createObjectURL = jest.fn(() => 'mock-blob-url');
global.URL.revokeObjectURL = jest.fn();

// Mock crypto for security functions
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: (arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
    subtle: {
      digest: jest.fn(() => Promise.resolve(new ArrayBuffer(32))),
      encrypt: jest.fn(() => Promise.resolve(new ArrayBuffer(16))),
      decrypt: jest.fn(() => Promise.resolve(new ArrayBuffer(16))),
    },
  },
});

// Mock performance API
Object.defineProperty(global, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByType: jest.fn(() => []),
    getEntriesByName: jest.fn(() => []),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
  },
});

// Setup and teardown for MSW (Mock Service Worker)
beforeAll(() => {
  // Start the mock server
  server.listen({
    onUnhandledRequest: 'error',
  });
});

afterEach(() => {
  // Reset any request handlers that are declared in tests
  server.resetHandlers();
  
  // Clear all mocks
  jest.clearAllMocks();
  
  // Clear storage mocks
  localStorageMock.clear();
  sessionStorageMock.clear();
  
  // Clear any timers
  jest.clearAllTimers();
});

afterAll(() => {
  // Clean up after all tests
  server.close();
});

// Global error handler for unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.REACT_APP_API_URL = 'http://localhost:4000';
process.env.REACT_APP_WS_URL = 'ws://localhost:4001';

// Mock Chart.js for chart components
jest.mock('chart.js', () => ({
  Chart: {
    register: jest.fn(),
  },
  CategoryScale: jest.fn(),
  LinearScale: jest.fn(),
  BarElement: jest.fn(),
  Title: jest.fn(),
  Tooltip: jest.fn(),
  Legend: jest.fn(),
}));

// Mock D3 for data visualization components
jest.mock('d3', () => ({
  select: jest.fn(() => ({
    selectAll: jest.fn(() => ({
      data: jest.fn(() => ({
        enter: jest.fn(() => ({
          append: jest.fn(() => ({
            attr: jest.fn(),
            style: jest.fn(),
            text: jest.fn(),
          })),
        })),
        exit: jest.fn(() => ({
          remove: jest.fn(),
        })),
      })),
    })),
    append: jest.fn(() => ({
      attr: jest.fn(),
      style: jest.fn(),
    })),
    attr: jest.fn(),
    style: jest.fn(),
  })),
  scaleTime: jest.fn(() => ({
    domain: jest.fn(() => ({
      range: jest.fn(),
    })),
    range: jest.fn(),
  })),
  scaleLinear: jest.fn(() => ({
    domain: jest.fn(() => ({
      range: jest.fn(),
    })),
    range: jest.fn(),
  })),
  axisBottom: jest.fn(),
  axisLeft: jest.fn(),
  line: jest.fn(() => ({
    x: jest.fn(),
    y: jest.fn(),
  })),
  extent: jest.fn(() => [new Date(), new Date()]),
}));

// Mock socket.io-client for WebSocket tests
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    connected: true,
  })),
}));

// Custom test utilities
global.testUtils = {
  // Wait for async operations
  waitFor: (callback, timeout = 5000) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkCondition = () => {
        try {
          const result = callback();
          if (result) {
            resolve(result);
          } else if (Date.now() - startTime > timeout) {
            reject(new Error('Timeout waiting for condition'));
          } else {
            setTimeout(checkCondition, 10);
          }
        } catch (error) {
          if (Date.now() - startTime > timeout) {
            reject(error);
          } else {
            setTimeout(checkCondition, 10);
          }
        }
      };
      checkCondition();
    });
  },
  
  // Create mock API response
  createMockResponse: (data, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    headers: new Headers(),
  }),
  
  // Create mock WebSocket message
  createMockWSMessage: (type, data) => ({
    type,
    data,
    timestamp: new Date().toISOString(),
  }),
};

// Performance monitoring for tests
const testStartTimes = new Map();

beforeEach(() => {
  const testName = expect.getState().currentTestName;
  if (testName) {
    testStartTimes.set(testName, performance.now());
  }
});

afterEach(() => {
  const testName = expect.getState().currentTestName;
  if (testName && testStartTimes.has(testName)) {
    const startTime = testStartTimes.get(testName);
    const duration = performance.now() - startTime;
    testStartTimes.delete(testName);
    
    // Log slow tests
    if (duration > 5000) {
      console.warn(`⚠️ Slow test detected: ${testName} took ${duration.toFixed(2)}ms`);
    }
  }
});
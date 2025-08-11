/**
 * Unit Test Setup for Collaboration Tests
 * Configures mocks, utilities, and environment for unit tests
 */

import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import { Crypto } from '@peculiar/webcrypto';

// Polyfills for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.crypto = new Crypto();

// Mock WebSocket for unit tests
global.WebSocket = class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 1; // OPEN
    this.onopen = null;
    this.onmessage = null;
    this.onclose = null;
    this.onerror = null;

    // Simulate connection
    setTimeout(() => {
      if (this.onopen) this.onopen({ target: this });
    }, 0);
  }

  send(data) {
    // Mock send - store in instance for testing
    this.lastSentData = data;

    // Simulate echo for testing
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage({ data, target: this });
      }
    }, 0);
  }

  close() {
    this.readyState = 3; // CLOSED
    if (this.onclose) {
      setTimeout(() => this.onclose({ target: this }), 0);
    }
  }
};

// Mock IntersectionObserver for editor components
global.IntersectionObserver = class MockIntersectionObserver {
  constructor(callback) {
    this.callback = callback;
  }

  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock ResizeObserver for responsive components
global.ResizeObserver = class MockResizeObserver {
  constructor(callback) {
    this.callback = callback;
  }

  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock requestIdleCallback
global.requestIdleCallback = (callback) => {
  return setTimeout(callback, 0);
};

global.cancelIdleCallback = (id) => {
  clearTimeout(id);
};

// Mock performance.now() for consistent timing in tests
const mockPerformanceNow = jest.fn(() => Date.now());
global.performance = { now: mockPerformanceNow };

// Console suppression for cleaner test output
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  // Suppress known warnings in tests
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is deprecated') ||
       args[0].includes('Warning: componentWillMount has been renamed'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('deprecated')
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();

  // Clean up any DOM modifications
  document.body.innerHTML = '';
  document.head.innerHTML = '<meta charset="utf-8">';
});

// Test utilities for collaboration features
global.collaborationTestUtils = {
  // Create mock user
  createMockUser: (overrides = {}) => ({
    id: 'user-123',
    email: 'test@example.com',
    organizationId: 'org-123',
    role: 'USER',
    isActive: true,
    createdAt: new Date().toISOString(),
    ...overrides,
  }),

  // Create mock document
  createMockDocument: (overrides = {}) => ({
    id: 'doc-123',
    name: 'Test Document',
    type: 'TEXT_DOCUMENT',
    status: 'DRAFT',
    content: {
      format: 'RICH_TEXT',
      data: {},
      blocks: [],
      length: 0,
    },
    ownerId: 'user-123',
    organizationId: 'org-123',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),

  // Create mock CRDT operation
  createMockOperation: (overrides = {}) => ({
    id: 'op-123',
    type: 'INSERT',
    position: 0,
    length: 1,
    content: { text: 'a' },
    authorId: 'user-123',
    clientId: 'client-123',
    timestamp: new Date().toISOString(),
    applied: false,
    ...overrides,
  }),

  // Create mock comment
  createMockComment: (overrides = {}) => ({
    id: 'comment-123',
    documentId: 'doc-123',
    content: {
      text: 'Test comment',
      format: 'PLAIN_TEXT',
    },
    authorId: 'user-123',
    status: 'ACTIVE',
    position: {
      blockId: 'block-123',
      startOffset: 0,
      endOffset: 5,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),

  // Create mock presence session
  createMockPresenceSession: (overrides = {}) => ({
    id: 'session-123',
    userId: 'user-123',
    documentId: 'doc-123',
    status: 'ACTIVE',
    cursor: {
      blockId: 'block-123',
      offset: 0,
    },
    joinedAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    ...overrides,
  }),

  // Simulate WebSocket events
  simulateWebSocketEvent: (ws, event, data) => {
    const handlers = {
      open: 'onopen',
      message: 'onmessage',
      close: 'onclose',
      error: 'onerror',
    };

    const handler = ws[handlers[event]];
    if (handler) {
      const eventData = event === 'message'
        ? { data: JSON.stringify(data), target: ws }
        : { target: ws };

      setTimeout(() => handler(eventData), 0);
    }
  },

  // Wait for async operations in tests
  waitFor: (condition, timeout = 5000) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const check = () => {
        if (condition()) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error(`Condition not met within ${timeout}ms`));
        } else {
          setTimeout(check, 10);
        }
      };

      check();
    });
  },
};

// Export test utilities for use in tests
export const {
  createMockUser,
  createMockDocument,
  createMockOperation,
  createMockComment,
  createMockPresenceSession,
  simulateWebSocketEvent,
  waitFor,
} = global.collaborationTestUtils;

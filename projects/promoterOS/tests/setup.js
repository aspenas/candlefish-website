/**
 * Jest setup file for PromoterOS tests
 * Global test configuration and utilities
 */

// Global test timeout
jest.setTimeout(30000);

// Mock console methods for cleaner test output
global.console = {
  ...console,
  // Suppress console.log in tests unless explicitly needed
  log: process.env.VERBOSE_TESTS ? console.log : jest.fn(),
  debug: process.env.VERBOSE_TESTS ? console.debug : jest.fn(),
  info: process.env.VERBOSE_TESTS ? console.info : jest.fn(),
  warn: console.warn,
  error: console.error,
};

// Global test utilities
global.testUtils = {
  // Delay utility for async tests
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Random string generator for test data
  randomString: (length = 10) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  // Random number between min and max
  randomNumber: (min = 0, max = 100) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  // Validate JSON structure
  validateJsonStructure: (obj, schema) => {
    const validate = (current, currentSchema, path = '') => {
      for (const key in currentSchema) {
        const fullPath = path ? `${path}.${key}` : key;

        if (!(key in current)) {
          throw new Error(`Missing property: ${fullPath}`);
        }

        const expectedType = currentSchema[key];
        const actualValue = current[key];

        if (typeof expectedType === 'string') {
          if (expectedType === 'number' && typeof actualValue !== 'number') {
            throw new Error(`Expected ${fullPath} to be number, got ${typeof actualValue}`);
          }
          if (expectedType === 'string' && typeof actualValue !== 'string') {
            throw new Error(`Expected ${fullPath} to be string, got ${typeof actualValue}`);
          }
          if (expectedType === 'boolean' && typeof actualValue !== 'boolean') {
            throw new Error(`Expected ${fullPath} to be boolean, got ${typeof actualValue}`);
          }
          if (expectedType === 'array' && !Array.isArray(actualValue)) {
            throw new Error(`Expected ${fullPath} to be array, got ${typeof actualValue}`);
          }
          if (expectedType === 'object' && typeof actualValue !== 'object') {
            throw new Error(`Expected ${fullPath} to be object, got ${typeof actualValue}`);
          }
        } else if (typeof expectedType === 'object') {
          if (typeof actualValue !== 'object' || actualValue === null) {
            throw new Error(`Expected ${fullPath} to be object, got ${typeof actualValue}`);
          }
          validate(actualValue, expectedType, fullPath);
        }
      }
    };

    try {
      validate(obj, schema);
      return true;
    } catch (error) {
      return error.message;
    }
  }
};

// Global test expectations
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

  toHaveValidTimestamp(received) {
    const timestamp = new Date(received);
    const pass = !isNaN(timestamp.getTime());
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid timestamp`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid timestamp`,
        pass: false,
      };
    }
  },

  toMatchApiResponseSchema(received) {
    const schema = {
      success: 'boolean',
      data: 'object'
    };

    const validationResult = global.testUtils.validateJsonStructure(received, schema);
    const pass = validationResult === true;

    if (pass) {
      return {
        message: () => `expected response not to match API schema`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected response to match API schema: ${validationResult}`,
        pass: false,
      };
    }
  },

  toHaveValidBookingScore(received) {
    const pass = typeof received === 'number' && received >= 0 && received <= 100;
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid booking score`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid booking score (0-100)`,
        pass: false,
      };
    }
  }
});

// Mock environment variables for testing
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.NETLIFY_DEV = 'true';

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Clean up after each test
afterEach(() => {
  // Clear any timers
  jest.clearAllTimers();

  // Reset any mocked functions
  jest.clearAllMocks();
});

// Global setup for test database or external services
beforeAll(async () => {
  // Setup test environment
  console.log('Setting up test environment...');
});

// Cleanup after all tests
afterAll(async () => {
  // Cleanup test environment
  console.log('Cleaning up test environment...');
});

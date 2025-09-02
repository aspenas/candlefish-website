import { Pool } from 'pg';
import Redis from 'ioredis';
import { Server } from 'socket.io';

// Extend Jest matchers
expect.extend({
  toBeValidDate(received: any) {
    const pass = received instanceof Date && !isNaN(received.getTime());
    return {
      message: () => `expected ${received} to be a valid Date`,
      pass,
    };
  },
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    return {
      message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
      pass,
    };
  }
});

// Increase timeout for integration tests
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Global test utilities
global.testUtils = {
  delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  generateTestId: () => `test_${Date.now()}_${Math.random().toString(36).substring(7)}`,
  
  cleanupDatabase: async (pool: Pool) => {
    await pool.query('DELETE FROM agent_performance_metrics WHERE created_at < NOW() - INTERVAL \'1 hour\'');
    await pool.query('DELETE FROM service_performance_metrics WHERE created_at < NOW() - INTERVAL \'1 hour\'');
    await pool.query('DELETE FROM system_metrics WHERE created_at < NOW() - INTERVAL \'1 hour\'');
  },
  
  cleanupRedis: async (redis: Redis) => {
    const keys = await redis.keys('test:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
};

// Type declarations
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidDate(): R;
      toBeWithinRange(floor: number, ceiling: number): R;
    }
  }
  
  var testUtils: {
    delay: (ms: number) => Promise<void>;
    generateTestId: () => string;
    cleanupDatabase: (pool: Pool) => Promise<void>;
    cleanupRedis: (redis: Redis) => Promise<void>;
  };
}
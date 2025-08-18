/**
 * @file Cache test data factory
 * @description Provides factory functions for creating cache test data
 */

import { faker } from '@faker-js/faker';

export interface CacheEntry {
  key: string;
  value: any;
  ttl: number;
  timestamp: number;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number;
  memory: {
    used: number;
    available: number;
    total: number;
  };
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  database: number;
  maxRetries: number;
  retryDelayOnFailover: number;
  lazyConnect: boolean;
}

export interface CacheOperation {
  operation: 'get' | 'set' | 'delete' | 'exists' | 'expire';
  key: string;
  value?: any;
  ttl?: number;
  timestamp: number;
  success: boolean;
  duration: number;
}

/**
 * Creates a cache entry
 */
export function createCacheEntry(overrides?: Partial<CacheEntry>): CacheEntry {
  const key = faker.helpers.arrayElement([
    `estimate:${faker.string.uuid()}`,
    `formula:${faker.string.alphanumeric(10)}`,
    `pricing:${faker.string.alphanumeric(8)}`,
    `user:${faker.string.uuid()}`,
    `session:${faker.string.alphanumeric(20)}`,
    `calculation:${faker.string.alphanumeric(12)}`,
  ]);

  return {
    key,
    value: createCacheValue(key),
    ttl: faker.number.int({ min: 300, max: 86400 }), // 5 minutes to 1 day
    timestamp: Date.now(),
    tags: faker.helpers.arrayElements(['estimates', 'calculations', 'users', 'sessions'], {
      min: 1,
      max: 3,
    }),
    metadata: {
      size: faker.number.int({ min: 100, max: 10000 }),
      version: faker.system.semver(),
      source: faker.helpers.arrayElement(['api', 'worker', 'scheduler']),
    },
    ...overrides,
  };
}

/**
 * Creates cache value based on key type
 */
function createCacheValue(key: string): any {
  if (key.startsWith('estimate:')) {
    return {
      id: faker.string.uuid(),
      client_name: faker.person.fullName(),
      total_amount: faker.number.float({ min: 1000, max: 10000, fractionDigits: 2 }),
      status: faker.helpers.arrayElement(['draft', 'completed', 'approved']),
      calculations: {
        wall_area: faker.number.float({ min: 200, max: 800, fractionDigits: 2 }),
        ceiling_area: faker.number.float({ min: 100, max: 400, fractionDigits: 2 }),
        paint_gallons: faker.number.float({ min: 2, max: 15, fractionDigits: 2 }),
      },
    };
  }

  if (key.startsWith('formula:')) {
    return {
      formula: '=SUM(A1:A10)*B1',
      result: faker.number.float({ min: 100, max: 5000, fractionDigits: 2 }),
      dependencies: ['A1:A10', 'B1'],
      computed_at: faker.date.recent().toISOString(),
    };
  }

  if (key.startsWith('pricing:')) {
    return {
      good: faker.number.float({ min: 1000, max: 3000, fractionDigits: 2 }),
      better: faker.number.float({ min: 3000, max: 6000, fractionDigits: 2 }),
      best: faker.number.float({ min: 6000, max: 10000, fractionDigits: 2 }),
      factors: {
        complexity: faker.number.float({ min: 1.0, max: 2.0, fractionDigits: 2 }),
        condition: faker.number.float({ min: 1.0, max: 1.5, fractionDigits: 2 }),
        prep: faker.number.float({ min: 1.0, max: 1.8, fractionDigits: 2 }),
      },
    };
  }

  if (key.startsWith('user:')) {
    return {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      role: faker.helpers.arrayElement(['admin', 'user', 'viewer']),
      last_login: faker.date.recent().toISOString(),
      preferences: {
        theme: faker.helpers.arrayElement(['light', 'dark']),
        notifications: faker.datatype.boolean(),
      },
    };
  }

  if (key.startsWith('session:')) {
    return {
      user_id: faker.string.uuid(),
      token: faker.string.alphanumeric(100),
      expires_at: faker.date.future().toISOString(),
      ip_address: faker.internet.ip(),
      user_agent: faker.internet.userAgent(),
    };
  }

  // Default cache value
  return {
    data: faker.datatype.json(),
    created_at: faker.date.recent().toISOString(),
  };
}

/**
 * Creates cache statistics
 */
export function createCacheStats(overrides?: Partial<CacheStats>): CacheStats {
  const hits = faker.number.int({ min: 1000, max: 10000 });
  const misses = faker.number.int({ min: 100, max: 2000 });
  const total = faker.number.int({ min: 1000000, max: 10000000 }); // 1MB to 10MB
  const used = faker.number.int({ min: total * 0.3, max: total * 0.8 });

  return {
    hits,
    misses,
    sets: faker.number.int({ min: 500, max: 5000 }),
    deletes: faker.number.int({ min: 100, max: 1000 }),
    hitRate: parseFloat((hits / (hits + misses)).toFixed(3)),
    memory: {
      used,
      available: total - used,
      total,
    },
    ...overrides,
  };
}

/**
 * Creates Redis configuration
 */
export function createRedisConfig(overrides?: Partial<RedisConfig>): RedisConfig {
  return {
    host: faker.helpers.arrayElement(['localhost', '127.0.0.1', 'redis.example.com']),
    port: faker.helpers.arrayElement([6379, 6380, 16379]),
    password: faker.datatype.boolean() ? faker.string.alphanumeric(20) : undefined,
    database: faker.number.int({ min: 0, max: 15 }),
    maxRetries: 3,
    retryDelayOnFailover: 1000,
    lazyConnect: true,
    ...overrides,
  };
}

/**
 * Creates cache operation
 */
export function createCacheOperation(overrides?: Partial<CacheOperation>): CacheOperation {
  const operation = faker.helpers.arrayElement(['get', 'set', 'delete', 'exists', 'expire'] as const);
  const success = faker.datatype.boolean({ probability: 0.95 }); // 95% success rate

  return {
    operation,
    key: `test:${faker.string.alphanumeric(10)}`,
    value: operation === 'set' ? faker.datatype.json() : undefined,
    ttl: ['set', 'expire'].includes(operation) ? faker.number.int({ min: 300, max: 3600 }) : undefined,
    timestamp: Date.now(),
    success,
    duration: faker.number.int({ min: 1, max: success ? 50 : 1000 }), // Failures take longer
    ...overrides,
  };
}

/**
 * Creates three-tier cache test data
 */
export function createThreeTierCacheData(): {
  l1: CacheEntry[]; // Memory cache
  l2: CacheEntry[]; // Redis cache
  l3: CacheEntry[]; // Database cache
} {
  const l1Count = faker.number.int({ min: 10, max: 50 });
  const l2Count = faker.number.int({ min: 50, max: 200 });
  const l3Count = faker.number.int({ min: 200, max: 1000 });

  return {
    l1: Array.from({ length: l1Count }, () =>
      createCacheEntry({
        ttl: faker.number.int({ min: 60, max: 300 }), // 1-5 minutes for L1
        tags: ['hot', 'frequent'],
      })
    ),
    l2: Array.from({ length: l2Count }, () =>
      createCacheEntry({
        ttl: faker.number.int({ min: 300, max: 3600 }), // 5-60 minutes for L2
        tags: ['warm', 'recent'],
      })
    ),
    l3: Array.from({ length: l3Count }, () =>
      createCacheEntry({
        ttl: faker.number.int({ min: 3600, max: 86400 }), // 1-24 hours for L3
        tags: ['cold', 'archive'],
      })
    ),
  };
}

/**
 * Creates cache invalidation scenarios
 */
export function createCacheInvalidationScenarios(): Array<{
  scenario: string;
  keys: string[];
  tags: string[];
  reason: string;
}> {
  return [
    {
      scenario: 'User data update',
      keys: [`user:${faker.string.uuid()}`, `session:${faker.string.alphanumeric(20)}`],
      tags: ['users', 'sessions'],
      reason: 'User profile updated',
    },
    {
      scenario: 'Estimate recalculation',
      keys: [
        `estimate:${faker.string.uuid()}`,
        `formula:pricing`,
        `calculation:${faker.string.alphanumeric(12)}`,
      ],
      tags: ['estimates', 'calculations'],
      reason: 'Pricing formula updated',
    },
    {
      scenario: 'System maintenance',
      keys: ['*'],
      tags: ['all'],
      reason: 'Scheduled cache clear',
    },
    {
      scenario: 'Formula update',
      keys: Array.from({ length: 20 }, () => `formula:${faker.string.alphanumeric(10)}`),
      tags: ['calculations', 'formulas'],
      reason: 'Excel formulas modified',
    },
  ];
}

/**
 * Creates cache performance test data
 */
export function createCachePerformanceData(): {
  operations: CacheOperation[];
  expectedThroughput: number;
  maxLatency: number;
} {
  const operationCount = faker.number.int({ min: 1000, max: 10000 });
  const operations = Array.from({ length: operationCount }, () => createCacheOperation());

  return {
    operations,
    expectedThroughput: faker.number.int({ min: 5000, max: 50000 }), // ops/second
    maxLatency: faker.number.int({ min: 10, max: 100 }), // milliseconds
  };
}

/**
 * Creates cache consistency test scenarios
 */
export function createConsistencyTestScenarios(): Array<{
  description: string;
  operations: CacheOperation[];
  expectedState: Record<string, any>;
}> {
  const key = `test:consistency:${faker.string.alphanumeric(8)}`;
  const value1 = { version: 1, data: faker.datatype.json() };
  const value2 = { version: 2, data: faker.datatype.json() };

  return [
    {
      description: 'Set then get same key',
      operations: [
        createCacheOperation({ operation: 'set', key, value: value1 }),
        createCacheOperation({ operation: 'get', key }),
      ],
      expectedState: { [key]: value1 },
    },
    {
      description: 'Update existing key',
      operations: [
        createCacheOperation({ operation: 'set', key, value: value1 }),
        createCacheOperation({ operation: 'set', key, value: value2 }),
        createCacheOperation({ operation: 'get', key }),
      ],
      expectedState: { [key]: value2 },
    },
    {
      description: 'Delete existing key',
      operations: [
        createCacheOperation({ operation: 'set', key, value: value1 }),
        createCacheOperation({ operation: 'delete', key }),
        createCacheOperation({ operation: 'get', key }),
      ],
      expectedState: {},
    },
  ];
}

/**
 * Creates cache eviction test data
 */
export function createEvictionTestData(): {
  entries: CacheEntry[];
  maxMemory: number;
  evictionPolicy: 'lru' | 'lfu' | 'ttl';
} {
  const entryCount = faker.number.int({ min: 100, max: 500 });
  const entries = Array.from({ length: entryCount }, (_, index) =>
    createCacheEntry({
      key: `eviction:test:${index}`,
      timestamp: Date.now() - faker.number.int({ min: 0, max: 86400000 }), // Last 24 hours
    })
  );

  return {
    entries,
    maxMemory: faker.number.int({ min: 1000000, max: 10000000 }), // 1MB to 10MB
    evictionPolicy: faker.helpers.arrayElement(['lru', 'lfu', 'ttl']),
  };
}

/**
 * Creates cache failure scenarios
 */
export function createCacheFailureScenarios(): Array<{
  scenario: string;
  error: string;
  recovery: string;
  operations: CacheOperation[];
}> {
  return [
    {
      scenario: 'Redis connection failure',
      error: 'ECONNREFUSED',
      recovery: 'Fallback to memory cache',
      operations: [
        createCacheOperation({ operation: 'get', success: false, duration: 5000 }),
        createCacheOperation({ operation: 'set', success: false, duration: 5000 }),
      ],
    },
    {
      scenario: 'Memory exhaustion',
      error: 'OOM',
      recovery: 'Trigger cache eviction',
      operations: [
        createCacheOperation({ operation: 'set', success: false, duration: 100 }),
      ],
    },
    {
      scenario: 'Network timeout',
      error: 'TIMEOUT',
      recovery: 'Retry with exponential backoff',
      operations: [
        createCacheOperation({ operation: 'get', success: false, duration: 10000 }),
      ],
    },
  ];
}

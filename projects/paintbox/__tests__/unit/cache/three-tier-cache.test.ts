/**
 * @file Three-Tier Cache Tests
 * @description Unit tests for the three-tier cache implementation
 */

import { ThreeTierCache } from '@/lib/cache/three-tier-cache';
import { 
  createCacheEntry, 
  createThreeTierCacheData,
  createCacheStats,
  createCacheOperation 
} from '@/__tests__/factories';
import { jest } from '@jest/globals';

// Mock Redis and database dependencies
jest.mock('ioredis');
jest.mock('@/lib/db/prisma');

describe('ThreeTierCache', () => {
  let cache: ThreeTierCache;
  let mockRedis: any;
  let mockDatabase: any;

  beforeEach(() => {
    // Create mock Redis client
    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      expire: jest.fn(),
      ttl: jest.fn(),
      mget: jest.fn(),
      mset: jest.fn(),
      flushall: jest.fn(),
      info: jest.fn(),
      pipeline: jest.fn(() => ({
        exec: jest.fn().mockResolvedValue([]),
      })),
    };

    // Create mock database client
    mockDatabase = {
      cacheEntry: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
      },
    };

    cache = new ThreeTierCache({
      redis: mockRedis,
      database: mockDatabase,
      l1MaxSize: 100, // Memory cache max entries
      l2TTL: 3600,    // Redis TTL in seconds
      l3TTL: 86400,   // Database TTL in seconds
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('L1 Memory Cache', () => {
    it('should store and retrieve from memory cache (L1)', async () => {
      const entry = createCacheEntry({ key: 'test:memory:1' });

      await cache.set(entry.key, entry.value, { ttl: entry.ttl });
      const result = await cache.get(entry.key);

      expect(result.value).toEqual(entry.value);
      expect(result.source).toBe('L1');
      expect(result.hit).toBe(true);
    });

    it('should respect L1 max size limit', async () => {
      const entries = Array.from({ length: 110 }, (_, i) => 
        createCacheEntry({ key: `test:memory:${i}` })
      );

      // Fill cache beyond capacity
      for (const entry of entries) {
        await cache.set(entry.key, entry.value);
      }

      // Should evict oldest entries (LRU)
      const firstEntry = await cache.get(entries[0].key);
      const lastEntry = await cache.get(entries[109].key);

      expect(firstEntry.hit).toBe(false); // Should be evicted
      expect(lastEntry.hit).toBe(true);   // Should still be in L1
    });

    it('should update access time for LRU eviction', async () => {
      const entry1 = createCacheEntry({ key: 'test:lru:1' });
      const entry2 = createCacheEntry({ key: 'test:lru:2' });

      await cache.set(entry1.key, entry1.value);
      await cache.set(entry2.key, entry2.value);

      // Access entry1 to update its position
      await cache.get(entry1.key);

      // Fill cache to trigger eviction
      const moreEntries = Array.from({ length: 100 }, (_, i) => 
        createCacheEntry({ key: `test:filler:${i}` })
      );

      for (const entry of moreEntries) {
        await cache.set(entry.key, entry.value);
      }

      // entry1 should still be in cache due to recent access
      // entry2 should be evicted
      const result1 = await cache.get(entry1.key);
      const result2 = await cache.get(entry2.key);

      expect(result1.source).toBe('L1');
      expect(result2.source).not.toBe('L1'); // Should come from L2 or L3
    });
  });

  describe('L2 Redis Cache', () => {
    it('should fall back to Redis (L2) when not in memory', async () => {
      const entry = createCacheEntry({ key: 'test:redis:1' });
      
      // Mock Redis response
      mockRedis.get.mockResolvedValue(JSON.stringify(entry.value));

      const result = await cache.get(entry.key);

      expect(result.value).toEqual(entry.value);
      expect(result.source).toBe('L2');
      expect(mockRedis.get).toHaveBeenCalledWith(entry.key);
    });

    it('should promote L2 entries to L1 on access', async () => {
      const entry = createCacheEntry({ key: 'test:promote:1' });
      
      mockRedis.get.mockResolvedValue(JSON.stringify(entry.value));

      // First access - should come from L2
      const result1 = await cache.get(entry.key);
      expect(result1.source).toBe('L2');

      // Clear Redis mock to ensure second access doesn't hit Redis
      mockRedis.get.mockClear();

      // Second access - should come from L1 (promoted)
      const result2 = await cache.get(entry.key);
      expect(result2.source).toBe('L1');
      expect(mockRedis.get).not.toHaveBeenCalled();
    });

    it('should store entries in Redis with TTL', async () => {
      const entry = createCacheEntry({ key: 'test:redis:ttl', ttl: 1800 });

      await cache.set(entry.key, entry.value, { ttl: entry.ttl });

      expect(mockRedis.set).toHaveBeenCalledWith(
        entry.key,
        JSON.stringify(entry.value),
        'EX',
        entry.ttl
      );
    });

    it('should handle Redis connection failures gracefully', async () => {
      const entry = createCacheEntry({ key: 'test:redis:error' });
      
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));
      mockDatabase.cacheEntry.findUnique.mockResolvedValue({
        key: entry.key,
        value: JSON.stringify(entry.value),
        createdAt: new Date(),
      });

      const result = await cache.get(entry.key);

      expect(result.value).toEqual(entry.value);
      expect(result.source).toBe('L3'); // Should fall back to database
    });
  });

  describe('L3 Database Cache', () => {
    it('should fall back to database (L3) when not in Redis', async () => {
      const entry = createCacheEntry({ key: 'test:database:1' });
      
      mockRedis.get.mockResolvedValue(null);
      mockDatabase.cacheEntry.findUnique.mockResolvedValue({
        key: entry.key,
        value: JSON.stringify(entry.value),
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000), // Not expired
      });

      const result = await cache.get(entry.key);

      expect(result.value).toEqual(entry.value);
      expect(result.source).toBe('L3');
      expect(mockDatabase.cacheEntry.findUnique).toHaveBeenCalledWith({
        where: { key: entry.key },
      });
    });

    it('should promote L3 entries to L2 and L1 on access', async () => {
      const entry = createCacheEntry({ key: 'test:promote:database' });
      
      mockRedis.get.mockResolvedValue(null);
      mockDatabase.cacheEntry.findUnique.mockResolvedValue({
        key: entry.key,
        value: JSON.stringify(entry.value),
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      });

      // First access - should come from L3
      const result1 = await cache.get(entry.key);
      expect(result1.source).toBe('L3');

      // Should have promoted to L2 (Redis)
      expect(mockRedis.set).toHaveBeenCalled();

      // Clear mocks and test L1 promotion
      mockRedis.get.mockClear();
      mockDatabase.cacheEntry.findUnique.mockClear();

      // Second access - should come from L1
      const result2 = await cache.get(entry.key);
      expect(result2.source).toBe('L1');
    });

    it('should handle expired database entries', async () => {
      const entry = createCacheEntry({ key: 'test:database:expired' });
      
      mockRedis.get.mockResolvedValue(null);
      mockDatabase.cacheEntry.findUnique.mockResolvedValue({
        key: entry.key,
        value: JSON.stringify(entry.value),
        createdAt: new Date(),
        expiresAt: new Date(Date.now() - 1000), // Expired
      });

      const result = await cache.get(entry.key);

      expect(result.hit).toBe(false);
      expect(result.value).toBeNull();
      
      // Should delete expired entry
      expect(mockDatabase.cacheEntry.delete).toHaveBeenCalledWith({
        where: { key: entry.key },
      });
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate entry from all cache layers', async () => {
      const key = 'test:invalidate:1';

      await cache.delete(key);

      // Should clear from all layers
      expect(mockRedis.del).toHaveBeenCalledWith(key);
      expect(mockDatabase.cacheEntry.delete).toHaveBeenCalledWith({
        where: { key },
      });
    });

    it('should invalidate by tag pattern', async () => {
      const tags = ['estimates', 'calculations'];
      
      await cache.deleteByTags(tags);

      // Should clear entries with matching tags from all layers
      expect(mockRedis.del).toHaveBeenCalled();
      expect(mockDatabase.cacheEntry.delete).toHaveBeenCalled();
    });

    it('should support wildcard invalidation', async () => {
      const pattern = 'estimate:*';
      
      await cache.deleteByPattern(pattern);

      expect(mockRedis.del).toHaveBeenCalled();
      expect(mockDatabase.cacheEntry.delete).toHaveBeenCalled();
    });
  });

  describe('Batch Operations', () => {
    it('should support batch get operations', async () => {
      const keys = ['test:batch:1', 'test:batch:2', 'test:batch:3'];
      const values = keys.map(key => ({ data: `value for ${key}` }));

      // Mock responses from different layers
      mockRedis.mget.mockResolvedValue([
        null, // First key not in Redis
        JSON.stringify(values[1]), // Second key in Redis
        null, // Third key not in Redis
      ]);

      mockDatabase.cacheEntry.findMany.mockResolvedValue([
        {
          key: keys[0],
          value: JSON.stringify(values[0]),
          expiresAt: new Date(Date.now() + 86400000),
        },
        // Third key not in database either
      ]);

      const results = await cache.mget(keys);

      expect(results).toHaveLength(3);
      expect(results[0].value).toEqual(values[0]); // From L3
      expect(results[1].value).toEqual(values[1]); // From L2
      expect(results[2].hit).toBe(false); // Not found
    });

    it('should support batch set operations', async () => {
      const entries = Array.from({ length: 5 }, () => createCacheEntry());
      const kvPairs = entries.reduce((acc, entry) => {
        acc[entry.key] = entry.value;
        return acc;
      }, {} as Record<string, any>);

      await cache.mset(kvPairs, { ttl: 3600 });

      // Should batch operations for efficiency
      expect(mockRedis.pipeline).toHaveBeenCalled();
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should track cache hit/miss statistics', async () => {
      const entries = Array.from({ length: 10 }, () => createCacheEntry());

      // Simulate mixed hit/miss scenario
      for (const entry of entries.slice(0, 5)) {
        await cache.set(entry.key, entry.value);
      }

      // Test hits and misses
      for (const entry of entries) {
        await cache.get(entry.key);
      }

      const stats = cache.getStatistics();

      expect(stats.l1.hits).toBeGreaterThan(0);
      expect(stats.l1.misses).toBeGreaterThan(0);
      expect(stats.l1.hitRate).toBeGreaterThan(0);
      expect(stats.l1.hitRate).toBeLessThanOrEqual(1);
    });

    it('should provide memory usage statistics', () => {
      const stats = cache.getStatistics();

      expect(stats.l1.memory).toBeDefined();
      expect(stats.l1.memory.used).toBeGreaterThanOrEqual(0);
      expect(stats.l1.memory.available).toBeGreaterThanOrEqual(0);
      expect(stats.l1.memory.total).toBeGreaterThan(0);
    });

    it('should track operation performance metrics', async () => {
      const entry = createCacheEntry();

      const startTime = Date.now();
      await cache.set(entry.key, entry.value);
      await cache.get(entry.key);
      const endTime = Date.now();

      const metrics = cache.getPerformanceMetrics();

      expect(metrics.averageGetTime).toBeGreaterThan(0);
      expect(metrics.averageSetTime).toBeGreaterThan(0);
      expect(metrics.totalOperations).toBeGreaterThan(0);
    });
  });

  describe('Cache Warming', () => {
    it('should support cache warming from database', async () => {
      const entries = createThreeTierCacheData();
      
      mockDatabase.cacheEntry.findMany.mockResolvedValue(
        entries.l3.map(entry => ({
          key: entry.key,
          value: JSON.stringify(entry.value),
          tags: entry.tags?.join(','),
          expiresAt: new Date(Date.now() + 86400000),
        }))
      );

      await cache.warmCache({ 
        tags: ['estimates'], 
        maxEntries: 100 
      });

      // Should load entries into L1 and L2
      expect(mockRedis.pipeline).toHaveBeenCalled();
    });

    it('should prioritize frequently accessed entries during warming', async () => {
      const entries = Array.from({ length: 200 }, (_, i) => 
        createCacheEntry({ 
          key: `test:warm:${i}`,
          metadata: { accessCount: 200 - i } // Descending access count
        })
      );

      mockDatabase.cacheEntry.findMany.mockResolvedValue(
        entries.map(entry => ({
          key: entry.key,
          value: JSON.stringify(entry.value),
          accessCount: entry.metadata?.accessCount || 0,
          expiresAt: new Date(Date.now() + 86400000),
        }))
      );

      await cache.warmCache({ maxEntries: 50 });

      // Should prioritize most accessed entries
      const stats = cache.getStatistics();
      expect(stats.l1.entries).toBeLessThanOrEqual(50);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should continue functioning when Redis is unavailable', async () => {
      const entry = createCacheEntry();
      
      mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));
      mockRedis.set.mockRejectedValue(new Error('Redis connection failed'));
      
      mockDatabase.cacheEntry.findUnique.mockResolvedValue({
        key: entry.key,
        value: JSON.stringify(entry.value),
        expiresAt: new Date(Date.now() + 86400000),
      });

      // Should still work with L1 and L3
      await cache.set(entry.key, entry.value);
      const result = await cache.get(entry.key);

      expect(result.value).toEqual(entry.value);
    });

    it('should handle database failures gracefully', async () => {
      const entry = createCacheEntry();
      
      mockRedis.get.mockResolvedValue(null);
      mockDatabase.cacheEntry.findUnique.mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await cache.get(entry.key);

      expect(result.hit).toBe(false);
      expect(result.error).toContain('Database connection failed');
    });

    it('should implement circuit breaker for failing services', async () => {
      // Simulate multiple Redis failures
      for (let i = 0; i < 10; i++) {
        mockRedis.get.mockRejectedValue(new Error('Redis timeout'));
        try {
          await cache.get(`test:circuit:${i}`);
        } catch (error) {
          // Expected
        }
      }

      // Circuit breaker should be open, bypassing Redis
      const entry = createCacheEntry();
      await cache.set(entry.key, entry.value);

      // Redis should not be called due to open circuit
      const callCount = mockRedis.set.mock.calls.length;
      expect(callCount).toBeLessThan(10); // Circuit breaker prevented some calls
    });
  });

  describe('Performance Optimization', () => {
    it('should compress large values automatically', async () => {
      const largeValue = {
        data: 'x'.repeat(10000), // Large string
        metadata: Array.from({ length: 1000 }, (_, i) => ({ id: i, data: 'test' }))
      };

      await cache.set('test:large:1', largeValue, { compress: true });

      expect(mockRedis.set).toHaveBeenCalled();
      const setCall = mockRedis.set.mock.calls[0];
      const storedValue = setCall[1];
      
      // Stored value should be compressed (smaller than original)
      expect(storedValue.length).toBeLessThan(JSON.stringify(largeValue).length);
    });

    it('should use connection pooling for database operations', async () => {
      const operations = Array.from({ length: 50 }, () => 
        cache.get(`test:pool:${Math.random()}`)
      );

      await Promise.all(operations);

      // Should reuse database connections efficiently
      expect(mockDatabase.cacheEntry.findUnique).toHaveBeenCalledTimes(50);
    });

    it('should implement read-through caching', async () => {
      const key = 'test:read-through:1';
      const value = { computed: 'expensive_calculation_result' };
      
      // Mock expensive computation
      const expensiveComputation = jest.fn().mockResolvedValue(value);

      const result = await cache.getOrCompute(key, expensiveComputation, {
        ttl: 3600
      });

      expect(result.value).toEqual(value);
      expect(expensiveComputation).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await cache.getOrCompute(key, expensiveComputation);
      expect(expensiveComputation).toHaveBeenCalledTimes(1); // Not called again
    });
  });
});
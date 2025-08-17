import { LRUCache } from 'lru-cache';
import Redis from 'ioredis';

/**
 * Three-tier caching strategy for optimal performance
 * L1: In-memory LRU cache (fastest, limited size)
 * L2: Redis cache (fast, larger capacity)
 * L3: CDN cache headers (distributed, unlimited)
 */

// L1: Memory Cache Configuration
const DEFAULT_MEMORY_OPTIONS = {
  max: 1000, // Maximum number of items
  ttl: 1000 * 60 * 5, // 5 minutes TTL
  updateAgeOnGet: true,
  updateAgeOnHas: true,
  sizeCalculation: (value: any) => {
    // Estimate size in bytes
    return JSON.stringify(value).length;
  },
  maxSize: 50 * 1024 * 1024, // 50MB max memory
};

// L2: Redis Configuration
const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => Math.min(times * 50, 2000),
  enableOfflineQueue: true,
  lazyConnect: true,
};

// Cache key prefixes for different data types
export enum CachePrefix {
  CALCULATION = 'calc:',
  FORMULA = 'formula:',
  EXCEL = 'excel:',
  API = 'api:',
  USER = 'user:',
  SESSION = 'session:',
  STATIC = 'static:',
}

// Cache TTL configurations (in seconds)
export const CacheTTL = {
  CALCULATION: 300, // 5 minutes
  FORMULA: 600, // 10 minutes
  EXCEL: 1800, // 30 minutes
  API: 60, // 1 minute
  USER: 3600, // 1 hour
  SESSION: 86400, // 24 hours
  STATIC: 604800, // 7 days
};

export class ThreeTierCache {
  private memoryCache: LRUCache<string, any>;
  private redisClient: Redis | null = null;
  private metrics = {
    l1Hits: 0,
    l1Misses: 0,
    l2Hits: 0,
    l2Misses: 0,
    l3Hits: 0,
    totalRequests: 0,
  };

  constructor(options: Partial<typeof DEFAULT_MEMORY_OPTIONS> = {}) {
    // Initialize L1 memory cache
    this.memoryCache = new LRUCache({
      ...DEFAULT_MEMORY_OPTIONS,
      ...options,
    });

    // Initialize L2 Redis cache if available
    if (process.env.REDIS_URL || process.env.REDIS_HOST) {
      this.initRedis();
    }
  }

  private async initRedis() {
    try {
      this.redisClient = new Redis(
        process.env.REDIS_URL || REDIS_CONFIG
      );

      this.redisClient.on('error', (err) => {
        console.error('Redis error:', err);
        // Don't throw - gracefully degrade to memory-only cache
      });

      this.redisClient.on('connect', () => {
        console.log('Redis connected successfully');
      });

      await this.redisClient.ping();
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      this.redisClient = null;
    }
  }

  /**
   * Get value from cache (checks all tiers)
   */
  async get<T>(key: string): Promise<T | null> {
    this.metrics.totalRequests++;

    // L1: Check memory cache
    const memoryValue = this.memoryCache.get(key);
    if (memoryValue !== undefined) {
      this.metrics.l1Hits++;
      return memoryValue;
    }
    this.metrics.l1Misses++;

    // L2: Check Redis cache
    if (this.redisClient) {
      try {
        const redisValue = await this.redisClient.get(key);
        if (redisValue) {
          this.metrics.l2Hits++;
          const parsed = JSON.parse(redisValue);

          // Promote to L1 cache
          this.memoryCache.set(key, parsed);

          return parsed;
        }
      } catch (error) {
        console.error('Redis get error:', error);
      }
    }
    this.metrics.l2Misses++;

    return null;
  }

  /**
   * Set value in cache (writes to all applicable tiers)
   */
  async set<T>(
    key: string,
    value: T,
    ttlSeconds?: number
  ): Promise<void> {
    // L1: Set in memory cache
    const ttlMs = ttlSeconds ? ttlSeconds * 1000 : undefined;
    this.memoryCache.set(key, value, { ttl: ttlMs });

    // L2: Set in Redis cache
    if (this.redisClient) {
      try {
        const serialized = JSON.stringify(value);
        if (ttlSeconds) {
          await this.redisClient.setex(key, ttlSeconds, serialized);
        } else {
          await this.redisClient.set(key, serialized);
        }
      } catch (error) {
        console.error('Redis set error:', error);
      }
    }
  }

  /**
   * Delete value from all cache tiers
   */
  async delete(key: string): Promise<void> {
    // L1: Delete from memory
    this.memoryCache.delete(key);

    // L2: Delete from Redis
    if (this.redisClient) {
      try {
        await this.redisClient.del(key);
      } catch (error) {
        console.error('Redis delete error:', error);
      }
    }
  }

  /**
   * Clear cache by pattern
   */
  async clearPattern(pattern: string): Promise<void> {
    // L1: Clear matching keys from memory
    for (const key of this.memoryCache.keys()) {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key);
      }
    }

    // L2: Clear matching keys from Redis
    if (this.redisClient) {
      try {
        const keys = await this.redisClient.keys(`*${pattern}*`);
        if (keys.length > 0) {
          await this.redisClient.del(...keys);
        }
      } catch (error) {
        console.error('Redis clear pattern error:', error);
      }
    }
  }

  /**
   * Get or set with factory function
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Generate new value
    const value = await factory();

    // Store in cache
    await this.set(key, value, ttlSeconds);

    return value;
  }

  /**
   * Batch get operation
   */
  async mget<T>(keys: string[]): Promise<Map<string, T>> {
    const results = new Map<string, T>();
    const missingKeys: string[] = [];

    // L1: Check memory cache
    for (const key of keys) {
      const value = this.memoryCache.get(key);
      if (value !== undefined) {
        results.set(key, value);
      } else {
        missingKeys.push(key);
      }
    }

    // L2: Check Redis for missing keys
    if (this.redisClient && missingKeys.length > 0) {
      try {
        const redisValues = await this.redisClient.mget(...missingKeys);
        redisValues.forEach((value, index) => {
          if (value) {
            const parsed = JSON.parse(value);
            const key = missingKeys[index];
            results.set(key, parsed);

            // Promote to L1
            this.memoryCache.set(key, parsed);
          }
        });
      } catch (error) {
        console.error('Redis mget error:', error);
      }
    }

    return results;
  }

  /**
   * Batch set operation
   */
  async mset<T>(
    entries: Array<[string, T]>,
    ttlSeconds?: number
  ): Promise<void> {
    // L1: Set in memory cache
    for (const [key, value] of entries) {
      const ttlMs = ttlSeconds ? ttlSeconds * 1000 : undefined;
      this.memoryCache.set(key, value, { ttl: ttlMs });
    }

    // L2: Set in Redis
    if (this.redisClient) {
      try {
        const pipeline = this.redisClient.pipeline();

        for (const [key, value] of entries) {
          const serialized = JSON.stringify(value);
          if (ttlSeconds) {
            pipeline.setex(key, ttlSeconds, serialized);
          } else {
            pipeline.set(key, serialized);
          }
        }

        await pipeline.exec();
      } catch (error) {
        console.error('Redis mset error:', error);
      }
    }
  }

  /**
   * Get cache metrics
   */
  getMetrics() {
    const l1HitRate = this.metrics.l1Hits /
      (this.metrics.l1Hits + this.metrics.l1Misses) || 0;
    const l2HitRate = this.metrics.l2Hits /
      (this.metrics.l2Hits + this.metrics.l2Misses) || 0;
    const overallHitRate = (this.metrics.l1Hits + this.metrics.l2Hits) /
      this.metrics.totalRequests || 0;

    return {
      ...this.metrics,
      l1HitRate: (l1HitRate * 100).toFixed(2) + '%',
      l2HitRate: (l2HitRate * 100).toFixed(2) + '%',
      overallHitRate: (overallHitRate * 100).toFixed(2) + '%',
      memoryCacheSize: this.memoryCache.size,
      memoryCacheCalculatedSize: this.memoryCache.calculatedSize,
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      l1Hits: 0,
      l1Misses: 0,
      l2Hits: 0,
      l2Misses: 0,
      l3Hits: 0,
      totalRequests: 0,
    };
  }

  /**
   * Clear all caches
   */
  async clear(): Promise<void> {
    // L1: Clear memory cache
    this.memoryCache.clear();

    // L2: Clear Redis cache
    if (this.redisClient) {
      try {
        await this.redisClient.flushdb();
      } catch (error) {
        console.error('Redis clear error:', error);
      }
    }
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }
}

// Singleton instance
let cacheInstance: ThreeTierCache | null = null;

export function getCache(): ThreeTierCache {
  if (!cacheInstance) {
    cacheInstance = new ThreeTierCache();
  }
  return cacheInstance;
}

// CDN cache headers helper
export function setCDNCacheHeaders(
  res: any,
  maxAge: number = 3600,
  sMaxAge: number = 86400,
  staleWhileRevalidate: number = 604800
) {
  res.setHeader(
    'Cache-Control',
    `public, max-age=${maxAge}, s-maxage=${sMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`
  );
  res.setHeader('CDN-Cache-Control', `max-age=${sMaxAge}`);
  res.setHeader('Cloudflare-CDN-Cache-Control', `max-age=${sMaxAge}`);
  res.setHeader('Vercel-CDN-Cache-Control', `max-age=${sMaxAge}`);
}

// Export cache utilities
export default {
  ThreeTierCache,
  getCache,
  setCDNCacheHeaders,
  CachePrefix,
  CacheTTL,
};

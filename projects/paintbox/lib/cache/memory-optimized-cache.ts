/**
 * Memory-Optimized Caching Layer
 * Implements multi-tier caching with automatic memory management
 */

import Redis from 'ioredis';
import { LRUCache } from 'lru-cache';
import { compress, decompress } from 'zlib';
import { promisify } from 'util';
import crypto from 'crypto';

const gzip = promisify(compress);
const gunzip = promisify(decompress);

interface CacheOptions {
  ttl?: number;
  compress?: boolean;
  priority?: 'high' | 'medium' | 'low';
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  memoryUsage: number;
}

class MemoryOptimizedCache {
  private redis: Redis | null = null;
  private localCache: LRUCache<string, any>;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    memoryUsage: 0,
  };

  constructor() {
    // Initialize LRU cache with strict memory limits
    this.localCache = new LRUCache({
      max: 100, // Max 100 items
      maxSize: 10 * 1024 * 1024, // 10MB max memory
      sizeCalculation: (value) => {
        return Buffer.byteLength(JSON.stringify(value));
      },
      ttl: 1000 * 60 * 5, // 5 minutes default TTL
      dispose: () => {
        this.stats.evictions++;
      },
      updateAgeOnGet: true,
      updateAgeOnHas: false,
    });

    this.initRedis();

    // Start memory monitoring
    this.startMemoryMonitoring();
  }

  private async initRedis() {
    const redisUrl = process.env.REDIS_URL || process.env.REDIS_TLS_URL;

    if (redisUrl) {
      try {
        this.redis = new Redis(redisUrl, {
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => Math.min(times * 50, 2000),
          enableReadyCheck: true,
          lazyConnect: true,
          // Connection pool settings for memory efficiency
          connectionName: 'paintbox-cache',
          enableOfflineQueue: false,
        });

        await this.redis.connect();
        console.log('Redis cache connected');

        // Set memory policy
        await this.redis.config('SET', 'maxmemory-policy', 'allkeys-lru');
      } catch (error) {
        console.error('Redis connection failed, falling back to local cache:', error);
        this.redis = null;
      }
    }
  }

  private getCacheKey(key: string): string {
    return `paintbox:${key}`;
  }

  private hashKey(key: string): string {
    return crypto.createHash('md5').update(key).digest('hex');
  }

  async get<T>(key: string): Promise<T | null> {
    const hashedKey = this.hashKey(key);

    // Check local cache first (L1)
    const localValue = this.localCache.get(hashedKey);
    if (localValue !== undefined) {
      this.stats.hits++;
      return localValue;
    }

    // Check Redis (L2)
    if (this.redis) {
      try {
        const redisKey = this.getCacheKey(hashedKey);
        const compressed = await this.redis.getBuffer(redisKey);

        if (compressed) {
          const decompressed = await gunzip(compressed);
          const value = JSON.parse(decompressed.toString());

          // Populate L1 cache
          this.localCache.set(hashedKey, value);
          this.stats.hits++;

          return value;
        }
      } catch (error) {
        console.error('Redis get error:', error);
      }
    }

    this.stats.misses++;
    return null;
  }

  async set<T>(
    key: string,
    value: T,
    options: CacheOptions = {}
  ): Promise<void> {
    const hashedKey = this.hashKey(key);
    const { ttl = 3600, compress = true, priority = 'medium' } = options;

    // Determine if value should be cached based on priority and memory
    if (!this.shouldCache(priority)) {
      return;
    }

    // Set in local cache (L1)
    this.localCache.set(hashedKey, value, { ttl: ttl * 1000 });

    // Set in Redis (L2)
    if (this.redis) {
      try {
        const serialized = JSON.stringify(value);
        const redisKey = this.getCacheKey(hashedKey);

        if (compress && serialized.length > 1024) {
          // Compress large values
          const compressed = await gzip(Buffer.from(serialized));
          await this.redis.setex(redisKey, ttl, compressed);
        } else {
          await this.redis.setex(redisKey, ttl, serialized);
        }
      } catch (error) {
        console.error('Redis set error:', error);
      }
    }
  }

  async del(key: string): Promise<void> {
    const hashedKey = this.hashKey(key);

    // Delete from local cache
    this.localCache.delete(hashedKey);

    // Delete from Redis
    if (this.redis) {
      try {
        const redisKey = this.getCacheKey(hashedKey);
        await this.redis.del(redisKey);
      } catch (error) {
        console.error('Redis del error:', error);
      }
    }
  }

  async clear(): Promise<void> {
    // Clear local cache
    this.localCache.clear();

    // Clear Redis namespace
    if (this.redis) {
      try {
        const keys = await this.redis.keys('paintbox:*');
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } catch (error) {
        console.error('Redis clear error:', error);
      }
    }
  }

  private shouldCache(priority: 'high' | 'medium' | 'low'): boolean {
    const memUsage = process.memoryUsage();
    const heapPercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    // Adaptive caching based on memory pressure
    if (heapPercentage > 85) {
      return priority === 'high';
    } else if (heapPercentage > 70) {
      return priority !== 'low';
    }

    return true;
  }

  private startMemoryMonitoring() {
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const heapPercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;

      this.stats.memoryUsage = memUsage.heapUsed;

      // Emergency memory cleanup
      if (heapPercentage > 90) {
        console.warn('High memory usage detected, clearing local cache');
        this.localCache.clear();

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
    }, 30000); // Check every 30 seconds
  }

  getStats(): CacheStats {
    return {
      ...this.stats,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
    } as CacheStats & { hitRate: number };
  }

  // Specialized caching methods for different data types

  async cacheCalculation(
    formulaKey: string,
    result: any,
    dependencies: string[] = []
  ): Promise<void> {
    const cacheKey = `calc:${formulaKey}`;
    const ttl = dependencies.length > 0 ? 300 : 3600; // Shorter TTL for dependent calculations

    await this.set(cacheKey, {
      result,
      dependencies,
      timestamp: Date.now(),
    }, {
      ttl,
      compress: true,
      priority: 'high',
    });
  }

  async getCachedCalculation(formulaKey: string): Promise<any | null> {
    const cacheKey = `calc:${formulaKey}`;
    const cached = await this.get<{
      result: any;
      dependencies: string[];
      timestamp: number;
    }>(cacheKey);

    if (cached) {
      // Check if dependencies have changed
      for (const dep of cached.dependencies) {
        const depCache = await this.get(`calc:${dep}`);
        if (!depCache || (depCache as any).timestamp > cached.timestamp) {
          // Dependency has changed, invalidate cache
          await this.del(cacheKey);
          return null;
        }
      }

      return cached.result;
    }

    return null;
  }

  async cacheApiResponse(
    endpoint: string,
    params: any,
    response: any,
    ttl: number = 300
  ): Promise<void> {
    const cacheKey = `api:${endpoint}:${JSON.stringify(params)}`;

    await this.set(cacheKey, response, {
      ttl,
      compress: true,
      priority: 'medium',
    });
  }

  async getCachedApiResponse(endpoint: string, params: any): Promise<any | null> {
    const cacheKey = `api:${endpoint}:${JSON.stringify(params)}`;
    return await this.get(cacheKey);
  }

  // Batch operations for efficiency

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    const results: (T | null)[] = [];

    for (const key of keys) {
      results.push(await this.get<T>(key));
    }

    return results;
  }

  async mset(items: Array<{ key: string; value: any; options?: CacheOptions }>): Promise<void> {
    const promises = items.map(item =>
      this.set(item.key, item.value, item.options)
    );

    await Promise.all(promises);
  }
}

// Singleton instance
let cacheInstance: MemoryOptimizedCache | null = null;

export function getCache(): MemoryOptimizedCache {
  if (!cacheInstance) {
    cacheInstance = new MemoryOptimizedCache();
  }
  return cacheInstance;
}

export { MemoryOptimizedCache, CacheOptions, CacheStats };

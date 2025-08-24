// Redis Caching Layer Implementation for Candlefish AI Platform
// Priority: Performance optimization with multi-layer caching

import Redis from 'redis';
import { createHash } from 'crypto';
import { performance } from 'perf_hooks';

/**
 * Cache configuration interface
 */
interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  database?: number;
  retryDelayOnFailover: number;
  maxRetriesPerRequest: number;
  connectTimeout: number;
  commandTimeout: number;
  enableOfflineQueue: boolean;
}

/**
 * Cache options for individual operations
 */
interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Cache tags for invalidation
  compress?: boolean; // Enable compression for large values
  priority?: 'high' | 'medium' | 'low';
  fallbackToMemory?: boolean;
  skipCache?: boolean;
}

/**
 * Cache statistics interface
 */
interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  hitRate: number;
  avgResponseTime: number;
}

/**
 * Multi-layer caching system with Redis and in-memory fallback
 */
export class CandlefishCacheManager {
  private redis: Redis.RedisClientType;
  private memoryCache: Map<string, { value: any; expires: number; tags: string[] }>;
  private stats: CacheStats;
  private config: CacheConfig;
  private isConnected: boolean = false;
  private connectionRetries: number = 0;
  private maxConnectionRetries: number = 5;

  constructor(config: CacheConfig) {
    this.config = config;
    this.memoryCache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      hitRate: 0,
      avgResponseTime: 0,
    };

    this.initializeRedis();
    this.startMemoryCleanup();
    this.startStatsReporting();
  }

  /**
   * Initialize Redis connection with retry logic
   */
  private async initializeRedis(): Promise<void> {
    try {
      this.redis = Redis.createClient({
        host: this.config.host,
        port: this.config.port,
        password: this.config.password,
        db: this.config.database || 0,
        retryDelayOnFailover: this.config.retryDelayOnFailover,
        maxRetriesPerRequest: this.config.maxRetriesPerRequest,
        connectTimeout: this.config.connectTimeout,
        commandTimeout: this.config.commandTimeout,
        enableOfflineQueue: this.config.enableOfflineQueue,
      }) as Redis.RedisClientType;

      this.redis.on('connect', () => {
        console.log('[CacheManager] Redis connected');
        this.isConnected = true;
        this.connectionRetries = 0;
      });

      this.redis.on('error', (error) => {
        console.error('[CacheManager] Redis error:', error);
        this.stats.errors++;
        this.isConnected = false;

        if (this.connectionRetries < this.maxConnectionRetries) {
          this.connectionRetries++;
          setTimeout(() => this.initializeRedis(), 5000);
        }
      });

      this.redis.on('disconnect', () => {
        console.warn('[CacheManager] Redis disconnected');
        this.isConnected = false;
      });

      await this.redis.connect();
    } catch (error) {
      console.error('[CacheManager] Failed to initialize Redis:', error);
      this.isConnected = false;
    }
  }

  /**
   * Generate cache key with consistent hashing
   */
  private generateCacheKey(key: string, namespace?: string): string {
    const fullKey = namespace ? `${namespace}:${key}` : key;

    // For very long keys, use hash to prevent Redis key length issues
    if (fullKey.length > 250) {
      const hash = createHash('sha256').update(fullKey).digest('hex');
      return `hashed:${hash}`;
    }

    return fullKey;
  }

  /**
   * Compress data for storage if needed
   */
  private async compressData(data: any): Promise<string> {
    const jsonString = JSON.stringify(data);

    // Only compress if data is large enough to benefit
    if (jsonString.length < 1024) {
      return jsonString;
    }

    try {
      const { gzip } = await import('zlib');
      const { promisify } = await import('util');
      const gzipAsync = promisify(gzip);

      const compressed = await gzipAsync(Buffer.from(jsonString));
      return `compressed:${compressed.toString('base64')}`;
    } catch (error) {
      console.warn('[CacheManager] Compression failed, storing uncompressed:', error);
      return jsonString;
    }
  }

  /**
   * Decompress data after retrieval
   */
  private async decompressData(data: string): Promise<any> {
    if (!data.startsWith('compressed:')) {
      return JSON.parse(data);
    }

    try {
      const { gunzip } = await import('zlib');
      const { promisify } = await import('util');
      const gunzipAsync = promisify(gunzip);

      const compressed = Buffer.from(data.substring(11), 'base64');
      const decompressed = await gunzipAsync(compressed);
      return JSON.parse(decompressed.toString());
    } catch (error) {
      console.error('[CacheManager] Decompression failed:', error);
      throw new Error('Failed to decompress cached data');
    }
  }

  /**
   * Get value from cache with fallback strategy
   */
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    if (options.skipCache) {
      return null;
    }

    const startTime = performance.now();
    const cacheKey = this.generateCacheKey(key);

    try {
      // L1: Memory cache (fastest)
      if (options.fallbackToMemory !== false) {
        const memoryItem = this.memoryCache.get(cacheKey);
        if (memoryItem && memoryItem.expires > Date.now()) {
          this.stats.hits++;
          this.updateAvgResponseTime(performance.now() - startTime);
          return memoryItem.value;
        } else if (memoryItem) {
          // Expired, remove from memory cache
          this.memoryCache.delete(cacheKey);
        }
      }

      // L2: Redis cache (fast, distributed)
      if (this.isConnected) {
        const redisValue = await this.redis.get(cacheKey);
        if (redisValue) {
          const value = options.compress
            ? await this.decompressData(redisValue)
            : JSON.parse(redisValue);

          // Populate L1 cache
          if (options.fallbackToMemory !== false) {
            this.memoryCache.set(cacheKey, {
              value,
              expires: Date.now() + (options.ttl || 3600) * 1000,
              tags: options.tags || []
            });
          }

          this.stats.hits++;
          this.updateAvgResponseTime(performance.now() - startTime);
          return value;
        }
      }

      // Cache miss
      this.stats.misses++;
      this.updateAvgResponseTime(performance.now() - startTime);
      return null;
    } catch (error) {
      console.error('[CacheManager] Get error:', error);
      this.stats.errors++;
      return null;
    }
  }

  /**
   * Set value in cache with TTL and options
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<boolean> {
    if (options.skipCache) {
      return false;
    }

    const startTime = performance.now();
    const cacheKey = this.generateCacheKey(key);
    const ttl = options.ttl || 3600; // Default 1 hour

    try {
      // Store in memory cache if enabled
      if (options.fallbackToMemory !== false) {
        this.memoryCache.set(cacheKey, {
          value,
          expires: Date.now() + ttl * 1000,
          tags: options.tags || []
        });
      }

      // Store in Redis if connected
      if (this.isConnected) {
        const serializedValue = options.compress
          ? await this.compressData(value)
          : JSON.stringify(value);

        await this.redis.setEx(cacheKey, ttl, serializedValue);

        // Add tags for cache invalidation
        if (options.tags && options.tags.length > 0) {
          const tagPromises = options.tags.map(tag =>
            this.redis.sAdd(`tag:${tag}`, cacheKey)
          );
          await Promise.all(tagPromises);
        }
      }

      this.stats.sets++;
      this.updateAvgResponseTime(performance.now() - startTime);
      return true;
    } catch (error) {
      console.error('[CacheManager] Set error:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Delete specific cache key
   */
  async del(key: string): Promise<boolean> {
    const startTime = performance.now();
    const cacheKey = this.generateCacheKey(key);

    try {
      // Remove from memory cache
      this.memoryCache.delete(cacheKey);

      // Remove from Redis
      if (this.isConnected) {
        await this.redis.del(cacheKey);
      }

      this.stats.deletes++;
      this.updateAvgResponseTime(performance.now() - startTime);
      return true;
    } catch (error) {
      console.error('[CacheManager] Delete error:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTag(tag: string): Promise<number> {
    if (!this.isConnected) {
      // Fallback to memory cache tag invalidation
      let count = 0;
      for (const [key, item] of this.memoryCache.entries()) {
        if (item.tags.includes(tag)) {
          this.memoryCache.delete(key);
          count++;
        }
      }
      return count;
    }

    try {
      const keys = await this.redis.sMembers(`tag:${tag}`);

      if (keys.length === 0) {
        return 0;
      }

      // Remove keys from cache
      await this.redis.del(...keys);

      // Remove tag set
      await this.redis.del(`tag:${tag}`);

      // Remove from memory cache
      keys.forEach(key => this.memoryCache.delete(key));

      return keys.length;
    } catch (error) {
      console.error('[CacheManager] Tag invalidation error:', error);
      this.stats.errors++;
      return 0;
    }
  }

  /**
   * Flush all cache data
   */
  async flush(): Promise<boolean> {
    try {
      // Clear memory cache
      this.memoryCache.clear();

      // Clear Redis
      if (this.isConnected) {
        await this.redis.flushDb();
      }

      return true;
    } catch (error) {
      console.error('[CacheManager] Flush error:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Get or set pattern - fetch if not cached
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    // Not in cache, fetch and store
    try {
      const value = await fetchFn();
      await this.set(key, value, options);
      return value;
    } catch (error) {
      console.error('[CacheManager] GetOrSet fetch error:', error);
      throw error;
    }
  }

  /**
   * Batch operations for better performance
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    if (!this.isConnected) {
      return keys.map(() => null);
    }

    try {
      const cacheKeys = keys.map(key => this.generateCacheKey(key));
      const values = await this.redis.mGet(cacheKeys);

      return values.map((value, index) => {
        if (value) {
          try {
            this.stats.hits++;
            return JSON.parse(value);
          } catch (error) {
            console.error('[CacheManager] JSON parse error:', error);
            this.stats.errors++;
            return null;
          }
        }
        this.stats.misses++;
        return null;
      });
    } catch (error) {
      console.error('[CacheManager] Batch get error:', error);
      this.stats.errors++;
      return keys.map(() => null);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & {
    memorySize: number;
    redisConnected: boolean;
    uptime: number;
  } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;

    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100,
      memorySize: this.memoryCache.size,
      redisConnected: this.isConnected,
      uptime: process.uptime(),
    };
  }

  /**
   * Health check for cache system
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    redis: boolean;
    memory: boolean;
    latency: number;
  }> {
    const startTime = performance.now();

    try {
      // Test Redis connection
      let redisHealthy = false;
      if (this.isConnected) {
        await this.redis.ping();
        redisHealthy = true;
      }

      // Test memory cache
      const testKey = `health_check_${Date.now()}`;
      this.memoryCache.set(testKey, { test: true }, {
        value: { test: true },
        expires: Date.now() + 1000,
        tags: []
      });
      const memoryHealthy = this.memoryCache.has(testKey);
      this.memoryCache.delete(testKey);

      const latency = performance.now() - startTime;

      let status: 'healthy' | 'degraded' | 'unhealthy';
      if (redisHealthy && memoryHealthy) {
        status = 'healthy';
      } else if (memoryHealthy) {
        status = 'degraded'; // Memory cache working but Redis down
      } else {
        status = 'unhealthy';
      }

      return {
        status,
        redis: redisHealthy,
        memory: memoryHealthy,
        latency: Math.round(latency * 100) / 100
      };
    } catch (error) {
      console.error('[CacheManager] Health check error:', error);
      return {
        status: 'unhealthy',
        redis: false,
        memory: false,
        latency: -1
      };
    }
  }

  /**
   * Update average response time metric
   */
  private updateAvgResponseTime(responseTime: number): void {
    const totalOperations = this.stats.hits + this.stats.misses + this.stats.sets + this.stats.deletes;

    if (totalOperations === 1) {
      this.stats.avgResponseTime = responseTime;
    } else {
      this.stats.avgResponseTime =
        (this.stats.avgResponseTime * (totalOperations - 1) + responseTime) / totalOperations;
    }
  }

  /**
   * Start memory cache cleanup process
   */
  private startMemoryCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const expired: string[] = [];

      for (const [key, item] of this.memoryCache.entries()) {
        if (item.expires < now) {
          expired.push(key);
        }
      }

      expired.forEach(key => this.memoryCache.delete(key));

      if (expired.length > 0) {
        console.log(`[CacheManager] Cleaned up ${expired.length} expired memory cache entries`);
      }
    }, 60000); // Clean up every minute
  }

  /**
   * Start stats reporting
   */
  private startStatsReporting(): void {
    setInterval(() => {
      const stats = this.getStats();
      console.log('[CacheManager] Stats:', {
        hitRate: `${stats.hitRate}%`,
        operations: stats.hits + stats.misses,
        memorySize: stats.memorySize,
        redisConnected: stats.redisConnected,
        errors: stats.errors
      });
    }, 300000); // Report every 5 minutes
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('[CacheManager] Shutting down...');

    if (this.isConnected && this.redis) {
      await this.redis.quit();
    }

    this.memoryCache.clear();
    console.log('[CacheManager] Shutdown complete');
  }
}

/**
 * Cache decorators for methods
 */
export function CacheResult(options: CacheOptions = {}) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cache = this.cacheManager as CandlefishCacheManager;
      if (!cache) {
        return method.apply(this, args);
      }

      const key = `${target.constructor.name}:${propertyName}:${JSON.stringify(args)}`;

      return cache.getOrSet(
        key,
        () => method.apply(this, args),
        options
      );
    };

    return descriptor;
  };
}

/**
 * Factory function to create cache manager instance
 */
export function createCacheManager(config: Partial<CacheConfig> = {}): CandlefishCacheManager {
  const defaultConfig: CacheConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    database: parseInt(process.env.REDIS_DB || '0'),
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    connectTimeout: 5000,
    commandTimeout: 2000,
    enableOfflineQueue: false,
  };

  return new CandlefishCacheManager({ ...defaultConfig, ...config });
}

// Export cache manager instance for global use
export const globalCacheManager = createCacheManager();

export default CandlefishCacheManager;

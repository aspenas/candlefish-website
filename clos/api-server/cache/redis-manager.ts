/**
 * Redis Cache Manager with Multi-Tier Caching Strategy
 * Implements Memory → Redis → Database cache hierarchy
 * 
 * Performance targets:
 * - Memory cache hit: <1ms
 * - Redis cache hit: <5ms  
 * - Database query: <50ms
 * - Overall API response: <50ms for cached data
 */

import Redis from 'ioredis';
import { LRUCache } from 'lru-cache';
import { createHash } from 'crypto';
import { promisify } from 'util';
import zlib from 'zlib';
import msgpack from 'msgpack-lite';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export interface CacheConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
    retryStrategy?: (times: number) => number;
    enableOfflineQueue?: boolean;
    maxRetriesPerRequest?: number;
  };
  memory: {
    max: number; // Max items in memory
    ttl: number; // TTL in milliseconds
    updateAgeOnGet?: boolean;
  };
  compression: {
    enabled: boolean;
    threshold: number; // Bytes threshold for compression
  };
  monitoring: {
    enabled: boolean;
    sampleRate: number; // Sample rate for metrics (0-1)
  };
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  hitRate: number;
  avgLatency: number;
  memoryUsage: number;
}

export interface CacheEntry<T = any> {
  data: T;
  metadata: {
    created: number;
    accessed: number;
    accessCount: number;
    ttl: number;
    compressed: boolean;
    size: number;
  };
}

export class RedisCacheManager {
  private redis: Redis;
  private memoryCache: LRUCache<string, CacheEntry>;
  private stats: Map<string, CacheStats>;
  private config: CacheConfig;
  private writeThrough: boolean = true;
  private circuitBreaker: {
    failures: number;
    lastFailureTime: number;
    isOpen: boolean;
    halfOpenTime: number;
  };

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = this.mergeConfig(config);
    this.initializeRedis();
    this.initializeMemoryCache();
    this.initializeStats();
    this.initializeCircuitBreaker();
  }

  private mergeConfig(partial: Partial<CacheConfig>): CacheConfig {
    return {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: 0,
        retryStrategy: (times) => Math.min(times * 50, 2000),
        enableOfflineQueue: false,
        maxRetriesPerRequest: 3,
        ...partial.redis
      },
      memory: {
        max: 1000,
        ttl: 60000, // 1 minute
        updateAgeOnGet: true,
        ...partial.memory
      },
      compression: {
        enabled: true,
        threshold: 1024, // 1KB
        ...partial.compression
      },
      monitoring: {
        enabled: true,
        sampleRate: 0.1,
        ...partial.monitoring
      }
    };
  }

  private initializeRedis(): void {
    this.redis = new Redis({
      ...this.config.redis,
      lazyConnect: true,
      reconnectOnError: (err) => {
        const targetErrors = ['READONLY', 'ETIMEDOUT', 'ECONNRESET'];
        return targetErrors.some(e => err.message.includes(e));
      }
    });

    this.redis.on('error', (error) => {
      console.error('[Redis] Connection error:', error.message);
      this.handleRedisFailure();
    });

    this.redis.on('connect', () => {
      console.log('[Redis] Connected successfully');
      this.resetCircuitBreaker();
    });

    this.redis.on('ready', () => {
      console.log('[Redis] Ready to accept commands');
    });

    // Connect asynchronously
    this.redis.connect().catch(err => {
      console.error('[Redis] Initial connection failed:', err);
      this.handleRedisFailure();
    });
  }

  private initializeMemoryCache(): void {
    this.memoryCache = new LRUCache<string, CacheEntry>({
      max: this.config.memory.max,
      ttl: this.config.memory.ttl,
      updateAgeOnGet: this.config.memory.updateAgeOnGet,
      sizeCalculation: (entry) => entry.metadata.size,
      dispose: (key, entry) => {
        // Optional: Write-back to Redis on eviction
        if (this.writeThrough && !this.circuitBreaker.isOpen) {
          this.setRedisOnly(key, entry).catch(() => {});
        }
      }
    });
  }

  private initializeStats(): void {
    this.stats = new Map([
      ['memory', this.createEmptyStats()],
      ['redis', this.createEmptyStats()],
      ['overall', this.createEmptyStats()]
    ]);
  }

  private initializeCircuitBreaker(): void {
    this.circuitBreaker = {
      failures: 0,
      lastFailureTime: 0,
      isOpen: false,
      halfOpenTime: 0
    };
  }

  private createEmptyStats(): CacheStats {
    return {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      hitRate: 0,
      avgLatency: 0,
      memoryUsage: 0
    };
  }

  /**
   * Generate cache key with namespace support
   */
  public generateKey(namespace: string, identifier: string | object): string {
    const data = typeof identifier === 'string' 
      ? identifier 
      : JSON.stringify(identifier);
    
    const hash = createHash('sha256')
      .update(data)
      .digest('hex')
      .substring(0, 16);
    
    return `${namespace}:${hash}`;
  }

  /**
   * Get value with multi-tier cache fallback
   */
  public async get<T>(
    key: string,
    options: {
      skipMemory?: boolean;
      skipRedis?: boolean;
      deserializer?: (data: any) => T;
    } = {}
  ): Promise<T | null> {
    const startTime = Date.now();
    
    try {
      // Layer 1: Memory cache
      if (!options.skipMemory) {
        const memoryResult = this.memoryCache.get(key);
        if (memoryResult) {
          this.updateStats('memory', 'hit', Date.now() - startTime);
          return this.deserializeData<T>(memoryResult.data, options.deserializer);
        }
      }

      // Layer 2: Redis cache
      if (!options.skipRedis && !this.circuitBreaker.isOpen) {
        const redisResult = await this.getFromRedis<T>(key);
        if (redisResult) {
          // Promote to memory cache
          if (!options.skipMemory) {
            this.memoryCache.set(key, redisResult);
          }
          this.updateStats('redis', 'hit', Date.now() - startTime);
          return this.deserializeData<T>(redisResult.data, options.deserializer);
        }
      }

      this.updateStats('overall', 'miss', Date.now() - startTime);
      return null;
    } catch (error) {
      this.updateStats('overall', 'error', Date.now() - startTime);
      console.error(`[Cache] Get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value with multi-tier cache write-through
   */
  public async set<T>(
    key: string,
    value: T,
    options: {
      ttl?: number;
      skipMemory?: boolean;
      skipRedis?: boolean;
      serializer?: (data: T) => any;
      tags?: string[];
    } = {}
  ): Promise<boolean> {
    const startTime = Date.now();
    const ttl = options.ttl || this.config.memory.ttl;

    try {
      const serialized = await this.serializeData(value, options.serializer);
      const entry = this.createCacheEntry(serialized, ttl);

      // Write to memory cache
      if (!options.skipMemory) {
        this.memoryCache.set(key, entry);
      }

      // Write to Redis (async, non-blocking)
      if (!options.skipRedis && !this.circuitBreaker.isOpen) {
        this.setRedisOnly(key, entry, options.tags).catch(err => {
          console.error(`[Cache] Redis set error for key ${key}:`, err);
        });
      }

      this.updateStats('overall', 'set', Date.now() - startTime);
      return true;
    } catch (error) {
      this.updateStats('overall', 'error', Date.now() - startTime);
      console.error(`[Cache] Set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get or set with lazy loading pattern
   */
  public async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: {
      ttl?: number;
      skipMemory?: boolean;
      skipRedis?: boolean;
    } = {}
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    // Generate value and cache it
    const value = await factory();
    await this.set(key, value, options);
    return value;
  }

  /**
   * Batch get with pipeline optimization
   */
  public async mget<T>(
    keys: string[],
    options: {
      skipMemory?: boolean;
      skipRedis?: boolean;
    } = {}
  ): Promise<Map<string, T | null>> {
    const results = new Map<string, T | null>();
    const missingKeys: string[] = [];

    // Check memory cache first
    if (!options.skipMemory) {
      for (const key of keys) {
        const cached = this.memoryCache.get(key);
        if (cached) {
          results.set(key, this.deserializeData<T>(cached.data));
        } else {
          missingKeys.push(key);
        }
      }
    } else {
      missingKeys.push(...keys);
    }

    // Batch fetch from Redis
    if (missingKeys.length > 0 && !options.skipRedis && !this.circuitBreaker.isOpen) {
      try {
        const pipeline = this.redis.pipeline();
        missingKeys.forEach(key => pipeline.get(key));
        const redisResults = await pipeline.exec();

        if (redisResults) {
          redisResults.forEach((result, index) => {
            if (result && result[1]) {
              const key = missingKeys[index];
              const entry = JSON.parse(result[1] as string) as CacheEntry;
              results.set(key, this.deserializeData<T>(entry.data));
              
              // Promote to memory cache
              if (!options.skipMemory) {
                this.memoryCache.set(key, entry);
              }
            }
          });
        }
      } catch (error) {
        console.error('[Cache] Batch get error:', error);
      }
    }

    return results;
  }

  /**
   * Delete key from all cache layers
   */
  public async delete(key: string | string[]): Promise<boolean> {
    const keys = Array.isArray(key) ? key : [key];
    
    try {
      // Delete from memory
      keys.forEach(k => this.memoryCache.delete(k));

      // Delete from Redis
      if (!this.circuitBreaker.isOpen) {
        await this.redis.del(...keys);
      }

      return true;
    } catch (error) {
      console.error('[Cache] Delete error:', error);
      return false;
    }
  }

  /**
   * Invalidate cache by tags
   */
  public async invalidateByTags(tags: string[]): Promise<number> {
    let invalidated = 0;

    try {
      for (const tag of tags) {
        const keys = await this.redis.smembers(`tag:${tag}`);
        if (keys.length > 0) {
          await this.delete(keys);
          await this.redis.del(`tag:${tag}`);
          invalidated += keys.length;
        }
      }
    } catch (error) {
      console.error('[Cache] Tag invalidation error:', error);
    }

    return invalidated;
  }

  /**
   * Clear all cache layers
   */
  public async clear(pattern?: string): Promise<void> {
    try {
      // Clear memory cache
      if (!pattern) {
        this.memoryCache.clear();
      } else {
        for (const key of this.memoryCache.keys()) {
          if (key.includes(pattern)) {
            this.memoryCache.delete(key);
          }
        }
      }

      // Clear Redis
      if (!this.circuitBreaker.isOpen) {
        if (pattern) {
          const keys = await this.redis.keys(pattern);
          if (keys.length > 0) {
            await this.redis.del(...keys);
          }
        } else {
          await this.redis.flushdb();
        }
      }
    } catch (error) {
      console.error('[Cache] Clear error:', error);
    }
  }

  /**
   * Warm up cache with preloaded data
   */
  public async warmup(
    data: Map<string, any>,
    options: { ttl?: number } = {}
  ): Promise<void> {
    const promises: Promise<boolean>[] = [];
    
    for (const [key, value] of data) {
      promises.push(this.set(key, value, options));
    }

    await Promise.all(promises);
  }

  /**
   * Get cache statistics
   */
  public getStats(): Map<string, CacheStats> {
    // Update memory usage
    const memoryStats = this.stats.get('memory')!;
    memoryStats.memoryUsage = this.memoryCache.calculatedSize || 0;
    
    // Calculate hit rates
    for (const [layer, stats] of this.stats) {
      const total = stats.hits + stats.misses;
      stats.hitRate = total > 0 ? (stats.hits / total) * 100 : 0;
    }

    return new Map(this.stats);
  }

  /**
   * Helper: Get from Redis with decompression
   */
  private async getFromRedis<T>(key: string): Promise<CacheEntry<T> | null> {
    try {
      const data = await this.redis.get(key);
      if (!data) return null;

      const entry = JSON.parse(data) as CacheEntry;
      
      // Decompress if needed
      if (entry.metadata.compressed && this.config.compression.enabled) {
        const compressed = Buffer.from(entry.data as any, 'base64');
        const decompressed = await gunzip(compressed);
        entry.data = msgpack.decode(decompressed) as T;
      }

      return entry;
    } catch (error) {
      this.handleRedisFailure();
      throw error;
    }
  }

  /**
   * Helper: Set to Redis with compression
   */
  private async setRedisOnly(
    key: string,
    entry: CacheEntry,
    tags?: string[]
  ): Promise<void> {
    try {
      const serialized = { ...entry };
      
      // Compress if needed
      if (this.config.compression.enabled && 
          entry.metadata.size > this.config.compression.threshold) {
        const packed = msgpack.encode(entry.data);
        const compressed = await gzip(packed);
        serialized.data = compressed.toString('base64');
        serialized.metadata.compressed = true;
      }

      const pipeline = this.redis.pipeline();
      pipeline.set(key, JSON.stringify(serialized), 'PX', entry.metadata.ttl);
      
      // Handle tags
      if (tags && tags.length > 0) {
        tags.forEach(tag => {
          pipeline.sadd(`tag:${tag}`, key);
          pipeline.expire(`tag:${tag}`, Math.floor(entry.metadata.ttl / 1000));
        });
      }

      await pipeline.exec();
    } catch (error) {
      this.handleRedisFailure();
      throw error;
    }
  }

  /**
   * Helper: Create cache entry
   */
  private createCacheEntry<T>(data: T, ttl: number): CacheEntry<T> {
    const serialized = JSON.stringify(data);
    return {
      data,
      metadata: {
        created: Date.now(),
        accessed: Date.now(),
        accessCount: 0,
        ttl,
        compressed: false,
        size: Buffer.byteLength(serialized)
      }
    };
  }

  /**
   * Helper: Serialize data
   */
  private async serializeData<T>(
    data: T,
    customSerializer?: (data: T) => any
  ): Promise<any> {
    if (customSerializer) {
      return customSerializer(data);
    }
    return data;
  }

  /**
   * Helper: Deserialize data
   */
  private deserializeData<T>(
    data: any,
    customDeserializer?: (data: any) => T
  ): T {
    if (customDeserializer) {
      return customDeserializer(data);
    }
    return data as T;
  }

  /**
   * Helper: Update statistics
   */
  private updateStats(
    layer: string,
    operation: 'hit' | 'miss' | 'set' | 'delete' | 'error',
    latency: number
  ): void {
    const stats = this.stats.get(layer);
    if (!stats) return;

    switch (operation) {
      case 'hit':
        stats.hits++;
        break;
      case 'miss':
        stats.misses++;
        break;
      case 'set':
        stats.sets++;
        break;
      case 'delete':
        stats.deletes++;
        break;
      case 'error':
        stats.errors++;
        break;
    }

    // Update average latency (exponential moving average)
    const alpha = 0.1;
    stats.avgLatency = stats.avgLatency * (1 - alpha) + latency * alpha;
  }

  /**
   * Helper: Handle Redis failures for circuit breaker
   */
  private handleRedisFailure(): void {
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailureTime = Date.now();

    if (this.circuitBreaker.failures >= 5) {
      this.circuitBreaker.isOpen = true;
      this.circuitBreaker.halfOpenTime = Date.now() + 30000; // 30 seconds
      console.warn('[Redis] Circuit breaker opened due to failures');

      // Schedule half-open attempt
      setTimeout(() => {
        this.circuitBreaker.isOpen = false;
        this.circuitBreaker.failures = 0;
        console.log('[Redis] Circuit breaker attempting half-open state');
      }, 30000);
    }
  }

  /**
   * Helper: Reset circuit breaker
   */
  private resetCircuitBreaker(): void {
    this.circuitBreaker.failures = 0;
    this.circuitBreaker.isOpen = false;
    this.circuitBreaker.lastFailureTime = 0;
  }

  /**
   * Graceful shutdown
   */
  public async shutdown(): Promise<void> {
    try {
      this.memoryCache.clear();
      await this.redis.quit();
      console.log('[Cache] Shutdown complete');
    } catch (error) {
      console.error('[Cache] Shutdown error:', error);
    }
  }
}

// Export singleton instance
export const cacheManager = new RedisCacheManager();
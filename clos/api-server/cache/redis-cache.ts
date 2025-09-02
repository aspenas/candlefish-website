/**
 * Redis Cache Service for Performance Optimization
 * Implements multi-layer caching with TTL strategies
 */

import Redis from 'ioredis';
import { createHash } from 'crypto';

interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  maxRetriesPerRequest?: number;
  enableReadyCheck?: boolean;
  lazyConnect?: boolean;
}

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Cache tags for invalidation
  compress?: boolean; // Compress large values
}

export class RedisCache {
  private client: Redis;
  private subscriber: Redis;
  private publisher: Redis;
  private readonly defaultTTL = 3600; // 1 hour default
  private readonly compressionThreshold = 1024; // 1KB

  // Cache key prefixes for different data types
  private readonly prefixes = {
    query: 'gql:query:',
    user: 'user:',
    session: 'session:',
    list: 'list:',
    count: 'count:',
    lock: 'lock:',
    tag: 'tag:',
  };

  constructor(config: CacheConfig) {
    // Main client for get/set operations
    this.client = new Redis({
      ...config,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    // Separate clients for pub/sub to avoid blocking
    this.subscriber = new Redis(config);
    this.publisher = new Redis(config);

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('error', (err) => {
      console.error('Redis client error:', err);
    });

    this.client.on('connect', () => {
      console.log('Redis client connected');
    });

    this.client.on('ready', () => {
      console.log('Redis client ready');
    });
  }

  /**
   * Generate cache key from query and variables
   */
  generateKey(prefix: string, data: any): string {
    const hash = createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex')
      .substring(0, 16);
    return `${prefix}${hash}`;
  }

  /**
   * Get value from cache with automatic deserialization
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      if (!value) return null;

      // Check if compressed
      if (value.startsWith('gzip:')) {
        const decompressed = await this.decompress(value.substring(5));
        return JSON.parse(decompressed);
      }

      return JSON.parse(value);
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache with automatic serialization
   */
  async set(
    key: string,
    value: any,
    options: CacheOptions = {}
  ): Promise<boolean> {
    try {
      const ttl = options.ttl || this.defaultTTL;
      let serialized = JSON.stringify(value);

      // Compress if needed
      if (
        options.compress !== false &&
        serialized.length > this.compressionThreshold
      ) {
        serialized = 'gzip:' + (await this.compress(serialized));
      }

      // Set with TTL
      await this.client.setex(key, ttl, serialized);

      // Handle tags for cache invalidation
      if (options.tags && options.tags.length > 0) {
        await this.addToTags(key, options.tags, ttl);
      }

      return true;
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete key from cache
   */
  async del(key: string | string[]): Promise<number> {
    const keys = Array.isArray(key) ? key : [key];
    return this.client.del(...keys);
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    const pipeline = this.client.pipeline();
    
    for (const tag of tags) {
      const tagKey = `${this.prefixes.tag}${tag}`;
      const members = await this.client.smembers(tagKey);
      
      if (members.length > 0) {
        pipeline.del(...members);
        pipeline.del(tagKey);
      }
    }
    
    await pipeline.exec();
  }

  /**
   * GraphQL query caching with automatic key generation
   */
  async cacheQuery(
    query: string,
    variables: any,
    result: any,
    ttl: number = 300 // 5 minutes default for queries
  ): Promise<void> {
    const key = this.generateKey(this.prefixes.query, { query, variables });
    await this.set(key, result, { ttl });
  }

  /**
   * Get cached GraphQL query result
   */
  async getCachedQuery<T>(query: string, variables: any): Promise<T | null> {
    const key = this.generateKey(this.prefixes.query, { query, variables });
    return this.get<T>(key);
  }

  /**
   * Implement cache-aside pattern
   */
  async cacheAside<T>(
    key: string,
    factory: () => Promise<T>,
    ttl: number = this.defaultTTL
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      // Update TTL on hit (sliding expiration)
      await this.client.expire(key, ttl);
      return cached;
    }

    // Use distributed lock to prevent thundering herd
    const lockKey = `${this.prefixes.lock}${key}`;
    const lockAcquired = await this.acquireLock(lockKey, 10);

    if (!lockAcquired) {
      // Wait and retry from cache
      await this.sleep(100);
      const retryCache = await this.get<T>(key);
      if (retryCache !== null) return retryCache;
    }

    try {
      // Generate value
      const value = await factory();
      
      // Store in cache
      await this.set(key, value, { ttl });
      
      return value;
    } finally {
      if (lockAcquired) {
        await this.releaseLock(lockKey);
      }
    }
  }

  /**
   * Batch get multiple keys
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    const values = await this.client.mget(...keys);
    return values.map((value) => {
      if (!value) return null;
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    });
  }

  /**
   * Implement write-through caching
   */
  async writeThrough<T>(
    key: string,
    value: T,
    persist: (value: T) => Promise<void>,
    ttl: number = this.defaultTTL
  ): Promise<void> {
    // Write to cache first
    await this.set(key, value, { ttl });
    
    // Then persist to database
    await persist(value);
  }

  /**
   * Implement write-behind caching (async write)
   */
  async writeBehind<T>(
    key: string,
    value: T,
    persist: (value: T) => Promise<void>,
    ttl: number = this.defaultTTL
  ): Promise<void> {
    // Write to cache immediately
    await this.set(key, value, { ttl });
    
    // Queue database write asynchronously
    setImmediate(() => {
      persist(value).catch((error) => {
        console.error('Write-behind persist error:', error);
        // Implement retry logic or dead letter queue
      });
    });
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    hits: number;
    misses: number;
    hitRate: number;
    memoryUsage: number;
    keys: number;
  }> {
    const info = await this.client.info('stats');
    const memory = await this.client.info('memory');
    const keyCount = await this.client.dbsize();
    
    // Parse Redis INFO output
    const stats = this.parseRedisInfo(info);
    const memStats = this.parseRedisInfo(memory);
    
    const hits = parseInt(stats.keyspace_hits || '0');
    const misses = parseInt(stats.keyspace_misses || '0');
    const total = hits + misses;
    
    return {
      hits,
      misses,
      hitRate: total > 0 ? hits / total : 0,
      memoryUsage: parseInt(memStats.used_memory || '0'),
      keys: keyCount,
    };
  }

  /**
   * Clear all cache (use with caution)
   */
  async flush(): Promise<void> {
    await this.client.flushdb();
  }

  /**
   * Graceful shutdown
   */
  async disconnect(): Promise<void> {
    await this.client.quit();
    await this.subscriber.quit();
    await this.publisher.quit();
  }

  // Helper methods

  private async addToTags(key: string, tags: string[], ttl: number): Promise<void> {
    const pipeline = this.client.pipeline();
    
    for (const tag of tags) {
      const tagKey = `${this.prefixes.tag}${tag}`;
      pipeline.sadd(tagKey, key);
      pipeline.expire(tagKey, ttl);
    }
    
    await pipeline.exec();
  }

  private async acquireLock(key: string, ttl: number): Promise<boolean> {
    const result = await this.client.set(key, '1', 'EX', ttl, 'NX');
    return result === 'OK';
  }

  private async releaseLock(key: string): Promise<void> {
    await this.client.del(key);
  }

  private async compress(data: string): Promise<string> {
    // Implement gzip compression
    const { gzip } = await import('zlib');
    return new Promise((resolve, reject) => {
      gzip(Buffer.from(data), (err, buffer) => {
        if (err) reject(err);
        else resolve(buffer.toString('base64'));
      });
    });
  }

  private async decompress(data: string): Promise<string> {
    // Implement gzip decompression
    const { gunzip } = await import('zlib');
    return new Promise((resolve, reject) => {
      gunzip(Buffer.from(data, 'base64'), (err, buffer) => {
        if (err) reject(err);
        else resolve(buffer.toString());
      });
    });
  }

  private parseRedisInfo(info: string): Record<string, string> {
    const result: Record<string, string> = {};
    const lines = info.split('\r\n');
    
    for (const line of lines) {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          result[key] = value;
        }
      }
    }
    
    return result;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
let cacheInstance: RedisCache | null = null;

export function initializeCache(config: CacheConfig): RedisCache {
  if (!cacheInstance) {
    cacheInstance = new RedisCache(config);
  }
  return cacheInstance;
}

export function getCache(): RedisCache {
  if (!cacheInstance) {
    throw new Error('Cache not initialized. Call initializeCache first.');
  }
  return cacheInstance;
}
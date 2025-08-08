/**
 * Redis Cache Service for Paintbox Application
 * Provides caching functionality with Redis backend, fallback to in-memory cache
 */

import Redis from 'ioredis';
import { logger } from '@/lib/logging/simple-logger';

export interface CacheService {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  ttl(key: string): Promise<number>;
  incr(key: string, ttlSeconds?: number): Promise<number>;
  decr(key: string): Promise<number>;
  expire(key: string, ttlSeconds: number): Promise<void>;
  flushAll(): Promise<void>;
  disconnect(): Promise<void>;
}

/**
 * Redis-based cache implementation
 */
class RedisCacheService implements CacheService {
  private client: Redis;
  private isConnected: boolean = false;

  constructor(redisUrl?: string) {
    const url = redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';

    this.client = new Redis(url, {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000,
    });

    this.setupEventHandlers();
    this.connect();
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      this.isConnected = true;
      logger.info('Redis cache connected successfully');
    });

    this.client.on('error', (error) => {
      this.isConnected = false;
      logger.error('Redis cache connection error', { error: error.message });
    });

    this.client.on('close', () => {
      this.isConnected = false;
      logger.warn('Redis cache connection closed');
    });

    this.client.on('reconnecting', () => {
      logger.info('Redis cache reconnecting...');
    });
  }

  private async connect(): Promise<void> {
    try {
      await this.client.connect();
    } catch (error) {
      logger.error('Failed to connect to Redis cache', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      if (!this.isConnected) {
        throw new Error('Redis not connected');
      }
      return await this.client.get(key);
    } catch (error) {
      logger.error('Redis GET operation failed', {
        key,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (!this.isConnected) {
        throw new Error('Redis not connected');
      }

      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      logger.error('Redis SET operation failed', {
        key,
        ttlSeconds,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async del(key: string): Promise<void> {
    try {
      if (!this.isConnected) {
        throw new Error('Redis not connected');
      }
      await this.client.del(key);
    } catch (error) {
      logger.error('Redis DEL operation failed', {
        key,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      if (!this.isConnected) {
        throw new Error('Redis not connected');
      }
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis EXISTS operation failed', {
        key,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      if (!this.isConnected) {
        throw new Error('Redis not connected');
      }
      return await this.client.ttl(key);
    } catch (error) {
      logger.error('Redis TTL operation failed', {
        key,
        error: error instanceof Error ? error.message : String(error)
      });
      return -1;
    }
  }

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    try {
      if (!this.isConnected) {
        throw new Error('Redis not connected');
      }

      const result = await this.client.incr(key);

      if (ttlSeconds && result === 1) {
        // Set TTL only on first increment
        await this.client.expire(key, ttlSeconds);
      }

      return result;
    } catch (error) {
      logger.error('Redis INCR operation failed', {
        key,
        ttlSeconds,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async decr(key: string): Promise<number> {
    try {
      if (!this.isConnected) {
        throw new Error('Redis not connected');
      }
      return await this.client.decr(key);
    } catch (error) {
      logger.error('Redis DECR operation failed', {
        key,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    try {
      if (!this.isConnected) {
        throw new Error('Redis not connected');
      }
      await this.client.expire(key, ttlSeconds);
    } catch (error) {
      logger.error('Redis EXPIRE operation failed', {
        key,
        ttlSeconds,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async flushAll(): Promise<void> {
    try {
      if (!this.isConnected) {
        throw new Error('Redis not connected');
      }
      await this.client.flushall();
      logger.warn('Redis cache flushed all keys');
    } catch (error) {
      logger.error('Redis FLUSHALL operation failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.disconnect();
      this.isConnected = false;
      logger.info('Redis cache disconnected');
    } catch (error) {
      logger.error('Redis disconnect failed', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

/**
 * In-memory cache fallback implementation
 */
class InMemoryCacheService implements CacheService {
  private cache = new Map<string, { value: string; expires?: number }>();
  private timers = new Map<string, NodeJS.Timeout>();

  async get(key: string): Promise<string | null> {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    // Check if expired
    if (item.expires && Date.now() > item.expires) {
      this.cache.delete(key);
      const timer = this.timers.get(key);
      if (timer) {
        clearTimeout(timer);
        this.timers.delete(key);
      }
      return null;
    }

    return item.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const expires = ttlSeconds ? Date.now() + (ttlSeconds * 1000) : undefined;

    this.cache.set(key, { value, expires });

    // Clear any existing timer
    const existingTimer = this.timers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer if TTL specified
    if (ttlSeconds) {
      const timer = setTimeout(() => {
        this.cache.delete(key);
        this.timers.delete(key);
      }, ttlSeconds * 1000);

      this.timers.set(key, timer);
    }
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }

  async exists(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  async ttl(key: string): Promise<number> {
    const item = this.cache.get(key);

    if (!item || !item.expires) {
      return -1; // Key doesn't exist or has no expiration
    }

    const remainingMs = item.expires - Date.now();

    if (remainingMs <= 0) {
      return -2; // Key expired
    }

    return Math.ceil(remainingMs / 1000);
  }

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    const current = await this.get(key);
    const value = current ? parseInt(current, 10) + 1 : 1;

    await this.set(key, value.toString(), ttlSeconds);
    return value;
  }

  async decr(key: string): Promise<number> {
    const current = await this.get(key);
    const value = current ? parseInt(current, 10) - 1 : -1;

    await this.set(key, value.toString());
    return value;
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    const item = this.cache.get(key);
    if (item) {
      await this.set(key, item.value, ttlSeconds);
    }
  }

  async flushAll(): Promise<void> {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }

    this.cache.clear();
    this.timers.clear();

    logger.warn('In-memory cache flushed all keys');
  }

  async disconnect(): Promise<void> {
    await this.flushAll();
    logger.info('In-memory cache disconnected');
  }
}

// Singleton instance
let cacheInstance: CacheService | null = null;

/**
 * Get cache instance (Redis or in-memory fallback)
 */
export default function getCacheInstance(redisUrl?: string): CacheService {
  if (!cacheInstance) {
    try {
      // Try Redis first
      if (process.env.REDIS_URL || redisUrl) {
        cacheInstance = new RedisCacheService(redisUrl);
        logger.info('Using Redis cache service');
      } else {
        // Fall back to in-memory cache
        cacheInstance = new InMemoryCacheService();
        logger.warn('Using in-memory cache service (Redis not configured)');
      }
    } catch (error) {
      logger.error('Failed to initialize Redis cache, falling back to in-memory', {
        error: error instanceof Error ? error.message : String(error)
      });
      cacheInstance = new InMemoryCacheService();
    }
  }

  return cacheInstance;
}

/**
 * Create a new cache instance (for testing or specific use cases)
 */
export function createCacheInstance(type: 'redis' | 'memory', redisUrl?: string): CacheService {
  if (type === 'redis') {
    return new RedisCacheService(redisUrl);
  } else {
    return new InMemoryCacheService();
  }
}

export { CacheService, RedisCacheService, InMemoryCacheService };

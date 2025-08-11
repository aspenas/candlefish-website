/**
 * Advanced Caching Strategy Implementation
 * Multi-layer caching with Redis, CDN, and browser cache
 */

import Redis from 'ioredis';
import { createHash } from 'crypto';

// Cache configuration with TTL strategies
export const CACHE_CONFIG = {
  // API Response Caching
  api: {
    estimates: { ttl: 300, stale: 600 },      // 5 min TTL, 10 min stale
    projects: { ttl: 600, stale: 1200 },      // 10 min TTL, 20 min stale
    users: { ttl: 3600, stale: 7200 },        // 1 hour TTL, 2 hour stale
    photos: { ttl: 86400, stale: 172800 },    // 1 day TTL, 2 day stale
    pdfs: { ttl: 604800, stale: 1209600 },    // 1 week TTL, 2 week stale
  },

  // Database Query Caching
  database: {
    aggregations: { ttl: 3600 },              // 1 hour for expensive aggregations
    lookups: { ttl: 7200 },                   // 2 hours for lookup tables
    reports: { ttl: 1800 },                   // 30 min for reports
  },

  // Static Asset Caching
  static: {
    images: 'public, max-age=31536000, immutable',     // 1 year
    fonts: 'public, max-age=31536000, immutable',      // 1 year
    css: 'public, max-age=86400, must-revalidate',     // 1 day
    js: 'public, max-age=86400, must-revalidate',      // 1 day
  },

  // CDN Configuration
  cdn: {
    cloudflare: {
      zone: process.env.CLOUDFLARE_ZONE_ID,
      apiKey: process.env.CLOUDFLARE_API_KEY,
      cacheLevel: 'aggressive',
      browserTTL: 14400,        // 4 hours
      edgeTTL: 86400,          // 1 day
    }
  }
};

/**
 * Enhanced Redis Cache Service with advanced features
 */
export class AdvancedCacheService {
  private redis: Redis;
  private localCache: Map<string, { value: any; expires: number }> = new Map();

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),

      // Connection pool settings
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,

      // Performance optimizations
      enableOfflineQueue: true,
      connectTimeout: 10000,
      commandTimeout: 5000,

      // Connection pooling
      connectionName: 'paintbox-cache',
      keepAlive: 30000,
    });

    this.setupEventHandlers();
    this.startLocalCacheCleanup();
  }

  private setupEventHandlers(): void {
    this.redis.on('error', (err) => {
      console.error('Redis error:', err);
      // Fallback to local cache on Redis failure
    });

    this.redis.on('connect', () => {
      console.log('Redis connected successfully');
    });
  }

  private startLocalCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, item] of this.localCache.entries()) {
        if (item.expires < now) {
          this.localCache.delete(key);
        }
      }
    }, 60000); // Clean up every minute
  }

  /**
   * Generate cache key with versioning support
   */
  generateKey(namespace: string, identifier: string, params?: any): string {
    const version = process.env.CACHE_VERSION || 'v1';
    const paramHash = params ?
      createHash('md5').update(JSON.stringify(params)).digest('hex').slice(0, 8) :
      '';

    return `${version}:${namespace}:${identifier}${paramHash ? ':' + paramHash : ''}`;
  }

  /**
   * Get with stale-while-revalidate support
   */
  async getWithStale<T>(
    key: string,
    ttl: number,
    staleTtl: number,
    fetchFn: () => Promise<T>
  ): Promise<T> {
    // Check local cache first (L1)
    const localCached = this.localCache.get(key);
    if (localCached && localCached.expires > Date.now()) {
      return localCached.value;
    }

    // Check Redis (L2)
    try {
      const cached = await this.redis.get(key);
      if (cached) {
        const parsed = JSON.parse(cached);

        // Store in local cache
        this.localCache.set(key, {
          value: parsed,
          expires: Date.now() + (ttl * 1000)
        });

        // Check if stale
        const age = await this.redis.ttl(key);
        if (age < 0 || age > staleTtl - ttl) {
          // Still fresh, return immediately
          return parsed;
        }

        // Stale but return immediately, revalidate in background
        this.revalidateInBackground(key, ttl, fetchFn);
        return parsed;
      }
    } catch (error) {
      console.error('Cache get error:', error);
    }

    // Cache miss, fetch fresh data
    const fresh = await fetchFn();
    await this.set(key, fresh, ttl);
    return fresh;
  }

  /**
   * Background revalidation for stale-while-revalidate
   */
  private async revalidateInBackground<T>(
    key: string,
    ttl: number,
    fetchFn: () => Promise<T>
  ): Promise<void> {
    try {
      const fresh = await fetchFn();
      await this.set(key, fresh, ttl);
    } catch (error) {
      console.error('Background revalidation failed:', error);
    }
  }

  /**
   * Set with multi-layer caching
   */
  async set(key: string, value: any, ttl: number): Promise<void> {
    const serialized = JSON.stringify(value);

    // Store in Redis (L2)
    try {
      await this.redis.setex(key, ttl, serialized);
    } catch (error) {
      console.error('Redis set error:', error);
    }

    // Store in local cache (L1)
    this.localCache.set(key, {
      value,
      expires: Date.now() + (ttl * 1000)
    });
  }

  /**
   * Invalidate cache with pattern matching
   */
  async invalidatePattern(pattern: string): Promise<void> {
    // Clear local cache
    for (const key of this.localCache.keys()) {
      if (key.match(pattern)) {
        this.localCache.delete(key);
      }
    }

    // Clear Redis cache
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmUp(warmUpFns: Array<() => Promise<void>>): Promise<void> {
    console.log('Starting cache warm-up...');
    const start = Date.now();

    await Promise.all(warmUpFns.map(fn =>
      fn().catch(err => console.error('Warm-up error:', err))
    ));

    console.log(`Cache warm-up completed in ${Date.now() - start}ms`);
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    localCacheSize: number;
    redisInfo: any;
    hitRate: number;
  }> {
    const info = await this.redis.info('stats');

    return {
      localCacheSize: this.localCache.size,
      redisInfo: info,
      hitRate: this.calculateHitRate(),
    };
  }

  private hits = 0;
  private misses = 0;

  private calculateHitRate(): number {
    const total = this.hits + this.misses;
    return total > 0 ? (this.hits / total) * 100 : 0;
  }
}

/**
 * API Response Caching Middleware
 */
export function apiCacheMiddleware(namespace: string, ttl: number = 300) {
  const cache = new AdvancedCacheService();

  return async (req: any, res: any, next: any) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key
    const key = cache.generateKey(namespace, req.path, req.query);

    // Try to get from cache
    try {
      const cached = await cache.getWithStale(
        key,
        ttl,
        ttl * 2,
        async () => {
          // Capture the original response
          const originalSend = res.send;
          let responseData: any;

          res.send = function(data: any) {
            responseData = data;
            return originalSend.call(this, data);
          };

          await next();
          return responseData;
        }
      );

      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('Cache-Control', `private, max-age=${ttl}`);
        return res.send(cached);
      }
    } catch (error) {
      console.error('Cache middleware error:', error);
    }

    res.setHeader('X-Cache', 'MISS');
    next();
  };
}

/**
 * Browser Cache Headers Utility
 */
export function setBrowserCacheHeaders(
  res: any,
  type: 'static' | 'api' | 'dynamic',
  maxAge?: number
): void {
  switch (type) {
    case 'static':
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      break;
    case 'api':
      res.setHeader('Cache-Control', `private, max-age=${maxAge || 300}, must-revalidate`);
      res.setHeader('Vary', 'Accept-Encoding, Authorization');
      break;
    case 'dynamic':
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      break;
  }
}

/**
 * CDN Cache Purge Utility
 */
export async function purgeCDNCache(patterns: string[]): Promise<void> {
  const { cloudflare } = CACHE_CONFIG.cdn;

  if (!cloudflare.zone || !cloudflare.apiKey) {
    console.warn('CDN configuration missing');
    return;
  }

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${cloudflare.zone}/purge_cache`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cloudflare.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: patterns,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`CDN purge failed: ${response.statusText}`);
    }

    console.log('CDN cache purged successfully');
  } catch (error) {
    console.error('CDN purge error:', error);
  }
}

export default AdvancedCacheService;

/**
 * Redis Caching Configuration for Performance Optimization
 * 
 * Multi-layer caching strategy:
 * 1. Browser Cache (Service Worker)
 * 2. CDN Edge Cache
 * 3. Application Memory Cache
 * 4. Redis Distributed Cache
 * 5. Database Query Cache
 */

import Redis from 'ioredis';
import { LRUCache } from 'lru-cache';

// Redis connection configuration
const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryStrategy: (times: number) => Math.min(times * 50, 2000),
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true
};

// Cache TTL configurations (in seconds)
const TTL_CONFIG = {
  // Static assets
  STATIC_ASSETS: 31536000,     // 1 year
  IMAGES: 2592000,              // 30 days
  FONTS: 31536000,              // 1 year
  
  // API responses
  API_METRICS: 5,               // 5 seconds (near real-time)
  API_SERVICES: 30,             // 30 seconds
  API_LOGS: 10,                 // 10 seconds
  API_CONFIG: 300,              // 5 minutes
  
  // Application data
  USER_SESSION: 3600,           // 1 hour
  USER_PREFERENCES: 86400,      // 1 day
  COMPUTED_RESULTS: 300,        // 5 minutes
  
  // Database queries
  DB_QUERY_SHORT: 60,           // 1 minute
  DB_QUERY_MEDIUM: 300,         // 5 minutes
  DB_QUERY_LONG: 3600,          // 1 hour
  
  // WebGL/Three.js assets
  WEBGL_TEXTURES: 86400,        // 1 day
  WEBGL_MODELS: 604800,         // 1 week
  WEBGL_SHADERS: 86400          // 1 day
};

// Memory cache configuration
const MEMORY_CACHE_CONFIG = {
  max: 500,                      // Maximum number of items
  ttl: 1000 * 60 * 5,           // 5 minutes default TTL
  updateAgeOnGet: true,          // Reset TTL on access
  updateAgeOnHas: false,
  sizeCalculation: (value: any) => {
    // Estimate size in bytes
    return JSON.stringify(value).length;
  },
  maxSize: 50 * 1024 * 1024,    // 50MB max memory
  dispose: (value: any, key: string) => {
    console.log(`Cache evicted: ${key}`);
  }
};

/**
 * Multi-layer cache manager
 */
export class CacheManager {
  private redis: Redis | null = null;
  private memoryCache: LRUCache<string, any>;
  private connected: boolean = false;
  
  constructor() {
    this.memoryCache = new LRUCache(MEMORY_CACHE_CONFIG);
    this.initRedis();
  }
  
  /**
   * Initialize Redis connection
   */
  private async initRedis() {
    try {
      this.redis = new Redis(REDIS_CONFIG);
      
      this.redis.on('connect', () => {
        console.log('Redis connected');
        this.connected = true;
      });
      
      this.redis.on('error', (err) => {
        console.error('Redis error:', err);
        this.connected = false;
      });
      
      await this.redis.connect();
    } catch (error) {
      console.error('Failed to initialize Redis:', error);
      this.redis = null;
    }
  }
  
  /**
   * Get value from cache (checks memory first, then Redis)
   */
  async get<T = any>(key: string): Promise<T | null> {
    // 1. Check memory cache
    const memoryValue = this.memoryCache.get(key);
    if (memoryValue !== undefined) {
      return memoryValue;
    }
    
    // 2. Check Redis cache
    if (this.redis && this.connected) {
      try {
        const redisValue = await this.redis.get(key);
        if (redisValue) {
          const parsed = JSON.parse(redisValue);
          // Populate memory cache
          this.memoryCache.set(key, parsed);
          return parsed;
        }
      } catch (error) {
        console.error(`Redis get error for key ${key}:`, error);
      }
    }
    
    return null;
  }
  
  /**
   * Set value in cache (both memory and Redis)
   */
  async set<T = any>(key: string, value: T, ttl?: number): Promise<void> {
    // 1. Set in memory cache
    this.memoryCache.set(key, value, {
      ttl: ttl ? ttl * 1000 : undefined
    });
    
    // 2. Set in Redis cache
    if (this.redis && this.connected) {
      try {
        const serialized = JSON.stringify(value);
        if (ttl) {
          await this.redis.setex(key, ttl, serialized);
        } else {
          await this.redis.set(key, serialized);
        }
      } catch (error) {
        console.error(`Redis set error for key ${key}:`, error);
      }
    }
  }
  
  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    // 1. Delete from memory cache
    this.memoryCache.delete(key);
    
    // 2. Delete from Redis cache
    if (this.redis && this.connected) {
      try {
        await this.redis.del(key);
      } catch (error) {
        console.error(`Redis delete error for key ${key}:`, error);
      }
    }
  }
  
  /**
   * Clear all caches
   */
  async clear(): Promise<void> {
    // 1. Clear memory cache
    this.memoryCache.clear();
    
    // 2. Clear Redis cache
    if (this.redis && this.connected) {
      try {
        await this.redis.flushdb();
      } catch (error) {
        console.error('Redis flush error:', error);
      }
    }
  }
  
  /**
   * Cache wrapper for async functions
   */
  async cached<T = any>(
    key: string,
    fn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    
    // Execute function and cache result
    const result = await fn();
    await this.set(key, result, ttl);
    
    return result;
  }
  
  /**
   * Invalidate cache by pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    // Clear from memory cache
    for (const key of this.memoryCache.keys()) {
      if (key.match(pattern)) {
        this.memoryCache.delete(key);
      }
    }
    
    // Clear from Redis
    if (this.redis && this.connected) {
      try {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } catch (error) {
        console.error(`Redis pattern delete error for ${pattern}:`, error);
      }
    }
  }
  
  /**
   * Get cache statistics
   */
  getStats() {
    return {
      memory: {
        size: this.memoryCache.size,
        calculatedSize: this.memoryCache.calculatedSize,
        hits: (this.memoryCache as any).hits || 0,
        misses: (this.memoryCache as any).misses || 0
      },
      redis: {
        connected: this.connected
      }
    };
  }
}

/**
 * Cache key generators
 */
export const CacheKeys = {
  // API endpoints
  apiEndpoint: (path: string, params?: any) => 
    `api:${path}:${params ? JSON.stringify(params) : 'default'}`,
  
  // Database queries
  dbQuery: (query: string, params?: any[]) => 
    `db:${Buffer.from(query).toString('base64').substring(0, 20)}:${params ? JSON.stringify(params) : ''}`,
  
  // User-specific data
  userSession: (userId: string) => `user:session:${userId}`,
  userPreferences: (userId: string) => `user:prefs:${userId}`,
  
  // Computed results
  computedResult: (type: string, input: any) => 
    `computed:${type}:${JSON.stringify(input)}`,
  
  // WebGL assets
  webglAsset: (type: string, path: string) => 
    `webgl:${type}:${path}`
};

/**
 * Express middleware for caching
 */
export function cacheMiddleware(ttl: number = 60) {
  const cache = new CacheManager();
  
  return async (req: any, res: any, next: any) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    const key = CacheKeys.apiEndpoint(req.path, req.query);
    
    // Try to get from cache
    const cached = await cache.get(key);
    if (cached) {
      res.set('X-Cache', 'HIT');
      res.set('Cache-Control', `public, max-age=${ttl}`);
      return res.json(cached);
    }
    
    // Store original send
    const originalSend = res.json.bind(res);
    
    // Override json method to cache response
    res.json = async (body: any) => {
      // Cache the response
      await cache.set(key, body, ttl);
      
      // Set cache headers
      res.set('X-Cache', 'MISS');
      res.set('Cache-Control', `public, max-age=${ttl}`);
      
      // Send response
      return originalSend(body);
    };
    
    next();
  };
}

/**
 * Database query cache wrapper
 */
export async function cachedQuery<T = any>(
  cache: CacheManager,
  query: string,
  params: any[],
  executor: () => Promise<T>,
  ttl: number = TTL_CONFIG.DB_QUERY_MEDIUM
): Promise<T> {
  const key = CacheKeys.dbQuery(query, params);
  
  return cache.cached(key, executor, ttl);
}

/**
 * CDN cache headers generator
 */
export function getCDNCacheHeaders(type: string): Record<string, string> {
  const headers: Record<string, string> = {};
  
  switch (type) {
    case 'static':
      headers['Cache-Control'] = `public, max-age=${TTL_CONFIG.STATIC_ASSETS}, immutable`;
      headers['Vary'] = 'Accept-Encoding';
      break;
      
    case 'image':
      headers['Cache-Control'] = `public, max-age=${TTL_CONFIG.IMAGES}`;
      headers['Vary'] = 'Accept-Encoding, Accept';
      break;
      
    case 'api':
      headers['Cache-Control'] = `public, max-age=0, s-maxage=30, stale-while-revalidate=86400`;
      headers['Vary'] = 'Accept-Encoding, Authorization';
      break;
      
    case 'dynamic':
      headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      headers['Pragma'] = 'no-cache';
      headers['Expires'] = '0';
      break;
      
    default:
      headers['Cache-Control'] = 'public, max-age=300';
  }
  
  return headers;
}

/**
 * Service Worker cache configuration
 */
export const SERVICE_WORKER_CACHE_CONFIG = {
  version: 'v1',
  precache: [
    '/',
    '/assessment',
    '/workshop-notes',
    '/manifest.json',
    '/favicon.ico'
  ],
  runtimeCaching: [
    {
      urlPattern: /\\.(?:png|jpg|jpeg|svg|gif|webp)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: TTL_CONFIG.IMAGES
        }
      }
    },
    {
      urlPattern: /\\.(?:js|css)$/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-resources',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: TTL_CONFIG.STATIC_ASSETS
        }
      }
    },
    {
      urlPattern: /^\\/api\\//,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        networkTimeoutSeconds: 3,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: TTL_CONFIG.API_CONFIG
        }
      }
    },
    {
      urlPattern: /^\\/webgl\\//,
      handler: 'CacheFirst',
      options: {
        cacheName: 'webgl-assets',
        expiration: {
          maxEntries: 30,
          maxAgeSeconds: TTL_CONFIG.WEBGL_MODELS
        }
      }
    }
  ]
};

// Export singleton instance
export const cacheManager = new CacheManager();

export default {
  CacheManager,
  CacheKeys,
  TTL_CONFIG,
  cacheMiddleware,
  cachedQuery,
  getCDNCacheHeaders,
  SERVICE_WORKER_CACHE_CONFIG,
  cacheManager
};
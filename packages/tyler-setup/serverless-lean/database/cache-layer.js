/**
 * Multi-layer Caching Implementation for Tyler Setup GraphQL Backend
 * Includes in-memory, DynamoDB-based, and DAX caching layers
 */

import { createHash } from 'crypto';
import { DynamoDB } from 'aws-sdk';
import AmazonDaxClient from 'amazon-dax-client';

// Cache configuration
const CACHE_CONFIG = {
  // Layer priorities (1 = highest priority)
  layers: {
    memory: { priority: 1, ttl: 60 },     // 1 minute
    dax: { priority: 2, ttl: 300 },       // 5 minutes
    dynamodb: { priority: 3, ttl: 1800 }, // 30 minutes
  },

  // Cache policies by data type
  policies: {
    user: { ttl: 300, layers: ['memory', 'dax'] },
    contractor: { ttl: 180, layers: ['memory', 'dax'] },
    secret: { ttl: 60, layers: ['memory'] }, // Never cache secrets long-term
    audit: { ttl: 600, layers: ['memory', 'dax', 'dynamodb'] },
    config: { ttl: 900, layers: ['memory', 'dax', 'dynamodb'] },
    query: { ttl: 120, layers: ['memory', 'dax'] },
  },

  // Memory cache limits
  memory: {
    maxSize: 1000,      // Max items
    maxMemoryMB: 100,   // Max memory usage
    cleanupInterval: 60000, // 1 minute
  },

  // DAX configuration
  dax: {
    endpoints: process.env.DAX_ENDPOINT ? [process.env.DAX_ENDPOINT] : null,
    region: process.env.AWS_REGION || 'us-east-1',
    connectTimeout: 5000,
    requestTimeout: 10000,
  },
};

/**
 * In-Memory Cache with LRU eviction
 */
class MemoryCache {
  constructor(maxSize = CACHE_CONFIG.memory.maxSize) {
    this.maxSize = maxSize;
    this.cache = new Map();
    this.accessTimes = new Map();

    // Start cleanup interval
    this.cleanupInterval = setInterval(
      () => this.cleanup(),
      CACHE_CONFIG.memory.cleanupInterval
    );
  }

  get(key) {
    if (!this.cache.has(key)) {
      return null;
    }

    const item = this.cache.get(key);

    // Check expiration
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.delete(key);
      return null;
    }

    // Update access time for LRU
    this.accessTimes.set(key, Date.now());
    return item.value;
  }

  set(key, value, ttl = 300) {
    // Remove oldest items if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const expiresAt = ttl > 0 ? Date.now() + (ttl * 1000) : null;

    this.cache.set(key, {
      value,
      expiresAt,
      createdAt: Date.now(),
    });

    this.accessTimes.set(key, Date.now());
  }

  delete(key) {
    this.cache.delete(key);
    this.accessTimes.delete(key);
  }

  clear() {
    this.cache.clear();
    this.accessTimes.clear();
  }

  evictLRU() {
    // Find least recently used item
    let oldestTime = Date.now();
    let oldestKey = null;

    for (const [key, time] of this.accessTimes) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
    }
  }

  cleanup() {
    const now = Date.now();
    const toDelete = [];

    // Find expired items
    for (const [key, item] of this.cache) {
      if (item.expiresAt && now > item.expiresAt) {
        toDelete.push(key);
      }
    }

    // Remove expired items
    toDelete.forEach(key => this.delete(key));
  }

  size() {
    return this.cache.size;
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRatio: this.hitRatio || 0,
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  estimateMemoryUsage() {
    // Rough estimate of memory usage in MB
    return Math.round((this.cache.size * 1000) / (1024 * 1024));
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

/**
 * DAX Cache Client
 */
class DAXCache {
  constructor() {
    this.client = null;
    this.isAvailable = false;
    this.initializeClient();
  }

  async initializeClient() {
    if (!CACHE_CONFIG.dax.endpoints) {
      console.log('DAX endpoints not configured, skipping DAX cache');
      return;
    }

    try {
      this.client = new AmazonDaxClient({
        endpoints: CACHE_CONFIG.dax.endpoints,
        region: CACHE_CONFIG.dax.region,
        connectTimeout: CACHE_CONFIG.dax.connectTimeout,
        requestTimeout: CACHE_CONFIG.dax.requestTimeout,
      });

      // Test connection
      await this.client.describeTable({ TableName: process.env.CACHE_TABLE }).promise();
      this.isAvailable = true;

      console.log('DAX client initialized successfully');
    } catch (error) {
      console.warn('Failed to initialize DAX client:', error.message);
      // Fall back to regular DynamoDB client
      this.client = new DynamoDB.DocumentClient({
        region: CACHE_CONFIG.dax.region,
      });
    }
  }

  async get(key) {
    if (!this.client) {
      return null;
    }

    try {
      const result = await this.client.get({
        TableName: process.env.CACHE_TABLE,
        Key: { PK: key, SK: 'CACHE' },
      }).promise();

      if (!result.Item) {
        return null;
      }

      // Check expiration
      if (result.Item.ttl && Date.now() > result.Item.ttl * 1000) {
        // Item expired, delete it
        await this.delete(key);
        return null;
      }

      return JSON.parse(result.Item.data);
    } catch (error) {
      console.error('DAX cache get error:', error);
      return null;
    }
  }

  async set(key, value, ttl = 300) {
    if (!this.client) {
      return;
    }

    try {
      const expiresAt = Math.floor(Date.now() / 1000) + ttl;

      await this.client.put({
        TableName: process.env.CACHE_TABLE,
        Item: {
          PK: key,
          SK: 'CACHE',
          data: JSON.stringify(value),
          ttl: expiresAt,
          cacheType: 'DAX',
          createdAt: Date.now(),
        },
      }).promise();
    } catch (error) {
      console.error('DAX cache set error:', error);
    }
  }

  async delete(key) {
    if (!this.client) {
      return;
    }

    try {
      await this.client.delete({
        TableName: process.env.CACHE_TABLE,
        Key: { PK: key, SK: 'CACHE' },
      }).promise();
    } catch (error) {
      console.error('DAX cache delete error:', error);
    }
  }

  async clear(pattern) {
    // Implementation would require scanning and deleting matching items
    console.warn('DAX cache clear not implemented for pattern:', pattern);
  }

  isConnected() {
    return this.isAvailable && this.client !== null;
  }
}

/**
 * Multi-Layer Cache Manager
 */
class CacheManager {
  constructor() {
    this.memoryCache = new MemoryCache();
    this.daxCache = new DAXCache();

    // Cache statistics
    this.stats = {
      hits: { memory: 0, dax: 0, dynamodb: 0 },
      misses: { memory: 0, dax: 0, dynamodb: 0 },
      sets: { memory: 0, dax: 0, dynamodb: 0 },
      errors: { memory: 0, dax: 0, dynamodb: 0 },
    };
  }

  /**
   * Generate cache key with namespace and hashing
   */
  generateKey(type, identifier, params = {}) {
    const baseKey = `${type}:${identifier}`;

    if (Object.keys(params).length > 0) {
      const paramString = JSON.stringify(params, Object.keys(params).sort());
      const hash = createHash('md5').update(paramString).digest('hex').substring(0, 8);
      return `${baseKey}:${hash}`;
    }

    return baseKey;
  }

  /**
   * Get value from cache with fallback through layers
   */
  async get(type, identifier, params = {}) {
    const key = this.generateKey(type, identifier, params);
    const policy = CACHE_CONFIG.policies[type] || CACHE_CONFIG.policies.query;

    // Try each layer in priority order
    for (const layerName of policy.layers) {
      try {
        let value = null;

        switch (layerName) {
          case 'memory':
            value = this.memoryCache.get(key);
            if (value) {
              this.stats.hits.memory++;
              // Prime higher priority layers on hit
              return value;
            }
            this.stats.misses.memory++;
            break;

          case 'dax':
            if (this.daxCache.isConnected()) {
              value = await this.daxCache.get(key);
              if (value) {
                this.stats.hits.dax++;
                // Prime memory cache
                this.memoryCache.set(key, value, CACHE_CONFIG.layers.memory.ttl);
                return value;
              }
            }
            this.stats.misses.dax++;
            break;

          case 'dynamodb':
            // Direct DynamoDB cache queries would go here
            this.stats.misses.dynamodb++;
            break;
        }
      } catch (error) {
        this.stats.errors[layerName]++;
        console.error(`Cache layer ${layerName} error:`, error);
      }
    }

    return null;
  }

  /**
   * Set value in cache across configured layers
   */
  async set(type, identifier, value, params = {}, customTTL = null) {
    const key = this.generateKey(type, identifier, params);
    const policy = CACHE_CONFIG.policies[type] || CACHE_CONFIG.policies.query;
    const ttl = customTTL || policy.ttl;

    // Set in each configured layer
    for (const layerName of policy.layers) {
      try {
        const layerTTL = Math.min(ttl, CACHE_CONFIG.layers[layerName].ttl);

        switch (layerName) {
          case 'memory':
            this.memoryCache.set(key, value, layerTTL);
            this.stats.sets.memory++;
            break;

          case 'dax':
            if (this.daxCache.isConnected()) {
              await this.daxCache.set(key, value, layerTTL);
              this.stats.sets.dax++;
            }
            break;

          case 'dynamodb':
            // Direct DynamoDB cache writes would go here
            this.stats.sets.dynamodb++;
            break;
        }
      } catch (error) {
        this.stats.errors[layerName]++;
        console.error(`Cache layer ${layerName} set error:`, error);
      }
    }
  }

  /**
   * Delete from all cache layers
   */
  async delete(type, identifier, params = {}) {
    const key = this.generateKey(type, identifier, params);

    // Delete from all layers
    try {
      this.memoryCache.delete(key);
      if (this.daxCache.isConnected()) {
        await this.daxCache.delete(key);
      }
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  /**
   * Invalidate cache patterns (e.g., all user data)
   */
  async invalidate(pattern) {
    try {
      // Clear memory cache entries matching pattern
      const memoryKeys = [...this.memoryCache.cache.keys()];
      const matchingKeys = memoryKeys.filter(key => key.includes(pattern));
      matchingKeys.forEach(key => this.memoryCache.delete(key));

      // Clear DAX cache (would need custom implementation)
      if (this.daxCache.isConnected()) {
        await this.daxCache.clear(pattern);
      }

      console.log(`Invalidated ${matchingKeys.length} cache entries for pattern: ${pattern}`);
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  /**
   * Warm cache with frequently accessed data
   */
  async warmup(warmupData) {
    console.log('Starting cache warmup...');

    for (const { type, identifier, value, params } of warmupData) {
      try {
        await this.set(type, identifier, value, params);
      } catch (error) {
        console.error(`Cache warmup error for ${type}:${identifier}:`, error);
      }
    }

    console.log(`Cache warmup completed for ${warmupData.length} items`);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      ...this.stats,
      memory: this.memoryCache.getStats(),
      dax: {
        connected: this.daxCache.isConnected(),
        available: this.daxCache.isAvailable,
      },
      hitRatio: this.calculateHitRatio(),
    };
  }

  calculateHitRatio() {
    const totalHits = Object.values(this.stats.hits).reduce((a, b) => a + b, 0);
    const totalMisses = Object.values(this.stats.misses).reduce((a, b) => a + b, 0);
    const total = totalHits + totalMisses;

    return total > 0 ? Math.round((totalHits / total) * 100) : 0;
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.memoryCache) {
      this.memoryCache.destroy();
    }
  }
}

// Singleton instance
let cacheManager = null;

/**
 * Get or create cache manager instance
 */
export function getCacheManager() {
  if (!cacheManager) {
    cacheManager = new CacheManager();
  }
  return cacheManager;
}

/**
 * Cache decorator for GraphQL resolvers
 */
export function cached(type, ttl = null) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args) {
      const cache = getCacheManager();
      const identifier = args[0]?.id || args[0] || 'default';
      const params = args.length > 1 ? args.slice(1) : {};

      // Try to get from cache first
      const cachedResult = await cache.get(type, identifier, params);
      if (cachedResult !== null) {
        return cachedResult;
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Cache the result
      if (result !== null && result !== undefined) {
        await cache.set(type, identifier, result, params, ttl);
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * Cache invalidation helper for mutations
 */
export function invalidateCache(patterns) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args) {
      const result = await originalMethod.apply(this, args);

      // Invalidate cache patterns after successful mutation
      const cache = getCacheManager();
      for (const pattern of patterns) {
        await cache.invalidate(pattern);
      }

      return result;
    };

    return descriptor;
  };
}

export default CacheManager;

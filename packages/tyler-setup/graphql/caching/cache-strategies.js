// Caching Strategies for Tyler Setup Platform GraphQL API
// Multi-layer caching with Redis, in-memory, and CDN support

import Redis from 'redis';
import LRU from 'lru-cache';
import { createHash } from 'crypto';

/**
 * Multi-layer caching system
 */
export class TylerSetupCacheManager {
  constructor(options = {}) {
    this.options = {
      enableRedis: process.env.REDIS_URL ? true : false,
      enableInMemory: true,
      defaultTTL: 300, // 5 minutes
      maxInMemorySize: 100, // MB
      keyPrefix: 'tyler-setup',
      ...options,
    };

    this.layers = new Map();
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
    };

    this.initialize();
  }

  /**
   * Initialize cache layers
   */
  async initialize() {
    // Layer 1: In-memory LRU cache (fastest)
    if (this.options.enableInMemory) {
      const inMemoryCache = new LRU({
        maxSize: this.options.maxInMemorySize * 1024 * 1024, // Convert MB to bytes
        sizeCalculation: (value) => {
          return JSON.stringify(value).length;
        },
        ttl: this.options.defaultTTL * 1000, // Convert to milliseconds
      });

      this.layers.set('memory', {
        cache: inMemoryCache,
        priority: 1,
        get: (key) => inMemoryCache.get(key),
        set: (key, value, ttl) => inMemoryCache.set(key, value, { ttl: (ttl || this.options.defaultTTL) * 1000 }),
        delete: (key) => inMemoryCache.delete(key),
        clear: () => inMemoryCache.clear(),
        stats: () => ({
          size: inMemoryCache.size,
          calculatedSize: inMemoryCache.calculatedSize,
          keyCount: inMemoryCache.size,
        }),
      });
    }

    // Layer 2: Redis cache (shared across instances)
    if (this.options.enableRedis && process.env.REDIS_URL) {
      try {
        const redisClient = Redis.createClient({
          url: process.env.REDIS_URL,
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
        });

        await redisClient.connect();

        this.layers.set('redis', {
          cache: redisClient,
          priority: 2,
          get: async (key) => {
            const value = await redisClient.get(key);
            return value ? JSON.parse(value) : null;
          },
          set: async (key, value, ttl) => {
            await redisClient.setEx(key, ttl || this.options.defaultTTL, JSON.stringify(value));
          },
          delete: async (key) => {
            await redisClient.del(key);
          },
          clear: async () => {
            const keys = await redisClient.keys(`${this.options.keyPrefix}:*`);
            if (keys.length > 0) {
              await redisClient.del(keys);
            }
          },
          stats: async () => {
            const info = await redisClient.info('memory');
            return {
              memory: info,
              keyCount: await redisClient.dbSize(),
            };
          },
        });

        console.log('✅ Redis cache layer initialized');
      } catch (error) {
        console.warn('⚠️  Redis cache initialization failed:', error.message);
        this.options.enableRedis = false;
      }
    }
  }

  /**
   * Generate cache key with proper namespacing
   */
  generateKey(type, identifier, context = {}) {
    const keyParts = [this.options.keyPrefix, type];

    if (typeof identifier === 'string') {
      keyParts.push(identifier);
    } else {
      // Hash complex identifiers
      keyParts.push(createHash('md5').update(JSON.stringify(identifier)).digest('hex'));
    }

    // Add context-based suffixes
    if (context.userId) keyParts.push(`user:${context.userId}`);
    if (context.role) keyParts.push(`role:${context.role}`);
    if (context.version) keyParts.push(`v:${context.version}`);

    return keyParts.join(':');
  }

  /**
   * Get value from cache (checks all layers in priority order)
   */
  async get(key) {
    const sortedLayers = Array.from(this.layers.entries())
      .sort(([, a], [, b]) => a.priority - b.priority);

    for (const [layerName, layer] of sortedLayers) {
      try {
        const value = await layer.get(key);
        if (value !== null && value !== undefined) {
          this.metrics.hits++;

          // Populate higher priority layers with found value
          await this.populateHigherLayers(key, value, layerName, sortedLayers);

          return value;
        }
      } catch (error) {
        console.warn(`Cache get error in ${layerName}:`, error.message);
        this.metrics.errors++;
      }
    }

    this.metrics.misses++;
    return null;
  }

  /**
   * Set value in all cache layers
   */
  async set(key, value, ttl = null) {
    this.metrics.sets++;

    const promises = Array.from(this.layers.entries()).map(async ([layerName, layer]) => {
      try {
        await layer.set(key, value, ttl);
      } catch (error) {
        console.warn(`Cache set error in ${layerName}:`, error.message);
        this.metrics.errors++;
      }
    });

    await Promise.all(promises);
  }

  /**
   * Delete value from all cache layers
   */
  async delete(key) {
    this.metrics.deletes++;

    const promises = Array.from(this.layers.entries()).map(async ([layerName, layer]) => {
      try {
        await layer.delete(key);
      } catch (error) {
        console.warn(`Cache delete error in ${layerName}:`, error.message);
        this.metrics.errors++;
      }
    });

    await Promise.all(promises);
  }

  /**
   * Clear all caches
   */
  async clear() {
    const promises = Array.from(this.layers.entries()).map(async ([layerName, layer]) => {
      try {
        await layer.clear();
      } catch (error) {
        console.warn(`Cache clear error in ${layerName}:`, error.message);
        this.metrics.errors++;
      }
    });

    await Promise.all(promises);
  }

  /**
   * Populate higher priority layers when value is found in lower priority layer
   */
  async populateHigherLayers(key, value, foundLayerName, sortedLayers) {
    const foundIndex = sortedLayers.findIndex(([name]) => name === foundLayerName);

    const higherLayers = sortedLayers.slice(0, foundIndex);

    const promises = higherLayers.map(async ([layerName, layer]) => {
      try {
        await layer.set(key, value);
      } catch (error) {
        console.warn(`Cache populate error in ${layerName}:`, error.message);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    const layerStats = {};

    for (const [layerName, layer] of this.layers.entries()) {
      try {
        layerStats[layerName] = await layer.stats();
      } catch (error) {
        layerStats[layerName] = { error: error.message };
      }
    }

    return {
      metrics: { ...this.metrics },
      hitRate: this.metrics.hits / (this.metrics.hits + this.metrics.misses) || 0,
      layers: layerStats,
    };
  }

  /**
   * Health check for all cache layers
   */
  async healthCheck() {
    const health = {
      status: 'healthy',
      layers: {},
    };

    for (const [layerName, layer] of this.layers.entries()) {
      try {
        if (layerName === 'redis') {
          await layer.cache.ping();
        }
        health.layers[layerName] = { status: 'healthy' };
      } catch (error) {
        health.layers[layerName] = {
          status: 'unhealthy',
          error: error.message
        };
        health.status = 'degraded';
      }
    }

    return health;
  }
}

/**
 * Cache configuration for different data types
 */
export const cacheConfigs = {
  // User data - moderate TTL, invalidate on user updates
  user: {
    ttl: 900, // 15 minutes
    tags: ['user'],
    invalidateOn: ['user:updated', 'user:deleted'],
  },

  // Contractor data - shorter TTL due to temporary access
  contractor: {
    ttl: 300, // 5 minutes
    tags: ['contractor'],
    invalidateOn: ['contractor:updated', 'contractor:revoked'],
  },

  // Secret metadata - very short TTL for security
  secret: {
    ttl: 60, // 1 minute
    tags: ['secret'],
    invalidateOn: ['secret:rotated', 'secret:updated', 'secret:deleted'],
  },

  // Configuration - longer TTL, rarely changes
  config: {
    ttl: 3600, // 1 hour
    tags: ['config'],
    invalidateOn: ['config:updated'],
  },

  // Audit logs - can cache longer as they're immutable
  audit: {
    ttl: 1800, // 30 minutes
    tags: ['audit'],
    invalidateOn: [], // Audit logs don't change
  },

  // Analytics data - cache longer for performance
  analytics: {
    ttl: 1800, // 30 minutes
    tags: ['analytics'],
    invalidateOn: ['analytics:refresh'],
  },

  // WebSocket connections - very short TTL due to real-time nature
  websocket: {
    ttl: 30, // 30 seconds
    tags: ['websocket'],
    invalidateOn: ['websocket:connected', 'websocket:disconnected'],
  },
};

/**
 * Cache key patterns for different query types
 */
export const cacheKeyPatterns = {
  // Single entity queries
  singleEntity: (type, id, context = {}) => {
    return `${type}:${id}${context.userId ? `:user:${context.userId}` : ''}`;
  },

  // List queries with filters
  listQuery: (type, filters = {}, pagination = {}, context = {}) => {
    const filterHash = createHash('md5')
      .update(JSON.stringify({ filters, pagination }))
      .digest('hex');
    return `${type}:list:${filterHash}${context.userId ? `:user:${context.userId}` : ''}`;
  },

  // Aggregation queries
  aggregation: (type, aggregationType, filters = {}, context = {}) => {
    const filterHash = createHash('md5')
      .update(JSON.stringify(filters))
      .digest('hex');
    return `${type}:${aggregationType}:${filterHash}${context.userId ? `:user:${context.userId}` : ''}`;
  },

  // Permission-based queries
  permissionBased: (type, resource, userId, role) => {
    return `permissions:${type}:${resource}:${userId}:${role}`;
  },
};

/**
 * Caching directive implementation
 */
export function createCacheDirective(cacheManager) {
  return {
    typeDefs: `
      directive @cache(
        maxAge: Int!
        scopes: [String!]
        tags: [String!]
        varyBy: [String!]
      ) on FIELD_DEFINITION
    `,

    transformer: (schema) => {
      // This would be implemented as a schema transformer
      // that wraps resolvers with caching logic
      return schema;
    },

    // Resolver wrapper for caching
    wrapResolver: (resolver, directive) => {
      return async (parent, args, context, info) => {
        const { maxAge, scopes = [], tags = [], varyBy = [] } = directive;

        // Generate cache key based on directive parameters
        let cacheKey = cacheKeyPatterns.singleEntity(
          info.parentType.name,
          parent?.id || 'root',
          context
        );

        // Add vary parameters to key
        if (varyBy.length > 0) {
          const varyData = {};
          varyBy.forEach(field => {
            if (args[field] !== undefined) varyData[field] = args[field];
            if (context[field] !== undefined) varyData[field] = context[field];
          });
          const varyHash = createHash('md5').update(JSON.stringify(varyData)).digest('hex');
          cacheKey += `:vary:${varyHash}`;
        }

        // Check scope permissions
        if (scopes.length > 0) {
          const hasScope = scopes.some(scope =>
            context.user?.permissions?.includes(scope) ||
            context.user?.role === scope.toLowerCase()
          );
          if (!hasScope) {
            // Skip caching for unauthorized access
            return resolver(parent, args, context, info);
          }
        }

        // Try to get from cache
        const cached = await cacheManager.get(cacheKey);
        if (cached) {
          context.metrics?.increment('cache.hit', { resolver: info.fieldName });
          return cached;
        }

        // Execute resolver and cache result
        const result = await resolver(parent, args, context, info);

        if (result !== null && result !== undefined) {
          await cacheManager.set(cacheKey, result, maxAge);
          context.metrics?.increment('cache.miss', { resolver: info.fieldName });
        }

        return result;
      };
    },
  };
}

/**
 * Cache invalidation system
 */
export class CacheInvalidator {
  constructor(cacheManager) {
    this.cacheManager = cacheManager;
    this.subscriptions = new Map();
  }

  /**
   * Subscribe to invalidation events
   */
  subscribe(eventType, handler) {
    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, new Set());
    }
    this.subscriptions.get(eventType).add(handler);
  }

  /**
   * Emit invalidation event
   */
  async emit(eventType, data = {}) {
    const handlers = this.subscriptions.get(eventType) || new Set();

    const promises = Array.from(handlers).map(async (handler) => {
      try {
        await handler(data);
      } catch (error) {
        console.error(`Cache invalidation handler error for ${eventType}:`, error);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidateByPattern(pattern) {
    // In production, this would use Redis SCAN or similar pattern matching
    console.log(`Invalidating cache pattern: ${pattern}`);

    // For now, clear all caches - in production implement proper pattern matching
    await this.cacheManager.clear();
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags) {
    for (const tag of tags) {
      await this.invalidateByPattern(`*:${tag}:*`);
    }
  }

  /**
   * Setup automatic invalidation rules
   */
  setupAutoInvalidation() {
    // User data invalidation
    this.subscribe('user:updated', async ({ userId }) => {
      await this.invalidateByPattern(`user:${userId}:*`);
      await this.invalidateByPattern(`users:list:*`);
    });

    this.subscribe('user:deleted', async ({ userId }) => {
      await this.invalidateByPattern(`user:${userId}:*`);
      await this.invalidateByPattern(`users:list:*`);
    });

    // Contractor data invalidation
    this.subscribe('contractor:updated', async ({ contractorId }) => {
      await this.invalidateByPattern(`contractor:${contractorId}:*`);
      await this.invalidateByPattern(`contractors:list:*`);
    });

    // Secret data invalidation
    this.subscribe('secret:rotated', async ({ secretName }) => {
      await this.invalidateByPattern(`secret:${secretName}:*`);
      await this.invalidateByPattern(`secrets:*`);
    });

    // Analytics invalidation
    this.subscribe('analytics:refresh', async () => {
      await this.invalidateByTags(['analytics']);
    });
  }
}

/**
 * Performance optimization utilities
 */
export const performanceOptimizations = {
  /**
   * Batch multiple cache operations
   */
  batchCacheOperations: async (operations, cacheManager) => {
    const results = {};
    const promises = operations.map(async (op) => {
      try {
        if (op.type === 'get') {
          results[op.key] = await cacheManager.get(op.key);
        } else if (op.type === 'set') {
          await cacheManager.set(op.key, op.value, op.ttl);
        } else if (op.type === 'delete') {
          await cacheManager.delete(op.key);
        }
      } catch (error) {
        console.warn(`Batch cache operation error for ${op.key}:`, error);
      }
    });

    await Promise.all(promises);
    return results;
  },

  /**
   * Preload frequently accessed data
   */
  preloadCache: async (cacheManager, queries) => {
    const preloadPromises = queries.map(async ({ key, loader, ttl }) => {
      try {
        const existing = await cacheManager.get(key);
        if (!existing) {
          const data = await loader();
          await cacheManager.set(key, data, ttl);
        }
      } catch (error) {
        console.warn(`Cache preload error for ${key}:`, error);
      }
    });

    await Promise.all(preloadPromises);
  },

  /**
   * Cache warming strategy
   */
  warmCache: async (cacheManager) => {
    console.log('🔥 Warming cache with frequently accessed data...');

    const warmupQueries = [
      {
        key: 'config:system',
        loader: () => ({ maxUsers: 100, features: ['auth', 'audit'] }),
        ttl: 3600,
      },
      {
        key: 'analytics:summary',
        loader: () => ({ totalUsers: 50, activeContractors: 5 }),
        ttl: 900,
      },
    ];

    await performanceOptimizations.preloadCache(cacheManager, warmupQueries);
    console.log('✅ Cache warmed successfully');
  },
};

// Export singleton instance
export const cacheManager = new TylerSetupCacheManager();
export const cacheInvalidator = new CacheInvalidator(cacheManager);

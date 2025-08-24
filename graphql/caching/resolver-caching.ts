/**
 * Candlefish AI - Resolver-Level Redis Caching
 * Philosophy: Intelligent caching with automatic invalidation
 */

import { Redis } from 'ioredis';
import { LRUCache } from 'lru-cache';
import { createHash } from 'crypto';
import { performance } from 'perf_hooks';
import { GraphQLResolveInfo } from 'graphql';
import { graphqlSync, buildSchema } from 'graphql';

// Cache configuration interface
interface CacheConfig {
  ttl: number; // Time to live in seconds
  maxSize?: number; // Maximum cache size for local cache
  keyPrefix: string;
  compression?: boolean;
  tags?: string[]; // For cache invalidation
  staleWhileRevalidate?: number; // Seconds to serve stale data while revalidating
  varyBy?: string[]; // Fields to include in cache key
}

// Default cache configurations for different data types
const CACHE_CONFIGS = {
  user: {
    ttl: 300, // 5 minutes
    maxSize: 1000,
    keyPrefix: 'user',
    tags: ['users'],
    staleWhileRevalidate: 60,
    varyBy: ['id', 'role'],
  },
  documentation: {
    ttl: 900, // 15 minutes
    maxSize: 500,
    keyPrefix: 'docs',
    tags: ['documentation'],
    staleWhileRevalidate: 300,
    varyBy: ['id', 'slug', 'status'],
  },
  partner: {
    ttl: 1800, // 30 minutes
    maxSize: 200,
    keyPrefix: 'partner',
    tags: ['partners'],
    staleWhileRevalidate: 600,
    varyBy: ['id', 'slug', 'tier'],
  },
  analytics: {
    ttl: 300, // 5 minutes for analytics data
    maxSize: 100,
    keyPrefix: 'analytics',
    tags: ['analytics'],
    staleWhileRevalidate: 60,
    varyBy: ['userId', 'period', 'type'],
  },
  search: {
    ttl: 600, // 10 minutes for search results
    maxSize: 500,
    keyPrefix: 'search',
    tags: ['search'],
    staleWhileRevalidate: 120,
    varyBy: ['query', 'types', 'page'],
  },
} as const;

// Cache statistics interface
interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  invalidations: number;
  errors: number;
  totalRequests: number;
  averageLatency: number;
}

// Enhanced Redis cache manager
class AdvancedCacheManager {
  private redis: Redis;
  private localCaches: Map<string, LRUCache<string, any>>;
  private stats: Map<string, CacheStats>;
  private compressionThreshold = 1024; // Compress if data > 1KB

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      // Connection pool settings
      lazyConnect: true,
      keepAlive: 30000,
      // Compression and serialization
      compression: 'gzip',
    });

    this.localCaches = new Map();
    this.stats = new Map();

    // Initialize local caches for each config
    Object.entries(CACHE_CONFIGS).forEach(([key, config]) => {
      this.localCaches.set(key, new LRUCache({
        max: config.maxSize || 1000,
        ttl: config.ttl * 1000, // Convert to milliseconds
      }));

      this.stats.set(key, {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        invalidations: 0,
        errors: 0,
        totalRequests: 0,
        averageLatency: 0,
      });
    });
  }

  // Generate cache key based on resolver context
  private generateCacheKey(
    config: CacheConfig,
    args: any,
    context: any,
    info: GraphQLResolveInfo
  ): string {
    const keyParts = [config.keyPrefix];

    // Add fields specified in varyBy
    if (config.varyBy) {
      config.varyBy.forEach(field => {
        if (args[field] !== undefined) {
          keyParts.push(`${field}:${args[field]}`);
        }
      });
    }

    // Add user context if available
    if (context.user?.id) {
      keyParts.push(`user:${context.user.id}`);
    }

    // Add operation name and selected fields for more specific caching
    const operationName = info.operation.name?.value || 'anonymous';
    keyParts.push(`op:${operationName}`);

    // Hash the selected fields to include in cache key
    const selectedFields = this.getSelectedFields(info);
    if (selectedFields.length > 0) {
      const fieldsHash = createHash('md5').update(selectedFields.join(',')).digest('hex').substring(0, 8);
      keyParts.push(`fields:${fieldsHash}`);
    }

    return keyParts.join(':');
  }

  // Extract selected fields from GraphQL info
  private getSelectedFields(info: GraphQLResolveInfo): string[] {
    const fields: string[] = [];

    const extractFields = (selections: any[], prefix = '') => {
      selections.forEach(selection => {
        if (selection.kind === 'Field') {
          const fieldName = prefix ? `${prefix}.${selection.name.value}` : selection.name.value;
          fields.push(fieldName);

          if (selection.selectionSet) {
            extractFields(selection.selectionSet.selections, fieldName);
          }
        }
      });
    };

    extractFields(info.fieldNodes[0].selectionSet?.selections || []);
    return fields;
  }

  // Serialize data with optional compression
  private serialize(data: any, useCompression: boolean = false): string {
    const serialized = JSON.stringify(data);

    if (useCompression && serialized.length > this.compressionThreshold) {
      // In a real implementation, you'd use a compression library like zlib
      return `compressed:${serialized}`; // Placeholder for compression
    }

    return serialized;
  }

  // Deserialize data with decompression support
  private deserialize(data: string): any {
    if (data.startsWith('compressed:')) {
      // In a real implementation, you'd decompress here
      return JSON.parse(data.substring(11));
    }

    return JSON.parse(data);
  }

  // Get from cache with multi-layer strategy
  async get(
    configKey: keyof typeof CACHE_CONFIGS,
    args: any,
    context: any,
    info: GraphQLResolveInfo
  ): Promise<any | null> {
    const config = CACHE_CONFIGS[configKey];
    const cacheKey = this.generateCacheKey(config, args, context, info);
    const stats = this.stats.get(configKey)!;
    const startTime = performance.now();

    try {
      // Try local cache first (L1)
      const localCache = this.localCaches.get(configKey)!;
      const localResult = localCache.get(cacheKey);

      if (localResult !== undefined) {
        stats.hits++;
        stats.totalRequests++;
        const latency = performance.now() - startTime;
        stats.averageLatency = (stats.averageLatency * (stats.totalRequests - 1) + latency) / stats.totalRequests;

        // Check if data is stale but within revalidation window
        if (localResult._timestamp) {
          const age = Date.now() - localResult._timestamp;
          const maxAge = config.ttl * 1000;
          const staleAge = (config.staleWhileRevalidate || 0) * 1000;

          if (age > maxAge && age < maxAge + staleAge) {
            // Return stale data but trigger background refresh
            setImmediate(() => this.backgroundRefresh(configKey, cacheKey, args, context, info));
          }
        }

        return localResult.data;
      }

      // Try Redis cache (L2)
      const redisResult = await this.redis.get(cacheKey);
      if (redisResult) {
        const data = this.deserialize(redisResult);

        // Update local cache
        localCache.set(cacheKey, {
          data,
          _timestamp: Date.now(),
        });

        stats.hits++;
        stats.totalRequests++;
        const latency = performance.now() - startTime;
        stats.averageLatency = (stats.averageLatency * (stats.totalRequests - 1) + latency) / stats.totalRequests;

        return data;
      }

      // Cache miss
      stats.misses++;
      stats.totalRequests++;
      const latency = performance.now() - startTime;
      stats.averageLatency = (stats.averageLatency * (stats.totalRequests - 1) + latency) / stats.totalRequests;

      return null;
    } catch (error) {
      console.error(`Cache get error for key ${cacheKey}:`, error);
      stats.errors++;
      return null;
    }
  }

  // Set cache with multi-layer strategy
  async set(
    configKey: keyof typeof CACHE_CONFIGS,
    args: any,
    context: any,
    info: GraphQLResolveInfo,
    data: any
  ): Promise<void> {
    const config = CACHE_CONFIGS[configKey];
    const cacheKey = this.generateCacheKey(config, args, context, info);
    const stats = this.stats.get(configKey)!;

    try {
      // Set in local cache (L1)
      const localCache = this.localCaches.get(configKey)!;
      localCache.set(cacheKey, {
        data,
        _timestamp: Date.now(),
      });

      // Set in Redis cache (L2) with TTL
      const serialized = this.serialize(data, config.compression);
      await this.redis.setex(cacheKey, config.ttl, serialized);

      // Add to tag sets for invalidation
      if (config.tags) {
        const pipeline = this.redis.pipeline();
        config.tags.forEach(tag => {
          pipeline.sadd(`tag:${tag}`, cacheKey);
          pipeline.expire(`tag:${tag}`, config.ttl + 3600); // Keep tags longer
        });
        await pipeline.exec();
      }

      stats.sets++;
    } catch (error) {
      console.error(`Cache set error for key ${cacheKey}:`, error);
      stats.errors++;
    }
  }

  // Background refresh for stale-while-revalidate
  private async backgroundRefresh(
    configKey: keyof typeof CACHE_CONFIGS,
    cacheKey: string,
    args: any,
    context: any,
    info: GraphQLResolveInfo
  ): Promise<void> {
    try {
      // This would trigger the original resolver to refresh the data
      // In practice, you'd need to store the resolver function reference
      console.log(`Background refresh triggered for cache key: ${cacheKey}`);
    } catch (error) {
      console.error(`Background refresh error for key ${cacheKey}:`, error);
    }
  }

  // Invalidate cache by tags
  async invalidateByTags(tags: string[]): Promise<number> {
    let totalInvalidated = 0;

    try {
      for (const tag of tags) {
        // Get all cache keys for this tag
        const cacheKeys = await this.redis.smembers(`tag:${tag}`);

        if (cacheKeys.length > 0) {
          // Remove from Redis
          await this.redis.del(...cacheKeys);

          // Remove from local caches
          this.localCaches.forEach(localCache => {
            cacheKeys.forEach(key => localCache.delete(key));
          });

          // Remove the tag set
          await this.redis.del(`tag:${tag}`);

          totalInvalidated += cacheKeys.length;
        }
      }

      // Update stats
      Object.values(this.stats).forEach(stats => {
        stats.invalidations += totalInvalidated;
      });

      console.log(`Invalidated ${totalInvalidated} cache entries for tags: ${tags.join(', ')}`);
    } catch (error) {
      console.error(`Cache invalidation error for tags ${tags.join(', ')}:`, error);
    }

    return totalInvalidated;
  }

  // Invalidate specific cache key
  async invalidate(
    configKey: keyof typeof CACHE_CONFIGS,
    args: any,
    context: any,
    info: GraphQLResolveInfo
  ): Promise<void> {
    const config = CACHE_CONFIGS[configKey];
    const cacheKey = this.generateCacheKey(config, args, context, info);

    try {
      // Remove from Redis
      await this.redis.del(cacheKey);

      // Remove from local cache
      const localCache = this.localCaches.get(configKey)!;
      localCache.delete(cacheKey);

      const stats = this.stats.get(configKey)!;
      stats.deletes++;
    } catch (error) {
      console.error(`Cache invalidation error for key ${cacheKey}:`, error);
    }
  }

  // Get cache statistics
  getStats(): Record<string, CacheStats & { hitRate: number; errorRate: number }> {
    const result: Record<string, any> = {};

    this.stats.forEach((stats, key) => {
      const totalRequests = stats.totalRequests || 1;
      result[key] = {
        ...stats,
        hitRate: stats.hits / totalRequests,
        errorRate: stats.errors / totalRequests,
      };
    });

    return result;
  }

  // Clear all caches
  async clearAll(): Promise<void> {
    try {
      // Clear local caches
      this.localCaches.forEach(cache => cache.clear());

      // Clear Redis cache (be careful with this in production)
      const pattern = Object.values(CACHE_CONFIGS).map(config => `${config.keyPrefix}:*`).join(' ');

      // In production, you'd want to be more selective
      console.log(`Clearing caches with patterns: ${pattern}`);
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }
}

// Global cache manager instance
export const cacheManager = new AdvancedCacheManager();

// Caching decorator for resolvers
export function cached(
  configKey: keyof typeof CACHE_CONFIGS,
  options: Partial<CacheConfig> = {}
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (
      parent: any,
      args: any,
      context: any,
      info: GraphQLResolveInfo
    ) {
      // Check cache first
      const cachedResult = await cacheManager.get(configKey, args, context, info);
      if (cachedResult !== null) {
        return cachedResult;
      }

      // Execute original resolver
      const result = await originalMethod.call(this, parent, args, context, info);

      // Cache the result
      if (result !== null && result !== undefined) {
        await cacheManager.set(configKey, args, context, info, result);
      }

      return result;
    };

    return descriptor;
  };
}

// Cache warming utilities
export class CacheWarmer {
  static async warmUserCache(userIds: string[]): Promise<void> {
    console.log(`Warming user cache for ${userIds.length} users`);

    // Implementation would pre-populate cache with user data
    // This is useful for frequently accessed users
  }

  static async warmDocumentationCache(categories: string[]): Promise<void> {
    console.log(`Warming documentation cache for categories: ${categories.join(', ')}`);

    // Implementation would pre-populate cache with documentation data
  }

  static async warmPopularContent(): Promise<void> {
    console.log('Warming cache with popular content');

    // Implementation would identify and cache popular content
    // based on analytics data
  }
}

// Cache invalidation helpers
export class CacheInvalidator {
  static async onUserUpdate(userId: string): Promise<void> {
    await cacheManager.invalidateByTags(['users']);
    console.log(`Invalidated user cache for user: ${userId}`);
  }

  static async onDocumentationUpdate(docId: string): Promise<void> {
    await cacheManager.invalidateByTags(['documentation']);
    console.log(`Invalidated documentation cache for document: ${docId}`);
  }

  static async onPartnerUpdate(partnerId: string): Promise<void> {
    await cacheManager.invalidateByTags(['partners']);
    console.log(`Invalidated partner cache for partner: ${partnerId}`);
  }

  static async onSystemUpdate(): Promise<void> {
    await cacheManager.invalidateByTags(['analytics', 'search']);
    console.log('Invalidated system-wide caches');
  }
}

// Enhanced resolver factory with automatic caching
export function createCachedResolver<T>(
  configKey: keyof typeof CACHE_CONFIGS,
  resolverFn: (parent: any, args: any, context: any, info: GraphQLResolveInfo) => Promise<T>
) {
  return async (
    parent: any,
    args: any,
    context: any,
    info: GraphQLResolveInfo
  ): Promise<T> => {
    // Check cache first
    const cachedResult = await cacheManager.get(configKey, args, context, info);
    if (cachedResult !== null) {
      return cachedResult;
    }

    // Execute resolver
    const result = await resolverFn(parent, args, context, info);

    // Cache the result
    if (result !== null && result !== undefined) {
      await cacheManager.set(configKey, args, context, info, result);
    }

    return result;
  };
}

// Export all caching utilities
export default {
  cacheManager,
  cached,
  CacheWarmer,
  CacheInvalidator,
  createCachedResolver,
  CACHE_CONFIGS,
};

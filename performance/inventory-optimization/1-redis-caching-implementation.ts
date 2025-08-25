/**
 * Redis Caching Implementation for Inventory Management System
 * Optimized for sub-100ms API response times
 */

import Redis from 'ioredis';
import { createHash } from 'crypto';
import { performance } from 'perf_hooks';
import DataLoader from 'dataloader';
import { LRUCache } from 'lru-cache';

// Redis Cluster Configuration for High Availability
const redisCluster = new Redis.Cluster([
  { host: 'redis-node-1.candlefish.ai', port: 6379 },
  { host: 'redis-node-2.candlefish.ai', port: 6379 },
  { host: 'redis-node-3.candlefish.ai', port: 6379 }
], {
  redisOptions: {
    password: process.env.REDIS_PASSWORD,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 3,
    connectTimeout: 5000,
    commandTimeout: 2000,
    lazyConnect: true,
  },
  clusterRetryStrategy: (times) => Math.min(100 * times, 2000),
  enableReadyCheck: true,
  scaleReads: 'slave',
  natMap: {
    '10.0.1.1:6379': { host: 'redis-node-1.candlefish.ai', port: 6379 },
    '10.0.1.2:6379': { host: 'redis-node-2.candlefish.ai', port: 6379 },
    '10.0.1.3:6379': { host: 'redis-node-3.candlefish.ai', port: 6379 }
  }
});

// Local memory cache for ultra-fast lookups
const localCache = new LRUCache<string, any>({
  max: 10000, // Maximum items
  ttl: 60000, // 1 minute TTL
  updateAgeOnGet: true,
  updateAgeOnHas: true,
});

/**
 * Inventory-specific cache keys
 */
export const CacheKeys = {
  INVENTORY_ITEM: (id: string) => `inv:item:${id}`,
  INVENTORY_LIST: (params: string) => `inv:list:${params}`,
  ROOM_ITEMS: (roomId: string) => `inv:room:${roomId}`,
  CATEGORY_ITEMS: (category: string) => `inv:cat:${category}`,
  USER_INVENTORY: (userId: string) => `inv:user:${userId}`,
  SEARCH_RESULTS: (query: string) => `inv:search:${createHash('md5').update(query).digest('hex')}`,
  ANALYTICS_SUMMARY: 'inv:analytics:summary',
  BUNDLE_DATA: (bundleId: string) => `inv:bundle:${bundleId}`,
  HOT_ITEMS: 'inv:hot:items',
  RECENTLY_VIEWED: (userId: string) => `inv:recent:${userId}`,
};

/**
 * Cache TTL settings (in seconds)
 */
export const CacheTTL = {
  ITEM: 300,           // 5 minutes for individual items
  LIST: 60,            // 1 minute for lists
  SEARCH: 120,         // 2 minutes for search results
  ANALYTICS: 600,      // 10 minutes for analytics
  HOT_ITEMS: 30,       // 30 seconds for hot items
  USER_DATA: 180,      // 3 minutes for user-specific data
  STATIC_DATA: 3600,   // 1 hour for static data
};

/**
 * Enhanced Cache Manager for Inventory System
 */
export class InventoryCacheManager {
  private redis: Redis.Cluster;
  private localCache: LRUCache<string, any>;
  private metrics: Map<string, { hits: number; misses: number; latency: number[] }>;

  constructor() {
    this.redis = redisCluster;
    this.localCache = localCache;
    this.metrics = new Map();
    this.initializeWarmup();
  }

  /**
   * Multi-layer cache get with fallback
   */
  async get<T>(key: string, fetchFn?: () => Promise<T>, ttl: number = CacheTTL.ITEM): Promise<T | null> {
    const startTime = performance.now();

    // L1: Local memory cache
    const localValue = this.localCache.get(key);
    if (localValue !== undefined) {
      this.recordMetric(key, 'hit', performance.now() - startTime);
      return localValue;
    }

    // L2: Redis cache
    try {
      const redisValue = await this.redis.get(key);
      if (redisValue) {
        const parsed = JSON.parse(redisValue);
        this.localCache.set(key, parsed);
        this.recordMetric(key, 'hit', performance.now() - startTime);
        return parsed;
      }
    } catch (error) {
      console.error(`Redis get error for key ${key}:`, error);
    }

    // L3: Fetch from source if function provided
    if (fetchFn) {
      try {
        const freshData = await fetchFn();
        await this.set(key, freshData, ttl);
        this.recordMetric(key, 'miss', performance.now() - startTime);
        return freshData;
      } catch (error) {
        console.error(`Fetch error for key ${key}:`, error);
        return null;
      }
    }

    this.recordMetric(key, 'miss', performance.now() - startTime);
    return null;
  }

  /**
   * Set value in both cache layers with compression for large values
   */
  async set<T>(key: string, value: T, ttl: number = CacheTTL.ITEM): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);

      // Compress if value is large (> 10KB)
      const shouldCompress = serialized.length > 10240;
      const dataToStore = shouldCompress
        ? await this.compress(serialized)
        : serialized;

      // Store in Redis with TTL
      await this.redis.setex(
        shouldCompress ? `${key}:gz` : key,
        ttl,
        dataToStore
      );

      // Store in local cache
      this.localCache.set(key, value, { ttl: ttl * 1000 });

      return true;
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Batch get for multiple keys
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    const results: (T | null)[] = [];
    const missingKeys: { key: string; index: number }[] = [];

    // Check local cache first
    keys.forEach((key, index) => {
      const localValue = this.localCache.get(key);
      if (localValue !== undefined) {
        results[index] = localValue;
      } else {
        missingKeys.push({ key, index });
      }
    });

    // Fetch missing keys from Redis
    if (missingKeys.length > 0) {
      const redisKeys = missingKeys.map(mk => mk.key);
      const redisValues = await this.redis.mget(...redisKeys);

      missingKeys.forEach((mk, i) => {
        const value = redisValues[i];
        if (value) {
          const parsed = JSON.parse(value);
          results[mk.index] = parsed;
          this.localCache.set(mk.key, parsed);
        } else {
          results[mk.index] = null;
        }
      });
    }

    return results;
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidatePattern(pattern: string): Promise<number> {
    const stream = this.redis.scanStream({
      match: pattern,
      count: 100
    });

    let deletedCount = 0;
    const keysToDelete: string[] = [];

    stream.on('data', (keys: string[]) => {
      keysToDelete.push(...keys);
      keys.forEach(key => this.localCache.delete(key));
    });

    return new Promise((resolve, reject) => {
      stream.on('end', async () => {
        if (keysToDelete.length > 0) {
          deletedCount = await this.redis.del(...keysToDelete);
        }
        resolve(deletedCount);
      });

      stream.on('error', reject);
    });
  }

  /**
   * Invalidate specific tags
   */
  async invalidateTags(tags: string[]): Promise<void> {
    const promises = tags.map(tag => this.invalidatePattern(`*:tag:${tag}:*`));
    await Promise.all(promises);
  }

  /**
   * Warm up cache with frequently accessed data
   */
  private async initializeWarmup(): Promise<void> {
    // This would be called on startup to pre-populate cache
    console.log('Starting cache warmup...');

    // Example: Pre-load hot items, categories, etc.
    // await this.warmupHotItems();
    // await this.warmupCategories();

    console.log('Cache warmup complete');
  }

  /**
   * Compress data using gzip
   */
  private async compress(data: string): Promise<string> {
    const { gzip } = await import('zlib');
    const { promisify } = await import('util');
    const gzipAsync = promisify(gzip);
    const compressed = await gzipAsync(Buffer.from(data));
    return compressed.toString('base64');
  }

  /**
   * Record cache metrics
   */
  private recordMetric(key: string, type: 'hit' | 'miss', latency: number): void {
    const prefix = key.split(':')[0];
    if (!this.metrics.has(prefix)) {
      this.metrics.set(prefix, { hits: 0, misses: 0, latency: [] });
    }

    const metric = this.metrics.get(prefix)!;
    if (type === 'hit') {
      metric.hits++;
    } else {
      metric.misses++;
    }

    metric.latency.push(latency);
    if (metric.latency.length > 1000) {
      metric.latency = metric.latency.slice(-1000); // Keep last 1000 measurements
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): Record<string, any> {
    const stats: Record<string, any> = {};

    this.metrics.forEach((metric, prefix) => {
      const hitRate = metric.hits / (metric.hits + metric.misses) || 0;
      const avgLatency = metric.latency.reduce((a, b) => a + b, 0) / metric.latency.length || 0;
      const p95Latency = this.calculatePercentile(metric.latency, 95);

      stats[prefix] = {
        hitRate: Math.round(hitRate * 100),
        totalRequests: metric.hits + metric.misses,
        avgLatency: Math.round(avgLatency * 100) / 100,
        p95Latency: Math.round(p95Latency * 100) / 100,
      };
    });

    return {
      ...stats,
      localCacheSize: this.localCache.size,
      localCacheCapacity: this.localCache.max,
    };
  }

  /**
   * Calculate percentile
   */
  private calculatePercentile(arr: number[], percentile: number): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }
}

/**
 * DataLoader implementation for batching and caching
 */
export class InventoryDataLoaders {
  private itemLoader: DataLoader<string, any>;
  private roomItemsLoader: DataLoader<string, any[]>;
  private categoryItemsLoader: DataLoader<string, any[]>;
  private cacheManager: InventoryCacheManager;

  constructor(cacheManager: InventoryCacheManager) {
    this.cacheManager = cacheManager;

    // Item loader with batching
    this.itemLoader = new DataLoader(
      async (itemIds: readonly string[]) => {
        const cacheKeys = itemIds.map(id => CacheKeys.INVENTORY_ITEM(id));
        const cached = await this.cacheManager.mget<any>(cacheKeys);

        const missing: string[] = [];
        const results: any[] = [];

        cached.forEach((item, index) => {
          if (item) {
            results[index] = item;
          } else {
            missing.push(itemIds[index] as string);
            results[index] = null;
          }
        });

        // Fetch missing items from database
        if (missing.length > 0) {
          const freshItems = await this.fetchItemsFromDB(missing);

          // Update cache and results
          for (const item of freshItems) {
            const index = itemIds.indexOf(item.id);
            if (index !== -1) {
              results[index] = item;
              await this.cacheManager.set(
                CacheKeys.INVENTORY_ITEM(item.id),
                item,
                CacheTTL.ITEM
              );
            }
          }
        }

        return results;
      },
      {
        maxBatchSize: 100,
        cache: false, // We use our own caching
        batchScheduleFn: (callback) => setTimeout(callback, 10), // 10ms batching window
      }
    );

    // Room items loader
    this.roomItemsLoader = new DataLoader(
      async (roomIds: readonly string[]) => {
        return Promise.all(
          roomIds.map(roomId =>
            this.cacheManager.get(
              CacheKeys.ROOM_ITEMS(roomId as string),
              () => this.fetchRoomItemsFromDB(roomId as string),
              CacheTTL.LIST
            )
          )
        );
      },
      { maxBatchSize: 50 }
    );

    // Category items loader
    this.categoryItemsLoader = new DataLoader(
      async (categories: readonly string[]) => {
        return Promise.all(
          categories.map(category =>
            this.cacheManager.get(
              CacheKeys.CATEGORY_ITEMS(category as string),
              () => this.fetchCategoryItemsFromDB(category as string),
              CacheTTL.LIST
            )
          )
        );
      },
      { maxBatchSize: 50 }
    );
  }

  // DataLoader access methods
  async loadItem(itemId: string): Promise<any> {
    return this.itemLoader.load(itemId);
  }

  async loadItems(itemIds: string[]): Promise<any[]> {
    return this.itemLoader.loadMany(itemIds);
  }

  async loadRoomItems(roomId: string): Promise<any[]> {
    return this.roomItemsLoader.load(roomId);
  }

  async loadCategoryItems(category: string): Promise<any[]> {
    return this.categoryItemsLoader.load(category);
  }

  // Database fetch methods (placeholders)
  private async fetchItemsFromDB(itemIds: string[]): Promise<any[]> {
    // Implementation would connect to your database
    // This is a placeholder for the actual database query
    return [];
  }

  private async fetchRoomItemsFromDB(roomId: string): Promise<any[]> {
    // Implementation would connect to your database
    return [];
  }

  private async fetchCategoryItemsFromDB(category: string): Promise<any[]> {
    // Implementation would connect to your database
    return [];
  }

  // Clear specific caches
  async clearItemCache(itemId: string): Promise<void> {
    this.itemLoader.clear(itemId);
    await this.cacheManager.invalidatePattern(CacheKeys.INVENTORY_ITEM(itemId));
  }

  async clearRoomCache(roomId: string): Promise<void> {
    this.roomItemsLoader.clear(roomId);
    await this.cacheManager.invalidatePattern(CacheKeys.ROOM_ITEMS(roomId));
  }
}

// Export singleton instance
export const inventoryCacheManager = new InventoryCacheManager();
export const inventoryDataLoaders = new InventoryDataLoaders(inventoryCacheManager);

/**
 * Candlefish AI - Federated DataLoaders for N+1 Prevention
 * Philosophy: Efficient data loading with intelligent caching
 */

import DataLoader from 'dataloader';
import { Redis } from 'ioredis';
import { LRUCache } from 'lru-cache';
import { performance } from 'perf_hooks';

// Cache configuration
interface CacheConfig {
  ttl: number; // seconds
  maxSize: number;
  staleWhileRevalidate: number;
}

const DEFAULT_CACHE_CONFIG: CacheConfig = {
  ttl: 300, // 5 minutes
  maxSize: 1000,
  staleWhileRevalidate: 60, // 1 minute
};

// Abstract base class for cached data loaders
abstract class CachedDataLoader<K, V> {
  protected loader: DataLoader<K, V>;
  protected redis: Redis;
  protected localCache: LRUCache<string, { value: V; timestamp: number }>;
  protected config: CacheConfig;
  protected keyPrefix: string;

  constructor(keyPrefix: string, config: Partial<CacheConfig> = {}) {
    this.keyPrefix = keyPrefix;
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.redis = new Redis(process.env.REDIS_URL);

    this.localCache = new LRUCache({
      max: this.config.maxSize,
      ttl: this.config.ttl * 1000, // Convert to milliseconds
    });

    this.loader = new DataLoader<K, V>(
      this.batchLoad.bind(this),
      {
        cache: false, // We handle caching ourselves
        maxBatchSize: 100,
        batchScheduleFn: (callback) => setTimeout(callback, 10), // 10ms batching window
      }
    );
  }

  // Abstract method to be implemented by subclasses
  protected abstract batchLoad(keys: readonly K[]): Promise<V[]>;
  protected abstract serializeKey(key: K): string;
  protected abstract deserializeValue(value: string): V;
  protected abstract serializeValue(value: V): string;

  async load(key: K): Promise<V> {
    const serializedKey = this.serializeKey(key);
    const cacheKey = `${this.keyPrefix}:${serializedKey}`;

    // Try local cache first
    const localCached = this.localCache.get(cacheKey);
    if (localCached) {
      const age = Date.now() - localCached.timestamp;

      // If fresh, return immediately
      if (age < this.config.ttl * 1000) {
        return localCached.value;
      }

      // If stale but within revalidation window, return stale and refresh in background
      if (age < (this.config.ttl + this.config.staleWhileRevalidate) * 1000) {
        // Refresh in background
        setImmediate(() => this.refreshCache(key));
        return localCached.value;
      }
    }

    // Try Redis cache
    try {
      const redisCached = await this.redis.get(cacheKey);
      if (redisCached) {
        const value = this.deserializeValue(redisCached);

        // Update local cache
        this.localCache.set(cacheKey, {
          value,
          timestamp: Date.now(),
        });

        return value;
      }
    } catch (error) {
      console.warn(`Redis cache miss for ${cacheKey}:`, error.message);
    }

    // Load from data source
    const value = await this.loader.load(key);

    // Cache the result
    await this.cacheValue(cacheKey, value);

    return value;
  }

  async loadMany(keys: K[]): Promise<(V | Error)[]> {
    return Promise.all(keys.map(key => this.load(key)));
  }

  private async refreshCache(key: K): Promise<void> {
    try {
      const value = await this.loader.load(key);
      const serializedKey = this.serializeKey(key);
      const cacheKey = `${this.keyPrefix}:${serializedKey}`;
      await this.cacheValue(cacheKey, value);
    } catch (error) {
      console.warn(`Failed to refresh cache for ${this.serializeKey(key)}:`, error.message);
    }
  }

  private async cacheValue(cacheKey: string, value: V): Promise<void> {
    // Update local cache
    this.localCache.set(cacheKey, {
      value,
      timestamp: Date.now(),
    });

    // Update Redis cache
    try {
      await this.redis.setex(
        cacheKey,
        this.config.ttl,
        this.serializeValue(value)
      );
    } catch (error) {
      console.warn(`Failed to cache in Redis: ${cacheKey}`, error.message);
    }
  }

  // Clear cache for specific keys
  async clearCache(keys: K[]): Promise<void> {
    const promises = keys.map(async (key) => {
      const serializedKey = this.serializeKey(key);
      const cacheKey = `${this.keyPrefix}:${serializedKey}`;

      // Clear local cache
      this.localCache.delete(cacheKey);

      // Clear Redis cache
      try {
        await this.redis.del(cacheKey);
      } catch (error) {
        console.warn(`Failed to clear Redis cache: ${cacheKey}`, error.message);
      }

      // Clear DataLoader cache
      this.loader.clear(key);
    });

    await Promise.all(promises);
  }

  // Get cache statistics
  getCacheStats(): {
    localCacheSize: number;
    localCacheHitRate: number;
    loaderCacheSize: number;
  } {
    return {
      localCacheSize: this.localCache.size,
      localCacheHitRate: 0, // Would need to implement hit tracking
      loaderCacheSize: this.loader.cacheKeyFn ? 0 : 0, // DataLoader doesn't expose cache size
    };
  }
}

// User data loader
export class UserDataLoader extends CachedDataLoader<string, any> {
  constructor() {
    super('user', { ttl: 600, maxSize: 2000 }); // Users cached for 10 minutes
  }

  protected async batchLoad(userIds: readonly string[]): Promise<any[]> {
    const startTime = performance.now();

    try {
      // This would connect to your user database/service
      const users = await this.queryUsers(Array.from(userIds));

      // Create a map for O(1) lookups
      const userMap = new Map(users.map(user => [user.id, user]));

      // Return users in the same order as requested IDs
      const result = userIds.map(id => userMap.get(id) || new Error(`User not found: ${id}`));

      const duration = performance.now() - startTime;
      console.log(`Batch loaded ${userIds.length} users in ${duration.toFixed(2)}ms`);

      return result;
    } catch (error) {
      console.error('Failed to batch load users:', error);
      return userIds.map(() => error);
    }
  }

  protected serializeKey(key: string): string {
    return key;
  }

  protected deserializeValue(value: string): any {
    return JSON.parse(value);
  }

  protected serializeValue(value: any): string {
    return JSON.stringify(value);
  }

  private async queryUsers(userIds: string[]): Promise<any[]> {
    // Implementation would connect to your database
    // This is a placeholder
    return [];
  }

  // User-specific methods
  async loadByEmail(email: string): Promise<any> {
    const cacheKey = `user:email:${email.toLowerCase()}`;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return this.deserializeValue(cached);
      }
    } catch (error) {
      console.warn(`Redis error for email lookup: ${email}`, error.message);
    }

    // Query by email (would need separate implementation)
    const user = await this.queryUserByEmail(email);

    if (user) {
      // Cache both by ID and email
      await this.redis.setex(cacheKey, this.config.ttl, this.serializeValue(user));
      await this.cacheValue(`${this.keyPrefix}:${user.id}`, user);
    }

    return user;
  }

  private async queryUserByEmail(email: string): Promise<any> {
    // Implementation would query database by email
    return null;
  }
}

// Documentation data loader
export class DocumentationDataLoader extends CachedDataLoader<string, any> {
  constructor() {
    super('docs', { ttl: 900, maxSize: 1000 }); // Docs cached for 15 minutes
  }

  protected async batchLoad(docIds: readonly string[]): Promise<any[]> {
    const startTime = performance.now();

    try {
      const docs = await this.queryDocuments(Array.from(docIds));
      const docMap = new Map(docs.map(doc => [doc.id, doc]));

      const result = docIds.map(id => docMap.get(id) || new Error(`Document not found: ${id}`));

      const duration = performance.now() - startTime;
      console.log(`Batch loaded ${docIds.length} documents in ${duration.toFixed(2)}ms`);

      return result;
    } catch (error) {
      console.error('Failed to batch load documents:', error);
      return docIds.map(() => error);
    }
  }

  protected serializeKey(key: string): string {
    return key;
  }

  protected deserializeValue(value: string): any {
    return JSON.parse(value);
  }

  protected serializeValue(value: any): string {
    return JSON.stringify(value);
  }

  private async queryDocuments(docIds: string[]): Promise<any[]> {
    // Implementation would connect to your database
    return [];
  }

  // Documentation-specific methods
  async loadBySlug(slug: string): Promise<any> {
    const cacheKey = `docs:slug:${slug}`;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return this.deserializeValue(cached);
      }
    } catch (error) {
      console.warn(`Redis error for slug lookup: ${slug}`, error.message);
    }

    const doc = await this.queryDocumentBySlug(slug);

    if (doc) {
      await this.redis.setex(cacheKey, this.config.ttl, this.serializeValue(doc));
      await this.cacheValue(`${this.keyPrefix}:${doc.id}`, doc);
    }

    return doc;
  }

  private async queryDocumentBySlug(slug: string): Promise<any> {
    return null;
  }
}

// Partner data loader
export class PartnerDataLoader extends CachedDataLoader<string, any> {
  constructor() {
    super('partner', { ttl: 1800, maxSize: 500 }); // Partners cached for 30 minutes
  }

  protected async batchLoad(partnerIds: readonly string[]): Promise<any[]> {
    const startTime = performance.now();

    try {
      const partners = await this.queryPartners(Array.from(partnerIds));
      const partnerMap = new Map(partners.map(partner => [partner.id, partner]));

      const result = partnerIds.map(id => partnerMap.get(id) || new Error(`Partner not found: ${id}`));

      const duration = performance.now() - startTime;
      console.log(`Batch loaded ${partnerIds.length} partners in ${duration.toFixed(2)}ms`);

      return result;
    } catch (error) {
      console.error('Failed to batch load partners:', error);
      return partnerIds.map(() => error);
    }
  }

  protected serializeKey(key: string): string {
    return key;
  }

  protected deserializeValue(value: string): any {
    return JSON.parse(value);
  }

  protected serializeValue(value: any): string {
    return JSON.stringify(value);
  }

  private async queryPartners(partnerIds: string[]): Promise<any[]> {
    return [];
  }
}

// Relationship data loaders for complex associations
export class RelationshipDataLoaders {
  private redis: Redis;

  // User -> Projects relationship
  public userProjectsLoader: DataLoader<string, any[]>;

  // Partner -> Operators relationship
  public partnerOperatorsLoader: DataLoader<string, any[]>;

  // Project -> Queue Items relationship
  public projectQueueItemsLoader: DataLoader<string, any[]>;

  // Document -> Comments relationship
  public documentCommentsLoader: DataLoader<string, any[]>;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);

    this.userProjectsLoader = new DataLoader(async (userIds: readonly string[]) => {
      return this.loadUserProjects(Array.from(userIds));
    }, { maxBatchSize: 50 });

    this.partnerOperatorsLoader = new DataLoader(async (partnerIds: readonly string[]) => {
      return this.loadPartnerOperators(Array.from(partnerIds));
    }, { maxBatchSize: 50 });

    this.projectQueueItemsLoader = new DataLoader(async (projectIds: readonly string[]) => {
      return this.loadProjectQueueItems(Array.from(projectIds));
    }, { maxBatchSize: 30 });

    this.documentCommentsLoader = new DataLoader(async (documentIds: readonly string[]) => {
      return this.loadDocumentComments(Array.from(documentIds));
    }, { maxBatchSize: 50 });
  }

  private async loadUserProjects(userIds: string[]): Promise<any[][]> {
    const startTime = performance.now();

    // Try batch cache lookup first
    const cacheKeys = userIds.map(id => `user_projects:${id}`);
    const cached = await this.redis.mget(...cacheKeys);

    const results: any[][] = [];
    const uncachedIndices: number[] = [];

    cached.forEach((value, index) => {
      if (value) {
        results[index] = JSON.parse(value);
      } else {
        results[index] = [];
        uncachedIndices.push(index);
      }
    });

    // Query uncached relationships
    if (uncachedIndices.length > 0) {
      const uncachedUserIds = uncachedIndices.map(i => userIds[i]);
      const freshData = await this.queryUserProjects(uncachedUserIds);

      // Update results and cache
      const cacheOperations: Promise<any>[] = [];
      freshData.forEach((projects, i) => {
        const originalIndex = uncachedIndices[i];
        results[originalIndex] = projects;

        // Cache for 5 minutes
        cacheOperations.push(
          this.redis.setex(`user_projects:${userIds[originalIndex]}`, 300, JSON.stringify(projects))
        );
      });

      // Execute cache operations in parallel
      await Promise.allSettled(cacheOperations);
    }

    const duration = performance.now() - startTime;
    console.log(`Loaded user projects for ${userIds.length} users in ${duration.toFixed(2)}ms (${uncachedIndices.length} cache misses)`);

    return results;
  }

  private async loadPartnerOperators(partnerIds: string[]): Promise<any[][]> {
    // Similar implementation to loadUserProjects
    return partnerIds.map(() => []);
  }

  private async loadProjectQueueItems(projectIds: string[]): Promise<any[][]> {
    // Similar implementation to loadUserProjects
    return projectIds.map(() => []);
  }

  private async loadDocumentComments(documentIds: string[]): Promise<any[][]> {
    // Similar implementation to loadUserProjects
    return documentIds.map(() => []);
  }

  private async queryUserProjects(userIds: string[]): Promise<any[][]> {
    // Implementation would query database for user projects
    return userIds.map(() => []);
  }
}

// Performance monitoring for data loaders
export class DataLoaderMetrics {
  private metrics = new Map<string, {
    totalQueries: number;
    cacheHits: number;
    averageResponseTime: number;
    errorCount: number;
  }>();

  recordQuery(loaderName: string, responseTime: number, wasFromCache: boolean, hadError: boolean) {
    const current = this.metrics.get(loaderName) || {
      totalQueries: 0,
      cacheHits: 0,
      averageResponseTime: 0,
      errorCount: 0,
    };

    current.totalQueries++;
    if (wasFromCache) current.cacheHits++;
    if (hadError) current.errorCount++;

    // Update rolling average
    current.averageResponseTime = (
      (current.averageResponseTime * (current.totalQueries - 1)) + responseTime
    ) / current.totalQueries;

    this.metrics.set(loaderName, current);
  }

  getMetrics(): Record<string, any> {
    const result: Record<string, any> = {};

    this.metrics.forEach((metrics, loaderName) => {
      result[loaderName] = {
        ...metrics,
        cacheHitRate: metrics.totalQueries > 0 ? metrics.cacheHits / metrics.totalQueries : 0,
        errorRate: metrics.totalQueries > 0 ? metrics.errorCount / metrics.totalQueries : 0,
      };
    });

    return result;
  }

  reset() {
    this.metrics.clear();
  }
}

// Factory for creating data loaders with consistent configuration
export class DataLoaderFactory {
  private static instance: DataLoaderFactory;
  private metrics: DataLoaderMetrics;

  private constructor() {
    this.metrics = new DataLoaderMetrics();
  }

  static getInstance(): DataLoaderFactory {
    if (!DataLoaderFactory.instance) {
      DataLoaderFactory.instance = new DataLoaderFactory();
    }
    return DataLoaderFactory.instance;
  }

  createUserLoader(): UserDataLoader {
    return new UserDataLoader();
  }

  createDocumentationLoader(): DocumentationDataLoader {
    return new DocumentationDataLoader();
  }

  createPartnerLoader(): PartnerDataLoader {
    return new PartnerDataLoader();
  }

  createRelationshipLoaders(): RelationshipDataLoaders {
    return new RelationshipDataLoaders();
  }

  getMetrics(): Record<string, any> {
    return this.metrics.getMetrics();
  }
}

// Context factory for GraphQL requests
export function createDataLoadersContext() {
  const factory = DataLoaderFactory.getInstance();

  return {
    loaders: {
      user: factory.createUserLoader(),
      documentation: factory.createDocumentationLoader(),
      partner: factory.createPartnerLoader(),
      relationships: factory.createRelationshipLoaders(),
    },

    // Helper to clear all caches (useful for testing or after mutations)
    clearAllCaches: async () => {
      // Implementation would clear all loader caches
    },

    // Get performance metrics
    getMetrics: () => factory.getMetrics(),
  };
}

export default {
  UserDataLoader,
  DocumentationDataLoader,
  PartnerDataLoader,
  RelationshipDataLoaders,
  DataLoaderMetrics,
  DataLoaderFactory,
  createDataLoadersContext,
};

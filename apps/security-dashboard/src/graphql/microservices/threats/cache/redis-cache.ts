import Redis from 'ioredis';
import { ThreatIntelligence, IOC, ThreatActor, ThreatCampaign } from '../../../generated/graphql';

// Redis cache configuration for threat intelligence
export class ThreatIntelligenceCache {
  private redis: Redis;
  private keyPrefix = 'threat:';
  private defaultTTL = 3600; // 1 hour default
  
  // TTL configurations for different entity types
  private ttlConfig = {
    threat: 3600,        // 1 hour
    ioc: 1800,          // 30 minutes
    actor: 7200,        // 2 hours
    campaign: 7200,     // 2 hours
    feed: 300,          // 5 minutes
    enrichment: 86400,  // 24 hours
    analytics: 900,     // 15 minutes
    search: 300,        // 5 minutes
    correlation: 600,   // 10 minutes
    attribution: 3600,  // 1 hour
  };
  
  constructor(redisConfig?: any) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      keyPrefix: this.keyPrefix,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      ...redisConfig,
    });
    
    this.redis.on('error', (error) => {
      console.error('Redis cache error:', error);
    });
    
    this.redis.on('connect', () => {
      console.log('Threat intelligence cache connected to Redis');
    });
  }
  
  // Generic cache operations
  private createKey(type: string, id: string | string[], suffix?: string): string {
    const baseKey = Array.isArray(id) ? `${type}:${id.join(',')}` : `${type}:${id}`;
    return suffix ? `${baseKey}:${suffix}` : baseKey;
  }
  
  async get<T>(type: string, id: string, suffix?: string): Promise<T | null> {
    try {
      const key = this.createKey(type, id, suffix);
      const cached = await this.redis.get(key);
      
      if (cached) {
        return JSON.parse(cached);
      }
      
      return null;
    } catch (error) {
      console.error(`Cache get error for ${type}:${id}:`, error);
      return null;
    }
  }
  
  async set<T>(
    type: string,
    id: string,
    data: T,
    suffix?: string,
    customTTL?: number
  ): Promise<boolean> {
    try {
      const key = this.createKey(type, id, suffix);
      const ttl = customTTL || this.ttlConfig[type] || this.defaultTTL;
      
      await this.redis.setex(key, ttl, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error(`Cache set error for ${type}:${id}:`, error);
      return false;
    }
  }
  
  async mget<T>(type: string, ids: string[]): Promise<(T | null)[]> {
    try {
      if (ids.length === 0) return [];
      
      const keys = ids.map(id => this.createKey(type, id));
      const cached = await this.redis.mget(...keys);
      
      return cached.map(item => item ? JSON.parse(item) : null);
    } catch (error) {
      console.error(`Cache mget error for ${type}:`, error);
      return ids.map(() => null);
    }
  }
  
  async mset<T>(type: string, items: Array<{ id: string; data: T }>, customTTL?: number): Promise<boolean> {
    try {
      if (items.length === 0) return true;
      
      const pipeline = this.redis.pipeline();
      const ttl = customTTL || this.ttlConfig[type] || this.defaultTTL;
      
      items.forEach(({ id, data }) => {
        const key = this.createKey(type, id);
        pipeline.setex(key, ttl, JSON.stringify(data));
      });
      
      await pipeline.exec();
      return true;
    } catch (error) {
      console.error(`Cache mset error for ${type}:`, error);
      return false;
    }
  }
  
  async delete(type: string, id: string | string[], suffix?: string): Promise<boolean> {
    try {
      const key = this.createKey(type, id, suffix);
      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error(`Cache delete error for ${type}:`, error);
      return false;
    }
  }
  
  async deletePattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        return await this.redis.del(...keys);
      }
      return 0;
    } catch (error) {
      console.error(`Cache delete pattern error for ${pattern}:`, error);
      return 0;
    }
  }
  
  // Entity-specific cache methods
  
  // Threat Intelligence caching
  async getThreatIntelligence(id: string): Promise<ThreatIntelligence | null> {
    return this.get<ThreatIntelligence>('threat', id);
  }
  
  async setThreatIntelligence(id: string, threat: ThreatIntelligence): Promise<boolean> {
    return this.set('threat', id, threat);
  }
  
  async getThreatIntelligenceList(ids: string[]): Promise<(ThreatIntelligence | null)[]> {
    return this.mget<ThreatIntelligence>('threat', ids);
  }
  
  async setThreatIntelligenceList(threats: Array<{ id: string; data: ThreatIntelligence }>): Promise<boolean> {
    return this.mset('threat', threats);
  }
  
  // IOC caching
  async getIOC(id: string): Promise<IOC | null> {
    return this.get<IOC>('ioc', id);
  }
  
  async setIOC(id: string, ioc: IOC): Promise<boolean> {
    return this.set('ioc', id, ioc);
  }
  
  async getIOCList(ids: string[]): Promise<(IOC | null)[]> {
    return this.mget<IOC>('ioc', ids);
  }
  
  // IOC enrichment caching (longer TTL)
  async getIOCEnrichment(id: string): Promise<any | null> {
    return this.get('enrichment', id, 'ioc');
  }
  
  async setIOCEnrichment(id: string, enrichment: any): Promise<boolean> {
    return this.set('enrichment', id, enrichment, 'ioc');
  }
  
  // Threat Actor caching
  async getThreatActor(id: string): Promise<ThreatActor | null> {
    return this.get<ThreatActor>('actor', id);
  }
  
  async setThreatActor(id: string, actor: ThreatActor): Promise<boolean> {
    return this.set('actor', id, actor);
  }
  
  // Campaign caching
  async getThreatCampaign(id: string): Promise<ThreatCampaign | null> {
    return this.get<ThreatCampaign>('campaign', id);
  }
  
  async setCampaign(id: string, campaign: ThreatCampaign): Promise<boolean> {
    return this.set('campaign', id, campaign);
  }
  
  // Relationship caching
  async getRelationships(entityType: string, entityId: string, relationType: string): Promise<string[] | null> {
    return this.get<string[]>('rel', `${entityType}:${entityId}`, relationType);
  }
  
  async setRelationships(
    entityType: string,
    entityId: string,
    relationType: string,
    relationshipIds: string[]
  ): Promise<boolean> {
    return this.set('rel', `${entityType}:${entityId}`, relationshipIds, relationType, 1800); // 30 min TTL
  }
  
  // Analytics caching
  async getAnalytics(organizationId: string, analyticsType: string, timeRange: string): Promise<any | null> {
    const cacheKey = `${organizationId}:${analyticsType}:${timeRange}`;
    return this.get('analytics', cacheKey);
  }
  
  async setAnalytics(
    organizationId: string,
    analyticsType: string,
    timeRange: string,
    analytics: any
  ): Promise<boolean> {
    const cacheKey = `${organizationId}:${analyticsType}:${timeRange}`;
    return this.set('analytics', cacheKey, analytics);
  }
  
  // Search results caching
  async getSearchResults(query: string, filters: any, sort: any): Promise<any | null> {
    const searchHash = this.createSearchHash(query, filters, sort);
    return this.get('search', searchHash);
  }
  
  async setSearchResults(
    query: string,
    filters: any,
    sort: any,
    results: any
  ): Promise<boolean> {
    const searchHash = this.createSearchHash(query, filters, sort);
    return this.set('search', searchHash, results);
  }
  
  private createSearchHash(query: string, filters: any, sort: any): string {
    const searchObject = { query, filters, sort };
    const searchString = JSON.stringify(searchObject);
    
    // Create a simple hash from the search string
    let hash = 0;
    for (let i = 0; i < searchString.length; i++) {
      const char = searchString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }
  
  // Feed status caching
  async getFeedStatus(feedId: string): Promise<any | null> {
    return this.get('feed', feedId, 'status');
  }
  
  async setFeedStatus(feedId: string, status: any): Promise<boolean> {
    return this.set('feed', feedId, status, 'status');
  }
  
  // Attribution caching
  async getAttribution(threatId: string): Promise<any | null> {
    return this.get('attribution', threatId);
  }
  
  async setAttribution(threatId: string, attribution: any): Promise<boolean> {
    return this.set('attribution', threatId, attribution);
  }
  
  // Correlation results caching
  async getCorrelationResults(correlationId: string): Promise<any[] | null> {
    return this.get<any[]>('correlation', correlationId, 'results');
  }
  
  async setCorrelationResults(correlationId: string, results: any[]): Promise<boolean> {
    return this.set('correlation', correlationId, results, 'results');
  }
  
  // Cache warming methods
  async warmupThreatCache(organizationId: string): Promise<void> {
    try {
      // This would typically fetch and cache the most frequently accessed threats
      console.log(`Warming up threat cache for organization ${organizationId}`);
      
      // Implementation would depend on usage patterns and data source
      // For example, cache the most recent 100 threats, top IOCs, etc.
      
    } catch (error) {
      console.error('Error warming up threat cache:', error);
    }
  }
  
  // Cache invalidation methods
  async invalidateThreatCache(threatId: string): Promise<void> {
    try {
      await this.delete('threat', threatId);
      
      // Also invalidate related caches
      await this.deletePattern(`*rel*threat:${threatId}*`);
      await this.deletePattern(`*analytics*`);
      await this.deletePattern(`*search*`);
      
    } catch (error) {
      console.error(`Error invalidating threat cache for ${threatId}:`, error);
    }
  }
  
  async invalidateIOCCache(iocId: string): Promise<void> {
    try {
      await this.delete('ioc', iocId);
      await this.delete('enrichment', iocId, 'ioc');
      
      // Invalidate related caches
      await this.deletePattern(`*rel*ioc:${iocId}*`);
      
    } catch (error) {
      console.error(`Error invalidating IOC cache for ${iocId}:`, error);
    }
  }
  
  async invalidateOrganizationCache(organizationId: string): Promise<void> {
    try {
      // Invalidate all organization-specific caches
      await this.deletePattern(`*analytics*${organizationId}*`);
      await this.deletePattern(`*search*`);
      await this.deletePattern(`*dashboard*${organizationId}*`);
      
    } catch (error) {
      console.error(`Error invalidating organization cache for ${organizationId}:`, error);
    }
  }
  
  // Cache statistics and monitoring
  async getCacheStats(): Promise<{
    connections: number;
    memoryUsage: string;
    keyCount: number;
    hitRate?: number;
  }> {
    try {
      const info = await this.redis.info('memory');
      const keyCount = await this.redis.dbsize();
      
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1].trim() : 'unknown';
      
      return {
        connections: 1, // This would be tracked differently in a cluster
        memoryUsage,
        keyCount,
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        connections: 0,
        memoryUsage: 'error',
        keyCount: 0,
      };
    }
  }
  
  // Cache health check
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Cache health check failed:', error);
      return false;
    }
  }
  
  // Cleanup methods
  async cleanup(): Promise<void> {
    try {
      await this.redis.quit();
    } catch (error) {
      console.error('Error during cache cleanup:', error);
    }
  }
  
  // Batch operations for performance
  async batchGet<T>(operations: Array<{ type: string; id: string; suffix?: string }>): Promise<(T | null)[]> {
    try {
      const keys = operations.map(op => this.createKey(op.type, op.id, op.suffix));
      const results = await this.redis.mget(...keys);
      
      return results.map(result => result ? JSON.parse(result) : null);
    } catch (error) {
      console.error('Batch get error:', error);
      return operations.map(() => null);
    }
  }
  
  async batchSet<T>(operations: Array<{
    type: string;
    id: string;
    data: T;
    suffix?: string;
    ttl?: number;
  }>): Promise<boolean> {
    try {
      const pipeline = this.redis.pipeline();
      
      operations.forEach(op => {
        const key = this.createKey(op.type, op.id, op.suffix);
        const ttl = op.ttl || this.ttlConfig[op.type] || this.defaultTTL;
        pipeline.setex(key, ttl, JSON.stringify(op.data));
      });
      
      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Batch set error:', error);
      return false;
    }
  }
}

// Singleton instance
let cacheInstance: ThreatIntelligenceCache | null = null;

export const getThreatCache = (): ThreatIntelligenceCache => {
  if (!cacheInstance) {
    cacheInstance = new ThreatIntelligenceCache();
  }
  return cacheInstance;
};

// Cache middleware for resolvers
export const withCache = <T>(
  cacheKey: (args: any) => string,
  ttl: number = 3600
) => {
  return (resolver: (parent: any, args: any, context: any, info: any) => Promise<T>) => {
    return async (parent: any, args: any, context: any, info: any): Promise<T> => {
      const cache = getThreatCache();
      const key = cacheKey(args);
      
      // Try to get from cache first
      const cached = await cache.get<T>('custom', key);
      if (cached) {
        return cached;
      }
      
      // Execute resolver
      const result = await resolver(parent, args, context, info);
      
      // Cache the result
      if (result) {
        await cache.set('custom', key, result, undefined, ttl);
      }
      
      return result;
    };
  };
};

// Cache tags for organized invalidation
export class CacheTagManager {
  private cache: ThreatIntelligenceCache;
  
  constructor(cache: ThreatIntelligenceCache) {
    this.cache = cache;
  }
  
  async tagCacheEntry(key: string, tags: string[]): Promise<void> {
    const pipeline = this.cache['redis'].pipeline();
    
    tags.forEach(tag => {
      pipeline.sadd(`tag:${tag}`, key);
      pipeline.expire(`tag:${tag}`, 86400); // 24 hours
    });
    
    await pipeline.exec();
  }
  
  async invalidateByTag(tag: string): Promise<number> {
    try {
      const keys = await this.cache['redis'].smembers(`tag:${tag}`);
      
      if (keys.length > 0) {
        const pipeline = this.cache['redis'].pipeline();
        
        // Delete all keys with this tag
        keys.forEach(key => pipeline.del(key));
        
        // Remove the tag set
        pipeline.del(`tag:${tag}`);
        
        await pipeline.exec();
        return keys.length;
      }
      
      return 0;
    } catch (error) {
      console.error(`Error invalidating cache by tag ${tag}:`, error);
      return 0;
    }
  }
}

export const getCacheTagManager = (): CacheTagManager => {
  return new CacheTagManager(getThreatCache());
};

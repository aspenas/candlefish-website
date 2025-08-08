/**
 * API Cache Service
 * Caches external API responses with smart invalidation
 */

import { getRedisPool } from './redis-client';
import { logger } from '@/lib/logging/simple-logger';
import crypto from 'crypto';

export interface ApiCacheOptions {
  service: 'salesforce' | 'companycam' | 'external';
  endpoint: string;
  params?: Record<string, any>;
  headers?: Record<string, string>;
}

export interface CachedResponse<T = any> {
  data: T;
  timestamp: number;
  etag?: string;
  headers?: Record<string, string>;
  ttl?: number;
}

export interface CacheConfig {
  defaultTTL: number;
  maxSize: number;
  compressionThreshold: number;
}

const DEFAULT_TTL_BY_SERVICE: Record<string, number> = {
  salesforce: 300,      // 5 minutes for Salesforce data
  companycam: 600,      // 10 minutes for Company Cam photos
  external: 60,         // 1 minute for external APIs
};

class ApiCache {
  private pool = getRedisPool();
  private config: CacheConfig;
  private hitCount = 0;
  private missCount = 0;
  private prefix = 'api:';

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      defaultTTL: config?.defaultTTL || 300,
      maxSize: config?.maxSize || 10 * 1024 * 1024, // 10MB
      compressionThreshold: config?.compressionThreshold || 1024, // 1KB
    };
  }

  /**
   * Generate cache key from API request
   */
  private generateKey(options: ApiCacheOptions): string {
    const normalized = {
      s: options.service,
      e: options.endpoint,
      p: options.params || {},
      h: this.normalizeHeaders(options.headers),
    };

    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(normalized))
      .digest('hex')
      .substring(0, 16);

    return `${this.prefix}${options.service}:${hash}`;
  }

  /**
   * Normalize headers for consistent caching
   */
  private normalizeHeaders(headers?: Record<string, string>): Record<string, string> {
    if (!headers) return {};

    const normalized: Record<string, string> = {};
    const relevantHeaders = ['authorization', 'api-key', 'x-api-version'];

    for (const header of relevantHeaders) {
      const value = headers[header] || headers[header.toLowerCase()];
      if (value) {
        // Hash sensitive values
        if (header.toLowerCase() === 'authorization') {
          normalized[header] = crypto
            .createHash('sha256')
            .update(value)
            .digest('hex')
            .substring(0, 8);
        } else {
          normalized[header] = value;
        }
      }
    }

    return normalized;
  }

  /**
   * Get cached API response
   */
  async get<T = any>(options: ApiCacheOptions): Promise<CachedResponse<T> | null> {
    const key = this.generateKey(options);
    const startTime = Date.now();

    try {
      const result = await this.pool.execute(async (client) => {
        const data = await client.get(key);
        if (!data) return null;

        return JSON.parse(data) as CachedResponse<T>;
      });

      if (result) {
        this.hitCount++;

        const age = Date.now() - result.timestamp;
        logger.debug('API cache hit', {
          service: options.service,
          endpoint: options.endpoint,
          age,
          key,
        });

        // Check if stale-while-revalidate is applicable
        if (result.ttl && age > result.ttl * 1000) {
          // Return stale data but trigger background refresh
          this.refreshInBackground(options);
        }

        return result;
      }

      this.missCount++;
      return null;
    } catch (error) {
      logger.error('Failed to get API response from cache', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      this.missCount++;
      return null;
    } finally {
      const duration = Date.now() - startTime;
      if (duration > 100) {
        logger.warn('Slow cache lookup', { key, duration });
      }
    }
  }

  /**
   * Set API response in cache
   */
  async set<T = any>(
    options: ApiCacheOptions,
    response: T,
    ttl?: number,
    etag?: string
  ): Promise<void> {
    const key = this.generateKey(options);
    const ttlSeconds = ttl || DEFAULT_TTL_BY_SERVICE[options.service] || this.config.defaultTTL;

    const cacheData: CachedResponse<T> = {
      data: response,
      timestamp: Date.now(),
      etag,
      ttl: ttlSeconds,
    };

    const serialized = JSON.stringify(cacheData);

    // Check size limit
    if (serialized.length > this.config.maxSize) {
      logger.warn('API response too large to cache', {
        service: options.service,
        endpoint: options.endpoint,
        size: serialized.length,
      });
      return;
    }

    try {
      await this.pool.execute(async (client) => {
        // Store with TTL
        await client.setex(key, ttlSeconds, serialized);

        // Track by service for bulk invalidation
        await client.sadd(`${this.prefix}keys:${options.service}`, key);
        await client.expire(`${this.prefix}keys:${options.service}`, 86400); // 24 hours
      });

      logger.debug('API response cached', {
        service: options.service,
        endpoint: options.endpoint,
        ttl: ttlSeconds,
        size: serialized.length,
        key,
      });
    } catch (error) {
      logger.error('Failed to cache API response', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Check if response is still valid using ETag
   */
  async validateETag(options: ApiCacheOptions, etag: string): Promise<boolean> {
    const cached = await this.get(options);
    return cached?.etag === etag;
  }

  /**
   * Invalidate cached responses by service
   */
  async invalidateByService(service: string): Promise<void> {
    try {
      await this.pool.execute(async (client) => {
        const keys = await client.smembers(`${this.prefix}keys:${service}`);

        if (keys.length > 0) {
          await client.del(...keys);
          await client.del(`${this.prefix}keys:${service}`);

          logger.info('Invalidated API cache by service', {
            service,
            count: keys.length,
          });
        }
      });
    } catch (error) {
      logger.error('Failed to invalidate API cache', {
        service,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Invalidate specific endpoints
   */
  async invalidateEndpoint(service: string, endpoint: string): Promise<void> {
    try {
      await this.pool.execute(async (client) => {
        const allKeys = await client.smembers(`${this.prefix}keys:${service}`);

        // Filter keys that match the endpoint
        const matchingKeys = allKeys.filter(key => {
          // This is a simplified check - in production, store endpoint metadata
          return key.includes(endpoint.replace(/\//g, '_'));
        });

        if (matchingKeys.length > 0) {
          await client.del(...matchingKeys);

          logger.info('Invalidated API cache by endpoint', {
            service,
            endpoint,
            count: matchingKeys.length,
          });
        }
      });
    } catch (error) {
      logger.error('Failed to invalidate endpoint cache', {
        service,
        endpoint,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Batch get multiple API responses
   */
  async batchGet<T = any>(
    requests: ApiCacheOptions[]
  ): Promise<Map<string, CachedResponse<T> | null>> {
    const results = new Map<string, CachedResponse<T> | null>();
    const keys = requests.map(req => this.generateKey(req));

    try {
      await this.pool.execute(async (client) => {
        const pipeline = client.pipeline();

        for (const key of keys) {
          pipeline.get(key);
        }

        const responses = await pipeline.exec();

        if (responses) {
          responses.forEach((response, index) => {
            const key = keys[index];
            if (response && response[1]) {
              try {
                const parsed = JSON.parse(response[1] as string) as CachedResponse<T>;
                results.set(key, parsed);
                this.hitCount++;
              } catch {
                results.set(key, null);
                this.missCount++;
              }
            } else {
              results.set(key, null);
              this.missCount++;
            }
          });
        }
      });
    } catch (error) {
      logger.error('Batch get failed', {
        error: error instanceof Error ? error.message : String(error),
      });

      // Set null for all keys on error
      for (const key of keys) {
        results.set(key, null);
        this.missCount++;
      }
    }

    return results;
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    hitCount: number;
    missCount: number;
    hitRate: number;
    services: Record<string, number>;
  }> {
    const services: Record<string, number> = {};

    try {
      await this.pool.execute(async (client) => {
        const serviceKeys = ['salesforce', 'companycam', 'external'];

        for (const service of serviceKeys) {
          const count = await client.scard(`${this.prefix}keys:${service}`);
          services[service] = count;
        }
      });
    } catch (error) {
      logger.error('Failed to get cache stats', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    const total = this.hitCount + this.missCount;
    const hitRate = total > 0 ? this.hitCount / total : 0;

    return {
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: Math.round(hitRate * 100) / 100,
      services,
    };
  }

  /**
   * Clear all cached API responses
   */
  async clear(): Promise<void> {
    try {
      await this.pool.execute(async (client) => {
        const keys = await client.keys(`${this.prefix}*`);

        if (keys.length > 0) {
          await client.del(...keys);
          logger.info('Cleared API cache', { count: keys.length });
        }
      });

      this.hitCount = 0;
      this.missCount = 0;
    } catch (error) {
      logger.error('Failed to clear API cache', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Refresh cache entry in background
   */
  private async refreshInBackground(options: ApiCacheOptions): Promise<void> {
    // This would trigger a background job to refresh the cache
    // For now, just log it
    logger.debug('Would refresh cache in background', {
      service: options.service,
      endpoint: options.endpoint,
    });
  }

  /**
   * Warm cache with common API calls
   */
  async warmCache(
    requests: Array<{
      options: ApiCacheOptions;
      fetcher: () => Promise<any>;
    }>
  ): Promise<void> {
    logger.info('Warming API cache', { count: requests.length });

    const startTime = Date.now();
    let warmed = 0;
    let errors = 0;

    // Process in batches
    const batchSize = 5;
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async ({ options, fetcher }) => {
          try {
            // Check if already cached
            const existing = await this.get(options);
            if (existing && Date.now() - existing.timestamp < 60000) {
              return; // Skip if cached within last minute
            }

            // Fetch and cache
            const response = await fetcher();
            await this.set(options, response);
            warmed++;
          } catch (error) {
            errors++;
            logger.error('Failed to warm cache for API', {
              service: options.service,
              endpoint: options.endpoint,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        })
      );
    }

    const duration = Date.now() - startTime;
    logger.info('API cache warming complete', {
      warmed,
      errors,
      duration,
      avgTime: Math.round(duration / requests.length),
    });
  }
}

// Singleton instance
let apiCacheInstance: ApiCache | null = null;

export function getApiCache(config?: Partial<CacheConfig>): ApiCache {
  if (!apiCacheInstance) {
    apiCacheInstance = new ApiCache(config);
  }
  return apiCacheInstance;
}

export function createApiCache(config?: Partial<CacheConfig>): ApiCache {
  return new ApiCache(config);
}

export default ApiCache;

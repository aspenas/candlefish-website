/**
 * Optimized Redis Cache Service with Connection Pooling and Clustering
 * High-performance caching for Paintbox application
 */

import Redis, { Cluster, ClusterNode, ClusterOptions, RedisOptions } from 'ioredis';
import { logger } from '@/lib/logging/simple-logger';
import { performance } from 'perf_hooks';

// Cache key patterns
export const CACHE_KEYS = {
  CALCULATION: 'calc:',
  EXCEL_FORMULA: 'excel:',
  API_RESPONSE: 'api:',
  SESSION: 'session:',
  SALESFORCE: 'sf:',
  COMPANYCAM: 'cc:',
  USER_PREFERENCES: 'pref:',
  RATE_LIMIT: 'rate:',
  TEMP: 'tmp:',
} as const;

// TTL configurations (in seconds)
export const CACHE_TTL = {
  CALCULATION: 7200,      // 2 hours
  EXCEL_FORMULA: 14400,   // 4 hours
  API_RESPONSE: 1800,     // 30 minutes
  SESSION: 86400,         // 24 hours
  SALESFORCE: 300,        // 5 minutes
  COMPANYCAM: 600,        // 10 minutes
  USER_PREFERENCES: 2592000, // 30 days
  RATE_LIMIT: 60,         // 1 minute
  TEMP: 300,              // 5 minutes
  DEFAULT: 3600,          // 1 hour
} as const;

interface CacheMetrics {
  hits: number;
  misses: number;
  errors: number;
  latency: number[];
  size: number;
}

interface BatchOperation {
  key: string;
  value?: string;
  ttl?: number;
  operation: 'get' | 'set' | 'del';
}

export class OptimizedRedisCache {
  private client: Redis | Cluster;
  private isCluster: boolean;
  private metrics: CacheMetrics;
  private compressionThreshold: number = 1024; // Compress values > 1KB
  private batchQueue: Map<string, BatchOperation[]> = new Map();
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 100;
  private readonly BATCH_DELAY = 10; // ms

  constructor(options?: { cluster?: boolean; nodes?: ClusterNode[]; redisUrl?: string }) {
    this.isCluster = options?.cluster || process.env.REDIS_CLUSTER_ENABLED === 'true';
    this.metrics = {
      hits: 0,
      misses: 0,
      errors: 0,
      latency: [],
      size: 0,
    };

    if (this.isCluster && options?.nodes) {
      this.client = this.createClusterClient(options.nodes);
    } else {
      this.client = this.createStandaloneClient(options?.redisUrl);
    }

    this.setupEventHandlers();
    this.startMetricsReporting();
  }

  private createStandaloneClient(redisUrl?: string): Redis {
    const url = redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';

    const options: RedisOptions = {
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => Math.min(times * 100, 3000),
      reconnectOnError: (err: Error) => {
        const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
        return targetErrors.some(e => err.message.includes(e));
      },

      // Connection pool settings
      lazyConnect: false,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000,

      // Performance optimizations
      enableOfflineQueue: true,
      enableAutoPipelining: true,
      autoPipeliningIgnoredCommands: ['brpoplpush', 'blpop', 'brpop'],

      // Connection pool
      connectionPool: {
        min: parseInt(process.env.REDIS_POOL_MIN || '5'),
        max: parseInt(process.env.REDIS_POOL_MAX || '20'),
      },
    };

    return new Redis(url, options);
  }

  private createClusterClient(nodes: ClusterNode[]): Cluster {
    const options: ClusterOptions = {
      clusterRetryStrategy: (times: number) => Math.min(times * 100, 3000),
      enableOfflineQueue: true,
      enableReadyCheck: true,
      scaleReads: 'slave',
      maxRedirections: 16,
      retryDelayOnFailover: 100,
      retryDelayOnClusterDown: 300,
      slotsRefreshTimeout: 2000,
      slotsRefreshInterval: 5000,

      // Connection settings per node
      redisOptions: {
        password: process.env.REDIS_PASSWORD,
        enableAutoPipelining: true,
        keepAlive: 30000,
        connectTimeout: 10000,
        commandTimeout: 5000,
      },

      // Node pool settings
      natMap: process.env.REDIS_NAT_MAP ? JSON.parse(process.env.REDIS_NAT_MAP) : undefined,
    };

    return new Cluster(nodes, options);
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      logger.info('Redis cache connected', { cluster: this.isCluster });
    });

    this.client.on('ready', () => {
      logger.info('Redis cache ready');
    });

    this.client.on('error', (error) => {
      this.metrics.errors++;
      logger.error('Redis cache error', { error: error.message });
    });

    this.client.on('close', () => {
      logger.warn('Redis cache connection closed');
    });

    this.client.on('reconnecting', (delay: number) => {
      logger.info('Redis cache reconnecting', { delay });
    });

    if (this.isCluster) {
      (this.client as Cluster).on('node error', (error, node) => {
        logger.error('Redis cluster node error', {
          error: error.message,
          node: node?.options?.host
        });
      });
    }
  }

  // Optimized get with compression support
  async get<T = string>(key: string, options?: { parse?: boolean }): Promise<T | null> {
    const startTime = performance.now();

    try {
      const value = await this.client.get(key);

      if (value === null) {
        this.metrics.misses++;
        return null;
      }

      this.metrics.hits++;

      // Decompress if needed
      const decompressed = this.shouldDecompress(value)
        ? await this.decompress(value)
        : value;

      // Parse JSON if requested
      const result = options?.parse ? JSON.parse(decompressed) : decompressed;

      this.recordLatency(performance.now() - startTime);
      return result as T;
    } catch (error) {
      this.metrics.errors++;
      logger.error('Redis GET error', { key, error });
      return null;
    }
  }

  // Optimized set with compression support
  async set(
    key: string,
    value: any,
    ttl?: number,
    options?: { compress?: boolean; nx?: boolean; xx?: boolean }
  ): Promise<boolean> {
    const startTime = performance.now();

    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

      // Compress if value is large
      const finalValue = (options?.compress !== false && stringValue.length > this.compressionThreshold)
        ? await this.compress(stringValue)
        : stringValue;

      const args: any[] = [key, finalValue];

      if (ttl) {
        args.push('EX', ttl);
      }

      if (options?.nx) {
        args.push('NX');
      } else if (options?.xx) {
        args.push('XX');
      }

      const result = await this.client.set(...args);

      this.recordLatency(performance.now() - startTime);
      return result === 'OK';
    } catch (error) {
      this.metrics.errors++;
      logger.error('Redis SET error', { key, error });
      return false;
    }
  }

  // Batch operations for improved performance
  async batch(operations: BatchOperation[]): Promise<Map<string, any>> {
    const pipeline = this.client.pipeline();
    const results = new Map<string, any>();

    for (const op of operations) {
      switch (op.operation) {
        case 'get':
          pipeline.get(op.key);
          break;
        case 'set':
          if (op.value && op.ttl) {
            pipeline.setex(op.key, op.ttl, op.value);
          } else if (op.value) {
            pipeline.set(op.key, op.value);
          }
          break;
        case 'del':
          pipeline.del(op.key);
          break;
      }
    }

    const pipelineResults = await pipeline.exec();

    if (pipelineResults) {
      operations.forEach((op, index) => {
        const [error, result] = pipelineResults[index];
        if (!error) {
          results.set(op.key, result);
        }
      });
    }

    return results;
  }

  // Memoization helper for expensive calculations
  async memoize<T>(
    key: string,
    fn: () => Promise<T>,
    ttl: number = CACHE_TTL.DEFAULT
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key, { parse: true });
    if (cached !== null) {
      return cached;
    }

    // Calculate and cache
    const result = await fn();
    await this.set(key, result, ttl);

    return result;
  }

  // Cache warmer for pre-loading frequently accessed data
  async warm(patterns: string[]): Promise<void> {
    const warmingTasks = patterns.map(async (pattern) => {
      const keys = await this.client.keys(pattern);

      if (keys.length === 0) return;

      // Use pipeline for efficient warming
      const pipeline = this.client.pipeline();
      keys.forEach(key => pipeline.get(key));

      await pipeline.exec();
      logger.info('Cache warmed', { pattern, keys: keys.length });
    });

    await Promise.all(warmingTasks);
  }

  // Invalidation with pattern support
  async invalidate(pattern: string): Promise<number> {
    try {
      const keys = await this.client.keys(pattern);

      if (keys.length === 0) return 0;

      // Use pipeline for batch deletion
      const pipeline = this.client.pipeline();
      keys.forEach(key => pipeline.del(key));

      await pipeline.exec();

      logger.info('Cache invalidated', { pattern, keys: keys.length });
      return keys.length;
    } catch (error) {
      logger.error('Cache invalidation error', { pattern, error });
      return 0;
    }
  }

  // Tagged cache for related data invalidation
  async setTagged(key: string, value: any, tags: string[], ttl?: number): Promise<boolean> {
    const multi = this.client.multi();

    // Set the main value
    multi.set(key, typeof value === 'string' ? value : JSON.stringify(value));
    if (ttl) {
      multi.expire(key, ttl);
    }

    // Add to tag sets
    for (const tag of tags) {
      multi.sadd(`tag:${tag}`, key);
      if (ttl) {
        multi.expire(`tag:${tag}`, ttl);
      }
    }

    const results = await multi.exec();
    return results !== null && results.every(([err]) => !err);
  }

  // Invalidate by tag
  async invalidateTag(tag: string): Promise<number> {
    const keys = await this.client.smembers(`tag:${tag}`);

    if (keys.length === 0) return 0;

    const pipeline = this.client.pipeline();
    keys.forEach(key => pipeline.del(key));
    pipeline.del(`tag:${tag}`);

    await pipeline.exec();

    logger.info('Tag invalidated', { tag, keys: keys.length });
    return keys.length;
  }

  // Rate limiting helper
  async checkRateLimit(
    identifier: string,
    limit: number,
    window: number = 60
  ): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
    const key = `${CACHE_KEYS.RATE_LIMIT}${identifier}`;
    const current = await this.client.incr(key);

    if (current === 1) {
      await this.client.expire(key, window);
    }

    const ttl = await this.client.ttl(key);

    return {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current),
      resetIn: ttl > 0 ? ttl : window,
    };
  }

  // Distributed lock for coordination
  async acquireLock(
    resource: string,
    ttl: number = 10000
  ): Promise<{ acquired: boolean; token?: string }> {
    const token = Math.random().toString(36).substring(2, 15);
    const key = `lock:${resource}`;

    const acquired = await this.set(key, token, Math.ceil(ttl / 1000), { nx: true });

    return {
      acquired,
      token: acquired ? token : undefined,
    };
  }

  async releaseLock(resource: string, token: string): Promise<boolean> {
    const key = `lock:${resource}`;

    // Use Lua script for atomic check-and-delete
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    const result = await this.client.eval(script, 1, key, token) as number;
    return result === 1;
  }

  // Compression helpers
  private async compress(value: string): Promise<string> {
    // Use Node.js built-in zlib for compression
    const { promisify } = require('util');
    const { gzip } = require('zlib');
    const gzipAsync = promisify(gzip);

    const compressed = await gzipAsync(value);
    return `COMPRESSED:${compressed.toString('base64')}`;
  }

  private async decompress(value: string): Promise<string> {
    if (!value.startsWith('COMPRESSED:')) {
      return value;
    }

    const { promisify } = require('util');
    const { gunzip } = require('zlib');
    const gunzipAsync = promisify(gunzip);

    const compressed = Buffer.from(value.substring(11), 'base64');
    const decompressed = await gunzipAsync(compressed);

    return decompressed.toString();
  }

  private shouldDecompress(value: string): boolean {
    return value.startsWith('COMPRESSED:');
  }

  // Metrics helpers
  private recordLatency(latency: number): void {
    this.metrics.latency.push(latency);

    // Keep only last 1000 measurements
    if (this.metrics.latency.length > 1000) {
      this.metrics.latency.shift();
    }
  }

  private startMetricsReporting(): void {
    setInterval(() => {
      if (this.metrics.latency.length > 0) {
        const avg = this.metrics.latency.reduce((a, b) => a + b, 0) / this.metrics.latency.length;
        const p95 = this.metrics.latency.sort((a, b) => a - b)[Math.floor(this.metrics.latency.length * 0.95)];

        logger.info('Redis cache metrics', {
          hits: this.metrics.hits,
          misses: this.metrics.misses,
          hitRate: this.metrics.hits / (this.metrics.hits + this.metrics.misses),
          errors: this.metrics.errors,
          avgLatency: avg.toFixed(2),
          p95Latency: p95?.toFixed(2),
        });

        // Reset counters
        this.metrics.hits = 0;
        this.metrics.misses = 0;
        this.metrics.errors = 0;
        this.metrics.latency = [];
      }
    }, 60000); // Report every minute
  }

  // Cleanup
  async disconnect(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    await this.client.quit();
    logger.info('Redis cache disconnected');
  }

  // Get cache statistics
  async getStats(): Promise<{
    memory: any;
    clients: any;
    stats: any;
  }> {
    const [memory, clients, stats] = await Promise.all([
      this.client.info('memory'),
      this.client.info('clients'),
      this.client.info('stats'),
    ]);

    return {
      memory: this.parseInfo(memory),
      clients: this.parseInfo(clients),
      stats: this.parseInfo(stats),
    };
  }

  private parseInfo(info: string): Record<string, string> {
    const result: Record<string, string> = {};

    info.split('\r\n').forEach(line => {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          result[key] = value;
        }
      }
    });

    return result;
  }
}

// Singleton instance
let cacheInstance: OptimizedRedisCache | null = null;

export function getOptimizedCache(): OptimizedRedisCache {
  if (!cacheInstance) {
    const isCluster = process.env.REDIS_CLUSTER_ENABLED === 'true';

    if (isCluster && process.env.REDIS_CLUSTER_NODES) {
      const nodes = JSON.parse(process.env.REDIS_CLUSTER_NODES);
      cacheInstance = new OptimizedRedisCache({ cluster: true, nodes });
    } else {
      cacheInstance = new OptimizedRedisCache();
    }
  }

  return cacheInstance;
}

export default getOptimizedCache;

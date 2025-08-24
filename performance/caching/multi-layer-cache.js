/**
 * Multi-Layer Caching Strategy
 * Implements caching at CDN, Redis, and application layers
 */

const Redis = require('ioredis');
const LRU = require('lru-cache');
const crypto = require('crypto');
const pino = require('pino');

const logger = pino({
  level: 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

class MultiLayerCache {
  constructor(config = {}) {
    // Layer 1: In-memory LRU cache (fastest, limited size)
    this.memoryCache = new LRU({
      max: config.memoryCacheSize || 500,
      maxSize: config.memoryCacheBytes || 50 * 1024 * 1024, // 50MB
      sizeCalculation: (value) => {
        return Buffer.byteLength(JSON.stringify(value));
      },
      ttl: config.memoryCacheTTL || 1000 * 60 * 5, // 5 minutes
      updateAgeOnGet: true,
      updateAgeOnHas: true
    });

    // Layer 2: Redis cache (fast, distributed)
    this.redis = new Redis({
      host: config.redisHost || 'localhost',
      port: config.redisPort || 6379,
      password: config.redisPassword,
      db: config.redisDb || 0,
      retryStrategy: (times) => Math.min(times * 50, 2000),
      enableOfflineQueue: true,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    // Layer 3: CDN cache headers (configured separately)
    this.cdnConfig = {
      publicMaxAge: config.cdnPublicMaxAge || 3600,        // 1 hour
      privateMaxAge: config.cdnPrivateMaxAge || 0,
      staleWhileRevalidate: config.cdnStaleWhileRevalidate || 86400, // 1 day
      staleIfError: config.cdnStaleIfError || 604800       // 1 week
    };

    // Cache statistics
    this.stats = {
      hits: { memory: 0, redis: 0, miss: 0 },
      writes: { memory: 0, redis: 0 },
      errors: { redis: 0 },
      latency: { memory: [], redis: [] }
    };

    this.setupRedisErrorHandling();
  }

  setupRedisErrorHandling() {
    this.redis.on('error', (error) => {
      logger.error({ error }, 'Redis connection error');
      this.stats.errors.redis++;
    });

    this.redis.on('connect', () => {
      logger.info('Redis connected');
    });
  }

  generateKey(namespace, identifier, params = {}) {
    const paramStr = Object.keys(params)
      .sort()
      .map(k => `${k}:${params[k]}`)
      .join(':');

    const hash = crypto
      .createHash('sha256')
      .update(paramStr)
      .digest('hex')
      .substring(0, 8);

    return `${namespace}:${identifier}:${hash}`;
  }

  async get(key, options = {}) {
    const startTime = process.hrtime.bigint();

    // Check Layer 1: Memory cache
    const memoryValue = this.memoryCache.get(key);
    if (memoryValue !== undefined) {
      this.recordLatency('memory', startTime);
      this.stats.hits.memory++;
      logger.debug({ key, layer: 'memory' }, 'Cache hit');
      return memoryValue;
    }

    // Check Layer 2: Redis cache
    try {
      const redisValue = await this.redis.get(key);
      if (redisValue) {
        this.recordLatency('redis', startTime);
        this.stats.hits.redis++;
        logger.debug({ key, layer: 'redis' }, 'Cache hit');

        const parsed = JSON.parse(redisValue);

        // Promote to memory cache
        if (options.promoteToMemory !== false) {
          this.memoryCache.set(key, parsed);
        }

        return parsed;
      }
    } catch (error) {
      logger.error({ error, key }, 'Redis get error');
      this.stats.errors.redis++;
    }

    // Cache miss
    this.stats.hits.miss++;
    logger.debug({ key }, 'Cache miss');

    // If fetcher provided, fetch and cache
    if (options.fetcher) {
      return this.fetchAndCache(key, options);
    }

    return null;
  }

  async set(key, value, options = {}) {
    const ttl = options.ttl || 3600; // Default 1 hour

    // Write to Layer 1: Memory cache
    if (options.skipMemory !== true) {
      this.memoryCache.set(key, value, { ttl: ttl * 1000 });
      this.stats.writes.memory++;
    }

    // Write to Layer 2: Redis cache
    if (options.skipRedis !== true) {
      try {
        const serialized = JSON.stringify(value);

        if (ttl > 0) {
          await this.redis.setex(key, ttl, serialized);
        } else {
          await this.redis.set(key, serialized);
        }

        this.stats.writes.redis++;

        // Set cache tags for invalidation
        if (options.tags && options.tags.length > 0) {
          await this.setTags(key, options.tags, ttl);
        }
      } catch (error) {
        logger.error({ error, key }, 'Redis set error');
        this.stats.errors.redis++;
      }
    }

    return value;
  }

  async fetchAndCache(key, options) {
    const { fetcher, ttl = 3600, lock = true } = options;

    // Implement cache stampede protection with distributed lock
    if (lock) {
      const lockKey = `lock:${key}`;
      const lockAcquired = await this.acquireLock(lockKey);

      if (!lockAcquired) {
        // Wait for lock to be released and check cache again
        await this.waitForLock(lockKey);
        return this.get(key, { ...options, fetcher: undefined });
      }

      try {
        // Double-check cache after acquiring lock
        const cached = await this.get(key, { ...options, fetcher: undefined });
        if (cached !== null) {
          await this.releaseLock(lockKey);
          return cached;
        }

        // Fetch fresh data
        const freshData = await fetcher();

        // Cache the result
        await this.set(key, freshData, { ttl, tags: options.tags });

        await this.releaseLock(lockKey);
        return freshData;
      } catch (error) {
        await this.releaseLock(lockKey);
        throw error;
      }
    } else {
      // No lock protection
      const freshData = await fetcher();
      await this.set(key, freshData, { ttl, tags: options.tags });
      return freshData;
    }
  }

  async acquireLock(lockKey, ttl = 10) {
    try {
      const result = await this.redis.set(
        lockKey,
        '1',
        'EX', ttl,
        'NX'
      );
      return result === 'OK';
    } catch (error) {
      logger.error({ error, lockKey }, 'Failed to acquire lock');
      return false;
    }
  }

  async releaseLock(lockKey) {
    try {
      await this.redis.del(lockKey);
    } catch (error) {
      logger.error({ error, lockKey }, 'Failed to release lock');
    }
  }

  async waitForLock(lockKey, maxWait = 5000) {
    const startTime = Date.now();
    const checkInterval = 100;

    while (Date.now() - startTime < maxWait) {
      const exists = await this.redis.exists(lockKey);
      if (!exists) return;

      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
  }

  async setTags(key, tags, ttl) {
    const pipeline = this.redis.pipeline();

    for (const tag of tags) {
      const tagKey = `tag:${tag}`;
      pipeline.sadd(tagKey, key);
      pipeline.expire(tagKey, ttl + 60); // Slightly longer TTL for cleanup
    }

    await pipeline.exec();
  }

  async invalidateByTag(tag) {
    const tagKey = `tag:${tag}`;

    try {
      // Get all keys with this tag
      const keys = await this.redis.smembers(tagKey);

      if (keys.length > 0) {
        // Delete from memory cache
        for (const key of keys) {
          this.memoryCache.delete(key);
        }

        // Delete from Redis
        const pipeline = this.redis.pipeline();
        pipeline.del(...keys);
        pipeline.del(tagKey);
        await pipeline.exec();

        logger.info({ tag, count: keys.length }, 'Invalidated cache by tag');
      }
    } catch (error) {
      logger.error({ error, tag }, 'Failed to invalidate by tag');
    }
  }

  async invalidatePattern(pattern) {
    try {
      // Clear from memory cache
      for (const key of this.memoryCache.keys()) {
        if (key.match(pattern)) {
          this.memoryCache.delete(key);
        }
      }

      // Clear from Redis using SCAN
      const stream = this.redis.scanStream({
        match: pattern,
        count: 100
      });

      const pipeline = this.redis.pipeline();
      let count = 0;

      stream.on('data', (keys) => {
        if (keys.length) {
          pipeline.del(...keys);
          count += keys.length;
        }
      });

      stream.on('end', async () => {
        if (count > 0) {
          await pipeline.exec();
          logger.info({ pattern, count }, 'Invalidated cache by pattern');
        }
      });
    } catch (error) {
      logger.error({ error, pattern }, 'Failed to invalidate by pattern');
    }
  }

  async warmup(definitions) {
    const results = [];

    for (const def of definitions) {
      const { key, fetcher, ttl = 3600, tags } = def;

      try {
        logger.info({ key }, 'Warming cache');
        const data = await fetcher();
        await this.set(key, data, { ttl, tags });
        results.push({ key, status: 'success' });
      } catch (error) {
        logger.error({ error, key }, 'Cache warmup failed');
        results.push({ key, status: 'error', error: error.message });
      }
    }

    return results;
  }

  recordLatency(layer, startTime) {
    const endTime = process.hrtime.bigint();
    const latency = Number(endTime - startTime) / 1000000; // Convert to ms

    this.stats.latency[layer].push(latency);

    // Keep only last 1000 measurements
    if (this.stats.latency[layer].length > 1000) {
      this.stats.latency[layer].shift();
    }
  }

  getStats() {
    const calculateAvg = (arr) => {
      if (arr.length === 0) return 0;
      return arr.reduce((a, b) => a + b, 0) / arr.length;
    };

    const totalHits = this.stats.hits.memory + this.stats.hits.redis;
    const totalRequests = totalHits + this.stats.hits.miss;

    return {
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
      hits: this.stats.hits,
      writes: this.stats.writes,
      errors: this.stats.errors,
      avgLatency: {
        memory: calculateAvg(this.stats.latency.memory),
        redis: calculateAvg(this.stats.latency.redis)
      },
      memoryCacheSize: this.memoryCache.size,
      memoryCacheBytes: this.memoryCache.calculatedSize
    };
  }

  generateCDNHeaders(options = {}) {
    const headers = {};
    const isPublic = options.public !== false;
    const maxAge = options.maxAge || (isPublic ? this.cdnConfig.publicMaxAge : this.cdnConfig.privateMaxAge);

    // Cache-Control header
    const directives = [];

    if (isPublic) {
      directives.push('public');
    } else {
      directives.push('private');
    }

    if (maxAge > 0) {
      directives.push(`max-age=${maxAge}`);

      if (options.immutable) {
        directives.push('immutable');
      }

      if (this.cdnConfig.staleWhileRevalidate > 0) {
        directives.push(`stale-while-revalidate=${this.cdnConfig.staleWhileRevalidate}`);
      }

      if (this.cdnConfig.staleIfError > 0) {
        directives.push(`stale-if-error=${this.cdnConfig.staleIfError}`);
      }
    } else {
      directives.push('no-cache', 'no-store', 'must-revalidate');
    }

    headers['Cache-Control'] = directives.join(', ');

    // CDN-specific headers
    headers['CDN-Cache-Control'] = headers['Cache-Control'];
    headers['Cloudflare-CDN-Cache-Control'] = headers['Cache-Control'];

    // Vary header for proper caching
    if (options.vary) {
      headers['Vary'] = Array.isArray(options.vary) ? options.vary.join(', ') : options.vary;
    }

    // ETag for validation
    if (options.etag) {
      headers['ETag'] = options.etag;
    }

    // Surrogate-Key for tagged invalidation (Fastly)
    if (options.tags && options.tags.length > 0) {
      headers['Surrogate-Key'] = options.tags.join(' ');
    }

    return headers;
  }

  async close() {
    this.memoryCache.clear();
    await this.redis.quit();
  }
}

// GraphQL DataLoader integration
class CachedDataLoader {
  constructor(batchFn, cache, options = {}) {
    this.batchFn = batchFn;
    this.cache = cache;
    this.namespace = options.namespace || 'dataloader';
    this.ttl = options.ttl || 300; // 5 minutes default
    this.batch = [];
    this.batchTimer = null;
    this.maxBatchSize = options.maxBatchSize || 100;
    this.batchDelay = options.batchDelay || 10;
  }

  async load(key) {
    const cacheKey = this.cache.generateKey(this.namespace, key);

    // Check cache first
    const cached = await this.cache.get(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Add to batch
    return new Promise((resolve, reject) => {
      this.batch.push({ key, resolve, reject, cacheKey });

      if (this.batch.length >= this.maxBatchSize) {
        this.executeBatch();
      } else if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => this.executeBatch(), this.batchDelay);
      }
    });
  }

  async executeBatch() {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    const batch = this.batch;
    this.batch = [];

    if (batch.length === 0) return;

    try {
      const keys = batch.map(item => item.key);
      const results = await this.batchFn(keys);

      // Cache and resolve results
      for (let i = 0; i < batch.length; i++) {
        const item = batch[i];
        const result = results[i];

        if (result !== undefined) {
          await this.cache.set(item.cacheKey, result, { ttl: this.ttl });
          item.resolve(result);
        } else {
          item.reject(new Error(`No result for key: ${item.key}`));
        }
      }
    } catch (error) {
      // Reject all promises in batch
      batch.forEach(item => item.reject(error));
    }
  }

  async loadMany(keys) {
    return Promise.all(keys.map(key => this.load(key)));
  }

  async clear(key) {
    const cacheKey = this.cache.generateKey(this.namespace, key);
    await this.cache.invalidatePattern(cacheKey);
  }

  async clearAll() {
    await this.cache.invalidatePattern(`${this.namespace}:*`);
  }
}

module.exports = { MultiLayerCache, CachedDataLoader };

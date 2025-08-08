/**
 * Formula Cache Service
 * Caches calculation results with intelligent invalidation
 */

import { Decimal } from 'decimal.js';
import { getRedisPool } from './redis-client';
import { logger } from '@/lib/logging/simple-logger';
import crypto from 'crypto';

export interface FormulaInput {
  formulaId: string;
  variables: Record<string, any>;
  version?: string;
}

export interface FormulaResult {
  value: string | number | Decimal;
  timestamp: number;
  executionTime: number;
  dependencies?: string[];
}

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
  compressionThreshold?: number; // Compress if result size > threshold
}

class FormulaCache {
  private pool = getRedisPool();
  private memoryCache = new Map<string, { result: FormulaResult; expires: number }>();
  private defaultTTL = 3600; // 1 hour default
  private prefix = 'formula:';
  private compressionThreshold = 1024; // 1KB

  constructor(options?: CacheOptions) {
    if (options?.ttl) {
      this.defaultTTL = options.ttl;
    }
    if (options?.prefix) {
      this.prefix = options.prefix;
    }
    if (options?.compressionThreshold) {
      this.compressionThreshold = options.compressionThreshold;
    }

    // Clean up expired memory cache entries periodically
    setInterval(() => this.cleanupMemoryCache(), 60000); // Every minute
  }

  /**
   * Generate cache key from formula input
   */
  private generateKey(input: FormulaInput): string {
    const normalized = {
      id: input.formulaId,
      vars: this.normalizeVariables(input.variables),
      v: input.version || '1.0',
    };

    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(normalized))
      .digest('hex')
      .substring(0, 16);

    return `${this.prefix}${input.formulaId}:${hash}`;
  }

  /**
   * Normalize variables for consistent caching
   */
  private normalizeVariables(variables: Record<string, any>): Record<string, any> {
    const normalized: Record<string, any> = {};

    // Sort keys for consistent hashing
    const sortedKeys = Object.keys(variables).sort();

    for (const key of sortedKeys) {
      const value = variables[key];

      // Normalize numbers to ensure consistent precision
      if (typeof value === 'number') {
        normalized[key] = parseFloat(value.toFixed(10));
      } else if (value instanceof Decimal) {
        normalized[key] = value.toFixed();
      } else {
        normalized[key] = value;
      }
    }

    return normalized;
  }

  /**
   * Get cached formula result
   */
  async get(input: FormulaInput): Promise<FormulaResult | null> {
    const key = this.generateKey(input);

    // Check memory cache first
    const memoryResult = this.getFromMemory(key);
    if (memoryResult) {
      logger.debug('Formula cache hit (memory)', {
        formulaId: input.formulaId,
        key
      });
      return memoryResult;
    }

    try {
      // Check Redis cache
      const result = await this.pool.execute(async (client) => {
        const data = await client.get(key);
        if (!data) return null;

        const parsed = JSON.parse(data) as FormulaResult;

        // Convert value back to Decimal if it was stored as string
        if (typeof parsed.value === 'string' && parsed.value.includes('.')) {
          try {
            parsed.value = new Decimal(parsed.value);
          } catch {
            // Keep as string if not a valid Decimal
          }
        }

        return parsed;
      });

      if (result) {
        logger.debug('Formula cache hit (Redis)', {
          formulaId: input.formulaId,
          key
        });

        // Store in memory cache for faster subsequent access
        this.setInMemory(key, result, 60); // 1 minute memory cache

        return result;
      }
    } catch (error) {
      logger.error('Failed to get formula from cache', {
        key,
        error: error instanceof Error ? error.message : String(error)
      });
    }

    return null;
  }

  /**
   * Set formula result in cache
   */
  async set(
    input: FormulaInput,
    result: FormulaResult,
    ttl?: number
  ): Promise<void> {
    const key = this.generateKey(input);
    const ttlSeconds = ttl || this.defaultTTL;

    // Prepare data for caching
    const cacheData = {
      ...result,
      value: result.value instanceof Decimal
        ? result.value.toFixed()
        : result.value,
    };

    const serialized = JSON.stringify(cacheData);

    // Store in memory cache
    this.setInMemory(key, result, Math.min(ttlSeconds, 300)); // Max 5 min in memory

    try {
      // Store in Redis
      await this.pool.execute(async (client) => {
        // Use compression for large results
        if (serialized.length > this.compressionThreshold) {
          const compressed = await this.compress(serialized);
          await client.setex(`${key}:c`, ttlSeconds, compressed);
        } else {
          await client.setex(key, ttlSeconds, serialized);
        }
      });

      logger.debug('Formula cached', {
        formulaId: input.formulaId,
        key,
        ttl: ttlSeconds,
        size: serialized.length
      });
    } catch (error) {
      logger.error('Failed to cache formula', {
        key,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Invalidate cached formula results
   */
  async invalidate(patterns: string[]): Promise<void> {
    try {
      await this.pool.execute(async (client) => {
        for (const pattern of patterns) {
          const keys = await client.keys(`${this.prefix}${pattern}*`);

          if (keys.length > 0) {
            await client.del(...keys);

            // Also remove from memory cache
            for (const key of keys) {
              this.memoryCache.delete(key);
            }

            logger.info('Invalidated formula cache', {
              pattern,
              count: keys.length
            });
          }
        }
      });
    } catch (error) {
      logger.error('Failed to invalidate formula cache', {
        patterns,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Batch get multiple formula results
   */
  async batchGet(inputs: FormulaInput[]): Promise<Map<string, FormulaResult | null>> {
    const results = new Map<string, FormulaResult | null>();
    const missingKeys: string[] = [];

    // Check memory cache first
    for (const input of inputs) {
      const key = this.generateKey(input);
      const memoryResult = this.getFromMemory(key);

      if (memoryResult) {
        results.set(key, memoryResult);
      } else {
        missingKeys.push(key);
      }
    }

    // Batch get from Redis for missing keys
    if (missingKeys.length > 0) {
      try {
        await this.pool.execute(async (client) => {
          const pipeline = client.pipeline();

          for (const key of missingKeys) {
            pipeline.get(key);
          }

          const redisResults = await pipeline.exec();

          if (redisResults) {
            redisResults.forEach((result, index) => {
              const key = missingKeys[index];
              if (result && result[1]) {
                try {
                  const parsed = JSON.parse(result[1] as string) as FormulaResult;
                  results.set(key, parsed);
                  this.setInMemory(key, parsed, 60);
                } catch {
                  results.set(key, null);
                }
              } else {
                results.set(key, null);
              }
            });
          }
        });
      } catch (error) {
        logger.error('Batch get failed', {
          error: error instanceof Error ? error.message : String(error)
        });

        // Set null for all missing keys on error
        for (const key of missingKeys) {
          results.set(key, null);
        }
      }
    }

    return results;
  }

  /**
   * Warm cache with pre-calculated formulas
   */
  async warmCache(
    formulas: Array<{
      input: FormulaInput;
      calculator: () => Promise<FormulaResult>;
    }>
  ): Promise<void> {
    logger.info('Warming formula cache', { count: formulas.length });

    const startTime = Date.now();
    let warmed = 0;
    let errors = 0;

    // Process in batches to avoid overwhelming the system
    const batchSize = 10;
    for (let i = 0; i < formulas.length; i += batchSize) {
      const batch = formulas.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async ({ input, calculator }) => {
          try {
            // Check if already cached
            const existing = await this.get(input);
            if (existing) {
              return;
            }

            // Calculate and cache
            const result = await calculator();
            await this.set(input, result);
            warmed++;
          } catch (error) {
            errors++;
            logger.error('Failed to warm cache for formula', {
              formulaId: input.formulaId,
              error: error instanceof Error ? error.message : String(error)
            });
          }
        })
      );
    }

    const duration = Date.now() - startTime;
    logger.info('Formula cache warming complete', {
      warmed,
      errors,
      duration,
      avgTime: Math.round(duration / formulas.length)
    });
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    memoryEntries: number;
    memorySize: number;
    redisEntries: number;
    hitRate: number;
  }> {
    let redisEntries = 0;

    try {
      await this.pool.execute(async (client) => {
        const keys = await client.keys(`${this.prefix}*`);
        redisEntries = keys.length;
      });
    } catch (error) {
      logger.error('Failed to get cache stats', {
        error: error instanceof Error ? error.message : String(error)
      });
    }

    const memorySize = Array.from(this.memoryCache.values()).reduce(
      (sum, entry) => sum + JSON.stringify(entry).length,
      0
    );

    return {
      memoryEntries: this.memoryCache.size,
      memorySize,
      redisEntries,
      hitRate: 0, // Would need to track hits/misses for this
    };
  }

  // Memory cache helpers
  private getFromMemory(key: string): FormulaResult | null {
    const entry = this.memoryCache.get(key);

    if (!entry) return null;

    if (Date.now() > entry.expires) {
      this.memoryCache.delete(key);
      return null;
    }

    return entry.result;
  }

  private setInMemory(key: string, result: FormulaResult, ttlSeconds: number): void {
    this.memoryCache.set(key, {
      result,
      expires: Date.now() + (ttlSeconds * 1000),
    });
  }

  private cleanupMemoryCache(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (now > entry.expires) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug('Cleaned expired memory cache entries', { count: cleaned });
    }
  }

  // Compression helpers (basic implementation - could be replaced with zlib)
  private async compress(data: string): Promise<string> {
    // For now, just return the data
    // In production, use zlib or similar
    return data;
  }

  private async decompress(data: string): Promise<string> {
    // For now, just return the data
    // In production, use zlib or similar
    return data;
  }
}

// Singleton instance
let formulaCacheInstance: FormulaCache | null = null;

export function getFormulaCache(options?: CacheOptions): FormulaCache {
  if (!formulaCacheInstance) {
    formulaCacheInstance = new FormulaCache(options);
  }
  return formulaCacheInstance;
}

export function createFormulaCache(options?: CacheOptions): FormulaCache {
  return new FormulaCache(options);
}

export default FormulaCache;

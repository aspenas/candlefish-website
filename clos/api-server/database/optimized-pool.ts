/**
 * Optimized Database Connection Pool with Query Performance Optimization
 * Implements connection pooling, query caching, and performance monitoring
 * 
 * Performance targets:
 * - Connection pool: <5ms connection time
 * - Query execution: <50ms for indexed queries
 * - Prepared statements: 2x faster than raw queries
 * - Connection reuse: 95%+ hit rate
 */

import { Database } from 'sqlite3';
import { open, Database as SqliteDatabase } from 'sqlite';
import { Pool } from 'generic-pool';
import { createPool } from 'generic-pool';
import { EventEmitter } from 'events';
import { createHash } from 'crypto';
import { performance } from 'perf_hooks';
import { RedisCacheManager } from '../cache/redis-manager';

export interface PoolConfig {
  min: number;
  max: number;
  acquireTimeoutMillis: number;
  createTimeoutMillis: number;
  destroyTimeoutMillis: number;
  idleTimeoutMillis: number;
  createRetryIntervalMillis: number;
  evictionRunIntervalMillis: number;
  enableQueryCache: boolean;
  enablePreparedStatements: boolean;
  slowQueryThreshold: number;
}

export interface QueryOptions {
  cache?: boolean;
  cacheTtl?: number;
  cacheKey?: string;
  timeout?: number;
  prepared?: boolean;
  stream?: boolean;
}

export interface QueryStats {
  query: string;
  executionTime: number;
  rowCount: number;
  cached: boolean;
  timestamp: number;
}

export class OptimizedDatabasePool extends EventEmitter {
  private pool: Pool<SqliteDatabase>;
  private preparedStatements: Map<string, any> = new Map();
  private queryStats: Map<string, QueryStats[]> = new Map();
  private cacheManager: RedisCacheManager;
  private config: PoolConfig;
  private connectionStats = {
    created: 0,
    destroyed: 0,
    acquired: 0,
    released: 0,
    errors: 0,
    currentActive: 0,
    waitTime: [] as number[],
  };

  constructor(
    dbPath: string,
    cacheManager: RedisCacheManager,
    config: Partial<PoolConfig> = {}
  ) {
    super();
    this.cacheManager = cacheManager;
    this.config = this.mergeConfig(config);
    this.pool = this.createPool(dbPath);
    this.startMonitoring();
  }

  private mergeConfig(partial: Partial<PoolConfig>): PoolConfig {
    return {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 5000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      createRetryIntervalMillis: 200,
      evictionRunIntervalMillis: 10000,
      enableQueryCache: true,
      enablePreparedStatements: true,
      slowQueryThreshold: 100,
      ...partial
    };
  }

  private createPool(dbPath: string): Pool<SqliteDatabase> {
    return createPool({
      create: async () => {
        const startTime = performance.now();
        try {
          const db = await open({
            filename: dbPath,
            driver: Database
          });

          // Optimize SQLite settings for performance
          await db.exec(`
            PRAGMA journal_mode = WAL;
            PRAGMA synchronous = NORMAL;
            PRAGMA cache_size = -64000;
            PRAGMA temp_store = MEMORY;
            PRAGMA mmap_size = 268435456;
            PRAGMA page_size = 4096;
            PRAGMA optimize;
          `);

          // Add custom functions
          await this.registerCustomFunctions(db);

          this.connectionStats.created++;
          this.connectionStats.waitTime.push(performance.now() - startTime);
          
          this.emit('connection:created', {
            time: performance.now() - startTime,
            total: this.connectionStats.created
          });

          return db;
        } catch (error) {
          this.connectionStats.errors++;
          this.emit('connection:error', error);
          throw error;
        }
      },

      destroy: async (db: SqliteDatabase) => {
        try {
          await db.close();
          this.connectionStats.destroyed++;
          this.emit('connection:destroyed', {
            total: this.connectionStats.destroyed
          });
        } catch (error) {
          this.connectionStats.errors++;
          this.emit('connection:error', error);
        }
      },

      validate: async (db: SqliteDatabase) => {
        try {
          await db.get('SELECT 1');
          return true;
        } catch {
          return false;
        }
      }
    }, {
      min: this.config.min,
      max: this.config.max,
      acquireTimeoutMillis: this.config.acquireTimeoutMillis,
      createTimeoutMillis: this.config.createTimeoutMillis,
      destroyTimeoutMillis: this.config.destroyTimeoutMillis,
      idleTimeoutMillis: this.config.idleTimeoutMillis,
      createRetryIntervalMillis: this.config.createRetryIntervalMillis,
      evictionRunIntervalMillis: this.config.evictionRunIntervalMillis,
      testOnBorrow: true,
      testOnReturn: false,
      fifo: false,
      priorityRange: 3,
      autostart: true
    });
  }

  private async registerCustomFunctions(db: SqliteDatabase): Promise<void> {
    // Add custom regex function
    db.db.function('REGEXP', (pattern: string, text: string) => {
      return new RegExp(pattern, 'i').test(text) ? 1 : 0;
    });

    // Add custom JSON functions
    db.db.function('JSON_EXTRACT', (json: string, path: string) => {
      try {
        const obj = JSON.parse(json);
        const keys = path.split('.').slice(1); // Remove leading $
        let result = obj;
        for (const key of keys) {
          result = result[key];
          if (result === undefined) return null;
        }
        return typeof result === 'object' ? JSON.stringify(result) : result;
      } catch {
        return null;
      }
    });

    // Add custom aggregation functions
    db.db.aggregate('GROUP_CONCAT_DISTINCT', {
      start: () => new Set(),
      step: (set: Set<any>, value: any) => {
        set.add(value);
        return set;
      },
      result: (set: Set<any>) => Array.from(set).join(',')
    });
  }

  /**
   * Execute a query with automatic optimization
   */
  public async query<T>(
    sql: string,
    params: any[] = [],
    options: QueryOptions = {}
  ): Promise<T[]> {
    const startTime = performance.now();
    const queryKey = this.generateQueryKey(sql, params);

    // Check cache first
    if (options.cache !== false && this.config.enableQueryCache) {
      const cached = await this.cacheManager.get<T[]>(queryKey);
      if (cached !== null) {
        this.recordQueryStats(sql, performance.now() - startTime, cached.length, true);
        this.emit('query:cache-hit', { sql, time: performance.now() - startTime });
        return cached;
      }
    }

    // Acquire connection from pool
    const db = await this.acquire();

    try {
      let result: T[];

      // Use prepared statement if enabled
      if (options.prepared !== false && this.config.enablePreparedStatements) {
        result = await this.executePrepared<T>(db, sql, params);
      } else {
        result = await db.all<T[]>(sql, params);
      }

      const executionTime = performance.now() - startTime;
      this.recordQueryStats(sql, executionTime, result.length, false);

      // Check for slow query
      if (executionTime > this.config.slowQueryThreshold) {
        this.emit('query:slow', {
          sql,
          params,
          time: executionTime,
          rows: result.length
        });

        // Analyze query plan for slow queries
        const plan = await this.analyzeQuery(db, sql, params);
        this.emit('query:plan', { sql, plan });
      }

      // Cache the result
      if (options.cache !== false && this.config.enableQueryCache) {
        const ttl = options.cacheTtl || 60000; // 1 minute default
        await this.cacheManager.set(queryKey, result, { ttl });
      }

      return result;
    } finally {
      await this.release(db);
    }
  }

  /**
   * Execute a query and stream results
   */
  public async *queryStream<T>(
    sql: string,
    params: any[] = [],
    options: { batchSize?: number } = {}
  ): AsyncGenerator<T> {
    const batchSize = options.batchSize || 100;
    const db = await this.acquire();

    try {
      // Use LIMIT/OFFSET for batching
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const batchSql = `${sql} LIMIT ${batchSize} OFFSET ${offset}`;
        const batch = await db.all<T[]>(batchSql, params);

        for (const row of batch) {
          yield row;
        }

        hasMore = batch.length === batchSize;
        offset += batchSize;
      }
    } finally {
      await this.release(db);
    }
  }

  /**
   * Execute multiple queries in a transaction
   */
  public async transaction<T>(
    callback: (db: SqliteDatabase) => Promise<T>
  ): Promise<T> {
    const db = await this.acquire();
    const startTime = performance.now();

    try {
      await db.exec('BEGIN IMMEDIATE');
      
      const result = await callback(db);
      
      await db.exec('COMMIT');
      
      this.emit('transaction:complete', {
        time: performance.now() - startTime
      });
      
      return result;
    } catch (error) {
      await db.exec('ROLLBACK');
      this.emit('transaction:rollback', {
        error,
        time: performance.now() - startTime
      });
      throw error;
    } finally {
      await this.release(db);
    }
  }

  /**
   * Batch insert with optimal chunking
   */
  public async batchInsert(
    table: string,
    columns: string[],
    values: any[][],
    options: { chunkSize?: number; onProgress?: (progress: number) => void } = {}
  ): Promise<number> {
    const chunkSize = options.chunkSize || 500;
    const chunks = this.chunk(values, chunkSize);
    let totalInserted = 0;

    return this.transaction(async (db) => {
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const placeholders = chunk.map(() => 
          `(${columns.map(() => '?').join(',')})`
        ).join(',');
        
        const sql = `INSERT INTO ${table} (${columns.join(',')}) VALUES ${placeholders}`;
        const flatValues = chunk.flat();
        
        const result = await db.run(sql, flatValues);
        totalInserted += result.changes || 0;

        if (options.onProgress) {
          options.onProgress((i + 1) / chunks.length);
        }
      }

      return totalInserted;
    });
  }

  /**
   * Batch update with optimal chunking
   */
  public async batchUpdate(
    table: string,
    updates: Array<{ where: Record<string, any>; set: Record<string, any> }>,
    options: { chunkSize?: number } = {}
  ): Promise<number> {
    const chunkSize = options.chunkSize || 100;
    const chunks = this.chunk(updates, chunkSize);
    let totalUpdated = 0;

    return this.transaction(async (db) => {
      for (const chunk of chunks) {
        for (const update of chunk) {
          const setClauses = Object.keys(update.set)
            .map(key => `${key} = ?`)
            .join(', ');
          
          const whereClauses = Object.keys(update.where)
            .map(key => `${key} = ?`)
            .join(' AND ');
          
          const sql = `UPDATE ${table} SET ${setClauses} WHERE ${whereClauses}`;
          const values = [...Object.values(update.set), ...Object.values(update.where)];
          
          const result = await db.run(sql, values);
          totalUpdated += result.changes || 0;
        }
      }

      return totalUpdated;
    });
  }

  /**
   * Execute with prepared statement
   */
  private async executePrepared<T>(
    db: SqliteDatabase,
    sql: string,
    params: any[]
  ): Promise<T[]> {
    const stmtKey = this.generateStatementKey(sql);
    
    if (!this.preparedStatements.has(stmtKey)) {
      const stmt = await db.prepare(sql);
      this.preparedStatements.set(stmtKey, stmt);
    }

    const stmt = this.preparedStatements.get(stmtKey);
    return stmt.all(params);
  }

  /**
   * Analyze query execution plan
   */
  private async analyzeQuery(
    db: SqliteDatabase,
    sql: string,
    params: any[]
  ): Promise<any[]> {
    try {
      const plan = await db.all(`EXPLAIN QUERY PLAN ${sql}`, params);
      
      // Check for potential performance issues
      const issues: string[] = [];
      for (const step of plan) {
        if (step.detail?.includes('SCAN TABLE')) {
          issues.push(`Full table scan detected: ${step.detail}`);
        }
        if (step.detail?.includes('USING TEMPORARY')) {
          issues.push(`Temporary table used: ${step.detail}`);
        }
        if (step.detail?.includes('USING FILESORT')) {
          issues.push(`File sort required: ${step.detail}`);
        }
      }

      if (issues.length > 0) {
        this.emit('query:performance-issues', {
          sql,
          issues,
          plan
        });
      }

      return plan;
    } catch (error) {
      console.error('Failed to analyze query:', error);
      return [];
    }
  }

  /**
   * Optimize database (run periodically)
   */
  public async optimize(): Promise<void> {
    const db = await this.acquire();

    try {
      // Analyze tables for better query planning
      await db.exec('ANALYZE');
      
      // Optimize database structure
      await db.exec('PRAGMA optimize');
      
      // Vacuum if needed (this locks the database)
      const pageCount = await db.get('PRAGMA page_count');
      const freePages = await db.get('PRAGMA freelist_count');
      
      if (freePages && pageCount && freePages['freelist_count'] > pageCount['page_count'] * 0.1) {
        await db.exec('VACUUM');
        this.emit('database:vacuumed', {
          pageCount: pageCount['page_count'],
          freePages: freePages['freelist_count']
        });
      }

      // Clear old prepared statements
      this.preparedStatements.clear();
      
      this.emit('database:optimized');
    } finally {
      await this.release(db);
    }
  }

  /**
   * Get pool statistics
   */
  public getStats(): any {
    const poolStats = {
      size: this.pool.size,
      available: this.pool.available,
      borrowed: this.pool.borrowed,
      pending: this.pool.pending,
      max: this.pool.max,
      min: this.pool.min
    };

    const queryStats = this.getQueryStats();
    const avgWaitTime = this.connectionStats.waitTime.length > 0
      ? this.connectionStats.waitTime.reduce((a, b) => a + b, 0) / this.connectionStats.waitTime.length
      : 0;

    return {
      pool: poolStats,
      connections: {
        ...this.connectionStats,
        avgWaitTime,
        hitRate: this.connectionStats.acquired > 0
          ? ((this.connectionStats.acquired - this.connectionStats.created) / this.connectionStats.acquired) * 100
          : 0
      },
      queries: queryStats,
      preparedStatements: this.preparedStatements.size
    };
  }

  /**
   * Get query statistics
   */
  private getQueryStats(): any {
    const stats: any = {
      total: 0,
      cached: 0,
      slow: 0,
      avgExecutionTime: 0,
      topQueries: []
    };

    const allStats: QueryStats[] = [];
    for (const queryStats of this.queryStats.values()) {
      allStats.push(...queryStats);
    }

    stats.total = allStats.length;
    stats.cached = allStats.filter(s => s.cached).length;
    stats.slow = allStats.filter(s => s.executionTime > this.config.slowQueryThreshold).length;
    
    if (allStats.length > 0) {
      const totalTime = allStats.reduce((sum, s) => sum + s.executionTime, 0);
      stats.avgExecutionTime = totalTime / allStats.length;
    }

    // Get top 10 slowest queries
    const grouped = new Map<string, { count: number; totalTime: number; avgTime: number }>();
    for (const stat of allStats) {
      const existing = grouped.get(stat.query) || { count: 0, totalTime: 0, avgTime: 0 };
      existing.count++;
      existing.totalTime += stat.executionTime;
      existing.avgTime = existing.totalTime / existing.count;
      grouped.set(stat.query, existing);
    }

    stats.topQueries = Array.from(grouped.entries())
      .map(([query, data]) => ({ query, ...data }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 10);

    return stats;
  }

  /**
   * Helper methods
   */
  private generateQueryKey(sql: string, params: any[]): string {
    return `query:${createHash('sha256')
      .update(sql + JSON.stringify(params))
      .digest('hex')
      .substring(0, 16)}`;
  }

  private generateStatementKey(sql: string): string {
    return createHash('sha256')
      .update(sql)
      .digest('hex')
      .substring(0, 16);
  }

  private chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private recordQueryStats(
    query: string,
    executionTime: number,
    rowCount: number,
    cached: boolean
  ): void {
    if (!this.queryStats.has(query)) {
      this.queryStats.set(query, []);
    }

    const stats = this.queryStats.get(query)!;
    stats.push({
      query,
      executionTime,
      rowCount,
      cached,
      timestamp: Date.now()
    });

    // Keep only last 100 stats per query
    if (stats.length > 100) {
      stats.shift();
    }
  }

  private async acquire(): Promise<SqliteDatabase> {
    const startTime = performance.now();
    const db = await this.pool.acquire();
    
    this.connectionStats.acquired++;
    this.connectionStats.currentActive++;
    
    const waitTime = performance.now() - startTime;
    if (waitTime > 100) {
      this.emit('pool:slow-acquire', { waitTime });
    }

    return db;
  }

  private async release(db: SqliteDatabase): Promise<void> {
    await this.pool.release(db);
    this.connectionStats.released++;
    this.connectionStats.currentActive--;
  }

  private startMonitoring(): void {
    // Monitor pool health every 30 seconds
    setInterval(() => {
      const stats = this.getStats();
      this.emit('stats:update', stats);

      // Check for pool exhaustion
      if (stats.pool.available === 0 && stats.pool.pending > 0) {
        this.emit('pool:exhausted', stats.pool);
      }

      // Clear old connection wait times
      if (this.connectionStats.waitTime.length > 1000) {
        this.connectionStats.waitTime = this.connectionStats.waitTime.slice(-100);
      }
    }, 30000);

    // Run optimization periodically (every hour)
    setInterval(() => {
      this.optimize().catch(err => {
        console.error('Database optimization failed:', err);
      });
    }, 3600000);
  }

  /**
   * Graceful shutdown
   */
  public async shutdown(): Promise<void> {
    // Clear prepared statements
    for (const stmt of this.preparedStatements.values()) {
      await stmt.finalize();
    }
    this.preparedStatements.clear();

    // Drain and clear pool
    await this.pool.drain();
    await this.pool.clear();

    this.emit('shutdown');
  }
}

// Export singleton instance
let dbPool: OptimizedDatabasePool | null = null;

export function initializeDatabasePool(
  dbPath: string,
  cacheManager: RedisCacheManager,
  config?: Partial<PoolConfig>
): OptimizedDatabasePool {
  if (!dbPool) {
    dbPool = new OptimizedDatabasePool(dbPath, cacheManager, config);
  }
  return dbPool;
}

export function getDatabasePool(): OptimizedDatabasePool {
  if (!dbPool) {
    throw new Error('Database pool not initialized');
  }
  return dbPool;
}
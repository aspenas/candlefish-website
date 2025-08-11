/**
 * API Performance Optimization Strategies
 * Multi-tenant Analytics Dashboard System
 */

import { InMemoryLRUCache } from '@apollo/utils.keyvaluecache';
import DataLoader from 'dataloader';
import { Redis } from 'ioredis';
import { Pool } from 'pg';
import { ClickHouse } from 'clickhouse';

// ===========================
// 1. GraphQL Query Optimization
// ===========================

/**
 * Query Complexity Analysis with field-level cost calculation
 */
export const complexityPlugin = {
  requestDidStart() {
    return {
      didResolveOperation(requestContext: any) {
        const complexity = calculateQueryComplexity(requestContext.document);

        // Reject queries exceeding complexity threshold
        if (complexity > 1000) {
          throw new Error(`Query complexity ${complexity} exceeds maximum allowed 1000`);
        }

        // Log high complexity queries for analysis
        if (complexity > 500) {
          console.warn('High complexity query detected:', {
            complexity,
            query: requestContext.request.query,
            operationName: requestContext.operationName
          });
        }
      }
    };
  }
};

/**
 * DataLoader Pattern for N+1 Query Resolution
 */
export class OptimizedDataLoaders {
  private userLoader: DataLoader<string, any>;
  private organizationLoader: DataLoader<string, any>;
  private dashboardLoader: DataLoader<string, any>;
  private widgetLoader: DataLoader<string, any>;
  private metricsLoader: DataLoader<string, any>;

  constructor(private db: Pool, private cache: Redis) {
    // User DataLoader with Redis caching
    this.userLoader = new DataLoader(
      async (userIds) => {
        const cacheKeys = userIds.map(id => `user:${id}`);
        const cached = await this.cache.mget(...cacheKeys);

        const uncachedIds = userIds.filter((id, i) => !cached[i]);

        if (uncachedIds.length > 0) {
          const query = `
            SELECT * FROM users
            WHERE id = ANY($1::uuid[])
          `;
          const result = await this.db.query(query, [uncachedIds]);

          // Cache results with 5 minute TTL
          const pipeline = this.cache.pipeline();
          result.rows.forEach(user => {
            pipeline.setex(`user:${user.id}`, 300, JSON.stringify(user));
          });
          await pipeline.exec();

          return userIds.map(id => {
            const cachedIndex = cacheKeys.indexOf(`user:${id}`);
            if (cached[cachedIndex]) {
              return JSON.parse(cached[cachedIndex]);
            }
            return result.rows.find(u => u.id === id);
          });
        }

        return cached.map(c => c ? JSON.parse(c) : null);
      },
      { cache: true, maxBatchSize: 100 }
    );

    // Dashboard DataLoader with intelligent prefetching
    this.dashboardLoader = new DataLoader(
      async (dashboardIds) => {
        const query = `
          SELECT
            d.*,
            json_agg(DISTINCT w.*) FILTER (WHERE w.id IS NOT NULL) as widgets,
            json_agg(DISTINCT ds.*) FILTER (WHERE ds.id IS NOT NULL) as data_sources
          FROM dashboards d
          LEFT JOIN widgets w ON w.dashboard_id = d.id
          LEFT JOIN dashboard_data_sources dds ON dds.dashboard_id = d.id
          LEFT JOIN data_sources ds ON ds.id = dds.data_source_id
          WHERE d.id = ANY($1::uuid[])
          GROUP BY d.id
        `;

        const result = await this.db.query(query, [dashboardIds]);
        return dashboardIds.map(id =>
          result.rows.find(d => d.id === id)
        );
      },
      { cache: true, maxBatchSize: 50 }
    );

    // Widget DataLoader with aggregated metrics
    this.widgetLoader = new DataLoader(
      async (widgetIds) => {
        const query = `
          WITH widget_metrics AS (
            SELECT
              w.id,
              w.*,
              m.value,
              m.timestamp,
              ROW_NUMBER() OVER (PARTITION BY w.id ORDER BY m.timestamp DESC) as rn
            FROM widgets w
            LEFT JOIN metrics m ON m.widget_id = w.id
            WHERE w.id = ANY($1::uuid[])
          )
          SELECT * FROM widget_metrics WHERE rn <= 100
        `;

        const result = await this.db.query(query, [widgetIds]);

        // Group by widget ID
        const widgetMap = new Map();
        result.rows.forEach(row => {
          if (!widgetMap.has(row.id)) {
            widgetMap.set(row.id, { ...row, metrics: [] });
          }
          if (row.value !== null) {
            widgetMap.get(row.id).metrics.push({
              value: row.value,
              timestamp: row.timestamp
            });
          }
        });

        return widgetIds.map(id => widgetMap.get(id));
      },
      { cache: true, maxBatchSize: 100 }
    );

    // Metrics batch loader for time-series data
    this.metricsLoader = new DataLoader(
      async (requests: Array<{widgetId: string, timeRange: {start: Date, end: Date}}>) => {
        // Use ClickHouse for analytics queries
        const ch = new ClickHouse({
          url: process.env.CLICKHOUSE_URL,
          port: 8123,
          debug: false,
          basicAuth: {
            username: process.env.CLICKHOUSE_USER,
            password: process.env.CLICKHOUSE_PASSWORD,
          },
        });

        const queries = requests.map(req => ({
          query: `
            SELECT
              widget_id,
              toStartOfMinute(timestamp) as minute,
              avg(value) as avg_value,
              max(value) as max_value,
              min(value) as min_value,
              count() as count
            FROM metrics
            WHERE widget_id = '${req.widgetId}'
              AND timestamp >= '${req.timeRange.start.toISOString()}'
              AND timestamp <= '${req.timeRange.end.toISOString()}'
            GROUP BY widget_id, minute
            ORDER BY minute DESC
            LIMIT 1000
          `
        }));

        const results = await Promise.all(
          queries.map(q => ch.query(q.query).toPromise())
        );

        return results;
      },
      { cache: true, cacheKeyFn: (req) => `${req.widgetId}:${req.timeRange.start}:${req.timeRange.end}` }
    );
  }

  // Create context-aware loaders for each request
  createLoaders() {
    return {
      user: this.userLoader,
      organization: this.organizationLoader,
      dashboard: this.dashboardLoader,
      widget: this.widgetLoader,
      metrics: this.metricsLoader
    };
  }
}

// ===========================
// 2. Database Query Optimization
// ===========================

export class DatabaseOptimizer {
  constructor(
    private pgPool: Pool,
    private clickhouse: ClickHouse,
    private redis: Redis
  ) {}

  /**
   * Connection Pooling Configuration
   */
  static createOptimizedPool(): Pool {
    return new Pool({
      max: 20, // Maximum pool size
      min: 5,  // Minimum pool size
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      statement_timeout: 5000,
      query_timeout: 5000,
      // Enable prepared statements
      parseInputDatesAsUTC: true,
    });
  }

  /**
   * Query optimization with materialized views
   */
  async createMaterializedViews() {
    // Dashboard metrics aggregation view
    await this.pgPool.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS dashboard_metrics_daily AS
      SELECT
        dashboard_id,
        DATE(created_at) as date,
        COUNT(DISTINCT user_id) as unique_viewers,
        COUNT(*) as total_views,
        AVG(load_time_ms) as avg_load_time,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY load_time_ms) as median_load_time,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY load_time_ms) as p95_load_time
      FROM dashboard_views
      GROUP BY dashboard_id, DATE(created_at)
      WITH DATA;

      CREATE UNIQUE INDEX ON dashboard_metrics_daily (dashboard_id, date);
    `);

    // Widget performance metrics view
    await this.pgPool.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS widget_performance_hourly AS
      SELECT
        widget_id,
        DATE_TRUNC('hour', timestamp) as hour,
        COUNT(*) as query_count,
        AVG(execution_time_ms) as avg_execution_time,
        MAX(execution_time_ms) as max_execution_time,
        SUM(CASE WHEN error IS NOT NULL THEN 1 ELSE 0 END) as error_count
      FROM widget_queries
      GROUP BY widget_id, DATE_TRUNC('hour', timestamp)
      WITH DATA;

      CREATE UNIQUE INDEX ON widget_performance_hourly (widget_id, hour);
    `);

    // Refresh materialized views periodically
    setInterval(async () => {
      await this.pgPool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_metrics_daily');
      await this.pgPool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY widget_performance_hourly');
    }, 300000); // Refresh every 5 minutes
  }

  /**
   * Optimized query patterns with proper indexing
   */
  async createOptimizedIndexes() {
    const indexes = [
      // Composite indexes for common queries
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dashboards_org_visibility ON dashboards(organization_id, visibility) WHERE deleted_at IS NULL',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_widgets_dashboard_position ON widgets(dashboard_id, position_row, position_col) WHERE deleted_at IS NULL',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metrics_widget_time ON metrics(widget_id, timestamp DESC)',

      // Partial indexes for filtered queries
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dashboards_public ON dashboards(public_token) WHERE is_public = true',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_widgets_status_error ON widgets(dashboard_id, status) WHERE status = \'ERROR\'',

      // BRIN indexes for time-series data
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metrics_timestamp_brin ON metrics USING BRIN(timestamp)',

      // GIN indexes for JSONB columns
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_widgets_config_gin ON widgets USING GIN(config)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dashboards_filters_gin ON dashboards USING GIN(filters)',

      // Covering indexes for read-heavy queries
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_covering ON users(id) INCLUDE (email, name, avatar_url)',
    ];

    for (const index of indexes) {
      try {
        await this.pgPool.query(index);
      } catch (error) {
        console.error(`Failed to create index: ${index}`, error);
      }
    }
  }

  /**
   * Query result caching with intelligent TTL
   */
  async cachedQuery<T>(
    key: string,
    query: string,
    params: any[],
    ttl: number = 300
  ): Promise<T> {
    // Check cache first
    const cached = await this.redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }

    // Execute query
    const result = await this.pgPool.query(query, params);

    // Cache result with appropriate TTL
    await this.redis.setex(key, ttl, JSON.stringify(result.rows));

    return result.rows as T;
  }

  /**
   * Parallel query execution for independent data
   */
  async parallelQueries(queries: Array<{query: string, params: any[]}>) {
    const promises = queries.map(q =>
      this.pgPool.query(q.query, q.params)
    );

    const results = await Promise.allSettled(promises);

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return { success: true, data: result.value.rows };
      } else {
        console.error(`Query ${index} failed:`, result.reason);
        return { success: false, error: result.reason };
      }
    });
  }
}

// ===========================
// 3. Redis Caching Strategies
// ===========================

export class CacheManager {
  private redis: Redis;
  private cachePatterns: Map<string, CacheStrategy>;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: 0,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });

    this.setupCachePatterns();
  }

  private setupCachePatterns() {
    this.cachePatterns = new Map([
      // User session cache - 1 hour TTL
      ['session', { ttl: 3600, prefix: 'session:', strategy: 'LRU' }],

      // Dashboard config cache - 5 minutes TTL
      ['dashboard', { ttl: 300, prefix: 'dashboard:', strategy: 'LFU' }],

      // Widget data cache - 1 minute TTL for real-time
      ['widget:realtime', { ttl: 60, prefix: 'widget:rt:', strategy: 'TTL' }],

      // Widget data cache - 5 minutes TTL for standard
      ['widget:standard', { ttl: 300, prefix: 'widget:std:', strategy: 'LRU' }],

      // Aggregated metrics cache - 15 minutes TTL
      ['metrics:aggregated', { ttl: 900, prefix: 'metrics:agg:', strategy: 'LFU' }],

      // User permissions cache - 10 minutes TTL
      ['permissions', { ttl: 600, prefix: 'perms:', strategy: 'LRU' }],

      // API response cache - 2 minutes TTL
      ['api:response', { ttl: 120, prefix: 'api:', strategy: 'LRU' }],
    ]);
  }

  /**
   * Multi-layer caching with fallback
   */
  async multiLayerCache<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: { l1Ttl?: number, l2Ttl?: number } = {}
  ): Promise<T> {
    const l1Key = `l1:${key}`;
    const l2Key = `l2:${key}`;

    // Try L1 cache (Redis - hot data)
    const l1Cache = await this.redis.get(l1Key);
    if (l1Cache) {
      // Async refresh if near expiry
      const ttl = await this.redis.ttl(l1Key);
      if (ttl < 30) {
        this.refreshCache(key, fetchFn, options);
      }
      return JSON.parse(l1Cache);
    }

    // Try L2 cache (Redis - warm data)
    const l2Cache = await this.redis.get(l2Key);
    if (l2Cache) {
      // Promote to L1
      await this.redis.setex(l1Key, options.l1Ttl || 60, l2Cache);
      return JSON.parse(l2Cache);
    }

    // Fetch from source
    const data = await fetchFn();

    // Store in both layers
    const serialized = JSON.stringify(data);
    await Promise.all([
      this.redis.setex(l1Key, options.l1Ttl || 60, serialized),
      this.redis.setex(l2Key, options.l2Ttl || 300, serialized),
    ]);

    return data;
  }

  /**
   * Cache warming for frequently accessed data
   */
  async warmCache() {
    console.log('Starting cache warming...');

    // Warm popular dashboards
    const popularDashboards = await this.getPopularDashboards();
    for (const dashboard of popularDashboards) {
      await this.cacheDashboard(dashboard.id);
    }

    // Warm organization data
    const activeOrgs = await this.getActiveOrganizations();
    for (const org of activeOrgs) {
      await this.cacheOrganization(org.id);
    }

    console.log('Cache warming completed');
  }

  /**
   * Intelligent cache invalidation
   */
  async invalidateCache(pattern: string, options: { cascade?: boolean } = {}) {
    const keys = await this.redis.keys(pattern);

    if (keys.length > 0) {
      // Use pipeline for batch deletion
      const pipeline = this.redis.pipeline();
      keys.forEach(key => pipeline.del(key));
      await pipeline.exec();

      // Cascade invalidation for related caches
      if (options.cascade) {
        await this.cascadeInvalidation(pattern);
      }
    }
  }

  private async cascadeInvalidation(pattern: string) {
    // Define invalidation relationships
    const cascadeMap = new Map([
      ['dashboard:*', ['widget:*', 'metrics:*']],
      ['organization:*', ['dashboard:*', 'permissions:*']],
      ['user:*', ['session:*', 'permissions:*']],
    ]);

    for (const [key, dependencies] of cascadeMap) {
      if (pattern.includes(key.replace('*', ''))) {
        for (const dep of dependencies) {
          await this.invalidateCache(dep);
        }
      }
    }
  }

  private async refreshCache<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: { l1Ttl?: number, l2Ttl?: number }
  ) {
    try {
      const data = await fetchFn();
      const serialized = JSON.stringify(data);
      await Promise.all([
        this.redis.setex(`l1:${key}`, options.l1Ttl || 60, serialized),
        this.redis.setex(`l2:${key}`, options.l2Ttl || 300, serialized),
      ]);
    } catch (error) {
      console.error(`Cache refresh failed for ${key}:`, error);
    }
  }

  private async getPopularDashboards() {
    // Implementation would query for most viewed dashboards
    return [];
  }

  private async getActiveOrganizations() {
    // Implementation would query for recently active organizations
    return [];
  }

  private async cacheDashboard(id: string) {
    // Implementation would pre-cache dashboard data
  }

  private async cacheOrganization(id: string) {
    // Implementation would pre-cache organization data
  }
}

// ===========================
// 4. Performance Metrics
// ===========================

export interface PerformanceMetrics {
  api: {
    avgResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    requestsPerSecond: number;
    errorRate: number;
  };
  database: {
    avgQueryTime: number;
    slowQueries: number;
    connectionPoolUtilization: number;
    deadlocks: number;
  };
  cache: {
    hitRate: number;
    missRate: number;
    evictionRate: number;
    memoryUsage: number;
  };
  graphql: {
    avgComplexity: number;
    avgResolverTime: number;
    errorRate: number;
    deprecatedFieldUsage: number;
  };
}

interface CacheStrategy {
  ttl: number;
  prefix: string;
  strategy: 'LRU' | 'LFU' | 'TTL';
}

function calculateQueryComplexity(document: any): number {
  // Implementation would calculate complexity based on query structure
  return 100; // Placeholder
}

export default {
  complexityPlugin,
  OptimizedDataLoaders,
  DatabaseOptimizer,
  CacheManager,
};

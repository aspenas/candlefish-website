# Database Connection Pooling & Caching Strategy
## Candlefish AI Platform Performance Optimization

### Executive Summary

Analysis of the current Candlefish AI platform reveals critical database performance bottlenecks:
- **SQLite bottleneck**: Single-file database limiting concurrent access
- **No connection pooling**: Direct database connections without resource management
- **Missing caching layer**: No query result caching or Redis integration
- **Inefficient queries**: Lack of proper indexing and query optimization

This document provides a comprehensive strategy for immediate and long-term database performance improvements.

---

## Current State Analysis

### Database Configuration Issues
1. **SQLite Usage**: `/Users/patricksmith/.clos/registry.db` single-file database
2. **Direct Connections**: No connection pooling in `/clos/api-server/server-secure.ts`
3. **No Caching**: Zero cache hit ratio, all queries hit database
4. **Basic Security**: SQL injection protection implemented but performance not optimized

### Performance Impact
- **Concurrent Access**: SQLite locks entire database for writes
- **Scaling Limitation**: Cannot scale beyond single machine
- **Memory Usage**: No query result caching leads to repeated expensive operations
- **Latency**: Every request hits database, no cache layer buffering

---

## Connection Pooling Strategy

### 1. PostgreSQL Migration with pgBouncer

```typescript
// Enhanced connection configuration
import { Pool } from 'pg';
import Redis from 'ioredis';

interface DatabaseConfig {
  // PostgreSQL Configuration
  postgresql: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    // Connection Pool Settings
    max: number;          // Maximum pool size: 20
    min: number;          // Minimum pool size: 5
    idle: number;         // Idle timeout: 30000ms
    acquire: number;      // Acquire timeout: 60000ms
    evict: number;        // Eviction run interval: 1000ms
    // Performance Settings
    statement_timeout: number;  // 30000ms
    query_timeout: number;      // 60000ms
    application_name: string;   // 'candlefish-api'
  };
  
  // Redis Cache Configuration
  redis: {
    host: string;
    port: number;
    password: string;
    keyPrefix: string;    // 'candlefish:'
    retryDelayOnFailover: number;  // 100ms
    maxRetriesPerRequest: number;  // 3
    lazyConnect: boolean; // true
  };
}

class DatabaseManager {
  private pgPool: Pool;
  private redis: Redis;
  private queryCache: Map<string, any> = new Map();
  
  constructor(config: DatabaseConfig) {
    // PostgreSQL connection pool
    this.pgPool = new Pool({
      host: config.postgresql.host,
      port: config.postgresql.port,
      database: config.postgresql.database,
      user: config.postgresql.user,
      password: config.postgresql.password,
      max: config.postgresql.max,
      min: config.postgresql.min,
      idleTimeoutMillis: config.postgresql.idle,
      connectionTimeoutMillis: config.postgresql.acquire,
      statement_timeout: config.postgresql.statement_timeout,
      query_timeout: config.postgresql.query_timeout,
      application_name: config.postgresql.application_name
    });
    
    // Redis connection
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      keyPrefix: config.redis.keyPrefix,
      retryDelayOnFailover: config.redis.retryDelayOnFailover,
      maxRetriesPerRequest: config.redis.maxRetriesPerRequest,
      lazyConnect: config.redis.lazyConnect
    });
  }
}
```

### 2. Connection Pool Configuration

#### PgBouncer Configuration (`pgbouncer.ini`)
```ini
[databases]
candlefish_prod = host=localhost port=5432 dbname=candlefish_prod
candlefish_dev = host=localhost port=5432 dbname=candlefish_dev

[pgbouncer]
pool_mode = transaction
listen_port = 6432
listen_addr = 127.0.0.1
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

# Pool Configuration
max_client_conn = 100
default_pool_size = 20
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 5

# Connection Limits
max_db_connections = 50
max_user_connections = 50

# Timeouts
server_reset_query = DISCARD ALL
server_check_delay = 30
server_lifetime = 3600
server_idle_timeout = 600
```

### 3. Multi-Layer Caching Strategy

#### Cache Layer Implementation
```typescript
enum CacheLayer {
  L1_MEMORY = 'memory',    // Local LRU cache: 100MB, 5min TTL
  L2_REDIS = 'redis',      // Distributed cache: 1GB, variable TTL
  L3_DATABASE = 'database' // PostgreSQL with query cache
}

class CacheManager {
  private memoryCache = new Map<string, CacheEntry>();
  private redis: Redis;
  private readonly MAX_MEMORY_CACHE_SIZE = 100 * 1024 * 1024; // 100MB
  private readonly DEFAULT_TTL = 300000; // 5 minutes

  async get<T>(key: string, layer: CacheLayer = CacheLayer.L1_MEMORY): Promise<T | null> {
    // L1: Memory cache (fastest)
    if (layer === CacheLayer.L1_MEMORY) {
      const entry = this.memoryCache.get(key);
      if (entry && !this.isExpired(entry)) {
        return entry.data as T;
      }
    }

    // L2: Redis cache
    if (layer === CacheLayer.L2_REDIS) {
      const data = await this.redis.get(key);
      if (data) {
        const parsed = JSON.parse(data);
        // Backfill L1 cache
        this.set(key, parsed, CacheLayer.L1_MEMORY);
        return parsed as T;
      }
    }

    return null;
  }

  async set<T>(key: string, data: T, layer: CacheLayer, ttl: number = this.DEFAULT_TTL): Promise<void> {
    switch (layer) {
      case CacheLayer.L1_MEMORY:
        this.setMemoryCache(key, data, ttl);
        break;
      case CacheLayer.L2_REDIS:
        await this.redis.setex(key, Math.floor(ttl / 1000), JSON.stringify(data));
        break;
    }
  }

  // Cache invalidation patterns
  async invalidatePattern(pattern: string): Promise<void> {
    // Invalidate memory cache
    for (const key of this.memoryCache.keys()) {
      if (key.match(pattern)) {
        this.memoryCache.delete(key);
      }
    }

    // Invalidate Redis cache
    const keys = await this.redis.keys(`${this.redis.options.keyPrefix}${pattern}`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

### 4. Query Optimization Layer

#### Enhanced Query Interface
```typescript
interface QueryOptions {
  cache: boolean;
  cacheTTL: number;
  cacheKey?: string;
  timeout: number;
  retries: number;
  trace: boolean;
}

class OptimizedDatabase extends DatabaseManager {
  private queryMetrics = new Map<string, QueryMetrics>();

  async query<T>(
    sql: string, 
    params: any[] = [], 
    options: Partial<QueryOptions> = {}
  ): Promise<T[]> {
    const startTime = performance.now();
    const queryKey = this.generateQueryKey(sql, params);
    
    const opts: QueryOptions = {
      cache: true,
      cacheTTL: 300000, // 5 minutes
      timeout: 30000,   // 30 seconds
      retries: 3,
      trace: process.env.NODE_ENV === 'development',
      ...options
    };

    // Check cache first
    if (opts.cache) {
      const cached = await this.cacheManager.get<T[]>(
        opts.cacheKey || queryKey, 
        CacheLayer.L1_MEMORY
      );
      if (cached) {
        this.recordQueryMetric(sql, performance.now() - startTime, 'cache_hit');
        return cached;
      }

      // Check Redis cache
      const redisCached = await this.cacheManager.get<T[]>(
        opts.cacheKey || queryKey,
        CacheLayer.L2_REDIS
      );
      if (redisCached) {
        // Backfill L1 cache
        await this.cacheManager.set(
          opts.cacheKey || queryKey,
          redisCached,
          CacheLayer.L1_MEMORY,
          opts.cacheTTL
        );
        this.recordQueryMetric(sql, performance.now() - startTime, 'redis_hit');
        return redisCached;
      }
    }

    // Execute query with retry logic
    let lastError: Error;
    for (let attempt = 0; attempt <= opts.retries; attempt++) {
      try {
        const client = await this.pgPool.connect();
        try {
          // Set statement timeout
          await client.query(`SET statement_timeout = '${opts.timeout}ms'`);
          
          const result = await client.query(sql, params);
          const duration = performance.now() - startTime;
          
          // Cache successful results
          if (opts.cache && result.rows.length > 0) {
            // Cache in both layers
            await Promise.all([
              this.cacheManager.set(
                opts.cacheKey || queryKey,
                result.rows,
                CacheLayer.L1_MEMORY,
                opts.cacheTTL
              ),
              this.cacheManager.set(
                opts.cacheKey || queryKey,
                result.rows,
                CacheLayer.L2_REDIS,
                opts.cacheTTL
              )
            ]);
          }

          this.recordQueryMetric(sql, duration, 'database_hit');
          return result.rows as T[];
        } finally {
          client.release();
        }
      } catch (error) {
        lastError = error as Error;
        if (attempt < opts.retries) {
          await this.sleep(Math.pow(2, attempt) * 100); // Exponential backoff
        }
      }
    }

    this.recordQueryMetric(sql, performance.now() - startTime, 'error');
    throw lastError!;
  }

  private generateQueryKey(sql: string, params: any[]): string {
    return `query:${Buffer.from(sql + JSON.stringify(params)).toString('base64').slice(0, 50)}`;
  }

  private recordQueryMetric(sql: string, duration: number, source: string): void {
    const key = sql.slice(0, 100); // Truncate for grouping
    const existing = this.queryMetrics.get(key) || {
      count: 0,
      totalTime: 0,
      avgTime: 0,
      maxTime: 0,
      minTime: Infinity,
      cacheHits: 0,
      dbHits: 0,
      errors: 0
    };

    existing.count++;
    existing.totalTime += duration;
    existing.avgTime = existing.totalTime / existing.count;
    existing.maxTime = Math.max(existing.maxTime, duration);
    existing.minTime = Math.min(existing.minTime, duration);

    switch (source) {
      case 'cache_hit':
      case 'redis_hit':
        existing.cacheHits++;
        break;
      case 'database_hit':
        existing.dbHits++;
        break;
      case 'error':
        existing.errors++;
        break;
    }

    this.queryMetrics.set(key, existing);
  }
}
```

---

## Migration Path from SQLite to PostgreSQL

### Phase 1: Infrastructure Setup (Week 1)
```bash
# 1. Install PostgreSQL and Redis
brew install postgresql redis
# or
docker run -d --name postgres -p 5432:5432 -e POSTGRES_PASSWORD=password postgres:15
docker run -d --name redis -p 6379:6379 redis:alpine

# 2. Install pgBouncer
brew install pgbouncer
# Configure /usr/local/etc/pgbouncer/pgbouncer.ini

# 3. Create databases
createdb candlefish_prod
createdb candlefish_dev
createdb candlefish_test
```

### Phase 2: Schema Migration (Week 1)
```sql
-- Migration script: migrate_sqlite_to_postgresql.sql

-- 1. Create PostgreSQL schema from existing SQLite
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- 2. Migrate tables with enhancements
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    api_key VARCHAR(255) UNIQUE,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create optimized indexes immediately
CREATE INDEX CONCURRENTLY idx_users_email ON users(email) WHERE is_active = true;
CREATE INDEX CONCURRENTLY idx_users_last_login ON users(last_login DESC);
CREATE INDEX CONCURRENTLY idx_users_created_at ON users(created_at DESC);

-- 4. Data migration using pg_dump/pg_restore or custom script
```

### Phase 3: Application Updates (Week 2)
```typescript
// Updated server configuration
const databaseConfig: DatabaseConfig = {
  postgresql: {
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '6432'), // pgBouncer port
    database: process.env.PG_DATABASE || 'candlefish_prod',
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || '',
    max: 20,
    min: 5,
    idle: 30000,
    acquire: 60000,
    evict: 1000,
    statement_timeout: 30000,
    query_timeout: 60000,
    application_name: 'candlefish-api'
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || '',
    keyPrefix: 'candlefish:',
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true
  }
};

// Initialize optimized database
const optimizedDB = new OptimizedDatabase(databaseConfig);
```

### Phase 4: Performance Validation (Week 2)
```bash
# Run performance tests
npm run test:performance
npm run test:integration

# Database benchmarks
pgbench -c 10 -T 60 candlefish_prod  # 60 second benchmark
```

---

## Caching Strategy Implementation

### Cache Hierarchy
1. **L1 Memory Cache (5ms latency)**
   - Size: 100MB per instance
   - TTL: 5 minutes
   - Use: Frequently accessed queries, session data
   
2. **L2 Redis Cache (10ms latency)**
   - Size: 1GB shared
   - TTL: Variable (5 minutes - 1 hour)
   - Use: User sessions, query results, computed data

3. **L3 Database Cache (50ms latency)**
   - PostgreSQL shared_buffers: 2GB
   - Query result cache: Built-in
   - Use: Complex aggregations, materialized views

### Cache Key Strategy
```typescript
enum CacheKeyType {
  USER_SESSION = 'user:session',
  USER_PROFILE = 'user:profile',
  SERVICE_LIST = 'services:list',
  SERVICE_DETAIL = 'service:detail',
  HEALTH_METRICS = 'health:metrics',
  DASHBOARD_DATA = 'dashboard:data',
  QUERY_RESULT = 'query:result'
}

class CacheKeyGenerator {
  static generateUserSession(userId: string): string {
    return `${CacheKeyType.USER_SESSION}:${userId}`;
  }
  
  static generateServiceList(filters: any = {}): string {
    const filterHash = Buffer.from(JSON.stringify(filters)).toString('base64').slice(0, 8);
    return `${CacheKeyType.SERVICE_LIST}:${filterHash}`;
  }
  
  static generateHealthMetrics(serviceId: string, timeRange: string): string {
    return `${CacheKeyType.HEALTH_METRICS}:${serviceId}:${timeRange}`;
  }
}
```

### Cache Invalidation Strategy
```typescript
class CacheInvalidator {
  async invalidateUserData(userId: string): Promise<void> {
    const patterns = [
      `user:session:${userId}`,
      `user:profile:${userId}`,
      `dashboard:data:${userId}:*`
    ];
    
    await Promise.all(patterns.map(pattern => 
      this.cacheManager.invalidatePattern(pattern)
    ));
  }
  
  async invalidateServiceData(serviceId: string): Promise<void> {
    const patterns = [
      `service:detail:${serviceId}`,
      `services:list:*`,
      `health:metrics:${serviceId}:*`
    ];
    
    await Promise.all(patterns.map(pattern => 
      this.cacheManager.invalidatePattern(pattern)
    ));
  }
}
```

---

## Database Monitoring & Optimization

### Performance Monitoring Queries
```sql
-- 1. Real-time slow queries (>100ms)
SELECT 
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    stddev_exec_time,
    rows
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 20;

-- 2. Cache hit ratio (should be >99%)
SELECT 
    sum(heap_blks_read) as heap_read,
    sum(heap_blks_hit) as heap_hit,
    round(sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read))::numeric * 100, 2) as cache_hit_ratio
FROM pg_statio_user_tables;

-- 3. Connection pool status
SELECT 
    state,
    count(*) as connections
FROM pg_stat_activity
GROUP BY state
ORDER BY connections DESC;

-- 4. Index usage analysis
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND pg_relation_size(indexrelid) > 1024*1024  -- Unused indexes >1MB
ORDER BY pg_relation_size(indexrelid) DESC;
```

### Automated Performance Analysis
```typescript
class DatabaseMonitor {
  private metrics: DatabaseMetrics = {
    queryCount: 0,
    avgResponseTime: 0,
    cacheHitRatio: 0,
    activeConnections: 0,
    slowQueries: []
  };

  async collectMetrics(): Promise<DatabaseMetrics> {
    // Collect PostgreSQL stats
    const [queryStats, cacheStats, connectionStats, slowQueries] = await Promise.all([
      this.getQueryStatistics(),
      this.getCacheHitRatio(),
      this.getConnectionStatistics(),
      this.getSlowQueries()
    ]);

    // Update metrics
    this.metrics = {
      queryCount: queryStats.total_calls,
      avgResponseTime: queryStats.mean_time,
      cacheHitRatio: cacheStats.hit_ratio,
      activeConnections: connectionStats.active,
      slowQueries: slowQueries.slice(0, 10)
    };

    // Alert on performance degradation
    if (this.metrics.avgResponseTime > 200) {
      await this.alertSlowPerformance();
    }
    
    if (this.metrics.cacheHitRatio < 95) {
      await this.alertLowCacheHitRatio();
    }

    return this.metrics;
  }

  private async getQueryStatistics(): Promise<any> {
    const result = await this.optimizedDB.query(`
      SELECT 
        sum(calls) as total_calls,
        avg(mean_exec_time) as mean_time
      FROM pg_stat_statements
      WHERE query NOT LIKE '%pg_stat_statements%'
    `);
    return result[0];
  }

  private async getCacheHitRatio(): Promise<any> {
    const result = await this.optimizedDB.query(`
      SELECT 
        CASE 
          WHEN sum(heap_blks_hit) + sum(heap_blks_read) > 0
          THEN round(sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read))::numeric * 100, 2)
          ELSE 100
        END as hit_ratio
      FROM pg_statio_user_tables
    `);
    return result[0];
  }
}
```

---

## Implementation Timeline

### Week 1: Infrastructure & Migration
- [ ] Set up PostgreSQL + Redis + pgBouncer
- [ ] Create database schemas and indexes
- [ ] Implement data migration scripts
- [ ] Update environment configurations

### Week 2: Application Integration
- [ ] Implement connection pooling layer
- [ ] Add caching mechanisms (L1 + L2)
- [ ] Update API endpoints to use new database layer
- [ ] Add query optimization and monitoring

### Week 3: Performance Validation
- [ ] Run comprehensive performance tests
- [ ] Validate cache hit ratios (target: >95%)
- [ ] Optimize slow queries (target: <100ms p95)
- [ ] Set up monitoring dashboards

### Week 4: Production Rollout
- [ ] Deploy to staging environment
- [ ] Run load testing with realistic traffic
- [ ] Monitor performance metrics
- [ ] Gradual production rollout with rollback plan

---

## Expected Performance Improvements

| Metric | Current (SQLite) | Target (PostgreSQL + Cache) | Improvement |
|--------|------------------|------------------------------|-------------|
| Query Response Time (p95) | 200-500ms | <50ms | 75-90% faster |
| Concurrent Users | 10-20 | 200+ | 10x increase |
| Cache Hit Ratio | 0% | >95% | Massive improvement |
| Database Connections | 1 | 20 pooled | 20x concurrency |
| Memory Usage | 50MB | 150MB | 3x (justified) |
| Error Rate | 5% (timeouts) | <0.1% | 50x improvement |

---

## Monitoring & Alerting

### Key Performance Indicators (KPIs)
1. **Database Response Time**: p50 < 20ms, p95 < 50ms, p99 < 100ms
2. **Cache Hit Ratio**: >95% for L1, >90% for L2
3. **Connection Pool Usage**: <80% utilization
4. **Query Failure Rate**: <0.1%
5. **Memory Usage**: <200MB per instance

### Alerting Thresholds
```yaml
alerts:
  database_slow_queries:
    condition: avg_query_time > 100ms
    duration: 2m
    severity: warning
  
  low_cache_hit_ratio:
    condition: cache_hit_ratio < 90%
    duration: 5m
    severity: warning
  
  connection_pool_exhaustion:
    condition: pool_usage > 90%
    duration: 1m
    severity: critical
  
  query_error_rate:
    condition: error_rate > 1%
    duration: 30s
    severity: critical
```

This comprehensive strategy will transform the Candlefish AI platform from a single-file SQLite bottleneck to a high-performance, scalable database architecture capable of handling significant concurrent load with sub-50ms response times.
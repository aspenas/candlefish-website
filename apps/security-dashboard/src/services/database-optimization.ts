/**
 * Database Optimization Service
 * Handles performance optimizations for TimescaleDB, Neo4j, and Redis
 * Designed to handle 10M+ events per day
 */

import { Pool, PoolConfig } from 'pg';
import { Driver, auth as neo4jAuth, Config as Neo4jConfig } from 'neo4j-driver';
import Redis from 'ioredis';
import { createHash } from 'crypto';

// ====================
// TimescaleDB Optimization
// ====================

export interface TimescaleDBConfig extends PoolConfig {
  // Connection pooling
  max?: number;                    // Maximum connections
  min?: number;                    // Minimum connections
  idleTimeoutMillis?: number;      // Idle timeout
  connectionTimeoutMillis?: number; // Connection timeout
  
  // Performance tuning
  statement_timeout?: string;       // Query timeout
  lock_timeout?: string;            // Lock timeout
  idle_in_transaction_session_timeout?: string;
}

export class TimescaleDBOptimizer {
  private pool: Pool;
  private queryCache: Map<string, { result: any; timestamp: number }>;
  private cacheExpiry = 5000; // 5 seconds for real-time data

  constructor(config: TimescaleDBConfig) {
    // Optimized connection pool settings
    this.pool = new Pool({
      ...config,
      max: config.max || 100,              // High connection pool for 10M events
      min: config.min || 20,               // Keep warm connections
      idleTimeoutMillis: config.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: config.connectionTimeoutMillis || 5000,
      statement_timeout: config.statement_timeout || '30s',
      lock_timeout: config.lock_timeout || '5s',
      idle_in_transaction_session_timeout: config.idle_in_transaction_session_timeout || '60s',
    });

    this.queryCache = new Map();
    this.setupOptimizations();
  }

  private async setupOptimizations() {
    const client = await this.pool.connect();
    
    try {
      // Create hypertables for time-series data
      await client.query(`
        SELECT create_hypertable('security_events', 'timestamp',
          chunk_time_interval => INTERVAL '1 day',
          if_not_exists => TRUE
        );
      `);

      // Add compression policy for older data
      await client.query(`
        ALTER TABLE security_events SET (
          timescaledb.compress,
          timescaledb.compress_segmentby = 'event_type, severity',
          timescaledb.compress_orderby = 'timestamp DESC'
        );
      `);

      await client.query(`
        SELECT add_compression_policy('security_events', INTERVAL '7 days');
      `);

      // Create continuous aggregates for real-time metrics
      await client.query(`
        CREATE MATERIALIZED VIEW IF NOT EXISTS security_metrics_hourly
        WITH (timescaledb.continuous) AS
        SELECT 
          time_bucket('1 hour', timestamp) AS hour,
          event_type,
          severity,
          COUNT(*) as event_count,
          AVG(response_time_ms) as avg_response_time,
          MAX(response_time_ms) as max_response_time,
          MIN(response_time_ms) as min_response_time
        FROM security_events
        GROUP BY hour, event_type, severity
        WITH NO DATA;
      `);

      // Add refresh policy
      await client.query(`
        SELECT add_continuous_aggregate_policy('security_metrics_hourly',
          start_offset => INTERVAL '3 hours',
          end_offset => INTERVAL '1 hour',
          schedule_interval => INTERVAL '30 minutes'
        );
      `);

      // Create optimized indexes
      await client.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_timestamp_brin 
        ON security_events USING BRIN (timestamp) WITH (pages_per_range = 128);
        
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_type_severity 
        ON security_events (event_type, severity) 
        WHERE severity IN ('critical', 'high');
        
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_source_ip 
        ON security_events USING HASH (source_ip);
      `);

      // Optimize for parallel queries
      await client.query(`
        ALTER TABLE security_events SET (parallel_workers = 8);
      `);

      console.log('TimescaleDB optimizations applied successfully');
    } finally {
      client.release();
    }
  }

  async executeQuery(query: string, params?: any[], useCache = true): Promise<any> {
    // Generate cache key
    const cacheKey = createHash('md5')
      .update(query + JSON.stringify(params || []))
      .digest('hex');

    // Check cache
    if (useCache && this.queryCache.has(cacheKey)) {
      const cached = this.queryCache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.result;
      }
    }

    // Execute query with automatic retry
    let retries = 3;
    let lastError: Error | null = null;

    while (retries > 0) {
      try {
        const result = await this.pool.query(query, params);
        
        // Cache result
        if (useCache) {
          this.queryCache.set(cacheKey, {
            result: result.rows,
            timestamp: Date.now(),
          });
        }

        return result.rows;
      } catch (error) {
        lastError = error as Error;
        retries--;
        
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)));
        }
      }
    }

    throw lastError;
  }

  async batchInsert(events: any[]): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Use COPY for bulk insert
      const copyQuery = `
        COPY security_events (
          id, timestamp, event_type, severity, source_ip, 
          destination_ip, protocol, payload, response_time_ms
        ) FROM STDIN WITH (FORMAT csv, HEADER false)
      `;

      const stream = client.query(copyQuery);
      
      for (const event of events) {
        const row = [
          event.id,
          event.timestamp,
          event.event_type,
          event.severity,
          event.source_ip,
          event.destination_ip,
          event.protocol,
          JSON.stringify(event.payload),
          event.response_time_ms || 0,
        ].join(',') + '\n';
        
        stream.write(row);
      }

      stream.end();
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getMetrics(): Promise<any> {
    const metrics = await this.pool.query(`
      SELECT
        (SELECT COUNT(*) FROM security_events WHERE timestamp > NOW() - INTERVAL '1 hour') as events_last_hour,
        (SELECT COUNT(*) FROM security_events WHERE timestamp > NOW() - INTERVAL '24 hours') as events_last_day,
        (SELECT pg_size_pretty(pg_total_relation_size('security_events'))) as table_size,
        (SELECT COUNT(*) FROM pg_stat_activity WHERE datname = current_database()) as active_connections,
        (SELECT MAX(now() - query_start) FROM pg_stat_activity WHERE state = 'active') as longest_query_duration
    `);

    return metrics.rows[0];
  }

  async cleanup(): Promise<void> {
    await this.pool.end();
  }
}

// ====================
// Neo4j Graph Optimization
// ====================

export interface Neo4jOptimizedConfig extends Neo4jConfig {
  maxConnectionPoolSize?: number;
  connectionAcquisitionTimeout?: number;
  maxTransactionRetryTime?: number;
}

export class Neo4jOptimizer {
  private driver: Driver;
  private queryCache: Map<string, { result: any; timestamp: number }>;
  private cacheExpiry = 10000; // 10 seconds for graph data

  constructor(config: Neo4jOptimizedConfig) {
    this.driver = neo4j.driver(
      config.url || 'bolt://localhost:7687',
      neo4jAuth.basic(config.username || 'neo4j', config.password || 'password'),
      {
        maxConnectionPoolSize: config.maxConnectionPoolSize || 100,
        connectionAcquisitionTimeout: config.connectionAcquisitionTimeout || 60000,
        maxTransactionRetryTime: config.maxTransactionRetryTime || 30000,
        logging: {
          level: 'info',
          logger: (level, message) => console.log(`Neo4j [${level}]: ${message}`),
        },
      }
    );

    this.queryCache = new Map();
    this.setupOptimizations();
  }

  private async setupOptimizations() {
    const session = this.driver.session();
    
    try {
      // Create indexes for better performance
      await session.run(`
        CREATE INDEX IF NOT EXISTS FOR (n:SecurityEvent) ON (n.id, n.timestamp)
      `);

      await session.run(`
        CREATE INDEX IF NOT EXISTS FOR (n:Asset) ON (n.id, n.criticality)
      `);

      await session.run(`
        CREATE INDEX IF NOT EXISTS FOR (r:TARGETS) ON (r.timestamp)
      `);

      // Create composite indexes
      await session.run(`
        CREATE INDEX IF NOT EXISTS FOR (n:Threat) ON (n.type, n.severity, n.active)
      `);

      // Set up constraints
      await session.run(`
        CREATE CONSTRAINT IF NOT EXISTS FOR (n:SecurityEvent) REQUIRE n.id IS UNIQUE
      `);

      await session.run(`
        CREATE CONSTRAINT IF NOT EXISTS FOR (n:Asset) REQUIRE n.id IS UNIQUE
      `);

      console.log('Neo4j optimizations applied successfully');
    } finally {
      await session.close();
    }
  }

  async findAttackPaths(sourceIp: string, maxDepth = 5): Promise<any[]> {
    const cacheKey = `attack_paths_${sourceIp}_${maxDepth}`;
    
    // Check cache
    const cached = this.queryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.result;
    }

    const session = this.driver.session();
    
    try {
      const result = await session.run(
        `
        MATCH path = (source:Asset {ip: $sourceIp})-[*1..${maxDepth}]->(target:Asset)
        WHERE ALL(r IN relationships(path) WHERE r.risk_score > 0.5)
        WITH path, 
             REDUCE(risk = 1.0, r IN relationships(path) | risk * r.risk_score) AS total_risk
        WHERE total_risk > 0.3
        RETURN path, total_risk
        ORDER BY total_risk DESC
        LIMIT 10
        `,
        { sourceIp }
      );

      const paths = result.records.map(record => ({
        path: record.get('path'),
        risk: record.get('total_risk'),
      }));

      // Cache result
      this.queryCache.set(cacheKey, { result: paths, timestamp: Date.now() });

      return paths;
    } finally {
      await session.close();
    }
  }

  async detectAnomalies(timeWindow: number = 3600): Promise<any[]> {
    const session = this.driver.session();
    
    try {
      const result = await session.run(
        `
        MATCH (e:SecurityEvent)
        WHERE e.timestamp > datetime() - duration('PT${timeWindow}S')
        WITH e.type AS event_type, 
             COUNT(e) AS count,
             AVG(e.severity_score) AS avg_severity
        WITH event_type, count, avg_severity,
             AVG(count) AS baseline_count,
             STDEV(count) AS stdev_count
        WHERE count > baseline_count + (2 * stdev_count)
        RETURN event_type, count, avg_severity, 
               (count - baseline_count) / stdev_count AS anomaly_score
        ORDER BY anomaly_score DESC
        `,
        { timeWindow }
      );

      return result.records.map(record => record.toObject());
    } finally {
      await session.close();
    }
  }

  async batchCreateRelationships(relationships: any[]): Promise<void> {
    const session = this.driver.session();
    const tx = session.beginTransaction();
    
    try {
      // Use UNWIND for batch operations
      await tx.run(
        `
        UNWIND $relationships AS rel
        MATCH (source:Asset {id: rel.sourceId})
        MATCH (target:Asset {id: rel.targetId})
        MERGE (source)-[r:CONNECTS_TO {
          timestamp: datetime(rel.timestamp),
          protocol: rel.protocol,
          risk_score: rel.riskScore
        }]->(target)
        `,
        { relationships }
      );

      await tx.commit();
    } catch (error) {
      await tx.rollback();
      throw error;
    } finally {
      await session.close();
    }
  }

  async getGraphMetrics(): Promise<any> {
    const session = this.driver.session();
    
    try {
      const result = await session.run(`
        MATCH (n)
        WITH COUNT(n) AS node_count
        MATCH ()-[r]->()
        WITH node_count, COUNT(r) AS relationship_count
        RETURN node_count, relationship_count,
               node_count + relationship_count AS total_elements
      `);

      return result.records[0]?.toObject() || {};
    } finally {
      await session.close();
    }
  }

  async cleanup(): Promise<void> {
    await this.driver.close();
  }
}

// ====================
// Redis Cache Optimization
// ====================

export interface RedisOptimizedConfig {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  maxRetriesPerRequest?: number;
  enableReadyCheck?: boolean;
  enableOfflineQueue?: boolean;
  connectTimeout?: number;
  retryStrategy?: (times: number) => number | void;
}

export class RedisCacheOptimizer {
  private client: Redis;
  private subscriber: Redis;
  private publisher: Redis;
  private cacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
  };

  constructor(config: RedisOptimizedConfig) {
    const baseConfig = {
      host: config.host || 'localhost',
      port: config.port || 6379,
      password: config.password,
      db: config.db || 0,
      maxRetriesPerRequest: config.maxRetriesPerRequest || 3,
      enableReadyCheck: config.enableReadyCheck !== false,
      enableOfflineQueue: config.enableOfflineQueue !== false,
      connectTimeout: config.connectTimeout || 10000,
      retryStrategy: config.retryStrategy || ((times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }),
    };

    // Create separate connections for different operations
    this.client = new Redis(baseConfig);
    this.subscriber = new Redis(baseConfig);
    this.publisher = new Redis(baseConfig);

    this.setupOptimizations();
  }

  private async setupOptimizations() {
    // Configure memory policy
    await this.client.config('SET', 'maxmemory-policy', 'allkeys-lru');
    
    // Set up event listeners
    this.client.on('error', (err) => console.error('Redis Client Error:', err));
    this.subscriber.on('error', (err) => console.error('Redis Subscriber Error:', err));
    this.publisher.on('error', (err) => console.error('Redis Publisher Error:', err));

    console.log('Redis optimizations applied successfully');
  }

  async cacheQuery(key: string, data: any, ttl = 60): Promise<void> {
    const pipeline = this.client.pipeline();
    
    // Store as MessagePack for efficiency
    const serialized = JSON.stringify(data);
    pipeline.setex(key, ttl, serialized);
    
    // Update stats
    pipeline.hincrby('cache:stats', 'sets', 1);
    
    await pipeline.exec();
  }

  async getCached(key: string): Promise<any | null> {
    const data = await this.client.get(key);
    
    if (data) {
      this.cacheStats.hits++;
      await this.client.hincrby('cache:stats', 'hits', 1);
      return JSON.parse(data);
    } else {
      this.cacheStats.misses++;
      await this.client.hincrby('cache:stats', 'misses', 1);
      return null;
    }
  }

  async invalidatePattern(pattern: string): Promise<number> {
    const keys = await this.client.keys(pattern);
    
    if (keys.length > 0) {
      const pipeline = this.client.pipeline();
      keys.forEach(key => pipeline.del(key));
      await pipeline.exec();
    }
    
    return keys.length;
  }

  async cacheMultiLayered(key: string, data: any, layers: { ttl: number; prefix: string }[]): Promise<void> {
    const pipeline = this.client.pipeline();
    
    for (const layer of layers) {
      const layerKey = `${layer.prefix}:${key}`;
      pipeline.setex(layerKey, layer.ttl, JSON.stringify(data));
    }
    
    await pipeline.exec();
  }

  async rateLimit(identifier: string, limit: number, window: number): Promise<boolean> {
    const key = `rate_limit:${identifier}`;
    const current = await this.client.incr(key);
    
    if (current === 1) {
      await this.client.expire(key, window);
    }
    
    return current <= limit;
  }

  async publishEvent(channel: string, event: any): Promise<void> {
    await this.publisher.publish(channel, JSON.stringify(event));
  }

  async subscribeToEvents(channel: string, callback: (event: any) => void): Promise<void> {
    await this.subscriber.subscribe(channel);
    
    this.subscriber.on('message', (receivedChannel, message) => {
      if (receivedChannel === channel) {
        try {
          const event = JSON.parse(message);
          callback(event);
        } catch (error) {
          console.error('Failed to parse event:', error);
        }
      }
    });
  }

  async getMemoryStats(): Promise<any> {
    const info = await this.client.info('memory');
    const stats = await this.client.hgetall('cache:stats');
    
    return {
      memory: info,
      cacheStats: {
        ...this.cacheStats,
        ...stats,
      },
    };
  }

  async cleanup(): Promise<void> {
    await Promise.all([
      this.client.quit(),
      this.subscriber.quit(),
      this.publisher.quit(),
    ]);
  }
}

// ====================
// Unified Database Manager
// ====================

export class UnifiedDatabaseManager {
  private timescale: TimescaleDBOptimizer;
  private neo4j: Neo4jOptimizer;
  private redis: RedisCacheOptimizer;

  constructor(
    timescaleConfig: TimescaleDBConfig,
    neo4jConfig: Neo4jOptimizedConfig,
    redisConfig: RedisOptimizedConfig
  ) {
    this.timescale = new TimescaleDBOptimizer(timescaleConfig);
    this.neo4j = new Neo4jOptimizer(neo4jConfig);
    this.redis = new RedisCacheOptimizer(redisConfig);
  }

  async processSecurityEvent(event: any): Promise<void> {
    // Check rate limiting
    const allowed = await this.redis.rateLimit(event.source_ip, 1000, 60);
    if (!allowed) {
      throw new Error('Rate limit exceeded');
    }

    // Store in TimescaleDB
    await this.timescale.batchInsert([event]);

    // Update graph relationships
    if (event.destination_ip) {
      await this.neo4j.batchCreateRelationships([{
        sourceId: event.source_ip,
        targetId: event.destination_ip,
        timestamp: event.timestamp,
        protocol: event.protocol,
        riskScore: event.severity === 'critical' ? 1.0 : 0.5,
      }]);
    }

    // Cache recent event
    await this.redis.cacheQuery(`event:${event.id}`, event, 300);

    // Publish to real-time subscribers
    await this.redis.publishEvent('security:events', event);
  }

  async getOptimizedDashboardData(): Promise<any> {
    // Try cache first
    const cached = await this.redis.getCached('dashboard:overview');
    if (cached) {
      return cached;
    }

    // Fetch from databases in parallel
    const [metrics, attackPaths, anomalies] = await Promise.all([
      this.timescale.executeQuery(`
        SELECT 
          COUNT(*) FILTER (WHERE timestamp > NOW() - INTERVAL '1 hour') as events_last_hour,
          COUNT(*) FILTER (WHERE severity = 'critical') as critical_events,
          AVG(response_time_ms) as avg_response_time
        FROM security_events
        WHERE timestamp > NOW() - INTERVAL '24 hours'
      `),
      this.neo4j.findAttackPaths('0.0.0.0', 3),
      this.neo4j.detectAnomalies(3600),
    ]);

    const dashboardData = {
      metrics: metrics[0],
      attackPaths,
      anomalies,
      timestamp: new Date().toISOString(),
    };

    // Cache with multi-layer strategy
    await this.redis.cacheMultiLayered('dashboard:overview', dashboardData, [
      { ttl: 5, prefix: 'l1' },    // L1: 5 seconds
      { ttl: 60, prefix: 'l2' },   // L2: 1 minute
      { ttl: 300, prefix: 'l3' },  // L3: 5 minutes
    ]);

    return dashboardData;
  }

  async getSystemHealth(): Promise<any> {
    const [timescaleMetrics, neo4jMetrics, redisStats] = await Promise.all([
      this.timescale.getMetrics(),
      this.neo4j.getGraphMetrics(),
      this.redis.getMemoryStats(),
    ]);

    return {
      timescale: timescaleMetrics,
      neo4j: neo4jMetrics,
      redis: redisStats,
      timestamp: new Date().toISOString(),
    };
  }

  async cleanup(): Promise<void> {
    await Promise.all([
      this.timescale.cleanup(),
      this.neo4j.cleanup(),
      this.redis.cleanup(),
    ]);
  }
}

export default UnifiedDatabaseManager;
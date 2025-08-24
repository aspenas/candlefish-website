/**
 * Database Performance Optimizer
 * Optimizes PostgreSQL queries, indexes, and connection pooling
 */

const { Pool } = require('pg');
const pino = require('pino');

const logger = pino({
  level: 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

class DatabaseOptimizer {
  constructor(connectionConfig) {
    this.pool = new Pool({
      ...connectionConfig,
      // Optimized connection pool settings
      max: 20,                    // Maximum pool size
      min: 5,                      // Minimum pool size
      idleTimeoutMillis: 30000,   // Close idle clients after 30s
      connectionTimeoutMillis: 2000, // Timeout connection after 2s
      statement_timeout: 5000,     // Statement timeout 5s
      query_timeout: 10000,        // Query timeout 10s
      application_name: 'candlefish-optimizer'
    });

    this.queryMetrics = new Map();
    this.slowQueryThreshold = 50; // 50ms
  }

  async analyzeQueryPerformance(query, params = []) {
    const startTime = process.hrtime.bigint();

    try {
      // Execute EXPLAIN ANALYZE
      const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`;
      const explainResult = await this.pool.query(explainQuery, params);
      const plan = explainResult.rows[0]['QUERY PLAN'][0];

      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000; // Convert to ms

      const analysis = this.analyzePlan(plan);

      // Store metrics
      const queryHash = this.hashQuery(query);
      if (!this.queryMetrics.has(queryHash)) {
        this.queryMetrics.set(queryHash, {
          query: query.substring(0, 200),
          executions: 0,
          totalTime: 0,
          avgTime: 0,
          slowExecutions: 0
        });
      }

      const metrics = this.queryMetrics.get(queryHash);
      metrics.executions++;
      metrics.totalTime += duration;
      metrics.avgTime = metrics.totalTime / metrics.executions;
      if (duration > this.slowQueryThreshold) {
        metrics.slowExecutions++;
      }

      return {
        duration,
        plan,
        analysis,
        recommendations: this.generateRecommendations(analysis, plan)
      };
    } catch (error) {
      logger.error({ error, query }, 'Query analysis failed');
      throw error;
    }
  }

  analyzePlan(plan) {
    const analysis = {
      totalCost: plan['Total Cost'],
      executionTime: plan['Execution Time'],
      planningTime: plan['Planning Time'],
      sharedHitBlocks: plan['Shared Hit Blocks'] || 0,
      sharedReadBlocks: plan['Shared Read Blocks'] || 0,
      hasSeqScan: false,
      hasNestedLoop: false,
      hasHashJoin: false,
      hasMergeJoin: false,
      hasIndex: false,
      estimationAccuracy: 1,
      inefficientOperations: []
    };

    // Recursive analysis of plan nodes
    this.analyzePlanNode(plan['Plan'], analysis);

    // Calculate cache hit ratio
    const totalBlocks = analysis.sharedHitBlocks + analysis.sharedReadBlocks;
    analysis.cacheHitRatio = totalBlocks > 0
      ? analysis.sharedHitBlocks / totalBlocks
      : 0;

    return analysis;
  }

  analyzePlanNode(node, analysis) {
    if (!node) return;

    // Check node type
    switch (node['Node Type']) {
      case 'Seq Scan':
        analysis.hasSeqScan = true;
        if (node['Actual Rows'] > 1000) {
          analysis.inefficientOperations.push({
            type: 'Sequential Scan',
            table: node['Relation Name'],
            rows: node['Actual Rows'],
            issue: 'Large sequential scan detected'
          });
        }
        break;

      case 'Nested Loop':
        analysis.hasNestedLoop = true;
        if (node['Actual Rows'] > 100) {
          analysis.inefficientOperations.push({
            type: 'Nested Loop',
            rows: node['Actual Rows'],
            issue: 'Nested loop with many rows'
          });
        }
        break;

      case 'Hash Join':
        analysis.hasHashJoin = true;
        break;

      case 'Merge Join':
        analysis.hasMergeJoin = true;
        break;

      case 'Index Scan':
      case 'Index Only Scan':
      case 'Bitmap Index Scan':
        analysis.hasIndex = true;
        break;
    }

    // Check estimation accuracy
    if (node['Actual Rows'] && node['Plan Rows']) {
      const accuracy = Math.min(
        node['Actual Rows'] / node['Plan Rows'],
        node['Plan Rows'] / node['Actual Rows']
      );
      analysis.estimationAccuracy = Math.min(analysis.estimationAccuracy, accuracy);
    }

    // Recurse through child nodes
    if (node['Plans']) {
      node['Plans'].forEach(child => this.analyzePlanNode(child, analysis));
    }
  }

  generateRecommendations(analysis, plan) {
    const recommendations = [];

    // Check for sequential scans
    if (analysis.hasSeqScan && !analysis.hasIndex) {
      recommendations.push({
        type: 'INDEX',
        priority: 'CRITICAL',
        issue: 'Query performing sequential scan without indexes',
        solution: 'Create appropriate indexes on filter and join columns',
        estimatedImprovement: '50-90% reduction in query time'
      });
    }

    // Check for nested loops with many rows
    if (analysis.hasNestedLoop && analysis.inefficientOperations.some(op =>
      op.type === 'Nested Loop' && op.rows > 100
    )) {
      recommendations.push({
        type: 'JOIN',
        priority: 'HIGH',
        issue: 'Nested loop join processing many rows',
        solution: 'Consider using hash join or ensure proper indexes exist',
        estimatedImprovement: '30-70% reduction in query time'
      });
    }

    // Check cache hit ratio
    if (analysis.cacheHitRatio < 0.9) {
      recommendations.push({
        type: 'CACHE',
        priority: 'MEDIUM',
        issue: `Low cache hit ratio: ${(analysis.cacheHitRatio * 100).toFixed(1)}%`,
        solution: 'Increase shared_buffers or implement application-level caching',
        estimatedImprovement: '20-40% reduction in I/O'
      });
    }

    // Check estimation accuracy
    if (analysis.estimationAccuracy < 0.1) {
      recommendations.push({
        type: 'STATISTICS',
        priority: 'MEDIUM',
        issue: 'Poor query planner estimates',
        solution: 'Run ANALYZE on affected tables to update statistics',
        command: 'ANALYZE table_name;'
      });
    }

    return recommendations;
  }

  async suggestIndexes(tableName) {
    const suggestions = [];

    try {
      // Get table statistics
      const statsQuery = `
        SELECT
          schemaname,
          tablename,
          attname,
          n_distinct,
          correlation
        FROM pg_stats
        WHERE tablename = $1
        ORDER BY n_distinct DESC;
      `;
      const stats = await this.pool.query(statsQuery, [tableName]);

      // Get slow queries on this table
      const slowQueriesQuery = `
        SELECT
          query,
          mean_exec_time,
          calls,
          total_exec_time
        FROM pg_stat_statements
        WHERE query LIKE '%' || $1 || '%'
          AND mean_exec_time > $2
        ORDER BY mean_exec_time DESC
        LIMIT 10;
      `;
      const slowQueries = await this.pool.query(slowQueriesQuery, [
        tableName,
        this.slowQueryThreshold
      ]);

      // Analyze columns for index suggestions
      stats.rows.forEach(column => {
        // High cardinality columns are good for indexes
        if (column.n_distinct > 100 || column.n_distinct === -1) {
          suggestions.push({
            type: 'btree',
            column: column.attname,
            reason: 'High cardinality column',
            sql: `CREATE INDEX idx_${tableName}_${column.attname} ON ${tableName} (${column.attname});`
          });
        }

        // Low cardinality with high correlation good for bitmap indexes
        if (column.n_distinct > 2 && column.n_distinct < 100 && Math.abs(column.correlation) > 0.5) {
          suggestions.push({
            type: 'bitmap',
            column: column.attname,
            reason: 'Low cardinality with high correlation',
            sql: `CREATE INDEX idx_${tableName}_${column.attname}_bitmap ON ${tableName} USING bitmap (${column.attname});`
          });
        }
      });

      // Suggest composite indexes based on slow queries
      if (slowQueries.rows.length > 0) {
        // Parse WHERE clauses to find commonly filtered columns
        const whereColumns = this.extractWhereColumns(slowQueries.rows);
        if (whereColumns.length > 1) {
          suggestions.push({
            type: 'composite',
            columns: whereColumns,
            reason: 'Frequently used in WHERE clauses together',
            sql: `CREATE INDEX idx_${tableName}_composite ON ${tableName} (${whereColumns.join(', ')});`
          });
        }
      }

      // Suggest covering indexes for common projections
      const coveringIndex = await this.suggestCoveringIndex(tableName);
      if (coveringIndex) {
        suggestions.push(coveringIndex);
      }

    } catch (error) {
      logger.error({ error, tableName }, 'Failed to suggest indexes');
    }

    return suggestions;
  }

  extractWhereColumns(queries) {
    const columnFrequency = new Map();

    queries.forEach(({ query }) => {
      // Simple regex to extract column names from WHERE clause
      const whereMatch = query.match(/WHERE\s+(.+?)(?:GROUP|ORDER|LIMIT|$)/i);
      if (whereMatch) {
        const whereClause = whereMatch[1];
        const columnMatches = whereClause.match(/(\w+)\s*[=<>]/g);
        if (columnMatches) {
          columnMatches.forEach(match => {
            const column = match.replace(/\s*[=<>]/, '').trim();
            columnFrequency.set(column, (columnFrequency.get(column) || 0) + 1);
          });
        }
      }
    });

    // Return top columns by frequency
    return Array.from(columnFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([column]) => column);
  }

  async suggestCoveringIndex(tableName) {
    try {
      // Find common SELECT patterns
      const selectPatternsQuery = `
        SELECT
          query,
          calls
        FROM pg_stat_statements
        WHERE query LIKE 'SELECT%FROM%${tableName}%'
          AND calls > 10
        ORDER BY calls DESC
        LIMIT 5;
      `;

      const patterns = await this.pool.query(selectPatternsQuery);

      if (patterns.rows.length > 0) {
        // Extract commonly selected columns
        const selectedColumns = new Set();
        patterns.rows.forEach(({ query }) => {
          const selectMatch = query.match(/SELECT\s+(.+?)\s+FROM/i);
          if (selectMatch) {
            const columns = selectMatch[1].split(',').map(c => c.trim());
            columns.forEach(col => {
              if (!col.includes('*') && !col.includes('(')) {
                selectedColumns.add(col);
              }
            });
          }
        });

        if (selectedColumns.size > 0 && selectedColumns.size <= 5) {
          return {
            type: 'covering',
            columns: Array.from(selectedColumns),
            reason: 'Frequently selected columns can benefit from covering index',
            sql: `CREATE INDEX idx_${tableName}_covering ON ${tableName} (${Array.from(selectedColumns).join(', ')}) INCLUDE (id);`
          };
        }
      }
    } catch (error) {
      logger.error({ error }, 'Failed to suggest covering index');
    }

    return null;
  }

  async optimizeConnectionPool() {
    const metrics = await this.getPoolMetrics();
    const recommendations = [];

    // Check pool utilization
    const utilization = metrics.totalCount > 0
      ? metrics.idleCount / metrics.totalCount
      : 0;

    if (utilization < 0.2) {
      recommendations.push({
        issue: 'Connection pool underutilized',
        current: { size: metrics.totalCount, idle: metrics.idleCount },
        recommendation: 'Reduce pool size to save resources',
        suggestedSize: Math.max(5, Math.ceil(metrics.totalCount * 0.6))
      });
    }

    if (metrics.waitingCount > 0) {
      recommendations.push({
        issue: 'Connections waiting in queue',
        current: { waiting: metrics.waitingCount },
        recommendation: 'Increase pool size to reduce wait times',
        suggestedSize: Math.min(100, metrics.totalCount + metrics.waitingCount * 2)
      });
    }

    return {
      metrics,
      recommendations,
      optimizedConfig: this.generateOptimizedPoolConfig(metrics)
    };
  }

  async getPoolMetrics() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount
    };
  }

  generateOptimizedPoolConfig(metrics) {
    const optimalSize = Math.max(
      10,
      Math.min(
        100,
        metrics.totalCount - metrics.idleCount + Math.ceil(metrics.waitingCount * 1.5)
      )
    );

    return {
      max: optimalSize,
      min: Math.max(5, Math.floor(optimalSize * 0.25)),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      statement_timeout: 5000,
      query_timeout: 10000,
      // PgBouncer configuration for production
      pgBouncer: {
        pool_mode: 'transaction',
        max_client_conn: optimalSize * 4,
        default_pool_size: optimalSize,
        reserve_pool_size: Math.floor(optimalSize * 0.1),
        server_lifetime: 3600,
        server_idle_timeout: 600,
        query_wait_timeout: 120
      }
    };
  }

  hashQuery(query) {
    // Simple hash function for query identification
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  async generateOptimizationScript() {
    const script = [];

    // Vacuum and analyze
    script.push('-- Regular maintenance');
    script.push('VACUUM ANALYZE;');
    script.push('');

    // Update statistics
    script.push('-- Update table statistics');
    script.push('ANALYZE;');
    script.push('');

    // Create missing indexes from analysis
    const tables = await this.pool.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
    `);

    for (const { tablename } of tables.rows) {
      const indexes = await this.suggestIndexes(tablename);
      if (indexes.length > 0) {
        script.push(`-- Indexes for ${tablename}`);
        indexes.forEach(idx => {
          script.push(idx.sql);
        });
        script.push('');
      }
    }

    // Connection pooling configuration
    script.push('-- PostgreSQL configuration optimizations');
    script.push('-- Add to postgresql.conf:');
    script.push('-- shared_buffers = 256MB');
    script.push('-- effective_cache_size = 1GB');
    script.push('-- maintenance_work_mem = 64MB');
    script.push('-- checkpoint_completion_target = 0.9');
    script.push('-- wal_buffers = 16MB');
    script.push('-- default_statistics_target = 100');
    script.push('-- random_page_cost = 1.1');
    script.push('-- effective_io_concurrency = 200');
    script.push('-- work_mem = 4MB');
    script.push('-- min_wal_size = 1GB');
    script.push('-- max_wal_size = 4GB');

    return script.join('\n');
  }

  async close() {
    await this.pool.end();
  }
}

module.exports = DatabaseOptimizer;

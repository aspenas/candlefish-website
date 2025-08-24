/**
 * API Performance Profiler
 * Profiles GraphQL API performance and identifies bottlenecks
 */

const { performance, PerformanceObserver } = require('perf_hooks');
const { GraphQLClient } = require('graphql-request');
const pino = require('pino');

const logger = pino({
  level: 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  }
});

class APIProfiler {
  constructor(endpoint) {
    this.endpoint = endpoint;
    this.client = new GraphQLClient(endpoint);
    this.metrics = {
      queries: new Map(),
      mutations: new Map(),
      subscriptions: new Map(),
      n1Queries: [],
      slowQueries: [],
      largePayloads: []
    };

    this.setupPerformanceObserver();
  }

  setupPerformanceObserver() {
    const obs = new PerformanceObserver((items) => {
      items.getEntries().forEach(entry => {
        if (entry.duration > 200) {
          this.metrics.slowQueries.push({
            name: entry.name,
            duration: entry.duration,
            timestamp: new Date().toISOString()
          });
        }
      });
    });
    obs.observe({ entryTypes: ['measure'] });
  }

  async profileQuery(query, variables = {}, name = 'unnamed') {
    const startMark = `query-start-${name}-${Date.now()}`;
    const endMark = `query-end-${name}-${Date.now()}`;
    const measureName = `query-${name}`;

    performance.mark(startMark);

    try {
      const startTime = process.hrtime.bigint();
      const result = await this.client.request(query, variables);
      const endTime = process.hrtime.bigint();

      performance.mark(endMark);
      performance.measure(measureName, startMark, endMark);

      const duration = Number(endTime - startTime) / 1000000; // Convert to ms
      const payloadSize = JSON.stringify(result).length;

      // Store metrics
      if (!this.metrics.queries.has(name)) {
        this.metrics.queries.set(name, {
          count: 0,
          totalDuration: 0,
          avgDuration: 0,
          minDuration: Infinity,
          maxDuration: 0,
          avgPayloadSize: 0,
          totalPayloadSize: 0
        });
      }

      const queryMetrics = this.metrics.queries.get(name);
      queryMetrics.count++;
      queryMetrics.totalDuration += duration;
      queryMetrics.avgDuration = queryMetrics.totalDuration / queryMetrics.count;
      queryMetrics.minDuration = Math.min(queryMetrics.minDuration, duration);
      queryMetrics.maxDuration = Math.max(queryMetrics.maxDuration, duration);
      queryMetrics.totalPayloadSize += payloadSize;
      queryMetrics.avgPayloadSize = queryMetrics.totalPayloadSize / queryMetrics.count;

      // Check for large payloads
      if (payloadSize > 100000) { // 100KB
        this.metrics.largePayloads.push({
          name,
          size: payloadSize,
          duration,
          timestamp: new Date().toISOString()
        });
      }

      // Detect N+1 queries
      this.detectN1Query(query, result);

      return {
        result,
        metrics: {
          duration,
          payloadSize,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error({ error, query: name }, 'Query failed');
      throw error;
    } finally {
      performance.clearMarks(startMark);
      performance.clearMarks(endMark);
    }
  }

  detectN1Query(query, result) {
    // Simple N+1 detection: look for arrays with nested queries
    const resultStr = JSON.stringify(result);
    const arrayMatches = resultStr.match(/\[.*?\]/g);

    if (arrayMatches) {
      arrayMatches.forEach(match => {
        const itemCount = (match.match(/\{/g) || []).length;
        if (itemCount > 10) {
          // Potential N+1 detected
          const queryLines = query.split('\n');
          const suspiciousFields = queryLines.filter(line =>
            line.includes('{') && !line.includes('query') && !line.includes('mutation')
          );

          if (suspiciousFields.length > 0) {
            this.metrics.n1Queries.push({
              query: query.substring(0, 200),
              itemCount,
              timestamp: new Date().toISOString(),
              suspiciousFields: suspiciousFields.slice(0, 3)
            });
          }
        }
      });
    }
  }

  async profileDataLoader(loaderFn, keys, name = 'dataloader') {
    const startTime = process.hrtime.bigint();
    const result = await loaderFn(keys);
    const endTime = process.hrtime.bigint();

    const duration = Number(endTime - startTime) / 1000000;
    const batchSize = keys.length;
    const efficiency = result.length / batchSize; // Should be close to 1

    logger.info({
      loader: name,
      duration,
      batchSize,
      efficiency,
      avgTimePerKey: duration / batchSize
    }, 'DataLoader performance');

    return result;
  }

  async profileDatabaseQuery(queryFn, sql, params = [], name = 'db-query') {
    const startTime = process.hrtime.bigint();
    const result = await queryFn(sql, params);
    const endTime = process.hrtime.bigint();

    const duration = Number(endTime - startTime) / 1000000;

    // Analyze query for optimization opportunities
    const analysis = this.analyzeSQL(sql);

    if (duration > 50) {
      logger.warn({
        query: name,
        duration,
        sql: sql.substring(0, 200),
        analysis
      }, 'Slow database query detected');
    }

    return {
      result,
      metrics: {
        duration,
        rowCount: Array.isArray(result) ? result.length : 0,
        analysis
      }
    };
  }

  analyzeSQL(sql) {
    const analysis = {
      hasIndex: false,
      hasJoin: false,
      hasSubquery: false,
      hasFullTableScan: false,
      recommendations: []
    };

    const sqlUpper = sql.toUpperCase();

    // Check for common patterns
    if (sqlUpper.includes('JOIN')) {
      analysis.hasJoin = true;
      if (!sqlUpper.includes('INDEX')) {
        analysis.recommendations.push('Consider adding indexes on join columns');
      }
    }

    if (sqlUpper.includes('SELECT *')) {
      analysis.recommendations.push('Avoid SELECT *, specify needed columns');
    }

    if (sqlUpper.includes('LIKE \'%')) {
      analysis.recommendations.push('Leading wildcard prevents index usage');
      analysis.hasFullTableScan = true;
    }

    if (sqlUpper.includes('IN (') && sqlUpper.includes('SELECT')) {
      analysis.hasSubquery = true;
      analysis.recommendations.push('Consider using JOIN instead of IN with subquery');
    }

    if (!sqlUpper.includes('LIMIT') && sqlUpper.includes('SELECT')) {
      analysis.recommendations.push('Consider adding LIMIT to prevent large result sets');
    }

    return analysis;
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalQueries: Array.from(this.metrics.queries.values()).reduce((sum, m) => sum + m.count, 0),
        avgQueryDuration: this.calculateAverage('queries', 'avgDuration'),
        slowQueriesCount: this.metrics.slowQueries.length,
        n1QueriesDetected: this.metrics.n1Queries.length,
        largePayloadsCount: this.metrics.largePayloads.length
      },
      queries: Object.fromEntries(this.metrics.queries),
      slowQueries: this.metrics.slowQueries.slice(0, 10),
      n1Queries: this.metrics.n1Queries.slice(0, 5),
      largePayloads: this.metrics.largePayloads.slice(0, 5),
      recommendations: this.generateRecommendations()
    };

    return report;
  }

  calculateAverage(metricType, field) {
    const metrics = Array.from(this.metrics[metricType].values());
    if (metrics.length === 0) return 0;

    const sum = metrics.reduce((total, m) => total + m[field], 0);
    return sum / metrics.length;
  }

  generateRecommendations() {
    const recommendations = [];

    // Check for slow queries
    if (this.metrics.slowQueries.length > 0) {
      recommendations.push({
        type: 'CRITICAL',
        message: `${this.metrics.slowQueries.length} slow queries detected (>200ms)`,
        action: 'Optimize query complexity, add DataLoader batching, or implement caching'
      });
    }

    // Check for N+1 queries
    if (this.metrics.n1Queries.length > 0) {
      recommendations.push({
        type: 'CRITICAL',
        message: `${this.metrics.n1Queries.length} potential N+1 queries detected`,
        action: 'Implement DataLoader for batch loading related entities'
      });
    }

    // Check for large payloads
    if (this.metrics.largePayloads.length > 0) {
      recommendations.push({
        type: 'WARNING',
        message: `${this.metrics.largePayloads.length} large payloads detected (>100KB)`,
        action: 'Implement pagination, field selection, or response compression'
      });
    }

    // Check average query duration
    const avgDuration = this.calculateAverage('queries', 'avgDuration');
    if (avgDuration > 100) {
      recommendations.push({
        type: 'WARNING',
        message: `Average query duration is ${avgDuration.toFixed(2)}ms`,
        action: 'Consider implementing Redis caching for frequently accessed data'
      });
    }

    return recommendations;
  }

  reset() {
    this.metrics = {
      queries: new Map(),
      mutations: new Map(),
      subscriptions: new Map(),
      n1Queries: [],
      slowQueries: [],
      largePayloads: []
    };
  }
}

module.exports = APIProfiler;

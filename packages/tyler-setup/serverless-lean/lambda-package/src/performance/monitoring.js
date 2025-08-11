/**
 * Real-time Performance Monitoring for GraphQL
 * Integrates with CloudWatch and custom metrics
 */

import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

/**
 * Performance metrics collector
 */
export class PerformanceMonitor {
  constructor() {
    this.cloudWatch = new CloudWatchClient({ region: process.env.AWS_REGION });
    this.metrics = new Map();
    this.alerts = [];
    this.startTime = Date.now();

    // Initialize metric counters
    this.initializeMetrics();

    // Set up periodic reporting
    if (process.env.NODE_ENV === 'production') {
      setInterval(() => this.publishMetrics(), 60000); // Every minute
    }
  }

  /**
   * Initialize metric tracking
   */
  initializeMetrics() {
    this.metrics.set('graphql.queries.total', 0);
    this.metrics.set('graphql.queries.successful', 0);
    this.metrics.set('graphql.queries.failed', 0);
    this.metrics.set('graphql.mutations.total', 0);
    this.metrics.set('graphql.subscriptions.active', 0);
    this.metrics.set('graphql.execution_time.total', 0);
    this.metrics.set('graphql.complexity.total', 0);
    this.metrics.set('database.queries.total', 0);
    this.metrics.set('database.queries.cached', 0);
    this.metrics.set('cache.hits', 0);
    this.metrics.set('cache.misses', 0);
    this.metrics.set('errors.rate_limit', 0);
    this.metrics.set('errors.auth', 0);
    this.metrics.set('errors.validation', 0);
  }

  /**
   * Record GraphQL operation metrics
   */
  recordOperation(operationType, operationName, executionTime, complexity, success, error) {
    // Increment operation counters
    this.incrementMetric(`graphql.${operationType}s.total`);

    if (success) {
      this.incrementMetric(`graphql.${operationType}s.successful`);
    } else {
      this.incrementMetric(`graphql.${operationType}s.failed`);
      this.recordError(error);
    }

    // Record execution time
    this.addToMetric('graphql.execution_time.total', executionTime);

    // Record complexity
    if (complexity) {
      this.addToMetric('graphql.complexity.total', complexity);
    }

    // Check for performance alerts
    this.checkPerformanceAlerts(operationType, executionTime, complexity);

    // Store detailed metrics for analysis
    this.storeDetailedMetrics(operationType, operationName, executionTime, complexity, success, error);
  }

  /**
   * Record database operation metrics
   */
  recordDatabaseOperation(operation, table, executionTime, cached = false) {
    this.incrementMetric('database.queries.total');

    if (cached) {
      this.incrementMetric('database.queries.cached');
      this.incrementMetric('cache.hits');
    } else {
      this.incrementMetric('cache.misses');
    }

    // Record table-specific metrics
    this.incrementMetric(`database.tables.${table}.queries`);
    this.addToMetric(`database.tables.${table}.execution_time`, executionTime);

    // Check for slow queries
    if (executionTime > 1000) {
      this.recordSlowQuery(operation, table, executionTime);
    }
  }

  /**
   * Record cache operations
   */
  recordCacheOperation(operation, layer, hit = false) {
    this.incrementMetric(`cache.${layer}.operations`);

    if (hit) {
      this.incrementMetric(`cache.${layer}.hits`);
    } else {
      this.incrementMetric(`cache.${layer}.misses`);
    }
  }

  /**
   * Record error metrics
   */
  recordError(error) {
    if (error.message.includes('rate limit')) {
      this.incrementMetric('errors.rate_limit');
    } else if (error.message.includes('auth')) {
      this.incrementMetric('errors.auth');
    } else if (error.message.includes('validation')) {
      this.incrementMetric('errors.validation');
    } else {
      this.incrementMetric('errors.other');
    }
  }

  /**
   * Record slow query for analysis
   */
  recordSlowQuery(operation, table, executionTime) {
    const slowQuery = {
      timestamp: Date.now(),
      operation,
      table,
      executionTime,
    };

    // Store in metrics for analysis
    if (!this.metrics.has('slow_queries')) {
      this.metrics.set('slow_queries', []);
    }

    const slowQueries = this.metrics.get('slow_queries');
    slowQueries.push(slowQuery);

    // Keep only last 100 slow queries
    if (slowQueries.length > 100) {
      slowQueries.shift();
    }

    console.warn('Slow database query detected:', slowQuery);
  }

  /**
   * Store detailed metrics for analysis
   */
  storeDetailedMetrics(operationType, operationName, executionTime, complexity, success, error) {
    const metricKey = `detailed_metrics.${operationType}`;

    if (!this.metrics.has(metricKey)) {
      this.metrics.set(metricKey, []);
    }

    const detailedMetrics = this.metrics.get(metricKey);
    detailedMetrics.push({
      timestamp: Date.now(),
      operationName,
      executionTime,
      complexity,
      success,
      error: error?.message,
    });

    // Keep only last 1000 detailed metrics
    if (detailedMetrics.length > 1000) {
      detailedMetrics.shift();
    }
  }

  /**
   * Check for performance alerts
   */
  checkPerformanceAlerts(operationType, executionTime, complexity) {
    const alerts = [];

    // Slow execution time alert
    if (executionTime > 5000) {
      alerts.push({
        type: 'slow_execution',
        severity: 'high',
        message: `${operationType} execution time: ${executionTime}ms`,
        timestamp: Date.now(),
      });
    }

    // High complexity alert
    if (complexity && complexity > 500) {
      alerts.push({
        type: 'high_complexity',
        severity: 'medium',
        message: `High query complexity: ${complexity}`,
        timestamp: Date.now(),
      });
    }

    // Add alerts to collection
    this.alerts.push(...alerts);

    // Keep only recent alerts (last 100)
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    // Send critical alerts immediately
    for (const alert of alerts) {
      if (alert.severity === 'high') {
        this.sendImmediateAlert(alert);
      }
    }
  }

  /**
   * Send immediate alert for critical issues
   */
  async sendImmediateAlert(alert) {
    try {
      await this.publishCustomMetric('GraphQL.CriticalAlert', 1, 'Count', {
        AlertType: alert.type,
        Severity: alert.severity,
      });

      console.error('CRITICAL ALERT:', alert);
    } catch (error) {
      console.error('Failed to send alert:', error);
    }
  }

  /**
   * Get current performance statistics
   */
  getPerformanceStats() {
    const uptime = Date.now() - this.startTime;
    const totalQueries = this.getMetric('graphql.queries.total');
    const successfulQueries = this.getMetric('graphql.queries.successful');
    const failedQueries = this.getMetric('graphql.queries.failed');
    const totalExecutionTime = this.getMetric('graphql.execution_time.total');
    const cacheHits = this.getMetric('cache.hits');
    const cacheMisses = this.getMetric('cache.misses');

    return {
      uptime: Math.round(uptime / 1000), // seconds
      throughput: totalQueries > 0 ? Math.round((totalQueries / uptime) * 1000 * 60) : 0, // queries per minute
      averageExecutionTime: totalQueries > 0 ? Math.round(totalExecutionTime / totalQueries) : 0,
      successRate: totalQueries > 0 ? Math.round((successfulQueries / totalQueries) * 100) : 100,
      errorRate: totalQueries > 0 ? Math.round((failedQueries / totalQueries) * 100) : 0,
      cacheHitRate: (cacheHits + cacheMisses) > 0 ? Math.round((cacheHits / (cacheHits + cacheMisses)) * 100) : 0,
      activeAlerts: this.alerts.filter(alert => Date.now() - alert.timestamp < 300000).length, // Last 5 minutes
    };
  }

  /**
   * Get detailed performance report
   */
  getDetailedReport() {
    const stats = this.getPerformanceStats();

    // Calculate percentiles for execution times
    const queryMetrics = this.metrics.get('detailed_metrics.query') || [];
    const executionTimes = queryMetrics
      .filter(m => m.success)
      .map(m => m.executionTime)
      .sort((a, b) => a - b);

    const getPercentile = (arr, p) => {
      if (arr.length === 0) return 0;
      const index = Math.ceil((p / 100) * arr.length) - 1;
      return arr[index] || 0;
    };

    // Get top slow operations
    const allOperations = [...(queryMetrics || []), ...(this.metrics.get('detailed_metrics.mutation') || [])];
    const slowOperations = allOperations
      .filter(m => m.executionTime > 1000)
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 10);

    // Get error breakdown
    const errorBreakdown = {
      rateLimit: this.getMetric('errors.rate_limit'),
      authentication: this.getMetric('errors.auth'),
      validation: this.getMetric('errors.validation'),
      other: this.getMetric('errors.other'),
    };

    return {
      summary: stats,
      executionTime: {
        p50: getPercentile(executionTimes, 50),
        p95: getPercentile(executionTimes, 95),
        p99: getPercentile(executionTimes, 99),
        min: Math.min(...executionTimes) || 0,
        max: Math.max(...executionTimes) || 0,
      },
      slowOperations,
      errorBreakdown,
      recentAlerts: this.alerts.slice(-10),
      slowQueries: this.metrics.get('slow_queries') || [],
    };
  }

  /**
   * Publish metrics to CloudWatch
   */
  async publishMetrics() {
    if (process.env.NODE_ENV !== 'production') return;

    try {
      const stats = this.getPerformanceStats();
      const metricData = [
        {
          MetricName: 'TotalQueries',
          Value: this.getMetric('graphql.queries.total'),
          Unit: 'Count',
          Dimensions: [
            { Name: 'Service', Value: 'tyler-setup-graphql' },
          ],
        },
        {
          MetricName: 'Throughput',
          Value: stats.throughput,
          Unit: 'Count/Minute',
          Dimensions: [
            { Name: 'Service', Value: 'tyler-setup-graphql' },
          ],
        },
        {
          MetricName: 'AverageExecutionTime',
          Value: stats.averageExecutionTime,
          Unit: 'Milliseconds',
          Dimensions: [
            { Name: 'Service', Value: 'tyler-setup-graphql' },
          ],
        },
        {
          MetricName: 'ErrorRate',
          Value: stats.errorRate,
          Unit: 'Percent',
          Dimensions: [
            { Name: 'Service', Value: 'tyler-setup-graphql' },
          ],
        },
        {
          MetricName: 'CacheHitRate',
          Value: stats.cacheHitRate,
          Unit: 'Percent',
          Dimensions: [
            { Name: 'Service', Value: 'tyler-setup-graphql' },
          ],
        },
      ];

      await this.cloudWatch.send(new PutMetricDataCommand({
        Namespace: 'TylerSetup/GraphQL',
        MetricData: metricData,
      }));

      console.log('Metrics published to CloudWatch');
    } catch (error) {
      console.error('Failed to publish metrics:', error);
    }
  }

  /**
   * Publish custom metric to CloudWatch
   */
  async publishCustomMetric(metricName, value, unit = 'Count', dimensions = {}) {
    if (process.env.NODE_ENV !== 'production') return;

    try {
      const dimensionArray = Object.entries(dimensions).map(([name, value]) => ({
        Name: name,
        Value: value,
      }));

      await this.cloudWatch.send(new PutMetricDataCommand({
        Namespace: 'TylerSetup/GraphQL',
        MetricData: [
          {
            MetricName: metricName,
            Value: value,
            Unit: unit,
            Dimensions: dimensionArray,
          },
        ],
      }));
    } catch (error) {
      console.error('Failed to publish custom metric:', error);
    }
  }

  /**
   * Helper methods for metric manipulation
   */
  incrementMetric(key) {
    this.metrics.set(key, (this.metrics.get(key) || 0) + 1);
  }

  addToMetric(key, value) {
    this.metrics.set(key, (this.metrics.get(key) || 0) + value);
  }

  getMetric(key) {
    return this.metrics.get(key) || 0;
  }

  resetMetric(key) {
    this.metrics.set(key, 0);
  }

  resetAllMetrics() {
    this.initializeMetrics();
    this.alerts = [];
  }
}

/**
 * Application Performance Monitoring (APM) integration
 */
export class APMIntegration {
  constructor() {
    this.performanceMonitor = new PerformanceMonitor();
    this.traceContext = new Map();
  }

  /**
   * Start tracing a GraphQL operation
   */
  startTrace(operationId, operationType, operationName) {
    const trace = {
      operationId,
      operationType,
      operationName,
      startTime: performance.now(),
      spans: [],
    };

    this.traceContext.set(operationId, trace);
    return trace;
  }

  /**
   * Add span to current trace
   */
  addSpan(operationId, spanName, startTime, endTime, metadata = {}) {
    const trace = this.traceContext.get(operationId);
    if (!trace) return;

    trace.spans.push({
      name: spanName,
      startTime,
      endTime,
      duration: endTime - startTime,
      metadata,
    });
  }

  /**
   * End trace and record metrics
   */
  endTrace(operationId, success = true, error = null) {
    const trace = this.traceContext.get(operationId);
    if (!trace) return;

    trace.endTime = performance.now();
    trace.totalDuration = trace.endTime - trace.startTime;
    trace.success = success;
    trace.error = error;

    // Record metrics
    this.performanceMonitor.recordOperation(
      trace.operationType,
      trace.operationName,
      trace.totalDuration,
      this.calculateComplexity(trace),
      success,
      error
    );

    // Store trace for analysis (in production, send to APM service)
    if (process.env.NODE_ENV === 'production') {
      this.sendTraceToAPM(trace);
    }

    // Clean up
    this.traceContext.delete(operationId);

    return trace;
  }

  /**
   * Calculate operation complexity from trace
   */
  calculateComplexity(trace) {
    // Simple complexity calculation based on number of database operations
    const dbSpans = trace.spans.filter(span => span.name.includes('database'));
    return dbSpans.length * 5; // Basic complexity scoring
  }

  /**
   * Send trace to APM service (placeholder for real implementation)
   */
  async sendTraceToAPM(trace) {
    // In a real implementation, this would send to services like:
    // - AWS X-Ray
    // - New Relic
    // - Datadog
    // - Jaeger

    console.log('Trace completed:', {
      operationName: trace.operationName,
      duration: Math.round(trace.totalDuration),
      spans: trace.spans.length,
      success: trace.success,
    });
  }
}

/**
 * Health check monitor
 */
export class HealthCheckMonitor {
  constructor(performanceMonitor) {
    this.performanceMonitor = performanceMonitor;
    this.healthChecks = new Map();
    this.lastHealthCheck = null;
  }

  /**
   * Run comprehensive health check
   */
  async runHealthCheck() {
    const healthCheck = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      checks: {},
      metrics: this.performanceMonitor.getPerformanceStats(),
    };

    try {
      // Database connectivity check
      healthCheck.checks.database = await this.checkDatabaseHealth();

      // Cache connectivity check
      healthCheck.checks.cache = await this.checkCacheHealth();

      // Performance thresholds check
      healthCheck.checks.performance = this.checkPerformanceThresholds();

      // Error rate check
      healthCheck.checks.errorRate = this.checkErrorRate();

      // Determine overall health status
      const failedChecks = Object.values(healthCheck.checks).filter(check => !check.healthy);
      if (failedChecks.length > 0) {
        healthCheck.status = failedChecks.some(check => check.critical) ? 'critical' : 'degraded';
      }

      this.lastHealthCheck = healthCheck;
      return healthCheck;
    } catch (error) {
      healthCheck.status = 'critical';
      healthCheck.error = error.message;
      return healthCheck;
    }
  }

  /**
   * Check database health
   */
  async checkDatabaseHealth() {
    try {
      // This would perform actual database connectivity checks
      // For now, we'll simulate based on metrics
      const avgResponseTime = this.performanceMonitor.getMetric('database.queries.total') > 0
        ? this.performanceMonitor.getMetric('graphql.execution_time.total') / this.performanceMonitor.getMetric('database.queries.total')
        : 0;

      return {
        healthy: avgResponseTime < 1000,
        critical: avgResponseTime > 5000,
        responseTime: Math.round(avgResponseTime),
        message: avgResponseTime > 1000 ? 'Database response time is elevated' : 'Database is responding normally',
      };
    } catch (error) {
      return {
        healthy: false,
        critical: true,
        error: error.message,
        message: 'Database connectivity check failed',
      };
    }
  }

  /**
   * Check cache health
   */
  async checkCacheHealth() {
    try {
      const hitRate = this.performanceMonitor.getPerformanceStats().cacheHitRate;

      return {
        healthy: hitRate > 70,
        critical: hitRate < 30,
        hitRate,
        message: hitRate < 70 ? 'Cache hit rate is below optimal' : 'Cache is performing well',
      };
    } catch (error) {
      return {
        healthy: false,
        critical: false,
        error: error.message,
        message: 'Cache health check failed',
      };
    }
  }

  /**
   * Check performance thresholds
   */
  checkPerformanceThresholds() {
    const stats = this.performanceMonitor.getPerformanceStats();
    const issues = [];

    if (stats.averageExecutionTime > 1000) {
      issues.push('Average execution time is above 1000ms');
    }

    if (stats.throughput < 10) {
      issues.push('Throughput is below 10 queries per minute');
    }

    if (stats.activeAlerts > 5) {
      issues.push('High number of active performance alerts');
    }

    return {
      healthy: issues.length === 0,
      critical: issues.length > 2,
      issues,
      message: issues.length === 0 ? 'Performance metrics are within thresholds' : `Performance issues detected: ${issues.join(', ')}`,
    };
  }

  /**
   * Check error rate
   */
  checkErrorRate() {
    const errorRate = this.performanceMonitor.getPerformanceStats().errorRate;

    return {
      healthy: errorRate < 1,
      critical: errorRate > 5,
      errorRate,
      message: errorRate > 1 ? `Error rate is elevated: ${errorRate}%` : 'Error rate is within acceptable limits',
    };
  }

  /**
   * Get last health check result
   */
  getLastHealthCheck() {
    return this.lastHealthCheck;
  }
}

// Export singleton instances
export const performanceMonitor = new PerformanceMonitor();
export const apmIntegration = new APMIntegration();
export const healthCheckMonitor = new HealthCheckMonitor(performanceMonitor);

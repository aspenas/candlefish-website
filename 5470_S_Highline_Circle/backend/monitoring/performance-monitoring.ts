/**
 * Performance Monitoring and Alerting System
 * Tracks application metrics and sends alerts for performance issues
 */

import * as prometheus from 'prom-client';
import { StatsD } from 'node-statsd';
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import { performance, PerformanceObserver } from 'perf_hooks';
import { EventEmitter } from 'events';

// Monitoring configuration
interface MonitoringConfig {
  prometheusPort: number;
  statsdHost: string;
  statsdPort: number;
  sentryDsn: string;
  alertThresholds: AlertThresholds;
}

interface AlertThresholds {
  apiResponseTime: number; // ms
  dbQueryTime: number; // ms
  cacheHitRate: number; // percentage
  errorRate: number; // percentage
  memoryUsage: number; // MB
  cpuUsage: number; // percentage
}

// Metric types
interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags?: Record<string, string>;
}

/**
 * PerformanceMonitor - Main monitoring service
 */
export class PerformanceMonitor extends EventEmitter {
  private static instance: PerformanceMonitor;
  private registry: prometheus.Registry;
  private statsd: StatsD;
  private metrics: Map<string, prometheus.Metric>;
  private performanceObserver: PerformanceObserver;
  private config: MonitoringConfig;

  // Prometheus metrics
  private httpRequestDuration: prometheus.Histogram;
  private httpRequestTotal: prometheus.Counter;
  private dbQueryDuration: prometheus.Histogram;
  private cacheHits: prometheus.Counter;
  private cacheMisses: prometheus.Counter;
  private websocketConnections: prometheus.Gauge;
  private errorRate: prometheus.Counter;
  private memoryUsage: prometheus.Gauge;
  private cpuUsage: prometheus.Gauge;
  private customMetrics: Map<string, prometheus.Metric>;

  private constructor(config: MonitoringConfig) {
    super();
    this.config = config;
    this.registry = new prometheus.Registry();
    this.metrics = new Map();
    this.customMetrics = new Map();
    
    // Initialize StatsD client
    this.statsd = new StatsD({
      host: config.statsdHost,
      port: config.statsdPort,
      prefix: 'valuation_app.',
      cacheDns: true,
    });
    
    // Initialize Sentry with performance monitoring
    Sentry.init({
      dsn: config.sentryDsn,
      integrations: [
        new ProfilingIntegration(),
      ],
      tracesSampleRate: 1.0,
      profilesSampleRate: 1.0,
    });
    
    this.initializeMetrics();
    this.setupPerformanceObserver();
    this.startMetricsCollection();
  }

  static getInstance(config?: MonitoringConfig): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      if (!config) {
        throw new Error('Config required for first initialization');
      }
      PerformanceMonitor.instance = new PerformanceMonitor(config);
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Initialize Prometheus metrics
   */
  private initializeMetrics() {
    // HTTP metrics
    this.httpRequestDuration = new prometheus.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    });
    this.registry.registerMetric(this.httpRequestDuration);
    
    this.httpRequestTotal = new prometheus.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status'],
    });
    this.registry.registerMetric(this.httpRequestTotal);
    
    // Database metrics
    this.dbQueryDuration = new prometheus.Histogram({
      name: 'db_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
    });
    this.registry.registerMetric(this.dbQueryDuration);
    
    // Cache metrics
    this.cacheHits = new prometheus.Counter({
      name: 'cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['cache_type'],
    });
    this.registry.registerMetric(this.cacheHits);
    
    this.cacheMisses = new prometheus.Counter({
      name: 'cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['cache_type'],
    });
    this.registry.registerMetric(this.cacheMisses);
    
    // WebSocket metrics
    this.websocketConnections = new prometheus.Gauge({
      name: 'websocket_connections',
      help: 'Number of active WebSocket connections',
    });
    this.registry.registerMetric(this.websocketConnections);
    
    // Error metrics
    this.errorRate = new prometheus.Counter({
      name: 'errors_total',
      help: 'Total number of errors',
      labelNames: ['type', 'severity'],
    });
    this.registry.registerMetric(this.errorRate);
    
    // System metrics
    this.memoryUsage = new prometheus.Gauge({
      name: 'memory_usage_bytes',
      help: 'Memory usage in bytes',
      labelNames: ['type'],
    });
    this.registry.registerMetric(this.memoryUsage);
    
    this.cpuUsage = new prometheus.Gauge({
      name: 'cpu_usage_percent',
      help: 'CPU usage percentage',
    });
    this.registry.registerMetric(this.cpuUsage);
    
    // Register default metrics
    prometheus.collectDefaultMetrics({ register: this.registry });
  }

  /**
   * Setup performance observer for detailed timing
   */
  private setupPerformanceObserver() {
    this.performanceObserver = new PerformanceObserver((items) => {
      items.getEntries().forEach((entry) => {
        this.processPerformanceEntry(entry);
      });
    });
    
    this.performanceObserver.observe({ 
      entryTypes: ['measure', 'navigation', 'resource'] 
    });
  }

  /**
   * Process performance entries
   */
  private processPerformanceEntry(entry: PerformanceEntry) {
    const metric: PerformanceMetric = {
      name: entry.name,
      value: entry.duration,
      unit: 'ms',
      timestamp: new Date(entry.startTime),
    };
    
    // Send to StatsD
    this.statsd.timing(`performance.${entry.entryType}.${entry.name}`, entry.duration);
    
    // Check thresholds
    this.checkThresholds(metric);
    
    // Emit event for custom handling
    this.emit('performanceEntry', metric);
  }

  /**
   * Start collecting system metrics
   */
  private startMetricsCollection() {
    // Collect memory metrics every 10 seconds
    setInterval(() => {
      const memUsage = process.memoryUsage();
      this.memoryUsage.set({ type: 'rss' }, memUsage.rss);
      this.memoryUsage.set({ type: 'heapTotal' }, memUsage.heapTotal);
      this.memoryUsage.set({ type: 'heapUsed' }, memUsage.heapUsed);
      this.memoryUsage.set({ type: 'external' }, memUsage.external);
      
      // Check memory threshold
      const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
      if (heapUsedMB > this.config.alertThresholds.memoryUsage) {
        this.sendAlert('HIGH_MEMORY_USAGE', {
          current: heapUsedMB,
          threshold: this.config.alertThresholds.memoryUsage,
        });
      }
    }, 10000);
    
    // Collect CPU metrics every 5 seconds
    let previousCpuUsage = process.cpuUsage();
    setInterval(() => {
      const currentCpuUsage = process.cpuUsage(previousCpuUsage);
      const totalCpuTime = currentCpuUsage.user + currentCpuUsage.system;
      const cpuPercent = (totalCpuTime / 5000000) * 100; // 5 seconds in microseconds
      
      this.cpuUsage.set(cpuPercent);
      
      // Check CPU threshold
      if (cpuPercent > this.config.alertThresholds.cpuUsage) {
        this.sendAlert('HIGH_CPU_USAGE', {
          current: cpuPercent,
          threshold: this.config.alertThresholds.cpuUsage,
        });
      }
      
      previousCpuUsage = currentCpuUsage;
    }, 5000);
  }

  /**
   * Track HTTP request
   */
  trackHttpRequest(method: string, route: string, status: number, duration: number) {
    const labels = { method, route, status: status.toString() };
    
    this.httpRequestDuration.observe(labels, duration / 1000);
    this.httpRequestTotal.inc(labels);
    
    // Send to StatsD
    this.statsd.timing('http.request.duration', duration, [`method:${method}`, `route:${route}`, `status:${status}`]);
    this.statsd.increment('http.request.count', 1, [`method:${method}`, `route:${route}`, `status:${status}`]);
    
    // Check threshold
    if (duration > this.config.alertThresholds.apiResponseTime) {
      this.sendAlert('SLOW_API_RESPONSE', {
        method,
        route,
        duration,
        threshold: this.config.alertThresholds.apiResponseTime,
      });
    }
    
    // Track with Sentry
    const transaction = Sentry.startTransaction({
      op: 'http.server',
      name: `${method} ${route}`,
    });
    transaction.setHttpStatus(status);
    transaction.finish();
  }

  /**
   * Track database query
   */
  trackDatabaseQuery(operation: string, table: string, duration: number) {
    const labels = { operation, table };
    
    this.dbQueryDuration.observe(labels, duration / 1000);
    
    // Send to StatsD
    this.statsd.timing('db.query.duration', duration, [`operation:${operation}`, `table:${table}`]);
    
    // Check threshold
    if (duration > this.config.alertThresholds.dbQueryTime) {
      this.sendAlert('SLOW_DB_QUERY', {
        operation,
        table,
        duration,
        threshold: this.config.alertThresholds.dbQueryTime,
      });
    }
  }

  /**
   * Track cache operations
   */
  trackCacheOperation(cacheType: string, hit: boolean) {
    if (hit) {
      this.cacheHits.inc({ cache_type: cacheType });
      this.statsd.increment('cache.hit', 1, [`type:${cacheType}`]);
    } else {
      this.cacheMisses.inc({ cache_type: cacheType });
      this.statsd.increment('cache.miss', 1, [`type:${cacheType}`]);
    }
    
    // Calculate and check hit rate
    this.calculateCacheHitRate(cacheType);
  }

  /**
   * Track WebSocket connections
   */
  trackWebSocketConnection(delta: number) {
    this.websocketConnections.inc(delta);
    this.statsd.gauge('websocket.connections', delta);
  }

  /**
   * Track errors
   */
  trackError(error: Error, severity: 'low' | 'medium' | 'high' | 'critical') {
    const type = error.constructor.name;
    
    this.errorRate.inc({ type, severity });
    this.statsd.increment('error.count', 1, [`type:${type}`, `severity:${severity}`]);
    
    // Send to Sentry
    Sentry.captureException(error, {
      level: severity as Sentry.SeverityLevel,
    });
    
    // Send alert for critical errors
    if (severity === 'critical') {
      this.sendAlert('CRITICAL_ERROR', {
        type,
        message: error.message,
        stack: error.stack,
      });
    }
  }

  /**
   * Create custom metric
   */
  createCustomMetric(
    name: string, 
    type: 'counter' | 'gauge' | 'histogram',
    help: string,
    labelNames?: string[]
  ) {
    let metric: prometheus.Metric;
    
    switch (type) {
      case 'counter':
        metric = new prometheus.Counter({ name, help, labelNames });
        break;
      case 'gauge':
        metric = new prometheus.Gauge({ name, help, labelNames });
        break;
      case 'histogram':
        metric = new prometheus.Histogram({ 
          name, 
          help, 
          labelNames,
          buckets: prometheus.exponentialBuckets(0.001, 2, 10),
        });
        break;
    }
    
    this.registry.registerMetric(metric);
    this.customMetrics.set(name, metric);
    
    return metric;
  }

  /**
   * Track custom metric
   */
  trackCustomMetric(name: string, value: number, labels?: Record<string, string>) {
    const metric = this.customMetrics.get(name);
    if (!metric) {
      throw new Error(`Custom metric ${name} not found`);
    }
    
    if (metric instanceof prometheus.Counter) {
      metric.inc(labels, value);
    } else if (metric instanceof prometheus.Gauge) {
      metric.set(labels || {}, value);
    } else if (metric instanceof prometheus.Histogram) {
      metric.observe(labels || {}, value);
    }
    
    // Send to StatsD
    this.statsd.gauge(`custom.${name}`, value, 
      Object.entries(labels || {}).map(([k, v]) => `${k}:${v}`)
    );
  }

  /**
   * Calculate cache hit rate
   */
  private async calculateCacheHitRate(cacheType: string) {
    const hits = await this.registry.getSingleMetricAsString('cache_hits_total');
    const misses = await this.registry.getSingleMetricAsString('cache_misses_total');
    
    // Parse values (simplified - in production use proper parsing)
    const hitCount = parseInt(hits || '0');
    const missCount = parseInt(misses || '0');
    const total = hitCount + missCount;
    
    if (total > 0) {
      const hitRate = (hitCount / total) * 100;
      
      if (hitRate < this.config.alertThresholds.cacheHitRate) {
        this.sendAlert('LOW_CACHE_HIT_RATE', {
          cacheType,
          hitRate,
          threshold: this.config.alertThresholds.cacheHitRate,
        });
      }
    }
  }

  /**
   * Check thresholds
   */
  private checkThresholds(metric: PerformanceMetric) {
    // Implement threshold checking logic
    this.emit('thresholdCheck', metric);
  }

  /**
   * Send alert
   */
  private sendAlert(type: string, data: any) {
    const alert = {
      type,
      data,
      timestamp: new Date(),
      severity: this.getAlertSeverity(type),
    };
    
    // Emit alert event
    this.emit('alert', alert);
    
    // Log to console (in production, send to alerting system)
    console.error(`ALERT [${alert.severity}]: ${type}`, data);
    
    // Send to Sentry as breadcrumb
    Sentry.addBreadcrumb({
      category: 'alert',
      message: type,
      level: alert.severity as Sentry.SeverityLevel,
      data,
    });
  }

  /**
   * Get alert severity
   */
  private getAlertSeverity(type: string): string {
    const severityMap: Record<string, string> = {
      'CRITICAL_ERROR': 'critical',
      'HIGH_MEMORY_USAGE': 'high',
      'HIGH_CPU_USAGE': 'high',
      'SLOW_API_RESPONSE': 'medium',
      'SLOW_DB_QUERY': 'medium',
      'LOW_CACHE_HIT_RATE': 'low',
    };
    
    return severityMap[type] || 'info';
  }

  /**
   * Get metrics for Prometheus
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  /**
   * Create Express middleware
   */
  expressMiddleware() {
    return (req: any, res: any, next: any) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        this.trackHttpRequest(
          req.method,
          req.route?.path || req.path,
          res.statusCode,
          duration
        );
      });
      
      next();
    };
  }

  /**
   * Create database query wrapper
   */
  wrapDatabaseQuery<T>(
    operation: string,
    table: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    const start = Date.now();
    
    return queryFn()
      .then((result) => {
        const duration = Date.now() - start;
        this.trackDatabaseQuery(operation, table, duration);
        return result;
      })
      .catch((error) => {
        const duration = Date.now() - start;
        this.trackDatabaseQuery(operation, table, duration);
        this.trackError(error, 'high');
        throw error;
      });
  }

  /**
   * Shutdown monitoring
   */
  shutdown() {
    this.performanceObserver.disconnect();
    this.statsd.close();
    this.removeAllListeners();
  }
}

// Export singleton instance with default config
export default PerformanceMonitor.getInstance;
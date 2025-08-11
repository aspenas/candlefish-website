/**
 * Performance Monitoring and Metrics Collection
 * Real-time performance tracking with alerts
 */

import { EventEmitter } from 'events';

// ============================================
// 1. PERFORMANCE METRICS COLLECTOR
// ============================================

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  tags?: Record<string, string>;
}

export class MetricsCollector extends EventEmitter {
  private metrics: PerformanceMetric[] = [];
  private aggregates: Map<string, number[]> = new Map();
  private thresholds: Map<string, number> = new Map();

  constructor() {
    super();
    this.setupThresholds();
    this.startAggregation();
  }

  private setupThresholds(): void {
    // Define performance thresholds
    this.thresholds.set('api.response_time', 200);
    this.thresholds.set('db.query_time', 50);
    this.thresholds.set('pdf.generation_time', 1000);
    this.thresholds.set('cache.hit_rate', 80);
    this.thresholds.set('error.rate', 1);
    this.thresholds.set('memory.usage', 80);
    this.thresholds.set('cpu.usage', 70);
  }

  record(name: string, value: number, unit: string = 'ms', tags?: Record<string, string>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      tags,
    };

    this.metrics.push(metric);

    // Add to aggregates
    if (!this.aggregates.has(name)) {
      this.aggregates.set(name, []);
    }
    this.aggregates.get(name)!.push(value);

    // Check threshold
    this.checkThreshold(name, value);

    // Emit metric event
    this.emit('metric', metric);
  }

  private checkThreshold(name: string, value: number): void {
    const threshold = this.thresholds.get(name);
    if (threshold && value > threshold) {
      this.emit('threshold_exceeded', {
        metric: name,
        value,
        threshold,
        severity: this.getSeverity(name, value, threshold),
      });
    }
  }

  private getSeverity(name: string, value: number, threshold: number): 'warning' | 'critical' {
    const ratio = value / threshold;
    return ratio > 2 ? 'critical' : 'warning';
  }

  private startAggregation(): void {
    setInterval(() => {
      this.calculateAggregates();
      this.cleanOldMetrics();
    }, 60000); // Every minute
  }

  private calculateAggregates(): void {
    for (const [name, values] of this.aggregates.entries()) {
      if (values.length === 0) continue;

      const stats = {
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        p50: this.percentile(values, 50),
        p95: this.percentile(values, 95),
        p99: this.percentile(values, 99),
        count: values.length,
      };

      this.emit('aggregate', { name, stats, timestamp: Date.now() });

      // Clear values after aggregation
      this.aggregates.set(name, []);
    }
  }

  private percentile(values: number[], p: number): number {
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private cleanOldMetrics(): void {
    const cutoff = Date.now() - 3600000; // Keep 1 hour
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
  }

  getMetrics(name?: string, timeRange?: { start: number; end: number }): PerformanceMetric[] {
    let filtered = this.metrics;

    if (name) {
      filtered = filtered.filter(m => m.name === name);
    }

    if (timeRange) {
      filtered = filtered.filter(
        m => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
      );
    }

    return filtered;
  }
}

// ============================================
// 2. API PERFORMANCE MONITOR
// ============================================

export class APIMonitor {
  private collector = new MetricsCollector();
  private requestMap = new Map<string, number>();

  startRequest(requestId: string): void {
    this.requestMap.set(requestId, performance.now());
  }

  endRequest(
    requestId: string,
    endpoint: string,
    statusCode: number,
    error?: Error
  ): void {
    const startTime = this.requestMap.get(requestId);
    if (!startTime) return;

    const duration = performance.now() - startTime;
    this.requestMap.delete(requestId);

    // Record metrics
    this.collector.record(`api.response_time`, duration, 'ms', {
      endpoint,
      status: statusCode.toString(),
      success: (statusCode < 400).toString(),
    });

    if (error) {
      this.collector.record('api.error_rate', 1, 'count', {
        endpoint,
        error: error.message,
      });
    }

    // Log slow requests
    if (duration > 1000) {
      console.warn(`Slow API request: ${endpoint} took ${duration.toFixed(2)}ms`);
    }
  }

  recordCacheHit(endpoint: string, hit: boolean): void {
    this.collector.record('cache.hit_rate', hit ? 100 : 0, 'percent', {
      endpoint,
    });
  }

  getStats(): any {
    return this.collector.getMetrics('api.response_time');
  }
}

// ============================================
// 3. DATABASE PERFORMANCE MONITOR
// ============================================

export class DatabaseMonitor {
  private collector = new MetricsCollector();
  private queryMap = new Map<string, { start: number; query: string }>();

  startQuery(queryId: string, query: string): void {
    this.queryMap.set(queryId, {
      start: performance.now(),
      query: query.substring(0, 100), // Truncate for logging
    });
  }

  endQuery(queryId: string, rowCount: number, error?: Error): void {
    const queryInfo = this.queryMap.get(queryId);
    if (!queryInfo) return;

    const duration = performance.now() - queryInfo.start;
    this.queryMap.delete(queryId);

    // Record metrics
    this.collector.record('db.query_time', duration, 'ms', {
      query_type: this.getQueryType(queryInfo.query),
      row_count: rowCount.toString(),
      success: (!error).toString(),
    });

    if (error) {
      this.collector.record('db.error_rate', 1, 'count', {
        error: error.message,
      });
    }

    // Log slow queries
    if (duration > 100) {
      console.warn(`Slow query detected: ${queryInfo.query} took ${duration.toFixed(2)}ms`);
    }
  }

  private getQueryType(query: string): string {
    const upperQuery = query.toUpperCase().trim();
    if (upperQuery.startsWith('SELECT')) return 'SELECT';
    if (upperQuery.startsWith('INSERT')) return 'INSERT';
    if (upperQuery.startsWith('UPDATE')) return 'UPDATE';
    if (upperQuery.startsWith('DELETE')) return 'DELETE';
    return 'OTHER';
  }

  recordConnectionPoolStats(active: number, idle: number, waiting: number): void {
    this.collector.record('db.pool.active', active, 'count');
    this.collector.record('db.pool.idle', idle, 'count');
    this.collector.record('db.pool.waiting', waiting, 'count');
  }
}

// ============================================
// 4. SYSTEM RESOURCE MONITOR
// ============================================

export class SystemMonitor {
  private collector = new MetricsCollector();
  private interval: NodeJS.Timer | null = null;

  start(): void {
    this.interval = setInterval(() => {
      this.collectSystemMetrics();
    }, 5000); // Every 5 seconds
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private collectSystemMetrics(): void {
    if (typeof process !== 'undefined') {
      // Memory usage
      const memUsage = process.memoryUsage();
      this.collector.record('memory.heap_used', memUsage.heapUsed / 1024 / 1024, 'MB');
      this.collector.record('memory.heap_total', memUsage.heapTotal / 1024 / 1024, 'MB');
      this.collector.record('memory.rss', memUsage.rss / 1024 / 1024, 'MB');
      this.collector.record('memory.external', memUsage.external / 1024 / 1024, 'MB');

      // CPU usage
      const cpuUsage = process.cpuUsage();
      this.collector.record('cpu.user', cpuUsage.user / 1000, 'ms');
      this.collector.record('cpu.system', cpuUsage.system / 1000, 'ms');

      // Event loop lag
      const start = performance.now();
      setImmediate(() => {
        const lag = performance.now() - start;
        this.collector.record('event_loop.lag', lag, 'ms');
      });
    }
  }

  recordGarbageCollection(duration: number, type: string): void {
    this.collector.record('gc.duration', duration, 'ms', { type });
  }
}

// ============================================
// 5. FRONTEND PERFORMANCE MONITOR
// ============================================

export class FrontendMonitor {
  private collector = new MetricsCollector();

  recordWebVital(name: string, value: number): void {
    const vitalsMap: Record<string, string> = {
      FCP: 'first_contentful_paint',
      LCP: 'largest_contentful_paint',
      FID: 'first_input_delay',
      CLS: 'cumulative_layout_shift',
      TTFB: 'time_to_first_byte',
      INP: 'interaction_to_next_paint',
    };

    const metricName = vitalsMap[name] || name.toLowerCase();
    this.collector.record(`web_vitals.${metricName}`, value, 'ms');
  }

  recordResourceTiming(resource: PerformanceResourceTiming): void {
    const duration = resource.responseEnd - resource.startTime;
    const type = this.getResourceType(resource.name);

    this.collector.record('resource.load_time', duration, 'ms', {
      type,
      name: resource.name.substring(0, 100),
      size: resource.transferSize.toString(),
    });
  }

  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'script';
    if (url.includes('.css')) return 'stylesheet';
    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)/)) return 'image';
    if (url.match(/\.(woff|woff2|ttf|eot)/)) return 'font';
    if (url.includes('/api/')) return 'api';
    return 'other';
  }

  recordBundleSize(name: string, size: number): void {
    this.collector.record('bundle.size', size / 1024, 'KB', { name });
  }

  recordHydrationTime(duration: number): void {
    this.collector.record('react.hydration_time', duration, 'ms');
  }
}

// ============================================
// 6. ALERT MANAGER
// ============================================

interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  metric: string;
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
  resolved: boolean;
}

export class AlertManager {
  private alerts: Map<string, Alert> = new Map();
  private handlers: Map<string, (alert: Alert) => void> = new Map();

  constructor(private collector: MetricsCollector) {
    this.setupListeners();
  }

  private setupListeners(): void {
    this.collector.on('threshold_exceeded', (data) => {
      this.createAlert(data);
    });
  }

  private createAlert(data: any): void {
    const alertId = `${data.metric}-${Date.now()}`;
    const alert: Alert = {
      id: alertId,
      severity: data.severity,
      metric: data.metric,
      message: `${data.metric} exceeded threshold: ${data.value} > ${data.threshold}`,
      value: data.value,
      threshold: data.threshold,
      timestamp: Date.now(),
      resolved: false,
    };

    this.alerts.set(alertId, alert);
    this.notifyHandlers(alert);

    // Auto-resolve after 5 minutes if metric returns to normal
    setTimeout(() => {
      this.checkAutoResolve(alertId);
    }, 300000);
  }

  private checkAutoResolve(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert && !alert.resolved) {
      // Check if metric is back to normal
      const recentMetrics = this.collector.getMetrics(alert.metric, {
        start: Date.now() - 60000,
        end: Date.now(),
      });

      const avgValue = recentMetrics.reduce((sum, m) => sum + m.value, 0) / recentMetrics.length;

      if (avgValue < alert.threshold) {
        this.resolveAlert(alertId);
      }
    }
  }

  resolveAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      this.notifyHandlers({ ...alert, message: `Alert resolved: ${alert.metric}` });
    }
  }

  registerHandler(name: string, handler: (alert: Alert) => void): void {
    this.handlers.set(name, handler);
  }

  private notifyHandlers(alert: Alert): void {
    for (const handler of this.handlers.values()) {
      handler(alert);
    }
  }

  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(a => !a.resolved);
  }
}

// ============================================
// 7. DASHBOARD DATA PROVIDER
// ============================================

export class DashboardDataProvider {
  constructor(
    private apiMonitor: APIMonitor,
    private dbMonitor: DatabaseMonitor,
    private systemMonitor: SystemMonitor,
    private frontendMonitor: FrontendMonitor,
    private alertManager: AlertManager
  ) {}

  getDashboardData(): any {
    return {
      timestamp: Date.now(),
      api: {
        responseTime: this.getMetricStats('api.response_time'),
        errorRate: this.getMetricStats('api.error_rate'),
        throughput: this.getMetricStats('api.throughput'),
      },
      database: {
        queryTime: this.getMetricStats('db.query_time'),
        connectionPool: {
          active: this.getLatestValue('db.pool.active'),
          idle: this.getLatestValue('db.pool.idle'),
          waiting: this.getLatestValue('db.pool.waiting'),
        },
      },
      system: {
        memory: {
          used: this.getLatestValue('memory.heap_used'),
          total: this.getLatestValue('memory.heap_total'),
        },
        cpu: {
          user: this.getLatestValue('cpu.user'),
          system: this.getLatestValue('cpu.system'),
        },
        eventLoop: {
          lag: this.getLatestValue('event_loop.lag'),
        },
      },
      frontend: {
        webVitals: {
          lcp: this.getLatestValue('web_vitals.largest_contentful_paint'),
          fid: this.getLatestValue('web_vitals.first_input_delay'),
          cls: this.getLatestValue('web_vitals.cumulative_layout_shift'),
        },
        bundleSize: this.getLatestValue('bundle.size'),
      },
      alerts: this.alertManager.getActiveAlerts(),
    };
  }

  private getMetricStats(metricName: string): any {
    // Implementation to get metric statistics
    return {
      current: 0,
      avg: 0,
      min: 0,
      max: 0,
      p95: 0,
      p99: 0,
    };
  }

  private getLatestValue(metricName: string): number {
    // Implementation to get latest metric value
    return 0;
  }
}

// ============================================
// 8. MONITORING SETUP
// ============================================

export function setupMonitoring() {
  const collector = new MetricsCollector();
  const apiMonitor = new APIMonitor();
  const dbMonitor = new DatabaseMonitor();
  const systemMonitor = new SystemMonitor();
  const frontendMonitor = new FrontendMonitor();
  const alertManager = new AlertManager(collector);
  const dashboard = new DashboardDataProvider(
    apiMonitor,
    dbMonitor,
    systemMonitor,
    frontendMonitor,
    alertManager
  );

  // Start system monitoring
  systemMonitor.start();

  // Setup alert handlers
  alertManager.registerHandler('console', (alert) => {
    console.log(`[ALERT] ${alert.severity.toUpperCase()}: ${alert.message}`);
  });

  alertManager.registerHandler('slack', async (alert) => {
    // Send to Slack webhook
    if (process.env.SLACK_WEBHOOK_URL) {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 ${alert.severity.toUpperCase()}: ${alert.message}`,
          attachments: [{
            color: alert.severity === 'critical' ? 'danger' : 'warning',
            fields: [
              { title: 'Metric', value: alert.metric },
              { title: 'Value', value: alert.value.toString() },
              { title: 'Threshold', value: alert.threshold.toString() },
            ],
          }],
        }),
      });
    }
  });

  return {
    collector,
    apiMonitor,
    dbMonitor,
    systemMonitor,
    frontendMonitor,
    alertManager,
    dashboard,
  };
}

export default setupMonitoring;

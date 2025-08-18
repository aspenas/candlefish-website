/**
 * Metrics Controller for Prometheus monitoring
 * Provides application metrics in Prometheus format
 */

import { Request, Response } from 'express';
import { logger } from '../utils/logger';

const moduleLogger = logger.child({ module: 'MetricsController' });

// Simple in-memory metrics store
class MetricsStore {
  private metrics: Map<string, any> = new Map();
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, { buckets: Map<number, number>; sum: number; count: number }> = new Map();

  incrementCounter(name: string, labels: Record<string, string> = {}, value: number = 1) {
    const key = this.createKey(name, labels);
    this.counters.set(key, (this.counters.get(key) || 0) + value);
  }

  setGauge(name: string, labels: Record<string, string> = {}, value: number) {
    const key = this.createKey(name, labels);
    this.gauges.set(key, value);
  }

  observeHistogram(name: string, labels: Record<string, string> = {}, value: number) {
    const key = this.createKey(name, labels);
    if (!this.histograms.has(key)) {
      this.histograms.set(key, {
        buckets: new Map([
          [0.005, 0], [0.01, 0], [0.025, 0], [0.05, 0], [0.1, 0],
          [0.25, 0], [0.5, 0], [1, 0], [2.5, 0], [5, 0], [10, 0], [Infinity, 0]
        ]),
        sum: 0,
        count: 0
      });
    }

    const histogram = this.histograms.get(key)!;
    histogram.sum += value;
    histogram.count++;

    // Update buckets
    for (const [bucket, _] of histogram.buckets) {
      if (value <= bucket) {
        histogram.buckets.set(bucket, histogram.buckets.get(bucket)! + 1);
      }
    }
  }

  private createKey(name: string, labels: Record<string, string>): string {
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return labelStr ? `${name}{${labelStr}}` : name;
  }

  exportPrometheusFormat(): string {
    const lines: string[] = [];

    // Export counters
    for (const [key, value] of this.counters) {
      lines.push(`${key} ${value}`);
    }

    // Export gauges
    for (const [key, value] of this.gauges) {
      lines.push(`${key} ${value}`);
    }

    // Export histograms
    for (const [key, histogram] of this.histograms) {
      const baseName = key.split('{')[0];
      const labels = key.includes('{') ? key.substring(key.indexOf('{')).slice(0, -1) : '';

      // Bucket metrics
      for (const [bucket, count] of histogram.buckets) {
        const bucketKey = labels
          ? `${baseName}_bucket{${labels},le="${bucket === Infinity ? '+Inf' : bucket}"}`
          : `${baseName}_bucket{le="${bucket === Infinity ? '+Inf' : bucket}"}`;
        lines.push(`${bucketKey} ${count}`);
      }

      // Sum and count
      const sumKey = labels ? `${baseName}_sum{${labels}}` : `${baseName}_sum`;
      const countKey = labels ? `${baseName}_count{${labels}}` : `${baseName}_count`;
      lines.push(`${sumKey} ${histogram.sum}`);
      lines.push(`${countKey} ${histogram.count}`);
    }

    return lines.join('\n') + '\n';
  }
}

// Global metrics store
export const metricsStore = new MetricsStore();

// Initialize default metrics
function updateSystemMetrics() {
  const memUsage = process.memoryUsage();

  // Memory metrics
  metricsStore.setGauge('nodejs_heap_size_used_bytes', {}, memUsage.heapUsed);
  metricsStore.setGauge('nodejs_heap_size_total_bytes', {}, memUsage.heapTotal);
  metricsStore.setGauge('nodejs_external_memory_bytes', {}, memUsage.external);
  metricsStore.setGauge('nodejs_rss_bytes', {}, memUsage.rss);

  // Process metrics
  metricsStore.setGauge('nodejs_uptime_seconds', {}, process.uptime());
  metricsStore.setGauge('nodejs_process_cpu_user_seconds_total', {}, process.cpuUsage().user / 1000000);
  metricsStore.setGauge('nodejs_process_cpu_system_seconds_total', {}, process.cpuUsage().system / 1000000);

  // Event loop lag (simplified)
  const start = process.hrtime.bigint();
  setImmediate(() => {
    const lag = Number(process.hrtime.bigint() - start) / 1000000; // Convert to milliseconds
    metricsStore.setGauge('nodejs_eventloop_lag_seconds', {}, lag / 1000);
  });
}

// Update system metrics every 10 seconds
setInterval(updateSystemMetrics, 10000);
updateSystemMetrics(); // Initial update

/**
 * Prometheus metrics endpoint
 */
export const getMetrics = async (req: Request, res: Response): Promise<void> => {
  try {
    updateSystemMetrics();

    const metricsOutput = metricsStore.exportPrometheusFormat();

    // Add metadata comments
    const output = [
      '# HELP http_requests_total Total number of HTTP requests',
      '# TYPE http_requests_total counter',
      '# HELP http_request_duration_seconds HTTP request duration in seconds',
      '# TYPE http_request_duration_seconds histogram',
      '# HELP auth_operations_total Total number of authentication operations',
      '# TYPE auth_operations_total counter',
      '# HELP auth_operation_duration_seconds Authentication operation duration in seconds',
      '# TYPE auth_operation_duration_seconds histogram',
      '# HELP jwt_tokens_issued_total Total number of JWT tokens issued',
      '# TYPE jwt_tokens_issued_total counter',
      '# HELP jwt_tokens_verified_total Total number of JWT tokens verified',
      '# TYPE jwt_tokens_verified_total counter',
      '# HELP active_sessions Current number of active sessions',
      '# TYPE active_sessions gauge',
      '# HELP nodejs_heap_size_used_bytes Process heap memory currently used',
      '# TYPE nodejs_heap_size_used_bytes gauge',
      '# HELP nodejs_heap_size_total_bytes Process heap memory total',
      '# TYPE nodejs_heap_size_total_bytes gauge',
      '# HELP nodejs_external_memory_bytes Process external memory',
      '# TYPE nodejs_external_memory_bytes gauge',
      '# HELP nodejs_rss_bytes Process RSS memory',
      '# TYPE nodejs_rss_bytes gauge',
      '# HELP nodejs_uptime_seconds Process uptime in seconds',
      '# TYPE nodejs_uptime_seconds gauge',
      '# HELP nodejs_eventloop_lag_seconds Event loop lag in seconds',
      '# TYPE nodejs_eventloop_lag_seconds gauge',
      '',
      metricsOutput
    ].join('\n');

    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.status(200).send(output);

  } catch (error) {
    moduleLogger.error('Failed to generate metrics:', error);
    res.status(500).send('Internal Server Error');
  }
};

/**
 * Middleware to track HTTP request metrics
 */
export const httpMetricsMiddleware = (req: Request, res: Response, next: Function) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000; // Convert to seconds
    const labels = {
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode.toString()
    };

    metricsStore.incrementCounter('http_requests_total', labels);
    metricsStore.observeHistogram('http_request_duration_seconds', labels, duration);
  });

  next();
};

/**
 * Track authentication operation metrics
 */
export const trackAuthOperation = (operation: string, success: boolean, duration: number) => {
  const labels = {
    operation,
    status: success ? 'success' : 'failure'
  };

  metricsStore.incrementCounter('auth_operations_total', labels);
  metricsStore.observeHistogram('auth_operation_duration_seconds', labels, duration / 1000);
};

/**
 * Track JWT token operations
 */
export const trackJWTOperation = (operation: 'issued' | 'verified', success: boolean) => {
  const labels = {
    status: success ? 'success' : 'failure'
  };

  if (operation === 'issued') {
    metricsStore.incrementCounter('jwt_tokens_issued_total', labels);
  } else {
    metricsStore.incrementCounter('jwt_tokens_verified_total', labels);
  }
};

/**
 * Update active sessions count
 */
export const updateActiveSessionsCount = (count: number) => {
  metricsStore.setGauge('active_sessions', {}, count);
};

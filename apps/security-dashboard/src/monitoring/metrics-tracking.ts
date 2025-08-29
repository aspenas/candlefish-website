/**
 * Metrics Tracking System
 * Tracks 99.9% uptime and <100ms latency SLOs
 */

import { Counter, Histogram, Gauge, register, collectDefaultMetrics } from 'prom-client';
import { StatsD } from 'node-statsd';
import winston from 'winston';
import { EventEmitter } from 'events';

// Configure default metrics collection
collectDefaultMetrics({ prefix: 'security_dashboard_' });

// StatsD client for real-time metrics
const statsd = new StatsD({
  host: process.env.STATSD_HOST || 'localhost',
  port: parseInt(process.env.STATSD_PORT || '8125'),
  prefix: 'security_dashboard.',
  errorHandler: (error) => {
    console.error('StatsD error:', error);
  }
});

// Logger for metrics
const metricsLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'metrics-tracking' },
  transports: [
    new winston.transports.File({ filename: 'metrics.log' }),
    new winston.transports.Console({ format: winston.format.simple() })
  ]
});

/**
 * Core Metrics Definitions
 */
export const metrics = {
  // Uptime tracking
  uptime: new Gauge({
    name: 'security_dashboard_uptime_seconds',
    help: 'System uptime in seconds',
    labelNames: ['service']
  }),

  // Request metrics
  httpRequestDuration: new Histogram({
    name: 'security_dashboard_http_request_duration_ms',
    help: 'HTTP request duration in milliseconds',
    labelNames: ['method', 'route', 'status'],
    buckets: [10, 25, 50, 75, 100, 150, 200, 300, 500, 1000] // Latency buckets in ms
  }),

  httpRequestTotal: new Counter({
    name: 'security_dashboard_http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status']
  }),

  // API-specific metrics
  graphqlQueryDuration: new Histogram({
    name: 'security_dashboard_graphql_query_duration_ms',
    help: 'GraphQL query execution time in milliseconds',
    labelNames: ['operation', 'operationName'],
    buckets: [10, 25, 50, 75, 100, 150, 200, 300, 500, 1000]
  }),

  graphqlErrors: new Counter({
    name: 'security_dashboard_graphql_errors_total',
    help: 'Total number of GraphQL errors',
    labelNames: ['operation', 'errorType']
  }),

  // Database metrics
  dbQueryDuration: new Histogram({
    name: 'security_dashboard_db_query_duration_ms',
    help: 'Database query duration in milliseconds',
    labelNames: ['database', 'operation'],
    buckets: [5, 10, 25, 50, 75, 100, 150, 200, 300, 500]
  }),

  dbConnectionPool: new Gauge({
    name: 'security_dashboard_db_connections',
    help: 'Database connection pool status',
    labelNames: ['database', 'state'] // state: active, idle, waiting
  }),

  // Security event metrics
  securityEvents: new Counter({
    name: 'security_dashboard_security_events_total',
    help: 'Total security events processed',
    labelNames: ['severity', 'type', 'status']
  }),

  threatDetections: new Counter({
    name: 'security_dashboard_threat_detections_total',
    help: 'Total threats detected',
    labelNames: ['severity', 'category']
  }),

  // Performance metrics
  memoryUsage: new Gauge({
    name: 'security_dashboard_memory_usage_bytes',
    help: 'Memory usage in bytes',
    labelNames: ['type'] // heap, external, rss
  }),

  cpuUsage: new Gauge({
    name: 'security_dashboard_cpu_usage_percent',
    help: 'CPU usage percentage',
    labelNames: ['core']
  }),

  // WebSocket metrics
  wsConnections: new Gauge({
    name: 'security_dashboard_websocket_connections',
    help: 'Active WebSocket connections'
  }),

  wsMessages: new Counter({
    name: 'security_dashboard_websocket_messages_total',
    help: 'Total WebSocket messages',
    labelNames: ['direction'] // sent, received
  }),

  // Business metrics
  activeUsers: new Gauge({
    name: 'security_dashboard_active_users',
    help: 'Number of active users',
    labelNames: ['type'] // concurrent, daily, monthly
  }),

  incidentMTTR: new Histogram({
    name: 'security_dashboard_incident_mttr_minutes',
    help: 'Mean Time To Resolution for incidents',
    labelNames: ['severity'],
    buckets: [5, 15, 30, 60, 120, 240, 480, 720, 1440]
  })
};

/**
 * SLO Tracking Class
 */
export class SLOTracker extends EventEmitter {
  private uptimeStart: Date;
  private downtimeTotal: number = 0;
  private lastDowntime: Date | null = null;
  private latencyBuffer: number[] = [];
  private readonly LATENCY_BUFFER_SIZE = 1000;

  constructor() {
    super();
    this.uptimeStart = new Date();
    this.startTracking();
  }

  private startTracking() {
    // Track uptime every second
    setInterval(() => {
      const uptimeSeconds = (Date.now() - this.uptimeStart.getTime()) / 1000;
      const uptimePercentage = this.calculateUptimePercentage();
      
      metrics.uptime.set({ service: 'main' }, uptimeSeconds);
      
      // Check SLO compliance
      if (uptimePercentage < 99.9) {
        this.emit('slo-violation', {
          type: 'uptime',
          current: uptimePercentage,
          target: 99.9
        });
      }
    }, 1000);

    // Check latency SLO every 10 seconds
    setInterval(() => {
      const p95Latency = this.calculateP95Latency();
      
      if (p95Latency > 100) {
        this.emit('slo-violation', {
          type: 'latency',
          current: p95Latency,
          target: 100
        });
      }
    }, 10000);

    // Collect system metrics every 5 seconds
    setInterval(() => {
      this.collectSystemMetrics();
    }, 5000);
  }

  recordDowntime(duration: number) {
    this.downtimeTotal += duration;
    this.lastDowntime = new Date();
    
    metricsLogger.error('Downtime recorded', {
      duration,
      total: this.downtimeTotal,
      timestamp: this.lastDowntime
    });
  }

  recordLatency(latency: number) {
    // Add to buffer
    this.latencyBuffer.push(latency);
    
    // Keep buffer size limited
    if (this.latencyBuffer.length > this.LATENCY_BUFFER_SIZE) {
      this.latencyBuffer.shift();
    }

    // Send to StatsD for real-time tracking
    statsd.timing('request.latency', latency);
  }

  calculateUptimePercentage(): number {
    const totalTime = Date.now() - this.uptimeStart.getTime();
    const uptime = totalTime - this.downtimeTotal;
    return (uptime / totalTime) * 100;
  }

  calculateP95Latency(): number {
    if (this.latencyBuffer.length === 0) return 0;
    
    const sorted = [...this.latencyBuffer].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * 0.95);
    return sorted[index];
  }

  private collectSystemMetrics() {
    // Memory metrics
    const memUsage = process.memoryUsage();
    metrics.memoryUsage.set({ type: 'heap' }, memUsage.heapUsed);
    metrics.memoryUsage.set({ type: 'external' }, memUsage.external);
    metrics.memoryUsage.set({ type: 'rss' }, memUsage.rss);

    // CPU metrics (simplified - in production use proper CPU monitoring)
    const cpuUsage = process.cpuUsage();
    const totalCpu = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
    metrics.cpuUsage.set({ core: 'all' }, totalCpu);

    // Send to StatsD
    statsd.gauge('memory.heap', memUsage.heapUsed);
    statsd.gauge('cpu.usage', totalCpu);
  }

  getSLOStatus() {
    return {
      uptime: {
        current: this.calculateUptimePercentage(),
        target: 99.9,
        compliant: this.calculateUptimePercentage() >= 99.9
      },
      latency: {
        current: this.calculateP95Latency(),
        target: 100,
        compliant: this.calculateP95Latency() <= 100
      },
      lastDowntime: this.lastDowntime,
      totalDowntime: this.downtimeTotal,
      metrics: {
        requestsProcessed: metrics.httpRequestTotal.hashMap,
        errorsLogged: metrics.graphqlErrors.hashMap,
        activeConnections: metrics.wsConnections.hashMap
      }
    };
  }
}

/**
 * Express middleware for request tracking
 */
export function requestMetricsMiddleware(req: any, res: any, next: any) {
  const start = Date.now();

  // Track request start
  statsd.increment('requests.incoming');

  res.on('finish', () => {
    const duration = Date.now() - start;
    const route = req.route?.path || req.path;
    const labels = {
      method: req.method,
      route: route,
      status: res.statusCode.toString()
    };

    // Record metrics
    metrics.httpRequestDuration.observe(labels, duration);
    metrics.httpRequestTotal.inc(labels);

    // Track in SLO
    if (sloTracker) {
      sloTracker.recordLatency(duration);
    }

    // StatsD metrics
    statsd.timing(`request.${req.method.toLowerCase()}.${res.statusCode}`, duration);

    // Log slow requests
    if (duration > 1000) {
      metricsLogger.warn('Slow request detected', {
        method: req.method,
        route,
        duration,
        status: res.statusCode
      });
    }
  });

  next();
}

/**
 * GraphQL metrics plugin
 */
export const graphqlMetricsPlugin = {
  requestDidStart() {
    const start = Date.now();
    
    return {
      willSendResponse(requestContext: any) {
        const duration = Date.now() - start;
        const operation = requestContext.request.operationName || 'anonymous';
        const operationType = requestContext.operation?.operation || 'unknown';

        metrics.graphqlQueryDuration.observe(
          { operation: operationType, operationName: operation },
          duration
        );

        // Track errors
        if (requestContext.errors) {
          requestContext.errors.forEach((error: any) => {
            metrics.graphqlErrors.inc({
              operation: operationType,
              errorType: error.extensions?.code || 'UNKNOWN'
            });
          });
        }

        statsd.timing(`graphql.${operationType}`, duration);
      }
    };
  }
};

/**
 * Database metrics wrapper
 */
export function trackDatabaseQuery(database: string, operation: string, queryFn: () => Promise<any>) {
  const start = Date.now();
  
  return queryFn()
    .then(result => {
      const duration = Date.now() - start;
      metrics.dbQueryDuration.observe({ database, operation }, duration);
      statsd.timing(`db.${database}.${operation}`, duration);
      return result;
    })
    .catch(error => {
      const duration = Date.now() - start;
      metrics.dbQueryDuration.observe({ database, operation }, duration);
      statsd.increment(`db.${database}.errors`);
      throw error;
    });
}

/**
 * Health check endpoint data
 */
export function getHealthMetrics() {
  const sloStatus = sloTracker.getSLOStatus();
  
  return {
    status: sloStatus.uptime.compliant && sloStatus.latency.compliant ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: {
      percentage: sloStatus.uptime.current.toFixed(3),
      target: '99.9',
      compliant: sloStatus.uptime.compliant
    },
    latency: {
      p95: sloStatus.latency.current.toFixed(2),
      target: '100ms',
      compliant: sloStatus.latency.compliant
    },
    metrics: {
      requestsPerSecond: calculateRequestRate(),
      activeConnections: metrics.wsConnections.get().values[0]?.value || 0,
      errorRate: calculateErrorRate()
    }
  };
}

/**
 * Calculate request rate
 */
function calculateRequestRate(): number {
  // Simplified calculation - in production use proper windowing
  const total = Array.from(metrics.httpRequestTotal.hashMap.values())
    .reduce((sum, item) => sum + (item.value || 0), 0);
  const uptimeSeconds = (Date.now() - sloTracker.uptimeStart.getTime()) / 1000;
  return total / uptimeSeconds;
}

/**
 * Calculate error rate
 */
function calculateErrorRate(): number {
  const total = Array.from(metrics.httpRequestTotal.hashMap.values())
    .reduce((sum, item) => sum + (item.value || 0), 0);
  const errors = Array.from(metrics.httpRequestTotal.hashMap.values())
    .filter(item => item.labels.status >= '400')
    .reduce((sum, item) => sum + (item.value || 0), 0);
  return total > 0 ? (errors / total) * 100 : 0;
}

// Create global SLO tracker instance
export const sloTracker = new SLOTracker();

// Handle SLO violations
sloTracker.on('slo-violation', (violation) => {
  metricsLogger.error('SLO Violation Detected', violation);
  
  // Send alert (integrate with PagerDuty, Slack, etc.)
  statsd.increment(`slo.violation.${violation.type}`);
  
  // You could trigger automated remediation here
  if (violation.type === 'latency' && violation.current > 200) {
    metricsLogger.warn('Triggering auto-scaling due to high latency');
    // Trigger auto-scaling logic
  }
});

// Export Prometheus metrics endpoint handler
export function metricsEndpoint(req: any, res: any) {
  res.set('Content-Type', register.contentType);
  register.metrics().then(metrics => {
    res.end(metrics);
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  metricsLogger.info('Shutting down metrics tracking');
  statsd.close();
});

export default {
  metrics,
  sloTracker,
  requestMetricsMiddleware,
  graphqlMetricsPlugin,
  trackDatabaseQuery,
  getHealthMetrics,
  metricsEndpoint
};
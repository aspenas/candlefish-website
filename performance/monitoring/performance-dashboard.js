/**
 * Real-time Performance Monitoring Dashboard
 * Tracks and visualizes performance metrics across all systems
 */

const express = require('express');
const { Server } = require('socket.io');
const prometheus = require('prom-client');
const StatsD = require('node-statsd');
const pino = require('pino');

const logger = pino({
  level: 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

class PerformanceMonitor {
  constructor(config = {}) {
    this.app = express();
    this.port = config.port || 3001;
    this.metrics = new Map();
    this.thresholds = config.thresholds || this.getDefaultThresholds();
    this.alerts = [];

    // Prometheus metrics
    this.register = new prometheus.Registry();
    this.setupPrometheusMetrics();

    // StatsD client for real-time metrics
    this.statsd = new StatsD({
      host: config.statsdHost || 'localhost',
      port: config.statsdPort || 8125,
      prefix: 'candlefish.',
      errorHandler: (error) => {
        logger.error({ error }, 'StatsD error');
      }
    });

    this.setupServer();
    this.startCollectors();
  }

  getDefaultThresholds() {
    return {
      api: {
        responseTime: { warning: 150, critical: 200 },
        errorRate: { warning: 0.01, critical: 0.05 },
        throughput: { warning: 100, critical: 50 }
      },
      database: {
        queryTime: { warning: 30, critical: 50 },
        connectionPool: { warning: 80, critical: 95 },
        slowQueries: { warning: 5, critical: 10 }
      },
      frontend: {
        fcp: { warning: 1500, critical: 1800 },
        lcp: { warning: 2000, critical: 2500 },
        cls: { warning: 0.05, critical: 0.1 },
        tti: { warning: 2500, critical: 3000 }
      },
      cache: {
        hitRate: { warning: 0.7, critical: 0.5 },
        latency: { warning: 10, critical: 20 }
      },
      system: {
        cpu: { warning: 70, critical: 90 },
        memory: { warning: 80, critical: 95 },
        disk: { warning: 85, critical: 95 }
      }
    };
  }

  setupPrometheusMetrics() {
    // API metrics
    this.apiDuration = new prometheus.Histogram({
      name: 'api_request_duration_seconds',
      help: 'API request duration in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5]
    });
    this.register.registerMetric(this.apiDuration);

    this.apiErrors = new prometheus.Counter({
      name: 'api_errors_total',
      help: 'Total number of API errors',
      labelNames: ['method', 'route', 'error_type']
    });
    this.register.registerMetric(this.apiErrors);

    // Database metrics
    this.dbQueryDuration = new prometheus.Histogram({
      name: 'db_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['query_type', 'table'],
      buckets: [0.001, 0.005, 0.01, 0.02, 0.05, 0.1, 0.5]
    });
    this.register.registerMetric(this.dbQueryDuration);

    this.dbConnections = new prometheus.Gauge({
      name: 'db_connections_active',
      help: 'Number of active database connections',
      labelNames: ['pool']
    });
    this.register.registerMetric(this.dbConnections);

    // Cache metrics
    this.cacheHits = new prometheus.Counter({
      name: 'cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['cache_layer']
    });
    this.register.registerMetric(this.cacheHits);

    this.cacheMisses = new prometheus.Counter({
      name: 'cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['cache_layer']
    });
    this.register.registerMetric(this.cacheMisses);

    // Frontend metrics
    this.webVitals = new prometheus.Gauge({
      name: 'web_vitals',
      help: 'Core Web Vitals metrics',
      labelNames: ['metric', 'page']
    });
    this.register.registerMetric(this.webVitals);

    // System metrics
    prometheus.collectDefaultMetrics({ register: this.register });
  }

  setupServer() {
    this.app.use(express.json());

    // Metrics ingestion endpoint
    this.app.post('/metrics/ingest', (req, res) => {
      const { type, name, value, labels = {} } = req.body;

      this.recordMetric(type, name, value, labels);
      res.status(202).json({ message: 'Metric recorded' });
    });

    // Prometheus metrics endpoint
    this.app.get('/metrics', async (req, res) => {
      res.set('Content-Type', this.register.contentType);
      res.end(await this.register.metrics());
    });

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      const health = this.getHealthStatus();
      res.status(health.status === 'healthy' ? 200 : 503).json(health);
    });

    // Dashboard API
    this.app.get('/api/dashboard', (req, res) => {
      res.json(this.getDashboardData());
    });

    // Alerts API
    this.app.get('/api/alerts', (req, res) => {
      res.json(this.alerts);
    });

    // Static dashboard
    this.app.use(express.static(__dirname + '/dashboard'));

    const server = this.app.listen(this.port, () => {
      logger.info(`Performance monitor listening on port ${this.port}`);
    });

    // WebSocket for real-time updates
    this.io = new Server(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    this.io.on('connection', (socket) => {
      logger.info('Dashboard client connected');

      // Send initial data
      socket.emit('dashboard:update', this.getDashboardData());

      // Send updates every second
      const interval = setInterval(() => {
        socket.emit('dashboard:update', this.getDashboardData());
        socket.emit('alerts:update', this.alerts);
      }, 1000);

      socket.on('disconnect', () => {
        clearInterval(interval);
        logger.info('Dashboard client disconnected');
      });
    });
  }

  recordMetric(type, name, value, labels = {}) {
    const key = `${name}:${JSON.stringify(labels)}`;

    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        type,
        name,
        labels,
        values: [],
        current: 0,
        min: Infinity,
        max: -Infinity,
        avg: 0,
        p50: 0,
        p95: 0,
        p99: 0
      });
    }

    const metric = this.metrics.get(key);
    metric.values.push({ value, timestamp: Date.now() });
    metric.current = value;

    // Keep only last 5 minutes of data
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    metric.values = metric.values.filter(v => v.timestamp > fiveMinutesAgo);

    // Calculate statistics
    if (metric.values.length > 0) {
      const values = metric.values.map(v => v.value).sort((a, b) => a - b);
      metric.min = Math.min(metric.min, value);
      metric.max = Math.max(metric.max, value);
      metric.avg = values.reduce((a, b) => a + b, 0) / values.length;
      metric.p50 = this.percentile(values, 0.5);
      metric.p95 = this.percentile(values, 0.95);
      metric.p99 = this.percentile(values, 0.99);
    }

    // Check thresholds
    this.checkThresholds(metric);

    // Send to StatsD
    switch (type) {
      case 'counter':
        this.statsd.increment(name, 1, labels);
        break;
      case 'gauge':
        this.statsd.gauge(name, value, labels);
        break;
      case 'histogram':
        this.statsd.histogram(name, value, labels);
        break;
      case 'timer':
        this.statsd.timing(name, value, labels);
        break;
    }

    // Update Prometheus metrics
    this.updatePrometheusMetric(type, name, value, labels);
  }

  updatePrometheusMetric(type, name, value, labels) {
    switch (name) {
      case 'api.duration':
        this.apiDuration.observe(labels, value / 1000);
        break;
      case 'api.errors':
        this.apiErrors.inc(labels);
        break;
      case 'db.query.duration':
        this.dbQueryDuration.observe(labels, value / 1000);
        break;
      case 'db.connections':
        this.dbConnections.set(labels, value);
        break;
      case 'cache.hits':
        this.cacheHits.inc(labels);
        break;
      case 'cache.misses':
        this.cacheMisses.inc(labels);
        break;
      case 'web.vitals':
        this.webVitals.set(labels, value);
        break;
    }
  }

  checkThresholds(metric) {
    const category = metric.name.split('.')[0];
    const metricName = metric.name.split('.').slice(1).join('.');

    if (this.thresholds[category] && this.thresholds[category][metricName]) {
      const threshold = this.thresholds[category][metricName];

      let severity = null;
      if (metric.current > threshold.critical) {
        severity = 'critical';
      } else if (metric.current > threshold.warning) {
        severity = 'warning';
      }

      if (severity) {
        this.createAlert({
          severity,
          metric: metric.name,
          value: metric.current,
          threshold: threshold[severity],
          message: `${metric.name} exceeded ${severity} threshold: ${metric.current} > ${threshold[severity]}`,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  createAlert(alert) {
    // Add to alerts array
    this.alerts.unshift(alert);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(0, 100);
    }

    // Emit to connected dashboards
    if (this.io) {
      this.io.emit('alert:new', alert);
    }

    // Log critical alerts
    if (alert.severity === 'critical') {
      logger.error({ alert }, 'Critical alert triggered');

      // Send to external alerting system (PagerDuty, Slack, etc.)
      this.sendExternalAlert(alert);
    }
  }

  sendExternalAlert(alert) {
    // Implement integration with external alerting systems
    // Example: Send to Slack webhook
    if (process.env.SLACK_WEBHOOK_URL) {
      fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 Critical Alert: ${alert.message}`,
          attachments: [{
            color: 'danger',
            fields: [
              { title: 'Metric', value: alert.metric, short: true },
              { title: 'Value', value: alert.value, short: true },
              { title: 'Threshold', value: alert.threshold, short: true },
              { title: 'Time', value: alert.timestamp, short: true }
            ]
          }]
        })
      }).catch(error => {
        logger.error({ error }, 'Failed to send Slack alert');
      });
    }
  }

  percentile(sortedArray, percentile) {
    const index = Math.ceil(sortedArray.length * percentile) - 1;
    return sortedArray[index] || 0;
  }

  getDashboardData() {
    const metricsArray = Array.from(this.metrics.values());

    return {
      timestamp: new Date().toISOString(),
      summary: {
        api: {
          avgResponseTime: this.getMetricValue('api.duration', 'avg'),
          errorRate: this.getMetricValue('api.errors', 'current') /
                     Math.max(1, this.getMetricValue('api.requests', 'current')),
          throughput: this.getMetricValue('api.throughput', 'current')
        },
        database: {
          avgQueryTime: this.getMetricValue('db.query.duration', 'avg'),
          activeConnections: this.getMetricValue('db.connections', 'current'),
          slowQueries: this.getMetricValue('db.slow_queries', 'current')
        },
        cache: {
          hitRate: this.calculateCacheHitRate(),
          avgLatency: this.getMetricValue('cache.latency', 'avg')
        },
        frontend: {
          fcp: this.getMetricValue('web.vitals.fcp', 'p95'),
          lcp: this.getMetricValue('web.vitals.lcp', 'p95'),
          cls: this.getMetricValue('web.vitals.cls', 'p95'),
          tti: this.getMetricValue('web.vitals.tti', 'p95')
        }
      },
      metrics: metricsArray.map(m => ({
        name: m.name,
        type: m.type,
        current: m.current,
        min: m.min,
        max: m.max,
        avg: m.avg,
        p50: m.p50,
        p95: m.p95,
        p99: m.p99,
        trend: m.values.slice(-20).map(v => ({
          value: v.value,
          timestamp: v.timestamp
        }))
      })),
      activeAlerts: this.alerts.filter(a =>
        Date.now() - new Date(a.timestamp).getTime() < 5 * 60 * 1000
      ),
      health: this.getHealthStatus()
    };
  }

  getMetricValue(metricName, field = 'current') {
    for (const [key, metric] of this.metrics) {
      if (metric.name === metricName) {
        return metric[field] || 0;
      }
    }
    return 0;
  }

  calculateCacheHitRate() {
    const hits = this.getMetricValue('cache.hits', 'current');
    const misses = this.getMetricValue('cache.misses', 'current');
    const total = hits + misses;
    return total > 0 ? hits / total : 0;
  }

  getHealthStatus() {
    const criticalAlerts = this.alerts.filter(a =>
      a.severity === 'critical' &&
      Date.now() - new Date(a.timestamp).getTime() < 60000
    );

    const warningAlerts = this.alerts.filter(a =>
      a.severity === 'warning' &&
      Date.now() - new Date(a.timestamp).getTime() < 60000
    );

    let status = 'healthy';
    if (criticalAlerts.length > 0) {
      status = 'critical';
    } else if (warningAlerts.length > 0) {
      status = 'warning';
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      criticalAlerts: criticalAlerts.length,
      warningAlerts: warningAlerts.length,
      services: {
        api: this.getServiceHealth('api'),
        database: this.getServiceHealth('database'),
        cache: this.getServiceHealth('cache'),
        frontend: this.getServiceHealth('frontend')
      }
    };
  }

  getServiceHealth(service) {
    const serviceMetrics = Array.from(this.metrics.values())
      .filter(m => m.name.startsWith(service));

    if (serviceMetrics.length === 0) {
      return { status: 'unknown', message: 'No metrics available' };
    }

    // Check if any metrics exceed thresholds
    let hasWarning = false;
    let hasCritical = false;

    for (const metric of serviceMetrics) {
      const metricName = metric.name.split('.').slice(1).join('.');
      if (this.thresholds[service] && this.thresholds[service][metricName]) {
        const threshold = this.thresholds[service][metricName];
        if (metric.current > threshold.critical) {
          hasCritical = true;
        } else if (metric.current > threshold.warning) {
          hasWarning = true;
        }
      }
    }

    if (hasCritical) {
      return { status: 'critical', message: 'Service experiencing critical issues' };
    } else if (hasWarning) {
      return { status: 'warning', message: 'Service experiencing degraded performance' };
    } else {
      return { status: 'healthy', message: 'Service operating normally' };
    }
  }

  startCollectors() {
    // Collect system metrics every 10 seconds
    setInterval(() => {
      this.collectSystemMetrics();
    }, 10000);

    // Cleanup old metrics every minute
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 60000);
  }

  collectSystemMetrics() {
    // This would normally interface with system monitoring tools
    // For demo purposes, we'll simulate some metrics
    const cpuUsage = 30 + Math.random() * 40;
    const memoryUsage = 50 + Math.random() * 30;

    this.recordMetric('gauge', 'system.cpu', cpuUsage);
    this.recordMetric('gauge', 'system.memory', memoryUsage);
  }

  cleanupOldMetrics() {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    for (const [key, metric] of this.metrics) {
      metric.values = metric.values.filter(v => v.timestamp > oneHourAgo);

      // Remove metric if no recent values
      if (metric.values.length === 0) {
        this.metrics.delete(key);
      }
    }

    // Clean old alerts
    this.alerts = this.alerts.filter(a =>
      Date.now() - new Date(a.timestamp).getTime() < 24 * 60 * 60 * 1000
    );
  }
}

// Export for use in applications
module.exports = PerformanceMonitor;

// Start standalone if run directly
if (require.main === module) {
  const monitor = new PerformanceMonitor({
    port: process.env.MONITOR_PORT || 3001,
    statsdHost: process.env.STATSD_HOST || 'localhost',
    statsdPort: process.env.STATSD_PORT || 8125
  });
}

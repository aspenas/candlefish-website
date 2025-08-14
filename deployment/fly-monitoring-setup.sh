#!/bin/bash

# Fly.io Monitoring and Dashboard Setup Script
# Sets up comprehensive monitoring for production deployment

set -e

echo "🚀 Candlefish AI - Fly.io Monitoring Setup"
echo "=========================================="

# Configuration
APP_NAME="${FLY_APP_NAME:-candlefish-temporal}"
REGION="${FLY_REGION:-iad}"
GRAFANA_APP="${APP_NAME}-grafana"
PROMETHEUS_APP="${APP_NAME}-prometheus"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Fly CLI is installed
check_fly_cli() {
    if ! command -v flyctl &> /dev/null; then
        log_error "Fly CLI not found. Please install it first: https://fly.io/docs/hands-on/install-flyctl/"
        exit 1
    fi
    log_info "Fly CLI found"
}

# Check authentication
check_auth() {
    if ! flyctl auth whoami &> /dev/null; then
        log_warn "Not authenticated with Fly.io. Running authentication..."
        flyctl auth login
    fi
    log_info "Authenticated with Fly.io"
}

# Create Prometheus configuration
create_prometheus_config() {
    cat > prometheus.yml <<EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    monitor: 'candlefish-monitor'

scrape_configs:
  - job_name: 'candlefish-temporal'
    static_configs:
      - targets: ['${APP_NAME}.internal:4000']
        labels:
          app: 'temporal-platform'
          environment: 'production'

  - job_name: 'candlefish-graphql'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['${APP_NAME}.internal:4000']
        labels:
          app: 'graphql-api'
          environment: 'production'

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['${APP_NAME}.internal:9100']
        labels:
          app: 'system-metrics'
          environment: 'production'

  - job_name: 'postgres-exporter'
    static_configs:
      - targets: ['${APP_NAME}-db.internal:9187']
        labels:
          app: 'database-metrics'
          environment: 'production'

alerting:
  alertmanagers:
    - static_configs:
        - targets: []

rule_files:
  - 'alerts.yml'
EOF

    cat > alerts.yml <<EOF
groups:
  - name: candlefish_alerts
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: High error rate detected
          description: "Error rate is {{ \$value }} errors per second"

      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: High API latency detected
          description: "95th percentile latency is {{ \$value }} seconds"

      - alert: DatabaseConnectionFailure
        expr: up{job="postgres-exporter"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: Database connection lost
          description: "Cannot connect to PostgreSQL database"

      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: High memory usage detected
          description: "Memory usage is above 90%"

      - alert: DiskSpaceLow
        expr: node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"} < 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: Low disk space
          description: "Less than 10% disk space remaining"

      - alert: TemporalWorkerDown
        expr: temporal_worker_task_slots_available == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: Temporal worker unavailable
          description: "No available task slots for Temporal worker"
EOF

    log_info "Prometheus configuration created"
}

# Create Grafana configuration
create_grafana_config() {
    cat > grafana.ini <<EOF
[server]
protocol = http
http_port = 3000
domain = ${GRAFANA_APP}.fly.dev
root_url = https://%(domain)s/

[database]
type = sqlite3
path = /var/lib/grafana/grafana.db

[security]
admin_user = admin
admin_password = ${GRAFANA_ADMIN_PASSWORD:-changeme}
secret_key = ${GRAFANA_SECRET_KEY:-$(openssl rand -hex 32)}

[users]
allow_sign_up = false
allow_org_create = false

[auth]
disable_login_form = false

[auth.anonymous]
enabled = true
org_role = Viewer

[analytics]
reporting_enabled = false
check_for_updates = false

[log]
mode = console
level = info

[alerting]
enabled = true
execute_alerts = true
EOF

    # Create datasource provisioning
    mkdir -p provisioning/datasources
    cat > provisioning/datasources/prometheus.yml <<EOF
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://${PROMETHEUS_APP}.internal:9090
    isDefault: true
    editable: false
EOF

    # Create dashboard provisioning
    mkdir -p provisioning/dashboards
    cat > provisioning/dashboards/default.yml <<EOF
apiVersion: 1

providers:
  - name: 'default'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    options:
      path: /etc/grafana/provisioning/dashboards
EOF

    # Create main dashboard
    cat > provisioning/dashboards/candlefish-overview.json <<EOF
{
  "dashboard": {
    "title": "Candlefish Platform Overview",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{ method }} {{ status }}"
          }
        ],
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 0 }
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])",
            "legendFormat": "5xx errors"
          }
        ],
        "gridPos": { "h": 8, "w": 12, "x": 12, "y": 0 }
      },
      {
        "title": "Response Time (p95)",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "p95 latency"
          }
        ],
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 8 }
      },
      {
        "title": "Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100",
            "legendFormat": "Memory %"
          }
        ],
        "gridPos": { "h": 8, "w": 12, "x": 12, "y": 8 }
      },
      {
        "title": "Temporal Workflow Executions",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(temporal_workflow_completed_total[5m])",
            "legendFormat": "Completed"
          },
          {
            "expr": "rate(temporal_workflow_failed_total[5m])",
            "legendFormat": "Failed"
          }
        ],
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 16 }
      },
      {
        "title": "Database Connections",
        "type": "graph",
        "targets": [
          {
            "expr": "pg_stat_database_numbackends",
            "legendFormat": "Active connections"
          }
        ],
        "gridPos": { "h": 8, "w": 12, "x": 12, "y": 16 }
      }
    ],
    "refresh": "5s",
    "time": { "from": "now-1h", "to": "now" }
  }
}
EOF

    log_info "Grafana configuration created"
}

# Deploy Prometheus
deploy_prometheus() {
    log_info "Deploying Prometheus..."

    cat > prometheus.Dockerfile <<EOF
FROM prom/prometheus:latest
COPY prometheus.yml /etc/prometheus/prometheus.yml
COPY alerts.yml /etc/prometheus/alerts.yml
EXPOSE 9090
EOF

    cat > fly.prometheus.toml <<EOF
app = "${PROMETHEUS_APP}"
primary_region = "${REGION}"

[build]
  dockerfile = "prometheus.Dockerfile"

[env]
  PROMETHEUS_RETENTION_TIME = "15d"
  PROMETHEUS_RETENTION_SIZE = "10GB"

[[services]]
  internal_port = 9090
  protocol = "tcp"

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

  [[services.ports]]
    port = 80
    handlers = ["http"]

[mounts]
  source = "prometheus_data"
  destination = "/prometheus"
  initial_size = "10gb"
EOF

    flyctl apps create ${PROMETHEUS_APP} --org personal || log_warn "App ${PROMETHEUS_APP} already exists"
    flyctl volumes create prometheus_data --app ${PROMETHEUS_APP} --size 10 --region ${REGION} || log_warn "Volume already exists"
    flyctl deploy --app ${PROMETHEUS_APP} --config fly.prometheus.toml

    log_info "Prometheus deployed"
}

# Deploy Grafana
deploy_grafana() {
    log_info "Deploying Grafana..."

    cat > grafana.Dockerfile <<EOF
FROM grafana/grafana:latest
COPY grafana.ini /etc/grafana/grafana.ini
COPY provisioning /etc/grafana/provisioning
EXPOSE 3000
EOF

    cat > fly.grafana.toml <<EOF
app = "${GRAFANA_APP}"
primary_region = "${REGION}"

[build]
  dockerfile = "grafana.Dockerfile"

[env]
  GF_INSTALL_PLUGINS = "grafana-clock-panel,grafana-simple-json-datasource"

[[services]]
  internal_port = 3000
  protocol = "tcp"

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

  [[services.ports]]
    port = 80
    handlers = ["http"]

[mounts]
  source = "grafana_data"
  destination = "/var/lib/grafana"
  initial_size = "1gb"
EOF

    flyctl apps create ${GRAFANA_APP} --org personal || log_warn "App ${GRAFANA_APP} already exists"
    flyctl volumes create grafana_data --app ${GRAFANA_APP} --size 1 --region ${REGION} || log_warn "Volume already exists"
    flyctl deploy --app ${GRAFANA_APP} --config fly.grafana.toml

    log_info "Grafana deployed"
}

# Setup application metrics endpoint
setup_app_metrics() {
    log_info "Setting up application metrics..."

    cat > metrics-setup.ts <<EOF
import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';
import { Express } from 'express';

// Collect default Node.js metrics
collectDefaultMetrics({ prefix: 'candlefish_' });

// Custom metrics
export const httpRequestsTotal = new Counter({
  name: 'candlefish_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status']
});

export const httpRequestDuration = new Histogram({
  name: 'candlefish_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

export const activeConnections = new Gauge({
  name: 'candlefish_active_connections',
  help: 'Number of active connections'
});

export const temporalWorkflowsActive = new Gauge({
  name: 'candlefish_temporal_workflows_active',
  help: 'Number of active Temporal workflows'
});

export function setupMetrics(app: Express) {
  // Metrics endpoint
  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });

  // Middleware to track requests
  app.use((req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      httpRequestsTotal.inc({
        method: req.method,
        route: req.route?.path || req.path,
        status: res.statusCode
      });
      httpRequestDuration.observe({
        method: req.method,
        route: req.route?.path || req.path,
        status: res.statusCode
      }, duration);
    });

    next();
  });
}
EOF

    log_info "Metrics setup code created"
}

# Setup alerts webhook
setup_alert_webhook() {
    log_info "Setting up alert webhook..."

    cat > alertmanager.yml <<EOF
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'webhook'

receivers:
  - name: 'webhook'
    webhook_configs:
      - url: 'https://${APP_NAME}.fly.dev/api/alerts'
        send_resolved: true
        http_config:
          bearer_token: '${ALERT_WEBHOOK_TOKEN:-$(openssl rand -hex 32)}'
EOF

    log_info "Alert webhook configuration created"
}

# Create monitoring documentation
create_monitoring_docs() {
    cat > MONITORING.md <<EOF
# Candlefish AI - Production Monitoring

## Overview
This document describes the monitoring setup for Candlefish AI on Fly.io.

## Components

### Prometheus
- URL: https://${PROMETHEUS_APP}.fly.dev
- Collects metrics from all services
- Stores time-series data for 15 days
- Evaluates alert rules

### Grafana
- URL: https://${GRAFANA_APP}.fly.dev
- Default credentials: admin / ${GRAFANA_ADMIN_PASSWORD:-changeme}
- Pre-configured dashboards for all services
- Real-time visualization of metrics

## Metrics Collected

### Application Metrics
- Request rate and latency
- Error rates (4xx, 5xx)
- Active connections
- Response time percentiles

### Temporal Metrics
- Workflow execution rate
- Workflow success/failure rates
- Activity execution times
- Worker task slots

### System Metrics
- CPU usage
- Memory usage
- Disk I/O
- Network traffic

### Database Metrics
- Connection pool status
- Query performance
- Table sizes
- Replication lag

## Alerts

### Critical Alerts
- High error rate (>5% 5xx errors)
- Database connection failure
- Disk space <10%
- Temporal worker down

### Warning Alerts
- High latency (p95 >1s)
- Memory usage >90%
- High CPU usage >80%

## Accessing Dashboards

1. **Grafana Dashboard**: https://${GRAFANA_APP}.fly.dev
2. **Prometheus Metrics**: https://${PROMETHEUS_APP}.fly.dev
3. **Application Health**: https://${APP_NAME}.fly.dev/health

## Troubleshooting

### High Error Rate
1. Check application logs: \`flyctl logs --app ${APP_NAME}\`
2. Review error details in Grafana
3. Check database connectivity
4. Verify external service dependencies

### High Latency
1. Check database query performance
2. Review Temporal workflow execution times
3. Check network latency between regions
4. Review application profiling data

### Memory Issues
1. Check for memory leaks in application
2. Review database connection pool settings
3. Check Temporal worker memory usage
4. Consider scaling instances

## Maintenance

### Updating Dashboards
\`\`\`bash
cd deployment
# Edit provisioning/dashboards/*.json
flyctl deploy --app ${GRAFANA_APP}
\`\`\`

### Updating Alert Rules
\`\`\`bash
cd deployment
# Edit alerts.yml
flyctl deploy --app ${PROMETHEUS_APP}
\`\`\`

### Backup Metrics Data
\`\`\`bash
flyctl ssh console --app ${PROMETHEUS_APP}
tar -czf /tmp/prometheus-backup.tar.gz /prometheus
flyctl ssh sftp get /tmp/prometheus-backup.tar.gz --app ${PROMETHEUS_APP}
\`\`\`

## Support
For monitoring issues, check:
1. Fly.io status: https://status.fly.io
2. Application logs: \`flyctl logs --app [app-name]\`
3. Metrics endpoint: https://${APP_NAME}.fly.dev/metrics
EOF

    log_info "Monitoring documentation created"
}

# Main execution
main() {
    echo "Starting Fly.io monitoring setup..."

    # Check prerequisites
    check_fly_cli
    check_auth

    # Create configurations
    create_prometheus_config
    create_grafana_config
    setup_app_metrics
    setup_alert_webhook

    # Deploy monitoring stack
    deploy_prometheus
    deploy_grafana

    # Create documentation
    create_monitoring_docs

    echo ""
    log_info "Monitoring setup complete!"
    echo ""
    echo "📊 Access your dashboards:"
    echo "  Grafana: https://${GRAFANA_APP}.fly.dev"
    echo "  Prometheus: https://${PROMETHEUS_APP}.fly.dev"
    echo ""
    echo "📝 Default Grafana credentials:"
    echo "  Username: admin"
    echo "  Password: ${GRAFANA_ADMIN_PASSWORD:-changeme}"
    echo ""
    echo "📖 See MONITORING.md for detailed documentation"
}

# Run main function
main "$@"

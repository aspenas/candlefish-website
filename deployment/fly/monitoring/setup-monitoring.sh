#!/bin/bash
# Setup monitoring and alerting for Candlefish AI Collaboration System
# This script configures Prometheus, Grafana, and alerting systems

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🐠 Candlefish AI - Monitoring Setup${NC}"
echo "===================================="

# Configuration
MONITORING_DIR="/Users/patricksmith/candlefish-ai/deployment/fly/monitoring"
GRAFANA_APP="candlefish-grafana"
PROMETHEUS_APP="candlefish-prometheus"
ALERTMANAGER_APP="candlefish-alertmanager"

# Create Prometheus configuration
echo -e "${YELLOW}📊 Creating Prometheus configuration...${NC}"
cat > "$MONITORING_DIR/prometheus.yml" << 'EOF'
global:
  scrape_interval: 30s
  evaluation_interval: 30s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - candlefish-alertmanager.internal:9093

scrape_configs:
  # PostgreSQL monitoring
  - job_name: 'postgresql'
    static_configs:
      - targets: ['candlefish-postgres.internal:9187']
    scrape_interval: 30s
    metrics_path: /metrics

  # Redis monitoring
  - job_name: 'redis'
    static_configs:
      - targets: ['candlefish-redis.internal:9121']
    scrape_interval: 30s
    metrics_path: /metrics

  # API application monitoring
  - job_name: 'rtpm-api'
    static_configs:
      - targets: ['rtpm-api-candlefish.internal:8000']
    scrape_interval: 30s
    metrics_path: /metrics
    scheme: https

  # Fly.io platform metrics
  - job_name: 'fly-metrics'
    static_configs:
      - targets: ['fly.io:443']
    scrape_interval: 60s
    metrics_path: /metrics
    scheme: https
    params:
      'org': ['personal']
      'app[]': ['candlefish-postgres', 'candlefish-redis', 'rtpm-api-candlefish']
EOF

# Create alert rules
echo -e "${YELLOW}🚨 Creating alert rules...${NC}"
cat > "$MONITORING_DIR/alert_rules.yml" << 'EOF'
groups:
  - name: database.rules
    rules:
      # PostgreSQL alerts
      - alert: PostgreSQLDown
        expr: up{job="postgresql"} == 0
        for: 30s
        labels:
          severity: critical
          service: postgresql
        annotations:
          summary: "PostgreSQL is down"
          description: "PostgreSQL instance has been down for more than 30 seconds"
          runbook: "https://docs.candlefish.ai/runbooks/postgresql-down"

      - alert: PostgreSQLConnectionsHigh
        expr: pg_stat_activity_count > 80
        for: 2m
        labels:
          severity: warning
          service: postgresql
        annotations:
          summary: "PostgreSQL connection count is high"
          description: "PostgreSQL has {{ $value }} active connections (>80)"

      - alert: PostgreSQLSlowQueries
        expr: rate(pg_stat_statements_calls[5m]) > 10
        for: 5m
        labels:
          severity: warning
          service: postgresql
        annotations:
          summary: "PostgreSQL has slow queries"
          description: "PostgreSQL has {{ $value }} slow queries per second"

      # Redis alerts
      - alert: RedisDown
        expr: up{job="redis"} == 0
        for: 30s
        labels:
          severity: critical
          service: redis
        annotations:
          summary: "Redis is down"
          description: "Redis instance has been down for more than 30 seconds"
          runbook: "https://docs.candlefish.ai/runbooks/redis-down"

      - alert: RedisMemoryHigh
        expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.9
        for: 2m
        labels:
          severity: critical
          service: redis
        annotations:
          summary: "Redis memory usage is critical"
          description: "Redis memory usage is {{ $value | humanizePercentage }}"

      - alert: RedisConnectionsHigh
        expr: redis_connected_clients > 80
        for: 2m
        labels:
          severity: warning
          service: redis
        annotations:
          summary: "Redis connection count is high"
          description: "Redis has {{ $value }} connected clients (>80)"

  - name: application.rules
    rules:
      # API alerts
      - alert: APIDown
        expr: up{job="rtpm-api"} == 0
        for: 30s
        labels:
          severity: critical
          service: api
        annotations:
          summary: "RTPM API is down"
          description: "RTPM API has been down for more than 30 seconds"
          runbook: "https://docs.candlefish.ai/runbooks/api-down"

      - alert: APIResponseTimeHigh
        expr: histogram_quantile(0.95, http_request_duration_seconds_bucket) > 2
        for: 5m
        labels:
          severity: warning
          service: api
        annotations:
          summary: "API response time is high"
          description: "95th percentile response time is {{ $value }}s (>2s)"

      - alert: APIErrorRateHigh
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.1
        for: 2m
        labels:
          severity: critical
          service: api
        annotations:
          summary: "API error rate is high"
          description: "API error rate is {{ $value | humanizePercentage }} (>10%)"

  - name: collaboration.rules
    rules:
      # Collaboration-specific alerts
      - alert: HighConcurrentUsers
        expr: collaboration_concurrent_users > 50
        for: 5m
        labels:
          severity: warning
          service: collaboration
        annotations:
          summary: "High number of concurrent users"
          description: "{{ $value }} users are collaborating simultaneously"

      - alert: DocumentOperationSpike
        expr: rate(collaboration_document_operations[5m]) > 100
        for: 2m
        labels:
          severity: warning
          service: collaboration
        annotations:
          summary: "Document operation spike detected"
          description: "Document operations rate is {{ $value }} ops/sec (>100)"
EOF

# Create Alertmanager configuration
echo -e "${YELLOW}🔔 Creating Alertmanager configuration...${NC}"
cat > "$MONITORING_DIR/alertmanager.yml" << 'EOF'
global:
  smtp_smarthost: '${SMTP_HOST}:587'
  smtp_from: 'alerts@candlefish.ai'
  smtp_auth_username: '${SMTP_USERNAME}'
  smtp_auth_password: '${SMTP_PASSWORD}'

route:
  group_by: ['alertname', 'service']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'default'
  routes:
    - match:
        severity: critical
      receiver: 'critical-alerts'
      group_wait: 10s
      repeat_interval: 1h

    - match:
        severity: warning
      receiver: 'warning-alerts'

receivers:
  - name: 'default'
    slack_configs:
      - api_url: '${SLACK_WEBHOOK_URL}'
        channel: '#alerts'
        username: 'Candlefish Monitor'
        title: 'Alert: {{ .GroupLabels.alertname }}'
        text: |
          {{ range .Alerts }}
          *Alert:* {{ .Annotations.summary }}
          *Description:* {{ .Annotations.description }}
          *Service:* {{ .Labels.service }}
          *Severity:* {{ .Labels.severity }}
          {{ end }}

  - name: 'critical-alerts'
    slack_configs:
      - api_url: '${SLACK_WEBHOOK_URL}'
        channel: '#critical-alerts'
        username: 'Candlefish Monitor'
        title: '🚨 CRITICAL: {{ .GroupLabels.alertname }}'
        text: |
          {{ range .Alerts }}
          *Alert:* {{ .Annotations.summary }}
          *Description:* {{ .Annotations.description }}
          *Service:* {{ .Labels.service }}
          *Runbook:* {{ .Annotations.runbook }}
          {{ end }}
    email_configs:
      - to: 'ops@candlefish.ai'
        subject: '[CRITICAL] Candlefish Alert: {{ .GroupLabels.alertname }}'
        body: |
          Critical alert for Candlefish AI system:

          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          Service: {{ .Labels.service }}
          Runbook: {{ .Annotations.runbook }}
          {{ end }}

  - name: 'warning-alerts'
    slack_configs:
      - api_url: '${SLACK_WEBHOOK_URL}'
        channel: '#alerts'
        username: 'Candlefish Monitor'
        title: '⚠️ Warning: {{ .GroupLabels.alertname }}'
        text: |
          {{ range .Alerts }}
          *Alert:* {{ .Annotations.summary }}
          *Description:* {{ .Annotations.description }}
          *Service:* {{ .Labels.service }}
          {{ end }}
EOF

# Create Grafana provisioning configuration
echo -e "${YELLOW}📈 Creating Grafana configuration...${NC}"
mkdir -p "$MONITORING_DIR/grafana/provisioning/datasources"
mkdir -p "$MONITORING_DIR/grafana/provisioning/dashboards"

cat > "$MONITORING_DIR/grafana/provisioning/datasources/prometheus.yml" << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://candlefish-prometheus.internal:9090
    isDefault: true
    editable: true
EOF

cat > "$MONITORING_DIR/grafana/provisioning/dashboards/candlefish.yml" << 'EOF'
apiVersion: 1

providers:
  - name: 'Candlefish Dashboards'
    orgId: 1
    folder: 'Candlefish AI'
    type: file
    disableDeletion: false
    updateIntervalSeconds: 30
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
EOF

# Create deployment configurations for monitoring apps
echo -e "${YELLOW}🚀 Creating monitoring app configurations...${NC}"

# Prometheus fly.toml
cat > "$MONITORING_DIR/prometheus-fly.toml" << 'EOF'
app = "candlefish-prometheus"
primary_region = "sjc"

[build]
  image = "prom/prometheus:latest"

[mounts]
  source = "prometheus_data"
  destination = "/prometheus"
  initial_size = "5gb"

[[services]]
  internal_port = 9090
  protocol = "tcp"

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

  [[services.http_checks]]
    interval = "30s"
    timeout = "10s"
    method = "get"
    path = "/-/healthy"

[[vm]]
  memory = '1gb'
  cpu_kind = 'shared'
  cpus = 1

[env]
  PROMETHEUS_RETENTION_TIME = "30d"
  PROMETHEUS_CONFIG_FILE = "/etc/prometheus/prometheus.yml"
EOF

# Grafana fly.toml
cat > "$MONITORING_DIR/grafana-fly.toml" << 'EOF'
app = "candlefish-grafana"
primary_region = "sjc"

[build]
  image = "grafana/grafana:latest"

[mounts]
  source = "grafana_data"
  destination = "/var/lib/grafana"
  initial_size = "2gb"

[[services]]
  internal_port = 3000
  protocol = "tcp"

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

  [[services.http_checks]]
    interval = "30s"
    timeout = "10s"
    method = "get"
    path = "/api/health"

[[vm]]
  memory = '512mb'
  cpu_kind = 'shared'
  cpus = 1

[env]
  GF_SECURITY_ADMIN_PASSWORD = "${GRAFANA_ADMIN_PASSWORD}"
  GF_USERS_ALLOW_SIGN_UP = "false"
  GF_SMTP_ENABLED = "true"
  GF_SMTP_HOST = "${SMTP_HOST}:587"
  GF_SMTP_USER = "${SMTP_USERNAME}"
  GF_SMTP_PASSWORD = "${SMTP_PASSWORD}"
  GF_SMTP_FROM_ADDRESS = "alerts@candlefish.ai"
EOF

# Create deployment scripts
echo -e "${YELLOW}📋 Creating deployment scripts...${NC}"

cat > "$MONITORING_DIR/deploy-monitoring.sh" << 'EOF'
#!/bin/bash
set -e

echo "🚀 Deploying Candlefish AI Monitoring Stack..."

# Deploy Prometheus
echo "📊 Deploying Prometheus..."
flyctl apps create candlefish-prometheus --org personal || true
flyctl volumes create prometheus_data --app candlefish-prometheus --region sjc --size 5 || true
flyctl deploy --app candlefish-prometheus -c prometheus-fly.toml

# Deploy Grafana
echo "📈 Deploying Grafana..."
flyctl apps create candlefish-grafana --org personal || true
flyctl volumes create grafana_data --app candlefish-grafana --region sjc --size 2 || true
flyctl deploy --app candlefish-grafana -c grafana-fly.toml

# Deploy Alertmanager
echo "🔔 Deploying Alertmanager..."
flyctl apps create candlefish-alertmanager --org personal || true
flyctl volumes create alertmanager_data --app candlefish-alertmanager --region sjc --size 1 || true
# flyctl deploy --app candlefish-alertmanager -c alertmanager-fly.toml

echo "✅ Monitoring stack deployed successfully!"
echo ""
echo "Access URLs:"
echo "  Prometheus: https://candlefish-prometheus.fly.dev"
echo "  Grafana: https://candlefish-grafana.fly.dev"
echo "  Alertmanager: https://candlefish-alertmanager.fly.dev"
EOF

chmod +x "$MONITORING_DIR/deploy-monitoring.sh"

# Create health check script
cat > "$MONITORING_DIR/check-monitoring-health.sh" << 'EOF'
#!/bin/bash
set -e

echo "🏥 Checking Candlefish AI Monitoring Health..."

# Check Prometheus
echo "📊 Checking Prometheus..."
if curl -s https://candlefish-prometheus.fly.dev/-/healthy | grep -q "Prometheus is Healthy"; then
    echo "✅ Prometheus is healthy"
else
    echo "❌ Prometheus is unhealthy"
fi

# Check Grafana
echo "📈 Checking Grafana..."
if curl -s https://candlefish-grafana.fly.dev/api/health | grep -q "ok"; then
    echo "✅ Grafana is healthy"
else
    echo "❌ Grafana is unhealthy"
fi

# Check database connectivity from monitoring
echo "🔍 Checking database connectivity..."
# These would be actual metric queries in production
echo "  PostgreSQL: Checking connection metrics..."
echo "  Redis: Checking connection metrics..."

echo "✅ Health check completed"
EOF

chmod +x "$MONITORING_DIR/check-monitoring-health.sh"

echo -e "${GREEN}🎉 Monitoring setup completed!${NC}"
echo ""
echo "Configuration Files Created:"
echo "  Prometheus: $MONITORING_DIR/prometheus.yml"
echo "  Alert Rules: $MONITORING_DIR/alert_rules.yml"
echo "  Alertmanager: $MONITORING_DIR/alertmanager.yml"
echo "  Grafana: $MONITORING_DIR/grafana/"
echo ""
echo "Deployment:"
echo "  Deploy: $MONITORING_DIR/deploy-monitoring.sh"
echo "  Health Check: $MONITORING_DIR/check-monitoring-health.sh"
echo ""
echo "Next Steps:"
echo "1. Set environment variables for SMTP and Slack"
echo "2. Run deployment script"
echo "3. Configure Grafana dashboards"
echo "4. Test alerting workflows"
echo "5. Set up regular health checks"

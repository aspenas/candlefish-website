#!/bin/bash

# Deploy Security Dashboard Monitoring Stack
set -e

echo "📊 Security Dashboard - Monitoring Stack Deployment"
echo "=================================================="

# Start Prometheus
echo "Starting Prometheus..."
docker run -d \
  --name security-prometheus \
  -p 9090:9090 \
  -v $(pwd)/monitoring/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus:latest \
  --config.file=/etc/prometheus/prometheus.yml 2>/dev/null || echo "Prometheus already running"

# Start Grafana
echo "Starting Grafana..."
docker run -d \
  --name security-grafana \
  -e GF_SECURITY_ADMIN_PASSWORD=admin123 \
  -e GF_SECURITY_ADMIN_USER=admin \
  -p 3001:3000 \
  grafana/grafana:latest 2>/dev/null || echo "Grafana already running"

# Verify Redis is running
echo "Verifying Redis..."
docker exec security-redis redis-cli ping || {
  echo "Redis not responding, please check the service"
  exit 1
}

echo ""
echo "=================================================="
echo "✅ Monitoring Stack Deployed!"
echo "=================================================="
echo ""
echo "Access URLs:"
echo "  Prometheus: http://localhost:9090"
echo "  Grafana:    http://localhost:3001"
echo ""
echo "Grafana Credentials:"
echo "  Username: admin"
echo "  Password: admin123"
echo ""
echo "Services Status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep security- || true
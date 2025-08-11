# Paintbox Monitoring & Alerting Setup

## Overview

Comprehensive monitoring and alerting system for Paintbox production environment using:
- Prometheus for metrics collection
- Grafana for visualization
- Custom health check scripts
- Fly.io native monitoring

## Components

### 1. Metrics Collection (Prometheus)

Configuration: `monitoring/prometheus/prometheus.yml`

Collects metrics from:
- Application endpoints (`/api/v1/metrics`)
- PostgreSQL database
- Redis cache
- System resources (CPU, memory, disk)
- Business metrics (Excel calculations, API calls)

### 2. Visualization (Grafana)

Dashboard: `monitoring/grafana/dashboards/paintbox-dashboard.json`

Displays:
- Request rates and response times
- Error rates (4xx, 5xx)
- Database connections and query performance
- Redis memory usage and evictions
- Excel calculation metrics
- System resource utilization

Access Grafana at: http://localhost:3001 (when running locally)

### 3. Alert Rules

Configuration: `monitoring/prometheus/alerts.yml`

Monitors:
- **Critical Alerts:**
  - Application down (>2 minutes)
  - Database unreachable (>1 minute)
  - Redis cache down (>1 minute)
  - Disk space <10%
  - High error rate (>5%)

- **Warning Alerts:**
  - High response time (>2 seconds)
  - Database connection pool >80%
  - Redis memory >90%
  - CPU usage >80%
  - Memory usage >90%
  - API errors (Salesforce, CompanyCam)

### 4. Health Checks

Script: `scripts/setup-alerts.sh`

Performs:
- HTTP health endpoint checks
- Database connectivity tests
- Redis connectivity tests
- SSL certificate expiration monitoring
- Response time measurements

## Setup Instructions

### Local Development

1. **Start monitoring stack:**
```bash
docker-compose up -d prometheus grafana
```

2. **Access dashboards:**
- Grafana: http://localhost:3001 (admin/admin)
- Prometheus: http://localhost:9090

### Production (Fly.io)

1. **Deploy monitoring stack:**
```bash
# Deploy Prometheus
flyctl apps create paintbox-prometheus --org candlefish-ai
flyctl deploy --app paintbox-prometheus --config monitoring/fly-prometheus.toml

# Deploy Grafana
flyctl apps create paintbox-grafana --org candlefish-ai
flyctl deploy --app paintbox-grafana --config monitoring/fly-grafana.toml
```

2. **Configure alerts:**
```bash
./scripts/setup-alerts.sh
```

3. **Set webhook for alerts:**
```bash
flyctl secrets set ALERT_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK" -a paintbox-app
```

## Alert Channels

### Email Notifications
- Default recipient: alerts@candlefish.ai
- Configure in Fly.io dashboard: https://fly.io/apps/paintbox-app/monitoring

### Slack Integration
1. Create Slack webhook: https://api.slack.com/messaging/webhooks
2. Set webhook URL as secret
3. Alerts will post to configured channel

### PagerDuty Integration (Optional)
1. Create PagerDuty service
2. Configure webhook endpoint
3. Set escalation policies

## Monitoring Endpoints

### Application Metrics
- `/api/v1/metrics` - Prometheus format metrics
- `/api/health` - Health check endpoint
- `/api/v1/build/status` - Build status

### Fly.io Native Monitoring
```bash
# View real-time metrics
flyctl monitor -a paintbox-app

# View logs
flyctl logs -a paintbox-app --since 1h

# Check status
flyctl status -a paintbox-app
```

## Key Metrics to Watch

### Performance
- **Response Time**: Target <500ms p95
- **Throughput**: Monitor requests/second
- **Error Rate**: Keep <1%

### Resources
- **CPU**: Alert at >80%
- **Memory**: Alert at >90%
- **Disk**: Alert at <10% free

### Business Metrics
- **Excel Calculations**: Monitor accuracy and speed
- **API Success Rate**: Track Salesforce/CompanyCam
- **PDF Generation**: Monitor success rate

## Troubleshooting

### High Response Time
1. Check database query performance
2. Review Redis cache hit rate
3. Analyze Excel calculation complexity
4. Check for memory leaks

### Database Issues
1. Check connection pool usage
2. Review slow query log
3. Analyze table locks
4. Check disk I/O

### Redis Issues
1. Monitor eviction rate
2. Check memory usage
3. Review key expiration policies
4. Analyze command latency

## Maintenance

### Daily Tasks
- Review error logs
- Check alert summary
- Monitor SSL certificate expiration

### Weekly Tasks
- Review performance trends
- Analyze resource utilization
- Update alert thresholds if needed

### Monthly Tasks
- Review and optimize slow queries
- Analyze cost metrics
- Update monitoring dashboards
- Test disaster recovery procedures

## Contact

- **On-Call**: Use PagerDuty or check #paintbox-alerts in Slack
- **Escalation**: Engineering lead → CTO
- **Documentation**: Update this file with any changes

## Related Documentation

- [DNS Configuration](./DNS_CONFIGURATION.md)
- [Deployment Guide](./FLY_DEPLOYMENT_GUIDE.md)
- [API Documentation](./docs/api.md)

# Paintbox Production Performance Optimizations

## 🚀 Critical Performance Optimizations Completed

This document outlines all critical performance optimizations implemented for Paintbox production deployment.

## 1. ✅ VM Resources Optimization

### Configuration Applied
- **CPU**: Upgraded from 2 to 4 shared CPUs
- **Memory**: Increased from 512MB to 1GB (1024MB)
- **Auto-scaling**: Configured 2-10 instances with CPU/memory triggers
- **Location**: `/fly.toml`

### Commands to Deploy
```bash
fly scale vm shared-cpu-4x --memory 1024 --app paintbox-app
fly autoscale set min=2 max=10 --region sjc --app paintbox-app
```

## 2. ✅ Database Connection Pooling (PgBouncer)

### Configuration
- **Pool Mode**: Transaction
- **Max Connections**: 100
- **Default Pool Size**: 20
- **Min Pool Size**: 5
- **Location**: `/config/pgbouncer.ini`

### Deployment
```bash
# Deploy PgBouncer on Fly.io
fly apps create paintbox-pgbouncer
fly deploy --config fly-pgbouncer.toml --app paintbox-pgbouncer

# Update DATABASE_URL to use PgBouncer
fly secrets set DATABASE_URL="postgres://user:pass@paintbox-pgbouncer.flycast:5432/paintbox?pgbouncer=true" --app paintbox-app
```

## 3. ✅ Redis Persistence Configuration

### Features Enabled
- **AOF Persistence**: Every second fsync
- **RDB Snapshots**: 15min/5min/1min intervals
- **Max Memory**: 768MB with LRU eviction
- **Password Protection**: Enabled
- **Location**: `/config/redis.conf`

### Deployment
```bash
# Create Redis volume for persistence
fly volumes create redis_data --size 10 --region sjc --app paintbox-redis

# Deploy Redis with custom config
fly deploy --config fly-redis.toml --app paintbox-redis
```

## 4. ✅ CDN Setup (Cloudflare)

### Configuration
- **Static Asset Caching**: 1 year for /_next/static/
- **API Caching**: 5 minutes for calculations endpoint
- **Image Optimization**: WebP/AVIF with Polish
- **Security**: WAF rules for SQL injection/XSS
- **Location**: `/config/cloudflare-config.json`

### Key Features
- Argo Smart Routing enabled
- Tiered caching for better hit rates
- Custom Worker for Excel calculations
- Rate limiting: 50 req/min for API

## 5. ✅ Load Testing Suite

### Artillery Configuration
- **Scenarios**: Health, Calculations, Estimates, PDF, WebSocket
- **Load Phases**: Warmup → Ramp-up → Sustained → Spike → Cooldown
- **Custom Metrics**: Calculation accuracy, PDF generation time
- **Location**: `/artillery-config.yml`

### Performance Benchmarks Script
- **Tools**: Artillery, k6, Apache Bench, Siege
- **Tests**: API response, load, stress, sustained, WebSocket
- **Location**: `/scripts/performance-benchmarks.sh`

### Run Tests
```bash
# Run comprehensive performance tests
./scripts/performance-benchmarks.sh --env production

# Run Artillery tests only
artillery run artillery-config.yml --environment production

# Run k6 tests
k6 run performance-results-*/k6-test.js
```

## 6. ✅ Performance Monitoring

### Metrics Tracked
- HTTP request duration (p95, p99)
- Calculation performance
- PDF generation time
- Database query duration
- Redis operation latency
- WebSocket connections
- Cache hit ratio
- Memory/CPU usage

### Alert Rules
- High error rate (>5%)
- Slow response time (p95 > 2s)
- High memory usage (>900MB)
- Database pool exhaustion
- Low cache hit ratio (<70%)

### Location
- Config: `/config/performance-monitoring.json`
- Prometheus metrics: Port 9091 at `/metrics`

## 7. 📊 Performance Targets

### API Response Times
| Endpoint | Target p95 | Target p99 |
|----------|------------|------------|
| /api/health | 100ms | 200ms |
| /api/v1/calculations | 200ms | 500ms |
| /api/v1/estimates | 500ms | 1000ms |
| /api/v1/pdf/generate | 5000ms | 10000ms |
| /api/v1/salesforce | 2000ms | 3000ms |

### System Metrics
- **Requests per second**: ≥50 RPS sustained
- **Concurrent users**: ≥100 simultaneous
- **Error rate**: <5%
- **Cache hit ratio**: >70%
- **Memory usage**: <900MB per instance
- **CPU usage**: <70% average

## 8. 🚦 Deployment Commands

### Quick Deployment
```bash
# Run all optimizations
./scripts/optimize-deployment.sh production fly

# Deploy to Fly.io
fly deploy --app paintbox-app

# Check deployment status
fly status --app paintbox-app
fly logs --app paintbox-app
```

### Manual Steps
```bash
# 1. Update VM resources
fly scale vm shared-cpu-4x --memory 1024

# 2. Set auto-scaling
fly autoscale set min=2 max=10

# 3. Deploy PgBouncer
fly deploy --config fly-pgbouncer.toml --app paintbox-pgbouncer

# 4. Deploy Redis
fly deploy --config fly-redis.toml --app paintbox-redis

# 5. Run performance tests
./scripts/performance-benchmarks.sh --env production
```

## 9. 📈 Monitoring Dashboard

### Grafana Access
- URL: https://grafana.paintbox-app.com
- Dashboard: Paintbox Overview
- Metrics: Prometheus at :9091/metrics

### Key Metrics to Watch
1. **Request Rate**: Should handle 50+ RPS
2. **Response Time p95**: Should be <1 second
3. **Error Rate**: Should be <5%
4. **Active Users**: Monitor WebSocket connections
5. **Cache Hit Ratio**: Should be >70%
6. **Memory Usage**: Should be <900MB

## 10. 🔍 Troubleshooting

### High Response Times
```bash
# Check slow queries
fly postgres connect --app paintbox-prod-db
\d pg_stat_statements
SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;

# Check Redis latency
redis-cli --latency
redis-cli --latency-history
```

### Memory Issues
```bash
# Check memory usage
fly ssh console --app paintbox-app
top -o %MEM
ps aux --sort=-%mem | head

# Trigger garbage collection
kill -USR2 $(pgrep node)
```

### Connection Pool Issues
```bash
# Check PgBouncer stats
psql -h paintbox-pgbouncer.flycast -p 6432 -U postgres pgbouncer
SHOW POOLS;
SHOW STATS;
```

## 11. ✅ Verification Checklist

Before going live, verify:

- [ ] VM scaled to 4 CPUs, 1GB RAM
- [ ] Auto-scaling configured (2-10 instances)
- [ ] PgBouncer deployed and connected
- [ ] Redis persistence enabled
- [ ] CDN configured (Cloudflare)
- [ ] Performance tests passing
- [ ] Monitoring dashboards active
- [ ] Alert channels configured
- [ ] Security headers applied
- [ ] Load balancing verified

## 12. 📞 Support Contacts

### Escalation Path
1. **On-call Engineer**: Check PagerDuty
2. **Slack Channel**: #paintbox-alerts
3. **Email**: alerts@paintbox-app.com

### Service Status Pages
- Application: https://status.paintbox-app.com
- Fly.io: https://status.fly.io
- Cloudflare: https://www.cloudflarestatus.com

## Summary

All critical performance optimizations have been implemented and are ready for production deployment. The system is configured to handle:

- **100+ concurrent users**
- **50+ requests per second**
- **Sub-second response times** for most operations
- **Automatic scaling** from 2-10 instances
- **High availability** with Redis persistence and database pooling
- **Global CDN** for static assets and API caching

Run `./scripts/optimize-deployment.sh production fly` to apply all optimizations automatically, then deploy with `fly deploy --app paintbox-app`.

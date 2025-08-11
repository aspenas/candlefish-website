# Paintbox Operations Runbook
## Production Operations Guide

### Table of Contents
1. [Quick Reference](#quick-reference)
2. [System Architecture](#system-architecture)
3. [Deployment Procedures](#deployment-procedures)
4. [Monitoring & Alerts](#monitoring--alerts)
5. [Incident Response](#incident-response)
6. [Disaster Recovery](#disaster-recovery)
7. [Performance Tuning](#performance-tuning)
8. [Security Operations](#security-operations)
9. [Troubleshooting Guide](#troubleshooting-guide)

---

## Quick Reference

### Critical Commands
```bash
# Check system health
make health-check

# View logs
make fly-logs

# Deploy to production
make fly-deploy

# Rollback deployment
make rollback

# Database backup
make db-backup

# Scale instances
make fly-scale COUNT=3
```

### Key URLs
- **Production App**: https://paintbox-app.fly.dev
- **Health Check**: https://paintbox-app.fly.dev/api/health
- **Metrics**: https://paintbox-app.fly.dev/metrics
- **Fly.io Dashboard**: https://fly.io/apps/paintbox-app
- **AWS Console**: https://console.aws.amazon.com/secretsmanager

### Support Contacts
- **On-Call Engineer**: Check PagerDuty rotation
- **DevOps Lead**: devops@candlefish.ai
- **Security Team**: security@candlefish.ai
- **AWS Support**: 1-800-xxx-xxxx (Premium Support)
- **Fly.io Support**: support@fly.io

---

## System Architecture

### Components
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Cloudflare │────▶│   Fly.io    │────▶│ PostgreSQL  │
│     CDN     │     │   App (x3)  │     │   Primary   │
└─────────────┘     └─────────────┘     └─────────────┘
                            │                    │
                            │            ┌───────▼───────┐
                            │            │  PostgreSQL   │
                            │            │   Replica     │
                            │            └───────────────┘
                            │
                    ┌───────▼───────┐   ┌─────────────┐
                    │     Redis      │   │     AWS     │
                    │   (Primary)    │   │   Secrets   │
                    └───────────────┘   └─────────────┘
```

### Regions
- **Primary**: sjc (San Jose)
- **Secondary**: ord (Chicago)
- **Database**: Multi-AZ in sjc, replica in ord

### Resource Allocation
- **App Instances**: 2-10 (auto-scaling)
- **CPU**: 4 cores per instance
- **Memory**: 1GB per instance
- **Database**: 4GB RAM, 100GB storage
- **Redis**: 2GB RAM

---

## Deployment Procedures

### Standard Deployment

#### Pre-Deployment Checklist
- [ ] All tests passing in CI
- [ ] Security scan completed
- [ ] Database migrations reviewed
- [ ] Rollback plan documented
- [ ] Stakeholders notified

#### Deployment Steps
1. **Create deployment branch**
   ```bash
   git checkout -b deploy/$(date +%Y%m%d-%H%M%S)
   git merge main
   ```

2. **Run pre-deployment tests**
   ```bash
   make ci-test
   ```

3. **Deploy to staging (optional)**
   ```bash
   make fly-deploy-staging
   # Test staging environment
   curl https://paintbox-staging.fly.dev/api/health
   ```

4. **Deploy to production**
   ```bash
   make fly-deploy
   ```

5. **Verify deployment**
   ```bash
   make health-check
   make fly-status
   ```

6. **Monitor for 15 minutes**
   ```bash
   make monitor
   make fly-logs
   ```

### Emergency Deployment
For critical hotfixes:

```bash
# Skip staging, deploy immediately
fly deploy -c fly.toml.secure --strategy immediate

# If issues arise, rollback immediately
make rollback
```

### Rollback Procedure

#### Automatic Rollback
Fly.io will automatically rollback if:
- Health checks fail for 3 consecutive attempts
- Deployment doesn't become healthy within 10 minutes

#### Manual Rollback
```bash
# Method 1: Using Make
make rollback

# Method 2: Using Fly CLI
fly releases list
fly deploy --image <previous-image-id>

# Method 3: Scale to zero and redeploy
fly scale count 0
fly deploy --image <known-good-image>
```

---

## Monitoring & Alerts

### Key Metrics

| Metric | Normal Range | Warning | Critical |
|--------|-------------|---------|----------|
| CPU Usage | < 60% | > 70% | > 85% |
| Memory Usage | < 70% | > 80% | > 90% |
| Response Time (p95) | < 200ms | > 500ms | > 1000ms |
| Error Rate | < 0.1% | > 1% | > 5% |
| Database Connections | < 15 | > 18 | > 20 |
| Redis Memory | < 70% | > 80% | > 90% |

### Alert Response

#### High CPU Alert
1. Check current load: `make metrics`
2. Identify heavy operations in logs
3. Scale if needed: `make fly-scale COUNT=5`
4. Investigate calculation bottlenecks

#### Database Connection Pool Exhausted
1. Check active connections: `make db-connect`
2. Look for connection leaks in logs
3. Restart if necessary: `make restart`
4. Review recent code changes

#### High Error Rate
1. Check error logs: `make logs-app | grep ERROR`
2. Identify error patterns
3. Check external service status (Salesforce, Company Cam)
4. Rollback if error spike after deployment

---

## Incident Response

### Severity Levels

| Level | Description | Response Time | Examples |
|-------|------------|--------------|----------|
| P1 | Complete outage | < 15 min | Site down, data loss |
| P2 | Major degradation | < 30 min | Login broken, calculations failing |
| P3 | Minor issues | < 2 hours | Slow performance, UI glitches |
| P4 | Non-critical | < 24 hours | Minor bugs, feature requests |

### Incident Response Process

#### 1. Detection & Alert
- Automated monitoring triggers alert
- Customer report via support
- Team member observation

#### 2. Initial Response (First 15 minutes)
```bash
# Quick health assessment
make health-check
make fly-status
make fly-logs | tail -100

# Check recent deployments
fly releases list

# Check external dependencies
curl https://api.salesforce.com/services/data
curl https://api.companycam.com/v2/health
```

#### 3. Triage & Escalation
- P1: Page on-call immediately, notify CTO
- P2: Page on-call, notify team lead
- P3: Create ticket, notify during business hours
- P4: Add to backlog

#### 4. Mitigation
Quick fixes to restore service:
- Enable maintenance mode: `make maintenance-on`
- Scale up resources: `make fly-scale COUNT=10`
- Rollback deployment: `make rollback`
- Restart services: `make restart-hard`

#### 5. Resolution
- Identify root cause
- Implement permanent fix
- Test thoroughly
- Deploy fix
- Monitor closely

#### 6. Post-Incident
- Write incident report (within 24 hours)
- Conduct blameless post-mortem
- Update runbook with learnings
- Implement preventive measures

---

## Disaster Recovery

### Backup Strategy

#### Automated Backups
- **Database**: Daily at 2 AM UTC, 30-day retention
- **Secrets**: Weekly snapshot to S3
- **Application**: Docker images in registry

#### Manual Backup
```bash
# Full disaster recovery backup
make dr-backup-all

# Individual components
make db-backup
make secrets-list > backups/secrets-$(date +%Y%m%d).txt
```

### Recovery Procedures

#### Database Recovery

**Point-in-Time Recovery**
```bash
# List available backups
make db-list-backups

# Restore to specific backup
make db-restore BACKUP_ID=<backup-id>

# Restore to specific time
fly postgres backup restore --at "2024-01-15 14:30:00" --app paintbox-prod-db
```

**Complete Database Rebuild**
```bash
# Create new database
fly postgres create --name paintbox-prod-db-new --region sjc

# Restore from backup
fly postgres backup restore <backup-id> --app paintbox-prod-db-new

# Update application to use new database
fly secrets set DATABASE_URL=<new-connection-string>

# Verify and switch DNS
make health-check
```

#### Application Recovery

**Region Failure**
```bash
# Remove failed region
fly regions remove sjc

# Add new region
fly regions add sea

# Scale in new region
fly scale count 3 --region sea

# Update DNS if needed
```

**Complete Application Rebuild**
```bash
# Deploy fresh application
fly apps create paintbox-app-recovery
fly deploy -c fly.toml.secure --app paintbox-app-recovery

# Restore secrets
make fly-secrets-sync

# Restore database
make db-restore BACKUP_ID=latest

# Switch traffic (update DNS)
```

### RTO/RPO Targets
- **RTO (Recovery Time Objective)**: 30 minutes
- **RPO (Recovery Point Objective)**: 1 hour

---

## Performance Tuning

### Database Optimization

#### Query Performance
```sql
-- Find slow queries
SELECT query, calls, mean_exec_time, max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan;
```

#### Connection Pool Tuning
```javascript
// In database configuration
{
  pool: {
    min: 5,        // Minimum connections
    max: 20,       // Maximum connections
    idle: 10000,   // Idle timeout
    acquire: 30000 // Acquire timeout
  }
}
```

### Redis Optimization

#### Memory Management
```bash
# Check memory usage
fly ssh console -C "redis-cli INFO memory"

# Set eviction policy
fly ssh console -C "redis-cli CONFIG SET maxmemory-policy allkeys-lru"

# Clear cache if needed
fly ssh console -C "redis-cli FLUSHDB"
```

### Application Optimization

#### Bundle Size
```bash
# Analyze bundle
make analyze-bundle

# Key optimizations:
# - Dynamic imports for large components
# - Tree shaking unused code
# - Optimize images with next/image
# - Enable compression
```

#### Caching Strategy
- Static assets: 1 year cache
- API responses: 5 minutes
- Calculations: 1 hour
- User sessions: 24 hours

---

## Security Operations

### Security Checklist

#### Daily
- [ ] Review security alerts
- [ ] Check failed login attempts
- [ ] Monitor API rate limits
- [ ] Review AWS CloudTrail logs

#### Weekly
- [ ] Security scan with npm audit
- [ ] Review access logs
- [ ] Check for unusual patterns
- [ ] Update dependencies if needed

#### Monthly
- [ ] Rotate API keys
- [ ] Review IAM permissions
- [ ] Conduct security audit
- [ ] Update security documentation

### Secret Rotation

#### Automatic Rotation
Configured for:
- Database passwords (30 days)
- Redis passwords (30 days)
- JWT secrets (90 days)

#### Manual Rotation
```bash
# Rotate specific secret
make secrets-rotate

# Update in Fly.io
fly secrets set <SECRET_NAME>=<new_value>

# Restart to apply
make restart
```

### Security Incident Response

1. **Immediate Actions**
   ```bash
   # Revoke compromised credentials
   make secrets-rotate
   
   # Enable enhanced logging
   fly secrets set DEBUG_MODE=true
   
   # Review access logs
   make logs-app | grep -E "auth|login|access"
   ```

2. **Investigation**
   - Review CloudTrail logs
   - Check for data exfiltration
   - Identify attack vector
   - Document timeline

3. **Remediation**
   - Patch vulnerabilities
   - Update security rules
   - Enhance monitoring
   - Notify affected users

---

## Troubleshooting Guide

### Common Issues

#### Application Won't Start
```bash
# Check logs for errors
make fly-logs | grep ERROR

# Common causes:
# - Missing environment variables
# - Database connection issues
# - Port binding conflicts

# Solutions:
fly secrets list  # Verify all secrets are set
make fly-ssh      # SSH in and debug
make restart-hard # Force restart
```

#### Database Connection Errors
```bash
# Test database connectivity
fly postgres connect --app paintbox-prod-db

# Common causes:
# - Connection pool exhausted
# - Network issues
# - Wrong credentials

# Solutions:
make db-connect              # Direct connection
fly secrets set DATABASE_URL=... # Update connection string
make restart                 # Restart to reset pools
```

#### High Memory Usage
```bash
# Check memory consumption
make metrics | grep memory

# Common causes:
# - Memory leaks
# - Large calculation sets
# - Cache overflow

# Solutions:
fly scale memory 2048  # Increase memory
make restart          # Clear memory
fly ssh console       # Investigate with top/htop
```

#### Slow Performance
```bash
# Check response times
make metrics | grep response_time

# Common causes:
# - Database queries
# - External API delays
# - Calculation bottlenecks

# Solutions:
make perf-test       # Run performance tests
make db-connect      # Check query performance
fly scale count 5    # Scale horizontally
```

#### WebSocket Disconnections
```bash
# Check WebSocket health
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" https://paintbox-app.fly.dev/ws

# Common causes:
# - Network timeouts
# - Memory pressure
# - Client issues

# Solutions:
fly secrets set WS_HEARTBEAT_INTERVAL=15000  # Shorter heartbeat
make restart                                  # Reset connections
```

### Debug Mode

Enable debug mode for detailed logging:
```bash
# Enable debug mode
fly secrets set DEBUG_MODE=true
fly secrets set DEBUG_SQL_QUERIES=true
fly secrets set DEBUG_REDIS_OPERATIONS=true

# View debug logs
make fly-logs | grep DEBUG

# Disable when done
fly secrets unset DEBUG_MODE
fly secrets unset DEBUG_SQL_QUERIES
fly secrets unset DEBUG_REDIS_OPERATIONS
```

### Performance Profiling

```bash
# Enable profiling
fly secrets set ENABLE_PROFILING=true

# Collect profile data
curl https://paintbox-app.fly.dev/debug/profile > profile.json

# Analyze with tools
npx clinic flame profile.json
```

---

## Appendix

### Environment Variables Reference

| Variable | Description | Required | Example |
|----------|------------|----------|---------|
| NODE_ENV | Environment | Yes | production |
| DATABASE_URL | PostgreSQL connection | Yes | postgresql://... |
| REDIS_URL | Redis connection | Yes | redis://... |
| JWT_SECRET | JWT signing key | Yes | 32+ char string |
| AWS_REGION | AWS region | Yes | us-west-2 |
| AWS_ACCESS_KEY_ID | AWS access key | Yes | AKIA... |
| AWS_SECRET_ACCESS_KEY | AWS secret | Yes | ... |

### Useful SQL Queries

```sql
-- Active connections
SELECT pid, usename, application_name, state
FROM pg_stat_activity
WHERE state != 'idle';

-- Table sizes
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Lock monitoring
SELECT blocked_locks.pid AS blocked_pid,
       blocking_locks.pid AS blocking_pid,
       blocked_activity.usename AS blocked_user,
       blocking_activity.usename AS blocking_user
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

### Monitoring URLs

- **Fly.io Metrics**: https://fly.io/apps/paintbox-app/metrics
- **Grafana Dashboard**: https://fly-metrics.net/d/paintbox
- **Status Page**: https://status.paintbox.app

---

**Document Version**: 1.0
**Last Updated**: 2025-08-09
**Next Review**: 2025-09-09

For updates to this runbook, submit a PR to the repository.

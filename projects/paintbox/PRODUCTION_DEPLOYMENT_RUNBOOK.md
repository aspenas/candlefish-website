# Production Deployment Runbook - Paintbox

## Overview

This runbook covers the optimized production deployment configuration for the Paintbox Next.js application on Fly.io, including zero-downtime deployments, monitoring, and rollback procedures.

## Architecture

- **Platform**: Fly.io
- **Application**: Next.js 15.4.5 with standalone output
- **Deployment Strategy**: Rolling deployment with health checks
- **Machines**: 2-6 shared-cpu instances with auto-scaling
- **Health Monitoring**: Multi-tier health checks and metrics

## Pre-Deployment Checklist

### 1. Prerequisites
- [ ] Fly.io CLI installed and authenticated
- [ ] AWS Secrets Manager access configured
- [ ] Environment variables set correctly
- [ ] All tests passing locally

### 2. Build Verification
```bash
# Run production build locally
NODE_OPTIONS='--max-old-space-size=2048' npm run build:deploy

# Verify standalone output
ls -la .next/standalone/
```

### 3. Security Check
```bash
# Run security audit
npm audit
npm run test:security
```

## Deployment Process

### Automated Deployment (Recommended)
```bash
# Use optimized deployment script
./scripts/deploy-production-optimized.sh
```

### Manual Deployment
```bash
# 1. Pre-deployment check
fly status

# 2. Deploy with production config
fly deploy --config fly.toml --dockerfile Dockerfile.production

# 3. Monitor deployment
./scripts/monitor-production.sh
```

## Configuration Details

### Machine Configuration
- **CPU**: 2 shared cores
- **Memory**: 2048MB
- **Auto-scaling**: 2-6 machines
- **Concurrency**: 150 soft limit, 200 hard limit

### Health Checks
1. **Simple Health** (`/api/simple-health`)
   - Interval: 15s
   - Timeout: 5s
   - Fast response for load balancer

2. **Deep Health** (`/api/health`)
   - Interval: 45s
   - Timeout: 10s
   - Comprehensive system checks

3. **TCP Health**
   - Interval: 30s
   - Timeout: 3s
   - Fallback connectivity check

### Environment Variables
```bash
NODE_ENV=production
PORT=8080
NODE_OPTIONS=--max-old-space-size=1536 --optimize-for-size
NEXT_TELEMETRY_DISABLED=1
GENERATE_SOURCEMAP=false
```

## Monitoring

### Health Endpoints
- **Simple Health**: https://paintbox.fly.dev/api/simple-health
- **Detailed Health**: https://paintbox.fly.dev/api/health
- **Metrics**: https://paintbox.fly.dev/api/metrics
- **JWKS**: https://paintbox.fly.dev/.well-known/jwks.json

### Key Metrics to Monitor
- Response time < 2 seconds
- Memory usage < 85%
- All machines running
- JWKS endpoint accessible
- Zero HTTP 5xx errors

### Monitoring Script
```bash
# Start continuous monitoring
./scripts/monitor-production.sh

# Check logs
fly logs --since=1h
```

## Troubleshooting

### Common Issues

#### 1. High Memory Usage
```bash
# Check memory metrics
curl https://paintbox.fly.dev/api/metrics | grep memory

# Scale up if needed
fly scale memory 4096
```

#### 2. Slow Response Times
```bash
# Check health details
curl https://paintbox.fly.dev/api/health | jq

# Analyze performance
fly logs --since=30m | grep -i "slow\|timeout"
```

#### 3. Failed Health Checks
```bash
# Check machine status
fly machine list

# Restart unhealthy machines
fly machine restart <machine-id>
```

#### 4. JWKS Endpoint Issues
```bash
# Verify JWKS accessibility
curl -I https://paintbox.fly.dev/.well-known/jwks.json

# Check Next.js rewrites
curl -I https://paintbox.fly.dev/api/.well-known/jwks.json
```

### Emergency Procedures

#### Immediate Rollback
```bash
# Automatic rollback
fly releases rollback

# Or use deployment script rollback
./scripts/deploy-production-optimized.sh --rollback
```

#### Scale Up During High Load
```bash
# Increase machine count
fly scale count 6

# Increase memory if needed
fly scale memory 4096
```

#### Emergency Shutdown
```bash
# Stop all machines
fly machine stop --all

# Resume service
fly machine start --all
```

## Performance Optimizations

### 1. Build Optimizations
- SWC minification enabled
- Tree shaking configured
- Code splitting by vendors
- Source maps disabled in production

### 2. Runtime Optimizations
- Memory heap limited to 1536MB
- Connection pooling configured
- Compression enabled
- ETags for caching

### 3. Docker Optimizations
- Multi-stage build
- Non-root user execution
- Security hardening
- Minimal production image

## Security Measures

### 1. Headers
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin

### 2. Container Security
- Non-root user (nextjs:nodejs)
- Minimal Alpine Linux base
- No unnecessary packages
- Regular security updates

### 3. Network Security
- HTTPS enforced
- JWKS endpoint secured
- API rate limiting
- CORS configured

## Backup and Recovery

### 1. Configuration Backup
All configuration files are version controlled:
- `fly.toml` - Fly.io configuration
- `Dockerfile.production` - Container configuration
- `next.config.js` - Application configuration

### 2. Data Backup
- Logs persisted to mounted volume (`/data`)
- AWS Secrets Manager for secrets
- Application state is stateless

### 3. Recovery Procedures
- Rollback to previous release
- Restore from configuration backup
- Rebuild from source if needed

## Alerting Setup

Configure alerts for:
- Application down (3+ consecutive failures)
- High response time (>5 seconds)
- High memory usage (>95%)
- No running machines
- JWKS endpoint failure

### Slack Integration Example
```bash
# Add webhook URL to monitoring script
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
```

## Maintenance Windows

### Scheduled Updates
- Security updates: Weekly
- Dependency updates: Monthly
- Configuration changes: As needed

### Update Procedure
1. Test changes in staging
2. Schedule maintenance window
3. Deploy with monitoring
4. Verify all systems
5. Update documentation

## Contact Information

- **Primary Oncall**: [Your contact]
- **Secondary Oncall**: [Backup contact]
- **Fly.io Support**: https://fly.io/docs/about/support/
- **AWS Support**: [Your AWS support plan]

## Useful Commands

```bash
# Quick status check
fly status && curl -s https://paintbox.fly.dev/api/simple-health

# Performance metrics
curl -s https://paintbox.fly.dev/api/metrics | grep -E "(memory|uptime|status)"

# Machine resource usage
fly machine list --json | jq '.[] | {id: .id, state: .state, region: .region}'

# Recent deployment history
fly releases --limit 10

# Application logs (last hour)
fly logs --since=1h

# Scale resources
fly scale count 4          # Number of machines
fly scale memory 2048      # Memory per machine

# Interactive debugging
fly ssh console

# Database connection (if applicable)
fly redis list
```

---

**Last Updated**: $(date)
**Version**: 1.0
**Next Review**: $(date -d "+1 month")

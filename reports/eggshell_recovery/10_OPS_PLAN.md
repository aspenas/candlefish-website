# Eggshell Production Deployment Plan
**Date**: 2025-08-22  
**Application**: Paintbox → Eggshell  
**Current Status**: Staging Ready  
**Target**: Zero-downtime production deployment

## 🎯 Deployment Objectives

1. **Safe rollout** with validation at each stage
2. **Zero downtime** for existing users
3. **Data integrity** preserved throughout
4. **Rollback capability** at any point
5. **Truthful telemetry** from moment one

## 📋 Pre-Deployment Checklist

### Critical Fixes Applied ✅
- [x] Database changed from `:memory:` to persistent file
- [x] Docker configurations consolidated (16 → 3)
- [x] JWKS endpoints unified (4 → 1)
- [x] Archive created for legacy code
- [x] Eggshell design system implemented

### Code Readiness
- [ ] All Golden Path E2E tests passing
- [ ] Excel formula engine precision fixed (10 → 15 digits)
- [ ] Salesforce integration tested with sandbox
- [ ] CompanyCam photo upload verified
- [ ] Offline queue functionality validated
- [ ] Telemetry widget showing real status
- [ ] WCAG AA accessibility compliance verified

### Infrastructure Readiness
- [ ] Fly.io volumes provisioned for database
- [ ] Redis cache configured
- [ ] Secrets verified in AWS Secrets Manager
- [ ] Monitoring dashboards prepared
- [ ] Backup strategy implemented

## 🚀 Deployment Stages

### Stage 1: Staging Deployment (Day 1)

```bash
# 1. Create staging configuration
cp fly.toml fly.staging.toml
sed -i 's/app = "paintbox"/app = "paintbox-staging"/' fly.staging.toml

# 2. Deploy to staging
fly deploy --config fly.staging.toml --strategy rolling

# 3. Run database migrations
fly ssh console -a paintbox-staging
./scripts/init-database.sh

# 4. Verify deployment
curl https://paintbox-staging.fly.dev/api/health
```

**Validation**:
- [ ] Application loads without errors
- [ ] Database persistence verified
- [ ] Telemetry widget shows "staging" environment
- [ ] All 8 Golden Paths functional
- [ ] Excel calculations accurate

### Stage 2: Canary Deployment (Day 2)

```bash
# 1. Deploy canary instance (10% traffic)
fly scale count 3 -a paintbox
fly deploy --strategy canary --canary-percentage 10

# 2. Monitor metrics for 2 hours
fly logs -a paintbox | grep ERROR
fly status -a paintbox

# 3. Check telemetry dashboard
# Verify no increase in error rates
```

**Success Criteria**:
- Error rate < 0.1%
- TTI < 2.5s maintained
- No database connection issues
- Memory usage stable

### Stage 3: Blue-Green Production (Day 3)

```bash
# 1. Deploy new version alongside old
fly deploy --strategy bluegreen --config fly.production.toml

# 2. Run smoke tests
npm run test:e2e:production

# 3. Switch traffic to new version
fly deploy --strategy immediate

# 4. Monitor for 30 minutes
watch -n 5 'fly status -a paintbox'
```

## 🔄 Rollback Plan

### Immediate Rollback (< 5 minutes)
```bash
# Revert to previous version
fly releases -a paintbox
fly deploy --image registry.fly.io/paintbox:[PREVIOUS_VERSION]
```

### Database Rollback
```bash
# Restore from backup
fly ssh console -a paintbox
cp /data/paintbox.db.backup /data/paintbox.db
```

### DNS Rollback (if domain changed)
```bash
# Point domain back to old app
fly certs remove paintbox.candlefish.ai -a paintbox
fly certs add paintbox.candlefish.ai -a paintbox-old
```

## 📊 Monitoring Setup

### Key Metrics to Track

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Uptime | 99.9% | < 99.5% |
| TTI | < 2.5s | > 3.0s |
| Error Rate | < 0.1% | > 0.5% |
| Database Size | < 1GB | > 900MB |
| Memory Usage | < 1.5GB | > 1.8GB |
| CPU Usage | < 70% | > 85% |

### Monitoring Commands
```bash
# Real-time logs
fly logs -a paintbox

# Application status
fly status -a paintbox

# Database health
fly ssh console -a paintbox -c "sqlite3 /data/paintbox.db 'PRAGMA integrity_check'"

# Memory usage
fly ssh console -a paintbox -c "free -h"
```

## 🔐 Secret Management Verification

### Required Secrets
```bash
# List all secrets
fly secrets list -a paintbox

# Required secrets checklist:
SALESFORCE_USERNAME          # From AWS Secrets Manager
SALESFORCE_PASSWORD          # From AWS Secrets Manager  
SALESFORCE_SECURITY_TOKEN    # From AWS Secrets Manager
COMPANYCAM_API_KEY          # From AWS Secrets Manager
NEXTAUTH_SECRET             # Generate new for production
DATABASE_URL                # file:/data/paintbox.db?mode=wal
REDIS_URL                   # Redis connection string
SENTRY_DSN                  # Error tracking
```

### Secret Rotation
```bash
# Rotate sensitive secrets post-deployment
fly secrets set NEXTAUTH_SECRET="$(openssl rand -hex 32)" -a paintbox
```

## 🏗️ Fly Configuration Files

### fly.staging.toml
```toml
app = "paintbox-staging"
primary_region = "sjc"

[build]
  dockerfile = "Dockerfile.production"

[env]
  NODE_ENV = "staging"
  DATABASE_URL = "file:/data/paintbox.db?mode=wal"
  NEXT_PUBLIC_APP_NAME = "Eggshell (Staging)"

[http_service]
  internal_port = 8080
  force_https = true
  min_machines_running = 1
  max_machines_running = 2

[mounts]
  source = "paintbox_staging_data"
  destination = "/data"
```

### fly.production.toml
```toml
app = "paintbox"
primary_region = "sjc"
secondary_regions = ["iad", "sea"]

[build]
  dockerfile = "Dockerfile.production"

[env]
  NODE_ENV = "production"
  DATABASE_URL = "file:/data/paintbox.db?mode=wal"
  NEXT_PUBLIC_APP_NAME = "Eggshell"

[http_service]
  internal_port = 8080
  force_https = true
  min_machines_running = 2
  max_machines_running = 6
  auto_stop_machines = "stop"
  auto_start_machines = true

[mounts]
  source = "paintbox_data"
  destination = "/data"

[[vm]]
  cpu_kind = "shared"
  cpus = 2
  memory_mb = 2048
```

## 📝 Deployment Scripts

### deploy.sh
```bash
#!/bin/bash
# Production deployment script with safety checks

set -e

echo "🚀 Eggshell Production Deployment"

# Check prerequisites
if ! command -v fly &> /dev/null; then
    echo "❌ Fly CLI not installed"
    exit 1
fi

# Run tests
echo "🧪 Running tests..."
npm test || exit 1
npm run test:e2e || exit 1

# Build application
echo "🔨 Building application..."
npm run build || exit 1

# Create backup
echo "💾 Creating database backup..."
fly ssh console -a paintbox -c "cp /data/paintbox.db /data/paintbox.db.$(date +%Y%m%d_%H%M%S)"

# Deploy
echo "🚀 Deploying to production..."
fly deploy --config fly.production.toml --strategy rolling

# Verify
echo "✅ Verifying deployment..."
curl -f https://paintbox.fly.dev/api/health || exit 1

echo "✨ Deployment complete!"
```

## ✅ Post-Deployment Verification

### Functional Checks
1. [ ] Login flow works
2. [ ] Create new estimate
3. [ ] Add client information saves
4. [ ] Excel calculations accurate
5. [ ] PDF export generates
6. [ ] Salesforce sync (if configured)
7. [ ] CompanyCam upload (if configured)
8. [ ] Offline queue processes

### Performance Checks
1. [ ] TTI < 2.5s on mobile
2. [ ] FCP < 1.8s
3. [ ] No memory leaks
4. [ ] Database queries < 100ms

### Telemetry Checks
1. [ ] Widget shows "production"
2. [ ] Build info correct
3. [ ] Integration status accurate
4. [ ] Web Vitals reporting

## 🚨 Emergency Procedures

### High Error Rate
```bash
# Check logs
fly logs -a paintbox --limit 100 | grep ERROR

# Scale down canary
fly scale count 1 -a paintbox

# Rollback if needed
fly releases -a paintbox
fly deploy --image [PREVIOUS_IMAGE]
```

### Database Corruption
```bash
# Restore from backup
fly ssh console -a paintbox
mv /data/paintbox.db /data/paintbox.db.corrupted
cp /data/paintbox.db.backup /data/paintbox.db
./scripts/init-database.sh
```

### Complete Outage
```bash
# Deploy emergency static page
fly deploy --config fly.emergency.toml --strategy immediate

# Investigate root cause
fly logs -a paintbox --limit 500
fly ssh console -a paintbox
```

## 📅 Deployment Timeline

| Day | Phase | Duration | Rollback Point |
|-----|-------|----------|----------------|
| Day 1 | Staging Deploy | 2 hours | N/A |
| Day 1 | Staging Validation | 4 hours | N/A |
| Day 2 | Canary Deploy | 1 hour | Immediate |
| Day 2 | Canary Monitor | 4 hours | Immediate |
| Day 3 | Production Deploy | 1 hour | 5 minutes |
| Day 3 | Production Monitor | 24 hours | 30 minutes |

## 🎯 Success Criteria

- [ ] Zero downtime during deployment
- [ ] All Golden Paths functional
- [ ] Performance targets met (TTI < 2.5s)
- [ ] No data loss
- [ ] Telemetry reporting accurately
- [ ] Error rate < 0.1%
- [ ] 99.9% uptime maintained

## 📞 Escalation

1. **Level 1**: Check deployment logs and telemetry
2. **Level 2**: Roll back to previous version
3. **Level 3**: Deploy emergency static page
4. **Level 4**: DNS failover to backup infrastructure

---

**Status**: Ready for staging deployment  
**Next Step**: Execute Stage 1 (Staging)  
**Risk Level**: Low (all critical issues addressed)
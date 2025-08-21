# Staging Deployment Checklist - Security Fixes
**Date:** January 19, 2025  
**Branch:** main (merged from owner/fix-p0-20250119)  
**Commit:** 53e0fc50

## ✅ Pre-Deployment Verification

### Code Successfully Pushed
- [x] Security fixes merged to main branch
- [x] Large file issue resolved (performance-results.json)
- [x] All reports generated and committed
- [x] Git history clean

## 📋 Staging Deployment Steps

### 1. Environment Preparation
```bash
# Set up staging environment variables
export ENVIRONMENT=staging
export AWS_PROFILE=candlefish-staging

# Verify AWS credentials
aws sts get-caller-identity
```

### 2. Secret Configuration
```bash
# Update secrets in AWS Secrets Manager for staging
aws secretsmanager update-secret \
  --secret-id paintbox/staging/config \
  --secret-string file://staging-secrets.json

# Rotate API keys
npm run rotate-credentials:staging
```

### 3. Database Migration
```bash
# Run PostgreSQL migration for staging
cd projects/paintbox
./scripts/postgres-migration-master.sh staging

# Verify migration
./scripts/validate-migration.sh staging
```

### 4. Deploy to Staging

#### Option A: Netlify (Frontend)
```bash
# Deploy to Netlify staging
cd projects/paintbox
npm run deploy:staging:netlify

# Verify deployment
curl -I https://paintbox-staging.netlify.app/api/health
```

#### Option B: Fly.io (Full Stack)
```bash
# Deploy to Fly.io staging
fly deploy --app paintbox-staging --config fly.staging.toml

# Check deployment status
fly status --app paintbox-staging
```

#### Option C: Vercel (Alternative)
```bash
# Deploy to Vercel staging
vercel --env staging --no-confirm

# Get deployment URL
vercel ls
```

### 5. Post-Deployment Testing

#### Health Checks
```bash
# Test health endpoint
curl https://staging.paintbox.candlefish.ai/api/health

# Test monitoring endpoint
curl https://staging.paintbox.candlefish.ai/api/metrics
```

#### Security Verification
```bash
# Test JWT authentication
npm run test:auth:staging

# Verify CORS configuration
npm run test:cors:staging

# Check security headers
curl -I https://staging.paintbox.candlefish.ai | grep -E "X-Frame-Options|Content-Security-Policy"
```

#### Integration Tests
```bash
# Run full integration test suite
npm run test:integration:staging

# Test Salesforce integration
npm run test:salesforce:staging

# Test CompanyCam integration
npm run test:companycam:staging
```

### 6. Monitoring Setup
```bash
# Verify Sentry is receiving events
npm run test:sentry:staging

# Check CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace Paintbox/Staging \
  --metric-name HealthCheck \
  --start-time 2025-01-19T00:00:00Z \
  --end-time 2025-01-20T00:00:00Z \
  --period 300 \
  --statistics Average
```

## 🔍 Validation Checklist

### Security
- [ ] No exposed secrets in logs
- [ ] JWT RS256 working correctly
- [ ] CORS properly configured (no wildcards)
- [ ] Security headers present
- [ ] Rate limiting active
- [ ] CSRF protection enabled

### Performance
- [ ] Memory usage < 2GB
- [ ] Response time < 200ms
- [ ] Build completes successfully
- [ ] No memory leaks detected

### Infrastructure
- [ ] Database connections working
- [ ] Redis cache operational
- [ ] Monitoring dashboards active
- [ ] Alerts configured
- [ ] Backups running

### Functionality
- [ ] Login/authentication working
- [ ] API endpoints responding
- [ ] Excel calculations accurate
- [ ] File uploads working
- [ ] WebSocket connections stable

## 🚨 Rollback Plan

If issues are detected:

### Quick Rollback
```bash
# Revert to previous deployment
fly releases rollback --app paintbox-staging

# Or for Netlify
netlify rollback --site-id paintbox-staging
```

### Database Rollback
```bash
# Restore from backup
./scripts/restore-database.sh staging backup-20250119

# Verify restoration
./scripts/validate-migration.sh staging
```

## 📊 Success Metrics

Monitor these metrics for 24 hours:

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Error Rate | < 0.1% | > 1% |
| Response Time (p95) | < 200ms | > 500ms |
| Memory Usage | < 2GB | > 3GB |
| CPU Usage | < 70% | > 90% |
| Uptime | 99.9% | < 99% |

## 🎯 Next Steps

After successful staging validation (24-48 hours):

1. **Review staging metrics and logs**
2. **Run load testing**
   ```bash
   npm run test:load:staging
   ```

3. **Security scan**
   ```bash
   npm run security:scan:staging
   ```

4. **Get stakeholder approval**
   - Share staging URL with team
   - Document any issues found
   - Get sign-off for production

5. **Prepare production deployment**
   - Schedule maintenance window
   - Notify customers if needed
   - Prepare rollback plan

## 📝 Notes

### Known Issues to Monitor
- Memory optimization effects on performance
- JWT token refresh edge cases
- Database connection pool sizing
- Cache invalidation timing

### Contact Information
- **DevOps Lead:** devops@candlefish.ai
- **Security Team:** security@candlefish.ai
- **On-Call:** +1-XXX-XXX-XXXX

## ✅ Staging Deployment Complete

Once all checks pass:

```bash
# Tag the staging deployment
git tag -a staging-v1.0.0 -m "Security fixes deployed to staging"
git push origin staging-v1.0.0

# Update deployment tracking
echo "Staging deployment successful at $(date)" >> deployments.log
```

---

**Remember:** Do not proceed to production until staging has been stable for at least 24 hours with no critical issues.

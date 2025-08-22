# Production Readiness Checklist

## ✅ Completed Items

1. **Database Persistence** - Fixed (changed from :memory: to file-based)
2. **Staging Deployment** - Complete (https://paintbox-staging.fly.dev)
3. **AWS Credentials** - Configured (partial - JWKS needs IAM fix)
4. **Salesforce Integration** - Configured with sandbox credentials
5. **Golden Path Testing** - 92.8% pass rate (13/14 tests)
6. **Performance Monitoring** - Established baseline metrics

## 🔧 Required Fixes Before Production

### Critical Issues

#### 1. Memory Optimization (HIGH PRIORITY)
**Issue**: Application using 95% of allocated memory (56MB/60MB)
**Fix Required**:
```toml
# In fly.toml - increase memory
[[vm]]
  size = "shared-2x"  # 2GB RAM instead of 1GB
```

#### 2. PDF Generation (HIGH PRIORITY)
**Issue**: PDF export endpoint returning HTTP 500
**Fix Required**:
- Check puppeteer/chromium dependencies
- Ensure PDF libraries are properly installed
- Add error handling for PDF generation

#### 3. AWS IAM Permissions (MEDIUM PRIORITY)
**Issue**: JWKS endpoint can't access AWS Secrets Manager
**Fix Required**:
```bash
# Add IAM policy for Fly.io app
aws iam create-policy --policy-name paintbox-secrets-access \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:*:secret:paintbox/*"
    }]
  }'
```

### Performance Optimizations

#### 4. Redis Configuration (MEDIUM PRIORITY)
**Issue**: Using in-memory cache instead of Redis
**Fix Required**:
```bash
# Add Redis to Fly.io
fly redis create --name paintbox-redis --region sjc
fly secrets set REDIS_URL="redis://default:password@paintbox-redis.internal:6379"
```

#### 5. Build Optimizations (LOW PRIORITY)
**Issue**: Missing dependencies (web-vitals, k6, @radix-ui/react-badge)
**Fix Required**:
```bash
# Clean up package.json - remove unused dependencies
npm uninstall k6 @radix-ui/react-badge
npm install web-vitals
```

### Security Enhancements

#### 6. Environment Variables (MEDIUM PRIORITY)
**Issue**: NODE_ENV set to "staging" causing warnings
**Fix Required**:
```toml
# In fly.staging.toml
[env]
  NODE_ENV = "production"  # Next.js expects only "production" or "development"
  APP_ENV = "staging"      # Use custom var for environment distinction
```

#### 7. CORS Configuration (LOW PRIORITY)
**Issue**: CORS headers may be too permissive
**Fix Required**:
- Review and restrict CORS origins
- Add rate limiting for API endpoints

## Deployment Steps for Production

### Phase 1: Fix Critical Issues
```bash
# 1. Update memory allocation
fly scale memory 2048 --app paintbox-staging

# 2. Fix PDF generation locally
npm run test:pdf

# 3. Update AWS credentials with proper IAM role
fly secrets set AWS_ROLE_ARN="arn:aws:iam::681214184463:role/paintbox-prod"
```

### Phase 2: Deploy to Production
```bash
# 1. Create production app
fly apps create paintbox-production --org personal

# 2. Set production secrets
fly secrets set --app paintbox-production \
  DATABASE_URL="file:/data/paintbox.db?mode=wal" \
  NEXTAUTH_URL="https://paintbox.fly.dev" \
  NEXTAUTH_SECRET="$(openssl rand -base64 32)" \
  # ... other secrets

# 3. Deploy
fly deploy --app paintbox-production --config fly.production.toml

# 4. Scale appropriately
fly scale memory 4096 --app paintbox-production
fly scale count 2 --app paintbox-production  # For redundancy
```

### Phase 3: Post-Deployment
- [ ] Run full Golden Path test suite
- [ ] Monitor error rates for 24 hours
- [ ] Set up alerts for memory > 80%
- [ ] Configure backup strategy for SQLite database
- [ ] Enable APM monitoring (Sentry/DataDog)

## Success Criteria

Production deployment is successful when:
1. All 8 Golden Paths pass (100%)
2. Memory usage stays below 80%
3. Response times < 200ms for calculations
4. Zero critical errors in 24-hour period
5. Successful PDF generation for 100 test estimates

## Rollback Plan

If issues occur in production:
1. Keep staging as backup: `fly apps restart paintbox-staging`
2. Database backup before deployment: `fly ssh console -a paintbox-production -C "sqlite3 /data/paintbox.db .backup /data/backup.db"`
3. DNS can be switched back to staging in < 5 minutes
4. Previous Docker images retained for 30 days

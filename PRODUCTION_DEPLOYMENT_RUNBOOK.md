# Candlefish AI Production Deployment Runbook

## 🚀 Overview

This runbook provides step-by-step procedures for deploying the complete Candlefish AI documentation platform restructuring to production. The deployment includes:

- **Backend**: Deployment API with PostgreSQL database
- **Frontend**: Deployment dashboard UI  
- **Documentation Sites**: docs.candlefish.ai, partners.candlefish.ai, api.candlefish.ai
- **Infrastructure**: Complete monitoring, alerting, and rollback systems

## 📋 Pre-Deployment Checklist

### Prerequisites Verification

- [ ] **Environment Variables**: All required secrets in AWS Secrets Manager
- [ ] **Database**: PostgreSQL instance accessible and configured
- [ ] **GitHub Tokens**: Repository access and workflow permissions
- [ ] **Netlify Tokens**: Site deployment permissions
- [ ] **AWS Credentials**: S3, Route53, and other service access
- [ ] **Slack Integration**: Webhook configured for notifications

### Code Readiness

- [ ] **All Tests Passing**: Unit, integration, E2E, accessibility tests
- [ ] **Security Scan**: No critical vulnerabilities detected
- [ ] **Performance Tests**: Meeting established benchmarks
- [ ] **Documentation**: Up to date and complete
- [ ] **Rollback Plan**: Verified and tested

## 🎯 Deployment Execution

### Option 1: Automated Deployment (Recommended)

```bash
# Navigate to project root
cd /Users/patricksmith/candlefish-ai

# Set required environment variables
export GITHUB_TOKEN="your_github_token"
export NETLIFY_TOKEN="your_netlify_token" 
export POSTGRES_URL="your_postgresql_url"
export SLACK_WEBHOOK="your_slack_webhook_url"

# Execute production deployment
./scripts/production-deployment-orchestrator.sh deploy
```

### Option 2: Manual Step-by-Step Deployment

#### Step 1: Database Setup
```bash
# Setup deployment tracking database
./scripts/setup-deployment-database.sh setup

# Verify database health
./scripts/setup-deployment-database.sh check
```

#### Step 2: Code Preparation
```bash
# Commit all changes
git add -A
git commit -m "Production deployment: Complete platform restructuring"
git push origin main
```

#### Step 3: Build and Test
```bash
# Install dependencies
pnpm install --frozen-lockfile

# Run comprehensive tests
pnpm turbo test:unit
pnpm turbo test:integration  
pnpm test:e2e
pnpm test:a11y
pnpm test:performance

# Build all sites
pnpm turbo build --filter="apps/docs-site"
pnpm turbo build --filter="apps/partners-site" 
pnpm turbo build --filter="apps/api-site"
```

#### Step 4: Deploy Sites to Netlify
```bash
# Deploy docs site
cd apps/docs-site
netlify deploy --prod --dir=out --site=docs-candlefish

# Deploy partners site  
cd ../partners-site
netlify deploy --prod --dir=out --site=partners-candlefish

# Deploy API documentation site
cd ../api-site
netlify deploy --prod --dir=out --site=api-candlefish
```

#### Step 5: Validate Deployment
```bash
# Run comprehensive health checks
./scripts/health-check-suite.sh production comprehensive

# Verify SSL certificates
./scripts/health-check-suite.sh production quick
```

## 🔍 Monitoring & Validation

### Health Check Commands

```bash
# Comprehensive health check (recommended)
./scripts/health-check-suite.sh production comprehensive

# Quick health check
./scripts/health-check-suite.sh production quick

# Check deployment status
./scripts/production-deployment-orchestrator.sh status
```

### Key Metrics to Monitor

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| Response Time (95th percentile) | < 100ms | < 2s |
| Uptime | 99.9% | 99.5% |
| Error Rate | < 0.1% | < 1% |
| SSL Certificate Validity | > 30 days | > 7 days |

### Validation Checklist

- [ ] **All sites accessible**: docs, partners, api subdomains
- [ ] **SSL certificates valid**: All HTTPS connections working
- [ ] **DNS resolution working**: All domains resolving correctly  
- [ ] **Performance acceptable**: Response times under thresholds
- [ ] **Content rendering**: Pages loading with expected content
- [ ] **Mobile responsiveness**: Sites working on mobile devices
- [ ] **Accessibility compliance**: Basic WCAG guidelines met
- [ ] **SEO elements present**: Meta tags, structured data

## 🚨 Emergency Procedures

### Emergency Rollback

```bash
# Immediate rollback
./scripts/production-deployment-orchestrator.sh rollback

# Manual rollback if needed
git checkout HEAD~1
./scripts/production-deployment-orchestrator.sh deploy
```

### Incident Response Workflow

1. **Detection**: Monitor alerts in Slack #critical-alerts
2. **Assessment**: Determine severity (P0-P4)
3. **Response**: Follow appropriate procedures
4. **Communication**: Update stakeholders via Slack
5. **Resolution**: Fix and validate
6. **Post-mortem**: Document lessons learned

### Emergency Contacts

- **On-call Engineer**: Available 24/7 via PagerDuty
- **Platform Team**: Business hours support
- **Security Team**: Security-related incidents

## 📊 Expected Deployment Timeline

| Phase | Duration | Description |
|-------|----------|-------------|
| Pre-deployment Setup | 5-10 min | Database setup, environment verification |
| Code Preparation | 2-5 min | Git operations, commit, push |
| CI/CD Pipeline | 15-25 min | Automated testing and building |
| Site Deployment | 10-15 min | Netlify deployments for all three sites |
| DNS/SSL Configuration | 5-10 min | Certificate validation |
| Health Checks | 5-10 min | Comprehensive validation |
| **Total** | **42-65 min** | Complete zero-downtime deployment |

## 🔧 Troubleshooting Guide

### Common Issues & Solutions

#### Site Not Accessible
1. **Check DNS**: `nslookup domain.candlefish.ai`
2. **Verify SSL**: `openssl s_client -connect domain.candlefish.ai:443`
3. **Check Netlify Status**: Review deployment logs
4. **Verify DNS Records**: Ensure CNAME points to Netlify

#### Slow Response Times
1. **Check CDN**: Verify Netlify CDN distribution
2. **Optimize Assets**: Ensure proper caching headers
3. **Monitor Metrics**: Check Netlify analytics
4. **Scale Resources**: Consider plan upgrade if needed

#### SSL Certificate Issues  
1. **Force Renewal**: Trigger new certificate in Netlify
2. **Check CNAME**: Verify proper DNS configuration
3. **Wait for Propagation**: Allow 5-10 minutes for changes
4. **Contact Support**: If issues persist

### Log Locations

```bash
# Deployment logs
ls -la logs/production-deployment-*.log

# Health check reports
ls -la logs/health-check-*.json

# Database setup logs  
ls -la logs/database-setup-*.log
```

## 📈 Performance Baselines

### Current Performance Targets

- **docs.candlefish.ai**: < 1.5s load time, 95+ Lighthouse score
- **partners.candlefish.ai**: < 2.0s load time, 90+ Lighthouse score  
- **api.candlefish.ai**: < 1.0s load time, 95+ Lighthouse score

### Monitoring Dashboard URLs

- **Netlify Analytics**: Available in Netlify dashboard
- **GitHub Actions**: Repository Actions tab
- **Health Check Reports**: `logs/health-check-*.json`

## 🔐 Security Considerations

### Security Headers Implemented

```toml
# In each netlify.toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "SAMEORIGIN"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Strict-Transport-Security = "max-age=31536000; includeSubDomains; preload"
    Content-Security-Policy = "..."
```

### Security Validation

- [ ] **HTTPS Enforced**: All HTTP redirects to HTTPS
- [ ] **Security Headers**: All recommended headers present
- [ ] **No Sensitive Data**: No credentials in client-side code
- [ ] **CORS Configured**: Proper cross-origin resource sharing
- [ ] **CSP Implemented**: Content Security Policy enforced

## 📚 Post-Deployment Tasks

### Immediate (First 24 Hours)
- [ ] Monitor health check reports
- [ ] Review performance metrics
- [ ] Check error rates and logs
- [ ] Validate user feedback channels

### Short-term (First Week)
- [ ] Analyze user engagement metrics
- [ ] Review accessibility compliance
- [ ] Update documentation based on deployment learnings
- [ ] Plan next iteration improvements

### Long-term (First Month)
- [ ] Performance optimization based on real usage
- [ ] SEO improvements and monitoring
- [ ] User experience enhancements
- [ ] Scaling considerations

## 📞 Support Resources

### Documentation
- [GitHub Repository](https://github.com/candlefish-ai/candlefish-ai)
- [Deployment Architecture](deployment/README.md)
- [API Documentation](docs/api/README.md)

### Communication Channels
- **Slack**: #deployments (general), #critical-alerts (urgent)
- **GitHub Issues**: Bug reports and feature requests
- **Email**: dev@candlefish.ai (non-urgent)

### Escalation Path
1. **Level 1**: Self-service (runbooks, documentation)
2. **Level 2**: Team Slack channels
3. **Level 3**: On-call engineer (PagerDuty)
4. **Level 4**: Platform team lead

## 🎉 Success Criteria

Deployment is considered successful when:

- [ ] **All three sites accessible** via HTTPS
- [ ] **Health checks passing** with < 5% warnings
- [ ] **Performance within targets** (response times)
- [ ] **No critical security issues** detected
- [ ] **SSL certificates valid** for all domains
- [ ] **Mobile responsiveness** verified
- [ ] **Accessibility compliance** maintained
- [ ] **SEO elements present** and optimized

---

## 📝 Deployment Log Template

```
Deployment ID: [Generated ID]
Date: [YYYY-MM-DD HH:MM:SS UTC]
Operator: [Your Name]
Environment: Production
Git Commit: [SHA]

Pre-deployment Checklist:
☐ Prerequisites verified
☐ Tests passing
☐ Security scan clean
☐ Rollback plan ready

Deployment Results:
☐ Database setup: [SUCCESS/FAILED]
☐ Code preparation: [SUCCESS/FAILED]  
☐ CI/CD pipeline: [SUCCESS/FAILED]
☐ Site deployments: [SUCCESS/FAILED]
☐ DNS/SSL config: [SUCCESS/FAILED]
☐ Health checks: [SUCCESS/FAILED]

Post-deployment Validation:
☐ All sites accessible
☐ Performance within targets
☐ Security headers present
☐ Mobile responsive
☐ Accessibility compliant

Issues Encountered:
[None / Description of issues and resolutions]

Next Actions:
[Any follow-up items or monitoring requirements]
```

---

*This runbook is living documentation. Update it based on deployment experiences and lessons learned.*

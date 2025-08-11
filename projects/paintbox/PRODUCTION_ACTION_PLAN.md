# Paintbox Production Transition - Prioritized Action Plan
## Immediate Actions Required for Production Launch

### 🚨 CRITICAL PATH - Must Complete in Order

---

## Day 1-2: Credentials Setup
**Owner: Backend Team**

### 1. Salesforce Production Credentials
```bash
# Steps to complete:
1. Log into Salesforce production org
2. Navigate to Setup → Apps → App Manager
3. Create new Connected App "Paintbox Integration"
4. Enable OAuth Settings:
   - Callback URL: https://[your-domain]/api/auth/callback
   - Selected OAuth Scopes: Full access (full), Refresh token (refresh_token)
5. Get Consumer Key (Client ID) and Consumer Secret

# Update secrets:
aws secretsmanager update-secret \
  --secret-id paintbox/secrets \
  --secret-string '{
    "salesforce": {
      "clientId": "YOUR_ACTUAL_CLIENT_ID",
      "clientSecret": "YOUR_ACTUAL_SECRET",
      "username": "integration@yourcompany.com",
      "password": "YOUR_PASSWORD",
      "securityToken": "YOUR_TOKEN",
      "instanceUrl": "https://login.salesforce.com"
    }
  }'
```

### 2. CompanyCam API Access
```bash
# Steps to complete:
1. Go to https://app.companycam.com/settings/integrations
2. Generate API Token
3. Note your Company ID from settings

# Update secrets:
aws secretsmanager update-secret \
  --secret-id paintbox/secrets \
  --secret-string '{
    "companyCam": {
      "apiToken": "YOUR_ACTUAL_TOKEN",
      "companyId": "YOUR_COMPANY_ID"
    }
  }'
```

### 3. Database Provisioning
```bash
# Using Fly.io Postgres (Recommended for simplicity):
fly postgres create --name paintbox-db --region sjc
fly postgres attach paintbox-db

# Or AWS RDS:
aws rds create-db-instance \
  --db-instance-identifier paintbox-prod \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 15.3 \
  --master-username paintbox \
  --master-user-password [SECURE_PASSWORD] \
  --allocated-storage 100 \
  --backup-retention-period 7
```

---

## Day 3-4: Infrastructure Setup
**Owner: DevOps Team**

### 1. Redis Cache Setup
```bash
# Using Fly.io Redis:
fly redis create --name paintbox-cache --region sjc

# Get connection string:
fly redis status paintbox-cache

# Update environment:
fly secrets set REDIS_URL="redis://default:password@paintbox-cache.internal:6379"
```

### 2. Deploy Application with Real Credentials
```bash
# Set Fly.io secrets for AWS access:
fly secrets set AWS_ACCESS_KEY_ID="your-key"
fly secrets set AWS_SECRET_ACCESS_KEY="your-secret"
fly secrets set AWS_REGION="us-west-2"

# Deploy the application:
fly deploy --config fly.toml.secure

# Verify deployment:
fly status
fly logs
```

### 3. Configure Custom Domain
```bash
# Add domain to Fly.io:
fly certs add paintbox.yourcompany.com

# Update DNS records at your provider:
# A Record: paintbox.yourcompany.com → Fly.io IP
# CNAME: www.paintbox.yourcompany.com → paintbox.fly.dev

# Verify SSL:
fly certs show paintbox.yourcompany.com
```

---

## Day 5-6: Testing & Validation
**Owner: QA Team**

### 1. Integration Testing Checklist
```bash
# Run integration tests:
npm run test:integration

# Manual verification checklist:
□ Salesforce connection test
□ Create test contact in Salesforce
□ Upload photo to CompanyCam
□ Generate PDF estimate
□ Verify Excel calculations
□ Test offline mode
□ Check WebSocket real-time updates
```

### 2. Performance Validation
```bash
# Run load tests:
npm run test:load

# Expected benchmarks:
- API response time: < 100ms
- Calculation time: < 50ms
- PDF generation: < 2s
- Page load time: < 1s
```

### 3. Security Validation
```bash
# Security scan:
npm audit
npm run security:scan

# Manual checks:
□ No exposed credentials in logs
□ HTTPS enforced
□ Security headers present
□ Rate limiting active
□ Input validation working
```

---

## Day 7: Production Launch
**Owner: All Teams**

### 1. Pre-Launch Checklist
```bash
□ All secrets configured in AWS Secrets Manager
□ Database migrated and seeded
□ Redis cache operational
□ Custom domain configured with SSL
□ Monitoring dashboards ready
□ Backup strategy implemented
□ Team trained on runbooks
```

### 2. Launch Commands
```bash
# Final deployment:
fly deploy --strategy rolling

# Monitor deployment:
fly logs --tail

# Health check:
curl https://paintbox.yourcompany.com/health

# Enable monitoring:
fly scale count 2 --region sjc
```

### 3. Post-Launch Monitoring
```bash
# Watch metrics:
fly dashboard

# Check error rates:
fly logs | grep ERROR

# Database connections:
fly postgres connect paintbox-db
\l  # List databases
\dt # List tables
```

---

## 🔥 Emergency Rollback Plan

If issues arise during deployment:

```bash
# Immediate rollback:
fly rollback

# Check previous versions:
fly releases

# Rollback to specific version:
fly deploy --image registry.fly.io/paintbox:v123

# Emergency database restore:
fly postgres backup restore paintbox-db --backup-id [BACKUP_ID]
```

---

## 📊 Success Metrics

Production launch is successful when:

| Metric | Target | How to Check |
|--------|--------|--------------|
| Uptime | > 99.9% | `fly status` |
| Response Time | < 100ms | `curl -w "%{time_total}" https://paintbox.yourcompany.com/api/health` |
| Error Rate | < 0.1% | Check logs for errors |
| Salesforce Sync | Working | Create test contact |
| CompanyCam Upload | Working | Upload test photo |
| PDF Generation | Working | Generate test estimate |

---

## 🎯 Quick Reference Commands

```bash
# Check application status
fly status
fly logs --tail

# Check secrets
fly secrets list

# Scale application
fly scale count 3

# Database operations
fly postgres connect paintbox-db

# Redis operations  
fly redis connect paintbox-cache

# Monitor resources
fly dashboard

# Update secrets
fly secrets set KEY=value

# Deploy updates
fly deploy

# Rollback
fly rollback
```

---

## 📱 Contact for Issues

### During Deployment
- **Primary**: DevOps Lead
- **Secondary**: Backend Lead
- **Escalation**: CTO

### Post-Deployment  
- **On-Call**: Rotation schedule
- **Escalation**: Follow incident response procedure

---

## ⏰ Timeline Summary

**Total Time: 7 Days**

- **Day 1-2**: Credentials (48 hours)
- **Day 3-4**: Infrastructure (48 hours)
- **Day 5-6**: Testing (48 hours)
- **Day 7**: Launch (24 hours)

**Buffer**: Add 2-3 days for unexpected issues

---

## ✅ Sign-Off Required

Before production launch, obtain approval from:

- [ ] **Engineering Lead**: Technical readiness
- [ ] **QA Lead**: Testing complete
- [ ] **Security Team**: Security scan passed
- [ ] **Product Owner**: Feature complete
- [ ] **CTO/VP Engineering**: Final approval

---

*Last Updated: January 2025*
*Status: Ready for Implementation*
*Next Action: Begin Day 1 credentials setup*

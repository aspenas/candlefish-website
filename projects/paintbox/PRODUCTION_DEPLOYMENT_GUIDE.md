# Eggshell Production Deployment Guide

## 🚀 Enterprise-Grade Infrastructure Implementation

This guide provides comprehensive instructions for deploying Eggshell with enterprise-grade security, reliability, and scalability on Fly.io with AWS integrations.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Security Setup](#security-setup)
4. [Infrastructure Deployment](#infrastructure-deployment)
5. [Application Deployment](#application-deployment)
6. [Monitoring & Alerting](#monitoring--alerting)
7. [Backup & Recovery](#backup--recovery)
8. [Operations & Maintenance](#operations--maintenance)
9. [Troubleshooting](#troubleshooting)

---

## Overview

### Architecture Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Primary       │    │   Secondary     │    │   Backup        │
│   Region (SJC)  │    │   Region (ORD)  │    │   Systems       │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • App Instance  │    │ • App Instance  │    │ • S3 Backups    │
│ • PostgreSQL    │    │ • Load Balancer │    │ • CloudWatch    │
│ • Redis         │    │ • Health Checks │    │ • SNS Alerts    │
│ • Monitoring    │    │ • Failover      │    │ • Log Archive   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Key Features

- **🔒 Security**: AWS Secrets Manager, no hardcoded credentials
- **🌍 Multi-Region**: Primary (SJC) + Secondary (ORD) with auto-failover
- **💾 Backups**: Automated daily backups with 30-day retention
- **📊 Monitoring**: CloudWatch dashboards, alerts, and health checks
- **🔄 CI/CD**: GitOps workflow with automated deployments
- **⚡ Performance**: Blue-green deployments with zero downtime

---

## Prerequisites

### Required Tools

```bash
# Install required tools
brew install flyctl
brew install awscli
brew install terraform
brew install jq
npm install -g npm@latest
```

### Account Requirements

1. **Fly.io Account**
   - Organization with billing enabled
   - Access to create apps and volumes

2. **AWS Account**
   - IAM permissions for Secrets Manager, CloudWatch, S3
   - Programmatic access configured

3. **GitHub Account** (for CI/CD)
   - Repository access
   - Actions enabled

### Environment Variables

Create a `.env.production` file:

```bash
# Fly.io Configuration
FLY_API_TOKEN=your_fly_api_token
FLY_ORG=your_org_name

# AWS Configuration  
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1

# Application Configuration
ENVIRONMENT=production
PRIMARY_REGION=sjc
SECONDARY_REGION=ord

# Optional: Notification Settings
ALERT_EMAIL=alerts@yourcompany.com
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
```

---

## Security Setup

### 1. AWS Secrets Manager Setup

```bash
# Set up AWS secrets with all credentials
./scripts/setup-aws-secrets.sh

# Verify secrets were created
aws secretsmanager describe-secret \
    --secret-id "eggshell/production/secrets" \
    --region us-east-1
```

### 2. Fly.io Secrets Configuration

```bash
# Set AWS integration secrets
flyctl secrets set \
    AWS_REGION=us-east-1 \
    AWS_SECRETS_MANAGER_SECRET_NAME=eggshell/production/secrets \
    SKIP_AWS_SECRETS=false \
    --app eggshell-app
```

### 3. Database Security

```bash
# Update database passwords (after setup-aws-secrets.sh)
flyctl postgres connect --app eggshell-prod-db
# In psql: ALTER USER postgres PASSWORD 'new_secure_password';

# Update Redis password
flyctl redis connect --app eggshell-redis  
# In redis: CONFIG SET requirepass new_secure_password
```

---

## Infrastructure Deployment

### 1. Terraform Infrastructure

```bash
# Initialize Terraform
cd infrastructure/terraform
terraform init

# Plan infrastructure changes
terraform plan \
    -var="environment=production" \
    -var="project_name=eggshell" \
    -out=tfplan

# Apply infrastructure
terraform apply tfplan
```

### 2. Create Fly.io Resources

```bash
# Create main application
flyctl apps create eggshell-app --org your-org

# Create PostgreSQL database
flyctl postgres create --name eggshell-prod-db \
    --region sjc \
    --vm-size shared-cpu-2x \
    --volume-size 10GB \
    --org your-org

# Create Redis instance
flyctl redis create --name eggshell-redis \
    --region sjc \
    --eviction \
    --org your-org

# Create volumes for persistent data
flyctl volumes create eggshell_data \
    --region sjc \
    --size 1GB \
    --app eggshell-app
```

---

## Application Deployment

### 1. Automated Deployment

```bash
# Deploy with comprehensive automation
./scripts/deploy-flyio-comprehensive.sh deploy

# Or with specific strategy
DEPLOYMENT_STRATEGY=bluegreen ./scripts/deploy-flyio-comprehensive.sh deploy
```

### 2. Manual Deployment Steps

If you need to deploy manually:

```bash
# 1. Update configuration
cp fly.secure.toml fly.toml

# 2. Deploy application
flyctl deploy --app eggshell-app --config fly.secure.toml

# 3. Scale to multiple regions
flyctl scale count 2 --app eggshell-app --region ord

# 4. Verify deployment
flyctl status --app eggshell-app
```

### 3. Health Check Validation

```bash
# Run comprehensive health checks
./scripts/deploy-flyio-comprehensive.sh health

# Or manual checks
curl -f https://eggshell-app.fly.dev/api/health
curl -f https://eggshell-app.fly.dev/api/status
```

---

## Monitoring & Alerting

### 1. Setup Monitoring Infrastructure

```bash
# Configure CloudWatch dashboards and alerts
./scripts/setup-monitoring.sh

# Verify monitoring setup
aws cloudwatch list-dashboards --region us-east-1
aws sns list-topics --region us-east-1
```

### 2. Monitor Key Metrics

**Application Metrics:**
- Response time < 2 seconds
- Error rate < 5%
- Uptime > 99.9%
- Memory usage < 80%

**Database Metrics:**
- Connection count
- Query performance  
- Storage utilization
- Backup status

### 3. Alert Configuration

Alerts are automatically configured for:
- Application downtime
- High response times
- Elevated error rates
- Database connectivity issues
- Failed backups

---

## Backup & Recovery

### 1. Automated Backups

```bash
# Setup automated backup schedule
./scripts/backup-manager.sh schedule

# Manual backup
./scripts/backup-manager.sh backup-all

# List available backups
./scripts/backup-manager.sh list
```

### 2. Backup Verification

```bash
# Verify backup integrity
./scripts/backup-manager.sh verify postgres eggshell-postgres-20241201_120000.sql.gz
./scripts/backup-manager.sh verify redis eggshell-redis-20241201_120000.rdb.gz
```

### 3. Disaster Recovery

```bash
# Restore from backup (CAUTION: This overwrites current data)
FORCE_RESTORE=true ./scripts/backup-manager.sh restore-postgres backup-name.sql.gz

# Point-in-time recovery setup
./scripts/backup-manager.sh pitr
```

---

## Operations & Maintenance

### 1. Regular Maintenance Tasks

**Daily:**
- Monitor application health
- Review error logs
- Check backup completion

**Weekly:**
- Review performance metrics
- Update security patches
- Test backup restoration

**Monthly:**
- Security audit
- Capacity planning review
- Disaster recovery testing

### 2. Scaling Operations

```bash
# Scale application instances
flyctl scale count 4 --app eggshell-app

# Scale database resources
flyctl postgres update --vm-size dedicated-cpu-2x --app eggshell-prod-db

# Scale Redis cache
flyctl redis update --vm-size shared-cpu-2x --app eggshell-redis
```

### 3. Log Management

```bash
# View application logs
flyctl logs --app eggshell-app

# View database logs
flyctl logs --app eggshell-prod-db

# Export logs to CloudWatch
# (Configured automatically via monitoring setup)
```

---

## Troubleshooting

### Common Issues

#### 1. Application Won't Start

```bash
# Check application logs
flyctl logs --app eggshell-app

# Verify secrets configuration
flyctl secrets list --app eggshell-app

# Test database connectivity
flyctl ssh console --app eggshell-app
# Inside container: pg_isready -d $DATABASE_URL
```

#### 2. Database Connection Issues

```bash
# Check database status
flyctl status --app eggshell-prod-db

# Verify connection string
aws secretsmanager get-secret-value \
    --secret-id "eggshell/production/secrets" \
    --region us-east-1 \
    --query SecretString \
    --output text | jq .database
```

#### 3. Deployment Failures

```bash
# Check deployment history
flyctl releases list --app eggshell-app

# Rollback to previous version
./scripts/deploy-flyio-comprehensive.sh rollback

# Or specific release
flyctl releases rollback v123 --app eggshell-app
```

#### 4. Performance Issues

```bash
# Check resource usage
flyctl metrics --app eggshell-app

# Scale resources temporarily
flyctl scale memory 1024MB --app eggshell-app
flyctl scale count 3 --app eggshell-app

# Review slow queries
flyctl ssh console --app eggshell-prod-db
# In container: psql and review pg_stat_statements
```

### Emergency Procedures

#### 1. Complete System Failure

```bash
# 1. Check all services
flyctl status --app eggshell-app
flyctl status --app eggshell-prod-db
flyctl status --app eggshell-redis

# 2. Restore from backups
./scripts/backup-manager.sh restore-postgres latest-backup.sql.gz

# 3. Restart services
flyctl restart --app eggshell-app
```

#### 2. Data Corruption

```bash
# 1. Immediately stop application
flyctl scale count 0 --app eggshell-app

# 2. Create emergency backup
./scripts/backup-manager.sh backup-all

# 3. Restore from known good backup
./scripts/backup-manager.sh restore-postgres good-backup.sql.gz

# 4. Restart application
flyctl scale count 2 --app eggshell-app
```

---

## Security Checklist

- [ ] All credentials stored in AWS Secrets Manager
- [ ] No hardcoded secrets in configuration files
- [ ] Database passwords rotated
- [ ] SSL/TLS enabled for all connections
- [ ] Container running as non-root user
- [ ] Security patches applied
- [ ] Access logs enabled
- [ ] Firewall rules configured
- [ ] Backup encryption enabled
- [ ] Monitoring alerts configured

---

## Performance Optimization

### Application Level

1. **Enable Redis Caching**
   ```bash
   ENABLE_CALCULATION_CACHE=true
   CACHE_TTL_MEDIUM=3600
   ```

2. **Optimize Database Queries**
   - Enable query caching
   - Index frequently queried fields
   - Use connection pooling

3. **CDN Configuration**
   - Serve static assets from CDN
   - Enable compression
   - Optimize images

### Infrastructure Level

1. **Multi-Region Deployment**
   - Primary region: sjc (San Jose)
   - Secondary region: ord (Chicago)
   - Auto-failover configured

2. **Resource Optimization**
   - Right-size VM instances
   - Monitor memory usage
   - Scale based on demand

---

## Cost Optimization

**Monthly Cost Estimate:**
- Fly.io App Instances: $50-100
- PostgreSQL Database: $30-50  
- Redis Cache: $15-25
- AWS Services: $10-20
- **Total: $105-195/month**

**Cost Reduction Strategies:**
- Use shared CPU instances for non-critical workloads
- Implement auto-scaling
- Regular backup cleanup
- Monitor and optimize resource usage

---

## Support & Maintenance

### Internal Team Contacts

- **DevOps Lead**: [Your Name]
- **Backend Developer**: [Developer Name]  
- **Database Administrator**: [DBA Name]

### External Support

- **Fly.io Support**: https://fly.io/support
- **AWS Support**: Via AWS Console
- **Emergency Escalation**: [On-call rotation]

### Documentation Updates

This guide should be updated:
- After major infrastructure changes
- When new team members join
- Quarterly during maintenance reviews
- After incident post-mortems

---

## Conclusion

This production deployment provides:

✅ **Enterprise Security**: AWS Secrets Manager integration
✅ **High Availability**: Multi-region with auto-failover  
✅ **Data Protection**: Automated backups with encryption
✅ **Monitoring**: Comprehensive alerts and dashboards
✅ **Automation**: GitOps workflow with CI/CD
✅ **Scalability**: Resource scaling and performance optimization

The infrastructure is designed for production workloads with minimal operational overhead while maintaining enterprise-grade security and reliability standards.

For additional support or questions, refer to the troubleshooting section or contact the DevOps team.

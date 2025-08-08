# Secure Staging Deployment Guide for Paintbox

## Overview

This guide provides comprehensive instructions for executing a secure staging deployment of the Paintbox application using blue-green deployment strategy with zero downtime, automated rollback capabilities, and enterprise-grade security.

## Architecture

### Blue-Green Deployment Infrastructure

- **AWS ECS Fargate** - Container orchestration with blue/green services
- **Application Load Balancer** - Traffic routing between environments
- **AWS Secrets Manager** - Secure secret storage with KMS encryption
- **AWS RDS PostgreSQL** - Database with encryption at rest
- **AWS ElastiCache Redis** - Caching layer with TLS encryption
- **WAF** - Web application firewall for DDoS protection
- **VPC** - Network isolation with private subnets

### Security Components

- ✅ KMS encryption for all data at rest
- ✅ TLS 1.2+ for all data in transit
- ✅ IAM roles with least privilege access
- ✅ Network ACLs and security groups
- ✅ Container security scanning
- ✅ Automated secret rotation
- ✅ Comprehensive audit logging

## Prerequisites

### Required Tools

```bash
# Install required tools
aws --version        # AWS CLI v2
terraform --version  # Terraform >= 1.0
docker --version     # Docker >= 20.10
jq --version         # jq >= 1.6
```

### AWS Permissions

Required IAM permissions for deployment:

- ECS full access
- ALB management
- RDS management
- ElastiCache management
- Secrets Manager full access
- KMS key management
- VPC management
- IAM role management

### Environment Variables

```bash
export ENVIRONMENT=staging
export AWS_REGION=us-east-1
export AWS_PROFILE=paintbox-staging  # Optional
```

## Phase 1: Infrastructure Validation

### 1. Run Terraform Plan

```bash
cd /Users/patricksmith/candlefish-ai/projects/paintbox/terraform

# Initialize Terraform
terraform init -upgrade

# Validate configuration
terraform validate

# Plan infrastructure changes
terraform plan \
    -var="environment=staging" \
    -var-file="environments/staging.tfvars" \
    -out=staging.tfplan

# Review the plan carefully before proceeding
```

### 2. Security Validation

```bash
# Run comprehensive security validation
./scripts/security-validation.sh --environment staging

# Expected output: All security checks should pass
# Security Score: 11/11 (100%)
```

### 3. Secrets Manager Validation

```bash
# Validate AWS Secrets Manager configuration
./scripts/validate-secrets-manager.sh --environment staging

# This will check:
# - Secret existence and encryption
# - All required secrets are configured
# - No placeholder values remain
# - Proper IAM access permissions
```

### 4. Infrastructure Deployment

```bash
# Apply infrastructure changes
terraform apply staging.tfplan

# Save outputs for later use
terraform output -json > ../deployment-outputs-staging.json
```

## Phase 2: Deployment Strategy

### Blue-Green Deployment Process

1. **Current State Analysis** - Determine active environment (blue/green)
2. **Target Environment Preparation** - Deploy new version to inactive environment
3. **Health Checks** - Comprehensive validation of new deployment
4. **Traffic Switch** - Route traffic to new environment
5. **Monitoring Window** - 10-minute observation period with auto-rollback
6. **Cleanup** - Scale down old environment after successful validation

### Deployment Execution

```bash
# Build and tag new Docker image
IMAGE_TAG="staging-$(git rev-parse --short HEAD)"

# Execute blue-green deployment
./scripts/blue-green-deploy.sh "$IMAGE_TAG"

# Monitor deployment progress
tail -f logs/blue-green-deploy-*.log
```

### Deployment Phases

#### Phase 1: Pre-deployment Validation (2-3 minutes)

- AWS credentials and permissions
- Infrastructure health checks
- Database connectivity
- Redis connectivity
- Secrets Manager access

#### Phase 2: Target Environment Deployment (5-8 minutes)

- Update ECS task definition with new image
- Scale up target environment
- Health checks with retries
- Target group registration

#### Phase 3: Traffic Switch (1-2 minutes)

- ALB listener rule update
- Traffic validation
- Response time monitoring
- Error rate monitoring

#### Phase 4: Monitoring Window (10 minutes)

- Automated monitoring for:
  - Error rate > 10%
  - Response time > 5 seconds
  - Health check failures
  - Database connection issues
- Automatic rollback if issues detected

#### Phase 5: Cleanup (1-2 minutes)

- Scale down old environment
- Final health verification
- Deployment success notification

## Phase 3: Configuration Management

### Secrets Management

All secrets are stored in AWS Secrets Manager with the following structure:

```json
{
  "SALESFORCE_CLIENT_ID": "3MVG...",
  "SALESFORCE_CLIENT_SECRET": "...",
  "SALESFORCE_USERNAME": "...",
  "SALESFORCE_PASSWORD": "...",
  "SALESFORCE_SECURITY_TOKEN": "...",
  "SALESFORCE_INSTANCE_URL": "https://kindhomesolutions1--bartsand.sandbox.my.salesforce.com",
  "COMPANYCAM_API_TOKEN": "...",
  "COMPANYCAM_WEBHOOK_SECRET": "...",
  "ANTHROPIC_API_KEY": "sk-ant-...",
  "DATABASE_URL": "postgresql://...",
  "REDIS_URL": "redis://...",
  "ENCRYPTION_KEY": "...",
  "JWT_SECRET": "...",
  "NEXTAUTH_SECRET": "..."
}
```

### Updating Secrets

```bash
# Update individual secret
aws secretsmanager update-secret \
    --secret-id paintbox-staging \
    --secret-string '{"SALESFORCE_CLIENT_ID": "new_value"}'

# Validate updated secrets
./scripts/validate-secrets-manager.sh --environment staging
```

### Database Migration

```bash
# Database migrations are handled automatically during deployment
# Check migration status
kubectl logs -f deployment/paintbox-migration-job
```

### Redis Configuration

Redis is configured with:

- TLS encryption in transit
- Auth token authentication
- At-rest encryption with KMS
- Automatic failover (production only)

## Health Check Configuration

### Application Health Checks

```bash
# Frontend health check
curl -f https://staging.paintbox.app/api/health

# Backend health check
curl -f https://api-staging.paintbox.app/health
```

### Infrastructure Health Checks

```bash
# Database connectivity
./scripts/health-check.sh --component database

# Redis connectivity
./scripts/health-check.sh --component redis

# All components
./scripts/health-check.sh --all
```

### Health Check Endpoints

| Component | Endpoint | Expected Response |
|-----------|----------|-------------------|
| Frontend | `/api/health` | `{"status": "ok"}` |
| Backend | `/health` | `{"status": "healthy"}` |
| Database | Internal | Connection success |
| Redis | Internal | Connection success |
| Secrets | Internal | Access success |

## Rollback Procedures

### Automatic Rollback Triggers

The deployment system automatically triggers rollback when:

- Error rate exceeds 10% for 5 minutes
- Response time exceeds 5 seconds for 5 minutes
- Health check failures exceed 3 in a row
- Database connection success rate < 90%

### Manual Emergency Rollback

```bash
# Immediate rollback
./scripts/emergency-rollback.sh --force "Critical issue detected"

# Manual rollback with confirmation
./scripts/emergency-rollback.sh "Performance degradation"

# Check current deployment status
./scripts/emergency-rollback.sh --status
```

### Rollback Process

1. **Immediate Traffic Switch** (30 seconds)
   - Route traffic back to previous environment
   - Verify traffic routing

2. **Environment Scaling** (2-3 minutes)
   - Scale up previous environment if needed
   - Scale down failed environment

3. **Validation** (1-2 minutes)
   - Health checks on restored environment
   - Performance monitoring

4. **Notification** (Immediate)
   - Alert team of rollback completion
   - Provide incident details and logs

## Security Validation Checklist

### Pre-deployment Security Validation

- [ ] All secrets stored in AWS Secrets Manager
- [ ] KMS encryption enabled for all data at rest
- [ ] Database not publicly accessible
- [ ] Redis encryption enabled (at rest and in transit)
- [ ] VPC with private subnets configured
- [ ] Security groups follow least privilege
- [ ] WAF rules configured and active
- [ ] CloudWatch logs encrypted
- [ ] IAM roles follow least privilege
- [ ] Container image scanning enabled
- [ ] No hardcoded secrets in code
- [ ] Network traffic encrypted in transit

### Post-deployment Security Validation

```bash
# Run comprehensive security check
./scripts/security-validation.sh --environment staging

# Expected results:
# - Security Score: 11/11 (100%)
# - No failed security checks
# - All warnings addressed
```

## Monitoring and Alerting

### CloudWatch Dashboards

- **Operational Dashboard** - Application metrics, response times, error rates
- **Security Dashboard** - WAF blocks, authentication failures, certificate status
- **Infrastructure Dashboard** - ECS, RDS, ElastiCache metrics

### Alert Configuration

| Alert | Threshold | Action |
|-------|-----------|--------|
| Error Rate | > 10% for 5 min | Automatic rollback |
| Response Time | > 5s for 5 min | Automatic rollback |
| Database CPU | > 80% for 10 min | Scale up notification |
| Redis Memory | > 90% for 5 min | Scale up notification |
| Certificate Expiry | < 30 days | Renewal notification |

### Log Monitoring

```bash
# View application logs
aws logs tail /aws/paintbox/app-staging --follow

# View API logs
aws logs tail /aws/paintbox/api-staging --follow

# View error logs only
aws logs filter-log-events \
    --log-group-name /aws/paintbox/app-staging \
    --filter-pattern "ERROR"
```

## Deployment Commands Reference

### Quick Deployment

```bash
# Standard blue-green deployment
./scripts/blue-green-deploy.sh staging-v1.2.3

# Deployment with extended rollback window
./scripts/blue-green-deploy.sh --rollback-window 15 staging-v1.2.3

# Force deployment (skip confirmations)
./scripts/blue-green-deploy.sh --force staging-v1.2.3
```

### Validation Commands

```bash
# Full security validation
./scripts/security-validation.sh

# Secrets validation
./scripts/validate-secrets-manager.sh

# Infrastructure health check
./scripts/health-check.sh --all

# Current deployment status
./scripts/blue-green-deploy.sh --status
```

### Emergency Commands

```bash
# Emergency rollback
./scripts/emergency-rollback.sh "Critical issue"

# Status check
./scripts/emergency-rollback.sh --status

# Force immediate rollback
./scripts/emergency-rollback.sh --force --type immediate "System down"
```

## Troubleshooting

### Common Issues

#### 1. Secrets Not Found

```bash
# Check if secret exists
aws secretsmanager describe-secret --secret-id paintbox-staging

# Create missing secret
aws secretsmanager create-secret \
    --name paintbox-staging \
    --description "Paintbox staging secrets"
```

#### 2. Health Check Failures

```bash
# Check ECS service events
aws ecs describe-services \
    --cluster paintbox-staging \
    --services paintbox-blue-staging

# Check task logs
aws logs tail /aws/paintbox/app-staging --follow
```

#### 3. Traffic Not Switching

```bash
# Check ALB listener configuration
aws elbv2 describe-listeners \
    --load-balancer-arn $(aws elbv2 describe-load-balancers \
        --names paintbox-alb-staging \
        --query 'LoadBalancers[0].LoadBalancerArn' \
        --output text)

# Verify target group health
aws elbv2 describe-target-health \
    --target-group-arn TARGET_GROUP_ARN
```

#### 4. Database Connection Issues

```bash
# Check RDS instance status
aws rds describe-db-instances --db-instance-identifier paintbox-staging

# Check security group rules
aws ec2 describe-security-groups \
    --filters "Name=tag:Name,Values=paintbox-database-sg-staging"
```

### Log Files

All deployment operations create detailed log files:

- `logs/blue-green-deploy-YYYYMMDD-HHMMSS.log` - Deployment logs
- `logs/emergency-rollback-YYYYMMDD-HHMMSS.log` - Rollback logs
- `logs/security-validation-YYYYMMDD-HHMMSS.log` - Security validation logs
- `logs/secrets-validation-YYYYMMDD-HHMMSS.log` - Secrets validation logs

### Support Contacts

- **DevOps Team**: <devops@candlefish.ai>
- **Security Team**: <security@candlefish.ai>
- **Emergency Escalation**: +1-555-EMERGENCY

## Best Practices

### Before Each Deployment

1. Run security validation
2. Validate all secrets are current
3. Check infrastructure health
4. Review recent error logs
5. Ensure team is available for monitoring

### During Deployment

1. Monitor deployment logs in real-time
2. Watch CloudWatch metrics
3. Keep emergency rollback ready
4. Document any issues encountered

### After Deployment

1. Verify all health checks pass
2. Test critical application flows
3. Monitor for 30 minutes minimum
4. Update deployment documentation
5. Conduct post-deployment review

## Compliance and Auditing

### Audit Trail

All deployment activities are logged to:

- CloudTrail (AWS API calls)
- CloudWatch Logs (Application logs)
- ECS Events (Container orchestration)
- ALB Access Logs (Traffic patterns)

### Compliance Requirements

- SOC 2 Type II compliance
- PCI DSS compliance for payment data
- GDPR compliance for customer data
- HIPAA compliance for healthcare data

### Data Retention

- Application logs: 30 days (staging), 90 days (production)
- Audit logs: 1 year minimum
- Database backups: 30 days (staging), 90 days (production)
- Secret rotation history: 1 year

---

**Version**: 1.0
**Last Updated**: January 2025
**Maintainer**: DevOps Team
**Review Cycle**: Monthly

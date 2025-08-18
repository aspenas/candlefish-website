# GitHub Actions Deployment Checklist

This document provides a complete checklist for setting up and running CI/CD deployments using GitHub Actions.

## Prerequisites

### 1. GitHub Repository Setup
- [ ] Repository is created and code is pushed
- [ ] Repository has `main` and `develop` branches
- [ ] Branch protection rules are configured for `main` branch

### 2. Required GitHub Secrets

Navigate to your repository → Settings → Secrets and Variables → Actions

#### AWS Deployment Secrets:
- [ ] `AWS_ACCESS_KEY_ID` - AWS access key with EKS and ECR permissions
- [ ] `AWS_SECRET_ACCESS_KEY` - Corresponding AWS secret access key
- [ ] `AWS_REGION` - AWS region (e.g., us-west-2)

#### Apollo Studio Secrets:
- [ ] `APOLLO_KEY` - Production Apollo Studio API key
- [ ] `APOLLO_STAGING_KEY` - Staging Apollo Studio API key

#### Docker Registry Secrets (if using Docker Hub):
- [ ] `DOCKER_USERNAME` - Docker Hub username
- [ ] `DOCKER_PASSWORD` - Docker Hub password or access token

#### Notification Secrets (Optional):
- [ ] `SLACK_WEBHOOK_URL` - Slack webhook for deployment notifications

### 3. AWS Infrastructure Prerequisites

#### EKS Clusters:
- [ ] `paintbox-staging` EKS cluster exists in us-west-2
- [ ] `paintbox-production` EKS cluster exists in us-west-2
- [ ] EKS clusters have proper node groups configured
- [ ] kubectl access configured for service account

#### ECR Repositories:
- [ ] `paintbox-estimates` repository created
- [ ] `paintbox-customers` repository created  
- [ ] `paintbox-projects` repository created
- [ ] `paintbox-integrations` repository created
- [ ] `paintbox-router` repository created
- [ ] `paintbox-frontend` repository created

#### Secrets Manager:
- [ ] `apollo-graphos/api-key` secret exists
- [ ] `paintbox/staging/database-passwords` secret exists
- [ ] `paintbox/production/database-passwords` secret exists

## Deployment Workflows

### 1. Continuous Integration (ci.yml)

**Triggers:**
- [ ] Pull requests to `main` or `develop`
- [ ] Pushes to `main` or `develop`

**Jobs:**
- [ ] Quality checks (lint, test, typecheck)
- [ ] Security scanning (Trivy, npm audit)
- [ ] Docker image builds
- [ ] Integration tests
- [ ] GraphQL schema validation

### 2. Staging Deployment (deploy-staging.yml)

**Triggers:**
- [ ] Push to `develop` branch
- [ ] Manual trigger via workflow_dispatch

**Steps:**
1. [ ] Build and push Docker images to ECR
2. [ ] Deploy to staging EKS cluster
3. [ ] Publish GraphQL schemas to Apollo Studio staging
4. [ ] Run smoke tests
5. [ ] Send Slack notification

### 3. Production Deployment (deploy-production.yml)

**Triggers:**
- [ ] Push to `main` branch
- [ ] Manual trigger via workflow_dispatch

**Steps:**
1. [ ] Build and push Docker images to ECR
2. [ ] Deploy to production EKS cluster  
3. [ ] Publish GraphQL schemas to Apollo Studio production
4. [ ] Run health checks
5. [ ] Send Slack notification

## Pre-Deployment Checklist

### Before Staging Deployment:
- [ ] All CI checks pass on `develop` branch
- [ ] Integration tests pass locally
- [ ] Database migrations are ready (if any)
- [ ] Environment variables updated in staging
- [ ] Apollo Studio staging graph configured

### Before Production Deployment:
- [ ] Staging deployment successful and tested
- [ ] All CI checks pass on `main` branch
- [ ] Performance tests completed
- [ ] Security scanning completed
- [ ] Database migrations tested in staging
- [ ] Rollback plan prepared
- [ ] Monitoring alerts configured

## Manual Deployment Commands

### Trigger Staging Deployment:
```bash
# Via GitHub CLI
gh workflow run deploy-staging.yml --ref develop

# Or push to develop branch
git push origin develop
```

### Trigger Production Deployment:
```bash
# Via GitHub CLI  
gh workflow run deploy-production.yml --ref main

# Or push to main branch
git push origin main
```

### Force Deployment (Emergency):
```bash
# Staging with force flag
gh workflow run deploy-staging.yml --ref develop -f force_deploy=true

# Production with force flag
gh workflow run deploy-production.yml --ref main -f force_deploy=true
```

## Post-Deployment Verification

### Staging Verification:
- [ ] https://staging-api.paintbox.candlefish.ai/health returns 200
- [ ] https://staging.paintbox.candlefish.ai loads correctly
- [ ] GraphQL playground accessible and working
- [ ] Apollo Studio shows staging schemas
- [ ] Basic functionality tests pass

### Production Verification:
- [ ] https://api.paintbox.candlefish.ai/health returns 200
- [ ] https://paintbox.candlefish.ai loads correctly
- [ ] GraphQL queries working through federation
- [ ] WebSocket subscriptions functional
- [ ] Apollo Studio monitoring active
- [ ] Performance metrics within acceptable ranges
- [ ] Error rates below threshold

## Rollback Procedures

### Staging Rollback:
```bash
# Rollback to previous deployment
kubectl rollout undo deployment/SERVICE-NAME -n paintbox-staging

# Or redeploy previous commit
git revert HEAD
git push origin develop
```

### Production Rollback:
```bash
# Immediate rollback
kubectl rollout undo deployment/SERVICE-NAME -n paintbox

# Or create hotfix branch
git checkout main
git revert HEAD
git checkout -b hotfix/rollback-deployment
git push origin hotfix/rollback-deployment
# Create PR to main
```

## Monitoring and Alerts

### Key Metrics to Monitor:
- [ ] Deployment success rate
- [ ] Application response times
- [ ] Error rates and exceptions
- [ ] Resource utilization (CPU, memory)
- [ ] GraphQL query performance
- [ ] Federation schema composition

### Alert Thresholds:
- [ ] Deployment failure alerts
- [ ] High error rate (>5%)
- [ ] Slow response times (>2s)
- [ ] Resource usage >80%
- [ ] Schema composition failures

## Troubleshooting Common Issues

### Deployment Failures:
1. **Image build fails**
   - Check Dockerfile syntax
   - Verify build context
   - Check ECR permissions

2. **Kubernetes deployment fails**
   - Verify kubeconfig access
   - Check resource limits
   - Review pod logs

3. **Schema publication fails**
   - Verify Apollo Studio API key
   - Check schema syntax
   - Review schema compatibility

### Application Issues:
1. **Health checks fail**
   - Check application logs
   - Verify database connectivity
   - Review environment variables

2. **GraphQL federation errors**
   - Check subgraph schemas
   - Verify routing URLs
   - Review Apollo Router logs

## Security Considerations

### Secret Management:
- [ ] Rotate GitHub secrets regularly
- [ ] Use least-privilege IAM policies
- [ ] Monitor secret usage
- [ ] Audit access logs

### Image Security:
- [ ] Regular base image updates
- [ ] Vulnerability scanning enabled
- [ ] Non-root container users
- [ ] Minimal image sizes

### Network Security:
- [ ] Private ECR repositories
- [ ] VPC security groups configured
- [ ] Network policies applied
- [ ] SSL/TLS certificates valid

## Performance Optimization

### Build Optimization:
- [ ] Multi-stage Docker builds
- [ ] Build caching enabled
- [ ] Parallel job execution
- [ ] Dependency caching

### Deployment Optimization:
- [ ] Rolling updates configured
- [ ] Health check optimization
- [ ] Resource requests/limits tuned
- [ ] Horizontal pod autoscaling

This checklist ensures reliable, secure, and efficient CI/CD operations for the Apollo GraphOS federation system.

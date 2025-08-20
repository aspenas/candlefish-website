# Production Deployment Runbook - Candlefish Website

## Overview

This runbook provides step-by-step instructions for deploying the Candlefish website to production using blue-green deployment strategy, ensuring zero-downtime and reliable rollback capabilities.

## Prerequisites

### Required Tools
- AWS CLI configured with appropriate permissions
- kubectl configured for production EKS cluster
- Docker (for local image building/testing)
- jq for JSON processing
- curl for health checks

### Required Access
- AWS IAM permissions for ECR, EKS, Secrets Manager
- Kubernetes RBAC permissions for production namespace
- Slack webhook URL for notifications (optional)

### Environment Variables
```bash
export AWS_REGION=us-east-1
export ECR_REPOSITORY=123456789012.dkr.ecr.us-east-1.amazonaws.com/candlefish-website
export ENVIRONMENT=production
export SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

## Pre-Deployment Checklist

### 1. Code Quality Verification
- [ ] All tests pass locally: `npm run test:all`
- [ ] Code review completed and approved
- [ ] Security scan passed
- [ ] Performance benchmarks meet requirements

### 2. Infrastructure Health Check
```bash
# Check cluster health
kubectl cluster-info
kubectl get nodes

# Check namespace resources
kubectl get pods,svc,ingress -n production

# Verify secrets
kubectl get secrets -n production
```

### 3. Database Migrations
```bash
# Check pending migrations
node database/scripts/migrate.js status

# Apply migrations if needed
node database/scripts/migrate.js migrate
```

### 4. Backup Verification
```bash
# Verify recent backups exist
aws s3 ls s3://candlefish-database-backups/full/ --recursive | tail -5

# Test backup restore process (in staging)
./database/backup/backup-script.sh full
```

## Deployment Process

### Step 1: Build and Push Container Image

```bash
# Set image tag (use semantic versioning)
export IMAGE_TAG="v$(date +%Y%m%d)-$(git rev-parse --short HEAD)"

# Build Docker image
docker build -t candlefish-website:$IMAGE_TAG .

# Tag for ECR
docker tag candlefish-website:$IMAGE_TAG $ECR_REPOSITORY:$IMAGE_TAG
docker tag candlefish-website:$IMAGE_TAG $ECR_REPOSITORY:latest

# Push to ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPOSITORY
docker push $ECR_REPOSITORY:$IMAGE_TAG
docker push $ECR_REPOSITORY:latest
```

### Step 2: Run Blue-Green Deployment

```bash
# Execute blue-green deployment
./scripts/deployment/blue-green-deploy.sh \
  --environment production \
  --repository $ECR_REPOSITORY \
  --tag $IMAGE_TAG
```

### Step 3: Monitor Deployment Progress

Monitor the deployment through multiple channels:

1. **Command Line Monitoring**:
   ```bash
   # Watch deployment progress
   kubectl get pods -n production -w
   
   # Check deployment status
   kubectl rollout status deployment/candlefish-website-blue -n production
   kubectl rollout status deployment/candlefish-website-green -n production
   ```

2. **Application Logs**:
   ```bash
   # Follow application logs
   kubectl logs -f -l app=candlefish-website -n production
   ```

3. **Prometheus Alerts**: Monitor alerts in Grafana dashboard

4. **External Monitoring**: Check external uptime monitors

### Step 4: Post-Deployment Verification

#### Health Checks
```bash
# Check application health
curl -f https://candlefish.ai/api/health

# Check performance endpoints
curl -f https://candlefish.ai/api/metrics

# Verify SSL certificate
echo | openssl s_client -connect candlefish.ai:443 -servername candlefish.ai 2>/dev/null | openssl x509 -noout -dates
```

#### Functional Testing
- [ ] Homepage loads correctly
- [ ] Assessment form submits successfully
- [ ] Case studies page displays content
- [ ] Contact form works
- [ ] All critical user journeys function

#### Performance Testing
```bash
# Quick load test
curl -w "@curl-format.txt" -o /dev/null -s https://candlefish.ai

# Lighthouse audit
lighthouse https://candlefish.ai --output json --output-path performance-report.json
```

## Rollback Procedures

### Immediate Rollback (Emergency)

If critical issues are detected:

```bash
# Immediate rollback to previous version
./scripts/deployment/rollback.sh --environment production --force

# Verify rollback success
curl -f https://candlefish.ai/api/health
kubectl get pods -n production
```

### Planned Rollback

For planned rollbacks:

```bash
# Interactive rollback with confirmations
./scripts/deployment/rollback.sh --environment production

# Rollback to specific version
./scripts/deployment/rollback.sh --environment production --type blue
```

## Monitoring and Alerting

### Key Metrics to Monitor

1. **Application Metrics**:
   - Response time (95th percentile < 2s)
   - Error rate (< 1%)
   - Request rate
   - Active users

2. **Infrastructure Metrics**:
   - CPU usage (< 70%)
   - Memory usage (< 80%)
   - Network I/O
   - Disk usage

3. **Business Metrics**:
   - Assessment completions
   - Contact form submissions
   - Page views
   - User engagement

### Dashboard URLs

- **Application Dashboard**: https://grafana.candlefish.ai/d/candlefish-overview
- **Infrastructure Dashboard**: https://grafana.candlefish.ai/d/kubernetes-cluster
- **AWS CloudWatch**: https://console.aws.amazon.com/cloudwatch
- **Sentry Errors**: https://sentry.io/organizations/candlefish/

### Alert Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| Response Time | >1s | >2s | Investigate performance |
| Error Rate | >0.5% | >1% | Check logs, consider rollback |
| CPU Usage | >60% | >80% | Scale up or optimize |
| Memory Usage | >70% | >85% | Check for memory leaks |
| Disk Usage | >80% | >90% | Clean up or expand storage |
| SSL Certificate | <30 days | <7 days | Renew certificate |

## Troubleshooting Guide

### Common Issues and Solutions

#### 1. Deployment Stuck in Pending
```bash
# Check pod events
kubectl describe pods -l app=candlefish-website -n production

# Check resource availability
kubectl top nodes
kubectl get events -n production --sort-by='.lastTimestamp'

# Solutions:
# - Scale cluster if resource constrained
# - Check image pull issues
# - Verify secrets and configmaps
```

#### 2. Health Check Failures
```bash
# Check application logs
kubectl logs -l app=candlefish-website -n production --tail=100

# Check database connectivity
kubectl exec -it deployment/candlefish-website-blue -n production -- curl -f http://localhost:3000/api/health

# Solutions:
# - Verify database connection strings
# - Check secret values
# - Restart unhealthy pods
```

#### 3. High Response Times
```bash
# Check current load
kubectl top pods -n production

# Check database performance
# Connect to RDS and run: SELECT * FROM pg_stat_activity;

# Solutions:
# - Scale horizontally (increase replicas)
# - Optimize database queries
# - Enable caching
```

#### 4. SSL/TLS Issues
```bash
# Check certificate status
kubectl get certificates -n production
kubectl describe certificate candlefish-tls -n production

# Check ingress configuration
kubectl get ingress -n production -o yaml

# Solutions:
# - Renew certificates through cert-manager
# - Update DNS records
# - Check ALB configuration
```

## Security Considerations

### During Deployment
- [ ] Verify image signatures and vulnerability scans
- [ ] Ensure secrets are not exposed in logs
- [ ] Validate network policies are applied
- [ ] Check RBAC permissions

### Post-Deployment
- [ ] Review access logs for anomalies
- [ ] Verify security headers are present
- [ ] Check for unauthorized access attempts
- [ ] Validate backup encryption

## Disaster Recovery

### Database Recovery
```bash
# Restore from backup
./database/backup/restore-script.sh <backup-file>

# Verify data integrity
node database/scripts/migrate.js status
```

### Complete Environment Recreation
```bash
# Deploy infrastructure
cd terraform
terraform plan
terraform apply

# Configure environment
./scripts/environment/setup-env.sh --environment production

# Deploy application
./scripts/deployment/blue-green-deploy.sh --environment production
```

## Communication Templates

### Deployment Announcement
```
🚀 Candlefish Website Deployment Started

Environment: Production
Version: v20240120-abc123f
Deployer: [Your Name]
Expected Duration: 10-15 minutes

Monitoring: https://grafana.candlefish.ai/d/candlefish-overview
```

### Deployment Success
```
✅ Candlefish Website Deployment Completed

Environment: Production
Version: v20240120-abc123f
Duration: 12 minutes
Active Version: Green

All health checks passed. Production traffic switched successfully.
```

### Incident Alert
```
🚨 Production Issue Detected

Issue: High error rate (>2%)
Environment: Production
Started: 2024-01-20 14:30 UTC
Status: Investigating

Actions Taken:
- Monitoring logs and metrics
- [Other actions]

Next Update: 15 minutes
```

## Contact Information

### Escalation Path
1. **Primary**: Development Team
2. **Secondary**: Infrastructure Team  
3. **Manager**: Engineering Manager
4. **Executive**: CTO

### Emergency Contacts
- **On-Call Phone**: [Phone Number]
- **Slack Channel**: #candlefish-alerts
- **Email**: ops@candlefish.ai

## Appendix

### Useful Commands

```bash
# Quick status check
kubectl get pods,svc,ingress -n production

# Check resource usage
kubectl top pods -n production
kubectl top nodes

# View recent events
kubectl get events -n production --sort-by='.lastTimestamp' | tail -10

# Scale deployment
kubectl scale deployment candlefish-website-blue --replicas=5 -n production

# Update image
kubectl set image deployment/candlefish-website-blue website=$ECR_REPOSITORY:new-tag -n production

# Port forward for debugging
kubectl port-forward svc/candlefish-website-service 8080:80 -n production
```

### Configuration Files
- Kubernetes manifests: `/k8s/`
- Terraform configuration: `/terraform/`
- Docker configuration: `/Dockerfile`
- CI/CD pipeline: `/.github/workflows/`

### External Dependencies
- **DNS**: Route53 (candlefish.ai zone)
- **CDN**: CloudFront distribution
- **Database**: RDS PostgreSQL
- **Cache**: ElastiCache Redis
- **Storage**: S3 buckets
- **Monitoring**: Prometheus + Grafana
- **Error Tracking**: Sentry
- **CI/CD**: GitHub Actions

---

**Document Version**: 1.0  
**Last Updated**: 2024-01-20  
**Next Review**: 2024-02-20  
**Owner**: DevOps Team
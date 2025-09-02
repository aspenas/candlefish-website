# Candlefish Operational Maturity Map - Deployment Runbook

This comprehensive runbook covers all deployment procedures, troubleshooting, and operational guidelines for the Candlefish Operational Maturity Map platform.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Deployment Procedures](#deployment-procedures)
4. [Blue-Green Deployment](#blue-green-deployment)
5. [Rollback Procedures](#rollback-procedures)
6. [Monitoring & Alerting](#monitoring--alerting)
7. [Troubleshooting](#troubleshooting)
8. [Security Procedures](#security-procedures)
9. [Disaster Recovery](#disaster-recovery)
10. [Maintenance Procedures](#maintenance-procedures)

## Architecture Overview

### Components
- **Web Application**: Next.js frontend (`candlefish-website`)
- **API Services**: 
  - RTPM API (Python/FastAPI)
  - NANDA API (Node.js/Express)
  - Otter Gateway (Node.js/Express)
- **Databases**: PostgreSQL, Redis
- **Infrastructure**: AWS EKS, ECR, RDS, ElastiCache
- **Monitoring**: Prometheus, Grafana, AlertManager

### Environments
- **Production**: `production` namespace
- **Staging**: `staging` namespace
- **Development**: `development` namespace

## Prerequisites

### Required Tools
```bash
# Install required tools
aws --version       # AWS CLI v2+
kubectl version     # Kubernetes CLI v1.28+
helm version        # Helm v3.12+
docker --version    # Docker v20+
jq --version        # JSON processor
curl --version      # HTTP client
```

### AWS Configuration
```bash
# Configure AWS credentials
aws configure
aws sts get-caller-identity

# Update kubeconfig for EKS
aws eks update-kubeconfig --region us-east-1 --name candlefish-maturity-map-production-eks
```

### Required Permissions
- EKS cluster admin access
- ECR push/pull permissions
- RDS connect permissions
- Secrets Manager read/write
- CloudWatch logs access

## Deployment Procedures

### 1. Pre-deployment Checklist

**Code Review**
- [ ] All PRs reviewed and approved
- [ ] Unit tests passing (>80% coverage)
- [ ] Integration tests passing
- [ ] Security scan completed (no critical vulnerabilities)
- [ ] Performance tests passed

**Infrastructure**
- [ ] EKS cluster healthy
- [ ] Database connections verified
- [ ] Redis cluster accessible
- [ ] Secrets up to date
- [ ] Monitoring systems operational

**Team Coordination**
- [ ] Deployment window scheduled
- [ ] Team notifications sent
- [ ] Rollback plan reviewed
- [ ] On-call engineer identified

### 2. Standard Deployment Process

#### CI/CD Pipeline Deployment

**Automatic Deployment (Recommended)**
```bash
# Push to main branch triggers automatic deployment
git push origin main

# Monitor deployment progress
kubectl get deployments -n production -w
```

**Manual Deployment**
```bash
# Build and push images
docker build -t $ECR_REGISTRY/candlefish-website:$IMAGE_TAG .
docker push $ECR_REGISTRY/candlefish-website:$IMAGE_TAG

# Deploy using blue-green script
./scripts/blue-green-deploy.sh \
  --service candlefish-website \
  --image-tag $IMAGE_TAG \
  --namespace production
```

### 3. Database Migrations

**Pre-deployment Migration Check**
```bash
# Check pending migrations
kubectl exec -it deployment/rtpm-api-blue -n production -- python manage.py showmigrations

# Run migrations (if needed)
kubectl exec -it deployment/rtpm-api-blue -n production -- python manage.py migrate
```

**Migration Rollback**
```bash
# Rollback specific migration
kubectl exec -it deployment/rtpm-api-blue -n production -- \
  python manage.py migrate app_name migration_name
```

### 4. Feature Flags

**Toggle Features**
```bash
# Update feature flags via environment variables
kubectl patch deployment candlefish-website-green -n production \
  -p '{"spec":{"template":{"spec":{"containers":[{"name":"website","env":[{"name":"FEATURE_NEW_UI","value":"true"}]}]}}}}'
```

## Blue-Green Deployment

### Overview
Blue-green deployment ensures zero-downtime deployments by maintaining two identical production environments.

### Process

**1. Automatic Blue-Green Deployment**
```bash
# Use the blue-green deployment script
./scripts/blue-green-deploy.sh \
  --service candlefish-website \
  --image-tag v1.2.3 \
  --namespace production

# Monitor deployment
kubectl get deployments -n production
kubectl get services -n production
```

**2. Manual Blue-Green Steps**

**Step 1: Determine Current Version**
```bash
CURRENT_VERSION=$(kubectl get service candlefish-website-service -n production \
  -o jsonpath='{.spec.selector.version}')
echo "Current version: $CURRENT_VERSION"

NEW_VERSION=$([ "$CURRENT_VERSION" = "blue" ] && echo "green" || echo "blue")
echo "Deploying to: $NEW_VERSION"
```

**Step 2: Deploy New Version**
```bash
# Update deployment with new image
kubectl set image deployment/candlefish-website-$NEW_VERSION \
  website=$ECR_REGISTRY/candlefish-website:$IMAGE_TAG \
  -n production

# Wait for rollout
kubectl rollout status deployment/candlefish-website-$NEW_VERSION -n production
```

**Step 3: Health Check New Version**
```bash
# Port forward to test new version
kubectl port-forward deployment/candlefish-website-$NEW_VERSION 8080:3000 -n production &

# Test health endpoint
curl -f http://localhost:8080/api/health

# Kill port forward
kill %1
```

**Step 4: Switch Traffic**
```bash
# Update service selector
kubectl patch service candlefish-website-service -n production \
  -p "{\"spec\":{\"selector\":{\"version\":\"$NEW_VERSION\"}}}"

# Verify traffic switch
kubectl get service candlefish-website-service -n production \
  -o jsonpath='{.spec.selector.version}'
```

**Step 5: Verify Production Traffic**
```bash
# Test production endpoints
curl -f https://candlefish.ai/api/health
curl -f https://candlefish.ai/

# Monitor metrics for 5-10 minutes
kubectl port-forward service/prometheus 9090:9090 -n monitoring &
# Open http://localhost:9090
```

**Step 6: Cleanup Old Version**
```bash
# After successful verification, scale down old version
kubectl scale deployment candlefish-website-$CURRENT_VERSION --replicas=0 -n production

# Or delete old deployment
kubectl delete deployment candlefish-website-$CURRENT_VERSION -n production
```

### Blue-Green Deployment Verification

**Health Checks**
```bash
# Service health
curl -f https://candlefish.ai/api/health

# Database connectivity
curl -f https://candlefish.ai/api/health/db

# Redis connectivity
curl -f https://candlefish.ai/api/health/cache

# External dependencies
curl -f https://candlefish.ai/api/health/dependencies
```

**Performance Verification**
```bash
# Response time check
curl -w "@curl-format.txt" -o /dev/null -s https://candlefish.ai/

# Load test (if available)
k6 run performance-tests/load-test.js
```

## Rollback Procedures

### 1. Emergency Rollback

**Quick Rollback (30 seconds)**
```bash
# Use the emergency rollback script
./scripts/rollback.sh --service candlefish-website --namespace production

# Or manual rollback
CURRENT_VERSION=$(kubectl get service candlefish-website-service -n production \
  -o jsonpath='{.spec.selector.version}')
PREVIOUS_VERSION=$([ "$CURRENT_VERSION" = "blue" ] && echo "green" || echo "blue")

kubectl patch service candlefish-website-service -n production \
  -p "{\"spec\":{\"selector\":{\"version\":\"$PREVIOUS_VERSION\"}}}"
```

**Rollback with Interactive Selection**
```bash
./scripts/rollback.sh --interactive --service candlefish-website
```

### 2. Database Rollback

**Schema Rollback**
```bash
# Connect to database
kubectl exec -it deployment/rtpm-api-blue -n production -- psql $DATABASE_URL

# Check migration history
kubectl exec -it deployment/rtpm-api-blue -n production -- \
  python manage.py showmigrations

# Rollback to specific migration
kubectl exec -it deployment/rtpm-api-blue -n production -- \
  python manage.py migrate app_name 0042_previous_migration
```

### 3. Configuration Rollback

**Secret Rollback**
```bash
# List secret versions
aws secretsmanager list-secret-version-ids --secret-id candlefish/production/config

# Restore previous version
aws secretsmanager restore-secret --secret-id candlefish/production/config \
  --version-id previous-version-uuid

# Restart pods to pick up new secrets
kubectl rollout restart deployment/candlefish-website-blue -n production
```

### 4. Rollback Verification

**Post-Rollback Checks**
```bash
# Verify service is healthy
curl -f https://candlefish.ai/api/health

# Check error rates
kubectl logs -l app=candlefish-website -n production --tail=100

# Monitor metrics
# Check Grafana dashboards for error rates and response times
```

## Monitoring & Alerting

### Key Metrics to Monitor

**Application Metrics**
- Request rate (RPS)
- Error rate (%)
- Response time (P95, P99)
- Service availability

**Infrastructure Metrics**
- CPU usage
- Memory usage
- Disk usage
- Network I/O

**Database Metrics**
- Connection count
- Query performance
- Deadlocks
- Replication lag

### Alert Thresholds

**Critical Alerts**
- Service down (0 healthy instances)
- Error rate > 5%
- Response time P95 > 2s
- Database connection failures

**Warning Alerts**
- CPU usage > 80%
- Memory usage > 80%
- Disk usage > 85%
- High database connections (> 80% of max)

### Monitoring Commands

**Check Service Health**
```bash
# Pod status
kubectl get pods -l app=candlefish-website -n production

# Service endpoints
kubectl get endpoints candlefish-website-service -n production

# Recent logs
kubectl logs -l app=candlefish-website -n production --tail=50 --since=5m

# Resource usage
kubectl top pods -l app=candlefish-website -n production
```

**Access Monitoring Dashboards**
```bash
# Prometheus
kubectl port-forward service/prometheus 9090:9090 -n monitoring

# Grafana
kubectl port-forward service/grafana 3000:3000 -n monitoring

# AlertManager
kubectl port-forward service/alertmanager 9093:9093 -n monitoring
```

## Troubleshooting

### Common Issues

#### 1. Pod Stuck in Pending State

**Diagnosis**
```bash
kubectl describe pod <pod-name> -n production
kubectl get events -n production --sort-by='.lastTimestamp'
```

**Common Causes & Solutions**
- Insufficient resources: Scale cluster or adjust resource requests
- Node selector issues: Check node labels and selectors
- Volume mounting issues: Verify PVC and storage class

#### 2. Service Unavailable

**Diagnosis**
```bash
# Check service endpoints
kubectl get endpoints <service-name> -n production

# Check service configuration
kubectl describe service <service-name> -n production

# Test service connectivity
kubectl run test-pod --rm -i --tty --image=alpine -- sh
# Inside pod: wget -qO- http://service-name/api/health
```

**Solutions**
- Verify pod labels match service selector
- Check if pods are ready and healthy
- Verify network policies are not blocking traffic

#### 3. Database Connection Issues

**Diagnosis**
```bash
# Check database pod status
kubectl get pods -l app=postgresql -n production

# Check database logs
kubectl logs -l app=postgresql -n production --tail=100

# Test connection from application pod
kubectl exec -it deployment/candlefish-website-blue -n production -- \
  nc -zv postgresql-service 5432
```

**Solutions**
- Verify database credentials in secrets
- Check security group rules
- Verify DNS resolution

#### 4. High Error Rate

**Diagnosis**
```bash
# Check application logs
kubectl logs -l app=candlefish-website -n production --tail=200 | grep -i error

# Check recent deployments
kubectl rollout history deployment/candlefish-website-blue -n production

# Monitor metrics
curl -s http://localhost:9090/api/v1/query?query='rate(http_requests_total{code!~"2.."}[5m])'
```

**Solutions**
- Rollback to previous version if recent deployment
- Check for configuration changes
- Investigate upstream service issues

### Emergency Procedures

#### 1. Complete Service Outage

**Immediate Response (< 5 minutes)**
```bash
# Check all critical services
kubectl get deployments -n production
kubectl get services -n production
kubectl get pods -n production | grep -v Running

# Quick rollback if recent deployment
./scripts/rollback.sh --service candlefish-website --force

# Scale up if resource issues
kubectl scale deployment candlefish-website-blue --replicas=6 -n production
```

#### 2. Database Emergency

**Immediate Response**
```bash
# Check database status
kubectl exec -it postgresql-0 -n production -- pg_isready

# Check replication if applicable
kubectl exec -it postgresql-0 -n production -- \
  psql -c "SELECT * FROM pg_stat_replication;"

# Emergency read-only mode
kubectl patch deployment candlefish-website-blue -n production \
  -p '{"spec":{"template":{"spec":{"containers":[{"name":"website","env":[{"name":"READ_ONLY_MODE","value":"true"}]}]}}}}'
```

## Security Procedures

### Secret Management

**Rotate Secrets**
```bash
# Generate new secret
NEW_SECRET=$(openssl rand -base64 32)

# Update in AWS Secrets Manager
aws secretsmanager update-secret \
  --secret-id candlefish/production/jwt-secret \
  --secret-string "{\"jwt-secret\":\"$NEW_SECRET\"}"

# Restart deployments to pick up new secret
kubectl rollout restart deployment/candlefish-website-blue -n production
kubectl rollout restart deployment/candlefish-website-green -n production
```

**Certificate Renewal**
```bash
# Check certificate expiry
echo | openssl s_client -connect candlefish.ai:443 2>/dev/null | \
  openssl x509 -noout -dates

# Renew Let's Encrypt certificate (cert-manager should handle this)
kubectl get certificates -A
kubectl describe certificate candlefish-ai-tls -n production
```

### Security Monitoring

**Check for Vulnerabilities**
```bash
# Scan container images
trivy image $ECR_REGISTRY/candlefish-website:latest

# Check for unauthorized access attempts
kubectl logs -l app=otter-gateway -n production | grep "401\|403"

# Monitor suspicious patterns
kubectl logs -l app=candlefish-website -n production | \
  grep -E "(sql|script|<|>)" | head -20
```

## Disaster Recovery

### Backup Procedures

**Database Backup**
```bash
# Create database backup
kubectl exec -it postgresql-0 -n production -- \
  pg_dump -U postgres candlefish > backup-$(date +%Y%m%d-%H%M).sql

# Upload to S3
aws s3 cp backup-$(date +%Y%m%d-%H%M).sql \
  s3://candlefish-backups/database/
```

**Configuration Backup**
```bash
# Backup Kubernetes manifests
kubectl get all,secrets,configmaps -n production -o yaml > \
  k8s-backup-$(date +%Y%m%d-%H%M).yaml

# Backup secrets (encrypted)
kubectl get secrets -n production -o yaml > \
  secrets-backup-$(date +%Y%m%d-%H%M).yaml
```

### Recovery Procedures

**Database Recovery**
```bash
# Restore from backup
kubectl exec -i postgresql-0 -n production -- \
  psql -U postgres -d candlefish < backup-20240127-1430.sql

# Verify data integrity
kubectl exec -it postgresql-0 -n production -- \
  psql -U postgres -d candlefish -c "SELECT COUNT(*) FROM users;"
```

**Complete Environment Recovery**
```bash
# Recreate namespace
kubectl create namespace production

# Apply all manifests
kubectl apply -f k8s-backup-20240127-1430.yaml

# Restore secrets
kubectl apply -f secrets-backup-20240127-1430.yaml

# Wait for services to come up
kubectl get pods -n production -w
```

## Maintenance Procedures

### Scheduled Maintenance

**Pre-maintenance Checklist**
- [ ] Maintenance window scheduled
- [ ] Team notified
- [ ] Backups completed
- [ ] Rollback plan prepared
- [ ] Monitoring alerts adjusted

**Maintenance Window Process**
1. Enable maintenance mode
2. Perform updates/changes
3. Verify functionality
4. Disable maintenance mode
5. Monitor for issues

**Enable Maintenance Mode**
```bash
# Deploy maintenance page
kubectl apply -f k8s/maintenance-mode.yaml

# Or use feature flag
kubectl patch deployment candlefish-website-blue -n production \
  -p '{"spec":{"template":{"spec":{"containers":[{"name":"website","env":[{"name":"MAINTENANCE_MODE","value":"true"}]}]}}}}'
```

### Regular Maintenance Tasks

**Weekly Tasks**
- Review monitoring alerts and thresholds
- Check certificate expiry dates
- Review resource usage trends
- Update dependency vulnerabilities

**Monthly Tasks**
- Rotate access keys and secrets
- Review and test disaster recovery procedures
- Update documentation
- Capacity planning review

**Quarterly Tasks**
- Security audit
- Performance testing
- Infrastructure cost optimization
- Backup and recovery testing

### Node Maintenance

**Drain Node for Maintenance**
```bash
# Cordon node (prevent new pods)
kubectl cordon <node-name>

# Drain node (evict pods)
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data

# Perform maintenance...

# Uncordon node
kubectl uncordon <node-name>
```

## Conclusion

This runbook provides comprehensive procedures for deploying, monitoring, and maintaining the Candlefish Operational Maturity Map platform. Regular updates to this document ensure it remains current with operational practices and infrastructure changes.

### Emergency Contacts

- **On-call Engineer**: [Slack: #candlefish-ops]
- **Infrastructure Team**: [Email: infrastructure@candlefish.ai]
- **Security Team**: [Email: security@candlefish.ai]

### Additional Resources

- **Monitoring Dashboards**: https://grafana.candlefish.ai
- **Alert Manager**: https://alerts.candlefish.ai
- **Documentation**: https://docs.candlefish.ai
- **Status Page**: https://status.candlefish.ai
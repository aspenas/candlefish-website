# Bioluminescent Candlefish Animation - Production Deployment Runbook

## Overview

This runbook provides comprehensive guidance for deploying the bioluminescent candlefish animation feature to production. The deployment uses a modern containerized architecture with blue-green deployment strategy, comprehensive monitoring, and automated rollback capabilities.

## Architecture Summary

- **Frontend**: Next.js 14 with React 18, WebGL animations, real-time WebSocket connections
- **Backend**: Node.js container running on Kubernetes (EKS)
- **Infrastructure**: AWS (EKS, RDS, ElastiCache, CloudFront, ALB)
- **Deployment Strategy**: Blue-green with automatic health checks
- **Monitoring**: Prometheus, Grafana, CloudWatch, Jaeger tracing

## Prerequisites

### Required Tools

```bash
# Install required CLI tools
kubectl version --client  # >= 1.25
aws --version             # >= 2.0
terraform version         # >= 1.0
docker --version         # >= 20.0
helm version             # >= 3.0
```

### Access Requirements

- AWS CLI configured with `candlefish-deploy` role
- kubectl configured for production EKS cluster
- Docker registry access (ECR)
- GitHub Actions access for CI/CD

### Environment Variables

```bash
export AWS_REGION="us-east-1"
export AWS_ACCOUNT_ID="YOUR_ACCOUNT_ID"
export NAMESPACE="production"
export DOMAIN="candlefish.ai"
export SLACK_WEBHOOK_URL="YOUR_WEBHOOK_URL"  # Optional
```

## Pre-Deployment Checklist

### 1. Code Quality Verification

```bash
cd /Users/patricksmith/candlefish-ai/brand/website

# Type checking
npm run type-check

# Linting
npm run lint

# Security audit
npm audit --audit-level=high

# Run full test suite
npm run test:all
```

### 2. Infrastructure Validation

```bash
# Verify Terraform configuration
cd terraform/
terraform validate
terraform plan

# Check EKS cluster health
kubectl cluster-info
kubectl get nodes
kubectl get pods --all-namespaces
```

### 3. Container Registry Preparation

```bash
# Login to ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Verify repository exists
aws ecr describe-repositories --repository-names candlefish-website
```

## Deployment Process

### Automated Deployment (Recommended)

The recommended approach is using the GitHub Actions workflow:

1. **Trigger Deployment**
   ```bash
   # Push to main branch for automatic deployment
   git push origin main
   
   # Or trigger manual deployment
   gh workflow run "Bioluminescent Candlefish Animation - Production Deploy" \
     --field environment=production \
     --field force_deploy=true
   ```

2. **Monitor Deployment**
   ```bash
   # Watch GitHub Actions progress
   gh run watch
   
   # Monitor cluster deployment
   kubectl get pods -n production -w
   ```

### Manual Deployment (Emergency Only)

If automated deployment fails, follow these manual steps:

1. **Build and Push Container**
   ```bash
   # Build container
   docker build -t candlefish-website:$(git rev-parse --short HEAD) .
   
   # Tag for ECR
   docker tag candlefish-website:$(git rev-parse --short HEAD) \
     $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/candlefish-website:$(git rev-parse --short HEAD)
   
   # Push to ECR
   docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/candlefish-website:$(git rev-parse --short HEAD)
   ```

2. **Deploy to Kubernetes**
   ```bash
   # Update Kubernetes manifests
   sed -i "s|IMAGE_TAG|$(git rev-parse --short HEAD)|g" k8s/overlays/production/deployment.yaml
   
   # Apply configuration
   kubectl apply -k k8s/overlays/production/
   
   # Wait for rollout
   kubectl rollout status deployment/candlefish-website -n production --timeout=600s
   ```

3. **Verify Deployment**
   ```bash
   ./scripts/verify-deployment.sh
   ```

## Blue-Green Deployment Process

The deployment uses blue-green strategy for zero-downtime deployments:

### 1. Deployment Phase

```bash
# Check current environment color
CURRENT_COLOR=$(kubectl get service candlefish-website -n production -o jsonpath='{.spec.selector.color}' || echo "blue")

# Determine target color
if [ "$CURRENT_COLOR" = "blue" ]; then
  TARGET_COLOR="green"
else
  TARGET_COLOR="blue"
fi

echo "Deploying to $TARGET_COLOR environment..."
```

### 2. Health Verification

```bash
# Wait for new environment to be ready
kubectl rollout status deployment/candlefish-website-$TARGET_COLOR -n production

# Run health checks on new environment
kubectl run health-check --rm -i --restart=Never --image=curlimages/curl \
  -- curl -f "http://candlefish-website-$TARGET_COLOR.production.svc.cluster.local:3000/api/health"
```

### 3. Traffic Switch

```bash
# Switch service to point to new environment
kubectl patch service candlefish-website -n production \
  -p '{"spec":{"selector":{"color":"'$TARGET_COLOR'"}}}'

# Verify traffic switch
sleep 30
curl -f https://candlefish.ai/api/health
```

### 4. Cleanup

```bash
# Scale down old environment after verification
kubectl scale deployment candlefish-website-$CURRENT_COLOR --replicas=0 -n production
```

## Monitoring and Observability

### Health Check Endpoints

- **Application Health**: `https://candlefish.ai/api/health`
- **Animation Status**: `https://candlefish.ai/api/animation/status`
- **Metrics**: `https://candlefish.ai/api/metrics` (internal)

### Monitoring Dashboards

- **Grafana**: `https://grafana.candlefish.ai`
- **CloudWatch**: AWS Console → CloudWatch → Dashboards → `production-candlefish-animation`
- **Jaeger**: `http://jaeger.monitoring.svc.cluster.local:16686`

### Key Metrics to Monitor

```bash
# Application metrics
kubectl port-forward svc/prometheus-stack-kube-prom-prometheus -n monitoring 9090:9090

# View metrics in Prometheus:
# - candlefish_animation_fps
# - candlefish_webgl_memory_usage
# - candlefish_active_connections
# - candlefish_render_time
```

### Log Analysis

```bash
# View application logs
kubectl logs -f deployment/candlefish-website -n production

# View animation-specific logs
aws logs tail /aws/eks/production-candlefish-website/animation --follow

# View performance logs
aws logs tail /aws/eks/production-candlefish-website/performance --follow
```

## Troubleshooting Guide

### Common Issues

#### 1. Container Fails to Start

**Symptoms**: Pods stuck in `CrashLoopBackOff`

**Diagnosis**:
```bash
kubectl describe pod -l app=candlefish-website -n production
kubectl logs -l app=candlefish-website -n production --previous
```

**Solutions**:
- Check resource limits and requests
- Verify environment variables and secrets
- Review application logs for startup errors

#### 2. Health Checks Failing

**Symptoms**: Deployment succeeds but health checks fail

**Diagnosis**:
```bash
# Test health endpoint directly
kubectl exec -it deployment/candlefish-website -n production -- curl localhost:3000/api/health

# Check service connectivity
kubectl get svc candlefish-website -n production
```

**Solutions**:
- Verify health check endpoint implementation
- Check database connectivity
- Review security group configurations

#### 3. Animation Performance Issues

**Symptoms**: Low FPS, high memory usage, connection timeouts

**Diagnosis**:
```bash
# Check WebGL metrics
curl -s https://candlefish.ai/api/animation/status | jq .

# Monitor WebSocket connections
kubectl logs -f deployment/candlefish-website -n production | grep -i websocket
```

**Solutions**:
- Review animation parameters in secrets
- Check CDN cache settings
- Verify client-side fallback mechanisms

#### 4. Database Connection Issues

**Symptoms**: Application returns 500 errors, database connection failures

**Diagnosis**:
```bash
# Check RDS status
aws rds describe-db-instances --db-instance-identifier production-candlefish-db

# Verify security groups
aws ec2 describe-security-groups --group-ids sg-xxxxx
```

**Solutions**:
- Verify RDS instance is running
- Check security group rules
- Validate database credentials in secrets

### Emergency Procedures

#### Immediate Rollback

```bash
# Execute emergency rollback
./scripts/emergency-rollback.sh

# Verify rollback success
./scripts/verify-deployment.sh
```

#### Service Degradation

```bash
# Scale up replicas for increased capacity
kubectl scale deployment candlefish-website --replicas=6 -n production

# Enable animation fallback mode (if implemented)
kubectl set env deployment/candlefish-website ANIMATION_FALLBACK=true -n production
```

#### Complete Outage

```bash
# Switch to maintenance mode
kubectl apply -f k8s/maintenance-mode.yaml

# Scale down application
kubectl scale deployment candlefish-website --replicas=0 -n production

# Investigate and fix issues
# Then scale back up
kubectl scale deployment candlefish-website --replicas=3 -n production
```

## Post-Deployment Verification

### Automated Verification

```bash
# Run comprehensive verification
./scripts/verify-deployment.sh

# Check specific animation functionality
curl -s https://candlefish.ai/api/animation/status | jq '.'

# Verify WebSocket connectivity (if wscat installed)
wscat -c wss://candlefish.ai/ws -x '{"type":"ping"}'
```

### Manual Testing Checklist

- [ ] Homepage loads with bioluminescent animation
- [ ] Animation maintains 60 FPS on desktop
- [ ] Animation gracefully degrades on mobile/low-end devices
- [ ] WebSocket real-time features working
- [ ] No console errors in browser
- [ ] Performance metrics within acceptable ranges
- [ ] SSL certificate valid and properly configured
- [ ] CDN cache working correctly

### Performance Validation

```bash
# Load test with k6 (if available)
k6 run __tests__/performance/k6/production-load-test.js

# Monitor response times
curl -w "@curl-format.txt" -o /dev/null -s https://candlefish.ai

# Check animation frame rate
# (Manual verification in browser developer tools required)
```

## Security Validation

### Security Checklist

- [ ] WAF rules active and blocking malicious traffic
- [ ] Security headers present (HSTS, CSP, etc.)
- [ ] Admin endpoints protected or disabled
- [ ] Secrets properly rotated and encrypted
- [ ] Container security scan passed
- [ ] Network policies restricting pod communication
- [ ] RBAC permissions minimal and appropriate

### Security Monitoring

```bash
# Check WAF metrics
aws wafv2 get-sampled-requests --web-acl-arn $WAF_ARN --rule-metric-name RateLimitRule --scope CLOUDFRONT

# Review GuardDuty findings
aws guardduty list-findings --detector-id $DETECTOR_ID

# Check Config compliance
aws configservice get-compliance-summary
```

## Rollback Procedures

### Automatic Rollback

The deployment pipeline automatically rolls back if:
- Health checks fail after deployment
- Performance metrics exceed thresholds
- Critical errors detected in logs

### Manual Rollback

```bash
# List deployment history
kubectl rollout history deployment/candlefish-website -n production

# Rollback to previous version
kubectl rollout undo deployment/candlefish-website -n production

# Rollback to specific revision
kubectl rollout undo deployment/candlefish-website --to-revision=2 -n production

# Verify rollback
kubectl rollout status deployment/candlefish-website -n production
```

### Blue-Green Rollback

```bash
# Use the emergency rollback script (handles blue-green automatically)
./scripts/emergency-rollback.sh

# Manual blue-green rollback
CURRENT_COLOR=$(kubectl get service candlefish-website -n production -o jsonpath='{.spec.selector.color}')
TARGET_COLOR=$([ "$CURRENT_COLOR" = "blue" ] && echo "green" || echo "blue")

kubectl patch service candlefish-website -n production \
  -p '{"spec":{"selector":{"color":"'$TARGET_COLOR'"}}}'
```

## Maintenance and Updates

### Regular Maintenance Tasks

#### Weekly
- Review monitoring alerts and performance metrics
- Check security scan results
- Verify backup procedures
- Update dependencies (security patches)

#### Monthly
- Rotate secrets and API keys
- Review and update resource limits
- Analyze performance trends
- Test disaster recovery procedures

#### Quarterly
- Security compliance review
- Infrastructure cost optimization
- Update base container images
- Review and update runbook procedures

### Updating Dependencies

```bash
# Update npm dependencies
npm update
npm audit fix

# Update container base image
# (Update Dockerfile with new Node.js version)

# Update Kubernetes manifests
# (Check for new API versions)
```

## Disaster Recovery

### Backup Procedures

```bash
# Database backup (automated via RDS)
aws rds describe-db-snapshots --db-instance-identifier production-candlefish-db

# Configuration backup
kubectl get all -n production -o yaml > production-backup-$(date +%Y%m%d).yaml

# Container image backup (ECR automatically retains images)
aws ecr list-images --repository-name candlefish-website
```

### Recovery Procedures

#### Database Recovery

```bash
# Restore from RDS snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier production-candlefish-db-restored \
  --db-snapshot-identifier production-candlefish-db-snapshot-$(date +%Y%m%d)
```

#### Complete Cluster Recovery

```bash
# Recreate infrastructure with Terraform
cd terraform/
terraform apply

# Redeploy application
kubectl apply -k k8s/overlays/production/

# Restore data from backups
# (Follow database and storage restoration procedures)
```

## Contact Information

### Emergency Contacts

- **DevOps Team**: devops@candlefish.ai
- **Frontend Team**: frontend@candlefish.ai
- **Platform Team**: platform@candlefish.ai

### Escalation Procedures

1. **Level 1**: Automated alerts → On-call engineer
2. **Level 2**: Persistent issues → Team lead + Senior engineers
3. **Level 3**: Critical outage → All hands + Management

## Appendices

### A. Configuration Files

Key configuration files and their locations:
- GitHub Actions workflow: `.github/workflows/bioluminescent-candlefish-deploy.yml`
- Docker configuration: `Dockerfile`
- Terraform infrastructure: `terraform/`
- Kubernetes manifests: `k8s/`
- Health check script: `scripts/healthcheck.js`
- Rollback script: `scripts/emergency-rollback.sh`
- Verification script: `scripts/verify-deployment.sh`

### B. Monitoring Queries

Useful Prometheus queries:
```promql
# Average animation FPS
avg(candlefish_animation_fps)

# WebGL memory usage
candlefish_webgl_memory_usage

# Active WebSocket connections
sum(candlefish_active_connections)

# API response time
histogram_quantile(0.95, candlefish_api_response_time_bucket)
```

### C. Resource Requirements

Minimum resource requirements per environment:

**Production**:
- CPU: 2 cores per replica, 3 replicas
- Memory: 4GB per replica
- Storage: 50GB persistent volume
- Network: 1Gbps bandwidth

**Staging**:
- CPU: 1 core per replica, 2 replicas
- Memory: 2GB per replica
- Storage: 20GB persistent volume
- Network: 500Mbps bandwidth

---

**Last Updated**: 2025-01-03
**Version**: 1.0
**Next Review**: 2025-04-03
# Paintbox Production Deployment Runbook

## Table of Contents
1. [Overview](#overview)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Deployment Procedures](#deployment-procedures)
4. [Monitoring and Verification](#monitoring-and-verification)
5. [Rollback Procedures](#rollback-procedures)
6. [Troubleshooting](#troubleshooting)
7. [Emergency Contacts](#emergency-contacts)
8. [Post-Deployment Tasks](#post-deployment-tasks)

## Overview

This runbook provides step-by-step procedures for deploying the Paintbox application to production, including monitoring, verification, and rollback procedures.

### Architecture Overview
- **Application**: Next.js application with WebSocket support
- **Database**: PostgreSQL with connection pooling (PgBouncer)
- **Cache**: Redis for session and data caching
- **Container Platform**: Kubernetes (EKS)
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus, Grafana, OpenTelemetry
- **Deployment Strategy**: Blue-Green or Canary deployments

### Environment Information
- **Production URL**: https://paintbox.candlefish.ai
- **Kubernetes Namespace**: paintbox-production
- **AWS Region**: us-east-1
- **EKS Cluster**: paintbox-production

## Pre-Deployment Checklist

### Infrastructure Verification
- [ ] Verify EKS cluster is healthy and accessible
- [ ] Confirm database connectivity (PostgreSQL)
- [ ] Verify Redis cache availability
- [ ] Check AWS Secrets Manager access
- [ ] Validate SSL certificates are valid
- [ ] Confirm monitoring stack is operational

### Application Verification
- [ ] All tests pass (unit, integration, e2e)
- [ ] Security scan completed with no critical issues
- [ ] Performance benchmarks meet requirements
- [ ] New image built and pushed to registry
- [ ] Database migrations tested (if applicable)

### Team Coordination
- [ ] Deployment approved by stakeholders
- [ ] Team notified of deployment window
- [ ] On-call engineer available during deployment
- [ ] Rollback plan reviewed and understood

## Deployment Procedures

### Method 1: Automated GitHub Actions Deployment

1. **Trigger Deployment**
   ```bash
   # Push to main branch or create a release
   git push origin main
   
   # Or manually trigger via GitHub Actions
   gh workflow run "Paintbox Production Deployment Pipeline" \
     -f environment=production \
     -f deployment_strategy=blue-green
   ```

2. **Monitor Deployment Progress**
   - Check GitHub Actions workflow status
   - Monitor deployment logs in real-time
   - Verify health checks pass

### Method 2: Manual Blue-Green Deployment

1. **Prepare Environment**
   ```bash
   # Set environment variables
   export NAMESPACE="paintbox-production"
   export NEW_IMAGE="ghcr.io/candlefish-ai/paintbox:v1.2.3"
   
   # Verify kubectl access
   kubectl cluster-info
   kubectl get nodes
   ```

2. **Execute Blue-Green Deployment**
   ```bash
   # Run blue-green deployment script
   ./scripts/blue-green-deploy.sh "$NEW_IMAGE"
   
   # Monitor deployment progress
   kubectl get deployments -n "$NAMESPACE" -w
   ```

3. **Verify Deployment**
   ```bash
   # Check deployment status
   kubectl rollout status deployment/paintbox-app -n "$NAMESPACE"
   
   # Verify pods are running
   kubectl get pods -n "$NAMESPACE" -l app=paintbox
   
   # Check service endpoints
   kubectl get endpoints -n "$NAMESPACE"
   ```

### Method 3: Canary Deployment

1. **Start Canary Deployment**
   ```bash
   # Deploy canary with 10% traffic
   ./scripts/canary-deploy.sh \
     --percentage 10 \
     --delay 300 \
     "$NEW_IMAGE"
   ```

2. **Monitor Canary Metrics**
   - Check error rates in Grafana
   - Monitor latency metrics
   - Verify canary pods are healthy

3. **Promote or Rollback**
   ```bash
   # If metrics look good, deployment will auto-promote
   # To manually rollback:
   ./scripts/canary-deploy.sh --rollback
   ```

## Monitoring and Verification

### Health Check Endpoints
```bash
# Application health
curl -f https://paintbox.candlefish.ai/api/health

# Database health
curl -f https://paintbox.candlefish.ai/api/health/database

# Cache health
curl -f https://paintbox.candlefish.ai/api/health/cache

# Production endpoints
curl -f https://paintbox.candlefish.ai/api/v1/companycam/health
curl -f https://paintbox.candlefish.ai/api/v1/salesforce/health
```

### Performance Verification
```bash
# Response time check
curl -w "Total time: %{time_total}s\n" -o /dev/null -s https://paintbox.candlefish.ai

# Load test (if required)
kubectl apply -f k8s/load-test-job.yaml
```

### Monitoring Dashboards
1. **Grafana Dashboard**: https://grafana.candlefish.ai/d/paintbox-overview
2. **Prometheus Metrics**: https://prometheus.candlefish.ai
3. **Kubernetes Dashboard**: Access via kubectl proxy
4. **Application Logs**: View in Grafana Loki

### Key Metrics to Monitor
- **Response Time**: < 500ms for 95th percentile
- **Error Rate**: < 1% for all endpoints
- **Database Connections**: < 80% of pool capacity
- **Memory Usage**: < 80% of allocated memory
- **CPU Usage**: < 70% of allocated CPU

## Rollback Procedures

### Automatic Rollback
The deployment system includes automatic rollback triggers:
- High error rate (> 5% for 5 minutes)
- Response time degradation (> 2x baseline)
- Health check failures
- Resource exhaustion

### Manual Rollback Options

#### Option 1: GitHub Actions Rollback
```bash
# Find last successful deployment
gh run list --workflow="Paintbox Production Deployment Pipeline" --status=success --limit=1

# Revert to last good commit
git revert HEAD --no-edit
git push origin main
```

#### Option 2: Kubernetes Rollback
```bash
# Rollback to previous deployment
kubectl rollout undo deployment/paintbox-app -n paintbox-production

# Rollback to specific revision
kubectl rollout undo deployment/paintbox-app --to-revision=2 -n paintbox-production

# Check rollback status
kubectl rollout status deployment/paintbox-app -n paintbox-production
```

#### Option 3: Blue-Green Rollback
```bash
# If using blue-green deployment
./scripts/blue-green-deploy.sh --rollback
```

#### Option 4: Canary Rollback
```bash
# Rollback canary deployment
./scripts/canary-deploy.sh --rollback
```

### Emergency Rollback (< 5 minutes)
```bash
#!/bin/bash
# Emergency rollback script

set -e

echo "EMERGENCY ROLLBACK INITIATED"

# Get last known good image
LAST_GOOD_IMAGE=$(kubectl get deployment paintbox-app -n paintbox-production -o jsonpath='{.metadata.annotations.deployment\.kubernetes\.io/last-good-image}')

if [ -z "$LAST_GOOD_IMAGE" ]; then
    # Fallback to previous revision
    kubectl rollout undo deployment/paintbox-app -n paintbox-production
else
    # Deploy last known good image
    kubectl set image deployment/paintbox-app paintbox-app="$LAST_GOOD_IMAGE" -n paintbox-production
fi

# Wait for rollback to complete
kubectl rollout status deployment/paintbox-app -n paintbox-production --timeout=300s

# Verify health
sleep 30
curl -f https://paintbox.candlefish.ai/api/health

echo "EMERGENCY ROLLBACK COMPLETED"
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Pod Startup Failures
```bash
# Check pod logs
kubectl logs -l app=paintbox -n paintbox-production --tail=100

# Check events
kubectl get events -n paintbox-production --sort-by='.lastTimestamp'

# Check resource constraints
kubectl describe pods -l app=paintbox -n paintbox-production
```

#### 2. Database Connection Issues
```bash
# Check database pod status
kubectl get pods -l app=postgres -n paintbox-production

# Test database connectivity
kubectl exec -it paintbox-app-xxx -n paintbox-production -- \
  psql "$DATABASE_URL" -c "SELECT 1;"

# Check connection pool status
kubectl exec -it pgbouncer-xxx -n paintbox-production -- \
  psql -p 6432 -U pgbouncer pgbouncer -c "SHOW POOLS;"
```

#### 3. High Memory Usage
```bash
# Check memory metrics
kubectl top pods -n paintbox-production

# Check memory limits
kubectl describe pods -l app=paintbox -n paintbox-production | grep -A 5 "Limits"

# Scale horizontally if needed
kubectl scale deployment paintbox-app --replicas=5 -n paintbox-production
```

#### 4. SSL Certificate Issues
```bash
# Check certificate status
kubectl get certificates -n paintbox-production

# Check cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager

# Force certificate renewal
kubectl delete certificate paintbox-tls -n paintbox-production
kubectl apply -f k8s/security.yaml
```

#### 5. Load Balancer Issues
```bash
# Check ingress status
kubectl get ingress -n paintbox-production

# Check ingress controller logs
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller

# Check service endpoints
kubectl get endpoints paintbox-service -n paintbox-production
```

### Log Analysis
```bash
# Application logs
kubectl logs -f deployment/paintbox-app -n paintbox-production

# Database logs
kubectl logs -f statefulset/postgres -n paintbox-production

# Redis logs
kubectl logs -f statefulset/redis -n paintbox-production

# Nginx logs
kubectl logs -f deployment/nginx -n paintbox-production
```

### Performance Debugging
```bash
# Check resource usage
kubectl top pods -n paintbox-production
kubectl top nodes

# Check network connectivity
kubectl exec -it paintbox-app-xxx -n paintbox-production -- \
  curl -v http://postgres-service:5432

# Check disk usage
kubectl exec -it paintbox-app-xxx -n paintbox-production -- df -h
```

## Emergency Contacts

### On-Call Engineers
- **Primary**: [On-call rotation system]
- **Secondary**: [Backup engineer]
- **Manager**: [Engineering manager contact]

### Escalation Chain
1. **Level 1**: On-call engineer (0-15 minutes)
2. **Level 2**: Senior engineer + Manager (15-30 minutes)
3. **Level 3**: Director + CTO (30+ minutes)

### External Vendors
- **AWS Support**: [Support case system]
- **GitHub Support**: [Enterprise support]
- **CloudFlare Support**: [Enterprise support]

## Post-Deployment Tasks

### Immediate (0-1 hour)
- [ ] Verify all health checks pass
- [ ] Confirm metrics are being collected
- [ ] Check error logs for any issues
- [ ] Validate critical user workflows
- [ ] Update deployment documentation
- [ ] Notify stakeholders of successful deployment

### Short-term (1-24 hours)
- [ ] Monitor performance metrics
- [ ] Review error rates and response times
- [ ] Check database performance
- [ ] Validate security scans
- [ ] Update capacity planning metrics

### Long-term (1-7 days)
- [ ] Analyze deployment performance
- [ ] Update runbook based on lessons learned
- [ ] Review and update monitoring alerts
- [ ] Plan for next deployment cycle
- [ ] Update disaster recovery procedures

## Deployment Checklist Template

```markdown
## Deployment Checklist - [Date] - [Version]

### Pre-Deployment
- [ ] All tests passing
- [ ] Security scan clean
- [ ] Stakeholder approval
- [ ] Team notification sent
- [ ] Rollback plan reviewed

### Deployment
- [ ] Deployment initiated at [Time]
- [ ] Health checks passed
- [ ] Performance metrics acceptable
- [ ] Error rates normal
- [ ] User validation completed

### Post-Deployment
- [ ] Monitoring confirmed operational
- [ ] Documentation updated
- [ ] Stakeholders notified
- [ ] Issues logged (if any)
- [ ] Lessons learned documented

### Sign-off
- Deployed by: [Name]
- Verified by: [Name]
- Date/Time: [Timestamp]
```

## Appendix

### Useful Commands
```bash
# Quick health check
curl -f https://paintbox.candlefish.ai/api/health

# Get deployment status
kubectl get deployments -n paintbox-production

# Check recent events
kubectl get events -n paintbox-production --sort-by='.lastTimestamp' | tail -10

# Scale deployment
kubectl scale deployment paintbox-app --replicas=N -n paintbox-production

# Get pod logs
kubectl logs -f deployment/paintbox-app -n paintbox-production

# Execute command in pod
kubectl exec -it deployment/paintbox-app -n paintbox-production -- bash
```

### Configuration Files
- **Kubernetes Manifests**: `/k8s/`
- **Docker Configuration**: `/Dockerfile.production`
- **Monitoring Config**: `/monitoring/`
- **Scripts**: `/scripts/`
- **Terraform**: `/terraform/`

---

**Last Updated**: [Current Date]  
**Version**: 1.0  
**Maintained by**: DevOps Team

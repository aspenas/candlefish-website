# Inventory Management System - Deployment Runbook

## Table of Contents
1. [Overview](#overview)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Deployment Procedures](#deployment-procedures)
4. [Rollback Procedures](#rollback-procedures)
5. [Monitoring and Health Checks](#monitoring-and-health-checks)
6. [Troubleshooting](#troubleshooting)
7. [Emergency Procedures](#emergency-procedures)
8. [Post-Deployment Tasks](#post-deployment-tasks)

## Overview

This runbook covers the deployment and operational procedures for the Inventory Management System, which consists of:
- **Backend API**: Go/Fiber application with PostgreSQL and Redis
- **Frontend**: React/TypeScript application served via Nginx
- **Mobile**: React Native mobile application
- **Infrastructure**: Kubernetes with Linkerd service mesh, Kong API Gateway, Prometheus monitoring

### Architecture Components
- **Namespace**: `inventory-production`
- **Deployment Strategy**: Blue-Green with Argo Rollouts
- **Service Mesh**: Linkerd for traffic management and observability
- **API Gateway**: Kong for routing, rate limiting, and authentication
- **Monitoring**: Prometheus + Grafana + AlertManager

## Pre-Deployment Checklist

### 1. Environment Verification
```bash
# Verify cluster connection
kubectl cluster-info

# Check namespace
kubectl get namespace inventory-production

# Verify secrets are available
kubectl get secrets -n inventory-production

# Check persistent volumes
kubectl get pvc -n inventory-production
```

### 2. Image Verification
```bash
# Verify images exist in registry
docker manifest inspect ghcr.io/candlefish-ai/candlefish-ai/inventory-backend:${IMAGE_TAG}
docker manifest inspect ghcr.io/candlefish-ai/candlefish-ai/inventory-frontend:${IMAGE_TAG}
docker manifest inspect ghcr.io/candlefish-ai/candlefish-ai/inventory-mobile:${IMAGE_TAG}
```

### 3. Database Health Check
```bash
# Check database connectivity
kubectl exec -n inventory-production deployment/postgres -- pg_isready -U ${DB_USER}

# Verify Redis connectivity
kubectl exec -n inventory-production deployment/redis -- redis-cli ping
```

### 4. Pre-flight Tests
```bash
# Run pre-deployment tests
npm run test:pre-deployment

# Verify API endpoints are accessible
curl -f https://api.inventory.candlefish.ai/health
```

## Deployment Procedures

### 1. Staging Deployment (Automatic via CI/CD)

Triggered automatically on `develop` branch push:

```bash
# Monitor staging deployment
kubectl get rollout inventory-backend-rollout -n inventory-staging -w

# Check deployment status
kubectl argo rollouts get rollout inventory-backend-rollout -n inventory-staging
```

### 2. Production Deployment (Blue-Green)

#### Automatic Deployment (Main Branch)
Production deployment is automatically triggered on `main` branch push:

```bash
# Monitor the rollout
kubectl argo rollouts get rollout inventory-backend-rollout -n inventory-production -w

# Watch the analysis phase
kubectl argo rollouts get rollout inventory-frontend-rollout -n inventory-production -w
```

#### Manual Deployment
For manual deployments or emergency releases:

```bash
# Set image tags
export IMAGE_TAG="commit-sha-or-version"

# Update rollout with new image
kubectl argo rollouts set image inventory-backend-rollout \
  backend=ghcr.io/candlefish-ai/candlefish-ai/inventory-backend:${IMAGE_TAG} \
  -n inventory-production

kubectl argo rollouts set image inventory-frontend-rollout \
  frontend=ghcr.io/candlefish-ai/candlefish-ai/inventory-frontend:${IMAGE_TAG} \
  -n inventory-production

# Wait for analysis to complete (automatic)
kubectl argo rollouts wait inventory-backend-rollout \
  --for=condition=Progressing \
  --timeout=600s \
  -n inventory-production
```

#### Analysis Phase
The deployment automatically runs analysis checks:
- **Success Rate**: >95% success rate for 5 minutes
- **Response Time**: <2s p95 latency
- **CPU Usage**: <80% average
- **Memory Usage**: <90% of limits
- **Error Rate**: <5% error rate

### 3. Manual Promotion (if needed)
```bash
# Promote after successful analysis
kubectl argo rollouts promote inventory-backend-rollout -n inventory-production
kubectl argo rollouts promote inventory-frontend-rollout -n inventory-production
```

## Rollback Procedures

### 1. Automatic Rollback
The system automatically rolls back if:
- Analysis checks fail
- Health checks fail for >2 minutes
- Error rates exceed thresholds

### 2. Manual Rollback

#### Immediate Rollback (Emergency)
```bash
# Abort current rollout and rollback
kubectl argo rollouts abort inventory-backend-rollout -n inventory-production
kubectl argo rollouts abort inventory-frontend-rollout -n inventory-production

# Verify rollback completed
kubectl argo rollouts status inventory-backend-rollout -n inventory-production
```

#### Rollback to Specific Version
```bash
# Get rollout history
kubectl argo rollouts history inventory-backend-rollout -n inventory-production

# Rollback to specific revision
kubectl argo rollouts undo inventory-backend-rollout --to-revision=5 -n inventory-production
```

### 3. Database Rollback (if needed)
```bash
# Connect to database
kubectl exec -it deployment/postgres -n inventory-production -- psql -U ${DB_USER} -d inventory_production

# Run rollback SQL (prepare in advance)
\i /path/to/rollback-script.sql
```

### 4. Post-Rollback Verification
```bash
# Check application health
curl -f https://api.inventory.candlefish.ai/health
curl -f https://inventory.candlefish.ai/health

# Verify key functionality
./scripts/smoke-tests.sh

# Check metrics in Grafana
open https://grafana.inventory.candlefish.ai
```

## Monitoring and Health Checks

### 1. Key Metrics to Monitor
- **Response Time**: p95 < 2s, p99 < 5s
- **Error Rate**: < 1% overall, < 5% during deployments
- **Throughput**: > baseline requests/second
- **Database Connections**: < 80% of max_connections
- **Memory Usage**: < 90% of limits
- **CPU Usage**: < 80% average

### 2. Health Check Endpoints
```bash
# Backend API health
curl https://api.inventory.candlefish.ai/health

# Database health
kubectl exec -n inventory-production deployment/postgres -- pg_isready

# Redis health  
kubectl exec -n inventory-production deployment/redis -- redis-cli ping

# Frontend health (via Kong)
curl https://inventory.candlefish.ai/health
```

### 3. Monitoring Dashboards
- **Grafana**: https://grafana.inventory.candlefish.ai
- **Prometheus**: https://prometheus.inventory.candlefish.ai
- **AlertManager**: https://alerts.inventory.candlefish.ai

### 4. Log Aggregation
```bash
# View application logs
kubectl logs -f deployment/inventory-backend -n inventory-production

# View Nginx/Frontend logs
kubectl logs -f deployment/inventory-frontend -n inventory-production

# View database logs
kubectl logs -f deployment/postgres -n inventory-production
```

## Troubleshooting

### 1. Common Issues

#### Deployment Stuck in Analysis
```bash
# Check analysis status
kubectl describe analysisrun -n inventory-production

# View analysis logs
kubectl logs -l app.kubernetes.io/component=application-controller -n argocd

# If metrics are unavailable, manually verify and promote
kubectl argo rollouts promote inventory-backend-rollout -n inventory-production --skip-current-analysis
```

#### Database Connection Issues
```bash
# Check database pod status
kubectl get pods -n inventory-production -l app=postgres

# Check database logs
kubectl logs -f deployment/postgres -n inventory-production

# Verify secrets are mounted correctly
kubectl describe pod -n inventory-production -l app=inventory-backend
```

#### High Memory Usage
```bash
# Check memory usage
kubectl top pods -n inventory-production

# Scale up if needed (temporary)
kubectl scale deployment inventory-backend --replicas=5 -n inventory-production

# Investigate memory leaks
kubectl exec -it deployment/inventory-backend -n inventory-production -- /debug/pprof
```

#### Kong API Gateway Issues
```bash
# Check Kong status
kubectl get pods -n kong

# Verify Kong configuration
kubectl get kong-config -o yaml

# Test Kong routing
curl -v -H "Host: api.inventory.candlefish.ai" http://kong-gateway/health
```

### 2. Performance Issues

#### High Response Times
```bash
# Check application metrics
kubectl exec -it deployment/prometheus -n inventory-production -- \
  promtool query instant 'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))'

# Scale horizontally
kubectl argo rollouts set replicas inventory-backend-rollout 5 -n inventory-production

# Check database performance
kubectl exec -it deployment/postgres -n inventory-production -- \
  psql -U ${DB_USER} -d inventory_production -c "SELECT * FROM pg_stat_activity;"
```

#### High Error Rates
```bash
# Check error logs
kubectl logs -f deployment/inventory-backend -n inventory-production | grep ERROR

# Check specific error patterns
kubectl logs deployment/inventory-backend -n inventory-production | grep "database\|connection\|timeout"

# Verify external dependencies
curl -f https://external-api.example.com/health
```

## Emergency Procedures

### 1. Complete System Outage

#### Immediate Response (< 5 minutes)
```bash
# Check all components
kubectl get pods -n inventory-production
kubectl get services -n inventory-production
kubectl get ingress -n inventory-production

# Quick rollback if deployment-related
kubectl argo rollouts abort inventory-backend-rollout -n inventory-production
kubectl argo rollouts abort inventory-frontend-rollout -n inventory-production
```

#### Investigation (5-15 minutes)
```bash
# Check system events
kubectl get events -n inventory-production --sort-by='.lastTimestamp'

# Check node health
kubectl get nodes
kubectl describe nodes

# Check resource usage
kubectl top nodes
kubectl top pods -n inventory-production
```

#### Recovery Actions
```bash
# Scale up if resource constraints
kubectl scale deployment inventory-backend --replicas=5 -n inventory-production

# Restart services if needed
kubectl rollout restart deployment/inventory-backend -n inventory-production

# Check external dependencies
./scripts/dependency-health-check.sh
```

### 2. Database Emergency

#### Database Down
```bash
# Check database pod
kubectl get pods -n inventory-production -l app=postgres

# Check persistent volume
kubectl get pvc -n inventory-production -l app=postgres

# Restart database pod
kubectl delete pod -n inventory-production -l app=postgres

# If PVC issues, restore from backup (prepare procedure in advance)
```

#### Database Performance Issues
```bash
# Check active connections
kubectl exec -it deployment/postgres -n inventory-production -- \
  psql -U ${DB_USER} -d inventory_production -c "SELECT count(*) FROM pg_stat_activity;"

# Kill long-running queries
kubectl exec -it deployment/postgres -n inventory-production -- \
  psql -U ${DB_USER} -d inventory_production -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'active' AND query_start < now() - interval '10 minutes';"
```

### 3. Security Incident Response

#### Suspected Breach
```bash
# Immediately isolate affected pods
kubectl label pods -n inventory-production -l app=inventory-backend quarantine=true
kubectl patch networkpolicy inventory-backend -n inventory-production --type=merge -p='{"spec":{"ingress":[]}}'

# Rotate all secrets immediately
./scripts/rotate-all-secrets.sh

# Review access logs
kubectl logs deployment/kong-gateway -n kong | grep "$(date '+%Y-%m-%d')"
```

#### Credential Compromise
```bash
# Rotate JWT secrets
kubectl patch secret inventory-jwt-secret -n inventory-production --type=merge -p='{"data":{"JWT_SECRET":"'$(echo -n "new-secret" | base64)'"}}'

# Rotate database credentials
./scripts/rotate-db-credentials.sh

# Invalidate all active sessions
kubectl exec -it deployment/redis -n inventory-production -- redis-cli FLUSHALL
```

## Post-Deployment Tasks

### 1. Verification Checklist
- [ ] All pods are running and ready
- [ ] Health checks passing
- [ ] Metrics showing normal patterns
- [ ] No critical alerts firing
- [ ] Database connectivity confirmed
- [ ] External API integrations working
- [ ] Frontend loading correctly
- [ ] Mobile app can connect to API
- [ ] WebSocket connections working

### 2. Performance Baseline Update
```bash
# Collect new performance baselines
./scripts/collect-performance-baseline.sh

# Update alerting thresholds if needed
kubectl apply -f deployment/monitoring/alert-rules.yaml
```

### 3. Documentation Updates
- Update deployment notes in confluence/wiki
- Document any issues encountered
- Update runbook based on lessons learned
- Notify stakeholders of successful deployment

### 4. Cleanup Tasks
```bash
# Clean up old Docker images (automated)
# Clean up old rollout histories
kubectl argo rollouts history inventory-backend-rollout -n inventory-production | head -20 | tail +10 | awk '{print $1}' | xargs -I {} kubectl argo rollouts history delete inventory-backend-rollout {} -n inventory-production

# Verify backup completion
./scripts/verify-backup-completion.sh
```

## Contact Information

### Escalation Contacts
- **Primary On-Call**: Slack #inventory-alerts
- **Engineering Team**: Slack #inventory-team  
- **Infrastructure Team**: Slack #platform-team
- **Emergency Escalation**: +1-XXX-XXX-XXXX

### Useful Links
- **Runbook Repository**: https://github.com/candlefish-ai/candlefish-ai/tree/main/deployment/runbooks
- **Deployment Pipeline**: https://github.com/candlefish-ai/candlefish-ai/actions
- **Monitoring Dashboard**: https://grafana.inventory.candlefish.ai
- **Status Page**: https://status.candlefish.ai
- **Architecture Documentation**: https://docs.candlefish.ai/architecture

---

**Last Updated**: $(date)
**Version**: 1.0
**Owner**: Platform Engineering Team

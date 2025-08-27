# Security Dashboard Deployment Runbook

## Executive Summary

This runbook provides comprehensive procedures for deploying, managing, and troubleshooting the Security Dashboard across multiple platforms. The system is designed to handle 1000+ concurrent users with zero-downtime deployments, comprehensive security monitoring, and automated rollback capabilities.

## Table of Contents

1. [Prerequisites and Setup](#prerequisites-and-setup)
2. [Infrastructure Deployment](#infrastructure-deployment)
3. [Application Deployment](#application-deployment)
4. [Multi-Platform Deployment](#multi-platform-deployment)
5. [Validation Procedures](#validation-procedures)
6. [Monitoring and Alerting](#monitoring-and-alerting)
7. [Rollback Procedures](#rollback-procedures)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Security Hardening](#security-hardening)
10. [Performance Optimization](#performance-optimization)
11. [Maintenance Procedures](#maintenance-procedures)
12. [Emergency Response](#emergency-response)

## Prerequisites and Setup

### Required Tools and Versions

```bash
# Kubernetes CLI
kubectl version --client  # >= 1.28.0

# Terraform
terraform version  # >= 1.5.0

# AWS CLI
aws --version  # >= 2.0.0

# Docker
docker --version  # >= 20.0.0

# Helm
helm version  # >= 3.12.0

# Argo Rollouts CLI
kubectl argo rollouts version  # >= 1.6.0

# Node.js (for local development)
node --version  # >= 20.0.0

# pnpm
pnpm --version  # >= 8.7.0
```

### Environment Variables

```bash
# AWS Configuration
export AWS_REGION="us-east-1"
export AWS_ACCOUNT_ID="681214184463"
export CLUSTER_NAME="security-dashboard-eks"
export NAMESPACE="security-dashboard"

# CI/CD Configuration
export GITHUB_TOKEN="<your-github-token>"
export DOCKER_REGISTRY="681214184463.dkr.ecr.us-east-1.amazonaws.com"

# Monitoring Configuration
export SLACK_WEBHOOK_URL="<slack-webhook-url>"
export PAGERDUTY_ROUTING_KEY="<pagerduty-routing-key>"
```

### AWS Permissions

The deployment requires the following AWS services and permissions:

- **EKS**: Full access to manage Kubernetes clusters
- **RDS**: Full access to manage PostgreSQL databases
- **ElastiCache**: Full access to manage Redis clusters
- **ECR**: Full access to container registry
- **Secrets Manager**: Full access to manage secrets
- **ALB/ELB**: Full access to manage load balancers
- **Route53**: DNS management permissions
- **CloudFront**: CDN management permissions
- **S3**: Storage for logs and artifacts

### Initial Setup

```bash
# 1. Clone the repository
git clone https://github.com/candlefish-ai/security-dashboard.git
cd security-dashboard

# 2. Configure AWS credentials
aws configure
aws eks update-kubeconfig --region $AWS_REGION --name $CLUSTER_NAME

# 3. Install kubectl plugins
curl -LO https://github.com/argoproj/argo-rollouts/releases/latest/download/kubectl-argo-rollouts-linux-amd64
chmod +x kubectl-argo-rollouts-linux-amd64
sudo mv kubectl-argo-rollouts-linux-amd64 /usr/local/bin/kubectl-argo-rollouts

# 4. Verify connectivity
kubectl cluster-info
kubectl get nodes
```

## Infrastructure Deployment

### Phase 1: Core Infrastructure

```bash
# 1. Deploy AWS infrastructure with Terraform
cd deployment/terraform/security-dashboard

# Initialize Terraform
terraform init

# Plan deployment
terraform plan -var="environment=production" -out=tfplan

# Apply infrastructure (ETA: 20-30 minutes)
terraform apply tfplan

# 2. Configure kubectl access
aws eks update-kubeconfig --region $AWS_REGION --name $CLUSTER_NAME

# 3. Verify cluster is ready
kubectl get nodes
kubectl get namespaces
```

### Phase 2: Kubernetes Add-ons

```bash
# 1. Install External Secrets Operator
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets-system \
  --create-namespace

# 2. Install Argo Rollouts
kubectl create namespace argo-rollouts
kubectl apply -n argo-rollouts \
  -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml

# 3. Install monitoring stack
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install security-dashboard-monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --values deployment/monitoring/prometheus-values.yaml

# 4. Install ingress controller (if using nginx)
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace
```

### Phase 3: Storage and Secrets

```bash
# 1. Deploy storage resources
kubectl apply -f deployment/k8s/security-dashboard/00-namespace.yaml
kubectl apply -f deployment/k8s/security-dashboard/03-storage.yaml

# 2. Configure secrets (ensure AWS Secrets Manager is populated first)
kubectl apply -f deployment/k8s/security-dashboard/01-secrets.yaml

# 3. Deploy configuration
kubectl apply -f deployment/k8s/security-dashboard/02-configmaps.yaml

# 4. Verify secrets are populated
kubectl get secrets -n $NAMESPACE
kubectl get configmaps -n $NAMESPACE
```

## Application Deployment

### Phase 1: Database Setup

```bash
# 1. Deploy database (if using in-cluster PostgreSQL)
kubectl apply -f deployment/k8s/security-dashboard/04-database.yaml

# 2. Wait for database to be ready
kubectl wait --for=condition=Ready pod -l app=postgresql -n $NAMESPACE --timeout=300s

# 3. Run database migrations
kubectl run db-migrate --rm -i --restart=Never \
  --image=$DOCKER_REGISTRY/security-dashboard-backend:latest \
  --env="NODE_ENV=production" \
  -- npm run migrate:latest

# 4. Seed initial data (optional)
kubectl run db-seed --rm -i --restart=Never \
  --image=$DOCKER_REGISTRY/security-dashboard-backend:latest \
  --env="NODE_ENV=production" \
  -- npm run seed:production
```

### Phase 2: Backend Services

```bash
# 1. Deploy backend API with blue-green strategy
kubectl apply -f deployment/blue-green/rollout-strategy.yaml

# 2. Wait for initial rollout
kubectl argo rollouts get rollout security-dashboard-backend -n $NAMESPACE --watch

# 3. Verify backend health
kubectl port-forward service/security-dashboard-backend-active 4000:4000 -n $NAMESPACE &
curl http://localhost:4000/health
kill %1

# 4. Deploy GraphQL gateway
kubectl argo rollouts get rollout graphql-gateway -n $NAMESPACE --watch

# 5. Verify GraphQL health
kubectl port-forward service/graphql-gateway 4000:4000 -n $NAMESPACE &
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"query { healthCheck { status } }"}'
kill %1
```

### Phase 3: Frontend and API Gateway

```bash
# 1. Deploy Kong Gateway (with HTTPS fixes)
kubectl apply -f deployment/k8s/kong-gateway/

# 2. Wait for Kong to be ready
kubectl wait --for=condition=Ready pod -l app=kong -n $NAMESPACE --timeout=300s

# 3. Deploy frontend
kubectl argo rollouts get rollout security-dashboard-frontend -n $NAMESPACE --watch

# 4. Configure ingress/load balancer
kubectl apply -f deployment/k8s/security-dashboard/ingress.yaml

# 5. Verify end-to-end connectivity
curl -k https://$(kubectl get ingress -n $NAMESPACE -o jsonpath='{.items[0].status.loadBalancer.ingress[0].hostname}')/health
```

## Multi-Platform Deployment

### Frontend (Vercel/Netlify)

```bash
# 1. Build frontend for production
cd apps/security-dashboard
pnpm install
pnpm run build

# 2. Deploy to Vercel
vercel --prod --token $VERCEL_TOKEN

# 3. Deploy to Netlify (alternative)
netlify deploy --prod --dir dist --auth $NETLIFY_AUTH_TOKEN
```

### Mobile Apps (Expo/EAS Build)

```bash
# 1. Configure mobile app
cd apps/mobile-security-dashboard
pnpm install

# 2. Update configuration for production
jq '.expo.extra.apiUrl = "https://api.security.candlefish.ai"' app.json > app.json.tmp
mv app.json.tmp app.json

# 3. Build for iOS
eas build --platform ios --profile production

# 4. Build for Android
eas build --platform android --profile production

# 5. Submit to stores (optional)
eas submit --platform all --profile production
```

### CDN and Edge Deployment

```bash
# 1. Configure CloudFront distribution (via Terraform)
terraform apply -target=aws_cloudfront_distribution.main

# 2. Deploy edge functions (if using)
aws cloudfront create-function \
  --name security-dashboard-edge \
  --function-config '{"Comment":"Security headers","Runtime":"cloudfront-js-1.0"}' \
  --function-code fileb://deployment/edge/security-headers.js
```

## Validation Procedures

### Automated Validation Script

```bash
#!/bin/bash
# Run comprehensive validation
./scripts/deployment/validate-deployment.sh --environment production --timeout 600
```

### Manual Validation Checklist

#### Infrastructure Validation

- [ ] EKS cluster is healthy and all nodes are ready
- [ ] RDS database is running and accepting connections
- [ ] Redis cluster is operational
- [ ] Load balancer is responding to health checks
- [ ] SSL certificates are valid and not expiring soon
- [ ] DNS records are correctly configured

#### Application Validation

- [ ] All pods are running and ready
- [ ] Health check endpoints return 200 OK
- [ ] Database migrations completed successfully
- [ ] GraphQL schema is loading correctly
- [ ] WebSocket connections are working
- [ ] Authentication flow works end-to-end

#### Security Validation

- [ ] HTTPS redirects are working (no HTTP traffic allowed)
- [ ] Security headers are present in responses
- [ ] Rate limiting is functional
- [ ] JWT tokens are being validated correctly
- [ ] CORS policies are properly configured
- [ ] No secrets are exposed in logs or responses

#### Performance Validation

```bash
# Load test with expected traffic
k6 run --vus 100 --duration 5m performance/load-test.js

# Verify performance metrics
kubectl port-forward service/prometheus 9090:9090 -n monitoring &
curl "http://localhost:9090/api/v1/query?query=histogram_quantile(0.95,rate(http_request_duration_seconds_bucket[5m]))"
```

### Performance Benchmarks

| Metric | Target | Measurement Method |
|--------|--------|------------------|
| Response Time (P95) | < 500ms | Prometheus histogram |
| Error Rate | < 0.1% | HTTP status codes |
| Throughput | > 1000 RPS | Request rate metrics |
| Concurrent Users | 1000+ | Load testing |
| Database Connections | < 80% of max | PostgreSQL metrics |
| Memory Usage | < 85% | Kubernetes metrics |
| CPU Usage | < 80% | Kubernetes metrics |

## Monitoring and Alerting

### Accessing Monitoring Dashboards

```bash
# Grafana
kubectl port-forward service/grafana 3000:3000 -n monitoring
# Access: http://localhost:3000 (admin/admin)

# Prometheus
kubectl port-forward service/prometheus 9090:9090 -n monitoring
# Access: http://localhost:9090

# AlertManager
kubectl port-forward service/alertmanager 9093:9093 -n monitoring
# Access: http://localhost:9093
```

### Key Dashboards

1. **Security Dashboard Overview**
   - Security event rates
   - Authentication success/failure rates
   - API response times and error rates
   - Active user sessions

2. **Infrastructure Monitoring**
   - Kubernetes cluster health
   - Pod resource usage
   - Database performance
   - Network latency

3. **Business Metrics**
   - Security incidents detected
   - Mean time to detection (MTTD)
   - Mean time to response (MTTR)
   - User engagement metrics

### Alert Severity Levels

| Severity | Response Time | Examples |
|----------|---------------|----------|
| Critical | Immediate (< 5 min) | Service down, security breach |
| High | < 30 minutes | High error rates, performance degradation |
| Medium | < 2 hours | Resource usage warnings |
| Low | Next business day | Informational alerts |

## Rollback Procedures

### Automated Rollback

```bash
# Full system rollback to previous version
./scripts/deployment/rollback-procedures.sh full-rollback

# Partial rollback of specific component
./scripts/deployment/rollback-procedures.sh partial-rollback security-dashboard-backend

# Emergency rollback (immediate)
./scripts/deployment/rollback-procedures.sh emergency-rollback
```

### Manual Rollback Steps

1. **Assessment Phase**
   ```bash
   # Check current deployment status
   ./scripts/deployment/rollback-procedures.sh status
   
   # Review recent changes
   git log --oneline -10
   kubectl argo rollouts get rollout security-dashboard-backend -n $NAMESPACE
   ```

2. **Decision Phase**
   - Identify the stable version to rollback to
   - Assess the impact of rollback on data
   - Notify stakeholders of planned rollback

3. **Execution Phase**
   ```bash
   # Create backup before rollback
   kubectl create backup security-dashboard-backup-$(date +%Y%m%d-%H%M%S) -n $NAMESPACE
   
   # Execute rollback
   kubectl argo rollouts undo rollout security-dashboard-backend -n $NAMESPACE
   
   # Monitor rollback progress
   kubectl argo rollouts get rollout security-dashboard-backend -n $NAMESPACE --watch
   ```

4. **Validation Phase**
   ```bash
   # Run post-rollback validation
   ./scripts/deployment/rollback-procedures.sh validate
   
   # Monitor system health
   ./scripts/deployment/rollback-procedures.sh monitor 300
   ```

### Database Rollback (High Risk)

⚠️ **Warning**: Database rollbacks are potentially destructive operations.

```bash
# 1. Create full database backup
kubectl exec -n $NAMESPACE statefulset/postgresql -- \
  pg_dump -U postgres security_dashboard > backup-$(date +%Y%m%d-%H%M%S).sql

# 2. Stop all application pods that write to database
kubectl scale deployment security-dashboard-backend --replicas=0 -n $NAMESPACE

# 3. Run migration rollback
kubectl run db-rollback --rm -i --restart=Never \
  --image=$DOCKER_REGISTRY/security-dashboard-backend:latest \
  -- npm run migrate:rollback -- --to=<target-version>

# 4. Restart application
kubectl scale deployment security-dashboard-backend --replicas=5 -n $NAMESPACE
```

## Troubleshooting Guide

### Common Issues and Solutions

#### Issue: Pods are in CrashLoopBackOff

**Diagnosis:**
```bash
kubectl get pods -n $NAMESPACE
kubectl describe pod <pod-name> -n $NAMESPACE
kubectl logs <pod-name> -n $NAMESPACE --previous
```

**Common Causes:**
- Configuration errors
- Missing secrets or environment variables
- Database connection failures
- Resource constraints (memory/CPU limits)

**Solutions:**
```bash
# Check resource usage
kubectl top pods -n $NAMESPACE

# Check configuration
kubectl get configmap security-dashboard-config -n $NAMESPACE -o yaml

# Check secrets
kubectl get secrets -n $NAMESPACE

# Scale down and up to force restart
kubectl scale deployment <deployment-name> --replicas=0 -n $NAMESPACE
kubectl scale deployment <deployment-name> --replicas=3 -n $NAMESPACE
```

#### Issue: High Response Times

**Diagnosis:**
```bash
# Check Prometheus metrics
kubectl port-forward service/prometheus 9090:9090 -n monitoring &
curl "http://localhost:9090/api/v1/query?query=histogram_quantile(0.95,rate(http_request_duration_seconds_bucket[5m]))"

# Check database performance
kubectl exec -n $NAMESPACE deployment/security-dashboard-backend -- \
  psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"
```

**Solutions:**
- Scale up application replicas
- Optimize database queries
- Enable query caching
- Check for memory leaks

#### Issue: Database Connection Errors

**Diagnosis:**
```bash
# Test database connectivity
kubectl exec -n $NAMESPACE deployment/security-dashboard-backend -- \
  psql $DATABASE_URL -c "SELECT 1"

# Check database logs
kubectl logs -n $NAMESPACE statefulset/postgresql

# Check connection pool
kubectl exec -n $NAMESPACE deployment/security-dashboard-backend -- \
  node -e "console.log(process.env.DATABASE_URL)"
```

**Solutions:**
- Verify database credentials in secrets
- Check network policies
- Restart database pod if necessary
- Scale database resources

#### Issue: SSL/TLS Certificate Problems

**Diagnosis:**
```bash
# Check certificate status
kubectl get certificates -n $NAMESPACE
kubectl describe certificate <cert-name> -n $NAMESPACE

# Test SSL endpoint
echo | openssl s_client -connect <domain>:443 -servername <domain>
```

**Solutions:**
```bash
# Delete and recreate certificate
kubectl delete certificate <cert-name> -n $NAMESPACE
kubectl apply -f deployment/k8s/security-dashboard/ssl-certificates.yaml

# Check cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager
```

### Performance Troubleshooting

#### High Memory Usage

```bash
# Identify memory-hungry pods
kubectl top pods -n $NAMESPACE --sort-by=memory

# Check memory limits
kubectl describe pod <pod-name> -n $NAMESPACE | grep -A 5 "Limits"

# Analyze memory usage patterns
kubectl exec -n $NAMESPACE <pod-name> -- cat /proc/meminfo
```

#### High CPU Usage

```bash
# Identify CPU-intensive pods
kubectl top pods -n $NAMESPACE --sort-by=cpu

# Check for CPU throttling
kubectl exec -n $NAMESPACE <pod-name> -- cat /sys/fs/cgroup/cpu/cpu.stat
```

#### Database Performance Issues

```bash
# Check slow queries
kubectl exec -n $NAMESPACE statefulset/postgresql -- \
  psql -U postgres -d security_dashboard -c "
    SELECT query, calls, total_time, mean_time 
    FROM pg_stat_statements 
    ORDER BY total_time DESC 
    LIMIT 10;"

# Check connection pool
kubectl exec -n $NAMESPACE deployment/security-dashboard-backend -- \
  node -e "
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    console.log('Pool stats:', pool.totalCount, pool.idleCount);
  "
```

## Security Hardening

### Production Security Checklist

#### Network Security
- [ ] All communication encrypted with TLS 1.2+
- [ ] Network policies implemented to restrict pod-to-pod communication
- [ ] Ingress controller configured with security headers
- [ ] DDoS protection enabled (CloudFlare/AWS Shield)
- [ ] Rate limiting configured on API endpoints

#### Container Security
- [ ] Containers run as non-root users
- [ ] Read-only root filesystems where possible
- [ ] Security contexts properly configured
- [ ] Container images scanned for vulnerabilities
- [ ] Resource limits and requests configured

#### Authentication & Authorization
- [ ] JWT tokens use strong cryptographic algorithms (RS256)
- [ ] Token expiration times are appropriate
- [ ] Multi-factor authentication enabled for admin accounts
- [ ] Role-based access control (RBAC) implemented
- [ ] Service accounts follow principle of least privilege

#### Secrets Management
- [ ] No hardcoded secrets in code or containers
- [ ] AWS Secrets Manager used for sensitive data
- [ ] Secret rotation configured
- [ ] Access to secrets is audited and logged

#### Monitoring & Logging
- [ ] All security events logged
- [ ] Log aggregation configured
- [ ] Anomaly detection implemented
- [ ] Security alerts configured
- [ ] Audit trails maintained

### Security Monitoring Queries

```bash
# Failed authentication attempts
curl -s http://prometheus:9090/api/v1/query?query='rate(authentication_failures_total[5m])'

# Unusual traffic patterns
curl -s http://prometheus:9090/api/v1/query?query='rate(http_requests_total[5m]) > 2 * rate(http_requests_total[1h] offset 1h)'

# High error rates
curl -s http://prometheus:9090/api/v1/query?query='rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])'
```

## Performance Optimization

### Database Optimization

```sql
-- Create indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_timestamp 
ON security_events (created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_severity 
ON security_events (severity, created_at);

-- Enable query optimization
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET pg_stat_statements.track = 'all';

-- Configure connection pooling
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
```

### Application Performance

```yaml
# HPA configuration for auto-scaling
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: security-dashboard-backend-hpa
  namespace: security-dashboard
spec:
  scaleTargetRef:
    apiVersion: argoproj.io/v1alpha1
    kind: Rollout
    name: security-dashboard-backend
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### CDN and Caching

```bash
# Configure CloudFront caching
aws cloudfront create-distribution --distribution-config '{
  "CallerReference": "security-dashboard-cdn",
  "DefaultCacheBehavior": {
    "TargetOriginId": "security-dashboard-origin",
    "ViewerProtocolPolicy": "redirect-to-https",
    "CachePolicyId": "managed-caching-optimized"
  },
  "Origins": {
    "Quantity": 1,
    "Items": [{
      "Id": "security-dashboard-origin",
      "DomainName": "api.security.candlefish.ai",
      "CustomOriginConfig": {
        "HTTPPort": 443,
        "OriginProtocolPolicy": "https-only"
      }
    }]
  },
  "Enabled": true
}'
```

## Maintenance Procedures

### Regular Maintenance Tasks

#### Daily Tasks
- [ ] Check system health dashboards
- [ ] Review security alerts
- [ ] Monitor resource usage
- [ ] Verify backup completion

#### Weekly Tasks
- [ ] Review performance metrics
- [ ] Update dependency security scans
- [ ] Check certificate expiration dates
- [ ] Review error logs

#### Monthly Tasks
- [ ] Update dependencies
- [ ] Rotate secrets
- [ ] Performance optimization review
- [ ] Security audit
- [ ] Disaster recovery test

### Backup Procedures

```bash
# Database backup
kubectl create cronjob database-backup --image=postgres:15-alpine \
  --schedule="0 2 * * *" \
  -- /bin/sh -c "pg_dump \$DATABASE_URL > /backup/db-$(date +\%Y\%m\%d).sql"

# Configuration backup
kubectl get all,configmaps,secrets,pvc -n $NAMESPACE -o yaml > \
  config-backup-$(date +%Y%m%d).yaml

# Application backup
docker save $DOCKER_REGISTRY/security-dashboard-backend:latest | \
  gzip > security-dashboard-backup-$(date +%Y%m%d).tar.gz
```

### Update Procedures

#### Security Updates

```bash
# 1. Check for security vulnerabilities
npm audit --audit-level moderate
trivy image $DOCKER_REGISTRY/security-dashboard-backend:latest

# 2. Update dependencies
pnpm update
npm audit fix

# 3. Rebuild and test
docker build -t security-dashboard-backend:latest .
./scripts/run-tests.sh

# 4. Deploy with rolling update
kubectl set image deployment/security-dashboard-backend \
  backend=$DOCKER_REGISTRY/security-dashboard-backend:latest \
  -n $NAMESPACE
```

#### System Updates

```bash
# 1. Update Kubernetes cluster
aws eks update-cluster-version --name $CLUSTER_NAME --version 1.28

# 2. Update node groups
aws eks update-nodegroup-version --cluster-name $CLUSTER_NAME \
  --nodegroup-name security-dashboard-nodes

# 3. Update monitoring stack
helm upgrade security-dashboard-monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --values deployment/monitoring/prometheus-values.yaml
```

## Emergency Response

### Security Incident Response

#### Phase 1: Detection and Analysis (0-30 minutes)

```bash
# 1. Acknowledge the alert
curl -X POST "$PAGERDUTY_API/incidents/$INCIDENT_ID/acknowledge"

# 2. Gather initial information
kubectl get events -n $NAMESPACE --sort-by='.lastTimestamp'
kubectl logs -n $NAMESPACE -l app=security-dashboard --tail=100

# 3. Check security metrics
curl -s http://prometheus:9090/api/v1/query?query='rate(authentication_failures_total[5m])'
curl -s http://prometheus:9090/api/v1/query?query='rate(api_requests_total{status=~"401|403"}[5m])'
```

#### Phase 2: Containment (30-60 minutes)

```bash
# 1. Enable enhanced monitoring
kubectl patch deployment security-dashboard-backend -n $NAMESPACE \
  -p '{"spec":{"template":{"metadata":{"annotations":{"debug":"enabled"}}}}}'

# 2. Block suspicious IPs (if identified)
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: block-suspicious-ips
  namespace: $NAMESPACE
spec:
  podSelector:
    matchLabels:
      app: security-dashboard
  policyTypes:
  - Ingress
  ingress:
  - from:
    - ipBlock:
        cidr: 0.0.0.0/0
        except:
        - <suspicious-ip>/32
EOF

# 3. Scale up for increased capacity if needed
kubectl scale deployment security-dashboard-backend --replicas=10 -n $NAMESPACE
```

#### Phase 3: Eradication and Recovery (1-4 hours)

```bash
# 1. Deploy security patches
./scripts/deployment/emergency-deploy.sh --security-patch

# 2. Reset compromised credentials
kubectl delete secret api-secrets -n $NAMESPACE
kubectl apply -f deployment/k8s/security-dashboard/01-secrets.yaml

# 3. Full system restart if necessary
./scripts/deployment/rollback-procedures.sh emergency-rollback
```

### System Outage Response

#### Complete System Failure

```bash
# 1. Switch to disaster recovery mode
kubectl apply -f deployment/disaster-recovery/maintenance-page.yaml

# 2. Check infrastructure status
terraform plan -refresh-only
aws eks describe-cluster --name $CLUSTER_NAME

# 3. Emergency restoration
./scripts/deployment/emergency-restore.sh --from-backup latest
```

#### Partial Service Degradation

```bash
# 1. Identify affected components
kubectl get pods -n $NAMESPACE | grep -v Running

# 2. Quick restart of affected services
kubectl delete pod -l app=<affected-component> -n $NAMESPACE

# 3. Monitor recovery
kubectl get pods -n $NAMESPACE --watch
```

### Communication Templates

#### Initial Incident Notification

```
Subject: [INCIDENT] Security Dashboard - Service Impact

Status: INVESTIGATING
Impact: [High/Medium/Low]
Services Affected: [List affected services]
Start Time: [Timestamp]

We are investigating reports of [brief description]. 
Updates will be provided every 30 minutes.

Next Update: [Timestamp + 30 minutes]
Status Page: https://status.candlefish.ai
```

#### Resolution Notification

```
Subject: [RESOLVED] Security Dashboard - Service Restored

Status: RESOLVED
Impact: [High/Medium/Low]
Duration: [Total duration]
Root Cause: [Brief explanation]

The incident has been resolved and all services are operational.

Post-mortem will be available within 48 hours at:
https://docs.candlefish.ai/incidents/[incident-id]
```

## Appendices

### Appendix A: Architecture Diagrams

```mermaid
graph TB
    A[Load Balancer] --> B[Kong Gateway]
    B --> C[GraphQL Gateway]
    B --> D[Backend API]
    C --> D
    D --> E[PostgreSQL]
    D --> F[Redis]
    
    G[Frontend] --> A
    H[Mobile App] --> A
    
    I[Monitoring] --> D
    I --> E
    I --> F
```

### Appendix B: Port Reference

| Service | Port | Protocol | Purpose |
|---------|------|----------|---------|
| Backend API | 4000 | HTTP | Main API endpoint |
| GraphQL Gateway | 4000 | HTTP | GraphQL endpoint |
| Frontend | 8080 | HTTP | Web interface |
| PostgreSQL | 5432 | TCP | Database |
| Redis | 6379 | TCP | Cache |
| Prometheus | 9090 | HTTP | Metrics |
| Grafana | 3000 | HTTP | Dashboards |
| Kong Admin | 8001 | HTTP | Kong management |
| Kong Proxy | 8000/8443 | HTTP/HTTPS | API gateway |

### Appendix C: Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| NODE_ENV | Environment name | production |
| DATABASE_URL | PostgreSQL connection | postgresql://user:pass@host:5432/db |
| REDIS_URL | Redis connection | redis://host:6379 |
| JWT_SECRET | JWT signing key | base64-encoded-secret |
| LOG_LEVEL | Logging level | info |
| METRICS_PORT | Metrics endpoint port | 9090 |

### Appendix D: Useful Commands Reference

```bash
# Quick status check
kubectl get all -n security-dashboard

# Log aggregation
kubectl logs -n security-dashboard -l app=security-dashboard --tail=100 -f

# Resource usage
kubectl top pods -n security-dashboard --sort-by=memory

# Port forwarding for debugging
kubectl port-forward service/security-dashboard-backend 4000:4000 -n security-dashboard

# Emergency scale down
kubectl scale deployment --all --replicas=0 -n security-dashboard

# Emergency scale up
kubectl scale deployment --all --replicas=3 -n security-dashboard
```

---

**Document Version**: 1.0  
**Last Updated**: August 26, 2025  
**Next Review Date**: November 26, 2025  
**Owner**: Security Team (security-team@candlefish.ai)  
**Reviewers**: Platform Team, DevOps Team
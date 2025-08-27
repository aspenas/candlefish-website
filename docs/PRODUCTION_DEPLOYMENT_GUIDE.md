# Security Dashboard - Production Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the Security Dashboard to production environments with enterprise-grade reliability, security, and performance.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Infrastructure Setup](#infrastructure-setup)
3. [Deployment Strategies](#deployment-strategies)
4. [Monitoring & Alerting](#monitoring--alerting)
5. [Security Configuration](#security-configuration)
6. [Performance Optimization](#performance-optimization)
7. [Rollback Procedures](#rollback-procedures)
8. [Troubleshooting](#troubleshooting)
9. [Maintenance](#maintenance)

## Prerequisites

### Required Tools

- **kubectl** v1.28+ - Kubernetes CLI
- **helm** v3.13+ - Kubernetes package manager
- **aws-cli** v2.0+ - AWS command line interface
- **terraform** v1.6+ - Infrastructure as code
- **docker** v24.0+ - Container runtime
- **jq** - JSON processor
- **k6** - Load testing tool

### AWS Resources

- **EKS Cluster**: `security-dashboard-eks` in `us-east-1`
- **RDS Instance**: PostgreSQL 16 with Multi-AZ
- **ElastiCache**: Redis 7.0 cluster
- **ECR Repository**: Container image registry
- **ALB**: Application Load Balancer
- **WAF**: Web Application Firewall
- **CloudWatch**: Logging and monitoring
- **Secrets Manager**: Secure credential storage

### Access Requirements

```bash
# Verify AWS access
aws sts get-caller-identity

# Update kubeconfig
aws eks update-kubeconfig --region us-east-1 --name security-dashboard-eks

# Verify cluster access
kubectl cluster-info
kubectl get nodes
```

## Infrastructure Setup

### 1. Terraform Infrastructure Deployment

```bash
# Navigate to terraform directory
cd deployment/terraform/security-dashboard

# Initialize terraform
terraform init -backend-config="bucket=candlefish-terraform-state-681214184463" \
                -backend-config="key=security-dashboard/production/terraform.tfstate" \
                -backend-config="region=us-east-1" \
                -backend-config="encrypt=true"

# Plan deployment
terraform plan -var="environment=production" \
               -var="cluster_name=security-dashboard-eks" \
               -var="aws_region=us-east-1" \
               -out=tfplan

# Apply infrastructure
terraform apply tfplan
```

### 2. Kubernetes Namespace Setup

```bash
# Create namespace
kubectl create namespace security-dashboard

# Apply RBAC configuration
kubectl apply -f deployment/k8s/security-dashboard/00-namespace.yaml

# Apply network policies
kubectl apply -f deployment/k8s/security-dashboard/08-network-policies.yaml
```

### 3. Secrets Configuration

```bash
# Create secrets from AWS Secrets Manager
envsubst < deployment/k8s/security-dashboard/01-secrets.yaml | kubectl apply -f -

# Verify secrets
kubectl get secrets -n security-dashboard
```

## Deployment Strategies

### Blue-Green Deployment (Recommended for Production)

```bash
# Deploy using GitHub Actions workflow
gh workflow run security-dashboard-production-deploy.yml \
  --ref production \
  -f deployment_type=blue-green \
  -f target_environment=production

# Monitor deployment progress
gh run list --workflow=security-dashboard-production-deploy.yml
gh run watch
```

#### Manual Blue-Green Deployment

```bash
# Update image tag in rollout configuration
sed -i "s|{{IMAGE_TAG}}|v1.2.3|g" deployment/blue-green/enhanced-rollout-strategy.yaml

# Apply rollout
kubectl apply -f deployment/blue-green/enhanced-rollout-strategy.yaml

# Monitor rollout status
kubectl argo rollouts get rollout security-dashboard-backend -n security-dashboard --watch

# Promote after validation
kubectl argo rollouts promote security-dashboard-backend -n security-dashboard
```

### Canary Deployment

```bash
# Use the canary deployment script
chmod +x scripts/deployment/canary-deploy.sh
./scripts/deployment/canary-deploy.sh backend v1.2.3

# Monitor canary metrics
watch -n 5 'kubectl argo rollouts get rollout security-dashboard-backend -n security-dashboard'
```

#### Canary Stages

1. **5% Traffic** - Initial canary validation (5 minutes)
2. **15% Traffic** - Extended validation (5 minutes)
3. **50% Traffic** - Load testing (10 minutes)
4. **100% Traffic** - Full promotion (5 minutes)

## Monitoring & Alerting

### 1. Prometheus Stack Installation

```bash
# Add Helm repositories
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Deploy monitoring stack
helm upgrade --install prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --values deployment/monitoring/prometheus-values.yaml \
  --wait --timeout 600s
```

### 2. Grafana Dashboard Setup

```bash
# Import production dashboards
kubectl create configmap grafana-dashboards-security \
  --from-file=deployment/monitoring/production-dashboards.json \
  --namespace monitoring

# Get Grafana admin password
kubectl get secret prometheus-stack-grafana -n monitoring \
  -o jsonpath="{.data.admin-password}" | base64 -d

# Port forward to access Grafana
kubectl port-forward svc/prometheus-stack-grafana 3000:80 -n monitoring
```

### 3. AlertManager Configuration

```bash
# Apply custom alerting rules
kubectl apply -f deployment/monitoring/security-dashboard-alerts.yaml

# Configure PagerDuty integration
kubectl create secret generic pagerduty-config \
  --from-literal=routing_key="YOUR_PAGERDUTY_KEY" \
  --namespace monitoring
```

## Security Configuration

### 1. Network Policies

```bash
# Apply network security policies
kubectl apply -f deployment/k8s/security-dashboard/08-network-policies.yaml

# Verify policies
kubectl get networkpolicies -n security-dashboard
```

### 2. Pod Security Standards

```bash
# Apply pod security policies
kubectl label namespace security-dashboard \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/audit=restricted \
  pod-security.kubernetes.io/warn=restricted
```

### 3. RBAC Configuration

```bash
# Create service accounts and roles
kubectl apply -f - <<EOF
apiVersion: v1
kind: ServiceAccount
metadata:
  name: security-dashboard-backend
  namespace: security-dashboard
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: security-dashboard-backend
  namespace: security-dashboard
rules:
- apiGroups: [""]
  resources: ["configmaps", "secrets"]
  verbs: ["get", "list"]
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]
EOF
```

### 4. Image Security

```bash
# Scan container images with Trivy
trivy image 681214184463.dkr.ecr.us-east-1.amazonaws.com/security-dashboard-backend:latest

# Sign images with Cosign (production only)
if [ "$ENVIRONMENT" = "production" ]; then
  cosign sign --yes 681214184463.dkr.ecr.us-east-1.amazonaws.com/security-dashboard-backend:latest
fi
```

## Performance Optimization

### 1. Resource Allocation

```yaml
# Recommended production resource limits
resources:
  requests:
    memory: "512Mi"
    cpu: "250m"
    ephemeral-storage: "1Gi"
  limits:
    memory: "1Gi"
    cpu: "500m"
    ephemeral-storage: "2Gi"
```

### 2. Horizontal Pod Autoscaler

```bash
# Create HPA for backend
kubectl apply -f - <<EOF
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
EOF
```

### 3. Performance Testing

```bash
# Run production load test
cd __tests__/performance/k6
k6 run security-dashboard-production-load-test.js \
  --env BASE_URL=https://security.candlefish.ai \
  --env ENVIRONMENT=production \
  --out json=load-test-results.json

# Analyze results
jq '.metrics.http_req_duration.values' load-test-results.json
```

## Rollback Procedures

### 1. Automated Rollback

```bash
# Full system rollback
scripts/deployment/rollback-procedures.sh full-rollback

# Component-specific rollback
scripts/deployment/rollback-procedures.sh partial-rollback security-dashboard-backend

# Emergency rollback
scripts/deployment/rollback-procedures.sh emergency-rollback
```

### 2. Manual Rollback Steps

```bash
# Abort current rollout
kubectl argo rollouts abort rollout security-dashboard-backend -n security-dashboard

# Rollback to previous revision
kubectl argo rollouts undo rollout security-dashboard-backend -n security-dashboard

# Wait for rollback completion
kubectl argo rollouts status rollout security-dashboard-backend -n security-dashboard --timeout 600s
```

### 3. Database Rollback (Caution Required)

```bash
# Create backup before rollback
scripts/deployment/rollback-procedures.sh database-rollback v1.1.0
```

## Troubleshooting

### Common Issues

#### 1. Pod Startup Issues

```bash
# Check pod status
kubectl get pods -n security-dashboard -o wide

# Describe problematic pod
kubectl describe pod <pod-name> -n security-dashboard

# Check logs
kubectl logs <pod-name> -n security-dashboard --previous
```

#### 2. Service Connectivity Issues

```bash
# Test service endpoints
kubectl run debug --rm -i --restart=Never --image=nicolaka/netshoot -- \
  curl -v http://security-dashboard-backend.security-dashboard.svc.cluster.local:4000/health

# Check service configuration
kubectl get svc -n security-dashboard
kubectl describe svc security-dashboard-backend -n security-dashboard
```

#### 3. Performance Issues

```bash
# Check resource usage
kubectl top pods -n security-dashboard
kubectl top nodes

# Analyze metrics in Prometheus
# Query: rate(http_requests_total[5m])
# Query: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

#### 4. Database Connectivity

```bash
# Test database connection
kubectl exec -it deployment/security-dashboard-backend -n security-dashboard -- \
  psql $DATABASE_URL -c "SELECT version();"

# Check database metrics
kubectl exec -it deployment/security-dashboard-backend -n security-dashboard -- \
  npm run db:check
```

### Emergency Contacts

- **On-Call Engineer**: PagerDuty escalation
- **Platform Team**: Slack `#platform-alerts`
- **Security Team**: Slack `#security-incidents`

### Escalation Procedures

1. **P0 (Critical)**: Immediate PagerDuty alert, all hands
2. **P1 (High)**: PagerDuty within 15 minutes
3. **P2 (Medium)**: Slack notification, next business day
4. **P3 (Low)**: Create ticket, weekly review

## Maintenance

### Regular Tasks

#### Daily
- Monitor Grafana dashboards
- Review error logs
- Check resource utilization
- Validate backup completion

#### Weekly
- Security vulnerability scans
- Performance trend analysis
- Certificate expiration check
- Database maintenance

#### Monthly
- Load testing execution
- Disaster recovery testing
- Security audit review
- Capacity planning review

### Scheduled Maintenance

```bash
# Schedule maintenance window
# 1. Scale down to minimum replicas
kubectl scale deployment security-dashboard-backend --replicas=1 -n security-dashboard

# 2. Apply maintenance (updates, patches)
# ... maintenance tasks ...

# 3. Scale back to normal
kubectl scale deployment security-dashboard-backend --replicas=6 -n security-dashboard

# 4. Validate health
scripts/deployment/rollback-procedures.sh validate
```

### Backup Procedures

```bash
# Database backup
kubectl run db-backup --rm -i --restart=Never \
  --image=postgres:15-alpine \
  --env="PGPASSWORD=$DB_PASSWORD" \
  -- pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > backup-$(date +%Y%m%d).sql

# Configuration backup
kubectl get all,configmaps,secrets,pvc -n security-dashboard -o yaml > \
  config-backup-$(date +%Y%m%d).yaml
```

## Performance Benchmarks

### Expected Metrics (Production SLA)

| Metric | Target | Critical Threshold |
|--------|--------|-----------------|
| Response Time (P95) | < 500ms | > 1000ms |
| Response Time (P99) | < 1000ms | > 2000ms |
| Error Rate | < 0.1% | > 1% |
| Availability | 99.9% | < 99.5% |
| Throughput | 1000+ RPS | < 500 RPS |
| Memory Usage | < 80% | > 90% |
| CPU Usage | < 70% | > 85% |
| Database Connections | < 80 | > 100 |

### Load Testing Results

```bash
# Baseline performance test (500 users)
k6 run __tests__/performance/k6/security-dashboard-production-load-test.js \
  --vus 500 --duration 10m

# Stress test (1000+ users)
k6 run __tests__/performance/k6/security-dashboard-stress-test.js
```

## Security Compliance

### SOC2 Type II Requirements

- [x] Encryption in transit (TLS 1.3)
- [x] Encryption at rest (AWS KMS)
- [x] Access logging (CloudTrail, K8s audit)
- [x] Multi-factor authentication
- [x] Network segmentation
- [x] Vulnerability scanning
- [x] Incident response procedures

### Compliance Verification

```bash
# Run compliance scan
kubectl run compliance-scan --rm -i --restart=Never \
  --image=aquasec/kube-bench:latest -- \
  --version 1.20

# Security policy validation
open-policy-agent/conftest verify --policy security-policies/ \
  deployment/k8s/security-dashboard/
```

---

## Quick Reference

### Essential Commands

```bash
# Deployment status
kubectl argo rollouts get rollout security-dashboard-backend -n security-dashboard

# Health check
curl -f https://security.candlefish.ai/api/health

# Logs
kubectl logs -l app=security-dashboard-backend -n security-dashboard -f

# Metrics
kubectl port-forward svc/prometheus-stack-prometheus 9090:9090 -n monitoring

# Emergency rollback
scripts/deployment/rollback-procedures.sh emergency-rollback
```

### Important URLs

- **Application**: https://security.candlefish.ai
- **Grafana**: https://grafana.security.candlefish.ai
- **Prometheus**: https://prometheus.security.candlefish.ai
- **Kubernetes Dashboard**: https://k8s.candlefish.ai
- **GitHub Repository**: https://github.com/candlefish-ai/security-dashboard

---

*This deployment guide is maintained by the Platform Engineering team. Last updated: $(date +'%Y-%m-%d')*

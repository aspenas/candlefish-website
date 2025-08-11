# Candlefish AI - Deployment Runbook

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Deployment Process](#deployment-process)
4. [Environment Management](#environment-management)
5. [Monitoring and Alerting](#monitoring-and-alerting)
6. [Troubleshooting](#troubleshooting)
7. [Rollback Procedures](#rollback-procedures)
8. [Cost Optimization](#cost-optimization)
9. [Security Considerations](#security-considerations)
10. [Emergency Procedures](#emergency-procedures)

## Overview

This runbook provides comprehensive instructions for deploying and managing the Candlefish AI platform across development, staging, and production environments.

### Architecture Summary

- **Infrastructure**: AWS EKS with Terraform IaC
- **Container Orchestration**: Kubernetes with Helm charts
- **CI/CD**: GitHub Actions with multi-stage pipelines
- **Monitoring**: Prometheus + Grafana stack
- **Security**: Container scanning, network policies, RBAC

### Service Components

| Service | Description | Port | Health Check |
|---------|-------------|------|--------------|
| Website Frontend | Next.js application | 3000 | `/api/health` |
| Backend API | FastAPI service | 8000 | `/health` |
| Analytics Dashboard | React dashboard | 80 | `/health` |
| Paintbox Service | PDF generation | 3000 | `/api/health` |
| Brand Portal | Static site | 80 | `/health` |
| API Gateway | Traffic routing | 8080 | `/health` |

## Prerequisites

### Required Tools

```bash
# Install required tools (macOS)
brew install kubectl helm terraform aws-cli docker

# Or using package managers on other systems
# Ubuntu: apt-get install kubectl helm terraform awscli docker.io
# Windows: choco install kubernetes-helm terraform awscli docker-desktop
```

### Access Requirements

1. **AWS Access**: IAM user with EKS, RDS, ElastiCache permissions
2. **GitHub Access**: Repository access and secrets management
3. **Docker Registry**: GHCR access for container images
4. **Kubernetes**: EKS cluster access via kubeconfig

### Environment Setup

```bash
# Configure AWS CLI
aws configure

# Update kubeconfig for target environment
aws eks update-kubeconfig --region us-west-2 --name candlefish-{environment}

# Verify access
kubectl cluster-info
helm version
terraform version
```

## Deployment Process

### 1. Infrastructure Deployment (Terraform)

```bash
# Navigate to infrastructure directory
cd infrastructure/terraform

# Initialize Terraform
terraform init

# Plan deployment
terraform plan -var="environment=production" -out=tfplan

# Apply changes
terraform apply tfplan
```

### 2. Application Deployment (Helm)

```bash
# Use the unified deployment script
./deployment/scripts/deploy.sh -e production

# Or deploy manually with Helm
helm upgrade --install candlefish-prod deployment/helm/candlefish \
  --namespace candlefish-prod \
  --values deployment/helm/candlefish/values-prod.yaml \
  --timeout 15m \
  --wait
```

### 3. Verification Steps

```bash
# Check deployment status
kubectl get pods -n candlefish-prod
kubectl get services -n candlefish-prod
kubectl get ingress -n candlefish-prod

# Run health checks
kubectl exec -n candlefish-prod deployment/website -- curl -f http://localhost:3000/api/health
kubectl exec -n candlefish-prod deployment/backend-api -- curl -f http://localhost:8000/health

# Check application endpoints
curl -f https://candlefish.ai/health
curl -f https://api.candlefish.ai/health
```

## Environment Management

### Development Environment

- **Purpose**: Feature development and testing
- **Cost**: ~$200-400/month
- **Characteristics**: Single replicas, spot instances, minimal monitoring

```bash
# Deploy to development
./deployment/scripts/deploy.sh -e development

# Connect to dev database
kubectl port-forward -n candlefish-dev svc/candlefish-postgresql 5432:5432
```

### Staging Environment

- **Purpose**: Pre-production validation
- **Cost**: ~$400-600/month
- **Characteristics**: Production-like, blue-green deployments

```bash
# Deploy to staging with blue-green
./deployment/scripts/deploy.sh -e staging

# Test staging endpoints
curl -f https://staging.candlefish.ai/health
```

### Production Environment

- **Purpose**: Live application serving users
- **Cost**: ~$800-1500/month
- **Characteristics**: High availability, autoscaling, comprehensive monitoring

```bash
# Deploy to production with canary
./deployment/scripts/deploy.sh -e production

# Monitor production deployment
kubectl get pods -n candlefish-prod -w
```

## Monitoring and Alerting

### Prometheus Metrics

Access Prometheus at: `https://prometheus.candlefish.ai`

Key metrics to monitor:
- `up{job=~"candlefish-.*"}` - Service availability
- `http_requests_total` - Request rates
- `http_request_duration_seconds` - Response times
- `container_cpu_usage_seconds_total` - CPU utilization
- `container_memory_usage_bytes` - Memory usage

### Grafana Dashboards

Access Grafana at: `https://grafana.candlefish.ai`

Default dashboards:
- **System Overview**: Service health and key metrics
- **Cost Optimization**: Resource utilization and cost tracking
- **Business Metrics**: User activity and conversion funnel

### Alerting Rules

Critical alerts:
- Service down for >5 minutes
- Error rate >10% for >5 minutes
- Response time >2s (95th percentile) for >10 minutes
- Database connection failures
- High resource utilization (>90% CPU/Memory)

### Log Aggregation

```bash
# View application logs
kubectl logs -n candlefish-prod -l app=website --tail=100 -f
kubectl logs -n candlefish-prod -l app=backend-api --tail=100 -f

# Search logs with kubectl
kubectl logs -n candlefish-prod -l app=backend-api | grep ERROR

# Access centralized logging (if configured)
# CloudWatch: AWS Console > CloudWatch > Log Groups > /candlefish/production/application
```

## Troubleshooting

### Common Issues

#### 1. Pod Startup Failures

```bash
# Check pod status
kubectl get pods -n candlefish-prod

# Describe problematic pod
kubectl describe pod <pod-name> -n candlefish-prod

# Check logs
kubectl logs <pod-name> -n candlefish-prod --previous

# Common fixes:
# - Check resource limits
# - Verify secrets are available
# - Check image pull permissions
```

#### 2. Database Connection Issues

```bash
# Test database connectivity
kubectl exec -n candlefish-prod deployment/backend-api -- \
  python -c "import psycopg2; conn = psycopg2.connect('postgresql://user:pass@host:5432/db')"

# Check database pod
kubectl get pods -n candlefish-prod -l app=postgresql
kubectl logs -n candlefish-prod -l app=postgresql

# Verify secrets
kubectl get secret candlefish-database-secret -n candlefish-prod -o yaml
```

#### 3. Ingress/Load Balancer Issues

```bash
# Check ingress status
kubectl get ingress -n candlefish-prod
kubectl describe ingress candlefish-ingress -n candlefish-prod

# Check AWS Load Balancer
aws elbv2 describe-load-balancers --region us-west-2

# Test internal connectivity
kubectl exec -n candlefish-prod deployment/website -- curl -f http://backend-api:8000/health
```

#### 4. High Resource Usage

```bash
# Check resource usage
kubectl top pods -n candlefish-prod
kubectl top nodes

# Check HPA status
kubectl get hpa -n candlefish-prod

# Scale manually if needed
kubectl scale deployment website -n candlefish-prod --replicas=5
```

### Debug Commands

```bash
# Get cluster information
kubectl cluster-info dump > cluster-dump.yaml

# Check node status
kubectl get nodes -o wide
kubectl describe node <node-name>

# Check system pods
kubectl get pods -n kube-system

# Network debugging
kubectl exec -n candlefish-prod deployment/website -- nslookup backend-api
kubectl exec -n candlefish-prod deployment/website -- netstat -an
```

## Rollback Procedures

### Automatic Rollback

The deployment script includes automatic rollback on failure:

```bash
# Rollback using deployment script
./deployment/scripts/deploy.sh -e production -r
```

### Manual Rollback

#### Helm Rollback

```bash
# Check deployment history
helm history candlefish-prod -n candlefish-prod

# Rollback to previous version
helm rollback candlefish-prod -n candlefish-prod

# Rollback to specific revision
helm rollback candlefish-prod 3 -n candlefish-prod
```

#### Kubernetes Rollback

```bash
# Check rollout history
kubectl rollout history deployment/website -n candlefish-prod

# Rollback deployment
kubectl rollout undo deployment/website -n candlefish-prod

# Rollback to specific revision
kubectl rollout undo deployment/website -n candlefish-prod --to-revision=2
```

### Emergency Rollback

For critical production issues:

```bash
#!/bin/bash
# Emergency rollback script

NAMESPACE="candlefish-prod"
DEPLOYMENTS=("website" "backend-api" "paintbox-service")

echo "EMERGENCY ROLLBACK INITIATED"

for deployment in "${DEPLOYMENTS[@]}"; do
    echo "Rolling back $deployment..."
    kubectl rollout undo deployment/$deployment -n $NAMESPACE
    kubectl rollout status deployment/$deployment -n $NAMESPACE --timeout=300s
done

echo "Emergency rollback completed"
```

## Cost Optimization

### Current Cost Breakdown (Production)

| Component | Monthly Cost | Optimization Notes |
|-----------|--------------|-------------------|
| EKS Cluster | $75 | Fixed cost |
| EC2 Instances | $400-800 | Use spot instances for dev/staging |
| RDS PostgreSQL | $200-400 | Right-size instances |
| ElastiCache Redis | $100-200 | Consider cluster mode |
| Load Balancer | $25 | Share across services |
| Data Transfer | $50-150 | Use CloudFront CDN |
| Storage | $50-200 | Lifecycle policies |
| **Total** | **$900-1850** | Target: $800-1200 |

### Cost Optimization Strategies

#### 1. Resource Right-Sizing

```bash
# Check resource utilization
kubectl top pods -n candlefish-prod --sort-by=cpu
kubectl top pods -n candlefish-prod --sort-by=memory

# Adjust resource requests/limits based on actual usage
# Update values-prod.yaml and redeploy
```

#### 2. Horizontal Pod Autoscaling

```bash
# Check HPA status
kubectl get hpa -n candlefish-prod

# Adjust HPA settings for better cost/performance balance
# Target 70% CPU utilization instead of 50%
```

#### 3. Spot Instances for Non-Production

```bash
# Use spot instances for development
terraform apply -var="use_spot_instances=true" -var="environment=development"
```

#### 4. Scheduled Scaling

```bash
# Scale down non-production environments during off-hours
# Add to cron job:
# 0 18 * * 1-5 kubectl scale deployment --all --replicas=0 -n candlefish-dev
# 0 8 * * 1-5 kubectl scale deployment --all --replicas=1 -n candlefish-dev
```

### Cost Monitoring

```bash
# Check AWS costs
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=DIMENSION,Key=SERVICE

# Monitor resource usage trends in Grafana
# Dashboard: "Candlefish AI - Cost Optimization"
```

## Security Considerations

### Security Checklist

- [ ] Container images scanned for vulnerabilities
- [ ] Network policies implemented
- [ ] RBAC configured with least privilege
- [ ] Secrets managed via AWS Secrets Manager
- [ ] TLS encryption for all communication
- [ ] WAF configured for web applications
- [ ] Regular security updates applied

### Security Scanning

```bash
# Scan container images
trivy image ghcr.io/candlefish-ai/website-frontend:latest
trivy image ghcr.io/candlefish-ai/backend-api:latest

# Scan Kubernetes configurations
kube-score score deployment/helm/candlefish/templates/*.yaml

# Check for security misconfigurations
kubectl get pods -n candlefish-prod -o yaml | kube-score score -
```

### Certificate Management

```bash
# Check certificate expiration
kubectl get certificates -n candlefish-prod
kubectl describe certificate candlefish-tls -n candlefish-prod

# Renew certificates (if using cert-manager)
kubectl delete certificate candlefish-tls -n candlefish-prod
# Certificate will be automatically recreated
```

### Security Updates

```bash
# Update base images regularly
docker pull node:20-alpine
docker pull python:3.12-slim
docker pull nginx:1.25-alpine

# Rebuild and push images with updated bases
docker build -t ghcr.io/candlefish-ai/website-frontend:latest .
docker push ghcr.io/candlefish-ai/website-frontend:latest
```

## Emergency Procedures

### Incident Response

#### 1. Service Outage

```bash
# Check service status
kubectl get pods -n candlefish-prod
curl -f https://candlefish.ai/health

# Scale up if needed
kubectl scale deployment website -n candlefish-prod --replicas=10

# Check recent changes
helm history candlefish-prod -n candlefish-prod
kubectl rollout history deployment/website -n candlefish-prod
```

#### 2. Database Issues

```bash
# Check database status
kubectl get pods -n candlefish-prod -l app=postgresql
kubectl logs -n candlefish-prod -l app=postgresql --tail=100

# Check connections
kubectl exec -n candlefish-prod deployment/backend-api -- \
  python -c "import psycopg2; print('DB OK')"

# Emergency read-only mode (if configured)
kubectl set env deployment/backend-api -n candlefish-prod READ_ONLY=true
```

#### 3. High Load

```bash
# Check current load
kubectl top pods -n candlefish-prod
kubectl get hpa -n candlefish-prod

# Manual scaling
kubectl scale deployment website -n candlefish-prod --replicas=15
kubectl scale deployment backend-api -n candlefish-prod --replicas=20

# Check resource limits
kubectl describe nodes | grep -A 5 "Allocated resources"
```

### Contact Information

| Role | Contact | Availability |
|------|---------|--------------|
| On-Call Engineer | alerts@candlefish.ai | 24/7 |
| DevOps Lead | devops@candlefish.ai | Business hours |
| Security Team | security@candlefish.ai | 24/7 for P0/P1 |
| Product Owner | product@candlefish.ai | Business hours |

### Escalation Matrix

| Severity | Description | Response Time | Escalation |
|----------|-------------|---------------|------------|
| P0 | Complete outage | 15 minutes | CTO + On-call |
| P1 | Partial outage | 30 minutes | DevOps Lead |
| P2 | Performance degradation | 2 hours | On-call Engineer |
| P3 | Minor issues | 1 business day | Team Lead |

### Communication Channels

- **Slack**: #ops-alerts (automated), #incident-response (manual)
- **PagerDuty**: Critical alerts and escalation
- **Email**: stakeholder-updates@candlefish.ai
- **Status Page**: https://status.candlefish.ai (if configured)

---

## Appendix

### Useful Commands Reference

```bash
# Quick deployment
./deployment/scripts/deploy.sh -e production

# Health check all services
for svc in website backend-api paintbox-service; do
  kubectl exec -n candlefish-prod deployment/$svc -- curl -f http://localhost/health
done

# Get all resources in namespace
kubectl get all -n candlefish-prod

# Port forward for debugging
kubectl port-forward -n candlefish-prod svc/candlefish-postgresql 5432:5432
kubectl port-forward -n candlefish-prod svc/candlefish-redis-master 6379:6379

# Emergency scale down (cost savings)
kubectl scale deployment --all --replicas=1 -n candlefish-dev

# Check resource quotas
kubectl describe resourcequota -n candlefish-prod
```

### Configuration Files

- **Terraform**: `/infrastructure/terraform/`
- **Helm Charts**: `/deployment/helm/candlefish/`
- **GitHub Actions**: `/.github/workflows/`
- **Monitoring**: `/deployment/monitoring/`
- **Scripts**: `/deployment/scripts/`

### External Dependencies

- **AWS Services**: EKS, RDS, ElastiCache, S3, Secrets Manager
- **Third-party**: GitHub (CI/CD), GHCR (container registry)
- **Monitoring**: Prometheus, Grafana, AlertManager
- **Security**: Trivy, kube-score, AWS WAF

Last Updated: January 2025

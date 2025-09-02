# Item Valuation System - Production Deployment Guide

This comprehensive guide covers the complete deployment of the Item Valuation and Pricing System to production environments.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Prerequisites](#prerequisites)
3. [Environment Setup](#environment-setup)
4. [Deployment Process](#deployment-process)
5. [Configuration Management](#configuration-management)
6. [Monitoring & Health Checks](#monitoring--health-checks)
7. [Auto-scaling](#auto-scaling)
8. [Security](#security)
9. [Backup & Disaster Recovery](#backup--disaster-recovery)
10. [Troubleshooting](#troubleshooting)
11. [Maintenance Procedures](#maintenance-procedures)

## System Architecture

### Components Overview

The system consists of the following components:

- **Go Backend API** - Main application server (port 8080)
- **PostgreSQL Database** - Primary data store with TimescaleDB extensions
- **Redis Cache** - Session and application caching layer
- **React Web Frontend** - User interface served via Nginx
- **WebSocket Server** - Real-time updates (port 8081)
- **React Native Mobile Apps** - iOS and Android applications

### Infrastructure

- **Kubernetes** - Container orchestration (EKS on AWS)
- **Docker** - Containerization platform
- **AWS Services** - Secrets Manager, S3, CloudFront, RDS, ElastiCache
- **Monitoring** - Prometheus, Grafana, AlertManager
- **CI/CD** - GitHub Actions with automated testing and deployment

## Prerequisites

### Required Tools

```bash
# Install required tools
kubectl version --client
docker --version
aws --version
helm version
jq --version
```

### AWS Setup

1. **Configure AWS CLI**:
   ```bash
   aws configure
   # Set region to us-east-1
   # Ensure credentials have necessary permissions
   ```

2. **Required IAM Permissions**:
   - EKS cluster access
   - Secrets Manager read/write
   - S3 bucket access
   - CloudFormation/Terraform execution
   - ECR push/pull permissions

3. **EKS Cluster**:
   ```bash
   aws eks update-kubeconfig --region us-east-1 --name inventory-cluster
   kubectl get nodes
   ```

### GitHub Repository Setup

1. **Required Secrets**:
   ```
   AWS_ACCESS_KEY_ID
   AWS_SECRET_ACCESS_KEY
   DOCKER_REGISTRY_TOKEN
   SLACK_WEBHOOK_URL (optional)
   ```

2. **Branch Protection**:
   - Enable required status checks
   - Require PR reviews for main branch
   - Dismiss stale reviews when new commits are pushed

## Environment Setup

### 1. Create Namespaces

```bash
kubectl apply -f - <<EOF
apiVersion: v1
kind: Namespace
metadata:
  name: inventory-system
  labels:
    name: inventory-system
---
apiVersion: v1
kind: Namespace
metadata:
  name: inventory-system-staging
  labels:
    name: inventory-system-staging
---
apiVersion: v1
kind: Namespace
metadata:
  name: monitoring
  labels:
    name: monitoring
EOF
```

### 2. Initialize Secrets

```bash
chmod +x scripts/manage-secrets.sh
./scripts/manage-secrets.sh init
```

### 3. Deploy Infrastructure Components

```bash
# Deploy secrets management
kubectl apply -f k8s/secrets.yaml

# Deploy monitoring stack
kubectl apply -f k8s/monitoring.yaml

# Deploy autoscaling configuration
kubectl apply -f k8s/autoscaling.yaml
```

## Deployment Process

### Development Environment

1. **Local Docker Compose**:
   ```bash
   docker-compose up -d
   ```

2. **Environment Variables**:
   ```bash
   cp environments/.env.development .env
   # Edit .env with local configuration
   ```

### Staging Deployment

1. **Automatic Deployment**:
   - Push to `develop` branch triggers staging deployment
   - GitHub Actions handles build and deployment

2. **Manual Deployment**:
   ```bash
   # Deploy to staging namespace
   kubectl apply -f k8s/ -n inventory-system-staging
   ```

### Production Deployment

#### Blue-Green Deployment Process

1. **Automated via GitHub Actions**:
   - Push to `main` branch triggers production deployment
   - Automated health checks and rollback on failure

2. **Manual Blue-Green Deployment**:
   ```bash
   export NEW_IMAGE="ghcr.io/your-org/inventory-backend:v1.2.3"
   export NAMESPACE="inventory-system"
   export APP_NAME="backend"
   
   chmod +x scripts/blue-green-deploy.sh
   ./scripts/blue-green-deploy.sh deploy
   ```

3. **Deployment Steps**:
   - Pre-deployment health checks
   - Create green deployment
   - Health verification
   - Traffic switch
   - Post-deployment validation
   - Cleanup old resources

#### Database Migration

```bash
# Run database migrations
chmod +x migrate.sh
./migrate.sh migrate

# Check migration status
./migrate.sh status
```

## Configuration Management

### Environment-Specific Configuration

Configuration is managed through:

1. **Environment Files**:
   - `environments/.env.development`
   - `environments/.env.staging`
   - `environments/.env.production`

2. **Kubernetes ConfigMaps**:
   ```bash
   kubectl get configmaps -n inventory-system
   ```

3. **AWS Secrets Manager**:
   ```bash
   ./scripts/manage-secrets.sh list
   ```

### Configuration Updates

1. **Application Config**:
   ```bash
   kubectl patch configmap inventory-config -n inventory-system --patch '{"data":{"NEW_KEY":"NEW_VALUE"}}'
   kubectl rollout restart deployment/backend -n inventory-system
   ```

2. **Secret Rotation**:
   ```bash
   ./scripts/manage-secrets.sh rotate jwt
   ./scripts/manage-secrets.sh sync
   ```

## Monitoring & Health Checks

### Health Endpoints

- **Health**: `GET /health` - Overall system health
- **Readiness**: `GET /ready` - Service readiness
- **Liveness**: `GET /live` - Service liveness

### Monitoring Dashboard

1. **Access Grafana**:
   ```
   URL: https://grafana.inventory.example.com
   Default credentials: admin/admin123 (change immediately)
   ```

2. **Key Metrics**:
   - Request rate and latency
   - Error rates
   - Resource utilization
   - Database performance
   - Cache hit rates

### Alerts

Critical alerts are configured for:
- Application downtime
- High error rates
- Resource exhaustion
- Database connectivity issues
- Security incidents

## Auto-scaling

### Horizontal Pod Autoscaling (HPA)

```bash
# Check HPA status
./scripts/manage-autoscaling.sh status

# Test scaling behavior
./scripts/manage-autoscaling.sh test backend cpu 300

# Tune HPA settings
./scripts/manage-autoscaling.sh tune backend-hpa 60 70 2 20
```

### Vertical Pod Autoscaling (VPA)

VPA automatically adjusts resource requests based on usage patterns:

```bash
kubectl get vpa -n inventory-system
kubectl describe vpa postgres-vpa -n inventory-system
```

### Cluster Autoscaling

Configured node groups:
- **General Purpose**: m5.large - m5.2xlarge (3-20 nodes)
- **Compute Optimized**: c5.large - c5.2xlarge (0-10 nodes)
- **Memory Optimized**: r5.large - r5.2xlarge (0-5 nodes)
- **Spot Instances**: Mixed types (0-50 nodes)

## Security

### Access Control

1. **RBAC Configuration**:
   ```bash
   kubectl get rolebindings -n inventory-system
   kubectl get clusterrolebindings | grep inventory
   ```

2. **Service Accounts**:
   - `inventory-app` - Application runtime
   - `secrets-manager` - AWS Secrets Manager integration

### Network Security

1. **Network Policies**:
   ```bash
   kubectl get networkpolicies -n inventory-system
   ```

2. **Ingress Configuration**:
   - HTTPS termination
   - WAF integration
   - Rate limiting

### Secret Management

1. **AWS Secrets Manager Integration**:
   - Automatic secret rotation
   - Encrypted storage
   - Audit logging

2. **TLS Certificates**:
   - Let's Encrypt integration
   - Automatic renewal
   - Multiple domain support

## Backup & Disaster Recovery

### Database Backups

1. **Automated Backups**:
   ```bash
   # Check backup status
   ./migrate.sh backup
   ```

2. **Backup Schedule**:
   - Daily automated backups
   - 30-day retention policy
   - Cross-region replication

### Disaster Recovery

1. **RTO/RPO Targets**:
   - Recovery Time Objective: 15 minutes
   - Recovery Point Objective: 5 minutes

2. **Recovery Procedures**:
   ```bash
   # Restore from backup
   ./migrate.sh restore
   
   # Emergency rollback
   ./scripts/rollback.sh emergency
   ```

## Troubleshooting

### Common Issues

#### Application Not Starting

1. **Check pod status**:
   ```bash
   kubectl get pods -n inventory-system -l app=backend
   kubectl describe pod <pod-name> -n inventory-system
   ```

2. **Check logs**:
   ```bash
   kubectl logs <pod-name> -n inventory-system -f
   ```

#### Database Connection Issues

1. **Test connectivity**:
   ```bash
   kubectl exec -it deployment/backend -n inventory-system -- psql $DATABASE_URL -c "SELECT 1"
   ```

2. **Check secrets**:
   ```bash
   ./scripts/manage-secrets.sh get database
   ```

#### High CPU/Memory Usage

1. **Check metrics**:
   ```bash
   kubectl top pods -n inventory-system
   ./scripts/manage-autoscaling.sh analyze
   ```

2. **Scale manually if needed**:
   ```bash
   kubectl scale deployment backend --replicas=10 -n inventory-system
   ```

### Emergency Procedures

#### Complete System Failure

1. **Check cluster status**:
   ```bash
   kubectl get nodes
   kubectl get pods --all-namespaces
   ```

2. **Emergency rollback**:
   ```bash
   ./scripts/rollback.sh emergency
   ```

3. **Contact procedures**:
   - Slack: #alerts-critical
   - PagerDuty: Automatic escalation
   - Email: oncall@inventory.example.com

## Maintenance Procedures

### Regular Maintenance

#### Weekly Tasks

1. **Security Updates**:
   ```bash
   # Update base images and redeploy
   docker pull alpine:latest
   docker pull postgres:16-alpine
   ```

2. **Performance Review**:
   ```bash
   ./scripts/manage-autoscaling.sh recommend
   ```

#### Monthly Tasks

1. **Secret Rotation**:
   ```bash
   ./scripts/manage-secrets.sh rotate database
   ./scripts/manage-secrets.sh rotate jwt
   ```

2. **Backup Verification**:
   ```bash
   # Test backup restore process
   ./migrate.sh backup
   ./migrate.sh restore
   ```

#### Quarterly Tasks

1. **Security Audit**:
   - Review RBAC permissions
   - Update certificates
   - Security scanning

2. **Capacity Planning**:
   - Review resource usage trends
   - Adjust auto-scaling policies
   - Plan infrastructure scaling

### Version Updates

#### Application Updates

1. **Standard Deployment**:
   - Merge to main branch
   - Automatic CI/CD pipeline
   - Blue-green deployment

2. **Emergency Updates**:
   ```bash
   # Direct image update
   kubectl set image deployment/backend backend=new-image:tag -n inventory-system
   kubectl rollout status deployment/backend -n inventory-system
   ```

#### Infrastructure Updates

1. **Kubernetes Updates**:
   - Plan maintenance window
   - Update node groups
   - Validate all components

2. **Database Updates**:
   - Plan maintenance window
   - Test migration scripts
   - Backup before upgrade

## Support Contacts

- **Development Team**: dev-team@inventory.example.com
- **Operations Team**: ops-team@inventory.example.com
- **Security Team**: security@inventory.example.com
- **On-Call**: +1-555-ON-CALL

## Additional Resources

- **Runbooks**: `/docs/runbooks/`
- **API Documentation**: `https://api.inventory.example.com/docs`
- **Monitoring Dashboards**: `https://grafana.inventory.example.com`
- **Status Page**: `https://status.inventory.example.com`

---

*This deployment guide should be updated regularly to reflect system changes and lessons learned from production operations.*
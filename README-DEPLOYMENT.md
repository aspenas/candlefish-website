# RTPM Production Deployment Guide

This document provides comprehensive instructions for deploying the Real-time Performance Monitoring (RTPM) Dashboard to production.

## 🏗️ Architecture Overview

The RTPM system consists of:
- **FastAPI Backend** (Python 3.11+)
- **React Frontend** (TypeScript + Vite)
- **PostgreSQL Database** (Primary data store)
- **Redis Cache** (Session storage & background tasks)
- **Celery Workers** (Background task processing)
- **Nginx** (Reverse proxy & load balancer)
- **Prometheus + Grafana** (Monitoring & metrics)
- **AlertManager** (Alert routing & notifications)

## 📋 Prerequisites

### System Requirements
- Docker 20.10+
- Docker Compose 2.0+
- Kubernetes 1.25+ (for production)
- kubectl 1.25+
- Helm 3.0+ (optional)
- 4GB RAM minimum (8GB recommended)
- 20GB disk space minimum

### Required Tools
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install Helm (optional)
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

## 🚀 Quick Start

### Local Development
```bash
# Clone repository
git clone <your-repo>
cd rtpm-deployment

# Copy environment template
cp .env.example .env
# Edit .env with your configuration

# Start all services
./deploy.sh local

# Access the application
# Frontend: http://localhost:8080
# API: http://localhost:8000
# Grafana: http://localhost:3000
```

### Production Deployment
```bash
# Configure environment
cp .env.example .env.production
# Edit with production values

# Deploy to production
./deploy.sh production blue-green

# Check deployment status
kubectl get pods -n rtpm-production
```

## 📁 Project Structure

```
candlefish-ai/
├── apps/
│   └── rtpm-api/                 # FastAPI backend application
│       ├── src/                  # Application source code
│       ├── requirements.txt      # Python dependencies
│       ├── Dockerfile            # Production Docker image
│       └── Dockerfile.dev        # Development Docker image
├── deployment/
│   ├── rtpm-dashboard/
│   │   └── frontend/             # React frontend application
│   │       ├── src/              # React source code
│   │       ├── package.json      # Node.js dependencies
│   │       ├── Dockerfile        # Frontend Docker image
│   │       └── nginx.conf        # Nginx configuration
│   ├── k8s/                      # Kubernetes manifests
│   │   ├── namespace.yaml        # Namespace definition
│   │   ├── configmap.yaml        # Configuration maps
│   │   ├── secrets.yaml          # Secret management
│   │   ├── postgres-deployment.yaml
│   │   ├── redis-deployment.yaml
│   │   ├── api-deployment.yaml
│   │   ├── frontend-deployment.yaml
│   │   ├── celery-deployment.yaml
│   │   ├── ingress.yaml          # Load balancer configuration
│   │   └── monitoring-deployment.yaml
│   ├── monitoring/               # Monitoring configuration
│   │   ├── prometheus/
│   │   ├── grafana/
│   │   └── alertmanager/
│   └── nginx/                    # Nginx configurations
├── .github/workflows/            # CI/CD pipeline
│   └── rtpm-deploy.yml          # GitHub Actions workflow
├── docker-compose.yml           # Local development
├── docker-compose.prod.yml      # Production Docker Compose
├── deploy.sh                    # Deployment script
└── .env.example                 # Environment template
```

## 🔧 Configuration

### Environment Variables

Key environment variables that must be configured:

#### Required for Production
```bash
# Database
POSTGRES_PASSWORD=your-secure-password
POSTGRES_USER=rtpm_user
POSTGRES_DB=rtpm_db

# Redis
REDIS_PASSWORD=your-redis-password

# API Security
SECRET_KEY=your-256-bit-secret-key

# Domain Configuration
CORS_ORIGINS=https://rtpm.yourdomain.com
API_URL=https://api.rtpm.yourdomain.com
```

#### Optional but Recommended
```bash
# Monitoring
SENTRY_DSN=your-sentry-dsn
GRAFANA_ADMIN_PASSWORD=secure-grafana-password

# Alerts
SLACK_WEBHOOK_URL=your-slack-webhook
PAGERDUTY_INTEGRATION_KEY=your-pagerduty-key

# AWS (if using EKS)
AWS_REGION=us-west-2
EKS_CLUSTER_NAME=rtpm-cluster
```

### Secrets Management

#### Kubernetes Secrets
Create secrets before deployment:

```bash
# Database credentials
kubectl create secret generic rtpm-secrets \
  --from-literal=POSTGRES_USER=rtpm_user \
  --from-literal=POSTGRES_PASSWORD=your-password \
  --from-literal=REDIS_PASSWORD=your-redis-password \
  --from-literal=SECRET_KEY=your-secret-key \
  -n rtpm-production

# TLS certificates
kubectl create secret tls rtpm-tls \
  --cert=path/to/tls.cert \
  --key=path/to/tls.key \
  -n rtpm-production
```

## 🚀 Deployment Methods

### Method 1: Automated Script (Recommended)

The `deploy.sh` script handles complete deployment orchestration:

```bash
# Deploy to staging with rolling update
./deploy.sh staging rolling

# Deploy to production with blue-green deployment
./deploy.sh production blue-green

# Force deploy (skip tests)
./deploy.sh production rolling true true

# Local development deployment
./deploy.sh local
```

Script features:
- ✅ Pre-deployment validation
- ✅ Database backup (production)
- ✅ Health checks
- ✅ Rollback on failure
- ✅ Smoke tests
- ✅ Zero-downtime deployment

### Method 2: Manual Kubernetes Deployment

For custom deployments:

```bash
# 1. Create namespace
kubectl apply -f deployment/k8s/namespace.yaml

# 2. Apply configurations
kubectl apply -f deployment/k8s/configmap.yaml
kubectl apply -f deployment/k8s/secrets.yaml

# 3. Deploy data services
kubectl apply -f deployment/k8s/postgres-deployment.yaml
kubectl apply -f deployment/k8s/redis-deployment.yaml

# 4. Deploy applications
kubectl apply -f deployment/k8s/api-deployment.yaml
kubectl apply -f deployment/k8s/frontend-deployment.yaml
kubectl apply -f deployment/k8s/celery-deployment.yaml

# 5. Configure networking
kubectl apply -f deployment/k8s/ingress.yaml

# 6. Deploy monitoring
kubectl apply -f deployment/k8s/monitoring-deployment.yaml

# 7. Verify deployment
kubectl get pods -n rtpm-production
```

### Method 3: Docker Compose (Development)

For local development or simple production setups:

```bash
# Development environment
docker-compose up -d

# Production environment
docker-compose -f docker-compose.prod.yml up -d

# Scale services
docker-compose -f docker-compose.prod.yml up -d --scale rtpm-api=3

# View logs
docker-compose logs -f rtpm-api
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

The CI/CD pipeline (`.github/workflows/rtpm-deploy.yml`) provides:

1. **Security Scanning**
   - Vulnerability scanning with Trivy
   - Secret detection with TruffleHog
   - Code quality checks

2. **Testing**
   - Unit tests (API & Frontend)
   - Integration tests
   - End-to-end tests with Playwright

3. **Building**
   - Multi-architecture Docker images
   - Container image signing with Cosign
   - Registry push to GHCR

4. **Deployment**
   - Staging deployment (automatic)
   - Production deployment (manual approval)
   - Blue-green deployment strategy
   - Comprehensive smoke tests

5. **Monitoring**
   - Slack notifications
   - Deployment metrics collection
   - Rollback on failure

### Required Secrets

Configure these secrets in your GitHub repository:

```bash
# AWS Configuration
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
EKS_CLUSTER_NAME

# Container Registry
GITHUB_TOKEN  # Automatically provided

# Notifications
SLACK_WEBHOOK_URL

# Production Secrets (base64 encoded)
POSTGRES_PASSWORD_B64
REDIS_PASSWORD_B64
SECRET_KEY_B64
```

## 📊 Monitoring & Observability

### Metrics Collection

The system collects metrics from:
- API endpoints (request/response metrics)
- Database performance
- Redis operations
- Celery task processing
- Kubernetes cluster health
- Application business metrics

### Dashboards

Pre-configured Grafana dashboards:
- **RTPM Overview**: System health and key metrics
- **API Performance**: Request latency, error rates
- **Database Metrics**: Connections, query performance
- **Infrastructure**: Node and pod metrics
- **Celery Tasks**: Queue length, task success/failure

Access Grafana at: `https://monitoring.rtpm.yourdomain.com`

### Alerting

AlertManager routes alerts to:
- **Critical alerts**: Slack + PagerDuty + Email
- **Warning alerts**: Slack only
- **Infrastructure alerts**: Infrastructure team
- **Database alerts**: Database team

Alert categories:
- API downtime or high error rates
- Database connection issues
- High resource utilization
- Pod/deployment failures
- Certificate expiration
- Queue backup

## 🔍 Health Checks & Monitoring

### Application Health Endpoints

- **API Health**: `GET /health`
- **API Readiness**: `GET /ready`
- **Frontend Health**: `GET /health`
- **Metrics**: `GET /metrics` (Prometheus format)

### Kubernetes Probes

All deployments include:
- **Liveness probes**: Restart unhealthy containers
- **Readiness probes**: Route traffic only to ready pods
- **Startup probes**: Handle slow-starting applications

### Monitoring URLs

After deployment, access monitoring at:
- **Grafana**: `https://monitoring.rtpm.yourdomain.com/grafana`
- **Prometheus**: `https://monitoring.rtpm.yourdomain.com/prometheus`
- **AlertManager**: `https://monitoring.rtpm.yourdomain.com/alertmanager`
- **Celery Flower**: `https://monitoring.rtpm.yourdomain.com/flower`

## 🔄 Backup & Recovery

### Database Backups

Automated backups are created:
- Before each production deployment
- Daily at 2 AM UTC
- Retained for 30 days

Manual backup:
```bash
# Create backup
./deploy.sh production backup

# Restore from backup
kubectl exec deployment/postgres-deployment -n rtmp-production -- \
  psql -U rtpm_user -d rtpm_db < backup-file.sql
```

### Disaster Recovery

1. **Database Recovery**
   ```bash
   # Restore from latest backup
   kubectl apply -f deployment/k8s/postgres-deployment.yaml
   # Restore data from backup
   ```

2. **Complete System Recovery**
   ```bash
   # Redeploy entire system
   ./deploy.sh production rolling false true
   
   # Verify health
   curl -f https://rtpm.yourdomain.com/health
   ```

## 🛠️ Troubleshooting

### Common Issues

#### 1. Pods Not Starting
```bash
# Check pod status
kubectl get pods -n rtpm-production

# View pod logs
kubectl logs -f deployment/rtpm-api-deployment -n rtpm-production

# Describe pod for events
kubectl describe pod <pod-name> -n rtpm-production
```

#### 2. Database Connection Issues
```bash
# Check database pod
kubectl get pods -l component=database -n rtpm-production

# Test database connection
kubectl exec -it deployment/postgres-deployment -n rtpm-production -- \
  psql -U rtmp_user -d rtpm_db -c "SELECT 1"

# Check database logs
kubectl logs -f deployment/postgres-deployment -n rtpm-production
```

#### 3. Service Discovery Issues
```bash
# Check services
kubectl get svc -n rtpm-production

# Test internal connectivity
kubectl exec -it deployment/rtpm-api-deployment -n rtpm-production -- \
  curl http://postgres-service:5432
```

#### 4. Ingress/Load Balancer Issues
```bash
# Check ingress status
kubectl get ingress -n rtpm-production

# Check AWS Load Balancer Controller logs (if using AWS)
kubectl logs -f deployment/aws-load-balancer-controller -n kube-system
```

### Performance Tuning

#### API Performance
```bash
# Increase workers
kubectl patch deployment rtpm-api-deployment -n rtpm-production -p \
  '{"spec":{"template":{"spec":{"containers":[{"name":"rtpm-api","env":[{"name":"WORKERS","value":"8"}]}]}}}}'

# Scale horizontally
kubectl scale deployment rtpm-api-deployment --replicas=5 -n rtmp-production
```

#### Database Performance
```bash
# Monitor slow queries
kubectl exec deployment/postgres-deployment -n rtpm-production -- \
  psql -U rtpm_user -d rtpm_db -c "SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10"

# Check connection pool
kubectl exec deployment/rtpm-api-deployment -n rtpm-production -- \
  python -c "
from src.database import get_pool_status
print(get_pool_status())
"
```

## 📈 Scaling

### Horizontal Pod Autoscaler (HPA)

HPA is configured for:
- API pods: Scale 3-10 based on CPU (70%) and memory (80%)
- Frontend pods: Scale 2-6 based on CPU (70%)
- Celery workers: Scale 3-10 based on CPU and queue length

### Manual Scaling
```bash
# Scale API
kubectl scale deployment rtpm-api-deployment --replicas=8 -n rtpm-production

# Scale workers
kubectl scale deployment celery-worker-deployment --replicas=6 -n rtpm-production
```

### Cluster Autoscaling

For AWS EKS:
```bash
# Enable cluster autoscaler
kubectl apply -f https://raw.githubusercontent.com/kubernetes/autoscaler/master/cluster-autoscaler/cloudprovider/aws/examples/cluster-autoscaler-autodiscover.yaml

# Configure for your cluster
kubectl -n kube-system edit deployment.apps/cluster-autoscaler
```

## 🔐 Security Considerations

### Network Security
- All internal communication encrypted
- Network policies restrict pod-to-pod communication
- Ingress terminates SSL/TLS
- No direct database access from outside cluster

### Container Security
- Non-root containers
- Read-only root filesystems where possible
- Dropped capabilities
- Security contexts applied
- Regular vulnerability scanning

### Secret Management
- Kubernetes secrets for sensitive data
- Secrets mounted as environment variables
- Regular secret rotation
- External secret management (AWS Secrets Manager, etc.)

### Access Control
- RBAC for Kubernetes access
- Service accounts with minimal permissions
- Regular access reviews
- Multi-factor authentication for admin access

## 📞 Support & Maintenance

### Log Access
```bash
# API logs
kubectl logs -f deployment/rtpm-api-deployment -n rtpm-production

# Frontend logs
kubectl logs -f deployment/rtpm-frontend-deployment -n rtpm-production

# Database logs
kubectl logs -f deployment/postgres-deployment -n rtpm-production

# All logs with labels
kubectl logs -l app=rtpm -n rtpm-production --tail=100
```

### Maintenance Tasks

#### Monthly Tasks
- Review and rotate secrets
- Update dependencies
- Check resource utilization
- Review and update monitoring dashboards
- Test backup and recovery procedures

#### Quarterly Tasks
- Security vulnerability assessment
- Performance optimization review
- Cost optimization review
- Disaster recovery testing
- Update Kubernetes cluster

### Contact Information

- **Development Team**: dev@rtmp.yourdomain.com
- **Operations Team**: ops@rtpm.yourdomain.com
- **Emergency Escalation**: +1-555-RTPM-OPS

### Useful Commands

```bash
# Quick health check
curl -f https://rtpm.yourdomain.com/api/health

# Check all pod statuses
kubectl get pods -n rtpm-production -o wide

# View resource usage
kubectl top pods -n rtpm-production

# Emergency rollback
kubectl rollout undo deployment/rtpm-api-deployment -n rtpm-production

# View recent events
kubectl get events -n rtpm-production --sort-by='.lastTimestamp' | tail -20

# Port forward for local debugging
kubectl port-forward service/rtpm-api-service 8000:8000 -n rtpm-production
```

---

This deployment guide provides a comprehensive reference for deploying and maintaining the RTPM production system. For additional support or questions, please contact the development team.
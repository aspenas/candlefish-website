# Security Dashboard Deployment Runbook

## Overview

This runbook provides comprehensive instructions for deploying the Security Dashboard backend infrastructure for candlefish.ai. The deployment includes:

- **Backend Services**: GraphQL Gateway, REST API, WebSocket Service, Authentication Service
- **Databases**: PostgreSQL 15+ with TimescaleDB, Redis, Neo4j
- **Monitoring**: Prometheus, Grafana, AlertManager
- **Infrastructure**: Kubernetes manifests, Auto-scaling, Load balancing, Blue-green deployment

## Prerequisites

### Required Tools

```bash
# Install required tools
kubectl version --client
helm version
aws --version
docker --version
```

### AWS Configuration

```bash
# Configure AWS credentials
aws configure set default.region us-east-1
aws sts get-caller-identity

# Verify EKS cluster access
kubectl cluster-info
kubectl config current-context
```

### Repository Structure

```
candlefish-ai/
├── docker-compose.security-dashboard-production.yml  # Production Docker Compose
├── deployment/
│   ├── k8s/security-dashboard/                       # Kubernetes manifests
│   ├── monitoring/                                   # Prometheus/Grafana configs
│   ├── blue-green/                                   # Blue-green deployment
│   └── scripts/                                      # Deployment automation
│       ├── deploy-security-dashboard.sh              # Main deployment
│       ├── setup-secrets.sh                          # AWS Secrets Manager
│       └── blue-green-deploy.sh                      # Blue-green deployment
└── __tests__/performance/k6/                         # Load tests
```

## Deployment Options

### Option 1: Docker Compose (Development/Testing)

```bash
# Navigate to project root
cd /Users/patricksmith/candlefish-ai

# Set environment variables
export POSTGRES_PASSWORD=your_secure_password
export REDIS_PASSWORD=your_redis_password
export JWT_SECRET=your_jwt_secret
export NEO4J_PASSWORD=your_neo4j_password

# Deploy with Docker Compose
docker-compose -f docker-compose.security-dashboard-production.yml up -d

# Check services
docker-compose -f docker-compose.security-dashboard-production.yml ps
```

### Option 2: Kubernetes Production Deployment

#### Step 1: Setup Secrets

```bash
# Setup AWS Secrets Manager
./deployment/scripts/setup-secrets.sh setup

# Verify secrets were created
./deployment/scripts/setup-secrets.sh list

# Generate .env file for reference
./deployment/scripts/setup-secrets.sh env
```

#### Step 2: Deploy Infrastructure

```bash
# Full automated deployment
./deployment/scripts/deploy-security-dashboard.sh

# Or with specific options
./deployment/scripts/deploy-security-dashboard.sh \
  --tag v1.0.0 \
  --env production

# Dry run to see what would be deployed
./deployment/scripts/deploy-security-dashboard.sh --dry-run
```

#### Step 3: Verify Deployment

```bash
# Check pod status
kubectl get pods -n security-dashboard

# Check services
kubectl get services -n security-dashboard

# Check ingress
kubectl get ingress -n security-dashboard

# View logs
kubectl logs -f deployment/security-dashboard-backend -n security-dashboard
```

### Option 3: Blue-Green Deployment (Zero Downtime)

```bash
# Deploy new version with blue-green strategy
./deployment/scripts/blue-green-deploy.sh deploy v1.1.0

# Check deployment status
./deployment/scripts/blue-green-deploy.sh status

# Promote to production (after validation)
./deployment/scripts/blue-green-deploy.sh promote

# Rollback if needed
./deployment/scripts/blue-green-deploy.sh rollback
```

## Service Architecture

### Core Services

| Service | Port | Purpose | Health Check |
|---------|------|---------|--------------|
| **GraphQL Gateway** | 4000 | Apollo Federation API | `/health` |
| **REST API** | 4001 | Legacy REST endpoints | `/api/v1/health` |
| **WebSocket Service** | 4002 | Real-time events | `/ws/health` |
| **Authentication** | 4004 | JWT/JWKS auth | `/auth/health` |
| **Frontend** | 3000 | Next.js dashboard | `/` |

### Databases

| Database | Port | Purpose | Credentials |
|----------|------|---------|-------------|
| **PostgreSQL + TimescaleDB** | 5432 | Time-series data | AWS Secrets Manager |
| **Redis** | 6379 | Multi-level caching | AWS Secrets Manager |
| **Neo4j** | 7474/7687 | Threat intelligence | AWS Secrets Manager |

### Monitoring

| Service | Port | Purpose | Access |
|---------|------|---------|---------|
| **Prometheus** | 9090 | Metrics collection | Internal |
| **Grafana** | 3001 | Dashboards | `grafana.security.candlefish.ai` |
| **AlertManager** | 9093 | Alert routing | Internal |

## Configuration Management

### Environment Variables

```bash
# Core application settings
NODE_ENV=production
LOG_LEVEL=info
METRICS_ENABLED=true

# Database connections (from AWS Secrets Manager)
DATABASE_URL=postgresql://security_user:password@postgresql-timescale:5432/security_dashboard
REDIS_URL=redis://:password@redis:6379/0
NEO4J_URI=bolt://neo4j:7687

# Security settings
JWT_SECRET=from_aws_secrets
ENCRYPTION_KEY=from_aws_secrets
CORS_ORIGINS=https://security.candlefish.ai

# External integrations
SENTRY_DSN=your_sentry_dsn
SLACK_WEBHOOK_URL=your_slack_webhook
```

### AWS Secrets Manager

All sensitive configuration is stored in AWS Secrets Manager:

```bash
# List all security dashboard secrets
aws secretsmanager list-secrets \
  --query "SecretList[?starts_with(Name, 'candlefish/security-dashboard')]"

# Retrieve specific secret
aws secretsmanager get-secret-value \
  --secret-id "candlefish/security-dashboard/postgres-password"
```

## Scaling Configuration

### Horizontal Pod Autoscaling (HPA)

```yaml
# Backend services: 3-50 replicas based on CPU/memory/custom metrics
# Frontend: 2-20 replicas based on CPU/memory
# WebSocket: 2-15 replicas based on active connections
```

### Vertical Pod Autoscaling (VPA)

```yaml
# Databases automatically resize based on resource usage
# PostgreSQL: 500m-4 CPU, 1-8Gi memory
# Redis: 250m-2 CPU, 512Mi-4Gi memory
```

### Load Balancing

```bash
# Application Load Balancer (ALB)
# - SSL termination
# - WAF integration
# - Multi-AZ distribution
# - Health checks

# Network Load Balancer (NLB) for databases
# - Internal access only
# - High performance
# - Cross-zone load balancing
```

## Monitoring and Alerting

### Key Metrics

```promql
# Service availability
up{job="security-dashboard-backend"}

# Response time (95th percentile)
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Error rate
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])

# Database connections
postgresql_connections_active

# Queue depth
security_event_queue_depth
```

### Alert Conditions

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| Service Down | `up == 0` for 1m | Critical | Immediate response |
| High Error Rate | Error rate > 5% for 2m | High | Investigate logs |
| High Response Time | P95 > 1s for 3m | High | Check performance |
| Database Issues | Connection failures | Critical | Check DB health |
| Security Events | High event rate | Critical | Security investigation |

### Dashboard URLs

```bash
# Grafana dashboards
https://grafana.security.candlefish.ai/dashboards

# Prometheus metrics
https://prometheus.security.candlefish.ai/graph

# Application URLs
https://security.candlefish.ai              # Main dashboard
https://api.security.candlefish.ai/graphql  # GraphQL playground
```

## Troubleshooting

### Common Issues

#### 1. Pod Startup Issues

```bash
# Check pod status
kubectl get pods -n security-dashboard

# View pod events
kubectl describe pod POD_NAME -n security-dashboard

# Check logs
kubectl logs POD_NAME -n security-dashboard --previous
```

#### 2. Database Connection Issues

```bash
# Test PostgreSQL connection
kubectl exec -n security-dashboard deployment/postgresql-timescale -- \
  psql -U security_user -d security_dashboard -c "SELECT 1;"

# Test Redis connection
kubectl exec -n security-dashboard deployment/redis-cluster -- \
  redis-cli ping

# Test Neo4j connection
kubectl exec -n security-dashboard deployment/neo4j -- \
  cypher-shell -u neo4j -p password "RETURN 1;"
```

#### 3. Ingress/Load Balancer Issues

```bash
# Check ingress status
kubectl get ingress -n security-dashboard
kubectl describe ingress security-dashboard-alb-ingress -n security-dashboard

# Check AWS Load Balancer
aws elbv2 describe-load-balancers --region us-east-1
aws elbv2 describe-target-groups --region us-east-1
```

#### 4. Secret Management Issues

```bash
# Check Kubernetes secrets
kubectl get secrets -n security-dashboard

# Verify secret content (base64 encoded)
kubectl get secret security-dashboard-secrets -n security-dashboard -o yaml

# Update secrets from AWS
./deployment/scripts/setup-secrets.sh setup
```

### Emergency Procedures

#### Immediate Rollback

```bash
# Blue-green rollback
./deployment/scripts/blue-green-deploy.sh rollback

# Or manual Kubernetes rollback
kubectl rollout undo deployment/security-dashboard-backend -n security-dashboard
```

#### Scale Down for Maintenance

```bash
# Scale down to minimal replicas
kubectl scale deployment/security-dashboard-backend --replicas=1 -n security-dashboard
kubectl scale deployment/security-dashboard-frontend --replicas=1 -n security-dashboard
```

#### Emergency Contact

```bash
# Slack notifications are automatically sent for:
# - Deployment failures
# - Critical alerts
# - Rollback events

# Manual notification
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Security Dashboard emergency: DESCRIBE_ISSUE"}' \
  $SLACK_WEBHOOK_URL
```

## Performance Testing

### Load Testing with K6

```bash
# Run performance tests
cd __tests__/performance/k6
k6 run security-dashboard-stress-test.js

# Target performance metrics:
# - 1000 concurrent users
# - <100ms API response time
# - 60 FPS WebGL performance
# - <2s initial load time
```

### Database Performance

```bash
# PostgreSQL query performance
kubectl exec -n security-dashboard deployment/postgresql-timescale -- \
  psql -U security_user -d security_dashboard -c "
  SELECT query, mean_time, calls 
  FROM pg_stat_statements 
  ORDER BY mean_time DESC 
  LIMIT 10;"

# Redis performance metrics
kubectl exec -n security-dashboard deployment/redis-cluster -- \
  redis-cli --latency-history -h localhost
```

## Security Considerations

### Network Security

- All services isolated in separate networks
- PostgreSQL/Redis only accessible internally
- TLS termination at load balancer
- WAF protection for public endpoints

### Data Security

- All secrets stored in AWS Secrets Manager
- Database connections encrypted
- Data encrypted at rest and in transit
- Regular security scanning with Trivy

### Access Control

- RBAC configured for all services
- Service accounts with minimal permissions
- Network policies restrict pod-to-pod communication
- Ingress restricted to authorized domains

## Maintenance Procedures

### Regular Maintenance

```bash
# Weekly: Update secrets rotation
./deployment/scripts/setup-secrets.sh setup

# Monthly: Update container images
./deployment/scripts/deploy-security-dashboard.sh --tag latest

# Quarterly: Review and update resource limits
kubectl top pods -n security-dashboard
kubectl top nodes
```

### Backup Procedures

```bash
# Database backup (automated via CronJob)
kubectl get cronjob -n security-dashboard

# Manual backup
kubectl exec -n security-dashboard deployment/postgresql-timescale -- \
  pg_dump -U security_user security_dashboard > backup.sql
```

---

## Quick Reference Commands

```bash
# Deploy everything
./deployment/scripts/deploy-security-dashboard.sh

# Check status
kubectl get all -n security-dashboard

# View logs
kubectl logs -f -l app.kubernetes.io/name=security-dashboard-backend -n security-dashboard

# Scale services
kubectl scale deployment/security-dashboard-backend --replicas=5 -n security-dashboard

# Blue-green deploy
./deployment/scripts/blue-green-deploy.sh deploy v1.1.0

# Emergency rollback
./deployment/scripts/blue-green-deploy.sh rollback

# Port forward for local access
kubectl port-forward service/security-dashboard-frontend 3000:3000 -n security-dashboard
kubectl port-forward service/security-dashboard-backend 4000:4000 -n security-dashboard
```

For detailed troubleshooting and advanced configuration, refer to the individual component documentation in the `deployment/` directory.
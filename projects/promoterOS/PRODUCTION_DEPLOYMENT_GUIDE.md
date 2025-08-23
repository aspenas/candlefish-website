# PromoterOS Production Deployment Guide

## 🚀 Overview

This guide provides complete instructions for deploying PromoterOS from development to production on AWS. The deployment creates a fully automated, scalable, and secure concert booking platform.

## 📋 Prerequisites

### Required Tools
- AWS CLI v2.x configured with credentials
- Terraform >= 1.5.0
- kubectl >= 1.28.0
- Helm >= 3.13.0
- Docker >= 24.0.0
- Node.js >= 18.0.0
- Go >= 1.21.0

### AWS Account Setup
- Account ID: 681214184463
- Region: us-east-1
- Required IAM permissions for EKS, RDS, S3, Secrets Manager, etc.

## 🏗️ Architecture Components

### Infrastructure (Terraform)
```
terraform/
├── modules/
│   ├── networking/     # VPC, subnets, security groups
│   ├── compute/        # EKS cluster, node groups
│   ├── data/          # RDS PostgreSQL, ElastiCache Redis
│   ├── ml/            # SageMaker endpoints
│   ├── observability/ # CloudWatch, X-Ray
│   └── security/      # KMS, Secrets Manager, WAF
```

### Applications (Kubernetes)
```
services/
├── api-gateway/       # Go/Gin REST API
├── scraper-suite/     # Node.js/Playwright scrapers
├── ml-inference/      # Python ML service
├── realtime-ws/       # WebSocket server
└── worker-queue/      # Go background workers
```

### Data Layer
- **PostgreSQL 15**: Main database with pgvector extension
- **Redis 7**: Caching and real-time data
- **S3**: Data lake and ML model storage
- **InfluxDB**: Time-series metrics

## 🚦 Quick Start (First 60 Minutes)

### 1. Bootstrap Infrastructure (15 minutes)
```bash
# Clone repository
git clone https://github.com/candlefish-ai/promoteros.git
cd promoteros

# Run bootstrap script
export ENVIRONMENT=dev
export AWS_REGION=us-east-1
./ops/scripts/bootstrap.sh
```

### 2. Deploy Core Services (15 minutes)
```bash
# Deploy with Helm
helm upgrade --install promoteros ./helm/charts/promoteros \
  --namespace promoteros-dev \
  --values helm/values/dev.yaml \
  --wait

# Verify deployments
kubectl get pods -n promoteros-api
kubectl get pods -n promoteros-scrapers
kubectl get pods -n promoteros-ml
```

### 3. Database Setup (10 minutes)
```bash
# Run migrations
export DATABASE_URL=$(terraform output -raw rds_endpoint)
migrate -path db/migrations -database "$DATABASE_URL" up

# Load seed data
psql "$DATABASE_URL" < db/seeds/initial_data.sql
```

### 4. Monitoring Stack (10 minutes)
```bash
# Deploy Prometheus
helm install prometheus prometheus-community/prometheus \
  --namespace promoteros-monitoring

# Deploy Grafana
helm install grafana grafana/grafana \
  --namespace promoteros-monitoring

# Get Grafana password
kubectl get secret --namespace promoteros-monitoring grafana \
  -o jsonpath="{.data.admin-password}" | base64 --decode
```

### 5. Smoke Tests (10 minutes)
```bash
# Get API endpoint
export API_URL=$(kubectl get ingress -n promoteros-api api-gateway \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

# Test health endpoint
curl -f "https://$API_URL/health/live"

# Test API endpoint
curl -f "https://$API_URL/api/v1/artists" \
  -H "Authorization: Bearer $JWT_TOKEN"

# Run automated tests
npm run test:smoke -- --env dev
```

## 📦 Deployment Environments

### Development
```bash
cd terraform/environments/dev
terraform init
terraform plan
terraform apply

# Deploy application
helm upgrade --install promoteros-dev ./helm/charts/promoteros \
  --namespace promoteros-dev \
  --values helm/values/dev.yaml
```

### Staging
```bash
cd terraform/environments/staging
terraform init
terraform apply -var-file=staging.tfvars

# Deploy application
helm upgrade --install promoteros-staging ./helm/charts/promoteros \
  --namespace promoteros-staging \
  --values helm/values/staging.yaml
```

### Production
```bash
cd terraform/environments/prod
terraform init
terraform apply -var-file=prod.tfvars -auto-approve=false

# Deploy with canary
helm upgrade --install promoteros ./helm/charts/promoteros \
  --namespace promoteros-prod \
  --values helm/values/prod.yaml \
  --set canary.enabled=true \
  --set canary.weight=10

# Monitor canary
npm run monitor:canary -- --duration 600

# Full deployment
helm upgrade --install promoteros ./helm/charts/promoteros \
  --namespace promoteros-prod \
  --values helm/values/prod.yaml \
  --set canary.enabled=false
```

## 🔧 Service Configuration

### API Gateway
```yaml
apiGateway:
  replicaCount: 3
  resources:
    requests:
      memory: "256Mi"
      cpu: "250m"
    limits:
      memory: "512Mi"
      cpu: "500m"
  autoscaling:
    enabled: true
    minReplicas: 3
    maxReplicas: 10
    targetCPUUtilizationPercentage: 70
```

### Scraper Suite
```yaml
scraperSuite:
  replicaCount: 5
  config:
    concurrency: 10
    retryAttempts: 3
    proxyRotation: true
    antiDetection: true
  nodeSelector:
    workload: scrapers
```

### ML Inference
```yaml
mlInference:
  replicaCount: 2
  resources:
    requests:
      nvidia.com/gpu: "1"
  modelConfig:
    modelType: xgboost
    batchSize: 100
    cacheEnabled: true
```

## 🔐 Security Setup

### SSL Certificates
```bash
# Create cert-manager ClusterIssuer
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: ops@promoteros.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: alb
EOF
```

### Secrets Management
```bash
# Create secrets from AWS Secrets Manager
aws secretsmanager get-secret-value \
  --secret-id promoteros/production/config \
  --query SecretString --output text | \
  kubectl create secret generic promoteros-config \
  --from-file=config.json=/dev/stdin \
  -n promoteros-prod
```

### Network Policies
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-gateway-policy
  namespace: promoteros-api
spec:
  podSelector:
    matchLabels:
      app: api-gateway
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: promoteros-ingress
    ports:
    - protocol: TCP
      port: 8080
```

## 📊 Monitoring & Observability

### Prometheus Metrics
```yaml
# Service Monitor for API Gateway
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: api-gateway
  namespace: promoteros-monitoring
spec:
  selector:
    matchLabels:
      app: api-gateway
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics
```

### Grafana Dashboards
- **Service Health**: Overall system status
- **API Performance**: Latency, throughput, errors
- **Scraper Metrics**: Success rates, data quality
- **ML Performance**: Prediction accuracy, inference time
- **Business Metrics**: Bookings, revenue, user activity

### Alerts
```yaml
# AlertManager configuration
groups:
- name: promoteros-alerts
  rules:
  - alert: APIHighLatency
    expr: http_request_duration_seconds{quantile="0.99"} > 0.5
    for: 5m
    annotations:
      summary: API latency above 500ms
      
  - alert: ScraperFailureRate
    expr: rate(scraper_failures_total[5m]) > 0.1
    for: 10m
    annotations:
      summary: Scraper failure rate above 10%
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow
```yaml
on:
  push:
    branches: [main, develop]
    
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - run: npm test
    - run: npm run test:integration
    
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
    - uses: docker/build-push-action@v5
      with:
        push: true
        tags: ${{ env.ECR_REGISTRY }}/promoteros:${{ github.sha }}
        
  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
    - run: helm upgrade --install promoteros ./helm/charts/promoteros
```

## 🆘 Troubleshooting

### Common Issues

#### EKS Node Groups Not Joining
```bash
# Check node group status
aws eks describe-nodegroup \
  --cluster-name promoteros-eks \
  --nodegroup-name api-nodes

# Check instance user data
aws ec2 describe-instances \
  --instance-ids <instance-id> \
  --query 'Reservations[0].Instances[0].UserData' \
  --output text | base64 --decode
```

#### Database Connection Issues
```bash
# Test connection from pod
kubectl run -it --rm debug --image=postgres:15 --restart=Never -- \
  psql -h <rds-endpoint> -U promoteros_app -d promoteros

# Check security groups
aws ec2 describe-security-groups --group-ids <sg-id>
```

#### Scraper Proxy Issues
```bash
# Check proxy configuration
kubectl get configmap scraper-config -n promoteros-scrapers -o yaml

# Test proxy connection
kubectl exec -it <scraper-pod> -n promoteros-scrapers -- \
  curl -x http://proxy:8080 https://api.ipify.org
```

## 📈 Performance Optimization

### Database Tuning
```sql
-- Add indexes for common queries
CREATE INDEX CONCURRENTLY idx_metrics_artist_recent 
ON metrics(artist_id, collected_at DESC) 
WHERE collected_at > NOW() - INTERVAL '7 days';

-- Vacuum and analyze
VACUUM ANALYZE metrics;
```

### Kubernetes Resource Optimization
```bash
# Install VPA
kubectl apply -f https://github.com/kubernetes/autoscaler/releases/latest/download/vertical-pod-autoscaler.yaml

# Create VPA for API Gateway
kubectl apply -f - <<EOF
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: api-gateway-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  updatePolicy:
    updateMode: "Auto"
EOF
```

## 🔄 Backup & Recovery

### Database Backups
```bash
# Manual backup
aws rds create-db-snapshot \
  --db-instance-identifier promoteros-postgres \
  --db-snapshot-identifier promoteros-manual-$(date +%Y%m%d)

# Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier promoteros-postgres-restored \
  --db-snapshot-identifier promoteros-manual-20250122
```

### Kubernetes Backups
```bash
# Install Velero
velero install \
  --provider aws \
  --bucket promoteros-backups \
  --secret-file ./credentials-velero

# Create backup
velero backup create promoteros-full --include-namespaces promoteros-prod

# Restore
velero restore create --from-backup promoteros-full
```

## 📞 Support & Contacts

### On-Call Rotation
- Primary: ops@promoteros.com
- Secondary: dev@promoteros.com
- Escalation: management@promoteros.com

### External Dependencies
- AWS Support: Business tier
- Bright Data (proxies): support@brightdata.com
- Monitoring: PagerDuty integration

## 📚 Additional Resources

- [Architecture Documentation](./docs/ARCHITECTURE.md)
- [API Documentation](./docs/API.md)
- [Security Policies](./docs/SECURITY.md)
- [Runbooks](./ops/runbooks/)
- [n8n Workflows](./n8n/workflows/)

## ✅ Launch Checklist

- [ ] Infrastructure provisioned with Terraform
- [ ] EKS cluster operational
- [ ] RDS and Redis deployed
- [ ] All services deployed and healthy
- [ ] Database migrations completed
- [ ] SSL certificates configured
- [ ] Monitoring stack operational
- [ ] Smoke tests passing
- [ ] Performance tests meeting SLOs
- [ ] Security scan completed
- [ ] Documentation updated
- [ ] Team trained on operations
- [ ] On-call rotation configured
- [ ] Backup strategy tested
- [ ] Disaster recovery plan validated

---

**Version**: 1.0.0  
**Last Updated**: January 22, 2025  
**Status**: Production Ready

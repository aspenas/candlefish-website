# RTPM Production Deployment Guide

## Overview

This guide provides complete production deployment configuration for the Real-time Agent Performance Monitoring (RTPM) platform. The deployment is designed to handle 1000+ concurrent agents with zero-downtime deployments, comprehensive monitoring, and enterprise-grade security.

## Architecture Overview

### Infrastructure Components

- **Kubernetes Cluster**: AWS EKS with auto-scaling node groups
- **Database**: TimescaleDB on RDS for time-series data
- **Cache**: Redis on ElastiCache for session management and caching
- **Load Balancer**: AWS ALB with CloudFront CDN
- **Container Registry**: Amazon ECR for Docker images
- **SSL/TLS**: Let's Encrypt with cert-manager for automated certificate management

### Application Components

- **Backend API**: FastAPI with WebSocket support (Python)
- **Frontend Dashboard**: React + TypeScript SPA
- **Worker Services**: Celery workers for background processing
- **Monitoring**: Prometheus + Grafana + AlertManager
- **Logging**: ELK Stack (Elasticsearch + Logstash + Kibana)

## Deployment Strategy

### Blue-Green Deployment

- Zero-downtime deployments using Argo Rollouts
- Automated health checks and rollback capabilities
- Canary deployments for gradual rollouts
- Comprehensive pre and post-deployment testing

### Auto-scaling

- **Horizontal Pod Autoscaler (HPA)**: CPU, memory, and custom metrics
- **Vertical Pod Autoscaler (VPA)**: Automatic resource optimization
- **Cluster Autoscaler**: Node scaling based on pod requirements
- **KEDA**: Event-driven autoscaling based on queue depth and external metrics

## File Structure

```
deployment/
├── terraform/                    # Infrastructure as Code
│   ├── main.tf                  # Core AWS infrastructure
│   ├── variables.tf             # Configuration variables
│   ├── outputs.tf               # Infrastructure outputs
│   └── cloudfront.tf            # CDN configuration
├── k8s/                         # Kubernetes manifests
│   ├── 00-namespace.yaml        # Namespace and resource quotas
│   ├── 01-configmap.yaml        # Configuration management
│   ├── 02-secrets.yaml          # Secret management
│   ├── 03-storage.yaml          # Persistent storage
│   ├── 04-timescaledb.yaml      # Database deployment
│   ├── 05-redis.yaml            # Cache deployment
│   ├── 06-rtpm-api.yaml         # API deployment with HPA
│   ├── 07-celery-workers.yaml   # Worker deployments
│   ├── 08-frontend.yaml         # Frontend deployment
│   └── 09-ingress.yaml          # Load balancer configuration
├── monitoring/                  # Monitoring stack
│   ├── prometheus-config.yaml   # Metrics collection
│   ├── alerting-rules.yaml      # Alert definitions
│   ├── alertmanager-config.yaml # Alert routing
│   └── grafana/                 # Dashboards
├── logging/                     # Logging stack
│   ├── elasticsearch.yaml       # Log storage
│   ├── logstash.yaml           # Log processing
│   ├── kibana.yaml             # Log visualization
│   └── filebeat.yaml           # Log collection
├── autoscaling/                 # Auto-scaling configurations
│   ├── custom-metrics-hpa.yaml  # Custom metrics scaling
│   ├── keda-scaledobjects.yaml  # Event-driven scaling
│   └── cluster-autoscaler.yaml  # Node scaling
├── blue-green/                  # Deployment strategy
│   ├── blue-green-deployment.yaml # Argo Rollouts configuration
│   └── rollout-scripts.sh       # Deployment automation
├── ssl-tls/                     # SSL/TLS configuration
│   ├── cert-manager.yaml        # Certificate management
│   └── ingress-tls.yaml         # HTTPS configuration
├── Dockerfile.rtpm-api.production      # Optimized API container
├── Dockerfile.nanda-dashboard.production # Optimized frontend container
└── nginx/                       # Web server configuration
    ├── nginx.conf               # Main configuration
    └── default.conf             # Site configuration
```

## Prerequisites

### Required Tools

```bash
# Kubernetes CLI
kubectl version --client

# Terraform
terraform version

# AWS CLI
aws --version

# Argo Rollouts CLI
kubectl argo rollouts version

# Helm (for some components)
helm version
```

### AWS Permissions

The deployment requires an AWS account with the following services:
- EKS (Elastic Kubernetes Service)
- RDS (Relational Database Service) 
- ElastiCache
- ECR (Elastic Container Registry)
- ALB (Application Load Balancer)
- CloudFront
- Route53
- Certificate Manager
- Secrets Manager

### Environment Variables

```bash
export AWS_REGION=us-east-1
export AWS_ACCOUNT_ID=681214184463
export CLUSTER_NAME=candlefish-eks-cluster
export NAMESPACE=rtpm-system
```

## Deployment Steps

### 1. Infrastructure Deployment

Deploy the AWS infrastructure using Terraform:

```bash
cd deployment/terraform

# Initialize Terraform
terraform init

# Plan the deployment
terraform plan -var="environment=production"

# Apply the infrastructure
terraform apply -var="environment=production"

# Get cluster credentials
aws eks update-kubeconfig --region $AWS_REGION --name $CLUSTER_NAME
```

### 2. Build and Push Container Images

```bash
# API image
docker build -f deployment/Dockerfile.rtpm-api.production -t rtpm-api:latest .
docker tag rtpm-api:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/rtpm-api:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/rtpm-api:latest

# Frontend image
docker build -f deployment/Dockerfile.nanda-dashboard.production -t rtpm-frontend:latest .
docker tag rtmp-frontend:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/rtpm-frontend:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/rtpm-frontend:latest
```

### 3. Deploy Kubernetes Resources

```bash
# Apply in order
kubectl apply -f deployment/k8s/00-namespace.yaml
kubectl apply -f deployment/k8s/01-configmap.yaml
kubectl apply -f deployment/k8s/02-secrets.yaml
kubectl apply -f deployment/k8s/03-storage.yaml

# Wait for storage classes
kubectl wait --for=condition=Available storageclass/rtpm-ssd --timeout=60s

# Deploy database and cache
kubectl apply -f deployment/k8s/04-timescaledb.yaml
kubectl apply -f deployment/k8s/05-redis.yaml

# Wait for database to be ready
kubectl wait --for=condition=Ready pod -l app.kubernetes.io/component=database -n $NAMESPACE --timeout=300s

# Deploy application services
kubectl apply -f deployment/k8s/06-rtpm-api.yaml
kubectl apply -f deployment/k8s/07-celery-workers.yaml
kubectl apply -f deployment/k8s/08-frontend.yaml

# Deploy ingress
kubectl apply -f deployment/k8s/09-ingress.yaml
```

### 4. Deploy Monitoring Stack

```bash
# Deploy Prometheus and Grafana
kubectl apply -f deployment/monitoring/

# Wait for monitoring services
kubectl wait --for=condition=Ready pod -l app.kubernetes.io/name=prometheus -n monitoring --timeout=300s
kubectl wait --for=condition=Ready pod -l app.kubernetes.io/name=grafana -n monitoring --timeout=300s
```

### 5. Deploy Logging Stack

```bash
# Deploy ELK stack
kubectl apply -f deployment/logging/

# Wait for Elasticsearch cluster
kubectl wait --for=condition=Ready pod -l app.kubernetes.io/name=elasticsearch -n $NAMESPACE --timeout=600s
```

### 6. Configure SSL/TLS

```bash
# Deploy cert-manager (if not already installed)
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.2/cert-manager.yaml

# Wait for cert-manager
kubectl wait --for=condition=Available deployment/cert-manager -n cert-manager --timeout=300s

# Deploy SSL configuration
kubectl apply -f deployment/ssl-tls/
```

### 7. Set up Auto-scaling

```bash
# Deploy auto-scaling configurations
kubectl apply -f deployment/autoscaling/

# Verify HPA is working
kubectl get hpa -n $NAMESPACE
```

### 8. Configure Blue-Green Deployment

```bash
# Install Argo Rollouts controller
kubectl create namespace argo-rollouts
kubectl apply -n argo-rollouts -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml

# Deploy rollout configurations
kubectl apply -f deployment/blue-green/blue-green-deployment.yaml
```

## Configuration

### Environment-Specific Configuration

Update the following files for your environment:

1. **terraform/variables.tf**: Set your domain names, certificate ARNs, and AWS-specific values
2. **k8s/01-configmap.yaml**: Update API endpoints and configuration values
3. **k8s/02-secrets.yaml**: Set strong passwords and API keys (use base64 encoding)
4. **monitoring/alertmanager-config.yaml**: Configure your notification channels

### Secrets Management

Replace placeholder secrets with actual values:

```bash
# Database password
kubectl create secret generic rtpm-secrets \
  --from-literal=DATABASE_PASSWORD="$(openssl rand -base64 32)" \
  --from-literal=REDIS_PASSWORD="$(openssl rand -base64 32)" \
  --from-literal=SECRET_KEY="$(openssl rand -base64 48)" \
  --from-literal=JWT_SECRET_KEY="$(openssl rand -base64 32)" \
  -n $NAMESPACE
```

### SSL Certificate Configuration

Update the email address in cert-manager configuration:

```yaml
# In ssl-tls/cert-manager.yaml
email: your-email@yourdomain.com
```

## Monitoring and Alerting

### Access URLs

After deployment, access the following URLs:

- **Main Dashboard**: https://rtpm.candlefish.ai
- **API Documentation**: https://api.rtpm.candlefish.ai/docs
- **Grafana**: https://grafana.rtpm.candlefish.ai
- **Prometheus**: https://prometheus.rtpm.candlefish.ai
- **Kibana**: https://logs.rtpm.candlefish.ai

### Key Metrics to Monitor

1. **Application Metrics**:
   - Active agent count
   - API request rate and latency
   - Error rates
   - WebSocket connections

2. **Infrastructure Metrics**:
   - CPU and memory usage
   - Database connections and performance
   - Cache hit rates
   - Network latency

3. **Business Metrics**:
   - Agent performance scores
   - Data ingestion rates
   - System availability

## Operations

### Scaling

#### Manual Scaling
```bash
# Scale API pods
kubectl scale deployment rtpm-api --replicas=10 -n $NAMESPACE

# Scale worker pods
kubectl scale deployment rtpm-celery-worker --replicas=20 -n $NAMESPACE
```

#### Auto-scaling Triggers
- CPU usage > 70%
- Memory usage > 80%
- Queue depth > 1000 tasks
- Response time P99 > 500ms

### Deployment

#### Blue-Green Deployment
```bash
# Deploy new version
./deployment/blue-green/rollout-scripts.sh deploy v1.2.3

# Monitor deployment
kubectl argo rollouts get rollout rtpm-api-rollout -n $NAMESPACE --watch

# Promote if tests pass
./deployment/blue-green/rollout-scripts.sh promote

# Rollback if needed
./deployment/blue-green/rollout-scripts.sh rollback
```

#### Canary Deployment
```bash
# Start canary deployment
./deployment/blue-green/rollout-scripts.sh canary v1.2.3

# Monitor and promote manually
kubectl argo rollouts promote rtpm-api-rollout -n $NAMESPACE
```

### Backup and Recovery

#### Database Backup
```bash
# Manual backup
kubectl exec -n $NAMESPACE statefulset/rtpm-timescaledb -- \
  pg_dump -U rtpm_user -d rtpm_db > backup-$(date +%Y%m%d).sql

# Restore from backup
kubectl exec -i -n $NAMESPACE statefulset/rtpm-timescaledb -- \
  psql -U rtpm_user -d rtpm_db < backup-20231201.sql
```

#### Configuration Backup
```bash
# Backup all configurations
kubectl get all,configmaps,secrets,pvc -n $NAMESPACE -o yaml > backup-config.yaml
```

## Troubleshooting

### Common Issues

1. **Pods Not Starting**:
   ```bash
   kubectl describe pod <pod-name> -n $NAMESPACE
   kubectl logs <pod-name> -n $NAMESPACE
   ```

2. **Database Connection Issues**:
   ```bash
   kubectl exec -it deployment/rtpm-api -n $NAMESPACE -- \
     python -c "import psycopg2; print('DB connection OK')"
   ```

3. **SSL Certificate Issues**:
   ```bash
   kubectl describe certificate rtpm-wildcard-cert -n $NAMESPACE
   kubectl get challenges -n $NAMESPACE
   ```

4. **High Memory Usage**:
   ```bash
   kubectl top pods -n $NAMESPACE --sort-by=memory
   ```

### Health Checks

```bash
# Check all services
kubectl get all -n $NAMESPACE

# Check ingress
kubectl get ingress -n $NAMESPACE

# Check certificates
kubectl get certificates -n $NAMESPACE

# Check HPA status
kubectl get hpa -n $NAMESPACE

# Check rollout status
kubectl argo rollouts list -n $NAMESPACE
```

## Security Considerations

### Network Security
- All inter-service communication uses TLS
- Network policies restrict traffic between namespaces
- Ingress controller terminates TLS with strong ciphers

### Container Security
- Non-root containers with read-only filesystems
- Resource limits and security contexts
- Regular security scanning of container images

### Secrets Management
- Kubernetes secrets for sensitive data
- AWS Secrets Manager integration
- Automatic secret rotation

### Access Control
- RBAC for Kubernetes access
- Basic authentication for monitoring endpoints
- Rate limiting on public endpoints

## Performance Optimization

### Database Optimization
- TimescaleDB for time-series data
- Connection pooling
- Query optimization
- Automated vacuuming

### Caching Strategy
- Redis for session storage
- Application-level caching
- CDN for static assets

### Monitoring Optimization
- Efficient metrics collection
- Log aggregation and rotation
- Alert fatigue reduction

## Disaster Recovery

### RTO/RPO Targets
- **RTO (Recovery Time Objective)**: 30 minutes
- **RPO (Recovery Point Objective)**: 5 minutes

### Backup Strategy
- Daily database backups with 30-day retention
- Configuration backups stored in version control
- Cross-region backup replication

### Recovery Procedures
1. Restore database from latest backup
2. Redeploy applications using stored configurations
3. Verify all services are operational
4. Update DNS if necessary

## Cost Optimization

### Resource Efficiency
- Spot instances for non-critical workloads
- Scheduled scaling for predictable patterns
- Resource right-sizing with VPA

### Monitoring Costs
- AWS Cost Explorer integration
- Budget alerts for unexpected spending
- Regular cost reviews and optimization

## Compliance and Auditing

### Logging
- All API requests logged
- Database access auditing
- Container activity monitoring

### Data Protection
- Encryption at rest and in transit
- Data retention policies
- GDPR compliance considerations

## Support and Maintenance

### Regular Maintenance
- Weekly security updates
- Monthly dependency updates
- Quarterly disaster recovery testing

### Monitoring and Alerting
- 24/7 monitoring with PagerDuty integration
- Escalation procedures for critical alerts
- Regular alert review and tuning

## Conclusion

This production deployment configuration provides a robust, scalable, and secure platform for the RTPM system. The setup includes comprehensive monitoring, automated scaling, zero-downtime deployments, and enterprise-grade security features.

For additional support or questions, please refer to the project documentation or contact the platform team.
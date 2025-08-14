# Paintbox Apollo GraphOS - Production Deployment Guide

## Overview

This guide covers the complete production deployment of the Paintbox Apollo GraphOS federation system, including all backend services, frontend application, and supporting infrastructure.

## Architecture Components

### Core Services
- **Apollo Router** (port 4100) - GraphQL gateway and query planner
- **Estimates Subgraph** (port 4002) - Paint estimation calculations
- **Customers Subgraph** (port 4003) - Customer management with Salesforce integration
- **Projects Subgraph** (port 4004) - Project lifecycle with Company Cam integration
- **Integrations Subgraph** (port 4005) - External API orchestration

### Frontend
- **React Application** (port 3000) - Customer dashboard, project gallery, integration monitoring

### Infrastructure
- **PostgreSQL Databases** - Separate databases per subgraph
- **Redis Cluster** - Caching and pub/sub messaging
- **AWS EKS** - Kubernetes orchestration
- **AWS ALB** - Load balancing and SSL termination
- **Apollo Studio** - Schema registry and monitoring

## Prerequisites

### Required Tools
```bash
# Install required CLI tools
curl -o kubectl https://amazon-eks.s3.us-west-2.amazonaws.com/1.21.2/2021-07-05/bin/linux/amd64/kubectl
chmod +x kubectl && sudo mv kubectl /usr/local/bin/

# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip && sudo ./aws/install

# Install Terraform
curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo apt-key add -
sudo apt-add-repository "deb [arch=amd64] https://apt.releases.hashicorp.com $(lsb_release -cs) main"
sudo apt-get update && sudo apt-get install terraform

# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Install Apollo Rover CLI
curl -sSL https://rover.apollo.dev/nix/latest | sh
```

### AWS Account Setup
```bash
# Configure AWS credentials
aws configure
# Enter AWS Access Key ID, Secret Access Key, Region (us-west-2), Output format (json)

# Verify access
aws sts get-caller-identity
```

### Apollo Studio Setup
```bash
# Set Apollo Studio API key
export APOLLO_KEY="service:paintbox:your-apollo-key-here"
export APOLLO_GRAPH_REF="paintbox@main"

# Verify connection
rover config whoami
```

## Infrastructure Deployment

### Step 1: Deploy AWS Infrastructure with Terraform

```bash
# Clone the repository
git clone https://github.com/paintbox/apollo-graphos-demo.git
cd apollo-graphos-demo

# Initialize Terraform
cd terraform
terraform init

# Review the plan
terraform plan -var="environment=production" \
  -var="domain_name=paintbox.candlefish.ai" \
  -var="route53_zone_id=Z1234567890ABC"

# Apply infrastructure
terraform apply -var="environment=production" \
  -var="domain_name=paintbox.candlefish.ai" \
  -var="route53_zone_id=Z1234567890ABC"

# Note the outputs for later use
terraform output
```

### Step 2: Configure Kubernetes Access

```bash
# Update kubeconfig
aws eks update-kubeconfig --region us-west-2 --name paintbox-production

# Verify cluster access
kubectl cluster-info
kubectl get nodes
```

### Step 3: Set Up Secrets Management

#### Option A: AWS Secrets Manager (Recommended for AWS)
```bash
# Create secrets in AWS Secrets Manager
aws secretsmanager create-secret \
  --name "paintbox/production/apollo-key" \
  --description "Apollo Studio API key" \
  --secret-string "service:paintbox:your-apollo-key-here"

aws secretsmanager create-secret \
  --name "paintbox/production/database-passwords" \
  --description "Database passwords" \
  --secret-string '{"estimates":"password1","customers":"password2","projects":"password3","integrations":"password4"}'

# Apply secrets configuration
kubectl apply -f k8s/secrets.yaml
```

#### Option B: HashiCorp Vault Integration
```bash
# Install External Secrets Operator
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets -n external-secrets --create-namespace

# Configure Vault authentication
kubectl apply -f security/vault-secrets.yaml
```

## Application Deployment

### Step 1: Build and Push Container Images

```bash
# Login to ECR
aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin ACCOUNT.dkr.ecr.us-west-2.amazonaws.com

# Build and push all services
export ECR_REGISTRY=ACCOUNT.dkr.ecr.us-west-2.amazonaws.com
export IMAGE_TAG=v1.0.0

# Backend services
services=("estimates" "customers" "projects" "integrations")
for service in "${services[@]}"; do
  cd subgraph-$service
  docker build -t $ECR_REGISTRY/paintbox-$service:$IMAGE_TAG .
  docker push $ECR_REGISTRY/paintbox-$service:$IMAGE_TAG
  cd ..
done

# Apollo Router
cd router
docker build -t $ECR_REGISTRY/paintbox-router:$IMAGE_TAG .
docker push $ECR_REGISTRY/paintbox-router:$IMAGE_TAG
cd ..

# Frontend
cd frontend
docker build -t $ECR_REGISTRY/paintbox-frontend:$IMAGE_TAG .
docker push $ECR_REGISTRY/paintbox-frontend:$IMAGE_TAG
cd ..
```

### Step 2: Deploy to Kubernetes

```bash
# Apply namespace and configuration
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml -n paintbox
kubectl apply -f k8s/secrets.yaml -n paintbox

# Deploy backend services
kubectl apply -f k8s/estimates-deployment.yaml -n paintbox
kubectl apply -f k8s/customers-deployment.yaml -n paintbox
kubectl apply -f k8s/projects-deployment.yaml -n paintbox
kubectl apply -f k8s/integrations-deployment.yaml -n paintbox

# Wait for backend services
kubectl rollout status deployment/estimates-subgraph -n paintbox --timeout=300s
kubectl rollout status deployment/customers-subgraph -n paintbox --timeout=300s
kubectl rollout status deployment/projects-subgraph -n paintbox --timeout=300s
kubectl rollout status deployment/integrations-subgraph -n paintbox --timeout=300s

# Deploy Apollo Router
kubectl apply -f k8s/router-deployment.yaml -n paintbox
kubectl rollout status deployment/apollo-router -n paintbox --timeout=300s

# Deploy frontend
kubectl apply -f k8s/frontend-deployment.yaml -n paintbox
kubectl rollout status deployment/frontend -n paintbox --timeout=300s

# Apply ingress
kubectl apply -f k8s/ingress.yaml -n paintbox
```

### Step 3: Publish GraphQL Schemas to Apollo Studio

```bash
# Publish each subgraph schema
rover subgraph publish $APOLLO_GRAPH_REF \
  --schema ./subgraph-estimates/schema.graphql \
  --name estimates \
  --routing-url https://api.paintbox.candlefish.ai/estimates

rover subgraph publish $APOLLO_GRAPH_REF \
  --schema ./subgraph-customers/schema.graphql \
  --name customers \
  --routing-url https://api.paintbox.candlefish.ai/customers

rover subgraph publish $APOLLO_GRAPH_REF \
  --schema ./subgraph-projects/schema.graphql \
  --name projects \
  --routing-url https://api.paintbox.candlefish.ai/projects

rover subgraph publish $APOLLO_GRAPH_REF \
  --schema ./subgraph-integrations/schema.graphql \
  --name integrations \
  --routing-url https://api.paintbox.candlefish.ai/integrations
```

## Monitoring and Observability Setup

### Step 1: Deploy Prometheus and Grafana

```bash
# Add Helm repositories
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

# Install Prometheus
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace \
  --values monitoring/prometheus-values.yaml

# Install Grafana
helm install grafana grafana/grafana \
  --namespace monitoring \
  --values monitoring/grafana-values.yaml
```

### Step 2: Configure Apollo Studio Integration

```bash
# Verify Apollo Studio connection
rover graph fetch $APOLLO_GRAPH_REF

# Check schema composition
rover supergraph compose --config supergraph-config.yaml
```

## Security Configuration

### Step 1: Apply Security Policies

```bash
# Apply network policies
kubectl apply -f security/network-policies.yaml

# Apply pod security policies
kubectl apply -f security/pod-security-policies.yaml

# Apply RBAC policies
kubectl apply -f security/rbac.yaml
```

### Step 2: Configure SSL/TLS

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.12.0/cert-manager.yaml

# Configure Let's Encrypt issuer
kubectl apply -f security/cert-issuer.yaml

# Verify certificates
kubectl get certificates -n paintbox
```

## Health Checks and Validation

### Step 1: Service Health Checks

```bash
# Check all pods are running
kubectl get pods -n paintbox

# Check service endpoints
kubectl get endpoints -n paintbox

# Test internal connectivity
kubectl exec -it deployment/apollo-router -n paintbox -- curl http://estimates-subgraph:4002/.well-known/apollo/server-health
```

### Step 2: External Health Checks

```bash
# Test GraphQL endpoint
curl -X POST https://api.paintbox.candlefish.ai/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"query { __schema { queryType { name } } }"}'

# Test frontend
curl -I https://paintbox.candlefish.ai

# Test WebSocket connection
wscat -c wss://api.paintbox.candlefish.ai/graphql -s graphql-ws
```

### Step 3: Load Testing

```bash
# Install Artillery for load testing
npm install -g artillery

# Run load tests
artillery run tests/performance/load-test.yml
```

## Troubleshooting

### Common Issues

#### 1. Pod CrashLoopBackOff
```bash
# Check pod logs
kubectl logs deployment/SERVICE-NAME -n paintbox --previous

# Check resource constraints
kubectl describe pod POD-NAME -n paintbox

# Common fixes:
# - Increase memory/CPU limits
# - Check environment variables
# - Verify database connectivity
```

#### 2. Database Connection Issues
```bash
# Test database connectivity
kubectl exec -it deployment/estimates-subgraph -n paintbox -- nc -zv DATABASE-HOST 5432

# Check secrets
kubectl get secrets -n paintbox
kubectl describe secret database-credentials -n paintbox

# Common fixes:
# - Verify database endpoints in RDS
# - Check security group rules
# - Validate connection strings
```

#### 3. Apollo Router Configuration
```bash
# Check router logs
kubectl logs deployment/apollo-router -n paintbox

# Validate supergraph schema
rover supergraph compose --config supergraph-config.yaml

# Test subgraph connectivity
kubectl exec -it deployment/apollo-router -n paintbox -- curl http://SERVICE-NAME:PORT/.well-known/apollo/server-health
```

### Monitoring and Alerting

#### Access Grafana Dashboard
```bash
# Get Grafana admin password
kubectl get secret --namespace monitoring grafana -o jsonpath="{.data.admin-password}" | base64 --decode

# Port forward to access Grafana
kubectl port-forward --namespace monitoring svc/grafana 3000:80
# Access at http://localhost:3000
```

#### Access Prometheus
```bash
# Port forward to access Prometheus
kubectl port-forward --namespace monitoring svc/prometheus-server 9090:80
# Access at http://localhost:9090
```

## Backup and Disaster Recovery

### Database Backups
```bash
# RDS automated backups are enabled by default
# Manual snapshot
aws rds create-db-snapshot \
  --db-instance-identifier paintbox-estimates-production \
  --db-snapshot-identifier paintbox-estimates-manual-$(date +%Y%m%d%H%M)
```

### Application Backups
```bash
# Backup Kubernetes configurations
kubectl get all,configmap,secret -n paintbox -o yaml > paintbox-backup-$(date +%Y%m%d).yaml

# Backup persistent volumes (if any)
kubectl get pv,pvc -o yaml > pv-backup-$(date +%Y%m%d).yaml
```

## Maintenance and Updates

### Rolling Updates
```bash
# Update image tag in deployment
kubectl set image deployment/SERVICE-NAME container-name=NEW-IMAGE -n paintbox

# Monitor rollout
kubectl rollout status deployment/SERVICE-NAME -n paintbox

# Rollback if needed
kubectl rollout undo deployment/SERVICE-NAME -n paintbox
```

### Schema Updates
```bash
# Test schema changes
rover subgraph check $APOLLO_GRAPH_REF \
  --schema ./subgraph-SERVICE/schema.graphql \
  --name SERVICE

# Publish updated schema
rover subgraph publish $APOLLO_GRAPH_REF \
  --schema ./subgraph-SERVICE/schema.graphql \
  --name SERVICE \
  --routing-url https://api.paintbox.candlefish.ai/SERVICE
```

## Performance Tuning

### Database Optimization
```bash
# Monitor database performance
aws rds describe-db-instances --db-instance-identifier paintbox-estimates-production

# Enable Performance Insights
aws rds modify-db-instance \
  --db-instance-identifier paintbox-estimates-production \
  --monitoring-interval 60 \
  --enable-performance-insights
```

### Kubernetes Resource Optimization
```bash
# Monitor resource usage
kubectl top nodes
kubectl top pods -n paintbox

# Adjust HPA settings based on load patterns
kubectl edit hpa SERVICE-NAME-hpa -n paintbox
```

## Support and Documentation

- **Apollo Studio**: https://studio.apollographql.com/graph/paintbox
- **Grafana Dashboards**: https://grafana.paintbox.candlefish.ai
- **Runbooks**: https://runbooks.paintbox.candlefish.ai
- **Architecture Documentation**: `/architecture/complete-architecture-summary.md`

## Emergency Contacts

- **Platform Team**: platform@paintbox.candlefish.ai
- **On-call**: +1-XXX-XXX-XXXX
- **Slack**: #paintbox-production

---

**Last Updated**: $(date)
**Version**: 1.0.0

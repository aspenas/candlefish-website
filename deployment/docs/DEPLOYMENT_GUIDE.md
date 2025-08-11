# Candlefish Collaboration System - Deployment Guide

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Infrastructure Setup](#infrastructure-setup)
4. [Application Deployment](#application-deployment)
5. [Monitoring and Alerting](#monitoring-and-alerting)
6. [Security Configuration](#security-configuration)
7. [Troubleshooting](#troubleshooting)
8. [Rollback Procedures](#rollback-procedures)

## Overview

This guide provides step-by-step instructions for deploying the Candlefish real-time collaboration system to a production Kubernetes environment on AWS EKS.

### Architecture Components

- **Frontend**: Next.js 15 collaboration editor
- **Backend Services**:
  - GraphQL API service (Apollo Server)
  - WebSocket service for real-time communication
  - Document service with CRDT support
  - Comment and presence services
  - Notification service
- **Infrastructure**:
  - AWS EKS cluster
  - PostgreSQL with TimescaleDB (RDS)
  - Redis cluster (ElastiCache)
  - S3 for file storage
  - CloudFront for CDN
- **Mobile**: React Native app with OTA updates

## Prerequisites

### Required Tools

```bash
# Install required CLI tools
curl -LO https://dl.k8s.io/release/v1.28.0/bin/linux/amd64/kubectl
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### AWS Configuration

1. Configure AWS CLI:
```bash
aws configure
export AWS_REGION=us-east-1
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
```

2. Create terraform state bucket:
```bash
aws s3 mb s3://candlefish-terraform-state
aws s3api put-bucket-versioning --bucket candlefish-terraform-state --versioning-configuration Status=Enabled
```

3. Create DynamoDB table for state locking:
```bash
aws dynamodb create-table \
  --table-name terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5
```

### Docker Registry

1. Create ECR repositories:
```bash
# Create ECR repositories for all services
aws ecr create-repository --repository-name candlefish/collaboration-graphql-api
aws ecr create-repository --repository-name candlefish/collaboration-websocket
aws ecr create-repository --repository-name candlefish/collaboration-document
aws ecr create-repository --repository-name candlefish/collaboration-editor
```

2. Login to ECR:
```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
```

## Infrastructure Setup

### Step 1: Deploy Infrastructure with Terraform

1. Initialize Terraform:
```bash
cd deployment/terraform/collaboration
terraform init
```

2. Create terraform variables file:
```bash
cat > terraform.tfvars << EOF
project_name = "candlefish-collaboration"
environment = "production"
aws_region = "us-east-1"

# Networking
vpc_cidr = "10.0.0.0/16"
private_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
public_subnet_cidrs = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

# Database
db_instance_class = "db.r6g.large"
db_allocated_storage = 100
postgres_version = "15.4"

# Redis
redis_node_type = "cache.r7g.large"
redis_num_cache_nodes = 3

# Domain
app_domain = "candlefish.ai"

# Monitoring
alert_email = "alerts@candlefish.ai"

# Enable production features
enable_multi_az = true
enable_auto_scaling = true
enable_cost_optimization = false
EOF
```

3. Plan and apply:
```bash
terraform plan -var-file=terraform.tfvars
terraform apply -var-file=terraform.tfvars
```

4. Update kubeconfig:
```bash
aws eks update-kubeconfig --region us-east-1 --name candlefish-collaboration
kubectl cluster-info
```

### Step 2: Install Cluster Components

1. Install AWS Load Balancer Controller:
```bash
curl -o iam_policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.7.2/docs/install/iam_policy.json

aws iam create-policy \
    --policy-name AWSLoadBalancerControllerIAMPolicy \
    --policy-document file://iam_policy.json

kubectl apply -k "github.com/aws/eks-charts/stable/aws-load-balancer-controller/crds?ref=master"

helm repo add eks https://aws.github.io/eks-charts
helm repo update

helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=candlefish-collaboration \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller
```

2. Install External Secrets Operator:
```bash
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets \
  -n external-secrets-system \
  --create-namespace \
  --set installCRDs=true
```

3. Install Metrics Server:
```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

## Application Deployment

### Step 1: Build and Push Docker Images

1. Build all Docker images:
```bash
# GraphQL API
docker build -f deployment/docker/Dockerfile.graphql-api -t $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/candlefish/collaboration-graphql-api:latest .
docker push $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/candlefish/collaboration-graphql-api:latest

# WebSocket Service
docker build -f deployment/docker/Dockerfile.websocket-service -t $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/candlefish/collaboration-websocket:latest .
docker push $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/candlefish/collaboration-websocket:latest

# Document Service
docker build -f deployment/docker/Dockerfile.document-service -t $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/candlefish/collaboration-document:latest .
docker push $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/candlefish/collaboration-document:latest

# Collaboration Editor
docker build -f deployment/docker/Dockerfile.collaboration-editor -t $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/candlefish/collaboration-editor:latest .
docker push $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/candlefish/collaboration-editor:latest
```

### Step 2: Configure Secrets

1. Create secrets in AWS Secrets Manager:
```bash
# Database credentials
aws secretsmanager create-secret \
  --name "candlefish/collaboration/database" \
  --secret-string '{
    "host": "your-rds-endpoint",
    "port": "5432",
    "dbname": "collaboration_db",
    "username": "collaboration_user",
    "password": "your-secure-password"
  }'

# Redis credentials
aws secretsmanager create-secret \
  --name "candlefish/collaboration/redis" \
  --secret-string '{
    "host": "your-elasticache-endpoint",
    "port": "6379",
    "password": "your-redis-password"
  }'

# Application secrets
aws secretsmanager create-secret \
  --name "candlefish/collaboration/app-secrets" \
  --secret-string '{
    "jwt_secret": "your-jwt-secret-here",
    "jwt_refresh_secret": "your-jwt-refresh-secret",
    "encryption_key": "your-encryption-key",
    "ws_auth_secret": "your-websocket-auth-secret",
    "nextauth_secret": "your-nextauth-secret"
  }'
```

2. Apply External Secrets configuration:
```bash
kubectl apply -f deployment/security/external-secrets.yaml
```

### Step 3: Deploy with Helm

1. Add Helm dependencies:
```bash
cd deployment/helm/candlefish-collaboration
helm dependency update
```

2. Install the application:
```bash
# Production deployment
helm install collaboration . \
  --namespace collaboration \
  --create-namespace \
  --values values-production.yaml \
  --set image.tag=latest \
  --set global.imageRegistry=$AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com \
  --wait --timeout=900s

# Verify deployment
kubectl get pods -n collaboration
kubectl get services -n collaboration
kubectl get ingress -n collaboration
```

### Step 4: Configure DNS

1. Get the ALB DNS name:
```bash
kubectl get ingress collaboration-ingress -n collaboration -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
```

2. Create Route53 records:
```bash
# Get Hosted Zone ID
HOSTED_ZONE_ID=$(aws route53 list-hosted-zones --query 'HostedZones[?Name==`candlefish.ai.`].Id' --output text | cut -d'/' -f3)

# Create CNAME records
aws route53 change-resource-record-sets --hosted-zone-id $HOSTED_ZONE_ID --change-batch '{
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "editor.candlefish.ai",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "your-alb-dns-name"}]
      }
    },
    {
      "Action": "CREATE", 
      "ResourceRecordSet": {
        "Name": "api.candlefish.ai",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "your-alb-dns-name"}]
      }
    },
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "ws.candlefish.ai", 
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "your-alb-dns-name"}]
      }
    }
  ]
}'
```

## Monitoring and Alerting

### Step 1: Deploy Monitoring Stack

1. Install Prometheus:
```bash
kubectl create namespace monitoring

helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --values deployment/monitoring/prometheus-values.yaml \
  --wait
```

2. Install Grafana:
```bash
helm repo add grafana https://grafana.github.io/helm-charts
helm install grafana grafana/grafana \
  --namespace monitoring \
  --values deployment/monitoring/grafana-values.yaml \
  --wait
```

3. Configure dashboards:
```bash
kubectl create configmap collaboration-dashboard \
  --from-file=deployment/monitoring/grafana/dashboards/collaboration-overview.json \
  -n monitoring
```

### Step 2: Set up Alerting

1. Configure Alertmanager:
```bash
kubectl create secret generic alertmanager-config \
  --from-file=deployment/monitoring/alertmanager/config.yaml \
  -n monitoring
```

2. Apply alert rules:
```bash
kubectl apply -f deployment/monitoring/prometheus/alert-rules.yaml
```

## Security Configuration

### Step 1: Apply Security Policies

```bash
# Apply Pod Security Policies and Network Policies
kubectl apply -f deployment/k8s/collaboration/security-policies.yaml

# Verify policies are active
kubectl get psp
kubectl get networkpolicies -n collaboration
```

### Step 2: Configure RBAC

```bash
# Apply RBAC configuration
kubectl apply -f deployment/k8s/collaboration/rbac.yaml

# Verify service accounts
kubectl get serviceaccounts -n collaboration
kubectl get rolebindings -n collaboration
```

### Step 3: Enable Pod Security Standards

```bash
# Apply Pod Security Standards
kubectl label namespace collaboration \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/audit=restricted \
  pod-security.kubernetes.io/warn=restricted
```

## Health Checks and Validation

### Step 1: Service Health Checks

```bash
# Check all pods are running
kubectl get pods -n collaboration

# Check service endpoints
kubectl get endpoints -n collaboration

# Test GraphQL API
curl -X POST https://api.candlefish.ai/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "query { health }"}'

# Test WebSocket connection
wscat -c wss://ws.candlefish.ai/graphql
```

### Step 2: Database Connectivity

```bash
# Test database connection from a pod
kubectl run postgres-client --rm -i --tty \
  --image postgres:15-alpine \
  --env="PGPASSWORD=$DB_PASSWORD" \
  -- psql -h $DB_HOST -U collaboration_user -d collaboration_db -c "SELECT version();"
```

### Step 3: Load Testing

```bash
# Install artillery for load testing
npm install -g artillery

# Run load test
artillery run deployment/testing/load-test.yml --target https://editor.candlefish.ai
```

## Troubleshooting

### Common Issues

#### 1. Pods Not Starting

```bash
# Check pod status and events
kubectl describe pod <pod-name> -n collaboration

# Check logs
kubectl logs <pod-name> -n collaboration --previous

# Check resource constraints
kubectl top pods -n collaboration
```

#### 2. Database Connection Issues

```bash
# Test database connectivity
kubectl run postgres-test --rm -i --tty \
  --image postgres:15-alpine \
  --env="PGPASSWORD=your-password" \
  -- psql -h your-db-host -U collaboration_user -d collaboration_db

# Check security groups
aws ec2 describe-security-groups --group-ids sg-xxx
```

#### 3. WebSocket Connection Problems

```bash
# Check WebSocket service logs
kubectl logs -l app=websocket-service -n collaboration

# Test WebSocket connectivity
kubectl run websocket-test --rm -i --tty \
  --image nicolaka/netshoot \
  -- curl -I -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  http://websocket-service:4001
```

#### 4. SSL/TLS Certificate Issues

```bash
# Check certificate status
kubectl describe secret candlefish-tls -n collaboration

# Verify certificate chain
openssl s_client -connect editor.candlefish.ai:443 -showcerts
```

## Rollback Procedures

### Application Rollback

1. **Helm Rollback**:
```bash
# List releases
helm list -n collaboration

# Get revision history
helm history collaboration -n collaboration

# Rollback to previous version
helm rollback collaboration <revision-number> -n collaboration
```

2. **Blue-Green Deployment Rollback**:
```bash
# Switch traffic back to previous deployment
kubectl patch ingress collaboration-ingress -n collaboration \
  --type merge \
  -p '{"spec":{"rules":[{"host":"editor.candlefish.ai","http":{"paths":[{"path":"/","pathType":"Prefix","backend":{"service":{"name":"collaboration-editor-blue","port":{"number":3000}}}}]}}]}}'
```

### Infrastructure Rollback

1. **Terraform State Rollback**:
```bash
# List state versions
aws s3api list-object-versions --bucket candlefish-terraform-state --prefix collaboration/terraform.tfstate

# Download previous version
aws s3 cp s3://candlefish-terraform-state/collaboration/terraform.tfstate?versionId=xxx ./terraform.tfstate.backup

# Apply previous configuration
terraform plan
terraform apply
```

### Database Rollback

1. **Point-in-time Recovery**:
```bash
# Create new RDS instance from point-in-time
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier collaboration-db \
  --target-db-instance-identifier collaboration-db-restore \
  --restore-time 2024-01-01T12:00:00.000Z
```

## Maintenance Procedures

### Regular Maintenance Tasks

1. **Update Dependencies**:
```bash
# Update Helm dependencies
helm dependency update

# Update Docker base images
docker build --no-cache -f Dockerfile.graphql-api .
```

2. **Certificate Renewal**:
```bash
# Check certificate expiry
kubectl get secret candlefish-tls -n collaboration -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -dates
```

3. **Database Maintenance**:
```bash
# Run database maintenance
kubectl exec -it postgres-0 -n collaboration -- psql -U collaboration_user -d collaboration_db -c "VACUUM ANALYZE;"
```

4. **Log Rotation**:
```bash
# Configure log retention
kubectl patch configmap fluent-bit-config -n kube-system --patch '{"data":{"output-elasticsearch.conf":"[OUTPUT]\n    Name es\n    Match *\n    Host elasticsearch\n    Port 443\n    Index k8s-logs\n    Type _doc\n    Logstash_Format On\n    Retry_Limit 10"}}'
```

### Backup Procedures

1. **Database Backup**:
```bash
# Create manual snapshot
aws rds create-db-snapshot \
  --db-instance-identifier collaboration-db \
  --db-snapshot-identifier collaboration-db-manual-$(date +%Y%m%d-%H%M%S)
```

2. **Application Configuration Backup**:
```bash
# Export Kubernetes resources
kubectl get all,configmap,secret,ingress,pvc -n collaboration -o yaml > collaboration-backup-$(date +%Y%m%d).yaml
```

## Support and Escalation

### Contact Information

- **On-call Engineer**: oncall@candlefish.ai
- **Development Team**: dev-team@candlefish.ai
- **Infrastructure Team**: infrastructure@candlefish.ai
- **Emergency Escalation**: +1-555-EMERGENCY

### Useful Links

- **Grafana Dashboards**: https://grafana.candlefish.ai
- **Application Logs**: https://kibana.candlefish.ai
- **Runbooks**: https://runbook.candlefish.ai
- **Status Page**: https://status.candlefish.ai
- **Documentation**: https://docs.candlefish.ai

### Emergency Procedures

1. **System Down Emergency**:
   - Page on-call engineer immediately
   - Check status page and update
   - Initiate incident response process
   - Activate backup systems if available

2. **Data Loss Emergency**:
   - Stop all write operations immediately
   - Contact database administrator
   - Initiate point-in-time recovery procedures
   - Notify stakeholders and customers

This deployment guide provides comprehensive instructions for deploying and maintaining the Candlefish collaboration system. Keep this documentation updated as the system evolves.

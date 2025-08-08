# Claude Resources Production Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the Claude Resources deployment system to production with enterprise-grade infrastructure, security, monitoring, and disaster recovery capabilities.

## Architecture Overview

### System Components

- **Frontend**: React application served via nginx
- **Backend**: FastAPI application with WebSocket support
- **Database**: PostgreSQL with automated backups
- **Cache**: Redis for session management and caching
- **Load Balancer**: AWS Application Load Balancer with WAF
- **Container Orchestration**: Amazon EKS
- **Monitoring**: Prometheus, Grafana, AlertManager
- **CI/CD**: GitHub Actions with security scanning
- **Secret Management**: AWS Secrets Manager + External Secrets Operator

### Infrastructure Stack

- **Cloud Provider**: AWS
- **Infrastructure as Code**: Terraform
- **Container Registry**: GitHub Container Registry
- **DNS**: Route53
- **CDN**: CloudFront (optional)
- **Backup Storage**: S3 with cross-region replication

## Prerequisites

### Required Tools

```bash
# Install required CLI tools
brew install terraform kubectl helm aws-cli
brew install velero  # For backup/restore

# Install GitHub CLI
brew install gh

# Verify installations
terraform --version    # >= 1.0
kubectl version --client  # >= 1.21
helm version          # >= 3.0
aws --version         # >= 2.0
```

### AWS Account Setup

1. **Create AWS Account** with appropriate billing setup
2. **Configure IAM roles** for EKS, Secrets Manager, S3, etc.
3. **Create S3 buckets** for Terraform state and backups
4. **Set up Route53 hosted zone** for your domain

### Domain Configuration

1. **Purchase domain** (e.g., candlefish.ai)
2. **Configure Route53** as DNS provider
3. **Request SSL certificate** via ACM
4. **Set up subdomains**:
   - claude-resources.candlefish.ai (main app)
   - api.claude-resources.candlefish.ai (API)
   - grafana.claude-resources.candlefish.ai (monitoring)

## Step 1: Infrastructure Deployment

### 1.1 Configure Terraform Backend

```bash
# Create S3 bucket for Terraform state
aws s3 mb s3://candlefish-terraform-state --region us-west-2

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region us-west-2
```

### 1.2 Deploy Infrastructure

```bash
cd terraform/

# Initialize Terraform
terraform init

# Create production workspace
terraform workspace new production

# Plan deployment
terraform plan -var-file="environments/production.tfvars"

# Apply infrastructure
terraform apply -var-file="environments/production.tfvars"

# Update kubeconfig
aws eks update-kubeconfig --region us-west-2 --name claude-resources-prod
```

### 1.3 Install Core Components

```bash
# Install AWS Load Balancer Controller
helm repo add eks https://aws.github.io/eks-charts
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=claude-resources-prod \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller

# Install External Secrets Operator
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets \
  -n external-secrets-system \
  --create-namespace

# Install cert-manager
helm repo add jetstack https://charts.jetstack.io
helm install cert-manager jetstack/cert-manager \
  -n cert-manager \
  --create-namespace \
  --set installCRDs=true

# Install Velero for backups
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.8.0 \
  --bucket candlefish-claude-resources-velero \
  --secret-file ./velero-credentials \
  --backup-location-config region=us-west-2

# Install ingress-nginx (if not using ALB)
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx \
  -n ingress-nginx \
  --create-namespace
```

## Step 2: Secret Management Setup

### 2.1 Create AWS Secrets

```bash
# Database secrets
aws secretsmanager create-secret \
  --name "claude-resources/database" \
  --description "Database connection details" \
  --secret-string '{
    "username": "postgres",
    "password": "SECURE_PASSWORD_HERE",
    "endpoint": "postgres.claude-resources.svc.cluster.local",
    "database": "claude_resources"
  }' \
  --region us-west-2

# API keys
aws secretsmanager create-secret \
  --name "claude-resources/api-keys" \
  --description "External API keys" \
  --secret-string '{
    "anthropic_api_key": "YOUR_ANTHROPIC_KEY",
    "openai_api_key": "YOUR_OPENAI_KEY",
    "github_token": "YOUR_GITHUB_TOKEN"
  }' \
  --region us-west-2

# Application secrets
aws secretsmanager create-secret \
  --name "claude-resources/application" \
  --description "Application security keys" \
  --secret-string '{
    "jwt_secret": "GENERATE_SECURE_JWT_SECRET",
    "api_secret_key": "GENERATE_SECURE_API_KEY",
    "encryption_key": "GENERATE_32_BYTE_ENCRYPTION_KEY"
  }' \
  --region us-west-2
```

### 2.2 Deploy Secrets Configuration

```bash
# Apply External Secrets configuration
kubectl apply -f security/secrets/external-secrets-operator.yaml

# Verify secret synchronization
kubectl get externalsecrets -n claude-resources
kubectl get secrets -n claude-resources
```

## Step 3: Application Deployment

### 3.1 Deploy Core Infrastructure

```bash
# Create namespace and RBAC
kubectl apply -f k8s/base/namespace.yaml
kubectl apply -f security/rbac/service-accounts.yaml

# Deploy database and cache
kubectl apply -f k8s/production/postgres.yaml
kubectl apply -f k8s/production/redis.yaml

# Wait for databases to be ready
kubectl wait --for=condition=ready pod -l app=postgres -n claude-resources --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n claude-resources --timeout=300s
```

### 3.2 Deploy Applications

```bash
# Apply configuration
kubectl apply -f k8s/base/configmap.yaml

# Deploy backend and frontend
kubectl apply -f k8s/production/backend-deployment.yaml
kubectl apply -f k8s/production/frontend-deployment.yaml

# Deploy ingress
kubectl apply -f k8s/production/ingress.yaml

# Wait for deployments
kubectl rollout status deployment/backend-production -n claude-resources
kubectl rollout status deployment/frontend-production -n claude-resources
```

### 3.3 Configure Load Balancing

```bash
# Apply load balancer controller
kubectl apply -f load-balancing/ingress/aws-load-balancer-controller.yaml

# Configure autoscaling
kubectl apply -f load-balancing/autoscaling/cluster-autoscaler.yaml
kubectl apply -f load-balancing/autoscaling/vertical-pod-autoscaler.yaml
```

## Step 4: Security Configuration

### 4.1 Apply Security Policies

```bash
# Apply Pod Security Policies
kubectl apply -f security/policies/pod-security-policy.yaml

# Apply Network Policies
kubectl apply -f security/policies/network-policies.yaml

# Verify policies are active
kubectl get psp
kubectl get networkpolicies -n claude-resources
```

### 4.2 Configure WAF and Shield

```bash
# WAF rules are applied via Terraform
# Verify WAF is attached to ALB
aws wafv2 list-web-acls --scope REGIONAL --region us-west-2

# Enable Shield Advanced (optional, additional cost)
aws shield subscribe-to-proactive-engagement --region us-west-2
```

## Step 5: Monitoring Setup

### 5.1 Deploy Monitoring Stack

```bash
# Create monitoring namespace
kubectl create namespace monitoring

# Deploy Prometheus
kubectl apply -f monitoring/prometheus/prometheus-config.yaml
kubectl apply -f monitoring/prometheus/deployment.yaml

# Deploy Grafana
kubectl apply -f monitoring/grafana/grafana-config.yaml
kubectl apply -f monitoring/grafana/deployment.yaml

# Deploy AlertManager
kubectl apply -f monitoring/alertmanager/alertmanager-config.yaml

# Wait for monitoring stack
kubectl wait --for=condition=ready pod -l app=prometheus -n monitoring --timeout=300s
kubectl wait --for=condition=ready pod -l app=grafana -n monitoring --timeout=300s
```

### 5.2 Configure Alerting

```bash
# Update Slack webhook URL in AlertManager config
kubectl patch configmap alertmanager-config -n monitoring --patch '{
  "data": {
    "alertmanager.yml": "$(cat monitoring/alertmanager/alertmanager-config.yaml | sed 's/SLACK_WEBHOOK_URL_PLACEHOLDER/YOUR_SLACK_WEBHOOK_URL/')"
  }
}'

# Restart AlertManager to pick up new config
kubectl rollout restart deployment/alertmanager -n monitoring
```

## Step 6: Backup Configuration

### 6.1 Configure Database Backups

```bash
# Deploy backup CronJob
kubectl apply -f backup-dr/database/postgres-backup.yaml

# Test backup manually
kubectl create job --from=cronjob/postgres-backup manual-backup -n claude-resources

# Verify backup in S3
aws s3 ls s3://candlefish-claude-resources-backups/database/
```

### 6.2 Configure Cluster Backups

```bash
# Deploy Velero backup schedules
kubectl apply -f backup-dr/kubernetes/velero-backup.yaml

# Create initial backup
velero backup create initial-backup --include-namespaces claude-resources

# Verify backup
velero backup describe initial-backup
```

## Step 7: CI/CD Pipeline Setup

### 7.1 Configure GitHub Actions

```bash
# Set up GitHub repository secrets
gh secret set AWS_ACCESS_KEY_ID --body "YOUR_ACCESS_KEY"
gh secret set AWS_SECRET_ACCESS_KEY --body "YOUR_SECRET_KEY"
gh secret set KUBE_CONFIG_PRODUCTION --body "$(cat ~/.kube/config | base64)"

# Set up container registry access
gh secret set GITHUB_TOKEN --body "YOUR_GITHUB_TOKEN"

# Configure additional secrets
gh secret set ANTHROPIC_API_KEY --body "YOUR_ANTHROPIC_KEY"
gh secret set OPENAI_API_KEY --body "YOUR_OPENAI_KEY"
gh secret set SLACK_WEBHOOK_URL --body "YOUR_SLACK_WEBHOOK"
```

### 7.2 Deploy GitHub Actions Workflows

```bash
# Workflows are already in .github/workflows/
# Push to main branch to trigger first deployment
git add .
git commit -m "feat: initial production deployment configuration"
git push origin main
```

## Step 8: Testing and Validation

### 8.1 Smoke Tests

```bash
# Test application endpoints
curl -k https://claude-resources.candlefish.ai/health
curl -k https://api.claude-resources.candlefish.ai/health

# Test WebSocket connection
wscat -c wss://claude-resources.candlefish.ai/ws/test

# Test monitoring endpoints
curl -k https://grafana.claude-resources.candlefish.ai/api/health
```

### 8.2 Load Testing

```bash
# Install k6 for load testing
brew install k6

# Run load tests
k6 run tests/performance/load-test.js --vus 10 --duration 30s
```

### 8.3 Disaster Recovery Testing

```bash
# Test database backup/restore
kubectl create job --from=cronjob/postgres-backup test-backup -n claude-resources

# Test Velero restore
velero backup create dr-test --include-namespaces claude-resources
velero restore create dr-test-restore --from-backup dr-test
```

## Step 9: Go-Live Checklist

### Pre-Launch

- [ ] Infrastructure deployed and tested
- [ ] All secrets properly configured
- [ ] Security policies applied
- [ ] Monitoring and alerting active
- [ ] Backup procedures tested
- [ ] Load testing completed
- [ ] SSL certificates valid
- [ ] DNS records configured
- [ ] CI/CD pipeline tested

### Launch

- [ ] Final smoke tests pass
- [ ] Monitoring dashboards show healthy status
- [ ] Alert channels configured
- [ ] On-call rotation established
- [ ] Documentation updated
- [ ] Team notified of go-live

### Post-Launch

- [ ] Monitor for 24 hours
- [ ] Validate backup procedures
- [ ] Review performance metrics
- [ ] Update runbooks based on learnings
- [ ] Schedule first DR test

## Step 10: Operations and Maintenance

### Daily Operations

- Monitor Grafana dashboards
- Review alert status
- Check backup completion
- Validate security scans

### Weekly Operations

- Review resource utilization
- Update dependencies
- Test disaster recovery procedures
- Review and update documentation

### Monthly Operations

- Security audit and updates
- Performance optimization review
- Cost optimization analysis
- Disaster recovery drill

## Troubleshooting

### Common Issues

#### Pods Not Starting

```bash
# Check pod status
kubectl get pods -n claude-resources

# Describe pod for events
kubectl describe pod POD_NAME -n claude-resources

# Check logs
kubectl logs POD_NAME -n claude-resources
```

#### Database Connection Issues

```bash
# Test database connectivity
kubectl exec -it deployment/backend-production -n claude-resources -- psql $DATABASE_URL -c "SELECT 1"

# Check secret values
kubectl get secret claude-resources-secrets -n claude-resources -o yaml
```

#### LoadBalancer Issues

```bash
# Check ALB status
kubectl describe ingress claude-resources-alb -n claude-resources

# Check AWS Load Balancer Controller logs
kubectl logs -n kube-system deployment/aws-load-balancer-controller
```

#### Monitoring Issues

```bash
# Check Prometheus targets
kubectl port-forward -n monitoring svc/prometheus 9090:9090
# Visit http://localhost:9090/targets

# Check Grafana datasource
kubectl port-forward -n monitoring svc/grafana 3000:3000
# Visit http://localhost:3000
```

## Security Considerations

### Network Security

- All traffic encrypted in transit (TLS 1.2+)
- Network policies restrict pod-to-pod communication
- WAF protects against common attacks
- Private subnets for database and cache

### Data Security

- Database encryption at rest
- Secrets managed via AWS Secrets Manager
- Regular security scanning in CI/CD
- Pod Security Standards enforced

### Access Control

- RBAC configured for least privilege
- Service accounts for automated processes
- MFA required for admin access
- Audit logging enabled

## Cost Optimization

### Right-Sizing

- VPA automatically adjusts resource requests
- HPA scales based on actual demand
- Cluster Autoscaler manages node scaling
- Regular cost reviews and optimization

### Storage Optimization

- Lifecycle policies for S3 backups
- Efficient storage classes for different data types
- Compression for backup files
- Regular cleanup of unused resources

## Contact Information

- **Operations Team**: <ops@candlefish.ai>
- **Security Team**: <security@candlefish.ai>
- **On-Call**: +1-555-0123
- **Emergency Escalation**: <cto@candlefish.ai>

## Additional Resources

- [Disaster Recovery Runbook](backup-dr/scripts/disaster-recovery-runbook.md)
- [Security Policies Documentation](security/README.md)
- [Monitoring Playbooks](monitoring/README.md)
- [Terraform Modules Documentation](terraform/README.md)

# Production Secrets Management Deployment Guide

**Candlefish AI - Operational Design Atelier**  
**Target**: AWS Production Environment  
**Prerequisites**: Local development environment validated ✅  

## 🎯 Deployment Overview

This guide provides step-by-step instructions for deploying the Candlefish AI secrets management infrastructure to AWS production, including HashiCorp Vault cluster, AWS Secrets Manager integration, and comprehensive monitoring.

## 📋 Pre-Deployment Checklist

### 1. AWS Account Setup
- [ ] AWS Account with admin access
- [ ] AWS CLI configured with appropriate credentials
- [ ] MFA enabled for production deployments
- [ ] S3 bucket for Terraform state: `candlefish-terraform-state`
- [ ] DynamoDB table for state locking: `terraform-state-lock`

### 2. Generated Credentials Ready
- [ ] MongoDB Atlas user created: `candlefish_admin_20250904`
- [ ] Smithery API key rotated: `55f3f737-0a09-49e8-a2f7-d1fd035bf7b7`
- [ ] JWT and encryption keys generated
- [ ] Old credentials revoked and deactivated

### 3. Network and Security
- [ ] VPC CIDR blocks planned (default: 10.0.0.0/16)
- [ ] Availability zones selected (minimum 3)
- [ ] Security group rules reviewed
- [ ] KMS key policies validated

## 🚀 Step 1: AWS IAM Setup

### Create Secrets Admin User
```bash
# Create IAM user
aws iam create-user --user-name candlefish-secrets-admin

# Attach required policies
aws iam attach-user-policy \
  --user-name candlefish-secrets-admin \
  --policy-arn arn:aws:iam::aws:policy/SecretsManagerFullAccess

aws iam attach-user-policy \
  --user-name candlefish-secrets-admin \
  --policy-arn arn:aws:iam::aws:policy/IAMFullAccess

aws iam attach-user-policy \
  --user-name candlefish-secrets-admin \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

aws iam attach-user-policy \
  --user-name candlefish-secrets-admin \
  --policy-arn arn:aws:iam::aws:policy/CloudWatchFullAccess

# Create access key
aws iam create-access-key --user-name candlefish-secrets-admin
```

### Update Credentials
Replace placeholders in generated secrets file:
```bash
# Edit the generated secrets
nano ~/.candlefish-secrets-20250904-212216/.env.new

# Update these values with real AWS credentials:
AWS_ACCESS_KEY_ID=AKIA_YOUR_REAL_KEY
AWS_SECRET_ACCESS_KEY=your_real_secret_key
```

## 🏗️ Step 2: Terraform Backend Setup

### Create S3 Backend Bucket
```bash
# Create the bucket
aws s3 mb s3://candlefish-terraform-state --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket candlefish-terraform-state \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket candlefish-terraform-state \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```

### Create DynamoDB Lock Table
```bash
aws dynamodb create-table \
  --table-name terraform-state-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=1,WriteCapacityUnits=1 \
  --region us-east-1
```

## 🔧 Step 3: Configure Terraform Variables

Create `terraform.tfvars`:
```bash
cd infrastructure/secrets-management/terraform

cat > terraform.tfvars <<EOF
# Environment Configuration
environment = "production"
aws_region  = "us-east-1"

# Networking
vpc_cidr             = "10.0.0.0/16"
availability_zones   = ["us-east-1a", "us-east-1b", "us-east-1c"]
private_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
public_subnet_cidrs  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

# Vault Configuration
vault_version       = "1.15.0"
vault_cluster_size  = 5
vault_instance_type = "t3.large"
enable_hsm          = true
enable_dev_mode     = false

# Sealed Secrets
sealed_secrets_version = "0.18.0"

# Monitoring
alert_email               = "admin@candlefish.ai"
slack_webhook_url         = "https://hooks.slack.com/your/webhook/url"
pagerduty_integration_key = "your-pagerduty-integration-key"

# Initial Secrets Configuration
initial_secrets = {
  "mongodb" = {
    description     = "MongoDB Atlas connection credentials"
    type           = "database"
    owner          = "platform-team"
    rotation_days  = 90
  }
  "smithery-api" = {
    description     = "Smithery API key for external integrations"
    type           = "api-key"
    owner          = "platform-team"
    rotation_days  = 30
  }
  "jwt-secret" = {
    description     = "JWT signing secret"
    type           = "crypto"
    owner          = "security-team"
    rotation_days  = 180
  }
  "encryption-key" = {
    description     = "Master encryption key"
    type           = "crypto"
    owner          = "security-team"
    rotation_days  = 365
  }
}

# Resource Tags
tags = {
  Environment = "production"
  Project     = "Candlefish-AI"
  Component   = "Secrets-Management"
  DeployedBy  = "DevOps"
  DeployedAt  = "2025-09-04"
  Philosophy  = "Operational-Design-Atelier"
}
EOF
```

## 🚀 Step 4: Deploy Infrastructure

### Initialize Terraform
```bash
cd infrastructure/secrets-management/terraform

# Initialize with remote backend
terraform init \
  -backend-config="bucket=candlefish-terraform-state" \
  -backend-config="key=secrets-management/production/terraform.tfstate" \
  -backend-config="region=us-east-1" \
  -backend-config="encrypt=true" \
  -backend-config="dynamodb_table=terraform-state-lock"
```

### Plan Deployment
```bash
# Generate and review deployment plan
terraform plan -out=production-plan

# Review the plan carefully
# Expected resources: ~50-80 AWS resources including:
# - VPC with subnets, security groups, NAT gateways
# - EC2 instances for Vault cluster
# - Application Load Balancer
# - RDS PostgreSQL instance
# - ElastiCache Redis cluster
# - S3 buckets for audit logs and backups
# - KMS keys for encryption
# - CloudWatch dashboards and alarms
# - IAM roles and policies
```

### Apply Infrastructure
```bash
# Apply the plan (requires confirmation)
terraform apply production-plan

# This will take 15-25 minutes to complete
# Monitor progress and address any issues
```

## 🔐 Step 5: Post-Deployment Configuration

### Initialize Vault Cluster
```bash
# Run post-deployment script
../deploy.sh production us-east-1 apply

# This script will:
# - Initialize Vault with 5 key shares, 3 threshold
# - Configure auto-unseal with KMS
# - Set up initial policies and auth methods
# - Enable audit logging
# - Configure secret engines
```

### Store Critical Secrets
```bash
# Export Vault configuration
export VAULT_ADDR=$(terraform output -raw vault_endpoint)
export VAULT_TOKEN=$(terraform output -raw vault_initial_root_token)

# Store the generated secrets
vault kv put secret/candlefish/mongodb/connection \
  uri="mongodb+srv://candlefish_admin_20250904:vr3UWJROhpYo511uDQu7IxyIMkauoH0k@cluster0.mongodb.net/?retryWrites=true&w=majority" \
  username="candlefish_admin_20250904" \
  password="vr3UWJROhpYo511uDQu7IxyIMkauoH0k"

vault kv put secret/candlefish/api/smithery \
  key="55f3f737-0a09-49e8-a2f7-d1fd035bf7b7"

vault kv put secret/candlefish/jwt/secret \
  value="5wvAZm5GJmmQu9dFy5yriWIkuV1iUWVf"

vault kv put secret/candlefish/encryption/key \
  value="A1SsDTXeOMNyt8m3vGqVOczga2kWzEK1"
```

## 📊 Step 6: Configure Monitoring

### CloudWatch Dashboards
Terraform will create:
- Vault cluster health dashboard
- Secret access patterns dashboard
- Performance metrics dashboard
- Security events dashboard

### Alerts
Configure these critical alerts:
- Vault seal status changes
- Failed authentication attempts > 5/minute
- Secret access outside business hours
- Audit log gaps > 15 minutes
- Cluster node failures

### Audit Log Analysis
Set up log analysis for:
- Secret access patterns
- Unauthorized access attempts
- Break-glass activations
- Rotation failures

## 🧪 Step 7: Validation and Testing

### Health Checks
```bash
# Test Vault cluster
curl -k ${VAULT_ADDR}/v1/sys/health

# Test secret retrieval
vault kv get secret/candlefish/jwt/secret

# Test break-glass procedures
# (Follow documented procedures)
```

### Load Testing
```bash
# Run performance tests
# Target: <100ms p99 latency for secret retrieval
# Target: >1000 secrets/second throughput
```

### Security Testing
- [ ] Penetration testing
- [ ] Access control validation
- [ ] Encryption verification
- [ ] Backup and recovery testing

## 🔄 Step 8: Application Integration

### Update Environment Configuration
```bash
# Create production environment file
cat > .env.production <<EOF
VAULT_ADDR=${VAULT_ENDPOINT}
VAULT_TOKEN=${APP_VAULT_TOKEN}
NODE_ENV=production

# Application will get secrets via SDK
# MONGODB_URI will be retrieved from vault://candlefish/mongodb/connection
# SMITHERY_API_KEY will be retrieved from vault://candlefish/api/smithery
EOF
```

### Deploy SDK
```bash
# Install in applications
npm install @candlefish/secrets-sdk

# Update application code to use SDK
# Replace hardcoded secrets with vault.getSecret() calls
```

## 🚨 Emergency Procedures

### Break-Glass Access
1. Activate break-glass token via SDK
2. Provide business justification
3. Get approval from 2+ team members
4. Session is automatically recorded
5. Access auto-revokes after time limit

### Disaster Recovery
1. Vault data is backed up to S3 hourly
2. PostgreSQL has automated backups
3. Infrastructure is versioned in Terraform
4. Recovery procedures documented in runbooks

### Secret Rotation
1. Automated rotation via Lambda functions
2. Manual rotation via SDK or UI
3. Zero-downtime rotation with staging
4. Audit trail for all rotations

## 📝 Post-Deployment Tasks

### Documentation
- [ ] Update architecture diagrams
- [ ] Create operational runbooks
- [ ] Document break-glass procedures
- [ ] Update security policies

### Team Training
- [ ] Developer onboarding on SDK
- [ ] Operations team Vault training  
- [ ] Security team audit procedures
- [ ] Break-glass drill execution

### Ongoing Maintenance
- [ ] Schedule quarterly security reviews
- [ ] Plan capacity scaling
- [ ] Update rotation schedules
- [ ] Monitor compliance requirements

## 🎯 Success Criteria

### Performance Targets
- [ ] Secret retrieval latency: <100ms p99
- [ ] Throughput: >1000 secrets/second
- [ ] Availability: 99.9% uptime SLA
- [ ] Recovery time: <15 minutes RTO

### Security Goals
- [ ] Zero unencrypted secrets in code
- [ ] All secret access audited
- [ ] Break-glass procedures tested
- [ ] Compliance requirements met

### Operational Excellence
- [ ] Monitoring and alerting active
- [ ] Runbooks documented and tested
- [ ] Team trained and certified
- [ ] Disaster recovery validated

---

**Deployment Guide Status**: Ready for Production  
**Estimated Deployment Time**: 2-4 hours  
**Required Approvals**: Security Team, Platform Engineering  
**Support**: Platform Engineering (24/7 on-call)  

*Candlefish AI - Operational Design Atelier*  
*Security as Craft - Production Excellence*
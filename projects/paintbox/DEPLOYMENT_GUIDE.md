# Paintbox Production Deployment Guide

This guide covers the complete production deployment setup for the Paintbox application, including infrastructure provisioning, application deployment, and ongoing operations.

## Quick Start

1. **Prerequisites Setup**
2. **Infrastructure Deployment**
3. **Application Deployment**
4. **Post-Deployment Verification**

## Architecture Overview

The Paintbox application is deployed using a modern, scalable architecture:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   CloudFront    │────│  Application     │────│   ECS Fargate   │
│   (Global CDN)  │    │  Load Balancer   │    │   (App Servers) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                    ┌───────────┴──────────┐            │
                    │                      │            │
            ┌───────▼──────┐    ┌─────────▼────┐       │
            │   RDS        │    │  ElastiCache │       │
            │ (PostgreSQL) │    │   (Redis)    │       │
            └──────────────┘    └──────────────┘       │
                                                       │
                              ┌────────────────────────┴───────┐
                              │                                │
                     ┌────────▼────────┐              ┌──────▼──────┐
                     │  AWS Secrets    │              │  CloudWatch │
                     │   Manager       │              │ (Monitoring) │
                     └─────────────────┘              └─────────────┘
```

## 1. Prerequisites Setup

### Required Tools

Install the following tools on your deployment machine:

```bash
# AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Terraform
wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
unzip terraform_1.6.0_linux_amd64.zip
sudo mv terraform /usr/local/bin/

# Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# GitHub CLI
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install gh
```

### AWS Configuration

1. **Configure AWS credentials:**
```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Enter your default region (us-east-1)
# Enter your output format (json)
```

2. **Verify AWS access:**
```bash
aws sts get-caller-identity
```

### GitHub Configuration

1. **Authenticate with GitHub:**
```bash
gh auth login
```

2. **Set environment variables:**
```bash
export GITHUB_TOKEN="your_github_token"
export GITHUB_USERNAME="your_github_username"
```

## 2. Infrastructure Deployment

### Step 2.1: Configure Environment Variables

1. **Navigate to the Terraform directory:**
```bash
cd terraform
```

2. **Review and customize the production configuration:**
```bash
# Edit production configuration
vim environments/production.tfvars

# Key settings to customize:
# - domain_name: Your actual domain
# - app_image: Your container registry path
# - alert_email_addresses: Your alert recipients
# - salesforce_instance_url: Your Salesforce org URL
```

### Step 2.2: Initialize Terraform

```bash
# Initialize Terraform
terraform init

# Create/select production workspace
terraform workspace new production || terraform workspace select production
```

### Step 2.3: Deploy Infrastructure

```bash
# Plan the deployment
terraform plan -var-file="environments/production.tfvars"

# Apply the changes (after reviewing the plan)
terraform apply -var-file="environments/production.tfvars"
```

### Step 2.4: Configure Secrets

After infrastructure deployment, configure application secrets in AWS Secrets Manager:

```bash
# Database credentials
aws secretsmanager update-secret-version-stage \
  --secret-id "paintbox/production/database/password" \
  --secret-string '{"username":"paintbox_admin","password":"your_secure_password"}'

# Salesforce credentials
aws secretsmanager update-secret-version-stage \
  --secret-id "paintbox/production/salesforce/credentials" \
  --secret-string '{
    "client_id":"your_salesforce_client_id",
    "client_secret":"your_salesforce_client_secret",
    "username":"your_salesforce_username",
    "password":"your_salesforce_password",
    "security_token":"your_salesforce_security_token",
    "instance_url":"https://yourdomain.my.salesforce.com"
  }'

# Company Cam credentials
aws secretsmanager update-secret-version-stage \
  --secret-id "paintbox/production/companycam/credentials" \
  --secret-string '{
    "api_token":"your_companycam_api_token",
    "webhook_secret":"your_companycam_webhook_secret"
  }'

# Anthropic API key
aws secretsmanager update-secret-version-stage \
  --secret-id "paintbox/production/anthropic/api-key" \
  --secret-string '{"api_key":"your_anthropic_api_key"}'

# Email service credentials
aws secretsmanager update-secret-version-stage \
  --secret-id "paintbox/production/email/credentials" \
  --secret-string '{
    "sendgrid_api_key":"your_sendgrid_api_key",
    "smtp_host":"smtp.sendgrid.net",
    "smtp_port":"587",
    "smtp_username":"apikey",
    "smtp_password":"your_sendgrid_api_key"
  }'
```

## 3. Application Deployment

### Option A: Automated Deployment (Recommended)

Use the provided deployment script:

```bash
# Make script executable
chmod +x scripts/deploy-production.sh

# Run deployment
./scripts/deploy-production.sh
```

### Option B: Manual Deployment

#### Step 3.1: Build and Push Docker Image

```bash
# Build production image
docker build -f Dockerfile.production -t paintbox:production .

# Tag for registry
docker tag paintbox:production ghcr.io/aspenas/candlefish-ai/paintbox:latest

# Login and push
echo $GITHUB_TOKEN | docker login ghcr.io -u $GITHUB_USERNAME --password-stdin
docker push ghcr.io/aspenas/candlefish-ai/paintbox:latest
```

#### Step 3.2: Deploy to ECS

```bash
# Get cluster and service names from Terraform
CLUSTER_NAME=$(terraform output -raw ecs_cluster_name)
SERVICE_NAME=$(terraform output -raw ecs_service_name)

# Force new deployment
aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service $SERVICE_NAME \
  --force-new-deployment

# Wait for deployment completion
aws ecs wait services-stable \
  --cluster $CLUSTER_NAME \
  --services $SERVICE_NAME
```

### Option C: CI/CD Pipeline (GitHub Actions)

The GitHub Actions workflow automatically deploys on push to main:

```bash
# Simply push to main branch
git push origin main

# Monitor deployment in GitHub Actions tab
```

## 4. Domain and SSL Configuration

### Step 4.1: DNS Configuration

1. **Point your domain to CloudFront:**
   - Get CloudFront distribution domain from AWS Console or:
   ```bash
   terraform output cloudfront_domain_name
   ```
   
2. **Update DNS records:**
   - Create CNAME record: `paintbox.yourdomain.com` → `d123456.cloudfront.net`
   - Or use Route 53 alias records (automatic if using Route 53)

### Step 4.2: SSL Certificate Verification

The SSL certificate is automatically requested and validated via DNS. Monitor the certificate status:

```bash
# Check certificate status
aws acm list-certificates --region us-east-1
```

## 5. Post-Deployment Verification

### Step 5.1: Health Checks

```bash
# Get ALB DNS name
ALB_DNS=$(terraform output load_balancer_dns_name)

# Test health endpoint
curl -f https://$ALB_DNS/api/health

# Test application endpoint
curl -f https://$ALB_DNS/
```

### Step 5.2: Monitoring Setup

1. **CloudWatch Dashboards:**
   - Navigate to AWS CloudWatch Console
   - View "Paintbox-Enhanced-production" dashboard
   - Monitor key metrics and alarms

2. **Log Analysis:**
   ```bash
   # View application logs
   aws logs describe-log-groups --log-group-name-prefix "paintbox"
   
   # Stream real-time logs
   aws logs tail paintbox-production-ecs-app --follow
   ```

### Step 5.3: Application Testing

1. **Excel Engine Testing:**
```bash
# Run integration tests
npm run test:excel-engine-integration
```

2. **Salesforce Integration Testing:**
```bash
# Test Salesforce connection
npm run test:salesforce
```

3. **Company Cam Integration Testing:**
```bash
# Test Company Cam API
npm run test:companycam
```

## 6. Ongoing Operations

### Scaling

The application auto-scales based on CPU and memory utilization. Manual scaling:

```bash
# Update desired capacity
aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service $SERVICE_NAME \
  --desired-count 5
```

### Updates and Rollbacks

#### Application Updates
```bash
# Deploy new version
./scripts/deploy-production.sh

# Rollback if needed
aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service $SERVICE_NAME \
  --task-definition previous-task-definition-arn
```

#### Infrastructure Updates
```bash
# Plan infrastructure changes
terraform plan -var-file="environments/production.tfvars"

# Apply updates
terraform apply -var-file="environments/production.tfvars"
```

### Backup and Recovery

1. **Database Backups:**
   - Automated daily backups (RDS)
   - Point-in-time recovery available
   - Manual snapshot: `aws rds create-db-snapshot`

2. **Application Data Backup:**
   - Secrets Manager automatic backup
   - CloudFront logs in S3
   - CloudWatch logs retention: 90 days

### Security Updates

1. **Patch Management:**
   - ECS Fargate automatically updates base images
   - Application dependencies: Update via CI/CD

2. **Secret Rotation:**
   - Manual rotation via AWS Secrets Manager
   - Automated rotation (Lambda function in production)

3. **Security Monitoring:**
   - CloudTrail logs all API calls
   - WAF protects against common attacks
   - CloudWatch alarms for security events

## 7. Troubleshooting

### Common Issues

#### Application Won't Start
```bash
# Check ECS service events
aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME

# Check task logs
aws logs tail paintbox-production-ecs-app --follow
```

#### Database Connection Issues
```bash
# Check security groups
aws ec2 describe-security-groups --group-names paintbox-db-sg-production

# Test database connectivity from ECS
# (exec into running task and test connection)
```

#### High CPU/Memory Usage
```bash
# Check CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=$SERVICE_NAME \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-01T23:59:59Z \
  --period 300 \
  --statistics Average
```

### Support Contacts

- **Infrastructure Issues:** DevOps Team (devops@candlefish.ai)
- **Application Issues:** Development Team (dev@candlefish.ai)
- **Business Issues:** Product Team (product@candlefish.ai)

### Emergency Procedures

#### Complete Outage
1. Check AWS Service Health Dashboard
2. Review CloudWatch alarms
3. Verify ECS service health
4. Check application logs
5. Contact AWS Support if infrastructure issue

#### Security Incident
1. Rotate all secrets immediately
2. Review CloudTrail logs
3. Check WAF logs for attacks
4. Update security groups if needed
5. Document incident for post-mortem

## 8. Cost Optimization

### Resource Right-Sizing
- Monitor CloudWatch metrics
- Adjust ECS task CPU/memory based on usage
- Use spot instances for non-critical workloads

### Reserved Capacity
- Purchase RDS reserved instances
- Consider ECS reserved capacity
- Use S3 Intelligent Tiering

### Cost Monitoring
```bash
# Check current costs
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-02-01 \
  --granularity MONTHLY \
  --metrics BlendedCost
```

---

## Summary

The Paintbox production deployment includes:

✅ **Complete Infrastructure**: ECS Fargate, RDS, ElastiCache, CloudFront CDN
✅ **Auto-scaling**: CPU/Memory/Request-based scaling policies  
✅ **Security**: WAF, SSL/TLS, Secrets Manager, encrypted storage
✅ **Monitoring**: CloudWatch dashboards, alarms, and logging
✅ **CI/CD**: GitHub Actions automation
✅ **Backup**: Automated database and configuration backups
✅ **High Availability**: Multi-AZ deployment, health checks

The application is now production-ready and can handle the complete BART estimator workflow with 14,000+ Excel formulas, Salesforce CRM integration, Company Cam photo management, and offline-first PWA capabilities.

For support, contact the development team or refer to the monitoring dashboards for real-time system health.

# Security Deployment Guide

This guide provides comprehensive instructions for deploying Paintbox using secure, production-ready practices.

## 🔒 Security Overview

### Security Vulnerabilities Identified & Fixed

1. **Exposed Production Credentials**: All `.env` files contained production secrets
2. **Insecure Deployment Scripts**: `deploy-railway-direct.sh` uploaded environment variables directly
3. **Weak Security Tokens**: Generic, easily guessable security tokens
4. **Mixed Secret Management**: Inconsistent secret storage across platforms

### Security Measures Implemented

- ✅ AWS Secrets Manager for all sensitive data
- ✅ KMS encryption for secrets at rest
- ✅ IAM roles with least privilege access
- ✅ Container security scanning
- ✅ Automated vulnerability detection
- ✅ WAF protection with rate limiting
- ✅ Zero-downtime deployment with rollback
- ✅ Comprehensive monitoring and alerting

## 🚀 Deployment Architecture

### Infrastructure Components

1. **AWS Resources**
   - VPC with public/private subnets
   - RDS PostgreSQL with encryption
   - ElastiCache Redis with TLS
   - Secrets Manager with KMS encryption
   - CloudWatch for logging and monitoring
   - WAF for application protection

2. **Application Platforms**
   - Vercel for frontend deployment
   - Railway for backend deployment
   - GitHub Container Registry for images

3. **Security Services**
   - AWS GuardDuty for threat detection
   - AWS Config for compliance monitoring
   - AWS Security Hub for centralized findings
   - GitHub Advanced Security features

## 🛠 Deployment Process

### Prerequisites

1. **Required Tools**

   ```bash
   # Install required CLI tools
   npm install -g @vercel/cli @railway/cli

   # Install AWS CLI
   curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
   unzip awscliv2.zip
   sudo ./aws/install

   # Install Terraform
   wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
   unzip terraform_1.6.0_linux_amd64.zip
   sudo mv terraform /usr/local/bin/
   ```

2. **AWS Configuration**

   ```bash
   # Configure AWS credentials
   aws configure

   # Verify access
   aws sts get-caller-identity
   ```

3. **GitHub Configuration**

   ```bash
   # Install GitHub CLI
   curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
   echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
   sudo apt update
   sudo apt install gh

   # Authenticate
   gh auth login
   ```

### Step 1: Infrastructure Deployment

1. **Initialize Terraform**

   ```bash
   cd terraform/
   terraform init
   ```

2. **Configure Environment Variables**

   ```bash
   # Copy and edit environment configuration
   cp environments/staging.tfvars.example environments/staging.tfvars
   cp environments/production.tfvars.example environments/production.tfvars

   # Edit the files with actual values (never commit these)
   vim environments/staging.tfvars
   vim environments/production.tfvars
   ```

3. **Deploy Infrastructure**

   ```bash
   # For staging
   terraform plan -var-file="environments/staging.tfvars"
   terraform apply -var-file="environments/staging.tfvars"

   # For production
   terraform plan -var-file="environments/production.tfvars"
   terraform apply -var-file="environments/production.tfvars"
   ```

### Step 2: Secrets Management

1. **Generate Secure Secrets**

   ```bash
   # Generate secure random secrets
   JWT_SECRET=$(openssl rand -hex 32)
   ENCRYPTION_KEY=$(openssl rand -hex 32)
   NEXTAUTH_SECRET=$(openssl rand -hex 32)

   echo "Generated secrets (store these securely):"
   echo "JWT_SECRET: $JWT_SECRET"
   echo "ENCRYPTION_KEY: $ENCRYPTION_KEY"
   echo "NEXTAUTH_SECRET: $NEXTAUTH_SECRET"
   ```

2. **Update AWS Secrets Manager**

   ```bash
   # Update secrets with actual values
   aws secretsmanager update-secret \
     --secret-id "paintbox-staging" \
     --secret-string '{
       "JWT_SECRET": "'$JWT_SECRET'",
       "ENCRYPTION_KEY": "'$ENCRYPTION_KEY'",
       "NEXTAUTH_SECRET": "'$NEXTAUTH_SECRET'",
       "SALESFORCE_CLIENT_ID": "your_actual_salesforce_client_id",
       "SALESFORCE_CLIENT_SECRET": "your_actual_salesforce_client_secret",
       "SALESFORCE_USERNAME": "your_actual_salesforce_username",
       "SALESFORCE_PASSWORD": "your_actual_salesforce_password",
       "SALESFORCE_SECURITY_TOKEN": "your_actual_salesforce_token",
       "COMPANYCAM_API_TOKEN": "your_actual_companycam_token",
       "COMPANYCAM_WEBHOOK_SECRET": "your_actual_webhook_secret",
       "ANTHROPIC_API_KEY": "your_actual_anthropic_key"
     }'
   ```

### Step 3: CI/CD Pipeline Setup

1. **Configure GitHub Secrets**

   ```bash
   # Set repository secrets
   gh secret set AWS_ROLE_ARN --body "arn:aws:iam::ACCOUNT_ID:role/paintbox-app-production"
   gh secret set VERCEL_TOKEN --body "your_vercel_token"
   gh secret set VERCEL_ORG_ID --body "your_vercel_org_id"
   gh secret set VERCEL_PROJECT_ID --body "your_vercel_project_id"
   gh secret set RAILWAY_TOKEN --body "your_railway_token"
   gh secret set RAILWAY_PROJECT_ID --body "your_railway_project_id"
   gh secret set SLACK_WEBHOOK --body "your_slack_webhook_url"
   gh secret set CODECOV_TOKEN --body "your_codecov_token"
   ```

2. **Enable GitHub Security Features**

   ```bash
   # Enable security features via GitHub CLI
   gh api repos/candlefish-ai/paintbox \
     --method PATCH \
     --field security_and_analysis='{
       "secret_scanning": {"status": "enabled"},
       "secret_scanning_push_protection": {"status": "enabled"},
       "dependency_graph": {"status": "enabled"},
       "dependabot_security_updates": {"status": "enabled"}
     }'
   ```

### Step 4: Secure Deployment

1. **Using the Secure Deployment Script**

   ```bash
   # Staging deployment
   ./scripts/secure-deploy.sh --environment staging

   # Production deployment (with dry run first)
   ./scripts/secure-deploy.sh --environment production --dry-run
   ./scripts/secure-deploy.sh --environment production
   ```

2. **Using Zero-Downtime Deployment**

   ```bash
   # Zero-downtime deployment to production
   ./scripts/zero-downtime-deploy.sh --environment production
   ```

3. **Using GitHub Actions**

   ```bash
   # Trigger deployment via GitHub Actions
   gh workflow run production-deploy.yml -f environment=staging
   gh workflow run production-deploy.yml -f environment=production
   ```

## 🔍 Monitoring & Alerting

### CloudWatch Dashboards

Access your monitoring dashboards:

- **Production**: <https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=Paintbox-Production>
- **Staging**: <https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=Paintbox-Staging>

### Key Metrics to Monitor

1. **Application Performance**
   - Response time < 2 seconds
   - Error rate < 1%
   - Availability > 99.9%

2. **Infrastructure Health**
   - Database CPU < 80%
   - Redis memory < 80%
   - Available storage > 20%

3. **Security Events**
   - Failed authentication attempts
   - Blocked requests (WAF)
   - Secret access patterns

### Alert Configuration

Alerts are automatically configured for:

- High error rates
- Performance degradation
- Security incidents
- Infrastructure issues

## 🛡️ Security Best Practices

### Runtime Security

1. **Container Security**
   - Images scanned for vulnerabilities
   - Non-root user execution
   - Read-only filesystem where possible
   - Minimal base images (Alpine Linux)

2. **Network Security**
   - VPC isolation
   - Security groups with least privilege
   - Network ACLs for additional layer
   - WAF protection for web traffic

3. **Data Security**
   - Encryption at rest (KMS)
   - Encryption in transit (TLS)
   - Secret rotation every 90 days
   - Database connection encryption

### Development Security

1. **Code Security**
   - Automated security scanning
   - Dependency vulnerability checks
   - Secret detection in commits
   - Code review requirements

2. **CI/CD Security**
   - Secure build environments
   - Artifact signing
   - Deployment approvals
   - Audit logging

## 🔄 Maintenance & Updates

### Regular Security Tasks

1. **Weekly**
   - Review security alerts
   - Check vulnerability reports
   - Monitor access logs

2. **Monthly**
   - Update dependencies
   - Review IAM permissions
   - Rotate non-critical secrets

3. **Quarterly**
   - Security audit
   - Penetration testing
   - Disaster recovery testing
   - Secret rotation (automated)

### Update Process

1. **Security Updates**

   ```bash
   # Update dependencies
   npm audit fix

   # Update base images
   docker pull node:20-alpine

   # Run security scans
   npm run test:security
   ```

2. **Infrastructure Updates**

   ```bash
   # Update Terraform providers
   terraform init -upgrade

   # Plan and apply changes
   terraform plan -var-file="environments/production.tfvars"
   terraform apply -var-file="environments/production.tfvars"
   ```

## 🚨 Incident Response

### Emergency Procedures

1. **Security Incident**

   ```bash
   # Immediately rotate all secrets
   aws lambda invoke \
     --function-name paintbox-secret-rotation-production \
     --payload '{"emergency": true}' \
     response.json

   # Check for unauthorized access
   aws cloudtrail lookup-events \
     --lookup-attributes AttributeKey=EventName,AttributeValue=GetSecretValue \
     --start-time 2024-01-01 \
     --end-time 2024-12-31
   ```

2. **Application Failure**

   ```bash
   # Immediate rollback
   ./scripts/zero-downtime-deploy.sh --environment production --rollback

   # Check logs
   aws logs tail /aws/paintbox/app-production --follow
   ```

3. **Infrastructure Issues**

   ```bash
   # Check CloudWatch alarms
   aws cloudwatch describe-alarms --state-value ALARM

   # Review system health
   aws rds describe-db-instances --db-instance-identifier paintbox-production
   ```

## 📞 Support & Contacts

- **Security Issues**: <security@candlefish.ai>
- **Infrastructure**: <devops@candlefish.ai>
- **Application**: <support@candlefish.ai>

## 📚 Additional Resources

- [AWS Security Best Practices](https://aws.amazon.com/security/security-resources/)
- [Vercel Security Documentation](https://vercel.com/docs/security)
- [Railway Security Guide](https://docs.railway.app/reference/security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

**Note**: This deployment guide implements enterprise-grade security practices. Never commit secrets to version control, always use the provided secure deployment scripts, and regularly review security configurations.

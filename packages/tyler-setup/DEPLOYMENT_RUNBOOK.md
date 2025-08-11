# Tyler Setup Platform - Production Deployment Runbook

## 🚀 Complete Production Deployment Guide

**Version**: 2.0.0  
**Last Updated**: August 10, 2025  
**Environment**: Production  
**Platform**: Candlefish.ai Employee Setup

---

## 📋 Prerequisites Checklist

### Required Accounts & Access
- [ ] AWS Account with administrative access
- [ ] GitHub repository access with secrets configured
- [ ] Claude API key (Anthropic)
- [ ] Domain ownership verification (setup.candlefish.ai)
- [ ] Email service access (SES/SMTP)
- [ ] Monitoring service access (optional)

### Local Development Environment
- [ ] AWS CLI configured (`aws configure`)
- [ ] Terraform v1.5+ installed
- [ ] Node.js 18+ installed
- [ ] Docker installed and running
- [ ] GitHub CLI installed (`gh auth login`)

### Secret Configuration Required
- [ ] Claude API key in GitHub secrets (`CLAUDE_API_KEY`)
- [ ] AWS credentials in GitHub secrets (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
- [ ] OAuth credentials (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
- [ ] Database credentials will be auto-generated
- [ ] JWT secrets will be auto-generated

---

## 🏗️ Infrastructure Deployment

### Step 1: Initial Setup

```bash
# Clone repository
git clone https://github.com/your-org/tyler-setup-platform
cd tyler-setup-platform/packages/tyler-setup

# Set up Terraform backend (one-time setup)
aws s3 mb s3://candlefish-terraform-state --region us-east-1
aws dynamodb create-table \
  --table-name terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region us-east-1
```

### Step 2: Deploy Infrastructure

```bash
# Navigate to Terraform directory
cd infrastructure/terraform

# Initialize Terraform
terraform init

# Review the plan
terraform plan \
  -var="environment=production" \
  -var="domain_name=setup.candlefish.ai" \
  -var="api_domain_name=api.setup.candlefish.ai"

# Apply infrastructure
terraform apply \
  -var="environment=production" \
  -var="domain_name=setup.candlefish.ai" \
  -var="api_domain_name=api.setup.candlefish.ai"
```

### Step 3: Configure DNS

```bash
# Get name servers from Terraform output
terraform output hosted_zone_name_servers

# Update domain registrar to point to these name servers
# This step must be done manually in your domain registrar's control panel
```

---

## 🔐 Security Configuration

### Step 1: Update Critical Secrets

```bash
# Update Claude API Key
aws secretsmanager update-secret \
  --secret-id "tyler-setup/claude/api-key" \
  --secret-string '{"api_key":"YOUR_ACTUAL_CLAUDE_API_KEY","model":"claude-3-5-sonnet-20241022","max_tokens":4096,"rate_limit":"2000000"}' \
  --region us-east-1

# Update OAuth Configuration
aws secretsmanager update-secret \
  --secret-id "tyler-setup/auth/oauth-config" \
  --secret-string '{"google_client_id":"YOUR_GOOGLE_CLIENT_ID","google_client_secret":"YOUR_GOOGLE_CLIENT_SECRET","microsoft_client_id":"YOUR_MICROSOFT_CLIENT_ID","microsoft_client_secret":"YOUR_MICROSOFT_CLIENT_SECRET","redirect_uri":"https://setup.candlefish.ai/auth/callback"}' \
  --region us-east-1
```

### Step 2: Enable Security Services

```bash
# Enable GuardDuty (if not already enabled)
aws guardduty create-detector --enable --region us-east-1

# Enable Config (if not already enabled)
aws configservice start-configuration-recorder --configuration-recorder-name tyler-setup-config-recorder --region us-east-1

# Enable Security Hub
aws securityhub enable-security-hub --region us-east-1
```

---

## 🚀 Application Deployment

### Automated Deployment (Recommended)

```bash
# Push to main branch to trigger deployment
git checkout main
git pull origin main
git push origin main

# Or trigger manual deployment
gh workflow run deploy.yml -f environment=production
```

### Manual Deployment Steps

If automated deployment fails, follow these manual steps:

#### 1. Build and Push Docker Images

```bash
# Configure AWS credentials
aws configure

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-east-1.amazonaws.com

# Build and tag image
docker build -f backend-production/Dockerfile -t tyler-setup-app .
docker tag tyler-setup-app:latest $(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-east-1.amazonaws.com/tyler-setup-app:latest

# Push image
docker push $(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-east-1.amazonaws.com/tyler-setup-app:latest
```

#### 2. Deploy Backend Services

```bash
# Update ECS service with new image
aws ecs update-service \
  --cluster tyler-setup-cluster \
  --service tyler-setup-blue \
  --force-new-deployment \
  --region us-east-1

# Wait for deployment to complete
aws ecs wait services-stable \
  --cluster tyler-setup-cluster \
  --services tyler-setup-blue \
  --region us-east-1
```

#### 3. Deploy Frontend

```bash
# Build frontend
cd frontend
npm ci
npm run build

# Deploy to S3
BUCKET_NAME=$(aws s3api list-buckets --query 'Buckets[?contains(Name, `tyler-setup-frontend`)].Name' --output text)
aws s3 sync dist/ s3://$BUCKET_NAME --delete --region us-east-1

# Invalidate CloudFront
DISTRIBUTION_ID=$(aws cloudfront list-distributions --query 'DistributionList.Items[?contains(Comment, `tyler-setup`)].Id' --output text)
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"
```

---

## ✅ Post-Deployment Validation

### Automated Health Checks

```bash
#!/bin/bash
# Health check script

echo "🔍 Running post-deployment validation..."

# Test main endpoints
DOMAIN="setup.candlefish.ai"
API_DOMAIN="api.setup.candlefish.ai"

# Test frontend
echo "Testing frontend..."
curl -f "https://$DOMAIN" || (echo "❌ Frontend health check failed" && exit 1)

# Test API health
echo "Testing API health..."
curl -f "https://$API_DOMAIN/health" || (echo "❌ API health check failed" && exit 1)

# Test GraphQL endpoint
echo "Testing GraphQL..."
curl -X POST -H "Content-Type: application/json" \
  -d '{"query":"query{__typename}"}' \
  "https://$API_DOMAIN/graphql" || (echo "❌ GraphQL health check failed" && exit 1)

# Test WebSocket connection
echo "Testing WebSocket..."
# WebSocket test would require a specific client tool

echo "✅ All health checks passed!"
```

### Manual Validation Checklist

- [ ] Main website loads: https://setup.candlefish.ai
- [ ] API responds: https://api.setup.candlefish.ai/health
- [ ] GraphQL endpoint works: https://api.setup.candlefish.ai/graphql
- [ ] Authentication flow works
- [ ] Database connections are healthy
- [ ] Redis cache is accessible
- [ ] CloudWatch logs are flowing
- [ ] SSL certificates are valid
- [ ] WAF rules are active
- [ ] DNS resolution works globally

---

## 📊 Monitoring Setup

### CloudWatch Dashboards

Access your monitoring dashboards:
- **Main Dashboard**: https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=tyler-setup-dashboard
- **Application Logs**: https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups/log-group/$252Fecs$252Ftyler-setup
- **WAF Logs**: https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups/log-group/$252Faws$252Fwafv2$252Ftyler-setup

### Key Metrics to Monitor

1. **Application Performance**
   - Response time < 200ms (p95)
   - Error rate < 0.1%
   - Throughput (requests/minute)

2. **Infrastructure Health**
   - CPU utilization < 70%
   - Memory utilization < 80%
   - Database connections < 80% of max

3. **Security Metrics**
   - Authentication failures
   - WAF blocked requests
   - Failed API calls

### Alert Configuration

Alerts are automatically configured for:
- High error rates (>5%)
- High response times (>2s)
- Database CPU >75%
- Memory usage >80%
- Authentication failures >10/5min
- Claude API errors >5/5min

---

## 🔄 Blue-Green Deployment Process

### Understanding Blue-Green

The platform uses blue-green deployment for zero-downtime updates:
- **Blue Environment**: Currently active production
- **Green Environment**: New version being deployed
- **Traffic Switch**: Instant traffic routing change

### Deployment Flow

1. **Deploy to Green**: New code deployed to green environment
2. **Health Check**: Automated health checks on green
3. **Smoke Tests**: Critical functionality verification
4. **Traffic Switch**: Route all traffic to green
5. **Monitor**: Watch for issues in the new environment
6. **Scale Down Blue**: Remove old environment after success

### Manual Blue-Green Switch

If you need to manually switch environments:

```bash
# Get target group ARNs
BLUE_TG_ARN=$(aws elbv2 describe-target-groups --names "tyler-setup-blue-tg" --query 'TargetGroups[0].TargetGroupArn' --output text)
GREEN_TG_ARN=$(aws elbv2 describe-target-groups --names "tyler-setup-green-tg" --query 'TargetGroups[0].TargetGroupArn' --output text)

# Get listener ARN
LISTENER_ARN=$(aws elbv2 describe-listeners --load-balancer-arn $(aws elbv2 describe-load-balancers --names "tyler-setup-alb" --query 'LoadBalancers[0].LoadBalancerArn' --output text) --query 'Listeners[?Port==`443`].ListenerArn' --output text)

# Switch to green
aws elbv2 modify-listener \
  --listener-arn $LISTENER_ARN \
  --default-actions Type=forward,TargetGroupArn=$GREEN_TG_ARN \
  --region us-east-1

# Switch back to blue (if needed)
aws elbv2 modify-listener \
  --listener-arn $LISTENER_ARN \
  --default-actions Type=forward,TargetGroupArn=$BLUE_TG_ARN \
  --region us-east-1
```

---

## 🚨 Rollback Procedures

### Automated Rollback

The CI/CD pipeline automatically rolls back on deployment failure by:
1. Switching traffic back to the blue environment
2. Scaling down the failed green environment
3. Sending alerts to the team

### Manual Rollback Steps

#### 1. Immediate Traffic Rollback

```bash
#!/bin/bash
# Emergency rollback script

echo "🚨 INITIATING EMERGENCY ROLLBACK"

# Get target group ARNs
BLUE_TG_ARN=$(aws elbv2 describe-target-groups --names "tyler-setup-blue-tg" --query 'TargetGroups[0].TargetGroupArn' --output text)
LISTENER_ARN=$(aws elbv2 describe-listeners --load-balancer-arn $(aws elbv2 describe-load-balancers --names "tyler-setup-alb" --query 'LoadBalancers[0].LoadBalancerArn' --output text) --query 'Listeners[?Port==`443`].ListenerArn' --output text)

# Switch traffic back to blue
aws elbv2 modify-listener \
  --listener-arn $LISTENER_ARN \
  --default-actions Type=forward,TargetGroupArn=$BLUE_TG_ARN \
  --region us-east-1

echo "✅ Traffic routed back to stable environment"

# Scale down green environment
aws ecs update-service \
  --cluster tyler-setup-cluster \
  --service tyler-setup-green \
  --desired-count 0 \
  --region us-east-1

echo "✅ Green environment scaled down"
echo "🔍 Check CloudWatch logs for error details"
```

#### 2. Database Rollback

If database changes need to be reverted:

```bash
# Connect to RDS instance
DB_ENDPOINT=$(terraform output -raw database_endpoint)
psql -h $DB_ENDPOINT -U tyler_admin -d tyler_setup

# Run rollback migrations (if available)
-- \i rollback_migration_v2.0.1.sql

# Or restore from backup
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier tyler-setup-db-rollback \
  --db-snapshot-identifier tyler-setup-db-snapshot-pre-deploy \
  --region us-east-1
```

#### 3. Frontend Rollback

```bash
# Get previous frontend version from S3 versions
BUCKET_NAME=$(aws s3api list-buckets --query 'Buckets[?contains(Name, `tyler-setup-frontend`)].Name' --output text)

# List object versions
aws s3api list-object-versions --bucket $BUCKET_NAME --prefix index.html

# Restore previous version
aws s3api copy-object \
  --copy-source $BUCKET_NAME/index.html?versionId=PREVIOUS_VERSION_ID \
  --bucket $BUCKET_NAME \
  --key index.html

# Invalidate CloudFront
DISTRIBUTION_ID=$(aws cloudfront list-distributions --query 'DistributionList.Items[?contains(Comment, `tyler-setup`)].Id' --output text)
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"
```

### Rollback Decision Matrix

| Issue Type | Rollback Method | Time to Execute |
|------------|----------------|-----------------|
| High error rate | Traffic switch only | < 2 minutes |
| Performance issues | Traffic switch only | < 2 minutes |
| Database issues | Full rollback + DB restore | 10-30 minutes |
| Security breach | Infrastructure rollback | 30-60 minutes |
| Frontend issues | Frontend only | 5-10 minutes |

---

## 🔧 Troubleshooting Guide

### Common Issues

#### 1. Deployment Stuck in Progress

```bash
# Check ECS service status
aws ecs describe-services \
  --cluster tyler-setup-cluster \
  --services tyler-setup-blue tyler-setup-green \
  --region us-east-1

# Check task definition issues
aws ecs describe-task-definition \
  --task-definition tyler-setup-app \
  --region us-east-1

# Force new deployment
aws ecs update-service \
  --cluster tyler-setup-cluster \
  --service tyler-setup-blue \
  --force-new-deployment \
  --region us-east-1
```

#### 2. High Error Rates

```bash
# Check application logs
aws logs filter-log-events \
  --log-group-name "/ecs/tyler-setup" \
  --start-time $(date -d '10 minutes ago' +%s)000 \
  --filter-pattern "ERROR" \
  --region us-east-1

# Check ALB target health
aws elbv2 describe-target-health \
  --target-group-arn $(aws elbv2 describe-target-groups --names "tyler-setup-blue-tg" --query 'TargetGroups[0].TargetGroupArn' --output text) \
  --region us-east-1
```

#### 3. Database Connection Issues

```bash
# Check RDS status
aws rds describe-db-instances \
  --db-instance-identifier tyler-setup-db \
  --region us-east-1

# Check database connections
aws rds describe-db-log-files \
  --db-instance-identifier tyler-setup-db \
  --region us-east-1

# Test connection from ECS
aws ecs run-task \
  --cluster tyler-setup-cluster \
  --task-definition tyler-setup-app \
  --overrides '{"containerOverrides":[{"name":"tyler-setup-app","command":["sh","-c","pg_isready -h $DATABASE_HOST -p 5432"]}]}' \
  --launch-type FARGATE \
  --network-configuration 'awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx]}' \
  --region us-east-1
```

#### 4. SSL Certificate Issues

```bash
# Check certificate status
aws acm list-certificates --region us-east-1
aws acm describe-certificate --certificate-arn arn:aws:acm:us-east-1:xxx:certificate/xxx --region us-east-1

# Check DNS validation
dig setup.candlefish.ai
dig _validation.setup.candlefish.ai TXT
```

### Performance Optimization

#### Database Performance

```bash
# Check slow queries
aws logs filter-log-events \
  --log-group-name "/aws/rds/instance/tyler-setup-db/postgresql" \
  --filter-pattern "duration" \
  --start-time $(date -d '1 hour ago' +%s)000 \
  --region us-east-1

# Enable Performance Insights
aws rds modify-db-instance \
  --db-instance-identifier tyler-setup-db \
  --performance-insights-enabled \
  --region us-east-1
```

#### Application Performance

```bash
# Scale up ECS service if needed
aws ecs update-service \
  --cluster tyler-setup-cluster \
  --service tyler-setup-blue \
  --desired-count 4 \
  --region us-east-1

# Check memory usage
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name MemoryUtilization \
  --dimensions Name=ServiceName,Value=tyler-setup-blue Name=ClusterName,Value=tyler-setup-cluster \
  --start-time $(date -d '1 hour ago' --iso-8601) \
  --end-time $(date --iso-8601) \
  --period 300 \
  --statistics Average \
  --region us-east-1
```

---

## 📞 Emergency Contacts

### Escalation Path

1. **Level 1**: CloudWatch Alarms → SNS → Email alerts
2. **Level 2**: PagerDuty integration (if configured)
3. **Level 3**: Engineering team escalation
4. **Level 4**: CTO/Engineering leadership

### Key Contacts

- **DevOps Engineer**: [contact info]
- **Backend Lead**: [contact info]
- **Frontend Lead**: [contact info]
- **Security Team**: [contact info]
- **Infrastructure Team**: [contact info]

### Emergency Runbooks

- **Security Incident**: [link to security runbook]
- **Data Breach Response**: [link to breach response]
- **Disaster Recovery**: [link to DR procedures]

---

## 📈 Maintenance Schedule

### Daily Tasks
- [ ] Monitor CloudWatch dashboards
- [ ] Check error logs
- [ ] Verify backup completion
- [ ] Review security alerts

### Weekly Tasks
- [ ] Update dependencies
- [ ] Review performance metrics
- [ ] Check cost optimization
- [ ] Test backup restoration

### Monthly Tasks
- [ ] Rotate secrets
- [ ] Security audit review
- [ ] Performance optimization
- [ ] Disaster recovery test
- [ ] Cost analysis and optimization

---

## 💡 Best Practices

### Deployment Best Practices

1. **Always test in staging first**
2. **Use feature flags for risky changes**
3. **Monitor key metrics during deployment**
4. **Have rollback plan ready**
5. **Communicate changes to stakeholders**

### Security Best Practices

1. **Rotate secrets regularly**
2. **Monitor authentication failures**
3. **Keep dependencies updated**
4. **Regular security scans**
5. **Principle of least privilege**

### Performance Best Practices

1. **Monitor response times**
2. **Optimize database queries**
3. **Use caching effectively**
4. **Scale proactively**
5. **Regular performance reviews**

---

## 📚 Additional Resources

### Documentation Links

- **Terraform Documentation**: https://terraform.io/docs
- **AWS ECS Guide**: https://docs.aws.amazon.com/ecs/
- **CloudWatch Monitoring**: https://docs.aws.amazon.com/cloudwatch/
- **GitHub Actions**: https://docs.github.com/en/actions

### Internal Documentation

- **Architecture Overview**: `/docs/architecture.md`
- **API Documentation**: `/docs/api-reference.md`
- **Security Policies**: `/docs/security.md`
- **Development Guide**: `/docs/development.md`

### Monitoring URLs

- **CloudWatch Dashboard**: https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=tyler-setup-dashboard
- **Application**: https://setup.candlefish.ai
- **API Health**: https://api.setup.candlefish.ai/health
- **GraphQL Playground**: https://api.setup.candlefish.ai/graphql

---

## ✅ Deployment Completion Checklist

### Infrastructure
- [ ] VPC and networking configured
- [ ] RDS database running and accessible
- [ ] Redis cache cluster active
- [ ] ECS cluster with healthy services
- [ ] Load balancer routing traffic correctly
- [ ] CloudFront distribution serving frontend
- [ ] Route53 DNS records pointing correctly
- [ ] SSL certificates installed and valid

### Security
- [ ] WAF rules active and blocking threats
- [ ] Secrets properly configured in AWS Secrets Manager
- [ ] IAM roles and policies following least privilege
- [ ] Security groups restricting access appropriately
- [ ] GuardDuty enabled for threat detection
- [ ] CloudTrail logging all API calls

### Application
- [ ] Backend services responding to health checks
- [ ] Frontend loading and functional
- [ ] Authentication flow working
- [ ] GraphQL API accessible
- [ ] WebSocket connections functioning
- [ ] Database migrations completed
- [ ] Cache warming completed

### Monitoring
- [ ] CloudWatch dashboards created
- [ ] Alarms configured and tested
- [ ] Log aggregation working
- [ ] Performance metrics being collected
- [ ] Error tracking operational
- [ ] Cost monitoring active

### Testing
- [ ] Automated health checks passing
- [ ] Manual smoke tests completed
- [ ] Performance benchmarks met
- [ ] Security scans clean
- [ ] Load testing successful
- [ ] Rollback procedures tested

---

**🎉 Deployment Complete!**

Your Tyler Setup Platform is now live in production. Monitor the dashboards and be prepared to execute rollback procedures if any issues arise.

For questions or issues, refer to the troubleshooting section or contact the engineering team.

---

*Last updated: August 10, 2025*  
*Version: 2.0.0*  
*Next review: August 24, 2025*

# Candlefish.ai Terraform Infrastructure

Comprehensive Infrastructure as Code for the Candlefish operational atelier, built as a work of art with enterprise-grade reliability, security, and cost optimization.

## Architecture Overview

This Terraform infrastructure provides a complete, multi-region deployment capability for Candlefish.ai with the following characteristics:

- **Multi-region support** (us-east-1 primary, us-west-2 standby)
- **Auto-scaling** based on CPU, memory, and custom metrics
- **Cost optimization** with spot instances and intelligent resource sizing
- **Zero-downtime deployments** with blue-green capability
- **Infrastructure versioning** with remote state management

## Directory Structure

```
terraform/
├── modules/                    # Reusable Terraform modules
│   ├── cdn/                   # CloudFront CDN with Lambda@Edge
│   ├── compute/               # ECS Fargate, Lambda, Auto Scaling
│   ├── storage/               # S3, DynamoDB, ElastiCache, Aurora
│   ├── networking/            # VPC, Subnets, NAT, Transit Gateway
│   ├── security/              # IAM, KMS, Secrets Manager, WAF
│   └── monitoring/            # CloudWatch, X-Ray, SNS, Dashboards
├── environments/              # Environment-specific configurations
│   ├── dev/                   # Development environment
│   ├── staging/               # Staging environment  
│   └── production/            # Production environment
├── backend/                   # Remote state backend setup
└── docs/                      # Documentation and guides
```

## Quick Start

### 1. Bootstrap the Backend

```bash
cd terraform/backend
terraform init
terraform plan
terraform apply
```

### 2. Deploy Development Environment

```bash
cd terraform/environments/dev
terraform init -backend-config="../backend-config.hcl"
terraform plan
terraform apply
```

### 3. Deploy Staging/Production

```bash
cd terraform/environments/staging  # or production
terraform init -backend-config="../backend-config.hcl"
terraform plan -var-file="terraform.tfvars"
terraform apply -var-file="terraform.tfvars"
```

## Module Documentation

### CDN Module (`modules/cdn/`)

**Purpose**: CloudFront distribution optimized for the operational atelier

**Key Features**:
- Multiple cache behaviors for different content types
- WebGL asset optimization (no compression for binaries)
- Real-time logs with Kinesis integration
- Lambda@Edge support for dynamic content
- Security headers for operational telemetry

**Cost Optimization**:
- Configurable price class (PriceClass_100 for dev, PriceClass_All for prod)
- Intelligent caching strategies
- Compression for text-based assets

### Compute Module (`modules/compute/`)

**Purpose**: Containerized application hosting with serverless functions

**Key Features**:
- ECS Fargate with spot instances for cost optimization
- Auto-scaling based on CPU/memory utilization
- Lambda functions for serverless operations
- Application Load Balancer with health checks
- Blue-green deployment capability

**Cost Optimization**:
- Fargate Spot instances (up to 70% savings)
- Configurable resource allocation per environment
- Auto-shutdown capabilities for dev environments

### Storage Module (`modules/storage/`)

**Purpose**: Comprehensive data layer with multiple storage types

**Key Features**:
- S3 buckets with lifecycle policies and cross-region replication
- DynamoDB tables with auto-scaling and point-in-time recovery
- ElastiCache Redis for session storage and caching
- Aurora Serverless v2 for relational data (optional)

**Cost Optimization**:
- S3 Intelligent Tiering
- DynamoDB pay-per-request billing
- ElastiCache with reserved instances options
- Aurora auto-scaling from 0.5 to 16 ACU

### Networking Module (`modules/networking/`)

**Purpose**: Secure, scalable network foundation

**Key Features**:
- Multi-AZ VPC with public, private, database, and intra subnets
- NAT Gateways with high availability options
- VPC Endpoints to reduce data transfer costs
- Transit Gateway for multi-region connectivity
- Flow logs for security monitoring

**Cost Optimization**:
- Single NAT Gateway option for dev environments
- VPC Endpoints to reduce NAT Gateway costs
- Configurable availability zones per environment

### Security Module (`modules/security/`)

**Purpose**: Comprehensive security with encryption and access control

**Key Features**:
- KMS keys with automatic rotation
- Secrets Manager for sensitive configuration
- IAM roles with least-privilege access
- Security Groups with least-privilege networking
- CloudTrail, GuardDuty, and Config integration

**Cost Optimization**:
- Selective security services per environment
- Automated secret rotation
- Cost-aware logging and monitoring

### Monitoring Module (`modules/monitoring/`)

**Purpose**: Comprehensive observability and alerting

**Key Features**:
- CloudWatch dashboards for operational metrics
- X-Ray distributed tracing
- Custom metrics for business KPIs
- SNS alerting with multiple channels
- Synthetics canaries for uptime monitoring
- Cost budgets and anomaly detection

**Cost Optimization**:
- Tiered log retention based on environment
- Configurable monitoring depth
- Cost anomaly detection and budgeting

## Cost Estimation

### Development Environment

**Monthly Estimate: $50-100**

| Service | Cost | Configuration |
|---------|------|---------------|
| ECS Fargate (Spot) | $15-25 | 1x 256 CPU, 512 MB RAM |
| ElastiCache | $10 | cache.t3.micro |
| NAT Gateway | $15 | Single AZ |
| S3 Storage | $5 | 100 GB with lifecycle |
| DynamoDB | $2 | Pay per request, low usage |
| CloudWatch | $8 | Basic monitoring |
| Misc (KMS, etc.) | $5 | |

**Cost Optimizations**:
- 100% Fargate Spot instances
- Single NAT Gateway
- Minimal monitoring
- Short log retention (7 days)
- No security services (CloudTrail, GuardDuty)

### Staging Environment

**Monthly Estimate: $200-400**

| Service | Cost | Configuration |
|---------|------|---------------|
| ECS Fargate | $50-80 | 2x 512 CPU, 1024 MB RAM (70% Spot) |
| ElastiCache | $25 | cache.t3.small |
| NAT Gateways | $45 | Multi-AZ |
| S3 Storage | $15 | 500 GB with replication |
| DynamoDB | $10 | Pay per request, moderate usage |
| Aurora Serverless | $30-60 | 0.5-2.0 ACU |
| CloudWatch | $25 | Enhanced monitoring |
| Security Services | $20 | CloudTrail + Config |
| CDN | $10 | PriceClass_200 |
| Misc | $15 | |

**Cost Optimizations**:
- 70% Spot instances, 30% On-Demand
- Multi-AZ for reliability testing
- Enhanced monitoring for performance validation
- Selective security services

### Production Environment

**Monthly Estimate: $800-1500**

| Service | Cost | Configuration |
|---------|------|---------------|
| ECS Fargate | $200-400 | 3-20x 2048 CPU, 4096 MB RAM |
| ElastiCache | $150 | cache.r7g.large cluster |
| NAT Gateways | $135 | Multi-AZ + backup region |
| S3 Storage | $50 | 2TB with cross-region replication |
| DynamoDB | $50 | Provisioned + auto-scaling |
| Aurora Global | $200-400 | 1-16 ACU with global database |
| CloudWatch | $100 | Full monitoring + Synthetics |
| Security Services | $150 | Full security suite |
| CDN | $50 | PriceClass_All with Lambda@Edge |
| WAF | $30 | Web Application Firewall |
| Transit Gateway | $36 | Multi-region connectivity |
| Misc | $50 | |

**Performance Optimizations**:
- On-Demand instances for stability
- Multi-region deployment
- Comprehensive monitoring and alerting
- Full security compliance suite

## Migration Strategy

### Phase 1: Backend Setup (Week 1)

1. **Create Remote State Backend**
   ```bash
   cd terraform/backend
   terraform init
   terraform apply
   ```

2. **Migrate Existing State** (if applicable)
   ```bash
   terraform init -migrate-state
   ```

### Phase 2: Development Environment (Week 2)

1. **Deploy Dev Infrastructure**
   ```bash
   cd terraform/environments/dev
   terraform init
   terraform plan
   terraform apply
   ```

2. **Validate Deployment**
   - Test application deployment
   - Verify monitoring and alerting
   - Confirm cost optimization features

### Phase 3: Staging Environment (Week 3-4)

1. **Deploy Staging Infrastructure**
   ```bash
   cd terraform/environments/staging
   terraform init
   terraform apply -var-file="terraform.tfvars"
   ```

2. **Production-like Testing**
   - Load testing with realistic traffic
   - Disaster recovery testing
   - Security penetration testing
   - Performance optimization

### Phase 4: Production Deployment (Week 5-6)

1. **Deploy Production Infrastructure**
   ```bash
   cd terraform/environments/production
   terraform init
   terraform apply -var-file="terraform.tfvars"
   ```

2. **Blue-Green Cutover**
   - Deploy to new infrastructure
   - Update DNS records
   - Monitor for 48 hours
   - Decommission old infrastructure

### Phase 5: Optimization (Week 7-8)

1. **Cost Optimization Review**
   - Analyze actual vs. estimated costs
   - Right-size resources based on usage
   - Implement additional cost controls

2. **Performance Tuning**
   - Optimize based on production metrics
   - Fine-tune auto-scaling parameters
   - Enhance monitoring and alerting

## State Migration from Current Setup

### Current State Analysis

Before migration, analyze your current infrastructure:

```bash
# Document current resources
terraform show > current-infrastructure.txt

# Export resource list
terraform state list > current-resources.txt

# Check for any drift
terraform plan
```

### Migration Process

1. **Import Existing Resources** (if reusing)
   ```bash
   # Example: Import existing VPC
   terraform import module.networking.aws_vpc.main vpc-12345678
   
   # Import existing security groups
   terraform import module.security.aws_security_group.web_tier sg-12345678
   ```

2. **Gradual Migration**
   - Start with non-critical resources
   - Use aliases to avoid naming conflicts
   - Test each module independently

3. **Validation**
   ```bash
   # Verify no unintended changes
   terraform plan
   
   # Check resource dependencies
   terraform graph | dot -Tpng > infrastructure-graph.png
   ```

## Cost Monitoring and Optimization

### Automated Cost Controls

1. **Budget Alerts**
   - Monthly budget limits per environment
   - 80% and 100% threshold alerts
   - Anomaly detection for unusual spending

2. **Resource Scheduling**
   - Auto-shutdown for dev environments (weekends/nights)
   - Spot instance utilization
   - Reserved instance recommendations

3. **Cost Allocation Tags**
   ```hcl
   default_tags = {
     Project     = "Candlefish"
     Environment = var.environment
     CostCenter  = "Engineering"
     Owner       = "DevOps"
   }
   ```

### Ongoing Optimization

1. **Weekly Cost Review**
   - Analyze AWS Cost Explorer reports
   - Identify optimization opportunities
   - Right-size resources based on utilization

2. **Monthly Architecture Review**
   - Review auto-scaling metrics
   - Optimize database configurations
   - Update reserved instance strategy

## Disaster Recovery

### Backup Strategy

1. **State File Backups**
   - S3 versioning enabled
   - Cross-region replication to us-west-2
   - Point-in-time recovery capabilities

2. **Data Backups**
   - Aurora automated backups (30 days)
   - DynamoDB point-in-time recovery
   - S3 cross-region replication

### Recovery Procedures

1. **Infrastructure Recovery**
   ```bash
   # Restore from backup region
   terraform init -backend-config="region=us-west-2"
   terraform plan
   terraform apply
   ```

2. **Data Recovery**
   - Aurora: Restore from automated backup
   - DynamoDB: Point-in-time recovery
   - S3: Object versioning and replication

## Security Best Practices

### Implemented Security Controls

1. **Encryption at Rest**
   - All data encrypted with customer-managed KMS keys
   - Automatic key rotation enabled
   - Separate keys per service and environment

2. **Network Security**
   - Private subnets for application tiers
   - Security groups with least privilege
   - VPC Flow Logs for monitoring

3. **Access Control**
   - IAM roles with minimal permissions
   - Secrets Manager for sensitive data
   - OIDC for GitHub Actions integration

4. **Monitoring and Compliance**
   - CloudTrail for audit logging
   - GuardDuty for threat detection
   - Config for compliance monitoring

## Troubleshooting Guide

### Common Issues

1. **State Lock Conflicts**
   ```bash
   # Check for locks
   aws dynamodb scan --table-name candlefish-terraform-locks
   
   # Force unlock if needed
   terraform force-unlock <LOCK_ID>
   ```

2. **Resource Quotas**
   - Check AWS service quotas
   - Request increases if needed
   - Use different instance types if quota exceeded

3. **Permission Errors**
   - Verify IAM roles and policies
   - Check KMS key permissions
   - Validate cross-account trust relationships

### Performance Issues

1. **Slow Deployments**
   - Parallel resource creation where possible
   - Use `-parallelism=N` flag
   - Optimize provider configurations

2. **High Costs**
   - Review AWS Cost Explorer
   - Check for unused resources
   - Validate spot instance utilization

## Contributing

### Module Development

1. **Follow Naming Conventions**
   - Use descriptive resource names
   - Include environment and project prefixes
   - Follow Terraform best practices

2. **Documentation**
   - Update README.md for module changes
   - Include variable descriptions
   - Document output values

3. **Testing**
   - Test modules in dev environment first
   - Validate with `terraform plan`
   - Check for breaking changes

### Code Review Process

1. **Pre-commit Checks**
   - Run `terraform fmt`
   - Validate with `terraform validate`
   - Check security with `tfsec`

2. **Review Criteria**
   - Cost impact analysis
   - Security considerations
   - Performance implications
   - Backward compatibility

## Support and Maintenance

### Regular Maintenance Tasks

1. **Monthly**
   - Review and update provider versions
   - Check for security updates
   - Optimize costs based on usage patterns

2. **Quarterly**
   - Update module versions
   - Review disaster recovery procedures
   - Conduct security assessments

### Monitoring and Alerting

1. **Infrastructure Alerts**
   - High resource utilization
   - Failed deployments
   - Security violations

2. **Cost Alerts**
   - Budget threshold exceeded
   - Anomalous spending patterns
   - Unused resource detection

---

*This infrastructure represents the operational excellence and craft principles of Candlefish.ai - built not just for function, but as a work of art in systems architecture.*
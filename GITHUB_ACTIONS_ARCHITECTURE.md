# Candlefish GitHub Actions Architecture

## Overview

This document describes the comprehensive GitHub Actions workflow architecture for Candlefish, optimized for 16 projects across 4 categories with a 50,000 minutes/month budget on GitHub Enterprise.

## Architecture Components

### 1. Workflow Structure

```
.github/
├── workflows/
│   ├── candlefish-orchestrator.yml    # Main orchestrator workflow
│   ├── deploy-webapp.yml               # Reusable webapp deployment
│   ├── deploy-enterprise.yml           # Enterprise app deployment
│   ├── deploy-business.yml             # Business app deployment
│   ├── deploy-client.yml               # Client app deployment
│   ├── secrets-sync.yml                # AWS Secrets Manager sync
│   ├── monorepo-ci.yml                # CI pipeline
│   └── chaos-engineering.yml           # Chaos testing
├── actions/
│   └── setup-environment/              # Composite action for env setup
└── CODEOWNERS                         # Code ownership rules
```

### 2. Project Categories

| Category | Projects | Deployment Type | Infrastructure |
|----------|----------|-----------------|----------------|
| **Core** | cf, cfweb, cftyler | Static Site | S3 + CloudFront |
| **Enterprise** | cfpaint, cffogg, cfprom, cfbrew | Container | ECS Fargate |
| **Business** | cfcrown, cfbart, cfbart2, cfexcel | Static/PWA | S3 + CloudFront |
| **Client** | cfcolo, cfjon, cfmorr, cfnew | Static Site | S3 + CloudFront |

### 3. Key Features

#### Perfect Caching Strategy
- **Dependency Caching**: pnpm store, pip cache, cargo registry
- **Build Output Caching**: .next, dist, target directories
- **Turbo Remote Caching**: Shared build cache across runs
- **Docker Layer Caching**: BuildKit cache for container builds
- **Cache Hit Rates**: Target 80%+ cache hits

#### Security & Compliance
- **SAST**: Semgrep security scanning
- **Dependency Scanning**: Trivy vulnerability detection
- **Secret Detection**: TruffleHog for credential leaks
- **License Compliance**: Automated license checking
- **OWASP Top 10**: Security rule enforcement

#### Chaos Engineering
- **Network Chaos**: Latency and packet loss simulation
- **Resource Chaos**: CPU and memory pressure testing
- **Disk I/O Chaos**: Storage failure simulation
- **Application Chaos**: Service degradation testing

#### Cost Optimization
- **Concurrency Control**: Cancel duplicate runs
- **Matrix Strategies**: Parallel execution with fail-fast
- **Runner Selection**: Right-sized runners per job type
- **Conditional Execution**: Skip unchanged projects
- **Budget Tracking**: Real-time minute consumption monitoring

### 4. Environments

| Environment | Branch Trigger | Deployment Strategy | Resources |
|-------------|---------------|-------------------|-----------|
| **Dev** | feature/* | Automatic | Minimal (1 instance) |
| **Staging** | develop | Automatic | Standard (2 instances) |
| **Production** | main | Manual approval | Full (auto-scaling) |

### 5. Secrets Management

```yaml
AWS Secrets Manager (Primary)
├── candlefish/global/
│   ├── api-keys
│   ├── database-credentials
│   └── service-accounts
├── candlefish/production/
│   └── env-vars
├── candlefish/staging/
│   └── env-vars
└── candlefish/dev/
    └── env-vars

GitHub Secrets (Fallback)
├── AWS_ACCOUNT_ID
├── TURBO_TOKEN
├── DATADOG_API_KEY
└── SLACK_WEBHOOK
```

### 6. Infrastructure as Code

#### Terraform Modules
```hcl
modules/
├── github-oidc/       # GitHub OIDC provider
├── s3-cloudfront/     # Static site hosting
├── ecs-fargate/       # Container orchestration
└── monitoring/        # CloudWatch & alerts
```

#### Cost Breakdown (Monthly Estimate)
| Service | Dev | Staging | Production | Total |
|---------|-----|---------|------------|-------|
| CloudFront | $20 | $30 | $45 | $95 |
| S3 Storage | $5 | $8 | $12 | $25 |
| ECS Fargate | $40 | $80 | $120 | $240 |
| RDS | $30 | $50 | $85 | $165 |
| Monitoring | $5 | $10 | $15 | $30 |
| **Total** | $100 | $178 | $277 | **$555** |

### 7. Performance Metrics

#### Target SLAs
- **Build Time**: < 5 minutes for webapp, < 10 minutes for enterprise
- **Deployment Time**: < 3 minutes for S3, < 5 minutes for ECS
- **Cache Hit Rate**: > 80% for dependencies, > 60% for builds
- **Test Execution**: < 5 minutes with 4-way parallelization
- **Total Pipeline**: < 15 minutes end-to-end

#### GitHub Actions Budget
```
Total Monthly Budget: 50,000 minutes
├── CI Pipelines: 20,000 minutes (40%)
├── Deployments: 15,000 minutes (30%)
├── Security Scans: 5,000 minutes (10%)
├── Chaos Testing: 2,000 minutes (4%)
├── Monitoring: 1,000 minutes (2%)
└── Buffer: 7,000 minutes (14%)
```

### 8. Monitoring & Observability

#### Metrics Collection
- **CloudWatch**: Application metrics and logs
- **DataDog**: APM and distributed tracing
- **GitHub Insights**: Workflow performance analytics
- **Cost Explorer**: AWS spending analysis

#### Alerting Rules
| Alert | Threshold | Action |
|-------|-----------|--------|
| Build Failure | 2 consecutive | Slack notification |
| Deployment Failure | Any | PagerDuty incident |
| Cost Overrun | 80% budget | Email warning |
| Performance Degradation | >20% slower | Investigation ticket |

### 9. Disaster Recovery

#### Backup Strategy
- **Code**: GitHub (primary), AWS CodeCommit (mirror)
- **Artifacts**: S3 versioning with 30-day retention
- **Database**: Automated RDS snapshots
- **Secrets**: AWS Secrets Manager with rotation

#### Recovery Time Objectives
- **RTO**: 1 hour for production, 4 hours for staging
- **RPO**: 15 minutes for data, 0 for code

### 10. Implementation Checklist

#### Phase 1: Foundation (Week 1)
- [ ] Set up AWS account and IAM roles
- [ ] Configure GitHub OIDC provider
- [ ] Deploy Terraform infrastructure
- [ ] Set up secrets management

#### Phase 2: Core Workflows (Week 2)
- [ ] Implement orchestrator workflow
- [ ] Create project-specific workflows
- [ ] Set up caching strategies
- [ ] Configure deployment pipelines

#### Phase 3: Security & Quality (Week 3)
- [ ] Add security scanning
- [ ] Implement chaos engineering
- [ ] Set up monitoring
- [ ] Configure alerting

#### Phase 4: Optimization (Week 4)
- [ ] Tune cache configurations
- [ ] Optimize runner selection
- [ ] Implement cost controls
- [ ] Document runbooks

## Usage Examples

### Deploy Single Project
```bash
gh workflow run candlefish-orchestrator.yml \
  -f environment=staging \
  -f projects=cfpaint
```

### Deploy All Projects
```bash
gh workflow run candlefish-orchestrator.yml \
  -f environment=production \
  -f projects=all
```

### Run Chaos Testing
```bash
gh workflow run chaos-engineering.yml \
  -f target=cfprom \
  -f chaos-type=network-delay
```

### Sync Secrets
```bash
gh workflow run secrets-sync.yml
```

## Cost Optimization Tips

1. **Use Conditional Workflows**: Only run on changed code
2. **Implement Caching**: Reduce redundant work
3. **Parallelize Tests**: Faster feedback, same cost
4. **Right-size Runners**: Don't over-provision
5. **Schedule Non-critical**: Run expensive jobs off-peak
6. **Monitor Usage**: Track minutes consumption weekly
7. **Cleanup Artifacts**: Set retention policies

## Security Best Practices

1. **OIDC over Secrets**: Use AWS OIDC for authentication
2. **Least Privilege**: Minimal IAM permissions
3. **Secret Rotation**: Automated 30-day rotation
4. **Dependency Updates**: Weekly security patches
5. **Audit Logging**: CloudTrail for all actions
6. **Environment Isolation**: Separate AWS accounts

## Support & Maintenance

### Troubleshooting
1. Check workflow logs in GitHub Actions tab
2. Review CloudWatch logs for deployment issues
3. Verify AWS permissions and quotas
4. Check cache hit rates and optimize keys

### Regular Maintenance
- **Weekly**: Review failed workflows, update dependencies
- **Monthly**: Analyze costs, rotate secrets, update documentation
- **Quarterly**: Security audit, performance review, chaos testing

### Contact
- **Engineering**: eng@candlefish.ai
- **DevOps On-call**: ops@candlefish.ai
- **Slack**: #github-actions

## Conclusion

This architecture provides a robust, scalable, and cost-effective CI/CD solution for Candlefish's 16 projects. With perfect caching, comprehensive security, and intelligent cost optimization, it delivers enterprise-grade capabilities within startup budget constraints.

The system is designed to scale from current needs to 10x growth without major restructuring, ensuring long-term sustainability and maintainability.

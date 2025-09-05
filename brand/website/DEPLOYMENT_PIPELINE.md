# Candlefish AI - Comprehensive CI/CD Pipeline
## Zero-Downtime Deployment System

This documentation describes the comprehensive CI/CD pipeline implemented for the Candlefish website, designed as **choreographed performances** that treat infrastructure changes as carefully orchestrated events.

---

## 🎭 Architecture Overview

The deployment pipeline is designed around theatrical metaphors, where each deployment is a **performance** with distinct acts, scenes, and supporting cast:

### Core Philosophy
- **Performance-Based**: Each deployment is a choreographed performance
- **Zero Downtime**: All deployments ensure continuous service availability
- **Multiple Strategies**: Support for canary, blue-green, and rolling deployments
- **Comprehensive Monitoring**: Full observability throughout the deployment lifecycle
- **Instant Rollback**: Emergency rollback capabilities within seconds

---

## 🎯 Deployment Strategies

### 1. Canary Deployment (🕊️ Performance)
**Progressive traffic shifting: 5% → 25% → 50% → 100%**

```bash
# Execute canary deployment
./scripts/deploy-canary.sh --image your-image:tag

# Monitor canary performance
kubectl get pods -n production -l version=canary
```

**Characteristics:**
- **Duration**: 15-20 minutes for full rollout
- **Risk**: Lowest - gradual exposure to issues
- **Rollback**: Automatic on metrics threshold breach
- **Use Cases**: Major feature releases, infrastructure changes

**Traffic Flow:**
```
User Traffic
    ↓
Load Balancer
    ↓
┌─────────────────┐    ┌─────────────────┐
│   Stable 95%    │ ←→ │   Canary 5%     │
│   (Blue/Green)  │    │   (New Version) │
└─────────────────┘    └─────────────────┘
```

### 2. Blue-Green Deployment (🔵🟢 Performance)
**Instant traffic switching with parallel environments**

```bash
# Execute blue-green deployment
./scripts/deploy-blue-green.sh --image your-image:tag

# Manual promotion (if auto-promotion disabled)
kubectl patch service candlefish-website -p '{"spec":{"selector":{"version":"green"}}}'
```

**Characteristics:**
- **Duration**: 5-10 minutes for full deployment
- **Risk**: Medium - instant full traffic switch
- **Rollback**: Instant (service selector change)
- **Use Cases**: Critical fixes, database migrations

**Environment Flow:**
```
┌─────────────┐                    ┌─────────────┐
│    Blue     │  ←── Traffic ───→  │   Green     │
│ (Current)   │                    │ (New Build) │
│ Version 1.0 │                    │ Version 1.1 │
└─────────────┘                    └─────────────┘
                     Switch
                       ↓
┌─────────────┐                    ┌─────────────┐
│    Blue     │                    │   Green     │
│ (Previous)  │      Traffic ───→  │ (Current)   │
│ Version 1.0 │                    │ Version 1.1 │
└─────────────┘                    └─────────────┘
```

### 3. Rolling Deployment (🎯 Performance)
**Sequential pod replacement with health checks**

```bash
# Execute rolling deployment
kubectl apply -f k8s/
kubectl rollout status deployment/candlefish-website
```

**Characteristics:**
- **Duration**: 3-7 minutes
- **Risk**: Highest - no parallel environment
- **Rollback**: Via Kubernetes rollout undo
- **Use Cases**: Minor updates, configuration changes

---

## 📋 GitHub Actions Workflows

### 1. Production Deployment (`deploy-production.yml`)
**Main production deployment pipeline**

```yaml
# Triggered by: Push to main branch
# Strategy: Configurable (canary/blue-green/rolling)
# Features: Full testing, security scanning, performance validation
```

**Pipeline Stages:**
1. **Pre-flight Orchestration** - Security scans, change detection
2. **Quality Assurance Performance** - Comprehensive test suite
3. **Image Crafting** - Container build and vulnerability scanning
4. **Deployment Performance** - Strategy-based deployment execution
5. **Performance Validation** - Post-deployment verification
6. **Performance Finale** - Cleanup and notifications

**Manual Override Options:**
```bash
# Emergency deployment (skip tests)
gh workflow run deploy-production.yml -f skip_tests=true -f deployment_strategy=rolling

# Force canary deployment
gh workflow run deploy-production.yml -f deployment_strategy=canary
```

### 2. Staging Deployment (`deploy-staging.yml`)
**Rehearsal performance for production readiness**

```yaml
# Triggered by: Push to develop, feature branches, PRs
# Strategy: Rolling deployment with validation
# Features: Fast feedback, PR integration
```

**Key Features:**
- Automatic PR comments with staging URLs
- Reduced test suite for faster feedback
- Environment-specific configuration
- Auto-cleanup of old deployments

### 3. PR Preview (`pr-preview.yml`)
**Performance preview for code reviews**

```yaml
# Triggered by: PR creation, updates, closure
# Platform: Netlify + AWS Lambda (API preview)
# Features: Ephemeral environments, auto-cleanup
```

**Preview Components:**
- **Frontend**: Netlify deployment with custom domain
- **API**: AWS Lambda + API Gateway stack
- **Database**: DynamoDB with TTL
- **Assets**: S3 bucket with lifecycle rules

**Cleanup Automation:**
- PR closure triggers resource cleanup
- 7-day automatic expiration
- CloudFormation stack deletion

### 4. Security Scanning (`security-scan.yml`)
**Defense performance with comprehensive security validation**

```yaml
# Triggered by: Daily schedule, dependency changes, manual
# Scan Levels: quick, standard, deep
# Tools: CodeQL, Snyk, Trivy, TruffleHog, GitLeaks
```

**Security Checks:**
- **Dependency Vulnerabilities**: npm audit, Snyk
- **Code Security**: CodeQL, Semgrep, ESLint security rules
- **Container Security**: Trivy filesystem/image scans
- **Secret Detection**: TruffleHog, GitLeaks
- **SSL/TLS**: Certificate expiry, configuration grade

### 5. Performance Testing (`performance-test.yml`)
**Load performance with comprehensive benchmarking**

```yaml
# Triggered by: Nightly, code changes, manual
# Tools: Lighthouse, K6, Playwright
# Environments: Staging, Production
```

**Performance Matrix:**
- **Lighthouse Audits**: Desktop/mobile performance scores
- **Load Testing**: K6 scenarios (basic, load, stress, spike)
- **User Experience**: Playwright end-to-end performance
- **Regression Detection**: Baseline comparison and alerting

---

## 🔧 Deployment Scripts

### Core Deployment Scripts

#### 1. Canary Deployment (`deploy-canary.sh`)
```bash
# Progressive traffic shifting with automatic rollback
./scripts/deploy-canary.sh --image your-image:latest \
    --environment production \
    --step-duration 300 \
    --no-rollback
```

**Features:**
- Configurable traffic steps (default: 5%, 25%, 50%, 100%)
- Real-time metrics monitoring
- Automatic rollback on threshold breach
- Slack notifications for each step
- Detailed deployment reporting

#### 2. Blue-Green Deployment (`deploy-blue-green.sh`)
```bash
# Instant traffic switching with parallel environments
./scripts/deploy-blue-green.sh --image your-image:latest \
    --environment production \
    --warm-up-time 120 \
    --manual-promotion
```

**Features:**
- Parallel environment deployment
- Comprehensive smoke testing
- Instant traffic switching
- Manual or automatic promotion
- Zero-downtime guarantee

#### 3. Health Checks (`health-checks.sh`)
```bash
# Comprehensive system health validation
./scripts/health-checks.sh all \
    --environment production \
    --response-time-threshold 2000 \
    --max-retries 3
```

**Health Categories:**
- **HTTP Endpoints**: Main site, API, health checks
- **Infrastructure**: Kubernetes, resources, databases
- **Security**: SSL certificates, configurations
- **External Dependencies**: Third-party service availability

#### 4. Deployment Verification (`verify-deployment.sh`)
```bash
# Post-deployment comprehensive verification
./scripts/verify-deployment.sh \
    --environment production \
    --min-success-rate 95 \
    --timeout 600
```

**Verification Tests:**
- Basic connectivity and health endpoints
- Critical user journey validation
- Performance characteristics testing
- SSL certificate verification
- Load handling capabilities

#### 5. Emergency Rollback (`emergency-rollback.sh`)
```bash
# Instant rollback to previous stable version
./scripts/emergency-rollback.sh \
    --environment production \
    --force
```

**Rollback Capabilities:**
- CloudFront cache invalidation
- Kubernetes deployment rollback
- Lambda function version reversion
- Traffic restoration verification
- Comprehensive rollback reporting

---

## 🔐 Secret Management

### GitHub Repository Secrets

**Required Secrets:**
```yaml
# AWS Configuration
AWS_DEPLOY_ROLE_ARN: "arn:aws:iam::ACCOUNT:role/github-actions-deploy"
AWS_REGION: "us-east-1"

# Slack Notifications
SLACK_WEBHOOK_URL: "https://hooks.slack.com/services/..."
SLACK_SECURITY_WEBHOOK_URL: "https://hooks.slack.com/services/..."

# Netlify Integration
NETLIFY_AUTH_TOKEN: "netlify-auth-token"
NETLIFY_PREVIEW_SITE_ID: "preview-site-id"

# Security Scanning
SNYK_TOKEN: "snyk-api-token"

# Monitoring
DATADOG_API_KEY: "datadog-api-key"
```

### Environment-Specific Secrets

**Production Environment:**
- Database connection strings
- Redis URLs
- JWT secrets
- API keys (Stripe, SendGrid, OpenAI, Anthropic)
- External service credentials

**Staging Environment:**
- Staging database connections
- Test API keys
- Development service credentials

### AWS Secrets Manager Integration

**Automatic Secret Rotation:**
```bash
# Secrets are automatically rotated and synced
# Applications retrieve secrets at runtime
# No hardcoded secrets in containers
```

---

## 📊 Monitoring & Alerting

### Performance Monitoring

**Lighthouse Thresholds:**
- **Performance Score**: >85 (desktop), >75 (mobile)
- **First Contentful Paint**: <1.8s (desktop), <2.2s (mobile)
- **Largest Contentful Paint**: <2.5s (desktop), <3.5s (mobile)
- **Cumulative Layout Shift**: <0.1

**Load Testing Targets:**
- **Concurrent Users**: 1000 users sustained
- **Response Time**: P95 <2s, P99 <5s
- **Error Rate**: <1%
- **Throughput**: >100 req/sec

### Alert Channels

**Slack Integration:**
- Deployment status notifications
- Security alerts
- Performance degradation warnings
- Emergency rollback notifications

**Monitoring Dashboard:**
- Real-time deployment status
- Performance metrics visualization
- Error rate tracking
- Infrastructure health overview

---

## 🚀 Deployment Workflows

### Standard Production Deployment

```bash
# 1. Code merge to main branch
git checkout main
git pull origin main

# 2. Automatic pipeline trigger
# - Security scanning
# - Comprehensive testing
# - Container image build
# - Vulnerability scanning

# 3. Deployment execution (canary by default)
# - 5% traffic to new version
# - Monitor for 5 minutes
# - 25% traffic progression
# - Continue through 50% to 100%

# 4. Verification and cleanup
# - Health check validation
# - Performance verification
# - Old version cleanup
```

### Emergency Hotfix Deployment

```bash
# 1. Create hotfix branch
git checkout -b hotfix/critical-fix main

# 2. Make minimal changes
# ... implement fix ...

# 3. Push with hotfix marker
git commit -m "[hotfix] Critical security patch"
git push origin hotfix/critical-fix

# 4. Manual deployment trigger (rolling strategy)
gh workflow run deploy-production.yml \
    -f deployment_strategy=rolling \
    -f skip_tests=false \
    --ref hotfix/critical-fix

# 5. Monitor and verify
./scripts/verify-deployment.sh --environment production
```

### Feature Preview Deployment

```bash
# 1. Create feature branch and PR
git checkout -b feature/new-component main
# ... implement feature ...
git push origin feature/new-component

# 2. Create PR (automatic preview deployment)
gh pr create --title "New component implementation"

# 3. Preview URLs automatically posted to PR
# - Frontend: https://pr-123.preview.candlefish.ai
# - API: https://api-pr-123.preview.candlefish.ai

# 4. Review and merge
gh pr merge --squash
```

---

## 🔄 Rollback Procedures

### Automatic Rollback Triggers

**Performance Degradation:**
- Response time >2x baseline
- Error rate >5%
- Success rate <95%
- Resource utilization >90%

**Health Check Failures:**
- Critical endpoints returning errors
- Database connectivity issues
- SSL certificate problems

### Manual Rollback Procedures

#### 1. Immediate Rollback (Blue-Green)
```bash
# Switch traffic back to previous version (instant)
kubectl patch service candlefish-website \
    -p '{"spec":{"selector":{"version":"blue"}}}'

# Verify rollback success
curl -f https://candlefish.ai/health
```

#### 2. Gradual Rollback (Canary)
```bash
# Reduce new version traffic to 0%
kubectl patch virtualservice candlefish-website-traffic-split \
    --patch '{"spec":{"http":[{"route":[{"destination":{"subset":"canary"},"weight":0},{"destination":{"subset":"stable"},"weight":100}]}]}}'
```

#### 3. Emergency Rollback (All Strategies)
```bash
# Execute comprehensive emergency rollback
./scripts/emergency-rollback.sh --environment production --force

# This will:
# - Invalidate CloudFront cache
# - Rollback Kubernetes deployments
# - Revert Lambda function versions
# - Restore database backups (if needed)
# - Send emergency notifications
```

---

## 📈 Performance Optimization

### Container Optimization
- Multi-stage Docker builds
- Layer caching optimization
- Security scanning integration
- Minimal base images (Alpine/Distroless)

### CDN Configuration
- CloudFront edge caching
- Automatic cache invalidation
- Geographic distribution
- Performance monitoring

### Database Optimization
- Connection pooling
- Read replica utilization
- Query optimization
- Backup automation

### Resource Management
- Horizontal pod autoscaling
- Vertical pod autoscaling
- Resource limits and requests
- Node affinity rules

---

## 🔍 Troubleshooting

### Common Issues

#### 1. Deployment Stuck in Progress
```bash
# Check deployment status
kubectl rollout status deployment/candlefish-website -n production

# Check pod events
kubectl get events -n production --sort-by='.lastTimestamp'

# Check pod logs
kubectl logs -f deployment/candlefish-website -n production

# Force restart if needed
kubectl rollout restart deployment/candlefish-website -n production
```

#### 2. Health Check Failures
```bash
# Run comprehensive health check
./scripts/health-checks.sh all --environment production

# Check specific component
./scripts/health-checks.sh http --domain candlefish.ai

# Review health check logs
tail -f health-check.log
```

#### 3. Performance Degradation
```bash
# Run performance verification
./scripts/verify-deployment.sh --environment production

# Check resource utilization
kubectl top nodes
kubectl top pods -n production

# Review performance metrics
./scripts/health-checks.sh infrastructure
```

#### 4. Rollback Issues
```bash
# Check rollback history
kubectl rollout history deployment/candlefish-website -n production

# Manual rollback to specific revision
kubectl rollout undo deployment/candlefish-website -n production --to-revision=2

# Emergency full rollback
./scripts/emergency-rollback.sh --environment production
```

---

## 📚 Operational Playbooks

### Pre-Deployment Checklist
- [ ] All tests passing in CI
- [ ] Security scans completed
- [ ] Performance benchmarks acceptable
- [ ] Database migrations tested
- [ ] Rollback plan documented
- [ ] Monitoring alerts configured
- [ ] Stakeholders notified

### Post-Deployment Checklist
- [ ] All health checks passing
- [ ] Performance within thresholds
- [ ] No error spikes in monitoring
- [ ] User-facing functionality verified
- [ ] Database performance stable
- [ ] CDN cache warming completed
- [ ] Documentation updated

### Emergency Response
1. **Detection**: Automated alerts or manual observation
2. **Assessment**: Determine impact and scope
3. **Communication**: Notify team via Slack/PagerDuty
4. **Rollback Decision**: Execute if critical impact
5. **Investigation**: Root cause analysis
6. **Resolution**: Implement permanent fix
7. **Post-Mortem**: Document lessons learned

---

## 🎯 Key Performance Indicators

### Deployment Metrics
- **Deployment Frequency**: Target >1 per day
- **Lead Time**: <30 minutes from commit to production
- **Recovery Time**: <5 minutes for rollback
- **Change Failure Rate**: <5%

### System Reliability
- **Uptime**: >99.9% availability
- **Response Time**: P95 <2 seconds
- **Error Rate**: <0.1%
- **Throughput**: >1000 requests/minute

### Security Metrics
- **Vulnerability Detection**: <24 hours
- **Security Scan Coverage**: 100%
- **Secret Rotation**: Monthly
- **Compliance Score**: >95%

---

## 🔮 Future Enhancements

### Planned Features
- **GitOps Integration**: ArgoCD/Flux for declarative deployments
- **Chaos Engineering**: Automated failure injection testing
- **Advanced Observability**: Distributed tracing, custom metrics
- **Multi-Region Deployment**: Global traffic distribution
- **AI-Powered Operations**: Predictive scaling, anomaly detection

### Roadmap
- **Q4 2024**: Progressive delivery enhancements
- **Q1 2025**: Multi-cluster deployment support
- **Q2 2025**: Advanced security automation
- **Q3 2025**: AI-driven operational insights

---

## 📞 Support & Contacts

### Team Contacts
- **DevOps Team**: devops@candlefish.ai
- **Security Team**: security@candlefish.ai
- **On-Call Engineer**: Available via Slack #ops-alerts

### Emergency Procedures
- **Slack**: #ops-emergency
- **PagerDuty**: https://candlefish.pagerduty.com
- **War Room**: https://meet.google.com/candlefish-emergency

### Documentation Links
- **AWS Console**: https://console.aws.amazon.com
- **Kubernetes Dashboard**: https://k8s.candlefish.ai
- **Monitoring Dashboard**: https://grafana.candlefish.ai
- **Status Page**: https://status.candlefish.ai

---

*This deployment pipeline documentation is maintained by the Candlefish DevOps team and updated with each major release.*

**Last Updated**: September 2024  
**Version**: 1.0.0  
**Next Review**: December 2024
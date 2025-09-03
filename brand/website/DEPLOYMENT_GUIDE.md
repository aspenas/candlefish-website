# Candlefish Animation Production Deployment Guide

## Overview

This guide covers the comprehensive production deployment setup for the enhanced Candlefish bioluminescent animation with emotional AI, personality persistence, and real-time analytics.

## Architecture Overview

### System Components

1. **Enhanced Canvas 2D Animation Engine**
   - Emotional state machine with 6 distinct moods
   - LocalStorage-based memory and trust system
   - Progressive enhancement with fallback to static SVG

2. **Backend Analytics Infrastructure**
   - AWS Lambda functions for real-time processing
   - DynamoDB for analytics and memory persistence
   - API Gateway for CORS-enabled REST endpoints

3. **Real-time Communication**
   - WebSocket connections for live data streaming
   - CloudWatch metrics integration
   - A/B testing configuration management

4. **Edge Optimization**
   - CloudFront CDN with optimized caching rules
   - Blue-green deployment capability
   - Geographic distribution with low latency

## Deployment Files Structure

```
brand/website/
├── .github/workflows/
│   └── candlefish-production-deploy.yml    # Main CI/CD pipeline
├── terraform/
│   ├── main.tf                             # Base infrastructure
│   └── candlefish-animation.tf             # Animation-specific resources
├── scripts/
│   ├── emergency-rollback.sh               # Emergency rollback script
│   └── verify-deployment.sh                # Post-deployment verification
├── monitoring/
│   └── grafana-dashboard.json              # Grafana monitoring dashboard
├── lambda/
│   └── candlefish-analytics.js             # Analytics processing function
└── lib/
    └── ab-testing-config.ts                # A/B testing configuration
```

## Pre-Deployment Setup

### 1. Environment Variables

Set the following environment variables in your CI/CD system:

```bash
# AWS Configuration
AWS_ACCESS_KEY_ID=<your-access-key>
AWS_SECRET_ACCESS_KEY=<your-secret-key>
AWS_REGION=us-east-1

# Domain Configuration
DOMAIN_NAME=candlefish.ai
ENVIRONMENT=production

# Monitoring
DATADOG_API_KEY=<your-datadog-api-key>
DATADOG_APP_KEY=<your-datadog-app-key>
GRAFANA_API_KEY=<your-grafana-api-key>

# Notifications
SLACK_WEBHOOK_URL=<your-slack-webhook>

# CloudFront Distribution IDs (set after initial deployment)
CLOUDFRONT_DISTRIBUTION_ID=<your-distribution-id>
```

### 2. AWS IAM Permissions

Ensure your deployment user has the following permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:*",
        "cloudfront:*",
        "lambda:*",
        "apigateway:*",
        "dynamodb:*",
        "iam:*",
        "cloudwatch:*",
        "sns:*",
        "wafv2:*",
        "acm:*",
        "route53:*"
      ],
      "Resource": "*"
    }
  ]
}
```

## Deployment Process

### Step 1: Infrastructure Provisioning

1. **Initialize Terraform:**
   ```bash
   cd terraform/
   terraform init
   ```

2. **Plan Infrastructure:**
   ```bash
   terraform plan -var="environment=production"
   ```

3. **Apply Infrastructure:**
   ```bash
   terraform apply -var="environment=production"
   ```

### Step 2: Lambda Function Deployment

1. **Package Lambda Function:**
   ```bash
   cd lambda/
   zip -r candlefish-analytics.zip candlefish-analytics.js
   ```

2. **Deploy via AWS CLI:**
   ```bash
   aws lambda create-function \
     --function-name production-candlefish-analytics-processor \
     --runtime nodejs18.x \
     --role arn:aws:iam::ACCOUNT_ID:role/production-candlefish-lambda-role \
     --handler candlefish-analytics.handler \
     --zip-file fileb://candlefish-analytics.zip
   ```

### Step 3: Application Deployment

The GitHub Actions workflow (`candlefish-production-deploy.yml`) handles:

1. **Quality Assurance Pipeline:**
   - Unit tests with 80% coverage requirement
   - Integration tests for animation components
   - Performance tests (55+ FPS requirement)
   - Accessibility compliance checks
   - Visual regression testing

2. **Build & Optimization:**
   - Next.js static export with tree shaking
   - Asset compression and optimization
   - Service worker generation for offline support
   - Bundle size analysis and reporting

3. **Blue-Green Deployment:**
   - Deploy to inactive environment
   - Smoke testing and health checks
   - Traffic switching with validation
   - Automatic rollback on failure

### Step 4: Monitoring Setup

1. **Import Grafana Dashboard:**
   ```bash
   curl -X POST "https://api.grafana.com/dashboards" \
     -H "Authorization: Bearer $GRAFANA_API_KEY" \
     -H "Content-Type: application/json" \
     -d @monitoring/grafana-dashboard.json
   ```

2. **Configure CloudWatch Alarms:**
   - FPS degradation alerts (< 30 FPS)
   - Memory usage alerts (> 50MB)
   - Error rate alerts (> 5%)
   - High latency alerts (> 3 seconds)

## A/B Testing Configuration

### Available Experiments

1. **Emotional Complexity Levels:**
   - Basic: 3 emotional states (30% allocation)
   - Standard: 6 emotional states (50% allocation)
   - Advanced: Enhanced AI with learning (20% allocation)

2. **Trust Building Rates:**
   - Slow: 0.7x multiplier (25% allocation)
   - Standard: 1.0x multiplier (50% allocation)
   - Fast: 1.3x multiplier (25% allocation)

3. **Visual Effects Richness:**
   - Minimal: Basic animation (25% allocation)
   - Standard: Balanced effects (50% allocation)
   - Rich: All effects enabled (25% allocation)

4. **Memory Persistence Strategy:**
   - Local Only: Browser storage (40% allocation)
   - Hybrid: Local + server backup (40% allocation)
   - Cloud Sync: Cross-device sync (20% allocation)

### Testing Framework Usage

```typescript
import { ABTestingManager, UserSegmentDetector } from './lib/ab-testing-config';

// Initialize A/B testing
const abTesting = new ABTestingManager('/api/analytics');
const userSegment = UserSegmentDetector.detectSegment();

// Get user configuration
const config = abTesting.getUserConfiguration(userSegment);

// Apply configuration to animation
if (config.emotional_complexity?.variant === 'advanced') {
  // Enable advanced emotional AI features
}

// Track conversions
abTesting.trackConversion('emotional_complexity', userSegment.sessionId, 'trust_milestone_50');
```

## Performance Targets

### Animation Performance
- **FPS Target:** 60 FPS (minimum 55 FPS)
- **Memory Usage:** < 50MB peak
- **Load Time:** < 2 seconds initial load
- **Frame Drops:** < 1% of frames

### Infrastructure Performance
- **API Response Time:** < 100ms (p95)
- **CDN Cache Hit Rate:** > 95%
- **Error Rate:** < 0.1%
- **Uptime:** 99.9% availability

### User Engagement Metrics
- **Session Duration:** Target > 60 seconds
- **Interaction Rate:** > 80% of sessions
- **Return Rate:** > 30% within 7 days
- **Trust Progression:** Average 50+ points per session

## Monitoring & Alerting

### Key Metrics Dashboard

1. **Animation Performance:**
   - Real-time FPS monitoring
   - Memory usage trends
   - Error rates and recovery

2. **User Engagement:**
   - Emotional state distribution
   - Trust level progression
   - Interaction patterns by time

3. **Infrastructure Health:**
   - API response times
   - Database performance
   - CDN efficiency metrics

### Alert Conditions

- **Critical:** FPS < 30 for > 5 minutes
- **Warning:** Memory usage > 40MB
- **Critical:** Error rate > 5%
- **Warning:** Trust progression < 20 points/session

## Emergency Procedures

### Rollback Process

1. **Automatic Rollback Triggers:**
   - FPS degradation > 50%
   - Error rate > 10%
   - Memory leaks detected
   - Critical animation failures

2. **Manual Rollback:**
   ```bash
   # Emergency rollback script
   ./scripts/emergency-rollback.sh --environment production --force
   ```

3. **Verification:**
   ```bash
   # Post-rollback verification
   ./scripts/verify-deployment.sh --environment production
   ```

### Incident Response

1. **Immediate Actions:**
   - Check monitoring dashboards
   - Review error logs in CloudWatch
   - Execute rollback if necessary
   - Notify stakeholders via Slack

2. **Investigation:**
   - Analyze performance metrics
   - Review user session recordings
   - Check infrastructure status
   - Document findings

3. **Recovery:**
   - Implement fixes in staging
   - Conduct thorough testing
   - Deploy with careful monitoring
   - Post-mortem analysis

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing (unit, integration, E2E)
- [ ] Performance benchmarks meet targets
- [ ] Security audit completed
- [ ] Infrastructure changes reviewed
- [ ] Rollback plan documented

### During Deployment
- [ ] Blue-green deployment successful
- [ ] Smoke tests pass in new environment
- [ ] Traffic routing verified
- [ ] Monitoring dashboards updated
- [ ] Alert thresholds configured

### Post-Deployment
- [ ] Real user monitoring active
- [ ] A/B test experiments running
- [ ] Performance metrics within targets
- [ ] Error rates below thresholds
- [ ] User feedback monitoring

## Troubleshooting

### Common Issues

1. **Animation Performance Degradation:**
   - Check browser compatibility
   - Review memory usage patterns
   - Validate WebGL fallback
   - Monitor frame rate consistency

2. **A/B Test Configuration Errors:**
   - Verify experiment allocations sum to 100%
   - Check user segmentation logic
   - Validate conversion tracking
   - Review experiment status

3. **Memory Persistence Issues:**
   - Check localStorage availability
   - Verify DynamoDB connectivity
   - Review trust level calculations
   - Monitor data synchronization

### Debug Commands

```bash
# Check deployment status
kubectl get deployments -n production

# View CloudWatch logs
aws logs tail /aws/lambda/production-candlefish-analytics-processor

# Test API endpoints
curl -X GET https://api.candlefish.ai/health

# Verify DNS resolution
dig candlefish.ai
```

## Security Considerations

1. **Data Privacy:**
   - User interactions are anonymized
   - Memory data uses hashed identifiers
   - GDPR compliance for EU users
   - Data retention policies enforced

2. **API Security:**
   - WAF rules for DDoS protection
   - Rate limiting per IP address
   - CORS restrictions in place
   - SSL/TLS encryption required

3. **Infrastructure Security:**
   - VPC network isolation
   - Security group restrictions
   - IAM least privilege access
   - Regular security updates

## Cost Optimization

### AWS Resources
- **Lambda:** Pay per execution model
- **DynamoDB:** On-demand billing
- **CloudFront:** Edge caching reduces origin load
- **S3:** Intelligent tiering for assets

### Estimated Monthly Costs
- Lambda Functions: ~$50/month
- DynamoDB: ~$100/month
- CloudFront: ~$200/month
- Monitoring/Logging: ~$75/month
- **Total:** ~$425/month for 1M sessions

## Support & Maintenance

### Regular Maintenance
- Weekly performance reviews
- Monthly cost optimization analysis
- Quarterly security audits
- Bi-annual infrastructure updates

### Contact Information
- **DevOps Team:** devops@candlefish.ai
- **On-Call:** +1-555-CANDLEFISH
- **Slack Channel:** #candlefish-production
- **Documentation:** https://docs.candlefish.ai

---

*This deployment guide is maintained by the Candlefish DevOps team and is updated with each major release.*
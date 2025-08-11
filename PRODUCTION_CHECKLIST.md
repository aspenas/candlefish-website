# Candlefish AI Production Deployment Checklist

## Quick Status Overview
- 🟢 Complete and verified
- 🟡 In progress or partially complete  
- 🔴 Not started or blocked
- ⚪ Optional or can be deferred

## Pre-Production Verification

### Current Deployments to Verify
- [🟡] RTPM API on Fly.io - Verify endpoints and performance
  - [ ] Test https://rtpm-api-candlefish.fly.dev/health
  - [ ] Check API documentation completeness
  - [ ] Verify CORS configuration for production domains
  - [ ] Review rate limiting settings

- [🔴] Collaboration Services - Identify actual vs documented
  - [ ] Inventory which services have code implementation
  - [ ] Determine which are stubs vs functional
  - [ ] Map service dependencies
  - [ ] Create service startup order

### Infrastructure Checklist

#### AWS Account Setup
- [🔴] Production AWS account configured
  - [ ] IAM roles and policies created
  - [ ] Cost alerts configured
  - [ ] MFA enforced for all users
  - [ ] CloudTrail enabled

#### Terraform Infrastructure
- [🔴] Initialize Terraform workspace
```bash
cd /Users/patricksmith/candlefish-ai/deployment/terraform
terraform init
terraform workspace new production
```

- [🔴] Core Infrastructure
  - [ ] VPC with public/private subnets
  - [ ] EKS cluster (or decide on ECS/Fargate)
  - [ ] RDS PostgreSQL instance
  - [ ] ElastiCache Redis cluster
  - [ ] S3 buckets for assets
  - [ ] CloudFront distribution

#### Container Registry
- [🔴] ECR repositories created
```bash
# Run from deployment/scripts/
./create-ecr-repos.sh
```

### Service Deployment Checklist

#### Backend Services Priority Order

1. **Authentication Service** [🔴]
   - [ ] JWT implementation complete
   - [ ] Refresh token mechanism
   - [ ] Multi-tenant support
   - [ ] Rate limiting per tenant
   - [ ] Session management in Redis

2. **GraphQL API Gateway** [🔴]
   - [ ] Apollo Federation setup
   - [ ] Service discovery configuration
   - [ ] Schema stitching tested
   - [ ] Query complexity limits
   - [ ] Monitoring/tracing enabled

3. **Document Service (CRDT)** [🔴]
   - [ ] Y.js or Automerge selected
   - [ ] Persistence layer implemented
   - [ ] Conflict resolution tested
   - [ ] Version history storage
   - [ ] Snapshot optimization

4. **WebSocket Service** [🔴]
   - [ ] Connection pooling configured
   - [ ] Heartbeat/reconnection logic
   - [ ] Room management for documents
   - [ ] Presence broadcasting
   - [ ] Message queuing for offline users

5. **Notification Service** [🔴]
   - [ ] Email provider configured (SendGrid/SES)
   - [ ] Push notification setup
   - [ ] Template management
   - [ ] Delivery tracking
   - [ ] Unsubscribe handling

#### Frontend Deployments

1. **Collaboration Editor** [🔴]
   - [ ] Production build optimized
   - [ ] Environment variables configured
   - [ ] API endpoints updated
   - [ ] Error tracking (Sentry) added
   - [ ] Analytics integrated

2. **Mobile Applications** [⚪]
   - [ ] Production builds created
   - [ ] Code signing configured
   - [ ] App store metadata prepared
   - [ ] OTA update service ready
   - [ ] Crash reporting enabled

### Database Setup

#### PostgreSQL [🔴]
- [ ] Schema migrations prepared
```bash
cd services/backend
npm run migrate:production
```
- [ ] Multi-tenant schema implemented
- [ ] Row-level security configured
- [ ] Backup strategy documented
- [ ] Point-in-time recovery tested
- [ ] Read replicas configured (if needed)

#### Redis [🔴]
- [ ] Cluster mode configured
- [ ] Persistence settings optimized
- [ ] Eviction policies set
- [ ] Pub/sub channels defined
- [ ] Backup schedule configured

### Security Checklist

#### Network Security [🔴]
- [ ] Security groups configured
- [ ] NACLs properly set
- [ ] WAF rules defined
- [ ] DDoS protection enabled
- [ ] VPN or bastion host for admin access

#### Application Security [🔴]
- [ ] SSL certificates provisioned
- [ ] Secrets rotated and stored in AWS Secrets Manager
- [ ] API rate limiting configured
- [ ] CORS properly configured
- [ ] CSP headers implemented

#### Compliance [🔴]
- [ ] GDPR compliance verified
- [ ] Data retention policies implemented
- [ ] Audit logging enabled
- [ ] PII encryption configured
- [ ] Terms of Service and Privacy Policy updated

### Monitoring & Observability

#### Metrics [🔴]
- [ ] Prometheus installed
- [ ] Grafana dashboards created
- [ ] Custom metrics implemented
- [ ] SLI/SLO defined
- [ ] Alert rules configured

#### Logging [🔴]
- [ ] Centralized logging configured (ELK/CloudWatch)
- [ ] Log retention policies set
- [ ] Structured logging implemented
- [ ] Correlation IDs added
- [ ] PII scrubbing configured

#### Tracing [⚪]
- [ ] OpenTelemetry or X-Ray configured
- [ ] Service dependencies mapped
- [ ] Performance bottlenecks identified
- [ ] Trace sampling configured

### Testing & Validation

#### Load Testing [🔴]
- [ ] Test scenarios created
- [ ] Target metrics defined
- [ ] Load testing tool configured (K6/JMeter)
- [ ] WebSocket load testing
- [ ] Database connection pooling tested

#### Integration Testing [🔴]
- [ ] End-to-end test suite
- [ ] API contract tests
- [ ] WebSocket connection tests
- [ ] Multi-tenant isolation tests
- [ ] Failover testing

#### Security Testing [🔴]
- [ ] Penetration testing scheduled
- [ ] OWASP Top 10 verified
- [ ] Dependency scanning enabled
- [ ] Container scanning configured
- [ ] Security headers tested

### Deployment Pipeline

#### CI/CD [🟡]
- [ ] GitHub Actions workflows updated
- [ ] Docker build optimization
- [ ] Automated testing in pipeline
- [ ] Security scanning in pipeline
- [ ] Deployment approvals configured

#### Release Process [🔴]
- [ ] Blue-green deployment configured
- [ ] Rollback procedures documented
- [ ] Feature flags implemented
- [ ] Database migration strategy
- [ ] Canary deployments (optional)

### Documentation

#### Technical Documentation [🟡]
- [ ] API documentation complete
- [ ] WebSocket protocol documented
- [ ] Database schema documented
- [ ] Architecture diagrams updated
- [ ] Runbooks created

#### Operational Documentation [🔴]
- [ ] Deployment guide finalized
- [ ] Troubleshooting guide
- [ ] Incident response playbooks
- [ ] On-call procedures
- [ ] Disaster recovery plan

### Pre-Launch Tasks

#### Final Verification [🔴]
- [ ] All services health checks passing
- [ ] End-to-end user journey tested
- [ ] Performance benchmarks met
- [ ] Security scan completed
- [ ] Backup and restore tested

#### Communication [🔴]
- [ ] Status page configured
- [ ] Launch announcement prepared
- [ ] Support channels ready
- [ ] Documentation published
- [ ] Team training completed

## Launch Day Checklist

### Pre-Launch (T-4 hours)
- [ ] Final health checks
- [ ] Database backups verified
- [ ] Monitoring dashboards open
- [ ] Support team briefed
- [ ] Rollback plan reviewed

### Launch (T-0)
- [ ] DNS cutover
- [ ] Feature flags enabled
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify user flows

### Post-Launch (T+4 hours)
- [ ] Review metrics
- [ ] Address critical issues
- [ ] Gather initial feedback
- [ ] Update status page
- [ ] Team debrief scheduled

## Quick Commands

### Service Health Checks
```bash
# Check all services
kubectl get pods -n candlefish-prod
kubectl get svc -n candlefish-prod

# Check specific service logs
kubectl logs -n candlefish-prod deployment/graphql-api
kubectl logs -n candlefish-prod deployment/websocket-service
```

### Database Verification
```bash
# Connect to PostgreSQL
psql -h candlefish-prod.cluster-xyz.us-east-1.rds.amazonaws.com -U admin -d candlefish

# Check Redis
redis-cli -h candlefish-redis.cache.amazonaws.com ping
```

### Load Testing
```bash
# Run load test
k6 run /Users/patricksmith/candlefish-ai/tests/load/collaboration.js

# WebSocket load test
npm run test:websocket:load
```

## Critical Path Items

These MUST be completed before launch:

1. [🔴] **Authentication service deployed and tested**
2. [🔴] **GraphQL API gateway operational**
3. [🔴] **Document service with CRDT working**
4. [🔴] **WebSocket service handling connections**
5. [🔴] **Frontend connected to all services**
6. [🔴] **SSL certificates configured**
7. [🔴] **Database migrations complete**
8. [🔴] **Monitoring and alerts configured**
9. [🔴] **Backup and restore verified**
10. [🔴] **Security scan passed**

## Notes Section

### Blockers
- 

### Decisions Needed
- 

### Dependencies
- 

### Risk Items
- 

---

**Last Updated**: 2025-08-10
**Next Review**: [Date]
**Owner**: [Name]

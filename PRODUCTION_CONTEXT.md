# Candlefish AI Production Deployment Context

## Executive Summary
The Candlefish AI real-time collaboration system is partially deployed with significant gaps between documentation and actual implementation. While comprehensive architecture and deployment guides exist, most services appear to be in demo/conceptual state requiring production hardening.

## Current State Analysis

### ✅ What's Actually Deployed
1. **RTPM API Service** (Fly.io - LIVE)
   - App: `rtpm-api-candlefish`
   - URL: https://rtpm-api-candlefish.fly.dev
   - Status: Running in SJC region
   - Last Deploy: 2025-08-08

2. **Website** (Likely Netlify)
   - Recent deployment commits suggest active deployment
   - Homepage and analytics dashboard appear operational

3. **Paintbox Project** (Partial)
   - Has Fly.io configuration
   - Docker compose setup exists
   - Appears to be integration point

### ⚠️ Services in Demo/Development State
1. **Collaboration Editor** (`/apps/collaboration-editor`)
   - Package.json exists with dependencies
   - Uses Lexical editor, Apollo GraphQL
   - No production deployment configs found

2. **Mobile Apps** (`/apps/mobile-collaboration`, `/apps/mobile-dashboard`)
   - React Native configurations present
   - No deployment artifacts found

3. **Backend Services**
   - GraphQL API service (documented but not found)
   - WebSocket service (documented but not found)
   - Document/CRDT service (documented but not found)

### 🔴 Critical Missing Production Components

#### Infrastructure
- [ ] AWS EKS cluster not configured
- [ ] PostgreSQL RDS instance not provisioned
- [ ] Redis ElastiCache not set up
- [ ] S3 buckets for file storage not created
- [ ] CloudFront distribution not configured
- [ ] ECR repositories not created

#### Services
- [ ] GraphQL Federation gateway not implemented
- [ ] WebSocket server for real-time sync not deployed
- [ ] CRDT document service not production-ready
- [ ] Authentication service (JWT) not centralized
- [ ] Multi-tenant isolation not enforced

#### Security & Compliance
- [ ] TLS certificates not configured
- [ ] Secrets management fragmented (mix of .env files)
- [ ] No centralized auth/authz service
- [ ] Data encryption at rest not verified
- [ ] GDPR compliance not implemented

## Production Readiness Checklist

### Phase 1: Infrastructure Foundation (Week 1)
- [ ] Provision AWS infrastructure using Terraform
  - [ ] Create EKS cluster
  - [ ] Set up RDS PostgreSQL with TimescaleDB
  - [ ] Configure Redis ElastiCache
  - [ ] Create S3 buckets with encryption
  - [ ] Set up CloudFront CDN
- [ ] Configure networking
  - [ ] VPC with public/private subnets
  - [ ] Security groups and NACLs
  - [ ] ALB/NLB for load balancing
- [ ] Set up monitoring stack
  - [ ] Prometheus + Grafana
  - [ ] CloudWatch integration
  - [ ] Log aggregation (ELK or CloudWatch Logs)

### Phase 2: Core Services (Week 2)
- [ ] Containerize all services
  - [ ] Build Docker images for each service
  - [ ] Push to ECR
  - [ ] Create Helm charts
- [ ] Deploy backend services to EKS
  - [ ] GraphQL API gateway
  - [ ] WebSocket service
  - [ ] Document/CRDT service
  - [ ] Authentication service
- [ ] Configure service mesh (optional but recommended)
  - [ ] Istio or AWS App Mesh
  - [ ] Service discovery
  - [ ] Circuit breakers

### Phase 3: Data Layer (Week 3)
- [ ] Database migrations
  - [ ] Schema creation scripts
  - [ ] Seed data for testing
  - [ ] Backup/restore procedures
- [ ] Configure Redis
  - [ ] Session management
  - [ ] Pub/sub for real-time events
  - [ ] Cache invalidation strategy
- [ ] S3 integration
  - [ ] File upload service
  - [ ] CDN configuration
  - [ ] Lifecycle policies

### Phase 4: Frontend & Mobile (Week 4)
- [ ] Production build configuration
  - [ ] Environment variables
  - [ ] API endpoints
  - [ ] Feature flags
- [ ] Deploy frontend
  - [ ] CloudFront distribution
  - [ ] SSL certificates
  - [ ] Custom domain setup
- [ ] Mobile app preparation
  - [ ] Code signing certificates
  - [ ] App store configurations
  - [ ] OTA update service

### Phase 5: Security & Compliance (Week 5)
- [ ] Security hardening
  - [ ] WAF rules
  - [ ] DDoS protection
  - [ ] Rate limiting
- [ ] Compliance implementation
  - [ ] GDPR data handling
  - [ ] Audit logging
  - [ ] Data retention policies
- [ ] Penetration testing
  - [ ] Security scan
  - [ ] Vulnerability assessment
  - [ ] Remediation

## Critical Questions for User

### Business Requirements
1. **Scale expectations**: How many concurrent users expected at launch?
2. **Data residency**: Any specific geographic requirements for data storage?
3. **Compliance**: GDPR, SOC2, HIPAA, or other compliance needs?
4. **Budget**: AWS spending limits for infrastructure?
5. **Timeline**: Hard deadline for production launch?

### Technical Clarifications
1. **Authentication**: Use existing auth provider (Auth0, Cognito) or build custom?
2. **Multi-tenancy**: Shared database with tenant isolation or separate databases?
3. **File storage**: Expected file sizes and storage volume?
4. **Real-time requirements**: Latency tolerance for collaboration features?
5. **Mobile deployment**: App stores (iOS/Android) or web-based PWA only?

### Integration Points
1. **Existing systems**: Which current services (Paintbox, Brand Portal) need integration?
2. **Third-party services**: Any required integrations (Slack, Teams, etc.)?
3. **Analytics**: Preferred analytics platform (Mixpanel, Amplitude, custom)?
4. **Payment processing**: If needed, which provider?
5. **Email service**: Transactional email provider preference?

## Recommended Next Steps

### Immediate Actions (Today)
1. **Verify production requirements** with stakeholder
2. **Create AWS account structure** (prod, staging, dev)
3. **Set up CI/CD pipeline** for automated deployments
4. **Initialize Terraform workspace** for infrastructure as code

### This Week
1. **Containerize core services** that exist
2. **Create missing service stubs** with basic functionality
3. **Set up local development environment** matching production
4. **Document API contracts** between services

### Next Week
1. **Deploy to staging environment** for testing
2. **Load testing** to validate architecture
3. **Security audit** of deployed services
4. **Create runbooks** for operations

## Context for Backend Architect

### Service Architecture
```yaml
Services Required:
  - GraphQL Gateway: Apollo Federation for API aggregation
  - Document Service: Y.js or Automerge for CRDT
  - WebSocket Service: Socket.io or native WS for real-time
  - Auth Service: JWT with refresh tokens
  - Notification Service: Push notifications + email
  
Database Design:
  - PostgreSQL: Main data store with multi-tenant schema
  - TimescaleDB: Time-series data for analytics
  - Redis: Session store + pub/sub + cache
  
Message Queue:
  - Consider SQS or RabbitMQ for async processing
  - Event sourcing for collaboration events
```

### Performance Requirements
- Sub-100ms latency for document operations
- Support 1000+ concurrent WebSocket connections per instance
- 99.9% uptime SLA
- Horizontal scaling capability

## Context for Frontend Architect

### Application Structure
```yaml
Frontend Apps:
  - Collaboration Editor: Next.js 15 with Lexical
  - Mobile Apps: React Native with Expo
  - Admin Dashboard: React with Ant Design
  
State Management:
  - Apollo Client for GraphQL
  - Zustand or Redux for local state
  - Y.js for CRDT state synchronization
  
Real-time Features:
  - WebSocket connection management
  - Optimistic UI updates
  - Conflict resolution UI
  - Presence indicators
```

### User Experience Requirements
- Offline-first capability with sync
- Sub-second response for all interactions
- Progressive Web App support
- Accessibility compliance (WCAG 2.1 AA)

## Risk Assessment

### High Risk Items
1. **CRDT Implementation**: Complex, needs thorough testing
2. **Multi-tenant Security**: Data isolation critical
3. **Scale Testing**: Unknown actual load requirements
4. **WebSocket at Scale**: Connection management complexity

### Mitigation Strategies
1. Use proven CRDT library (Y.js recommended)
2. Row-level security in PostgreSQL
3. Gradual rollout with feature flags
4. Consider managed WebSocket service (AWS API Gateway WebSocket)

## Success Metrics

### Technical KPIs
- API response time < 200ms (p95)
- WebSocket latency < 50ms
- System uptime > 99.9%
- Error rate < 0.1%

### Business KPIs
- User activation rate
- Collaboration session duration
- Document creation rate
- User retention (D1, D7, D30)

## Conclusion

The Candlefish collaboration system has solid architectural documentation but requires significant implementation work to reach production readiness. The critical path involves:

1. **Infrastructure provisioning** (1 week)
2. **Service implementation** (2-3 weeks)
3. **Integration and testing** (1 week)
4. **Security hardening** (1 week)
5. **Launch preparation** (1 week)

**Estimated Timeline**: 6-7 weeks for MVP production deployment

**Recommended Approach**: Start with a minimal viable deployment (MVP) focusing on core collaboration features, then iterate based on user feedback and load patterns.

---

*This context document should be updated as decisions are made and implementation progresses.*

# Candlefish AI Production Deployment - Master Context Document
**Version**: 1.0.0  
**Last Updated**: 2025-08-10  
**Deployment Timeline**: 6+ weeks  
**Target Launch**: End of September 2025  

## Executive Summary

This document serves as the master context for coordinating the multi-agent deployment of Candlefish AI's collaboration platform on Fly.io. The project involves deploying a complete enterprise collaboration system with real-time features, Paintbox integration, and brand portal functionality for 10 initial users.

## Current Infrastructure Status

### ✅ Already Deployed
- **RTPM API** on Fly.io (https://rtpm-api-candlefish.fly.dev/)
  - FastAPI with Python 3.11
  - WebSocket support for real-time metrics
  - Health monitoring and Prometheus metrics
  - Region: San Jose (sjc)
  - Resources: 512MB RAM, shared CPU

### ⚠️ Needs Fixing
- **Website** on Netlify
  - Build issues with monorepo structure
  - Missing dependencies for @candlefish-ai/ui-components
  - Requires package resolution

### 🔨 To Be Built
- PostgreSQL database cluster on Fly.io
- Redis cache layer on Fly.io
- Authentication service
- Document management system
- Real-time collaboration service (WebSockets)
- File storage integration (S3)
- Paintbox API integration
- Brand portal deployment
- Mobile applications (iOS/Android)

## Project Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Fly.io Infrastructure                      │
├─────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  PostgreSQL  │  │    Redis     │  │  Auth Service │        │
│  │   Cluster    │  │    Cache     │  │    (Auth0)    │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │   RTPM API   │  │   Doc API    │  │  WebSocket   │        │
│  │  (Deployed)  │  │   Service    │  │   Service    │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │   Paintbox   │  │Brand Portal  │  │  S3 Storage  │        │
│  │ Integration  │  │   Service    │  │   Service    │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                 │
└─────────────────────────────────────────────────────────────┘
                               │
                    ┌──────────┴──────────┐
                    │                      │
             ┌──────▼──────┐      ┌───────▼──────┐
             │   Website    │      │  Mobile Apps │
             │  (Netlify)   │      │  (iOS/Android)│
             └──────────────┘      └──────────────┘
```

### Technology Stack

- **Backend**: Python 3.11 (FastAPI), Node.js (TypeScript)
- **Database**: PostgreSQL 15 with TimescaleDB
- **Cache**: Redis 7
- **Real-time**: WebSockets (Socket.io)
- **File Storage**: AWS S3
- **Authentication**: Auth0 / JWT
- **Monitoring**: Prometheus + Grafana
- **Deployment**: Fly.io, Docker
- **CI/CD**: GitHub Actions

## Deployment Schedule

### Week 1: Foundation (Aug 12-16)
**Owner**: Infrastructure Agent

#### Tasks:
1. Fix website deployment on Netlify
   - Resolve monorepo build issues
   - Configure proper build commands
   - Test deployment pipeline

2. Deploy PostgreSQL on Fly.io
   - Create TimescaleDB instance
   - Configure connection pooling
   - Set up automated backups
   - Create database schemas

3. Deploy Redis on Fly.io
   - Configure Redis cluster
   - Set up persistence
   - Configure cache eviction policies

4. Create Authentication Service
   - Set up Auth0 tenant
   - Configure JWT validation
   - Create user management endpoints
   - Implement role-based access control

#### Dependencies:
- Fly.io account with billing configured
- AWS account for S3 setup
- Auth0 account setup

### Week 2-3: Core Features (Aug 19-30)
**Owner**: Backend Development Agent

#### Tasks:
1. Document Management API
   - CRUD operations for documents
   - Version control system
   - Permission management
   - Search functionality

2. Simple Document Editor
   - Markdown/rich text editor
   - Auto-save functionality
   - Version comparison
   - Export capabilities

3. File Upload Service
   - S3 integration
   - Multipart upload support
   - File type validation
   - Thumbnail generation

4. API Gateway Setup
   - Route configuration
   - Rate limiting
   - Request validation
   - Error handling

#### Dependencies:
- PostgreSQL and Redis deployed
- Authentication service operational
- S3 bucket configured

### Week 4-5: Real-time Collaboration (Sep 2-13)
**Owner**: Real-time Systems Agent

#### Tasks:
1. WebSocket Service
   - Socket.io server setup
   - Connection management
   - Room/channel system
   - Message broadcasting

2. Presence Indicators
   - User online status
   - Active document viewers
   - Typing indicators
   - Cursor positions

3. Commenting System
   - Thread-based comments
   - Mentions and notifications
   - Comment resolution
   - Activity feed

4. Notification Service
   - Email notifications
   - In-app notifications
   - Push notifications setup
   - Notification preferences

#### Dependencies:
- Document API completed
- User authentication working
- WebSocket infrastructure ready

### Week 6+: Advanced Features & Integration (Sep 16+)
**Owner**: Integration Agent

#### Tasks:
1. Real-time CRDT Implementation
   - Yjs integration
   - Conflict resolution
   - Offline support
   - Sync mechanisms

2. Mobile Applications
   - React Native setup
   - Core feature implementation
   - Push notifications
   - Offline mode

3. Paintbox Integration
   - API connection setup
   - Data synchronization
   - Estimate generation
   - CompanyCam integration

4. Brand Portal Deployment
   - Template management
   - Asset library
   - Brand guidelines
   - Download center

#### Dependencies:
- All core services operational
- WebSocket service stable
- Mobile development environment ready

## Agent Task Allocation

### Infrastructure Agent
**Responsibilities**:
- Fly.io resource provisioning
- Database and cache setup
- Monitoring and logging
- Security configuration
- Backup strategies

**Current Tasks**:
- Deploy PostgreSQL cluster
- Configure Redis cache
- Set up monitoring dashboards
- Configure SSL certificates

### Backend Development Agent
**Responsibilities**:
- API development
- Business logic implementation
- Database schema design
- Integration endpoints
- Testing and validation

**Current Tasks**:
- Document management API
- File upload service
- Search functionality
- API documentation

### Frontend Development Agent
**Responsibilities**:
- Website fixes
- UI component development
- Editor implementation
- User experience optimization
- Responsive design

**Current Tasks**:
- Fix Netlify deployment
- Create document editor
- Build dashboard UI
- Implement search interface

### Real-time Systems Agent
**Responsibilities**:
- WebSocket infrastructure
- Real-time synchronization
- Presence management
- CRDT implementation
- Performance optimization

**Future Tasks**:
- Socket.io server setup
- Presence indicators
- Collaborative editing
- Conflict resolution

### Integration Agent
**Responsibilities**:
- Third-party integrations
- Paintbox connection
- Mobile app coordination
- Brand portal setup
- External API management

**Future Tasks**:
- Paintbox API integration
- CompanyCam integration
- S3 configuration
- Email service setup

### Testing & QA Agent
**Responsibilities**:
- Test strategy
- Automated testing
- Performance testing
- Security testing
- User acceptance testing

**Ongoing Tasks**:
- Unit test coverage
- Integration tests
- Load testing
- Security audits

## Critical Dependencies

### External Services
1. **Fly.io**
   - Account: Active
   - Billing: Configured
   - Regions: sjc (primary)
   - Resources: Allocated

2. **AWS Services**
   - S3: For file storage
   - SES: For email delivery
   - Secrets Manager: For credentials
   - CloudWatch: For monitoring

3. **Auth0**
   - Tenant: To be created
   - Applications: To be configured
   - Rules: To be implemented
   - Connections: To be established

4. **Paintbox**
   - API Access: Required
   - Credentials: Needed
   - Endpoints: To be documented
   - Rate limits: To be determined

### Internal Dependencies
- Database schemas must be finalized before API development
- Authentication must work before any protected endpoints
- WebSocket service required for real-time features
- Document API needed before collaborative editing

## Monitoring & Success Metrics

### Key Performance Indicators
- **Response Time**: < 200ms for API calls
- **WebSocket Latency**: < 50ms for real-time updates
- **Uptime**: 99.9% availability
- **Concurrent Users**: Support 10 initial users
- **Document Load Time**: < 2 seconds
- **Search Response**: < 500ms

### Monitoring Tools
- Prometheus for metrics collection
- Grafana for visualization
- Sentry for error tracking
- LogDNA for log aggregation
- UptimeRobot for availability

### Health Checks
- API endpoint monitoring
- Database connection pooling
- Redis cache hit rates
- WebSocket connection counts
- S3 upload success rates

## Risk Management

### Technical Risks
1. **WebSocket Scaling**
   - Mitigation: Implement sticky sessions
   - Fallback: Long polling support

2. **Database Performance**
   - Mitigation: Query optimization
   - Fallback: Read replicas

3. **CRDT Complexity**
   - Mitigation: Use proven libraries (Yjs)
   - Fallback: Simpler locking mechanism

### Business Risks
1. **Paintbox Integration Delays**
   - Mitigation: Mock API for development
   - Fallback: Manual data entry

2. **Mobile App Approval**
   - Mitigation: Early submission
   - Fallback: Progressive web app

## Communication Protocol

### Agent Coordination
1. **Context Handoff**
   - Use this master document
   - Create task-specific briefs
   - Update progress regularly

2. **Dependency Notification**
   - Flag blockers immediately
   - Update dependency status
   - Communicate completion

3. **Progress Tracking**
   - Daily status updates
   - Weekly milestone reviews
   - Risk assessment updates

### Documentation Requirements
- API documentation in OpenAPI format
- Deployment runbooks for each service
- Integration guides for Paintbox
- User documentation for features

## Environment Configuration

### Development
```bash
DATABASE_URL=postgres://user:pass@localhost:5432/candlefish_dev
REDIS_URL=redis://localhost:6379
API_URL=http://localhost:8000
WEBSOCKET_URL=ws://localhost:3001
```

### Staging (Fly.io)
```bash
DATABASE_URL=postgres://user:pass@db.candlefish-staging.internal:5432/candlefish
REDIS_URL=redis://cache.candlefish-staging.internal:6379
API_URL=https://api-staging.candlefish.ai
WEBSOCKET_URL=wss://ws-staging.candlefish.ai
```

### Production (Fly.io)
```bash
DATABASE_URL=postgres://user:pass@db.candlefish.internal:5432/candlefish
REDIS_URL=redis://cache.candlefish.internal:6379
API_URL=https://api.candlefish.ai
WEBSOCKET_URL=wss://ws.candlefish.ai
```

## Secrets Management

### Required Secrets
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: For token signing
- `AWS_ACCESS_KEY_ID`: For S3 access
- `AWS_SECRET_ACCESS_KEY`: For S3 access
- `AUTH0_DOMAIN`: Auth0 tenant domain
- `AUTH0_CLIENT_ID`: Auth0 application ID
- `AUTH0_CLIENT_SECRET`: Auth0 application secret
- `PAINTBOX_API_KEY`: Paintbox integration key
- `COMPANYCAM_API_KEY`: CompanyCam integration key
- `SENTRY_DSN`: Error tracking
- `SLACK_WEBHOOK_URL`: For notifications

### Secret Rotation
- Monthly rotation for API keys
- Quarterly for database passwords
- Annual for JWT secrets
- Immediate on breach detection

## Next Steps for Each Agent

### Immediate Actions (Week 1)

#### Infrastructure Agent
1. Create Fly.io PostgreSQL app
2. Deploy Redis cluster
3. Configure networking between services
4. Set up monitoring dashboards

#### Backend Development Agent
1. Design database schemas
2. Create base API structure
3. Implement authentication middleware
4. Set up testing framework

#### Frontend Development Agent
1. Fix Netlify build configuration
2. Create component library structure
3. Design dashboard layout
4. Implement authentication flow

### Coordination Points

1. **Daily Sync**
   - Check dependency status
   - Update task progress
   - Flag any blockers

2. **Weekly Review**
   - Assess milestone completion
   - Adjust timeline if needed
   - Plan next week's tasks

3. **Integration Testing**
   - Weekly integration tests
   - Cross-service validation
   - Performance benchmarking

## Success Criteria

### Week 1 Success
- [ ] Website deploying successfully on Netlify
- [ ] PostgreSQL cluster operational on Fly.io
- [ ] Redis cache configured and running
- [ ] Authentication service with basic user management

### Week 2-3 Success
- [ ] Document CRUD API complete
- [ ] File upload to S3 working
- [ ] Basic editor functional
- [ ] Search capability implemented

### Week 4-5 Success
- [ ] WebSocket service operational
- [ ] Real-time presence working
- [ ] Commenting system functional
- [ ] Notifications configured

### Week 6+ Success
- [ ] CRDT-based collaborative editing
- [ ] Mobile apps in testing
- [ ] Paintbox integration complete
- [ ] Brand portal accessible

## Support Resources

### Documentation
- Fly.io: https://fly.io/docs
- FastAPI: https://fastapi.tiangolo.com
- Socket.io: https://socket.io/docs
- Yjs: https://docs.yjs.dev
- Auth0: https://auth0.com/docs

### Internal Resources
- RTPM API: `/deployment/fly/rtpm-api/`
- Paintbox: `/projects/paintbox/`
- Brand Portal: `/apps/brand-portal/`
- Website: `/apps/website/`

### Contact Points
- Project Lead: Patrick Smith
- Infrastructure: DevOps Team
- Integration: Paintbox Team
- Design: Brand Portal Team

---

## Version History

- **1.0.0** (2025-08-10): Initial comprehensive context document created

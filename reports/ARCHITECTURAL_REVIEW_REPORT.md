# Candlefish AI Portfolio - Architectural Review Report

## Executive Summary

This comprehensive architectural review analyzes the Candlefish AI portfolio across four main projects: Paintbox, PromoterOS, Crown Trophy, and Candlefish Business Solutions. The review evaluates service boundaries, scalability patterns, security architecture, and provides recommendations for production deployment and business growth.

**Architectural Impact Assessment**: **HIGH**

Critical architectural decisions needed around database choices, service boundaries, and deployment strategies before scaling to production.

---

## 1. PAINTBOX - Paint Estimator Application

### Current Architecture

**Stack**: Next.js 15 with App Router, Prisma ORM, SQLite, Redis (optional), Zustand state management

**Pattern Compliance**: ✅ Mostly Compliant
- **SOLID Principles**: Good separation of concerns in service layers
- **DDD Boundaries**: Clear domain separation (estimates, clients, pricing)
- **Abstraction Levels**: Appropriate without over-engineering

### Architectural Strengths

1. **Modular Service Layer**
   - Clean separation between Salesforce, CompanyCam, and internal services
   - Circuit breaker patterns implemented for external APIs
   - Proper error handling with custom error types

2. **State Management**
   - Zustand stores with persistence for offline capability
   - Auto-save functionality with debouncing
   - Clear separation between estimate, offline, and infrastructure stores

3. **Security Architecture**
   - JWT authentication with JWKS endpoint
   - AWS Secrets Manager integration
   - Rate limiting on auth and API endpoints
   - Security headers middleware

4. **Performance Optimizations**
   - Code splitting with dynamic imports
   - Three-tier caching (memory, Redis, database)
   - WebSocket support for real-time updates
   - Progressive Web App capabilities

### Critical Architectural Issues

#### 1. **Database Choice - SQLite in Production** 🔴

**Violation**: Using SQLite for production deployment severely limits scalability

**Impact**: 
- No concurrent write support
- Limited to single server deployment
- No built-in replication/backup
- Performance degradation with data growth

**Recommendation**: 
```typescript
// Migrate to PostgreSQL with connection pooling
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_URL") // For migrations
}

// Add PgBouncer for connection pooling
// Add read replicas for scaling reads
```

#### 2. **Service Boundaries - Monolithic Tendencies** 🟡

**Current State**: All services bundled in single Next.js application

**Issues**:
- Salesforce sync, PDF generation, Excel calculations all in same process
- No independent scaling of compute-intensive operations
- Single point of failure

**Recommended Architecture**:
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js Web   │────▶│  API Gateway    │────▶│  Microservices  │
│   Application   │     │  (Rate Limit)   │     ├─────────────────┤
└─────────────────┘     └─────────────────┘     │ Calculation     │
                                                 │ PDF Generation  │
                                                 │ Salesforce Sync │
                                                 │ CompanyCam      │
                                                 └─────────────────┘
```

#### 3. **Missing Event-Driven Architecture** 🟡

**Current**: Direct API calls for all operations

**Recommendation**: Implement event sourcing for critical operations
```typescript
// Event-driven pattern for long-running operations
interface EstimateEvent {
  type: 'CREATED' | 'UPDATED' | 'CALCULATED' | 'PDF_GENERATED';
  estimateId: string;
  timestamp: Date;
  payload: any;
}

// Use Bull queues for async processing
const estimateQueue = new Queue('estimates');
const pdfQueue = new Queue('pdf-generation');
```

### Production Deployment Recommendations

1. **Multi-Region Deployment**
   ```yaml
   # Deploy to multiple regions with Fly.io
   regions:
     primary: sjc    # San Jose
     secondary: ord  # Chicago
     failover: iad   # Virginia
   ```

2. **Database Migration Path**
   - Phase 1: Add PostgreSQL alongside SQLite
   - Phase 2: Dual-write to both databases
   - Phase 3: Migrate reads to PostgreSQL
   - Phase 4: Deprecate SQLite

3. **Caching Strategy**
   - Implement CDN (CloudFlare) for static assets
   - Redis for session management
   - Edge caching for API responses

---

## 2. PROMOTEROS - Concert Booking Platform

### Current Architecture

**Stack**: Serverless (Netlify Functions), Static Frontend, JWT Authentication

**Pattern Compliance**: ✅ Good
- Clean serverless architecture
- Proper API gateway pattern
- Good separation of concerns

### Architectural Strengths

1. **Serverless Architecture**
   - Zero-maintenance infrastructure
   - Auto-scaling by design
   - Cost-effective for variable loads

2. **API Design**
   - RESTful patterns
   - Proper middleware chain (auth → validation → rate limit → handler)
   - Mock data structure ready for real implementation

### Architectural Concerns

#### 1. **No Database Layer** 🔴

**Current**: Using mock data in functions

**Recommendation**: 
```javascript
// Add Supabase or PlanetScale for serverless database
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Or use PlanetScale for MySQL compatibility
const { connect } = require('@planetscale/database');
```

#### 2. **Limited State Management** 🟡

**Current**: No persistent state between function invocations

**Recommendation**: Implement Redis or DynamoDB for state management

### Scaling Recommendations

1. **Add Database Layer**
   - Supabase for quick PostgreSQL setup
   - Built-in auth and real-time subscriptions
   - Row-level security policies

2. **Implement Background Jobs**
   - Use Netlify Background Functions for long-running tasks
   - Add webhook handlers for third-party integrations

3. **API Rate Limiting**
   - Implement per-user rate limits
   - Add API key management for B2B access

---

## 3. CROWN TROPHY - B2B Franchise System

### Current State

**Status**: Pre-MVP (PDFs and Excel files only)

### Recommended Architecture for MVP

#### Phase 1: Foundation (Months 1-2)

```typescript
// Multi-tenant architecture from day one
interface TenantContext {
  franchiseId: string;
  locationId: string;
  permissions: Permission[];
  dataIsolation: 'shared' | 'isolated';
}

// Database per tenant or schema per tenant
const getTenantConnection = (tenantId: string) => {
  return new PrismaClient({
    datasources: {
      db: {
        url: `postgresql://.../${tenantId}_db`
      }
    }
  });
};
```

#### Phase 2: Core Features (Months 2-4)

1. **Order Management System**
   ```typescript
   // Domain-driven design for orders
   class Order {
     constructor(
       private tenant: Tenant,
       private customer: Customer,
       private items: OrderItem[]
     ) {}
     
     calculatePricing(): Price {
       // Franchise-specific pricing rules
     }
   }
   ```

2. **Inventory Management**
   - Real-time stock tracking
   - Multi-location inventory
   - Automated reorder points

3. **Customer Portal**
   - Self-service ordering
   - Order tracking
   - Design proofing system

#### Phase 3: Scale (Months 4-6)

1. **API-First Architecture**
   ```yaml
   # OpenAPI specification for franchise APIs
   /api/v1/franchises/{franchiseId}/orders
   /api/v1/franchises/{franchiseId}/inventory
   /api/v1/franchises/{franchiseId}/customers
   ```

2. **Mobile Applications**
   - React Native for cross-platform
   - Offline-first with sync

### Scalability Considerations for 140+ Locations

1. **Data Isolation Strategy**
   - Shared database with row-level security for small franchises
   - Dedicated databases for high-volume locations
   - Regional data centers for geographic distribution

2. **Performance Requirements**
   - Sub-100ms API response times
   - Support for 10,000 concurrent users
   - 99.9% uptime SLA

---

## 4. CANDLEFISH BUSINESS SOLUTIONS - Infrastructure

### Current Architecture

**Stack**: FastAPI (Python), Slack SDK, Fly.io deployment

**Pattern Compliance**: ✅ Excellent
- Clean microservice architecture
- Proper async patterns
- Good monitoring setup

### Architectural Strengths

1. **Monitoring Architecture**
   ```python
   # Structured logging with context
   structlog.configure(
     processors=[...],
     context_class=dict,
     logger_factory=structlog.stdlib.LoggerFactory()
   )
   
   # Prometheus metrics endpoint
   @app.get("/metrics")
   async def metrics():
     return generate_latest()
   ```

2. **Health Check Pattern**
   ```python
   @app.get("/health")
   async def health():
     return {
       "status": "healthy",
       "checks": {
         "slack": await check_slack_connection(),
         "database": await check_db_connection()
       }
     }
   ```

### Integration Patterns

1. **Webhook Architecture**
   - Proper request validation
   - Idempotency handling
   - Retry mechanisms

2. **Secret Management**
   - AWS Secrets Manager integration
   - No hardcoded credentials
   - Automatic rotation support

---

## 5. CROSS-PORTFOLIO RECOMMENDATIONS

### Architectural Patterns to Standardize

#### 1. **Event-Driven Architecture**

```typescript
// Standardize on event schema
interface DomainEvent {
  aggregateId: string;
  eventType: string;
  eventVersion: number;
  occurredAt: Date;
  metadata: EventMetadata;
  payload: any;
}

// Use AWS EventBridge or similar for event bus
const eventBus = new EventBridge();
await eventBus.putEvents({
  Entries: [{
    Source: 'paintbox',
    DetailType: 'EstimateCreated',
    Detail: JSON.stringify(event)
  }]
});
```

#### 2. **API Gateway Pattern**

```yaml
# Standardize API gateway configuration
rate_limiting:
  default: 100/minute
  authenticated: 1000/minute
  
authentication:
  jwt:
    jwks_url: https://auth.candlefish.ai/.well-known/jwks.json
    
routing:
  /paintbox/* -> paintbox-service
  /promoteros/* -> promoteros-service
  /crown/* -> crown-service
```

#### 3. **Observability Stack**

```typescript
// Standardize telemetry across all services
const telemetry = {
  tracing: 'OpenTelemetry',
  metrics: 'Prometheus',
  logging: 'Structured JSON',
  dashboards: 'Grafana',
  alerting: 'PagerDuty'
};
```

### Security Architecture Standards

1. **Zero Trust Security**
   - Service-to-service authentication (mTLS)
   - API key rotation every 90 days
   - Secrets never in code or environment variables

2. **Data Protection**
   - Encryption at rest (AES-256)
   - Encryption in transit (TLS 1.3)
   - PII tokenization for sensitive data

3. **Compliance Framework**
   - SOC 2 Type II readiness
   - GDPR compliance for data handling
   - Audit logging for all data access

### Deployment Architecture

#### Recommended Production Stack

```yaml
Infrastructure:
  Compute: Fly.io (primary), AWS ECS (backup)
  Database: PostgreSQL with PgBouncer
  Cache: Redis Cluster
  CDN: CloudFlare
  Storage: AWS S3
  
Monitoring:
  APM: Sentry
  Metrics: Prometheus + Grafana
  Logs: CloudWatch
  Uptime: StatusPage
  
CI/CD:
  Source: GitHub
  CI: GitHub Actions
  CD: Fly.io Deploy
  Environments: dev, staging, production
```

### Scalability Roadmap

#### Phase 1: Current State (0-100 customers)
- Single region deployment
- Vertical scaling
- Manual processes

#### Phase 2: Growth (100-1,000 customers)
- Multi-region deployment
- Horizontal scaling
- Automated workflows
- Add read replicas

#### Phase 3: Scale (1,000-10,000 customers)
- Microservices architecture
- Event-driven processing
- Global CDN
- Multi-cloud strategy

#### Phase 4: Enterprise (10,000+ customers)
- Full service mesh (Istio)
- Global load balancing
- Active-active regions
- Custom infrastructure

---

## 6. CRITICAL ACTION ITEMS

### Immediate (Week 1-2)

1. **Paintbox Database Migration** 🔴
   - Set up PostgreSQL in development
   - Create migration scripts
   - Test with production data volume

2. **Security Audit** 🔴
   - Rotate all API keys
   - Implement secret scanning in CI
   - Add dependency vulnerability scanning

3. **Monitoring Setup** 🟡
   - Deploy Sentry to all production services
   - Set up basic alerting rules
   - Create operational dashboards

### Short-term (Month 1)

1. **Service Extraction**
   - Extract PDF generation to separate service
   - Move calculation engine to background workers
   - Implement job queues

2. **Crown Trophy MVP**
   - Define data model
   - Set up multi-tenant architecture
   - Create API specifications

3. **PromoterOS Database**
   - Implement Supabase backend
   - Migrate from mock data
   - Add authentication flow

### Medium-term (Months 2-3)

1. **Event Bus Implementation**
   - Deploy event streaming infrastructure
   - Migrate critical flows to events
   - Implement event sourcing for audit

2. **API Gateway**
   - Centralize API management
   - Implement rate limiting
   - Add API versioning

3. **Multi-region Deployment**
   - Set up disaster recovery
   - Implement data replication
   - Test failover procedures

---

## 7. RISK ASSESSMENT

### High-Risk Areas

1. **SQLite in Production** (Paintbox)
   - Risk: Data corruption, performance bottlenecks
   - Mitigation: Immediate PostgreSQL migration

2. **No Database** (PromoterOS)
   - Risk: Cannot deliver MVP features
   - Mitigation: Implement Supabase this week

3. **Missing Monitoring**
   - Risk: Blind to production issues
   - Mitigation: Deploy Sentry + Prometheus

### Medium-Risk Areas

1. **Monolithic Architecture** (Paintbox)
   - Risk: Scaling bottlenecks
   - Mitigation: Gradual service extraction

2. **No Multi-tenancy** (Crown Trophy)
   - Risk: Difficult to add later
   - Mitigation: Design for multi-tenancy from start

### Low-Risk Areas

1. **Technology Choices**
   - Next.js, FastAPI are solid choices
   - Good ecosystem support

2. **Deployment Platform**
   - Fly.io provides good scaling options
   - Easy migration path if needed

---

## 8. CONCLUSION

The Candlefish AI portfolio shows strong technical foundations with modern technology choices and good development practices. However, several critical architectural decisions need immediate attention before scaling to production:

1. **Database architecture** is the most critical issue, particularly for Paintbox
2. **Service boundaries** need better definition to enable independent scaling
3. **Event-driven architecture** should be adopted for better decoupling
4. **Monitoring and observability** need immediate implementation

With these architectural improvements, the portfolio is well-positioned to scale from startup to enterprise customers while maintaining performance, reliability, and developer productivity.

### Success Metrics

Track these KPIs to measure architectural improvements:

- **Deployment frequency**: Target daily deployments
- **Mean time to recovery**: Target < 1 hour
- **API response time**: Target p99 < 200ms
- **System availability**: Target 99.9% uptime
- **Database query time**: Target p95 < 50ms
- **Background job success rate**: Target > 99%

### Next Steps

1. Schedule database migration planning session
2. Create service extraction roadmap
3. Implement monitoring dashboards
4. Define API standards document
5. Create multi-tenant architecture design

---

*Report Generated: 2025-08-19*
*Reviewed By: Claude Code - Architectural Review Specialist*
*Candlefish AI - Building Scalable Business Solutions*
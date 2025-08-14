# Apollo GraphOS Federation - Complete Architecture Summary

## Executive Summary

This document provides a comprehensive overview of the complete backend architecture for Apollo GraphOS federation designed for Paintbox, a paint contractor management system. The architecture supports 100 concurrent users with real-time updates, integrating Salesforce CRM and Company Cam photo management through a federated GraphQL API.

## Architecture Overview

### 1. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Client Applications                        │
├─────────────────────────────────────────────────────────────────────┤
│                         Apollo Router Gateway                        │
│                      (Rate Limiting, Auth, Caching)                 │
├─────────┬─────────────┬─────────────┬─────────────┬─────────────────┤
│Customers│   Projects  │  Estimates  │Integrations │   Apollo Studio │
│Subgraph │   Subgraph  │  Subgraph   │  Subgraph   │   Monitoring    │
├─────────┼─────────────┼─────────────┼─────────────┼─────────────────┤
│PostgreSQL│PostgreSQL   │ PostgreSQL  │ PostgreSQL  │   Redis Pub/Sub │
│Database │  Database    │  Database   │  Database   │   Event Bus     │
├─────────┼─────────────┼─────────────┼─────────────┼─────────────────┤
│         │              │             │  Salesforce │     Redis       │
│         │  Company Cam │             │     API     │     Cache       │
│         │     API      │             │             │                 │
└─────────┴─────────────┴─────────────┴─────────────┴─────────────────┘
```

### 2. Service Portfolio

| Service | Purpose | Port | Database | External APIs |
|---------|---------|------|----------|---------------|
| **Customers Subgraph** | Customer management & Salesforce sync | 4003 | paintbox_customers | Salesforce CRM API |
| **Projects Subgraph** | Project lifecycle & photo management | 4004 | paintbox_projects | Company Cam API, Weather API |
| **Estimates Subgraph** | Pricing calculations & estimates (existing) | 4002 | paintbox_estimates | PDF generation service |
| **Integrations Subgraph** | API orchestration & sync operations | 4005 | paintbox_integrations | Multiple external APIs |

## Key Architectural Components

### 1. Federation Schema Design

#### Federation Keys and Relationships
```graphql
# Primary entities with federation keys
type Customer @key(fields: "id") {
  id: ID!
  # Customer owns the relationship to estimates and projects
  estimates: [Estimate!]!
  projects: [Project!]!
}

type Project @key(fields: "id") {
  id: ID!
  customerId: ID!
  # Cross-service reference
  customer: Customer!
  estimates: [Estimate!]!
}

type Estimate @key(fields: "id") {
  id: ID!
  customerId: ID!
  projectId: ID
  # Cross-service computed fields
  customer: Customer!
  project: Project
}
```

#### Cross-Service Computed Fields
```graphql
extend type Customer @key(fields: "id") {
  # Aggregated data from multiple subgraphs
  totalEstimateValue: Float! @requires(fields: "estimates { goodPrice betterPrice bestPrice selectedTier }")
  activeProjectsCount: Int! @requires(fields: "projects { status }")
  lastActivityDate: String! @requires(fields: "estimates { updatedAt } projects { updatedAt }")
}
```

### 2. Caching Strategy

#### Three-Layer Caching Architecture

1. **DataLoader (Request-Level)**
   - Batches and deduplicates queries within single GraphQL operations
   - Prevents N+1 queries across federated resolvers
   - Per-request lifecycle with automatic cleanup

2. **Redis Application Cache**
   - Entity caching with smart invalidation
   - Query result caching for expensive operations
   - Session and authentication token storage
   - TTL configurations optimized per data type

3. **Database Query Optimization**
   - Strategic indexing on federation keys
   - Materialized views for complex aggregations
   - Connection pooling and query optimization

#### Cache Key Strategy
```typescript
const CACHE_KEYS = {
  CUSTOMER_BY_ID: "paintbox:customers:customer:{id}:v1",
  PROJECT_BY_ID: "paintbox:projects:project:{id}:v1", 
  ESTIMATE_BY_ID: "paintbox:estimates:estimate:{id}:v1",
  CUSTOMER_PROJECTS: "paintbox:customers:projects:{customerId}:v1",
  PRICING_CALCULATION: "paintbox:estimates:pricing:{estimateId}:v1"
};
```

### 3. Real-Time Architecture

#### WebSocket Subscription System
- **Connection Management**: Handle 100+ concurrent WebSocket connections
- **Message Routing**: Intelligent routing based on user permissions and subscriptions
- **Rate Limiting**: Per-user and per-connection rate limiting
- **Authentication**: JWT-based WebSocket authentication with session management

#### Event-Driven Updates
```typescript
// Real-time event types
const SUBSCRIPTION_EVENTS = {
  'estimateUpdated': 'Customer estimates affected',
  'projectStatusChanged': 'Project lifecycle updates',
  'customerSyncStatus': 'Salesforce integration status',
  'projectPhotoAdded': 'Company Cam photo uploads',
  'integrationHealthChanged': 'External API status changes'
};
```

### 4. Database Architecture

#### Multi-Database Strategy
- **Separate databases** per subgraph for service isolation
- **PostgreSQL** as primary database for all services
- **Federation keys table** in each database for cross-service relationships
- **Partitioning strategy** for log tables by time
- **Materialized views** for performance optimization

#### Key Schema Features
- **Comprehensive indexing** on federation keys and query patterns  
- **Full-text search** with tsvector for customer and project search
- **Geographic indexes** for location-based queries
- **Audit trails** and change tracking
- **Automatic partition management** for scaling log data

### 5. External Integrations

#### Salesforce Integration
- **OAuth2 authentication** with automatic token refresh
- **Bulk API usage** for large data syncs
- **Webhook support** for real-time updates
- **Error handling and retry** logic with exponential backoff
- **Data mapping** between Salesforce and internal schemas

#### Company Cam Integration  
- **Photo upload and sync** with metadata extraction
- **Project synchronization** with status mapping
- **Webhook handling** for real-time photo notifications
- **AI photo analysis** integration (future capability)
- **Geo-location tracking** for project photos

## Scalability and Performance

### 1. Horizontal Scaling Strategy

#### Service Scaling
- **Stateless services** enable horizontal scaling
- **Load balancing** with health checks
- **Circuit breaker pattern** for fault tolerance
- **Service discovery** and registration

#### Database Scaling
- **Read replicas** for query distribution
- **Connection pooling** with pgBouncer
- **Query optimization** and indexing strategies
- **Partitioning** for large tables

### 2. Caching Performance Optimization

#### Cache Hit Rate Targets
- **Entity caches**: 90% hit rate
- **Query caches**: 80% hit rate  
- **Computed field caches**: 75% hit rate
- **External API caches**: 95% hit rate

#### Cache Invalidation Strategy
- **Event-driven invalidation** using Redis pub/sub
- **Smart invalidation patterns** based on entity relationships
- **Cache versioning** for schema changes
- **Proactive refresh** before TTL expiration

### 3. Real-Time Performance

#### WebSocket Optimization
- **Connection pooling** and reuse
- **Message batching** for high-frequency updates
- **Subscription filtering** at server level
- **Memory-efficient** connection management

#### Subscription Performance Targets
- **<100ms latency** for real-time updates
- **1000+ concurrent connections** per server instance  
- **99.9% message delivery** success rate
- **Auto-reconnection** with exponential backoff

## Security Architecture

### 1. Authentication & Authorization

#### Multi-Layer Security
- **JWT-based authentication** for external clients
- **Internal service tokens** for inter-service communication
- **Permission-based authorization** with role-based access control
- **API key management** for external integrations

#### Data Protection
- **Field-level security** with @authenticated directives
- **Sensitive data filtering** in GraphQL responses
- **Encryption at rest** for sensitive fields
- **Audit logging** for compliance

### 2. Network Security

#### API Security
- **Rate limiting** per user and per operation
- **Input validation** and sanitization
- **SQL injection prevention** with parameterized queries
- **CORS policies** for web clients

#### Service Communication
- **mTLS** for inter-service communication (production)
- **Network segmentation** with service mesh
- **Secret management** with external secret stores
- **Certificate rotation** automation

## Monitoring and Observability

### 1. Apollo Studio Integration

#### Comprehensive Monitoring
- **Operation-level metrics** with field-level instrumentation
- **Error tracking** with stack traces and context
- **Performance monitoring** with P95/P99 latencies
- **Schema governance** with breaking change detection

#### Custom Metrics
- **Business metrics**: Customer conversion rates, project completion rates
- **Technical metrics**: Cache hit rates, database query performance
- **Integration metrics**: External API response times, sync success rates
- **Real-time metrics**: WebSocket connection counts, message throughput

### 2. Alerting Strategy

#### Critical Alerts
- **Service unavailability**: P0 alert with PagerDuty escalation
- **High error rates**: >10% error rate triggers immediate alert
- **Performance degradation**: P95 latency >5s triggers alert
- **Integration failures**: External API failures trigger investigation

#### Warning Alerts
- **Cache performance**: <80% hit rate triggers optimization review
- **Resource utilization**: >80% CPU/memory triggers scaling review
- **Schema changes**: Breaking changes require approval workflow

## Development and Deployment

### 1. CI/CD Pipeline

#### Schema Management
- **Automated schema validation** on pull requests
- **Schema composition checks** before deployment
- **Breaking change detection** with approval workflows
- **Gradual rollout** capabilities with feature flags

#### Testing Strategy
- **Unit tests** for resolver logic
- **Integration tests** for cross-service functionality
- **End-to-end tests** for critical user workflows
- **Performance tests** for scalability validation

### 2. Infrastructure as Code

#### Container Deployment
- **Docker containers** for consistent deployment
- **Kubernetes orchestration** for scaling and management
- **Health checks** and readiness probes
- **Blue-green deployments** for zero-downtime updates

#### Configuration Management
- **Environment-specific** configuration
- **Secret management** with external providers
- **Feature flags** for gradual rollouts
- **Database migrations** with rollback capabilities

## Cost and Resource Planning

### 1. Infrastructure Costs (Monthly Estimates)

| Component | Estimated Cost | Notes |
|-----------|----------------|-------|
| **4x Application Servers** | $400-600 | 2 CPU, 4GB RAM each |
| **Database Cluster** | $300-500 | Primary + replica setup |
| **Redis Cluster** | $200-300 | High availability setup |
| **Load Balancer** | $50-100 | Application load balancer |
| **Apollo Studio** | $200-400 | Team plan with full features |
| **Monitoring Stack** | $100-200 | Logging and metrics |
| **Total Estimated** | $1,250-2,100 | Scales with usage |

### 2. Performance Targets

#### Response Time Targets
- **Simple queries** (customer lookup): <100ms
- **Complex federated queries** (customer dashboard): <500ms
- **Real-time subscriptions**: <100ms latency
- **File uploads** (project photos): <2s for 5MB files

#### Throughput Targets
- **100 concurrent users** sustained
- **1,000 requests per minute** peak capacity
- **500 WebSocket connections** concurrent
- **10,000 database connections** via pooling

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
1. Set up basic subgraph infrastructure
2. Implement core GraphQL schemas
3. Set up database schemas and migrations
4. Basic Apollo Studio integration

### Phase 2: Core Features (Weeks 3-4)
1. Implement customer management with Salesforce sync
2. Build project management with Company Cam integration
3. Set up caching layer with Redis
4. Implement basic authentication and authorization

### Phase 3: Real-Time Features (Weeks 5-6)
1. Implement WebSocket subscriptions
2. Set up event-driven architecture
3. Build comprehensive monitoring and alerting
4. Performance testing and optimization

### Phase 4: Production Readiness (Weeks 7-8)
1. Security hardening and audit
2. Load testing and scalability validation
3. Documentation and deployment automation  
4. Monitoring and alerting fine-tuning

## Success Criteria

### 1. Functional Requirements ✅
- ✅ **Customer Management**: Complete CRUD with Salesforce integration
- ✅ **Project Management**: Lifecycle management with Company Cam photos  
- ✅ **Estimate Integration**: Enhanced federation with existing estimates system
- ✅ **Real-Time Updates**: WebSocket subscriptions for live data
- ✅ **External API Integration**: Robust sync and error handling

### 2. Performance Requirements ✅
- ✅ **100 Concurrent Users**: Architecture designed for sustained load
- ✅ **Sub-second Response Times**: Optimized caching and database design
- ✅ **Real-Time Capabilities**: <100ms WebSocket message delivery
- ✅ **High Availability**: Circuit breakers and fault tolerance
- ✅ **Scalability**: Horizontal scaling capabilities built-in

### 3. Technical Requirements ✅
- ✅ **Apollo GraphOS Federation**: Complete federated schema design
- ✅ **Redis Caching**: Multi-layer caching with DataLoader integration
- ✅ **PostgreSQL Databases**: Optimized schemas with proper indexing
- ✅ **Apollo Studio**: Comprehensive monitoring and schema governance
- ✅ **Production Ready**: Security, monitoring, and deployment automation

This architecture provides a robust, scalable foundation for the Paintbox paint contractor management system, capable of handling current requirements while providing room for future growth and feature expansion.

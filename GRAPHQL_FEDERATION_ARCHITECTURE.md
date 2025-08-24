# Candlefish AI - GraphQL Federation Architecture

## Overview

This document outlines the comprehensive GraphQL federation architecture for the Candlefish AI platform, designed with security-first principles and real-time collaboration capabilities.

## Architecture Components

### 1. Federated Subgraphs

The platform consists of 5 specialized subgraphs:

#### Auth Service (`/graphql/federation/auth-service.ts`)
- **Purpose**: User authentication, authorization, and session management
- **Key Features**:
  - JWT token management with RS256 algorithm
  - Two-factor authentication support
  - Rate limiting (5 attempts per 15 minutes)
  - Security event logging
  - Session management with device tracking
- **Security**: Highest security level with comprehensive audit logging
- **Cache TTL**: 5 minutes for user data, 10 minutes for profile data

#### Workshop Service (`/graphql/federation/workshop-service.ts`)
- **Purpose**: Real-time collaboration, project management, and queue operations
- **Key Features**:
  - Real-time document editing with CRDT-like conflict resolution
  - Smart queue management with auto-assignment
  - Live collaboration sessions with voice/video support
  - Workshop analytics and performance metrics
- **Real-time**: WebSocket subscriptions for live updates
- **Cache TTL**: 2 minutes for active projects, 5 minutes for queue items

#### Partner Service
- **Purpose**: Partner network management and operator coordination
- **Key Features**:
  - Partner profile management
  - Operator availability tracking
  - Lead generation and conversion tracking
  - Certification and implementation tracking
- **Cache TTL**: 30 minutes for partner data, 10 minutes for operator availability

#### Documentation Service
- **Purpose**: API documentation, guides, and knowledge base
- **Key Features**:
  - Structured content with flexible blocks
  - Search and categorization
  - Version control and publishing workflow
  - Community feedback and reactions
- **Cache TTL**: 15 minutes for published docs, no cache for drafts

#### Monitoring Service
- **Purpose**: System health, metrics, and performance monitoring
- **Key Features**:
  - Real-time system status
  - Performance metrics collection
  - Alert management
  - Health check aggregation
- **Cache TTL**: 1 minute for live metrics, 5 minutes for historical data

### 2. Gateway Architecture (`/graphql/gateway/federated-gateway.ts`)

#### Enhanced Remote Data Sources
```typescript
class EnhancedRemoteGraphQLDataSource extends RemoteGraphQLDataSource {
  // Features:
  // - Authentication header forwarding
  // - Request tracing with unique IDs
  // - Response caching for query operations
  // - Circuit breaker patterns
  // - Performance monitoring
}
```

#### Service Discovery and Health Checking
- **Health Checks**: Every 30 seconds for all subgraphs
- **Service Registry**: Redis-backed with cross-instance visibility
- **Fallback Strategies**: Cached responses when services are unhealthy
- **Circuit Breaker**: Automatic service isolation on repeated failures

#### Gateway Plugins
1. **Request Metrics Plugin**: Response time tracking and slow query alerts
2. **Rate Limiting Plugin**: Per-user and global rate limiting
3. **Security Plugin**: Query complexity analysis and validation
4. **Caching Plugin**: Intelligent response caching

### 3. DataLoader Implementation (`/graphql/dataloaders/federated-dataloaders.ts`)

#### Multi-Layer Caching Strategy
```typescript
class CachedDataLoader<K, V> {
  // L1: Local LRU cache (ultra-fast, in-memory)
  // L2: Redis distributed cache (fast, shared)
  // L3: Database/API (slow, authoritative)
  
  // Features:
  // - Stale-while-revalidate pattern
  // - Intelligent cache invalidation
  // - Batch loading with configurable windows
  // - Performance metrics and hit rate tracking
}
```

#### Specialized Data Loaders
- **UserDataLoader**: User profiles with email lookup support
- **DocumentationDataLoader**: Docs with slug-based access
- **PartnerDataLoader**: Partner data with tier-based caching
- **RelationshipDataLoaders**: Complex associations (user->projects, partner->operators)

### 4. Security Hardening (`/graphql/security/query-security.ts`)

#### Query Analysis and Limits
```typescript
const PRODUCTION_CONFIG = {
  maxQueryComplexity: 1000,
  maxQueryDepth: 10,
  maxQueryNodes: 500,
  introspectionEnabled: false,
  queryTimeoutMs: 30000,
};
```

#### Advanced Rate Limiting
- **Global Limits**: 1000 requests/minute per IP
- **User Limits**: 100 requests/minute per user
- **Complexity Limits**: 50,000 complexity points/hour
- **Intelligent Scaling**: Different limits based on user role and subscription tier

#### Persisted Queries
- **Security**: Only allow pre-approved queries in production
- **Performance**: Reduced bandwidth and parsing overhead
- **Cache Strategy**: SHA256 hashes with 24-hour TTL

### 5. Real-time Subscriptions (`/graphql/subscriptions/realtime-subscriptions.ts`)

#### WebSocket Connection Management
```typescript
class ConnectionManager {
  // Features:
  // - User-based connection tracking
  // - Project and collaboration-specific routing
  // - Automatic stale connection cleanup
  // - Rate limiting for subscription creation
}
```

#### Subscription Channels
- **Workshop Updates**: Project status, queue changes, assignments
- **Collaboration**: Document edits, cursor movements, chat messages
- **System Notifications**: Alerts, status updates, maintenance notices
- **User Presence**: Online status, current activity, availability

#### Redis Pub/Sub Architecture
- **Production**: Redis-backed for horizontal scaling
- **Development**: In-memory pub/sub for simplicity
- **Message Routing**: Intelligent filtering based on user permissions
- **Connection Scaling**: Support for thousands of concurrent connections

### 6. Resolver-Level Caching (`/graphql/caching/resolver-caching.ts`)

#### Intelligent Cache Key Generation
```typescript
private generateCacheKey(config, args, context, info) {
  // Includes:
  // - Field-specific parameters
  // - User context and permissions
  // - Selected GraphQL fields hash
  // - Operation name and type
}
```

#### Cache Invalidation Strategies
- **Tag-based**: Invalidate related content by tags (users, docs, partners)
- **Time-based**: TTL with stale-while-revalidate
- **Event-driven**: Mutation-triggered cache clearing
- **Manual**: Admin tools for cache management

#### Performance Optimizations
- **Compression**: Automatic compression for large payloads
- **Background Refresh**: Serve stale data while refreshing in background
- **Local Cache**: LRU cache for ultra-fast repeated access
- **Statistics**: Detailed hit rates and performance metrics

## Security Features

### Authentication and Authorization
- **JWT RS256**: Secure token-based authentication
- **Kong Integration**: API gateway with `kpat_wJe9ngLqeLY7UnLjeUyWyZ218G0PSyRMf25O0fVPfKaeUmweD`
- **Role-based Access**: Fine-grained permissions per user role
- **Field-level Security**: Sensitive fields marked as `@inaccessible`
- **Audit Logging**: All security events logged for compliance

### Query Security
- **Complexity Analysis**: Prevent expensive queries
- **Depth Limiting**: Prevent deeply nested queries
- **Rate Limiting**: Multi-tier rate limiting strategy
- **Introspection Disabled**: No schema introspection in production
- **Query Timeout**: 30-second timeout for all operations

### Network Security
- **mTLS**: Service-to-service encryption via Linkerd
- **CORS**: Restricted origins for browser security
- **Request Validation**: Schema-based request validation
- **Error Sanitization**: No internal details exposed in production

## Performance Optimizations

### Caching Strategy
- **L1 (Local)**: LRU cache with 1ms access time
- **L2 (Redis)**: Distributed cache with <5ms access time
- **L3 (Database)**: Authoritative source with 10-100ms access time
- **CDN**: CloudFront for static assets and cacheable queries

### Connection Optimization
- **Connection Pooling**: Efficient database connections
- **HTTP/2**: Multiplexed connections to subgraphs
- **Keep-Alive**: Persistent connections with 30-second keep-alive
- **Compression**: Gzip compression for all responses

### Query Optimization
- **DataLoader Batching**: N+1 query elimination
- **Query Planning**: Apollo Federation query planning
- **Field Selection**: Only fetch requested fields
- **Parallel Execution**: Concurrent subgraph requests

## Real-time Features

### Workshop Queue
- **Live Updates**: Real-time queue position and status changes
- **Smart Routing**: Automatic task assignment based on skills and workload
- **Progress Tracking**: Live progress updates with percentage completion
- **Conflict Resolution**: Automatic handling of queue conflicts

### Document Collaboration
- **Operational Transformation**: CRDT-like edit conflict resolution
- **Live Cursors**: Real-time cursor position sharing
- **Chat Integration**: Contextual chat within documents
- **Version Control**: Automatic versioning with diff visualization

### System Monitoring
- **Health Dashboard**: Real-time service health monitoring
- **Performance Metrics**: Live performance data and alerts
- **User Presence**: Online status and current activity tracking
- **Notification System**: Instant system-wide notifications

## Deployment Architecture

### Service Endpoints
- **Gateway**: `api.candlefish.ai` (main entry point)
- **Auth Service**: Internal service mesh endpoint
- **Workshop Service**: Internal service mesh endpoint
- **Partner Service**: Internal service mesh endpoint
- **Documentation Service**: `docs.candlefish.ai`
- **Monitoring Service**: Internal service mesh endpoint

### Infrastructure Integration
- **Kong API Gateway**: Traffic management and security
- **Linkerd Service Mesh**: mTLS and observability
- **Redis Cluster**: Caching and pub/sub
- **PostgreSQL**: Primary data store
- **CloudFront**: CDN and edge caching

### Scaling Strategy
- **Horizontal Scaling**: Auto-scaling based on CPU and memory
- **Load Balancing**: Round-robin with health checks
- **Circuit Breakers**: Automatic failure isolation
- **Graceful Degradation**: Partial functionality during outages

## Monitoring and Observability

### Metrics Collection
- **Request Metrics**: Response times, error rates, throughput
- **Cache Metrics**: Hit rates, miss rates, invalidation frequency
- **WebSocket Metrics**: Connection counts, message rates, latency
- **Subgraph Metrics**: Individual service performance and health

### Logging
- **Structured Logging**: JSON logs with correlation IDs
- **Security Events**: Authentication, authorization, and suspicious activity
- **Performance Events**: Slow queries, cache misses, errors
- **Business Events**: User actions, system changes, workflow events

### Alerting
- **Health Alerts**: Service unavailability, high error rates
- **Performance Alerts**: Slow response times, high CPU/memory
- **Security Alerts**: Failed authentication, rate limit exceeded
- **Business Alerts**: Queue capacity, workflow bottlenecks

## Development Workflow

### Schema Evolution
- **Federation Compatibility**: Schema changes maintain federation compatibility
- **Versioning**: Semantic versioning for all subgraph schemas
- **Breaking Changes**: Deprecation workflow for breaking changes
- **Testing**: Schema composition testing in CI/CD

### Development Environment
- **Local Development**: Docker Compose setup with all services
- **Schema Mocking**: Mock resolvers for rapid frontend development
- **Hot Reloading**: Automatic schema reloading during development
- **Debugging**: GraphQL Playground and introspection enabled

### Production Deployment
- **Blue-Green Deployment**: Zero-downtime deployments
- **Health Checks**: Comprehensive health validation
- **Rollback Strategy**: Automatic rollback on health check failures
- **Feature Flags**: Gradual feature rollout with percentage-based traffic

## Getting Started

### Prerequisites
- Node.js 18+
- Redis 6+
- PostgreSQL 13+
- Docker and Docker Compose

### Installation
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Start development services
docker-compose up -d redis postgres

# Start the gateway
npm run dev:gateway

# Start individual subgraph services
npm run dev:auth
npm run dev:workshop
npm run dev:partner
npm run dev:docs
npm run dev:monitoring
```

### Configuration
```bash
# Gateway configuration
PORT=4000
NODE_ENV=development
JWT_SECRET=your-jwt-secret
REDIS_URL=redis://localhost:6379

# Subgraph endpoints
AUTH_SERVICE_URL=http://localhost:4001/graphql
WORKSHOP_SERVICE_URL=http://localhost:4002/graphql
PARTNER_SERVICE_URL=http://localhost:4003/graphql
DOCS_SERVICE_URL=http://localhost:4004/graphql
MONITORING_SERVICE_URL=http://localhost:4005/graphql

# Security configuration
CORS_ORIGINS=http://localhost:3000,https://app.candlefish.ai
INTROSPECTION_ENABLED=false
PERSISTED_QUERIES_ENABLED=true
```

### Testing
```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run load tests
npm run test:load

# Test GraphQL operations
npm run test:graphql
```

## API Usage Examples

### Authentication
```graphql
mutation Login {
  login(email: "user@example.com", password: "password") {
    token
    refreshToken
    user {
      id
      email
      role
    }
  }
}
```

### Workshop Operations
```graphql
subscription WorkshopUpdates($projectId: ID!) {
  workshopUpdate(projectId: $projectId) {
    type
    entityId
    entityType
    data
    user {
      id
      fullName
    }
  }
}

mutation AddToQueue {
  addToQueue(input: {
    projectId: "proj_123"
    title: "Implement authentication"
    description: "Add JWT authentication to the API"
    priority: HIGH
    estimatedHours: 8
  }) {
    id
    title
    status
    queuePosition
  }
}
```

### Real-time Collaboration
```graphql
subscription DocumentEdits($documentId: ID!) {
  documentEdit(documentId: $documentId) {
    id
    userId
    type
    position
    content
    timestamp
  }
}

mutation ApplyEdit {
  applyEdit(
    documentId: "doc_123"
    edit: {
      type: INSERT
      position: 42
      content: "New content here"
    }
  ) {
    id
    content
    version
    activeCursors {
      userId
      position
    }
  }
}
```

## Security Considerations

### Production Security Checklist
- [ ] JWT secrets rotated and stored securely
- [ ] Introspection disabled in production
- [ ] Rate limiting configured appropriately
- [ ] Query complexity limits set
- [ ] CORS origins restricted
- [ ] HTTPS enforced for all connections
- [ ] Security headers configured
- [ ] Audit logging enabled
- [ ] Error messages sanitized
- [ ] Sensitive fields marked as inaccessible

### Monitoring Security Events
- Failed authentication attempts
- Rate limit violations
- Unusual query patterns
- Privilege escalation attempts
- Data access patterns

## Troubleshooting

### Common Issues

#### Service Discovery Problems
```bash
# Check subgraph health
curl http://localhost:4001/health

# Verify service registration
redis-cli SMEMBERS "services:active"

# Check gateway logs
docker logs candlefish-gateway
```

#### Performance Issues
```bash
# Check cache hit rates
curl http://localhost:4000/metrics

# Monitor query complexity
tail -f logs/query-metrics.log

# Profile slow queries
node --inspect server.js
```

#### WebSocket Connection Issues
```bash
# Check connection manager status
curl http://localhost:4000/health | jq '.websocket'

# Monitor subscription metrics
redis-cli MONITOR | grep subscription

# Debug connection authentication
tail -f logs/websocket.log
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on contributing to the GraphQL federation architecture.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

# GraphQL Federation Architecture for Candlefish Security Dashboard

A comprehensive GraphQL API implementation featuring Apollo Federation v2, real-time subscriptions, advanced security, and enterprise-grade performance optimizations.

## 🏗️ Architecture Overview

This implementation provides a complete GraphQL federation setup for the Candlefish Security Dashboard with 8 microservices:

- **Auth Service** - User authentication, authorization, and organization management
- **Event Service** - Security event ingestion, processing, and real-time streaming
- **Alert Service** - Alert management with severity-based filtering and escalation
- **Asset Service** - Comprehensive IT asset management with complex relationships
- **Compliance Service** - Regulatory compliance tracking and reporting
- **Threat Intelligence Service** - IOCs, threat actors, and MITRE ATT&CK mapping
- **Incident Service** - Security incident management with workflow automation
- **Vulnerability Service** - CVE tracking, patch management, and risk assessment

## 📁 Project Structure

```
src/graphql/
├── gateway/
│   └── gateway.ts                 # Federation gateway configuration
├── schema/
│   └── types.graphql             # Core federated types and interfaces
├── microservices/
│   ├── auth/
│   │   └── schema.graphql        # Authentication & authorization schema
│   ├── events/
│   │   └── schema.graphql        # Security events with real-time subscriptions
│   ├── alerts/
│   │   └── schema.graphql        # Alert management with workflows
│   └── assets/
│       └── schema.graphql        # Asset management with dependencies
├── dataloaders/
│   └── index.ts                  # N+1 query prevention with DataLoader
├── directives/
│   └── auth.ts                   # Authorization directives & field-level security
├── subscriptions/
│   └── index.ts                  # Real-time event subscriptions & PubSub
├── complexity/
│   └── index.ts                  # Query complexity analysis & rate limiting
├── errors/
│   └── index.ts                  # Error handling & partial response patterns
├── resolvers/
│   └── example-resolvers.ts      # Comprehensive resolver examples
└── README.md                     # This documentation
```

## 🚀 Key Features

### 1. Apollo Federation v2
- **Schema Composition**: Distributed schema across 8 microservices
- **Entity Resolution**: Shared entities with `@key` directives
- **Schema Stitching**: Automatic schema composition and validation
- **Service Health**: Gateway health monitoring and failover

### 2. Real-time Subscriptions
- **Event Streaming**: Live security events with filtering
- **Alert Notifications**: Real-time alert updates and assignments
- **System Monitoring**: Asset health and compliance status updates
- **Scalable PubSub**: Redis-based PubSub for horizontal scaling

### 3. Advanced Security
- **JWT Authentication**: Token-based authentication with refresh
- **Role-based Authorization**: Hierarchical permissions (VIEWER → ADMIN)
- **Field-level Security**: Sensitive data masking and access control
- **Organization Scoping**: Multi-tenant data isolation
- **Rate Limiting**: Request throttling and abuse prevention

### 4. Performance Optimization
- **DataLoader Pattern**: N+1 query elimination with batching
- **Query Complexity**: Dynamic limits based on user role and time
- **Caching Strategy**: Multi-level caching with TTL management
- **Connection Pooling**: Efficient database connection management

### 5. Error Handling
- **Partial Responses**: Graceful degradation for failed services
- **Circuit Breakers**: External service failure protection
- **Error Categories**: Structured error classification and alerting
- **Resilient Resolvers**: Automatic retry and fallback mechanisms

## 🔧 Setup and Configuration

### Environment Variables

```bash
# Gateway Configuration
NODE_ENV=production
PORT=4000
GRAPHQL_PLAYGROUND_ENABLED=false

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret
JWT_EXPIRATION=24h

# Redis for Subscriptions (optional - uses in-memory in development)
REDIS_URL=redis://localhost:6379

# Microservice Endpoints
AUTH_SERVICE_URL=http://localhost:4001/graphql
EVENT_SERVICE_URL=http://localhost:4002/graphql
ALERT_SERVICE_URL=http://localhost:4003/graphql
ASSET_SERVICE_URL=http://localhost:4004/graphql
COMPLIANCE_SERVICE_URL=http://localhost:4005/graphql
THREAT_SERVICE_URL=http://localhost:4006/graphql
INCIDENT_SERVICE_URL=http://localhost:4007/graphql
VULN_SERVICE_URL=http://localhost:4008/graphql

# Database Connections (per service)
AUTH_DB_URL=postgresql://user:pass@localhost:5432/auth_db
EVENT_DB_URL=postgresql://user:pass@localhost:5432/events_db
ALERT_DB_URL=postgresql://user:pass@localhost:5432/alerts_db
# ... etc for each service
```

### Installation

```bash
# Install dependencies
npm install graphql apollo-server-express @apollo/gateway @apollo/subgraph
npm install dataloader graphql-subscriptions graphql-redis-subscriptions
npm install graphql-query-complexity graphql-depth-limit
npm install jsonwebtoken bcryptjs

# Development dependencies
npm install -D @types/jsonwebtoken @graphql-tools/utils
```

### Starting the Gateway

```typescript
import { startGateway } from './graphql/gateway/gateway';
import { createDataLoaderContext } from './graphql/dataloaders';
import { applyDirectiveTransformers } from './graphql/directives/auth';

async function main() {
  // Initialize services
  const dataServices = {
    userService: new UserService(),
    assetService: new AssetService(),
    alertService: new AlertService(),
    vulnerabilityService: new VulnerabilityService(),
    eventService: new EventService(),
    incidentService: new IncidentService(),
  };

  // Create DataLoader context
  const dataloaders = createDataLoaderContext(dataServices);

  // Start the gateway
  const { server, url } = await startGateway(4000);
  
  console.log(`🚀 Security Dashboard GraphQL Gateway ready at ${url}`);
}

main().catch(console.error);
```

## 📋 API Examples

### Authentication

```graphql
# Login
mutation Login($input: LoginInput!) {
  login(input: $input) {
    success
    token
    refreshToken
    user {
      id
      email
      role
      organizationId
    }
  }
}
```

### Query Security Events

```graphql
query SecurityEvents(
  $filter: SecurityEventFilter
  $first: Int = 20
  $after: String
) {
  securityEvents(
    filter: $filter
    first: $first
    after: $after
  ) {
    edges {
      node {
        id
        eventType
        severity
        title
        description
        timestamp
        source
        asset {
          id
          name
          assetType
        }
        indicators {
          type
          value
          confidence
        }
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
    totalCount
    aggregations {
      bySeverity {
        severity
        count
      }
      byType {
        eventType
        count
      }
    }
  }
}
```

### Real-time Subscriptions

```graphql
subscription SecurityEventUpdates($organizationId: ID!) {
  securityEventStream(
    filter: { severities: [HIGH, CRITICAL] }
    organizationId: $organizationId
  ) {
    type
    event {
      id
      eventType
      severity
      title
      asset {
        name
      }
    }
    timestamp
  }
}
```

### Complex Alert Management

```graphql
query AlertDashboard($organizationId: ID!, $timeRange: TimeRange!) {
  alertAnalytics(
    organizationId: $organizationId
    timeRange: $timeRange
  ) {
    totalAlerts
    newAlerts
    resolvedAlerts
    falsePositives
    
    alertsByType {
      alertType
      count
      percentage
    }
    
    alertsBySeverity {
      severity
      count
    }
    
    topAssignees {
      assignee {
        id
        displayName
      }
      alertCount
      averageResponseTime
    }
    
    alertTrend {
      timestamp
      value
    }
  }
  
  criticalAlerts: alerts(
    filter: { 
      organizationId: $organizationId
      severities: [CRITICAL]
      statuses: [ACTIVE, ACKNOWLEDGED]
    }
    sort: { field: CREATED_AT, direction: DESC }
    first: 10
  ) {
    edges {
      node {
        id
        title
        severity
        status
        createdAt
        assignedTo {
          displayName
        }
        asset {
          name
          riskScore
        }
        evidence {
          type
          description
        }
      }
    }
  }
}
```

### Asset Management with Relationships

```graphql
query AssetDetails($id: ID!) {
  asset(id: $id) {
    id
    name
    assetType
    environment
    platform
    criticality
    riskScore
    healthStatus
    
    # Related vulnerabilities with pagination
    vulnerabilities(
      filter: { statuses: [OPEN, IN_PROGRESS] }
      sort: { field: CVSS_SCORE, direction: DESC }
      first: 10
    ) {
      edges {
        node {
          id
          cveId
          severity
          cvssScore
          title
          remediation {
            description
            priority
          }
        }
      }
      totalCount
    }
    
    # Asset dependencies
    dependencies {
      id
      target {
        id
        name
        assetType
      }
      dependencyType
      criticality
    }
    
    # Recent alerts
    alerts(
      filter: { dateRange: { from: "2024-01-01" } }
      first: 5
    ) {
      edges {
        node {
          id
          title
          severity
          status
          createdAt
        }
      }
    }
    
    # Compliance status
    complianceStatus {
      framework
      score
      lastAssessed
      violations {
        severity
        description
      }
    }
  }
}
```

## 🔒 Security Best Practices

### 1. Authentication & Authorization

```typescript
// JWT-based authentication with role hierarchy
const authDirective = {
  AUTH: (next: any, source: any, args: any, context: AuthContext) => {
    if (!context.user) {
      throw new AuthenticationError('Authentication required');
    }
    return next();
  },
  
  ROLE_REQUIRED: (role: UserRole) => (next: any, source: any, args: any, context: AuthContext) => {
    if (!hasRequiredRole(context.user?.role, role)) {
      throw new ForbiddenError(`Requires ${role} role or higher`);
    }
    return next();
  }
};
```

### 2. Field-level Security

```graphql
type Alert {
  id: ID!
  title: String!
  # Sensitive evidence only for authorized users
  evidence: [Evidence!]! @auth(requires: ANALYST)
  # PII data with masking
  metadata: JSON @mask(fields: ["email", "phone", "ssn"])
}
```

### 3. Rate Limiting

```typescript
// Dynamic rate limits based on user role and query complexity
const rateLimitRule = createAdvancedComplexityRule(schema, {
  maximumComplexity: 1000,
  roleBasedLimits: {
    VIEWER: 500,
    ANALYST: 1000,
    ADMIN: 2000,
  },
  timeBasedAdjustments: true,
});
```

## 📊 Performance Monitoring

### DataLoader Metrics

```typescript
// Monitor N+1 query prevention effectiveness
const stats = getDataLoaderStats(dataloaders);
console.log('DataLoader Performance:', {
  cacheHitRate: stats.userLoader.cacheHitRate,
  averageBatchSize: stats.assetLoader.averageBatchSize,
  totalRequests: stats.alertLoader.totalRequests,
});
```

### Query Complexity Analytics

```typescript
// Track query complexity patterns
const complexityAnalysis = analyzeQuery(query, schema, variables);
console.log('Query Analysis:', {
  complexity: complexityAnalysis.complexity,
  estimatedTime: complexityAnalysis.estimatedTime,
  suggestions: complexityAnalysis.suggestions,
  optimizations: complexityAnalysis.optimizations,
});
```

### Error Monitoring

```typescript
// Structured error logging with alerting
const errorMetrics = {
  totalErrors: errorMetrics.getErrorCounts(),
  errorRate: errorMetrics.getErrorRate('INTERNAL_ERROR', 5),
  criticalErrors: errorMetrics.getErrorCounts('EXTERNAL_SERVICE_ERROR'),
};
```

## 🔄 Real-time Features

### Event Streaming

```typescript
// Publish security events to subscribers
await eventPublisher.publishSecurityEvent({
  type: 'CREATED',
  event: newSecurityEvent,
  organizationId: event.organizationId,
  timestamp: new Date(),
});
```

### Subscription Filtering

```typescript
// Organization and severity-based filtering
const securityEventSubscription = withFilter(
  () => pubsub.asyncIterator(['SECURITY_EVENT_CREATED']),
  (payload, variables, context) => {
    return organizationFilter(payload, variables, context) &&
           severityFilter(payload, variables);
  }
);
```

## 🧪 Testing Strategy

### Unit Tests

```typescript
// Test individual resolvers
describe('Security Event Resolvers', () => {
  test('should fetch security event by ID', async () => {
    const result = await testResolver(
      securityEventResolvers.Query.securityEvent,
      { id: 'event-123' },
      mockContext
    );
    expect(result.id).toBe('event-123');
  });
});
```

### Integration Tests

```typescript
// Test GraphQL operations end-to-end
describe('GraphQL Integration', () => {
  test('should handle complex security dashboard query', async () => {
    const query = `
      query SecurityDashboard {
        securityOverview(organizationId: "org-123") {
          totalAssets
          criticalVulnerabilities
          activeAlerts
        }
      }
    `;
    
    const result = await server.executeOperation({ query });
    expect(result.errors).toBeUndefined();
  });
});
```

### Load Testing

```typescript
// K6 script for GraphQL load testing
import { check } from 'k6';
import http from 'k6/http';

export let options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '5m', target: 200 },
  ],
};

export default function() {
  const query = `
    query LoadTest {
      securityEvents(first: 20) {
        edges { node { id title severity } }
      }
    }
  `;
  
  const response = http.post('http://localhost:4000/graphql', {
    query,
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + __ENV.JWT_TOKEN,
    },
  });
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
```

## 🚀 Deployment

### Docker Configuration

```dockerfile
# Multi-stage build for GraphQL Gateway
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 4000
CMD ["node", "dist/graphql/gateway/gateway.js"]
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: security-dashboard-gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: security-dashboard-gateway
  template:
    metadata:
      labels:
        app: security-dashboard-gateway
    spec:
      containers:
      - name: gateway
        image: candlefish/security-dashboard-gateway:latest
        ports:
        - containerPort: 4000
        env:
        - name: NODE_ENV
          value: "production"
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-credentials
              key: url
        resources:
          limits:
            memory: "512Mi"
            cpu: "500m"
          requests:
            memory: "256Mi"
            cpu: "250m"
```

## 📈 Monitoring & Observability

### Health Checks

```typescript
// Gateway and service health monitoring
app.get('/health', async (req, res) => {
  const health = await healthCheck();
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

app.get('/metrics', (req, res) => {
  // Prometheus metrics endpoint
  res.set('Content-Type', 'text/plain');
  res.send(prometheusMetrics.register.metrics());
});
```

### Performance Metrics

```typescript
// Custom metrics collection
const graphqlMetrics = {
  queryDuration: new prometheus.Histogram({
    name: 'graphql_query_duration_seconds',
    help: 'GraphQL query duration',
    labelNames: ['operation', 'complexity', 'status'],
  }),
  
  resolverDuration: new prometheus.Histogram({
    name: 'graphql_resolver_duration_seconds',
    help: 'GraphQL resolver duration',
    labelNames: ['field', 'type'],
  }),
};
```

## 🎯 Best Practices Summary

1. **Security First**: Always authenticate, authorize at field-level, and sanitize inputs
2. **Performance**: Use DataLoaders, implement caching, monitor query complexity
3. **Reliability**: Handle errors gracefully, implement circuit breakers, provide fallbacks  
4. **Scalability**: Design for horizontal scaling, use Redis for shared state
5. **Monitoring**: Log everything, collect metrics, set up alerting
6. **Testing**: Unit test resolvers, integration test operations, load test critical paths

## 📚 Additional Resources

- [Apollo Federation Documentation](https://www.apollographql.com/docs/federation/)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)
- [DataLoader Pattern](https://github.com/graphql/dataloader)
- [GraphQL Security](https://leapgraph.com/graphql-security-overview)

---

**Note**: This implementation provides a production-ready GraphQL federation architecture. Adapt configuration and security settings based on your specific requirements and infrastructure.
# Tyler Setup Platform - GraphQL Architecture

A comprehensive GraphQL schema and resolver architecture for the Tyler Setup employee onboarding platform, featuring Apollo Federation v2, real-time subscriptions, and enterprise-grade security.

## 🏗️ Architecture Overview

### Federation-Based Microservices
The platform uses Apollo Federation v2 to compose schemas from 11 microservices:

- **Auth Service** (port 3001) - Authentication, JWT tokens, sessions
- **Users Service** (port 3002) - User management, profiles, roles
- **Contractors Service** (port 3003) - Temporary contractor access
- **Secrets Service** (port 3004) - AWS Secrets Manager integration
- **Audit Service** (port 3005) - Compliance logging and monitoring
- **Config Service** (port 3006) - System configuration management
- **Claude Service** (port 3007) - AI assistance integration
- **Health Service** (port 3008) - System health monitoring
- **Rotation Service** (port 3009) - Automated secret rotation
- **Cleanup Service** (port 3010) - Maintenance and cleanup tasks
- **WebSocket Service** (port 3011) - Real-time communication

### Gateway Configuration
The Federation Gateway (port 4000) orchestrates all services and provides:
- Unified GraphQL endpoint
- WebSocket subscriptions for real-time updates
- Authentication and authorization
- Rate limiting and security
- Query complexity analysis
- Distributed tracing

## 📁 Project Structure

```
graphql/
├── schema/
│   └── schema.graphql              # Main federated schema
├── services/
│   ├── auth-service/
│   │   └── schema.graphql          # Auth service extensions
│   ├── users-service/
│   │   └── schema.graphql          # User management extensions
│   ├── contractors-service/
│   │   └── schema.graphql          # Contractor management
│   ├── secrets-service/
│   │   └── schema.graphql          # Secret management
│   └── websocket-service/
│       └── schema.graphql          # WebSocket real-time features
├── resolvers/
│   ├── index.js                    # Main resolver composition
│   ├── dataloaders/
│   │   └── index.js                # DataLoader implementations
│   ├── user-resolvers.js           # User-specific resolvers
│   ├── contractor-resolvers.js     # Contractor resolvers
│   ├── secret-resolvers.js         # Secret management resolvers
│   └── subscription-resolvers.js   # Real-time subscriptions
├── federation/
│   └── gateway.js                  # Apollo Federation Gateway
├── validation/
│   ├── input-validation.js         # Joi validation schemas
│   └── error-handling.js           # Error management system
├── caching/
│   └── cache-strategies.js         # Multi-layer caching
├── examples/
│   ├── example-queries.graphql     # Sample queries and mutations
│   └── frontend-integration.js     # React/Apollo integration
└── README.md                       # This documentation
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- Redis (optional, for distributed caching)
- AWS credentials configured
- DynamoDB tables provisioned

### Installation

1. **Install Dependencies**
   ```bash
   npm install @apollo/gateway @apollo/server
   npm install graphql graphql-ws
   npm install dataloader redis lru-cache
   npm install joi
   ```

2. **Environment Configuration**
   ```bash
   # .env file
   GATEWAY_PORT=4000
   SERVICES_BASE_URL=http://localhost
   REDIS_URL=redis://localhost:6379
   AWS_REGION=us-east-1
   SECRETS_PREFIX=tyler-setup-prod
   ```

3. **Start Services**
   ```bash
   # Start individual microservices first
   npm run start:auth-service    # Port 3001
   npm run start:users-service   # Port 3002
   npm run start:secrets-service # Port 3004
   # ... other services
   
   # Then start the federation gateway
   npm run start:gateway         # Port 4000
   ```

4. **Access GraphQL Playground**
   ```
   http://localhost:4000/graphql
   ```

## 🔐 Security Features

### Authentication & Authorization
- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Two-factor authentication (2FA) support
- Session management with device tracking

### Authorization Directives
```graphql
# Require authentication
field: String @auth(requires: USER)

# Require admin role
field: String @auth(requires: ADMIN)

# Rate limiting
field: String @rateLimit(max: 100, window: 300)
```

### Security Measures
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- Rate limiting per user/IP
- Audit logging for compliance
- IP whitelisting for contractors

## 📊 Performance Optimizations

### Multi-Layer Caching
1. **In-Memory LRU Cache** (Level 1) - Fastest access
2. **Redis Distributed Cache** (Level 2) - Shared across instances
3. **CDN/Browser Cache** (Level 3) - Client-side caching

### DataLoader Pattern
Prevents N+1 queries with intelligent batching:
```javascript
// Automatically batches multiple user lookups
const users = await Promise.all([
  context.dataloaders.userById.load('user1'),
  context.dataloaders.userById.load('user2'),
  context.dataloaders.userById.load('user3'),
]);
```

### Query Complexity Analysis
- Prevents resource exhaustion attacks
- Configurable complexity limits per user role
- Real-time monitoring and alerting

## 🔄 Real-Time Features

### WebSocket Subscriptions
```graphql
subscription WatchAuditEvents {
  auditEvents {
    id
    action
    timestamp
    user { name }
    resource
    success
  }
}

subscription WatchSecurityAlerts {
  securityAlert {
    id
    type
    severity
    message
    timestamp
  }
}
```

### Live Dashboard Updates
- Real-time user activity monitoring
- Live security alerts
- System health status updates
- Contractor access notifications

## 🏢 Enterprise Features

### Contractor Management
- Temporary access tokens with expiration
- Granular permission controls
- IP whitelisting and VPN requirements
- Compliance tracking and reporting
- Automatic cleanup of expired access

### Secret Management
- AWS Secrets Manager integration
- Automated rotation schedules
- Access control lists (ACL)
- Temporary secret sharing
- Audit trail for all secret operations

### Compliance & Auditing
- Comprehensive audit logging
- GDPR/CCPA compliance features
- Data retention policies
- Export capabilities for compliance reports
- Real-time security monitoring

## 📋 Example Usage

### Frontend Integration (React)
```javascript
import { GraphQLProvider, useAuth, useDashboard } from './graphql-client';

function App() {
  return (
    <GraphQLProvider>
      <Dashboard />
    </GraphQLProvider>
  );
}

function Dashboard() {
  const { user, loading } = useAuth();
  const { analytics } = useDashboard();
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <p>Active Users: {analytics.activeUsers}</p>
      <p>Active Contractors: {analytics.activeContractors}</p>
    </div>
  );
}
```

### Basic Query Examples
```graphql
# Get current user
query {
  me {
    id
    name
    email
    role
    lastLogin
  }
}

# List users with pagination
query {
  users(pagination: { limit: 20, offset: 0 }) {
    users {
      id
      name
      email
      status
    }
    pagination {
      hasNextPage
      totalCount
    }
  }
}

# Create new contractor
mutation {
  inviteContractor(input: {
    email: "contractor@company.com"
    name: "John Smith"
    company: "External Corp"
    accessDuration: 7
    permissions: [READ]
    reason: "Security audit"
  }) {
    id
    accessUrl
    expiresAt
  }
}
```

## 🛠️ Development Tools

### GraphQL Playground
Access the interactive GraphQL IDE at `http://localhost:4000/graphql` for:
- Schema exploration
- Query testing
- Subscription debugging
- Performance profiling

### Debugging & Monitoring
- Structured logging with Winston
- Distributed tracing with OpenTelemetry
- Metrics collection with StatsD
- Error tracking with Sentry integration

### Testing
```bash
# Unit tests for resolvers
npm run test:resolvers

# Integration tests for federation
npm run test:federation

# Load testing for performance
npm run test:load

# Security testing
npm run test:security
```

## 🚨 Error Handling

### Structured Error Response
```json
{
  "errors": [
    {
      "message": "Authentication required",
      "extensions": {
        "code": "UNAUTHENTICATED",
        "statusCode": 401,
        "timestamp": "2024-01-15T10:30:00Z",
        "traceId": "abc123def456"
      }
    }
  ]
}
```

### Error Categories
- `AUTHENTICATION` - Login/auth failures
- `AUTHORIZATION` - Permission denied
- `VALIDATION` - Input validation errors
- `NOT_FOUND` - Resource not found
- `RATE_LIMITED` - Too many requests
- `SECURITY` - Security policy violations
- `EXTERNAL_SERVICE` - AWS/third-party errors

## 📈 Monitoring & Analytics

### Key Metrics
- Query response times
- Error rates by operation
- Cache hit/miss ratios
- Active WebSocket connections
- User activity patterns
- Security incident counts

### Dashboards
- Real-time system health
- User engagement metrics
- Security monitoring
- Performance analytics
- Compliance reporting

## 🔧 Configuration

### Federation Gateway Settings
```javascript
const gateway = new TylerSetupGateway({
  port: 4000,
  introspectionEnabled: false, // Production
  subscriptionsEnabled: true,
  rateLimitEnabled: true,
  corsEnabled: true,
});
```

### Cache Configuration
```javascript
const cacheManager = new TylerSetupCacheManager({
  enableRedis: true,
  enableInMemory: true,
  defaultTTL: 300, // 5 minutes
  maxInMemorySize: 100, // MB
});
```

## 🚀 Deployment

### Production Checklist
- [ ] Environment variables configured
- [ ] Redis cluster setup for caching
- [ ] DynamoDB tables provisioned
- [ ] AWS IAM roles configured
- [ ] Load balancer configured
- [ ] SSL certificates installed
- [ ] Monitoring/alerting setup
- [ ] Backup procedures tested

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 4000
CMD ["npm", "start"]
```

### Kubernetes Configuration
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tyler-setup-gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: tyler-setup-gateway
  template:
    metadata:
      labels:
        app: tyler-setup-gateway
    spec:
      containers:
      - name: gateway
        image: tyler-setup/gateway:latest
        ports:
        - containerPort: 4000
        env:
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: url
```

## 📚 Additional Resources

### Related Documentation
- [Apollo Federation Guide](https://www.apollographql.com/docs/federation/)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)
- [AWS Secrets Manager](https://docs.aws.amazon.com/secretsmanager/)
- [DynamoDB Documentation](https://docs.aws.amazon.com/dynamodb/)

### Support
- Create issues in the project repository
- Consult the team Slack channel
- Review audit logs for security issues
- Check system health dashboard

---

Built with ❤️ by the Candlefish.ai team for secure employee onboarding.

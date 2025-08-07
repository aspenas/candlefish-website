# System Analyzer GraphQL API

A comprehensive GraphQL API for system monitoring and analysis with the core principle: **"run all open so we can analyze status"**. This API provides real-time insights into service health, performance metrics, containerized applications, and system-wide analysis.

## 🎯 Core Features

### 🔍 **Service Discovery**
- **Automated Detection**: Discovers Docker containers, running processes, and HTTP services
- **Manual Registration**: Register custom services with health endpoints
- **Dependency Mapping**: Track service dependencies and their health impact
- **Multi-Environment**: Support for dev, staging, production environments

### 📊 **Real-Time Monitoring**
- **Health Checks**: Configurable health monitoring with retries and timeouts
- **Performance Metrics**: CPU, memory, disk, network utilization tracking
- **Container Monitoring**: Docker container resource usage and status
- **Process Tracking**: System process monitoring with resource consumption

### 🚨 **Intelligent Alerting**
- **Rule-Based Alerts**: Create custom alert rules with thresholds and conditions
- **Multi-Channel Notifications**: Slack, email, webhook, PagerDuty integration
- **Alert Lifecycle**: Trigger → Acknowledge → Resolve workflow
- **Severity Levels**: Low, Medium, High, Critical classification

### 📈 **System Analysis**
- **Health Scoring**: Overall system health with 0-100 scoring
- **Performance Insights**: Automated detection of performance issues
- **Trend Analysis**: Historical trend analysis with MTTR calculations
- **Recommendations**: AI-powered recommendations for system improvements

### ⚡ **Real-Time Updates**
- **GraphQL Subscriptions**: Real-time status updates via WebSocket
- **Live Metrics**: Streaming performance metrics
- **Alert Notifications**: Instant alert notifications
- **Status Changes**: Real-time service status change notifications

## 🏗️ Architecture

### Schema Design
```
Services → Containers/Processes → Metrics → Alerts
         ↓
    Dependencies → Health Impact Analysis
         ↓
    System Analysis → Insights & Recommendations
```

### Key Components

1. **Discovery Service**: Auto-discovers and registers services
2. **Monitoring Service**: Tracks health and performance metrics  
3. **Analysis Service**: Provides system-wide insights and trends
4. **Alert Service**: Manages alerting rules and notifications

### Federation Support
- Supports Apollo Federation for microservices architecture
- Can operate as standalone service or federated subgraph
- Gateway configuration for multi-service deployments

## 🚀 Quick Start

### Installation

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start development server
npm run dev

# Or start production server
npm start
```

### Environment Configuration

```bash
# Required Environment Variables
NODE_ENV=development|staging|production
GRAPHQL_PORT=4000
REDIS_URL=redis://localhost:6379

# Optional Configuration
ENABLE_FEDERATION=false
ENABLE_SUBSCRIPTIONS=true
ENABLE_PLAYGROUND=true
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# Authentication (if enabled)
JWT_SECRET=your-jwt-secret
AUTH_REQUIRED=false

# Docker Configuration
DOCKER_SOCKET_PATH=/var/run/docker.sock
```

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy built application
COPY dist ./dist
COPY schema.graphql ./

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

CMD ["npm", "start"]
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: system-analyzer-graphql
spec:
  replicas: 3
  selector:
    matchLabels:
      app: system-analyzer-graphql
  template:
    metadata:
      labels:
        app: system-analyzer-graphql
    spec:
      containers:
      - name: graphql-api
        image: your-registry/system-analyzer-graphql:latest
        ports:
        - containerPort: 4000
        env:
        - name: NODE_ENV
          value: "production"
        - name: REDIS_URL
          value: "redis://redis-service:6379"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 4000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 4000
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: system-analyzer-graphql
spec:
  selector:
    app: system-analyzer-graphql
  ports:
  - port: 4000
    targetPort: 4000
  type: ClusterIP
```

## 📖 Usage Examples

### Query All Services Status

```graphql
query GetAllServices {
  services(limit: 50) {
    id
    name
    status
    environment
    containers {
      name
      status
      cpuUsage
      memoryUsage
    }
    alerts(status: ACTIVE) {
      name
      severity
      triggeredAt
    }
  }
}
```

### Run Full System Analysis

```graphql
query SystemAnalysis {
  runFullAnalysis {
    overallHealth
    healthScore
    performanceInsights {
      type
      severity
      title
      recommendation
    }
    recommendations {
      type
      priority
      title
      actionItems
      automatable
    }
  }
}
```

### Register New Service

```graphql
mutation RegisterService {
  registerService(input: {
    name: "payment-service"
    environment: "production"
    baseUrl: "https://api.payments.com"
    healthEndpoint: "/health"
    tags: ["critical", "payments"]
    monitoringEnabled: true
    alertingEnabled: true
  }) {
    id
    name
    status
  }
}
```

### Create Alert Rule

```graphql
mutation CreateAlert {
  createAlertRule(input: {
    name: "High CPU Usage"
    metric: "cpu_usage_percent"
    condition: GREATER_THAN
    threshold: 80
    duration: "5m"
    severity: HIGH
    serviceIds: ["service-123"]
    notificationChannels: ["slack", "email"]
  }) {
    id
    name
    enabled
  }
}
```

### Real-Time Subscriptions

```graphql
# Subscribe to service status changes
subscription ServiceUpdates {
  serviceStatusChanged {
    service { name }
    previousStatus
    currentStatus
    timestamp
  }
}

# Subscribe to new alerts
subscription AlertUpdates {
  alertTriggered {
    name
    severity
    service { name }
    triggerValue
    thresholdValue
  }
}

# Subscribe to system analysis updates
subscription SystemUpdates {
  systemAnalysisUpdated {
    overallHealth
    healthScore
    activeAlerts
  }
}
```

## 🔧 API Configuration

### Query Complexity Limits

```typescript
const complexityLimits = {
  maximumComplexity: 1000,
  scalarCost: 1,
  objectCost: 2,
  listFactor: 10,
  expensiveOperations: {
    runFullAnalysis: 100,
    healthCheckAll: 50,
    systemAnalysis: 30
  }
};
```

### Rate Limiting

```typescript
const rateLimits = {
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  operationLimits: {
    runFullAnalysis: { max: 5, windowMs: 5 * 60 * 1000 },
    healthCheckAll: { max: 10, windowMs: 60 * 1000 }
  }
};
```

### DataLoader Optimization

The API uses DataLoader to solve N+1 query problems:

```typescript
// Efficient batch loading of related data
const dataloaders = {
  serviceById: new DataLoader(batchLoadServices),
  containersByServiceId: new DataLoader(batchLoadContainers),
  metricsByServiceId: new DataLoader(batchLoadMetrics),
  alertsByServiceId: new DataLoader(batchLoadAlerts)
};
```

## 🛡️ Security Features

### Authentication & Authorization

```typescript
// JWT token authentication
const getUser = async (req) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  return validateJWT(token);
};

// Role-based access control
const requireRole = (context, roles) => {
  if (!context.user?.roles.some(role => roles.includes(role))) {
    throw new Error('Insufficient permissions');
  }
};
```

### Security Headers & Rate Limiting

```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}));

app.use('/graphql', rateLimit({
  windowMs: 60 * 1000,
  max: 100
}));
```

## 📊 Monitoring & Observability

### Health Endpoints

- `GET /health` - Service health check
- `GET /metrics` - Prometheus metrics
- `GET /graphql` - GraphQL playground (dev only)
- `WS /graphql` - WebSocket subscriptions

### Metrics Collection

```typescript
// Prometheus metrics exposed
- graphql_requests_total
- graphql_request_duration_seconds
- graphql_errors_total
- services_discovered_total
- alerts_active_total
- system_health_score
```

### Logging

```typescript
// Structured logging with correlation IDs
logger.info('GraphQL request', {
  operation: operationName,
  variables: sanitizedVariables,
  user: context.user?.id,
  requestId: correlationId,
  duration: responseTime
});
```

## 🔄 Federation & Scaling

### Gateway Configuration

```typescript
const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({
    subgraphs: [
      { name: 'system-analyzer', url: 'http://analyzer:4000/graphql' },
      { name: 'user-service', url: 'http://users:4001/graphql' },
      { name: 'auth-service', url: 'http://auth:4002/graphql' }
    ]
  })
});
```

### Horizontal Scaling

- **Stateless Design**: All state stored in Redis/Database
- **Load Balancing**: Round-robin or least-connections
- **Session Affinity**: Not required due to stateless design
- **Redis Clustering**: For high-availability PubSub

### Performance Optimizations

```typescript
// Connection pooling
const redis = new Redis.Cluster([
  { host: 'redis-1', port: 6379 },
  { host: 'redis-2', port: 6379 },
  { host: 'redis-3', port: 6379 }
]);

// Response caching
app.use('/graphql', cache({
  ttl: 30, // 30 seconds
  skip: (req) => req.body.query.includes('mutation')
}));
```

## 🧪 Testing

### Unit Tests

```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Integration Tests

```typescript
// Example integration test
describe('System Analysis', () => {
  it('should run full analysis', async () => {
    const query = `
      query { runFullAnalysis { overallHealth healthScore } }
    `;
    
    const response = await request(app)
      .post('/graphql')
      .send({ query })
      .expect(200);
      
    expect(response.body.data.runFullAnalysis).toBeDefined();
    expect(response.body.data.runFullAnalysis.healthScore).toBeGreaterThan(0);
  });
});
```

### Load Testing

```yaml
# artillery.yml
config:
  target: 'http://localhost:4000'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "System Analysis"
    requests:
      - post:
          url: "/graphql"
          json:
            query: "query { services { id name status } }"
```

## 🚨 Error Handling

### GraphQL Error Types

```typescript
// Custom error classes
class ServiceNotFoundError extends Error {
  code = 'SERVICE_NOT_FOUND';
  statusCode = 404;
}

class AuthenticationError extends Error {
  code = 'AUTHENTICATION_REQUIRED';
  statusCode = 401;
}

class RateLimitError extends Error {
  code = 'RATE_LIMIT_EXCEEDED';
  statusCode = 429;
}
```

### Error Formatting

```typescript
formatError: (error) => {
  // Log full error for debugging
  logger.error('GraphQL Error', { error, stack: error.stack });
  
  // Return safe error to client
  return {
    message: error.message,
    code: error.extensions?.code,
    path: error.path,
    timestamp: new Date().toISOString()
  };
}
```

## 📈 Roadmap

### Near Term (Q1)
- [ ] Machine learning-based anomaly detection
- [ ] Advanced dependency graph visualization
- [ ] Custom metric collection agents
- [ ] Mobile app for alerts and monitoring

### Medium Term (Q2-Q3)
- [ ] Multi-cloud support (AWS, GCP, Azure)
- [ ] Kubernetes operator for auto-deployment
- [ ] Advanced AI recommendations
- [ ] Cost optimization analysis

### Long Term (Q4+)
- [ ] Predictive scaling recommendations
- [ ] Automated incident response
- [ ] Integration with major APM tools
- [ ] Custom dashboard builder

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write comprehensive tests
- Update documentation
- Follow GraphQL schema design principles
- Use conventional commit messages

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [Full API Documentation](./docs/)
- **Issues**: [GitHub Issues](https://github.com/candlefish-ai/paintbox/issues)
- **Discussions**: [GitHub Discussions](https://github.com/candlefish-ai/paintbox/discussions)
- **Email**: support@candlefish.ai

---

**Built with ❤️ for system reliability and observability**
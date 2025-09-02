# Security Operations GraphQL Platform

A comprehensive GraphQL architecture for security operations, built with federation, real-time subscriptions, and advanced query optimization. This platform supports MITRE ATT&CK framework integration, threat intelligence feeds, SOAR playbooks, and large-scale security event processing.

## 🏗️ Architecture Overview

### Core Components

1. **GraphQL Federation Gateway** - Unified API layer across domain-specific services
2. **Security Event Processing** - CEF format ingestion with TimescaleDB time-series storage
3. **Threat Intelligence Engine** - STIX/TAXII integration with vector similarity search
4. **Case Management System** - Full incident response workflow
5. **SOAR Playbooks** - Automated security orchestration and response
6. **MITRE ATT&CK Integration** - Technique mapping and attack path analysis
7. **Real-time Subscriptions** - WebSocket-based alerts and notifications

### Technology Stack

- **API Layer**: GraphQL with Apollo Federation
- **Databases**: 
  - TimescaleDB (time-series security events)
  - Neo4j (graph relationships and correlation)
  - Vector Database (similarity search)
  - Redis (caching and pub/sub)
- **Message Queue**: Apache Kafka for event streaming
- **Authentication**: JWT with field-level permissions
- **Monitoring**: Query complexity analysis and adaptive rate limiting

## 🚀 Quick Start

### Prerequisites

```bash
# Required services
docker-compose up -d timescaledb neo4j redis kafka vector-db

# Node.js dependencies
npm install apollo-server-express graphql @apollo/federation
npm install dataloader graphql-subscriptions redis ioredis
npm install kafkajs rate-limiter-flexible
```

### Basic Setup

```typescript
import { SecurityOperationsGateway } from './federation/security-federation';
import { SecuritySubscriptionManager } from './subscriptions/security-subscriptions';
import { SecurityQueryProtection } from './middleware/query-complexity';

// Configure federation services
const services = [
  SecurityServiceFactory.createSecurityEventsService(config),
  SecurityServiceFactory.createThreatIntelligenceService(config),
  SecurityServiceFactory.createCaseManagementService(config),
  SecurityServiceFactory.createSoarPlaybooksService(config),
  SecurityServiceFactory.createIocMitreService(config)
];

// Create federated gateway
const gateway = new SecurityOperationsGateway(services);
const server = gateway.createServer({ port: 4000 });

// Setup real-time subscriptions
const subscriptionManager = new SecuritySubscriptionManager({
  redis: { host: 'localhost', port: 6379 },
  kafka: { brokers: ['localhost:9092'], clientId: 'security-ops', groupId: 'graphql' },
  websocket: { port: 4000, path: '/graphql' }
});

// Add query protection
const protection = SecurityQueryProtection.create({
  maximumComplexity: 10000,
  maximumDepth: 15,
  rateLimit: { points: 1000, duration: 60, blockDuration: 60 }
});

server.applyMiddleware(protection.middleware);
```

## 📊 Schema Design

### Domain Separation

The schema is federated across 5 domain services:

#### 1. Security Events Service
```graphql
type SecurityEvent @key(fields: "id") {
  id: UUID!
  # CEF Header Fields
  cefVersion: Int!
  deviceVendor: String!
  name: String!
  severity: SecuritySeverity!
  
  # Event Data
  timestamp: DateTime!
  sourceIp: String
  userId: String
  processName: String
  
  # Enrichment
  riskScore: Float!
  geoLocation: GeoLocation
  correlatedEvents: [SecurityEvent!]!
}
```

#### 2. Threat Intelligence Service
```graphql
type ThreatIntelligence @key(fields: "id") {
  id: UUID!
  stixId: String!
  stixType: StixObjectType!
  name: String!
  confidence: Int!
  
  # STIX Pattern
  pattern: String
  killChainPhases: [KillChainPhase!]!
  
  # Relationships
  mitreAttackPatterns: [MitreAttackPattern!]!
  associatedEvents: [SecurityEvent!]!
}
```

#### 3. Case Management Service
```graphql
type SecurityCase @key(fields: "id") {
  id: UUID!
  title: String!
  severity: SecuritySeverity!
  status: CaseStatus!
  
  # Assignment
  assignee: SecurityAnalyst
  team: SecurityTeam!
  
  # Evidence
  securityEvents: [SecurityEvent!]!
  threatIntelligence: [ThreatIntelligence!]!
  
  # SLA Tracking
  slaStatus: SLAStatus!
  meanTimeToResponse: Int
}
```

#### 4. SOAR Playbooks Service
```graphql
type SecurityPlaybook @key(fields: "id") {
  id: UUID!
  name: String!
  category: PlaybookCategory!
  automated: Boolean!
  
  # Workflow
  steps: [PlaybookStep!]!
  triggers: [PlaybookTrigger!]!
  
  # Metrics
  executionCount: Int!
  successRate: Float!
  averageExecutionTime: Int!
}
```

#### 5. IOC & MITRE Service
```graphql
type IOC @key(fields: "id") {
  id: UUID!
  value: String!
  type: IOCType!
  confidence: Float!
  
  # Threat Context
  associatedMalware: [String!]!
  campaigns: [String!]!
  mitreAttackPatterns: [MitreAttackPattern!]!
}

type MitreAttackPattern @key(fields: "id") {
  id: String! # T1055
  name: String!
  tactic: MitreTactic!
  platforms: [MitrePlatform!]!
  
  # Detection & Mitigation
  detectionStrategies: [DetectionStrategy!]!
  mitigationStrategies: [MitigationStrategy!]!
}
```

## 🔧 Advanced Features

### 1. Query Complexity Analysis

Prevents expensive queries with adaptive complexity scoring:

```typescript
// Field complexity estimation
SecurityComplexityEstimator.estimateFieldComplexity({
  type: 'SecurityEvent',
  field: 'correlatedEvents', 
  variables: { timeRange: '7d' }
});

// Automatic rate limiting based on complexity
const protection = SecurityQueryProtection.create({
  maximumComplexity: 10000,
  adaptiveThresholds: true
});
```

### 2. Real-time Subscriptions

WebSocket-based subscriptions with filtering:

```graphql
subscription SecurityEventStream($filter: SecurityEventStreamFilter) {
  securityEventStream(filter: $filter) {
    id
    severity
    riskScore
    sourceIp
    mitreAttackPatterns { name }
  }
}
```

### 3. Vector Similarity Search

Find similar IOCs using embeddings:

```graphql
query FindSimilarIOCs($ioc: "malicious-domain.com", $threshold: 0.8) {
  findSimilarIOCs(ioc: $ioc, threshold: $threshold) {
    ioc { value type }
    similarityScore
    similarityFactors
  }
}
```

### 4. Graph-based Correlation

Neo4j-powered event correlation:

```graphql
query GetEventCorrelationGraph($eventId: "uuid", $maxDepth: 3) {
  eventCorrelationGraph(eventId: $eventId, maxDepth: $maxDepth) {
    centralEvent { id name }
    correlatedEvents {
      event { id name }
      correlationScore
      correlationType
    }
    relationships {
      source
      target
      relationshipType
      evidence
    }
  }
}
```

## 📈 Performance Optimization

### DataLoader Pattern
Eliminates N+1 queries with intelligent batching:

```typescript
export class SecurityDataLoaders {
  public readonly eventsByIds = new DataLoader<string, SecurityEvent>(
    async (ids) => await SecurityEventService.getEventsByIds(ids),
    { cache: true, maxBatchSize: 100 }
  );
}
```

### Time-Series Optimization
Leverages TimescaleDB for efficient time-based queries:

```sql
-- Optimized time-series aggregation
SELECT 
  time_bucket('1 hour', timestamp) AS bucket,
  COUNT(*) as count,
  AVG(risk_score) as avg_risk_score
FROM security_events 
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY bucket
ORDER BY bucket ASC;
```

## 🔐 Security Features

### Authentication & Authorization
```typescript
// JWT-based authentication with field-level permissions
const requireAuth = (context: SecurityContext) => {
  if (!context.user) {
    throw new AuthenticationError('Authentication required');
  }
};

const requirePermission = (context: SecurityContext, permission: string) => {
  if (!context.user.permissions.includes(permission)) {
    throw new ForbiddenError(`Permission required: ${permission}`);
  }
};
```

### Rate Limiting
```typescript
// Redis-based rate limiting with complexity scoring
const rateLimiter = new SecurityRateLimiter({
  points: 1000,        // Requests per duration
  duration: 60,        // Per minute
  blockDuration: 60,   // Block for 60 seconds
  complexityLimit: 50000 // Total complexity points per minute
});
```

## 🎯 Use Cases

### 1. Security Dashboard
```typescript
// Real-time security operations dashboard
const SECURITY_DASHBOARD_QUERY = gql`
  query SecurityDashboard($timeRange: TimeRangeInput!) {
    securityOperationsStatus {
      activeIncidents
      criticalAlerts
      averageResponseTime
      slaCompliance
    }
    
    eventsTimeSeriesAggregation(
      timeRange: $timeRange
      interval: HOUR
      groupBy: ["severity"]
    ) {
      series {
        name
        data { timestamp value }
      }
    }
    
    caseMetrics(timeRange: $timeRange) {
      totalCases
      averageResolutionTime
      slaMetrics {
        within1Hour
        within4Hours
        breaches
      }
    }
  }
`;
```

### 2. Threat Hunting
```typescript
// Advanced threat hunting with MITRE mapping
const THREAT_HUNT_QUERY = gql`
  query ThreatHunt($huntQuery: ThreatHuntQuery!, $timeRange: TimeRangeInput!) {
    threatHunt(query: $huntQuery, timeRange: $timeRange) {
      results {
        event {
          id
          name
          sourceIp
          mitreAttackPatterns { id name tactic { name } }
        }
        score
        matchedCriteria
      }
      recommendations
    }
  }
`;
```

### 3. Incident Response
```typescript
// Automated incident response workflow
const INCIDENT_RESPONSE_MUTATION = gql`
  mutation RespondToIncident($caseId: UUID!, $playbookId: UUID!) {
    executePlaybook(
      playbookId: $playbookId
      inputData: { caseId: $caseId }
      automated: true
    ) {
      id
      status
      stepExecutions {
        step { name stepType }
        status
        success
      }
    }
  }
`;
```

## 📊 Monitoring & Metrics

### Query Performance Monitoring
```typescript
const queryMonitor = new SecurityQueryMonitor({
  complexitySpike: 5.0,     // Alert on 5x normal complexity
  suspiciousPatternCount: 5, // Alert on suspicious patterns
  timeWindow: 60000         // 1-minute monitoring window
});

// Track query activity
queryMonitor.recordQueryActivity(clientId, queryAnalysis);
```

### System Health Checks
```graphql
query SystemHealth {
  securityOperationsStatus {
    systemHealth {
      overall
      components {
        name
        status
        lastCheck
      }
      metrics {
        eventsPerSecond
        averageProcessingLatency
        memoryUsage
        cpuUsage
      }
    }
  }
}
```

## 🚢 Deployment

### Docker Compose Setup
```yaml
version: '3.8'
services:
  security-graphql-gateway:
    build: .
    ports:
      - "4000:4000"
    environment:
      - TIMESCALEDB_URL=postgresql://security:password@timescaledb:5432/security_ops
      - NEO4J_URL=bolt://neo4j:7687
      - REDIS_URL=redis://redis:6379
      - KAFKA_BROKERS=kafka:9092
      - VECTOR_DB_URL=http://vector-db:8000
    depends_on:
      - timescaledb
      - neo4j
      - redis
      - kafka
      - vector-db

  timescaledb:
    image: timescale/timescaledb:latest-pg14
    environment:
      - POSTGRES_DB=security_ops
      - POSTGRES_USER=security
      - POSTGRES_PASSWORD=password

  neo4j:
    image: neo4j:5.11
    environment:
      - NEO4J_AUTH=neo4j/password
      - NEO4J_PLUGINS=["apoc"]
```

### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: security-graphql-gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: security-graphql-gateway
  template:
    metadata:
      labels:
        app: security-graphql-gateway
    spec:
      containers:
      - name: gateway
        image: security-ops/graphql-gateway:latest
        ports:
        - containerPort: 4000
        env:
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
```

## 🧪 Testing

### Unit Tests
```typescript
describe('SecurityEventResolver', () => {
  it('should return paginated security events', async () => {
    const result = await executeQuery(GET_SECURITY_EVENTS, {
      filter: { severities: ['CRITICAL', 'HIGH'] },
      pagination: { first: 10 }
    });
    
    expect(result.data.securityEvents.edges).toHaveLength(10);
    expect(result.data.securityEvents.totalCount).toBeGreaterThan(0);
  });
});
```

### Integration Tests
```typescript
describe('Event Correlation', () => {
  it('should correlate related security events', async () => {
    // Create test events
    const event1 = await createTestEvent({ sourceIp: '10.0.0.1' });
    const event2 = await createTestEvent({ sourceIp: '10.0.0.1' });
    
    // Query correlation graph
    const result = await executeQuery(GET_EVENT_CORRELATION_GRAPH, {
      eventId: event1.id,
      minCorrelationScore: 0.7
    });
    
    expect(result.data.eventCorrelationGraph.correlatedEvents).toContainEqual(
      expect.objectContaining({ event: expect.objectContaining({ id: event2.id }) })
    );
  });
});
```

### Load Testing
```javascript
// K6 load testing script
import { check } from 'k6';
import { WebSocket } from 'k6/ws';
import http from 'k6/http';

export default function () {
  // Test GraphQL query performance
  const query = `
    query LoadTest {
      securityEvents(pagination: { first: 100 }) {
        edges { node { id severity riskScore } }
      }
    }
  `;
  
  const response = http.post('http://localhost:4000/graphql', {
    query
  });
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
```

## 📚 API Documentation

### Query Examples

#### Get Recent Critical Events
```graphql
query RecentCriticalEvents {
  securityEvents(
    filter: { 
      severities: [CRITICAL]
      timeRange: { 
        start: "2024-01-01T00:00:00Z"
        end: "2024-01-02T00:00:00Z" 
      }
    }
    sort: { field: TIMESTAMP, direction: DESC }
    pagination: { first: 50 }
  ) {
    edges {
      node {
        id
        name
        severity
        riskScore
        sourceIp
        timestamp
        mitreAttackPatterns {
          id
          name
          tactic { name }
        }
      }
    }
    totalCount
  }
}
```

#### Execute Security Playbook
```graphql
mutation ExecuteIncidentResponse($caseId: UUID!) {
  executePlaybook(
    playbookId: "incident-response-playbook-v1"
    inputData: { 
      caseId: $caseId
      severity: "HIGH"
      autoIsolate: true 
    }
    automated: true
  ) {
    id
    status
    stepExecutions {
      step {
        name
        stepType
      }
      status
      startedAt
      completedAt
      success
    }
  }
}
```

#### Threat Intelligence Search
```graphql
query ThreatIntelSearch($pattern: String!) {
  threatIntelligence(
    filter: {
      search: $pattern
      confidenceRange: { min: 80 }
      stixTypes: [INDICATOR, MALWARE, ATTACK_PATTERN]
    }
  ) {
    edges {
      node {
        id
        name
        stixType
        confidence
        labels
        killChainPhases {
          killChainName
          phaseName
        }
        associatedEvents {
          id
          severity
          timestamp
        }
      }
    }
  }
}
```

## 🤝 Contributing

### Development Setup
```bash
# Clone repository
git clone <repository-url>
cd security-graphql-platform

# Install dependencies
npm install

# Setup databases
docker-compose -f docker-compose.dev.yml up -d

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

### Code Standards
- TypeScript strict mode
- ESLint + Prettier formatting
- Jest unit tests (80% coverage minimum)
- GraphQL schema-first design
- DataLoader pattern for all resolvers
- Comprehensive error handling

## 📄 License

This security operations GraphQL platform is designed for enterprise security teams and SOC environments. The architecture supports massive scale with millions of security events per day while maintaining sub-second query response times through intelligent caching, federation, and optimization strategies.
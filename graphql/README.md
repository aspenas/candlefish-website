# GraphQL Multi-Tenant Analytics Dashboard Architecture

This directory contains a comprehensive GraphQL schema and resolver architecture for a multi-tenant analytics dashboard system. The implementation follows best practices for scalability, security, and performance.

## Architecture Overview

### 🏗️ Core Components

1. **GraphQL Federation Gateway** - Central entry point that federates multiple microservices
2. **Schema-First Design** - Comprehensive type definitions with custom scalars and directives
3. **Multi-Tenant Security** - Row-level security with organization-based data isolation
4. **DataLoader Pattern** - Efficient N+1 query prevention with caching
5. **Real-time Subscriptions** - WebSocket-based live updates for collaborative features
6. **Comprehensive Error Handling** - Structured error reporting with monitoring integration

## Directory Structure

```
graphql/
├── schema/                    # GraphQL Schema Definitions
│   ├── scalars.graphql       # Custom scalar types
│   ├── directives.graphql    # Authorization and utility directives
│   └── types/                # Entity type definitions
│       ├── user.graphql      # User and authentication types
│       ├── organization.graphql  # Organization and multi-tenancy
│       ├── analytics.graphql # Data sources, metrics, and alerts
│       └── dashboard.graphql # Dashboards, widgets, and visualizations
├── queries.graphql           # Root query operations with filtering
├── mutations.graphql         # CRUD operations with validation
├── subscriptions.graphql     # Real-time update subscriptions
│
├── federation/               # Apollo Federation Setup
│   ├── gateway.ts           # Federation gateway with auth
│   └── subgraph-schemas.ts  # Individual service schemas
│
├── dataloaders/             # N+1 Query Prevention
│   └── index.ts            # DataLoader implementations
│
├── auth/                    # Authorization System
│   └── authorization.ts    # Permission-based access control
│
├── errors/                  # Error Management
│   └── error-handling.ts   # Comprehensive error types and handling
│
├── scalars/                 # Custom Scalar Implementations
│   └── custom-scalars.ts   # Validation and parsing logic
│
├── resolvers/               # Business Logic
│   └── dashboard-resolvers.ts  # Example resolver implementation
│
├── types/                   # TypeScript Definitions
│   └── context.ts          # GraphQL context interface
│
└── README.md               # This documentation
```

## Key Features

### 🔐 Multi-Tenant Security

- **Row-Level Security (RLS)**: Automatic data isolation by organization
- **Permission-Based Access Control**: Role-based permissions with custom directives
- **Field-Level Authorization**: Sensitive data protection at the field level
- **JWT Authentication**: Secure token-based authentication with refresh tokens

```graphql
type Dashboard @auth(requires: USER) @tenant {
  id: UUID!
  name: NonEmptyString!
  # Automatically filtered by organization
}
```

### 📊 Analytics-Focused Schema

- **Data Sources**: Support for 15+ database and API types
- **Metrics**: Flexible metric definitions with custom aggregations
- **Real-time Alerts**: Threshold-based alerting with multiple channels
- **Export System**: PDF, Excel, CSV export with queue management

### 🚀 Performance Optimizations

- **DataLoader Pattern**: Batched and cached data loading
- **Query Complexity Analysis**: Prevents expensive operations
- **Rate Limiting**: Per-user and per-organization limits
- **Pagination**: Cursor and offset-based pagination support

### 🔄 Real-time Features

- **Live Dashboards**: Real-time data updates via subscriptions
- **Collaborative Editing**: Multi-user dashboard editing
- **System Monitoring**: Health status and performance metrics
- **Notification System**: In-app and external notifications

## Schema Highlights

### Custom Scalars

```graphql
scalar DateTime       # ISO 8601 date-time
scalar UUID          # UUID validation
scalar EmailAddress  # Email validation
scalar JSON          # Arbitrary JSON data
scalar Decimal       # Precise decimal numbers
scalar Duration      # ISO 8601 durations
scalar Currency      # ISO 4217 currency codes
scalar HexColorCode  # Color validation
```

### Authorization Directives

```graphql
directive @auth(requires: Role = USER) on OBJECT | FIELD_DEFINITION
directive @tenant(field: String = "organizationId") on OBJECT | FIELD_DEFINITION
directive @rateLimit(max: Int!, window: Duration!) on FIELD_DEFINITION
directive @complexity(value: Int!) on FIELD_DEFINITION
```

### Query Capabilities

```graphql
type Query {
  # Comprehensive filtering and sorting
  dashboards(
    filter: DashboardFilter
    sort: [DashboardSort!]
    pagination: PaginationInput
  ): DashboardConnection!
  
  # Real-time metric execution
  executeMetric(
    id: UUID!
    parameters: JSON
    timeRange: TimeRangeInput
    filters: [FilterInput!]
  ): MetricResult!
  
  # Full-text search across entities
  search(
    query: NonEmptyString!
    types: [SearchableType!]
    filters: JSON
  ): SearchResults!
}
```

## Federation Architecture

The system uses Apollo Federation to split functionality across microservices:

### Services

1. **Auth Service** (`port 4001`)
   - User management
   - Authentication/authorization
   - Session management

2. **Organization Service** (`port 4002`)
   - Organization management
   - Member management
   - Billing and subscriptions

3. **Analytics Service** (`port 4003`)
   - Data source connections
   - Metric definitions
   - Alert management

4. **Dashboard Service** (`port 4004`)
   - Dashboard CRUD
   - Widget management
   - Sharing and permissions

5. **Notification Service** (`port 4005`)
   - Real-time notifications
   - Email/SMS delivery
   - Notification preferences

6. **Export Service** (`port 4006`)
   - Report generation
   - File processing
   - Download management

7. **Ingestion Service** (`port 4007`)
   - Data ingestion
   - Activity logging
   - Search indexing

### Gateway Features

- **Authentication Flow**: JWT token validation and user context
- **Rate Limiting**: Redis-based rate limiting per user/IP
- **Query Complexity**: Analysis and blocking of expensive queries
- **Error Handling**: Centralized error formatting and monitoring
- **Health Checks**: Service availability monitoring

## DataLoader Implementation

Prevents N+1 queries with intelligent batching and caching:

```typescript
// Example: Loading dashboard widgets
const widgetsByDashboardIdLoader = new TenantAwareDataLoader(
  async (dashboardIds: readonly string[]) => {
    const widgets = await db.query(`
      SELECT w.*, w.dashboard_id as "dashboardId"
      FROM widgets w
      JOIN dashboards d ON d.id = w.dashboard_id
      WHERE w.dashboard_id = ANY($1)
      AND d.organization_id = $2
    `, [dashboardIds, organizationId]);
    
    // Return widgets grouped by dashboard ID
    return dashboardIds.map(id => 
      widgets.filter(w => w.dashboardId === id)
    );
  },
  context,
  { cacheTTL: 180 } // 3-minute cache
);
```

## Error Handling

Comprehensive error system with monitoring integration:

### Error Categories

- **Authentication/Authorization**: Login, permissions, tokens
- **Validation**: Input validation, business rules
- **Business Logic**: Resource not found, limits exceeded
- **External Services**: Database, API, network errors
- **System**: Performance, maintenance, infrastructure

### Error Response Format

```json
{
  "errors": [
    {
      "message": "Dashboard not found",
      "extensions": {
        "code": "DASHBOARD_NOT_FOUND",
        "severity": "LOW",
        "category": "BUSINESS_LOGIC",
        "timestamp": "2024-01-15T10:30:00Z",
        "requestId": "req_123",
        "userId": "user_456",
        "organizationId": "org_789",
        "retryable": false,
        "suggestion": "Check the dashboard ID and your permissions"
      }
    }
  ]
}
```

## Usage Examples

### Creating a Dashboard

```graphql
mutation CreateDashboard {
  createDashboard(input: {
    name: "Sales Overview"
    description: "Key sales metrics and trends"
    visibility: ORGANIZATION
    category: SALES
    settings: {
      allowExport: true
      allowShare: true
      requireAuth: true
    }
  }) {
    id
    name
    widgets {
      id
      name
      type
    }
  }
}
```

### Real-time Dashboard Updates

```graphql
subscription DashboardUpdates($dashboardId: UUID!) {
  dashboardUpdated(dashboardId: $dashboardId) {
    dashboard {
      id
      name
      updatedAt
    }
    updateType
    updatedBy {
      firstName
      lastName
    }
  }
}
```

### Complex Analytics Query

```graphql
query AnalyticsOverview {
  analyticsOverview(timeRange: {
    start: "2024-01-01T00:00:00Z"
    end: "2024-01-31T23:59:59Z"
  }) {
    dashboardCount
    activeUserCount
    topDashboards {
      name
      viewCount
      lastViewed
    }
    systemHealth {
      status
      uptime
      services {
        name
        status
        responseTime
      }
    }
  }
}
```

## Development Setup

1. **Install Dependencies**
```bash
npm install
```

2. **Environment Variables**
```env
NODE_ENV=development
JWT_SECRET=your-jwt-secret
DATABASE_URL=postgresql://user:pass@localhost:5432/analytics
REDIS_URL=redis://localhost:6379
```

3. **Start Services**
```bash
# Start all federated services
npm run start:services

# Start gateway
npm run start:gateway

# Development with hot reload
npm run dev
```

4. **GraphQL Playground**
Visit `http://localhost:4000/graphql` for interactive schema exploration.

## Deployment Considerations

### Production Setup

- **Gateway**: Load balancer with multiple instances
- **Services**: Container orchestration (Kubernetes/Docker Swarm)
- **Database**: PostgreSQL with read replicas
- **Cache**: Redis cluster with persistence
- **Monitoring**: Prometheus/Grafana integration

### Security Checklist

- [ ] JWT secret rotation
- [ ] HTTPS enforcement
- [ ] CORS configuration
- [ ] Rate limiting tuned
- [ ] Query depth limits
- [ ] Introspection disabled
- [ ] Error messages sanitized

### Performance Monitoring

- **Query Performance**: Execution time tracking
- **Database Load**: Query analysis and optimization
- **Cache Hit Rate**: DataLoader and Redis metrics
- **Error Rate**: Error aggregation and alerting
- **User Activity**: Usage analytics and insights

## Contributing

1. Follow the established patterns for new resolvers
2. Add appropriate tests for new functionality
3. Update schema documentation
4. Ensure multi-tenant security compliance
5. Add error handling and validation

This GraphQL architecture provides a robust foundation for building scalable, secure, multi-tenant analytics dashboards with real-time capabilities and comprehensive data management features.

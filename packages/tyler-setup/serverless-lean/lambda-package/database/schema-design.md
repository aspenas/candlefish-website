# Tyler Setup Database Architecture Design

## Executive Summary

This document outlines the production-ready database architecture for the Tyler Setup GraphQL backend, designed to handle 500+ concurrent users with complex nested queries, real-time subscriptions, and optimal performance.

## Current State Analysis

### Existing DynamoDB Tables
1. **users** - Basic user information with email GSI
2. **contractors** - Temporary contractor access with token/expiry GSIs
3. **refresh-tokens** - JWT refresh tokens with userId GSI
4. **audit** - Audit logs with timestamp/user GSIs
5. **config** - System configuration with key-based access

### Identified Issues
1. No GraphQL-optimized access patterns
2. Missing relationship modeling for nested queries
3. No efficient pagination support
4. Lack of real-time subscription infrastructure
5. No connection pooling or caching layer
6. Missing data partitioning for scale

## Optimal Database Schema Design

### Core Principles
1. **Single Table Design** for related entities to minimize cross-table joins
2. **GraphQL-First Access Patterns** optimized for resolver efficiency
3. **Hierarchical Data Modeling** for complex nested relationships
4. **Event-Driven Architecture** for real-time subscriptions
5. **Horizontal Partitioning** for scalability

### Primary Tables

#### 1. Entity Table (Main Data Store)
```
PK: EntityType#ID (e.g., USER#123, CONTRACTOR#456)
SK: METADATA or RELATION#TargetID
GSI1PK: EntityType (for listing all entities of type)
GSI1SK: SortableField (createdAt, updatedAt, etc.)
GSI2PK: SearchableField (email, status, etc.)
GSI2SK: SecondarySort
```

#### 2. Event Store Table (for subscriptions)
```
PK: EventType#Date (e.g., USER_UPDATED#2024-01-01)
SK: Timestamp#EntityID
TTL: Auto-expire old events (30 days)
```

#### 3. Cache Table (session and query cache)
```
PK: CacheType#Key
Data: JSON payload
TTL: Based on cache type
```

### Detailed Schema Specifications

#### Entity Table Structure
```json
{
  "PK": "USER#550e8400-e29b-41d4-a716-446655440000",
  "SK": "METADATA",
  "GSI1PK": "USER",
  "GSI1SK": "2024-01-01T10:00:00Z",
  "GSI2PK": "user@example.com",
  "GSI2SK": "ACTIVE",
  "entityType": "USER",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "admin",
  "status": "ACTIVE",
  "createdAt": "2024-01-01T10:00:00Z",
  "updatedAt": "2024-01-01T10:00:00Z",
  "version": 1
}
```

#### Relationship Records
```json
{
  "PK": "USER#550e8400-e29b-41d4-a716-446655440000",
  "SK": "AUDIT#660e8400-e29b-41d4-a716-446655440001",
  "GSI1PK": "AUDIT_BY_USER",
  "GSI1SK": "2024-01-01T10:00:00Z",
  "relationshipType": "USER_AUDIT",
  "targetId": "660e8400-e29b-41d4-a716-446655440001",
  "metadata": {
    "action": "LOGIN",
    "timestamp": "2024-01-01T10:00:00Z"
  }
}
```

## Access Patterns and Indexes

### Global Secondary Indexes (GSIs)

#### GSI1: Entity Listing and Sorting
- **PK**: EntityType (USER, CONTRACTOR, etc.)
- **SK**: SortableField (createdAt, updatedAt, name)
- **Purpose**: List all entities of a type with sorting
- **Queries**: "Get all users ordered by creation date"

#### GSI2: Entity Search and Filtering
- **PK**: SearchableField (email, status, role)
- **SK**: SecondarySort (name, createdAt)
- **Purpose**: Search and filter entities
- **Queries**: "Find all active users", "Search by email"

#### GSI3: Relationship Queries
- **PK**: RelationshipType (USER_AUDITS, USER_CONTRACTORS)
- **SK**: Timestamp or TargetEntity
- **Purpose**: Navigate relationships efficiently
- **Queries**: "Get user's audit logs", "Get user's contractors"

#### GSI4: Time-based Queries
- **PK**: DatePartition (2024-01, 2024-02)
- **SK**: Timestamp#EntityID
- **Purpose**: Time-series queries and pagination
- **Queries**: "Get all events this month", "Activity feed"

### Local Secondary Indexes (LSIs)

#### LSI1: Entity Versions
- **PK**: Same as main table
- **SK**: VERSION#timestamp
- **Purpose**: Version history and audit trails

## GraphQL Optimization Patterns

### DataLoader Integration
```javascript
// User DataLoader with batching
const userLoader = new DataLoader(async (userIds) => {
  const batchGetParams = {
    RequestItems: {
      [ENTITY_TABLE]: {
        Keys: userIds.map(id => ({ PK: `USER#${id}`, SK: 'METADATA' }))
      }
    }
  };
  const result = await docClient.send(new BatchGetCommand(batchGetParams));
  return userIds.map(id => 
    result.Responses[ENTITY_TABLE].find(item => item.id === id)
  );
});
```

### Pagination Strategy
```javascript
// Cursor-based pagination for GraphQL connections
const getUsersConnection = async (first, after, filter) => {
  const params = {
    TableName: ENTITY_TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :entityType',
    ExpressionAttributeValues: {
      ':entityType': 'USER'
    },
    Limit: first,
    ScanIndexForward: true
  };
  
  if (after) {
    params.ExclusiveStartKey = decodeCursor(after);
  }
  
  if (filter) {
    params.FilterExpression = buildFilterExpression(filter);
  }
  
  const result = await docClient.send(new QueryCommand(params));
  
  return {
    edges: result.Items.map(item => ({
      node: item,
      cursor: encodeCursor(item)
    })),
    pageInfo: {
      hasNextPage: !!result.LastEvaluatedKey,
      endCursor: result.Items.length > 0 ? 
        encodeCursor(result.Items[result.Items.length - 1]) : null
    }
  };
};
```

## Performance Optimizations

### 1. Connection Pooling
- Use DynamoDB connection pooling with AWS SDK v3
- Configure appropriate timeouts and retry policies
- Implement circuit breakers for fault tolerance

### 2. Query Batching
- Implement DataLoader pattern for N+1 query prevention
- Use BatchGetItem for multiple single-item queries
- Batch writes using BatchWriteItem

### 3. Caching Strategy
- **L1 Cache**: In-memory DataLoader cache (per request)
- **L2 Cache**: DynamoDB-based cache table (cross-request)
- **L3 Cache**: DAX for ultra-low latency reads

### 4. Indexing Strategy
- Sparse indexes for optional fields
- Composite sort keys for multi-field sorting
- Projected attributes to minimize query costs

## Real-time Subscriptions

### Event Sourcing Pattern
```javascript
// Event publishing for subscriptions
const publishEvent = async (eventType, entityId, data) => {
  const event = {
    PK: `${eventType}#${new Date().toISOString().substring(0, 10)}`,
    SK: `${Date.now()}#${entityId}`,
    eventType,
    entityId,
    data,
    timestamp: new Date().toISOString(),
    ttl: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days
  };
  
  await docClient.send(new PutCommand({
    TableName: EVENT_TABLE,
    Item: event
  }));
  
  // Publish to WebSocket API for real-time delivery
  await publishToSubscribers(eventType, entityId, event);
};
```

### Subscription Filters
```javascript
// Efficient subscription filtering
const getSubscriptionEvents = async (eventType, since, entityFilters) => {
  const params = {
    TableName: EVENT_TABLE,
    KeyConditionExpression: 'PK = :pk AND SK > :since',
    ExpressionAttributeValues: {
      ':pk': `${eventType}#${new Date().toISOString().substring(0, 10)}`,
      ':since': since.toString()
    }
  };
  
  if (entityFilters.length > 0) {
    params.FilterExpression = 'entityId IN (' + 
      entityFilters.map((_, i) => `:entity${i}`).join(',') + ')';
    entityFilters.forEach((id, i) => {
      params.ExpressionAttributeValues[`:entity${i}`] = id;
    });
  }
  
  const result = await docClient.send(new QueryCommand(params));
  return result.Items;
};
```

## Data Partitioning Strategy

### Horizontal Partitioning
1. **User Data**: Partition by user ID hash
2. **Audit Logs**: Partition by date (monthly)
3. **Events**: Partition by date (daily)
4. **Cache**: Partition by cache type

### Partition Key Design
```javascript
const getPartitionKey = (entityType, id) => {
  switch (entityType) {
    case 'USER':
    case 'CONTRACTOR':
      return `${entityType}#${id}`;
    case 'AUDIT':
      return `AUDIT#${new Date().toISOString().substring(0, 7)}`; // YYYY-MM
    case 'EVENT':
      return `EVENT#${new Date().toISOString().substring(0, 10)}`; // YYYY-MM-DD
    default:
      return `${entityType}#${id}`;
  }
};
```

## Migration Strategy

### Phase 1: Schema Evolution (Zero Downtime)
1. Create new tables alongside existing ones
2. Implement dual-write pattern
3. Migrate existing data in batches
4. Verify data consistency

### Phase 2: GraphQL Integration
1. Deploy GraphQL resolvers using new schema
2. Implement DataLoaders and caching
3. Add subscription infrastructure
4. Performance testing and optimization

### Phase 3: Deprecation
1. Route GraphQL queries to new tables
2. Stop dual-writes to old tables
3. Archive old table data
4. Clean up deprecated infrastructure

## Backup and Recovery

### Continuous Backup
- Enable Point-in-Time Recovery (PITR) for all tables
- Cross-region replication for disaster recovery
- Automated backup verification

### Recovery Procedures
- RTO: 15 minutes for single region failure
- RPO: 5 minutes maximum data loss
- Cross-region failover automation

## Monitoring and Metrics

### Key Performance Indicators
- **Latency**: P99 query response time < 100ms
- **Throughput**: 1000+ RCU/WCU per table
- **Availability**: 99.99% uptime SLA
- **Error Rate**: < 0.1% failed requests

### Monitoring Stack
- CloudWatch for AWS metrics
- Custom metrics for business logic
- Real-time dashboards for operations
- Automated alerting for anomalies

This architecture provides a solid foundation for the Tyler Setup GraphQL backend, ensuring scalability, performance, and maintainability while supporting complex nested queries and real-time subscriptions.

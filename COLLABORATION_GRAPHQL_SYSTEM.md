# Real-time Collaboration GraphQL System
## Comprehensive Architecture for Candlefish AI

This document outlines the complete GraphQL schema and resolver architecture designed for the real-time collaboration system, building on the backend services architecture with CRDT state management, WebSocket connections, and multi-tenant isolation.

## 🏗️ System Architecture Overview

### Core Components
1. **GraphQL Schema** - Complete type definitions for collaboration entities
2. **Resolver Layer** - DataLoader patterns with intelligent caching
3. **Federation Strategy** - Microservice boundaries and schema stitching
4. **Authorization System** - Field-level permissions and multi-tenant security
5. **Performance Layer** - Query optimization and error handling patterns
6. **Real-time Engine** - WebSocket subscriptions for live collaboration

## 📋 File Structure

```
/graphql/
├── schema/
│   ├── types/
│   │   └── collaboration.graphql          # Complete collaboration types
│   ├── collaboration-queries.graphql      # Query definitions
│   ├── collaboration-mutations.graphql    # Mutation definitions
│   └── collaboration-subscriptions.graphql # Subscription definitions
├── resolvers/
│   └── collaboration-resolvers.ts         # Resolver implementations
├── dataloaders/
│   └── collaboration-dataloaders.ts       # DataLoader patterns
├── federation/
│   └── collaboration-federation.ts        # Service boundaries
├── auth/
│   └── collaboration-auth.ts              # Authorization directives
└── utils/
    └── collaboration-performance.ts       # Performance utilities
```

## 🎯 Core Features Implemented

### 1. Document Management
- **Complete CRDT Support**: Operational Transform integration
- **Version Control**: Branching, merging, conflict resolution
- **Multi-format Content**: Rich text, Markdown, JSON, structured data
- **Smart Permissions**: Granular access control with inheritance

### 2. Real-time Collaboration
- **Live Presence**: User cursors, selections, typing indicators
- **Synchronized Editing**: Conflict-free collaborative editing
- **Activity Streams**: Real-time activity feeds and notifications
- **Lock Management**: Optimistic and pessimistic locking strategies

### 3. Comment System
- **Threaded Discussions**: Nested comments with positioning
- **Rich Interactions**: Reactions, mentions, resolution tracking
- **Context Awareness**: Position-based and content-aware comments
- **Notification Integration**: Real-time comment notifications

### 4. Integration Layer
- **Paintbox Estimates**: Bidirectional sync with project estimates
- **Brand Portal Themes**: Dynamic theming and branding application
- **External Systems**: Extensible integration framework
- **Sync Management**: Conflict resolution and status tracking

## 🚀 Performance Optimizations

### DataLoader Implementation
```typescript
// Batch loading with intelligent caching
document: DataLoader<string, Document | null>
documentComments: DataLoader<string, Comment[]>
documentPresence: DataLoader<string, PresenceSession[]>
```

### Query Complexity Analysis
- **Complexity Scoring**: Automatic query cost calculation
- **Depth Limiting**: Prevents deeply nested query attacks
- **Field-level Limits**: Granular control over expensive operations

### Caching Strategy
- **Multi-layer Caching**: Query, field, user, and document caches
- **Smart Invalidation**: Pattern-based cache clearing
- **TTL Optimization**: Different cache lifetimes for different data types

### Real-time Optimization
- **Connection Pooling**: Efficient WebSocket management
- **Selective Updates**: Only send relevant changes to subscribers
- **Batch Operations**: Group related operations for better performance

## 🔒 Security & Authorization

### Field-level Authorization
```graphql
type Document {
  content: DocumentContent! @auth(requires: VIEW)
  sharing: DocumentSharing @auth(requires: MANAGE)
  analytics: DocumentMetrics! @auth(requires: ORG_ADMIN)
}
```

### Multi-tenant Isolation
- **Organization Scoping**: Automatic tenant filtering
- **Data Isolation**: Complete separation of tenant data
- **Permission Inheritance**: Role-based access with document overrides

### Rate Limiting
- **Operation-specific Limits**: Different limits for different operations
- **User-based Tracking**: Per-user rate limit enforcement
- **Graceful Degradation**: Informative error messages with retry timing

## 🌐 Federation Architecture

### Service Boundaries
1. **Document Service** - Core document management
2. **Real-time Service** - Presence and live collaboration
3. **Comment Service** - Comments, threads, reactions
4. **Version Service** - Version control and branching
5. **Integration Service** - External system integrations
6. **Analytics Service** - Activity tracking and metrics

### Entity Relationships
```graphql
# Document service owns the Document entity
type Document @key(fields: "id") {
  id: UUID!
  # External references resolved by other services
  activeUsers: [PresenceSession!]! @external
  comments: [Comment!]! @external
  versions: [DocumentVersion!]! @external
}
```

## 📊 Real-time Subscriptions

### Live Document Changes
```graphql
subscription DocumentContentChanged($documentId: UUID!) {
  documentContentChanged(documentId: $documentId) {
    type: DocumentChangeType!
    operations: [Operation!]!
    author: User!
    conflictsDetected: [ConflictInfo!]!
  }
}
```

### Presence Updates
```graphql
subscription DocumentPresenceChanged($documentId: UUID!) {
  documentPresenceChanged(documentId: $documentId) {
    type: PresenceChangeType!
    session: PresenceSession!
    activeUserCount: Int!
  }
}
```

### Comment Notifications
```graphql
subscription CommentAdded($documentId: UUID!) {
  commentAdded(documentId: $documentId) {
    comment: Comment!
    author: User!
    mentionedUsers: [User!]!
  }
}
```

## 🔄 CRDT Integration

### Operational Transform Support
```typescript
type CRDTState {
  type: CRDTType! # YATA, RGA, LSEQ, etc.
  state: JSON!
  vectorClock: VectorClock!
  operationLog: [CRDTOperation!]!
}
```

### Conflict Resolution
- **Automatic Resolution**: CRDT merge semantics
- **Manual Resolution**: User-guided conflict resolution
- **Strategy Selection**: Multiple resolution strategies
- **History Preservation**: Complete operation logs

## 🎨 Brand Integration

### Paintbox Integration
```typescript
type Document {
  paintboxEstimate: PaintboxEstimate @auth(requires: VIEW_ESTIMATES)
}

type PaintboxEstimate {
  estimateNumber: String!
  projectName: String!
  status: EstimateStatus!
  syncStatus: SyncStatus!
}
```

### Brand Portal Integration
```typescript
type Document {
  brandPortalTheme: BrandPortalTheme @auth(requires: VIEW_BRANDING)
}

type BrandPortalTheme {
  colors: BrandColors!
  fonts: BrandFonts!
  appliedAt: DateTime
}
```

## 📈 Analytics & Monitoring

### Performance Metrics
- **Query Performance**: Execution time and complexity tracking
- **Cache Hit Rates**: Multi-layer cache effectiveness
- **Error Rates**: Categorized error tracking with retry patterns
- **User Engagement**: Collaboration activity metrics

### Business Metrics
```typescript
type DocumentMetrics {
  totalViews: Int!
  uniqueViewers: Int!
  collaborationTime: Duration!
  averageSessionDuration: Duration!
  commentResolutionRate: Decimal!
}
```

## 🚨 Error Handling

### Structured Error Categories
```typescript
enum ErrorCategory {
  AUTHENTICATION
  AUTHORIZATION
  VALIDATION
  NOT_FOUND
  CONFLICT
  RATE_LIMITED
  SYSTEM_ERROR
  INTEGRATION_ERROR
  PERFORMANCE_ERROR
}
```

### Retry Strategies
- **Circuit Breaker Pattern**: Prevents cascading failures
- **Exponential Backoff**: Smart retry timing
- **Error Classification**: Automatic retry for retryable errors
- **Graceful Degradation**: Partial functionality during errors

## 🔧 Configuration & Deployment

### Service Configuration
```typescript
const serviceConfigurations = [
  { name: 'document', port: 4001, schema: documentServiceSchema },
  { name: 'realtime', port: 4002, schema: realtimeServiceSchema },
  { name: 'comment', port: 4003, schema: commentServiceSchema },
  { name: 'version', port: 4004, schema: versionServiceSchema },
  { name: 'integration', port: 4005, schema: integrationServiceSchema },
  { name: 'analytics', port: 4006, schema: analyticsServiceSchema }
];
```

### Gateway Setup
- **Schema Stitching**: Automatic schema composition
- **Health Monitoring**: Service health checks and failover
- **Load Balancing**: Intelligent request routing
- **Schema Registry**: Centralized schema management

## 🧪 Testing Strategy

### Unit Testing
- **Resolver Testing**: Complete resolver test coverage
- **DataLoader Testing**: Batch loading verification
- **Authorization Testing**: Permission boundary validation
- **Performance Testing**: Query complexity validation

### Integration Testing
- **Federation Testing**: Cross-service query validation
- **Real-time Testing**: WebSocket subscription testing
- **Conflict Resolution**: CRDT merge testing
- **Cache Testing**: Multi-layer cache validation

## 📱 Client Integration

### React Integration
```typescript
// Real-time document collaboration
const { data, loading, error } = useSubscription(DOCUMENT_CONTENT_CHANGED, {
  variables: { documentId }
});

// Optimistic UI updates
const [updateContent] = useMutation(UPDATE_DOCUMENT_CONTENT, {
  optimisticResponse: ({ operations }) => ({
    updateDocumentContent: {
      success: true,
      appliedOperations: operations,
      conflicts: []
    }
  })
});
```

### Mobile Support
- **Offline Synchronization**: Local storage with sync on reconnection
- **Reduced Payloads**: Mobile-optimized query fragments
- **Background Sync**: Automatic sync when app returns to foreground
- **Conflict Resolution**: Mobile-friendly conflict resolution UI

## 🎯 Key Benefits

### For Developers
1. **Type Safety**: Complete TypeScript integration
2. **Performance**: Optimized queries with automatic caching
3. **Real-time**: Built-in WebSocket subscriptions
4. **Scalability**: Federation-ready architecture
5. **Testing**: Comprehensive testing patterns

### For Users
1. **Seamless Collaboration**: Real-time editing without conflicts
2. **Rich Interactions**: Comments, reactions, and notifications
3. **Version Control**: Complete edit history and branching
4. **Integration**: Native Paintbox and Brand Portal support
5. **Performance**: Fast, responsive editing experience

### For Operations
1. **Monitoring**: Complete performance and error tracking
2. **Scalability**: Horizontal scaling through federation
3. **Security**: Field-level authorization and audit logging
4. **Reliability**: Circuit breakers and retry patterns
5. **Maintainability**: Clean separation of concerns

## 🚀 Next Steps

### Phase 1 - Core Implementation
- [ ] Deploy document and real-time services
- [ ] Implement basic CRDT operations
- [ ] Setup WebSocket infrastructure
- [ ] Basic commenting system

### Phase 2 - Advanced Features
- [ ] Version control and branching
- [ ] Advanced conflict resolution
- [ ] Paintbox integration
- [ ] Brand Portal integration

### Phase 3 - Scale & Polish
- [ ] Performance optimization
- [ ] Advanced analytics
- [ ] Mobile optimizations
- [ ] Enterprise features

This GraphQL collaboration system provides a solid foundation for real-time collaborative document editing with the flexibility to scale and integrate with existing Candlefish AI systems. The architecture emphasizes performance, security, and developer experience while maintaining the real-time collaborative features users expect.

## 📚 Related Files

- **Schema Types**: `/Users/patricksmith/candlefish-ai/graphql/schema/types/collaboration.graphql`
- **Queries**: `/Users/patricksmith/candlefish-ai/graphql/schema/collaboration-queries.graphql`
- **Mutations**: `/Users/patricksmith/candlefish-ai/graphql/schema/collaboration-mutations.graphql`
- **Subscriptions**: `/Users/patricksmith/candlefish-ai/graphql/schema/collaboration-subscriptions.graphql`
- **Resolvers**: `/Users/patricksmith/candlefish-ai/graphql/resolvers/collaboration-resolvers.ts`
- **DataLoaders**: `/Users/patricksmith/candlefish-ai/graphql/dataloaders/collaboration-dataloaders.ts`
- **Federation**: `/Users/patricksmith/candlefish-ai/graphql/federation/collaboration-federation.ts`
- **Authorization**: `/Users/patricksmith/candlefish-ai/graphql/auth/collaboration-auth.ts`
- **Performance**: `/Users/patricksmith/candlefish-ai/graphql/utils/collaboration-performance.ts`

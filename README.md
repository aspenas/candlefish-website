# Candlefish AI Documentation Platform - GraphQL Architecture

> **Philosophy**: "Operational craft" - systems that outlive creators through clear design and maintainable code.

This GraphQL implementation serves as the unified API layer for Candlefish AI's documentation ecosystem, embodying the philosophy of building systems that endure through operational excellence.

## Architecture Overview

### Core Services
- **Documentation Platform**: Public-facing documentation with version control
- **Partner Platform**: Partner network management and operator directory  
- **API Reference**: Interactive API documentation with examples
- **Search Service**: Elasticsearch-powered content discovery
- **Analytics Service**: Usage tracking and insights

### GraphQL Schema Design

The schema follows a **schema-first approach** with clear type definitions that reflect the domain model:

```graphql
# Core interfaces ensure consistency
interface Node {
  id: ID!
  createdAt: DateTime!
  updatedAt: DateTime!
}

interface Content {
  id: ID!
  title: String!
  slug: String!
  content: String!
  status: ContentStatus!
  version: String!
  # ...
}
```

### Key Features

#### 🔍 **DataLoader Pattern Implementation**
Solves N+1 query problems with efficient batch loading:

```typescript
// User loader with caching
userById: new DataLoader(async (ids: readonly string[]) => {
  const users = await db.users.findByIds([...ids]);
  return ids.map(id => users.find(user => user.id === id) || null);
})
```

#### 🚀 **Federation-Ready Architecture**  
Supports both monolithic and federated deployments:

```typescript
// Federated entities with @key directives
type Documentation @key(fields: "id") @key(fields: "slug") {
  id: ID!
  slug: String!
  author: User @provides(fields: "id email")
}
```

#### 🔐 **Field-Level Authorization**
Granular permission control with decorators:

```typescript
@authorized(['ADMIN', 'EDITOR'], ['edit:documentation'])
async updateDocumentation(parent, args, context) {
  // Resolver implementation
}
```

#### ⚡ **Real-Time Subscriptions**
WebSocket-based updates for live collaboration:

```graphql
subscription DocumentationUpdated($categoryId: ID) {
  documentationUpdated(categoryId: $categoryId) {
    id
    title
    updatedAt
  }
}
```

## File Structure

```
graphql/
├── schema.graphql          # Complete GraphQL schema
├── server.ts              # Apollo Server configuration  
├── context.ts             # Request context & DataLoaders
├── federation.ts          # Federation strategy & migration
├── queries.ts             # Client-side query examples
└── resolvers/
    ├── index.ts           # Root resolver composition
    ├── documentation.ts   # Documentation resolvers
    ├── partner.ts         # Partner network resolvers
    ├── operator.ts        # Operator management resolvers
    ├── apiReference.ts    # API documentation resolvers
    ├── user.ts           # User management resolvers
    ├── search.ts         # Search & discovery resolvers
    ├── analytics.ts      # Analytics & metrics resolvers
    ├── content.ts        # Content blocks & assets
    └── asset.ts          # File upload & management
```

## Schema Highlights

### Documentation Management
```graphql
type Documentation implements Node & Content {
  # Core content fields
  title: String!
  slug: String!
  content: String!
  
  # Metadata
  category: DocumentationCategory!
  readingTime: Int
  difficulty: DifficultyLevel
  
  # Structure
  blocks: [ContentBlock!]!
  tableOfContents: [TOCItem!]!
  
  # Engagement
  reactions: [Reaction!]!
  feedback: [Feedback!]!
  views: Int!
}
```

### Partner Network
```graphql
type Partner implements Node {
  # Business details
  name: String!
  tier: PartnerTier!
  industry: [Industry!]!
  
  # Network
  operators: [Operator!]!
  implementations: [Implementation!]!
  
  # Content
  resources: [PartnerResource!]!
  caseStudies: [CaseStudy!]!
}
```

### API Documentation
```graphql
type APIReference implements Node & Content {
  # Endpoint details
  endpoint: String!
  method: HTTPMethod!
  parameters: [APIParameter!]!
  
  # Examples
  examples: [APIExample!]!
  responses: [APIResponse!]!
  
  # Access control
  requiresAuth: Boolean!
  scopes: [String!]!
  rateLimit: RateLimit
}
```

## Deployment Strategies

### Monolithic Deployment
Single server handling all GraphQL operations:
```bash
npm start
# Server ready at http://localhost:4000/graphql
```

### Federated Deployment
Multiple services with Apollo Gateway:
```bash
# Start individual services
npm run start:documentation-service  # Port 4001
npm run start:partner-service        # Port 4002  
npm run start:api-reference-service  # Port 4003
npm run start:gateway               # Port 4000
```

## Query Examples

### Fetch Documentation with Related Content
```graphql
query GetDocumentation($slug: String!) {
  documentation(slug: $slug) {
    title
    content
    author {
      fullName
    }
    relatedDocuments {
      title
      slug
    }
    reactions {
      type
    }
  }
}
```

### Search Across All Content Types
```graphql
query SearchContent($query: String!) {
  search(query: $query) {
    total
    results {
      type
      title
      excerpt
      url
      score
      highlights
    }
    suggestions
  }
}
```

### Partner Directory with Operators
```graphql
query GetPartners($tier: PartnerTier) {
  allPartners(tier: $tier, first: 20) {
    edges {
      node {
        name
        specializations
        operators {
          fullName
          availability
          skills {
            name
            level
          }
        }
      }
    }
  }
}
```

## Performance Features

### Caching Strategy
- **DataLoader**: Request-scoped caching for entity resolution
- **Redis**: Persistent caching for expensive queries
- **CDN**: Static asset delivery optimization

### Query Complexity Analysis
```typescript
const COMPLEXITY_RULES = {
  Documentation: 2,
  'Documentation.relatedDocuments': 5,
  'Partner.operators': 4,
  maxComplexity: 100,
};
```

### Rate Limiting
- Per-user query limits
- Complexity-based throttling
- Partner tier-based API access

## Subscription Patterns

### Real-Time Documentation Updates
```typescript
// Subscribe to category changes
const subscription = client.subscribe({
  query: DOCUMENTATION_UPDATED_SUBSCRIPTION,
  variables: { categoryId: 'getting-started' }
});
```

### Partner Activity Monitoring
```typescript
// Monitor partner status changes
const partnerUpdates = client.subscribe({
  query: PARTNER_STATUS_CHANGED_SUBSCRIPTION,
  variables: { partnerId: 'acme-corp' }
});
```

## Authentication & Authorization

### JWT-Based Authentication
```typescript
// Context includes authenticated user
type Context = {
  user?: User;
  loaders: DataLoaders;
  // ... services
};
```

### Role-Based Access Control
```typescript
enum UserRole {
  ADMIN     // Full system access
  EDITOR    // Content management
  PARTNER   // Partner portal access  
  OPERATOR  // Operator network access
  VIEWER    // Read-only access
}
```

### Field-Level Permissions
```typescript
// Partner-specific data visibility
apiAccess: async (parent, _, { user }) => {
  if (user?.role !== 'PARTNER' && user?.role !== 'ADMIN') {
    return null;
  }
  return await db.apiAccess.findByPartnerId(parent.id);
}
```

## Error Handling

### Standardized Error Types
```typescript
class AuthorizationError extends Error {
  constructor(message = 'Not authorized') {
    super(message);
    this.name = 'AuthorizationError';
  }
}
```

### Production Error Filtering
```typescript
formatError: (error) => {
  if (process.env.NODE_ENV === 'production') {
    // Hide sensitive internal errors
    if (error.message.includes('Database error')) {
      return new Error('An error occurred while processing your request');
    }
  }
  return error;
}
```

## Monitoring & Analytics

### Health Checks
```bash
curl http://localhost:4000/health
# Returns service status and database connectivity
```

### Performance Metrics
```bash
curl http://localhost:4000/metrics  
# Returns query performance and usage analytics
```

### Query Logging
- Operation complexity tracking
- Slow query identification  
- Error rate monitoring

## Development Workflow

### Schema-First Development
1. Update `schema.graphql` with new types
2. Generate TypeScript types
3. Implement resolvers with DataLoader optimization
4. Add client queries with proper fragments
5. Test with complexity analysis

### Federation Migration
```typescript
// Validate federation readiness
await FederationMigration.validateFederationReadiness(schema, resolvers);

// Migrate to federated architecture  
const federatedSchema = await FederationMigration.migrateToFederation(schema, resolvers);
```

## Key Files

- **`/Users/patricksmith/candlefish-ai/graphql/schema.graphql`** - Complete GraphQL schema
- **`/Users/patricksmith/candlefish-ai/graphql/server.ts`** - Apollo Server with subscriptions
- **`/Users/patricksmith/candlefish-ai/graphql/context.ts`** - DataLoader implementation
- **`/Users/patricksmith/candlefish-ai/graphql/federation.ts`** - Federation strategy
- **`/Users/patricksmith/candlefish-ai/graphql/queries.ts`** - Client query examples
- **`/Users/patricksmith/candlefish-ai/graphql/resolvers/documentation.ts`** - Documentation resolvers
- **`/Users/patricksmith/candlefish-ai/graphql/resolvers/partner.ts`** - Partner network resolvers

This GraphQL architecture embodies Candlefish's "operational craft" philosophy - building systems that are clear, maintainable, and designed to outlive their creators through thoughtful engineering and comprehensive documentation.
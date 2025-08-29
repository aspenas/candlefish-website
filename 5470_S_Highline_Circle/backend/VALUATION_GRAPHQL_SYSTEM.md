# Item Valuation and Pricing GraphQL System

A comprehensive GraphQL-based valuation and pricing system with real-time updates, federation support, and advanced analytics for inventory management.

## 🏗️ Architecture Overview

### Core Components

1. **GraphQL Schema** (`schema/valuation-pricing.graphql`)
   - Complete type definitions for valuation entities
   - Comprehensive query, mutation, and subscription interfaces
   - Federation extensions for inventory integration

2. **Resolvers** (`resolvers/valuation-resolvers.ts`)
   - DataLoader-optimized resolvers for N+1 query prevention
   - Complex aggregation and analytics queries
   - Real-time subscription support

3. **Federation** (`federation/valuation-federation.ts`)
   - Apollo Federation 2.0 integration
   - Extended Item and Room types with valuation data
   - Advanced portfolio analytics

4. **Subscriptions** (`subscriptions/valuation-subscriptions.ts`)
   - Real-time price updates and alerts
   - Batch operation progress tracking
   - Redis-backed pub/sub for scalability

5. **Query Complexity & Rate Limiting** (`middleware/valuation-query-complexity.ts`)
   - Sophisticated complexity scoring
   - Context-aware rate limiting
   - Performance monitoring and metrics

## 🚀 Key Features

### Valuation Methods
- **Purchase Price**: Based on original purchase cost
- **Market Lookup**: Real-time market data integration
- **Depreciation Model**: Category/brand-specific depreciation curves
- **Comparable Sales**: Similar item analysis
- **Professional Appraisal**: Expert valuations
- **Manual Override**: Custom valuations

### Real-time Capabilities
- Live valuation updates
- Price movement alerts
- Market comparison notifications
- Portfolio performance streaming
- Batch operation progress tracking

### Analytics & Insights
- Portfolio performance metrics
- Market trend analysis
- Investment opportunity identification
- Risk assessment and monitoring
- Liquidation strategy planning

### Federation & Integration
- Seamless inventory system integration
- Extended Item and Room types
- Cross-service data resolution
- Distributed schema composition

## 📊 Database Schema

The system extends the existing inventory database with these tables:

- **item_valuations**: Current and historical valuations
- **market_comparisons**: Comparable items from various sources
- **price_history**: Price change tracking over time
- **depreciation_models**: Category/brand depreciation patterns
- **market_trends**: Market performance analytics
- **valuation_requests**: Batch operation tracking

## 🔧 Usage Examples

### Basic Queries

```graphql
# Get current valuation for an item
query GetItemValuation($itemId: UUID!) {
  currentValuation(itemId: $itemId) {
    estimatedValue
    confidenceScore
    valuationMethod
    valueChangePercent
    
    item {
      name
      category
      purchasePrice
    }
  }
}

# Portfolio insights dashboard
query GetPortfolioInsights {
  pricingInsights {
    totalItems
    totalPurchaseValue
    totalCurrentValue
    overallAppreciation
    
    roomSummaries {
      roomName
      totalEstimatedValue
      appreciationPercent
    }
    
    topPerformers {
      itemName
      valueChangePercent
    }
  }
}
```

### Real-time Subscriptions

```graphql
# Subscribe to valuation updates
subscription ValuationUpdates($itemIds: [UUID!]) {
  valuationUpdated(itemIds: $itemIds) {
    itemId
    newValue
    oldValue
    changeReason
    
    item {
      name
    }
  }
}

# Price movement alerts
subscription PriceAlerts($minChangePercent: Float) {
  priceAlert(minChangePercent: $minChangePercent) {
    itemId
    alertType
    changePercent
    message
  }
}
```

### Advanced Analytics

```graphql
# Portfolio analytics with risk assessment
query GetPortfolioAnalytics {
  portfolioAnalytics {
    returnOnInvestment
    volatility
    sharpeRatio
    valueAtRisk
    
    categoryDistribution {
      category
      percentage
      performance
    }
  }
  
  portfolioRiskAssessment {
    overallRisk
    riskScore
    
    riskFactors {
      factor
      impact
      probability
      mitigation
    }
  }
}
```

### Batch Operations

```graphql
# Request valuations for multiple items
mutation RequestBatchValuations($input: ValuationRequestInput!) {
  requestValuations(input: $input) {
    requestId
    totalItems
    estimatedCompletion
    status
    
    errors {
      itemId
      error
      retryable
    }
  }
}
```

## 🛡️ Security & Performance

### Query Complexity Analysis
- Field-level complexity scoring
- Dynamic limits based on user role
- Context-aware calculations
- Real-time monitoring

### Rate Limiting
- Operation-type specific limits
- Premium user tiers
- Redis-backed distributed limiting
- Graceful error handling

### DataLoader Optimization
- Batch database queries
- Caching layer integration
- N+1 query prevention
- Memory-efficient processing

## 🔄 Federation Integration

### Extended Item Type
```graphql
extend type Item @key(fields: "id") {
  # Valuation fields
  currentValuation: CurrentValuation
  estimatedValue: Decimal
  valueAppreciation: Decimal
  marketPerformance: String
  investmentGrade: String
  liquidityScore: Float
  
  # Performance metrics
  annualizedReturn: Float
  riskAdjustedReturn: Float
}
```

### Extended Room Type
```graphql
extend type Room @key(fields: "id") {
  # Room valuation summary
  valuationSummary: RoomValuationSummary
  totalEstimatedValue: Decimal
  roomROI: Float
  roomRiskScore: Float
}
```

## 📈 Monitoring & Metrics

### Query Performance Tracking
- Execution time monitoring
- Complexity score analysis
- Success/failure rates
- Resource usage metrics

### Business Metrics
- Valuation accuracy tracking
- Market data freshness
- User engagement analytics
- System health monitoring

## 🚀 Deployment Configuration

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/inventory
VALUATION_DB_POOL_SIZE=20

# Redis (for subscriptions and rate limiting)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# External APIs
MARKET_DATA_API_KEY=your_market_api_key
PRICING_SERVICE_URL=https://api.pricing-service.com

# Performance
MAX_QUERY_COMPLEXITY=1000
RATE_LIMIT_WINDOW=60
RATE_LIMIT_MAX_REQUESTS=100

# Federation
FEDERATION_SERVICE_NAME=valuation-service
APOLLO_GATEWAY_URL=http://gateway:4000/graphql
```

### Docker Configuration
```dockerfile
# Valuation service container
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 4001
CMD ["npm", "start"]
```

## 🔧 Development Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 13+
- Redis 6+
- Apollo Federation Gateway

### Installation
```bash
# Install dependencies
npm install

# Set up database migrations
npm run migrate

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### GraphQL Development Tools
- Apollo Studio integration
- Schema registry sync
- Performance monitoring
- Error tracking

## 📝 API Documentation

### Query Complexity Scores
| Operation Type | Base Score | Multipliers |
|---------------|------------|-------------|
| Simple Field | 1 | - |
| Filtered Query | 10 | Page size, filters |
| Aggregation | 15 | Time range, grouping |
| Market Research | 25 | Sources, results |
| Batch Operation | 50 | Item count |

### Rate Limits by User Type
| User Type | Queries/min | Mutations/min | Batch Ops/5min |
|-----------|-------------|---------------|----------------|
| Guest | 100 | 20 | 5 |
| User | 500 | 100 | 10 |
| Premium | 1000 | 200 | 25 |
| Admin | 2000 | 500 | 50 |

## 🤝 Contributing

### Code Quality Standards
- TypeScript strict mode
- ESLint + Prettier configuration
- 80%+ test coverage requirement
- GraphQL schema-first development

### Testing Strategy
- Unit tests for resolvers
- Integration tests for database operations
- Subscription testing with mock clients
- Performance benchmarking

### Error Handling Conventions
```typescript
// Standard error codes
enum ErrorCodes {
  VALUATION_NOT_FOUND = 'VALUATION_NOT_FOUND',
  INSUFFICIENT_MARKET_DATA = 'INSUFFICIENT_MARKET_DATA',
  QUERY_COMPLEXITY_TOO_HIGH = 'QUERY_COMPLEXITY_TOO_HIGH',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  BATCH_OPERATION_FAILED = 'BATCH_OPERATION_FAILED'
}
```

## 📚 Additional Resources

- [GraphQL Federation Best Practices](./docs/federation-guide.md)
- [Performance Optimization Guide](./docs/performance-guide.md)
- [Market Data Integration](./docs/market-data-guide.md)
- [Real-time Architecture](./docs/realtime-guide.md)
- [Client Integration Examples](./examples/valuation-client-queries.ts)

## 🏷️ Version Information

- **Schema Version**: 1.0.0
- **API Version**: v1
- **Federation Version**: 2.0
- **Minimum Apollo Server**: 4.0+
- **Database Schema**: Migration 003

---

## 🎯 Future Enhancements

### Planned Features
- Machine learning price prediction models
- Advanced market sentiment analysis
- Automated valuation scheduling
- Mobile-optimized subscription handling
- Multi-currency support
- Historical trend visualization APIs

### Performance Optimizations
- Database query optimization
- Caching layer improvements
- Horizontal scaling support
- Edge computing integration

This comprehensive GraphQL valuation system provides enterprise-grade functionality with real-time capabilities, advanced analytics, and seamless integration with existing inventory management systems.
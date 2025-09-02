# Item Valuation and Pricing System

## Overview

The Item Valuation and Pricing System provides comprehensive valuation capabilities for the 5470 S Highline Circle inventory application. It integrates with existing Go backend infrastructure to deliver:

- Automated depreciation-based valuations
- Market-based valuations through external data sources
- Price history tracking and trend analysis
- Real-time market comparisons
- Bulk valuation operations
- Event-driven architecture for real-time updates

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        API Gateway / Router                             │
└─────────────────┬───────────────────────────────────────────────────────┘
                  │
         ┌────────┼────────┐
         │        │        │
    ┌────▼───┐ ┌──▼───┐ ┌──▼─────────┐
    │Inventory│ │Pricing│ │Market Data │
    │Service  │ │Service│ │Service     │
    └────┬───┘ └──┬───┘ └──┬─────────┘
         │        │        │
    ┌────▼───┐ ┌──▼───┐ ┌──▼─────────┐
    │Core DB │ │Price │ │External    │
    │(SQLite)│ │Cache │ │APIs        │
    └────────┘ └──────┘ └────────────┘
```

### Service Boundaries

1. **Inventory Service** (Existing)
   - Item management
   - Photo handling
   - Room organization

2. **Pricing Service** (New)
   - Valuation calculations
   - Price history tracking
   - Depreciation modeling

3. **Market Data Service** (New)
   - External API integration
   - Comparison scoring
   - Data normalization

4. **Cache Layer**
   - Redis for production
   - In-memory for development
   - Smart invalidation

## Database Schema

### New Tables Added

- `item_valuations` - Current and historical valuations
- `market_comparisons` - External market data
- `price_history` - Price change tracking
- `depreciation_models` - Category/brand depreciation curves
- `market_trends` - Aggregate market insights
- `valuation_requests` - Async processing queue

### Key Views

- `current_valuations` - Latest valuation per item
- `room_valuation_summary` - Aggregated room statistics
- `market_insights` - Performance by category/brand

## API Endpoints

### Item Valuation
```http
GET    /api/valuations/item/{id}                    # Get comprehensive valuation
POST   /api/valuations/item/{id}/request            # Request market research
POST   /api/valuations/item/{id}/manual             # Create manual override
PUT    /api/valuations/item/{id}/valuation/{vid}    # Update valuation
```

### Market Analysis
```http
GET    /api/valuations/item/{id}/comparisons        # Get market comparisons
POST   /api/valuations/item/{id}/comparisons/refresh # Refresh market data
GET    /api/valuations/item/{id}/history            # Get price history
GET    /api/valuations/trends                       # Get market trends
```

### Bulk Operations
```http
POST   /api/valuations/bulk/request                 # Bulk market research
POST   /api/valuations/bulk/depreciation            # Bulk depreciation calc
```

### Analytics
```http
GET    /api/valuations/insights                     # Comprehensive insights
GET    /api/valuations/room/{id}/summary            # Room valuation summary
```

### System Management
```http
GET    /api/valuations/requests                     # Get valuation requests
PUT    /api/valuations/requests/{id}/status         # Update request status
POST   /api/valuations/cache/clear                  # Clear cache
GET    /api/valuations/stats                        # System statistics
```

## Valuation Methods

### 1. Purchase Price Method
- Uses original purchase price as baseline
- Applies age-based depreciation
- Confidence: 60-80%

### 2. Market Lookup Method
- Searches multiple external sources
- Weighted average by similarity score
- Confidence: 50-95% (based on matches)

### 3. Depreciation Model Method
- Category/brand-specific curves
- Condition factor adjustments
- Confidence: 70-90%

### 4. Comparable Sales Method
- Recent sold listings only
- Higher weight for exact matches
- Confidence: 80-95%

### 5. Professional Appraisal
- External appraisal input
- Highest confidence rating
- Confidence: 95-100%

### 6. Manual Override
- Owner/admin entered values
- Used for unique/sentimental items
- Confidence: Variable

## Market Data Sources

### Primary Sources
- **eBay** - Sold listings and current auctions
- **Facebook Marketplace** - Local market data
- **Chairish** - High-end furniture and decor
- **Brand Websites** - Retail price references

### Secondary Sources
- **West Elm** - Contemporary furniture
- **Pottery Barn** - Traditional home goods
- **Restoration Hardware** - Luxury furnishings
- **Article** - Modern furniture

## Caching Strategy

### Cache Layers
1. **Application Cache** (In-memory)
   - Current valuations (1 hour)
   - Frequently accessed data

2. **Market Data Cache** (Redis)
   - eBay search results (6 hours)
   - Facebook data (4 hours)
   - Retail comparisons (12 hours)

3. **Computed Results Cache**
   - Pricing insights (30 minutes)
   - Room summaries (1 hour)
   - Market trends (24 hours)

### Cache Invalidation
- Event-driven invalidation
- Item-specific keys on valuation updates
- Aggregate keys on bulk operations

## Event-Driven Architecture

### Event Types
- `valuation.created` - New valuation added
- `valuation.updated` - Existing valuation modified
- `price.changed` - Price history update
- `market_data.updated` - New comparisons found
- `request.completed` - Async processing done

### Event Handlers
1. **Cache Invalidation Handler** - Smart cache cleanup
2. **WebSocket Notification Handler** - Real-time UI updates
3. **Audit Log Handler** - Compliance logging
4. **Market Trend Analysis Handler** - Trend detection

## Integration with Existing System

### Modified Files
- `backend/models/models.go` - Added valuation models
- `backend/handlers/handlers.go` - Register valuation routes

### New Files
- `backend/migrations/003_add_valuation_tables.sql` - Database schema
- `backend/services/valuation.go` - Core valuation logic
- `backend/services/market_data.go` - External API integration
- `backend/services/cache.go` - Caching layer
- `backend/handlers/valuation.go` - HTTP API handlers
- `backend/events/valuation_events.go` - Event system

### Environment Variables
```env
# External API Keys
EBAY_API_KEY=your_ebay_key
FACEBOOK_API_TOKEN=your_facebook_token
CHAIRISH_API_KEY=your_chairish_key

# Cache Configuration
REDIS_URL=redis://localhost:6379
CACHE_DEFAULT_TTL=3600

# Rate Limiting
MARKET_API_RATE_LIMIT=100
MARKET_API_RATE_WINDOW=3600
```

## Performance Considerations

### Scalability
- Async processing for market research
- Background workers for bulk operations
- Read replicas for analytics queries

### Rate Limiting
- External API rate limits respected
- Intelligent request batching
- Graceful degradation on API failures

### Database Optimization
- Proper indexing on query patterns
- Partitioning for historical data
- Connection pooling

## Monitoring and Alerting

### Key Metrics
- Valuation request completion time
- Market API success rates
- Cache hit ratios
- Event processing latency

### Health Checks
- Database connectivity
- External API availability
- Cache service status
- Event queue depth

## Deployment

### Development Setup
```bash
# Run migrations
./migrate.sh

# Start with mock data
go run main.go -env=development

# Enable market APIs
export ENABLE_MARKET_APIS=true
```

### Production Setup
```bash
# Set environment variables
source production.env

# Run migrations
./migrate.sh

# Start application
go run main.go -env=production
```

### Docker Configuration
```dockerfile
# Add to existing Dockerfile
COPY migrations/ /app/migrations/
COPY services/ /app/services/
COPY handlers/valuation.go /app/handlers/
COPY events/ /app/events/

ENV ENABLE_VALUATION_SYSTEM=true
```

## API Examples

### Get Item Valuation
```bash
curl -X GET "http://localhost:8080/api/valuations/item/123e4567-e89b-12d3-a456-426614174000" \
  -H "Content-Type: application/json"
```

### Request Market Research
```bash
curl -X POST "http://localhost:8080/api/valuations/item/123e4567-e89b-12d3-a456-426614174000/request" \
  -H "Content-Type: application/json" \
  -d '{"request_type": "market_lookup", "priority": 1}'
```

### Create Manual Valuation
```bash
curl -X POST "http://localhost:8080/api/valuations/item/123e4567-e89b-12d3-a456-426614174000/manual" \
  -H "Content-Type: application/json" \
  -d '{
    "estimated_value": 1250.00,
    "confidence_score": 0.9,
    "notes": "Professional appraisal from certified appraiser"
  }'
```

### Get Pricing Insights
```bash
curl -X GET "http://localhost:8080/api/valuations/insights" \
  -H "Content-Type: application/json"
```

## Future Enhancements

### Phase 2 Features
- AI-powered image analysis for condition assessment
- Automated brand/model recognition
- Integration with auction house databases
- Machine learning price prediction models

### Phase 3 Features
- Market maker functionality
- Automated listing generation
- Buyer matching algorithms
- Portfolio optimization recommendations

## Troubleshooting

### Common Issues
1. **Market API failures** - Check API keys and rate limits
2. **Cache misses** - Verify Redis connectivity
3. **Slow valuations** - Check database indexes
4. **Event processing delays** - Monitor queue depth

### Debug Endpoints
```bash
# Check system status
GET /api/valuations/stats

# Clear cache
POST /api/valuations/cache/clear
```

### Logs
- Application logs: `/var/log/inventory/app.log`
- Market API logs: `/var/log/inventory/market_api.log`
- Event system logs: `/var/log/inventory/events.log`
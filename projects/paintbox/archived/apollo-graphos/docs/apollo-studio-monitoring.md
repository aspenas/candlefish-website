# Apollo Studio Monitoring Setup Guide

This guide covers setting up comprehensive monitoring for the Apollo GraphOS federation system using Apollo Studio.

## Overview

Apollo Studio provides:
- Schema registry and composition validation
- Real-time performance monitoring  
- Error tracking and alerting
- Query analytics and insights
- Federation-specific monitoring

## Initial Setup

### 1. Apollo Studio Configuration

#### Create Graph
```bash
# Using Rover CLI
rover graph create paintbox --graph-type federated
```

#### Configure Environment Variables
```bash
export APOLLO_KEY="service:paintbox:your-api-key-here"
export APOLLO_GRAPH_REF="paintbox@main"
export APOLLO_SCHEMA_REPORTING=true
export APOLLO_USAGE_REPORTING=true
```

### 2. Router Configuration

Ensure Apollo Router is configured for telemetry:

```yaml
# router.yaml
telemetry:
  apollo:
    schema_reporting:
      enabled: true
    usage_reporting:
      enabled: true
  metrics:
    common:
      service_name: "apollo-router"
      service_version: "1.0.0"
```

### 3. Subgraph Registration

Register all subgraphs with Apollo Studio:

```bash
# Estimates subgraph
rover subgraph publish paintbox@main \
  --schema ./subgraph-estimates/schema.graphql \
  --name estimates \
  --routing-url https://api.paintbox.candlefish.ai/estimates

# Customers subgraph  
rover subgraph publish paintbox@main \
  --schema ./subgraph-customers/schema.graphql \
  --name customers \
  --routing-url https://api.paintbox.candlefish.ai/customers

# Projects subgraph
rover subgraph publish paintbox@main \
  --schema ./subgraph-projects/schema.graphql \
  --name projects \
  --routing-url https://api.paintbox.candlefish.ai/projects

# Integrations subgraph
rover subgraph publish paintbox@main \
  --schema ./subgraph-integrations/schema.graphql \
  --name integrations \
  --routing-url https://api.paintbox.candlefish.ai/integrations
```

## Monitoring Dashboard Setup

### 1. Key Metrics to Track

#### Performance Metrics:
- Request rate (requests per minute)
- Response time (p50, p95, p99 percentiles)
- Error rate (percentage of failed requests)
- Cache hit rate
- Federation composition time

#### Business Metrics:
- Estimates created per day
- Customer queries by type
- Project photo uploads
- Integration API calls

#### Infrastructure Metrics:
- Router CPU/Memory usage
- Subgraph health status
- Database connection pool
- Network latency between services

### 2. Apollo Studio Dashboard Configuration

#### Performance Overview:
```javascript
// Custom metrics in Apollo Studio
{
  "metrics": [
    "router.http.request.total",
    "router.http.request.duration", 
    "router.http.request.errors",
    "subgraph.estimates.request.total",
    "subgraph.customers.request.total"
  ],
  "timeRange": "LAST_24_HOURS",
  "resolution": "MINUTE"
}
```

#### Federation-Specific Metrics:
- Subgraph availability
- Schema composition status
- Query planning performance
- Entity resolution times

### 3. Custom Dashboard Creation

```bash
# Create custom dashboard via GraphQL API
curl -X POST 'https://api.apollographql.com/graphql' \
  -H "Authorization: Bearer $APOLLO_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation CreateDashboard($input: DashboardInput!) { createDashboard(input: $input) { id name } }",
    "variables": {
      "input": {
        "name": "Paintbox Production Monitoring",
        "graphs": ["paintbox@main"],
        "widgets": [
          {
            "type": "PERFORMANCE_OVERVIEW",
            "title": "Request Performance",
            "timeRange": "LAST_24_HOURS"
          },
          {
            "type": "ERROR_RATE",
            "title": "Error Tracking",
            "timeRange": "LAST_24_HOURS"
          }
        ]
      }
    }
  }'
```

## Alerting Configuration

### 1. Performance Alerts

#### High Error Rate Alert:
```yaml
alert:
  name: "High Error Rate"
  condition: "error_rate > 5%"
  duration: "5m"
  channels: ["slack", "email"]
  message: "Error rate exceeded 5% threshold"
```

#### Slow Response Time Alert:
```yaml
alert:
  name: "Slow Response Time" 
  condition: "p95_response_time > 2000ms"
  duration: "10m"
  channels: ["slack", "pagerduty"]
  message: "95th percentile response time exceeded 2 seconds"
```

#### Schema Composition Failure:
```yaml
alert:
  name: "Schema Composition Failed"
  condition: "composition_status != 'SUCCESS'"
  duration: "1m"
  channels: ["slack", "email"]
  message: "Federation schema composition failed"
```

### 2. Business Logic Alerts

#### Estimates Service Down:
```yaml
alert:
  name: "Estimates Service Unavailable"
  condition: "subgraph_estimates_availability < 95%"
  duration: "5m"
  channels: ["pagerduty"]
  message: "Estimates subgraph availability below 95%"
```

#### Integration Failures:
```yaml
alert:
  name: "External Integration Failures"
  condition: "integration_error_rate > 10%"
  duration: "15m"
  channels: ["slack"]
  message: "High error rate in external integrations (Salesforce/CompanyCam)"
```

### 3. Alert Channel Configuration

#### Slack Integration:
```bash
# Add Slack webhook to Apollo Studio
curl -X POST 'https://api.apollographql.com/graphql' \
  -H "Authorization: Bearer $APOLLO_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation CreateSlackChannel($input: SlackChannelInput!) { createNotificationChannel(input: $input) { id } }",
    "variables": {
      "input": {
        "name": "production-alerts",
        "webhookUrl": "YOUR_SLACK_WEBHOOK_URL",
        "channel": "#paintbox-alerts"
      }
    }
  }'
```

## Query Analytics

### 1. Operation Insights

Track query patterns and performance:
- Most frequent operations
- Slowest operations  
- Operations with highest error rates
- Client usage patterns

### 2. Field Usage Analytics

Monitor GraphQL field usage:
- Most requested fields
- Deprecated field usage
- New field adoption rates
- Schema evolution impact

### 3. Client Identification

Set up client identification for better analytics:

```javascript
// Frontend client configuration
const client = new ApolloClient({
  uri: 'https://api.paintbox.candlefish.ai/graphql',
  headers: {
    'apollographql-client-name': 'paintbox-web',
    'apollographql-client-version': '1.0.0'
  }
});
```

## Federation-Specific Monitoring

### 1. Subgraph Health Monitoring

Monitor individual subgraph health:

```bash
# Health check script
#!/bin/bash
services=("estimates" "customers" "projects" "integrations")

for service in "${services[@]}"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" \
    "https://api.paintbox.candlefish.ai/$service/.well-known/apollo/server-health")
  
  if [ "$status" != "200" ]; then
    echo "❌ $service subgraph unhealthy (HTTP $status)"
  else
    echo "✅ $service subgraph healthy"
  fi
done
```

### 2. Schema Composition Monitoring

Track schema composition success:

```bash
# Validate schema composition
rover supergraph compose --config supergraph-config.yaml > /dev/null
if [ $? -eq 0 ]; then
  echo "✅ Schema composition successful"
else
  echo "❌ Schema composition failed"
  exit 1
fi
```

### 3. Entity Resolution Performance

Monitor @key field resolution times:
- Customer entity resolution
- Project entity resolution  
- Estimate entity resolution

## Custom Metrics and Logging

### 1. Business Metric Tracking

Add custom metrics to your resolvers:

```typescript
// In subgraph resolvers
import { plugin } from '@apollo/server';

const metricsPlugin = plugin({
  requestDidStart() {
    return {
      didResolveField({ info }) {
        // Track field resolution
        console.log(`Resolved field: ${info.fieldName}`);
        
        // Custom metrics
        if (info.fieldName === 'createEstimate') {
          // Track estimate creation
          incrementCounter('estimates.created.total');
        }
      }
    };
  }
});
```

### 2. Error Tracking Integration

Integrate with error tracking services:

```typescript
// Sentry integration
import * as Sentry from '@sentry/node';

const errorPlugin = plugin({
  requestDidStart() {
    return {
      didEncounterErrors({ errors }) {
        errors.forEach(error => {
          Sentry.captureException(error);
        });
      }
    };
  }
});
```

### 3. Structured Logging

Implement structured logging for better observability:

```typescript
import { createLogger, format, transports } from 'winston';

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    new transports.File({ filename: 'error.log', level: 'error' }),
    new transports.File({ filename: 'combined.log' })
  ]
});

// Log GraphQL operations
logger.info('GraphQL operation executed', {
  operationName: 'GetEstimates',
  duration: 245,
  fieldCount: 12,
  userId: 'user-123'
});
```

## Maintenance and Best Practices

### 1. Regular Reviews

#### Weekly Reviews:
- Performance trend analysis
- Error rate patterns
- New query patterns
- Client usage changes

#### Monthly Reviews:
- Schema evolution impact
- Alert effectiveness
- Dashboard utility
- Monitoring cost optimization

### 2. Schema Management

#### Version Control:
- Tag schema versions
- Document breaking changes
- Plan deprecation timeline
- Monitor deprecated field usage

#### Testing:
- Schema compatibility checks
- Performance regression testing
- Federation composition validation

### 3. Performance Optimization

#### Query Optimization:
- Identify slow queries
- Optimize database queries
- Implement query complexity limits
- Add appropriate caching

#### Federation Optimization:
- Minimize entity calls
- Optimize subgraph schemas
- Reduce query planning time
- Improve entity resolution

## Troubleshooting

### Common Issues:

1. **Missing Metrics Data**
   - Verify APOLLO_KEY is set correctly
   - Check router telemetry configuration
   - Ensure network connectivity to Apollo Studio

2. **Schema Composition Failures**
   - Run `rover subgraph check` before publishing
   - Verify subgraph routing URLs are accessible
   - Check for breaking schema changes

3. **High Query Response Times**
   - Review query complexity
   - Check database performance
   - Analyze entity resolution patterns
   - Optimize N+1 query problems

4. **Alert Fatigue**
   - Adjust alert thresholds
   - Group related alerts
   - Implement alert escalation
   - Add alert acknowledgment

This monitoring setup provides comprehensive visibility into your Apollo GraphOS federation system, enabling proactive issue detection and performance optimization.

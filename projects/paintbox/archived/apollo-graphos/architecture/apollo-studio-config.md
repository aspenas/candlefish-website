# Apollo GraphOS Studio Configuration and Monitoring

## Overview
This document defines the complete Apollo Studio configuration for monitoring, schema registry management, and observability across all subgraphs in the Paintbox federation. The setup includes performance monitoring, error tracking, field-level analytics, and automated alerting for production reliability.

## Apollo Studio Setup

### 1. Studio Organization Structure

```yaml
# Apollo Studio Organization: Paintbox
organization: paintbox
graphs:
  paintbox-federation:
    production:
      router_url: https://api.paintbox.candlefish.ai/graphql
      introspection: false
      playground: false
    staging:
      router_url: https://staging-api.paintbox.candlefish.ai/graphql
      introspection: true
      playground: true
    development:
      router_url: https://dev-api.paintbox.candlefish.ai/graphql
      introspection: true
      playground: true

variants:
  production:
    - customers@prod
    - projects@prod  
    - estimates@prod
    - integrations@prod
  staging:
    - customers@staging
    - projects@staging
    - estimates@staging
    - integrations@staging
  development:
    - customers@dev
    - projects@dev
    - estimates@dev
    - integrations@dev
```

### 2. Subgraph Registration Configuration

```typescript
// Subgraph registration configuration for each service
interface SubgraphConfig {
  name: string;
  url: string;
  introspectionUrl: string;
  apolloKey: string;
  apolloGraphRef: string;
  serviceRevision: string;
  serviceName: string;
}

const SUBGRAPH_CONFIGS: Record<string, SubgraphConfig> = {
  customers: {
    name: 'customers',
    url: process.env.CUSTOMERS_SUBGRAPH_URL!,
    introspectionUrl: process.env.CUSTOMERS_SUBGRAPH_URL + '/sdl',
    apolloKey: process.env.APOLLO_KEY!,
    apolloGraphRef: 'paintbox-federation@production',
    serviceRevision: process.env.GIT_SHA || 'unknown',
    serviceName: 'paintbox-customers-subgraph'
  },
  
  projects: {
    name: 'projects',
    url: process.env.PROJECTS_SUBGRAPH_URL!,
    introspectionUrl: process.env.PROJECTS_SUBGRAPH_URL + '/sdl',
    apolloKey: process.env.APOLLO_KEY!,
    apolloGraphRef: 'paintbox-federation@production',
    serviceRevision: process.env.GIT_SHA || 'unknown',
    serviceName: 'paintbox-projects-subgraph'
  },
  
  estimates: {
    name: 'estimates',
    url: process.env.ESTIMATES_SUBGRAPH_URL!,
    introspectionUrl: process.env.ESTIMATES_SUBGRAPH_URL + '/sdl',
    apolloKey: process.env.APOLLO_KEY!,
    apolloGraphRef: 'paintbox-federation@production',
    serviceRevision: process.env.GIT_SHA || 'unknown',
    serviceName: 'paintbox-estimates-subgraph'
  },
  
  integrations: {
    name: 'integrations',
    url: process.env.INTEGRATIONS_SUBGRAPH_URL!,
    introspectionUrl: process.env.INTEGRATIONS_SUBGRAPH_URL + '/sdl',
    apolloKey: process.env.APOLLO_KEY!,
    apolloGraphRef: 'paintbox-federation@production',
    serviceRevision: process.env.GIT_SHA || 'unknown',
    serviceName: 'paintbox-integrations-subgraph'
  }
};
```

### 3. Router Configuration

```yaml
# router.yaml - Apollo Router configuration
supergraph:
  introspection: false
  
headers:
  all:
    request:
      - propagate:
          matching: "^apollo-.*"
      - propagate:
          matching: "^x-.*"
      - propagate:
          named: "authorization"
      - propagate:
          named: "user-agent"

cors:
  origins:
    - https://app.paintbox.candlefish.ai
    - https://admin.paintbox.candlefish.ai
    - http://localhost:3000
  allow_credentials: true

limits:
  max_depth: 15
  max_height: 200
  max_aliases: 30
  max_root_fields: 20
  
rate_limit:
  storage:
    redis:
      url: ${REDIS_URL}
      ttl: 60s
  
  rules:
    - capacity: 1000
      interval: 60s
      key: "user_id"
      when:
        - eq:
          - get:
              request:
                header: "x-user-role"
          - "admin"
          
    - capacity: 100
      interval: 60s  
      key: "user_id"
      when:
        - eq:
          - get:
              request:
                header: "x-user-role"
          - "user"

telemetry:
  apollo:
    field_level_instrumentation: 1.0
    endpoint: https://usage-reporting.api.apollographql.com/api/ingress/traces
    
  tracing:
    datadog:
      enabled: true
      endpoint: ${DATADOG_ENDPOINT}
    
  metrics:
    prometheus:
      enabled: true
      listen: 0.0.0.0:9090
      path: /metrics

authentication:
  router:
    jwt:
      jwks_urls:
        - https://paintbox.auth0.com/.well-known/jwks.json
      header_name: "authorization"
      header_value_prefix: "Bearer "
      
authorization:
  require_authentication: false
  directives:
    authenticated: |
      directive @authenticated on FIELD_DEFINITION | OBJECT | INTERFACE | SCALAR | ENUM

plugins:
  experimental.demand_control:
    enabled: true
    mode: "MEASURE"
    max_cost: 1000
    max_depth: 10
    
  experimental.persisted_queries:
    enabled: true
    cache:
      redis:
        url: ${REDIS_URL}
        ttl: 86400

logging:
  format: json
  level: info

health_check:
  enabled: true
  listen: 0.0.0.0:8088
  path: /health

homepage:
  enabled: false
```

## Schema Registry Management

### 1. Schema Publishing Pipeline

```yaml
# .github/workflows/schema-publish.yml
name: Schema Registry Publishing

on:
  push:
    branches: [main, staging, develop]
    paths:
      - 'subgraph-*/schema.graphql'
      - 'subgraph-*/src/**'

jobs:
  publish-schemas:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        subgraph: [customers, projects, estimates, integrations]
        
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          
      - name: Install Rover CLI
        run: |
          curl -sSL https://rover.apollo.dev/nix/latest | sh
          echo "$HOME/.rover/bin" >> $GITHUB_PATH
          
      - name: Determine environment
        id: env
        run: |
          if [[ "${{ github.ref }}" == "refs/heads/main" ]]; then
            echo "variant=production" >> $GITHUB_OUTPUT
          elif [[ "${{ github.ref }}" == "refs/heads/staging" ]]; then
            echo "variant=staging" >> $GITHUB_OUTPUT
          else
            echo "variant=development" >> $GITHUB_OUTPUT
          fi
          
      - name: Publish subgraph schema
        run: |
          rover subgraph publish paintbox-federation@${{ steps.env.outputs.variant }} \
            --name ${{ matrix.subgraph }} \
            --schema ./subgraph-${{ matrix.subgraph }}/schema.graphql \
            --routing-url ${{ secrets[format('{0}_SUBGRAPH_URL', upper(matrix.subgraph))] }}
        env:
          APOLLO_KEY: ${{ secrets.APOLLO_KEY }}
          
      - name: Schema composition check
        run: |
          rover supergraph compose \
            --config ./supergraph-config-${{ steps.env.outputs.variant }}.yaml \
            > composed-schema.graphql
            
      - name: Schema validation
        run: |
          rover graph check paintbox-federation@${{ steps.env.outputs.variant }} \
            --schema ./composed-schema.graphql
        env:
          APOLLO_KEY: ${{ secrets.APOLLO_KEY }}
```

### 2. Supergraph Composition Configuration

```yaml
# supergraph-config-production.yaml
federation_version: 2
subgraphs:
  customers:
    routing_url: https://customers.paintbox.candlefish.ai/graphql
    schema:
      subgraph_url: https://customers.paintbox.candlefish.ai/graphql
      introspection_headers:
        Authorization: "Bearer ${INTERNAL_SERVICE_TOKEN}"
        
  projects:
    routing_url: https://projects.paintbox.candlefish.ai/graphql  
    schema:
      subgraph_url: https://projects.paintbox.candlefish.ai/graphql
      introspection_headers:
        Authorization: "Bearer ${INTERNAL_SERVICE_TOKEN}"
        
  estimates:
    routing_url: https://estimates.paintbox.candlefish.ai/graphql
    schema:
      subgraph_url: https://estimates.paintbox.candlefish.ai/graphql
      introspection_headers:
        Authorization: "Bearer ${INTERNAL_SERVICE_TOKEN}"
        
  integrations:
    routing_url: https://integrations.paintbox.candlefish.ai/graphql
    schema:
      subgraph_url: https://integrations.paintbox.candlefish.ai/graphql
      introspection_headers:
        Authorization: "Bearer ${INTERNAL_SERVICE_TOKEN}"
```

## Monitoring and Observability

### 1. Performance Monitoring Configuration

```typescript
// Apollo Studio performance monitoring setup
interface ApolloMonitoringConfig {
  tracingConfig: TracingConfig;
  fieldInstrumentation: FieldInstrumentationConfig;
  errorTracking: ErrorTrackingConfig;
  cacheMetrics: CacheMetricsConfig;
}

interface TracingConfig {
  enabled: boolean;
  sampleRate: number; // 0.0 to 1.0
  includeOperationDocument: boolean;
  includeVariables: boolean;
  includeResultErrors: boolean;
  excludeFields: string[];
  privateFields: string[];
}

interface FieldInstrumentationConfig {
  enabled: boolean;
  sampleRate: number;
  includeArguments: boolean;
  includeResultSize: boolean;
  slowFieldThreshold: number; // milliseconds
}

interface ErrorTrackingConfig {
  enabled: boolean;
  includeStackTrace: boolean;
  includeVariables: boolean;
  excludeErrorTypes: string[];
  maxErrorsPerOperation: number;
}

interface CacheMetricsConfig {
  enabled: boolean;
  includeHitRate: boolean;
  includeMissDetails: boolean;
  includeEvictions: boolean;
}

const APOLLO_MONITORING: ApolloMonitoringConfig = {
  tracingConfig: {
    enabled: true,
    sampleRate: 0.1, // 10% sampling in production
    includeOperationDocument: true,
    includeVariables: false, // Privacy: exclude variables
    includeResultErrors: true,
    excludeFields: [
      'Customer.creditLimit',
      'Customer.paymentTerms',
      'SalesforceUser.email',
      'IntegrationConfig.config' // Sensitive configuration data
    ],
    privateFields: [
      'password',
      'token',
      'secret',
      'key',
      'creditCard'
    ]
  },
  
  fieldInstrumentation: {
    enabled: true,
    sampleRate: 1.0, // Full field-level monitoring
    includeArguments: true,
    includeResultSize: true,
    slowFieldThreshold: 100 // 100ms threshold for slow field alerts
  },
  
  errorTracking: {
    enabled: true,
    includeStackTrace: true,
    includeVariables: false,
    excludeErrorTypes: [
      'ValidationError',
      'UserInputError'
    ],
    maxErrorsPerOperation: 10
  },
  
  cacheMetrics: {
    enabled: true,
    includeHitRate: true,
    includeMissDetails: true,
    includeEvictions: true
  }
};
```

### 2. Custom Metrics and Instrumentation

```typescript
// Custom Apollo Server plugins for enhanced monitoring
import { ApolloServerPlugin, GraphQLRequestListener } from '@apollo/server';
import { StatsD } from 'node-statsd';

interface CustomMetrics {
  operationDuration: (operationName: string, duration: number) => void;
  fieldResolutionTime: (fieldName: string, duration: number) => void;
  cacheHitRate: (cacheType: string, hitRate: number) => void;
  errorRate: (errorType: string, count: number) => void;
  activeConnections: (count: number) => void;
  subscriptionCount: (type: string, count: number) => void;
}

class CustomMetricsPlugin implements ApolloServerPlugin {
  private metrics: StatsD;
  private subgraphName: string;
  
  constructor(subgraphName: string) {
    this.subgraphName = subgraphName;
    this.metrics = new StatsD({
      host: process.env.STATSD_HOST || 'localhost',
      port: 8125,
      prefix: `paintbox.${subgraphName}.`,
      tags: {
        service: subgraphName,
        environment: process.env.NODE_ENV || 'development'
      }
    });
  }
  
  requestDidStart(): GraphQLRequestListener<any> {
    const startTime = Date.now();
    let operationName: string | undefined;
    
    return {
      didResolveOperation: (requestContext) => {
        operationName = requestContext.operationName || 'anonymous';
        this.metrics.increment('operations.started', 1, {
          operation: operationName,
          type: requestContext.operation.operation
        });
      },
      
      willSendResponse: (requestContext) => {
        const duration = Date.now() - startTime;
        const hasErrors = requestContext.errors && requestContext.errors.length > 0;
        
        // Operation timing
        this.metrics.timing('operations.duration', duration, {
          operation: operationName || 'unknown',
          success: !hasErrors
        });
        
        // Error tracking
        if (hasErrors) {
          requestContext.errors!.forEach(error => {
            this.metrics.increment('operations.errors', 1, {
              operation: operationName || 'unknown',
              errorType: error.constructor.name
            });
          });
        }
        
        // Response size tracking
        const responseSize = JSON.stringify(requestContext.response.body).length;
        this.metrics.histogram('operations.responseSize', responseSize, {
          operation: operationName || 'unknown'
        });
      },
      
      didEncounterErrors: (requestContext) => {
        requestContext.errors.forEach(error => {
          this.metrics.increment('errors.total', 1, {
            operation: operationName || 'unknown',
            errorType: error.constructor.name,
            errorMessage: error.message
          });
        });
      }
    };
  }
}

// Field-level instrumentation plugin
class FieldInstrumentationPlugin implements ApolloServerPlugin {
  private metrics: StatsD;
  
  constructor(subgraphName: string) {
    this.metrics = new StatsD({
      prefix: `paintbox.${subgraphName}.fields.`,
      tags: { service: subgraphName }
    });
  }
  
  requestDidStart(): GraphQLRequestListener<any> {
    const fieldStartTimes = new Map<string, number>();
    
    return {
      willResolveField: ({ info }) => {
        const fieldKey = `${info.parentType.name}.${info.fieldName}`;
        fieldStartTimes.set(fieldKey, Date.now());
        
        return (error, result) => {
          const startTime = fieldStartTimes.get(fieldKey);
          if (startTime) {
            const duration = Date.now() - startTime;
            
            this.metrics.timing('resolutionTime', duration, {
              field: fieldKey,
              success: !error
            });
            
            if (error) {
              this.metrics.increment('errors', 1, {
                field: fieldKey,
                errorType: error.constructor.name
              });
            }
            
            // Track slow fields
            if (duration > 100) { // 100ms threshold
              this.metrics.increment('slowFields', 1, {
                field: fieldKey,
                duration: Math.floor(duration / 100) * 100 // Bucket by 100ms
              });
            }
          }
        };
      }
    };
  }
}
```

### 3. Alerting Configuration

```yaml
# Apollo Studio Alerting Configuration
alerts:
  # Performance Alerts
  - name: "High Operation Latency"
    description: "Alert when P95 operation latency exceeds 2 seconds"
    condition:
      metric: "operation_duration_p95"
      threshold: 2000
      comparison: "greater_than"
      window: "5m"
    channels:
      - slack: "#alerts-api"
      - email: "dev-team@paintbox.candlefish.ai"
    severity: "warning"
    
  - name: "Critical Operation Latency"
    description: "Alert when P95 operation latency exceeds 5 seconds"
    condition:
      metric: "operation_duration_p95"
      threshold: 5000
      comparison: "greater_than"
      window: "2m"
    channels:
      - slack: "#alerts-api"
      - email: "dev-team@paintbox.candlefish.ai"
      - pagerduty: "api-team"
    severity: "critical"
    
  # Error Rate Alerts
  - name: "High Error Rate"
    description: "Alert when error rate exceeds 5%"
    condition:
      metric: "error_rate"
      threshold: 0.05
      comparison: "greater_than"  
      window: "5m"
    channels:
      - slack: "#alerts-api"
      - email: "dev-team@paintbox.candlefish.ai"
    severity: "warning"
    
  - name: "Critical Error Rate"
    description: "Alert when error rate exceeds 10%"
    condition:
      metric: "error_rate"
      threshold: 0.10
      comparison: "greater_than"
      window: "2m"
    channels:
      - slack: "#alerts-api"
      - email: "dev-team@paintbox.candlefish.ai"
      - pagerduty: "api-team"
    severity: "critical"
    
  # Cache Performance
  - name: "Low Cache Hit Rate"
    description: "Alert when cache hit rate drops below 80%"
    condition:
      metric: "cache_hit_rate"
      threshold: 0.80
      comparison: "less_than"
      window: "10m"
    channels:
      - slack: "#alerts-api"
    severity: "warning"
    
  # Subgraph Health
  - name: "Subgraph Unavailable"
    description: "Alert when subgraph becomes unavailable"
    condition:
      metric: "subgraph_availability"
      threshold: 0.99
      comparison: "less_than"
      window: "1m"
    channels:
      - slack: "#alerts-api"
      - email: "dev-team@paintbox.candlefish.ai" 
      - pagerduty: "api-team"
    severity: "critical"
    
  # Federation Specific
  - name: "Schema Composition Failure"
    description: "Alert when schema composition fails"
    condition:
      metric: "composition_success_rate"
      threshold: 1.0
      comparison: "less_than"
      window: "1m"
    channels:
      - slack: "#alerts-api"
      - email: "dev-team@paintbox.candlefish.ai"
    severity: "critical"

# Custom Alert Channels
channels:
  slack:
    "#alerts-api":
      webhook_url: ${SLACK_WEBHOOK_URL}
      mentions:
        - "@dev-team"
        - "@on-call"
        
  email:
    "dev-team@paintbox.candlefish.ai":
      smtp_config:
        host: ${SMTP_HOST}
        port: 587
        username: ${SMTP_USERNAME}
        password: ${SMTP_PASSWORD}
        
  pagerduty:
    "api-team":
      integration_key: ${PAGERDUTY_INTEGRATION_KEY}
      severity_mapping:
        warning: "info"
        critical: "critical"
```

### 4. Dashboard Configuration

```json
{
  "dashboard_config": {
    "title": "Paintbox GraphQL Federation",
    "refresh_interval": "30s",
    "time_range": "1h",
    
    "panels": [
      {
        "title": "Request Volume",
        "type": "graph",
        "metrics": [
          "operations_per_minute",
          "operations_per_minute_by_subgraph"
        ],
        "aggregation": "sum",
        "group_by": ["subgraph", "operation"]
      },
      
      {
        "title": "Response Time Distribution", 
        "type": "heatmap",
        "metrics": [
          "operation_duration_p50",
          "operation_duration_p95", 
          "operation_duration_p99"
        ],
        "group_by": ["operation"]
      },
      
      {
        "title": "Error Rate by Operation",
        "type": "table",
        "metrics": [
          "error_rate",
          "error_count",
          "total_operations"
        ],
        "group_by": ["operation", "error_type"],
        "sort_by": "error_rate",
        "sort_order": "desc"
      },
      
      {
        "title": "Cache Performance",
        "type": "stat",
        "metrics": [
          "cache_hit_rate",
          "cache_miss_rate",
          "cache_eviction_rate"
        ],
        "display_mode": "percentage"
      },
      
      {
        "title": "Field Resolution Times",
        "type": "bar_chart",
        "metrics": ["field_resolution_time_p95"],
        "group_by": ["field_name"],
        "threshold": 100,
        "sort_by": "value",
        "limit": 20
      },
      
      {
        "title": "Subgraph Health",
        "type": "status_grid",
        "metrics": [
          "subgraph_availability",
          "subgraph_response_time",
          "subgraph_error_rate"
        ],
        "group_by": ["subgraph"],
        "health_thresholds": {
          "availability": 0.99,
          "response_time": 1000,
          "error_rate": 0.05
        }
      },
      
      {
        "title": "Federation Metrics",
        "type": "multi_stat",
        "metrics": [
          "schema_composition_success_rate",
          "router_gateway_errors",
          "query_planning_time",
          "federated_queries_per_minute"
        ]
      },
      
      {
        "title": "Top Slow Operations",
        "type": "list",
        "metrics": ["operation_duration_p95"],
        "group_by": ["operation"],
        "sort_by": "value",
        "sort_order": "desc",
        "limit": 10,
        "threshold": 1000
      },
      
      {
        "title": "WebSocket Connections",
        "type": "timeseries",
        "metrics": [
          "active_websocket_connections",
          "websocket_messages_per_minute",
          "websocket_connection_errors"
        ],
        "aggregation": "avg"
      }
    ]
  }
}
```

### 5. Schema Governance and Policies

```yaml
# Schema governance configuration
governance:
  policies:
    # Breaking Change Detection
    - name: "prevent_breaking_changes"
      description: "Block schema changes that would break existing clients"
      enabled: true
      severity: "ERROR"
      rules:
        - no_field_removal
        - no_field_type_change
        - no_enum_value_removal
        - no_input_field_addition_required
        
    # Performance Policies  
    - name: "query_complexity_limits"
      description: "Enforce query complexity limits"
      enabled: true
      severity: "WARNING"
      rules:
        - max_depth: 15
        - max_complexity: 1000
        - max_aliases: 30
        
    # Security Policies
    - name: "security_requirements"
      description: "Ensure proper security directives"
      enabled: true
      severity: "ERROR"
      rules:
        - sensitive_fields_must_have_auth_directive
        - no_introspection_in_production
        - require_https_in_production
        
    # Documentation Requirements
    - name: "documentation_standards"
      description: "Enforce documentation standards"
      enabled: true
      severity: "WARNING"
      rules:
        - all_fields_must_have_description
        - all_types_must_have_description
        - deprecation_reason_required
        
  exceptions:
    # Allow certain legacy fields to exist without breaking change protection
    - policy: "prevent_breaking_changes"
      fields: 
        - "Customer.legacyField"
        - "Project.deprecatedStatus"
      reason: "Legacy compatibility during migration"
      expires: "2024-06-01"
      
  approvals:
    # Require approval for certain changes
    breaking_changes:
      required: true
      approvers:
        - "team:api-leads"
        - "team:product-owners"
      minimum_approvals: 2
      
    schema_additions:
      required: false
      auto_approve: true
      
notifications:
  schema_changes:
    channels:
      - slack: "#schema-changes"
      - email: "api-team@paintbox.candlefish.ai"
    events:
      - schema_published
      - breaking_change_detected
      - policy_violation
      - composition_failure
```

## Production Deployment Checklist

### 1. Pre-Deployment Validation

```bash
#!/bin/bash
# pre-deployment-check.sh

echo "🔍 Running pre-deployment validation..."

# Schema validation
echo "Validating schemas..."
rover supergraph compose --config supergraph-config-production.yaml > composed-schema.graphql
rover graph check paintbox-federation@production --schema composed-schema.graphql

# Performance testing
echo "Running performance tests..."
artillery run performance-tests/federation-load-test.yml

# Security scanning
echo "Running security scans..."
semgrep --config=security-scan-rules.yml subgraph-*/src/

# Dependency auditing
echo "Auditing dependencies..."
npm audit --audit-level moderate

# Configuration validation
echo "Validating environment configuration..."
node scripts/validate-config.js --env production

echo "✅ Pre-deployment validation complete!"
```

### 2. Health Check Endpoints

```typescript
// Health check implementation for each subgraph
interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  timestamp: string;
  checks: {
    database: HealthStatus;
    cache: HealthStatus;
    externalAPIs: HealthStatus;
  };
}

interface HealthStatus {
  status: 'up' | 'down';
  latency?: number;
  error?: string;
  lastCheck: string;
}

// Health check endpoint for each subgraph
app.get('/health', async (req, res) => {
  const healthCheck: HealthCheckResponse = {
    status: 'healthy',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
    checks: {
      database: await checkDatabase(),
      cache: await checkRedis(),
      externalAPIs: await checkExternalAPIs()
    }
  };
  
  // Determine overall health
  const hasFailures = Object.values(healthCheck.checks)
    .some(check => check.status === 'down');
    
  if (hasFailures) {
    healthCheck.status = 'unhealthy';
    res.status(503);
  }
  
  res.json(healthCheck);
});
```

This Apollo Studio configuration provides comprehensive monitoring, alerting, and governance for the federated GraphQL architecture, ensuring production reliability and performance optimization for 100 concurrent users.

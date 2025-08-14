# Candlefish AI Platform API Documentation

## Overview

The Candlefish AI Platform provides a comprehensive GraphQL API for managing deployments, webhooks, monitoring, and integrations. This document covers all available endpoints, authentication methods, and usage examples.

## Table of Contents

1. [Authentication](#authentication)
2. [GraphQL API](#graphql-api)
3. [Webhook Management](#webhook-management)
4. [Deployment Operations](#deployment-operations)
5. [Monitoring & Metrics](#monitoring--metrics)
6. [Error Handling](#error-handling)
7. [Rate Limiting](#rate-limiting)
8. [WebSocket Subscriptions](#websocket-subscriptions)

## Authentication

### Bearer Token Authentication

All API requests require authentication using a Bearer token in the Authorization header:

```bash
curl -H "Authorization: Bearer YOUR_API_TOKEN" \
     -H "Content-Type: application/json" \
     https://api.candlefish.ai/graphql
```

### API Key Authentication

Alternatively, you can use an API key:

```bash
curl -H "X-API-Key: YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     https://api.candlefish.ai/graphql
```

### Obtaining Credentials

1. **Via GraphQL**:
```graphql
mutation GenerateApiKey {
  generateApiKey(input: {
    name: "Production API Key"
    scopes: ["read:webhooks", "write:webhooks", "read:deployments"]
    expiresIn: "90d"
  }) {
    apiKey
    secretKey
    expiresAt
  }
}
```

2. **Via CLI**:
```bash
candlefish auth generate-key --name "CI/CD Pipeline" --scopes "*"
```

## GraphQL API

### Endpoint

```
POST https://api.candlefish.ai/graphql
```

### Webhook Queries

#### List Webhooks

```graphql
query ListWebhooks($filter: WebhookFilter, $pagination: PaginationInput) {
  webhooks(filter: $filter, pagination: $pagination) {
    edges {
      node {
        id
        name
        description
        url
        method
        events
        active
        successRate
        lastTriggered
        authentication {
          type
        }
        retryPolicy {
          maxRetries
          retryDelay
          backoffMultiplier
        }
      }
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
      totalCount
    }
  }
}
```

**Variables:**
```json
{
  "filter": {
    "active": true,
    "events": ["deployment.completed"]
  },
  "pagination": {
    "first": 20,
    "after": "cursor_value"
  }
}
```

#### Get Webhook Details

```graphql
query GetWebhook($id: ID!) {
  webhook(id: $id) {
    id
    name
    url
    events
    headers
    executions(limit: 10) {
      edges {
        node {
          id
          status
          statusCode
          responseTime
          executedAt
          error
        }
      }
    }
    analytics {
      totalExecutions
      successfulExecutions
      failedExecutions
      averageResponseTime
      successRate
    }
  }
}
```

### Webhook Mutations

#### Create Webhook

```graphql
mutation CreateWebhook($input: CreateWebhookInput!) {
  createWebhook(input: $input) {
    id
    name
    url
    secret
    events
  }
}
```

**Variables:**
```json
{
  "input": {
    "name": "Salesforce Integration",
    "description": "Sync deployment events to Salesforce",
    "url": "https://api.salesforce.com/webhooks/deployments",
    "method": "POST",
    "events": [
      "deployment.started",
      "deployment.completed",
      "deployment.failed"
    ],
    "headers": {
      "X-Custom-Header": "value"
    },
    "authentication": {
      "type": "BEARER",
      "config": {
        "token": "sf_token_123"
      }
    },
    "retryPolicy": {
      "maxRetries": 3,
      "retryDelay": 1000,
      "backoffMultiplier": 2
    }
  }
}
```

#### Update Webhook

```graphql
mutation UpdateWebhook($input: UpdateWebhookInput!) {
  updateWebhook(input: $input) {
    id
    name
    url
    events
    active
    updatedAt
  }
}
```

#### Test Webhook

```graphql
mutation TestWebhook($id: ID!, $payload: JSON) {
  testWebhook(id: $id, payload: $payload) {
    success
    statusCode
    responseTime
    response
    error
  }
}
```

### Deployment Queries

#### List Deployments

```graphql
query ListDeployments($filter: DeploymentFilter) {
  deployments(filter: $filter) {
    edges {
      node {
        id
        release {
          id
          version
          changelog
        }
        environment {
          name
          status
          url
        }
        status
        strategy
        startedAt
        completedAt
        steps {
          name
          status
          startedAt
          completedAt
          output
        }
      }
    }
  }
}
```

#### Get Current Releases

```graphql
query GetCurrentReleases {
  currentReleases {
    environment
    release {
      id
      version
      commit
      branch
      deployedAt
      deployedBy
    }
    healthStatus
    metrics {
      requestRate
      errorRate
      latencyP50
      latencyP95
      latencyP99
    }
  }
}
```

### Deployment Mutations

#### Trigger Deployment

```graphql
mutation TriggerDeployment($input: TriggerDeploymentInput!) {
  triggerDeployment(input: $input) {
    id
    status
    environment
    release {
      version
    }
    estimatedDuration
    steps {
      name
      status
    }
  }
}
```

**Variables:**
```json
{
  "input": {
    "releaseId": "release_123",
    "environment": "production",
    "strategy": "blue-green",
    "config": {
      "autoRollback": true,
      "healthCheckTimeout": 300,
      "notifications": {
        "slack": true,
        "email": ["ops@company.com"]
      }
    }
  }
}
```

#### Rollback Deployment

```graphql
mutation RollbackDeployment($input: RollbackDeploymentInput!) {
  rollbackDeployment(input: $input) {
    id
    deploymentId
    targetVersion
    status
    reason
    initiatedBy
    initiatedAt
  }
}
```

### Feature Flag Management

#### List Feature Flags

```graphql
query ListFeatureFlags {
  featureFlags {
    id
    key
    name
    description
    type
    enabled
    environments {
      name
      enabled
      percentage
      conditions
    }
    targeting {
      rules {
        condition
        value
        percentage
      }
    }
  }
}
```

#### Toggle Feature Flag

```graphql
mutation ToggleFeatureFlag($id: ID!, $enabled: Boolean!) {
  toggleFeatureFlag(id: $id, enabled: $enabled) {
    id
    key
    enabled
    updatedAt
  }
}
```

## Webhook Management

### Webhook Event Types

| Event Type | Description | Payload Example |
|------------|-------------|-----------------|
| `deployment.started` | Deployment initiated | `{ deploymentId, environment, version }` |
| `deployment.completed` | Deployment successful | `{ deploymentId, environment, version, duration }` |
| `deployment.failed` | Deployment failed | `{ deploymentId, environment, error, rollbackId }` |
| `alert.created` | New alert triggered | `{ alertId, severity, message, source }` |
| `alert.resolved` | Alert resolved | `{ alertId, resolvedBy, duration }` |
| `backup.completed` | Backup successful | `{ backupId, size, duration, location }` |
| `backup.failed` | Backup failed | `{ backupId, error, retryScheduled }` |
| `webhook.failed` | Webhook delivery failed | `{ webhookId, attempt, error, nextRetry }` |

### Webhook Payload Structure

All webhook payloads follow this structure:

```json
{
  "id": "event_abc123",
  "timestamp": "2024-01-15T10:30:00Z",
  "type": "deployment.completed",
  "source": "candlefish-platform",
  "dataVersion": "1.0",
  "data": {
    // Event-specific data
  },
  "metadata": {
    "organizationId": "org_123",
    "userId": "user_456",
    "correlationId": "corr_789"
  }
}
```

### Webhook Security

#### HMAC Signature Validation

All webhooks include an HMAC-SHA256 signature in the `X-Candlefish-Signature` header:

```javascript
const crypto = require('crypto');

function validateWebhook(payload, signature, secret) {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return `sha256=${hash}` === signature;
}

// Express.js middleware example
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-candlefish-signature'];
  const isValid = validateWebhook(
    JSON.stringify(req.body),
    signature,
    process.env.WEBHOOK_SECRET
  );
  
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Process webhook
  res.status(200).json({ received: true });
});
```

#### IP Whitelisting

Webhooks are sent from these IP ranges:
- Production: `35.160.0.0/16`
- Staging: `52.89.0.0/16`

### Webhook Retry Logic

Failed webhooks are retried with exponential backoff:

1. Initial attempt: Immediate
2. Retry 1: After 1 minute
3. Retry 2: After 5 minutes
4. Retry 3: After 15 minutes
5. Retry 4: After 1 hour
6. Retry 5: After 6 hours

After 5 failed attempts, the webhook is marked as failed and requires manual intervention.

## Deployment Operations

### Deployment Strategies

#### Blue-Green Deployment

```graphql
mutation BlueGreenDeploy {
  triggerDeployment(input: {
    releaseId: "release_123",
    environment: "production",
    strategy: "blue-green",
    config: {
      healthCheckPath: "/health",
      healthCheckInterval: 10,
      switchoverDelay: 30,
      keepPreviousVersion: true
    }
  }) {
    id
    status
  }
}
```

#### Canary Deployment

```graphql
mutation CanaryDeploy {
  startCanaryDeployment(input: {
    deploymentId: "deploy_123",
    config: {
      initialPercentage: 10,
      incrementPercentage: 20,
      incrementInterval: 300,
      successThreshold: 0.99,
      metrics: ["error_rate", "latency_p99"]
    }
  }) {
    id
    status
    currentPercentage
    metrics {
      errorRate
      latencyP99
    }
  }
}
```

### Deployment Monitoring

#### Real-time Deployment Progress

```graphql
subscription DeploymentProgress($deploymentId: ID!) {
  deploymentProgress(deploymentId: $deploymentId) {
    deploymentId
    status
    currentStep
    totalSteps
    progress
    logs {
      timestamp
      level
      message
    }
    metrics {
      duration
      resourceUsage
    }
  }
}
```

## Monitoring & Metrics

### Metrics Endpoint

```bash
GET https://api.candlefish.ai/metrics
```

Returns Prometheus-formatted metrics:

```
# HELP candlefish_http_requests_total Total HTTP requests
# TYPE candlefish_http_requests_total counter
candlefish_http_requests_total{method="GET",route="/health",status="200"} 15823

# HELP candlefish_http_request_duration_seconds Request latency
# TYPE candlefish_http_request_duration_seconds histogram
candlefish_http_request_duration_seconds_bucket{le="0.1"} 14523
candlefish_http_request_duration_seconds_bucket{le="0.5"} 15621
candlefish_http_request_duration_seconds_bucket{le="1"} 15798

# HELP candlefish_temporal_workflows_active Active Temporal workflows
# TYPE candlefish_temporal_workflows_active gauge
candlefish_temporal_workflows_active 42

# HELP candlefish_database_connections Active database connections
# TYPE candlefish_database_connections gauge
candlefish_database_connections{state="active"} 8
candlefish_database_connections{state="idle"} 12
```

### Health Checks

#### Main Health Endpoint

```bash
GET https://api.candlefish.ai/health
```

Response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 864000,
  "timestamp": "2024-01-15T10:30:00Z",
  "services": {
    "database": {
      "status": "healthy",
      "latency": 5,
      "connections": {
        "active": 8,
        "idle": 12,
        "max": 50
      }
    },
    "temporal": {
      "status": "healthy",
      "latency": 12,
      "workers": {
        "active": 5,
        "taskSlots": 100
      }
    },
    "redis": {
      "status": "healthy",
      "latency": 2,
      "memory": {
        "used": "256MB",
        "max": "1GB"
      }
    },
    "graphql": {
      "status": "healthy",
      "latency": 8,
      "requestRate": 150.5
    }
  }
}
```

## Error Handling

### Error Response Format

All errors follow this structure:

```json
{
  "error": {
    "code": "WEBHOOK_NOT_FOUND",
    "message": "Webhook with ID 'webhook_123' not found",
    "details": {
      "webhookId": "webhook_123",
      "searchedIn": ["active", "inactive"]
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "traceId": "trace_abc123",
    "help": "https://docs.candlefish.ai/errors/WEBHOOK_NOT_FOUND"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid input parameters |
| `RATE_LIMITED` | 429 | Too many requests |
| `CONFLICT` | 409 | Resource conflict |
| `INTERNAL_ERROR` | 500 | Internal server error |

## Rate Limiting

Rate limits are applied per API key:

| Endpoint | Limit | Window |
|----------|-------|--------|
| GraphQL queries | 1000/min | 1 minute |
| GraphQL mutations | 100/min | 1 minute |
| Webhook operations | 50/min | 1 minute |
| Deployment triggers | 10/hour | 1 hour |
| Metrics endpoint | 100/min | 1 minute |

Rate limit headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1642248000
```

## WebSocket Subscriptions

### Connection

```javascript
const { createClient } = require('graphql-ws');

const client = createClient({
  url: 'wss://api.candlefish.ai/graphql',
  connectionParams: {
    authorization: 'Bearer YOUR_API_TOKEN',
  },
});
```

### Available Subscriptions

#### Webhook Execution Updates

```graphql
subscription WebhookUpdates($webhookId: ID!) {
  webhookExecutionUpdate(webhookId: $webhookId) {
    executionId
    status
    statusCode
    responseTime
    attempt
    error
  }
}
```

#### Deployment Progress

```graphql
subscription DeploymentUpdates($deploymentId: ID!) {
  deploymentProgress(deploymentId: $deploymentId) {
    status
    progress
    currentStep
    logs {
      timestamp
      message
      level
    }
  }
}
```

#### System Alerts

```graphql
subscription SystemAlerts($severity: AlertSeverity) {
  alertStream(severity: $severity) {
    id
    name
    severity
    status
    message
    source
    timestamp
  }
}
```

## SDK Examples

### JavaScript/TypeScript

```typescript
import { CandlefishClient } from '@candlefish/sdk';

const client = new CandlefishClient({
  apiKey: process.env.CANDLEFISH_API_KEY,
  environment: 'production'
});

// Create webhook
const webhook = await client.webhooks.create({
  name: 'My Webhook',
  url: 'https://example.com/webhook',
  events: ['deployment.completed']
});

// Trigger deployment
const deployment = await client.deployments.trigger({
  releaseId: 'release_123',
  environment: 'production',
  strategy: 'blue-green'
});

// Subscribe to updates
client.subscriptions.deploymentProgress(deployment.id, (update) => {
  console.log(`Deployment ${update.status}: ${update.progress}%`);
});
```

### Python

```python
from candlefish import CandlefishClient

client = CandlefishClient(
    api_key=os.environ['CANDLEFISH_API_KEY'],
    environment='production'
)

# Create webhook
webhook = client.webhooks.create(
    name='My Webhook',
    url='https://example.com/webhook',
    events=['deployment.completed']
)

# Trigger deployment
deployment = client.deployments.trigger(
    release_id='release_123',
    environment='production',
    strategy='blue-green'
)

# Subscribe to updates
async for update in client.subscriptions.deployment_progress(deployment.id):
    print(f"Deployment {update.status}: {update.progress}%")
```

### Go

```go
package main

import (
    "github.com/candlefish/go-sdk"
)

func main() {
    client := candlefish.NewClient(
        candlefish.WithAPIKey(os.Getenv("CANDLEFISH_API_KEY")),
        candlefish.WithEnvironment("production"),
    )
    
    // Create webhook
    webhook, err := client.Webhooks.Create(&candlefish.CreateWebhookInput{
        Name: "My Webhook",
        URL: "https://example.com/webhook",
        Events: []string{"deployment.completed"},
    })
    
    // Trigger deployment
    deployment, err := client.Deployments.Trigger(&candlefish.TriggerDeploymentInput{
        ReleaseID: "release_123",
        Environment: "production",
        Strategy: "blue-green",
    })
}
```

## Support

For API support:
- Documentation: https://docs.candlefish.ai/api
- Status Page: https://status.candlefish.ai
- Support Email: api-support@candlefish.ai
- Discord: https://discord.gg/candlefish

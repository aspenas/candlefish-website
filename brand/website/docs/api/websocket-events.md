# Candlefish AI Prompt Engineering WebSocket Events

## Overview

The Candlefish AI Prompt Engineering WebSocket provides real-time updates and monitoring for prompt executions, system metrics, and more.

## Connection Establishment

### Endpoint
`wss://api.candlefish.ai/v1/prompts/ws`

### Authentication
- JWT Token
- API Key

### JavaScript Example
```javascript
const ws = new WebSocket('wss://api.candlefish.ai/v1/prompts/ws', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

### TypeScript SDK
```typescript
import { PromptClient } from '@candlefish/prompt-engineering-sdk';

const client = new PromptClient({ apiKey: '...' });
const ws = client.createWebSocket();
```

## Event Types

### 1. Execution Events

#### `execution_start`
Triggered when a prompt execution begins.

```json
{
  "type": "execution_start",
  "id": "prompt-exec-123",
  "templateId": "code-review-v1",
  "timestamp": "2025-08-27T10:15:30Z"
}
```

#### `execution_progress`
Real-time progress updates during prompt processing.

```json
{
  "type": "execution_progress",
  "id": "prompt-exec-123",
  "progress": 0.5,
  "stage": "model-processing",
  "estimatedTimeRemaining": 5000
}
```

#### `execution_complete`
Sent when a prompt execution finishes successfully.

```json
{
  "type": "execution_complete",
  "id": "prompt-exec-123",
  "result": {
    "response": "...",
    "tokensUsed": 245,
    "latency": 2.5
  }
}
```

#### `execution_error`
Indicates an error during prompt execution.

```json
{
  "type": "execution_error",
  "id": "prompt-exec-123",
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests",
    "retryAfter": 60
  }
}
```

### 2. System Events

#### `metrics_update`
Periodic system performance metrics.

```json
{
  "type": "metrics_update",
  "timestamp": "2025-08-27T10:15:30Z",
  "metrics": {
    "totalRequests": 1245,
    "averageLatency": 1.2,
    "tokensProcessed": 500000,
    "activeTemplates": 15
  }
}
```

#### `cache_update`
Notifications about prompt template cache changes.

```json
{
  "type": "cache_update",
  "action": "invalidate",
  "templateId": "code-review-v1"
}
```

#### `model_status`
Updates about model provider availability.

```json
{
  "type": "model_status",
  "provider": "anthropic",
  "model": "claude-3-haiku",
  "status": "available",
  "currentLoad": 0.75
}
```

### 3. Heartbeat Event

#### `heartbeat`
Periodic connection health check.

```json
{
  "type": "heartbeat",
  "timestamp": "2025-08-27T10:15:30Z"
}
```

## Event Subscription

### JavaScript
```javascript
ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'execution_start':
      handleExecutionStart(message);
      break;
    case 'execution_progress':
      updateProgressBar(message);
      break;
    // ... other event handlers
  }
});
```

### TypeScript SDK
```typescript
const ws = client.createWebSocket();

ws.on('execution_start', (event) => {
  console.log('Prompt execution started:', event.id);
});

ws.on('execution_progress', (event) => {
  updateUI(event.progress);
});

ws.on('execution_complete', (event) => {
  displayResult(event.result);
});
```

## Error Handling

### Connection Errors
- Automatic reconnection
- Exponential backoff strategy
- Configurable max retry attempts

### Event Processing
- Individual event handlers won't block other events
- Errors in one handler won't interrupt others

## Performance Considerations
- Lightweight, binary WebSocket protocol
- Minimal overhead
- Configurable update frequency

## Browser Compatibility
- Supported in all modern browsers
- Fallback to long-polling if WebSocket unavailable

## Rate Limits
- 100 concurrent WebSocket connections
- 50 events/second per connection

## Security
- Encrypted (WSS)
- Token-based authentication
- IP-based connection throttling

## Troubleshooting
- Check network connectivity
- Verify authentication
- Monitor connection state
- Use SDK's built-in logging

## Support
- Docs: https://candlefish.ai/docs/websockets
- Support: websocket-support@candlefish.ai
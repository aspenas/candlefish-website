# Candlefish AI Prompt Engineering TypeScript SDK

## Installation

```bash
npm install @candlefish/prompt-engineering-sdk
```

## Quick Start

### Executing a Prompt

```typescript
import { PromptClient } from '@candlefish/prompt-engineering-sdk';

// Initialize the client
const client = new PromptClient({
  apiKey: process.env.CANDLEFISH_API_KEY,
  baseUrl: 'https://api.candlefish.ai/v1'
});

// Execute a code review prompt
async function reviewCode() {
  const response = await client.prompts.execute({
    templateId: 'code-review-v1',
    variables: {
      code: `function add(a, b) { return a + b; }`
    },
    modelConfig: {
      provider: 'anthropic',
      model: 'claude-3-haiku',
      temperature: 0.5
    }
  });

  console.log(response.result);
}
```

### Template Management

```typescript
// Create a new template
const template = await client.templates.create({
  name: 'Custom Code Review',
  category: 'code-review',
  template: 'Review the following code with a focus on {{focus}}:',
  variables: [
    {
      name: 'code',
      type: 'string',
      required: true
    },
    {
      name: 'focus',
      type: 'string',
      required: false,
      default: 'performance'
    }
  ]
});

// List templates
const templates = await client.templates.list({
  category: 'code-review',
  page: 1,
  limit: 20
});
```

### Real-time WebSocket Monitoring

```typescript
const ws = client.createWebSocket();

ws.on('execution_start', (event) => {
  console.log('Prompt execution started:', event.id);
});

ws.on('execution_progress', (event) => {
  console.log('Progress update:', event.progress);
});

ws.on('execution_complete', (event) => {
  console.log('Execution complete:', event.result);
});
```

### Error Handling

```typescript
try {
  await client.prompts.execute({...});
} catch (error) {
  if (error instanceof PromptExecutionError) {
    console.error('Prompt execution failed:', error.message);
    console.error('Error details:', error.details);
  }
}
```

## Configuration Options

### Client Initialization

```typescript
const client = new PromptClient({
  apiKey: string;           // Required: Your Candlefish API key
  baseUrl?: string;         // Optional: Custom API base URL
  timeout?: number;         // Optional: Request timeout in milliseconds
  retry?: {
    attempts?: number;      // Number of retry attempts
    delay?: number;         // Delay between retries
  };
  cache?: {
    enabled?: boolean;      // Enable response caching
    ttl?: number;           // Cache time-to-live in seconds
  };
});
```

## Authentication

Authentication is done via JWT or API Key. Always keep your credentials secure.

```typescript
// Using environment variables
const client = new PromptClient({
  apiKey: process.env.CANDLEFISH_API_KEY
});

// Or manually
const client = new PromptClient({
  apiKey: 'your-api-key-here'
});
```

## Rate Limiting

The SDK automatically handles rate limiting:
- Anthropic: 2,000,000 input tokens/minute
- OpenAI: 250,000 tokens/minute
- Default retry strategy with exponential backoff

### Metrics and Tracking

```typescript
// Get system metrics
const metrics = await client.metrics.get({
  timeRange: 'week'  // 'day', 'week', 'month'
});

console.log('Total requests:', metrics.totalRequests);
console.log('Average latency:', metrics.averageLatency);
```

## Supported Features

- Prompt template management
- Prompt execution with multiple model providers
- Real-time WebSocket event streaming
- Metrics and performance tracking
- Prompt optimization
- Error handling and retry mechanisms
- Caching support

## Browser and Node.js Support

Compatible with:
- Node.js 16+
- Modern browsers
- TypeScript 4.5+

## Contributing

Found an issue? [Open a GitHub issue](https://github.com/candlefish/prompt-engineering-sdk/issues)

## License

MIT License
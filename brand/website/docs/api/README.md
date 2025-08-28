# Candlefish AI Prompt Engineering API Documentation

## Quick Links

- [TypeScript SDK](/api/typescript-sdk.md)
- [Authentication Guide](/api/authentication.md)
- [WebSocket Events](/api/websocket-events.md)
- [OpenAPI Specification](/api-docs/prompt-engineering-api.yaml)
- [Postman Collection](/api-docs/prompt-engineering-collection.json)

## Getting Started

### 1. Obtain Credentials
Visit the [Candlefish Developer Portal](https://candlefish.ai/developers) to:
- Generate API keys
- Create an account
- Access documentation

### 2. Install SDK

#### npm
```bash
npm install @candlefish/prompt-engineering-sdk
```

#### yarn
```bash
yarn add @candlefish/prompt-engineering-sdk
```

### 3. Basic Usage

```typescript
import { PromptClient } from '@candlefish/prompt-engineering-sdk';

const client = new PromptClient({
  apiKey: process.env.CANDLEFISH_API_KEY
});

async function main() {
  const response = await client.prompts.execute({
    templateId: 'code-review-v1',
    variables: {
      code: 'function add(a, b) { return a + b; }'
    }
  });

  console.log(response.result);
}
```

## Key Features

- 🚀 Multi-model support
- 📊 Comprehensive metrics
- 🔒 Secure authentication
- 🌐 Real-time WebSocket events
- 📝 Prompt template management
- 🧠 Intelligent prompt optimization

## Documentation Sections

### 1. Authentication
[Learn about authentication methods](/api/authentication.md)
- JWT tokens
- API key authentication
- Secure credential management

### 2. TypeScript SDK
[Detailed SDK usage guide](/api/typescript-sdk.md)
- Client initialization
- Prompt execution
- Template management
- Error handling

### 3. WebSocket Events
[Real-time monitoring guide](/api/websocket-events.md)
- Connection establishment
- Event types
- Performance monitoring
- Error handling

### 4. OpenAPI Specification
[Complete API definition](/api-docs/prompt-engineering-api.yaml)
- Comprehensive endpoint documentation
- Request/response schemas
- Error codes

### 5. Postman Collection
[Import for easy API testing](/api-docs/prompt-engineering-collection.json)
- Pre-configured requests
- Example payloads
- Environment variables

## Supported Languages

- TypeScript/JavaScript
- Python
- Go
- Java
- Rust (Community)

## Rate Limits & Pricing

| Tier | Requests/Minute | Tokens/Minute | Price |
|------|-----------------|---------------|-------|
| Free | 100 | 10,000 | $0 |
| Pro  | 1,000 | 100,000 | $49/month |
| Enterprise | Unlimited | Unlimited | Custom |

## Compliance & Security

- SOC 2 Type II Certified
- GDPR Compliant
- ISO 27001 Certified
- End-to-end encryption
- Regular security audits

## Support Channels

- 📧 Email: support@candlefish.ai
- 💬 Slack Community
- 🌐 Support Portal: https://candlefish.ai/support
- 📖 Documentation: https://docs.candlefish.ai

## Contributing

Found a bug or want to contribute?
1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## License

MIT License

---

**Last Updated**: 2025-08-27
**Version**: 1.0.0
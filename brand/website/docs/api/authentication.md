# Candlefish AI Prompt Engineering API Authentication

## Overview

The Candlefish AI Prompt Engineering API supports multiple authentication methods to ensure secure access to our services.

## Authentication Methods

### 1. Bearer Token (JWT)

#### Token Generation
- Tokens are generated via our OAuth 2.0 identity provider
- Tokens are short-lived (typically 1 hour)
- Automatic token refresh is supported

```bash
# Example token request
curl -X POST https://auth.candlefish.ai/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "client_credentials",
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET",
    "scope": "prompt-engineering:execute prompt-engineering:read"
  }'
```

#### Token Usage
```bash
# API Request with Bearer Token
curl -X POST https://api.candlefish.ai/v1/prompts/execute \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

### 2. API Key Authentication

#### API Key Generation
- Generated in the Candlefish AI Developer Portal
- Can be scoped to specific permissions
- Recommended for server-to-server communication

```bash
# API Key Header
curl -X POST https://api.candlefish.ai/v1/prompts/execute \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

## Best Practices

1. **Never expose API keys/tokens in client-side code**
2. Use environment variables for credentials
3. Rotate keys periodically
4. Use the least privileged access required
5. Monitor and log API access

## Rate Limiting

- JWT Tokens: 5,000 requests/hour
- API Keys: Configurable rate limits
- Soft and hard limit tiers available

### Rate Limit Headers
- `X-RateLimit-Limit`: Total allowed requests
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Time until limit resets

## Error Handling

### Common Authentication Errors

| HTTP Code | Error | Description | Resolution |
|-----------|-------|-------------|------------|
| 401 | Unauthorized | Invalid or expired token | Refresh token or re-authenticate |
| 403 | Forbidden | Insufficient permissions | Check API key scopes |
| 429 | Too Many Requests | Rate limit exceeded | Wait and retry, or upgrade plan |

## Secure Token Management

### Node.js Example
```javascript
import { CandlefishClient } from '@candlefish/prompt-engineering-sdk';

const client = new CandlefishClient({
  credentials: {
    clientId: process.env.CANDLEFISH_CLIENT_ID,
    clientSecret: process.env.CANDLEFISH_CLIENT_SECRET
  },
  secureStorage: {
    // Optional: Custom secure token storage
    save: async (token) => { /* Implement secure storage */ },
    load: async () => { /* Retrieve stored token */ }
  }
});
```

### Python Example
```python
from candlefish import PromptClient
import os

client = PromptClient(
    client_id=os.getenv('CANDLEFISH_CLIENT_ID'),
    client_secret=os.getenv('CANDLEFISH_CLIENT_SECRET'),
    secure_storage=SecureTokenManager()  # Optional custom token manager
)
```

## Credential Rotation

- Automatic key rotation every 90 days
- Manual rotation available in Developer Portal
- Supports multiple active keys during transition

## Compliance

- GDPR Compliant
- SOC 2 Type II Certified
- ISO 27001 Certified

## Support

For authentication issues:
- Email: security@candlefish.ai
- Support Portal: https://candlefish.ai/support
- Emergency Hotline: +1 (888) CANDLE-SEC
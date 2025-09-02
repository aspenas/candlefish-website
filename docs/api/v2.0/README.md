# Claude Configuration System API v2.0

## Overview

The Claude Configuration System API provides a comprehensive, secure, and scalable solution for managing AI development configurations across enterprise environments.

## Key Features

- 🔒 Multi-tenant configuration management
- 🚀 Advanced AI workflow orchestration
- 🛡️ Granular access controls
- 📊 Real-time configuration event streaming
- 🔄 Versioned configuration profiles

## Authentication

The API supports two primary authentication methods:

1. **OAuth 2.0 Authorization Code Flow**
   - Recommended for enterprise integrations
   - Supports fine-grained access scopes

2. **API Key Authentication**
   - Simple, direct API access
   - Suitable for service-to-service communication

### Authentication Scopes

- `read:config`: Read configuration data
- `write:config`: Modify configuration data
- `admin:config`: Full configuration management

## API Endpoints

### Configuration Profiles

- `GET /config/profiles`: List all configuration profiles
- `POST /config/profiles`: Create a new configuration profile
- `GET /config/profiles/{profile_id}`: Retrieve a specific profile
- `PUT /config/profiles/{profile_id}`: Update a configuration profile
- `DELETE /config/profiles/{profile_id}`: Delete a configuration profile

### WebSocket Events

- `GET /ws/config-events`: Real-time configuration change events

## SDK Support

Official SDK support for multiple languages:

- Python: `candlefish-claude-config`
- TypeScript/JavaScript: `@candlefish/claude-config`
- Go: `github.com/candlefish/claude-config-go`

## Rate Limits

### Tier-based Limits

| Tier        | Requests/Minute | Max Profiles | Additional Features |
|-------------|-----------------|--------------|---------------------|
| Free        | 10              | 3            | Basic access        |
| Pro         | 100             | 25           | Enhanced features   |
| Enterprise  | 1000            | 250          | Full access control |

## Versioning

- **Current Version**: v2.0.0
- **v1.x Support End**: December 31, 2025
- **v2.x Planned Support**: December 31, 2028

## Getting Started

1. Obtain API credentials from Candlefish.ai
2. Choose your preferred SDK or use the OpenAPI specification
3. Start managing your Claude Code configurations

### Python Example

```python
from candlefish_claude_config import CandlefishConfigClient

client = CandlefishConfigClient(api_key="your_api_key")
profile = client.ConfigProfile(
    name="Enterprise DevOps",
    settings={"languages": ["python", "typescript"]}
)
created_profile = client.create_profile(profile)
```

### TypeScript Example

```typescript
import { CandlefishConfigClient } from '@candlefish/claude-config';

const client = new CandlefishConfigClient('your_api_key');
const profile = await client.createProfile({
  name: 'Enterprise DevOps Profile',
  settings: {
    languages: ['typescript', 'python']
  }
});
```

## Documentation

- [OpenAPI Specification](/claude-config-system-openapi.yaml)
- [Postman Collection](/claude-config-postman-collection.json)
- [Migration Guide](https://candlefish.ai/docs/api/migration-v1-to-v2)

## Support

- Email: devops@candlefish.ai
- Support Portal: https://candlefish.ai/support

## Legal

By using this API, you agree to Candlefish.ai's Terms of Service and Privacy Policy.

## Contributing

We welcome contributions! Please see our [Contribution Guidelines](https://candlefish.ai/contribute) for more information.
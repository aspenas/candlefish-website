# Candlefish API Integration Guide

## Authentication

### JWT Authentication
Candlefish uses JSON Web Tokens (JWT) for authentication via JWKS (JSON Web Key Set).

#### JWKS Endpoint
- URL: `https://paintbox.fly.dev/.well-known/jwks.json`
- Algorithm: RS256
- Current Key ID: `88672a69-26ae-45db-b73c-93debf7ea87d`

#### Obtaining a Token
```bash
# Example JWT generation
node scripts/sign-jwt.js --payload '{"sub":"user123","name":"John Doe"}'
```

#### Making Authenticated Requests
```bash
# REST API Example
curl -H "Authorization: Bearer <JWT_TOKEN>" https://api.candlefish.ai/v1/api/agents

# GraphQL Example
curl -X POST https://api.candlefish.ai/graphql \
     -H "Authorization: Bearer <JWT_TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{"query":"query { agents { edges { node { name } } } }"}'
```

## REST API Examples

### List Agents
```bash
# Bash/Curl
curl https://api.candlefish.ai/v1/api/agents \
     -H "Authorization: Bearer <JWT_TOKEN>"

# Python (requests)
import requests

response = requests.get(
    'https://api.candlefish.ai/v1/api/agents',
    headers={'Authorization': f'Bearer {jwt_token}'}
)
```

### Create Agent
```bash
# Bash/Curl
curl -X POST https://api.candlefish.ai/v1/api/agents \
     -H "Authorization: Bearer <JWT_TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{
         "name": "GPT-4 Assistant",
         "platform": "openai",
         "capabilities": ["text-generation", "code-completion"]
     }'

# Python (requests)
import requests

response = requests.post(
    'https://api.candlefish.ai/v1/api/agents',
    headers={
        'Authorization': f'Bearer {jwt_token}',
        'Content-Type': 'application/json'
    },
    json={
        'name': 'GPT-4 Assistant',
        'platform': 'openai',
        'capabilities': ['text-generation', 'code-completion']
    }
)
```

## GraphQL Queries

### List Agents
```graphql
query ListAgents {
  agents(first: 10) {
    edges {
      node {
        agent_id
        name
        platform
        capabilities
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

### Register Agent
```graphql
mutation RegisterAgent {
  registerAgent(input: {
    name: "Claude Assistant"
    platform: "anthropic"
    capabilities: ["conversational-ai", "analysis"]
  }) {
    agent_id
    name
    created_at
  }
}
```

## Webhook Integration

### Payload Format
```json
{
  "event_type": "agent_registered",
  "timestamp": "2025-08-25T12:34:56Z",
  "data": {
    "agent_id": "agent_12345",
    "name": "New Agent",
    "platform": "custom"
  }
}
```

### Webhook Endpoint
- URL: `https://api.candlefish.ai/webhook/nanda`
- Method: POST
- Content-Type: `application/json`

## Rate Limits

| Endpoint | Requests per Minute |
|----------|---------------------|
| GET /api/agents | 100 |
| POST /api/agents | 50 |
| GraphQL Queries | 200 |
| GraphQL Mutations | 100 |

## Error Handling

### Common Error Codes
- `401`: Unauthorized (Invalid JWT)
- `429`: Rate Limited
- `400`: Validation Error
- `500`: Internal Server Error

## SDK Libraries
- Python: `pip install candlefish-sdk`
- JavaScript: `npm install @candlefish/api-client`
- Go: `go get github.com/candlefish/go-sdk`

## Support
- Email: api-support@candlefish.ai
- Documentation: https://api.candlefish.ai/docs
- Status Page: https://status.candlefish.ai

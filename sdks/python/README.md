# Candlefish Claude Config Python SDK

[![PyPI version](https://badge.fury.io/py/candlefish-claude-config.svg)](https://badge.fury.io/py/candlefish-claude-config)
[![Python Support](https://img.shields.io/pypi/pyversions/candlefish-claude-config.svg)](https://pypi.org/project/candlefish-claude-config/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A comprehensive Python SDK for the **Candlefish Claude Configuration System v2.0**. Manage Claude Code configurations, integrate AI-powered development workflows, and access real-time configuration events across enterprise environments.

🌟 **Powered by [Candlefish AI](https://candlefish.ai)** - Advanced AI orchestration platform.

## Features

- **Configuration Management**: Create, read, update, and delete configuration profiles
- **Multi-tier Authentication**: Support for API Keys and OAuth2 flows  
- **Real-time Events**: WebSocket client for live configuration updates
- **Enterprise Ready**: Rate limiting, retry logic, and comprehensive error handling
- **Type Safety**: Full type hints and Pydantic model validation
- **Async Support**: WebSocket client with async/await patterns
- **Production Grade**: Extensive logging, monitoring, and debugging support

## Installation

```bash
# Install from PyPI
pip install candlefish-claude-config

# Install with development dependencies
pip install candlefish-claude-config[dev]

# Install with documentation dependencies  
pip install candlefish-claude-config[docs]
```

## Quick Start

### API Key Authentication

```python
from candlefish_claude_config import CandlefishClaudeConfigClient

# Initialize with API key
client = CandlefishClaudeConfigClient(api_key="your-api-key", tier="Pro")

# Check API health
if client.health_check():
    print("✅ API is healthy")

# List all configuration profiles
profiles = client.list_profiles()
print(f"Found {len(profiles)} configuration profiles")
```

### Create and Manage Profiles

```python
from candlefish_claude_config import ConfigProfile

# Create a new configuration profile
profile = ConfigProfile(
    name="Enterprise DevOps Config",
    description="Standardized configuration for DevOps teams",
    settings={
        "languages": ["python", "typescript", "go"],
        "tools": ["poetry", "pnpm", "docker"],
        "deployment": {
            "platform": "kubernetes",
            "environment": "production"
        }
    },
    metadata={
        "team": "platform-engineering",
        "contact": "devops@company.com"
    }
)

# Create the profile
created_profile = client.create_profile(profile)
print(f"Created profile: {created_profile.profile_id}")

# Retrieve and update
retrieved = client.get_profile(created_profile.profile_id)
retrieved.settings["monitoring"] = {"enabled": True, "provider": "prometheus"}

updated_profile = client.update_profile(retrieved)
print(f"Updated profile version: {updated_profile.version}")
```

### OAuth2 Authentication

```python
from candlefish_claude_config import CandlefishClaudeConfigClient, OAuth2Auth

# Set up OAuth2 authentication
oauth = OAuth2Auth(
    client_id="your-client-id",
    client_secret="your-client-secret",
    scopes=["read:config", "write:config"]
)

# Get authorization URL
auth_url = oauth.get_authorization_url(
    redirect_uri="https://your-app.com/callback",
    state="random-state-string"
)
print(f"Visit: {auth_url}")

# After user authorizes, exchange code for token
oauth.exchange_code_for_token(
    code="authorization-code-from-callback",
    redirect_uri="https://your-app.com/callback"
)

# Use with client
client = CandlefishClaudeConfigClient(auth=oauth)
```

### Real-time Configuration Events

```python
import asyncio
from candlefish_claude_config import CandlefishClaudeConfigClient

async def monitor_config_changes():
    client = CandlefishClaudeConfigClient(api_key="your-api-key")
    ws_client = client.get_websocket_client()
    
    # Set up event handlers
    async def handle_config_update(event):
        print(f"🔄 Config updated: {event.payload.get('profile_name')}")
    
    async def handle_config_created(event):
        print(f"✨ New config created: {event.payload.get('profile_id')}")
    
    # Register handlers
    ws_client.on_event("config.updated", handle_config_update)
    ws_client.on_event("config.created", handle_config_created)
    
    # Connect and listen
    async with ws_client:
        print("🔌 Connected to WebSocket")
        async for event in ws_client.listen_for_events():
            print(f"📡 Event: {event.event_type} at {event.timestamp}")

# Run the monitor
asyncio.run(monitor_config_changes())
```

### Analytics and Monitoring

```python
# Get usage analytics
analytics = client.get_analytics(
    start_date="2024-01-01T00:00:00Z",
    end_date="2024-01-31T23:59:59Z"
)

print(f"Total API calls: {analytics.get('total_requests', 0)}")
print(f"Most used profile: {analytics.get('top_profile', 'N/A')}")

# Check rate limiting status
rate_limit = client.get_rate_limit_status()
if rate_limit:
    print(f"Rate limit tier: {rate_limit.tier}")
    print(f"Requests remaining: {rate_limit.remaining}/{rate_limit.requests_per_minute}")
```

### Error Handling

```python
from candlefish_claude_config import (
    CandlefishClaudeConfigClient,
    ValidationError,
    NotFoundError,
    RateLimitError,
    AuthenticationError
)

client = CandlefishClaudeConfigClient(api_key="your-api-key")

try:
    # This might fail
    profile = client.get_profile("non-existent-profile")
    
except NotFoundError as e:
    print(f"Profile not found: {e}")
    
except ValidationError as e:
    print(f"Validation failed: {e}")
    print(f"Errors: {e.validation_errors}")
    
except RateLimitError as e:
    print(f"Rate limited: {e}")
    if e.retry_after:
        print(f"Retry after: {e.retry_after} seconds")
        
except AuthenticationError as e:
    print(f"Authentication failed: {e}")
    
except Exception as e:
    print(f"Unexpected error: {e}")
```

## Advanced Usage

### Custom Configuration

```python
from candlefish_claude_config import CandlefishClaudeConfigClient

# Configure with custom settings
client = CandlefishClaudeConfigClient(
    api_key="your-api-key",
    base_url="https://staging-api.candlefish.ai/v2.0",  # Use staging
    timeout=60.0,  # 60 second timeout
    max_retries=5   # Retry failed requests up to 5 times
)

# Check API version
version_info = client.get_api_version()
print(f"API Version: {version_info.get('version')}")
print(f"Features: {version_info.get('features', [])}")
```

### Batch Operations

```python
# Create multiple profiles efficiently
profiles_to_create = [
    ConfigProfile(name="Dev Config", settings={"env": "development"}),
    ConfigProfile(name="Staging Config", settings={"env": "staging"}),
    ConfigProfile(name="Prod Config", settings={"env": "production"})
]

created_profiles = []
for profile in profiles_to_create:
    try:
        created = client.create_profile(profile)
        created_profiles.append(created)
        print(f"✅ Created: {created.name}")
    except Exception as e:
        print(f"❌ Failed to create {profile.name}: {e}")

print(f"Successfully created {len(created_profiles)} profiles")
```

### Profile Validation

```python
from candlefish_claude_config import ConfigProfile
from pydantic import ValidationError

try:
    # This will raise validation error
    invalid_profile = ConfigProfile(
        name="",  # Empty name - invalid
        version="invalid-version"  # Invalid semver format
    )
except ValidationError as e:
    print("Validation errors:")
    for error in e.errors():
        print(f"- {error['loc'][0]}: {error['msg']}")
```

## Service Tiers

The SDK supports three service tiers with different rate limits and features:

| Tier | Requests/min | Max Profiles | Features |
|------|--------------|--------------|----------|
| **Free** | 10 | 3 | Basic configuration management |
| **Pro** | 100 | 25 | WebSocket events, analytics |
| **Enterprise** | 1000 | 250 | Advanced access controls, audit logging, multi-tenant |

```python
# Specify tier when initializing
client = CandlefishClaudeConfigClient(api_key="your-key", tier="Enterprise")
```

## Development

### Setup Development Environment

```bash
# Clone the repository
git clone https://github.com/candlefish/claude-config-python
cd claude-config-python

# Install in development mode
pip install -e ".[dev]"

# Run tests
pytest

# Run tests with coverage
pytest --cov=candlefish_claude_config

# Format code
black candlefish_claude_config/
isort candlefish_claude_config/

# Type checking
mypy candlefish_claude_config/
```

### Running Tests

```bash
# Run all tests
pytest

# Run with verbose output
pytest -v

# Run specific test file
pytest tests/test_client.py

# Run async tests only
pytest -k "async"

# Generate coverage report
pytest --cov=candlefish_claude_config --cov-report=html
```

## API Reference

### Classes

- **`CandlefishClaudeConfigClient`**: Main client class for API interactions
- **`ConfigProfile`**: Configuration profile model with validation
- **`APIKeyAuth`**: API key authentication handler  
- **`OAuth2Auth`**: OAuth2 authentication flow handler
- **`WebSocketClient`**: Real-time event streaming client

### Exceptions

- **`CandlefishConfigException`**: Base exception for all SDK errors
- **`AuthenticationError`**: Authentication and authorization failures
- **`ValidationError`**: Data validation errors
- **`NotFoundError`**: Resource not found errors
- **`RateLimitError`**: Rate limiting errors
- **`NetworkError`**: Network connectivity issues
- **`WebSocketError`**: WebSocket connection/communication errors

## Migration from v1.x

The v2.0 SDK includes breaking changes. See our [Migration Guide](https://docs.candlefish.ai/sdks/python/migration) for detailed upgrade instructions.

Key changes:
- Authentication now uses dedicated `Auth` classes
- WebSocket client is separate from main client
- Enhanced error handling with specific exception types
- Pydantic v2 models for better validation

## Contributing

We welcome contributions! Please see our [Contributing Guide](https://github.com/candlefish/claude-config-python/blob/main/CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## Support

- 📚 **Documentation**: [docs.candlefish.ai/sdks/python](https://docs.candlefish.ai/sdks/python)
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/candlefish/claude-config-python/issues)
- 💬 **Community**: [Discord Server](https://discord.gg/candlefish)
- 📧 **Enterprise Support**: [devops@candlefish.ai](mailto:devops@candlefish.ai)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Changelog

See [CHANGELOG.md](https://github.com/candlefish/claude-config-python/blob/main/CHANGELOG.md) for version history and changes.

---

**Built with ❤️ by the [Candlefish AI](https://candlefish.ai) team**

*Candlefish AI powers advanced AI orchestration and development workflows for modern enterprises. Learn more at [candlefish.ai](https://candlefish.ai).*
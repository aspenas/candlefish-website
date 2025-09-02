# Changelog

All notable changes to the Candlefish Claude Config Python SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2024-01-15

### Added
- 🎉 **Initial release** of Candlefish Claude Config Python SDK v2.0
- **Configuration Management**: Full CRUD operations for configuration profiles
- **Multi-tier Authentication**: API Key and OAuth2 authentication support
- **Real-time Events**: WebSocket client for live configuration updates
- **Type Safety**: Complete type hints and Pydantic model validation
- **Enterprise Features**: Rate limiting, retry logic, comprehensive error handling
- **Analytics**: Usage analytics and monitoring capabilities
- **Async Support**: WebSocket client with async/await patterns
- **Production Ready**: Extensive logging, debugging, and monitoring support

### Configuration Management
- `CandlefishClaudeConfigClient`: Main SDK client class
- `ConfigProfile` model with full validation
- Methods: `list_profiles()`, `get_profile()`, `create_profile()`, `update_profile()`, `delete_profile()`

### Authentication
- `APIKeyAuth`: Simple API key authentication
- `OAuth2Auth`: Full OAuth2 authorization code flow with token refresh
- Automatic token refresh for expired OAuth2 tokens
- Support for Free, Pro, and Enterprise service tiers

### WebSocket Support
- `WebSocketClient`: Real-time event streaming
- Event handlers for configuration changes
- Automatic reconnection with exponential backoff
- Connection management with context manager support

### Models & Validation
- `ConfigProfile`: Configuration profile with Pydantic validation
- `ConfigValidationError`: Structured validation error handling
- `WebSocketEvent`: Real-time event data structures
- `APIResponse`: Consistent API response wrapper
- `RateLimit`: Rate limiting information and status

### Exception Handling
- Comprehensive exception hierarchy
- Specific exceptions: `AuthenticationError`, `ValidationError`, `NotFoundError`, `RateLimitError`
- Network error handling with retry strategies
- WebSocket-specific error handling

### Developer Experience
- Comprehensive documentation and examples
- 90%+ test coverage with pytest
- Type hints throughout the codebase
- Code formatting with Black and isort
- Static analysis with mypy

### Service Tier Support
- **Free Tier**: 10 req/min, 3 profiles max
- **Pro Tier**: 100 req/min, 25 profiles max, WebSocket events, analytics  
- **Enterprise Tier**: 1000 req/min, 250 profiles max, advanced features

### Dependencies
- `requests>=2.31.0`: HTTP client
- `pydantic>=2.0.0`: Data validation and serialization
- `websockets>=11.0.0`: WebSocket client support
- `typing-extensions>=4.5.0`: Enhanced type hints
- `python-dateutil>=2.8.0`: Date/time utilities
- `urllib3>=1.26.0`: HTTP library foundation

### Development Tools
- `pytest>=7.0.0`: Testing framework
- `pytest-asyncio>=0.21.0`: Async testing support
- `pytest-cov>=4.0.0`: Coverage reporting
- `black>=23.0.0`: Code formatting
- `isort>=5.12.0`: Import sorting
- `mypy>=1.0.0`: Static type checking
- `flake8>=6.0.0`: Linting

---

## Roadmap

### Upcoming Features
- **v2.1.0**: Enhanced analytics dashboard integration
- **v2.2.0**: Bulk operations and batch processing
- **v2.3.0**: Configuration templates and inheritance
- **v3.0.0**: GraphQL API support and advanced querying

### Migration from v1.x
This is the first major release (v2.0.0). For users migrating from the legacy v1.x SDK:

- Authentication now uses dedicated `Auth` classes instead of simple string parameters
- WebSocket client is separate from the main client for better separation of concerns
- Enhanced error handling with specific exception types for different failure modes
- Pydantic v2 models provide better validation and serialization
- Async patterns are now supported for WebSocket operations

---

**Built with ❤️ by the [Candlefish AI](https://candlefish.ai) team**

For support, visit [docs.candlefish.ai](https://docs.candlefish.ai) or contact [devops@candlefish.ai](mailto:devops@candlefish.ai)
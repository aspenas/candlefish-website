# Changelog

All notable changes to the `@candlefish/claude-config` SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2024-01-XX

### 🎉 Initial Release

#### ✨ Added
- Complete TypeScript SDK for Candlefish Claude Config API
- Full type definitions for all API operations
- Multiple authentication methods (API Key, OAuth2, Bearer)
- Real-time WebSocket integration for live configuration updates
- React hooks for seamless React integration
- Comprehensive utility functions for configuration management
- Built-in error handling with custom error types
- Automatic retry logic with exponential backoff
- Support for CommonJS and ESM modules
- Enterprise-grade security features
- Performance monitoring and analytics integration
- Multi-tier service support (Free, Pro, Enterprise)

#### 🔧 Features
- **Client Operations**:
  - List, create, update, delete configuration profiles
  - Advanced filtering and pagination support
  - Profile validation and sanitization
  - Health check and version information endpoints

- **Authentication**:
  - API key authentication
  - OAuth2 flow with automatic token refresh
  - Bearer token support
  - Secure credential management

- **Real-time Updates**:
  - WebSocket connection management
  - Event-driven configuration updates
  - Automatic reconnection with exponential backoff
  - Connection state monitoring

- **React Integration**:
  - `useConfigProfile` hook for single profile management
  - `useConfigProfiles` hook for multi-profile operations
  - `useConfigWebSocket` hook for real-time connections
  - `useConfigHealth` hook for API health monitoring
  - Provider component for client context

- **Utilities**:
  - Profile validation and sanitization
  - Semantic version comparison
  - Configuration merging
  - Error formatting
  - Debounce and throttle functions
  - Rate limit compliance checking

#### 🛡️ Security
- Input sanitization for XSS prevention
- Secure credential storage
- Rate limiting compliance
- Enterprise access controls
- Audit logging support (Enterprise tier)

#### 📦 Package Features
- Universal module support (CommonJS + ESM)
- Tree-shakable exports
- TypeScript declaration files
- React peer dependencies (optional)
- Comprehensive test coverage
- Full documentation with examples
- SEO-optimized package metadata

#### 🌐 Service Tiers
- **Free Tier**: 10 requests/minute, 3 max profiles
- **Pro Tier**: 100 requests/minute, 25 max profiles
- **Enterprise Tier**: 1000 requests/minute, 250 max profiles, advanced features

### 📚 Documentation
- Complete API reference
- React integration examples
- Authentication guides
- Error handling best practices
- Performance optimization tips
- Enterprise feature documentation

### 🔗 Links
- Homepage: https://candlefish.ai
- Repository: https://github.com/candlefish-ai/claude-config
- API Documentation: https://docs.candlefish.ai/api/v2.0
- Enterprise: https://candlefish.ai/enterprise

---

**Built with ❤️ by [Candlefish AI](https://candlefish.ai)**
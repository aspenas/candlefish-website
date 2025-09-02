# @candlefish/claude-config

[![npm version](https://badge.fury.io/js/%40candlefish%2Fclaude-config.svg)](https://badge.fury.io/js/%40candlefish%2Fclaude-config)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://github.com/candlefish-ai/claude-config/workflows/CI/badge.svg)](https://github.com/candlefish-ai/claude-config/actions)

Official TypeScript SDK for the **Candlefish Claude Config API** - Enterprise-grade configuration management for AI-powered development workflows.

> **🚀 Built by [Candlefish AI](https://candlefish.ai)** - Powering the next generation of AI-driven development tools.

## ✨ Features

- 🔧 **Complete Configuration Management** - Create, update, delete, and manage Claude Code profiles
- 🔐 **Multiple Authentication Methods** - API Key, OAuth2, and Bearer token support
- ⚡ **Real-time Updates** - WebSocket integration for live configuration changes
- 🎣 **React Hooks** - Purpose-built hooks for React applications
- 📱 **Universal Support** - Works in Node.js, browsers, and React Native
- 🛡️ **Type Safety** - Full TypeScript support with comprehensive type definitions
- 🔄 **Auto Retry** - Built-in exponential backoff and error handling
- 📊 **Analytics Ready** - Performance monitoring and usage tracking
- 🎯 **Enterprise Ready** - Multi-tenant support with granular access controls

## 📦 Installation

```bash
npm install @candlefish/claude-config
```

```bash
yarn add @candlefish/claude-config
```

```bash
pnpm add @candlefish/claude-config
```

## 🚀 Quick Start

### Basic Usage

```typescript
import { createClientWithApiKey } from '@candlefish/claude-config';

// Initialize client with API key
const client = createClientWithApiKey('your-api-key-here');

// Create a configuration profile
const profile = await client.createProfile({
  name: 'Enterprise DevOps Profile',
  version: '2.0.0',
  description: 'Production-ready configuration for enterprise development',
  settings: {
    languages: ['typescript', 'python', 'go'],
    tools: ['pnpm', 'poetry', 'docker'],
    environment: {
      NODE_ENV: 'production',
      DEBUG: false
    },
    models: {
      primary: 'claude-3-sonnet',
      fallback: ['claude-3-haiku'],
      routing: {
        strategy: 'load-based',
        fallback: 'queue'
      }
    }
  }
});

console.log('Created profile:', profile.profile_id);
```

### OAuth2 Authentication

```typescript
import { createClientWithOAuth2 } from '@candlefish/claude-config';

const client = createClientWithOAuth2(
  'your-access-token',
  'your-refresh-token',
  Date.now() + 3600000 // expires in 1 hour
);

// Auto-refresh tokens when they expire
if (client.areCredentialsExpired()) {
  await client.refreshToken();
}
```

### Real-time WebSocket Updates

```typescript
import { createClientWithApiKey } from '@candlefish/claude-config';

const client = createClientWithApiKey('your-api-key');

// Connect to real-time configuration events
const ws = client.connectToConfigEvents({
  onMessage: (event) => {
    console.log('Configuration updated:', event);
    
    if (event.event_type === 'profile_updated') {
      console.log('Profile updated:', event.payload.profile_id);
    }
  },
  onError: (error) => {
    console.error('WebSocket error:', error);
  },
  onClose: () => {
    console.log('WebSocket connection closed');
  }
});

// Disconnect when done
client.disconnectWebSocket();
```

## ⚛️ React Integration

### Provider Setup

```typescript
import React from 'react';
import { ConfigClientProvider, createClientWithApiKey } from '@candlefish/claude-config';

const client = createClientWithApiKey(process.env.REACT_APP_CANDLEFISH_API_KEY!);

function App() {
  return (
    <ConfigClientProvider client={client}>
      <ConfigDashboard />
    </ConfigClientProvider>
  );
}
```

### Using React Hooks

```typescript
import React from 'react';
import { useConfigProfile, useConfigProfiles } from '@candlefish/claude-config';

function ConfigDashboard() {
  // Manage multiple profiles with real-time updates
  const {
    profiles,
    loading,
    error,
    createProfile,
    updateProfile,
    deleteProfile
  } = useConfigProfiles({ realtime: true });

  // Manage a single profile
  const {
    profile,
    loading: profileLoading
  } = useConfigProfile('profile-123', { realtime: true });

  const handleCreateProfile = async () => {
    try {
      await createProfile({
        name: 'New Development Profile',
        version: '1.0.0',
        settings: {
          languages: ['typescript', 'react'],
          tools: ['vite', 'tailwindcss']
        }
      });
    } catch (error) {
      console.error('Failed to create profile:', error);
    }
  };

  if (loading) return <div>Loading profiles...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>Configuration Profiles</h1>
      <button onClick={handleCreateProfile}>
        Create New Profile
      </button>
      
      {profiles.map(profile => (
        <div key={profile.profile_id}>
          <h3>{profile.name}</h3>
          <p>Version: {profile.version}</p>
          <button onClick={() => deleteProfile(profile.profile_id!)}>
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
```

## 🔧 Advanced Configuration

### Custom Client Configuration

```typescript
import { CandlefishConfigClient, AuthMethod, ServiceTier } from '@candlefish/claude-config';

const client = new CandlefishConfigClient(
  {
    method: AuthMethod.APIKey,
    apiKey: 'your-api-key'
  },
  {
    baseURL: 'https://api.candlefish.ai/v2.0',
    tier: ServiceTier.Enterprise,
    timeout: 30000,
    retry: {
      max_attempts: 5,
      base_delay_ms: 1000,
      max_delay_ms: 10000,
      backoff_multiplier: 2
    },
    headers: {
      'X-Custom-Header': 'value'
    }
  }
);
```

### Profile Management

```typescript
// List profiles with filtering
const profiles = await client.listProfiles({
  limit: 10,
  offset: 0,
  name_filter: 'production',
  tags: ['enterprise', 'typescript'],
  sort_by: 'created_at',
  sort_order: 'desc'
});

// Create profile with comprehensive settings
const profile = await client.createProfile({
  name: 'Production API Configuration',
  version: '2.1.0',
  description: 'High-performance production setup',
  settings: {
    languages: ['typescript', 'python'],
    tools: ['pnpm', 'docker', 'kubernetes'],
    environment: {
      NODE_ENV: 'production',
      LOG_LEVEL: 'info'
    },
    models: {
      primary: 'claude-3-opus',
      fallback: ['claude-3-sonnet', 'claude-3-haiku'],
      routing: {
        strategy: 'priority',
        rules: [
          {
            condition: 'request.complexity > 0.8',
            target: 'claude-3-opus',
            priority: 10
          },
          {
            condition: 'request.complexity <= 0.8',
            target: 'claude-3-sonnet',
            priority: 5
          }
        ]
      }
    },
    security: {
      rate_limits: {
        requests_per_minute: 1000,
        concurrent_requests: 50
      },
      oauth2: {
        scopes: ['read:config', 'write:config'],
        refresh_token_ttl: 7200
      }
    },
    performance: {
      timeout_ms: 30000,
      connection_pool: {
        max_connections: 100,
        idle_timeout_ms: 60000
      },
      caching: {
        enabled: true,
        ttl_seconds: 300
      }
    }
  },
  metadata: {
    tags: ['production', 'api', 'enterprise'],
    owner: 'devops@company.com'
  }
});
```

## 🛠️ Utility Functions

```typescript
import {
  validateProfile,
  isValidSemVer,
  compareSemVer,
  mergeConfigs,
  sanitizeProfile,
  formatError
} from '@candlefish/claude-config';

// Validate profile before submission
const validation = validateProfile(profile);
if (validation) {
  console.error('Validation error:', formatError(validation));
}

// Version comparison
if (compareSemVer('2.1.0', '2.0.0') > 0) {
  console.log('Version 2.1.0 is newer');
}

// Merge configurations safely
const mergedConfig = mergeConfigs(baseConfig, userConfig);

// Sanitize profile for sharing
const shareableProfile = profileToShareable(profile);
```

## 📊 Error Handling

The SDK provides comprehensive error handling with detailed error information:

```typescript
import { CandlefishConfigError } from '@candlefish/claude-config';

try {
  await client.createProfile(invalidProfile);
} catch (error) {
  if (error instanceof CandlefishConfigError) {
    console.error('Error code:', error.code);
    console.error('Message:', error.message);
    console.error('Details:', error.details);
    console.error('Status code:', error.statusCode);
    
    if (error.code === 'VALIDATION_ERROR') {
      // Handle validation errors
      error.details?.forEach(detail => {
        console.log('Validation issue:', detail);
      });
    }
  }
}
```

## 🔒 Security & Authentication

### API Key Authentication

```typescript
const client = createClientWithApiKey('your-api-key');
```

### OAuth2 Flow

```typescript
// Initial OAuth2 setup
const client = createClientWithOAuth2(
  accessToken,
  refreshToken,
  expiresAt
);

// Auto-refresh tokens
setInterval(async () => {
  if (client.areCredentialsExpired()) {
    try {
      await client.refreshToken();
      console.log('Tokens refreshed successfully');
    } catch (error) {
      console.error('Token refresh failed:', error);
    }
  }
}, 60000); // Check every minute
```

## 📈 Performance Monitoring

```typescript
import { useConfigHealth } from '@candlefish/claude-config';

function HealthMonitor() {
  const { health, loading, error, refetch } = useConfigHealth();

  useEffect(() => {
    const interval = setInterval(refetch, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [refetch]);

  return (
    <div>
      <h3>API Health</h3>
      {loading && <p>Checking health...</p>}
      {error && <p>Health check failed: {error.message}</p>}
      {health && (
        <div>
          <p>Status: {health.status}</p>
          <p>Last Check: {health.timestamp}</p>
        </div>
      )}
    </div>
  );
}
```

## 🌐 Service Tiers

The SDK supports multiple service tiers with different rate limits and features:

```typescript
import { ServiceTier } from '@candlefish/claude-config';

// Free Tier: 10 requests/minute, 3 max profiles
const freeClient = createClientWithApiKey('key', {
  tier: ServiceTier.Free
});

// Pro Tier: 100 requests/minute, 25 max profiles
const proClient = createClientWithApiKey('key', {
  tier: ServiceTier.Pro
});

// Enterprise Tier: 1000 requests/minute, 250 max profiles
const enterpriseClient = createClientWithApiKey('key', {
  tier: ServiceTier.Enterprise
});
```

## 🧪 Testing

The SDK includes comprehensive test utilities:

```typescript
// Mock client for testing
import { jest } from '@jest/globals';

const mockClient = {
  listProfiles: jest.fn().mockResolvedValue([]),
  createProfile: jest.fn().mockResolvedValue({ profile_id: 'test-123' }),
  updateProfile: jest.fn().mockResolvedValue({ profile_id: 'test-123' }),
  deleteProfile: jest.fn().mockResolvedValue(undefined)
};

// Test your components
test('should create profile', async () => {
  const profile = await mockClient.createProfile({
    name: 'Test Profile',
    version: '1.0.0'
  });
  
  expect(profile.profile_id).toBe('test-123');
});
```

## 📚 API Reference

### Client Methods

- `listProfiles(query?: ListProfilesQuery): Promise<ConfigProfile[]>`
- `createProfile(profile: Omit<ConfigProfile, 'profile_id'>): Promise<ConfigProfile>`
- `getProfile(profileId: string): Promise<ConfigProfile>`
- `updateProfile(profile: ConfigProfile): Promise<ConfigProfile>`
- `deleteProfile(profileId: string): Promise<void>`
- `connectToConfigEvents(handlers: WebSocketEventHandlers): WebSocket`
- `disconnectWebSocket(): void`
- `healthCheck(): Promise<{ status: string; timestamp: string }>`
- `refreshToken(): Promise<AuthCredentials>`

### React Hooks

- `useConfigProfile(profileId?, options?): UseConfigProfileReturn`
- `useConfigProfiles(options?): UseConfigProfilesReturn`
- `useConfigWebSocket(handlers): WebSocketHookReturn`
- `useConfigHealth(): HealthHookReturn`

### Utility Functions

- `validateProfile(profile): ConfigValidationError | null`
- `isValidSemVer(version): boolean`
- `compareSemVer(v1, v2): number`
- `mergeConfigs(target, source): T`
- `sanitizeProfile(profile): ConfigProfile`
- `generateProfileId(prefix?): string`
- `formatError(error): string`
- `profileToShareable(profile): Partial<ConfigProfile>`

## 🔗 Related Links

- **[Candlefish AI Homepage](https://candlefish.ai)** - Learn more about our AI-powered development platform
- **[GitHub Repository](https://github.com/candlefish-ai/claude-config)** - Source code and issues
- **[API Documentation](https://docs.candlefish.ai/api/v2.0)** - Complete API reference
- **[Enterprise Solutions](https://candlefish.ai/enterprise)** - Enterprise features and pricing
- **[Developer Support](https://candlefish.ai/support)** - Get help and support

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](https://github.com/candlefish-ai/claude-config/blob/main/CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/candlefish-ai/claude-config/blob/main/LICENSE) file for details.

## 🏢 Enterprise Support

For enterprise customers, we provide:

- ✅ **Priority Support** - Dedicated support channels
- ✅ **Custom Integrations** - Tailored solutions for your workflow
- ✅ **SLA Guarantees** - 99.9% uptime commitment
- ✅ **Advanced Security** - SOC2, HIPAA compliance options
- ✅ **On-premises Deployment** - Private cloud and on-premises options

**[Contact our Enterprise team →](https://candlefish.ai/enterprise)**

---

<div align="center">

**Built with ❤️ by [Candlefish AI](https://candlefish.ai)**

[Website](https://candlefish.ai) • [Documentation](https://docs.candlefish.ai) • [GitHub](https://github.com/candlefish-ai) • [Enterprise](https://candlefish.ai/enterprise)

</div>
# @candlefish/jwt-auth

Shared JWT authentication library for all Candlefish services. Provides consistent JWT signing, verification, and middleware across the entire ecosystem.

## Installation

```bash
npm install @candlefish/jwt-auth
```

## Features

- 🔐 RS256 JWT signing and verification
- 🔑 AWS Secrets Manager integration
- 🌐 JWKS endpoint support
- 🚀 Express/Next.js middleware
- 🔄 Token refresh functionality
- 🏢 Service-to-service authentication
- 💾 Built-in caching for performance
- 🛡️ Role and permission-based access control

## Quick Start

### Basic Usage

```typescript
import { CandlefishAuth } from '@candlefish/jwt-auth';

const auth = new CandlefishAuth({
  secretId: 'candlefish/production/jwt/signing-key',
  issuer: 'auth.candlefish.ai',
  audience: 'api.candlefish.ai',
  region: 'us-east-1'
});

// Sign a token
const token = await auth.signToken({
  sub: 'user123',
  email: 'user@example.com',
  role: 'admin',
  permissions: ['read', 'write']
});

// Verify a token
const payload = await auth.verifyToken(token);
console.log(payload); // { sub: 'user123', email: 'user@example.com', ... }
```

### Express Middleware

```typescript
import express from 'express';
import { CandlefishAuth, AuthMiddleware } from '@candlefish/jwt-auth';

const app = express();

const auth = new CandlefishAuth({
  jwksUrl: 'https://auth.candlefish.ai/.well-known/jwks.json',
  issuer: 'auth.candlefish.ai',
  audience: 'api.candlefish.ai'
});

const authMiddleware = new AuthMiddleware(auth);

// Protect all routes
app.use('/api/*', authMiddleware.middleware());

// Role-based protection
app.get('/admin/*', authMiddleware.requireRole('admin'));

// Permission-based protection
app.post('/api/users', authMiddleware.requirePermission('users:write'));

// Optional authentication
app.get('/api/public', authMiddleware.optional(), (req, res) => {
  if (req.user) {
    res.json({ message: `Hello ${req.user.email}` });
  } else {
    res.json({ message: 'Hello anonymous' });
  }
});
```

### Service-to-Service Authentication

```typescript
import { CandlefishAuth, ServiceAuth } from '@candlefish/jwt-auth';

const auth = new CandlefishAuth({
  secretId: 'candlefish/production/jwt/signing-key',
  issuer: 'auth.candlefish.ai'
});

const serviceAuth = new ServiceAuth(auth, {
  serviceId: 'payment-service',
  serviceKey: process.env.SERVICE_KEY,
  scope: ['orders:read', 'payments:write']
});

// Make authenticated request to another service
const response = await serviceAuth.post(
  'https://api.candlefish.ai/orders',
  { amount: 100, currency: 'USD' }
);

// Verify incoming service token
app.use('/service/*', serviceAuth.serviceMiddleware());
```

### Token Refresh

```typescript
// Generate refresh token
const refreshToken = await auth.generateRefreshToken('user123');

// Use refresh token to get new token pair
const { accessToken, refreshToken: newRefreshToken } = await auth.refreshToken(refreshToken);
```

### JWKS Endpoint

```typescript
// Serve JWKS endpoint for other services
app.get('/.well-known/jwks.json', async (req, res) => {
  const jwks = await auth.getPublicKeys();
  res.json(jwks);
});
```

## Configuration

### CandlefishAuth Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `secretId` | string | AWS Secrets Manager secret ID for private key | - |
| `jwksUrl` | string | URL to fetch public keys for verification | - |
| `issuer` | string | Token issuer | `'candlefish.ai'` |
| `audience` | string \| string[] | Token audience | - |
| `region` | string | AWS region | `'us-east-1'` |
| `expiresIn` | string \| number | Access token expiry | `'24h'` |
| `refreshExpiresIn` | string \| number | Refresh token expiry | `'7d'` |
| `cacheTimeout` | number | Cache TTL in seconds | `600` |

### Middleware Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `required` | boolean | Whether authentication is required | `true` |
| `roles` | string[] | Required roles | `[]` |
| `permissions` | string[] | Required permissions | `[]` |
| `scope` | string[] | Required scopes | `[]` |
| `credentialsRequired` | boolean | Whether credentials are required | `true` |
| `onError` | function | Custom error handler | - |

## AWS Secrets Manager Setup

Store your JWT keys in AWS Secrets Manager:

```bash
# Store private key
aws secretsmanager create-secret \
  --name "candlefish/production/jwt/signing-key" \
  --secret-string '{"kty":"RSA","kid":"...", ...}'

# Store public keys
aws secretsmanager create-secret \
  --name "candlefish/production/jwt/public-keys" \
  --secret-string '{"key-id-1": {"kty":"RSA", ...}}'
```

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Examples

### Complete Authentication Flow

```typescript
// 1. Login endpoint
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  // Validate credentials
  const user = await validateUser(email, password);
  
  // Generate tokens
  const accessToken = await auth.signToken({
    sub: user.id,
    email: user.email,
    role: user.role
  });
  
  const refreshToken = await auth.generateRefreshToken(user.id);
  
  res.json({ accessToken, refreshToken });
});

// 2. Refresh endpoint
app.post('/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  const tokens = await auth.refreshToken(refreshToken);
  res.json(tokens);
});

// 3. Protected endpoint
app.get('/api/profile', authMiddleware.middleware(), (req, res) => {
  res.json({ user: req.user });
});
```

### Custom Error Handling

```typescript
const customErrorHandler = (error, req, res) => {
  console.error('Auth error:', error);
  
  if (error.message.includes('expired')) {
    res.status(401).json({
      error: 'TOKEN_EXPIRED',
      message: 'Your session has expired. Please login again.'
    });
  } else {
    res.status(401).json({
      error: 'AUTH_ERROR',
      message: 'Authentication failed'
    });
  }
};

app.use(authMiddleware.middleware({
  onError: customErrorHandler
}));
```

## License

MIT

## Support

For issues and questions, please open an issue on GitHub or contact the Candlefish team.
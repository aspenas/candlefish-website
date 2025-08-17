# JWT Implementation Plan for Candlefish

## 🎯 Implementation Strategy

### Phase 1: Shared JWT Infrastructure

#### 1.1 Create NPM Package: `@candlefish/jwt-auth`
A shared library for all Candlefish services to handle JWT operations consistently.

```typescript
// packages/jwt-auth/src/index.ts
export class CandlefishAuth {
  private jwksUrl: string;
  private issuer: string;
  private secretId: string;
  
  // Sign tokens
  async signToken(payload: TokenPayload): Promise<string>
  
  // Verify tokens
  async verifyToken(token: string): Promise<TokenPayload>
  
  // Refresh tokens
  async refreshToken(refreshToken: string): Promise<TokenPair>
  
  // Middleware for Express/Next.js
  middleware(options?: MiddlewareOptions): RequestHandler
  
  // WebSocket authentication
  wsAuth(socket: Socket): Promise<boolean>
}
```

#### 1.2 Centralized Key Management
```yaml
# AWS Secrets Manager Structure
candlefish/
├── global/
│   ├── jwt/
│   │   ├── signing-key        # Master signing key
│   │   └── public-keys        # All public keys
├── production/
│   ├── auth-service/
│   │   └── jwt-keys
│   ├── api-gateway/
│   │   └── jwt-keys
│   └── [service-name]/
│       └── jwt-keys
└── staging/
    └── [same structure]
```

### Phase 2: Service Implementation

#### 2.1 Auth Service (Primary)
Create a centralized authentication service that all other services use.

```javascript
// services/auth-service/server.js
const express = require('express');
const { CandlefishAuth } = require('@candlefish/jwt-auth');

const app = express();
const auth = new CandlefishAuth({
  secretId: 'candlefish/global/jwt/signing-key',
  issuer: 'auth.candlefish.ai',
  audience: ['*.candlefish.ai']
});

// Login endpoint
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  // Validate credentials
  const user = await validateUser(email, password);
  
  // Generate tokens
  const accessToken = await auth.signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    permissions: user.permissions
  });
  
  const refreshToken = await auth.generateRefreshToken(user.id);
  
  res.json({ accessToken, refreshToken });
});

// Token refresh endpoint
app.post('/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  const tokens = await auth.refreshToken(refreshToken);
  res.json(tokens);
});

// JWKS endpoint
app.get('/.well-known/jwks.json', async (req, res) => {
  const jwks = await auth.getPublicKeys();
  res.json(jwks);
});

// Verify endpoint (for service-to-service)
app.post('/auth/verify', auth.middleware(), (req, res) => {
  res.json({ valid: true, user: req.user });
});
```

#### 2.2 API Gateway Integration
```javascript
// api-gateway/middleware/auth.js
const { CandlefishAuth } = require('@candlefish/jwt-auth');

const auth = new CandlefishAuth({
  jwksUrl: 'https://auth.candlefish.ai/.well-known/jwks.json',
  issuer: 'auth.candlefish.ai',
  audience: 'api.candlefish.ai'
});

// Apply to all protected routes
app.use('/api/*', auth.middleware({
  required: true,
  roles: ['user', 'admin'],
  onError: (err, req, res) => {
    res.status(401).json({ error: 'Unauthorized' });
  }
}));
```

#### 2.3 Microservices Authentication
```javascript
// services/[service-name]/auth.js
class ServiceAuth {
  constructor() {
    this.auth = new CandlefishAuth({
      jwksUrl: 'https://auth.candlefish.ai/.well-known/jwks.json',
      serviceAccount: {
        id: process.env.SERVICE_ID,
        key: process.env.SERVICE_KEY
      }
    });
  }
  
  // Service-to-service authentication
  async getServiceToken() {
    return this.auth.signToken({
      sub: this.serviceAccount.id,
      aud: 'candlefish-services',
      scope: 'service:all'
    });
  }
  
  // Call another service
  async callService(url, data) {
    const token = await this.getServiceToken();
    return fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
  }
}
```

### Phase 3: Frontend Integration

#### 3.1 React/Next.js Apps
```typescript
// apps/[app-name]/lib/auth.ts
import { CandlefishAuthClient } from '@candlefish/jwt-auth-client';

const auth = new CandlefishAuthClient({
  authUrl: 'https://auth.candlefish.ai',
  clientId: process.env.NEXT_PUBLIC_CLIENT_ID,
  redirectUri: window.location.origin + '/auth/callback'
});

// Auth context provider
export const AuthProvider: React.FC = ({ children }) => {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    auth.getUser().then(setUser);
    
    // Auto-refresh tokens
    auth.onTokenExpiry(() => {
      auth.refreshToken();
    });
  }, []);
  
  return (
    <AuthContext.Provider value={{ user, auth }}>
      {children}
    </AuthContext.Provider>
  );
};

// Protected route component
export const ProtectedRoute: React.FC = ({ children, roles }) => {
  const { user } = useAuth();
  
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Forbidden />;
  
  return children;
};
```

#### 3.2 GraphQL Integration
```typescript
// graphql/context.ts
export async function createContext({ req }): Promise<Context> {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return { user: null };
  }
  
  try {
    const user = await auth.verifyToken(token);
    return { user };
  } catch {
    return { user: null };
  }
}

// graphql/directives.ts
export const authDirective = {
  async auth(next, src, args, context) {
    if (!context.user) {
      throw new ForbiddenError('Not authenticated');
    }
    return next();
  },
  
  async hasRole(next, src, { role }, context) {
    if (!context.user?.roles?.includes(role)) {
      throw new ForbiddenError('Insufficient permissions');
    }
    return next();
  }
};
```

### Phase 4: Infrastructure Setup

#### 4.1 Docker Compose for Development
```yaml
# docker-compose.yml
version: '3.8'

services:
  auth-service:
    build: ./services/auth-service
    environment:
      - AWS_REGION=us-east-1
      - JWT_SECRET_ID=candlefish/development/jwt/signing-key
      - DATABASE_URL=postgresql://auth_db:5432/auth
    ports:
      - "3001:3000"
  
  api-gateway:
    build: ./services/api-gateway
    environment:
      - JWKS_URL=http://auth-service:3000/.well-known/jwks.json
      - SERVICE_AUTH_URL=http://auth-service:3000
    ports:
      - "3000:3000"
    depends_on:
      - auth-service
  
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
```

#### 4.2 Kubernetes Deployment
```yaml
# k8s/auth-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: auth-service
spec:
  selector:
    app: auth-service
  ports:
    - port: 80
      targetPort: 3000
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: auth-service
  template:
    metadata:
      labels:
        app: auth-service
    spec:
      serviceAccountName: auth-service
      containers:
      - name: auth-service
        image: candlefish/auth-service:latest
        env:
        - name: JWT_SECRET_ID
          value: candlefish/production/jwt/signing-key
        - name: AWS_REGION
          value: us-east-1
        ports:
        - containerPort: 3000
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
        readinessProbe:
          httpGet:
            path: /.well-known/jwks.json
            port: 3000
```

### Phase 5: Monitoring & Security

#### 5.1 Token Analytics
```javascript
// monitoring/token-analytics.js
class TokenAnalytics {
  async trackTokenUsage(token, endpoint) {
    await redis.hincrby(`token:${token.jti}`, 'usage', 1);
    await redis.lpush(`endpoint:${endpoint}`, token.sub);
    
    // Track suspicious activity
    if (await this.isSuspicious(token)) {
      await this.alertSecurity(token);
    }
  }
  
  async isSuspicious(token) {
    const usage = await redis.hget(`token:${token.jti}`, 'usage');
    const locations = await redis.smembers(`token:${token.jti}:ips`);
    
    return usage > 1000 || locations.length > 5;
  }
}
```

#### 5.2 Security Headers
```javascript
// middleware/security.js
app.use((req, res, next) => {
  // Strict Transport Security
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  // Content Security Policy for JWT
  res.setHeader('Content-Security-Policy', "default-src 'self'; connect-src https://auth.candlefish.ai");
  
  // Prevent token leakage
  res.setHeader('Referrer-Policy', 'no-referrer');
  
  next();
});
```

### Phase 6: Testing Strategy

#### 6.1 Unit Tests
```javascript
// __tests__/auth.test.js
describe('JWT Authentication', () => {
  it('should sign and verify tokens', async () => {
    const payload = { sub: 'user123', role: 'admin' };
    const token = await auth.signToken(payload);
    const verified = await auth.verifyToken(token);
    
    expect(verified.sub).toBe('user123');
    expect(verified.role).toBe('admin');
  });
  
  it('should reject expired tokens', async () => {
    const token = createExpiredToken();
    await expect(auth.verifyToken(token)).rejects.toThrow('Token expired');
  });
  
  it('should handle key rotation', async () => {
    const oldToken = await auth.signToken({ sub: 'user123' });
    await auth.rotateKeys();
    const verified = await auth.verifyToken(oldToken);
    
    expect(verified.sub).toBe('user123');
  });
});
```

#### 6.2 Integration Tests
```javascript
// __tests__/integration/auth-flow.test.js
describe('Authentication Flow', () => {
  it('should complete login flow', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password' });
    
    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('refreshToken');
    
    // Verify token works
    const protected = await request(app)
      .get('/api/protected')
      .set('Authorization', `Bearer ${response.body.accessToken}`);
    
    expect(protected.status).toBe(200);
  });
});
```

## Implementation Timeline

### Week 1-2: Core Infrastructure
- [ ] Create @candlefish/jwt-auth package
- [ ] Set up AWS Secrets Manager structure
- [ ] Deploy auth service
- [ ] Implement JWKS endpoints

### Week 3-4: Service Integration
- [ ] Integrate API Gateway
- [ ] Add service-to-service auth
- [ ] Implement token refresh
- [ ] Set up monitoring

### Week 5-6: Frontend & Testing
- [ ] Create React auth components
- [ ] Add GraphQL directives
- [ ] Write comprehensive tests
- [ ] Performance testing

### Week 7-8: Production Rollout
- [ ] Deploy to staging
- [ ] Security audit
- [ ] Load testing
- [ ] Production deployment

## Key Benefits

1. **Centralized Authentication**: Single source of truth for user authentication
2. **Service Isolation**: Each service can verify tokens independently
3. **Scalability**: Stateless authentication scales horizontally
4. **Security**: RS256 with key rotation provides strong security
5. **Flexibility**: Works with REST, GraphQL, and WebSockets
6. **Monitoring**: Built-in analytics and security tracking

## Next Steps

1. Review and approve implementation plan
2. Create @candlefish/jwt-auth package
3. Set up development environment
4. Begin phased rollout

This comprehensive JWT implementation will provide Candlefish with enterprise-grade authentication across all services while maintaining flexibility and security.

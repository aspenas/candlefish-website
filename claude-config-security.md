# Claude Configuration Dashboard - Security Implementation

## Authentication & Authorization Architecture

### JWT Token Strategy

```typescript
// JWT Token Structure
interface JWTPayload {
  sub: string;           // User ID
  email: string;         // User email
  role: 'owner' | 'admin' | 'member' | 'viewer';
  permissions: string[]; // Granular permissions
  iat: number;          // Issued at
  exp: number;          // Expiration (15 minutes)
  aud: string;          // Audience (claude-config-api)
  iss: string;          // Issuer (candlefish.ai)
  jti: string;          // JWT ID for revocation
}

// Refresh Token Structure
interface RefreshToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;      // 7 days
  deviceInfo: {
    userAgent: string;
    ip: string;
    device: string;
  };
  createdAt: Date;
}
```

### Role-Based Access Control (RBAC)

```typescript
// Permission System
enum Resource {
  PROJECTS = 'projects',
  CONFIGURATIONS = 'configurations',
  METRICS = 'metrics',
  COSTS = 'costs',
  TEAMS = 'teams',
  ADMIN = 'admin'
}

enum Action {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  DEPLOY = 'deploy',
  INVITE = 'invite'
}

interface Permission {
  resource: Resource;
  actions: Action[];
  conditions?: {
    own?: boolean;        // Only own resources
    teamMember?: boolean; // Only team resources
    projectRole?: string; // Specific project role
  };
}

// Role Definitions
const ROLES: Record<string, Permission[]> = {
  owner: [
    { resource: Resource.ADMIN, actions: [Action.READ, Action.UPDATE] },
    { resource: Resource.PROJECTS, actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE] },
    { resource: Resource.CONFIGURATIONS, actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.DEPLOY] },
    { resource: Resource.METRICS, actions: [Action.READ] },
    { resource: Resource.COSTS, actions: [Action.READ, Action.UPDATE] },
    { resource: Resource.TEAMS, actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.INVITE] }
  ],
  admin: [
    { resource: Resource.PROJECTS, actions: [Action.CREATE, Action.READ, Action.UPDATE], conditions: { teamMember: true } },
    { resource: Resource.CONFIGURATIONS, actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DEPLOY], conditions: { teamMember: true } },
    { resource: Resource.METRICS, actions: [Action.READ], conditions: { teamMember: true } },
    { resource: Resource.COSTS, actions: [Action.READ], conditions: { teamMember: true } },
    { resource: Resource.TEAMS, actions: [Action.READ, Action.INVITE], conditions: { teamMember: true } }
  ],
  member: [
    { resource: Resource.PROJECTS, actions: [Action.READ, Action.UPDATE], conditions: { own: true } },
    { resource: Resource.CONFIGURATIONS, actions: [Action.READ, Action.UPDATE], conditions: { own: true } },
    { resource: Resource.METRICS, actions: [Action.READ], conditions: { own: true } },
    { resource: Resource.COSTS, actions: [Action.READ], conditions: { own: true } }
  ],
  viewer: [
    { resource: Resource.PROJECTS, actions: [Action.READ], conditions: { teamMember: true } },
    { resource: Resource.CONFIGURATIONS, actions: [Action.READ], conditions: { teamMember: true } },
    { resource: Resource.METRICS, actions: [Action.READ], conditions: { teamMember: true } }
  ]
};
```

### API Key Management

```typescript
// API Key Structure for Service-to-Service Auth
interface ApiKey {
  id: string;
  userId?: string;      // Optional user association
  name: string;         // Human-readable name
  keyHash: string;      // Hashed key value
  permissions: {
    resources: Resource[];
    actions: Action[];
    rateLimit: {
      requestsPerHour: number;
      burstCapacity: number;
    };
    ipWhitelist?: string[];
    expiresAt?: Date;
  };
  lastUsed?: Date;
  isActive: boolean;
  createdAt: Date;
}

// API Key Generation
class ApiKeyService {
  async generateApiKey(request: {
    name: string;
    permissions: Permission[];
    userId?: string;
    expiresAt?: Date;
  }): Promise<{ key: string; keyId: string }> {
    // Generate secure random key
    const key = crypto.randomBytes(32).toString('hex');
    const keyHash = await bcrypt.hash(key, 12);
    
    const apiKey: ApiKey = {
      id: uuidv4(),
      name: request.name,
      keyHash,
      permissions: {
        resources: request.permissions.map(p => p.resource),
        actions: request.permissions.flatMap(p => p.actions),
        rateLimit: {
          requestsPerHour: 1000,
          burstCapacity: 100
        }
      },
      userId: request.userId,
      isActive: true,
      createdAt: new Date()
    };

    await this.repository.save(apiKey);
    return { key: `ck_${key}`, keyId: apiKey.id };
  }
}
```

## Security Middleware Implementation

### JWT Authentication Middleware

```typescript
// Express middleware for JWT authentication
export const jwtAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Missing or invalid authorization header'
      });
    }

    const token = authHeader.substring(7);
    
    // Check token blacklist
    const isBlacklisted = await redis.get(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        error: 'Token has been revoked'
      });
    }

    // Verify JWT
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    
    // Fetch fresh user data
    const user = await userService.findById(payload.sub);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'User not found or inactive'
      });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: payload.permissions
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }
    
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
};
```

### API Key Authentication Middleware

```typescript
export const apiKeyAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey?.startsWith('ck_')) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key format'
      });
    }

    const keyValue = apiKey.substring(3);
    const keyData = await apiKeyService.validateKey(keyValue);
    
    if (!keyData || !keyData.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or inactive API key'
      });
    }

    // Check expiration
    if (keyData.expiresAt && keyData.expiresAt < new Date()) {
      return res.status(401).json({
        success: false,
        error: 'API key expired'
      });
    }

    // Update last used
    await apiKeyService.updateLastUsed(keyData.id);

    // Attach API key context
    req.apiKey = {
      id: keyData.id,
      userId: keyData.userId,
      permissions: keyData.permissions,
      rateLimit: keyData.permissions.rateLimit
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'API key validation failed'
    });
  }
};
```

### Permission Authorization Middleware

```typescript
export const requirePermission = (
  resource: Resource,
  action: Action
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    const apiKey = req.apiKey;

    if (!user && !apiKey) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    let hasPermission = false;

    if (user) {
      // Check user permissions
      hasPermission = await permissionService.hasPermission(
        user.id,
        resource,
        action,
        {
          resourceId: req.params.id,
          projectId: req.params.projectId
        }
      );
    } else if (apiKey) {
      // Check API key permissions
      hasPermission = apiKey.permissions.resources.includes(resource) &&
                    apiKey.permissions.actions.includes(action);
    }

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: `Insufficient permissions for ${action} on ${resource}`
      });
    }

    next();
  };
};
```

## Rate Limiting & Quota Management

### Redis-based Rate Limiter

```typescript
class RateLimiter {
  constructor(private redis: Redis) {}

  async checkLimit(
    key: string,
    limit: number,
    windowMs: number,
    burstCapacity: number = limit
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
  }> {
    const now = Date.now();
    const window = Math.floor(now / windowMs);
    const redisKey = `rate_limit:${key}:${window}`;

    const pipeline = this.redis.pipeline();
    pipeline.incr(redisKey);
    pipeline.expire(redisKey, Math.ceil(windowMs / 1000));
    
    const results = await pipeline.exec();
    const count = results![0][1] as number;

    // Check burst capacity first
    if (count > burstCapacity) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: (window + 1) * windowMs
      };
    }

    // Check regular limit
    const allowed = count <= limit;
    const remaining = Math.max(0, limit - count);

    return {
      allowed,
      remaining,
      resetTime: (window + 1) * windowMs
    };
  }

  async slidingWindowLimit(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<{ allowed: boolean; remaining: number }> {
    const now = Date.now();
    const cutoff = now - windowMs;
    const redisKey = `sliding:${key}`;

    const pipeline = this.redis.pipeline();
    // Remove expired entries
    pipeline.zremrangebyscore(redisKey, 0, cutoff);
    // Count current entries
    pipeline.zcard(redisKey);
    // Add current request
    pipeline.zadd(redisKey, now, `${now}-${Math.random()}`);
    // Set expiration
    pipeline.expire(redisKey, Math.ceil(windowMs / 1000));

    const results = await pipeline.exec();
    const count = results![1][1] as number;
    
    const allowed = count < limit;
    const remaining = Math.max(0, limit - count - (allowed ? 1 : 0));

    return { allowed, remaining };
  }
}

// Rate limiting middleware
export const rateLimit = (
  requestsPerHour: number = 1000,
  burstCapacity: number = 100
) => {
  const limiter = new RateLimiter(redis);
  
  return async (req: Request, res: Response, next: NextFunction) => {
    // Determine rate limit key
    let rateLimitKey: string;
    let limit = requestsPerHour;
    let burst = burstCapacity;

    if (req.apiKey) {
      rateLimitKey = `api_key:${req.apiKey.id}`;
      limit = req.apiKey.rateLimit.requestsPerHour;
      burst = req.apiKey.rateLimit.burstCapacity;
    } else if (req.user) {
      rateLimitKey = `user:${req.user.id}`;
    } else {
      rateLimitKey = `ip:${req.ip}`;
      limit = 100; // Lower limit for unauthenticated requests
      burst = 20;
    }

    const result = await limiter.checkLimit(
      rateLimitKey,
      limit,
      3600000, // 1 hour
      burst
    );

    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
    });

    if (!result.allowed) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
      });
    }

    next();
  };
};
```

### Quota Management

```typescript
interface Quota {
  id: string;
  userId?: string;
  teamId?: string;
  quotaType: 'tokens' | 'requests' | 'cost';
  limit: number;
  period: 'hour' | 'day' | 'week' | 'month';
  used: number;
  resetAt: Date;
  isActive: boolean;
}

class QuotaManager {
  async checkQuota(
    userId: string,
    quotaType: 'tokens' | 'requests' | 'cost',
    amount: number
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: Date;
  }> {
    const quota = await this.getActiveQuota(userId, quotaType);
    if (!quota) {
      // No quota set - allow unlimited
      return {
        allowed: true,
        remaining: Infinity,
        resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      };
    }

    // Check if quota period has reset
    if (new Date() >= quota.resetAt) {
      quota.used = 0;
      quota.resetAt = this.calculateNextReset(quota.period);
      await this.quotaRepository.save(quota);
    }

    const wouldExceed = (quota.used + amount) > quota.limit;
    const remaining = Math.max(0, quota.limit - quota.used - amount);

    return {
      allowed: !wouldExceed,
      remaining,
      resetAt: quota.resetAt
    };
  }

  async consumeQuota(
    userId: string,
    quotaType: 'tokens' | 'requests' | 'cost',
    amount: number
  ): Promise<void> {
    const quota = await this.getActiveQuota(userId, quotaType);
    if (quota) {
      quota.used += amount;
      await this.quotaRepository.save(quota);
    }
  }

  private calculateNextReset(period: string): Date {
    const now = new Date();
    switch (period) {
      case 'hour':
        return new Date(now.getTime() + 60 * 60 * 1000);
      case 'day':
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow;
      case 'week':
        const nextWeek = new Date(now);
        nextWeek.setDate(nextWeek.getDate() + (7 - nextWeek.getDay()));
        nextWeek.setHours(0, 0, 0, 0);
        return nextWeek;
      case 'month':
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1, 1);
        nextMonth.setHours(0, 0, 0, 0);
        return nextMonth;
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }
}
```

## Data Encryption & Privacy

### Database Encryption

```sql
-- Enable transparent data encryption
ALTER SYSTEM SET ssl = on;
ALTER SYSTEM SET ssl_cert_file = '/path/to/server.crt';
ALTER SYSTEM SET ssl_key_file = '/path/to/server.key';

-- Enable row-level security for sensitive tables
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create policy for users to only see their own data
CREATE POLICY user_isolation_policy ON auth.users
  USING (id = current_setting('app.user_id')::uuid);

-- Encrypt sensitive columns
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to encrypt PII data
CREATE OR REPLACE FUNCTION encrypt_pii(data text)
RETURNS text AS $$
BEGIN
  RETURN encode(
    encrypt(
      data::bytea,
      current_setting('app.encryption_key')::bytea,
      'aes'
    ),
    'base64'
  );
END;
$$ LANGUAGE plpgsql;
```

### Application-level Encryption

```typescript
class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;

  constructor(private readonly masterKey: string) {}

  encrypt(data: string): {
    encrypted: string;
    iv: string;
    authTag: string;
  } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, this.masterKey);
    cipher.setAAD(Buffer.from('claude-config', 'utf8'));

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  decrypt(encryptedData: {
    encrypted: string;
    iv: string;
    authTag: string;
  }): string {
    const decipher = crypto.createDecipher(this.algorithm, this.masterKey);
    decipher.setAAD(Buffer.from('claude-config', 'utf8'));
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  // Hash sensitive data for searching
  hashForSearch(data: string): string {
    return crypto
      .createHash('sha256')
      .update(data + this.masterKey)
      .digest('hex');
  }
}
```

## Security Headers & CORS

```typescript
// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Prevent XSS attacks
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Prevent content type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Enforce HTTPS
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  
  // Content Security Policy
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' wss: https:",
    "frame-ancestors 'none'"
  ].join('; '));
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy
  res.setHeader('Permissions-Policy', [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=()'
  ].join(', '));

  next();
};

// CORS configuration
export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://claude-config.candlefish.ai',
      'https://staging-claude-config.candlefish.ai',
      ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000'] : [])
    ];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Key',
    'X-Request-ID'
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset'
  ]
};
```

## Monitoring & Alerting

### Security Event Logging

```typescript
enum SecurityEventType {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  TOKEN_REFRESH = 'token_refresh',
  PERMISSION_DENIED = 'permission_denied',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  DATA_ACCESS = 'data_access',
  CONFIGURATION_CHANGE = 'configuration_change'
}

interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  userId?: string;
  ip: string;
  userAgent: string;
  details: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
}

class SecurityLogger {
  async logEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<void> {
    const securityEvent: SecurityEvent = {
      ...event,
      id: uuidv4(),
      timestamp: new Date()
    };

    // Log to database
    await this.securityEventRepository.save(securityEvent);

    // Send to monitoring system
    await this.sendToMonitoring(securityEvent);

    // Check for alerts
    if (event.severity === 'high' || event.severity === 'critical') {
      await this.triggerAlert(securityEvent);
    }
  }

  private async sendToMonitoring(event: SecurityEvent): Promise<void> {
    // Send to Prometheus/Grafana
    securityEventsCounter.labels({
      type: event.type,
      severity: event.severity
    }).inc();

    // Send to centralized logging
    logger.info('Security event', {
      eventId: event.id,
      type: event.type,
      userId: event.userId,
      ip: event.ip,
      severity: event.severity,
      details: event.details
    });
  }
}
```

This comprehensive security implementation provides multiple layers of protection including authentication, authorization, rate limiting, data encryption, and comprehensive monitoring. The system is designed to be production-ready with proper error handling, logging, and alerting mechanisms.
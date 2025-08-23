# PromoterOS System Hardening Requirements

## Executive Summary

This document outlines comprehensive security hardening requirements for PromoterOS to achieve production-grade security, reliability, and compliance. The strategy addresses infrastructure security, application security, data protection, monitoring, and incident response.

## 1. Security Architecture Overview

### Defense in Depth Model
```
┌─────────────────────────────────────────────┐
│            Layer 7: Application             │
│     Input Validation | Output Encoding      │
├─────────────────────────────────────────────┤
│            Layer 6: Authentication          │
│        JWT | OAuth2 | MFA | SSO            │
├─────────────────────────────────────────────┤
│            Layer 5: Authorization           │
│         RBAC | Attribute-Based AC          │
├─────────────────────────────────────────────┤
│            Layer 4: Network Security        │
│      WAF | DDoS Protection | TLS 1.3       │
├─────────────────────────────────────────────┤
│            Layer 3: Infrastructure          │
│    VPC | Security Groups | NACLs | KMS     │
├─────────────────────────────────────────────┤
│            Layer 2: Data Protection         │
│   Encryption at Rest | In Transit | Keys   │
├─────────────────────────────────────────────┤
│            Layer 1: Physical Security       │
│         AWS Data Centers | HSMs            │
└─────────────────────────────────────────────┘
```

## 2. Infrastructure Hardening

### 2.1 Network Security

#### Zero Trust Network Architecture
```yaml
VPC Configuration:
  CIDR: 10.0.0.0/16
  
  Subnets:
    Public:
      - 10.0.1.0/24 (ALB, NAT Gateway)
      - 10.0.2.0/24 (Bastion hosts)
    
    Private:
      - 10.0.10.0/24 (Application servers)
      - 10.0.11.0/24 (Worker nodes)
    
    Database:
      - 10.0.20.0/24 (PostgreSQL)
      - 10.0.21.0/24 (Redis, InfluxDB)
  
  Security Groups:
    ALB:
      Ingress: 443 from 0.0.0.0/0
      Egress: 3000 to App servers
    
    App:
      Ingress: 3000 from ALB
      Egress: 5432 to RDS, 6379 to Redis
    
    Database:
      Ingress: 5432 from App subnet only
      Egress: None
```

#### DDoS Protection
```typescript
// AWS Shield + CloudFront configuration
const cloudFrontConfig = {
  WebACLId: process.env.WAF_WEB_ACL_ID,
  
  behaviors: {
    '/api/*': {
      targetOriginId: 'api-origin',
      viewerProtocolPolicy: 'https-only',
      allowedMethods: ['GET', 'HEAD', 'OPTIONS', 'PUT', 'POST', 'PATCH', 'DELETE'],
      
      // Rate limiting
      throttle: {
        burstLimit: 1000,
        rateLimit: 100
      }
    }
  },
  
  customErrorResponses: [
    {
      errorCode: 403,
      responseCode: 403,
      responsePagePath: '/error/403.html',
      errorCachingMinTTL: 60
    }
  ],
  
  geoRestriction: {
    restrictionType: 'blacklist',
    locations: ['CN', 'RU', 'KP'] // High-risk countries
  }
};
```

### 2.2 Container Security

#### Docker Hardening
```dockerfile
# Hardened Dockerfile
FROM node:20-alpine AS base

# Run as non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Security headers
RUN apk add --no-cache \
    dumb-init \
    && rm -rf /var/cache/apk/*

FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

FROM base AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci && \
    npm cache clean --force
COPY . .
RUN npm run build

FROM base AS runtime
WORKDIR /app

# Copy only necessary files
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --chown=nodejs:nodejs package*.json ./

# Security settings
USER nodejs
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
```

#### Kubernetes Security Policies
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: promoteros-app
  annotations:
    container.apparmor.security.beta.kubernetes.io/app: runtime/default
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1001
    fsGroup: 1001
    seccompProfile:
      type: RuntimeDefault
  
  containers:
  - name: app
    image: promoteros:latest
    
    securityContext:
      allowPrivilegeEscalation: false
      capabilities:
        drop:
          - ALL
      readOnlyRootFilesystem: true
      runAsNonRoot: true
      runAsUser: 1001
    
    resources:
      limits:
        cpu: "1"
        memory: "512Mi"
      requests:
        cpu: "100m"
        memory: "128Mi"
    
    livenessProbe:
      httpGet:
        path: /health
        port: 3000
      initialDelaySeconds: 30
      periodSeconds: 10
    
    readinessProbe:
      httpGet:
        path: /ready
        port: 3000
      initialDelaySeconds: 5
      periodSeconds: 5

---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: promoteros-network-policy
spec:
  podSelector:
    matchLabels:
      app: promoteros
  policyTypes:
  - Ingress
  - Egress
  
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: nginx-ingress
    ports:
    - protocol: TCP
      port: 3000
  
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432
  - to:
    - podSelector:
        matchLabels:
          app: redis
    ports:
    - protocol: TCP
      port: 6379
```

## 3. Application Security

### 3.1 Authentication & Authorization

#### JWT Implementation with Refresh Tokens
```typescript
// services/auth/jwt-service.ts
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { Redis } from 'ioredis';

export class SecureAuthService {
  private readonly accessTokenSecret = process.env.JWT_ACCESS_SECRET!;
  private readonly refreshTokenSecret = process.env.JWT_REFRESH_SECRET!;
  private readonly redis: Redis;
  
  constructor(redis: Redis) {
    this.redis = redis;
  }
  
  async generateTokenPair(userId: string, roles: string[]) {
    // Short-lived access token (15 minutes)
    const accessToken = jwt.sign(
      {
        sub: userId,
        roles,
        type: 'access',
        jti: randomBytes(16).toString('hex')
      },
      this.accessTokenSecret,
      {
        expiresIn: '15m',
        algorithm: 'RS256',
        issuer: 'promoteros.com',
        audience: 'promoteros-api'
      }
    );
    
    // Long-lived refresh token (7 days)
    const refreshToken = jwt.sign(
      {
        sub: userId,
        type: 'refresh',
        jti: randomBytes(16).toString('hex')
      },
      this.refreshTokenSecret,
      {
        expiresIn: '7d',
        algorithm: 'RS256'
      }
    );
    
    // Store refresh token in Redis with expiry
    await this.redis.setex(
      `refresh_token:${userId}:${refreshToken}`,
      7 * 24 * 60 * 60, // 7 days in seconds
      JSON.stringify({ createdAt: new Date(), ip: req.ip })
    );
    
    return { accessToken, refreshToken };
  }
  
  async verifyAccessToken(token: string) {
    try {
      const payload = jwt.verify(token, this.accessTokenSecret, {
        algorithms: ['RS256'],
        issuer: 'promoteros.com',
        audience: 'promoteros-api'
      });
      
      // Check if token is blacklisted
      const isBlacklisted = await this.redis.get(`blacklist:${payload.jti}`);
      if (isBlacklisted) {
        throw new Error('Token has been revoked');
      }
      
      return payload;
    } catch (error) {
      throw new UnauthorizedError('Invalid access token');
    }
  }
  
  async refreshTokens(refreshToken: string) {
    const payload = jwt.verify(refreshToken, this.refreshTokenSecret);
    
    // Verify refresh token exists in Redis
    const storedToken = await this.redis.get(`refresh_token:${payload.sub}:${refreshToken}`);
    if (!storedToken) {
      throw new UnauthorizedError('Invalid refresh token');
    }
    
    // Rotate refresh token (delete old, create new)
    await this.redis.del(`refresh_token:${payload.sub}:${refreshToken}`);
    
    // Get user's current roles
    const user = await getUserById(payload.sub);
    
    return this.generateTokenPair(user.id, user.roles);
  }
  
  async revokeAllTokens(userId: string) {
    // Get all refresh tokens for user
    const keys = await this.redis.keys(`refresh_token:${userId}:*`);
    
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

#### Multi-Factor Authentication
```typescript
// services/auth/mfa-service.ts
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

export class MFAService {
  async setupMFA(userId: string, email: string) {
    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `PromoterOS (${email})`,
      issuer: 'PromoterOS',
      length: 32
    });
    
    // Store encrypted secret
    await this.storeUserSecret(userId, secret.base32);
    
    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);
    
    // Generate backup codes
    const backupCodes = this.generateBackupCodes(8);
    await this.storeBackupCodes(userId, backupCodes);
    
    return {
      secret: secret.base32,
      qrCode: qrCodeUrl,
      backupCodes
    };
  }
  
  async verifyMFAToken(userId: string, token: string) {
    const secret = await this.getUserSecret(userId);
    
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2 // Allow 2 time steps for clock skew
    });
    
    if (!verified) {
      // Check backup codes
      const isBackupCode = await this.verifyBackupCode(userId, token);
      if (!isBackupCode) {
        throw new Error('Invalid MFA token');
      }
    }
    
    return true;
  }
  
  private generateBackupCodes(count: number): string[] {
    return Array.from({ length: count }, () =>
      randomBytes(4).toString('hex').toUpperCase()
    );
  }
}
```

### 3.2 Input Validation & Sanitization

#### Comprehensive Input Validation
```typescript
// middleware/validation.ts
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import sqlstring from 'sqlstring';

export class ValidationMiddleware {
  // Schema definitions
  private schemas = {
    artistSearch: z.object({
      name: z.string()
        .min(1)
        .max(100)
        .regex(/^[a-zA-Z0-9\s\-']+$/, 'Invalid characters in name')
        .transform(val => DOMPurify.sanitize(val)),
      
      platform: z.enum(['tiktok', 'instagram', 'spotify', 'all']).optional(),
      
      dateRange: z.object({
        start: z.date().max(new Date(), 'Start date cannot be in the future'),
        end: z.date()
      }).refine(data => data.end > data.start, {
        message: 'End date must be after start date'
      }).optional()
    }),
    
    bookingEvaluation: z.object({
      artistId: z.string().uuid('Invalid artist ID format'),
      venueId: z.string().uuid('Invalid venue ID format'),
      eventDate: z.date().min(new Date(), 'Event date must be in the future'),
      ticketPrice: z.number()
        .positive()
        .max(9999, 'Ticket price too high')
        .multipleOf(0.01),
      
      options: z.object({
        includeCompetitors: z.boolean().default(true),
        generateReport: z.boolean().default(false)
      }).optional()
    })
  };
  
  validate(schema: keyof typeof this.schemas) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Parse and validate
        const validated = await this.schemas[schema].parseAsync(req.body);
        
        // Additional SQL injection prevention
        const sanitized = this.preventSQLInjection(validated);
        
        // XSS prevention for string fields
        const xssSafe = this.preventXSS(sanitized);
        
        req.body = xssSafe;
        next();
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({
            error: 'Validation failed',
            details: error.errors.map(e => ({
              field: e.path.join('.'),
              message: e.message
            }))
          });
        } else {
          next(error);
        }
      }
    };
  }
  
  private preventSQLInjection(data: any): any {
    if (typeof data === 'string') {
      // Escape SQL special characters
      return sqlstring.escape(data).slice(1, -1); // Remove quotes
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.preventSQLInjection(item));
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = this.preventSQLInjection(value);
      }
      return sanitized;
    }
    
    return data;
  }
  
  private preventXSS(data: any): any {
    if (typeof data === 'string') {
      return DOMPurify.sanitize(data, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: []
      });
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.preventXSS(item));
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = this.preventXSS(value);
      }
      return sanitized;
    }
    
    return data;
  }
}
```

### 3.3 Rate Limiting & Throttling

#### Advanced Rate Limiting Strategy
```typescript
// middleware/rate-limiter.ts
import { RateLimiterRedis, RateLimiterUnion } from 'rate-limiter-flexible';
import { Redis } from 'ioredis';

export class AdvancedRateLimiter {
  private limiters: Map<string, RateLimiterUnion>;
  
  constructor(redis: Redis) {
    this.limiters = new Map();
    
    // Different limits for different endpoints
    this.setupLimiters(redis);
  }
  
  private setupLimiters(redis: Redis) {
    // Standard API limit
    this.limiters.set('standard', new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: 'rl:std',
      points: 100,
      duration: 3600, // per hour
      blockDuration: 600 // block for 10 minutes
    }));
    
    // Scraping endpoints (more restrictive)
    this.limiters.set('scraping', new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: 'rl:scrape',
      points: 10,
      duration: 3600,
      blockDuration: 3600 // block for 1 hour
    }));
    
    // Authentication endpoints (prevent brute force)
    this.limiters.set('auth', new RateLimiterUnion(
      new RateLimiterRedis({
        storeClient: redis,
        keyPrefix: 'rl:auth:min',
        points: 5,
        duration: 60 // 5 per minute
      }),
      new RateLimiterRedis({
        storeClient: redis,
        keyPrefix: 'rl:auth:hour',
        points: 20,
        duration: 3600 // 20 per hour
      })
    ));
    
    // ML predictions (expensive operations)
    this.limiters.set('ml', new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: 'rl:ml',
      points: 20,
      duration: 3600,
      blockDuration: 1800
    }));
    
    // Per-user limits (authenticated requests)
    this.limiters.set('user', new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: 'rl:user',
      points: 1000,
      duration: 3600,
      blockDuration: 600
    }));
  }
  
  middleware(type: string = 'standard') {
    return async (req: Request, res: Response, next: NextFunction) => {
      const limiter = this.limiters.get(type);
      if (!limiter) {
        return next();
      }
      
      const key = this.getKey(req, type);
      
      try {
        await limiter.consume(key, 1);
        
        // Add rate limit headers
        const rateLimiterRes = await limiter.get(key);
        res.setHeader('X-RateLimit-Limit', limiter.points);
        res.setHeader('X-RateLimit-Remaining', rateLimiterRes?.remainingPoints || 0);
        res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rateLimiterRes?.msBeforeNext || 0).toISOString());
        
        next();
      } catch (rejRes) {
        // Rate limit exceeded
        res.setHeader('Retry-After', Math.round(rejRes.msBeforeNext / 1000) || 60);
        res.status(429).json({
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Try again in ${Math.round(rejRes.msBeforeNext / 1000)} seconds`,
          retryAfter: rejRes.msBeforeNext
        });
        
        // Log potential abuse
        if (rejRes.consumedPoints > limiter.points * 2) {
          await this.logAbuse(req, type, rejRes.consumedPoints);
        }
      }
    };
  }
  
  private getKey(req: Request, type: string): string {
    // Use different keys based on type
    if (type === 'user' && req.user) {
      return `${req.user.id}`;
    }
    
    // Use IP address for unauthenticated requests
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return `${ip}:${req.path}`;
  }
  
  private async logAbuse(req: Request, type: string, attempts: number) {
    // Log to security monitoring system
    logger.security('rate_limit_abuse', {
      ip: req.ip,
      path: req.path,
      type,
      attempts,
      user: req.user?.id,
      headers: req.headers,
      timestamp: new Date()
    });
    
    // Consider blocking IP if severe abuse
    if (attempts > 1000) {
      await this.blockIP(req.ip);
    }
  }
}
```

## 4. Data Protection

### 4.1 Encryption at Rest

#### Database Encryption
```sql
-- PostgreSQL Transparent Data Encryption
ALTER SYSTEM SET ssl = on;
ALTER SYSTEM SET ssl_cert_file = '/etc/postgresql/server.crt';
ALTER SYSTEM SET ssl_key_file = '/etc/postgresql/server.key';
ALTER SYSTEM SET ssl_ca_file = '/etc/postgresql/ca.crt';

-- Column-level encryption for sensitive data
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypted user table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL, -- bcrypt
  mfa_secret BYTEA, -- Encrypted with pgcrypto
  personal_data JSONB, -- Encrypted JSON
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Encryption functions
CREATE OR REPLACE FUNCTION encrypt_sensitive(data TEXT)
RETURNS BYTEA AS $$
BEGIN
  RETURN pgp_sym_encrypt(data, current_setting('app.encryption_key'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrypt_sensitive(data BYTEA)
RETURNS TEXT AS $$
BEGIN
  RETURN pgp_sym_decrypt(data, current_setting('app.encryption_key'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### File Storage Encryption
```typescript
// services/storage/encrypted-storage.ts
import AWS from 'aws-sdk';
import crypto from 'crypto';

export class EncryptedStorage {
  private s3: AWS.S3;
  private kms: AWS.KMS;
  
  constructor() {
    this.s3 = new AWS.S3({
      region: process.env.AWS_REGION
    });
    
    this.kms = new AWS.KMS({
      region: process.env.AWS_REGION
    });
  }
  
  async uploadEncrypted(bucket: string, key: string, data: Buffer) {
    // Generate data key using KMS
    const dataKey = await this.kms.generateDataKey({
      KeyId: process.env.KMS_KEY_ID!,
      KeySpec: 'AES_256'
    }).promise();
    
    // Encrypt data with data key
    const cipher = crypto.createCipheriv(
      'aes-256-gcm',
      dataKey.Plaintext as Buffer,
      crypto.randomBytes(16)
    );
    
    const encrypted = Buffer.concat([
      cipher.update(data),
      cipher.final()
    ]);
    
    const authTag = cipher.getAuthTag();
    
    // Upload encrypted data with encrypted data key
    await this.s3.putObject({
      Bucket: bucket,
      Key: key,
      Body: encrypted,
      ServerSideEncryption: 'aws:kms',
      SSEKMSKeyId: process.env.KMS_KEY_ID,
      Metadata: {
        'x-amz-encryptedDataKey': dataKey.CiphertextBlob!.toString('base64'),
        'x-amz-authTag': authTag.toString('base64')
      }
    }).promise();
  }
  
  async downloadDecrypted(bucket: string, key: string): Promise<Buffer> {
    // Get encrypted object
    const object = await this.s3.getObject({
      Bucket: bucket,
      Key: key
    }).promise();
    
    // Decrypt data key
    const dataKey = await this.kms.decrypt({
      CiphertextBlob: Buffer.from(object.Metadata!['x-amz-encryptedDataKey'], 'base64')
    }).promise();
    
    // Decrypt data
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      dataKey.Plaintext as Buffer,
      crypto.randomBytes(16)
    );
    
    decipher.setAuthTag(Buffer.from(object.Metadata!['x-amz-authTag'], 'base64'));
    
    return Buffer.concat([
      decipher.update(object.Body as Buffer),
      decipher.final()
    ]);
  }
}
```

### 4.2 Encryption in Transit

#### TLS Configuration
```nginx
# nginx.conf - TLS 1.3 configuration
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    
    # Certificate and key
    ssl_certificate /etc/nginx/ssl/promoteros.crt;
    ssl_certificate_key /etc/nginx/ssl/promoteros.key;
    
    # TLS 1.3 only
    ssl_protocols TLSv1.3;
    ssl_ciphers 'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256';
    ssl_prefer_server_ciphers off;
    
    # OCSP stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/nginx/ssl/ca.crt;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline';" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
    
    # Session configuration
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;
    
    # OCSP resolver
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;
}
```

## 5. Monitoring & Observability

### 5.1 Security Monitoring

#### Centralized Logging
```typescript
// services/monitoring/security-logger.ts
import winston from 'winston';
import { ElasticsearchTransport } from 'winston-elasticsearch';

export class SecurityLogger {
  private logger: winston.Logger;
  
  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      defaultMeta: {
        service: 'promoteros',
        environment: process.env.NODE_ENV
      },
      transports: [
        // Elasticsearch for centralized logging
        new ElasticsearchTransport({
          level: 'info',
          clientOpts: {
            node: process.env.ELASTICSEARCH_URL,
            auth: {
              username: process.env.ELASTICSEARCH_USER,
              password: process.env.ELASTICSEARCH_PASSWORD
            }
          },
          index: 'security-logs',
          dataStream: true
        }),
        
        // File transport for audit trail
        new winston.transports.File({
          filename: '/var/log/promoteros/security.log',
          level: 'warning',
          maxsize: 100 * 1024 * 1024, // 100MB
          maxFiles: 30
        }),
        
        // Console for development
        new winston.transports.Console({
          format: winston.format.simple(),
          level: process.env.NODE_ENV === 'production' ? 'error' : 'debug'
        })
      ]
    });
  }
  
  logAuthAttempt(success: boolean, userId?: string, ip?: string, method?: string) {
    this.logger.info('auth_attempt', {
      success,
      userId,
      ip,
      method,
      timestamp: new Date(),
      userAgent: req.headers['user-agent']
    });
    
    if (!success) {
      this.checkBruteForce(ip, userId);
    }
  }
  
  logAccessViolation(userId: string, resource: string, action: string) {
    this.logger.warn('access_violation', {
      userId,
      resource,
      action,
      timestamp: new Date(),
      severity: 'high'
    });
    
    // Alert security team
    this.sendSecurityAlert({
      type: 'ACCESS_VIOLATION',
      userId,
      resource,
      action
    });
  }
  
  logDataAccess(userId: string, dataType: string, recordIds: string[]) {
    this.logger.info('data_access', {
      userId,
      dataType,
      recordCount: recordIds.length,
      recordIds: recordIds.slice(0, 10), // Log first 10 IDs
      timestamp: new Date()
    });
  }
  
  private async checkBruteForce(ip?: string, userId?: string) {
    // Check for patterns indicating brute force
    const recentAttempts = await this.getRecentFailedAttempts(ip, userId);
    
    if (recentAttempts > 10) {
      this.logger.error('brute_force_detected', {
        ip,
        userId,
        attempts: recentAttempts,
        severity: 'critical'
      });
      
      // Auto-block IP
      await this.blockIP(ip);
      
      // Alert security team immediately
      this.sendSecurityAlert({
        type: 'BRUTE_FORCE',
        ip,
        userId,
        attempts: recentAttempts
      });
    }
  }
}
```

### 5.2 Intrusion Detection

#### Anomaly Detection System
```python
# services/security/anomaly_detection.py
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import pandas as pd
from typing import Dict, List
import asyncio
import aioredis

class AnomalyDetectionSystem:
    def __init__(self):
        self.model = IsolationForest(
            contamination=0.01,  # 1% expected anomalies
            random_state=42
        )
        self.scaler = StandardScaler()
        self.redis = None
        self.alert_threshold = -0.5
        
    async def initialize(self):
        self.redis = await aioredis.create_redis_pool(
            'redis://localhost:6379'
        )
        await self.train_baseline()
    
    async def train_baseline(self):
        """Train on normal behavior patterns"""
        # Fetch historical normal behavior data
        normal_data = await self.fetch_normal_behavior_data()
        
        # Feature extraction
        features = self.extract_features(normal_data)
        
        # Scale and train
        scaled_features = self.scaler.fit_transform(features)
        self.model.fit(scaled_features)
        
        print(f"Anomaly detection model trained on {len(features)} samples")
    
    def extract_features(self, data: List[Dict]) -> np.ndarray:
        """Extract behavioral features from raw data"""
        features = []
        
        for event in data:
            feature_vector = [
                event.get('request_rate', 0),
                event.get('unique_ips', 0),
                event.get('failed_auth_attempts', 0),
                event.get('data_transfer_size', 0),
                event.get('unusual_hour', 0),  # 1 if outside business hours
                event.get('new_user_agent', 0),  # 1 if never seen before
                event.get('geo_anomaly', 0),  # 1 if from unusual location
                event.get('api_sequence_score', 0),  # Unusual API call patterns
                event.get('response_time', 0),
                event.get('error_rate', 0)
            ]
            features.append(feature_vector)
        
        return np.array(features)
    
    async def detect_anomalies(self, events: List[Dict]) -> List[Dict]:
        """Detect anomalies in real-time events"""
        if not events:
            return []
        
        # Extract features
        features = self.extract_features(events)
        scaled_features = self.scaler.transform(features)
        
        # Predict anomalies
        predictions = self.model.predict(scaled_features)
        anomaly_scores = self.model.score_samples(scaled_features)
        
        # Identify anomalies
        anomalies = []
        for i, (event, prediction, score) in enumerate(zip(events, predictions, anomaly_scores)):
            if prediction == -1 or score < self.alert_threshold:
                anomaly = {
                    'event': event,
                    'anomaly_score': float(score),
                    'severity': self.calculate_severity(score),
                    'timestamp': event.get('timestamp'),
                    'recommended_action': self.recommend_action(event, score)
                }
                anomalies.append(anomaly)
                
                # Store in Redis for correlation
                await self.redis.zadd(
                    'anomalies:timeline',
                    event['timestamp'],
                    json.dumps(anomaly)
                )
        
        # Check for attack patterns
        if anomalies:
            attack_pattern = await self.correlate_anomalies(anomalies)
            if attack_pattern:
                await self.trigger_incident_response(attack_pattern)
        
        return anomalies
    
    def calculate_severity(self, score: float) -> str:
        """Calculate anomaly severity based on score"""
        if score < -0.8:
            return 'CRITICAL'
        elif score < -0.6:
            return 'HIGH'
        elif score < -0.4:
            return 'MEDIUM'
        else:
            return 'LOW'
    
    def recommend_action(self, event: Dict, score: float) -> str:
        """Recommend security action based on anomaly type"""
        if event.get('failed_auth_attempts', 0) > 5:
            return 'BLOCK_IP'
        elif event.get('data_transfer_size', 0) > 1000000000:  # 1GB
            return 'RATE_LIMIT'
        elif score < -0.8:
            return 'IMMEDIATE_INVESTIGATION'
        else:
            return 'MONITOR'
    
    async def correlate_anomalies(self, anomalies: List[Dict]) -> Dict:
        """Correlate anomalies to detect attack patterns"""
        # Get recent anomalies from Redis
        recent_anomalies = await self.redis.zrange(
            'anomalies:timeline',
            -100,  # Last 100 anomalies
            -1,
            withscores=True
        )
        
        # Analyze patterns
        patterns = {
            'brute_force': False,
            'data_exfiltration': False,
            'ddos': False,
            'account_takeover': False
        }
        
        # Check for brute force pattern
        auth_failures = sum(1 for a in anomalies if a['event'].get('failed_auth_attempts', 0) > 3)
        if auth_failures > 5:
            patterns['brute_force'] = True
        
        # Check for data exfiltration
        large_transfers = sum(1 for a in anomalies if a['event'].get('data_transfer_size', 0) > 100000000)
        if large_transfers > 2:
            patterns['data_exfiltration'] = True
        
        # Check for DDoS pattern
        high_request_rate = sum(1 for a in anomalies if a['event'].get('request_rate', 0) > 1000)
        if high_request_rate > 10:
            patterns['ddos'] = True
        
        # Return detected pattern
        detected_patterns = [k for k, v in patterns.items() if v]
        if detected_patterns:
            return {
                'type': detected_patterns[0],
                'confidence': 0.8,
                'anomalies': anomalies,
                'recommended_response': self.get_incident_response(detected_patterns[0])
            }
        
        return None
    
    def get_incident_response(self, attack_type: str) -> Dict:
        """Get incident response plan for attack type"""
        responses = {
            'brute_force': {
                'actions': ['block_ips', 'force_mfa', 'reset_passwords'],
                'severity': 'HIGH',
                'notify': ['security_team', 'affected_users']
            },
            'data_exfiltration': {
                'actions': ['terminate_sessions', 'block_data_access', 'forensic_analysis'],
                'severity': 'CRITICAL',
                'notify': ['security_team', 'legal', 'management']
            },
            'ddos': {
                'actions': ['enable_ddos_protection', 'scale_infrastructure', 'rate_limit'],
                'severity': 'HIGH',
                'notify': ['ops_team', 'security_team']
            },
            'account_takeover': {
                'actions': ['lock_account', 'terminate_all_sessions', 'require_password_reset'],
                'severity': 'CRITICAL',
                'notify': ['user', 'security_team']
            }
        }
        
        return responses.get(attack_type, {})
    
    async def trigger_incident_response(self, attack_pattern: Dict):
        """Trigger automated incident response"""
        response_plan = attack_pattern['recommended_response']
        
        for action in response_plan.get('actions', []):
            await self.execute_response_action(action, attack_pattern)
        
        # Send notifications
        for recipient in response_plan.get('notify', []):
            await self.send_security_alert(recipient, attack_pattern)
        
        # Log incident
        await self.log_security_incident(attack_pattern)
```

## 6. Incident Response

### 6.1 Incident Response Plan

#### Automated Response Playbooks
```yaml
# incident-response/playbooks/data-breach.yml
name: Data Breach Response
severity: CRITICAL
triggers:
  - unauthorized_data_access
  - mass_data_download
  - privilege_escalation

phases:
  detection:
    duration: 0-5 minutes
    actions:
      - validate_alert
      - gather_initial_evidence
      - determine_scope
  
  containment:
    duration: 5-30 minutes
    actions:
      - isolate_affected_systems:
          - terminate_suspicious_sessions
          - block_compromised_accounts
          - disable_affected_api_keys
      - preserve_evidence:
          - snapshot_systems
          - capture_logs
          - record_network_traffic
  
  eradication:
    duration: 30-120 minutes
    actions:
      - remove_malicious_access:
          - revoke_all_tokens
          - reset_passwords
          - rotate_secrets
      - patch_vulnerabilities:
          - apply_security_updates
          - fix_configuration_issues
  
  recovery:
    duration: 2-24 hours
    actions:
      - restore_services:
          - verify_system_integrity
          - restore_from_clean_backup
          - re-enable_services
      - monitor_closely:
          - enhanced_logging
          - increased_alerting
  
  lessons_learned:
    duration: 1-7 days
    actions:
      - conduct_post_mortem
      - update_security_controls
      - improve_detection_rules
      - train_team

notifications:
  immediate:
    - security_team
    - cto
  within_1_hour:
    - legal_counsel
    - ceo
  within_24_hours:
    - affected_customers
    - regulatory_bodies
```

### 6.2 Backup & Recovery

#### Automated Backup Strategy
```bash
#!/bin/bash
# backup-strategy.sh

# Database backups
pg_dump $DATABASE_URL | gzip | \
  aws s3 cp - s3://promoteros-backups/postgres/$(date +%Y%m%d_%H%M%S).sql.gz \
  --sse aws:kms --sse-kms-key-id $KMS_KEY_ID

# Redis backup
redis-cli --rdb /tmp/redis-backup.rdb
aws s3 cp /tmp/redis-backup.rdb \
  s3://promoteros-backups/redis/$(date +%Y%m%d_%H%M%S).rdb \
  --sse aws:kms --sse-kms-key-id $KMS_KEY_ID

# Application data backup
tar -czf /tmp/app-data.tar.gz /app/data
aws s3 cp /tmp/app-data.tar.gz \
  s3://promoteros-backups/app/$(date +%Y%m%d_%H%M%S).tar.gz \
  --sse aws:kms --sse-kms-key-id $KMS_KEY_ID

# Verify backups
aws s3api head-object --bucket promoteros-backups \
  --key postgres/$(date +%Y%m%d)_*.sql.gz || alert_failure

# Cleanup old backups (retain 30 days)
aws s3 ls s3://promoteros-backups/ --recursive | \
  awk '{print $4}' | \
  while read file; do
    age=$(( ( $(date +%s) - $(date -d "${file:0:8}" +%s) ) / 86400 ))
    if [ $age -gt 30 ]; then
      aws s3 rm "s3://promoteros-backups/$file"
    fi
  done
```

## 7. Compliance & Governance

### 7.1 GDPR Compliance

```typescript
// services/compliance/gdpr-service.ts
export class GDPRComplianceService {
  async handleDataRequest(userId: string, requestType: 'access' | 'portability' | 'deletion') {
    switch (requestType) {
      case 'access':
        return this.provideDataAccess(userId);
      case 'portability':
        return this.exportUserData(userId);
      case 'deletion':
        return this.deleteUserData(userId);
    }
  }
  
  private async provideDataAccess(userId: string) {
    // Collect all user data
    const userData = await this.collectAllUserData(userId);
    
    // Generate report
    const report = {
      personalData: userData.personal,
      activityData: userData.activity,
      processingPurposes: this.getProcessingPurposes(),
      dataRetention: this.getRetentionPolicies(),
      thirdPartySharing: this.getThirdPartySharing()
    };
    
    // Log access request
    await this.logComplianceAction('data_access', userId);
    
    return report;
  }
  
  private async deleteUserData(userId: string) {
    // Soft delete with audit trail
    await prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        email: `deleted_${userId}@deleted.com`,
        personalData: null
      }
    });
    
    // Schedule hard delete after retention period
    await this.scheduleHardDelete(userId, 30); // 30 days
    
    // Log deletion
    await this.logComplianceAction('data_deletion', userId);
  }
}
```

## 8. Security Checklist

### Pre-Production Checklist
- [ ] All dependencies updated to latest secure versions
- [ ] Security headers configured (HSTS, CSP, etc.)
- [ ] TLS 1.3 enforced with strong ciphers
- [ ] Authentication system tested
- [ ] Rate limiting implemented
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention verified
- [ ] XSS protection tested
- [ ] CSRF tokens implemented
- [ ] Secrets rotated and stored securely
- [ ] Logging and monitoring configured
- [ ] Backup and recovery tested
- [ ] Incident response plan documented
- [ ] Security training completed
- [ ] Penetration testing performed
- [ ] Compliance requirements met

## Conclusion

This comprehensive system hardening strategy provides defense-in-depth security for PromoterOS. Implementation should be prioritized based on risk assessment, with critical security controls (authentication, encryption, input validation) deployed first.

**Implementation Timeline**: 3-4 weeks for complete hardening
**Required Expertise**: Security Engineer + DevSecOps Engineer
**Estimated Cost**: $50-75K including tools and testing

Regular security audits and continuous monitoring ensure the system remains secure as it evolves.

---
*System Hardening Requirements Complete*
*Next Review: Quarterly security assessment*

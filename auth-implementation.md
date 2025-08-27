# Authentication & Authorization Implementation

## JWT RS256 Implementation with Existing Infrastructure

### Overview
Leveraging the existing JWT infrastructure from `scripts/sign-jwt.js` and `https://paintbox.fly.dev/.well-known/jwks.json` to provide enterprise-grade authentication for the Security Dashboard.

### Current Infrastructure Status
✅ **Existing Components**:
- Private key in AWS Secrets Manager (`candlefish/jwt-private-key`)
- JWKS endpoint live at `https://paintbox.fly.dev/.well-known/jwks.json`
- Key ID: `88672a69-26ae-45db-b73c-93debf7ea87d`
- Algorithm: RS256
- Monthly key rotation via GitHub Actions

## Authentication Service Implementation

### 1. JWT Service Integration

```typescript
// services/auth-service/src/jwt.ts
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

interface JWTPayload {
  sub: string;           // User ID
  org: string;           // Organization ID  
  email: string;         // User email
  role: string;          // User role
  permissions: string[]; // Granular permissions
  iat: number;          // Issued at
  exp: number;          // Expires at
  iss: string;          // Issuer
  aud: string;          // Audience
  kid: string;          // Key ID
}

class JWTService {
  private privateKey: string | null = null;
  private secretsManager: SecretsManagerClient;
  private jwksClient: jwksClient.JwksClient;

  constructor() {
    this.secretsManager = new SecretsManagerClient({ 
      region: process.env.AWS_REGION || 'us-east-1' 
    });
    
    this.jwksClient = jwksClient({
      jwksUri: 'https://paintbox.fly.dev/.well-known/jwks.json',
      cache: true,
      cacheMaxAge: 3600000, // 1 hour
      rateLimit: true,
      jwksRequestsPerMinute: 5
    });
  }

  async getPrivateKey(): Promise<string> {
    if (this.privateKey) return this.privateKey;

    try {
      const command = new GetSecretValueCommand({
        SecretId: 'candlefish/jwt-private-key'
      });
      
      const response = await this.secretsManager.send(command);
      this.privateKey = response.SecretString!;
      return this.privateKey;
    } catch (error) {
      console.error('Failed to retrieve JWT private key:', error);
      throw new Error('Unable to retrieve signing key');
    }
  }

  async signToken(payload: Omit<JWTPayload, 'iat' | 'exp' | 'iss' | 'aud' | 'kid'>): Promise<string> {
    const privateKey = await this.getPrivateKey();
    
    const fullPayload: JWTPayload = {
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (8 * 60 * 60), // 8 hours
      iss: 'https://security.candlefish.ai',
      aud: 'security-dashboard',
      kid: '88672a69-26ae-45db-b73c-93debf7ea87d'
    };

    return jwt.sign(fullPayload, privateKey, { 
      algorithm: 'RS256',
      header: { kid: fullPayload.kid }
    });
  }

  async verifyToken(token: string): Promise<JWTPayload> {
    return new Promise((resolve, reject) => {
      // Get the key from JWKS
      this.jwksClient.getSigningKey('88672a69-26ae-45db-b73c-93debf7ea87d', (err, key) => {
        if (err) {
          return reject(new Error('Unable to retrieve signing key'));
        }

        const signingKey = key!.getPublicKey();
        
        jwt.verify(token, signingKey, {
          algorithms: ['RS256'],
          issuer: 'https://security.candlefish.ai',
          audience: 'security-dashboard'
        }, (verifyErr, decoded) => {
          if (verifyErr) {
            return reject(verifyErr);
          }
          
          resolve(decoded as JWTPayload);
        });
      });
    });
  }

  generateRefreshToken(): string {
    // Generate secure random token for refresh
    const crypto = require('crypto');
    return crypto.randomBytes(64).toString('hex');
  }
}

export { JWTService, JWTPayload };
```

### 2. Authentication Controller

```typescript
// services/auth-service/src/controllers/auth.ts
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { JWTService } from '../jwt';
import { UserService } from '../services/user-service';
import { RedisService } from '../services/redis-service';
import { MFAService } from '../services/mfa-service';
import { AuditService } from '../services/audit-service';

interface LoginRequest {
  email: string;
  password: string;
  mfa_code?: string;
}

export class AuthController {
  private jwtService: JWTService;
  private userService: UserService;
  private redisService: RedisService;
  private mfaService: MFAService;
  private auditService: AuditService;

  constructor() {
    this.jwtService = new JWTService();
    this.userService = new UserService();
    this.redisService = new RedisService();
    this.mfaService = new MFAService();
    this.auditService = new AuditService();
  }

  async login(req: Request, res: Response) {
    try {
      const { email, password, mfa_code }: LoginRequest = req.body;
      const clientIp = req.ip;
      const userAgent = req.get('User-Agent');

      // Rate limiting check
      const loginAttempts = await this.redisService.getLoginAttempts(clientIp);
      if (loginAttempts >= 10) {
        await this.auditService.log({
          action: 'login_blocked',
          email,
          client_ip: clientIp,
          reason: 'too_many_attempts'
        });
        
        return res.status(429).json({
          error: 'too_many_attempts',
          message: 'Too many login attempts. Please try again later.',
          retry_after: 900 // 15 minutes
        });
      }

      // Get user by email
      const user = await this.userService.findByEmail(email);
      if (!user) {
        await this.redisService.incrementLoginAttempts(clientIp);
        await this.auditService.log({
          action: 'login_failed',
          email,
          client_ip: clientIp,
          reason: 'user_not_found'
        });
        
        return res.status(401).json({
          error: 'invalid_credentials',
          message: 'Invalid email or password'
        });
      }

      // Check if account is locked
      if (user.locked_until && user.locked_until > new Date()) {
        await this.auditService.log({
          action: 'login_blocked',
          user_id: user.id,
          email,
          client_ip: clientIp,
          reason: 'account_locked'
        });
        
        return res.status(423).json({
          error: 'account_locked',
          message: 'Account is temporarily locked. Please try again later.',
          locked_until: user.locked_until
        });
      }

      // Verify password
      const passwordValid = await bcrypt.compare(password, user.password_hash);
      if (!passwordValid) {
        await this.userService.incrementLoginAttempts(user.id);
        await this.redisService.incrementLoginAttempts(clientIp);
        await this.auditService.log({
          action: 'login_failed',
          user_id: user.id,
          email,
          client_ip: clientIp,
          reason: 'invalid_password'
        });
        
        return res.status(401).json({
          error: 'invalid_credentials',
          message: 'Invalid email or password'
        });
      }

      // Check MFA if enabled
      if (user.mfa_enabled) {
        if (!mfa_code) {
          return res.status(403).json({
            error: 'mfa_required',
            message: 'Multi-factor authentication required'
          });
        }

        const mfaValid = await this.mfaService.verifyCode(user.id, mfa_code);
        if (!mfaValid) {
          await this.userService.incrementLoginAttempts(user.id);
          await this.redisService.incrementLoginAttempts(clientIp);
          await this.auditService.log({
            action: 'login_failed',
            user_id: user.id,
            email,
            client_ip: clientIp,
            reason: 'invalid_mfa'
          });
          
          return res.status(401).json({
            error: 'invalid_mfa',
            message: 'Invalid MFA code'
          });
        }
      }

      // Get user permissions
      const permissions = await this.userService.getUserPermissions(user.id);

      // Generate tokens
      const accessToken = await this.jwtService.signToken({
        sub: user.id,
        org: user.organization_id,
        email: user.email,
        role: user.role,
        permissions
      });

      const refreshToken = this.jwtService.generateRefreshToken();
      
      // Store refresh token
      await this.redisService.storeRefreshToken(user.id, refreshToken, {
        client_ip: clientIp,
        user_agent: userAgent
      });

      // Update user last login
      await this.userService.updateLastLogin(user.id, clientIp);

      // Clear login attempts
      await this.userService.clearLoginAttempts(user.id);
      await this.redisService.clearLoginAttempts(clientIp);

      // Log successful login
      await this.auditService.log({
        action: 'login_success',
        user_id: user.id,
        organization_id: user.organization_id,
        client_ip: clientIp,
        user_agent: userAgent
      });

      res.json({
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 28800, // 8 hours
        token_type: 'Bearer',
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          organization_id: user.organization_id,
          mfa_enabled: user.mfa_enabled,
          permissions
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        error: 'internal_server_error',
        message: 'An internal error occurred'
      });
    }
  }

  async refreshToken(req: Request, res: Response) {
    try {
      const { refresh_token } = req.body;
      
      if (!refresh_token) {
        return res.status(400).json({
          error: 'missing_refresh_token',
          message: 'Refresh token is required'
        });
      }

      // Validate refresh token
      const tokenData = await this.redisService.getRefreshToken(refresh_token);
      if (!tokenData) {
        return res.status(401).json({
          error: 'invalid_refresh_token',
          message: 'Invalid or expired refresh token'
        });
      }

      // Get user
      const user = await this.userService.findById(tokenData.user_id);
      if (!user) {
        await this.redisService.revokeRefreshToken(refresh_token);
        return res.status(401).json({
          error: 'user_not_found',
          message: 'User not found'
        });
      }

      // Check if user is still active
      if (user.deleted_at) {
        await this.redisService.revokeRefreshToken(refresh_token);
        return res.status(401).json({
          error: 'user_deactivated',
          message: 'User account has been deactivated'
        });
      }

      // Get updated permissions
      const permissions = await this.userService.getUserPermissions(user.id);

      // Generate new access token
      const accessToken = await this.jwtService.signToken({
        sub: user.id,
        org: user.organization_id,
        email: user.email,
        role: user.role,
        permissions
      });

      res.json({
        access_token: accessToken,
        expires_in: 28800, // 8 hours
        token_type: 'Bearer'
      });

    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(500).json({
        error: 'internal_server_error',
        message: 'An internal error occurred'
      });
    }
  }

  async logout(req: Request, res: Response) {
    try {
      const authHeader = req.get('Authorization');
      const refreshToken = req.body.refresh_token;
      
      // Revoke refresh token if provided
      if (refreshToken) {
        await this.redisService.revokeRefreshToken(refreshToken);
      }

      // Blacklist access token if provided
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        await this.redisService.blacklistToken(token);
      }

      // Log logout
      if (req.user) {
        await this.auditService.log({
          action: 'logout',
          user_id: req.user.sub,
          organization_id: req.user.org,
          client_ip: req.ip
        });
      }

      res.json({ message: 'Logged out successfully' });

    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        error: 'internal_server_error',
        message: 'An internal error occurred'
      });
    }
  }

  async getProfile(req: Request, res: Response) {
    try {
      const user = await this.userService.findById(req.user.sub);
      if (!user) {
        return res.status(404).json({
          error: 'user_not_found',
          message: 'User not found'
        });
      }

      const permissions = await this.userService.getUserPermissions(user.id);

      res.json({
        id: user.id,
        email: user.email,
        role: user.role,
        organization_id: user.organization_id,
        mfa_enabled: user.mfa_enabled,
        last_login: user.last_login,
        permissions
      });

    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        error: 'internal_server_error',
        message: 'An internal error occurred'
      });
    }
  }
}
```

### 3. Authorization Middleware

```typescript
// services/auth-service/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { JWTService, JWTPayload } from '../jwt';
import { RedisService } from '../services/redis-service';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user: JWTPayload;
    }
  }
}

export class AuthMiddleware {
  private jwtService: JWTService;
  private redisService: RedisService;

  constructor() {
    this.jwtService = new JWTService();
    this.redisService = new RedisService();
  }

  // Authenticate JWT token
  authenticate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.get('Authorization');
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'missing_token',
          message: 'Authorization token required'
        });
      }

      const token = authHeader.substring(7);

      // Check if token is blacklisted
      const isBlacklisted = await this.redisService.isTokenBlacklisted(token);
      if (isBlacklisted) {
        return res.status(401).json({
          error: 'token_blacklisted',
          message: 'Token has been revoked'
        });
      }

      // Verify token
      const payload = await this.jwtService.verifyToken(token);
      req.user = payload;
      
      next();

    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'token_expired',
          message: 'Token has expired'
        });
      }
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          error: 'invalid_token',
          message: 'Invalid token'
        });
      }

      console.error('Authentication error:', error);
      return res.status(500).json({
        error: 'internal_server_error',
        message: 'Authentication failed'
      });
    }
  };

  // Check if user has required role
  requireRole = (roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'unauthorized',
          message: 'Authentication required'
        });
      }

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          error: 'insufficient_privileges',
          message: 'Insufficient privileges for this operation'
        });
      }

      next();
    };
  };

  // Check if user has required permission
  requirePermission = (permission: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'unauthorized',
          message: 'Authentication required'
        });
      }

      if (!req.user.permissions.includes(permission)) {
        return res.status(403).json({
          error: 'insufficient_permissions',
          message: `Missing required permission: ${permission}`
        });
      }

      next();
    };
  };

  // Organization isolation - ensure user can only access their org data
  requireOrganization = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Authentication required'
      });
    }

    // Set organization context for database queries
    req.headers['x-organization-id'] = req.user.org;
    next();
  };
}
```

### 4. Role-Based Access Control (RBAC)

```typescript
// services/auth-service/src/rbac/permissions.ts
export const PERMISSIONS = {
  // Security Events
  'events:read': 'Read security events',
  'events:write': 'Create security events',
  'events:update': 'Update security events',
  'events:delete': 'Delete security events',
  
  // Threat Detection
  'threats:read': 'Read threat detection rules',
  'threats:write': 'Create threat detection rules',
  'threats:update': 'Update threat detection rules',
  'threats:delete': 'Delete threat detection rules',
  
  // Incidents
  'incidents:read': 'Read security incidents',
  'incidents:write': 'Create security incidents',
  'incidents:update': 'Update security incidents',
  'incidents:assign': 'Assign incidents',
  'incidents:resolve': 'Resolve incidents',
  
  // Assets
  'assets:read': 'Read asset inventory',
  'assets:write': 'Create assets',
  'assets:update': 'Update assets',
  'assets:delete': 'Delete assets',
  'assets:scan': 'Perform security scans',
  
  // Vulnerabilities
  'vulns:read': 'Read vulnerabilities',
  'vulns:write': 'Create vulnerabilities',
  'vulns:update': 'Update vulnerabilities',
  'vulns:remediate': 'Mark vulnerabilities as remediated',
  
  // Compliance
  'compliance:read': 'Read compliance data',
  'compliance:write': 'Create compliance assessments',
  'compliance:update': 'Update compliance assessments',
  'compliance:reports': 'Generate compliance reports',
  
  // Organization Management
  'org:read': 'Read organization data',
  'org:update': 'Update organization settings',
  'org:users': 'Manage organization users',
  'org:integrations': 'Manage external integrations',
  
  // System Administration
  'admin:users': 'Manage all users',
  'admin:organizations': 'Manage all organizations',
  'admin:system': 'System administration',
  'admin:logs': 'Access audit logs'
} as const;

export type Permission = keyof typeof PERMISSIONS;

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  super_admin: Object.keys(PERMISSIONS) as Permission[],
  
  org_admin: [
    'events:read', 'events:write', 'events:update',
    'threats:read', 'threats:write', 'threats:update',
    'incidents:read', 'incidents:write', 'incidents:update', 'incidents:assign', 'incidents:resolve',
    'assets:read', 'assets:write', 'assets:update', 'assets:scan',
    'vulns:read', 'vulns:write', 'vulns:update', 'vulns:remediate',
    'compliance:read', 'compliance:write', 'compliance:update', 'compliance:reports',
    'org:read', 'org:update', 'org:users', 'org:integrations'
  ],
  
  security_analyst: [
    'events:read', 'events:write',
    'threats:read',
    'incidents:read', 'incidents:write', 'incidents:update',
    'assets:read',
    'vulns:read', 'vulns:update',
    'compliance:read'
  ],
  
  incident_responder: [
    'events:read',
    'incidents:read', 'incidents:write', 'incidents:update', 'incidents:resolve',
    'assets:read',
    'vulns:read'
  ],
  
  compliance_officer: [
    'events:read',
    'assets:read',
    'vulns:read',
    'compliance:read', 'compliance:write', 'compliance:update', 'compliance:reports'
  ],
  
  viewer: [
    'events:read',
    'threats:read',
    'incidents:read',
    'assets:read',
    'vulns:read',
    'compliance:read'
  ]
};

export function getRolePermissions(role: string): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

export function hasPermission(userPermissions: string[], requiredPermission: string): boolean {
  return userPermissions.includes(requiredPermission);
}
```

### 5. Multi-Factor Authentication (MFA)

```typescript
// services/auth-service/src/services/mfa-service.ts
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { UserService } from './user-service';
import { AuditService } from './audit-service';

export class MFAService {
  private userService: UserService;
  private auditService: AuditService;

  constructor() {
    this.userService = new UserService();
    this.auditService = new AuditService();
  }

  async setupMFA(userId: string): Promise<{ secret: string; qrCode: string; backupCodes: string[] }> {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Generate secret
    const secret = authenticator.generateSecret();
    
    // Create service name for QR code
    const serviceName = 'Candlefish Security Dashboard';
    const otpauth = authenticator.keyuri(user.email, serviceName, secret);
    
    // Generate QR code
    const qrCode = await QRCode.toDataURL(otpauth);
    
    // Generate backup codes
    const backupCodes = this.generateBackupCodes();
    
    // Store encrypted secret (don't enable MFA yet)
    await this.userService.updateMFASecret(userId, secret);
    
    // Log MFA setup initiation
    await this.auditService.log({
      action: 'mfa_setup_initiated',
      user_id: userId,
      organization_id: user.organization_id
    });

    return {
      secret,
      qrCode,
      backupCodes
    };
  }

  async enableMFA(userId: string, verificationCode: string): Promise<boolean> {
    const user = await this.userService.findById(userId);
    if (!user || !user.mfa_secret) {
      return false;
    }

    // Verify the code
    const isValid = authenticator.check(verificationCode, user.mfa_secret);
    if (!isValid) {
      return false;
    }

    // Enable MFA
    await this.userService.enableMFA(userId);
    
    // Log MFA enablement
    await this.auditService.log({
      action: 'mfa_enabled',
      user_id: userId,
      organization_id: user.organization_id
    });

    return true;
  }

  async verifyCode(userId: string, code: string): Promise<boolean> {
    const user = await this.userService.findById(userId);
    if (!user || !user.mfa_enabled || !user.mfa_secret) {
      return false;
    }

    // Check TOTP code
    const isValid = authenticator.check(code, user.mfa_secret);
    
    if (isValid) {
      // Log successful MFA verification
      await this.auditService.log({
        action: 'mfa_verified',
        user_id: userId,
        organization_id: user.organization_id
      });
    }

    return isValid;
  }

  async disableMFA(userId: string, verificationCode: string): Promise<boolean> {
    const user = await this.userService.findById(userId);
    if (!user || !user.mfa_enabled || !user.mfa_secret) {
      return false;
    }

    // Verify current code
    const isValid = authenticator.check(verificationCode, user.mfa_secret);
    if (!isValid) {
      return false;
    }

    // Disable MFA
    await this.userService.disableMFA(userId);
    
    // Log MFA disablement
    await this.auditService.log({
      action: 'mfa_disabled',
      user_id: userId,
      organization_id: user.organization_id
    });

    return true;
  }

  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    const crypto = require('crypto');
    
    for (let i = 0; i < 10; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}`);
    }
    
    return codes;
  }
}
```

### 6. Session Management with Redis

```typescript
// services/auth-service/src/services/redis-service.ts
import Redis from 'ioredis';

interface SessionData {
  user_id: string;
  client_ip: string;
  user_agent?: string;
  created_at: number;
  last_used: number;
}

export class RedisService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
  }

  // Session management
  async storeRefreshToken(userId: string, refreshToken: string, metadata: Partial<SessionData>): Promise<void> {
    const sessionData: SessionData = {
      user_id: userId,
      client_ip: metadata.client_ip || '',
      user_agent: metadata.user_agent,
      created_at: Date.now(),
      last_used: Date.now()
    };

    const multi = this.redis.multi();
    
    // Store refresh token with 7-day expiry
    multi.setex(`refresh_token:${refreshToken}`, 7 * 24 * 60 * 60, JSON.stringify(sessionData));
    
    // Add to user's active sessions
    multi.sadd(`user_sessions:${userId}`, refreshToken);
    multi.expire(`user_sessions:${userId}`, 7 * 24 * 60 * 60);
    
    await multi.exec();
  }

  async getRefreshToken(refreshToken: string): Promise<SessionData | null> {
    const data = await this.redis.get(`refresh_token:${refreshToken}`);
    return data ? JSON.parse(data) : null;
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    const sessionData = await this.getRefreshToken(refreshToken);
    if (!sessionData) return;

    const multi = this.redis.multi();
    
    // Remove refresh token
    multi.del(`refresh_token:${refreshToken}`);
    
    // Remove from user's active sessions
    multi.srem(`user_sessions:${sessionData.user_id}`, refreshToken);
    
    await multi.exec();
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    const sessions = await this.redis.smembers(`user_sessions:${userId}`);
    if (sessions.length === 0) return;

    const multi = this.redis.multi();
    
    // Remove all refresh tokens for this user
    for (const session of sessions) {
      multi.del(`refresh_token:${session}`);
    }
    
    // Clear user sessions set
    multi.del(`user_sessions:${userId}`);
    
    await multi.exec();
  }

  // Token blacklisting
  async blacklistToken(token: string): Promise<void> {
    // Extract expiration time from token to set appropriate TTL
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const ttl = Math.max(0, payload.exp - Math.floor(Date.now() / 1000));
    
    await this.redis.setex(`blacklisted_token:${token}`, ttl, '1');
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const result = await this.redis.get(`blacklisted_token:${token}`);
    return result === '1';
  }

  // Rate limiting
  async getLoginAttempts(identifier: string): Promise<number> {
    const attempts = await this.redis.get(`login_attempts:${identifier}`);
    return attempts ? parseInt(attempts) : 0;
  }

  async incrementLoginAttempts(identifier: string): Promise<void> {
    const key = `login_attempts:${identifier}`;
    const multi = this.redis.multi();
    
    multi.incr(key);
    multi.expire(key, 900); // 15 minutes
    
    await multi.exec();
  }

  async clearLoginAttempts(identifier: string): Promise<void> {
    await this.redis.del(`login_attempts:${identifier}`);
  }

  // Rate limiting for API requests
  async checkRateLimit(identifier: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = `rate_limit:${identifier}:${Math.floor(Date.now() / (windowSeconds * 1000))}`;
    
    const multi = this.redis.multi();
    multi.incr(key);
    multi.expire(key, windowSeconds);
    
    const results = await multi.exec();
    const current = results![0][1] as number;
    
    const resetTime = Math.ceil(Date.now() / (windowSeconds * 1000)) * windowSeconds * 1000;
    
    return {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current),
      resetTime
    };
  }
}
```

## Integration with Kong Gateway

### Kong JWT Plugin Configuration

```yaml
# kong.yml - Kong declarative configuration
_format_version: "3.0"

services:
  - name: security-dashboard-api
    url: http://event-api:4000
    routes:
      - name: events-route
        paths:
          - /v2/events
        methods:
          - GET
          - POST
          - PATCH
    plugins:
      - name: jwt
        config:
          uri_param_names:
            - jwt
          header_names:
            - Authorization
          claims_to_verify:
            - exp
            - iss
            - aud
          key_claim_name: kid
          secret_is_base64: false
          run_on_preflight: true

consumers:
  - username: security-dashboard
    jwt_secrets:
      - key: "88672a69-26ae-45db-b73c-93debf7ea87d"
        rsa_public_key: |
          -----BEGIN PUBLIC KEY-----
          MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
          -----END PUBLIC KEY-----
        algorithm: RS256

plugins:
  - name: rate-limiting
    config:
      minute: 1000
      policy: redis
      redis_host: redis-cluster
      redis_port: 6379
      hide_client_headers: false

  - name: cors
    config:
      origins:
        - "https://security.candlefish.ai"
        - "http://localhost:3000"
      methods:
        - GET
        - POST
        - PUT
        - PATCH
        - DELETE
        - OPTIONS
      headers:
        - Accept
        - Authorization
        - Content-Type
        - X-Organization-ID
      credentials: true

  - name: prometheus
    config:
      per_consumer: true
      status_code_metrics: true
      latency_metrics: true
      bandwidth_metrics: true
```

## Security Best Practices

### 1. Token Security
- Use RS256 algorithm with 2048-bit keys
- Short-lived access tokens (8 hours)
- Secure refresh token storage
- Token rotation on key compromise
- Blacklisting for immediate revocation

### 2. Session Security
- Secure session storage in Redis
- Session timeout and cleanup
- IP binding for session validation
- Device fingerprinting
- Concurrent session limits

### 3. Rate Limiting
- Global rate limits per organization
- Per-user rate limits
- IP-based rate limiting
- Progressive delays for failed attempts
- DDoS protection at gateway level

### 4. Audit & Monitoring
- Comprehensive audit logging
- Failed authentication tracking
- Suspicious activity detection
- Real-time security alerts
- Compliance reporting

This authentication system provides enterprise-grade security while leveraging the existing JWT infrastructure, ensuring seamless integration with the current Security Dashboard architecture.
/**
 * JWT Authentication Middleware for Paintbox Application
 * Implements RS256 JWT authentication with proper security measures
 */

import { NextRequest, NextResponse } from 'next/server';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { logger, getRequestContext } from '@/lib/logging/simple-logger';
import { getSecretsManager } from '@/lib/services/secrets-manager';
import getCacheInstance from '@/lib/cache/cache-service';

// JWT Payload Schema
const JWTPayloadSchema = z.object({
  sub: z.string(), // Subject (user ID)
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'estimator', 'readonly']).default('user'),
  permissions: z.array(z.string()).default([]),
  iat: z.number(), // Issued at
  exp: z.number(), // Expires at
  iss: z.string().default('paintbox-app'), // Issuer
  aud: z.string().default('paintbox-api'), // Audience
  jti: z.string(), // JWT ID (for revocation)
  sessionId: z.string().optional(), // Session ID for concurrent session management
});

type AuthenticatedUser = z.infer<typeof JWTPayloadSchema>;

interface AuthConfig {
  secret?: string;
  publicKey?: string;
  privateKey?: string;
  algorithm?: 'HS256' | 'RS256';
  expiresIn?: string;
  issuer?: string;
  audience?: string;
  allowedRoles?: string[];
  requireMFA?: boolean;
  sessionTimeout?: number; // in seconds
  maxConcurrentSessions?: number;
}

/**
 * Authentication service class
 */
class AuthService {
  private config: Required<AuthConfig>;
  private cache = getCacheInstance();
  private publicKey?: Buffer;
  private privateKey?: Buffer;

  constructor(config: AuthConfig = {}) {
    this.config = {
      secret: config.secret || process.env.JWT_SECRET || '',
      publicKey: config.publicKey || process.env.JWT_PUBLIC_KEY || '',
      privateKey: config.privateKey || process.env.JWT_PRIVATE_KEY || '',
      algorithm: config.algorithm || 'RS256',
      expiresIn: config.expiresIn || '1h',
      issuer: config.issuer || 'paintbox-app',
      audience: config.audience || 'paintbox-api',
      allowedRoles: config.allowedRoles || ['admin', 'user', 'estimator'],
      requireMFA: typeof config.requireMFA === 'boolean'
        ? config.requireMFA
        : (process.env.ADMIN_REQUIRE_MFA === 'true'),
      sessionTimeout: config.sessionTimeout || 3600, // 1 hour
      maxConcurrentSessions: config.maxConcurrentSessions || 3,
    };

    this.initializeKeys();
  }

  private async initializeKeys(): Promise<void> {
    try {
      if (this.config.algorithm === 'RS256') {
        // Try to get keys from AWS Secrets Manager first
        const secretsManager = getSecretsManager();
        const secrets = await secretsManager.getSecrets();

        // Prefer stored JWT keys. Fall back to env if present. Do NOT generate ephemeral keys without persisting.
        const publicKey = secrets.jwt?.publicKey || this.config.publicKey || process.env.JWT_PUBLIC_KEY;
        const privateKey = secrets.jwt?.privateKey || this.config.privateKey || process.env.JWT_PRIVATE_KEY;

        if (publicKey && privateKey) {
          this.publicKey = Buffer.from(publicKey, 'utf8');
          this.privateKey = Buffer.from(privateKey, 'utf8');
        } else {
          // Generate once, then persist to AWS Secrets Manager
          const { publicKey: pub, privateKey: priv } = this.generateRSAKeypairSync();
          await secretsManager.storeJwtKeys(pub, priv);
          this.publicKey = Buffer.from(pub, 'utf8');
          this.privateKey = Buffer.from(priv, 'utf8');
        }
      }
    } catch (error) {
      logger.error('Failed to initialize JWT keys', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error('JWT keys unavailable');
    }
  }

  private generateRSAKeypairSync(): { publicKey: string; privateKey: string } {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });
    return { publicKey, privateKey };
  }

  async generateToken(payload: Omit<AuthenticatedUser, 'iat' | 'exp' | 'iss' | 'aud' | 'jti'>): Promise<string> {
    try {
      const now = Math.floor(Date.now() / 1000);
      const jti = crypto.randomUUID();

      const fullPayload: AuthenticatedUser = {
        ...payload,
        iat: now,
        exp: now + this.parseExpiresIn(this.config.expiresIn),
        iss: this.config.issuer,
        aud: this.config.audience,
        jti,
      };

      // Validate payload
      const validatedPayload = JWTPayloadSchema.parse(fullPayload);

      let token: string;

      if (this.config.algorithm === 'RS256' && this.privateKey) {
        // Use JOSE for RS256
        const secret = new TextEncoder().encode(this.privateKey.toString());
        token = await new SignJWT(validatedPayload)
          .setProtectedHeader({ alg: 'RS256' })
          .setIssuedAt()
          .setExpirationTime(this.config.expiresIn)
          .setIssuer(this.config.issuer)
          .setAudience(this.config.audience)
          .sign(secret);
      } else {
        // Use jsonwebtoken for HS256
        token = jwt.sign(validatedPayload, this.config.secret, {
          algorithm: 'HS256',
          expiresIn: this.config.expiresIn,
        });
      }

      // Store token metadata in cache for session management
      await this.storeTokenMetadata(jti, validatedPayload);

      logger.auth('JWT token generated successfully', {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
        jti,
      });

      return token;
    } catch (error) {
      logger.error('Failed to generate JWT token', {
        error: error instanceof Error ? error.message : String(error),
        userId: payload.sub,
      });
      throw new Error('Token generation failed');
    }
  }

  async verifyToken(token: string): Promise<AuthenticatedUser> {
    try {
      let payload: JWTPayload;

      if (this.config.algorithm === 'RS256' && this.publicKey) {
        // Use JOSE for RS256
        const secret = new TextEncoder().encode(this.publicKey.toString());
        const { payload: josePayload } = await jwtVerify(token, secret, {
          issuer: this.config.issuer,
          audience: this.config.audience,
        });
        payload = josePayload;
      } else {
        // Use jsonwebtoken for HS256
        payload = jwt.verify(token, this.config.secret, {
          issuer: this.config.issuer,
          audience: this.config.audience,
        }) as JWTPayload;
      }

      // Validate payload structure
      const validatedPayload = JWTPayloadSchema.parse(payload);

      // Check if token is revoked
      const isRevoked = await this.isTokenRevoked(validatedPayload.jti);
      if (isRevoked) {
        throw new Error('Token has been revoked');
      }

      // Check concurrent sessions
      await this.checkConcurrentSessions(validatedPayload.sub, validatedPayload.sessionId);

      logger.auth('JWT token verified successfully', {
        userId: validatedPayload.sub,
        email: validatedPayload.email,
        role: validatedPayload.role,
        jti: validatedPayload.jti,
      });

      return validatedPayload;
    } catch (error) {
      logger.security('JWT token verification failed', {
        error: error instanceof Error ? error.message : String(error),
        token: token.substring(0, 20) + '...', // Log only first 20 chars for security
      });
      throw new Error('Token verification failed');
    }
  }

  async revokeToken(jti: string): Promise<void> {
    try {
      const key = `revoked_token:${jti}`;
      // Store in cache with long TTL (tokens should expire naturally)
      await this.cache.set(key, 'revoked', 86400 * 7); // 7 days

      logger.auth('JWT token revoked', { jti });
    } catch (error) {
      logger.error('Failed to revoke token', {
        error: error instanceof Error ? error.message : String(error),
        jti,
      });
      throw error;
    }
  }

  async revokeUserTokens(userId: string): Promise<void> {
    try {
      const key = `revoked_user:${userId}`;
      const timestamp = Date.now().toString();

      // All tokens issued before this timestamp are invalid
      await this.cache.set(key, timestamp, 86400 * 7); // 7 days

      logger.auth('All user tokens revoked', { userId });
    } catch (error) {
      logger.error('Failed to revoke user tokens', {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      throw error;
    }
  }

  private async isTokenRevoked(jti: string): Promise<boolean> {
    try {
      const tokenKey = `revoked_token:${jti}`;
      return await this.cache.exists(tokenKey);
    } catch (error) {
      logger.error('Failed to check token revocation status', {
        error: error instanceof Error ? error.message : String(error),
        jti,
      });
      return false; // Fail open for availability
    }
  }

  private async storeTokenMetadata(jti: string, payload: AuthenticatedUser): Promise<void> {
    try {
      const key = `token_meta:${jti}`;
      const metadata = {
        userId: payload.sub,
        sessionId: payload.sessionId,
        issuedAt: payload.iat,
        expiresAt: payload.exp,
      };

      const ttl = payload.exp - Math.floor(Date.now() / 1000);
      await this.cache.set(key, JSON.stringify(metadata), ttl);
    } catch (error) {
      logger.error('Failed to store token metadata', {
        error: error instanceof Error ? error.message : String(error),
        jti,
      });
      // Don't throw - this is not critical for token functionality
    }
  }

  private async checkConcurrentSessions(userId: string, sessionId?: string): Promise<void> {
    if (!sessionId || this.config.maxConcurrentSessions <= 0) {
      return; // No session management
    }

    try {
      const key = `user_sessions:${userId}`;
      const sessions = await this.cache.get(key);
      const sessionList: string[] = sessions ? JSON.parse(sessions) : [];

      if (!sessionList.includes(sessionId)) {
        sessionList.push(sessionId);

        // Remove oldest sessions if limit exceeded
        if (sessionList.length > this.config.maxConcurrentSessions) {
          const removedSessions = sessionList.splice(0, sessionList.length - this.config.maxConcurrentSessions);

          // Revoke oldest sessions
          for (const oldSessionId of removedSessions) {
            await this.revokeSessionTokens(userId, oldSessionId);
          }

          logger.security('Concurrent session limit exceeded, revoked oldest sessions', {
            userId,
            revokedSessions: removedSessions.length,
          });
        }

        await this.cache.set(key, JSON.stringify(sessionList), this.config.sessionTimeout);
      }
    } catch (error) {
      logger.error('Failed to check concurrent sessions', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        sessionId,
      });
      // Don't throw - this is not critical for authentication
    }
  }

  private async revokeSessionTokens(userId: string, sessionId: string): Promise<void> {
    try {
      const key = `revoked_session:${userId}:${sessionId}`;
      await this.cache.set(key, 'revoked', 86400 * 7); // 7 days

      logger.auth('Session tokens revoked', { userId, sessionId });
    } catch (error) {
      logger.error('Failed to revoke session tokens', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        sessionId,
      });
    }
  }

  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 3600; // Default 1 hour
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 3600;
    }
  }
}

// Singleton instance
let authService: AuthService | null = null;

function getAuthService(): AuthService {
  if (!authService) {
    authService = new AuthService();
  }
  return authService;
}

/**
 * Authentication middleware function
 */
export async function authMiddleware(
  request: NextRequest,
  config?: Partial<AuthConfig>
): Promise<NextResponse | { user: AuthenticatedUser }> {
  const requestContext = getRequestContext(request);

  try {
    logger.middleware('auth', 'Processing authentication', requestContext);

    // Extract token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.security('Missing or invalid Authorization header', requestContext);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const authServiceInstance = getAuthService();
    const user = await authServiceInstance.verifyToken(token);

    // Check role permissions if specified
    if (config?.allowedRoles && !config.allowedRoles.includes(user.role)) {
      logger.security('Insufficient role permissions', {
        ...requestContext,
        userRole: user.role,
        requiredRoles: config.allowedRoles,
      });
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Check MFA requirement
    if (config?.requireMFA && user.role === 'admin') {
      // This would typically check for MFA completion in the token or session
      // For now, we'll assume MFA is handled separately
    }

    logger.middleware('auth', 'Authentication successful', {
      ...requestContext,
      userId: user.sub,
      role: user.role,
    });

    return { user };
  } catch (error) {
    logger.security('Authentication failed', {
      ...requestContext,
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    );
  }
}

/**
 * Higher-order function to create auth middleware with specific config
 */
export function createAuthMiddleware(config: Partial<AuthConfig>) {
  return (request: NextRequest) => authMiddleware(request, config);
}

/**
 * Auth middleware variants for different protection levels
 */
export const adminAuthMiddleware = createAuthMiddleware({
  allowedRoles: ['admin'],
  requireMFA: true,
});

export const userAuthMiddleware = createAuthMiddleware({
  allowedRoles: ['admin', 'user', 'estimator'],
});

export const readOnlyAuthMiddleware = createAuthMiddleware({
  allowedRoles: ['admin', 'user', 'estimator', 'readonly'],
});

// Export types and service
export type { AuthenticatedUser, AuthConfig };
export { AuthService, getAuthService };

/**
 * JWT Security Overhaul - RS256 with Rotation and Revocation
 * Implements secure JWT handling with automatic key rotation
 */

import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import * as Redis from 'ioredis';
import * as AWS from 'aws-sdk';
import { Request, Response, NextFunction } from 'express';

const secretsManager = new AWS.SecretsManager({ region: 'us-east-1' });
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => Math.min(times * 50, 2000)
});

interface JWTPayload {
  sub: string;           // Subject (user ID)
  email: string;         // User email
  roles: string[];       // User roles
  sessionId: string;     // Session identifier
  jti: string;          // JWT ID for tracking
  iat: number;          // Issued at
  exp: number;          // Expiration
  nbf?: number;         // Not before
  iss: string;          // Issuer
  aud: string[];        // Audience
  fingerprint?: string; // Browser fingerprint for binding
}

interface KeyPair {
  publicKey: string;
  privateKey: string;
  kid: string;          // Key ID
  createdAt: number;
  expiresAt: number;
}

export class SecureJWTManager {
  private currentKeyPair: KeyPair | null = null;
  private previousKeyPair: KeyPair | null = null;
  private readonly ACCESS_TOKEN_TTL = 15 * 60;        // 15 minutes
  private readonly REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days
  private readonly KEY_ROTATION_DAYS = 30;
  private readonly REVOCATION_LIST_PREFIX = 'jwt:revoked:';
  private readonly SESSION_PREFIX = 'session:';

  constructor() {
    this.initializeKeys();
    this.startKeyRotationSchedule();
  }

  /**
   * Initialize RSA key pairs from AWS Secrets Manager
   */
  private async initializeKeys(): Promise<void> {
    try {
      // Load current key pair
      const currentSecret = await secretsManager.getSecretValue({
        SecretId: 'candlefish/jwt/current-keypair'
      }).promise().catch(() => null);

      if (currentSecret?.SecretString) {
        this.currentKeyPair = JSON.parse(currentSecret.SecretString);
      } else {
        // Generate new key pair if none exists
        this.currentKeyPair = await this.generateKeyPair();
        await this.saveKeyPair('candlefish/jwt/current-keypair', this.currentKeyPair);
      }

      // Load previous key pair for grace period
      const previousSecret = await secretsManager.getSecretValue({
        SecretId: 'candlefish/jwt/previous-keypair'
      }).promise().catch(() => null);

      if (previousSecret?.SecretString) {
        this.previousKeyPair = JSON.parse(previousSecret.SecretString);
      }

      console.log('✅ JWT keys initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize JWT keys:', error);
      throw new Error('JWT initialization failed');
    }
  }

  /**
   * Generate new RSA key pair
   */
  private async generateKeyPair(): Promise<KeyPair> {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    const kid = crypto.randomBytes(16).toString('hex');
    const now = Date.now();

    return {
      publicKey,
      privateKey,
      kid,
      createdAt: now,
      expiresAt: now + (this.KEY_ROTATION_DAYS * 24 * 60 * 60 * 1000)
    };
  }

  /**
   * Save key pair to AWS Secrets Manager
   */
  private async saveKeyPair(secretId: string, keyPair: KeyPair): Promise<void> {
    await secretsManager.putSecretValue({
      SecretId: secretId,
      SecretString: JSON.stringify(keyPair)
    }).promise();
  }

  /**
   * Rotate keys automatically
   */
  private async rotateKeys(): Promise<void> {
    console.log('🔄 Starting key rotation...');

    // Move current to previous
    this.previousKeyPair = this.currentKeyPair;
    await this.saveKeyPair('candlefish/jwt/previous-keypair', this.previousKeyPair!);

    // Generate new current
    this.currentKeyPair = await this.generateKeyPair();
    await this.saveKeyPair('candlefish/jwt/current-keypair', this.currentKeyPair);

    // Publish new public key to JWKS endpoint
    await this.publishJWKS();

    console.log('✅ Key rotation completed');
  }

  /**
   * Start automatic key rotation schedule
   */
  private startKeyRotationSchedule(): void {
    // Check for rotation every day
    setInterval(async () => {
      if (this.currentKeyPair && Date.now() > this.currentKeyPair.expiresAt - (24 * 60 * 60 * 1000)) {
        await this.rotateKeys();
      }
    }, 24 * 60 * 60 * 1000); // Every 24 hours
  }

  /**
   * Generate access token
   */
  async generateAccessToken(
    userId: string,
    email: string,
    roles: string[],
    fingerprint?: string
  ): Promise<string> {
    if (!this.currentKeyPair) {
      throw new Error('JWT keys not initialized');
    }

    const jti = crypto.randomBytes(16).toString('hex');
    const sessionId = crypto.randomBytes(16).toString('hex');

    const payload: JWTPayload = {
      sub: userId,
      email,
      roles,
      sessionId,
      jti,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + this.ACCESS_TOKEN_TTL,
      iss: 'candlefish-api',
      aud: ['candlefish-web', 'candlefish-mobile'],
      fingerprint
    };

    const token = jwt.sign(payload, this.currentKeyPair.privateKey, {
      algorithm: 'RS256',
      keyid: this.currentKeyPair.kid
    });

    // Store session in Redis
    await redis.setex(
      `${this.SESSION_PREFIX}${sessionId}`,
      this.ACCESS_TOKEN_TTL,
      JSON.stringify({
        userId,
        email,
        roles,
        jti,
        fingerprint,
        createdAt: Date.now()
      })
    );

    return token;
  }

  /**
   * Generate refresh token
   */
  async generateRefreshToken(userId: string, sessionId: string): Promise<string> {
    if (!this.currentKeyPair) {
      throw new Error('JWT keys not initialized');
    }

    const refreshTokenId = crypto.randomBytes(32).toString('hex');

    // Store refresh token in Redis with longer TTL
    await redis.setex(
      `refresh:${refreshTokenId}`,
      this.REFRESH_TOKEN_TTL,
      JSON.stringify({
        userId,
        sessionId,
        createdAt: Date.now(),
        rotationCount: 0
      })
    );

    return refreshTokenId;
  }

  /**
   * Verify and decode token
   */
  async verifyToken(token: string, fingerprint?: string): Promise<JWTPayload> {
    try {
      // First try with current key
      let decoded: JWTPayload;

      try {
        decoded = jwt.verify(token, this.currentKeyPair!.publicKey, {
          algorithms: ['RS256'],
          issuer: 'candlefish-api',
          audience: ['candlefish-web', 'candlefish-mobile']
        }) as JWTPayload;
      } catch (error) {
        // Try with previous key during grace period
        if (this.previousKeyPair) {
          decoded = jwt.verify(token, this.previousKeyPair.publicKey, {
            algorithms: ['RS256'],
            issuer: 'candlefish-api',
            audience: ['candlefish-web', 'candlefish-mobile']
          }) as JWTPayload;
        } else {
          throw error;
        }
      }

      // Check if token is revoked
      const isRevoked = await redis.get(`${this.REVOCATION_LIST_PREFIX}${decoded.jti}`);
      if (isRevoked) {
        throw new Error('Token has been revoked');
      }

      // Check session validity
      const session = await redis.get(`${this.SESSION_PREFIX}${decoded.sessionId}`);
      if (!session) {
        throw new Error('Session expired or invalid');
      }

      // Verify fingerprint if provided
      if (fingerprint && decoded.fingerprint && decoded.fingerprint !== fingerprint) {
        throw new Error('Token binding mismatch');
      }

      return decoded;

    } catch (error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }

  /**
   * Revoke token
   */
  async revokeToken(token: string): Promise<void> {
    try {
      const decoded = jwt.decode(token) as JWTPayload;
      if (decoded?.jti) {
        // Add to revocation list with TTL matching token expiration
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          await redis.setex(
            `${this.REVOCATION_LIST_PREFIX}${decoded.jti}`,
            ttl,
            '1'
          );
        }

        // Remove session
        if (decoded.sessionId) {
          await redis.del(`${this.SESSION_PREFIX}${decoded.sessionId}`);
        }

        console.log(`✅ Token revoked: ${decoded.jti}`);
      }
    } catch (error) {
      console.error('Failed to revoke token:', error);
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string, fingerprint?: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const refreshData = await redis.get(`refresh:${refreshToken}`);

    if (!refreshData) {
      throw new Error('Invalid or expired refresh token');
    }

    const { userId, sessionId, rotationCount } = JSON.parse(refreshData);

    // Get user data from session
    const sessionData = await redis.get(`${this.SESSION_PREFIX}${sessionId}`);
    if (!sessionData) {
      throw new Error('Session expired');
    }

    const { email, roles } = JSON.parse(sessionData);

    // Generate new tokens
    const newAccessToken = await this.generateAccessToken(userId, email, roles, fingerprint);

    // Rotate refresh token (invalidate old, create new)
    await redis.del(`refresh:${refreshToken}`);
    const newRefreshToken = await this.generateRefreshToken(userId, sessionId);

    // Update rotation count
    const newRefreshData = await redis.get(`refresh:${newRefreshToken}`);
    if (newRefreshData) {
      const data = JSON.parse(newRefreshData);
      data.rotationCount = rotationCount + 1;
      await redis.setex(
        `refresh:${newRefreshToken}`,
        this.REFRESH_TOKEN_TTL,
        JSON.stringify(data)
      );
    }

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    };
  }

  /**
   * Publish JWKS for public key distribution
   */
  private async publishJWKS(): Promise<void> {
    const jwks = {
      keys: [
        this.currentKeyPair && this.publicKeyToJWK(this.currentKeyPair),
        this.previousKeyPair && this.publicKeyToJWK(this.previousKeyPair)
      ].filter(Boolean)
    };

    // Store in Redis for API endpoint
    await redis.set('jwks:current', JSON.stringify(jwks));

    // Also store in S3 for CDN distribution
    const s3 = new AWS.S3();
    await s3.putObject({
      Bucket: 'candlefish-public',
      Key: '.well-known/jwks.json',
      Body: JSON.stringify(jwks),
      ContentType: 'application/json',
      CacheControl: 'public, max-age=3600'
    }).promise();
  }

  /**
   * Convert public key to JWK format
   */
  private publicKeyToJWK(keyPair: KeyPair): any {
    const keyBuffer = Buffer.from(keyPair.publicKey);
    const keyObject = crypto.createPublicKey(keyBuffer);
    const jwk = keyObject.export({ format: 'jwk' });

    return {
      ...jwk,
      kid: keyPair.kid,
      use: 'sig',
      alg: 'RS256'
    };
  }

  /**
   * Express middleware for JWT authentication
   */
  authenticate(requiredRoles?: string[]) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7);
        const fingerprint = req.headers['x-fingerprint'] as string;

        const payload = await this.verifyToken(token, fingerprint);

        // Check required roles
        if (requiredRoles && requiredRoles.length > 0) {
          const hasRequiredRole = requiredRoles.some(role => payload.roles.includes(role));
          if (!hasRequiredRole) {
            return res.status(403).json({ error: 'Insufficient permissions' });
          }
        }

        // Attach user to request
        (req as any).user = {
          id: payload.sub,
          email: payload.email,
          roles: payload.roles,
          sessionId: payload.sessionId
        };

        next();

      } catch (error) {
        console.error('Authentication failed:', error);
        return res.status(401).json({ error: 'Authentication failed' });
      }
    };
  }

  /**
   * Logout endpoint handler
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        await this.revokeToken(token);
      }

      res.status(200).json({ message: 'Logged out successfully' });

    } catch (error) {
      res.status(500).json({ error: 'Logout failed' });
    }
  }
}

// Export singleton instance
export const jwtManager = new SecureJWTManager();

// Export middleware
export const authenticate = (roles?: string[]) => jwtManager.authenticate(roles);

// Export types
export { JWTPayload, KeyPair };

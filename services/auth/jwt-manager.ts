/**
 * JWT Key Management with AWS Secrets Manager
 * Ensures persistent JWT keys across deployments
 */

import jwt from 'jsonwebtoken';
import { SecretsManagerClient, GetSecretValueCommand, CreateSecretCommand, UpdateSecretCommand } from '@aws-sdk/client-secrets-manager';
import crypto from 'crypto';

export class JWTManager {
  private client: SecretsManagerClient;
  private secretName: string;
  private jwtSecret: string | null = null;
  private publicKey: string | null = null;
  private privateKey: string | null = null;

  constructor(environment: string = 'production') {
    this.client = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });
    this.secretName = `candlefish/${environment}/jwt-keys`;
  }

  /**
   * Initialize JWT keys - retrieve from AWS Secrets Manager or create new ones
   */
  async initialize(): Promise<void> {
    try {
      // Try to retrieve existing keys
      const command = new GetSecretValueCommand({ SecretId: this.secretName });
      const response = await this.client.send(command);

      if (response.SecretString) {
        const secrets = JSON.parse(response.SecretString);
        this.jwtSecret = secrets.jwtSecret;
        this.publicKey = secrets.publicKey;
        this.privateKey = secrets.privateKey;

        console.log('✅ JWT keys loaded from AWS Secrets Manager');
      }
    } catch (error: any) {
      if (error.name === 'ResourceNotFoundException') {
        // Keys don't exist, create new ones
        await this.createAndStoreKeys();
      } else {
        throw error;
      }
    }
  }

  /**
   * Create new JWT keys and store in AWS Secrets Manager
   */
  private async createAndStoreKeys(): Promise<void> {
    // Generate a strong secret for HMAC
    this.jwtSecret = crypto.randomBytes(64).toString('hex');

    // Generate RSA key pair for RS256
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    this.publicKey = publicKey;
    this.privateKey = privateKey;

    // Store in AWS Secrets Manager
    const secretData = {
      jwtSecret: this.jwtSecret,
      publicKey: this.publicKey,
      privateKey: this.privateKey,
      createdAt: new Date().toISOString(),
      algorithm: 'RS256',
    };

    try {
      const command = new CreateSecretCommand({
        Name: this.secretName,
        Description: 'JWT signing keys for Candlefish platform',
        SecretString: JSON.stringify(secretData),
        Tags: [
          { Key: 'Environment', Value: process.env.NODE_ENV || 'production' },
          { Key: 'Service', Value: 'candlefish-auth' },
          { Key: 'ManagedBy', Value: 'jwt-manager' },
        ],
      });

      await this.client.send(command);
      console.log('✅ New JWT keys created and stored in AWS Secrets Manager');
    } catch (error: any) {
      if (error.name === 'ResourceExistsException') {
        // Secret was created by another instance, retrieve it
        await this.initialize();
      } else {
        throw error;
      }
    }
  }

  /**
   * Sign a JWT token
   */
  async signToken(payload: any, options?: jwt.SignOptions): Promise<string> {
    if (!this.privateKey) {
      await this.initialize();
    }

    return jwt.sign(payload, this.privateKey!, {
      algorithm: 'RS256',
      expiresIn: '24h',
      issuer: 'candlefish.ai',
      ...options,
    });
  }

  /**
   * Verify a JWT token
   */
  async verifyToken(token: string): Promise<any> {
    if (!this.publicKey) {
      await this.initialize();
    }

    return jwt.verify(token, this.publicKey!, {
      algorithms: ['RS256'],
      issuer: 'candlefish.ai',
    });
  }

  /**
   * Rotate JWT keys (for security)
   */
  async rotateKeys(): Promise<void> {
    // Keep old keys for grace period
    const oldPublicKey = this.publicKey;
    const oldPrivateKey = this.privateKey;

    // Generate new keys
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    this.publicKey = publicKey;
    this.privateKey = privateKey;
    this.jwtSecret = crypto.randomBytes(64).toString('hex');

    // Update in AWS Secrets Manager with rotation metadata
    const secretData = {
      jwtSecret: this.jwtSecret,
      publicKey: this.publicKey,
      privateKey: this.privateKey,
      oldPublicKey: oldPublicKey, // Keep for verifying old tokens
      oldPrivateKey: oldPrivateKey,
      rotatedAt: new Date().toISOString(),
      algorithm: 'RS256',
    };

    const command = new UpdateSecretCommand({
      SecretId: this.secretName,
      SecretString: JSON.stringify(secretData),
    });

    await this.client.send(command);
    console.log('✅ JWT keys rotated successfully');
  }

  /**
   * Get public key for token verification (can be shared)
   */
  async getPublicKey(): Promise<string> {
    if (!this.publicKey) {
      await this.initialize();
    }
    return this.publicKey!;
  }

  /**
   * Create access and refresh tokens
   */
  async createTokenPair(userId: string, metadata?: any): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const accessToken = await this.signToken(
      {
        userId,
        type: 'access',
        ...metadata,
      },
      { expiresIn: '1h' }
    );

    const refreshToken = await this.signToken(
      {
        userId,
        type: 'refresh',
        tokenFamily: crypto.randomBytes(16).toString('hex'),
      },
      { expiresIn: '30d' }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600, // 1 hour in seconds
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    expiresIn: number;
  }> {
    const decoded = await this.verifyToken(refreshToken);

    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    const accessToken = await this.signToken(
      {
        userId: decoded.userId,
        type: 'access',
      },
      { expiresIn: '1h' }
    );

    return {
      accessToken,
      expiresIn: 3600,
    };
  }
}

// Singleton instance
let jwtManager: JWTManager | null = null;

export function getJWTManager(): JWTManager {
  if (!jwtManager) {
    jwtManager = new JWTManager(process.env.NODE_ENV || 'production');
  }
  return jwtManager;
}

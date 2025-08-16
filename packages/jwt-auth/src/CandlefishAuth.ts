import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import * as jwt from 'jsonwebtoken';
import NodeCache from 'node-cache';
import { 
  JWTConfig, 
  TokenPayload, 
  TokenPair, 
  JWKSKey,
  VerifyOptions
} from './types';
import { 
  jwkToPem, 
  generateJti, 
  getExpirationTime,
  parseAuthHeader 
} from './utils';
import { JWKSProvider } from './JWKSProvider';

export class CandlefishAuth {
  private config: JWTConfig;
  private secretsClient: SecretsManagerClient | null = null;
  private cache: NodeCache;
  private jwksProvider: JWKSProvider | null = null;
  private privateKey: string | null = null;
  private keyId: string | null = null;

  constructor(config: JWTConfig) {
    this.config = {
      region: 'us-east-1',
      expiresIn: '24h',
      refreshExpiresIn: '7d',
      cacheTimeout: 600, // 10 minutes
      ...config
    };

    // Initialize cache
    this.cache = new NodeCache({ 
      stdTTL: this.config.cacheTimeout!,
      checkperiod: 120 
    });

    // Initialize AWS Secrets Manager if secretId is provided
    if (this.config.secretId) {
      this.secretsClient = new SecretsManagerClient({
        region: this.config.region
      });
    }

    // Initialize JWKS provider if jwksUrl is provided
    if (this.config.jwksUrl) {
      this.jwksProvider = new JWKSProvider(this.config.jwksUrl, this.cache);
    }
  }

  /**
   * Sign a JWT token
   */
  async signToken(payload: TokenPayload): Promise<string> {
    if (!this.config.secretId) {
      throw new Error('secretId is required for signing tokens');
    }

    // Get private key from cache or AWS
    if (!this.privateKey || !this.keyId) {
      await this.loadPrivateKey();
    }

    const now = Math.floor(Date.now() / 1000);
    const enrichedPayload = {
      ...payload,
      iat: now,
      exp: getExpirationTime(this.config.expiresIn!),
      iss: this.config.issuer || 'candlefish.ai',
      aud: this.config.audience,
      jti: generateJti()
    };

    return jwt.sign(enrichedPayload, this.privateKey!, {
      algorithm: 'RS256',
      keyid: this.keyId!
    });
  }

  /**
   * Verify a JWT token
   */
  async verifyToken(token: string, options?: VerifyOptions): Promise<TokenPayload> {
    if (!this.jwksProvider && !this.privateKey) {
      throw new Error('Either jwksUrl or secretId is required for verifying tokens');
    }

    const issuer = options?.issuer || this.config.issuer;
    const audience = options?.audience || this.config.audience;
    
    const verifyOptions: jwt.VerifyOptions = {
      algorithms: ['RS256'],
      issuer: Array.isArray(issuer) ? issuer[0] : issuer,
      audience: Array.isArray(audience) ? audience[0] : audience,
      ignoreExpiration: options?.ignoreExpiration || false,
      clockTolerance: options?.clockTolerance || 0
    };

    // If using JWKS
    if (this.jwksProvider) {
      const decoded = jwt.decode(token, { complete: true }) as any;
      if (!decoded || !decoded.header || !decoded.header.kid) {
        throw new Error('Invalid token: missing kid in header');
      }

      const publicKey = await this.jwksProvider.getKey(decoded.header.kid);
      return jwt.verify(token, publicKey, verifyOptions) as TokenPayload;
    }

    // If using local private key (for testing/development)
    if (this.privateKey) {
      return jwt.verify(token, this.privateKey, verifyOptions) as TokenPayload;
    }

    throw new Error('No key available for verification');
  }

  /**
   * Generate a refresh token
   */
  async generateRefreshToken(userId: string): Promise<string> {
    const payload: TokenPayload = {
      sub: userId,
      type: 'refresh',
      jti: generateJti()
    };

    const now = Math.floor(Date.now() / 1000);
    const enrichedPayload = {
      ...payload,
      iat: now,
      exp: getExpirationTime(this.config.refreshExpiresIn!),
      iss: this.config.issuer || 'candlefish.ai'
    };

    if (!this.privateKey || !this.keyId) {
      await this.loadPrivateKey();
    }

    return jwt.sign(enrichedPayload, this.privateKey!, {
      algorithm: 'RS256',
      keyid: this.keyId!
    });
  }

  /**
   * Refresh access and refresh tokens
   */
  async refreshToken(refreshToken: string): Promise<TokenPair> {
    // Verify refresh token
    const decoded = await this.verifyToken(refreshToken);
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    // Generate new tokens
    const accessToken = await this.signToken({
      sub: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions
    });

    const newRefreshToken = await this.generateRefreshToken(decoded.sub);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: typeof this.config.expiresIn === 'number' 
        ? this.config.expiresIn 
        : 86400, // Default 24 hours in seconds
      tokenType: 'Bearer'
    };
  }

  /**
   * Get public keys in JWKS format
   */
  async getPublicKeys(): Promise<{ keys: any[] }> {
    if (!this.config.secretId) {
      throw new Error('secretId is required to get public keys');
    }

    const cacheKey = 'public-keys';
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached as { keys: any[] };
    }

    const command = new GetSecretValueCommand({
      SecretId: this.config.secretId.replace('private-key', 'public-keys')
    });

    const response = await this.secretsClient!.send(command);
    const publicKeys = JSON.parse(response.SecretString!);

    const jwks = {
      keys: Object.entries(publicKeys).map(([kid, key]: [string, any]) => ({
        kty: key.kty || 'RSA',
        use: key.use || 'sig',
        kid: kid,
        alg: key.alg || 'RS256',
        n: key.n,
        e: key.e
      }))
    };

    this.cache.set(cacheKey, jwks);
    return jwks;
  }

  /**
   * Extract token from Authorization header
   */
  extractToken(authHeader: string | undefined): string | null {
    return parseAuthHeader(authHeader);
  }

  /**
   * Load private key from AWS Secrets Manager
   */
  private async loadPrivateKey(): Promise<void> {
    if (!this.secretsClient || !this.config.secretId) {
      throw new Error('AWS Secrets Manager not configured');
    }

    const cacheKey = 'private-key';
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      const { key, kid } = cached as { key: string; kid: string };
      this.privateKey = key;
      this.keyId = kid;
      return;
    }

    const command = new GetSecretValueCommand({
      SecretId: this.config.secretId
    });

    const response = await this.secretsClient.send(command);
    const privateKeyJwk = JSON.parse(response.SecretString!) as JWKSKey;
    
    this.privateKey = jwkToPem(privateKeyJwk);
    this.keyId = privateKeyJwk.kid;

    this.cache.set(cacheKey, { 
      key: this.privateKey, 
      kid: this.keyId 
    });
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.flushAll();
    this.privateKey = null;
    this.keyId = null;
  }
}
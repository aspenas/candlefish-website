import { CandlefishAuth } from '../src/CandlefishAuth';
import { TokenPayload } from '../src/types';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

// Mock AWS SDK
jest.mock('@aws-sdk/client-secrets-manager', () => ({
  SecretsManagerClient: jest.fn().mockImplementation(() => ({
    send: jest.fn()
  })),
  GetSecretValueCommand: jest.fn()
}));

describe('CandlefishAuth', () => {
  let auth: CandlefishAuth;
  
  // Generate test keys
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });

  beforeEach(() => {
    auth = new CandlefishAuth({
      issuer: 'test.candlefish.ai',
      audience: 'test-audience',
      expiresIn: '1h'
    });
  });

  describe('signToken', () => {
    it('should sign a token with provided payload', async () => {
      const payload: TokenPayload = {
        sub: 'user123',
        email: 'test@example.com',
        role: 'admin'
      };

      // Mock the private key loading
      jest.spyOn(auth as any, 'loadPrivateKey').mockResolvedValue(undefined);
      (auth as any).privateKey = privateKey;
      (auth as any).keyId = 'test-key-id';

      const token = await auth.signToken(payload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      // Verify the token structure
      const decoded = jwt.decode(token, { complete: true }) as any;
      expect(decoded.header.kid).toBe('test-key-id');
      expect(decoded.header.alg).toBe('RS256');
      expect(decoded.payload.sub).toBe('user123');
      expect(decoded.payload.email).toBe('test@example.com');
      expect(decoded.payload.role).toBe('admin');
    });

    it('should throw error if secretId is not configured', async () => {
      const authWithoutSecret = new CandlefishAuth({});
      
      await expect(authWithoutSecret.signToken({ sub: 'user123' }))
        .rejects.toThrow('secretId is required for signing tokens');
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', async () => {
      const payload: TokenPayload = {
        sub: 'user123',
        email: 'test@example.com'
      };

      // Create a test token
      const token = jwt.sign(
        {
          ...payload,
          iss: 'test.candlefish.ai',
          aud: 'test-audience',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600
        },
        privateKey,
        {
          algorithm: 'RS256',
          header: { kid: 'test-key-id' }
        }
      );

      // Mock JWKS provider
      (auth as any).privateKey = privateKey;
      
      const verified = await auth.verifyToken(token);
      expect(verified.sub).toBe('user123');
      expect(verified.email).toBe('test@example.com');
    });

    it('should reject expired tokens', async () => {
      const token = jwt.sign(
        {
          sub: 'user123',
          iat: Math.floor(Date.now() / 1000) - 7200,
          exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
        },
        privateKey,
        { algorithm: 'RS256' }
      );

      (auth as any).privateKey = privateKey;
      
      await expect(auth.verifyToken(token))
        .rejects.toThrow('jwt expired');
    });
  });

  describe('refreshToken', () => {
    it('should generate new token pair from refresh token', async () => {
      // Mock private key
      jest.spyOn(auth as any, 'loadPrivateKey').mockResolvedValue(undefined);
      (auth as any).privateKey = privateKey;
      (auth as any).keyId = 'test-key-id';

      // Create a valid refresh token
      const refreshToken = jwt.sign(
        {
          sub: 'user123',
          type: 'refresh',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 86400
        },
        privateKey,
        { algorithm: 'RS256' }
      );

      const tokenPair = await auth.refreshToken(refreshToken);
      
      expect(tokenPair).toHaveProperty('accessToken');
      expect(tokenPair).toHaveProperty('refreshToken');
      expect(tokenPair).toHaveProperty('expiresIn');
      expect(tokenPair.tokenType).toBe('Bearer');
    });

    it('should reject non-refresh tokens', async () => {
      (auth as any).privateKey = privateKey;
      
      const accessToken = jwt.sign(
        {
          sub: 'user123',
          type: 'access',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600
        },
        privateKey,
        { algorithm: 'RS256' }
      );

      await expect(auth.refreshToken(accessToken))
        .rejects.toThrow('Invalid token type');
    });
  });

  describe('extractToken', () => {
    it('should extract token from Bearer header', () => {
      const token = auth.extractToken('Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...');
      expect(token).toBe('eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...');
    });

    it('should return null for invalid header', () => {
      expect(auth.extractToken('Invalid header')).toBeNull();
      expect(auth.extractToken(undefined)).toBeNull();
      expect(auth.extractToken('Basic auth')).toBeNull();
    });
  });

  describe('clearCache', () => {
    it('should clear all cached data', () => {
      (auth as any).privateKey = 'test-key';
      (auth as any).keyId = 'test-id';
      
      auth.clearCache();
      
      expect((auth as any).privateKey).toBeNull();
      expect((auth as any).keyId).toBeNull();
    });
  });
});
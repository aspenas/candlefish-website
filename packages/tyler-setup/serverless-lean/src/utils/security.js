import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION });

// Cache for secrets to avoid repeated API calls
const secretsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get JWT secret from AWS Secrets Manager
 */
export const getJwtSecret = async () => {
  const cacheKey = 'jwt-secret';
  const cached = secretsCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.value;
  }
  
  try {
    const command = new GetSecretValueCommand({
      SecretId: `${process.env.SECRETS_PREFIX}/jwt-secret`
    });
    
    const result = await secretsClient.send(command);
    const secret = JSON.parse(result.SecretString).secret;
    
    // Cache the secret
    secretsCache.set(cacheKey, {
      value: secret,
      timestamp: Date.now()
    });
    
    return secret;
  } catch (error) {
    console.error('Failed to retrieve JWT secret from Secrets Manager:', error);
    // Throw error instead of using insecure fallback
    throw new Error('JWT secret not available. Please ensure AWS Secrets Manager is properly configured.');
  }
};

/**
 * Hash password using Argon2
 */
export const hashPassword = async (password) => {
  try {
    return await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16, // 64 MB
      timeCost: 3,
      parallelism: 1,
    });
  } catch (error) {
    console.error('Password hashing error:', error);
    throw new Error('Failed to hash password');
  }
};

/**
 * Verify password using Argon2
 */
export const verifyPassword = async (hash, password) => {
  try {
    return await argon2.verify(hash, password);
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
};

/**
 * Generate secure JWT token
 */
export const generateJwtToken = async (payload, expiresIn = '24h') => {
  const secret = await getJwtSecret();
  return jwt.sign(payload, secret, {
    expiresIn,
    issuer: process.env.SECRETS_PREFIX,
    audience: 'candlefish-employee-setup',
    algorithm: 'HS256'
  });
};

/**
 * Verify JWT token
 */
export const verifyJwtToken = async (token) => {
  const secret = await getJwtSecret();
  return jwt.verify(token, secret, {
    issuer: process.env.SECRETS_PREFIX,
    audience: 'candlefish-employee-setup',
    algorithms: ['HS256']
  });
};

/**
 * Generate secure refresh token
 */
export const generateRefreshToken = () => {
  return require('crypto').randomBytes(64).toString('hex');
};

/**
 * Security headers for responses
 */
export const getSecurityHeaders = () => ({
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'",
  'Referrer-Policy': 'strict-origin-when-cross-origin'
});

/**
 * Rate limiting configuration
 */
export const RATE_LIMITS = {
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: 'Too many authentication attempts, please try again later'
  },
  API: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: 'Too many requests, please try again later'
  },
  SECRETS: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // 20 secrets operations per window
    message: 'Too many secrets operations, please try again later'
  }
};
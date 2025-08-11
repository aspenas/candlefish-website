import dotenv from 'dotenv';
import { Config } from '../types';

// Load environment variables
dotenv.config();

const requiredEnvVars = [
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_SECRET',
  'SESSION_SECRET'
];

// Validate required environment variables
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

const parseNumber = (value: string | undefined, defaultValue: number): number => {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

const parseBoolean = (value: string | undefined, defaultValue: boolean): boolean => {
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
};

const parseDuration = (duration: string): number => {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: throw new Error(`Unsupported duration unit: ${unit}`);
  }
};

export const config: Config = {
  database: {
    url: process.env.DATABASE_URL!,
  },
  redis: {
    url: process.env.REDIS_URL!,
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'auth:',
  },
  jwt: {
    secret: process.env.JWT_SECRET!,
    accessTokenExpiry: process.env.JWT_ACCESS_TOKEN_EXPIRY || '15m',
    refreshTokenExpiry: process.env.JWT_REFRESH_TOKEN_EXPIRY || '7d',
    issuer: process.env.JWT_ISSUER || 'candlefish-auth',
    audience: process.env.JWT_AUDIENCE || 'candlefish-api',
  },
  server: {
    port: parseNumber(process.env.PORT, 3000),
    host: process.env.HOST || '0.0.0.0',
    apiVersion: process.env.API_VERSION || 'v1',
  },
  security: {
    bcryptRounds: parseNumber(process.env.BCRYPT_ROUNDS, 12),
    maxLoginAttempts: parseNumber(process.env.MAX_LOGIN_ATTEMPTS, 5),
    accountLockTime: process.env.ACCOUNT_LOCK_TIME || '15m',
    sessionSecret: process.env.SESSION_SECRET!,
  },
  rateLimit: {
    windowMs: parseNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000), // 15 minutes
    maxRequests: parseNumber(process.env.RATE_LIMIT_MAX_REQUESTS, 100),
  },
  email: {
    smtp: {
      host: process.env.SMTP_HOST || 'localhost',
      port: parseNumber(process.env.SMTP_PORT, 587),
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
    from: process.env.FROM_EMAIL || 'noreply@candlefish.ai',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableRequestLogging: parseBoolean(process.env.ENABLE_REQUEST_LOGGING, true),
  },
};

// Export utility functions
export { parseDuration, parseNumber, parseBoolean };

// Environment validation
export const isProduction = (): boolean => process.env.NODE_ENV === 'production';
export const isDevelopment = (): boolean => process.env.NODE_ENV === 'development';
export const isTest = (): boolean => process.env.NODE_ENV === 'test';

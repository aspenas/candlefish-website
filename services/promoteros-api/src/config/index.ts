import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  // Server configuration
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3002'),

  // Database
  DATABASE_URL: process.env.DATABASE_URL!,

  // Redis
  REDIS_URL: process.env.REDIS_URL,

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // CORS
  CORS_ORIGINS: process.env.CORS_ORIGIN ?
    process.env.CORS_ORIGIN.split(',') :
    ['http://localhost:3001'],

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100'),

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_FORMAT: process.env.LOG_FORMAT || 'combined',

  // Monitoring
  SENTRY_DSN: process.env.SENTRY_DSN,
  OPENTELEMETRY_ENABLED: process.env.OPENTELEMETRY_ENABLED === 'true',

  // Email
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@promoteros.candlefish.ai',
  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER || 'aws-ses',

  // AWS
  AWS_REGION: process.env.AWS_REGION || 'us-east-1',
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
} as const;

// Validate required configuration
if (!config.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

export default config;

/**
 * AWS Secrets Manager Service
 * Handles secure retrieval of secrets from AWS Secrets Manager
 * Implements caching and automatic retry logic
 */

import {
  SecretsManagerClient,
  GetSecretValueCommand,
  SecretsManagerClientConfig,
} from '@aws-sdk/client-secrets-manager';

interface SecretCache {
  value: any;
  timestamp: number;
  ttl: number;
}

interface DatabaseSecret {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  pool_min: number;
  pool_max: number;
}

interface RedisSecret {
  host: string;
  port: number;
  password: string;
  db: number;
  maxRetries: number;
  retryDelay: number;
}

interface AppSecret {
  jwt_secret: string;
  encryption_key: string;
  session_secret: string;
}

interface SalesforceSecret {
  client_id: string;
  client_secret: string;
  username: string;
  password: string;
  security_token: string;
  login_url: string;
  api_version: string;
}

interface CompanyCamSecret {
  api_key: string;
  api_secret: string;
  base_url: string;
}

interface MonitoringSecret {
  sentry_dsn?: string;
  datadog_api_key?: string;
  logrocket_app_id?: string;
}

interface EmailSecret {
  sendgrid_api_key: string;
  from_email: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
}

class AWSSecretsManager {
  private client: SecretsManagerClient;
  private cache: Map<string, SecretCache> = new Map();
  private readonly defaultTTL = 3600000; // 1 hour in milliseconds
  private readonly secretPrefix: string;

  constructor() {
    const config: SecretsManagerClientConfig = {
      region: process.env.AWS_REGION || 'us-west-2',
    };

    // Use IAM role credentials in production (Fly.io)
    if (process.env.FLY_APP_NAME) {
      // Fly.io environment - use IAM role
      console.log('Using IAM role credentials for Secrets Manager');
    } else if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      // Development environment - use explicit credentials
      config.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      };
    }

    this.client = new SecretsManagerClient(config);
    this.secretPrefix = process.env.AWS_SECRETS_PREFIX || 'paintbox/production';
  }

  /**
   * Get a secret from AWS Secrets Manager with caching
   */
  private async getSecret<T>(secretName: string, ttl?: number): Promise<T> {
    const fullSecretName = `${this.secretPrefix}/${secretName}`;

    // Check cache first
    const cached = this.cache.get(fullSecretName);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      console.log(`Using cached secret: ${secretName}`);
      return cached.value as T;
    }

    try {
      console.log(`Fetching secret from AWS: ${secretName}`);

      const command = new GetSecretValueCommand({
        SecretId: fullSecretName,
      });

      const response = await this.client.send(command);

      if (!response.SecretString) {
        throw new Error(`Secret ${fullSecretName} has no value`);
      }

      const secretValue = JSON.parse(response.SecretString) as T;

      // Cache the secret
      this.cache.set(fullSecretName, {
        value: secretValue,
        timestamp: Date.now(),
        ttl: ttl || this.defaultTTL,
      });

      return secretValue;
    } catch (error) {
      console.error(`Failed to retrieve secret ${fullSecretName}:`, error);

      // Return cached value if available, even if expired
      const expiredCache = this.cache.get(fullSecretName);
      if (expiredCache) {
        console.warn(`Using expired cached secret for ${secretName}`);
        return expiredCache.value as T;
      }

      throw error;
    }
  }

  /**
   * Get database configuration
   */
  async getDatabaseConfig(): Promise<DatabaseSecret> {
    const secret = await this.getSecret<DatabaseSecret>('database');

    // Build connection URL
    const connectionUrl = `postgresql://${secret.username}:${secret.password}@${secret.host}:${secret.port}/${secret.database}${secret.ssl ? '?sslmode=require' : ''}`;

    // Set environment variables for compatibility
    process.env.DATABASE_URL = connectionUrl;
    process.env.DATABASE_HOST = secret.host;
    process.env.DATABASE_PORT = String(secret.port);
    process.env.DATABASE_NAME = secret.database;
    process.env.DATABASE_USER = secret.username;
    process.env.DATABASE_PASSWORD = secret.password;
    process.env.DATABASE_POOL_MIN = String(secret.pool_min);
    process.env.DATABASE_POOL_MAX = String(secret.pool_max);

    return secret;
  }

  /**
   * Get Redis configuration
   */
  async getRedisConfig(): Promise<RedisSecret> {
    const secret = await this.getSecret<RedisSecret>('redis');

    // Build connection URL
    const connectionUrl = `redis://:${secret.password}@${secret.host}:${secret.port}/${secret.db}`;

    // Set environment variables for compatibility
    process.env.REDIS_URL = connectionUrl;
    process.env.REDIS_HOST = secret.host;
    process.env.REDIS_PORT = String(secret.port);
    process.env.REDIS_PASSWORD = secret.password;
    process.env.REDIS_DB = String(secret.db);

    return secret;
  }

  /**
   * Get application secrets
   */
  async getAppSecrets(): Promise<AppSecret> {
    const secret = await this.getSecret<AppSecret>('app');

    // Set environment variables for compatibility
    process.env.JWT_SECRET = secret.jwt_secret;
    process.env.ENCRYPTION_KEY = secret.encryption_key;
    process.env.SESSION_SECRET = secret.session_secret;

    return secret;
  }

  /**
   * Get Salesforce configuration
   */
  async getSalesforceConfig(): Promise<SalesforceSecret> {
    const secret = await this.getSecret<SalesforceSecret>('salesforce');

    // Set environment variables for compatibility
    process.env.SALESFORCE_CLIENT_ID = secret.client_id;
    process.env.SALESFORCE_CLIENT_SECRET = secret.client_secret;
    process.env.SALESFORCE_USERNAME = secret.username;
    process.env.SALESFORCE_PASSWORD = secret.password;
    process.env.SALESFORCE_SECURITY_TOKEN = secret.security_token;
    process.env.SALESFORCE_LOGIN_URL = secret.login_url;
    process.env.SALESFORCE_API_VERSION = secret.api_version;

    return secret;
  }

  /**
   * Get Company Cam configuration
   */
  async getCompanyCamConfig(): Promise<CompanyCamSecret> {
    const secret = await this.getSecret<CompanyCamSecret>('companycam');

    // Set environment variables for compatibility
    process.env.COMPANYCAM_API_KEY = secret.api_key;
    process.env.COMPANYCAM_API_SECRET = secret.api_secret;
    process.env.COMPANYCAM_BASE_URL = secret.base_url;

    return secret;
  }

  /**
   * Get monitoring configuration
   */
  async getMonitoringConfig(): Promise<MonitoringSecret> {
    const secret = await this.getSecret<MonitoringSecret>('monitoring');

    // Set environment variables for compatibility
    if (secret.sentry_dsn) {
      process.env.SENTRY_DSN = secret.sentry_dsn;
    }
    if (secret.datadog_api_key) {
      process.env.DATADOG_API_KEY = secret.datadog_api_key;
    }
    if (secret.logrocket_app_id) {
      process.env.LOGROCKET_APP_ID = secret.logrocket_app_id;
    }

    return secret;
  }

  /**
   * Get email configuration
   */
  async getEmailConfig(): Promise<EmailSecret> {
    const secret = await this.getSecret<EmailSecret>('email');

    // Set environment variables for compatibility
    process.env.SENDGRID_API_KEY = secret.sendgrid_api_key;
    process.env.SENDGRID_FROM_EMAIL = secret.from_email;
    process.env.SMTP_HOST = secret.smtp_host;
    process.env.SMTP_PORT = String(secret.smtp_port);
    process.env.SMTP_USER = secret.smtp_user;

    return secret;
  }

  /**
   * Initialize all secrets
   * This should be called during application startup
   */
  async initializeAllSecrets(): Promise<void> {
    console.log('Initializing secrets from AWS Secrets Manager...');

    try {
      // Load all secrets in parallel for faster startup
      await Promise.all([
        this.getDatabaseConfig(),
        this.getRedisConfig(),
        this.getAppSecrets(),
        this.getSalesforceConfig().catch(err => {
          console.warn('Salesforce secrets not configured:', err.message);
        }),
        this.getCompanyCamConfig().catch(err => {
          console.warn('Company Cam secrets not configured:', err.message);
        }),
        this.getMonitoringConfig().catch(err => {
          console.warn('Monitoring secrets not configured:', err.message);
        }),
        this.getEmailConfig().catch(err => {
          console.warn('Email secrets not configured:', err.message);
        }),
      ]);

      console.log('All secrets initialized successfully');
    } catch (error) {
      console.error('Failed to initialize secrets:', error);
      throw error;
    }
  }

  /**
   * Clear the cache (useful for testing or forced refresh)
   */
  clearCache(): void {
    this.cache.clear();
    console.log('Secrets cache cleared');
  }

  /**
   * Refresh a specific secret
   */
  async refreshSecret(secretName: string): Promise<void> {
    const fullSecretName = `${this.secretPrefix}/${secretName}`;
    this.cache.delete(fullSecretName);

    // Re-fetch the secret
    switch (secretName) {
      case 'database':
        await this.getDatabaseConfig();
        break;
      case 'redis':
        await this.getRedisConfig();
        break;
      case 'app':
        await this.getAppSecrets();
        break;
      case 'salesforce':
        await this.getSalesforceConfig();
        break;
      case 'companycam':
        await this.getCompanyCamConfig();
        break;
      case 'monitoring':
        await this.getMonitoringConfig();
        break;
      case 'email':
        await this.getEmailConfig();
        break;
      default:
        throw new Error(`Unknown secret: ${secretName}`);
    }
  }
}

// Export singleton instance
export const secretsManager = new AWSSecretsManager();

// Export types for use in other modules
export type {
  DatabaseSecret,
  RedisSecret,
  AppSecret,
  SalesforceSecret,
  CompanyCamSecret,
  MonitoringSecret,
  EmailSecret,
};

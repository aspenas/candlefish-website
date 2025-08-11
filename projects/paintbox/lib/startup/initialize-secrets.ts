/**
 * Application Startup Secret Initialization
 * Loads all secrets from AWS Secrets Manager at application startup
 * Must be called before any other services initialize
 */

import { secretsManager } from '../services/aws-secrets-manager';

export interface StartupConfig {
  skipNonCritical?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
}

/**
 * Initialize all application secrets from AWS Secrets Manager
 * This function should be called as early as possible in the application lifecycle
 */
export async function initializeSecrets(config: StartupConfig = {}): Promise<void> {
  const {
    skipNonCritical = false,
    retryAttempts = 3,
    retryDelay = 1000,
  } = config;

  console.log('🔐 Initializing application secrets...');

  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt < retryAttempts) {
    try {
      attempt++;

      if (attempt > 1) {
        console.log(`Retry attempt ${attempt}/${retryAttempts}...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }

      // Check if we're in production or need secrets
      const isProduction = process.env.NODE_ENV === 'production';
      const isFlyEnvironment = !!process.env.FLY_APP_NAME;
      const needsSecrets = isProduction || isFlyEnvironment;

      if (!needsSecrets && !process.env.AWS_SECRETS_PREFIX) {
        console.log('📋 Running in development mode, using local .env configuration');
        return;
      }

      // Initialize all secrets
      await secretsManager.initializeAllSecrets();

      console.log('✅ All secrets initialized successfully');

      // Validate critical environment variables
      validateCriticalSecrets();

      return; // Success, exit the retry loop

    } catch (error) {
      lastError = error as Error;
      console.error(`Failed to initialize secrets (attempt ${attempt}/${retryAttempts}):`, error);

      if (attempt === retryAttempts) {
        // Final attempt failed
        if (skipNonCritical && hasCriticalSecretsFromEnv()) {
          console.warn('⚠️  Using fallback environment variables for critical secrets');
          return;
        }

        throw new Error(`Failed to initialize secrets after ${retryAttempts} attempts: ${lastError.message}`);
      }
    }
  }
}

/**
 * Validate that critical secrets are present
 */
function validateCriticalSecrets(): void {
  const criticalSecrets = [
    { key: 'DATABASE_URL', name: 'Database connection' },
    { key: 'REDIS_URL', name: 'Redis connection' },
    { key: 'JWT_SECRET', name: 'JWT secret' },
    { key: 'ENCRYPTION_KEY', name: 'Encryption key' },
  ];

  const missing: string[] = [];

  for (const { key, name } of criticalSecrets) {
    if (!process.env[key]) {
      missing.push(`${name} (${key})`);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing critical secrets: ${missing.join(', ')}`);
  }

  console.log('✅ All critical secrets validated');
}

/**
 * Check if critical secrets are available from environment variables
 * Used as a fallback when AWS Secrets Manager is unavailable
 */
function hasCriticalSecretsFromEnv(): boolean {
  return !!(
    process.env.DATABASE_URL &&
    process.env.REDIS_URL &&
    process.env.JWT_SECRET &&
    process.env.ENCRYPTION_KEY
  );
}

/**
 * Refresh secrets without restarting the application
 * Useful for secret rotation scenarios
 */
export async function refreshSecrets(secretNames?: string[]): Promise<void> {
  console.log('🔄 Refreshing application secrets...');

  try {
    if (secretNames && secretNames.length > 0) {
      // Refresh specific secrets
      for (const secretName of secretNames) {
        await secretsManager.refreshSecret(secretName);
        console.log(`✅ Refreshed secret: ${secretName}`);
      }
    } else {
      // Clear cache and refresh all
      secretsManager.clearCache();
      await secretsManager.initializeAllSecrets();
      console.log('✅ All secrets refreshed');
    }
  } catch (error) {
    console.error('Failed to refresh secrets:', error);
    throw error;
  }
}

/**
 * Get a summary of loaded secrets (for debugging)
 * Does not expose actual secret values
 */
export function getSecretsSummary(): Record<string, boolean> {
  return {
    database: !!process.env.DATABASE_URL,
    redis: !!process.env.REDIS_URL,
    jwt: !!process.env.JWT_SECRET,
    encryption: !!process.env.ENCRYPTION_KEY,
    salesforce: !!process.env.SALESFORCE_CLIENT_ID,
    companycam: !!process.env.COMPANYCAM_API_KEY,
    email: !!process.env.SENDGRID_API_KEY,
    monitoring: !!process.env.SENTRY_DSN,
  };
}

/**
 * Health check for secrets service
 */
export async function secretsHealthCheck(): Promise<{
  healthy: boolean;
  summary: Record<string, boolean>;
  message: string;
}> {
  try {
    const summary = getSecretsSummary();
    const criticalSecretsLoaded =
      summary.database &&
      summary.redis &&
      summary.jwt &&
      summary.encryption;

    return {
      healthy: criticalSecretsLoaded,
      summary,
      message: criticalSecretsLoaded
        ? 'All critical secrets loaded'
        : 'Some critical secrets are missing',
    };
  } catch (error) {
    return {
      healthy: false,
      summary: getSecretsSummary(),
      message: `Secrets health check failed: ${(error as Error).message}`,
    };
  }
}

// Export for use in other modules
export default {
  initializeSecrets,
  refreshSecrets,
  getSecretsSummary,
  secretsHealthCheck,
};

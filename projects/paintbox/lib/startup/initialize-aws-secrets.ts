/**
 * AWS Secrets Manager Initialization
 * Ensures secrets are properly loaded and available on application startup
 * This is critical for Fly.io deployments where environment variables need to be set
 */

import {
  SecretsManagerClient,
  GetSecretValueCommand,
  SecretsManagerClientConfig,
  ListSecretsCommand
} from '@aws-sdk/client-secrets-manager';

interface InitializationResult {
  success: boolean;
  secretsLoaded: string[];
  errors: string[];
  warnings: string[];
  metadata: {
    region: string;
    hasCredentials: boolean;
    timestamp: string;
  };
}

/**
 * Initialize AWS Secrets Manager client for the deployment environment
 */
function createSecretsClient(): SecretsManagerClient {
  const config: SecretsManagerClientConfig = {
    region: process.env.AWS_REGION || 'us-east-1',
  };

  // Use explicit credentials if available (Fly.io environment)
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    console.log('[AWS Init] Using explicit AWS credentials');
    config.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
  } else {
    console.log('[AWS Init] Using default AWS credential chain');
  }

  return new SecretsManagerClient(config);
}

/**
 * Test AWS Secrets Manager connectivity
 */
async function testConnectivity(client: SecretsManagerClient): Promise<boolean> {
  try {
    console.log('[AWS Init] Testing AWS Secrets Manager connectivity...');
    const command = new ListSecretsCommand({ MaxResults: 1 });
    await client.send(command);
    console.log('[AWS Init] ✅ AWS Secrets Manager connectivity confirmed');
    return true;
  } catch (error: any) {
    console.error('[AWS Init] ❌ AWS Secrets Manager connectivity test failed:', error.message);
    return false;
  }
}

/**
 * Load a specific secret and optionally set environment variables
 */
async function loadSecret(
  client: SecretsManagerClient,
  secretId: string,
  setEnvVars: boolean = true
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[AWS Init] Loading secret: ${secretId}`);

    const command = new GetSecretValueCommand({ SecretId: secretId });
    const response = await client.send(command);

    if (!response.SecretString) {
      throw new Error(`Secret ${secretId} has no value`);
    }

    const secretData = JSON.parse(response.SecretString);

    // Set environment variables based on secret type
    if (setEnvVars) {
      const secretName = secretId.split('/').pop();

      switch (secretName) {
        case 'public-keys':
          // JWT public keys - store as JSON string
          process.env.JWT_PUBLIC_KEYS = JSON.stringify(secretData);
          console.log(`[AWS Init] ✅ Loaded JWT public keys (${Object.keys(secretData).length} keys)`);
          break;

        case 'private-keys':
          // JWT private keys - store as JSON string
          process.env.JWT_PRIVATE_KEYS = JSON.stringify(secretData);
          console.log('[AWS Init] ✅ Loaded JWT private keys');
          break;

        case 'app':
          // Application secrets
          if (secretData.jwt_secret) process.env.JWT_SECRET = secretData.jwt_secret;
          if (secretData.encryption_key) process.env.ENCRYPTION_KEY = secretData.encryption_key;
          if (secretData.session_secret) process.env.SESSION_SECRET = secretData.session_secret;
          console.log('[AWS Init] ✅ Loaded application secrets');
          break;

        case 'database':
          // Database configuration
          const dbUrl = `postgresql://${secretData.username}:${secretData.password}@${secretData.host}:${secretData.port}/${secretData.database}${secretData.ssl ? '?sslmode=require' : ''}`;
          process.env.DATABASE_URL = dbUrl;
          console.log('[AWS Init] ✅ Loaded database configuration');
          break;

        case 'redis':
          // Redis configuration
          const redisUrl = `redis://:${secretData.password}@${secretData.host}:${secretData.port}/${secretData.db || 0}`;
          process.env.REDIS_URL = redisUrl;
          console.log('[AWS Init] ✅ Loaded Redis configuration');
          break;

        default:
          console.log(`[AWS Init] ✅ Loaded secret: ${secretName}`);
      }
    }

    return { success: true };
  } catch (error: any) {
    const errorMessage = `Failed to load ${secretId}: ${error.message}`;
    console.error(`[AWS Init] ❌ ${errorMessage}`);

    // Provide specific guidance for common errors
    if (error.name === 'AccessDeniedException') {
      console.error('[AWS Init] 💡 Solution: Add secretsmanager:GetSecretValue permission to IAM user/role');
    } else if (error.name === 'ResourceNotFoundException') {
      console.error('[AWS Init] 💡 Solution: Verify secret exists in AWS Secrets Manager');
    }

    return { success: false, error: errorMessage };
  }
}

/**
 * Initialize all required AWS secrets for the application
 */
export async function initializeAWSSecrets(): Promise<InitializationResult> {
  const result: InitializationResult = {
    success: false,
    secretsLoaded: [],
    errors: [],
    warnings: [],
    metadata: {
      region: process.env.AWS_REGION || 'us-east-1',
      hasCredentials: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
      timestamp: new Date().toISOString()
    }
  };

  console.log('=' .repeat(60));
  console.log('[AWS Init] Starting AWS Secrets Manager initialization');
  console.log(`[AWS Init] Region: ${result.metadata.region}`);
  console.log(`[AWS Init] Has Credentials: ${result.metadata.hasCredentials}`);
  console.log('=' .repeat(60));

  try {
    // Create client
    const client = createSecretsClient();

    // Test connectivity
    const isConnected = await testConnectivity(client);
    if (!isConnected) {
      result.errors.push('AWS Secrets Manager connectivity test failed');

      // If no credentials, provide helpful message
      if (!result.metadata.hasCredentials) {
        result.errors.push('No AWS credentials found in environment');
        console.error('[AWS Init] 💡 Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables');
      }

      return result;
    }

    // Define secrets to load
    const secretsToLoad = [
      // Critical secrets (failures will be errors)
      { id: 'paintbox/production/jwt/public-keys', critical: true },
      { id: 'paintbox/production/jwt/private-keys', critical: true },
      { id: 'paintbox/production/app', critical: true },

      // Optional secrets (failures will be warnings)
      { id: 'paintbox/production/database', critical: false },
      { id: 'paintbox/production/redis', critical: false },
      { id: 'paintbox/production/salesforce', critical: false },
      { id: 'paintbox/production/companycam', critical: false },
      { id: 'paintbox/production/monitoring', critical: false },
      { id: 'paintbox/production/email', critical: false }
    ];

    // Load secrets in parallel for faster startup
    const loadPromises = secretsToLoad.map(async (secret) => {
      const loadResult = await loadSecret(client, secret.id);

      if (loadResult.success) {
        result.secretsLoaded.push(secret.id);
      } else {
        if (secret.critical) {
          result.errors.push(loadResult.error || `Failed to load ${secret.id}`);
        } else {
          result.warnings.push(loadResult.error || `Failed to load ${secret.id}`);
        }
      }

      return loadResult;
    });

    await Promise.all(loadPromises);

    // Determine overall success (critical secrets must all load)
    const criticalSecretsLoaded = secretsToLoad
      .filter(s => s.critical)
      .every(s => result.secretsLoaded.includes(s.id));

    result.success = criticalSecretsLoaded;

    // Log summary
    console.log('=' .repeat(60));
    console.log('[AWS Init] Initialization Summary');
    console.log(`[AWS Init] Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`[AWS Init] Secrets Loaded: ${result.secretsLoaded.length}`);
    console.log(`[AWS Init] Errors: ${result.errors.length}`);
    console.log(`[AWS Init] Warnings: ${result.warnings.length}`);

    if (result.errors.length > 0) {
      console.error('[AWS Init] Errors:');
      result.errors.forEach(err => console.error(`  - ${err}`));
    }

    if (result.warnings.length > 0) {
      console.warn('[AWS Init] Warnings:');
      result.warnings.forEach(warn => console.warn(`  - ${warn}`));
    }

    console.log('=' .repeat(60));

  } catch (error: any) {
    console.error('[AWS Init] Unexpected error during initialization:', error);
    result.errors.push(`Unexpected error: ${error.message}`);
  }

  return result;
}

/**
 * Verify that required environment variables are set
 */
export function verifyEnvironment(): { valid: boolean; missing: string[] } {
  const required = [
    'AWS_REGION',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('[AWS Init] Missing required environment variables:', missing);
  }

  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * Initialize on module load if in production
 */
if (process.env.NODE_ENV === 'production' && process.env.AUTO_INIT_SECRETS === 'true') {
  console.log('[AWS Init] Auto-initializing secrets in production...');
  initializeAWSSecrets()
    .then(result => {
      if (!result.success) {
        console.error('[AWS Init] Failed to initialize secrets, application may not function correctly');
      }
    })
    .catch(error => {
      console.error('[AWS Init] Fatal error during auto-initialization:', error);
    });
}

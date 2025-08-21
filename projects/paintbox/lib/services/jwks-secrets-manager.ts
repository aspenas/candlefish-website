/**
 * JWKS-specific AWS Secrets Manager Service
 * Optimized for high-performance, reliable JWKS key retrieval
 */

import {
  SecretsManagerClient,
  GetSecretValueCommand,
  DescribeSecretCommand,
  ListSecretVersionIdsCommand,
  SecretsManagerClientConfig,
  GetSecretValueCommandOutput,
  ResourceNotFoundException,
  DecryptionFailureException,
  InternalServiceErrorException,
  InvalidParameterException,
  InvalidRequestException,
  ThrottlingException
} from '@aws-sdk/client-secrets-manager';

// Types
export interface JWKSKey {
  kty: string;
  use: string;
  kid: string;
  alg: string;
  n: string;
  e: string;
}

export interface JWKSData {
  keys: JWKSKey[];
}

export interface JWKSSecretMetadata {
  arn: string;
  name: string;
  versionId: string;
  lastModified: Date;
  rotationEnabled: boolean;
  nextRotation?: Date;
}

// Configuration
const DEFAULT_CONFIG = {
  region: process.env.AWS_REGION || 'us-east-1',
  secretId: 'paintbox/production/jwt/public-keys',
  maxRetries: 3,
  timeout: 5000,
  cacheEnabled: true,
  cacheTTL: 600000 // 10 minutes
};

// Singleton client instance
let clientInstance: SecretsManagerClient | null = null;

/**
 * Get or create AWS Secrets Manager client
 */
function getClient(): SecretsManagerClient {
  if (!clientInstance) {
    const config: SecretsManagerClientConfig = {
      region: DEFAULT_CONFIG.region,
      maxAttempts: DEFAULT_CONFIG.maxRetries,
      retryMode: 'adaptive',
      requestHandler: {
        requestTimeout: DEFAULT_CONFIG.timeout,
        httpsAgent: {
          maxSockets: 50,
          keepAlive: true,
          keepAliveMsecs: 1000
        }
      } as any
    };

    // Configure credentials
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      config.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        sessionToken: process.env.AWS_SESSION_TOKEN
      };
      console.log('[JWKS-SM] Using explicit AWS credentials');
    } else {
      console.log('[JWKS-SM] Using IAM role/instance credentials');
    }

    clientInstance = new SecretsManagerClient(config);
  }

  return clientInstance;
}

/**
 * Parse and validate JWKS data from secret
 */
function parseJWKSSecret(secretString: string): JWKSData {
  let data: any;

  try {
    data = JSON.parse(secretString);
  } catch (error) {
    throw new Error(`Invalid JSON in secret: ${error}`);
  }

  // Handle both JWKS format and key-value format
  if (data.keys && Array.isArray(data.keys)) {
    // Already in JWKS format
    return validateJWKS(data);
  }

  // Convert from key-value format
  const keys: JWKSKey[] = [];

  for (const [kid, keyData] of Object.entries(data)) {
    if (typeof keyData === 'object' && keyData !== null) {
      const key = keyData as any;
      keys.push({
        kty: key.kty || 'RSA',
        use: key.use || 'sig',
        kid: key.kid || kid,
        alg: key.alg || 'RS256',
        n: key.n,
        e: key.e || 'AQAB'
      });
    }
  }

  if (keys.length === 0) {
    throw new Error('No valid keys found in secret');
  }

  return validateJWKS({ keys });
}

/**
 * Validate JWKS structure
 */
function validateJWKS(data: any): JWKSData {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid JWKS: not an object');
  }

  if (!Array.isArray(data.keys)) {
    throw new Error('Invalid JWKS: keys is not an array');
  }

  if (data.keys.length === 0) {
    throw new Error('Invalid JWKS: no keys present');
  }

  for (const key of data.keys) {
    if (!key.kid) {
      throw new Error('Invalid key: missing kid');
    }
    if (!key.n) {
      throw new Error('Invalid key: missing modulus (n)');
    }
    if (!key.e) {
      throw new Error('Invalid key: missing exponent (e)');
    }
    if (!key.kty) {
      key.kty = 'RSA'; // Default to RSA
    }
    if (!key.use) {
      key.use = 'sig'; // Default to signature
    }
    if (!key.alg) {
      key.alg = 'RS256'; // Default to RS256
    }
  }

  return data as JWKSData;
}

/**
 * Handle AWS SDK errors with appropriate logging and retries
 */
function handleAWSError(error: unknown): never {
  if (error instanceof ResourceNotFoundException) {
    console.error('[JWKS-SM] Secret not found - check name and permissions');
    throw new Error('JWKS secret not found in AWS');
  }

  if (error instanceof DecryptionFailureException) {
    console.error('[JWKS-SM] KMS decryption failed - check KMS key permissions');
    throw new Error('Failed to decrypt JWKS secret');
  }

  if (error instanceof InternalServiceErrorException) {
    console.error('[JWKS-SM] AWS service error - temporary issue');
    throw new Error('AWS service temporarily unavailable');
  }

  if (error instanceof ThrottlingException) {
    console.error('[JWKS-SM] Request throttled - too many requests');
    throw new Error('AWS request throttled');
  }

  if (error instanceof InvalidParameterException) {
    console.error('[JWKS-SM] Invalid parameter in request');
    throw new Error('Invalid AWS request parameter');
  }

  if (error instanceof InvalidRequestException) {
    console.error('[JWKS-SM] Invalid request to AWS');
    throw new Error('Invalid AWS request');
  }

  if (error instanceof Error) {
    console.error('[JWKS-SM] Unexpected error:', error.message);
    throw error;
  }

  console.error('[JWKS-SM] Unknown error:', error);
  throw new Error('Unknown error fetching JWKS');
}

/**
 * Main export: Fetch JWKS from AWS Secrets Manager
 */
export async function fetchJWKS(options?: {
  secretId?: string;
  versionId?: string;
  versionStage?: string;
}): Promise<JWKSData> {
  const startTime = Date.now();
  const secretId = options?.secretId || DEFAULT_CONFIG.secretId;

  try {
    const client = getClient();

    // Build command
    const command = new GetSecretValueCommand({
      SecretId: secretId,
      VersionId: options?.versionId,
      VersionStage: options?.versionStage || 'AWSCURRENT'
    });

    console.log(`[JWKS-SM] Fetching secret: ${secretId}`);

    // Execute with timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('AWS request timeout')), DEFAULT_CONFIG.timeout);
    });

    const response = await Promise.race([
      client.send(command),
      timeoutPromise
    ]) as GetSecretValueCommandOutput;

    const fetchTime = Date.now() - startTime;

    if (!response.SecretString) {
      if (response.SecretBinary) {
        throw new Error('Secret is binary, expected string');
      }
      throw new Error('Secret value is empty');
    }

    // Parse and validate
    const jwksData = parseJWKSSecret(response.SecretString);

    console.log(`[JWKS-SM] Success: ${jwksData.keys.length} keys fetched in ${fetchTime}ms`);

    return jwksData;
  } catch (error) {
    const fetchTime = Date.now() - startTime;
    console.error(`[JWKS-SM] Failed after ${fetchTime}ms`);
    handleAWSError(error);
  }
}

/**
 * Get metadata about the JWKS secret
 */
export async function getJWKSMetadata(secretId?: string): Promise<JWKSSecretMetadata> {
  const client = getClient();
  const id = secretId || DEFAULT_CONFIG.secretId;

  try {
    const command = new DescribeSecretCommand({ SecretId: id });
    const response = await client.send(command);

    return {
      arn: response.ARN!,
      name: response.Name!,
      versionId: response.VersionIdsToStages ? Object.keys(response.VersionIdsToStages)[0] : '',
      lastModified: response.LastChangedDate || new Date(),
      rotationEnabled: response.RotationEnabled || false,
      nextRotation: response.NextRotationDate
    };
  } catch (error) {
    console.error('[JWKS-SM] Failed to get metadata');
    handleAWSError(error);
  }
}

/**
 * List all version IDs for the JWKS secret
 */
export async function listJWKSVersions(secretId?: string): Promise<string[]> {
  const client = getClient();
  const id = secretId || DEFAULT_CONFIG.secretId;

  try {
    const command = new ListSecretVersionIdsCommand({
      SecretId: id,
      IncludeDeprecated: false
    });
    const response = await client.send(command);

    if (!response.Versions) {
      return [];
    }

    return response.Versions
      .filter(v => v.VersionId)
      .map(v => v.VersionId!);
  } catch (error) {
    console.error('[JWKS-SM] Failed to list versions');
    handleAWSError(error);
  }
}

/**
 * Test connection to AWS Secrets Manager
 */
export async function testConnection(): Promise<boolean> {
  try {
    const metadata = await getJWKSMetadata();
    console.log('[JWKS-SM] Connection test successful:', {
      name: metadata.name,
      arn: metadata.arn,
      rotationEnabled: metadata.rotationEnabled
    });
    return true;
  } catch (error) {
    console.error('[JWKS-SM] Connection test failed:', error);
    return false;
  }
}

/**
 * Clean up resources
 */
export function cleanup(): void {
  if (clientInstance) {
    clientInstance.destroy();
    clientInstance = null;
    console.log('[JWKS-SM] Client cleaned up');
  }
}

// Cleanup on process exit
if (typeof process !== 'undefined') {
  process.on('exit', cleanup);
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

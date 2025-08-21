/**
 * JWKS (JSON Web Key Set) API Endpoint - Production-Ready Version
 * Serves public keys for JWT verification with AWS Secrets Manager integration
 *
 * Features:
 * - Primary: Fetch from AWS Secrets Manager with retry logic
 * - Fallback: Hardcoded keys if AWS fails
 * - Caching: Multi-layer caching (memory + headers)
 * - Monitoring: Comprehensive error tracking and metrics
 * - Security: Proper CORS and security headers
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
  SecretsManagerClientConfig,
  ResourceNotFoundException,
  InvalidRequestException,
  InvalidParameterException,
  DecryptionFailureException,
  InternalServiceErrorException
} from '@aws-sdk/client-secrets-manager';
import { jwksRateLimiter, withRateLimit } from '@/lib/security/rate-limiter';

// Types
interface JWKSKey {
  kty: string;
  use: string;
  kid: string;
  alg: string;
  n: string;
  e: string;
}

interface JWKSResponse {
  keys: JWKSKey[];
}

// Cache configuration
interface CacheEntry {
  data: JWKSResponse;
  timestamp: number;
  source: 'aws' | 'emergency';
  etag: string;
}

let cache: CacheEntry | null = null;
const CACHE_TTL = 300000; // 5 minutes (reduced from 10 for security)
const CACHE_TTL_ERROR = 30000; // 30 seconds for error cases

// Metrics tracking
const metrics = {
  requests: 0,
  cacheHits: 0,
  awsSuccess: 0,
  awsFailures: 0,
  emergencyModeUsed: 0,
  rateLimitHits: 0,
  lastError: null as string | null,
  lastErrorTime: null as Date | null
};

// Allowed origins for CORS (configure based on environment)
const ALLOWED_ORIGINS = process.env.NODE_ENV === 'production'
  ? [
      'https://paintbox.fly.dev',
      'https://paintbox-app.fly.dev',
      'https://api.paintbox.fly.dev'
    ]
  : [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://paintbox.fly.dev'
    ];

/**
 * Emergency fallback mechanism - fetches from a secure backup source
 * This should NEVER contain hardcoded keys
 */
async function getEmergencyJWKS(): Promise<JWKSResponse | null> {
  try {
    // Option 1: Try to fetch from a backup AWS region
    const backupClient = new SecretsManagerClient({
      region: process.env.AWS_BACKUP_REGION || 'us-west-2',
      maxAttempts: 2
    });

    const command = new GetSecretValueCommand({
      SecretId: 'paintbox/production/jwt/public-keys-backup'
    });

    const response = await backupClient.send(command);
    if (response.SecretString) {
      const data = JSON.parse(response.SecretString);
      console.log('[JWKS] Emergency: Retrieved from backup region');
      return data.keys ? data : { keys: [data] };
    }
  } catch (error) {
    console.error('[JWKS] Emergency backup fetch failed:', error);
  }

  // Option 2: Return a minimal service degradation response
  // This indicates the service is temporarily unavailable
  return null;
}

// AWS SDK configuration with best practices
function getSecretsManagerClient(): SecretsManagerClient {
  const config: SecretsManagerClientConfig = {
    region: process.env.AWS_REGION || 'us-east-1',
    maxAttempts: 3,
    retryMode: 'adaptive',
    requestHandler: {
      requestTimeout: 5000,
      httpsAgent: {
        maxSockets: 50,
        keepAlive: true,
        keepAliveMsecs: 1000
      }
    } as any
  };

  // Use explicit credentials if available, otherwise use IAM role
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    config.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      sessionToken: process.env.AWS_SESSION_TOKEN // Optional for temporary credentials
    };
    console.log('[JWKS] Using explicit AWS credentials');
  } else {
    console.log('[JWKS] Using IAM role/instance profile credentials');
  }

  return new SecretsManagerClient(config);
}

/**
 * Fetch JWKS from AWS Secrets Manager with proper error handling
 */
async function fetchJWKSFromAWS(): Promise<JWKSResponse> {
  const startTime = Date.now();
  let client: SecretsManagerClient | null = null;

  try {
    client = getSecretsManagerClient();
    const command = new GetSecretValueCommand({
      SecretId: 'paintbox/production/jwt/public-keys',
      VersionStage: 'AWSCURRENT' // Always use current version
    });

    console.log('[JWKS] Fetching from AWS Secrets Manager...');
    const response = await client.send(command);
    const fetchTime = Date.now() - startTime;

    if (!response.SecretString) {
      throw new Error('Secret value is empty or binary');
    }

    // Parse and validate the secret
    const secretData = JSON.parse(response.SecretString);
    let jwks: JWKSResponse;

    // Handle both JWKS format and key-value format
    if (secretData.keys && Array.isArray(secretData.keys)) {
      // Already in JWKS format
      jwks = secretData as JWKSResponse;
    } else {
      // Convert from key-value format to JWKS
      const keys: JWKSKey[] = [];

      for (const [kid, keyData] of Object.entries(secretData)) {
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

      jwks = { keys };
    }

    // Validate JWKS structure
    validateJWKS(jwks);

    console.log(`[JWKS] Success: ${jwks.keys.length} keys fetched in ${fetchTime}ms`);
    metrics.awsSuccess++;

    return jwks;
  } catch (error) {
    metrics.awsFailures++;
    const errorMessage = getErrorMessage(error);
    metrics.lastError = errorMessage;
    metrics.lastErrorTime = new Date();

    console.error(`[JWKS] AWS fetch failed after ${Date.now() - startTime}ms:`, errorMessage);

    // Log specific error types for debugging
    if (error instanceof ResourceNotFoundException) {
      console.error('[JWKS] Secret not found - check secret name and permissions');
    } else if (error instanceof DecryptionFailureException) {
      console.error('[JWKS] KMS decryption failed - check KMS key permissions');
    } else if (error instanceof InternalServiceErrorException) {
      console.error('[JWKS] AWS service error - temporary issue, will retry');
    }

    throw error;
  } finally {
    // Cleanup client resources if needed
    if (client) {
      client.destroy();
    }
  }
}

/**
 * Validate JWKS structure
 */
function validateJWKS(jwks: any): asserts jwks is JWKSResponse {
  if (!jwks || typeof jwks !== 'object') {
    throw new Error('Invalid JWKS: not an object');
  }

  if (!Array.isArray(jwks.keys)) {
    throw new Error('Invalid JWKS: keys is not an array');
  }

  if (jwks.keys.length === 0) {
    throw new Error('Invalid JWKS: no keys present');
  }

  for (const key of jwks.keys) {
    if (!key.kid || !key.n || !key.e) {
      throw new Error(`Invalid key: missing required fields (kid, n, or e)`);
    }
  }
}

/**
 * Extract error message from various error types
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error';
}

/**
 * Get JWKS with caching and fallback logic
 */
async function getJWKS(): Promise<{ data: JWKSResponse | null; source: 'aws' | 'emergency' | 'cache'; etag: string }> {
  const now = Date.now();
  metrics.requests++;

  // Check cache validity
  if (cache) {
    const cacheAge = now - cache.timestamp;
    const ttl = cache.source === 'fallback' ? CACHE_TTL_ERROR : CACHE_TTL;

    if (cacheAge < ttl) {
      console.log(`[JWKS] Cache hit (age: ${Math.round(cacheAge / 1000)}s, source: ${cache.source})`);
      metrics.cacheHits++;
      return {
        data: cache.data,
        source: 'cache',
        etag: cache.etag
      };
    }
  }

  try {
    // Attempt to fetch from AWS
    const jwks = await fetchJWKSFromAWS();
    const etag = generateETag(jwks);

    // Update cache with AWS data
    cache = {
      data: jwks,
      timestamp: now,
      source: 'aws',
      etag
    };

    return {
      data: jwks,
      source: 'aws',
      etag
    };
  } catch (error) {
    console.warn('[JWKS] Primary AWS fetch failed, attempting emergency fallback');

    // Check if we have a recent cache even if expired
    if (cache && (now - cache.timestamp) < CACHE_TTL * 2) {
      console.log('[JWKS] Using stale cache as emergency fallback');
      return {
        data: cache.data,
        source: 'cache',
        etag: cache.etag
      };
    }

    // Try emergency backup
    const emergencyData = await getEmergencyJWKS();

    if (emergencyData) {
      metrics.emergencyModeUsed++;
      const etag = generateETag(emergencyData);

      // Update cache with emergency data (very short TTL)
      cache = {
        data: emergencyData,
        timestamp: now,
        source: 'emergency',
        etag
      };

      return {
        data: emergencyData,
        source: 'emergency',
        etag
      };
    }

    // Complete failure - service unavailable
    return {
      data: null,
      source: 'emergency',
      etag: '"unavailable"'
    };
  }
}

/**
 * Generate ETag for caching
 */
function generateETag(data: JWKSResponse): string {
  const hash = require('crypto')
    .createHash('sha256')
    .update(JSON.stringify(data))
    .digest('hex');
  return `"${hash.substring(0, 16)}"`;
}

/**
 * Determine CORS origin based on request
 */
function getCorsOrigin(request: NextRequest): string {
  const origin = request.headers.get('origin');

  // Check if origin is in allowed list
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return origin;
  }

  // Default to first allowed origin or none
  return ALLOWED_ORIGINS[0] || 'null';
}

/**
 * Get comprehensive security headers
 */
function getSecurityHeaders(origin: string, nonce?: string): HeadersInit {
  return {
    // CORS headers (restricted)
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, If-None-Match',
    'Access-Control-Max-Age': '3600', // 1 hour
    'Access-Control-Allow-Credentials': 'false',

    // Security headers
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '0', // Disabled in modern browsers, CSP is better
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',

    // CSP header
    'Content-Security-Policy': [
      "default-src 'none'",
      "script-src 'none'",
      "style-src 'none'",
      "img-src 'none'",
      "font-src 'none'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'none'",
      "form-action 'none'"
    ].join('; '),

    // HSTS (only for production)
    ...(process.env.NODE_ENV === 'production' && {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
    })
  };
}

/**
 * GET endpoint for JWKS with rate limiting and security
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const requestId = generateRequestId();
  const origin = getCorsOrigin(request);

  // Apply rate limiting
  return withRateLimit(
    request,
    jwksRateLimiter,
    async () => {
      try {
    // Log request details
    const clientInfo = {
      requestId,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent')?.substring(0, 100),
      ip: request.headers.get('x-forwarded-for')?.split(',')[0] ||
          request.headers.get('x-real-ip') ||
          'unknown',
      ifNoneMatch: request.headers.get('if-none-match')
    };

    console.log('[JWKS] Request:', clientInfo);

    // Check ETag for client-side caching
    const ifNoneMatch = request.headers.get('if-none-match');

        // Get JWKS data
        const result = await getJWKS();
        const responseTime = Date.now() - startTime;

        // Check if service is unavailable
        if (!result.data) {
          console.error(`[JWKS] Service unavailable:`, {
            requestId,
            responseTime: `${responseTime}ms`
          });

          return new NextResponse(
            JSON.stringify({
              error: 'Service temporarily unavailable',
              message: 'Unable to retrieve JWKS. Please try again later.'
            }),
            {
              status: 503,
              headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Retry-After': '60',
                'X-Request-Id': requestId,
                'X-Response-Time': `${responseTime}ms`,
                ...getSecurityHeaders(origin)
              }
            }
          );
        }

        // Check if content hasn't changed (304 Not Modified)
        if (ifNoneMatch && ifNoneMatch === result.etag) {
          console.log(`[JWKS] 304 Not Modified (${responseTime}ms)`);
          return new NextResponse(null, {
            status: 304,
            headers: {
              'ETag': result.etag,
              'Cache-Control': getCacheControl(result.source),
              'X-Request-Id': requestId,
              'X-Response-Time': `${responseTime}ms`,
              ...getSecurityHeaders(origin)
            }
          });
        }

        // Log successful response
        console.log(`[JWKS] 200 OK:`, {
          requestId,
          keyCount: result.data.keys.length,
          responseTime: `${responseTime}ms`,
          source: result.source,
          cacheStats: {
            requests: metrics.requests,
            hitRate: metrics.requests > 0
              ? `${Math.round((metrics.cacheHits / metrics.requests) * 100)}%`
              : '0%'
          }
        });

        return NextResponse.json(result.data, {
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': getCacheControl(result.source),
            'ETag': result.etag,
            'X-Request-Id': requestId,
            'X-Response-Time': `${responseTime}ms`,
            'X-JWKS-Source': result.source,
            ...getSecurityHeaders(origin)
          }
        });
      } catch (error) {
        const responseTime = Date.now() - startTime;
        const errorMessage = getErrorMessage(error);

        console.error(`[JWKS] Request failed:`, {
          requestId,
          responseTime: `${responseTime}ms`,
          // Log error internally but don't expose details
          error: errorMessage
        });

        // Return generic error without exposing internal details
        return new NextResponse(
          JSON.stringify({
            error: 'Internal server error',
            message: 'An error occurred while processing your request'
          }),
          {
            status: 500,
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'X-Request-Id': requestId,
              'X-Response-Time': `${responseTime}ms`,
              ...getSecurityHeaders(origin)
            }
          }
        );
      }
    }
  );
}

/**
 * HEAD endpoint for lightweight health checks
 */
export async function HEAD(request: NextRequest) {
  try {
    // Quick check if cache is valid
    const now = Date.now();
    const cacheValid = cache && (now - cache.timestamp) < CACHE_TTL;

    return new NextResponse(null, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache',
        'X-Cache-Status': cacheValid ? 'valid' : 'expired',
        'X-Last-Error': metrics.lastError ? 'true' : 'false'
      }
    });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}

/**
 * OPTIONS endpoint for CORS preflight with security
 */
export async function OPTIONS(request: NextRequest) {
  const origin = getCorsOrigin(request);

  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, If-None-Match',
      'Access-Control-Max-Age': '3600',
      'Access-Control-Allow-Credentials': 'false',
      'Cache-Control': 'public, max-age=3600',
      'Vary': 'Origin'
    }
  });
}

/**
 * Helper function to determine cache control headers
 */
function getCacheControl(source: 'aws' | 'emergency' | 'cache'): string {
  switch (source) {
    case 'aws':
      // Fresh from AWS - cache for 5 minutes (reduced from 10)
      return 'public, max-age=300, stale-while-revalidate=150';
    case 'cache':
      // From cache - shorter TTL
      return 'public, max-age=150, stale-while-revalidate=60';
    case 'emergency':
      // Emergency mode - very short TTL to retry soon
      return 'public, max-age=30, stale-while-revalidate=60';
    default:
      return 'public, max-age=30';
  }
}

/**
 * Generate request ID for tracing
 */
function generateRequestId(): string {
  return `jwks-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

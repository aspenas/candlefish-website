/**
 * Secure JWKS (JSON Web Key Set) API Endpoint
 * Implements all security best practices identified in the audit
 *
 * Security Features:
 * - Rate limiting to prevent DoS attacks
 * - Strict CORS policy with allowed origins
 * - No hardcoded keys - AWS Secrets Manager only
 * - Comprehensive security headers
 * - Structured security logging
 * - Graceful error handling without information leakage
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
  SecretsManagerClientConfig,
  ResourceNotFoundException,
  AccessDeniedException,
} from '@aws-sdk/client-secrets-manager';
import { jwksRateLimiter, withRateLimit } from '@/lib/security/rate-limiter';
import { securityLogger } from '@/lib/logging/security-logger';

// Cache configuration
const CACHE_TTL = 600000; // 10 minutes in milliseconds
const CACHE_STALE_TTL = 3600000; // 1 hour for stale cache (emergency fallback)

// Cache storage
let cachedJWKS: any = null;
let cacheTimestamp: number = 0;

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://paintbox.fly.dev',
  'https://paintbox.candlefish.ai',
  process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null,
].filter(Boolean) as string[];

/**
 * Initialize AWS Secrets Manager client with secure configuration
 */
function getSecretsManagerClient(): SecretsManagerClient {
  const config: SecretsManagerClientConfig = {
    region: process.env.AWS_REGION || 'us-east-1',
    maxAttempts: 3,
    retryMode: 'adaptive',
  };

  // Use explicit credentials if available (Fly.io environment)
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    config.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };

    // Log configuration without exposing secrets
    securityLogger.debug('AWS client initialized', {
      event: 'aws_client_init',
      region: config.region,
      hasCredentials: true,
    });
  } else {
    // Use IAM role or instance profile
    securityLogger.debug('AWS client initialized with default credentials', {
      event: 'aws_client_init',
      region: config.region,
      credentialSource: 'default',
    });
  }

  return new SecretsManagerClient(config);
}

/**
 * Fetch JWKS from AWS Secrets Manager with error handling
 */
async function fetchJWKSFromAWS(): Promise<any> {
  const client = getSecretsManagerClient();
  const secretId = 'paintbox/production/jwt/public-keys';

  try {
    const command = new GetSecretValueCommand({ SecretId: secretId });
    const response = await client.send(command);

    if (!response.SecretString) {
      throw new Error('Secret value is empty');
    }

    const publicKeys = JSON.parse(response.SecretString);

    // Validate key structure
    if (!publicKeys || typeof publicKeys !== 'object') {
      throw new Error('Invalid secret structure');
    }

    // Log success without exposing key details
    securityLogger.info('JWKS retrieved from AWS', {
      event: 'jwks_fetch_success',
      keyCount: Object.keys(publicKeys).length,
      secretId: secretId,
    });

    // Format as JWKS response
    const jwks = {
      keys: Object.entries(publicKeys).map(([kid, key]: [string, any]) => ({
        kty: key.kty || 'RSA',
        use: key.use || 'sig',
        kid: key.kid || kid,
        alg: key.alg || 'RS256',
        n: key.n,
        e: key.e || 'AQAB',
      })).filter(key => key.n && key.e), // Filter out invalid keys
    };

    if (jwks.keys.length === 0) {
      throw new Error('No valid keys found in secret');
    }

    return jwks;
  } catch (error: any) {
    // Log error with appropriate context
    const errorContext = {
      event: 'jwks_fetch_error',
      secretId: secretId,
      errorType: error.name || 'Unknown',
      errorCode: error.Code || error.$metadata?.httpStatusCode,
    };

    if (error instanceof ResourceNotFoundException) {
      securityLogger.error('JWKS secret not found', {
        ...errorContext,
        recommendation: 'Verify secret exists in AWS Secrets Manager',
      });
    } else if (error instanceof AccessDeniedException) {
      securityLogger.error('Access denied to JWKS secret', {
        ...errorContext,
        recommendation: 'Check IAM permissions for secretsmanager:GetSecretValue',
      });
    } else {
      securityLogger.error('Failed to fetch JWKS', {
        ...errorContext,
        errorMessage: error.message,
      });
    }

    throw error;
  }
}

/**
 * Get JWKS with intelligent caching
 */
async function getJWKS(): Promise<any> {
  const now = Date.now();

  // Return fresh cache if available
  if (cachedJWKS && (now - cacheTimestamp) < CACHE_TTL) {
    securityLogger.debug('Returning cached JWKS', {
      event: 'jwks_cache_hit',
      cacheAge: now - cacheTimestamp,
    });
    return cachedJWKS;
  }

  try {
    // Attempt to fetch fresh data
    const jwks = await fetchJWKSFromAWS();

    // Update cache
    cachedJWKS = jwks;
    cacheTimestamp = now;

    return jwks;
  } catch (error) {
    // If we have stale cache (up to 1 hour old), use it
    if (cachedJWKS && (now - cacheTimestamp) < CACHE_STALE_TTL) {
      securityLogger.warn('Using stale cache due to AWS error', {
        event: 'jwks_stale_cache_used',
        cacheAge: now - cacheTimestamp,
        reason: 'aws_error',
      });
      return cachedJWKS;
    }

    // No cache available - return error response
    throw new Error('JWKS unavailable and no cache exists');
  }
}

/**
 * Generate security headers
 */
function getSecurityHeaders(origin?: string | null): HeadersInit {
  // Determine CORS origin
  const corsOrigin = origin && ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];

  return {
    // CORS headers
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',

    // Security headers
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '0',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none';",
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'interest-cohort=()',

    // Content headers
    'Content-Type': 'application/json',
  };
}

/**
 * Main GET handler for JWKS endpoint
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const origin = request.headers.get('origin');

  // Apply rate limiting
  return withRateLimit(request, jwksRateLimiter, async () => {
    try {
      // Log request for security monitoring
      securityLogger.info('JWKS endpoint accessed', {
        event: 'jwks_request',
        ip: request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip') ||
            'unknown',
        userAgent: request.headers.get('user-agent'),
        origin: origin,
        environment: process.env.NODE_ENV,
      });

      // Get JWKS with caching
      const jwks = await getJWKS();

      // Validate response structure
      if (!jwks || !jwks.keys || !Array.isArray(jwks.keys)) {
        throw new Error('Invalid JWKS structure');
      }

      // Calculate cache control based on success
      const cacheControl = jwks.keys.length > 0
        ? 'public, max-age=600, must-revalidate' // 10 minutes for success
        : 'public, max-age=60, must-revalidate';  // 1 minute for empty/error

      // Log successful response
      securityLogger.info('JWKS response sent', {
        event: 'jwks_response_success',
        keyCount: jwks.keys.length,
        responseTime: Date.now() - startTime,
        cacheStatus: cachedJWKS === jwks ? 'hit' : 'miss',
      });

      // Return successful response
      return NextResponse.json(jwks, {
        status: 200,
        headers: {
          ...getSecurityHeaders(origin),
          'Cache-Control': cacheControl,
          'X-Response-Time': `${Date.now() - startTime}ms`,
        },
      });
    } catch (error: any) {
      // Log error for monitoring
      securityLogger.error('JWKS endpoint error', {
        event: 'jwks_response_error',
        errorMessage: error.message,
        responseTime: Date.now() - startTime,
      });

      // Return generic error response (don't leak internal details)
      return NextResponse.json(
        {
          error: 'Service temporarily unavailable',
          message: 'Unable to retrieve public keys. Please try again later.',
        },
        {
          status: 503,
          headers: {
            ...getSecurityHeaders(origin),
            'Cache-Control': 'no-store',
            'X-Response-Time': `${Date.now() - startTime}ms`,
            'Retry-After': '60',
          },
        }
      );
    }
  });
}

/**
 * Handle OPTIONS requests for CORS preflight
 */
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');

  // Log CORS preflight request
  securityLogger.debug('CORS preflight request', {
    event: 'cors_preflight',
    origin: origin,
    allowed: origin ? ALLOWED_ORIGINS.includes(origin) : false,
  });

  return new NextResponse(null, {
    status: 200,
    headers: getSecurityHeaders(origin),
  });
}

// Export configuration for Edge Runtime
export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const revalidate = 600; // 10 minutes

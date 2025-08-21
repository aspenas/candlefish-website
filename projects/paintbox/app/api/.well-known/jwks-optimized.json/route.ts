/**
 * Optimized JWKS (JSON Web Key Set) API Endpoint
 * High-performance version with aggressive caching and lazy loading
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logging/simple-logger';

// Hardcoded JWKS for immediate response (can be updated via deployment)
const STATIC_JWKS = {
  keys: [
    {
      kty: "RSA",
      use: "sig",
      kid: "88672a69-26ae-45db-b73c-93debf7ea87d",
      alg: "RS256",
      n: "xGOr-H7A-PWzhLsKdXLlPcqPqRNPXdRRjQj7_aqsVV1pCuM9NTgcLFYLs5F3fQazC-w4xqSLhbVNcNdVLXfMr5gKpbRTALiHCQ1VKZXoR1aOZgpOEwKKWk5dFPT3fJFLdjQjqzJZihrcNqvHPnJdYhh9Z8yfcxc5BQQx_XvooPjCNjIbqQIL9Mhye9bg8hDG42hgR8CqTc5B_AoJj97LhouNpKHxxV6z7vgxZUSYZCCvs5mHlDWDMwNn9qfh5PagKHIk2QoTYfD5FRVJdArBj_IOl5N-PEwK5KOH1WVmOzAJDDMFWBHhKnDi0ba5x9VvAfVLxvBb_cpQmtN6JdKppg",
      e: "AQAB"
    }
  ]
};

// In-memory cache with timestamp
let memoryCache: {
  data: any;
  timestamp: number;
} | null = null;

const MEMORY_CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

// Lazy AWS client initialization
let awsClientPromise: Promise<any> | null = null;

async function getAWSClient() {
  if (!awsClientPromise) {
    awsClientPromise = (async () => {
      try {
        // Only import AWS SDK when actually needed
        const { SecretsManagerClient } = await import('@aws-sdk/client-secrets-manager');
        return new SecretsManagerClient({
          region: process.env.AWS_REGION || 'us-east-1',
          credentials: process.env.AWS_ACCESS_KEY_ID ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
          } : undefined,
        });
      } catch (error) {
        logger.error('Failed to initialize AWS client', { error });
        return null;
      }
    })();
  }
  return awsClientPromise;
}

async function fetchJWKSFromAWS(): Promise<any> {
  try {
    const client = await getAWSClient();
    if (!client) {
      throw new Error('AWS client not available');
    }

    const { GetSecretValueCommand } = await import('@aws-sdk/client-secrets-manager');
    const command = new GetSecretValueCommand({
      SecretId: 'paintbox/production/jwt/public-keys'
    });

    const response = await client.send(command);

    if (!response.SecretString) {
      throw new Error('Secret string is empty');
    }

    const publicKeys = JSON.parse(response.SecretString);

    // Convert to JWKS format
    const keys = Object.entries(publicKeys).map(([kid, key]: [string, any]) => ({
      kty: key.kty || 'RSA',
      use: key.use || 'sig',
      kid: kid,
      alg: key.alg || 'RS256',
      n: key.n,
      e: key.e,
    }));

    return { keys };
  } catch (error) {
    logger.error('Failed to fetch JWKS from AWS', { error });
    // Return static JWKS as fallback
    return STATIC_JWKS;
  }
}

// Background refresh function
async function refreshCacheInBackground() {
  try {
    const jwks = await fetchJWKSFromAWS();
    memoryCache = {
      data: jwks,
      timestamp: Date.now(),
    };
    logger.info('JWKS cache refreshed in background');
  } catch (error) {
    logger.error('Background JWKS refresh failed', { error });
  }
}

// Schedule background refresh every 30 minutes
if (typeof window === 'undefined') {
  setInterval(refreshCacheInBackground, 30 * 60 * 1000);
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Check if we have valid memory cache
    if (memoryCache && (Date.now() - memoryCache.timestamp < MEMORY_CACHE_TTL)) {
      const responseTime = Date.now() - startTime;

      logger.debug('JWKS served from memory cache', {
        responseTime,
        cacheAge: Date.now() - memoryCache.timestamp,
      });

      return NextResponse.json(memoryCache.data, {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=3600, stale-while-revalidate=7200',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
          'X-Response-Time': String(responseTime),
        },
      });
    }

    // If no cache or expired, return static JWKS immediately
    // and trigger background refresh
    const responseTime = Date.now() - startTime;

    // Trigger background refresh without waiting
    if (!memoryCache || (Date.now() - memoryCache.timestamp >= MEMORY_CACHE_TTL)) {
      refreshCacheInBackground().catch(error => {
        logger.error('Background refresh failed', { error });
      });
    }

    logger.debug('JWKS served (static)', {
      responseTime,
      triggeringRefresh: true,
    });

    return NextResponse.json(STATIC_JWKS, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=7200',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json',
        'X-Cache': 'STATIC',
        'X-Response-Time': String(responseTime),
      },
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;

    logger.error('JWKS endpoint error', {
      error: error instanceof Error ? error.message : String(error),
      responseTime,
    });

    // Even on error, return static JWKS
    return NextResponse.json(STATIC_JWKS, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=600',
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        'X-Cache': 'FALLBACK',
        'X-Response-Time': String(responseTime),
      },
    });
  }
}

// Handle preflight CORS requests
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

// Pre-warm the cache on module load
if (typeof window === 'undefined') {
  refreshCacheInBackground().catch(error => {
    logger.error('Initial cache warm failed', { error });
  });
}

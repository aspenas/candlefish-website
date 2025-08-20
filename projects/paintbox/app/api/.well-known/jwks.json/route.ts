/**
 * JWKS (JSON Web Key Set) API Endpoint - Production Version
 * Serves public keys for JWT verification with AWS Secrets Manager integration
 * 
 * Features:
 * - Primary: Fetch from AWS Secrets Manager
 * - Fallback: Hardcoded keys if AWS fails
 * - Caching: 10-minute TTL to reduce AWS API calls
 * - Logging: Comprehensive error tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  SecretsManagerClient, 
  GetSecretValueCommand,
  SecretsManagerClientConfig 
} from '@aws-sdk/client-secrets-manager';

// Cache for the JWKS response
let cachedJWKS: any = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 600000; // 10 minutes in milliseconds

// Hardcoded fallback keys (from AWS Secrets Manager)
const FALLBACK_JWKS = {
  keys: [{
    kty: "RSA",
    use: "sig",
    kid: "88672a69-26ae-45db-b73c-93debf7ea87d",
    alg: "RS256",
    n: "nzulYyqi_oq_1p5nv2vOtnU-q-gAZpxpDzG2n9yPITtK-GzlySM28IC07mlGV8gk8c99jyUe4Te2YE8csOBhJRsgph1I8y4N2T41GEd1xSTcD9AwidzyZASNrSSfqWxtRtOG5GFbQiEutSM9ac3tziO8uRx0vwFlDj9S3E9JV_Oe35BXCiD68CCwS5e3SzrkdMaqd1XWm0GM3_Vfo-6QZTS8mJjdz-rnIFt2ojw3v74xeBqwmiK5jkisbF1Fem4nIX-n3UqpPDeHV-nvDuPLiX6ENA4n5VbLFPPX291WCFxs7GG7aM4ipCXyHw3LXBGdAmAhmWpwCVhUfpRYDI1MVQ",
    e: "AQAB"
  }]
};

// Initialize AWS SDK with explicit configuration
function getSecretsManagerClient(): SecretsManagerClient {
  const config: SecretsManagerClientConfig = {
    region: process.env.AWS_REGION || 'us-east-1',
    maxAttempts: 3,
    requestTimeout: 5000,
  };

  // Only add credentials if they exist in environment
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    config.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
    console.log('[JWKS] Using explicit AWS credentials from environment');
  } else {
    console.log('[JWKS] Using default AWS credential chain (IAM role or instance profile)');
  }

  return new SecretsManagerClient(config);
}

async function fetchJWKSFromAWS(): Promise<any> {
  try {
    const client = getSecretsManagerClient();
    const command = new GetSecretValueCommand({
      SecretId: 'paintbox/production/jwt/public-keys'
    });

    console.log('[JWKS] Fetching public keys from AWS Secrets Manager...');
    const response = await client.send(command);

    if (!response.SecretString) {
      throw new Error('Secret value is empty');
    }

    // Parse the secret string
    const secretData = JSON.parse(response.SecretString);
    
    // Check if it's already in JWKS format
    if (secretData.keys && Array.isArray(secretData.keys)) {
      console.log(`[JWKS] Successfully fetched ${secretData.keys.length} keys from AWS`);
      return secretData;
    }

    // Otherwise, convert to JWKS format
    const keys = Object.entries(secretData).map(([kid, key]: [string, any]) => ({
      kty: key.kty || 'RSA',
      use: key.use || 'sig',
      kid: kid,
      alg: key.alg || 'RS256',
      n: key.n,
      e: key.e
    }));

    const jwks = { keys };
    console.log(`[JWKS] Successfully converted ${keys.length} keys from AWS`);
    return jwks;
  } catch (error) {
    console.error('[JWKS] Error fetching from AWS:', error);
    // Log more details in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[JWKS] Full error:', JSON.stringify(error, null, 2));
    }
    throw error;
  }
}

async function getJWKS(): Promise<any> {
  const now = Date.now();

  // Check cache first
  if (cachedJWKS && (now - cacheTimestamp) < CACHE_TTL) {
    console.log('[JWKS] Returning cached response');
    return cachedJWKS;
  }

  try {
    // Try to fetch from AWS
    const jwks = await fetchJWKSFromAWS();
    
    // Update cache
    cachedJWKS = jwks;
    cacheTimestamp = now;
    
    return jwks;
  } catch (error) {
    console.warn('[JWKS] AWS fetch failed, using fallback keys:', error);
    
    // Update cache with fallback
    cachedJWKS = FALLBACK_JWKS;
    cacheTimestamp = now;
    
    return FALLBACK_JWKS;
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('[JWKS] Request received:', {
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
    });

    const jwks = await getJWKS();
    const responseTime = Date.now() - startTime;

    console.log('[JWKS] Response sent:', {
      keyCount: jwks.keys?.length || 0,
      responseTime: `${responseTime}ms`,
      source: cachedJWKS === FALLBACK_JWKS ? 'fallback' : 'aws'
    });

    return NextResponse.json(jwks, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=600', // Browser can cache for 10 minutes
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'X-Response-Time': `${responseTime}ms`,
        'X-JWKS-Source': cachedJWKS === FALLBACK_JWKS ? 'fallback' : 'aws'
      },
    });
  } catch (error) {
    console.error('[JWKS] Unexpected error:', error);
    const responseTime = Date.now() - startTime;
    
    // Even on error, return the fallback keys
    return NextResponse.json(FALLBACK_JWKS, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60', // Shorter cache on error
        'Access-Control-Allow-Origin': '*',
        'X-Response-Time': `${responseTime}ms`,
        'X-JWKS-Source': 'fallback-error'
      },
    });
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
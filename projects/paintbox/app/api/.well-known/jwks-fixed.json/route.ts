/**
 * JWKS (JSON Web Key Set) API Endpoint - Fixed Version
 * Serves public keys for JWT verification with proper AWS Secrets Manager integration
 * 
 * This implementation includes:
 * - Proper AWS SDK initialization for Fly.io environment
 * - Comprehensive error handling and logging
 * - Fallback to hardcoded keys if AWS fails
 * - Caching to reduce AWS API calls
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

/**
 * Initialize AWS Secrets Manager client with proper configuration for Fly.io
 */
function getSecretsManagerClient(): SecretsManagerClient {
  const config: SecretsManagerClientConfig = {
    region: process.env.AWS_REGION || 'us-east-1',
  };

  // Check if we have explicit AWS credentials (Fly.io environment)
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    console.log('[JWKS] Using explicit AWS credentials from environment');
    config.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
  } else {
    console.log('[JWKS] No explicit AWS credentials found, using default chain');
  }

  return new SecretsManagerClient(config);
}

/**
 * Fetch JWKS from AWS Secrets Manager
 */
async function fetchJWKSFromAWS(): Promise<any> {
  const client = getSecretsManagerClient();
  
  try {
    console.log('[JWKS] Fetching public keys from AWS Secrets Manager...');
    
    const command = new GetSecretValueCommand({
      SecretId: 'paintbox/production/jwt/public-keys'
    });
    
    const response = await client.send(command);
    
    if (!response.SecretString) {
      throw new Error('Secret has no value');
    }
    
    const publicKeys = JSON.parse(response.SecretString);
    console.log(`[JWKS] Successfully retrieved ${Object.keys(publicKeys).length} key(s) from AWS`);
    
    // Format as JWKS response
    const jwks = {
      keys: Object.entries(publicKeys).map(([kid, key]: [string, any]) => ({
        kty: key.kty || 'RSA',
        use: key.use || 'sig',
        kid: key.kid || kid,
        alg: key.alg || 'RS256',
        n: key.n,
        e: key.e || 'AQAB'
      }))
    };
    
    return jwks;
  } catch (error: any) {
    console.error('[JWKS] Failed to fetch from AWS Secrets Manager:', {
      error: error.message,
      code: error.Code || error.name,
      secretId: 'paintbox/production/jwt/public-keys',
      region: process.env.AWS_REGION || 'us-east-1',
      hasCredentials: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
    });
    
    // Log specific error types for debugging
    if (error.name === 'AccessDeniedException') {
      console.error('[JWKS] ❌ ACCESS DENIED - IAM permissions issue');
      console.error('[JWKS] Required permission: secretsmanager:GetSecretValue');
      console.error('[JWKS] Required resource: arn:aws:secretsmanager:*:*:secret:paintbox/*');
    } else if (error.name === 'ResourceNotFoundException') {
      console.error('[JWKS] ❌ SECRET NOT FOUND - Check secret name');
    } else if (error.name === 'InvalidRequestException') {
      console.error('[JWKS] ❌ INVALID REQUEST - Check AWS configuration');
    } else if (error.name === 'InvalidParameterException') {
      console.error('[JWKS] ❌ INVALID PARAMETER - Check secret format');
    }
    
    throw error;
  }
}

/**
 * Get JWKS with caching and fallback
 */
async function getJWKS(): Promise<any> {
  // Check cache first
  const now = Date.now();
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
    console.error('[JWKS] Falling back to hardcoded keys due to AWS error');
    
    // If we have a cached version (even if expired), use it
    if (cachedJWKS) {
      console.log('[JWKS] Using expired cache as fallback');
      return cachedJWKS;
    }
    
    // Otherwise, use hardcoded fallback
    console.log('[JWKS] Using hardcoded fallback keys');
    return FALLBACK_JWKS;
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Log the request for debugging
    console.log('[JWKS] Endpoint requested', {
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      env: {
        NODE_ENV: process.env.NODE_ENV,
        FLY_APP_NAME: process.env.FLY_APP_NAME,
        AWS_REGION: process.env.AWS_REGION,
        hasAWSCreds: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
      }
    });

    // Get JWKS (with caching and fallback)
    const jwks = await getJWKS();
    
    // Validate response
    if (!jwks || !jwks.keys || jwks.keys.length === 0) {
      console.error('[JWKS] ❌ Invalid JWKS response - empty keys array');
      // Still return fallback to prevent complete failure
      return NextResponse.json(FALLBACK_JWKS, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60', // Short cache on error
          'Access-Control-Allow-Origin': '*',
          'X-JWKS-Source': 'fallback',
          'X-Response-Time': `${Date.now() - startTime}ms`
        },
      });
    }
    
    console.log(`[JWKS] ✅ Returning ${jwks.keys.length} key(s) - Response time: ${Date.now() - startTime}ms`);
    
    return NextResponse.json(jwks, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=600', // Cache for 10 minutes
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'X-JWKS-Source': cachedJWKS === jwks ? 'cache' : 'aws',
        'X-Response-Time': `${Date.now() - startTime}ms`
      },
    });
  } catch (error: any) {
    console.error('[JWKS] Unexpected error in endpoint:', error);
    
    // Always return the fallback keys to prevent complete failure
    return NextResponse.json(FALLBACK_JWKS, {
      status: 200, // Return 200 even on error to prevent client failures
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60', // Short cache on error
        'Access-Control-Allow-Origin': '*',
        'X-JWKS-Source': 'fallback-error',
        'X-Error': error.message || 'Unknown error',
        'X-Response-Time': `${Date.now() - startTime}ms`
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
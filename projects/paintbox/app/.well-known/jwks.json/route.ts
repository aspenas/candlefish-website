/**
 * Direct JWKS Route Handler for /.well-known/jwks.json
 * This file serves the JWKS endpoint directly without rewrites
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchJWKS, testConnection } from '@/lib/services/jwks-secrets-manager';

// Fallback JWKS data
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

// Cache
let cache: { data: any; timestamp: number; source: string } | null = null;
const CACHE_TTL = 600000; // 10 minutes

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Check cache
    if (cache && (Date.now() - cache.timestamp) < CACHE_TTL) {
      console.log('[JWKS] Returning cached response');
      return NextResponse.json(cache.data, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=600',
          'X-JWKS-Source': 'cache',
          'X-Response-Time': `${Date.now() - startTime}ms`
        }
      });
    }

    // Try AWS Secrets Manager
    try {
      console.log('[JWKS] Fetching from AWS Secrets Manager...');
      const jwks = await fetchJWKS();

      // Update cache
      cache = {
        data: jwks,
        timestamp: Date.now(),
        source: 'aws'
      };

      console.log(`[JWKS] Success: ${jwks.keys.length} keys from AWS`);

      return NextResponse.json(jwks, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=600',
          'Access-Control-Allow-Origin': '*',
          'X-JWKS-Source': 'aws',
          'X-Response-Time': `${Date.now() - startTime}ms`
        }
      });
    } catch (awsError) {
      console.error('[JWKS] AWS fetch failed:', awsError);

      // Use fallback
      cache = {
        data: FALLBACK_JWKS,
        timestamp: Date.now(),
        source: 'fallback'
      };

      return NextResponse.json(FALLBACK_JWKS, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60',
          'Access-Control-Allow-Origin': '*',
          'X-JWKS-Source': 'fallback',
          'X-Response-Time': `${Date.now() - startTime}ms`
        }
      });
    }
  } catch (error) {
    console.error('[JWKS] Unexpected error:', error);

    // Always return something
    return NextResponse.json(FALLBACK_JWKS, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
        'Access-Control-Allow-Origin': '*',
        'X-JWKS-Source': 'fallback-error'
      }
    });
  }
}

export async function HEAD(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache',
      'X-JWKS-Available': 'true'
    }
  });
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
}

import { NextResponse } from 'next/server';
import { getCompanyCamToken, getDatabaseUrl, getRedisUrl, getSalesforceCredentials, getSecretsManager } from '@/lib/services/secrets-manager';
import getCacheInstance from '@/lib/cache/cache-service';
import { companyCamApi } from '@/lib/services/companycam-api';

export async function GET() {
  try {
    const startedAt = Date.now();

    // Secrets
    const secretsManager = getSecretsManager();
    const secrets = await secretsManager.getSecrets();

    // Cache/Redis
    const cache = getCacheInstance();
    let cacheOk = false;
    try {
      await cache.set('health:ping', '1', 5);
      const v = await cache.get('health:ping');
      cacheOk = v === '1';
    } catch {
      cacheOk = false;
    }

    // Database URL presence (connectivity would be validated in backend service)
    const dbUrl = await getDatabaseUrl();

    // Redis URL
    const redisUrl = await getRedisUrl();

    // Salesforce creds presence
    let salesforceOk = false;
    try {
      const sf = await getSalesforceCredentials();
      salesforceOk = Boolean(sf.clientId && sf.clientSecret && sf.username);
    } catch {
      salesforceOk = false;
    }

    // CompanyCam API token and health
    const ccToken = await getCompanyCamToken();
    const ccHealth = await companyCamApi.healthCheck();

    // JWT keys presence
    const jwtOk = Boolean(secrets.jwt?.publicKey && secrets.jwt?.privateKey) ||
      Boolean(process.env.JWT_PUBLIC_KEY && process.env.JWT_PRIVATE_KEY);

    const healthy = cacheOk && !!dbUrl && !!redisUrl && salesforceOk && ccHealth.status === 'online' && jwtOk;

    return NextResponse.json({
      status: healthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      slo: {
        target_ttfb_ms_p95: 300,
        target_error_rate_5m: 0.005,
        target_availability: 0.995
      },
      checks: {
        cache: cacheOk,
        databaseUrlPresent: Boolean(dbUrl),
        redisUrlPresent: Boolean(redisUrl),
        salesforceCredsPresent: salesforceOk,
        companyCam: ccHealth,
        jwtKeysPresent: jwtOk,
      },
      durationMs: Date.now() - startedAt,
    }, {
      status: healthy ? 200 : 206,
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      { status: 'unhealthy', timestamp: new Date().toISOString(), error: 'Internal server error' },
      { status: 503 }
    );
  }
}

// Support HEAD requests for basic health checks
export async function HEAD() {
  return new Response(null, { status: 200 });
}

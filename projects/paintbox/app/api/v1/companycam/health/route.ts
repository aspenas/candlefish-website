import { NextResponse } from 'next/server';
import { getCompanyCamToken } from '@/lib/services/secrets-manager';
import { companyCamApi } from '@/lib/services/companycam-api';

export async function GET() {
  try {
    const token = await getCompanyCamToken();
    const isConfigured = Boolean(token);

    let apiHealthy = false;

    if (isConfigured) {
      const healthCheck = await companyCamApi.healthCheck();
      apiHealthy = healthCheck.status === 'online';
    }

    const status = isConfigured && apiHealthy ? 'healthy' : isConfigured ? 'degraded' : 'unconfigured';

    return NextResponse.json({
      status,
      service: 'companycam',
      configured: isConfigured,
      apiStatus: apiHealthy ? 'online' : 'offline',
      timestamp: new Date().toISOString(),
    }, { status: status === 'healthy' ? 200 : status === 'degraded' ? 503 : 501 });
  } catch (error) {
    console.error('CompanyCam health check failed:', error);
    return NextResponse.json({
      status: 'error',
      service: 'companycam',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

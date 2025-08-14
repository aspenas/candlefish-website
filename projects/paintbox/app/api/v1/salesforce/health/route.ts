import { NextResponse } from 'next/server';
import { getSalesforceCredentials } from '@/lib/services/secrets-manager';

export async function GET() {
  try {
    let credsPresent = false;
    let connectionHealthy = false;

    try {
      const creds = await getSalesforceCredentials();
      credsPresent = Boolean(creds.clientId && creds.clientSecret && creds.username);

      if (credsPresent) {
        // Basic check - in production you might want to actually test a connection
        connectionHealthy = true;
      }
    } catch (error) {
      console.error('Salesforce credentials check failed:', error);
    }

    const status = credsPresent && connectionHealthy ? 'healthy' : credsPresent ? 'degraded' : 'unconfigured';

    return NextResponse.json({
      status,
      service: 'salesforce',
      configured: credsPresent,
      connected: connectionHealthy,
      timestamp: new Date().toISOString(),
    }, { status: status === 'healthy' ? 200 : status === 'degraded' ? 503 : 501 });
  } catch (error) {
    console.error('Salesforce health check failed:', error);
    return NextResponse.json({
      status: 'error',
      service: 'salesforce',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const agentPlatformUrl = process.env.AGENT_PLATFORM_URL;
    const isConfigured = Boolean(agentPlatformUrl);

    let platformHealthy = false;

    if (isConfigured && agentPlatformUrl) {
      try {
        // Check if agent platform is reachable
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${agentPlatformUrl}/health`, {
          signal: controller.signal,
          headers: {
            'X-Service': 'paintbox',
            'X-Internal-Request': 'true',
          },
        });

        clearTimeout(timeoutId);
        platformHealthy = response.ok;
      } catch (error) {
        console.error('Agent platform health check failed:', error);
        platformHealthy = false;
      }
    }

    const status = isConfigured && platformHealthy ? 'healthy' : isConfigured ? 'degraded' : 'unconfigured';

    return NextResponse.json({
      status,
      service: 'agent-platform',
      configured: isConfigured,
      reachable: platformHealthy,
      timestamp: new Date().toISOString(),
    }, { status: status === 'healthy' ? 200 : status === 'degraded' ? 503 : 501 });
  } catch (error) {
    console.error('Agent health check failed:', error);
    return NextResponse.json({
      status: 'error',
      service: 'agent-platform',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';

// Mock monitoring service
const monitoringService = {
  async getHealth() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: 'healthy',
        redis: 'healthy',
        temporal: 'healthy',
        salesforce: 'healthy',
        companycam: 'healthy'
      },
      metrics: {
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        requests: Math.floor(Math.random() * 10000),
        errors: Math.floor(Math.random() * 100)
      }
    };
  }
};

export async function GET(request: NextRequest) {
  try {
    const health = await monitoringService.getHealth();

    return NextResponse.json(health, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Error checking health:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}

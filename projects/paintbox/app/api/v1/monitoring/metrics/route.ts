import { NextRequest, NextResponse } from 'next/server';

// Mock metrics service
const metricsService = {
  async getMetrics(period: string) {
    const now = Date.now();
    const hourAgo = now - 3600000;

    return {
      period,
      startTime: new Date(hourAgo).toISOString(),
      endTime: new Date(now).toISOString(),
      metrics: {
        requests: {
          total: 5432,
          success: 5200,
          failure: 232,
          rate: 1.5
        },
        latency: {
          p50: 45,
          p90: 120,
          p95: 200,
          p99: 500,
          average: 85
        },
        errors: {
          total: 232,
          rate: 0.04,
          types: {
            '4xx': 180,
            '5xx': 52
          }
        },
        resources: {
          cpu: {
            usage: 35.5,
            cores: 4
          },
          memory: {
            used: 1024,
            total: 4096,
            percentage: 25
          },
          disk: {
            used: 10240,
            total: 102400,
            percentage: 10
          }
        }
      }
    };
  }
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'hour';

    const metrics = await metricsService.getMetrics(period);

    return NextResponse.json(metrics, {
      headers: {
        'Cache-Control': 'max-age=60'
      }
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}

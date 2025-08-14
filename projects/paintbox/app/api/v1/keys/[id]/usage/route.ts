import { NextRequest, NextResponse } from 'next/server';

// Mock usage service
const usageService = {
  async getKeyUsage(id: string, params: any) {
    return {
      keyId: id,
      period: params.period || 'day',
      startDate: params.startDate || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      endDate: params.endDate || new Date().toISOString(),
      totalRequests: 1234,
      successfulRequests: 1200,
      failedRequests: 34,
      averageLatency: 145,
      usage: [
        {
          timestamp: new Date().toISOString(),
          requests: 50,
          errors: 2,
          latency: 120
        },
        {
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          requests: 45,
          errors: 1,
          latency: 135
        }
      ]
    };
  }
};

// Rate limiter mock
const rateLimiter = {
  async check(ip: string) {
    return { allowed: true, remaining: 99, resetTime: Date.now() + 60000 };
  }
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'day';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Check rate limit
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateLimitCheck = await rateLimiter.check(ip);

    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitCheck.resetTime.toString()
          }
        }
      );
    }

    const usage = await usageService.getKeyUsage(id, {
      period,
      startDate,
      endDate
    });

    return NextResponse.json(usage, {
      headers: {
        'X-RateLimit-Remaining': rateLimitCheck.remaining.toString(),
        'X-RateLimit-Reset': rateLimitCheck.resetTime?.toString() || ''
      }
    });
  } catch (error) {
    console.error('Error fetching key usage:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

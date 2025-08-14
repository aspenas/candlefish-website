import { NextRequest, NextResponse } from 'next/server';

// Mock audit service for now
const auditService = {
  async getEvents(params: any) {
    return {
      events: [
        {
          id: 'event-1',
          timestamp: new Date().toISOString(),
          service: 'api',
          action: 'test',
          user: 'test-user',
          ip: '127.0.0.1',
          success: true,
          details: 'Test event'
        }
      ],
      total: 1,
      page: params.page || 1,
      limit: params.limit || 50
    };
  },

  async searchEvents(query: string) {
    return {
      events: [],
      total: 0,
      query
    };
  },

  async logEvent(event: any) {
    return { ...event, id: `event-${Date.now()}` };
  }
};

// Mock rate limiter
const rateLimiter = {
  async check(ip: string) {
    return { allowed: true, remaining: 99, resetTime: Date.now() + 60000 };
  }
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const service = searchParams.get('service');
    const action = searchParams.get('action');
    const user = searchParams.get('user');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const success = searchParams.get('success');
    const query = searchParams.get('query');

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

    // Get events
    let result;
    if (query) {
      result = await auditService.searchEvents(query);
    } else {
      result = await auditService.getEvents({
        page,
        limit,
        service,
        action,
        user,
        startDate,
        endDate,
        success: success ? success === 'true' : undefined
      });
    }

    return NextResponse.json(result, {
      headers: {
        'X-RateLimit-Remaining': rateLimitCheck.remaining.toString(),
        'X-RateLimit-Reset': rateLimitCheck.resetTime?.toString() || ''
      }
    });
  } catch (error) {
    console.error('Error fetching audit events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

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

    // Log event
    const event = await auditService.logEvent({
      ...body,
      timestamp: new Date().toISOString(),
      ip
    });

    return NextResponse.json(event, {
      status: 201,
      headers: {
        'X-RateLimit-Remaining': rateLimitCheck.remaining.toString(),
        'X-RateLimit-Reset': rateLimitCheck.resetTime?.toString() || ''
      }
    });
  } catch (error) {
    console.error('Error logging audit event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

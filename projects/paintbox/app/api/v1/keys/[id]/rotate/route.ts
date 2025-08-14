import { NextRequest, NextResponse } from 'next/server';

// Mock key service
const keyService = {
  async getKey(id: string) {
    if (!id || id === 'not-found') return null;

    return {
      id,
      key: `pk_${Math.random().toString(36).substring(2, 15)}`,
      name: 'API Key',
      status: 'active'
    };
  },

  async rotateKey(id: string) {
    const key = await this.getKey(id);
    if (!key) return null;

    return {
      ...key,
      key: `pk_${Math.random().toString(36).substring(2, 15)}`,
      previousKey: key.key,
      rotatedAt: new Date().toISOString(),
      rotationCount: 1
    };
  }
};

// Rate limiter mock
const rateLimiter = {
  async check(ip: string) {
    return { allowed: true, remaining: 99, resetTime: Date.now() + 60000 };
  }
};

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

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

    const rotatedKey = await keyService.rotateKey(id);

    if (!rotatedKey) {
      return NextResponse.json(
        { error: 'Key not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(rotatedKey, {
      status: 200,
      headers: {
        'X-RateLimit-Remaining': rateLimitCheck.remaining.toString(),
        'X-RateLimit-Reset': rateLimitCheck.resetTime?.toString() || ''
      }
    });
  } catch (error) {
    console.error('Error rotating key:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

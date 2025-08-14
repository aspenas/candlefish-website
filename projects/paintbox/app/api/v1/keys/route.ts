import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Validation schemas
const createKeySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional().default([]),
  expiresAt: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.any()).optional()
});

// Mock key service
const keyService = {
  async createKey(data: any) {
    const key = {
      id: `key-${Date.now()}`,
      key: `pk_${Math.random().toString(36).substring(2, 15)}`,
      name: data.name,
      description: data.description,
      permissions: data.permissions || [],
      createdAt: new Date().toISOString(),
      expiresAt: data.expiresAt,
      lastUsed: null,
      metadata: data.metadata || {},
      status: 'active'
    };
    return key;
  },

  async listKeys(params: any) {
    return {
      keys: [
        {
          id: 'key-1',
          name: 'Production API Key',
          description: 'Main production key',
          permissions: ['read', 'write'],
          createdAt: new Date().toISOString(),
          lastUsed: new Date().toISOString(),
          status: 'active'
        }
      ],
      total: 1,
      page: params.page || 1,
      limit: params.limit || 50
    };
  }
};

// Rate limiter mock
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
    const status = searchParams.get('status');

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

    const result = await keyService.listKeys({
      page,
      limit,
      status
    });

    return NextResponse.json(result, {
      headers: {
        'X-RateLimit-Remaining': rateLimitCheck.remaining.toString(),
        'X-RateLimit-Reset': rateLimitCheck.resetTime?.toString() || ''
      }
    });
  } catch (error) {
    console.error('Error listing keys:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validationResult = createKeySchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.errors },
        { status: 400 }
      );
    }

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

    const key = await keyService.createKey(validationResult.data);

    return NextResponse.json(key, {
      status: 201,
      headers: {
        'X-RateLimit-Remaining': rateLimitCheck.remaining.toString(),
        'X-RateLimit-Reset': rateLimitCheck.resetTime?.toString() || ''
      }
    });
  } catch (error) {
    console.error('Error creating key:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

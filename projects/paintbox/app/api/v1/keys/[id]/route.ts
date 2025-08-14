import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Update key schema
const updateKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  status: z.enum(['active', 'inactive', 'revoked']).optional(),
  metadata: z.record(z.string(), z.any()).optional()
});

// Mock key service
const keyService = {
  async getKey(id: string) {
    if (!id || id === 'not-found') return null;

    return {
      id,
      key: `pk_${Math.random().toString(36).substring(2, 15)}`,
      name: 'API Key',
      description: 'Test key',
      permissions: ['read', 'write'],
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      status: 'active',
      metadata: {}
    };
  },

  async updateKey(id: string, updates: any) {
    const key = await this.getKey(id);
    if (!key) return null;

    return {
      ...key,
      ...updates,
      updatedAt: new Date().toISOString()
    };
  },

  async deleteKey(id: string) {
    const key = await this.getKey(id);
    if (!key) return false;
    return true;
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

    const key = await keyService.getKey(id);

    if (!key) {
      return NextResponse.json(
        { error: 'Key not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(key, {
      headers: {
        'X-RateLimit-Remaining': rateLimitCheck.remaining.toString(),
        'X-RateLimit-Reset': rateLimitCheck.resetTime?.toString() || ''
      }
    });
  } catch (error) {
    console.error('Error fetching key:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    // Validate request body
    const validationResult = updateKeySchema.safeParse(body);
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

    const key = await keyService.updateKey(id, validationResult.data);

    if (!key) {
      return NextResponse.json(
        { error: 'Key not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(key, {
      headers: {
        'X-RateLimit-Remaining': rateLimitCheck.remaining.toString(),
        'X-RateLimit-Reset': rateLimitCheck.resetTime?.toString() || ''
      }
    });
  } catch (error) {
    console.error('Error updating key:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const success = await keyService.deleteKey(id);

    if (!success) {
      return NextResponse.json(
        { error: 'Key not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Key deleted successfully' },
      {
        status: 200,
        headers: {
          'X-RateLimit-Remaining': rateLimitCheck.remaining.toString(),
          'X-RateLimit-Reset': rateLimitCheck.resetTime?.toString() || ''
        }
      }
    );
  } catch (error) {
    console.error('Error deleting key:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

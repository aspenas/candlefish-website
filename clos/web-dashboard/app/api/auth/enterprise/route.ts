/**
 * Enterprise Authentication API Routes
 * Production-grade authentication endpoints with comprehensive security
 */

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { AuthenticationService } from '@/lib/auth/auth-service';
import { cookies } from 'next/headers';
import crypto from 'crypto';

// Initialize database connection
const db = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'clos_production',
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Initialize Redis connection
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryStrategy: (times) => Math.min(times * 50, 2000),
  enableTLS: process.env.REDIS_ENABLE_TLS === 'true',
});

// Initialize authentication service
const authService = new AuthenticationService({
  jwtSecret: process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  database: db,
  redis,
  encryptionKey: process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'),
  enableAuditLog: process.env.ENABLE_AUDIT_LOG === 'true',
  enableMFA: process.env.ENABLE_MFA === 'true',
  maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
  lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '900000'), // 15 minutes
});

/**
 * Extract metadata from request
 */
function extractMetadata(request: NextRequest) {
  return {
    userAgent: request.headers.get('user-agent') || undefined,
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 
                request.headers.get('x-real-ip') || 
                undefined,
    deviceId: request.headers.get('x-device-id') || undefined,
  };
}

/**
 * Set secure cookies
 */
function setAuthCookies(tokens: any) {
  const cookieStore = cookies();
  const isProduction = process.env.NODE_ENV === 'production';

  // Access token cookie
  cookieStore.set('accessToken', tokens.accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 15 * 60, // 15 minutes
    path: '/',
    domain: isProduction ? '.candlefish.ai' : undefined,
  });

  // Refresh token cookie
  cookieStore.set('refreshToken', tokens.refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
    domain: isProduction ? '.candlefish.ai' : undefined,
  });

  // CSRF token cookie (for additional security)
  const csrfToken = crypto.randomBytes(32).toString('hex');
  cookieStore.set('csrfToken', csrfToken, {
    httpOnly: false, // Needs to be readable by JavaScript
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 15 * 60, // 15 minutes
    path: '/',
    domain: isProduction ? '.candlefish.ai' : undefined,
  });
}

/**
 * Login endpoint
 */
export async function POST(request: NextRequest) {
  try {
    // Check content type
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'INVALID_CONTENT_TYPE',
          message: 'Content-Type must be application/json' 
        },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const metadata = extractMetadata(request);

    // Perform login
    const result = await authService.login(body, metadata);

    // Handle MFA challenge
    if (result.requiresMFA) {
      return NextResponse.json({
        success: false,
        requiresMFA: true,
        mfaToken: result.mfaToken,
        message: 'MFA verification required',
      }, { status: 200 });
    }

    // Set secure cookies
    setAuthCookies(result.tokens);

    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        user: result.user,
        session: result.session,
        expiresIn: result.tokens.expiresIn,
      },
      message: 'Login successful',
    }, {
      status: 200,
      headers: {
        'X-Auth-Token-Type': result.tokens.tokenType,
        'X-Session-Id': result.session.id,
      },
    });

  } catch (error: any) {
    console.error('Login error:', error);

    // Handle specific error types
    if (error.message.includes('rate limit')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'RATE_LIMIT_EXCEEDED',
          message: error.message 
        },
        { status: 429 }
      );
    }

    if (error.message.includes('locked')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'ACCOUNT_LOCKED',
          message: error.message 
        },
        { status: 423 }
      );
    }

    if (error.message.includes('Invalid credentials')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'INVALID_CREDENTIALS',
          message: 'Invalid username or password' 
        },
        { status: 401 }
      );
    }

    if (error.message.includes('inactive')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'ACCOUNT_INACTIVE',
          message: 'Account is inactive. Please contact support.' 
        },
        { status: 403 }
      );
    }

    // Generic error response
    return NextResponse.json(
      { 
        success: false, 
        error: 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'production' 
          ? 'An error occurred during login' 
          : error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * Logout endpoint
 */
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const accessToken = cookieStore.get('accessToken')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'NO_TOKEN',
          message: 'No active session found' 
        },
        { status: 401 }
      );
    }

    // Check for logout all parameter
    const url = new URL(request.url);
    const logoutAll = url.searchParams.get('all') === 'true';

    // Perform logout
    await authService.logout(accessToken, { logoutAll });

    // Clear cookies
    cookieStore.delete('accessToken');
    cookieStore.delete('refreshToken');
    cookieStore.delete('csrfToken');

    return NextResponse.json({
      success: true,
      message: logoutAll ? 'All sessions terminated' : 'Logout successful',
    });

  } catch (error: any) {
    console.error('Logout error:', error);

    return NextResponse.json(
      { 
        success: false, 
        error: 'LOGOUT_ERROR',
        message: 'Error during logout' 
      },
      { status: 500 }
    );
  }
}

/**
 * Validate token endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const accessToken = cookieStore.get('accessToken')?.value;

    // Also check Authorization header
    const authHeader = request.headers.get('authorization');
    const headerToken = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    const token = accessToken || headerToken;

    if (!token) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'NO_TOKEN',
          message: 'No token provided' 
        },
        { status: 401 }
      );
    }

    // Validate token
    const payload = await authService.validateToken(token);

    return NextResponse.json({
      success: true,
      data: {
        userId: payload.userId,
        username: payload.username,
        email: payload.email,
        role: payload.role,
        sessionId: payload.sessionId,
      },
    });

  } catch (error: any) {
    console.error('Token validation error:', error);

    if (error.message.includes('expired')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'TOKEN_EXPIRED',
          message: 'Token has expired' 
        },
        { status: 401 }
      );
    }

    if (error.message.includes('revoked')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'TOKEN_REVOKED',
          message: 'Token has been revoked' 
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'INVALID_TOKEN',
        message: 'Invalid token' 
      },
      { status: 401 }
    );
  }
}

/**
 * Refresh token endpoint
 */
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const refreshToken = cookieStore.get('refreshToken')?.value;

    if (!refreshToken) {
      // Try to get from body
      const body = await request.json();
      if (!body.refreshToken) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'NO_REFRESH_TOKEN',
            message: 'No refresh token provided' 
          },
          { status: 401 }
        );
      }
    }

    const metadata = extractMetadata(request);

    // Perform token refresh
    const result = await authService.refreshToken(
      refreshToken || (await request.json()).refreshToken,
      metadata
    );

    // Set new cookies
    setAuthCookies(result.tokens);

    return NextResponse.json({
      success: true,
      data: {
        user: result.user,
        expiresIn: result.tokens.expiresIn,
      },
      message: 'Token refreshed successfully',
    });

  } catch (error: any) {
    console.error('Token refresh error:', error);

    if (error.message.includes('Device mismatch')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'DEVICE_MISMATCH',
          message: 'Security violation: Device mismatch detected' 
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'REFRESH_FAILED',
        message: 'Failed to refresh token' 
      },
      { status: 401 }
    );
  }
}

/**
 * Health check for auth service
 */
export async function HEAD(request: NextRequest) {
  try {
    // Check database connection
    await db.query('SELECT 1');
    
    // Check Redis connection
    await redis.ping();

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error('Health check failed:', error);
    return new NextResponse(null, { status: 503 });
  }
}
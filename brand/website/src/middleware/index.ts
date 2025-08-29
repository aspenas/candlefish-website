/**
 * Unified Security Middleware
 * Integrates rate limiting, security headers, authentication, and HTTPS enforcement
 * SECURITY LEVEL: CRITICAL
 */

import { NextRequest, NextResponse } from 'next/server';
import { rateLimitMiddleware } from './rate-limiter';
import { securityHeadersMiddleware } from './security-headers';
import { verifyToken, getAuthToken } from '@/lib/auth/jwt-manager';

// Public paths that don't require authentication
const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/health',
  '/_next',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
];

// Admin-only paths
const ADMIN_PATHS = [
  '/admin',
  '/api/admin',
  '/dashboard/settings',
  '/dashboard/users',
  '/dashboard/secrets',
];

// API paths that require special handling
const API_PATHS = [
  '/api/',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 1. Check if path is public
  const isPublicPath = PUBLIC_PATHS.some(path => 
    pathname === path || pathname.startsWith(path)
  );

  // 2. Apply rate limiting (for all requests)
  const rateLimitResponse = await rateLimitMiddleware(request);
  if (rateLimitResponse) {
    // Add security headers to rate limit response
    return securityHeadersMiddleware(request, rateLimitResponse);
  }

  // 3. Initialize response
  let response = NextResponse.next();

  // 4. Authentication check for protected routes
  if (!isPublicPath) {
    try {
      // Get token from cookies
      const token = request.cookies.get('access_token')?.value;
      
      if (!token) {
        // No token, redirect to login
        if (pathname.startsWith('/api/')) {
          return new NextResponse(
            JSON.stringify({ error: 'Authentication required' }),
            {
              status: 401,
              headers: {
                'Content-Type': 'application/json',
                'WWW-Authenticate': 'Bearer',
              },
            }
          );
        }
        
        // Redirect to login for web pages
        const url = new URL('/login', request.url);
        url.searchParams.set('redirect', pathname);
        return NextResponse.redirect(url);
      }

      // Verify JWT token
      const payload = await verifyToken(token);
      
      // Check admin permissions for admin routes
      if (ADMIN_PATHS.some(path => pathname.startsWith(path))) {
        if (payload.role !== 'ADMIN') {
          if (pathname.startsWith('/api/')) {
            return new NextResponse(
              JSON.stringify({ error: 'Insufficient permissions' }),
              {
                status: 403,
                headers: {
                  'Content-Type': 'application/json',
                },
              }
            );
          }
          
          // Redirect to unauthorized page
          return NextResponse.redirect(new URL('/unauthorized', request.url));
        }
      }

      // Add user context to headers for downstream use
      response.headers.set('X-User-Id', payload.sub);
      response.headers.set('X-User-Role', payload.role);
      response.headers.set('X-User-Permissions', JSON.stringify(payload.permissions));
      
    } catch (error) {
      console.error('Authentication error:', error);
      
      // Token invalid or expired
      if (pathname.startsWith('/api/')) {
        return new NextResponse(
          JSON.stringify({ error: 'Invalid or expired token' }),
          {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              'WWW-Authenticate': 'Bearer error="invalid_token"',
            },
          }
        );
      }
      
      // Clear invalid cookies and redirect to login
      const url = new URL('/login', request.url);
      url.searchParams.set('redirect', pathname);
      const redirectResponse = NextResponse.redirect(url);
      redirectResponse.cookies.delete('access_token');
      redirectResponse.cookies.delete('refresh_token');
      return redirectResponse;
    }
  }

  // 5. Apply security headers to all responses
  response = securityHeadersMiddleware(request, response);

  // 6. Additional API-specific headers
  if (pathname.startsWith('/api/')) {
    // Ensure JSON content type
    if (!response.headers.get('Content-Type')) {
      response.headers.set('Content-Type', 'application/json; charset=utf-8');
    }
    
    // Add API versioning header
    response.headers.set('X-API-Version', '1.0.0');
    
    // Add request ID for tracing
    const requestId = generateRequestId();
    response.headers.set('X-Request-ID', requestId);
    
    // CORS headers for API (configure as needed)
    if (process.env.ENABLE_CORS === 'true') {
      response.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      response.headers.set('Access-Control-Max-Age', '86400');
    }
  }

  // 7. Add security monitoring headers
  response.headers.set('X-Security-Policy', 'enabled');
  response.headers.set('X-Auth-Status', isPublicPath ? 'public' : 'protected');

  // 8. Log access for audit trail (async, non-blocking)
  if (process.env.ENABLE_ACCESS_LOGS === 'true') {
    logAccess(request, response).catch(console.error);
  }

  return response;
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Log access for audit trail
 */
async function logAccess(request: NextRequest, response: NextResponse) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    method: request.method,
    path: request.nextUrl.pathname,
    ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request.headers.get('user-agent'),
    userId: response.headers.get('X-User-Id'),
    userRole: response.headers.get('X-User-Role'),
    requestId: response.headers.get('X-Request-ID'),
    status: response.status,
  };

  // Send to logging service (implement based on your logging solution)
  try {
    await fetch(`${process.env.LOGGING_ENDPOINT || 'http://localhost:3001'}/logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(logEntry),
    });
  } catch (error) {
    // Fail silently to not impact request processing
    console.error('Failed to log access:', error);
  }
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
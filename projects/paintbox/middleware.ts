import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  try {
    // Create response object
    let response = NextResponse.next();

    // Apply security headers to all responses
    response = applySecurityHeaders(response);

    // Skip middleware for static assets and Next.js internals
    if (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/static') ||
      pathname.includes('.') // Has file extension
    ) {
      return response;
    }

    // Basic rate limiting for API routes (simplified for Edge Runtime)
    if (pathname.startsWith('/api/')) {
      const ip = request.ip ?? 'anonymous';
      const rateLimit = 100; // requests per minute

      // In production, you would use a proper rate limiting service
      // For now, just add rate limiting headers
      response.headers.set('X-RateLimit-Limit', rateLimit.toString());
    }

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function applySecurityHeaders(response: NextResponse): NextResponse {
  // Content Security Policy
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.vercel-insights.com https://vercel.live",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://api.companycam.com https://*.salesforce.com https://paintbox-api.railway.app wss://paintbox-api.railway.app https://vitals.vercel-insights.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join('; ');

  response.headers.set('Content-Security-Policy', cspDirectives);

  // Other security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Permissions Policy
  const permissionsPolicy = [
    'camera=()',
    'microphone=()',
    'geolocation=(self)',
    'payment=()',
    'usb=()',
    'magnetometer=()',
    'accelerometer=()',
    'gyroscope=()',
  ].join(', ');

  response.headers.set('Permissions-Policy', permissionsPolicy);

  // Strict Transport Security (only in production)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  // Remove potentially dangerous headers
  response.headers.delete('X-Powered-By');
  response.headers.delete('Server');

  return response;
}

function isPublicApiRoute(pathname: string): boolean {
  const publicRoutes = [
    '/api/health',
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/refresh',
    '/api/webhooks/', // Webhook endpoints (validated differently)
  ];

  return publicRoutes.some(route => pathname.startsWith(route));
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon files
     * - logo files
     * - public static assets
     */
    '/((?!_next/static|_next/image|favicon|logo-|android-chrome-|apple-touch-icon|manifest.json).*)',
  ],
};

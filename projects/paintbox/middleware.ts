import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from 'next-auth/middleware';
import { getToken } from 'next-auth/jwt';

// Generate a per-request nonce for CSP
function generateNonce(): string {
  // 128-bit randomness as hex (Edge runtime-safe)
  const array = new Uint8Array(16);
  (globalThis as any).crypto.getRandomValues(array);
  return Array.from(array)
    .map((b: number) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Define public routes that don't require authentication
const publicRoutes = [
  '/login',
  '/api/auth/',
  '/api/health',
  '/api/webhooks/',
  '/api/v1/salesforce/test', // Allow Salesforce connection testing
  '/api/v1/salesforce/search', // Allow Salesforce search for customer lookup
  '/estimate', // Make estimate routes public for internal staff workflow
];

// Define protected routes that require authentication
const protectedRoutes = [
  '/admin',
  '/api/v1',
];

function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(route => pathname.startsWith(route));
}

function requiresAuth(pathname: string): boolean {
  return protectedRoutes.some(route => pathname.startsWith(route));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  try {
    // Create response object and nonce
    const nonce = generateNonce();
    let response = NextResponse.next({
      request: { headers: new Headers({ 'x-csp-nonce': nonce }) },
    });

    // Apply security headers to all responses
    response = applySecurityHeaders(response, nonce);

    // Skip middleware for static assets and Next.js internals
    if (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/static') ||
      pathname.includes('.') // Has file extension
    ) {
      return response;
    }

    // Handle authentication for protected routes
    if (requiresAuth(pathname) && !isPublicRoute(pathname)) {
      const token = await getToken({ req: request });

      if (!token) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('callbackUrl', request.url);
        return NextResponse.redirect(loginUrl);
      }

      // Add user info to request headers for downstream use
      response.headers.set('x-user-id', token.sub || '');
      response.headers.set('x-user-email', token.email || '');
    }

    // Redirect logged-in users away from login page
    if (pathname === '/login') {
      const token = await getToken({ req: request });
      if (token) {
        const callbackUrl = request.nextUrl.searchParams.get('callbackUrl') || '/estimate/new';
        return NextResponse.redirect(new URL(callbackUrl, request.url));
      }
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
    console.error('Middleware error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function applySecurityHeaders(response: NextResponse, nonce: string): NextResponse {
  // Content Security Policy
  const cspDirectives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://cdn.vercel-insights.com https://accounts.google.com`,
    `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com https://accounts.google.com`,
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob: https://lh3.googleusercontent.com",
    "connect-src 'self' https://api.companycam.com https://*.salesforce.com https://paintbox-api.railway.app wss://paintbox-api.railway.app https://vitals.vercel-insights.com https://accounts.google.com https://oauth2.googleapis.com",
    "frame-src https://accounts.google.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self' https://accounts.google.com",
    "upgrade-insecure-requests",
  ].join('; ');

  response.headers.set('Content-Security-Policy', cspDirectives);

  // Other security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '0');

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

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Security headers configuration
const securityHeaders = {
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',

  // Enable XSS protection
  'X-XSS-Protection': '1; mode=block',

  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',

  // Control referrer information
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Enforce HTTPS (only in production)
  ...(process.env.NODE_ENV === 'production' && {
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  }),

  // Control browser features
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
}

// Content Security Policy configuration
const getCSP = () => {
  const isProduction = process.env.NODE_ENV === 'production'

  // In development, we need 'unsafe-eval' for hot reload
  const scriptSrc = isProduction
    ? "'self' https://cdn.jsdelivr.net https://unpkg.com"
    : "'self' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com"

  return `
    default-src 'self';
    script-src ${scriptSrc};
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' data: https: blob:;
    font-src 'self' data: https://fonts.gstatic.com;
    connect-src 'self' https://api.candlefish.ai https://*.netlify.app wss://*.netlify.app ${!isProduction ? 'ws://localhost:*' : ''};
    frame-src 'none';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    ${isProduction ? 'upgrade-insecure-requests;' : ''}
  `.replace(/\s{2,}/g, ' ').trim()
}

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Apply security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  // Apply Content Security Policy
  response.headers.set('Content-Security-Policy', getCSP())

  // Special handling for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Remove unnecessary headers from API responses
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')

    // Ensure JSON content type for API routes
    if (!response.headers.get('Content-Type')) {
      response.headers.set('Content-Type', 'application/json; charset=utf-8')
    }

    // Additional security for sensitive endpoints
    if (request.nextUrl.pathname === '/api/metrics' ||
        request.nextUrl.pathname === '/api/health/detailed') {

      // Check for authorization header or IP whitelist in production
      if (process.env.NODE_ENV === 'production') {
        const authHeader = request.headers.get('authorization')
        const clientIp = request.ip || request.headers.get('x-forwarded-for')

        // Simple bearer token check (replace with your auth logic)
        const validToken = process.env.METRICS_AUTH_TOKEN
        if (validToken && authHeader !== `Bearer ${validToken}`) {
          return new NextResponse(
            JSON.stringify({ error: 'Unauthorized' }),
            {
              status: 401,
              headers: {
                'Content-Type': 'application/json',
                'WWW-Authenticate': 'Bearer realm="metrics"'
              }
            }
          )
        }
      }
    }
  }

  // Add security.txt route
  if (request.nextUrl.pathname === '/.well-known/security.txt') {
    response.headers.set('Content-Type', 'text/plain; charset=utf-8')
  }

  return response
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * But include all API routes
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

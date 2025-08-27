import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Generate nonce for CSP
const generateNonce = (): string => {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64')
}

// Security headers configuration
export const securityHeaders = {
  // Strict Transport Security - enforce HTTPS
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',

  // Prevent clickjacking
  'X-Frame-Options': 'DENY',

  // XSS Protection (legacy but still useful)
  'X-XSS-Protection': '1; mode=block',

  // Referrer Policy - privacy-preserving
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Permissions Policy - disable unnecessary features
  'Permissions-Policy': [
    'accelerometer=()',
    'camera=()',
    'geolocation=()',
    'gyroscope=()',
    'magnetometer=()',
    'microphone=()',
    'payment=()',
    'usb=()',
    'interest-cohort=()' // Opt out of FLoC
  ].join(', '),

  // Cross-Origin policies
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
}

// Content Security Policy configuration
export const getCSP = (nonce: string): string => {
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      'https:',
      "'unsafe-inline'" // Fallback for older browsers
    ],
    'style-src': [
      "'self'",
      `'nonce-${nonce}'`,
      "'unsafe-inline'" // Required for emotion/styled-components
    ],
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      'https:' // Allow HTTPS images
    ],
    'font-src': [
      "'self'",
      'data:'
    ],
    'connect-src': [
      "'self'",
      'https://api.candlefish.ai',
      'wss://ws.candlefish.ai',
      'https://*.candlefish.ai'
    ],
    'media-src': [
      "'self'",
      'blob:'
    ],
    'object-src': ["'none'"],
    'frame-src': ["'none'"],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'manifest-src': ["'self'"],
    'worker-src': [
      "'self'",
      'blob:'
    ],
    'child-src': [
      "'self'",
      'blob:'
    ],
    'upgrade-insecure-requests': [],
    'block-all-mixed-content': [],
  }

  return Object.entries(directives)
    .map(([key, values]) => {
      if (values.length === 0) return key
      return `${key} ${values.join(' ')}`
    })
    .join('; ')
}

// Middleware to apply security headers
export function applySecurityHeaders(request: NextRequest) {
  const nonce = generateNonce()
  const response = NextResponse.next()

  // Apply security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  // Apply Content Security Policy with nonce
  const csp = getCSP(nonce)
  response.headers.set('Content-Security-Policy', csp)

  // Store nonce for use in components
  response.headers.set('x-nonce', nonce)

  // Report CSP violations (in production)
  if (process.env.NODE_ENV === 'production' && process.env.CSP_REPORT_URI) {
    response.headers.append(
      'Content-Security-Policy-Report-Only',
      `${csp}; report-uri ${process.env.CSP_REPORT_URI}; report-to csp-endpoint`
    )

    // Reporting API configuration
    response.headers.set(
      'Report-To',
      JSON.stringify({
        group: 'csp-endpoint',
        max_age: 10886400,
        endpoints: [{ url: process.env.CSP_REPORT_URI }]
      })
    )
  }

  return response
}

// CSP violation report handler
export interface CSPViolationReport {
  'csp-report': {
    'blocked-uri': string
    'column-number': number
    'document-uri': string
    'line-number': number
    'original-policy': string
    'referrer': string
    'script-sample': string
    'source-file': string
    'violated-directive': string
  }
}

export function handleCSPViolation(report: CSPViolationReport): void {
  console.error('CSP Violation:', {
    directive: report['csp-report']['violated-directive'],
    blockedURI: report['csp-report']['blocked-uri'],
    documentURI: report['csp-report']['document-uri'],
    sourceFile: report['csp-report']['source-file'],
    lineNumber: report['csp-report']['line-number'],
  })

  // In production, send to monitoring service
  if (process.env.NODE_ENV === 'production') {
    // Send to error tracking service (Sentry, etc.)
    // trackSecurityEvent('csp-violation', report)
  }
}

// Security monitoring utilities
export const securityMonitoring = {
  // Track security events
  trackEvent: (event: string, data: any) => {
    if (process.env.NODE_ENV === 'production') {
      // Send to monitoring service
      console.log('Security Event:', event, data)
    }
  },

  // Rate limiting check
  checkRateLimit: (identifier: string, limit: number = 100): boolean => {
    // Implement rate limiting logic
    // Could use Redis or in-memory store
    return true
  },

  // Validate request origin
  validateOrigin: (origin: string | null): boolean => {
    const allowedOrigins = [
      'https://candlefish.ai',
      'https://www.candlefish.ai',
      'https://api.candlefish.ai',
    ]

    if (process.env.NODE_ENV === 'development') {
      allowedOrigins.push('http://localhost:3000')
    }

    return origin ? allowedOrigins.includes(origin) : false
  }
}

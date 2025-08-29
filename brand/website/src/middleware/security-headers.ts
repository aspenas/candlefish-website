/**
 * Security Headers Middleware
 * Comprehensive security headers implementation for HTTPS, CSP, and more
 * SECURITY LEVEL: HIGH
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Security headers configuration
interface SecurityHeadersConfig {
  strictTransportSecurity: boolean;
  contentSecurityPolicy: boolean;
  xFrameOptions: string;
  xContentTypeOptions: string;
  xXSSProtection: string;
  referrerPolicy: string;
  permissionsPolicy: string;
  crossOriginEmbedderPolicy: string;
  crossOriginOpenerPolicy: string;
  crossOriginResourcePolicy: string;
}

// Environment-specific configurations
const PRODUCTION_CONFIG: SecurityHeadersConfig = {
  strictTransportSecurity: true,
  contentSecurityPolicy: true,
  xFrameOptions: 'DENY',
  xContentTypeOptions: 'nosniff',
  xXSSProtection: '1; mode=block',
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',
  crossOriginEmbedderPolicy: 'require-corp',
  crossOriginOpenerPolicy: 'same-origin',
  crossOriginResourcePolicy: 'same-origin',
};

const DEVELOPMENT_CONFIG: SecurityHeadersConfig = {
  strictTransportSecurity: false,
  contentSecurityPolicy: true,
  xFrameOptions: 'SAMEORIGIN',
  xContentTypeOptions: 'nosniff',
  xXSSProtection: '1; mode=block',
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: 'camera=(), microphone=(), geolocation=()',
  crossOriginEmbedderPolicy: 'unsafe-none',
  crossOriginOpenerPolicy: 'same-origin-allow-popups',
  crossOriginResourcePolicy: 'cross-origin',
};

export class SecurityHeaders {
  private config: SecurityHeadersConfig;
  private nonces: Map<string, string>;
  private reportUri: string | null;

  constructor() {
    this.config = process.env.NODE_ENV === 'production' ? PRODUCTION_CONFIG : DEVELOPMENT_CONFIG;
    this.nonces = new Map();
    this.reportUri = process.env.CSP_REPORT_URI || null;
    
    // Cleanup old nonces periodically
    this.startNonceCleanup();
  }

  /**
   * Apply security headers to response
   */
  applyHeaders(req: NextRequest, res: NextResponse): NextResponse {
    // Generate nonce for this request
    const nonce = this.generateNonce();
    this.storeNonce(req.url, nonce);

    // Apply HSTS (HTTP Strict Transport Security)
    if (this.config.strictTransportSecurity) {
      res.headers.set(
        'Strict-Transport-Security',
        'max-age=63072000; includeSubDomains; preload'
      );
    }

    // Apply Content Security Policy
    if (this.config.contentSecurityPolicy) {
      const csp = this.generateCSP(nonce);
      res.headers.set('Content-Security-Policy', csp);
      
      // Report-only mode for monitoring
      if (process.env.CSP_REPORT_ONLY === 'true') {
        res.headers.set('Content-Security-Policy-Report-Only', csp);
      }
    }

    // Apply X-Frame-Options
    res.headers.set('X-Frame-Options', this.config.xFrameOptions);

    // Apply X-Content-Type-Options
    res.headers.set('X-Content-Type-Options', this.config.xContentTypeOptions);

    // Apply X-XSS-Protection
    res.headers.set('X-XSS-Protection', this.config.xXSSProtection);

    // Apply Referrer-Policy
    res.headers.set('Referrer-Policy', this.config.referrerPolicy);

    // Apply Permissions-Policy (formerly Feature-Policy)
    res.headers.set('Permissions-Policy', this.config.permissionsPolicy);

    // Apply Cross-Origin policies
    res.headers.set('Cross-Origin-Embedder-Policy', this.config.crossOriginEmbedderPolicy);
    res.headers.set('Cross-Origin-Opener-Policy', this.config.crossOriginOpenerPolicy);
    res.headers.set('Cross-Origin-Resource-Policy', this.config.crossOriginResourcePolicy);

    // Additional security headers
    res.headers.set('X-DNS-Prefetch-Control', 'off');
    res.headers.set('X-Download-Options', 'noopen');
    res.headers.set('X-Permitted-Cross-Domain-Policies', 'none');

    // Remove potentially dangerous headers
    res.headers.delete('X-Powered-By');
    res.headers.delete('Server');

    // Add custom security headers
    res.headers.set('X-Security-Policy', 'enabled');
    res.headers.set('X-Request-ID', this.generateRequestId());

    // Set secure cookie policy for authentication endpoints
    if (req.nextUrl.pathname.startsWith('/api/auth')) {
      res.headers.set('Set-Cookie-Policy', 'Secure; HttpOnly; SameSite=Strict');
    }

    // Add CSP nonce to response for inline scripts
    res.headers.set('X-Nonce', nonce);

    return res;
  }

  /**
   * Generate Content Security Policy
   */
  private generateCSP(nonce: string): string {
    const isProduction = process.env.NODE_ENV === 'production';
    
    const directives: Record<string, string[]> = {
      'default-src': ["'self'"],
      'script-src': [
        "'self'",
        `'nonce-${nonce}'`,
        "'strict-dynamic'",
        'https://cdn.jsdelivr.net',
        'https://unpkg.com',
        'https://www.googletagmanager.com',
        'https://www.google-analytics.com',
      ],
      'style-src': [
        "'self'",
        `'nonce-${nonce}'`,
        'https://fonts.googleapis.com',
        'https://cdn.jsdelivr.net',
      ],
      'img-src': [
        "'self'",
        'data:',
        'blob:',
        'https:',
      ],
      'font-src': [
        "'self'",
        'data:',
        'https://fonts.gstatic.com',
      ],
      'connect-src': [
        "'self'",
        'https://api.candlefish.ai',
        'https://*.amazonaws.com',
        'https://paintbox.fly.dev',
        'wss://api.candlefish.ai',
        'https://www.google-analytics.com',
      ],
      'media-src': ["'self'", 'blob:'],
      'object-src': ["'none'"],
      'frame-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"],
      'manifest-src': ["'self'"],
      'worker-src': ["'self'", 'blob:'],
    };

    // Add development-specific sources
    if (!isProduction) {
      directives['script-src'].push("'unsafe-eval'"); // Required for hot reload
      directives['connect-src'].push('ws://localhost:*', 'http://localhost:*');
    }

    // Add report URI if configured
    if (this.reportUri) {
      directives['report-uri'] = [this.reportUri];
      directives['report-to'] = ['csp-endpoint'];
    }

    // Add upgrade-insecure-requests in production
    if (isProduction) {
      directives['upgrade-insecure-requests'] = [];
    }

    // Build CSP string
    return Object.entries(directives)
      .map(([key, values]) => {
        if (values.length === 0) {
          return key;
        }
        return `${key} ${values.join(' ')}`;
      })
      .join('; ');
  }

  /**
   * Generate cryptographically secure nonce
   */
  private generateNonce(): string {
    return crypto.randomBytes(16).toString('base64');
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Store nonce for request validation
   */
  private storeNonce(url: string, nonce: string): void {
    this.nonces.set(url, nonce);
    
    // Auto-expire after 5 minutes
    setTimeout(() => {
      this.nonces.delete(url);
    }, 5 * 60 * 1000);
  }

  /**
   * Validate nonce for a request
   */
  validateNonce(url: string, nonce: string): boolean {
    const storedNonce = this.nonces.get(url);
    if (!storedNonce || storedNonce !== nonce) {
      return false;
    }
    
    // Single use - delete after validation
    this.nonces.delete(url);
    return true;
  }

  /**
   * Clean up old nonces periodically
   */
  private startNonceCleanup(): void {
    setInterval(() => {
      // Keep only recent nonces (last 1000)
      if (this.nonces.size > 1000) {
        const entries = Array.from(this.nonces.entries());
        this.nonces.clear();
        entries.slice(-500).forEach(([key, value]) => {
          this.nonces.set(key, value);
        });
      }
    }, 10 * 60 * 1000); // Every 10 minutes
  }

  /**
   * Get Report-To header value for CSP reporting
   */
  getReportToHeader(): string {
    if (!this.reportUri) {
      return '';
    }

    const reportTo = {
      group: 'csp-endpoint',
      max_age: 10886400,
      endpoints: [
        {
          url: this.reportUri,
        },
      ],
      include_subdomains: true,
    };

    return JSON.stringify(reportTo);
  }

  /**
   * Check if request should enforce HTTPS
   */
  shouldEnforceHTTPS(req: NextRequest): boolean {
    // Always enforce in production
    if (process.env.NODE_ENV === 'production') {
      return true;
    }

    // Check for specific paths that require HTTPS
    const securePaths = ['/api/auth', '/api/admin', '/dashboard'];
    return securePaths.some(path => req.nextUrl.pathname.startsWith(path));
  }

  /**
   * Redirect HTTP to HTTPS
   */
  redirectToHTTPS(req: NextRequest): NextResponse {
    const url = req.nextUrl.clone();
    url.protocol = 'https:';
    
    return NextResponse.redirect(url, {
      status: 301,
      headers: {
        'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
      },
    });
  }
}

// Create singleton instance
const securityHeaders = new SecurityHeaders();

// Export middleware function
export function securityHeadersMiddleware(req: NextRequest, res: NextResponse): NextResponse {
  // Check if HTTPS should be enforced
  if (securityHeaders.shouldEnforceHTTPS(req) && req.nextUrl.protocol === 'http:') {
    return securityHeaders.redirectToHTTPS(req);
  }

  // Apply security headers
  return securityHeaders.applyHeaders(req, res);
}

// Export utility functions
export function validateNonce(url: string, nonce: string): boolean {
  return securityHeaders.validateNonce(url, nonce);
}

export function getReportToHeader(): string {
  return securityHeaders.getReportToHeader();
}

// Export for use in pages/components
export function generateInlineScriptProps(script: string): {
  dangerouslySetInnerHTML: { __html: string };
  nonce?: string;
} {
  if (process.env.NODE_ENV === 'production') {
    // In production, require nonce from headers
    return {
      dangerouslySetInnerHTML: { __html: script },
      nonce: '{{CSP_NONCE}}', // Placeholder to be replaced by server
    };
  }

  return {
    dangerouslySetInnerHTML: { __html: script },
  };
}
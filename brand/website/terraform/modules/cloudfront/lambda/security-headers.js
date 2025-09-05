'use strict';

/**
 * Lambda@Edge Security Headers
 * Implements comprehensive security headers for defense-in-depth
 */

exports.handler = async (event) => {
  const response = event.Records[0].cf.response;
  const headers = response.headers;
  
  try {
    // Content Security Policy - Strict but functional
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' https://cdn.jsdelivr.net https://*.cloudfront.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' wss://*.candlefish.ai https://*.amazonaws.com https://api.candlefish.ai",
      "media-src 'self' blob:",
      "object-src 'none'",
      "frame-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "manifest-src 'self'",
      "worker-src 'self' blob:",
      "child-src 'self' blob:",
      "upgrade-insecure-requests",
      "block-all-mixed-content",
      "report-uri https://candlefish.report-uri.com/r/d/csp/enforce",
      "report-to default"
    ];
    
    headers['content-security-policy'] = [{
      key: 'Content-Security-Policy',
      value: cspDirectives.join('; ')
    }];
    
    // Report-To header for CSP reporting
    const reportTo = {
      group: "default",
      max_age: 86400,
      endpoints: [{
        url: "https://candlefish.report-uri.com/a/d/g"
      }],
      include_subdomains: true
    };
    
    headers['report-to'] = [{
      key: 'Report-To',
      value: JSON.stringify(reportTo)
    }];
    
    // Network Error Logging
    const nel = {
      report_to: "default",
      max_age: 86400,
      include_subdomains: true,
      success_fraction: 0.01,
      failure_fraction: 1.0
    };
    
    headers['nel'] = [{
      key: 'NEL',
      value: JSON.stringify(nel)
    }];
    
    // Strict Transport Security with preload
    headers['strict-transport-security'] = [{
      key: 'Strict-Transport-Security',
      value: 'max-age=63072000; includeSubDomains; preload'
    }];
    
    // X-Frame-Options for clickjacking protection
    headers['x-frame-options'] = [{
      key: 'X-Frame-Options',
      value: 'DENY'
    }];
    
    // X-Content-Type-Options to prevent MIME sniffing
    headers['x-content-type-options'] = [{
      key: 'X-Content-Type-Options',
      value: 'nosniff'
    }];
    
    // X-XSS-Protection for older browsers
    headers['x-xss-protection'] = [{
      key: 'X-XSS-Protection',
      value: '1; mode=block; report=https://candlefish.report-uri.com/r/d/xss/enforce'
    }];
    
    // Referrer Policy for privacy
    headers['referrer-policy'] = [{
      key: 'Referrer-Policy',
      value: 'strict-origin-when-cross-origin'
    }];
    
    // Permissions Policy (formerly Feature Policy)
    const permissionsPolicy = [
      'accelerometer=()',
      'ambient-light-sensor=()',
      'autoplay=(self)',
      'battery=()',
      'camera=()',
      'display-capture=()',
      'document-domain=()',
      'encrypted-media=()',
      'execution-while-not-rendered=()',
      'execution-while-out-of-viewport=()',
      'fullscreen=(self)',
      'gamepad=()',
      'geolocation=()',
      'gyroscope=()',
      'hid=()',
      'idle-detection=()',
      'interest-cohort=()',
      'keyboard-map=()',
      'magnetometer=()',
      'microphone=()',
      'midi=()',
      'navigation-override=()',
      'payment=()',
      'picture-in-picture=()',
      'publickey-credentials-get=()',
      'screen-wake-lock=()',
      'serial=()',
      'speaker-selection=()',
      'sync-xhr=()',
      'usb=()',
      'web-share=()',
      'xr-spatial-tracking=()'
    ];
    
    headers['permissions-policy'] = [{
      key: 'Permissions-Policy',
      value: permissionsPolicy.join(', ')
    }];
    
    // Cross-Origin headers for security
    headers['cross-origin-embedder-policy'] = [{
      key: 'Cross-Origin-Embedder-Policy',
      value: 'require-corp'
    }];
    
    headers['cross-origin-opener-policy'] = [{
      key: 'Cross-Origin-Opener-Policy',
      value: 'same-origin'
    }];
    
    headers['cross-origin-resource-policy'] = [{
      key: 'Cross-Origin-Resource-Policy',
      value: 'same-site'
    }];
    
    // X-Permitted-Cross-Domain-Policies for Flash/PDF
    headers['x-permitted-cross-domain-policies'] = [{
      key: 'X-Permitted-Cross-Domain-Policies',
      value: 'none'
    }];
    
    // DNS Prefetch Control
    headers['x-dns-prefetch-control'] = [{
      key: 'X-DNS-Prefetch-Control',
      value: 'on'
    }];
    
    // Download Options for IE
    headers['x-download-options'] = [{
      key: 'X-Download-Options',
      value: 'noopen'
    }];
    
    // Origin-Agent-Cluster for better isolation
    headers['origin-agent-cluster'] = [{
      key: 'Origin-Agent-Cluster',
      value: '?1'
    }];
    
    // Clear Site Data for logout (conditional)
    const uri = response.request ? response.request.uri : '';
    if (uri === '/logout' || uri === '/api/logout') {
      headers['clear-site-data'] = [{
        key: 'Clear-Site-Data',
        value: '"cache", "cookies", "storage"'
      }];
    }
    
    // Add security stamp
    headers['x-security-stamp'] = [{
      key: 'X-Security-Stamp',
      value: `candlefish-${Date.now()}`
    }];
    
    // Cache control for security-sensitive content
    if (uri && (uri.includes('/api/') || uri.includes('/auth/'))) {
      headers['cache-control'] = [{
        key: 'Cache-Control',
        value: 'no-store, no-cache, must-revalidate, proxy-revalidate'
      }];
      headers['pragma'] = [{
        key: 'Pragma',
        value: 'no-cache'
      }];
      headers['expires'] = [{
        key: 'Expires',
        value: '0'
      }];
    }
    
    // Remove sensitive headers
    const headersToRemove = [
      'server',
      'x-powered-by',
      'x-aspnet-version',
      'x-aspnetmvc-version',
      'x-drupal-cache',
      'x-drupal-dynamic-cache',
      'x-generator',
      'x-runtime',
      'x-rack-cache'
    ];
    
    headersToRemove.forEach(header => {
      delete headers[header.toLowerCase()];
    });
    
    // Log security headers application
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      uri,
      statusCode: response.status,
      securityHeadersApplied: true,
      cspViolationReporting: true
    }));
    
  } catch (error) {
    console.error('Error applying security headers:', error);
    // Continue with response even if security headers fail
  }
  
  return response;
};
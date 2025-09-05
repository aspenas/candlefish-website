// Viewer Response Lambda@Edge Function
// Security headers and performance hints

'use strict';

exports.handler = async (event, context, callback) => {
    const response = event.Records[0].cf.response;
    const request = event.Records[0].cf.request;
    const headers = response.headers;
    
    // Enhanced Security Headers
    headers['strict-transport-security'] = [{
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubdomains; preload'
    }];
    
    headers['x-content-type-options'] = [{
        key: 'X-Content-Type-Options',
        value: 'nosniff'
    }];
    
    headers['x-frame-options'] = [{
        key: 'X-Frame-Options',
        value: 'DENY'
    }];
    
    headers['x-xss-protection'] = [{
        key: 'X-XSS-Protection',
        value: '1; mode=block'
    }];
    
    headers['referrer-policy'] = [{
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin'
    }];
    
    // Content Security Policy for WebGL/Three.js support
    headers['content-security-policy'] = [{
        key: 'Content-Security-Policy',
        value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com data:",
            "img-src 'self' data: https: blob:",
            "connect-src 'self' https: wss: ws:",
            "worker-src 'self' blob:",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'"
        ].join('; ')
    }];
    
    // Permissions Policy for modern browsers
    headers['permissions-policy'] = [{
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()'
    }];
    
    // Performance hints
    const contentType = headers['content-type'] ? headers['content-type'][0].value : '';
    
    // Resource hints for critical resources
    if (contentType.includes('text/html')) {
        // Preconnect to critical third-party origins
        headers['link'] = headers['link'] || [];
        headers['link'].push({
            key: 'Link',
            value: '<https://fonts.googleapis.com>; rel=preconnect'
        });
        headers['link'].push({
            key: 'Link',
            value: '<https://fonts.gstatic.com>; rel=preconnect; crossorigin'
        });
        
        // Server timing header for performance monitoring
        const processingTime = Math.random() * 50; // Simulated processing time
        headers['server-timing'] = [{
            key: 'Server-Timing',
            value: `edge;dur=${processingTime.toFixed(2)};desc="Edge processing time"`
        }];
        
        // Early hints for critical resources (HTTP 103)
        headers['x-early-hints'] = [{
            key: 'X-Early-Hints',
            value: 'enabled'
        }];
    }
    
    // Cache control for different content types
    if (!headers['cache-control']) {
        if (contentType.includes('text/html')) {
            headers['cache-control'] = [{
                key: 'Cache-Control',
                value: 'public, max-age=0, must-revalidate'
            }];
        } else if (contentType.includes('image/') || 
                   contentType.includes('font/') || 
                   request.uri.includes('/_next/static/')) {
            headers['cache-control'] = [{
                key: 'Cache-Control',
                value: 'public, max-age=31536000, immutable'
            }];
        } else if (contentType.includes('application/javascript') || 
                   contentType.includes('text/css')) {
            headers['cache-control'] = [{
                key: 'Cache-Control',
                value: 'public, max-age=86400, stale-while-revalidate=604800'
            }];
        }
    }
    
    // CORS headers for API responses
    if (request.uri.startsWith('/api/') || request.uri.startsWith('/ws/')) {
        headers['access-control-allow-origin'] = [{
            key: 'Access-Control-Allow-Origin',
            value: request.headers.origin ? request.headers.origin[0].value : '*'
        }];
        headers['access-control-allow-credentials'] = [{
            key: 'Access-Control-Allow-Credentials',
            value: 'true'
        }];
        headers['access-control-allow-methods'] = [{
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
        }];
        headers['access-control-allow-headers'] = [{
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With'
        }];
        headers['access-control-max-age'] = [{
            key: 'Access-Control-Max-Age',
            value: '86400'
        }];
    }
    
    // Set A/B test cookie if needed
    if (request.headers['x-set-cookie-ab-test']) {
        headers['set-cookie'] = headers['set-cookie'] || [];
        headers['set-cookie'].push({
            key: 'Set-Cookie',
            value: request.headers['x-set-cookie-ab-test'][0].value
        });
    }
    
    // Add custom headers for monitoring
    headers['x-candlefish-region'] = [{
        key: 'X-Candlefish-Region',
        value: process.env.AWS_REGION || 'us-east-1'
    }];
    
    headers['x-candlefish-cache'] = [{
        key: 'X-Candlefish-Cache',
        value: response.status === '304' ? 'HIT' : 'MISS'
    }];
    
    // Feature Policy for experimental features
    headers['feature-policy'] = [{
        key: 'Feature-Policy',
        value: [
            "accelerometer 'none'",
            "ambient-light-sensor 'none'",
            "autoplay 'self'",
            "battery 'none'",
            "camera 'none'",
            "display-capture 'none'",
            "document-domain 'none'",
            "encrypted-media 'self'",
            "fullscreen 'self'",
            "geolocation 'none'",
            "gyroscope 'none'",
            "magnetometer 'none'",
            "microphone 'none'",
            "midi 'none'",
            "payment 'none'",
            "picture-in-picture 'self'",
            "publickey-credentials-get 'none'",
            "sync-xhr 'none'",
            "usb 'none'",
            "wake-lock 'none'",
            "xr-spatial-tracking 'none'"
        ].join('; ')
    }];
    
    callback(null, response);
};
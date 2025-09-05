// Origin Request Lambda@Edge Function
// Content routing and optimization

'use strict';

const querystring = require('querystring');

exports.handler = async (event, context, callback) => {
    const request = event.Records[0].cf.request;
    const headers = request.headers;
    
    // URL normalization
    let uri = request.uri;
    
    // Remove trailing slashes except for root
    if (uri !== '/' && uri.endsWith('/')) {
        uri = uri.slice(0, -1);
    }
    
    // Default document for directories
    if (uri === '/' || !uri.includes('.')) {
        // Check if it's a directory request
        if (!uri.includes('.') && !uri.startsWith('/api') && !uri.startsWith('/ws')) {
            // For Next.js, don't append index.html for dynamic routes
            if (!uri.startsWith('/_next') && !uri.includes('[[')) {
                // Keep the URI as is for Next.js routing
            }
        }
    }
    
    // WebP/AVIF image optimization routing
    if (uri.match(/\.(jpg|jpeg|png|gif)$/i)) {
        const acceptWebP = headers['x-accept-webp'] && headers['x-accept-webp'][0].value === 'true';
        const acceptAVIF = headers['x-accept-avif'] && headers['x-accept-avif'][0].value === 'true';
        
        // Check if optimized version exists
        if (acceptAVIF) {
            // Try AVIF first (best compression)
            const avifUri = uri.replace(/\.(jpg|jpeg|png|gif)$/i, '.avif');
            request.headers['x-original-uri'] = [{key: 'X-Original-URI', value: uri}];
            request.headers['x-optimized-format'] = [{key: 'X-Optimized-Format', value: 'avif'}];
            uri = avifUri;
        } else if (acceptWebP) {
            // Fall back to WebP
            const webpUri = uri.replace(/\.(jpg|jpeg|png|gif)$/i, '.webp');
            request.headers['x-original-uri'] = [{key: 'X-Original-URI', value: uri}];
            request.headers['x-optimized-format'] = [{key: 'X-Optimized-Format', value: 'webp'}];
            uri = webpUri;
        }
        
        // Add image dimensions to cache key if provided
        const width = headers['x-image-width'] ? headers['x-image-width'][0].value : null;
        const height = headers['x-image-height'] ? headers['x-image-height'][0].value : null;
        const quality = headers['x-image-quality'] ? headers['x-image-quality'][0].value : null;
        
        if (width || height || quality) {
            const params = [];
            if (width) params.push(`w=${width}`);
            if (height) params.push(`h=${height}`);
            if (quality) params.push(`q=${quality}`);
            
            request.querystring = params.join('&');
        }
    }
    
    // Device-based routing
    const deviceType = headers['x-device-type'] ? headers['x-device-type'][0].value : 'desktop';
    
    // A/B test routing
    const testGroup = headers['x-ab-test-group'] ? headers['x-ab-test-group'][0].value : 'a';
    
    // Add custom headers for origin
    request.headers['x-forwarded-device'] = [{key: 'X-Forwarded-Device', value: deviceType}];
    request.headers['x-forwarded-test-group'] = [{key: 'X-Forwarded-Test-Group', value: testGroup}];
    
    // Geo-location based routing
    const country = headers['cloudfront-viewer-country'] ? headers['cloudfront-viewer-country'][0].value : 'US';
    request.headers['x-geo-country'] = [{key: 'X-Geo-Country', value: country}];
    
    // Language preference detection
    const acceptLanguage = headers['accept-language'] ? headers['accept-language'][0].value : 'en';
    const primaryLanguage = acceptLanguage.split(',')[0].split('-')[0];
    request.headers['x-preferred-language'] = [{key: 'X-Preferred-Language', value: primaryLanguage}];
    
    // Bot handling - serve static version
    const isBot = headers['x-is-bot'] && headers['x-is-bot'][0].value === 'true';
    if (isBot) {
        request.headers['x-prerender'] = [{key: 'X-Prerender', value: 'true'}];
    }
    
    // Performance optimization - Early hints
    if (uri === '/' || uri === '/index.html') {
        request.headers['x-request-early-hints'] = [{
            key: 'X-Request-Early-Hints',
            value: JSON.stringify({
                preconnect: ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
                preload: [
                    { href: '/_next/static/css/main.css', as: 'style' },
                    { href: '/_next/static/js/main.js', as: 'script' }
                ]
            })
        }];
    }
    
    // API rate limiting headers
    if (uri.startsWith('/api/')) {
        const clientIp = headers['cloudfront-viewer-address'] ? 
                        headers['cloudfront-viewer-address'][0].value.split(':')[0] : 
                        'unknown';
        request.headers['x-client-ip'] = [{key: 'X-Client-IP', value: clientIp}];
        request.headers['x-api-version'] = [{key: 'X-API-Version', value: 'v1'}];
    }
    
    // WebSocket upgrade handling
    if (uri.startsWith('/ws/')) {
        const upgradeHeader = headers['upgrade'];
        if (upgradeHeader && upgradeHeader[0].value.toLowerCase() === 'websocket') {
            // Preserve WebSocket headers
            request.headers['connection'] = [{key: 'Connection', value: 'upgrade'}];
            request.headers['upgrade'] = [{key: 'Upgrade', value: 'websocket'}];
            
            // Add WebSocket version
            if (headers['sec-websocket-version']) {
                request.headers['sec-websocket-version'] = headers['sec-websocket-version'];
            }
            if (headers['sec-websocket-key']) {
                request.headers['sec-websocket-key'] = headers['sec-websocket-key'];
            }
            if (headers['sec-websocket-protocol']) {
                request.headers['sec-websocket-protocol'] = headers['sec-websocket-protocol'];
            }
        }
    }
    
    // Update request URI
    request.uri = uri;
    
    // Add request ID for tracing
    const requestId = context.requestId;
    request.headers['x-request-id'] = [{key: 'X-Request-ID', value: requestId}];
    
    // Add timestamp
    request.headers['x-request-timestamp'] = [{
        key: 'X-Request-Timestamp', 
        value: new Date().toISOString()
    }];
    
    callback(null, request);
};
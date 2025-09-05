// Viewer Request Lambda@Edge Function
// Device detection, A/B testing, and request routing

'use strict';

exports.handler = async (event, context, callback) => {
    const request = event.Records[0].cf.request;
    const headers = request.headers;
    
    // Device Detection based on CloudFront headers
    const isDesktop = headers['cloudfront-is-desktop-viewer'] && 
                      headers['cloudfront-is-desktop-viewer'][0].value === 'true';
    const isMobile = headers['cloudfront-is-mobile-viewer'] && 
                     headers['cloudfront-is-mobile-viewer'][0].value === 'true';
    const isTablet = headers['cloudfront-is-tablet-viewer'] && 
                     headers['cloudfront-is-tablet-viewer'][0].value === 'true';
    
    // Add device type header for origin
    if (isMobile) {
        request.headers['x-device-type'] = [{key: 'X-Device-Type', value: 'mobile'}];
    } else if (isTablet) {
        request.headers['x-device-type'] = [{key: 'X-Device-Type', value: 'tablet'}];
    } else {
        request.headers['x-device-type'] = [{key: 'X-Device-Type', value: 'desktop'}];
    }
    
    // A/B Testing Logic
    const cookies = parseCookieHeader(headers.cookie || headers.Cookie);
    let testGroup = cookies['ab-test-group'];
    
    if (!testGroup) {
        // Assign to test group (50/50 split)
        testGroup = Math.random() < 0.5 ? 'a' : 'b';
        
        // Add set-cookie header for the response
        const setCookie = `ab-test-group=${testGroup}; Path=/; Max-Age=604800; Secure; SameSite=Lax`;
        request.headers['x-set-cookie-ab-test'] = [{key: 'X-Set-Cookie-AB-Test', value: setCookie}];
    }
    
    // Add test group header
    request.headers['x-ab-test-group'] = [{key: 'X-AB-Test-Group', value: testGroup}];
    
    // Performance optimization for images
    if (request.uri.match(/\.(jpg|jpeg|png|gif|webp|avif)$/i)) {
        const acceptHeader = headers.accept ? headers.accept[0].value : '';
        
        // Check WebP support
        if (acceptHeader.includes('image/webp')) {
            request.headers['x-accept-webp'] = [{key: 'X-Accept-WebP', value: 'true'}];
        }
        
        // Check AVIF support
        if (acceptHeader.includes('image/avif')) {
            request.headers['x-accept-avif'] = [{key: 'X-Accept-AVIF', value: 'true'}];
        }
        
        // Add image optimization parameters from query string
        const querystring = request.querystring;
        if (querystring) {
            const params = new URLSearchParams(querystring);
            
            if (params.has('w')) {
                request.headers['x-image-width'] = [{key: 'X-Image-Width', value: params.get('w')}];
            }
            if (params.has('h')) {
                request.headers['x-image-height'] = [{key: 'X-Image-Height', value: params.get('h')}];
            }
            if (params.has('q')) {
                request.headers['x-image-quality'] = [{key: 'X-Image-Quality', value: params.get('q')}];
            }
        }
    }
    
    // Redirect www to non-www
    if (headers.host && headers.host[0].value.startsWith('www.')) {
        const response = {
            status: '301',
            statusDescription: 'Moved Permanently',
            headers: {
                location: [{
                    key: 'Location',
                    value: `https://${headers.host[0].value.replace('www.', '')}${request.uri}${request.querystring ? '?' + request.querystring : ''}`
                }],
                'cache-control': [{
                    key: 'Cache-Control',
                    value: 'public, max-age=86400'
                }]
            }
        };
        callback(null, response);
        return;
    }
    
    // Bot detection (basic)
    const userAgent = headers['user-agent'] ? headers['user-agent'][0].value.toLowerCase() : '';
    const botPatterns = [
        'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider',
        'yandexbot', 'facebookexternalhit', 'twitterbot', 'linkedinbot',
        'whatsapp', 'slackbot', 'discord', 'telegram'
    ];
    
    const isBot = botPatterns.some(pattern => userAgent.includes(pattern));
    if (isBot) {
        request.headers['x-is-bot'] = [{key: 'X-Is-Bot', value: 'true'}];
    }
    
    // Security: Remove sensitive headers
    const sensitiveHeaders = ['x-forwarded-for', 'x-real-ip', 'cf-connecting-ip'];
    sensitiveHeaders.forEach(header => {
        delete request.headers[header];
    });
    
    callback(null, request);
};

function parseCookieHeader(cookieHeader) {
    const cookies = {};
    if (cookieHeader && cookieHeader.length > 0) {
        cookieHeader[0].value.split(';').forEach(cookie => {
            const parts = cookie.trim().split('=');
            if (parts.length === 2) {
                cookies[parts[0]] = parts[1];
            }
        });
    }
    return cookies;
}
// Origin Response Lambda@Edge Function
// Content optimization and compression

'use strict';

const zlib = require('zlib');
const { promisify } = require('util');

const gzip = promisify(zlib.gzip);
const brotliCompress = promisify(zlib.brotliCompress);

exports.handler = async (event, context, callback) => {
    const request = event.Records[0].cf.request;
    const response = event.Records[0].cf.response;
    
    // Handle 404s gracefully
    if (response.status === '404') {
        // For SPA routing, return index.html for client-side routing
        if (!request.uri.startsWith('/api') && 
            !request.uri.startsWith('/ws') && 
            !request.uri.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|webp|avif|woff|woff2|ttf|eot)$/)) {
            
            // Return 200 with index.html content for client-side routing
            response.status = '200';
            response.statusDescription = 'OK';
            response.headers['content-type'] = [{
                key: 'Content-Type',
                value: 'text/html; charset=UTF-8'
            }];
            response.headers['cache-control'] = [{
                key: 'Cache-Control',
                value: 'public, max-age=0, must-revalidate'
            }];
        }
    }
    
    // Handle image optimization fallback
    if (response.status === '404' && request.headers['x-original-uri']) {
        const originalUri = request.headers['x-original-uri'][0].value;
        const optimizedFormat = request.headers['x-optimized-format'] ? 
                               request.headers['x-optimized-format'][0].value : null;
        
        if (optimizedFormat) {
            // Optimized version doesn't exist, redirect to original
            response.status = '302';
            response.statusDescription = 'Found';
            response.headers['location'] = [{
                key: 'Location',
                value: originalUri
            }];
            response.headers['cache-control'] = [{
                key: 'Cache-Control',
                value: 'public, max-age=300'
            }];
            
            callback(null, response);
            return;
        }
    }
    
    // Content-based optimizations
    const contentType = response.headers['content-type'] ? 
                       response.headers['content-type'][0].value : '';
    
    // HTML optimization
    if (contentType.includes('text/html') && response.body) {
        try {
            let body = response.body;
            
            // Decode base64 if needed
            if (response.bodyEncoding === 'base64') {
                body = Buffer.from(body, 'base64').toString('utf-8');
            }
            
            // Minify HTML (basic minification)
            if (process.env.MINIFY_HTML === 'true') {
                body = body
                    .replace(/\s+/g, ' ')
                    .replace(/> </g, '><')
                    .replace(/<!--[\s\S]*?-->/g, '')
                    .trim();
            }
            
            // Inject performance monitoring script
            const performanceScript = `
                <script>
                    window.__CANDLEFISH_PERF__ = {
                        start: performance.now(),
                        region: '${process.env.AWS_REGION || 'us-east-1'}',
                        edge: '${request.headers['cloudfront-pop'] ? request.headers['cloudfront-pop'][0].value : 'unknown'}'
                    };
                </script>
            `;
            
            // Inject before closing head tag
            body = body.replace('</head>', `${performanceScript}</head>`);
            
            // Update response body
            response.body = body;
            response.bodyEncoding = 'text';
        } catch (error) {
            console.error('HTML optimization error:', error);
        }
    }
    
    // JSON optimization
    if (contentType.includes('application/json') && response.body) {
        try {
            let body = response.body;
            
            // Decode base64 if needed
            if (response.bodyEncoding === 'base64') {
                body = Buffer.from(body, 'base64').toString('utf-8');
            }
            
            // Minify JSON
            const jsonData = JSON.parse(body);
            body = JSON.stringify(jsonData);
            
            // Update response body
            response.body = body;
            response.bodyEncoding = 'text';
        } catch (error) {
            console.error('JSON optimization error:', error);
        }
    }
    
    // Compression (if not already compressed)
    const acceptEncoding = request.headers['accept-encoding'] ? 
                          request.headers['accept-encoding'][0].value : '';
    const contentEncoding = response.headers['content-encoding'];
    
    if (!contentEncoding && response.body && response.body.length > 1024) {
        try {
            let compressedBody;
            let encoding;
            
            const bodyBuffer = response.bodyEncoding === 'base64' ? 
                              Buffer.from(response.body, 'base64') : 
                              Buffer.from(response.body);
            
            // Prefer Brotli for better compression
            if (acceptEncoding.includes('br')) {
                compressedBody = await brotliCompress(bodyBuffer, {
                    params: {
                        [zlib.constants.BROTLI_PARAM_QUALITY]: 4
                    }
                });
                encoding = 'br';
            } else if (acceptEncoding.includes('gzip')) {
                compressedBody = await gzip(bodyBuffer, { level: 6 });
                encoding = 'gzip';
            }
            
            if (compressedBody) {
                response.body = compressedBody.toString('base64');
                response.bodyEncoding = 'base64';
                response.headers['content-encoding'] = [{
                    key: 'Content-Encoding',
                    value: encoding
                }];
                
                // Update content length
                delete response.headers['content-length'];
            }
        } catch (error) {
            console.error('Compression error:', error);
        }
    }
    
    // Add performance headers
    response.headers['x-edge-location'] = [{
        key: 'X-Edge-Location',
        value: request.headers['cloudfront-pop'] ? request.headers['cloudfront-pop'][0].value : 'unknown'
    }];
    
    response.headers['x-cache-status'] = [{
        key: 'X-Cache-Status',
        value: response.headers['x-cache'] ? response.headers['x-cache'][0].value : 'MISS'
    }];
    
    // Add timing headers
    const processingTime = Date.now() - parseInt(request.headers['x-request-timestamp'][0].value);
    response.headers['server-timing'] = [{
        key: 'Server-Timing',
        value: `origin;dur=${processingTime};desc="Origin processing time"`
    }];
    
    // Vary header for proper caching
    const varyHeaders = ['Accept-Encoding'];
    
    if (request.uri.match(/\.(jpg|jpeg|png|gif)$/i)) {
        varyHeaders.push('Accept');
    }
    
    if (request.headers['x-device-type']) {
        varyHeaders.push('CloudFront-Is-Mobile-Viewer', 'CloudFront-Is-Desktop-Viewer', 'CloudFront-Is-Tablet-Viewer');
    }
    
    response.headers['vary'] = [{
        key: 'Vary',
        value: varyHeaders.join(', ')
    }];
    
    // ETag generation for cache validation
    if (!response.headers['etag'] && response.body) {
        const crypto = require('crypto');
        const hash = crypto.createHash('md5');
        hash.update(response.body);
        const etag = `"${hash.digest('hex')}"`;
        
        response.headers['etag'] = [{
            key: 'ETag',
            value: etag
        }];
    }
    
    callback(null, response);
};
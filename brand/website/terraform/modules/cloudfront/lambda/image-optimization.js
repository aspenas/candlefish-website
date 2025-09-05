// Image Optimization Lambda@Edge Function
// WebP/AVIF conversion and resizing

'use strict';

const AWS = require('aws-sdk');
const Sharp = require('sharp');
const querystring = require('querystring');

const s3 = new AWS.S3();

exports.handler = async (event, context, callback) => {
    const request = event.Records[0].cf.request;
    const response = {
        status: '200',
        statusDescription: 'OK',
        headers: {
            'cache-control': [{
                key: 'Cache-Control',
                value: 'public, max-age=31536000, immutable'
            }],
            'content-type': [{
                key: 'Content-Type',
                value: 'image/webp'
            }]
        }
    };
    
    try {
        // Parse the request
        const uri = request.uri;
        const bucket = request.origin.s3.domainName.split('.')[0];
        const key = uri.substring(1); // Remove leading slash
        
        // Parse query parameters
        const params = querystring.parse(request.querystring);
        const width = params.w ? parseInt(params.w) : null;
        const height = params.h ? parseInt(params.h) : null;
        const quality = params.q ? parseInt(params.q) : 85;
        const format = params.format || 'auto';
        
        // Device-based sizing
        const deviceType = request.headers['x-device-type'] ? 
                          request.headers['x-device-type'][0].value : 'desktop';
        
        // Responsive breakpoints
        let targetWidth = width;
        if (!targetWidth && deviceType) {
            const breakpoints = {
                mobile: 640,
                tablet: 1024,
                desktop: 1920
            };
            targetWidth = breakpoints[deviceType];
        }
        
        // Check if optimized version exists in cache
        const optimizedKey = generateOptimizedKey(key, {
            width: targetWidth,
            height,
            quality,
            format
        });
        
        try {
            // Try to get optimized version from S3
            const cachedImage = await s3.getObject({
                Bucket: bucket + '-optimized',
                Key: optimizedKey
            }).promise();
            
            response.body = cachedImage.Body.toString('base64');
            response.bodyEncoding = 'base64';
            response.headers['content-type'][0].value = cachedImage.ContentType;
            response.headers['x-cache-hit'] = [{
                key: 'X-Cache-Hit',
                value: 'true'
            }];
            
            callback(null, response);
            return;
        } catch (err) {
            // Optimized version doesn't exist, create it
        }
        
        // Get original image from S3
        const originalImage = await s3.getObject({
            Bucket: bucket,
            Key: key
        }).promise();
        
        // Initialize Sharp with the original image
        let pipeline = Sharp(originalImage.Body);
        
        // Get image metadata
        const metadata = await pipeline.metadata();
        
        // Apply resizing if needed
        if (targetWidth || height) {
            const resizeOptions = {
                fit: 'inside',
                withoutEnlargement: true
            };
            
            if (targetWidth) resizeOptions.width = Math.min(targetWidth, metadata.width);
            if (height) resizeOptions.height = Math.min(height, metadata.height);
            
            pipeline = pipeline.resize(resizeOptions);
        }
        
        // Apply optimization based on format
        const acceptHeader = request.headers.accept ? request.headers.accept[0].value : '';
        let outputFormat = 'webp'; // Default to WebP
        let outputOptions = { quality };
        
        if (format === 'auto') {
            // Auto-detect best format
            if (acceptHeader.includes('image/avif')) {
                outputFormat = 'avif';
                outputOptions = {
                    quality,
                    effort: 4,
                    chromaSubsampling: '4:2:0'
                };
            } else if (acceptHeader.includes('image/webp')) {
                outputFormat = 'webp';
                outputOptions = {
                    quality,
                    effort: 4,
                    smartSubsample: true
                };
            } else {
                // Fallback to JPEG for compatibility
                outputFormat = 'jpeg';
                outputOptions = {
                    quality,
                    progressive: true,
                    optimizeScans: true,
                    mozjpeg: true
                };
            }
        } else if (format === 'webp') {
            outputFormat = 'webp';
            outputOptions = {
                quality,
                effort: 4,
                smartSubsample: true,
                nearLossless: quality > 90
            };
        } else if (format === 'avif') {
            outputFormat = 'avif';
            outputOptions = {
                quality,
                effort: 4,
                chromaSubsampling: '4:2:0'
            };
        }
        
        // Convert format
        pipeline = pipeline.toFormat(outputFormat, outputOptions);
        
        // Additional optimizations
        pipeline = pipeline
            .rotate() // Auto-rotate based on EXIF
            .withMetadata({ // Preserve some metadata
                orientation: undefined // Remove orientation after rotating
            });
        
        // Process the image
        const optimizedImage = await pipeline.toBuffer();
        
        // Store optimized version in S3 for future requests
        const putParams = {
            Bucket: bucket + '-optimized',
            Key: optimizedKey,
            Body: optimizedImage,
            ContentType: `image/${outputFormat}`,
            CacheControl: 'public, max-age=31536000, immutable',
            Metadata: {
                'original-key': key,
                'width': targetWidth ? targetWidth.toString() : '',
                'height': height ? height.toString() : '',
                'quality': quality.toString(),
                'format': outputFormat
            }
        };
        
        // Fire and forget S3 upload (don't wait)
        s3.putObject(putParams).promise().catch(err => {
            console.error('Failed to cache optimized image:', err);
        });
        
        // Return optimized image
        response.body = optimizedImage.toString('base64');
        response.bodyEncoding = 'base64';
        response.headers['content-type'][0].value = `image/${outputFormat}`;
        response.headers['x-optimized'] = [{
            key: 'X-Optimized',
            value: 'true'
        }];
        
        // Add performance metrics
        response.headers['x-original-size'] = [{
            key: 'X-Original-Size',
            value: originalImage.Body.length.toString()
        }];
        response.headers['x-optimized-size'] = [{
            key: 'X-Optimized-Size',
            value: optimizedImage.length.toString()
        }];
        response.headers['x-compression-ratio'] = [{
            key: 'X-Compression-Ratio',
            value: ((1 - optimizedImage.length / originalImage.Body.length) * 100).toFixed(2) + '%'
        }];
        
        callback(null, response);
        
    } catch (error) {
        console.error('Image optimization error:', error);
        
        // Return error response
        response.status = '500';
        response.statusDescription = 'Internal Server Error';
        response.body = JSON.stringify({
            error: 'Image optimization failed',
            message: error.message
        });
        response.headers['content-type'][0].value = 'application/json';
        
        callback(null, response);
    }
};

function generateOptimizedKey(originalKey, options) {
    const parts = originalKey.split('.');
    const ext = parts.pop();
    const baseName = parts.join('.');
    
    const optionString = [
        options.width ? `w${options.width}` : '',
        options.height ? `h${options.height}` : '',
        options.quality !== 85 ? `q${options.quality}` : '',
        options.format && options.format !== 'auto' ? options.format : ''
    ].filter(Boolean).join('_');
    
    const newExt = options.format === 'auto' ? 'webp' : options.format;
    
    return optionString ? 
           `${baseName}_${optionString}.${newExt}` : 
           `${baseName}.${newExt}`;
}
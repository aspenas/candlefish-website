'use strict';

/**
 * Lambda@Edge Performance Optimizer
 * Optimizes content delivery based on device capabilities and network conditions
 */

const MOBILE_REGEX = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
const LOW_END_REGEX = /MSIE|Trident|Edge/i;
const BOT_REGEX = /bot|crawler|spider|crawling/i;

// Quality presets based on device and network
const QUALITY_PRESETS = {
  ultra: {
    webgl: true,
    particles: 20,
    shadows: true,
    bloom: true,
    antialiasing: 4,
    textureQuality: 'high',
    fps: 120
  },
  high: {
    webgl: true,
    particles: 12,
    shadows: true,
    bloom: true,
    antialiasing: 2,
    textureQuality: 'medium',
    fps: 60
  },
  medium: {
    webgl: true,
    particles: 8,
    shadows: false,
    bloom: false,
    antialiasing: 1,
    textureQuality: 'low',
    fps: 60
  },
  low: {
    webgl: false,
    particles: 4,
    shadows: false,
    bloom: false,
    antialiasing: 0,
    textureQuality: 'lowest',
    fps: 30
  },
  static: {
    webgl: false,
    particles: 0,
    shadows: false,
    bloom: false,
    antialiasing: 0,
    textureQuality: 'none',
    fps: 0
  }
};

exports.handler = async (event) => {
  const request = event.Records[0].cf.request;
  const headers = request.headers;
  
  try {
    // Extract device and network information
    const userAgent = headers['user-agent'] ? headers['user-agent'][0].value : '';
    const isMobile = MOBILE_REGEX.test(userAgent);
    const isLowEnd = LOW_END_REGEX.test(userAgent);
    const isBot = BOT_REGEX.test(userAgent);
    const acceptsWebP = headers['accept'] && headers['accept'][0].value.includes('image/webp');
    const acceptsAvif = headers['accept'] && headers['accept'][0].value.includes('image/avif');
    
    // CloudFront viewer headers
    const isDesktop = headers['cloudfront-is-desktop-viewer'] && 
                     headers['cloudfront-is-desktop-viewer'][0].value === 'true';
    const isTablet = headers['cloudfront-is-tablet-viewer'] && 
                    headers['cloudfront-is-tablet-viewer'][0].value === 'true';
    
    // Network quality hints
    const saveData = headers['save-data'] && headers['save-data'][0].value === 'on';
    const connectionType = headers['ect'] ? headers['ect'][0].value : '4g';
    const downlink = headers['downlink'] ? parseFloat(headers['downlink'][0].value) : 10;
    
    // Determine quality preset
    let qualityPreset = 'high';
    if (isBot) {
      qualityPreset = 'static';
    } else if (saveData || connectionType === 'slow-2g' || connectionType === '2g') {
      qualityPreset = 'low';
    } else if (isLowEnd || (isMobile && !isTablet)) {
      qualityPreset = 'medium';
    } else if (isDesktop && downlink > 10 && connectionType === '4g') {
      qualityPreset = 'ultra';
    }
    
    // Add performance headers
    headers['x-quality-preset'] = [{
      key: 'X-Quality-Preset',
      value: qualityPreset
    }];
    
    headers['x-quality-config'] = [{
      key: 'X-Quality-Config',
      value: JSON.stringify(QUALITY_PRESETS[qualityPreset])
    }];
    
    headers['x-device-type'] = [{
      key: 'X-Device-Type',
      value: isBot ? 'bot' : (isMobile ? 'mobile' : (isTablet ? 'tablet' : 'desktop'))
    }];
    
    // Image format negotiation
    if (acceptsAvif) {
      headers['x-image-format'] = [{
        key: 'X-Image-Format',
        value: 'avif'
      }];
    } else if (acceptsWebP) {
      headers['x-image-format'] = [{
        key: 'X-Image-Format',
        value: 'webp'
      }];
    }
    
    // Early hints for critical resources
    const earlyHints = [];
    
    // Font preloading
    earlyHints.push('</fonts/display.woff2>; rel=preload; as=font; type=font/woff2; crossorigin');
    
    // Critical CSS
    earlyHints.push('</css/critical.min.css>; rel=preload; as=style');
    
    // Based on quality, preload appropriate resources
    if (qualityPreset !== 'static' && qualityPreset !== 'low') {
      earlyHints.push('</js/three.min.js>; rel=preload; as=script');
      earlyHints.push('</js/herofish.min.js>; rel=modulepreload');
    }
    
    // DNS prefetch for external resources
    earlyHints.push('<https://cdn.jsdelivr.net>; rel=dns-prefetch');
    
    headers['link'] = [{
      key: 'Link',
      value: earlyHints.join(', ')
    }];
    
    // Cache control based on path
    const uri = request.uri;
    
    if (uri.match(/\.(js|css|woff2?|ttf|otf|eot)$/)) {
      // Immutable assets with hash in filename
      headers['cache-control'] = [{
        key: 'Cache-Control',
        value: 'public, max-age=31536000, immutable'
      }];
    } else if (uri.match(/\.(jpg|jpeg|png|gif|svg|webp|avif|ico)$/)) {
      // Images with long cache
      headers['cache-control'] = [{
        key: 'Cache-Control',
        value: 'public, max-age=2592000, stale-while-revalidate=86400'
      }];
    } else if (uri.match(/\.html$/) || uri === '/') {
      // HTML with short cache
      headers['cache-control'] = [{
        key: 'Cache-Control',
        value: 'public, max-age=0, must-revalidate, stale-while-revalidate=60'
      }];
      headers['surrogate-control'] = [{
        key: 'Surrogate-Control',
        value: 'max-age=3600'
      }];
    } else if (uri.match(/\.(json|xml)$/)) {
      // Data files with moderate cache
      headers['cache-control'] = [{
        key: 'Cache-Control',
        value: 'public, max-age=300, stale-while-revalidate=60'
      }];
    }
    
    // Vary header for proper caching
    const varyHeaders = [
      'Accept-Encoding',
      'X-Quality-Preset',
      'X-Image-Format'
    ];
    
    headers['vary'] = [{
      key: 'Vary',
      value: varyHeaders.join(', ')
    }];
    
    // Enable compression hints
    headers['accept-encoding'] = [{
      key: 'Accept-Encoding',
      value: 'br, gzip, deflate'
    }];
    
    // Add request ID for tracing
    const requestId = generateRequestId();
    headers['x-request-id'] = [{
      key: 'X-Request-Id',
      value: requestId
    }];
    
    // Log performance optimization decisions
    console.log(JSON.stringify({
      requestId,
      uri,
      qualityPreset,
      deviceType: headers['x-device-type'][0].value,
      connectionType,
      downlink,
      saveData,
      imageFormat: headers['x-image-format'] ? headers['x-image-format'][0].value : 'default',
      timestamp: new Date().toISOString()
    }));
    
  } catch (error) {
    console.error('Error in performance optimizer:', error);
    // Continue with original request on error
  }
  
  return request;
};

/**
 * Generate unique request ID for tracing
 */
function generateRequestId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `${timestamp}-${random}`;
}
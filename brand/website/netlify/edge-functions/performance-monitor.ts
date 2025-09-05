import { Context } from "https://edge.netlify.com";

// Performance thresholds
const THRESHOLDS = {
  responseTime: 100,  // ms
  cacheHitTarget: 0.80,  // 80%
  errorRateMax: 0.01,  // 1%
  ttfbTarget: 200,  // ms
};

// Metrics storage (in production, use a proper metrics service)
const metrics = {
  requests: 0,
  cacheHits: 0,
  cacheMisses: 0,
  errors: 0,
  totalResponseTime: 0,
  slowRequests: 0,
};

// Device detection for adaptive performance
function detectDevice(userAgent: string) {
  const ua = userAgent.toLowerCase();
  
  if (/mobile|android|iphone|ipad|phone/i.test(ua)) {
    return 'mobile';
  } else if (/tablet|ipad/i.test(ua)) {
    return 'tablet';
  }
  return 'desktop';
}

// Network quality detection
function getNetworkQuality(request: Request) {
  // Check for Save-Data header
  if (request.headers.get('save-data') === 'on') {
    return 'low';
  }
  
  // Check for Network Information API hints
  const ect = request.headers.get('ect'); // effective connection type
  const rtt = request.headers.get('rtt'); // round trip time
  const downlink = request.headers.get('downlink'); // downlink speed
  
  if (ect === 'slow-2g' || ect === '2g') {
    return 'low';
  } else if (ect === '3g' || (rtt && parseInt(rtt) > 300)) {
    return 'medium';
  }
  
  return 'high';
}

// Performance tier calculation
function calculatePerformanceTier(device: string, network: string): string {
  if (device === 'mobile' && network === 'low') {
    return 'T4'; // Minimal
  } else if (device === 'mobile' && network === 'medium') {
    return 'T3'; // Low
  } else if (device === 'tablet' || network === 'medium') {
    return 'T2'; // Medium
  }
  return 'T1'; // High
}

export default async function handler(
  request: Request,
  context: Context
) {
  const startTime = Date.now();
  
  // Extract performance metadata
  const url = new URL(request.url);
  const userAgent = request.headers.get('user-agent') || '';
  const device = detectDevice(userAgent);
  const networkQuality = getNetworkQuality(request);
  const performanceTier = calculatePerformanceTier(device, networkQuality);
  
  // Check cache status
  const cacheStatus = request.headers.get('x-cache-status');
  const isCache = cacheStatus === 'HIT';
  
  // Get response from origin
  let response: Response;
  let error = false;
  
  try {
    response = await context.next();
    
    // Track metrics
    metrics.requests++;
    if (isCache) {
      metrics.cacheHits++;
    } else {
      metrics.cacheMisses++;
    }
    
    if (response.status >= 500) {
      metrics.errors++;
      error = true;
    }
  } catch (e) {
    metrics.errors++;
    error = true;
    throw e;
  }
  
  // Calculate response time
  const responseTime = Date.now() - startTime;
  metrics.totalResponseTime += responseTime;
  
  if (responseTime > THRESHOLDS.responseTime) {
    metrics.slowRequests++;
  }
  
  // Add performance headers to response
  response.headers.set('X-Response-Time', responseTime.toString());
  response.headers.set('X-Performance-Tier', performanceTier);
  response.headers.set('X-Device-Type', device);
  response.headers.set('X-Network-Quality', networkQuality);
  response.headers.set('X-Cache-Status', isCache ? 'HIT' : 'MISS');
  
  // Add Server-Timing header for browser performance API
  const serverTiming = [
    `edge;dur=${responseTime}`,
    `tier;desc="${performanceTier}"`,
    `cache;desc="${isCache ? 'HIT' : 'MISS'}"`,
  ].join(', ');
  response.headers.set('Server-Timing', serverTiming);
  
  // Log performance data
  const logData = {
    timestamp: new Date().toISOString(),
    url: url.pathname,
    method: request.method,
    status: response.status,
    responseTime,
    performanceTier,
    device,
    networkQuality,
    cacheStatus: isCache ? 'HIT' : 'MISS',
    error,
    userAgent,
    metrics: {
      totalRequests: metrics.requests,
      cacheHitRate: metrics.requests > 0 
        ? (metrics.cacheHits / metrics.requests * 100).toFixed(2) + '%'
        : '0%',
      errorRate: metrics.requests > 0
        ? (metrics.errors / metrics.requests * 100).toFixed(2) + '%'
        : '0%',
      avgResponseTime: metrics.requests > 0
        ? Math.round(metrics.totalResponseTime / metrics.requests)
        : 0,
      slowRequestRate: metrics.requests > 0
        ? (metrics.slowRequests / metrics.requests * 100).toFixed(2) + '%'
        : '0%',
    }
  };
  
  // Log to Netlify's edge function logs
  context.log('Performance Metrics', logData);
  
  // Alert on performance degradation
  if (responseTime > THRESHOLDS.ttfbTarget) {
    context.log('PERFORMANCE_ALERT', {
      message: 'Slow response detected',
      url: url.pathname,
      responseTime,
      threshold: THRESHOLDS.ttfbTarget
    });
  }
  
  // Inject performance data into HTML responses
  if (response.headers.get('content-type')?.includes('text/html')) {
    const html = await response.text();
    const performanceScript = `
      <script>
        window.__CF_PERFORMANCE__ = {
          tier: '${performanceTier}',
          device: '${device}',
          network: '${networkQuality}',
          responseTime: ${responseTime},
          cached: ${isCache},
          timestamp: '${new Date().toISOString()}'
        };
        
        // Report to analytics
        if (window.gtag) {
          gtag('event', 'performance', {
            event_category: 'Web Vitals',
            event_label: 'Edge Performance',
            value: ${responseTime},
            tier: '${performanceTier}',
            device: '${device}',
            network: '${networkQuality}'
          });
        }
      </script>
    `;
    
    const modifiedHtml = html.replace('</head>', `${performanceScript}</head>`);
    
    return new Response(modifiedHtml, {
      status: response.status,
      headers: response.headers
    });
  }
  
  return response;
}

export const config = {
  path: "/*"
};
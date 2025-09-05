'use strict';

/**
 * Lambda@Edge A/B Testing Router
 * Intelligently routes users to different experiment variants
 */

const crypto = require('crypto');

// Experiment configurations
const EXPERIMENTS = {
  hero_animation: {
    name: 'Hero Animation Quality',
    enabled: true,
    variants: {
      control: { weight: 50, config: { quality: 'high', particles: 12 } },
      reduced: { weight: 25, config: { quality: 'medium', particles: 8 } },
      enhanced: { weight: 25, config: { quality: 'ultra', particles: 20 } }
    },
    metrics: ['fps', 'bounce_rate', 'engagement_time']
  },
  bundle_strategy: {
    name: 'Bundle Optimization Strategy',
    enabled: true,
    variants: {
      control: { weight: 70, path: '/js/bundle.js' },
      experimental: { weight: 30, path: '/js/bundle.experimental.js' }
    },
    metrics: ['load_time', 'parse_time', 'memory_usage']
  },
  render_mode: {
    name: 'WebGL vs Canvas Rendering',
    enabled: true,
    variants: {
      webgl: { weight: 80, config: { renderer: 'webgl2' } },
      canvas: { weight: 20, config: { renderer: 'canvas2d' } }
    },
    metrics: ['fps', 'cpu_usage', 'battery_drain']
  },
  cache_strategy: {
    name: 'Cache Strategy',
    enabled: false,  // Disabled for now
    variants: {
      aggressive: { weight: 33, ttl: 86400 },
      moderate: { weight: 33, ttl: 3600 },
      conservative: { weight: 34, ttl: 300 }
    },
    metrics: ['cache_hit_rate', 'freshness', 'bandwidth']
  }
};

exports.handler = async (event) => {
  const request = event.Records[0].cf.request;
  const headers = request.headers;
  
  try {
    // Get or generate user ID for consistent experiment assignment
    let userId = getCookie(headers, 'cf_uid');
    if (!userId) {
      userId = generateUserId();
      // Will be set in response
      headers['x-set-cookie-uid'] = [{
        key: 'X-Set-Cookie-UID',
        value: userId
      }];
    }
    
    // Get experiment overrides from query string
    const queryString = request.querystring || '';
    const params = new URLSearchParams(queryString);
    const forceExperiment = params.get('experiment');
    const forceVariant = params.get('variant');
    
    // Determine device capabilities
    const userAgent = headers['user-agent'] ? headers['user-agent'][0].value : '';
    const isMobile = /Mobile|Android|iPhone/i.test(userAgent);
    const isBot = /bot|crawler|spider/i.test(userAgent);
    
    // Skip experiments for bots
    if (isBot) {
      headers['x-experiments'] = [{
        key: 'X-Experiments',
        value: 'none:bot'
      }];
      return request;
    }
    
    // Process each active experiment
    const assignments = {};
    const experimentHeaders = [];
    
    for (const [experimentId, experiment] of Object.entries(EXPERIMENTS)) {
      if (!experiment.enabled) continue;
      
      let variant;
      
      // Check for forced assignment
      if (forceExperiment === experimentId && forceVariant) {
        variant = forceVariant;
      } else {
        // Use consistent hashing for assignment
        variant = assignVariant(userId, experimentId, experiment.variants);
      }
      
      assignments[experimentId] = variant;
      experimentHeaders.push(`${experimentId}:${variant}`);
      
      // Apply experiment-specific modifications
      applyExperimentModifications(
        experimentId,
        variant,
        experiment.variants[variant],
        request,
        headers
      );
    }
    
    // Add experiment headers for tracking
    headers['x-experiments'] = [{
      key: 'X-Experiments',
      value: experimentHeaders.join(',')
    }];
    
    headers['x-experiment-data'] = [{
      key: 'X-Experiment-Data',
      value: JSON.stringify(assignments)
    }];
    
    // Add cache key variations for experiments
    if (assignments.bundle_strategy) {
      headers['x-bundle-variant'] = [{
        key: 'X-Bundle-Variant',
        value: assignments.bundle_strategy
      }];
    }
    
    if (assignments.render_mode) {
      headers['x-render-variant'] = [{
        key: 'X-Render-Variant',
        value: assignments.render_mode
      }];
    }
    
    // Log experiment assignments for analysis
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      userId,
      uri: request.uri,
      assignments,
      isMobile,
      forced: !!forceExperiment
    }));
    
  } catch (error) {
    console.error('Error in A/B testing router:', error);
    // Continue with default behavior on error
  }
  
  return request;
};

/**
 * Get cookie value from headers
 */
function getCookie(headers, name) {
  if (!headers.cookie) return null;
  
  const cookies = headers.cookie[0].value;
  const match = cookies.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? match[2] : null;
}

/**
 * Generate unique user ID
 */
function generateUserId() {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(8).toString('hex');
  return `${timestamp}-${random}`;
}

/**
 * Assign variant based on consistent hashing
 */
function assignVariant(userId, experimentId, variants) {
  // Create hash of userId + experimentId for consistent assignment
  const hash = crypto
    .createHash('md5')
    .update(`${userId}-${experimentId}`)
    .digest();
  
  // Convert first 4 bytes to number between 0 and 100
  const hashValue = (hash.readUInt32BE(0) / 0xFFFFFFFF) * 100;
  
  // Assign based on weights
  let cumulative = 0;
  for (const [variantName, variant] of Object.entries(variants)) {
    cumulative += variant.weight;
    if (hashValue < cumulative) {
      return variantName;
    }
  }
  
  // Fallback to first variant
  return Object.keys(variants)[0];
}

/**
 * Apply experiment-specific request modifications
 */
function applyExperimentModifications(experimentId, variantName, variant, request, headers) {
  switch (experimentId) {
    case 'hero_animation':
      // Pass animation quality config to origin
      headers['x-animation-config'] = [{
        key: 'X-Animation-Config',
        value: JSON.stringify(variant.config)
      }];
      break;
      
    case 'bundle_strategy':
      // Rewrite bundle path for experimental version
      if (variantName === 'experimental' && request.uri === '/js/bundle.js') {
        request.uri = variant.path;
      }
      break;
      
    case 'render_mode':
      // Pass render mode to application
      headers['x-render-mode'] = [{
        key: 'X-Render-Mode',
        value: variant.config.renderer
      }];
      break;
      
    case 'cache_strategy':
      // Add cache TTL hint
      headers['x-cache-ttl'] = [{
        key: 'X-Cache-TTL',
        value: variant.ttl.toString()
      }];
      break;
  }
}
// CloudFront CDN Configuration for Candlefish AI Platform
// Priority: Performance optimization with intelligent caching and edge computing

import { CloudFormation } from 'aws-sdk';

/**
 * CloudFront distribution configuration interface
 */
interface CDNConfig {
  domainName: string;
  certificateArn: string;
  origins: OriginConfig[];
  cacheBehaviors: CacheBehaviorConfig[];
  customErrorPages: CustomErrorPageConfig[];
  logging: LoggingConfig;
  waf: WAFConfig;
  compression: boolean;
  http2: boolean;
  ipv6: boolean;
}

/**
 * Origin configuration for different services
 */
interface OriginConfig {
  id: string;
  domainName: string;
  path?: string;
  customHeaders?: { [key: string]: string };
  originShield?: {
    enabled: boolean;
    region: string;
  };
  connectionAttempts: number;
  connectionTimeout: number;
}

/**
 * Cache behavior configuration
 */
interface CacheBehaviorConfig {
  pathPattern: string;
  targetOriginId: string;
  viewerProtocolPolicy: 'allow-all' | 'redirect-to-https' | 'https-only';
  cachePolicyId?: string;
  originRequestPolicyId?: string;
  responseHeadersPolicyId?: string;
  compress: boolean;
  fieldLevelEncryption?: string;
  trustedSigners?: string[];
  trustedKeyGroups?: string[];
  lambdaFunctionAssociations?: LambdaFunctionAssociation[];
  edgeFunctionAssociations?: EdgeFunctionAssociation[];
}

/**
 * Lambda@Edge function association
 */
interface LambdaFunctionAssociation {
  lambdaFunctionArn: string;
  eventType: 'viewer-request' | 'origin-request' | 'origin-response' | 'viewer-response';
  includeBody?: boolean;
}

/**
 * CloudFront Functions (Edge) association
 */
interface EdgeFunctionAssociation {
  functionArn: string;
  eventType: 'viewer-request' | 'viewer-response';
}

/**
 * Custom error page configuration
 */
interface CustomErrorPageConfig {
  errorCode: number;
  responsePagePath: string;
  responseCode: number;
  errorCachingMinTTL: number;
}

/**
 * Logging configuration
 */
interface LoggingConfig {
  bucket: string;
  prefix: string;
  includeCookies: boolean;
}

/**
 * WAF configuration
 */
interface WAFConfig {
  webACLId: string;
  enabled: boolean;
}

/**
 * Candlefish AI CDN Configuration
 */
export const candlefishCDNConfig: CDNConfig = {
  domainName: 'cdn.candlefish.ai',
  certificateArn: 'arn:aws:acm:us-east-1:681214184463:certificate/your-certificate-id',
  compression: true,
  http2: true,
  ipv6: true,

  origins: [
    // API Gateway Origin
    {
      id: 'api-origin',
      domainName: 'api.candlefish.ai',
      customHeaders: {
        'X-CDN-Origin': 'cloudfront',
        'X-Request-Source': 'cdn'
      },
      originShield: {
        enabled: true,
        region: 'us-east-1'
      },
      connectionAttempts: 3,
      connectionTimeout: 10
    },

    // Static Assets Origin (S3)
    {
      id: 'static-origin',
      domainName: 'candlefish-static-assets.s3.amazonaws.com',
      path: '/public',
      originShield: {
        enabled: true,
        region: 'us-east-1'
      },
      connectionAttempts: 3,
      connectionTimeout: 10
    },

    // Documentation Site Origin
    {
      id: 'docs-origin',
      domainName: 'docs.candlefish.ai',
      customHeaders: {
        'X-CDN-Origin': 'cloudfront'
      },
      connectionAttempts: 3,
      connectionTimeout: 10
    },

    // Partners Portal Origin
    {
      id: 'partners-origin',
      domainName: 'partners.candlefish.ai',
      customHeaders: {
        'X-CDN-Origin': 'cloudfront'
      },
      connectionAttempts: 3,
      connectionTimeout: 10
    }
  ],

  cacheBehaviors: [
    // Default behavior for application
    {
      pathPattern: 'default',
      targetOriginId: 'api-origin',
      viewerProtocolPolicy: 'redirect-to-https',
      cachePolicyId: 'custom-api-cache-policy',
      originRequestPolicyId: 'cors-s3-origin',
      responseHeadersPolicyId: 'security-headers-policy',
      compress: true,
      edgeFunctionAssociations: [
        {
          functionArn: 'arn:aws:cloudfront::681214184463:function/security-headers',
          eventType: 'viewer-response'
        }
      ]
    },

    // Static assets - Long-term caching
    {
      pathPattern: '/static/*',
      targetOriginId: 'static-origin',
      viewerProtocolPolicy: 'redirect-to-https',
      cachePolicyId: 'static-assets-cache-policy',
      compress: true,
      edgeFunctionAssociations: [
        {
          functionArn: 'arn:aws:cloudfront::681214184463:function/static-asset-headers',
          eventType: 'viewer-response'
        }
      ]
    },

    // Images - Optimized caching with WebP conversion
    {
      pathPattern: '/images/*',
      targetOriginId: 'static-origin',
      viewerProtocolPolicy: 'redirect-to-https',
      cachePolicyId: 'images-cache-policy',
      compress: true,
      lambdaFunctionAssociations: [
        {
          lambdaFunctionArn: 'arn:aws:lambda:us-east-1:681214184463:function:image-optimization:1',
          eventType: 'origin-response'
        }
      ]
    },

    // API endpoints - No caching for dynamic content
    {
      pathPattern: '/api/*',
      targetOriginId: 'api-origin',
      viewerProtocolPolicy: 'https-only',
      cachePolicyId: 'no-cache-policy',
      originRequestPolicyId: 'all-headers-cors-origin',
      compress: true,
      lambdaFunctionAssociations: [
        {
          lambdaFunctionArn: 'arn:aws:lambda:us-east-1:681214184463:function:api-auth-check:1',
          eventType: 'viewer-request'
        }
      ]
    },

    // GraphQL endpoint - Custom caching based on query type
    {
      pathPattern: '/graphql',
      targetOriginId: 'api-origin',
      viewerProtocolPolicy: 'https-only',
      cachePolicyId: 'graphql-cache-policy',
      compress: true,
      lambdaFunctionAssociations: [
        {
          lambdaFunctionArn: 'arn:aws:lambda:us-east-1:681214184463:function:graphql-cache-control:1',
          eventType: 'origin-request'
        },
        {
          lambdaFunctionArn: 'arn:aws:lambda:us-east-1:681214184463:function:graphql-response-cache:1',
          eventType: 'origin-response'
        }
      ]
    },

    // Documentation - Medium-term caching
    {
      pathPattern: '/docs/*',
      targetOriginId: 'docs-origin',
      viewerProtocolPolicy: 'redirect-to-https',
      cachePolicyId: 'docs-cache-policy',
      compress: true
    },

    // Partners portal - Short-term caching
    {
      pathPattern: '/partners/*',
      targetOriginId: 'partners-origin',
      viewerProtocolPolicy: 'redirect-to-https',
      cachePolicyId: 'partners-cache-policy',
      compress: true
    }
  ],

  customErrorPages: [
    {
      errorCode: 404,
      responsePagePath: '/404.html',
      responseCode: 404,
      errorCachingMinTTL: 300
    },
    {
      errorCode: 500,
      responsePagePath: '/500.html',
      responseCode: 500,
      errorCachingMinTTL: 10
    },
    {
      errorCode: 502,
      responsePagePath: '/maintenance.html',
      responseCode: 502,
      errorCachingMinTTL: 10
    },
    {
      errorCode: 503,
      responsePagePath: '/maintenance.html',
      responseCode: 503,
      errorCachingMinTTL: 10
    }
  ],

  logging: {
    bucket: 'candlefish-cloudfront-logs',
    prefix: 'access-logs/',
    includeCookies: false
  },

  waf: {
    webACLId: 'arn:aws:wafv2:us-east-1:681214184463:global/webacl/candlefish-protection/id',
    enabled: true
  }
};

/**
 * Cache policies for different content types
 */
export const cachePolicies = {
  // No caching for dynamic API content
  'no-cache-policy': {
    name: 'CandlefishNoCache',
    comment: 'No caching for dynamic API content',
    defaultTTL: 0,
    maxTTL: 0,
    minTTL: 0,
    parametersInCacheKeyAndForwardedToOrigin: {
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
      queryStringsConfig: {
        queryStringBehavior: 'all'
      },
      headersConfig: {
        headerBehavior: 'whitelist',
        headers: [
          'Authorization',
          'Content-Type',
          'X-Request-ID',
          'X-Correlation-ID'
        ]
      },
      cookiesConfig: {
        cookieBehavior: 'all'
      }
    }
  },

  // Long-term caching for static assets
  'static-assets-cache-policy': {
    name: 'CandlefishStaticAssets',
    comment: 'Long-term caching for static assets',
    defaultTTL: 86400, // 1 day
    maxTTL: 31536000,  // 1 year
    minTTL: 0,
    parametersInCacheKeyAndForwardedToOrigin: {
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
      queryStringsConfig: {
        queryStringBehavior: 'whitelist',
        queryStrings: ['v', 'version', 't']
      },
      headersConfig: {
        headerBehavior: 'none'
      },
      cookiesConfig: {
        cookieBehavior: 'none'
      }
    }
  },

  // Image optimization caching
  'images-cache-policy': {
    name: 'CandlefishImages',
    comment: 'Optimized caching for images with format conversion',
    defaultTTL: 86400, // 1 day
    maxTTL: 31536000,  // 1 year
    minTTL: 86400,     // 1 day minimum
    parametersInCacheKeyAndForwardedToOrigin: {
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
      queryStringsConfig: {
        queryStringBehavior: 'whitelist',
        queryStrings: ['w', 'h', 'q', 'format']
      },
      headersConfig: {
        headerBehavior: 'whitelist',
        headers: ['Accept']
      },
      cookiesConfig: {
        cookieBehavior: 'none'
      }
    }
  },

  // GraphQL intelligent caching
  'graphql-cache-policy': {
    name: 'CandlefishGraphQL',
    comment: 'Intelligent caching for GraphQL queries',
    defaultTTL: 300,   // 5 minutes
    maxTTL: 3600,      // 1 hour
    minTTL: 0,
    parametersInCacheKeyAndForwardedToOrigin: {
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
      queryStringsConfig: {
        queryStringBehavior: 'all'
      },
      headersConfig: {
        headerBehavior: 'whitelist',
        headers: [
          'Authorization',
          'Content-Type',
          'X-Request-ID',
          'GraphQL-Query-Hash'
        ]
      },
      cookiesConfig: {
        cookieBehavior: 'whitelist',
        cookies: ['auth_token']
      }
    }
  },

  // Documentation caching
  'docs-cache-policy': {
    name: 'CandlefishDocs',
    comment: 'Medium-term caching for documentation',
    defaultTTL: 3600,  // 1 hour
    maxTTL: 86400,     // 1 day
    minTTL: 300,       // 5 minutes
    parametersInCacheKeyAndForwardedToOrigin: {
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
      queryStringsConfig: {
        queryStringBehavior: 'whitelist',
        queryStrings: ['v', 'lang']
      },
      headersConfig: {
        headerBehavior: 'none'
      },
      cookiesConfig: {
        cookieBehavior: 'none'
      }
    }
  }
};

/**
 * Lambda@Edge functions for optimization
 */
export const edgeFunctions = {
  // Security headers function
  'security-headers': `
function handler(event) {
    var response = event.response;
    var headers = response.headers;

    // Add security headers
    headers['strict-transport-security'] = { value: 'max-age=31536000; includeSubDomains; preload' };
    headers['content-security-policy'] = {
        value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://*.candlefish.ai; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' https://*.candlefish.ai data: https:; connect-src 'self' https://*.candlefish.ai wss://*.candlefish.ai;"
    };
    headers['x-frame-options'] = { value: 'SAMEORIGIN' };
    headers['x-content-type-options'] = { value: 'nosniff' };
    headers['referrer-policy'] = { value: 'strict-origin-when-cross-origin' };
    headers['permissions-policy'] = {
        value: 'camera=(), microphone=(), geolocation=(self), payment=()'
    };

    return response;
}`,

  // Static asset headers function
  'static-asset-headers': `
function handler(event) {
    var response = event.response;
    var headers = response.headers;
    var request = event.request;
    var uri = request.uri;

    // Set long-term caching for static assets
    if (uri.match(/\\.(js|css|png|jpg|jpeg|gif|svg|woff2?|eot|ttf)$/)) {
        headers['cache-control'] = { value: 'public, max-age=31536000, immutable' };
    }

    // Add CORS headers for fonts
    if (uri.match(/\\.(woff2?|eot|ttf)$/)) {
        headers['access-control-allow-origin'] = { value: 'https://candlefish.ai' };
        headers['access-control-allow-methods'] = { value: 'GET' };
    }

    return response;
}`
};

/**
 * Lambda@Edge function for image optimization
 */
export const imageOptimizationLambda = `
const AWS = require('aws-sdk');
const sharp = require('sharp');

exports.handler = async (event) => {
    const { request, response } = event.Records[0].cf;

    // Only process successful responses with images
    if (response.status !== '200' || !response.headers['content-type']?.[0]?.value?.startsWith('image/')) {
        return response;
    }

    const params = new URLSearchParams(request.querystring);
    const width = parseInt(params.get('w')) || null;
    const height = parseInt(params.get('h')) || null;
    const quality = parseInt(params.get('q')) || 80;
    const format = params.get('format');

    // If no optimization parameters, return original
    if (!width && !height && !format) {
        return response;
    }

    try {
        // Get the image body
        const body = response.body.data;
        const imageBuffer = Buffer.from(body, response.body.encoding === 'base64' ? 'base64' : 'utf8');

        let transformer = sharp(imageBuffer);

        // Resize if dimensions provided
        if (width || height) {
            transformer = transformer.resize(width, height, {
                fit: 'inside',
                withoutEnlargement: true
            });
        }

        // Convert format if requested
        if (format === 'webp') {
            transformer = transformer.webp({ quality });
        } else if (format === 'avif') {
            transformer = transformer.avif({ quality });
        } else {
            transformer = transformer.jpeg({ quality });
        }

        const optimizedBuffer = await transformer.toBuffer();

        // Update response
        response.body.data = optimizedBuffer.toString('base64');
        response.body.encoding = 'base64';

        // Update content-type if format changed
        if (format === 'webp') {
            response.headers['content-type'] = [{ value: 'image/webp' }];
        } else if (format === 'avif') {
            response.headers['content-type'] = [{ value: 'image/avif' }];
        }

        // Update content-length
        response.headers['content-length'] = [{ value: optimizedBuffer.length.toString() }];

        return response;
    } catch (error) {
        console.error('Image optimization error:', error);
        return response;
    }
};`;

/**
 * GraphQL cache control Lambda@Edge function
 */
export const graphqlCacheLambda = `
exports.handler = async (event) => {
    const request = event.Records[0].cf.request;
    const headers = request.headers;

    if (request.method !== 'POST') {
        return request;
    }

    try {
        const body = JSON.parse(Buffer.from(request.body.data, 'base64').toString());
        const query = body.query;
        const variables = body.variables;

        // Generate cache key based on query and variables
        const crypto = require('crypto');
        const cacheKey = crypto.createHash('sha256')
            .update(query + JSON.stringify(variables))
            .digest('hex');

        // Add cache key header for downstream processing
        headers['graphql-query-hash'] = [{ value: cacheKey }];

        // Determine if query is cacheable (no mutations)
        const isCacheable = !query.toLowerCase().includes('mutation');
        headers['x-graphql-cacheable'] = [{ value: isCacheable.toString() }];

        return request;
    } catch (error) {
        console.error('GraphQL cache processing error:', error);
        return request;
    }
};`;

/**
 * Terraform configuration for CloudFront distribution
 */
export const terraformConfig = `
resource "aws_cloudfront_distribution" "candlefish_cdn" {
  origin {
    domain_name = "api.candlefish.ai"
    origin_id   = "api-origin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }

    origin_shield {
      enabled              = true
      origin_shield_region = "us-east-1"
    }
  }

  origin {
    domain_name = "candlefish-static-assets.s3.amazonaws.com"
    origin_id   = "static-origin"
    origin_path = "/public"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.static_assets.cloudfront_access_identity_path
    }

    origin_shield {
      enabled              = true
      origin_shield_region = "us-east-1"
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Candlefish AI CDN Distribution"
  default_root_object = "index.html"

  aliases = ["cdn.candlefish.ai"]

  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "api-origin"
    compress         = true

    cache_policy_id            = aws_cloudfront_cache_policy.api_cache.id
    origin_request_policy_id   = aws_cloudfront_origin_request_policy.cors_policy.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id

    viewer_protocol_policy = "redirect-to-https"
  }

  # Static assets cache behavior
  ordered_cache_behavior {
    path_pattern     = "/static/*"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "static-origin"
    compress         = true

    cache_policy_id = aws_cloudfront_cache_policy.static_assets.id

    viewer_protocol_policy = "redirect-to-https"
  }

  # API cache behavior
  ordered_cache_behavior {
    path_pattern     = "/api/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "api-origin"
    compress         = true

    cache_policy_id          = aws_cloudfront_cache_policy.no_cache.id
    origin_request_policy_id = aws_cloudfront_origin_request_policy.all_headers.id

    viewer_protocol_policy = "https-only"
  }

  price_class = "PriceClass_All"

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = var.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  web_acl_id = var.waf_web_acl_id

  logging_config {
    include_cookies = false
    bucket          = aws_s3_bucket.cloudfront_logs.bucket_domain_name
    prefix          = "access-logs/"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 404
    response_page_path = "/404.html"
    error_caching_min_ttl = 300
  }

  custom_error_response {
    error_code         = 500
    response_code      = 500
    response_page_path = "/500.html"
    error_caching_min_ttl = 10
  }

  tags = {
    Name        = "candlefish-cdn"
    Environment = "production"
    Project     = "candlefish-ai"
  }
}

# Cache policies
resource "aws_cloudfront_cache_policy" "static_assets" {
  name    = "CandlefishStaticAssets"
  comment = "Cache policy for static assets"

  default_ttl = 86400
  max_ttl     = 31536000
  min_ttl     = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_gzip   = true
    enable_accept_encoding_brotli = true

    query_strings_config {
      query_string_behavior = "whitelist"
      query_strings {
        items = ["v", "version", "t"]
      }
    }

    headers_config {
      header_behavior = "none"
    }

    cookies_config {
      cookie_behavior = "none"
    }
  }
}`;

/**
 * Performance monitoring and analytics
 */
export const performanceMonitoring = {
  // Real User Monitoring (RUM) configuration
  rumConfig: {
    appMonitorId: 'candlefish-cdn-rum',
    identityPoolId: 'us-east-1:identity-pool-id',
    guestRoleArn: 'arn:aws:iam::681214184463:role/RUMGuestRole',
    enableXRay: true,
    sessionSampleRate: 0.1, // 10% sampling
    telemetries: ['errors', 'performance', 'http']
  },

  // CloudWatch alarms
  alarms: [
    {
      name: 'CDN-HighErrorRate',
      metric: 'ErrorRate',
      threshold: 5, // 5% error rate
      period: 300,
      evaluationPeriods: 2
    },
    {
      name: 'CDN-HighLatency',
      metric: 'ResponseTime',
      threshold: 2000, // 2 seconds
      period: 300,
      evaluationPeriods: 2
    },
    {
      name: 'CDN-LowCacheHitRate',
      metric: 'CacheHitRate',
      threshold: 70, // Below 70%
      period: 300,
      evaluationPeriods: 3,
      comparisonOperator: 'LessThanThreshold'
    }
  ]
};

export default candlefishCDNConfig;

/**
 * Infrastructure Performance Optimization
 * CDN, Load Balancing, Auto-scaling, and Monitoring
 */

import { CloudFront, S3 } from 'aws-sdk';
import { Client as ElasticsearchClient } from '@elastic/elasticsearch';
import * as k8s from '@kubernetes/client-nodejs';

// ===========================
// 1. CDN Configuration
// ===========================

export class CDNOptimizer {
  private cloudfront: CloudFront;
  private s3: S3;

  constructor() {
    this.cloudfront = new CloudFront({
      region: process.env.AWS_REGION || 'us-east-1',
    });

    this.s3 = new S3({
      region: process.env.AWS_REGION || 'us-east-1',
    });
  }

  /**
   * CloudFront distribution configuration for optimal performance
   */
  async createOptimizedDistribution() {
    const config: CloudFront.CreateDistributionRequest = {
      DistributionConfig: {
        CallerReference: Date.now().toString(),
        Comment: 'Candlefish Analytics Dashboard CDN',
        Enabled: true,

        // Origins configuration
        Origins: {
          Quantity: 2,
          Items: [
            {
              Id: 'S3-Static-Assets',
              DomainName: `${process.env.S3_BUCKET}.s3.amazonaws.com`,
              S3OriginConfig: {
                OriginAccessIdentity: `origin-access-identity/cloudfront/${process.env.OAI_ID}`,
              },
            },
            {
              Id: 'API-Origin',
              DomainName: process.env.API_DOMAIN!,
              CustomOriginConfig: {
                HTTPPort: 80,
                HTTPSPort: 443,
                OriginProtocolPolicy: 'https-only',
                OriginSslProtocols: {
                  Quantity: 3,
                  Items: ['TLSv1.2', 'TLSv1.3'],
                },
                OriginReadTimeout: 30,
                OriginKeepaliveTimeout: 5,
              },
            },
          ],
        },

        // Cache behaviors
        DefaultCacheBehavior: {
          TargetOriginId: 'S3-Static-Assets',
          ViewerProtocolPolicy: 'redirect-to-https',
          AllowedMethods: {
            Quantity: 2,
            Items: ['GET', 'HEAD'],
            CachedMethods: {
              Quantity: 2,
              Items: ['GET', 'HEAD'],
            },
          },
          Compress: true,

          // Cache policy
          CachePolicyId: await this.createCachePolicy(),

          // Origin request policy
          OriginRequestPolicyId: await this.createOriginRequestPolicy(),

          // Response headers policy
          ResponseHeadersPolicyId: await this.createResponseHeadersPolicy(),

          TrustedSigners: {
            Enabled: false,
            Quantity: 0,
          },
          MinTTL: 0,
          DefaultTTL: 86400, // 1 day
          MaxTTL: 31536000, // 1 year
        },

        // Additional cache behaviors
        CacheBehaviors: {
          Quantity: 3,
          Items: [
            {
              PathPattern: '/api/*',
              TargetOriginId: 'API-Origin',
              ViewerProtocolPolicy: 'https-only',
              AllowedMethods: {
                Quantity: 7,
                Items: ['GET', 'HEAD', 'OPTIONS', 'PUT', 'POST', 'PATCH', 'DELETE'],
                CachedMethods: {
                  Quantity: 2,
                  Items: ['GET', 'HEAD'],
                },
              },
              Compress: true,
              MinTTL: 0,
              DefaultTTL: 0,
              MaxTTL: 0,
              ForwardedValues: {
                QueryString: true,
                Cookies: {
                  Forward: 'all',
                },
                Headers: {
                  Quantity: 4,
                  Items: ['Authorization', 'Content-Type', 'X-Tenant-ID', 'X-Request-ID'],
                },
              },
              TrustedSigners: {
                Enabled: false,
                Quantity: 0,
              },
            },
            {
              PathPattern: '*.js',
              TargetOriginId: 'S3-Static-Assets',
              ViewerProtocolPolicy: 'redirect-to-https',
              AllowedMethods: {
                Quantity: 2,
                Items: ['GET', 'HEAD'],
              },
              Compress: true,
              MinTTL: 86400,
              DefaultTTL: 604800, // 7 days
              MaxTTL: 31536000, // 1 year
              ForwardedValues: {
                QueryString: false,
                Cookies: { Forward: 'none' },
              },
              TrustedSigners: {
                Enabled: false,
                Quantity: 0,
              },
            },
            {
              PathPattern: '*.css',
              TargetOriginId: 'S3-Static-Assets',
              ViewerProtocolPolicy: 'redirect-to-https',
              AllowedMethods: {
                Quantity: 2,
                Items: ['GET', 'HEAD'],
              },
              Compress: true,
              MinTTL: 86400,
              DefaultTTL: 604800, // 7 days
              MaxTTL: 31536000, // 1 year
              ForwardedValues: {
                QueryString: false,
                Cookies: { Forward: 'none' },
              },
              TrustedSigners: {
                Enabled: false,
                Quantity: 0,
              },
            },
          ],
        },

        // Error pages
        CustomErrorResponses: {
          Quantity: 2,
          Items: [
            {
              ErrorCode: 404,
              ResponsePagePath: '/404.html',
              ResponseCode: '404',
              ErrorCachingMinTTL: 300,
            },
            {
              ErrorCode: 503,
              ResponsePagePath: '/maintenance.html',
              ResponseCode: '503',
              ErrorCachingMinTTL: 60,
            },
          ],
        },

        // Geo restrictions
        Restrictions: {
          GeoRestriction: {
            RestrictionType: 'none',
            Quantity: 0,
          },
        },

        // SSL configuration
        ViewerCertificate: {
          ACMCertificateArn: process.env.SSL_CERTIFICATE_ARN,
          SSLSupportMethod: 'sni-only',
          MinimumProtocolVersion: 'TLSv1.2_2021',
        },

        // HTTP/2 and HTTP/3 support
        HttpVersion: 'http2and3',
        IsIPV6Enabled: true,

        // Logging
        Logging: {
          Enabled: true,
          IncludeCookies: false,
          Bucket: `${process.env.LOGS_BUCKET}.s3.amazonaws.com`,
          Prefix: 'cdn-logs/',
        },

        // Price class for global distribution
        PriceClass: 'PriceClass_All',
      },
    };

    const result = await this.cloudfront.createDistribution(config).promise();
    return result.Distribution;
  }

  /**
   * Create optimized cache policy
   */
  private async createCachePolicy(): Promise<string> {
    const policy = {
      CachePolicyConfig: {
        Name: 'OptimizedCachePolicy',
        Comment: 'Optimized cache policy for static assets',
        DefaultTTL: 86400,
        MaxTTL: 31536000,
        MinTTL: 1,
        ParametersInCacheKeyAndForwardedToOrigin: {
          EnableAcceptEncodingGzip: true,
          EnableAcceptEncodingBrotli: true,
          QueryStringsConfig: {
            QueryStringBehavior: 'whitelist',
            QueryStrings: {
              Quantity: 1,
              Items: ['v'], // Version parameter
            },
          },
          HeadersConfig: {
            HeaderBehavior: 'none',
          },
          CookiesConfig: {
            CookieBehavior: 'none',
          },
        },
      },
    };

    const result = await this.cloudfront.createCachePolicy(policy).promise();
    return result.CachePolicy!.Id!;
  }

  /**
   * Create origin request policy
   */
  private async createOriginRequestPolicy(): Promise<string> {
    const policy = {
      OriginRequestPolicyConfig: {
        Name: 'OptimizedOriginRequestPolicy',
        Comment: 'Forward necessary headers to origin',
        HeadersConfig: {
          HeaderBehavior: 'whitelist',
          Headers: {
            Quantity: 4,
            Items: ['CloudFront-Viewer-Country', 'CloudFront-Is-Mobile-Viewer', 'Accept', 'Accept-Language'],
          },
        },
        CookiesConfig: {
          CookieBehavior: 'none',
        },
        QueryStringsConfig: {
          QueryStringBehavior: 'all',
        },
      },
    };

    const result = await this.cloudfront.createOriginRequestPolicy(policy).promise();
    return result.OriginRequestPolicy!.Id!;
  }

  /**
   * Create response headers policy for security and performance
   */
  private async createResponseHeadersPolicy(): Promise<string> {
    const policy = {
      ResponseHeadersPolicyConfig: {
        Name: 'OptimizedResponseHeaders',
        Comment: 'Security and performance headers',
        SecurityHeadersConfig: {
          StrictTransportSecurity: {
            AccessControlMaxAgeSec: 63072000,
            IncludeSubdomains: true,
            Preload: true,
            Override: true,
          },
          ContentTypeOptions: {
            Override: true,
          },
          FrameOptions: {
            FrameOption: 'DENY',
            Override: true,
          },
          ReferrerPolicy: {
            ReferrerPolicy: 'strict-origin-when-cross-origin',
            Override: true,
          },
          XSSProtection: {
            ModeBlock: true,
            Protection: true,
            Override: true,
          },
          ContentSecurityPolicy: {
            ContentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.segment.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.candlefish.ai wss://ws.candlefish.ai",
            Override: true,
          },
        },
        CustomHeadersConfig: {
          Quantity: 3,
          Items: [
            {
              Header: 'Cache-Control',
              Value: 'public, max-age=31536000, immutable',
              Override: false,
            },
            {
              Header: 'X-Content-Type-Options',
              Value: 'nosniff',
              Override: true,
            },
            {
              Header: 'Permissions-Policy',
              Value: 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
              Override: true,
            },
          ],
        },
        CorsConfig: {
          AccessControlAllowOrigins: {
            Quantity: 1,
            Items: [{
              OriginOverride: false,
            }],
          },
          AccessControlAllowMethods: {
            Quantity: 7,
            Items: ['GET', 'HEAD', 'OPTIONS', 'PUT', 'POST', 'PATCH', 'DELETE'],
          },
          AccessControlAllowHeaders: {
            Quantity: 4,
            Items: ['Authorization', 'Content-Type', 'X-Tenant-ID', 'X-Request-ID'],
          },
          AccessControlAllowCredentials: true,
          AccessControlMaxAgeSec: 86400,
          OriginOverride: true,
        },
      },
    };

    const result = await this.cloudfront.createResponseHeadersPolicy(policy).promise();
    return result.ResponseHeadersPolicy!.Id!;
  }

  /**
   * Invalidate CDN cache
   */
  async invalidateCache(paths: string[]) {
    const params: CloudFront.CreateInvalidationRequest = {
      DistributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID!,
      InvalidationBatch: {
        CallerReference: Date.now().toString(),
        Paths: {
          Quantity: paths.length,
          Items: paths,
        },
      },
    };

    return await this.cloudfront.createInvalidation(params).promise();
  }
}

// ===========================
// 2. Load Balancing Configuration
// ===========================

export class LoadBalancerOptimizer {
  /**
   * NGINX configuration for optimal load balancing
   */
  static getNginxConfig(): string {
    return `
# Upstream configuration with health checks
upstream api_backend {
    least_conn; # Use least connections algorithm

    # Backend servers with weights
    server api1.candlefish.ai:3000 weight=3 max_fails=2 fail_timeout=30s;
    server api2.candlefish.ai:3000 weight=3 max_fails=2 fail_timeout=30s;
    server api3.candlefish.ai:3000 weight=2 max_fails=2 fail_timeout=30s;
    server api4.candlefish.ai:3000 weight=2 max_fails=2 fail_timeout=30s;

    # Backup servers
    server backup1.candlefish.ai:3000 backup;
    server backup2.candlefish.ai:3000 backup;

    # Keep alive connections
    keepalive 100;
    keepalive_timeout 60s;
    keepalive_requests 100;
}

# WebSocket upstream
upstream ws_backend {
    ip_hash; # Sticky sessions for WebSocket

    server ws1.candlefish.ai:8080 max_fails=2 fail_timeout=30s;
    server ws2.candlefish.ai:8080 max_fails=2 fail_timeout=30s;
    server ws3.candlefish.ai:8080 max_fails=2 fail_timeout=30s;

    keepalive 50;
}

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/s;
limit_conn_zone $binary_remote_addr zone=conn_limit:10m;

# Response caching
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:100m max_size=10g inactive=60m use_temp_path=off;

server {
    listen 80;
    listen [::]:80;
    server_name api.candlefish.ai;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.candlefish.ai;

    # SSL configuration
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_stapling on;
    ssl_stapling_verify on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml application/atom+xml image/svg+xml text/javascript application/x-javascript application/x-font-ttf application/vnd.ms-fontobject font/opentype;

    # Brotli compression
    brotli on;
    brotli_comp_level 6;
    brotli_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml application/atom+xml image/svg+xml text/javascript application/x-javascript application/x-font-ttf application/vnd.ms-fontobject font/opentype;

    # API endpoints
    location /api/ {
        # Rate limiting
        limit_req zone=api_limit burst=50 nodelay;
        limit_conn conn_limit 100;

        # Proxy settings
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";

        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Request-ID $request_id;

        # Timeouts
        proxy_connect_timeout 5s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;

        # Buffering
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;

        # Cache configuration
        proxy_cache api_cache;
        proxy_cache_key "$scheme$request_method$host$request_uri$is_args$args";
        proxy_cache_valid 200 5m;
        proxy_cache_valid 404 1m;
        proxy_cache_bypass $http_authorization;
        proxy_no_cache $http_authorization;
        add_header X-Cache-Status $upstream_cache_status;
    }

    # GraphQL endpoint
    location /graphql {
        # Rate limiting for GraphQL
        limit_req zone=api_limit burst=20 nodelay;

        proxy_pass http://api_backend/graphql;
        proxy_http_version 1.1;

        # No caching for GraphQL
        proxy_cache_bypass 1;
        proxy_no_cache 1;

        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts for potentially long queries
        proxy_read_timeout 60s;
    }

    # WebSocket endpoint
    location /ws {
        proxy_pass http://ws_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # WebSocket timeouts
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy";
        add_header Content-Type text/plain;
    }

    # Metrics endpoint (internal only)
    location /metrics {
        allow 10.0.0.0/8;
        deny all;
        proxy_pass http://api_backend/metrics;
    }
}
`;
  }

  /**
   * HAProxy configuration for advanced load balancing
   */
  static getHAProxyConfig(): string {
    return `
global
    maxconn 50000
    log stdout local0
    tune.ssl.default-dh-param 2048
    ssl-default-bind-ciphers ECDHE+AESGCM:ECDHE+AES256:ECDHE+AES128
    ssl-default-bind-options no-sslv3 no-tlsv10 no-tlsv11

defaults
    mode http
    timeout connect 5s
    timeout client 30s
    timeout server 30s
    option httplog
    option dontlognull
    option http-server-close
    option forwardfor except 127.0.0.0/8
    option redispatch
    retries 3
    compression algo gzip
    compression type text/html text/plain text/css application/json application/javascript

# Statistics
stats enable
stats uri /haproxy-stats
stats refresh 30s

# Frontend configuration
frontend api_frontend
    bind *:80
    bind *:443 ssl crt /etc/haproxy/certs/
    redirect scheme https if !{ ssl_fc }

    # ACLs
    acl is_websocket hdr(Upgrade) -i WebSocket
    acl is_api path_beg /api/
    acl is_graphql path /graphql

    # Rate limiting
    stick-table type ip size 100k expire 30s store http_req_rate(10s)
    http-request track-sc0 src
    http-request deny if { sc_http_req_rate(0) gt 100 }

    # Use backend based on ACL
    use_backend websocket_backend if is_websocket
    use_backend graphql_backend if is_graphql
    use_backend api_backend if is_api
    default_backend api_backend

# API Backend
backend api_backend
    balance leastconn
    option httpchk GET /health

    # Circuit breaker
    option allbackups

    # Servers with health checks
    server api1 api1.candlefish.ai:3000 check weight 100 maxconn 1000
    server api2 api2.candlefish.ai:3000 check weight 100 maxconn 1000
    server api3 api3.candlefish.ai:3000 check weight 75 maxconn 750
    server api4 api4.candlefish.ai:3000 check weight 75 maxconn 750
    server backup1 backup1.candlefish.ai:3000 backup check weight 50 maxconn 500

    # Connection pooling
    http-reuse safe

# GraphQL Backend
backend graphql_backend
    balance roundrobin
    option httpchk GET /health

    server graphql1 graphql1.candlefish.ai:4000 check maxconn 500
    server graphql2 graphql2.candlefish.ai:4000 check maxconn 500

    # Longer timeout for GraphQL queries
    timeout server 60s

# WebSocket Backend
backend websocket_backend
    balance source
    option httpchk GET /health

    server ws1 ws1.candlefish.ai:8080 check maxconn 10000
    server ws2 ws2.candlefish.ai:8080 check maxconn 10000
    server ws3 ws3.candlefish.ai:8080 check maxconn 10000

    # WebSocket specific timeouts
    timeout tunnel 1h
`;
  }
}

// ===========================
// 3. Auto-scaling Configuration
// ===========================

export class AutoScalingManager {
  private k8sApi: k8s.AppsV1Api;
  private metricsApi: k8s.MetricsV1beta1Api;

  constructor() {
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();

    this.k8sApi = kc.makeApiClient(k8s.AppsV1Api);
    this.metricsApi = kc.makeApiClient(k8s.MetricsV1beta1Api);
  }

  /**
   * Create Horizontal Pod Autoscaler
   */
  async createHPA(namespace: string, deployment: string) {
    const hpa = {
      apiVersion: 'autoscaling/v2',
      kind: 'HorizontalPodAutoscaler',
      metadata: {
        name: `${deployment}-hpa`,
        namespace,
      },
      spec: {
        scaleTargetRef: {
          apiVersion: 'apps/v1',
          kind: 'Deployment',
          name: deployment,
        },
        minReplicas: 3,
        maxReplicas: 20,
        metrics: [
          {
            type: 'Resource',
            resource: {
              name: 'cpu',
              target: {
                type: 'Utilization',
                averageUtilization: 70,
              },
            },
          },
          {
            type: 'Resource',
            resource: {
              name: 'memory',
              target: {
                type: 'Utilization',
                averageUtilization: 80,
              },
            },
          },
          {
            type: 'Pods',
            pods: {
              metric: {
                name: 'http_requests_per_second',
              },
              target: {
                type: 'AverageValue',
                averageValue: '1000',
              },
            },
          },
          {
            type: 'External',
            external: {
              metric: {
                name: 'queue_messages',
                selector: {
                  matchLabels: {
                    queue: 'processing',
                  },
                },
              },
              target: {
                type: 'Value',
                value: '100',
              },
            },
          },
        ],
        behavior: {
          scaleDown: {
            stabilizationWindowSeconds: 300,
            policies: [
              {
                type: 'Percent',
                value: 50,
                periodSeconds: 60,
              },
              {
                type: 'Pods',
                value: 2,
                periodSeconds: 60,
              },
            ],
          },
          scaleUp: {
            stabilizationWindowSeconds: 60,
            policies: [
              {
                type: 'Percent',
                value: 100,
                periodSeconds: 30,
              },
              {
                type: 'Pods',
                value: 4,
                periodSeconds: 30,
              },
            ],
          },
        },
      },
    };

    // Apply HPA using kubectl or k8s client
    return hpa;
  }

  /**
   * Create Vertical Pod Autoscaler
   */
  async createVPA(namespace: string, deployment: string) {
    const vpa = {
      apiVersion: 'autoscaling.k8s.io/v1',
      kind: 'VerticalPodAutoscaler',
      metadata: {
        name: `${deployment}-vpa`,
        namespace,
      },
      spec: {
        targetRef: {
          apiVersion: 'apps/v1',
          kind: 'Deployment',
          name: deployment,
        },
        updatePolicy: {
          updateMode: 'Auto',
        },
        resourcePolicy: {
          containerPolicies: [
            {
              containerName: '*',
              minAllowed: {
                cpu: '100m',
                memory: '128Mi',
              },
              maxAllowed: {
                cpu: '2',
                memory: '4Gi',
              },
              controlledResources: ['cpu', 'memory'],
            },
          ],
        },
      },
    };

    return vpa;
  }

  /**
   * AWS Auto Scaling configuration
   */
  static getAWSAutoScalingConfig() {
    return {
      AutoScalingGroupName: 'candlefish-api-asg',
      MinSize: 3,
      MaxSize: 20,
      DesiredCapacity: 6,
      DefaultCooldown: 300,
      HealthCheckType: 'ELB',
      HealthCheckGracePeriod: 300,

      // Launch template
      LaunchTemplate: {
        LaunchTemplateId: 'lt-candlefish-api',
        Version: '$Latest',
      },

      // Target group ARNs for ALB
      TargetGroupARNs: [
        process.env.TARGET_GROUP_ARN!,
      ],

      // Scaling policies
      ScalingPolicies: [
        {
          PolicyName: 'cpu-scaling-policy',
          PolicyType: 'TargetTrackingScaling',
          TargetTrackingConfiguration: {
            PredefinedMetricSpecification: {
              PredefinedMetricType: 'ASGAverageCPUUtilization',
            },
            TargetValue: 70.0,
            ScaleInCooldown: 300,
            ScaleOutCooldown: 60,
          },
        },
        {
          PolicyName: 'request-count-scaling',
          PolicyType: 'TargetTrackingScaling',
          TargetTrackingConfiguration: {
            PredefinedMetricSpecification: {
              PredefinedMetricType: 'ALBRequestCountPerTarget',
              ResourceLabel: process.env.ALB_RESOURCE_LABEL,
            },
            TargetValue: 1000.0,
          },
        },
        {
          PolicyName: 'custom-metric-scaling',
          PolicyType: 'StepScaling',
          MetricAggregationType: 'Average',
          StepAdjustments: [
            {
              MetricIntervalLowerBound: 0,
              MetricIntervalUpperBound: 10,
              ScalingAdjustment: 1,
            },
            {
              MetricIntervalLowerBound: 10,
              MetricIntervalUpperBound: 20,
              ScalingAdjustment: 2,
            },
            {
              MetricIntervalLowerBound: 20,
              ScalingAdjustment: 4,
            },
          ],
        },
      ],

      // Notifications
      NotificationConfigurations: [
        {
          TopicARN: process.env.SNS_TOPIC_ARN,
          NotificationTypes: [
            'autoscaling:EC2_INSTANCE_LAUNCH',
            'autoscaling:EC2_INSTANCE_TERMINATE',
            'autoscaling:EC2_INSTANCE_LAUNCH_ERROR',
            'autoscaling:EC2_INSTANCE_TERMINATE_ERROR',
          ],
        },
      ],

      // Tags
      Tags: [
        {
          Key: 'Environment',
          Value: 'production',
          PropagateAtLaunch: true,
        },
        {
          Key: 'Application',
          Value: 'candlefish-api',
          PropagateAtLaunch: true,
        },
      ],
    };
  }
}

// ===========================
// 4. Database Optimization
// ===========================

export class DatabaseOptimizer {
  /**
   * PostgreSQL performance tuning configuration
   */
  static getPostgreSQLConfig() {
    return `
# Memory Configuration
shared_buffers = 8GB              # 25% of total RAM
effective_cache_size = 24GB       # 75% of total RAM
maintenance_work_mem = 2GB
work_mem = 32MB
wal_buffers = 64MB

# Connection Pooling
max_connections = 200
superuser_reserved_connections = 3

# Checkpoint Configuration
checkpoint_completion_target = 0.9
checkpoint_timeout = 15min
max_wal_size = 16GB
min_wal_size = 2GB

# Query Planner
random_page_cost = 1.1            # SSD storage
effective_io_concurrency = 200   # SSD storage
default_statistics_target = 100

# Parallel Query Execution
max_worker_processes = 8
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
max_parallel_maintenance_workers = 4

# Logging
log_min_duration_statement = 100ms
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on
log_temp_files = 0
log_autovacuum_min_duration = 0

# Autovacuum
autovacuum = on
autovacuum_max_workers = 4
autovacuum_naptime = 10s
autovacuum_vacuum_threshold = 50
autovacuum_analyze_threshold = 50
autovacuum_vacuum_scale_factor = 0.02
autovacuum_analyze_scale_factor = 0.01

# Performance Monitoring
shared_preload_libraries = 'pg_stat_statements,auto_explain'
pg_stat_statements.max = 10000
pg_stat_statements.track = all
auto_explain.log_min_duration = 100ms
auto_explain.log_analyze = true
auto_explain.log_buffers = true
`;
  }

  /**
   * Create optimized indexes
   */
  static getIndexCreationScript() {
    return `
-- B-tree indexes for exact lookups
CREATE INDEX CONCURRENTLY idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY idx_users_organization ON users(organization_id, created_at DESC) WHERE deleted_at IS NULL;

-- Composite indexes for common queries
CREATE INDEX CONCURRENTLY idx_dashboards_org_user ON dashboards(organization_id, created_by, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY idx_widgets_dashboard_type ON widgets(dashboard_id, widget_type) WHERE deleted_at IS NULL;

-- Partial indexes for filtered queries
CREATE INDEX CONCURRENTLY idx_dashboards_public ON dashboards(public_token) WHERE is_public = true AND deleted_at IS NULL;
CREATE INDEX CONCURRENTLY idx_widgets_error ON widgets(dashboard_id, updated_at DESC) WHERE status = 'ERROR';

-- BRIN indexes for time-series data
CREATE INDEX idx_metrics_timestamp_brin ON metrics USING BRIN(timestamp);
CREATE INDEX idx_events_created_brin ON events USING BRIN(created_at);

-- GIN indexes for JSONB columns
CREATE INDEX idx_dashboard_config_gin ON dashboards USING GIN(config);
CREATE INDEX idx_widget_data_gin ON widgets USING GIN(data);

-- GiST indexes for range queries
CREATE INDEX idx_metrics_time_range ON metrics USING GIST(tsrange(timestamp, timestamp + interval '1 hour'));

-- Covering indexes for read-heavy queries
CREATE INDEX idx_dashboards_covering ON dashboards(id) INCLUDE (name, config, created_by, updated_at) WHERE deleted_at IS NULL;

-- Expression indexes
CREATE INDEX idx_users_lower_email ON users(LOWER(email));
CREATE INDEX idx_dashboards_month ON dashboards(DATE_TRUNC('month', created_at));

-- Analyze tables after index creation
ANALYZE users;
ANALYZE dashboards;
ANALYZE widgets;
ANALYZE metrics;
`;
  }
}

// ===========================
// 5. Monitoring and Alerting
// ===========================

export class MonitoringSetup {
  private elasticsearch: ElasticsearchClient;

  constructor() {
    this.elasticsearch = new ElasticsearchClient({
      node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
    });
  }

  /**
   * Prometheus configuration for metrics collection
   */
  static getPrometheusConfig() {
    return `
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    environment: 'production'
    cluster: 'main'

# Alerting configuration
alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

# Rules files
rule_files:
  - '/etc/prometheus/rules/*.yml'

# Scrape configurations
scrape_configs:
  # Node exporter
  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']

  # Application metrics
  - job_name: 'api'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['api:3000']

  # PostgreSQL exporter
  - job_name: 'postgresql'
    static_configs:
      - targets: ['postgres-exporter:9187']

  # Redis exporter
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

  # Kubernetes metrics
  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
`;
  }

  /**
   * Grafana dashboard configuration
   */
  static getGrafanaDashboard() {
    return {
      dashboard: {
        title: 'Candlefish Analytics Performance',
        panels: [
          {
            title: 'API Response Time',
            type: 'graph',
            targets: [
              {
                expr: 'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))',
                legendFormat: 'p95',
              },
              {
                expr: 'histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))',
                legendFormat: 'p99',
              },
            ],
          },
          {
            title: 'Request Rate',
            type: 'graph',
            targets: [
              {
                expr: 'rate(http_requests_total[5m])',
                legendFormat: '{{method}} {{endpoint}}',
              },
            ],
          },
          {
            title: 'Error Rate',
            type: 'graph',
            targets: [
              {
                expr: 'rate(http_requests_total{status=~"5.."}[5m])',
                legendFormat: '5xx errors',
              },
              {
                expr: 'rate(http_requests_total{status=~"4.."}[5m])',
                legendFormat: '4xx errors',
              },
            ],
          },
          {
            title: 'Database Performance',
            type: 'graph',
            targets: [
              {
                expr: 'pg_stat_database_tup_fetched',
                legendFormat: 'Rows fetched',
              },
              {
                expr: 'pg_stat_database_tup_inserted',
                legendFormat: 'Rows inserted',
              },
            ],
          },
          {
            title: 'Cache Hit Rate',
            type: 'stat',
            targets: [
              {
                expr: 'redis_keyspace_hits_total / (redis_keyspace_hits_total + redis_keyspace_misses_total)',
                legendFormat: 'Hit Rate',
              },
            ],
          },
        ],
      },
    };
  }

  /**
   * Alert rules configuration
   */
  static getAlertRules() {
    return `
groups:
  - name: api_alerts
    interval: 30s
    rules:
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High API response time"
          description: "95th percentile response time is above 500ms"

      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate"
          description: "5xx error rate is above 5%"

      - alert: DatabaseConnectionPoolExhausted
        expr: pg_stat_database_numbackends / pg_settings_max_connections > 0.9
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Database connection pool nearly exhausted"
          description: "Using more than 90% of available connections"

      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is above 90%"

      - alert: DiskSpaceLow
        expr: node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"} < 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Low disk space"
          description: "Less than 10% disk space remaining"
`;
  }
}

export default {
  CDNOptimizer,
  LoadBalancerOptimizer,
  AutoScalingManager,
  DatabaseOptimizer,
  MonitoringSetup,
};

/**
 * GraphQL Security Hardening for Production
 * Implements query depth limiting, complexity analysis, and rate limiting
 */

import { ApolloServer, ApolloServerPlugin } from 'apollo-server-express';
import { GraphQLSchema, ValidationContext, GraphQLError } from 'graphql';
import depthLimit from 'graphql-depth-limit';
import costAnalysis from 'graphql-cost-analysis';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import * as Redis from 'ioredis';
import { shield, rule, allow, deny } from 'graphql-shield';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { applyMiddleware } from 'graphql-middleware';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD
});

/**
 * Production security configuration
 */
export const SECURITY_CONFIG = {
  introspection: {
    enabled: process.env.NODE_ENV !== 'production'
  },
  queryDepth: {
    max: 7  // Maximum query depth
  },
  complexity: {
    max: 1000,  // Maximum complexity score
    scalarCost: 1,
    objectCost: 2,
    listFactor: 10,
    introspectionCost: 1000,
    ignoreIntrospection: true
  },
  rateLimit: {
    query: {
      points: 100,  // Number of queries
      duration: 60  // Per minute
    },
    mutation: {
      points: 20,   // Number of mutations
      duration: 60  // Per minute
    },
    subscription: {
      points: 5,    // Number of concurrent subscriptions
      duration: 0   // Persistent limit
    }
  },
  fieldLevelAuth: true,
  queryWhitelist: process.env.NODE_ENV === 'production',
  timeout: 30000  // 30 seconds
};

/**
 * Query complexity analyzer plugin
 */
class ComplexityAnalyzerPlugin implements ApolloServerPlugin {
  private complexityConfig = SECURITY_CONFIG.complexity;

  async requestDidStart() {
    return {
      willSendResponse: async (requestContext) => {
        // Log complexity for monitoring
        const complexity = (requestContext as any).complexity;
        if (complexity) {
          console.log(`Query complexity: ${complexity}`);

          // Send to monitoring
          if (process.env.DATADOG_API_KEY) {
            // Send to DataDog or other monitoring service
          }
        }
      },

      validationDidStart: async () => ({
        willValidateField: async (validationContext: ValidationContext) => {
          // Field-level validation hooks
        }
      })
    };
  }
}

/**
 * Rate limiting by operation type
 */
class RateLimiterPlugin implements ApolloServerPlugin {
  private queryLimiter: RateLimiterRedis;
  private mutationLimiter: RateLimiterRedis;
  private subscriptionLimiter: RateLimiterRedis;

  constructor() {
    this.queryLimiter = new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: 'rl:query:',
      points: SECURITY_CONFIG.rateLimit.query.points,
      duration: SECURITY_CONFIG.rateLimit.query.duration
    });

    this.mutationLimiter = new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: 'rl:mutation:',
      points: SECURITY_CONFIG.rateLimit.mutation.points,
      duration: SECURITY_CONFIG.rateLimit.mutation.duration
    });

    this.subscriptionLimiter = new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: 'rl:subscription:',
      points: SECURITY_CONFIG.rateLimit.subscription.points,
      duration: SECURITY_CONFIG.rateLimit.subscription.duration || 86400
    });
  }

  async requestDidStart() {
    return {
      willSendResponse: async (requestContext) => {
        const { request, context } = requestContext;
        const userId = context.user?.id || request.http?.ip || 'anonymous';

        // Determine operation type
        const operation = request.operationName || 'unknown';
        const query = request.query || '';

        let limiter: RateLimiterRedis;

        if (query.includes('mutation')) {
          limiter = this.mutationLimiter;
        } else if (query.includes('subscription')) {
          limiter = this.subscriptionLimiter;
        } else {
          limiter = this.queryLimiter;
        }

        try {
          await limiter.consume(userId);
        } catch (rateLimiterRes) {
          throw new GraphQLError('Too many requests. Please try again later.', {
            extensions: {
              code: 'RATE_LIMITED',
              retryAfter: Math.round(rateLimiterRes.msBeforeNext / 1000) || 60
            }
          });
        }
      }
    };
  }
}

/**
 * Query whitelist for production
 */
class QueryWhitelistPlugin implements ApolloServerPlugin {
  private whitelist: Set<string>;

  constructor() {
    // Load whitelisted queries from database or config
    this.whitelist = new Set([
      // Add hashes of allowed queries
      'query GetUser { user { id name email } }',
      'query GetDocuments { documents { id title content } }',
      // ... more whitelisted queries
    ]);
  }

  async requestDidStart() {
    return {
      willSendResponse: async (requestContext) => {
        if (SECURITY_CONFIG.queryWhitelist) {
          const query = requestContext.request.query;

          if (query && !this.whitelist.has(this.hashQuery(query))) {
            throw new GraphQLError('Query not whitelisted', {
              extensions: {
                code: 'QUERY_NOT_WHITELISTED'
              }
            });
          }
        }
      }
    };
  }

  private hashQuery(query: string): string {
    // Normalize and hash query for comparison
    const crypto = require('crypto');
    const normalized = query.replace(/\s+/g, ' ').trim();
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }
}

/**
 * Field-level authorization rules
 */
const authorizationRules = shield(
  {
    Query: {
      // Public queries
      healthCheck: allow,
      publicDocuments: allow,

      // Authenticated queries
      user: rule({ cache: 'contextual' })(
        async (parent, args, context) => {
          return !!context.user;
        }
      ),

      // Admin only queries
      allUsers: rule({ cache: 'contextual' })(
        async (parent, args, context) => {
          return context.user?.roles?.includes('admin');
        }
      ),

      // Deny introspection in production
      __schema: process.env.NODE_ENV === 'production' ? deny : allow,
      __type: process.env.NODE_ENV === 'production' ? deny : allow
    },

    Mutation: {
      // All mutations require authentication
      '*': rule({ cache: 'contextual' })(
        async (parent, args, context) => {
          return !!context.user;
        }
      ),

      // Admin mutations
      deleteUser: rule({ cache: 'contextual' })(
        async (parent, args, context) => {
          return context.user?.roles?.includes('admin');
        }
      )
    },

    Subscription: {
      // Subscriptions require authentication
      '*': rule({ cache: 'contextual' })(
        async (parent, args, context) => {
          return !!context.user;
        }
      )
    },

    // Field-level permissions
    User: {
      email: rule({ cache: 'strict' })(
        async (parent, args, context) => {
          // Users can only see their own email
          return parent.id === context.user?.id || context.user?.roles?.includes('admin');
        }
      ),

      sensitiveData: rule({ cache: 'strict' })(
        async (parent, args, context) => {
          // Only admins can see sensitive data
          return context.user?.roles?.includes('admin');
        }
      )
    }
  },
  {
    fallbackRule: allow,
    allowExternalErrors: true,
    debug: process.env.NODE_ENV !== 'production'
  }
);

/**
 * Security headers middleware
 */
export const securityHeaders = (req: any, res: any, next: any) => {
  // Prevent information leakage
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');

  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline';");
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  next();
};

/**
 * Create secure Apollo Server instance
 */
export function createSecureApolloServer(schema: GraphQLSchema): ApolloServer {
  // Apply security middleware to schema
  const securedSchema = applyMiddleware(schema, authorizationRules);

  const server = new ApolloServer({
    schema: securedSchema,

    // Disable introspection in production
    introspection: SECURITY_CONFIG.introspection.enabled,

    // Disable GraphQL playground in production
    playground: process.env.NODE_ENV !== 'production',

    // Security plugins
    plugins: [
      new ComplexityAnalyzerPlugin(),
      new RateLimiterPlugin(),
      new QueryWhitelistPlugin()
    ],

    // Validation rules
    validationRules: [
      depthLimit(SECURITY_CONFIG.queryDepth.max),
      costAnalysis({
        maximumCost: SECURITY_CONFIG.complexity.max,
        defaultCost: SECURITY_CONFIG.complexity.objectCost,
        scalarCost: SECURITY_CONFIG.complexity.scalarCost,
        listFactor: SECURITY_CONFIG.complexity.listFactor,
        introspectionCost: SECURITY_CONFIG.complexity.introspectionCost,
        ignoreIntrospection: SECURITY_CONFIG.complexity.ignoreIntrospection,

        onComplete: (cost: number) => {
          console.log(`Query cost: ${cost}`);
        }
      })
    ],

    // Format errors to avoid information leakage
    formatError: (error: GraphQLError) => {
      // Log full error internally
      console.error('GraphQL Error:', error);

      // Return sanitized error to client
      if (process.env.NODE_ENV === 'production') {
        // Generic error message in production
        if (error.extensions?.code === 'INTERNAL_SERVER_ERROR') {
          return new GraphQLError('An error occurred processing your request', {
            extensions: {
              code: 'INTERNAL_ERROR'
            }
          });
        }
      }

      return error;
    },

    // Context with timeout
    context: async ({ req, res }) => {
      // Set request timeout
      const timeout = setTimeout(() => {
        throw new GraphQLError('Request timeout', {
          extensions: {
            code: 'REQUEST_TIMEOUT'
          }
        });
      }, SECURITY_CONFIG.timeout);

      // Clear timeout when response is sent
      res.on('finish', () => clearTimeout(timeout));

      return {
        req,
        res,
        user: (req as any).user,
        dataSources: {}  // Add your data sources here
      };
    },

    // Cache control
    cacheControl: {
      defaultMaxAge: 0,  // No caching by default
      calculateHttpHeaders: true
    },

    // CORS configuration
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://candlefish.ai'],
      credentials: true
    }
  });

  return server;
}

/**
 * Query sanitization utilities
 */
export class QuerySanitizer {
  /**
   * Remove dangerous patterns from user input
   */
  static sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      // Remove potential SQL injection patterns
      input = input.replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE)\b)/gi, '');

      // Remove potential NoSQL injection patterns
      input = input.replace(/(\$|\{|\}|\[|\])/g, '');

      // Remove potential script tags
      input = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

      // Limit string length
      if (input.length > 10000) {
        input = input.substring(0, 10000);
      }
    } else if (typeof input === 'object' && input !== null) {
      // Recursively sanitize object properties
      for (const key in input) {
        input[key] = this.sanitizeInput(input[key]);
      }
    } else if (Array.isArray(input)) {
      // Sanitize array elements
      input = input.map(item => this.sanitizeInput(item));
    }

    return input;
  }

  /**
   * Validate query structure
   */
  static validateQuery(query: string): boolean {
    // Check for malicious patterns
    const dangerousPatterns = [
      /__proto__/,
      /constructor/,
      /prototype/,
      /\beval\b/,
      /\bFunction\b/,
      /setTimeout/,
      /setInterval/
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(query)) {
        console.warn(`Dangerous pattern detected in query: ${pattern}`);
        return false;
      }
    }

    return true;
  }
}

/**
 * Monitoring and alerting for security events
 */
export class SecurityMonitor {
  private static instance: SecurityMonitor;
  private eventLog: any[] = [];

  static getInstance(): SecurityMonitor {
    if (!this.instance) {
      this.instance = new SecurityMonitor();
    }
    return this.instance;
  }

  logSecurityEvent(event: {
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    userId?: string;
    ip?: string;
    details: any;
  }): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      ...event,
      timestamp
    };

    this.eventLog.push(logEntry);

    // Send to monitoring service
    if (event.severity === 'high' || event.severity === 'critical') {
      this.sendAlert(logEntry);
    }

    // Store in database for audit
    this.storeAuditLog(logEntry);
  }

  private async sendAlert(event: any): Promise<void> {
    // Send to PagerDuty, Slack, etc.
    console.error('🚨 Security Alert:', event);

    // Example: Send to Slack
    if (process.env.SLACK_WEBHOOK_URL) {
      // await fetch(process.env.SLACK_WEBHOOK_URL, {
      //   method: 'POST',
      //   body: JSON.stringify({
      //     text: `Security Alert: ${event.type}`,
      //     attachments: [{
      //       color: 'danger',
      //       fields: [
      //         { title: 'Severity', value: event.severity },
      //         { title: 'User', value: event.userId || 'Unknown' },
      //         { title: 'Details', value: JSON.stringify(event.details) }
      //       ]
      //     }]
      //   })
      // });
    }
  }

  private async storeAuditLog(event: any): Promise<void> {
    // Store in database
    await redis.lpush('security:audit:log', JSON.stringify(event));

    // Trim to keep last 10000 events
    await redis.ltrim('security:audit:log', 0, 9999);
  }
}

// Export singleton monitor
export const securityMonitor = SecurityMonitor.getInstance();

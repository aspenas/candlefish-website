/**
 * Apollo GraphQL Server for Tyler Setup
 * Optimized for serverless Lambda with connection pooling and caching
 */

import { ApolloServer } from '@apollo/server';
import { startServerAndCreateLambdaHandler } from '@as-integrations/aws-lambda';
import { ApolloServerPluginCacheControl } from '@apollo/server/plugin/cacheControl';
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { applyMiddleware } from 'graphql-middleware';
import { shield, rule, and, or, not } from 'graphql-shield';
import depthLimit from 'graphql-depth-limit';
import costAnalysis from 'graphql-cost-analysis';

import { typeDefs } from './typeDefs.js';
import resolvers from './resolvers/index.js';
import { createDataLoaderContext } from '../database/connection-pool.js';
import { getCacheManager } from '../database/cache-layer.js';
import { validateAuth, logAudit, handleError } from '../utils/helpers.js';
import { rateLimitDirective } from './directives/rateLimitDirective.js';
import { complexityDirective } from './directives/complexityDirective.js';
import { requireAuthDirective } from './directives/requireAuthDirective.js';

// Performance monitoring
const queryMetrics = {
  totalQueries: 0,
  totalExecutionTime: 0,
  slowQueries: [],
  errors: 0,
};

/**
 * Authentication rules for GraphQL Shield
 */
const rules = {
  isAuthenticated: rule({ cache: 'contextual' })(
    async (parent, args, context) => {
      return !!context.user;
    }
  ),

  isAdmin: rule({ cache: 'contextual' })(
    async (parent, args, context) => {
      return context.user?.role === 'admin';
    }
  ),

  isUser: rule({ cache: 'contextual' })(
    async (parent, args, context) => {
      return context.user?.role === 'user' || context.user?.role === 'admin';
    }
  ),

  isContractor: rule({ cache: 'contextual' })(
    async (parent, args, context) => {
      return context.user?.type === 'contractor';
    }
  ),

  canReadSecrets: rule({ cache: 'contextual' })(
    async (parent, args, context) => {
      if (context.user?.role === 'admin') return true;
      if (context.user?.type === 'contractor') {
        // Contractors can only read allowed secrets
        return context.user.allowedSecrets?.includes(args.name);
      }
      return context.user?.role === 'user';
    }
  ),

  canModifySecrets: rule({ cache: 'contextual' })(
    async (parent, args, context) => {
      // Only employees can modify secrets, not contractors
      return context.user?.type === 'employee' &&
             (context.user?.role === 'admin' || context.user?.role === 'user');
    }
  ),
};

/**
 * Permission shield for GraphQL operations
 */
const permissions = shield({
  Query: {
    // Public queries
    health: not(rules.isAuthenticated), // Allow health checks without auth

    // Authenticated queries
    me: rules.isAuthenticated,
    node: rules.isAuthenticated,

    // Admin only queries
    users: rules.isAdmin,
    user: rules.isAdmin,
    contractors: rules.isAdmin,
    contractor: rules.isAdmin,
    auditLogs: rules.isAdmin,
    performanceMetrics: rules.isAdmin,

    // Role-based queries
    secrets: or(rules.canReadSecrets, rules.isContractor),
    secret: or(rules.canReadSecrets, rules.isContractor),
    configs: rules.isUser,
    config: rules.isUser,
  },

  Mutation: {
    // Authentication mutations (public)
    login: not(rules.isAuthenticated),
    accessWithToken: not(rules.isAuthenticated),

    // Authenticated mutations
    refreshToken: rules.isAuthenticated,
    logout: rules.isAuthenticated,

    // Admin only mutations
    createUser: rules.isAdmin,
    updateUser: rules.isAdmin,
    deleteUser: rules.isAdmin,
    inviteContractor: rules.isAdmin,
    revokeContractorAccess: rules.isAdmin,
    updateConfig: rules.isAdmin,
    clearCache: rules.isAdmin,
    warmupCache: rules.isAdmin,

    // Role-based mutations
    createSecret: rules.canModifySecrets,
    updateSecret: rules.canModifySecrets,
    deleteSecret: rules.canModifySecrets,
  },

  Subscription: {
    // All subscriptions require authentication
    '*': rules.isAuthenticated,

    // Admin only subscriptions
    auditLogAdded: rules.isAdmin,
    performanceAlert: rules.isAdmin,

    // Role-based subscriptions
    secretChanged: or(rules.canReadSecrets, rules.isContractor),
  },
}, {
  allowExternalErrors: true,
  fallbackError: 'Access denied',
});

/**
 * Create GraphQL context with authentication and data loaders
 */
async function createContext({ event, context: lambdaContext }) {
  const startTime = Date.now();

  try {
    // Extract user from authentication
    let user = null;
    if (event.headers?.Authorization || event.headers?.authorization) {
      try {
        user = await validateAuth(event);
      } catch (error) {
        console.warn('Authentication failed:', error.message);
        // Don't throw here, let the shield handle unauthorized access
      }
    }

    // Create data loader context for efficient batching
    const dataLoaderContext = createDataLoaderContext();

    // Get cache manager for multi-layer caching
    const cacheManager = getCacheManager();

    return {
      // Authentication
      user,
      event,
      lambdaContext,

      // Data access
      ...dataLoaderContext,
      cache: cacheManager,

      // Performance tracking
      startTime,
      metrics: queryMetrics,

      // Utilities
      logAudit: (data) => logAudit({ ...data, userId: user?.id }),
    };
  } catch (error) {
    console.error('Context creation failed:', error);
    throw new Error('Failed to create GraphQL context');
  }
}

/**
 * Performance monitoring plugin
 */
const performancePlugin = {
  requestDidStart() {
    return {
      didResolveOperation(requestContext) {
        queryMetrics.totalQueries++;
      },

      didEncounterErrors(requestContext) {
        queryMetrics.errors++;
        const errors = requestContext.errors;

        // Log GraphQL errors for monitoring
        errors.forEach(error => {
          console.error('GraphQL Error:', {
            message: error.message,
            path: error.path,
            operation: requestContext.request.operationName,
            variables: requestContext.request.variables,
          });
        });
      },

      willSendResponse(requestContext) {
        const executionTime = Date.now() - requestContext.context.startTime;
        queryMetrics.totalExecutionTime += executionTime;

        // Track slow queries (>1000ms)
        if (executionTime > 1000) {
          queryMetrics.slowQueries.push({
            operation: requestContext.request.operationName || 'anonymous',
            executionTime,
            timestamp: new Date().toISOString(),
            complexity: requestContext.request.extensions?.complexity || 0,
          });

          // Keep only last 100 slow queries
          if (queryMetrics.slowQueries.length > 100) {
            queryMetrics.slowQueries.shift();
          }
        }

        // Add performance headers
        if (requestContext.response.http) {
          requestContext.response.http.headers.set('x-execution-time', executionTime.toString());
          requestContext.response.http.headers.set('x-query-complexity',
            (requestContext.request.extensions?.complexity || 0).toString());
        }
      },
    };
  },
};

/**
 * Query complexity analysis configuration
 */
const complexityAnalysisConfig = {
  maximumComplexity: 1000,
  variables: {},
  createError: (max, actual) => {
    return new Error(
      `Query complexity ${actual} exceeds maximum allowed complexity ${max}`
    );
  },
  onComplete: (complexity) => {
    if (complexity > 500) {
      console.warn(`High complexity query executed: ${complexity}`);
    }
  },
};

/**
 * Create executable schema with middleware
 */
function createExecutableSchemaWithMiddleware() {
  // Create base schema
  const baseSchema = makeExecutableSchema({
    typeDefs,
    resolvers,
    schemaDirectives: {
      rateLimit: rateLimitDirective,
      complexity: complexityDirective,
      requireAuth: requireAuthDirective,
    },
  });

  // Apply permission middleware
  return applyMiddleware(baseSchema, permissions);
}

/**
 * Create Apollo Server instance
 */
const server = new ApolloServer({
  schema: createExecutableSchemaWithMiddleware(),

  // Plugins for optimization and security
  plugins: [
    // Cache control for HTTP caching
    ApolloServerPluginCacheControl({
      defaultMaxAge: 300, // 5 minutes default
      calculateHttpHeaders: true,
    }),

    // Disable Apollo Studio landing page in production
    process.env.NODE_ENV === 'production'
      ? ApolloServerPluginLandingPageDisabled()
      : undefined,

    // Performance monitoring
    performancePlugin,

    // Query depth limiting (max 10 levels)
    {
      requestDidStart() {
        return {
          didResolveOperation({ request, document }) {
            const depthLimitRule = depthLimit(10);
            const errors = depthLimitRule(document);
            if (errors && errors.length > 0) {
              throw new Error('Query depth limit exceeded');
            }
          },
        };
      },
    },

    // Query complexity analysis
    {
      requestDidStart() {
        return {
          didResolveOperation({ request, document }) {
            return costAnalysis({
              document,
              variables: request.variables,
              ...complexityAnalysisConfig,
            });
          },
        };
      },
    },
  ].filter(Boolean),

  // Context creation
  context: createContext,

  // Error formatting
  formatError: (error) => {
    // Log detailed error for debugging
    console.error('GraphQL Error Details:', {
      message: error.message,
      path: error.path,
      locations: error.locations,
      stack: error.stack,
    });

    // Return sanitized error to client
    return {
      message: error.message,
      path: error.path,
      locations: error.locations,
      extensions: {
        code: error.extensions?.code,
        timestamp: new Date().toISOString(),
      },
    };
  },

  // Request parsing options
  csrfPrevention: true,
  introspection: process.env.NODE_ENV !== 'production',

  // Cache hints
  cache: 'bounded',
});

/**
 * Lambda handler with connection pooling optimization
 */
export const handler = startServerAndCreateLambdaHandler(
  server,

  // Transform the Lambda event for Apollo Server
  {
    middleware: [
      // CORS middleware
      async (event) => {
        // Add CORS headers
        const headers = {
          'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, Apollo-Require-Preflight',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        };

        // Handle preflight requests
        if (event.httpMethod === 'OPTIONS') {
          return {
            statusCode: 200,
            headers,
            body: '',
          };
        }

        return event;
      },
    ],
  }
);

/**
 * Health check endpoint
 */
export const healthCheck = async () => {
  try {
    const cacheManager = getCacheManager();
    const dataLoaderContext = createDataLoaderContext();

    const health = await dataLoaderContext.pooledClient.healthCheck();
    const cacheStats = cacheManager.getStats();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        database: health,
        cache: cacheStats,
        performance: {
          totalQueries: queryMetrics.totalQueries,
          avgExecutionTime: queryMetrics.totalQueries > 0
            ? Math.round(queryMetrics.totalExecutionTime / queryMetrics.totalQueries)
            : 0,
          slowQueriesCount: queryMetrics.slowQueries.length,
          errorRate: queryMetrics.totalQueries > 0
            ? Math.round((queryMetrics.errors / queryMetrics.totalQueries) * 100) / 100
            : 0,
        },
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
    };
  }
};

/**
 * Export server instance for testing
 */
export { server, queryMetrics };

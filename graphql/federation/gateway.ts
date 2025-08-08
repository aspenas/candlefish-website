import { ApolloGateway, IntrospectAndCompose, RemoteGraphQLDataSource } from '@apollo/gateway';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import { execute, subscribe } from 'graphql';
import cors from 'cors';
import { json } from 'body-parser';
import { createRedisCache } from '@apollo/utils.keyvaluecache';
import Redis from 'ioredis';
import { AuthenticationError, ForbiddenError } from '@apollo/server/errors';
import jwt from 'jsonwebtoken';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { shield, rule, and, or, not } from 'graphql-shield';
import { GraphQLError } from 'graphql';
import { createComplexityLimitRule } from 'graphql-query-complexity';
import depthLimit from 'graphql-depth-limit';

// Service definitions for federation
const subgraphServices = [
  {
    name: 'auth-service',
    url: process.env.AUTH_SERVICE_URL || 'http://localhost:4001/graphql',
  },
  {
    name: 'organization-service',
    url: process.env.ORGANIZATION_SERVICE_URL || 'http://localhost:4002/graphql',
  },
  {
    name: 'analytics-service',
    url: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:4003/graphql',
  },
  {
    name: 'dashboard-service',
    url: process.env.DASHBOARD_SERVICE_URL || 'http://localhost:4004/graphql',
  },
  {
    name: 'notification-service',
    url: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4005/graphql',
  },
  {
    name: 'export-service',
    url: process.env.EXPORT_SERVICE_URL || 'http://localhost:4006/graphql',
  },
  {
    name: 'ingestion-service',
    url: process.env.INGESTION_SERVICE_URL || 'http://localhost:4007/graphql',
  },
];

// Redis setup for caching and rate limiting
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  retryDelayOnFailure: 50,
  maxRetriesPerRequest: 3,
});

// Rate limiter configuration
const rateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'gql_rate_limit',
  points: 100, // Number of requests
  duration: 60, // Per 60 seconds by IP
  blockDuration: 60, // Block for 60 seconds
});

// Authentication utilities
interface AuthContext {
  user?: {
    id: string;
    email: string;
    role: string;
    organizationId?: string;
    permissions: string[];
  };
  organizationId?: string;
  isAuthenticated: boolean;
}

const getUser = async (token?: string): Promise<AuthContext['user'] | null> => {
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    // You would typically fetch user details from database here
    // For now, return the JWT payload
    return {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      organizationId: decoded.organizationId,
      permissions: decoded.permissions || [],
    };
  } catch (error) {
    return null;
  }
};

// Authorization rules
const isAuthenticated = rule({ cache: 'contextual' })(
  async (parent, args, context: AuthContext) => {
    return context.isAuthenticated;
  }
);

const hasRole = (role: string) => rule({ cache: 'contextual' })(
  async (parent, args, context: AuthContext) => {
    return context.user?.role === role;
  }
);

const hasPermission = (permission: string) => rule({ cache: 'contextual' })(
  async (parent, args, context: AuthContext) => {
    return context.user?.permissions.includes(permission);
  }
);

const belongsToOrganization = rule({ cache: 'contextual' })(
  async (parent, args, context: AuthContext) => {
    // Multi-tenant check - user must belong to the organization
    return !!(context.user?.organizationId && context.organizationId === context.user.organizationId);
  }
);

// GraphQL Shield permissions
const permissions = shield({
  Query: {
    me: isAuthenticated,
    organizations: hasRole('SUPER_ADMIN'),
    organization: and(isAuthenticated, belongsToOrganization),
    dashboards: and(isAuthenticated, belongsToOrganization),
    dataSources: and(isAuthenticated, belongsToOrganization),
    metrics: and(isAuthenticated, belongsToOrganization),
    alerts: and(isAuthenticated, belongsToOrganization),
    auditLog: and(isAuthenticated, hasRole('ORG_ADMIN'), belongsToOrganization),
  },
  Mutation: {
    updateProfile: isAuthenticated,
    createOrganization: isAuthenticated,
    updateOrganization: and(isAuthenticated, hasRole('ORG_ADMIN'), belongsToOrganization),
    inviteUser: and(isAuthenticated, hasRole('ORG_ADMIN'), belongsToOrganization),
    createDashboard: and(isAuthenticated, belongsToOrganization),
    createDataSource: and(isAuthenticated, belongsToOrganization),
    createMetric: and(isAuthenticated, belongsToOrganization),
  },
  Subscription: {
    dashboardUpdated: and(isAuthenticated, belongsToOrganization),
    metricCalculated: and(isAuthenticated, belongsToOrganization),
    alertTriggered: and(isAuthenticated, belongsToOrganization),
    notificationReceived: and(isAuthenticated, belongsToOrganization),
  },
}, {
  allowExternalErrors: true,
  fallbackError: new ForbiddenError('Access denied'),
});

// Custom data source for authentication and tenant isolation
class AuthenticatedDataSource extends RemoteGraphQLDataSource {
  willSendRequest({ request, context }: { request: any; context: AuthContext }) {
    // Pass authentication headers to subgraphs
    if (context.user) {
      request.http.headers.set('x-user-id', context.user.id);
      request.http.headers.set('x-user-role', context.user.role);
      request.http.headers.set('x-organization-id', context.user.organizationId || '');
      request.http.headers.set('x-user-permissions', JSON.stringify(context.user.permissions));
    }

    // Add request ID for tracing
    request.http.headers.set('x-request-id', context.requestId);
  }

  didReceiveResponse({ response, request, context }: { response: any; request: any; context: AuthContext }) {
    // Log errors for monitoring
    if (response.errors?.length > 0) {
      console.error('Subgraph errors:', {
        service: this.url,
        errors: response.errors,
        requestId: context.requestId,
        userId: context.user?.id,
      });
    }

    return response;
  }
}

// Apollo Gateway configuration
const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({
    subgraphs: subgraphServices.map(service => ({
      name: service.name,
      url: service.url,
    })),
    pollIntervalInMs: 30000, // Poll every 30 seconds for schema changes
  }),
  buildService({ url }) {
    return new AuthenticatedDataSource({ url });
  },
  debug: process.env.NODE_ENV === 'development',
});

// Query complexity analysis
const createComplexityPlugin = () => {
  return {
    requestDidStart() {
      return {
        didResolveOperation({ request, document }) {
          const complexity = createComplexityLimitRule(1000, {
            maximumComplexity: 1000,
            variables: request.variables || {},
            introspection: true,
            scalarCost: 1,
            objectCost: 2,
            listFactor: 10,
            createError: (max, actual) => {
              return new GraphQLError(
                `Query complexity ${actual} exceeds maximum complexity ${max}`,
                { extensions: { code: 'QUERY_COMPLEXITY_TOO_HIGH' } }
              );
            },
          });
        },
      };
    },
  };
};

// Rate limiting plugin
const createRateLimitPlugin = () => {
  return {
    requestDidStart() {
      return {
        async willSendResponse({ request, response, context }) {
          const ip = request.http?.headers?.get('x-forwarded-for') ||
                    request.http?.headers?.get('x-real-ip') ||
                    'unknown';

          try {
            await rateLimiter.consume(ip);
          } catch (rateLimiterRes) {
            response.http.status = 429;
            response.errors = [
              new GraphQLError('Rate limit exceeded', {
                extensions: {
                  code: 'RATE_LIMITED',
                  retryAfter: rateLimiterRes.msBeforeNext
                }
              })
            ];
          }
        },
      };
    },
  };
};

// Create Express app
const app = express();
const httpServer = createServer(app);

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: subgraphServices.map(s => ({ name: s.name, url: s.url }))
  });
});

// Metrics endpoint for Prometheus
app.get('/metrics', (req, res) => {
  // Return Prometheus metrics
  res.set('Content-Type', 'text/plain');
  res.send('# Prometheus metrics would go here');
});

async function startServer() {
  // Create Apollo Server
  const server = new ApolloServer({
    gateway,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      ApolloServerPluginLandingPageLocalDefault({ embed: true }),
      createComplexityPlugin(),
      createRateLimitPlugin(),
      permissions,
    ],
    introspection: process.env.NODE_ENV === 'development',
    includeStacktraceInErrorResponses: process.env.NODE_ENV === 'development',
    cache: createRedisCache({ client: redis }),
    csrfPrevention: true,
    formatError: (error) => {
      // Log errors for monitoring
      console.error('GraphQL Error:', {
        message: error.message,
        code: error.extensions?.code,
        path: error.path,
        locations: error.locations,
        timestamp: new Date().toISOString(),
      });

      // Don't expose internal errors in production
      if (process.env.NODE_ENV === 'production' && !error.extensions?.code) {
        return new Error('Internal server error');
      }

      return error;
    },
  });

  await server.start();

  // Apply GraphQL middleware
  app.use(
    '/graphql',
    json({ limit: '10mb' }),
    expressMiddleware(server, {
      context: async ({ req }): Promise<AuthContext> => {
        // Extract JWT token
        const token = req.headers.authorization?.replace('Bearer ', '');

        // Get user from token
        const user = await getUser(token);

        // Extract organization ID from headers or user
        const organizationId = req.headers['x-organization-id'] as string ||
                              user?.organizationId;

        return {
          user,
          organizationId,
          isAuthenticated: !!user,
          requestId: req.headers['x-request-id'] as string ||
                    Math.random().toString(36).substr(2, 9),
        };
      },
    })
  );

  // WebSocket server for subscriptions
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  // Configure GraphQL subscriptions over WebSocket
  const serverCleanup = useServer(
    {
      schema: gateway.supergraphSdl, // This would need to be the executable schema
      context: async (ctx) => {
        // Extract token from connection params
        const token = ctx.connectionParams?.Authorization?.replace('Bearer ', '');
        const user = await getUser(token);

        return {
          user,
          organizationId: user?.organizationId,
          isAuthenticated: !!user,
        };
      },
      onConnect: async (ctx) => {
        console.log('WebSocket connected:', ctx.connectionParams);
        return true;
      },
      onDisconnect: (ctx) => {
        console.log('WebSocket disconnected');
      },
    },
    wsServer
  );

  // Start HTTP server
  const PORT = process.env.PORT || 4000;

  httpServer.listen(PORT, () => {
    console.log(`🚀 GraphQL Gateway ready at http://localhost:${PORT}/graphql`);
    console.log(`🚀 WebSocket subscriptions ready at ws://localhost:${PORT}/graphql`);
    console.log('🔗 Federated services:');
    subgraphServices.forEach(service => {
      console.log(`  - ${service.name}: ${service.url}`);
    });
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    serverCleanup.dispose();
    await server.stop();
    httpServer.close(() => {
      redis.disconnect();
      process.exit(0);
    });
  });
}

// Start the server
startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

export { gateway, startServer };

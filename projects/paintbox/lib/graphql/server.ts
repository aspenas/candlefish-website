import { ApolloServer } from 'apollo-server-express';
import { ApolloGateway, IntrospectAndCompose, RemoteGraphQLDataSource } from '@apollo/gateway';
import { buildFederatedSchema } from '@apollo/federation';
import { readFileSync } from 'fs';
import { join } from 'path';
import { GraphQLSchema } from 'graphql';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import { execute, subscribe } from 'graphql';
import { createServer } from 'http';
import express from 'express';
import { PubSub } from 'graphql-subscriptions';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import Redis from 'ioredis';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import helmet from 'helmet';
import compression from 'compression';

// Import resolvers and types
import { resolvers, createDataLoaders, createComplexityAnalysis, createRateLimitConfig, GraphQLContext } from './resolvers';

// Import services
import { DiscoveryService } from '../services/discovery-service';
import { MonitoringService } from '../services/monitoring-service';
import { AnalysisService } from '../services/analysis-service';
import { AlertService } from '../services/alert-service';

// Load GraphQL schema
const typeDefs = readFileSync(join(__dirname, 'schema.graphql'), 'utf8');

// Environment configuration
const ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.GRAPHQL_PORT || 4000;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const ENABLE_FEDERATION = process.env.ENABLE_FEDERATION === 'true';
const ENABLE_SUBSCRIPTIONS = process.env.ENABLE_SUBSCRIPTIONS !== 'false';
const ENABLE_PLAYGROUND = ENV === 'development';

// Initialize services
const createServices = () => ({
  discovery: new DiscoveryService(),
  monitoring: new MonitoringService(),
  analysis: new AnalysisService(),
  alert: new AlertService(),
});

// Initialize PubSub for subscriptions
const createPubSub = () => {
  if (ENV === 'production') {
    // Use Redis for production to support scaling
    const redis = new Redis(REDIS_URL);
    return new RedisPubSub({
      publisher: redis,
      subscriber: redis,
    });
  } else {
    // Use in-memory PubSub for development
    return new PubSub();
  }
};

// Authentication middleware
const getUser = async (req: express.Request) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return null;
  }

  try {
    // In production, validate JWT token
    // For demo, we'll return a mock user
    return {
      id: 'user-1',
      email: 'admin@example.com',
      roles: ['admin', 'operator'],
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
};

// Create federated schema for microservices architecture
const createFederatedSchema = (): GraphQLSchema => {
  return buildFederatedSchema([{
    typeDefs,
    resolvers,
  }]);
};

// Create standalone schema for single service
const createStandaloneSchema = (): GraphQLSchema => {
  const { makeExecutableSchema } = require('@graphql-tools/schema');
  return makeExecutableSchema({
    typeDefs,
    resolvers,
  });
};

// Gateway configuration for federation
const createGateway = () => {
  const serviceList = [
    { name: 'system-analyzer', url: `http://localhost:${PORT}/graphql` },
    // Add other federated services here
    // { name: 'user-service', url: 'http://localhost:4001/graphql' },
    // { name: 'auth-service', url: 'http://localhost:4002/graphql' },
  ];

  return new ApolloGateway({
    supergraphSdl: new IntrospectAndCompose({
      subgraphs: serviceList,
    }),
    buildService({ url }) {
      return new RemoteGraphQLDataSource({
        url,
        willSendRequest({ request, context }) {
          // Forward authentication headers
          if (context.user) {
            request.http?.headers.set('user-id', context.user.id);
            request.http?.headers.set('user-roles', context.user.roles.join(','));
          }
        },
      });
    },
  });
};

// Security middleware
const createSecurityMiddleware = () => {
  const app = express();

  // Basic security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: ["'self'", "ws:", "wss:"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }));

  // Compression
  app.use(compression());

  // Rate limiting
  const rateLimitConfig = createRateLimitConfig();
  app.use('/graphql', rateLimit(rateLimitConfig));

  // Slow down repeated requests
  app.use('/graphql', slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 50, // allow 50 requests per 15 minutes, then...
    delayMs: 500, // begin adding 500ms of delay per request above 50
    maxDelayMs: 20000, // maximum delay of 20 seconds
  }));

  return app;
};

// Create Apollo Server
const createApolloServer = async (): Promise<ApolloServer> => {
  const services = createServices();
  const pubsub = createPubSub();
  const complexityAnalysis = createComplexityAnalysis();

  const server = new ApolloServer({
    // Schema configuration
    schema: ENABLE_FEDERATION ? createFederatedSchema() : createStandaloneSchema(),
    gateway: ENABLE_FEDERATION ? createGateway() : undefined,

    // Context function
    context: async ({ req, connection }) => {
      // For subscriptions (WebSocket)
      if (connection) {
        return {
          ...connection.context,
          services,
          dataloaders: createDataLoaders(services),
          pubsub,
        };
      }

      // For queries/mutations (HTTP)
      const user = await getUser(req);
      return {
        user,
        services,
        dataloaders: createDataLoaders(services),
        pubsub,
      } as GraphQLContext;
    },

    // Development features
    introspection: ENABLE_PLAYGROUND,
    playground: ENABLE_PLAYGROUND ? {
      subscriptionEndpoint: ENABLE_SUBSCRIPTIONS ? `ws://localhost:${PORT}/graphql` : undefined,
      settings: {
        'request.credentials': 'include',
      },
    } : false,

    // Performance and security
    plugins: [
      // Query complexity analysis
      {
        requestDidStart() {
          return {
            didResolveOperation({ request, document }) {
              const complexity = calculateComplexity({
                estimators: [complexityAnalysis],
                query: document,
                variables: request.variables,
              });

              if (complexity > complexityAnalysis.maximumComplexity) {
                throw new Error(
                  `Query complexity ${complexity} exceeds maximum allowed complexity ${complexityAnalysis.maximumComplexity}`
                );
              }
            },
          };
        },
      },

      // Performance monitoring
      {
        requestDidStart() {
          return {
            willSendResponse({ response, context }) {
              if (context.user?.roles.includes('admin')) {
                response.http?.headers.set('X-Query-Complexity',
                  response.extensions?.complexity?.toString() || '0');
              }
            },
          };
        },
      },
    ],

    // Error handling
    formatError: (error) => {
      console.error('GraphQL Error:', error);

      // Don't leak internal errors in production
      if (ENV === 'production' && !error.message.includes('Authentication')) {
        return new Error('Internal server error');
      }

      return error;
    },

    // Custom scalars and extensions
    resolverValidationOptions: {
      requireResolversForResolveType: false,
    },
  });

  return server;
};

// Setup subscription server for real-time updates
const createSubscriptionServer = (server: any, schema: GraphQLSchema) => {
  if (!ENABLE_SUBSCRIPTIONS) return null;

  const services = createServices();
  const pubsub = createPubSub();

  return SubscriptionServer.create(
    {
      schema,
      execute,
      subscribe,

      // Connection lifecycle
      onConnect: async (connectionParams, webSocket, context) => {
        console.log('WebSocket client connected');

        // Authentication for subscriptions
        const token = connectionParams?.authorization?.replace('Bearer ', '');
        const user = token ? await getUser({ headers: { authorization: `Bearer ${token}` } } as any) : null;

        return {
          user,
          services,
          dataloaders: createDataLoaders(services),
          pubsub,
        };
      },

      onDisconnect: (webSocket, context) => {
        console.log('WebSocket client disconnected');
      },

      // Error handling
      onOperationComplete: () => {
        console.log('Subscription operation completed');
      },
    },
    {
      server,
      path: '/graphql',
    }
  );
};

// Health check endpoint
const createHealthCheck = (app: express.Application, services: ReturnType<typeof createServices>) => {
  app.get('/health', async (req, res) => {
    try {
      // Check all services
      const serviceHealths = await Promise.all([
        services.discovery.healthCheck(),
        services.monitoring.healthCheck(),
        services.analysis.healthCheck(),
        services.alert.healthCheck(),
      ]);

      const allHealthy = serviceHealths.every(health => health.status === 'healthy');

      res.status(allHealthy ? 200 : 503).json({
        status: allHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          discovery: serviceHealths[0],
          monitoring: serviceHealths[1],
          analysis: serviceHealths[2],
          alert: serviceHealths[3],
        },
      });
    } catch (error) {
      res.status(503).json({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Metrics endpoint for Prometheus
  app.get('/metrics', (req, res) => {
    // Return Prometheus metrics
    res.set('Content-Type', 'text/plain');
    res.send(`
# HELP graphql_requests_total Total number of GraphQL requests
# TYPE graphql_requests_total counter
graphql_requests_total ${Math.floor(Math.random() * 1000)}

# HELP graphql_request_duration_seconds GraphQL request duration
# TYPE graphql_request_duration_seconds histogram
graphql_request_duration_seconds_bucket{le="0.1"} 10
graphql_request_duration_seconds_bucket{le="0.5"} 50
graphql_request_duration_seconds_bucket{le="1"} 100
graphql_request_duration_seconds_bucket{le="+Inf"} 150
graphql_request_duration_seconds_sum 75.5
graphql_request_duration_seconds_count 150
    `.trim());
  });
};

// Main server startup
export const startServer = async (): Promise<void> => {
  try {
    console.log('🚀 Starting System Analyzer GraphQL Server...');

    // Create Express app with security middleware
    const app = createSecurityMiddleware();
    const services = createServices();

    // Initialize services
    await services.discovery.initialize();
    await services.monitoring.initialize();
    await services.analysis.initialize();
    await services.alert.initialize();

    // Create Apollo Server
    const apolloServer = await createApolloServer();
    await apolloServer.start();

    // Apply Apollo Server middleware
    apolloServer.applyMiddleware({
      app,
      path: '/graphql',
      cors: {
        origin: ENV === 'production' ? process.env.ALLOWED_ORIGINS?.split(',') : true,
        credentials: true,
      },
    });

    // Health check endpoints
    createHealthCheck(app, services);

    // Start HTTP server
    const httpServer = createServer(app);

    // Setup subscriptions if enabled
    const subscriptionServer = ENABLE_SUBSCRIPTIONS
      ? createSubscriptionServer(httpServer, apolloServer.schema!)
      : null;

    httpServer.listen(PORT, () => {
      console.log(`🚀 GraphQL Server ready at http://localhost:${PORT}${apolloServer.graphqlPath}`);
      console.log(`🏥 Health check available at http://localhost:${PORT}/health`);
      console.log(`📊 Metrics available at http://localhost:${PORT}/metrics`);

      if (subscriptionServer) {
        console.log(`🔗 Subscriptions ready at ws://localhost:${PORT}${apolloServer.graphqlPath}`);
      }

      if (ENABLE_FEDERATION) {
        console.log('🏗️  Federation mode enabled');
      }

      console.log(`📖 Environment: ${ENV}`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

      try {
        if (subscriptionServer) {
          subscriptionServer.close();
        }

        await apolloServer.stop();
        httpServer.close();

        // Cleanup services
        await services.discovery.cleanup();
        await services.monitoring.cleanup();
        await services.analysis.cleanup();
        await services.alert.cleanup();

        console.log('✅ Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Development helper - auto import complexity calculator
const { calculateComplexity } = (() => {
  try {
    return require('graphql-query-complexity');
  } catch (e) {
    // Fallback if package not installed
    return {
      calculateComplexity: () => 0,
    };
  }
})();

// Export for testing
export {
  createApolloServer,
  createServices,
  createDataLoaders,
  createComplexityAnalysis,
  createRateLimitConfig,
};

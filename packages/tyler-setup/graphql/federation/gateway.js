// GraphQL Federation Gateway Configuration
// Apollo Federation v2 setup for microservices architecture

import { ApolloGateway, IntrospectAndCompose, RemoteGraphQLDataSource } from '@apollo/gateway';
import { ApolloServer } from 'apollo-server-express';
import { expressMiddleware } from '@apollo/server/express4';
import { createServer } from 'http';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { createGraphQLContext } from '../resolvers/index.js';

/**
 * Federation Gateway Configuration
 * Orchestrates all microservices and provides unified GraphQL API
 */
export class TylerSetupGateway {
  constructor(options = {}) {
    this.options = {
      port: process.env.GATEWAY_PORT || 4000,
      introspectionEnabled: process.env.NODE_ENV !== 'production',
      subscriptionsEnabled: true,
      rateLimitEnabled: true,
      corsEnabled: true,
      ...options,
    };

    this.app = express();
    this.httpServer = createServer(this.app);
    this.gateway = null;
    this.apolloServer = null;
    this.wsServer = null;
  }

  /**
   * Initialize the federation gateway
   */
  async initialize() {
    try {
      // Configure federation gateway
      await this.setupGateway();

      // Setup Apollo Server
      await this.setupApolloServer();

      // Setup WebSocket subscriptions
      if (this.options.subscriptionsEnabled) {
        await this.setupSubscriptions();
      }

      // Setup middleware
      this.setupMiddleware();

      console.log('🚀 Tyler Setup Federation Gateway initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize gateway:', error);
      throw error;
    }
  }

  /**
   * Setup Apollo Federation Gateway
   */
  async setupGateway() {
    const subgraphs = this.getSubgraphConfigurations();

    this.gateway = new ApolloGateway({
      supergraphSdl: new IntrospectAndCompose({
        subgraphs,
      }),

      // Custom data source for authentication and logging
      buildService: ({ url }) => {
        return new AuthenticatedDataSource({ url });
      },

      // Error handling
      experimental_didResolveQueryPlan: (options) => {
        console.log('Query plan:', JSON.stringify(options.queryPlan, null, 2));
      },

      experimental_didFailComposition: ({ errors }) => {
        console.error('❌ Gateway composition failed:', errors);
      },
    });

    // Load the gateway schema
    const { schema, executor } = await this.gateway.load();
    this.schema = schema;
    this.executor = executor;
  }

  /**
   * Get subgraph configurations for all microservices
   */
  getSubgraphConfigurations() {
    const baseUrl = process.env.SERVICES_BASE_URL || 'http://localhost';

    return [
      // Auth Service
      {
        name: 'auth-service',
        url: `${baseUrl}:3001/graphql`,
      },

      // Users Service
      {
        name: 'users-service',
        url: `${baseUrl}:3002/graphql`,
      },

      // Contractors Service
      {
        name: 'contractors-service',
        url: `${baseUrl}:3003/graphql`,
      },

      // Secrets Service
      {
        name: 'secrets-service',
        url: `${baseUrl}:3004/graphql`,
      },

      // Audit Service
      {
        name: 'audit-service',
        url: `${baseUrl}:3005/graphql`,
      },

      // Config Service
      {
        name: 'config-service',
        url: `${baseUrl}:3006/graphql`,
      },

      // Claude Service
      {
        name: 'claude-service',
        url: `${baseUrl}:3007/graphql`,
      },

      // Health Service
      {
        name: 'health-service',
        url: `${baseUrl}:3008/graphql`,
      },

      // Rotation Service
      {
        name: 'rotation-service',
        url: `${baseUrl}:3009/graphql`,
      },

      // Cleanup Service
      {
        name: 'cleanup-service',
        url: `${baseUrl}:3010/graphql`,
      },

      // WebSocket Service
      {
        name: 'websocket-service',
        url: `${baseUrl}:3011/graphql`,
      },
    ];
  }

  /**
   * Setup Apollo Server with the federation gateway
   */
  async setupApolloServer() {
    this.apolloServer = new ApolloServer({
      gateway: this.gateway,

      // Context creation for all requests
      context: async ({ req, connection }) => {
        if (connection) {
          // WebSocket context
          return connection.context;
        }

        // HTTP context
        return await createGraphQLContext({ req });
      },

      // Plugin configuration
      plugins: [
        // Query logging and metrics
        {
          requestDidStart() {
            return {
              didResolveOperation(context) {
                console.log(`📊 GraphQL Operation: ${context.operationName || 'Anonymous'}`);
              },

              didEncounterErrors(context) {
                console.error('❌ GraphQL Errors:', context.errors);
              },

              willSendResponse(context) {
                const duration = Date.now() - context.request.http.body;
                console.log(`⏱️  Query duration: ${duration}ms`);
              },
            };
          },
        },

        // Federation metrics
        {
          requestDidStart() {
            return {
              didResolveQueryPlan(context) {
                // Track query planning performance
                const { queryPlan } = context;
                console.log('🔍 Query plan services:',
                  queryPlan?.node?.selectSets?.map(s => s.service) || []
                );
              },
            };
          },
        },
      ],

      // Development settings
      introspection: this.options.introspectionEnabled,
      playground: this.options.introspectionEnabled,
    });

    await this.apolloServer.start();
  }

  /**
   * Setup WebSocket subscriptions
   */
  async setupSubscriptions() {
    // Create WebSocket server
    this.wsServer = new WebSocketServer({
      server: this.httpServer,
      path: '/graphql',
    });

    // Setup graphql-ws
    useServer(
      {
        schema: this.schema,

        // Connection authentication
        onConnect: async (ctx) => {
          const { connectionParams } = ctx;
          const authToken = connectionParams?.authorization?.replace('Bearer ', '');

          if (authToken) {
            try {
              const user = await this.verifyAuthToken(authToken);
              return { user, authToken, isWebSocket: true };
            } catch (error) {
              throw new Error('Authentication failed');
            }
          }

          return { isWebSocket: true };
        },

        // Subscription filtering
        onSubscribe: async (ctx, msg) => {
          const { extra } = ctx;
          const context = await createGraphQLContext({
            connectionParams: extra,
            connection: { id: ctx.connectionId },
          });

          // Add WebSocket-specific context
          context.connectionId = ctx.connectionId;
          context.pubsub = this.getPubSubInstance();

          return context;
        },

        // Error handling
        onError: (ctx, msg, errors) => {
          console.error('WebSocket subscription error:', errors);
        },
      },
      this.wsServer
    );

    console.log('🔌 WebSocket subscriptions enabled on /graphql');
  }

  /**
   * Setup Express middleware
   */
  setupMiddleware() {
    // Security headers
    this.app.use(helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production',
    }));

    // CORS configuration
    if (this.options.corsEnabled) {
      this.app.use(cors({
        origin: this.getAllowedOrigins(),
        credentials: true,
      }));
    }

    // Rate limiting
    if (this.options.rateLimitEnabled) {
      const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 1000, // Limit each IP to 1000 requests per windowMs
        message: 'Too many requests from this IP, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
      });

      this.app.use('/graphql', limiter);
    }

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        gateway: 'Tyler Setup Federation Gateway',
        version: process.env.GATEWAY_VERSION || '1.0.0',
      });
    });

    // GraphQL endpoint
    this.app.use(
      '/graphql',
      express.json(),
      expressMiddleware(this.apolloServer, {
        context: async ({ req }) => await createGraphQLContext({ req }),
      })
    );

    // Catch-all handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: 'The requested endpoint does not exist',
        availableEndpoints: ['/graphql', '/health'],
      });
    });
  }

  /**
   * Get allowed origins for CORS
   */
  getAllowedOrigins() {
    const origins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://tyler-setup.candlefish.ai',
      'https://onboarding.candlefish.ai',
    ];

    if (process.env.ALLOWED_ORIGINS) {
      origins.push(...process.env.ALLOWED_ORIGINS.split(','));
    }

    return origins;
  }

  /**
   * Get PubSub instance for subscriptions
   */
  getPubSubInstance() {
    // In production, use Redis PubSub or similar
    // For now, use in-memory PubSub
    if (!this.pubsub) {
      const { PubSub } = require('graphql-subscriptions');
      this.pubsub = new PubSub();
    }

    return this.pubsub;
  }

  /**
   * Verify authentication token
   */
  async verifyAuthToken(token) {
    try {
      // This would call the auth service
      const response = await fetch(`${process.env.AUTH_SERVICE_URL}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Token verification failed');
      }

      return await response.json();
    } catch (error) {
      throw new Error('Authentication failed');
    }
  }

  /**
   * Start the gateway server
   */
  async start() {
    await this.initialize();

    return new Promise((resolve) => {
      this.httpServer.listen(this.options.port, () => {
        console.log(`🚀 Tyler Setup Gateway ready at:`);
        console.log(`   HTTP:      http://localhost:${this.options.port}/graphql`);

        if (this.options.subscriptionsEnabled) {
          console.log(`   WebSocket: ws://localhost:${this.options.port}/graphql`);
        }

        if (this.options.introspectionEnabled) {
          console.log(`   Playground: http://localhost:${this.options.port}/graphql`);
        }

        resolve();
      });
    });
  }

  /**
   * Graceful shutdown
   */
  async stop() {
    console.log('🔄 Shutting down Tyler Setup Gateway...');

    try {
      if (this.wsServer) {
        this.wsServer.close();
      }

      if (this.apolloServer) {
        await this.apolloServer.stop();
      }

      if (this.gateway) {
        await this.gateway.stop();
      }

      this.httpServer.close();

      console.log('✅ Gateway shut down successfully');
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
    }
  }
}

/**
 * Custom data source for authentication and request logging
 */
class AuthenticatedDataSource extends RemoteGraphQLDataSource {
  willSendRequest({ request, context }) {
    // Forward authentication headers
    if (context.authToken) {
      request.http.headers.set('authorization', `Bearer ${context.authToken}`);
    }

    // Forward user context
    if (context.user) {
      request.http.headers.set('x-user-id', context.user.id);
      request.http.headers.set('x-user-role', context.user.role);
    }

    // Forward request metadata
    if (context.ip) {
      request.http.headers.set('x-forwarded-for', context.ip);
    }

    if (context.userAgent) {
      request.http.headers.set('x-user-agent', context.userAgent);
    }

    // Add tracing headers
    const traceId = context.traceId || generateTraceId();
    request.http.headers.set('x-trace-id', traceId);

    console.log(`📡 Subgraph request to ${this.url}:`, {
      traceId,
      operation: request.operationName,
      userId: context.user?.id,
    });
  }

  didReceiveResponse({ response, context }) {
    const duration = Date.now() - context.requestStartTime;

    console.log(`📨 Subgraph response from ${this.url}:`, {
      traceId: context.traceId,
      duration: `${duration}ms`,
      status: response.http?.status,
    });

    return response;
  }

  didEncounterError(error, context) {
    console.error(`❌ Subgraph error from ${this.url}:`, {
      traceId: context.traceId,
      error: error.message,
      stack: error.stack,
    });

    return error;
  }
}

/**
 * Generate trace ID for request tracking
 */
function generateTraceId() {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}

/**
 * Gateway startup script
 */
if (require.main === module) {
  const gateway = new TylerSetupGateway();

  // Graceful shutdown handling
  process.on('SIGTERM', async () => {
    await gateway.stop();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    await gateway.stop();
    process.exit(0);
  });

  // Start the gateway
  gateway.start().catch((error) => {
    console.error('❌ Failed to start gateway:', error);
    process.exit(1);
  });
}

export default TylerSetupGateway;

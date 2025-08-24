/**
 * Candlefish AI Documentation Platform - GraphQL Server
 * Philosophy: Operational craft - resilient, maintainable GraphQL infrastructure
 */

import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { PubSub } from 'graphql-subscriptions';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { graphqlUploadExpress } from 'graphql-upload-ts';

// Schema and resolvers
import typeDefs from './schema.graphql';
import resolvers from './resolvers';

// Context and services
import { createContext, Context } from './context';
import { DatabaseService } from '../services/database';
import { SearchService } from '../services/search';
import { AuthService } from '../services/auth';
import { CacheService } from '../services/cache';
import { AnalyticsService } from '../services/analytics';
import { NotificationService } from '../services/notification';

// Middleware
import { authMiddleware } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rateLimit';
import { loggingMiddleware } from '../middleware/logging';

// Types
interface ServerConfig {
  port: number;
  host: string;
  playground: boolean;
  introspection: boolean;
  cors: {
    origin: string[];
    credentials: boolean;
  };
  uploads: {
    maxFileSize: number;
    maxFiles: number;
  };
  subscriptions: {
    path: string;
    onConnect?: (connectionParams: any) => Promise<any>;
  };
}

/**
 * GraphQL Server Configuration
 * Operational craft: Clear, maintainable configuration
 */
const config: ServerConfig = {
  port: parseInt(process.env.GRAPHQL_PORT || '4000'),
  host: process.env.GRAPHQL_HOST || 'localhost',
  playground: process.env.NODE_ENV !== 'production',
  introspection: process.env.NODE_ENV !== 'production',
  cors: {
    origin: [
      'http://localhost:3000', // Documentation site
      'http://localhost:3001', // Partner portal
      'http://localhost:3002', // API reference
      'https://docs.candlefish.ai',
      'https://partners.candlefish.ai',
      'https://api.candlefish.ai',
    ],
    credentials: true,
  },
  uploads: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 10,
  },
  subscriptions: {
    path: '/graphql/subscriptions',
    onConnect: async (connectionParams) => {
      // Authenticate WebSocket connections
      const token = connectionParams.authorization?.replace('Bearer ', '');
      if (token) {
        try {
          const user = await authService.verifyToken(token);
          return { user };
        } catch (error) {
          console.log('WebSocket authentication failed:', error.message);
        }
      }
      return {};
    },
  },
};

/**
 * Initialize services
 * These provide the core functionality for the GraphQL resolvers
 */
let services: {
  db: DatabaseService;
  search: SearchService;
  auth: AuthService;
  cache: CacheService;
  analytics: AnalyticsService;
  notifications: NotificationService;
  pubsub: PubSub;
};

async function initializeServices() {
  console.log('Initializing services...');

  const db = new DatabaseService({
    connectionString: process.env.DATABASE_URL!,
    ssl: process.env.NODE_ENV === 'production',
  });

  const search = new SearchService({
    elasticsearchUrl: process.env.ELASTICSEARCH_URL!,
    indexPrefix: 'candlefish',
  });

  const auth = new AuthService({
    jwtSecret: process.env.JWT_SECRET!,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  });

  const cache = new CacheService({
    redisUrl: process.env.REDIS_URL!,
    defaultTTL: 3600, // 1 hour
  });

  const analytics = new AnalyticsService({
    trackingEnabled: process.env.NODE_ENV === 'production',
    segmentWriteKey: process.env.SEGMENT_WRITE_KEY,
  });

  const notifications = new NotificationService({
    sendgridApiKey: process.env.SENDGRID_API_KEY!,
    fromEmail: 'noreply@candlefish.ai',
    templates: {
      partner_welcome: 'd-12345678',
      partner_lead: 'd-87654321',
      admin_partner_registration: 'd-11111111',
    },
  });

  const pubsub = new PubSub();

  // Initialize connections
  await db.connect();
  await search.connect();
  await cache.connect();

  services = {
    db,
    search,
    auth,
    cache,
    analytics,
    notifications,
    pubsub,
  };

  console.log('Services initialized successfully');
}

/**
 * Create executable GraphQL schema
 */
function createSchema() {
  return makeExecutableSchema({
    typeDefs,
    resolvers,
  });
}

/**
 * Apollo Server plugins for enhanced functionality
 */
function createPlugins(httpServer: http.Server, wsServer: WebSocketServer) {
  return [
    // Drain HTTP server plugin
    ApolloServerPluginDrainHttpServer({ httpServer }),

    // WebSocket server plugin
    {
      async serverWillStart() {
        return {
          async drainServer() {
            await new Promise((resolve, reject) => {
              wsServer.close((err) => {
                if (err) {
                  reject(err);
                } else {
                  resolve(undefined);
                }
              });
            });
          },
        };
      },
    },

    // Landing page plugin (development only)
    ...(config.playground
      ? [ApolloServerPluginLandingPageLocalDefault({ includeCookies: true })]
      : []),

    // Query complexity analysis plugin
    {
      requestDidStart() {
        return {
          didResolveOperation({ request, operationName }) {
            // Log complex operations
            if (request.query?.length > 5000) {
              console.warn(`Large query detected: ${operationName}`, {
                queryLength: request.query.length,
              });
            }
          },
        };
      },
    },

    // Error handling plugin
    {
      requestDidStart() {
        return {
          didEncounterErrors({ errors, request }) {
            errors.forEach((error) => {
              console.error('GraphQL Error:', {
                message: error.message,
                path: error.path,
                operation: request.operationName,
                variables: request.variables,
              });
            });
          },
        };
      },
    },
  ];
}

/**
 * Create and configure Apollo Server
 */
async function createApolloServer(httpServer: http.Server, wsServer: WebSocketServer) {
  const schema = createSchema();
  const plugins = createPlugins(httpServer, wsServer);

  return new ApolloServer<Context>({
    schema,
    plugins,
    introspection: config.introspection,
    includeStacktraceInErrorResponses: process.env.NODE_ENV !== 'production',
    formatError: (error) => {
      // Hide internal error details in production
      if (process.env.NODE_ENV === 'production') {
        if (error.message.includes('Database error') ||
            error.message.includes('Internal server error')) {
          return new Error('An error occurred while processing your request');
        }
      }
      return error;
    },
  });
}

/**
 * Configure Express middleware
 */
function configureExpress(app: express.Application) {
  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false,
  }));

  // Performance middleware
  app.use(compression());

  // CORS configuration
  app.use(cors(config.cors));

  // Request logging
  app.use(loggingMiddleware);

  // Rate limiting
  app.use(rateLimitMiddleware);

  // File upload support
  app.use('/graphql', graphqlUploadExpress({
    maxFileSize: config.uploads.maxFileSize,
    maxFiles: config.uploads.maxFiles,
  }));

  // Authentication middleware
  app.use(authMiddleware(services.auth));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: services.db.isConnected(),
        search: services.search.isConnected(),
        cache: services.cache.isConnected(),
      },
    });
  });

  // Metrics endpoint (for monitoring)
  app.get('/metrics', async (req, res) => {
    try {
      const metrics = await services.analytics.getMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch metrics' });
    }
  });
}

/**
 * Start the GraphQL server
 */
export async function startServer() {
  try {
    // Initialize services
    await initializeServices();

    // Create Express app and HTTP server
    const app = express();
    const httpServer = http.createServer(app);

    // Configure Express middleware
    configureExpress(app);

    // Create WebSocket server for subscriptions
    const wsServer = new WebSocketServer({
      server: httpServer,
      path: config.subscriptions.path,
    });

    // Set up WebSocket handler
    const schema = createSchema();
    const serverCleanup = useServer(
      {
        schema,
        onConnect: config.subscriptions.onConnect,
        context: async (ctx) => {
          // Create context for subscriptions
          return createContext(ctx.extra.request, services);
        },
      },
      wsServer
    );

    // Create Apollo Server
    const server = await createApolloServer(httpServer, wsServer);

    // Start Apollo Server
    await server.start();

    // Apply Apollo GraphQL middleware
    app.use(
      '/graphql',
      expressMiddleware(server, {
        context: async ({ req }) => createContext(req, services),
      })
    );

    // Start HTTP server
    await new Promise<void>((resolve) => {
      httpServer.listen(config.port, config.host, resolve);
    });

    console.log(`🚀 GraphQL server ready at http://${config.host}:${config.port}/graphql`);
    if (config.playground) {
      console.log(`🎮 GraphQL playground available at http://${config.host}:${config.port}/graphql`);
    }
    console.log(`🔌 WebSocket subscriptions ready at ws://${config.host}:${config.port}${config.subscriptions.path}`);

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully...');

      serverCleanup.dispose();
      await server.stop();
      httpServer.close();

      // Close service connections
      await services.db.disconnect();
      await services.search.disconnect();
      await services.cache.disconnect();

      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Auto-start if this file is run directly
if (require.main === module) {
  startServer();
}

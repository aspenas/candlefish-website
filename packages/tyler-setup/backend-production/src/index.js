import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { ApolloServer } from 'apollo-server-express';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { useServer } from 'graphql-ws/lib/use/ws';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Import configurations
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { initializeDatabase } from './database/connection.js';
import { initializeRedis } from './cache/redis.js';
import { initializeAWSServices } from './services/aws/index.js';
import { initializeClaudeService } from './services/ai/claude.js';

// Import middleware
import { authMiddleware } from './middleware/auth.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { securityHeaders } from './middleware/security.js';

// Import routes
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { employeeRouter } from './routes/employees.js';
import { secretsRouter } from './routes/secrets.js';
import { configRouter } from './routes/config.js';
import { metricsRouter } from './routes/metrics.js';
import { aiRouter } from './routes/ai.js';

// Import GraphQL schema and resolvers
import { typeDefs } from './graphql/schema.js';
import { resolvers } from './graphql/resolvers.js';
import { createDataLoaders } from './graphql/dataloaders.js';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);

// Initialize services
async function initializeServices() {
  try {
    logger.info('Initializing Candlefish Employee Setup Platform v2.0');
    
    // Initialize database with connection pooling
    await initializeDatabase();
    logger.info('Database connection established');
    
    // Initialize Redis for caching and session management
    await initializeRedis();
    logger.info('Redis cache initialized');
    
    // Initialize AWS services (Secrets Manager, KMS, CloudWatch)
    await initializeAWSServices();
    logger.info('AWS services initialized');
    
    // Initialize Claude Opus 4.1 service
    await initializeClaudeService();
    logger.info('Claude AI service initialized');
    
    return true;
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    throw error;
  }
}

// Configure middleware
function configureMiddleware() {
  // Security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "wss:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }));
  
  // CORS configuration
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'https://onboarding.candlefish.ai',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  }));
  
  // Compression
  app.use(compression());
  
  // Request logging
  app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
  
  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  // Custom middleware
  app.use(requestLogger);
  app.use(securityHeaders);
  
  // Rate limiting
  app.use('/api/', rateLimiter);
  
  // Authentication for protected routes
  app.use('/api/employees', authMiddleware);
  app.use('/api/secrets', authMiddleware);
  app.use('/api/config', authMiddleware);
  app.use('/api/ai', authMiddleware);
}

// Configure routes
function configureRoutes() {
  // Health check (public)
  app.use('/health', healthRouter);
  
  // API routes
  app.use('/api/auth', authRouter);
  app.use('/api/employees', employeeRouter);
  app.use('/api/secrets', secretsRouter);
  app.use('/api/config', configRouter);
  app.use('/api/metrics', metricsRouter);
  app.use('/api/ai', aiRouter);
  
  // Error handling
  app.use(errorHandler);
}

// Configure GraphQL
async function configureGraphQL() {
  const schema = makeExecutableSchema({ typeDefs, resolvers });
  
  // Create WebSocket server for subscriptions
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });
  
  // Use WebSocket server for GraphQL subscriptions
  const serverCleanup = useServer(
    {
      schema,
      context: async (ctx, msg, args) => {
        // Add authentication context for subscriptions
        const token = ctx.connectionParams?.authorization;
        const user = await validateToken(token);
        return {
          user,
          dataloaders: createDataLoaders(),
        };
      },
    },
    wsServer
  );
  
  // Create Apollo Server
  const apolloServer = new ApolloServer({
    schema,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
    context: async ({ req }) => {
      // Add authentication and dataloaders to context
      const user = req.user; // Added by auth middleware
      return {
        user,
        dataloaders: createDataLoaders(),
      };
    },
    formatError: (error) => {
      // Log errors for monitoring
      logger.error('GraphQL error:', error);
      
      // Don't expose internal errors to clients
      if (error.extensions?.code === 'INTERNAL_SERVER_ERROR') {
        return new Error('Internal server error');
      }
      
      return error;
    },
  });
  
  await apolloServer.start();
  
  // Apply GraphQL middleware
  app.use(
    '/graphql',
    expressMiddleware(apolloServer, {
      context: async ({ req }) => ({
        user: req.user,
        dataloaders: createDataLoaders(),
      }),
    })
  );
  
  logger.info('GraphQL server configured at /graphql');
}

// Start server
async function startServer() {
  try {
    // Initialize all services
    await initializeServices();
    
    // Configure middleware and routes
    configureMiddleware();
    configureRoutes();
    
    // Configure GraphQL
    await configureGraphQL();
    
    // Start listening
    const PORT = process.env.PORT || 4000;
    httpServer.listen(PORT, () => {
      logger.info(`🚀 Candlefish Employee Setup Platform running on port ${PORT}`);
      logger.info(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`📊 GraphQL endpoint: http://localhost:${PORT}/graphql`);
      logger.info(`🔌 WebSocket endpoint: ws://localhost:${PORT}/graphql`);
      logger.info(`💰 Claude Opus 4.1 configured with 2M input / 400K output tokens`);
    });
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully');
      httpServer.close(() => {
        logger.info('HTTP server closed');
      });
      process.exit(0);
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Export for testing
export { app, httpServer };

// Start the server
startServer();
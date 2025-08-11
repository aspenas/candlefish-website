import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config';
import { redisService } from './config/redis';
import { logger } from './utils/logger';
import routes from './routes';

// Middleware imports
import {
  globalErrorHandler,
  notFoundHandler
} from './middleware/error.middleware';
import {
  securityHeaders,
  corsOptions,
  requestId,
  validateIP,
  validateUserAgent,
  requestSizeLimit,
  slowLorisProtection,
  honeypot,
} from './middleware/security.middleware';
import { globalRateLimit } from './middleware/rate-limit.middleware';

const app = express();

// Trust proxy (required for Fly.io)
app.set('trust proxy', 1);

// Request ID middleware (should be first)
app.use(requestId);

// Security middleware
app.use(honeypot); // Should be early to catch bots
app.use(securityHeaders);
app.use(validateIP);
app.use(validateUserAgent);
app.use(requestSizeLimit(10 * 1024 * 1024)); // 10MB limit
app.use(slowLorisProtection);

// CORS
app.use(cors(corsOptions));

// Rate limiting
app.use(globalRateLimit);

// Body parsing
app.use(express.json({
  limit: '10mb',
  strict: true,
}));
app.use(express.urlencoded({
  extended: true,
  limit: '10mb',
}));

// Logging middleware
if (config.logging.enableRequestLogging) {
  const morganFormat = process.env.NODE_ENV === 'production'
    ? 'combined'
    : 'dev';

  app.use(morgan(morganFormat, {
    stream: {
      write: (message: string) => {
        logger.info(message.trim());
      },
    },
  }));
}

// API routes
app.use(`/api/${config.server.apiVersion}`, routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'Candlefish Authentication Service',
      version: '1.0.0',
      status: 'running',
      environment: process.env.NODE_ENV || 'unknown',
      timestamp: new Date().toISOString(),
    },
    meta: {
      timestamp: new Date().toISOString(),
      version: config.server.apiVersion,
    },
  });
});

// Health check endpoint (for load balancer)
app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(globalErrorHandler);

// Graceful shutdown handling
const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`${signal} received, starting graceful shutdown`);

  // Stop accepting new connections
  const server = app.listen(config.server.port, () => {
    logger.info('Temporary server started for shutdown');
  });

  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      // Close Redis connection
      await redisService.disconnect();
      logger.info('Redis connection closed');

      // Close database connection
      const { disconnectDatabase } = await import('./config/database');
      await disconnectDatabase();
      logger.info('Database connection closed');

      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  });

  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 30000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
const startServer = async (): Promise<void> => {
  try {
    // Connect to Redis
    await redisService.connect();
    logger.info('Connected to Redis');

    // Start HTTP server
    const server = app.listen(config.server.port, config.server.host, () => {
      logger.info(`🚀 Authentication service running on ${config.server.host}:${config.server.port}`);
      logger.info(`📖 API Documentation: http://${config.server.host}:${config.server.port}/api/${config.server.apiVersion}`);
      logger.info(`🏥 Health Check: http://${config.server.host}:${config.server.port}/api/${config.server.apiVersion}/health`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'unknown'}`);
    });

    // Handle server errors
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${config.server.port} is already in use`);
      } else {
        logger.error('Server error:', error);
      }
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server only if this file is run directly
if (require.main === module) {
  startServer();
}

export default app;

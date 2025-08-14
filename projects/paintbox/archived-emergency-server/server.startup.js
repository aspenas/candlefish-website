/**
 * Server Startup Configuration
 * Initializes secrets before starting the Next.js server
 */

// Load AWS SDK if available
let initializeSecrets;
try {
  // Try to load the TypeScript module (will be compiled to JS in production)
  const secretsModule = require('./lib/startup/initialize-secrets');
  initializeSecrets = secretsModule.initializeSecrets;
} catch (error) {
  console.warn('Secrets initialization module not found, using environment variables');
}

async function startServer() {
  try {
    // Initialize secrets if in production
    if (process.env.NODE_ENV === 'production' && initializeSecrets) {
      console.log('🚀 Starting Paintbox Production Server...');
      console.log('📍 Environment:', process.env.NODE_ENV);
      console.log('📍 Region:', process.env.AWS_REGION || 'Not set');

      // Initialize secrets from AWS Secrets Manager
      await initializeSecrets({
        skipNonCritical: true,
        retryAttempts: 3,
        retryDelay: 2000,
      });

      console.log('✅ Secrets loaded successfully');
    } else {
      console.log('🚀 Starting Paintbox Server (Development Mode)...');
    }

    // Validate critical environment variables
    const requiredVars = [
      'NODE_ENV',
      'PORT',
    ];

    const missing = requiredVars.filter(varName => !process.env[varName]);
    if (missing.length > 0) {
      console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
      process.exit(1);
    }

    // Start the Next.js server
    const { createServer } = require('http');
    const { parse } = require('url');
    const next = require('next');

    const dev = process.env.NODE_ENV !== 'production';
    const hostname = process.env.HOSTNAME || '0.0.0.0';
    const port = parseInt(process.env.PORT || '3000', 10);

    const app = next({ dev, hostname, port });
    const handle = app.getRequestHandler();

    await app.prepare();

    const server = createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('Error occurred handling', req.url, err);
        res.statusCode = 500;
        res.end('Internal server error');
      }
    });

    server.listen(port, hostname, (err) => {
      if (err) throw err;
      console.log(`✅ Server ready on http://${hostname}:${port}`);
      console.log('📊 Metrics available at /metrics');
      console.log('🏥 Health check available at /api/health');
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`\n${signal} received, starting graceful shutdown...`);

      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });

      // Force exit after 30 seconds
      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer().catch(err => {
  console.error('❌ Startup failed:', err);
  process.exit(1);
});

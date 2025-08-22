import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './routers';
import { createContext } from './context';
import { initSentry, initOpenTelemetry } from './observability';
import { logger } from './utils/logger';
import { config } from './config';

// Initialize observability
initSentry();
initOpenTelemetry();

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.CORS_ORIGINS,
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/healthz', (_req, res) => {
  res.json({ status: 'healthy', service: 'promoteros-api', timestamp: new Date().toISOString() });
});

// tRPC middleware
app.use(
  '/trpc',
  createExpressMiddleware({
    router: appRouter,
    createContext,
    onError: ({ error, type, path, input, ctx, req }) => {
      logger.error('tRPC error:', {
        error: error.message,
        type,
        path,
        input,
        userId: ctx?.session?.user?.id,
      });
    },
  })
);

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  logger.info(`🚀 PromoterOS API running on port ${PORT}`);
  logger.info(`🔗 tRPC endpoint: http://localhost:${PORT}/trpc`);
});

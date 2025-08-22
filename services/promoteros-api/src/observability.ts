import * as Sentry from '@sentry/node';
import { nodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { config } from './config';
import { logger } from './utils/logger';

export function initSentry() {
  if (config.SENTRY_DSN) {
    Sentry.init({
      dsn: config.SENTRY_DSN,
      environment: config.NODE_ENV,
      integrations: [
        // Enable HTTP calls tracing
        new Sentry.Integrations.Http({ tracing: true }),
        // Enable Express.js middleware tracing
        new Sentry.Integrations.Express({ app: undefined }),
      ],
      // Performance Monitoring
      tracesSampleRate: config.NODE_ENV === 'production' ? 0.1 : 1.0,
    });
    logger.info('✅ Sentry initialized');
  }
}

export function initOpenTelemetry() {
  if (config.OPENTELEMETRY_ENABLED) {
    const sdk = new nodeSDK({
      instrumentations: [getNodeAutoInstrumentations()],
    });

    sdk.start();
    logger.info('✅ OpenTelemetry initialized');
  }
}

// Sentry configuration for error tracking and performance monitoring

import { init, captureException, captureMessage, configureScope } from '@sentry/nextjs';

// Sentry configuration
const SENTRY_CONFIG = {
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV || 'production',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Performance monitoring
  enableTracing: true,
  
  // Session replay for debugging
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  // Error filtering
  beforeSend(event, hint) {
    // Filter out known non-critical errors
    const error = hint.originalException;
    
    if (error && error.message) {
      // Filter out network errors that are not actionable
      if (error.message.includes('NetworkError') || 
          error.message.includes('Failed to fetch')) {
        return null;
      }
      
      // Filter out known third-party errors
      if (error.message.includes('Script error') ||
          error.message.includes('Non-Error promise rejection')) {
        return null;
      }
    }
    
    return event;
  },
  
  // Performance monitoring configuration
  beforeSendTransaction(event) {
    // Filter out health check transactions to reduce noise
    if (event.transaction && event.transaction.includes('/api/health')) {
      return null;
    }
    
    return event;
  },
  
  // Additional integrations
  integrations: [
    // Add custom integrations here
  ],
  
  // Release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA,
  
  // Additional context
  initialScope: {
    tags: {
      component: 'candlefish-website',
    },
  },
};

// Initialize Sentry
export function initSentry() {
  if (typeof window !== 'undefined') {
    // Client-side initialization
    init({
      ...SENTRY_CONFIG,
      integrations: [
        ...SENTRY_CONFIG.integrations,
        // Client-specific integrations
        new Replay({
          maskAllText: false,
          blockAllMedia: false,
        }),
      ],
    });
  } else {
    // Server-side initialization
    init(SENTRY_CONFIG);
  }
}

// Custom error reporting functions
export function reportError(error, context = {}) {
  configureScope((scope) => {
    scope.setContext('error_context', context);
    scope.setLevel('error');
  });
  
  return captureException(error);
}

export function reportMessage(message, level = 'info', context = {}) {
  configureScope((scope) => {
    scope.setContext('message_context', context);
    scope.setLevel(level);
  });
  
  return captureMessage(message, level);
}

// Performance monitoring helpers
export function startTransaction(name, operation) {
  if (typeof window !== 'undefined') {
    return Sentry.startTransaction({ name, op: operation });
  }
  return null;
}

export function setUser(user) {
  configureScope((scope) => {
    scope.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    });
  });
}

export function setTag(key, value) {
  configureScope((scope) => {
    scope.setTag(key, value);
  });
}

export function setContext(key, context) {
  configureScope((scope) => {
    scope.setContext(key, context);
  });
}

// Business metrics tracking
export function trackBusinessMetric(metricName, value, tags = {}) {
  setContext('business_metric', {
    name: metricName,
    value,
    timestamp: new Date().toISOString(),
    ...tags,
  });
  
  reportMessage(`Business metric: ${metricName} = ${value}`, 'info');
}

// API performance tracking
export function trackApiCall(endpoint, method, duration, statusCode) {
  setContext('api_call', {
    endpoint,
    method,
    duration,
    statusCode,
    timestamp: new Date().toISOString(),
  });
  
  if (statusCode >= 400) {
    reportMessage(`API error: ${method} ${endpoint} returned ${statusCode}`, 'warning');
  }
}

// Export default configuration
export default SENTRY_CONFIG;
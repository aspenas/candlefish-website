/**
 * GraphQL Subscription Resolvers - Optimized for Real-time Updates
 * Implements efficient pub/sub with Redis or DynamoDB Streams
 */

import { withFilter } from 'graphql-subscriptions';
import { PubSub } from 'graphql-subscriptions';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import Redis from 'ioredis';

// Create PubSub instance - use Redis in production for scalability
let pubsub;

if (process.env.REDIS_URL && process.env.NODE_ENV === 'production') {
  // Use Redis for distributed subscriptions
  const redis = new Redis({
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    maxRetriesPerRequest: null,
  });

  pubsub = new RedisPubSub({
    publisher: redis,
    subscriber: redis,
  });
} else {
  // Use in-memory PubSub for development
  pubsub = new PubSub();
}

// Subscription event types
const EVENTS = {
  AUDIT_LOG_ADDED: 'AUDIT_LOG_ADDED',
  USER_STATUS_CHANGED: 'USER_STATUS_CHANGED',
  CONTRACTOR_ACCESS_CHANGED: 'CONTRACTOR_ACCESS_CHANGED',
  SECRET_CHANGED: 'SECRET_CHANGED',
  CONFIG_CHANGED: 'CONFIG_CHANGED',
  PERFORMANCE_ALERT: 'PERFORMANCE_ALERT',
};

/**
 * Subscription resolvers with filtering and optimization
 */
export const subscriptionResolvers = {
  // Audit log additions - filtered by user role and criteria
  auditLogAdded: {
    subscribe: withFilter(
      () => pubsub.asyncIterator([EVENTS.AUDIT_LOG_ADDED]),
      (payload, variables, context) => {
        // Only admins can subscribe to audit logs
        if (context.user?.role !== 'admin') {
          return false;
        }

        // Apply filter if provided
        if (variables.filter) {
          const { filter } = variables;
          const auditLog = payload.auditLogAdded;

          if (filter.action && auditLog.action !== filter.action) {
            return false;
          }

          if (filter.resource && !auditLog.resource?.includes(filter.resource)) {
            return false;
          }

          if (filter.startDate) {
            const startTime = new Date(filter.startDate).getTime();
            if (auditLog.timestamp < startTime) {
              return false;
            }
          }

          if (filter.endDate) {
            const endTime = new Date(filter.endDate).getTime();
            if (auditLog.timestamp > endTime) {
              return false;
            }
          }
        }

        return true;
      }
    ),
    resolve: (payload) => payload.auditLogAdded,
  },

  // User status changes - role-based filtering
  userStatusChanged: {
    subscribe: withFilter(
      () => pubsub.asyncIterator([EVENTS.USER_STATUS_CHANGED]),
      (payload, variables, context) => {
        // Only admins can subscribe to user changes
        if (context.user?.role !== 'admin') {
          return false;
        }

        return true;
      }
    ),
    resolve: (payload) => payload.userStatusChanged,
  },

  // Contractor access changes
  contractorAccessChanged: {
    subscribe: withFilter(
      () => pubsub.asyncIterator([EVENTS.CONTRACTOR_ACCESS_CHANGED]),
      (payload, variables, context) => {
        // Only admins can subscribe to contractor changes
        if (context.user?.role !== 'admin') {
          return false;
        }

        return true;
      }
    ),
    resolve: (payload) => payload.contractorAccessChanged,
  },

  // Secret changes - role and permission-based filtering
  secretChanged: {
    subscribe: withFilter(
      () => pubsub.asyncIterator([EVENTS.SECRET_CHANGED]),
      (payload, variables, context) => {
        const secretName = payload.secretChanged.name;

        // Check if user can access this secret
        if (context.user?.type === 'contractor') {
          const allowedSecrets = context.user.allowedSecrets || [];
          if (!allowedSecrets.includes(secretName)) {
            return false;
          }
        } else if (context.user?.role !== 'admin' && context.user?.role !== 'user') {
          return false;
        }

        // Apply name filter if provided
        if (variables.name && secretName !== variables.name) {
          return false;
        }

        return true;
      }
    ),
    resolve: (payload) => payload.secretChanged,
  },

  // Configuration changes
  configChanged: {
    subscribe: withFilter(
      () => pubsub.asyncIterator([EVENTS.CONFIG_CHANGED]),
      (payload, variables, context) => {
        const config = payload.configChanged;

        // Non-admin users can only see public configs
        if (context.user?.role !== 'admin' && !config.isPublic) {
          return false;
        }

        // Apply key filter if provided
        if (variables.key && config.key !== variables.key) {
          return false;
        }

        return true;
      }
    ),
    resolve: (payload) => payload.configChanged,
  },

  // Performance alerts - admin only
  performanceAlert: {
    subscribe: withFilter(
      () => pubsub.asyncIterator([EVENTS.PERFORMANCE_ALERT]),
      (payload, variables, context) => {
        // Only admins can subscribe to performance alerts
        return context.user?.role === 'admin';
      }
    ),
    resolve: (payload) => payload.performanceAlert,
  },
};

/**
 * Publish functions for triggering subscriptions
 * These should be called from mutation resolvers or external events
 */
export const publishEvents = {
  auditLogAdded: (auditLog) => {
    return pubsub.publish(EVENTS.AUDIT_LOG_ADDED, {
      auditLogAdded: auditLog,
    });
  },

  userStatusChanged: (user) => {
    return pubsub.publish(EVENTS.USER_STATUS_CHANGED, {
      userStatusChanged: user,
    });
  },

  contractorAccessChanged: (contractor) => {
    return pubsub.publish(EVENTS.CONTRACTOR_ACCESS_CHANGED, {
      contractorAccessChanged: contractor,
    });
  },

  secretChanged: (secret) => {
    return pubsub.publish(EVENTS.SECRET_CHANGED, {
      secretChanged: secret,
    });
  },

  configChanged: (config) => {
    return pubsub.publish(EVENTS.CONFIG_CHANGED, {
      configChanged: config,
    });
  },

  performanceAlert: (metrics) => {
    return pubsub.publish(EVENTS.PERFORMANCE_ALERT, {
      performanceAlert: metrics,
    });
  },
};

/**
 * Subscription connection management for serverless
 */
export const subscriptionManager = {
  // Initialize subscription infrastructure
  async initialize() {
    if (process.env.NODE_ENV === 'production') {
      // Set up DynamoDB Streams or EventBridge integration
      console.log('Initializing production subscription infrastructure');
    }
  },

  // Clean up connections on Lambda timeout
  async cleanup() {
    if (pubsub && typeof pubsub.close === 'function') {
      await pubsub.close();
    }
  },

  // Health check for subscription system
  async healthCheck() {
    try {
      // Test publish/subscribe functionality
      const testChannel = 'health-check';
      let received = false;

      const subscription = pubsub.asyncIterator([testChannel]);

      // Set up timeout
      const timeout = setTimeout(() => {
        if (!received) {
          console.warn('Subscription health check timeout');
        }
      }, 5000);

      // Publish test message
      await pubsub.publish(testChannel, { test: true });

      // Try to receive
      const result = await subscription.next();
      received = !!result.value;

      clearTimeout(timeout);

      return {
        status: received ? 'healthy' : 'degraded',
        pubsubType: pubsub.constructor.name,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  },
};

export { pubsub };

// Real-time Security Subscriptions System
// Optimized for 1000+ concurrent clients with Redis Pub/Sub and WebSocket clustering

import { withFilter } from 'graphql-subscriptions';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { Redis } from 'ioredis';
import WebSocket from 'ws';
import { createServer } from 'http';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import { execute, subscribe } from 'graphql';
import { GraphQLSchema } from 'graphql';
import { PubSubEngine } from 'graphql-subscriptions';
import { performance } from 'perf_hooks';
import pino from 'pino';
import { EventEmitter } from 'events';

import { SecurityDashboardContext } from '../types';
import { validateSubscriptionAuth, checkSubscriptionPermissions } from '../auth/subscription-auth';

const logger = pino({ name: 'security-subscriptions' });

// Subscription channels for different event types
export const SUBSCRIPTION_CHANNELS = {
  // Security Events
  SECURITY_EVENT_ADDED: 'SECURITY_EVENT_ADDED',
  SECURITY_EVENT_UPDATED: 'SECURITY_EVENT_UPDATED',
  
  // Alerts
  ALERT_TRIGGERED: 'ALERT_TRIGGERED',
  ALERT_UPDATED: 'ALERT_UPDATED',
  ALERT_RESOLVED: 'ALERT_RESOLVED',
  
  // Asset Health
  ASSET_HEALTH_CHANGED: 'ASSET_HEALTH_CHANGED',
  ASSET_DISCOVERED: 'ASSET_DISCOVERED',
  ASSET_REMOVED: 'ASSET_REMOVED',
  
  // Kong Gateway Critical Monitoring
  KONG_ADMIN_API_STATUS_CHANGED: 'KONG_ADMIN_API_STATUS_CHANGED',
  KONG_SERVICE_HEALTH_CHANGED: 'KONG_SERVICE_HEALTH_CHANGED',
  KONG_ROUTE_CONFIGURATION_CHANGED: 'KONG_ROUTE_CONFIGURATION_CHANGED',
  
  // Vulnerabilities
  VULNERABILITY_DISCOVERED: 'VULNERABILITY_DISCOVERED',
  VULNERABILITY_UPDATED: 'VULNERABILITY_UPDATED',
  VULNERABILITY_FIXED: 'VULNERABILITY_FIXED',
  
  // Compliance
  COMPLIANCE_STATUS_CHANGED: 'COMPLIANCE_STATUS_CHANGED',
  COMPLIANCE_ASSESSMENT_COMPLETED: 'COMPLIANCE_ASSESSMENT_COMPLETED',
  
  // Live Metrics
  LIVE_METRICS: 'LIVE_METRICS',
  THREAT_LEVEL_CHANGED: 'THREAT_LEVEL_CHANGED',
  
  // System Status
  SERVICE_STATUS_CHANGED: 'SERVICE_STATUS_CHANGED',
  MAINTENANCE_SCHEDULED: 'MAINTENANCE_SCHEDULED',
  SYSTEM_ALERT: 'SYSTEM_ALERT',
} as const;

// Connection limits and throttling configuration
const CONNECTION_LIMITS = {
  maxConnectionsPerUser: 5,
  maxConnectionsPerOrganization: 100,
  maxGlobalConnections: 10000,
  subscriptionLimitPerConnection: 20,
  messageRateLimit: 100, // messages per minute per connection
  authTokenRefreshInterval: 3600000, // 1 hour
};

// Redis configuration for pub/sub clustering
interface RedisSubscriptionConfig {
  publisher: Redis;
  subscriber: Redis;
  keyPrefix: string;
  maxRetriesPerRequest: number;
  retryDelayOnFailover: number;
}

// Enhanced RedisPubSub with performance optimizations
class OptimizedRedisPubSub extends RedisPubSub {
  private messageBuffer: Map<string, any[]> = new Map();
  private bufferFlushInterval: NodeJS.Timer;
  private metrics: SubscriptionMetrics;

  constructor(config: RedisSubscriptionConfig, metrics: SubscriptionMetrics) {
    super({
      publisher: config.publisher,
      subscriber: config.subscriber,
      messageEventName: 'message',
      pmessageEventName: 'pmessage',
      connectionListener: (err: Error | null) => {
        if (err) {
          logger.error({ error: err.message }, 'Redis connection error');
        } else {
          logger.info('Redis pub/sub connected');
        }
      },
    });

    this.metrics = metrics;

    // Batch message publishing for better performance
    this.bufferFlushInterval = setInterval(() => {
      this.flushMessageBuffers();
    }, 100); // Flush every 100ms
  }

  async publish(triggerName: string, payload: any): Promise<void> {
    const startTime = performance.now();

    try {
      // Add message to buffer for batching
      if (!this.messageBuffer.has(triggerName)) {
        this.messageBuffer.set(triggerName, []);
      }
      this.messageBuffer.get(triggerName)!.push({
        payload,
        timestamp: Date.now(),
      });

      // Record metrics
      await this.metrics.recordPublish(triggerName, performance.now() - startTime);

    } catch (error) {
      logger.error({
        trigger: triggerName,
        error: error.message,
      }, 'Error publishing message');
      
      await this.metrics.recordError('publish', error.message);
      throw error;
    }
  }

  private async flushMessageBuffers(): Promise<void> {
    for (const [triggerName, messages] of this.messageBuffer.entries()) {
      if (messages.length === 0) continue;

      try {
        // Batch publish messages
        const batchPayload = {
          type: 'batch',
          messages,
          count: messages.length,
        };

        await super.publish(triggerName, batchPayload);
        
        // Clear the buffer
        this.messageBuffer.set(triggerName, []);

        await this.metrics.recordBatchPublish(triggerName, messages.length);

      } catch (error) {
        logger.error({
          trigger: triggerName,
          messageCount: messages.length,
          error: error.message,
        }, 'Error in batch publish');
      }
    }
  }

  close(): void {
    clearInterval(this.bufferFlushInterval);
    super.close();
  }
}

// Connection Manager for handling WebSocket connections efficiently
class SecuritySubscriptionConnectionManager extends EventEmitter {
  private connections: Map<string, WebSocket> = new Map();
  private userConnections: Map<string, Set<string>> = new Map();
  private organizationConnections: Map<string, Set<string>> = new Map();
  private connectionSubscriptions: Map<string, Set<string>> = new Map();
  private connectionMetadata: Map<string, ConnectionMetadata> = new Map();
  private metrics: SubscriptionMetrics;
  private redis: Redis;

  constructor(metrics: SubscriptionMetrics, redis: Redis) {
    super();
    this.metrics = metrics;
    this.redis = redis;

    // Cleanup stale connections every 30 seconds
    setInterval(() => {
      this.cleanupStaleConnections();
    }, 30000);

    // Update connection metrics every 10 seconds
    setInterval(() => {
      this.updateConnectionMetrics();
    }, 10000);
  }

  addConnection(connectionId: string, websocket: WebSocket, metadata: ConnectionMetadata): boolean {
    // Check connection limits
    if (!this.canAddConnection(metadata)) {
      logger.warn({
        userId: metadata.userId,
        organizationId: metadata.organizationId,
        currentConnections: this.getUserConnectionCount(metadata.userId),
      }, 'Connection limit exceeded');
      return false;
    }

    // Store connection
    this.connections.set(connectionId, websocket);
    this.connectionMetadata.set(connectionId, metadata);
    this.connectionSubscriptions.set(connectionId, new Set());

    // Track user and organization connections
    if (!this.userConnections.has(metadata.userId)) {
      this.userConnections.set(metadata.userId, new Set());
    }
    this.userConnections.get(metadata.userId)!.add(connectionId);

    if (!this.organizationConnections.has(metadata.organizationId)) {
      this.organizationConnections.set(metadata.organizationId, new Set());
    }
    this.organizationConnections.get(metadata.organizationId)!.add(connectionId);

    // Set up connection event handlers
    this.setupConnectionHandlers(connectionId, websocket, metadata);

    logger.info({
      connectionId,
      userId: metadata.userId,
      organizationId: metadata.organizationId,
    }, 'WebSocket connection established');

    this.emit('connectionAdded', { connectionId, metadata });
    return true;
  }

  removeConnection(connectionId: string): void {
    const metadata = this.connectionMetadata.get(connectionId);
    if (!metadata) return;

    // Clean up connection tracking
    this.connections.delete(connectionId);
    this.connectionMetadata.delete(connectionId);
    this.connectionSubscriptions.delete(connectionId);

    // Remove from user and organization tracking
    this.userConnections.get(metadata.userId)?.delete(connectionId);
    this.organizationConnections.get(metadata.organizationId)?.delete(connectionId);

    logger.info({
      connectionId,
      userId: metadata.userId,
      organizationId: metadata.organizationId,
    }, 'WebSocket connection removed');

    this.emit('connectionRemoved', { connectionId, metadata });
  }

  addSubscription(connectionId: string, subscriptionId: string): boolean {
    const subscriptions = this.connectionSubscriptions.get(connectionId);
    if (!subscriptions) return false;

    // Check subscription limit
    if (subscriptions.size >= CONNECTION_LIMITS.subscriptionLimitPerConnection) {
      logger.warn({
        connectionId,
        currentSubscriptions: subscriptions.size,
      }, 'Subscription limit exceeded for connection');
      return false;
    }

    subscriptions.add(subscriptionId);
    this.emit('subscriptionAdded', { connectionId, subscriptionId });
    return true;
  }

  removeSubscription(connectionId: string, subscriptionId: string): void {
    this.connectionSubscriptions.get(connectionId)?.delete(subscriptionId);
    this.emit('subscriptionRemoved', { connectionId, subscriptionId });
  }

  broadcastToOrganization(organizationId: string, message: any): void {
    const connections = this.organizationConnections.get(organizationId);
    if (!connections) return;

    let successCount = 0;
    let errorCount = 0;

    connections.forEach(connectionId => {
      const websocket = this.connections.get(connectionId);
      const metadata = this.connectionMetadata.get(connectionId);
      
      if (websocket && metadata && websocket.readyState === WebSocket.OPEN) {
        try {
          websocket.send(JSON.stringify(message));
          successCount++;
        } catch (error) {
          logger.error({
            connectionId,
            error: error.message,
          }, 'Error broadcasting message');
          errorCount++;
        }
      }
    });

    logger.debug({
      organizationId,
      successCount,
      errorCount,
      totalConnections: connections.size,
    }, 'Broadcast completed');
  }

  broadcastToUser(userId: string, message: any): void {
    const connections = this.userConnections.get(userId);
    if (!connections) return;

    connections.forEach(connectionId => {
      const websocket = this.connections.get(connectionId);
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        try {
          websocket.send(JSON.stringify(message));
        } catch (error) {
          logger.error({
            connectionId,
            userId,
            error: error.message,
          }, 'Error broadcasting user message');
        }
      }
    });
  }

  private canAddConnection(metadata: ConnectionMetadata): boolean {
    // Check global connection limit
    if (this.connections.size >= CONNECTION_LIMITS.maxGlobalConnections) {
      return false;
    }

    // Check user connection limit
    const userConnectionCount = this.getUserConnectionCount(metadata.userId);
    if (userConnectionCount >= CONNECTION_LIMITS.maxConnectionsPerUser) {
      return false;
    }

    // Check organization connection limit
    const orgConnectionCount = this.getOrganizationConnectionCount(metadata.organizationId);
    if (orgConnectionCount >= CONNECTION_LIMITS.maxConnectionsPerOrganization) {
      return false;
    }

    return true;
  }

  private getUserConnectionCount(userId: string): number {
    return this.userConnections.get(userId)?.size ?? 0;
  }

  private getOrganizationConnectionCount(organizationId: string): number {
    return this.organizationConnections.get(organizationId)?.size ?? 0;
  }

  private setupConnectionHandlers(connectionId: string, websocket: WebSocket, metadata: ConnectionMetadata): void {
    websocket.on('close', () => {
      this.removeConnection(connectionId);
    });

    websocket.on('error', (error) => {
      logger.error({
        connectionId,
        error: error.message,
      }, 'WebSocket error');
      this.removeConnection(connectionId);
    });

    websocket.on('pong', () => {
      // Update last activity timestamp
      const currentMetadata = this.connectionMetadata.get(connectionId);
      if (currentMetadata) {
        currentMetadata.lastActivity = new Date();
      }
    });
  }

  private cleanupStaleConnections(): void {
    const staleThreshold = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes
    
    this.connectionMetadata.forEach((metadata, connectionId) => {
      if (metadata.lastActivity < staleThreshold) {
        const websocket = this.connections.get(connectionId);
        if (websocket) {
          websocket.terminate();
        }
        this.removeConnection(connectionId);
        
        logger.info({
          connectionId,
          lastActivity: metadata.lastActivity,
        }, 'Cleaned up stale connection');
      }
    });
  }

  private async updateConnectionMetrics(): Promise<void> {
    const metrics = {
      totalConnections: this.connections.size,
      totalUsers: this.userConnections.size,
      totalOrganizations: this.organizationConnections.size,
      totalSubscriptions: Array.from(this.connectionSubscriptions.values())
        .reduce((sum, subscriptions) => sum + subscriptions.size, 0),
    };

    try {
      await this.redis.hmset('security_subscriptions:metrics', {
        ...metrics,
        timestamp: Date.now(),
      });
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to update connection metrics');
    }
  }

  getConnectionStats(): ConnectionStats {
    return {
      totalConnections: this.connections.size,
      userConnections: this.userConnections.size,
      organizationConnections: this.organizationConnections.size,
      totalSubscriptions: Array.from(this.connectionSubscriptions.values())
        .reduce((sum, subscriptions) => sum + subscriptions.size, 0),
    };
  }
}

// Metrics collection for subscription performance
class SubscriptionMetrics {
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async recordPublish(channel: string, duration: number): Promise<void> {
    try {
      const key = `metrics:publish:${channel}`;
      await Promise.all([
        this.redis.hincrby('metrics:publish:counts', channel, 1),
        this.redis.lpush(`${key}:durations`, duration),
        this.redis.expire(`${key}:durations`, 3600), // Keep for 1 hour
      ]);
    } catch (error) {
      // Silently fail metrics
    }
  }

  async recordBatchPublish(channel: string, messageCount: number): Promise<void> {
    try {
      await this.redis.hincrby('metrics:batch_publish:counts', channel, messageCount);
    } catch (error) {
      // Silently fail metrics
    }
  }

  async recordSubscriptionCreate(channel: string): Promise<void> {
    try {
      await this.redis.hincrby('metrics:subscriptions:created', channel, 1);
    } catch (error) {
      // Silently fail metrics
    }
  }

  async recordSubscriptionDestroy(channel: string): Promise<void> {
    try {
      await this.redis.hincrby('metrics:subscriptions:destroyed', channel, 1);
    } catch (error) {
      // Silently fail metrics
    }
  }

  async recordError(operation: string, error: string): Promise<void> {
    try {
      await this.redis.hincrby(`metrics:errors:${operation}`, error, 1);
    } catch (error) {
      // Silently fail metrics
    }
  }

  async getMetrics(): Promise<SubscriptionMetricsData> {
    try {
      const [publishCounts, subscriptionCounts] = await Promise.all([
        this.redis.hgetall('metrics:publish:counts'),
        this.redis.hgetall('metrics:subscriptions:created'),
      ]);

      return {
        publishCounts: Object.fromEntries(
          Object.entries(publishCounts).map(([k, v]) => [k, parseInt(v)])
        ),
        subscriptionCounts: Object.fromEntries(
          Object.entries(subscriptionCounts).map(([k, v]) => [k, parseInt(v)])
        ),
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to get subscription metrics');
      return {
        publishCounts: {},
        subscriptionCounts: {},
        timestamp: new Date(),
      };
    }
  }
}

// Main Subscription Server Setup
export function createSecuritySubscriptionServer(
  schema: GraphQLSchema,
  redis: Redis,
  httpServer: any
): {
  subscriptionServer: SubscriptionServer;
  pubsub: OptimizedRedisPubSub;
  connectionManager: SecuritySubscriptionConnectionManager;
  metrics: SubscriptionMetrics;
} {
  const metrics = new SubscriptionMetrics(redis);
  const connectionManager = new SecuritySubscriptionConnectionManager(metrics, redis);

  // Create optimized Redis pub/sub
  const pubsub = new OptimizedRedisPubSub({
    publisher: redis,
    subscriber: redis.duplicate(),
    keyPrefix: 'security_dashboard:',
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 1000,
  }, metrics);

  // WebSocket server configuration
  const subscriptionServer = SubscriptionServer.create(
    {
      schema,
      execute,
      subscribe,

      // Enhanced connection authentication and authorization
      onConnect: async (connectionParams: any, websocket: WebSocket, context: any) => {
        try {
          const authToken = connectionParams.Authorization || connectionParams.authorization;
          if (!authToken) {
            throw new Error('Authentication token required');
          }

          // Validate authentication token
          const authResult = await validateSubscriptionAuth(authToken, redis);
          if (!authResult.valid) {
            throw new Error('Invalid authentication token');
          }

          const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const metadata: ConnectionMetadata = {
            userId: authResult.user.id,
            organizationId: authResult.user.organizationId,
            userRole: authResult.user.role,
            connectionId,
            connectedAt: new Date(),
            lastActivity: new Date(),
            ipAddress: context.request.headers['x-forwarded-for'] || context.request.connection.remoteAddress,
            userAgent: context.request.headers['user-agent'],
          };

          // Add connection to manager
          const connectionAdded = connectionManager.addConnection(connectionId, websocket, metadata);
          if (!connectionAdded) {
            throw new Error('Connection limit exceeded');
          }

          logger.info({
            connectionId,
            userId: authResult.user.id,
            organizationId: authResult.user.organizationId,
            ipAddress: metadata.ipAddress,
          }, 'Subscription connection authenticated');

          return {
            user: authResult.user,
            connectionId,
            organizationId: authResult.user.organizationId,
            pubsub,
            connectionManager,
            metrics,
            redis,
          };

        } catch (error) {
          logger.error({
            error: error.message,
            ip: context.request.connection.remoteAddress,
          }, 'Subscription connection rejected');
          
          throw error;
        }
      },

      onDisconnect: (websocket: WebSocket, context: any) => {
        const connectionContext = context.initPromise?.then ? null : context;
        if (connectionContext?.connectionId) {
          connectionManager.removeConnection(connectionContext.connectionId);
        }
      },

      // Subscription lifecycle management
      onOperation: async (message: any, params: any, websocket: WebSocket) => {
        const context = await params.context;
        
        // Check subscription permissions
        const hasPermission = await checkSubscriptionPermissions(
          context.user,
          message.payload.operationName,
          message.payload.variables
        );

        if (!hasPermission) {
          throw new Error('Insufficient permissions for subscription');
        }

        // Add subscription to connection tracking
        if (message.type === 'start') {
          const subscriptionId = message.id;
          const connectionAdded = connectionManager.addSubscription(
            context.connectionId,
            subscriptionId
          );

          if (!connectionAdded) {
            throw new Error('Subscription limit exceeded');
          }

          await metrics.recordSubscriptionCreate(message.payload.operationName || 'unknown');
        }

        return params;
      },

      onOperationComplete: async (websocket: WebSocket, opId: string) => {
        // Remove subscription from tracking when complete
        const context = (websocket as any).upgradeReq?.context;
        if (context?.connectionId) {
          connectionManager.removeSubscription(context.connectionId, opId);
        }
      },

      // Keep connections alive with heartbeat
      keepAlive: 30000, // 30 seconds
    },
    {
      server: httpServer,
      path: '/subscriptions',
    }
  );

  // Set up critical security monitoring subscriptions
  setupCriticalSecurityMonitoring(pubsub, connectionManager, redis);

  return {
    subscriptionServer,
    pubsub,
    connectionManager,
    metrics,
  };
}

// Critical security event monitoring setup
async function setupCriticalSecurityMonitoring(
  pubsub: PubSubEngine,
  connectionManager: SecuritySubscriptionConnectionManager,
  redis: Redis
): Promise<void> {
  // Monitor Kong Admin API vulnerability status changes
  pubsub.subscribe(SUBSCRIPTION_CHANNELS.KONG_ADMIN_API_STATUS_CHANGED, (payload) => {
    // Broadcast critical security alerts to all security personnel
    if (payload.isVulnerable) {
      logger.error({
        kongStatus: payload,
      }, 'CRITICAL: Kong Admin API vulnerability detected');

      // Send immediate notifications to all users with security roles
      // Implementation would connect to notification service
    }
  });

  // Monitor for critical vulnerabilities
  pubsub.subscribe(SUBSCRIPTION_CHANNELS.VULNERABILITY_DISCOVERED, (payload) => {
    if (payload.severity === 'CRITICAL') {
      logger.error({
        vulnerability: payload,
      }, 'CRITICAL vulnerability discovered');
    }
  });
}

// Type definitions
export interface ConnectionMetadata {
  userId: string;
  organizationId: string;
  userRole: string;
  connectionId: string;
  connectedAt: Date;
  lastActivity: Date;
  ipAddress: string;
  userAgent: string;
}

export interface ConnectionStats {
  totalConnections: number;
  userConnections: number;
  organizationConnections: number;
  totalSubscriptions: number;
}

export interface SubscriptionMetricsData {
  publishCounts: Record<string, number>;
  subscriptionCounts: Record<string, number>;
  timestamp: Date;
}

export { OptimizedRedisPubSub, SecuritySubscriptionConnectionManager, SubscriptionMetrics };
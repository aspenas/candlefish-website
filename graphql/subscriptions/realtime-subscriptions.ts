/**
 * Candlefish AI - Real-time WebSocket Subscriptions
 * Philosophy: Live collaboration with intelligent connection management
 */

import { PubSub } from 'graphql-subscriptions';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { withFilter } from 'graphql-subscriptions';
import Redis from 'ioredis';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { execute, subscribe } from 'graphql';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import jwt from 'jsonwebtoken';
import { performance } from 'perf_hooks';

// Redis configuration for pub/sub
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
};

// Create Redis pub/sub instance
export const pubsub = new RedisPubSub({
  publisher: new Redis(redisConfig),
  subscriber: new Redis(redisConfig),
});

// Alternative in-memory pub/sub for development
export const localPubSub = new PubSub();

// Use Redis pub/sub in production, local pub/sub in development
export const activePubSub = process.env.NODE_ENV === 'production' ? pubsub : localPubSub;

// Connection management
interface WebSocketConnection {
  id: string;
  userId: string;
  projectId?: string;
  collaborationId?: string;
  connectedAt: Date;
  lastActivity: Date;
  subscriptions: Set<string>;
  metadata: Record<string, any>;
}

class ConnectionManager {
  private connections = new Map<string, WebSocketConnection>();
  private userConnections = new Map<string, Set<string>>(); // userId -> connection IDs
  private projectConnections = new Map<string, Set<string>>(); // projectId -> connection IDs
  private collaborationConnections = new Map<string, Set<string>>(); // collaborationId -> connection IDs
  private redis: Redis;
  private rateLimiter: RateLimiterRedis;

  constructor() {
    this.redis = new Redis(redisConfig);

    // Rate limiter for subscriptions per user
    this.rateLimiter = new RateLimiterRedis({
      storeClient: this.redis,
      keyPrefix: 'ws_sub_rl',
      points: 50, // Max 50 subscriptions
      duration: 3600, // Per hour
      blockDuration: 300, // Block for 5 minutes
    });
  }

  addConnection(connection: WebSocketConnection) {
    this.connections.set(connection.id, connection);

    // Track by user
    if (!this.userConnections.has(connection.userId)) {
      this.userConnections.set(connection.userId, new Set());
    }
    this.userConnections.get(connection.userId)!.add(connection.id);

    // Track by project if applicable
    if (connection.projectId) {
      if (!this.projectConnections.has(connection.projectId)) {
        this.projectConnections.set(connection.projectId, new Set());
      }
      this.projectConnections.get(connection.projectId)!.add(connection.id);
    }

    // Track by collaboration if applicable
    if (connection.collaborationId) {
      if (!this.collaborationConnections.has(connection.collaborationId)) {
        this.collaborationConnections.set(connection.collaborationId, new Set());
      }
      this.collaborationConnections.get(connection.collaborationId)!.add(connection.id);
    }

    console.log(`WebSocket connection added: ${connection.id} (user: ${connection.userId})`);
  }

  removeConnection(connectionId: string) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Remove from user connections
    const userConnections = this.userConnections.get(connection.userId);
    if (userConnections) {
      userConnections.delete(connectionId);
      if (userConnections.size === 0) {
        this.userConnections.delete(connection.userId);
      }
    }

    // Remove from project connections
    if (connection.projectId) {
      const projectConnections = this.projectConnections.get(connection.projectId);
      if (projectConnections) {
        projectConnections.delete(connectionId);
        if (projectConnections.size === 0) {
          this.projectConnections.delete(connection.projectId);
        }
      }
    }

    // Remove from collaboration connections
    if (connection.collaborationId) {
      const collaborationConnections = this.collaborationConnections.get(connection.collaborationId);
      if (collaborationConnections) {
        collaborationConnections.delete(connectionId);
        if (collaborationConnections.size === 0) {
          this.collaborationConnections.delete(connection.collaborationId);
        }
      }
    }

    this.connections.delete(connectionId);
    console.log(`WebSocket connection removed: ${connectionId}`);
  }

  getConnectionsByUser(userId: string): WebSocketConnection[] {
    const connectionIds = this.userConnections.get(userId) || new Set();
    return Array.from(connectionIds)
      .map(id => this.connections.get(id)!)
      .filter(Boolean);
  }

  getConnectionsByProject(projectId: string): WebSocketConnection[] {
    const connectionIds = this.projectConnections.get(projectId) || new Set();
    return Array.from(connectionIds)
      .map(id => this.connections.get(id)!)
      .filter(Boolean);
  }

  getConnectionsByCollaboration(collaborationId: string): WebSocketConnection[] {
    const connectionIds = this.collaborationConnections.get(collaborationId) || new Set();
    return Array.from(connectionIds)
      .map(id => this.connections.get(id)!)
      .filter(Boolean);
  }

  updateActivity(connectionId: string) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.lastActivity = new Date();
    }
  }

  addSubscription(connectionId: string, subscriptionName: string) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.subscriptions.add(subscriptionName);
    }
  }

  removeSubscription(connectionId: string, subscriptionName: string) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.subscriptions.delete(subscriptionName);
    }
  }

  async checkRateLimit(userId: string): Promise<boolean> {
    try {
      await this.rateLimiter.consume(userId);
      return true;
    } catch {
      return false;
    }
  }

  getStats() {
    return {
      totalConnections: this.connections.size,
      totalUsers: this.userConnections.size,
      activeProjects: this.projectConnections.size,
      activeCollaborations: this.collaborationConnections.size,
    };
  }

  // Cleanup stale connections (called periodically)
  cleanupStaleConnections(maxIdleTime = 30 * 60 * 1000) { // 30 minutes
    const now = new Date();
    const staleConnections: string[] = [];

    this.connections.forEach((connection, id) => {
      const idleTime = now.getTime() - connection.lastActivity.getTime();
      if (idleTime > maxIdleTime) {
        staleConnections.push(id);
      }
    });

    staleConnections.forEach(id => this.removeConnection(id));

    if (staleConnections.length > 0) {
      console.log(`Cleaned up ${staleConnections.length} stale connections`);
    }
  }
}

// Global connection manager instance
export const connectionManager = new ConnectionManager();

// Subscription channels
export const SUBSCRIPTION_CHANNELS = {
  // Authentication events
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',

  // Workshop events
  WORKSHOP_UPDATE: 'WORKSHOP_UPDATE',
  PROJECT_STATUS_CHANGED: 'PROJECT_STATUS_CHANGED',
  QUEUE_ITEM_ASSIGNED: 'QUEUE_ITEM_ASSIGNED',
  QUEUE_ITEM_COMPLETED: 'QUEUE_ITEM_COMPLETED',

  // Collaboration events
  COLLABORATION_STARTED: 'COLLABORATION_STARTED',
  COLLABORATION_ENDED: 'COLLABORATION_ENDED',
  COLLABORATION_PARTICIPANT_JOINED: 'COLLABORATION_PARTICIPANT_JOINED',
  COLLABORATION_PARTICIPANT_LEFT: 'COLLABORATION_PARTICIPANT_LEFT',

  // Document editing events
  DOCUMENT_EDIT: 'DOCUMENT_EDIT',
  DOCUMENT_CURSOR_UPDATE: 'DOCUMENT_CURSOR_UPDATE',
  DOCUMENT_CONFLICT: 'DOCUMENT_CONFLICT',
  DOCUMENT_CONFLICT_RESOLVED: 'DOCUMENT_CONFLICT_RESOLVED',

  // Chat events
  CHAT_MESSAGE: 'CHAT_MESSAGE',
  CHAT_MESSAGE_REACTION: 'CHAT_MESSAGE_REACTION',
  CHAT_TYPING: 'CHAT_TYPING',

  // System events
  SYSTEM_NOTIFICATION: 'SYSTEM_NOTIFICATION',
  SYSTEM_STATUS_UPDATE: 'SYSTEM_STATUS_UPDATE',

  // Partner events
  PARTNER_STATUS_CHANGED: 'PARTNER_STATUS_CHANGED',
  OPERATOR_AVAILABILITY_CHANGED: 'OPERATOR_AVAILABILITY_CHANGED',

  // User presence
  USER_PRESENCE_UPDATE: 'USER_PRESENCE_UPDATE',
} as const;

// Subscription resolvers with intelligent filtering
export const subscriptionResolvers = {
  // Workshop subscriptions
  workshopUpdate: {
    subscribe: withFilter(
      () => activePubSub.asyncIterator([SUBSCRIPTION_CHANNELS.WORKSHOP_UPDATE]),
      (payload, variables, context) => {
        if (!context.user) return false;

        const update = payload.workshopUpdate;

        // Filter by project ID if specified
        if (variables.projectId) {
          return update.projectId === variables.projectId;
        }

        // Filter by user ID if specified
        if (variables.userId) {
          return update.userId === variables.userId || update.affectedUsers?.includes(variables.userId);
        }

        // Check if user has access to this update based on their role and project access
        return hasAccessToProject(context.user, update.projectId);
      }
    ),
  },

  queueUpdate: {
    subscribe: withFilter(
      () => activePubSub.asyncIterator([
        SUBSCRIPTION_CHANNELS.QUEUE_ITEM_ASSIGNED,
        SUBSCRIPTION_CHANNELS.QUEUE_ITEM_COMPLETED
      ]),
      (payload, variables, context) => {
        if (!context.user) return false;

        const queueItem = payload.queueUpdate;

        // Filter by assignee if specified
        if (variables.assigneeId) {
          return queueItem.assigneeId === variables.assigneeId;
        }

        // User can see queue items they created or are assigned to
        return queueItem.assigneeId === context.user.id ||
               queueItem.requestorId === context.user.id ||
               hasAccessToProject(context.user, queueItem.projectId);
      }
    ),
  },

  // Real-time collaboration subscriptions
  collaborationUpdate: {
    subscribe: withFilter(
      () => activePubSub.asyncIterator([
        SUBSCRIPTION_CHANNELS.COLLABORATION_STARTED,
        SUBSCRIPTION_CHANNELS.COLLABORATION_ENDED,
        SUBSCRIPTION_CHANNELS.COLLABORATION_PARTICIPANT_JOINED,
        SUBSCRIPTION_CHANNELS.COLLABORATION_PARTICIPANT_LEFT
      ]),
      (payload, variables, context) => {
        if (!context.user) return false;

        const collaboration = payload.collaborationUpdate;

        // Only participants can receive collaboration updates
        return collaboration.participantIds?.includes(context.user.id) ||
               collaboration.id === variables.collaborationId;
      }
    ),
  },

  documentEdit: {
    subscribe: withFilter(
      () => activePubSub.asyncIterator([SUBSCRIPTION_CHANNELS.DOCUMENT_EDIT]),
      (payload, variables, context) => {
        if (!context.user) return false;

        const edit = payload.documentEdit;

        // Don't send edit events back to the user who made the edit
        if (edit.userId === context.user.id) return false;

        return edit.documentId === variables.documentId &&
               hasAccessToDocument(context.user, edit.documentId);
      }
    ),
  },

  cursorUpdate: {
    subscribe: withFilter(
      () => activePubSub.asyncIterator([SUBSCRIPTION_CHANNELS.DOCUMENT_CURSOR_UPDATE]),
      (payload, variables, context) => {
        if (!context.user) return false;

        const cursor = payload.cursorUpdate;

        // Don't send cursor updates back to the user who moved the cursor
        if (cursor.userId === context.user.id) return false;

        return cursor.documentId === variables.documentId &&
               hasAccessToDocument(context.user, cursor.documentId);
      }
    ),
  },

  chatMessage: {
    subscribe: withFilter(
      () => activePubSub.asyncIterator([SUBSCRIPTION_CHANNELS.CHAT_MESSAGE]),
      (payload, variables, context) => {
        if (!context.user) return false;

        const message = payload.chatMessage;

        return message.collaborationId === variables.collaborationId &&
               hasAccessToCollaboration(context.user, variables.collaborationId);
      }
    ),
  },

  // System subscriptions
  systemNotification: {
    subscribe: withFilter(
      () => activePubSub.asyncIterator([SUBSCRIPTION_CHANNELS.SYSTEM_NOTIFICATION]),
      (payload, variables, context) => {
        if (!context.user) return false;

        const notification = payload.systemNotification;

        // Send to specific user or broadcast to all users based on role
        return notification.userId === context.user.id ||
               (notification.broadcast && hasRequiredRole(context.user, notification.minRole));
      }
    ),
  },

  userPresence: {
    subscribe: withFilter(
      () => activePubSub.asyncIterator([SUBSCRIPTION_CHANNELS.USER_PRESENCE_UPDATE]),
      (payload, variables, context) => {
        if (!context.user) return false;

        const presence = payload.userPresence;

        // Filter by project if specified
        if (variables.projectId) {
          return presence.projectId === variables.projectId &&
                 hasAccessToProject(context.user, variables.projectId);
        }

        return true; // Global presence updates
      }
    ),
  ),
};

// Helper functions for access control
function hasAccessToProject(user: any, projectId: string): boolean {
  // Implement project access logic based on user role and project membership
  return true; // Placeholder
}

function hasAccessToDocument(user: any, documentId: string): boolean {
  // Implement document access logic
  return true; // Placeholder
}

function hasAccessToCollaboration(user: any, collaborationId: string): boolean {
  // Implement collaboration access logic
  return true; // Placeholder
}

function hasRequiredRole(user: any, minRole: string): boolean {
  const roleHierarchy = ['VIEWER', 'OPERATOR', 'PARTNER', 'EDITOR', 'ADMIN'];
  const userRoleIndex = roleHierarchy.indexOf(user.role);
  const minRoleIndex = roleHierarchy.indexOf(minRole);
  return userRoleIndex >= minRoleIndex;
}

// WebSocket server setup
export function createWebSocketServer(server: any, schema: any) {
  const wsServer = new WebSocketServer({
    server,
    path: '/graphql',
  });

  const serverCleanup = useServer(
    {
      schema,
      execute,
      subscribe,

      // Connection authentication
      onConnect: async (ctx) => {
        const { connectionParams } = ctx;

        // Authenticate the connection
        const token = connectionParams?.authorization?.replace('Bearer ', '');
        if (!token) {
          throw new Error('Missing authentication token');
        }

        try {
          const user = jwt.verify(token, process.env.JWT_SECRET!) as any;

          // Rate limiting check
          const canConnect = await connectionManager.checkRateLimit(user.userId);
          if (!canConnect) {
            throw new Error('Rate limit exceeded');
          }

          // Add connection to manager
          const connection: WebSocketConnection = {
            id: ctx.connectionParams?.connectionId || generateConnectionId(),
            userId: user.userId,
            projectId: connectionParams?.projectId,
            collaborationId: connectionParams?.collaborationId,
            connectedAt: new Date(),
            lastActivity: new Date(),
            subscriptions: new Set(),
            metadata: {
              userAgent: ctx.extra?.request?.headers['user-agent'],
              ipAddress: ctx.extra?.request?.socket?.remoteAddress,
            },
          };

          connectionManager.addConnection(connection);

          // Store user in context for resolvers
          ctx.extra.user = user;
          ctx.extra.connectionId = connection.id;

          console.log(`WebSocket authenticated: ${user.userId}`);
          return true;
        } catch (error) {
          console.error('WebSocket authentication failed:', error.message);
          throw new Error('Invalid authentication token');
        }
      },

      // Connection cleanup
      onDisconnect: (ctx, code, reason) => {
        if (ctx.extra?.connectionId) {
          connectionManager.removeConnection(ctx.extra.connectionId);
        }
        console.log(`WebSocket disconnected: ${code} ${reason}`);
      },

      // Subscription lifecycle
      onSubscribe: (ctx, msg) => {
        const startTime = performance.now();

        // Update connection activity
        if (ctx.extra?.connectionId) {
          connectionManager.updateActivity(ctx.extra.connectionId);
          connectionManager.addSubscription(ctx.extra.connectionId, msg.payload.operationName || 'unknown');
        }

        // Add user to context
        const context = {
          user: ctx.extra?.user,
          connectionId: ctx.extra?.connectionId,
          pubsub: activePubSub,
          connectionManager,
        };

        return {
          ...msg.payload,
          contextValue: context,
        };
      },

      onComplete: (ctx, msg) => {
        // Remove subscription from connection
        if (ctx.extra?.connectionId) {
          connectionManager.removeSubscription(ctx.extra.connectionId, msg.payload?.operationName || 'unknown');
        }
      },

      onError: (ctx, msg, errors) => {
        console.error('WebSocket subscription error:', errors);
      },
    },
    wsServer
  );

  // Periodic cleanup of stale connections
  const cleanupInterval = setInterval(() => {
    connectionManager.cleanupStaleConnections();
  }, 5 * 60 * 1000); // Every 5 minutes

  // Cleanup function
  return () => {
    clearInterval(cleanupInterval);
    serverCleanup.dispose();
  };
}

// Utility functions for publishing events
export class EventPublisher {
  static async publishWorkshopUpdate(update: any) {
    await activePubSub.publish(SUBSCRIPTION_CHANNELS.WORKSHOP_UPDATE, {
      workshopUpdate: update,
    });
  }

  static async publishQueueUpdate(queueItem: any) {
    const channel = queueItem.status === 'ASSIGNED'
      ? SUBSCRIPTION_CHANNELS.QUEUE_ITEM_ASSIGNED
      : SUBSCRIPTION_CHANNELS.QUEUE_ITEM_COMPLETED;

    await activePubSub.publish(channel, {
      queueUpdate: queueItem,
    });
  }

  static async publishCollaborationUpdate(collaboration: any) {
    await activePubSub.publish(SUBSCRIPTION_CHANNELS.COLLABORATION_STARTED, {
      collaborationUpdate: collaboration,
    });
  }

  static async publishDocumentEdit(edit: any) {
    await activePubSub.publish(SUBSCRIPTION_CHANNELS.DOCUMENT_EDIT, {
      documentEdit: edit,
    });
  }

  static async publishCursorUpdate(cursor: any) {
    await activePubSub.publish(SUBSCRIPTION_CHANNELS.DOCUMENT_CURSOR_UPDATE, {
      cursorUpdate: cursor,
    });
  }

  static async publishChatMessage(message: any) {
    await activePubSub.publish(SUBSCRIPTION_CHANNELS.CHAT_MESSAGE, {
      chatMessage: message,
    });
  }

  static async publishSystemNotification(notification: any) {
    await activePubSub.publish(SUBSCRIPTION_CHANNELS.SYSTEM_NOTIFICATION, {
      systemNotification: notification,
    });
  }

  static async publishUserPresence(presence: any) {
    await activePubSub.publish(SUBSCRIPTION_CHANNELS.USER_PRESENCE_UPDATE, {
      userPresence: presence,
    });
  }
}

// Generate unique connection ID
function generateConnectionId(): string {
  return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Health check for WebSocket server
export function getWebSocketHealth() {
  const stats = connectionManager.getStats();

  return {
    healthy: true,
    connections: stats,
    pubsub: {
      type: process.env.NODE_ENV === 'production' ? 'redis' : 'memory',
      connected: true, // You could implement actual health checks
    },
    timestamp: new Date().toISOString(),
  };
}

export default {
  pubsub: activePubSub,
  connectionManager,
  subscriptionResolvers,
  createWebSocketServer,
  EventPublisher,
  getWebSocketHealth,
};

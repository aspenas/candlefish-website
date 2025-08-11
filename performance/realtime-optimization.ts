/**
 * Real-time Performance Optimization
 * WebSocket and Subscription Management
 */

import { WebSocket } from 'ws';
import { EventEmitter } from 'events';
import { Redis } from 'ioredis';

// ===========================
// 1. WebSocket Connection Management
// ===========================

export class OptimizedWebSocketManager {
  private connections: Map<string, WebSocketConnection> = new Map();
  private connectionPools: Map<string, WebSocketConnection[]> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts: Map<string, number> = new Map();
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second

  /**
   * Create optimized WebSocket connection with pooling
   */
  createConnection(
    userId: string,
    endpoint: string,
    options: ConnectionOptions = {}
  ): WebSocketConnection {
    // Check if connection already exists
    if (this.connections.has(userId)) {
      return this.connections.get(userId)!;
    }

    // Create new connection with optimizations
    const ws = new WebSocket(endpoint, {
      perMessageDeflate: {
        zlibDeflateOptions: {
          chunkSize: 1024,
          memLevel: 7,
          level: 3,
        },
        zlibInflateOptions: {
          chunkSize: 10 * 1024,
        },
        clientNoContextTakeover: true,
        serverNoContextTakeover: true,
        serverMaxWindowBits: 10,
        clientMaxWindowBits: 10,
        threshold: 1024, // Only compress messages larger than 1KB
      },
      handshakeTimeout: 5000,
      maxPayload: 100 * 1024 * 1024, // 100MB max payload
    });

    const connection = new WebSocketConnection(userId, ws, options);

    // Set up connection event handlers
    this.setupConnectionHandlers(connection);

    // Add to connections map
    this.connections.set(userId, connection);

    // Start heartbeat if not already running
    if (!this.heartbeatInterval) {
      this.startHeartbeat();
    }

    return connection;
  }

  /**
   * Setup connection event handlers with reconnection logic
   */
  private setupConnectionHandlers(connection: WebSocketConnection) {
    const ws = connection.getSocket();
    const userId = connection.getUserId();

    ws.on('open', () => {
      console.log(`WebSocket connected for user: ${userId}`);
      this.reconnectAttempts.set(userId, 0);
      connection.setStatus('connected');

      // Subscribe to user's channels
      this.subscribeToChannels(connection);
    });

    ws.on('close', (code, reason) => {
      console.log(`WebSocket closed for user: ${userId}`, { code, reason });
      connection.setStatus('disconnected');

      // Attempt reconnection with exponential backoff
      this.attemptReconnection(connection);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for user: ${userId}`, error);
      connection.setStatus('error');
    });

    ws.on('message', (data) => {
      this.handleMessage(connection, data);
    });

    // Handle pong responses for heartbeat
    ws.on('pong', () => {
      connection.updateLastPong();
    });
  }

  /**
   * Exponential backoff reconnection strategy
   */
  private attemptReconnection(connection: WebSocketConnection) {
    const userId = connection.getUserId();
    const attempts = this.reconnectAttempts.get(userId) || 0;

    if (attempts >= this.maxReconnectAttempts) {
      console.error(`Max reconnection attempts reached for user: ${userId}`);
      this.connections.delete(userId);
      return;
    }

    const delay = Math.min(this.reconnectDelay * Math.pow(2, attempts), 30000);

    setTimeout(() => {
      console.log(`Attempting reconnection for user: ${userId} (attempt ${attempts + 1})`);
      this.reconnectAttempts.set(userId, attempts + 1);

      // Create new connection
      const endpoint = connection.getEndpoint();
      const options = connection.getOptions();
      this.createConnection(userId, endpoint, options);
    }, delay);
  }

  /**
   * Heartbeat mechanism to detect stale connections
   */
  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.connections.forEach((connection, userId) => {
        const ws = connection.getSocket();

        if (ws.readyState === WebSocket.OPEN) {
          // Check if connection is stale
          const lastPong = connection.getLastPong();
          const now = Date.now();

          if (now - lastPong > 60000) { // 60 seconds timeout
            console.warn(`Stale connection detected for user: ${userId}`);
            ws.terminate();
            this.connections.delete(userId);
          } else {
            // Send ping
            ws.ping();
          }
        }
      });
    }, 30000); // Every 30 seconds
  }

  /**
   * Message handling with batching and throttling
   */
  private messageQueue: Map<string, QueuedMessage[]> = new Map();
  private messageBatchInterval: NodeJS.Timeout | null = null;

  private handleMessage(connection: WebSocketConnection, data: any) {
    const message = this.parseMessage(data);

    if (!message) return;

    // Add to queue for batching
    const userId = connection.getUserId();
    if (!this.messageQueue.has(userId)) {
      this.messageQueue.set(userId, []);
    }

    this.messageQueue.get(userId)!.push({
      message,
      timestamp: Date.now(),
    });

    // Start batch processing if not already running
    if (!this.messageBatchInterval) {
      this.startBatchProcessing();
    }
  }

  /**
   * Batch message processing for efficiency
   */
  private startBatchProcessing() {
    this.messageBatchInterval = setInterval(() => {
      this.messageQueue.forEach((messages, userId) => {
        if (messages.length === 0) return;

        const connection = this.connections.get(userId);
        if (!connection) return;

        // Process messages in batch
        const batch = messages.splice(0, 100); // Process up to 100 messages
        this.processBatch(connection, batch);
      });

      // Stop batch processing if no more messages
      const hasMessages = Array.from(this.messageQueue.values())
        .some(queue => queue.length > 0);

      if (!hasMessages && this.messageBatchInterval) {
        clearInterval(this.messageBatchInterval);
        this.messageBatchInterval = null;
      }
    }, 100); // Process every 100ms
  }

  private processBatch(connection: WebSocketConnection, batch: QueuedMessage[]) {
    // Group messages by type for efficient processing
    const grouped = batch.reduce((acc, item) => {
      const type = item.message.type;
      if (!acc[type]) acc[type] = [];
      acc[type].push(item.message);
      return acc;
    }, {} as Record<string, any[]>);

    // Process each group
    Object.entries(grouped).forEach(([type, messages]) => {
      connection.emit(type, messages);
    });
  }

  private parseMessage(data: any): any {
    try {
      if (typeof data === 'string') {
        return JSON.parse(data);
      }
      return data;
    } catch (error) {
      console.error('Failed to parse message:', error);
      return null;
    }
  }

  private subscribeToChannels(connection: WebSocketConnection) {
    // Implementation would subscribe to user's channels
  }

  /**
   * Cleanup and close all connections
   */
  cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.messageBatchInterval) {
      clearInterval(this.messageBatchInterval);
    }

    this.connections.forEach(connection => {
      connection.close();
    });

    this.connections.clear();
  }
}

// ===========================
// 2. Subscription Optimization
// ===========================

export class SubscriptionManager {
  private subscriptions: Map<string, Subscription> = new Map();
  private subscriptionGroups: Map<string, Set<string>> = new Map();
  private deduplicationCache: Map<string, any> = new Map();
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });
  }

  /**
   * Create optimized subscription with deduplication
   */
  subscribe(
    subscriptionId: string,
    query: string,
    variables: any,
    callback: (data: any) => void
  ): Subscription {
    // Generate cache key for deduplication
    const cacheKey = this.generateCacheKey(query, variables);

    // Check if identical subscription already exists
    if (this.deduplicationCache.has(cacheKey)) {
      const existingId = this.deduplicationCache.get(cacheKey);
      const existing = this.subscriptions.get(existingId);

      if (existing) {
        // Share existing subscription
        existing.addListener(subscriptionId, callback);
        return existing;
      }
    }

    // Create new subscription
    const subscription = new Subscription(
      subscriptionId,
      query,
      variables,
      callback
    );

    this.subscriptions.set(subscriptionId, subscription);
    this.deduplicationCache.set(cacheKey, subscriptionId);

    // Group related subscriptions
    this.groupSubscription(subscription);

    // Start subscription
    this.startSubscription(subscription);

    return subscription;
  }

  /**
   * Group subscriptions for batch updates
   */
  private groupSubscription(subscription: Subscription) {
    const groupKey = this.getGroupKey(subscription);

    if (!this.subscriptionGroups.has(groupKey)) {
      this.subscriptionGroups.set(groupKey, new Set());
    }

    this.subscriptionGroups.get(groupKey)!.add(subscription.getId());
  }

  private getGroupKey(subscription: Subscription): string {
    // Group by query type (e.g., dashboard, widget, metrics)
    const query = subscription.getQuery();
    if (query.includes('dashboard')) return 'dashboard';
    if (query.includes('widget')) return 'widget';
    if (query.includes('metrics')) return 'metrics';
    return 'other';
  }

  /**
   * Start subscription with Redis pub/sub
   */
  private async startSubscription(subscription: Subscription) {
    const channel = this.getChannelName(subscription);

    // Subscribe to Redis channel
    await this.redis.subscribe(channel);

    // Handle messages
    this.redis.on('message', (receivedChannel, message) => {
      if (receivedChannel === channel) {
        this.handleSubscriptionUpdate(subscription, message);
      }
    });
  }

  /**
   * Handle subscription updates with batching
   */
  private updateBatch: Map<string, any[]> = new Map();
  private batchTimeout: NodeJS.Timeout | null = null;

  private handleSubscriptionUpdate(subscription: Subscription, message: string) {
    const data = JSON.parse(message);
    const subscriptionId = subscription.getId();

    // Add to batch
    if (!this.updateBatch.has(subscriptionId)) {
      this.updateBatch.set(subscriptionId, []);
    }

    this.updateBatch.get(subscriptionId)!.push(data);

    // Schedule batch processing
    if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => {
        this.processBatchUpdates();
        this.batchTimeout = null;
      }, 50); // 50ms batching window
    }
  }

  /**
   * Process batched updates
   */
  private processBatchUpdates() {
    this.updateBatch.forEach((updates, subscriptionId) => {
      const subscription = this.subscriptions.get(subscriptionId);

      if (subscription) {
        // Merge updates if possible
        const merged = this.mergeUpdates(updates);
        subscription.notify(merged);
      }
    });

    this.updateBatch.clear();
  }

  private mergeUpdates(updates: any[]): any {
    // Implementation would merge updates intelligently
    // For example, combining multiple metric updates
    if (updates.length === 1) return updates[0];

    return {
      type: 'batch',
      updates: updates,
      count: updates.length,
    };
  }

  private generateCacheKey(query: string, variables: any): string {
    return `${query}:${JSON.stringify(variables)}`;
  }

  private getChannelName(subscription: Subscription): string {
    // Generate Redis channel name based on subscription
    return `subscription:${subscription.getId()}`;
  }

  /**
   * Unsubscribe and cleanup
   */
  unsubscribe(subscriptionId: string) {
    const subscription = this.subscriptions.get(subscriptionId);

    if (subscription) {
      // Unsubscribe from Redis
      const channel = this.getChannelName(subscription);
      this.redis.unsubscribe(channel);

      // Remove from maps
      this.subscriptions.delete(subscriptionId);

      // Remove from deduplication cache
      const cacheKey = this.generateCacheKey(
        subscription.getQuery(),
        subscription.getVariables()
      );
      this.deduplicationCache.delete(cacheKey);

      // Remove from groups
      this.subscriptionGroups.forEach(group => {
        group.delete(subscriptionId);
      });
    }
  }
}

// ===========================
// 3. Event Streaming Optimization
// ===========================

export class EventStreamOptimizer {
  private eventBuffer: EventBuffer;
  private compressionEnabled = true;
  private eventDeduplication = new Map<string, number>();

  constructor() {
    this.eventBuffer = new EventBuffer(1000); // Buffer up to 1000 events
  }

  /**
   * Process event stream with buffering and compression
   */
  processEventStream(events: Event[]): ProcessedEventBatch {
    // Deduplicate events
    const deduplicated = this.deduplicateEvents(events);

    // Buffer events
    deduplicated.forEach(event => this.eventBuffer.add(event));

    // Check if buffer should be flushed
    if (this.eventBuffer.shouldFlush()) {
      return this.flushBuffer();
    }

    return { events: [], compressed: false, size: 0 };
  }

  /**
   * Deduplicate events within time window
   */
  private deduplicateEvents(events: Event[]): Event[] {
    const now = Date.now();
    const deduplicationWindow = 1000; // 1 second

    return events.filter(event => {
      const key = this.getEventKey(event);
      const lastSeen = this.eventDeduplication.get(key);

      if (lastSeen && now - lastSeen < deduplicationWindow) {
        return false; // Skip duplicate
      }

      this.eventDeduplication.set(key, now);
      return true;
    });
  }

  private getEventKey(event: Event): string {
    return `${event.type}:${event.id}:${JSON.stringify(event.data)}`;
  }

  /**
   * Flush buffer with optional compression
   */
  private flushBuffer(): ProcessedEventBatch {
    const events = this.eventBuffer.flush();

    if (events.length === 0) {
      return { events: [], compressed: false, size: 0 };
    }

    // Compress if beneficial
    const serialized = JSON.stringify(events);
    const originalSize = Buffer.byteLength(serialized);

    if (this.compressionEnabled && originalSize > 1024) {
      const compressed = this.compressData(serialized);

      if (compressed.length < originalSize * 0.9) {
        return {
          events: compressed,
          compressed: true,
          size: compressed.length,
          originalSize,
        };
      }
    }

    return {
      events,
      compressed: false,
      size: originalSize,
    };
  }

  private compressData(data: string): Buffer {
    // Implementation would use zlib or similar
    return Buffer.from(data);
  }

  /**
   * Clean up old deduplication entries
   */
  cleanupDeduplication() {
    const now = Date.now();
    const maxAge = 60000; // 1 minute

    this.eventDeduplication.forEach((timestamp, key) => {
      if (now - timestamp > maxAge) {
        this.eventDeduplication.delete(key);
      }
    });
  }
}

// ===========================
// 4. Push Notification Batching
// ===========================

export class PushNotificationOptimizer {
  private notificationQueue: Map<string, Notification[]> = new Map();
  private batchInterval: NodeJS.Timeout | null = null;
  private batchSize = 100;
  private batchDelay = 1000; // 1 second

  /**
   * Queue notification for batching
   */
  queueNotification(userId: string, notification: Notification) {
    if (!this.notificationQueue.has(userId)) {
      this.notificationQueue.set(userId, []);
    }

    const queue = this.notificationQueue.get(userId)!;

    // Check for duplicate notifications
    const isDuplicate = queue.some(n =>
      n.type === notification.type &&
      JSON.stringify(n.data) === JSON.stringify(notification.data) &&
      Date.now() - n.timestamp < 5000 // Within 5 seconds
    );

    if (!isDuplicate) {
      queue.push(notification);

      // Start batch processing if not running
      if (!this.batchInterval) {
        this.startBatchProcessing();
      }
    }
  }

  /**
   * Start batch processing interval
   */
  private startBatchProcessing() {
    this.batchInterval = setInterval(() => {
      this.processBatches();

      // Stop if no more notifications
      if (this.notificationQueue.size === 0 && this.batchInterval) {
        clearInterval(this.batchInterval);
        this.batchInterval = null;
      }
    }, this.batchDelay);
  }

  /**
   * Process notification batches
   */
  private async processBatches() {
    const promises: Promise<void>[] = [];

    this.notificationQueue.forEach((notifications, userId) => {
      if (notifications.length === 0) return;

      // Process in batches
      while (notifications.length > 0) {
        const batch = notifications.splice(0, this.batchSize);
        promises.push(this.sendBatch(userId, batch));
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Send notification batch
   */
  private async sendBatch(userId: string, notifications: Notification[]) {
    // Group by priority
    const grouped = notifications.reduce((acc, notif) => {
      const priority = notif.priority || 'normal';
      if (!acc[priority]) acc[priority] = [];
      acc[priority].push(notif);
      return acc;
    }, {} as Record<string, Notification[]>);

    // Send high priority immediately
    if (grouped.high) {
      await this.sendNotifications(userId, grouped.high, 'high');
    }

    // Batch normal and low priority
    if (grouped.normal) {
      await this.sendNotifications(userId, grouped.normal, 'normal');
    }

    if (grouped.low) {
      // Further delay low priority
      setTimeout(() => {
        this.sendNotifications(userId, grouped.low, 'low');
      }, 5000);
    }
  }

  private async sendNotifications(
    userId: string,
    notifications: Notification[],
    priority: string
  ) {
    // Implementation would send to push notification service
    console.log(`Sending ${notifications.length} ${priority} priority notifications to ${userId}`);
  }
}

// ===========================
// 5. Performance Metrics
// ===========================

export interface RealtimePerformanceMetrics {
  websocket: {
    activeConnections: number;
    messageRate: number;
    averageLatency: number;
    reconnectionRate: number;
    compressionRatio: number;
  };
  subscriptions: {
    activeSubscriptions: number;
    updateRate: number;
    deduplicationRate: number;
    batchingEfficiency: number;
  };
  events: {
    eventsPerSecond: number;
    bufferUtilization: number;
    compressionSavings: number;
  };
  notifications: {
    queueSize: number;
    batchSize: number;
    deliveryRate: number;
    failureRate: number;
  };
}

// Helper Classes

class WebSocketConnection extends EventEmitter {
  private status: 'connecting' | 'connected' | 'disconnected' | 'error' = 'connecting';
  private lastPong: number = Date.now();

  constructor(
    private userId: string,
    private ws: WebSocket,
    private options: ConnectionOptions
  ) {
    super();
  }

  getUserId(): string { return this.userId; }
  getSocket(): WebSocket { return this.ws; }
  getEndpoint(): string { return this.options.endpoint || ''; }
  getOptions(): ConnectionOptions { return this.options; }
  getStatus(): string { return this.status; }
  setStatus(status: typeof this.status) { this.status = status; }
  getLastPong(): number { return this.lastPong; }
  updateLastPong() { this.lastPong = Date.now(); }

  close() {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
  }
}

class Subscription {
  private listeners: Map<string, (data: any) => void> = new Map();

  constructor(
    private id: string,
    private query: string,
    private variables: any,
    callback: (data: any) => void
  ) {
    this.listeners.set(id, callback);
  }

  getId(): string { return this.id; }
  getQuery(): string { return this.query; }
  getVariables(): any { return this.variables; }

  addListener(id: string, callback: (data: any) => void) {
    this.listeners.set(id, callback);
  }

  notify(data: any) {
    this.listeners.forEach(callback => callback(data));
  }
}

class EventBuffer {
  private buffer: Event[] = [];
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  add(event: Event) {
    this.buffer.push(event);
  }

  shouldFlush(): boolean {
    return this.buffer.length >= this.maxSize;
  }

  flush(): Event[] {
    const events = [...this.buffer];
    this.buffer = [];
    return events;
  }
}

// Type definitions
interface ConnectionOptions {
  endpoint?: string;
  reconnect?: boolean;
  maxReconnectAttempts?: number;
}

interface QueuedMessage {
  message: any;
  timestamp: number;
}

interface Event {
  id: string;
  type: string;
  data: any;
  timestamp: number;
}

interface ProcessedEventBatch {
  events: any;
  compressed: boolean;
  size: number;
  originalSize?: number;
}

interface Notification {
  type: string;
  title: string;
  body: string;
  data?: any;
  priority?: 'high' | 'normal' | 'low';
  timestamp: number;
}

export default {
  OptimizedWebSocketManager,
  SubscriptionManager,
  EventStreamOptimizer,
  PushNotificationOptimizer,
};

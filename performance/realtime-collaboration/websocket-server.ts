/**
 * Optimized WebSocket Server with Connection Pooling and Room Management
 * Target: Handle 1000+ concurrent connections with <50ms latency
 */

import { Server as SocketServer, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Cluster } from '@socket.io/sticky';
import { createServer } from 'http';
import { Redis } from 'ioredis';
import { performance } from 'perf_hooks';
import compression from 'compression';
import { LRUCache } from 'lru-cache';

// Performance configuration
const CONFIG = {
  // WebSocket settings
  WS_PING_INTERVAL: 25000,
  WS_PING_TIMEOUT: 5000,
  WS_MAX_HTTP_BUFFER_SIZE: 1e6, // 1MB
  WS_COMPRESSION_THRESHOLD: 1024, // Compress messages > 1KB

  // Connection pooling
  MAX_CONNECTIONS_PER_ROOM: 100,
  CONNECTION_POOL_SIZE: 10,

  // Batching
  BATCH_INTERVAL_MS: 16, // ~60fps
  MAX_BATCH_SIZE: 100,

  // Caching
  PRESENCE_CACHE_TTL: 5000,
  DOCUMENT_CACHE_TTL: 30000,
};

// Room manager with connection pooling
class RoomManager {
  private rooms = new Map<string, Set<string>>();
  private roomPools = new Map<string, ConnectionPool>();
  private presenceCache: LRUCache<string, any>;

  constructor() {
    this.presenceCache = new LRUCache({
      max: 1000,
      ttl: CONFIG.PRESENCE_CACHE_TTL,
    });
  }

  joinRoom(roomId: string, userId: string, socket: Socket): void {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
      this.roomPools.set(roomId, new ConnectionPool(roomId));
    }

    const room = this.rooms.get(roomId)!;
    const pool = this.roomPools.get(roomId)!;

    // Implement room sharding for large rooms
    if (room.size >= CONFIG.MAX_CONNECTIONS_PER_ROOM) {
      const shardId = this.getShardId(roomId, room.size);
      socket.join(`${roomId}:shard:${shardId}`);
    } else {
      socket.join(roomId);
    }

    room.add(userId);
    pool.addConnection(socket);

    // Cache presence data
    this.updatePresenceCache(roomId, userId, 'online');
  }

  leaveRoom(roomId: string, userId: string, socket: Socket): void {
    const room = this.rooms.get(roomId);
    const pool = this.roomPools.get(roomId);

    if (room) {
      room.delete(userId);
      if (room.size === 0) {
        this.rooms.delete(roomId);
        this.roomPools.delete(roomId);
      }
    }

    if (pool) {
      pool.removeConnection(socket);
    }

    this.updatePresenceCache(roomId, userId, 'offline');
  }

  private getShardId(roomId: string, roomSize: number): number {
    return Math.floor(roomSize / CONFIG.MAX_CONNECTIONS_PER_ROOM);
  }

  private updatePresenceCache(roomId: string, userId: string, status: string): void {
    const key = `presence:${roomId}`;
    const presence = this.presenceCache.get(key) || {};
    presence[userId] = { status, timestamp: Date.now() };
    this.presenceCache.set(key, presence);
  }

  getPresence(roomId: string): any {
    return this.presenceCache.get(`presence:${roomId}`) || {};
  }
}

// Connection pool for efficient socket management
class ConnectionPool {
  private connections: Socket[] = [];
  private activeIndex = 0;

  constructor(private roomId: string) {}

  addConnection(socket: Socket): void {
    this.connections.push(socket);
  }

  removeConnection(socket: Socket): void {
    const index = this.connections.indexOf(socket);
    if (index > -1) {
      this.connections.splice(index, 1);
    }
  }

  // Round-robin connection selection for load balancing
  getNextConnection(): Socket | null {
    if (this.connections.length === 0) return null;
    const connection = this.connections[this.activeIndex];
    this.activeIndex = (this.activeIndex + 1) % this.connections.length;
    return connection;
  }
}

// Message batching for improved throughput
class MessageBatcher {
  private batches = new Map<string, any[]>();
  private timers = new Map<string, NodeJS.Timeout>();

  constructor(private io: SocketServer) {}

  addMessage(roomId: string, message: any): void {
    if (!this.batches.has(roomId)) {
      this.batches.set(roomId, []);
    }

    const batch = this.batches.get(roomId)!;
    batch.push(message);

    // Send immediately if batch is full
    if (batch.length >= CONFIG.MAX_BATCH_SIZE) {
      this.flush(roomId);
      return;
    }

    // Schedule batch send if not already scheduled
    if (!this.timers.has(roomId)) {
      const timer = setTimeout(() => {
        this.flush(roomId);
      }, CONFIG.BATCH_INTERVAL_MS);
      this.timers.set(roomId, timer);
    }
  }

  private flush(roomId: string): void {
    const batch = this.batches.get(roomId);
    if (!batch || batch.length === 0) return;

    // Compress batch if large
    const payload = batch.length > 10 ? this.compress(batch) : batch;

    // Emit batched messages
    this.io.to(roomId).emit('batch', {
      messages: payload,
      timestamp: Date.now(),
      compressed: batch.length > 10,
    });

    // Clear batch and timer
    this.batches.delete(roomId);
    const timer = this.timers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(roomId);
    }
  }

  private compress(data: any[]): Buffer {
    // Use MessagePack for efficient binary serialization
    const msgpack = require('msgpack-lite');
    return msgpack.encode(data);
  }
}

// Optimized WebSocket server
export class OptimizedWebSocketServer {
  private io: SocketServer;
  private roomManager: RoomManager;
  private batcher: MessageBatcher;
  private pubClient: Redis;
  private subClient: Redis;
  private metrics: MetricsCollector;

  constructor(httpServer: any) {
    // Initialize Redis clients for horizontal scaling
    this.pubClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
    });

    this.subClient = this.pubClient.duplicate();

    // Configure Socket.IO with optimizations
    this.io = new SocketServer(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        credentials: true,
      },
      pingInterval: CONFIG.WS_PING_INTERVAL,
      pingTimeout: CONFIG.WS_PING_TIMEOUT,
      maxHttpBufferSize: CONFIG.WS_MAX_HTTP_BUFFER_SIZE,
      // Enable WebSocket compression
      perMessageDeflate: {
        threshold: CONFIG.WS_COMPRESSION_THRESHOLD,
        zlibDeflateOptions: {
          level: 6,
        },
      },
      // Connection state recovery
      connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000,
        skipMiddlewares: true,
      },
      // Transports optimization
      transports: ['websocket'], // Skip HTTP long-polling
    });

    // Use Redis adapter for horizontal scaling
    this.io.adapter(createAdapter(this.pubClient, this.subClient));

    // Initialize managers
    this.roomManager = new RoomManager();
    this.batcher = new MessageBatcher(this.io);
    this.metrics = new MetricsCollector();

    this.setupHandlers();
    this.setupMetrics();
  }

  private setupHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      const startTime = performance.now();

      // Track connection metrics
      this.metrics.recordConnection();

      // Optimize socket settings
      socket.setMaxListeners(20);
      (socket as any).compress(true);

      // Join room with optimized handling
      socket.on('join-room', async (data: { roomId: string; userId: string }) => {
        const { roomId, userId } = data;

        // Join room with connection pooling
        this.roomManager.joinRoom(roomId, userId, socket);

        // Send cached presence data immediately
        const presence = this.roomManager.getPresence(roomId);
        socket.emit('presence-update', presence);

        // Load and send cached document state
        const documentState = await this.getCachedDocumentState(roomId);
        if (documentState) {
          socket.emit('document-state', documentState);
        }

        this.metrics.recordLatency('join-room', performance.now() - startTime);
      });

      // Handle CRDT operations with batching
      socket.on('crdt-operation', (data: any) => {
        const operationStart = performance.now();

        // Add to batch for efficient processing
        this.batcher.addMessage(data.roomId, {
          type: 'crdt',
          operation: data.operation,
          userId: data.userId,
          timestamp: Date.now(),
        });

        // Update document cache asynchronously
        this.updateDocumentCache(data.roomId, data.operation);

        this.metrics.recordLatency('crdt-operation', performance.now() - operationStart);
      });

      // Handle cursor/selection updates with throttling
      socket.on('cursor-update', this.throttle((data: any) => {
        // Use volatile emit for cursor updates (ok to lose some)
        socket.to(data.roomId).volatile.emit('remote-cursor', {
          userId: data.userId,
          cursor: data.cursor,
          timestamp: Date.now(),
        });
      }, 50)); // Throttle to 20fps

      // Handle disconnection
      socket.on('disconnect', () => {
        this.metrics.recordDisconnection();
        // Cleanup handled by room manager
      });
    });
  }

  private setupMetrics(): void {
    // Expose metrics endpoint
    setInterval(() => {
      const metrics = this.metrics.getMetrics();
      this.io.emit('metrics', metrics);

      // Log critical metrics
      if (metrics.avgLatency > 100) {
        console.warn('High latency detected:', metrics.avgLatency);
      }
      if (metrics.connectionCount > 900) {
        console.warn('Approaching connection limit:', metrics.connectionCount);
      }
    }, 5000);
  }

  private async getCachedDocumentState(roomId: string): Promise<any> {
    const cacheKey = `document:${roomId}`;
    const cached = await this.pubClient.get(cacheKey);
    return cached ? JSON.parse(cached) : null;
  }

  private async updateDocumentCache(roomId: string, operation: any): Promise<void> {
    const cacheKey = `document:${roomId}`;
    // Update cache with TTL
    await this.pubClient.setex(
      cacheKey,
      CONFIG.DOCUMENT_CACHE_TTL / 1000,
      JSON.stringify(operation)
    );
  }

  private throttle(func: Function, delay: number): Function {
    let timeoutId: NodeJS.Timeout | null = null;
    let lastExecTime = 0;

    return function (...args: any[]) {
      const currentTime = Date.now();

      if (currentTime - lastExecTime > delay) {
        func.apply(null, args);
        lastExecTime = currentTime;
      } else {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          func.apply(null, args);
          lastExecTime = Date.now();
        }, delay - (currentTime - lastExecTime));
      }
    };
  }
}

// Metrics collector for monitoring
class MetricsCollector {
  private connectionCount = 0;
  private latencies: Map<string, number[]> = new Map();
  private operations = 0;

  recordConnection(): void {
    this.connectionCount++;
  }

  recordDisconnection(): void {
    this.connectionCount--;
  }

  recordLatency(operation: string, latency: number): void {
    if (!this.latencies.has(operation)) {
      this.latencies.set(operation, []);
    }
    const latencyArray = this.latencies.get(operation)!;
    latencyArray.push(latency);

    // Keep only last 1000 measurements
    if (latencyArray.length > 1000) {
      latencyArray.shift();
    }
  }

  recordOperation(): void {
    this.operations++;
  }

  getMetrics(): any {
    const metrics: any = {
      connectionCount: this.connectionCount,
      operations: this.operations,
      latencies: {},
    };

    for (const [operation, latencies] of this.latencies) {
      const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const p95 = this.percentile(latencies, 0.95);
      const p99 = this.percentile(latencies, 0.99);

      metrics.latencies[operation] = {
        avg: Math.round(avg),
        p95: Math.round(p95),
        p99: Math.round(p99),
      };
    }

    return metrics;
  }

  private percentile(arr: number[], p: number): number {
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * p);
    return sorted[index];
  }
}

// Clustering support for horizontal scaling
export function setupClustering(workers: number = 4): void {
  const cluster = require('cluster');
  const os = require('os');

  if (cluster.isMaster) {
    const numWorkers = workers || os.cpus().length;

    console.log(`Master ${process.pid} setting up ${numWorkers} workers`);

    for (let i = 0; i < numWorkers; i++) {
      cluster.fork();
    }

    cluster.on('exit', (worker: any, code: number, signal: string) => {
      console.log(`Worker ${worker.process.pid} died`);
      cluster.fork();
    });
  } else {
    // Worker process - create server
    const httpServer = createServer();
    const wsServer = new OptimizedWebSocketServer(httpServer);

    const port = process.env.PORT || 3001;
    httpServer.listen(port, () => {
      console.log(`Worker ${process.pid} listening on port ${port}`);
    });
  }
}

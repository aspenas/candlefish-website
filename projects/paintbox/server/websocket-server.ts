/**
 * WebSocket Server for Real-time Calculations
 * Handles room-based architecture with presence management
 */

import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { logger } from '../lib/logging/simple-logger';
import { getFormulaCache } from '../lib/cache/formula-cache';
import { Decimal } from 'decimal.js';
import jwt from 'jsonwebtoken';

// Types
interface User {
  id: string;
  name: string;
  role: 'estimator' | 'viewer' | 'admin';
}

interface EstimateRoom {
  id: string;
  estimateId: string;
  users: Map<string, User>;
  lastActivity: number;
  calculationVersion: number;
}

interface CalculationUpdate {
  roomId: string;
  formulaId: string;
  inputs: Record<string, any>;
  result: any;
  timestamp: number;
  userId: string;
  delta?: boolean;
}

interface PresenceUpdate {
  roomId: string;
  users: User[];
  timestamp: number;
}

// Configuration
const PORT = process.env.WEBSOCKET_PORT || 3001;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret';
const ROOM_IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const CALCULATION_DEBOUNCE = 100; // 100ms

class WebSocketServer {
  private io: Server;
  private rooms = new Map<string, EstimateRoom>();
  private userSockets = new Map<string, Set<string>>(); // userId -> socketIds
  private calculationQueue = new Map<string, NodeJS.Timeout>();
  private formulaCache = getFormulaCache();
  private pubClient: Redis;
  private subClient: Redis;

  constructor() {
    // Create HTTP server
    const httpServer = createServer();

    // Initialize Socket.IO with CORS
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
      upgradeTimeout: 30000,
      maxHttpBufferSize: 1e6, // 1MB
    });

    // Setup Redis adapter for horizontal scaling
    this.pubClient = new Redis(REDIS_URL);
    this.subClient = new Redis(REDIS_URL);

    this.pubClient.on('error', (err) => {
      logger.error('Redis pub client error', { error: err.message });
    });

    this.subClient.on('error', (err) => {
      logger.error('Redis sub client error', { error: err.message });
    });

    this.io.adapter(createAdapter(this.pubClient, this.subClient));

    // Setup event handlers
    this.setupEventHandlers();

    // Start server
    httpServer.listen(PORT, () => {
      logger.info(`WebSocket server listening on port ${PORT}`);
    });

    // Cleanup idle rooms periodically
    setInterval(() => this.cleanupIdleRooms(), 60000); // Every minute

    // Send heartbeat to all clients
    setInterval(() => this.sendHeartbeat(), HEARTBEAT_INTERVAL);
  }

  private setupEventHandlers(): void {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;

        if (!token) {
          return next(new Error('Authentication required'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, JWT_SECRET) as any;

        socket.data.user = {
          id: decoded.userId,
          name: decoded.name || 'Unknown',
          role: decoded.role || 'viewer',
        };

        next();
      } catch (error) {
        logger.error('Socket authentication failed', {
          error: error instanceof Error ? error.message : String(error)
        });
        next(new Error('Invalid authentication'));
      }
    });

    // Connection handler
    this.io.on('connection', (socket: Socket) => {
      const user = socket.data.user as User;

      logger.info('Client connected', {
        socketId: socket.id,
        userId: user.id,
        userName: user.name
      });

      // Track user socket
      this.addUserSocket(user.id, socket.id);

      // Socket event handlers
      socket.on('join-room', (data) => this.handleJoinRoom(socket, data));
      socket.on('leave-room', (data) => this.handleLeaveRoom(socket, data));
      socket.on('calculation-update', (data) => this.handleCalculationUpdate(socket, data));
      socket.on('request-sync', (data) => this.handleSyncRequest(socket, data));
      socket.on('cursor-position', (data) => this.handleCursorPosition(socket, data));
      socket.on('field-focus', (data) => this.handleFieldFocus(socket, data));
      socket.on('disconnect', () => this.handleDisconnect(socket));
      socket.on('error', (error) => this.handleError(socket, error));
    });
  }

  private async handleJoinRoom(socket: Socket, data: { roomId: string; estimateId: string }): Promise<void> {
    const { roomId, estimateId } = data;
    const user = socket.data.user as User;

    try {
      // Leave any existing rooms
      const currentRooms = Array.from(socket.rooms).filter(r => r !== socket.id);
      for (const room of currentRooms) {
        await socket.leave(room);
      }

      // Join new room
      await socket.join(roomId);

      // Create or update room
      let room = this.rooms.get(roomId);
      if (!room) {
        room = {
          id: roomId,
          estimateId,
          users: new Map(),
          lastActivity: Date.now(),
          calculationVersion: 0,
        };
        this.rooms.set(roomId, room);
      }

      // Add user to room
      room.users.set(user.id, user);
      room.lastActivity = Date.now();

      // Send room state to joining user
      socket.emit('room-joined', {
        roomId,
        users: Array.from(room.users.values()),
        calculationVersion: room.calculationVersion,
      });

      // Notify others in room
      socket.to(roomId).emit('user-joined', {
        user,
        timestamp: Date.now(),
      });

      // Send presence update
      this.broadcastPresence(roomId);

      logger.info('User joined room', {
        roomId,
        userId: user.id,
        totalUsers: room.users.size
      });
    } catch (error) {
      logger.error('Failed to join room', {
        roomId,
        userId: user.id,
        error: error instanceof Error ? error.message : String(error)
      });

      socket.emit('error', {
        type: 'join-room-failed',
        message: 'Failed to join room',
      });
    }
  }

  private async handleLeaveRoom(socket: Socket, data: { roomId: string }): Promise<void> {
    const { roomId } = data;
    const user = socket.data.user as User;

    try {
      await socket.leave(roomId);

      const room = this.rooms.get(roomId);
      if (room) {
        room.users.delete(user.id);
        room.lastActivity = Date.now();

        // Notify others
        socket.to(roomId).emit('user-left', {
          userId: user.id,
          timestamp: Date.now(),
        });

        // Update presence
        this.broadcastPresence(roomId);

        // Remove room if empty
        if (room.users.size === 0) {
          this.rooms.delete(roomId);
        }
      }

      logger.info('User left room', {
        roomId,
        userId: user.id
      });
    } catch (error) {
      logger.error('Failed to leave room', {
        roomId,
        userId: user.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async handleCalculationUpdate(socket: Socket, data: CalculationUpdate): Promise<void> {
    const { roomId, formulaId, inputs, delta } = data;
    const user = socket.data.user as User;

    try {
      // Check if user is in room
      if (!socket.rooms.has(roomId)) {
        socket.emit('error', {
          type: 'not-in-room',
          message: 'You must join the room first',
        });
        return;
      }

      const room = this.rooms.get(roomId);
      if (!room) {
        socket.emit('error', {
          type: 'room-not-found',
          message: 'Room not found',
        });
        return;
      }

      // Debounce calculations
      const debounceKey = `${roomId}:${formulaId}`;
      const existingTimeout = this.calculationQueue.get(debounceKey);

      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      const timeout = setTimeout(async () => {
        try {
          // Perform calculation
          const startTime = Date.now();

          // Check cache first
          let result = await this.formulaCache.get({
            formulaId,
            variables: inputs,
          });

          if (!result) {
            // Calculate if not cached
            result = await this.calculateFormula(formulaId, inputs);

            // Cache the result
            await this.formulaCache.set(
              { formulaId, variables: inputs },
              result,
              300 // 5 minute TTL
            );
          }

          const executionTime = Date.now() - startTime;

          // Update room version
          room.calculationVersion++;
          room.lastActivity = Date.now();

          // Prepare update payload
          const update: CalculationUpdate = {
            roomId,
            formulaId,
            inputs,
            result: result.value,
            timestamp: Date.now(),
            userId: user.id,
            delta,
          };

          // Broadcast to room (including sender for confirmation)
          this.io.to(roomId).emit('calculation-result', update);

          // Log performance metrics
          if (executionTime > 100) {
            logger.warn('Slow calculation', {
              formulaId,
              executionTime,
              cached: !!result,
            });
          }

          logger.debug('Calculation completed', {
            roomId,
            formulaId,
            executionTime,
            version: room.calculationVersion,
          });
        } catch (error) {
          logger.error('Calculation failed', {
            formulaId,
            error: error instanceof Error ? error.message : String(error),
          });

          socket.emit('calculation-error', {
            formulaId,
            error: 'Calculation failed',
            timestamp: Date.now(),
          });
        }

        this.calculationQueue.delete(debounceKey);
      }, CALCULATION_DEBOUNCE);

      this.calculationQueue.set(debounceKey, timeout);
    } catch (error) {
      logger.error('Failed to handle calculation update', {
        roomId,
        formulaId,
        error: error instanceof Error ? error.message : String(error),
      });

      socket.emit('error', {
        type: 'calculation-failed',
        message: 'Failed to process calculation',
      });
    }
  }

  private async handleSyncRequest(socket: Socket, data: { roomId: string }): Promise<void> {
    const { roomId } = data;

    try {
      // Get latest state from database or cache
      // This would fetch the current estimate state
      const estimateState = await this.getEstimateState(roomId);

      socket.emit('sync-response', {
        roomId,
        state: estimateState,
        timestamp: Date.now(),
      });

      logger.debug('Sync request handled', { roomId });
    } catch (error) {
      logger.error('Failed to handle sync request', {
        roomId,
        error: error instanceof Error ? error.message : String(error),
      });

      socket.emit('error', {
        type: 'sync-failed',
        message: 'Failed to sync state',
      });
    }
  }

  private handleCursorPosition(socket: Socket, data: { roomId: string; x: number; y: number }): void {
    const user = socket.data.user as User;

    // Broadcast cursor position to others in room
    socket.to(data.roomId).emit('cursor-update', {
      userId: user.id,
      userName: user.name,
      x: data.x,
      y: data.y,
      timestamp: Date.now(),
    });
  }

  private handleFieldFocus(socket: Socket, data: { roomId: string; fieldId: string; focused: boolean }): void {
    const user = socket.data.user as User;

    // Broadcast field focus to others in room
    socket.to(data.roomId).emit('field-focus-update', {
      userId: user.id,
      userName: user.name,
      fieldId: data.fieldId,
      focused: data.focused,
      timestamp: Date.now(),
    });
  }

  private async handleDisconnect(socket: Socket): Promise<void> {
    const user = socket.data.user as User;

    logger.info('Client disconnected', {
      socketId: socket.id,
      userId: user?.id
    });

    if (user) {
      // Remove socket from user tracking
      this.removeUserSocket(user.id, socket.id);

      // Leave all rooms
      for (const [roomId, room] of this.rooms.entries()) {
        if (room.users.has(user.id)) {
          room.users.delete(user.id);

          // Notify others
          socket.to(roomId).emit('user-left', {
            userId: user.id,
            timestamp: Date.now(),
          });

          // Update presence
          this.broadcastPresence(roomId);

          // Remove room if empty
          if (room.users.size === 0) {
            this.rooms.delete(roomId);
          }
        }
      }
    }
  }

  private handleError(socket: Socket, error: Error): void {
    logger.error('Socket error', {
      socketId: socket.id,
      error: error.message,
    });
  }

  private broadcastPresence(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const presence: PresenceUpdate = {
      roomId,
      users: Array.from(room.users.values()),
      timestamp: Date.now(),
    };

    this.io.to(roomId).emit('presence-update', presence);
  }

  private addUserSocket(userId: string, socketId: string): void {
    let sockets = this.userSockets.get(userId);
    if (!sockets) {
      sockets = new Set();
      this.userSockets.set(userId, sockets);
    }
    sockets.add(socketId);
  }

  private removeUserSocket(userId: string, socketId: string): void {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }
  }

  private cleanupIdleRooms(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [roomId, room] of this.rooms.entries()) {
      if (now - room.lastActivity > ROOM_IDLE_TIMEOUT && room.users.size === 0) {
        this.rooms.delete(roomId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info('Cleaned up idle rooms', { count: cleaned });
    }
  }

  private sendHeartbeat(): void {
    this.io.emit('heartbeat', {
      timestamp: Date.now(),
      rooms: this.rooms.size,
      connections: this.io.engine.clientsCount,
    });
  }

  private async calculateFormula(formulaId: string, inputs: Record<string, any>): Promise<any> {
    // This would integrate with your actual formula engine
    // For now, return a mock calculation
    const result = new Decimal(Math.random() * 1000).toFixed(2);

    return {
      value: result,
      timestamp: Date.now(),
      executionTime: Math.random() * 50,
    };
  }

  private async getEstimateState(roomId: string): Promise<any> {
    // This would fetch the actual estimate state from database
    // For now, return mock state
    return {
      estimateId: roomId,
      formulas: {},
      values: {},
      version: 1,
    };
  }

  public getStats(): {
    rooms: number;
    users: number;
    connections: number;
    uptime: number;
  } {
    let totalUsers = 0;
    for (const room of this.rooms.values()) {
      totalUsers += room.users.size;
    }

    return {
      rooms: this.rooms.size,
      users: totalUsers,
      connections: this.io.engine.clientsCount,
      uptime: process.uptime(),
    };
  }

  public async shutdown(): Promise<void> {
    logger.info('Shutting down WebSocket server');

    // Notify all clients
    this.io.emit('server-shutdown', {
      message: 'Server is shutting down',
      timestamp: Date.now(),
    });

    // Close all connections
    this.io.close();

    // Close Redis connections
    await this.pubClient.quit();
    await this.subClient.quit();

    // Clear all timeouts
    for (const timeout of this.calculationQueue.values()) {
      clearTimeout(timeout);
    }

    logger.info('WebSocket server shutdown complete');
  }
}

// Start server
const server = new WebSocketServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  await server.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await server.shutdown();
  process.exit(0);
});

export default server;

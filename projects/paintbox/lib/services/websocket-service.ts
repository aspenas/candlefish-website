/**
 * WebSocket Service for Client-side Integration
 * Manages WebSocket connections with auto-reconnection and state synchronization
 */

import { io, Socket } from 'socket.io-client';
import { logger } from '@/lib/logging/simple-logger';
import { EventEmitter } from 'events';

export interface WebSocketConfig {
  url?: string;
  autoConnect?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  reconnectionDelayMax?: number;
  timeout?: number;
}

export interface WebSocketUser {
  id: string;
  name: string;
  role: 'estimator' | 'viewer' | 'admin';
}

export interface CalculationPayload {
  formulaId: string;
  inputs: Record<string, any>;
  delta?: boolean;
}

export interface CalculationResult {
  formulaId: string;
  inputs: Record<string, any>;
  result: any;
  timestamp: number;
  userId: string;
  delta?: boolean;
}

export interface PresenceData {
  users: WebSocketUser[];
  timestamp: number;
}

export interface CursorData {
  userId: string;
  userName: string;
  x: number;
  y: number;
  timestamp: number;
}

export interface FieldFocusData {
  userId: string;
  userName: string;
  fieldId: string;
  focused: boolean;
  timestamp: number;
}

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

class WebSocketService extends EventEmitter {
  private socket: Socket | null = null;
  private config: Required<WebSocketConfig>;
  private connectionState: ConnectionState = 'disconnected';
  private currentRoom: string | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private authToken: string | null = null;
  private lastHeartbeat: number = 0;
  private missedHeartbeats: number = 0;
  private calculationCache = new Map<string, CalculationResult>();

  constructor(config: WebSocketConfig = {}) {
    super();

    this.config = {
      url: config.url || process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001',
      autoConnect: config.autoConnect !== false,
      reconnectionAttempts: config.reconnectionAttempts || 5,
      reconnectionDelay: config.reconnectionDelay || 1000,
      reconnectionDelayMax: config.reconnectionDelayMax || 5000,
      timeout: config.timeout || 20000,
    };

    if (this.config.autoConnect) {
      this.connect();
    }
  }

  /**
   * Set authentication token
   */
  public setAuthToken(token: string): void {
    this.authToken = token;

    // Reconnect if already connected to apply new token
    if (this.socket?.connected) {
      this.disconnect();
      this.connect();
    }
  }

  /**
   * Connect to WebSocket server
   */
  public connect(): void {
    if (this.socket?.connected) {
      logger.debug('WebSocket already connected');
      return;
    }

    if (!this.authToken) {
      logger.error('Cannot connect without auth token');
      this.setConnectionState('error');
      return;
    }

    this.setConnectionState('connecting');

    try {
      this.socket = io(this.config.url, {
        auth: {
          token: this.authToken,
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.config.reconnectionAttempts,
        reconnectionDelay: this.config.reconnectionDelay,
        reconnectionDelayMax: this.config.reconnectionDelayMax,
        timeout: this.config.timeout,
      });

      this.setupEventHandlers();

      logger.info('WebSocket connecting', { url: this.config.url });
    } catch (error) {
      logger.error('Failed to create WebSocket connection', {
        error: error instanceof Error ? error.message : String(error),
      });
      this.setConnectionState('error');
    }
  }

  /**
   * Setup socket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      logger.info('WebSocket connected', { id: this.socket?.id });
      this.setConnectionState('connected');
      this.startHeartbeatMonitor();

      // Rejoin room if we were in one
      if (this.currentRoom) {
        this.joinRoom(this.currentRoom, this.currentRoom);
      }

      this.emit('connected');
    });

    this.socket.on('disconnect', (reason) => {
      logger.warn('WebSocket disconnected', { reason });
      this.setConnectionState('disconnected');
      this.stopHeartbeatMonitor();
      this.emit('disconnected', reason);
    });

    this.socket.on('connect_error', (error) => {
      logger.error('WebSocket connection error', { error: error.message });
      this.setConnectionState('error');
      this.emit('error', error);
    });

    // Room events
    this.socket.on('room-joined', (data) => {
      logger.info('Joined room', { roomId: data.roomId, users: data.users.length });
      this.emit('room-joined', data);
    });

    this.socket.on('user-joined', (data) => {
      logger.debug('User joined room', { user: data.user.name });
      this.emit('user-joined', data);
    });

    this.socket.on('user-left', (data) => {
      logger.debug('User left room', { userId: data.userId });
      this.emit('user-left', data);
    });

    // Calculation events
    this.socket.on('calculation-result', (data: CalculationResult) => {
      logger.debug('Calculation result received', {
        formulaId: data.formulaId,
        timestamp: data.timestamp
      });

      // Cache the result
      const cacheKey = this.getCacheKey(data.formulaId, data.inputs);
      this.calculationCache.set(cacheKey, data);

      // Limit cache size
      if (this.calculationCache.size > 100) {
        const firstKey = this.calculationCache.keys().next().value;
        if (firstKey) {
          this.calculationCache.delete(firstKey);
        }
      }

      this.emit('calculation-result', data);
    });

    this.socket.on('calculation-error', (data) => {
      logger.error('Calculation error', { formulaId: data.formulaId, error: data.error });
      this.emit('calculation-error', data);
    });

    // Presence events
    this.socket.on('presence-update', (data: PresenceData) => {
      logger.debug('Presence update', { users: data.users.length });
      this.emit('presence-update', data);
    });

    // Collaboration events
    this.socket.on('cursor-update', (data: CursorData) => {
      this.emit('cursor-update', data);
    });

    this.socket.on('field-focus-update', (data: FieldFocusData) => {
      this.emit('field-focus-update', data);
    });

    // Sync events
    this.socket.on('sync-response', (data) => {
      logger.info('Sync response received', { roomId: data.roomId });
      this.emit('sync-response', data);
    });

    // System events
    this.socket.on('heartbeat', (data) => {
      this.lastHeartbeat = Date.now();
      this.missedHeartbeats = 0;
      this.emit('heartbeat', data);
    });

    this.socket.on('server-shutdown', (data) => {
      logger.warn('Server shutdown notification', data);
      this.emit('server-shutdown', data);
    });

    this.socket.on('error', (data) => {
      logger.error('Server error', data);
      this.emit('server-error', data);
    });
  }

  /**
   * Join a room
   */
  public joinRoom(roomId: string, estimateId: string): void {
    if (!this.socket?.connected) {
      logger.error('Cannot join room - not connected');
      return;
    }

    this.socket.emit('join-room', { roomId, estimateId });
    this.currentRoom = roomId;

    logger.info('Joining room', { roomId, estimateId });
  }

  /**
   * Leave current room
   */
  public leaveRoom(): void {
    if (!this.socket?.connected || !this.currentRoom) {
      return;
    }

    this.socket.emit('leave-room', { roomId: this.currentRoom });

    logger.info('Leaving room', { roomId: this.currentRoom });
    this.currentRoom = null;
  }

  /**
   * Send calculation update
   */
  public sendCalculation(payload: CalculationPayload): void {
    if (!this.socket?.connected || !this.currentRoom) {
      logger.error('Cannot send calculation - not connected or not in room');
      return;
    }

    // Check cache first
    const cacheKey = this.getCacheKey(payload.formulaId, payload.inputs);
    const cached = this.calculationCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < 1000) {
      // Use cached result if less than 1 second old
      this.emit('calculation-result', cached);
      return;
    }

    this.socket.emit('calculation-update', {
      roomId: this.currentRoom,
      ...payload,
    });
  }

  /**
   * Request full sync
   */
  public requestSync(): void {
    if (!this.socket?.connected || !this.currentRoom) {
      logger.error('Cannot request sync - not connected or not in room');
      return;
    }

    this.socket.emit('request-sync', { roomId: this.currentRoom });
    logger.info('Requesting sync', { roomId: this.currentRoom });
  }

  /**
   * Send cursor position
   */
  public sendCursorPosition(x: number, y: number): void {
    if (!this.socket?.connected || !this.currentRoom) {
      return;
    }

    this.socket.emit('cursor-position', {
      roomId: this.currentRoom,
      x,
      y,
    });
  }

  /**
   * Send field focus status
   */
  public sendFieldFocus(fieldId: string, focused: boolean): void {
    if (!this.socket?.connected || !this.currentRoom) {
      return;
    }

    this.socket.emit('field-focus', {
      roomId: this.currentRoom,
      fieldId,
      focused,
    });
  }

  /**
   * Disconnect from server
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.stopHeartbeatMonitor();
    this.setConnectionState('disconnected');
    this.currentRoom = null;

    logger.info('WebSocket disconnected');
  }

  /**
   * Get connection state
   */
  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get current room
   */
  public getCurrentRoom(): string | null {
    return this.currentRoom;
  }

  /**
   * Set connection state and emit event
   */
  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.emit('connection-state-changed', state);
    }
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeatMonitor(): void {
    this.stopHeartbeatMonitor();

    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();

      if (this.lastHeartbeat && now - this.lastHeartbeat > 60000) {
        this.missedHeartbeats++;

        if (this.missedHeartbeats >= 2) {
          logger.warn('Multiple heartbeats missed, reconnecting');
          this.disconnect();
          this.connect();
        }
      }
    }, 30000);
  }

  /**
   * Stop heartbeat monitoring
   */
  private stopHeartbeatMonitor(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Generate cache key for calculations
   */
  private getCacheKey(formulaId: string, inputs: Record<string, any>): string {
    const sortedInputs = Object.keys(inputs)
      .sort()
      .reduce((acc, key) => {
        acc[key] = inputs[key];
        return acc;
      }, {} as Record<string, any>);

    return `${formulaId}:${JSON.stringify(sortedInputs)}`;
  }

  /**
   * Clear calculation cache
   */
  public clearCache(): void {
    this.calculationCache.clear();
  }

  /**
   * Get cache size
   */
  public getCacheSize(): number {
    return this.calculationCache.size;
  }

  /**
   * Destroy service and cleanup
   */
  public destroy(): void {
    this.disconnect();
    this.removeAllListeners();
    this.calculationCache.clear();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

// Singleton instance
let serviceInstance: WebSocketService | null = null;

export function getWebSocketService(config?: WebSocketConfig): WebSocketService {
  if (!serviceInstance) {
    serviceInstance = new WebSocketService(config);
  }
  return serviceInstance;
}

export function createWebSocketService(config?: WebSocketConfig): WebSocketService {
  return new WebSocketService(config);
}

export default WebSocketService;

import { io, Socket } from 'socket.io-client';
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';

import { environment } from '@/config/environment';
import { secureStorage } from '@/utils/secure-storage';
import { crashReporting } from './crashReporting';

// WebSocket event types
export interface WebSocketEvents {
  // Security events
  'security:alert': (alert: any) => void;
  'security:incident': (incident: any) => void;
  'security:threat_update': (threat: any) => void;
  
  // System events
  'system:maintenance': (maintenance: any) => void;
  'system:status_update': (status: any) => void;
  
  // User events
  'user:notification': (notification: any) => void;
  'user:message': (message: any) => void;
  
  // Connection events
  connect: () => void;
  disconnect: (reason: string) => void;
  connect_error: (error: Error) => void;
  reconnect: (attemptNumber: number) => void;
  reconnect_error: (error: Error) => void;
  reconnect_failed: () => void;
}

// Connection states
export type ConnectionState = 
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

// WebSocket service class
class WebSocketService {
  private socket: Socket | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private listeners: Map<string, Set<Function>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isOnline = true;
  private connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';

  constructor() {
    this.setupNetworkListener();
  }

  // Initialize WebSocket connection
  async connect(): Promise<void> {
    if (this.socket && this.socket.connected) {
      console.log('WebSocket already connected');
      return;
    }

    try {
      this.setConnectionState('connecting');
      
      const token = await secureStorage.getToken();
      const deviceId = await secureStorage.getDeviceId();
      
      if (!token) {
        throw new Error('No authentication token available');
      }

      const socketOptions = {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        reconnectionDelayMax: 5000,
        maxHttpBufferSize: 1e6, // 1MB
        pingTimeout: 60000,
        pingInterval: 25000,
        auth: {
          token,
          deviceId,
          platform: Platform.OS,
          version: '1.0.0',
        },
        query: {
          deviceId,
          platform: Platform.OS,
        },
      };

      this.socket = io(environment.WEBSOCKET_ENDPOINT, socketOptions);
      
      this.setupEventHandlers();
      this.startHeartbeat();
      
      console.log('WebSocket connection initiated');
      
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      crashReporting.recordError(error);
      this.setConnectionState('error');
      throw error;
    }
  }

  // Disconnect WebSocket
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.stopHeartbeat();
    this.setConnectionState('disconnected');
    this.reconnectAttempts = 0;
    
    console.log('WebSocket disconnected');
  }

  // Setup event handlers
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.setConnectionState('connected');
      this.reconnectAttempts = 0;
      this.emit('connect');
      
      // Send initial presence
      this.sendPresence();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.setConnectionState('disconnected');
      this.emit('disconnect', reason);
      
      // Handle different disconnect reasons
      if (reason === 'io server disconnect') {
        // Server forced disconnect, try to reconnect
        this.handleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.setConnectionState('error');
      this.emit('connect_error', error);
      crashReporting.recordError(error);
      
      this.handleReconnect();
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`WebSocket reconnected after ${attemptNumber} attempts`);
      this.setConnectionState('connected');
      this.reconnectAttempts = 0;
      this.emit('reconnect', attemptNumber);
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('WebSocket reconnection error:', error);
      this.emit('reconnect_error', error);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('WebSocket reconnection failed');
      this.setConnectionState('error');
      this.emit('reconnect_failed');
    });

    // Custom events
    this.socket.on('security:alert', (data) => {
      console.log('Received security alert:', data);
      this.emit('security:alert', data);
    });

    this.socket.on('security:incident', (data) => {
      console.log('Received security incident:', data);
      this.emit('security:incident', data);
    });

    this.socket.on('security:threat_update', (data) => {
      console.log('Received threat update:', data);
      this.emit('security:threat_update', data);
    });

    this.socket.on('system:maintenance', (data) => {
      console.log('Received maintenance notification:', data);
      this.emit('system:maintenance', data);
    });

    this.socket.on('system:status_update', (data) => {
      console.log('Received system status update:', data);
      this.emit('system:status_update', data);
    });

    this.socket.on('user:notification', (data) => {
      console.log('Received user notification:', data);
      this.emit('user:notification', data);
    });

    this.socket.on('user:message', (data) => {
      console.log('Received user message:', data);
      this.emit('user:message', data);
    });

    // Heartbeat response
    this.socket.on('pong', (latency) => {
      this.updateConnectionQuality(latency);
    });

    // Error handling
    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      crashReporting.recordError(error);
    });
  }

  // Handle reconnection logic
  private handleReconnect(): void {
    if (!this.isOnline) {
      console.log('Device offline, skipping reconnect');
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached');
      this.setConnectionState('error');
      return;
    }

    this.reconnectAttempts++;
    this.setConnectionState('reconnecting');
    
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      5000
    );
    
    console.log(`Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      if (!this.socket || !this.socket.connected) {
        this.connect().catch(console.error);
      }
    }, delay);
  }

  // Setup network state listener
  private setupNetworkListener(): void {
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected || false;
      
      if (!wasOnline && this.isOnline) {
        // Device came back online
        console.log('Device back online, reconnecting WebSocket');
        this.connect().catch(console.error);
      } else if (wasOnline && !this.isOnline) {
        // Device went offline
        console.log('Device went offline');
        this.setConnectionState('disconnected');
      }
    });
  }

  // Start heartbeat to monitor connection
  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.socket.connected) {
        const start = Date.now();
        this.socket.emit('ping', start);
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  // Stop heartbeat
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Update connection quality based on latency
  private updateConnectionQuality(latency: number): void {
    if (latency < 100) {
      this.connectionQuality = 'excellent';
    } else if (latency < 300) {
      this.connectionQuality = 'good';
    } else if (latency < 600) {
      this.connectionQuality = 'fair';
    } else {
      this.connectionQuality = 'poor';
    }
  }

  // Send presence information
  private sendPresence(): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('user:presence', {
        status: 'online',
        timestamp: Date.now(),
        platform: Platform.OS,
      });
    }
  }

  // Event listener management
  on<K extends keyof WebSocketEvents>(event: K, callback: WebSocketEvents[K]): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off<K extends keyof WebSocketEvents>(event: K, callback: WebSocketEvents[K]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
      if (eventListeners.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  // Emit event to listeners
  private emit(event: string, data?: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in WebSocket event listener for ${event}:`, error);
          crashReporting.recordError(error);
        }
      });
    }
  }

  // Send message to server
  send(event: string, data?: any): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('WebSocket not connected, message not sent:', event);
    }
  }

  // Join a room
  joinRoom(room: string): void {
    this.send('join:room', { room });
  }

  // Leave a room
  leaveRoom(room: string): void {
    this.send('leave:room', { room });
  }

  // Subscribe to security alerts
  subscribeToAlerts(): void {
    this.send('subscribe:alerts');
  }

  // Subscribe to incident updates
  subscribeToIncidents(): void {
    this.send('subscribe:incidents');
  }

  // Unsubscribe from all subscriptions
  unsubscribeAll(): void {
    this.send('unsubscribe:all');
  }

  // Set connection state and notify listeners
  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      console.log(`WebSocket connection state: ${state}`);
      
      // Emit state change event
      this.emit('connection:state_change', {
        state,
        quality: this.connectionQuality,
        timestamp: Date.now(),
      });
    }
  }

  // Get current connection state
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  // Get connection quality
  getConnectionQuality(): string {
    return this.connectionQuality;
  }

  // Check if connected
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Get connection statistics
  getStats(): {
    state: ConnectionState;
    quality: string;
    reconnectAttempts: number;
    isOnline: boolean;
    connectedAt: number | null;
  } {
    return {
      state: this.connectionState,
      quality: this.connectionQuality,
      reconnectAttempts: this.reconnectAttempts,
      isOnline: this.isOnline,
      connectedAt: this.socket?.connected ? Date.now() : null,
    };
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();

// Auto-connect when service is imported (if authenticated)
secureStorage.getToken().then(token => {
  if (token) {
    websocketService.connect().catch(console.error);
  }
});

export default websocketService;
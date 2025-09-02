import React, { useEffect, useRef, useState, useCallback } from 'react';

export interface WebSocketMessage {
  type: 'photo_uploaded' | 'photo_session_started' | 'photo_session_ended' | 'item_updated' | 'room_progress_updated';
  data: any;
  timestamp: number;
  sessionId?: string;
}

export interface PhotoUploadEvent {
  type: 'photo_uploaded';
  data: {
    itemId: string;
    photoId: string;
    photoUrl: string;
    thumbnailUrl: string;
    angle: string;
    uploadedBy: string;
    roomId: string;
  };
}

export interface PhotoSessionEvent {
  type: 'photo_session_started' | 'photo_session_ended';
  data: {
    sessionId: string;
    roomId: string;
    roomName: string;
    userId: string;
    itemsTotal?: number;
    itemsCaptured?: number;
  };
}

export interface ItemUpdateEvent {
  type: 'item_updated';
  data: {
    itemId: string;
    roomId: string;
    changes: Record<string, any>;
  };
}

export interface RoomProgressEvent {
  type: 'room_progress_updated';
  data: {
    roomId: string;
    totalItems: number;
    itemsWithPhotos: number;
    totalPhotos: number;
    progressPercent: number;
  };
}

type EventHandler<T = any> = (event: T) => void;

class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private eventHandlers: Map<string, EventHandler[]> = new Map();
  private connectionAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private heartbeatInterval = 30000;
  private isIntentionallyClosed = false;
  private lastMessage: WebSocketMessage | null = null;

  constructor() {
    this.connect();
  }

  private getWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = process.env.NODE_ENV === 'production'
      ? 'inventory.highline.work'
      : window.location.hostname;
    const port = process.env.NODE_ENV === 'production'
      ? ''
      : ':8080';

    return `${protocol}//${host}${port}/ws`;
  }

  private connect() {
    if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
      return;
    }

    try {
      const url = this.getWebSocketUrl();
      console.log('Connecting to WebSocket:', url);

      this.ws = new WebSocket(url);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.scheduleReconnect();
    }
  }

  private handleOpen(event: Event) {
    console.log('WebSocket connected successfully');
    this.connectionAttempts = 0;
    this.isIntentionallyClosed = false;

    // Start heartbeat
    this.startHeartbeat();

    // Notify listeners
    this.emit('connection_opened', { timestamp: Date.now() });
  }

  private handleMessage(event: MessageEvent) {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      this.lastMessage = message;

      console.log('Received WebSocket message:', message.type, message.data);

      // Handle different message types
      switch (message.type) {
        case 'photo_uploaded':
          this.emit('photo_uploaded', message.data);
          this.emit('item_updated', { itemId: message.data.itemId });
          this.emit('room_progress_updated', { roomId: message.data.roomId });
          break;

        case 'photo_session_started':
          this.emit('photo_session_started', message.data);
          break;

        case 'photo_session_ended':
          this.emit('photo_session_ended', message.data);
          break;

        case 'item_updated':
          this.emit('item_updated', message.data);
          this.emit('room_progress_updated', { roomId: message.data.roomId });
          break;

        case 'room_progress_updated':
          this.emit('room_progress_updated', message.data);
          break;

        default:
          console.warn('Unknown WebSocket message type:', message.type);
      }

      // Emit generic message event
      this.emit('message', message);

    } catch (error) {
      console.error('Failed to parse WebSocket message:', event.data, error);
    }
  }

  private handleClose(event: CloseEvent) {
    console.log('WebSocket connection closed:', event.code, event.reason);

    // Stop heartbeat
    this.stopHeartbeat();

    // Notify listeners
    this.emit('connection_closed', {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean,
      timestamp: Date.now()
    });

    // Attempt to reconnect unless intentionally closed
    if (!this.isIntentionallyClosed && event.code !== 1000) {
      this.scheduleReconnect();
    }
  }

  private handleError(event: Event) {
    console.error('WebSocket error:', event);
    this.emit('connection_error', {
      error: event,
      timestamp: Date.now(),
      connectionAttempts: this.connectionAttempts
    });
  }

  private scheduleReconnect() {
    if (this.isIntentionallyClosed || this.connectionAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached or connection intentionally closed');
      return;
    }

    this.connectionAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.connectionAttempts - 1), 30000);

    console.log(`Scheduling reconnect attempt ${this.connectionAttempts} in ${delay}ms`);

    this.reconnectTimer = setTimeout(() => {
      console.log(`Reconnect attempt ${this.connectionAttempts}`);
      this.connect();
    }, delay);
  }

  private startHeartbeat() {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({
          type: 'ping' as any,
          data: { timestamp: Date.now() },
          timestamp: Date.now()
        });
      }
    }, this.heartbeatInterval);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // Public API
  send(message: WebSocketMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        return false;
      }
    } else {
      console.warn('WebSocket is not connected, cannot send message');
      return false;
    }
  }

  // Event system
  on<T = any>(event: string, handler: EventHandler<T>) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);

    // Return unsubscribe function
    return () => this.off(event, handler);
  }

  off(event: string, handler: EventHandler) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in WebSocket event handler for ${event}:`, error);
        }
      });
    }
  }

  // Connection management
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  getConnectionState(): string {
    if (!this.ws) return 'DISCONNECTED';

    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'CONNECTING';
      case WebSocket.OPEN: return 'CONNECTED';
      case WebSocket.CLOSING: return 'CLOSING';
      case WebSocket.CLOSED: return 'DISCONNECTED';
      default: return 'UNKNOWN';
    }
  }

  reconnect() {
    this.disconnect();
    this.connectionAttempts = 0;
    this.connect();
  }

  disconnect() {
    this.isIntentionallyClosed = true;

    // Clear timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHeartbeat();

    // Close connection
    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }
  }

  // Utility methods
  getLastMessage(): WebSocketMessage | null {
    return this.lastMessage;
  }

  getStats() {
    return {
      connectionState: this.getConnectionState(),
      connectionAttempts: this.connectionAttempts,
      isIntentionallyClosed: this.isIntentionallyClosed,
      lastMessage: this.lastMessage,
      eventHandlersCount: Array.from(this.eventHandlers.values()).reduce((sum, handlers) => sum + handlers.length, 0)
    };
  }
}

// Singleton instance
export const websocketManager = new WebSocketManager();

// React hooks for easier integration
export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(websocketManager.isConnected());
  const [connectionState, setConnectionState] = useState(websocketManager.getConnectionState());
  const [lastMessage, setLastMessage] = useState(websocketManager.getLastMessage());

  useEffect(() => {
    const updateConnectionState = () => {
      setIsConnected(websocketManager.isConnected());
      setConnectionState(websocketManager.getConnectionState());
    };

    const handleMessage = (message: WebSocketMessage) => {
      setLastMessage(message);
    };

    const unsubscribeOpen = websocketManager.on('connection_opened', updateConnectionState);
    const unsubscribeClose = websocketManager.on('connection_closed', updateConnectionState);
    const unsubscribeMessage = websocketManager.on('message', handleMessage);

    // Update initial state
    updateConnectionState();

    return () => {
      unsubscribeOpen();
      unsubscribeClose();
      unsubscribeMessage();
    };
  }, []);

  return {
    isConnected,
    connectionState,
    lastMessage,
    send: websocketManager.send.bind(websocketManager),
    reconnect: websocketManager.reconnect.bind(websocketManager),
    disconnect: websocketManager.disconnect.bind(websocketManager)
  };
}

// Specific hooks for different event types
export function usePhotoUploadEvents(handler: (event: PhotoUploadEvent['data']) => void) {
  useEffect(() => {
    const unsubscribe = websocketManager.on('photo_uploaded', handler);
    return unsubscribe;
  }, [handler]);
}

export function usePhotoSessionEvents(
  onSessionStarted?: (event: PhotoSessionEvent['data']) => void,
  onSessionEnded?: (event: PhotoSessionEvent['data']) => void
) {
  useEffect(() => {
    const unsubscribes: (() => void)[] = [];

    if (onSessionStarted) {
      unsubscribes.push(websocketManager.on('photo_session_started', onSessionStarted));
    }

    if (onSessionEnded) {
      unsubscribes.push(websocketManager.on('photo_session_ended', onSessionEnded));
    }

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [onSessionStarted, onSessionEnded]);
}

export function useRoomProgressEvents(handler: (event: RoomProgressEvent['data']) => void) {
  useEffect(() => {
    const unsubscribe = websocketManager.on('room_progress_updated', handler);
    return unsubscribe;
  }, [handler]);
}

export function useItemUpdateEvents(handler: (event: ItemUpdateEvent['data']) => void) {
  useEffect(() => {
    const unsubscribe = websocketManager.on('item_updated', handler);
    return unsubscribe;
  }, [handler]);
}

// Hook for connection status with notifications
export function useWebSocketStatus() {
  const { isConnected, connectionState } = useWebSocket();
  const [showConnectionStatus, setShowConnectionStatus] = useState(false);

  useEffect(() => {
    // Show status when connection changes
    setShowConnectionStatus(true);

    const timer = setTimeout(() => {
      setShowConnectionStatus(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [connectionState]);

  return {
    isConnected,
    connectionState,
    showConnectionStatus,
    getStatusColor: () => {
      switch (connectionState) {
        case 'CONNECTED': return 'green';
        case 'CONNECTING': return 'yellow';
        case 'DISCONNECTED': return 'red';
        case 'CLOSING': return 'orange';
        default: return 'gray';
      }
    },
    getStatusText: () => {
      switch (connectionState) {
        case 'CONNECTED': return 'Online';
        case 'CONNECTING': return 'Connecting...';
        case 'DISCONNECTED': return 'Offline';
        case 'CLOSING': return 'Disconnecting...';
        default: return 'Unknown';
      }
    }
  };
}

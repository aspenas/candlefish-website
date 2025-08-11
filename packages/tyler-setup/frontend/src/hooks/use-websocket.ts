// WebSocket hook for real-time communication
// Tyler Setup Platform - Production WebSocket Implementation

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './use-auth';

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

export interface WebSocketHookOptions {
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
}

export interface WebSocketHookReturn {
  isConnected: boolean;
  isConnecting: boolean;
  lastMessage: WebSocketMessage | null;
  sendMessage: (type: string, data: any) => void;
  connect: () => void;
  disconnect: () => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error';
  error: string | null;
}

const WS_URL = import.meta.env.VITE_WS_URL || 'wss://api.setup.candlefish.ai:8080';
const DEFAULT_OPTIONS: Required<WebSocketHookOptions> = {
  autoConnect: true,
  reconnectAttempts: 5,
  reconnectDelay: 1000,
  heartbeatInterval: 30000
};

export function useWebSocket(options: WebSocketHookOptions = {}): WebSocketHookReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { user, token } = useAuth();

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messageQueueRef = useRef<Array<{ type: string; data: any }>>([]);

  // Clear timeouts helper
  const clearTimeouts = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // Send heartbeat ping
  const sendHeartbeat = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'ping' }));
    }
  }, []);

  // Start heartbeat
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(sendHeartbeat, opts.heartbeatInterval);
  }, [sendHeartbeat, opts.heartbeatInterval]);

  // Process message queue after connection
  const processMessageQueue = useCallback(() => {
    while (messageQueueRef.current.length > 0) {
      const message = messageQueueRef.current.shift();
      if (message && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          action: message.type,
          ...message.data
        }));
      }
    }
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!token || !user) {
      console.warn('WebSocket: No auth token or user available');
      return;
    }

    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      return; // Already connecting or connected
    }

    setIsConnecting(true);
    setConnectionState('connecting');
    setError(null);

    try {
      const wsUrl = `${WS_URL}?token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket: Connected successfully');
        setIsConnected(true);
        setIsConnecting(false);
        setConnectionState('connected');
        setError(null);
        reconnectAttemptsRef.current = 0;

        startHeartbeat();
        processMessageQueue();
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);

          // Handle specific message types
          if (message.type === 'pong') {
            // Heartbeat response received
            return;
          }

          if (message.type === 'error') {
            console.error('WebSocket: Server error:', message.data);
            setError(message.data.message || 'Server error');
          }

          // Dispatch custom event for other components to listen
          window.dispatchEvent(new CustomEvent('websocket-message', {
            detail: message
          }));

        } catch (err) {
          console.error('WebSocket: Failed to parse message:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket: Connection error:', event);
        setError('Connection error occurred');
        setConnectionState('error');
      };

      ws.onclose = (event) => {
        console.log('WebSocket: Connection closed:', event.code, event.reason);
        setIsConnected(false);
        setIsConnecting(false);
        clearTimeouts();

        if (event.code !== 1000 && event.code !== 1001) {
          // Unexpected close, attempt reconnection
          setConnectionState('error');

          if (reconnectAttemptsRef.current < opts.reconnectAttempts) {
            const delay = opts.reconnectDelay * Math.pow(2, reconnectAttemptsRef.current);
            console.log(`WebSocket: Attempting reconnection in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${opts.reconnectAttempts})`);

            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttemptsRef.current++;
              connect();
            }, delay);
          } else {
            console.error('WebSocket: Max reconnection attempts reached');
            setConnectionState('error');
            setError('Connection lost. Please refresh the page.');
          }
        } else {
          setConnectionState('disconnected');
        }
      };

    } catch (err) {
      console.error('WebSocket: Failed to create connection:', err);
      setIsConnecting(false);
      setConnectionState('error');
      setError('Failed to establish WebSocket connection');
    }
  }, [token, user, opts.reconnectAttempts, opts.reconnectDelay, startHeartbeat, processMessageQueue]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    clearTimeouts();

    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
    setConnectionState('disconnected');
    setError(null);
    reconnectAttemptsRef.current = 0;
  }, [clearTimeouts]);

  // Send message through WebSocket
  const sendMessage = useCallback((type: string, data: any = {}) => {
    const message = { action: type, ...data };

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      // Queue message for when connection is restored
      messageQueueRef.current.push({ type, data });

      // Attempt to connect if not connected
      if (!isConnecting && connectionState === 'disconnected') {
        connect();
      }
    }
  }, [isConnecting, connectionState, connect]);

  // Join a room
  const joinRoom = useCallback((roomId: string) => {
    sendMessage('join', { roomId });
  }, [sendMessage]);

  // Leave a room
  const leaveRoom = useCallback((roomId: string) => {
    sendMessage('leave', { roomId });
  }, [sendMessage]);

  // Auto-connect effect
  useEffect(() => {
    if (opts.autoConnect && user && token && !isConnected && !isConnecting) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [opts.autoConnect, user, token, isConnected, isConnecting, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeouts();
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounted');
      }
    };
  }, [clearTimeouts]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isConnected && user && token) {
        // Page became visible and we're not connected, attempt reconnection
        setTimeout(() => connect(), 1000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isConnected, user, token, connect]);

  // Handle network status changes
  useEffect(() => {
    const handleOnline = () => {
      if (!isConnected && user && token) {
        setTimeout(() => connect(), 1000);
      }
    };

    const handleOffline = () => {
      disconnect();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isConnected, user, token, connect, disconnect]);

  return {
    isConnected,
    isConnecting,
    lastMessage,
    sendMessage,
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
    connectionState,
    error
  };
}

// Hook for listening to specific WebSocket message types
export function useWebSocketListener(
  messageType: string,
  callback: (data: any) => void,
  dependencies: any[] = []
) {
  useEffect(() => {
    const handleMessage = (event: CustomEvent) => {
      const message: WebSocketMessage = event.detail;
      if (message.type === messageType) {
        callback(message.data);
      }
    };

    window.addEventListener('websocket-message', handleMessage as EventListener);

    return () => {
      window.removeEventListener('websocket-message', handleMessage as EventListener);
    };
  }, [messageType, ...dependencies]);
}

// Hook for real-time collaboration features
export function useCollaboration(roomId: string) {
  const { sendMessage, joinRoom, leaveRoom, isConnected } = useWebSocket();
  const [participants, setParticipants] = useState<Array<{ id: string; email: string; role: string }>>([]);
  const [isTyping, setIsTyping] = useState<Record<string, boolean>>({});

  // Join room on mount
  useEffect(() => {
    if (isConnected && roomId) {
      joinRoom(roomId);
    }

    return () => {
      if (roomId) {
        leaveRoom(roomId);
      }
    };
  }, [isConnected, roomId, joinRoom, leaveRoom]);

  // Listen to collaboration events
  useWebSocketListener('user_joined', (data) => {
    if (data.roomId === roomId) {
      setParticipants(prev => {
        const exists = prev.find(p => p.id === data.user.id);
        if (!exists) {
          return [...prev, data.user];
        }
        return prev;
      });
    }
  }, [roomId]);

  useWebSocketListener('user_left', (data) => {
    if (data.roomId === roomId) {
      setParticipants(prev => prev.filter(p => p.id !== data.user.id));
    }
  }, [roomId]);

  useWebSocketListener('typing', (data) => {
    if (data.roomId === roomId) {
      setIsTyping(prev => ({
        ...prev,
        [data.user.id]: data.isTyping
      }));
    }
  }, [roomId]);

  const sendTypingStatus = useCallback((isTyping: boolean) => {
    sendMessage('typing', { roomId, isTyping });
  }, [sendMessage, roomId]);

  const sendMessage_ = useCallback((message: string, messageType: string = 'text') => {
    sendMessage('message', { roomId, message, messageType });
  }, [sendMessage, roomId]);

  return {
    participants,
    isTyping,
    sendTypingStatus,
    sendMessage: sendMessage_,
    isConnected
  };
}

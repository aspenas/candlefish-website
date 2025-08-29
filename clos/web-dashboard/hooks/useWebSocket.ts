'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { WebSocketMessage } from '@/types/api';

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  autoConnect?: boolean;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { onMessage, onConnect, onDisconnect, autoConnect = true } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    // Don't connect if already connected
    if (socketRef.current?.connected) return;

    console.log('Connecting to WebSocket...');
    const socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3501', {
      transports: ['websocket'],
      autoConnect: false,
      reconnection: false, // Handle reconnection manually
    });

    socket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful connection
      onConnect?.();
    });

    socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setIsConnected(false);
      onDisconnect?.();
      
      // Only attempt to reconnect if it wasn't a manual disconnect
      if (reason !== 'io client disconnect') {
        scheduleReconnect();
      }
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      scheduleReconnect();
    });

    socket.on('message', (data: WebSocketMessage) => {
      setLastMessage(data);
      onMessage?.(data);
    });

    // Service-specific events
    socket.on('service_update', (data) => {
      const message: WebSocketMessage = { type: 'service_update', data };
      setLastMessage(message);
      onMessage?.(message);
    });

    socket.on('health_update', (data) => {
      const message: WebSocketMessage = { type: 'health_update', data };
      setLastMessage(message);
      onMessage?.(message);
    });

    socket.on('log_entry', (data) => {
      const message: WebSocketMessage = { type: 'log_entry', data };
      setLastMessage(message);
      onMessage?.(message);
    });

    socket.on('port_conflict', (data) => {
      const message: WebSocketMessage = { type: 'port_conflict', data };
      setLastMessage(message);
      onMessage?.(message);
    });

    socketRef.current = socket;
    socket.connect();
  }, [onMessage, onConnect, onDisconnect]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000); // Exponential backoff, max 30s
    reconnectAttemptsRef.current++;
    
    console.log(`Scheduling reconnect attempt ${reconnectAttemptsRef.current} in ${delay}ms`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current = null;
      }
      connect();
    }, delay);
  }, [connect]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current.removeAllListeners();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('message', message);
    }
  }, []);

  const subscribe = useCallback((event: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('subscribe', event);
    }
  }, []);

  const unsubscribe = useCallback((event: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('unsubscribe', event);
    }
  }, []);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect]);

  return {
    isConnected,
    lastMessage,
    connect,
    disconnect,
    sendMessage,
    subscribe,
    unsubscribe,
  };
}

// Hook for service-specific WebSocket updates
export function useServiceUpdates() {
  const [services, setServices] = useState<any[]>([]);
  const [healthMetrics, setHealthMetrics] = useState<any[]>([]);

  const handleMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'service_update':
        setServices(prev => {
          const index = prev.findIndex(s => s.id === message.data.id);
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = { ...updated[index], ...message.data };
            return updated;
          } else {
            return [...prev, message.data];
          }
        });
        break;
      
      case 'health_update':
        setHealthMetrics(prev => [message.data, ...prev.slice(0, 99)]); // Keep last 100 metrics
        break;
    }
  }, []);

  const webSocket = useWebSocket({
    onMessage: handleMessage,
    onConnect: () => {
      // Use setTimeout to avoid circular dependency
      setTimeout(() => {
        if (webSocket.subscribe) {
          webSocket.subscribe('services');
          webSocket.subscribe('health');
        }
      }, 100);
    },
  });

  return {
    services,
    healthMetrics,
    isConnected: webSocket.isConnected,
    subscribe: webSocket.subscribe,
    unsubscribe: webSocket.unsubscribe,
  };
}

// Hook for log streaming
export function useLogStream(serviceId?: string) {
  const [logs, setLogs] = useState<any[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const handleMessage = useCallback((message: WebSocketMessage) => {
    if (message.type === 'log_entry') {
      const logEntry = message.data;
      if (!serviceId || logEntry.service_id === serviceId) {
        setLogs(prev => [logEntry, ...prev.slice(0, 999)]); // Keep last 1000 logs
      }
    }
  }, [serviceId]);

  const webSocket = useWebSocket({
    onMessage: handleMessage,
    onConnect: () => {
      setIsStreaming(true);
      if (serviceId) {
        webSocket.subscribe(`logs:${serviceId}`);
      } else {
        webSocket.subscribe('logs');
      }
    },
    onDisconnect: () => {
      setIsStreaming(false);
    },
  });

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  useEffect(() => {
    return () => {
      if (webSocket.unsubscribe) {
        if (serviceId) {
          webSocket.unsubscribe(`logs:${serviceId}`);
        } else {
          webSocket.unsubscribe('logs');
        }
      }
    };
  }, [serviceId]);

  return {
    logs,
    isStreaming,
    clearLogs,
    isConnected: webSocket.isConnected,
  };
}
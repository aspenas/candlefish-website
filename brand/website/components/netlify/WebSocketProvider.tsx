'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { NetlifySite, Extension, PerformanceMetrics } from '../../types/netlify';

export interface WebSocketMessage {
  type: 'site_update' | 'extension_update' | 'metrics_update' | 'deployment_progress' | 'health_status' | 'error';
  data: any;
  timestamp: number;
  siteId?: string;
  extensionId?: string;
}

export interface WebSocketContextType {
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastMessage: WebSocketMessage | null;
  subscribe: (callback: (message: WebSocketMessage) => void) => () => void;
  unsubscribe: (callback: (message: WebSocketMessage) => void) => void;
  sendMessage: (message: Omit<WebSocketMessage, 'timestamp'>) => void;
  connect: () => void;
  disconnect: () => void;
  subscribeToSite: (siteId: string) => void;
  unsubscribeFromSite: (siteId: string) => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

interface WebSocketProviderProps {
  children: React.ReactNode;
  url?: string;
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
  children,
  url = '/api/ws/netlify',
  autoConnect = true,
  reconnectInterval = 3000,
  maxReconnectAttempts = 5
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<WebSocketContextType['connectionStatus']>('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const subscribersRef = useRef<Set<(message: WebSocketMessage) => void>>(new Set());
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscribedSitesRef = useRef<Set<string>>(new Set());

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setConnectionStatus('connecting');

    try {
      // Convert HTTP URLs to WS URLs
      const wsUrl = url.startsWith('http')
        ? url.replace(/^https?/, window.location.protocol === 'https:' ? 'wss' : 'ws')
        : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}${url}`;

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;

        // Re-subscribe to all sites after reconnection
        subscribedSitesRef.current.forEach(siteId => {
          wsRef.current?.send(JSON.stringify({
            type: 'subscribe',
            siteId,
            timestamp: Date.now()
          }));
        });
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);

          // Notify all subscribers
          subscribersRef.current.forEach(callback => {
            try {
              callback(message);
            } catch (error) {
              console.error('WebSocket subscriber error:', error);
            }
          });
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        setIsConnected(false);
        setConnectionStatus('disconnected');
        wsRef.current = null;

        // Attempt to reconnect if not manually closed
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setConnectionStatus('error');
        }
      };

      wsRef.current.onerror = () => {
        setConnectionStatus('error');
        console.error('WebSocket connection error');
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionStatus('error');
    }
  }, [url, reconnectInterval, maxReconnectAttempts]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }

    setIsConnected(false);
    setConnectionStatus('disconnected');
    reconnectAttemptsRef.current = maxReconnectAttempts; // Prevent auto-reconnect
  }, [maxReconnectAttempts]);

  const subscribe = useCallback((callback: (message: WebSocketMessage) => void) => {
    subscribersRef.current.add(callback);

    return () => {
      subscribersRef.current.delete(callback);
    };
  }, []);

  const unsubscribe = useCallback((callback: (message: WebSocketMessage) => void) => {
    subscribersRef.current.delete(callback);
  }, []);

  const sendMessage = useCallback((message: Omit<WebSocketMessage, 'timestamp'>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const fullMessage: WebSocketMessage = {
        ...message,
        timestamp: Date.now()
      };
      wsRef.current.send(JSON.stringify(fullMessage));
    }
  }, []);

  const subscribeToSite = useCallback((siteId: string) => {
    subscribedSitesRef.current.add(siteId);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      sendMessage({
        type: 'site_update',
        data: { action: 'subscribe', siteId }
      });
    }
  }, [sendMessage]);

  const unsubscribeFromSite = useCallback((siteId: string) => {
    subscribedSitesRef.current.delete(siteId);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      sendMessage({
        type: 'site_update',
        data: { action: 'unsubscribe', siteId }
      });
    }
  }, [sendMessage]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && typeof window !== 'undefined') {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [connect, disconnect, autoConnect]);

  const contextValue: WebSocketContextType = {
    isConnected,
    connectionStatus,
    lastMessage,
    subscribe,
    unsubscribe,
    sendMessage,
    connect,
    disconnect,
    subscribeToSite,
    unsubscribeFromSite
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

// Hook for site-specific updates
export const useSiteUpdates = (siteId: string | null) => {
  const { subscribe, subscribeToSite, unsubscribeFromSite } = useWebSocket();
  const [siteData, setSiteData] = useState<{
    site: NetlifySite | null;
    extensions: Extension[];
    metrics: PerformanceMetrics | null;
    health: any;
  }>({
    site: null,
    extensions: [],
    metrics: null,
    health: null
  });

  useEffect(() => {
    if (!siteId) return;

    subscribeToSite(siteId);

    const unsubscribeCallback = subscribe((message) => {
      if (message.siteId !== siteId) return;

      switch (message.type) {
        case 'site_update':
          setSiteData(prev => ({
            ...prev,
            site: message.data.site || prev.site,
            extensions: message.data.extensions || prev.extensions
          }));
          break;

        case 'metrics_update':
          setSiteData(prev => ({
            ...prev,
            metrics: message.data
          }));
          break;

        case 'health_status':
          setSiteData(prev => ({
            ...prev,
            health: message.data
          }));
          break;
      }
    });

    return () => {
      unsubscribeFromSite(siteId);
      unsubscribeCallback();
    };
  }, [siteId, subscribe, subscribeToSite, unsubscribeFromSite]);

  return siteData;
};

// Hook for deployment progress updates
export const useDeploymentProgress = () => {
  const { subscribe } = useWebSocket();
  const [deploymentProgress, setDeploymentProgress] = useState<{
    [deploymentId: string]: {
      status: 'pending' | 'in-progress' | 'completed' | 'failed';
      progress: number;
      details: any;
      timestamp: number;
    }
  }>({});

  useEffect(() => {
    const unsubscribeCallback = subscribe((message) => {
      if (message.type === 'deployment_progress') {
        const { deploymentId, status, progress, details } = message.data;

        setDeploymentProgress(prev => ({
          ...prev,
          [deploymentId]: {
            status,
            progress,
            details,
            timestamp: message.timestamp
          }
        }));
      }
    });

    return unsubscribeCallback;
  }, [subscribe]);

  return deploymentProgress;
};

// Hook for real-time health monitoring
export const useHealthMonitoring = () => {
  const { subscribe } = useWebSocket();
  const [healthData, setHealthData] = useState<{
    [siteId: string]: {
      status: 'healthy' | 'warning' | 'critical' | 'unknown';
      issues: any[];
      lastUpdate: number;
    }
  }>({});

  useEffect(() => {
    const unsubscribeCallback = subscribe((message) => {
      if (message.type === 'health_status') {
        const { siteId, status, issues } = message.data;

        setHealthData(prev => ({
          ...prev,
          [siteId]: {
            status,
            issues,
            lastUpdate: message.timestamp
          }
        }));
      }
    });

    return unsubscribeCallback;
  }, [subscribe]);

  return healthData;
};

// Connection status indicator component
export const WebSocketStatus: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { connectionStatus, isConnected } = useWebSocket();

  const statusConfig = {
    connecting: { color: 'text-operation-alert', icon: '🔄', label: 'Connecting...' },
    connected: { color: 'text-operation-complete', icon: '🟢', label: 'Connected' },
    disconnected: { color: 'text-light-tertiary', icon: '🔴', label: 'Disconnected' },
    error: { color: 'text-operation-alert', icon: '❌', label: 'Connection Error' }
  };

  const config = statusConfig[connectionStatus];

  return (
    <div className={`flex items-center gap-2 text-sm ${config.color} ${className}`}>
      <span className="text-xs">{config.icon}</span>
      <span>{config.label}</span>
      {connectionStatus === 'connected' && (
        <div className="w-2 h-2 bg-operation-complete rounded-full animate-pulse" />
      )}
    </div>
  );
};

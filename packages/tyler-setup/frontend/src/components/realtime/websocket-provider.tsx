// WebSocket Provider for global WebSocket state management
// Tyler Setup Platform - Real-time Communication Provider

import React, { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import { useWebSocket, WebSocketHookReturn, WebSocketMessage } from '@/hooks/use-websocket';
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/hooks/use-toast';

interface WebSocketContextType extends WebSocketHookReturn {
  subscribe: (eventType: string, callback: (data: any) => void) => () => void;
  unsubscribe: (eventType: string, callback: (data: any) => void) => void;
  getConnectionStatus: () => string;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
  children: ReactNode;
  autoConnect?: boolean;
  showToasts?: boolean;
}

export function WebSocketProvider({
  children,
  autoConnect = true,
  showToasts = true
}: WebSocketProviderProps) {
  const { user } = useAuth();
  const subscribers = useRef<Map<string, Set<(data: any) => void>>>(new Map());

  const websocket = useWebSocket({
    autoConnect,
    reconnectAttempts: 5,
    reconnectDelay: 1000,
    heartbeatInterval: 30000
  });

  const { lastMessage, connectionState, error, isConnected } = websocket;

  // Handle incoming messages and dispatch to subscribers
  useEffect(() => {
    if (lastMessage) {
      const { type, data } = lastMessage;
      const callbacks = subscribers.current.get(type);

      if (callbacks) {
        callbacks.forEach(callback => {
          try {
            callback(data);
          } catch (err) {
            console.error('WebSocket callback error:', err);
          }
        });
      }
    }
  }, [lastMessage]);

  // Handle connection state changes
  useEffect(() => {
    if (showToasts) {
      switch (connectionState) {
        case 'connected':
          if (user) {
            toast({
              title: 'Connected',
              description: 'Real-time features are now active',
              duration: 2000
            });
          }
          break;
        case 'error':
          toast({
            title: 'Connection Error',
            description: error || 'Unable to connect to real-time services',
            variant: 'destructive'
          });
          break;
        case 'disconnected':
          if (user) {
            toast({
              title: 'Disconnected',
              description: 'Real-time features are unavailable',
              variant: 'destructive'
            });
          }
          break;
      }
    }
  }, [connectionState, error, user, showToasts]);

  // Subscribe to WebSocket events
  const subscribe = (eventType: string, callback: (data: any) => void) => {
    if (!subscribers.current.has(eventType)) {
      subscribers.current.set(eventType, new Set());
    }

    const callbacks = subscribers.current.get(eventType)!;
    callbacks.add(callback);

    // Return unsubscribe function
    return () => {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        subscribers.current.delete(eventType);
      }
    };
  };

  // Unsubscribe from WebSocket events
  const unsubscribe = (eventType: string, callback: (data: any) => void) => {
    const callbacks = subscribers.current.get(eventType);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        subscribers.current.delete(eventType);
      }
    }
  };

  // Get human-readable connection status
  const getConnectionStatus = () => {
    switch (connectionState) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Connection Error';
      case 'disconnected':
        return 'Disconnected';
      default:
        return 'Unknown';
    }
  };

  const contextValue: WebSocketContextType = {
    ...websocket,
    subscribe,
    unsubscribe,
    getConnectionStatus
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}

// Hook to access WebSocket context
export function useWebSocketContext(): WebSocketContextType {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
}

// Connection status component
export function ConnectionStatus({ className = '' }: { className?: string }) {
  const { connectionState, getConnectionStatus } = useWebSocketContext();

  const getStatusColor = () => {
    switch (connectionState) {
      case 'connected':
        return 'text-green-500';
      case 'connecting':
        return 'text-yellow-500';
      case 'error':
        return 'text-red-500';
      case 'disconnected':
        return 'text-gray-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = () => {
    switch (connectionState) {
      case 'connected':
        return '🟢';
      case 'connecting':
        return '🟡';
      case 'error':
        return '🔴';
      case 'disconnected':
        return '⚪';
      default:
        return '⚫';
    }
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <span className="text-sm">{getStatusIcon()}</span>
      <span className={`text-sm ${getStatusColor()}`}>
        {getConnectionStatus()}
      </span>
    </div>
  );
}

// Real-time notification component
export function RealtimeNotifications() {
  const { subscribe } = useWebSocketContext();

  useEffect(() => {
    // Subscribe to system notifications
    const unsubscribeNotification = subscribe('notification', (data) => {
      toast({
        title: data.title || 'Notification',
        description: data.message,
        variant: data.type === 'error' ? 'destructive' : 'default'
      });
    });

    // Subscribe to user mentions
    const unsubscribeMention = subscribe('user_mentioned', (data) => {
      toast({
        title: 'You were mentioned',
        description: `${data.mentionedBy} mentioned you in ${data.context}`,
        action: data.actionUrl ? (
          <button
            onClick={() => window.location.href = data.actionUrl}
            className="underline"
          >
            View
          </button>
        ) : undefined
      });
    });

    // Subscribe to system alerts
    const unsubscribeAlert = subscribe('system_alert', (data) => {
      toast({
        title: 'System Alert',
        description: data.message,
        variant: 'destructive'
      });
    });

    return () => {
      unsubscribeNotification();
      unsubscribeMention();
      unsubscribeAlert();
    };
  }, [subscribe]);

  return null; // This component doesn't render anything
}

// Activity indicator for showing real-time activity
export function ActivityIndicator({
  activityType,
  className = ''
}: {
  activityType: string;
  className?: string;
}) {
  const { subscribe } = useWebSocketContext();
  const [isActive, setIsActive] = React.useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const unsubscribe = subscribe(activityType, () => {
      setIsActive(true);

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set activity indicator to false after 2 seconds
      timeoutRef.current = setTimeout(() => {
        setIsActive(false);
      }, 2000);
    });

    return () => {
      unsubscribe();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [subscribe, activityType]);

  if (!isActive) return null;

  return (
    <div className={`inline-flex items-center space-x-1 ${className}`}>
      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
      <span className="text-xs text-blue-600">Activity</span>
    </div>
  );
}

// Typing indicator component
export function TypingIndicator({
  roomId,
  className = ''
}: {
  roomId: string;
  className?: string;
}) {
  const { subscribe } = useWebSocketContext();
  const [typingUsers, setTypingUsers] = React.useState<string[]>([]);

  useEffect(() => {
    const unsubscribe = subscribe('typing', (data) => {
      if (data.roomId === roomId) {
        setTypingUsers(prev => {
          if (data.isTyping) {
            return prev.includes(data.user.email)
              ? prev
              : [...prev, data.user.email];
          } else {
            return prev.filter(user => user !== data.user.email);
          }
        });
      }
    });

    return unsubscribe;
  }, [subscribe, roomId]);

  if (typingUsers.length === 0) return null;

  const getTypingText = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0]} is typing...`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers.join(' and ')} are typing...`;
    } else {
      return `${typingUsers.slice(0, -1).join(', ')} and ${typingUsers[typingUsers.length - 1]} are typing...`;
    }
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="flex space-x-1">
        <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce"></div>
        <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
        <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
      </div>
      <span className="text-xs text-gray-600">{getTypingText()}</span>
    </div>
  );
}

// Presence indicator showing online users
export function PresenceIndicator({
  roomId,
  className = ''
}: {
  roomId?: string;
  className?: string;
}) {
  const { subscribe, isConnected } = useWebSocketContext();
  const [onlineUsers, setOnlineUsers] = React.useState<Array<{ id: string; email: string; role: string }>>([]);

  useEffect(() => {
    if (!roomId) return;

    const unsubscribeJoined = subscribe('user_joined', (data) => {
      if (data.roomId === roomId) {
        setOnlineUsers(prev => {
          const exists = prev.find(user => user.id === data.user.id);
          return exists ? prev : [...prev, data.user];
        });
      }
    });

    const unsubscribeLeft = subscribe('user_left', (data) => {
      if (data.roomId === roomId) {
        setOnlineUsers(prev => prev.filter(user => user.id !== data.user.id));
      }
    });

    return () => {
      unsubscribeJoined();
      unsubscribeLeft();
    };
  }, [subscribe, roomId]);

  if (!isConnected || onlineUsers.length === 0) return null;

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="flex -space-x-2">
        {onlineUsers.slice(0, 3).map((user, index) => (
          <div
            key={user.id}
            className="w-6 h-6 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center text-xs text-white font-semibold"
            title={user.email}
            style={{ zIndex: onlineUsers.length - index }}
          >
            {user.email.charAt(0).toUpperCase()}
          </div>
        ))}
        {onlineUsers.length > 3 && (
          <div className="w-6 h-6 bg-gray-500 rounded-full border-2 border-white flex items-center justify-center text-xs text-white font-semibold">
            +{onlineUsers.length - 3}
          </div>
        )}
      </div>
      <span className="text-xs text-gray-600">
        {onlineUsers.length} online
      </span>
    </div>
  );
}

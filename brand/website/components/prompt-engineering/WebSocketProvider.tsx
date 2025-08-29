'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { usePromptWebSocket } from '@/lib/prompt-engineering/websocket-manager';

interface WebSocketContextType {
  connectionState: 'connecting' | 'connected' | 'disconnected';
  subscribe: (messageType: string, handler: (message: any) => void) => () => void;
  send: (message: any) => void;
  disconnect: () => void;
  lastMessage: any;
  messageCount: number;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const usePromptEngineering = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('usePromptEngineering must be used within a PromptEngineeringWebSocketProvider');
  }
  return context;
};

interface Props {
  children: React.ReactNode;
  enableRealtimeUpdates?: boolean;
}

export const PromptEngineeringWebSocketProvider: React.FC<Props> = ({ 
  children,
  enableRealtimeUpdates = true 
}) => {
  const { connectionState, subscribe, send, disconnect } = usePromptWebSocket();
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [messageCount, setMessageCount] = useState(0);
  const subscriptionsRef = useRef<(() => void)[]>([]);

  useEffect(() => {
    if (!enableRealtimeUpdates) return;

    // Subscribe to all message types for debugging/monitoring
    const unsubscribeExecution = subscribe('execution_progress', (message) => {
      setLastMessage(message);
      setMessageCount(prev => prev + 1);
    });

    const unsubscribeMetrics = subscribe('metrics_update', (message) => {
      setLastMessage(message);
      setMessageCount(prev => prev + 1);
    });

    const unsubscribeCache = subscribe('cache_update', (message) => {
      setLastMessage(message);
      setMessageCount(prev => prev + 1);
    });

    const unsubscribeModelStatus = subscribe('model_status', (message) => {
      setLastMessage(message);
      setMessageCount(prev => prev + 1);
    });

    // Store unsubscribe functions
    subscriptionsRef.current = [
      unsubscribeExecution,
      unsubscribeMetrics,
      unsubscribeCache,
      unsubscribeModelStatus,
    ];

    return () => {
      subscriptionsRef.current.forEach(unsubscribe => unsubscribe());
    };
  }, [enableRealtimeUpdates, subscribe]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      subscriptionsRef.current.forEach(unsubscribe => unsubscribe());
      if (enableRealtimeUpdates) {
        disconnect();
      }
    };
  }, [disconnect, enableRealtimeUpdates]);

  const contextValue: WebSocketContextType = {
    connectionState,
    subscribe,
    send,
    disconnect,
    lastMessage,
    messageCount,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
      
      {/* Connection Status Indicator */}
      {enableRealtimeUpdates && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className={`
            px-3 py-2 rounded-lg text-xs font-medium flex items-center space-x-2 shadow-lg
            ${connectionState === 'connected' ? 'bg-green-100 text-green-800 border border-green-200' :
              connectionState === 'connecting' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
              'bg-red-100 text-red-800 border border-red-200'}
          `}>
            <div className={`
              w-2 h-2 rounded-full
              ${connectionState === 'connected' ? 'bg-green-500' :
                connectionState === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                'bg-red-500'}
            `} />
            <span className="capitalize">{connectionState}</span>
            {messageCount > 0 && (
              <span className="text-xs opacity-75">({messageCount} msgs)</span>
            )}
          </div>
        </div>
      )}
    </WebSocketContext.Provider>
  );
};
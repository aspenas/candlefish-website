/**
 * Infrastructure WebSocket Hooks
 * Real-time updates for health monitoring, workflows, and system events
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  useHealthStore,
  useWorkflowStore,
  useLoadTestStore,
  useDRStore,
  useAlertStore,
} from '@/stores/useInfrastructureStore';
import {
  WebSocketMessage,
  HealthResponse,
  WorkflowExecution,
  LoadTestRealTimeMetrics,
  BackupStatus,
  AlertMessage,
} from '@/lib/types/infrastructure';

// ===== MAIN WEBSOCKET HOOK =====

interface UseInfrastructureWebSocketOptions {
  url?: string;
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

export const useInfrastructureWebSocket = (options: UseInfrastructureWebSocketOptions = {}) => {
  const {
    url = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
    autoConnect = true,
    reconnectAttempts = 5,
    reconnectDelay = 1000,
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  // Store actions
  const { updateHealth, addHealthMetric } = useHealthStore();
  const { updateExecution, addExecution } = useWorkflowStore();
  const { setRealTimeMetrics, updateTestResult } = useLoadTestStore();
  const { updateBackup, addBackup } = useDRStore();
  const { addAlert } = useAlertStore();

  // Message handlers
  const handleHealthUpdate = useCallback((data: HealthResponse) => {
    updateHealth(data);
    
    // Add individual metric for history
    addHealthMetric({
      timestamp: data.timestamp,
      responseTime: Object.values(data.checks).reduce((sum, check) => sum + check.responseTime, 0) / Object.keys(data.checks).length,
      status: data.status,
    });
  }, [updateHealth, addHealthMetric]);

  const handleWorkflowUpdate = useCallback((data: WorkflowExecution) => {
    if (data.status === 'running' && !useWorkflowStore.getState().executions.find(e => e.id === data.id)) {
      addExecution(data);
    } else {
      updateExecution(data.id, data);
    }
  }, [addExecution, updateExecution]);

  const handleLoadTestUpdate = useCallback((data: LoadTestRealTimeMetrics) => {
    setRealTimeMetrics(data);
  }, [setRealTimeMetrics]);

  const handleBackupUpdate = useCallback((data: BackupStatus) => {
    const existingBackup = useDRStore.getState().backupStatus.find(b => b.id === data.id);
    if (existingBackup) {
      updateBackup(data.id, data);
    } else {
      addBackup(data);
    }
  }, [updateBackup, addBackup]);

  const handleAlert = useCallback((data: AlertMessage) => {
    addAlert(data);
  }, [addAlert]);

  // Message router
  const handleMessage = useCallback((message: WebSocketMessage) => {
    try {
      switch (message.type) {
        case 'health-update':
          handleHealthUpdate(message.payload);
          break;
        case 'workflow-update':
          handleWorkflowUpdate(message.payload);
          break;
        case 'load-test-update':
          handleLoadTestUpdate(message.payload);
          break;
        case 'backup-update':
          handleBackupUpdate(message.payload);
          break;
        case 'alert':
          handleAlert(message.payload);
          break;
        default:
          console.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }, [handleHealthUpdate, handleWorkflowUpdate, handleLoadTestUpdate, handleBackupUpdate, handleAlert]);

  // Connection management
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    setIsConnecting(true);
    setError(null);

    const socket = io(url, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      forceNew: true,
    });

    socket.on('connect', () => {
      console.log('Infrastructure WebSocket connected');
      setIsConnected(true);
      setIsConnecting(false);
      setConnectionAttempts(0);
      setError(null);

      // Subscribe to infrastructure events
      socket.emit('subscribe', {
        topics: ['health', 'workflows', 'load-tests', 'backups', 'alerts'],
      });
    });

    socket.on('disconnect', (reason) => {
      console.log('Infrastructure WebSocket disconnected:', reason);
      setIsConnected(false);
      setIsConnecting(false);

      // Auto-reconnect if not manually disconnected
      if (reason !== 'io client disconnect' && connectionAttempts < reconnectAttempts) {
        setTimeout(() => {
          setConnectionAttempts(prev => prev + 1);
          connect();
        }, reconnectDelay * Math.pow(2, connectionAttempts)); // Exponential backoff
      }
    });

    socket.on('connect_error', (error) => {
      console.error('Infrastructure WebSocket connection error:', error);
      setIsConnecting(false);
      setError(error.message);
      
      if (connectionAttempts < reconnectAttempts) {
        setTimeout(() => {
          setConnectionAttempts(prev => prev + 1);
          connect();
        }, reconnectDelay * Math.pow(2, connectionAttempts));
      }
    });

    socket.on('message', handleMessage);
    socket.on('infrastructure-update', handleMessage);

    socketRef.current = socket;
  }, [url, connectionAttempts, reconnectAttempts, reconnectDelay, handleMessage]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setIsConnecting(false);
    }
  }, []);

  const sendMessage = useCallback((type: string, payload: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(type, payload);
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    isConnected,
    isConnecting,
    error,
    connectionAttempts,
    connect,
    disconnect,
    sendMessage,
  };
};

// ===== SPECIALIZED HOOKS =====

// Health monitoring WebSocket hook
export const useHealthWebSocket = () => {
  const { sendMessage, isConnected } = useInfrastructureWebSocket();

  const requestHealthCheck = useCallback(() => {
    sendMessage('request-health-check', {});
  }, [sendMessage]);

  const subscribeToService = useCallback((serviceName: string) => {
    sendMessage('subscribe-service', { service: serviceName });
  }, [sendMessage]);

  const unsubscribeFromService = useCallback((serviceName: string) => {
    sendMessage('unsubscribe-service', { service: serviceName });
  }, [sendMessage]);

  return {
    isConnected,
    requestHealthCheck,
    subscribeToService,
    unsubscribeFromService,
  };
};

// Workflow monitoring WebSocket hook
export const useWorkflowWebSocket = () => {
  const { sendMessage, isConnected } = useInfrastructureWebSocket();

  const subscribeToWorkflow = useCallback((workflowId: string) => {
    sendMessage('subscribe-workflow', { workflowId });
  }, [sendMessage]);

  const unsubscribeFromWorkflow = useCallback((workflowId: string) => {
    sendMessage('unsubscribe-workflow', { workflowId });
  }, [sendMessage]);

  const cancelWorkflow = useCallback((workflowId: string) => {
    sendMessage('cancel-workflow', { workflowId });
  }, [sendMessage]);

  return {
    isConnected,
    subscribeToWorkflow,
    unsubscribeFromWorkflow,
    cancelWorkflow,
  };
};

// Load testing WebSocket hook
export const useLoadTestWebSocket = () => {
  const { sendMessage, isConnected } = useInfrastructureWebSocket();

  const startLoadTest = useCallback((scenarioId: string) => {
    sendMessage('start-load-test', { scenarioId });
  }, [sendMessage]);

  const stopLoadTest = useCallback((testId: string) => {
    sendMessage('stop-load-test', { testId });
  }, [sendMessage]);

  const subscribeToLoadTest = useCallback((testId: string) => {
    sendMessage('subscribe-load-test', { testId });
  }, [sendMessage]);

  return {
    isConnected,
    startLoadTest,
    stopLoadTest,
    subscribeToLoadTest,
  };
};

// Disaster recovery WebSocket hook
export const useDRWebSocket = () => {
  const { sendMessage, isConnected } = useInfrastructureWebSocket();

  const triggerBackup = useCallback((type: 'database' | 'files' | 'full') => {
    sendMessage('trigger-backup', { type });
  }, [sendMessage]);

  const initiateFailover = useCallback(() => {
    sendMessage('initiate-failover', {});
  }, [sendMessage]);

  const scheduleOrillIll = useCallback((drillConfig: any) => {
    sendMessage('schedule-drill', drillConfig);
  }, [sendMessage]);

  return {
    isConnected,
    triggerBackup,
    initiateFailover,
    scheduleOrillIll,
  };
};

// Alert management WebSocket hook
export const useAlertWebSocket = () => {
  const { sendMessage, isConnected } = useInfrastructureWebSocket();

  const acknowledgeAlert = useCallback((alertId: string) => {
    sendMessage('acknowledge-alert', { alertId });
  }, [sendMessage]);

  const createAlert = useCallback((alert: Omit<AlertMessage, 'id' | 'timestamp'>) => {
    sendMessage('create-alert', alert);
  }, [sendMessage]);

  return {
    isConnected,
    acknowledgeAlert,
    createAlert,
  };
};

// ===== UTILITY HOOKS =====

// Connection status hook
export const useWebSocketStatus = () => {
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const { isConnected, isConnecting, error } = useInfrastructureWebSocket();

  useEffect(() => {
    if (error) {
      setStatus('error');
    } else if (isConnecting) {
      setStatus('connecting');
    } else if (isConnected) {
      setStatus('connected');
    } else {
      setStatus('disconnected');
    }
  }, [isConnected, isConnecting, error]);

  return status;
};

// Real-time data hook
export const useRealTimeData = () => {
  const healthStatus = useHealthStore((state) => state.currentHealth?.status);
  const activeWorkflows = useWorkflowStore((state) => 
    state.executions.filter(e => e.status === 'running').length
  );
  const activeLoadTests = useLoadTestStore((state) => state.isRunning);
  const unreadAlerts = useAlertStore((state) => state.unreadCount);

  return {
    healthStatus,
    activeWorkflows,
    activeLoadTests,
    unreadAlerts,
    lastUpdate: new Date().toISOString(),
  };
};
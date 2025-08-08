/**
 * React Hook for WebSocket Integration
 * Provides real-time calculation updates and presence management
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  getWebSocketService,
  WebSocketService,
  CalculationPayload,
  CalculationResult,
  PresenceData,
  CursorData,
  FieldFocusData,
  WebSocketUser,
} from '@/lib/services/websocket-service';
import { useEstimateStore } from '@/stores/useEstimateStore';
import { logger } from '@/lib/logging/simple-logger';

export interface UseWebSocketOptions {
  roomId?: string;
  estimateId?: string;
  autoConnect?: boolean;
  onCalculationResult?: (result: CalculationResult) => void;
  onPresenceUpdate?: (presence: PresenceData) => void;
  onError?: (error: any) => void;
}

export interface UseWebSocketReturn {
  isConnected: boolean;
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error';
  currentUsers: WebSocketUser[];
  cursors: Map<string, { x: number; y: number; userName: string }>;
  focusedFields: Map<string, { userName: string }>;
  sendCalculation: (payload: CalculationPayload) => void;
  requestSync: () => void;
  updateCursor: (x: number, y: number) => void;
  focusField: (fieldId: string, focused: boolean) => void;
  joinRoom: (roomId: string, estimateId: string) => void;
  leaveRoom: () => void;
  reconnect: () => void;
  stats: {
    latency: number;
    calculationsPending: number;
    cacheSize: number;
  };
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    roomId,
    estimateId,
    autoConnect = true,
    onCalculationResult,
    onPresenceUpdate,
    onError,
  } = options;

  // State
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<UseWebSocketReturn['connectionState']>('disconnected');
  const [currentUsers, setCurrentUsers] = useState<WebSocketUser[]>([]);
  const [cursors, setCursors] = useState<Map<string, { x: number; y: number; userName: string }>>(new Map());
  const [focusedFields, setFocusedFields] = useState<Map<string, { userName: string }>>(new Map());
  const [latency, setLatency] = useState(0);
  const [calculationsPending, setCalculationsPending] = useState(0);

  // Refs
  const serviceRef = useRef<WebSocketService | null>(null);
  const pendingCalculations = useRef<Set<string>>(new Set());
  const lastHeartbeat = useRef<number>(0);
  const cursorThrottleRef = useRef<NodeJS.Timeout | null>(null);

  // Store integration
  const estimateStore = useEstimateStore();

  // Initialize service
  useEffect(() => {
    if (!serviceRef.current) {
      serviceRef.current = getWebSocketService({
        autoConnect: false,
      });

      // Set auth token (would come from auth context)
      const token = localStorage.getItem('auth_token') || generateMockToken();
      serviceRef.current.setAuthToken(token);
    }

    const service = serviceRef.current;

    // Event handlers
    const handleConnected = () => {
      setIsConnected(true);
      setConnectionState('connected');
      logger.info('WebSocket connected in hook');
    };

    const handleDisconnected = () => {
      setIsConnected(false);
      setConnectionState('disconnected');
      setCurrentUsers([]);
      setCursors(new Map());
      setFocusedFields(new Map());
      logger.info('WebSocket disconnected in hook');
    };

    const handleConnectionStateChanged = (state: UseWebSocketReturn['connectionState']) => {
      setConnectionState(state);
    };

    const handleRoomJoined = (data: any) => {
      setCurrentUsers(data.users);
      logger.info('Room joined', { users: data.users.length });
    };

    const handleUserJoined = (data: any) => {
      setCurrentUsers((prev) => [...prev, data.user]);
    };

    const handleUserLeft = (data: any) => {
      setCurrentUsers((prev) => prev.filter((u) => u.id !== data.userId));

      // Remove cursor and focus for user
      setCursors((prev) => {
        const next = new Map(prev);
        next.delete(data.userId);
        return next;
      });

      setFocusedFields((prev) => {
        const next = new Map(prev);
        for (const [fieldId, info] of next.entries()) {
          if (info.userName === data.userId) {
            next.delete(fieldId);
          }
        }
        return next;
      });
    };

    const handleCalculationResult = (result: CalculationResult) => {
      const calculationKey = `${result.formulaId}:${JSON.stringify(result.inputs)}`;
      pendingCalculations.current.delete(calculationKey);
      setCalculationsPending(pendingCalculations.current.size);

      // Update store with result
      if (result.delta) {
        // Apply delta update
        estimateStore.updateCalculation(result.formulaId, result.result);
      } else {
        // Full update
        estimateStore.setCalculation(result.formulaId, result.result);
      }

      // Call custom handler
      onCalculationResult?.(result);

      logger.debug('Calculation result processed', {
        formulaId: result.formulaId,
        pending: pendingCalculations.current.size,
      });
    };

    const handleCalculationError = (data: any) => {
      const calculationKey = `${data.formulaId}:error`;
      pendingCalculations.current.delete(calculationKey);
      setCalculationsPending(pendingCalculations.current.size);

      logger.error('Calculation error', data);
      onError?.(data);
    };

    const handlePresenceUpdate = (data: PresenceData) => {
      setCurrentUsers(data.users);
      onPresenceUpdate?.(data);
    };

    const handleCursorUpdate = (data: CursorData) => {
      setCursors((prev) => {
        const next = new Map(prev);
        next.set(data.userId, {
          x: data.x,
          y: data.y,
          userName: data.userName,
        });
        return next;
      });
    };

    const handleFieldFocusUpdate = (data: FieldFocusData) => {
      setFocusedFields((prev) => {
        const next = new Map(prev);
        if (data.focused) {
          next.set(data.fieldId, { userName: data.userName });
        } else {
          next.delete(data.fieldId);
        }
        return next;
      });
    };

    const handleHeartbeat = (data: any) => {
      const now = Date.now();
      if (lastHeartbeat.current > 0) {
        setLatency(now - lastHeartbeat.current);
      }
      lastHeartbeat.current = now;
    };

    const handleSyncResponse = (data: any) => {
      // Update store with synced state
      estimateStore.loadFromSync(data.state);
      logger.info('State synced from server');
    };

    const handleError = (error: any) => {
      logger.error('WebSocket error', error);
      onError?.(error);
    };

    // Register event listeners
    service.on('connected', handleConnected);
    service.on('disconnected', handleDisconnected);
    service.on('connection-state-changed', handleConnectionStateChanged);
    service.on('room-joined', handleRoomJoined);
    service.on('user-joined', handleUserJoined);
    service.on('user-left', handleUserLeft);
    service.on('calculation-result', handleCalculationResult);
    service.on('calculation-error', handleCalculationError);
    service.on('presence-update', handlePresenceUpdate);
    service.on('cursor-update', handleCursorUpdate);
    service.on('field-focus-update', handleFieldFocusUpdate);
    service.on('heartbeat', handleHeartbeat);
    service.on('sync-response', handleSyncResponse);
    service.on('error', handleError);
    service.on('server-error', handleError);

    // Auto-connect if requested
    if (autoConnect) {
      service.connect();
    }

    // Auto-join room if provided
    if (roomId && estimateId && service.isConnected()) {
      service.joinRoom(roomId, estimateId);
    }

    // Cleanup
    return () => {
      service.off('connected', handleConnected);
      service.off('disconnected', handleDisconnected);
      service.off('connection-state-changed', handleConnectionStateChanged);
      service.off('room-joined', handleRoomJoined);
      service.off('user-joined', handleUserJoined);
      service.off('user-left', handleUserLeft);
      service.off('calculation-result', handleCalculationResult);
      service.off('calculation-error', handleCalculationError);
      service.off('presence-update', handlePresenceUpdate);
      service.off('cursor-update', handleCursorUpdate);
      service.off('field-focus-update', handleFieldFocusUpdate);
      service.off('heartbeat', handleHeartbeat);
      service.off('sync-response', handleSyncResponse);
      service.off('error', handleError);
      service.off('server-error', handleError);
    };
  }, [autoConnect, roomId, estimateId, onCalculationResult, onPresenceUpdate, onError]);

  // Callbacks
  const sendCalculation = useCallback((payload: CalculationPayload) => {
    if (!serviceRef.current?.isConnected()) {
      logger.warn('Cannot send calculation - not connected');
      return;
    }

    const calculationKey = `${payload.formulaId}:${JSON.stringify(payload.inputs)}`;
    pendingCalculations.current.add(calculationKey);
    setCalculationsPending(pendingCalculations.current.size);

    serviceRef.current.sendCalculation(payload);
  }, []);

  const requestSync = useCallback(() => {
    if (!serviceRef.current?.isConnected()) {
      logger.warn('Cannot request sync - not connected');
      return;
    }

    serviceRef.current.requestSync();
  }, []);

  const updateCursor = useCallback((x: number, y: number) => {
    if (!serviceRef.current?.isConnected()) {
      return;
    }

    // Throttle cursor updates to 60fps
    if (cursorThrottleRef.current) {
      clearTimeout(cursorThrottleRef.current);
    }

    cursorThrottleRef.current = setTimeout(() => {
      serviceRef.current?.sendCursorPosition(x, y);
      cursorThrottleRef.current = null;
    }, 16); // ~60fps
  }, []);

  const focusField = useCallback((fieldId: string, focused: boolean) => {
    if (!serviceRef.current?.isConnected()) {
      return;
    }

    serviceRef.current.sendFieldFocus(fieldId, focused);
  }, []);

  const joinRoom = useCallback((roomId: string, estimateId: string) => {
    if (!serviceRef.current) {
      logger.error('WebSocket service not initialized');
      return;
    }

    if (!serviceRef.current.isConnected()) {
      // Connect first, then join
      serviceRef.current.connect();

      // Wait for connection then join
      const checkConnection = setInterval(() => {
        if (serviceRef.current?.isConnected()) {
          clearInterval(checkConnection);
          serviceRef.current.joinRoom(roomId, estimateId);
        }
      }, 100);

      // Timeout after 5 seconds
      setTimeout(() => clearInterval(checkConnection), 5000);
    } else {
      serviceRef.current.joinRoom(roomId, estimateId);
    }
  }, []);

  const leaveRoom = useCallback(() => {
    if (!serviceRef.current) {
      return;
    }

    serviceRef.current.leaveRoom();
    setCurrentUsers([]);
    setCursors(new Map());
    setFocusedFields(new Map());
  }, []);

  const reconnect = useCallback(() => {
    if (!serviceRef.current) {
      return;
    }

    serviceRef.current.disconnect();
    setTimeout(() => {
      serviceRef.current?.connect();
    }, 100);
  }, []);

  // Cleanup cursor throttle on unmount
  useEffect(() => {
    return () => {
      if (cursorThrottleRef.current) {
        clearTimeout(cursorThrottleRef.current);
      }
    };
  }, []);

  return {
    isConnected,
    connectionState,
    currentUsers,
    cursors,
    focusedFields,
    sendCalculation,
    requestSync,
    updateCursor,
    focusField,
    joinRoom,
    leaveRoom,
    reconnect,
    stats: {
      latency,
      calculationsPending,
      cacheSize: serviceRef.current?.getCacheSize() || 0,
    },
  };
}

// Helper function to generate mock JWT token for development
function generateMockToken(): string {
  const payload = {
    userId: `user_${Math.random().toString(36).substr(2, 9)}`,
    name: 'Test User',
    role: 'estimator',
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
  };

  // In production, this would be a real JWT
  return btoa(JSON.stringify(payload));
}

export default useWebSocket;

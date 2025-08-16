/**
 * Infrastructure WebSocket Hooks Test Suite
 * Tests for WebSocket connection management and real-time updates
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { io } from 'socket.io-client';
import {
  useInfrastructureWebSocket,
  useHealthWebSocket,
  useWorkflowWebSocket,
  useLoadTestWebSocket,
  useDRWebSocket,
  useAlertWebSocket,
  useWebSocketStatus,
  useRealTimeData,
} from '@/hooks/useInfrastructureWebSocket';
import { useHealthStore, useWorkflowStore, useLoadTestStore, useDRStore, useAlertStore } from '@/stores/useInfrastructureStore';
import { webSocketFactory } from '../factories/webSocketFactory';

// Mock socket.io-client
jest.mock('socket.io-client');
jest.mock('@/stores/useInfrastructureStore');

const mockIo = io as jest.MockedFunction<typeof io>;
const mockSocket = {
  connected: false,
  connect: jest.fn(),
  disconnect: jest.fn(),
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  id: 'test-socket-id',
};

// Mock store hooks
const mockUseHealthStore = useHealthStore as jest.MockedFunction<typeof useHealthStore>;
const mockUseWorkflowStore = useWorkflowStore as jest.MockedFunction<typeof useWorkflowStore>;
const mockUseLoadTestStore = useLoadTestStore as jest.MockedFunction<typeof useLoadTestStore>;
const mockUseDRStore = useDRStore as jest.MockedFunction<typeof useDRStore>;
const mockUseAlertStore = useAlertStore as jest.MockedFunction<typeof useAlertStore>;

describe('Infrastructure WebSocket Hooks', () => {
  let mockStoreActions: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockSocket.connected = false;
    mockSocket.connect.mockClear();
    mockSocket.disconnect.mockClear();
    mockSocket.emit.mockClear();
    mockSocket.on.mockClear();
    mockSocket.off.mockClear();
    
    mockIo.mockReturnValue(mockSocket as any);

    // Setup store actions
    mockStoreActions = {
      updateHealth: jest.fn(),
      addHealthMetric: jest.fn(),
      updateExecution: jest.fn(),
      addExecution: jest.fn(),
      setRealTimeMetrics: jest.fn(),
      updateTestResult: jest.fn(),
      updateBackup: jest.fn(),
      addBackup: jest.fn(),
      addAlert: jest.fn(),
    };

    mockUseHealthStore.mockReturnValue(mockStoreActions);
    mockUseWorkflowStore.mockReturnValue(mockStoreActions);
    mockUseLoadTestStore.mockReturnValue(mockStoreActions);
    mockUseDRStore.mockReturnValue(mockStoreActions);
    mockUseAlertStore.mockReturnValue(mockStoreActions);
  });

  describe('useInfrastructureWebSocket', () => {
    it('should initialize WebSocket connection', () => {
      // Act
      renderHook(() => useInfrastructureWebSocket());

      // Assert
      expect(mockIo).toHaveBeenCalledWith('ws://localhost:3001', {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true,
      });
    });

    it('should connect automatically when autoConnect is true', () => {
      // Act
      renderHook(() => useInfrastructureWebSocket({ autoConnect: true }));

      // Assert
      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
    });

    it('should not connect automatically when autoConnect is false', () => {
      // Act
      const { result } = renderHook(() => useInfrastructureWebSocket({ autoConnect: false }));

      // Assert
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isConnecting).toBe(false);
    });

    it('should handle successful connection', async () => {
      // Arrange
      const { result } = renderHook(() => useInfrastructureWebSocket());
      
      // Act - simulate connection
      act(() => {
        mockSocket.connected = true;
        const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1];
        connectHandler?.();
      });

      // Assert
      expect(result.current.isConnected).toBe(true);
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mockSocket.emit).toHaveBeenCalledWith('subscribe', {
        topics: ['health', 'workflows', 'load-tests', 'backups', 'alerts'],
      });
    });

    it('should handle connection errors', async () => {
      // Arrange
      const { result } = renderHook(() => useInfrastructureWebSocket());
      
      // Act - simulate connection error
      act(() => {
        const errorHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect_error')?.[1];
        errorHandler?.(new Error('Connection failed'));
      });

      // Assert
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.error).toBe('Connection failed');
    });

    it('should handle disconnection with auto-reconnect', async () => {
      // Arrange
      const { result } = renderHook(() => useInfrastructureWebSocket({ reconnectAttempts: 3 }));
      
      // First connect
      act(() => {
        mockSocket.connected = true;
        const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1];
        connectHandler?.();
      });

      // Act - simulate disconnection
      act(() => {
        mockSocket.connected = false;
        const disconnectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect')?.[1];
        disconnectHandler?.('transport close');
      });

      // Assert
      expect(result.current.isConnected).toBe(false);
      expect(result.current.connectionAttempts).toBe(1);
    });

    it('should send messages when connected', () => {
      // Arrange
      const { result } = renderHook(() => useInfrastructureWebSocket());
      
      // Connect first
      act(() => {
        mockSocket.connected = true;
        const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1];
        connectHandler?.();
      });

      // Act
      act(() => {
        result.current.sendMessage('test-event', { data: 'test' });
      });

      // Assert
      expect(mockSocket.emit).toHaveBeenCalledWith('test-event', { data: 'test' });
    });

    it('should not send messages when disconnected', () => {
      // Arrange
      const { result } = renderHook(() => useInfrastructureWebSocket());
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Act
      act(() => {
        result.current.sendMessage('test-event', { data: 'test' });
      });

      // Assert
      expect(mockSocket.emit).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('WebSocket not connected, cannot send message');
      
      consoleSpy.mockRestore();
    });

    it('should handle health update messages', () => {
      // Arrange
      const { result } = renderHook(() => useInfrastructureWebSocket());
      const healthUpdate = webSocketFactory.createHealthUpdate();
      
      // Act
      act(() => {
        const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'message')?.[1];
        messageHandler?.({
          type: 'health-update',
          payload: healthUpdate,
        });
      });

      // Assert
      expect(mockStoreActions.updateHealth).toHaveBeenCalledWith(healthUpdate);
      expect(mockStoreActions.addHealthMetric).toHaveBeenCalled();
    });

    it('should handle workflow update messages', () => {
      // Arrange
      const { result } = renderHook(() => useInfrastructureWebSocket());
      const workflowUpdate = webSocketFactory.createWorkflowUpdate();
      
      // Act
      act(() => {
        const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'message')?.[1];
        messageHandler?.({
          type: 'workflow-update',
          payload: workflowUpdate,
        });
      });

      // Assert
      expect(mockStoreActions.addExecution).toHaveBeenCalledWith(workflowUpdate);
    });

    it('should handle load test update messages', () => {
      // Arrange
      const { result } = renderHook(() => useInfrastructureWebSocket());
      const loadTestUpdate = webSocketFactory.createLoadTestUpdate();
      
      // Act
      act(() => {
        const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'message')?.[1];
        messageHandler?.({
          type: 'load-test-update',
          payload: loadTestUpdate,
        });
      });

      // Assert
      expect(mockStoreActions.setRealTimeMetrics).toHaveBeenCalledWith(loadTestUpdate);
    });

    it('should handle backup update messages', () => {
      // Arrange
      const { result } = renderHook(() => useInfrastructureWebSocket());
      const backupUpdate = webSocketFactory.createBackupUpdate();
      
      // Act
      act(() => {
        const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'message')?.[1];
        messageHandler?.({
          type: 'backup-update',
          payload: backupUpdate,
        });
      });

      // Assert
      expect(mockStoreActions.addBackup).toHaveBeenCalledWith(backupUpdate);
    });

    it('should handle alert messages', () => {
      // Arrange
      const { result } = renderHook(() => useInfrastructureWebSocket());
      const alert = webSocketFactory.createAlert();
      
      // Act
      act(() => {
        const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'message')?.[1];
        messageHandler?.({
          type: 'alert',
          payload: alert,
        });
      });

      // Assert
      expect(mockStoreActions.addAlert).toHaveBeenCalledWith(alert);
    });

    it('should handle unknown message types gracefully', () => {
      // Arrange
      const { result } = renderHook(() => useInfrastructureWebSocket());
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Act
      act(() => {
        const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'message')?.[1];
        messageHandler?.({
          type: 'unknown-type',
          payload: { data: 'test' },
        });
      });

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith('Unknown message type:', 'unknown-type');
      
      consoleSpy.mockRestore();
    });

    it('should handle message processing errors', () => {
      // Arrange
      const { result } = renderHook(() => useInfrastructureWebSocket());
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Mock store action to throw error
      mockStoreActions.updateHealth.mockImplementation(() => {
        throw new Error('Store update failed');
      });
      
      // Act
      act(() => {
        const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'message')?.[1];
        messageHandler?.({
          type: 'health-update',
          payload: webSocketFactory.createHealthUpdate(),
        });
      });

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith('Error handling WebSocket message:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should disconnect properly on unmount', () => {
      // Arrange
      const { unmount } = renderHook(() => useInfrastructureWebSocket());

      // Act
      unmount();

      // Assert
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });

  describe('useHealthWebSocket', () => {
    it('should request health check', () => {
      // Arrange
      const { result } = renderHook(() => useHealthWebSocket());
      
      // Connect WebSocket
      act(() => {
        mockSocket.connected = true;
      });

      // Act
      act(() => {
        result.current.requestHealthCheck();
      });

      // Assert
      expect(mockSocket.emit).toHaveBeenCalledWith('request-health-check', {});
    });

    it('should subscribe to service updates', () => {
      // Arrange
      const { result } = renderHook(() => useHealthWebSocket());
      
      // Connect WebSocket
      act(() => {
        mockSocket.connected = true;
      });

      // Act
      act(() => {
        result.current.subscribeToService('database');
      });

      // Assert
      expect(mockSocket.emit).toHaveBeenCalledWith('subscribe-service', { service: 'database' });
    });

    it('should unsubscribe from service updates', () => {
      // Arrange
      const { result } = renderHook(() => useHealthWebSocket());
      
      // Connect WebSocket
      act(() => {
        mockSocket.connected = true;
      });

      // Act
      act(() => {
        result.current.unsubscribeFromService('database');
      });

      // Assert
      expect(mockSocket.emit).toHaveBeenCalledWith('unsubscribe-service', { service: 'database' });
    });
  });

  describe('useWorkflowWebSocket', () => {
    it('should subscribe to workflow updates', () => {
      // Arrange
      const { result } = renderHook(() => useWorkflowWebSocket());
      
      // Connect WebSocket
      act(() => {
        mockSocket.connected = true;
      });

      // Act
      act(() => {
        result.current.subscribeToWorkflow('workflow-123');
      });

      // Assert
      expect(mockSocket.emit).toHaveBeenCalledWith('subscribe-workflow', { workflowId: 'workflow-123' });
    });

    it('should cancel workflow execution', () => {
      // Arrange
      const { result } = renderHook(() => useWorkflowWebSocket());
      
      // Connect WebSocket
      act(() => {
        mockSocket.connected = true;
      });

      // Act
      act(() => {
        result.current.cancelWorkflow('workflow-123');
      });

      // Assert
      expect(mockSocket.emit).toHaveBeenCalledWith('cancel-workflow', { workflowId: 'workflow-123' });
    });
  });

  describe('useLoadTestWebSocket', () => {
    it('should start load test', () => {
      // Arrange
      const { result } = renderHook(() => useLoadTestWebSocket());
      
      // Connect WebSocket
      act(() => {
        mockSocket.connected = true;
      });

      // Act
      act(() => {
        result.current.startLoadTest('scenario-123');
      });

      // Assert
      expect(mockSocket.emit).toHaveBeenCalledWith('start-load-test', { scenarioId: 'scenario-123' });
    });

    it('should stop load test', () => {
      // Arrange
      const { result } = renderHook(() => useLoadTestWebSocket());
      
      // Connect WebSocket
      act(() => {
        mockSocket.connected = true;
      });

      // Act
      act(() => {
        result.current.stopLoadTest('test-123');
      });

      // Assert
      expect(mockSocket.emit).toHaveBeenCalledWith('stop-load-test', { testId: 'test-123' });
    });
  });

  describe('useDRWebSocket', () => {
    it('should trigger backup', () => {
      // Arrange
      const { result } = renderHook(() => useDRWebSocket());
      
      // Connect WebSocket
      act(() => {
        mockSocket.connected = true;
      });

      // Act
      act(() => {
        result.current.triggerBackup('database');
      });

      // Assert
      expect(mockSocket.emit).toHaveBeenCalledWith('trigger-backup', { type: 'database' });
    });

    it('should initiate failover', () => {
      // Arrange
      const { result } = renderHook(() => useDRWebSocket());
      
      // Connect WebSocket
      act(() => {
        mockSocket.connected = true;
      });

      // Act
      act(() => {
        result.current.initiateFailover();
      });

      // Assert
      expect(mockSocket.emit).toHaveBeenCalledWith('initiate-failover', {});
    });
  });

  describe('useAlertWebSocket', () => {
    it('should acknowledge alert', () => {
      // Arrange
      const { result } = renderHook(() => useAlertWebSocket());
      
      // Connect WebSocket
      act(() => {
        mockSocket.connected = true;
      });

      // Act
      act(() => {
        result.current.acknowledgeAlert('alert-123');
      });

      // Assert
      expect(mockSocket.emit).toHaveBeenCalledWith('acknowledge-alert', { alertId: 'alert-123' });
    });

    it('should create new alert', () => {
      // Arrange
      const { result } = renderHook(() => useAlertWebSocket());
      
      // Connect WebSocket
      act(() => {
        mockSocket.connected = true;
      });

      const alert = {
        title: 'Test Alert',
        message: 'Test message',
        severity: 'warning' as const,
        source: 'test',
      };

      // Act
      act(() => {
        result.current.createAlert(alert);
      });

      // Assert
      expect(mockSocket.emit).toHaveBeenCalledWith('create-alert', alert);
    });
  });

  describe('useWebSocketStatus', () => {
    it('should return connection status', () => {
      // Arrange & Act
      const { result } = renderHook(() => useWebSocketStatus());

      // Assert
      expect(result.current).toBe('disconnected');
    });

    it('should update status on connection', async () => {
      // Arrange
      const { result } = renderHook(() => useWebSocketStatus());
      
      // Act - simulate connection
      act(() => {
        mockSocket.connected = true;
        const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1];
        connectHandler?.();
      });

      // Assert
      await waitFor(() => {
        expect(result.current).toBe('connected');
      });
    });

    it('should update status on error', async () => {
      // Arrange
      const { result } = renderHook(() => useWebSocketStatus());
      
      // Act - simulate error
      act(() => {
        const errorHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect_error')?.[1];
        errorHandler?.(new Error('Connection failed'));
      });

      // Assert
      await waitFor(() => {
        expect(result.current).toBe('error');
      });
    });
  });

  describe('useRealTimeData', () => {
    it('should aggregate real-time data from all stores', () => {
      // Arrange
      mockUseHealthStore.mockReturnValue({
        currentHealth: { status: 'healthy' },
      });
      mockUseWorkflowStore.mockReturnValue({
        executions: [
          { id: '1', status: 'running' },
          { id: '2', status: 'completed' },
        ],
      });
      mockUseLoadTestStore.mockReturnValue({
        isRunning: true,
      });
      mockUseAlertStore.mockReturnValue({
        unreadCount: 3,
      });

      // Act
      const { result } = renderHook(() => useRealTimeData());

      // Assert
      expect(result.current.healthStatus).toBe('healthy');
      expect(result.current.activeWorkflows).toBe(1);
      expect(result.current.activeLoadTests).toBe(true);
      expect(result.current.unreadAlerts).toBe(3);
      expect(result.current.lastUpdate).toBeDefined();
    });
  });

  describe('Connection Resilience', () => {
    it('should implement exponential backoff for reconnection', async () => {
      // Arrange
      jest.useFakeTimers();
      const { result } = renderHook(() => useInfrastructureWebSocket({ 
        reconnectAttempts: 3,
        reconnectDelay: 1000,
      }));
      
      // Simulate initial connection failure
      act(() => {
        const errorHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect_error')?.[1];
        errorHandler?.(new Error('Connection failed'));
      });

      // Assert first retry attempt
      expect(result.current.connectionAttempts).toBe(1);
      
      // Fast-forward time and trigger second failure
      act(() => {
        jest.advanceTimersByTime(1000);
        const errorHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect_error')?.[1];
        errorHandler?.(new Error('Connection failed'));
      });

      // Assert exponential backoff (second attempt should wait 2 seconds)
      expect(result.current.connectionAttempts).toBe(2);
      
      jest.useRealTimers();
    });

    it('should stop reconnecting after max attempts', async () => {
      // Arrange
      const { result } = renderHook(() => useInfrastructureWebSocket({ 
        reconnectAttempts: 2,
      }));
      
      // Simulate multiple connection failures
      act(() => {
        const errorHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect_error')?.[1];
        // First failure
        errorHandler?.(new Error('Connection failed'));
        // Second failure
        errorHandler?.(new Error('Connection failed'));
        // Third failure (should stop trying)
        errorHandler?.(new Error('Connection failed'));
      });

      // Assert
      expect(result.current.connectionAttempts).toBe(2);
      expect(result.current.error).toBe('Connection failed');
    });
  });
});
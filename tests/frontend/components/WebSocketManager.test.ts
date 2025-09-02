import { WebSocketManager } from '../../../apps/collaboration-editor/src/lib/websocket-manager';

// Mock WebSocket
class MockWebSocket {
  public onopen: ((event: Event) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public readyState: number = WebSocket.CONNECTING;
  
  public static CONNECTING = 0;
  public static OPEN = 1;
  public static CLOSING = 2;
  public static CLOSED = 3;

  constructor(public url: string, public protocols?: string | string[]) {}

  send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
  }

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSING;
    setTimeout(() => {
      this.readyState = MockWebSocket.CLOSED;
      if (this.onclose) {
        this.onclose(new CloseEvent('close', { code, reason }));
      }
    }, 0);
  }

  // Helper methods for testing
  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }

  simulateMessage(data: any) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
    }
  }

  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }

  simulateClose(code: number = 1000, reason: string = '') {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code, reason }));
    }
  }
}

// Replace global WebSocket with mock
(global as any).WebSocket = MockWebSocket;

describe('WebSocketManager', () => {
  let wsManager: WebSocketManager;
  let mockWebSocket: MockWebSocket;

  beforeEach(() => {
    wsManager = new WebSocketManager();
    // Mock the WebSocket creation
    jest.spyOn(global as any, 'WebSocket').mockImplementation((url: string, protocols?: string | string[]) => {
      mockWebSocket = new MockWebSocket(url, protocols);
      return mockWebSocket;
    });
  });

  afterEach(() => {
    wsManager.disconnect();
    jest.restoreAllMocks();
  });

  describe('Connection Management', () => {
    test('should establish connection successfully', async () => {
      const connectPromise = wsManager.connect('ws://localhost:8080', 'user-123');
      
      // Simulate successful connection
      mockWebSocket.simulateOpen();
      
      await expect(connectPromise).resolves.toBeUndefined();
      expect(wsManager.isConnected()).toBe(true);
    });

    test('should handle connection failure', async () => {
      const connectPromise = wsManager.connect('ws://localhost:8080', 'user-123');
      
      // Simulate connection error
      mockWebSocket.simulateError();
      
      await expect(connectPromise).rejects.toThrow('WebSocket connection failed');
      expect(wsManager.isConnected()).toBe(false);
    });

    test('should handle connection timeout', async () => {
      jest.useFakeTimers();
      
      const connectPromise = wsManager.connect('ws://localhost:8080', 'user-123', {
        timeout: 5000
      });
      
      // Advance timers past timeout
      jest.advanceTimersByTime(6000);
      
      await expect(connectPromise).rejects.toThrow('Connection timeout');
      
      jest.useRealTimers();
    });

    test('should disconnect cleanly', async () => {
      await wsManager.connect('ws://localhost:8080', 'user-123');
      mockWebSocket.simulateOpen();
      
      wsManager.disconnect();
      
      expect(mockWebSocket.readyState).toBe(MockWebSocket.CLOSING);
      expect(wsManager.isConnected()).toBe(false);
    });

    test('should auto-reconnect on unexpected disconnection', async () => {
      const onReconnect = jest.fn();
      wsManager.on('reconnect', onReconnect);
      
      await wsManager.connect('ws://localhost:8080', 'user-123', {
        autoReconnect: true,
        reconnectInterval: 100
      });
      mockWebSocket.simulateOpen();
      
      // Simulate unexpected disconnection
      mockWebSocket.simulateClose(1006, 'Abnormal closure');
      
      // Wait for reconnection attempt
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(onReconnect).toHaveBeenCalled();
    });

    test('should respect maximum reconnection attempts', async () => {
      const onReconnectFailed = jest.fn();
      wsManager.on('reconnect-failed', onReconnectFailed);
      
      await wsManager.connect('ws://localhost:8080', 'user-123', {
        autoReconnect: true,
        maxReconnectAttempts: 3,
        reconnectInterval: 10
      });
      mockWebSocket.simulateOpen();
      
      // Simulate persistent connection failures
      for (let i = 0; i < 4; i++) {
        mockWebSocket.simulateClose(1006, 'Connection lost');
        await new Promise(resolve => setTimeout(resolve, 20));
        mockWebSocket.simulateError();
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      
      expect(onReconnectFailed).toHaveBeenCalled();
    });
  });

  describe('Message Handling', () => {
    beforeEach(async () => {
      await wsManager.connect('ws://localhost:8080', 'user-123');
      mockWebSocket.simulateOpen();
    });

    test('should send messages correctly', () => {
      const message = {
        type: 'document:operation',
        payload: {
          documentId: 'doc-123',
          operation: { type: 'INSERT', position: 5, content: 'Hello' }
        }
      };

      const sendSpy = jest.spyOn(mockWebSocket, 'send');
      
      wsManager.send('document:operation', message.payload);
      
      expect(sendSpy).toHaveBeenCalledWith(JSON.stringify({
        type: 'document:operation',
        payload: message.payload,
        timestamp: expect.any(Number),
        messageId: expect.any(String)
      }));
    });

    test('should handle incoming messages', () => {
      const handler = jest.fn();
      wsManager.on('document:operation', handler);
      
      const incomingMessage = {
        type: 'document:operation',
        payload: {
          operation: { type: 'INSERT', position: 10, content: 'World' },
          userId: 'user-456'
        },
        messageId: 'msg-123'
      };
      
      mockWebSocket.simulateMessage(incomingMessage);
      
      expect(handler).toHaveBeenCalledWith(incomingMessage.payload);
    });

    test('should handle malformed messages gracefully', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const handler = jest.fn();
      wsManager.on('document:operation', handler);
      
      // Send invalid JSON
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage(new MessageEvent('message', { data: 'invalid json' }));
      }
      
      expect(handler).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to parse WebSocket message:',
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });

    test('should queue messages when disconnected', () => {
      wsManager.disconnect();
      
      const message = {
        type: 'document:operation',
        payload: { operation: 'test' }
      };
      
      wsManager.send('document:operation', message.payload);
      
      // Should not throw error, message should be queued
      expect(wsManager.getQueuedMessagesCount()).toBe(1);
    });

    test('should flush queued messages on reconnection', async () => {
      wsManager.disconnect();
      
      // Queue some messages
      wsManager.send('document:operation', { op: 1 });
      wsManager.send('document:operation', { op: 2 });
      wsManager.send('document:operation', { op: 3 });
      
      expect(wsManager.getQueuedMessagesCount()).toBe(3);
      
      // Reconnect
      await wsManager.connect('ws://localhost:8080', 'user-123');
      mockWebSocket.simulateOpen();
      
      const sendSpy = jest.spyOn(mockWebSocket, 'send');
      
      // Wait for message flushing
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(sendSpy).toHaveBeenCalledTimes(3);
      expect(wsManager.getQueuedMessagesCount()).toBe(0);
    });
  });

  describe('Event Handling', () => {
    test('should register and call event listeners', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      wsManager.on('document:operation', handler1);
      wsManager.on('document:operation', handler2);
      
      const eventData = { operation: 'test' };
      wsManager.emit('document:operation', eventData);
      
      expect(handler1).toHaveBeenCalledWith(eventData);
      expect(handler2).toHaveBeenCalledWith(eventData);
    });

    test('should remove event listeners', () => {
      const handler = jest.fn();
      
      wsManager.on('document:operation', handler);
      wsManager.off('document:operation', handler);
      
      wsManager.emit('document:operation', { test: true });
      
      expect(handler).not.toHaveBeenCalled();
    });

    test('should support one-time listeners', () => {
      const handler = jest.fn();
      
      wsManager.once('document:operation', handler);
      
      wsManager.emit('document:operation', { test: 1 });
      wsManager.emit('document:operation', { test: 2 });
      
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ test: 1 });
    });

    test('should handle listener errors gracefully', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const faultyHandler = jest.fn(() => {
        throw new Error('Handler error');
      });
      const goodHandler = jest.fn();
      
      wsManager.on('test:event', faultyHandler);
      wsManager.on('test:event', goodHandler);
      
      wsManager.emit('test:event', { data: 'test' });
      
      expect(faultyHandler).toHaveBeenCalled();
      expect(goodHandler).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error in event handler for test:event:',
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Heartbeat and Connection Monitoring', () => {
    beforeEach(async () => {
      await wsManager.connect('ws://localhost:8080', 'user-123', {
        heartbeatInterval: 100
      });
      mockWebSocket.simulateOpen();
    });

    test('should send heartbeat messages', async () => {
      const sendSpy = jest.spyOn(mockWebSocket, 'send');
      
      // Wait for heartbeat
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(sendSpy).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'heartbeat',
          payload: { timestamp: expect.any(Number) },
          timestamp: expect.any(Number),
          messageId: expect.any(String)
        })
      );
    });

    test('should detect connection loss via heartbeat timeout', async () => {
      const onConnectionLost = jest.fn();
      wsManager.on('connection-lost', onConnectionLost);
      
      await wsManager.connect('ws://localhost:8080', 'user-123', {
        heartbeatInterval: 50,
        heartbeatTimeout: 100
      });
      mockWebSocket.simulateOpen();
      
      // Don't respond to heartbeat
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(onConnectionLost).toHaveBeenCalled();
    });

    test('should respond to server heartbeat', async () => {
      const sendSpy = jest.spyOn(mockWebSocket, 'send');
      
      // Simulate server heartbeat
      mockWebSocket.simulateMessage({
        type: 'heartbeat',
        payload: { timestamp: Date.now() }
      });
      
      expect(sendSpy).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'heartbeat-response',
          payload: { timestamp: expect.any(Number) },
          timestamp: expect.any(Number),
          messageId: expect.any(String)
        })
      );
    });
  });

  describe('Document-Specific Operations', () => {
    beforeEach(async () => {
      await wsManager.connect('ws://localhost:8080', 'user-123');
      mockWebSocket.simulateOpen();
    });

    test('should join document room', () => {
      const sendSpy = jest.spyOn(mockWebSocket, 'send');
      
      wsManager.joinDocument('doc-123');
      
      expect(sendSpy).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'document:join',
          payload: { documentId: 'doc-123' },
          timestamp: expect.any(Number),
          messageId: expect.any(String)
        })
      );
    });

    test('should leave document room', () => {
      const sendSpy = jest.spyOn(mockWebSocket, 'send');
      
      wsManager.leaveDocument('doc-123');
      
      expect(sendSpy).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'document:leave',
          payload: { documentId: 'doc-123' },
          timestamp: expect.any(Number),
          messageId: expect.any(String)
        })
      );
    });

    test('should send cursor updates', () => {
      const sendSpy = jest.spyOn(mockWebSocket, 'send');
      
      wsManager.updateCursor('doc-123', {
        position: 15,
        selection: { start: 10, end: 20 }
      });
      
      expect(sendSpy).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'cursor:update',
          payload: {
            documentId: 'doc-123',
            position: 15,
            selection: { start: 10, end: 20 }
          },
          timestamp: expect.any(Number),
          messageId: expect.any(String)
        })
      );
    });

    test('should send operations with acknowledgment', async () => {
      const sendSpy = jest.spyOn(mockWebSocket, 'send');
      
      const operationPromise = wsManager.sendOperation('doc-123', {
        type: 'INSERT',
        position: 5,
        content: 'Hello'
      });
      
      // Simulate server acknowledgment
      const sentMessage = JSON.parse(sendSpy.mock.calls[0][0] as string);
      mockWebSocket.simulateMessage({
        type: 'operation:ack',
        payload: { messageId: sentMessage.messageId, success: true }
      });
      
      await expect(operationPromise).resolves.toEqual({ success: true });
    });

    test('should handle operation acknowledgment timeout', async () => {
      jest.useFakeTimers();
      
      const operationPromise = wsManager.sendOperation('doc-123', {
        type: 'INSERT',
        position: 5,
        content: 'Hello'
      }, { ackTimeout: 1000 });
      
      // Advance time past timeout
      jest.advanceTimersByTime(1500);
      
      await expect(operationPromise).rejects.toThrow('Operation acknowledgment timeout');
      
      jest.useRealTimers();
    });
  });

  describe('Connection State Management', () => {
    test('should track connection states correctly', async () => {
      expect(wsManager.getConnectionState()).toBe('disconnected');
      
      const connectPromise = wsManager.connect('ws://localhost:8080', 'user-123');
      expect(wsManager.getConnectionState()).toBe('connecting');
      
      mockWebSocket.simulateOpen();
      await connectPromise;
      expect(wsManager.getConnectionState()).toBe('connected');
      
      wsManager.disconnect();
      expect(wsManager.getConnectionState()).toBe('disconnected');
    });

    test('should emit connection state change events', async () => {
      const stateChangeHandler = jest.fn();
      wsManager.on('connection-state-change', stateChangeHandler);
      
      await wsManager.connect('ws://localhost:8080', 'user-123');
      mockWebSocket.simulateOpen();
      
      expect(stateChangeHandler).toHaveBeenCalledWith('connected');
      
      wsManager.disconnect();
      expect(stateChangeHandler).toHaveBeenCalledWith('disconnected');
    });

    test('should handle connection state during reconnection', async () => {
      const stateChangeHandler = jest.fn();
      wsManager.on('connection-state-change', stateChangeHandler);
      
      await wsManager.connect('ws://localhost:8080', 'user-123', {
        autoReconnect: true
      });
      mockWebSocket.simulateOpen();
      
      // Simulate unexpected disconnection
      mockWebSocket.simulateClose(1006);
      
      expect(stateChangeHandler).toHaveBeenCalledWith('reconnecting');
    });
  });

  describe('Message Ordering and Reliability', () => {
    beforeEach(async () => {
      await wsManager.connect('ws://localhost:8080', 'user-123');
      mockWebSocket.simulateOpen();
    });

    test('should ensure message ordering', () => {
      const sendSpy = jest.spyOn(mockWebSocket, 'send');
      
      wsManager.send('message1', { data: 1 });
      wsManager.send('message2', { data: 2 });
      wsManager.send('message3', { data: 3 });
      
      const calls = sendSpy.mock.calls.map(call => JSON.parse(call[0] as string));
      
      // Messages should have incrementing sequence numbers
      expect(calls[0].sequenceNumber).toBeLessThan(calls[1].sequenceNumber);
      expect(calls[1].sequenceNumber).toBeLessThan(calls[2].sequenceNumber);
    });

    test('should handle duplicate message detection', () => {
      const handler = jest.fn();
      wsManager.on('document:operation', handler);
      
      const message = {
        type: 'document:operation',
        payload: { operation: 'test' },
        messageId: 'duplicate-test'
      };
      
      // Send same message twice
      mockWebSocket.simulateMessage(message);
      mockWebSocket.simulateMessage(message);
      
      // Handler should only be called once
      expect(handler).toHaveBeenCalledTimes(1);
    });

    test('should request message retransmission', () => {
      const sendSpy = jest.spyOn(mockWebSocket, 'send');
      
      // Simulate missing message in sequence
      mockWebSocket.simulateMessage({
        type: 'document:operation',
        payload: { operation: 'op1' },
        sequenceNumber: 1
      });
      
      mockWebSocket.simulateMessage({
        type: 'document:operation',
        payload: { operation: 'op3' },
        sequenceNumber: 3  // Missing sequence 2
      });
      
      // Should request retransmission of missing message
      expect(sendSpy).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'retransmit:request',
          payload: { missingSequenceNumbers: [2] },
          timestamp: expect.any(Number),
          messageId: expect.any(String)
        })
      );
    });
  });

  describe('Performance and Memory Management', () => {
    test('should limit message history size', async () => {
      await wsManager.connect('ws://localhost:8080', 'user-123', {
        maxMessageHistory: 100
      });
      mockWebSocket.simulateOpen();
      
      // Send more messages than the limit
      for (let i = 0; i < 150; i++) {
        mockWebSocket.simulateMessage({
          type: 'test:message',
          payload: { number: i },
          messageId: `msg-${i}`
        });
      }
      
      expect(wsManager.getMessageHistorySize()).toBe(100);
    });

    test('should cleanup event listeners on disconnect', () => {
      const handler = jest.fn();
      wsManager.on('test:event', handler);
      
      wsManager.disconnect();
      
      // Internal cleanup should remove listeners
      expect(wsManager.getListenerCount('test:event')).toBe(0);
    });

    test('should throttle high-frequency events', async () => {
      jest.useFakeTimers();
      const sendSpy = jest.spyOn(mockWebSocket, 'send');
      
      await wsManager.connect('ws://localhost:8080', 'user-123');
      mockWebSocket.simulateOpen();
      
      // Send many cursor updates rapidly
      for (let i = 0; i < 100; i++) {
        wsManager.updateCursor('doc-123', { position: i });
      }
      
      // Should throttle the updates
      expect(sendSpy).toHaveBeenCalledTimes(1);
      
      jest.advanceTimersByTime(100); // Advance past throttle interval
      expect(sendSpy).toHaveBeenCalledTimes(2);
      
      jest.useRealTimers();
    });
  });
});
import { WebSocket } from 'ws';
import { createServer, Server } from 'http';
import { AddressInfo } from 'net';
import { vi, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';

import { ValuationWebSocketServer } from '../../src/websockets/valuation-websocket-server';
import { WebSocketMessage, WSMessageType } from '../../src/types/websocket';
import { mockCurrentValuation, mockMarketComparison } from '../__mocks__/valuationMocks';

// Mock WebSocket server setup
class MockWebSocketServer extends ValuationWebSocketServer {
  public clients: Set<WebSocket> = new Set();
  public subscriptions: Map<string, Set<string>> = new Map();

  constructor(server: Server) {
    super(server);
  }

  // Expose protected methods for testing
  public testBroadcast(message: WebSocketMessage, filter?: (clientId: string) => boolean) {
    return this.broadcast(message, filter);
  }

  public testSubscribeClient(clientId: string, subscriptionType: string, itemId?: string) {
    return this.subscribeClient(clientId, subscriptionType, itemId);
  }

  public testUnsubscribeClient(clientId: string, subscriptionType: string, itemId?: string) {
    return this.unsubscribeClient(clientId, subscriptionType, itemId);
  }

  public getClientSubscriptions(clientId: string): string[] {
    const subscriptions: string[] = [];
    this.subscriptions.forEach((clients, subscription) => {
      if (clients.has(clientId)) {
        subscriptions.push(subscription);
      }
    });
    return subscriptions;
  }
}

// Helper function to create WebSocket message
function createWSMessage(type: WSMessageType, data: any, itemId?: string, roomId?: string): WebSocketMessage {
  return {
    type,
    data,
    itemId,
    roomId,
    timestamp: new Date().toISOString(),
  };
}

// Helper function to wait for WebSocket events
function waitForWebSocketEvent(ws: WebSocket, event: string, timeout: number = 5000): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for ${event} event`));
    }, timeout);

    ws.on(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

describe('WebSocket Subscription System', () => {
  let httpServer: Server;
  let wsServer: MockWebSocketServer;
  let serverAddress: AddressInfo;
  let testClients: WebSocket[] = [];

  beforeAll(async () => {
    // Create HTTP server for WebSocket to attach to
    httpServer = createServer();
    
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        resolve();
      });
    });

    serverAddress = httpServer.address() as AddressInfo;
    wsServer = new MockWebSocketServer(httpServer);
  });

  afterAll(async () => {
    if (wsServer) {
      await wsServer.close();
    }
    if (httpServer) {
      await new Promise<void>((resolve) => {
        httpServer.close(() => resolve());
      });
    }
  });

  beforeEach(() => {
    // Clear any existing test clients
    testClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.close();
      }
    });
    testClients = [];
  });

  afterEach(async () => {
    // Clean up test clients
    const closePromises = testClients.map(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.close();
        return waitForWebSocketEvent(client, 'close');
      }
      return Promise.resolve();
    });
    
    await Promise.all(closePromises);
    testClients = [];
  });

  describe('Connection Management', () => {
    it('should accept WebSocket connections', async () => {
      const client = new WebSocket(`ws://localhost:${serverAddress.port}`);
      testClients.push(client);

      await waitForWebSocketEvent(client, 'open');
      expect(client.readyState).toBe(WebSocket.OPEN);
    });

    it('should handle client disconnections gracefully', async () => {
      const client = new WebSocket(`ws://localhost:${serverAddress.port}`);
      testClients.push(client);

      await waitForWebSocketEvent(client, 'open');
      
      const clientId = 'test-client-1';
      
      // Subscribe client to updates
      client.send(JSON.stringify({
        type: 'subscribe',
        subscription: 'valuation_updates',
        itemId: 'test-item-123',
        clientId: clientId,
      }));

      // Verify subscription
      expect(wsServer.getClientSubscriptions(clientId)).toContain('valuation_updates:test-item-123');

      // Close connection
      client.close();
      await waitForWebSocketEvent(client, 'close');

      // Subscriptions should be cleaned up
      expect(wsServer.getClientSubscriptions(clientId)).toHaveLength(0);
    });

    it('should handle multiple concurrent connections', async () => {
      const numClients = 10;
      const clientPromises = [];

      for (let i = 0; i < numClients; i++) {
        const client = new WebSocket(`ws://localhost:${serverAddress.port}`);
        testClients.push(client);
        clientPromises.push(waitForWebSocketEvent(client, 'open'));
      }

      await Promise.all(clientPromises);

      // All clients should be connected
      testClients.forEach(client => {
        expect(client.readyState).toBe(WebSocket.OPEN);
      });

      expect(wsServer.clients.size).toBe(numClients);
    });
  });

  describe('Subscription Management', () => {
    let client: WebSocket;

    beforeEach(async () => {
      client = new WebSocket(`ws://localhost:${serverAddress.port}`);
      testClients.push(client);
      await waitForWebSocketEvent(client, 'open');
    });

    it('should handle valuation update subscriptions', async () => {
      const itemId = 'test-item-123';
      const clientId = 'test-client-1';

      // Subscribe to valuation updates
      client.send(JSON.stringify({
        type: 'subscribe',
        subscription: 'valuation_updates',
        itemId: itemId,
        clientId: clientId,
      }));

      // Wait for subscription confirmation
      const response = await waitForWebSocketEvent(client, 'message');
      const message = JSON.parse(response.toString());

      expect(message.type).toBe('subscription_confirmed');
      expect(message.subscription).toBe('valuation_updates');
      expect(message.itemId).toBe(itemId);

      // Verify subscription in server
      expect(wsServer.getClientSubscriptions(clientId)).toContain(`valuation_updates:${itemId}`);
    });

    it('should handle pricing insights subscriptions', async () => {
      const clientId = 'test-client-1';

      client.send(JSON.stringify({
        type: 'subscribe',
        subscription: 'pricing_insights',
        clientId: clientId,
      }));

      const response = await waitForWebSocketEvent(client, 'message');
      const message = JSON.parse(response.toString());

      expect(message.type).toBe('subscription_confirmed');
      expect(message.subscription).toBe('pricing_insights');

      expect(wsServer.getClientSubscriptions(clientId)).toContain('pricing_insights');
    });

    it('should handle room-specific subscriptions', async () => {
      const roomId = 'test-room-456';
      const clientId = 'test-client-1';

      client.send(JSON.stringify({
        type: 'subscribe',
        subscription: 'room_valuations',
        roomId: roomId,
        clientId: clientId,
      }));

      const response = await waitForWebSocketEvent(client, 'message');
      const message = JSON.parse(response.toString());

      expect(message.type).toBe('subscription_confirmed');
      expect(message.subscription).toBe('room_valuations');
      expect(message.roomId).toBe(roomId);

      expect(wsServer.getClientSubscriptions(clientId)).toContain(`room_valuations:${roomId}`);
    });

    it('should handle unsubscribe requests', async () => {
      const itemId = 'test-item-123';
      const clientId = 'test-client-1';

      // First subscribe
      wsServer.testSubscribeClient(clientId, 'valuation_updates', itemId);
      expect(wsServer.getClientSubscriptions(clientId)).toContain(`valuation_updates:${itemId}`);

      // Then unsubscribe
      client.send(JSON.stringify({
        type: 'unsubscribe',
        subscription: 'valuation_updates',
        itemId: itemId,
        clientId: clientId,
      }));

      const response = await waitForWebSocketEvent(client, 'message');
      const message = JSON.parse(response.toString());

      expect(message.type).toBe('subscription_removed');
      expect(message.subscription).toBe('valuation_updates');
      expect(message.itemId).toBe(itemId);

      expect(wsServer.getClientSubscriptions(clientId)).not.toContain(`valuation_updates:${itemId}`);
    });

    it('should reject invalid subscription requests', async () => {
      client.send(JSON.stringify({
        type: 'subscribe',
        subscription: 'invalid_subscription_type',
        clientId: 'test-client-1',
      }));

      const response = await waitForWebSocketEvent(client, 'message');
      const message = JSON.parse(response.toString());

      expect(message.type).toBe('error');
      expect(message.error).toContain('Invalid subscription type');
    });
  });

  describe('Real-time Updates', () => {
    let client1: WebSocket;
    let client2: WebSocket;

    beforeEach(async () => {
      client1 = new WebSocket(`ws://localhost:${serverAddress.port}`);
      client2 = new WebSocket(`ws://localhost:${serverAddress.port}`);
      testClients.push(client1, client2);
      
      await Promise.all([
        waitForWebSocketEvent(client1, 'open'),
        waitForWebSocketEvent(client2, 'open'),
      ]);
    });

    it('should broadcast valuation updates to subscribed clients', async () => {
      const itemId = 'test-item-123';

      // Subscribe both clients to the same item
      wsServer.testSubscribeClient('client-1', 'valuation_updates', itemId);
      wsServer.testSubscribeClient('client-2', 'valuation_updates', itemId);

      const updateMessage = createWSMessage('valuation_updated', {
        ...mockCurrentValuation,
        itemId: itemId,
        estimatedValue: 1350.00,
      }, itemId);

      // Broadcast the update
      wsServer.testBroadcast(updateMessage);

      // Both clients should receive the update
      const [response1, response2] = await Promise.all([
        waitForWebSocketEvent(client1, 'message'),
        waitForWebSocketEvent(client2, 'message'),
      ]);

      const message1 = JSON.parse(response1.toString());
      const message2 = JSON.parse(response2.toString());

      expect(message1.type).toBe('valuation_updated');
      expect(message1.data.estimatedValue).toBe(1350.00);
      expect(message1.itemId).toBe(itemId);

      expect(message2).toEqual(message1);
    });

    it('should only send updates to subscribed clients', async () => {
      const itemId1 = 'test-item-123';
      const itemId2 = 'test-item-456';

      // Client 1 subscribes to item 1, Client 2 subscribes to item 2
      wsServer.testSubscribeClient('client-1', 'valuation_updates', itemId1);
      wsServer.testSubscribeClient('client-2', 'valuation_updates', itemId2);

      const updateMessage = createWSMessage('valuation_updated', {
        ...mockCurrentValuation,
        itemId: itemId1,
      }, itemId1);

      // Broadcast update for item 1
      wsServer.testBroadcast(updateMessage);

      // Only client 1 should receive the update
      const response1 = await waitForWebSocketEvent(client1, 'message');
      const message1 = JSON.parse(response1.toString());

      expect(message1.type).toBe('valuation_updated');
      expect(message1.itemId).toBe(itemId1);

      // Client 2 should not receive anything (set a short timeout)
      let client2ReceivedMessage = false;
      const timeout = new Promise(resolve => setTimeout(resolve, 100));
      const messagePromise = waitForWebSocketEvent(client2, 'message').then(() => {
        client2ReceivedMessage = true;
      }).catch(() => {}); // Ignore timeout errors

      await Promise.race([timeout, messagePromise]);
      expect(client2ReceivedMessage).toBe(false);
    });

    it('should broadcast market comparison updates', async () => {
      const itemId = 'test-item-123';
      
      wsServer.testSubscribeClient('client-1', 'market_comparisons', itemId);

      const comparisonUpdate = createWSMessage('market_comparison_added', {
        ...mockMarketComparison,
        itemId: itemId,
      }, itemId);

      wsServer.testBroadcast(comparisonUpdate);

      const response = await waitForWebSocketEvent(client1, 'message');
      const message = JSON.parse(response.toString());

      expect(message.type).toBe('market_comparison_added');
      expect(message.data.itemId).toBe(itemId);
    });

    it('should broadcast pricing insights updates', async () => {
      wsServer.testSubscribeClient('client-1', 'pricing_insights');
      wsServer.testSubscribeClient('client-2', 'pricing_insights');

      const insightsUpdate = createWSMessage('pricing_insights_updated', {
        totalItems: 150,
        totalCurrentValue: 45000,
        overallAppreciation: -5000,
      });

      wsServer.testBroadcast(insightsUpdate);

      const [response1, response2] = await Promise.all([
        waitForWebSocketEvent(client1, 'message'),
        waitForWebSocketEvent(client2, 'message'),
      ]);

      const message1 = JSON.parse(response1.toString());
      expect(message1.type).toBe('pricing_insights_updated');
      expect(message1.data.totalItems).toBe(150);
    });

    it('should handle room-specific updates', async () => {
      const roomId = 'test-room-789';

      wsServer.testSubscribeClient('client-1', 'room_valuations', roomId);

      const roomUpdate = createWSMessage('room_valuation_updated', {
        roomId: roomId,
        totalEstimatedValue: 12000,
        itemsWithValuations: 8,
      }, undefined, roomId);

      wsServer.testBroadcast(roomUpdate);

      const response = await waitForWebSocketEvent(client1, 'message');
      const message = JSON.parse(response.toString());

      expect(message.type).toBe('room_valuation_updated');
      expect(message.roomId).toBe(roomId);
      expect(message.data.totalEstimatedValue).toBe(12000);
    });
  });

  describe('Error Handling', () => {
    let client: WebSocket;

    beforeEach(async () => {
      client = new WebSocket(`ws://localhost:${serverAddress.port}`);
      testClients.push(client);
      await waitForWebSocketEvent(client, 'open');
    });

    it('should handle malformed messages gracefully', async () => {
      client.send('invalid json');

      const response = await waitForWebSocketEvent(client, 'message');
      const message = JSON.parse(response.toString());

      expect(message.type).toBe('error');
      expect(message.error).toContain('Invalid message format');
    });

    it('should handle missing required fields', async () => {
      client.send(JSON.stringify({
        type: 'subscribe',
        // Missing subscription field
        itemId: 'test-item-123',
      }));

      const response = await waitForWebSocketEvent(client, 'message');
      const message = JSON.parse(response.toString());

      expect(message.type).toBe('error');
      expect(message.error).toContain('Missing required field');
    });

    it('should handle server-side broadcast errors', async () => {
      const clientId = 'test-client-1';
      wsServer.testSubscribeClient(clientId, 'valuation_updates', 'test-item-123');

      // Create a message that might cause serialization issues
      const problematicMessage = createWSMessage('valuation_updated', {
        circularRef: {} as any,
      });
      problematicMessage.data.circularRef = problematicMessage.data;

      // Should not crash the server
      expect(() => {
        wsServer.testBroadcast(problematicMessage);
      }).not.toThrow();
    });

    it('should handle client timeout scenarios', async () => {
      const clientId = 'test-client-1';
      wsServer.testSubscribeClient(clientId, 'valuation_updates', 'test-item-123');

      // Simulate client becoming unresponsive
      client.pause();

      const updateMessage = createWSMessage('valuation_updated', {
        ...mockCurrentValuation,
        estimatedValue: 1400.00,
      });

      // Should handle sending to unresponsive client without crashing
      expect(() => {
        wsServer.testBroadcast(updateMessage);
      }).not.toThrow();

      client.resume();
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle high-frequency updates efficiently', async () => {
      const client = new WebSocket(`ws://localhost:${serverAddress.port}`);
      testClients.push(client);
      await waitForWebSocketEvent(client, 'open');

      const itemId = 'test-item-123';
      wsServer.testSubscribeClient('client-1', 'valuation_updates', itemId);

      const startTime = Date.now();
      const numUpdates = 100;

      // Send many rapid updates
      for (let i = 0; i < numUpdates; i++) {
        const updateMessage = createWSMessage('valuation_updated', {
          ...mockCurrentValuation,
          estimatedValue: 1000 + i,
        }, itemId);
        
        wsServer.testBroadcast(updateMessage);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should handle updates efficiently (less than 1 second for 100 updates)
      expect(duration).toBeLessThan(1000);
    });

    it('should handle many concurrent subscriptions', async () => {
      const numClients = 50;
      const clients: WebSocket[] = [];

      // Create multiple clients
      for (let i = 0; i < numClients; i++) {
        const client = new WebSocket(`ws://localhost:${serverAddress.port}`);
        clients.push(client);
        testClients.push(client);
      }

      // Wait for all connections
      await Promise.all(clients.map(client => waitForWebSocketEvent(client, 'open')));

      // Subscribe all clients to different items
      for (let i = 0; i < numClients; i++) {
        wsServer.testSubscribeClient(`client-${i}`, 'valuation_updates', `item-${i}`);
      }

      // Broadcast updates and verify performance
      const startTime = Date.now();
      
      const broadcastPromises = [];
      for (let i = 0; i < numClients; i++) {
        const updateMessage = createWSMessage('valuation_updated', {
          ...mockCurrentValuation,
          estimatedValue: 1000 + i,
        }, `item-${i}`);
        
        broadcastPromises.push(
          Promise.resolve(wsServer.testBroadcast(updateMessage))
        );
      }

      await Promise.all(broadcastPromises);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      
      // Should handle broadcasts to many clients efficiently
      expect(duration).toBeLessThan(2000); // 2 seconds for 50 clients
    });

    it('should clean up resources when clients disconnect', async () => {
      const clients: WebSocket[] = [];
      const numClients = 10;

      // Create and connect multiple clients
      for (let i = 0; i < numClients; i++) {
        const client = new WebSocket(`ws://localhost:${serverAddress.port}`);
        clients.push(client);
        testClients.push(client);
      }

      await Promise.all(clients.map(client => waitForWebSocketEvent(client, 'open')));

      // Subscribe all clients
      for (let i = 0; i < numClients; i++) {
        wsServer.testSubscribeClient(`client-${i}`, 'valuation_updates', `item-${i}`);
      }

      const initialSubscriptionCount = Array.from(wsServer.subscriptions.values())
        .reduce((total, clientSet) => total + clientSet.size, 0);

      expect(initialSubscriptionCount).toBe(numClients);

      // Disconnect half the clients
      const clientsToDisconnect = clients.slice(0, numClients / 2);
      await Promise.all(
        clientsToDisconnect.map(client => {
          client.close();
          return waitForWebSocketEvent(client, 'close');
        })
      );

      // Wait for cleanup to occur
      await new Promise(resolve => setTimeout(resolve, 100));

      const finalSubscriptionCount = Array.from(wsServer.subscriptions.values())
        .reduce((total, clientSet) => total + clientSet.size, 0);

      expect(finalSubscriptionCount).toBe(numClients / 2);
    });
  });

  describe('Message Filtering and Routing', () => {
    it('should filter messages based on client permissions', async () => {
      const client = new WebSocket(`ws://localhost:${serverAddress.port}`);
      testClients.push(client);
      await waitForWebSocketEvent(client, 'open');

      const itemId = 'private-item-123';
      wsServer.testSubscribeClient('client-1', 'valuation_updates', itemId);

      // Create update with permission filter
      const updateMessage = createWSMessage('valuation_updated', {
        ...mockCurrentValuation,
        itemId: itemId,
      }, itemId);

      // Broadcast with filter (simulate permission check)
      const filter = (clientId: string) => clientId !== 'client-1'; // Exclude client-1
      wsServer.testBroadcast(updateMessage, filter);

      // Client should not receive the update due to filter
      let clientReceivedMessage = false;
      const timeout = new Promise(resolve => setTimeout(resolve, 100));
      const messagePromise = waitForWebSocketEvent(client, 'message').then(() => {
        clientReceivedMessage = true;
      }).catch(() => {});

      await Promise.race([timeout, messagePromise]);
      expect(clientReceivedMessage).toBe(false);
    });

    it('should route messages to specific client groups', async () => {
      const client1 = new WebSocket(`ws://localhost:${serverAddress.port}`);
      const client2 = new WebSocket(`ws://localhost:${serverAddress.port}`);
      testClients.push(client1, client2);

      await Promise.all([
        waitForWebSocketEvent(client1, 'open'),
        waitForWebSocketEvent(client2, 'open'),
      ]);

      // Subscribe to different types
      wsServer.testSubscribeClient('client-1', 'valuation_updates', 'item-123');
      wsServer.testSubscribeClient('client-2', 'pricing_insights');

      // Send item-specific update
      const itemUpdate = createWSMessage('valuation_updated', {
        ...mockCurrentValuation,
        itemId: 'item-123',
      }, 'item-123');

      wsServer.testBroadcast(itemUpdate);

      // Only client 1 should receive item update
      const response1 = await waitForWebSocketEvent(client1, 'message');
      const message1 = JSON.parse(response1.toString());

      expect(message1.type).toBe('valuation_updated');
      expect(message1.itemId).toBe('item-123');

      // Send global insights update
      const insightsUpdate = createWSMessage('pricing_insights_updated', {
        totalItems: 200,
      });

      wsServer.testBroadcast(insightsUpdate);

      // Only client 2 should receive insights update
      const response2 = await waitForWebSocketEvent(client2, 'message');
      const message2 = JSON.parse(response2.toString());

      expect(message2.type).toBe('pricing_insights_updated');
      expect(message2.data.totalItems).toBe(200);
    });
  });
});
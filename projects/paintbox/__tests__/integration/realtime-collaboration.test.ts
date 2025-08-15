import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { RealtimeCollaborationService } from '@/lib/services/realtime-collaboration';
import { apolloClient } from '@/lib/graphql/apollo-client';

// Mock dependencies
jest.mock('@/lib/graphql/apollo-client');
const mockApolloClient = apolloClient as jest.Mocked<typeof apolloClient>;

describe('Real-time Collaboration Integration', () => {
  let realtimeService: RealtimeCollaborationService;
  let httpServer: any;
  let wsServer: WebSocketServer;

  beforeAll(async () => {
    // Set up WebSocket server for testing
    httpServer = createServer();
    wsServer = new WebSocketServer({ server: httpServer });

    await new Promise<void>((resolve) => {
      httpServer.listen(0, resolve);
    });

    const port = httpServer.address()?.port;
    
    realtimeService = new RealtimeCollaborationService({
      websocketUrl: `ws://localhost:${port}`,
      apolloClient: mockApolloClient,
    });
  });

  afterAll(() => {
    wsServer.close();
    httpServer.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Connection Management', () => {
    it('should establish WebSocket connection', async () => {
      const connectionPromise = new Promise((resolve) => {
        wsServer.on('connection', resolve);
      });

      await realtimeService.connect();
      await connectionPromise;

      expect(realtimeService.isConnected()).toBe(true);
    });

    it('should handle connection failures with retry', async () => {
      // Mock connection failure
      const failingService = new RealtimeCollaborationService({
        websocketUrl: 'ws://localhost:99999', // Invalid port
        retryAttempts: 3,
        retryDelay: 100,
      });

      const startTime = Date.now();
      await expect(failingService.connect()).rejects.toThrow();
      const duration = Date.now() - startTime;

      // Should have attempted retries with delays
      expect(duration).toBeGreaterThan(200); // At least 2 retry delays
    });

    it('should automatically reconnect on connection loss', async () => {
      let connectionCount = 0;
      wsServer.on('connection', (ws) => {
        connectionCount++;
        if (connectionCount === 1) {
          // Close first connection to simulate loss
          setTimeout(() => ws.close(), 100);
        }
      });

      await realtimeService.connect();
      
      // Wait for reconnection
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(connectionCount).toBe(2); // Initial + reconnection
      expect(realtimeService.isConnected()).toBe(true);
    });

    it('should authenticate connection with user token', async () => {
      let receivedAuth = null;
      wsServer.on('connection', (ws) => {
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'auth') {
            receivedAuth = message;
          }
        });
      });

      await realtimeService.connect('user-token-123');

      expect(receivedAuth).toEqual({
        type: 'auth',
        token: 'user-token-123',
      });
    });
  });

  describe('Estimate Collaboration', () => {
    const mockEstimate = {
      id: 'estimate123',
      customerId: 'customer123',
      collaborators: [
        { userId: 'user1', role: 'estimator', name: 'John Doe' },
        { userId: 'user2', role: 'manager', name: 'Jane Smith' },
      ],
    };

    it('should join estimate collaboration session', async () => {
      let joinMessage = null;
      wsServer.on('connection', (ws) => {
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'join_estimate') {
            joinMessage = message;
            // Simulate server confirmation
            ws.send(JSON.stringify({
              type: 'joined_estimate',
              estimateId: message.estimateId,
              collaborators: mockEstimate.collaborators,
            }));
          }
        });
      });

      await realtimeService.connect();
      await realtimeService.joinEstimate('estimate123');

      expect(joinMessage).toEqual({
        type: 'join_estimate',
        estimateId: 'estimate123',
      });
    });

    it('should broadcast measurement updates to collaborators', async () => {
      const measurementUpdate = {
        roomId: 'kitchen',
        measurements: {
          walls: [
            { id: 'wall1', length: 12, height: 9 },
            { id: 'wall2', length: 10, height: 9 },
          ],
          totalArea: 198,
        },
        userId: 'user1',
        timestamp: '2025-01-15T12:00:00Z',
      };

      let broadcastMessage = null;
      wsServer.on('connection', (ws) => {
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'measurement_update') {
            broadcastMessage = message;
            // Broadcast to all connected clients
            wsServer.clients.forEach(client => {
              if (client !== ws) {
                client.send(JSON.stringify({
                  type: 'measurement_updated',
                  estimateId: message.estimateId,
                  data: message.data,
                }));
              }
            });
          }
        });
      });

      await realtimeService.connect();
      await realtimeService.joinEstimate('estimate123');
      
      await realtimeService.broadcastMeasurementUpdate('estimate123', measurementUpdate);

      expect(broadcastMessage.data).toEqual(measurementUpdate);
    });

    it('should handle pricing tier changes in real-time', async () => {
      const tierChange = {
        from: 'BETTER',
        to: 'BEST',
        newTotal: 3500.00,
        userId: 'user2',
        timestamp: '2025-01-15T12:05:00Z',
      };

      const receivedUpdates: any[] = [];
      wsServer.on('connection', (ws) => {
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'pricing_update') {
            receivedUpdates.push(message);
            // Notify all collaborators
            wsServer.clients.forEach(client => {
              client.send(JSON.stringify({
                type: 'pricing_updated',
                estimateId: message.estimateId,
                data: message.data,
              }));
            });
          }
        });
      });

      await realtimeService.connect();
      await realtimeService.broadcastPricingUpdate('estimate123', tierChange);

      expect(receivedUpdates[0].data).toEqual(tierChange);
    });

    it('should show live user cursors and selections', async () => {
      const cursorUpdate = {
        userId: 'user1',
        position: { x: 150, y: 200 },
        selectedElement: 'wall-measurement-1',
        timestamp: '2025-01-15T12:10:00Z',
      };

      let cursorMessage = null;
      wsServer.on('connection', (ws) => {
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'cursor_update') {
            cursorMessage = message;
            // Broadcast cursor position to others
            wsServer.clients.forEach(client => {
              if (client !== ws) {
                client.send(JSON.stringify({
                  type: 'cursor_moved',
                  estimateId: message.estimateId,
                  data: message.data,
                }));
              }
            });
          }
        });
      });

      await realtimeService.connect();
      await realtimeService.updateCursor('estimate123', cursorUpdate);

      expect(cursorMessage.data.position).toEqual({ x: 150, y: 200 });
      expect(cursorMessage.data.selectedElement).toBe('wall-measurement-1');
    });

    it('should handle collaborative editing conflicts', async () => {
      const conflictingUpdates = [
        {
          userId: 'user1',
          roomId: 'kitchen',
          field: 'totalArea',
          value: 200,
          timestamp: '2025-01-15T12:00:00Z',
        },
        {
          userId: 'user2',
          roomId: 'kitchen',
          field: 'totalArea',
          value: 195,
          timestamp: '2025-01-15T12:00:01Z', // 1 second later
        },
      ];

      const conflictResolutions: any[] = [];
      wsServer.on('connection', (ws) => {
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'conflict_resolution') {
            conflictResolutions.push(message);
          }
        });
      });

      await realtimeService.connect();
      
      for (const update of conflictingUpdates) {
        await realtimeService.broadcastMeasurementUpdate('estimate123', update);
      }

      // Should resolve conflict using last-write-wins or operational transformation
      expect(conflictResolutions).toHaveLength(1);
      expect(conflictResolutions[0].data.winningValue).toBe(195); // Later timestamp wins
    });
  });

  describe('Manager Approval Workflow', () => {
    it('should notify manager when estimate ready for review', async () => {
      mockApolloClient.query.mockResolvedValue({
        data: {
          users: [
            { id: 'manager1', role: 'manager', email: 'manager@paintbox.com' },
          ],
        },
      });

      let approvalRequest = null;
      wsServer.on('connection', (ws) => {
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'approval_request') {
            approvalRequest = message;
            // Simulate manager notification
            ws.send(JSON.stringify({
              type: 'approval_requested',
              estimateId: message.estimateId,
              requestedBy: message.userId,
            }));
          }
        });
      });

      await realtimeService.connect();
      await realtimeService.requestApproval('estimate123', {
        requestedBy: 'user1',
        reason: 'Estimate complete, ready for manager review',
        totalAmount: 2500.00,
      });

      expect(approvalRequest.estimateId).toBe('estimate123');
      expect(approvalRequest.data.totalAmount).toBe(2500.00);
    });

    it('should broadcast approval decisions to all collaborators', async () => {
      const approvalDecision = {
        approved: true,
        managerId: 'manager1',
        comments: 'Approved with minor pricing adjustments',
        timestamp: '2025-01-15T14:00:00Z',
      };

      let decisionMessage = null;
      wsServer.on('connection', (ws) => {
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'approval_decision') {
            decisionMessage = message;
            // Broadcast to all estimate collaborators
            wsServer.clients.forEach(client => {
              client.send(JSON.stringify({
                type: 'estimate_approved',
                estimateId: message.estimateId,
                data: message.data,
              }));
            });
          }
        });
      });

      await realtimeService.connect();
      await realtimeService.broadcastApprovalDecision('estimate123', approvalDecision);

      expect(decisionMessage.data.approved).toBe(true);
      expect(decisionMessage.data.comments).toBe('Approved with minor pricing adjustments');
    });

    it('should handle approval workflow with required changes', async () => {
      const changeRequest = {
        approved: false,
        managerId: 'manager1',
        requiredChanges: [
          { field: 'selectedTier', currentValue: 'BEST', suggestedValue: 'BETTER' },
          { field: 'laborHours', currentValue: 20, suggestedValue: 18 },
        ],
        comments: 'Please adjust pricing and labor estimates',
        dueDate: '2025-01-16T17:00:00Z',
      };

      let changeRequestMessage = null;
      wsServer.on('connection', (ws) => {
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'changes_requested') {
            changeRequestMessage = message;
          }
        });
      });

      await realtimeService.connect();
      await realtimeService.broadcastApprovalDecision('estimate123', changeRequest);

      expect(changeRequestMessage.data.requiredChanges).toHaveLength(2);
      expect(changeRequestMessage.data.dueDate).toBe('2025-01-16T17:00:00Z');
    });
  });

  describe('Cross-Platform Synchronization', () => {
    it('should sync between web and mobile clients', async () => {
      const webUpdate = {
        platform: 'web',
        userId: 'user1',
        roomId: 'kitchen',
        measurements: { totalArea: 220 },
      };

      const mobileUpdate = {
        platform: 'mobile',
        userId: 'user2',
        photos: [{ wwTag: 'WW15-001', url: 'photo1.jpg' }],
      };

      const receivedUpdates: any[] = [];
      wsServer.on('connection', (ws) => {
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          receivedUpdates.push(message);
          
          // Cross-platform broadcast
          wsServer.clients.forEach(client => {
            if (client !== ws) {
              client.send(JSON.stringify({
                type: 'cross_platform_update',
                sourceType: message.type,
                data: message.data,
              }));
            }
          });
        });
      });

      await realtimeService.connect();
      await realtimeService.broadcastUpdate('estimate123', 'measurement_update', webUpdate);
      await realtimeService.broadcastUpdate('estimate123', 'photo_update', mobileUpdate);

      expect(receivedUpdates).toHaveLength(2);
      expect(receivedUpdates[0].data.platform).toBe('web');
      expect(receivedUpdates[1].data.platform).toBe('mobile');
    });

    it('should handle offline-to-online sync notifications', async () => {
      const offlineSync = {
        userId: 'user1',
        estimateId: 'estimate123',
        changes: [
          { type: 'measurement_added', roomId: 'bathroom', area: 85 },
          { type: 'photo_uploaded', wwTag: 'WW15-005', count: 1 },
        ],
        syncedAt: '2025-01-15T15:00:00Z',
      };

      let syncNotification = null;
      wsServer.on('connection', (ws) => {
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'offline_sync') {
            syncNotification = message;
            // Notify other collaborators of offline changes
            wsServer.clients.forEach(client => {
              if (client !== ws) {
                client.send(JSON.stringify({
                  type: 'offline_changes_synced',
                  estimateId: message.estimateId,
                  data: message.data,
                }));
              }
            });
          }
        });
      });

      await realtimeService.connect();
      await realtimeService.notifyOfflineSync('estimate123', offlineSync);

      expect(syncNotification.data.changes).toHaveLength(2);
      expect(syncNotification.data.syncedAt).toBe('2025-01-15T15:00:00Z');
    });

    it('should maintain data consistency across platforms', async () => {
      const stateSnapshot = {
        estimateId: 'estimate123',
        version: 5,
        measurements: {
          kitchen: { totalArea: 200, version: 3 },
          bathroom: { totalArea: 85, version: 2 },
        },
        pricing: {
          selectedTier: 'BETTER',
          total: 2400.00,
          version: 4,
        },
        lastUpdated: '2025-01-15T15:30:00Z',
      };

      let consistencyCheck = null;
      wsServer.on('connection', (ws) => {
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'consistency_check') {
            consistencyCheck = message;
            // Respond with current state
            ws.send(JSON.stringify({
              type: 'state_snapshot',
              estimateId: message.estimateId,
              data: stateSnapshot,
            }));
          }
        });
      });

      await realtimeService.connect();
      const currentState = await realtimeService.requestStateSnapshot('estimate123');

      expect(currentState.version).toBe(5);
      expect(currentState.measurements.kitchen.totalArea).toBe(200);
      expect(currentState.pricing.total).toBe(2400.00);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple concurrent estimate sessions', async () => {
      const estimateIds = ['estimate1', 'estimate2', 'estimate3'];
      const connectionCounts: Record<string, number> = {};

      wsServer.on('connection', (ws) => {
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'join_estimate') {
            const estimateId = message.estimateId;
            connectionCounts[estimateId] = (connectionCounts[estimateId] || 0) + 1;
          }
        });
      });

      await realtimeService.connect();
      
      // Join multiple estimates
      for (const estimateId of estimateIds) {
        await realtimeService.joinEstimate(estimateId);
      }

      expect(Object.keys(connectionCounts)).toHaveLength(3);
    });

    it('should throttle high-frequency updates', async () => {
      const rapidUpdates = Array.from({ length: 50 }, (_, i) => ({
        type: 'cursor_update',
        position: { x: i * 10, y: i * 5 },
        timestamp: Date.now() + i,
      }));

      const processedUpdates: any[] = [];
      wsServer.on('connection', (ws) => {
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'cursor_update') {
            processedUpdates.push(message);
          }
        });
      });

      await realtimeService.connect();

      const startTime = Date.now();
      for (const update of rapidUpdates) {
        await realtimeService.updateCursor('estimate123', update);
      }
      const endTime = Date.now();

      // Should throttle to prevent overwhelming the server
      expect(processedUpdates.length).toBeLessThan(rapidUpdates.length);
      expect(endTime - startTime).toBeGreaterThan(100); // Some throttling delay
    });

    it('should clean up inactive sessions', async () => {
      let sessionCleanup = null;
      wsServer.on('connection', (ws) => {
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'heartbeat') {
            // Simulate session cleanup
            ws.send(JSON.stringify({
              type: 'session_cleanup',
              inactiveSessions: ['estimate123', 'estimate456'],
            }));
          }
        });
      });

      await realtimeService.connect();
      
      // Start heartbeat
      realtimeService.startHeartbeat();
      
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(realtimeService.activeSessions.size).toBeLessThanOrEqual(10); // Should cleanup inactive
    });

    it('should compress large message payloads', async () => {
      const largeUpdate = {
        measurements: {
          rooms: Array.from({ length: 100 }, (_, i) => ({
            id: `room${i}`,
            name: `Room ${i}`,
            measurements: Array.from({ length: 20 }, (_, j) => ({
              wallId: `wall${j}`,
              length: 10 + j,
              height: 8 + (j % 3),
            })),
          })),
        },
      };

      let messageSize = 0;
      wsServer.on('connection', (ws) => {
        ws.on('message', (data) => {
          messageSize = data.toString().length;
        });
      });

      await realtimeService.connect();
      await realtimeService.broadcastUpdate('estimate123', 'bulk_measurement_update', largeUpdate);

      // Should compress large payloads
      const uncompressedSize = JSON.stringify(largeUpdate).length;
      expect(messageSize).toBeLessThan(uncompressedSize * 0.8); // At least 20% compression
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle WebSocket disconnections gracefully', async () => {
      let reconnectionAttempts = 0;
      const originalConnect = realtimeService.connect.bind(realtimeService);
      realtimeService.connect = jest.fn().mockImplementation(() => {
        reconnectionAttempts++;
        if (reconnectionAttempts <= 2) {
          throw new Error('Connection failed');
        }
        return originalConnect();
      });

      await expect(realtimeService.connect()).rejects.toThrow();
      expect(reconnectionAttempts).toBe(1);

      // Should eventually reconnect
      await realtimeService.connect();
      expect(reconnectionAttempts).toBe(3);
    });

    it('should queue messages when disconnected', async () => {
      // Disconnect after connecting
      await realtimeService.connect();
      realtimeService.disconnect();

      const queuedUpdate = {
        type: 'measurement_update',
        data: { roomId: 'kitchen', area: 200 },
      };

      await realtimeService.broadcastUpdate('estimate123', 'measurement_update', queuedUpdate.data);

      expect(realtimeService.messageQueue).toContainEqual(
        expect.objectContaining({
          estimateId: 'estimate123',
          type: 'measurement_update',
        })
      );

      // Should send queued messages when reconnected
      await realtimeService.connect();
      expect(realtimeService.messageQueue).toHaveLength(0); // Queue cleared
    });

    it('should handle malformed messages', async () => {
      const errorHandler = jest.fn();
      realtimeService.onError(errorHandler);

      wsServer.on('connection', (ws) => {
        // Send malformed message
        ws.send('invalid json {');
      });

      await realtimeService.connect();
      
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'parse_error',
          message: expect.stringContaining('JSON'),
        })
      );
    });

    it('should validate message schemas', async () => {
      const invalidUpdate = {
        // Missing required fields
        type: 'measurement_update',
        data: {},
      };

      const validationErrors: any[] = [];
      realtimeService.onValidationError((error) => {
        validationErrors.push(error);
      });

      await realtimeService.connect();
      await realtimeService.broadcastUpdate('estimate123', 'measurement_update', invalidUpdate);

      expect(validationErrors).toHaveLength(1);
      expect(validationErrors[0]).toEqual(
        expect.objectContaining({
          type: 'validation_error',
          field: expect.any(String),
        })
      );
    });
  });
});
const request = require('supertest');
const { Server } = require('socket.io');
const { createServer } = require('http');
const Client = require('socket.io-client');
const CollaborationService = require('../../../services/collaboration/collaboration-service');
const { setupTestDatabase, cleanupTestDatabase } = require('../../fixtures/database');

describe('Collaboration Service (Node.js/Socket.IO)', () => {
  let httpServer;
  let io;
  let clientSocket;
  let serverSocket;
  let collaborationService;

  beforeAll(async () => {
    await setupTestDatabase();
    httpServer = createServer();
    io = new Server(httpServer, {
      cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });
    collaborationService = new CollaborationService(io);
    
    httpServer.listen(() => {
      const port = httpServer.address().port;
      clientSocket = new Client(`http://localhost:${port}`, {
        transports: ['websocket']
      });
      
      io.on('connection', (socket) => {
        serverSocket = socket;
      });
    });

    return new Promise((resolve) => {
      clientSocket.on('connect', resolve);
    });
  });

  afterAll(async () => {
    await cleanupTestDatabase();
    io.close();
    httpServer.close();
    clientSocket.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Document Collaboration', () => {
    test('should handle user joining document session', (done) => {
      const documentId = 'test-doc-123';
      const userId = 'user-456';
      
      serverSocket.on('join-document', (data) => {
        expect(data.documentId).toBe(documentId);
        expect(data.userId).toBe(userId);
        done();
      });

      clientSocket.emit('join-document', { documentId, userId });
    });

    test('should broadcast operational transforms to all users', (done) => {
      const operation = {
        type: 'insert',
        position: 10,
        content: 'Hello World',
        userId: 'user-123',
        documentId: 'doc-456'
      };

      let receivedCount = 0;
      const expectedReceivers = 2;

      const client2 = new Client(`http://localhost:${httpServer.address().port}`);
      
      [clientSocket, client2].forEach(client => {
        client.on('operation-applied', (receivedOp) => {
          expect(receivedOp).toMatchObject(operation);
          receivedCount++;
          if (receivedCount === expectedReceivers) {
            client2.close();
            done();
          }
        });
      });

      serverSocket.broadcast.emit('operation-applied', operation);
    });

    test('should handle cursor position updates', (done) => {
      const cursorUpdate = {
        userId: 'user-789',
        documentId: 'doc-456',
        position: { line: 5, column: 12 },
        selection: { start: 10, end: 25 }
      };

      serverSocket.on('cursor-update', (data) => {
        expect(data).toMatchObject(cursorUpdate);
        done();
      });

      clientSocket.emit('cursor-update', cursorUpdate);
    });

    test('should maintain presence awareness', async () => {
      const presenceData = {
        userId: 'user-123',
        name: 'John Doe',
        avatar: 'https://example.com/avatar.jpg',
        status: 'active'
      };

      const presence = collaborationService.updatePresence('doc-456', presenceData);
      
      expect(presence).toHaveProperty('userId', 'user-123');
      expect(presence).toHaveProperty('lastSeen');
      expect(presence.status).toBe('active');
    });
  });

  describe('Operational Transform', () => {
    test('should transform conflicting insert operations', () => {
      const op1 = { type: 'insert', position: 5, content: 'Hello' };
      const op2 = { type: 'insert', position: 5, content: 'World' };
      
      const transformed = collaborationService.transformOperations(op1, op2);
      
      expect(transformed.op1).toHaveProperty('position', 5);
      expect(transformed.op2).toHaveProperty('position', 10); // Adjusted for op1 insertion
    });

    test('should transform delete operations', () => {
      const op1 = { type: 'delete', position: 5, length: 3 };
      const op2 = { type: 'insert', position: 7, content: 'New' };
      
      const transformed = collaborationService.transformOperations(op1, op2);
      
      expect(transformed.op2).toHaveProperty('position', 5); // Adjusted for deletion
    });

    test('should handle complex operation sequences', () => {
      const operations = [
        { type: 'insert', position: 0, content: 'A' },
        { type: 'insert', position: 1, content: 'B' },
        { type: 'delete', position: 0, length: 1 }
      ];

      const result = collaborationService.applyOperations('doc-123', operations);
      expect(result.finalContent).toBe('B');
    });
  });

  describe('Document State Management', () => {
    test('should sync document state on reconnection', async () => {
      const documentId = 'doc-recovery-test';
      const lastKnownVersion = 5;
      
      const syncData = await collaborationService.syncDocumentState(
        documentId, 
        lastKnownVersion
      );
      
      expect(syncData).toHaveProperty('operations');
      expect(syncData).toHaveProperty('currentVersion');
      expect(syncData.currentVersion).toBeGreaterThan(lastKnownVersion);
    });

    test('should handle conflict resolution', async () => {
      const conflictingOps = [
        { id: '1', type: 'insert', position: 5, content: 'Hello', timestamp: Date.now() },
        { id: '2', type: 'insert', position: 5, content: 'World', timestamp: Date.now() + 1 }
      ];

      const resolved = await collaborationService.resolveConflicts('doc-456', conflictingOps);
      
      expect(resolved).toHaveLength(2);
      expect(resolved[1].position).toBe(10); // Second operation adjusted
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed operations gracefully', () => {
      const malformedOp = { type: 'invalid', data: null };
      
      expect(() => {
        collaborationService.validateOperation(malformedOp);
      }).toThrow('Invalid operation type');
    });

    test('should handle network disconnections', (done) => {
      clientSocket.disconnect();
      
      setTimeout(() => {
        expect(collaborationService.getActiveConnections('doc-456')).toHaveLength(0);
        done();
      }, 100);
    });
  });

  describe('Performance', () => {
    test('should handle high-frequency operations', async () => {
      const operations = Array.from({ length: 1000 }, (_, i) => ({
        type: 'insert',
        position: i,
        content: `char${i}`,
        userId: 'stress-test-user'
      }));

      const startTime = Date.now();
      
      for (const op of operations) {
        collaborationService.applyOperation('stress-test-doc', op);
      }
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should maintain memory efficiency with large documents', () => {
      const largeDocs = Array.from({ length: 100 }, (_, i) => `large-doc-${i}`);
      
      largeDocs.forEach(docId => {
        collaborationService.initializeDocument(docId, 'Large content '.repeat(1000));
      });

      const memUsage = process.memoryUsage();
      expect(memUsage.heapUsed).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
    });
  });
});
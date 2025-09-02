import { OfflineSync } from '../../../apps/mobile-collaboration/src/services/offline-queue';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { DocumentSync } from '../../../apps/mobile-collaboration/src/services/DocumentSync';
import { Y } from 'yjs';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  getAllKeys: jest.fn(),
}));

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(),
  addEventListener: jest.fn(),
}));

// Mock Y.js
const mockYDoc = {
  getText: jest.fn(() => ({
    insert: jest.fn(),
    delete: jest.fn(),
    observe: jest.fn(),
    unobserve: jest.fn(),
    toString: jest.fn(() => 'Mock document content'),
    toDelta: jest.fn(() => [{ insert: 'Mock content' }]),
    applyDelta: jest.fn(),
  })),
  getMap: jest.fn(() => new Map()),
  on: jest.fn(),
  off: jest.fn(),
  destroy: jest.fn(),
  getUpdateV2: jest.fn(() => new Uint8Array()),
  applyUpdateV2: jest.fn(),
  encodeStateAsUpdateV2: jest.fn(() => new Uint8Array()),
  transact: jest.fn((fn) => fn()),
};

jest.mock('yjs', () => ({
  Doc: jest.fn(() => mockYDoc),
  Text: jest.fn(),
  applyUpdateV2: jest.fn(),
  encodeStateAsUpdateV2: jest.fn(),
}));

// Mock GraphQL client
const mockGraphQLClient = {
  query: jest.fn(),
  mutate: jest.fn(),
  subscribe: jest.fn(),
};

describe('OfflineSync Service', () => {
  let offlineSync: OfflineSync;
  let mockNetworkStateCallback: (state: any) => void;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup NetInfo mock
    (NetInfo.addEventListener as jest.Mock).mockImplementation((callback) => {
      mockNetworkStateCallback = callback;
      return jest.fn(); // unsubscribe function
    });

    (NetInfo.fetch as jest.Mock).mockResolvedValue({
      isConnected: true,
      type: 'wifi',
    });

    offlineSync = new OfflineSync(mockGraphQLClient);
  });

  afterEach(() => {
    offlineSync.destroy();
  });

  describe('Initialization', () => {
    test('should initialize with network monitoring', async () => {
      await offlineSync.initialize();

      expect(NetInfo.addEventListener).toHaveBeenCalled();
      expect(NetInfo.fetch).toHaveBeenCalled();
    });

    test('should load pending operations from storage on init', async () => {
      const mockPendingOps = [
        {
          id: 'op-1',
          documentId: 'doc-123',
          operation: { type: 'INSERT', position: 5, content: 'Hello' },
          timestamp: Date.now() - 1000,
          userId: 'user-123',
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockPendingOps));

      await offlineSync.initialize();

      expect(AsyncStorage.getItem).toHaveBeenCalledWith('offline-pending-operations');
      expect(offlineSync.getPendingOperationsCount()).toBe(1);
    });

    test('should handle corrupted storage data gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('corrupted json');

      await expect(offlineSync.initialize()).resolves.not.toThrow();
      expect(offlineSync.getPendingOperationsCount()).toBe(0);
    });
  });

  describe('Network State Management', () => {
    beforeEach(async () => {
      await offlineSync.initialize();
    });

    test('should detect online state', () => {
      mockNetworkStateCallback({ isConnected: true, type: 'wifi' });
      
      expect(offlineSync.isOnline()).toBe(true);
    });

    test('should detect offline state', () => {
      mockNetworkStateCallback({ isConnected: false, type: 'none' });
      
      expect(offlineSync.isOnline()).toBe(false);
    });

    test('should emit network state change events', async () => {
      const onlineCallback = jest.fn();
      const offlineCallback = jest.fn();

      offlineSync.on('online', onlineCallback);
      offlineSync.on('offline', offlineCallback);

      // Go offline
      mockNetworkStateCallback({ isConnected: false });
      expect(offlineCallback).toHaveBeenCalled();

      // Come back online
      mockNetworkStateCallback({ isConnected: true });
      expect(onlineCallback).toHaveBeenCalled();
    });

    test('should trigger sync when coming back online', async () => {
      const syncSpy = jest.spyOn(offlineSync as any, 'syncPendingOperations');

      // Add pending operation
      offlineSync.queueOperation('doc-123', {
        type: 'INSERT',
        position: 5,
        content: 'Queued while offline'
      }, 'user-123');

      // Come back online
      mockNetworkStateCallback({ isConnected: true });

      expect(syncSpy).toHaveBeenCalled();
    });
  });

  describe('Operation Queueing', () => {
    beforeEach(async () => {
      await offlineSync.initialize();
    });

    test('should queue operations when offline', async () => {
      // Set offline state
      mockNetworkStateCallback({ isConnected: false });

      const operation = {
        type: 'INSERT',
        position: 10,
        content: 'Offline edit'
      };

      await offlineSync.queueOperation('doc-123', operation, 'user-456');

      expect(offlineSync.getPendingOperationsCount()).toBe(1);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'offline-pending-operations',
        expect.any(String)
      );
    });

    test('should assign unique IDs to queued operations', async () => {
      mockNetworkStateCallback({ isConnected: false });

      await offlineSync.queueOperation('doc-1', { type: 'INSERT' }, 'user-1');
      await offlineSync.queueOperation('doc-1', { type: 'DELETE' }, 'user-1');

      const operations = offlineSync.getPendingOperations();
      expect(operations[0].id).not.toBe(operations[1].id);
    });

    test('should preserve operation order', async () => {
      mockNetworkStateCallback({ isConnected: false });

      await offlineSync.queueOperation('doc-1', { type: 'INSERT', content: 'A' }, 'user-1');
      await offlineSync.queueOperation('doc-1', { type: 'INSERT', content: 'B' }, 'user-1');
      await offlineSync.queueOperation('doc-1', { type: 'INSERT', content: 'C' }, 'user-1');

      const operations = offlineSync.getPendingOperations();
      expect(operations[0].operation.content).toBe('A');
      expect(operations[1].operation.content).toBe('B');
      expect(operations[2].operation.content).toBe('C');
    });

    test('should limit queue size', async () => {
      mockNetworkStateCallback({ isConnected: false });

      const maxQueueSize = 100;
      offlineSync.setMaxQueueSize(maxQueueSize);

      // Add more operations than the limit
      for (let i = 0; i < maxQueueSize + 10; i++) {
        await offlineSync.queueOperation('doc-1', { type: 'INSERT', content: `Op ${i}` }, 'user-1');
      }

      expect(offlineSync.getPendingOperationsCount()).toBe(maxQueueSize);
    });
  });

  describe('Document State Management', () => {
    beforeEach(async () => {
      await offlineSync.initialize();
    });

    test('should cache document state', async () => {
      const documentState = {
        id: 'doc-123',
        title: 'Cached Document',
        content: 'Document content',
        lastModified: new Date().toISOString(),
        version: 5,
      };

      await offlineSync.cacheDocumentState('doc-123', documentState);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'document-cache-doc-123',
        JSON.stringify(documentState)
      );
    });

    test('should retrieve cached document state', async () => {
      const cachedState = {
        id: 'doc-456',
        title: 'Retrieved Document',
        content: 'Cached content',
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(cachedState));

      const result = await offlineSync.getCachedDocumentState('doc-456');

      expect(result).toEqual(cachedState);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('document-cache-doc-456');
    });

    test('should return null for non-existent cached documents', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await offlineSync.getCachedDocumentState('non-existent');

      expect(result).toBeNull();
    });

    test('should update document cache incrementally', async () => {
      const initialState = {
        id: 'doc-123',
        content: 'Initial content',
        version: 1,
      };

      const update = {
        content: 'Updated content',
        version: 2,
      };

      await offlineSync.cacheDocumentState('doc-123', initialState);
      await offlineSync.updateCachedDocumentState('doc-123', update);

      expect(AsyncStorage.setItem).toHaveBeenLastCalledWith(
        'document-cache-doc-123',
        JSON.stringify({ ...initialState, ...update })
      );
    });
  });

  describe('Conflict Resolution', () => {
    beforeEach(async () => {
      await offlineSync.initialize();
    });

    test('should detect conflicts between local and server changes', async () => {
      const localOperations = [
        { type: 'INSERT', position: 5, content: 'Local', timestamp: Date.now() - 1000 },
      ];

      const serverOperations = [
        { type: 'INSERT', position: 5, content: 'Server', timestamp: Date.now() - 500 },
      ];

      const conflicts = offlineSync.detectConflicts(localOperations, serverOperations);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]).toMatchObject({
        type: 'POSITION_CONFLICT',
        localOperation: localOperations[0],
        serverOperation: serverOperations[0],
      });
    });

    test('should resolve conflicts using operational transformation', async () => {
      const localOp = { type: 'INSERT', position: 5, content: 'Local' };
      const serverOp = { type: 'INSERT', position: 5, content: 'Server' };

      const resolved = offlineSync.resolveConflict(localOp, serverOp);

      // Server operation should take precedence at original position
      // Local operation should be transformed to new position
      expect(resolved.serverOperation).toEqual(serverOp);
      expect(resolved.localOperation.position).toBe(5 + serverOp.content.length);
    });

    test('should handle complex conflict scenarios', async () => {
      const operations = [
        { type: 'INSERT', position: 0, content: 'A' },
        { type: 'INSERT', position: 1, content: 'B' },
        { type: 'DELETE', position: 0, length: 1 },
        { type: 'INSERT', position: 1, content: 'C' },
      ];

      const transformedOps = offlineSync.transformOperationSequence(operations);

      // Operations should be transformed to maintain document consistency
      expect(transformedOps).toHaveLength(4);
      expect(transformedOps[2].position).toBe(2); // DELETE position adjusted
      expect(transformedOps[3].position).toBe(2); // INSERT position adjusted
    });

    test('should emit conflict resolution events', async () => {
      const conflictCallback = jest.fn();
      offlineSync.on('conflict-resolved', conflictCallback);

      const localOp = { type: 'INSERT', position: 5, content: 'Local' };
      const serverOp = { type: 'INSERT', position: 5, content: 'Server' };

      offlineSync.resolveConflict(localOp, serverOp);

      expect(conflictCallback).toHaveBeenCalledWith({
        type: 'POSITION_CONFLICT',
        resolution: 'OPERATIONAL_TRANSFORM',
        localOperation: localOp,
        serverOperation: serverOp,
      });
    });
  });

  describe('Y.js CRDT Integration', () => {
    let documentSync: DocumentSync;

    beforeEach(async () => {
      await offlineSync.initialize();
      documentSync = new DocumentSync('doc-123', offlineSync);
    });

    afterEach(() => {
      documentSync.destroy();
    });

    test('should initialize Y.js document', () => {
      expect(mockYDoc).toBeDefined();
      expect(mockYDoc.getText).toHaveBeenCalled();
    });

    test('should apply local changes to Y.js document', () => {
      const yText = mockYDoc.getText();
      
      documentSync.applyLocalChange({
        type: 'INSERT',
        position: 0,
        content: 'Hello World',
      });

      expect(yText.insert).toHaveBeenCalledWith(0, 'Hello World');
    });

    test('should handle Y.js document updates', async () => {
      const yText = mockYDoc.getText();
      const observer = yText.observe.mock.calls[0][0];

      // Simulate Y.js update
      await observer([
        { type: 'insert', index: 0, values: ['New content'] },
      ]);

      expect(mockGraphQLClient.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            operation: expect.objectContaining({
              type: 'INSERT',
              position: 0,
              content: 'New content',
            }),
          }),
        })
      );
    });

    test('should sync Y.js state with server', async () => {
      const serverUpdate = new Uint8Array([1, 2, 3, 4]);
      
      await documentSync.applyServerUpdate(serverUpdate);

      expect(mockYDoc.applyUpdateV2).toHaveBeenCalledWith(serverUpdate);
    });

    test('should generate updates for synchronization', () => {
      mockYDoc.encodeStateAsUpdateV2.mockReturnValue(new Uint8Array([5, 6, 7, 8]));

      const update = documentSync.getStateUpdate();

      expect(update).toEqual(new Uint8Array([5, 6, 7, 8]));
    });

    test('should handle Y.js document merge conflicts', async () => {
      const conflictCallback = jest.fn();
      documentSync.on('merge-conflict', conflictCallback);

      // Simulate concurrent updates
      const update1 = new Uint8Array([1, 2, 3]);
      const update2 = new Uint8Array([4, 5, 6]);

      await documentSync.applyServerUpdate(update1);
      await documentSync.applyServerUpdate(update2);

      // Y.js should handle merging automatically
      expect(mockYDoc.applyUpdateV2).toHaveBeenCalledTimes(2);
    });
  });

  describe('Synchronization Process', () => {
    beforeEach(async () => {
      await offlineSync.initialize();
      mockNetworkStateCallback({ isConnected: false }); // Start offline
    });

    test('should sync pending operations when coming online', async () => {
      // Queue some operations while offline
      await offlineSync.queueOperation('doc-123', { type: 'INSERT', content: 'A' }, 'user-1');
      await offlineSync.queueOperation('doc-123', { type: 'INSERT', content: 'B' }, 'user-1');

      mockGraphQLClient.mutate.mockResolvedValue({ data: { success: true } });

      // Come back online
      mockNetworkStateCallback({ isConnected: true });

      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for async sync

      expect(mockGraphQLClient.mutate).toHaveBeenCalledTimes(2);
      expect(offlineSync.getPendingOperationsCount()).toBe(0);
    });

    test('should handle sync failures gracefully', async () => {
      await offlineSync.queueOperation('doc-123', { type: 'INSERT', content: 'Test' }, 'user-1');

      mockGraphQLClient.mutate.mockRejectedValue(new Error('Sync failed'));

      mockNetworkStateCallback({ isConnected: true });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Operation should remain in queue after failed sync
      expect(offlineSync.getPendingOperationsCount()).toBe(1);
    });

    test('should retry failed synchronizations', async () => {
      jest.useFakeTimers();

      await offlineSync.queueOperation('doc-123', { type: 'INSERT', content: 'Retry' }, 'user-1');

      // Fail first attempt
      mockGraphQLClient.mutate
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: { success: true } });

      mockNetworkStateCallback({ isConnected: true });

      // Wait for initial sync attempt
      jest.advanceTimersByTime(100);

      // Wait for retry
      jest.advanceTimersByTime(1000);

      expect(mockGraphQLClient.mutate).toHaveBeenCalledTimes(2);
      
      jest.useRealTimers();
    });

    test('should respect exponential backoff for retries', async () => {
      jest.useFakeTimers();

      await offlineSync.queueOperation('doc-123', { type: 'INSERT', content: 'Backoff' }, 'user-1');

      mockGraphQLClient.mutate.mockRejectedValue(new Error('Persistent error'));

      mockNetworkStateCallback({ isConnected: true });

      const syncAttempts = [];
      const originalMutate = mockGraphQLClient.mutate;
      mockGraphQLClient.mutate = jest.fn((...args) => {
        syncAttempts.push(Date.now());
        return originalMutate(...args);
      });

      // Trigger multiple retry attempts
      jest.advanceTimersByTime(100); // First attempt
      jest.advanceTimersByTime(1000); // First retry (1s)
      jest.advanceTimersByTime(2000); // Second retry (2s)
      jest.advanceTimersByTime(4000); // Third retry (4s)

      expect(syncAttempts).toHaveLength(4);
      
      jest.useRealTimers();
    });

    test('should batch operations for efficient sync', async () => {
      // Queue multiple operations for the same document
      for (let i = 0; i < 10; i++) {
        await offlineSync.queueOperation('doc-123', { type: 'INSERT', content: `Op${i}` }, 'user-1');
      }

      mockGraphQLClient.mutate.mockResolvedValue({ data: { success: true } });

      mockNetworkStateCallback({ isConnected: true });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should batch operations into fewer requests
      expect(mockGraphQLClient.mutate).toHaveBeenCalledTimes(1);
      expect(mockGraphQLClient.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            operations: expect.arrayContaining([
              expect.objectContaining({ content: 'Op0' }),
              expect.objectContaining({ content: 'Op9' }),
            ]),
          }),
        })
      );
    });
  });

  describe('Storage Management', () => {
    beforeEach(async () => {
      await offlineSync.initialize();
    });

    test('should persist pending operations to storage', async () => {
      await offlineSync.queueOperation('doc-123', { type: 'INSERT', content: 'Persist' }, 'user-1');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'offline-pending-operations',
        expect.stringContaining('"content":"Persist"')
      );
    });

    test('should clean up old cache entries', async () => {
      const oldCacheEntries = [
        'document-cache-old-doc-1',
        'document-cache-old-doc-2',
        'document-cache-recent-doc',
      ];

      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue(oldCacheEntries);
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'document-cache-recent-doc') {
          return Promise.resolve(JSON.stringify({
            timestamp: Date.now() - 1000 // Recent
          }));
        }
        return Promise.resolve(JSON.stringify({
          timestamp: Date.now() - 24 * 60 * 60 * 1000 // 24 hours ago
        }));
      });

      await offlineSync.cleanupOldCache(12 * 60 * 60 * 1000); // 12 hours

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('document-cache-old-doc-1');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('document-cache-old-doc-2');
      expect(AsyncStorage.removeItem).not.toHaveBeenCalledWith('document-cache-recent-doc');
    });

    test('should handle storage quota exceeded', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(
        new Error('QuotaExceededError: Storage quota exceeded')
      );

      const warningCallback = jest.fn();
      offlineSync.on('storage-warning', warningCallback);

      await offlineSync.queueOperation('doc-123', { type: 'INSERT', content: 'Large' }, 'user-1');

      expect(warningCallback).toHaveBeenCalledWith({
        type: 'QUOTA_EXCEEDED',
        message: expect.stringContaining('Storage quota exceeded'),
      });
    });
  });

  describe('Event System', () => {
    beforeEach(async () => {
      await offlineSync.initialize();
    });

    test('should emit sync progress events', async () => {
      const progressCallback = jest.fn();
      offlineSync.on('sync-progress', progressCallback);

      // Queue operations
      await offlineSync.queueOperation('doc-1', { type: 'INSERT' }, 'user-1');
      await offlineSync.queueOperation('doc-1', { type: 'DELETE' }, 'user-1');

      mockGraphQLClient.mutate.mockResolvedValue({ data: { success: true } });

      mockNetworkStateCallback({ isConnected: true });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(progressCallback).toHaveBeenCalledWith({
        completed: 2,
        total: 2,
        percentage: 100,
      });
    });

    test('should emit document sync events', async () => {
      const syncCallback = jest.fn();
      offlineSync.on('document-synced', syncCallback);

      await offlineSync.queueOperation('doc-123', { type: 'INSERT' }, 'user-1');

      mockGraphQLClient.mutate.mockResolvedValue({ data: { success: true } });

      mockNetworkStateCallback({ isConnected: true });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(syncCallback).toHaveBeenCalledWith({
        documentId: 'doc-123',
        operationsCount: 1,
        syncDuration: expect.any(Number),
      });
    });

    test('should remove event listeners correctly', () => {
      const callback = jest.fn();
      
      offlineSync.on('online', callback);
      offlineSync.off('online', callback);

      mockNetworkStateCallback({ isConnected: true });

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Performance and Memory', () => {
    beforeEach(async () => {
      await offlineSync.initialize();
    });

    test('should limit memory usage for large operations', async () => {
      const largeContent = 'x'.repeat(1024 * 1024); // 1MB string

      await offlineSync.queueOperation('doc-123', { 
        type: 'INSERT', 
        content: largeContent 
      }, 'user-1');

      // Operation should be compressed or chunked
      const operations = offlineSync.getPendingOperations();
      expect(operations[0].compressed).toBe(true);
    });

    test('should debounce rapid storage writes', async () => {
      jest.useFakeTimers();

      // Queue multiple operations rapidly
      for (let i = 0; i < 10; i++) {
        offlineSync.queueOperation('doc-123', { type: 'INSERT', content: `${i}` }, 'user-1');
      }

      // Should not write to storage for every operation
      expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(300); // Debounce delay

      expect(AsyncStorage.setItem).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });

    test('should clean up resources on destroy', async () => {
      const unsubscribeMock = jest.fn();
      (NetInfo.addEventListener as jest.Mock).mockReturnValue(unsubscribeMock);

      await offlineSync.initialize();
      offlineSync.destroy();

      expect(unsubscribeMock).toHaveBeenCalled();
      expect(mockYDoc.destroy).toHaveBeenCalled();
    });
  });
});
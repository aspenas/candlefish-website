import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { OfflineQueue } from '../offline-queue';
import { apolloClient } from '../apollo-client';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
}));

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn(),
}));

// Mock Apollo Client
jest.mock('../apollo-client', () => ({
  apolloClient: {
    mutate: jest.fn(),
    query: jest.fn(),
    writeQuery: jest.fn(),
    readQuery: jest.fn(),
  },
}));

describe('OfflineQueue', () => {
  let offlineQueue: OfflineQueue;
  let mockNetInfoListener: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNetInfoListener = jest.fn();
    (NetInfo.addEventListener as jest.Mock).mockReturnValue(mockNetInfoListener);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    offlineQueue = new OfflineQueue();
  });

  afterEach(() => {
    offlineQueue.destroy();
  });

  describe('Initialization', () => {
    it('initializes queue and sets up network listener', () => {
      expect(NetInfo.addEventListener).toHaveBeenCalledWith(expect.any(Function));
    });

    it('loads persisted queue items on initialization', async () => {
      const mockQueueData = JSON.stringify([
        {
          id: 'item-1',
          mutation: 'CREATE_INCIDENT',
          variables: { title: 'Test Incident' },
          timestamp: Date.now(),
          retryCount: 0,
        },
      ]);

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(mockQueueData);
      
      const queue = new OfflineQueue();
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for async init

      expect(AsyncStorage.getItem).toHaveBeenCalledWith('offline_queue');
      expect(queue.getQueueSize()).toBe(1);
    });
  });

  describe('Queue Operations', () => {
    it('adds items to queue when offline', async () => {
      offlineQueue.setNetworkStatus(false);

      const mutationData = {
        mutation: 'CREATE_SECURITY_EVENT',
        variables: {
          input: {
            type: 'MALWARE_DETECTED',
            severity: 'HIGH',
            description: 'Test malware detection',
          },
        },
      };

      await offlineQueue.addToQueue(mutationData);

      expect(offlineQueue.getQueueSize()).toBe(1);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_queue',
        expect.stringContaining('CREATE_SECURITY_EVENT')
      );
    });

    it('executes mutations immediately when online', async () => {
      offlineQueue.setNetworkStatus(true);
      (apolloClient.mutate as jest.Mock).mockResolvedValue({ data: { success: true } });

      const mutationData = {
        mutation: 'UPDATE_INCIDENT',
        variables: {
          id: 'inc-123',
          input: { status: 'RESOLVED' },
        },
      };

      const result = await offlineQueue.addToQueue(mutationData);

      expect(apolloClient.mutate).toHaveBeenCalledWith(mutationData);
      expect(result).toEqual({ data: { success: true } });
      expect(offlineQueue.getQueueSize()).toBe(0);
    });

    it('processes queue when network becomes available', async () => {
      // Start offline
      offlineQueue.setNetworkStatus(false);

      const mutations = [
        {
          mutation: 'CREATE_SECURITY_EVENT',
          variables: { input: { type: 'MALWARE_DETECTED' } },
        },
        {
          mutation: 'UPDATE_INCIDENT',
          variables: { id: 'inc-123', input: { status: 'INVESTIGATING' } },
        },
      ];

      // Add items to queue while offline
      for (const mutation of mutations) {
        await offlineQueue.addToQueue(mutation);
      }

      expect(offlineQueue.getQueueSize()).toBe(2);

      // Mock successful mutations
      (apolloClient.mutate as jest.Mock).mockResolvedValue({ data: { success: true } });

      // Simulate network coming online
      offlineQueue.setNetworkStatus(true);
      await offlineQueue.processQueue();

      expect(apolloClient.mutate).toHaveBeenCalledTimes(2);
      expect(offlineQueue.getQueueSize()).toBe(0);
    });

    it('handles mutation failures with retry logic', async () => {
      offlineQueue.setNetworkStatus(false);

      await offlineQueue.addToQueue({
        mutation: 'CREATE_INCIDENT',
        variables: { input: { title: 'Test' } },
      });

      // Mock failure then success
      (apolloClient.mutate as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Server error'))
        .mockResolvedValueOnce({ data: { success: true } });

      offlineQueue.setNetworkStatus(true);
      await offlineQueue.processQueue();

      expect(apolloClient.mutate).toHaveBeenCalledTimes(3);
      expect(offlineQueue.getQueueSize()).toBe(0);
    });

    it('removes items after max retry attempts', async () => {
      offlineQueue.setNetworkStatus(false);

      await offlineQueue.addToQueue({
        mutation: 'CREATE_INCIDENT',
        variables: { input: { title: 'Test' } },
      });

      // Mock persistent failures
      (apolloClient.mutate as jest.Mock).mockRejectedValue(new Error('Persistent error'));

      offlineQueue.setNetworkStatus(true);
      
      // Process queue multiple times to trigger max retry
      for (let i = 0; i < 5; i++) {
        await offlineQueue.processQueue();
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      expect(offlineQueue.getQueueSize()).toBe(0); // Item should be removed after max retries
    });
  });

  describe('Data Synchronization', () => {
    it('syncs local changes with server when online', async () => {
      const localChanges = [
        {
          type: 'incident_update',
          id: 'inc-123',
          changes: { status: 'RESOLVED', notes: 'Fixed the issue' },
          timestamp: Date.now() - 1000,
        },
        {
          type: 'security_event_created',
          data: {
            type: 'SUSPICIOUS_LOGIN',
            severity: 'MEDIUM',
            description: 'Multiple failed login attempts',
          },
          timestamp: Date.now() - 500,
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(localChanges));
      (apolloClient.mutate as jest.Mock).mockResolvedValue({ data: { success: true } });

      await offlineQueue.syncLocalChanges();

      expect(apolloClient.mutate).toHaveBeenCalledTimes(2);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('local_changes');
    });

    it('resolves conflicts between local and server data', async () => {
      const conflictData = {
        localData: {
          id: 'inc-123',
          status: 'RESOLVED',
          updated_at: '2024-01-15T14:00:00Z',
          notes: 'Local resolution notes',
        },
        serverData: {
          id: 'inc-123',
          status: 'INVESTIGATING',
          updated_at: '2024-01-15T15:00:00Z',
          notes: 'Server investigation notes',
        },
      };

      const resolution = await offlineQueue.resolveConflict(conflictData);

      // Should prefer server data (newer timestamp)
      expect(resolution.status).toBe('INVESTIGATING');
      expect(resolution.notes).toBe('Server investigation notes');
      expect(resolution.conflictResolved).toBe(true);
    });
  });

  describe('Optimistic Updates', () => {
    it('applies optimistic updates immediately', async () => {
      const optimisticUpdate = {
        query: 'GET_INCIDENTS',
        data: {
          incidents: [
            {
              id: 'inc-new',
              title: 'New Incident',
              status: 'OPEN',
              severity: 'HIGH',
              created_at: new Date().toISOString(),
            },
          ],
        },
      };

      await offlineQueue.applyOptimisticUpdate(optimisticUpdate);

      expect(apolloClient.writeQuery).toHaveBeenCalledWith(optimisticUpdate);
    });

    it('reverts optimistic updates on mutation failure', async () => {
      const originalData = {
        incidents: [
          { id: 'inc-1', title: 'Original Incident', status: 'OPEN' },
        ],
      };

      const optimisticData = {
        incidents: [
          ...originalData.incidents,
          { id: 'inc-new', title: 'New Incident', status: 'OPEN' },
        ],
      };

      (apolloClient.readQuery as jest.Mock).mockReturnValue({ data: originalData });
      (apolloClient.mutate as jest.Mock).mockRejectedValue(new Error('Mutation failed'));

      offlineQueue.setNetworkStatus(false);

      // Apply optimistic update
      await offlineQueue.addToQueue({
        mutation: 'CREATE_INCIDENT',
        variables: { input: { title: 'New Incident' } },
        optimisticResponse: optimisticData,
      });

      offlineQueue.setNetworkStatus(true);
      await offlineQueue.processQueue();

      // Should revert optimistic update
      expect(apolloClient.writeQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          data: originalData,
        })
      );
    });
  });

  describe('Storage Management', () => {
    it('persists queue to AsyncStorage', async () => {
      offlineQueue.setNetworkStatus(false);

      await offlineQueue.addToQueue({
        mutation: 'CREATE_SECURITY_EVENT',
        variables: { input: { type: 'MALWARE_DETECTED' } },
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_queue',
        expect.any(String)
      );
    });

    it('clears expired queue items', async () => {
      const expiredItems = [
        {
          id: 'expired-1',
          mutation: 'OLD_MUTATION',
          variables: {},
          timestamp: Date.now() - (24 * 60 * 60 * 1000 * 8), // 8 days old
          retryCount: 0,
        },
        {
          id: 'recent-1',
          mutation: 'RECENT_MUTATION',
          variables: {},
          timestamp: Date.now() - (60 * 60 * 1000), // 1 hour old
          retryCount: 0,
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(expiredItems));

      const queue = new OfflineQueue();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should only have recent item
      expect(queue.getQueueSize()).toBe(1);
    });

    it('manages storage quota efficiently', async () => {
      const maxItems = 1000;
      const items = Array.from({ length: maxItems + 100 }, (_, i) => ({
        id: `item-${i}`,
        mutation: 'TEST_MUTATION',
        variables: { data: 'test' },
        timestamp: Date.now() - i,
        retryCount: 0,
      }));

      offlineQueue.setNetworkStatus(false);

      // Add items beyond limit
      for (const item of items) {
        await offlineQueue.addToQueue(item);
      }

      // Should maintain max items (remove oldest)
      expect(offlineQueue.getQueueSize()).toBe(maxItems);
    });
  });

  describe('Error Handling', () => {
    it('handles AsyncStorage errors gracefully', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage full'));

      offlineQueue.setNetworkStatus(false);

      // Should not throw error
      await expect(offlineQueue.addToQueue({
        mutation: 'TEST_MUTATION',
        variables: {},
      })).resolves.not.toThrow();
    });

    it('handles network state change errors', async () => {
      const networkListener = (NetInfo.addEventListener as jest.Mock).mock.calls[0][0];

      // Should handle invalid network state
      await expect(networkListener(null)).resolves.not.toThrow();
      await expect(networkListener({ isConnected: undefined })).resolves.not.toThrow();
    });

    it('provides error callbacks for mutation failures', async () => {
      const onError = jest.fn();
      
      offlineQueue.setNetworkStatus(false);
      await offlineQueue.addToQueue({
        mutation: 'CREATE_INCIDENT',
        variables: { input: { title: 'Test' } },
        onError,
      });

      (apolloClient.mutate as jest.Mock).mockRejectedValue(new Error('Server error'));
      offlineQueue.setNetworkStatus(true);
      await offlineQueue.processQueue();

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('Performance', () => {
    it('processes queue in batches for better performance', async () => {
      const batchSize = 10;
      const totalItems = 25;

      offlineQueue.setNetworkStatus(false);

      // Add multiple items
      for (let i = 0; i < totalItems; i++) {
        await offlineQueue.addToQueue({
          mutation: 'CREATE_SECURITY_EVENT',
          variables: { input: { type: `EVENT_${i}` } },
        });
      }

      (apolloClient.mutate as jest.Mock).mockResolvedValue({ data: { success: true } });

      offlineQueue.setNetworkStatus(true);
      await offlineQueue.processQueueInBatches(batchSize);

      // Should process in batches
      expect(apolloClient.mutate).toHaveBeenCalledTimes(totalItems);
      expect(offlineQueue.getQueueSize()).toBe(0);
    });

    it('debounces rapid queue additions', async () => {
      offlineQueue.setNetworkStatus(false);

      // Add multiple items rapidly
      const promises = Array.from({ length: 10 }, (_, i) =>
        offlineQueue.addToQueue({
          mutation: 'UPDATE_INCIDENT',
          variables: { id: 'inc-123', input: { notes: `Update ${i}` } },
        })
      );

      await Promise.all(promises);

      // Should debounce and only keep latest update
      expect(offlineQueue.getQueueSize()).toBe(1);
    });
  });
});
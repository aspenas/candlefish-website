import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-netinfo/netinfo';
import { jest } from '@jest/globals';

import { OfflineQueueService } from '../../src/services/offline-queue';
import { ValuationSyncService } from '../../src/services/valuation-sync';
import { mockCurrentValuation, mockValuationResponse } from '../__mocks__/valuationMocks';
import { createMockNetworkState } from '../utils/networkUtils';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
  clear: jest.fn(),
}));

// Mock NetInfo
jest.mock('@react-native-netinfo/netinfo', () => ({
  fetch: jest.fn(),
  addEventListener: jest.fn(() => jest.fn()),
  configure: jest.fn(),
}));

// Mock API functions
const mockApiCall = jest.fn();
const mockValuationApi = {
  getCurrentValuation: jest.fn(),
  requestMarketValuation: jest.fn(),
  getValuationResponse: jest.fn(),
  updateValuation: jest.fn(),
};

describe('OfflineQueueService', () => {
  let offlineQueue: OfflineQueueService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    offlineQueue = new OfflineQueueService();
    
    // Setup default AsyncStorage mocks
    (AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.MockedFunction<typeof AsyncStorage.setItem>).mockResolvedValue(undefined);
  });

  describe('Queue Management', () => {
    it('should add actions to the offline queue', async () => {
      const action = {
        id: 'action-1',
        type: 'REQUEST_VALUATION',
        payload: {
          itemId: 'test-item-123',
          requestType: 'market_lookup',
        },
        timestamp: Date.now(),
        retryCount: 0,
      };

      await offlineQueue.enqueue(action);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_queue',
        JSON.stringify([action])
      );
    });

    it('should retrieve queued actions from storage', async () => {
      const queuedActions = [
        {
          id: 'action-1',
          type: 'REQUEST_VALUATION',
          payload: { itemId: 'test-item-123' },
          timestamp: Date.now(),
          retryCount: 0,
        },
        {
          id: 'action-2',
          type: 'UPDATE_ASKING_PRICE',
          payload: { itemId: 'test-item-456', price: 1200 },
          timestamp: Date.now(),
          retryCount: 1,
        },
      ];

      (AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>).mockResolvedValueOnce(
        JSON.stringify(queuedActions)
      );

      const retrieved = await offlineQueue.getQueue();

      expect(retrieved).toEqual(queuedActions);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('offline_queue');
    });

    it('should remove actions from the queue after successful execution', async () => {
      const initialQueue = [
        { id: 'action-1', type: 'REQUEST_VALUATION' },
        { id: 'action-2', type: 'UPDATE_PRICE' },
      ];

      (AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>).mockResolvedValueOnce(
        JSON.stringify(initialQueue)
      );

      await offlineQueue.dequeue('action-1');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_queue',
        JSON.stringify([{ id: 'action-2', type: 'UPDATE_PRICE' }])
      );
    });

    it('should increment retry count for failed actions', async () => {
      const action = {
        id: 'action-1',
        type: 'REQUEST_VALUATION',
        payload: { itemId: 'test-item-123' },
        timestamp: Date.now(),
        retryCount: 0,
      };

      const queue = [action];
      
      (AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>).mockResolvedValueOnce(
        JSON.stringify(queue)
      );

      await offlineQueue.markAsFailed('action-1');

      const expectedUpdatedAction = { ...action, retryCount: 1 };
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_queue',
        JSON.stringify([expectedUpdatedAction])
      );
    });

    it('should remove actions that exceed maximum retry attempts', async () => {
      const action = {
        id: 'action-1',
        type: 'REQUEST_VALUATION',
        payload: { itemId: 'test-item-123' },
        timestamp: Date.now(),
        retryCount: 5, // Exceeds max retries
      };

      const queue = [action];
      
      (AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>).mockResolvedValueOnce(
        JSON.stringify(queue)
      );

      await offlineQueue.markAsFailed('action-1');

      // Should remove the action entirely
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_queue',
        JSON.stringify([])
      );
    });
  });

  describe('Queue Processing', () => {
    it('should process queued actions when network becomes available', async () => {
      const queuedActions = [
        {
          id: 'action-1',
          type: 'REQUEST_VALUATION',
          payload: { itemId: 'test-item-123', requestType: 'market_lookup' },
          timestamp: Date.now(),
          retryCount: 0,
        },
      ];

      (AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>).mockResolvedValueOnce(
        JSON.stringify(queuedActions)
      );

      mockApiCall.mockResolvedValueOnce({ success: true });

      await offlineQueue.processQueue(mockApiCall);

      expect(mockApiCall).toHaveBeenCalledWith('REQUEST_VALUATION', queuedActions[0].payload);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_queue',
        JSON.stringify([]) // Queue should be empty after processing
      );
    });

    it('should handle API failures during queue processing', async () => {
      const queuedActions = [
        {
          id: 'action-1',
          type: 'REQUEST_VALUATION',
          payload: { itemId: 'test-item-123' },
          timestamp: Date.now(),
          retryCount: 0,
        },
      ];

      (AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>).mockResolvedValue(
        JSON.stringify(queuedActions)
      );

      mockApiCall.mockRejectedValueOnce(new Error('API Error'));

      await offlineQueue.processQueue(mockApiCall);

      // Should increment retry count for failed action
      const expectedFailedAction = { ...queuedActions[0], retryCount: 1 };
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_queue',
        JSON.stringify([expectedFailedAction])
      );
    });

    it('should process actions in chronological order', async () => {
      const action1 = {
        id: 'action-1',
        type: 'REQUEST_VALUATION',
        payload: { itemId: 'test-item-123' },
        timestamp: Date.now() - 2000, // Older
        retryCount: 0,
      };

      const action2 = {
        id: 'action-2',
        type: 'UPDATE_PRICE',
        payload: { itemId: 'test-item-456' },
        timestamp: Date.now() - 1000, // Newer
        retryCount: 0,
      };

      const queuedActions = [action2, action1]; // Stored out of order

      (AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>).mockResolvedValueOnce(
        JSON.stringify(queuedActions)
      );

      mockApiCall.mockResolvedValue({ success: true });

      await offlineQueue.processQueue(mockApiCall);

      // Should process in chronological order (oldest first)
      expect(mockApiCall).toHaveBeenNthCalledWith(1, 'REQUEST_VALUATION', action1.payload);
      expect(mockApiCall).toHaveBeenNthCalledWith(2, 'UPDATE_PRICE', action2.payload);
    });
  });

  describe('Storage Management', () => {
    it('should handle storage quota exceeded errors', async () => {
      const largeAction = {
        id: 'action-1',
        type: 'UPLOAD_PHOTO',
        payload: { 
          itemId: 'test-item-123',
          photoData: 'x'.repeat(10000000), // Large data
        },
        timestamp: Date.now(),
        retryCount: 0,
      };

      (AsyncStorage.setItem as jest.MockedFunction<typeof AsyncStorage.setItem>).mockRejectedValueOnce(
        new Error('Storage quota exceeded')
      );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await offlineQueue.enqueue(largeAction);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to enqueue action'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should clean up old completed actions from storage', async () => {
      const oldTimestamp = Date.now() - (8 * 24 * 60 * 60 * 1000); // 8 days ago
      const recentTimestamp = Date.now() - (1 * 24 * 60 * 60 * 1000); // 1 day ago

      const actions = [
        {
          id: 'old-action',
          type: 'REQUEST_VALUATION',
          payload: { itemId: 'old-item' },
          timestamp: oldTimestamp,
          retryCount: 0,
          completed: true,
        },
        {
          id: 'recent-action',
          type: 'REQUEST_VALUATION',
          payload: { itemId: 'recent-item' },
          timestamp: recentTimestamp,
          retryCount: 0,
          completed: true,
        },
        {
          id: 'pending-action',
          type: 'UPDATE_PRICE',
          payload: { itemId: 'pending-item' },
          timestamp: recentTimestamp,
          retryCount: 0,
          completed: false,
        },
      ];

      (AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>).mockResolvedValueOnce(
        JSON.stringify(actions)
      );

      await offlineQueue.cleanup();

      // Should keep recent completed actions and all pending actions
      const expectedActions = [actions[1], actions[2]];
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_queue',
        JSON.stringify(expectedActions)
      );
    });
  });
});

describe('ValuationSyncService', () => {
  let syncService: ValuationSyncService;
  let offlineQueue: OfflineQueueService;

  beforeEach(() => {
    jest.clearAllMocks();
    offlineQueue = new OfflineQueueService();
    syncService = new ValuationSyncService(mockValuationApi, offlineQueue);
    
    // Setup network state
    (NetInfo.fetch as jest.MockedFunction<typeof NetInfo.fetch>).mockResolvedValue(
      createMockNetworkState(true)
    );
  });

  describe('Online Operations', () => {
    it('should perform valuation requests immediately when online', async () => {
      mockValuationApi.requestMarketValuation.mockResolvedValueOnce({
        id: 'request-123',
        status: 'pending',
      });

      const result = await syncService.requestMarketValuation({
        itemIds: ['test-item-123'],
        requestType: 'market_lookup',
        priority: 1,
      });

      expect(mockValuationApi.requestMarketValuation).toHaveBeenCalledWith({
        itemIds: ['test-item-123'],
        requestType: 'market_lookup',
        priority: 1,
      });

      expect(result.success).toBe(true);
    });

    it('should fetch current valuation directly when online', async () => {
      mockValuationApi.getCurrentValuation.mockResolvedValueOnce(mockCurrentValuation);

      const result = await syncService.getCurrentValuation('test-item-123');

      expect(mockValuationApi.getCurrentValuation).toHaveBeenCalledWith('test-item-123');
      expect(result).toEqual(mockCurrentValuation);
    });

    it('should cache fetched data for offline access', async () => {
      mockValuationApi.getCurrentValuation.mockResolvedValueOnce(mockCurrentValuation);

      await syncService.getCurrentValuation('test-item-123');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'cached_valuation_test-item-123',
        JSON.stringify({
          data: mockCurrentValuation,
          timestamp: expect.any(Number),
        })
      );
    });
  });

  describe('Offline Operations', () => {
    beforeEach(() => {
      // Mock offline state
      (NetInfo.fetch as jest.MockedFunction<typeof NetInfo.fetch>).mockResolvedValue(
        createMockNetworkState(false)
      );
    });

    it('should queue valuation requests when offline', async () => {
      const queueSpy = jest.spyOn(offlineQueue, 'enqueue');

      const result = await syncService.requestMarketValuation({
        itemIds: ['test-item-123'],
        requestType: 'market_lookup',
        priority: 1,
      });

      expect(queueSpy).toHaveBeenCalledWith({
        id: expect.any(String),
        type: 'REQUEST_VALUATION',
        payload: {
          itemIds: ['test-item-123'],
          requestType: 'market_lookup',
          priority: 1,
        },
        timestamp: expect.any(Number),
        retryCount: 0,
      });

      expect(result.success).toBe(true);
      expect(result.queued).toBe(true);
    });

    it('should return cached data when offline', async () => {
      const cachedData = {
        data: mockCurrentValuation,
        timestamp: Date.now() - 30000, // 30 seconds ago
      };

      (AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>).mockResolvedValueOnce(
        JSON.stringify(cachedData)
      );

      const result = await syncService.getCurrentValuation('test-item-123');

      expect(result).toEqual(mockCurrentValuation);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('cached_valuation_test-item-123');
    });

    it('should return null for uncached data when offline', async () => {
      (AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>).mockResolvedValueOnce(null);

      const result = await syncService.getCurrentValuation('test-item-123');

      expect(result).toBeNull();
    });

    it('should invalidate stale cached data', async () => {
      const staleData = {
        data: mockCurrentValuation,
        timestamp: Date.now() - (2 * 60 * 60 * 1000), // 2 hours ago
      };

      (AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>).mockResolvedValueOnce(
        JSON.stringify(staleData)
      );

      const result = await syncService.getCurrentValuation('test-item-123');

      expect(result).toBeNull(); // Stale data should not be returned
    });
  });

  describe('Network State Changes', () => {
    it('should process queued actions when network comes back online', async () => {
      const mockNetworkListener = jest.fn();
      (NetInfo.addEventListener as jest.MockedFunction<typeof NetInfo.addEventListener>).mockReturnValue(
        mockNetworkListener
      );

      // Start sync service
      syncService.startNetworkListener();

      // Simulate network state change from offline to online
      const networkCallback = (NetInfo.addEventListener as jest.Mock).mock.calls[0][0];
      
      await networkCallback(createMockNetworkState(true));

      // Should process the queue
      const processSpy = jest.spyOn(offlineQueue, 'processQueue');
      expect(processSpy).toHaveBeenCalled();
    });

    it('should handle intermittent connectivity gracefully', async () => {
      let isConnected = true;
      
      (NetInfo.fetch as jest.MockedFunction<typeof NetInfo.fetch>).mockImplementation(() => 
        Promise.resolve(createMockNetworkState(isConnected))
      );

      // Start with online state
      mockValuationApi.getCurrentValuation.mockResolvedValueOnce(mockCurrentValuation);
      
      let result = await syncService.getCurrentValuation('test-item-123');
      expect(result).toEqual(mockCurrentValuation);

      // Switch to offline
      isConnected = false;
      
      // Cache should be populated, so should return cached data
      (AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>).mockResolvedValueOnce(
        JSON.stringify({
          data: mockCurrentValuation,
          timestamp: Date.now(),
        })
      );

      result = await syncService.getCurrentValuation('test-item-123');
      expect(result).toEqual(mockCurrentValuation);
    });
  });

  describe('Data Consistency', () => {
    it('should handle concurrent read/write operations', async () => {
      const itemId = 'test-item-123';
      
      // Mock concurrent operations
      const promises = [
        syncService.getCurrentValuation(itemId),
        syncService.getCurrentValuation(itemId),
        syncService.requestMarketValuation({
          itemIds: [itemId],
          requestType: 'market_lookup',
          priority: 1,
        }),
      ];

      mockValuationApi.getCurrentValuation.mockResolvedValue(mockCurrentValuation);
      mockValuationApi.requestMarketValuation.mockResolvedValue({ success: true });

      const results = await Promise.all(promises);

      // All operations should complete successfully
      expect(results[0]).toEqual(mockCurrentValuation);
      expect(results[1]).toEqual(mockCurrentValuation);
      expect(results[2].success).toBe(true);
    });

    it('should maintain cache consistency during sync operations', async () => {
      const itemId = 'test-item-123';
      
      // Start with cached data
      const cachedValuation = { ...mockCurrentValuation, estimatedValue: 1000 };
      (AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>).mockResolvedValueOnce(
        JSON.stringify({
          data: cachedValuation,
          timestamp: Date.now(),
        })
      );

      // Fetch from cache (offline scenario)
      (NetInfo.fetch as jest.MockedFunction<typeof NetInfo.fetch>).mockResolvedValueOnce(
        createMockNetworkState(false)
      );
      
      let result = await syncService.getCurrentValuation(itemId);
      expect(result).toEqual(cachedValuation);

      // Network comes back, new data available
      (NetInfo.fetch as jest.MockedFunction<typeof NetInfo.fetch>).mockResolvedValue(
        createMockNetworkState(true)
      );
      
      const updatedValuation = { ...mockCurrentValuation, estimatedValue: 1200 };
      mockValuationApi.getCurrentValuation.mockResolvedValueOnce(updatedValuation);
      
      result = await syncService.getCurrentValuation(itemId);
      
      // Should return updated data and update cache
      expect(result).toEqual(updatedValuation);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        `cached_valuation_${itemId}`,
        JSON.stringify({
          data: updatedValuation,
          timestamp: expect.any(Number),
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle storage errors gracefully', async () => {
      (AsyncStorage.setItem as jest.MockedFunction<typeof AsyncStorage.setItem>).mockRejectedValue(
        new Error('Storage full')
      );

      mockValuationApi.getCurrentValuation.mockResolvedValueOnce(mockCurrentValuation);

      // Should still return the data even if caching fails
      const result = await syncService.getCurrentValuation('test-item-123');
      expect(result).toEqual(mockCurrentValuation);
    });

    it('should handle malformed cached data', async () => {
      (AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>).mockResolvedValueOnce(
        'invalid json'
      );

      (NetInfo.fetch as jest.MockedFunction<typeof NetInfo.fetch>).mockResolvedValue(
        createMockNetworkState(false)
      );

      const result = await syncService.getCurrentValuation('test-item-123');
      expect(result).toBeNull(); // Should handle gracefully
    });

    it('should handle network timeout errors during sync', async () => {
      const timeoutError = new Error('Network timeout');
      timeoutError.name = 'TimeoutError';
      
      mockValuationApi.getCurrentValuation.mockRejectedValueOnce(timeoutError);

      // Should fall back to cached data if available
      (AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>).mockResolvedValueOnce(
        JSON.stringify({
          data: mockCurrentValuation,
          timestamp: Date.now(),
        })
      );

      const result = await syncService.getCurrentValuation('test-item-123');
      expect(result).toEqual(mockCurrentValuation);
    });
  });

  describe('Performance Optimization', () => {
    it('should batch multiple queue operations', async () => {
      const actions = [
        { itemIds: ['item-1'], requestType: 'market_lookup', priority: 1 },
        { itemIds: ['item-2'], requestType: 'market_lookup', priority: 1 },
        { itemIds: ['item-3'], requestType: 'market_lookup', priority: 1 },
      ];

      // Mock offline state to queue actions
      (NetInfo.fetch as jest.MockedFunction<typeof NetInfo.fetch>).mockResolvedValue(
        createMockNetworkState(false)
      );

      // Queue multiple actions
      const promises = actions.map(action => syncService.requestMarketValuation(action));
      await Promise.all(promises);

      // Should batch storage operations
      expect(AsyncStorage.setItem).toHaveBeenCalledTimes(3); // Once per action
    });

    it('should implement exponential backoff for failed sync operations', async () => {
      const failedAction = {
        id: 'action-1',
        type: 'REQUEST_VALUATION',
        payload: { itemId: 'test-item-123' },
        timestamp: Date.now(),
        retryCount: 2, // Has been retried
      };

      mockApiCall.mockRejectedValue(new Error('Server error'));

      const startTime = Date.now();
      
      // Should wait before retrying (exponential backoff)
      await expect(
        syncService.retryFailedAction(failedAction, mockApiCall)
      ).rejects.toThrow('Server error');

      const endTime = Date.now();
      const delay = endTime - startTime;
      
      // Should have waited at least 4 seconds (2^2 seconds for retry count 2)
      expect(delay).toBeGreaterThanOrEqual(4000);
    });
  });
});
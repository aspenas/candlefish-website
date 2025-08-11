import { OfflineService } from '../../../apps/mobile-dashboard/src/services/offline';
import { SyncService } from '../../../apps/mobile-dashboard/src/services/sync';
import { NetworkService } from '../../../apps/mobile-dashboard/src/services/network';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-netinfo/lib/src';
import { apolloClient } from '../../../apps/mobile-dashboard/src/services/apollo';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
  getAllKeys: jest.fn(),
  clear: jest.fn(),
}));

// Mock NetInfo
jest.mock('@react-native-netinfo/lib/src', () => ({
  fetch: jest.fn(),
  addEventListener: jest.fn(),
  refresh: jest.fn(),
}));

// Mock Apollo Client
jest.mock('../../../apps/mobile-dashboard/src/services/apollo', () => ({
  apolloClient: {
    query: jest.fn(),
    mutate: jest.fn(),
    cache: {
      writeQuery: jest.fn(),
      readQuery: jest.fn(),
      evict: jest.fn(),
      gc: jest.fn(),
    },
  },
}));

// Mock SQLite
jest.mock('react-native-sqlite-storage', () => ({
  enablePromise: jest.fn(),
  openDatabase: jest.fn(() => ({
    transaction: jest.fn((callback) =>
      callback({
        executeSql: jest.fn(),
      })
    ),
    executeSql: jest.fn(),
    close: jest.fn(),
  })),
}));

// Mock Background Job
jest.mock('react-native-background-job', () => ({
  register: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
}));

describe('OfflineService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize offline storage and sync mechanisms', async () => {
      // Arrange
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        const storage = {
          'offline_config': JSON.stringify({
            maxStorageSize: 50 * 1024 * 1024, // 50MB
            syncInterval: 300000, // 5 minutes
            retryAttempts: 3,
          }),
          'offline_queue': JSON.stringify([]),
        };
        return Promise.resolve(storage[key] || null);
      });

      // Act
      await OfflineService.initialize();

      // Assert
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('offline_config');
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('offline_queue');
    });

    it('should create default configuration if none exists', async () => {
      // Arrange
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      // Act
      await OfflineService.initialize();

      // Assert
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_config',
        expect.stringContaining('maxStorageSize')
      );
    });

    it('should handle initialization errors gracefully', async () => {
      // Arrange
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(
        new Error('Storage initialization failed')
      );

      // Act & Assert
      await expect(OfflineService.initialize()).resolves.not.toThrow();
    });
  });

  describe('Data Caching', () => {
    beforeEach(async () => {
      await OfflineService.initialize();
    });

    it('should cache dashboard data for offline access', async () => {
      // Arrange
      const dashboardData = {
        id: 'dashboard-123',
        name: 'Sales Dashboard',
        widgets: [
          { id: 'widget-1', type: 'metric', data: { value: 1234 } },
          { id: 'widget-2', type: 'chart', data: { series: [] } },
        ],
        lastUpdated: Date.now(),
      };

      // Act
      await OfflineService.cacheData({
        key: 'dashboard_dashboard-123',
        data: dashboardData,
        timestamp: Date.now(),
        expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      });

      // Assert
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_cache_dashboard_dashboard-123',
        JSON.stringify({
          data: dashboardData,
          timestamp: expect.any(Number),
          expiresAt: expect.any(Number),
        })
      );
    });

    it('should retrieve cached data when offline', async () => {
      // Arrange
      const cachedData = {
        data: { id: 'dashboard-123', name: 'Sales Dashboard' },
        timestamp: Date.now() - 1000,
        expiresAt: Date.now() + 1000,
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(cachedData)
      );

      // Act
      const result = await OfflineService.getCachedData('dashboard_dashboard-123');

      // Assert
      expect(result).toEqual(cachedData);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith(
        'offline_cache_dashboard_dashboard-123'
      );
    });

    it('should handle expired cached data', async () => {
      // Arrange
      const expiredData = {
        data: { id: 'dashboard-123' },
        timestamp: Date.now() - 10000,
        expiresAt: Date.now() - 1000, // Expired
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(expiredData)
      );

      // Act
      const result = await OfflineService.getCachedData('dashboard_dashboard-123');

      // Assert
      expect(result).toBeNull();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
        'offline_cache_dashboard_dashboard-123'
      );
    });

    it('should implement LRU cache eviction when storage limit is reached', async () => {
      // Arrange
      const storageKeys = Array.from({ length: 100 }, (_, i) =>
        `offline_cache_item_${i}`
      );

      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue(storageKeys);
      (AsyncStorage.multiGet as jest.Mock).mockResolvedValue(
        storageKeys.map((key, index) => [
          key,
          JSON.stringify({
            data: { id: `item-${index}` },
            timestamp: Date.now() - (index * 1000), // Older items have earlier timestamps
            size: 1024 * 1024, // 1MB each
          }),
        ])
      );

      // Mock storage size calculation to exceed limit
      jest.spyOn(OfflineService, 'getStorageSize').mockResolvedValue(60 * 1024 * 1024); // 60MB

      // Act
      await OfflineService.evictLRUCache();

      // Assert
      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(
        expect.arrayContaining([
          'offline_cache_item_99', // Oldest items should be evicted
          'offline_cache_item_98',
        ])
      );
    });
  });

  describe('Mutation Queue', () => {
    beforeEach(async () => {
      await OfflineService.initialize();
    });

    it('should queue mutations when offline', async () => {
      // Arrange
      const mutation = {
        id: 'create_dashboard_123',
        type: 'CREATE_DASHBOARD',
        variables: {
          input: {
            name: 'New Dashboard',
            organizationId: 'org-123',
          },
        },
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
        priority: 'high' as const,
      };

      // Act
      await OfflineService.addMutation(mutation);

      // Assert
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_queue',
        expect.stringContaining('CREATE_DASHBOARD')
      );
    });

    it('should process queued mutations when back online', async () => {
      // Arrange
      const queuedMutations = [
        {
          id: 'create_dashboard_123',
          type: 'CREATE_DASHBOARD',
          variables: { input: { name: 'Dashboard 1' } },
          timestamp: Date.now() - 1000,
          retryCount: 0,
          maxRetries: 3,
          priority: 'high' as const,
        },
        {
          id: 'update_widget_456',
          type: 'UPDATE_WIDGET',
          variables: { id: 'widget-456', input: { title: 'Updated Widget' } },
          timestamp: Date.now(),
          retryCount: 0,
          maxRetries: 3,
          priority: 'medium' as const,
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(queuedMutations)
      );

      (apolloClient.mutate as jest.Mock).mockResolvedValue({
        data: { createDashboard: { id: 'dashboard-123' } },
      });

      // Act
      await OfflineService.processQueue();

      // Assert
      expect(apolloClient.mutate).toHaveBeenCalledTimes(2);
      expect(apolloClient.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: { input: { name: 'Dashboard 1' } },
        })
      );
    });

    it('should handle mutation conflicts during queue processing', async () => {
      // Arrange
      const conflictingMutations = [
        {
          id: 'update_dashboard_123_v1',
          type: 'UPDATE_DASHBOARD',
          variables: { id: 'dashboard-123', input: { name: 'Version 1' } },
          timestamp: Date.now() - 2000,
          retryCount: 0,
          maxRetries: 3,
        },
        {
          id: 'update_dashboard_123_v2',
          type: 'UPDATE_DASHBOARD',
          variables: { id: 'dashboard-123', input: { name: 'Version 2' } },
          timestamp: Date.now() - 1000,
          retryCount: 0,
          maxRetries: 3,
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(conflictingMutations)
      );

      // Mock conflict resolution strategy (last writer wins)
      const mockConflictResolver = jest.fn().mockResolvedValue({
        resolution: 'use_latest',
        mutation: conflictingMutations[1],
      });

      OfflineService['resolveConflicts'] = mockConflictResolver;

      // Act
      await OfflineService.processQueue();

      // Assert
      expect(mockConflictResolver).toHaveBeenCalledWith(
        conflictingMutations,
        'dashboard-123'
      );
    });

    it('should retry failed mutations with exponential backoff', async () => {
      // Arrange
      const failedMutation = {
        id: 'failed_mutation_123',
        type: 'CREATE_DASHBOARD',
        variables: { input: { name: 'Failed Dashboard' } },
        timestamp: Date.now(),
        retryCount: 1,
        maxRetries: 3,
        priority: 'medium' as const,
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify([failedMutation])
      );

      (apolloClient.mutate as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      // Act
      await OfflineService.processQueue();

      // Assert
      expect(apolloClient.mutate).toHaveBeenCalled();

      // Should update retry count and schedule for next attempt
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_queue',
        expect.stringContaining('"retryCount":2')
      );
    });

    it('should discard mutations after max retries exceeded', async () => {
      // Arrange
      const exhaustedMutation = {
        id: 'exhausted_mutation_123',
        type: 'CREATE_DASHBOARD',
        variables: { input: { name: 'Exhausted Dashboard' } },
        timestamp: Date.now(),
        retryCount: 3,
        maxRetries: 3,
        priority: 'low' as const,
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify([exhaustedMutation])
      );

      (apolloClient.mutate as jest.Mock).mockRejectedValue(
        new Error('Permanent error')
      );

      // Act
      await OfflineService.processQueue();

      // Assert - mutation should be removed from queue
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_queue',
        JSON.stringify([]) // Empty queue
      );
    });
  });

  describe('Sync Service Integration', () => {
    beforeEach(async () => {
      await OfflineService.initialize();
      await SyncService.initialize();
    });

    it('should sync data when network becomes available', async () => {
      // Arrange
      const networkListener = jest.fn();
      (NetInfo.addEventListener as jest.Mock).mockImplementation((callback) => {
        networkListener.mockImplementation(callback);
        return { remove: jest.fn() };
      });

      // Simulate network state change
      const mockNetworkState = {
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      };

      // Act
      await SyncService.startNetworkMonitoring();
      networkListener(mockNetworkState);

      // Assert
      expect(NetInfo.addEventListener).toHaveBeenCalled();
    });

    it('should handle partial sync failures gracefully', async () => {
      // Arrange
      const partialSyncData = {
        dashboards: [
          { id: 'dashboard-1', syncStatus: 'pending' },
          { id: 'dashboard-2', syncStatus: 'synced' },
        ],
        widgets: [
          { id: 'widget-1', syncStatus: 'conflict' },
          { id: 'widget-2', syncStatus: 'pending' },
        ],
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(partialSyncData)
      );

      // Mock API calls with mixed results
      (apolloClient.query as jest.Mock)
        .mockResolvedValueOnce({ data: { dashboard: { id: 'dashboard-1' } } })
        .mockRejectedValueOnce(new Error('Dashboard 2 sync failed'));

      // Act
      const result = await SyncService.performPartialSync();

      // Assert
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.conflicts).toBe(1);
    });

    it('should implement delta sync for efficient data transfer', async () => {
      // Arrange
      const lastSyncTimestamp = Date.now() - (60 * 60 * 1000); // 1 hour ago

      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'last_sync_timestamp') {
          return Promise.resolve(lastSyncTimestamp.toString());
        }
        return Promise.resolve(null);
      });

      const mockDeltaData = {
        dashboards: {
          updated: [{ id: 'dashboard-1', updatedAt: Date.now() }],
          deleted: ['dashboard-2'],
        },
        widgets: {
          updated: [{ id: 'widget-1', updatedAt: Date.now() }],
          deleted: [],
        },
      };

      (apolloClient.query as jest.Mock).mockResolvedValue({
        data: { deltaSync: mockDeltaData },
      });

      // Act
      await SyncService.performDeltaSync();

      // Assert
      expect(apolloClient.query).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            since: lastSyncTimestamp,
          }),
        })
      );
    });
  });

  describe('Conflict Resolution', () => {
    it('should detect and resolve data conflicts', async () => {
      // Arrange
      const localData = {
        id: 'dashboard-123',
        name: 'Local Changes',
        updatedAt: Date.now() - 1000,
        version: 1,
      };

      const remoteData = {
        id: 'dashboard-123',
        name: 'Remote Changes',
        updatedAt: Date.now(),
        version: 2,
      };

      // Act
      const resolution = await OfflineService.resolveConflict({
        type: 'UPDATE_DASHBOARD',
        localData,
        remoteData,
        strategy: 'merge',
      });

      // Assert
      expect(resolution.strategy).toBe('merge');
      expect(resolution.resolved.name).toBe('Remote Changes'); // Remote wins by timestamp
      expect(resolution.resolved.version).toBe(2);
    });

    it('should handle three-way merge conflicts', async () => {
      // Arrange
      const baseData = {
        id: 'dashboard-123',
        name: 'Original Name',
        description: 'Original Description',
        version: 1,
      };

      const localData = {
        id: 'dashboard-123',
        name: 'Local Name Change',
        description: 'Original Description',
        version: 2,
      };

      const remoteData = {
        id: 'dashboard-123',
        name: 'Original Name',
        description: 'Remote Description Change',
        version: 2,
      };

      // Act
      const resolution = await OfflineService.resolveThreeWayMerge({
        base: baseData,
        local: localData,
        remote: remoteData,
      });

      // Assert
      expect(resolution.merged.name).toBe('Local Name Change');
      expect(resolution.merged.description).toBe('Remote Description Change');
      expect(resolution.conflicts).toHaveLength(0); // No conflicts in non-overlapping changes
    });

    it('should escalate unresolvable conflicts to user', async () => {
      // Arrange
      const conflictData = {
        type: 'UPDATE_DASHBOARD',
        localData: {
          id: 'dashboard-123',
          name: 'Local Conflicting Name',
          updatedAt: Date.now(),
        },
        remoteData: {
          id: 'dashboard-123',
          name: 'Remote Conflicting Name',
          updatedAt: Date.now(),
        },
        field: 'name',
      };

      const mockUserResolution = jest.fn().mockResolvedValue({
        choice: 'keep_local',
        resolved: conflictData.localData,
      });

      OfflineService['requestUserResolution'] = mockUserResolution;

      // Act
      const resolution = await OfflineService.resolveConflict({
        ...conflictData,
        strategy: 'ask_user',
      });

      // Assert
      expect(mockUserResolution).toHaveBeenCalledWith(conflictData);
      expect(resolution.resolved.name).toBe('Local Conflicting Name');
    });
  });

  describe('Background Sync', () => {
    it('should schedule periodic background sync', async () => {
      // Arrange
      const BackgroundJob = require('react-native-background-job');

      // Act
      await SyncService.scheduleBackgroundSync({
        interval: 300000, // 5 minutes
        requiredNetworkType: 'unmetered',
        requiresCharging: false,
        requiresDeviceIdle: false,
      });

      // Assert
      expect(BackgroundJob.register).toHaveBeenCalledWith(
        expect.objectContaining({
          jobKey: 'background-sync',
          period: 300000,
        })
      );
    });

    it('should handle background sync execution', async () => {
      // Arrange
      const mockSyncExecution = jest.fn().mockResolvedValue({
        success: true,
        synced: 5,
        errors: 0,
      });

      SyncService['executeSyncJob'] = mockSyncExecution;

      // Simulate background job execution
      const BackgroundJob = require('react-native-background-job');
      let backgroundJobCallback: () => Promise<void>;

      BackgroundJob.register.mockImplementation((config: any) => {
        backgroundJobCallback = config.callback;
      });

      await SyncService.scheduleBackgroundSync({
        interval: 300000,
        requiredNetworkType: 'unmetered',
      });

      // Act
      await backgroundJobCallback();

      // Assert
      expect(mockSyncExecution).toHaveBeenCalled();
    });

    it('should respect background sync constraints', async () => {
      // Arrange
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'cellular',
        details: {
          isConnectionExpensive: true,
        },
      });

      const constraints = {
        requiredNetworkType: 'unmetered',
        requiresCharging: true,
        requiresDeviceIdle: true,
      };

      // Act
      const canSync = await SyncService.checkSyncConstraints(constraints);

      // Assert
      expect(canSync).toBe(false); // Should fail due to expensive connection
    });
  });

  describe('Storage Management', () => {
    it('should monitor and manage offline storage size', async () => {
      // Arrange
      const mockStorageInfo = {
        totalSize: 100 * 1024 * 1024, // 100MB
        usedSize: 80 * 1024 * 1024,   // 80MB
        availableSize: 20 * 1024 * 1024, // 20MB
      };

      jest.spyOn(OfflineService, 'getStorageInfo').mockResolvedValue(mockStorageInfo);

      // Act
      const storageStatus = await OfflineService.checkStorageStatus();

      // Assert
      expect(storageStatus.usage).toBe(0.8); // 80% usage
      expect(storageStatus.needsCleanup).toBe(true); // Above 75% threshold
    });

    it('should clean up expired and unused data', async () => {
      // Arrange
      const expiredKeys = [
        'offline_cache_expired_1',
        'offline_cache_expired_2',
        'offline_cache_old_dashboard',
      ];

      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([
        ...expiredKeys,
        'offline_cache_current_dashboard',
        'offline_queue',
        'user_preferences',
      ]);

      // Mock expired data detection
      jest.spyOn(OfflineService, 'findExpiredData').mockResolvedValue(expiredKeys);

      // Act
      await OfflineService.performCleanup();

      // Assert
      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(expiredKeys);
    });

    it('should compress large cached data', async () => {
      // Arrange
      const largeData = {
        dashboards: Array.from({ length: 1000 }, (_, i) => ({
          id: `dashboard-${i}`,
          name: `Dashboard ${i}`,
          widgets: Array.from({ length: 10 }, (_, j) => ({
            id: `widget-${i}-${j}`,
            data: Array.from({ length: 100 }, () => Math.random()),
          })),
        })),
      };

      // Act
      const compressed = await OfflineService.compressData(largeData);
      const decompressed = await OfflineService.decompressData(compressed);

      // Assert
      expect(compressed.length).toBeLessThan(JSON.stringify(largeData).length);
      expect(decompressed).toEqual(largeData);
    });
  });

  describe('Error Recovery', () => {
    it('should recover from corrupted offline data', async () => {
      // Arrange
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'offline_queue') {
          return Promise.resolve('corrupted_json_data');
        }
        return Promise.resolve(null);
      });

      // Act
      const result = await OfflineService.recoverFromCorruption();

      // Assert
      expect(result.recovered).toBe(true);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('offline_queue');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_queue',
        JSON.stringify([])
      );
    });

    it('should handle storage quota exceeded errors', async () => {
      // Arrange
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(
        new Error('QuotaExceededError')
      );

      const testData = { test: 'data' };

      // Act
      const result = await OfflineService.cacheData({
        key: 'test_data',
        data: testData,
        timestamp: Date.now(),
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('QuotaExceededError');

      // Should trigger cleanup
      expect(OfflineService.performCleanup).toHaveBeenCalled();
    });

    it('should maintain data integrity during failures', async () => {
      // Arrange
      const criticalData = {
        dashboards: [{ id: 'dashboard-1', name: 'Critical Dashboard' }],
        user: { id: 'user-123', preferences: {} },
      };

      (AsyncStorage.setItem as jest.Mock)
        .mockResolvedValueOnce(undefined) // First save succeeds
        .mockRejectedValueOnce(new Error('Storage failure')); // Second save fails

      // Act
      const result = await OfflineService.atomicSave([
        { key: 'critical_dashboards', data: criticalData.dashboards },
        { key: 'critical_user', data: criticalData.user },
      ]);

      // Assert
      expect(result.success).toBe(false);
      expect(result.rolledBack).toBe(true);

      // Should rollback first save
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('critical_dashboards');
    });
  });
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { ApolloClient } from '@apollo/client';
// import BackgroundJob from 'react-native-background-job';

// Types
interface QueuedOperation {
  id: string;
  operation: 'mutation' | 'query';
  operationName: string;
  query: string;
  variables: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  priority: 'high' | 'normal' | 'low';
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

interface SyncStats {
  lastSyncTime: number;
  pendingOperations: number;
  failedOperations: number;
  totalSynced: number;
  averageSyncTime: number;
}

interface OfflineData {
  projects: any[];
  estimates: any[];
  photos: any[];
  measurements: any[];
  lastUpdated: number;
}

// Constants
const STORAGE_KEYS = {
  SYNC_QUEUE: '@paintbox/sync_queue',
  OFFLINE_DATA: '@paintbox/offline_data',
  SYNC_STATS: '@paintbox/sync_stats',
  LAST_SYNC: '@paintbox/last_sync',
  PENDING_PHOTOS: '@paintbox/pending_photos',
  MEASUREMENT_DRAFTS: '@paintbox/measurement_drafts',
};

const DEFAULT_RETRY_DELAYS = [1000, 5000, 15000, 30000, 60000]; // Progressive delays in ms
const MAX_QUEUE_SIZE = 1000;
const SYNC_INTERVAL = 30000; // 30 seconds
const BACKGROUND_SYNC_INTERVAL = 300000; // 5 minutes

class OfflineSyncService {
  private apolloClient: ApolloClient<any> | null = null;
  private syncInterval: NodeJS.Timeout | null = null;
  private backgroundJob: any = null;
  private isOnline = true;
  private isSyncing = false;

  constructor() {
    this.initializeNetworkListener();
  }

  // Initialize the service with Apollo Client
  initialize(apolloClient: ApolloClient<any>) {
    this.apolloClient = apolloClient;
    this.startPeriodicSync();
    this.initializeBackgroundSync();
  }

  // Network status monitoring
  private initializeNetworkListener() {
    NetInfo.addEventListener((state) => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;

      if (!wasOnline && this.isOnline) {
        console.log('Network restored, starting sync...');
        this.processQueue();
      } else if (wasOnline && !this.isOnline) {
        console.log('Network lost, stopping sync...');
        this.stopSync();
      }
    });
  }

  // Queue operations for offline processing
  async queueOperation(
    operation: 'mutation' | 'query',
    operationName: string,
    query: string,
    variables: any,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<string> {
    const queuedOp: QueuedOperation = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      operation,
      operationName,
      query,
      variables,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: 5,
      priority,
      status: 'pending',
    };

    const queue = await this.getQueue();

    // Prevent queue from growing too large
    if (queue.length >= MAX_QUEUE_SIZE) {
      // Remove oldest low-priority items
      const filteredQueue = queue
        .filter(op => op.priority !== 'low' || op.timestamp > Date.now() - 24 * 60 * 60 * 1000)
        .slice(-MAX_QUEUE_SIZE + 1);

      await this.saveQueue(filteredQueue);
    }

    queue.push(queuedOp);

    // Sort by priority and timestamp
    queue.sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return a.timestamp - b.timestamp;
    });

    await this.saveQueue(queue);

    // Try to process immediately if online
    if (this.isOnline && !this.isSyncing) {
      this.processQueue();
    }

    return queuedOp.id;
  }

  // Process the sync queue
  async processQueue(): Promise<void> {
    if (!this.apolloClient || !this.isOnline || this.isSyncing) {
      return;
    }

    this.isSyncing = true;
    console.log('Processing sync queue...');

    try {
      const queue = await this.getQueue();
      const pendingOps = queue.filter(op => op.status === 'pending' || op.status === 'failed');

      for (const operation of pendingOps) {
        await this.processOperation(operation);
      }

      // Clean up completed operations
      const remainingOps = queue.filter(op => op.status !== 'completed');
      await this.saveQueue(remainingOps);

      await this.updateSyncStats();
    } catch (error) {
      console.error('Error processing sync queue:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  // Process individual operation
  private async processOperation(operation: QueuedOperation): Promise<void> {
    try {
      operation.status = 'processing';
      await this.saveQueue(await this.getQueue());

      let result;
      if (operation.operation === 'mutation') {
        result = await this.apolloClient!.mutate({
          mutation: operation.query,
          variables: operation.variables,
        });
      } else {
        result = await this.apolloClient!.query({
          query: operation.query,
          variables: operation.variables,
          fetchPolicy: 'network-only',
        });
      }

      if (result.errors) {
        throw new Error(`GraphQL errors: ${result.errors.map(e => e.message).join(', ')}`);
      }

      operation.status = 'completed';
      console.log(`Successfully synced operation: ${operation.operationName}`);
    } catch (error) {
      console.error(`Failed to sync operation ${operation.operationName}:`, error);

      operation.retryCount++;
      if (operation.retryCount >= operation.maxRetries) {
        operation.status = 'failed';
        console.error(`Operation ${operation.operationName} failed permanently after ${operation.maxRetries} retries`);
      } else {
        operation.status = 'pending';
        // Schedule retry with exponential backoff
        const delay = DEFAULT_RETRY_DELAYS[Math.min(operation.retryCount - 1, DEFAULT_RETRY_DELAYS.length - 1)];
        setTimeout(() => {
          if (this.isOnline) {
            this.processQueue();
          }
        }, delay);
      }
    }

    await this.saveQueue(await this.getQueue());
  }

  // Cache essential data for offline access
  async cacheOfflineData(projects: any[], estimates: any[], photos: any[]): Promise<void> {
    const offlineData: OfflineData = {
      projects,
      estimates,
      photos,
      measurements: await this.getMeasurementDrafts(),
      lastUpdated: Date.now(),
    };

    await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_DATA, JSON.stringify(offlineData));
    console.log('Offline data cached successfully');
  }

  // Get cached offline data
  async getOfflineData(): Promise<OfflineData | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_DATA);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get offline data:', error);
      return null;
    }
  }

  // Measurement draft management
  async saveMeasurementDraft(estimateId: string, measurementData: any): Promise<string> {
    const drafts = await this.getMeasurementDrafts();
    const draftId = `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    drafts[draftId] = {
      id: draftId,
      estimateId,
      data: measurementData,
      createdAt: Date.now(),
      lastModified: Date.now(),
      syncStatus: 'pending',
    };

    await AsyncStorage.setItem(STORAGE_KEYS.MEASUREMENT_DRAFTS, JSON.stringify(drafts));
    return draftId;
  }

  async getMeasurementDrafts(): Promise<any> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.MEASUREMENT_DRAFTS);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Failed to get measurement drafts:', error);
      return {};
    }
  }

  async syncMeasurementDrafts(): Promise<void> {
    if (!this.isOnline || !this.apolloClient) return;

    const drafts = await this.getMeasurementDrafts();
    const pendingDrafts = Object.values(drafts).filter((draft: any) => draft.syncStatus === 'pending');

    for (const draft of pendingDrafts as any[]) {
      try {
        // Queue mutation to sync measurement
        await this.queueOperation(
          'mutation',
          'SyncMeasurements',
          'mutation SyncMeasurements($estimateId: ID!, $measurements: [MeasurementInput!]!) { syncMeasurements(estimateId: $estimateId, measurements: $measurements) { syncedCount failedCount errors } }',
          {
            estimateId: draft.estimateId,
            measurements: [draft.data],
          },
          'high'
        );

        draft.syncStatus = 'queued';
      } catch (error) {
        console.error(`Failed to queue measurement draft ${draft.id}:`, error);
      }
    }

    await AsyncStorage.setItem(STORAGE_KEYS.MEASUREMENT_DRAFTS, JSON.stringify(drafts));
  }

  // Photo queue management for offline uploads
  async queuePhotoUpload(
    projectId: string,
    photoUri: string,
    metadata: any
  ): Promise<string> {
    const pendingPhotos = await this.getPendingPhotos();
    const photoId = `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    pendingPhotos[photoId] = {
      id: photoId,
      projectId,
      uri: photoUri,
      metadata,
      queuedAt: Date.now(),
      status: 'pending',
      retryCount: 0,
    };

    await AsyncStorage.setItem(STORAGE_KEYS.PENDING_PHOTOS, JSON.stringify(pendingPhotos));

    // Try to upload immediately if online
    if (this.isOnline) {
      this.processPendingPhotos();
    }

    return photoId;
  }

  private async getPendingPhotos(): Promise<any> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_PHOTOS);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Failed to get pending photos:', error);
      return {};
    }
  }

  private async processPendingPhotos(): Promise<void> {
    // This would handle photo upload queue processing
    // Implementation would depend on your photo upload strategy
    console.log('Processing pending photos...');
  }

  // Queue management utilities
  private async getQueue(): Promise<QueuedOperation[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get sync queue:', error);
      return [];
    }
  }

  private async saveQueue(queue: QueuedOperation[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }

  // Statistics and monitoring
  private async updateSyncStats(): Promise<void> {
    const queue = await this.getQueue();
    const stats: SyncStats = {
      lastSyncTime: Date.now(),
      pendingOperations: queue.filter(op => op.status === 'pending').length,
      failedOperations: queue.filter(op => op.status === 'failed').length,
      totalSynced: queue.filter(op => op.status === 'completed').length,
      averageSyncTime: 0, // Calculate based on operation timestamps
    };

    await AsyncStorage.setItem(STORAGE_KEYS.SYNC_STATS, JSON.stringify(stats));
  }

  async getSyncStats(): Promise<SyncStats | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_STATS);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get sync stats:', error);
      return null;
    }
  }

  // Periodic sync
  private startPeriodicSync(): void {
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.processQueue();
      }
    }, SYNC_INTERVAL);
  }

  private stopSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Background sync for iOS/Android
  private initializeBackgroundSync(): void {
    // Background job functionality would be implemented here
    // For now, we'll use basic interval-based sync
    console.log('Background sync initialized (basic implementation)');
  }

  // Cleanup
  destroy(): void {
    this.stopSync();
    console.log('Sync service destroyed');
  }

  // Public status methods
  getIsOnline(): boolean {
    return this.isOnline;
  }

  getIsSyncing(): boolean {
    return this.isSyncing;
  }

  async getQueueSize(): Promise<number> {
    const queue = await this.getQueue();
    return queue.filter(op => op.status === 'pending').length;
  }

  // Clear all offline data (for development/testing)
  async clearAllData(): Promise<void> {
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.SYNC_QUEUE),
      AsyncStorage.removeItem(STORAGE_KEYS.OFFLINE_DATA),
      AsyncStorage.removeItem(STORAGE_KEYS.SYNC_STATS),
      AsyncStorage.removeItem(STORAGE_KEYS.PENDING_PHOTOS),
      AsyncStorage.removeItem(STORAGE_KEYS.MEASUREMENT_DRAFTS),
    ]);
    console.log('All offline data cleared');
  }
}

// Export singleton instance
export const offlineSyncService = new OfflineSyncService();
export default offlineSyncService;

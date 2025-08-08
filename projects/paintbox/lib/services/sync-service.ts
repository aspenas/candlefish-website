import { offlineDB } from '@/lib/db/offline-db';
import type { SyncQueue } from '@/lib/db/offline-db';

export interface SyncResult {
  success: boolean;
  processed: number;
  errors: number;
  details: Array<{
    id: number;
    type: string;
    status: 'success' | 'error';
    message?: string;
  }>;
}

export class SyncService {
  private syncInProgress = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private retryDelays = [1000, 5000, 15000, 60000]; // Progressive backoff

  constructor() {
    this.setupPeriodicSync();
    this.setupVisibilityHandlers();
  }

  /**
   * Start periodic background sync
   */
  private setupPeriodicSync(): void {
    // Sync every 30 seconds when online
    this.syncInterval = setInterval(() => {
      if (navigator.onLine && !this.syncInProgress) {
        this.performSync().catch(console.error);
      }
    }, 30 * 1000);
  }

  /**
   * Handle page visibility changes for sync optimization
   */
  private setupVisibilityHandlers(): void {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && navigator.onLine && !this.syncInProgress) {
        // Page became visible and we're online - trigger sync
        setTimeout(() => this.performSync().catch(console.error), 1000);
      }
    });

    // Sync when coming back online
    window.addEventListener('online', () => {
      setTimeout(() => this.performSync().catch(console.error), 2000);
    });
  }

  /**
   * Perform a full sync of all pending items
   */
  async performSync(): Promise<SyncResult> {
    if (this.syncInProgress || !navigator.onLine) {
      return {
        success: false,
        processed: 0,
        errors: 0,
        details: []
      };
    }

    this.syncInProgress = true;
    console.log('SyncService: Starting sync process...');

    try {
      // Get pending sync items sorted by priority
      const syncItems = await offlineDB.getNextSyncItems(50);

      if (syncItems.length === 0) {
        console.log('SyncService: No items to sync');
        return {
          success: true,
          processed: 0,
          errors: 0,
          details: []
        };
      }

      console.log(`SyncService: Found ${syncItems.length} items to sync`);

      const results: SyncResult['details'] = [];
      let processed = 0;
      let errors = 0;

      // Process items in batches to avoid overwhelming the server
      const batchSize = 10;
      for (let i = 0; i < syncItems.length; i += batchSize) {
        const batch = syncItems.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (item) => {
            try {
              await this.processSyncItem(item);
              await offlineDB.removeSyncItem(item.id!);

              results.push({
                id: item.id!,
                type: item.type,
                status: 'success'
              });
              processed++;

            } catch (error) {
              console.error(`SyncService: Failed to sync item ${item.id}:`, error);

              // Increment attempt counter with exponential backoff
              const nextRetryMinutes = Math.min(
                this.retryDelays[Math.min(item.attempts, this.retryDelays.length - 1)] / 1000 / 60,
                60 // Max 1 hour
              );

              await offlineDB.incrementSyncAttempts(item.id!, nextRetryMinutes);

              results.push({
                id: item.id!,
                type: item.type,
                status: 'error',
                message: error instanceof Error ? error.message : String(error)
              });
              errors++;
            }
          })
        );

        // Add delay between batches to avoid rate limiting
        if (i + batchSize < syncItems.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      const result: SyncResult = {
        success: errors === 0,
        processed,
        errors,
        details: results
      };

      console.log(`SyncService: Sync completed - ${processed} success, ${errors} errors`);
      return result;

    } catch (error) {
      console.error('SyncService: Sync process failed:', error);
      return {
        success: false,
        processed: 0,
        errors: 1,
        details: [{
          id: 0,
          type: 'system',
          status: 'error',
          message: error instanceof Error ? error.message : String(error)
        }]
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Process individual sync item
   */
  private async processSyncItem(item: SyncQueue): Promise<void> {
    const { type, action, data } = item;

    switch (type) {
      case 'estimate':
        await this.syncEstimate(action, data);
        break;

      case 'salesforce':
        await this.syncSalesforceData(action, data);
        break;

      case 'photo':
        await this.syncPhoto(action, data);
        break;

      case 'calculation':
        await this.syncCalculation(action, data);
        break;

      default:
        throw new Error(`Unknown sync type: ${type}`);
    }
  }

  /**
   * Sync estimate data
   */
  private async syncEstimate(action: string, data: any): Promise<void> {
    const endpoint = action === 'delete'
      ? `/api/estimates/${data.estimateId}`
      : '/api/estimates';

    const method = action === 'delete' ? 'DELETE' : 'POST';
    const body = action === 'delete' ? undefined : JSON.stringify(data);

    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Request': 'true'
      },
      body
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Estimate sync failed (${response.status}): ${errorText}`);
    }

    // Mark estimate as synced in local database
    if (action !== 'delete') {
      await offlineDB.markEstimateSynced(data.estimateId);
    }
  }

  /**
   * Sync Salesforce data
   */
  private async syncSalesforceData(action: string, data: any): Promise<void> {
    const endpoint = '/api/salesforce/sync';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Request': 'true'
      },
      body: JSON.stringify({
        action,
        ...data
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Salesforce sync failed (${response.status}): ${errorText}`);
    }

    // Mark Salesforce update as synced
    if (data.updateId) {
      await offlineDB.markSalesforceUpdateSynced(data.updateId);
    }
  }

  /**
   * Sync photo uploads
   */
  private async syncPhoto(action: string, data: any): Promise<void> {
    if (action !== 'create') {
      throw new Error(`Photo sync action ${action} not supported`);
    }

    const photo = await offlineDB.getPhoto(data.photoId);
    if (!photo) {
      throw new Error(`Photo ${data.photoId} not found in offline storage`);
    }

    // Prepare form data
    const formData = new FormData();
    formData.append('photo', photo.blob, photo.metadata.filename);
    formData.append('estimateId', photo.metadata.estimateId);
    formData.append('tags', JSON.stringify(photo.metadata.tags));
    formData.append('timestamp', photo.metadata.timestamp.toISOString());

    if (photo.metadata.location) {
      formData.append('location', JSON.stringify(photo.metadata.location));
    }

    const response = await fetch('/api/companycam/upload', {
      method: 'POST',
      headers: {
        'X-Sync-Request': 'true'
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Photo sync failed (${response.status}): ${errorText}`);
    }

    // Mark photo as synced
    await offlineDB.markPhotoSynced(data.photoId);
  }

  /**
   * Sync calculation results (cache warming)
   */
  private async syncCalculation(action: string, data: any): Promise<void> {
    if (action !== 'create') {
      return; // Only sync new calculations for cache warming
    }

    const response = await fetch('/api/calculations/cache', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Request': 'true'
      },
      body: JSON.stringify({
        calculationId: data.calculationId,
        input: data.input,
        result: data.result
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Calculation sync failed (${response.status}): ${errorText}`);
    }
  }

  /**
   * Force immediate sync
   */
  async forceSync(): Promise<SyncResult> {
    if (!navigator.onLine) {
      throw new Error('Cannot sync while offline');
    }

    return await this.performSync();
  }

  /**
   * Add item to sync queue
   */
  async queueSync(
    type: SyncQueue['type'],
    action: SyncQueue['action'],
    data: any,
    priority: number = 5
  ): Promise<void> {
    await offlineDB.addToSyncQueue(type, action, data, priority);

    // Trigger immediate sync if online and not already syncing
    if (navigator.onLine && !this.syncInProgress) {
      setTimeout(() => this.performSync().catch(console.error), 1000);
    }
  }

  /**
   * Get sync queue status
   */
  async getSyncStatus(): Promise<{
    pendingItems: number;
    inProgress: boolean;
    lastSync: Date | null;
  }> {
    const pendingItems = await offlineDB.syncQueue.count();

    return {
      pendingItems,
      inProgress: this.syncInProgress,
      lastSync: null // This would come from a separate status tracking
    };
  }

  /**
   * Clear failed sync items
   */
  async clearFailedSyncs(): Promise<number> {
    const failedItems = await offlineDB.syncQueue
      .where('attempts')
      .aboveOrEqual(3)
      .toArray();

    await offlineDB.syncQueue
      .where('attempts')
      .aboveOrEqual(3)
      .delete();

    return failedItems.length;
  }

  /**
   * Retry failed sync items
   */
  async retryFailedSyncs(): Promise<void> {
    await offlineDB.syncQueue
      .where('attempts')
      .above(0)
      .modify({
        attempts: 0,
        nextRetry: new Date()
      });

    // Trigger sync if online
    if (navigator.onLine && !this.syncInProgress) {
      setTimeout(() => this.performSync().catch(console.error), 1000);
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
}

// Export singleton instance
export const syncService = new SyncService();

// Export types
export type { SyncQueue };

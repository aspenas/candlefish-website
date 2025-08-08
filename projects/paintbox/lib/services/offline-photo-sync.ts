/**
 * Offline Photo Sync Service
 * Handles offline photo storage and synchronization with Company Cam
 */

import { companyCamApi, type CompanyCamPhoto, type CompanyCamProject } from './companycam-api';
import { logger } from '@/lib/logging/simple-logger';
import { openDB, IDBPDatabase } from 'idb';

interface OfflinePhoto extends CompanyCamPhoto {
  project_id: string;
  local_file?: File;
  sync_status: 'pending' | 'syncing' | 'synced' | 'failed';
  sync_attempts: number;
  last_sync_attempt?: string;
  error_message?: string;
}

interface SyncQueueItem {
  id: string;
  project_id: string;
  photo_id: string;
  file_data: string; // base64
  file_name: string;
  file_type: string;
  file_size: number;
  tags: string[];
  description?: string;
  created_at: string;
  priority: number; // 1 = high, 3 = low
}

export class OfflinePhotoSyncService {
  private db: IDBPDatabase | null = null;
  private syncInterval: NodeJS.Timeout | null = null;
  private isOnline = navigator.onlineStatus || true;
  private syncInProgress = false;
  private maxRetries = 3;

  constructor() {
    this.initializeService();
    this.setupNetworkListeners();
  }

  private async initializeService(): Promise<void> {
    try {
      await this.initOfflineDB();
      await this.startPeriodicSync();
      logger.info('Offline photo sync service initialized');
    } catch (error) {
      logger.error('Failed to initialize offline photo sync service', { error });
    }
  }

  private async initOfflineDB(): Promise<void> {
    try {
      this.db = await openDB('offline-photo-sync', 2, {
        upgrade(db, oldVersion) {
          // Offline photos store
          if (!db.objectStoreNames.contains('offline_photos')) {
            const photoStore = db.createObjectStore('offline_photos', { keyPath: 'id' });
            photoStore.createIndex('project_id', 'project_id');
            photoStore.createIndex('sync_status', 'sync_status');
            photoStore.createIndex('created_at', 'created_at');
          }

          // Sync queue store
          if (!db.objectStoreNames.contains('sync_queue')) {
            const queueStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
            queueStore.createIndex('project_id', 'project_id');
            queueStore.createIndex('priority', 'priority');
            queueStore.createIndex('created_at', 'created_at');
          }

          // Failed uploads store for retry logic
          if (!db.objectStoreNames.contains('failed_uploads')) {
            const failedStore = db.createObjectStore('failed_uploads', { keyPath: 'id' });
            failedStore.createIndex('last_attempt', 'last_sync_attempt');
            failedStore.createIndex('attempts', 'sync_attempts');
          }

          // Sync statistics
          if (!db.objectStoreNames.contains('sync_stats')) {
            const statsStore = db.createObjectStore('sync_stats', { keyPath: 'date' });
          }
        }
      });
    } catch (error) {
      logger.error('Failed to initialize offline photo sync database', { error });
    }
  }

  private setupNetworkListeners(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        logger.info('Network came online - triggering sync');
        this.triggerSync();
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
        logger.warn('Network went offline - photos will be queued');
      });
    }
  }

  // Photo Storage Methods
  async storePhotoOffline(
    projectId: string,
    file: File,
    options?: {
      tags?: string[];
      description?: string;
      priority?: number;
    }
  ): Promise<OfflinePhoto> {
    if (!this.db) throw new Error('Database not initialized');

    const photoId = `offline_photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const base64Data = await this.fileToBase64(file);

    const offlinePhoto: OfflinePhoto = {
      id: photoId,
      project_id: projectId,
      uri: base64Data, // Store base64 data temporarily
      created_at: new Date().toISOString(),
      tags: options?.tags || [],
      annotations: [],
      sync_status: 'pending',
      sync_attempts: 0,
      metadata: {
        size: file.size,
        format: file.type,
        uploader: 'paintbox-offline'
      }
    };

    // Store in offline photos
    await this.db.put('offline_photos', offlinePhoto);

    // Add to sync queue
    const queueItem: SyncQueueItem = {
      id: `queue_${photoId}`,
      project_id: projectId,
      photo_id: photoId,
      file_data: base64Data,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      tags: options?.tags || [],
      description: options?.description,
      created_at: new Date().toISOString(),
      priority: options?.priority || 2
    };

    await this.db.put('sync_queue', queueItem);

    logger.info('Photo stored offline', { photoId, projectId, size: file.size });

    // Trigger sync if online
    if (this.isOnline) {
      this.triggerSync();
    }

    return offlinePhoto;
  }

  async getOfflinePhotos(projectId?: string): Promise<OfflinePhoto[]> {
    if (!this.db) return [];

    try {
      if (projectId) {
        const tx = this.db.transaction('offline_photos', 'readonly');
        const index = tx.store.index('project_id');
        return await index.getAll(projectId);
      } else {
        return await this.db.getAll('offline_photos');
      }
    } catch (error) {
      logger.error('Failed to get offline photos', { error, projectId });
      return [];
    }
  }

  async getPhotoSyncStatus(photoId: string): Promise<OfflinePhoto | null> {
    if (!this.db) return null;

    try {
      return await this.db.get('offline_photos', photoId) || null;
    } catch (error) {
      logger.error('Failed to get photo sync status', { error, photoId });
      return null;
    }
  }

  // Sync Methods
  async triggerSync(): Promise<void> {
    if (!this.isOnline || this.syncInProgress) {
      return;
    }

    this.syncInProgress = true;

    try {
      await this.performSync();
    } finally {
      this.syncInProgress = false;
    }
  }

  private async performSync(): Promise<void> {
    if (!this.db) return;

    logger.info('Starting offline photo sync');

    const startTime = Date.now();
    let successCount = 0;
    let failureCount = 0;

    try {
      // Get sync queue ordered by priority and creation time
      const tx = this.db.transaction('sync_queue', 'readonly');
      const index = tx.store.index('priority');
      const queueItems = await index.getAll();

      // Sort by priority (ascending) then by creation time
      queueItems.sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      for (const item of queueItems) {
        try {
          await this.syncQueueItem(item);
          successCount++;
        } catch (error) {
          logger.error('Failed to sync queue item', { item, error });
          failureCount++;
        }
      }

      // Record sync statistics
      await this.recordSyncStats(startTime, successCount, failureCount);

      logger.info('Offline photo sync completed', {
        duration: Date.now() - startTime,
        success: successCount,
        failures: failureCount
      });

    } catch (error) {
      logger.error('Sync operation failed', { error });
    }
  }

  private async syncQueueItem(item: SyncQueueItem): Promise<void> {
    if (!this.db) return;

    try {
      // Convert base64 back to File
      const response = await fetch(item.file_data);
      const blob = await response.blob();
      const file = new File([blob], item.file_name, { type: item.file_type });

      // Upload to Company Cam
      const uploadedPhoto = await companyCamApi.uploadPhoto(item.project_id, file, {
        tags: item.tags,
        description: item.description,
        autoTag: true
      });

      // Update offline photo status
      const offlinePhoto = await this.db.get('offline_photos', item.photo_id);
      if (offlinePhoto) {
        offlinePhoto.sync_status = 'synced';
        offlinePhoto.uri = uploadedPhoto.uri; // Update with server URI
        offlinePhoto.id = uploadedPhoto.id; // Update with server ID
        await this.db.put('offline_photos', offlinePhoto);
      }

      // Remove from sync queue
      await this.db.delete('sync_queue', item.id);

      logger.info('Successfully synced photo', {
        photoId: item.photo_id,
        projectId: item.project_id,
        uploadedId: uploadedPhoto.id
      });

    } catch (error) {
      // Handle sync failure
      await this.handleSyncFailure(item, error as Error);
    }
  }

  private async handleSyncFailure(item: SyncQueueItem, error: Error): Promise<void> {
    if (!this.db) return;

    // Update offline photo with error
    const offlinePhoto = await this.db.get('offline_photos', item.photo_id);
    if (offlinePhoto) {
      offlinePhoto.sync_attempts += 1;
      offlinePhoto.last_sync_attempt = new Date().toISOString();
      offlinePhoto.error_message = error.message;

      if (offlinePhoto.sync_attempts >= this.maxRetries) {
        offlinePhoto.sync_status = 'failed';
        // Move to failed uploads for manual retry
        await this.db.put('failed_uploads', {
          ...offlinePhoto,
          original_queue_item: item
        });
        // Remove from sync queue
        await this.db.delete('sync_queue', item.id);
      } else {
        offlinePhoto.sync_status = 'pending';
        // Update priority for retry (lower priority)
        const updatedItem = { ...item, priority: Math.min(item.priority + 1, 3) };
        await this.db.put('sync_queue', updatedItem);
      }

      await this.db.put('offline_photos', offlinePhoto);
    }

    logger.warn('Sync failed for photo', {
      photoId: item.photo_id,
      attempts: offlinePhoto?.sync_attempts,
      error: error.message
    });
  }

  private async recordSyncStats(startTime: number, success: number, failures: number): Promise<void> {
    if (!this.db) return;

    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const duration = Date.now() - startTime;

    const existingStats = await this.db.get('sync_stats', date);
    const stats = existingStats || {
      date,
      syncs: 0,
      total_photos: 0,
      successful_photos: 0,
      failed_photos: 0,
      total_duration: 0
    };

    stats.syncs += 1;
    stats.total_photos += (success + failures);
    stats.successful_photos += success;
    stats.failed_photos += failures;
    stats.total_duration += duration;

    await this.db.put('sync_stats', stats);
  }

  // Management Methods
  async retryFailedUploads(): Promise<{ success: number; failed: number }> {
    if (!this.db) return { success: 0, failed: 0 };

    const failedUploads = await this.db.getAll('failed_uploads');
    let success = 0;
    let failed = 0;

    for (const failedUpload of failedUploads) {
      try {
        // Reset sync attempts and move back to queue
        const queueItem: SyncQueueItem = failedUpload.original_queue_item;
        queueItem.priority = 1; // High priority for retry

        await this.db.put('sync_queue', queueItem);
        await this.db.delete('failed_uploads', failedUpload.id);

        // Update photo status
        const offlinePhoto = await this.db.get('offline_photos', failedUpload.id);
        if (offlinePhoto) {
          offlinePhoto.sync_status = 'pending';
          offlinePhoto.sync_attempts = 0;
          offlinePhoto.error_message = undefined;
          await this.db.put('offline_photos', offlinePhoto);
        }

        success++;
      } catch (error) {
        logger.error('Failed to retry upload', { failedUpload, error });
        failed++;
      }
    }

    if (success > 0) {
      this.triggerSync();
    }

    return { success, failed };
  }

  async clearSyncedPhotos(olderThanDays: number = 7): Promise<number> {
    if (!this.db) return 0;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const tx = this.db.transaction('offline_photos', 'readwrite');
    const syncedPhotos = await tx.store.index('sync_status').getAll('synced');

    let deletedCount = 0;
    for (const photo of syncedPhotos) {
      const photoDate = new Date(photo.created_at);
      if (photoDate < cutoffDate) {
        await tx.store.delete(photo.id);
        deletedCount++;
      }
    }

    await tx.done;

    logger.info(`Cleared ${deletedCount} synced photos older than ${olderThanDays} days`);
    return deletedCount;
  }

  async getSyncStatistics(): Promise<{
    totalPhotos: number;
    pendingPhotos: number;
    syncedPhotos: number;
    failedPhotos: number;
    queueSize: number;
    storageUsed: number; // Estimated in MB
  }> {
    if (!this.db) {
      return {
        totalPhotos: 0,
        pendingPhotos: 0,
        syncedPhotos: 0,
        failedPhotos: 0,
        queueSize: 0,
        storageUsed: 0
      };
    }

    const [photos, queue] = await Promise.all([
      this.db.getAll('offline_photos'),
      this.db.getAll('sync_queue')
    ]);

    const pending = photos.filter(p => p.sync_status === 'pending').length;
    const synced = photos.filter(p => p.sync_status === 'synced').length;
    const failed = photos.filter(p => p.sync_status === 'failed').length;

    // Estimate storage usage
    const storageUsed = photos.reduce((total, photo) => {
      return total + (photo.metadata?.size || 0);
    }, 0) / (1024 * 1024); // Convert to MB

    return {
      totalPhotos: photos.length,
      pendingPhotos: pending,
      syncedPhotos: synced,
      failedPhotos: failed,
      queueSize: queue.length,
      storageUsed: Math.round(storageUsed * 100) / 100
    };
  }

  // Periodic sync management
  private async startPeriodicSync(): Promise<void> {
    // Stop existing interval
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Start new interval (every 2 minutes)
    this.syncInterval = setInterval(async () => {
      if (this.isOnline) {
        await this.triggerSync();
      }
    }, 2 * 60 * 1000);

    logger.info('Started periodic sync (every 2 minutes)');
  }

  public stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      logger.info('Stopped periodic sync');
    }
  }

  // Utility methods
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Cleanup
  async cleanup(): Promise<void> {
    this.stopPeriodicSync();

    if (this.db) {
      this.db.close();
      this.db = null;
    }

    logger.info('Offline photo sync service cleaned up');
  }
}

// Singleton instance
export const offlinePhotoSync = new OfflinePhotoSyncService();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    offlinePhotoSync.cleanup();
  });
}

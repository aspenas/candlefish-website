import Dexie, { Table } from 'dexie';

// Database interfaces
export interface OfflineEstimate {
  id?: number;
  estimateId: string;
  data: any;
  syncStatus: 'pending' | 'synced' | 'error';
  createdAt: Date;
  updatedAt: Date;
  lastSyncAttempt?: Date;
  syncError?: string;
}

export interface OfflineSalesforceUpdate {
  id?: number;
  updateId: string;
  objectType: string;
  data: any;
  syncStatus: 'pending' | 'synced' | 'error';
  createdAt: Date;
  updatedAt: Date;
  lastSyncAttempt?: Date;
  syncError?: string;
}

export interface OfflinePhoto {
  id?: number;
  photoId: string;
  blob: Blob;
  metadata: {
    filename: string;
    estimateId: string;
    projectId?: string;
    tags: string[];
    timestamp: Date;
    location?: {
      latitude: number;
      longitude: number;
    };
  };
  syncStatus: 'pending' | 'synced' | 'error';
  createdAt: Date;
  updatedAt: Date;
  lastSyncAttempt?: Date;
  syncError?: string;
}

export interface CachedCustomer {
  id?: number;
  customerId: string;
  data: any;
  cachedAt: Date;
  expiresAt: Date;
}

export interface CachedCalculation {
  id?: number;
  calculationId: string;
  input: any;
  result: any;
  cachedAt: Date;
  expiresAt: Date;
}

export interface SyncQueue {
  id?: number;
  type: 'estimate' | 'salesforce' | 'photo' | 'calculation';
  action: 'create' | 'update' | 'delete';
  data: any;
  priority: number;
  attempts: number;
  maxAttempts: number;
  nextRetry: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppSettings {
  id?: number;
  key: string;
  value: any;
  updatedAt: Date;
}

// Dexie database class
class PaintboxOfflineDB extends Dexie {
  estimates!: Table<OfflineEstimate>;
  salesforceUpdates!: Table<OfflineSalesforceUpdate>;
  photos!: Table<OfflinePhoto>;
  customers!: Table<CachedCustomer>;
  calculations!: Table<CachedCalculation>;
  syncQueue!: Table<SyncQueue>;
  settings!: Table<AppSettings>;

  constructor() {
    super('PaintboxOfflineDB');

    this.version(1).stores({
      estimates: '++id, estimateId, syncStatus, createdAt, updatedAt',
      salesforceUpdates: '++id, updateId, objectType, syncStatus, createdAt, updatedAt',
      photos: '++id, photoId, syncStatus, createdAt, updatedAt',
      customers: '++id, customerId, cachedAt, expiresAt',
      calculations: '++id, calculationId, cachedAt, expiresAt',
      syncQueue: '++id, type, priority, nextRetry, createdAt',
      settings: '++id, key, updatedAt'
    });

    // Add hooks for automatic timestamps
    this.estimates.hook('creating', (primKey, obj, trans) => {
      obj.createdAt = new Date();
      obj.updatedAt = new Date();
    });

    this.estimates.hook('updating', (modifications, primKey, obj, trans) => {
      modifications.updatedAt = new Date();
    });

    this.salesforceUpdates.hook('creating', (primKey, obj, trans) => {
      obj.createdAt = new Date();
      obj.updatedAt = new Date();
    });

    this.salesforceUpdates.hook('updating', (modifications, primKey, obj, trans) => {
      modifications.updatedAt = new Date();
    });

    this.photos.hook('creating', (primKey, obj, trans) => {
      obj.createdAt = new Date();
      obj.updatedAt = new Date();
    });

    this.photos.hook('updating', (modifications, primKey, obj, trans) => {
      modifications.updatedAt = new Date();
    });

    this.syncQueue.hook('creating', (primKey, obj, trans) => {
      obj.createdAt = new Date();
      obj.updatedAt = new Date();
    });

    this.syncQueue.hook('updating', (modifications, primKey, obj, trans) => {
      modifications.updatedAt = new Date();
    });

    this.settings.hook('creating', (primKey, obj, trans) => {
      obj.updatedAt = new Date();
    });

    this.settings.hook('updating', (modifications, primKey, obj, trans) => {
      modifications.updatedAt = new Date();
    });
  }

  // Estimate operations
  async saveEstimate(estimateId: string, data: any): Promise<void> {
    const existing = await this.estimates.where('estimateId').equals(estimateId).first();

    if (existing) {
      await this.estimates.update(existing.id!, {
        data,
        syncStatus: 'pending',
        updatedAt: new Date()
      });
    } else {
      await this.estimates.add({
        estimateId,
        data,
        syncStatus: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  }

  async getEstimate(estimateId: string): Promise<OfflineEstimate | undefined> {
    return await this.estimates.where('estimateId').equals(estimateId).first();
  }

  async getAllEstimates(): Promise<OfflineEstimate[]> {
    return await this.estimates.orderBy('updatedAt').reverse().toArray();
  }

  async getPendingEstimates(): Promise<OfflineEstimate[]> {
    return await this.estimates.where('syncStatus').equals('pending').toArray();
  }

  async markEstimateSynced(estimateId: string): Promise<void> {
    await this.estimates.where('estimateId').equals(estimateId).modify({
      syncStatus: 'synced',
      updatedAt: new Date()
    });
  }

  async markEstimateError(estimateId: string, error: string): Promise<void> {
    await this.estimates.where('estimateId').equals(estimateId).modify({
      syncStatus: 'error',
      syncError: error,
      lastSyncAttempt: new Date(),
      updatedAt: new Date()
    });
  }

  // Salesforce operations
  async saveSalesforceUpdate(updateId: string, objectType: string, data: any): Promise<void> {
    await this.salesforceUpdates.add({
      updateId,
      objectType,
      data,
      syncStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  async getPendingSalesforceUpdates(): Promise<OfflineSalesforceUpdate[]> {
    return await this.salesforceUpdates.where('syncStatus').equals('pending').toArray();
  }

  async markSalesforceUpdateSynced(updateId: string): Promise<void> {
    await this.salesforceUpdates.where('updateId').equals(updateId).modify({
      syncStatus: 'synced',
      updatedAt: new Date()
    });
  }

  // Photo operations
  async savePhoto(photoId: string, blob: Blob, metadata: OfflinePhoto['metadata']): Promise<void> {
    await this.photos.add({
      photoId,
      blob,
      metadata,
      syncStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  async getPhoto(photoId: string): Promise<OfflinePhoto | undefined> {
    return await this.photos.where('photoId').equals(photoId).first();
  }

  async getPhotosForEstimate(estimateId: string): Promise<OfflinePhoto[]> {
    return await this.photos.where('metadata.estimateId').equals(estimateId).toArray();
  }

  async getPendingPhotos(): Promise<OfflinePhoto[]> {
    return await this.photos.where('syncStatus').equals('pending').toArray();
  }

  async markPhotoSynced(photoId: string): Promise<void> {
    await this.photos.where('photoId').equals(photoId).modify({
      syncStatus: 'synced',
      updatedAt: new Date()
    });
  }

  // Customer cache operations
  async cacheCustomer(customerId: string, data: any, ttlMinutes: number = 60): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + ttlMinutes);

    await this.customers.put({
      customerId,
      data,
      cachedAt: new Date(),
      expiresAt
    });
  }

  async getCachedCustomer(customerId: string): Promise<CachedCustomer | undefined> {
    const cached = await this.customers.where('customerId').equals(customerId).first();

    if (cached && cached.expiresAt > new Date()) {
      return cached;
    }

    if (cached) {
      // Clean up expired cache
      await this.customers.delete(cached.id!);
    }

    return undefined;
  }

  // Calculation cache operations
  async cacheCalculation(calculationId: string, input: any, result: any, ttlMinutes: number = 30): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + ttlMinutes);

    await this.calculations.put({
      calculationId,
      input,
      result,
      cachedAt: new Date(),
      expiresAt
    });
  }

  async getCachedCalculation(calculationId: string): Promise<CachedCalculation | undefined> {
    const cached = await this.calculations.where('calculationId').equals(calculationId).first();

    if (cached && cached.expiresAt > new Date()) {
      return cached;
    }

    if (cached) {
      await this.calculations.delete(cached.id!);
    }

    return undefined;
  }

  // Sync queue operations
  async addToSyncQueue(
    type: SyncQueue['type'],
    action: SyncQueue['action'],
    data: any,
    priority: number = 5
  ): Promise<void> {
    await this.syncQueue.add({
      type,
      action,
      data,
      priority,
      attempts: 0,
      maxAttempts: 3,
      nextRetry: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  async getNextSyncItems(limit: number = 10): Promise<SyncQueue[]> {
    const now = new Date();
    return await this.syncQueue
      .where('nextRetry')
      .belowOrEqual(now)
      .and(item => item.attempts < item.maxAttempts)
      .orderBy('priority')
      .reverse()
      .limit(limit)
      .toArray();
  }

  async incrementSyncAttempts(id: number, nextRetryMinutes: number = 5): Promise<void> {
    const nextRetry = new Date();
    nextRetry.setMinutes(nextRetry.getMinutes() + nextRetryMinutes);

    await this.syncQueue.update(id, {
      attempts: (await this.syncQueue.get(id))!.attempts + 1,
      nextRetry,
      updatedAt: new Date()
    });
  }

  async removeSyncItem(id: number): Promise<void> {
    await this.syncQueue.delete(id);
  }

  // Settings operations
  async setSetting(key: string, value: any): Promise<void> {
    const existing = await this.settings.where('key').equals(key).first();

    if (existing) {
      await this.settings.update(existing.id!, {
        value,
        updatedAt: new Date()
      });
    } else {
      await this.settings.add({
        key,
        value,
        updatedAt: new Date()
      });
    }
  }

  async getSetting(key: string): Promise<any> {
    const setting = await this.settings.where('key').equals(key).first();
    return setting?.value;
  }

  // Cleanup operations
  async cleanupExpiredData(): Promise<void> {
    const now = new Date();

    // Clean expired customer cache
    await this.customers.where('expiresAt').below(now).delete();

    // Clean expired calculation cache
    await this.calculations.where('expiresAt').below(now).delete();

    // Clean old synced estimates (keep for 30 days)
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);

    await this.estimates
      .where('syncStatus')
      .equals('synced')
      .and(estimate => estimate.updatedAt < monthAgo)
      .delete();

    // Clean old synced photos (keep for 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    await this.photos
      .where('syncStatus')
      .equals('synced')
      .and(photo => photo.updatedAt < weekAgo)
      .delete();

    // Remove failed sync queue items that exceeded max attempts
    await this.syncQueue
      .where('attempts')
      .aboveOrEqual(3)
      .delete();
  }

  // Database management
  async getDatabaseStats(): Promise<{
    estimates: number;
    salesforceUpdates: number;
    photos: number;
    customers: number;
    calculations: number;
    syncQueue: number;
    pendingSync: number;
  }> {
    const [estimates, salesforceUpdates, photos, customers, calculations, syncQueue] = await Promise.all([
      this.estimates.count(),
      this.salesforceUpdates.count(),
      this.photos.count(),
      this.customers.count(),
      this.calculations.count(),
      this.syncQueue.count()
    ]);

    const pendingSync = await this.syncQueue.where('attempts').below(3).count();

    return {
      estimates,
      salesforceUpdates,
      photos,
      customers,
      calculations,
      syncQueue,
      pendingSync
    };
  }

  async clearAllData(): Promise<void> {
    await Promise.all([
      this.estimates.clear(),
      this.salesforceUpdates.clear(),
      this.photos.clear(),
      this.customers.clear(),
      this.calculations.clear(),
      this.syncQueue.clear()
    ]);
  }
}

// Create and export database instance
export const offlineDB = new PaintboxOfflineDB();

// Initialize database and handle errors
offlineDB.ready().catch(error => {
  console.error('Failed to initialize offline database:', error);
});

// Export type helpers
export type { PaintboxOfflineDB };
export default offlineDB;

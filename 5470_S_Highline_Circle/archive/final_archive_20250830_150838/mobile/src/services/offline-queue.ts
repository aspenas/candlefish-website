import AsyncStorage from '@react-native-async-storage/async-storage';
import { OfflineAction, CacheEntry } from '../types';

class OfflineQueueService {
  private static instance: OfflineQueueService;
  private queue: OfflineAction[] = [];
  private cache: Map<string, CacheEntry<any>> = new Map();
  private isProcessing = false;
  private syncListeners: Array<(status: any) => void> = [];

  private constructor() {}

  static getInstance(): OfflineQueueService {
    if (!OfflineQueueService.instance) {
      OfflineQueueService.instance = new OfflineQueueService();
    }
    return OfflineQueueService.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Load queue from storage
      const queueData = await AsyncStorage.getItem('@offline_queue');
      if (queueData) {
        this.queue = JSON.parse(queueData);
      }

      // Load cache from storage
      const cacheData = await AsyncStorage.getItem('@offline_cache');
      if (cacheData) {
        const cacheArray = JSON.parse(cacheData);
        this.cache = new Map(cacheArray);
      }

      console.log(`Offline queue initialized with ${this.queue.length} items`);
    } catch (error) {
      console.error('Failed to initialize offline queue:', error);
    }
  }

  async addToQueue(action: Omit<OfflineAction, 'id' | 'attempts' | 'maxAttempts'>): Promise<void> {
    const queueItem: OfflineAction = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      attempts: 0,
      maxAttempts: 3,
      ...action,
    };

    this.queue.push(queueItem);
    await this.saveQueue();
    
    console.log(`Added to offline queue: ${action.type} ${action.entity}`);
    this.notifyListeners();
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    console.log(`Processing offline queue with ${this.queue.length} items`);

    const itemsToProcess = [...this.queue];
    const processedItems: string[] = [];
    const failedItems: OfflineAction[] = [];

    for (const item of itemsToProcess) {
      try {
        await this.processQueueItem(item);
        processedItems.push(item.id);
        console.log(`Successfully processed: ${item.type} ${item.entity}`);
      } catch (error) {
        console.error(`Failed to process queue item ${item.id}:`, error);
        
        item.attempts++;
        item.error = error instanceof Error ? error.message : String(error);
        
        if (item.attempts < item.maxAttempts) {
          failedItems.push(item);
        } else {
          console.error(`Max attempts reached for queue item ${item.id}, removing from queue`);
          processedItems.push(item.id); // Remove from queue
        }
      }
    }

    // Update queue
    this.queue = this.queue.filter(item => !processedItems.includes(item.id));
    this.queue.push(...failedItems);
    
    await this.saveQueue();
    this.isProcessing = false;
    this.notifyListeners();

    if (processedItems.length > 0) {
      console.log(`Processed ${processedItems.length} items from offline queue`);
    }
  }

  private async processQueueItem(item: OfflineAction): Promise<void> {
    // This would integrate with your GraphQL client or API service
    switch (item.entity) {
      case 'item':
        if (item.type === 'CREATE') {
          // await apiService.createItem(item.data);
          console.log('Would create item:', item.data);
        } else if (item.type === 'UPDATE') {
          // await apiService.updateItem(item.data.id, item.data);
          console.log('Would update item:', item.data);
        }
        break;
        
      case 'valuation':
        if (item.type === 'CREATE') {
          // await apiService.createValuation(item.data);
          console.log('Would create valuation:', item.data);
        }
        break;
        
      case 'image':
        if (item.type === 'CREATE') {
          // await apiService.uploadImage(item.data);
          console.log('Would upload image:', item.data);
        }
        break;
        
      default:
        throw new Error(`Unknown entity type: ${item.entity}`);
    }
  }

  async addToCache<T>(key: string, data: T, expiresIn?: number): Promise<void> {
    const entry: CacheEntry<T> = {
      key,
      data,
      timestamp: new Date(),
      expiresAt: expiresIn ? new Date(Date.now() + expiresIn) : undefined,
    };

    this.cache.set(key, entry);
    await this.saveCache();
  }

  getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (entry.expiresAt && entry.expiresAt < new Date()) {
      this.cache.delete(key);
      this.saveCache(); // Fire and forget
      return null;
    }

    return entry.data as T;
  }

  async removeFromCache(key: string): Promise<void> {
    this.cache.delete(key);
    await this.saveCache();
  }

  async clearCache(): Promise<void> {
    this.cache.clear();
    await this.saveCache();
  }

  getQueueStatus() {
    return {
      pendingCount: this.queue.length,
      processingCount: this.queue.filter(item => item.attempts > 0).length,
      isProcessing: this.isProcessing,
      cacheSize: this.cache.size,
    };
  }

  addSyncListener(callback: (status: any) => void) {
    this.syncListeners.push(callback);
  }

  removeSyncListener(callback: (status: any) => void) {
    this.syncListeners = this.syncListeners.filter(listener => listener !== callback);
  }

  private notifyListeners() {
    const status = this.getQueueStatus();
    this.syncListeners.forEach(listener => listener(status));
  }

  private async saveQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem('@offline_queue', JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  private async saveCache(): Promise<void> {
    try {
      const cacheArray = Array.from(this.cache.entries());
      await AsyncStorage.setItem('@offline_cache', JSON.stringify(cacheArray));
    } catch (error) {
      console.error('Failed to save cache:', error);
    }
  }

  // Debug methods
  async clearAll(): Promise<void> {
    this.queue = [];
    this.cache.clear();
    await Promise.all([
      AsyncStorage.removeItem('@offline_queue'),
      AsyncStorage.removeItem('@offline_cache'),
    ]);
    this.notifyListeners();
  }

  getQueue(): OfflineAction[] {
    return [...this.queue];
  }

  getCacheEntries(): CacheEntry<any>[] {
    return Array.from(this.cache.values());
  }
}

// Export singleton instance
export const OfflineQueueService = OfflineQueueService.getInstance();

// Static methods for convenience
export const offlineQueue = {
  initialize: () => OfflineQueueService.initialize(),
  addToQueue: (action: Omit<OfflineAction, 'id' | 'attempts' | 'maxAttempts'>) => 
    OfflineQueueService.addToQueue(action),
  processQueue: () => OfflineQueueService.processQueue(),
  addToCache: <T>(key: string, data: T, expiresIn?: number) => 
    OfflineQueueService.addToCache(key, data, expiresIn),
  getFromCache: <T>(key: string) => OfflineQueueService.getFromCache<T>(key),
  getStatus: () => OfflineQueueService.getQueueStatus(),
  addListener: (callback: (status: any) => void) => OfflineQueueService.addSyncListener(callback),
  removeListener: (callback: (status: any) => void) => OfflineQueueService.removeSyncListener(callback),
};
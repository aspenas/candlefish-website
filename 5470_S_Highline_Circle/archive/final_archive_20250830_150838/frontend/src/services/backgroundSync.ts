// Background Sync Service for PWA
import { pushNotificationService } from './pushNotifications';

export interface SyncTask {
  id: string;
  type: 'photo-upload' | 'inventory-update' | 'item-create' | 'item-delete' | 'valuation-request';
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
}

export interface OfflinePhoto {
  id: string;
  itemId: string;
  file: File;
  angle: string;
  metadata: any;
  timestamp: string;
  synced: boolean;
  retryCount: number;
}

export interface OfflineData {
  id: string;
  type: string;
  data: any;
  action: 'create' | 'update' | 'delete';
  timestamp: number;
  synced: boolean;
}

class BackgroundSyncService {
  private dbName = 'InventoryOfflineDB';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;
  private syncInProgress = false;
  private retryInterval = 30000; // 30 seconds
  private maxRetries = 5;
  private online = navigator.onLine;

  constructor() {
    this.init();
    this.setupEventListeners();
  }

  // Initialize IndexedDB
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('Background sync IndexedDB initialized');
        this.schedulePeriodicSync();
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('syncTasks')) {
          const syncStore = db.createObjectStore('syncTasks', { keyPath: 'id' });
          syncStore.createIndex('status', 'status', { unique: false });
          syncStore.createIndex('priority', 'priority', { unique: false });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('offlinePhotos')) {
          const photoStore = db.createObjectStore('offlinePhotos', { keyPath: 'id' });
          photoStore.createIndex('synced', 'synced', { unique: false });
          photoStore.createIndex('timestamp', 'timestamp', { unique: false });
          photoStore.createIndex('itemId', 'itemId', { unique: false });
        }

        if (!db.objectStoreNames.contains('offlineData')) {
          const dataStore = db.createObjectStore('offlineData', { keyPath: 'id' });
          dataStore.createIndex('synced', 'synced', { unique: false });
          dataStore.createIndex('type', 'type', { unique: false });
          dataStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        console.log('Background sync database schema updated');
      };
    });
  }

  // Setup event listeners
  private setupEventListeners(): void {
    // Online/offline status
    window.addEventListener('online', () => {
      this.online = true;
      console.log('Network back online - starting sync');
      this.syncAll();
    });

    window.addEventListener('offline', () => {
      this.online = false;
      console.log('Network offline - queuing operations');
    });

    // Visibility change (when app comes back to foreground)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.online) {
        this.syncAll();
      }
    });

    // Service worker registration for background sync
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then((registration) => {
        // Register background sync
        registration.sync.register('background-sync').catch((error) => {
          console.error('Background sync registration failed:', error);
        });
      });
    }
  }

  // Add sync task
  async addSyncTask(task: Omit<SyncTask, 'id' | 'timestamp' | 'retryCount' | 'status'>): Promise<string> {
    if (!this.db) await this.init();

    const syncTask: SyncTask = {
      id: this.generateId(),
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
      ...task
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncTasks'], 'readwrite');
      const store = transaction.objectStore('syncTasks');

      const request = store.add(syncTask);

      request.onsuccess = () => {
        console.log('Sync task added:', syncTask.id);
        
        // Try immediate sync if online
        if (this.online) {
          this.processSyncTask(syncTask);
        }
        
        resolve(syncTask.id);
      };

      request.onerror = () => {
        console.error('Failed to add sync task:', request.error);
        reject(request.error);
      };
    });
  }

  // Add offline photo
  async addOfflinePhoto(photo: Omit<OfflinePhoto, 'id' | 'synced' | 'retryCount'>): Promise<string> {
    if (!this.db) await this.init();

    const offlinePhoto: OfflinePhoto = {
      id: this.generateId(),
      synced: false,
      retryCount: 0,
      ...photo
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlinePhotos'], 'readwrite');
      const store = transaction.objectStore('offlinePhotos');

      const request = store.add(offlinePhoto);

      request.onsuccess = () => {
        console.log('Offline photo stored:', offlinePhoto.id);
        
        // Create sync task for photo upload
        this.addSyncTask({
          type: 'photo-upload',
          data: { photoId: offlinePhoto.id },
          priority: 'medium',
          maxRetries: this.maxRetries,
          endpoint: '/api/items/photos',
          method: 'POST'
        });

        resolve(offlinePhoto.id);
      };

      request.onerror = () => {
        console.error('Failed to store offline photo:', request.error);
        reject(request.error);
      };
    });
  }

  // Add offline data change
  async addOfflineData(data: Omit<OfflineData, 'id' | 'synced'>): Promise<string> {
    if (!this.db) await this.init();

    const offlineData: OfflineData = {
      id: this.generateId(),
      synced: false,
      ...data
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineData'], 'readwrite');
      const store = transaction.objectStore('offlineData');

      const request = store.add(offlineData);

      request.onsuccess = () => {
        console.log('Offline data stored:', offlineData.id);
        
        // Create sync task
        this.addSyncTask({
          type: 'inventory-update',
          data: { dataId: offlineData.id },
          priority: offlineData.action === 'delete' ? 'high' : 'medium',
          maxRetries: this.maxRetries,
          endpoint: this.getEndpointForData(offlineData),
          method: this.getMethodForAction(offlineData.action)
        });

        resolve(offlineData.id);
      };

      request.onerror = () => {
        console.error('Failed to store offline data:', request.error);
        reject(request.error);
      };
    });
  }

  // Sync all pending tasks
  async syncAll(): Promise<void> {
    if (this.syncInProgress || !this.online || !this.db) {
      return;
    }

    this.syncInProgress = true;
    console.log('Starting background sync...');

    try {
      const pendingTasks = await this.getPendingTasks();
      console.log(`Found ${pendingTasks.length} pending sync tasks`);

      // Sort by priority and timestamp
      const sortedTasks = pendingTasks.sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        return priorityDiff !== 0 ? priorityDiff : a.timestamp - b.timestamp;
      });

      let successCount = 0;
      let failureCount = 0;

      for (const task of sortedTasks) {
        try {
          await this.processSyncTask(task);
          successCount++;
        } catch (error) {
          console.error(`Sync task failed: ${task.id}`, error);
          failureCount++;
        }
      }

      if (successCount > 0) {
        pushNotificationService.notifyBackgroundSync(successCount);
      }

      console.log(`Background sync completed: ${successCount} succeeded, ${failureCount} failed`);

    } catch (error) {
      console.error('Background sync error:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  // Process individual sync task
  private async processSyncTask(task: SyncTask): Promise<void> {
    if (!this.db) return;

    // Update task status
    await this.updateTaskStatus(task.id, 'in-progress');

    try {
      let success = false;

      switch (task.type) {
        case 'photo-upload':
          success = await this.syncPhotoUpload(task);
          break;
        case 'inventory-update':
        case 'item-create':
        case 'item-delete':
          success = await this.syncDataChange(task);
          break;
        case 'valuation-request':
          success = await this.syncValuationRequest(task);
          break;
        default:
          console.warn('Unknown sync task type:', task.type);
          success = false;
      }

      if (success) {
        await this.updateTaskStatus(task.id, 'completed');
        await this.removeTask(task.id);
      } else {
        throw new Error('Sync operation failed');
      }

    } catch (error) {
      console.error(`Task ${task.id} failed:`, error);
      
      // Increment retry count
      const newRetryCount = task.retryCount + 1;
      
      if (newRetryCount >= task.maxRetries) {
        await this.updateTaskStatus(task.id, 'failed');
        console.error(`Task ${task.id} failed permanently after ${newRetryCount} attempts`);
      } else {
        await this.updateTaskRetryCount(task.id, newRetryCount);
        await this.updateTaskStatus(task.id, 'pending');
        
        // Schedule retry
        setTimeout(() => {
          this.processSyncTask({ ...task, retryCount: newRetryCount });
        }, this.retryInterval * Math.pow(2, newRetryCount)); // Exponential backoff
      }
    }
  }

  // Sync photo upload
  private async syncPhotoUpload(task: SyncTask): Promise<boolean> {
    const photo = await this.getOfflinePhoto(task.data.photoId);
    if (!photo) {
      console.error('Photo not found for sync:', task.data.photoId);
      return false;
    }

    const formData = new FormData();
    formData.append('photo', photo.file);
    formData.append('itemId', photo.itemId);
    formData.append('angle', photo.angle);
    formData.append('metadata', JSON.stringify(photo.metadata));

    const response = await fetch(task.endpoint, {
      method: task.method,
      body: formData
    });

    if (response.ok) {
      await this.markPhotoAsSynced(photo.id);
      pushNotificationService.notifyPhotoUpload(photo.itemId, 1);
      return true;
    }

    return false;
  }

  // Sync data change
  private async syncDataChange(task: SyncTask): Promise<boolean> {
    const data = await this.getOfflineData(task.data.dataId);
    if (!data) {
      console.error('Data not found for sync:', task.data.dataId);
      return false;
    }

    const body = task.method === 'DELETE' ? undefined : JSON.stringify(data.data);

    const response = await fetch(task.endpoint, {
      method: task.method,
      headers: {
        'Content-Type': 'application/json'
      },
      body
    });

    if (response.ok) {
      await this.markDataAsSynced(data.id);
      pushNotificationService.notifyInventoryUpdate(
        data.data.name || 'Item', 
        data.action === 'create' ? 'added' : data.action === 'update' ? 'updated' : 'deleted'
      );
      return true;
    }

    return false;
  }

  // Sync valuation request
  private async syncValuationRequest(task: SyncTask): Promise<boolean> {
    const response = await fetch(task.endpoint, {
      method: task.method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(task.data)
    });

    return response.ok;
  }

  // Utility methods
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private getEndpointForData(data: OfflineData): string {
    switch (data.type) {
      case 'item':
        return data.action === 'create' ? '/api/items' : `/api/items/${data.data.id}`;
      case 'valuation':
        return '/api/valuations';
      default:
        return '/api/items';
    }
  }

  private getMethodForAction(action: string): 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' {
    switch (action) {
      case 'create': return 'POST';
      case 'update': return 'PUT';
      case 'delete': return 'DELETE';
      default: return 'POST';
    }
  }

  // Database operations
  private async getPendingTasks(): Promise<SyncTask[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncTasks'], 'readonly');
      const store = transaction.objectStore('syncTasks');
      const index = store.index('status');

      const request = index.getAll('pending');

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async getOfflinePhoto(id: string): Promise<OfflinePhoto | null> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlinePhotos'], 'readonly');
      const store = transaction.objectStore('offlinePhotos');

      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  private async getOfflineData(id: string): Promise<OfflineData | null> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineData'], 'readonly');
      const store = transaction.objectStore('offlineData');

      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  private async updateTaskStatus(id: string, status: SyncTask['status']): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncTasks'], 'readwrite');
      const store = transaction.objectStore('syncTasks');

      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const task = getRequest.result;
        if (task) {
          task.status = status;
          const putRequest = store.put(task);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  private async updateTaskRetryCount(id: string, retryCount: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncTasks'], 'readwrite');
      const store = transaction.objectStore('syncTasks');

      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const task = getRequest.result;
        if (task) {
          task.retryCount = retryCount;
          const putRequest = store.put(task);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  private async removeTask(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncTasks'], 'readwrite');
      const store = transaction.objectStore('syncTasks');

      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async markPhotoAsSynced(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlinePhotos'], 'readwrite');
      const store = transaction.objectStore('offlinePhotos');

      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const photo = getRequest.result;
        if (photo) {
          photo.synced = true;
          const putRequest = store.put(photo);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  private async markDataAsSynced(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineData'], 'readwrite');
      const store = transaction.objectStore('offlineData');

      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const data = getRequest.result;
        if (data) {
          data.synced = true;
          const putRequest = store.put(data);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  private schedulePeriodicSync(): void {
    // Sync every 5 minutes when online
    setInterval(() => {
      if (this.online && !this.syncInProgress) {
        this.syncAll();
      }
    }, 5 * 60 * 1000);
  }

  // Public utility methods
  async getPendingCount(): Promise<number> {
    const tasks = await this.getPendingTasks();
    return tasks.length;
  }

  async clearSyncedData(): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['offlinePhotos', 'offlineData'], 'readwrite');
    
    // Clear synced photos
    const photoStore = transaction.objectStore('offlinePhotos');
    const photoIndex = photoStore.index('synced');
    const syncedPhotos = await new Promise<OfflinePhoto[]>((resolve, reject) => {
      const request = photoIndex.getAll(true);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    for (const photo of syncedPhotos) {
      photoStore.delete(photo.id);
    }

    // Clear synced data
    const dataStore = transaction.objectStore('offlineData');
    const dataIndex = dataStore.index('synced');
    const syncedData = await new Promise<OfflineData[]>((resolve, reject) => {
      const request = dataIndex.getAll(true);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    for (const data of syncedData) {
      dataStore.delete(data.id);
    }

    console.log('Cleared synced offline data');
  }
}

// Create singleton instance
export const backgroundSyncService = new BackgroundSyncService();

// React hook for background sync
export const useBackgroundSync = () => {
  const [pendingCount, setPendingCount] = React.useState(0);
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  React.useEffect(() => {
    const updatePendingCount = async () => {
      const count = await backgroundSyncService.getPendingCount();
      setPendingCount(count);
    };

    updatePendingCount();

    // Update count periodically
    const interval = setInterval(updatePendingCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const queuePhotoUpload = React.useCallback(async (photo: Omit<OfflinePhoto, 'id' | 'synced' | 'retryCount'>) => {
    await backgroundSyncService.addOfflinePhoto(photo);
    const count = await backgroundSyncService.getPendingCount();
    setPendingCount(count);
  }, []);

  const queueDataChange = React.useCallback(async (data: Omit<OfflineData, 'id' | 'synced'>) => {
    await backgroundSyncService.addOfflineData(data);
    const count = await backgroundSyncService.getPendingCount();
    setPendingCount(count);
  }, []);

  const syncNow = React.useCallback(async () => {
    if (isOnline) {
      await backgroundSyncService.syncAll();
      const count = await backgroundSyncService.getPendingCount();
      setPendingCount(count);
    }
  }, [isOnline]);

  return {
    pendingCount,
    isOnline,
    queuePhotoUpload,
    queueDataChange,
    syncNow
  };
};

export default backgroundSyncService;
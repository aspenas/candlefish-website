import { CapturedPhoto, PhotoSession, PhotoMetadata } from '../types';

// IndexedDB for offline photo storage
class PhotoStorage {
  private dbName = 'InventoryPhotos';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Photos store
        if (!db.objectStoreNames.contains('photos')) {
          const photosStore = db.createObjectStore('photos', { keyPath: 'id' });
          photosStore.createIndex('itemId', 'itemId', { unique: false });
          photosStore.createIndex('timestamp', 'timestamp', { unique: false });
          photosStore.createIndex('uploaded', 'uploaded', { unique: false });
        }

        // Sessions store
        if (!db.objectStoreNames.contains('sessions')) {
          const sessionsStore = db.createObjectStore('sessions', { keyPath: 'id' });
          sessionsStore.createIndex('status', 'status', { unique: false });
          sessionsStore.createIndex('lastSaveTime', 'lastSaveTime', { unique: false });
        }
      };
    });
  }

  async storePhoto(photo: CapturedPhoto): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['photos'], 'readwrite');
      const store = transaction.objectStore('photos');

      // Store photo with blob data
      const photoData = {
        ...photo,
        blob: photo.blob,
        file: null // Don't store File object directly
      };

      const request = store.put(photoData);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getPhotos(itemId?: string, uploaded = false): Promise<CapturedPhoto[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['photos'], 'readonly');
      const store = transaction.objectStore('photos');

      let request: IDBRequest;
      if (itemId) {
        const index = store.index('itemId');
        request = index.getAll(itemId);
      } else {
        request = store.getAll();
      }

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const photos = request.result as CapturedPhoto[];
        const filtered = uploaded !== undefined
          ? photos.filter(photo => photo.uploaded === uploaded)
          : photos;
        resolve(filtered);
      };
    });
  }

  async updatePhoto(photoId: string, updates: Partial<CapturedPhoto>): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['photos'], 'readwrite');
      const store = transaction.objectStore('photos');

      const getRequest = store.get(photoId);
      getRequest.onerror = () => reject(getRequest.error);
      getRequest.onsuccess = () => {
        const photo = getRequest.result;
        if (!photo) {
          reject(new Error('Photo not found'));
          return;
        }

        const updatedPhoto = { ...photo, ...updates };
        const putRequest = store.put(updatedPhoto);
        putRequest.onerror = () => reject(putRequest.error);
        putRequest.onsuccess = () => resolve();
      };
    });
  }

  async deletePhoto(photoId: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['photos'], 'readwrite');
      const store = transaction.objectStore('photos');

      const request = store.delete(photoId);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async storeSession(session: PhotoSession): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['sessions'], 'readwrite');
      const store = transaction.objectStore('sessions');

      // Convert Map to object for storage
      const sessionData = {
        ...session,
        photos: Object.fromEntries(session.photos)
      };

      const request = store.put(sessionData);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getSessions(status?: PhotoSession['status']): Promise<PhotoSession[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['sessions'], 'readonly');
      const store = transaction.objectStore('sessions');

      let request: IDBRequest;
      if (status) {
        const index = store.index('status');
        request = index.getAll(status);
      } else {
        request = store.getAll();
      }

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const sessions = request.result.map((sessionData: any) => ({
          ...sessionData,
          photos: new Map(Object.entries(sessionData.photos))
        }));
        resolve(sessions);
      };
    });
  }

  async deleteSession(sessionId: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['sessions'], 'readwrite');
      const store = transaction.objectStore('sessions');

      const request = store.delete(sessionId);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clearAll(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['photos', 'sessions'], 'readwrite');

      const photosStore = transaction.objectStore('photos');
      const sessionsStore = transaction.objectStore('sessions');

      const clearPhotos = photosStore.clear();
      const clearSessions = sessionsStore.clear();

      Promise.all([
        new Promise((res, rej) => {
          clearPhotos.onerror = () => rej(clearPhotos.error);
          clearPhotos.onsuccess = () => res(undefined);
        }),
        new Promise((res, rej) => {
          clearSessions.onerror = () => rej(clearSessions.error);
          clearSessions.onsuccess = () => res(undefined);
        })
      ]).then(() => resolve()).catch(reject);
    });
  }
}

// Photo compression utilities
export class PhotoCompressor {
  static async compressImage(
    file: File,
    options: {
      maxWidth?: number;
      maxHeight?: number;
      quality?: number;
      format?: 'jpeg' | 'webp' | 'png';
    } = {}
  ): Promise<{ blob: Blob; dataUrl: string; metadata: PhotoMetadata }> {
    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 0.8,
      format = 'jpeg'
    } = options;

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Calculate new dimensions
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }

            const dataUrl = canvas.toDataURL(`image/${format}`, quality);
            const originalSize = file.size;
            const compressedSize = blob.size;

            const metadata: PhotoMetadata = {
              width,
              height,
              size: compressedSize,
              quality,
              compression: 1 - (compressedSize / originalSize),
              deviceType: PhotoCompressor.getDeviceType()
            };

            resolve({ blob, dataUrl, metadata });
          },
          `image/${format}`,
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  static async generateThumbnail(
    file: File | Blob,
    size = 200
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Calculate square crop
        const minDimension = Math.min(img.width, img.height);
        const cropX = (img.width - minDimension) / 2;
        const cropY = (img.height - minDimension) / 2;

        canvas.width = size;
        canvas.height = size;

        // Draw cropped and resized image
        ctx.drawImage(
          img,
          cropX, cropY, minDimension, minDimension,
          0, 0, size, size
        );

        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  static getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/mobile/.test(userAgent)) return 'mobile';
    if (/tablet|ipad/.test(userAgent)) return 'tablet';
    return 'desktop';
  }

  static async resizeForUpload(
    photo: CapturedPhoto,
    targetSize: 'thumbnail' | 'medium' | 'large' = 'medium'
  ): Promise<{ blob: Blob; dataUrl: string }> {
    const dimensions = {
      thumbnail: 300,
      medium: 800,
      large: 1600
    };

    const quality = {
      thumbnail: 0.6,
      medium: 0.8,
      large: 0.9
    };

    return PhotoCompressor.compressImage(photo.file, {
      maxWidth: dimensions[targetSize],
      maxHeight: dimensions[targetSize],
      quality: quality[targetSize]
    });
  }
}

// Background sync utilities
export class PhotoSyncManager {
  private static instance: PhotoSyncManager;
  private syncQueue: string[] = [];
  private isOnline = navigator.onLine;
  private storage = new PhotoStorage();

  static getInstance(): PhotoSyncManager {
    if (!PhotoSyncManager.instance) {
      PhotoSyncManager.instance = new PhotoSyncManager();
    }
    return PhotoSyncManager.instance;
  }

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Initialize storage
    this.storage.init();
  }

  async queuePhotoForSync(photoId: string): Promise<void> {
    if (!this.syncQueue.includes(photoId)) {
      this.syncQueue.push(photoId);
    }

    if (this.isOnline) {
      this.processSyncQueue();
    }
  }

  private async processSyncQueue(): Promise<void> {
    if (!this.isOnline || this.syncQueue.length === 0) return;

    const photoId = this.syncQueue.shift();
    if (!photoId) return;

    try {
      const photos = await this.storage.getPhotos();
      const photo = photos.find(p => p.id === photoId);

      if (!photo) {
        console.warn(`Photo ${photoId} not found for sync`);
        return;
      }

      // Upload photo (implement your API call here)
      await this.uploadPhoto(photo);

      // Mark as uploaded
      await this.storage.updatePhoto(photoId, { uploaded: true });

      // Continue processing queue
      if (this.syncQueue.length > 0) {
        setTimeout(() => this.processSyncQueue(), 100);
      }
    } catch (error) {
      console.error(`Failed to sync photo ${photoId}:`, error);
      // Re-queue for retry
      this.syncQueue.unshift(photoId);
    }
  }

  private async uploadPhoto(photo: CapturedPhoto): Promise<void> {
    // Create FormData for upload
    const formData = new FormData();
    formData.append('photo', photo.blob, `${photo.itemId}_${photo.angle}.jpg`);
    formData.append('itemId', photo.itemId);
    formData.append('angle', photo.angle);
    formData.append('metadata', JSON.stringify(photo.metadata));

    // Upload to your API endpoint
    const response = await fetch('/api/items/photos', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return response.json();
  }

  async getPendingUploads(): Promise<CapturedPhoto[]> {
    return this.storage.getPhotos(undefined, false);
  }

  async retryFailedUploads(): Promise<void> {
    const pendingPhotos = await this.getPendingUploads();
    pendingPhotos.forEach(photo => {
      this.queuePhotoForSync(photo.id);
    });
  }
}

// Export singleton instance
export const photoStorage = new PhotoStorage();
export const photoSyncManager = PhotoSyncManager.getInstance();

// Utility functions
export const createCapturedPhoto = async (
  file: File,
  itemId: string,
  angle: CapturedPhoto['angle'],
  compressionOptions?: Parameters<typeof PhotoCompressor.compressImage>[1]
): Promise<CapturedPhoto> => {
  const { blob, dataUrl, metadata } = await PhotoCompressor.compressImage(file, compressionOptions);
  const thumbnail = await PhotoCompressor.generateThumbnail(blob);

  return {
    id: crypto.randomUUID(),
    itemId,
    file,
    blob,
    dataUrl,
    thumbnail,
    angle,
    timestamp: new Date(),
    metadata,
    uploaded: false,
    compressed: true
  };
};

export const estimateUploadTime = (photos: CapturedPhoto[]): string => {
  const totalSize = photos.reduce((sum, photo) => sum + photo.metadata.size, 0);
  const avgUploadSpeed = 100 * 1024; // 100 KB/s (conservative estimate)
  const estimatedSeconds = totalSize / avgUploadSpeed;

  if (estimatedSeconds < 60) {
    return `~${Math.ceil(estimatedSeconds)} seconds`;
  } else {
    return `~${Math.ceil(estimatedSeconds / 60)} minutes`;
  }
};

import React from 'react';
import { CapturedPhoto } from '../types';

export interface UploadProgress {
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  retryCount: number;
  error?: string;
}

export interface UploadQueueItem {
  id: string;
  photo: CapturedPhoto;
  itemId: string;
  metadata?: any;
  priority: 'high' | 'normal' | 'low';
  timestamp: number;
}

class PhotoAutoUploader {
  private uploadQueue: UploadQueueItem[] = [];
  private activeUploads: Map<string, AbortController> = new Map();
  private progressCallbacks: ((progress: UploadProgress[]) => void)[] = [];
  private maxConcurrentUploads = 3;
  private retryAttempts = 3;
  private retryDelay = 2000;
  private isOnline = navigator.onLine;
  private ws: WebSocket | null = null;

  constructor() {
    this.setupEventListeners();
    this.loadQueueFromStorage();
    this.setupWebSocket();
  }

  private setupEventListeners() {
    // Online/offline detection
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.pauseActiveUploads();
    });

    // Page visibility for background sync
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isOnline) {
        this.processQueue();
      }
    });
  }

  private setupWebSocket() {
    try {
      const wsUrl = process.env.NODE_ENV === 'production'
        ? 'wss://inventory.highline.work/ws'
        : 'ws://localhost:8080/ws';

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected for real-time photo updates');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'photo_uploaded') {
            this.handlePhotoUploadedEvent(data);
          }
        } catch (error) {
          console.warn('Invalid WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected, attempting to reconnect...');
        setTimeout(() => this.setupWebSocket(), 5000);
      };
    } catch (error) {
      console.warn('WebSocket not available:', error);
    }
  }

  private handlePhotoUploadedEvent(data: any) {
    // Notify components about successful upload
    this.notifyProgress();
  }

  // Queue photo for upload
  queuePhoto(photo: CapturedPhoto, itemId: string, priority: 'high' | 'normal' | 'low' = 'normal') {
    const queueItem: UploadQueueItem = {
      id: crypto.randomUUID(),
      photo,
      itemId,
      priority,
      timestamp: Date.now()
    };

    // Insert based on priority
    if (priority === 'high') {
      this.uploadQueue.unshift(queueItem);
    } else {
      this.uploadQueue.push(queueItem);
    }

    this.saveQueueToStorage();

    if (this.isOnline) {
      this.processQueue();
    }

    return queueItem.id;
  }

  // Start processing upload queue
  private async processQueue() {
    const activeCount = this.activeUploads.size;
    const availableSlots = this.maxConcurrentUploads - activeCount;

    if (availableSlots <= 0 || this.uploadQueue.length === 0) {
      return;
    }

    // Get next items to upload
    const itemsToUpload = this.uploadQueue
      .filter(item => !this.activeUploads.has(item.id))
      .slice(0, availableSlots);

    for (const item of itemsToUpload) {
      this.uploadPhoto(item);
    }
  }

  // Upload individual photo
  private async uploadPhoto(queueItem: UploadQueueItem) {
    const { id, photo, itemId } = queueItem;
    const abortController = new AbortController();
    this.activeUploads.set(id, abortController);

    try {
      this.notifyProgress();

      const formData = new FormData();
      formData.append('photo', photo.blob, `${itemId}_${photo.angle}_${Date.now()}.jpg`);
      formData.append('itemId', itemId);
      formData.append('angle', photo.angle);
      formData.append('metadata', JSON.stringify({
        ...photo.metadata,
        uploadId: id,
        queueTimestamp: queueItem.timestamp
      }));

      // Simulate progress for chunked upload
      const response = await this.uploadWithProgress(formData, abortController.signal, (progress) => {
        this.updateProgressCallback(id, progress);
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      // Success
      this.completeUpload(id, result);

      // Send WebSocket update
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'photo_uploaded',
          itemId,
          photoId: photo.id,
          uploadId: id,
          result
        }));
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log(`Upload ${id} was cancelled`);
        return;
      }

      console.error(`Upload failed for ${id}:`, error);
      await this.handleUploadFailure(id, queueItem, error.message);
    } finally {
      this.activeUploads.delete(id);
      this.processQueue(); // Process next items
    }
  }

  // Upload with progress tracking
  private uploadWithProgress(
    formData: FormData,
    signal: AbortSignal,
    onProgress: (progress: number) => void
  ): Promise<Response> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(new Response(xhr.responseText, { status: xhr.status }));
        } else {
          reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload cancelled'));
      });

      // Handle abort signal
      signal.addEventListener('abort', () => {
        xhr.abort();
      });

      xhr.open('POST', '/api/items/photos');
      xhr.send(formData);
    });
  }

  private updateProgressCallback(id: string, progress: number) {
    this.notifyProgress();
  }

  private async handleUploadFailure(id: string, queueItem: UploadQueueItem, error: string) {
    const item = this.uploadQueue.find(i => i.id === id);
    if (!item) return;

    // Check if we should retry
    const retryCount = (item as any).retryCount || 0;
    if (retryCount < this.retryAttempts) {
      // Add retry delay
      await new Promise(resolve => setTimeout(resolve, this.retryDelay * (retryCount + 1)));

      // Update item with retry count
      (item as any).retryCount = retryCount + 1;
      (item as any).error = error;

      this.saveQueueToStorage();

      // Retry if online
      if (this.isOnline) {
        setTimeout(() => this.uploadPhoto(queueItem), 1000);
      }
    } else {
      // Max retries reached, mark as failed
      (item as any).status = 'failed';
      (item as any).error = error;
      this.saveQueueToStorage();
    }

    this.notifyProgress();
  }

  private completeUpload(id: string, result: any) {
    // Remove from queue
    this.uploadQueue = this.uploadQueue.filter(item => item.id !== id);
    this.saveQueueToStorage();
    this.notifyProgress();
  }

  private pauseActiveUploads() {
    // Cancel all active uploads when going offline
    this.activeUploads.forEach(controller => controller.abort());
    this.activeUploads.clear();
  }

  // Storage management
  private saveQueueToStorage() {
    try {
      const queueData = this.uploadQueue.map(item => ({
        ...item,
        photo: {
          ...item.photo,
          // Don't store the actual blob in localStorage
          blob: null,
          file: null
        }
      }));

      localStorage.setItem('photo_upload_queue', JSON.stringify(queueData));
    } catch (error) {
      console.warn('Failed to save upload queue to storage:', error);
    }
  }

  private loadQueueFromStorage() {
    try {
      const stored = localStorage.getItem('photo_upload_queue');
      if (stored) {
        const queueData = JSON.parse(stored);
        // Note: We lose the actual photo data when loading from storage
        // In a real app, you'd store photos in IndexedDB instead
        this.uploadQueue = queueData.filter((item: any) =>
          Date.now() - item.timestamp < 24 * 60 * 60 * 1000 // Only keep items from last 24 hours
        );
      }
    } catch (error) {
      console.warn('Failed to load upload queue from storage:', error);
    }
  }

  // Public API
  onProgress(callback: (progress: UploadProgress[]) => void) {
    this.progressCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      this.progressCallbacks = this.progressCallbacks.filter(cb => cb !== callback);
    };
  }

  private notifyProgress() {
    const progress: UploadProgress[] = [
      // Active uploads
      ...Array.from(this.activeUploads.keys()).map(id => {
        const item = this.uploadQueue.find(i => i.id === id);
        return {
          id,
          progress: 50, // TODO: track actual progress
          status: 'uploading' as const,
          retryCount: (item as any)?.retryCount || 0
        };
      }),
      // Queued uploads
      ...this.uploadQueue
        .filter(item => !this.activeUploads.has(item.id))
        .map(item => ({
          id: item.id,
          progress: 0,
          status: (item as any).status || 'pending' as const,
          retryCount: (item as any)?.retryCount || 0,
          error: (item as any)?.error
        }))
    ];

    this.progressCallbacks.forEach(callback => {
      try {
        callback(progress);
      } catch (error) {
        console.error('Progress callback error:', error);
      }
    });
  }

  // Queue management
  getQueueStatus() {
    return {
      total: this.uploadQueue.length,
      active: this.activeUploads.size,
      pending: this.uploadQueue.length - this.activeUploads.size,
      failed: this.uploadQueue.filter(item => (item as any).status === 'failed').length
    };
  }

  clearQueue() {
    // Cancel active uploads
    this.activeUploads.forEach(controller => controller.abort());
    this.activeUploads.clear();

    // Clear queue
    this.uploadQueue = [];
    this.saveQueueToStorage();
    this.notifyProgress();
  }

  retryFailedUploads() {
    this.uploadQueue.forEach(item => {
      if ((item as any).status === 'failed') {
        delete (item as any).status;
        delete (item as any).retryCount;
        delete (item as any).error;
      }
    });

    this.saveQueueToStorage();

    if (this.isOnline) {
      this.processQueue();
    }
  }

  // Cleanup
  destroy() {
    // Cancel all active uploads
    this.pauseActiveUploads();

    // Close WebSocket
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    // Clear callbacks
    this.progressCallbacks = [];

    // Remove event listeners
    window.removeEventListener('online', this.processQueue);
    window.removeEventListener('offline', this.pauseActiveUploads);
  }
}

// Singleton instance
export const photoAutoUploader = new PhotoAutoUploader();

// React hook for easier integration
export function usePhotoUploader() {
  const [progress, setProgress] = React.useState<UploadProgress[]>([]);
  const [queueStatus, setQueueStatus] = React.useState(photoAutoUploader.getQueueStatus());

  React.useEffect(() => {
    const unsubscribe = photoAutoUploader.onProgress((newProgress) => {
      setProgress(newProgress);
      setQueueStatus(photoAutoUploader.getQueueStatus());
    });

    return unsubscribe;
  }, []);

  return {
    queuePhoto: photoAutoUploader.queuePhoto.bind(photoAutoUploader),
    progress,
    queueStatus,
    clearQueue: photoAutoUploader.clearQueue.bind(photoAutoUploader),
    retryFailedUploads: photoAutoUploader.retryFailedUploads.bind(photoAutoUploader)
  };
}

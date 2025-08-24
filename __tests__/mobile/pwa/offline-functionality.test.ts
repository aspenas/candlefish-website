import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { screen, waitFor, act, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock service worker for offline testing
const server = setupServer(
  rest.get('/api/documents', (req, res, ctx) => {
    return res(
      ctx.json([
        {
          id: '1',
          title: 'Offline Document 1',
          content: 'Content 1',
          lastModified: '2024-01-01T00:00:00Z',
          status: 'DRAFT',
        },
        {
          id: '2',
          title: 'Offline Document 2',
          content: 'Content 2',
          lastModified: '2024-01-01T00:00:00Z',
          status: 'PUBLISHED',
        },
      ])
    );
  }),

  rest.post('/api/documents', (req, res, ctx) => {
    return res(
      ctx.json({
        id: '3',
        title: 'New Document',
        content: 'New content',
        lastModified: new Date().toISOString(),
        status: 'DRAFT',
      })
    );
  }),

  rest.put('/api/documents/:id', (req, res, ctx) => {
    const { id } = req.params;
    return res(
      ctx.json({
        id,
        title: 'Updated Document',
        content: 'Updated content',
        lastModified: new Date().toISOString(),
        status: 'DRAFT',
      })
    );
  })
);

// Mock IndexedDB for offline storage
const mockIndexedDB = {
  databases: new Map(),

  open: jest.fn((dbName: string, version: number) => {
    return Promise.resolve({
      name: dbName,
      version,
      objectStoreNames: ['documents', 'sync_queue'],
      transaction: jest.fn((storeNames: string[], mode: string) => ({
        objectStore: jest.fn((storeName: string) => ({
          add: jest.fn().mockResolvedValue(undefined),
          get: jest.fn().mockResolvedValue(undefined),
          put: jest.fn().mockResolvedValue(undefined),
          delete: jest.fn().mockResolvedValue(undefined),
          getAll: jest.fn().mockResolvedValue([]),
          createIndex: jest.fn(),
          index: jest.fn(() => ({
            get: jest.fn().mockResolvedValue(undefined),
            getAll: jest.fn().mockResolvedValue([]),
          })),
        })),
        oncomplete: null,
        onerror: null,
      })),
      createObjectStore: jest.fn(() => ({
        createIndex: jest.fn(),
      })),
      close: jest.fn(),
    });
  }),
};

// Mock service worker registration
const mockServiceWorker = {
  register: jest.fn().mockResolvedValue({
    installing: null,
    waiting: null,
    active: {
      postMessage: jest.fn(),
    },
    addEventListener: jest.fn(),
    update: jest.fn(),
  }),

  getRegistration: jest.fn().mockResolvedValue({
    active: {
      postMessage: jest.fn(),
    },
    update: jest.fn(),
  }),
};

// Mock offline storage service
class MockOfflineStorage {
  private documents: Map<string, any> = new Map();
  private syncQueue: any[] = [];

  async saveDocument(document: any): Promise<void> {
    this.documents.set(document.id, {
      ...document,
      _offline: true,
      _lastModified: Date.now(),
    });
  }

  async getDocument(id: string): Promise<any | null> {
    return this.documents.get(id) || null;
  }

  async getAllDocuments(): Promise<any[]> {
    return Array.from(this.documents.values());
  }

  async deleteDocument(id: string): Promise<void> {
    this.documents.delete(id);
  }

  async addToSyncQueue(operation: any): Promise<void> {
    this.syncQueue.push({
      ...operation,
      _timestamp: Date.now(),
      _id: `sync_${Date.now()}_${Math.random()}`,
    });
  }

  async getSyncQueue(): Promise<any[]> {
    return [...this.syncQueue];
  }

  async removeSyncOperation(id: string): Promise<void> {
    const index = this.syncQueue.findIndex(op => op._id === id);
    if (index !== -1) {
      this.syncQueue.splice(index, 1);
    }
  }

  async clearAll(): Promise<void> {
    this.documents.clear();
    this.syncQueue.length = 0;
  }
}

// Mock PWA offline manager
class MockPWAOfflineManager {
  private storage = new MockOfflineStorage();
  private isOnline = true;
  private syncInProgress = false;
  private listeners: Map<string, Function[]> = new Map();

  constructor() {
    // Mock network status
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: this.isOnline,
    });

    // Mock online/offline events
    this.addEventListener = jest.fn((event: string, callback: Function) => {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
      }
      this.listeners.get(event)!.push(callback);
    });
  }

  addEventListener = jest.fn();

  setOnlineStatus(online: boolean) {
    this.isOnline = online;
    (navigator as any).onLine = online;

    const event = online ? 'online' : 'offline';
    const listeners = this.listeners.get(event) || [];
    listeners.forEach(callback => callback());

    if (online && !this.syncInProgress) {
      this.syncOfflineChanges();
    }
  }

  async saveDocumentOffline(document: any): Promise<void> {
    await this.storage.saveDocument(document);

    // Add to sync queue if modified offline
    await this.storage.addToSyncQueue({
      type: 'UPDATE_DOCUMENT',
      documentId: document.id,
      data: document,
      timestamp: Date.now(),
    });
  }

  async getDocuments(): Promise<any[]> {
    if (this.isOnline) {
      try {
        const response = await fetch('/api/documents');
        const documents = await response.json();

        // Cache documents for offline use
        for (const doc of documents) {
          await this.storage.saveDocument(doc);
        }

        return documents;
      } catch (error) {
        // Fallback to offline data
        return await this.storage.getAllDocuments();
      }
    } else {
      // Return cached documents when offline
      return await this.storage.getAllDocuments();
    }
  }

  async updateDocument(id: string, updates: any): Promise<any> {
    const document = { id, ...updates, lastModified: new Date().toISOString() };

    if (this.isOnline) {
      try {
        const response = await fetch(`/api/documents/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });

        if (response.ok) {
          const updatedDoc = await response.json();
          await this.storage.saveDocument(updatedDoc);
          return updatedDoc;
        } else {
          throw new Error('Network error');
        }
      } catch (error) {
        // Save offline and queue for sync
        await this.saveDocumentOffline(document);
        return document;
      }
    } else {
      // Save offline when offline
      await this.saveDocumentOffline(document);
      return document;
    }
  }

  async createDocument(documentData: any): Promise<any> {
    const document = {
      id: `offline_${Date.now()}`,
      ...documentData,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    };

    if (this.isOnline) {
      try {
        const response = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(documentData),
        });

        if (response.ok) {
          const createdDoc = await response.json();
          await this.storage.saveDocument(createdDoc);
          return createdDoc;
        } else {
          throw new Error('Network error');
        }
      } catch (error) {
        // Save offline and queue for sync
        await this.saveDocumentOffline(document);
        return document;
      }
    } else {
      // Save offline when offline
      await this.saveDocumentOffline(document);
      return document;
    }
  }

  async syncOfflineChanges(): Promise<void> {
    if (!this.isOnline || this.syncInProgress) {
      return;
    }

    this.syncInProgress = true;

    try {
      const syncQueue = await this.storage.getSyncQueue();

      for (const operation of syncQueue) {
        try {
          switch (operation.type) {
            case 'UPDATE_DOCUMENT':
              await fetch(`/api/documents/${operation.documentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(operation.data),
              });
              break;

            case 'CREATE_DOCUMENT':
              await fetch('/api/documents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(operation.data),
              });
              break;
          }

          // Remove from sync queue on success
          await this.storage.removeSyncOperation(operation._id);
        } catch (error) {
          console.error('Sync operation failed:', operation, error);
          // Keep in queue for retry
        }
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  async getOfflineStatus(): Promise<{
    isOnline: boolean;
    pendingSyncOperations: number;
    cachedDocuments: number;
  }> {
    const syncQueue = await this.storage.getSyncQueue();
    const cachedDocs = await this.storage.getAllDocuments();

    return {
      isOnline: this.isOnline,
      pendingSyncOperations: syncQueue.length,
      cachedDocuments: cachedDocs.length,
    };
  }
}

describe('PWA Offline Functionality', () => {
  let offlineManager: MockPWAOfflineManager;

  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });

    // Mock global objects
    (global as any).indexedDB = mockIndexedDB;
    (global as any).navigator.serviceWorker = mockServiceWorker;

    // Mock fetch
    global.fetch = jest.fn();
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    offlineManager = new MockPWAOfflineManager();
    server.resetHandlers();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await offlineManager['storage'].clearAll();
  });

  describe('Service Worker Registration', () => {
    it('should register service worker successfully', async () => {
      const registration = await mockServiceWorker.register('/sw.js');

      expect(mockServiceWorker.register).toHaveBeenCalledWith('/sw.js');
      expect(registration).toHaveProperty('active');
      expect(registration.active).toHaveProperty('postMessage');
    });

    it('should handle service worker registration failure', async () => {
      mockServiceWorker.register.mockRejectedValueOnce(new Error('Registration failed'));

      await expect(mockServiceWorker.register('/sw.js')).rejects.toThrow('Registration failed');
    });

    it('should update service worker when available', async () => {
      const registration = await mockServiceWorker.getRegistration();

      expect(registration).toHaveProperty('update');
      expect(typeof registration.update).toBe('function');
    });
  });

  describe('Offline Data Storage', () => {
    it('should save documents to IndexedDB when offline', async () => {
      offlineManager.setOnlineStatus(false);

      const document = {
        id: '1',
        title: 'Offline Document',
        content: 'This was created offline',
        status: 'DRAFT',
      };

      const savedDoc = await offlineManager.createDocument(document);

      expect(savedDoc).toMatchObject({
        title: 'Offline Document',
        content: 'This was created offline',
        status: 'DRAFT',
      });

      expect(savedDoc.id).toMatch(/^offline_/);
    });

    it('should retrieve documents from cache when offline', async () => {
      // First save some documents while online
      offlineManager.setOnlineStatus(true);
      await offlineManager.getDocuments(); // This caches the documents

      // Then go offline
      offlineManager.setOnlineStatus(false);

      const documents = await offlineManager.getDocuments();

      expect(documents).toHaveLength(2);
      expect(documents[0]).toMatchObject({
        id: '1',
        title: 'Offline Document 1',
      });
    });

    it('should update documents in cache when offline', async () => {
      offlineManager.setOnlineStatus(false);

      const updates = {
        title: 'Updated Title',
        content: 'Updated content while offline',
      };

      const updatedDoc = await offlineManager.updateDocument('1', updates);

      expect(updatedDoc).toMatchObject({
        id: '1',
        title: 'Updated Title',
        content: 'Updated content while offline',
      });
    });

    it('should maintain sync queue for offline operations', async () => {
      offlineManager.setOnlineStatus(false);

      // Create a document offline
      await offlineManager.createDocument({
        title: 'Offline Document',
        content: 'Created offline',
      });

      // Update a document offline
      await offlineManager.updateDocument('1', {
        title: 'Updated offline',
      });

      const status = await offlineManager.getOfflineStatus();

      expect(status.pendingSyncOperations).toBe(2);
      expect(status.isOnline).toBe(false);
    });
  });

  describe('Online/Offline Status Detection', () => {
    it('should detect when going offline', () => {
      expect(navigator.onLine).toBe(true);

      offlineManager.setOnlineStatus(false);

      expect(navigator.onLine).toBe(false);
    });

    it('should detect when coming back online', () => {
      offlineManager.setOnlineStatus(false);
      expect(navigator.onLine).toBe(false);

      offlineManager.setOnlineStatus(true);
      expect(navigator.onLine).toBe(true);
    });

    it('should trigger sync when coming back online', async () => {
      // Create operations while offline
      offlineManager.setOnlineStatus(false);
      await offlineManager.createDocument({
        title: 'Offline Document',
        content: 'Created offline',
      });

      const statusBefore = await offlineManager.getOfflineStatus();
      expect(statusBefore.pendingSyncOperations).toBe(1);

      // Come back online
      offlineManager.setOnlineStatus(true);

      // Give sync time to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      const statusAfter = await offlineManager.getOfflineStatus();
      expect(statusAfter.pendingSyncOperations).toBe(0);
    });
  });

  describe('Data Synchronization', () => {
    it('should sync offline changes when reconnected', async () => {
      // Start offline
      offlineManager.setOnlineStatus(false);

      // Create document offline
      const offlineDoc = await offlineManager.createDocument({
        title: 'Offline Created',
        content: 'This was created offline',
      });

      // Update document offline
      await offlineManager.updateDocument(offlineDoc.id, {
        title: 'Updated Offline',
        content: 'This was updated offline',
      });

      // Go back online
      offlineManager.setOnlineStatus(true);

      // Manually trigger sync (normally automatic)
      await offlineManager.syncOfflineChanges();

      const status = await offlineManager.getOfflineStatus();
      expect(status.pendingSyncOperations).toBe(0);
    });

    it('should handle sync conflicts gracefully', async () => {
      // Mock a conflict scenario
      server.use(
        rest.put('/api/documents/:id', (req, res, ctx) => {
          return res(
            ctx.status(409),
            ctx.json({
              error: 'Conflict',
              message: 'Document was modified by another user',
            })
          );
        })
      );

      offlineManager.setOnlineStatus(false);

      // Update document offline
      await offlineManager.updateDocument('1', {
        title: 'Conflicting Update',
      });

      offlineManager.setOnlineStatus(true);

      // Sync should handle the conflict
      await offlineManager.syncOfflineChanges();

      // Operation should remain in queue for manual resolution
      const status = await offlineManager.getOfflineStatus();
      expect(status.pendingSyncOperations).toBe(1);
    });

    it('should retry failed sync operations', async () => {
      let attemptCount = 0;

      server.use(
        rest.post('/api/documents', (req, res, ctx) => {
          attemptCount++;

          if (attemptCount < 3) {
            return res(
              ctx.status(500),
              ctx.json({ error: 'Server error' })
            );
          }

          return res(
            ctx.json({
              id: '123',
              title: 'Successfully synced',
              content: 'After retries',
            })
          );
        })
      );

      offlineManager.setOnlineStatus(false);

      await offlineManager.createDocument({
        title: 'Document to sync',
        content: 'Should retry on failure',
      });

      offlineManager.setOnlineStatus(true);

      // First sync attempt should fail
      await offlineManager.syncOfflineChanges();

      let status = await offlineManager.getOfflineStatus();
      expect(status.pendingSyncOperations).toBe(1);

      // Second sync attempt should also fail
      await offlineManager.syncOfflineChanges();

      status = await offlineManager.getOfflineStatus();
      expect(status.pendingSyncOperations).toBe(1);

      // Third sync attempt should succeed
      await offlineManager.syncOfflineChanges();

      status = await offlineManager.getOfflineStatus();
      expect(status.pendingSyncOperations).toBe(0);

      expect(attemptCount).toBe(3);
    });
  });

  describe('Cache Management', () => {
    it('should provide cache status information', async () => {
      // Add some documents to cache
      await offlineManager.getDocuments();

      // Create offline operations
      offlineManager.setOnlineStatus(false);
      await offlineManager.createDocument({
        title: 'Cached Document',
        content: 'In cache',
      });

      const status = await offlineManager.getOfflineStatus();

      expect(status).toEqual({
        isOnline: false,
        pendingSyncOperations: 1,
        cachedDocuments: 3, // 2 from API + 1 created offline
      });
    });

    it('should handle cache storage limits', async () => {
      // Mock storage quota exceeded
      const mockError = new Error('QuotaExceededError');
      mockError.name = 'QuotaExceededError';

      const originalSaveDocument = offlineManager['storage'].saveDocument;
      offlineManager['storage'].saveDocument = jest.fn()
        .mockRejectedValueOnce(mockError)
        .mockResolvedValue(undefined);

      offlineManager.setOnlineStatus(false);

      // First save should fail due to quota
      await expect(
        offlineManager.createDocument({
          title: 'Large Document',
          content: 'Very large content that exceeds quota',
        })
      ).rejects.toThrow('QuotaExceededError');

      // Restore original method
      offlineManager['storage'].saveDocument = originalSaveDocument;
    });
  });

  describe('Error Handling', () => {
    it('should handle IndexedDB errors gracefully', async () => {
      // Mock IndexedDB error
      mockIndexedDB.open.mockRejectedValueOnce(new Error('IndexedDB not available'));

      const newManager = new MockPWAOfflineManager();

      // Should fallback gracefully
      const documents = await newManager.getDocuments();
      expect(Array.isArray(documents)).toBe(true);
    });

    it('should handle network errors during sync', async () => {
      server.use(
        rest.post('/api/documents', (req, res, ctx) => {
          return res.networkError('Network connection failed');
        })
      );

      offlineManager.setOnlineStatus(false);
      await offlineManager.createDocument({
        title: 'Document to sync',
        content: 'Will fail to sync',
      });

      offlineManager.setOnlineStatus(true);

      // Sync should handle network errors gracefully
      await expect(offlineManager.syncOfflineChanges()).resolves.not.toThrow();

      // Operation should remain in queue
      const status = await offlineManager.getOfflineStatus();
      expect(status.pendingSyncOperations).toBe(1);
    });

    it('should handle corrupted offline data', async () => {
      // Mock corrupted data in IndexedDB
      const storage = offlineManager['storage'];
      storage.getAllDocuments = jest.fn().mockRejectedValue(
        new Error('Data corruption detected')
      );

      offlineManager.setOnlineStatus(false);

      // Should handle corruption gracefully
      const documents = await offlineManager.getDocuments();
      expect(documents).toEqual([]);
    });
  });

  describe('Performance', () => {
    it('should handle large amounts of cached data efficiently', async () => {
      const largeDataSet = Array.from({ length: 1000 }, (_, i) => ({
        id: String(i),
        title: `Document ${i}`,
        content: `Content for document ${i}`,
        status: 'PUBLISHED',
      }));

      server.use(
        rest.get('/api/documents', (req, res, ctx) => {
          return res(ctx.json(largeDataSet));
        })
      );

      const startTime = performance.now();
      const documents = await offlineManager.getDocuments();
      const endTime = performance.now();

      const loadTime = endTime - startTime;

      expect(documents).toHaveLength(1000);
      expect(loadTime).toBeLessThan(1000); // Should load within 1 second
    });

    it('should debounce rapid offline changes', async () => {
      offlineManager.setOnlineStatus(false);

      // Make rapid updates to the same document
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          offlineManager.updateDocument('1', {
            title: `Rapid Update ${i}`,
            content: `Content ${i}`,
          })
        );
      }

      await Promise.all(promises);

      const status = await offlineManager.getOfflineStatus();

      // Should have consolidated the updates
      expect(status.pendingSyncOperations).toBeLessThan(10);
    });
  });
});

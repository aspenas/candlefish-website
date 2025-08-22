import React from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { offlineDB } from '@/lib/db/offline-db';
import type { OfflineEstimate, OfflinePhoto } from '@/lib/db/offline-db';

interface NetworkStatus {
  isOnline: boolean;
  lastOnline: Date | null;
  connectionType: string | null;
}

interface SyncStatus {
  isActive: boolean;
  lastSync: Date | null;
  pendingItems: number;
  errors: string[];
}

interface OfflineStore {
  // Network and sync status
  networkStatus: NetworkStatus;
  syncStatus: SyncStatus;

  // Current estimate being worked on
  currentEstimate: any | null;

  // Offline data
  offlineEstimates: OfflineEstimate[];
  offlinePhotos: OfflinePhoto[];

  // Actions
  setNetworkStatus: (status: Partial<NetworkStatus>) => void;
  setSyncStatus: (status: Partial<SyncStatus>) => void;

  // Estimate actions
  setCurrentEstimate: (estimate: any) => void;
  saveEstimateOffline: (estimateId: string, data: any) => Promise<void>;
  loadOfflineEstimates: () => Promise<void>;

  // Photo actions
  savePhotoOffline: (photoId: string, blob: Blob, metadata: any) => Promise<void>;
  loadOfflinePhotos: (estimateId?: string) => Promise<void>;

  // Sync actions
  triggerSync: () => Promise<void>;
  clearSyncErrors: () => void;

  // Utility actions
  clearOfflineData: () => Promise<void>;
  getStorageStats: () => Promise<any>;
}

// Custom storage for Zustand that uses IndexedDB
const indexedDBStorage = createJSONStorage(() => ({
  getItem: async (name: string): Promise<string | null> => {
    try {
      const value = await offlineDB.getSetting(name);
      return value ? JSON.stringify(value) : null;
    } catch (error) {
      console.error('Error reading from IndexedDB:', error);
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      const parsedValue = JSON.parse(value);
      await offlineDB.setSetting(name, parsedValue);
    } catch (error) {
      console.error('Error writing to IndexedDB:', error);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await offlineDB.setSetting(name, null);
    } catch (error) {
      console.error('Error removing from IndexedDB:', error);
    }
  }
}));

export const useOfflineStore = create<OfflineStore>()(
  persist(
    (set, get) => ({
      // Initial state
      networkStatus: {
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
        lastOnline: new Date(),
        connectionType: null
      },
      syncStatus: {
        isActive: false,
        lastSync: null,
        pendingItems: 0,
        errors: []
      },
      currentEstimate: null,
      offlineEstimates: [],
      offlinePhotos: [],

      // Network and sync actions
      setNetworkStatus: (status) => set((state) => ({
        networkStatus: { ...state.networkStatus, ...status }
      })),

      setSyncStatus: (status) => set((state) => ({
        syncStatus: { ...state.syncStatus, ...status }
      })),

      // Estimate actions
      setCurrentEstimate: (estimate) => set({ currentEstimate: estimate }),

      saveEstimateOffline: async (estimateId: string, data: any) => {
        try {
          await offlineDB.saveEstimate(estimateId, data);

          // Add to sync queue if online
          const { networkStatus } = get();
          if (networkStatus.isOnline) {
            await offlineDB.addToSyncQueue('estimate', 'create', { estimateId, data }, 8);
          }

          // Reload estimates
          await get().loadOfflineEstimates();

          console.log(`Estimate ${estimateId} saved offline`);
        } catch (error) {
          console.error('Failed to save estimate offline:', error);
          set((state) => ({
            syncStatus: {
              ...state.syncStatus,
              errors: [...state.syncStatus.errors, `Failed to save estimate: ${error}`]
            }
          }));
        }
      },

      loadOfflineEstimates: async () => {
        try {
          const estimates = await offlineDB.getAllEstimates();
          set({ offlineEstimates: estimates });
        } catch (error) {
          console.error('Failed to load offline estimates:', error);
        }
      },

      // Photo actions
      savePhotoOffline: async (photoId: string, blob: Blob, metadata: any) => {
        try {
          await offlineDB.savePhoto(photoId, blob, metadata);

          // Add to sync queue if online
          const { networkStatus } = get();
          if (networkStatus.isOnline) {
            await offlineDB.addToSyncQueue('photo', 'create', { photoId, metadata }, 6);
          }

          // Reload photos
          await get().loadOfflinePhotos();

          console.log(`Photo ${photoId} saved offline`);
        } catch (error) {
          console.error('Failed to save photo offline:', error);
          set((state) => ({
            syncStatus: {
              ...state.syncStatus,
              errors: [...state.syncStatus.errors, `Failed to save photo: ${error}`]
            }
          }));
        }
      },

      loadOfflinePhotos: async (estimateId?: string) => {
        try {
          let photos;
          if (estimateId) {
            photos = await offlineDB.getPhotosForEstimate(estimateId);
          } else {
            photos = await offlineDB.photos.orderBy('createdAt').reverse().limit(50).toArray();
          }
          set({ offlinePhotos: photos });
        } catch (error) {
          console.error('Failed to load offline photos:', error);
        }
      },

      // Sync actions
      triggerSync: async () => {
        const { networkStatus, syncStatus } = get();

        if (!networkStatus.isOnline || syncStatus.isActive) {
          return;
        }

        set((state) => ({
          syncStatus: { ...state.syncStatus, isActive: true, errors: [] }
        }));

        try {
          // Get pending sync items
          const syncItems = await offlineDB.getNextSyncItems(20);

          set((state) => ({
            syncStatus: { ...state.syncStatus, pendingItems: syncItems.length }
          }));

          let successCount = 0;
          let errorCount = 0;

          // Process sync items
          for (const item of syncItems) {
            try {
              await processSyncItem(item);
              await offlineDB.removeSyncItem(item.id!);
              successCount++;
            } catch (error) {
              console.error(`Sync failed for item ${item.id}:`, error);
              await offlineDB.incrementSyncAttempts(item.id!);
              errorCount++;

              set((state) => ({
                syncStatus: {
                  ...state.syncStatus,
                  errors: [...state.syncStatus.errors, `Sync failed: ${error}`]
                }
              }));
            }
          }

          // Update sync status
          set((state) => ({
            syncStatus: {
              ...state.syncStatus,
              isActive: false,
              lastSync: new Date(),
              pendingItems: Math.max(0, state.syncStatus.pendingItems - successCount)
            }
          }));

          // Reload data if any items were synced
          if (successCount > 0) {
            await get().loadOfflineEstimates();
            await get().loadOfflinePhotos();
          }

          console.log(`Sync completed: ${successCount} success, ${errorCount} errors`);

        } catch (error) {
          console.error('Sync process failed:', error);
          set((state) => ({
            syncStatus: {
              ...state.syncStatus,
              isActive: false,
              errors: [...state.syncStatus.errors, `Sync process failed: ${error}`]
            }
          }));
        }
      },

      clearSyncErrors: () => set((state) => ({
        syncStatus: { ...state.syncStatus, errors: [] }
      })),

      // Utility actions
      clearOfflineData: async () => {
        try {
          await offlineDB.clearAllData();
          set({
            offlineEstimates: [],
            offlinePhotos: [],
            syncStatus: {
              isActive: false,
              lastSync: null,
              pendingItems: 0,
              errors: []
            }
          });
          console.log('All offline data cleared');
        } catch (error) {
          console.error('Failed to clear offline data:', error);
        }
      },

      getStorageStats: async () => {
        try {
          return await offlineDB.getDatabaseStats();
        } catch (error) {
          console.error('Failed to get storage stats:', error);
          return null;
        }
      }
    }),
    {
      name: 'paintbox-offline-store',
      storage: indexedDBStorage,
      partialize: (state) => ({
        networkStatus: state.networkStatus,
        syncStatus: {
          lastSync: state.syncStatus.lastSync,
          pendingItems: state.syncStatus.pendingItems,
          errors: state.syncStatus.errors
        }
      })
    }
  )
);

// Helper function to process sync items
async function processSyncItem(item: any): Promise<void> {
  const { type, action, data } = item;

  switch (type) {
    case 'estimate':
      if (action === 'create' || action === 'update') {
        const response = await fetch('/api/estimates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        // Mark as synced in database
        await offlineDB.markEstimateSynced(data.estimateId);
      }
      break;

    case 'photo':
      if (action === 'create') {
        const photo = await offlineDB.getPhoto(data.photoId);
        if (photo) {
          const formData = new FormData();
          formData.append('photo', photo.blob);
          formData.append('metadata', JSON.stringify(data.metadata));

          const response = await fetch('/api/companycam/upload', {
            method: 'POST',
            body: formData
          });

          if (!response.ok) {
            throw new Error(`Photo upload failed: ${response.status}`);
          }

          // Mark as synced
          await offlineDB.markPhotoSynced(data.photoId);
        }
      }
      break;

    case 'salesforce':
      if (action === 'create' || action === 'update') {
        const response = await fetch('/api/salesforce/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        if (!response.ok) {
          throw new Error(`Salesforce sync failed: ${response.status}`);
        }
      }
      break;

    default:
      console.warn(`Unknown sync item type: ${type}`);
  }
}

// Hook to initialize offline functionality
export function useOfflineInitialization() {
  const store = useOfflineStore();

  // Initialize offline infrastructure
  React.useEffect(() => {
    const initializeOfflineInfrastructure = async () => {
      try {
        console.log('Initializing offline infrastructure...');

        // Test IndexedDB access
        await offlineDB.isReady();
        console.log('IndexedDB initialized successfully');

        // Verify service worker registration
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.getRegistration();
          console.log('Service worker status:', registration ? 'registered' : 'not registered');
        }

        // Load initial data
        await store.loadOfflineEstimates();
        await store.loadOfflinePhotos();

        console.log('Offline infrastructure initialization complete');
      } catch (error) {
        console.error('Failed to initialize offline infrastructure:', error);
      }
    };

    initializeOfflineInfrastructure();
  }, [store]);

  // Set up network status monitoring
  React.useEffect(() => {
    const updateNetworkStatus = () => {
      const isOnline = navigator.onLine;
      store.setNetworkStatus({
        isOnline,
        lastOnline: isOnline ? new Date() : store.networkStatus.lastOnline
      });

      // Trigger sync when coming back online
      if (isOnline && store.syncStatus.pendingItems > 0) {
        setTimeout(() => store.triggerSync(), 1000);
      }
    };

    // Initial check
    updateNetworkStatus();

    // Add event listeners
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    // Connection type monitoring (if supported)
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      const updateConnection = () => {
        store.setNetworkStatus({
          connectionType: connection.effectiveType || connection.type || null
        });
      };

      updateConnection();
      connection.addEventListener('change', updateConnection);

      return () => {
        window.removeEventListener('online', updateNetworkStatus);
        window.removeEventListener('offline', updateNetworkStatus);
        connection.removeEventListener('change', updateConnection);
      };
    }

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
    };
  }, [store]);

  // Periodic cleanup
  React.useEffect(() => {
    const cleanupInterval = setInterval(() => {
      offlineDB.cleanupExpiredData();
    }, 60 * 60 * 1000); // Every hour

    return () => clearInterval(cleanupInterval);
  }, []);
}

// Export individual store selectors for optimization
export const useNetworkStatus = () => useOfflineStore(state => state.networkStatus);
export const useSyncStatus = () => useOfflineStore(state => state.syncStatus);
export const useCurrentEstimate = () => useOfflineStore(state => state.currentEstimate);
export const useOfflineEstimates = () => useOfflineStore(state => state.offlineEstimates);
export const useOfflinePhotos = () => useOfflineStore(state => state.offlinePhotos);

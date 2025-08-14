import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { OfflineService } from '@/services/offline';
import { SyncService } from '@/services/sync';

export interface OfflineMutation {
  id: string;
  type: string;
  variables: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  priority: 'low' | 'medium' | 'high';
}

export interface OfflineData {
  key: string;
  data: any;
  timestamp: number;
  expiresAt?: number;
}

interface OfflineState {
  isOnline: boolean;
  mutationQueue: OfflineMutation[];
  cachedData: Record<string, OfflineData>;
  isSyncing: boolean;
  syncProgress: number;
  lastSyncAt: number | null;
  syncErrors: string[];
  storageUsage: {
    used: number;
    available: number;
    percentage: number;
  };
}

const initialState: OfflineState = {
  isOnline: true,
  mutationQueue: [],
  cachedData: {},
  isSyncing: false,
  syncProgress: 0,
  lastSyncAt: null,
  syncErrors: [],
  storageUsage: {
    used: 0,
    available: 0,
    percentage: 0,
  },
};

// Async thunks
export const addOfflineMutation = createAsyncThunk(
  'offline/addMutation',
  async ({
    type,
    variables,
    priority = 'medium'
  }: {
    type: string;
    variables: any;
    priority?: 'low' | 'medium' | 'high';
  }) => {
    const mutation: OfflineMutation = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      variables,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: 3,
      priority,
    };

    await OfflineService.addMutation(mutation);
    return mutation;
  }
);

export const processMutationQueue = createAsyncThunk(
  'offline/processMutationQueue',
  async (_, { getState, dispatch }) => {
    const state = getState() as { offline: OfflineState };
    if (!state.offline.isOnline || state.offline.isSyncing) {
      return { processed: 0, failed: 0 };
    }

    return await SyncService.processMutationQueue();
  }
);

export const syncOfflineData = createAsyncThunk(
  'offline/syncData',
  async (_, { getState, dispatch }) => {
    const state = getState() as { offline: OfflineState };
    if (!state.offline.isOnline) {
      throw new Error('Cannot sync while offline');
    }

    // Process mutations first
    await dispatch(processMutationQueue());

    // Then sync cached data
    return await SyncService.syncCachedData();
  }
);

export const cacheData = createAsyncThunk(
  'offline/cacheData',
  async ({
    key,
    data,
    expirationMinutes
  }: {
    key: string;
    data: any;
    expirationMinutes?: number;
  }) => {
    const cachedData: OfflineData = {
      key,
      data,
      timestamp: Date.now(),
      expiresAt: expirationMinutes ? Date.now() + (expirationMinutes * 60 * 1000) : undefined,
    };

    await OfflineService.cacheData(cachedData);
    return cachedData;
  }
);

export const clearExpiredCache = createAsyncThunk(
  'offline/clearExpiredCache',
  async () => {
    const expired = await OfflineService.clearExpiredCache();
    return expired;
  }
);

export const updateStorageUsage = createAsyncThunk(
  'offline/updateStorageUsage',
  async () => {
    return await OfflineService.getStorageUsage();
  }
);

export const clearOfflineData = createAsyncThunk(
  'offline/clearData',
  async ({
    clearCache = true,
    clearMutations = false
  }: {
    clearCache?: boolean;
    clearMutations?: boolean;
  } = {}) => {
    if (clearCache) {
      await OfflineService.clearCache();
    }
    if (clearMutations) {
      await OfflineService.clearMutations();
    }
    return { clearCache, clearMutations };
  }
);

const offlineSlice = createSlice({
  name: 'offline',
  initialState,
  reducers: {
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      const wasOffline = !state.isOnline;
      state.isOnline = action.payload;

      // If we just came back online, clear sync errors
      if (wasOffline && action.payload) {
        state.syncErrors = [];
      }
    },
    removeMutationFromQueue: (state, action: PayloadAction<string>) => {
      state.mutationQueue = state.mutationQueue.filter(m => m.id !== action.payload);
    },
    incrementMutationRetry: (state, action: PayloadAction<string>) => {
      const mutation = state.mutationQueue.find(m => m.id === action.payload);
      if (mutation) {
        mutation.retryCount += 1;
      }
    },
    updateSyncProgress: (state, action: PayloadAction<number>) => {
      state.syncProgress = Math.max(0, Math.min(100, action.payload));
    },
    addSyncError: (state, action: PayloadAction<string>) => {
      state.syncErrors.push(action.payload);
      // Keep only the last 10 errors
      if (state.syncErrors.length > 10) {
        state.syncErrors = state.syncErrors.slice(-10);
      }
    },
    clearSyncErrors: (state) => {
      state.syncErrors = [];
    },
    removeCachedData: (state, action: PayloadAction<string>) => {
      delete state.cachedData[action.payload];
    },
  },
  extraReducers: (builder) => {
    builder
      // Add offline mutation
      .addCase(addOfflineMutation.fulfilled, (state, action) => {
        state.mutationQueue.push(action.payload);
        // Sort by priority and timestamp
        state.mutationQueue.sort((a, b) => {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[b.priority] - priorityOrder[a.priority];
          }
          return a.timestamp - b.timestamp;
        });
      })

      // Process mutation queue
      .addCase(processMutationQueue.pending, (state) => {
        state.isSyncing = true;
        state.syncProgress = 0;
      })
      .addCase(processMutationQueue.fulfilled, (state, action) => {
        state.isSyncing = false;
        state.syncProgress = 100;
        state.lastSyncAt = Date.now();

        // Remove processed mutations from queue
        // This should be handled by the service, but we can double-check
        const { processed, failed } = action.payload;
        if (processed > 0) {
          // Remove successfully processed mutations
          // The service should have already called removeMutationFromQueue
        }
      })
      .addCase(processMutationQueue.rejected, (state, action) => {
        state.isSyncing = false;
        state.syncProgress = 0;
        state.syncErrors.push(action.error.message || 'Failed to process mutations');
      })

      // Sync offline data
      .addCase(syncOfflineData.pending, (state) => {
        state.isSyncing = true;
        state.syncProgress = 0;
      })
      .addCase(syncOfflineData.fulfilled, (state, action) => {
        state.isSyncing = false;
        state.syncProgress = 100;
        state.lastSyncAt = Date.now();
      })
      .addCase(syncOfflineData.rejected, (state, action) => {
        state.isSyncing = false;
        state.syncProgress = 0;
        state.syncErrors.push(action.error.message || 'Failed to sync data');
      })

      // Cache data
      .addCase(cacheData.fulfilled, (state, action) => {
        state.cachedData[action.payload.key] = action.payload;
      })

      // Clear expired cache
      .addCase(clearExpiredCache.fulfilled, (state, action) => {
        action.payload.forEach(key => {
          delete state.cachedData[key];
        });
      })

      // Update storage usage
      .addCase(updateStorageUsage.fulfilled, (state, action) => {
        state.storageUsage = action.payload;
      })

      // Clear offline data
      .addCase(clearOfflineData.fulfilled, (state, action) => {
        if (action.payload.clearCache) {
          state.cachedData = {};
        }
        if (action.payload.clearMutations) {
          state.mutationQueue = [];
        }
      });
  },
});

export const {
  setOnlineStatus,
  removeMutationFromQueue,
  incrementMutationRetry,
  updateSyncProgress,
  addSyncError,
  clearSyncErrors,
  removeCachedData,
} = offlineSlice.actions;

export default offlineSlice.reducer;

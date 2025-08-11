import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface PendingOperation {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: 'DOCUMENT' | 'COMMENT' | 'OPERATION';
  entityId: string;
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

interface NetworkState {
  isOnline: boolean;
  networkType?: string;
  isWiFi: boolean;
}

interface SyncState {
  isSyncing: boolean;
  lastSyncTime?: number;
  syncError?: string;
  pendingOperationsCount: number;
}

interface CacheState {
  size: number;
  maxSize: number;
  documentsCount: number;
  commentsCount: number;
  lastCleanupTime?: number;
}

interface OfflineState {
  network: NetworkState;
  sync: SyncState;
  cache: CacheState;
  pendingOperations: PendingOperation[];
  offlineDocuments: string[]; // Document IDs available offline
  preferences: {
    autoSync: boolean;
    syncOnWiFiOnly: boolean;
    cacheExpiration: number; // hours
    maxCacheSize: number; // bytes
  };
}

const initialState: OfflineState = {
  network: {
    isOnline: true,
    isWiFi: false,
  },
  sync: {
    isSyncing: false,
    pendingOperationsCount: 0,
  },
  cache: {
    size: 0,
    maxSize: 50 * 1024 * 1024, // 50MB
    documentsCount: 0,
    commentsCount: 0,
  },
  pendingOperations: [],
  offlineDocuments: [],
  preferences: {
    autoSync: true,
    syncOnWiFiOnly: false,
    cacheExpiration: 24, // 24 hours
    maxCacheSize: 50 * 1024 * 1024, // 50MB
  },
};

const offlineSlice = createSlice({
  name: 'offline',
  initialState,
  reducers: {
    // Network status
    setNetworkStatus: (state, action: PayloadAction<Partial<NetworkState>>) => {
      state.network = { ...state.network, ...action.payload };
    },

    // Sync status
    setSyncStatus: (state, action: PayloadAction<Partial<SyncState>>) => {
      state.sync = { ...state.sync, ...action.payload };
    },

    startSync: (state) => {
      state.sync.isSyncing = true;
      state.sync.syncError = undefined;
    },

    completeSync: (state, action: PayloadAction<{ timestamp: number; error?: string }>) => {
      state.sync.isSyncing = false;
      state.sync.lastSyncTime = action.payload.timestamp;
      state.sync.syncError = action.payload.error;
    },

    // Pending operations
    addPendingOperation: (state, action: PayloadAction<PendingOperation>) => {
      const existingIndex = state.pendingOperations.findIndex(
        op => op.id === action.payload.id
      );

      if (existingIndex >= 0) {
        state.pendingOperations[existingIndex] = action.payload;
      } else {
        state.pendingOperations.push(action.payload);
      }

      state.sync.pendingOperationsCount = state.pendingOperations.length;
    },

    removePendingOperation: (state, action: PayloadAction<string>) => {
      state.pendingOperations = state.pendingOperations.filter(
        op => op.id !== action.payload
      );
      state.sync.pendingOperationsCount = state.pendingOperations.length;
    },

    updatePendingOperation: (state, action: PayloadAction<{ id: string; updates: Partial<PendingOperation> }>) => {
      const index = state.pendingOperations.findIndex(op => op.id === action.payload.id);
      if (index >= 0) {
        state.pendingOperations[index] = {
          ...state.pendingOperations[index],
          ...action.payload.updates,
        };
      }
    },

    clearPendingOperations: (state) => {
      state.pendingOperations = [];
      state.sync.pendingOperationsCount = 0;
    },

    // Cache management
    updateCacheStats: (state, action: PayloadAction<Partial<CacheState>>) => {
      state.cache = { ...state.cache, ...action.payload };
    },

    addOfflineDocument: (state, action: PayloadAction<string>) => {
      if (!state.offlineDocuments.includes(action.payload)) {
        state.offlineDocuments.push(action.payload);
      }
    },

    removeOfflineDocument: (state, action: PayloadAction<string>) => {
      state.offlineDocuments = state.offlineDocuments.filter(
        id => id !== action.payload
      );
    },

    // Preferences
    updatePreferences: (state, action: PayloadAction<Partial<OfflineState['preferences']>>) => {
      state.preferences = { ...state.preferences, ...action.payload };
    },

    // Bulk operations
    resetOfflineState: () => initialState,

    hydrate: (state, action: PayloadAction<Partial<OfflineState>>) => {
      return { ...state, ...action.payload };
    },
  },
});

export const {
  setNetworkStatus,
  setSyncStatus,
  startSync,
  completeSync,
  addPendingOperation,
  removePendingOperation,
  updatePendingOperation,
  clearPendingOperations,
  updateCacheStats,
  addOfflineDocument,
  removeOfflineDocument,
  updatePreferences,
  resetOfflineState,
  hydrate,
} = offlineSlice.actions;

export default offlineSlice.reducer;

// Selectors
export const selectNetworkState = (state: { offline: OfflineState }) => state.offline.network;
export const selectSyncState = (state: { offline: OfflineState }) => state.offline.sync;
export const selectCacheState = (state: { offline: OfflineState }) => state.offline.cache;
export const selectPendingOperations = (state: { offline: OfflineState }) => state.offline.pendingOperations;
export const selectOfflineDocuments = (state: { offline: OfflineState }) => state.offline.offlineDocuments;
export const selectOfflinePreferences = (state: { offline: OfflineState }) => state.offline.preferences;

// Computed selectors
export const selectIsOffline = (state: { offline: OfflineState }) => !state.offline.network.isOnline;
export const selectCanSync = (state: { offline: OfflineState }) => {
  const { network, sync, preferences } = state.offline;
  return (
    network.isOnline &&
    !sync.isSyncing &&
    sync.pendingOperationsCount > 0 &&
    (!preferences.syncOnWiFiOnly || network.isWiFi)
  );
};
export const selectCacheUsagePercentage = (state: { offline: OfflineState }) => {
  const { cache } = state.offline;
  return (cache.size / cache.maxSize) * 100;
};
export const selectNeedsCleanup = (state: { offline: OfflineState }) => {
  const { cache } = state.offline;
  return cache.size > cache.maxSize * 0.8;
};

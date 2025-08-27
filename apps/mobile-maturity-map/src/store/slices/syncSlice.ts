import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../index';
import { SyncQueueItem } from '@/types/assessment';

interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  queue: SyncQueueItem[];
  lastSync: string | null;
  syncErrors: Array<{
    id: string;
    error: string;
    timestamp: string;
  }>;
}

const initialState: SyncState = {
  isOnline: true,
  isSyncing: false,
  queue: [],
  lastSync: null,
  syncErrors: [],
};

// Async thunks for sync operations
export const syncOfflineData = createAsyncThunk(
  'sync/syncOfflineData',
  async (_, { getState, dispatch }) => {
    const state = getState() as RootState;
    const { queue } = state.sync;
    
    if (!state.network.isOnline || queue.length === 0) {
      return { synced: 0, errors: 0 };
    }

    const results = {
      synced: 0,
      errors: 0,
    };

    // Process each item in the sync queue
    for (const item of queue) {
      try {
        await processSyncItem(item);
        dispatch(removeFromSyncQueue(item.id));
        results.synced++;
      } catch (error) {
        dispatch(updateSyncItemError({
          itemId: item.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
        results.errors++;
      }
    }

    return results;
  }
);

export const addToSyncQueue = createAsyncThunk(
  'sync/addToQueue',
  async (item: Omit<SyncQueueItem, 'id' | 'retryCount' | 'lastAttempt'>) => {
    const syncItem: SyncQueueItem = {
      ...item,
      id: `${item.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      retryCount: 0,
      lastAttempt: new Date().toISOString(),
    };
    
    return syncItem;
  }
);

// Helper function to process individual sync items
async function processSyncItem(item: SyncQueueItem): Promise<void> {
  const { type, action, data } = item;
  
  // This would typically make API calls to sync data
  switch (type) {
    case 'assessment':
      await syncAssessment(action, data);
      break;
    case 'document':
      await syncDocument(action, data);
      break;
    case 'response':
      await syncResponse(action, data);
      break;
    default:
      throw new Error(`Unknown sync type: ${type}`);
  }
}

// Mock sync functions - replace with actual API calls
async function syncAssessment(action: string, data: any): Promise<void> {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log(`Syncing assessment ${action}:`, data);
}

async function syncDocument(action: string, data: any): Promise<void> {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 2000));
  console.log(`Syncing document ${action}:`, data);
}

async function syncResponse(action: string, data: any): Promise<void> {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 500));
  console.log(`Syncing response ${action}:`, data);
}

const syncSlice = createSlice({
  name: 'sync',
  initialState,
  reducers: {
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
      
      // Auto-sync when coming back online
      if (action.payload && state.queue.length > 0) {
        // This will be handled by a middleware or effect
      }
    },
    
    removeFromSyncQueue: (state, action: PayloadAction<string>) => {
      state.queue = state.queue.filter(item => item.id !== action.payload);
    },
    
    updateSyncItemError: (state, action: PayloadAction<{ itemId: string; error: string }>) => {
      const item = state.queue.find(item => item.id === action.payload.itemId);
      if (item) {
        item.retryCount++;
        item.error = action.payload.error;
        item.lastAttempt = new Date().toISOString();
        
        // Remove item if it has failed too many times
        if (item.retryCount >= 3) {
          state.queue = state.queue.filter(qItem => qItem.id !== item.id);
          state.syncErrors.push({
            id: item.id,
            error: action.payload.error,
            timestamp: new Date().toISOString(),
          });
        }
      }
    },
    
    clearSyncErrors: (state) => {
      state.syncErrors = [];
    },
    
    retrySyncItem: (state, action: PayloadAction<string>) => {
      const item = state.queue.find(item => item.id === action.payload);
      if (item) {
        item.retryCount = 0;
        item.error = undefined;
      }
    },
  },
  
  extraReducers: (builder) => {
    builder
      .addCase(syncOfflineData.pending, (state) => {
        state.isSyncing = true;
      })
      .addCase(syncOfflineData.fulfilled, (state, action) => {
        state.isSyncing = false;
        state.lastSync = new Date().toISOString();
        
        if (action.payload.synced > 0) {
          console.log(`Synced ${action.payload.synced} items successfully`);
        }
        
        if (action.payload.errors > 0) {
          console.warn(`Failed to sync ${action.payload.errors} items`);
        }
      })
      .addCase(syncOfflineData.rejected, (state, action) => {
        state.isSyncing = false;
        console.error('Sync failed:', action.error.message);
      })
      .addCase(addToSyncQueue.fulfilled, (state, action) => {
        state.queue.push(action.payload);
      });
  },
});

export const {
  setOnlineStatus,
  removeFromSyncQueue,
  updateSyncItemError,
  clearSyncErrors,
  retrySyncItem,
} = syncSlice.actions;

export default syncSlice.reducer;

// Selectors
export const selectSyncStatus = (state: RootState) => ({
  isOnline: state.sync.isOnline,
  isSyncing: state.sync.isSyncing,
  queueLength: state.sync.queue.length,
  lastSync: state.sync.lastSync,
  hasErrors: state.sync.syncErrors.length > 0,
});

export const selectSyncQueue = (state: RootState) => state.sync.queue;
export const selectSyncErrors = (state: RootState) => state.sync.syncErrors;
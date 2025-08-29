import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { OfflinePrompt, NetworkStatus } from '@/types';

interface OfflineState {
  isOnline: boolean;
  networkStatus: NetworkStatus;
  offlineQueue: OfflinePrompt[];
  syncInProgress: boolean;
  lastSync: number | null;
  error: string | null;
}

const initialState: OfflineState = {
  isOnline: true,
  networkStatus: {
    isConnected: true,
    type: 'wifi',
    isInternetReachable: true,
  },
  offlineQueue: [],
  syncInProgress: false,
  lastSync: null,
  error: null,
};

const offlineSlice = createSlice({
  name: 'offline',
  initialState,
  reducers: {
    setNetworkStatus: (state, action: PayloadAction<NetworkStatus>) => {
      state.networkStatus = action.payload;
      state.isOnline = action.payload.isConnected && action.payload.isInternetReachable;
    },
    addToOfflineQueue: (state, action: PayloadAction<OfflinePrompt>) => {
      // Add to queue with priority sorting
      const newItem = action.payload;
      const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
      
      let insertIndex = state.offlineQueue.length;
      for (let i = 0; i < state.offlineQueue.length; i++) {
        if (priorityOrder[newItem.priority] < priorityOrder[state.offlineQueue[i].priority]) {
          insertIndex = i;
          break;
        }
      }
      
      state.offlineQueue.splice(insertIndex, 0, newItem);
    },
    removeFromOfflineQueue: (state, action: PayloadAction<string>) => {
      state.offlineQueue = state.offlineQueue.filter(item => item.id !== action.payload);
    },
    incrementRetryCount: (state, action: PayloadAction<string>) => {
      const item = state.offlineQueue.find(item => item.id === action.payload);
      if (item) {
        item.retryCount += 1;
      }
    },
    startSync: (state) => {
      state.syncInProgress = true;
      state.error = null;
    },
    completeSync: (state, action: PayloadAction<{ processedIds: string[] }>) => {
      state.syncInProgress = false;
      state.lastSync = Date.now();
      
      // Remove successfully processed items from queue
      state.offlineQueue = state.offlineQueue.filter(
        item => !action.payload.processedIds.includes(item.id)
      );
    },
    failSync: (state, action: PayloadAction<string>) => {
      state.syncInProgress = false;
      state.error = action.payload;
    },
    clearOfflineQueue: (state) => {
      state.offlineQueue = [];
    },
    updateQueueItemPriority: (state, action: PayloadAction<{ id: string; priority: 'low' | 'normal' | 'high' | 'critical' }>) => {
      const item = state.offlineQueue.find(item => item.id === action.payload.id);
      if (item) {
        item.priority = action.payload.priority;
        
        // Re-sort queue based on new priority
        const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
        state.offlineQueue.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  setNetworkStatus,
  addToOfflineQueue,
  removeFromOfflineQueue,
  incrementRetryCount,
  startSync,
  completeSync,
  failSync,
  clearOfflineQueue,
  updateQueueItemPriority,
  clearError,
} = offlineSlice.actions;

export default offlineSlice.reducer;
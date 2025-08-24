import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { inventoryRepository } from '../../database/repositories/InventoryRepository';
import { client, offlineQueueManager, networkStatusManager } from '../../graphql/client';
import {
  GET_INVENTORY_ITEMS,
  CREATE_INVENTORY_ITEM,
  UPDATE_INVENTORY_ITEM,
  DELETE_INVENTORY_ITEM,
  BULK_UPDATE_INVENTORY
} from '../../graphql/schema';

interface SyncError {
  itemId?: string;
  operation: string;
  error: string;
  timestamp: string;
}

interface SyncStats {
  itemsProcessed: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsDeleted: number;
  errors: number;
  startTime: string;
  endTime?: string;
  duration?: number; // milliseconds
}

interface SyncState {
  status: 'idle' | 'syncing' | 'success' | 'error';
  progress: number; // 0-100
  isOnline: boolean;
  lastSyncTime: string | null;
  lastFullSyncTime: string | null;
  queuedOperations: number;
  errors: SyncError[];
  stats: SyncStats | null;
  autoSyncEnabled: boolean;
  syncFrequency: number; // minutes
  lastSyncAttempt: string | null;
  conflictCount: number;
}

const initialState: SyncState = {
  status: 'idle',
  progress: 0,
  isOnline: networkStatusManager.getIsOnline(),
  lastSyncTime: null,
  lastFullSyncTime: null,
  queuedOperations: 0,
  errors: [],
  stats: null,
  autoSyncEnabled: true,
  syncFrequency: 5, // 5 minutes
  lastSyncAttempt: null,
  conflictCount: 0,
};

// Async thunks
export const performFullSync = createAsyncThunk(
  'sync/performFullSync',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const startTime = new Date().toISOString();
      let stats: SyncStats = {
        itemsProcessed: 0,
        itemsCreated: 0,
        itemsUpdated: 0,
        itemsDeleted: 0,
        errors: 0,
        startTime,
      };

      dispatch(setSyncStatus({ status: 'syncing', progress: 0 }));

      // Step 1: Process offline queue first
      dispatch(setSyncStatus({ progress: 10 }));
      await offlineQueueManager.processQueue();

      // Step 2: Sync local changes to server
      dispatch(setSyncStatus({ progress: 30 }));
      const pendingItems = await inventoryRepository.findPendingSync();

      for (let i = 0; i < pendingItems.length; i++) {
        const item = pendingItems[i];
        dispatch(setSyncStatus({
          progress: 30 + Math.round((i / pendingItems.length) * 30)
        }));

        try {
          if (item.remoteId) {
            // Update existing item
            await client.mutate({
              mutation: UPDATE_INVENTORY_ITEM,
              variables: {
                id: item.remoteId,
                input: {
                  name: item.name,
                  description: item.description,
                  barcode: item.barcode,
                  sku: item.sku,
                  category: item.category,
                  quantity: item.quantity,
                  minQuantity: item.minQuantity,
                  maxQuantity: item.maxQuantity,
                  unitPrice: item.unitPrice,
                  location: item.location,
                  supplier: item.supplier,
                  imageUri: item.imageUri,
                  tags: JSON.parse(item.tags || '[]'),
                },
              },
            });
            stats.itemsUpdated++;
          } else {
            // Create new item
            const result = await client.mutate({
              mutation: CREATE_INVENTORY_ITEM,
              variables: {
                input: {
                  name: item.name,
                  description: item.description,
                  barcode: item.barcode,
                  sku: item.sku,
                  category: item.category,
                  quantity: item.quantity,
                  minQuantity: item.minQuantity,
                  maxQuantity: item.maxQuantity,
                  unitPrice: item.unitPrice,
                  location: item.location,
                  supplier: item.supplier,
                  imageUri: item.imageUri,
                  tags: JSON.parse(item.tags || '[]'),
                },
              },
            });

            if (result.data?.createInventoryItem) {
              await inventoryRepository.markAsSynced(item.id, result.data.createInventoryItem.id);
              stats.itemsCreated++;
            }
          }

          if (!item.isActive && item.remoteId) {
            // Delete item
            await client.mutate({
              mutation: DELETE_INVENTORY_ITEM,
              variables: { id: item.remoteId },
            });
            stats.itemsDeleted++;
          }

          await inventoryRepository.markAsSynced(item.id, item.remoteId);
          stats.itemsProcessed++;

        } catch (error) {
          console.error(`Failed to sync item ${item.id}:`, error);
          stats.errors++;
          dispatch(addSyncError({
            itemId: item.id,
            operation: item.remoteId ? 'update' : 'create',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
          }));
        }
      }

      // Step 3: Fetch remote changes
      dispatch(setSyncStatus({ progress: 70 }));
      try {
        const result = await client.query({
          query: GET_INVENTORY_ITEMS,
          variables: { limit: 1000 }, // Adjust based on your needs
          fetchPolicy: 'network-only', // Force network fetch
        });

        if (result.data?.inventoryItems?.items) {
          const remoteItems = result.data.inventoryItems.items;

          for (let i = 0; i < remoteItems.length; i++) {
            const remoteItem = remoteItems[i];
            dispatch(setSyncStatus({
              progress: 70 + Math.round((i / remoteItems.length) * 20)
            }));

            try {
              const localItem = await inventoryRepository.findById(remoteItem.id);

              if (!localItem) {
                // Create local item from remote
                await inventoryRepository.create({
                  name: remoteItem.name,
                  description: remoteItem.description,
                  barcode: remoteItem.barcode,
                  sku: remoteItem.sku,
                  category: remoteItem.category,
                  quantity: remoteItem.quantity,
                  minQuantity: remoteItem.minQuantity,
                  maxQuantity: remoteItem.maxQuantity,
                  unitPrice: remoteItem.unitPrice,
                  totalValue: remoteItem.totalValue,
                  location: remoteItem.location,
                  supplier: remoteItem.supplier,
                  imageUri: remoteItem.imageUri,
                  tags: JSON.stringify(remoteItem.tags),
                  isActive: remoteItem.isActive,
                  syncStatus: 'synced',
                  remoteId: remoteItem.id,
                });
                stats.itemsCreated++;
              } else if (localItem.syncStatus === 'synced') {
                // Update local item if remote is newer
                const remoteUpdated = new Date(remoteItem.lastUpdated);
                const localUpdated = new Date(localItem.lastUpdated);

                if (remoteUpdated > localUpdated) {
                  await inventoryRepository.update(localItem.id, {
                    name: remoteItem.name,
                    description: remoteItem.description,
                    barcode: remoteItem.barcode,
                    sku: remoteItem.sku,
                    category: remoteItem.category,
                    quantity: remoteItem.quantity,
                    minQuantity: remoteItem.minQuantity,
                    maxQuantity: remoteItem.maxQuantity,
                    unitPrice: remoteItem.unitPrice,
                    totalValue: remoteItem.totalValue,
                    location: remoteItem.location,
                    supplier: remoteItem.supplier,
                    imageUri: remoteItem.imageUri,
                    tags: JSON.stringify(remoteItem.tags),
                    isActive: remoteItem.isActive,
                    syncStatus: 'synced',
                  });
                  stats.itemsUpdated++;
                }
              }
            } catch (error) {
              console.error(`Failed to process remote item ${remoteItem.id}:`, error);
              stats.errors++;
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch remote items:', error);
        throw error;
      }

      // Complete sync
      dispatch(setSyncStatus({ progress: 100 }));

      const endTime = new Date().toISOString();
      stats.endTime = endTime;
      stats.duration = new Date(endTime).getTime() - new Date(startTime).getTime();

      return {
        success: true,
        stats,
        timestamp: endTime,
      };

    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Sync failed');
    }
  }
);

export const performIncrementalSync = createAsyncThunk(
  'sync/performIncrementalSync',
  async (_, { getState, dispatch, rejectWithValue }) => {
    try {
      const state = getState() as { sync: SyncState };
      const lastSyncTime = state.sync.lastSyncTime;

      if (!lastSyncTime) {
        // No previous sync, perform full sync
        return dispatch(performFullSync());
      }

      const startTime = new Date().toISOString();
      dispatch(setSyncStatus({ status: 'syncing', progress: 0 }));

      // Process only pending items and recent changes
      const pendingItems = await inventoryRepository.findPendingSync();

      let processed = 0;
      const errors: SyncError[] = [];

      for (const item of pendingItems) {
        try {
          if (item.remoteId) {
            await client.mutate({
              mutation: UPDATE_INVENTORY_ITEM,
              variables: { id: item.remoteId, input: { /* item data */ } },
            });
          } else {
            const result = await client.mutate({
              mutation: CREATE_INVENTORY_ITEM,
              variables: { input: { /* item data */ } },
            });

            if (result.data?.createInventoryItem) {
              await inventoryRepository.markAsSynced(item.id, result.data.createInventoryItem.id);
            }
          }

          await inventoryRepository.markAsSynced(item.id, item.remoteId);
          processed++;

        } catch (error) {
          errors.push({
            itemId: item.id,
            operation: 'sync',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
          });
        }

        dispatch(setSyncStatus({
          progress: Math.round((processed / pendingItems.length) * 100)
        }));
      }

      return {
        success: true,
        processed,
        errors,
        timestamp: startTime,
      };

    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Incremental sync failed');
    }
  }
);

export const checkNetworkAndSync = createAsyncThunk(
  'sync/checkNetworkAndSync',
  async (_, { dispatch, getState }) => {
    const isOnline = networkStatusManager.getIsOnline();
    dispatch(setOnlineStatus(isOnline));

    if (isOnline) {
      const state = getState() as { sync: SyncState };
      const queuedOperations = offlineQueueManager.getQueueLength();

      dispatch(setQueuedOperations(queuedOperations));

      if (queuedOperations > 0 || state.sync.autoSyncEnabled) {
        return dispatch(performIncrementalSync());
      }
    }

    return { isOnline, synced: false };
  }
);

const syncSlice = createSlice({
  name: 'sync',
  initialState,
  reducers: {
    setSyncStatus: (state, action: PayloadAction<{
      status?: SyncState['status'];
      progress?: number;
    }>) => {
      if (action.payload.status !== undefined) {
        state.status = action.payload.status;
      }
      if (action.payload.progress !== undefined) {
        state.progress = action.payload.progress;
      }
    },
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
    },
    setQueuedOperations: (state, action: PayloadAction<number>) => {
      state.queuedOperations = action.payload;
    },
    addSyncError: (state, action: PayloadAction<SyncError>) => {
      state.errors.push(action.payload);
      // Keep only last 50 errors
      if (state.errors.length > 50) {
        state.errors = state.errors.slice(-50);
      }
    },
    clearSyncErrors: (state) => {
      state.errors = [];
    },
    setAutoSync: (state, action: PayloadAction<boolean>) => {
      state.autoSyncEnabled = action.payload;
    },
    setSyncFrequency: (state, action: PayloadAction<number>) => {
      state.syncFrequency = action.payload;
    },
    updateLastSyncAttempt: (state) => {
      state.lastSyncAttempt = new Date().toISOString();
    },
    incrementConflictCount: (state) => {
      state.conflictCount += 1;
    },
    resetConflictCount: (state) => {
      state.conflictCount = 0;
    },
  },
  extraReducers: (builder) => {
    // Full sync
    builder
      .addCase(performFullSync.pending, (state) => {
        state.status = 'syncing';
        state.progress = 0;
        state.lastSyncAttempt = new Date().toISOString();
      })
      .addCase(performFullSync.fulfilled, (state, action) => {
        state.status = 'success';
        state.progress = 100;
        state.lastSyncTime = action.payload.timestamp;
        state.lastFullSyncTime = action.payload.timestamp;
        state.stats = action.payload.stats;
        state.queuedOperations = 0;
      })
      .addCase(performFullSync.rejected, (state, action) => {
        state.status = 'error';
        state.errors.push({
          operation: 'full_sync',
          error: action.payload as string,
          timestamp: new Date().toISOString(),
        });
      });

    // Incremental sync
    builder
      .addCase(performIncrementalSync.fulfilled, (state, action) => {
        state.status = 'success';
        state.progress = 100;
        state.lastSyncTime = action.payload.timestamp;
        state.queuedOperations = Math.max(0, state.queuedOperations - action.payload.processed);

        if (action.payload.errors) {
          state.errors.push(...action.payload.errors);
        }
      })
      .addCase(performIncrementalSync.rejected, (state, action) => {
        state.status = 'error';
        state.errors.push({
          operation: 'incremental_sync',
          error: action.payload as string,
          timestamp: new Date().toISOString(),
        });
      });

    // Network check and sync
    builder
      .addCase(checkNetworkAndSync.fulfilled, (state, action) => {
        state.isOnline = action.payload.isOnline;
        if (action.payload.synced) {
          state.lastSyncTime = new Date().toISOString();
        }
      });
  },
});

export const {
  setSyncStatus,
  setOnlineStatus,
  setQueuedOperations,
  addSyncError,
  clearSyncErrors,
  setAutoSync,
  setSyncFrequency,
  updateLastSyncAttempt,
  incrementConflictCount,
  resetConflictCount,
} = syncSlice.actions;

export default syncSlice.reducer;

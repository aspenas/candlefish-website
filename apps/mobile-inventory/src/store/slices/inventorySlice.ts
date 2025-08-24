import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { InventoryItem } from '../../graphql/schema';
import { inventoryRepository } from '../../database/repositories/InventoryRepository';

interface InventoryState {
  items: InventoryItem[];
  loading: boolean;
  error: string | null;
  categories: string[];
  totalValue: number;
  totalItems: number;
  lowStockItems: InventoryItem[];
  selectedItem: InventoryItem | null;
  searchQuery: string;
  selectedCategory: string | null;
  currentPage: number;
  hasMoreItems: boolean;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  lastSyncTime: string | null;
}

const initialState: InventoryState = {
  items: [],
  loading: false,
  error: null,
  categories: [],
  totalValue: 0,
  totalItems: 0,
  lowStockItems: [],
  selectedItem: null,
  searchQuery: '',
  selectedCategory: null,
  currentPage: 0,
  hasMoreItems: true,
  syncStatus: 'idle',
  lastSyncTime: null,
};

// Async thunks for database operations
export const loadInventoryItems = createAsyncThunk(
  'inventory/loadItems',
  async ({
    offset = 0,
    limit = 50,
    category,
    searchQuery,
    refresh = false
  }: {
    offset?: number;
    limit?: number;
    category?: string;
    searchQuery?: string;
    refresh?: boolean;
  }) => {
    const items = await inventoryRepository.findAll(offset, limit, category, searchQuery);
    const totalCount = await inventoryRepository.getCount();
    const totalValue = await inventoryRepository.getTotalValue();
    const categories = await inventoryRepository.getCategories();
    const lowStockItems = await inventoryRepository.findLowStock();

    return {
      items,
      totalCount,
      totalValue,
      categories,
      lowStockItems,
      hasMore: items.length === limit,
      refresh,
    };
  }
);

export const createInventoryItem = createAsyncThunk(
  'inventory/createItem',
  async (itemData: Omit<InventoryItem, 'id' | 'dateAdded' | 'lastUpdated' | 'version'>) => {
    const newItem = await inventoryRepository.create(itemData);
    return newItem;
  }
);

export const updateInventoryItem = createAsyncThunk(
  'inventory/updateItem',
  async ({ id, updates }: { id: string; updates: Partial<Omit<InventoryItem, 'id' | 'dateAdded' | 'version'>> }) => {
    const updatedItem = await inventoryRepository.update(id, updates);
    return updatedItem;
  }
);

export const updateItemQuantity = createAsyncThunk(
  'inventory/updateQuantity',
  async ({ id, quantity }: { id: string; quantity: number }) => {
    const updatedItem = await inventoryRepository.updateQuantity(id, quantity);
    return updatedItem;
  }
);

export const deleteInventoryItem = createAsyncThunk(
  'inventory/deleteItem',
  async (id: string) => {
    const success = await inventoryRepository.delete(id);
    if (success) {
      return id;
    }
    throw new Error('Failed to delete item');
  }
);

export const loadItemById = createAsyncThunk(
  'inventory/loadItemById',
  async (id: string) => {
    const item = await inventoryRepository.findById(id);
    if (!item) {
      throw new Error('Item not found');
    }
    return item;
  }
);

export const searchByBarcode = createAsyncThunk(
  'inventory/searchByBarcode',
  async (barcode: string) => {
    const item = await inventoryRepository.findByBarcode(barcode);
    return item;
  }
);

export const searchBySku = createAsyncThunk(
  'inventory/searchBySku',
  async (sku: string) => {
    const item = await inventoryRepository.findBySku(sku);
    return item;
  }
);

export const refreshStats = createAsyncThunk(
  'inventory/refreshStats',
  async () => {
    const [totalValue, totalItems, categories, lowStockItems] = await Promise.all([
      inventoryRepository.getTotalValue(),
      inventoryRepository.getCount(),
      inventoryRepository.getCategories(),
      inventoryRepository.findLowStock(),
    ]);

    return {
      totalValue,
      totalItems,
      categories,
      lowStockItems,
    };
  }
);

const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
      state.currentPage = 0;
      state.hasMoreItems = true;
    },
    setSelectedCategory: (state, action: PayloadAction<string | null>) => {
      state.selectedCategory = action.payload;
      state.currentPage = 0;
      state.hasMoreItems = true;
    },
    setSelectedItem: (state, action: PayloadAction<InventoryItem | null>) => {
      state.selectedItem = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearItems: (state) => {
      state.items = [];
      state.currentPage = 0;
      state.hasMoreItems = true;
    },
    setSyncStatus: (state, action: PayloadAction<InventoryState['syncStatus']>) => {
      state.syncStatus = action.payload;
      if (action.payload === 'success') {
        state.lastSyncTime = new Date().toISOString();
      }
    },
    updateLocalItem: (state, action: PayloadAction<InventoryItem>) => {
      const index = state.items.findIndex(item => item.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }

      // Update selected item if it's the same
      if (state.selectedItem?.id === action.payload.id) {
        state.selectedItem = action.payload;
      }
    },
    addLocalItem: (state, action: PayloadAction<InventoryItem>) => {
      state.items.unshift(action.payload);
      state.totalItems += 1;
      state.totalValue += action.payload.totalValue;
    },
    removeLocalItem: (state, action: PayloadAction<string>) => {
      const itemIndex = state.items.findIndex(item => item.id === action.payload);
      if (itemIndex !== -1) {
        const item = state.items[itemIndex];
        state.totalValue -= item.totalValue;
        state.totalItems -= 1;
        state.items.splice(itemIndex, 1);
      }

      // Clear selected item if it's the one being removed
      if (state.selectedItem?.id === action.payload) {
        state.selectedItem = null;
      }
    },
  },
  extraReducers: (builder) => {
    // Load inventory items
    builder
      .addCase(loadInventoryItems.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadInventoryItems.fulfilled, (state, action) => {
        state.loading = false;

        const { items, totalCount, totalValue, categories, lowStockItems, hasMore, refresh } = action.payload;

        if (refresh || state.currentPage === 0) {
          state.items = items;
        } else {
          state.items = [...state.items, ...items];
        }

        state.totalItems = totalCount;
        state.totalValue = totalValue;
        state.categories = categories;
        state.lowStockItems = lowStockItems;
        state.hasMoreItems = hasMore;
        state.currentPage += 1;
      })
      .addCase(loadInventoryItems.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to load inventory items';
      });

    // Create inventory item
    builder
      .addCase(createInventoryItem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createInventoryItem.fulfilled, (state, action) => {
        state.loading = false;
        state.items.unshift(action.payload);
        state.totalItems += 1;
        state.totalValue += action.payload.totalValue;
      })
      .addCase(createInventoryItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create item';
      });

    // Update inventory item
    builder
      .addCase(updateInventoryItem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateInventoryItem.fulfilled, (state, action) => {
        state.loading = false;
        const updatedItem = action.payload;
        const index = state.items.findIndex(item => item.id === updatedItem.id);

        if (index !== -1) {
          const oldItem = state.items[index];
          state.totalValue = state.totalValue - oldItem.totalValue + updatedItem.totalValue;
          state.items[index] = updatedItem;
        }

        if (state.selectedItem?.id === updatedItem.id) {
          state.selectedItem = updatedItem;
        }
      })
      .addCase(updateInventoryItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update item';
      });

    // Update item quantity
    builder
      .addCase(updateItemQuantity.fulfilled, (state, action) => {
        const updatedItem = action.payload;
        const index = state.items.findIndex(item => item.id === updatedItem.id);

        if (index !== -1) {
          const oldItem = state.items[index];
          state.totalValue = state.totalValue - oldItem.totalValue + updatedItem.totalValue;
          state.items[index] = updatedItem;
        }

        if (state.selectedItem?.id === updatedItem.id) {
          state.selectedItem = updatedItem;
        }
      });

    // Delete inventory item
    builder
      .addCase(deleteInventoryItem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteInventoryItem.fulfilled, (state, action) => {
        state.loading = false;
        const deletedId = action.payload;
        const index = state.items.findIndex(item => item.id === deletedId);

        if (index !== -1) {
          const deletedItem = state.items[index];
          state.totalValue -= deletedItem.totalValue;
          state.totalItems -= 1;
          state.items.splice(index, 1);
        }

        if (state.selectedItem?.id === deletedId) {
          state.selectedItem = null;
        }
      })
      .addCase(deleteInventoryItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to delete item';
      });

    // Load item by ID
    builder
      .addCase(loadItemById.fulfilled, (state, action) => {
        state.selectedItem = action.payload;
      })
      .addCase(loadItemById.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to load item';
      });

    // Search by barcode
    builder
      .addCase(searchByBarcode.fulfilled, (state, action) => {
        if (action.payload) {
          state.selectedItem = action.payload;
        }
      });

    // Search by SKU
    builder
      .addCase(searchBySku.fulfilled, (state, action) => {
        if (action.payload) {
          state.selectedItem = action.payload;
        }
      });

    // Refresh stats
    builder
      .addCase(refreshStats.fulfilled, (state, action) => {
        const { totalValue, totalItems, categories, lowStockItems } = action.payload;
        state.totalValue = totalValue;
        state.totalItems = totalItems;
        state.categories = categories;
        state.lowStockItems = lowStockItems;
      });
  },
});

export const {
  setSearchQuery,
  setSelectedCategory,
  setSelectedItem,
  clearError,
  clearItems,
  setSyncStatus,
  updateLocalItem,
  addLocalItem,
  removeLocalItem,
} = inventorySlice.actions;

export default inventorySlice.reducer;

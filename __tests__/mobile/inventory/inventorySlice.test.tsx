// React Native Redux Slice Tests for Inventory Management
import { configureStore } from '@reduxjs/toolkit';
import inventoryReducer, {
  setSearchQuery,
  setSelectedCategory,
  setSelectedItem,
  clearError,
  clearItems,
  setSyncStatus,
  updateLocalItem,
  addLocalItem,
  removeLocalItem,
  loadInventoryItems,
  createInventoryItem,
  updateInventoryItem,
  updateItemQuantity,
  deleteInventoryItem,
  loadItemById,
  searchByBarcode,
  searchBySku,
  refreshStats,
} from '../../../apps/mobile-inventory/src/store/slices/inventorySlice';

// Mock the inventory repository
const mockInventoryRepository = {
  findAll: jest.fn(),
  getCount: jest.fn(),
  getTotalValue: jest.fn(),
  getCategories: jest.fn(),
  findLowStock: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateQuantity: jest.fn(),
  delete: jest.fn(),
  findById: jest.fn(),
  findByBarcode: jest.fn(),
  findBySku: jest.fn(),
};

jest.mock('../../../apps/mobile-inventory/src/database/repositories/InventoryRepository', () => ({
  inventoryRepository: mockInventoryRepository
}));

// Sample test data
const sampleItem = {
  id: '1',
  name: 'West Elm Sectional Sofa',
  description: 'Beautiful brown leather sectional',
  category: 'Furniture',
  sku: 'WE-SECT-001',
  barcode: '1234567890123',
  quantity: 1,
  unitPrice: 3500.00,
  totalValue: 3500.00,
  location: 'Living Room',
  lowStockThreshold: 1,
  isLowStock: false,
  tags: ['leather', 'sectional'],
  notes: 'Main living room centerpiece',
  photos: ['photo1.jpg', 'photo2.jpg'],
  dateAdded: '2024-01-01T10:00:00Z',
  lastUpdated: '2024-01-01T10:00:00Z',
  version: 1,
};

const sampleItems = [
  sampleItem,
  {
    ...sampleItem,
    id: '2',
    name: 'Moroccan Area Rug',
    category: 'Rug / Carpet',
    sku: 'PB-RUG-002',
    barcode: '1234567890124',
    quantity: 1,
    unitPrice: 2200.00,
    totalValue: 2200.00,
    location: 'Living Room',
  },
  {
    ...sampleItem,
    id: '3',
    name: 'Table Lamp',
    category: 'Lighting',
    sku: 'CB2-LAMP-003',
    barcode: '1234567890125',
    quantity: 2,
    unitPrice: 150.00,
    totalValue: 300.00,
    location: 'Master Bedroom',
    lowStockThreshold: 5,
    isLowStock: true,
  }
];

describe('Inventory Slice', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        inventory: inventoryReducer,
      },
    });
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = store.getState().inventory;

      expect(state).toEqual({
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
      });
    });
  });

  describe('Synchronous Actions', () => {
    describe('setSearchQuery', () => {
      it('should set search query and reset pagination', () => {
        // Set initial state with some data
        store.dispatch(setSelectedCategory('Furniture'));
        const initialState = store.getState().inventory;
        expect(initialState.currentPage).toBe(0);

        // Simulate page advancement
        store = configureStore({
          reducer: { inventory: inventoryReducer },
          preloadedState: {
            inventory: {
              ...initialState,
              currentPage: 2,
              hasMoreItems: false
            }
          }
        });

        store.dispatch(setSearchQuery('sofa'));
        const state = store.getState().inventory;

        expect(state.searchQuery).toBe('sofa');
        expect(state.currentPage).toBe(0);
        expect(state.hasMoreItems).toBe(true);
      });

      it('should handle empty search query', () => {
        store.dispatch(setSearchQuery(''));
        const state = store.getState().inventory;

        expect(state.searchQuery).toBe('');
        expect(state.currentPage).toBe(0);
      });
    });

    describe('setSelectedCategory', () => {
      it('should set selected category and reset pagination', () => {
        store.dispatch(setSelectedCategory('Furniture'));
        const state = store.getState().inventory;

        expect(state.selectedCategory).toBe('Furniture');
        expect(state.currentPage).toBe(0);
        expect(state.hasMoreItems).toBe(true);
      });

      it('should handle null category (clear filter)', () => {
        store.dispatch(setSelectedCategory('Furniture'));
        store.dispatch(setSelectedCategory(null));
        const state = store.getState().inventory;

        expect(state.selectedCategory).toBe(null);
        expect(state.currentPage).toBe(0);
      });
    });

    describe('setSelectedItem', () => {
      it('should set selected item', () => {
        store.dispatch(setSelectedItem(sampleItem));
        const state = store.getState().inventory;

        expect(state.selectedItem).toEqual(sampleItem);
      });

      it('should clear selected item when set to null', () => {
        store.dispatch(setSelectedItem(sampleItem));
        store.dispatch(setSelectedItem(null));
        const state = store.getState().inventory;

        expect(state.selectedItem).toBe(null);
      });
    });

    describe('clearError', () => {
      it('should clear error state', () => {
        // Set up store with error
        store = configureStore({
          reducer: { inventory: inventoryReducer },
          preloadedState: {
            inventory: {
              ...store.getState().inventory,
              error: 'Some error occurred'
            }
          }
        });

        store.dispatch(clearError());
        const state = store.getState().inventory;

        expect(state.error).toBe(null);
      });
    });

    describe('clearItems', () => {
      it('should clear items and reset pagination', () => {
        // Set up store with items
        store = configureStore({
          reducer: { inventory: inventoryReducer },
          preloadedState: {
            inventory: {
              ...store.getState().inventory,
              items: sampleItems,
              currentPage: 2,
              hasMoreItems: false
            }
          }
        });

        store.dispatch(clearItems());
        const state = store.getState().inventory;

        expect(state.items).toEqual([]);
        expect(state.currentPage).toBe(0);
        expect(state.hasMoreItems).toBe(true);
      });
    });

    describe('setSyncStatus', () => {
      it('should set sync status', () => {
        store.dispatch(setSyncStatus('syncing'));
        const state = store.getState().inventory;

        expect(state.syncStatus).toBe('syncing');
        expect(state.lastSyncTime).toBe(null);
      });

      it('should set last sync time when status is success', () => {
        const beforeTime = new Date().toISOString();
        store.dispatch(setSyncStatus('success'));
        const afterTime = new Date().toISOString();
        const state = store.getState().inventory;

        expect(state.syncStatus).toBe('success');
        expect(state.lastSyncTime).not.toBe(null);
        expect(state.lastSyncTime).toBeDefined();

        // Check that lastSyncTime is between before and after times
        if (state.lastSyncTime) {
          expect(new Date(state.lastSyncTime).getTime()).toBeGreaterThanOrEqual(new Date(beforeTime).getTime());
          expect(new Date(state.lastSyncTime).getTime()).toBeLessThanOrEqual(new Date(afterTime).getTime());
        }
      });
    });

    describe('updateLocalItem', () => {
      it('should update existing item in store', () => {
        // Set up store with items
        store = configureStore({
          reducer: { inventory: inventoryReducer },
          preloadedState: {
            inventory: {
              ...store.getState().inventory,
              items: sampleItems,
              selectedItem: sampleItem
            }
          }
        });

        const updatedItem = { ...sampleItem, quantity: 2, totalValue: 7000 };
        store.dispatch(updateLocalItem(updatedItem));
        const state = store.getState().inventory;

        expect(state.items[0]).toEqual(updatedItem);
        expect(state.selectedItem).toEqual(updatedItem);
      });

      it('should not modify store if item not found', () => {
        const nonExistentItem = { ...sampleItem, id: 'nonexistent' };
        store.dispatch(updateLocalItem(nonExistentItem));
        const state = store.getState().inventory;

        expect(state.items).toEqual([]);
        expect(state.selectedItem).toBe(null);
      });
    });

    describe('addLocalItem', () => {
      it('should add item to beginning of list and update totals', () => {
        const newItem = { ...sampleItem, id: 'new-item' };
        store.dispatch(addLocalItem(newItem));
        const state = store.getState().inventory;

        expect(state.items[0]).toEqual(newItem);
        expect(state.items).toHaveLength(1);
        expect(state.totalItems).toBe(1);
        expect(state.totalValue).toBe(newItem.totalValue);
      });

      it('should prepend to existing items', () => {
        // Set up store with existing items
        store = configureStore({
          reducer: { inventory: inventoryReducer },
          preloadedState: {
            inventory: {
              ...store.getState().inventory,
              items: [sampleItems[0]],
              totalItems: 1,
              totalValue: 3500
            }
          }
        });

        const newItem = { ...sampleItem, id: 'new-item', totalValue: 1000 };
        store.dispatch(addLocalItem(newItem));
        const state = store.getState().inventory;

        expect(state.items[0]).toEqual(newItem);
        expect(state.items[1]).toEqual(sampleItems[0]);
        expect(state.items).toHaveLength(2);
        expect(state.totalItems).toBe(2);
        expect(state.totalValue).toBe(4500);
      });
    });

    describe('removeLocalItem', () => {
      it('should remove item and update totals', () => {
        // Set up store with items
        store = configureStore({
          reducer: { inventory: inventoryReducer },
          preloadedState: {
            inventory: {
              ...store.getState().inventory,
              items: sampleItems,
              totalItems: 3,
              totalValue: 6000,
              selectedItem: sampleItems[0]
            }
          }
        });

        store.dispatch(removeLocalItem('1'));
        const state = store.getState().inventory;

        expect(state.items).toHaveLength(2);
        expect(state.items.find(item => item.id === '1')).toBeUndefined();
        expect(state.totalItems).toBe(2);
        expect(state.totalValue).toBe(2500); // 6000 - 3500
        expect(state.selectedItem).toBe(null);
      });

      it('should not modify state if item not found', () => {
        store = configureStore({
          reducer: { inventory: inventoryReducer },
          preloadedState: {
            inventory: {
              ...store.getState().inventory,
              items: sampleItems,
              totalItems: 3,
              totalValue: 6000
            }
          }
        });

        store.dispatch(removeLocalItem('nonexistent'));
        const state = store.getState().inventory;

        expect(state.items).toHaveLength(3);
        expect(state.totalItems).toBe(3);
        expect(state.totalValue).toBe(6000);
      });
    });
  });

  describe('Async Actions', () => {
    describe('loadInventoryItems', () => {
      it('should load items successfully', async () => {
        mockInventoryRepository.findAll.mockResolvedValue(sampleItems);
        mockInventoryRepository.getCount.mockResolvedValue(3);
        mockInventoryRepository.getTotalValue.mockResolvedValue(6000);
        mockInventoryRepository.getCategories.mockResolvedValue(['Furniture', 'Lighting', 'Rug / Carpet']);
        mockInventoryRepository.findLowStock.mockResolvedValue([sampleItems[2]]);

        await store.dispatch(loadInventoryItems({ offset: 0, limit: 50 }));
        const state = store.getState().inventory;

        expect(state.loading).toBe(false);
        expect(state.error).toBe(null);
        expect(state.items).toEqual(sampleItems);
        expect(state.totalItems).toBe(3);
        expect(state.totalValue).toBe(6000);
        expect(state.categories).toEqual(['Furniture', 'Lighting', 'Rug / Carpet']);
        expect(state.lowStockItems).toEqual([sampleItems[2]]);
        expect(state.currentPage).toBe(1);
        expect(state.hasMoreItems).toBe(false);
      });

      it('should handle loading with search and category filters', async () => {
        const filteredItems = [sampleItems[0]];
        mockInventoryRepository.findAll.mockResolvedValue(filteredItems);
        mockInventoryRepository.getCount.mockResolvedValue(1);
        mockInventoryRepository.getTotalValue.mockResolvedValue(3500);
        mockInventoryRepository.getCategories.mockResolvedValue(['Furniture']);
        mockInventoryRepository.findLowStock.mockResolvedValue([]);

        await store.dispatch(loadInventoryItems({
          offset: 0,
          limit: 50,
          category: 'Furniture',
          searchQuery: 'sectional'
        }));

        expect(mockInventoryRepository.findAll).toHaveBeenCalledWith(0, 50, 'Furniture', 'sectional');

        const state = store.getState().inventory;
        expect(state.items).toEqual(filteredItems);
        expect(state.totalItems).toBe(1);
      });

      it('should append items when not refreshing', async () => {
        // Set up store with existing items
        store = configureStore({
          reducer: { inventory: inventoryReducer },
          preloadedState: {
            inventory: {
              ...store.getState().inventory,
              items: [sampleItems[0]],
              currentPage: 1
            }
          }
        });

        const newItems = [sampleItems[1], sampleItems[2]];
        mockInventoryRepository.findAll.mockResolvedValue(newItems);
        mockInventoryRepository.getCount.mockResolvedValue(3);
        mockInventoryRepository.getTotalValue.mockResolvedValue(6000);
        mockInventoryRepository.getCategories.mockResolvedValue(['Furniture', 'Lighting', 'Rug / Carpet']);
        mockInventoryRepository.findLowStock.mockResolvedValue([]);

        await store.dispatch(loadInventoryItems({ offset: 1, limit: 50 }));
        const state = store.getState().inventory;

        expect(state.items).toHaveLength(3);
        expect(state.items[0]).toEqual(sampleItems[0]); // Original item
        expect(state.items[1]).toEqual(sampleItems[1]); // New items appended
        expect(state.items[2]).toEqual(sampleItems[2]);
        expect(state.currentPage).toBe(2);
      });

      it('should replace items when refreshing', async () => {
        // Set up store with existing items
        store = configureStore({
          reducer: { inventory: inventoryReducer },
          preloadedState: {
            inventory: {
              ...store.getState().inventory,
              items: [sampleItems[0]],
              currentPage: 1
            }
          }
        });

        const refreshedItems = [sampleItems[1], sampleItems[2]];
        mockInventoryRepository.findAll.mockResolvedValue(refreshedItems);
        mockInventoryRepository.getCount.mockResolvedValue(2);
        mockInventoryRepository.getTotalValue.mockResolvedValue(2500);
        mockInventoryRepository.getCategories.mockResolvedValue(['Lighting', 'Rug / Carpet']);
        mockInventoryRepository.findLowStock.mockResolvedValue([]);

        await store.dispatch(loadInventoryItems({ offset: 0, limit: 50, refresh: true }));
        const state = store.getState().inventory;

        expect(state.items).toEqual(refreshedItems);
        expect(state.items).toHaveLength(2);
        expect(state.currentPage).toBe(1);
      });

      it('should handle loading error', async () => {
        const errorMessage = 'Database connection failed';
        mockInventoryRepository.findAll.mockRejectedValue(new Error(errorMessage));

        await store.dispatch(loadInventoryItems({ offset: 0, limit: 50 }));
        const state = store.getState().inventory;

        expect(state.loading).toBe(false);
        expect(state.error).toBe(errorMessage);
        expect(state.items).toEqual([]);
      });

      it('should set hasMoreItems correctly based on returned items length', async () => {
        mockInventoryRepository.findAll.mockResolvedValue(Array(50).fill(sampleItem));
        mockInventoryRepository.getCount.mockResolvedValue(100);
        mockInventoryRepository.getTotalValue.mockResolvedValue(100000);
        mockInventoryRepository.getCategories.mockResolvedValue(['Furniture']);
        mockInventoryRepository.findLowStock.mockResolvedValue([]);

        await store.dispatch(loadInventoryItems({ offset: 0, limit: 50 }));
        const state = store.getState().inventory;

        expect(state.hasMoreItems).toBe(true); // 50 items returned = limit, so more items available
      });
    });

    describe('createInventoryItem', () => {
      it('should create item successfully', async () => {
        const newItemData = {
          name: 'New Item',
          category: 'Test',
          quantity: 1,
          unitPrice: 100,
          totalValue: 100,
          location: 'Storage'
        };
        const createdItem = { ...newItemData, id: 'new-id', dateAdded: new Date().toISOString(), lastUpdated: new Date().toISOString(), version: 1 };

        mockInventoryRepository.create.mockResolvedValue(createdItem);

        await store.dispatch(createInventoryItem(newItemData));
        const state = store.getState().inventory;

        expect(state.loading).toBe(false);
        expect(state.error).toBe(null);
        expect(state.items[0]).toEqual(createdItem);
        expect(state.totalItems).toBe(1);
        expect(state.totalValue).toBe(100);
      });

      it('should handle creation error', async () => {
        const newItemData = {
          name: 'New Item',
          category: 'Test',
          quantity: 1,
          unitPrice: 100,
          totalValue: 100,
          location: 'Storage'
        };
        const errorMessage = 'Failed to create item';
        mockInventoryRepository.create.mockRejectedValue(new Error(errorMessage));

        await store.dispatch(createInventoryItem(newItemData));
        const state = store.getState().inventory;

        expect(state.loading).toBe(false);
        expect(state.error).toBe(errorMessage);
        expect(state.items).toHaveLength(0);
      });
    });

    describe('updateInventoryItem', () => {
      it('should update item successfully', async () => {
        // Set up store with existing items
        store = configureStore({
          reducer: { inventory: inventoryReducer },
          preloadedState: {
            inventory: {
              ...store.getState().inventory,
              items: sampleItems,
              totalValue: 6000,
              selectedItem: sampleItems[0]
            }
          }
        });

        const updates = { quantity: 2, unitPrice: 4000, totalValue: 8000 };
        const updatedItem = { ...sampleItems[0], ...updates };
        mockInventoryRepository.update.mockResolvedValue(updatedItem);

        await store.dispatch(updateInventoryItem({ id: '1', updates }));
        const state = store.getState().inventory;

        expect(state.loading).toBe(false);
        expect(state.error).toBe(null);
        expect(state.items[0]).toEqual(updatedItem);
        expect(state.selectedItem).toEqual(updatedItem);
        expect(state.totalValue).toBe(10500); // 6000 - 3500 + 8000
      });

      it('should handle update error', async () => {
        const errorMessage = 'Failed to update item';
        mockInventoryRepository.update.mockRejectedValue(new Error(errorMessage));

        await store.dispatch(updateInventoryItem({ id: '1', updates: { quantity: 2 } }));
        const state = store.getState().inventory;

        expect(state.loading).toBe(false);
        expect(state.error).toBe(errorMessage);
      });
    });

    describe('updateItemQuantity', () => {
      it('should update item quantity and recalculate total value', async () => {
        // Set up store with existing items
        store = configureStore({
          reducer: { inventory: inventoryReducer },
          preloadedState: {
            inventory: {
              ...store.getState().inventory,
              items: sampleItems,
              totalValue: 6000,
              selectedItem: sampleItems[0]
            }
          }
        });

        const updatedItem = { ...sampleItems[0], quantity: 2, totalValue: 7000 };
        mockInventoryRepository.updateQuantity.mockResolvedValue(updatedItem);

        await store.dispatch(updateItemQuantity({ id: '1', quantity: 2 }));
        const state = store.getState().inventory;

        expect(state.items[0]).toEqual(updatedItem);
        expect(state.selectedItem).toEqual(updatedItem);
        expect(state.totalValue).toBe(9500); // 6000 - 3500 + 7000
      });
    });

    describe('deleteInventoryItem', () => {
      it('should delete item successfully', async () => {
        // Set up store with existing items
        store = configureStore({
          reducer: { inventory: inventoryReducer },
          preloadedState: {
            inventory: {
              ...store.getState().inventory,
              items: sampleItems,
              totalItems: 3,
              totalValue: 6000,
              selectedItem: sampleItems[0]
            }
          }
        });

        mockInventoryRepository.delete.mockResolvedValue(true);

        await store.dispatch(deleteInventoryItem('1'));
        const state = store.getState().inventory;

        expect(state.loading).toBe(false);
        expect(state.error).toBe(null);
        expect(state.items).toHaveLength(2);
        expect(state.items.find(item => item.id === '1')).toBeUndefined();
        expect(state.totalItems).toBe(2);
        expect(state.totalValue).toBe(2500); // 6000 - 3500
        expect(state.selectedItem).toBe(null);
      });

      it('should handle delete failure', async () => {
        mockInventoryRepository.delete.mockResolvedValue(false);

        await store.dispatch(deleteInventoryItem('1'));
        const state = store.getState().inventory;

        expect(state.loading).toBe(false);
        expect(state.error).toBe('Failed to delete item');
      });

      it('should handle delete error', async () => {
        const errorMessage = 'Database error';
        mockInventoryRepository.delete.mockRejectedValue(new Error(errorMessage));

        await store.dispatch(deleteInventoryItem('1'));
        const state = store.getState().inventory;

        expect(state.loading).toBe(false);
        expect(state.error).toBe(errorMessage);
      });
    });

    describe('loadItemById', () => {
      it('should load item by ID successfully', async () => {
        mockInventoryRepository.findById.mockResolvedValue(sampleItem);

        await store.dispatch(loadItemById('1'));
        const state = store.getState().inventory;

        expect(state.selectedItem).toEqual(sampleItem);
        expect(state.error).toBe(null);
      });

      it('should handle item not found', async () => {
        mockInventoryRepository.findById.mockResolvedValue(null);

        await store.dispatch(loadItemById('nonexistent'));
        const state = store.getState().inventory;

        expect(state.selectedItem).toBe(null);
        expect(state.error).toBe('Item not found');
      });
    });

    describe('searchByBarcode', () => {
      it('should find item by barcode', async () => {
        mockInventoryRepository.findByBarcode.mockResolvedValue(sampleItem);

        await store.dispatch(searchByBarcode('1234567890123'));
        const state = store.getState().inventory;

        expect(state.selectedItem).toEqual(sampleItem);
      });

      it('should handle barcode not found', async () => {
        mockInventoryRepository.findByBarcode.mockResolvedValue(null);

        await store.dispatch(searchByBarcode('invalid-barcode'));
        const state = store.getState().inventory;

        expect(state.selectedItem).toBe(null);
      });
    });

    describe('searchBySku', () => {
      it('should find item by SKU', async () => {
        mockInventoryRepository.findBySku.mockResolvedValue(sampleItem);

        await store.dispatch(searchBySku('WE-SECT-001'));
        const state = store.getState().inventory;

        expect(state.selectedItem).toEqual(sampleItem);
      });

      it('should handle SKU not found', async () => {
        mockInventoryRepository.findBySku.mockResolvedValue(null);

        await store.dispatch(searchBySku('invalid-sku'));
        const state = store.getState().inventory;

        expect(state.selectedItem).toBe(null);
      });
    });

    describe('refreshStats', () => {
      it('should refresh statistics successfully', async () => {
        mockInventoryRepository.getTotalValue.mockResolvedValue(10000);
        mockInventoryRepository.getCount.mockResolvedValue(5);
        mockInventoryRepository.getCategories.mockResolvedValue(['Furniture', 'Lighting', 'Electronics']);
        mockInventoryRepository.findLowStock.mockResolvedValue([sampleItems[2]]);

        await store.dispatch(refreshStats());
        const state = store.getState().inventory;

        expect(state.totalValue).toBe(10000);
        expect(state.totalItems).toBe(5);
        expect(state.categories).toEqual(['Furniture', 'Lighting', 'Electronics']);
        expect(state.lowStockItems).toEqual([sampleItems[2]]);
      });
    });
  });

  describe('Loading States', () => {
    it('should set loading to true during async operations', () => {
      mockInventoryRepository.findAll.mockImplementation(() => new Promise(() => {})); // Never resolves

      store.dispatch(loadInventoryItems({ offset: 0, limit: 50 }));
      const state = store.getState().inventory;

      expect(state.loading).toBe(true);
      expect(state.error).toBe(null);
    });

    it('should set loading to true during item creation', () => {
      mockInventoryRepository.create.mockImplementation(() => new Promise(() => {}));

      store.dispatch(createInventoryItem({
        name: 'Test',
        category: 'Test',
        quantity: 1,
        unitPrice: 100,
        totalValue: 100,
        location: 'Storage'
      }));
      const state = store.getState().inventory;

      expect(state.loading).toBe(true);
      expect(state.error).toBe(null);
    });

    it('should set loading to true during item update', () => {
      mockInventoryRepository.update.mockImplementation(() => new Promise(() => {}));

      store.dispatch(updateInventoryItem({ id: '1', updates: { quantity: 2 } }));
      const state = store.getState().inventory;

      expect(state.loading).toBe(true);
      expect(state.error).toBe(null);
    });

    it('should set loading to true during item deletion', () => {
      mockInventoryRepository.delete.mockImplementation(() => new Promise(() => {}));

      store.dispatch(deleteInventoryItem('1'));
      const state = store.getState().inventory;

      expect(state.loading).toBe(true);
      expect(state.error).toBe(null);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty repository responses', async () => {
      mockInventoryRepository.findAll.mockResolvedValue([]);
      mockInventoryRepository.getCount.mockResolvedValue(0);
      mockInventoryRepository.getTotalValue.mockResolvedValue(0);
      mockInventoryRepository.getCategories.mockResolvedValue([]);
      mockInventoryRepository.findLowStock.mockResolvedValue([]);

      await store.dispatch(loadInventoryItems({ offset: 0, limit: 50 }));
      const state = store.getState().inventory;

      expect(state.items).toEqual([]);
      expect(state.totalItems).toBe(0);
      expect(state.totalValue).toBe(0);
      expect(state.categories).toEqual([]);
      expect(state.lowStockItems).toEqual([]);
      expect(state.hasMoreItems).toBe(false);
    });

    it('should handle concurrent updates correctly', async () => {
      // Set up store with existing items
      store = configureStore({
        reducer: { inventory: inventoryReducer },
        preloadedState: {
          inventory: {
            ...store.getState().inventory,
            items: sampleItems,
            totalValue: 6000
          }
        }
      });

      // Mock different updates for the same item
      const update1 = { ...sampleItems[0], quantity: 2, totalValue: 7000 };
      const update2 = { ...sampleItems[0], quantity: 3, totalValue: 10500 };

      mockInventoryRepository.update
        .mockResolvedValueOnce(update1)
        .mockResolvedValueOnce(update2);

      // Dispatch concurrent updates
      const [result1, result2] = await Promise.all([
        store.dispatch(updateInventoryItem({ id: '1', updates: { quantity: 2 } })),
        store.dispatch(updateInventoryItem({ id: '1', updates: { quantity: 3 } }))
      ]);

      const state = store.getState().inventory;

      // Last update should win
      expect(state.items[0].quantity).toBe(3);
      expect(state.items[0].totalValue).toBe(10500);
    });

    it('should maintain referential integrity when selected item is updated', async () => {
      // Set up store with selected item
      store = configureStore({
        reducer: { inventory: inventoryReducer },
        preloadedState: {
          inventory: {
            ...store.getState().inventory,
            items: sampleItems,
            selectedItem: sampleItems[0]
          }
        }
      });

      const updatedItem = { ...sampleItems[0], quantity: 2 };
      mockInventoryRepository.update.mockResolvedValue(updatedItem);

      await store.dispatch(updateInventoryItem({ id: '1', updates: { quantity: 2 } }));
      const state = store.getState().inventory;

      expect(state.items[0]).toEqual(state.selectedItem);
      expect(state.selectedItem?.quantity).toBe(2);
    });
  });
});

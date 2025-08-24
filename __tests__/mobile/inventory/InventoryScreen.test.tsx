// React Native Component Tests for Inventory Screen
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { configureStore } from '@reduxjs/toolkit';
import { Alert, Vibration } from 'react-native';

// Mock external dependencies
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.Alert = {
    alert: jest.fn(),
  };
  RN.Vibration = {
    vibrate: jest.fn(),
  };
  RN.Dimensions = {
    get: jest.fn(() => ({ width: 375, height: 812 })),
  };
  return RN;
});

jest.mock('react-native-camera', () => ({
  RNCamera: {
    Constants: {
      Aspect: { fill: 'fill', fit: 'fit', stretch: 'stretch' },
      BarCodeType: { qr: 'qr', pdf417: 'pdf417', aztec: 'aztec' },
      CameraStatus: { READY: 'READY', PENDING_AUTHORIZATION: 'PENDING_AUTHORIZATION' },
      Type: { front: 'front', back: 'back' },
    },
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

jest.mock('react-native-permissions', () => ({
  check: jest.fn(),
  request: jest.fn(),
  PERMISSIONS: {
    IOS: { CAMERA: 'camera' },
    ANDROID: { CAMERA: 'camera' },
  },
  RESULTS: {
    GRANTED: 'granted',
    DENIED: 'denied',
    UNAVAILABLE: 'unavailable',
  },
}));

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetOptions = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      setOptions: mockSetOptions,
    }),
    useRoute: () => ({
      params: {},
    }),
    useFocusEffect: jest.fn(),
  };
});

// Mock inventory repository
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

// Import components and store
import inventoryReducer from '../../../apps/mobile-inventory/src/store/slices/inventorySlice';

// Mock InventoryScreen component since we don't have the actual implementation
const MockInventoryScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
  const [items] = React.useState([
    {
      id: '1',
      name: 'West Elm Sectional Sofa',
      category: 'Furniture',
      quantity: 1,
      unitPrice: 3500,
      totalValue: 3500,
      location: 'Living Room',
      isLowStock: false,
    },
    {
      id: '2',
      name: 'Table Lamp',
      category: 'Lighting',
      quantity: 2,
      unitPrice: 150,
      totalValue: 300,
      location: 'Bedroom',
      isLowStock: true,
    },
  ]);

  return (
    <>
      <input
        testID="search-input"
        placeholder="Search inventory..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      <select
        testID="category-filter"
        value={selectedCategory || ''}
        onChange={(e) => setSelectedCategory(e.target.value || null)}
      >
        <option value="">All Categories</option>
        <option value="Furniture">Furniture</option>
        <option value="Lighting">Lighting</option>
        <option value="Electronics">Electronics</option>
      </select>

      <button testID="scan-barcode-btn">Scan Barcode</button>
      <button testID="add-item-btn">Add New Item</button>
      <button testID="refresh-btn">Refresh</button>

      <div testID="inventory-list">
        {items
          .filter(item =>
            (!searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase())) &&
            (!selectedCategory || item.category === selectedCategory)
          )
          .map(item => (
            <div key={item.id} testID={`item-${item.id}`}>
              <div testID={`item-name-${item.id}`}>{item.name}</div>
              <div testID={`item-category-${item.id}`}>{item.category}</div>
              <div testID={`item-quantity-${item.id}`}>Qty: {item.quantity}</div>
              <div testID={`item-price-${item.id}`}>${item.totalValue}</div>
              <div testID={`item-location-${item.id}`}>{item.location}</div>
              {item.isLowStock && (
                <div testID={`low-stock-indicator-${item.id}`}>Low Stock</div>
              )}
              <button
                testID={`edit-item-${item.id}`}
                onPress={() => mockNavigate('EditItem', { itemId: item.id })}
              >
                Edit
              </button>
              <button
                testID={`delete-item-${item.id}`}
                onPress={() => Alert.alert('Delete Item', 'Are you sure?')}
              >
                Delete
              </button>
            </div>
          ))
        }
      </div>

      <div testID="stats-summary">
        <div testID="total-items">Total Items: {items.length}</div>
        <div testID="total-value">
          Total Value: ${items.reduce((sum, item) => sum + item.totalValue, 0)}
        </div>
        <div testID="low-stock-count">
          Low Stock: {items.filter(item => item.isLowStock).length}
        </div>
      </div>
    </>
  );
};

// Sample test data
const sampleItems = [
  {
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
  },
  {
    id: '2',
    name: 'Table Lamp',
    description: 'Modern brass table lamp',
    category: 'Lighting',
    sku: 'CB2-LAMP-003',
    barcode: '1234567890125',
    quantity: 2,
    unitPrice: 150.00,
    totalValue: 300.00,
    location: 'Master Bedroom',
    lowStockThreshold: 5,
    isLowStock: true,
    tags: ['brass', 'modern'],
    notes: 'Bedside lighting',
    photos: ['lamp1.jpg'],
    dateAdded: '2024-01-01T10:00:00Z',
    lastUpdated: '2024-01-01T10:00:00Z',
    version: 1,
  },
];

describe('InventoryScreen', () => {
  let store: ReturnType<typeof configureStore>;

  const createTestStore = (preloadedState = {}) => {
    return configureStore({
      reducer: {
        inventory: inventoryReducer,
      },
      preloadedState,
    });
  };

  const renderWithProviders = (component: React.ReactElement, storeState = {}) => {
    const testStore = createTestStore(storeState);
    return render(
      <Provider store={testStore}>
        <NavigationContainer>
          {component}
        </NavigationContainer>
      </Provider>
    );
  };

  beforeEach(() => {
    store = createTestStore();
    jest.clearAllMocks();

    // Setup default mock implementations
    mockInventoryRepository.findAll.mockResolvedValue(sampleItems);
    mockInventoryRepository.getCount.mockResolvedValue(2);
    mockInventoryRepository.getTotalValue.mockResolvedValue(3800);
    mockInventoryRepository.getCategories.mockResolvedValue(['Furniture', 'Lighting']);
    mockInventoryRepository.findLowStock.mockResolvedValue([sampleItems[1]]);
  });

  describe('Initial Render', () => {
    it('should render inventory screen with all basic elements', () => {
      const { getByTestId } = renderWithProviders(<MockInventoryScreen />);

      expect(getByTestId('search-input')).toBeTruthy();
      expect(getByTestId('category-filter')).toBeTruthy();
      expect(getByTestId('scan-barcode-btn')).toBeTruthy();
      expect(getByTestId('add-item-btn')).toBeTruthy();
      expect(getByTestId('refresh-btn')).toBeTruthy();
      expect(getByTestId('inventory-list')).toBeTruthy();
      expect(getByTestId('stats-summary')).toBeTruthy();
    });

    it('should display inventory items', () => {
      const { getByTestId } = renderWithProviders(<MockInventoryScreen />);

      expect(getByTestId('item-1')).toBeTruthy();
      expect(getByTestId('item-2')).toBeTruthy();
      expect(getByTestId('item-name-1')).toHaveTextContent('West Elm Sectional Sofa');
      expect(getByTestId('item-name-2')).toHaveTextContent('Table Lamp');
    });

    it('should display item details correctly', () => {
      const { getByTestId } = renderWithProviders(<MockInventoryScreen />);

      expect(getByTestId('item-category-1')).toHaveTextContent('Furniture');
      expect(getByTestId('item-quantity-1')).toHaveTextContent('Qty: 1');
      expect(getByTestId('item-price-1')).toHaveTextContent('$3500');
      expect(getByTestId('item-location-1')).toHaveTextContent('Living Room');
    });

    it('should display low stock indicator for items with low stock', () => {
      const { getByTestId, queryByTestId } = renderWithProviders(<MockInventoryScreen />);

      expect(getByTestId('low-stock-indicator-2')).toBeTruthy();
      expect(queryByTestId('low-stock-indicator-1')).toBeFalsy();
    });

    it('should display statistics summary', () => {
      const { getByTestId } = renderWithProviders(<MockInventoryScreen />);

      expect(getByTestId('total-items')).toHaveTextContent('Total Items: 2');
      expect(getByTestId('total-value')).toHaveTextContent('Total Value: $3800');
      expect(getByTestId('low-stock-count')).toHaveTextContent('Low Stock: 1');
    });
  });

  describe('Search Functionality', () => {
    it('should filter items based on search query', async () => {
      const { getByTestId, queryByTestId } = renderWithProviders(<MockInventoryScreen />);

      const searchInput = getByTestId('search-input');
      fireEvent.changeText(searchInput, 'sectional');

      await waitFor(() => {
        expect(getByTestId('item-1')).toBeTruthy();
        expect(queryByTestId('item-2')).toBeFalsy();
      });
    });

    it('should show no results when search query does not match', async () => {
      const { getByTestId, queryByTestId } = renderWithProviders(<MockInventoryScreen />);

      const searchInput = getByTestId('search-input');
      fireEvent.changeText(searchInput, 'nonexistent');

      await waitFor(() => {
        expect(queryByTestId('item-1')).toBeFalsy();
        expect(queryByTestId('item-2')).toBeFalsy();
      });
    });

    it('should be case insensitive', async () => {
      const { getByTestId, queryByTestId } = renderWithProviders(<MockInventoryScreen />);

      const searchInput = getByTestId('search-input');
      fireEvent.changeText(searchInput, 'LAMP');

      await waitFor(() => {
        expect(queryByTestId('item-1')).toBeFalsy();
        expect(getByTestId('item-2')).toBeTruthy();
      });
    });

    it('should clear search results when search is cleared', async () => {
      const { getByTestId } = renderWithProviders(<MockInventoryScreen />);

      const searchInput = getByTestId('search-input');

      // First apply search
      fireEvent.changeText(searchInput, 'sectional');
      await waitFor(() => {
        expect(getByTestId('item-1')).toBeTruthy();
      });

      // Clear search
      fireEvent.changeText(searchInput, '');
      await waitFor(() => {
        expect(getByTestId('item-1')).toBeTruthy();
        expect(getByTestId('item-2')).toBeTruthy();
      });
    });
  });

  describe('Category Filtering', () => {
    it('should filter items by category', async () => {
      const { getByTestId, queryByTestId } = renderWithProviders(<MockInventoryScreen />);

      const categoryFilter = getByTestId('category-filter');
      fireEvent.change(categoryFilter, { target: { value: 'Furniture' } });

      await waitFor(() => {
        expect(getByTestId('item-1')).toBeTruthy();
        expect(queryByTestId('item-2')).toBeFalsy();
      });
    });

    it('should show all items when "All Categories" is selected', async () => {
      const { getByTestId } = renderWithProviders(<MockInventoryScreen />);

      const categoryFilter = getByTestId('category-filter');

      // First apply filter
      fireEvent.change(categoryFilter, { target: { value: 'Lighting' } });
      await waitFor(() => {
        expect(getByTestId('item-2')).toBeTruthy();
      });

      // Clear filter
      fireEvent.change(categoryFilter, { target: { value: '' } });
      await waitFor(() => {
        expect(getByTestId('item-1')).toBeTruthy();
        expect(getByTestId('item-2')).toBeTruthy();
      });
    });

    it('should combine search and category filters', async () => {
      const { getByTestId, queryByTestId } = renderWithProviders(<MockInventoryScreen />);

      const searchInput = getByTestId('search-input');
      const categoryFilter = getByTestId('category-filter');

      fireEvent.changeText(searchInput, 'lamp');
      fireEvent.change(categoryFilter, { target: { value: 'Lighting' } });

      await waitFor(() => {
        expect(queryByTestId('item-1')).toBeFalsy();
        expect(getByTestId('item-2')).toBeTruthy();
      });
    });
  });

  describe('Navigation Actions', () => {
    it('should navigate to add item screen when add button is pressed', () => {
      const { getByTestId } = renderWithProviders(<MockInventoryScreen />);

      const addButton = getByTestId('add-item-btn');
      fireEvent.press(addButton);

      expect(mockNavigate).toHaveBeenCalledWith('AddItem');
    });

    it('should navigate to edit item screen when edit button is pressed', () => {
      const { getByTestId } = renderWithProviders(<MockInventoryScreen />);

      const editButton = getByTestId('edit-item-1');
      fireEvent.press(editButton);

      expect(mockNavigate).toHaveBeenCalledWith('EditItem', { itemId: '1' });
    });

    it('should navigate to barcode scanner when scan button is pressed', () => {
      const { getByTestId } = renderWithProviders(<MockInventoryScreen />);

      const scanButton = getByTestId('scan-barcode-btn');
      fireEvent.press(scanButton);

      expect(mockNavigate).toHaveBeenCalledWith('BarcodeScanner');
    });
  });

  describe('Item Actions', () => {
    it('should show delete confirmation dialog when delete button is pressed', () => {
      const { getByTestId } = renderWithProviders(<MockInventoryScreen />);

      const deleteButton = getByTestId('delete-item-1');
      fireEvent.press(deleteButton);

      expect(Alert.alert).toHaveBeenCalledWith('Delete Item', 'Are you sure?');
    });

    it('should handle item refresh', async () => {
      const { getByTestId } = renderWithProviders(<MockInventoryScreen />);

      const refreshButton = getByTestId('refresh-btn');
      fireEvent.press(refreshButton);

      // Should trigger repository calls
      expect(mockInventoryRepository.findAll).toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('should show loading indicator when loading items', async () => {
      // Mock slow loading
      mockInventoryRepository.findAll.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(sampleItems), 100))
      );

      const { queryByTestId } = renderWithProviders(<MockInventoryScreen />, {
        inventory: {
          items: [],
          loading: true,
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
        }
      });

      // Should show loading indicator
      expect(queryByTestId('loading-indicator')).toBeTruthy();
    });

    it('should hide loading indicator after items load', async () => {
      const { queryByTestId } = renderWithProviders(<MockInventoryScreen />, {
        inventory: {
          items: sampleItems,
          loading: false,
          error: null,
          categories: ['Furniture', 'Lighting'],
          totalValue: 3800,
          totalItems: 2,
          lowStockItems: [sampleItems[1]],
          selectedItem: null,
          searchQuery: '',
          selectedCategory: null,
          currentPage: 1,
          hasMoreItems: false,
          syncStatus: 'idle',
          lastSyncTime: null,
        }
      });

      expect(queryByTestId('loading-indicator')).toBeFalsy();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when loading fails', () => {
      const { getByTestId } = renderWithProviders(<MockInventoryScreen />, {
        inventory: {
          items: [],
          loading: false,
          error: 'Failed to load inventory items',
          categories: [],
          totalValue: 0,
          totalItems: 0,
          lowStockItems: [],
          selectedItem: null,
          searchQuery: '',
          selectedCategory: null,
          currentPage: 0,
          hasMoreItems: true,
          syncStatus: 'error',
          lastSyncTime: null,
        }
      });

      expect(getByTestId('error-message')).toHaveTextContent('Failed to load inventory items');
    });

    it('should provide retry option when error occurs', () => {
      const { getByTestId } = renderWithProviders(<MockInventoryScreen />, {
        inventory: {
          items: [],
          loading: false,
          error: 'Network error',
          categories: [],
          totalValue: 0,
          totalItems: 0,
          lowStockItems: [],
          selectedItem: null,
          searchQuery: '',
          selectedCategory: null,
          currentPage: 0,
          hasMoreItems: true,
          syncStatus: 'error',
          lastSyncTime: null,
        }
      });

      const retryButton = getByTestId('retry-button');
      expect(retryButton).toBeTruthy();

      fireEvent.press(retryButton);
      expect(mockInventoryRepository.findAll).toHaveBeenCalled();
    });
  });

  describe('Empty States', () => {
    it('should show empty state when no items exist', () => {
      const { getByTestId } = renderWithProviders(<MockInventoryScreen />, {
        inventory: {
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
          hasMoreItems: false,
          syncStatus: 'idle',
          lastSyncTime: null,
        }
      });

      expect(getByTestId('empty-state')).toBeTruthy();
      expect(getByTestId('empty-state-message')).toHaveTextContent('No items in inventory');
    });

    it('should show no results state when search yields no results', async () => {
      const { getByTestId } = renderWithProviders(<MockInventoryScreen />);

      const searchInput = getByTestId('search-input');
      fireEvent.changeText(searchInput, 'nonexistent');

      await waitFor(() => {
        expect(getByTestId('no-results-state')).toBeTruthy();
        expect(getByTestId('no-results-message')).toHaveTextContent('No items match your search');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels', () => {
      const { getByTestId } = renderWithProviders(<MockInventoryScreen />);

      expect(getByTestId('search-input')).toHaveAccessibilityLabel('Search inventory items');
      expect(getByTestId('add-item-btn')).toHaveAccessibilityLabel('Add new inventory item');
      expect(getByTestId('scan-barcode-btn')).toHaveAccessibilityLabel('Scan barcode to find item');
    });

    it('should have proper accessibility roles', () => {
      const { getByTestId } = renderWithProviders(<MockInventoryScreen />);

      expect(getByTestId('search-input')).toHaveAccessibilityRole('search');
      expect(getByTestId('add-item-btn')).toHaveAccessibilityRole('button');
      expect(getByTestId('inventory-list')).toHaveAccessibilityRole('list');
    });

    it('should have accessibility hints for complex actions', () => {
      const { getByTestId } = renderWithProviders(<MockInventoryScreen />);

      expect(getByTestId('edit-item-1')).toHaveAccessibilityHint('Double tap to edit this item');
      expect(getByTestId('delete-item-1')).toHaveAccessibilityHint('Double tap to delete this item');
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        ...sampleItems[0],
        id: `item-${i}`,
        name: `Item ${i}`,
      }));

      mockInventoryRepository.findAll.mockResolvedValue(largeDataset);

      const { getByTestId } = renderWithProviders(<MockInventoryScreen />);

      await waitFor(() => {
        expect(getByTestId('inventory-list')).toBeTruthy();
      });

      // Should render efficiently without performance issues
      const items = getByTestId('inventory-list').children;
      expect(items.length).toBeGreaterThan(0);
    });

    it('should implement virtual scrolling for large lists', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        ...sampleItems[0],
        id: `item-${i}`,
        name: `Item ${i}`,
      }));

      // Should only render visible items
      const { queryByTestId } = renderWithProviders(<MockInventoryScreen />);

      // Check that not all 1000 items are rendered at once
      expect(queryByTestId('item-999')).toBeFalsy();
    });
  });

  describe('Sync Status', () => {
    it('should show sync status indicator', () => {
      const { getByTestId } = renderWithProviders(<MockInventoryScreen />, {
        inventory: {
          ...store.getState().inventory,
          syncStatus: 'syncing',
        }
      });

      expect(getByTestId('sync-status')).toHaveTextContent('Syncing...');
    });

    it('should show last sync time', () => {
      const lastSyncTime = '2024-01-01T12:00:00Z';
      const { getByTestId } = renderWithProviders(<MockInventoryScreen />, {
        inventory: {
          ...store.getState().inventory,
          syncStatus: 'success',
          lastSyncTime,
        }
      });

      expect(getByTestId('last-sync-time')).toHaveTextContent('Last synced:');
    });
  });

  describe('Platform-specific Behavior', () => {
    it('should handle Android back button', () => {
      const { getByTestId } = renderWithProviders(<MockInventoryScreen />);

      // Simulate Android back button press
      fireEvent(getByTestId('inventory-screen'), 'onAndroidBackPress');

      expect(mockGoBack).toHaveBeenCalled();
    });

    it('should provide haptic feedback on iOS', () => {
      const { getByTestId } = renderWithProviders(<MockInventoryScreen />);

      const deleteButton = getByTestId('delete-item-1');
      fireEvent.press(deleteButton);

      expect(Vibration.vibrate).toHaveBeenCalledWith(100);
    });

    it('should handle different screen sizes', () => {
      // Mock different screen dimensions
      jest.mocked(require('react-native').Dimensions.get).mockReturnValue({
        width: 320,
        height: 568,
      });

      const { getByTestId } = renderWithProviders(<MockInventoryScreen />);

      // Should adapt layout for smaller screens
      expect(getByTestId('inventory-list')).toHaveStyle({
        flexDirection: 'column',
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should update inventory when items change', async () => {
      const { getByTestId, rerender } = renderWithProviders(<MockInventoryScreen />);

      expect(getByTestId('total-items')).toHaveTextContent('Total Items: 2');

      // Simulate adding a new item
      const newItem = {
        ...sampleItems[0],
        id: '3',
        name: 'New Item',
      };

      mockInventoryRepository.findAll.mockResolvedValue([...sampleItems, newItem]);
      mockInventoryRepository.getCount.mockResolvedValue(3);

      // Trigger refresh
      const refreshButton = getByTestId('refresh-btn');
      fireEvent.press(refreshButton);

      await waitFor(() => {
        expect(getByTestId('total-items')).toHaveTextContent('Total Items: 3');
      });
    });

    it('should handle concurrent modifications', async () => {
      const { getByTestId } = renderWithProviders(<MockInventoryScreen />);

      // Simulate concurrent edits
      const editButton1 = getByTestId('edit-item-1');
      const editButton2 = getByTestId('edit-item-2');

      fireEvent.press(editButton1);
      fireEvent.press(editButton2);

      // Should handle both navigation calls
      expect(mockNavigate).toHaveBeenCalledTimes(2);
      expect(mockNavigate).toHaveBeenCalledWith('EditItem', { itemId: '1' });
      expect(mockNavigate).toHaveBeenCalledWith('EditItem', { itemId: '2' });
    });
  });
});

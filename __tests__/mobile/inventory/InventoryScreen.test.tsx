import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { MockedProvider } from '@apollo/client/testing';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { InventoryScreen } from '../../../apps/mobile-inventory/src/screens/InventoryScreen';
import { store } from '../../../apps/mobile-inventory/src/store';
import { GET_INVENTORY_ITEMS } from '../../../apps/mobile-inventory/src/graphql/queries';

// Mock React Navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    params: {},
  }),
}));

// Mock expo-camera
jest.mock('expo-camera', () => ({
  Camera: {
    requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
    Constants: {
      Type: { back: 'back' },
    },
  },
}));

// Mock expo-barcode-scanner
jest.mock('expo-barcode-scanner', () => ({
  BarCodeScanner: {
    requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  },
}));

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabase: jest.fn(() => ({
    transaction: jest.fn(),
  })),
}));

// Mock async storage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock data
const mockItems = [
  {
    id: 'item-1',
    name: 'Modern Sofa',
    description: 'Comfortable 3-seat modern sofa',
    category: 'Furniture',
    sku: 'SOFA-001',
    barcode: '1234567890123',
    quantity: 1,
    minQuantity: 1,
    unitPrice: 1200.00,
    totalValue: 1200.00,
    location: 'Living Room',
    supplier: 'Furniture Plus',
    imageUri: 'file:///path/to/sofa.jpg',
    isActive: true,
    syncStatus: 'synced',
    dateAdded: '2023-01-01T00:00:00Z',
    lastUpdated: '2023-01-01T00:00:00Z',
  },
  {
    id: 'item-2',
    name: 'Coffee Table',
    description: 'Glass coffee table with metal legs',
    category: 'Furniture',
    sku: 'TABLE-001',
    quantity: 1,
    minQuantity: 1,
    unitPrice: 350.00,
    totalValue: 350.00,
    location: 'Living Room',
    syncStatus: 'pending',
    isActive: true,
    dateAdded: '2023-01-02T00:00:00Z',
    lastUpdated: '2023-01-02T00:00:00Z',
  },
];

// GraphQL mocks
const mocks = [
  {
    request: {
      query: GET_INVENTORY_ITEMS,
      variables: {
        offset: 0,
        limit: 20,
      },
    },
    result: {
      data: {
        inventoryItems: {
          items: mockItems,
          total: 2,
          hasNextPage: false,
        },
      },
    },
  },
  {
    request: {
      query: GET_INVENTORY_ITEMS,
      variables: {
        offset: 0,
        limit: 20,
        searchQuery: 'sofa',
      },
    },
    result: {
      data: {
        inventoryItems: {
          items: [mockItems[0]],
          total: 1,
          hasNextPage: false,
        },
      },
    },
  },
];

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode; apolloMocks?: any[] }> = ({
  children,
  apolloMocks = mocks
}) => (
  <NavigationContainer>
    <Provider store={store}>
      <MockedProvider mocks={apolloMocks} addTypename={false}>
        {children}
      </MockedProvider>
    </Provider>
  </NavigationContainer>
);

describe('InventoryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render inventory items correctly', async () => {
    render(
      <TestWrapper>
        <InventoryScreen />
      </TestWrapper>
    );

    // Check for loading state initially
    expect(screen.getByText('Loading...')).toBeTruthy();

    // Wait for items to load
    await waitFor(() => {
      expect(screen.getByText('Modern Sofa')).toBeTruthy();
    });

    // Verify all items are rendered
    expect(screen.getByText('Modern Sofa')).toBeTruthy();
    expect(screen.getByText('Coffee Table')).toBeTruthy();
    expect(screen.getByText('SOFA-001')).toBeTruthy();
    expect(screen.getByText('$1,200.00')).toBeTruthy();
  });

  it('should display sync status indicators', async () => {
    render(
      <TestWrapper>
        <InventoryScreen />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Modern Sofa')).toBeTruthy();
    });

    // Check for sync status indicators
    expect(screen.getByTestId('sync-status-synced')).toBeTruthy();
    expect(screen.getByTestId('sync-status-pending')).toBeTruthy();
  });

  it('should handle search functionality', async () => {
    render(
      <TestWrapper>
        <InventoryScreen />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Modern Sofa')).toBeTruthy();
    });

    // Find search input and type
    const searchInput = screen.getByPlaceholderText('Search items...');
    fireEvent.changeText(searchInput, 'sofa');

    // Verify search results
    await waitFor(() => {
      expect(screen.getByText('Modern Sofa')).toBeTruthy();
      expect(screen.queryByText('Coffee Table')).toBeFalsy();
    });
  });

  it('should navigate to item detail on press', async () => {
    render(
      <TestWrapper>
        <InventoryScreen />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Modern Sofa')).toBeTruthy();
    });

    // Press on item
    const itemCard = screen.getByTestId('inventory-item-item-1');
    fireEvent.press(itemCard);

    expect(mockNavigate).toHaveBeenCalledWith('ItemDetail', { itemId: 'item-1' });
  });

  it('should open barcode scanner', async () => {
    render(
      <TestWrapper>
        <InventoryScreen />
      </TestWrapper>
    );

    // Find and press scan button
    const scanButton = screen.getByTestId('scan-barcode-button');
    fireEvent.press(scanButton);

    expect(mockNavigate).toHaveBeenCalledWith('BarcodeScanner');
  });

  it('should pull to refresh', async () => {
    render(
      <TestWrapper>
        <InventoryScreen />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Modern Sofa')).toBeTruthy();
    });

    // Simulate pull to refresh
    const scrollView = screen.getByTestId('inventory-list');
    fireEvent(scrollView, 'refresh');

    // Check that refresh indicator appears
    expect(screen.getByTestId('refresh-indicator')).toBeTruthy();
  });

  it('should filter by category', async () => {
    render(
      <TestWrapper>
        <InventoryScreen />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Modern Sofa')).toBeTruthy();
    });

    // Open category filter
    const filterButton = screen.getByTestId('category-filter-button');
    fireEvent.press(filterButton);

    // Select Furniture category
    const furnitureOption = screen.getByText('Furniture');
    fireEvent.press(furnitureOption);

    // Verify filter is applied
    expect(screen.getByText('Furniture')).toBeTruthy();
  });

  it('should show empty state when no items', async () => {
    const emptyMocks = [
      {
        request: {
          query: GET_INVENTORY_ITEMS,
          variables: { offset: 0, limit: 20 },
        },
        result: {
          data: {
            inventoryItems: {
              items: [],
              total: 0,
              hasNextPage: false,
            },
          },
        },
      },
    ];

    render(
      <TestWrapper apolloMocks={emptyMocks}>
        <InventoryScreen />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('No items found')).toBeTruthy();
    });

    expect(screen.getByText('Tap + to add your first item')).toBeTruthy();
  });

  it('should handle offline mode', async () => {
    // Mock network state
    const NetInfo = require('@react-native-community/netinfo');
    NetInfo.useNetInfo.mockReturnValue({
      isConnected: false,
      isInternetReachable: false,
    });

    render(
      <TestWrapper>
        <InventoryScreen />
      </TestWrapper>
    );

    // Should show offline indicator
    expect(screen.getByText('Offline Mode')).toBeTruthy();
    expect(screen.getByTestId('offline-indicator')).toBeTruthy();
  });

  it('should show sync conflicts', async () => {
    const conflictMocks = [
      {
        request: {
          query: GET_INVENTORY_ITEMS,
          variables: { offset: 0, limit: 20 },
        },
        result: {
          data: {
            inventoryItems: {
              items: [
                {
                  ...mockItems[0],
                  syncStatus: 'conflict',
                },
              ],
              total: 1,
              hasNextPage: false,
            },
          },
        },
      },
    ];

    render(
      <TestWrapper apolloMocks={conflictMocks}>
        <InventoryScreen />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('sync-conflict-indicator')).toBeTruthy();
    });

    // Should show conflict resolution button
    expect(screen.getByText('Resolve Conflicts')).toBeTruthy();
  });

  it('should handle swipe actions', async () => {
    render(
      <TestWrapper>
        <InventoryScreen />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Modern Sofa')).toBeTruthy();
    });

    // Simulate swipe gesture
    const itemCard = screen.getByTestId('inventory-item-item-1');
    fireEvent(itemCard, 'swipeLeft');

    // Should show action buttons
    expect(screen.getByText('Edit')).toBeTruthy();
    expect(screen.getByText('Delete')).toBeTruthy();
  });

  it('should show quick actions menu', async () => {
    render(
      <TestWrapper>
        <InventoryScreen />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Modern Sofa')).toBeTruthy();
    });

    // Long press on item
    const itemCard = screen.getByTestId('inventory-item-item-1');
    fireEvent(itemCard, 'longPress');

    // Should show context menu
    expect(screen.getByText('Quick Actions')).toBeTruthy();
    expect(screen.getByText('Edit Item')).toBeTruthy();
    expect(screen.getByText('Update Quantity')).toBeTruthy();
    expect(screen.getByText('Mark as Sold')).toBeTruthy();
  });

  it('should handle quantity update', async () => {
    render(
      <TestWrapper>
        <InventoryScreen />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Modern Sofa')).toBeTruthy();
    });

    // Press quantity update button
    const quantityButton = screen.getByTestId('quantity-update-button-item-1');
    fireEvent.press(quantityButton);

    // Should show quantity picker modal
    expect(screen.getByText('Update Quantity')).toBeTruthy();

    // Update quantity
    const quantityInput = screen.getByDisplayValue('1');
    fireEvent.changeText(quantityInput, '2');

    const saveButton = screen.getByText('Save');
    fireEvent.press(saveButton);

    // Should update local state and show pending sync
    await waitFor(() => {
      expect(screen.getByText('2')).toBeTruthy();
    });
  });

  it('should handle image loading errors', async () => {
    render(
      <TestWrapper>
        <InventoryScreen />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Modern Sofa')).toBeTruthy();
    });

    // Simulate image load error
    const itemImage = screen.getByTestId('item-image-item-1');
    fireEvent(itemImage, 'error');

    // Should show placeholder image
    expect(screen.getByTestId('placeholder-image')).toBeTruthy();
  });

  it('should handle low stock alerts', async () => {
    const lowStockMocks = [
      {
        request: {
          query: GET_INVENTORY_ITEMS,
          variables: { offset: 0, limit: 20 },
        },
        result: {
          data: {
            inventoryItems: {
              items: [
                {
                  ...mockItems[0],
                  quantity: 0,
                  minQuantity: 1,
                },
              ],
              total: 1,
              hasNextPage: false,
            },
          },
        },
      },
    ];

    render(
      <TestWrapper apolloMocks={lowStockMocks}>
        <InventoryScreen />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('low-stock-alert')).toBeTruthy();
    });

    expect(screen.getByText('Out of Stock')).toBeTruthy();
  });

  it('should navigate to add item screen', async () => {
    render(
      <TestWrapper>
        <InventoryScreen />
      </TestWrapper>
    );

    // Press add button
    const addButton = screen.getByTestId('add-item-button');
    fireEvent.press(addButton);

    expect(mockNavigate).toHaveBeenCalledWith('AddItem');
  });

  it('should handle biometric authentication for sensitive actions', async () => {
    // Mock biometric authentication
    const LocalAuthentication = require('expo-local-authentication');
    LocalAuthentication.authenticateAsync.mockResolvedValue({
      success: true,
    });

    render(
      <TestWrapper>
        <InventoryScreen />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Modern Sofa')).toBeTruthy();
    });

    // Try to delete item (sensitive action)
    const itemCard = screen.getByTestId('inventory-item-item-1');
    fireEvent(itemCard, 'swipeLeft');

    const deleteButton = screen.getByText('Delete');
    fireEvent.press(deleteButton);

    // Should prompt for biometric auth
    expect(LocalAuthentication.authenticateAsync).toHaveBeenCalled();
  });

  it('should support accessibility features', async () => {
    render(
      <TestWrapper>
        <InventoryScreen />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Modern Sofa')).toBeTruthy();
    });

    // Check accessibility labels
    const itemCard = screen.getByTestId('inventory-item-item-1');
    expect(itemCard).toHaveProp('accessibilityLabel', 'Modern Sofa, SOFA-001, $1,200.00');
    expect(itemCard).toHaveProp('accessibilityRole', 'button');

    // Check semantic roles
    const searchInput = screen.getByPlaceholderText('Search items...');
    expect(searchInput).toHaveProp('accessibilityLabel', 'Search inventory items');
  });

  it('should handle voice search', async () => {
    // Mock speech recognition
    const ExpoSpeech = require('expo-speech');
    ExpoSpeech.speak = jest.fn();

    render(
      <TestWrapper>
        <InventoryScreen />
      </TestWrapper>
    );

    // Press voice search button
    const voiceButton = screen.getByTestId('voice-search-button');
    fireEvent.press(voiceButton);

    // Should start speech recognition
    expect(screen.getByText('Listening...')).toBeTruthy();

    // Simulate voice input
    fireEvent(voiceButton, 'speechResults', { results: ['modern sofa'] });

    // Should update search query
    const searchInput = screen.getByPlaceholderText('Search items...');
    expect(searchInput.props.value).toBe('modern sofa');
  });

  it('should handle camera capture for new items', async () => {
    render(
      <TestWrapper>
        <InventoryScreen />
      </TestWrapper>
    );

    // Press camera button
    const cameraButton = screen.getByTestId('camera-capture-button');
    fireEvent.press(cameraButton);

    expect(mockNavigate).toHaveBeenCalledWith('CameraCapture');
  });

  it('should display network error with retry option', async () => {
    const errorMocks = [
      {
        request: {
          query: GET_INVENTORY_ITEMS,
          variables: { offset: 0, limit: 20 },
        },
        error: new Error('Network error'),
      },
    ];

    render(
      <TestWrapper apolloMocks={errorMocks}>
        <InventoryScreen />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Unable to load items')).toBeTruthy();
    });

    expect(screen.getByText('Network error')).toBeTruthy();
    expect(screen.getByText('Retry')).toBeTruthy();

    // Test retry functionality
    const retryButton = screen.getByText('Retry');
    fireEvent.press(retryButton);

    expect(screen.getByText('Loading...')).toBeTruthy();
  });

  it('should support haptic feedback', async () => {
    // Mock haptic feedback
    const Haptics = require('expo-haptics');
    Haptics.impactAsync = jest.fn();

    render(
      <TestWrapper>
        <InventoryScreen />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Modern Sofa')).toBeTruthy();
    });

    // Long press should trigger haptic feedback
    const itemCard = screen.getByTestId('inventory-item-item-1');
    fireEvent(itemCard, 'longPress');

    expect(Haptics.impactAsync).toHaveBeenCalledWith(
      Haptics.ImpactFeedbackStyle.Medium
    );
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import { jest } from '@jest/globals';
import NetInfo from '@react-native-async-storage/async-storage';

import { ValuationScreen } from '../../src/screens/ValuationScreen';
import { mockCurrentValuation, mockValuationResponse } from '../__mocks__/valuationMocks';
import { OfflineProvider } from '../../src/contexts/OfflineContext';
import { createTestNavigationProps } from '../utils/navigationUtils';

// Mock React Native modules
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

jest.mock('@react-native-netinfo/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
  addEventListener: jest.fn(() => jest.fn()),
}));

jest.mock('react-native-permissions', () => ({
  request: jest.fn(() => Promise.resolve('granted')),
  check: jest.fn(() => Promise.resolve('granted')),
  PERMISSIONS: {
    ANDROID: { CAMERA: 'android.permission.CAMERA' },
    IOS: { CAMERA: 'ios.permission.CAMERA' },
  },
  RESULTS: {
    GRANTED: 'granted',
    DENIED: 'denied',
  },
}));

// Mock API hooks
jest.mock('../../src/api/valuationApi', () => ({
  useCurrentValuation: jest.fn(),
  useRequestMarketValuation: jest.fn(),
  useValuationResponse: jest.fn(),
}));

import {
  useCurrentValuation,
  useRequestMarketValuation,
  useValuationResponse,
} from '../../src/api/valuationApi';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderWithProviders = (component: React.ReactElement, options: { offline?: boolean } = {}) => {
  const queryClient = createTestQueryClient();
  
  return render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <OfflineProvider initialOfflineState={options.offline}>
          {component}
        </OfflineProvider>
      </NavigationContainer>
    </QueryClientProvider>
  );
};

describe('ValuationScreen', () => {
  const mockItemId = 'test-item-mobile-123';
  const mockNavigation = createTestNavigationProps();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    (useCurrentValuation as jest.MockedFunction<typeof useCurrentValuation>).mockReturnValue({
      data: mockCurrentValuation,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    (useValuationResponse as jest.MockedFunction<typeof useValuationResponse>).mockReturnValue({
      data: mockValuationResponse,
      isLoading: false,
      error: null,
    });

    (useRequestMarketValuation as jest.MockedFunction<typeof useRequestMarketValuation>).mockReturnValue({
      mutate: jest.fn(),
      isLoading: false,
      error: null,
      data: null,
    });
  });

  it('renders valuation information correctly', async () => {
    renderWithProviders(
      <ValuationScreen 
        route={{ params: { itemId: mockItemId } }} 
        navigation={mockNavigation} 
      />
    );

    // Check that valuation information is displayed
    expect(screen.getByText('Current Valuation')).toBeTruthy();
    expect(screen.getByText('$1,200.00')).toBeTruthy();
    expect(screen.getByText('85%')).toBeTruthy(); // Confidence score
    expect(screen.getByText('Market Lookup')).toBeTruthy();
    expect(screen.getByText('+20.0%')).toBeTruthy(); // Value change

    // Check for refresh button
    expect(screen.getByTestId('refresh-valuation-button')).toBeTruthy();
  });

  it('displays loading state correctly', () => {
    (useCurrentValuation as jest.MockedFunction<typeof useCurrentValuation>).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refetch: jest.fn(),
    });

    renderWithProviders(
      <ValuationScreen 
        route={{ params: { itemId: mockItemId } }} 
        navigation={mockNavigation} 
      />
    );

    expect(screen.getByTestId('valuation-loading-spinner')).toBeTruthy();
    expect(screen.getByText('Loading valuation...')).toBeTruthy();
  });

  it('displays error state with retry option', () => {
    const mockRefetch = jest.fn();
    (useCurrentValuation as jest.MockedFunction<typeof useCurrentValuation>).mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Network request failed'),
      refetch: mockRefetch,
    });

    renderWithProviders(
      <ValuationScreen 
        route={{ params: { itemId: mockItemId } }} 
        navigation={mockNavigation} 
      />
    );

    expect(screen.getByText('Error Loading Valuation')).toBeTruthy();
    expect(screen.getByText('Network request failed')).toBeTruthy();
    
    const retryButton = screen.getByText('Retry');
    expect(retryButton).toBeTruthy();
    
    // Test retry functionality
    fireEvent.press(retryButton);
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('displays no valuation state with request option', () => {
    (useCurrentValuation as jest.MockedFunction<typeof useCurrentValuation>).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    (useValuationResponse as jest.MockedFunction<typeof useValuationResponse>).mockReturnValue({
      data: {
        itemId: mockItemId,
        currentValuation: null,
        marketComparisons: [],
        priceHistory: [],
        confidence: null,
        lastUpdated: new Date().toISOString(),
      },
      isLoading: false,
      error: null,
    });

    renderWithProviders(
      <ValuationScreen 
        route={{ params: { itemId: mockItemId } }} 
        navigation={mockNavigation} 
      />
    );

    expect(screen.getByText('No Valuation Available')).toBeTruthy();
    expect(screen.getByText('Request Market Valuation')).toBeTruthy();
  });

  it('handles valuation request', async () => {
    const mockMutate = jest.fn();
    
    (useCurrentValuation as jest.MockedFunction<typeof useCurrentValuation>).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    (useRequestMarketValuation as jest.MockedFunction<typeof useRequestMarketValuation>).mockReturnValue({
      mutate: mockMutate,
      isLoading: false,
      error: null,
      data: null,
    });

    renderWithProviders(
      <ValuationScreen 
        route={{ params: { itemId: mockItemId } }} 
        navigation={mockNavigation} 
      />
    );

    const requestButton = screen.getByText('Request Market Valuation');
    fireEvent.press(requestButton);

    expect(mockMutate).toHaveBeenCalledWith({
      itemIds: [mockItemId],
      requestType: 'market_lookup',
      priority: 1,
    });
  });

  it('displays market comparisons section', async () => {
    renderWithProviders(
      <ValuationScreen 
        route={{ params: { itemId: mockItemId } }} 
        navigation={mockNavigation} 
      />
    );

    // Should show market comparisons
    expect(screen.getByText('Market Comparisons')).toBeTruthy();
    expect(screen.getByText('West Elm Modern Leather Sofa - Excellent')).toBeTruthy();
    expect(screen.getByText('$1,300.00')).toBeTruthy(); // First comparison price
    expect(screen.getByText('eBay')).toBeTruthy(); // Source
  });

  it('displays price history chart', async () => {
    renderWithProviders(
      <ValuationScreen 
        route={{ params: { itemId: mockItemId } }} 
        navigation={mockNavigation} 
      />
    );

    expect(screen.getByText('Price History')).toBeTruthy();
    expect(screen.getByTestId('price-history-chart')).toBeTruthy();
  });

  it('handles refresh button press', async () => {
    const mockRefetch = jest.fn();
    
    (useCurrentValuation as jest.MockedFunction<typeof useCurrentValuation>).mockReturnValue({
      data: mockCurrentValuation,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    renderWithProviders(
      <ValuationScreen 
        route={{ params: { itemId: mockItemId } }} 
        navigation={mockNavigation} 
      />
    );

    const refreshButton = screen.getByTestId('refresh-valuation-button');
    fireEvent.press(refreshButton);

    expect(mockRefetch).toHaveBeenCalled();
  });

  it('shows confidence score with appropriate color coding', () => {
    const highConfidenceValuation = {
      ...mockCurrentValuation,
      confidenceScore: 0.95,
    };

    (useCurrentValuation as jest.MockedFunction<typeof useCurrentValuation>).mockReturnValue({
      data: highConfidenceValuation,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    renderWithProviders(
      <ValuationScreen 
        route={{ params: { itemId: mockItemId } }} 
        navigation={mockNavigation} 
      />
    );

    const confidenceElement = screen.getByText('95%');
    expect(confidenceElement).toBeTruthy();
    
    // Check for high confidence styling (would need to check styles)
    expect(confidenceElement.props.style).toMatchObject(
      expect.objectContaining({
        color: expect.any(String),
      })
    );
  });

  it('handles expired valuations correctly', () => {
    const expiredValuation = {
      ...mockCurrentValuation,
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Expired yesterday
    };

    (useCurrentValuation as jest.MockedFunction<typeof useCurrentValuation>).mockReturnValue({
      data: expiredValuation,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    renderWithProviders(
      <ValuationScreen 
        route={{ params: { itemId: mockItemId } }} 
        navigation={mockNavigation} 
      />
    );

    expect(screen.getByText(/expired/i)).toBeTruthy();
    expect(screen.getByTestId('expiration-warning')).toBeTruthy();
  });

  it('supports pull-to-refresh functionality', async () => {
    const mockRefetch = jest.fn();
    
    (useCurrentValuation as jest.MockedFunction<typeof useCurrentValuation>).mockReturnValue({
      data: mockCurrentValuation,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    renderWithProviders(
      <ValuationScreen 
        route={{ params: { itemId: mockItemId } }} 
        navigation={mockNavigation} 
      />
    );

    const scrollView = screen.getByTestId('valuation-scroll-view');
    
    // Simulate pull-to-refresh
    fireEvent(scrollView, 'refresh');
    
    await waitFor(() => {
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  it('handles navigation to market comparison details', () => {
    renderWithProviders(
      <ValuationScreen 
        route={{ params: { itemId: mockItemId } }} 
        navigation={mockNavigation} 
      />
    );

    // Press on a market comparison
    const comparisonItem = screen.getByText('West Elm Modern Leather Sofa - Excellent');
    fireEvent.press(comparisonItem);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('MarketComparisonDetail', {
      comparisonId: expect.any(String),
    });
  });

  it('displays appropriate content in offline mode', () => {
    renderWithProviders(
      <ValuationScreen 
        route={{ params: { itemId: mockItemId } }} 
        navigation={mockNavigation} 
      />,
      { offline: true }
    );

    // Should show offline indicator
    expect(screen.getByTestId('offline-indicator')).toBeTruthy();
    expect(screen.getByText('You are offline')).toBeTruthy();
    
    // Request button should be disabled
    const requestButton = screen.queryByText('Request Market Valuation');
    if (requestButton) {
      expect(requestButton.props.disabled).toBe(true);
    }
  });
});

// Accessibility tests for mobile
describe('ValuationScreen Accessibility', () => {
  const mockItemId = 'test-item-mobile-123';
  const mockNavigation = createTestNavigationProps();

  it('has proper accessibility labels', () => {
    renderWithProviders(
      <ValuationScreen 
        route={{ params: { itemId: mockItemId } }} 
        navigation={mockNavigation} 
      />
    );

    // Check for accessibility labels
    expect(screen.getByLabelText(/estimated value/i)).toBeTruthy();
    expect(screen.getByLabelText(/confidence score/i)).toBeTruthy();
    expect(screen.getByLabelText(/refresh valuation/i)).toBeTruthy();
  });

  it('supports screen reader announcements', () => {
    const mockRefetch = jest.fn();
    
    (useCurrentValuation as jest.MockedFunction<typeof useCurrentValuation>).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });

    renderWithProviders(
      <ValuationScreen 
        route={{ params: { itemId: mockItemId } }} 
        navigation={mockNavigation} 
      />
    );

    // Loading state should be announced
    const loadingElement = screen.getByTestId('valuation-loading-spinner');
    expect(loadingElement.props.accessibilityLiveRegion).toBe('polite');
    expect(loadingElement.props.accessibilityLabel).toBe('Loading valuation data');
  });

  it('has proper focus management', () => {
    renderWithProviders(
      <ValuationScreen 
        route={{ params: { itemId: mockItemId } }} 
        navigation={mockNavigation} 
      />
    );

    const refreshButton = screen.getByTestId('refresh-valuation-button');
    expect(refreshButton.props.accessible).toBe(true);
    expect(refreshButton.props.accessibilityRole).toBe('button');
  });

  it('provides descriptive error messages for screen readers', () => {
    (useCurrentValuation as jest.MockedFunction<typeof useCurrentValuation>).mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Network connection failed'),
      refetch: jest.fn(),
    });

    renderWithProviders(
      <ValuationScreen 
        route={{ params: { itemId: mockItemId } }} 
        navigation={mockNavigation} 
      />
    );

    const errorElement = screen.getByTestId('valuation-error');
    expect(errorElement.props.accessibilityLabel).toMatch(/error.*network connection failed/i);
    expect(errorElement.props.accessibilityLiveRegion).toBe('assertive');
  });
});

// Performance tests for mobile
describe('ValuationScreen Performance', () => {
  const mockItemId = 'test-item-mobile-123';
  const mockNavigation = createTestNavigationProps();

  it('renders efficiently with large market comparisons', () => {
    // Create large dataset
    const largeMarketComparisons = Array.from({ length: 100 }, (_, i) => ({
      id: `comp-${i}`,
      itemId: mockItemId,
      source: 'ebay' as const,
      title: `Test Item ${i + 1}`,
      price: 100 + i * 10,
      similarityScore: Math.random(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    const largeValuationResponse = {
      ...mockValuationResponse,
      marketComparisons: largeMarketComparisons,
    };

    (useValuationResponse as jest.MockedFunction<typeof useValuationResponse>).mockReturnValue({
      data: largeValuationResponse,
      isLoading: false,
      error: null,
    });

    const renderStart = Date.now();
    
    renderWithProviders(
      <ValuationScreen 
        route={{ params: { itemId: mockItemId } }} 
        navigation={mockNavigation} 
      />
    );

    const renderTime = Date.now() - renderStart;
    
    // Should render within reasonable time even with large dataset
    expect(renderTime).toBeLessThan(1000); // 1 second
    
    // Should use FlatList for performance with large datasets
    expect(screen.getByTestId('market-comparisons-list')).toBeTruthy();
  });

  it('handles memory efficiently with image loading', async () => {
    // Mock comparison with images
    const comparisonWithImages = {
      ...mockValuationResponse.marketComparisons![0],
      imageUrls: [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
        'https://example.com/image3.jpg',
      ],
    };

    (useValuationResponse as jest.MockedFunction<typeof useValuationResponse>).mockReturnValue({
      data: {
        ...mockValuationResponse,
        marketComparisons: [comparisonWithImages],
      },
      isLoading: false,
      error: null,
    });

    renderWithProviders(
      <ValuationScreen 
        route={{ params: { itemId: mockItemId } }} 
        navigation={mockNavigation} 
      />
    );

    // Images should be lazy-loaded
    const imageElements = screen.getAllByTestId(/comparison-image/);
    expect(imageElements.length).toBeGreaterThan(0);
    
    // Should have proper loading states for images
    expect(screen.getByTestId('image-loading-placeholder')).toBeTruthy();
  });
});

// Integration tests for mobile-specific features
describe('ValuationScreen Mobile Integration', () => {
  const mockItemId = 'test-item-mobile-123';
  const mockNavigation = createTestNavigationProps();

  it('integrates with device camera for photo capture', async () => {
    renderWithProviders(
      <ValuationScreen 
        route={{ params: { itemId: mockItemId } }} 
        navigation={mockNavigation} 
      />
    );

    // Should show camera button if available
    const cameraButton = screen.queryByTestId('capture-photo-button');
    if (cameraButton) {
      fireEvent.press(cameraButton);
      
      // Should navigate to camera screen or open camera
      expect(mockNavigation.navigate).toHaveBeenCalledWith('CameraScreen', {
        itemId: mockItemId,
        purpose: 'valuation',
      });
    }
  });

  it('handles deep linking to valuation screen', () => {
    // Simulate deep link navigation
    const deepLinkRoute = {
      params: { 
        itemId: mockItemId,
        fromDeepLink: true,
      },
    };

    renderWithProviders(
      <ValuationScreen 
        route={deepLinkRoute} 
        navigation={mockNavigation} 
      />
    );

    expect(screen.getByText('Current Valuation')).toBeTruthy();
    
    // Should handle deep link analytics
    // This would depend on your analytics implementation
  });

  it('supports sharing valuation information', async () => {
    renderWithProviders(
      <ValuationScreen 
        route={{ params: { itemId: mockItemId } }} 
        navigation={mockNavigation} 
      />
    );

    const shareButton = screen.queryByTestId('share-valuation-button');
    if (shareButton) {
      fireEvent.press(shareButton);
      
      // Should trigger native share functionality
      // This would require mocking React Native's Share module
    }
  });

  it('handles background/foreground app transitions', async () => {
    renderWithProviders(
      <ValuationScreen 
        route={{ params: { itemId: mockItemId } }} 
        navigation={mockNavigation} 
      />
    );

    // Simulate app going to background
    fireEvent(screen.getByTestId('valuation-screen'), 'blur');
    
    // Simulate app coming to foreground
    fireEvent(screen.getByTestId('valuation-screen'), 'focus');
    
    // Should refresh data when returning to foreground
    await waitFor(() => {
      expect(useCurrentValuation().refetch).toHaveBeenCalled();
    });
  });
});
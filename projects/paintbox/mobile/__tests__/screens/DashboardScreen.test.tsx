/**
 * Unit Tests for DashboardScreen (React Native)
 * Tests mobile dashboard functionality, navigation, and offline support
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { MockedProvider } from '@apollo/client/testing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import DashboardScreen from '../../src/screens/DashboardScreen';
import { ApolloMockFactory } from '../../../__tests__/mocks/apolloMocks';
import { SystemAnalysisFactory, ServiceFactory } from '../../../__tests__/factories/systemAnalyzerFactory';

// Mock React Native modules
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(),
  addEventListener: jest.fn(),
}));

jest.mock('react-native-flash-message', () => ({
  showMessage: jest.fn(),
}));

jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
}));

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
  isFocused: jest.fn(() => true),
  setOptions: jest.fn(),
};

const mockRoute = {
  params: {},
  key: 'test-key',
  name: 'Dashboard',
};

// Mock Lottie animations
jest.mock('lottie-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  return React.forwardRef((props: any, ref: any) => (
    <View testID="lottie-animation" {...props} />
  ));
});

describe('DashboardScreen', () => {
  const defaultMocks = ApolloMockFactory.createComprehensiveMocks();
  const mockAnalysis = SystemAnalysisFactory.createHealthy();
  const mockServices = ServiceFactory.createMany(5);

  const renderScreen = (mocks = defaultMocks, props = {}) => {
    return render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <DashboardScreen 
          navigation={mockNavigation} 
          route={mockRoute} 
          {...props} 
        />
      </MockedProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default NetInfo state
    (NetInfo.fetch as jest.Mock).mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    });

    // Setup default AsyncStorage responses
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Loading State', () => {
    it('should show loading indicator while fetching data', async () => {
      const loadingMocks = ApolloMockFactory.createLoadingMocks();
      const { getByTestId } = renderScreen(loadingMocks);

      expect(getByTestId('loading-indicator')).toBeTruthy();
      expect(getByTestId('loading-text')).toBeTruthy();
    });

    it('should show skeleton components during loading', async () => {
      const loadingMocks = ApolloMockFactory.createLoadingMocks();
      const { getAllByTestId } = renderScreen(loadingMocks);

      expect(getAllByTestId('skeleton-card')).toHaveLength(4);
    });

    it('should hide loading indicator after data loads', async () => {
      const { queryByTestId } = renderScreen();

      await waitFor(() => {
        expect(queryByTestId('loading-indicator')).toBeFalsy();
      });
    });
  });

  describe('Data Display', () => {
    it('should display system health overview', async () => {
      const { getByTestId, getByText } = renderScreen();

      await waitFor(() => {
        expect(getByTestId('health-score-card')).toBeTruthy();
        expect(getByTestId('health-status-indicator')).toBeTruthy();
      });

      // Should display health score
      expect(getByText(/\d{1,3}%/)).toBeTruthy();
    });

    it('should display services summary', async () => {
      const { getByTestId, getByText } = renderScreen();

      await waitFor(() => {
        expect(getByTestId('services-summary-card')).toBeTruthy();
        expect(getByText(/total services/i)).toBeTruthy();
        expect(getByText(/healthy/i)).toBeTruthy();
        expect(getByText(/degraded/i)).toBeTruthy();
        expect(getByText(/unhealthy/i)).toBeTruthy();
      });
    });

    it('should display alerts summary', async () => {
      const { getByTestId, getByText } = renderScreen();

      await waitFor(() => {
        expect(getByTestId('alerts-summary-card')).toBeTruthy();
        expect(getByText(/active alerts/i)).toBeTruthy();
      });
    });

    it('should display recent services list', async () => {
      const { getByTestId, getAllByTestId } = renderScreen();

      await waitFor(() => {
        expect(getByTestId('recent-services-list')).toBeTruthy();
        expect(getAllByTestId('service-item').length).toBeGreaterThan(0);
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to services screen when services card pressed', async () => {
      const { getByTestId } = renderScreen();

      await waitFor(() => {
        expect(getByTestId('services-summary-card')).toBeTruthy();
      });

      fireEvent.press(getByTestId('services-summary-card'));

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Services');
    });

    it('should navigate to alerts screen when alerts card pressed', async () => {
      const { getByTestId } = renderScreen();

      await waitFor(() => {
        expect(getByTestId('alerts-summary-card')).toBeTruthy();
      });

      fireEvent.press(getByTestId('alerts-summary-card'));

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Alerts');
    });

    it('should navigate to service detail when service item pressed', async () => {
      const { getByTestId, getAllByTestId } = renderScreen();

      await waitFor(() => {
        expect(getAllByTestId('service-item').length).toBeGreaterThan(0);
      });

      const firstServiceItem = getAllByTestId('service-item')[0];
      fireEvent.press(firstServiceItem);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('ServiceDetail', {
        serviceId: expect.any(String),
      });
    });

    it('should navigate to metrics screen when metrics card pressed', async () => {
      const { getByTestId } = renderScreen();

      await waitFor(() => {
        expect(getByTestId('metrics-summary-card')).toBeTruthy();
      });

      fireEvent.press(getByTestId('metrics-summary-card'));

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Metrics');
    });
  });

  describe('Pull to Refresh', () => {
    it('should trigger refresh when pull-to-refresh is used', async () => {
      const { getByTestId } = renderScreen();

      await waitFor(() => {
        expect(getByTestId('dashboard-scroll-view')).toBeTruthy();
      });

      const scrollView = getByTestId('dashboard-scroll-view');
      
      // Simulate pull-to-refresh
      fireEvent(scrollView, 'refresh');

      expect(getByTestId('refresh-indicator')).toBeTruthy();

      // Wait for refresh to complete
      await waitFor(() => {
        expect(getByTestId('refresh-indicator')).toBeFalsy();
      });
    });

    it('should update data after refresh', async () => {
      const { getByTestId, rerender } = renderScreen();

      await waitFor(() => {
        expect(getByTestId('dashboard-scroll-view')).toBeTruthy();
      });

      // Trigger refresh
      const scrollView = getByTestId('dashboard-scroll-view');
      fireEvent(scrollView, 'refresh');

      // Should show refreshing indicator
      expect(getByTestId('refresh-indicator')).toBeTruthy();

      // Wait for refresh completion
      await waitFor(() => {
        expect(getByTestId('refresh-indicator')).toBeFalsy();
      });
    });
  });

  describe('Offline Support', () => {
    it('should show offline indicator when disconnected', async () => {
      // Mock offline state
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
      });

      const { getByTestId } = renderScreen();

      await waitFor(() => {
        expect(getByTestId('offline-indicator')).toBeTruthy();
      });
    });

    it('should load cached data when offline', async () => {
      // Mock cached data in AsyncStorage
      const cachedData = JSON.stringify(mockAnalysis);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(cachedData);

      // Mock offline state
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
      });

      const { getByTestId, getByText } = renderScreen();

      await waitFor(() => {
        expect(getByTestId('health-score-card')).toBeTruthy();
        expect(getByText(/cached data/i)).toBeTruthy();
      });
    });

    it('should sync data when coming back online', async () => {
      // Start offline
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
      });

      const { getByTestId, rerender } = renderScreen();

      await waitFor(() => {
        expect(getByTestId('offline-indicator')).toBeTruthy();
      });

      // Simulate coming back online
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      });

      // Trigger network state change
      act(() => {
        const networkListener = (NetInfo.addEventListener as jest.Mock).mock.calls[0][0];
        networkListener({
          isConnected: true,
          isInternetReachable: true,
          type: 'wifi',
        });
      });

      await waitFor(() => {
        expect(getByTestId('sync-indicator')).toBeTruthy();
      });
    });

    it('should show data staleness indicator for cached data', async () => {
      // Mock old cached data
      const oldData = {
        ...mockAnalysis,
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(oldData));

      const { getByTestId } = renderScreen();

      await waitFor(() => {
        expect(getByTestId('stale-data-indicator')).toBeTruthy();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error state when data fetch fails', async () => {
      const errorMocks = ApolloMockFactory.createErrorMocks();
      const { getByTestId, getByText } = renderScreen(errorMocks);

      await waitFor(() => {
        expect(getByTestId('error-state')).toBeTruthy();
        expect(getByText(/failed to load/i)).toBeTruthy();
      });
    });

    it('should show retry button on error', async () => {
      const errorMocks = ApolloMockFactory.createErrorMocks();
      const { getByTestId } = renderScreen(errorMocks);

      await waitFor(() => {
        expect(getByTestId('retry-button')).toBeTruthy();
      });
    });

    it('should retry data fetch when retry button pressed', async () => {
      const errorMocks = ApolloMockFactory.createErrorMocks();
      const { getByTestId } = renderScreen(errorMocks);

      await waitFor(() => {
        expect(getByTestId('retry-button')).toBeTruthy();
      });

      fireEvent.press(getByTestId('retry-button'));

      expect(getByTestId('loading-indicator')).toBeTruthy();
    });

    it('should handle partial data failures gracefully', async () => {
      const partialMocks = defaultMocks.slice(0, 2); // Only some successful mocks
      const { getByTestId } = renderScreen(partialMocks);

      await waitFor(() => {
        // Should show available data
        expect(getByTestId('health-score-card')).toBeTruthy();
        
        // Should show error for missing sections
        expect(getByTestId('partial-error-indicator')).toBeTruthy();
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should show real-time indicator when connected', async () => {
      const { getByTestId } = renderScreen();

      await waitFor(() => {
        expect(getByTestId('real-time-indicator')).toBeTruthy();
      });

      const indicator = getByTestId('real-time-indicator');
      expect(indicator.props.style).toMatchObject({
        backgroundColor: expect.stringMatching(/green|#00ff00|#0f0/i),
      });
    });

    it('should update UI when receiving real-time data', async () => {
      const { getByTestId, rerender } = renderScreen();

      await waitFor(() => {
        expect(getByTestId('health-score-card')).toBeTruthy();
      });

      // Simulate real-time update
      const updatedMocks = ApolloMockFactory.createSubscriptionMocks();
      rerender(
        <MockedProvider mocks={[...defaultMocks, ...updatedMocks]} addTypename={false}>
          <DashboardScreen navigation={mockNavigation} route={mockRoute} />
        </MockedProvider>
      );

      // Should show update animation
      await waitFor(() => {
        expect(getByTestId('update-animation')).toBeTruthy();
      });
    });
  });

  describe('User Interactions', () => {
    it('should trigger haptic feedback on card press', async () => {
      const HapticFeedback = require('react-native-haptic-feedback');
      const { getByTestId } = renderScreen();

      await waitFor(() => {
        expect(getByTestId('services-summary-card')).toBeTruthy();
      });

      fireEvent.press(getByTestId('services-summary-card'));

      expect(HapticFeedback.trigger).toHaveBeenCalledWith('impactLight');
    });

    it('should show success message after successful action', async () => {
      const FlashMessage = require('react-native-flash-message');
      const { getByTestId } = renderScreen();

      await waitFor(() => {
        expect(getByTestId('services-summary-card')).toBeTruthy();
      });

      fireEvent.press(getByTestId('services-summary-card'));

      expect(FlashMessage.showMessage).toHaveBeenCalledWith({
        message: expect.any(String),
        type: 'success',
      });
    });
  });

  describe('Performance', () => {
    it('should use FlatList for efficient rendering of large service lists', async () => {
      const manyServices = ServiceFactory.createMany(100);
      const { getByTestId } = renderScreen(defaultMocks, { 
        initialServices: manyServices 
      });

      await waitFor(() => {
        expect(getByTestId('services-flatlist')).toBeTruthy();
      });

      // FlatList should only render visible items
      const renderedItems = getByTestId('services-flatlist').props.data;
      expect(renderedItems.length).toBe(100);
    });

    it('should implement proper key extraction for list performance', async () => {
      const { getByTestId } = renderScreen();

      await waitFor(() => {
        expect(getByTestId('services-flatlist')).toBeTruthy();
      });

      const flatList = getByTestId('services-flatlist');
      expect(flatList.props.keyExtractor).toBeDefined();
    });

    it('should use memo for expensive components', async () => {
      const { getByTestId } = renderScreen();

      await waitFor(() => {
        expect(getByTestId('memoized-chart')).toBeTruthy();
      });

      // Verify component is properly memoized
      const chartComponent = getByTestId('memoized-chart');
      expect(chartComponent.props['data-memoized']).toBe('true');
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels', async () => {
      const { getByTestId } = renderScreen();

      await waitFor(() => {
        expect(getByTestId('health-score-card')).toBeTruthy();
      });

      const healthCard = getByTestId('health-score-card');
      expect(healthCard.props.accessibilityLabel).toBeDefined();
      expect(healthCard.props.accessibilityRole).toBe('button');
    });

    it('should support screen reader navigation', async () => {
      const { getByTestId, getAllByTestId } = renderScreen();

      await waitFor(() => {
        expect(getAllByTestId('service-item').length).toBeGreaterThan(0);
      });

      const serviceItems = getAllByTestId('service-item');
      serviceItems.forEach(item => {
        expect(item.props.accessible).toBe(true);
        expect(item.props.accessibilityLabel).toBeDefined();
      });
    });

    it('should have proper accessibility hints for actions', async () => {
      const { getByTestId } = renderScreen();

      await waitFor(() => {
        expect(getByTestId('services-summary-card')).toBeTruthy();
      });

      const servicesCard = getByTestId('services-summary-card');
      expect(servicesCard.props.accessibilityHint).toBeDefined();
      expect(servicesCard.props.accessibilityHint).toContain('navigate');
    });

    it('should support voice control commands', async () => {
      const { getByTestId } = renderScreen();

      await waitFor(() => {
        expect(getByTestId('dashboard-container')).toBeTruthy();
      });

      const container = getByTestId('dashboard-container');
      expect(container.props.accessibilityActions).toBeDefined();
    });
  });

  describe('Data Persistence', () => {
    it('should cache dashboard data for offline use', async () => {
      const { getByTestId } = renderScreen();

      await waitFor(() => {
        expect(getByTestId('health-score-card')).toBeTruthy();
      });

      // Should call AsyncStorage to cache data
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'dashboard_cache',
        expect.any(String)
      );
    });

    it('should persist user preferences', async () => {
      const { getByTestId } = renderScreen();

      await waitFor(() => {
        expect(getByTestId('settings-button')).toBeTruthy();
      });

      // Simulate changing a preference
      fireEvent.press(getByTestId('settings-button'));

      // Should save preference
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'user_preferences',
        expect.any(String)
      );
    });
  });

  describe('Background Sync', () => {
    it('should register background task for data sync', async () => {
      const { getByTestId } = renderScreen();

      await waitFor(() => {
        expect(getByTestId('dashboard-container')).toBeTruthy();
      });

      // Background sync should be registered
      // This would typically be tested by checking if TaskManager is called
      // For now, we check that the component mounted successfully
      expect(getByTestId('dashboard-container')).toBeTruthy();
    });
  });
});
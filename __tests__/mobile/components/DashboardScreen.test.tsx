import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { MockedProvider } from '@apollo/client/testing';
import { Alert } from 'react-native';
import DashboardScreen from '../../../apps/mobile-dashboard/src/screens/DashboardScreen';
import { DashboardCard } from '../../../apps/mobile-dashboard/src/components/DashboardCard';
import { WidgetComponent } from '../../../apps/mobile-dashboard/src/components/WidgetComponent';
import { GET_DASHBOARDS, GET_DASHBOARD_DATA, DASHBOARD_SUBSCRIPTION } from '../../../apps/mobile-dashboard/src/graphql/dashboard';
import { useAuth } from '../../../apps/mobile-dashboard/src/hooks/useAuth';
import { useNetworkStatus } from '../../../apps/mobile-dashboard/src/hooks/useNetworkStatus';
import { useOfflineStorage } from '../../../apps/mobile-dashboard/src/hooks/useOfflineStorage';

// Mock dependencies
jest.mock('../../../apps/mobile-dashboard/src/hooks/useAuth');
jest.mock('../../../apps/mobile-dashboard/src/hooks/useNetworkStatus');
jest.mock('../../../apps/mobile-dashboard/src/hooks/useOfflineStorage');
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native/Libraries/Components/View/View');
  return {
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    ScrollView: View,
    Slider: View,
    Switch: View,
    TextInput: View,
    ToolbarAndroid: View,
    ViewPagerAndroid: View,
    WebView: View,
    TapGestureHandler: View,
    PanGestureHandler: View,
    PinchGestureHandler: View,
    RotationGestureHandler: View,
    LongPressGestureHandler: View,
    GestureHandlerRootView: View,
    Directions: {},
  };
});

// Mock Async Storage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
}));

const mockDashboards = [
  {
    id: 'dashboard-1',
    name: 'Sales Dashboard',
    organizationId: 'org-123',
    isActive: true,
    config: {
      widgets: [
        {
          id: 'widget-1',
          type: 'metric',
          title: 'Total Revenue',
          query: 'SELECT sum(amount) as revenue FROM transactions',
          config: { format: 'currency', currency: 'USD' },
        },
        {
          id: 'widget-2',
          type: 'line_chart',
          title: 'Daily Sales',
          query: 'SELECT date, sum(amount) as sales FROM transactions GROUP BY date',
          config: { xAxis: 'date', yAxis: 'sales' },
        },
      ],
    },
    lastViewed: new Date().toISOString(),
  },
  {
    id: 'dashboard-2',
    name: 'User Analytics',
    organizationId: 'org-123',
    isActive: true,
    config: {
      widgets: [
        {
          id: 'widget-3',
          type: 'metric',
          title: 'Active Users',
          query: 'SELECT count(distinct user_id) as users FROM events WHERE date >= today() - 30',
          config: { format: 'number' },
        },
      ],
    },
    lastViewed: new Date().toISOString(),
  },
];

const mockWidgetData = {
  'widget-1': [{ revenue: 125000.50 }],
  'widget-2': [
    { date: '2024-01-01', sales: 12000 },
    { date: '2024-01-02', sales: 15000 },
    { date: '2024-01-03', sales: 11000 },
  ],
  'widget-3': [{ users: 2450 }],
};

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  organizationId: 'org-123',
  role: 'USER',
};

const apolloMocks = [
  {
    request: {
      query: GET_DASHBOARDS,
      variables: { organizationId: 'org-123' },
    },
    result: {
      data: {
        dashboards: mockDashboards,
      },
    },
  },
  {
    request: {
      query: GET_DASHBOARD_DATA,
      variables: { dashboardId: 'dashboard-1' },
    },
    result: {
      data: {
        dashboard: mockDashboards[0],
        widgetData: mockWidgetData,
      },
    },
  },
  {
    request: {
      query: DASHBOARD_SUBSCRIPTION,
      variables: { organizationId: 'org-123' },
    },
    result: {
      data: {
        dashboardUpdates: mockDashboards[0],
      },
    },
  },
];

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <NavigationContainer>
    <MockedProvider mocks={apolloMocks} addTypename={false}>
      {children}
    </MockedProvider>
  </NavigationContainer>
);

describe('DashboardScreen', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
    addListener: jest.fn(() => jest.fn()), // Returns unsubscribe function
  };

  const mockRoute = {
    params: { dashboardId: 'dashboard-1' },
  };

  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      loading: false,
    });

    (useNetworkStatus as jest.Mock).mockReturnValue({
      isConnected: true,
      isInternetReachable: true,
    });

    (useOfflineStorage as jest.Mock).mockReturnValue({
      getOfflineData: jest.fn(),
      saveOfflineData: jest.fn(),
      syncData: jest.fn(),
    });

    jest.clearAllMocks();
  });

  describe('Dashboard Loading', () => {
    it('should render loading state initially', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <DashboardScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      expect(getByTestId('dashboard-loading')).toBeTruthy();
    });

    it('should render dashboard after loading', async () => {
      const { getByText, queryByTestId } = render(
        <TestWrapper>
          <DashboardScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(queryByTestId('dashboard-loading')).toBeNull();
        expect(getByText('Sales Dashboard')).toBeTruthy();
      });
    });

    it('should show error state on loading failure', async () => {
      const errorMocks = [
        {
          request: {
            query: GET_DASHBOARD_DATA,
            variables: { dashboardId: 'dashboard-1' },
          },
          error: new Error('Failed to load dashboard'),
        },
      ];

      const { getByText } = render(
        <NavigationContainer>
          <MockedProvider mocks={errorMocks} addTypename={false}>
            <DashboardScreen navigation={mockNavigation} route={mockRoute} />
          </MockedProvider>
        </NavigationContainer>
      );

      await waitFor(() => {
        expect(getByText('Error loading dashboard')).toBeTruthy();
        expect(getByText('Retry')).toBeTruthy();
      });
    });
  });

  describe('Widget Rendering', () => {
    it('should render metric widgets correctly', async () => {
      const { getByText } = render(
        <TestWrapper>
          <WidgetComponent
            widget={mockDashboards[0].config.widgets[0]}
            data={mockWidgetData['widget-1']}
            loading={false}
          />
        </TestWrapper>
      );

      expect(getByText('Total Revenue')).toBeTruthy();
      expect(getByText('$125,000.50')).toBeTruthy();
    });

    it('should render chart widgets correctly', async () => {
      const { getByText, getByTestId } = render(
        <TestWrapper>
          <WidgetComponent
            widget={mockDashboards[0].config.widgets[1]}
            data={mockWidgetData['widget-2']}
            loading={false}
          />
        </TestWrapper>
      );

      expect(getByText('Daily Sales')).toBeTruthy();
      expect(getByTestId('line-chart')).toBeTruthy();
    });

    it('should show loading state for widgets', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <WidgetComponent
            widget={mockDashboards[0].config.widgets[0]}
            data={[]}
            loading={true}
          />
        </TestWrapper>
      );

      expect(getByTestId('widget-loading')).toBeTruthy();
    });

    it('should show empty state for widgets with no data', () => {
      const { getByText } = render(
        <TestWrapper>
          <WidgetComponent
            widget={mockDashboards[0].config.widgets[0]}
            data={[]}
            loading={false}
          />
        </TestWrapper>
      );

      expect(getByText('No data available')).toBeTruthy();
    });
  });

  describe('Dashboard Interactions', () => {
    it('should handle refresh gesture', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <DashboardScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        const scrollView = getByTestId('dashboard-scroll-view');
        fireEvent(scrollView, 'refresh');
      });

      // Should trigger data refetch
      expect(getByTestId('dashboard-loading')).toBeTruthy();
    });

    it('should handle widget tap for detailed view', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <DashboardScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        const widget = getByTestId('widget-widget-1');
        fireEvent.press(widget);
      });

      expect(mockNavigation.navigate).toHaveBeenCalledWith('WidgetDetail', {
        widgetId: 'widget-1',
        dashboardId: 'dashboard-1',
      });
    });

    it('should handle dashboard sharing', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <DashboardScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        const shareButton = getByTestId('share-dashboard-button');
        fireEvent.press(shareButton);
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Share Dashboard',
        'Would you like to share this dashboard?',
        expect.any(Array)
      );
    });
  });

  describe('Offline Functionality', () => {
    it('should show offline indicator when disconnected', async () => {
      (useNetworkStatus as jest.Mock).mockReturnValue({
        isConnected: false,
        isInternetReachable: false,
      });

      const { getByTestId } = render(
        <TestWrapper>
          <DashboardScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      expect(getByTestId('offline-indicator')).toBeTruthy();
    });

    it('should load data from offline storage when offline', async () => {
      const mockOfflineStorage = {
        getOfflineData: jest.fn().mockResolvedValue({
          dashboard: mockDashboards[0],
          widgetData: mockWidgetData,
        }),
        saveOfflineData: jest.fn(),
        syncData: jest.fn(),
      };

      (useNetworkStatus as jest.Mock).mockReturnValue({
        isConnected: false,
        isInternetReachable: false,
      });

      (useOfflineStorage as jest.Mock).mockReturnValue(mockOfflineStorage);

      const { getByText } = render(
        <TestWrapper>
          <DashboardScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('Sales Dashboard')).toBeTruthy();
        expect(mockOfflineStorage.getOfflineData).toHaveBeenCalledWith('dashboard-1');
      });
    });

    it('should sync data when reconnected', async () => {
      const mockOfflineStorage = {
        getOfflineData: jest.fn(),
        saveOfflineData: jest.fn(),
        syncData: jest.fn(),
      };

      (useOfflineStorage as jest.Mock).mockReturnValue(mockOfflineStorage);

      // Start offline
      const networkStatus = { isConnected: false, isInternetReachable: false };
      (useNetworkStatus as jest.Mock).mockReturnValue(networkStatus);

      const { rerender } = render(
        <TestWrapper>
          <DashboardScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      // Simulate coming back online
      networkStatus.isConnected = true;
      networkStatus.isInternetReachable = true;
      (useNetworkStatus as jest.Mock).mockReturnValue(networkStatus);

      rerender(
        <TestWrapper>
          <DashboardScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockOfflineStorage.syncData).toHaveBeenCalled();
      });
    });

    it('should show stale data indicator for offline data', async () => {
      const oldData = {
        dashboard: mockDashboards[0],
        widgetData: mockWidgetData,
        timestamp: Date.now() - (2 * 60 * 60 * 1000), // 2 hours old
      };

      const mockOfflineStorage = {
        getOfflineData: jest.fn().mockResolvedValue(oldData),
        saveOfflineData: jest.fn(),
        syncData: jest.fn(),
      };

      (useNetworkStatus as jest.Mock).mockReturnValue({
        isConnected: false,
        isInternetReachable: false,
      });

      (useOfflineStorage as jest.Mock).mockReturnValue(mockOfflineStorage);

      const { getByTestId } = render(
        <TestWrapper>
          <DashboardScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByTestId('stale-data-indicator')).toBeTruthy();
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should handle real-time dashboard updates', async () => {
      const { getByText, rerender } = render(
        <TestWrapper>
          <DashboardScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('Sales Dashboard')).toBeTruthy();
      });

      // Simulate subscription update
      const updatedMocks = [
        ...apolloMocks,
        {
          request: {
            query: DASHBOARD_SUBSCRIPTION,
            variables: { organizationId: 'org-123' },
          },
          result: {
            data: {
              dashboardUpdates: {
                ...mockDashboards[0],
                name: 'Updated Sales Dashboard',
              },
            },
          },
        },
      ];

      rerender(
        <NavigationContainer>
          <MockedProvider mocks={updatedMocks} addTypename={false}>
            <DashboardScreen navigation={mockNavigation} route={mockRoute} />
          </MockedProvider>
        </NavigationContainer>
      );

      await waitFor(() => {
        expect(getByText('Updated Sales Dashboard')).toBeTruthy();
      });
    });

    it('should show real-time update indicator', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <DashboardScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByTestId('realtime-indicator')).toBeTruthy();
      });
    });
  });

  describe('Performance Optimization', () => {
    it('should use virtualization for large widget lists', async () => {
      const largeDashboard = {
        ...mockDashboards[0],
        config: {
          widgets: Array.from({ length: 50 }, (_, i) => ({
            id: `widget-${i}`,
            type: 'metric',
            title: `Widget ${i}`,
            query: 'SELECT count() as count FROM events',
            config: { format: 'number' },
          })),
        },
      };

      const largeMocks = [
        {
          request: {
            query: GET_DASHBOARD_DATA,
            variables: { dashboardId: 'dashboard-1' },
          },
          result: {
            data: {
              dashboard: largeDashboard,
              widgetData: {},
            },
          },
        },
      ];

      const { getByTestId } = render(
        <NavigationContainer>
          <MockedProvider mocks={largeMocks} addTypename={false}>
            <DashboardScreen navigation={mockNavigation} route={mockRoute} />
          </MockedProvider>
        </NavigationContainer>
      );

      await waitFor(() => {
        expect(getByTestId('virtualized-widget-list')).toBeTruthy();
      });
    });

    it('should implement lazy loading for widget data', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <DashboardScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        const widget = getByTestId('widget-widget-1');

        // Widget should initially show loading
        expect(getByTestId('widget-loading')).toBeTruthy();

        // Scroll widget into view to trigger loading
        fireEvent.scroll(getByTestId('dashboard-scroll-view'), {
          nativeEvent: {
            contentOffset: { y: 0 },
            layoutMeasurement: { height: 800 },
            contentSize: { height: 1200 },
          },
        });
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels', async () => {
      const { getByLabelText } = render(
        <TestWrapper>
          <DashboardScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByLabelText('Sales Dashboard')).toBeTruthy();
        expect(getByLabelText('Refresh dashboard')).toBeTruthy();
        expect(getByLabelText('Share dashboard')).toBeTruthy();
      });
    });

    it('should support screen reader navigation', async () => {
      const { getByA11yRole } = render(
        <TestWrapper>
          <DashboardScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByA11yRole('header')).toBeTruthy(); // Dashboard title
        expect(getByA11yRole('button')).toBeTruthy(); // Action buttons
      });
    });

    it('should have proper focus management', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <DashboardScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        const firstWidget = getByTestId('widget-widget-1');
        fireEvent(firstWidget, 'focus');

        // Should highlight focused widget
        expect(getByTestId('focused-widget-highlight')).toBeTruthy();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show retry button on error', async () => {
      const errorMocks = [
        {
          request: {
            query: GET_DASHBOARD_DATA,
            variables: { dashboardId: 'dashboard-1' },
          },
          error: new Error('Network error'),
        },
      ];

      const { getByText } = render(
        <NavigationContainer>
          <MockedProvider mocks={errorMocks} addTypename={false}>
            <DashboardScreen navigation={mockNavigation} route={mockRoute} />
          </MockedProvider>
        </NavigationContainer>
      );

      await waitFor(() => {
        expect(getByText('Error loading dashboard')).toBeTruthy();
        expect(getByText('Retry')).toBeTruthy();
      });
    });

    it('should handle widget loading errors gracefully', async () => {
      const { getByText } = render(
        <TestWrapper>
          <WidgetComponent
            widget={mockDashboards[0].config.widgets[0]}
            data={[]}
            loading={false}
            error={new Error('Widget error')}
          />
        </TestWrapper>
      );

      expect(getByText('Error loading widget data')).toBeTruthy();
      expect(getByText('Retry')).toBeTruthy();
    });

    it('should show fallback UI for critical errors', async () => {
      const criticalErrorMocks = [
        {
          request: {
            query: GET_DASHBOARD_DATA,
            variables: { dashboardId: 'dashboard-1' },
          },
          error: new Error('Authentication failed'),
        },
      ];

      const { getByText } = render(
        <NavigationContainer>
          <MockedProvider mocks={criticalErrorMocks} addTypename={false}>
            <DashboardScreen navigation={mockNavigation} route={mockRoute} />
          </MockedProvider>
        </NavigationContainer>
      );

      await waitFor(() => {
        expect(getByText('Please log in again')).toBeTruthy();
      });
    });
  });

  describe('Memory Management', () => {
    it('should cleanup subscriptions on unmount', () => {
      const unsubscribeMock = jest.fn();
      (mockNavigation.addListener as jest.Mock).mockReturnValue(unsubscribeMock);

      const { unmount } = render(
        <TestWrapper>
          <DashboardScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      unmount();

      expect(unsubscribeMock).toHaveBeenCalled();
    });

    it('should implement proper image caching', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <DashboardScreen navigation={mockNavigation} route={mockRoute} />
        </TestWrapper>
      );

      await waitFor(() => {
        const chartWidget = getByTestId('widget-widget-2');

        // Should use cached images for chart rendering
        expect(chartWidget.props.source).toEqual({
          uri: expect.stringContaining('cache'),
        });
      });
    });
  });
});

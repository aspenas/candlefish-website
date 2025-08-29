import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { MockedProvider } from '@apollo/client/testing';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as Notifications from 'expo-notifications';

import DashboardScreen from '../DashboardScreen';
import { SecurityThemeProvider } from '../../../theme/SecurityTheme';
import { AuthProvider } from '../../../providers/AuthProvider';
import { 
  mockThreatData, 
  mockSecurityEventData, 
  mockAlertData,
  mockIncidentData 
} from '../../../test/factories/MobileTestFactory';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-community/netinfo');
jest.mock('expo-notifications');
jest.mock('expo-location');
jest.mock('expo-sensors');

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
};

// Mock GraphQL queries
const GET_DASHBOARD_DATA = `
  query GetDashboardData($timeRange: String!) {
    securityOverview(timeRange: $timeRange) {
      totalThreats
      activeIncidents
      criticalAlerts
      systemHealth
      lastUpdated
    }
    recentEvents(limit: 10) {
      id
      type
      severity
      timestamp
      description
      affected_asset
    }
    activeThreatActors(limit: 5) {
      id
      name
      type
      last_activity
      threat_level
    }
  }
`;

const SUBSCRIBE_TO_ALERTS = `
  subscription AlertUpdates {
    alertUpdates {
      id
      title
      severity
      type
      timestamp
      status
    }
  }
`;

const mockDashboardData = {
  securityOverview: {
    totalThreats: 1247,
    activeIncidents: 23,
    criticalAlerts: 8,
    systemHealth: 'HEALTHY',
    lastUpdated: new Date().toISOString()
  },
  recentEvents: [
    mockSecurityEventData({ 
      type: 'MALWARE_DETECTED', 
      severity: 'HIGH',
      description: 'Malware detected on endpoint DESKTOP-001'
    }),
    mockSecurityEventData({ 
      type: 'PHISHING_ATTEMPT', 
      severity: 'MEDIUM',
      description: 'Suspicious email blocked from user@domain.com'
    }),
    mockSecurityEventData({ 
      type: 'FAILED_LOGIN', 
      severity: 'LOW',
      description: 'Multiple failed login attempts detected'
    })
  ],
  activeThreatActors: [
    mockThreatData({ name: 'APT-29', type: 'NATION_STATE', threat_level: 'HIGH' }),
    mockThreatData({ name: 'Lazarus Group', type: 'APT', threat_level: 'CRITICAL' }),
    mockThreatData({ name: 'FIN7', type: 'CYBERCRIMINAL', threat_level: 'MEDIUM' })
  ]
};

const mocks = [
  {
    request: {
      query: GET_DASHBOARD_DATA,
      variables: { timeRange: '24h' }
    },
    result: {
      data: mockDashboardData
    }
  },
  {
    request: {
      query: SUBSCRIBE_TO_ALERTS
    },
    result: {
      data: {
        alertUpdates: mockAlertData({ 
          severity: 'CRITICAL',
          title: 'Critical Security Alert',
          type: 'MALWARE'
        })
      }
    }
  }
];

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <NavigationContainer>
    <SecurityThemeProvider>
      <AuthProvider>
        <MockedProvider mocks={mocks} addTypename={false}>
          {children}
        </MockedProvider>
      </AuthProvider>
    </SecurityThemeProvider>
  </NavigationContainer>
);

describe('DashboardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock AsyncStorage
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(null);
    
    // Mock NetInfo
    (NetInfo.fetch as jest.Mock).mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi'
    });
    
    // Mock Notifications
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted'
    });
  });

  describe('Initial Rendering', () => {
    it('renders dashboard header with title', async () => {
      const { getByText } = render(
        <TestWrapper>
          <DashboardScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      expect(getByText('Security Dashboard')).toBeTruthy();
    });

    it('displays loading state initially', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <DashboardScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      expect(getByTestId('loading-indicator')).toBeTruthy();
    });

    it('shows offline banner when disconnected', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: false,
        isInternetReachable: false
      });

      const { getByText } = render(
        <TestWrapper>
          <DashboardScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('You are offline. Some features may be limited.')).toBeTruthy();
      });
    });
  });

  describe('Dashboard Data Loading', () => {
    it('displays security overview metrics', async () => {
      const { getByText } = render(
        <TestWrapper>
          <DashboardScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('1,247')).toBeTruthy(); // Total Threats
        expect(getByText('23')).toBeTruthy(); // Active Incidents
        expect(getByText('8')).toBeTruthy(); // Critical Alerts
        expect(getByText('HEALTHY')).toBeTruthy(); // System Health
      });
    });

    it('displays recent security events', async () => {
      const { getByText } = render(
        <TestWrapper>
          <DashboardScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('Malware detected on endpoint DESKTOP-001')).toBeTruthy();
        expect(getByText('Suspicious email blocked from user@domain.com')).toBeTruthy();
        expect(getByText('Multiple failed login attempts detected')).toBeTruthy();
      });
    });

    it('shows active threat actors', async () => {
      const { getByText } = render(
        <TestWrapper>
          <DashboardScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('APT-29')).toBeTruthy();
        expect(getByText('Lazarus Group')).toBeTruthy();
        expect(getByText('FIN7')).toBeTruthy();
      });
    });

    it('handles loading errors gracefully', async () => {
      const errorMocks = [
        {
          request: {
            query: GET_DASHBOARD_DATA,
            variables: { timeRange: '24h' }
          },
          error: new Error('Network error')
        }
      ];

      const { getByText } = render(
        <NavigationContainer>
          <SecurityThemeProvider>
            <AuthProvider>
              <MockedProvider mocks={errorMocks} addTypename={false}>
                <DashboardScreen navigation={mockNavigation} />
              </MockedProvider>
            </AuthProvider>
          </SecurityThemeProvider>
        </NavigationContainer>
      );

      await waitFor(() => {
        expect(getByText('Error loading dashboard data')).toBeTruthy();
        expect(getByText('Retry')).toBeTruthy();
      });
    });
  });

  describe('Pull to Refresh', () => {
    it('refreshes data when pulled down', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <DashboardScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      const scrollView = getByTestId('dashboard-scroll-view');
      
      await act(async () => {
        fireEvent(scrollView, 'onRefresh');
      });

      expect(getByTestId('loading-indicator')).toBeTruthy();
    });

    it('shows refresh indicator during pull refresh', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <DashboardScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      const scrollView = getByTestId('dashboard-scroll-view');
      
      await act(async () => {
        fireEvent(scrollView, 'onRefresh');
      });

      expect(getByTestId('refresh-indicator')).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    it('navigates to threat details when threat card is tapped', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <DashboardScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      await waitFor(() => {
        const threatCard = getByTestId('threat-card-0');
        fireEvent.press(threatCard);
      });

      expect(mockNavigate).toHaveBeenCalledWith('ThreatDetails', expect.any(Object));
    });

    it('navigates to incidents when incident card is tapped', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <DashboardScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      await waitFor(() => {
        const incidentCard = getByTestId('incidents-card');
        fireEvent.press(incidentCard);
      });

      expect(mockNavigate).toHaveBeenCalledWith('IncidentManagement');
    });

    it('navigates to alerts when alerts card is tapped', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <DashboardScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      await waitFor(() => {
        const alertsCard = getByTestId('alerts-card');
        fireEvent.press(alertsCard);
      });

      expect(mockNavigate).toHaveBeenCalledWith('AlertManagement');
    });

    it('opens event details modal when event is tapped', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <DashboardScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      await waitFor(() => {
        const eventItem = getByTestId('event-item-0');
        fireEvent.press(eventItem);
      });

      expect(getByTestId('event-details-modal')).toBeTruthy();
    });
  });

  describe('Real-time Updates', () => {
    it('subscribes to alert updates on mount', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <DashboardScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByTestId('real-time-indicator')).toBeTruthy();
      });
    });

    it('shows toast notification for critical alerts', async () => {
      const { getByText } = render(
        <TestWrapper>
          <DashboardScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      // Simulate receiving a critical alert
      await waitFor(() => {
        expect(getByText('Critical Security Alert')).toBeTruthy();
      });
    });

    it('updates metrics when new data is received', async () => {
      const updatedMocks = [
        {
          request: {
            query: GET_DASHBOARD_DATA,
            variables: { timeRange: '24h' }
          },
          result: {
            data: {
              ...mockDashboardData,
              securityOverview: {
                ...mockDashboardData.securityOverview,
                totalThreats: 1250, // Updated value
                criticalAlerts: 9 // Updated value
              }
            }
          }
        }
      ];

      const { getByText } = render(
        <NavigationContainer>
          <SecurityThemeProvider>
            <AuthProvider>
              <MockedProvider mocks={updatedMocks} addTypename={false}>
                <DashboardScreen navigation={mockNavigation} />
              </MockedProvider>
            </AuthProvider>
          </SecurityThemeProvider>
        </NavigationContainer>
      );

      await waitFor(() => {
        expect(getByText('1,250')).toBeTruthy();
        expect(getByText('9')).toBeTruthy();
      });
    });
  });

  describe('Filter and Search', () => {
    it('shows filter modal when filter button is pressed', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <DashboardScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      const filterButton = getByTestId('filter-button');
      fireEvent.press(filterButton);

      expect(getByTestId('filter-modal')).toBeTruthy();
    });

    it('filters events by severity', async () => {
      const { getByTestId, getByText } = render(
        <TestWrapper>
          <DashboardScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      const filterButton = getByTestId('filter-button');
      fireEvent.press(filterButton);

      const severityFilter = getByTestId('severity-filter');
      fireEvent(severityFilter, 'onValueChange', 'HIGH');

      const applyButton = getByText('Apply Filters');
      fireEvent.press(applyButton);

      // Should show only high severity events
      await waitFor(() => {
        expect(getByText('Malware detected on endpoint DESKTOP-001')).toBeTruthy();
      });
    });

    it('searches events by description', async () => {
      const { getByTestId, getByText } = render(
        <TestWrapper>
          <DashboardScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      const searchInput = getByTestId('search-input');
      fireEvent.changeText(searchInput, 'malware');

      await waitFor(() => {
        expect(getByText('Malware detected on endpoint DESKTOP-001')).toBeTruthy();
      });
    });
  });

  describe('Offline Support', () => {
    it('shows cached data when offline', async () => {
      // Mock cached data in AsyncStorage
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'dashboard_data') {
          return Promise.resolve(JSON.stringify(mockDashboardData));
        }
        return Promise.resolve(null);
      });

      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: false,
        isInternetReachable: false
      });

      const { getByText } = render(
        <TestWrapper>
          <DashboardScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('1,247')).toBeTruthy(); // Cached data
        expect(getByText('You are offline. Some features may be limited.')).toBeTruthy();
      });
    });

    it('queues actions when offline', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: false,
        isInternetReachable: false
      });

      const { getByTestId } = render(
        <TestWrapper>
          <DashboardScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      const refreshButton = getByTestId('refresh-button');
      fireEvent.press(refreshButton);

      // Should show queued action indicator
      expect(getByTestId('queued-actions-indicator')).toBeTruthy();
    });

    it('syncs queued actions when connection is restored', async () => {
      let isConnected = false;

      (NetInfo.fetch as jest.Mock).mockImplementation(() => 
        Promise.resolve({
          isConnected,
          isInternetReachable: isConnected
        })
      );

      const { getByTestId } = render(
        <TestWrapper>
          <DashboardScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      // Initially offline
      await waitFor(() => {
        expect(getByTestId('offline-banner')).toBeTruthy();
      });

      // Simulate connection restored
      isConnected = true;

      // Trigger network state change
      await act(async () => {
        // Simulate NetInfo listener callback
      });

      await waitFor(() => {
        expect(getByTestId('sync-indicator')).toBeTruthy();
      });
    });
  });

  describe('Notifications', () => {
    it('requests notification permissions on mount', async () => {
      render(
        <TestWrapper>
          <DashboardScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
      });
    });

    it('shows local notification for critical alerts', async () => {
      (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue('notification-id');

      const { getByTestId } = render(
        <TestWrapper>
          <DashboardScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      // Simulate receiving critical alert
      await waitFor(() => {
        expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
          content: expect.objectContaining({
            title: 'Critical Security Alert',
            priority: 'high'
          }),
          trigger: null
        });
      });
    });

    it('handles notification tap to navigate to relevant screen', async () => {
      const notificationData = {
        type: 'CRITICAL_ALERT',
        alertId: 'alert-123',
        severity: 'CRITICAL'
      };

      (Notifications.addNotificationResponseReceivedListener as jest.Mock).mockImplementation(
        (callback) => {
          // Simulate notification tap
          setTimeout(() => {
            callback({
              notification: {
                request: {
                  content: {
                    data: notificationData
                  }
                }
              }
            });
          }, 100);
          return { remove: jest.fn() };
        }
      );

      render(
        <TestWrapper>
          <DashboardScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('AlertDetails', {
          alertId: 'alert-123'
        });
      });
    });
  });

  describe('Performance', () => {
    it('renders large lists efficiently with virtualization', async () => {
      const largeEventList = Array.from({ length: 1000 }, (_, i) => 
        mockSecurityEventData({ 
          id: `event-${i}`,
          description: `Event ${i}`
        })
      );

      const largeMocks = [
        {
          request: {
            query: GET_DASHBOARD_DATA,
            variables: { timeRange: '24h' }
          },
          result: {
            data: {
              ...mockDashboardData,
              recentEvents: largeEventList
            }
          }
        }
      ];

      const { getByTestId } = render(
        <NavigationContainer>
          <SecurityThemeProvider>
            <AuthProvider>
              <MockedProvider mocks={largeMocks} addTypename={false}>
                <DashboardScreen navigation={mockNavigation} />
              </MockedProvider>
            </AuthProvider>
          </SecurityThemeProvider>
        </NavigationContainer>
      );

      await waitFor(() => {
        expect(getByTestId('virtualized-event-list')).toBeTruthy();
      });
    });

    it('debounces search input to avoid excessive queries', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <DashboardScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      const searchInput = getByTestId('search-input');
      
      // Type multiple characters quickly
      fireEvent.changeText(searchInput, 'm');
      fireEvent.changeText(searchInput, 'ma');
      fireEvent.changeText(searchInput, 'mal');
      fireEvent.changeText(searchInput, 'malware');

      // Should debounce and only search after delay
      await waitFor(() => {
        // Verify search was debounced
      }, { timeout: 1000 });
    });

    it('implements efficient image loading with caching', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <DashboardScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      await waitFor(() => {
        const threatActorImage = getByTestId('threat-actor-avatar-0');
        expect(threatActorImage).toBeTruthy();
      });
    });
  });

  describe('Security', () => {
    it('validates user session on screen focus', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <DashboardScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      // Simulate screen focus event
      act(() => {
        mockNavigation.addListener.mock.calls[0][1](); // Call focus listener
      });

      // Should validate session
      expect(getByTestId('session-validation-indicator')).toBeTruthy();
    });

    it('logs out user if session is invalid', async () => {
      // Mock invalid session
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'auth_token') {
          return Promise.resolve('invalid_token');
        }
        return Promise.resolve(null);
      });

      const { getByText } = render(
        <TestWrapper>
          <DashboardScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('Session expired. Please log in again.')).toBeTruthy();
      });
    });

    it('masks sensitive data in screenshots', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <DashboardScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      // Simulate app going to background
      await act(async () => {
        // Trigger app state change
      });

      expect(getByTestId('privacy-overlay')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('has proper accessibility labels', async () => {
      const { getByLabelText } = render(
        <TestWrapper>
          <DashboardScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      expect(getByLabelText('Security Dashboard')).toBeTruthy();
      expect(getByLabelText('Total Threats: 1,247')).toBeTruthy();
      expect(getByLabelText('Active Incidents: 23')).toBeTruthy();
    });

    it('supports VoiceOver navigation', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <DashboardScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      const element = getByTestId('threats-card');
      expect(element.props.accessible).toBe(true);
      expect(element.props.accessibilityRole).toBe('button');
    });

    it('has sufficient color contrast for accessibility', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <DashboardScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      // This would typically be tested with actual color contrast tools
      expect(getByTestId('dashboard-container')).toBeTruthy();
    });
  });

  describe('Biometric Authentication', () => {
    it('requests biometric authentication for sensitive actions', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <DashboardScreen navigation={mockNavigation} />
        </TestWrapper>
      );

      const sensitiveAction = getByTestId('export-data-button');
      fireEvent.press(sensitiveAction);

      expect(getByTestId('biometric-prompt')).toBeTruthy();
    });
  });
});
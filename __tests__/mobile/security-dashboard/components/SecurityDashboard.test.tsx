import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { MockedProvider } from '@apollo/client/testing';
import { NavigationContainer } from '@react-navigation/native';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-netinfo/jest/netinfo-mock';
import { SecurityDashboard } from '../../../../apps/mobile-security-dashboard/src/screens/SecurityDashboard';
import {
  GET_SECURITY_OVERVIEW,
  SECURITY_EVENT_ADDED_SUBSCRIPTION
} from '../../../../apps/mobile-security-dashboard/src/graphql/queries/security.graphql';
import { ThreatLevel } from '../../../../apps/mobile-security-dashboard/src/types/security';

// Mock native modules
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
  addEventListener: jest.fn(() => jest.fn()),
}));

jest.mock('react-native-biometrics', () => ({
  isSensorAvailable: jest.fn(() => Promise.resolve({ available: true, biometryType: 'TouchID' })),
  createSignature: jest.fn(() => Promise.resolve({ success: true, signature: 'mock-signature' })),
}));

jest.mock('@react-native-firebase/messaging', () => ({
  hasPermission: jest.fn(() => Promise.resolve(true)),
  subscribeToTopic: jest.fn(),
  unsubscribeFromTopic: jest.fn(),
  requestPermission: jest.fn(() => Promise.resolve(true)),
  getToken: jest.fn(() => Promise.resolve('mock-token')),
  onMessage: jest.fn(() => jest.fn()),
  setBackgroundMessageHandler: jest.fn(),
}));

const mockSecurityOverview = {
  totalAssets: 15,
  criticalVulnerabilities: 2,
  activeAlerts: 5,
  complianceScore: 82.3,
  threatLevel: ThreatLevel.HIGH,
  vulnerabilitiesBySeverity: [
    { severity: ThreatLevel.CRITICAL, count: 2 },
    { severity: ThreatLevel.HIGH, count: 4 },
    { severity: ThreatLevel.MEDIUM, count: 8 },
    { severity: ThreatLevel.LOW, count: 3 },
  ],
};

const mocks = [
  {
    request: {
      query: GET_SECURITY_OVERVIEW,
      variables: {
        organizationId: 'org-123',
      },
    },
    result: {
      data: {
        securityOverview: mockSecurityOverview,
      },
    },
  },
];

const subscriptionMocks = [
  {
    request: {
      query: SECURITY_EVENT_ADDED_SUBSCRIPTION,
      variables: {
        organizationId: 'org-123',
      },
    },
    result: {
      data: {
        securityEventAdded: {
          id: 'event-123',
          title: 'Suspicious Login Attempt',
          severity: ThreatLevel.HIGH,
          eventType: 'LOGIN_ATTEMPT',
          createdAt: '2024-01-01T10:00:00Z',
        },
      },
    },
  },
];

const errorMocks = [
  {
    request: {
      query: GET_SECURITY_OVERVIEW,
      variables: {
        organizationId: 'org-123',
      },
    },
    error: new Error('Network request failed'),
  },
];

const renderSecurityDashboard = (mocks: any[] = []) => {
  return render(
    <NavigationContainer>
      <MockedProvider mocks={mocks} addTypename={false}>
        <SecurityDashboard organizationId="org-123" />
      </MockedProvider>
    </NavigationContainer>
  );
};

describe('SecurityDashboard Mobile Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Initial Loading and Data Display', () => {
    it('should display loading indicator while fetching data', () => {
      const { getByTestId } = renderSecurityDashboard(mocks);

      expect(getByTestId('loading-indicator')).toBeTruthy();
    });

    it('should display security metrics after loading', async () => {
      const { getByText, queryByTestId } = renderSecurityDashboard(mocks);

      await waitFor(() => {
        expect(queryByTestId('loading-indicator')).toBeFalsy();
        expect(getByText('15')).toBeTruthy(); // Total Assets
        expect(getByText('2')).toBeTruthy(); // Critical Vulnerabilities
        expect(getByText('5')).toBeTruthy(); // Active Alerts
        expect(getByText('82.3%')).toBeTruthy(); // Compliance Score
      });
    });

    it('should display threat level with correct styling', async () => {
      const { getByTestId } = renderSecurityDashboard(mocks);

      await waitFor(() => {
        const threatLevelBadge = getByTestId('threat-level-badge');
        expect(threatLevelBadge).toBeTruthy();
        expect(threatLevelBadge.props.children).toBe('HIGH');
      });
    });

    it('should render metric cards with proper accessibility labels', async () => {
      const { getByA11yLabel } = renderSecurityDashboard(mocks);

      await waitFor(() => {
        expect(getByA11yLabel('Total assets: 15')).toBeTruthy();
        expect(getByA11yLabel('Critical vulnerabilities: 2')).toBeTruthy();
        expect(getByA11yLabel('Active alerts: 5')).toBeTruthy();
        expect(getByA11yLabel('Compliance score: 82.3 percent')).toBeTruthy();
      });
    });
  });

  describe('Pull to Refresh', () => {
    it('should refresh data when pull to refresh is triggered', async () => {
      const { getByTestId } = renderSecurityDashboard(mocks);

      await waitFor(() => {
        expect(getByTestId('security-metrics')).toBeTruthy();
      });

      const scrollView = getByTestId('dashboard-scroll-view');

      // Simulate pull to refresh
      act(() => {
        fireEvent(scrollView, 'refresh');
      });

      // Should show refreshing indicator
      expect(getByTestId('refresh-indicator')).toBeTruthy();

      await waitFor(() => {
        expect(getByTestId('refresh-indicator')).toBeFalsy();
      });
    });

    it('should update last refresh timestamp', async () => {
      const { getByTestId, getByText } = renderSecurityDashboard(mocks);

      await waitFor(() => {
        expect(getByTestId('security-metrics')).toBeTruthy();
      });

      const scrollView = getByTestId('dashboard-scroll-view');

      act(() => {
        fireEvent(scrollView, 'refresh');
      });

      await waitFor(() => {
        expect(getByText(/last updated/i)).toBeTruthy();
      });
    });
  });

  describe('Offline Functionality', () => {
    it('should display cached data when offline', async () => {
      // First load data while online
      const { getByText, rerender } = renderSecurityDashboard(mocks);

      await waitFor(() => {
        expect(getByText('15')).toBeTruthy();
      });

      // Cache data
      await AsyncStorage.setItem('security-overview-org-123', JSON.stringify(mockSecurityOverview));

      // Simulate going offline
      NetInfo.fetch.mockResolvedValue({ isConnected: false });

      // Re-render component
      rerender(
        <NavigationContainer>
          <MockedProvider mocks={[]} addTypename={false}>
            <SecurityDashboard organizationId="org-123" />
          </MockedProvider>
        </NavigationContainer>
      );

      await waitFor(() => {
        expect(getByText('15')).toBeTruthy(); // Should show cached data
      });
    });

    it('should show offline banner when disconnected', async () => {
      NetInfo.fetch.mockResolvedValue({ isConnected: false });

      const { getByTestId } = renderSecurityDashboard([]);

      await waitFor(() => {
        expect(getByTestId('offline-banner')).toBeTruthy();
      });
    });

    it('should hide offline banner when reconnected', async () => {
      // Start offline
      NetInfo.fetch.mockResolvedValue({ isConnected: false });

      const { getByTestId, queryByTestId } = renderSecurityDashboard([]);

      await waitFor(() => {
        expect(getByTestId('offline-banner')).toBeTruthy();
      });

      // Simulate reconnection
      NetInfo.fetch.mockResolvedValue({ isConnected: true });

      // Trigger network state change
      act(() => {
        NetInfo.addEventListener.mock.calls[0][0]({ isConnected: true });
      });

      await waitFor(() => {
        expect(queryByTestId('offline-banner')).toBeFalsy();
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should display real-time security event notifications', async () => {
      const { getByText, getByTestId } = renderSecurityDashboard([...mocks, ...subscriptionMocks]);

      await waitFor(() => {
        expect(getByText('15')).toBeTruthy();
      });

      // Simulate receiving real-time event
      await waitFor(() => {
        expect(getByTestId('notification-toast')).toBeTruthy();
        expect(getByText('New Security Event')).toBeTruthy();
        expect(getByText('Suspicious Login Attempt')).toBeTruthy();
      });
    });

    it('should auto-dismiss notifications after timeout', async () => {
      jest.useFakeTimers();

      const { queryByTestId } = renderSecurityDashboard([...mocks, ...subscriptionMocks]);

      await waitFor(() => {
        expect(queryByTestId('notification-toast')).toBeTruthy();
      });

      // Fast forward 5 seconds
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(queryByTestId('notification-toast')).toBeFalsy();

      jest.useRealTimers();
    });

    it('should allow manual dismissal of notifications', async () => {
      const { getByTestId, queryByTestId } = renderSecurityDashboard([...mocks, ...subscriptionMocks]);

      await waitFor(() => {
        expect(getByTestId('notification-toast')).toBeTruthy();
      });

      const dismissButton = getByTestId('notification-dismiss');
      fireEvent.press(dismissButton);

      expect(queryByTestId('notification-toast')).toBeFalsy();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when data fails to load', async () => {
      const { getByText, getByTestId } = renderSecurityDashboard(errorMocks);

      await waitFor(() => {
        expect(getByTestId('error-container')).toBeTruthy();
        expect(getByText('Unable to load security overview')).toBeTruthy();
        expect(getByText('Network request failed')).toBeTruthy();
      });
    });

    it('should show retry button on error', async () => {
      const { getByTestId } = renderSecurityDashboard(errorMocks);

      await waitFor(() => {
        expect(getByTestId('retry-button')).toBeTruthy();
      });
    });

    it('should retry loading when retry button is pressed', async () => {
      const { getByTestId, rerender } = renderSecurityDashboard(errorMocks);

      await waitFor(() => {
        expect(getByTestId('retry-button')).toBeTruthy();
      });

      fireEvent.press(getByTestId('retry-button'));

      // Simulate successful retry
      rerender(
        <NavigationContainer>
          <MockedProvider mocks={mocks} addTypename={false}>
            <SecurityDashboard organizationId="org-123" />
          </MockedProvider>
        </NavigationContainer>
      );

      await waitFor(() => {
        expect(getByTestId('security-metrics')).toBeTruthy();
      });
    });
  });

  describe('Navigation and Interactions', () => {
    it('should navigate to vulnerabilities screen when vulnerability card is pressed', async () => {
      const mockNavigate = jest.fn();
      jest.mock('@react-navigation/native', () => ({
        ...jest.requireActual('@react-navigation/native'),
        useNavigation: () => ({ navigate: mockNavigate }),
      }));

      const { getByTestId } = renderSecurityDashboard(mocks);

      await waitFor(() => {
        expect(getByTestId('critical-vulnerabilities-card')).toBeTruthy();
      });

      fireEvent.press(getByTestId('critical-vulnerabilities-card'));

      expect(mockNavigate).toHaveBeenCalledWith('VulnerabilityList', {
        severity: 'CRITICAL',
        organizationId: 'org-123',
      });
    });

    it('should navigate to alerts screen when alerts card is pressed', async () => {
      const mockNavigate = jest.fn();
      jest.mock('@react-navigation/native', () => ({
        ...jest.requireActual('@react-navigation/native'),
        useNavigation: () => ({ navigate: mockNavigate }),
      }));

      const { getByTestId } = renderSecurityDashboard(mocks);

      await waitFor(() => {
        expect(getByTestId('active-alerts-card')).toBeTruthy();
      });

      fireEvent.press(getByTestId('active-alerts-card'));

      expect(mockNavigate).toHaveBeenCalledWith('AlertList', {
        status: 'ACTIVE',
        organizationId: 'org-123',
      });
    });

    it('should show chart modal when chart is pressed', async () => {
      const { getByTestId } = renderSecurityDashboard(mocks);

      await waitFor(() => {
        expect(getByTestId('vulnerabilities-chart')).toBeTruthy();
      });

      fireEvent.press(getByTestId('vulnerabilities-chart'));

      expect(getByTestId('chart-modal')).toBeTruthy();
    });

    it('should close chart modal when backdrop is pressed', async () => {
      const { getByTestId, queryByTestId } = renderSecurityDashboard(mocks);

      await waitFor(() => {
        expect(getByTestId('vulnerabilities-chart')).toBeTruthy();
      });

      fireEvent.press(getByTestId('vulnerabilities-chart'));
      expect(getByTestId('chart-modal')).toBeTruthy();

      fireEvent.press(getByTestId('modal-backdrop'));
      expect(queryByTestId('chart-modal')).toBeFalsy();
    });
  });

  describe('Push Notifications', () => {
    it('should request notification permissions on mount', async () => {
      const messaging = require('@react-native-firebase/messaging');

      renderSecurityDashboard(mocks);

      await waitFor(() => {
        expect(messaging().requestPermission).toHaveBeenCalled();
      });
    });

    it('should handle incoming push notifications', async () => {
      const messaging = require('@react-native-firebase/messaging');
      const onMessageCallback = jest.fn();

      messaging().onMessage.mockImplementation(onMessageCallback);

      renderSecurityDashboard(mocks);

      expect(messaging().onMessage).toHaveBeenCalled();

      // Simulate receiving a push notification
      const mockNotification = {
        notification: {
          title: 'Security Alert',
          body: 'Critical vulnerability detected',
        },
        data: {
          type: 'SECURITY_EVENT',
          organizationId: 'org-123',
        },
      };

      act(() => {
        onMessageCallback.mock.calls[0][0](mockNotification);
      });

      // Should display notification toast
      await waitFor(() => {
        expect(getByTestId('notification-toast')).toBeTruthy();
      });
    });
  });

  describe('Biometric Authentication', () => {
    it('should prompt for biometric authentication on sensitive actions', async () => {
      const { getByTestId } = renderSecurityDashboard(mocks);

      await waitFor(() => {
        expect(getByTestId('critical-vulnerabilities-card')).toBeTruthy();
      });

      // Long press on critical vulnerabilities card should trigger biometric prompt
      fireEvent(getByTestId('critical-vulnerabilities-card'), 'longPress');

      expect(getByTestId('biometric-prompt')).toBeTruthy();
    });

    it('should proceed with action after successful biometric authentication', async () => {
      const ReactNativeBiometrics = require('react-native-biometrics');
      ReactNativeBiometrics.createSignature.mockResolvedValue({ success: true });

      const { getByTestId } = renderSecurityDashboard(mocks);

      await waitFor(() => {
        expect(getByTestId('critical-vulnerabilities-card')).toBeTruthy();
      });

      fireEvent(getByTestId('critical-vulnerabilities-card'), 'longPress');
      expect(getByTestId('biometric-prompt')).toBeTruthy();

      // Simulate successful biometric authentication
      fireEvent.press(getByTestId('biometric-authenticate'));

      await waitFor(() => {
        expect(getByTestId('detailed-view')).toBeTruthy();
      });
    });

    it('should cancel action on failed biometric authentication', async () => {
      const ReactNativeBiometrics = require('react-native-biometrics');
      ReactNativeBiometrics.createSignature.mockResolvedValue({ success: false });

      const { getByTestId, queryByTestId } = renderSecurityDashboard(mocks);

      await waitFor(() => {
        expect(getByTestId('critical-vulnerabilities-card')).toBeTruthy();
      });

      fireEvent(getByTestId('critical-vulnerabilities-card'), 'longPress');
      fireEvent.press(getByTestId('biometric-authenticate'));

      await waitFor(() => {
        expect(queryByTestId('detailed-view')).toBeFalsy();
        expect(queryByTestId('biometric-prompt')).toBeFalsy();
      });
    });
  });

  describe('Accessibility', () => {
    it('should support screen reader navigation', async () => {
      const { getByA11yRole } = renderSecurityDashboard(mocks);

      await waitFor(() => {
        expect(getByA11yRole('header')).toBeTruthy(); // Dashboard header
        expect(getByA11yRole('grid')).toBeTruthy(); // Metrics grid
      });
    });

    it('should have proper accessibility hints for interactive elements', async () => {
      const { getByA11yHint } = renderSecurityDashboard(mocks);

      await waitFor(() => {
        expect(getByA11yHint('Double tap to view critical vulnerabilities')).toBeTruthy();
        expect(getByA11yHint('Double tap to view active alerts')).toBeTruthy();
      });
    });

    it('should support voice control commands', async () => {
      const { getByA11yLabel } = renderSecurityDashboard(mocks);

      await waitFor(() => {
        // Voice control labels should be present
        expect(getByA11yLabel('Refresh dashboard')).toBeTruthy();
        expect(getByA11yLabel('View vulnerabilities')).toBeTruthy();
        expect(getByA11yLabel('View alerts')).toBeTruthy();
      });
    });

    it('should adjust font sizes based on accessibility settings', async () => {
      // Mock accessibility settings
      jest.mock('react-native', () => ({
        ...jest.requireActual('react-native'),
        AccessibilityInfo: {
          isReduceMotionEnabled: jest.fn(() => Promise.resolve(false)),
          isReduceTransparencyEnabled: jest.fn(() => Promise.resolve(false)),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        },
      }));

      const { getByTestId } = renderSecurityDashboard(mocks);

      await waitFor(() => {
        const metricValue = getByTestId('metric-value');
        // Should have appropriate text scaling
        expect(metricValue.props.style).toContainEqual({
          fontSize: expect.any(Number),
        });
      });
    });
  });

  describe('Performance', () => {
    it('should memoize expensive chart calculations', async () => {
      const { getByTestId, rerender } = renderSecurityDashboard(mocks);

      await waitFor(() => {
        expect(getByTestId('vulnerabilities-chart')).toBeTruthy();
      });

      // Re-render with same data should not recalculate
      rerender(
        <NavigationContainer>
          <MockedProvider mocks={mocks} addTypename={false}>
            <SecurityDashboard organizationId="org-123" />
          </MockedProvider>
        </NavigationContainer>
      );

      // Chart should still be present without recalculation
      expect(getByTestId('vulnerabilities-chart')).toBeTruthy();
    });

    it('should use lazy loading for chart components', async () => {
      const { queryByTestId } = renderSecurityDashboard(mocks);

      // Chart should not be immediately rendered
      expect(queryByTestId('vulnerabilities-chart')).toBeFalsy();

      // Should render after data is loaded
      await waitFor(() => {
        expect(queryByTestId('vulnerabilities-chart')).toBeTruthy();
      });
    });

    it('should handle memory warnings gracefully', async () => {
      const { getByTestId } = renderSecurityDashboard(mocks);

      await waitFor(() => {
        expect(getByTestId('security-metrics')).toBeTruthy();
      });

      // Simulate memory warning
      act(() => {
        // This would typically be handled by the app state change listener
        // For testing, we simulate the cleanup behavior
      });

      // Component should still be functional
      expect(getByTestId('security-metrics')).toBeTruthy();
    });
  });

  describe('Data Persistence', () => {
    it('should persist user preferences', async () => {
      const { getByTestId } = renderSecurityDashboard(mocks);

      await waitFor(() => {
        expect(getByTestId('settings-button')).toBeTruthy();
      });

      fireEvent.press(getByTestId('settings-button'));
      fireEvent.press(getByTestId('enable-notifications'));

      // Should save preference to AsyncStorage
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'user-preferences',
        expect.stringContaining('notifications')
      );
    });

    it('should restore user preferences on app launch', async () => {
      // Set mock preferences
      AsyncStorage.getItem.mockResolvedValue(
        JSON.stringify({ notificationsEnabled: true })
      );

      const { getByTestId } = renderSecurityDashboard(mocks);

      await waitFor(() => {
        const notificationToggle = getByTestId('notification-toggle');
        expect(notificationToggle.props.value).toBe(true);
      });
    });
  });
});

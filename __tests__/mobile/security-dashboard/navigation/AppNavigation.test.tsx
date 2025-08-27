import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppNavigation } from '../../../../apps/mobile-security-dashboard/src/navigation/AppNavigation';
import { AuthProvider } from '../../../../apps/mobile-security-dashboard/src/providers/AuthProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock navigation components
jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: jest.fn(() => ({
    Navigator: ({ children }: any) => <>{children}</>,
    Screen: ({ children }: any) => <>{children}</>,
  })),
}));

// Mock screens
const MockSecurityDashboard = () => <div testID="security-dashboard">Security Dashboard</div>;
const MockVulnerabilityList = () => <div testID="vulnerability-list">Vulnerability List</div>;
const MockAlertList = () => <div testID="alert-list">Alert List</div>;
const MockAssetManagement = () => <div testID="asset-management">Asset Management</div>;
const MockSettings = () => <div testID="settings">Settings</div>;
const MockLogin = () => <div testID="login">Login Screen</div>;

jest.mock('../../../../apps/mobile-security-dashboard/src/screens/SecurityDashboard', () => ({
  SecurityDashboard: MockSecurityDashboard,
}));

jest.mock('../../../../apps/mobile-security-dashboard/src/screens/VulnerabilityList', () => ({
  VulnerabilityList: MockVulnerabilityList,
}));

jest.mock('../../../../apps/mobile-security-dashboard/src/screens/AlertList', () => ({
  AlertList: MockAlertList,
}));

jest.mock('../../../../apps/mobile-security-dashboard/src/screens/AssetManagement', () => ({
  AssetManagement: MockAssetManagement,
}));

jest.mock('../../../../apps/mobile-security-dashboard/src/screens/Settings', () => ({
  Settings: MockSettings,
}));

jest.mock('../../../../apps/mobile-security-dashboard/src/screens/Login', () => ({
  Login: MockLogin,
}));

// Mock authentication
const mockAuthContext = {
  isAuthenticated: true,
  user: {
    id: 'user-123',
    organizationId: 'org-123',
    email: 'test@example.com',
  },
  login: jest.fn(),
  logout: jest.fn(),
  loading: false,
};

const renderWithAuth = (authState = mockAuthContext) => {
  return render(
    <AuthProvider value={authState}>
      <NavigationContainer>
        <AppNavigation />
      </NavigationContainer>
    </AuthProvider>
  );
};

describe('AppNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
  });

  describe('Authentication Flow', () => {
    it('should render login screen when not authenticated', async () => {
      const unauthenticatedState = {
        ...mockAuthContext,
        isAuthenticated: false,
        user: null,
      };

      const { getByTestId } = renderWithAuth(unauthenticatedState);

      expect(getByTestId('login')).toBeTruthy();
    });

    it('should render main navigation when authenticated', async () => {
      const { getByTestId } = renderWithAuth();

      await waitFor(() => {
        expect(getByTestId('security-dashboard')).toBeTruthy();
      });
    });

    it('should show loading screen during authentication check', async () => {
      const loadingState = {
        ...mockAuthContext,
        loading: true,
      };

      const { getByTestId } = renderWithAuth(loadingState);

      expect(getByTestId('loading-screen')).toBeTruthy();
    });

    it('should redirect to login after logout', async () => {
      const { getByTestId, rerender } = renderWithAuth();

      await waitFor(() => {
        expect(getByTestId('security-dashboard')).toBeTruthy();
      });

      // Simulate logout
      const loggedOutState = {
        ...mockAuthContext,
        isAuthenticated: false,
        user: null,
      };

      rerender(
        <AuthProvider value={loggedOutState}>
          <NavigationContainer>
            <AppNavigation />
          </NavigationContainer>
        </AuthProvider>
      );

      expect(getByTestId('login')).toBeTruthy();
    });
  });

  describe('Navigation Structure', () => {
    it('should initialize with security dashboard as default screen', async () => {
      const { getByTestId } = renderWithAuth();

      await waitFor(() => {
        expect(getByTestId('security-dashboard')).toBeTruthy();
      });
    });

    it('should navigate to vulnerability list screen', async () => {
      const mockNavigate = jest.fn();
      jest.mock('@react-navigation/native', () => ({
        ...jest.requireActual('@react-navigation/native'),
        useNavigation: () => ({ navigate: mockNavigate }),
      }));

      const { getByTestId } = renderWithAuth();

      await waitFor(() => {
        expect(getByTestId('security-dashboard')).toBeTruthy();
      });

      // Simulate navigation action
      const vulnerabilityButton = getByTestId('navigate-vulnerabilities');
      fireEvent.press(vulnerabilityButton);

      expect(mockNavigate).toHaveBeenCalledWith('VulnerabilityList');
    });

    it('should navigate to alert list screen', async () => {
      const mockNavigate = jest.fn();
      jest.mock('@react-navigation/native', () => ({
        ...jest.requireActual('@react-navigation/native'),
        useNavigation: () => ({ navigate: mockNavigate }),
      }));

      const { getByTestId } = renderWithAuth();

      await waitFor(() => {
        expect(getByTestId('security-dashboard')).toBeTruthy();
      });

      // Simulate navigation action
      const alertButton = getByTestId('navigate-alerts');
      fireEvent.press(alertButton);

      expect(mockNavigate).toHaveBeenCalledWith('AlertList');
    });

    it('should navigate to asset management screen', async () => {
      const mockNavigate = jest.fn();

      const { getByTestId } = renderWithAuth();

      await waitFor(() => {
        expect(getByTestId('security-dashboard')).toBeTruthy();
      });

      // Simulate navigation via tab navigation
      const assetTab = getByTestId('tab-assets');
      fireEvent.press(assetTab);

      expect(getByTestId('asset-management')).toBeTruthy();
    });

    it('should navigate to settings screen', async () => {
      const { getByTestId } = renderWithAuth();

      await waitFor(() => {
        expect(getByTestId('security-dashboard')).toBeTruthy();
      });

      // Simulate navigation via tab navigation
      const settingsTab = getByTestId('tab-settings');
      fireEvent.press(settingsTab);

      expect(getByTestId('settings')).toBeTruthy();
    });
  });

  describe('Deep Linking', () => {
    it('should handle deep link to specific vulnerability', async () => {
      // Mock linking configuration
      const mockLinking = {
        config: {
          screens: {
            VulnerabilityDetails: 'vulnerability/:id',
          },
        },
      };

      const { getByTestId } = render(
        <NavigationContainer linking={mockLinking}>
          <AuthProvider value={mockAuthContext}>
            <AppNavigation />
          </AuthProvider>
        </NavigationContainer>
      );

      // Simulate deep link navigation
      expect(getByTestId('vulnerability-details')).toBeTruthy();
    });

    it('should handle deep link to specific alert', async () => {
      const mockLinking = {
        config: {
          screens: {
            AlertDetails: 'alert/:id',
          },
        },
      };

      const { getByTestId } = render(
        <NavigationContainer linking={mockLinking}>
          <AuthProvider value={mockAuthContext}>
            <AppNavigation />
          </AuthProvider>
        </NavigationContainer>
      );

      expect(getByTestId('alert-details')).toBeTruthy();
    });

    it('should redirect unauthenticated deep links to login', async () => {
      const unauthenticatedState = {
        ...mockAuthContext,
        isAuthenticated: false,
        user: null,
      };

      const mockLinking = {
        config: {
          screens: {
            VulnerabilityDetails: 'vulnerability/:id',
          },
        },
      };

      const { getByTestId } = render(
        <NavigationContainer linking={mockLinking}>
          <AuthProvider value={unauthenticatedState}>
            <AppNavigation />
          </AuthProvider>
        </NavigationContainer>
      );

      expect(getByTestId('login')).toBeTruthy();
    });
  });

  describe('Navigation Persistence', () => {
    it('should save navigation state to AsyncStorage', async () => {
      const { getByTestId } = renderWithAuth();

      await waitFor(() => {
        expect(getByTestId('security-dashboard')).toBeTruthy();
      });

      // Navigate to different screen
      const settingsTab = getByTestId('tab-settings');
      fireEvent.press(settingsTab);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'navigation-state',
        expect.any(String)
      );
    });

    it('should restore navigation state from AsyncStorage', async () => {
      const savedState = JSON.stringify({
        index: 1,
        routes: [
          { key: 'dashboard', name: 'SecurityDashboard' },
          { key: 'settings', name: 'Settings' },
        ],
      });

      AsyncStorage.getItem.mockResolvedValue(savedState);

      const { getByTestId } = renderWithAuth();

      await waitFor(() => {
        expect(getByTestId('settings')).toBeTruthy();
      });
    });

    it('should handle corrupted navigation state gracefully', async () => {
      AsyncStorage.getItem.mockResolvedValue('invalid json');

      const { getByTestId } = renderWithAuth();

      await waitFor(() => {
        // Should default to dashboard screen
        expect(getByTestId('security-dashboard')).toBeTruthy();
      });
    });
  });

  describe('Tab Navigation', () => {
    it('should display all main tabs', async () => {
      const { getByTestId } = renderWithAuth();

      await waitFor(() => {
        expect(getByTestId('tab-dashboard')).toBeTruthy();
        expect(getByTestId('tab-vulnerabilities')).toBeTruthy();
        expect(getByTestId('tab-alerts')).toBeTruthy();
        expect(getByTestId('tab-assets')).toBeTruthy();
        expect(getByTestId('tab-settings')).toBeTruthy();
      });
    });

    it('should highlight active tab', async () => {
      const { getByTestId } = renderWithAuth();

      await waitFor(() => {
        const dashboardTab = getByTestId('tab-dashboard');
        expect(dashboardTab.props.style).toContainEqual({
          backgroundColor: expect.any(String),
        });
      });
    });

    it('should show badge on vulnerability tab when critical vulnerabilities exist', async () => {
      const { getByTestId } = renderWithAuth();

      await waitFor(() => {
        const vulnerabilityTab = getByTestId('tab-vulnerabilities');
        const badge = getByTestId('vulnerability-badge');
        expect(badge).toBeTruthy();
        expect(badge.props.children).toBe('2'); // Critical vulnerabilities count
      });
    });

    it('should show badge on alert tab when active alerts exist', async () => {
      const { getByTestId } = renderWithAuth();

      await waitFor(() => {
        const alertTab = getByTestId('tab-alerts');
        const badge = getByTestId('alert-badge');
        expect(badge).toBeTruthy();
        expect(badge.props.children).toBe('5'); // Active alerts count
      });
    });
  });

  describe('Header Configuration', () => {
    it('should display organization name in header', async () => {
      const { getByText } = renderWithAuth();

      await waitFor(() => {
        expect(getByText('Test Organization')).toBeTruthy();
      });
    });

    it('should display user avatar in header', async () => {
      const { getByTestId } = renderWithAuth();

      await waitFor(() => {
        expect(getByTestId('user-avatar')).toBeTruthy();
      });
    });

    it('should show notification icon with badge count', async () => {
      const { getByTestId } = renderWithAuth();

      await waitFor(() => {
        const notificationIcon = getByTestId('notification-icon');
        const badge = getByTestId('notification-badge');
        expect(notificationIcon).toBeTruthy();
        expect(badge).toBeTruthy();
      });
    });

    it('should open user menu when avatar is pressed', async () => {
      const { getByTestId } = renderWithAuth();

      await waitFor(() => {
        expect(getByTestId('user-avatar')).toBeTruthy();
      });

      fireEvent.press(getByTestId('user-avatar'));

      expect(getByTestId('user-menu')).toBeTruthy();
    });
  });

  describe('Error Boundaries', () => {
    it('should catch navigation errors and show error screen', async () => {
      // Mock navigation error
      const ErrorScreen = () => {
        throw new Error('Navigation error');
      };

      const { getByTestId } = render(
        <NavigationContainer>
          <AuthProvider value={mockAuthContext}>
            <ErrorScreen />
          </AuthProvider>
        </NavigationContainer>
      );

      expect(getByTestId('error-boundary')).toBeTruthy();
      expect(getByTestId('error-message')).toBeTruthy();
    });

    it('should provide retry mechanism for navigation errors', async () => {
      const { getByTestId, rerender } = render(
        <NavigationContainer>
          <AuthProvider value={mockAuthContext}>
            <div testID="error-boundary">Error occurred</div>
          </AuthProvider>
        </NavigationContainer>
      );

      const retryButton = getByTestId('retry-navigation');
      fireEvent.press(retryButton);

      // Should attempt to re-render navigation
      rerender(
        <NavigationContainer>
          <AuthProvider value={mockAuthContext}>
            <AppNavigation />
          </AuthProvider>
        </NavigationContainer>
      );

      await waitFor(() => {
        expect(getByTestId('security-dashboard')).toBeTruthy();
      });
    });
  });

  describe('Accessibility', () => {
    it('should support screen reader navigation', async () => {
      const { getByA11yRole } = renderWithAuth();

      await waitFor(() => {
        expect(getByA11yRole('tab')).toBeTruthy();
        expect(getByA11yRole('tablist')).toBeTruthy();
      });
    });

    it('should provide proper accessibility labels for tabs', async () => {
      const { getByA11yLabel } = renderWithAuth();

      await waitFor(() => {
        expect(getByA11yLabel('Dashboard tab')).toBeTruthy();
        expect(getByA11yLabel('Vulnerabilities tab')).toBeTruthy();
        expect(getByA11yLabel('Alerts tab')).toBeTruthy();
        expect(getByA11yLabel('Assets tab')).toBeTruthy();
        expect(getByA11yLabel('Settings tab')).toBeTruthy();
      });
    });

    it('should announce navigation state changes', async () => {
      const { getByTestId, getByA11yHint } = renderWithAuth();

      await waitFor(() => {
        expect(getByTestId('security-dashboard')).toBeTruthy();
      });

      const settingsTab = getByTestId('tab-settings');
      fireEvent.press(settingsTab);

      expect(getByA11yHint('Navigated to Settings screen')).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('should lazy load screen components', async () => {
      const { queryByTestId } = renderWithAuth();

      // Non-active screens should not be rendered initially
      expect(queryByTestId('vulnerability-list')).toBeFalsy();
      expect(queryByTestId('alert-list')).toBeFalsy();
      expect(queryByTestId('asset-management')).toBeFalsy();
    });

    it('should preload critical screens', async () => {
      const { getByTestId } = renderWithAuth();

      await waitFor(() => {
        // Dashboard should be immediately available
        expect(getByTestId('security-dashboard')).toBeTruthy();
      });

      // Settings screen should be preloaded for quick access
      const settingsTab = getByTestId('tab-settings');
      fireEvent.press(settingsTab);

      // Should render immediately without loading
      expect(getByTestId('settings')).toBeTruthy();
    });

    it('should optimize navigation transitions', async () => {
      const startTime = Date.now();

      const { getByTestId } = renderWithAuth();

      await waitFor(() => {
        expect(getByTestId('security-dashboard')).toBeTruthy();
      });

      const settingsTab = getByTestId('tab-settings');
      fireEvent.press(settingsTab);

      const endTime = Date.now();
      const navigationTime = endTime - startTime;

      // Navigation should be fast (< 100ms)
      expect(navigationTime).toBeLessThan(100);
    });
  });

  describe('Background State Handling', () => {
    it('should persist user session when app goes to background', async () => {
      const { getByTestId } = renderWithAuth();

      await waitFor(() => {
        expect(getByTestId('security-dashboard')).toBeTruthy();
      });

      // Simulate app going to background
      // This would typically be handled by app state change listeners
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'user-session',
        expect.any(String)
      );
    });

    it('should refresh data when app comes back to foreground', async () => {
      const { getByTestId } = renderWithAuth();

      await waitFor(() => {
        expect(getByTestId('security-dashboard')).toBeTruthy();
      });

      // Simulate app coming back to foreground
      // This would trigger data refresh
      expect(getByTestId('refresh-indicator')).toBeTruthy();
    });
  });
});

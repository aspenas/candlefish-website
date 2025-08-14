import { LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { RootStackParamList } from './RootNavigator';

const prefix = Linking.createURL('/');

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    prefix,
    'candlefish-analytics://',
    'https://app.candlefish.ai',
    'https://candlefish.ai',
  ],
  config: {
    screens: {
      Main: {
        screens: {
          Dashboards: {
            screens: {
              DashboardList: 'dashboards',
              DashboardDetail: 'dashboard/:dashboardId',
              DashboardEdit: 'dashboard/:dashboardId/edit',
            },
          },
          Organizations: 'organizations',
          Notifications: 'notifications',
          Profile: {
            screens: {
              ProfileMain: 'profile',
              Settings: 'settings',
              QRScanner: 'scan',
            },
          },
        },
      },
      Auth: {
        screens: {
          Login: 'login',
          Register: 'register',
          ForgotPassword: 'forgot-password',
          ResetPassword: 'reset-password/:token',
          BiometricSetup: 'biometric-setup',
        },
      },
      Onboarding: {
        screens: {
          Welcome: 'welcome',
          Permissions: 'permissions',
          BiometricIntro: 'biometric-intro',
        },
      },
    },
  },
  async getInitialURL() {
    // Check if app was opened from a deep link
    const url = await Linking.getInitialURL();

    if (url != null) {
      return url;
    }

    // Check if there's a notification that triggered the app open
    // This would be handled by the notification service
    return null;
  },
  subscribe(listener) {
    const onReceiveURL = ({ url }: { url: string }) => listener(url);

    // Listen to incoming links from deep linking
    const subscription = Linking.addEventListener('url', onReceiveURL);

    return () => {
      subscription?.remove();
    };
  },
};

// Deep link handlers
export const handleDeepLink = (url: string): void => {
  console.log('Handling deep link:', url);

  // Parse the URL to determine the action
  const { hostname, path, queryParams } = Linking.parse(url);

  if (hostname === 'dashboard' || path?.includes('/dashboard/')) {
    // Handle dashboard links
    const dashboardId = queryParams?.id || path?.split('/dashboard/')[1]?.split('/')[0];
    if (dashboardId) {
      console.log('Deep link to dashboard:', dashboardId);
      // Navigation will be handled by the linking config
    }
  } else if (hostname === 'invite' || path?.includes('/invite/')) {
    // Handle invitation links
    const token = queryParams?.token || path?.split('/invite/')[1];
    if (token) {
      console.log('Invitation deep link:', token);
      // Handle invitation acceptance
    }
  } else if (hostname === 'reset-password' || path?.includes('/reset-password/')) {
    // Handle password reset links
    const token = queryParams?.token || path?.split('/reset-password/')[1];
    if (token) {
      console.log('Password reset deep link:', token);
      // Navigation will be handled by the linking config
    }
  }
};

// Share URL generators
export const generateDashboardShareURL = (dashboardId: string, token?: string): string => {
  const baseUrl = 'https://app.candlefish.ai';
  const shareUrl = `${baseUrl}/dashboard/${dashboardId}`;
  return token ? `${shareUrl}?token=${token}` : shareUrl;
};

export const generateInvitationURL = (invitationToken: string): string => {
  return `https://app.candlefish.ai/invite/${invitationToken}`;
};

export const generatePasswordResetURL = (resetToken: string): string => {
  return `https://app.candlefish.ai/reset-password/${resetToken}`;
};

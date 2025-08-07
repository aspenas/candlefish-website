/**
 * Deep Linking Service
 * Handles deep links for alert actions and service navigation
 */

import * as Linking from 'expo-linking';
import { NavigationContainerRef } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
export interface DeepLinkData {
  type: 'service' | 'alert' | 'metric' | 'dashboard';
  id?: string;
  action?: 'view' | 'acknowledge' | 'resolve' | 'restart';
  params?: Record<string, any>;
}

let navigationRef: NavigationContainerRef<any> | null = null;

// Configure deep linking
const prefix = Linking.createURL('/');

export const linkingConfig = {
  prefixes: [prefix, 'systemanalyzer://'],
  config: {
    screens: {
      Dashboard: {
        screens: {
          DashboardMain: 'dashboard',
          ServiceDetail: 'service/:serviceId',
          Metrics: 'metrics/:serviceId',
        },
      },
      Services: {
        screens: {
          ServicesList: 'services',
          ServiceDetail: 'service/:serviceId',
          Metrics: 'metrics/:serviceId',
        },
      },
      Alerts: {
        screens: {
          AlertsList: 'alerts',
          AlertDetail: 'alert/:alertId',
          ServiceDetail: 'service/:serviceId',
        },
      },
      Settings: {
        screens: {
          SettingsMain: 'settings',
        },
      },
    },
  },
};

// Set navigation reference
export const setNavigationRef = (ref: NavigationContainerRef<any>) => {
  navigationRef = ref;
};

// Handle deep link URL
export const handleDeepLink = async (url: string) => {
  try {
    console.log('Handling deep link:', url);
    
    const { hostname, path, queryParams } = Linking.parse(url);
    
    if (!navigationRef) {
      // Store for later processing
      await AsyncStorage.setItem('pendingDeepLink', url);
      return;
    }

    // Parse the deep link
    const linkData = parseDeepLink(hostname || '', path || '', queryParams || {});
    
    if (linkData) {
      await navigateFromDeepLink(linkData);
    }
  } catch (error) {
    console.error('Error handling deep link:', error);
  }
};

// Parse deep link into structured data
const parseDeepLink = (hostname: string, path: string, queryParams: Record<string, any>): DeepLinkData | null => {
  const pathSegments = path.split('/').filter(Boolean);
  
  // Service deep links
  if (pathSegments[0] === 'service' && pathSegments[1]) {
    return {
      type: 'service',
      id: pathSegments[1],
      action: queryParams.action as any,
      params: queryParams,
    };
  }
  
  // Alert deep links
  if (pathSegments[0] === 'alert' && pathSegments[1]) {
    return {
      type: 'alert',
      id: pathSegments[1],
      action: queryParams.action as any,
      params: queryParams,
    };
  }
  
  // Metrics deep links
  if (pathSegments[0] === 'metrics' && pathSegments[1]) {
    return {
      type: 'metric',
      id: pathSegments[1],
      params: queryParams,
    };
  }
  
  // Dashboard deep links
  if (pathSegments[0] === 'dashboard' || pathSegments.length === 0) {
    return {
      type: 'dashboard',
      params: queryParams,
    };
  }

  return null;
};

// Navigate based on deep link data
const navigateFromDeepLink = async (linkData: DeepLinkData) => {
  if (!navigationRef) return;

  switch (linkData.type) {
    case 'service':
      navigationRef.navigate('Services', {
        screen: 'ServiceDetail',
        params: { serviceId: linkData.id },
      });
      break;
      
    case 'alert':
      navigationRef.navigate('Alerts', {
        screen: 'AlertDetail',
        params: { alertId: linkData.id },
      });
      break;
      
    case 'metric':
      navigationRef.navigate('Dashboard', {
        screen: 'Metrics',
        params: { serviceId: linkData.id },
      });
      break;
      
    case 'dashboard':
      navigationRef.navigate('Dashboard', {
        screen: 'DashboardMain',
      });
      break;
  }
};

// Process pending deep links
export const processPendingDeepLinks = async () => {
  try {
    const pendingLink = await AsyncStorage.getItem('pendingDeepLink');
    if (pendingLink) {
      await AsyncStorage.removeItem('pendingDeepLink');
      await handleDeepLink(pendingLink);
    }
  } catch (error) {
    console.error('Error processing pending deep links:', error);
  }
};

// Generate deep link URLs
export const generateServiceLink = (serviceId: string, action?: string): string => {
  const base = `systemanalyzer://service/${serviceId}`;
  return action ? `${base}?action=${action}` : base;
};

export const generateAlertLink = (alertId: string, action?: string): string => {
  const base = `systemanalyzer://alert/${alertId}`;
  return action ? `${base}?action=${action}` : base;
};

export const generateMetricsLink = (serviceId: string): string => {
  return `systemanalyzer://metrics/${serviceId}`;
};

export const generateDashboardLink = (): string => {
  return 'systemanalyzer://dashboard';
};

// Share functionality
export const shareServiceLink = async (serviceId: string, serviceName: string) => {
  try {
    const url = generateServiceLink(serviceId);
    await Linking.openURL(`mailto:?subject=System Alert - ${serviceName}&body=View service details: ${url}`);
  } catch (error) {
    console.error('Error sharing service link:', error);
  }
};

export const shareAlertLink = async (alertId: string, alertName: string) => {
  try {
    const url = generateAlertLink(alertId);
    await Linking.openURL(`mailto:?subject=System Alert - ${alertName}&body=View alert details: ${url}`);
  } catch (error) {
    console.error('Error sharing alert link:', error);
  }
};

// Initialize deep linking
export const initializeDeepLinking = () => {
  // Listen for incoming links
  const subscription = Linking.addEventListener('url', ({ url }) => {
    handleDeepLink(url);
  });

  // Handle initial URL if app was opened via deep link
  Linking.getInitialURL().then((url) => {
    if (url) {
      handleDeepLink(url);
    }
  });

  return subscription;
};

// Cleanup
export const cleanupDeepLinking = (subscription: any) => {
  subscription?.remove();
};
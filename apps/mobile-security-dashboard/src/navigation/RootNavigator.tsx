// Root Navigator for Security Dashboard Mobile App
import React, { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme, Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Navigators
import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';

// Screens
import AlertDetailsScreen from '@/screens/alerts/AlertDetailsScreen';
import VulnerabilityDetailsScreen from '@/screens/vulnerabilities/VulnerabilityDetailsScreen';
import AssetDetailsScreen from '@/screens/assets/AssetDetailsScreen';
import IncidentDetailsScreen from '@/screens/incidents/IncidentDetailsScreen';
import AcknowledgeAlertScreen from '@/screens/actions/AcknowledgeAlertScreen';
import ResolveAlertScreen from '@/screens/actions/ResolveAlertScreen';
import EscalateIncidentScreen from '@/screens/actions/EscalateIncidentScreen';
import KongSecurityFixScreen from '@/screens/kong/KongSecurityFixScreen';
import SettingsScreen from '@/screens/settings/SettingsScreen';
import ProfileScreen from '@/screens/profile/ProfileScreen';
import NotificationSettingsScreen from '@/screens/settings/NotificationSettingsScreen';
import SearchResultsScreen from '@/screens/search/SearchResultsScreen';
import FilterScreen from '@/screens/filters/FilterScreen';

// Services
import { useAuthService } from '@/services/auth';
import { useNotificationService } from '@/services/notifications';
import { useAnalytics } from '@/services/analytics';
import { useOfflineSync } from '@/services/offline';

// Types
import { RootStackParamList } from './types';

// Keep splash screen visible
SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator<RootStackParamList>();

// Deep linking configuration
const linking = {
  prefixes: ['candlefish-security://', 'https://security.candlefish.ai'],
  config: {
    screens: {
      MainTabs: {
        screens: {
          Overview: 'dashboard',
          Alerts: {
            screens: {
              AlertsList: 'alerts',
              AlertDetails: 'alerts/:alertId',
            },
          },
          Vulnerabilities: {
            screens: {
              VulnerabilitiesList: 'vulnerabilities',
              VulnerabilityDetails: 'vulnerabilities/:vulnerabilityId',
            },
          },
          Assets: {
            screens: {
              AssetsList: 'assets',
              AssetDetails: 'assets/:assetId',
            },
          },
          Incidents: {
            screens: {
              IncidentsList: 'incidents',
              IncidentDetails: 'incidents/:incidentId',
            },
          },
        },
      },
      AlertDetails: 'alert/:alertId',
      VulnerabilityDetails: 'vulnerability/:vulnerabilityId',
      AssetDetails: 'asset/:assetId',
      KongSecurityFix: 'kong/security-fix',
      Settings: 'settings',
    },
  },
};

// Custom themes for security dashboard
const SecurityLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#1976d2',
    background: '#ffffff',
    card: '#f5f5f5',
    text: '#000000',
    border: '#e0e0e0',
    notification: '#d32f2f',
  },
};

const SecurityDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#42a5f5',
    background: '#0a0a0a',
    card: '#1a1a1a',
    text: '#ffffff',
    border: '#333333',
    notification: '#f44336',
  },
};

interface RootNavigatorProps {}

const RootNavigator: React.FC<RootNavigatorProps> = () => {
  const colorScheme = useColorScheme();
  const [isReady, setIsReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>('AuthFlow');

  // Services
  const { isAuthenticated, initialize: initializeAuth, user } = useAuthService();
  const { initialize: initializeNotifications } = useNotificationService();
  const { trackScreenView, initialize: initializeAnalytics } = useAnalytics();
  const { syncOfflineActions, initialize: initializeOfflineSync } = useOfflineSync();

  // Initialize app
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize services
        await Promise.all([
          initializeAuth(),
          initializeNotifications(),
          initializeAnalytics(),
          initializeOfflineSync(),
        ]);

        // Check authentication status
        const authToken = await AsyncStorage.getItem('security_dashboard_auth_token');
        if (authToken && isAuthenticated) {
          setInitialRoute('MainTabs');

          // Sync any offline actions
          await syncOfflineActions();
        } else {
          setInitialRoute('AuthFlow');
        }

        // Handle notification that opened the app
        const notification = await Notifications.getLastNotificationResponseAsync();
        if (notification) {
          handleNotificationResponse(notification);
        }

        setIsReady(true);
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setInitialRoute('AuthFlow');
        setIsReady(true);
      }
    };

    initializeApp();
  }, []);

  // Handle notification responses
  const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    const { data } = response.notification.request.content;

    if (data?.deepLink) {
      // Navigate to specific screen based on notification data
      setTimeout(() => {
        Linking.openURL(data.deepLink);
      }, 1000);
    }
  };

  // Hide splash screen when ready
  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady]);

  // Track screen views for analytics
  const onStateChange = (state: any) => {
    if (state) {
      const route = state.routes[state.index];
      trackScreenView(route.name, route.params);
    }
  };

  if (!isReady) {
    return null; // Keep showing splash screen
  }

  return (
    <NavigationContainer
      linking={linking}
      theme={colorScheme === 'dark' ? SecurityDarkTheme : SecurityLightTheme}
      onStateChange={onStateChange}
    >
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          animation: Platform.OS === 'ios' ? 'slide_from_right' : 'fade',
        }}
      >
        {/* Auth Flow */}
        <Stack.Screen
          name="AuthFlow"
          component={AuthNavigator}
          options={{ headerShown: false }}
        />

        {/* Main App Flow */}
        <Stack.Screen
          name="MainTabs"
          component={MainTabNavigator}
          options={{ headerShown: false }}
        />

        {/* Modal Screens */}
        <Stack.Group screenOptions={{ presentation: 'modal', headerShown: true }}>
          <Stack.Screen
            name="AlertDetails"
            component={AlertDetailsScreen}
            options={{
              title: 'Alert Details',
              headerStyle: {
                backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#ffffff',
              },
              headerTintColor: colorScheme === 'dark' ? '#ffffff' : '#000000',
            }}
          />

          <Stack.Screen
            name="VulnerabilityDetails"
            component={VulnerabilityDetailsScreen}
            options={{
              title: 'Vulnerability Details',
              headerStyle: {
                backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#ffffff',
              },
              headerTintColor: colorScheme === 'dark' ? '#ffffff' : '#000000',
            }}
          />

          <Stack.Screen
            name="AssetDetails"
            component={AssetDetailsScreen}
            options={{
              title: 'Asset Details',
              headerStyle: {
                backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#ffffff',
              },
              headerTintColor: colorScheme === 'dark' ? '#ffffff' : '#000000',
            }}
          />

          <Stack.Screen
            name="IncidentDetails"
            component={IncidentDetailsScreen}
            options={{
              title: 'Incident Details',
              headerStyle: {
                backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#ffffff',
              },
              headerTintColor: colorScheme === 'dark' ? '#ffffff' : '#000000',
            }}
          />
        </Stack.Group>

        {/* Action Screens */}
        <Stack.Group screenOptions={{ presentation: 'modal', headerShown: true }}>
          <Stack.Screen
            name="AcknowledgeAlert"
            component={AcknowledgeAlertScreen}
            options={{
              title: 'Acknowledge Alert',
              headerStyle: {
                backgroundColor: '#ffa726',
              },
              headerTintColor: '#ffffff',
            }}
          />

          <Stack.Screen
            name="ResolveAlert"
            component={ResolveAlertScreen}
            options={{
              title: 'Resolve Alert',
              headerStyle: {
                backgroundColor: '#4caf50',
              },
              headerTintColor: '#ffffff',
            }}
          />

          <Stack.Screen
            name="EscalateIncident"
            component={EscalateIncidentScreen}
            options={{
              title: 'Escalate Incident',
              headerStyle: {
                backgroundColor: '#f44336',
              },
              headerTintColor: '#ffffff',
            }}
          />

          <Stack.Screen
            name="KongSecurityFix"
            component={KongSecurityFixScreen}
            options={{
              title: 'Fix Kong Security',
              headerStyle: {
                backgroundColor: '#d32f2f',
              },
              headerTintColor: '#ffffff',
            }}
          />
        </Stack.Group>

        {/* Settings and Utility Screens */}
        <Stack.Group screenOptions={{ headerShown: true }}>
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              title: 'Settings',
              headerStyle: {
                backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#ffffff',
              },
              headerTintColor: colorScheme === 'dark' ? '#ffffff' : '#000000',
            }}
          />

          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{
              title: 'Profile',
              headerStyle: {
                backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#ffffff',
              },
              headerTintColor: colorScheme === 'dark' ? '#ffffff' : '#000000',
            }}
          />

          <Stack.Screen
            name="NotificationSettings"
            component={NotificationSettingsScreen}
            options={{
              title: 'Notification Settings',
              headerStyle: {
                backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#ffffff',
              },
              headerTintColor: colorScheme === 'dark' ? '#ffffff' : '#000000',
            }}
          />

          <Stack.Screen
            name="SearchResults"
            component={SearchResultsScreen}
            options={{
              title: 'Search Results',
              headerStyle: {
                backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#ffffff',
              },
              headerTintColor: colorScheme === 'dark' ? '#ffffff' : '#000000',
            }}
          />

          <Stack.Screen
            name="FilterScreen"
            component={FilterScreen}
            options={{
              title: 'Filters',
              headerStyle: {
                backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#ffffff',
              },
              headerTintColor: colorScheme === 'dark' ? '#ffffff' : '#000000',
            }}
          />
        </Stack.Group>
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;

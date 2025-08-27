// Mobile Security Dashboard App Entry Point
import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ApolloProvider } from '@apollo/client';
import { Provider as PaperProvider, MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import { useColorScheme, AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import NetInfo from '@react-native-community/netinfo';

// Services and Apollo
import { apolloClient, initializeApollo } from '@/services/apollo';
import { notificationService } from '@/services/notifications';
import { biometricService } from '@/services/biometric';

// Navigation
import RootNavigator from '@/navigation/RootNavigator';

// Providers and Context
import { AuthProvider } from '@/contexts/AuthContext';
import { OfflineProvider } from '@/contexts/OfflineContext';
import { AnalyticsProvider } from '@/contexts/AnalyticsContext';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { NetworkStatusProvider } from '@/contexts/NetworkContext';

// Utilities
import { setupErrorReporting } from '@/utils/errorReporting';
import { setupPerformanceMonitoring } from '@/utils/performance';
import { generateDeviceId } from '@/utils/device';

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync();

// Security Dashboard Theme Configuration
const SecurityLightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#1976d2',
    primaryContainer: '#bbdefb',
    secondary: '#424242',
    secondaryContainer: '#e0e0e0',
    surface: '#ffffff',
    surfaceVariant: '#f5f5f5',
    background: '#fafafa',
    error: '#d32f2f',
    errorContainer: '#ffebee',
    onPrimary: '#ffffff',
    onPrimaryContainer: '#0d47a1',
    onSecondary: '#ffffff',
    onSecondaryContainer: '#212121',
    onSurface: '#000000',
    onSurfaceVariant: '#424242',
    onError: '#ffffff',
    onErrorContainer: '#b71c1c',
    outline: '#e0e0e0',
    shadow: '#000000',
    inverseSurface: '#303030',
    inverseOnSurface: '#ffffff',
    inversePrimary: '#64b5f6',
    elevation: {
      level0: 'transparent',
      level1: '#f5f5f5',
      level2: '#eeeeee',
      level3: '#e0e0e0',
      level4: '#d5d5d5',
      level5: '#cccccc',
    },
  },
};

const SecurityDarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#42a5f5',
    primaryContainer: '#0d47a1',
    secondary: '#90caf9',
    secondaryContainer: '#1976d2',
    surface: '#1a1a1a',
    surfaceVariant: '#2a2a2a',
    background: '#0a0a0a',
    error: '#f44336',
    errorContainer: '#d32f2f',
    onPrimary: '#000000',
    onPrimaryContainer: '#ffffff',
    onSecondary: '#000000',
    onSecondaryContainer: '#ffffff',
    onSurface: '#ffffff',
    onSurfaceVariant: '#e0e0e0',
    onError: '#ffffff',
    onErrorContainer: '#ffffff',
    outline: '#333333',
    shadow: '#000000',
    inverseSurface: '#e0e0e0',
    inverseOnSurface: '#000000',
    inversePrimary: '#1976d2',
    elevation: {
      level0: 'transparent',
      level1: '#2a2a2a',
      level2: '#333333',
      level3: '#404040',
      level4: '#4a4a4a',
      level5: '#555555',
    },
  },
};

interface AppProps {}

const App: React.FC<AppProps> = () => {
  const colorScheme = useColorScheme();
  const [isLoading, setIsLoading] = useState(true);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  // Initialize app
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Set up error reporting and performance monitoring
        setupErrorReporting();
        setupPerformanceMonitoring();

        // Generate or retrieve device ID
        await generateDeviceId();

        // Initialize core services in parallel
        await Promise.all([
          initializeApollo(),
          notificationService.initialize(),
          biometricService.checkCapabilities(),
        ]);

        // Set up network monitoring
        const unsubscribeNetInfo = NetInfo.addEventListener(state => {
          console.log('Network state changed:', state);
        });

        // Clean up function will be handled by useEffect cleanup
        console.log('App initialized successfully');

      } catch (error) {
        console.error('Failed to initialize app:', error);
        // Don't prevent app from loading due to service failures
      } finally {
        setIsLoading(false);
        await SplashScreen.hideAsync();
      }
    };

    initializeApp();
  }, []);

  // Handle app state changes for background/foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (appState.match(/inactive|background/) && nextAppState === 'active') {
      console.log('App has come to the foreground');

      // Handle returning from background
      await handleAppForeground();
    } else if (nextAppState.match(/inactive|background/)) {
      console.log('App has gone to the background');

      // Handle going to background
      await handleAppBackground();
    }

    setAppState(nextAppState);
  };

  const handleAppForeground = async () => {
    try {
      // Clear notification badge when app becomes active
      await notificationService.clearBadgeCount();

      // Check for pending deep links
      const deepLink = await notificationService.getPendingDeepLink();
      if (deepLink) {
        console.log('Processing pending deep link:', deepLink);
        // Deep link will be handled by navigation
      }

      // Sync offline actions if connected
      // This will be handled by OfflineProvider

      // Check if biometric auth is required
      const settings = biometricService.getSettings();
      if (settings?.enabled && settings?.authOnResumeFromBackground) {
        // This will be handled by AuthProvider
      }

    } catch (error) {
      console.error('Error handling app foreground:', error);
    }
  };

  const handleAppBackground = async () => {
    try {
      // Save any pending data
      // Pause non-critical operations

      console.log('App moved to background');
    } catch (error) {
      console.error('Error handling app background:', error);
    }
  };

  // Show loading screen while initializing
  if (isLoading) {
    return null; // Splash screen is still showing
  }

  const theme = colorScheme === 'dark' ? SecurityDarkTheme : SecurityLightTheme;

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ApolloProvider client={apolloClient}>
            <PaperProvider theme={theme}>
              <NetworkStatusProvider>
                <AuthProvider>
                  <OfflineProvider>
                    <AnalyticsProvider>
                      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
                      <RootNavigator />
                    </AnalyticsProvider>
                  </OfflineProvider>
                </AuthProvider>
              </NetworkStatusProvider>
            </PaperProvider>
          </ApolloProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
};

export default App;

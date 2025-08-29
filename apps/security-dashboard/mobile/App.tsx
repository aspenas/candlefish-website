import React, { useEffect, useState } from 'react';
import { StatusBar, LogBox, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ApolloProvider } from '@apollo/client';
import { Provider as PaperProvider } from 'react-native-paper';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';

// Navigation
import AppNavigator from './src/navigation/AppNavigator';

// Services
import { apolloService } from './src/services/apollo-client';
import { AuthService } from './src/services/auth';
import { NotificationService } from './src/services/notifications';
import { OfflineQueueService } from './src/services/offline-queue';
import { LocationThreatService } from './src/services/location-threat';
import { SecurityService } from './src/services/security';
import { PerformanceService } from './src/services/performance';

// Theme
import { SecurityTheme } from './src/theme/SecurityTheme';

// Components
import LoadingScreen from './src/components/ui/LoadingScreen';
import ErrorFallback from './src/components/ui/ErrorFallback';

// Ignore specific warnings for cleaner development experience
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'AsyncStorage has been extracted from react-native core',
]);

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

interface AppState {
  isLoading: boolean;
  isReady: boolean;
  apolloClient: any;
  error: Error | null;
}

export default function App() {
  const [appState, setAppState] = useState<AppState>({
    isLoading: true,
    isReady: false,
    apolloClient: null,
    error: null,
  });

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      console.log('🚀 Starting Security Mobile App initialization...');

      // Load custom fonts
      await loadFonts();

      // Initialize core services in order
      await initializeServices();

      // Initialize Apollo Client
      const client = await apolloService.initialize();

      setAppState({
        isLoading: false,
        isReady: true,
        apolloClient: client,
        error: null,
      });

      console.log('✅ Security Mobile App initialized successfully');
    } catch (error) {
      console.error('❌ App initialization failed:', error);
      
      setAppState({
        isLoading: false,
        isReady: false,
        apolloClient: null,
        error: error as Error,
      });

      // Show user-friendly error
      Alert.alert(
        'Initialization Error',
        'Failed to initialize the security app. Please restart the application.',
        [
          {
            text: 'Retry',
            onPress: () => {
              setAppState(prev => ({ ...prev, isLoading: true, error: null }));
              initializeApp();
            },
          },
          {
            text: 'Exit',
            style: 'cancel',
          },
        ]
      );
    } finally {
      // Hide splash screen
      await SplashScreen.hideAsync();
    }
  };

  const loadFonts = async () => {
    try {
      // Load custom fonts if needed
      await Font.loadAsync({
        // Add custom fonts here if you have them
        // 'SecurityFont-Regular': require('./assets/fonts/SecurityFont-Regular.ttf'),
        // 'SecurityFont-Bold': require('./assets/fonts/SecurityFont-Bold.ttf'),
      });
      console.log('📝 Fonts loaded successfully');
    } catch (error) {
      console.warn('Font loading failed:', error);
      // Continue without custom fonts
    }
  };

  const initializeServices = async () => {
    const services = [
      { name: 'Security', service: SecurityService, critical: true },
      { name: 'Performance', service: PerformanceService, critical: false },
      { name: 'Auth', service: AuthService, critical: true },
      { name: 'Notifications', service: NotificationService, critical: true },
      { name: 'Offline Queue', service: OfflineQueueService, critical: false },
      { name: 'Location Threats', service: LocationThreatService, critical: false },
    ];

    for (const { name, service, critical } of services) {
      try {
        console.log(`🔧 Initializing ${name} Service...`);
        await service.initialize();
        console.log(`✅ ${name} Service initialized`);
      } catch (error) {
        console.error(`❌ ${name} Service initialization failed:`, error);
        
        if (critical) {
          throw new Error(`Critical service ${name} failed to initialize: ${error}`);
        } else {
          console.warn(`Non-critical service ${name} failed, continuing...`);
        }
      }
    }
  };

  // Handle app state recovery
  const handleAppRecovery = () => {
    setAppState(prev => ({ ...prev, isLoading: true, error: null }));
    initializeApp();
  };

  // Error boundary fallback
  if (appState.error) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <ErrorFallback
          error={appState.error}
          onRetry={handleAppRecovery}
          title="App Initialization Failed"
          message="The security monitoring app encountered an error during startup."
        />
      </SafeAreaProvider>
    );
  }

  // Loading state
  if (appState.isLoading || !appState.isReady || !appState.apolloClient) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <LoadingScreen
          message="Initializing Security Monitor..."
          subtitle="Setting up secure connections and services"
        />
      </SafeAreaProvider>
    );
  }

  // Main app
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <ApolloProvider client={appState.apolloClient}>
        <PaperProvider theme={{
          ...SecurityTheme,
          colors: {
            ...SecurityTheme.colors,
            primary: SecurityTheme.colors.primary[500],
            accent: SecurityTheme.colors.interactive.accent,
            background: SecurityTheme.colors.background.primary,
            surface: SecurityTheme.colors.background.secondary,
            text: SecurityTheme.colors.text.primary,
            onSurface: SecurityTheme.colors.text.secondary,
            disabled: SecurityTheme.colors.text.disabled,
            placeholder: SecurityTheme.colors.text.tertiary,
            backdrop: SecurityTheme.colors.overlay.medium,
            notification: SecurityTheme.colors.interactive.warning,
          },
        }}>
          <AppNavigator />
        </PaperProvider>
      </ApolloProvider>
    </SafeAreaProvider>
  );
}

// Global error handler for unhandled promise rejections
const originalHandler = ErrorUtils.getGlobalHandler();

ErrorUtils.setGlobalHandler((error, isFatal) => {
  console.error('Global error handler:', error, 'Fatal:', isFatal);
  
  // Log to crash analytics service
  // crashlytics().recordError(error);
  
  // Show user notification for non-fatal errors
  if (!isFatal) {
    NotificationService.showNotification({
      title: 'App Warning',
      message: 'The app encountered a minor issue but continues to work.',
      type: 'warning',
      priority: 'low',
    }).catch(() => {
      console.warn('Failed to show error notification');
    });
  }
  
  // Call original handler
  if (originalHandler) {
    originalHandler(error, isFatal);
  }
});
/**
 * Main App Component for System Analyzer Mobile
 * Sets up Apollo Client, Theme Provider, and Navigation
 */

import React, { useEffect, useState } from 'react';
import { LogBox } from 'react-native';
import { ApolloProvider } from '@apollo/client';
import { PaperProvider, MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import FlashMessage from 'react-native-flash-message';
import * as SplashScreen from 'expo-splash-screen';
import { registerRootComponent } from 'expo';

// Services
import { initializeApolloClient } from '@/services/apolloClient';
import { initializeNotifications } from '@/services/notifications';
import { initializeBackgroundTasks } from '@/services/backgroundTasks';
import { initializeDeepLinking, processPendingDeepLinks } from '@/services/deepLinking';

// Navigation
import AppNavigator from '@/navigation/AppNavigator';

// Components
import LoadingScreen from '@/components/LoadingScreen';

// Utils
import { useColorScheme } from 'react-native';

// Ignore specific warnings for React Native
LogBox.ignoreLogs([
  'AsyncStorage has been extracted from react-native',
  'Require cycle:',
]);

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [apolloClient, setApolloClient] = useState(null);
  const colorScheme = useColorScheme();

  // Theme configuration
  const theme = colorScheme === 'dark' ? {
    ...MD3DarkTheme,
    colors: {
      ...MD3DarkTheme.colors,
      primary: '#3b82f6',
      primaryContainer: '#1e40af',
      surface: '#1f2937',
      surfaceVariant: '#374151',
      background: '#111827',
      error: '#ef4444',
      errorContainer: '#dc2626',
      success: '#10b981',
      warning: '#f59e0b',
    }
  } : {
    ...MD3LightTheme,
    colors: {
      ...MD3LightTheme.colors,
      primary: '#3b82f6',
      primaryContainer: '#dbeafe',
      surface: '#ffffff',
      surfaceVariant: '#f3f4f6',
      background: '#f9fafb',
      error: '#ef4444',
      errorContainer: '#fee2e2',
      success: '#10b981',
      warning: '#f59e0b',
    }
  };

  useEffect(() => {
    async function prepare() {
      try {
        // Initialize Apollo Client
        const client = await initializeApolloClient();
        setApolloClient(client);

        // Initialize notifications
        await initializeNotifications();

        // Initialize background tasks
        await initializeBackgroundTasks();

        // Initialize deep linking
        initializeDeepLinking();

        // Process any pending deep links
        await processPendingDeepLinks();

        // Additional initialization tasks
        await new Promise(resolve => setTimeout(resolve, 1000)); // Minimum splash time

      } catch (error) {
        console.error('App initialization error:', error);
      } finally {
        setIsReady(true);
        await SplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);

  if (!isReady || !apolloClient) {
    return <LoadingScreen />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ApolloProvider client={apolloClient}>
          <PaperProvider theme={theme}>
            <AppNavigator />
            <FlashMessage
              position="top"
              duration={4000}
              hideStatusBar={false}
            />
          </PaperProvider>
        </ApolloProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Register the main component
registerRootComponent(App);

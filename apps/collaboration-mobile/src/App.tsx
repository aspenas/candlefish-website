/**
 * Main App Component
 * Entry point for the Collaboration Mobile App
 */

import React, { useEffect, useState } from 'react';
import { StatusBar, LogBox, AppState } from 'react-native';
import { ApolloProvider } from '@apollo/client';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-gesture-handler';

import { apolloClient, initializeApolloCache } from '@/services/apollo';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import AppNavigator from '@/navigation/AppNavigator';
import { pushNotificationService } from '@/services/pushNotifications';
import { offlineSyncService } from '@/services/offlineSync';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import Config from '@/constants/config';

// Ignore specific log warnings for development
if (__DEV__) {
  LogBox.ignoreLogs([
    'VirtualizedLists should never be nested',
    'Setting a timer for a long period of time',
    'Non-serializable values were found in the navigation state',
  ]);
}

const App: React.FC = () => {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initializeApp();
    
    // Handle app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
      cleanup();
    };
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize Apollo cache persistence
      await initializeApolloCache();

      // Initialize push notifications
      if (Config.FEATURES.PUSH_NOTIFICATIONS) {
        await pushNotificationService.initialize();
      }

      // Initialize offline sync
      if (Config.FEATURES.OFFLINE_MODE) {
        await offlineSyncService.startSync();
      }

      setIsInitialized(true);
    } catch (error) {
      console.error('App initialization error:', error);
      // Still set initialized to true to show the app with limited functionality
      setIsInitialized(true);
    }
  };

  const handleAppStateChange = (nextAppState: string) => {
    if (nextAppState === 'active') {
      // App came to foreground
      console.log('App became active');
      
      // Start sync if online
      if (Config.FEATURES.OFFLINE_MODE) {
        offlineSyncService.startSync();
      }
      
      // Clear badge count
      if (Config.FEATURES.PUSH_NOTIFICATIONS) {
        pushNotificationService.clearBadge();
      }
    } else if (nextAppState === 'background') {
      // App went to background
      console.log('App went to background');
      
      // Schedule background sync if supported
      // This would require background task configuration
    }
  };

  const cleanup = () => {
    try {
      pushNotificationService.cleanup();
    } catch (error) {
      console.error('App cleanup error:', error);
    }
  };

  if (!isInitialized) {
    // Show splash screen or loading indicator
    // In a production app, this would be a proper splash screen component
    return null;
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ApolloProvider client={apolloClient}>
          <ThemeProvider>
            <AuthProvider>
              <StatusBar translucent backgroundColor="transparent" />
              <AppNavigator />
            </AuthProvider>
          </ThemeProvider>
        </ApolloProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
};

export default App;
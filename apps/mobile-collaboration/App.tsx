import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider as PaperProvider } from 'react-native-paper';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';

import { store, persistor } from '@/stores';
import { RootNavigator } from '@/navigation/RootNavigator';
import { ApolloProvider } from '@/providers/ApolloProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { NotificationProvider } from '@/providers/NotificationProvider';
import { OfflineProvider } from '@/providers/OfflineProvider';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function App() {
  useEffect(() => {
    // Initialize app and hide splash screen
    const initializeApp = async () => {
      try {
        // Perform any initialization tasks here
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('App initialization error:', error);
      } finally {
        await SplashScreen.hideAsync();
      }
    };

    initializeApp();
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <Provider store={store}>
            <PersistGate loading={<LoadingScreen />} persistor={persistor}>
              <ThemeProvider>
                <PaperProvider>
                  <ApolloProvider>
                    <NotificationProvider>
                      <OfflineProvider>
                        <RootNavigator />
                        <StatusBar style="auto" />
                      </OfflineProvider>
                    </NotificationProvider>
                  </ApolloProvider>
                </PaperProvider>
              </ThemeProvider>
            </PersistGate>
          </Provider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

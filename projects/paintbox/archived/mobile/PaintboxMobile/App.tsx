/**
 * Paintbox Mobile App
 * Paint estimation platform with offline-first architecture
 *
 * @format
 */

import React, { useEffect, useState } from 'react';
import { StatusBar, View, StyleSheet } from 'react-native';
import { ApolloProvider } from '@apollo/client';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-gesture-handler';

import createApolloClient from './src/services/apolloClient';
import { initializeCredentials } from './src/services/awsCredentials';
import { offlineSyncService } from './src/services/offlineSync';
import AppNavigator from './src/navigation/AppNavigator';
import LoadingSpinner from './src/components/common/LoadingSpinner';
import ErrorState from './src/components/common/ErrorState';

const App: React.FC = () => {
  const [apolloClient, setApolloClient] = useState<any>(null);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      console.log('Initializing Paintbox Mobile App...');

      // Initialize AWS credentials
      console.log('Initializing credentials...');
      const credentials = await initializeCredentials();

      if (!credentials) {
        console.warn('Failed to initialize credentials, continuing without auth');
      } else {
        console.log('Credentials initialized successfully');
      }

      // Create Apollo Client with offline support
      console.log('Creating Apollo Client...');
      const client = await createApolloClient();

      // Initialize offline sync service
      console.log('Initializing offline sync...');
      offlineSyncService.initialize(client);

      setApolloClient(client);
      console.log('App initialization complete');
    } catch (error) {
      console.error('App initialization failed:', error);
      setInitializationError(
        error instanceof Error ? error.message : 'Failed to initialize app'
      );
    } finally {
      setIsInitializing(false);
    }
  };

  const retryInitialization = () => {
    setIsInitializing(true);
    setInitializationError(null);
    initializeApp();
  };

  if (isInitializing) {
    return (
      <SafeAreaProvider>
        <View style={styles.container}>
          <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
          <LoadingSpinner message="Initializing Paintbox..." />
        </View>
      </SafeAreaProvider>
    );
  }

  if (initializationError) {
    return (
      <SafeAreaProvider>
        <View style={styles.container}>
          <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
          <ErrorState
            error={initializationError}
            title="Failed to start app"
            onRetry={retryInitialization}
          />
        </View>
      </SafeAreaProvider>
    );
  }

  if (!apolloClient) {
    return (
      <SafeAreaProvider>
        <View style={styles.container}>
          <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
          <ErrorState
            error="Apollo Client not initialized"
            title="Configuration Error"
            onRetry={retryInitialization}
          />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ApolloProvider client={apolloClient}>
        <View style={styles.container}>
          <StatusBar barStyle="dark-content" backgroundColor="white" />
          <AppNavigator />
        </View>
      </ApolloProvider>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
});

export default App;

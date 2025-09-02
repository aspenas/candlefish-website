/**
 * Main App Navigator
 * Handles authentication flow and main app navigation
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAuthContext } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import DocumentNavigator from './DocumentNavigator';
import LoadingScreen from '@/screens/LoadingScreen';
import { RootStackParamList } from '@/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuthContext();
  const { theme, isDark } = useTheme();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
        translucent={Platform.OS === 'android'}
      />
      <NavigationContainer
        theme={{
          dark: isDark,
          colors: {
            primary: theme.colors.primary,
            background: theme.colors.background,
            card: theme.colors.surface,
            text: theme.colors.text,
            border: theme.colors.border,
            notification: theme.colors.primary,
          },
        }}
      >
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            gestureEnabled: Platform.OS === 'ios',
          }}
        >
          {isAuthenticated ? (
            <>
              <Stack.Screen 
                name="Main" 
                component={MainNavigator}
                options={{
                  animation: 'fade',
                }}
              />
              <Stack.Screen 
                name="Document" 
                component={DocumentNavigator}
                options={{
                  presentation: 'modal',
                  animation: Platform.OS === 'ios' ? 'slide_from_bottom' : 'slide_from_right',
                }}
              />
            </>
          ) : (
            <Stack.Screen 
              name="Auth" 
              component={AuthNavigator}
              options={{
                animation: 'fade',
              }}
            />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

export default AppNavigator;
import React, { useEffect } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { useAppSelector } from '@/stores/hooks';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { OnboardingNavigator } from './OnboardingNavigator';
import { useTheme } from '@/hooks/useTheme';

export type RootStackParamList = {
  Onboarding: undefined;
  Auth: undefined;
  Main: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const { theme } = useTheme();
  const colorScheme = useColorScheme();

  // Get auth and onboarding state from Redux
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);
  const hasCompletedOnboarding = useAppSelector(state => state.auth.hasCompletedOnboarding);

  // Create navigation theme
  const navigationTheme = {
    ...((colorScheme === 'dark') ? DarkTheme : DefaultTheme),
    colors: {
      ...((colorScheme === 'dark') ? DarkTheme.colors : DefaultTheme.colors),
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.onSurface,
      border: theme.colors.outline,
      notification: theme.colors.error,
    },
  };

  // Determine initial route
  const getInitialRoute = (): keyof RootStackParamList => {
    if (!hasCompletedOnboarding) {
      return 'Onboarding';
    }

    if (!isAuthenticated) {
      return 'Auth';
    }

    return 'Main';
  };

  return (
    <>
      <NavigationContainer theme={navigationTheme}>
        <Stack.Navigator
          initialRouteName={getInitialRoute()}
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          {!hasCompletedOnboarding ? (
            <Stack.Screen
              name="Onboarding"
              component={OnboardingNavigator}
            />
          ) : !isAuthenticated ? (
            <Stack.Screen
              name="Auth"
              component={AuthNavigator}
            />
          ) : (
            <Stack.Screen
              name="Main"
              component={MainNavigator}
            />
          )}
        </Stack.Navigator>
      </NavigationContainer>

      <StatusBar
        style={colorScheme === 'dark' ? 'light' : 'dark'}
        backgroundColor={theme.colors.surface}
      />
    </>
  );
};

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { WelcomeScreen } from '@/screens/onboarding/WelcomeScreen';
import { PermissionsScreen } from '@/screens/onboarding/PermissionsScreen';
import { NotificationPermissionScreen } from '@/screens/onboarding/NotificationPermissionScreen';
import { BiometricSetupScreen } from '@/screens/auth/BiometricSetupScreen';
import { CompletionScreen } from '@/screens/onboarding/CompletionScreen';

export type OnboardingStackParamList = {
  Welcome: undefined;
  Permissions: undefined;
  NotificationPermission: undefined;
  BiometricSetup: {
    email: string;
    skipable: boolean;
  };
  Completion: undefined;
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Permissions" component={PermissionsScreen} />
      <Stack.Screen name="NotificationPermission" component={NotificationPermissionScreen} />
      <Stack.Screen name="BiometricSetup" component={BiometricSetupScreen} />
      <Stack.Screen name="Completion" component={CompletionScreen} />
    </Stack.Navigator>
  );
}
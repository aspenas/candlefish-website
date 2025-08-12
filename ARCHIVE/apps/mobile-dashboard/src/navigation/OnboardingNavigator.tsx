import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Screens
import { WelcomeScreen } from '@/screens/onboarding/WelcomeScreen';
import { PermissionsScreen } from '@/screens/onboarding/PermissionsScreen';
import { BiometricIntroScreen } from '@/screens/onboarding/BiometricIntroScreen';

export type OnboardingStackParamList = {
  Welcome: undefined;
  Permissions: undefined;
  BiometricIntro: undefined;
};

const Stack = createStackNavigator<OnboardingStackParamList>();

export const OnboardingNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: false, // Disable swipe back for onboarding
      }}
    >
      <Stack.Screen
        name="Welcome"
        component={WelcomeScreen}
      />

      <Stack.Screen
        name="Permissions"
        component={PermissionsScreen}
      />

      <Stack.Screen
        name="BiometricIntro"
        component={BiometricIntroScreen}
      />
    </Stack.Navigator>
  );
};

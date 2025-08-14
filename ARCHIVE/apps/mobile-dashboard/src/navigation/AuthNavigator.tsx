import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Screens
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { RegisterScreen } from '@/screens/auth/RegisterScreen';
import { ForgotPasswordScreen } from '@/screens/auth/ForgotPasswordScreen';
import { ResetPasswordScreen } from '@/screens/auth/ResetPasswordScreen';
import { BiometricSetupScreen } from '@/screens/auth/BiometricSetupScreen';

export type AuthStackParamList = {
  Login: undefined;
  Register: { invitationToken?: string };
  ForgotPassword: undefined;
  ResetPassword: { token: string };
  BiometricSetup: undefined;
};

const Stack = createStackNavigator<AuthStackParamList>();

export const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        cardStyleInterpolator: ({ current, layouts }) => ({
          cardStyle: {
            transform: [
              {
                translateX: current.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [layouts.screen.width, 0],
                }),
              },
            ],
          },
          overlayStyle: {
            opacity: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.5],
            }),
          },
        }),
      }}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          gestureEnabled: false, // Disable gesture for login screen
        }}
      />

      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{
          headerShown: true,
          title: 'Create Account',
          headerBackTitleVisible: false,
        }}
      />

      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{
          headerShown: true,
          title: 'Reset Password',
          headerBackTitleVisible: false,
        }}
      />

      <Stack.Screen
        name="ResetPassword"
        component={ResetPasswordScreen}
        options={{
          headerShown: true,
          title: 'New Password',
          headerBackTitleVisible: false,
          gestureEnabled: false, // Disable gesture for password reset
        }}
      />

      <Stack.Screen
        name="BiometricSetup"
        component={BiometricSetupScreen}
        options={{
          headerShown: true,
          title: 'Biometric Authentication',
          headerBackTitleVisible: false,
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
};

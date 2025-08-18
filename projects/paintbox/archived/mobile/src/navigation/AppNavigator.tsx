/**
 * Main App Navigator for System Analyzer Mobile
 * Implements tab-based navigation with stack navigators for each section
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';

// Deep linking
import { linkingConfig, setNavigationRef } from '@/services/deepLinking';

// Screens
import DashboardScreen from '@/screens/DashboardScreen';
import ServicesScreen from '@/screens/ServicesScreen';
import ServiceDetailScreen from '@/screens/ServiceDetailScreen';
import AlertsScreen from '@/screens/AlertsScreen';
import AlertDetailScreen from '@/screens/AlertDetailScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import MetricsScreen from '@/screens/MetricsScreen';

// Navigation Types
export type RootTabParamList = {
  Dashboard: undefined;
  Services: undefined;
  Alerts: undefined;
  Settings: undefined;
};

export type DashboardStackParamList = {
  DashboardMain: undefined;
  ServiceDetail: { serviceId: string };
  Metrics: { serviceId: string };
};

export type ServicesStackParamList = {
  ServicesList: undefined;
  ServiceDetail: { serviceId: string };
  Metrics: { serviceId: string };
};

export type AlertsStackParamList = {
  AlertsList: undefined;
  AlertDetail: { alertId: string };
  ServiceDetail: { serviceId: string };
};

export type SettingsStackParamList = {
  SettingsMain: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();
const DashboardStack = createStackNavigator<DashboardStackParamList>();
const ServicesStack = createStackNavigator<ServicesStackParamList>();
const AlertsStack = createStackNavigator<AlertsStackParamList>();
const SettingsStack = createStackNavigator<SettingsStackParamList>();

// Stack Navigators
function DashboardStackNavigator() {
  const theme = useTheme();

  return (
    <DashboardStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <DashboardStack.Screen
        name="DashboardMain"
        component={DashboardScreen}
        options={{ title: 'System Dashboard' }}
      />
      <DashboardStack.Screen
        name="ServiceDetail"
        component={ServiceDetailScreen}
        options={{ title: 'Service Details' }}
      />
      <DashboardStack.Screen
        name="Metrics"
        component={MetricsScreen}
        options={{ title: 'Metrics' }}
      />
    </DashboardStack.Navigator>
  );
}

function ServicesStackNavigator() {
  const theme = useTheme();

  return (
    <ServicesStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <ServicesStack.Screen
        name="ServicesList"
        component={ServicesScreen}
        options={{ title: 'Services' }}
      />
      <ServicesStack.Screen
        name="ServiceDetail"
        component={ServiceDetailScreen}
        options={{ title: 'Service Details' }}
      />
      <ServicesStack.Screen
        name="Metrics"
        component={MetricsScreen}
        options={{ title: 'Metrics' }}
      />
    </ServicesStack.Navigator>
  );
}

function AlertsStackNavigator() {
  const theme = useTheme();

  return (
    <AlertsStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <AlertsStack.Screen
        name="AlertsList"
        component={AlertsScreen}
        options={{ title: 'Alerts' }}
      />
      <AlertsStack.Screen
        name="AlertDetail"
        component={AlertDetailScreen}
        options={{ title: 'Alert Details' }}
      />
      <AlertsStack.Screen
        name="ServiceDetail"
        component={ServiceDetailScreen}
        options={{ title: 'Service Details' }}
      />
    </AlertsStack.Navigator>
  );
}

function SettingsStackNavigator() {
  const theme = useTheme();

  return (
    <SettingsStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <SettingsStack.Screen
        name="SettingsMain"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </SettingsStack.Navigator>
  );
}

// Tab Navigator
function AppTabs() {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="view-dashboard" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Services"
        component={ServicesStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="server" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Alerts"
        component={AlertsStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="alert" color={color} size={size} />
          ),
          tabBarBadge: undefined, // Will be set dynamically based on active alerts
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Main App Navigator
export default function AppNavigator() {
  const theme = useTheme();

  return (
    <NavigationContainer
      linking={linkingConfig}
      ref={setNavigationRef}
    >
      <StatusBar
        style={theme.dark ? 'light' : 'dark'}
        backgroundColor={theme.colors.surface}
      />
      <AppTabs />
    </NavigationContainer>
  );
}

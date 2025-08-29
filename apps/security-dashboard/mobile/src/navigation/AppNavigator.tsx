import React, { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useColorScheme, StatusBar } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { AuthService } from '../services/auth';
import { NotificationService } from '../services/notifications';

// Screens
import LoginScreen from '../screens/auth/LoginScreen';
import BiometricAuthScreen from '../screens/auth/BiometricAuthScreen';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import AlertsScreen from '../screens/alerts/AlertsScreen';
import AlertDetailScreen from '../screens/alerts/AlertDetailScreen';
import IncidentsScreen from '../screens/incidents/IncidentsScreen';
import IncidentDetailScreen from '../screens/incidents/IncidentDetailScreen';
import CreateIncidentScreen from '../screens/incidents/CreateIncidentScreen';
import ThreatMapScreen from '../screens/threats/ThreatMapScreen';
import ThreatDetailScreen from '../screens/threats/ThreatDetailScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import NotificationSettingsScreen from '../screens/settings/NotificationSettingsScreen';
import LocationSettingsScreen from '../screens/settings/LocationSettingsScreen';
import SecuritySettingsScreen from '../screens/settings/SecuritySettingsScreen';

// Types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  BiometricAuth: { returnTo?: string };
};

export type MainTabParamList = {
  Dashboard: undefined;
  Alerts: undefined;
  Incidents: undefined;
  ThreatMap: undefined;
  Profile: undefined;
};

export type AlertsStackParamList = {
  AlertsList: undefined;
  AlertDetail: { alertId: string };
};

export type IncidentsStackParamList = {
  IncidentsList: undefined;
  IncidentDetail: { incidentId: string };
  CreateIncident: { alertId?: string; threatId?: string };
};

export type ThreatsStackParamList = {
  ThreatMap: undefined;
  ThreatDetail: { threatId: string };
};

export type ProfileStackParamList = {
  Profile: undefined;
  Settings: undefined;
  NotificationSettings: undefined;
  LocationSettings: undefined;
  SecuritySettings: undefined;
};

// Stack navigators
const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();
const AlertsStack = createNativeStackNavigator<AlertsStackParamList>();
const IncidentsStack = createNativeStackNavigator<IncidentsStackParamList>();
const ThreatsStack = createNativeStackNavigator<ThreatsStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

// Custom dark theme for security app
const SecurityDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#ef4444', // Red for alerts
    background: '#0f172a', // Slate 900
    card: '#1e293b', // Slate 800
    text: '#f8fafc', // Slate 50
    border: '#334155', // Slate 700
    notification: '#f59e0b', // Amber for warnings
  },
};

// Tab bar icon mapping
const getTabBarIcon = (routeName: string, focused: boolean, color: string, size: number) => {
  const iconMap: Record<string, string> = {
    Dashboard: 'view-dashboard',
    Alerts: 'alert-circle',
    Incidents: 'clipboard-text',
    ThreatMap: 'map-marker-alert',
    Profile: 'account-circle',
  };

  const iconName = iconMap[routeName] || 'help-circle';
  return (
    <MaterialCommunityIcons
      name={iconName as any}
      size={size}
      color={color}
      style={{ 
        opacity: focused ? 1 : 0.7,
        transform: [{ scale: focused ? 1.1 : 1 }] 
      }}
    />
  );
};

// Auth Stack Navigator
function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen 
        name="BiometricAuth" 
        component={BiometricAuthScreen}
        options={{
          animation: 'fade',
        }}
      />
    </AuthStack.Navigator>
  );
}

// Alerts Stack Navigator
function AlertsNavigator() {
  return (
    <AlertsStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#1e293b',
        },
        headerTintColor: '#f8fafc',
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <AlertsStack.Screen 
        name="AlertsList" 
        component={AlertsScreen}
        options={{ title: 'Security Alerts' }}
      />
      <AlertsStack.Screen 
        name="AlertDetail" 
        component={AlertDetailScreen}
        options={{ title: 'Alert Details' }}
      />
    </AlertsStack.Navigator>
  );
}

// Incidents Stack Navigator
function IncidentsNavigator() {
  return (
    <IncidentsStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#1e293b',
        },
        headerTintColor: '#f8fafc',
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <IncidentsStack.Screen 
        name="IncidentsList" 
        component={IncidentsScreen}
        options={{ title: 'Incidents' }}
      />
      <IncidentsStack.Screen 
        name="IncidentDetail" 
        component={IncidentDetailScreen}
        options={{ title: 'Incident Details' }}
      />
      <IncidentsStack.Screen 
        name="CreateIncident" 
        component={CreateIncidentScreen}
        options={{ 
          title: 'Report Incident',
          presentation: 'modal',
        }}
      />
    </IncidentsStack.Navigator>
  );
}

// Threats Stack Navigator
function ThreatsNavigator() {
  return (
    <ThreatsStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#1e293b',
        },
        headerTintColor: '#f8fafc',
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <ThreatsStack.Screen 
        name="ThreatMap" 
        component={ThreatMapScreen}
        options={{ title: 'Threat Map' }}
      />
      <ThreatsStack.Screen 
        name="ThreatDetail" 
        component={ThreatDetailScreen}
        options={{ title: 'Threat Details' }}
      />
    </ThreatsStack.Navigator>
  );
}

// Profile Stack Navigator
function ProfileNavigator() {
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#1e293b',
        },
        headerTintColor: '#f8fafc',
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <ProfileStack.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      <ProfileStack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
      <ProfileStack.Screen 
        name="NotificationSettings" 
        component={NotificationSettingsScreen}
        options={{ title: 'Notifications' }}
      />
      <ProfileStack.Screen 
        name="LocationSettings" 
        component={LocationSettingsScreen}
        options={{ title: 'Location & Threats' }}
      />
      <ProfileStack.Screen 
        name="SecuritySettings" 
        component={SecuritySettingsScreen}
        options={{ title: 'Security' }}
      />
    </ProfileStack.Navigator>
  );
}

// Main Tab Navigator
function MainNavigator() {
  return (
    <MainTab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => 
          getTabBarIcon(route.name, focused, color, size),
        tabBarActiveTintColor: '#ef4444',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: {
          backgroundColor: '#1e293b',
          borderTopColor: '#334155',
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 80,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 4,
        },
        headerShown: false,
      })}
    >
      <MainTab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{
          tabBarBadge: undefined, // Will be set by notification counts
        }}
      />
      <MainTab.Screen 
        name="Alerts" 
        component={AlertsNavigator}
        options={{
          tabBarBadge: undefined, // Will be set by alert counts
        }}
      />
      <MainTab.Screen 
        name="Incidents" 
        component={IncidentsNavigator}
      />
      <MainTab.Screen 
        name="ThreatMap" 
        component={ThreatsNavigator}
        options={{
          title: 'Threats',
        }}
      />
      <MainTab.Screen 
        name="Profile" 
        component={ProfileNavigator}
      />
    </MainTab.Navigator>
  );
}

// Root Navigator Component
export default function AppNavigator() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Initialize services and check auth state
    const initializeApp = async () => {
      try {
        // Initialize auth service
        await AuthService.initialize();
        
        // Check authentication state
        const authState = AuthService.getAuthState();
        setIsAuthenticated(authState.isAuthenticated);
        
        // Set up auth state listener
        const authListener = (state: any) => {
          setIsAuthenticated(state.isAuthenticated);
        };
        
        AuthService.addAuthStateListener(authListener);
        
        // Initialize notification service
        await NotificationService.initialize();
        
        // Set up notification handlers for navigation
        NotificationService.addNotificationResponseListener((response) => {
          handleNotificationNavigation(response);
        });
        
      } catch (error) {
        console.error('App initialization failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  const handleNotificationNavigation = (response: any) => {
    const data = response.notification.request.content.data;
    
    // Navigate based on notification data
    if (data.alertId) {
      // Navigate to alert detail
      console.log('Navigate to alert:', data.alertId);
    } else if (data.threatId) {
      // Navigate to threat detail
      console.log('Navigate to threat:', data.threatId);
    } else if (data.incidentId) {
      // Navigate to incident detail
      console.log('Navigate to incident:', data.incidentId);
    }
  };

  if (isLoading) {
    return null; // Or loading screen component
  }

  return (
    <NavigationContainer theme={SecurityDarkTheme}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="#0f172a" 
        translucent={false}
      />
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <RootStack.Screen name="Main" component={MainNavigator} />
        ) : (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

// Screens
import { DashboardListScreen } from '@/screens/dashboard/DashboardListScreen';
import { DashboardDetailScreen } from '@/screens/dashboard/DashboardDetailScreen';
import { DashboardEditScreen } from '@/screens/dashboard/DashboardEditScreen';
import { OrganizationSwitcherScreen } from '@/screens/organization/OrganizationSwitcherScreen';
import { NotificationsScreen } from '@/screens/notifications/NotificationsScreen';
import { ProfileScreen } from '@/screens/profile/ProfileScreen';
import { SettingsScreen } from '@/screens/settings/SettingsScreen';
import { QRScannerScreen } from '@/screens/scanner/QRScannerScreen';

// Types
export type MainTabParamList = {
  Dashboards: undefined;
  Organizations: undefined;
  Notifications: undefined;
  Profile: undefined;
};

export type DashboardStackParamList = {
  DashboardList: undefined;
  DashboardDetail: { dashboardId: string };
  DashboardEdit: { dashboardId?: string; organizationId?: string };
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  Settings: undefined;
  QRScanner: { mode: 'invite' | 'dashboard' };
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const DashboardStack = createStackNavigator<DashboardStackParamList>();
const ProfileStack = createStackNavigator<ProfileStackParamList>();

// Stack Navigators
const DashboardNavigator: React.FC = () => {
  return (
    <DashboardStack.Navigator>
      <DashboardStack.Screen
        name="DashboardList"
        component={DashboardListScreen}
        options={{ title: 'Dashboards' }}
      />
      <DashboardStack.Screen
        name="DashboardDetail"
        component={DashboardDetailScreen}
        options={({ route }) => ({
          title: 'Dashboard',
          headerBackTitleVisible: false,
        })}
      />
      <DashboardStack.Screen
        name="DashboardEdit"
        component={DashboardEditScreen}
        options={{
          title: 'Edit Dashboard',
          presentation: 'modal',
        }}
      />
    </DashboardStack.Navigator>
  );
};

const ProfileNavigator: React.FC = () => {
  return (
    <ProfileStack.Navigator>
      <ProfileStack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      <ProfileStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
      <ProfileStack.Screen
        name="QRScanner"
        component={QRScannerScreen}
        options={{
          title: 'Scan QR Code',
          presentation: 'modal',
        }}
      />
    </ProfileStack.Navigator>
  );
};

export const MainNavigator: React.FC = () => {
  const { colorScheme } = useSelector((state: RootState) => state.ui);
  const { unreadCount } = useSelector((state: RootState) => state.notification);

  const getTabBarIcon = (route: string, focused: boolean, color: string, size: number) => {
    let iconName: keyof typeof Ionicons.glyphMap;

    switch (route) {
      case 'Dashboards':
        iconName = focused ? 'analytics' : 'analytics-outline';
        break;
      case 'Organizations':
        iconName = focused ? 'business' : 'business-outline';
        break;
      case 'Notifications':
        iconName = focused ? 'notifications' : 'notifications-outline';
        break;
      case 'Profile':
        iconName = focused ? 'person' : 'person-outline';
        break;
      default:
        iconName = 'help-outline';
    }

    return <Ionicons name={iconName} size={size} color={color} />;
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) =>
          getTabBarIcon(route.name, focused, color, size),
        tabBarActiveTintColor: colorScheme === 'dark' ? '#007AFF' : '#007AFF',
        tabBarInactiveTintColor: colorScheme === 'dark' ? '#8E8E93' : '#8E8E93',
        tabBarStyle: {
          backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
          borderTopColor: colorScheme === 'dark' ? '#38383A' : '#E5E5EA',
        },
        headerStyle: {
          backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
        },
        headerTitleStyle: {
          color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
        },
        headerTintColor: colorScheme === 'dark' ? '#007AFF' : '#007AFF',
      })}
    >
      <Tab.Screen
        name="Dashboards"
        component={DashboardNavigator}
        options={{ headerShown: false }}
      />

      <Tab.Screen
        name="Organizations"
        component={OrganizationSwitcherScreen}
        options={{ title: 'Organizations' }}
      />

      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          title: 'Notifications',
          tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount.toString()) : undefined,
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileNavigator}
        options={{ headerShown: false }}
      />
    </Tab.Navigator>
  );
};

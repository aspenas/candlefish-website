// Main Tab Navigator for Security Dashboard
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '@react-navigation/native';
import { Platform } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

// Main Screens
import DashboardScreen from '@/screens/Dashboard';
import AlertsScreen from '@/screens/Alerts';
import IncidentsScreen from '@/screens/Incidents';
import AnalyticsScreen from '@/screens/Analytics';
import SettingsScreen from '@/screens/Settings';

// Types
import { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

interface MainTabNavigatorProps {}

const MainTabNavigator: React.FC<MainTabNavigatorProps> = () => {
  const theme = useTheme();

  // Tab configurations
  const tabConfigs = [
    {
      name: 'Dashboard' as keyof MainTabParamList,
      component: DashboardScreen,
      title: 'Dashboard',
      icon: 'dashboard',
      iconType: 'MaterialIcons',
      badge: null,
    },
    {
      name: 'Alerts' as keyof MainTabParamList,
      component: AlertsScreen,
      title: 'Alerts',
      icon: 'alert-circle',
      iconType: 'MaterialCommunityIcons',
      badge: null, // Will be updated with real data
      badgeColor: '#f44336',
    },
    {
      name: 'Incidents' as keyof MainTabParamList,
      component: IncidentsScreen,
      title: 'Incidents',
      icon: 'fire-alert',
      iconType: 'MaterialCommunityIcons',
      badge: null,
      badgeColor: '#9c27b0',
    },
    {
      name: 'Analytics' as keyof MainTabParamList,
      component: AnalyticsScreen,
      title: 'Analytics',
      icon: 'chart-line',
      iconType: 'MaterialCommunityIcons',
      badge: null,
      badgeColor: '#2196f3',
    },
    {
      name: 'Settings' as keyof MainTabParamList,
      component: SettingsScreen,
      title: 'Settings',
      icon: 'settings',
      iconType: 'MaterialIcons',
      badge: null,
      badgeColor: '#757575',
    },
  ];

  const getTabBarIcon = (iconName: string, iconType: string, color: string, size: number) => {
    const IconComponent = iconType === 'MaterialIcons' ? MaterialIcons : MaterialCommunityIcons;
    return <IconComponent name={iconName as any} size={size} color={color} />;
  };

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.text + '80', // 50% opacity
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          paddingTop: Platform.OS === 'ios' ? 5 : 8,
          paddingBottom: Platform.OS === 'ios' ? 25 : 8,
          height: Platform.OS === 'ios' ? 85 : 65,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: Platform.OS === 'ios' ? -5 : 0,
        },
        tabBarItemStyle: {
          paddingVertical: 5,
        },
      }}
    >
      {tabConfigs.map((config) => (
        <Tab.Screen
          key={config.name}
          name={config.name}
          component={config.component}
          options={{
            tabBarLabel: config.title,
            tabBarIcon: ({ color, size, focused }) => {
              const iconSize = focused ? size + 2 : size;
              const iconColor = focused ? theme.colors.primary : color;

              return getTabBarIcon(config.icon, config.iconType, iconColor, iconSize);
            },
            tabBarBadge: undefined, // We use custom badge component instead
            tabBarAccessibilityLabel: `${config.title} tab${
              config.badge && config.badge > 0 ? `, ${config.badge} items` : ''
            }`,
          }}
        />
      ))}
    </Tab.Navigator>
  );
};

export default MainTabNavigator;

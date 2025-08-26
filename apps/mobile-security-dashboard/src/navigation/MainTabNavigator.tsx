// Main Tab Navigator for Security Dashboard
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '@react-navigation/native';
import { Platform } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

// Stack Navigators
import OverviewStackNavigator from './OverviewStackNavigator';
import AlertsStackNavigator from './AlertsStackNavigator';
import VulnerabilitiesStackNavigator from './VulnerabilitiesStackNavigator';
import AssetsStackNavigator from './AssetsStackNavigator';
import IncidentsStackNavigator from './IncidentsStackNavigator';

// Custom components
import TabBarBadge from '@/components/navigation/TabBarBadge';

// Hooks
import { useSecurityMetrics } from '@/hooks/useSecurityMetrics';
import { useNotificationBadges } from '@/hooks/useNotificationBadges';

// Types
import { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

interface MainTabNavigatorProps {}

const MainTabNavigator: React.FC<MainTabNavigatorProps> = () => {
  const theme = useTheme();
  const { badges } = useNotificationBadges();
  const { metrics } = useSecurityMetrics();

  // Tab configurations with dynamic badges
  const tabConfigs = [
    {
      name: 'Overview' as keyof MainTabParamList,
      component: OverviewStackNavigator,
      title: 'Overview',
      icon: 'dashboard',
      iconType: 'MaterialIcons',
      badge: null,
    },
    {
      name: 'Alerts' as keyof MainTabParamList,
      component: AlertsStackNavigator,
      title: 'Alerts',
      icon: 'alert-circle',
      iconType: 'MaterialCommunityIcons',
      badge: badges.criticalAlerts || metrics?.activeAlerts || 0,
      badgeColor: '#f44336',
    },
    {
      name: 'Vulnerabilities' as keyof MainTabParamList,
      component: VulnerabilitiesStackNavigator,
      title: 'Vulns',
      icon: 'shield-alert',
      iconType: 'MaterialCommunityIcons',
      badge: badges.criticalVulnerabilities || metrics?.criticalVulnerabilities || 0,
      badgeColor: '#ff9800',
    },
    {
      name: 'Assets' as keyof MainTabParamList,
      component: AssetsStackNavigator,
      title: 'Assets',
      icon: 'devices',
      iconType: 'MaterialIcons',
      badge: badges.unhealthyAssets || null,
      badgeColor: '#2196f3',
    },
    {
      name: 'Incidents' as keyof MainTabParamList,
      component: IncidentsStackNavigator,
      title: 'Incidents',
      icon: 'fire-alert',
      iconType: 'MaterialCommunityIcons',
      badge: badges.openIncidents || null,
      badgeColor: '#9c27b0',
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

              return (
                <>
                  {getTabBarIcon(config.icon, config.iconType, iconColor, iconSize)}
                  {config.badge && config.badge > 0 && (
                    <TabBarBadge
                      count={config.badge}
                      color={config.badgeColor || theme.colors.notification}
                      position="top-right"
                    />
                  )}
                </>
              );
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

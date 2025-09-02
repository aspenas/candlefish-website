/**
 * Main Tab Navigator
 * Bottom tab navigation for the main app features
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import { useTheme } from '@/contexts/ThemeContext';
import { MainTabParamList } from '@/types';

// Import screens
import DocumentsScreen from '@/screens/DocumentsScreen';
import RecentScreen from '@/screens/RecentScreen';
import SearchScreen from '@/screens/SearchScreen';
import ProfileScreen from '@/screens/ProfileScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

const MainNavigator: React.FC = () => {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Documents':
              iconName = focused ? 'document-text' : 'document-text-outline';
              break;
            case 'Recent':
              iconName = focused ? 'time' : 'time-outline';
              break;
            case 'Search':
              iconName = focused ? 'search' : 'search-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'help-outline';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          height: Platform.OS === 'ios' ? 90 : 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 4,
        },
        headerStyle: {
          backgroundColor: theme.colors.background,
          borderBottomColor: theme.colors.border,
          borderBottomWidth: 1,
          shadowColor: 'transparent',
          elevation: 0,
        },
        headerTitleStyle: {
          color: theme.colors.text,
          fontSize: 20,
          fontWeight: '600',
        },
        headerTintColor: theme.colors.text,
      })}
    >
      <Tab.Screen 
        name="Documents" 
        component={DocumentsScreen}
        options={{
          title: 'Documents',
          headerTitle: 'My Documents',
        }}
      />
      <Tab.Screen 
        name="Recent" 
        component={RecentScreen}
        options={{
          title: 'Recent',
          headerTitle: 'Recent Activity',
        }}
      />
      <Tab.Screen 
        name="Search" 
        component={SearchScreen}
        options={{
          title: 'Search',
          headerTitle: 'Search Documents',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          title: 'Profile',
          headerTitle: 'Profile & Settings',
        }}
      />
    </Tab.Navigator>
  );
};

export default MainNavigator;
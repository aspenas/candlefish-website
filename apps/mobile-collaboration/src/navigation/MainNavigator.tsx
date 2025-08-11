import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';

// Screens
import { DocumentListScreen } from '@/screens/documents/DocumentListScreen';
import { DocumentEditorScreen } from '@/screens/documents/DocumentEditorScreen';
import { CommentsScreen } from '@/screens/comments/CommentsScreen';
import { NotificationsScreen } from '@/screens/notifications/NotificationsScreen';
import { SettingsScreen } from '@/screens/settings/SettingsScreen';
import { ProfileScreen } from '@/screens/profile/ProfileScreen';
import { OfflineScreen } from '@/screens/offline/OfflineScreen';

// Components
import { CustomDrawerContent } from '@/components/navigation/CustomDrawerContent';
import { TabBarIcon } from '@/components/navigation/TabBarIcon';

// Types
export type MainDrawerParamList = {
  DocumentTabs: undefined;
  Notifications: undefined;
  Offline: undefined;
  Settings: undefined;
  Profile: undefined;
};

export type DocumentTabsParamList = {
  Documents: undefined;
  Recent: undefined;
  Shared: undefined;
};

export type DocumentStackParamList = {
  DocumentList: undefined;
  DocumentEditor: {
    documentId: string;
    documentName?: string;
  };
  Comments: {
    documentId: string;
    commentId?: string;
  };
};

const Drawer = createDrawerNavigator<MainDrawerParamList>();
const Tab = createBottomTabNavigator<DocumentTabsParamList>();
const DocumentStack = createNativeStackNavigator<DocumentStackParamList>();

// Document Stack Navigator
const DocumentStackNavigator: React.FC = () => {
  const theme = useTheme();

  return (
    <DocumentStack.Navigator
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
      <DocumentStack.Screen
        name="DocumentList"
        component={DocumentListScreen}
        options={{ title: 'Documents' }}
      />
      <DocumentStack.Screen
        name="DocumentEditor"
        component={DocumentEditorScreen}
        options={({ route }) => ({
          title: route.params.documentName || 'Document',
          headerBackTitle: 'Documents',
        })}
      />
      <DocumentStack.Screen
        name="Comments"
        component={CommentsScreen}
        options={{
          title: 'Comments',
          headerBackTitle: 'Document',
        }}
      />
    </DocumentStack.Navigator>
  );
};

// Document Tabs Navigator
const DocumentTabsNavigator: React.FC = () => {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof MaterialIcons.glyphMap;

          switch (route.name) {
            case 'Documents':
              iconName = 'description';
              break;
            case 'Recent':
              iconName = 'access-time';
              break;
            case 'Shared':
              iconName = 'share';
              break;
            default:
              iconName = 'description';
          }

          return (
            <TabBarIcon
              name={iconName}
              size={size}
              color={color}
              focused={focused}
            />
          );
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
          paddingBottom: 4,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      })}
    >
      <Tab.Screen
        name="Documents"
        component={DocumentStackNavigator}
        options={{ title: 'All Documents' }}
      />
      <Tab.Screen
        name="Recent"
        component={DocumentStackNavigator}
        options={{ title: 'Recent' }}
      />
      <Tab.Screen
        name="Shared"
        component={DocumentStackNavigator}
        options={{ title: 'Shared' }}
      />
    </Tab.Navigator>
  );
};

// Main Navigator with Drawer
export const MainNavigator: React.FC = () => {
  const theme = useTheme();

  return (
    <Drawer.Navigator
      drawerContent={CustomDrawerContent}
      screenOptions={{
        headerShown: false,
        drawerType: 'slide',
        drawerStyle: {
          backgroundColor: theme.colors.surface,
          width: 280,
        },
        drawerActiveTintColor: theme.colors.primary,
        drawerInactiveTintColor: theme.colors.onSurfaceVariant,
        drawerActiveBackgroundColor: theme.colors.primaryContainer,
        drawerLabelStyle: {
          fontSize: 16,
          fontWeight: '500',
        },
        drawerItemStyle: {
          borderRadius: 12,
          marginHorizontal: 8,
          marginVertical: 2,
        },
      }}
    >
      <Drawer.Screen
        name="DocumentTabs"
        component={DocumentTabsNavigator}
        options={{
          title: 'Documents',
          drawerIcon: ({ color, size }) => (
            <MaterialIcons name="description" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          title: 'Notifications',
          drawerIcon: ({ color, size }) => (
            <MaterialIcons name="notifications" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="Offline"
        component={OfflineScreen}
        options={{
          title: 'Offline Documents',
          drawerIcon: ({ color, size }) => (
            <MaterialIcons name="offline-pin" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          drawerIcon: ({ color, size }) => (
            <MaterialIcons name="settings" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          drawerIcon: ({ color, size }) => (
            <MaterialIcons name="person" size={size} color={color} />
          ),
        }}
      />
    </Drawer.Navigator>
  );
};

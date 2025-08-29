import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';

import { BottomTabParamList, RootStackParamList } from '@/types';
import { useAuth } from '@/hooks/useAuth';

// Screens
import LoginScreen from '@/screens/LoginScreen';
import HomeScreen from '@/screens/HomeScreen';
import PromptListScreen from '@/screens/PromptListScreen';
import PromptEditorScreen from '@/screens/PromptEditorScreen';
import TestingScreen from '@/screens/TestingScreen';
import MetricsScreen from '@/screens/MetricsScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import TemplateDetailScreen from '@/screens/TemplateDetailScreen';
import ExecutionDetailScreen from '@/screens/ExecutionDetailScreen';
import VoicePromptScreen from '@/screens/VoicePromptScreen';
import CameraPromptScreen from '@/screens/CameraPromptScreen';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<BottomTabParamList>();

const TabIcon = ({ 
  name, 
  color, 
  size 
}: { 
  name: keyof typeof Ionicons.glyphMap; 
  color: string; 
  size: number; 
}) => (
  <Ionicons name={name} color={color} size={size} />
);

function MainTabs() {
  const theme = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'HomeTab':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'PromptsTab':
              iconName = focused ? 'library' : 'library-outline';
              break;
            case 'TestingTab':
              iconName = focused ? 'flask' : 'flask-outline';
              break;
            case 'MetricsTab':
              iconName = focused ? 'analytics' : 'analytics-outline';
              break;
            case 'SettingsTab':
              iconName = focused ? 'settings' : 'settings-outline';
              break;
            default:
              iconName = 'help-circle-outline';
          }

          return <TabIcon name={iconName} color={color} size={size} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.outline,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
        },
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.onSurface,
      })}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeScreen} 
        options={{ 
          title: 'Dashboard',
          tabBarLabel: 'Home'
        }} 
      />
      <Tab.Screen 
        name="PromptsTab" 
        component={PromptListScreen} 
        options={{ 
          title: 'Prompt Library',
          tabBarLabel: 'Prompts'
        }} 
      />
      <Tab.Screen 
        name="TestingTab" 
        component={TestingScreen} 
        options={{ 
          title: 'Testing Lab',
          tabBarLabel: 'Test'
        }} 
      />
      <Tab.Screen 
        name="MetricsTab" 
        component={MetricsScreen} 
        options={{ 
          title: 'Analytics',
          tabBarLabel: 'Metrics'
        }} 
      />
      <Tab.Screen 
        name="SettingsTab" 
        component={SettingsScreen} 
        options={{ 
          title: 'Settings',
          tabBarLabel: 'Settings'
        }} 
      />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { isAuthenticated } = useAuth();
  const theme = useTheme();

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
          headerTintColor: theme.colors.onSurface,
          cardStyle: {
            backgroundColor: theme.colors.background,
          },
        }}
      >
        {!isAuthenticated ? (
          <Stack.Screen 
            name="Login" 
            component={LoginScreen} 
            options={{ headerShown: false }} 
          />
        ) : (
          <>
            <Stack.Screen 
              name="Home" 
              component={MainTabs} 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="PromptEditor" 
              component={PromptEditorScreen}
              options={({ route }) => ({
                title: route.params?.mode === 'create' 
                  ? 'Create Template' 
                  : route.params?.mode === 'duplicate'
                  ? 'Duplicate Template'
                  : 'Edit Template',
                presentation: 'modal',
              })}
            />
            <Stack.Screen 
              name="TemplateDetail" 
              component={TemplateDetailScreen}
              options={{ title: 'Template Details' }}
            />
            <Stack.Screen 
              name="ExecutionDetail" 
              component={ExecutionDetailScreen}
              options={{ title: 'Execution Details' }}
            />
            <Stack.Screen 
              name="VoicePrompt" 
              component={VoicePromptScreen}
              options={{ 
                title: 'Voice Prompt',
                presentation: 'modal' 
              }}
            />
            <Stack.Screen 
              name="CameraPrompt" 
              component={CameraPromptScreen}
              options={{ 
                title: 'Camera Input',
                presentation: 'modal' 
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default AppNavigator;
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

// Screen imports
import { DashboardScreen } from '@/screens/DashboardScreen';
import { AssessmentsScreen } from '@/screens/AssessmentsScreen';
import { DocumentsScreen } from '@/screens/DocumentsScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { AssessmentDetailScreen } from '@/screens/AssessmentDetailScreen';
import { CreateAssessmentScreen } from '@/screens/CreateAssessmentScreen';
import { AssessmentWizardScreen } from '@/screens/AssessmentWizardScreen';
import { QuestionFlowScreen } from '@/screens/QuestionFlowScreen';
import { DocumentCaptureScreen } from '@/screens/DocumentCaptureScreen';
import { DocumentViewerScreen } from '@/screens/DocumentViewerScreen';
import { ReportScreen } from '@/screens/ReportScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';

import { MainTabParamList, RootStackParamList } from '@/types/navigation';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const DashboardStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#0D1B2A',
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen 
        name="DashboardMain" 
        component={DashboardScreen}
        options={{ 
          title: 'Dashboard',
          headerLargeTitle: true,
        }}
      />
      <Stack.Screen 
        name="AssessmentDetail" 
        component={AssessmentDetailScreen}
        options={({ route }) => ({ 
          title: route.params?.title || 'Assessment',
        })}
      />
      <Stack.Screen 
        name="Report" 
        component={ReportScreen}
        options={{ title: 'Report' }}
      />
    </Stack.Navigator>
  );
};

const AssessmentsStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#0D1B2A',
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen 
        name="AssessmentsMain" 
        component={AssessmentsScreen}
        options={{ 
          title: 'Assessments',
          headerLargeTitle: true,
        }}
      />
      <Stack.Screen 
        name="CreateAssessment" 
        component={CreateAssessmentScreen}
        options={{ 
          title: 'New Assessment',
          presentation: 'modal',
        }}
      />
      <Stack.Screen 
        name="AssessmentWizard" 
        component={AssessmentWizardScreen}
        options={{ 
          title: 'Assessment Setup',
          headerBackVisible: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen 
        name="QuestionFlow" 
        component={QuestionFlowScreen}
        options={{ 
          title: 'Questions',
          headerBackVisible: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen 
        name="AssessmentDetail" 
        component={AssessmentDetailScreen}
        options={({ route }) => ({ 
          title: route.params?.title || 'Assessment',
        })}
      />
      <Stack.Screen 
        name="Report" 
        component={ReportScreen}
        options={{ title: 'Report' }}
      />
    </Stack.Navigator>
  );
};

const DocumentsStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#0D1B2A',
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen 
        name="DocumentsMain" 
        component={DocumentsScreen}
        options={{ 
          title: 'Documents',
          headerLargeTitle: true,
        }}
      />
      <Stack.Screen 
        name="DocumentCapture" 
        component={DocumentCaptureScreen}
        options={{ 
          title: 'Capture Document',
          presentation: 'fullScreenModal',
        }}
      />
      <Stack.Screen 
        name="DocumentViewer" 
        component={DocumentViewerScreen}
        options={({ route }) => ({ 
          title: route.params?.title || 'Document',
        })}
      />
    </Stack.Navigator>
  );
};

const SettingsStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#0D1B2A',
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen 
        name="SettingsMain" 
        component={SettingsScreen}
        options={{ 
          title: 'Settings',
          headerLargeTitle: true,
        }}
      />
      <Stack.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Stack.Navigator>
  );
};

export function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'analytics' : 'analytics-outline';
          } else if (route.name === 'Assessments') {
            iconName = focused ? 'clipboard' : 'clipboard-outline';
          } else if (route.name === 'Documents') {
            iconName = focused ? 'document-text' : 'document-text-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          } else {
            iconName = 'help-circle-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#0D1B2A',
          borderTopColor: '#1F2937',
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          height: Platform.OS === 'ios' ? 88 : 68,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardStack}
        options={{
          tabBarBadge: undefined, // We'll add badge count from Redux state
        }}
      />
      <Tab.Screen 
        name="Assessments" 
        component={AssessmentsStack}
      />
      <Tab.Screen 
        name="Documents" 
        component={DocumentsStack}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsStack}
      />
    </Tab.Navigator>
  );
}
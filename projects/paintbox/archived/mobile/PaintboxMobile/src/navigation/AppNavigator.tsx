import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/Ionicons';

// Screens
import DashboardScreen from '../screens/DashboardScreen';
import ProjectsScreen from '../screens/ProjectsScreen';
import MeasurementsScreen from '../screens/MeasurementsScreen';
import CameraScreen from '../screens/CameraScreen';
import ManagerScreen from '../screens/ManagerScreen';
import ProjectDetailScreen from '../screens/ProjectDetailScreen';
import EstimateDetailScreen from '../screens/EstimateDetailScreen';
import CustomerDetailScreen from '../screens/CustomerDetailScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const DashboardStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="Dashboard"
      component={DashboardScreen}
      options={{ headerShown: false }}
    />
  </Stack.Navigator>
);

const ProjectsStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="Projects"
      component={ProjectsScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="ProjectDetail"
      component={ProjectDetailScreen}
      options={({ route }: any) => ({
        title: route.params?.projectName || 'Project Details',
        headerBackTitle: 'Projects'
      })}
    />
    <Stack.Screen
      name="EstimateDetail"
      component={EstimateDetailScreen}
      options={({ route }: any) => ({
        title: route.params?.estimateId || 'Estimate Details',
        headerBackTitle: 'Project'
      })}
    />
    <Stack.Screen
      name="CustomerDetail"
      component={CustomerDetailScreen}
      options={({ route }: any) => ({
        title: route.params?.customerName || 'Customer Details',
        headerBackTitle: 'Projects'
      })}
    />
  </Stack.Navigator>
);

const MeasurementsStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="Measurements"
      component={MeasurementsScreen}
      options={{ headerShown: false }}
    />
  </Stack.Navigator>
);

const CameraStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="Camera"
      component={CameraScreen}
      options={{ headerShown: false }}
    />
  </Stack.Navigator>
);

const ManagerStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="Manager"
      component={ManagerScreen}
      options={{ headerShown: false }}
    />
  </Stack.Navigator>
);

const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName: string;

        switch (route.name) {
          case 'DashboardTab':
            iconName = focused ? 'home' : 'home-outline';
            break;
          case 'ProjectsTab':
            iconName = focused ? 'folder' : 'folder-outline';
            break;
          case 'MeasurementsTab':
            iconName = focused ? 'calculator' : 'calculator-outline';
            break;
          case 'CameraTab':
            iconName = focused ? 'camera' : 'camera-outline';
            break;
          case 'ManagerTab':
            iconName = focused ? 'person' : 'person-outline';
            break;
          default:
            iconName = 'circle-outline';
        }

        return <Icon name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#3B82F6',
      tabBarInactiveTintColor: '#6B7280',
      tabBarStyle: {
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        paddingBottom: 5,
        paddingTop: 5,
        height: 60,
      },
      headerShown: false,
    })}
  >
    <Tab.Screen
      name="DashboardTab"
      component={DashboardStack}
      options={{ tabBarLabel: 'Dashboard' }}
    />
    <Tab.Screen
      name="ProjectsTab"
      component={ProjectsStack}
      options={{ tabBarLabel: 'Projects' }}
    />
    <Tab.Screen
      name="MeasurementsTab"
      component={MeasurementsStack}
      options={{ tabBarLabel: 'Measurements' }}
    />
    <Tab.Screen
      name="CameraTab"
      component={CameraStack}
      options={{ tabBarLabel: 'Camera' }}
    />
    <Tab.Screen
      name="ManagerTab"
      component={ManagerStack}
      options={{ tabBarLabel: 'Manager' }}
    />
  </Tab.Navigator>
);

const AppNavigator = () => (
  <NavigationContainer>
    <TabNavigator />
  </NavigationContainer>
);

export default AppNavigator;

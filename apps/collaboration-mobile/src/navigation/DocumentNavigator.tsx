/**
 * Document Navigator
 * Handles document viewing, editing, and related features
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import { useTheme } from '@/contexts/ThemeContext';
import { DocumentStackParamList } from '@/types';

// Import screens
import DocumentViewerScreen from '@/screens/document/DocumentViewerScreen';
import DocumentEditorScreen from '@/screens/document/DocumentEditorScreen';
import DocumentVersionsScreen from '@/screens/document/DocumentVersionsScreen';
import DocumentShareScreen from '@/screens/document/DocumentShareScreen';
import DocumentSettingsScreen from '@/screens/document/DocumentSettingsScreen';

const Stack = createNativeStackNavigator<DocumentStackParamList>();

const DocumentNavigator: React.FC = () => {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      initialRouteName="DocumentViewer"
      screenOptions={({ navigation }) => ({
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
        headerTitleStyle: {
          color: theme.colors.text,
          fontSize: 18,
          fontWeight: '600',
        },
        headerTintColor: theme.colors.text,
        headerShadowVisible: false,
        animation: Platform.OS === 'ios' ? 'slide_from_right' : 'slide_from_right',
        gestureEnabled: Platform.OS === 'ios',
        headerBackTitleVisible: false,
        headerLeft: ({ canGoBack }) => (
          canGoBack ? (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ 
                paddingRight: 16,
                paddingVertical: 8,
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon 
                name={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'} 
                size={24} 
                color={theme.colors.text} 
              />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => navigation.navigate('Main' as any)}
              style={{ 
                paddingRight: 16,
                paddingVertical: 8,
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon 
                name="close" 
                size={24} 
                color={theme.colors.text} 
              />
            </TouchableOpacity>
          )
        ),
      })}
    >
      <Stack.Screen 
        name="DocumentViewer" 
        component={DocumentViewerScreen}
        options={({ route }) => ({
          title: 'Document',
          headerRight: ({ tintColor }) => (
            <DocumentHeaderActions 
              documentId={route.params.documentId}
              color={tintColor}
            />
          ),
        })}
      />
      <Stack.Screen 
        name="DocumentEditor" 
        component={DocumentEditorScreen}
        options={{
          title: 'Edit Document',
          presentation: 'fullScreenModal',
        }}
      />
      <Stack.Screen 
        name="DocumentVersions" 
        component={DocumentVersionsScreen}
        options={{
          title: 'Version History',
          presentation: 'modal',
        }}
      />
      <Stack.Screen 
        name="DocumentShare" 
        component={DocumentShareScreen}
        options={{
          title: 'Share Document',
          presentation: 'modal',
        }}
      />
      <Stack.Screen 
        name="DocumentSettings" 
        component={DocumentSettingsScreen}
        options={{
          title: 'Document Settings',
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
};

/**
 * Header actions for document screens
 */
const DocumentHeaderActions: React.FC<{
  documentId: string;
  color?: string;
}> = ({ documentId, color }) => {
  const { theme } = useTheme();
  
  return (
    <>
      <TouchableOpacity
        style={{ 
          paddingHorizontal: 12,
          paddingVertical: 8,
          marginLeft: 8,
        }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Icon 
          name="share-outline" 
          size={22} 
          color={color || theme.colors.text} 
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={{ 
          paddingHorizontal: 12,
          paddingVertical: 8,
          marginLeft: 4,
        }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Icon 
          name="ellipsis-horizontal" 
          size={22} 
          color={color || theme.colors.text} 
        />
      </TouchableOpacity>
    </>
  );
};

export default DocumentNavigator;
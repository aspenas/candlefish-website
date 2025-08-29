import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as Clipboard from 'expo-clipboard';

import { RootStackParamList, QuickAction } from '@/types';
import { useHapticFeedback } from './useHapticFeedback';
import { DEFAULT_QUICK_ACTIONS } from '@/constants';

type NavigationProp = StackNavigationProp<RootStackParamList>;

export const useQuickActions = () => {
  const navigation = useNavigation<NavigationProp>();
  const { triggerHaptic } = useHapticFeedback();
  
  const [quickActions] = useState<QuickAction[]>(DEFAULT_QUICK_ACTIONS);

  const handleQuickAction = useCallback(async (action: QuickAction) => {
    triggerHaptic('light');

    switch (action.id) {
      case 'voice-prompt':
        navigation.navigate('VoicePrompt');
        break;

      case 'camera-ocr':
        navigation.navigate('CameraPrompt', { mode: 'ocr' });
        break;

      case 'quick-test':
        // Get the most recently used template and test it
        Alert.alert(
          'Quick Test',
          'This will execute your most recently used prompt template.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Execute', 
              onPress: () => {
                // Navigate to test screen with last template
                navigation.navigate('PromptTest', { templateId: 'last-used' });
              }
            }
          ]
        );
        break;

      case 'clipboard-prompt':
        try {
          const clipboardContent = await Clipboard.getStringAsync();
          if (!clipboardContent.trim()) {
            Alert.alert('Empty Clipboard', 'Your clipboard appears to be empty.');
            return;
          }
          
          // Navigate to prompt editor with clipboard content
          navigation.navigate('PromptEditor', { 
            mode: 'create',
            // Pass clipboard content as initial data
          });
        } catch (error) {
          Alert.alert('Error', 'Failed to read clipboard content.');
        }
        break;

      default:
        if (action.templateId) {
          navigation.navigate('TemplateDetail', { templateId: action.templateId });
        } else if (action.action) {
          action.action();
        }
        break;
    }
  }, [navigation, triggerHaptic]);

  return {
    quickActions,
    handleQuickAction
  };
};
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Title, useTheme } from 'react-native-paper';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '@/types';

type PromptEditorScreenRouteProp = RouteProp<RootStackParamList, 'PromptEditor'>;

interface PromptEditorScreenProps {
  route: PromptEditorScreenRouteProp;
}

const PromptEditorScreen: React.FC<PromptEditorScreenProps> = ({ route }) => {
  const theme = useTheme();
  const { templateId, mode } = route.params || {};

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Title>Prompt Editor - {mode} mode</Title>
      {/* TODO: Implement full prompt editor with:
        - Rich text editor for prompt templates
        - Variable management
        - Model configuration
        - Live preview
        - Template validation
        - Save/publish functionality
      */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
});

export default PromptEditorScreen;
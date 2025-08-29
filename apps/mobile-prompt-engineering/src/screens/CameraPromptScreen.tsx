import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Title, useTheme } from 'react-native-paper';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '@/types';

type CameraPromptScreenRouteProp = RouteProp<RootStackParamList, 'CameraPrompt'>;

interface CameraPromptScreenProps {
  route: CameraPromptScreenRouteProp;
}

const CameraPromptScreen: React.FC<CameraPromptScreenProps> = ({ route }) => {
  const theme = useTheme();
  const { mode } = route.params;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Title>Camera Input - {mode} mode</Title>
      {/* TODO: Implement camera interface with:
        - Camera preview
        - Photo capture
        - OCR text extraction
        - Document detection
        - Text editing and formatting
        - Context extraction
        - Convert to prompt variables
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

export default CameraPromptScreen;
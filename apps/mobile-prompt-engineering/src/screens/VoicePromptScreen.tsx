import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Title, useTheme } from 'react-native-paper';

const VoicePromptScreen: React.FC = () => {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Title>Voice Prompt</Title>
      {/* TODO: Implement voice input interface with:
        - Speech-to-text recording
        - Real-time transcription
        - Voice command recognition
        - Language selection
        - Confidence scoring
        - Edit transcription
        - Convert to prompt template
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

export default VoicePromptScreen;
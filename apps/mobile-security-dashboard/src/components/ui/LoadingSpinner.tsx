import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';

interface LoadingSpinnerProps {
  text?: string;
  size?: 'small' | 'large';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  text = 'Loading...',
  size = 'large',
}) => {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <ActivityIndicator
        animating
        size={size}
        color={theme.colors.primary}
        style={styles.spinner}
      />
      {text && (
        <Text style={[styles.text, { color: theme.colors.onSurface }]}>
          {text}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  spinner: {
    marginBottom: 16,
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
  },
});

export default LoadingSpinner;
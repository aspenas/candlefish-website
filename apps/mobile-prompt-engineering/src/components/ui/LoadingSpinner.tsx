import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator, useTheme } from 'react-native-paper';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  style?: any;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'large',
  color,
  style 
}) => {
  const theme = useTheme();
  
  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator 
        size={size} 
        color={color || theme.colors.primary}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});

export default LoadingSpinner;
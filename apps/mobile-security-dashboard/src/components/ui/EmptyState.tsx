import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Surface, Title, Paragraph, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Surface style={[styles.iconContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
        <MaterialCommunityIcons
          name={icon as any}
          size={64}
          color={theme.colors.onSurfaceVariant}
        />
      </Surface>
      
      <Title style={[styles.title, { color: theme.colors.onSurface }]}>
        {title}
      </Title>
      
      <Paragraph style={[styles.description, { color: theme.colors.onSurface }]}>
        {description}
      </Paragraph>
      
      {action && (
        <View style={styles.actionContainer}>
          {action}
        </View>
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
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    elevation: 1,
  },
  title: {
    textAlign: 'center',
    marginBottom: 12,
    fontSize: 24,
    fontWeight: 'bold',
  },
  description: {
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.7,
    lineHeight: 22,
  },
  actionContainer: {
    width: '100%',
    alignItems: 'center',
  },
});

export default EmptyState;
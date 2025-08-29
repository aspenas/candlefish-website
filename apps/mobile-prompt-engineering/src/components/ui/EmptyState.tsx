import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Title, Paragraph, Button, useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { spacing, typography } from '@/constants/theme';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  actionTitle?: string;
  onAction?: () => void;
  style?: any;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  subtitle,
  actionTitle,
  onAction,
  style
}) => {
  const theme = useTheme();

  return (
    <View style={[styles.container, style]}>
      <Ionicons
        name={icon}
        size={64}
        color={theme.colors.outline}
        style={styles.icon}
      />
      <Title style={[styles.title, { color: theme.colors.onSurface }]}>
        {title}
      </Title>
      {subtitle && (
        <Paragraph style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          {subtitle}
        </Paragraph>
      )}
      {actionTitle && onAction && (
        <Button
          mode="contained"
          onPress={onAction}
          style={styles.action}
        >
          {actionTitle}
        </Button>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  icon: {
    marginBottom: spacing.lg,
    opacity: 0.6,
  },
  title: {
    ...typography.headlineSmall,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.bodyMedium,
    textAlign: 'center',
    marginBottom: spacing.xl,
    opacity: 0.7,
  },
  action: {
    marginTop: spacing.md,
  },
});

export default EmptyState;
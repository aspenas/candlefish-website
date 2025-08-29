import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Surface, Title, Text, useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { spacing, typography, borderRadius } from '@/constants/theme';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  onPress?: () => void;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color,
  trend,
  trendValue,
  onPress
}) => {
  const theme = useTheme();

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return 'trending-up';
      case 'down':
        return 'trending-down';
      default:
        return 'trending-neutral';
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return theme.colors.success;
      case 'down':
        return theme.colors.error;
      default:
        return theme.colors.outline;
    }
  };

  return (
    <Surface
      style={[
        styles.container,
        { backgroundColor: theme.colors.surface }
      ]}
      elevation={1}
    >
      <View style={styles.header}>
        <Ionicons
          name={icon}
          size={20}
          color={color}
          style={styles.icon}
        />
        <Text style={[styles.title, { color: theme.colors.onSurfaceVariant }]}>
          {title}
        </Text>
      </View>

      <Title style={[styles.value, { color: theme.colors.onSurface }]}>
        {value}
      </Title>

      <View style={styles.footer}>
        <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          {subtitle}
        </Text>
        
        {trend && trendValue && (
          <View style={styles.trend}>
            <Ionicons
              name={getTrendIcon()}
              size={12}
              color={getTrendColor()}
            />
            <Text style={[styles.trendValue, { color: getTrendColor() }]}>
              {trendValue}
            </Text>
          </View>
        )}
      </View>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    width: '48%',
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  icon: {
    marginRight: spacing.xs,
  },
  title: {
    ...typography.labelMedium,
    fontWeight: '500',
  },
  value: {
    ...typography.headlineSmall,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subtitle: {
    ...typography.bodySmall,
    flex: 1,
  },
  trend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  trendValue: {
    ...typography.labelSmall,
    fontWeight: '600',
  },
});

export default MetricCard;
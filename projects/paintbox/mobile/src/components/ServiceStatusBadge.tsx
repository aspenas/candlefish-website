/**
 * Service Status Badge Component
 * Displays service status with appropriate colors
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ServiceStatusBadgeProps {
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'UNKNOWN' | 'MAINTENANCE';
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
  showText?: boolean;
}

const getStatusConfig = (status: string, theme: any) => {
  switch (status) {
    case 'HEALTHY':
      return {
        color: theme.colors.success || '#10b981',
        backgroundColor: (theme.colors.success || '#10b981') + '20',
        icon: 'check-circle',
        text: 'Healthy',
      };
    case 'DEGRADED':
      return {
        color: theme.colors.warning || '#f59e0b',
        backgroundColor: (theme.colors.warning || '#f59e0b') + '20',
        icon: 'alert',
        text: 'Degraded',
      };
    case 'UNHEALTHY':
      return {
        color: theme.colors.error,
        backgroundColor: theme.colors.error + '20',
        icon: 'close-circle',
        text: 'Unhealthy',
      };
    case 'MAINTENANCE':
      return {
        color: theme.colors.primary,
        backgroundColor: theme.colors.primary + '20',
        icon: 'wrench',
        text: 'Maintenance',
      };
    default:
      return {
        color: theme.colors.onSurfaceVariant,
        backgroundColor: theme.colors.onSurfaceVariant + '20',
        icon: 'help-circle',
        text: 'Unknown',
      };
  }
};

const getSizeConfig = (size: string) => {
  switch (size) {
    case 'small':
      return {
        containerPadding: 4,
        iconSize: 12,
        textVariant: 'labelSmall' as const,
        gap: 2,
      };
    case 'large':
      return {
        containerPadding: 12,
        iconSize: 20,
        textVariant: 'labelLarge' as const,
        gap: 6,
      };
    default: // medium
      return {
        containerPadding: 8,
        iconSize: 16,
        textVariant: 'labelMedium' as const,
        gap: 4,
      };
  }
};

export default function ServiceStatusBadge({
  status,
  size = 'medium',
  showIcon = true,
  showText = true,
}: ServiceStatusBadgeProps) {
  const theme = useTheme();
  const statusConfig = getStatusConfig(status, theme);
  const sizeConfig = getSizeConfig(size);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: statusConfig.backgroundColor,
          padding: sizeConfig.containerPadding,
          gap: sizeConfig.gap,
        },
      ]}
    >
      {showIcon && (
        <MaterialCommunityIcons
          name={statusConfig.icon}
          size={sizeConfig.iconSize}
          color={statusConfig.color}
        />
      )}
      
      {showText && (
        <Text
          variant={sizeConfig.textVariant}
          style={[styles.text, { color: statusConfig.color }]}
        >
          {statusConfig.text}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '600',
  },
});
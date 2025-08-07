/**
 * Alert List Item Component
 * Displays alert information in a compact list format
 */

import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';

interface Alert {
  id: string;
  name: string;
  description?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'ACTIVE' | 'RESOLVED' | 'ACKNOWLEDGED' | 'SUPPRESSED';
  triggeredAt: string;
  resolvedAt?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  service: {
    id: string;
    name: string;
    displayName?: string;
  };
}

interface AlertListItemProps {
  alert: Alert;
  onPress?: () => void;
}

const getSeverityConfig = (severity: string, theme: any) => {
  switch (severity) {
    case 'CRITICAL':
      return {
        color: theme.colors.error,
        backgroundColor: theme.colors.error + '20',
        icon: 'alert-octagon',
        text: 'Critical',
      };
    case 'HIGH':
      return {
        color: theme.colors.error,
        backgroundColor: theme.colors.error + '20',
        icon: 'alert',
        text: 'High',
      };
    case 'MEDIUM':
      return {
        color: theme.colors.warning || '#f59e0b',
        backgroundColor: (theme.colors.warning || '#f59e0b') + '20',
        icon: 'alert-circle-outline',
        text: 'Medium',
      };
    case 'LOW':
      return {
        color: theme.colors.primary,
        backgroundColor: theme.colors.primary + '20',
        icon: 'information',
        text: 'Low',
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

const getStatusConfig = (status: string, theme: any) => {
  switch (status) {
    case 'ACTIVE':
      return {
        color: theme.colors.error,
        icon: 'circle',
        text: 'Active',
      };
    case 'RESOLVED':
      return {
        color: theme.colors.success || '#10b981',
        icon: 'check-circle',
        text: 'Resolved',
      };
    case 'ACKNOWLEDGED':
      return {
        color: theme.colors.warning || '#f59e0b',
        icon: 'account-check',
        text: 'Acknowledged',
      };
    case 'SUPPRESSED':
      return {
        color: theme.colors.onSurfaceVariant,
        icon: 'volume-off',
        text: 'Suppressed',
      };
    default:
      return {
        color: theme.colors.onSurfaceVariant,
        icon: 'help-circle',
        text: 'Unknown',
      };
  }
};

export default function AlertListItem({ alert, onPress }: AlertListItemProps) {
  const theme = useTheme();
  const severityConfig = getSeverityConfig(alert.severity, theme);
  const statusConfig = getStatusConfig(alert.status, theme);

  const content = (
    <View style={styles.container}>
      {/* Alert Header */}
      <View style={styles.header}>
        <View style={styles.severityBadge}>
          <MaterialCommunityIcons
            name={severityConfig.icon}
            size={16}
            color={severityConfig.color}
          />
        </View>
        
        <View style={styles.alertInfo}>
          <Text variant="labelLarge" numberOfLines={1} style={styles.alertName}>
            {alert.name}
          </Text>
          <Text 
            variant="labelSmall" 
            numberOfLines={1} 
            style={[styles.serviceName, { color: theme.colors.onSurfaceVariant }]}
          >
            {alert.service.displayName || alert.service.name}
          </Text>
        </View>

        <View style={styles.statusContainer}>
          <MaterialCommunityIcons
            name={statusConfig.icon}
            size={12}
            color={statusConfig.color}
          />
        </View>
      </View>

      {/* Alert Description */}
      {alert.description && (
        <Text 
          variant="labelSmall" 
          numberOfLines={2} 
          style={[styles.description, { color: theme.colors.onSurfaceVariant }]}
        >
          {alert.description}
        </Text>
      )}

      {/* Alert Metadata */}
      <View style={styles.metadata}>
        <Text variant="labelSmall" style={[styles.metadataText, { color: theme.colors.onSurfaceVariant }]}>
          {formatDistanceToNow(new Date(alert.triggeredAt), { addSuffix: true })}
        </Text>

        {alert.acknowledgedBy && (
          <Text variant="labelSmall" style={[styles.metadataText, { color: theme.colors.onSurfaceVariant }]}>
            Ack'd by {alert.acknowledgedBy}
          </Text>
        )}

        <View style={styles.severityChip}>
          <Text 
            variant="labelSmall" 
            style={[styles.severityText, { color: severityConfig.color }]}
          >
            {severityConfig.text}
          </Text>
        </View>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={styles.pressable}>
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: 8,
  },
  container: {
    paddingVertical: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  severityBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  alertInfo: {
    flex: 1,
    marginRight: 8,
  },
  alertName: {
    fontWeight: '600',
    marginBottom: 2,
    lineHeight: 18,
  },
  serviceName: {
    fontSize: 11,
    fontWeight: '500',
  },
  statusContainer: {
    paddingTop: 2,
  },
  description: {
    marginLeft: 32,
    marginBottom: 6,
    lineHeight: 16,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 32,
    gap: 12,
  },
  metadataText: {
    fontSize: 10,
  },
  severityChip: {
    marginLeft: 'auto',
  },
  severityText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
/**
 * Alert Summary Card Component
 * Shows critical alerts with quick actions
 */

import React from 'react';
import { View, StyleSheet, Pressable, FlatList } from 'react-native';
import { Card, Text, useTheme, Chip, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';

interface Alert {
  id: string;
  name: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'ACTIVE' | 'RESOLVED' | 'ACKNOWLEDGED' | 'SUPPRESSED';
  triggeredAt: string;
  service: {
    id: string;
    name: string;
    displayName?: string;
  };
}

interface AlertSummaryCardProps {
  alerts: Alert[];
  onPress: () => void;
}

const getSeverityColor = (severity: string, theme: any) => {
  switch (severity) {
    case 'CRITICAL':
      return theme.colors.error;
    case 'HIGH':
      return theme.colors.error;
    case 'MEDIUM':
      return theme.colors.warning || '#f59e0b';
    case 'LOW':
      return theme.colors.primary;
    default:
      return theme.colors.onSurfaceVariant;
  }
};

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'CRITICAL':
      return 'alert-octagon';
    case 'HIGH':
      return 'alert';
    case 'MEDIUM':
      return 'alert-circle-outline';
    case 'LOW':
      return 'information';
    default:
      return 'help-circle';
  }
};

export default function AlertSummaryCard({ alerts, onPress }: AlertSummaryCardProps) {
  const theme = useTheme();

  // Sort alerts by severity and time
  const sortedAlerts = [...alerts]
    .sort((a, b) => {
      // Severity priority
      const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      
      // Then by time
      return new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime();
    })
    .slice(0, 3); // Show only top 3

  // Count alerts by severity
  const criticalCount = alerts.filter(a => a.severity === 'CRITICAL').length;
  const highCount = alerts.filter(a => a.severity === 'HIGH').length;
  const mediumCount = alerts.filter(a => a.severity === 'MEDIUM').length;
  const lowCount = alerts.filter(a => a.severity === 'LOW').length;

  const AlertItem = ({ alert }: { alert: Alert }) => {
    const severityColor = getSeverityColor(alert.severity, theme);
    const severityIcon = getSeverityIcon(alert.severity);

    return (
      <View style={styles.alertItem}>
        <View style={styles.alertHeader}>
          <MaterialCommunityIcons
            name={severityIcon}
            size={16}
            color={severityColor}
          />
          <Text 
            variant="labelMedium" 
            numberOfLines={1} 
            style={styles.alertName}
          >
            {alert.name}
          </Text>
        </View>
        
        <View style={styles.alertMeta}>
          <Text 
            variant="labelSmall" 
            style={{ color: theme.colors.onSurfaceVariant }}
            numberOfLines={1}
          >
            {alert.service.displayName || alert.service.name}
          </Text>
          <Text 
            variant="labelSmall" 
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {formatDistanceToNow(new Date(alert.triggeredAt), { addSuffix: true })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]} mode="outlined">
      <Card.Content style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text variant="titleMedium" style={styles.title}>
              Active Alerts
            </Text>
            <View style={styles.severityChips}>
              {criticalCount > 0 && (
                <Chip
                  mode="flat"
                  compact
                  textStyle={{ color: theme.colors.error, fontSize: 10 }}
                  style={[styles.severityChip, { backgroundColor: theme.colors.error + '20' }]}
                >
                  {criticalCount} Critical
                </Chip>
              )}
              {highCount > 0 && (
                <Chip
                  mode="flat"
                  compact
                  textStyle={{ color: theme.colors.error, fontSize: 10 }}
                  style={[styles.severityChip, { backgroundColor: theme.colors.error + '20' }]}
                >
                  {highCount} High
                </Chip>
              )}
              {mediumCount > 0 && (
                <Chip
                  mode="flat"
                  compact
                  textStyle={{ color: theme.colors.warning || '#f59e0b', fontSize: 10 }}
                  style={[styles.severityChip, { backgroundColor: (theme.colors.warning || '#f59e0b') + '20' }]}
                >
                  {mediumCount} Medium
                </Chip>
              )}
            </View>
          </View>
          
          <MaterialCommunityIcons
            name="chevron-right"
            size={20}
            color={theme.colors.onSurfaceVariant}
          />
        </View>

        {/* Alert List */}
        <View style={styles.alertsList}>
          {sortedAlerts.map((alert) => (
            <AlertItem key={alert.id} alert={alert} />
          ))}
          
          {alerts.length > 3 && (
            <View style={styles.moreAlertsContainer}>
              <Text 
                variant="labelSmall" 
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                +{alerts.length - 3} more alerts
              </Text>
            </View>
          )}
        </View>

        {/* View All Button */}
        <Button
          mode="text"
          onPress={onPress}
          compact
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
        >
          View All Alerts
        </Button>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 2,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontWeight: '600',
    marginBottom: 8,
  },
  severityChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  severityChip: {
    marginRight: 0,
  },
  alertsList: {
    marginBottom: 12,
  },
  alertItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  alertName: {
    flex: 1,
    fontWeight: '500',
  },
  alertMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moreAlertsContainer: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  buttonContent: {
    paddingVertical: 4,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
});
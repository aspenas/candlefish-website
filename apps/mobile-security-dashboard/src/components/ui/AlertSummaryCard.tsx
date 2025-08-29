import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Title, Text, Chip, Button, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';

// Types
interface Alert {
  id: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  timestamp: string;
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'CLOSED';
}

interface AlertSummaryCardProps {
  alerts: Alert[];
  onViewAll: () => void;
}

export const AlertSummaryCard: React.FC<AlertSummaryCardProps> = ({
  alerts,
  onViewAll,
}) => {
  const theme = useTheme();

  const getSeverityColor = (severity: Alert['severity']): string => {
    switch (severity) {
      case 'CRITICAL':
        return '#d32f2f';
      case 'HIGH':
        return '#f57c00';
      case 'MEDIUM':
        return '#1976d2';
      case 'LOW':
        return '#388e3c';
      default:
        return theme.colors.outline;
    }
  };

  const getSeverityIcon = (severity: Alert['severity']): string => {
    switch (severity) {
      case 'CRITICAL':
        return 'alert-octagon';
      case 'HIGH':
        return 'alert';
      case 'MEDIUM':
        return 'alert-circle';
      case 'LOW':
        return 'information';
      default:
        return 'help-circle';
    }
  };

  if (alerts.length === 0) {
    return null;
  }

  const openAlerts = alerts.filter(alert => alert.status === 'OPEN');
  const criticalAlerts = openAlerts.filter(alert => alert.severity === 'CRITICAL');
  const highAlerts = openAlerts.filter(alert => alert.severity === 'HIGH');

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.header}>
          <Title>Recent Alerts</Title>
          <Button mode="text" onPress={onViewAll} compact>
            View All
          </Button>
        </View>

        {/* Alert Summary Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: getSeverityColor('CRITICAL') }]}>
              {criticalAlerts.length}
            </Text>
            <Text style={styles.statLabel}>Critical</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: getSeverityColor('HIGH') }]}>
              {highAlerts.length}
            </Text>
            <Text style={styles.statLabel}>High</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>
              {openAlerts.length}
            </Text>
            <Text style={styles.statLabel}>Total Open</Text>
          </View>
        </View>

        {/* Recent Alerts List */}
        <View style={styles.alertsList}>
          {alerts.slice(0, 3).map((alert, index) => (
            <TouchableOpacity
              key={alert.id}
              style={[
                styles.alertItem,
                index < alerts.length - 1 && styles.alertItemWithBorder,
              ]}
            >
              <View style={styles.alertContent}>
                <View style={styles.alertHeader}>
                  <MaterialCommunityIcons
                    name={getSeverityIcon(alert.severity) as any}
                    size={18}
                    color={getSeverityColor(alert.severity)}
                    style={styles.alertIcon}
                  />
                  <Text style={styles.alertTitle} numberOfLines={1}>
                    {alert.title}
                  </Text>
                </View>
                
                <View style={styles.alertMeta}>
                  <Chip
                    mode="outlined"
                    compact
                    textStyle={{
                      fontSize: 10,
                      color: getSeverityColor(alert.severity),
                    }}
                    style={[
                      styles.severityChip,
                      { borderColor: getSeverityColor(alert.severity) },
                    ]}
                  >
                    {alert.severity}
                  </Chip>
                  <Text style={styles.alertTime}>
                    {format(parseISO(alert.timestamp), 'HH:mm')}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {alerts.length > 3 && (
          <View style={styles.moreAlertsContainer}>
            <Text style={styles.moreAlertsText}>
              +{alerts.length - 3} more alerts
            </Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    margin: 16,
    marginBottom: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  alertsList: {
    marginTop: 8,
  },
  alertItem: {
    paddingVertical: 8,
  },
  alertItemWithBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  alertContent: {
    flex: 1,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  alertIcon: {
    marginRight: 8,
  },
  alertTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  alertMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  severityChip: {
    height: 24,
  },
  alertTime: {
    fontSize: 12,
    opacity: 0.7,
  },
  moreAlertsContainer: {
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  moreAlertsText: {
    fontSize: 12,
    opacity: 0.7,
    fontStyle: 'italic',
  },
});

export default AlertSummaryCard;
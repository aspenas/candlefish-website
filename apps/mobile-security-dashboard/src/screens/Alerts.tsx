import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Chip,
  Button,
  Searchbar,
  Surface,
  Text,
  Avatar,
  IconButton,
  useTheme,
  Badge,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useMutation, useSubscription } from '@apollo/client';
import { format, parseISO } from 'date-fns';

// GraphQL
import { 
  GET_SECURITY_ALERTS,
  ACKNOWLEDGE_ALERT,
  RESOLVE_ALERT,
} from '@/graphql/queries/security.graphql';
import { REAL_TIME_ALERTS_SUBSCRIPTION } from '@/graphql/subscriptions/security.graphql';

// Types
import { SecurityAlert, AlertSeverity, AlertStatus } from '@/types/security';

// Components
import { AlertFilterModal } from '@/components/alerts/AlertFilterModal';
import { AlertDetailModal } from '@/components/alerts/AlertDetailModal';
import { NetworkStatusBar } from '@/components/common/NetworkStatusBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

// Hooks
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface AlertsScreenProps {
  navigation: any;
}

interface AlertFilters {
  severity?: AlertSeverity[];
  status?: AlertStatus[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchTerm?: string;
}

export const AlertsScreen: React.FC<AlertsScreenProps> = ({ navigation }) => {
  const theme = useTheme();
  const { isConnected } = useNetworkStatus();
  const { queueSize } = useOfflineQueue();
  const { clearNotifications } = usePushNotifications();

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<AlertFilters>({});
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<SecurityAlert | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // GraphQL queries and mutations
  const {
    data: alertsData,
    loading,
    error,
    refetch,
    fetchMore,
  } = useQuery<{ securityAlerts: SecurityAlert[] }>(GET_SECURITY_ALERTS, {
    variables: {
      filters: {
        ...filters,
        searchTerm: searchQuery || undefined,
      },
      limit: 20,
      offset: 0,
    },
    errorPolicy: 'cache-first',
    pollInterval: isConnected ? 30000 : 0,
  });

  const [acknowledgeAlert] = useMutation(ACKNOWLEDGE_ALERT);
  const [resolveAlert] = useMutation(RESOLVE_ALERT);

  // Real-time alerts subscription
  const { data: newAlertsData } = useSubscription(REAL_TIME_ALERTS_SUBSCRIPTION, {
    skip: !isConnected,
    onData: ({ data }) => {
      if (data?.data?.newAlert) {
        // Refetch to get latest alerts
        refetch();
        
        // Show notification for high/critical alerts
        const alert = data.data.newAlert;
        if (alert.severity === 'CRITICAL' || alert.severity === 'HIGH') {
          Alert.alert(
            `${alert.severity} Alert`,
            alert.title,
            [
              {
                text: 'View',
                onPress: () => {
                  setSelectedAlert(alert);
                  setShowDetailModal(true);
                },
              },
              { text: 'Dismiss', style: 'cancel' },
            ]
          );
        }
      }
    },
  });

  // Clear notification badges when screen is focused
  useFocusEffect(
    useCallback(() => {
      clearNotifications();
    }, [clearNotifications])
  );

  const alerts = alertsData?.securityAlerts || [];

  // Filter and search alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      // Search filter
      if (searchQuery) {
        const searchTerm = searchQuery.toLowerCase();
        if (
          !alert.title.toLowerCase().includes(searchTerm) &&
          !alert.description.toLowerCase().includes(searchTerm) &&
          !alert.source.toLowerCase().includes(searchTerm)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [alerts, searchQuery]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (error) {
      console.error('Failed to refresh alerts:', error);
    }
    setRefreshing(false);
  }, [refetch]);

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await acknowledgeAlert({ variables: { alertId } });
      await refetch();
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      Alert.alert('Error', 'Failed to acknowledge alert');
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      await resolveAlert({ variables: { alertId } });
      await refetch();
    } catch (error) {
      console.error('Failed to resolve alert:', error);
      Alert.alert('Error', 'Failed to resolve alert');
    }
  };

  const getSeverityColor = (severity: AlertSeverity): string => {
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

  const getSeverityIcon = (severity: AlertSeverity): string => {
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

  const getStatusColor = (status: AlertStatus): string => {
    switch (status) {
      case 'OPEN':
        return theme.colors.error;
      case 'ACKNOWLEDGED':
        return theme.colors.tertiary;
      case 'RESOLVED':
        return theme.colors.primary;
      case 'CLOSED':
        return theme.colors.outline;
      default:
        return theme.colors.outline;
    }
  };

  const renderAlert = ({ item: alert }: { item: SecurityAlert }) => (
    <Card 
      style={[
        styles.alertCard,
        alert.status === 'OPEN' && styles.openAlert,
      ]}
      onPress={() => {
        setSelectedAlert(alert);
        setShowDetailModal(true);
      }}
    >
      <Card.Content>
        <View style={styles.alertHeader}>
          <View style={styles.alertInfo}>
            <View style={styles.alertTitleRow}>
              <MaterialCommunityIcons
                name={getSeverityIcon(alert.severity)}
                size={20}
                color={getSeverityColor(alert.severity)}
                style={styles.severityIcon}
              />
              <Text style={styles.alertTitle} numberOfLines={2}>
                {alert.title}
              </Text>
            </View>
            
            <View style={styles.chipContainer}>
              <Chip
                mode="outlined"
                compact
                textStyle={{ color: getSeverityColor(alert.severity) }}
                style={[
                  styles.severityChip,
                  { borderColor: getSeverityColor(alert.severity) }
                ]}
              >
                {alert.severity}
              </Chip>
              <Chip
                mode="outlined"
                compact
                textStyle={{ color: getStatusColor(alert.status) }}
                style={[
                  styles.statusChip,
                  { borderColor: getStatusColor(alert.status) }
                ]}
              >
                {alert.status}
              </Chip>
            </View>
          </View>
          
          {alert.status === 'OPEN' && (
            <Badge size={8} style={[styles.badge, { backgroundColor: theme.colors.error }]} />
          )}
        </View>

        <Paragraph style={styles.alertDescription} numberOfLines={3}>
          {alert.description}
        </Paragraph>

        <View style={styles.alertMeta}>
          <View style={styles.metaItem}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={16}
              color={theme.colors.outline}
            />
            <Text style={styles.metaText}>
              {format(parseISO(alert.timestamp), 'MMM d, HH:mm')}
            </Text>
          </View>
          
          <View style={styles.metaItem}>
            <MaterialCommunityIcons
              name="source-branch"
              size={16}
              color={theme.colors.outline}
            />
            <Text style={styles.metaText} numberOfLines={1}>
              {alert.source}
            </Text>
          </View>
        </View>

        {alert.status === 'OPEN' && (
          <View style={styles.alertActions}>
            <Button
              mode="outlined"
              compact
              onPress={() => handleAcknowledgeAlert(alert.id)}
              style={styles.actionButton}
            >
              Acknowledge
            </Button>
            <Button
              mode="contained"
              compact
              onPress={() => handleResolveAlert(alert.id)}
              style={styles.actionButton}
            >
              Resolve
            </Button>
          </View>
        )}
      </Card.Content>
    </Card>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Title style={styles.title}>Security Alerts</Title>
      
      {queueSize > 0 && (
        <Chip mode="outlined" compact style={styles.queueChip}>
          {queueSize} pending sync
        </Chip>
      )}

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search alerts..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
          inputStyle={styles.searchInput}
        />
        <IconButton
          icon="filter-variant"
          mode="outlined"
          onPress={() => setShowFilterModal(true)}
          style={styles.filterButton}
        />
      </View>

      {/* Alert Statistics */}
      <Surface style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: getSeverityColor('CRITICAL') }]}>
            {alerts.filter(a => a.severity === 'CRITICAL' && a.status === 'OPEN').length}
          </Text>
          <Text style={styles.statLabel}>Critical</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: getSeverityColor('HIGH') }]}>
            {alerts.filter(a => a.severity === 'HIGH' && a.status === 'OPEN').length}
          </Text>
          <Text style={styles.statLabel}>High</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: getSeverityColor('MEDIUM') }]}>
            {alerts.filter(a => a.severity === 'MEDIUM' && a.status === 'OPEN').length}
          </Text>
          <Text style={styles.statLabel}>Medium</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.colors.primary }]}>
            {alerts.filter(a => a.status === 'RESOLVED').length}
          </Text>
          <Text style={styles.statLabel}>Resolved</Text>
        </View>
      </Surface>
    </View>
  );

  if (loading && !alerts.length) {
    return (
      <SafeAreaView style={styles.container}>
        <NetworkStatusBar />
        <LoadingSpinner text="Loading alerts..." />
      </SafeAreaView>
    );
  }

  if (error && !alerts.length) {
    return (
      <SafeAreaView style={styles.container}>
        <NetworkStatusBar />
        <EmptyState
          icon="alert-circle-outline"
          title="Unable to Load Alerts"
          description={
            isConnected
              ? 'There was an error loading the alerts.'
              : 'You are currently offline. Please check your connection.'
          }
          action={
            <Button mode="contained" onPress={onRefresh}>
              Retry
            </Button>
          }
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <NetworkStatusBar />
      
      <FlatList
        data={filteredAlerts}
        renderItem={renderAlert}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <EmptyState
            icon="shield-check-outline"
            title="No Alerts Found"
            description={
              searchQuery || Object.keys(filters).length > 0
                ? 'Try adjusting your search or filter criteria.'
                : 'All systems are secure. No active alerts at this time.'
            }
            action={
              searchQuery || Object.keys(filters).length > 0 ? (
                <Button
                  mode="outlined"
                  onPress={() => {
                    setSearchQuery('');
                    setFilters({});
                  }}
                >
                  Clear Filters
                </Button>
              ) : undefined
            }
          />
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Filter Modal */}
      <AlertFilterModal
        visible={showFilterModal}
        onDismiss={() => setShowFilterModal(false)}
        filters={filters}
        onApplyFilters={(newFilters) => {
          setFilters(newFilters);
          setShowFilterModal(false);
        }}
      />

      {/* Alert Detail Modal */}
      <AlertDetailModal
        visible={showDetailModal}
        onDismiss={() => setShowDetailModal(false)}
        alert={selectedAlert}
        onAcknowledge={handleAcknowledgeAlert}
        onResolve={handleResolveAlert}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  listContent: {
    paddingBottom: 16,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  queueChip: {
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  searchbar: {
    flex: 1,
    elevation: 2,
  },
  searchInput: {
    fontSize: 16,
  },
  filterButton: {
    marginLeft: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    marginBottom: 8,
    borderRadius: 12,
    elevation: 1,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  alertCard: {
    marginHorizontal: 16,
    marginVertical: 4,
    elevation: 2,
  },
  openAlert: {
    borderLeftWidth: 4,
    borderLeftColor: '#d32f2f',
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  alertInfo: {
    flex: 1,
  },
  alertTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  severityIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  chipContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  severityChip: {
    height: 28,
  },
  statusChip: {
    height: 28,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  alertDescription: {
    marginBottom: 12,
    opacity: 0.8,
  },
  alertMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  metaText: {
    marginLeft: 6,
    fontSize: 12,
    opacity: 0.7,
    flex: 1,
  },
  alertActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    minWidth: 100,
  },
});

export default AlertsScreen;
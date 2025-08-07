/**
 * Alerts Screen - List and manage system alerts
 * Features:
 * - Filterable alert list
 * - Severity and status filtering
 * - Quick actions (acknowledge, resolve)
 * - Real-time updates
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import {
  Text,
  useTheme,
  ActivityIndicator,
  SegmentedButtons,
  FAB,
  Chip,
  Divider,
} from 'react-native-paper';
import { useQuery, useMutation, useSubscription } from '@apollo/client';
import { showMessage } from 'react-native-flash-message';

// Queries and Types
import { 
  GET_ALERTS_LIST,
  ACKNOWLEDGE_ALERT_MOBILE,
  RESOLVE_ALERT_MOBILE,
  ALERTS_CHANGED,
} from '@/services/queries';
import { AlertsStackParamList } from '@/navigation/AppNavigator';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

// Components
import AlertListItem from '@/components/AlertListItem';
import ErrorState from '@/components/ErrorState';

type Props = NativeStackScreenProps<AlertsStackParamList, 'AlertsList'>;

const severityFilters = [
  { label: 'All', value: 'ALL' },
  { label: 'Critical', value: 'CRITICAL' },
  { label: 'High', value: 'HIGH' },
  { label: 'Medium', value: 'MEDIUM' },
];

const statusFilters = [
  { label: 'Active', value: 'ACTIVE' },
  { label: 'All', value: 'ALL' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Acknowledged', value: 'ACKNOWLEDGED' },
];

export default function AlertsScreen({ navigation }: Props) {
  const theme = useTheme();
  
  const [refreshing, setRefreshing] = useState(false);
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');

  // Alerts query
  const { data, loading, error, refetch } = useQuery(GET_ALERTS_LIST, {
    variables: {
      severity: severityFilter === 'ALL' ? undefined : severityFilter,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      limit: 50,
    },
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });

  // Real-time alert updates
  useSubscription(ALERTS_CHANGED, {
    onSubscriptionData: ({ subscriptionData }) => {
      if (subscriptionData.data?.alertsChanged) {
        refetch();
      }
    },
  });

  // Mutations
  const [acknowledgeAlert] = useMutation(ACKNOWLEDGE_ALERT_MOBILE);
  const [resolveAlert] = useMutation(RESOLVE_ALERT_MOBILE);

  // Group alerts by severity for stats
  const alertStats = useMemo(() => {
    if (!data?.alerts) return { critical: 0, high: 0, medium: 0, low: 0 };
    
    return data.alerts.reduce((acc, alert) => {
      switch (alert.severity) {
        case 'CRITICAL':
          acc.critical++;
          break;
        case 'HIGH':
          acc.high++;
          break;
        case 'MEDIUM':
          acc.medium++;
          break;
        case 'LOW':
          acc.low++;
          break;
      }
      return acc;
    }, { critical: 0, high: 0, medium: 0, low: 0 });
  }, [data?.alerts]);

  // Refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  // Alert actions
  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await acknowledgeAlert({
        variables: { 
          alertId, 
          userId: 'mobile-user' // In real app, get from auth context
        },
      });
      
      showMessage({
        message: 'Alert Acknowledged',
        type: 'success',
        duration: 2000,
      });
      
      refetch();
    } catch (error) {
      showMessage({
        message: 'Failed to Acknowledge Alert',
        description: error.message,
        type: 'danger',
      });
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      await resolveAlert({
        variables: { 
          alertId, 
          userId: 'mobile-user' // In real app, get from auth context
        },
      });
      
      showMessage({
        message: 'Alert Resolved',
        type: 'success',
        duration: 2000,
      });
      
      refetch();
    } catch (error) {
      showMessage({
        message: 'Failed to Resolve Alert',
        description: error.message,
        type: 'danger',
      });
    }
  };

  // Navigate to alert detail
  const navigateToAlert = (alertId: string) => {
    navigation.navigate('AlertDetail', { alertId });
  };

  // Navigate to service detail
  const navigateToService = (serviceId: string) => {
    navigation.navigate('ServiceDetail', { serviceId });
  };

  const renderAlert = ({ item, index }) => (
    <>
      <AlertListItem
        alert={item}
        onPress={() => navigateToAlert(item.id)}
      />
      {index < data.alerts.length - 1 && <Divider style={styles.divider} />}
    </>
  );

  if (error && !data) {
    return (
      <ErrorState
        title="Unable to Load Alerts"
        description="Check your connection and try again"
        onRetry={() => refetch()}
        showRetry
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          Alerts
        </Text>
        
        {data && (
          <View style={styles.statsContainer}>
            {alertStats.critical > 0 && (
              <Chip
                mode="flat"
                compact
                textStyle={{ color: theme.colors.error, fontSize: 10 }}
                style={[styles.statChip, { backgroundColor: theme.colors.error + '20' }]}
              >
                {alertStats.critical} Critical
              </Chip>
            )}
            {alertStats.high > 0 && (
              <Chip
                mode="flat"
                compact
                textStyle={{ color: theme.colors.error, fontSize: 10 }}
                style={[styles.statChip, { backgroundColor: theme.colors.error + '20' }]}
              >
                {alertStats.high} High
              </Chip>
            )}
            {alertStats.medium > 0 && (
              <Chip
                mode="flat"
                compact
                textStyle={{ color: theme.colors.warning || '#f59e0b', fontSize: 10 }}
                style={[styles.statChip, { backgroundColor: (theme.colors.warning || '#f59e0b') + '20' }]}
              >
                {alertStats.medium} Medium
              </Chip>
            )}
          </View>
        )}
      </View>

      {/* Status Filter */}
      <View style={styles.statusFilterContainer}>
        <SegmentedButtons
          value={statusFilter}
          onValueChange={setStatusFilter}
          buttons={statusFilters}
          style={styles.segmentedButtons}
        />
      </View>

      {/* Severity Filter */}
      <View style={styles.severityFilterContainer}>
        <SegmentedButtons
          value={severityFilter}
          onValueChange={setSeverityFilter}
          buttons={severityFilters}
          style={styles.segmentedButtons}
        />
      </View>

      {/* Loading */}
      {loading && !data && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="bodyMedium" style={styles.loadingText}>
            Loading alerts...
          </Text>
        </View>
      )}

      {/* Alerts List */}
      {data?.alerts ? (
        data.alerts.length > 0 ? (
          <FlatList
            data={data.alerts}
            renderItem={renderAlert}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.colors.primary}
                colors={[theme.colors.primary]}
              />
            }
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text variant="bodyLarge" style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
              No alerts found
            </Text>
            <Text variant="bodyMedium" style={[styles.emptySubtext, { color: theme.colors.onSurfaceVariant }]}>
              {statusFilter === 'ACTIVE' 
                ? 'All systems are running smoothly'
                : 'Try adjusting your filter criteria'
              }
            </Text>
          </View>
        )
      ) : null}

      {/* Floating Action Button */}
      <FAB
        icon="refresh"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={onRefresh}
        loading={refreshing || loading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontWeight: '600',
    marginBottom: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  statChip: {
    marginRight: 0,
  },
  statusFilterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  severityFilterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  segmentedButtons: {
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 80, // Space for FAB
  },
  divider: {
    marginVertical: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    textAlign: 'center',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});
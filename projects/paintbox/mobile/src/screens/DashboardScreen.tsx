/**
 * Dashboard Screen - Main system overview
 * Features:
 * - System health summary
 * - Service status grid
 * - Active alerts
 * - Performance metrics
 * - Pull to refresh
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  Dimensions,
  StyleSheet,
} from 'react-native';
import {
  Card,
  Text,
  useTheme,
  ActivityIndicator,
  Chip,
  IconButton,
} from 'react-native-paper';
import { useQuery, useSubscription } from '@apollo/client';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FlatGrid } from 'react-native-super-grid';
import { showMessage } from 'react-native-flash-message';

// Queries and Types
import { GET_DASHBOARD_DATA, SYSTEM_HEALTH_UPDATES } from '@/services/queries';
import { DashboardStackParamList } from '@/navigation/AppNavigator';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

// Components
import ServiceStatusCard from '@/components/ServiceStatusCard';
import SystemHealthCard from '@/components/SystemHealthCard';
import AlertSummaryCard from '@/components/AlertSummaryCard';
import MetricsOverviewCard from '@/components/MetricsOverviewCard';
import ErrorState from '@/components/ErrorState';

type Props = NativeStackScreenProps<DashboardStackParamList, 'DashboardMain'>;

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation }: Props) {
  const theme = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  // Main dashboard data query
  const { data, loading, error, refetch, networkStatus } = useQuery(GET_DASHBOARD_DATA, {
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
    notifyOnNetworkStatusChange: true,
  });

  // Real-time system health updates
  useSubscription(SYSTEM_HEALTH_UPDATES, {
    onSubscriptionData: ({ subscriptionData }) => {
      if (subscriptionData.data?.systemAnalysisUpdated) {
        const analysis = subscriptionData.data.systemAnalysisUpdated;

        // Show notification for critical health changes
        if (analysis.overallHealth === 'UNHEALTHY') {
          showMessage({
            message: 'System Health Alert',
            description: `Health score: ${analysis.healthScore}%`,
            type: 'danger',
            icon: 'auto',
          });
        }
      }
    },
  });

  // Refresh screen when focused
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  // Pull to refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
      showMessage({
        message: 'Dashboard Refreshed',
        type: 'success',
        duration: 2000,
      });
    } catch (error) {
      showMessage({
        message: 'Refresh Failed',
        description: 'Unable to fetch latest data',
        type: 'danger',
      });
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  // Navigate to service detail
  const navigateToService = (serviceId: string) => {
    navigation.navigate('ServiceDetail', { serviceId });
  };

  // Navigate to alerts
  const navigateToAlerts = () => {
    navigation.navigate('Alerts' as any);
  };

  // Error state
  if (error && !data) {
    return (
      <ErrorState
        title="Unable to Load Dashboard"
        description="Check your connection and try again"
        onRetry={() => refetch()}
        showRetry
      />
    );
  }

  const { services = [], alerts = [], systemAnalysis } = data || {};

  // Filter services by status for grid display
  const healthyServices = services.filter(s => s.status === 'HEALTHY');
  const degradedServices = services.filter(s => s.status === 'DEGRADED');
  const unhealthyServices = services.filter(s => s.status === 'UNHEALTHY');
  const unknownServices = services.filter(s => s.status === 'UNKNOWN');

  const servicesByStatus = [
    { status: 'HEALTHY', services: healthyServices, color: theme.colors.success },
    { status: 'DEGRADED', services: degradedServices, color: theme.colors.warning },
    { status: 'UNHEALTHY', services: unhealthyServices, color: theme.colors.error },
    { status: 'UNKNOWN', services: unknownServices, color: theme.colors.onSurfaceVariant },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.colors.primary}
          colors={[theme.colors.primary]}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text variant="headlineMedium" style={styles.title}>
            System Dashboard
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {new Date().toLocaleString()}
          </Text>
        </View>

        <IconButton
          icon="refresh"
          size={24}
          iconColor={theme.colors.primary}
          onPress={onRefresh}
          disabled={loading || refreshing}
        />
      </View>

      {/* Loading indicator */}
      {loading && !data && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="bodyMedium" style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>
            Loading dashboard...
          </Text>
        </View>
      )}

      {data && (
        <>
          {/* System Health Overview */}
          {systemAnalysis && (
            <SystemHealthCard
              analysis={systemAnalysis}
              onPress={() => navigation.navigate('Metrics', { serviceId: 'system' })}
            />
          )}

          {/* Active Alerts Summary */}
          {alerts.length > 0 && (
            <AlertSummaryCard
              alerts={alerts}
              onPress={navigateToAlerts}
            />
          )}

          {/* Service Status Overview */}
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <Text variant="titleMedium">Service Status</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {services.length} total services
                </Text>
              </View>

              <View style={styles.statusChips}>
                {servicesByStatus.map(({ status, services, color }) => (
                  <Chip
                    key={status}
                    mode="outlined"
                    style={[styles.statusChip, { borderColor: color }]}
                    textStyle={{ color }}
                    compact
                  >
                    {services.length} {status.toLowerCase()}
                  </Chip>
                ))}
              </View>
            </Card.Content>
          </Card>

          {/* Services Grid */}
          <View style={styles.servicesSection}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Services
            </Text>

            <FlatGrid
              itemDimension={width > 600 ? 180 : 150}
              data={services}
              style={styles.grid}
              spacing={12}
              renderItem={({ item }) => (
                <ServiceStatusCard
                  service={item}
                  onPress={() => navigateToService(item.id)}
                />
              )}
              scrollEnabled={false}
            />
          </View>

          {/* Performance Metrics Overview */}
          {systemAnalysis?.resourceUtilization && (
            <MetricsOverviewCard
              resourceUtilization={systemAnalysis.resourceUtilization}
              onPress={() => navigation.navigate('Metrics', { serviceId: 'system' })}
            />
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontWeight: '600',
    marginBottom: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
  },
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusChip: {
    marginRight: 4,
    marginBottom: 4,
  },
  servicesSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: '600',
  },
  grid: {
    flexGrow: 0,
  },
});

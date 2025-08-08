/**
 * Service Detail Screen - Comprehensive service information
 * Features:
 * - Service status and health information
 * - Container and process details
 * - Active alerts
 * - Quick actions (restart, scale, health check)
 * - Metrics overview
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  Text,
  useTheme,
  ActivityIndicator,
  Card,
  Chip,
  Button,
  FAB,
  Divider,
  List,
} from 'react-native-paper';
import { useQuery, useMutation, useSubscription } from '@apollo/client';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { showMessage } from 'react-native-flash-message';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// Queries and Mutations
import {
  GET_SERVICE_DETAIL,
  TRIGGER_HEALTH_CHECK_MOBILE,
  RESTART_SERVICE_MOBILE,
  SERVICE_STATUS_UPDATES,
} from '@/services/queries';
import { DashboardStackParamList } from '@/navigation/AppNavigator';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

// Components
import ErrorState from '@/components/ErrorState';
import ServiceStatusBadge from '@/components/ServiceStatusBadge';
import ContainerCard from '@/components/ContainerCard';
import ProcessCard from '@/components/ProcessCard';
import AlertListItem from '@/components/AlertListItem';

type Props = NativeStackScreenProps<DashboardStackParamList, 'ServiceDetail'>;

export default function ServiceDetailScreen({ route, navigation }: Props) {
  const theme = useTheme();
  const { serviceId } = route.params;

  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Service detail query
  const { data, loading, error, refetch } = useQuery(GET_SERVICE_DETAIL, {
    variables: { id: serviceId },
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });

  // Real-time service status updates
  useSubscription(SERVICE_STATUS_UPDATES, {
    variables: { serviceId },
    onSubscriptionData: ({ subscriptionData }) => {
      if (subscriptionData.data?.serviceStatusChanged) {
        const update = subscriptionData.data.serviceStatusChanged;
        showMessage({
          message: `${update.service.name} Status Changed`,
          description: `${update.previousStatus} → ${update.currentStatus}`,
          type: update.currentStatus === 'HEALTHY' ? 'success' : 'warning',
          duration: 3000,
        });
        refetch();
      }
    },
  });

  // Mutations
  const [triggerHealthCheck] = useMutation(TRIGGER_HEALTH_CHECK_MOBILE);
  const [restartService] = useMutation(RESTART_SERVICE_MOBILE);

  // Refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
      showMessage({
        message: 'Service Details Refreshed',
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

  // Quick Actions
  const handleHealthCheck = async () => {
    try {
      setActionLoading('healthCheck');
      ReactNativeHapticFeedback.trigger('impactMedium');

      const { data } = await triggerHealthCheck({
        variables: { serviceId },
      });

      if (data?.triggerHealthCheck) {
        showMessage({
          message: 'Health Check Triggered',
          description: `Status: ${data.triggerHealthCheck.status}`,
          type: data.triggerHealthCheck.status === 'HEALTHY' ? 'success' : 'warning',
        });
        refetch();
      }
    } catch (error) {
      showMessage({
        message: 'Health Check Failed',
        description: error.message,
        type: 'danger',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestart = () => {
    Alert.alert(
      'Restart Service',
      `Are you sure you want to restart ${data?.service?.name}? This may cause temporary downtime.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Restart', style: 'destructive', onPress: confirmRestart },
      ]
    );
  };

  const confirmRestart = async () => {
    try {
      setActionLoading('restart');
      ReactNativeHapticFeedback.trigger('impactHeavy');

      const { data: result } = await restartService({
        variables: { serviceId },
      });

      if (result?.restartService) {
        showMessage({
          message: result.restartService.success ? 'Service Restarted' : 'Restart Failed',
          description: result.restartService.message,
          type: result.restartService.success ? 'success' : 'danger',
        });
        if (result.restartService.success) {
          setTimeout(() => refetch(), 2000); // Refetch after restart
        }
      }
    } catch (error) {
      showMessage({
        message: 'Restart Failed',
        description: error.message,
        type: 'danger',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const navigateToMetrics = () => {
    navigation.navigate('Metrics', { serviceId });
  };

  if (error && !data) {
    return (
      <ErrorState
        title="Unable to Load Service"
        description="Check your connection and try again"
        onRetry={() => refetch()}
        showRetry
      />
    );
  }

  if (loading && !data) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text variant="bodyMedium" style={styles.loadingText}>
          Loading service details...
        </Text>
      </View>
    );
  }

  const service = data?.service;
  if (!service) {
    return (
      <ErrorState
        title="Service Not Found"
        description="The requested service could not be found"
        icon="server-off"
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
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
        {/* Service Header */}
        <Card style={styles.headerCard} mode="outlined">
          <Card.Content style={styles.headerContent}>
            <View style={styles.serviceHeader}>
              <View style={styles.serviceInfo}>
                <Text variant="headlineSmall" style={styles.serviceName}>
                  {service.displayName || service.name}
                </Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  {service.description || 'No description available'}
                </Text>
              </View>
              <ServiceStatusBadge status={service.status} size="large" />
            </View>

            {/* Service Metadata */}
            <View style={styles.metadataContainer}>
              <View style={styles.metadataRow}>
                <View style={styles.metadataItem}>
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Environment
                  </Text>
                  <Chip mode="outlined" compact style={styles.chip}>
                    {service.environment.toUpperCase()}
                  </Chip>
                </View>

                {service.version && (
                  <View style={styles.metadataItem}>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      Version
                    </Text>
                    <Text variant="labelMedium" style={styles.metadataValue}>
                      {service.version}
                    </Text>
                  </View>
                )}
              </View>

              {service.lastHealthCheck && (
                <View style={styles.metadataRow}>
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Last health check: {formatDistanceToNow(new Date(service.lastHealthCheck), { addSuffix: true })}
                  </Text>
                </View>
              )}

              {service.uptime && (
                <View style={styles.metadataRow}>
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Uptime: {service.uptime}
                  </Text>
                </View>
              )}
            </View>

            {/* Tags */}
            {service.tags.length > 0 && (
              <View style={styles.tagsContainer}>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
                  Tags
                </Text>
                <View style={styles.tags}>
                  {service.tags.map((tag, index) => (
                    <Chip key={index} mode="outlined" compact style={styles.tagChip}>
                      {tag}
                    </Chip>
                  ))}
                </View>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Quick Actions */}
        <Card style={styles.actionsCard} mode="outlined">
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Quick Actions
            </Text>

            <View style={styles.actionButtons}>
              <Button
                mode="contained"
                onPress={handleHealthCheck}
                loading={actionLoading === 'healthCheck'}
                disabled={!!actionLoading}
                icon="heart-pulse"
                style={styles.actionButton}
                contentStyle={styles.actionButtonContent}
              >
                Health Check
              </Button>

              <Button
                mode="contained-tonal"
                onPress={handleRestart}
                loading={actionLoading === 'restart'}
                disabled={!!actionLoading}
                icon="restart"
                style={styles.actionButton}
                contentStyle={styles.actionButtonContent}
              >
                Restart
              </Button>

              <Button
                mode="outlined"
                onPress={navigateToMetrics}
                disabled={!!actionLoading}
                icon="chart-line"
                style={styles.actionButton}
                contentStyle={styles.actionButtonContent}
              >
                Metrics
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* Active Alerts */}
        {service.alerts && service.alerts.length > 0 && (
          <Card style={styles.alertsCard} mode="outlined">
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Active Alerts ({service.alerts.length})
              </Text>

              {service.alerts.slice(0, 5).map((alert, index) => (
                <React.Fragment key={alert.id}>
                  <AlertListItem alert={alert} />
                  {index < service.alerts.length - 1 && <Divider style={styles.divider} />}
                </React.Fragment>
              ))}

              {service.alerts.length > 5 && (
                <Button
                  mode="text"
                  onPress={() => navigation.navigate('Alerts' as any)}
                  style={styles.viewAllButton}
                >
                  View All {service.alerts.length} Alerts
                </Button>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Containers */}
        {service.containers && service.containers.length > 0 && (
          <Card style={styles.containersCard} mode="outlined">
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Containers ({service.containers.length})
              </Text>

              {service.containers.map((container, index) => (
                <React.Fragment key={container.id}>
                  <ContainerCard container={container} />
                  {index < service.containers.length - 1 && <Divider style={styles.divider} />}
                </React.Fragment>
              ))}
            </Card.Content>
          </Card>
        )}

        {/* Processes */}
        {service.processes && service.processes.length > 0 && (
          <Card style={styles.processesCard} mode="outlined">
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Processes ({service.processes.length})
              </Text>

              {service.processes.slice(0, 5).map((process, index) => (
                <React.Fragment key={process.id}>
                  <ProcessCard process={process} />
                  {index < Math.min(service.processes.length - 1, 4) && <Divider style={styles.divider} />}
                </React.Fragment>
              ))}

              {service.processes.length > 5 && (
                <Text
                  variant="labelMedium"
                  style={[styles.moreText, { color: theme.colors.onSurfaceVariant }]}
                >
                  +{service.processes.length - 5} more processes
                </Text>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Dependencies */}
        {service.dependencies && service.dependencies.length > 0 && (
          <Card style={styles.dependenciesCard} mode="outlined">
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Dependencies ({service.dependencies.length})
              </Text>

              {service.dependencies.map((dep, index) => (
                <List.Item
                  key={dep.id}
                  title={dep.dependsOn.displayName || dep.dependsOn.name}
                  description={dep.type.toLowerCase().replace('_', ' ')}
                  left={() => (
                    <View style={styles.dependencyIcon}>
                      <MaterialCommunityIcons
                        name={dep.critical ? 'alert' : 'link'}
                        size={20}
                        color={dep.critical ? theme.colors.error : theme.colors.onSurfaceVariant}
                      />
                    </View>
                  )}
                  right={() => (
                    <ServiceStatusBadge status={dep.dependsOn.status} size="small" />
                  )}
                />
              ))}
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <FAB
        icon="refresh"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={onRefresh}
        loading={refreshing}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
  },
  headerCard: {
    margin: 16,
    marginBottom: 8,
    elevation: 2,
  },
  headerContent: {
    padding: 16,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  serviceInfo: {
    flex: 1,
    marginRight: 16,
  },
  serviceName: {
    fontWeight: '600',
    marginBottom: 4,
  },
  metadataContainer: {
    marginBottom: 16,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metadataItem: {
    alignItems: 'flex-start',
  },
  metadataValue: {
    fontWeight: '500',
    marginTop: 2,
  },
  chip: {
    marginTop: 4,
  },
  tagsContainer: {
    marginTop: 8,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagChip: {
    marginRight: 0,
    marginBottom: 0,
  },
  actionsCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    minWidth: 100,
  },
  actionButtonContent: {
    paddingVertical: 4,
  },
  alertsCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    elevation: 2,
  },
  containersCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    elevation: 2,
  },
  processesCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    elevation: 2,
  },
  dependenciesCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
  },
  divider: {
    marginVertical: 8,
  },
  viewAllButton: {
    marginTop: 8,
  },
  moreText: {
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  dependencyIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Alert,
  Dimensions,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Chip,
  Surface,
  Text,
  Button,
  Avatar,
  useTheme,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useSubscription } from '@apollo/client';

// GraphQL queries and subscriptions
import { GET_SECURITY_OVERVIEW } from '@/graphql/queries/security.graphql';
import { SECURITY_ALERTS_SUBSCRIPTION } from '@/graphql/subscriptions/security.graphql';

// Types
import { SecurityOverview, SecurityAlert, ThreatLevel } from '@/types/security';

// Components
import { MetricCard } from '@/components/ui/MetricCard';
import { ThreatLevelIndicator } from '@/components/ui/ThreatLevelIndicator';
import { AlertSummaryCard } from '@/components/ui/AlertSummaryCard';
import { NetworkStatusBar } from '@/components/common/NetworkStatusBar';

// Hooks
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useBiometric } from '@/hooks/useBiometric';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';

const { width: screenWidth } = Dimensions.get('window');

interface DashboardScreenProps {}

export const DashboardScreen: React.FC<DashboardScreenProps> = () => {
  const theme = useTheme();
  const { isConnected } = useNetworkStatus();
  const { isAuthenticated } = useBiometric();
  const { queueSize } = useOfflineQueue();
  
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // GraphQL queries
  const {
    data: securityData,
    loading,
    error,
    refetch,
  } = useQuery<{ securityOverview: SecurityOverview }>(GET_SECURITY_OVERVIEW, {
    errorPolicy: 'cache-first',
    pollInterval: isConnected ? 30000 : 0, // Poll every 30 seconds when online
  });

  // Real-time alerts subscription
  const { data: alertsData } = useSubscription<{ securityAlerts: SecurityAlert[] }>(
    SECURITY_ALERTS_SUBSCRIPTION,
    {
      skip: !isConnected || !isAuthenticated,
      onData: ({ data }) => {
        if (data?.data?.securityAlerts?.length > 0) {
          // Show notification for new high/critical alerts
          const criticalAlerts = data.data.securityAlerts.filter(
            alert => alert.severity === 'CRITICAL' || alert.severity === 'HIGH'
          );
          
          if (criticalAlerts.length > 0) {
            Alert.alert(
              'Critical Security Alert',
              `${criticalAlerts.length} new critical alert(s) detected`,
              [
                {
                  text: 'View Details',
                  onPress: () => {
                    // Navigate to alerts screen
                  },
                },
                { text: 'Dismiss', style: 'cancel' },
              ]
            );
          }
        }
      },
    }
  );

  // Refresh data
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to refresh dashboard:', error);
    }
    setRefreshing(false);
  }, [refetch]);

  // Focus effect to refresh when screen becomes active
  useFocusEffect(
    useCallback(() => {
      onRefresh();
    }, [onRefresh])
  );

  const overview = securityData?.securityOverview;

  // Chart configuration
  const chartConfig = {
    backgroundColor: theme.colors.surface,
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(25, 118, 210, ${opacity})`,
    labelColor: (opacity = 1) => theme.colors.onSurface,
    style: {
      borderRadius: 16,
    },
  };

  // Sample chart data - in real app this would come from GraphQL
  const threatTrendData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        data: overview?.threatTrends || [20, 45, 28, 80, 35, 60, 25],
        color: (opacity = 1) => `rgba(244, 67, 54, ${opacity})`,
        strokeWidth: 3,
      },
    ],
  };

  const incidentTypeData = [
    {
      name: 'Malware',
      count: overview?.incidentsByType?.malware || 12,
      color: '#f44336',
      legendFontColor: theme.colors.onSurface,
    },
    {
      name: 'Phishing',
      count: overview?.incidentsByType?.phishing || 8,
      color: '#ff9800',
      legendFontColor: theme.colors.onSurface,
    },
    {
      name: 'Intrusion',
      count: overview?.incidentsByType?.intrusion || 5,
      color: '#2196f3',
      legendFontColor: theme.colors.onSurface,
    },
    {
      name: 'DDoS',
      count: overview?.incidentsByType?.ddos || 3,
      color: '#9c27b0',
      legendFontColor: theme.colors.onSurface,
    },
  ];

  if (error && !overview) {
    return (
      <SafeAreaView style={styles.container}>
        <NetworkStatusBar />
        <ScrollView
          contentContainerStyle={styles.errorContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={64}
            color={theme.colors.error}
            style={styles.errorIcon}
          />
          <Title>Unable to Load Dashboard</Title>
          <Paragraph style={styles.errorText}>
            {isConnected
              ? 'There was an error loading the security data.'
              : 'You are currently offline. Some features may be limited.'}
          </Paragraph>
          <Button mode="contained" onPress={onRefresh} style={styles.retryButton}>
            Retry
          </Button>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <NetworkStatusBar />
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Title style={styles.title}>Security Overview</Title>
          <Text style={styles.lastUpdated}>
            Last updated: {lastUpdated.toLocaleTimeString()}
          </Text>
          {queueSize > 0 && (
            <Chip mode="outlined" compact style={styles.queueChip}>
              {queueSize} pending sync
            </Chip>
          )}
        </View>

        {/* Key Metrics */}
        <View style={styles.metricsGrid}>
          <MetricCard
            title="Active Threats"
            value={overview?.activeThreats || 0}
            icon="shield-alert"
            color={theme.colors.error}
            trend={overview?.threatTrend}
            loading={loading}
          />
          <MetricCard
            title="Incidents (24h)"
            value={overview?.incidentsLast24h || 0}
            icon="alert-circle"
            color={theme.colors.tertiary}
            trend={overview?.incidentTrend}
            loading={loading}
          />
          <MetricCard
            title="Assets Monitored"
            value={overview?.monitoredAssets || 0}
            icon="server-network"
            color={theme.colors.primary}
            loading={loading}
          />
          <MetricCard
            title="Security Score"
            value={`${overview?.securityScore || 0}%`}
            icon="shield-check"
            color={theme.colors.primary}
            loading={loading}
          />
        </View>

        {/* Threat Level Indicator */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.threatLevelContainer}>
              <Title>Current Threat Level</Title>
              <ThreatLevelIndicator
                level={overview?.currentThreatLevel || 'LOW'}
                size="large"
              />
            </View>
            <Paragraph>
              {getThreatLevelDescription(overview?.currentThreatLevel || 'LOW')}
            </Paragraph>
          </Card.Content>
        </Card>

        {/* Recent Alerts Summary */}
        {overview?.recentAlerts && overview.recentAlerts.length > 0 && (
          <AlertSummaryCard
            alerts={overview.recentAlerts}
            onViewAll={() => {
              // Navigate to alerts screen
            }}
          />
        )}

        {/* Threat Trends Chart */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Threat Activity (7 days)</Title>
            <LineChart
              data={threatTrendData}
              width={screenWidth - 64}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          </Card.Content>
        </Card>

        {/* Incident Types Distribution */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Incident Types Distribution</Title>
            <PieChart
              data={incidentTypeData}
              width={screenWidth - 64}
              height={220}
              chartConfig={chartConfig}
              accessor="count"
              backgroundColor="transparent"
              paddingLeft="15"
              center={[10, 50]}
              absolute
              style={styles.chart}
            />
          </Card.Content>
        </Card>

        {/* Quick Actions */}
        <Card style={[styles.card, styles.lastCard]}>
          <Card.Content>
            <Title>Quick Actions</Title>
            <View style={styles.actionButtons}>
              <Button
                mode="contained"
                icon="plus-circle"
                onPress={() => {
                  // Navigate to create incident
                }}
                style={styles.actionButton}
              >
                New Incident
              </Button>
              <Button
                mode="outlined"
                icon="scan-helper"
                onPress={() => {
                  // Start security scan
                }}
                style={styles.actionButton}
              >
                Run Scan
              </Button>
              <Button
                mode="outlined"
                icon="download"
                onPress={() => {
                  // Export report
                }}
                style={styles.actionButton}
              >
                Export Report
              </Button>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

function getThreatLevelDescription(level: ThreatLevel): string {
  switch (level) {
    case 'CRITICAL':
      return 'Immediate action required. Active threats detected that require urgent response.';
    case 'HIGH':
      return 'Elevated threat level. Multiple security concerns require attention.';
    case 'MEDIUM':
      return 'Moderate threat level. Some security issues identified and being monitored.';
    case 'LOW':
      return 'Low threat level. All systems operating normally with minimal risks.';
    default:
      return 'Threat level unknown. Please check system status.';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  lastUpdated: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 8,
  },
  queueChip: {
    alignSelf: 'flex-start',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  card: {
    margin: 16,
    marginBottom: 8,
    elevation: 2,
  },
  lastCard: {
    marginBottom: 32,
  },
  threatLevelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  chart: {
    marginTop: 16,
    borderRadius: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: 100,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorIcon: {
    marginBottom: 16,
  },
  errorText: {
    textAlign: 'center',
    marginVertical: 16,
    opacity: 0.7,
  },
  retryButton: {
    marginTop: 16,
  },
});

export default DashboardScreen;
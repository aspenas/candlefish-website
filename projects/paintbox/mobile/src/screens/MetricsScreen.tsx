/**
 * Metrics Screen - Service and system metrics visualization
 * Features:
 * - Real-time charts optimized for mobile
 * - Time range selection
 * - Metric type filtering
 * - Offline support
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
  Text,
  useTheme,
  ActivityIndicator,
  SegmentedButtons,
  Card,
  Chip,
  FAB,
} from 'react-native-paper';
import { useQuery } from '@apollo/client';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart, BarChart, ProgressChart } from 'react-native-chart-kit';
import { format, subHours, subDays, subWeeks } from 'date-fns';

// Queries and Types
import { GET_METRIC_SERIES_MOBILE, GET_SYSTEM_HEALTH_SUMMARY } from '@/services/queries';
import { DashboardStackParamList } from '@/navigation/AppNavigator';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

// Components
import ErrorState from '@/components/ErrorState';
import MetricCard from '@/components/MetricCard';

type Props = NativeStackScreenProps<DashboardStackParamList, 'Metrics'>;

const { width } = Dimensions.get('window');
const chartWidth = width - 32; // Account for padding

const timeRanges = [
  { label: '1H', value: '1h', hours: 1 },
  { label: '6H', value: '6h', hours: 6 },
  { label: '24H', value: '24h', hours: 24 },
  { label: '7D', value: '7d', hours: 168 },
];

const metricTypes = [
  { label: 'CPU', value: 'cpu', icon: 'cpu-64-bit' },
  { label: 'Memory', value: 'memory', icon: 'memory' },
  { label: 'Disk', value: 'disk', icon: 'harddisk' },
  { label: 'Network', value: 'network', icon: 'network' },
];

export default function MetricsScreen({ route, navigation }: Props) {
  const theme = useTheme();
  const { serviceId } = route.params;

  const [selectedTimeRange, setSelectedTimeRange] = useState('6h');
  const [selectedMetric, setSelectedMetric] = useState('cpu');
  const [refreshing, setRefreshing] = useState(false);

  // Get time range for query
  const getTimeRange = useCallback(() => {
    const range = timeRanges.find(r => r.value === selectedTimeRange);
    const now = new Date();
    const start = subHours(now, range?.hours || 6);

    return {
      start: start.toISOString(),
      end: now.toISOString(),
      duration: `${range?.hours || 6}h`,
    };
  }, [selectedTimeRange]);

  // Metrics data query
  const { data: metricsData, loading: metricsLoading, error: metricsError, refetch: refetchMetrics } = useQuery(
    GET_METRIC_SERIES_MOBILE,
    {
      variables: {
        serviceId,
        metricName: selectedMetric,
        timeRange: getTimeRange(),
        aggregation: 'AVG',
      },
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all',
      skip: !serviceId || serviceId === 'system',
    }
  );

  // System health query (for system-wide metrics)
  const { data: systemData, loading: systemLoading, error: systemError, refetch: refetchSystem } = useQuery(
    GET_SYSTEM_HEALTH_SUMMARY,
    {
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all',
      skip: serviceId !== 'system',
    }
  );

  const loading = serviceId === 'system' ? systemLoading : metricsLoading;
  const error = serviceId === 'system' ? systemError : metricsError;
  const data = serviceId === 'system' ? systemData : metricsData;

  // Refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (serviceId === 'system') {
        await refetchSystem();
      } else {
        await refetchMetrics();
      }
    } finally {
      setRefreshing(false);
    }
  }, [serviceId, refetchSystem, refetchMetrics]);

  // Chart configuration
  const chartConfig = {
    backgroundColor: theme.colors.surface,
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`, // Primary blue
    strokeWidth: 2,
    barPercentage: 0.7,
    decimalPlaces: 1,
    style: {
      borderRadius: 12,
    },
    propsForLabels: {
      fontSize: 12,
      fontWeight: '500',
    },
    propsForVerticalLabels: {
      fontSize: 10,
    },
    propsForHorizontalLabels: {
      fontSize: 10,
    },
  };

  // Prepare chart data
  const prepareChartData = () => {
    if (serviceId === 'system' && systemData?.systemAnalysis) {
      const analysis = systemData.systemAnalysis;
      const resource = analysis.resourceUtilization[selectedMetric];

      // Mock time series data for system metrics
      const mockDataPoints = Array.from({ length: 12 }, (_, i) => ({
        timestamp: subHours(new Date(), 11 - i).toISOString(),
        value: resource.current + (Math.random() - 0.5) * 20, // Simulate variance
      }));

      return {
        labels: mockDataPoints.map((_, i) => {
          if (i % 3 === 0) { // Show every 3rd label to avoid crowding
            return format(subHours(new Date(), 11 - i), 'HH:mm');
          }
          return '';
        }),
        datasets: [{
          data: mockDataPoints.map(p => Math.max(0, Math.min(100, p.value))),
          color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
          strokeWidth: 2,
        }],
      };
    }

    if (metricsData?.metricSeries) {
      const series = metricsData.metricSeries;
      const points = series.dataPoints.slice(-20); // Show last 20 points

      return {
        labels: points.map((point, i) => {
          if (i % 4 === 0) { // Show every 4th label
            return format(new Date(point.timestamp), 'HH:mm');
          }
          return '';
        }),
        datasets: [{
          data: points.map(p => p.value),
          color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
          strokeWidth: 2,
        }],
      };
    }

    return null;
  };

  const chartData = prepareChartData();

  // Current metric value
  const getCurrentValue = () => {
    if (serviceId === 'system' && systemData?.systemAnalysis) {
      const resource = systemData.systemAnalysis.resourceUtilization[selectedMetric];
      return {
        current: resource.current,
        average: resource.average,
        trend: resource.trend,
        unit: '%',
      };
    }

    if (metricsData?.metricSeries) {
      const series = metricsData.metricSeries;
      const latest = series.dataPoints[series.dataPoints.length - 1];
      const values = series.dataPoints.map(p => p.value);
      const average = values.reduce((a, b) => a + b, 0) / values.length;

      return {
        current: latest?.value || 0,
        average,
        trend: 'STABLE', // Would need to calculate from data
        unit: series.unit || '%',
      };
    }

    return null;
  };

  const currentValue = getCurrentValue();

  if (error && !data) {
    return (
      <ErrorState
        title="Unable to Load Metrics"
        description="Check your connection and try again"
        onRetry={onRefresh}
        showRetry
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
        {/* Header */}
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.title}>
            {serviceId === 'system' ? 'System Metrics' : 'Service Metrics'}
          </Text>

          {serviceId !== 'system' && metricsData?.metricSeries?.service && (
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {metricsData.metricSeries.service.displayName || metricsData.metricSeries.service.name}
            </Text>
          )}
        </View>

        {/* Time Range Selection */}
        <View style={styles.timeRangeContainer}>
          <SegmentedButtons
            value={selectedTimeRange}
            onValueChange={setSelectedTimeRange}
            buttons={timeRanges.map(range => ({
              value: range.value,
              label: range.label,
            }))}
            style={styles.segmentedButtons}
          />
        </View>

        {/* Metric Type Selection */}
        <View style={styles.metricTypesContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.metricChips}>
              {metricTypes.map((type) => (
                <Chip
                  key={type.value}
                  selected={selectedMetric === type.value}
                  onPress={() => setSelectedMetric(type.value)}
                  style={styles.metricChip}
                  icon={type.icon}
                >
                  {type.label}
                </Chip>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Current Value Card */}
        {currentValue && (
          <MetricCard
            title={metricTypes.find(m => m.value === selectedMetric)?.label || selectedMetric}
            current={currentValue.current}
            average={currentValue.average}
            trend={currentValue.trend}
            unit={currentValue.unit}
          />
        )}

        {/* Chart */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text variant="bodyMedium" style={styles.loadingText}>
              Loading metrics...
            </Text>
          </View>
        )}

        {chartData && !loading && (
          <Card style={styles.chartCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.chartTitle}>
                {selectedMetric.toUpperCase()} Usage - {selectedTimeRange}
              </Text>

              <View style={styles.chartContainer}>
                <LineChart
                  data={chartData}
                  width={chartWidth - 32}
                  height={220}
                  chartConfig={chartConfig}
                  bezier
                  style={styles.chart}
                  withHorizontalLabels
                  withVerticalLabels
                  withInnerLines={false}
                  withOuterLines={false}
                  withDots={false}
                  fromZero
                />
              </View>
            </Card.Content>
          </Card>
        )}

        {/* System Health Summary (for system metrics) */}
        {serviceId === 'system' && systemData?.systemAnalysis && (
          <Card style={styles.summaryCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.summaryTitle}>
                System Health Summary
              </Text>

              <View style={styles.healthGrid}>
                <View style={styles.healthItem}>
                  <Text variant="labelMedium">Health Score</Text>
                  <Text variant="headlineSmall" style={{ color: theme.colors.primary }}>
                    {systemData.systemAnalysis.healthScore}%
                  </Text>
                </View>

                <View style={styles.healthItem}>
                  <Text variant="labelMedium">Services</Text>
                  <Text variant="headlineSmall">
                    {systemData.systemAnalysis.healthyServices}/{systemData.systemAnalysis.totalServices}
                  </Text>
                </View>

                <View style={styles.healthItem}>
                  <Text variant="labelMedium">Active Alerts</Text>
                  <Text variant="headlineSmall" style={{ color: theme.colors.error }}>
                    {systemData.systemAnalysis.activeAlerts}
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

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
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontWeight: '600',
    marginBottom: 4,
  },
  timeRangeContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  segmentedButtons: {
    backgroundColor: 'transparent',
  },
  metricTypesContainer: {
    paddingBottom: 16,
  },
  metricChips: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  metricChip: {
    marginRight: 0,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
  },
  chartCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
  },
  chartTitle: {
    fontWeight: '600',
    marginBottom: 16,
  },
  chartContainer: {
    alignItems: 'center',
  },
  chart: {
    borderRadius: 8,
  },
  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
  },
  summaryTitle: {
    fontWeight: '600',
    marginBottom: 16,
  },
  healthGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  healthItem: {
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});

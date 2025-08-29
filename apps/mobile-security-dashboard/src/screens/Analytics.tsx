import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Dimensions,
  Alert,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Chip,
  Button,
  Surface,
  Text,
  SegmentedButtons,
  useTheme,
  IconButton,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart, BarChart, PieChart, ProgressChart } from 'react-native-chart-kit';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@apollo/client';
import { format, subDays, subHours, startOfDay, endOfDay } from 'date-fns';

// GraphQL
import {
  GET_SECURITY_ANALYTICS,
  GET_THREAT_TRENDS,
  GET_PERFORMANCE_METRICS,
} from '@/graphql/queries/analytics.graphql';

// Types
import { 
  SecurityAnalytics,
  ThreatTrendData,
  PerformanceMetrics,
  TimeRange,
} from '@/types/analytics';

// Components
import { NetworkStatusBar } from '@/components/common/NetworkStatusBar';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { MetricCard } from '@/components/ui/MetricCard';
import { ExportReportModal } from '@/components/analytics/ExportReportModal';
import { DateRangePickerModal } from '@/components/analytics/DateRangePickerModal';

// Hooks
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';

const { width: screenWidth } = Dimensions.get('window');

interface AnalyticsScreenProps {
  navigation: any;
}

type TimeRangeOption = '24h' | '7d' | '30d' | 'custom';

export const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({ navigation }) => {
  const theme = useTheme();
  const { isConnected } = useNetworkStatus();
  const { queueSize } = useOfflineQueue();

  const [timeRange, setTimeRange] = useState<TimeRangeOption>('7d');
  const [customDateRange, setCustomDateRange] = useState<{
    start: Date;
    end: Date;
  }>({
    start: subDays(new Date(), 7),
    end: new Date(),
  });
  const [refreshing, setRefreshing] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Calculate date range based on selection
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (timeRange) {
      case '24h':
        return {
          start: subHours(now, 24),
          end: now,
        };
      case '7d':
        return {
          start: startOfDay(subDays(now, 7)),
          end: endOfDay(now),
        };
      case '30d':
        return {
          start: startOfDay(subDays(now, 30)),
          end: endOfDay(now),
        };
      case 'custom':
        return customDateRange;
      default:
        return {
          start: startOfDay(subDays(now, 7)),
          end: endOfDay(now),
        };
    }
  }, [timeRange, customDateRange]);

  // GraphQL queries
  const {
    data: analyticsData,
    loading: analyticsLoading,
    error: analyticsError,
    refetch: refetchAnalytics,
  } = useQuery<{ securityAnalytics: SecurityAnalytics }>(GET_SECURITY_ANALYTICS, {
    variables: {
      startDate: dateRange.start,
      endDate: dateRange.end,
    },
    errorPolicy: 'cache-first',
    pollInterval: isConnected ? 300000 : 0, // Poll every 5 minutes
  });

  const {
    data: trendsData,
    loading: trendsLoading,
    refetch: refetchTrends,
  } = useQuery<{ threatTrends: ThreatTrendData }>(GET_THREAT_TRENDS, {
    variables: {
      startDate: dateRange.start,
      endDate: dateRange.end,
      granularity: timeRange === '24h' ? 'HOUR' : 'DAY',
    },
    errorPolicy: 'cache-first',
  });

  const {
    data: performanceData,
    loading: performanceLoading,
    refetch: refetchPerformance,
  } = useQuery<{ performanceMetrics: PerformanceMetrics }>(GET_PERFORMANCE_METRICS, {
    variables: {
      startDate: dateRange.start,
      endDate: dateRange.end,
    },
    errorPolicy: 'cache-first',
  });

  const loading = analyticsLoading || trendsLoading || performanceLoading;
  const analytics = analyticsData?.securityAnalytics;
  const trends = trendsData?.threatTrends;
  const performance = performanceData?.performanceMetrics;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchAnalytics(),
        refetchTrends(),
        refetchPerformance(),
      ]);
    } catch (error) {
      console.error('Failed to refresh analytics:', error);
    }
    setRefreshing(false);
  }, [refetchAnalytics, refetchTrends, refetchPerformance]);

  // Chart configurations
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
    propsForDots: {
      r: "6",
      strokeWidth: "2",
      stroke: "#1976d2"
    }
  };

  // Sample data - replace with real data from GraphQL
  const threatTrendData = {
    labels: trends?.timeline.map(t => 
      format(new Date(t.timestamp), timeRange === '24h' ? 'HH:mm' : 'MMM d')
    ) || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        data: trends?.timeline.map(t => t.threatCount) || [20, 45, 28, 80, 35, 60, 25],
        color: (opacity = 1) => `rgba(244, 67, 54, ${opacity})`,
        strokeWidth: 3,
      },
    ],
  };

  const incidentsByTypeData = [
    {
      name: 'Malware',
      count: analytics?.incidentsByType?.malware || 12,
      color: '#f44336',
      legendFontColor: theme.colors.onSurface,
      legendFontSize: 12,
    },
    {
      name: 'Phishing',
      count: analytics?.incidentsByType?.phishing || 8,
      color: '#ff9800',
      legendFontColor: theme.colors.onSurface,
      legendFontSize: 12,
    },
    {
      name: 'Intrusion',
      count: analytics?.incidentsByType?.intrusion || 5,
      color: '#2196f3',
      legendFontColor: theme.colors.onSurface,
      legendFontSize: 12,
    },
    {
      name: 'DDoS',
      count: analytics?.incidentsByType?.ddos || 3,
      color: '#9c27b0',
      legendFontColor: theme.colors.onSurface,
      legendFontSize: 12,
    },
  ];

  const severityDistributionData = {
    labels: ['Critical', 'High', 'Medium', 'Low'],
    datasets: [
      {
        data: [
          analytics?.severityDistribution?.critical || 5,
          analytics?.severityDistribution?.high || 15,
          analytics?.severityDistribution?.medium || 25,
          analytics?.severityDistribution?.low || 35,
        ],
      },
    ],
  };

  const performanceProgressData = {
    labels: ['Detection Rate', 'Response Time', 'Resolution Rate', 'Availability'],
    data: [
      (performance?.detectionRate || 95) / 100,
      (performance?.responseTimeScore || 88) / 100,
      (performance?.resolutionRate || 92) / 100,
      (performance?.systemAvailability || 99.5) / 100,
    ],
  };

  const renderTimeRangeButtons = () => (
    <View style={styles.timeRangeContainer}>
      <SegmentedButtons
        value={timeRange}
        onValueChange={(value) => setTimeRange(value as TimeRangeOption)}
        buttons={[
          {
            value: '24h',
            label: '24h',
            style: styles.segmentButton,
          },
          {
            value: '7d',
            label: '7d',
            style: styles.segmentButton,
          },
          {
            value: '30d',
            label: '30d',
            style: styles.segmentButton,
          },
          {
            value: 'custom',
            label: 'Custom',
            style: styles.segmentButton,
          },
        ]}
        style={styles.segmentedButtons}
      />
      
      {timeRange === 'custom' && (
        <Button
          mode="outlined"
          icon="calendar-range"
          onPress={() => setShowDatePicker(true)}
          style={styles.dateButton}
          compact
        >
          {format(dateRange.start, 'MMM d')} - {format(dateRange.end, 'MMM d')}
        </Button>
      )}
    </View>
  );

  if (loading && !analytics) {
    return (
      <SafeAreaView style={styles.container}>
        <NetworkStatusBar />
        <LoadingSpinner text="Loading analytics..." />
      </SafeAreaView>
    );
  }

  if (analyticsError && !analytics) {
    return (
      <SafeAreaView style={styles.container}>
        <NetworkStatusBar />
        <EmptyState
          icon="chart-line"
          title="Unable to Load Analytics"
          description={
            isConnected
              ? 'There was an error loading the analytics data.'
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
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Title style={styles.title}>Security Analytics</Title>
            <IconButton
              icon="download"
              mode="outlined"
              onPress={() => setShowExportModal(true)}
              style={styles.exportButton}
            />
          </View>

          {queueSize > 0 && (
            <Chip mode="outlined" compact style={styles.queueChip}>
              {queueSize} pending sync
            </Chip>
          )}

          {renderTimeRangeButtons()}
        </View>

        {/* Key Metrics */}
        <View style={styles.metricsGrid}>
          <MetricCard
            title="Total Threats"
            value={analytics?.totalThreats || 0}
            icon="shield-alert"
            color={theme.colors.error}
            trend={analytics?.threatTrend}
            loading={loading}
          />
          <MetricCard
            title="Incidents Resolved"
            value={analytics?.resolvedIncidents || 0}
            icon="check-circle"
            color={theme.colors.primary}
            trend={analytics?.resolutionTrend}
            loading={loading}
          />
          <MetricCard
            title="Avg Response Time"
            value={`${analytics?.avgResponseTime || 0}m`}
            icon="timer"
            color={theme.colors.tertiary}
            trend={analytics?.responseTimeTrend}
            loading={loading}
          />
          <MetricCard
            title="Security Score"
            value={`${analytics?.securityScore || 0}%`}
            icon="shield-check"
            color={theme.colors.primary}
            trend={analytics?.scoreTrend}
            loading={loading}
          />
        </View>

        {/* Threat Activity Trends */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Threat Activity Over Time</Title>
            <Paragraph style={styles.chartSubtitle}>
              Number of threats detected in the selected time period
            </Paragraph>
            <LineChart
              data={threatTrendData}
              width={screenWidth - 64}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              withDots
              withShadow
              withScrollableDot
            />
          </Card.Content>
        </Card>

        {/* Incident Types Distribution */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Incident Types Distribution</Title>
            <Paragraph style={styles.chartSubtitle}>
              Breakdown of security incidents by category
            </Paragraph>
            <PieChart
              data={incidentsByTypeData}
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

        {/* Severity Distribution */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Alert Severity Distribution</Title>
            <Paragraph style={styles.chartSubtitle}>
              Distribution of alerts by severity level
            </Paragraph>
            <BarChart
              data={severityDistributionData}
              width={screenWidth - 64}
              height={220}
              yAxisLabel=""
              yAxisSuffix=""
              chartConfig={chartConfig}
              style={styles.chart}
              showBarTops={false}
              fromZero
            />
          </Card.Content>
        </Card>

        {/* Performance Metrics */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>System Performance</Title>
            <Paragraph style={styles.chartSubtitle}>
              Key performance indicators for security operations
            </Paragraph>
            <ProgressChart
              data={performanceProgressData}
              width={screenWidth - 64}
              height={220}
              strokeWidth={16}
              radius={32}
              chartConfig={chartConfig}
              hideLegend={false}
              style={styles.chart}
            />
            
            {/* Performance Details */}
            <View style={styles.performanceDetails}>
              <View style={styles.performanceRow}>
                <View style={styles.performanceItem}>
                  <Text style={styles.performanceLabel}>Detection Rate</Text>
                  <Text style={styles.performanceValue}>
                    {performance?.detectionRate || 95}%
                  </Text>
                </View>
                <View style={styles.performanceItem}>
                  <Text style={styles.performanceLabel}>Response Time</Text>
                  <Text style={styles.performanceValue}>
                    {performance?.avgResponseTimeMinutes || 12}min
                  </Text>
                </View>
              </View>
              <View style={styles.performanceRow}>
                <View style={styles.performanceItem}>
                  <Text style={styles.performanceLabel}>Resolution Rate</Text>
                  <Text style={styles.performanceValue}>
                    {performance?.resolutionRate || 92}%
                  </Text>
                </View>
                <View style={styles.performanceItem}>
                  <Text style={styles.performanceLabel}>Uptime</Text>
                  <Text style={styles.performanceValue}>
                    {performance?.systemAvailability || 99.5}%
                  </Text>
                </View>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Top Threats */}
        {analytics?.topThreats && analytics.topThreats.length > 0 && (
          <Card style={[styles.card, styles.lastCard]}>
            <Card.Content>
              <Title>Top Threat Sources</Title>
              <Paragraph style={styles.chartSubtitle}>
                Most active threat sources in the selected period
              </Paragraph>
              
              {analytics.topThreats.map((threat, index) => (
                <View key={index} style={styles.threatItem}>
                  <View style={styles.threatRank}>
                    <Text style={styles.threatRankText}>{index + 1}</Text>
                  </View>
                  <View style={styles.threatInfo}>
                    <Text style={styles.threatName}>{threat.name}</Text>
                    <Text style={styles.threatDescription}>{threat.description}</Text>
                  </View>
                  <View style={styles.threatCount}>
                    <Text style={styles.threatCountText}>{threat.count}</Text>
                    <Text style={styles.threatCountLabel}>incidents</Text>
                  </View>
                </View>
              ))}
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      {/* Export Modal */}
      <ExportReportModal
        visible={showExportModal}
        onDismiss={() => setShowExportModal(false)}
        dateRange={dateRange}
        analytics={analytics}
      />

      {/* Date Range Picker */}
      <DateRangePickerModal
        visible={showDatePicker}
        onDismiss={() => setShowDatePicker(false)}
        initialRange={customDateRange}
        onConfirm={(range) => {
          setCustomDateRange(range);
          setShowDatePicker(false);
        }}
      />
    </SafeAreaView>
  );
};

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
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  exportButton: {
    margin: 0,
  },
  queueChip: {
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  timeRangeContainer: {
    marginBottom: 8,
  },
  segmentedButtons: {
    marginBottom: 8,
  },
  segmentButton: {
    minWidth: 60,
  },
  dateButton: {
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
  chartSubtitle: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 16,
  },
  chart: {
    marginTop: 8,
    borderRadius: 16,
  },
  performanceDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  performanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  performanceLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
  },
  performanceValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  threatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  threatRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1976d2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  threatRankText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  threatInfo: {
    flex: 1,
  },
  threatName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  threatDescription: {
    fontSize: 12,
    opacity: 0.7,
  },
  threatCount: {
    alignItems: 'center',
  },
  threatCountText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d32f2f',
  },
  threatCountLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
});

export default AnalyticsScreen;
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart, BarChart, PieChart, ProgressChart } from 'react-native-chart-kit';
import { SecurityTheme } from '../../theme/SecurityTheme';

const { width: screenWidth } = Dimensions.get('window');
const chartWidth = screenWidth - (SecurityTheme.spacing.md * 2);

// Types
interface ThreatData {
  timestamp: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

interface ThreatTypeData {
  type: string;
  count: number;
  percentage: number;
  color: string;
}

interface ThreatActivityChartProps {
  data: ThreatData[];
  type: 'line' | 'bar' | 'pie' | 'progress';
  title: string;
  timeRange: '1h' | '24h' | '7d' | '30d';
  showLegend?: boolean;
  animated?: boolean;
  style?: any;
}

// Chart configuration
const chartConfig = {
  backgroundColor: SecurityTheme.colors.background.secondary,
  backgroundGradientFrom: SecurityTheme.colors.background.secondary,
  backgroundGradientTo: SecurityTheme.colors.background.tertiary,
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`, // Red primary
  labelColor: (opacity = 1) => `rgba(203, 213, 225, ${opacity})`, // Slate 300
  style: {
    borderRadius: SecurityTheme.borderRadius.lg,
  },
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: SecurityTheme.colors.primary[500],
    fill: SecurityTheme.colors.background.secondary,
  },
  strokeWidth: 2,
  barPercentage: 0.7,
  useShadowColorFromDataset: false,
};

export default function ThreatActivityChart({
  data,
  type,
  title,
  timeRange,
  showLegend = true,
  animated = true,
  style,
}: ThreatActivityChartProps) {
  
  // Process data for different chart types
  const processedData = useMemo(() => {
    if (!data || data.length === 0) {
      return null;
    }

    switch (type) {
      case 'line':
        return processLineChartData(data, timeRange);
      case 'bar':
        return processBarChartData(data);
      case 'pie':
        return processPieChartData(data);
      case 'progress':
        return processProgressChartData(data);
      default:
        return null;
    }
  }, [data, type, timeRange]);

  if (!processedData) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No data available</Text>
        </View>
      </View>
    );
  }

  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <LineChart
            data={processedData}
            width={chartWidth}
            height={220}
            yAxisLabel=""
            yAxisSuffix=""
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            withInnerLines={false}
            withOuterLines={true}
            withVerticalLines={false}
            withHorizontalLines={true}
            withVerticalLabels={true}
            withHorizontalLabels={true}
            fromZero={true}
          />
        );
      
      case 'bar':
        return (
          <BarChart
            data={processedData}
            width={chartWidth}
            height={220}
            yAxisLabel=""
            yAxisSuffix=""
            chartConfig={{
              ...chartConfig,
              color: (opacity = 1, index = 0) => {
                const colors = SecurityTheme.colors.chart.threat;
                return colors[index % colors.length] + Math.round(opacity * 255).toString(16).padStart(2, '0');
              },
            }}
            style={styles.chart}
            withInnerLines={false}
            withVerticalLabels={true}
            withHorizontalLabels={true}
            fromZero={true}
          />
        );
      
      case 'pie':
        return (
          <PieChart
            data={processedData}
            width={chartWidth}
            height={220}
            chartConfig={chartConfig}
            accessor="count"
            backgroundColor="transparent"
            paddingLeft="15"
            style={styles.chart}
            absolute={false}
            hasLegend={false} // We'll render custom legend
          />
        );
      
      case 'progress':
        return (
          <ProgressChart
            data={processedData}
            width={chartWidth}
            height={220}
            strokeWidth={16}
            radius={32}
            chartConfig={{
              ...chartConfig,
              color: (opacity = 1, index = 0) => {
                const colors = SecurityTheme.colors.chart.threat;
                return colors[index % colors.length] + Math.round(opacity * 255).toString(16).padStart(2, '0');
              },
            }}
            style={styles.chart}
            hideLegend={true}
          />
        );
      
      default:
        return null;
    }
  };

  const renderLegend = () => {
    if (!showLegend) return null;

    switch (type) {
      case 'line':
      case 'bar':
        return (
          <View style={styles.legend}>
            <View style={styles.legendRow}>
              <LegendItem color={SecurityTheme.colors.severity.critical} label="Critical" />
              <LegendItem color={SecurityTheme.colors.severity.high} label="High" />
            </View>
            <View style={styles.legendRow}>
              <LegendItem color={SecurityTheme.colors.severity.medium} label="Medium" />
              <LegendItem color={SecurityTheme.colors.severity.low} label="Low" />
            </View>
          </View>
        );
      
      case 'pie':
        return (
          <View style={styles.pieLegend}>
            {(processedData as any[]).map((item: any, index: number) => (
              <View key={index} style={styles.pieLegendItem}>
                <View style={[styles.pieLegendColor, { backgroundColor: item.color }]} />
                <Text style={styles.pieLegendText}>
                  {item.name} ({item.count})
                </Text>
              </View>
            ))}
          </View>
        );
      
      case 'progress':
        return (
          <View style={styles.progressLegend}>
            <Text style={styles.progressTitle}>Threat Distribution</Text>
            <View style={styles.progressItems}>
              {(processedData as any).labels.map((label: string, index: number) => (
                <View key={index} style={styles.progressItem}>
                  <Text style={styles.progressLabel}>{label}</Text>
                  <Text style={styles.progressValue}>
                    {Math.round((processedData as any).data[index] * 100)}%
                  </Text>
                </View>
              ))}
            </View>
          </View>
        );
      
      default:
        return null;
    }
  };

  const renderStats = () => {
    const totalThreats = data.reduce((sum, item) => sum + item.total, 0);
    const avgThreats = Math.round(totalThreats / data.length);
    const criticalThreats = data.reduce((sum, item) => sum + item.critical, 0);
    
    return (
      <View style={styles.stats}>
        <StatItem label="Total" value={totalThreats} />
        <StatItem label="Avg/Period" value={avgThreats} />
        <StatItem label="Critical" value={criticalThreats} color={SecurityTheme.colors.severity.critical} />
      </View>
    );
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.timeRangeBadge}>
          <Text style={styles.timeRangeText}>{timeRange.toUpperCase()}</Text>
        </View>
      </View>
      
      {renderStats()}
      {renderChart()}
      {renderLegend()}
    </View>
  );
}

// Helper Components
function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendColor, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function StatItem({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={[styles.statValue, color && { color }]}>
        {value.toLocaleString()}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// Data Processing Functions
function processLineChartData(data: ThreatData[], timeRange: string) {
  const labels = data.map(item => formatTimeLabel(item.timestamp, timeRange));
  
  return {
    labels,
    datasets: [
      {
        data: data.map(item => item.critical),
        color: () => SecurityTheme.colors.severity.critical,
        strokeWidth: 2,
      },
      {
        data: data.map(item => item.high),
        color: () => SecurityTheme.colors.severity.high,
        strokeWidth: 2,
      },
      {
        data: data.map(item => item.medium),
        color: () => SecurityTheme.colors.severity.medium,
        strokeWidth: 2,
      },
      {
        data: data.map(item => item.low),
        color: () => SecurityTheme.colors.severity.low,
        strokeWidth: 2,
      },
    ],
  };
}

function processBarChartData(data: ThreatData[]) {
  const latest = data[data.length - 1];
  
  return {
    labels: ['Critical', 'High', 'Medium', 'Low'],
    datasets: [
      {
        data: [latest.critical, latest.high, latest.medium, latest.low],
        colors: [
          () => SecurityTheme.colors.severity.critical,
          () => SecurityTheme.colors.severity.high,
          () => SecurityTheme.colors.severity.medium,
          () => SecurityTheme.colors.severity.low,
        ],
      },
    ],
  };
}

function processPieChartData(data: ThreatData[]) {
  const totals = data.reduce(
    (acc, item) => ({
      critical: acc.critical + item.critical,
      high: acc.high + item.high,
      medium: acc.medium + item.medium,
      low: acc.low + item.low,
    }),
    { critical: 0, high: 0, medium: 0, low: 0 }
  );

  return [
    {
      name: 'Critical',
      count: totals.critical,
      color: SecurityTheme.colors.severity.critical,
      legendFontColor: SecurityTheme.colors.text.secondary,
      legendFontSize: 12,
    },
    {
      name: 'High',
      count: totals.high,
      color: SecurityTheme.colors.severity.high,
      legendFontColor: SecurityTheme.colors.text.secondary,
      legendFontSize: 12,
    },
    {
      name: 'Medium',
      count: totals.medium,
      color: SecurityTheme.colors.severity.medium,
      legendFontColor: SecurityTheme.colors.text.secondary,
      legendFontSize: 12,
    },
    {
      name: 'Low',
      count: totals.low,
      color: SecurityTheme.colors.severity.low,
      legendFontColor: SecurityTheme.colors.text.secondary,
      legendFontSize: 12,
    },
  ].filter(item => item.count > 0);
}

function processProgressChartData(data: ThreatData[]) {
  const totals = data.reduce(
    (acc, item) => ({
      critical: acc.critical + item.critical,
      high: acc.high + item.high,
      medium: acc.medium + item.medium,
      low: acc.low + item.low,
    }),
    { critical: 0, high: 0, medium: 0, low: 0 }
  );

  const total = totals.critical + totals.high + totals.medium + totals.low;
  
  return {
    labels: ['Critical', 'High', 'Medium', 'Low'],
    data: [
      totals.critical / total,
      totals.high / total,
      totals.medium / total,
      totals.low / total,
    ],
    colors: [
      SecurityTheme.colors.severity.critical,
      SecurityTheme.colors.severity.high,
      SecurityTheme.colors.severity.medium,
      SecurityTheme.colors.severity.low,
    ],
  };
}

function formatTimeLabel(timestamp: number, timeRange: string): string {
  const date = new Date(timestamp);
  
  switch (timeRange) {
    case '1h':
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    case '24h':
      return date.toLocaleTimeString([], { hour: '2-digit' });
    case '7d':
      return date.toLocaleDateString([], { weekday: 'short' });
    case '30d':
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    default:
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: SecurityTheme.colors.background.secondary,
    borderRadius: SecurityTheme.borderRadius.lg,
    padding: SecurityTheme.spacing.md,
    margin: SecurityTheme.spacing.sm,
    ...SecurityTheme.shadows.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SecurityTheme.spacing.md,
  },
  title: {
    fontSize: SecurityTheme.typography.sizes.lg,
    fontWeight: SecurityTheme.typography.weights.semibold,
    color: SecurityTheme.colors.text.primary,
  },
  timeRangeBadge: {
    backgroundColor: SecurityTheme.colors.background.tertiary,
    paddingHorizontal: SecurityTheme.spacing.sm,
    paddingVertical: SecurityTheme.spacing.xs,
    borderRadius: SecurityTheme.borderRadius.sm,
  },
  timeRangeText: {
    fontSize: SecurityTheme.typography.sizes.xs,
    fontWeight: SecurityTheme.typography.weights.medium,
    color: SecurityTheme.colors.text.secondary,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SecurityTheme.spacing.md,
    paddingBottom: SecurityTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: SecurityTheme.colors.border.primary,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: SecurityTheme.typography.sizes.xl,
    fontWeight: SecurityTheme.typography.weights.bold,
    color: SecurityTheme.colors.text.primary,
  },
  statLabel: {
    fontSize: SecurityTheme.typography.sizes.sm,
    color: SecurityTheme.colors.text.secondary,
    marginTop: 2,
  },
  chart: {
    marginVertical: SecurityTheme.spacing.sm,
    borderRadius: SecurityTheme.borderRadius.lg,
  },
  legend: {
    marginTop: SecurityTheme.spacing.md,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SecurityTheme.spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: SecurityTheme.borderRadius.xs,
    marginRight: SecurityTheme.spacing.xs,
  },
  legendText: {
    fontSize: SecurityTheme.typography.sizes.sm,
    color: SecurityTheme.colors.text.secondary,
  },
  pieLegend: {
    marginTop: SecurityTheme.spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  pieLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SecurityTheme.spacing.sm,
    marginVertical: SecurityTheme.spacing.xs,
  },
  pieLegendColor: {
    width: 10,
    height: 10,
    borderRadius: SecurityTheme.borderRadius.full,
    marginRight: SecurityTheme.spacing.xs,
  },
  pieLegendText: {
    fontSize: SecurityTheme.typography.sizes.sm,
    color: SecurityTheme.colors.text.secondary,
  },
  progressLegend: {
    marginTop: SecurityTheme.spacing.md,
  },
  progressTitle: {
    fontSize: SecurityTheme.typography.sizes.base,
    fontWeight: SecurityTheme.typography.weights.medium,
    color: SecurityTheme.colors.text.primary,
    textAlign: 'center',
    marginBottom: SecurityTheme.spacing.sm,
  },
  progressItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  progressItem: {
    alignItems: 'center',
    margin: SecurityTheme.spacing.xs,
  },
  progressLabel: {
    fontSize: SecurityTheme.typography.sizes.sm,
    color: SecurityTheme.colors.text.secondary,
  },
  progressValue: {
    fontSize: SecurityTheme.typography.sizes.base,
    fontWeight: SecurityTheme.typography.weights.semibold,
    color: SecurityTheme.colors.text.primary,
  },
  noDataContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontSize: SecurityTheme.typography.sizes.base,
    color: SecurityTheme.colors.text.tertiary,
  },
});
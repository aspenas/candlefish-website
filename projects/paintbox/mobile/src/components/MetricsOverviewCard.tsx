/**
 * Metrics Overview Card Component
 * Shows key system resource utilization metrics
 */

import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Card, Text, useTheme, ProgressBar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ResourceUtilization {
  current: number;
  average: number;
  trend: 'INCREASING' | 'DECREASING' | 'STABLE' | 'VOLATILE';
}

interface SystemResourceUtilization {
  cpu: ResourceUtilization;
  memory: ResourceUtilization;
  disk: ResourceUtilization;
  network: ResourceUtilization;
}

interface MetricsOverviewCardProps {
  resourceUtilization: SystemResourceUtilization;
  onPress: () => void;
}

const getTrendColor = (trend: string, current: number, theme: any) => {
  if (current > 90) return theme.colors.error;
  if (current > 75) return theme.colors.warning || '#f59e0b';

  switch (trend) {
    case 'INCREASING':
      return current > 60 ? theme.colors.warning || '#f59e0b' : theme.colors.primary;
    case 'DECREASING':
      return theme.colors.success || '#10b981';
    case 'VOLATILE':
      return theme.colors.warning || '#f59e0b';
    default:
      return theme.colors.primary;
  }
};

const getTrendIcon = (trend: string) => {
  switch (trend) {
    case 'INCREASING':
      return 'trending-up';
    case 'DECREASING':
      return 'trending-down';
    case 'VOLATILE':
      return 'chart-line-variant';
    default:
      return 'trending-neutral';
  }
};

const getUtilizationColor = (value: number, theme: any) => {
  if (value > 90) return theme.colors.error;
  if (value > 75) return theme.colors.warning || '#f59e0b';
  if (value > 50) return theme.colors.primary;
  return theme.colors.success || '#10b981';
};

export default function MetricsOverviewCard({ resourceUtilization, onPress }: MetricsOverviewCardProps) {
  const theme = useTheme();

  const MetricItem = ({
    icon,
    label,
    resource
  }: {
    icon: string;
    label: string;
    resource: ResourceUtilization;
  }) => {
    const trendColor = getTrendColor(resource.trend, resource.current, theme);
    const trendIcon = getTrendIcon(resource.trend);
    const utilizationColor = getUtilizationColor(resource.current, theme);

    return (
      <View style={styles.metricItem}>
        <View style={styles.metricHeader}>
          <View style={styles.metricTitleContainer}>
            <MaterialCommunityIcons
              name={icon}
              size={20}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="labelMedium" style={styles.metricLabel}>
              {label}
            </Text>
          </View>

          <View style={styles.metricTrend}>
            <MaterialCommunityIcons
              name={trendIcon}
              size={16}
              color={trendColor}
            />
            <Text
              variant="labelLarge"
              style={[styles.metricValue, { color: utilizationColor }]}
            >
              {resource.current.toFixed(1)}%
            </Text>
          </View>
        </View>

        <ProgressBar
          progress={resource.current / 100}
          color={utilizationColor}
          style={styles.progressBar}
        />

        <Text
          variant="labelSmall"
          style={[styles.averageText, { color: theme.colors.onSurfaceVariant }]}
        >
          avg: {resource.average.toFixed(1)}%
        </Text>
      </View>
    );
  };

  return (
    <Pressable onPress={onPress}>
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]} mode="outlined">
        <Card.Content style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text variant="titleMedium" style={styles.title}>
              Resource Utilization
            </Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={theme.colors.onSurfaceVariant}
            />
          </View>

          {/* Metrics Grid */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricsRow}>
              <MetricItem
                icon="cpu-64-bit"
                label="CPU"
                resource={resourceUtilization.cpu}
              />
              <MetricItem
                icon="memory"
                label="Memory"
                resource={resourceUtilization.memory}
              />
            </View>

            <View style={styles.metricsRow}>
              <MetricItem
                icon="harddisk"
                label="Disk"
                resource={resourceUtilization.disk}
              />
              <MetricItem
                icon="network"
                label="Network"
                resource={resourceUtilization.network}
              />
            </View>
          </View>
        </Card.Content>
      </Card>
    </Pressable>
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
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontWeight: '600',
  },
  metricsGrid: {
    gap: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  metricItem: {
    flex: 1,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  metricLabel: {
    fontWeight: '500',
  },
  metricTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricValue: {
    fontWeight: '600',
    fontSize: 16,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    marginBottom: 4,
  },
  averageText: {
    fontSize: 10,
    textAlign: 'right',
  },
});

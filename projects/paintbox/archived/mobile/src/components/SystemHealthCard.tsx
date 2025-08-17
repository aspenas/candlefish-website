/**
 * System Health Card Component
 * Displays overall system health and key metrics
 */

import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Card, Text, useTheme, ProgressBar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface SystemAnalysis {
  id: string;
  timestamp: string;
  overallHealth: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'UNKNOWN';
  healthScore: number;
  totalServices: number;
  healthyServices: number;
  degradedServices: number;
  unhealthyServices: number;
  activeAlerts: number;
  resourceUtilization?: {
    cpu: {
      current: number;
      trend: 'INCREASING' | 'DECREASING' | 'STABLE' | 'VOLATILE';
    };
    memory: {
      current: number;
      trend: 'INCREASING' | 'DECREASING' | 'STABLE' | 'VOLATILE';
    };
  };
}

interface SystemHealthCardProps {
  analysis: SystemAnalysis;
  onPress: () => void;
}

const getHealthColor = (health: string, score: number, theme: any) => {
  switch (health) {
    case 'HEALTHY':
      return theme.colors.success || '#10b981';
    case 'DEGRADED':
      return theme.colors.warning || '#f59e0b';
    case 'UNHEALTHY':
      return theme.colors.error;
    default:
      return theme.colors.onSurfaceVariant;
  }
};

const getHealthIcon = (health: string, score: number) => {
  if (score >= 90) return 'check-circle';
  if (score >= 70) return 'alert-circle-outline';
  if (score >= 50) return 'alert';
  return 'alert-octagon';
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

export default function SystemHealthCard({ analysis, onPress }: SystemHealthCardProps) {
  const theme = useTheme();
  const healthColor = getHealthColor(analysis.overallHealth, analysis.healthScore, theme);
  const healthIcon = getHealthIcon(analysis.overallHealth, analysis.healthScore);

  // Calculate health score color gradient
  const getScoreGradient = (score: number) => {
    if (score >= 90) return ['#10b981', '#059669']; // Green
    if (score >= 70) return ['#f59e0b', '#d97706']; // Orange
    if (score >= 50) return ['#f59e0b', '#dc2626']; // Orange to Red
    return ['#ef4444', '#dc2626']; // Red
  };

  const scoreGradient = getScoreGradient(analysis.healthScore);

  return (
    <Pressable onPress={onPress}>
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]} mode="outlined">
        <LinearGradient
          colors={[theme.colors.surface, theme.colors.surfaceVariant + '20']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <Card.Content style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.titleContainer}>
                <Text variant="titleMedium" style={styles.title}>
                  System Health
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Overall status: {analysis.overallHealth.toLowerCase()}
                </Text>
              </View>

              <MaterialCommunityIcons
                name={healthIcon}
                size={32}
                color={healthColor}
              />
            </View>

            {/* Health Score */}
            <View style={styles.scoreContainer}>
              <View style={styles.scoreHeader}>
                <Text variant="headlineSmall" style={[styles.score, { color: healthColor }]}>
                  {analysis.healthScore}%
                </Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color={theme.colors.onSurfaceVariant}
                />
              </View>

              <LinearGradient
                colors={scoreGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.progressBarGradient}
              >
                <ProgressBar
                  progress={analysis.healthScore / 100}
                  style={styles.progressBar}
                  color="transparent"
                />
              </LinearGradient>
            </View>

            {/* Services Summary */}
            <View style={styles.servicesContainer}>
              <View style={styles.servicesSummary}>
                <View style={styles.serviceCount}>
                  <Text variant="labelSmall" style={{ color: theme.colors.success }}>
                    {analysis.healthyServices} healthy
                  </Text>
                </View>

                {analysis.degradedServices > 0 && (
                  <View style={styles.serviceCount}>
                    <Text variant="labelSmall" style={{ color: theme.colors.warning }}>
                      {analysis.degradedServices} degraded
                    </Text>
                  </View>
                )}

                {analysis.unhealthyServices > 0 && (
                  <View style={styles.serviceCount}>
                    <Text variant="labelSmall" style={{ color: theme.colors.error }}>
                      {analysis.unhealthyServices} unhealthy
                    </Text>
                  </View>
                )}
              </View>

              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {analysis.totalServices} total services
              </Text>
            </View>

            {/* Resource Utilization */}
            {analysis.resourceUtilization && (
              <View style={styles.resourceContainer}>
                <View style={styles.resourceItem}>
                  <View style={styles.resourceHeader}>
                    <MaterialCommunityIcons
                      name="cpu-64-bit"
                      size={16}
                      color={theme.colors.onSurfaceVariant}
                    />
                    <Text variant="labelMedium">CPU</Text>
                    <MaterialCommunityIcons
                      name={getTrendIcon(analysis.resourceUtilization.cpu.trend)}
                      size={14}
                      color={theme.colors.onSurfaceVariant}
                    />
                  </View>
                  <Text variant="labelSmall" style={styles.resourceValue}>
                    {analysis.resourceUtilization.cpu.current.toFixed(1)}%
                  </Text>
                </View>

                <View style={styles.resourceItem}>
                  <View style={styles.resourceHeader}>
                    <MaterialCommunityIcons
                      name="memory"
                      size={16}
                      color={theme.colors.onSurfaceVariant}
                    />
                    <Text variant="labelMedium">Memory</Text>
                    <MaterialCommunityIcons
                      name={getTrendIcon(analysis.resourceUtilization.memory.trend)}
                      size={14}
                      color={theme.colors.onSurfaceVariant}
                    />
                  </View>
                  <Text variant="labelSmall" style={styles.resourceValue}>
                    {analysis.resourceUtilization.memory.current.toFixed(1)}%
                  </Text>
                </View>
              </View>
            )}

            {/* Active Alerts */}
            {analysis.activeAlerts > 0 && (
              <View style={styles.alertsContainer}>
                <MaterialCommunityIcons
                  name="alert"
                  size={16}
                  color={theme.colors.error}
                />
                <Text variant="labelMedium" style={{ color: theme.colors.error }}>
                  {analysis.activeAlerts} active alert{analysis.activeAlerts !== 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </Card.Content>
        </LinearGradient>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 3,
  },
  gradient: {
    borderRadius: 12,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontWeight: '600',
    marginBottom: 4,
  },
  scoreContainer: {
    marginBottom: 16,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  score: {
    fontWeight: 'bold',
    fontSize: 28,
  },
  progressBarGradient: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: 6,
    backgroundColor: 'transparent',
  },
  servicesContainer: {
    marginBottom: 16,
  },
  servicesSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 4,
  },
  serviceCount: {
    // Individual service count styling handled by text color
  },
  resourceContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  resourceItem: {
    flex: 1,
  },
  resourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  resourceValue: {
    fontWeight: '600',
  },
  alertsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
});

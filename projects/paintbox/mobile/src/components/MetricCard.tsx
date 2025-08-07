/**
 * Metric Card Component
 * Displays current metric value with trend information
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface MetricCardProps {
  title: string;
  current: number;
  average: number;
  trend: 'INCREASING' | 'DECREASING' | 'STABLE' | 'VOLATILE';
  unit: string;
}

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

const getValueColor = (value: number, theme: any) => {
  if (value > 90) return theme.colors.error;
  if (value > 75) return theme.colors.warning || '#f59e0b';
  if (value > 50) return theme.colors.primary;
  return theme.colors.success || '#10b981';
};

export default function MetricCard({ title, current, average, trend, unit }: MetricCardProps) {
  const theme = useTheme();
  const trendColor = getTrendColor(trend, current, theme);
  const trendIcon = getTrendIcon(trend);
  const valueColor = getValueColor(current, theme);

  // Calculate percentage difference from average
  const percentageDiff = average ? ((current - average) / average) * 100 : 0;
  const diffSign = percentageDiff > 0 ? '+' : '';

  return (
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
            <Text variant="titleMedium" style={styles.title}>
              {title}
            </Text>
            <View style={styles.trendContainer}>
              <MaterialCommunityIcons
                name={trendIcon}
                size={20}
                color={trendColor}
              />
            </View>
          </View>

          {/* Current Value */}
          <View style={styles.valueContainer}>
            <Text variant="headlineLarge" style={[styles.currentValue, { color: valueColor }]}>
              {current.toFixed(1)}{unit}
            </Text>
          </View>

          {/* Statistics */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Average
              </Text>
              <Text variant="labelLarge" style={styles.statValue}>
                {average.toFixed(1)}{unit}
              </Text>
            </View>

            <View style={styles.statItem}>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                vs Average
              </Text>
              <Text 
                variant="labelLarge" 
                style={[
                  styles.statValue, 
                  { color: percentageDiff > 0 ? theme.colors.error : theme.colors.success }
                ]}
              >
                {diffSign}{percentageDiff.toFixed(1)}%
              </Text>
            </View>

            <View style={styles.statItem}>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Trend
              </Text>
              <Text 
                variant="labelLarge" 
                style={[styles.statValue, { color: trendColor }]}
              >
                {trend.toLowerCase()}
              </Text>
            </View>
          </View>
        </Card.Content>
      </LinearGradient>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
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
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontWeight: '600',
  },
  trendContainer: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  valueContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  currentValue: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontWeight: '600',
    marginTop: 4,
  },
});
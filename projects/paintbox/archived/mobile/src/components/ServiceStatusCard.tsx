/**
 * Service Status Card Component
 * Displays individual service status with key metrics
 */

import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Card, Text, useTheme, Badge } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';

interface Service {
  id: string;
  name: string;
  displayName?: string;
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'UNKNOWN' | 'MAINTENANCE';
  environment: string;
  lastHealthCheck?: string;
  uptime?: string;
  tags: string[];
  containers?: Array<{
    id: string;
    name: string;
    status: string;
    cpuUsage?: number;
    memoryUsage?: number;
  }>;
}

interface ServiceStatusCardProps {
  service: Service;
  onPress: () => void;
}

const getStatusColor = (status: string, theme: any) => {
  switch (status) {
    case 'HEALTHY':
      return theme.colors.success || '#10b981';
    case 'DEGRADED':
      return theme.colors.warning || '#f59e0b';
    case 'UNHEALTHY':
      return theme.colors.error;
    case 'MAINTENANCE':
      return theme.colors.primary;
    default:
      return theme.colors.onSurfaceVariant;
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'HEALTHY':
      return 'check-circle';
    case 'DEGRADED':
      return 'alert';
    case 'UNHEALTHY':
      return 'close-circle';
    case 'MAINTENANCE':
      return 'wrench';
    default:
      return 'help-circle';
  }
};

export default function ServiceStatusCard({ service, onPress }: ServiceStatusCardProps) {
  const theme = useTheme();
  const statusColor = getStatusColor(service.status, theme);
  const statusIcon = getStatusIcon(service.status);

  // Calculate aggregate resource usage from containers
  const avgCpuUsage = service.containers?.length
    ? service.containers.reduce((sum, c) => sum + (c.cpuUsage || 0), 0) / service.containers.length
    : 0;

  const avgMemoryUsage = service.containers?.length
    ? service.containers.reduce((sum, c) => sum + (c.memoryUsage || 0), 0) / service.containers.length
    : 0;

  // Active containers count
  const activeContainers = service.containers?.filter(c =>
    c.status === 'RUNNING' || c.status === 'HEALTHY'
  ).length || 0;

  return (
    <Pressable onPress={onPress} style={styles.pressable}>
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]} mode="outlined">
        <Card.Content style={styles.content}>
          {/* Header with status */}
          <View style={styles.header}>
            <MaterialCommunityIcons
              name={statusIcon}
              size={20}
              color={statusColor}
            />
            <Badge
              size={8}
              style={[styles.statusBadge, { backgroundColor: statusColor }]}
            />
          </View>

          {/* Service name */}
          <Text
            variant="labelLarge"
            numberOfLines={2}
            style={styles.serviceName}
          >
            {service.displayName || service.name}
          </Text>

          {/* Environment tag */}
          <View style={styles.environmentContainer}>
            <Text
              variant="labelSmall"
              style={[styles.environment, { color: theme.colors.onSurfaceVariant }]}
            >
              {service.environment.toUpperCase()}
            </Text>
          </View>

          {/* Metrics */}
          <View style={styles.metrics}>
            {avgCpuUsage > 0 && (
              <View style={styles.metric}>
                <MaterialCommunityIcons
                  name="cpu-64-bit"
                  size={12}
                  color={theme.colors.onSurfaceVariant}
                />
                <Text variant="labelSmall" style={styles.metricText}>
                  {avgCpuUsage.toFixed(1)}%
                </Text>
              </View>
            )}

            {avgMemoryUsage > 0 && (
              <View style={styles.metric}>
                <MaterialCommunityIcons
                  name="memory"
                  size={12}
                  color={theme.colors.onSurfaceVariant}
                />
                <Text variant="labelSmall" style={styles.metricText}>
                  {(avgMemoryUsage / 1024 / 1024).toFixed(0)}MB
                </Text>
              </View>
            )}

            {service.containers && service.containers.length > 0 && (
              <View style={styles.metric}>
                <MaterialCommunityIcons
                  name="docker"
                  size={12}
                  color={theme.colors.onSurfaceVariant}
                />
                <Text variant="labelSmall" style={styles.metricText}>
                  {activeContainers}/{service.containers.length}
                </Text>
              </View>
            )}
          </View>

          {/* Last health check */}
          {service.lastHealthCheck && (
            <Text
              variant="labelSmall"
              style={[styles.lastCheck, { color: theme.colors.onSurfaceVariant }]}
              numberOfLines={1}
            >
              {formatDistanceToNow(new Date(service.lastHealthCheck), { addSuffix: true })}
            </Text>
          )}
        </Card.Content>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    flex: 1,
  },
  card: {
    minHeight: 120,
    elevation: 1,
  },
  content: {
    padding: 12,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    width: 8,
    height: 8,
  },
  serviceName: {
    fontWeight: '600',
    marginBottom: 6,
    lineHeight: 18,
  },
  environmentContainer: {
    marginBottom: 8,
  },
  environment: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  metricText: {
    fontSize: 10,
    fontWeight: '500',
  },
  lastCheck: {
    fontSize: 10,
    marginTop: 'auto',
  },
});

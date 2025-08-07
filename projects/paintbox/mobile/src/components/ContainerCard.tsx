/**
 * Container Card Component
 * Displays container information and resource usage
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme, Chip, ProgressBar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';

interface Container {
  id: string;
  name: string;
  image: string;
  tag?: string;
  status: string;
  cpuUsage?: number;
  memoryUsage?: number;
  memoryLimit?: number;
  networkRx?: number;
  networkTx?: number;
  diskUsage?: number;
  createdAt: string;
  startedAt?: string;
  lastRestart?: string;
  restartCount: number;
}

interface ContainerCardProps {
  container: Container;
}

const getStatusColor = (status: string, theme: any) => {
  switch (status.toUpperCase()) {
    case 'RUNNING':
      return theme.colors.success || '#10b981';
    case 'STOPPED':
      return theme.colors.error;
    case 'STARTING':
      return theme.colors.warning || '#f59e0b';
    case 'CRASHED':
      return theme.colors.error;
    default:
      return theme.colors.onSurfaceVariant;
  }
};

const getStatusIcon = (status: string) => {
  switch (status.toUpperCase()) {
    case 'RUNNING':
      return 'play-circle';
    case 'STOPPED':
      return 'stop-circle';
    case 'STARTING':
      return 'clock-outline';
    case 'CRASHED':
      return 'alert-circle';
    default:
      return 'help-circle';
  }
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export default function ContainerCard({ container }: ContainerCardProps) {
  const theme = useTheme();
  const statusColor = getStatusColor(container.status, theme);
  const statusIcon = getStatusIcon(container.status);

  // Calculate memory usage percentage
  const memoryPercent = container.memoryUsage && container.memoryLimit
    ? (container.memoryUsage / container.memoryLimit) * 100
    : 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <MaterialCommunityIcons
            name={statusIcon}
            size={16}
            color={statusColor}
          />
          <Text variant="labelLarge" style={styles.containerName}>
            {container.name}
          </Text>
        </View>
        
        <Chip
          mode="outlined"
          compact
          style={[styles.statusChip, { borderColor: statusColor }]}
          textStyle={{ color: statusColor, fontSize: 10 }}
        >
          {container.status.toLowerCase()}
        </Chip>
      </View>

      {/* Image Info */}
      <View style={styles.imageContainer}>
        <MaterialCommunityIcons
          name="docker"
          size={14}
          color={theme.colors.onSurfaceVariant}
        />
        <Text variant="labelSmall" style={[styles.imageText, { color: theme.colors.onSurfaceVariant }]}>
          {container.image}{container.tag ? `:${container.tag}` : ''}
        </Text>
      </View>

      {/* Resource Usage */}
      {(container.cpuUsage !== undefined || container.memoryUsage !== undefined) && (
        <View style={styles.resourcesContainer}>
          {/* CPU Usage */}
          {container.cpuUsage !== undefined && (
            <View style={styles.resourceItem}>
              <View style={styles.resourceHeader}>
                <MaterialCommunityIcons
                  name="cpu-64-bit"
                  size={12}
                  color={theme.colors.onSurfaceVariant}
                />
                <Text variant="labelSmall" style={styles.resourceLabel}>
                  CPU
                </Text>
                <Text variant="labelSmall" style={styles.resourceValue}>
                  {container.cpuUsage.toFixed(1)}%
                </Text>
              </View>
              <ProgressBar
                progress={container.cpuUsage / 100}
                color={container.cpuUsage > 80 ? theme.colors.error : theme.colors.primary}
                style={styles.progressBar}
              />
            </View>
          )}

          {/* Memory Usage */}
          {container.memoryUsage !== undefined && (
            <View style={styles.resourceItem}>
              <View style={styles.resourceHeader}>
                <MaterialCommunityIcons
                  name="memory"
                  size={12}
                  color={theme.colors.onSurfaceVariant}
                />
                <Text variant="labelSmall" style={styles.resourceLabel}>
                  Memory
                </Text>
                <Text variant="labelSmall" style={styles.resourceValue}>
                  {formatBytes(container.memoryUsage)}
                  {container.memoryLimit && ` / ${formatBytes(container.memoryLimit)}`}
                </Text>
              </View>
              {memoryPercent > 0 && (
                <ProgressBar
                  progress={memoryPercent / 100}
                  color={memoryPercent > 80 ? theme.colors.error : theme.colors.primary}
                  style={styles.progressBar}
                />
              )}
            </View>
          )}

          {/* Network I/O */}
          {(container.networkRx !== undefined || container.networkTx !== undefined) && (
            <View style={styles.networkContainer}>
              <MaterialCommunityIcons
                name="network"
                size={12}
                color={theme.colors.onSurfaceVariant}
              />
              <Text variant="labelSmall" style={[styles.networkText, { color: theme.colors.onSurfaceVariant }]}>
                {container.networkRx !== undefined && `↓${formatBytes(container.networkRx)}`}
                {container.networkRx !== undefined && container.networkTx !== undefined && ' '}
                {container.networkTx !== undefined && `↑${formatBytes(container.networkTx)}`}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Metadata */}
      <View style={styles.metadataContainer}>
        {container.startedAt && (
          <Text variant="labelSmall" style={[styles.metadataText, { color: theme.colors.onSurfaceVariant }]}>
            Started {formatDistanceToNow(new Date(container.startedAt), { addSuffix: true })}
          </Text>
        )}
        
        {container.restartCount > 0 && (
          <Text variant="labelSmall" style={[styles.metadataText, { color: theme.colors.onSurfaceVariant }]}>
            Restarts: {container.restartCount}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  containerName: {
    fontWeight: '600',
    flex: 1,
  },
  statusChip: {
    marginLeft: 8,
  },
  imageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  imageText: {
    flex: 1,
    fontFamily: 'monospace',
  },
  resourcesContainer: {
    gap: 8,
    marginBottom: 8,
  },
  resourceItem: {
    gap: 4,
  },
  resourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resourceLabel: {
    flex: 1,
    fontWeight: '500',
  },
  resourceValue: {
    fontWeight: '600',
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
  },
  networkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  networkText: {
    fontFamily: 'monospace',
    fontSize: 11,
  },
  metadataContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  metadataText: {
    fontSize: 11,
  },
});
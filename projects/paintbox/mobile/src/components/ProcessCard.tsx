/**
 * Process Card Component
 * Displays process information and resource usage
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';

interface Process {
  id: string;
  pid: number;
  name: string;
  command: string;
  status: string;
  cpuPercent?: number;
  memoryMb?: number;
  openFiles?: number;
  threads?: number;
  user?: string;
  startTime: string;
  parentPid?: number;
  workingDirectory?: string;
}

interface ProcessCardProps {
  process: Process;
}

const getStatusColor = (status: string, theme: any) => {
  switch (status.toUpperCase()) {
    case 'RUNNING':
      return theme.colors.success || '#10b981';
    case 'STOPPED':
      return theme.colors.error;
    case 'SLEEPING':
      return theme.colors.primary;
    case 'ZOMBIE':
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
    case 'SLEEPING':
      return 'sleep';
    case 'ZOMBIE':
      return 'ghost';
    default:
      return 'help-circle';
  }
};

const formatMemory = (memoryMb: number): string => {
  if (memoryMb < 1024) {
    return `${memoryMb.toFixed(0)} MB`;
  }
  return `${(memoryMb / 1024).toFixed(1)} GB`;
};

export default function ProcessCard({ process }: ProcessCardProps) {
  const theme = useTheme();
  const statusColor = getStatusColor(process.status, theme);
  const statusIcon = getStatusIcon(process.status);

  // Truncate command for display
  const displayCommand = process.command.length > 50 
    ? process.command.substring(0, 47) + '...'
    : process.command;

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
          <View style={styles.processInfo}>
            <Text variant="labelLarge" style={styles.processName}>
              {process.name}
            </Text>
            <Text variant="labelSmall" style={[styles.pid, { color: theme.colors.onSurfaceVariant }]}>
              PID: {process.pid}
            </Text>
          </View>
        </View>
        
        <Chip
          mode="outlined"
          compact
          style={[styles.statusChip, { borderColor: statusColor }]}
          textStyle={{ color: statusColor, fontSize: 10 }}
        >
          {process.status.toLowerCase()}
        </Chip>
      </View>

      {/* Command */}
      <View style={styles.commandContainer}>
        <MaterialCommunityIcons
          name="console"
          size={12}
          color={theme.colors.onSurfaceVariant}
        />
        <Text 
          variant="labelSmall" 
          style={[styles.commandText, { color: theme.colors.onSurfaceVariant }]}
        >
          {displayCommand}
        </Text>
      </View>

      {/* Resource Usage */}
      <View style={styles.resourcesContainer}>
        {process.cpuPercent !== undefined && (
          <View style={styles.resourceItem}>
            <MaterialCommunityIcons
              name="cpu-64-bit"
              size={12}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="labelSmall" style={styles.resourceText}>
              {process.cpuPercent.toFixed(1)}% CPU
            </Text>
          </View>
        )}

        {process.memoryMb !== undefined && (
          <View style={styles.resourceItem}>
            <MaterialCommunityIcons
              name="memory"
              size={12}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="labelSmall" style={styles.resourceText}>
              {formatMemory(process.memoryMb)}
            </Text>
          </View>
        )}

        {process.threads !== undefined && (
          <View style={styles.resourceItem}>
            <MaterialCommunityIcons
              name="timeline-outline"
              size={12}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="labelSmall" style={styles.resourceText}>
              {process.threads} threads
            </Text>
          </View>
        )}

        {process.openFiles !== undefined && (
          <View style={styles.resourceItem}>
            <MaterialCommunityIcons
              name="file-outline"
              size={12}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="labelSmall" style={styles.resourceText}>
              {process.openFiles} files
            </Text>
          </View>
        )}
      </View>

      {/* Metadata */}
      <View style={styles.metadataContainer}>
        <View style={styles.metadataRow}>
          {process.user && (
            <Text variant="labelSmall" style={[styles.metadataText, { color: theme.colors.onSurfaceVariant }]}>
              User: {process.user}
            </Text>
          )}
          
          <Text variant="labelSmall" style={[styles.metadataText, { color: theme.colors.onSurfaceVariant }]}>
            Started {formatDistanceToNow(new Date(process.startTime), { addSuffix: true })}
          </Text>
        </View>

        {process.parentPid && (
          <Text variant="labelSmall" style={[styles.metadataText, { color: theme.colors.onSurfaceVariant }]}>
            Parent PID: {process.parentPid}
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
    gap: 8,
    flex: 1,
  },
  processInfo: {
    flex: 1,
  },
  processName: {
    fontWeight: '600',
    marginBottom: 2,
  },
  pid: {
    fontFamily: 'monospace',
    fontSize: 10,
  },
  statusChip: {
    marginLeft: 8,
  },
  commandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  commandText: {
    flex: 1,
    fontFamily: 'monospace',
    fontSize: 11,
  },
  resourcesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resourceText: {
    fontWeight: '500',
    fontSize: 11,
  },
  metadataContainer: {
    marginTop: 8,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  metadataText: {
    fontSize: 10,
  },
});
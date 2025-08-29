import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Surface, Title, List, useTheme, Chip } from 'react-native-paper';
import { usePromptMetrics } from '@/hooks/usePromptMetrics';
import { spacing, typography, borderRadius } from '@/constants/theme';

interface RecentExecutionsCardProps {
  onExecutionPress: (execution: any) => void;
}

const RecentExecutionsCard: React.FC<RecentExecutionsCardProps> = ({
  onExecutionPress
}) => {
  const theme = useTheme();
  const { metrics } = usePromptMetrics();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return theme.colors.success;
      case 'error':
        return theme.colors.error;
      case 'pending':
        return theme.colors.warning;
      default:
        return theme.colors.outline;
    }
  };

  const formatTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const renderExecution = ({ item }: { item: any }) => (
    <List.Item
      title={item.templateName}
      description={formatTime(item.timestamp)}
      onPress={() => onExecutionPress(item)}
      right={() => (
        <View style={styles.executionRight}>
          <Chip
            mode="outlined"
            compact
            textStyle={[
              styles.statusText,
              { color: getStatusColor(item.status) }
            ]}
            style={[
              styles.statusChip,
              { borderColor: getStatusColor(item.status) }
            ]}
          >
            {item.status}
          </Chip>
        </View>
      )}
      style={styles.executionItem}
    />
  );

  return (
    <Surface
      style={[styles.container, { backgroundColor: theme.colors.surface }]}
      elevation={2}
    >
      <Title style={[styles.title, { color: theme.colors.onSurface }]}>
        Recent Executions
      </Title>
      
      <FlatList
        data={metrics?.recentExecutions?.slice(0, 5) || []}
        keyExtractor={(item) => item.id}
        renderItem={renderExecution}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.titleLarge,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  executionItem: {
    paddingHorizontal: 0,
  },
  executionRight: {
    justifyContent: 'center',
  },
  statusChip: {
    height: 24,
  },
  statusText: {
    ...typography.labelSmall,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  separator: {
    height: 1,
    opacity: 0.1,
    marginVertical: spacing.xs,
  },
});

export default RecentExecutionsCard;
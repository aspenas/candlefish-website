import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Surface, Title, List, useTheme, Chip } from 'react-native-paper';
import { spacing, typography, borderRadius } from '@/constants/theme';

const ModelStatusCard: React.FC = () => {
  const theme = useTheme();

  // Mock model status data
  const modelStatuses = [
    {
      provider: 'anthropic',
      model: 'Claude Opus',
      status: 'online',
      latency: 1650
    },
    {
      provider: 'openai',
      model: 'GPT-4o',
      status: 'online',
      latency: 2100
    },
    {
      provider: 'together',
      model: 'Llama 2 70B',
      status: 'limited',
      latency: 3200
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return theme.colors.success;
      case 'limited':
        return theme.colors.warning;
      case 'offline':
        return theme.colors.error;
      default:
        return theme.colors.outline;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return 'check-circle';
      case 'limited':
        return 'alert-circle';
      case 'offline':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  return (
    <Surface
      style={[styles.container, { backgroundColor: theme.colors.surface }]}
      elevation={2}
    >
      <Title style={[styles.title, { color: theme.colors.onSurface }]}>
        Model Status
      </Title>
      
      {modelStatuses.map((model, index) => (
        <List.Item
          key={`${model.provider}-${model.model}`}
          title={model.model}
          description={`${model.provider} • ${model.latency}ms avg`}
          left={(props) => (
            <List.Icon
              {...props}
              icon={getStatusIcon(model.status)}
              color={getStatusColor(model.status)}
            />
          )}
          right={() => (
            <Chip
              mode="outlined"
              compact
              textStyle={[
                styles.statusText,
                { color: getStatusColor(model.status) }
              ]}
              style={[
                styles.statusChip,
                { borderColor: getStatusColor(model.status) }
              ]}
            >
              {model.status}
            </Chip>
          )}
          style={styles.modelItem}
        />
      ))}
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
  modelItem: {
    paddingHorizontal: 0,
  },
  statusChip: {
    height: 24,
  },
  statusText: {
    ...typography.labelSmall,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});

export default ModelStatusCard;
import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Surface, Title, List, useTheme, Text, ProgressBar } from 'react-native-paper';
import { usePromptMetrics } from '@/hooks/usePromptMetrics';
import { spacing, typography, borderRadius } from '@/constants/theme';

interface PopularTemplatesCardProps {
  onTemplatePress: (template: any) => void;
}

const PopularTemplatesCard: React.FC<PopularTemplatesCardProps> = ({
  onTemplatePress
}) => {
  const theme = useTheme();
  const { metrics } = usePromptMetrics();

  const renderTemplate = ({ item }: { item: any }) => (
    <List.Item
      title={item.name}
      description={`${item.executions} executions`}
      onPress={() => onTemplatePress(item)}
      right={() => (
        <View style={styles.templateRight}>
          <Text style={[styles.successRate, { color: theme.colors.onSurfaceVariant }]}>
            {(item.successRate * 100).toFixed(0)}%
          </Text>
          <ProgressBar
            progress={item.successRate}
            color={theme.colors.success}
            style={styles.progressBar}
          />
        </View>
      )}
      style={styles.templateItem}
    />
  );

  return (
    <Surface
      style={[styles.container, { backgroundColor: theme.colors.surface }]}
      elevation={2}
    >
      <Title style={[styles.title, { color: theme.colors.onSurface }]}>
        Popular Templates
      </Title>
      
      <FlatList
        data={metrics?.popularTemplates || []}
        keyExtractor={(item) => item.id}
        renderItem={renderTemplate}
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
  templateItem: {
    paddingHorizontal: 0,
  },
  templateRight: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  successRate: {
    ...typography.labelSmall,
    fontWeight: '600',
    marginBottom: 4,
  },
  progressBar: {
    width: 60,
    height: 4,
  },
  separator: {
    height: 1,
    opacity: 0.1,
    marginVertical: spacing.xs,
  },
});

export default PopularTemplatesCard;
import React, { useState } from 'react';
import { View, StyleSheet, Text, Animated } from 'react-native';
import { Surface, Card, Title, Paragraph, Chip, IconButton, useTheme } from 'react-native-paper';
import { SwipeRow } from 'react-native-swipe-list-view';
import { Ionicons } from '@expo/vector-icons';
import { PromptTemplate, SwipeAction } from '@/types';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { spacing, typography, borderRadius } from '@/constants/theme';

interface SwipeablePromptCardProps {
  template: PromptTemplate;
  onPress: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onShare: () => void;
  onTest: () => void;
}

const SwipeablePromptCard: React.FC<SwipeablePromptCardProps> = ({
  template,
  onPress,
  onEdit,
  onDuplicate,
  onDelete,
  onShare,
  onTest
}) => {
  const theme = useTheme();
  const { triggerHaptic } = useHapticFeedback();
  const [swipeAnimatedValue] = useState(new Animated.Value(0));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return theme.colors.success;
      case 'review':
        return theme.colors.warning;
      case 'draft':
        return theme.colors.info;
      case 'deprecated':
        return theme.colors.error;
      default:
        return theme.colors.outline;
    }
  };

  const getCategoryIcon = (category: string) => {
    const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
      'code-review': 'code-working',
      'test-generation': 'flask',
      'documentation': 'document-text',
      'error-diagnosis': 'bug',
      'security-analysis': 'shield-checkmark',
      'performance-optimization': 'speedometer',
      'refactoring': 'construct',
      'migration': 'git-branch',
      'api-design': 'layers',
      'architecture': 'library',
      'deployment': 'rocket',
      'monitoring': 'analytics',
      'incident-response': 'warning'
    };
    return iconMap[category] || 'document';
  };

  const handleSwipeAction = (action: string) => {
    triggerHaptic('medium');
    
    switch (action) {
      case 'edit':
        onEdit();
        break;
      case 'duplicate':
        onDuplicate();
        break;
      case 'delete':
        onDelete();
        break;
      case 'share':
        onShare();
        break;
      case 'test':
        onTest();
        break;
    }
  };

  const renderLeftActions = () => (
    <View style={styles.leftActions}>
      <Surface
        style={[styles.actionButton, { backgroundColor: theme.colors.tertiary }]}
        elevation={2}
      >
        <IconButton
          icon="play"
          size={20}
          iconColor={theme.colors.onTertiary}
          onPress={() => handleSwipeAction('test')}
        />
        <Text style={[styles.actionText, { color: theme.colors.onTertiary }]}>
          Test
        </Text>
      </Surface>
      <Surface
        style={[styles.actionButton, { backgroundColor: theme.colors.secondary }]}
        elevation={2}
      >
        <IconButton
          icon="content-copy"
          size={20}
          iconColor={theme.colors.onSecondary}
          onPress={() => handleSwipeAction('duplicate')}
        />
        <Text style={[styles.actionText, { color: theme.colors.onSecondary }]}>
          Copy
        </Text>
      </Surface>
    </View>
  );

  const renderRightActions = () => (
    <View style={styles.rightActions}>
      <Surface
        style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
        elevation={2}
      >
        <IconButton
          icon="pencil"
          size={20}
          iconColor={theme.colors.onPrimary}
          onPress={() => handleSwipeAction('edit')}
        />
        <Text style={[styles.actionText, { color: theme.colors.onPrimary }]}>
          Edit
        </Text>
      </Surface>
      <Surface
        style={[styles.actionButton, { backgroundColor: theme.colors.error }]}
        elevation={2}
      >
        <IconButton
          icon="delete"
          size={20}
          iconColor={theme.colors.onError}
          onPress={() => handleSwipeAction('delete')}
        />
        <Text style={[styles.actionText, { color: theme.colors.onError }]}>
          Delete
        </Text>
      </Surface>
    </View>
  );

  return (
    <SwipeRow
      leftOpenValue={150}
      rightOpenValue={-150}
      leftActivationValue={200}
      rightActivationValue={-200}
      style={styles.swipeRow}
    >
      <View style={styles.hiddenRow}>
        {renderLeftActions()}
        {renderRightActions()}
      </View>
      
      <Card
        style={[styles.card, { backgroundColor: theme.colors.surface }]}
        onPress={onPress}
        elevation={2}
      >
        <Card.Content style={styles.cardContent}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Ionicons
                name={getCategoryIcon(template.category)}
                size={20}
                color={theme.colors.primary}
                style={styles.categoryIcon}
              />
              <Title style={[styles.title, { color: theme.colors.onSurface }]} numberOfLines={1}>
                {template.name}
              </Title>
            </View>
            <Chip
              mode="outlined"
              compact
              textStyle={[styles.statusText, { color: getStatusColor(template.metadata.approvalStatus) }]}
              style={[styles.statusChip, { borderColor: getStatusColor(template.metadata.approvalStatus) }]}
            >
              {template.metadata.approvalStatus}
            </Chip>
          </View>

          <Paragraph
            style={[styles.description, { color: theme.colors.onSurfaceVariant }]}
            numberOfLines={2}
          >
            {template.description}
          </Paragraph>

          <View style={styles.metadata}>
            <View style={styles.metadataRow}>
              <Ionicons
                name="time-outline"
                size={14}
                color={theme.colors.onSurfaceVariant}
              />
              <Text style={[styles.metadataText, { color: theme.colors.onSurfaceVariant }]}>
                {new Date(template.updatedAt).toLocaleDateString()}
              </Text>
            </View>

            {template.metadata.usageCount && (
              <View style={styles.metadataRow}>
                <Ionicons
                  name="play-outline"
                  size={14}
                  color={theme.colors.onSurfaceVariant}
                />
                <Text style={[styles.metadataText, { color: theme.colors.onSurfaceVariant }]}>
                  {template.metadata.usageCount} uses
                </Text>
              </View>
            )}

            {template.performance?.qualityScore && (
              <View style={styles.metadataRow}>
                <Ionicons
                  name="star-outline"
                  size={14}
                  color={theme.colors.onSurfaceVariant}
                />
                <Text style={[styles.metadataText, { color: theme.colors.onSurfaceVariant }]}>
                  {(template.performance.qualityScore * 100).toFixed(0)}%
                </Text>
              </View>
            )}
          </View>

          <View style={styles.tags}>
            {template.tags.slice(0, 3).map((tag, index) => (
              <Chip
                key={`${template.id}-tag-${index}`}
                mode="outlined"
                compact
                textStyle={styles.tagText}
                style={styles.tag}
              >
                {tag}
              </Chip>
            ))}
            {template.tags.length > 3 && (
              <Text style={[styles.moreTagsText, { color: theme.colors.onSurfaceVariant }]}>
                +{template.tags.length - 3} more
              </Text>
            )}
          </View>
        </Card.Content>
      </Card>
    </SwipeRow>
  );
};

const styles = StyleSheet.create({
  swipeRow: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
  },
  hiddenRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionButton: {
    width: 70,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  actionText: {
    ...typography.labelSmall,
    fontWeight: '600',
    marginTop: 4,
  },
  card: {
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  cardContent: {
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  categoryIcon: {
    marginRight: spacing.xs,
  },
  title: {
    ...typography.titleMedium,
    flex: 1,
  },
  statusChip: {
    height: 24,
  },
  statusText: {
    ...typography.labelSmall,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  description: {
    ...typography.bodySmall,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metadataText: {
    ...typography.labelSmall,
  },
  tags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  tag: {
    height: 24,
  },
  tagText: {
    ...typography.labelSmall,
  },
  moreTagsText: {
    ...typography.labelSmall,
    fontStyle: 'italic',
  },
});

export default SwipeablePromptCard;
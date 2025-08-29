import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Surface, IconButton, Text, useTheme } from 'react-native-paper';
import { QuickAction } from '@/types';
import { spacing, typography, borderRadius } from '@/constants/theme';

interface QuickActionBarProps {
  actions: QuickAction[];
  onActionPress: (action: QuickAction) => void;
  horizontal?: boolean;
}

const QuickActionBar: React.FC<QuickActionBarProps> = ({
  actions,
  onActionPress,
  horizontal = true
}) => {
  const theme = useTheme();

  const renderAction = (action: QuickAction) => (
    <Surface
      key={action.id}
      style={[
        styles.actionButton,
        { backgroundColor: theme.colors.surfaceVariant }
      ]}
      elevation={1}
    >
      <IconButton
        icon={action.icon}
        size={24}
        iconColor={action.color}
        onPress={() => onActionPress(action)}
        style={styles.iconButton}
      />
      <Text
        style={[
          styles.actionTitle,
          { color: theme.colors.onSurfaceVariant }
        ]}
        numberOfLines={2}
      >
        {action.title}
      </Text>
      {action.subtitle && (
        <Text
          style={[
            styles.actionSubtitle,
            { color: theme.colors.onSurfaceVariant }
          ]}
          numberOfLines={1}
        >
          {action.subtitle}
        </Text>
      )}
    </Surface>
  );

  if (horizontal) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalContainer}
      >
        {actions.map(renderAction)}
      </ScrollView>
    );
  }

  return (
    <View style={styles.verticalContainer}>
      {actions.map(renderAction)}
    </View>
  );
};

const styles = StyleSheet.create({
  horizontalContainer: {
    paddingHorizontal: spacing.xs,
    gap: spacing.sm,
  },
  verticalContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionButton: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    minWidth: 100,
    width: 100,
  },
  iconButton: {
    margin: 0,
    marginBottom: spacing.xs,
  },
  actionTitle: {
    ...typography.labelMedium,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 2,
  },
  actionSubtitle: {
    ...typography.labelSmall,
    textAlign: 'center',
    opacity: 0.7,
  },
});

export default QuickActionBar;
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Modal, Surface, Title, Button, useTheme } from 'react-native-paper';
import { spacing, borderRadius } from '@/constants/theme';

interface FilterState {
  category: string | null;
  tags: string[];
  status: string | null;
  sortBy: 'name' | 'updated' | 'usage' | 'quality';
  sortOrder: 'asc' | 'desc';
}

interface FilterModalProps {
  visible: boolean;
  onDismiss: () => void;
  filters: FilterState;
  onApply: (filters: FilterState) => void;
  onClear: () => void;
}

const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onDismiss,
  filters,
  onApply,
  onClear
}) => {
  const theme = useTheme();

  return (
    <Modal
      visible={visible}
      onDismiss={onDismiss}
      contentContainerStyle={[
        styles.modal,
        { backgroundColor: theme.colors.surface }
      ]}
    >
      <Title style={styles.title}>Filter Templates</Title>
      
      {/* TODO: Implement full filter interface with:
        - Category selection
        - Tag chips
        - Status selection
        - Sort options
        - Clear all functionality
      */}
      
      <View style={styles.actions}>
        <Button
          mode="outlined"
          onPress={onClear}
          style={styles.button}
        >
          Clear All
        </Button>
        <Button
          mode="contained"
          onPress={() => onApply(filters)}
          style={styles.button}
        >
          Apply Filters
        </Button>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: spacing.lg,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    maxHeight: '80%',
  },
  title: {
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
  },
  button: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
});

export default FilterModal;
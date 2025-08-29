import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  Dimensions
} from 'react-native';
import {
  Searchbar,
  FAB,
  Surface,
  useTheme,
  Title,
  Paragraph,
  IconButton,
  Menu,
  Divider,
  Chip,
  Portal
} from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SwipeListView } from 'react-native-swipe-list-view';

import { RootStackParamList, PromptTemplate } from '@/types';
import { useAppSelector, useAppDispatch } from '@/hooks/redux';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import SwipeablePromptCard from '@/components/ui/SwipeablePromptCard';
import FilterModal from '@/components/ui/FilterModal';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { PROMPT_CATEGORIES } from '@/constants';
import { spacing, typography } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type PromptListNavigationProp = StackNavigationProp<RootStackParamList, 'PromptList'>;

interface FilterState {
  category: string | null;
  tags: string[];
  status: string | null;
  sortBy: 'name' | 'updated' | 'usage' | 'quality';
  sortOrder: 'asc' | 'desc';
}

const PromptListScreen: React.FC = () => {
  const navigation = useNavigation<PromptListNavigationProp>();
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { triggerHaptic } = useHapticFeedback();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const [filters, setFilters] = useState<FilterState>({
    category: null,
    tags: [],
    status: null,
    sortBy: 'updated',
    sortOrder: 'desc'
  });

  const { templates, loading, error } = useAppSelector((state) => state.templates);

  // Fetch templates on screen focus
  useFocusEffect(
    React.useCallback(() => {
      dispatch({ type: 'templates/fetchTemplates' });
    }, [dispatch])
  );

  // Filter and sort templates
  const filteredTemplates = useMemo(() => {
    let filtered = templates.filter((template: PromptTemplate) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          template.name.toLowerCase().includes(query) ||
          template.description.toLowerCase().includes(query) ||
          template.tags.some(tag => tag.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }

      // Category filter
      if (filters.category && template.category !== filters.category) {
        return false;
      }

      // Tags filter
      if (filters.tags.length > 0) {
        const hasRequiredTags = filters.tags.some(tag => 
          template.tags.includes(tag)
        );
        if (!hasRequiredTags) return false;
      }

      // Status filter
      if (filters.status && template.metadata.approvalStatus !== filters.status) {
        return false;
      }

      return true;
    });

    // Sort templates
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (filters.sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'updated':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        case 'usage':
          comparison = (a.metadata.usageCount || 0) - (b.metadata.usageCount || 0);
          break;
        case 'quality':
          comparison = (a.performance?.qualityScore || 0) - (b.performance?.qualityScore || 0);
          break;
      }

      return filters.sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [templates, searchQuery, filters]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await dispatch({ type: 'templates/fetchTemplates' });
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh templates');
    } finally {
      setRefreshing(false);
    }
  };

  const handleTemplatePress = (template: PromptTemplate) => {
    triggerHaptic('light');
    navigation.navigate('TemplateDetail', { templateId: template.id });
  };

  const handleEditTemplate = (template: PromptTemplate) => {
    triggerHaptic('medium');
    navigation.navigate('PromptEditor', { 
      templateId: template.id, 
      mode: 'edit' 
    });
  };

  const handleDuplicateTemplate = (template: PromptTemplate) => {
    triggerHaptic('medium');
    navigation.navigate('PromptEditor', { 
      templateId: template.id, 
      mode: 'duplicate' 
    });
  };

  const handleDeleteTemplate = (template: PromptTemplate) => {
    triggerHaptic('heavy');
    Alert.alert(
      'Delete Template',
      `Are you sure you want to delete "${template.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            dispatch({ 
              type: 'templates/deleteTemplate', 
              payload: template.id 
            });
          }
        }
      ]
    );
  };

  const handleShareTemplate = (template: PromptTemplate) => {
    // Implement sharing functionality
    Alert.alert('Share Template', 'Sharing feature coming soon!');
  };

  const handleTestTemplate = (template: PromptTemplate) => {
    triggerHaptic('light');
    navigation.navigate('PromptTest', { templateId: template.id });
  };

  const createNewTemplate = () => {
    triggerHaptic('medium');
    navigation.navigate('PromptEditor', { mode: 'create' });
  };

  const applyFilters = (newFilters: FilterState) => {
    setFilters(newFilters);
    setFilterModalVisible(false);
  };

  const clearFilters = () => {
    setFilters({
      category: null,
      tags: [],
      status: null,
      sortBy: 'updated',
      sortOrder: 'desc'
    });
    setSelectedCategory(null);
  };

  const hasActiveFilters = useMemo(() => {
    return filters.category || filters.tags.length > 0 || filters.status;
  }, [filters]);

  const renderTemplate = ({ item }: { item: PromptTemplate }) => (
    <SwipeablePromptCard
      template={item}
      onPress={() => handleTemplatePress(item)}
      onEdit={() => handleEditTemplate(item)}
      onDuplicate={() => handleDuplicateTemplate(item)}
      onDelete={() => handleDeleteTemplate(item)}
      onShare={() => handleShareTemplate(item)}
      onTest={() => handleTestTemplate(item)}
    />
  );

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Search Bar */}
      <Searchbar
        placeholder="Search templates..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
        inputStyle={styles.searchInput}
        iconColor={theme.colors.primary}
      />

      {/* Filter Controls */}
      <View style={styles.filterControls}>
        <View style={styles.filterChips}>
          {PROMPT_CATEGORIES.slice(0, 3).map((category) => (
            <Chip
              key={category}
              mode={selectedCategory === category ? 'flat' : 'outlined'}
              selected={selectedCategory === category}
              onPress={() => {
                const newCategory = selectedCategory === category ? null : category;
                setSelectedCategory(newCategory);
                setFilters(prev => ({ ...prev, category: newCategory }));
              }}
              style={styles.categoryChip}
              textStyle={styles.chipText}
            >
              {category.replace('-', ' ')}
            </Chip>
          ))}
        </View>

        <View style={styles.filterActions}>
          {hasActiveFilters && (
            <IconButton
              icon="filter-remove"
              size={20}
              onPress={clearFilters}
            />
          )}
          <IconButton
            icon="filter-variant"
            size={20}
            onPress={() => setFilterModalVisible(true)}
          />
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <IconButton
                icon="dots-vertical"
                size={20}
                onPress={() => setMenuVisible(true)}
              />
            }
          >
            <Menu.Item
              onPress={() => {
                setMenuVisible(false);
                setFilters(prev => ({ 
                  ...prev, 
                  sortBy: 'updated', 
                  sortOrder: 'desc' 
                }));
              }}
              title="Sort by Recent"
              leadingIcon="clock-outline"
            />
            <Menu.Item
              onPress={() => {
                setMenuVisible(false);
                setFilters(prev => ({ 
                  ...prev, 
                  sortBy: 'name', 
                  sortOrder: 'asc' 
                }));
              }}
              title="Sort by Name"
              leadingIcon="alphabetical-variant"
            />
            <Menu.Item
              onPress={() => {
                setMenuVisible(false);
                setFilters(prev => ({ 
                  ...prev, 
                  sortBy: 'usage', 
                  sortOrder: 'desc' 
                }));
              }}
              title="Sort by Usage"
              leadingIcon="trending-up"
            />
            <Divider />
            <Menu.Item
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate('Metrics', {});
              }}
              title="View Analytics"
              leadingIcon="chart-line"
            />
          </Menu>
        </View>
      </View>

      {/* Results Summary */}
      <View style={styles.resultsSummary}>
        <Paragraph style={styles.resultsText}>
          {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
          {hasActiveFilters && ' (filtered)'}
        </Paragraph>
      </View>
    </View>
  );

  if (loading && templates.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={filteredTemplates}
        keyExtractor={(item) => item.id}
        renderItem={renderTemplate}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <EmptyState
            icon="file-document-outline"
            title="No templates found"
            subtitle={searchQuery 
              ? "Try adjusting your search or filters"
              : "Create your first prompt template to get started"
            }
            actionTitle="Create Template"
            onAction={createNewTemplate}
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={createNewTemplate}
        label="Create"
      />

      <Portal>
        <FilterModal
          visible={filterModalVisible}
          onDismiss={() => setFilterModalVisible(false)}
          filters={filters}
          onApply={applyFilters}
          onClear={clearFilters}
        />
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  searchBar: {
    marginBottom: spacing.md,
    elevation: 2,
  },
  searchInput: {
    ...typography.bodyMedium,
  },
  filterControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  filterChips: {
    flexDirection: 'row',
    flex: 1,
    gap: spacing.xs,
  },
  categoryChip: {
    marginRight: spacing.xs,
  },
  chipText: {
    ...typography.labelSmall,
    textTransform: 'capitalize',
  },
  filterActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultsSummary: {
    marginTop: spacing.sm,
  },
  resultsText: {
    ...typography.bodySmall,
    opacity: 0.7,
  },
  listContainer: {
    paddingBottom: 80,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    elevation: 8,
  },
});

export default PromptListScreen;
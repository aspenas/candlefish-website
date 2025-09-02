import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';
import { useQuery } from 'react-query';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../providers/ThemeProvider';
import { useOffline } from '../providers/OfflineProvider';
import { TabNavigationProps } from '../types/navigation';
import { apiService } from '../services/api';
import { PerformanceService } from '../services/performance';

// Types
import { Item, FilterRequest } from '../types';

const InventoryScreen: React.FC<TabNavigationProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const { isOnline } = useOffline();
  const styles = createStyles(theme);
  
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  useEffect(() => {
    const startTime = Date.now();
    
    return () => {
      const loadTime = Date.now() - startTime;
      PerformanceService.recordScreenMetrics({
        screen: 'Inventory',
        loadTime,
        renderTime: loadTime,
        memoryUsage: 0,
        batteryLevel: 0,
        timestamp: new Date(),
      });
    };
  }, []);

  const categories = [
    'All',
    'Furniture',
    'Art / Decor',
    'Electronics',
    'Lighting',
    'Rug / Carpet',
  ];

  // Fetch items
  const {
    data: itemsData,
    isLoading: itemsLoading,
    refetch: refetchItems,
  } = useQuery(
    ['items', searchQuery, selectedCategory],
    () => fetchItems(),
    {
      refetchOnMount: true,
      enabled: isOnline,
    }
  );

  const fetchItems = async () => {
    const filter: FilterRequest = {
      rooms: [],
      categories: selectedCategory === 'All' ? [] : [selectedCategory as any],
      decisions: [],
      sortBy: 'updated_at',
      sortOrder: 'desc',
      page: 1,
      limit: 100,
    };

    return apiService.getItems(filter);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetchItems();
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const filteredItems = React.useMemo(() => {
    if (!itemsData?.items) return [];
    
    return itemsData.items.filter(item =>
      searchQuery === '' || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [itemsData?.items, searchQuery]);

  const handleItemPress = (item: Item) => {
    navigation.navigate('ItemDetail', {
      itemId: item.id,
      itemName: item.name,
    });
  };

  const renderItem = ({ item }: { item: Item }) => (
    <TouchableOpacity
      style={styles.itemCard}
      onPress={() => handleItemPress(item)}
      activeOpacity={0.7}
    >
      {/* Image */}
      <View style={styles.itemImageContainer}>
        {item.images && item.images.length > 0 ? (
          <Image
            source={{ uri: item.images[0].thumbnail_url || item.images[0].url }}
            style={styles.itemImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Icon name="image" size={32} color={theme.colors.textSecondary} />
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.itemContent}>
        <Text style={styles.itemName} numberOfLines={2}>
          {item.name}
        </Text>
        
        <Text style={styles.itemCategory}>{item.category}</Text>
        
        {item.description && (
          <Text style={styles.itemDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <View style={styles.itemFooter}>
          <View style={styles.itemRoom}>
            <Icon name="room" size={14} color={theme.colors.textSecondary} />
            <Text style={styles.itemRoomText}>
              {item.room?.name || 'No room'}
            </Text>
          </View>

          {/* Valuation info */}
          {item.valuations && item.valuations.length > 0 && (
            <View style={styles.valuationInfo}>
              <Text style={styles.valuationValue}>
                ${item.valuations[0].estimated_value.toLocaleString()}
              </Text>
              <View style={[
                styles.confidenceBadge,
                { backgroundColor: getConfidenceColor(item.valuations[0].confidence_score) + '20' }
              ]}>
                <Text style={[
                  styles.confidenceText,
                  { color: getConfidenceColor(item.valuations[0].confidence_score) }
                ]}>
                  {Math.round(item.valuations[0].confidence_score * 100)}%
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return theme.colors.success;
    if (score >= 0.6) return theme.colors.warning;
    return theme.colors.error;
  };

  const renderCategoryFilter = () => (
    <FlatList
      data={categories}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.categoryList}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[
            styles.categoryButton,
            selectedCategory === item && styles.activeCategoryButton,
          ]}
          onPress={() => setSelectedCategory(item)}
        >
          <Text
            style={[
              styles.categoryButtonText,
              selectedCategory === item && styles.activeCategoryButtonText,
            ]}
          >
            {item}
          </Text>
        </TouchableOpacity>
      )}
      keyExtractor={(item) => item}
    />
  );

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <Icon name="search" size={20} color={theme.colors.textSecondary} />
      <TextInput
        style={styles.searchInput}
        placeholder="Search items..."
        placeholderTextColor={theme.colors.textSecondary}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      {searchQuery.length > 0 && (
        <TouchableOpacity onPress={() => setSearchQuery('')}>
          <Icon name="clear" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderOfflineMessage = () => {
    if (isOnline) return null;
    
    return (
      <View style={styles.offlineMessage}>
        <Icon name="cloud-off" size={16} color={theme.colors.warning} />
        <Text style={styles.offlineText}>
          Offline - Showing cached items
        </Text>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Icon name="inventory-2" size={64} color={theme.colors.textSecondary} />
      <Text style={styles.emptyTitle}>No Items Found</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery ? 
          `No items match "${searchQuery}"` : 
          'Start by adding items to your inventory'
        }
      </Text>
      {!searchQuery && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('Camera')}
        >
          <Icon name="add" size={20} color="white" />
          <Text style={styles.addButtonText}>Add Item</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Inventory</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('Scanner')}
          >
            <Icon name="qr-code-scanner" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('Camera')}
          >
            <Icon name="add" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {renderOfflineMessage()}
      {renderSearchBar()}
      {renderCategoryFilter()}

      {/* Items List */}
      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={itemsLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading items...</Text>
          </View>
        ) : (
          renderEmptyState()
        )}
        numColumns={2}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '600',
    color: theme.colors.text,
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: theme.spacing.xs,
    marginLeft: theme.spacing.sm,
  },
  offlineMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warning + '20',
    padding: theme.spacing.sm,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  offlineText: {
    marginLeft: theme.spacing.xs,
    fontSize: theme.fontSize.sm,
    color: theme.colors.warning,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    paddingVertical: theme.spacing.sm,
    marginLeft: theme.spacing.sm,
  },
  categoryList: {
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  categoryButton: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  activeCategoryButton: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  categoryButtonText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    fontWeight: '500',
  },
  activeCategoryButtonText: {
    color: 'white',
  },
  listContainer: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.md,
  },
  row: {
    justifyContent: 'space-between',
  },
  itemCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
    flex: 1,
    marginHorizontal: theme.spacing.xs / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  itemImageContainer: {
    height: 120,
    backgroundColor: theme.colors.background,
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  itemContent: {
    padding: theme.spacing.sm,
  },
  itemName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs / 2,
    lineHeight: 18,
  },
  itemCategory: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  itemDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    lineHeight: 16,
  },
  itemFooter: {
    marginTop: 'auto',
  },
  itemRoom: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs / 2,
  },
  itemRoomText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs / 2,
  },
  valuationInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  valuationValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.success,
  },
  confidenceBadge: {
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.xs / 2,
    borderRadius: theme.borderRadius.sm,
  },
  confidenceText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  loadingText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  emptySubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  addButtonText: {
    color: 'white',
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    marginLeft: theme.spacing.sm,
  },
});

export default InventoryScreen;
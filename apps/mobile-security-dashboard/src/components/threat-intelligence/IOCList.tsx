import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SearchBar, ButtonGroup, Button, Icon } from 'react-native-elements';
import { debounce } from 'lodash';

import {
  ThreatIndicator,
  IOCType,
  ConfidenceLevel,
  TLPLevel,
  ThreatIntelligenceFilter,
} from '../../types/security';
import IOCCard from './IOCCard';
import IOCFilterModal from './IOCFilterModal';

interface IOCListProps {
  iocs: ThreatIndicator[];
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
  onLoadMore?: () => void;
  onIOCPress?: (ioc: ThreatIndicator) => void;
  onBlockIOC?: (ioc: ThreatIndicator) => void;
  onWatchlistIOC?: (ioc: ThreatIndicator) => void;
  onMarkFalsePositive?: (ioc: ThreatIndicator) => void;
  filter?: ThreatIntelligenceFilter;
  onFilterChange?: (filter: ThreatIntelligenceFilter) => void;
  hasNextPage?: boolean;
  compact?: boolean;
  showActions?: boolean;
}

const VIEW_MODES = ['List', 'Compact'];
const SORT_OPTIONS = [
  { label: 'Recent', value: 'recent' },
  { label: 'Confidence', value: 'confidence' },
  { label: 'Type', value: 'type' },
  { label: 'TLP Level', value: 'tlp' },
];

export const IOCList: React.FC<IOCListProps> = ({
  iocs,
  loading = false,
  error,
  onRefresh,
  onLoadMore,
  onIOCPress,
  onBlockIOC,
  onWatchlistIOC,
  onMarkFalsePositive,
  filter,
  onFilterChange,
  hasNextPage = false,
  compact: initialCompact = false,
  showActions = true,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewModeIndex, setViewModeIndex] = useState(initialCompact ? 1 : 0);
  const [sortBy, setSortBy] = useState('recent');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const isCompactMode = viewModeIndex === 1;

  // Debounced search to avoid excessive filtering
  const debouncedSearch = useMemo(
    () => debounce((query: string) => {
      // In a real app, this would trigger a new API call with search parameters
      // For now, we'll just update the local search query
    }, 300),
    []
  );

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    debouncedSearch(query);
  }, [debouncedSearch]);

  // Filter and sort IOCs based on current settings
  const filteredAndSortedIOCs = useMemo(() => {
    let filtered = [...iocs];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ioc =>
        ioc.value.toLowerCase().includes(query) ||
        ioc.context.toLowerCase().includes(query) ||
        ioc.tags.some(tag => tag.toLowerCase().includes(query)) ||
        ioc.associatedThreats.some(threat =>
          threat.name.toLowerCase().includes(query)
        )
      );
    }

    // Apply active filter
    if (filter?.isActive !== undefined) {
      filtered = filtered.filter(ioc => ioc.isActive === filter.isActive);
    }

    // Apply IOC type filter
    if (filter?.iocTypes?.length) {
      filtered = filtered.filter(ioc => filter.iocTypes!.includes(ioc.type));
    }

    // Apply confidence level filter
    if (filter?.confidenceLevels?.length) {
      filtered = filtered.filter(ioc => filter.confidenceLevels!.includes(ioc.confidence));
    }

    // Apply TLP level filter
    if (filter?.tlpLevels?.length) {
      filtered = filtered.filter(ioc => filter.tlpLevels!.includes(ioc.tlpLevel));
    }

    // Apply tags filter
    if (filter?.tags?.length) {
      filtered = filtered.filter(ioc =>
        filter.tags!.some(tag => ioc.tags.includes(tag))
      );
    }

    // Sort the filtered results
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
        case 'confidence':
          const confidenceOrder = {
            [ConfidenceLevel.CONFIRMED]: 4,
            [ConfidenceLevel.HIGH]: 3,
            [ConfidenceLevel.MEDIUM]: 2,
            [ConfidenceLevel.LOW]: 1,
          };
          return confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
        case 'type':
          return a.type.localeCompare(b.type);
        case 'tlp':
          const tlpOrder = {
            [TLPLevel.RED]: 4,
            [TLPLevel.AMBER]: 3,
            [TLPLevel.GREEN]: 2,
            [TLPLevel.WHITE]: 1,
          };
          return tlpOrder[b.tlpLevel] - tlpOrder[a.tlpLevel];
        default:
          return 0;
      }
    });

    return filtered;
  }, [iocs, searchQuery, filter, sortBy]);

  const handleRefresh = useCallback(async () => {
    if (onRefresh) {
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
  }, [onRefresh]);

  const handleLoadMore = useCallback(async () => {
    if (hasNextPage && !loadingMore && onLoadMore) {
      setLoadingMore(true);
      try {
        await onLoadMore();
      } finally {
        setLoadingMore(false);
      }
    }
  }, [hasNextPage, loadingMore, onLoadMore]);

  const handleFilterApply = useCallback((newFilter: ThreatIntelligenceFilter) => {
    onFilterChange?.(newFilter);
    setShowFilterModal(false);
  }, [onFilterChange]);

  const renderIOCItem = useCallback(({ item }: { item: ThreatIndicator }) => (
    <IOCCard
      ioc={item}
      onPress={onIOCPress}
      onBlock={onBlockIOC}
      onWatchlist={onWatchlistIOC}
      onMarkFalsePositive={onMarkFalsePositive}
      showActions={showActions}
      compact={isCompactMode}
    />
  ), [onIOCPress, onBlockIOC, onWatchlistIOC, onMarkFalsePositive, showActions, isCompactMode]);

  const renderListHeader = () => (
    <View style={styles.header}>
      <SearchBar
        placeholder="Search IOCs..."
        value={searchQuery}
        onChangeText={handleSearch}
        containerStyle={styles.searchContainer}
        inputContainerStyle={styles.searchInputContainer}
        inputStyle={styles.searchInput}
        searchIcon={{ size: 20 }}
        clearIcon={{ size: 20 }}
        platform="default"
      />

      <View style={styles.controls}>
        <View style={styles.viewModeContainer}>
          <ButtonGroup
            buttons={VIEW_MODES}
            selectedIndex={viewModeIndex}
            onPress={setViewModeIndex}
            containerStyle={styles.buttonGroup}
            selectedButtonStyle={styles.selectedButton}
            textStyle={styles.buttonText}
            selectedTextStyle={styles.selectedButtonText}
          />
        </View>

        <View style={styles.sortAndFilterContainer}>
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => {
              // Show sort options modal or picker
              const currentIndex = SORT_OPTIONS.findIndex(opt => opt.value === sortBy);
              const nextIndex = (currentIndex + 1) % SORT_OPTIONS.length;
              setSortBy(SORT_OPTIONS[nextIndex].value);
            }}
          >
            <Icon name="sort" type="material" size={20} color="#3498db" />
            <Text style={styles.sortButtonText}>
              {SORT_OPTIONS.find(opt => opt.value === sortBy)?.label}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              filter && Object.keys(filter).length > 0 && styles.activeFilterButton
            ]}
            onPress={() => setShowFilterModal(true)}
          >
            <Icon name="filter-list" type="material" size={20} color="#3498db" />
            <Text style={styles.filterButtonText}>Filter</Text>
            {filter && Object.keys(filter).length > 0 && (
              <View style={styles.filterActiveIndicator} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.resultsInfo}>
        <Text style={styles.resultsCount}>
          {filteredAndSortedIOCs.length} IOCs
          {searchQuery && ` matching "${searchQuery}"`}
        </Text>
        {filter && Object.keys(filter).length > 0 && (
          <TouchableOpacity
            onPress={() => onFilterChange?.({})}
            style={styles.clearFiltersButton}
          >
            <Text style={styles.clearFiltersText}>Clear filters</Text>
            <Icon name="clear" type="material" size={16} color="#e74c3c" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderListFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.loadingMoreContainer}>
        <ActivityIndicator size="small" color="#3498db" />
        <Text style={styles.loadingMoreText}>Loading more IOCs...</Text>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Icon
        name="search-off"
        type="material"
        size={64}
        color="#bdc3c7"
      />
      <Text style={styles.emptyTitle}>
        {searchQuery ? 'No IOCs found' : 'No threat indicators'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery
          ? `No IOCs match your search for "${searchQuery}"`
          : 'There are no threat indicators to display'
        }
      </Text>
      {searchQuery && (
        <Button
          title="Clear search"
          buttonStyle={styles.clearSearchButton}
          titleStyle={styles.clearSearchButtonText}
          onPress={() => handleSearch('')}
        />
      )}
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Icon
        name="error-outline"
        type="material"
        size={64}
        color="#e74c3c"
      />
      <Text style={styles.errorTitle}>Failed to load IOCs</Text>
      <Text style={styles.errorSubtitle}>{error}</Text>
      <Button
        title="Retry"
        buttonStyle={styles.retryButton}
        titleStyle={styles.retryButtonText}
        onPress={handleRefresh}
        icon={{
          name: 'refresh',
          type: 'material',
          size: 20,
          color: '#fff',
        }}
      />
    </View>
  );

  if (error && !iocs.length) {
    return renderErrorState();
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredAndSortedIOCs}
        renderItem={renderIOCItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderListHeader}
        ListFooterComponent={renderListFooter}
        ListEmptyComponent={!loading ? renderEmptyState : null}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#3498db']}
            tintColor="#3498db"
            title="Pull to refresh"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        style={styles.list}
        contentContainerStyle={[
          styles.listContent,
          filteredAndSortedIOCs.length === 0 && styles.emptyListContent,
        ]}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={100}
        windowSize={10}
      />

      {loading && !refreshing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Loading IOCs...</Text>
        </View>
      )}

      <Modal
        visible={showFilterModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <IOCFilterModal
          filter={filter}
          onApply={handleFilterApply}
          onClose={() => setShowFilterModal(false)}
        />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyListContent: {
    flex: 1,
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  searchContainer: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    borderBottomWidth: 0,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchInputContainer: {
    backgroundColor: '#f1f2f6',
    borderRadius: 10,
  },
  searchInput: {
    fontSize: 16,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  viewModeContainer: {
    flex: 1,
    marginRight: 12,
  },
  buttonGroup: {
    height: 32,
    marginLeft: 0,
    marginRight: 0,
    marginTop: 0,
    marginBottom: 0,
    borderRadius: 8,
  },
  selectedButton: {
    backgroundColor: '#3498db',
  },
  buttonText: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  selectedButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  sortAndFilterContainer: {
    flexDirection: 'row',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ecf0f1',
    borderRadius: 8,
    marginRight: 8,
  },
  sortButtonText: {
    fontSize: 12,
    color: '#34495e',
    marginLeft: 4,
    fontWeight: 'bold',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ecf0f1',
    borderRadius: 8,
    position: 'relative',
  },
  activeFilterButton: {
    backgroundColor: '#dbeafe',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#34495e',
    marginLeft: 4,
    fontWeight: 'bold',
  },
  filterActiveIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3498db',
  },
  resultsInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  resultsCount: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearFiltersText: {
    fontSize: 12,
    color: '#e74c3c',
    marginRight: 4,
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingMoreText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#7f8c8d',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#34495e',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 24,
  },
  clearSearchButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 20,
  },
  clearSearchButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#e74c3c',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#34495e',
  },
});

export default IOCList;
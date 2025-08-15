import React, { useMemo, useCallback, memo } from 'react';
import {
  FlatList,
  VirtualizedList,
  ListRenderItem,
  ViewToken,
  FlatListProps,
  RefreshControl,
} from 'react-native';
import { PerformanceMonitor } from '../../services/performanceOptimizations';

interface VirtualizedListProps<T> extends Omit<FlatListProps<T>, 'data' | 'renderItem'> {
  data: T[];
  renderItem: ListRenderItem<T>;
  keyExtractor: (item: T, index: number) => string;
  itemHeight?: number;
  onEndReachedThreshold?: number;
  onEndReached?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  maxToRenderPerBatch?: number;
  updateCellsBatchingPeriod?: number;
  windowSize?: number;
  initialNumToRender?: number;
  removeClippedSubviews?: boolean;
}

function OptimizedVirtualizedList<T>({
  data,
  renderItem,
  keyExtractor,
  itemHeight = 100,
  onEndReachedThreshold = 0.1,
  onEndReached,
  refreshing = false,
  onRefresh,
  maxToRenderPerBatch = 10,
  updateCellsBatchingPeriod = 50,
  windowSize = 10,
  initialNumToRender = 20,
  removeClippedSubviews = true,
  ...otherProps
}: VirtualizedListProps<T>) {
  const performanceMonitor = PerformanceMonitor.getInstance();

  // Memoized render item to prevent unnecessary re-renders
  const memoizedRenderItem = useCallback<ListRenderItem<T>>(
    ({ item, index }) => {
      const startTime = Date.now();
      const result = renderItem({ item, index });
      const renderTime = Date.now() - startTime;
      
      if (renderTime > 16) { // More than 1 frame at 60fps
        console.warn(`Slow render for item ${index}: ${renderTime}ms`);
      }
      
      return result;
    },
    [renderItem]
  );

  // Optimized viewability configuration
  const viewabilityConfig = useMemo(
    () => ({
      itemVisiblePercentThreshold: 50,
      minimumViewTime: 300,
    }),
    []
  );

  // Track visible items for performance monitoring
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      performanceMonitor.trackApiCall(
        'VirtualizedList_ViewableItems',
        viewableItems.length
      );
    },
    [performanceMonitor]
  );

  // Optimized getItemLayout for better performance
  const getItemLayout = useCallback(
    (_data: T[] | null | undefined, index: number) => ({
      length: itemHeight,
      offset: itemHeight * index,
      index,
    }),
    [itemHeight]
  );

  // Refresh control with proper memoization
  const refreshControl = useMemo(
    () =>
      onRefresh ? (
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      ) : undefined,
    [refreshing, onRefresh]
  );

  // Performance optimization props
  const optimizationProps = useMemo(
    () => ({
      maxToRenderPerBatch,
      updateCellsBatchingPeriod,
      windowSize,
      initialNumToRender,
      removeClippedSubviews,
      getItemLayout: itemHeight > 0 ? getItemLayout : undefined,
      keyExtractor,
      onEndReachedThreshold,
      onEndReached,
      onViewableItemsChanged,
      viewabilityConfig,
      refreshControl,
    }),
    [
      maxToRenderPerBatch,
      updateCellsBatchingPeriod,
      windowSize,
      initialNumToRender,
      removeClippedSubviews,
      getItemLayout,
      keyExtractor,
      onEndReachedThreshold,
      onEndReached,
      onViewableItemsChanged,
      viewabilityConfig,
      refreshControl,
    ]
  );

  return (
    <FlatList
      data={data}
      renderItem={memoizedRenderItem}
      {...optimizationProps}
      {...otherProps}
    />
  );
}

export default memo(OptimizedVirtualizedList) as typeof OptimizedVirtualizedList;
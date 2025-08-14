import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { showToast } from '@/store/slices/uiSlice';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import {
  PanGestureHandler,
  TapGestureHandler,
  LongPressGestureHandler,
  State,
} from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

// Types
import { Widget, DashboardLayout } from '@/types/graphql';

// Components
import { WidgetCard } from './WidgetCard';
import { WidgetSkeleton } from './WidgetSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';

interface WidgetGridProps {
  widgets: Widget[];
  layout: DashboardLayout;
  isTablet: boolean;
  editable?: boolean;
  onWidgetPress?: (widget: Widget) => void;
  onWidgetLongPress?: (widget: Widget) => void;
  onWidgetMove?: (widgetId: string, newPosition: { x: number; y: number }) => void;
}

interface GridItem {
  widget: Widget;
  x: number;
  y: number;
  width: number;
  height: number;
  row: number;
  col: number;
}

const { width: screenWidth } = Dimensions.get('window');

export const WidgetGrid: React.FC<WidgetGridProps> = ({
  widgets,
  layout,
  isTablet,
  editable = false,
  onWidgetPress,
  onWidgetLongPress,
  onWidgetMove,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { colorScheme, hapticFeedbackEnabled } = useSelector((state: RootState) => state.ui);
  const { isLoadingWidget } = useSelector((state: RootState) => state.dashboard);

  // State
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);
  const [gridDimensions, setGridDimensions] = useState({ width: screenWidth - 32, height: 0 });

  // Calculate grid layout
  const gridConfig = useMemo(() => {
    const padding = 16;
    const margin = 8;
    const availableWidth = gridDimensions.width - (padding * 2);

    let columns: number;
    let itemWidth: number;

    if (layout === DashboardLayout.MASONRY) {
      columns = isTablet ? 3 : 2;
    } else if (layout === DashboardLayout.FLUID) {
      columns = isTablet ? 4 : 2;
    } else {
      // GRID layout
      columns = isTablet ? 4 : 2;
    }

    itemWidth = (availableWidth - (margin * (columns - 1))) / columns;

    return {
      columns,
      itemWidth,
      itemHeight: itemWidth * 0.75, // 4:3 aspect ratio
      margin,
      padding,
    };
  }, [layout, isTablet, gridDimensions.width]);

  // Process widgets into grid items
  const gridItems = useMemo((): GridItem[] => {
    if (layout === DashboardLayout.MASONRY) {
      return calculateMasonryLayout(widgets, gridConfig);
    } else if (layout === DashboardLayout.FLUID) {
      return calculateFluidLayout(widgets, gridConfig);
    } else {
      return calculateGridLayout(widgets, gridConfig);
    }
  }, [widgets, layout, gridConfig]);

  // Layout calculation functions
  const calculateGridLayout = (widgets: Widget[], config: typeof gridConfig): GridItem[] => {
    return widgets.map((widget, index) => {
      const row = Math.floor(index / config.columns);
      const col = index % config.columns;

      const x = col * (config.itemWidth + config.margin);
      const y = row * (config.itemHeight + config.margin);

      // Use widget's configured size if available
      const width = widget.size?.width
        ? Math.min(widget.size.width * config.itemWidth, config.itemWidth * 2)
        : config.itemWidth;
      const height = widget.size?.height
        ? Math.min(widget.size.height * config.itemHeight, config.itemHeight * 2)
        : config.itemHeight;

      return {
        widget,
        x,
        y,
        width,
        height,
        row,
        col,
      };
    });
  };

  const calculateFluidLayout = (widgets: Widget[], config: typeof gridConfig): GridItem[] => {
    const items: GridItem[] = [];
    let currentRow = 0;
    let currentCol = 0;
    let rowHeight = config.itemHeight;

    widgets.forEach(widget => {
      // Calculate widget dimensions based on content type
      const isWideWidget = widget.type === 'LINE_CHART' || widget.type === 'BAR_CHART';
      const isTallWidget = widget.type === 'TABLE';

      let width = config.itemWidth;
      let height = config.itemHeight;

      if (isWideWidget && currentCol + 1 < config.columns) {
        width = config.itemWidth * 2 + config.margin;
      }

      if (isTallWidget) {
        height = config.itemHeight * 1.5;
      }

      // Check if widget fits in current row
      const widthInColumns = Math.ceil(width / (config.itemWidth + config.margin));

      if (currentCol + widthInColumns > config.columns) {
        // Move to next row
        currentRow++;
        currentCol = 0;
        rowHeight = config.itemHeight;
      }

      const x = currentCol * (config.itemWidth + config.margin);
      const y = currentRow * (rowHeight + config.margin);

      items.push({
        widget,
        x,
        y,
        width,
        height,
        row: currentRow,
        col: currentCol,
      });

      currentCol += widthInColumns;
      rowHeight = Math.max(rowHeight, height);
    });

    return items;
  };

  const calculateMasonryLayout = (widgets: Widget[], config: typeof gridConfig): GridItem[] => {
    const items: GridItem[] = [];
    const columnHeights = new Array(config.columns).fill(0);

    widgets.forEach(widget => {
      // Find the shortest column
      const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));

      // Calculate dynamic height based on widget data
      const baseHeight = config.itemHeight;
      let height = baseHeight;

      if (widget.type === 'METRIC_CARD') {
        height = baseHeight * 0.7;
      } else if (widget.type === 'TABLE' && widget.data) {
        height = baseHeight * 1.2;
      } else if (widget.type === 'PIE_CHART') {
        height = baseHeight * 0.9;
      }

      const x = shortestColumnIndex * (config.itemWidth + config.margin);
      const y = columnHeights[shortestColumnIndex];

      items.push({
        widget,
        x,
        y,
        width: config.itemWidth,
        height,
        row: Math.floor(y / (config.itemHeight + config.margin)),
        col: shortestColumnIndex,
      });

      columnHeights[shortestColumnIndex] += height + config.margin;
    });

    return items;
  };

  // Gesture handlers
  const createGestureHandlers = (item: GridItem) => {
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const scale = useSharedValue(1);
    const zIndex = useSharedValue(0);

    const onLongPress = useCallback((event: any) => {
      if (event.nativeEvent.state === State.ACTIVE) {
        if (hapticFeedbackEnabled) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        if (editable) {
          setDraggedWidget(item.widget.id);
          scale.value = withSpring(1.1);
          zIndex.value = 1000;
        } else if (onWidgetLongPress) {
          runOnJS(onWidgetLongPress)(item.widget);
        }
      }
    }, [item.widget, editable, onWidgetLongPress, hapticFeedbackEnabled]);

    const onPan = useCallback((event: any) => {
      if (draggedWidget === item.widget.id) {
        translateX.value = event.nativeEvent.translationX;
        translateY.value = event.nativeEvent.translationY;
      }
    }, [draggedWidget, item.widget.id]);

    const onPanEnd = useCallback((event: any) => {
      if (draggedWidget === item.widget.id) {
        const newX = item.x + event.nativeEvent.translationX;
        const newY = item.y + event.nativeEvent.translationY;

        // Snap to grid
        const snappedPosition = snapToGrid(newX, newY, gridConfig);

        if (onWidgetMove && (snappedPosition.x !== item.x || snappedPosition.y !== item.y)) {
          runOnJS(onWidgetMove)(item.widget.id, snappedPosition);
        }

        // Animate back to original position (will be updated by layout recalculation)
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        scale.value = withSpring(1);
        zIndex.value = withTiming(0, { duration: 200 });

        runOnJS(setDraggedWidget)(null);
      }
    }, [draggedWidget, item, onWidgetMove, gridConfig]);

    const onTap = useCallback((event: any) => {
      if (event.nativeEvent.state === State.END && onWidgetPress) {
        runOnJS(onWidgetPress)(item.widget);
      }
    }, [item.widget, onWidgetPress]);

    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [
          { translateX: translateX.value },
          { translateY: translateY.value },
          { scale: scale.value },
        ],
        zIndex: zIndex.value,
        elevation: Platform.OS === 'android' ? zIndex.value : 0,
      };
    });

    return {
      onLongPress,
      onPan,
      onPanEnd,
      onTap,
      animatedStyle,
    };
  };

  const snapToGrid = (x: number, y: number, config: typeof gridConfig) => {
    const col = Math.round(x / (config.itemWidth + config.margin));
    const row = Math.round(y / (config.itemHeight + config.margin));

    return {
      x: Math.max(0, Math.min(col, config.columns - 1)) * (config.itemWidth + config.margin),
      y: Math.max(0, row) * (config.itemHeight + config.margin),
    };
  };

  // Handle grid layout measurement
  const onGridLayout = useCallback((event: any) => {
    const { width, height } = event.nativeEvent.layout;
    setGridDimensions({ width, height });
  }, []);

  // Render empty state
  if (widgets.length === 0) {
    return (
      <EmptyState
        title="No Widgets"
        message="This dashboard doesn't have any widgets yet."
        icon="analytics-outline"
        onAction={() => {
          dispatch(showToast({
            type: 'info',
            title: 'Add Widgets',
            message: 'Tap the edit button to add widgets to this dashboard',
            duration: 3000,
          }));
        }}
        actionLabel="Learn More"
      />
    );
  }

  const isDarkMode = colorScheme === 'dark';
  const containerHeight = Math.max(
    ...gridItems.map(item => item.y + item.height)
  ) + gridConfig.padding;

  return (
    <View
      style={[
        styles.container,
        {
          height: containerHeight,
          backgroundColor: isDarkMode ? '#000000' : '#F2F2F7',
        },
      ]}
      onLayout={onGridLayout}
    >
      {gridItems.map((item) => {
        const {
          onLongPress,
          onPan,
          onPanEnd,
          onTap,
          animatedStyle,
        } = createGestureHandlers(item);

        const isLoading = isLoadingWidget[item.widget.id] || false;

        return (
          <TapGestureHandler
            key={item.widget.id}
            onHandlerStateChange={onTap}
            shouldCancelWhenOutside={true}
          >
            <LongPressGestureHandler
              onHandlerStateChange={onLongPress}
              minDurationMs={500}
            >
              <PanGestureHandler
                onGestureEvent={onPan}
                onHandlerStateChange={onPanEnd}
                enabled={editable}
              >
                <Animated.View
                  style={[
                    styles.widgetContainer,
                    {
                      left: item.x + gridConfig.padding,
                      top: item.y + gridConfig.padding,
                      width: item.width,
                      height: item.height,
                    },
                    animatedStyle,
                  ]}
                >
                  {isLoading ? (
                    <WidgetSkeleton
                      width={item.width}
                      height={item.height}
                      type={item.widget.type}
                    />
                  ) : (
                    <WidgetCard
                      widget={item.widget}
                      width={item.width}
                      height={item.height}
                      isDragging={draggedWidget === item.widget.id}
                      showTitle={true}
                      interactive={!editable}
                    />
                  )}
                </Animated.View>
              </PanGestureHandler>
            </LongPressGestureHandler>
          </TapGestureHandler>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
  },
  widgetContainer: {
    position: 'absolute',
  },
});

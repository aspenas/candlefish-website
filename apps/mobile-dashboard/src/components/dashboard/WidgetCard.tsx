import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

// Types
import { Widget, WidgetStatus } from '@/types/graphql';

// Components
import { ChartRenderer } from '@/components/charts/ChartRenderer';

interface WidgetCardProps {
  widget: Widget;
  width: number;
  height: number;
  isDragging?: boolean;
  showTitle?: boolean;
  interactive?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}

export const WidgetCard: React.FC<WidgetCardProps> = ({
  widget,
  width,
  height,
  isDragging = false,
  showTitle = true,
  interactive = true,
  onPress,
  onLongPress,
}) => {
  const { colorScheme } = useSelector((state: RootState) => state.ui);
  const [isPressed, setIsPressed] = useState(false);

  // Animation values
  const pressScale = useSharedValue(1);
  const dragOpacity = useSharedValue(1);

  const isDarkMode = colorScheme === 'dark';

  // Colors based on theme
  const colors = useMemo(() => ({
    background: isDarkMode ? '#1C1C1E' : '#FFFFFF',
    secondaryBackground: isDarkMode ? '#2C2C2E' : '#F2F2F7',
    text: isDarkMode ? '#FFFFFF' : '#000000',
    secondaryText: isDarkMode ? '#8E8E93' : '#8E8E93',
    border: isDarkMode ? '#38383A' : '#E5E5EA',
    error: '#FF3B30',
    warning: '#FF9500',
    success: '#34C759',
    accent: '#007AFF',
  }), [isDarkMode]);

  // Status indicator
  const getStatusColor = (status: WidgetStatus) => {
    switch (status) {
      case WidgetStatus.READY:
        return colors.success;
      case WidgetStatus.LOADING:
        return colors.warning;
      case WidgetStatus.ERROR:
        return colors.error;
      case WidgetStatus.EMPTY:
        return colors.secondaryText;
      case WidgetStatus.CACHED:
        return colors.accent;
      default:
        return colors.secondaryText;
    }
  };

  const getStatusIcon = (status: WidgetStatus) => {
    switch (status) {
      case WidgetStatus.READY:
        return 'checkmark-circle';
      case WidgetStatus.LOADING:
        return 'time';
      case WidgetStatus.ERROR:
        return 'alert-circle';
      case WidgetStatus.EMPTY:
        return 'remove-circle';
      case WidgetStatus.CACHED:
        return 'cloud-offline';
      default:
        return 'help-circle';
    }
  };

  // Handle press animations
  const handlePressIn = () => {
    if (interactive) {
      setIsPressed(true);
      pressScale.value = withSpring(0.95);
    }
  };

  const handlePressOut = () => {
    if (interactive) {
      setIsPressed(false);
      pressScale.value = withSpring(1);
    }
  };

  // Update drag opacity
  React.useEffect(() => {
    dragOpacity.value = isDragging ? withTiming(0.7) : withTiming(1);
  }, [isDragging]);

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pressScale.value }],
      opacity: dragOpacity.value,
    };
  });

  // Card content based on widget type and status
  const renderContent = () => {
    if (widget.status === WidgetStatus.LOADING) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={colors.accent}
          />
          <Text style={[styles.loadingText, { color: colors.secondaryText }]}>
            Loading...
          </Text>
        </View>
      );
    }

    if (widget.status === WidgetStatus.ERROR) {
      return (
        <View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle"
            size={32}
            color={colors.error}
          />
          <Text style={[styles.errorTitle, { color: colors.text }]}>
            Error
          </Text>
          <Text style={[styles.errorMessage, { color: colors.secondaryText }]}>
            {widget.error || 'Failed to load data'}
          </Text>
        </View>
      );
    }

    if (widget.status === WidgetStatus.EMPTY || !widget.data) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="bar-chart-outline"
            size={32}
            color={colors.secondaryText}
          />
          <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
            No data available
          </Text>
        </View>
      );
    }

    // Render chart
    return (
      <ChartRenderer
        widget={widget}
        width={width - 32}
        height={height - (showTitle ? 80 : 40)}
        showLabels={true}
        interactive={interactive}
      />
    );
  };

  // Calculate card elevation based on widget importance
  const elevation = widget.type === 'METRIC_CARD' ? 4 : 2;

  // Gradient background for metric cards
  const shouldUseGradient = widget.type === 'METRIC_CARD' && widget.data?.summary?.trend;
  const gradientColors = shouldUseGradient ? [
    widget.data?.summary?.trend === 'UP' ? '#34C759' : '#FF3B30',
    colors.background,
  ] : [colors.background, colors.background];

  return (
    <Animated.View style={[animatedStyle]}>
      <TouchableOpacity
        activeOpacity={interactive ? 0.7 : 1}
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={!interactive}
        style={[
          styles.container,
          {
            width,
            height,
            backgroundColor: colors.background,
            borderColor: colors.border,
            shadowColor: isDarkMode ? '#000000' : '#000000',
            elevation,
          },
          isDragging && styles.dragging,
        ]}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Header */}
        {showTitle && (
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Text
                style={[styles.title, { color: colors.text }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {widget.name}
              </Text>
              {widget.description && (
                <Text
                  style={[styles.description, { color: colors.secondaryText }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {widget.description}
                </Text>
              )}
            </View>

            <View style={styles.statusContainer}>
              {/* Last updated indicator */}
              {widget.lastUpdated && (
                <Text style={[styles.lastUpdated, { color: colors.secondaryText }]}>
                  {formatLastUpdated(widget.lastUpdated)}
                </Text>
              )}

              {/* Status indicator */}
              <View style={styles.statusIndicator}>
                <Ionicons
                  name={getStatusIcon(widget.status)}
                  size={12}
                  color={getStatusColor(widget.status)}
                />
              </View>
            </View>
          </View>
        )}

        {/* Content */}
        <View style={styles.content}>
          {renderContent()}
        </View>

        {/* Footer with additional info */}
        {widget.loadTime && (
          <View style={styles.footer}>
            <Text style={[styles.loadTime, { color: colors.secondaryText }]}>
              {widget.loadTime}ms
            </Text>
            {widget.data?.rowCount && (
              <Text style={[styles.rowCount, { color: colors.secondaryText }]}>
                {widget.data.rowCount} rows
              </Text>
            )}
          </View>
        )}

        {/* Cached indicator */}
        {widget.status === WidgetStatus.CACHED && (
          <View style={[styles.cachedBadge, { backgroundColor: colors.accent }]}>
            <Ionicons name="cloud-offline" size={12} color="white" />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// Helper function to format last updated time
const formatLastUpdated = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) {
    return 'Just now';
  } else if (minutes < 60) {
    return `${minutes}m ago`;
  } else if (hours < 24) {
    return `${hours}h ago`;
  } else if (days < 7) {
    return `${days}d ago`;
  } else {
    return date.toLocaleDateString();
  }
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dragging: {
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 12,
    paddingBottom: 8,
  },
  titleContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  lastUpdated: {
    fontSize: 10,
    lineHeight: 12,
    marginBottom: 2,
  },
  statusIndicator: {
    padding: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  loadTime: {
    fontSize: 10,
  },
  rowCount: {
    fontSize: 10,
  },
  cachedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 10,
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
  },
});

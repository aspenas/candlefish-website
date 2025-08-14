import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Share,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import {
  PinchGestureHandler,
  PanGestureHandler,
  TapGestureHandler,
  State,
} from 'react-native-gesture-handler';

// Store
import { RootState, AppDispatch } from '@/store';
import {
  fetchDashboard,
  refreshDashboard,
  updateDashboardFilters,
  setAutoRefresh,
} from '@/store/slices/dashboardSlice';
import { showToast } from '@/store/slices/uiSlice';

// Types
import { DashboardStackParamList } from '@/navigation/MainNavigator';
import { Widget } from '@/types/graphql';

// Components
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { WidgetGrid } from '@/components/dashboard/WidgetGrid';
import { FilterBar } from '@/components/dashboard/FilterBar';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorView } from '@/components/ui/ErrorView';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';

type DashboardDetailScreenNavigationProp = StackNavigationProp<
  DashboardStackParamList,
  'DashboardDetail'
>;

type DashboardDetailScreenRouteProp = {
  key: string;
  name: 'DashboardDetail';
  params: { dashboardId: string };
};

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const DashboardDetailScreen: React.FC = () => {
  const route = useRoute<DashboardDetailScreenRouteProp>();
  const navigation = useNavigation<DashboardDetailScreenNavigationProp>();
  const dispatch = useDispatch<AppDispatch>();

  const { dashboardId } = route.params;

  // State
  const { currentDashboard, isLoading, error, autoRefresh, refreshInterval } = useSelector(
    (state: RootState) => state.dashboard
  );
  const { colorScheme, isTablet } = useSelector((state: RootState) => state.ui);
  const { isOnline } = useSelector((state: RootState) => state.offline);

  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [autoRefreshTimer, setAutoRefreshTimer] = useState<NodeJS.Timeout | null>(null);

  // Gesture animations
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const fabOpacity = useSharedValue(1);

  // Load dashboard
  useEffect(() => {
    dispatch(fetchDashboard({ dashboardId }));
  }, [dispatch, dashboardId]);

  // Set up auto-refresh
  useEffect(() => {
    if (autoRefresh && refreshInterval && isOnline) {
      const timer = setInterval(() => {
        dispatch(refreshDashboard(dashboardId));
      }, refreshInterval);

      setAutoRefreshTimer(timer);

      return () => {
        if (timer) clearInterval(timer);
      };
    } else {
      if (autoRefreshTimer) {
        clearInterval(autoRefreshTimer);
        setAutoRefreshTimer(null);
      }
    }
  }, [autoRefresh, refreshInterval, isOnline, dashboardId, dispatch]);

  // Update navigation title
  useEffect(() => {
    if (currentDashboard) {
      navigation.setOptions({
        title: currentDashboard.name,
        headerRight: () => (
          <View style={styles.headerButtons}>
            <HeaderButton
              icon="share-outline"
              onPress={handleShare}
              disabled={!isOnline}
            />
            <HeaderButton
              icon="create-outline"
              onPress={handleEdit}
            />
            <HeaderButton
              icon="ellipsis-horizontal"
              onPress={handleMoreOptions}
            />
          </View>
        ),
      });
    }
  }, [currentDashboard, navigation, isOnline]);

  // Focus effect for refresh
  useFocusEffect(
    useCallback(() => {
      if (currentDashboard) {
        dispatch(refreshDashboard(dashboardId));
      }
    }, [dispatch, dashboardId, currentDashboard])
  );

  // Handlers
  const handleRefresh = useCallback(async () => {
    if (!isOnline) {
      dispatch(showToast({
        type: 'warning',
        title: 'Offline Mode',
        message: 'Cannot refresh while offline',
        duration: 3000,
      }));
      return;
    }

    setRefreshing(true);
    try {
      await dispatch(refreshDashboard(dashboardId)).unwrap();
      dispatch(showToast({
        type: 'success',
        title: 'Dashboard Refreshed',
        duration: 2000,
      }));
    } catch (error) {
      dispatch(showToast({
        type: 'error',
        title: 'Refresh Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        duration: 3000,
      }));
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, dashboardId, isOnline]);

  const handleShare = useCallback(async () => {
    if (!currentDashboard) return;

    try {
      const shareUrl = `https://app.candlefish.ai/dashboard/${dashboardId}`;
      const result = await Share.share({
        message: Platform.OS === 'ios'
          ? `Check out this dashboard: ${currentDashboard.name}`
          : shareUrl,
        url: shareUrl,
        title: currentDashboard.name,
      });

      if (result.action === Share.sharedAction) {
        dispatch(showToast({
          type: 'success',
          title: 'Dashboard Shared',
          duration: 2000,
        }));
      }
    } catch (error) {
      dispatch(showToast({
        type: 'error',
        title: 'Share Failed',
        message: 'Could not share dashboard',
        duration: 3000,
      }));
    }
  }, [currentDashboard, dashboardId, dispatch]);

  const handleEdit = useCallback(() => {
    navigation.navigate('DashboardEdit', { dashboardId });
  }, [navigation, dashboardId]);

  const handleMoreOptions = useCallback(() => {
    Alert.alert(
      'Dashboard Options',
      undefined,
      [
        {
          text: autoRefresh ? 'Disable Auto-refresh' : 'Enable Auto-refresh',
          onPress: () => {
            dispatch(setAutoRefresh(!autoRefresh));
            dispatch(showToast({
              type: 'info',
              title: `Auto-refresh ${!autoRefresh ? 'enabled' : 'disabled'}`,
              duration: 2000,
            }));
          },
        },
        {
          text: showFilters ? 'Hide Filters' : 'Show Filters',
          onPress: () => setShowFilters(!showFilters),
        },
        {
          text: 'Export Dashboard',
          onPress: handleExport,
          style: 'default',
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  }, [autoRefresh, showFilters, dispatch, handleExport]);

  const handleExport = useCallback(() => {
    Alert.alert(
      'Export Dashboard',
      'Choose export format',
      [
        { text: 'PDF', onPress: () => exportDashboard('PDF') },
        { text: 'PNG Image', onPress: () => exportDashboard('PNG') },
        { text: 'Excel Data', onPress: () => exportDashboard('EXCEL') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, []);

  const exportDashboard = useCallback(async (format: 'PDF' | 'PNG' | 'EXCEL') => {
    try {
      // This would call the dashboard service export function
      dispatch(showToast({
        type: 'info',
        title: 'Export Started',
        message: `Exporting dashboard as ${format}...`,
        duration: 3000,
      }));
    } catch (error) {
      dispatch(showToast({
        type: 'error',
        title: 'Export Failed',
        message: 'Could not export dashboard',
        duration: 3000,
      }));
    }
  }, [dispatch]);

  const handleFilterChange = useCallback((filters: Record<string, any>) => {
    dispatch(updateDashboardFilters({ dashboardId, filters }));
  }, [dispatch, dashboardId]);

  // Gesture handlers
  const onPinchGestureEvent = useCallback((event: any) => {
    scale.value = event.nativeEvent.scale;
  }, [scale]);

  const onPinchStateChange = useCallback((event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      scale.value = withSpring(1);
    }
  }, [scale]);

  const onPanGestureEvent = useCallback((event: any) => {
    if (scale.value > 1) {
      translateX.value = event.nativeEvent.translationX;
      translateY.value = event.nativeEvent.translationY;
    }
  }, [scale, translateX, translateY]);

  const onPanStateChange = useCallback((event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    }
  }, [translateX, translateY]);

  const onDoubleTap = useCallback((event: any) => {
    if (scale.value > 1) {
      scale.value = withSpring(1);
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    } else {
      scale.value = withSpring(2);
      const { x, y } = event.nativeEvent;
      translateX.value = withSpring((screenWidth / 2 - x) * 2);
      translateY.value = withSpring((screenHeight / 2 - y) * 2);
    }
  }, [scale, translateX, translateY]);

  const onScroll = useCallback((event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const velocity = event.nativeEvent.velocity?.y || 0;

    // Hide/show FAB based on scroll direction
    if (velocity > 0) {
      // Scrolling down
      fabOpacity.value = withTiming(0, { duration: 200 });
    } else if (velocity < 0) {
      // Scrolling up
      fabOpacity.value = withTiming(1, { duration: 200 });
    }
  }, [fabOpacity]);

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { translateX: translateX.value },
        { translateY: translateY.value },
      ],
    };
  });

  const fabAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: fabOpacity.value,
      transform: [
        {
          scale: interpolate(
            fabOpacity.value,
            [0, 1],
            [0.8, 1]
          ),
        },
      ],
    };
  });

  // Render loading state
  if (isLoading && !currentDashboard) {
    return <LoadingScreen />;
  }

  // Render error state
  if (error && !currentDashboard) {
    return (
      <ErrorView
        title="Dashboard Not Found"
        message={error}
        onRetry={() => dispatch(fetchDashboard({ dashboardId }))}
      />
    );
  }

  if (!currentDashboard) {
    return (
      <ErrorView
        title="Dashboard Not Found"
        message="The requested dashboard could not be loaded."
        onRetry={() => dispatch(fetchDashboard({ dashboardId }))}
      />
    );
  }

  const isDarkMode = colorScheme === 'dark';

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <DashboardHeader
        dashboard={currentDashboard}
        isOnline={isOnline}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

      {showFilters && currentDashboard.filters.length > 0 && (
        <FilterBar
          filters={currentDashboard.filters}
          onFiltersChange={handleFilterChange}
        />
      )}

      <TapGestureHandler
        numberOfTaps={2}
        onHandlerStateChange={onDoubleTap}
      >
        <PanGestureHandler
          onGestureEvent={onPanGestureEvent}
          onHandlerStateChange={onPanStateChange}
        >
          <PinchGestureHandler
            onGestureEvent={onPinchGestureEvent}
            onHandlerStateChange={onPinchStateChange}
          >
            <Animated.View style={[styles.content, animatedStyle]}>
              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    tintColor={isDarkMode ? '#FFFFFF' : '#000000'}
                    colors={['#007AFF']}
                  />
                }
                showsVerticalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={16}
              >
                <WidgetGrid
                  widgets={currentDashboard.widgets}
                  layout={currentDashboard.layout}
                  isTablet={isTablet}
                  onWidgetPress={(widget) => {
                    // Handle widget interaction
                    console.log('Widget pressed:', widget.id);
                  }}
                />
              </ScrollView>
            </Animated.View>
          </PinchGestureHandler>
        </PanGestureHandler>
      </TapGestureHandler>

      <Animated.View style={[styles.fab, fabAnimatedStyle]}>
        <FloatingActionButton
          icon="refresh"
          onPress={handleRefresh}
          disabled={!isOnline || refreshing}
          loading={refreshing}
        />
      </Animated.View>
    </SafeAreaView>
  );
};

// Header button component
interface HeaderButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
}

const HeaderButton: React.FC<HeaderButtonProps> = ({ icon, onPress, disabled }) => {
  const { colorScheme } = useSelector((state: RootState) => state.ui);
  const isDarkMode = colorScheme === 'dark';

  return (
    <View style={styles.headerButton}>
      <Ionicons
        name={icon}
        size={24}
        color={disabled ? '#8E8E93' : (isDarkMode ? '#007AFF' : '#007AFF')}
        onPress={disabled ? undefined : onPress}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  containerDark: {
    backgroundColor: '#000000',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  headerButton: {
    marginLeft: 16,
    padding: 4,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
});

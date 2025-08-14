import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useSubscription } from '@apollo/client';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';

// GraphQL
import {
  GET_DASHBOARD_QUERY,
  DASHBOARD_REAL_TIME_SUBSCRIPTION
} from '@/graphql/dashboard';

// Components
import { WidgetCard } from '@/components/dashboard/WidgetCard';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorView } from '@/components/ui/ErrorView';

// Services
import { NetworkService } from '@/services/network';
import { NotificationService } from '@/services/notifications';

// Types
import { Dashboard, Widget } from '@/types/graphql';

// Hooks
import { useTheme } from '@/hooks/useTheme';
import { useOrientation } from '@/hooks/useOrientation';

interface DashboardScreenProps {
  route: {
    params: {
      dashboardId: string;
      organizationId: string;
    };
  };
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ route }) => {
  const { dashboardId, organizationId } = route.params;
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { orientation, dimensions } = useOrientation();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);
  const [widgetLayouts, setWidgetLayouts] = useState<Map<string, any>>(new Map());

  // Dashboard query
  const {
    data,
    loading,
    error,
    refetch,
    networkStatus
  } = useQuery(GET_DASHBOARD_QUERY, {
    variables: { dashboardId },
    notifyOnNetworkStatusChange: true,
    errorPolicy: 'all',
  });

  // Real-time subscription
  const { data: realtimeData } = useSubscription(DASHBOARD_REAL_TIME_SUBSCRIPTION, {
    variables: { dashboardId },
    onError: (error) => {
      console.log('Real-time subscription error:', error);
    }
  });

  const dashboard: Dashboard | undefined = data?.dashboard;

  // Network status monitoring
  useEffect(() => {
    const unsubscribe = NetworkService.onNetworkChange((online) => {
      setIsOnline(online);
      if (online && !loading) {
        // Auto-refresh when coming back online
        refetch();
      }
    });

    return unsubscribe;
  }, [refetch, loading]);

  // Focus effect for refreshing data
  useFocusEffect(
    useCallback(() => {
      if (!loading && isOnline) {
        refetch();
      }
    }, [refetch, loading, isOnline])
  );

  // Handle real-time updates
  useEffect(() => {
    if (realtimeData?.dashboardRealTime) {
      const { type, widgetId, data: widgetData } = realtimeData.dashboardRealTime;

      if (type === 'WIDGET_UPDATE' && widgetId) {
        // Show notification for critical updates
        if (widgetData?.severity === 'critical' || widgetData?.severity === 'high') {
          NotificationService.scheduleLocalNotification({
            title: 'Critical Alert',
            body: `Widget ${widgetData.name || widgetId} requires attention`,
            data: { type: 'widget_alert', dashboardId, widgetId },
          });
        }
      }
    }
  }, [realtimeData, dashboardId]);

  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Please check your internet connection and try again.');
      return;
    }

    setIsRefreshing(true);
    try {
      await refetch();
    } catch (error) {
      console.error('Failed to refresh dashboard:', error);
      Alert.alert('Refresh Failed', 'Unable to refresh dashboard data.');
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch, isOnline]);

  // Widget layout calculations
  const calculateWidgetLayout = useCallback((widgets: Widget[]) => {
    const layouts = new Map();
    const isLandscape = orientation === 'landscape';
    const availableWidth = dimensions.width - 32; // Account for padding
    const columnsPerRow = isLandscape ? 2 : 1;
    const widgetWidth = (availableWidth - (columnsPerRow - 1) * 16) / columnsPerRow;

    widgets.forEach((widget, index) => {
      const row = Math.floor(index / columnsPerRow);
      const col = index % columnsPerRow;

      layouts.set(widget.id, {
        width: widgetWidth,
        height: calculateWidgetHeight(widget, widgetWidth),
        x: col * (widgetWidth + 16),
        y: row * (200 + 16), // Base height + margin
        row,
        col,
      });
    });

    setWidgetLayouts(layouts);
  }, [orientation, dimensions]);

  const calculateWidgetHeight = (widget: Widget, width: number): number => {
    const baseHeight = 200;

    // Adjust height based on widget type
    switch (widget.type) {
      case 'line-chart':
      case 'bar-chart':
      case 'area-chart':
        return Math.max(baseHeight, width * 0.6);
      case 'pie-chart':
      case 'donut-chart':
        return width; // Square for circular charts
      case 'metric':
      case 'kpi':
        return baseHeight * 0.7;
      case 'table':
        return baseHeight * 1.5;
      case 'map':
        return width; // Square for maps
      default:
        return baseHeight;
    }
  };

  // Update layouts when widgets or orientation changes
  useEffect(() => {
    if (dashboard?.widgets) {
      calculateWidgetLayout(dashboard.widgets);
    }
  }, [dashboard?.widgets, calculateWidgetLayout]);

  // Handle widget selection
  const handleWidgetPress = useCallback((widget: Widget) => {
    setSelectedWidget(widget.id);
    navigation.navigate('WidgetDetail', {
      widgetId: widget.id,
      dashboardId,
      organizationId,
    });
  }, [navigation, dashboardId, organizationId]);

  const handleWidgetLongPress = useCallback((widget: Widget) => {
    Alert.alert(
      widget.name || 'Widget',
      'Widget Options',
      [
        { text: 'View Details', onPress: () => handleWidgetPress(widget) },
        { text: 'Share', onPress: () => handleShareWidget(widget) },
        { text: 'Export', onPress: () => handleExportWidget(widget) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, [handleWidgetPress]);

  const handleShareWidget = useCallback(async (widget: Widget) => {
    // Implement widget sharing
    console.log('Share widget:', widget.id);
  }, []);

  const handleExportWidget = useCallback(async (widget: Widget) => {
    // Implement widget export
    console.log('Export widget:', widget.id);
  }, []);

  // Render loading state
  if (loading && !data) {
    return <LoadingScreen message="Loading dashboard..." />;
  }

  // Render error state
  if (error && !data) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ErrorView
          error={error}
          onRetry={refetch}
          showRetry={isOnline}
        />
      </SafeAreaView>
    );
  }

  if (!dashboard) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.centerContent}>
          <Text style={[styles.errorText, { color: theme.colors.text }]}>
            Dashboard not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isPortrait = orientation === 'portrait';
  const widgets = dashboard.widgets || [];

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: theme.colors.background }
      ]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style={theme.dark ? 'light' : 'dark'} />

      <DashboardHeader
        dashboard={dashboard}
        isOnline={isOnline}
        onSettingsPress={() => navigation.navigate('DashboardSettings', { dashboardId })}
        onSharePress={() => navigation.navigate('ShareDashboard', { dashboardId })}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: Platform.OS === 'ios' ? 20 : 40 }
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
            title="Pull to refresh"
            titleColor={theme.colors.text}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Offline indicator */}
        {!isOnline && (
          <View style={[styles.offlineBar, { backgroundColor: theme.colors.warning }]}>
            <Text style={styles.offlineText}>You're offline. Showing cached data.</Text>
          </View>
        )}

        {/* Widgets grid */}
        <View style={[
          styles.widgetsContainer,
          isPortrait ? styles.portraitLayout : styles.landscapeLayout
        ]}>
          {widgets.map((widget) => {
            const layout = widgetLayouts.get(widget.id);

            return (
              <View
                key={widget.id}
                style={[
                  styles.widgetWrapper,
                  layout && {
                    width: layout.width,
                    minHeight: layout.height,
                  },
                  isPortrait && styles.portraitWidget,
                  !isPortrait && styles.landscapeWidget,
                ]}
              >
                <WidgetCard
                  widget={widget}
                  layout={layout}
                  isSelected={selectedWidget === widget.id}
                  onPress={() => handleWidgetPress(widget)}
                  onLongPress={() => handleWidgetLongPress(widget)}
                  optimizeForMobile
                />
              </View>
            );
          })}
        </View>

        {widgets.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No widgets configured for this dashboard.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginHorizontal: 32,
  },
  offlineBar: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  offlineText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  widgetsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  portraitLayout: {
    flexDirection: 'column',
  },
  landscapeLayout: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  widgetWrapper: {
    marginBottom: 16,
  },
  portraitWidget: {
    width: '100%',
  },
  landscapeWidget: {
    width: '48%',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginHorizontal: 32,
  },
});

export default DashboardScreen;

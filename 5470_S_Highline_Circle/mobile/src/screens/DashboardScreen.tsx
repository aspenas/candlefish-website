import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useQuery } from 'react-query';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../providers/ThemeProvider';
import { useAuth } from '../providers/AuthProvider';
import { useOffline } from '../providers/OfflineProvider';
import { TabNavigationProps } from '../types/navigation';
import { PerformanceService } from '../services/performance';
import ValuationCard from '../components/ValuationCard';
import PriceHistoryChart from '../components/PriceHistoryChart';

// Mock API service - replace with actual GraphQL client
import { apiService } from '../services/api';

interface DashboardStats {
  totalItems: number;
  totalValue: number;
  itemsWithValuations: number;
  recentValuations: number;
  portfolioChange: number;
  portfolioChangePercent: number;
}

const { width: screenWidth } = Dimensions.get('window');

const DashboardScreen: React.FC<TabNavigationProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { isOnline, syncStatus } = useOffline();
  const styles = createStyles(theme);
  const [refreshing, setRefreshing] = useState(false);

  // Track screen performance
  useEffect(() => {
    const startTime = Date.now();
    
    return () => {
      const loadTime = Date.now() - startTime;
      PerformanceService.recordScreenMetrics({
        screen: 'Dashboard',
        loadTime,
        renderTime: loadTime, // Simplified for demo
        memoryUsage: 0, // Would need native module
        batteryLevel: 0, // Would need native module
        timestamp: new Date(),
      });
    };
  }, []);

  const {
    data: dashboardStats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useQuery(
    'dashboardStats',
    () => apiService.getDashboardStats(),
    {
      refetchOnMount: true,
      refetchOnWindowFocus: true,
    }
  );

  const {
    data: recentValuations,
    isLoading: valuationsLoading,
    refetch: refetchValuations,
  } = useQuery(
    'recentValuations',
    () => apiService.getRecentValuations(5),
    {
      refetchOnMount: true,
    }
  );

  const {
    data: portfolioHistory,
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = useQuery(
    'portfolioHistory',
    () => apiService.getPortfolioHistory(30), // Last 30 days
    {
      refetchOnMount: true,
    }
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchStats(),
      refetchValuations(),
      refetchHistory(),
    ]);
    setRefreshing(false);
  };

  const renderStatCard = (
    title: string,
    value: string | number,
    icon: string,
    color: string,
    subtitle?: string
  ) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <Icon name={icon} size={24} color={color} />
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => navigation.navigate('Camera')}
        >
          <Icon name="camera-alt" size={32} color={theme.colors.primary} />
          <Text style={styles.quickActionText}>Capture Item</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => navigation.navigate('Scanner')}
        >
          <Icon name="qr-code-scanner" size={32} color={theme.colors.primary} />
          <Text style={styles.quickActionText}>Scan QR/Barcode</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => navigation.navigate('Valuations')}
        >
          <Icon name="trending-up" size={32} color={theme.colors.primary} />
          <Text style={styles.quickActionText}>View Valuations</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => navigation.navigate('Inventory')}
        >
          <Icon name="inventory" size={32} color={theme.colors.primary} />
          <Text style={styles.quickActionText}>Inventory</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderOfflineStatus = () => {
    if (isOnline) return null;
    
    return (
      <View style={styles.offlineStatus}>
        <Icon name="cloud-off" size={16} color={theme.colors.warning} />
        <Text style={styles.offlineText}>
          Offline - {syncStatus.pendingCount} items pending sync
        </Text>
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}
          </Text>
          <Text style={styles.username}>{user?.name || 'User'}</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('Settings')}
          style={styles.settingsButton}
        >
          <Icon name="settings" size={24} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {renderOfflineStatus()}

      {/* Stats Grid */}
      {dashboardStats && (
        <View style={styles.statsGrid}>
          {renderStatCard(
            'Total Items',
            dashboardStats.totalItems.toLocaleString(),
            'inventory',
            theme.colors.primary
          )}
          {renderStatCard(
            'Total Value',
            `$${dashboardStats.totalValue.toLocaleString()}`,
            'attach-money',
            theme.colors.success,
            dashboardStats.portfolioChangePercent >= 0 
              ? `+${dashboardStats.portfolioChangePercent.toFixed(1)}%`
              : `${dashboardStats.portfolioChangePercent.toFixed(1)}%`
          )}
          {renderStatCard(
            'With Valuations',
            dashboardStats.itemsWithValuations.toLocaleString(),
            'verified',
            theme.colors.accent
          )}
          {renderStatCard(
            'Recent Updates',
            dashboardStats.recentValuations.toLocaleString(),
            'update',
            theme.colors.info
          )}
        </View>
      )}

      {/* Portfolio Chart */}
      {portfolioHistory && portfolioHistory.length > 0 && (
        <View style={styles.chartContainer}>
          <Text style={styles.sectionTitle}>Portfolio Performance</Text>
          <PriceHistoryChart
            data={portfolioHistory}
            height={200}
            showTrend={true}
          />
        </View>
      )}

      {renderQuickActions()}

      {/* Recent Valuations */}
      {recentValuations && recentValuations.length > 0 && (
        <View style={styles.recentValuations}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Valuations</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Valuations')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {recentValuations.map((valuation) => (
            <ValuationCard
              key={valuation.id}
              valuation={valuation}
              compact={true}
              onPress={() => 
                navigation.navigate('ItemDetail', {
                  itemId: valuation.item_id,
                  itemName: valuation.item?.name,
                })
              }
            />
          ))}
        </View>
      )}

      {/* Loading states */}
      {(statsLoading || valuationsLoading || historyLoading) && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      )}
    </ScrollView>
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
    paddingBottom: theme.spacing.sm,
  },
  greeting: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  username: {
    fontSize: theme.fontSize.xl,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: theme.spacing.xs / 2,
  },
  settingsButton: {
    padding: theme.spacing.xs,
  },
  offlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warning + '20',
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  offlineText: {
    marginLeft: theme.spacing.xs,
    fontSize: theme.fontSize.sm,
    color: theme.colors.warning,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  statCard: {
    width: (screenWidth - theme.spacing.md * 3) / 2,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  statTitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
    flex: 1,
  },
  statValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs / 2,
  },
  statSubtitle: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  chartContainer: {
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  quickActionsContainer: {
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAction: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    width: (screenWidth - theme.spacing.md * 5) / 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  recentValuations: {
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  seeAllText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
  },
  loadingContainer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
});

export default DashboardScreen;
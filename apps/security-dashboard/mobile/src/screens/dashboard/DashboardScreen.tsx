import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useSubscription } from '@apollo/client';

import { SecurityTheme } from '../../theme/SecurityTheme';
import ThreatActivityChart from '../../components/charts/ThreatActivityChart';
import SwipeableAlertCard from '../../components/cards/SwipeableAlertCard';

// GraphQL queries (these would be actual queries from your schema)
const GET_DASHBOARD_DATA = `
  query GetDashboardData {
    securityOverview {
      totalAlerts
      criticalAlerts
      activeIncidents
      resolvedToday
      threatLevel
      systemHealth
    }
    recentAlerts(limit: 5) {
      id
      title
      message
      severity
      type
      timestamp
      isRead
      status
      source
      location
      affectedAssets
    }
    threatActivity(timeRange: "24h") {
      timestamp
      critical
      high
      medium
      low
      total
    }
  }
`;

const SECURITY_ALERTS_SUBSCRIPTION = `
  subscription SecurityAlertsSubscription {
    securityAlertUpdates {
      type
      alert {
        id
        title
        message
        severity
        type
        timestamp
        isRead
        status
        source
        location
        affectedAssets
      }
    }
  }
`;

// Mock data for demonstration
const mockDashboardData = {
  securityOverview: {
    totalAlerts: 47,
    criticalAlerts: 3,
    activeIncidents: 12,
    resolvedToday: 28,
    threatLevel: 'medium',
    systemHealth: 94,
  },
  recentAlerts: [
    {
      id: '1',
      title: 'Suspicious Network Activity Detected',
      message: 'Multiple failed login attempts from IP 192.168.1.100',
      severity: 'high',
      type: 'intrusion',
      timestamp: Date.now() - 5 * 60 * 1000, // 5 minutes ago
      isRead: false,
      status: 'active',
      source: 'IDS',
      location: 'Server Room A',
      affectedAssets: 3,
    },
    {
      id: '2',
      title: 'Malware Quarantined',
      message: 'Trojan.GenKD detected and quarantined on workstation WS-201',
      severity: 'medium',
      type: 'malware',
      timestamp: Date.now() - 15 * 60 * 1000, // 15 minutes ago
      isRead: true,
      status: 'investigating',
      source: 'Antivirus',
      location: 'Office Floor 2',
      affectedAssets: 1,
    },
    {
      id: '3',
      title: 'Phishing Email Campaign',
      message: 'Suspected phishing emails detected targeting finance department',
      severity: 'critical',
      type: 'phishing',
      timestamp: Date.now() - 30 * 60 * 1000, // 30 minutes ago
      isRead: false,
      status: 'active',
      source: 'Email Security',
      location: 'Finance Dept',
      affectedAssets: 15,
    },
  ],
  threatActivity: Array.from({ length: 24 }, (_, i) => ({
    timestamp: Date.now() - (23 - i) * 60 * 60 * 1000,
    critical: Math.floor(Math.random() * 5),
    high: Math.floor(Math.random() * 10),
    medium: Math.floor(Math.random() * 15),
    low: Math.floor(Math.random() * 20),
    total: 0,
  })).map(item => ({
    ...item,
    total: item.critical + item.high + item.medium + item.low,
  })),
};

export default function DashboardScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(mockDashboardData);

  // In a real app, these would use actual GraphQL queries
  // const { data, loading, error, refetch } = useQuery(GET_DASHBOARD_DATA);
  // const { data: subscriptionData } = useSubscription(SECURITY_ALERTS_SUBSCRIPTION);

  useEffect(() => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      // Update mock data periodically
      setDashboardData(prev => ({
        ...prev,
        securityOverview: {
          ...prev.securityOverview,
          totalAlerts: prev.securityOverview.totalAlerts + Math.floor(Math.random() * 3),
          systemHealth: Math.max(85, prev.securityOverview.systemHealth + (Math.random() - 0.5) * 2),
        },
      }));
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // In a real app, this would refetch data
      await new Promise(resolve => setTimeout(resolve, 1500));
      // await refetch();
    } catch (error) {
      console.error('Failed to refresh dashboard:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleAlertPress = (alert: any) => {
    navigation.navigate('Alerts', {
      screen: 'AlertDetail',
      params: { alertId: alert.id },
    });
  };

  const handleAlertAcknowledge = (alertId: string) => {
    Alert.alert(
      'Acknowledge Alert',
      'Mark this alert as acknowledged?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Acknowledge',
          onPress: () => {
            console.log('Alert acknowledged:', alertId);
            // Update alert status
          },
        },
      ]
    );
  };

  const handleAlertDismiss = (alertId: string) => {
    console.log('Alert dismissed:', alertId);
    // Remove alert from list
  };

  const handleAlertEscalate = (alertId: string) => {
    navigation.navigate('Incidents', {
      screen: 'CreateIncident',
      params: { alertId },
    });
  };

  const getThreatLevelColor = (level: string) => {
    const colors = {
      low: SecurityTheme.colors.severity.low,
      medium: SecurityTheme.colors.severity.medium,
      high: SecurityTheme.colors.severity.high,
      critical: SecurityTheme.colors.severity.critical,
    };
    return colors[level as keyof typeof colors] || SecurityTheme.colors.text.secondary;
  };

  const getThreatLevelIcon = (level: string) => {
    const icons = {
      low: 'shield-check',
      medium: 'shield-alert',
      high: 'shield-alert',
      critical: 'shield-remove',
    };
    return icons[level as keyof typeof icons] || 'shield';
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Security Dashboard</Text>
          <Text style={styles.headerSubtitle}>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </View>
        
        <View style={styles.headerActions}>
          <Pressable
            style={styles.headerButton}
            onPress={() => navigation.navigate('Profile', { screen: 'Settings' })}
          >
            <MaterialCommunityIcons
              name="cog"
              size={24}
              color={SecurityTheme.colors.text.secondary}
            />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[SecurityTheme.colors.primary[500]]}
            tintColor={SecurityTheme.colors.primary[500]}
          />
        }
      >
        {/* Threat Level Overview */}
        <View style={styles.threatLevelCard}>
          <View style={styles.threatLevelHeader}>
            <MaterialCommunityIcons
              name={getThreatLevelIcon(dashboardData.securityOverview.threatLevel)}
              size={32}
              color={getThreatLevelColor(dashboardData.securityOverview.threatLevel)}
            />
            <View style={styles.threatLevelInfo}>
              <Text style={styles.threatLevelTitle}>Current Threat Level</Text>
              <Text
                style={[
                  styles.threatLevelValue,
                  { color: getThreatLevelColor(dashboardData.securityOverview.threatLevel) },
                ]}
              >
                {dashboardData.securityOverview.threatLevel.toUpperCase()}
              </Text>
            </View>
          </View>
          
          <View style={styles.systemHealthContainer}>
            <Text style={styles.systemHealthLabel}>System Health</Text>
            <View style={styles.healthBar}>
              <View
                style={[
                  styles.healthProgress,
                  {
                    width: `${dashboardData.securityOverview.systemHealth}%`,
                    backgroundColor: dashboardData.securityOverview.systemHealth > 90
                      ? SecurityTheme.colors.interactive.success
                      : dashboardData.securityOverview.systemHealth > 70
                      ? SecurityTheme.colors.interactive.warning
                      : SecurityTheme.colors.interactive.error,
                  },
                ]}
              />
            </View>
            <Text style={styles.systemHealthValue}>
              {dashboardData.securityOverview.systemHealth}%
            </Text>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <StatCard
            title="Total Alerts"
            value={dashboardData.securityOverview.totalAlerts}
            icon="alert-circle"
            color={SecurityTheme.colors.interactive.warning}
            onPress={() => navigation.navigate('Alerts')}
          />
          <StatCard
            title="Critical"
            value={dashboardData.securityOverview.criticalAlerts}
            icon="alert-octagon"
            color={SecurityTheme.colors.severity.critical}
            onPress={() => navigation.navigate('Alerts')}
          />
          <StatCard
            title="Active Incidents"
            value={dashboardData.securityOverview.activeIncidents}
            icon="clipboard-alert"
            color={SecurityTheme.colors.primary[500]}
            onPress={() => navigation.navigate('Incidents')}
          />
          <StatCard
            title="Resolved Today"
            value={dashboardData.securityOverview.resolvedToday}
            icon="check-circle"
            color={SecurityTheme.colors.interactive.success}
            onPress={() => navigation.navigate('Incidents')}
          />
        </View>

        {/* Threat Activity Chart */}
        <ThreatActivityChart
          data={dashboardData.threatActivity}
          type="line"
          title="24-Hour Threat Activity"
          timeRange="24h"
          showLegend={true}
        />

        {/* Recent Alerts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Alerts</Text>
            <Pressable
              style={styles.sectionAction}
              onPress={() => navigation.navigate('Alerts')}
            >
              <Text style={styles.sectionActionText}>View All</Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={16}
                color={SecurityTheme.colors.primary[500]}
              />
            </Pressable>
          </View>
          
          {dashboardData.recentAlerts.map((alert) => (
            <SwipeableAlertCard
              key={alert.id}
              alert={alert}
              onPress={() => handleAlertPress(alert)}
              onAcknowledge={handleAlertAcknowledge}
              onDismiss={handleAlertDismiss}
              onEscalate={handleAlertEscalate}
              style={styles.alertCard}
            />
          ))}
          
          {dashboardData.recentAlerts.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="shield-check"
                size={48}
                color={SecurityTheme.colors.text.tertiary}
              />
              <Text style={styles.emptyStateText}>No recent alerts</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// Quick Stat Card Component
function StatCard({
  title,
  value,
  icon,
  color,
  onPress,
}: {
  title: string;
  value: number;
  icon: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.statCard} onPress={onPress}>
      <MaterialCommunityIcons name={icon as any} size={24} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SecurityTheme.colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SecurityTheme.spacing.lg,
    paddingVertical: SecurityTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: SecurityTheme.colors.border.primary,
  },
  headerTitle: {
    fontSize: SecurityTheme.typography.sizes['2xl'],
    fontWeight: SecurityTheme.typography.weights.bold,
    color: SecurityTheme.colors.text.primary,
  },
  headerSubtitle: {
    fontSize: SecurityTheme.typography.sizes.sm,
    color: SecurityTheme.colors.text.secondary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: SecurityTheme.spacing.sm,
    borderRadius: SecurityTheme.borderRadius.md,
    backgroundColor: SecurityTheme.colors.background.secondary,
  },
  scrollView: {
    flex: 1,
  },
  threatLevelCard: {
    margin: SecurityTheme.spacing.md,
    padding: SecurityTheme.spacing.lg,
    backgroundColor: SecurityTheme.colors.background.secondary,
    borderRadius: SecurityTheme.borderRadius.lg,
    ...SecurityTheme.shadows.md,
  },
  threatLevelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SecurityTheme.spacing.lg,
  },
  threatLevelInfo: {
    marginLeft: SecurityTheme.spacing.md,
    flex: 1,
  },
  threatLevelTitle: {
    fontSize: SecurityTheme.typography.sizes.base,
    color: SecurityTheme.colors.text.secondary,
  },
  threatLevelValue: {
    fontSize: SecurityTheme.typography.sizes.xl,
    fontWeight: SecurityTheme.typography.weights.bold,
    marginTop: 2,
  },
  systemHealthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  systemHealthLabel: {
    fontSize: SecurityTheme.typography.sizes.sm,
    color: SecurityTheme.colors.text.secondary,
    minWidth: 80,
  },
  healthBar: {
    flex: 1,
    height: 8,
    backgroundColor: SecurityTheme.colors.background.primary,
    borderRadius: SecurityTheme.borderRadius.sm,
    marginHorizontal: SecurityTheme.spacing.md,
    overflow: 'hidden',
  },
  healthProgress: {
    height: '100%',
    borderRadius: SecurityTheme.borderRadius.sm,
  },
  systemHealthValue: {
    fontSize: SecurityTheme.typography.sizes.sm,
    fontWeight: SecurityTheme.typography.weights.medium,
    color: SecurityTheme.colors.text.primary,
    minWidth: 40,
    textAlign: 'right',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SecurityTheme.spacing.md,
    marginBottom: SecurityTheme.spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: SecurityTheme.spacing.md,
    margin: SecurityTheme.spacing.xs,
    backgroundColor: SecurityTheme.colors.background.secondary,
    borderRadius: SecurityTheme.borderRadius.md,
    ...SecurityTheme.shadows.sm,
  },
  statValue: {
    fontSize: SecurityTheme.typography.sizes.xl,
    fontWeight: SecurityTheme.typography.weights.bold,
    color: SecurityTheme.colors.text.primary,
    marginTop: SecurityTheme.spacing.xs,
  },
  statTitle: {
    fontSize: SecurityTheme.typography.sizes.xs,
    color: SecurityTheme.colors.text.secondary,
    textAlign: 'center',
    marginTop: SecurityTheme.spacing.xs,
  },
  section: {
    marginBottom: SecurityTheme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SecurityTheme.spacing.md,
    marginBottom: SecurityTheme.spacing.sm,
  },
  sectionTitle: {
    fontSize: SecurityTheme.typography.sizes.lg,
    fontWeight: SecurityTheme.typography.weights.semibold,
    color: SecurityTheme.colors.text.primary,
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionActionText: {
    fontSize: SecurityTheme.typography.sizes.sm,
    fontWeight: SecurityTheme.typography.weights.medium,
    color: SecurityTheme.colors.primary[500],
    marginRight: SecurityTheme.spacing.xs,
  },
  alertCard: {
    marginHorizontal: 0,
    marginVertical: 2,
  },
  emptyState: {
    alignItems: 'center',
    padding: SecurityTheme.spacing['2xl'],
  },
  emptyStateText: {
    fontSize: SecurityTheme.typography.sizes.base,
    color: SecurityTheme.colors.text.tertiary,
    marginTop: SecurityTheme.spacing.md,
  },
});
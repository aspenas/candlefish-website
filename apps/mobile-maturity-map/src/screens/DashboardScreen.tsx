import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@apollo/client';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';

import { RootState } from '@/store';
import { GET_OPERATOR_DASHBOARD } from '@/services/graphql/queries';
import { syncOfflineData } from '@/store/slices/syncSlice';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { AssessmentCard } from '@/components/dashboard/AssessmentCard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { ProgressChart } from '@/components/dashboard/ProgressChart';
import { RecentActivityFeed } from '@/components/dashboard/RecentActivityFeed';
import { SyncStatusIndicator } from '@/components/ui/SyncStatusIndicator';

const { width } = Dimensions.get('window');

export function DashboardScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [refreshing, setRefreshing] = useState(false);

  const { user, isOnline } = useSelector((state: RootState) => ({
    user: state.auth.user,
    isOnline: state.network.isOnline,
  }));

  const { data, loading, error, refetch } = useQuery(GET_OPERATOR_DASHBOARD, {
    variables: { operatorId: user?.id },
    pollInterval: isOnline ? 30000 : 0, // Poll every 30 seconds when online
    errorPolicy: 'all',
    fetchPolicy: isOnline ? 'cache-and-network' : 'cache-only',
  });

  const handleRefresh = async () => {
    setRefreshing(true);\n    try {\n      if (isOnline) {\n        dispatch(syncOfflineData() as any);\n        await refetch();\n      }\n    } catch (err) {\n      console.error('Refresh error:', err);\n    } finally {\n      setRefreshing(false);\n    }\n  };\n\n  const navigateToAssessments = () => {\n    navigation.navigate('Assessments' as never);\n  };\n\n  const navigateToCreateAssessment = () => {\n    navigation.navigate('Assessments' as never, {\n      screen: 'CreateAssessment',\n    } as never);\n  };\n\n  if (loading && !data) {\n    return (\n      <View style={styles.loadingContainer}>\n        <LoadingSpinner size=\"large\" />\n        <Text style={styles.loadingText}>Loading dashboard...</Text>\n      </View>\n    );\n  }\n\n  if (error && !data) {\n    return (\n      <View style={styles.errorContainer}>\n        <ErrorMessage \n          message=\"Failed to load dashboard\"\n          onRetry={handleRefresh}\n        />\n      </View>\n    );\n  }\n\n  const operator = data?.operator;\n  const metrics = data?.dashboardMetrics;\n  const assessments = operator?.assessments || [];\n  const recentAssessments = assessments.slice(0, 3);\n\n  return (\n    <ScrollView\n      style={styles.container}\n      contentContainerStyle={styles.contentContainer}\n      refreshControl={\n        <RefreshControl\n          refreshing={refreshing}\n          onRefresh={handleRefresh}\n          tintColor=\"#3B82F6\"\n          colors={['#3B82F6']}\n        />\n      }\n    >\n      {/* Header */}\n      <LinearGradient\n        colors={['#0D1B2A', '#1B263B']}\n        style={styles.header}\n      >\n        <View style={styles.headerContent}>\n          <View style={styles.welcomeSection}>\n            <Text style={styles.greeting}>Good {getTimeOfDay()},</Text>\n            <Text style={styles.userName}>{operator?.name || 'User'}</Text>\n            <Text style={styles.subtitle}>\n              {operator?.companyName || 'Organization'}\n            </Text>\n          </View>\n          <View style={styles.headerActions}>\n            <SyncStatusIndicator />\n            <TouchableOpacity style={styles.notificationButton}>\n              <Ionicons name=\"notifications-outline\" size={24} color=\"#FFFFFF\" />\n              {metrics?.unreadNotifications > 0 && (\n                <View style={styles.notificationBadge}>\n                  <Text style={styles.badgeText}>\n                    {metrics.unreadNotifications}\n                  </Text>\n                </View>\n              )}\n            </TouchableOpacity>\n          </View>\n        </View>\n      </LinearGradient>\n\n      {/* Quick Actions */}\n      <View style={styles.section}>\n        <QuickActions\n          onNewAssessment={navigateToCreateAssessment}\n          onCaptureDocument={() => navigation.navigate('Documents' as never, {\n            screen: 'DocumentCapture',\n          } as never)}\n          onViewAssessments={navigateToAssessments}\n        />\n      </View>\n\n      {/* Key Metrics */}\n      <View style={styles.section}>\n        <Text style={styles.sectionTitle}>Overview</Text>\n        <View style={styles.metricsGrid}>\n          <MetricCard\n            title=\"Total Assessments\"\n            value={metrics?.totalAssessments || 0}\n            change={metrics?.assessmentChange}\n            icon=\"clipboard-outline\"\n            color=\"#3B82F6\"\n          />\n          <MetricCard\n            title=\"This Month\"\n            value={metrics?.completedThisMonth || 0}\n            change={metrics?.monthlyChange}\n            icon=\"checkmark-circle-outline\"\n            color=\"#10B981\"\n          />\n          <MetricCard\n            title=\"Avg Score\"\n            value={`${metrics?.averageMaturityScore?.toFixed(1) || '0.0'}%`}\n            change={metrics?.scoreChange}\n            icon=\"analytics-outline\"\n            color=\"#8B5CF6\"\n          />\n          <MetricCard\n            title=\"In Progress\"\n            value={metrics?.inProgress || 0}\n            icon=\"time-outline\"\n            color=\"#F59E0B\"\n          />\n        </View>\n      </View>\n\n      {/* Progress Chart */}\n      {metrics?.trendData && (\n        <View style={styles.section}>\n          <Text style={styles.sectionTitle}>Maturity Trends</Text>\n          <Card style={styles.chartCard}>\n            <ProgressChart \n              data={metrics.trendData}\n              height={200}\n            />\n          </Card>\n        </View>\n      )}\n\n      {/* Recent Assessments */}\n      {recentAssessments.length > 0 && (\n        <View style={styles.section}>\n          <View style={styles.sectionHeader}>\n            <Text style={styles.sectionTitle}>Recent Assessments</Text>\n            <TouchableOpacity onPress={navigateToAssessments}>\n              <Text style={styles.seeAllText}>See All</Text>\n            </TouchableOpacity>\n          </View>\n          {recentAssessments.map((assessment) => (\n            <AssessmentCard\n              key={assessment.id}\n              assessment={assessment}\n              onPress={() =>\n                navigation.navigate('AssessmentDetail' as never, {\n                  id: assessment.id,\n                  title: assessment.title,\n                } as never)\n              }\n              style={styles.assessmentCard}\n            />\n          ))}\n        </View>\n      )}\n\n      {/* Recent Activity */}\n      {metrics?.recentActivity && (\n        <View style={styles.section}>\n          <Text style={styles.sectionTitle}>Recent Activity</Text>\n          <Card style={styles.activityCard}>\n            <RecentActivityFeed \n              activities={metrics.recentActivity}\n              maxItems={5}\n            />\n          </Card>\n        </View>\n      )}\n\n      {/* Bottom Spacing */}\n      <View style={styles.bottomSpacing} />\n    </ScrollView>\n  );\n}\n\nfunction getTimeOfDay(): string {\n  const hour = new Date().getHours();\n  if (hour < 12) return 'morning';\n  if (hour < 18) return 'afternoon';\n  return 'evening';\n}\n\nconst styles = StyleSheet.create({\n  container: {\n    flex: 1,\n    backgroundColor: '#F9FAFB',\n  },\n  contentContainer: {\n    paddingBottom: 100,\n  },\n  loadingContainer: {\n    flex: 1,\n    justifyContent: 'center',\n    alignItems: 'center',\n    backgroundColor: '#F9FAFB',\n  },\n  loadingText: {\n    marginTop: 16,\n    fontSize: 16,\n    color: '#6B7280',\n    textAlign: 'center',\n  },\n  errorContainer: {\n    flex: 1,\n    justifyContent: 'center',\n    alignItems: 'center',\n    backgroundColor: '#F9FAFB',\n    padding: 20,\n  },\n  header: {\n    paddingTop: 60,\n    paddingHorizontal: 20,\n    paddingBottom: 24,\n  },\n  headerContent: {\n    flexDirection: 'row',\n    justifyContent: 'space-between',\n    alignItems: 'flex-start',\n  },\n  welcomeSection: {\n    flex: 1,\n  },\n  greeting: {\n    fontSize: 16,\n    color: '#9CA3AF',\n    marginBottom: 4,\n  },\n  userName: {\n    fontSize: 28,\n    fontWeight: 'bold',\n    color: '#FFFFFF',\n    marginBottom: 2,\n  },\n  subtitle: {\n    fontSize: 14,\n    color: '#6B7280',\n  },\n  headerActions: {\n    flexDirection: 'row',\n    alignItems: 'center',\n    gap: 16,\n  },\n  notificationButton: {\n    position: 'relative',\n  },\n  notificationBadge: {\n    position: 'absolute',\n    top: -6,\n    right: -6,\n    backgroundColor: '#EF4444',\n    borderRadius: 10,\n    minWidth: 20,\n    height: 20,\n    justifyContent: 'center',\n    alignItems: 'center',\n  },\n  badgeText: {\n    color: '#FFFFFF',\n    fontSize: 12,\n    fontWeight: 'bold',\n  },\n  section: {\n    marginHorizontal: 20,\n    marginBottom: 24,\n  },\n  sectionTitle: {\n    fontSize: 20,\n    fontWeight: '600',\n    color: '#1F2937',\n    marginBottom: 16,\n  },\n  sectionHeader: {\n    flexDirection: 'row',\n    justifyContent: 'space-between',\n    alignItems: 'center',\n    marginBottom: 16,\n  },\n  seeAllText: {\n    fontSize: 14,\n    color: '#3B82F6',\n    fontWeight: '500',\n  },\n  metricsGrid: {\n    flexDirection: 'row',\n    flexWrap: 'wrap',\n    gap: 12,\n  },\n  chartCard: {\n    padding: 16,\n  },\n  assessmentCard: {\n    marginBottom: 12,\n  },\n  activityCard: {\n    padding: 16,\n  },\n  bottomSpacing: {\n    height: 40,\n  },\n});"
            },
            {"old_string": "", "new_string": ""}
          ]
        }
      ],
      
      
      "activeBranch": "feature/proportion-by-design-20250825"
    }
  ]
}
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { useQuery } from '@apollo/client';
import Icon from 'react-native-vector-icons/Ionicons';
import { GET_DASHBOARD_DATA } from '../services/graphql/queries';
import { DashboardScreenProps } from '../types/navigation';
import { Project, Estimate, ProjectStatus, EstimateStatus } from '../types/graphql';
import { offlineSyncService } from '../services/offlineSync';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorState from '../components/common/ErrorState';
import ProjectCard from '../components/projects/ProjectCard';
import EstimateCard from '../components/estimates/EstimateCard';
import SyncStatusIndicator from '../components/common/SyncStatusIndicator';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

interface DashboardData {
  recentProjects: { edges: { node: Project }[] };
  pendingEstimates: { edges: { node: Estimate }[] };
  overdueProjects: { edges: { node: Project }[] };
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [syncStats, setSyncStats] = useState<any>(null);

  const { data, loading, error, refetch, networkStatus } = useQuery<DashboardData>(
    GET_DASHBOARD_DATA,
    {
      errorPolicy: 'all',
      fetchPolicy: 'cache-first',
      notifyOnNetworkStatusChange: true,
    }
  );

  useEffect(() => {
    loadSyncStats();
  }, []);

  const loadSyncStats = async () => {
    const stats = await offlineSyncService.getSyncStats();
    setSyncStats(stats);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
      await loadSyncStats();
    } catch (err) {
      console.error('Refresh failed:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const navigateToProjects = () => {
    navigation.getParent()?.navigate('ProjectsTab');
  };

  const navigateToMeasurements = () => {
    navigation.getParent()?.navigate('MeasurementsTab');
  };

  const navigateToProjectDetail = (projectId: string, projectName?: string) => {
    navigation.getParent()?.navigate('ProjectsTab', {
      screen: 'ProjectDetail',
      params: { projectId, projectName },
    });
  };

  const navigateToEstimateDetail = (estimateId: string, projectId?: string) => {
    navigation.getParent()?.navigate('ProjectsTab', {
      screen: 'EstimateDetail',
      params: { estimateId, projectId },
    });
  };

  if (loading && !data) {
    return <LoadingSpinner />;
  }

  if (error && !data) {
    return (
      <ErrorState
        error={error}
        onRetry={() => refetch()}
        title="Failed to load dashboard"
      />
    );
  }

  const recentProjects = data?.recentProjects?.edges?.map(edge => edge.node) || [];
  const pendingEstimates = data?.pendingEstimates?.edges?.map(edge => edge.node) || [];
  const overdueProjects = data?.overdueProjects?.edges?.map(edge => edge.node) || [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
        <SyncStatusIndicator />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3B82F6"
          />
        }
      >
        {/* Stats Overview */}
        <View style={[styles.statsContainer, isTablet && styles.statsContainerTablet]}>
          <StatCard
            title="Active Projects"
            value={recentProjects.length.toString()}
            icon="folder-open"
            color="#3B82F6"
            onPress={navigateToProjects}
          />
          <StatCard
            title="Pending Estimates"
            value={pendingEstimates.length.toString()}
            icon="calculator"
            color="#F59E0B"
            onPress={navigateToMeasurements}
          />
          <StatCard
            title="Overdue"
            value={overdueProjects.length.toString()}
            icon="time"
            color="#EF4444"
            onPress={navigateToProjects}
          />
          {syncStats && (
            <StatCard
              title="Pending Sync"
              value={syncStats.pendingOperations.toString()}
              icon="sync"
              color="#8B5CF6"
            />
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={[styles.quickActions, isTablet && styles.quickActionsTablet]}>
            <QuickActionButton
              title="New Project"
              icon="add-circle"
              color="#10B981"
              onPress={() => {
                // Navigate to new project flow
                navigation.getParent()?.navigate('ProjectsTab', {
                  screen: 'ProjectDetail',
                  params: { projectId: 'new' },
                });
              }}
            />
            <QuickActionButton
              title="Take Photos"
              icon="camera"
              color="#3B82F6"
              onPress={() => {
                navigation.getParent()?.navigate('CameraTab');
              }}
            />
            <QuickActionButton
              title="Measurements"
              icon="calculator"
              color="#F59E0B"
              onPress={navigateToMeasurements}
            />
            <QuickActionButton
              title="Manager Tools"
              icon="person"
              color="#8B5CF6"
              onPress={() => {
                navigation.getParent()?.navigate('ManagerTab');
              }}
            />
          </View>
        </View>

        {/* Recent Projects */}
        {recentProjects.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Projects</Text>
              <TouchableOpacity onPress={navigateToProjects}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            >
              {recentProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onPress={() => navigateToProjectDetail(project.id, project.name)}
                  compact
                  style={styles.projectCard}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Pending Estimates */}
        {pendingEstimates.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pending Estimates</Text>
              <TouchableOpacity onPress={navigateToMeasurements}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>
            {pendingEstimates.slice(0, 3).map((estimate) => (
              <EstimateCard
                key={estimate.id}
                estimate={estimate}
                onPress={() => navigateToEstimateDetail(estimate.id, estimate.projectId)}
                style={styles.estimateCard}
              />
            ))}
          </View>
        )}

        {/* Overdue Projects Alert */}
        {overdueProjects.length > 0 && (
          <View style={styles.section}>
            <View style={styles.alertSection}>
              <View style={styles.alertHeader}>
                <Icon name="warning" size={24} color="#EF4444" />
                <Text style={styles.alertTitle}>Attention Required</Text>
              </View>
              <Text style={styles.alertText}>
                {overdueProjects.length} project{overdueProjects.length > 1 ? 's' : ''} overdue
              </Text>
              <TouchableOpacity
                style={styles.alertButton}
                onPress={navigateToProjects}
              >
                <Text style={styles.alertButtonText}>Review Projects</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// Helper Components
interface StatCardProps {
  title: string;
  value: string;
  icon: string;
  color: string;
  onPress?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, onPress }) => (
  <TouchableOpacity
    style={[styles.statCard, onPress && styles.statCardTouchable]}
    onPress={onPress}
    activeOpacity={onPress ? 0.7 : 1}
  >
    <Icon name={icon} size={24} color={color} style={styles.statIcon} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statTitle}>{title}</Text>
  </TouchableOpacity>
);

interface QuickActionButtonProps {
  title: string;
  icon: string;
  color: string;
  onPress: () => void;
}

const QuickActionButton: React.FC<QuickActionButtonProps> = ({
  title,
  icon,
  color,
  onPress,
}) => (
  <TouchableOpacity style={styles.quickActionButton} onPress={onPress}>
    <View style={[styles.quickActionIcon, { backgroundColor: color }]}>
      <Icon name={icon} size={24} color="white" />
    </View>
    <Text style={styles.quickActionTitle}>{title}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  statsContainerTablet: {
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statCardTouchable: {
    shadowOpacity: 0.15,
  },
  statIcon: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAll: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  quickActionsTablet: {
    justifyContent: 'center',
  },
  quickActionButton: {
    alignItems: 'center',
    width: (width - 48 - 16) / 2, // Account for padding and gap
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionTitle: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
    fontWeight: '500',
  },
  horizontalList: {
    paddingRight: 16,
  },
  projectCard: {
    marginRight: 16,
    width: 280,
  },
  estimateCard: {
    marginBottom: 12,
  },
  alertSection: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
    marginLeft: 8,
  },
  alertText: {
    fontSize: 14,
    color: '#7F1D1D',
    marginBottom: 12,
  },
  alertButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  alertButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default DashboardScreen;

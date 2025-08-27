import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@apollo/client';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';

import { RootState } from '@/store';
import { GET_ASSESSMENTS } from '@/services/graphql/queries';
import { AssessmentStatus } from '@/types/assessment';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { AssessmentCard } from '@/components/dashboard/AssessmentCard';
import { FilterChips } from '@/components/ui/FilterChips';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { EmptyState } from '@/components/ui/EmptyState';

const FILTER_OPTIONS = [
  { key: 'all', label: 'All', value: undefined },
  { key: 'pending', label: 'Pending', value: AssessmentStatus.PENDING },
  { key: 'in_progress', label: 'In Progress', value: AssessmentStatus.IN_PROGRESS },
  { key: 'processing', label: 'Processing', value: AssessmentStatus.PROCESSING },
  { key: 'completed', label: 'Completed', value: AssessmentStatus.COMPLETED },
];

export function AssessmentsScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'recent' | 'oldest' | 'name'>('recent');

  const { user, isOnline } = useSelector((state: RootState) => ({
    user: state.auth.user,
    isOnline: state.network.isOnline,
  }));

  const { data, loading, error, refetch } = useQuery(GET_ASSESSMENTS, {
    variables: { 
      operatorId: user?.id,
      filter: {
        status: FILTER_OPTIONS.find(f => f.key === activeFilter)?.value,
      },
    },
    pollInterval: isOnline ? 30000 : 0,
    errorPolicy: 'all',
    fetchPolicy: isOnline ? 'cache-and-network' : 'cache-only',
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (isOnline) {
        await refetch();
      }
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const filteredAndSortedAssessments = React.useMemo(() => {
    let assessments = data?.assessments?.edges?.map(edge => edge.node) || [];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      assessments = assessments.filter(assessment =>
        assessment.title.toLowerCase().includes(query) ||
        assessment.description?.toLowerCase().includes(query) ||
        assessment.industry.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    assessments.sort((a, b) => {
      switch (sortOrder) {
        case 'recent':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'oldest':
          return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        case 'name':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    return assessments;
  }, [data, searchQuery, sortOrder]);

  const handleCreateAssessment = () => {
    navigation.navigate('CreateAssessment' as never);
  };

  const handleAssessmentPress = (assessment: any) => {
    if (assessment.status === AssessmentStatus.IN_PROGRESS) {
      // Resume assessment flow
      navigation.navigate('QuestionFlow' as never, {
        id: assessment.id,
      } as never);
    } else {
      // View assessment details
      navigation.navigate('AssessmentDetail' as never, {
        id: assessment.id,
        title: assessment.title,
      } as never);
    }
  };

  const handleAssessmentLongPress = (assessment: any) => {
    Alert.alert(
      'Assessment Options',
      assessment.title,
      [
        {
          text: 'View Details',
          onPress: () => navigation.navigate('AssessmentDetail' as never, {
            id: assessment.id,
            title: assessment.title,
          } as never),
        },
        {
          text: 'Share',
          onPress: () => {
            // Implement sharing functionality
          },
        },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: () => {
            // Implement archive functionality
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const getStatusCounts = () => {
    const assessments = data?.assessments?.edges?.map(edge => edge.node) || [];
    const counts = {
      all: assessments.length,
      pending: 0,
      in_progress: 0,
      processing: 0,
      completed: 0,
    };

    assessments.forEach(assessment => {
      switch (assessment.status) {
        case AssessmentStatus.PENDING:
          counts.pending++;
          break;
        case AssessmentStatus.IN_PROGRESS:
          counts.in_progress++;
          break;
        case AssessmentStatus.PROCESSING:
          counts.processing++;
          break;
        case AssessmentStatus.COMPLETED:
          counts.completed++;
          break;
      }
    });

    return counts;
  };

  if (loading && !data) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner size="large" />
        <Text style={styles.loadingText}>Loading assessments...</Text>
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={styles.errorContainer}>
        <ErrorMessage
          message="Failed to load assessments"
          onRetry={handleRefresh}
        />
      </View>
    );
  }

  const statusCounts = getStatusCounts();

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#6B7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search assessments..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#6B7280"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles.sortButton}
          onPress={() => {
            const orders = ['recent', 'oldest', 'name'] as const;
            const currentIndex = orders.indexOf(sortOrder);
            const nextIndex = (currentIndex + 1) % orders.length;
            setSortOrder(orders[nextIndex]);
          }}
        >
          <Ionicons name="filter-outline" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterSection}>
        <FilterChips
          options={FILTER_OPTIONS.map(option => ({
            ...option,
            count: statusCounts[option.key as keyof typeof statusCounts],
          }))}
          activeKey={activeFilter}
          onSelect={setActiveFilter}
        />
      </View>

      {/* Assessment List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#3B82F6"
            colors={['#3B82F6']}
          />
        }
      >
        {filteredAndSortedAssessments.length === 0 ? (
          <EmptyState
            icon="clipboard-outline"
            title="No assessments found"
            description={
              searchQuery.trim()
                ? `No assessments match "${searchQuery}"`
                : activeFilter === 'all'
                ? "You haven't created any assessments yet"
                : `No ${FILTER_OPTIONS.find(f => f.key === activeFilter)?.label.toLowerCase()} assessments`
            }
            actionLabel={activeFilter === 'all' ? 'Create Assessment' : undefined}
            onActionPress={activeFilter === 'all' ? handleCreateAssessment : undefined}
          />
        ) : (
          <View style={styles.assessmentList}>
            {filteredAndSortedAssessments.map((assessment) => (
              <AssessmentCard
                key={assessment.id}
                assessment={assessment}
                onPress={() => handleAssessmentPress(assessment)}
                onLongPress={() => handleAssessmentLongPress(assessment)}
                style={styles.assessmentCard}
                showProgress={true}
                showIndustry={true}
              />
            ))}
          </View>
        )}
        
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Floating Action Button */}
      <FloatingActionButton
        icon="add"
        onPress={handleCreateAssessment}
        label="New Assessment"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 20,
  },
  searchSection: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  sortButton: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: 48,
    height: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  assessmentList: {
    paddingTop: 8,
  },
  assessmentCard: {
    marginBottom: 16,
  },
  bottomSpacing: {
    height: 80,
  },
});
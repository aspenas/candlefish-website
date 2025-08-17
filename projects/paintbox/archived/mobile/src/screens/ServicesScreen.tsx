/**
 * Services Screen - List and manage all services
 * Features:
 * - Filterable service grid/list
 * - Search functionality
 * - Status filtering
 * - Environment filtering
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import {
  Text,
  useTheme,
  ActivityIndicator,
  Searchbar,
  SegmentedButtons,
  FAB,
} from 'react-native-paper';
import { useQuery } from '@apollo/client';
import { FlatGrid } from 'react-native-super-grid';
import { Dimensions } from 'react-native';

// Queries and Types
import { GET_SERVICES_GRID } from '@/services/queries';
import { ServicesStackParamList } from '@/navigation/AppNavigator';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

// Components
import ServiceStatusCard from '@/components/ServiceStatusCard';
import ErrorState from '@/components/ErrorState';

type Props = NativeStackScreenProps<ServicesStackParamList, 'ServicesList'>;

const { width } = Dimensions.get('window');

const statusFilters = [
  { label: 'All', value: 'ALL' },
  { label: 'Healthy', value: 'HEALTHY' },
  { label: 'Degraded', value: 'DEGRADED' },
  { label: 'Unhealthy', value: 'UNHEALTHY' },
];

export default function ServicesScreen({ navigation }: Props) {
  const theme = useTheme();

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Services query with filters
  const { data, loading, error, refetch } = useQuery(GET_SERVICES_GRID, {
    variables: {
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      limit: 100,
    },
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });

  // Filter services based on search query
  const filteredServices = useMemo(() => {
    if (!data?.services) return [];

    let filtered = data.services;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(service =>
        service.name.toLowerCase().includes(query) ||
        (service.displayName && service.displayName.toLowerCase().includes(query)) ||
        service.environment.toLowerCase().includes(query) ||
        service.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [data?.services, searchQuery]);

  // Refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  // Navigate to service detail
  const navigateToService = (serviceId: string) => {
    navigation.navigate('ServiceDetail', { serviceId });
  };

  // Stats
  const stats = useMemo(() => {
    if (!data?.services) return { total: 0, healthy: 0, degraded: 0, unhealthy: 0 };

    return data.services.reduce((acc, service) => {
      acc.total++;
      switch (service.status) {
        case 'HEALTHY':
          acc.healthy++;
          break;
        case 'DEGRADED':
          acc.degraded++;
          break;
        case 'UNHEALTHY':
          acc.unhealthy++;
          break;
      }
      return acc;
    }, { total: 0, healthy: 0, degraded: 0, unhealthy: 0 });
  }, [data?.services]);

  if (error && !data) {
    return (
      <ErrorState
        title="Unable to Load Services"
        description="Check your connection and try again"
        onRetry={() => refetch()}
        showRetry
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          Services
        </Text>

        {data && (
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {stats.healthy} healthy • {stats.degraded} degraded • {stats.unhealthy} unhealthy
          </Text>
        )}
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search services..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
          inputStyle={styles.searchInput}
        />
      </View>

      {/* Status Filter */}
      <View style={styles.filterContainer}>
        <SegmentedButtons
          value={statusFilter}
          onValueChange={setStatusFilter}
          buttons={statusFilters}
          style={styles.segmentedButtons}
        />
      </View>

      {/* Loading */}
      {loading && !data && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="bodyMedium" style={styles.loadingText}>
            Loading services...
          </Text>
        </View>
      )}

      {/* Services Grid */}
      {filteredServices.length > 0 ? (
        <FlatGrid
          itemDimension={width > 600 ? 200 : 160}
          data={filteredServices}
          style={styles.grid}
          contentContainerStyle={styles.gridContent}
          spacing={12}
          renderItem={({ item }) => (
            <ServiceStatusCard
              service={item}
              onPress={() => navigateToService(item.id)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
        />
      ) : !loading && (
        <View style={styles.emptyContainer}>
          <Text variant="bodyLarge" style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
            {searchQuery ? 'No services match your search' : 'No services found'}
          </Text>
          {searchQuery && (
            <Text variant="bodyMedium" style={[styles.emptySubtext, { color: theme.colors.onSurfaceVariant }]}>
              Try adjusting your search or filter criteria
            </Text>
          )}
        </View>
      )}

      {/* Floating Action Button */}
      <FAB
        icon="refresh"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={onRefresh}
        loading={refreshing || loading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontWeight: '600',
    marginBottom: 4,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchbar: {
    elevation: 0,
    backgroundColor: 'transparent',
  },
  searchInput: {
    fontSize: 16,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  segmentedButtons: {
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
  },
  grid: {
    flex: 1,
    paddingHorizontal: 4,
  },
  gridContent: {
    paddingHorizontal: 12,
    paddingBottom: 80, // Space for FAB
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    textAlign: 'center',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Chip,
  Button,
  Searchbar,
  Surface,
  Text,
  IconButton,
  useTheme,
  FAB,
  Badge,
  Menu,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@apollo/client';
import { format, parseISO } from 'date-fns';

// GraphQL
import {
  GET_SECURITY_INCIDENTS,
  UPDATE_INCIDENT_STATUS,
  ASSIGN_INCIDENT,
} from '@/graphql/queries/security.graphql';

// Types
import { 
  SecurityIncident, 
  IncidentStatus, 
  IncidentPriority,
  IncidentCategory,
} from '@/types/security';

// Components
import { IncidentFilterModal } from '@/components/incidents/IncidentFilterModal';
import { IncidentDetailModal } from '@/components/incidents/IncidentDetailModal';
import { CreateIncidentModal } from '@/components/incidents/CreateIncidentModal';
import { NetworkStatusBar } from '@/components/common/NetworkStatusBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

// Hooks
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useAuth } from '@/hooks/useAuth';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';

interface IncidentsScreenProps {
  navigation: any;
}

interface IncidentFilters {
  status?: IncidentStatus[];
  priority?: IncidentPriority[];
  category?: IncidentCategory[];
  assignee?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchTerm?: string;
}

export const IncidentsScreen: React.FC<IncidentsScreenProps> = ({ navigation }) => {
  const theme = useTheme();
  const { isConnected } = useNetworkStatus();
  const { user } = useAuth();
  const { queueSize } = useOfflineQueue();

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<IncidentFilters>({});
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<SecurityIncident | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [sortBy, setSortBy] = useState<'created' | 'updated' | 'priority'>('created');

  // GraphQL queries and mutations
  const {
    data: incidentsData,
    loading,
    error,
    refetch,
  } = useQuery<{ securityIncidents: SecurityIncident[] }>(GET_SECURITY_INCIDENTS, {
    variables: {
      filters: {
        ...filters,
        searchTerm: searchQuery || undefined,
      },
      sortBy,
      limit: 50,
    },
    errorPolicy: 'cache-first',
    pollInterval: isConnected ? 60000 : 0, // Poll every minute when online
  });

  const [updateIncidentStatus] = useMutation(UPDATE_INCIDENT_STATUS);
  const [assignIncident] = useMutation(ASSIGN_INCIDENT);

  const incidents = incidentsData?.securityIncidents || [];

  // Filter and sort incidents
  const filteredIncidents = useMemo(() => {
    let filtered = incidents.filter(incident => {
      // Search filter
      if (searchQuery) {
        const searchTerm = searchQuery.toLowerCase();
        if (
          !incident.title.toLowerCase().includes(searchTerm) &&
          !incident.description.toLowerCase().includes(searchTerm) &&
          !incident.id.toLowerCase().includes(searchTerm)
        ) {
          return false;
        }
      }

      return true;
    });

    // Sort incidents
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          const priorityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        case 'updated':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'created':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return filtered;
  }, [incidents, searchQuery, sortBy]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (error) {
      console.error('Failed to refresh incidents:', error);
    }
    setRefreshing(false);
  }, [refetch]);

  const handleUpdateStatus = async (incidentId: string, newStatus: IncidentStatus) => {
    try {
      await updateIncidentStatus({ 
        variables: { 
          incidentId, 
          status: newStatus,
          updatedBy: user?.id,
        } 
      });
      await refetch();
    } catch (error) {
      console.error('Failed to update incident status:', error);
      Alert.alert('Error', 'Failed to update incident status');
    }
  };

  const handleAssignToMe = async (incidentId: string) => {
    try {
      await assignIncident({ 
        variables: { 
          incidentId, 
          assigneeId: user?.id,
        } 
      });
      await refetch();
    } catch (error) {
      console.error('Failed to assign incident:', error);
      Alert.alert('Error', 'Failed to assign incident');
    }
  };

  const getPriorityColor = (priority: IncidentPriority): string => {
    switch (priority) {
      case 'CRITICAL':
        return '#d32f2f';
      case 'HIGH':
        return '#f57c00';
      case 'MEDIUM':
        return '#1976d2';
      case 'LOW':
        return '#388e3c';
      default:
        return theme.colors.outline;
    }
  };

  const getStatusColor = (status: IncidentStatus): string => {
    switch (status) {
      case 'OPEN':
        return theme.colors.error;
      case 'IN_PROGRESS':
        return theme.colors.tertiary;
      case 'RESOLVED':
        return theme.colors.primary;
      case 'CLOSED':
        return theme.colors.outline;
      default:
        return theme.colors.outline;
    }
  };

  const getCategoryIcon = (category: IncidentCategory): string => {
    switch (category) {
      case 'MALWARE':
        return 'virus';
      case 'PHISHING':
        return 'email-alert';
      case 'DATA_BREACH':
        return 'database-alert';
      case 'UNAUTHORIZED_ACCESS':
        return 'account-alert';
      case 'DDOS':
        return 'server-network-off';
      case 'INSIDER_THREAT':
        return 'account-supervisor-circle';
      case 'VULNERABILITY':
        return 'shield-alert';
      case 'POLICY_VIOLATION':
        return 'file-document-alert';
      case 'OTHER':
      default:
        return 'alert-circle';
    }
  };

  const renderIncident = ({ item: incident }: { item: SecurityIncident }) => (
    <Card
      style={[
        styles.incidentCard,
        incident.status === 'OPEN' && styles.openIncident,
      ]}
      onPress={() => {
        setSelectedIncident(incident);
        setShowDetailModal(true);
      }}
    >
      <Card.Content>
        <View style={styles.incidentHeader}>
          <View style={styles.incidentInfo}>
            <View style={styles.incidentTitleRow}>
              <MaterialCommunityIcons
                name={getCategoryIcon(incident.category)}
                size={20}
                color={getPriorityColor(incident.priority)}
                style={styles.categoryIcon}
              />
              <Text style={styles.incidentTitle} numberOfLines={2}>
                {incident.title}
              </Text>
            </View>

            <Text style={styles.incidentId}>#{incident.id.slice(-8).toUpperCase()}</Text>

            <View style={styles.chipContainer}>
              <Chip
                mode="outlined"
                compact
                textStyle={{ color: getPriorityColor(incident.priority) }}
                style={[
                  styles.priorityChip,
                  { borderColor: getPriorityColor(incident.priority) }
                ]}
              >
                {incident.priority}
              </Chip>
              <Chip
                mode="outlined"
                compact
                textStyle={{ color: getStatusColor(incident.status) }}
                style={[
                  styles.statusChip,
                  { borderColor: getStatusColor(incident.status) }
                ]}
              >
                {incident.status.replace('_', ' ')}
              </Chip>
              <Chip
                mode="outlined"
                compact
                style={styles.categoryChip}
              >
                {incident.category.replace('_', ' ')}
              </Chip>
            </View>
          </View>

          {incident.status === 'OPEN' && (
            <Badge size={8} style={[styles.badge, { backgroundColor: theme.colors.error }]} />
          )}
        </View>

        <Paragraph style={styles.incidentDescription} numberOfLines={3}>
          {incident.description}
        </Paragraph>

        <View style={styles.incidentMeta}>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={16}
                color={theme.colors.outline}
              />
              <Text style={styles.metaText}>
                Created: {format(parseISO(incident.createdAt), 'MMM d, HH:mm')}
              </Text>
            </View>
            
            {incident.assignee && (
              <View style={styles.metaItem}>
                <MaterialCommunityIcons
                  name="account-circle-outline"
                  size={16}
                  color={theme.colors.outline}
                />
                <Text style={styles.metaText} numberOfLines={1}>
                  {incident.assignee.name}
                </Text>
              </View>
            )}
          </View>

          {incident.updatedAt !== incident.createdAt && (
            <View style={styles.metaItem}>
              <MaterialCommunityIcons
                name="update"
                size={16}
                color={theme.colors.outline}
              />
              <Text style={styles.metaText}>
                Updated: {format(parseISO(incident.updatedAt), 'MMM d, HH:mm')}
              </Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        {incident.status === 'OPEN' && (
          <View style={styles.incidentActions}>
            {!incident.assignee && (
              <Button
                mode="outlined"
                compact
                onPress={() => handleAssignToMe(incident.id)}
                style={styles.actionButton}
                icon="account-plus"
              >
                Assign to Me
              </Button>
            )}
            <Button
              mode="contained"
              compact
              onPress={() => handleUpdateStatus(incident.id, 'IN_PROGRESS')}
              style={styles.actionButton}
              icon="play"
            >
              Start Work
            </Button>
          </View>
        )}

        {incident.status === 'IN_PROGRESS' && (
          <View style={styles.incidentActions}>
            <Button
              mode="outlined"
              compact
              onPress={() => handleUpdateStatus(incident.id, 'OPEN')}
              style={styles.actionButton}
            >
              Reopen
            </Button>
            <Button
              mode="contained"
              compact
              onPress={() => handleUpdateStatus(incident.id, 'RESOLVED')}
              style={styles.actionButton}
              icon="check"
            >
              Resolve
            </Button>
          </View>
        )}
      </Card.Content>
    </Card>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Title style={styles.title}>Security Incidents</Title>

      {queueSize > 0 && (
        <Chip mode="outlined" compact style={styles.queueChip}>
          {queueSize} pending sync
        </Chip>
      )}

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search incidents..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
        <IconButton
          icon="filter-variant"
          mode="outlined"
          onPress={() => setShowFilterModal(true)}
          style={styles.filterButton}
        />
        <Menu
          visible={sortMenuVisible}
          onDismiss={() => setSortMenuVisible(false)}
          anchor={
            <IconButton
              icon="sort"
              mode="outlined"
              onPress={() => setSortMenuVisible(true)}
              style={styles.sortButton}
            />
          }
        >
          <Menu.Item
            onPress={() => {
              setSortBy('created');
              setSortMenuVisible(false);
            }}
            title="Created Date"
            leadingIcon="clock"
          />
          <Menu.Item
            onPress={() => {
              setSortBy('updated');
              setSortMenuVisible(false);
            }}
            title="Updated Date"
            leadingIcon="update"
          />
          <Menu.Item
            onPress={() => {
              setSortBy('priority');
              setSortMenuVisible(false);
            }}
            title="Priority"
            leadingIcon="priority-high"
          />
        </Menu>
      </View>

      {/* Incident Statistics */}
      <Surface style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.colors.error }]}>
            {incidents.filter(i => i.status === 'OPEN').length}
          </Text>
          <Text style={styles.statLabel}>Open</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.colors.tertiary }]}>
            {incidents.filter(i => i.status === 'IN_PROGRESS').length}
          </Text>
          <Text style={styles.statLabel}>In Progress</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: getPriorityColor('CRITICAL') }]}>
            {incidents.filter(i => i.priority === 'CRITICAL').length}
          </Text>
          <Text style={styles.statLabel}>Critical</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.colors.primary }]}>
            {incidents.filter(i => i.assignee?.id === user?.id).length}
          </Text>
          <Text style={styles.statLabel}>Assigned to Me</Text>
        </View>
      </Surface>
    </View>
  );

  if (loading && !incidents.length) {
    return (
      <SafeAreaView style={styles.container}>
        <NetworkStatusBar />
        <LoadingSpinner text="Loading incidents..." />
      </SafeAreaView>
    );
  }

  if (error && !incidents.length) {
    return (
      <SafeAreaView style={styles.container}>
        <NetworkStatusBar />
        <EmptyState
          icon="alert-circle-outline"
          title="Unable to Load Incidents"
          description={
            isConnected
              ? 'There was an error loading the incidents.'
              : 'You are currently offline. Please check your connection.'
          }
          action={
            <Button mode="contained" onPress={onRefresh}>
              Retry
            </Button>
          }
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <NetworkStatusBar />

      <FlatList
        data={filteredIncidents}
        renderItem={renderIncident}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <EmptyState
            icon="shield-check-outline"
            title="No Incidents Found"
            description={
              searchQuery || Object.keys(filters).length > 0
                ? 'Try adjusting your search or filter criteria.'
                : 'No security incidents at this time.'
            }
            action={
              searchQuery || Object.keys(filters).length > 0 ? (
                <Button
                  mode="outlined"
                  onPress={() => {
                    setSearchQuery('');
                    setFilters({});
                  }}
                >
                  Clear Filters
                </Button>
              ) : undefined
            }
          />
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Floating Action Button */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setShowCreateModal(true)}
        label="New Incident"
      />

      {/* Filter Modal */}
      <IncidentFilterModal
        visible={showFilterModal}
        onDismiss={() => setShowFilterModal(false)}
        filters={filters}
        onApplyFilters={(newFilters) => {
          setFilters(newFilters);
          setShowFilterModal(false);
        }}
      />

      {/* Incident Detail Modal */}
      <IncidentDetailModal
        visible={showDetailModal}
        onDismiss={() => setShowDetailModal(false)}
        incident={selectedIncident}
        onUpdateStatus={handleUpdateStatus}
        onAssign={handleAssignToMe}
      />

      {/* Create Incident Modal */}
      <CreateIncidentModal
        visible={showCreateModal}
        onDismiss={() => setShowCreateModal(false)}
        onIncidentCreated={(incident) => {
          setShowCreateModal(false);
          refetch();
          // Optionally navigate to the new incident
          setSelectedIncident(incident);
          setShowDetailModal(true);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  listContent: {
    paddingBottom: 80, // Account for FAB
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  queueChip: {
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  searchbar: {
    flex: 1,
    elevation: 2,
  },
  filterButton: {
    marginLeft: 8,
  },
  sortButton: {
    marginLeft: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    marginBottom: 8,
    borderRadius: 12,
    elevation: 1,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  incidentCard: {
    marginHorizontal: 16,
    marginVertical: 4,
    elevation: 2,
  },
  openIncident: {
    borderLeftWidth: 4,
    borderLeftColor: '#d32f2f',
  },
  incidentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  incidentInfo: {
    flex: 1,
  },
  incidentTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  categoryIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  incidentTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  incidentId: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  priorityChip: {
    height: 28,
  },
  statusChip: {
    height: 28,
  },
  categoryChip: {
    height: 28,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  incidentDescription: {
    marginBottom: 12,
    opacity: 0.8,
  },
  incidentMeta: {
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  metaText: {
    marginLeft: 6,
    fontSize: 12,
    opacity: 0.7,
    flex: 1,
  },
  incidentActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    minWidth: 100,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default IncidentsScreen;
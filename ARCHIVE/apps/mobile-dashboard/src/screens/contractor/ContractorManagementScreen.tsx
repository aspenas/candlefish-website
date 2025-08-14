import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@apollo/client';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

// GraphQL
import {
  GET_CONTRACTORS_QUERY,
  INVITE_CONTRACTOR_MUTATION,
  UPDATE_CONTRACTOR_STATUS_MUTATION,
} from '@/graphql/contractor';

// Components
import { ContractorCard } from '@/components/contractor/ContractorCard';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorView } from '@/components/ui/ErrorView';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { SearchBar } from '@/components/ui/SearchBar';

// Hooks
import { useTheme } from '@/hooks/useTheme';

// Types
import { Contractor, ContractorStatus } from '@/types/graphql';

interface ContractorManagementScreenProps {
  route: {
    params: {
      organizationId: string;
    };
  };
}

export const ContractorManagementScreen: React.FC<ContractorManagementScreenProps> = ({
  route
}) => {
  const { organizationId } = route.params;
  const navigation = useNavigation();
  const { theme } = useTheme();

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<ContractorStatus | 'ALL'>('ALL');
  const [selectedContractor, setSelectedContractor] = useState<string | null>(null);

  // Queries and mutations
  const {
    data,
    loading,
    error,
    refetch,
  } = useQuery(GET_CONTRACTORS_QUERY, {
    variables: { organizationId },
    errorPolicy: 'all',
  });

  const [inviteContractor] = useMutation(INVITE_CONTRACTOR_MUTATION, {
    refetchQueries: [{ query: GET_CONTRACTORS_QUERY, variables: { organizationId } }],
  });

  const [updateContractorStatus] = useMutation(UPDATE_CONTRACTOR_STATUS_MUTATION, {
    refetchQueries: [{ query: GET_CONTRACTORS_QUERY, variables: { organizationId } }],
  });

  const contractors: Contractor[] = data?.contractors || [];

  // Filter contractors based on search and status
  const filteredContractors = contractors.filter(contractor => {
    const matchesSearch = searchQuery === '' ||
      contractor.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contractor.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contractor.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contractor.company?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = selectedStatus === 'ALL' || contractor.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (error) {
      console.error('Failed to refresh contractors:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  // Navigation handlers
  const handleAddContractor = () => {
    navigation.navigate('AddContractor', { organizationId });
  };

  const handleScanQR = () => {
    navigation.navigate('QRScanner', {
      onScanSuccess: handleQRScanSuccess,
      title: 'Scan Contractor QR Code',
      instructions: 'Point your camera at the contractor\'s QR code to add them to your organization',
    });
  };

  const handleQRScanSuccess = useCallback(async (data: string) => {
    try {
      // Parse QR code data (expected format: contractor invitation token)
      const invitationData = JSON.parse(data);

      if (invitationData.type === 'contractor_invitation' && invitationData.token) {
        // Process contractor invitation
        await inviteContractor({
          variables: {
            organizationId,
            invitationToken: invitationData.token,
          },
        });

        Alert.alert(
          'Success',
          'Contractor has been successfully added to your organization.',
          [{ text: 'OK' }]
        );
      } else {
        throw new Error('Invalid QR code format');
      }
    } catch (error) {
      console.error('Failed to process QR code:', error);
      Alert.alert(
        'Invalid QR Code',
        'The scanned QR code is not a valid contractor invitation.',
        [{ text: 'OK' }]
      );
    }
  }, [inviteContractor, organizationId]);

  // Contractor actions
  const handleContractorPress = (contractor: Contractor) => {
    setSelectedContractor(contractor.id);
    navigation.navigate('ContractorDetail', {
      contractorId: contractor.id,
      organizationId,
    });
  };

  const handleContractorLongPress = (contractor: Contractor) => {
    const actions = [
      { text: 'View Details', onPress: () => handleContractorPress(contractor) },
      { text: 'View Dashboards', onPress: () => handleViewDashboards(contractor) },
    ];

    if (contractor.status === ContractorStatus.ACTIVE) {
      actions.push({
        text: 'Suspend',
        onPress: () => handleUpdateStatus(contractor.id, ContractorStatus.SUSPENDED),
        style: 'destructive',
      });
    } else if (contractor.status === ContractorStatus.SUSPENDED) {
      actions.push({
        text: 'Reactivate',
        onPress: () => handleUpdateStatus(contractor.id, ContractorStatus.ACTIVE),
      });
    }

    actions.push({ text: 'Cancel', style: 'cancel' });

    Alert.alert(
      `${contractor.firstName} ${contractor.lastName}`,
      'Choose an action',
      actions
    );
  };

  const handleViewDashboards = (contractor: Contractor) => {
    navigation.navigate('ContractorDashboards', {
      contractorId: contractor.id,
      organizationId,
    });
  };

  const handleUpdateStatus = async (contractorId: string, status: ContractorStatus) => {
    try {
      await updateContractorStatus({
        variables: { contractorId, status },
      });

      const statusText = status === ContractorStatus.ACTIVE ? 'activated' : 'suspended';
      Alert.alert('Success', `Contractor has been ${statusText}.`);
    } catch (error) {
      console.error('Failed to update contractor status:', error);
      Alert.alert('Error', 'Failed to update contractor status.');
    }
  };

  // Status filter options
  const statusOptions = [
    { value: 'ALL', label: 'All', count: contractors.length },
    { value: ContractorStatus.ACTIVE, label: 'Active', count: contractors.filter(c => c.status === ContractorStatus.ACTIVE).length },
    { value: ContractorStatus.PENDING, label: 'Pending', count: contractors.filter(c => c.status === ContractorStatus.PENDING).length },
    { value: ContractorStatus.SUSPENDED, label: 'Suspended', count: contractors.filter(c => c.status === ContractorStatus.SUSPENDED).length },
  ];

  // Render loading state
  if (loading && !data) {
    return <LoadingScreen message="Loading contractors..." />;
  }

  // Render error state
  if (error && !data) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ErrorView
          error={error}
          onRetry={refetch}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style={theme.dark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'}
            size={24}
            color={theme.colors.text}
          />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Contractors
        </Text>

        <TouchableOpacity
          style={styles.scanButton}
          onPress={handleScanQR}
        >
          <Ionicons name="qr-code-outline" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search contractors..."
        style={styles.searchBar}
      />

      {/* Status filter */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={statusOptions}
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                {
                  backgroundColor: selectedStatus === item.value
                    ? theme.colors.primary
                    : theme.colors.surface,
                  borderColor: selectedStatus === item.value
                    ? theme.colors.primary
                    : theme.colors.border,
                },
              ]}
              onPress={() => setSelectedStatus(item.value as ContractorStatus | 'ALL')}
            >
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color: selectedStatus === item.value
                      ? theme.colors.surface
                      : theme.colors.text,
                  },
                ]}
              >
                {item.label} ({item.count})
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Contractors list */}
      <FlatList
        data={filteredContractors}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ContractorCard
            contractor={item}
            onPress={() => handleContractorPress(item)}
            onLongPress={() => handleContractorLongPress(item)}
            isSelected={selectedContractor === item.id}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          filteredContractors.length === 0 && styles.emptyListContent,
        ]}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name="people-outline"
              size={64}
              color={theme.colors.textSecondary}
            />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              No contractors found
            </Text>
            <Text style={[styles.emptyMessage, { color: theme.colors.textSecondary }]}>
              {searchQuery || selectedStatus !== 'ALL'
                ? 'Try adjusting your search or filter criteria.'
                : 'Add contractors to get started with dashboard sharing.'}
            </Text>
          </View>
        }
      />

      {/* Floating action button */}
      <FloatingActionButton
        onPress={handleAddContractor}
        icon="add"
        style={styles.fab}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
  },
  scanButton: {
    padding: 8,
  },
  searchBar: {
    margin: 16,
  },
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 16,
  },
  emptyListContent: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginHorizontal: 32,
    lineHeight: 22,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});

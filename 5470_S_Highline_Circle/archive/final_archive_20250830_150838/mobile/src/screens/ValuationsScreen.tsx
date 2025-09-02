import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Toast from 'react-native-toast-message';
import { useTheme } from '../providers/ThemeProvider';
import { useOffline } from '../providers/OfflineProvider';
import { TabNavigationProps } from '../types/navigation';
import { apiService } from '../services/api';
import { PerformanceService } from '../services/performance';

// Components
import ValuationCard from '../components/ValuationCard';
import PriceHistoryChart from '../components/PriceHistoryChart';
import MarketComparisonTable from '../components/MarketComparisonTable';

// Types
import { Valuation, PriceAlert, FilterRequest } from '../types';

const ValuationsScreen: React.FC<TabNavigationProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const { isOnline } = useOffline();
  const queryClient = useQueryClient();
  const styles = createStyles(theme);
  
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'recent' | 'expired'>('all');
  const [showPriceAlertModal, setShowPriceAlertModal] = useState(false);
  const [selectedValuation, setSelectedValuation] = useState<Valuation | null>(null);
  const [alertThreshold, setAlertThreshold] = useState('');
  const [alertType, setAlertType] = useState<'above_threshold' | 'below_threshold'>('above_threshold');

  useEffect(() => {
    const startTime = Date.now();
    
    return () => {
      const loadTime = Date.now() - startTime;
      PerformanceService.recordScreenMetrics({
        screen: 'Valuations',
        loadTime,
        renderTime: loadTime,
        memoryUsage: 0,
        batteryLevel: 0,
        timestamp: new Date(),
      });
    };
  }, []);

  // Fetch valuations
  const {
    data: valuations,
    isLoading: valuationsLoading,
    refetch: refetchValuations,
  } = useQuery(
    ['valuations', selectedFilter, searchQuery],
    () => fetchValuations(),
    {
      refetchOnMount: true,
      enabled: isOnline,
    }
  );

  // Create price alert mutation
  const createPriceAlertMutation = useMutation(
    (alertData: any) => apiService.createPriceAlert(alertData),
    {
      onSuccess: () => {
        Toast.show({
          type: 'success',
          text1: 'Price Alert Created',
          text2: 'You will be notified of price changes',
        });
        setShowPriceAlertModal(false);
        setSelectedValuation(null);
        setAlertThreshold('');
        queryClient.invalidateQueries('priceAlerts');
      },
      onError: (error) => {
        Toast.show({
          type: 'error',
          text1: 'Failed to Create Alert',
          text2: error instanceof Error ? error.message : 'Please try again',
        });
      },
    }
  );

  const fetchValuations = async () => {
    const filter: FilterRequest = {
      rooms: [],
      categories: [],
      decisions: [],
      sortBy: 'updated_at',
      sortOrder: 'desc',
      page: 1,
      limit: 50,
    };

    // Apply search filter
    if (searchQuery.trim()) {
      // This would be implemented in the API
      console.log('Searching valuations:', searchQuery);
    }

    // Apply time filter
    if (selectedFilter === 'recent') {
      // Filter for valuations from last 30 days
      console.log('Filtering recent valuations');
    } else if (selectedFilter === 'expired') {
      // Filter for expired valuations
      console.log('Filtering expired valuations');
    }

    // For demo, use the recent valuations endpoint
    return apiService.getRecentValuations(50);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetchValuations();
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleValuationPress = (valuation: Valuation) => {
    if (valuation.item?.id) {
      navigation.navigate('ItemDetail', {
        itemId: valuation.item.id,
        itemName: valuation.item.name,
      });
    }
  };

  const handleCreatePriceAlert = (valuation: Valuation) => {
    setSelectedValuation(valuation);
    setShowPriceAlertModal(true);
  };

  const handleViewHistory = (valuation: Valuation) => {
    if (valuation.item?.id) {
      navigation.navigate('PriceHistory', {
        itemId: valuation.item.id,
        itemName: valuation.item.name || 'Item',
      });
    }
  };

  const handleViewComparisons = (valuation: Valuation) => {
    navigation.navigate('MarketComparisons', {
      valuationId: valuation.id,
      itemName: valuation.item?.name || 'Item',
    });
  };

  const submitPriceAlert = async () => {
    if (!selectedValuation || !alertThreshold.trim()) {
      Alert.alert('Error', 'Please enter a threshold value');
      return;
    }

    const threshold = parseFloat(alertThreshold);
    if (isNaN(threshold) || threshold <= 0) {
      Alert.alert('Error', 'Please enter a valid threshold amount');
      return;
    }

    const alertData = {
      item_id: selectedValuation.item_id,
      alert_type: alertType,
      threshold_value: threshold,
      notification_method: 'push' as const,
    };

    createPriceAlertMutation.mutate(alertData);
  };

  const renderFilterTabs = () => (
    <View style={styles.filterTabs}>
      {[
        { key: 'all', label: 'All' },
        { key: 'recent', label: 'Recent' },
        { key: 'expired', label: 'Expired' },
      ].map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[
            styles.filterTab,
            selectedFilter === tab.key && styles.activeFilterTab,
          ]}
          onPress={() => setSelectedFilter(tab.key as any)}
        >
          <Text
            style={[
              styles.filterTabText,
              selectedFilter === tab.key && styles.activeFilterTabText,
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <Icon name="search" size={20} color={theme.colors.textSecondary} />
      <TextInput
        style={styles.searchInput}
        placeholder="Search valuations..."
        placeholderTextColor={theme.colors.textSecondary}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      {searchQuery.length > 0 && (
        <TouchableOpacity onPress={() => setSearchQuery('')}>
          <Icon name="clear" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderPriceAlertModal = () => (
    <Modal
      visible={showPriceAlertModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Create Price Alert</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowPriceAlertModal(false)}
          >
            <Icon name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.modalContent}>
          {selectedValuation && (
            <View style={styles.selectedItemInfo}>
              <Text style={styles.selectedItemName}>
                {selectedValuation.item?.name || 'Selected Item'}
              </Text>
              <Text style={styles.selectedItemValue}>
                Current Value: ${selectedValuation.estimated_value.toLocaleString()}
              </Text>
            </View>
          )}

          <View style={styles.alertTypeContainer}>
            <Text style={styles.sectionLabel}>Alert Type</Text>
            <View style={styles.alertTypeButtons}>
              {[
                { key: 'above_threshold', label: 'Above Threshold', icon: 'trending-up' },
                { key: 'below_threshold', label: 'Below Threshold', icon: 'trending-down' },
              ].map((type) => (
                <TouchableOpacity
                  key={type.key}
                  style={[
                    styles.alertTypeButton,
                    alertType === type.key && styles.selectedAlertType,
                  ]}
                  onPress={() => setAlertType(type.key as any)}
                >
                  <Icon
                    name={type.icon}
                    size={20}
                    color={alertType === type.key ? 'white' : theme.colors.primary}
                  />
                  <Text
                    style={[
                      styles.alertTypeText,
                      alertType === type.key && styles.selectedAlertTypeText,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.thresholdContainer}>
            <Text style={styles.sectionLabel}>Threshold Amount</Text>
            <View style={styles.thresholdInputContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.thresholdInput}
                placeholder="0.00"
                value={alertThreshold}
                onChangeText={setAlertThreshold}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        </View>

        <View style={styles.modalActions}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setShowPriceAlertModal(false)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.createAlertButton,
              createPriceAlertMutation.isLoading && styles.disabledButton,
            ]}
            onPress={submitPriceAlert}
            disabled={createPriceAlertMutation.isLoading}
          >
            {createPriceAlertMutation.isLoading ? (
              <Text style={styles.createAlertButtonText}>Creating...</Text>
            ) : (
              <Text style={styles.createAlertButtonText}>Create Alert</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderOfflineMessage = () => {
    if (isOnline) return null;
    
    return (
      <View style={styles.offlineMessage}>
        <Icon name="cloud-off" size={16} color={theme.colors.warning} />
        <Text style={styles.offlineText}>
          Offline - Showing cached valuations
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderOfflineMessage()}
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Valuations</Text>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Icon name="settings" size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {renderSearchBar()}
        {renderFilterTabs()}

        {/* Valuations List */}
        {valuations && valuations.length > 0 ? (
          <View style={styles.valuationsList}>
            {valuations.map((valuation) => (
              <ValuationCard
                key={valuation.id}
                valuation={valuation}
                showDetails={true}
                onPress={() => handleValuationPress(valuation)}
                onRequestUpdate={() => handleCreatePriceAlert(valuation)}
                onViewHistory={() => handleViewHistory(valuation)}
                onViewComparisons={() => handleViewComparisons(valuation)}
              />
            ))}
          </View>
        ) : valuationsLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading valuations...</Text>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Icon name="assessment" size={64} color={theme.colors.textSecondary} />
            <Text style={styles.emptyTitle}>No Valuations Found</Text>
            <Text style={styles.emptySubtitle}>
              Start by taking photos of items or scanning QR codes to generate valuations.
            </Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigation.navigate('Camera')}
            >
              <Icon name="camera-alt" size={20} color="white" />
              <Text style={styles.addButtonText}>Capture Item</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {renderPriceAlertModal()}
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  offlineMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warning + '20',
    padding: theme.spacing.sm,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  offlineText: {
    marginLeft: theme.spacing.xs,
    fontSize: theme.fontSize.sm,
    color: theme.colors.warning,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '600',
    color: theme.colors.text,
  },
  settingsButton: {
    padding: theme.spacing.xs,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    paddingVertical: theme.spacing.sm,
    marginLeft: theme.spacing.sm,
  },
  filterTabs: {
    flexDirection: 'row',
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.xs,
  },
  filterTab: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderRadius: theme.borderRadius.sm,
  },
  activeFilterTab: {
    backgroundColor: theme.colors.primary,
  },
  filterTabText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  activeFilterTabText: {
    color: 'white',
  },
  valuationsList: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  loadingContainer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  emptySubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  addButtonText: {
    color: 'white',
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    marginLeft: theme.spacing.sm,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  modalContent: {
    flex: 1,
    padding: theme.spacing.md,
  },
  selectedItemInfo: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
  },
  selectedItemName: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  selectedItemValue: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  sectionLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  alertTypeContainer: {
    marginBottom: theme.spacing.lg,
  },
  alertTypeButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  alertTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  selectedAlertType: {
    backgroundColor: theme.colors.primary,
  },
  alertTypeText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    marginLeft: theme.spacing.xs,
  },
  selectedAlertTypeText: {
    color: 'white',
  },
  thresholdContainer: {
    marginBottom: theme.spacing.lg,
  },
  thresholdInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
  },
  currencySymbol: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.text,
    marginRight: theme.spacing.xs,
  },
  thresholdInput: {
    flex: 1,
    fontSize: theme.fontSize.lg,
    color: theme.colors.text,
    paddingVertical: theme.spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: theme.colors.textSecondary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: theme.fontSize.md,
    fontWeight: '500',
  },
  createAlertButton: {
    flex: 2,
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
  },
  createAlertButtonText: {
    color: 'white',
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: theme.colors.textSecondary,
  },
});

export default ValuationsScreen;
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Toast from 'react-native-toast-message';
import { useTheme } from '../providers/ThemeProvider';
import { useOffline } from '../providers/OfflineProvider';
import { ItemDetailScreenProps } from '../types/navigation';
import { apiService } from '../services/api';
import { PerformanceService } from '../services/performance';

// Components
import ValuationCard from '../components/ValuationCard';
import PriceHistoryChart from '../components/PriceHistoryChart';
import MarketComparisonTable from '../components/MarketComparisonTable';

// Types
import { Item, Valuation, PriceHistory, MarketComparison } from '../types';

const ItemDetailScreen: React.FC<ItemDetailScreenProps> = ({ navigation, route }) => {
  const { itemId, itemName } = route.params;
  const { theme } = useTheme();
  const { isOnline } = useOffline();
  const queryClient = useQueryClient();
  const styles = createStyles(theme);
  
  const [refreshing, setRefreshing] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    
    // Set header title
    navigation.setOptions({
      title: itemName || 'Item Details',
    });
    
    return () => {
      const loadTime = Date.now() - startTime;
      PerformanceService.recordScreenMetrics({
        screen: 'ItemDetail',
        loadTime,
        renderTime: loadTime,
        memoryUsage: 0,
        batteryLevel: 0,
        timestamp: new Date(),
      });
    };
  }, [navigation, itemName]);

  // Fetch item details
  const {
    data: item,
    isLoading: itemLoading,
    refetch: refetchItem,
  } = useQuery(
    ['item', itemId],
    () => apiService.getItem(itemId),
    {
      refetchOnMount: true,
      enabled: isOnline,
    }
  );

  // Fetch price history
  const {
    data: priceHistory,
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = useQuery(
    ['valuationHistory', itemId],
    () => apiService.getValuationHistory(itemId),
    {
      refetchOnMount: true,
      enabled: isOnline && !!item,
    }
  );

  // Fetch market comparisons for latest valuation
  const {
    data: marketComparisons,
    isLoading: comparisonsLoading,
    refetch: refetchComparisons,
  } = useQuery(
    ['marketComparisons', item?.valuations?.[0]?.id],
    () => apiService.getMarketComparisons(item!.valuations![0].id),
    {
      refetchOnMount: true,
      enabled: isOnline && !!item?.valuations?.[0]?.id,
    }
  );

  // Create new valuation mutation
  const createValuationMutation = useMutation(
    () => apiService.createValuation({
      item_id: itemId,
      valuation_type: 'ai_estimated',
      force_refresh: true,
    }),
    {
      onSuccess: () => {
        Toast.show({
          type: 'success',
          text1: 'Valuation Updated',
          text2: 'New valuation has been generated',
        });
        queryClient.invalidateQueries(['item', itemId]);
        queryClient.invalidateQueries(['valuationHistory', itemId]);
      },
      onError: (error) => {
        Toast.show({
          type: 'error',
          text1: 'Update Failed',
          text2: error instanceof Error ? error.message : 'Please try again',
        });
      },
    }
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchItem(),
        refetchHistory(),
        refetchComparisons(),
      ]);
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleUpdateValuation = () => {
    if (!isOnline) {
      Alert.alert(
        'Offline',
        'You need to be online to update valuations. The request will be processed when you reconnect.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Update Valuation',
      'This will generate a new AI valuation for this item. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Update', 
          onPress: () => createValuationMutation.mutate()
        },
      ]
    );
  };

  const handleViewHistory = () => {
    navigation.navigate('PriceHistory', {
      itemId,
      itemName: item?.name || 'Item',
    });
  };

  const handleViewComparisons = () => {
    if (item?.valuations?.[0]) {
      navigation.navigate('MarketComparisons', {
        valuationId: item.valuations[0].id,
        itemName: item.name,
      });
    }
  };

  const handleCapturePhoto = () => {
    navigation.navigate('CameraCapture', {
      itemId,
      mode: 'documentation',
    });
  };

  const getDecisionStatusColor = (decision: string) => {
    switch (decision) {
      case 'Keep': return theme.colors.info;
      case 'Sell': return theme.colors.success;
      case 'Sold': return theme.colors.primary;
      case 'Donated': return theme.colors.accent;
      case 'Unsure': return theme.colors.warning;
      default: return theme.colors.textSecondary;
    }
  };

  const renderImageGallery = () => {
    if (!item?.images || item.images.length === 0) {
      return (
        <View style={styles.noImagesContainer}>
          <Icon name="image" size={64} color={theme.colors.textSecondary} />
          <Text style={styles.noImagesText}>No images available</Text>
          <TouchableOpacity
            style={styles.addPhotoButton}
            onPress={handleCapturePhoto}
          >
            <Icon name="add-a-photo" size={20} color={theme.colors.primary} />
            <Text style={styles.addPhotoText}>Add Photo</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.imageGallery}>
        <Image
          source={{ uri: item.images[selectedImageIndex].url }}
          style={styles.mainImage}
          resizeMode="cover"
        />
        
        {item.images.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.thumbnailContainer}
          >
            {item.images.map((image, index) => (
              <TouchableOpacity
                key={image.id}
                onPress={() => setSelectedImageIndex(index)}
              >
                <Image
                  source={{ uri: image.thumbnail_url || image.url }}
                  style={[
                    styles.thumbnail,
                    selectedImageIndex === index && styles.selectedThumbnail,
                  ]}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        
        <TouchableOpacity
          style={styles.addPhotoButtonOverlay}
          onPress={handleCapturePhoto}
        >
          <Icon name="add-a-photo" size={20} color="white" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderItemInfo = () => (
    <View style={styles.itemInfoContainer}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemName}>{item?.name}</Text>
        <View style={[
          styles.decisionBadge,
          { backgroundColor: getDecisionStatusColor(item?.decision || '') + '20' }
        ]}>
          <Text style={[
            styles.decisionText,
            { color: getDecisionStatusColor(item?.decision || '') }
          ]}>
            {item?.decision}
          </Text>
        </View>
      </View>

      <Text style={styles.itemCategory}>{item?.category}</Text>
      
      {item?.description && (
        <Text style={styles.itemDescription}>{item.description}</Text>
      )}

      <View style={styles.itemDetails}>
        <View style={styles.detailRow}>
          <Icon name="room" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.detailText}>
            {item?.room?.name} ({item?.room?.floor})
          </Text>
        </View>

        {item?.condition && (
          <View style={styles.detailRow}>
            <Icon name="info" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.detailText}>Condition: {item.condition}</Text>
          </View>
        )}

        {item?.purchase_price && (
          <View style={styles.detailRow}>
            <Icon name="shopping-cart" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.detailText}>
              Purchase Price: ${item.purchase_price.toLocaleString()}
            </Text>
          </View>
        )}

        {item?.asking_price && (
          <View style={styles.detailRow}>
            <Icon name="sell" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.detailText}>
              Asking Price: ${item.asking_price.toLocaleString()}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderActionsBar = () => (
    <View style={styles.actionsBar}>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={handleUpdateValuation}
        disabled={createValuationMutation.isLoading}
      >
        <Icon name="refresh" size={20} color={theme.colors.primary} />
        <Text style={styles.actionText}>
          {createValuationMutation.isLoading ? 'Updating...' : 'Update'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={handleViewHistory}
      >
        <Icon name="history" size={20} color={theme.colors.primary} />
        <Text style={styles.actionText}>History</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={handleViewComparisons}
        disabled={!item?.valuations?.[0]}
      >
        <Icon name="compare-arrows" size={20} color={theme.colors.primary} />
        <Text style={styles.actionText}>Compare</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={handleCapturePhoto}
      >
        <Icon name="camera-alt" size={20} color={theme.colors.primary} />
        <Text style={styles.actionText}>Photo</Text>
      </TouchableOpacity>
    </View>
  );

  const renderOfflineMessage = () => {
    if (isOnline) return null;
    
    return (
      <View style={styles.offlineMessage}>
        <Icon name="cloud-off" size={16} color={theme.colors.warning} />
        <Text style={styles.offlineText}>
          Offline - Some features may be limited
        </Text>
      </View>
    );
  };

  if (itemLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading item details...</Text>
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="error" size={64} color={theme.colors.error} />
        <Text style={styles.errorTitle}>Item Not Found</Text>
        <Text style={styles.errorSubtitle}>
          This item could not be loaded. Please try again.
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => refetchItem()}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
        {renderImageGallery()}
        {renderItemInfo()}
        {renderActionsBar()}

        {/* Current Valuation */}
        {item.valuations && item.valuations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current Valuation</Text>
            <ValuationCard
              valuation={item.valuations[0]}
              showDetails={true}
              onRequestUpdate={handleUpdateValuation}
              onViewHistory={handleViewHistory}
              onViewComparisons={handleViewComparisons}
            />
          </View>
        )}

        {/* Price History Chart */}
        {priceHistory && priceHistory.length > 1 && (
          <View style={styles.section}>
            <PriceHistoryChart
              data={priceHistory}
              height={250}
              showTrend={true}
            />
          </View>
        )}

        {/* Market Comparisons */}
        {marketComparisons && marketComparisons.length > 0 && (
          <View style={styles.section}>
            <MarketComparisonTable
              comparisons={marketComparisons.slice(0, 3)} // Show only top 3
              showImages={false}
            />
            {marketComparisons.length > 3 && (
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={handleViewComparisons}
              >
                <Text style={styles.viewAllText}>
                  View All {marketComparisons.length} Comparisons
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
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
  imageGallery: {
    position: 'relative',
  },
  mainImage: {
    width: '100%',
    height: 300,
    backgroundColor: theme.colors.surface,
  },
  thumbnailContainer: {
    position: 'absolute',
    bottom: theme.spacing.sm,
    left: 0,
    right: 0,
    paddingHorizontal: theme.spacing.sm,
  },
  thumbnail: {
    width: 60,
    height: 60,
    marginRight: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedThumbnail: {
    borderColor: 'white',
  },
  addPhotoButtonOverlay: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImagesContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
  noImagesText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  addPhotoText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    marginLeft: theme.spacing.xs,
  },
  itemInfoContainer: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    marginTop: theme.spacing.sm,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.xs,
  },
  itemName: {
    flex: 1,
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginRight: theme.spacing.sm,
  },
  decisionBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  decisionText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '500',
  },
  itemCategory: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  itemDescription: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    lineHeight: 22,
    marginBottom: theme.spacing.md,
  },
  itemDetails: {
    gap: theme.spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.sm,
  },
  actionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  actionButton: {
    alignItems: 'center',
    padding: theme.spacing.sm,
  },
  actionText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    marginTop: theme.spacing.xs,
  },
  section: {
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  viewAllButton: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  viewAllText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  errorTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  errorSubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
  },
  retryText: {
    color: 'white',
    fontSize: theme.fontSize.md,
    fontWeight: '500',
  },
});

export default ItemDetailScreen;
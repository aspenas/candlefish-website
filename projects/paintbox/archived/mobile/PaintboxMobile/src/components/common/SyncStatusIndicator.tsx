import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Modal,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import NetInfo from '@react-native-community/netinfo';
import { offlineSyncService } from '../../services/offlineSync';

interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  queueSize: number;
  lastSyncTime?: number;
  stats?: any;
}

const SyncStatusIndicator: React.FC = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: true,
    isSyncing: false,
    queueSize: 0,
  });
  const [showDetails, setShowDetails] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    loadSyncStatus();

    const interval = setInterval(loadSyncStatus, 5000); // Update every 5 seconds

    const unsubscribe = NetInfo.addEventListener((state) => {
      setSyncStatus(prev => ({
        ...prev,
        isOnline: state.isConnected ?? false,
      }));
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (syncStatus.isSyncing) {
      startPulseAnimation();
    } else {
      stopPulseAnimation();
    }
  }, [syncStatus.isSyncing]);

  const loadSyncStatus = async () => {
    const queueSize = await offlineSyncService.getQueueSize();
    const stats = await offlineSyncService.getSyncStats();

    setSyncStatus(prev => ({
      ...prev,
      queueSize,
      stats,
      isSyncing: offlineSyncService.getIsSyncing(),
      isOnline: offlineSyncService.getIsOnline(),
      lastSyncTime: stats?.lastSyncTime,
    }));
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  };

  const getStatusColor = (): string => {
    if (!syncStatus.isOnline) return '#EF4444'; // Red for offline
    if (syncStatus.isSyncing) return '#F59E0B'; // Amber for syncing
    if (syncStatus.queueSize > 0) return '#3B82F6'; // Blue for pending
    return '#10B981'; // Green for all synced
  };

  const getStatusIcon = (): string => {
    if (!syncStatus.isOnline) return 'cloud-offline';
    if (syncStatus.isSyncing) return 'sync';
    if (syncStatus.queueSize > 0) return 'cloud-upload';
    return 'cloud-done';
  };

  const getStatusText = (): string => {
    if (!syncStatus.isOnline) return 'Offline';
    if (syncStatus.isSyncing) return 'Syncing';
    if (syncStatus.queueSize > 0) return `${syncStatus.queueSize} pending`;
    return 'Synced';
  };

  const formatLastSync = (): string => {
    if (!syncStatus.lastSyncTime) return 'Never';

    const now = Date.now();
    const diff = now - syncStatus.lastSyncTime;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(syncStatus.lastSyncTime).toLocaleDateString();
  };

  const forcSync = async () => {
    try {
      await offlineSyncService.processQueue();
      loadSyncStatus();
    } catch (error) {
      console.error('Force sync failed:', error);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.container}
        onPress={() => setShowDetails(true)}
        activeOpacity={0.7}
      >
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Icon
            name={getStatusIcon()}
            size={20}
            color={getStatusColor()}
          />
        </Animated.View>
        {syncStatus.queueSize > 0 && (
          <View style={[styles.badge, { backgroundColor: getStatusColor() }]}>
            <Text style={styles.badgeText}>{syncStatus.queueSize}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={showDetails}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDetails(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sync Status</Text>
              <TouchableOpacity
                onPress={() => setShowDetails(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.statusRow}>
                <Icon
                  name={getStatusIcon()}
                  size={24}
                  color={getStatusColor()}
                />
                <Text style={styles.statusMainText}>{getStatusText()}</Text>
              </View>

              <View style={styles.detailsSection}>
                <DetailRow label="Connection" value={syncStatus.isOnline ? 'Online' : 'Offline'} />
                <DetailRow label="Queue Size" value={syncStatus.queueSize.toString()} />
                <DetailRow label="Last Sync" value={formatLastSync()} />

                {syncStatus.stats && (
                  <>
                    <DetailRow label="Total Synced" value={syncStatus.stats.totalSynced?.toString() || '0'} />
                    <DetailRow label="Failed" value={syncStatus.stats.failedOperations?.toString() || '0'} />
                  </>
                )}
              </View>

              {syncStatus.queueSize > 0 && syncStatus.isOnline && (
                <TouchableOpacity
                  style={styles.syncButton}
                  onPress={forcSync}
                >
                  <Icon name="sync" size={20} color="white" />
                  <Text style={styles.syncButtonText}>Force Sync Now</Text>
                </TouchableOpacity>
              )}

              {!syncStatus.isOnline && (
                <View style={styles.offlineInfo}>
                  <Icon name="information-circle" size={20} color="#3B82F6" />
                  <Text style={styles.offlineText}>
                    You're offline. Changes will sync automatically when connected.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

interface DetailRowProps {
  label: string;
  value: string;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    margin: 20,
    maxWidth: 400,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  statusMainText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 12,
  },
  detailsSection: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  syncButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 16,
  },
  syncButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  offlineInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EBF8FF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  offlineText: {
    flex: 1,
    fontSize: 14,
    color: '#1E40AF',
    marginLeft: 8,
    lineHeight: 20,
  },
});

export default SyncStatusIndicator;

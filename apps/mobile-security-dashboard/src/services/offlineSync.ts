// Offline Data Synchronization Service for Mobile Security Dashboard
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { apolloClient } from './apollo';
import { environmentConfig } from '@/config/environment';
import { crashReportingService } from './crashReporting';

// Types
export interface OfflineAction {
  id: string;
  type: 'create' | 'update' | 'delete' | 'acknowledge' | 'assign';
  targetType: 'alert' | 'vulnerability' | 'incident' | 'user_setting';
  targetId: string;
  payload: any;
  timestamp: string;
  userId: string;
  retryCount: number;
  lastAttempt?: string;
  error?: string;
}

export interface SyncState {
  isOnline: boolean;
  lastSyncTime: string | null;
  pendingActions: OfflineAction[];
  syncInProgress: boolean;
  backgroundSyncEnabled: boolean;
  autoSyncInterval: number;
  maxRetries: number;
}

export interface SyncResult {
  success: boolean;
  actionsProcessed: number;
  actionsFailed: number;
  errors: Array<{ actionId: string; error: string }>;
}

// Background sync task name
const BACKGROUND_SYNC_TASK = 'SECURITY_DASHBOARD_SYNC';

class OfflineSyncService {
  private static instance: OfflineSyncService;
  private syncState: SyncState;
  private networkListener: any;
  private autoSyncTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.syncState = {
      isOnline: true,
      lastSyncTime: null,
      pendingActions: [],
      syncInProgress: false,
      backgroundSyncEnabled: environmentConfig.isFeatureEnabled('offlineMode'),
      autoSyncInterval: environmentConfig.getConfig().sync.interval,
      maxRetries: environmentConfig.getConfig().sync.retryAttempts,
    };
  }

  static getInstance(): OfflineSyncService {
    if (!OfflineSyncService.instance) {
      OfflineSyncService.instance = new OfflineSyncService();
    }
    return OfflineSyncService.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Load existing sync state
      await this.loadSyncState();

      // Set up network monitoring
      await this.setupNetworkMonitoring();

      // Set up background sync if enabled
      if (this.syncState.backgroundSyncEnabled) {
        await this.setupBackgroundSync();
      }

      // Set up automatic sync timer
      this.setupAutoSync();

      // Perform initial sync if online
      if (this.syncState.isOnline) {
        setTimeout(() => this.performSync(), 1000);
      }

      console.log('Offline sync service initialized');
      crashReportingService.addBreadcrumb('Offline sync initialized', 'sync', 'info');

    } catch (error) {
      console.error('Failed to initialize offline sync service:', error);
      crashReportingService.reportError(error as Error, {
        component: 'OfflineSyncService',
        action: 'initialize',
      });
    }
  }

  private async loadSyncState(): Promise<void> {
    try {
      // Load pending actions
      const actionsJson = await AsyncStorage.getItem('offline_actions');
      if (actionsJson) {
        this.syncState.pendingActions = JSON.parse(actionsJson);
      }

      // Load last sync time
      const lastSyncTime = await AsyncStorage.getItem('last_sync_time');
      if (lastSyncTime) {
        this.syncState.lastSyncTime = lastSyncTime;
      }

      // Load background sync preference
      const backgroundSyncPref = await AsyncStorage.getItem('background_sync_enabled');
      if (backgroundSyncPref !== null) {
        this.syncState.backgroundSyncEnabled = backgroundSyncPref === 'true';
      }

    } catch (error) {
      console.error('Error loading sync state:', error);
    }
  }

  private async saveSyncState(): Promise<void> {
    try {
      await AsyncStorage.setItem('offline_actions', JSON.stringify(this.syncState.pendingActions));
      await AsyncStorage.setItem('background_sync_enabled', this.syncState.backgroundSyncEnabled.toString());
      
      if (this.syncState.lastSyncTime) {
        await AsyncStorage.setItem('last_sync_time', this.syncState.lastSyncTime);
      }
    } catch (error) {
      console.error('Error saving sync state:', error);
    }
  }

  private async setupNetworkMonitoring(): Promise<void> {
    // Get initial network state
    const netInfo = await NetInfo.fetch();
    this.syncState.isOnline = netInfo.isConnected === true;

    // Listen for network changes
    this.networkListener = NetInfo.addEventListener(async (state) => {
      const wasOffline = !this.syncState.isOnline;
      this.syncState.isOnline = state.isConnected === true;

      crashReportingService.addBreadcrumb(
        `Network state changed: ${this.syncState.isOnline ? 'online' : 'offline'}`,
        'network',
        'info',
        { type: state.type, isConnected: state.isConnected }
      );

      // If we just came back online, trigger sync
      if (wasOffline && this.syncState.isOnline && this.syncState.pendingActions.length > 0) {
        console.log('Network reconnected, triggering sync');
        setTimeout(() => this.performSync(), 2000);
      }
    });
  }

  private async setupBackgroundSync(): Promise<void> {
    try {
      // Register background task
      TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
        try {
          console.log('Background sync task starting');
          crashReportingService.addBreadcrumb('Background sync started', 'sync', 'info');

          const result = await this.performSync();
          
          if (result.success) {
            console.log(`Background sync completed: ${result.actionsProcessed} actions processed`);
            return BackgroundFetch.BackgroundFetchResult.NewData;
          } else {
            console.log('Background sync completed with errors');
            return BackgroundFetch.BackgroundFetchResult.Failed;
          }
        } catch (error) {
          console.error('Background sync error:', error);
          crashReportingService.reportError(error as Error, {
            component: 'OfflineSyncService',
            action: 'backgroundSync',
          });
          return BackgroundFetch.BackgroundFetch.BackgroundFetchResult.Failed;
        }
      });

      // Register background fetch
      const status = await BackgroundFetch.getStatusAsync();
      if (status === BackgroundFetch.BackgroundFetchStatus.Available) {
        await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
          minimumInterval: Math.max(15 * 60 * 1000, this.syncState.autoSyncInterval), // At least 15 minutes
          stopOnTerminate: false,
          startOnBoot: true,
        });
        
        console.log('Background fetch registered successfully');
      } else {
        console.warn('Background fetch not available:', status);
      }

    } catch (error) {
      console.error('Error setting up background sync:', error);
      crashReportingService.reportError(error as Error, {
        component: 'OfflineSyncService',
        action: 'setupBackgroundSync',
      });
    }
  }

  private setupAutoSync(): void {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
    }

    if (this.syncState.autoSyncInterval > 0) {
      this.autoSyncTimer = setInterval(() => {
        if (this.syncState.isOnline && this.syncState.pendingActions.length > 0 && !this.syncState.syncInProgress) {
          this.performSync();
        }
      }, this.syncState.autoSyncInterval);
    }
  }

  // Add action to offline queue
  async queueAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
    try {
      const offlineAction: OfflineAction = {
        ...action,
        id: `${action.type}_${action.targetType}_${action.targetId}_${Date.now()}`,
        timestamp: new Date().toISOString(),
        retryCount: 0,
      };

      this.syncState.pendingActions.push(offlineAction);
      await this.saveSyncState();

      crashReportingService.addBreadcrumb(
        `Action queued: ${action.type} ${action.targetType}`,
        'offline',
        'info',
        { actionId: offlineAction.id }
      );

      // If online, trigger immediate sync
      if (this.syncState.isOnline && !this.syncState.syncInProgress) {
        setTimeout(() => this.performSync(), 1000);
      }

      return offlineAction.id;

    } catch (error) {
      console.error('Error queuing offline action:', error);
      crashReportingService.reportError(error as Error, {
        component: 'OfflineSyncService',
        action: 'queueAction',
        extra: { actionType: action.type, targetType: action.targetType },
      });
      throw error;
    }
  }

  // Perform synchronization
  async performSync(): Promise<SyncResult> {
    if (this.syncState.syncInProgress || !this.syncState.isOnline || this.syncState.pendingActions.length === 0) {
      return {
        success: true,
        actionsProcessed: 0,
        actionsFailed: 0,
        errors: [],
      };
    }

    this.syncState.syncInProgress = true;
    crashReportingService.addBreadcrumb('Sync started', 'sync', 'info', {
      pendingActions: this.syncState.pendingActions.length,
    });

    const result: SyncResult = {
      success: true,
      actionsProcessed: 0,
      actionsFailed: 0,
      errors: [],
    };

    try {
      const actionsToSync = [...this.syncState.pendingActions];
      
      for (const action of actionsToSync) {
        try {
          await this.syncAction(action);
          
          // Remove successful action from queue
          this.syncState.pendingActions = this.syncState.pendingActions.filter(a => a.id !== action.id);
          result.actionsProcessed++;

        } catch (error) {
          console.error(`Failed to sync action ${action.id}:`, error);
          
          // Update retry count
          const actionIndex = this.syncState.pendingActions.findIndex(a => a.id === action.id);
          if (actionIndex >= 0) {
            this.syncState.pendingActions[actionIndex].retryCount++;
            this.syncState.pendingActions[actionIndex].lastAttempt = new Date().toISOString();
            this.syncState.pendingActions[actionIndex].error = (error as Error).message;

            // Remove if max retries reached
            if (this.syncState.pendingActions[actionIndex].retryCount >= this.syncState.maxRetries) {
              this.syncState.pendingActions.splice(actionIndex, 1);
              
              crashReportingService.reportError(new Error(`Action sync failed after ${this.syncState.maxRetries} retries`), {
                component: 'OfflineSyncService',
                action: 'syncAction',
                extra: { 
                  actionId: action.id,
                  actionType: action.type,
                  targetType: action.targetType,
                },
              });
            }
          }

          result.actionsFailed++;
          result.errors.push({
            actionId: action.id,
            error: (error as Error).message,
          });
        }
      }

      this.syncState.lastSyncTime = new Date().toISOString();
      await this.saveSyncState();

      if (result.actionsFailed > 0) {
        result.success = false;
      }

      console.log(`Sync completed: ${result.actionsProcessed} processed, ${result.actionsFailed} failed`);
      crashReportingService.addBreadcrumb('Sync completed', 'sync', 'info', {
        actionsProcessed: result.actionsProcessed,
        actionsFailed: result.actionsFailed,
      });

    } catch (error) {
      console.error('Error during sync:', error);
      result.success = false;
      crashReportingService.reportError(error as Error, {
        component: 'OfflineSyncService',
        action: 'performSync',
      });
    } finally {
      this.syncState.syncInProgress = false;
    }

    return result;
  }

  // Sync individual action using GraphQL mutations
  private async syncAction(action: OfflineAction): Promise<void> {
    switch (action.type) {
      case 'acknowledge':
        await this.syncAcknowledgeAction(action);
        break;
      case 'assign':
        await this.syncAssignAction(action);
        break;
      case 'create':
        await this.syncCreateAction(action);
        break;
      case 'update':
        await this.syncUpdateAction(action);
        break;
      case 'delete':
        await this.syncDeleteAction(action);
        break;
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  private async syncAcknowledgeAction(action: OfflineAction): Promise<void> {
    // Import GraphQL mutations dynamically to avoid circular dependencies
    const { ACKNOWLEDGE_ALERT_MUTATION } = await import('@/graphql/mutations/security');
    
    await apolloClient.mutate({
      mutation: ACKNOWLEDGE_ALERT_MUTATION,
      variables: {
        alertId: action.targetId,
        note: action.payload.note || 'Acknowledged via mobile app',
        userId: action.userId,
      },
    });
  }

  private async syncAssignAction(action: OfflineAction): Promise<void> {
    const { ASSIGN_VULNERABILITY_MUTATION } = await import('@/graphql/mutations/security');
    
    await apolloClient.mutate({
      mutation: ASSIGN_VULNERABILITY_MUTATION,
      variables: {
        vulnerabilityId: action.targetId,
        assigneeId: action.payload.assignTo,
        assignedBy: action.userId,
      },
    });
  }

  private async syncCreateAction(action: OfflineAction): Promise<void> {
    // Handle different target types
    switch (action.targetType) {
      case 'incident':
        const { CREATE_INCIDENT_MUTATION } = await import('@/graphql/mutations/security');
        await apolloClient.mutate({
          mutation: CREATE_INCIDENT_MUTATION,
          variables: {
            input: {
              ...action.payload,
              createdBy: action.userId,
            },
          },
        });
        break;
      default:
        throw new Error(`Unsupported create target type: ${action.targetType}`);
    }
  }

  private async syncUpdateAction(action: OfflineAction): Promise<void> {
    switch (action.targetType) {
      case 'user_setting':
        const { UPDATE_USER_SETTINGS_MUTATION } = await import('@/graphql/mutations/user');
        await apolloClient.mutate({
          mutation: UPDATE_USER_SETTINGS_MUTATION,
          variables: {
            userId: action.userId,
            settings: action.payload,
          },
        });
        break;
      default:
        throw new Error(`Unsupported update target type: ${action.targetType}`);
    }
  }

  private async syncDeleteAction(action: OfflineAction): Promise<void> {
    // Implement delete actions as needed
    throw new Error('Delete actions not yet implemented');
  }

  // Get current sync state
  getSyncState(): SyncState {
    return { ...this.syncState };
  }

  // Get pending actions count
  getPendingActionsCount(): number {
    return this.syncState.pendingActions.length;
  }

  // Check if device is online
  isOnline(): boolean {
    return this.syncState.isOnline;
  }

  // Force sync now
  async forceSyncNow(): Promise<SyncResult> {
    return this.performSync();
  }

  // Clear all pending actions (use with caution)
  async clearPendingActions(): Promise<void> {
    this.syncState.pendingActions = [];
    await this.saveSyncState();
    
    crashReportingService.addBreadcrumb('Pending actions cleared', 'sync', 'warning');
  }

  // Enable/disable background sync
  async setBackgroundSyncEnabled(enabled: boolean): Promise<void> {
    this.syncState.backgroundSyncEnabled = enabled;
    await this.saveSyncState();

    if (enabled) {
      await this.setupBackgroundSync();
    } else {
      try {
        await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
      } catch (error) {
        console.warn('Error unregistering background task:', error);
      }
    }
  }

  // Update sync interval
  setSyncInterval(intervalMs: number): void {
    this.syncState.autoSyncInterval = Math.max(60000, intervalMs); // At least 1 minute
    this.setupAutoSync();
  }

  // Get sync statistics
  async getSyncStatistics(): Promise<{
    totalPendingActions: number;
    oldestPendingAction?: string;
    lastSyncTime?: string;
    actionsByType: Record<string, number>;
    actionsByTargetType: Record<string, number>;
  }> {
    const stats = {
      totalPendingActions: this.syncState.pendingActions.length,
      lastSyncTime: this.syncState.lastSyncTime || undefined,
      oldestPendingAction: undefined as string | undefined,
      actionsByType: {} as Record<string, number>,
      actionsByTargetType: {} as Record<string, number>,
    };

    if (this.syncState.pendingActions.length > 0) {
      // Find oldest pending action
      let oldestAction = this.syncState.pendingActions[0];
      for (const action of this.syncState.pendingActions) {
        if (new Date(action.timestamp) < new Date(oldestAction.timestamp)) {
          oldestAction = action;
        }

        // Count by type
        stats.actionsByType[action.type] = (stats.actionsByType[action.type] || 0) + 1;
        stats.actionsByTargetType[action.targetType] = (stats.actionsByTargetType[action.targetType] || 0) + 1;
      }
      
      stats.oldestPendingAction = oldestAction.timestamp;
    }

    return stats;
  }

  // Cleanup old failed actions
  async cleanupFailedActions(olderThanHours = 24): Promise<number> {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - olderThanHours);

    const initialCount = this.syncState.pendingActions.length;
    this.syncState.pendingActions = this.syncState.pendingActions.filter(action => {
      const actionTime = new Date(action.timestamp);
      const isFailed = action.retryCount >= this.syncState.maxRetries;
      const isOld = actionTime < cutoffTime;
      
      return !(isFailed && isOld);
    });

    const removedCount = initialCount - this.syncState.pendingActions.length;
    if (removedCount > 0) {
      await this.saveSyncState();
      crashReportingService.addBreadcrumb(`Cleaned up ${removedCount} old failed actions`, 'sync', 'info');
    }

    return removedCount;
  }

  // Destroy service and cleanup
  async destroy(): Promise<void> {
    if (this.networkListener) {
      this.networkListener();
    }

    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
    }

    try {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
    } catch (error) {
      // Ignore cleanup errors
    }

    await this.saveSyncState();
  }
}

// Export singleton instance
export const offlineSyncService = OfflineSyncService.getInstance();

// React hook for offline sync
export const useOfflineSync = () => {
  const [syncState, setSyncState] = React.useState<SyncState>(offlineSyncService.getSyncState());
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const initializeSync = async () => {
      try {
        await offlineSyncService.initialize();
        setSyncState(offlineSyncService.getSyncState());
      } catch (error) {
        console.error('Error initializing offline sync:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeSync();

    // Set up periodic state updates
    const interval = setInterval(() => {
      setSyncState(offlineSyncService.getSyncState());
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const queueAction = async (action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>): Promise<string> => {
    const actionId = await offlineSyncService.queueAction(action);
    setSyncState(offlineSyncService.getSyncState());
    return actionId;
  };

  const forceSyncNow = async (): Promise<SyncResult> => {
    const result = await offlineSyncService.forceSyncNow();
    setSyncState(offlineSyncService.getSyncState());
    return result;
  };

  return {
    syncState,
    isLoading,
    queueAction,
    forceSyncNow,
    clearPendingActions: offlineSyncService.clearPendingActions.bind(offlineSyncService),
    setBackgroundSyncEnabled: offlineSyncService.setBackgroundSyncEnabled.bind(offlineSyncService),
    setSyncInterval: offlineSyncService.setSyncInterval.bind(offlineSyncService),
    getSyncStatistics: offlineSyncService.getSyncStatistics.bind(offlineSyncService),
    cleanupFailedActions: offlineSyncService.cleanupFailedActions.bind(offlineSyncService),
  };
};

export default offlineSyncService;
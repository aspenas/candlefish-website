import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { apolloService } from './apollo-client';
import { NotificationService } from './notifications';

// Types
interface QueuedOperation {
  id: string;
  type: 'mutation' | 'query' | 'subscription';
  operation: string;
  variables: any;
  timestamp: number;
  priority: 'low' | 'normal' | 'high' | 'critical';
  retries: number;
  maxRetries: number;
  metadata?: {
    incidentId?: string;
    alertId?: string;
    threatId?: string;
    operationType?: string;
    requiresNotification?: boolean;
  };
}

interface OfflineIncident {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'draft' | 'queued' | 'synced' | 'failed';
  timestamp: number;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  attachments?: string[]; // File paths
  tags: string[];
  assignedTo?: string;
  createdBy: string;
  localId: string; // UUID for offline tracking
}

interface SyncStatus {
  isOnline: boolean;
  queueSize: number;
  lastSyncTime: number;
  failedOperations: number;
  isSyncing: boolean;
  syncErrors: string[];
}

const BACKGROUND_SYNC_TASK = 'background-sync-task';
const QUEUE_STORAGE_KEY = 'offline_operation_queue';
const INCIDENTS_STORAGE_KEY = 'offline_incidents';
const SYNC_STATUS_KEY = 'sync_status';
const MAX_QUEUE_SIZE = 1000;
const RETRY_DELAYS = [1000, 5000, 15000, 30000, 60000]; // Progressive delays

// Background sync task
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  console.log('🔄 Background sync task executed');
  
  try {
    await OfflineQueueService.getInstance().processSyncQueue();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Background sync failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

class OfflineQueueServiceClass {
  private static instance: OfflineQueueServiceClass;
  private operationQueue: QueuedOperation[] = [];
  private offlineIncidents: OfflineIncident[] = [];
  private syncStatus: SyncStatus = {
    isOnline: false,
    queueSize: 0,
    lastSyncTime: 0,
    failedOperations: 0,
    isSyncing: false,
    syncErrors: []
  };
  
  private listeners: Array<(status: SyncStatus) => void> = [];
  private syncInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  public static getInstance(): OfflineQueueServiceClass {
    if (!OfflineQueueServiceClass.instance) {
      OfflineQueueServiceClass.instance = new OfflineQueueServiceClass();
    }
    return OfflineQueueServiceClass.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      // Load stored data
      await this.loadStoredData();
      
      // Set up network monitoring
      this.setupNetworkMonitoring();
      
      // Register background task
      await this.registerBackgroundSync();
      
      // Start sync scheduler
      this.startSyncScheduler();
      
      this.isInitialized = true;
      console.log('📦 Offline queue service initialized');
      
      // Initial sync if online
      if (this.syncStatus.isOnline) {
        await this.processSyncQueue();
      }
      
    } catch (error) {
      console.error('Failed to initialize offline queue service:', error);
      throw error;
    }
  }

  // Queue Operations
  async queueOperation(
    type: 'mutation' | 'query' | 'subscription',
    operation: string,
    variables: any,
    priority: 'low' | 'normal' | 'high' | 'critical' = 'normal',
    metadata?: QueuedOperation['metadata']
  ): Promise<string> {
    try {
      const operationId = this.generateId();
      
      const queuedOp: QueuedOperation = {
        id: operationId,
        type,
        operation,
        variables,
        timestamp: Date.now(),
        priority,
        retries: 0,
        maxRetries: priority === 'critical' ? 10 : 5,
        metadata
      };

      // Check queue size limit
      if (this.operationQueue.length >= MAX_QUEUE_SIZE) {
        // Remove oldest low priority operations
        this.operationQueue = this.operationQueue
          .filter(op => op.priority !== 'low')
          .slice(-MAX_QUEUE_SIZE + 1);
      }

      this.operationQueue.push(queuedOp);
      
      // Sort by priority and timestamp
      this.sortQueue();
      
      // Save to storage
      await this.saveQueue();
      
      // Update sync status
      this.updateSyncStatus({ queueSize: this.operationQueue.length });
      
      // Try immediate sync if online and high/critical priority
      if (this.syncStatus.isOnline && (priority === 'high' || priority === 'critical')) {
        setImmediate(() => this.processSyncQueue());
      }
      
      console.log(`📥 Queued ${type} operation (${priority}): ${operationId}`);
      return operationId;
      
    } catch (error) {
      console.error('Failed to queue operation:', error);
      throw error;
    }
  }

  // Incident Management
  async createOfflineIncident(incident: Omit<OfflineIncident, 'id' | 'timestamp' | 'localId'>): Promise<string> {
    try {
      const localId = this.generateId();
      const offlineIncident: OfflineIncident = {
        ...incident,
        id: `offline_${localId}`,
        localId,
        timestamp: Date.now(),
        status: 'draft'
      };

      this.offlineIncidents.push(offlineIncident);
      await this.saveIncidents();
      
      // Queue for sync
      await this.queueOperation(
        'mutation',
        'CREATE_INCIDENT',
        { incident: offlineIncident },
        incident.severity === 'critical' ? 'critical' : 'normal',
        {
          incidentId: offlineIncident.id,
          operationType: 'create_incident',
          requiresNotification: true
        }
      );
      
      console.log('📋 Created offline incident:', offlineIncident.id);
      return offlineIncident.id;
      
    } catch (error) {
      console.error('Failed to create offline incident:', error);
      throw error;
    }
  }

  async updateOfflineIncident(id: string, updates: Partial<OfflineIncident>): Promise<void> {
    try {
      const index = this.offlineIncidents.findIndex(incident => incident.id === id);
      if (index === -1) {
        throw new Error('Incident not found');
      }

      this.offlineIncidents[index] = {
        ...this.offlineIncidents[index],
        ...updates,
        status: 'queued' // Mark for sync
      };

      await this.saveIncidents();
      
      // Queue update operation
      await this.queueOperation(
        'mutation',
        'UPDATE_INCIDENT',
        { id, updates },
        'normal',
        {
          incidentId: id,
          operationType: 'update_incident'
        }
      );
      
    } catch (error) {
      console.error('Failed to update offline incident:', error);
      throw error;
    }
  }

  getOfflineIncidents(status?: OfflineIncident['status']): OfflineIncident[] {
    if (status) {
      return this.offlineIncidents.filter(incident => incident.status === status);
    }
    return [...this.offlineIncidents];
  }

  // Sync Processing
  async processSyncQueue(): Promise<void> {
    if (this.syncStatus.isSyncing || !this.syncStatus.isOnline || this.operationQueue.length === 0) {
      return;
    }

    this.updateSyncStatus({ isSyncing: true, syncErrors: [] });
    const startTime = Date.now();
    
    try {
      const client = apolloService.getClient();
      if (!client) {
        throw new Error('Apollo client not available');
      }

      const failedOperations: QueuedOperation[] = [];
      const processedOperations: string[] = [];
      
      // Process operations in priority order
      for (const operation of this.operationQueue) {
        try {
          await this.processOperation(operation, client);
          processedOperations.push(operation.id);
          
          // Notify about successful sync if required
          if (operation.metadata?.requiresNotification) {
            await this.notifyOperationSuccess(operation);
          }
          
        } catch (error) {
          console.error(`Failed to process operation ${operation.id}:`, error);
          
          // Increment retries
          operation.retries++;
          
          if (operation.retries < operation.maxRetries) {
            // Schedule retry with exponential backoff
            const delay = RETRY_DELAYS[Math.min(operation.retries - 1, RETRY_DELAYS.length - 1)];
            setTimeout(() => {
              // Re-add to front of queue for retry
              this.operationQueue.unshift(operation);
            }, delay);
          } else {
            // Max retries reached
            failedOperations.push(operation);
            
            if (operation.metadata?.requiresNotification) {
              await this.notifyOperationFailure(operation, (error as Error).message);
            }
          }
        }
      }

      // Remove processed operations
      this.operationQueue = this.operationQueue.filter(
        op => !processedOperations.includes(op.id)
      );
      
      // Update failed incidents status
      await this.markFailedIncidents(failedOperations);
      
      // Save updated queue
      await this.saveQueue();
      
      this.updateSyncStatus({
        isSyncing: false,
        queueSize: this.operationQueue.length,
        lastSyncTime: Date.now(),
        failedOperations: failedOperations.length
      });
      
      console.log(`✅ Sync completed: ${processedOperations.length} success, ${failedOperations.length} failed`);
      
    } catch (error) {
      this.updateSyncStatus({
        isSyncing: false,
        syncErrors: [(error as Error).message]
      });
      console.error('Sync queue processing failed:', error);
    }
  }

  private async processOperation(operation: QueuedOperation, client: any): Promise<any> {
    const { type, operation: operationString, variables } = operation;
    
    switch (type) {
      case 'mutation':
        return await client.mutate({
          mutation: operationString,
          variables,
          errorPolicy: 'all'
        });
        
      case 'query':
        return await client.query({
          query: operationString,
          variables,
          errorPolicy: 'all',
          fetchPolicy: 'network-only'
        });
        
      case 'subscription':
        // Subscriptions are handled differently
        console.warn('Subscription operations cannot be queued for offline sync');
        return null;
        
      default:
        throw new Error(`Unsupported operation type: ${type}`);
    }
  }

  private async markFailedIncidents(failedOperations: QueuedOperation[]): Promise<void> {
    const failedIncidentIds = failedOperations
      .map(op => op.metadata?.incidentId)
      .filter(Boolean) as string[];
      
    for (const incidentId of failedIncidentIds) {
      const index = this.offlineIncidents.findIndex(incident => incident.id === incidentId);
      if (index > -1) {
        this.offlineIncidents[index].status = 'failed';
      }
    }
    
    if (failedIncidentIds.length > 0) {
      await this.saveIncidents();
    }
  }

  // Network Monitoring
  private setupNetworkMonitoring(): void {
    NetInfo.addEventListener(state => {
      const wasOnline = this.syncStatus.isOnline;
      const isOnline = state.isConnected ?? false;
      
      if (!wasOnline && isOnline) {
        console.log('🌐 Network connection restored');
        // Auto-sync when connection is restored
        setTimeout(() => this.processSyncQueue(), 1000);
      }
      
      this.updateSyncStatus({ isOnline });
    });
  }

  // Background Sync
  private async registerBackgroundSync(): Promise<void> {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
      if (!isRegistered) {
        await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
          minimumInterval: 15 * 60 * 1000, // 15 minutes
          stopOnTerminate: false,
          startOnBoot: true,
        });
        console.log('📱 Background sync task registered');
      }
    } catch (error) {
      console.error('Failed to register background sync task:', error);
    }
  }

  // Sync Scheduler
  private startSyncScheduler(): void {
    this.stopSyncScheduler();
    
    // Sync every 2 minutes when online
    this.syncInterval = setInterval(async () => {
      if (this.syncStatus.isOnline && this.operationQueue.length > 0) {
        await this.processSyncQueue();
      }
    }, 2 * 60 * 1000);
  }

  private stopSyncScheduler(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Storage Methods
  private async loadStoredData(): Promise<void> {
    try {
      const [queueData, incidentsData, statusData] = await Promise.all([
        AsyncStorage.getItem(QUEUE_STORAGE_KEY),
        AsyncStorage.getItem(INCIDENTS_STORAGE_KEY),
        AsyncStorage.getItem(SYNC_STATUS_KEY)
      ]);

      if (queueData) {
        this.operationQueue = JSON.parse(queueData);
        this.sortQueue();
      }

      if (incidentsData) {
        this.offlineIncidents = JSON.parse(incidentsData);
      }

      if (statusData) {
        const storedStatus = JSON.parse(statusData);
        this.syncStatus = {
          ...this.syncStatus,
          ...storedStatus,
          isSyncing: false // Always reset syncing state on app start
        };
      }

      // Check current network status
      const netInfo = await NetInfo.fetch();
      this.syncStatus.isOnline = netInfo.isConnected ?? false;
      
    } catch (error) {
      console.error('Failed to load stored offline data:', error);
    }
  }

  private async saveQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.operationQueue));
    } catch (error) {
      console.error('Failed to save operation queue:', error);
    }
  }

  private async saveIncidents(): Promise<void> {
    try {
      await AsyncStorage.setItem(INCIDENTS_STORAGE_KEY, JSON.stringify(this.offlineIncidents));
    } catch (error) {
      console.error('Failed to save offline incidents:', error);
    }
  }

  private async saveStatus(): Promise<void> {
    try {
      await AsyncStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(this.syncStatus));
    } catch (error) {
      console.error('Failed to save sync status:', error);
    }
  }

  // Utility Methods
  private sortQueue(): void {
    const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
    this.operationQueue.sort((a, b) => {
      // First by priority
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by timestamp (older first)
      return a.timestamp - b.timestamp;
    });
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateSyncStatus(updates: Partial<SyncStatus>): void {
    this.syncStatus = { ...this.syncStatus, ...updates };
    this.saveStatus();
    
    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(this.getSyncStatus());
      } catch (error) {
        console.error('Sync status listener error:', error);
      }
    });
  }

  // Notification Methods
  private async notifyOperationSuccess(operation: QueuedOperation): Promise<void> {
    let message = 'Operation completed successfully';
    
    if (operation.metadata?.operationType === 'create_incident') {
      message = 'Incident report synced to server';
    } else if (operation.metadata?.operationType === 'update_incident') {
      message = 'Incident update synced to server';
    }
    
    await NotificationService.showNotification({
      title: 'Sync Complete',
      message,
      type: 'info',
      priority: 'low'
    });
  }

  private async notifyOperationFailure(operation: QueuedOperation, error: string): Promise<void> {
    let message = `Operation failed after ${operation.maxRetries} attempts`;
    
    if (operation.metadata?.operationType === 'create_incident') {
      message = 'Failed to sync incident report. Please check connection.';
    } else if (operation.metadata?.operationType === 'update_incident') {
      message = 'Failed to sync incident update. Please check connection.';
    }
    
    await NotificationService.showNotification({
      title: 'Sync Failed',
      message,
      type: 'error',
      priority: 'normal',
      data: {
        operationId: operation.id,
        error
      }
    });
  }

  // Public API Methods
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  getQueueSize(): number {
    return this.operationQueue.length;
  }

  async clearQueue(): Promise<void> {
    this.operationQueue = [];
    await this.saveQueue();
    this.updateSyncStatus({ queueSize: 0 });
  }

  async clearFailedOperations(): Promise<void> {
    this.operationQueue = this.operationQueue.filter(op => op.retries < op.maxRetries);
    await this.saveQueue();
    this.updateSyncStatus({ 
      queueSize: this.operationQueue.length,
      failedOperations: 0 
    });
  }

  async forceSyncNow(): Promise<void> {
    if (this.syncStatus.isOnline) {
      await this.processSyncQueue();
    } else {
      throw new Error('Cannot sync while offline');
    }
  }

  // Event Listeners
  addSyncStatusListener(listener: (status: SyncStatus) => void): void {
    this.listeners.push(listener);
  }

  removeSyncStatusListener(listener: (status: SyncStatus) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  // Cleanup
  async cleanup(): Promise<void> {
    this.stopSyncScheduler();
    await TaskManager.unregisterTaskAsync(BACKGROUND_SYNC_TASK).catch(() => {});
    this.listeners = [];
  }
}

export const OfflineQueueService = OfflineQueueServiceClass.getInstance();
export default OfflineQueueService;
export type { QueuedOperation, OfflineIncident, SyncStatus };
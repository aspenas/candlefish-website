/**
 * Background Tasks Service
 * Handles periodic system monitoring and data sync
 */

import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApolloClient } from './apolloClient';
import { GET_BACKGROUND_STATUS } from './queries';
import { 
  sendAlertNotification, 
  sendServiceDownNotification, 
  sendSystemHealthNotification 
} from './notifications';

const BACKGROUND_SYNC_TASK = 'background-sync';
const SYNC_INTERVAL = 15 * 60 * 1000; // 15 minutes in milliseconds

interface BackgroundSyncResult {
  success: boolean;
  timestamp: string;
  newAlerts: number;
  serviceStatusChanges: number;
  error?: string;
}

// Define the background task
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    console.log('Background sync started');
    
    const result = await performBackgroundSync();
    
    // Store sync result
    await AsyncStorage.setItem('lastBackgroundSync', JSON.stringify(result));
    
    if (result.success) {
      console.log('Background sync completed successfully');
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } else {
      console.log('Background sync completed with errors');
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  } catch (error) {
    console.error('Background sync error:', error);
    
    // Store error result
    const errorResult: BackgroundSyncResult = {
      success: false,
      timestamp: new Date().toISOString(),
      newAlerts: 0,
      serviceStatusChanges: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    await AsyncStorage.setItem('lastBackgroundSync', JSON.stringify(errorResult));
    
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export const initializeBackgroundTasks = async (): Promise<void> => {
  try {
    // Check if background fetch is available
    const status = await BackgroundFetch.getStatusAsync();
    
    if (status === BackgroundFetch.BackgroundFetchStatus.Restricted || 
        status === BackgroundFetch.BackgroundFetchStatus.Denied) {
      console.log('Background fetch is disabled');
      return;
    }

    // Register background fetch task
    await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: SYNC_INTERVAL, // 15 minutes
      stopOnTerminate: false, // Continue running when app is terminated
      startOnBoot: true, // Start when device boots
    });

    console.log('Background task registered successfully');
  } catch (error) {
    console.error('Error registering background task:', error);
  }
};

export const unregisterBackgroundTasks = async (): Promise<void> => {
  try {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
    console.log('Background task unregistered');
  } catch (error) {
    console.error('Error unregistering background task:', error);
  }
};

const performBackgroundSync = async (): Promise<BackgroundSyncResult> => {
  const result: BackgroundSyncResult = {
    success: true,
    timestamp: new Date().toISOString(),
    newAlerts: 0,
    serviceStatusChanges: 0,
  };

  try {
    // Get Apollo client
    const client = getApolloClient();
    
    // Fetch current status
    const { data } = await client.query({
      query: GET_BACKGROUND_STATUS,
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
    });

    if (!data) {
      throw new Error('No data received from server');
    }

    // Get stored state for comparison
    const storedState = await getStoredSystemState();
    
    // Check for new alerts
    const newAlerts = await processNewAlerts(data.alerts, storedState?.alerts || []);
    result.newAlerts = newAlerts;

    // Check for service status changes
    const statusChanges = await processServiceStatusChanges(
      data.services, 
      storedState?.services || []
    );
    result.serviceStatusChanges = statusChanges;

    // Check system health changes
    await processSystemHealthChanges(data.systemAnalysis, storedState?.systemAnalysis);

    // Store new state
    await storeSystemState({
      services: data.services,
      alerts: data.alerts,
      systemAnalysis: data.systemAnalysis,
      timestamp: result.timestamp,
    });

    return result;
  } catch (error) {
    result.success = false;
    result.error = error instanceof Error ? error.message : 'Unknown error';
    return result;
  }
};

const processNewAlerts = async (currentAlerts: any[], previousAlerts: any[]): Promise<number> => {
  const previousAlertIds = new Set(previousAlerts.map(a => a.id));
  const newAlerts = currentAlerts.filter(alert => !previousAlertIds.has(alert.id));
  
  // Send notifications for critical and high severity new alerts
  for (const alert of newAlerts) {
    if (alert.severity === 'CRITICAL' || alert.severity === 'HIGH') {
      await sendAlertNotification(
        alert.name,
        alert.service.name,
        alert.severity,
        alert.id,
        alert.service.id
      );
    }
  }

  return newAlerts.length;
};

const processServiceStatusChanges = async (
  currentServices: any[], 
  previousServices: any[]
): Promise<number> => {
  const previousServiceMap = new Map(previousServices.map(s => [s.id, s.status]));
  let changesCount = 0;

  for (const service of currentServices) {
    const previousStatus = previousServiceMap.get(service.id);
    
    if (previousStatus && previousStatus !== service.status) {
      changesCount++;
      
      // Send notification for services going down
      if (service.status === 'UNHEALTHY' && previousStatus === 'HEALTHY') {
        await sendServiceDownNotification(service.name, service.id);
      }
    }
  }

  return changesCount;
};

const processSystemHealthChanges = async (
  currentAnalysis: any, 
  previousAnalysis?: any
): Promise<void> => {
  if (!previousAnalysis) return;

  const currentScore = currentAnalysis.healthScore;
  const previousScore = previousAnalysis.healthScore;
  
  // Significant health score drop (>20 points)
  if (currentScore < previousScore - 20) {
    await sendSystemHealthNotification(
      currentScore,
      'Significant performance degradation detected'
    );
  }
  
  // Critical health threshold
  if (currentScore < 30 && previousScore >= 30) {
    await sendSystemHealthNotification(
      currentScore,
      'System health critically low'
    );
  }
};

const getStoredSystemState = async (): Promise<any | null> => {
  try {
    const stored = await AsyncStorage.getItem('systemState');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const storeSystemState = async (state: any): Promise<void> => {
  try {
    await AsyncStorage.setItem('systemState', JSON.stringify(state));
  } catch (error) {
    console.error('Error storing system state:', error);
  }
};

// Utility functions for monitoring background sync
export const getLastSyncResult = async (): Promise<BackgroundSyncResult | null> => {
  try {
    const stored = await AsyncStorage.getItem('lastBackgroundSync');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export const triggerManualSync = async (): Promise<BackgroundSyncResult> => {
  return await performBackgroundSync();
};

export const isBackgroundSyncEnabled = async (): Promise<boolean> => {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    const status = await BackgroundFetch.getStatusAsync();
    
    return isRegistered && status === BackgroundFetch.BackgroundFetchStatus.Available;
  } catch {
    return false;
  }
};
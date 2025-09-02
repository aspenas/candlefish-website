import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import NetInfo from '@react-native-netinfo/netinfo';
import { AppState, AppStateStatus } from 'react-native';
import { OfflineQueueService } from '../services/offline-queue';

interface OfflineContextType {
  isOnline: boolean;
  isConnected: boolean;
  connectionType: string | null;
  syncStatus: {
    pendingCount: number;
    processingCount: number;
    isProcessing: boolean;
    cacheSize: number;
    lastSync?: Date;
  };
  forcSync: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

interface OfflineProviderProps {
  children: ReactNode;
}

export const OfflineProvider: React.FC<OfflineProviderProps> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [connectionType, setConnectionType] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState({
    pendingCount: 0,
    processingCount: 0,
    isProcessing: false,
    cacheSize: 0,
    lastSync: undefined as Date | undefined,
  });
  const [appState, setAppState] = useState(AppState.currentState);

  useEffect(() => {
    initializeOfflineProvider();
    setupNetworkListener();
    setupAppStateListener();
    
    return () => {
      // Cleanup listeners are handled by NetInfo and AppState
    };
  }, []);

  const initializeOfflineProvider = async () => {
    // Initialize the offline queue service
    await OfflineQueueService.initialize();
    
    // Set up sync status listener
    OfflineQueueService.addSyncListener(updateSyncStatus);
    
    // Initial sync status
    updateSyncStatus(OfflineQueueService.getQueueStatus());
  };

  const setupNetworkListener = () => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const wasOnline = isOnline;
      const nowOnline = state.isConnected && state.isInternetReachable;
      
      setIsOnline(nowOnline || false);
      setIsConnected(state.isConnected || false);
      setConnectionType(state.type);
      
      // Trigger sync when coming back online
      if (!wasOnline && nowOnline) {
        handleBackOnline();
      }
      
      console.log(`Network status: ${nowOnline ? 'online' : 'offline'} (${state.type})`);
    });

    return unsubscribe;
  };

  const setupAppStateListener = () => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const wasBackground = appState === 'background';
      const nowActive = nextAppState === 'active';
      
      setAppState(nextAppState);
      
      // Trigger sync when app becomes active from background
      if (wasBackground && nowActive && isOnline) {
        handleAppBecameActive();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return subscription;
  };

  const handleBackOnline = async () => {
    console.log('App is back online, triggering sync...');
    await forcSync();
  };

  const handleAppBecameActive = async () => {
    console.log('App became active, checking for pending sync...');
    if (syncStatus.pendingCount > 0) {
      await forcSync();
    }
  };

  const forcSync = async () => {
    if (!isOnline) {
      console.log('Cannot sync while offline');
      return;
    }

    try {
      await OfflineQueueService.processQueue();
      setSyncStatus(prev => ({
        ...prev,
        lastSync: new Date(),
      }));
      console.log('Sync completed successfully');
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  const updateSyncStatus = (status: any) => {
    setSyncStatus(prev => ({
      ...prev,
      ...status,
    }));
  };

  const value: OfflineContextType = {
    isOnline,
    isConnected,
    connectionType,
    syncStatus,
    forcSync,
  };

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
};

export const useOffline = (): OfflineContextType => {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};
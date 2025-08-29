import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

// Services
import { secureStorage } from '@/utils/secure-storage';
import { apolloClient } from '@/services/api';
import { crashReporting } from '@/services/crashReporting';

// Types
interface QueueItem {
  id: string;
  type: 'mutation' | 'upload' | 'action';
  operation: string;
  variables: any;
  timestamp: number;
  retryCount: number;
  priority: 'low' | 'medium' | 'high';
}

interface OfflineQueueContextType {
  queueSize: number;
  pendingItems: QueueItem[];
  isProcessing: boolean;
  addToQueue: (item: Omit<QueueItem, 'id' | 'timestamp' | 'retryCount'>) => Promise<void>;
  removeFromQueue: (itemId: string) => Promise<void>;
  processQueue: () => Promise<void>;
  clearQueue: () => Promise<void>;
  getQueueStats: () => { total: number; high: number; medium: number; low: number };
}

const OfflineQueueContext = createContext<OfflineQueueContextType | undefined>(undefined);

export const useOfflineQueue = (): OfflineQueueContextType => {
  const context = useContext(OfflineQueueContext);
  if (!context) {
    throw new Error('useOfflineQueue must be used within an OfflineQueueProvider');
  }
  return context;
};

interface OfflineQueueProviderProps {
  children: React.ReactNode;
}

export const OfflineQueueProvider: React.FC<OfflineQueueProviderProps> = ({ children }) => {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Load queue from storage on mount
  useEffect(() => {
    loadQueue();
    setupNetworkListener();
  }, []);

  // Save queue to storage whenever it changes
  useEffect(() => {
    saveQueue();
  }, [queue]);

  const loadQueue = async (): Promise<void> => {
    try {
      const savedQueue = await secureStorage.getOfflineQueue();
      if (savedQueue && Array.isArray(savedQueue)) {
        setQueue(savedQueue);
      }
    } catch (error) {
      console.error('Error loading offline queue:', error);
      crashReporting.recordError(error);
    }
  };

  const saveQueue = async (): Promise<void> => {
    try {
      await secureStorage.setOfflineQueue(queue);
    } catch (error) {
      console.error('Error saving offline queue:', error);
      crashReporting.recordError(error);
    }
  };

  const setupNetworkListener = (): void => {
    NetInfo.addEventListener((state) => {
      const wasOffline = !isOnline;
      const nowOnline = state.isConnected || false;
      
      setIsOnline(nowOnline);
      
      // If we just came back online and have items in queue, process them
      if (wasOffline && nowOnline && queue.length > 0) {
        console.log('Network restored, processing offline queue');
        processQueue();
      }
    });
  };

  const addToQueue = useCallback(async (item: Omit<QueueItem, 'id' | 'timestamp' | 'retryCount'>): Promise<void> => {
    try {
      const queueItem: QueueItem = {
        ...item,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        retryCount: 0,
      };

      setQueue(prevQueue => {
        // Sort by priority (high -> medium -> low) and timestamp
        const newQueue = [...prevQueue, queueItem].sort((a, b) => {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          const aPriority = priorityOrder[a.priority];
          const bPriority = priorityOrder[b.priority];
          
          if (aPriority !== bPriority) {
            return bPriority - aPriority; // Higher priority first
          }
          
          return a.timestamp - b.timestamp; // Older items first
        });
        
        return newQueue;
      });

      console.log(`Added item to offline queue: ${item.operation}`);

      // If we're online, try to process immediately
      if (isOnline) {
        processQueue();
      }
    } catch (error) {
      console.error('Error adding item to queue:', error);
      crashReporting.recordError(error);
    }
  }, [isOnline, queue]);

  const removeFromQueue = useCallback(async (itemId: string): Promise<void> => {
    setQueue(prevQueue => prevQueue.filter(item => item.id !== itemId));
  }, []);

  const processQueue = useCallback(async (): Promise<void> => {
    if (!isOnline || isProcessing || queue.length === 0) {
      return;
    }

    setIsProcessing(true);

    try {
      console.log(`Processing ${queue.length} items from offline queue`);
      
      const itemsToProcess = [...queue];
      let processedCount = 0;
      let failedCount = 0;

      for (const item of itemsToProcess) {
        try {
          await processQueueItem(item);
          await removeFromQueue(item.id);
          processedCount++;
        } catch (error) {
          console.error(`Failed to process queue item ${item.id}:`, error);
          failedCount++;
          
          // Increment retry count
          setQueue(prevQueue => 
            prevQueue.map(queueItem => 
              queueItem.id === item.id 
                ? { ...queueItem, retryCount: queueItem.retryCount + 1 }
                : queueItem
            )
          );
          
          // Remove items that have exceeded retry limit
          if (item.retryCount >= 3) {
            console.warn(`Removing item ${item.id} after ${item.retryCount} retries`);
            await removeFromQueue(item.id);
            failedCount--;
          }
        }
      }

      if (processedCount > 0 || failedCount > 0) {
        const message = `Offline sync completed: ${processedCount} succeeded${
          failedCount > 0 ? `, ${failedCount} failed` : ''
        }`;
        console.log(message);
        
        // Only show alert for significant sync events
        if (processedCount > 3) {
          Alert.alert('Sync Complete', message);
        }
      }
    } catch (error) {
      console.error('Error processing offline queue:', error);
      crashReporting.recordError(error);
    } finally {
      setIsProcessing(false);
    }
  }, [isOnline, isProcessing, queue]);

  const processQueueItem = async (item: QueueItem): Promise<void> => {
    switch (item.type) {
      case 'mutation':
        await processMutation(item);
        break;
      case 'upload':
        await processUpload(item);
        break;
      case 'action':
        await processAction(item);
        break;
      default:
        throw new Error(`Unknown queue item type: ${item.type}`);
    }
  };

  const processMutation = async (item: QueueItem): Promise<void> => {
    // In a real implementation, you would dynamically import the mutation
    // For now, we'll simulate the process
    console.log(`Processing mutation: ${item.operation}`);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // You would typically do:
    // const mutation = await import(`@/graphql/mutations/${item.operation}`);
    // await apolloClient.mutate({
    //   mutation: mutation.default,
    //   variables: item.variables,
    // });
  };

  const processUpload = async (item: QueueItem): Promise<void> => {
    console.log(`Processing upload: ${item.operation}`);
    
    // Handle file uploads
    // This would typically involve uploading files to your server
    await new Promise(resolve => setTimeout(resolve, 2000));
  };

  const processAction = async (item: QueueItem): Promise<void> => {
    console.log(`Processing action: ${item.operation}`);
    
    // Handle custom actions
    switch (item.operation) {
      case 'acknowledge_alert':
        // Process alert acknowledgment
        break;
      case 'resolve_incident':
        // Process incident resolution
        break;
      default:
        console.warn(`Unknown action: ${item.operation}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  };

  const clearQueue = useCallback(async (): Promise<void> => {
    try {
      setQueue([]);
      await secureStorage.clearOfflineQueue();
      console.log('Offline queue cleared');
    } catch (error) {
      console.error('Error clearing offline queue:', error);
      crashReporting.recordError(error);
    }
  }, []);

  const getQueueStats = useCallback(() => {
    const stats = queue.reduce(
      (acc, item) => {
        acc.total++;
        acc[item.priority]++;
        return acc;
      },
      { total: 0, high: 0, medium: 0, low: 0 }
    );
    
    return stats;
  }, [queue]);

  const contextValue: OfflineQueueContextType = {
    queueSize: queue.length,
    pendingItems: queue,
    isProcessing,
    addToQueue,
    removeFromQueue,
    processQueue,
    clearQueue,
    getQueueStats,
  };

  return (
    <OfflineQueueContext.Provider value={contextValue}>
      {children}
    </OfflineQueueContext.Provider>
  );
};

// Hook for adding mutations to queue when offline
export const useOfflineMutation = () => {
  const { addToQueue } = useOfflineQueue();
  const { isOnline } = useNetworkStatus();

  const executeMutation = useCallback(async (
    operation: string,
    variables: any,
    priority: QueueItem['priority'] = 'medium'
  ) => {
    if (isOnline) {
      // Execute immediately if online
      // In a real app, this would be the actual GraphQL mutation
      console.log(`Executing mutation online: ${operation}`);
      return { success: true };
    } else {
      // Add to queue if offline
      await addToQueue({
        type: 'mutation',
        operation,
        variables,
        priority,
      });
      console.log(`Added mutation to offline queue: ${operation}`);
      return { success: true, queued: true };
    }
  }, [isOnline, addToQueue]);

  return { executeMutation };
};

export default OfflineQueueProvider;
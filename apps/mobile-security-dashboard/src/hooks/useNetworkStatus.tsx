import React, { createContext, useContext, useState, useEffect } from 'react';
import NetInfo, { NetInfoState, NetInfoStateType } from '@react-native-community/netinfo';

// Types
interface NetworkStatusContextType {
  isConnected: boolean;
  connectionType: NetInfoStateType;
  isInternetReachable: boolean | null;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
  isOnline: boolean;
  isWifi: boolean;
  isCellular: boolean;
  connectionDetails: any;
}

const NetworkStatusContext = createContext<NetworkStatusContextType | undefined>(undefined);

export const useNetworkStatus = (): NetworkStatusContextType => {
  const context = useContext(NetworkStatusContext);
  if (!context) {
    throw new Error('useNetworkStatus must be used within a NetworkStatusProvider');
  }
  return context;
};

interface NetworkStatusProviderProps {
  children: React.ReactNode;
}

export const NetworkStatusProvider: React.FC<NetworkStatusProviderProps> = ({ children }) => {
  const [networkState, setNetworkState] = useState<NetInfoState | null>(null);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'fair' | 'poor' | 'unknown'>('unknown');

  useEffect(() => {
    // Get initial network state
    NetInfo.fetch().then(setNetworkState);

    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      setNetworkState(state);
      determineConnectionQuality(state);
    });

    return unsubscribe;
  }, []);

  const determineConnectionQuality = (state: NetInfoState): void => {
    if (!state.isConnected) {
      setConnectionQuality('unknown');
      return;
    }

    // Determine quality based on connection type and details
    switch (state.type) {
      case 'wifi':
        // WiFi is generally good quality
        setConnectionQuality('excellent');
        break;
        
      case 'cellular':
        // Determine quality based on cellular generation
        if (state.details && 'cellularGeneration' in state.details) {
          const generation = state.details.cellularGeneration;
          switch (generation) {
            case '5g':
              setConnectionQuality('excellent');
              break;
            case '4g':
              setConnectionQuality('good');
              break;
            case '3g':
              setConnectionQuality('fair');
              break;
            case '2g':
              setConnectionQuality('poor');
              break;
            default:
              setConnectionQuality('good');
          }
        } else {
          setConnectionQuality('good');
        }
        break;
        
      case 'ethernet':
        setConnectionQuality('excellent');
        break;
        
      case 'wimax':
        setConnectionQuality('good');
        break;
        
      case 'vpn':
        // VPN quality depends on underlying connection
        setConnectionQuality('fair');
        break;
        
      case 'other':
      case 'unknown':
      default:
        setConnectionQuality('unknown');
        break;
    }
  };

  // Provide default values when network state is not available
  const isConnected = networkState?.isConnected ?? false;
  const connectionType = networkState?.type ?? 'unknown';
  const isInternetReachable = networkState?.isInternetReachable ?? null;
  const isOnline = isConnected && (isInternetReachable === true || isInternetReachable === null);
  const isWifi = connectionType === 'wifi';
  const isCellular = connectionType === 'cellular';
  const connectionDetails = networkState?.details ?? null;

  const contextValue: NetworkStatusContextType = {
    isConnected,
    connectionType,
    isInternetReachable,
    connectionQuality,
    isOnline,
    isWifi,
    isCellular,
    connectionDetails,
  };

  return (
    <NetworkStatusContext.Provider value={contextValue}>
      {children}
    </NetworkStatusContext.Provider>
  );
};

// Hook for simplified network status
export const useConnectionStatus = () => {
  const { isOnline, connectionQuality } = useNetworkStatus();
  
  return {
    isOnline,
    isGoodConnection: connectionQuality === 'excellent' || connectionQuality === 'good',
    connectionQuality,
  };
};

// Hook for network-aware data fetching
export const useNetworkAwareQuery = () => {
  const { isOnline, connectionQuality } = useNetworkStatus();
  
  const shouldPoll = isOnline && (connectionQuality === 'excellent' || connectionQuality === 'good');
  const pollInterval = shouldPoll ? (connectionQuality === 'excellent' ? 30000 : 60000) : 0;
  
  return {
    shouldPoll,
    pollInterval,
    fetchPolicy: isOnline ? 'cache-and-network' : 'cache-only',
    errorPolicy: 'cache-first' as const,
  };
};

export default NetworkStatusProvider;
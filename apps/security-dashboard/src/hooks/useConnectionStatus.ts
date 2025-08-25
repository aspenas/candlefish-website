import { useState, useEffect } from 'react';

export interface ConnectionStatus {
  connected: boolean;
  reconnecting: boolean;
  lastConnected?: string;
  error?: string;
}

export const useConnectionStatus = (): ConnectionStatus => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: navigator.onLine,
    reconnecting: false,
  });

  useEffect(() => {
    const handleOnline = () => {
      setConnectionStatus({
        connected: true,
        reconnecting: false,
        lastConnected: new Date().toISOString(),
      });
    };

    const handleOffline = () => {
      setConnectionStatus(prev => ({
        ...prev,
        connected: false,
        reconnecting: false,
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return connectionStatus;
};
'use client';

import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  Cloud,
  CloudOff,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Database,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useNetworkStatus, useSyncStatus, useOfflineStore } from '@/stores/useOfflineStore';

// Main offline status indicator
export function OfflineIndicator() {
  const networkStatus = useNetworkStatus();
  const syncStatus = useSyncStatus();
  const [showDetails, setShowDetails] = useState(false);

  const getStatusColor = () => {
    if (!networkStatus.isOnline) return 'bg-red-500';
    if (syncStatus.pendingItems > 0) return 'bg-yellow-500';
    if (syncStatus.isActive) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getStatusText = () => {
    if (!networkStatus.isOnline) return 'Offline';
    if (syncStatus.isActive) return 'Syncing...';
    if (syncStatus.pendingItems > 0) return `${syncStatus.pendingItems} pending`;
    return 'Online';
  };

  const getStatusIcon = () => {
    if (!networkStatus.isOnline) return <WifiOff className="w-3 h-3" />;
    if (syncStatus.isActive) return <RefreshCw className="w-3 h-3 animate-spin" />;
    if (syncStatus.pendingItems > 0) return <Clock className="w-3 h-3" />;
    return <Wifi className="w-3 h-3" />;
  };

  return (
    <>
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="relative inline-flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium text-white transition-all duration-200 hover:scale-105"
        style={{ backgroundColor: getStatusColor().replace('bg-', '') }}
      >
        {getStatusIcon()}
        <span>{getStatusText()}</span>

        {/* Pulse animation for active sync */}
        {syncStatus.isActive && (
          <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-20"></div>
        )}
      </button>

      {showDetails && (
        <OfflineStatusModal onClose={() => setShowDetails(false)} />
      )}
    </>
  );
}

// Detailed offline status modal
function OfflineStatusModal({ onClose }: { onClose: () => void }) {
  const networkStatus = useNetworkStatus();
  const syncStatus = useSyncStatus();
  const offlineStore = useOfflineStore();
  const [storageStats, setStorageStats] = useState<any>(null);

  useEffect(() => {
    const loadStats = async () => {
      const stats = await offlineStore.getStorageStats();
      setStorageStats(stats);
    };
    loadStats();
  }, [offlineStore]);

  const handleForceSync = async () => {
    if (networkStatus.isOnline) {
      await offlineStore.triggerSync();
    }
  };

  const handleClearErrors = () => {
    offlineStore.clearSyncErrors();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Connection Status
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Network Status */}
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${networkStatus.isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <div>
              <p className="font-medium text-gray-900">
                Network: {networkStatus.isOnline ? 'Connected' : 'Disconnected'}
              </p>
              {networkStatus.connectionType && (
                <p className="text-sm text-gray-600">
                  Connection: {networkStatus.connectionType}
                </p>
              )}
              {networkStatus.lastOnline && !networkStatus.isOnline && (
                <p className="text-sm text-gray-600">
                  Last online: {new Date(networkStatus.lastOnline).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          {/* Sync Status */}
          <div className="flex items-start space-x-3">
            <div className="mt-1">
              {syncStatus.isActive ? (
                <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
              ) : syncStatus.pendingItems > 0 ? (
                <Clock className="w-4 h-4 text-yellow-500" />
              ) : (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
            </div>
            <div>
              <p className="font-medium text-gray-900">
                Sync Status
              </p>
              <p className="text-sm text-gray-600">
                {syncStatus.isActive
                  ? 'Syncing data...'
                  : syncStatus.pendingItems > 0
                  ? `${syncStatus.pendingItems} items waiting to sync`
                  : 'All data synced'
                }
              </p>
              {syncStatus.lastSync && (
                <p className="text-sm text-gray-600">
                  Last sync: {new Date(syncStatus.lastSync).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          {/* Sync Errors */}
          {syncStatus.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-red-800 text-sm">
                    Sync Errors ({syncStatus.errors.length})
                  </p>
                  <div className="mt-1 text-sm text-red-700 space-y-1 max-h-20 overflow-y-auto">
                    {syncStatus.errors.map((error, index) => (
                      <div key={index} className="text-xs">
                        {error}
                      </div>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleClearErrors}
                    className="mt-2 text-red-700 border-red-300 hover:bg-red-100"
                  >
                    Clear Errors
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Storage Stats */}
          {storageStats && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <Database className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-800 text-sm">
                    Offline Storage
                  </p>
                  <div className="mt-1 text-sm text-gray-600 space-y-1">
                    <div className="grid grid-cols-2 gap-2">
                      <div>Estimates: {storageStats.estimates}</div>
                      <div>Photos: {storageStats.photos}</div>
                      <div>Customers: {storageStats.customers}</div>
                      <div>Calculations: {storageStats.calculations}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-2 pt-2">
            <Button
              onClick={handleForceSync}
              disabled={!networkStatus.isOnline || syncStatus.isActive}
              className="flex-1 flex items-center justify-center space-x-2"
            >
              <Sync className="w-4 h-4" />
              <span>Sync Now</span>
            </Button>

            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Close
            </Button>
          </div>

          {/* Offline Mode Tips */}
          {!networkStatus.isOnline && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="font-medium text-blue-800 text-sm">
                Working Offline
              </p>
              <ul className="mt-1 text-sm text-blue-700 space-y-1">
                <li>• Your changes are saved locally</li>
                <li>• Photos are stored on your device</li>
                <li>• Calculations work without internet</li>
                <li>• Data will sync when you're back online</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Compact sync status badge
export function SyncStatusBadge() {
  const syncStatus = useSyncStatus();
  const networkStatus = useNetworkStatus();

  if (!networkStatus.isOnline) {
    return (
      <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <CloudOff className="w-3 h-3 mr-1" />
        Offline
      </div>
    );
  }

  if (syncStatus.isActive) {
    return (
      <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
        Syncing
      </div>
    );
  }

  if (syncStatus.pendingItems > 0) {
    return (
      <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        <Clock className="w-3 h-3 mr-1" />
        {syncStatus.pendingItems} pending
      </div>
    );
  }

  return (
    <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
      <Cloud className="w-3 h-3 mr-1" />
      Synced
    </div>
  );
}

// Connection quality indicator
export function ConnectionQuality() {
  const networkStatus = useNetworkStatus();
  const [connectionStrength, setConnectionStrength] = useState<'excellent' | 'good' | 'poor' | 'offline'>('offline');

  useEffect(() => {
    if (!networkStatus.isOnline) {
      setConnectionStrength('offline');
      return;
    }

    // Simulate connection quality based on connection type
    const getQuality = (type: string | null): typeof connectionStrength => {
      if (!type) return 'good';

      switch (type.toLowerCase()) {
        case '4g':
        case '5g':
        case 'wifi':
          return 'excellent';
        case '3g':
        case 'cellular':
          return 'good';
        case '2g':
        case 'slow-2g':
          return 'poor';
        default:
          return 'good';
      }
    };

    setConnectionStrength(getQuality(networkStatus.connectionType));
  }, [networkStatus.isOnline, networkStatus.connectionType]);

  const getSignalBars = () => {
    switch (connectionStrength) {
      case 'excellent':
        return [true, true, true, true];
      case 'good':
        return [true, true, true, false];
      case 'poor':
        return [true, true, false, false];
      case 'offline':
        return [false, false, false, false];
    }
  };

  const signalBars = getSignalBars();

  return (
    <div className="inline-flex items-center space-x-1">
      <div className="flex items-end space-x-0.5">
        {signalBars.map((active, index) => (
          <div
            key={index}
            className={`w-1 bg-current transition-colors ${
              active ? 'text-green-500' : 'text-gray-300'
            }`}
            style={{ height: `${(index + 1) * 3 + 2}px` }}
          />
        ))}
      </div>
      <span className="text-xs text-gray-600 ml-1">
        {connectionStrength === 'offline' ? 'Offline' : networkStatus.connectionType || 'Online'}
      </span>
    </div>
  );
}

// Auto-sync toggle
export function AutoSyncToggle() {
  const offlineStore = useOfflineStore();
  const [autoSync, setAutoSync] = useState(true);

  const handleToggle = () => {
    setAutoSync(!autoSync);
    // This would be implemented in the sync service
    console.log('Auto-sync:', !autoSync);
  };

  return (
    <label className="inline-flex items-center space-x-2 cursor-pointer">
      <input
        type="checkbox"
        checked={autoSync}
        onChange={handleToggle}
        className="sr-only"
      />
      <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        autoSync ? 'bg-blue-600' : 'bg-gray-300'
      }`}>
        <div className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
          autoSync ? 'translate-x-5' : 'translate-x-1'
        }`} />
      </div>
      <span className="text-sm text-gray-700">Auto-sync</span>
    </label>
  );
}

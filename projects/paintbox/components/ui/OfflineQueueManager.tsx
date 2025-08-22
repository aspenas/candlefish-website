'use client';

import React, { useState, useEffect } from 'react';
import {
  Upload,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  RefreshCw,
  FileText,
  Camera,
  Users,
  Trash2,
  Eye,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useOfflineStore, useNetworkStatus, useSyncStatus } from '@/stores/useOfflineStore';
import { offlineDB, type SyncQueue } from '@/lib/db/offline-db';

// Main offline queue manager component
export function OfflineQueueManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [queueItems, setQueueItems] = useState<SyncQueue[]>([]);
  const [loading, setLoading] = useState(false);
  const networkStatus = useNetworkStatus();
  const syncStatus = useSyncStatus();
  const offlineStore = useOfflineStore();

  // Load queue items
  const loadQueueItems = async () => {
    try {
      setLoading(true);
      const items = await offlineDB.getNextSyncItems(50); // Get more items for management
      setQueueItems(items);
    } catch (error) {
      console.error('Failed to load queue items:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load items when component mounts or when sync status changes
  useEffect(() => {
    if (isOpen) {
      loadQueueItems();
    }
  }, [isOpen, syncStatus.lastSync]);

  // Auto-refresh queue items
  useEffect(() => {
    if (isOpen) {
      const interval = setInterval(loadQueueItems, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const handleSyncAll = async () => {
    if (!networkStatus.isOnline) return;

    try {
      await offlineStore.triggerSync();
      setTimeout(loadQueueItems, 1000); // Reload after sync
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  const handleRetryItem = async (item: SyncQueue) => {
    if (!networkStatus.isOnline) return;

    try {
      // Reset retry counter and schedule immediate retry
      await offlineDB.syncQueue.update(item.id!, {
        attempts: 0,
        nextRetry: new Date(),
        updatedAt: new Date()
      });

      // Trigger sync for this specific item
      setTimeout(async () => {
        await offlineStore.triggerSync();
        loadQueueItems();
      }, 500);
    } catch (error) {
      console.error('Failed to retry item:', error);
    }
  };

  const handleDeleteItem = async (item: SyncQueue) => {
    try {
      await offlineDB.removeSyncItem(item.id!);
      loadQueueItems();
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'estimate': return <FileText className="w-4 h-4" />;
      case 'photo': return <Camera className="w-4 h-4" />;
      case 'salesforce': return <Users className="w-4 h-4" />;
      default: return <Upload className="w-4 h-4" />;
    }
  };

  const getItemStatus = (item: SyncQueue) => {
    const now = new Date();
    const isOverdue = item.nextRetry < now;
    const hasMaxAttempts = item.attempts >= item.maxAttempts;

    if (hasMaxAttempts) {
      return { status: 'failed', color: 'text-red-600', bg: 'bg-red-50' };
    } else if (isOverdue) {
      return { status: 'ready', color: 'text-green-600', bg: 'bg-green-50' };
    } else {
      return { status: 'waiting', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="relative inline-flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 hover:scale-105 bg-blue-500 text-white"
        title="View sync queue"
      >
        <Upload className="w-3 h-3" />
        <span>Queue ({queueItems.length})</span>
        {queueItems.length > 0 && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
        )}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <Upload className="w-5 h-5" />
            <span>Sync Queue ({queueItems.length} items)</span>
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Summary */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-sm">
              <div className={`flex items-center space-x-1 ${networkStatus.isOnline ? 'text-green-600' : 'text-red-600'}`}>
                <div className={`w-2 h-2 rounded-full ${networkStatus.isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span>{networkStatus.isOnline ? 'Online' : 'Offline'}</span>
              </div>
              {syncStatus.isActive && (
                <div className="flex items-center space-x-1 text-blue-600">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Syncing...</span>
                </div>
              )}
            </div>
            <Button
              onClick={handleSyncAll}
              disabled={!networkStatus.isOnline || syncStatus.isActive || queueItems.length === 0}
              size="sm"
              className="flex items-center space-x-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Sync All</span>
            </Button>
          </div>
        </div>

        {/* Queue Items */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600">Loading queue items...</p>
            </div>
          ) : queueItems.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">All synced!</h3>
              <p className="text-sm text-gray-600">No items waiting to sync.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {queueItems.map((item) => {
                const itemStatus = getItemStatus(item);
                return (
                  <QueueItemRow
                    key={item.id}
                    item={item}
                    status={itemStatus}
                    onRetry={() => handleRetryItem(item)}
                    onDelete={() => handleDeleteItem(item)}
                    isOnline={networkStatus.isOnline}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <div>
              Items sync automatically when online. Manual sync available above.
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Individual queue item component
function QueueItemRow({
  item,
  status,
  onRetry,
  onDelete,
  isOnline
}: {
  item: SyncQueue;
  status: { status: string; color: string; bg: string };
  onRetry: () => void;
  onDelete: () => void;
  isOnline: boolean;
}) {
  const [showDetails, setShowDetails] = useState(false);

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'estimate': return <FileText className="w-4 h-4" />;
      case 'photo': return <Camera className="w-4 h-4" />;
      case 'salesforce': return <Users className="w-4 h-4" />;
      default: return <Upload className="w-4 h-4" />;
    }
  };

  const getItemDescription = (item: SyncQueue) => {
    const data = item.data || {};
    switch (item.type) {
      case 'estimate':
        return `Estimate: ${data.estimateId || 'Unknown ID'}`;
      case 'photo':
        return `Photo: ${data.metadata?.filename || 'Unknown file'}`;
      case 'salesforce':
        return `Salesforce: ${data.objectType || 'Unknown object'}`;
      default:
        return `${item.type}: ${item.action}`;
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1">
          <div className={`p-2 rounded-lg ${status.bg}`}>
            {getItemIcon(item.type)}
          </div>

          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h4 className="text-sm font-medium text-gray-900">
                {getItemDescription(item)}
              </h4>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                {status.status}
              </span>
              {item.attempts >= item.maxAttempts && (
                <AlertTriangle className="w-4 h-4 text-red-500" title="Max retries exceeded" />
              )}
            </div>

            <div className="mt-1 text-xs text-gray-500 space-x-4">
              <span>Priority: {item.priority}</span>
              <span>Attempts: {item.attempts}/{item.maxAttempts}</span>
              <span>Created: {formatDate(item.createdAt)}</span>
              {item.attempts > 0 && (
                <span>Next retry: {formatDate(item.nextRetry)}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="p-1 text-gray-400 hover:text-gray-600"
            title="View details"
          >
            <Eye className="w-4 h-4" />
          </button>

          {isOnline && item.attempts < item.maxAttempts && (
            <button
              onClick={onRetry}
              className="p-1 text-blue-600 hover:text-blue-800"
              title="Retry now"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onDelete}
            className="p-1 text-red-600 hover:text-red-800"
            title="Remove from queue"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Item Details */}
      {showDetails && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
          <h5 className="text-xs font-medium text-gray-700 mb-2">Item Details</h5>
          <pre className="text-xs text-gray-600 whitespace-pre-wrap overflow-x-auto">
            {JSON.stringify(item.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// Compact queue status for header
export function QueueStatusBadge() {
  const [queueCount, setQueueCount] = useState(0);
  const syncStatus = useSyncStatus();

  useEffect(() => {
    const loadCount = async () => {
      try {
        const items = await offlineDB.getNextSyncItems(100);
        setQueueCount(items.length);
      } catch (error) {
        console.error('Failed to load queue count:', error);
      }
    };

    loadCount();
    const interval = setInterval(loadCount, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [syncStatus.lastSync]);

  if (queueCount === 0) {
    return null;
  }

  return (
    <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
      <Upload className="w-3 h-3 mr-1" />
      {queueCount} pending
    </div>
  );
}

// Enhanced sync button with queue integration
export function SyncButton() {
  const networkStatus = useNetworkStatus();
  const syncStatus = useSyncStatus();
  const offlineStore = useOfflineStore();
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    const loadCount = async () => {
      try {
        const items = await offlineDB.getNextSyncItems(100);
        setQueueCount(items.length);
      } catch (error) {
        console.error('Failed to load queue count:', error);
      }
    };

    loadCount();
    const interval = setInterval(loadCount, 5000);
    return () => clearInterval(interval);
  }, [syncStatus.lastSync]);

  const handleSync = async () => {
    if (!networkStatus.isOnline || syncStatus.isActive) return;

    try {
      await offlineStore.triggerSync();
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  if (queueCount === 0 && networkStatus.isOnline && !syncStatus.isActive) {
    return (
      <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        Synced
      </div>
    );
  }

  return (
    <button
      onClick={handleSync}
      disabled={!networkStatus.isOnline || syncStatus.isActive}
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-all ${
        !networkStatus.isOnline
          ? 'bg-red-100 text-red-800'
          : syncStatus.isActive
          ? 'bg-blue-100 text-blue-800'
          : queueCount > 0
          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
          : 'bg-green-100 text-green-800'
      }`}
    >
      {!networkStatus.isOnline ? (
        <>
          <AlertCircle className="w-3 h-3 mr-1" />
          Offline
        </>
      ) : syncStatus.isActive ? (
        <>
          <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
          Syncing...
        </>
      ) : queueCount > 0 ? (
        <>
          <Clock className="w-3 h-3 mr-1" />
          Sync {queueCount} items
        </>
      ) : (
        <>
          <CheckCircle className="w-3 h-3 mr-1" />
          Synced
        </>
      )}
    </button>
  );
}

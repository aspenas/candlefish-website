import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, Activity, AlertCircle } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { useAppStore, useRealtimeState } from '@/store';
import { formatRelativeTime } from '@/utils/formatting';

interface RealtimeIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

const RealtimeIndicator: React.FC<RealtimeIndicatorProps> = ({
  className,
  showDetails = false
}) => {
  const realtimeState = useRealtimeState();
  const [pulse, setPulse] = useState(false);

  // Pulse animation when receiving updates
  useEffect(() => {
    if (realtimeState.connectionStatus === 'connected') {
      setPulse(true);
      const timer = setTimeout(() => setPulse(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [realtimeState.lastUpdateTimestamp]);

  const getStatusColor = () => {
    switch (realtimeState.connectionStatus) {
      case 'connected':
        return 'success';
      case 'reconnecting':
        return 'warning';
      case 'disconnected':
        return 'error';
      default:
        return 'secondary';
    }
  };

  const getStatusIcon = () => {
    switch (realtimeState.connectionStatus) {
      case 'connected':
        return <Wifi className={`w-4 h-4 ${pulse ? 'animate-pulse' : ''}`} />;
      case 'reconnecting':
        return <Activity className="w-4 h-4 animate-spin" />;
      case 'disconnected':
        return <WifiOff className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusText = () => {
    switch (realtimeState.connectionStatus) {
      case 'connected':
        return 'Live';
      case 'reconnecting':
        return 'Connecting...';
      case 'disconnected':
        return 'Offline';
      default:
        return 'Unknown';
    }
  };

  const activeSubscriptions = realtimeState.connectedSubscriptions.size;
  const hasErrors = Object.keys(realtimeState.subscriptionErrors).length > 0;

  if (!showDetails) {
    return (
      <div className={className}>
        <Badge
          variant={getStatusColor() as any}
          size="sm"
        >
          <span className="flex items-center space-x-1">
            {getStatusIcon()}
            <span>{getStatusText()}</span>
          </span>
        </Badge>
      </div>
    );
  }

  return (
    <div className={`${className} bg-white border border-gray-200 rounded-lg p-3 shadow-soft`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className="text-sm font-medium text-gray-900">
            Real-time Status
          </span>
        </div>
        <Badge variant={getStatusColor() as any} size="sm">
          {getStatusText()}
        </Badge>
      </div>

      <div className="space-y-2 text-xs text-gray-600">
        <div className="flex justify-between">
          <span>Active subscriptions:</span>
          <span className="font-medium">{activeSubscriptions}</span>
        </div>

        {hasErrors && (
          <div className="text-error-600">
            <span>{Object.keys(realtimeState.subscriptionErrors).length} error(s)</span>
          </div>
        )}

        {Object.keys(realtimeState.lastUpdateTimestamp).length > 0 && (
          <div>
            <span className="text-gray-500">Last update:</span>
            <span className="ml-1 font-medium">
              {formatRelativeTime(
                new Date(
                  Math.max(...Object.values(realtimeState.lastUpdateTimestamp))
                ).toISOString()
              )}
            </span>
          </div>
        )}
      </div>

      {hasErrors && (
        <div className="mt-3 pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Subscription Errors:</p>
          <div className="space-y-1">
            {Object.entries(realtimeState.subscriptionErrors).map(([subscriptionId, error]) => (
              <div key={subscriptionId} className="text-xs text-error-600">
                <span className="font-mono">{subscriptionId.slice(0, 8)}...</span>: {error}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RealtimeIndicator;

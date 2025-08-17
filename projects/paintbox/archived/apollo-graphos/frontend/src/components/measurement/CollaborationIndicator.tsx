import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UsersIcon,
  WifiIcon,
  ExclamationTriangleIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';
import { useCollaboration } from '@/store/measurement';
import { Badge } from '@/components/ui/Badge';
import { clsx } from 'clsx';

interface CollaborationIndicatorProps {
  className?: string;
}

export const CollaborationIndicator: React.FC<CollaborationIndicatorProps> = ({
  className
}) => {
  const { connectedUsers, lockedMeasurements, lastSync } = useCollaboration();

  const getConnectionStatus = () => {
    const now = Date.now();
    const timeSinceSync = now - lastSync;

    if (timeSinceSync > 30000) return 'disconnected';
    if (timeSinceSync > 10000) return 'warning';
    return 'connected';
  };

  const connectionStatus = getConnectionStatus();
  const activeUsers = connectedUsers.filter(user =>
    user.cursor !== null || user.currentMeasurement !== undefined
  );

  const statusConfig = {
    connected: {
      color: 'green',
      icon: WifiIcon,
      text: 'Connected',
    },
    warning: {
      color: 'yellow',
      icon: ExclamationTriangleIcon,
      text: 'Connection issues',
    },
    disconnected: {
      color: 'red',
      icon: ExclamationTriangleIcon,
      text: 'Disconnected',
    },
  };

  const config = statusConfig[connectionStatus];
  const StatusIcon = config.icon;

  return (
    <div className={clsx('flex items-center space-x-3', className)}>
      {/* Connection Status */}
      <div className="flex items-center space-x-2">
        <div className={clsx(
          'flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium',
          `bg-${config.color}-100 text-${config.color}-800`
        )}>
          <StatusIcon className="w-3 h-3" />
          <span>{config.text}</span>
        </div>

        {/* Connected Users */}
        {connectedUsers.length > 0 && (
          <div className="flex items-center space-x-1 px-2 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-700">
            <UsersIcon className="w-3 h-3" />
            <span>{connectedUsers.length}</span>
          </div>
        )}

        {/* Locked Measurements */}
        {lockedMeasurements.size > 0 && (
          <div className="flex items-center space-x-1 px-2 py-1 bg-blue-100 rounded-full text-xs font-medium text-blue-800">
            <LockClosedIcon className="w-3 h-3" />
            <span>{lockedMeasurements.size}</span>
          </div>
        )}
      </div>

      {/* Active User Avatars */}
      <div className="flex items-center -space-x-1">
        <AnimatePresence>
          {activeUsers.slice(0, 3).map((user, index) => (
            <motion.div
              key={user.userId}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              className="relative"
              style={{ zIndex: activeUsers.length - index }}
            >
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-sm">
                {user.userName.charAt(0).toUpperCase()}
              </div>

              {/* Activity Indicator */}
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white">
                <div className="w-full h-full bg-green-400 rounded-full animate-pulse" />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Additional users count */}
        {activeUsers.length > 3 && (
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 text-xs font-bold border-2 border-white">
            +{activeUsers.length - 3}
          </div>
        )}
      </div>
    </div>
  );
};

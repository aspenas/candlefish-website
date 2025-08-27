import React from 'react';
import { formatDistance } from 'date-fns';
import { 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  QuestionMarkCircleIcon
} from '@heroicons/react/24/solid';
import clsx from 'clsx';
import { HealthStatus } from '../../types/security';

interface SystemHealthIndicatorProps {
  name: string;
  status: HealthStatus;
  lastCheck: string;
  details?: string;
}

const SystemHealthIndicator: React.FC<SystemHealthIndicatorProps> = ({
  name,
  status,
  lastCheck,
  details,
}) => {
  const getStatusConfig = (status: HealthStatus) => {
    switch (status) {
      case HealthStatus.HEALTHY:
        return {
          icon: CheckCircleIcon,
          color: 'text-success-400',
          bg: 'bg-success-950/20',
          border: 'border-success-800/30',
          label: 'Healthy',
        };
      case HealthStatus.WARNING:
        return {
          icon: ExclamationTriangleIcon,
          color: 'text-warning-400',
          bg: 'bg-warning-950/20',
          border: 'border-warning-800/30',
          label: 'Warning',
        };
      case HealthStatus.CRITICAL:
        return {
          icon: XCircleIcon,
          color: 'text-critical-400',
          bg: 'bg-critical-950/20',
          border: 'border-critical-800/30',
          label: 'Critical',
        };
      case HealthStatus.UNKNOWN:
      default:
        return {
          icon: QuestionMarkCircleIcon,
          color: 'text-soc-muted',
          bg: 'bg-soc-elevated',
          border: 'border-soc-border',
          label: 'Unknown',
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;
  const lastCheckDate = new Date(lastCheck);
  const timeAgo = formatDistance(lastCheckDate, new Date(), { addSuffix: true });

  return (
    <div className={clsx(
      'flex items-center justify-between p-3 rounded-lg border transition-colors',
      config.bg,
      config.border,
      'hover:border-security-700'
    )}>
      <div className="flex items-center space-x-3">
        <div className={clsx('flex-shrink-0', config.color)}>
          <Icon className="w-5 h-5" />
        </div>
        
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-medium text-white truncate">
            {name}
          </h4>
          {details && (
            <p className="text-xs text-soc-muted mt-1 line-clamp-1">
              {details}
            </p>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-3 text-right">
        <div>
          <div className={clsx('text-sm font-medium', config.color)}>
            {config.label}
          </div>
          <div className="text-xs text-soc-muted">
            {timeAgo}
          </div>
        </div>
        
        {/* Health indicator dots */}
        <div className="flex flex-col space-y-1">
          <div className={clsx(
            'w-2 h-2 rounded-full',
            status === HealthStatus.HEALTHY ? 'bg-success-500 animate-pulse' : 'bg-soc-border'
          )}></div>
          <div className={clsx(
            'w-2 h-2 rounded-full',
            status === HealthStatus.WARNING ? 'bg-warning-500 animate-pulse' : 'bg-soc-border'
          )}></div>
          <div className={clsx(
            'w-2 h-2 rounded-full',
            status === HealthStatus.CRITICAL ? 'bg-critical-500 animate-pulse' : 'bg-soc-border'
          )}></div>
        </div>
      </div>
    </div>
  );
};

export default SystemHealthIndicator;
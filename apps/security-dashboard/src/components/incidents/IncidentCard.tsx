import React from 'react';
import {
  ClockIcon,
  UserIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/outline';
import { Incident, IncidentStatus, IncidentPriority } from '../../types/security';
import clsx from 'clsx';

interface IncidentCardProps {
  incident: Incident;
  onStatusChange?: (status: IncidentStatus) => void;
  onAssign?: (userId: string) => void;
  onClick?: () => void;
}

const priorityColors: Record<IncidentPriority, string> = {
  [IncidentPriority.CRITICAL]: 'border-critical-500 bg-critical-950/20',
  [IncidentPriority.HIGH]: 'border-warning-500 bg-warning-950/20',
  [IncidentPriority.MEDIUM]: 'border-warning-400 bg-warning-950/10',
  [IncidentPriority.LOW]: 'border-info-500 bg-info-950/20',
};

const statusIcons: Record<IncidentStatus, React.ReactNode> = {
  [IncidentStatus.OPEN]: <ExclamationTriangleIcon className="w-4 h-4 text-critical-400" />,
  [IncidentStatus.INVESTIGATING]: <ClockIcon className="w-4 h-4 text-info-400" />,
  [IncidentStatus.RESOLVED]: <CheckCircleIcon className="w-4 h-4 text-success-400" />,
  [IncidentStatus.CLOSED]: <CheckCircleIcon className="w-4 h-4 text-muted" />,
};

const IncidentCard: React.FC<IncidentCardProps> = ({
  incident,
  onStatusChange,
  onAssign,
  onClick,
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const getTimeAgo = (date: string) => {
    const now = Date.now();
    const then = new Date(date).getTime();
    const diff = now - then;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return `${minutes}m ago`;
  };

  return (
    <div
      onClick={handleClick}
      className={clsx(
        'p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-lg',
        priorityColors[incident.priority],
        'hover:scale-[1.02] hover:shadow-glow-sm'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {statusIcons[incident.status]}
          <span className="text-xs font-medium text-muted">
            INC-{incident.id.slice(0, 8)}
          </span>
        </div>
        <span className={clsx(
          'px-2 py-1 text-xs font-semibold rounded-full',
          incident.priority === IncidentPriority.CRITICAL && 'bg-critical-500 text-white',
          incident.priority === IncidentPriority.HIGH && 'bg-warning-500 text-white',
          incident.priority === IncidentPriority.MEDIUM && 'bg-warning-400 text-dark-900',
          incident.priority === IncidentPriority.LOW && 'bg-info-500 text-white',
        )}>
          {incident.priority}
        </span>
      </div>

      {/* Title */}
      <h4 className="font-medium text-white mb-2 line-clamp-2">
        {incident.title}
      </h4>

      {/* Description */}
      <p className="text-sm text-muted mb-3 line-clamp-2">
        {incident.description}
      </p>

      {/* Metadata */}
      <div className="flex items-center justify-between text-xs text-muted">
        <div className="flex items-center gap-1">
          <UserIcon className="w-3 h-3" />
          <span>
            {incident.assignedTo?.name || 'Unassigned'}
          </span>
        </div>
        <span>{getTimeAgo(incident.createdAt)}</span>
      </div>

      {/* Affected Systems */}
      {incident.affectedSystems && incident.affectedSystems.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {incident.affectedSystems.slice(0, 3).map((system) => (
            <span
              key={system}
              className="px-2 py-1 text-xs bg-soc-elevated rounded-full text-info-400"
            >
              {system}
            </span>
          ))}
          {incident.affectedSystems.length > 3 && (
            <span className="px-2 py-1 text-xs bg-soc-elevated rounded-full text-muted">
              +{incident.affectedSystems.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default IncidentCard;
import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  TagIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { SecurityEvent, SecurityEventStatus, Severity } from '../../types/security';

interface EventCardProps {
  event: SecurityEvent;
  onStatusUpdate: (eventId: string, status: SecurityEventStatus) => void;
  onSelect?: (event: SecurityEvent) => void;
  isSelected?: boolean;
  isUpdating?: boolean;
}

const EventCard: React.FC<EventCardProps> = ({
  event,
  onStatusUpdate,
  onSelect,
  isSelected = false,
  isUpdating = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getSeverityConfig = (severity: Severity) => {
    switch (severity) {
      case Severity.CRITICAL:
        return {
          icon: ShieldExclamationIcon,
          color: 'text-critical-400',
          bg: 'bg-critical-950/20',
          border: 'border-critical-800',
          badge: 'bg-critical-950/50 text-critical-400 border-critical-800',
        };
      case Severity.HIGH:
        return {
          icon: ExclamationTriangleIcon,
          color: 'text-warning-400',
          bg: 'bg-warning-950/20',
          border: 'border-warning-800',
          badge: 'bg-warning-950/50 text-warning-400 border-warning-800',
        };
      case Severity.MEDIUM:
        return {
          icon: InformationCircleIcon,
          color: 'text-info-400',
          bg: 'bg-info-950/20',
          border: 'border-info-800',
          badge: 'bg-info-950/50 text-info-400 border-info-800',
        };
      case Severity.LOW:
        return {
          icon: CheckCircleIcon,
          color: 'text-success-400',
          bg: 'bg-success-950/20',
          border: 'border-success-800',
          badge: 'bg-success-950/50 text-success-400 border-success-800',
        };
      default:
        return {
          icon: ClockIcon,
          color: 'text-soc-muted',
          bg: 'bg-soc-elevated',
          border: 'border-soc-border',
          badge: 'bg-soc-elevated text-soc-muted border-soc-border',
        };
    }
  };

  const getStatusConfig = (status: SecurityEventStatus) => {
    switch (status) {
      case SecurityEventStatus.NEW:
        return {
          color: 'text-critical-400',
          bg: 'bg-critical-950/30',
          label: 'New',
        };
      case SecurityEventStatus.INVESTIGATING:
        return {
          color: 'text-warning-400',
          bg: 'bg-warning-950/30',
          label: 'Investigating',
        };
      case SecurityEventStatus.RESOLVED:
        return {
          color: 'text-success-400',
          bg: 'bg-success-950/30',
          label: 'Resolved',
        };
      case SecurityEventStatus.FALSE_POSITIVE:
        return {
          color: 'text-soc-muted',
          bg: 'bg-soc-elevated',
          label: 'False Positive',
        };
      default:
        return {
          color: 'text-soc-muted',
          bg: 'bg-soc-elevated',
          label: status,
        };
    }
  };

  const severityConfig = getSeverityConfig(event.severity);
  const statusConfig = getStatusConfig(event.status);
  const SeverityIcon = severityConfig.icon;
  const timestamp = parseISO(event.timestamp);

  const handleStatusChange = (newStatus: SecurityEventStatus) => {
    if (newStatus !== event.status) {
      onStatusUpdate(event.id, newStatus);
    }
  };

  return (
    <div
      className={clsx(
        'soc-card transition-all duration-200 cursor-pointer',
        severityConfig.border,
        severityConfig.bg,
        isSelected ? 'ring-2 ring-security-500' : 'hover:border-security-700',
        'hover:shadow-glow-sm'
      )}
      onClick={() => onSelect?.(event)}
    >
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1 min-w-0">
            {/* Severity Icon */}
            <div className={clsx('mt-1', severityConfig.color)}>
              <SeverityIcon className="w-5 h-5" />
            </div>
            
            {/* Event Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <h4 className="text-white font-medium truncate">
                  {event.title}
                </h4>
                <span className={clsx(
                  'inline-flex items-center px-2 py-1 rounded text-xs font-medium border',
                  severityConfig.badge
                )}>
                  {event.severity}
                </span>
              </div>
              
              <p className="text-sm text-soc-muted mb-2 line-clamp-2">
                {event.description}
              </p>
              
              <div className="flex items-center space-x-4 text-xs text-soc-muted">
                <span>{format(timestamp, 'HH:mm:ss')}</span>
                <span>Source: {event.source}</span>
                {event.assetId && <span>Asset: {event.assetId}</span>}
              </div>
            </div>
          </div>
          
          {/* Status & Actions */}
          <div className="flex items-center space-x-2 ml-4">
            {/* Status Badge */}
            <span className={clsx(
              'inline-flex items-center px-2 py-1 rounded text-xs font-medium',
              statusConfig.color,
              statusConfig.bg
            )}>
              {statusConfig.label}
            </span>
            
            {/* Expand Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="p-1 text-soc-muted hover:text-security-400 transition-colors"
            >
              {isExpanded ? (
                <ChevronUpIcon className="w-4 h-4" />
              ) : (
                <ChevronDownIcon className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-soc-border">
          <div className="pt-4 space-y-4">
            {/* Metadata */}
            {Object.keys(event.metadata).length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-white mb-2">Metadata</h5>
                <div className="bg-soc-elevated rounded p-3 text-xs">
                  <pre className="text-soc-muted overflow-x-auto">
                    {JSON.stringify(event.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            )}
            
            {/* Tags */}
            {event.tags.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-white mb-2">Tags</h5>
                <div className="flex flex-wrap gap-2">
                  {event.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded text-xs bg-soc-elevated text-soc-muted border border-soc-border"
                    >
                      <TagIcon className="w-3 h-3 mr-1" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-soc-border">
              <div className="text-xs text-soc-muted">
                Event ID: {event.id}
              </div>
              
              {/* Status Update Actions */}
              <div className="flex items-center space-x-2">
                {event.status !== SecurityEventStatus.INVESTIGATING && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusChange(SecurityEventStatus.INVESTIGATING);
                    }}
                    disabled={isUpdating}
                    className="px-3 py-1 text-xs bg-warning-950/30 text-warning-400 border border-warning-800 rounded hover:bg-warning-950/50 disabled:opacity-50"
                  >
                    Investigate
                  </button>
                )}
                
                {event.status !== SecurityEventStatus.RESOLVED && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusChange(SecurityEventStatus.RESOLVED);
                    }}
                    disabled={isUpdating}
                    className="px-3 py-1 text-xs bg-success-950/30 text-success-400 border border-success-800 rounded hover:bg-success-950/50 disabled:opacity-50"
                  >
                    Resolve
                  </button>
                )}
                
                {event.status !== SecurityEventStatus.FALSE_POSITIVE && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusChange(SecurityEventStatus.FALSE_POSITIVE);
                    }}
                    disabled={isUpdating}
                    className="px-3 py-1 text-xs bg-soc-elevated text-soc-muted border border-soc-border rounded hover:bg-soc-surface disabled:opacity-50"
                  >
                    False Positive
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventCard;
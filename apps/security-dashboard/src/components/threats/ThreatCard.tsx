import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  ShieldExclamationIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  EyeIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { Threat, ThreatStatus, Severity, ThreatType } from '../../types/security';

interface ThreatCardProps {
  threat: Threat;
  onStatusUpdate: (threatId: string, status: ThreatStatus) => void;
  onSelect?: (threat: Threat) => void;
  isSelected?: boolean;
  isUpdating?: boolean;
}

const ThreatCard: React.FC<ThreatCardProps> = ({
  threat,
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
          glow: 'shadow-critical-glow',
        };
      case Severity.HIGH:
        return {
          icon: ExclamationTriangleIcon,
          color: 'text-warning-400',
          bg: 'bg-warning-950/20',
          border: 'border-warning-800',
          badge: 'bg-warning-950/50 text-warning-400 border-warning-800',
          glow: 'shadow-warning-glow',
        };
      case Severity.MEDIUM:
        return {
          icon: InformationCircleIcon,
          color: 'text-info-400',
          bg: 'bg-info-950/20',
          border: 'border-info-800',
          badge: 'bg-info-950/50 text-info-400 border-info-800',
          glow: 'shadow-glow-md',
        };
      case Severity.LOW:
        return {
          icon: CheckCircleIcon,
          color: 'text-success-400',
          bg: 'bg-success-950/20',
          border: 'border-success-800',
          badge: 'bg-success-950/50 text-success-400 border-success-800',
          glow: 'shadow-success-glow',
        };
      default:
        return {
          icon: InformationCircleIcon,
          color: 'text-soc-muted',
          bg: 'bg-soc-elevated',
          border: 'border-soc-border',
          badge: 'bg-soc-elevated text-soc-muted border-soc-border',
          glow: '',
        };
    }
  };

  const getStatusConfig = (status: ThreatStatus) => {
    switch (status) {
      case ThreatStatus.ACTIVE:
        return {
          color: 'text-critical-400',
          bg: 'bg-critical-950/30',
          label: 'Active',
          icon: ShieldExclamationIcon,
        };
      case ThreatStatus.CONTAINED:
        return {
          color: 'text-warning-400',
          bg: 'bg-warning-950/30',
          label: 'Contained',
          icon: ShieldCheckIcon,
        };
      case ThreatStatus.MITIGATED:
        return {
          color: 'text-success-400',
          bg: 'bg-success-950/30',
          label: 'Mitigated',
          icon: CheckCircleIcon,
        };
      case ThreatStatus.MONITORING:
        return {
          color: 'text-info-400',
          bg: 'bg-info-950/30',
          label: 'Monitoring',
          icon: EyeIcon,
        };
      default:
        return {
          color: 'text-soc-muted',
          bg: 'bg-soc-elevated',
          label: status,
          icon: InformationCircleIcon,
        };
    }
  };

  const getThreatTypeIcon = (type: ThreatType) => {
    // Return appropriate icon based on threat type
    switch (type) {
      case ThreatType.MALWARE:
      case ThreatType.RANSOMWARE:
        return ShieldExclamationIcon;
      default:
        return ExclamationTriangleIcon;
    }
  };

  const severityConfig = getSeverityConfig(threat.severity);
  const statusConfig = getStatusConfig(threat.status);
  const SeverityIcon = severityConfig.icon;
  const StatusIcon = statusConfig.icon;
  const ThreatIcon = getThreatTypeIcon(threat.type);

  const detectedAt = parseISO(threat.detectedAt);
  const lastSeenAt = parseISO(threat.lastSeenAt);

  const handleStatusChange = (newStatus: ThreatStatus) => {
    if (newStatus !== threat.status) {
      onStatusUpdate(threat.id, newStatus);
    }
  };

  return (
    <div
      className={clsx(
        'soc-card transition-all duration-200 cursor-pointer',
        severityConfig.border,
        severityConfig.bg,
        isSelected ? 'ring-2 ring-security-500' : 'hover:border-security-700',
        threat.severity === Severity.CRITICAL && 'hover:' + severityConfig.glow
      )}
      onClick={() => onSelect?.(threat)}
    >
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1 min-w-0">
            {/* Threat Icon */}
            <div className={clsx('mt-1', severityConfig.color)}>
              <ThreatIcon className="w-6 h-6" />
            </div>
            
            {/* Threat Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <h4 className="text-white font-semibold truncate">
                  {threat.name}
                </h4>
                <span className={clsx(
                  'inline-flex items-center px-2 py-1 rounded text-xs font-medium border',
                  severityConfig.badge
                )}>
                  {threat.severity}
                </span>
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-soc-elevated text-soc-muted border border-soc-border">
                  {threat.type.replace('_', ' ')}
                </span>
              </div>
              
              <p className="text-sm text-soc-muted mb-3 line-clamp-2">
                {threat.description}
              </p>
              
              <div className="grid grid-cols-2 gap-4 text-xs text-soc-muted">
                <div>
                  <span className="font-medium">Detected:</span> {format(detectedAt, 'MMM dd, HH:mm')}
                </div>
                <div>
                  <span className="font-medium">Last Seen:</span> {format(lastSeenAt, 'MMM dd, HH:mm')}
                </div>
                <div>
                  <span className="font-medium">Source:</span> {threat.source}
                </div>
                <div>
                  <span className="font-medium">Assets:</span> {threat.affectedAssets.length}
                </div>
              </div>
            </div>
          </div>
          
          {/* Status & Actions */}
          <div className="flex items-center space-x-2 ml-4">
            {/* Status Badge */}
            <span className={clsx(
              'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium',
              statusConfig.color,
              statusConfig.bg
            )}>
              <StatusIcon className="w-3 h-3 mr-1" />
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
            {/* Threat Indicators */}
            {threat.indicators.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-white mb-2">Threat Indicators</h5>
                <div className="space-y-2">
                  {threat.indicators.map((indicator, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-soc-elevated rounded text-xs"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-white">{indicator.type}:</span>
                        <code className="text-security-400 font-mono">{indicator.value}</code>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className={clsx(
                          'w-2 h-2 rounded-full',
                          indicator.confidence >= 0.8 ? 'bg-critical-500' :
                          indicator.confidence >= 0.6 ? 'bg-warning-500' :
                          indicator.confidence >= 0.4 ? 'bg-info-500' : 'bg-soc-muted'
                        )}></div>
                        <span className="text-soc-muted">{Math.round(indicator.confidence * 100)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Affected Assets */}
            {threat.affectedAssets.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-white mb-2">
                  Affected Assets ({threat.affectedAssets.length})
                </h5>
                <div className="flex flex-wrap gap-2">
                  {threat.affectedAssets.slice(0, 10).map((assetId, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded text-xs bg-soc-elevated text-white border border-soc-border"
                    >
                      {assetId}
                    </span>
                  ))}
                  {threat.affectedAssets.length > 10 && (
                    <span className="text-xs text-soc-muted">
                      +{threat.affectedAssets.length - 10} more
                    </span>
                  )}
                </div>
              </div>
            )}
            
            {/* Mitigation Steps */}
            {threat.mitigationSteps.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-white mb-2">Mitigation Steps</h5>
                <ol className="space-y-1 text-sm text-soc-muted">
                  {threat.mitigationSteps.map((step, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-security-400 font-medium mt-1">
                        {index + 1}.
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            
            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-soc-border">
              <div className="text-xs text-soc-muted">
                Threat ID: {threat.id}
              </div>
              
              {/* Status Update Actions */}
              <div className="flex items-center space-x-2">
                {threat.status !== ThreatStatus.CONTAINED && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusChange(ThreatStatus.CONTAINED);
                    }}
                    disabled={isUpdating}
                    className="px-3 py-1 text-xs bg-warning-950/30 text-warning-400 border border-warning-800 rounded hover:bg-warning-950/50 disabled:opacity-50"
                  >
                    Contain
                  </button>
                )}
                
                {threat.status !== ThreatStatus.MITIGATED && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusChange(ThreatStatus.MITIGATED);
                    }}
                    disabled={isUpdating}
                    className="px-3 py-1 text-xs bg-success-950/30 text-success-400 border border-success-800 rounded hover:bg-success-950/50 disabled:opacity-50"
                  >
                    Mitigate
                  </button>
                )}
                
                {threat.status !== ThreatStatus.MONITORING && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusChange(ThreatStatus.MONITORING);
                    }}
                    disabled={isUpdating}
                    className="px-3 py-1 text-xs bg-info-950/30 text-info-400 border border-info-800 rounded hover:bg-info-950/50 disabled:opacity-50"
                  >
                    Monitor
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

export default ThreatCard;
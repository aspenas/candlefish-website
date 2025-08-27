import React from 'react';
import { formatDistance } from 'date-fns';
import { 
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { ActivitySummary, Severity } from '../../types/security';

interface RecentActivityFeedProps {
  activities: ActivitySummary[];
  maxItems?: number;
}

const RecentActivityFeed: React.FC<RecentActivityFeedProps> = ({ 
  activities, 
  maxItems = 10 
}) => {
  const getSeverityIcon = (severity: Severity) => {
    switch (severity) {
      case Severity.CRITICAL:
        return ShieldExclamationIcon;
      case Severity.HIGH:
        return ExclamationTriangleIcon;
      case Severity.MEDIUM:
        return InformationCircleIcon;
      case Severity.LOW:
        return CheckCircleIcon;
      default:
        return ClockIcon;
    }
  };

  const getSeverityStyles = (severity: Severity) => {
    switch (severity) {
      case Severity.CRITICAL:
        return {
          icon: 'text-critical-400 bg-critical-950/20',
          dot: 'bg-critical-500',
          border: 'border-critical-800/30',
        };
      case Severity.HIGH:
        return {
          icon: 'text-warning-400 bg-warning-950/20',
          dot: 'bg-warning-500',
          border: 'border-warning-800/30',
        };
      case Severity.MEDIUM:
        return {
          icon: 'text-info-400 bg-info-950/20',
          dot: 'bg-info-500',
          border: 'border-info-800/30',
        };
      case Severity.LOW:
        return {
          icon: 'text-success-400 bg-success-950/20',
          dot: 'bg-success-500',
          border: 'border-success-800/30',
        };
      default:
        return {
          icon: 'text-soc-muted bg-soc-elevated',
          dot: 'bg-soc-muted',
          border: 'border-soc-border',
        };
    }
  };

  const displayedActivities = activities.slice(0, maxItems);

  return (
    <div className="space-y-3">
      {displayedActivities.length === 0 ? (
        <div className="text-center py-8">
          <ClockIcon className="w-12 h-12 text-soc-muted mx-auto mb-3" />
          <p className="text-soc-muted">No recent activity</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-soc-border"></div>
          
          {displayedActivities.map((activity, index) => {
            const Icon = getSeverityIcon(activity.severity);
            const styles = getSeverityStyles(activity.severity);
            const timestamp = new Date(activity.timestamp);
            const timeAgo = formatDistance(timestamp, new Date(), { addSuffix: true });
            
            return (
              <div key={activity.id} className="relative flex items-start space-x-3 pb-4">
                {/* Timeline dot */}
                <div className="relative flex-shrink-0">
                  <div className={clsx(
                    'w-12 h-12 rounded-full border-2 flex items-center justify-center',
                    styles.icon,
                    styles.border
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                  {/* Connecting dot */}
                  {index < displayedActivities.length - 1 && (
                    <div className={clsx(
                      'absolute top-12 left-1/2 transform -translate-x-1/2 w-2 h-2 rounded-full',
                      styles.dot
                    )}></div>
                  )}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0 bg-soc-elevated rounded-lg p-3 border border-soc-border hover:border-security-700 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className={clsx(
                      'text-xs font-medium uppercase tracking-wider',
                      styles.icon.split(' ')[0] // Get just the color class
                    )}>
                      {activity.type.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-soc-muted">
                      {timeAgo}
                    </span>
                  </div>
                  
                  <p className="text-sm text-white leading-snug mb-2">
                    {activity.description}
                  </p>
                  
                  {/* Severity badge */}
                  <div className="flex items-center justify-between">
                    <span className={clsx(
                      'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                      styles.icon
                    )}>
                      {activity.severity}
                    </span>
                    
                    <span className="text-xs text-soc-muted">
                      {timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Show more indicator */}
      {activities.length > maxItems && (
        <div className="text-center pt-3 border-t border-soc-border">
          <button className="text-sm text-security-400 hover:text-security-300 transition-colors">
            View {activities.length - maxItems} more activities
          </button>
        </div>
      )}
    </div>
  );
};

export default RecentActivityFeed;
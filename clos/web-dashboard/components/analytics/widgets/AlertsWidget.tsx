'use client';

import React, { useMemo, useState } from 'react';
import { useAnalyticsStore } from '../../../stores/analyticsStore';
import { 
  AlertTriangle,
  Info,
  AlertCircle,
  XCircle,
  Check,
  Eye,
  MoreVertical,
  Clock,
  Filter
} from 'lucide-react';
import { getAlertTypeColor } from '../../../lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface AlertsWidgetProps {
  config?: {
    limit?: number;
    showFilters?: boolean;
    compactView?: boolean;
  };
}

const AlertsWidget: React.FC<AlertsWidgetProps> = ({
  config = {
    limit: 10,
    showFilters: true,
    compactView: false,
  },
}) => {
  const {
    alerts,
    alertsFilter,
    isLoading,
    acknowledgeAlert,
    resolveAlert,
    setAlertsFilter,
  } = useAnalyticsStore();

  const [selectedAlert, setSelectedAlert] = useState<string | null>(null);
  const [showActions, setShowActions] = useState<string | null>(null);

  // Filter and sort alerts
  const filteredAlerts = useMemo(() => {
    let filtered = [...alerts];

    // Apply filters
    if (alertsFilter === 'unacknowledged') {
      filtered = filtered.filter(alert => !alert.acknowledged);
    } else if (alertsFilter === 'critical') {
      filtered = filtered.filter(alert => alert.type === 'critical');
    }

    // Sort by timestamp (newest first) and priority
    filtered.sort((a, b) => {
      const priorityOrder = { critical: 4, error: 3, warning: 2, info: 1 };
      const aPriority = priorityOrder[a.type] || 0;
      const bPriority = priorityOrder[b.type] || 0;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    // Limit results
    return filtered.slice(0, config.limit);
  }, [alerts, alertsFilter, config.limit]);

  const alertStats = useMemo(() => {
    const stats = {
      total: alerts.length,
      unacknowledged: alerts.filter(a => !a.acknowledged).length,
      critical: alerts.filter(a => a.type === 'critical').length,
      resolved: alerts.filter(a => a.resolved).length,
    };
    return stats;
  }, [alerts]);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'info':
        return <Info className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      case 'critical':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      await acknowledgeAlert(alertId);
      setShowActions(null);
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const handleResolve = async (alertId: string) => {
    try {
      await resolveAlert(alertId);
      setShowActions(null);
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  const filterOptions = [
    { value: 'all', label: 'All', count: alertStats.total },
    { value: 'unacknowledged', label: 'Unacknowledged', count: alertStats.unacknowledged },
    { value: 'critical', label: 'Critical', count: alertStats.critical },
  ];

  if (isLoading && !alerts.length) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-gray-500">Loading alerts...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Alerts</h3>
          {alertStats.unacknowledged > 0 && (
            <div className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
              {alertStats.unacknowledged} unacknowledged
            </div>
          )}
        </div>
        
        {config.showFilters && (
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={alertsFilter}
              onChange={(e) => setAlertsFilter(e.target.value as any)}
              className="px-2 py-1 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {filterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} ({option.count})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <div className="text-lg font-semibold text-gray-900">{alertStats.total}</div>
          <div className="text-xs text-gray-600">Total</div>
        </div>
        <div className="text-center p-2 bg-orange-50 rounded-lg">
          <div className="text-lg font-semibold text-orange-900">{alertStats.unacknowledged}</div>
          <div className="text-xs text-orange-700">Unacked</div>
        </div>
        <div className="text-center p-2 bg-red-50 rounded-lg">
          <div className="text-lg font-semibold text-red-900">{alertStats.critical}</div>
          <div className="text-xs text-red-700">Critical</div>
        </div>
        <div className="text-center p-2 bg-green-50 rounded-lg">
          <div className="text-lg font-semibold text-green-900">{alertStats.resolved}</div>
          <div className="text-xs text-green-700">Resolved</div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">No alerts to display</p>
            <p className="text-sm text-gray-400">
              {alertsFilter === 'all' ? 'Your system is running smoothly!' : 
               alertsFilter === 'unacknowledged' ? 'All alerts have been acknowledged' :
               'No critical alerts at this time'}
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`relative bg-white border rounded-lg p-3 transition-all duration-200 hover:shadow-md ${
                alert.acknowledged ? 'border-gray-200 opacity-75' : 
                alert.type === 'critical' ? 'border-red-300 bg-red-50' :
                alert.type === 'error' ? 'border-orange-300 bg-orange-50' :
                alert.type === 'warning' ? 'border-yellow-300 bg-yellow-50' :
                'border-blue-300 bg-blue-50'
              }`}
              onClick={() => setSelectedAlert(selectedAlert === alert.id ? null : alert.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  {/* Alert Icon & Type */}
                  <div className={`p-1 rounded-full ${getAlertTypeColor(alert.type)}`}>
                    {getAlertIcon(alert.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Alert Title & Source */}
                    <div className="flex items-center justify-between">
                      <h4 className={`text-sm font-semibold ${
                        alert.acknowledged ? 'text-gray-600' : 'text-gray-900'
                      }`}>
                        {alert.title}
                      </h4>
                      <span className="text-xs text-gray-500">{alert.source}</span>
                    </div>

                    {/* Alert Message */}
                    <p className={`text-sm mt-1 ${
                      alert.acknowledged ? 'text-gray-500' : 'text-gray-700'
                    }`}>
                      {config.compactView && alert.message.length > 100
                        ? `${alert.message.substring(0, 100)}...`
                        : alert.message
                      }
                    </p>

                    {/* Alert Metadata */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center space-x-3 text-xs text-gray-500">
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                        </div>
                        
                        {alert.acknowledged && (
                          <div className="flex items-center text-green-600">
                            <Check className="h-3 w-3 mr-1" />
                            Acknowledged
                          </div>
                        )}
                        
                        {alert.resolved && (
                          <div className="flex items-center text-blue-600">
                            <Eye className="h-3 w-3 mr-1" />
                            Resolved
                          </div>
                        )}
                      </div>

                      {/* Action Menu */}
                      {!alert.resolved && (
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowActions(showActions === alert.id ? null : alert.id);
                            }}
                            className="p-1 rounded-md hover:bg-gray-200 transition-colors"
                          >
                            <MoreVertical className="h-4 w-4 text-gray-500" />
                          </button>

                          {showActions === alert.id && (
                            <div className="absolute right-0 mt-1 w-36 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                              <div className="py-1">
                                {!alert.acknowledged && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAcknowledge(alert.id);
                                    }}
                                    className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  >
                                    <Check className="h-4 w-4 mr-2" />
                                    Acknowledge
                                  </button>
                                )}
                                
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleResolve(alert.id);
                                  }}
                                  className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Mark Resolved
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Expanded Details */}
                    {selectedAlert === alert.id && !config.compactView && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="text-xs text-gray-600 space-y-1">
                          <div><strong>Alert ID:</strong> {alert.id}</div>
                          <div><strong>Source:</strong> {alert.source}</div>
                          <div><strong>Type:</strong> {alert.type.toUpperCase()}</div>
                          <div><strong>Created:</strong> {new Date(alert.timestamp).toLocaleString()}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Load More / Pagination */}
      {alerts.length > config.limit! && (
        <div className="text-center pt-2 border-t border-gray-200">
          <button className="text-sm text-blue-600 hover:text-blue-700">
            View all alerts ({alerts.length})
          </button>
        </div>
      )}

      {/* Click outside handler for action menus */}
      {showActions && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowActions(null)}
        />
      )}
    </div>
  );
};

export default AlertsWidget;
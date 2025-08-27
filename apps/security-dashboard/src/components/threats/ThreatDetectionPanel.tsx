import React, { useState, useMemo } from 'react';
import {
  ShieldExclamationIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { useThreats, useUpdateThreatStatus } from '../../hooks/useApi';
import { useDashboardStore } from '../../store/dashboardStore';
import { useNotificationStore } from '../../store/notificationStore';
import { Threat, ThreatType, ThreatStatus, Severity } from '../../types/security';
import ThreatCard from './ThreatCard';
import ThreatSeverityChart from './ThreatSeverityChart';
import ThreatTypeDistribution from './ThreatTypeDistribution';
import LoadingSpinner from '../ui/LoadingSpinner';
import ErrorMessage from '../ui/ErrorMessage';
import clsx from 'clsx';

interface ThreatDetectionPanelProps {
  showCharts?: boolean;
  maxThreats?: number;
}

const ThreatDetectionPanel: React.FC<ThreatDetectionPanelProps> = ({
  showCharts = true,
  maxThreats = 50,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedThreat, setSelectedThreat] = useState<Threat | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'chart'>('list');
  const [page, setPage] = useState(1);
  const limit = 20;

  const { threatFilter, setThreatFilter } = useDashboardStore();
  const { addNotification } = useNotificationStore();

  // Fetch threats with filters
  const {
    data: threatsResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useThreats(threatFilter, page, limit);

  // Mutation for updating threat status
  const updateThreatStatusMutation = useUpdateThreatStatus({
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: 'Threat Updated',
        message: 'Threat status updated successfully',
      });
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'Update Failed',
        message: error.message || 'Failed to update threat status',
      });
    },
  });

  // Filter threats based on search query
  const filteredThreats = useMemo(() => {
    if (!threatsResponse?.data?.items) return [];
    
    let threats = threatsResponse.data.items;
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      threats = threats.filter(threat => 
        threat.name.toLowerCase().includes(query) ||
        threat.description.toLowerCase().includes(query) ||
        threat.type.toLowerCase().includes(query) ||
        threat.source.toLowerCase().includes(query)
      );
    }
    
    // Limit results if specified
    if (maxThreats && threats.length > maxThreats) {
      threats = threats.slice(0, maxThreats);
    }
    
    return threats;
  }, [threatsResponse?.data?.items, searchQuery, maxThreats]);

  // Analytics data
  const threatAnalytics = useMemo(() => {
    if (!filteredThreats.length) return null;

    const severityCount = filteredThreats.reduce((acc, threat) => {
      acc[threat.severity] = (acc[threat.severity] || 0) + 1;
      return acc;
    }, {} as Record<Severity, number>);

    const typeCount = filteredThreats.reduce((acc, threat) => {
      acc[threat.type] = (acc[threat.type] || 0) + 1;
      return acc;
    }, {} as Record<ThreatType, number>);

    const statusCount = filteredThreats.reduce((acc, threat) => {
      acc[threat.status] = (acc[threat.status] || 0) + 1;
      return acc;
    }, {} as Record<ThreatStatus, number>);

    return {
      severityCount,
      typeCount,
      statusCount,
      total: filteredThreats.length,
      critical: severityCount[Severity.CRITICAL] || 0,
      active: statusCount[ThreatStatus.ACTIVE] || 0,
    };
  }, [filteredThreats]);

  const handleThreatStatusUpdate = async (threatId: string, status: ThreatStatus) => {
    await updateThreatStatusMutation.mutateAsync({
      threatId,
      status,
    });
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setPage(1);
  };

  const getSeverityColor = (severity: Severity) => {
    switch (severity) {
      case Severity.CRITICAL:
        return 'text-critical-400';
      case Severity.HIGH:
        return 'text-warning-400';
      case Severity.MEDIUM:
        return 'text-info-400';
      case Severity.LOW:
        return 'text-success-400';
      default:
        return 'text-soc-muted';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Loading threat detection data..." />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorMessage
        title="Failed to load threat detection data"
        message={error?.message || 'Unknown error occurred'}
        onRetry={() => refetch()}
      />
    );
  }

  const totalThreats = threatsResponse?.data?.total || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Threat Detection</h2>
          <p className="text-soc-muted mt-1">
            {totalThreats} threats detected
            {searchQuery && ` matching "${searchQuery}"`}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-soc-muted" />
            <input
              type="text"
              placeholder="Search threats..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="soc-input pl-10 w-64"
            />
          </div>
          
          {/* View Toggle */}
          {showCharts && (
            <div className="flex items-center space-x-1 bg-soc-elevated rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={clsx(
                  'px-3 py-1 text-sm rounded transition-colors',
                  viewMode === 'list'
                    ? 'bg-security-600 text-white'
                    : 'text-soc-muted hover:text-white'
                )}
              >
                List
              </button>
              <button
                onClick={() => setViewMode('chart')}
                className={clsx(
                  'px-3 py-1 text-sm rounded transition-colors',
                  viewMode === 'chart'
                    ? 'bg-security-600 text-white'
                    : 'text-soc-muted hover:text-white'
                )}
              >
                Charts
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      {threatAnalytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="soc-card p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-critical-950/20 rounded-lg">
                <ShieldExclamationIcon className="w-6 h-6 text-critical-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {threatAnalytics.critical}
                </div>
                <div className="text-sm text-critical-400">Critical Threats</div>
              </div>
            </div>
          </div>
          
          <div className="soc-card p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-warning-950/20 rounded-lg">
                <ExclamationTriangleIcon className="w-6 h-6 text-warning-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {threatAnalytics.active}
                </div>
                <div className="text-sm text-warning-400">Active Threats</div>
              </div>
            </div>
          </div>
          
          <div className="soc-card p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-info-950/20 rounded-lg">
                <ChartBarIcon className="w-6 h-6 text-info-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {Object.keys(threatAnalytics.typeCount).length}
                </div>
                <div className="text-sm text-info-400">Threat Types</div>
              </div>
            </div>
          </div>
          
          <div className="soc-card p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-success-950/20 rounded-lg">
                <ShieldExclamationIcon className="w-6 h-6 text-success-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {threatAnalytics.total}
                </div>
                <div className="text-sm text-success-400">Total Threats</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {viewMode === 'chart' && showCharts && threatAnalytics ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Severity Distribution */}
          <div className="soc-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Threat Severity Distribution
            </h3>
            <ThreatSeverityChart data={threatAnalytics.severityCount} />
          </div>
          
          {/* Type Distribution */}
          <div className="soc-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Threat Type Distribution
            </h3>
            <ThreatTypeDistribution data={threatAnalytics.typeCount} />
          </div>
        </div>
      ) : (
        /* Threat List */
        <div className="space-y-4">
          {filteredThreats.length === 0 ? (
            <div className="soc-card p-12 text-center">
              <ShieldExclamationIcon className="w-16 h-16 text-soc-muted mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Threats Found</h3>
              <p className="text-soc-muted">
                {searchQuery ? 'Try adjusting your search query' : 'No threats match the current filters'}
              </p>
            </div>
          ) : (
            filteredThreats.map((threat) => (
              <ThreatCard
                key={threat.id}
                threat={threat}
                onStatusUpdate={handleThreatStatusUpdate}
                onSelect={setSelectedThreat}
                isSelected={selectedThreat?.id === threat.id}
                isUpdating={updateThreatStatusMutation.isPending}
              />
            ))
          )}
        </div>
      )}

      {/* Quick Stats Footer */}
      {threatAnalytics && (
        <div className="soc-card p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-soc-muted">
              Threat Detection Summary
            </div>
            
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-critical-500 rounded-full"></div>
                <span className="text-critical-400">
                  Critical: {threatAnalytics.severityCount[Severity.CRITICAL] || 0}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-warning-500 rounded-full"></div>
                <span className="text-warning-400">
                  High: {threatAnalytics.severityCount[Severity.HIGH] || 0}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-info-500 rounded-full"></div>
                <span className="text-info-400">
                  Medium: {threatAnalytics.severityCount[Severity.MEDIUM] || 0}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-success-500 rounded-full"></div>
                <span className="text-success-400">
                  Low: {threatAnalytics.severityCount[Severity.LOW] || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThreatDetectionPanel;
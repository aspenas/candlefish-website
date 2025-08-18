import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useSubscription } from '@apollo/client';
import { Activity, AlertTriangle, CheckCircle, Clock, Play, Pause, RotateCcw, Settings, TrendingUp, Wifi, WifiOff } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { GET_INTEGRATIONS, GET_HEALTH_CHECKS, TEST_INTEGRATION, TRIGGER_SYNC, INTEGRATION_STATUS_UPDATED } from '@/graphql/integrations';
import { formatDateTime, formatRelativeTime, formatDuration } from '@/utils/formatting';
import type { Integration, HealthStatus, IntegrationType } from '@/types/graphql';
import toast from 'react-hot-toast';

interface IntegrationDashboardProps {
  className?: string;
}

const IntegrationDashboard: React.FC<IntegrationDashboardProps> = ({ className }) => {
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);

  // Query integrations and health checks
  const { data: integrationsData, loading: integrationsLoading, error: integrationsError, refetch: refetchIntegrations } = useQuery(GET_INTEGRATIONS);
  const { data: healthData, loading: healthLoading, refetch: refetchHealth } = useQuery(GET_HEALTH_CHECKS);

  // Subscribe to integration status updates
  useSubscription(INTEGRATION_STATUS_UPDATED, {
    variables: selectedIntegration ? { id: selectedIntegration } : undefined,
    skip: !selectedIntegration,
    onData: ({ data }) => {
      const updatedIntegration = data?.data?.integrationStatusUpdated;
      if (updatedIntegration) {
        refetchIntegrations();
        toast.success(`${updatedIntegration.name} status updated`);
      }
    },
  });

  const [testIntegration, { loading: testingIntegration }] = useMutation(TEST_INTEGRATION, {
    onCompleted: (data) => {
      if (data.testIntegration.success) {
        toast.success(`Integration test passed (${data.testIntegration.responseTime}ms)`);
      } else {
        toast.error(`Integration test failed: ${data.testIntegration.message}`);
      }
      refetchIntegrations();
    },
    onError: (error) => {
      toast.error('Failed to test integration');
      console.error('Test integration error:', error);
    },
  });

  const [triggerSync, { loading: syncingIntegration }] = useMutation(TRIGGER_SYNC, {
    onCompleted: (data) => {
      if (data.triggerSync.success) {
        toast.success('Sync started successfully');
      } else {
        toast.error(`Failed to start sync: ${data.triggerSync.message}`);
      }
      refetchIntegrations();
    },
    onError: (error) => {
      toast.error('Failed to start sync');
      console.error('Trigger sync error:', error);
    },
  });

  const integrations = integrationsData?.integrations || [];
  const healthChecks = healthData?.healthChecks || [];

  const handleTestIntegration = useCallback((integrationId: string) => {
    testIntegration({ variables: { id: integrationId } });
  }, [testIntegration]);

  const handleTriggerSync = useCallback((integrationType: IntegrationType) => {
    triggerSync({ variables: { integrationType } });
  }, [triggerSync]);

  const getStatusColor = (status: HealthStatus) => {
    switch (status) {
      case 'HEALTHY':
        return 'text-success-600 bg-success-50';
      case 'WARNING':
        return 'text-warning-600 bg-warning-50';
      case 'ERROR':
        return 'text-error-600 bg-error-50';
      case 'OFFLINE':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: HealthStatus) => {
    switch (status) {
      case 'HEALTHY':
        return <CheckCircle className="w-5 h-5" />;
      case 'WARNING':
        return <AlertTriangle className="w-5 h-5" />;
      case 'ERROR':
        return <AlertTriangle className="w-5 h-5" />;
      case 'OFFLINE':
        return <WifiOff className="w-5 h-5" />;
      default:
        return <Activity className="w-5 h-5" />;
    }
  };

  if (integrationsLoading) {
    return (
      <div className={className}>
        <Card>
          <CardContent>
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (integrationsError) {
    return (
      <div className={className}>
        <Card>
          <CardContent>
            <div className="text-center py-12">
              <p className="text-error-600 mb-4">Failed to load integrations</p>
              <Button variant="outline" onClick={() => refetchIntegrations()}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <OverviewCard
          title="Total Integrations"
          value={integrations.length}
          icon={<Activity className="w-6 h-6" />}
          color="blue"
        />
        <OverviewCard
          title="Healthy"
          value={integrations.filter(i => i.status === 'HEALTHY').length}
          icon={<CheckCircle className="w-6 h-6" />}
          color="green"
        />
        <OverviewCard
          title="Warning"
          value={integrations.filter(i => i.status === 'WARNING').length}
          icon={<AlertTriangle className="w-6 h-6" />}
          color="yellow"
        />
        <OverviewCard
          title="Error"
          value={integrations.filter(i => i.status === 'ERROR').length}
          icon={<AlertTriangle className="w-6 h-6" />}
          color="red"
        />
      </div>

      {/* Integrations List */}
      <Card>
        <CardHeader
          title="Integration Status"
          subtitle="Monitor and manage all external integrations"
          actions={
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  refetchIntegrations();
                  refetchHealth();
                }}
                leftIcon={<RotateCcw className="w-4 h-4" />}
              >
                Refresh All
              </Button>
            </div>
          }
        />

        <CardContent>
          {integrations.length === 0 ? (
            <div className="text-center py-12">
              <Wifi className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No integrations configured</p>
            </div>
          ) : (
            <div className="space-y-4">
              {integrations.map((integration) => (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                  onTest={handleTestIntegration}
                  onSync={handleTriggerSync}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                  isSelected={selectedIntegration === integration.id}
                  onSelect={setSelectedIntegration}
                  testingIntegration={testingIntegration}
                  syncingIntegration={syncingIntegration}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Health Checks */}
      {healthChecks.length > 0 && (
        <Card className="mt-8">
          <CardHeader
            title="System Health Checks"
            subtitle="Overall system health and dependencies"
          />
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {healthChecks.map((check, index) => (
                <HealthCheckCard key={index} check={check} getStatusColor={getStatusColor} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Overview Card Component
interface OverviewCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'yellow' | 'red';
}

const OverviewCard: React.FC<OverviewCardProps> = ({ title, value, icon, color }) => {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-success-600 bg-success-50',
    yellow: 'text-warning-600 bg-warning-50',
    red: 'text-error-600 bg-error-50',
  };

  return (
    <Card variant="outlined" padding="md">
      <div className="flex items-center">
        <div className={`p-3 rounded-lg ${colorClasses[color]} mr-4`}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </Card>
  );
};

// Integration Card Component
interface IntegrationCardProps {
  integration: Integration;
  onTest: (id: string) => void;
  onSync: (type: IntegrationType) => void;
  getStatusColor: (status: HealthStatus) => string;
  getStatusIcon: (status: HealthStatus) => React.ReactNode;
  isSelected: boolean;
  onSelect: (id: string | null) => void;
  testingIntegration: boolean;
  syncingIntegration: boolean;
}

const IntegrationCard: React.FC<IntegrationCardProps> = ({
  integration,
  onTest,
  onSync,
  getStatusColor,
  getStatusIcon,
  isSelected,
  onSelect,
  testingIntegration,
  syncingIntegration,
}) => {
  const [showMetrics, setShowMetrics] = useState(false);

  const uptime = integration.metrics.uptime * 100;
  const successRate = integration.metrics.totalRequests > 0
    ? (integration.metrics.successfulRequests / integration.metrics.totalRequests) * 100
    : 0;

  return (
    <Card
      variant="outlined"
      padding="md"
      className={`transition-all ${isSelected ? 'ring-2 ring-primary-500' : 'hover:shadow-medium'}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-3 mb-3">
            <div className={`p-2 rounded-lg ${getStatusColor(integration.status)}`}>
              {getStatusIcon(integration.status)}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{integration.name}</h3>
              <p className="text-sm text-gray-500 capitalize">{integration.type.toLowerCase()}</p>
            </div>
            <Badge variant={integration.status === 'HEALTHY' ? 'success' : integration.status === 'WARNING' ? 'warning' : 'error'}>
              {integration.status.toLowerCase()}
            </Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-500">Uptime</p>
              <p className="text-sm font-medium text-gray-900">{uptime.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Success Rate</p>
              <p className="text-sm font-medium text-gray-900">{successRate.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Avg Response</p>
              <p className="text-sm font-medium text-gray-900">{integration.metrics.averageResponseTime}ms</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Last Check</p>
              <p className="text-sm font-medium text-gray-900">
                {formatRelativeTime(integration.lastHealthCheck)}
              </p>
            </div>
          </div>

          {integration.errorMessage && (
            <div className="mb-4 p-3 bg-error-50 border border-error-200 rounded-lg">
              <p className="text-sm text-error-700">{integration.errorMessage}</p>
            </div>
          )}

          {showMetrics && (
            <div className="border-t border-gray-200 pt-4 mt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Detailed Metrics</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Total Requests:</span>
                  <span className="ml-2 font-medium">{integration.metrics.totalRequests}</span>
                </div>
                <div>
                  <span className="text-gray-500">Successful:</span>
                  <span className="ml-2 font-medium text-success-600">{integration.metrics.successfulRequests}</span>
                </div>
                <div>
                  <span className="text-gray-500">Failed:</span>
                  <span className="ml-2 font-medium text-error-600">{integration.metrics.failedRequests}</span>
                </div>
                <div>
                  <span className="text-gray-500">Sync Interval:</span>
                  <span className="ml-2 font-medium">{formatDuration(integration.config.syncInterval / 3600)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Timeout:</span>
                  <span className="ml-2 font-medium">{integration.config.timeout}s</span>
                </div>
                <div>
                  <span className="text-gray-500">Retry Attempts:</span>
                  <span className="ml-2 font-medium">{integration.config.retryAttempts}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col items-end space-y-2 ml-4">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMetrics(!showMetrics)}
            >
              <TrendingUp className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelect(isSelected ? null : integration.id)}
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onTest(integration.id)}
              loading={testingIntegration}
              leftIcon={<Activity className="w-4 h-4" />}
            >
              Test
            </Button>
            <Button
              size="sm"
              onClick={() => onSync(integration.type)}
              loading={syncingIntegration}
              leftIcon={<Play className="w-4 h-4" />}
            >
              Sync
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

// Health Check Card Component
interface HealthCheckCardProps {
  check: any;
  getStatusColor: (status: HealthStatus) => string;
}

const HealthCheckCard: React.FC<HealthCheckCardProps> = ({ check, getStatusColor }) => {
  return (
    <Card variant="outlined" padding="sm">
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-gray-900">{check.service}</h4>
        <Badge variant={check.status === 'HEALTHY' ? 'success' : check.status === 'WARNING' ? 'warning' : 'error'}>
          {check.status.toLowerCase()}
        </Badge>
      </div>

      <div className="text-sm text-gray-600 space-y-1">
        <div>Response: {check.responseTime}ms</div>
        <div>Last Check: {formatRelativeTime(check.lastCheck)}</div>
        {check.details && <div>Details: {check.details}</div>}
      </div>

      {check.dependencies && check.dependencies.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-2">Dependencies</p>
          <div className="space-y-1">
            {check.dependencies.map((dep: any, index: number) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <span>{dep.name}</span>
                <Badge
                  size="sm"
                  variant={dep.status === 'HEALTHY' ? 'success' : 'error'}
                >
                  {dep.status.toLowerCase()}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default IntegrationDashboard;

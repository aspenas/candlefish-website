import { useQuery } from '@apollo/client';
import { Activity, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { GET_HEALTH_STATUS_QUERY } from '@/lib/graphql/dashboard';
import { formatRelativeTime, formatDuration } from '@/lib/utils';
import { cn } from '@/lib/utils';

const statusIcons = {
  healthy: CheckCircle,
  degraded: AlertCircle,
  unhealthy: XCircle,
  unknown: Clock,
};

const statusColors = {
  healthy: 'text-green-600 dark:text-green-400',
  degraded: 'text-yellow-600 dark:text-yellow-400',
  unhealthy: 'text-red-600 dark:text-red-400',
  unknown: 'text-gray-600 dark:text-gray-400',
};

const statusBadgeColors = {
  healthy: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  degraded: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  unhealthy: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  unknown: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
};

export function SystemHealth() {
  const { data, loading, error } = useQuery(GET_HEALTH_STATUS_QUERY, {
    pollInterval: 15000, // Poll every 15 seconds
    errorPolicy: 'all',
  });

  const health = data?.health;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>System Health</span>
            </CardTitle>
            <CardDescription>
              Real-time status of system components
            </CardDescription>
          </div>
          {health && (
            <Badge
              className={cn('text-xs', statusBadgeColors[health.status.toLowerCase() as keyof typeof statusBadgeColors])}
              variant="outline"
            >
              {health.status}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="sm" text="Checking system health..." />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-muted-foreground">
            <XCircle className="h-8 w-8 mx-auto mb-2 text-red-500" />
            <p>Failed to load system health</p>
            <p className="text-xs mt-1">Unable to connect to health service</p>
          </div>
        ) : !health ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No health data available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Overall Status */}
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card/50">
              <div className="flex items-center space-x-3">
                <div className={cn('p-2 rounded-full bg-muted')}>
                  <Activity className={cn('h-4 w-4', statusColors[health.status.toLowerCase() as keyof typeof statusColors])} />
                </div>
                <div>
                  <p className="font-medium">Overall System</p>
                  <p className="text-sm text-muted-foreground">
                    Uptime: {formatDuration(health.uptime)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{health.status}</p>
                <p className="text-xs text-muted-foreground">
                  v{health.version}
                </p>
              </div>
            </div>

            {/* Service Status */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground mb-3">Services</h4>
              {health.services.map((service: any) => {
                const Icon = statusIcons[service.status.toLowerCase() as keyof typeof statusIcons];
                const colorClass = statusColors[service.status.toLowerCase() as keyof typeof statusColors];

                return (
                  <div
                    key={service.name}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card/30"
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={cn('h-4 w-4', colorClass)} />
                      <div>
                        <p className="text-sm font-medium">{service.name}</p>
                        {service.message && (
                          <p className="text-xs text-muted-foreground">
                            {service.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <Badge
                        className={cn('text-xs', statusBadgeColors[service.status.toLowerCase() as keyof typeof statusBadgeColors])}
                        variant="outline"
                      >
                        {service.status}
                      </Badge>
                      {service.responseTime && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {service.responseTime.toFixed(0)}ms
                        </p>
                      )}
                      {service.lastCheck && (
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeTime(service.lastCheck)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Last Updated */}
            <div className="text-center text-xs text-muted-foreground pt-2 border-t">
              Last updated: {formatRelativeTime(health.timestamp)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

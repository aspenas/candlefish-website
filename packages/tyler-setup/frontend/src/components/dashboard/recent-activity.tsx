import { useQuery, useSubscription } from '@apollo/client';
import { useState } from 'react';
import { Activity, User, Shield, UserCheck, Eye, Clock, Filter } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { GET_AUDIT_LOGS_QUERY, AUDIT_EVENTS_SUBSCRIPTION } from '@/lib/graphql/dashboard';
import { formatRelativeTime, getRiskColor } from '@/lib/utils';
import { cn } from '@/lib/utils';

const actionIcons = {
  LOGIN_SUCCESS: User,
  LOGIN_FAILED: User,
  USER_CREATED: User,
  USER_UPDATED: User,
  CONTRACTOR_INVITED: UserCheck,
  CONTRACTOR_ACCESS: UserCheck,
  SECRET_READ: Shield,
  SECRET_UPDATED: Shield,
  SECRET_ROTATED: Shield,
};

const actionColors = {
  LOGIN_SUCCESS: 'text-green-600',
  LOGIN_FAILED: 'text-red-600',
  USER_CREATED: 'text-blue-600',
  USER_UPDATED: 'text-yellow-600',
  CONTRACTOR_INVITED: 'text-purple-600',
  CONTRACTOR_ACCESS: 'text-purple-600',
  SECRET_READ: 'text-green-600',
  SECRET_UPDATED: 'text-yellow-600',
  SECRET_ROTATED: 'text-blue-600',
};

export function RecentActivity() {
  const [filter, setFilter] = useState<string>('all');

  const { data, loading, error } = useQuery(GET_AUDIT_LOGS_QUERY, {
    variables: {
      pagination: { limit: 10, offset: 0 },
      sort: { field: 'timestamp', direction: 'DESC' },
      filter: filter === 'all' ? undefined : { action: filter },
    },
    pollInterval: 10000, // Poll every 10 seconds
    errorPolicy: 'all',
  });

  // Subscribe to real-time audit events
  useSubscription(AUDIT_EVENTS_SUBSCRIPTION, {
    onData: ({ data: subscriptionData, client }) => {
      if (subscriptionData.data?.auditEvents) {
        // Update the cache with new audit event
        const existingData = client.readQuery({
          query: GET_AUDIT_LOGS_QUERY,
          variables: {
            pagination: { limit: 10, offset: 0 },
            sort: { field: 'timestamp', direction: 'DESC' },
            filter: filter === 'all' ? undefined : { action: filter },
          },
        });

        if (existingData) {
          client.writeQuery({
            query: GET_AUDIT_LOGS_QUERY,
            variables: {
              pagination: { limit: 10, offset: 0 },
              sort: { field: 'timestamp', direction: 'DESC' },
              filter: filter === 'all' ? undefined : { action: filter },
            },
            data: {
              auditLogs: {
                ...existingData.auditLogs,
                logs: [subscriptionData.data.auditEvents, ...existingData.auditLogs.logs.slice(0, 9)],
              },
            },
          });
        }
      }
    },
  });

  const logs = data?.auditLogs?.logs || [];

  const getActionDescription = (log: any) => {
    switch (log.action) {
      case 'LOGIN_SUCCESS':
        return `${log.user?.name || 'Unknown'} logged in`;
      case 'LOGIN_FAILED':
        return `Failed login attempt for ${log.details?.email || 'unknown'}`;
      case 'USER_CREATED':
        return `${log.user?.name || 'System'} created a new user`;
      case 'USER_UPDATED':
        return `${log.user?.name || 'System'} updated user profile`;
      case 'CONTRACTOR_INVITED':
        return `${log.user?.name || 'System'} invited a contractor`;
      case 'CONTRACTOR_ACCESS':
        return `Contractor accessed the system`;
      case 'SECRET_READ':
        return `${log.user?.name || 'System'} accessed secret ${log.resourceId}`;
      case 'SECRET_UPDATED':
        return `${log.user?.name || 'System'} updated secret ${log.resourceId}`;
      case 'SECRET_ROTATED':
        return `Secret ${log.resourceId} was rotated`;
      default:
        return log.action.replace(/_/g, ' ').toLowerCase();
    }
  };

  const filterOptions = [
    { value: 'all', label: 'All Activity' },
    { value: 'LOGIN_SUCCESS', label: 'Logins' },
    { value: 'SECRET_READ', label: 'Secret Access' },
    { value: 'CONTRACTOR_ACCESS', label: 'Contractor Activity' },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Recent Activity</span>
            </CardTitle>
            <CardDescription>Latest system events and user actions</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" className="text-xs">
              <Filter className="h-3 w-3 mr-1" />
              Filter
            </Button>
            <Badge variant="outline" className="text-xs">
              Live
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading && logs.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="sm" text="Loading activity..." />
          </div>
        ) : error && logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Failed to load recent activity</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No recent activity</p>
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log: any) => {
              const Icon = actionIcons[log.action as keyof typeof actionIcons] || Eye;
              const colorClass = actionColors[log.action as keyof typeof actionColors] || 'text-gray-600';

              return (
                <div key={log.id} className="flex items-start space-x-3 p-3 rounded-lg border bg-card/50">
                  <div className={cn('p-2 rounded-full bg-muted', colorClass)}>
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">
                        {getActionDescription(log)}
                      </p>
                      <div className="flex items-center space-x-2">
                        <Badge
                          className={cn('text-xs', getRiskColor(log.riskLevel))}
                          variant="outline"
                        >
                          {log.riskLevel}
                        </Badge>
                        {!log.success && (
                          <Badge variant="destructive" className="text-xs">
                            Failed
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <span>{log.ip}</span>
                        {log.resource && (
                          <>
                            <span>•</span>
                            <span>{log.resource}</span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{formatRelativeTime(log.timestamp)}</span>
                      </div>
                    </div>

                    {log.errorMessage && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        {log.errorMessage}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {logs.length >= 10 && (
              <div className="text-center pt-2">
                <Button variant="ghost" size="sm">
                  View all activity
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

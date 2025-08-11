import { useEffect, useState } from 'react';
import { useQuery, useSubscription } from '@apollo/client';
import {
  Users,
  UserCheck,
  Shield,
  AlertTriangle,
  Activity,
  TrendingUp,
  Clock,
  Eye,
} from 'lucide-react';

import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { MetricCard } from '@/components/dashboard/metric-card';
import { ChartContainer } from '@/components/dashboard/chart-container';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { SecurityAlerts } from '@/components/dashboard/security-alerts';
import { SystemHealth } from '@/components/dashboard/system-health';
import {
  GET_DASHBOARD_ANALYTICS_QUERY,
  DASHBOARD_UPDATED_SUBSCRIPTION,
  SECURITY_ALERT_SUBSCRIPTION,
} from '@/lib/graphql/dashboard';
import { useAuth } from '@/hooks/use-auth';
import { formatNumber, formatPercent } from '@/lib/utils';

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date(),
  });

  // Dashboard analytics query
  const {
    data: analyticsData,
    loading: analyticsLoading,
    error: analyticsError,
  } = useQuery(GET_DASHBOARD_ANALYTICS_QUERY, {
    variables: {
      dateFrom: dateRange.from.toISOString(),
      dateTo: dateRange.to.toISOString(),
    },
    pollInterval: 30000, // Poll every 30 seconds
    errorPolicy: 'all',
  });

  // Real-time dashboard updates subscription
  useSubscription(DASHBOARD_UPDATED_SUBSCRIPTION, {
    onData: ({ data, client }) => {
      if (data.data?.dashboardUpdated) {
        // Update the cache with new data
        client.writeQuery({
          query: GET_DASHBOARD_ANALYTICS_QUERY,
          variables: {
            dateFrom: dateRange.from.toISOString(),
            dateTo: dateRange.to.toISOString(),
          },
          data: {
            dashboardAnalytics: data.data.dashboardUpdated,
          },
        });
      }
    },
  });

  // Security alerts subscription
  const [alerts, setAlerts] = useState<any[]>([]);
  useSubscription(SECURITY_ALERT_SUBSCRIPTION, {
    onData: ({ data }) => {
      if (data.data?.securityAlert) {
        setAlerts(prev => [data.data.securityAlert, ...prev.slice(0, 4)]);
      }
    },
  });

  const analytics = analyticsData?.dashboardAnalytics;

  if (analyticsLoading && !analytics) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" text="Loading dashboard..." />
        </div>
      </MainLayout>
    );
  }

  if (analyticsError && !analytics) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Failed to load dashboard
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {analyticsError.message}
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Welcome back, {user?.name}! Here's your system overview.
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            <Activity className="h-3 w-3 mr-1" />
            Live
          </Badge>
        </div>

        {/* Key Metrics */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Users"
              value={formatNumber(analytics.totalUsers)}
              change={analytics.userGrowth.length > 0 ? analytics.userGrowth[analytics.userGrowth.length - 1].change : 0}
              icon={Users}
              color="blue"
            />

            <MetricCard
              title="Active Contractors"
              value={formatNumber(analytics.activeContractors)}
              subtitle={`${analytics.totalContractors} total`}
              icon={UserCheck}
              color="green"
            />

            <MetricCard
              title="Managed Secrets"
              value={formatNumber(analytics.totalSecrets)}
              subtitle={`${analytics.secretsNeedingRotation} need rotation`}
              icon={Shield}
              color="purple"
            />

            <MetricCard
              title="Audit Events"
              value={formatNumber(analytics.recentAuditEvents)}
              subtitle="Last 24 hours"
              icon={Eye}
              color="orange"
            />
          </div>
        )}

        {/* Charts and Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Growth Chart */}
          {analytics?.userGrowth && (
            <ChartContainer
              title="User Growth"
              description="User registration trend over time"
              data={analytics.userGrowth}
              type="line"
            />
          )}

          {/* Secret Access Chart */}
          {analytics?.secretAccess && (
            <ChartContainer
              title="Secret Access"
              description="Secret read/write operations"
              data={analytics.secretAccess}
              type="bar"
            />
          )}
        </div>

        {/* Recent Activity & Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <RecentActivity />
          </div>

          {/* Security Alerts */}
          <div>
            <SecurityAlerts alerts={[...alerts, ...(analytics?.securityAlerts || [])]} />
          </div>
        </div>

        {/* System Health */}
        {isAdmin() && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SystemHealth />

            {/* Contractor Usage */}
            {analytics?.contractorUsage && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5" />
                    <span>Contractor Usage</span>
                  </CardTitle>
                  <CardDescription>
                    Daily usage patterns and session durations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.contractorUsage.slice(0, 5).map((usage: any, index: number) => (
                      <div key={index} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{usage.period}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatNumber(usage.count)} sessions
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{usage.duration.toFixed(1)}h</p>
                          <p className="text-sm text-muted-foreground">
                            avg duration
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Quick Actions for Non-Admins */}
        {!isAdmin() && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-blue-500" />
                  <span>View Secrets</span>
                </CardTitle>
                <CardDescription>
                  Access your allowed secrets and configurations
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Eye className="h-5 w-5 text-green-500" />
                  <span>Recent Activity</span>
                </CardTitle>
                <CardDescription>
                  View your recent access logs and activities
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-purple-500" />
                  <span>Usage Stats</span>
                </CardTitle>
                <CardDescription>
                  Check your usage patterns and statistics
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

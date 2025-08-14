import { apolloClient } from './apollo';
import { OfflineService } from './offline';
import { Dashboard, Widget, WidgetData } from '@/types/graphql';
import {
  GET_DASHBOARDS_QUERY,
  GET_DASHBOARD_QUERY,
  GET_WIDGET_DATA_QUERY,
  CREATE_DASHBOARD_MUTATION,
  UPDATE_DASHBOARD_MUTATION,
  DELETE_DASHBOARD_MUTATION,
  DUPLICATE_DASHBOARD_MUTATION,
  SHARE_DASHBOARD_MUTATION,
  EXPORT_DASHBOARD_MUTATION,
} from '@/graphql/dashboard';

export class DashboardService {
  static async getDashboards(organizationId: string): Promise<Dashboard[]> {
    try {
      const { data } = await apolloClient.query({
        query: GET_DASHBOARDS_QUERY,
        variables: { organizationId },
        fetchPolicy: 'cache-first',
        notifyOnNetworkStatusChange: true,
      });

      if (data?.dashboards) {
        // Cache dashboards for offline use
        await OfflineService.cacheData({
          key: `dashboards_${organizationId}`,
          data: data.dashboards,
          timestamp: Date.now(),
          expiresAt: Date.now() + (15 * 60 * 1000), // 15 minutes
        });

        return data.dashboards;
      }

      throw new Error('No dashboards data received');
    } catch (error) {
      // Try to get cached data if network fails
      try {
        const cached = await OfflineService.getCachedData(`dashboards_${organizationId}`);
        if (cached) {
          console.log('Using cached dashboards data');
          return cached.data;
        }
      } catch (cacheError) {
        console.error('Failed to get cached dashboards:', cacheError);
      }

      throw new Error(error instanceof Error ? error.message : 'Failed to fetch dashboards');
    }
  }

  static async getDashboard(dashboardId: string): Promise<Dashboard> {
    try {
      const { data } = await apolloClient.query({
        query: GET_DASHBOARD_QUERY,
        variables: { dashboardId },
        fetchPolicy: 'cache-first',
        notifyOnNetworkStatusChange: true,
      });

      if (data?.dashboard) {
        // Cache dashboard for offline use
        await OfflineService.cacheData({
          key: `dashboard_${dashboardId}`,
          data: data.dashboard,
          timestamp: Date.now(),
          expiresAt: Date.now() + (10 * 60 * 1000), // 10 minutes
        });

        return data.dashboard;
      }

      throw new Error('Dashboard not found');
    } catch (error) {
      // Try to get cached data if network fails
      try {
        const cached = await OfflineService.getCachedData(`dashboard_${dashboardId}`);
        if (cached) {
          console.log('Using cached dashboard data');
          return cached.data;
        }
      } catch (cacheError) {
        console.error('Failed to get cached dashboard:', cacheError);
      }

      throw new Error(error instanceof Error ? error.message : 'Failed to fetch dashboard');
    }
  }

  static async getWidgetData(
    widgetId: string,
    filters: Record<string, any> = {}
  ): Promise<WidgetData> {
    try {
      const { data } = await apolloClient.query({
        query: GET_WIDGET_DATA_QUERY,
        variables: { widgetId, filters },
        fetchPolicy: 'cache-and-network',
        notifyOnNetworkStatusChange: true,
      });

      if (data?.widget?.data) {
        // Cache widget data for offline use
        const cacheKey = `widget_${widgetId}_${JSON.stringify(filters)}`;
        await OfflineService.cacheData({
          key: cacheKey,
          data: data.widget.data,
          timestamp: Date.now(),
          expiresAt: Date.now() + (5 * 60 * 1000), // 5 minutes
        });

        return data.widget.data;
      }

      throw new Error('Widget data not found');
    } catch (error) {
      // Try to get cached data if network fails
      try {
        const cacheKey = `widget_${widgetId}_${JSON.stringify(filters)}`;
        const cached = await OfflineService.getCachedData(cacheKey);
        if (cached) {
          console.log('Using cached widget data');
          return cached.data;
        }
      } catch (cacheError) {
        console.error('Failed to get cached widget data:', cacheError);
      }

      throw new Error(error instanceof Error ? error.message : 'Failed to fetch widget data');
    }
  }

  static async createDashboard(
    organizationId: string,
    dashboard: Partial<Dashboard>
  ): Promise<Dashboard> {
    try {
      const { data } = await apolloClient.mutate({
        mutation: CREATE_DASHBOARD_MUTATION,
        variables: { organizationId, input: dashboard },
        update: (cache, { data }) => {
          if (data?.createDashboard) {
            // Update the dashboards query cache
            const cacheData = cache.readQuery({
              query: GET_DASHBOARDS_QUERY,
              variables: { organizationId },
            });

            if (cacheData?.dashboards) {
              cache.writeQuery({
                query: GET_DASHBOARDS_QUERY,
                variables: { organizationId },
                data: {
                  dashboards: [data.createDashboard, ...cacheData.dashboards],
                },
              });
            }
          }
        },
      });

      if (data?.createDashboard) {
        return data.createDashboard;
      }

      throw new Error('Failed to create dashboard');
    } catch (error) {
      // Queue for offline execution if network fails
      await OfflineService.addMutation({
        id: `create_dashboard_${Date.now()}`,
        type: 'CREATE_DASHBOARD',
        variables: { organizationId, input: dashboard },
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
        priority: 'medium',
      });

      throw new Error(error instanceof Error ? error.message : 'Failed to create dashboard');
    }
  }

  static async updateDashboard(
    dashboardId: string,
    updates: Partial<Dashboard>
  ): Promise<Dashboard> {
    try {
      const { data } = await apolloClient.mutate({
        mutation: UPDATE_DASHBOARD_MUTATION,
        variables: { dashboardId, input: updates },
        update: (cache, { data }) => {
          if (data?.updateDashboard) {
            // Update the dashboard query cache
            cache.writeQuery({
              query: GET_DASHBOARD_QUERY,
              variables: { dashboardId },
              data: {
                dashboard: data.updateDashboard,
              },
            });
          }
        },
      });

      if (data?.updateDashboard) {
        return data.updateDashboard;
      }

      throw new Error('Failed to update dashboard');
    } catch (error) {
      // Queue for offline execution if network fails
      await OfflineService.addMutation({
        id: `update_dashboard_${dashboardId}_${Date.now()}`,
        type: 'UPDATE_DASHBOARD',
        variables: { dashboardId, input: updates },
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
        priority: 'medium',
      });

      throw new Error(error instanceof Error ? error.message : 'Failed to update dashboard');
    }
  }

  static async deleteDashboard(dashboardId: string): Promise<void> {
    try {
      const { data } = await apolloClient.mutate({
        mutation: DELETE_DASHBOARD_MUTATION,
        variables: { dashboardId },
        update: (cache) => {
          // Remove dashboard from all relevant queries
          cache.evict({ id: `Dashboard:${dashboardId}` });
          cache.gc();
        },
      });

      if (!data?.deleteDashboard?.success) {
        throw new Error('Failed to delete dashboard');
      }
    } catch (error) {
      // Queue for offline execution if network fails
      await OfflineService.addMutation({
        id: `delete_dashboard_${dashboardId}_${Date.now()}`,
        type: 'DELETE_DASHBOARD',
        variables: { dashboardId },
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
        priority: 'high',
      });

      throw new Error(error instanceof Error ? error.message : 'Failed to delete dashboard');
    }
  }

  static async duplicateDashboard(dashboardId: string, name?: string): Promise<Dashboard> {
    try {
      const { data } = await apolloClient.mutate({
        mutation: DUPLICATE_DASHBOARD_MUTATION,
        variables: { dashboardId, name },
      });

      if (data?.duplicateDashboard) {
        return data.duplicateDashboard;
      }

      throw new Error('Failed to duplicate dashboard');
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to duplicate dashboard');
    }
  }

  static async shareDashboard(
    dashboardId: string,
    shareConfig: {
      users?: string[];
      emails?: string[];
      permission: 'view' | 'edit';
      expiresAt?: string;
    }
  ): Promise<{ shareUrl: string; shareToken: string }> {
    try {
      const { data } = await apolloClient.mutate({
        mutation: SHARE_DASHBOARD_MUTATION,
        variables: { dashboardId, config: shareConfig },
      });

      if (data?.shareDashboard) {
        return data.shareDashboard;
      }

      throw new Error('Failed to share dashboard');
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to share dashboard');
    }
  }

  static async exportDashboard(
    dashboardId: string,
    format: 'PDF' | 'PNG' | 'EXCEL' | 'CSV',
    options: {
      includeFilters?: boolean;
      includeData?: boolean;
      dateRange?: { start: string; end: string };
    } = {}
  ): Promise<{ exportId: string; downloadUrl?: string }> {
    try {
      const { data } = await apolloClient.mutate({
        mutation: EXPORT_DASHBOARD_MUTATION,
        variables: { dashboardId, format, options },
      });

      if (data?.exportDashboard) {
        return data.exportDashboard;
      }

      throw new Error('Failed to export dashboard');
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to export dashboard');
    }
  }

  static async refreshAllWidgets(dashboardId: string): Promise<void> {
    try {
      const dashboard = await this.getDashboard(dashboardId);

      // Refresh all widgets in parallel
      const refreshPromises = dashboard.widgets.map(widget =>
        this.getWidgetData(widget.id, {})
      );

      await Promise.all(refreshPromises);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to refresh widgets');
    }
  }

  static async toggleFavorite(dashboardId: string, isFavorite: boolean): Promise<Dashboard> {
    return this.updateDashboard(dashboardId, { isFavorite });
  }

  static async updateAutoRefresh(
    dashboardId: string,
    autoRefresh: boolean,
    interval?: number
  ): Promise<Dashboard> {
    return this.updateDashboard(dashboardId, {
      autoRefresh,
      refreshInterval: interval
    });
  }
}

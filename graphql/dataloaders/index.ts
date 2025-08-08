import DataLoader from 'dataloader';
import { BatchLoadFn } from 'dataloader';
import {
  User,
  Organization,
  Dashboard,
  Widget,
  DataSource,
  Metric,
  Alert,
  Notification,
  Export,
  ActivityLog,
  AuditLog,
} from '../types/generated';

// Database connection interfaces (would be replaced with actual ORM/client)
interface DatabaseClient {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  queryOne<T = any>(sql: string, params?: any[]): Promise<T | null>;
}

interface CacheClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  mget(keys: string[]): Promise<(string | null)[]>;
  mset(keyValues: Array<[string, string]>, ttl?: number): Promise<void>;
}

// Context interface with tenant isolation
interface DataLoaderContext {
  db: DatabaseClient;
  cache: CacheClient;
  user: {
    id: string;
    organizationId: string;
    role: string;
    permissions: string[];
  };
  requestId: string;
}

// Generic batch loader with caching and tenant isolation
class TenantAwareDataLoader<K, V> extends DataLoader<K, V> {
  constructor(
    batchLoadFn: BatchLoadFn<K, V>,
    private context: DataLoaderContext,
    private options: {
      cacheKeyFn?: (key: K) => string;
      cacheTTL?: number;
      enableCache?: boolean;
    } = {}
  ) {
    super(batchLoadFn, {
      cache: options.enableCache !== false,
      cacheKeyFn: options.cacheKeyFn,
      maxBatchSize: 100,
    });
  }

  // Override load to add tenant-aware caching
  async load(key: K): Promise<V> {
    if (this.options.enableCache !== false) {
      const cacheKey = this.getCacheKey(key);
      const cached = await this.context.cache.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }
    }

    const result = await super.load(key);

    if (this.options.enableCache !== false && result) {
      const cacheKey = this.getCacheKey(key);
      await this.context.cache.set(
        cacheKey,
        JSON.stringify(result),
        this.options.cacheTTL || 300 // 5 minutes default
      );
    }

    return result;
  }

  private getCacheKey(key: K): string {
    const baseKey = this.options.cacheKeyFn ?
      this.options.cacheKeyFn(key) :
      `${key}`;

    // Include organization ID for tenant isolation
    return `${this.context.user.organizationId}:${baseKey}`;
  }
}

// User DataLoaders
export const createUserDataLoaders = (context: DataLoaderContext) => {
  const userByIdLoader = new TenantAwareDataLoader<string, User>(
    async (userIds: readonly string[]) => {
      const users = await context.db.query<User>(
        `SELECT * FROM users
         WHERE id = ANY($1)
         AND (organization_id = $2 OR $3 = ANY(permissions))`,
        [Array.from(userIds), context.user.organizationId, 'SUPER_ADMIN']
      );

      return userIds.map(id => users.find(user => user.id === id) || null);
    },
    context,
    { cacheTTL: 600 } // 10 minutes for user data
  );

  const userByEmailLoader = new TenantAwareDataLoader<string, User>(
    async (emails: readonly string[]) => {
      const users = await context.db.query<User>(
        `SELECT * FROM users
         WHERE email = ANY($1)
         AND organization_id = $2`,
        [Array.from(emails), context.user.organizationId]
      );

      return emails.map(email => users.find(user => user.email === email) || null);
    },
    context,
    {
      cacheKeyFn: (email) => `user:email:${email}`,
      cacheTTL: 300
    }
  );

  return {
    userByIdLoader,
    userByEmailLoader,
  };
};

// Organization DataLoaders
export const createOrganizationDataLoaders = (context: DataLoaderContext) => {
  const organizationByIdLoader = new TenantAwareDataLoader<string, Organization>(
    async (orgIds: readonly string[]) => {
      const organizations = await context.db.query<Organization>(
        `SELECT * FROM organizations
         WHERE id = ANY($1)
         AND (id = $2 OR $3 = ANY($4))`,
        [
          Array.from(orgIds),
          context.user.organizationId,
          'SUPER_ADMIN',
          context.user.permissions
        ]
      );

      return orgIds.map(id => organizations.find(org => org.id === id) || null);
    },
    context,
    { cacheTTL: 900 } // 15 minutes for organization data
  );

  const organizationMembersByOrgIdLoader = new TenantAwareDataLoader<string, User[]>(
    async (orgIds: readonly string[]) => {
      const memberships = await context.db.query<{ organizationId: string; user: User }>(
        `SELECT om.organization_id, u.*
         FROM organization_memberships om
         JOIN users u ON u.id = om.user_id
         WHERE om.organization_id = ANY($1)
         AND om.is_active = true
         AND (om.organization_id = $2 OR $3 = ANY($4))`,
        [
          Array.from(orgIds),
          context.user.organizationId,
          'ORG_ADMIN',
          context.user.permissions
        ]
      );

      const membersByOrg = new Map<string, User[]>();
      memberships.forEach(({ organizationId, user }) => {
        if (!membersByOrg.has(organizationId)) {
          membersByOrg.set(organizationId, []);
        }
        membersByOrg.get(organizationId)!.push(user);
      });

      return orgIds.map(id => membersByOrg.get(id) || []);
    },
    context,
    {
      cacheKeyFn: (orgId) => `org:members:${orgId}`,
      cacheTTL: 300
    }
  );

  return {
    organizationByIdLoader,
    organizationMembersByOrgIdLoader,
  };
};

// Dashboard DataLoaders
export const createDashboardDataLoaders = (context: DataLoaderContext) => {
  const dashboardByIdLoader = new TenantAwareDataLoader<string, Dashboard>(
    async (dashboardIds: readonly string[]) => {
      const dashboards = await context.db.query<Dashboard>(
        `SELECT d.* FROM dashboards d
         WHERE d.id = ANY($1)
         AND d.organization_id = $2
         AND (d.visibility = 'PUBLIC'
              OR d.created_by = $3
              OR EXISTS (
                SELECT 1 FROM dashboard_shares ds
                WHERE ds.dashboard_id = d.id
                AND ds.user_id = $3
                AND ds.expires_at > NOW()
              ))`,
        [Array.from(dashboardIds), context.user.organizationId, context.user.id]
      );

      return dashboardIds.map(id => dashboards.find(d => d.id === id) || null);
    },
    context,
    { cacheTTL: 300 }
  );

  const widgetsByDashboardIdLoader = new TenantAwareDataLoader<string, Widget[]>(
    async (dashboardIds: readonly string[]) => {
      const widgets = await context.db.query<Widget & { dashboardId: string }>(
        `SELECT w.*, w.dashboard_id as "dashboardId"
         FROM widgets w
         JOIN dashboards d ON d.id = w.dashboard_id
         WHERE w.dashboard_id = ANY($1)
         AND d.organization_id = $2
         ORDER BY w.position_y, w.position_x`,
        [Array.from(dashboardIds), context.user.organizationId]
      );

      const widgetsByDashboard = new Map<string, Widget[]>();
      widgets.forEach(widget => {
        if (!widgetsByDashboard.has(widget.dashboardId)) {
          widgetsByDashboard.set(widget.dashboardId, []);
        }
        widgetsByDashboard.get(widget.dashboardId)!.push(widget);
      });

      return dashboardIds.map(id => widgetsByDashboard.get(id) || []);
    },
    context,
    {
      cacheKeyFn: (dashboardId) => `dashboard:widgets:${dashboardId}`,
      cacheTTL: 180
    }
  );

  return {
    dashboardByIdLoader,
    widgetsByDashboardIdLoader,
  };
};

// Widget DataLoaders
export const createWidgetDataLoaders = (context: DataLoaderContext) => {
  const widgetByIdLoader = new TenantAwareDataLoader<string, Widget>(
    async (widgetIds: readonly string[]) => {
      const widgets = await context.db.query<Widget>(
        `SELECT w.* FROM widgets w
         JOIN dashboards d ON d.id = w.dashboard_id
         WHERE w.id = ANY($1)
         AND d.organization_id = $2`,
        [Array.from(widgetIds), context.user.organizationId]
      );

      return widgetIds.map(id => widgets.find(w => w.id === id) || null);
    },
    context,
    { cacheTTL: 300 }
  );

  const widgetDataLoader = new TenantAwareDataLoader<string, any>(
    async (widgetIds: readonly string[]) => {
      // This would typically execute the widget's query against the data source
      const widgets = await context.db.query<Widget & { query: string; dataSourceId: string }>(
        `SELECT w.id, w.query, w.data_source_id as "dataSourceId"
         FROM widgets w
         JOIN dashboards d ON d.id = w.dashboard_id
         WHERE w.id = ANY($1)
         AND d.organization_id = $2`,
        [Array.from(widgetIds), context.user.organizationId]
      );

      // Execute queries in parallel (simplified - would use actual data source connections)
      const results = await Promise.all(
        widgets.map(async (widget) => {
          try {
            // Execute widget query against appropriate data source
            const data = await executeWidgetQuery(widget.query, widget.dataSourceId, context);
            return { id: widget.id, data, error: null };
          } catch (error) {
            return {
              id: widget.id,
              data: null,
              error: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        })
      );

      return widgetIds.map(id => results.find(r => r.id === id)?.data || null);
    },
    context,
    {
      cacheKeyFn: (widgetId) => `widget:data:${widgetId}`,
      cacheTTL: 60, // 1 minute for widget data
      enableCache: false // Widget data should be fresh
    }
  );

  return {
    widgetByIdLoader,
    widgetDataLoader,
  };
};

// DataSource DataLoaders
export const createDataSourceDataLoaders = (context: DataLoaderContext) => {
  const dataSourceByIdLoader = new TenantAwareDataLoader<string, DataSource>(
    async (dataSourceIds: readonly string[]) => {
      const dataSources = await context.db.query<DataSource>(
        `SELECT * FROM data_sources
         WHERE id = ANY($1)
         AND organization_id = $2`,
        [Array.from(dataSourceIds), context.user.organizationId]
      );

      return dataSourceIds.map(id => dataSources.find(ds => ds.id === id) || null);
    },
    context,
    { cacheTTL: 600 }
  );

  const dataSourceTablesByDataSourceIdLoader = new TenantAwareDataLoader<string, any[]>(
    async (dataSourceIds: readonly string[]) => {
      const tables = await context.db.query<{ dataSourceId: string; table: any }>(
        `SELECT ds.id as "dataSourceId", dst.table_data as table
         FROM data_sources ds
         JOIN data_source_tables dst ON dst.data_source_id = ds.id
         WHERE ds.id = ANY($1)
         AND ds.organization_id = $2`,
        [Array.from(dataSourceIds), context.user.organizationId]
      );

      const tablesByDataSource = new Map<string, any[]>();
      tables.forEach(({ dataSourceId, table }) => {
        if (!tablesByDataSource.has(dataSourceId)) {
          tablesByDataSource.set(dataSourceId, []);
        }
        tablesByDataSource.get(dataSourceId)!.push(table);
      });

      return dataSourceIds.map(id => tablesByDataSource.get(id) || []);
    },
    context,
    {
      cacheKeyFn: (dataSourceId) => `datasource:tables:${dataSourceId}`,
      cacheTTL: 1800 // 30 minutes for schema data
    }
  );

  return {
    dataSourceByIdLoader,
    dataSourceTablesByDataSourceIdLoader,
  };
};

// Metric DataLoaders
export const createMetricDataLoaders = (context: DataLoaderContext) => {
  const metricByIdLoader = new TenantAwareDataLoader<string, Metric>(
    async (metricIds: readonly string[]) => {
      const metrics = await context.db.query<Metric>(
        `SELECT m.* FROM metrics m
         JOIN data_sources ds ON ds.id = m.data_source_id
         WHERE m.id = ANY($1)
         AND ds.organization_id = $2`,
        [Array.from(metricIds), context.user.organizationId]
      );

      return metricIds.map(id => metrics.find(m => m.id === id) || null);
    },
    context,
    { cacheTTL: 600 }
  );

  const metricsByDataSourceIdLoader = new TenantAwareDataLoader<string, Metric[]>(
    async (dataSourceIds: readonly string[]) => {
      const metrics = await context.db.query<Metric & { dataSourceId: string }>(
        `SELECT m.*, m.data_source_id as "dataSourceId"
         FROM metrics m
         JOIN data_sources ds ON ds.id = m.data_source_id
         WHERE m.data_source_id = ANY($1)
         AND ds.organization_id = $2`,
        [Array.from(dataSourceIds), context.user.organizationId]
      );

      const metricsByDataSource = new Map<string, Metric[]>();
      metrics.forEach(metric => {
        if (!metricsByDataSource.has(metric.dataSourceId)) {
          metricsByDataSource.set(metric.dataSourceId, []);
        }
        metricsByDataSource.get(metric.dataSourceId)!.push(metric);
      });

      return dataSourceIds.map(id => metricsByDataSource.get(id) || []);
    },
    context,
    {
      cacheKeyFn: (dataSourceId) => `datasource:metrics:${dataSourceId}`,
      cacheTTL: 300
    }
  );

  return {
    metricByIdLoader,
    metricsByDataSourceIdLoader,
  };
};

// Alert DataLoaders
export const createAlertDataLoaders = (context: DataLoaderContext) => {
  const alertByIdLoader = new TenantAwareDataLoader<string, Alert>(
    async (alertIds: readonly string[]) => {
      const alerts = await context.db.query<Alert>(
        `SELECT a.* FROM alerts a
         JOIN metrics m ON m.id = a.metric_id
         JOIN data_sources ds ON ds.id = m.data_source_id
         WHERE a.id = ANY($1)
         AND ds.organization_id = $2`,
        [Array.from(alertIds), context.user.organizationId]
      );

      return alertIds.map(id => alerts.find(a => a.id === id) || null);
    },
    context,
    { cacheTTL: 300 }
  );

  const alertsByMetricIdLoader = new TenantAwareDataLoader<string, Alert[]>(
    async (metricIds: readonly string[]) => {
      const alerts = await context.db.query<Alert & { metricId: string }>(
        `SELECT a.*, a.metric_id as "metricId"
         FROM alerts a
         JOIN metrics m ON m.id = a.metric_id
         JOIN data_sources ds ON ds.id = m.data_source_id
         WHERE a.metric_id = ANY($1)
         AND ds.organization_id = $2
         AND a.enabled = true`,
        [Array.from(metricIds), context.user.organizationId]
      );

      const alertsByMetric = new Map<string, Alert[]>();
      alerts.forEach(alert => {
        if (!alertsByMetric.has(alert.metricId)) {
          alertsByMetric.set(alert.metricId, []);
        }
        alertsByMetric.get(alert.metricId)!.push(alert);
      });

      return metricIds.map(id => alertsByMetric.get(id) || []);
    },
    context,
    {
      cacheKeyFn: (metricId) => `metric:alerts:${metricId}`,
      cacheTTL: 300
    }
  );

  return {
    alertByIdLoader,
    alertsByMetricIdLoader,
  };
};

// Notification DataLoaders
export const createNotificationDataLoaders = (context: DataLoaderContext) => {
  const notificationByIdLoader = new TenantAwareDataLoader<string, Notification>(
    async (notificationIds: readonly string[]) => {
      const notifications = await context.db.query<Notification>(
        `SELECT * FROM notifications
         WHERE id = ANY($1)
         AND user_id = $2`,
        [Array.from(notificationIds), context.user.id]
      );

      return notificationIds.map(id => notifications.find(n => n.id === id) || null);
    },
    context,
    { cacheTTL: 60 } // Short TTL for notifications
  );

  const notificationsByUserIdLoader = new TenantAwareDataLoader<string, Notification[]>(
    async (userIds: readonly string[]) => {
      const notifications = await context.db.query<Notification>(
        `SELECT * FROM notifications
         WHERE user_id = ANY($1)
         AND (expires_at IS NULL OR expires_at > NOW())
         ORDER BY created_at DESC
         LIMIT 100`,
        [Array.from(userIds)]
      );

      const notificationsByUser = new Map<string, Notification[]>();
      notifications.forEach(notification => {
        if (!notificationsByUser.has(notification.userId)) {
          notificationsByUser.set(notification.userId, []);
        }
        notificationsByUser.get(notification.userId)!.push(notification);
      });

      return userIds.map(id => notificationsByUser.get(id) || []);
    },
    context,
    {
      cacheKeyFn: (userId) => `user:notifications:${userId}`,
      cacheTTL: 60
    }
  );

  return {
    notificationByIdLoader,
    notificationsByUserIdLoader,
  };
};

// Helper function to execute widget queries (simplified)
async function executeWidgetQuery(
  query: string,
  dataSourceId: string,
  context: DataLoaderContext
): Promise<any> {
  // This is a simplified implementation
  // In practice, you'd:
  // 1. Get the data source connection details
  // 2. Establish connection to the appropriate database
  // 3. Execute the query with proper error handling
  // 4. Transform the results into the expected format

  const result = await context.db.query(
    `SELECT execute_widget_query($1, $2, $3) as data`,
    [query, dataSourceId, context.user.organizationId]
  );

  return result[0]?.data || null;
}

// Main DataLoader factory
export const createDataLoaders = (context: DataLoaderContext) => {
  return {
    ...createUserDataLoaders(context),
    ...createOrganizationDataLoaders(context),
    ...createDashboardDataLoaders(context),
    ...createWidgetDataLoaders(context),
    ...createDataSourceDataLoaders(context),
    ...createMetricDataLoaders(context),
    ...createAlertDataLoaders(context),
    ...createNotificationDataLoaders(context),
  };
};

export type DataLoaders = ReturnType<typeof createDataLoaders>;

import {
  QueryResolvers,
  MutationResolvers,
  SubscriptionResolvers,
  DashboardResolvers,
  WidgetResolvers
} from '../types/generated';
import { AuthContext } from '../types/context';
import {
  ResourceNotFoundError,
  ValidationError,
  UsageLimitError,
  BusinessLogicError
} from '../errors/error-handling';
import { withFilter } from 'graphql-subscriptions';

// Dashboard Query Resolvers
export const dashboardQueries: QueryResolvers = {
  dashboard: async (parent, { id }, context: AuthContext) => {
    const dashboard = await context.dataSources.dashboard.findById(id);

    if (!dashboard) {
      throw new ResourceNotFoundError('Dashboard', id);
    }

    // Check access permissions (handled by authorization middleware)
    // Additional business logic checks can go here

    return dashboard;
  },

  dashboards: async (parent, { filter, sort, pagination }, context: AuthContext) => {
    // Build WHERE clause with tenant isolation
    const whereClause = context.db.buildWhereClause(filter, {
      organizationId: context.user.organizationId,
    });

    // Build ORDER BY clause
    const orderClause = context.db.buildOrderClause(sort);

    // Execute query with pagination
    const result = await context.db.queryWithPagination(
      `SELECT d.* FROM dashboards d ${whereClause} ${orderClause}`,
      pagination
    );

    return {
      edges: result.rows.map(dashboard => ({
        node: dashboard,
        cursor: dashboard.id,
      })),
      pageInfo: result.pageInfo,
      totalCount: result.totalCount,
    };
  },

  myDashboards: async (parent, { filter, sort, pagination }, context: AuthContext) => {
    // Filter to only user's dashboards
    const userFilter = {
      ...filter,
      createdBy: { equals: context.user.id },
    };

    return dashboardQueries.dashboards(parent, {
      filter: userFilter,
      sort,
      pagination
    }, context, null);
  },

  publicDashboards: async (parent, { filter, sort, pagination }, context: AuthContext) => {
    // Filter to only public dashboards
    const publicFilter = {
      ...filter,
      visibility: { equals: 'PUBLIC' },
    };

    const whereClause = context.db.buildWhereClause(publicFilter);
    const orderClause = context.db.buildOrderClause(sort);

    const result = await context.db.queryWithPagination(
      `SELECT d.* FROM dashboards d ${whereClause} ${orderClause}`,
      pagination
    );

    return {
      edges: result.rows.map(dashboard => ({
        node: dashboard,
        cursor: dashboard.id,
      })),
      pageInfo: result.pageInfo,
      totalCount: result.totalCount,
    };
  },

  widget: async (parent, { id }, context: AuthContext) => {
    const widget = await context.dataSources.widget.findById(id);

    if (!widget) {
      throw new ResourceNotFoundError('Widget', id);
    }

    return widget;
  },

  widgets: async (parent, { filter, sort, pagination }, context: AuthContext) => {
    const whereClause = context.db.buildWhereClause(filter, {
      organizationId: context.user.organizationId,
    });

    const orderClause = context.db.buildOrderClause(sort);

    const result = await context.db.queryWithPagination(
      `SELECT w.* FROM widgets w
       JOIN dashboards d ON d.id = w.dashboard_id
       WHERE d.organization_id = $1 ${whereClause} ${orderClause}`,
      pagination,
      [context.user.organizationId]
    );

    return {
      edges: result.rows.map(widget => ({
        node: widget,
        cursor: widget.id,
      })),
      pageInfo: result.pageInfo,
      totalCount: result.totalCount,
    };
  },
};

// Dashboard Mutation Resolvers
export const dashboardMutations: MutationResolvers = {
  createDashboard: async (parent, { input }, context: AuthContext) => {
    // Check usage limits
    const usage = await context.dataSources.organization.getUsage(context.user.organizationId);
    const limits = await context.dataSources.organization.getLimits(context.user.organizationId);

    if (usage.dashboards >= limits.maxDashboards) {
      throw new UsageLimitError('dashboards', usage.dashboards, limits.maxDashboards);
    }

    // Create dashboard
    const dashboardData = {
      ...input,
      organizationId: context.user.organizationId,
      createdBy: context.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const dashboard = await context.dataSources.dashboard.create(dashboardData);

    // Publish subscription event
    context.pubsub.publish('DASHBOARD_UPDATED', {
      dashboardUpdated: {
        dashboard,
        updateType: 'CREATED',
        updatedBy: context.user,
        updatedAt: new Date(),
        changes: dashboardData,
      },
    });

    return dashboard;
  },

  updateDashboard: async (parent, { input }, context: AuthContext) => {
    const { id, ...updateData } = input;

    // Check if dashboard exists and user has access
    const existingDashboard = await context.dataSources.dashboard.findById(id);
    if (!existingDashboard) {
      throw new ResourceNotFoundError('Dashboard', id);
    }

    // Update dashboard
    const updatedDashboard = await context.dataSources.dashboard.update(id, {
      ...updateData,
      updatedBy: context.user.id,
      updatedAt: new Date(),
    });

    // Publish subscription event
    context.pubsub.publish('DASHBOARD_UPDATED', {
      dashboardUpdated: {
        dashboard: updatedDashboard,
        updateType: 'UPDATED',
        updatedBy: context.user,
        updatedAt: new Date(),
        changes: updateData,
      },
    });

    return updatedDashboard;
  },

  cloneDashboard: async (parent, { input }, context: AuthContext) => {
    const { sourceId, name, description, includeData, includeSharing } = input;

    // Get source dashboard
    const sourceDashboard = await context.dataSources.dashboard.findById(sourceId);
    if (!sourceDashboard) {
      throw new ResourceNotFoundError('Dashboard', sourceId);
    }

    // Check usage limits
    const usage = await context.dataSources.organization.getUsage(context.user.organizationId);
    const limits = await context.dataSources.organization.getLimits(context.user.organizationId);

    if (usage.dashboards >= limits.maxDashboards) {
      throw new UsageLimitError('dashboards', usage.dashboards, limits.maxDashboards);
    }

    // Clone dashboard
    const clonedDashboard = await context.dataSources.dashboard.clone({
      sourceDashboard,
      name,
      description,
      includeData,
      includeSharing,
      organizationId: context.user.organizationId,
      createdBy: context.user.id,
    });

    // Publish subscription event
    context.pubsub.publish('DASHBOARD_UPDATED', {
      dashboardUpdated: {
        dashboard: clonedDashboard,
        updateType: 'CLONED',
        updatedBy: context.user,
        updatedAt: new Date(),
        changes: { sourceId, name, description },
      },
    });

    return clonedDashboard;
  },

  deleteDashboard: async (parent, { id }, context: AuthContext) => {
    const dashboard = await context.dataSources.dashboard.findById(id);
    if (!dashboard) {
      throw new ResourceNotFoundError('Dashboard', id);
    }

    // Delete dashboard and all related resources
    await context.dataSources.dashboard.delete(id);

    // Publish subscription event
    context.pubsub.publish('DASHBOARD_DELETED', {
      dashboardDeleted: id,
    });

    return true;
  },

  shareDashboard: async (parent, { input }, context: AuthContext) => {
    const { dashboardId, userIds, emails, permission, expiresAt, message } = input;

    const dashboard = await context.dataSources.dashboard.findById(dashboardId);
    if (!dashboard) {
      throw new ResourceNotFoundError('Dashboard', dashboardId);
    }

    // Create shares for users
    const shares = [];

    if (userIds?.length) {
      for (const userId of userIds) {
        const share = await context.dataSources.dashboardShare.create({
          dashboardId,
          userId,
          permission,
          expiresAt,
          createdBy: context.user.id,
          createdAt: new Date(),
        });
        shares.push(share);
      }
    }

    // Create shares for email invitations
    if (emails?.length) {
      for (const email of emails) {
        const share = await context.dataSources.dashboardShare.createByEmail({
          dashboardId,
          email,
          permission,
          expiresAt,
          message,
          createdBy: context.user.id,
          createdAt: new Date(),
        });
        shares.push(share);
      }
    }

    // Publish subscription event
    context.pubsub.publish('DASHBOARD_SHARED', {
      dashboardShared: {
        dashboardId,
        share: shares[0], // Send first share as representative
        updateType: 'SHARED',
        updatedBy: context.user,
        updatedAt: new Date(),
      },
    });

    return shares[0]; // Return first share
  },

  unshareDashboard: async (parent, { shareId }, context: AuthContext) => {
    const share = await context.dataSources.dashboardShare.findById(shareId);
    if (!share) {
      throw new ResourceNotFoundError('DashboardShare', shareId);
    }

    await context.dataSources.dashboardShare.delete(shareId);

    // Publish subscription event
    context.pubsub.publish('DASHBOARD_SHARED', {
      dashboardShared: {
        dashboardId: share.dashboardId,
        share,
        updateType: 'UNSHARED',
        updatedBy: context.user,
        updatedAt: new Date(),
      },
    });

    return true;
  },

  favoriteDashboard: async (parent, { id }, context: AuthContext) => {
    const dashboard = await context.dataSources.dashboard.addToFavorites(
      id,
      context.user.id
    );
    return dashboard;
  },

  unfavoriteDashboard: async (parent, { id }, context: AuthContext) => {
    const dashboard = await context.dataSources.dashboard.removeFromFavorites(
      id,
      context.user.id
    );
    return dashboard;
  },

  // Widget mutations
  createWidget: async (parent, { input }, context: AuthContext) => {
    const { dashboardId, ...widgetData } = input;

    // Verify dashboard exists and user has access
    const dashboard = await context.dataSources.dashboard.findById(dashboardId);
    if (!dashboard) {
      throw new ResourceNotFoundError('Dashboard', dashboardId);
    }

    // Create widget
    const widget = await context.dataSources.widget.create({
      ...widgetData,
      dashboardId,
      createdBy: context.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Publish subscription event
    context.pubsub.publish('WIDGET_UPDATED', {
      widgetUpdated: {
        widget,
        updateType: 'CREATED',
        updatedBy: context.user,
        updatedAt: new Date(),
        changes: widgetData,
      },
    });

    return widget;
  },

  updateWidget: async (parent, { input }, context: AuthContext) => {
    const { id, ...updateData } = input;

    const existingWidget = await context.dataSources.widget.findById(id);
    if (!existingWidget) {
      throw new ResourceNotFoundError('Widget', id);
    }

    const widget = await context.dataSources.widget.update(id, {
      ...updateData,
      updatedAt: new Date(),
    });

    // Publish subscription event
    context.pubsub.publish('WIDGET_UPDATED', {
      widgetUpdated: {
        widget,
        updateType: 'UPDATED',
        updatedBy: context.user,
        updatedAt: new Date(),
        changes: updateData,
      },
    });

    return widget;
  },

  updateWidgetPosition: async (parent, { input }, context: AuthContext) => {
    const { id, position, size } = input;

    const widget = await context.dataSources.widget.updatePosition(id, {
      position,
      size,
      updatedAt: new Date(),
    });

    // Publish subscription event
    context.pubsub.publish('WIDGET_POSITION_CHANGED', {
      widgetPositionChanged: {
        dashboardId: widget.dashboardId,
        widgets: [{
          id: widget.id,
          position: widget.position,
          size: widget.size,
        }],
        updatedBy: context.user,
        updatedAt: new Date(),
      },
    });

    return widget;
  },

  deleteWidget: async (parent, { id }, context: AuthContext) => {
    const widget = await context.dataSources.widget.findById(id);
    if (!widget) {
      throw new ResourceNotFoundError('Widget', id);
    }

    await context.dataSources.widget.delete(id);

    // Publish subscription event
    context.pubsub.publish('WIDGET_UPDATED', {
      widgetUpdated: {
        widget: { ...widget, id },
        updateType: 'DELETED',
        updatedBy: context.user,
        updatedAt: new Date(),
        changes: {},
      },
    });

    return true;
  },

  refreshWidget: async (parent, { id }, context: AuthContext) => {
    const widget = await context.dataSources.widget.findById(id);
    if (!widget) {
      throw new ResourceNotFoundError('Widget', id);
    }

    // Execute widget query and update data
    const refreshedWidget = await context.dataSources.widget.refresh(id);

    // Publish subscription event
    context.pubsub.publish('WIDGET_DATA_CHANGED', {
      widgetDataChanged: {
        widgetId: id,
        data: refreshedWidget.data,
        updateType: 'REFRESHED',
        updatedAt: new Date(),
        executionTime: refreshedWidget.executionTime,
      },
    });

    return refreshedWidget;
  },

  bulkUpdateWidgetPositions: async (parent, { input }, context: AuthContext) => {
    const { updates } = input;

    const updatedWidgets = [];
    const widgetPositions = [];

    for (const update of updates) {
      const widget = await context.dataSources.widget.updatePosition(
        update.id,
        {
          position: update.position,
          size: update.size,
          updatedAt: new Date(),
        }
      );

      updatedWidgets.push(widget);
      widgetPositions.push({
        id: widget.id,
        position: widget.position,
        size: widget.size,
      });
    }

    // Publish subscription event (assuming all widgets are on same dashboard)
    if (updatedWidgets.length > 0) {
      context.pubsub.publish('WIDGET_POSITION_CHANGED', {
        widgetPositionChanged: {
          dashboardId: updatedWidgets[0].dashboardId,
          widgets: widgetPositions,
          updatedBy: context.user,
          updatedAt: new Date(),
        },
      });
    }

    return updatedWidgets;
  },
};

// Dashboard Field Resolvers
export const dashboardResolvers: DashboardResolvers = {
  widgets: async (dashboard, args, context: AuthContext) => {
    return context.dataLoaders.widgetsByDashboardIdLoader.load(dashboard.id);
  },

  dataSources: async (dashboard, args, context: AuthContext) => {
    // Get unique data source IDs from widgets
    const widgets = await context.dataLoaders.widgetsByDashboardIdLoader.load(dashboard.id);
    const dataSourceIds = [...new Set(widgets.map(w => w.dataSourceId))];

    // Load data sources
    const dataSources = await Promise.all(
      dataSourceIds.map(id => context.dataLoaders.dataSourceByIdLoader.load(id))
    );

    return dataSources.filter(Boolean);
  },

  alerts: async (dashboard, args, context: AuthContext) => {
    // Get alerts for dashboard's metrics
    const widgets = await context.dataLoaders.widgetsByDashboardIdLoader.load(dashboard.id);
    const metricIds = [...new Set(widgets.map(w => w.metricId))];

    const alerts = [];
    for (const metricId of metricIds) {
      const metricAlerts = await context.dataLoaders.alertsByMetricIdLoader.load(metricId);
      alerts.push(...metricAlerts);
    }

    return alerts;
  },

  createdBy: async (dashboard, args, context: AuthContext) => {
    return context.dataLoaders.userByIdLoader.load(dashboard.createdBy);
  },

  updatedBy: async (dashboard, args, context: AuthContext) => {
    if (!dashboard.updatedBy) return null;
    return context.dataLoaders.userByIdLoader.load(dashboard.updatedBy);
  },

  sharedWith: async (dashboard, args, context: AuthContext) => {
    return context.dataSources.dashboardShare.findByDashboardId(dashboard.id);
  },

  exports: async (dashboard, args, context: AuthContext) => {
    return context.dataSources.export.findByDashboardId(dashboard.id);
  },

  snapshots: async (dashboard, args, context: AuthContext) => {
    return context.dataSources.dashboardSnapshot.findByDashboardId(dashboard.id);
  },
};

// Widget Field Resolvers
export const widgetResolvers: WidgetResolvers = {
  metric: async (widget, args, context: AuthContext) => {
    return context.dataLoaders.metricByIdLoader.load(widget.metricId);
  },

  dataSource: async (widget, args, context: AuthContext) => {
    return context.dataLoaders.dataSourceByIdLoader.load(widget.dataSourceId);
  },

  createdBy: async (widget, args, context: AuthContext) => {
    return context.dataLoaders.userByIdLoader.load(widget.createdBy);
  },

  data: async (widget, args, context: AuthContext) => {
    // Use DataLoader for widget data with caching
    return context.dataLoaders.widgetDataLoader.load(widget.id);
  },
};

// Dashboard Subscription Resolvers
export const dashboardSubscriptions: SubscriptionResolvers = {
  dashboardUpdated: {
    subscribe: withFilter(
      (parent, args, context: AuthContext) => {
        return context.pubsub.asyncIterator(['DASHBOARD_UPDATED']);
      },
      (payload, variables, context: AuthContext) => {
        // Filter by dashboard ID and organization
        return (
          payload.dashboardUpdated.dashboard.id === variables.dashboardId &&
          payload.dashboardUpdated.dashboard.organizationId === context.user.organizationId
        );
      }
    ),
  },

  dashboardShared: {
    subscribe: withFilter(
      (parent, args, context: AuthContext) => {
        return context.pubsub.asyncIterator(['DASHBOARD_SHARED']);
      },
      (payload, variables, context: AuthContext) => {
        return payload.dashboardShared.dashboardId === variables.dashboardId;
      }
    ),
  },

  dashboardDeleted: {
    subscribe: withFilter(
      (parent, args, context: AuthContext) => {
        return context.pubsub.asyncIterator(['DASHBOARD_DELETED']);
      },
      (payload, variables, context: AuthContext) => {
        // Only send to users in same organization
        return context.user.organizationId; // Additional filtering would be done in resolver
      }
    ),
  },

  widgetUpdated: {
    subscribe: withFilter(
      (parent, args, context: AuthContext) => {
        return context.pubsub.asyncIterator(['WIDGET_UPDATED']);
      },
      (payload, variables, context: AuthContext) => {
        return payload.widgetUpdated.widget.id === variables.widgetId;
      }
    ),
  },

  widgetDataChanged: {
    subscribe: withFilter(
      (parent, args, context: AuthContext) => {
        return context.pubsub.asyncIterator(['WIDGET_DATA_CHANGED']);
      },
      (payload, variables, context: AuthContext) => {
        return payload.widgetDataChanged.widgetId === variables.widgetId;
      }
    ),
  },

  widgetPositionChanged: {
    subscribe: withFilter(
      (parent, args, context: AuthContext) => {
        return context.pubsub.asyncIterator(['WIDGET_POSITION_CHANGED']);
      },
      (payload, variables, context: AuthContext) => {
        return payload.widgetPositionChanged.dashboardId === variables.dashboardId;
      }
    ),
  },

  userActivity: {
    subscribe: withFilter(
      (parent, args, context: AuthContext) => {
        return context.pubsub.asyncIterator(['USER_ACTIVITY']);
      },
      (payload, variables, context: AuthContext) => {
        return payload.userActivity.dashboardId === variables.dashboardId;
      }
    ),
  },

  dashboardCollaboration: {
    subscribe: withFilter(
      (parent, args, context: AuthContext) => {
        return context.pubsub.asyncIterator(['DASHBOARD_COLLABORATION']);
      },
      (payload, variables, context: AuthContext) => {
        return payload.dashboardCollaboration.dashboardId === variables.dashboardId;
      }
    ),
  },
};

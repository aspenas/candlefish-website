import {
  AuthenticationError,
  ForbiddenError,
  UserInputError
} from '@apollo/server/errors';
import {
  rule,
  shield,
  and,
  or,
  not,
  cache
} from 'graphql-shield';
import { GraphQLResolveInfo } from 'graphql';
import { AuthContext } from '../types/context';

// Role hierarchy for authorization
enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ORG_ADMIN = 'ORG_ADMIN',
  ORG_USER = 'ORG_USER',
  USER = 'USER',
  GUEST = 'GUEST'
}

// Permission constants
enum Permission {
  // User permissions
  USER_READ = 'user:read',
  USER_WRITE = 'user:write',
  USER_DELETE = 'user:delete',
  USER_INVITE = 'user:invite',
  USER_MANAGE_ROLES = 'user:manage_roles',

  // Organization permissions
  ORG_READ = 'org:read',
  ORG_WRITE = 'org:write',
  ORG_DELETE = 'org:delete',
  ORG_MANAGE_SETTINGS = 'org:manage_settings',
  ORG_MANAGE_BILLING = 'org:manage_billing',
  ORG_MANAGE_MEMBERS = 'org:manage_members',

  // Dashboard permissions
  DASHBOARD_READ = 'dashboard:read',
  DASHBOARD_WRITE = 'dashboard:write',
  DASHBOARD_DELETE = 'dashboard:delete',
  DASHBOARD_SHARE = 'dashboard:share',
  DASHBOARD_EXPORT = 'dashboard:export',

  // Data source permissions
  DATASOURCE_READ = 'datasource:read',
  DATASOURCE_WRITE = 'datasource:write',
  DATASOURCE_DELETE = 'datasource:delete',
  DATASOURCE_CONNECT = 'datasource:connect',

  // Metric permissions
  METRIC_READ = 'metric:read',
  METRIC_WRITE = 'metric:write',
  METRIC_DELETE = 'metric:delete',
  METRIC_EXECUTE = 'metric:execute',

  // Alert permissions
  ALERT_READ = 'alert:read',
  ALERT_WRITE = 'alert:write',
  ALERT_DELETE = 'alert:delete',

  // Export permissions
  EXPORT_CREATE = 'export:create',
  EXPORT_READ = 'export:read',
  EXPORT_DELETE = 'export:delete',

  // Admin permissions
  ADMIN_AUDIT_LOGS = 'admin:audit_logs',
  ADMIN_SYSTEM_HEALTH = 'admin:system_health',
  ADMIN_USER_MANAGEMENT = 'admin:user_management',
  ADMIN_DATA_MIGRATION = 'admin:data_migration',
  ADMIN_CACHE_MANAGEMENT = 'admin:cache_management',
}

// Role to permissions mapping
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.SUPER_ADMIN]: Object.values(Permission),
  [Role.ORG_ADMIN]: [
    Permission.USER_READ,
    Permission.USER_WRITE,
    Permission.USER_INVITE,
    Permission.USER_MANAGE_ROLES,
    Permission.ORG_READ,
    Permission.ORG_WRITE,
    Permission.ORG_MANAGE_SETTINGS,
    Permission.ORG_MANAGE_BILLING,
    Permission.ORG_MANAGE_MEMBERS,
    Permission.DASHBOARD_READ,
    Permission.DASHBOARD_WRITE,
    Permission.DASHBOARD_DELETE,
    Permission.DASHBOARD_SHARE,
    Permission.DASHBOARD_EXPORT,
    Permission.DATASOURCE_READ,
    Permission.DATASOURCE_WRITE,
    Permission.DATASOURCE_DELETE,
    Permission.DATASOURCE_CONNECT,
    Permission.METRIC_READ,
    Permission.METRIC_WRITE,
    Permission.METRIC_DELETE,
    Permission.METRIC_EXECUTE,
    Permission.ALERT_READ,
    Permission.ALERT_WRITE,
    Permission.ALERT_DELETE,
    Permission.EXPORT_CREATE,
    Permission.EXPORT_READ,
    Permission.EXPORT_DELETE,
    Permission.ADMIN_AUDIT_LOGS,
    Permission.ADMIN_SYSTEM_HEALTH,
    Permission.ADMIN_USER_MANAGEMENT,
  ],
  [Role.ORG_USER]: [
    Permission.USER_READ,
    Permission.ORG_READ,
    Permission.DASHBOARD_READ,
    Permission.DASHBOARD_WRITE,
    Permission.DASHBOARD_SHARE,
    Permission.DASHBOARD_EXPORT,
    Permission.DATASOURCE_READ,
    Permission.DATASOURCE_WRITE,
    Permission.DATASOURCE_CONNECT,
    Permission.METRIC_READ,
    Permission.METRIC_WRITE,
    Permission.METRIC_EXECUTE,
    Permission.ALERT_READ,
    Permission.ALERT_WRITE,
    Permission.EXPORT_CREATE,
    Permission.EXPORT_READ,
  ],
  [Role.USER]: [
    Permission.USER_READ,
    Permission.DASHBOARD_READ,
    Permission.DASHBOARD_EXPORT,
    Permission.DATASOURCE_READ,
    Permission.METRIC_READ,
    Permission.METRIC_EXECUTE,
    Permission.ALERT_READ,
    Permission.EXPORT_CREATE,
    Permission.EXPORT_READ,
  ],
  [Role.GUEST]: [
    Permission.DASHBOARD_READ,
  ],
};

// Multi-tenant authorization utilities
class MultiTenantAuthorization {

  // Check if user belongs to organization
  static belongsToOrganization(
    context: AuthContext,
    organizationId: string
  ): boolean {
    if (!context.user) return false;

    // Super admin can access any organization
    if (context.user.role === Role.SUPER_ADMIN) {
      return true;
    }

    // Check if user belongs to the organization
    return context.user.organizationId === organizationId;
  }

  // Check if user owns resource
  static ownsResource(
    context: AuthContext,
    resourceOwnerId: string
  ): boolean {
    return context.user?.id === resourceOwnerId;
  }

  // Check if user can access shared resource
  static async canAccessSharedResource(
    context: AuthContext,
    resourceId: string,
    resourceType: 'dashboard' | 'widget'
  ): Promise<boolean> {
    if (!context.user) return false;

    // Check if resource is shared with user
    const shareExists = await context.db.queryOne<{ id: string }>(
      `SELECT id FROM ${resourceType}_shares
       WHERE ${resourceType}_id = $1
       AND user_id = $2
       AND (expires_at IS NULL OR expires_at > NOW())`,
      [resourceId, context.user.id]
    );

    return !!shareExists;
  }

  // Get resource organization ID
  static async getResourceOrganization(
    context: AuthContext,
    resourceId: string,
    resourceType: string
  ): Promise<string | null> {
    const resource = await context.db.queryOne<{ organizationId: string }>(
      `SELECT organization_id as "organizationId"
       FROM ${resourceType}
       WHERE id = $1`,
      [resourceId]
    );

    return resource?.organizationId || null;
  }

  // Apply row-level security filter
  static buildRLSFilter(context: AuthContext): string {
    if (!context.user) {
      return "FALSE"; // No access for unauthenticated users
    }

    if (context.user.role === Role.SUPER_ADMIN) {
      return "TRUE"; // Super admin has access to everything
    }

    return `organization_id = '${context.user.organizationId}'`;
  }
}

// Authorization rules
const isAuthenticated = rule({ cache: 'contextual' })(
  async (parent, args, context: AuthContext) => {
    if (!context.user) {
      throw new AuthenticationError('Authentication required');
    }
    return true;
  }
);

const hasRole = (role: Role) => rule({ cache: 'contextual' })(
  async (parent, args, context: AuthContext) => {
    if (!context.user) return false;

    // Check role hierarchy
    const roleHierarchy: Record<Role, number> = {
      [Role.GUEST]: 0,
      [Role.USER]: 1,
      [Role.ORG_USER]: 2,
      [Role.ORG_ADMIN]: 3,
      [Role.SUPER_ADMIN]: 4,
    };

    const userRoleLevel = roleHierarchy[context.user.role as Role];
    const requiredRoleLevel = roleHierarchy[role];

    return userRoleLevel >= requiredRoleLevel;
  }
);

const hasPermission = (permission: Permission) => rule({ cache: 'contextual' })(
  async (parent, args, context: AuthContext) => {
    if (!context.user) return false;

    const userRole = context.user.role as Role;
    const rolePermissions = ROLE_PERMISSIONS[userRole] || [];

    // Check direct permission
    if (rolePermissions.includes(permission)) {
      return true;
    }

    // Check custom permissions
    return context.user.permissions?.includes(permission) || false;
  }
);

const belongsToOrganization = rule({ cache: 'contextual' })(
  async (parent, args, context: AuthContext) => {
    if (!context.user) return false;

    // Extract organization ID from args or parent
    const organizationId = args.organizationId ||
                          args.input?.organizationId ||
                          parent?.organizationId ||
                          context.organizationId;

    if (!organizationId) return true; // No organization restriction

    return MultiTenantAuthorization.belongsToOrganization(context, organizationId);
  }
);

const ownsResource = rule({ cache: 'contextual' })(
  async (parent, args, context: AuthContext, info: GraphQLResolveInfo) => {
    if (!context.user) return false;

    // For create operations, user automatically owns the resource
    if (info.operation.operation === 'mutation' &&
        info.fieldName.startsWith('create')) {
      return true;
    }

    // Extract resource owner ID
    const ownerId = args.createdBy ||
                   args.input?.createdBy ||
                   parent?.createdBy ||
                   parent?.userId;

    if (!ownerId) return true; // No ownership restriction

    return MultiTenantAuthorization.ownsResource(context, ownerId);
  }
);

const canAccessSharedResource = (resourceType: 'dashboard' | 'widget') =>
  rule({ cache: 'contextual' })(
    async (parent, args, context: AuthContext) => {
      if (!context.user) return false;

      const resourceId = args.id || args.dashboardId || args.widgetId || parent?.id;
      if (!resourceId) return false;

      return await MultiTenantAuthorization.canAccessSharedResource(
        context,
        resourceId,
        resourceType
      );
    }
  );

const isPublicResource = rule({ cache: 'contextual' })(
  async (parent, args, context: AuthContext) => {
    // Check if resource is public
    const visibility = args.visibility || parent?.visibility;
    return visibility === 'PUBLIC';
  }
);

const withinUsageLimits = rule({ cache: 'contextual' })(
  async (parent, args, context: AuthContext) => {
    if (!context.user?.organizationId) return false;

    // Check organization usage limits (simplified)
    const usage = await context.db.queryOne<{
      dashboardCount: number;
      maxDashboards: number;
    }>(
      `SELECT
         (SELECT COUNT(*) FROM dashboards WHERE organization_id = $1) as "dashboardCount",
         ol.max_dashboards as "maxDashboards"
       FROM organization_limits ol
       WHERE ol.organization_id = $1`,
      [context.user.organizationId]
    );

    if (!usage) return true; // No limits found

    // Check specific limits based on operation
    const operation = args.input ? 'create' : 'read';
    if (operation === 'create' && usage.dashboardCount >= usage.maxDashboards) {
      throw new UserInputError('Dashboard limit exceeded for organization');
    }

    return true;
  }
);

// Field-level authorization for sensitive data
const canAccessSensitiveField = rule({ cache: 'contextual' })(
  async (parent, args, context: AuthContext, info: GraphQLResolveInfo) => {
    if (!context.user) return false;

    // List of sensitive fields
    const sensitiveFields = [
      'connectionString',
      'password',
      'apiKey',
      'billingInfo',
      'paymentMethod',
      'auditLogs',
    ];

    if (sensitiveFields.includes(info.fieldName)) {
      return hasRole(Role.ORG_ADMIN);
    }

    return true;
  }
);

// GraphQL Shield permissions
export const permissions = shield(
  {
    Query: {
      // User queries
      me: isAuthenticated,
      user: and(
        isAuthenticated,
        hasPermission(Permission.USER_READ),
        belongsToOrganization
      ),
      users: and(
        isAuthenticated,
        hasPermission(Permission.USER_READ),
        belongsToOrganization
      ),

      // Organization queries
      organization: and(
        isAuthenticated,
        hasPermission(Permission.ORG_READ),
        belongsToOrganization
      ),
      organizations: and(
        isAuthenticated,
        hasRole(Role.SUPER_ADMIN)
      ),
      organizationSettings: and(
        isAuthenticated,
        hasPermission(Permission.ORG_READ),
        belongsToOrganization
      ),

      // Dashboard queries
      dashboard: and(
        isAuthenticated,
        or(
          and(
            hasPermission(Permission.DASHBOARD_READ),
            belongsToOrganization,
            or(ownsResource, canAccessSharedResource('dashboard'))
          ),
          isPublicResource
        )
      ),
      dashboards: and(
        isAuthenticated,
        hasPermission(Permission.DASHBOARD_READ),
        belongsToOrganization
      ),
      myDashboards: and(
        isAuthenticated,
        hasPermission(Permission.DASHBOARD_READ)
      ),
      publicDashboards: isAuthenticated,

      // Widget queries
      widget: and(
        isAuthenticated,
        hasPermission(Permission.DASHBOARD_READ),
        belongsToOrganization,
        or(ownsResource, canAccessSharedResource('widget'))
      ),
      widgets: and(
        isAuthenticated,
        hasPermission(Permission.DASHBOARD_READ),
        belongsToOrganization
      ),

      // Data source queries
      dataSource: and(
        isAuthenticated,
        hasPermission(Permission.DATASOURCE_READ),
        belongsToOrganization
      ),
      dataSources: and(
        isAuthenticated,
        hasPermission(Permission.DATASOURCE_READ),
        belongsToOrganization
      ),
      testDataSourceConnection: and(
        isAuthenticated,
        hasPermission(Permission.DATASOURCE_CONNECT),
        belongsToOrganization
      ),

      // Metric queries
      metric: and(
        isAuthenticated,
        hasPermission(Permission.METRIC_READ),
        belongsToOrganization
      ),
      metrics: and(
        isAuthenticated,
        hasPermission(Permission.METRIC_READ),
        belongsToOrganization
      ),
      executeMetric: and(
        isAuthenticated,
        hasPermission(Permission.METRIC_EXECUTE),
        belongsToOrganization
      ),

      // Alert queries
      alert: and(
        isAuthenticated,
        hasPermission(Permission.ALERT_READ),
        belongsToOrganization
      ),
      alerts: and(
        isAuthenticated,
        hasPermission(Permission.ALERT_READ),
        belongsToOrganization
      ),

      // Analytics queries
      analyticsOverview: and(
        isAuthenticated,
        belongsToOrganization
      ),
      usageAnalytics: and(
        isAuthenticated,
        hasRole(Role.ORG_ADMIN),
        belongsToOrganization
      ),
      performanceMetrics: and(
        isAuthenticated,
        hasRole(Role.ORG_ADMIN),
        belongsToOrganization
      ),

      // Export queries
      export: and(
        isAuthenticated,
        hasPermission(Permission.EXPORT_READ),
        belongsToOrganization,
        ownsResource
      ),
      exports: and(
        isAuthenticated,
        hasPermission(Permission.EXPORT_READ),
        belongsToOrganization
      ),

      // Search queries
      search: and(
        isAuthenticated,
        belongsToOrganization
      ),
      suggestions: and(
        isAuthenticated,
        belongsToOrganization
      ),

      // Activity and audit
      activityLog: and(
        isAuthenticated,
        belongsToOrganization
      ),
      auditLog: and(
        isAuthenticated,
        hasPermission(Permission.ADMIN_AUDIT_LOGS),
        belongsToOrganization
      ),

      // System queries
      health: and(
        isAuthenticated,
        hasPermission(Permission.ADMIN_SYSTEM_HEALTH)
      ),
      version: isAuthenticated,
      userPreferences: isAuthenticated,

      // Notification queries
      notifications: and(
        isAuthenticated,
        belongsToOrganization
      ),
      unreadNotificationCount: and(
        isAuthenticated,
        belongsToOrganization
      ),
    },

    Mutation: {
      // User mutations
      updateProfile: isAuthenticated,
      updateUserPreferences: isAuthenticated,
      deleteUser: and(
        isAuthenticated,
        hasPermission(Permission.USER_DELETE),
        belongsToOrganization
      ),

      // Organization mutations
      createOrganization: and(
        isAuthenticated,
        withinUsageLimits
      ),
      updateOrganization: and(
        isAuthenticated,
        hasPermission(Permission.ORG_WRITE),
        belongsToOrganization
      ),
      updateOrganizationSettings: and(
        isAuthenticated,
        hasPermission(Permission.ORG_MANAGE_SETTINGS),
        belongsToOrganization
      ),
      deleteOrganization: hasRole(Role.SUPER_ADMIN),

      // Member management
      inviteUser: and(
        isAuthenticated,
        hasPermission(Permission.USER_INVITE),
        belongsToOrganization
      ),
      acceptInvitation: isAuthenticated,
      updateMemberRole: and(
        isAuthenticated,
        hasPermission(Permission.USER_MANAGE_ROLES),
        belongsToOrganization
      ),
      removeMember: and(
        isAuthenticated,
        hasPermission(Permission.ORG_MANAGE_MEMBERS),
        belongsToOrganization
      ),

      // Dashboard mutations
      createDashboard: and(
        isAuthenticated,
        hasPermission(Permission.DASHBOARD_WRITE),
        belongsToOrganization,
        withinUsageLimits
      ),
      updateDashboard: and(
        isAuthenticated,
        hasPermission(Permission.DASHBOARD_WRITE),
        belongsToOrganization,
        ownsResource
      ),
      cloneDashboard: and(
        isAuthenticated,
        hasPermission(Permission.DASHBOARD_WRITE),
        belongsToOrganization,
        withinUsageLimits
      ),
      deleteDashboard: and(
        isAuthenticated,
        hasPermission(Permission.DASHBOARD_DELETE),
        belongsToOrganization,
        ownsResource
      ),
      shareDashboard: and(
        isAuthenticated,
        hasPermission(Permission.DASHBOARD_SHARE),
        belongsToOrganization,
        ownsResource
      ),
      unshareDashboard: and(
        isAuthenticated,
        hasPermission(Permission.DASHBOARD_SHARE),
        belongsToOrganization,
        ownsResource
      ),
      favoriteDashboard: and(
        isAuthenticated,
        belongsToOrganization
      ),
      unfavoriteDashboard: and(
        isAuthenticated,
        belongsToOrganization
      ),

      // Widget mutations
      createWidget: and(
        isAuthenticated,
        hasPermission(Permission.DASHBOARD_WRITE),
        belongsToOrganization
      ),
      updateWidget: and(
        isAuthenticated,
        hasPermission(Permission.DASHBOARD_WRITE),
        belongsToOrganization
      ),
      updateWidgetPosition: and(
        isAuthenticated,
        hasPermission(Permission.DASHBOARD_WRITE),
        belongsToOrganization
      ),
      deleteWidget: and(
        isAuthenticated,
        hasPermission(Permission.DASHBOARD_WRITE),
        belongsToOrganization
      ),
      refreshWidget: and(
        isAuthenticated,
        hasPermission(Permission.DASHBOARD_READ),
        belongsToOrganization
      ),

      // Data source mutations
      createDataSource: and(
        isAuthenticated,
        hasPermission(Permission.DATASOURCE_WRITE),
        belongsToOrganization
      ),
      updateDataSource: and(
        isAuthenticated,
        hasPermission(Permission.DATASOURCE_WRITE),
        belongsToOrganization
      ),
      deleteDataSource: and(
        isAuthenticated,
        hasPermission(Permission.DATASOURCE_DELETE),
        belongsToOrganization
      ),
      syncDataSource: and(
        isAuthenticated,
        hasPermission(Permission.DATASOURCE_WRITE),
        belongsToOrganization
      ),

      // Metric mutations
      createMetric: and(
        isAuthenticated,
        hasPermission(Permission.METRIC_WRITE),
        belongsToOrganization
      ),
      updateMetric: and(
        isAuthenticated,
        hasPermission(Permission.METRIC_WRITE),
        belongsToOrganization
      ),
      deleteMetric: and(
        isAuthenticated,
        hasPermission(Permission.METRIC_DELETE),
        belongsToOrganization
      ),
      calculateMetric: and(
        isAuthenticated,
        hasPermission(Permission.METRIC_EXECUTE),
        belongsToOrganization
      ),

      // Alert mutations
      createAlert: and(
        isAuthenticated,
        hasPermission(Permission.ALERT_WRITE),
        belongsToOrganization
      ),
      updateAlert: and(
        isAuthenticated,
        hasPermission(Permission.ALERT_WRITE),
        belongsToOrganization
      ),
      deleteAlert: and(
        isAuthenticated,
        hasPermission(Permission.ALERT_DELETE),
        belongsToOrganization
      ),
      enableAlert: and(
        isAuthenticated,
        hasPermission(Permission.ALERT_WRITE),
        belongsToOrganization
      ),
      disableAlert: and(
        isAuthenticated,
        hasPermission(Permission.ALERT_WRITE),
        belongsToOrganization
      ),
      testAlert: and(
        isAuthenticated,
        hasPermission(Permission.ALERT_WRITE),
        belongsToOrganization
      ),

      // Export mutations
      createExport: and(
        isAuthenticated,
        hasPermission(Permission.EXPORT_CREATE),
        belongsToOrganization
      ),
      cancelExport: and(
        isAuthenticated,
        hasPermission(Permission.EXPORT_DELETE),
        belongsToOrganization,
        ownsResource
      ),

      // Notification mutations
      markNotificationRead: and(
        isAuthenticated,
        belongsToOrganization
      ),
      markAllNotificationsRead: and(
        isAuthenticated,
        belongsToOrganization
      ),
      deleteNotification: and(
        isAuthenticated,
        belongsToOrganization
      ),
      updateNotificationSettings: and(
        isAuthenticated,
        belongsToOrganization
      ),

      // Bulk operations
      bulkUpdateWidgetPositions: and(
        isAuthenticated,
        hasPermission(Permission.DASHBOARD_WRITE),
        belongsToOrganization
      ),
      bulkDeleteDashboards: and(
        isAuthenticated,
        hasPermission(Permission.DASHBOARD_DELETE),
        belongsToOrganization
      ),
      bulkShareDashboards: and(
        isAuthenticated,
        hasPermission(Permission.DASHBOARD_SHARE),
        belongsToOrganization
      ),

      // Admin operations
      migrateData: and(
        isAuthenticated,
        hasPermission(Permission.ADMIN_DATA_MIGRATION)
      ),
      purgeOldData: and(
        isAuthenticated,
        hasRole(Role.ORG_ADMIN),
        belongsToOrganization
      ),
      rebuildCache: and(
        isAuthenticated,
        hasPermission(Permission.ADMIN_CACHE_MANAGEMENT),
        belongsToOrganization
      ),
    },

    Subscription: {
      // All subscriptions require authentication and organization membership
      dashboardUpdated: and(isAuthenticated, belongsToOrganization),
      dashboardShared: and(isAuthenticated, belongsToOrganization),
      dashboardDeleted: and(isAuthenticated, belongsToOrganization),
      widgetUpdated: and(isAuthenticated, belongsToOrganization),
      widgetDataChanged: and(isAuthenticated, belongsToOrganization),
      widgetPositionChanged: and(isAuthenticated, belongsToOrganization),
      metricCalculated: and(isAuthenticated, belongsToOrganization),
      metricThresholdBreached: and(isAuthenticated, belongsToOrganization),
      alertTriggered: and(isAuthenticated, belongsToOrganization),
      alertStatusChanged: and(isAuthenticated, belongsToOrganization),
      dataSourceSyncCompleted: and(isAuthenticated, belongsToOrganization),
      dataSourceStatusChanged: and(isAuthenticated, belongsToOrganization),
      userActivity: and(isAuthenticated, belongsToOrganization),
      dashboardCollaboration: and(isAuthenticated, belongsToOrganization),
      organizationMemberAdded: and(
        isAuthenticated,
        hasRole(Role.ORG_ADMIN),
        belongsToOrganization
      ),
      organizationMemberRemoved: and(
        isAuthenticated,
        hasRole(Role.ORG_ADMIN),
        belongsToOrganization
      ),
      organizationSettingsChanged: and(
        isAuthenticated,
        hasRole(Role.ORG_ADMIN),
        belongsToOrganization
      ),
      notificationReceived: and(isAuthenticated, belongsToOrganization),
      notificationRead: and(isAuthenticated, belongsToOrganization),
      exportStatusChanged: and(isAuthenticated, belongsToOrganization),
      exportCompleted: and(isAuthenticated, belongsToOrganization),
      systemHealth: and(
        isAuthenticated,
        hasRole(Role.ORG_ADMIN),
        belongsToOrganization
      ),
      systemMaintenance: isAuthenticated,
      systemAlert: and(
        isAuthenticated,
        hasRole(Role.ORG_ADMIN),
        belongsToOrganization
      ),
      liveQueryResult: and(isAuthenticated, belongsToOrganization),
      bulkOperationProgress: and(isAuthenticated, belongsToOrganization),
    },

    // Field-level permissions
    User: {
      email: canAccessSensitiveField,
      organizations: and(isAuthenticated, belongsToOrganization),
    },

    Organization: {
      billingInfo: and(
        isAuthenticated,
        hasPermission(Permission.ORG_MANAGE_BILLING),
        belongsToOrganization
      ),
      auditLogs: and(
        isAuthenticated,
        hasPermission(Permission.ADMIN_AUDIT_LOGS),
        belongsToOrganization
      ),
    },

    DataSource: {
      connection: canAccessSensitiveField,
    },
  },
  {
    allowExternalErrors: true,
    fallbackError: new ForbiddenError('Access denied'),
    debug: process.env.NODE_ENV === 'development',
  }
);

export {
  Role,
  Permission,
  ROLE_PERMISSIONS,
  MultiTenantAuthorization,
  isAuthenticated,
  hasRole,
  hasPermission,
  belongsToOrganization,
  ownsResource,
  canAccessSharedResource,
};

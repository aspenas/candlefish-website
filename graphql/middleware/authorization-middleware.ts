/**
 * Authorization Middleware for Real-Time Collaboration Platform
 * Implements comprehensive field-level authorization with RBAC and dynamic permissions
 */

import { ForbiddenError, AuthenticationError, UserInputError } from 'apollo-server-express';
import { AuthenticationError as GraphQLAuthError } from 'graphql';
import { GraphQLResolveInfo, FieldNode, GraphQLSchema } from 'graphql';
import { AuthContext } from '../types/context';
import { shield, rule, and, or, not, cache, inputRule } from 'graphql-shield';
import { RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible';

// =============================================================================
// PERMISSION DEFINITIONS AND ENUMERATIONS
// =============================================================================

export enum Permission {
  // User-level permissions
  USER = 'USER',
  VERIFIED_USER = 'VERIFIED_USER',
  
  // Document permissions
  VIEW = 'VIEW',
  EDIT = 'EDIT',
  COMMENT = 'COMMENT',
  ADMIN = 'ADMIN',
  DELETE = 'DELETE',
  SHARE = 'SHARE',
  
  // Project permissions
  VIEW_PROJECT = 'VIEW_PROJECT',
  EDIT_PROJECT = 'EDIT_PROJECT',
  MANAGE_PROJECT = 'MANAGE_PROJECT',
  DELETE_PROJECT = 'DELETE_PROJECT',
  
  // Organization permissions
  ORGANIZATION_MEMBER = 'ORGANIZATION_MEMBER',
  ORGANIZATION_ADMIN = 'ORGANIZATION_ADMIN',
  ORGANIZATION_OWNER = 'ORGANIZATION_OWNER',
  
  // AI and analytics permissions
  VIEW_ANALYTICS = 'VIEW_ANALYTICS',
  MANAGE_AI_AGENT = 'MANAGE_AI_AGENT',
  CONFIGURE_AI = 'CONFIGURE_AI',
  
  // System permissions
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
  MANAGE_BILLING = 'MANAGE_BILLING',
  AUDIT_ACCESS = 'AUDIT_ACCESS'
}

export enum ProjectRole {
  VIEWER = 'VIEWER',
  EDITOR = 'EDITOR',
  COLLABORATOR = 'COLLABORATOR',
  ADMIN = 'ADMIN',
  OWNER = 'OWNER'
}

export enum OrganizationRole {
  MEMBER = 'MEMBER',
  ADMIN = 'ADMIN',
  OWNER = 'OWNER'
}

// =============================================================================
// AUTHORIZATION SERVICE
// =============================================================================

interface PermissionCache {
  [key: string]: {
    permissions: Permission[];
    expiresAt: number;
  };
}

class AuthorizationService {
  private permissionCache: PermissionCache = {};
  private cacheExpiration = 5 * 60 * 1000; // 5 minutes

  constructor(private redis?: any) {}

  // =============================================================================
  // PERMISSION RESOLUTION
  // =============================================================================

  async getUserPermissions(userId: string, context: AuthContext): Promise<Permission[]> {
    const cacheKey = `user-permissions:${userId}`;
    
    // Check cache first
    const cached = this.permissionCache[cacheKey];
    if (cached && cached.expiresAt > Date.now()) {
      return cached.permissions;
    }

    // Fetch from database
    const permissions = await this.fetchUserPermissionsFromDB(userId, context);
    
    // Cache the result
    this.permissionCache[cacheKey] = {
      permissions,
      expiresAt: Date.now() + this.cacheExpiration
    };

    return permissions;
  }

  private async fetchUserPermissionsFromDB(userId: string, context: AuthContext): Promise<Permission[]> {
    const query = `
      SELECT DISTINCT
        r.permissions,
        pc.role as project_role,
        oc.role as organization_role,
        u.status as user_status,
        u.verified
      FROM users u
      LEFT JOIN project_collaborators pc ON u.id = pc.user_id
      LEFT JOIN organization_collaborators oc ON u.id = oc.user_id
      LEFT JOIN roles r ON pc.role = r.name OR oc.role = r.name
      WHERE u.id = $1
    `;

    const result = await context.db.query(query, [userId]);
    const permissions = new Set<Permission>();

    // Base user permissions
    if (result.rows.length > 0) {
      const user = result.rows[0];
      
      if (user.user_status === 'active') {
        permissions.add(Permission.USER);
      }
      
      if (user.verified) {
        permissions.add(Permission.VERIFIED_USER);
      }
    }

    // Role-based permissions
    result.rows.forEach(row => {
      if (row.permissions) {
        const rolePermissions = JSON.parse(row.permissions);
        rolePermissions.forEach((perm: string) => {
          if (Object.values(Permission).includes(perm as Permission)) {
            permissions.add(perm as Permission);
          }
        });
      }

      // Project-specific permissions
      if (row.project_role) {
        const projectPermissions = this.getProjectRolePermissions(row.project_role);
        projectPermissions.forEach(perm => permissions.add(perm));
      }

      // Organization-specific permissions
      if (row.organization_role) {
        const orgPermissions = this.getOrganizationRolePermissions(row.organization_role);
        orgPermissions.forEach(perm => permissions.add(perm));
      }
    });

    return Array.from(permissions);
  }

  async getResourcePermissions(
    userId: string, 
    resourceType: string, 
    resourceId: string, 
    context: AuthContext
  ): Promise<Permission[]> {
    const cacheKey = `resource-permissions:${userId}:${resourceType}:${resourceId}`;
    
    const cached = this.permissionCache[cacheKey];
    if (cached && cached.expiresAt > Date.now()) {
      return cached.permissions;
    }

    const permissions = await this.fetchResourcePermissionsFromDB(
      userId, resourceType, resourceId, context
    );
    
    this.permissionCache[cacheKey] = {
      permissions,
      expiresAt: Date.now() + this.cacheExpiration
    };

    return permissions;
  }

  private async fetchResourcePermissionsFromDB(
    userId: string, 
    resourceType: string, 
    resourceId: string, 
    context: AuthContext
  ): Promise<Permission[]> {
    const permissions = new Set<Permission>();

    switch (resourceType) {
      case 'project': {
        const query = `
          SELECT 
            pc.role,
            p.owner_id,
            p.visibility,
            oc.role as org_role
          FROM projects p
          LEFT JOIN project_collaborators pc ON p.id = pc.project_id AND pc.user_id = $2
          LEFT JOIN organization_collaborators oc ON p.organization_id = oc.organization_id AND oc.user_id = $2
          WHERE p.id = $1
        `;
        
        const result = await context.db.query(query, [resourceId, userId]);
        if (result.rows.length > 0) {
          const project = result.rows[0];
          
          // Owner permissions
          if (project.owner_id === userId) {
            permissions.add(Permission.VIEW_PROJECT);
            permissions.add(Permission.EDIT_PROJECT);
            permissions.add(Permission.MANAGE_PROJECT);
            permissions.add(Permission.DELETE_PROJECT);
          }
          
          // Role-based permissions
          if (project.role) {
            const rolePermissions = this.getProjectRolePermissions(project.role);
            rolePermissions.forEach(perm => permissions.add(perm));
          }
          
          // Organization-based permissions
          if (project.org_role === 'ADMIN' || project.org_role === 'OWNER') {
            permissions.add(Permission.VIEW_PROJECT);
            permissions.add(Permission.EDIT_PROJECT);
          }
          
          // Public visibility
          if (project.visibility === 'public') {
            permissions.add(Permission.VIEW_PROJECT);
          }
        }
        break;
      }

      case 'document': {
        const query = `
          SELECT 
            d.*,
            p.owner_id as project_owner_id,
            pc.role as project_role,
            dp.permission as document_permission
          FROM documents d
          LEFT JOIN projects p ON d.project_id = p.id
          LEFT JOIN project_collaborators pc ON p.id = pc.project_id AND pc.user_id = $2
          LEFT JOIN document_permissions dp ON d.id = dp.document_id AND dp.user_id = $2
          WHERE d.id = $1
        `;
        
        const result = await context.db.query(query, [resourceId, userId]);
        if (result.rows.length > 0) {
          const document = result.rows[0];
          
          // Document creator permissions
          if (document.created_by === userId) {
            permissions.add(Permission.VIEW);
            permissions.add(Permission.EDIT);
            permissions.add(Permission.COMMENT);
            permissions.add(Permission.SHARE);
          }
          
          // Project owner permissions
          if (document.project_owner_id === userId) {
            permissions.add(Permission.VIEW);
            permissions.add(Permission.EDIT);
            permissions.add(Permission.ADMIN);
            permissions.add(Permission.DELETE);
          }
          
          // Explicit document permissions
          if (document.document_permission) {
            const docPermissions = this.getDocumentPermissions(document.document_permission);
            docPermissions.forEach(perm => permissions.add(perm));
          }
          
          // Project role permissions
          if (document.project_role) {
            const rolePermissions = this.getProjectRolePermissions(document.project_role);
            rolePermissions.forEach(perm => permissions.add(perm));
          }
        }
        break;
      }
    }

    return Array.from(permissions);
  }

  // =============================================================================
  // ROLE PERMISSION MAPPING
  // =============================================================================

  private getProjectRolePermissions(role: string): Permission[] {
    switch (role) {
      case ProjectRole.OWNER:
        return [
          Permission.VIEW_PROJECT,
          Permission.EDIT_PROJECT,
          Permission.MANAGE_PROJECT,
          Permission.DELETE_PROJECT,
          Permission.VIEW,
          Permission.EDIT,
          Permission.COMMENT,
          Permission.ADMIN,
          Permission.DELETE,
          Permission.SHARE
        ];
      case ProjectRole.ADMIN:
        return [
          Permission.VIEW_PROJECT,
          Permission.EDIT_PROJECT,
          Permission.MANAGE_PROJECT,
          Permission.VIEW,
          Permission.EDIT,
          Permission.COMMENT,
          Permission.SHARE
        ];
      case ProjectRole.COLLABORATOR:
        return [
          Permission.VIEW_PROJECT,
          Permission.VIEW,
          Permission.EDIT,
          Permission.COMMENT
        ];
      case ProjectRole.EDITOR:
        return [
          Permission.VIEW_PROJECT,
          Permission.VIEW,
          Permission.EDIT
        ];
      case ProjectRole.VIEWER:
        return [
          Permission.VIEW_PROJECT,
          Permission.VIEW
        ];
      default:
        return [];
    }
  }

  private getOrganizationRolePermissions(role: string): Permission[] {
    switch (role) {
      case OrganizationRole.OWNER:
        return [
          Permission.ORGANIZATION_OWNER,
          Permission.ORGANIZATION_ADMIN,
          Permission.ORGANIZATION_MEMBER,
          Permission.VIEW_ANALYTICS,
          Permission.CONFIGURE_AI,
          Permission.MANAGE_BILLING,
          Permission.AUDIT_ACCESS
        ];
      case OrganizationRole.ADMIN:
        return [
          Permission.ORGANIZATION_ADMIN,
          Permission.ORGANIZATION_MEMBER,
          Permission.VIEW_ANALYTICS,
          Permission.CONFIGURE_AI
        ];
      case OrganizationRole.MEMBER:
        return [Permission.ORGANIZATION_MEMBER];
      default:
        return [];
    }
  }

  private getDocumentPermissions(permission: string): Permission[] {
    switch (permission) {
      case 'admin':
        return [Permission.VIEW, Permission.EDIT, Permission.COMMENT, Permission.ADMIN, Permission.DELETE, Permission.SHARE];
      case 'edit':
        return [Permission.VIEW, Permission.EDIT, Permission.COMMENT];
      case 'comment':
        return [Permission.VIEW, Permission.COMMENT];
      case 'view':
        return [Permission.VIEW];
      default:
        return [];
    }
  }

  // =============================================================================
  // PERMISSION VALIDATION
  // =============================================================================

  async hasPermission(
    userId: string, 
    permission: Permission, 
    context: AuthContext,
    resourceType?: string,
    resourceId?: string
  ): Promise<boolean> {
    // System admin override
    const userPermissions = await this.getUserPermissions(userId, context);
    if (userPermissions.includes(Permission.SYSTEM_ADMIN)) {
      return true;
    }

    // Resource-specific permissions
    if (resourceType && resourceId) {
      const resourcePermissions = await this.getResourcePermissions(
        userId, resourceType, resourceId, context
      );
      if (resourcePermissions.includes(permission)) {
        return true;
      }
    }

    // Global permissions
    return userPermissions.includes(permission);
  }

  async hasAnyPermission(
    userId: string, 
    permissions: Permission[], 
    context: AuthContext,
    resourceType?: string,
    resourceId?: string
  ): Promise<boolean> {
    for (const permission of permissions) {
      if (await this.hasPermission(userId, permission, context, resourceType, resourceId)) {
        return true;
      }
    }
    return false;
  }

  async hasAllPermissions(
    userId: string, 
    permissions: Permission[], 
    context: AuthContext,
    resourceType?: string,
    resourceId?: string
  ): Promise<boolean> {
    for (const permission of permissions) {
      if (!(await this.hasPermission(userId, permission, context, resourceType, resourceId))) {
        return false;
      }
    }
    return true;
  }

  invalidateCache(userId?: string, resourceType?: string, resourceId?: string) {
    if (userId && resourceType && resourceId) {
      const cacheKey = `resource-permissions:${userId}:${resourceType}:${resourceId}`;
      delete this.permissionCache[cacheKey];
    } else if (userId) {
      const userCacheKey = `user-permissions:${userId}`;
      delete this.permissionCache[userCacheKey];
    } else {
      this.permissionCache = {};
    }
  }
}

// =============================================================================
// RATE LIMITING SETUP
// =============================================================================

const rateLimiters = {
  query: new RateLimiterMemory({
    keyPrefix: 'query_limit',
    points: 1000, // Number of requests
    duration: 60, // Per 60 seconds
  }),
  mutation: new RateLimiterMemory({
    keyPrefix: 'mutation_limit',
    points: 100, // Number of requests
    duration: 60, // Per 60 seconds
  }),
  subscription: new RateLimiterMemory({
    keyPrefix: 'subscription_limit',
    points: 50, // Number of requests
    duration: 60, // Per 60 seconds
  }),
  ai_operations: new RateLimiterMemory({
    keyPrefix: 'ai_limit',
    points: 20, // Number of requests
    duration: 60, // Per 60 seconds
  })
};

// =============================================================================
// GRAPHQL SHIELD RULES
// =============================================================================

const authorizationService = new AuthorizationService();

// Authentication rules
const isAuthenticated = rule({ cache: 'contextual' })(
  async (parent, args, context: AuthContext) => {
    return context.user !== null;
  }
);

const isVerified = rule({ cache: 'contextual' })(
  async (parent, args, context: AuthContext) => {
    return context.user?.verified === true;
  }
);

// Permission-based rules
const hasPermission = (permission: Permission) => rule({ cache: 'contextual' })(
  async (parent, args, context: AuthContext) => {
    if (!context.user) return false;
    return await authorizationService.hasPermission(
      context.user.id, 
      permission, 
      context
    );
  }
);

const hasAnyPermission = (...permissions: Permission[]) => rule({ cache: 'contextual' })(
  async (parent, args, context: AuthContext) => {
    if (!context.user) return false;
    return await authorizationService.hasAnyPermission(
      context.user.id, 
      permissions, 
      context
    );
  }
);

// Resource-specific rules
const canAccessProject = rule({ cache: 'contextual' })(
  async (parent, args, context: AuthContext) => {
    if (!context.user) return false;
    const projectId = args.id || args.projectId || parent?.id;
    if (!projectId) return false;
    
    return await authorizationService.hasPermission(
      context.user.id,
      Permission.VIEW_PROJECT,
      context,
      'project',
      projectId
    );
  }
);

const canEditProject = rule({ cache: 'contextual' })(
  async (parent, args, context: AuthContext) => {
    if (!context.user) return false;
    const projectId = args.id || args.projectId || parent?.id;
    if (!projectId) return false;
    
    return await authorizationService.hasPermission(
      context.user.id,
      Permission.EDIT_PROJECT,
      context,
      'project',
      projectId
    );
  }
);

const canAccessDocument = rule({ cache: 'contextual' })(
  async (parent, args, context: AuthContext) => {
    if (!context.user) return false;
    const documentId = args.id || args.documentId || parent?.id;
    if (!documentId) return false;
    
    return await authorizationService.hasPermission(
      context.user.id,
      Permission.VIEW,
      context,
      'document',
      documentId
    );
  }
);

const canEditDocument = rule({ cache: 'contextual' })(
  async (parent, args, context: AuthContext) => {
    if (!context.user) return false;
    const documentId = args.id || args.documentId || parent?.id;
    if (!documentId) return false;
    
    return await authorizationService.hasPermission(
      context.user.id,
      Permission.EDIT,
      context,
      'document',
      documentId
    );
  }
);

// Rate limiting rules
const queryRateLimit = rule({ cache: 'no_cache' })(
  async (parent, args, context: AuthContext) => {
    try {
      await rateLimiters.query.consume(context.user?.id || context.ip);
      return true;
    } catch {
      throw new UserInputError('Query rate limit exceeded');
    }
  }
);

const mutationRateLimit = rule({ cache: 'no_cache' })(
  async (parent, args, context: AuthContext) => {
    try {
      await rateLimiters.mutation.consume(context.user?.id || context.ip);
      return true;
    } catch {
      throw new UserInputError('Mutation rate limit exceeded');
    }
  }
);

const aiOperationRateLimit = rule({ cache: 'no_cache' })(
  async (parent, args, context: AuthContext) => {
    try {
      await rateLimiters.ai_operations.consume(context.user?.id || context.ip);
      return true;
    } catch {
      throw new UserInputError('AI operation rate limit exceeded');
    }
  }
);

// =============================================================================
// SHIELD CONFIGURATION
// =============================================================================

export const permissions = shield({
  Query: {
    // Public queries
    '*': queryRateLimit,
    
    // User authentication required
    me: isAuthenticated,
    myProjects: isAuthenticated,
    myRecentDocuments: isAuthenticated,
    
    // Specific permissions
    project: and(isAuthenticated, canAccessProject),
    projects: and(isAuthenticated, hasPermission(Permission.VIEW_PROJECT)),
    document: and(isAuthenticated, canAccessDocument),
    documents: and(isAuthenticated, hasPermission(Permission.VIEW)),
    
    // Analytics (requires special permissions)
    projectAnalytics: and(isAuthenticated, hasPermission(Permission.VIEW_ANALYTICS)),
    organizationMetrics: and(isAuthenticated, hasPermission(Permission.VIEW_ANALYTICS)),
    
    // AI operations
    aiSuggestions: and(isAuthenticated, aiOperationRateLimit),
    aiAnalysis: and(isAuthenticated, aiOperationRateLimit, hasPermission(Permission.VERIFIED_USER)),
    
    // Admin queries
    allUsers: hasPermission(Permission.SYSTEM_ADMIN),
    systemMetrics: hasPermission(Permission.SYSTEM_ADMIN)
  },

  Mutation: {
    // All mutations require rate limiting
    '*': mutationRateLimit,
    
    // Authentication mutations (no auth required)
    login: true,
    register: true,
    
    // User mutations
    updateProfile: isAuthenticated,
    updatePreferences: isAuthenticated,
    
    // Project mutations
    createProject: and(isAuthenticated, isVerified),
    updateProject: and(isAuthenticated, canEditProject),
    deleteProject: and(isAuthenticated, hasPermission(Permission.DELETE_PROJECT)),
    
    // Document mutations
    createDocument: and(isAuthenticated, hasPermission(Permission.EDIT_PROJECT)),
    updateDocument: and(isAuthenticated, canEditDocument),
    deleteDocument: and(isAuthenticated, hasPermission(Permission.DELETE)),
    
    // Collaboration mutations
    joinDocument: and(isAuthenticated, canAccessDocument),
    leaveDocument: isAuthenticated,
    updatePresence: and(isAuthenticated, canAccessDocument),
    
    // AI mutations
    generateAISuggestion: and(isAuthenticated, aiOperationRateLimit, hasPermission(Permission.VERIFIED_USER)),
    applyAISuggestion: and(isAuthenticated, canEditDocument),
    configureAI: and(isAuthenticated, hasPermission(Permission.CONFIGURE_AI)),
    
    // Comment mutations
    createComment: and(isAuthenticated, hasPermission(Permission.COMMENT)),
    updateComment: isAuthenticated, // Will check ownership in resolver
    deleteComment: isAuthenticated, // Will check ownership in resolver
    
    // Admin mutations
    promoteUser: hasPermission(Permission.SYSTEM_ADMIN),
    suspendUser: hasPermission(Permission.SYSTEM_ADMIN)
  },

  Subscription: {
    // Document subscriptions
    documentChanged: and(isAuthenticated, canAccessDocument),
    documentContentChanged: and(isAuthenticated, canAccessDocument),
    documentOperations: and(isAuthenticated, canAccessDocument),
    
    // Presence subscriptions
    documentPresenceChanged: and(isAuthenticated, canAccessDocument),
    cursorPositionChanged: and(isAuthenticated, canAccessDocument),
    
    // AI subscriptions
    aiSuggestionsGenerated: and(isAuthenticated, canAccessDocument, aiOperationRateLimit),
    aiAnalysisCompleted: and(isAuthenticated, canAccessDocument),
    
    // Project subscriptions
    projectActivity: and(isAuthenticated, canAccessProject),
    projectTeamChanged: and(isAuthenticated, canAccessProject),
    
    // Personal subscriptions
    notifications: isAuthenticated
  }
}, {
  allowExternalErrors: true,
  fallbackRule: not(isAuthenticated),
  fallbackError: new AuthenticationError('Authentication required')
});

// =============================================================================
// FIELD-LEVEL AUTHORIZATION HELPERS
// =============================================================================

export const createFieldAuthCheck = (
  permission: Permission,
  resourceExtractor?: (parent: any, args: any, context: AuthContext) => { type: string; id: string }
) => {
  return async (parent: any, args: any, context: AuthContext): Promise<boolean> => {
    if (!context.user) return false;

    if (resourceExtractor) {
      const resource = resourceExtractor(parent, args, context);
      return await authorizationService.hasPermission(
        context.user.id,
        permission,
        context,
        resource.type,
        resource.id
      );
    }

    return await authorizationService.hasPermission(
      context.user.id,
      permission,
      context
    );
  };
};

export const requireAuth = (next: any) => {
  return (root: any, args: any, context: AuthContext, info: GraphQLResolveInfo) => {
    if (!context.user) {
      throw new AuthenticationError('Authentication required');
    }
    return next(root, args, context, info);
  };
};

export const requirePermission = (permission: Permission) => {
  return (next: any) => {
    return async (root: any, args: any, context: AuthContext, info: GraphQLResolveInfo) => {
      if (!context.user) {
        throw new AuthenticationError('Authentication required');
      }

      const hasAuth = await authorizationService.hasPermission(
        context.user.id,
        permission,
        context
      );

      if (!hasAuth) {
        throw new ForbiddenError(`Insufficient permissions: ${permission} required`);
      }

      return next(root, args, context, info);
    };
  };
};

export const requireResourcePermission = (
  permission: Permission,
  resourceExtractor: (parent: any, args: any, context: AuthContext) => { type: string; id: string }
) => {
  return (next: any) => {
    return async (root: any, args: any, context: AuthContext, info: GraphQLResolveInfo) => {
      if (!context.user) {
        throw new AuthenticationError('Authentication required');
      }

      const resource = resourceExtractor(root, args, context);
      const hasAuth = await authorizationService.hasPermission(
        context.user.id,
        permission,
        context,
        resource.type,
        resource.id
      );

      if (!hasAuth) {
        throw new ForbiddenError(`Insufficient permissions: ${permission} required for ${resource.type}:${resource.id}`);
      }

      return next(root, args, context, info);
    };
  };
};

// =============================================================================
// EXPORTS
// =============================================================================

export {
  authorizationService,
  AuthorizationService,
  isAuthenticated,
  isVerified,
  hasPermission,
  hasAnyPermission,
  canAccessProject,
  canEditProject,
  canAccessDocument,
  canEditDocument,
  queryRateLimit,
  mutationRateLimit,
  aiOperationRateLimit
};

export default permissions;
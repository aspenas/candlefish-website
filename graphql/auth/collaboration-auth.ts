/**
 * Collaboration Authorization System
 * Field-level permissions, directives, and access control for collaboration features
 */

import {
  SchemaDirectiveVisitor,
  AuthenticationError,
  ForbiddenError,
  UserInputError
} from 'apollo-server-errors';
import {
  defaultFieldResolver,
  GraphQLField,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLDirective,
  DirectiveLocation,
  GraphQLString,
  GraphQLList,
  GraphQLEnumType,
  GraphQLInt
} from 'graphql';
import { AuthContext } from '../types/context';
import { Document, DocumentPermission, OrganizationRole } from '../types/collaboration';

// =============================================================================
// AUTHORIZATION ENUMS
// =============================================================================

export const AuthRequirementType = new GraphQLEnumType({
  name: 'AuthRequirement',
  values: {
    NONE: { value: 'NONE' },
    USER: { value: 'USER' },
    ORG_MEMBER: { value: 'ORG_MEMBER' },
    ORG_ADMIN: { value: 'ORG_ADMIN' },
    SUPER_ADMIN: { value: 'SUPER_ADMIN' },
    VIEW: { value: 'VIEW' },
    COMMENT: { value: 'COMMENT' },
    EDIT: { value: 'EDIT' },
    MANAGE: { value: 'MANAGE' },
    SHARE: { value: 'SHARE' },
    DELETE: { value: 'DELETE' },
    VIEW_ESTIMATES: { value: 'VIEW_ESTIMATES' },
    VIEW_BRANDING: { value: 'VIEW_BRANDING' }
  }
});

export const AuditLevelType = new GraphQLEnumType({
  name: 'AuditLevel',
  values: {
    INFO: { value: 'INFO' },
    WARN: { value: 'WARN' },
    ERROR: { value: 'ERROR' },
    CRITICAL: { value: 'CRITICAL' }
  }
});

// =============================================================================
// DIRECTIVE DEFINITIONS
// =============================================================================

export const authDirective = new GraphQLDirective({
  name: 'auth',
  locations: [
    DirectiveLocation.FIELD_DEFINITION,
    DirectiveLocation.OBJECT,
    DirectiveLocation.INTERFACE
  ],
  args: {
    requires: {
      type: AuthRequirementType,
      defaultValue: 'USER',
      description: 'Minimum authentication level required'
    },
    roles: {
      type: new GraphQLList(GraphQLString),
      description: 'Required organization roles'
    },
    permissions: {
      type: new GraphQLList(GraphQLString),
      description: 'Required document permissions'
    }
  }
});

export const tenantDirective = new GraphQLDirective({
  name: 'tenant',
  locations: [
    DirectiveLocation.FIELD_DEFINITION,
    DirectiveLocation.OBJECT
  ],
  args: {
    scope: {
      type: GraphQLString,
      defaultValue: 'ORGANIZATION',
      description: 'Tenant isolation scope'
    }
  }
});

export const rateLimitDirective = new GraphQLDirective({
  name: 'rateLimit',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    max: {
      type: GraphQLInt,
      description: 'Maximum requests allowed'
    },
    window: {
      type: GraphQLString,
      description: 'Time window (e.g., "1h", "5m", "60s")'
    },
    key: {
      type: GraphQLString,
      description: 'Custom rate limit key'
    }
  }
});

export const auditDirective = new GraphQLDirective({
  name: 'audit',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    level: {
      type: AuditLevelType,
      defaultValue: 'INFO',
      description: 'Audit log level'
    },
    action: {
      type: GraphQLString,
      description: 'Audit action name'
    }
  }
});

export const complexityDirective = new GraphQLDirective({
  name: 'complexity',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    value: {
      type: GraphQLInt,
      description: 'Query complexity cost'
    },
    multipliers: {
      type: new GraphQLList(GraphQLString),
      description: 'Fields that multiply complexity'
    }
  }
});

// =============================================================================
// DIRECTIVE IMPLEMENTATIONS
// =============================================================================

/**
 * @auth directive implementation
 * Handles authentication and authorization requirements
 */
export class AuthDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field: GraphQLField<any, any>) {
    const { resolve = defaultFieldResolver } = field;
    const { requires, roles, permissions } = this.args;

    field.resolve = async (parent: any, args: any, context: AuthContext, info: any) => {
      // Check if user is authenticated
      if (requires !== 'NONE' && !context.isAuthenticated) {
        throw new AuthenticationError('Authentication required');
      }

      // Check authentication level
      await this.checkAuthLevel(context, requires);

      // Check organization roles
      if (roles && roles.length > 0) {
        await this.checkOrganizationRoles(context, roles);
      }

      // Check document permissions (if applicable)
      if (permissions && permissions.length > 0) {
        await this.checkDocumentPermissions(context, parent, permissions);
      }

      return resolve(parent, args, context, info);
    };
  }

  visitObject(object: GraphQLObjectType) {
    const { requires, roles, permissions } = this.args;
    const fields = object.getFields();

    Object.keys(fields).forEach(fieldName => {
      const field = fields[fieldName];
      const { resolve = defaultFieldResolver } = field;

      field.resolve = async (parent: any, args: any, context: AuthContext, info: any) => {
        // Apply object-level authorization
        if (requires !== 'NONE' && !context.isAuthenticated) {
          throw new AuthenticationError('Authentication required');
        }

        await this.checkAuthLevel(context, requires);

        if (roles && roles.length > 0) {
          await this.checkOrganizationRoles(context, roles);
        }

        return resolve(parent, args, context, info);
      };
    });
  }

  private async checkAuthLevel(context: AuthContext, requires: string): Promise<void> {
    const user = context.user;
    if (!user) {
      throw new AuthenticationError('User not found');
    }

    switch (requires) {
      case 'SUPER_ADMIN':
        if (user.role !== 'SUPER_ADMIN') {
          throw new ForbiddenError('Super admin access required');
        }
        break;

      case 'ORG_ADMIN':
        const orgRole = await this.getUserOrganizationRole(context, user.id, context.organizationId!);
        if (!['OWNER', 'ADMIN'].includes(orgRole)) {
          throw new ForbiddenError('Organization admin access required');
        }
        break;

      case 'ORG_MEMBER':
        if (!context.organizationId) {
          throw new ForbiddenError('Organization membership required');
        }
        const isMember = await this.checkOrganizationMembership(context, user.id, context.organizationId);
        if (!isMember) {
          throw new ForbiddenError('Organization membership required');
        }
        break;

      case 'USER':
        // Already checked authentication above
        break;

      default:
        // Custom permission checks handled in checkDocumentPermissions
        break;
    }
  }

  private async checkOrganizationRoles(context: AuthContext, requiredRoles: string[]): Promise<void> {
    if (!context.organizationId) {
      throw new ForbiddenError('Organization context required');
    }

    const userRole = await this.getUserOrganizationRole(context, context.user!.id, context.organizationId);

    if (!requiredRoles.includes(userRole)) {
      throw new ForbiddenError(`Insufficient role. Required: ${requiredRoles.join(', ')}, got: ${userRole}`);
    }
  }

  private async checkDocumentPermissions(
    context: AuthContext,
    parent: any,
    requiredPermissions: string[]
  ): Promise<void> {
    // Extract document ID from parent object or arguments
    const documentId = this.extractDocumentId(parent);
    if (!documentId) {
      // If no document context, skip document permission checks
      return;
    }

    const document = await context.dataLoaders.collaboration.document.load(documentId);
    if (!document) {
      throw new UserInputError('Document not found');
    }

    for (const permission of requiredPermissions) {
      const hasPermission = await this.checkSingleDocumentPermission(context, document, permission);
      if (!hasPermission) {
        throw new ForbiddenError(`Insufficient document permission: ${permission}`);
      }
    }
  }

  private async checkSingleDocumentPermission(
    context: AuthContext,
    document: Document,
    permission: string
  ): Promise<boolean> {
    const user = context.user!;

    // Document owner has all permissions
    if (document.ownerId === user.id) {
      return true;
    }

    // Check explicit document permissions
    const userPermissions = await this.getUserDocumentPermissions(context, user.id, document.id);

    switch (permission) {
      case 'VIEW':
        return userPermissions.canRead;
      case 'COMMENT':
        return userPermissions.canComment;
      case 'EDIT':
        return userPermissions.canWrite;
      case 'SHARE':
        return userPermissions.canShare;
      case 'MANAGE':
        return userPermissions.canManage;
      case 'DELETE':
        return userPermissions.canDelete;
      default:
        return false;
    }
  }

  private extractDocumentId(parent: any): string | null {
    // Try various common field names
    return parent?.id || parent?.documentId || parent?.document?.id || null;
  }

  private async getUserOrganizationRole(
    context: AuthContext,
    userId: string,
    organizationId: string
  ): Promise<string> {
    const cacheKey = `user_org_role:${userId}:${organizationId}`;
    const cached = await context.cache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const result = await context.db.queryOne(`
      SELECT role FROM organization_memberships
      WHERE user_id = $1 AND organization_id = $2 AND is_active = true
    `, [userId, organizationId]);

    const role = result?.role || 'NONE';
    await context.cache.set(cacheKey, role, 300); // Cache for 5 minutes

    return role;
  }

  private async checkOrganizationMembership(
    context: AuthContext,
    userId: string,
    organizationId: string
  ): Promise<boolean> {
    const role = await this.getUserOrganizationRole(context, userId, organizationId);
    return role !== 'NONE';
  }

  private async getUserDocumentPermissions(
    context: AuthContext,
    userId: string,
    documentId: string
  ): Promise<DocumentPermissionSet> {
    const cacheKey = `user_doc_perms:${userId}:${documentId}`;
    const cached = await context.cache.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // Check explicit document permissions
    const result = await context.db.queryOne(`
      SELECT dp.* FROM document_permissions dp
      WHERE dp.document_id = $1 AND dp.user_id = $2 AND dp.revoked_at IS NULL
    `, [documentId, userId]);

    let permissions: DocumentPermissionSet;

    if (result) {
      permissions = {
        canRead: ['VIEW', 'COMMENT', 'EDIT', 'MANAGE'].includes(result.permission),
        canComment: ['COMMENT', 'EDIT', 'MANAGE'].includes(result.permission),
        canWrite: ['EDIT', 'MANAGE'].includes(result.permission),
        canShare: ['SHARE', 'MANAGE'].includes(result.permission),
        canManage: result.permission === 'MANAGE',
        canDelete: result.permission === 'MANAGE'
      };
    } else {
      // Check organization-level permissions
      const document = await context.dataLoaders.collaboration.document.load(documentId);
      permissions = await this.getOrganizationDocumentPermissions(context, userId, document!);
    }

    await context.cache.set(cacheKey, JSON.stringify(permissions), 300);
    return permissions;
  }

  private async getOrganizationDocumentPermissions(
    context: AuthContext,
    userId: string,
    document: Document
  ): Promise<DocumentPermissionSet> {
    // Default permissions based on organization membership
    const userRole = await this.getUserOrganizationRole(context, userId, document.organizationId);

    switch (userRole) {
      case 'OWNER':
      case 'ADMIN':
        return {
          canRead: true,
          canComment: true,
          canWrite: true,
          canShare: true,
          canManage: true,
          canDelete: true
        };
      case 'MANAGER':
        return {
          canRead: true,
          canComment: true,
          canWrite: true,
          canShare: true,
          canManage: false,
          canDelete: false
        };
      case 'ANALYST':
      case 'VIEWER':
        return {
          canRead: true,
          canComment: true,
          canWrite: false,
          canShare: false,
          canManage: false,
          canDelete: false
        };
      default:
        return {
          canRead: false,
          canComment: false,
          canWrite: false,
          canShare: false,
          canManage: false,
          canDelete: false
        };
    }
  }
}

interface DocumentPermissionSet {
  canRead: boolean;
  canComment: boolean;
  canWrite: boolean;
  canShare: boolean;
  canManage: boolean;
  canDelete: boolean;
}

/**
 * @tenant directive implementation
 * Enforces multi-tenant data isolation
 */
export class TenantDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field: GraphQLField<any, any>) {
    const { resolve = defaultFieldResolver } = field;
    const { scope } = this.args;

    field.resolve = async (parent: any, args: any, context: AuthContext, info: any) => {
      // Ensure organization context exists for tenant isolation
      if (!context.organizationId && scope === 'ORGANIZATION') {
        throw new ForbiddenError('Organization context required');
      }

      // Add tenant filters to query arguments
      if (scope === 'ORGANIZATION') {
        args._tenantFilter = { organizationId: context.organizationId };
      }

      return resolve(parent, args, context, info);
    };
  }
}

/**
 * @rateLimit directive implementation
 * Implements field-level rate limiting
 */
export class RateLimitDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field: GraphQLField<any, any>) {
    const { resolve = defaultFieldResolver } = field;
    const { max, window, key } = this.args;

    field.resolve = async (parent: any, args: any, context: AuthContext, info: any) => {
      const rateLimitKey = key || `${info.fieldName}:${context.user?.id || 'anonymous'}`;
      const windowMs = this.parseTimeWindow(window);

      const result = await context.rateLimiter.checkLimit(rateLimitKey, max, windowMs);

      if (!result.allowed) {
        throw new ForbiddenError(
          `Rate limit exceeded. Try again in ${Math.ceil((result.resetTime.getTime() - Date.now()) / 1000)} seconds.`
        );
      }

      await context.rateLimiter.consume(rateLimitKey);
      return resolve(parent, args, context, info);
    };
  }

  private parseTimeWindow(window: string): number {
    const match = window.match(/^(\d+)([smhd])$/);
    if (!match) return 60000; // Default to 1 minute

    const [, amount, unit] = match;
    const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return parseInt(amount) * (multipliers[unit as keyof typeof multipliers] || 60000);
  }
}

/**
 * @audit directive implementation
 * Records audit logs for sensitive operations
 */
export class AuditDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field: GraphQLField<any, any>) {
    const { resolve = defaultFieldResolver } = field;
    const { level, action } = this.args;

    field.resolve = async (parent: any, args: any, context: AuthContext, info: any) => {
      const startTime = Date.now();
      let result: any;
      let error: any = null;

      try {
        result = await resolve(parent, args, context, info);
        return result;
      } catch (err) {
        error = err;
        throw err;
      } finally {
        // Record audit log
        await this.recordAuditLog(context, {
          action: action || info.fieldName,
          level,
          args: this.sanitizeArgs(args),
          result: result ? 'SUCCESS' : 'ERROR',
          error: error?.message,
          duration: Date.now() - startTime,
          fieldName: info.fieldName,
          parentType: info.parentType.name
        });
      }
    };
  }

  private async recordAuditLog(context: AuthContext, auditData: any): Promise<void> {
    try {
      await context.db.query(`
        INSERT INTO audit_logs (
          user_id, organization_id, action, level, args, result,
          error, duration, field_name, parent_type, ip_address,
          user_agent, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      `, [
        context.user?.id,
        context.organizationId,
        auditData.action,
        auditData.level,
        JSON.stringify(auditData.args),
        auditData.result,
        auditData.error,
        auditData.duration,
        auditData.fieldName,
        auditData.parentType,
        context.requestTracker?.ipAddress,
        context.requestTracker?.userAgent
      ]);
    } catch (error) {
      console.error('Failed to record audit log:', error);
      // Don't fail the request due to audit logging issues
    }
  }

  private sanitizeArgs(args: any): any {
    // Remove sensitive information from arguments before logging
    const sanitized = { ...args };
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];

    const sanitizeObject = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj;

      const result: any = Array.isArray(obj) ? [] : {};
      for (const [key, value] of Object.entries(obj)) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          result[key] = '[REDACTED]';
        } else if (typeof value === 'object') {
          result[key] = sanitizeObject(value);
        } else {
          result[key] = value;
        }
      }
      return result;
    };

    return sanitizeObject(sanitized);
  }
}

/**
 * @complexity directive implementation
 * Manages query complexity analysis
 */
export class ComplexityDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field: GraphQLField<any, any>) {
    const { value, multipliers } = this.args;

    // Store complexity information on the field for use by complexity analysis
    (field as any).complexity = {
      value: value || 1,
      multipliers: multipliers || []
    };
  }
}

// =============================================================================
// AUTHORIZATION UTILITIES
// =============================================================================

export async function validateDocumentAccess(
  user: any,
  document: Document,
  requiredPermission: string
): Promise<void> {
  if (!user) {
    throw new AuthenticationError('Authentication required');
  }

  // Document owner has all permissions
  if (document.ownerId === user.id) {
    return;
  }

  // Check if document is public and permission allows public access
  if (document.sharing?.isPublic && requiredPermission === 'VIEW') {
    return;
  }

  // For other cases, we need to check explicit permissions
  // This would be implemented based on the document permissions system
  throw new ForbiddenError(`Insufficient permission: ${requiredPermission}`);
}

export function hasDocumentPermission(
  document: Document,
  user: any,
  permission: DocumentPermission
): boolean {
  // Implementation would check user's permissions for the document
  return false; // Stub implementation
}

export function createAuthContext(req: any): Partial<AuthContext> {
  // Extract authentication information from request
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');

  return {
    isAuthenticated: !!token,
    // Additional context would be populated here
  };
}

// =============================================================================
// SCHEMA TRANSFORMATION
// =============================================================================

export function applyAuthDirectivesToSchema(schema: GraphQLSchema): GraphQLSchema {
  // Apply directive visitors to schema
  SchemaDirectiveVisitor.visitSchemaDirectives(schema, {
    auth: AuthDirective,
    tenant: TenantDirective,
    rateLimit: RateLimitDirective,
    audit: AuditDirective,
    complexity: ComplexityDirective
  });

  return schema;
}

export const collaborationAuthDirectives = [
  authDirective,
  tenantDirective,
  rateLimitDirective,
  auditDirective,
  complexityDirective
];

export default {
  directives: collaborationAuthDirectives,
  AuthDirective,
  TenantDirective,
  RateLimitDirective,
  AuditDirective,
  ComplexityDirective,
  validateDocumentAccess,
  hasDocumentPermission,
  applyAuthDirectivesToSchema
};

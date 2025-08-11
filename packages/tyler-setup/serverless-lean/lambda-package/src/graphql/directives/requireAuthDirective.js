/**
 * Authentication and Authorization Directive
 * Implements field-level authentication and role-based access control
 */

import { defaultFieldResolver } from 'graphql';
import { SchemaDirectiveVisitor } from '@graphql-tools/utils';
import { GraphQLError } from 'graphql';

/**
 * Authentication directive implementation
 * Usage: @requireAuth(role: ADMIN)
 */
export class RequireAuthDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field) {
    const { role } = this.args;
    const { resolve = defaultFieldResolver } = field;

    field.resolve = async function(parent, args, context, info) {
      const { user } = context;
      const fieldName = info.fieldName;

      // Check authentication
      if (!user) {
        await logUnauthorizedAccess(context, fieldName, 'No authentication');
        throw new GraphQLError('Authentication required');
      }

      // Check role-based authorization
      if (role && !hasRequiredRole(user, role)) {
        await logUnauthorizedAccess(context, fieldName, `Insufficient role: ${user.role} < ${role}`);
        throw new GraphQLError(`Access denied. Required role: ${role}`);
      }

      // Check contractor-specific permissions
      if (user.type === 'contractor') {
        const hasPermission = await checkContractorPermission(user, fieldName, args, context);
        if (!hasPermission) {
          await logUnauthorizedAccess(context, fieldName, 'Contractor permission denied');
          throw new GraphQLError('Contractor access denied for this operation');
        }
      }

      // Check account status
      if (!user.isActive && user.isActive !== undefined) {
        await logUnauthorizedAccess(context, fieldName, 'Account disabled');
        throw new GraphQLError('Account is disabled');
      }

      // Log successful access for audit
      if (context.logAudit && isAuditableField(fieldName)) {
        await context.logAudit({
          action: 'FIELD_ACCESS',
          resource: fieldName,
          details: {
            userType: user.type,
            role: user.role,
          },
        });
      }

      // Execute original resolver
      return resolve.call(this, parent, args, context, info);
    };
  }
}

/**
 * Check if user has required role
 */
function hasRequiredRole(user, requiredRole) {
  const roleHierarchy = {
    'READONLY': 1,
    'USER': 2,
    'ADMIN': 3,
  };

  const userRoleLevel = roleHierarchy[user.role?.toUpperCase()] || 0;
  const requiredRoleLevel = roleHierarchy[requiredRole.toUpperCase()] || 0;

  return userRoleLevel >= requiredRoleLevel;
}

/**
 * Check contractor-specific permissions
 */
async function checkContractorPermission(user, fieldName, args, context) {
  const { permissions = [], allowedSecrets = [] } = user;

  // Check if field requires specific permissions
  const fieldPermissions = getFieldPermissions(fieldName, args);

  // Check if contractor has required permissions
  for (const permission of fieldPermissions) {
    if (!permissions.includes(permission)) {
      return false;
    }
  }

  // For secret-related fields, check allowed secrets
  if (fieldName.toLowerCase().includes('secret') && args.name) {
    return allowedSecrets.includes(args.name);
  }

  // For listing secrets, filter to only allowed ones
  if (fieldName === 'secrets') {
    // This will be handled in the resolver with filtering
    return true;
  }

  // Check expiration
  if (user.expiresAt && Date.now() > user.expiresAt) {
    return false;
  }

  return true;
}

/**
 * Get required permissions for a field
 */
function getFieldPermissions(fieldName, args) {
  const fieldPermissionMap = {
    // Query fields
    'users': ['READ'],
    'user': ['READ'],
    'contractors': ['READ'],
    'contractor': ['READ'],
    'secrets': ['READ'],
    'secret': ['READ'],
    'auditLogs': ['READ'],
    'configs': ['READ'],
    'config': ['READ'],

    // Mutation fields
    'createUser': ['WRITE', 'ADMIN'],
    'updateUser': ['WRITE'],
    'deleteUser': ['DELETE', 'ADMIN'],
    'createSecret': ['WRITE'],
    'updateSecret': ['WRITE'],
    'deleteSecret': ['DELETE'],
    'updateConfig': ['WRITE', 'ADMIN'],
    'inviteContractor': ['ADMIN'],
    'revokeContractorAccess': ['ADMIN'],
  };

  return fieldPermissionMap[fieldName] || ['READ'];
}

/**
 * Check if field access should be audited
 */
function isAuditableField(fieldName) {
  const auditableFields = [
    'secrets',
    'secret',
    'users',
    'auditLogs',
    'performanceMetrics',
    'createUser',
    'updateUser',
    'deleteUser',
    'createSecret',
    'updateSecret',
    'deleteSecret',
    'inviteContractor',
    'revokeContractorAccess',
  ];

  return auditableFields.includes(fieldName);
}

/**
 * Log unauthorized access attempts
 */
async function logUnauthorizedAccess(context, fieldName, reason) {
  const { user, event } = context;
  const clientIP = event?.requestContext?.http?.sourceIp || 'unknown';
  const userAgent = event?.headers?.['user-agent'] || 'unknown';

  console.warn('Unauthorized access attempt:', {
    fieldName,
    reason,
    userId: user?.id,
    userType: user?.type,
    role: user?.role,
    clientIP,
    userAgent,
    timestamp: new Date().toISOString(),
  });

  if (context.logAudit) {
    await context.logAudit({
      action: 'UNAUTHORIZED_ACCESS',
      resource: fieldName,
      details: {
        reason,
        userType: user?.type,
        role: user?.role,
        clientIP,
        userAgent,
      },
    });
  }
}

/**
 * Advanced authorization with resource-based permissions
 */
export class ResourceBasedAuth {
  constructor() {
    this.resourcePermissions = new Map();
  }

  /**
   * Define resource permissions
   */
  defineResourcePermission(resource, permissions) {
    this.resourcePermissions.set(resource, permissions);
  }

  /**
   * Check if user can access resource
   */
  async canAccessResource(user, resource, operation) {
    const permissions = this.resourcePermissions.get(resource);
    if (!permissions) return true; // No restrictions

    const requiredPermission = permissions[operation];
    if (!requiredPermission) return true;

    // Check role-based permission
    if (requiredPermission.role && !hasRequiredRole(user, requiredPermission.role)) {
      return false;
    }

    // Check ownership
    if (requiredPermission.ownership && !await this.checkOwnership(user, resource)) {
      return false;
    }

    // Check custom permission function
    if (requiredPermission.customCheck) {
      return await requiredPermission.customCheck(user, resource, operation);
    }

    return true;
  }

  /**
   * Check resource ownership
   */
  async checkOwnership(user, resource) {
    // Implement ownership checking logic
    // This would typically involve database queries
    return true; // Simplified implementation
  }
}

/**
 * Context-based authorization
 */
export class ContextBasedAuth {
  /**
   * Check authorization based on context
   */
  static async checkContextAuth(user, context, fieldName, args) {
    // Time-based restrictions
    if (user.type === 'contractor') {
      const now = new Date();
      const hour = now.getHours();

      // Restrict contractor access to business hours (9 AM - 6 PM)
      if (hour < 9 || hour >= 18) {
        throw new GraphQLError('Contractor access is restricted to business hours (9 AM - 6 PM)');
      }
    }

    // Location-based restrictions (if IP geolocation is available)
    const clientIP = context.event?.requestContext?.http?.sourceIp;
    if (clientIP && user.type === 'contractor') {
      // Could implement IP geolocation checking here
    }

    // Rate limiting based on user type
    const rateLimitKey = `${fieldName}:${user.id}`;
    const rateLimitConfig = getRateLimitForUser(user);

    // Device-based restrictions
    const userAgent = context.event?.headers?.['user-agent'] || '';
    if (user.type === 'contractor' && isRestrictedDevice(userAgent)) {
      throw new GraphQLError('Access from this device type is not permitted');
    }

    return true;
  }
}

/**
 * Get rate limit configuration for user type
 */
function getRateLimitForUser(user) {
  const configs = {
    admin: { requests: 1000, window: 60000 },
    user: { requests: 500, window: 60000 },
    contractor: { requests: 100, window: 60000 },
  };

  return configs[user.role] || configs.user;
}

/**
 * Check if device is restricted
 */
function isRestrictedDevice(userAgent) {
  const restrictedPatterns = [
    /mobile/i,     // Mobile devices
    /android/i,    // Android devices
    /iphone/i,     // iPhone devices
    /tablet/i,     // Tablet devices
  ];

  return restrictedPatterns.some(pattern => pattern.test(userAgent));
}

/**
 * Multi-factor authentication check
 */
export class MFAAuth {
  /**
   * Check if MFA is required for operation
   */
  static requiresMFA(fieldName, user) {
    const mfaRequiredFields = [
      'deleteUser',
      'deleteSecret',
      'revokeContractorAccess',
      'clearCache',
    ];

    const adminOnlyMFA = [
      'performanceMetrics',
      'auditLogs',
    ];

    if (mfaRequiredFields.includes(fieldName)) {
      return true;
    }

    if (adminOnlyMFA.includes(fieldName) && user?.role === 'admin') {
      return true;
    }

    return false;
  }

  /**
   * Verify MFA token
   */
  static async verifyMFA(user, token, context) {
    // Implement MFA verification logic
    // This could integrate with services like AWS Cognito, Auth0, etc.

    // For now, return true (simplified implementation)
    return true;
  }
}

export { RequireAuthDirective as requireAuthDirective };

import { GraphQLSchema, defaultFieldResolver, GraphQLError } from 'graphql';
import { mapSchema, getDirective, MapperKind } from '@graphql-tools/utils';
import { GraphQLFieldConfig } from 'graphql';
import jwt from 'jsonwebtoken';

// User roles enum
export enum UserRole {
  VIEWER = 'VIEWER',
  ANALYST = 'ANALYST',
  INCIDENT_RESPONDER = 'INCIDENT_RESPONDER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

// Permission system
export interface Permission {
  resource: string;
  action: string;
  scope?: string;
}

// Authentication context
export interface AuthContext {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    permissions: Permission[];
    organizationId: string;
  };
  token?: string;
  organizationId?: string;
  permissions?: Permission[];
  rateLimitKey?: string;
}

// Role hierarchy (higher roles include lower role permissions)
const ROLE_HIERARCHY = {
  [UserRole.VIEWER]: 0,
  [UserRole.ANALYST]: 1,
  [UserRole.INCIDENT_RESPONDER]: 2,
  [UserRole.ADMIN]: 3,
  [UserRole.SUPER_ADMIN]: 4,
};

// Check if user has required role or higher
export const hasRequiredRole = (userRole: UserRole, requiredRole: UserRole): boolean => {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
};

// Check if user has specific permission
export const hasPermission = (userPermissions: Permission[], resource: string, action: string): boolean => {
  return userPermissions.some(
    permission =>
      permission.resource === resource && permission.action === action
  );
};

// JWT verification utility
export const verifyJWT = async (token: string): Promise<any> => {
  try {
    // In production, use your actual JWT secret and verification logic
    const secret = process.env.JWT_SECRET || 'your-jwt-secret';
    const decoded = jwt.verify(token, secret) as any;
    
    return {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions || [],
      organizationId: decoded.organizationId,
    };
  } catch (error) {
    throw new GraphQLError('Invalid or expired token', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
};

// @auth directive implementation
export const authDirectiveTransformer = (schema: GraphQLSchema, directiveName = 'auth'): GraphQLSchema => {
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig: GraphQLFieldConfig<any, any>) => {
      const authDirective = getDirective(schema, fieldConfig, directiveName)?.[0];
      
      if (authDirective) {
        const { requires } = authDirective;
        const requiredRole = requires || UserRole.VIEWER;
        
        const { resolve = defaultFieldResolver } = fieldConfig;
        
        fieldConfig.resolve = async (source, args, context: AuthContext, info) => {
          // Check if user is authenticated
          if (!context.user) {
            throw new GraphQLError('Authentication required', {
              extensions: {
                code: 'UNAUTHENTICATED',
                requiredRole,
              },
            });
          }
          
          // Check role authorization
          if (!hasRequiredRole(context.user.role, requiredRole)) {
            throw new GraphQLError(
              `Access denied. Required role: ${requiredRole}, current role: ${context.user.role}`,
              {
                extensions: {
                  code: 'FORBIDDEN',
                  requiredRole,
                  currentRole: context.user.role,
                },
              }
            );
          }
          
          // Call the original resolver
          return resolve(source, args, context, info);
        };
      }
      
      return fieldConfig;
    },
  });
};

// @organizationScope directive implementation
export const organizationScopeDirectiveTransformer = (
  schema: GraphQLSchema,
  directiveName = 'organizationScope'
): GraphQLSchema => {
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig: GraphQLFieldConfig<any, any>) => {
      const orgScopeDirective = getDirective(schema, fieldConfig, directiveName)?.[0];
      
      if (orgScopeDirective) {
        const { resolve = defaultFieldResolver } = fieldConfig;
        
        fieldConfig.resolve = async (source, args, context: AuthContext, info) => {
          // Ensure user is authenticated
          if (!context.user?.organizationId) {
            throw new GraphQLError('Organization context required', {
              extensions: { code: 'ORGANIZATION_REQUIRED' },
            });
          }
          
          // Inject organization filter into arguments if not present
          if (args && typeof args === 'object') {
            // For queries that expect organizationId parameter
            if ('organizationId' in args) {
              // Verify user has access to requested organization
              if (args.organizationId && args.organizationId !== context.user.organizationId) {
                // Super admins can access any organization
                if (context.user.role !== UserRole.SUPER_ADMIN) {
                  throw new GraphQLError('Access denied to specified organization', {
                    extensions: { code: 'FORBIDDEN' },
                  });
                }
              }
              // Set to user's organization if not specified
              if (!args.organizationId) {
                args.organizationId = context.user.organizationId;
              }
            }
            
            // For filter objects that might contain organizationId
            if (args.filter && typeof args.filter === 'object') {
              args.filter.organizationId = context.user.organizationId;
            }
            
            // For input objects that might need organization scoping
            if (args.input && typeof args.input === 'object') {
              args.input.organizationId = context.user.organizationId;
            }
          }
          
          return resolve(source, args, context, info);
        };
      }
      
      return fieldConfig;
    },
  });
};

// Rate limiting directive
interface RateLimitState {
  requests: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitState>();

export const rateLimitDirectiveTransformer = (
  schema: GraphQLSchema,
  directiveName = 'rateLimit'
): GraphQLSchema => {
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig: GraphQLFieldConfig<any, any>) => {
      const rateLimitDirective = getDirective(schema, fieldConfig, directiveName)?.[0];
      
      if (rateLimitDirective) {
        const { max, window } = rateLimitDirective;
        const { resolve = defaultFieldResolver } = fieldConfig;
        
        fieldConfig.resolve = async (source, args, context: AuthContext, info) => {
          const key = context.rateLimitKey || context.user?.id || 'anonymous';
          const now = Date.now();
          const windowMs = window * 1000;
          
          let state = rateLimitStore.get(key);
          
          if (!state || now > state.resetTime) {
            state = { requests: 0, resetTime: now + windowMs };
            rateLimitStore.set(key, state);
          }
          
          if (state.requests >= max) {
            const retryAfter = Math.ceil((state.resetTime - now) / 1000);
            throw new GraphQLError(`Rate limit exceeded. Try again in ${retryAfter} seconds`, {
              extensions: {
                code: 'RATE_LIMITED',
                retryAfter,
                limit: max,
                window,
              },
            });
          }
          
          state.requests++;
          
          return resolve(source, args, context, info);
        };
      }
      
      return fieldConfig;
    },
  });
};

// Audit logging directive
export interface AuditLogEntry {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  organizationId: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  changes?: any;
  result: 'SUCCESS' | 'FAILURE' | 'ERROR';
  error?: string;
}

// Audit logger interface (implement based on your logging infrastructure)
export interface AuditLogger {
  log(entry: AuditLogEntry): Promise<void>;
}

export const auditLogDirectiveTransformer = (
  schema: GraphQLSchema,
  auditLogger: AuditLogger,
  directiveName = 'auditLog'
): GraphQLSchema => {
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig: GraphQLFieldConfig<any, any>) => {
      const auditDirective = getDirective(schema, fieldConfig, directiveName)?.[0];
      
      if (auditDirective) {
        const { resolve = defaultFieldResolver } = fieldConfig;
        
        fieldConfig.resolve = async (source, args, context: AuthContext, info) => {
          const startTime = Date.now();
          let result: any;
          let auditResult: 'SUCCESS' | 'FAILURE' | 'ERROR' = 'SUCCESS';
          let error: string | undefined;
          
          try {
            // Execute the original resolver
            result = await resolve(source, args, context, info);
            
            // Check if the result indicates failure
            if (result && typeof result === 'object' && result.success === false) {
              auditResult = 'FAILURE';
            }
            
          } catch (err: any) {
            auditResult = 'ERROR';
            error = err.message;
            throw err; // Re-throw the error
          } finally {
            // Log the action regardless of success/failure
            if (context.user) {
              const auditEntry: AuditLogEntry = {
                userId: context.user.id,
                action: info.fieldName,
                resource: info.parentType.name,
                resourceId: args?.id || args?.input?.id,
                organizationId: context.user.organizationId,
                timestamp: new Date(),
                ipAddress: context.user.ipAddress,
                userAgent: context.user.userAgent,
                changes: args,
                result: auditResult,
                error,
              };
              
              // Log asynchronously to avoid blocking the response
              auditLogger.log(auditEntry).catch(logError => {
                console.error('Failed to log audit entry:', logError);
              });
            }
          }
          
          return result;
        };
      }
      
      return fieldConfig;
    },
  });
};

// Query complexity directive
export const complexityDirectiveTransformer = (
  schema: GraphQLSchema,
  directiveName = 'complexity'
): GraphQLSchema => {
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig: GraphQLFieldConfig<any, any>) => {
      const complexityDirective = getDirective(schema, fieldConfig, directiveName)?.[0];
      
      if (complexityDirective) {
        const { value } = complexityDirective;
        
        // Store complexity value for later use by complexity analysis
        fieldConfig.extensions = {
          ...fieldConfig.extensions,
          complexity: value,
        };
      }
      
      return fieldConfig;
    },
  });
};

// Field-level permission checking
export const fieldPermissionCheck = (
  resource: string,
  action: string,
  context: AuthContext
): void => {
  if (!context.user) {
    throw new GraphQLError('Authentication required for field access', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  
  if (!hasPermission(context.user.permissions, resource, action)) {
    throw new GraphQLError(
      `Insufficient permissions for ${action} on ${resource}`,
      {
        extensions: {
          code: 'INSUFFICIENT_PERMISSIONS',
          requiredPermission: { resource, action },
        },
      }
    );
  }
};

// Data masking for sensitive fields based on permissions
export const maskSensitiveData = (
  data: any,
  fieldName: string,
  context: AuthContext
): any => {
  if (!context.user) {
    return '[REDACTED]';
  }
  
  // Define field-level permissions
  const sensitiveFields: Record<string, { resource: string; action: string }> = {
    'User.email': { resource: 'USER', action: 'READ_PII' },
    'User.phoneNumber': { resource: 'USER', action: 'READ_PII' },
    'Asset.configuration': { resource: 'ASSET', action: 'READ_CONFIG' },
    'Certificate.privateKey': { resource: 'CERTIFICATE', action: 'READ_PRIVATE' },
    'Alert.evidence': { resource: 'ALERT', action: 'READ_EVIDENCE' },
  };
  
  const permission = sensitiveFields[fieldName];
  if (permission && !hasPermission(context.user.permissions, permission.resource, permission.action)) {
    return '[REDACTED]';
  }
  
  return data;
};

// Context creator with authentication
export const createAuthenticatedContext = async (
  request: any
): Promise<AuthContext> => {
  const token = extractTokenFromRequest(request);
  
  if (!token) {
    return {}; // No authentication provided
  }
  
  try {
    const user = await verifyJWT(token);
    return {
      user,
      token,
      organizationId: user.organizationId,
      permissions: user.permissions,
      rateLimitKey: `${user.id}-${user.organizationId}`,
    };
  } catch (error) {
    console.error('Authentication error:', error);
    throw new GraphQLError('Invalid authentication token', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
};

// Extract token from various sources
const extractTokenFromRequest = (request: any): string | null => {
  // Check Authorization header
  const authHeader = request.headers?.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Check query parameter (for WebSocket subscriptions)
  if (request.connectionParams?.Authorization) {
    return request.connectionParams.Authorization.replace('Bearer ', '');
  }
  
  // Check cookies
  if (request.cookies?.token) {
    return request.cookies.token;
  }
  
  return null;
};

// Permission-based field filtering
export const filterFieldsByPermission = (
  fields: string[],
  context: AuthContext,
  resourceType: string
): string[] => {
  if (!context.user) {
    return []; // No fields accessible without authentication
  }
  
  return fields.filter(field => {
    // Define field-level permissions mapping
    const fieldPermissions: Record<string, string> = {
      'User.email': 'READ_PII',
      'User.phoneNumber': 'READ_PII',
      'Asset.configuration': 'READ_CONFIG',
      'Alert.evidence': 'READ_EVIDENCE',
      'Incident.forensicData': 'READ_FORENSICS',
    };
    
    const requiredAction = fieldPermissions[`${resourceType}.${field}`];
    if (!requiredAction) {
      return true; // No specific permission required
    }
    
    return hasPermission(context.user.permissions, resourceType.toUpperCase(), requiredAction);
  });
};

// Dynamic permission checking based on data ownership
export const checkDataOwnership = (
  data: any,
  context: AuthContext,
  ownershipField = 'ownerId'
): boolean => {
  if (!context.user) {
    return false;
  }
  
  // Super admins have access to everything
  if (context.user.role === UserRole.SUPER_ADMIN) {
    return true;
  }
  
  // Check if user owns the data
  if (data[ownershipField] === context.user.id) {
    return true;
  }
  
  // Check organization scope
  if (data.organizationId === context.user.organizationId) {
    return context.user.role === UserRole.ADMIN || context.user.role === UserRole.INCIDENT_RESPONDER;
  }
  
  return false;
};

// Apply all directive transformers to a schema
export const applyDirectiveTransformers = (
  schema: GraphQLSchema,
  auditLogger: AuditLogger
): GraphQLSchema => {
  let transformedSchema = schema;
  
  // Apply transformers in order
  transformedSchema = authDirectiveTransformer(transformedSchema);
  transformedSchema = organizationScopeDirectiveTransformer(transformedSchema);
  transformedSchema = rateLimitDirectiveTransformer(transformedSchema);
  transformedSchema = auditLogDirectiveTransformer(transformedSchema, auditLogger);
  transformedSchema = complexityDirectiveTransformer(transformedSchema);
  
  return transformedSchema;
};

// Export utility functions
export {
  extractTokenFromRequest,
  maskSensitiveData,
  fieldPermissionCheck,
  filterFieldsByPermission,
  checkDataOwnership,
};
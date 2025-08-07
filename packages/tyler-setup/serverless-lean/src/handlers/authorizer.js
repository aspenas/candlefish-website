import { verifyJwtToken } from '../utils/security.js';
import { logAudit } from '../utils/helpers.js';

export const handler = async (event) => {
  try {
    const token = event.authorizationToken?.replace('Bearer ', '');
    
    if (!token) {
      console.error('No authorization token provided');
      throw new Error('Unauthorized');
    }
    
    // Verify JWT token using secure method
    const decoded = await verifyJwtToken(token);
    
    // Check token expiration (additional check)
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      console.error('Token expired:', new Date(decoded.exp * 1000));
      throw new Error('Token expired');
    }
    
    // Validate required claims
    if (!decoded.id || !decoded.email || !decoded.role) {
      console.error('Invalid token claims:', decoded);
      throw new Error('Invalid token');
    }
    
    // Generate policy based on user role
    const policy = generatePolicy(decoded, event.methodArn);
    
    // Log successful authorization for audit
    await logAudit({
      action: 'AUTH_SUCCESS',
      userId: decoded.id,
      resource: event.methodArn,
      ip: event.requestContext?.identity?.sourceIp,
    });
    
    return {
      principalId: decoded.id,
      policyDocument: policy,
      context: {
        userId: decoded.id,
        email: decoded.email,
        role: decoded.role,
        type: decoded.type || 'employee',
        name: decoded.name,
      },
    };
  } catch (error) {
    console.error('Authorization error:', error.message);
    
    // Log failed authorization attempts
    try {
      await logAudit({
        action: 'AUTH_FAILED',
        reason: error.message,
        resource: event.methodArn,
        ip: event.requestContext?.identity?.sourceIp,
      });
    } catch (auditError) {
      console.error('Failed to log audit:', auditError);
    }
    
    throw new Error('Unauthorized');
  }
};

/**
 * Generate IAM policy based on user role and resource
 */
function generatePolicy(user, methodArn) {
  const policy = {
    Version: '2012-10-17',
    Statement: [],
  };
  
  // Base permissions for all authenticated users
  const baseResource = methodArn.split('/').slice(0, 4).join('/') + '/*';
  
  // Role-based access control
  switch (user.role) {
    case 'admin':
      // Admins have full access
      policy.Statement.push({
        Action: 'execute-api:Invoke',
        Effect: 'Allow',
        Resource: baseResource,
      });
      break;
      
    case 'manager':
      // Managers have access to most endpoints except sensitive admin operations
      policy.Statement.push(
        {
          Action: 'execute-api:Invoke',
          Effect: 'Allow',
          Resource: baseResource,
        },
        {
          Action: 'execute-api:Invoke',
          Effect: 'Deny',
          Resource: [
            baseResource.replace('*', 'users/*/delete'),
            baseResource.replace('*', 'config/*'),
          ],
        }
      );
      break;
      
    case 'employee':
      // Employees have limited access
      const allowedPaths = [
        'health',
        'users/' + user.id, // Own user data only
        'secrets', // Read-only secrets
        'audit', // Own audit logs
      ];
      
      policy.Statement.push({
        Action: 'execute-api:Invoke',
        Effect: 'Allow',
        Resource: allowedPaths.map(path => baseResource.replace('*', path)),
      });
      break;
      
    default:
      // Unknown role - deny access
      policy.Statement.push({
        Action: 'execute-api:Invoke',
        Effect: 'Deny',
        Resource: baseResource,
      });
  }
  
  return policy;
}
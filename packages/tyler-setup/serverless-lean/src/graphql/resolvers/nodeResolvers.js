/**
 * Node Interface Resolvers for Relay Global Object Identification
 * Optimized for efficient entity resolution
 */

/**
 * Node interface resolver for global ID resolution
 */
export const nodeResolvers = {
  __resolveType(obj) {
    // Determine the GraphQL type based on object properties
    if (obj.email && obj.role) {
      return 'User';
    }
    if (obj.company && obj.permissions) {
      return 'Contractor';
    }
    if (obj.value !== undefined) {
      return 'Secret';
    }
    if (obj.action && obj.timestamp) {
      return 'AuditLog';
    }
    if (obj.key && obj.category) {
      return 'Config';
    }
    return null;
  },
};

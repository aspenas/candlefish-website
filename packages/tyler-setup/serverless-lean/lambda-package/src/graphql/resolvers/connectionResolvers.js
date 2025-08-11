/**
 * Connection Resolvers for Relay-style Pagination
 * Optimized for efficient cursor-based pagination
 */

/**
 * Connection interface resolvers
 */
export const connectionResolvers = {
  Connection: {
    __resolveType(obj) {
      // Determine connection type based on first edge node
      if (obj.edges && obj.edges.length > 0) {
        const firstNode = obj.edges[0].node;

        if (firstNode.email && firstNode.role) {
          return 'UserConnection';
        }
        if (firstNode.company && firstNode.permissions) {
          return 'ContractorConnection';
        }
        if (firstNode.value !== undefined) {
          return 'SecretConnection';
        }
        if (firstNode.action && firstNode.timestamp) {
          return 'AuditLogConnection';
        }
        if (firstNode.key && firstNode.category) {
          return 'ConfigConnection';
        }
      }

      // Default to generic connection
      return 'Connection';
    },
  },

  Edge: {
    __resolveType(obj) {
      // Determine edge type based on node
      const node = obj.node;

      if (node.email && node.role) {
        return 'UserEdge';
      }
      if (node.company && node.permissions) {
        return 'ContractorEdge';
      }
      if (node.value !== undefined) {
        return 'SecretEdge';
      }
      if (node.action && node.timestamp) {
        return 'AuditLogEdge';
      }
      if (node.key && node.category) {
        return 'ConfigEdge';
      }

      // Default to generic edge
      return 'Edge';
    },
  },
};

import { ApolloGateway, IntrospectAndCompose } from '@apollo/gateway';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { readFileSync } from 'fs';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { createComplexityLimitRule } from 'graphql-query-complexity';
import depthLimit from 'graphql-depth-limit';
import costAnalysis from 'graphql-cost-analysis';

// Microservice endpoints configuration
const subgraphs = [
  { name: 'auth', url: process.env.AUTH_SERVICE_URL || 'http://localhost:4001/graphql' },
  { name: 'events', url: process.env.EVENT_SERVICE_URL || 'http://localhost:4002/graphql' },
  { name: 'alerts', url: process.env.ALERT_SERVICE_URL || 'http://localhost:4003/graphql' },
  { name: 'assets', url: process.env.ASSET_SERVICE_URL || 'http://localhost:4004/graphql' },
  { name: 'compliance', url: process.env.COMPLIANCE_SERVICE_URL || 'http://localhost:4005/graphql' },
  { name: 'threats', url: process.env.THREAT_SERVICE_URL || 'http://localhost:4006/graphql' },
  { name: 'incidents', url: process.env.INCIDENT_SERVICE_URL || 'http://localhost:4007/graphql' },
  { name: 'vulnerabilities', url: process.env.VULN_SERVICE_URL || 'http://localhost:4008/graphql' }
];

// Gateway configuration with Apollo Federation v2
const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({
    subgraphs
  }),
  // Enable subscription support
  subscriptions: {
    'subscriptions-transport-ws': {
      onConnect: (connectionParams: any, websocket: any, context: any) => {
        // Extract JWT token from connection params for WebSocket auth
        const token = connectionParams?.Authorization || connectionParams?.authorization;
        if (token) {
          return { token: token.replace('Bearer ', '') };
        }
        throw new Error('Authentication token required for subscriptions');
      }
    }
  },
  // Custom schema transforms for security
  experimental_didResolveQueryPlan({ queryPlan, requestContext }) {
    // Log query plans for monitoring and debugging
    console.log('Query plan:', JSON.stringify(queryPlan, null, 2));
    return queryPlan;
  },
  buildService: ({ name, url }) => {
    return {
      url,
      // Add authentication headers to subgraph requests
      willSendRequest({ request, context }: { request: any; context: any }) {
        if (context.token) {
          request.http.headers.set('authorization', `Bearer ${context.token}`);
        }
        // Add organization context
        if (context.organizationId) {
          request.http.headers.set('x-organization-id', context.organizationId);
        }
        // Add request tracing
        request.http.headers.set('x-gateway-request-id', context.requestId);
      }
    };
  }
});

// Query complexity rules
const createComplexityRule = () => createComplexityLimitRule(1000, {
  // Define complexity for different field types
  scalarCost: 1,
  objectCost: 2,
  listFactor: 10,
  introspectionCost: 100,
  maximumCost: 1000,
  // Custom field complexity
  fieldExtensionOptions: {
    // High complexity for aggregation queries
    'vulnerabilityAggregates': { complexity: 50 },
    'alertAggregates': { complexity: 50 },
    'threatIntelligenceSearch': { complexity: 100 },
    'complianceReport': { complexity: 200 }
  },
  onComplete: (complexity: number, context: any) => {
    console.log(`Query complexity: ${complexity}`, {
      requestId: context.requestId,
      organizationId: context.organizationId
    });
  }
});

// Rate limiting configuration
interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (context: any) => string;
}

const rateLimitConfig: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
  keyGenerator: (context: any) => {
    // Rate limit by user + organization
    return `${context.userId}-${context.organizationId}`;
  }
};

// Apollo Server with Federation Gateway
export const createGatewayServer = async () => {
  const server = new ApolloServer({
    gateway,
    // Security validation rules
    validationRules: [
      depthLimit(10), // Maximum query depth of 10
      createComplexityRule(), // Query complexity analysis
      costAnalysis({
        maximumCost: 1000,
        createError: (max: number, actual: number) => {
          return new Error(`Query cost ${actual} exceeds maximum cost ${max}`);
        }
      })
    ],
    // Context creation for authentication and authorization
    context: async ({ req }: { req: any }) => {
      // Extract JWT token
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      // Generate unique request ID for tracing
      const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      let userId: string | undefined;
      let organizationId: string | undefined;
      let userRole: string | undefined;
      let permissions: string[] = [];

      if (token) {
        try {
          // Verify JWT token (integrate with your auth service)
          const decoded = await verifyJWT(token);
          userId = decoded.sub;
          organizationId = decoded.organizationId;
          userRole = decoded.role;
          permissions = decoded.permissions || [];
        } catch (error) {
          console.error('JWT verification failed:', error);
          throw new Error('Invalid authentication token');
        }
      }

      return {
        token,
        userId,
        organizationId,
        userRole,
        permissions,
        requestId,
        // Rate limiting context
        rateLimitKey: rateLimitConfig.keyGenerator?.({ userId, organizationId })
      };
    },
    // Error formatting
    formatError: (error: any) => {
      console.error('GraphQL Error:', {
        message: error.message,
        path: error.path,
        extensions: error.extensions
      });

      // Don't expose internal errors in production
      if (process.env.NODE_ENV === 'production') {
        if (error.extensions?.code === 'INTERNAL_ERROR') {
          return new Error('Internal server error');
        }
      }

      return error;
    },
    // Response formatting
    formatResponse: (response: any, { context }: { context: any }) => {
      // Add request metadata to response
      if (response.extensions) {
        response.extensions.requestId = context.requestId;
        response.extensions.organizationId = context.organizationId;
      }
      return response;
    }
  });

  return server;
};

// JWT verification helper (implement based on your auth service)
async function verifyJWT(token: string): Promise<{
  sub: string;
  organizationId: string;
  role: string;
  permissions: string[];
}> {
  // This should integrate with your JWT verification service
  // For now, returning a mock implementation
  try {
    // Use your JWT library to verify and decode
    const decoded = {
      sub: 'user-123',
      organizationId: 'org-456',
      role: 'ADMIN',
      permissions: ['READ_ASSETS', 'WRITE_ASSETS', 'READ_VULNERABILITIES']
    };
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

// Gateway startup
export const startGateway = async (port: number = 4000) => {
  const server = await createGatewayServer();
  
  const { url } = await startStandaloneServer(server, {
    listen: { port },
    context: async ({ req }) => {
      // Context is already handled in server creation
      return {};
    }
  });

  console.log(`🚀 Security Dashboard GraphQL Gateway ready at ${url}`);
  console.log(`🔗 Subgraphs: ${subgraphs.map(s => s.name).join(', ')}`);
  
  return { server, url };
};

// Health check endpoint for microservices
export const healthCheck = async (): Promise<{
  gateway: 'healthy' | 'unhealthy';
  subgraphs: Array<{
    name: string;
    url: string;
    status: 'healthy' | 'unhealthy';
    responseTime?: number;
  }>;
}> => {
  const subgraphStatuses = await Promise.all(
    subgraphs.map(async ({ name, url }) => {
      const start = Date.now();
      try {
        const response = await fetch(`${url.replace('/graphql', '/health')}`);
        const responseTime = Date.now() - start;
        return {
          name,
          url,
          status: response.ok ? 'healthy' as const : 'unhealthy' as const,
          responseTime
        };
      } catch (error) {
        return {
          name,
          url,
          status: 'unhealthy' as const
        };
      }
    })
  );

  const allHealthy = subgraphStatuses.every(s => s.status === 'healthy');

  return {
    gateway: allHealthy ? 'healthy' : 'unhealthy',
    subgraphs: subgraphStatuses
  };
};

// Export configuration for use in other files
export { subgraphs, rateLimitConfig };
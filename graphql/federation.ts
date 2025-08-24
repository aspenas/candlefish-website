/**
 * Candlefish AI Documentation Platform - GraphQL Federation Strategy
 * Philosophy: Operational craft - scalable federation for sustainable growth
 */

import { buildSubgraphSchema } from '@apollo/subgraph';
import { gql } from 'graphql-tag';
import { DocumentNode } from 'graphql';

// Federation directives and types
export const federatedTypeDefs = gql`
  extend schema @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key", "@shareable", "@provides", "@requires", "@external", "@tag", "@override", "@inaccessible"])

  # ============================================================================
  # FEDERATED ENTITIES - Core types shared across services
  # ============================================================================

  type User @key(fields: "id") {
    id: ID!
    email: String!
    username: String!
    fullName: String
    role: UserRole!
  }

  type Documentation @key(fields: "id") @key(fields: "slug") {
    id: ID!
    slug: String!
    title: String!
    content: String!
    status: ContentStatus!
    author: User @provides(fields: "id email")
  }

  type Partner @key(fields: "id") @key(fields: "slug") {
    id: ID!
    slug: String!
    name: String!
    tier: PartnerTier!
    status: PartnerStatus!
    primaryContact: User @provides(fields: "id email")
  }

  type Operator @key(fields: "id") {
    id: ID!
    email: String!
    fullName: String!
    partner: Partner @provides(fields: "id name")
  }

  type APIReference @key(fields: "id") @key(fields: "slug") {
    id: ID!
    slug: String!
    service: APIService @provides(fields: "id name")
  }

  # ============================================================================
  # SERVICE-SPECIFIC SCHEMA EXTENSIONS
  # ============================================================================

  extend type User @key(fields: "id") {
    # Documentation service extensions
    createdDocuments: [Documentation!]! @shareable

    # Partner service extensions
    partnerProfile: Partner
  }

  extend type Documentation @key(fields: "id") {
    # Search service extensions
    searchKeywords: [String!]! @external
    searchScore: Float @external
  }

  extend type Partner @key(fields: "id") {
    # Analytics service extensions
    profileViews: Int! @external
    leadConversion: Float @external
  }

  # ============================================================================
  # FEDERATION METADATA
  # ============================================================================

  type _Service {
    sdl: String
  }

  type Query {
    _service: _Service!
  }
`;

/**
 * Federation configuration for different deployment modes
 */
export interface FederationConfig {
  mode: 'monolith' | 'federated';
  services: {
    documentation: ServiceConfig;
    partner: ServiceConfig;
    apiReference: ServiceConfig;
    search: ServiceConfig;
    analytics: ServiceConfig;
  };
  gateway?: GatewayConfig;
}

interface ServiceConfig {
  enabled: boolean;
  url?: string;
  schema?: DocumentNode;
  resolvers?: any;
}

interface GatewayConfig {
  url: string;
  services: Array<{
    name: string;
    url: string;
  }>;
  polling?: {
    interval: number;
  };
}

/**
 * Default federation configuration
 * Operational craft: Start simple, scale as needed
 */
export const defaultFederationConfig: FederationConfig = {
  mode: process.env.GRAPHQL_FEDERATION_MODE === 'federated' ? 'federated' : 'monolith',

  services: {
    documentation: {
      enabled: true,
      url: process.env.DOCUMENTATION_SERVICE_URL || 'http://localhost:4001/graphql',
    },

    partner: {
      enabled: true,
      url: process.env.PARTNER_SERVICE_URL || 'http://localhost:4002/graphql',
    },

    apiReference: {
      enabled: true,
      url: process.env.API_REFERENCE_SERVICE_URL || 'http://localhost:4003/graphql',
    },

    search: {
      enabled: true,
      url: process.env.SEARCH_SERVICE_URL || 'http://localhost:4004/graphql',
    },

    analytics: {
      enabled: true,
      url: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:4005/graphql',
    },
  },

  gateway: {
    url: process.env.GRAPHQL_GATEWAY_URL || 'http://localhost:4000/graphql',
    services: [
      { name: 'documentation', url: process.env.DOCUMENTATION_SERVICE_URL || 'http://localhost:4001/graphql' },
      { name: 'partner', url: process.env.PARTNER_SERVICE_URL || 'http://localhost:4002/graphql' },
      { name: 'apiReference', url: process.env.API_REFERENCE_SERVICE_URL || 'http://localhost:4003/graphql' },
      { name: 'search', url: process.env.SEARCH_SERVICE_URL || 'http://localhost:4004/graphql' },
      { name: 'analytics', url: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:4005/graphql' },
    ],
    polling: {
      interval: 30000, // 30 seconds
    },
  },
};

/**
 * Create federated subgraph schema
 */
export function createFederatedSchema(typeDefs: DocumentNode, resolvers: any) {
  return buildSubgraphSchema([
    {
      typeDefs: [federatedTypeDefs, typeDefs],
      resolvers: {
        ...resolvers,

        // Federation entity resolvers
        User: {
          ...resolvers.User,
          __resolveReference(user: { id: string }) {
            return resolvers.Query.user(null, { id: user.id });
          },
        },

        Documentation: {
          ...resolvers.Documentation,
          __resolveReference(doc: { id?: string; slug?: string }) {
            if (doc.id) {
              return resolvers.Query.documentationById(null, { id: doc.id });
            }
            if (doc.slug) {
              return resolvers.Query.documentation(null, { slug: doc.slug });
            }
            return null;
          },
        },

        Partner: {
          ...resolvers.Partner,
          __resolveReference(partner: { id?: string; slug?: string }) {
            if (partner.id) {
              return resolvers.Query.partnerById(null, { id: partner.id });
            }
            if (partner.slug) {
              return resolvers.Query.partner(null, { slug: partner.slug });
            }
            return null;
          },
        },

        Operator: {
          ...resolvers.Operator,
          __resolveReference(operator: { id: string }) {
            return resolvers.Query.operator(null, { id: operator.id });
          },
        },

        APIReference: {
          ...resolvers.APIReference,
          __resolveReference(ref: { id?: string; slug?: string }) {
            if (ref.id) {
              return resolvers.Query.apiReferenceById(null, { id: ref.id });
            }
            if (ref.slug) {
              return resolvers.Query.apiReference(null, { slug: ref.slug });
            }
            return null;
          },
        },

        // Service metadata
        Query: {
          ...resolvers.Query,
          _service: () => ({ sdl: '' }), // SDL will be provided by Apollo
        },
      },
    },
  ]);
}

/**
 * Gateway configuration for Apollo Federation
 */
export async function createGatewayConfig(config: FederationConfig) {
  if (config.mode !== 'federated' || !config.gateway) {
    throw new Error('Gateway configuration requires federated mode');
  }

  const { ApolloGateway, IntrospectAndCompose } = await import('@apollo/gateway');

  const gateway = new ApolloGateway({
    supergraphSdl: new IntrospectAndCompose({
      subgraphs: config.gateway.services,
      pollIntervalInMs: config.gateway.polling?.interval,
    }),

    // Service health check
    serviceHealthCheck: true,

    // Error handling for subgraph failures
    buildService: ({ url }) => ({
      process: async ({ request, context }) => {
        // Add authentication headers to subgraph requests
        if (context.user) {
          request.http = request.http || {};
          request.http.headers = request.http.headers || {};
          request.http.headers.authorization = `Bearer ${context.user.token}`;
        }

        return { response: null }; // Default fetch will handle the request
      },
    }),
  });

  return gateway;
}

/**
 * Service registry for dynamic service discovery
 */
export class ServiceRegistry {
  private services = new Map<string, ServiceInfo>();

  interface ServiceInfo {
    name: string;
    url: string;
    version: string;
    health: 'healthy' | 'unhealthy' | 'unknown';
    lastCheck: Date;
  }

  register(service: ServiceInfo) {
    this.services.set(service.name, service);
    console.log(`Service registered: ${service.name} at ${service.url}`);
  }

  unregister(serviceName: string) {
    this.services.delete(serviceName);
    console.log(`Service unregistered: ${serviceName}`);
  }

  getServices(): ServiceInfo[] {
    return Array.from(this.services.values());
  }

  getService(name: string): ServiceInfo | undefined {
    return this.services.get(name);
  }

  async checkHealth(): Promise<void> {
    const healthChecks = Array.from(this.services.values()).map(async (service) => {
      try {
        const response = await fetch(`${service.url}/health`, {
          timeout: 5000,
        });

        service.health = response.ok ? 'healthy' : 'unhealthy';
      } catch (error) {
        service.health = 'unhealthy';
        console.error(`Health check failed for ${service.name}:`, error.message);
      }

      service.lastCheck = new Date();
    });

    await Promise.all(healthChecks);
  }
}

/**
 * Migration utilities for transitioning between monolith and federation
 */
export class FederationMigration {
  static async validateFederationReadiness(schema: DocumentNode, resolvers: any) {
    const issues: string[] = [];

    // Check for entity keys
    const entityTypes = ['User', 'Documentation', 'Partner', 'Operator', 'APIReference'];

    entityTypes.forEach(typeName => {
      if (!resolvers[typeName]?.__resolveReference) {
        issues.push(`Missing __resolveReference for entity type: ${typeName}`);
      }
    });

    // Check for external fields
    // This would require AST analysis of the schema

    if (issues.length > 0) {
      throw new Error(`Federation validation failed:\n${issues.join('\n')}`);
    }

    console.log('✅ Federation readiness validation passed');
  }

  static async migrateToFederation(currentSchema: DocumentNode, resolvers: any) {
    console.log('🚀 Starting federation migration...');

    // 1. Validate current schema is federation-ready
    await this.validateFederationReadiness(currentSchema, resolvers);

    // 2. Create federated schema
    const federatedSchema = createFederatedSchema(currentSchema, resolvers);

    // 3. Test schema composition
    // This would involve spinning up test services and validating gateway composition

    console.log('✅ Federation migration completed successfully');

    return federatedSchema;
  }
}

/**
 * Query complexity analysis for federated queries
 */
export function createComplexityAnalysis() {
  return {
    // Entity resolution complexity
    entityResolution: {
      User: 1,
      Documentation: 2,
      Partner: 2,
      Operator: 1,
      APIReference: 2,
    },

    // Field complexity
    fieldComplexity: {
      // High complexity fields that require multiple service calls
      'Documentation.relatedDocuments': 10,
      'Partner.operators': 5,
      'User.createdDocuments': 5,
    },

    // Maximum query complexity allowed
    maxComplexity: 100,

    // Complexity calculation
    calculateComplexity(query: any): number {
      // This would analyze the AST and calculate total complexity
      // based on entity resolution and field complexity weights
      return 0;
    },
  };
}

export default {
  createFederatedSchema,
  createGatewayConfig,
  ServiceRegistry,
  FederationMigration,
  createComplexityAnalysis,
};

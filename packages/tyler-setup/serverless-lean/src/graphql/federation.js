/**
 * GraphQL Federation Configuration
 * Enables microservices architecture for Tyler Setup
 */

import { buildSubgraphSchema } from '@apollo/subgraph';
import { ApolloGateway, IntrospectAndCompose } from '@apollo/gateway';
import { ApolloServer } from '@apollo/server';
import { startServerAndCreateLambdaHandler } from '@as-integrations/aws-lambda';
import gql from 'graphql-tag';

/**
 * User Service Subgraph
 */
export const userServiceTypeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key", "@shareable", "@external", "@requires"])

  type User @key(fields: "id") {
    id: ID!
    email: String!
    name: String!
    role: UserRole!
    isActive: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime
    lastLogin: DateTime
    lastLoginIP: String
  }

  enum UserRole {
    ADMIN
    USER
    READONLY
  }

  type Query {
    me: User
    users(
      first: Int
      after: String
      filter: UserFilter
    ): UserConnection!
    user(id: ID!): User
  }

  type Mutation {
    createUser(input: CreateUserInput!): User!
    updateUser(id: ID!, input: UpdateUserInput!): User!
    deleteUser(id: ID!): Boolean!
  }
`;

export const userServiceResolvers = {
  User: {
    __resolveReference: async (user, context) => {
      return context.getUser(user.id);
    },
  },
  Query: {
    me: async (parent, args, context) => {
      if (!context.user) return null;
      return context.getUser(context.user.id);
    },
    users: async (parent, args, context) => {
      // Implementation from queryResolvers.js
      return context.queryUsers(args);
    },
    user: async (parent, { id }, context) => {
      return context.getUser(id);
    },
  },
  Mutation: {
    createUser: async (parent, { input }, context) => {
      return context.createUser(input);
    },
    updateUser: async (parent, { id, input }, context) => {
      return context.updateUser(id, input);
    },
    deleteUser: async (parent, { id }, context) => {
      return context.deleteUser(id);
    },
  },
};

/**
 * Secrets Service Subgraph
 */
export const secretsServiceTypeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key", "@shareable", "@external", "@requires"])

  type Secret @key(fields: "id") {
    id: ID!
    name: String!
    description: String
    createdAt: DateTime!
    updatedAt: DateTime
    version: String!
    tags: [String!]!
    value: JSON @requires(fields: "name")
    createdBy: User!
    lastModifiedBy: User
    accessCount: Int!
  }

  extend type User @key(fields: "id") {
    id: ID! @external
    secretsCreated: [Secret!]! @shareable
  }

  type Query {
    secrets(
      first: Int
      after: String
      filter: SecretFilter
    ): SecretConnection!
    secret(name: String!): Secret
  }

  type Mutation {
    createSecret(input: CreateSecretInput!): Secret!
    updateSecret(name: String!, input: UpdateSecretInput!): Secret!
    deleteSecret(name: String!): Boolean!
  }
`;

export const secretsServiceResolvers = {
  Secret: {
    __resolveReference: async (secret, context) => {
      return context.getSecret(secret.id);
    },
    value: async (parent, args, context) => {
      // Role-based access control
      if (context.user?.type === 'contractor') {
        const allowedSecrets = context.user.allowedSecrets || [];
        if (!allowedSecrets.includes(parent.name)) {
          return null;
        }
        // Return masked value for contractors
        return context.getMaskedSecretValue(parent.name);
      }
      return context.getSecretValue(parent.name);
    },
    createdBy: async (parent, args, context) => {
      return { __typename: 'User', id: parent.createdBy };
    },
    lastModifiedBy: async (parent, args, context) => {
      return parent.lastModifiedBy
        ? { __typename: 'User', id: parent.lastModifiedBy }
        : null;
    },
  },
  User: {
    secretsCreated: async (user, args, context) => {
      return context.getSecretsCreatedByUser(user.id);
    },
  },
  Query: {
    secrets: async (parent, args, context) => {
      return context.querySecrets(args);
    },
    secret: async (parent, { name }, context) => {
      return context.getSecret(name);
    },
  },
  Mutation: {
    createSecret: async (parent, { input }, context) => {
      return context.createSecret(input);
    },
    updateSecret: async (parent, { name, input }, context) => {
      return context.updateSecret(name, input);
    },
    deleteSecret: async (parent, { name }, context) => {
      return context.deleteSecret(name);
    },
  },
};

/**
 * Audit Service Subgraph
 */
export const auditServiceTypeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key", "@shareable", "@external"])

  type AuditLog @key(fields: "id") {
    id: ID!
    timestamp: DateTime!
    action: AuditAction!
    userId: String!
    resource: String
    details: JSON
    ip: String
    userAgent: String
    user: User
  }

  extend type User @key(fields: "id") {
    id: ID! @external
    auditLogs(
      first: Int
      after: String
      filter: AuditLogFilter
    ): AuditLogConnection! @shareable
  }

  enum AuditAction {
    LOGIN_SUCCESS
    LOGIN_FAILED
    LOGOUT
    USER_CREATED
    USER_UPDATED
    USER_DELETED
    SECRET_RETRIEVED
    SECRET_CREATED
    SECRET_UPDATED
    SECRET_DELETED
    CONTRACTOR_INVITED
    CONTRACTOR_ACCESS
    CONTRACTOR_REVOKED
    CONFIG_UPDATED
    RATE_LIMIT_EXCEEDED
  }

  type Query {
    auditLogs(
      first: Int
      after: String
      filter: AuditLogFilter
    ): AuditLogConnection!
  }

  type Subscription {
    auditLogAdded(filter: AuditLogFilter): AuditLog!
  }
`;

export const auditServiceResolvers = {
  AuditLog: {
    __resolveReference: async (audit, context) => {
      return context.getAuditLog(audit.id);
    },
    user: async (parent, args, context) => {
      return parent.userId
        ? { __typename: 'User', id: parent.userId }
        : null;
    },
  },
  User: {
    auditLogs: async (user, args, context) => {
      return context.getUserAuditLogs(user.id, args);
    },
  },
  Query: {
    auditLogs: async (parent, args, context) => {
      return context.queryAuditLogs(args);
    },
  },
  Subscription: {
    auditLogAdded: {
      subscribe: async (parent, args, context) => {
        return context.subscribeToAuditLogs(args.filter);
      },
    },
  },
};

/**
 * Contractor Service Subgraph
 */
export const contractorServiceTypeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key", "@shareable", "@external", "@requires"])

  type Contractor @key(fields: "id") {
    id: ID!
    email: String!
    name: String!
    company: String!
    status: ContractorStatus!
    permissions: [Permission!]!
    allowedSecrets: [String!]!
    createdAt: DateTime!
    expiresAt: DateTime!
    lastAccess: DateTime
    accessCount: Int!
    reason: String!
    invitedBy: User!
  }

  extend type User @key(fields: "id") {
    id: ID! @external
    contractorsInvited(
      first: Int
      after: String
      status: ContractorStatus
    ): ContractorConnection! @shareable
  }

  enum ContractorStatus {
    PENDING
    ACTIVE
    EXPIRED
    REVOKED
  }

  enum Permission {
    READ
    WRITE
    DELETE
    ADMIN
  }

  type Query {
    contractors(
      first: Int
      after: String
      filter: ContractorFilter
    ): ContractorConnection!
    contractor(id: ID!): Contractor
  }

  type Mutation {
    inviteContractor(input: InviteContractorInput!): Contractor!
    accessWithToken(token: String!): ContractorAccessPayload!
    revokeContractorAccess(id: ID!): Boolean!
  }

  type Subscription {
    contractorAccessChanged: Contractor!
  }
`;

export const contractorServiceResolvers = {
  Contractor: {
    __resolveReference: async (contractor, context) => {
      return context.getContractor(contractor.id);
    },
    invitedBy: async (parent, args, context) => {
      return { __typename: 'User', id: parent.invitedBy };
    },
  },
  User: {
    contractorsInvited: async (user, args, context) => {
      return context.getContractorsInvitedByUser(user.id, args);
    },
  },
  Query: {
    contractors: async (parent, args, context) => {
      return context.queryContractors(args);
    },
    contractor: async (parent, { id }, context) => {
      return context.getContractor(id);
    },
  },
  Mutation: {
    inviteContractor: async (parent, { input }, context) => {
      return context.inviteContractor(input);
    },
    accessWithToken: async (parent, { token }, context) => {
      return context.accessWithToken(token);
    },
    revokeContractorAccess: async (parent, { id }, context) => {
      return context.revokeContractorAccess(id);
    },
  },
  Subscription: {
    contractorAccessChanged: {
      subscribe: async (parent, args, context) => {
        return context.subscribeToContractorChanges();
      },
    },
  },
};

/**
 * Create federated subgraph schemas
 */
export function createSubgraphServices() {
  const userService = buildSubgraphSchema({
    typeDefs: userServiceTypeDefs,
    resolvers: userServiceResolvers,
  });

  const secretsService = buildSubgraphSchema({
    typeDefs: secretsServiceTypeDefs,
    resolvers: secretsServiceResolvers,
  });

  const auditService = buildSubgraphSchema({
    typeDefs: auditServiceTypeDefs,
    resolvers: auditServiceResolvers,
  });

  const contractorService = buildSubgraphSchema({
    typeDefs: contractorServiceTypeDefs,
    resolvers: contractorServiceResolvers,
  });

  return {
    userService,
    secretsService,
    auditService,
    contractorService,
  };
}

/**
 * Create Apollo Gateway
 */
export function createGateway() {
  // In production, use managed federation
  if (process.env.APOLLO_KEY && process.env.APOLLO_GRAPH_REF) {
    return new ApolloGateway({
      // Managed federation - Apollo Studio manages the supergraph
    });
  }

  // Local development - compose services locally
  return new ApolloGateway({
    supergraphSdl: new IntrospectAndCompose({
      subgraphs: [
        {
          name: 'users',
          url: process.env.USER_SERVICE_URL || 'http://localhost:4001/graphql',
        },
        {
          name: 'secrets',
          url: process.env.SECRETS_SERVICE_URL || 'http://localhost:4002/graphql',
        },
        {
          name: 'audit',
          url: process.env.AUDIT_SERVICE_URL || 'http://localhost:4003/graphql',
        },
        {
          name: 'contractors',
          url: process.env.CONTRACTOR_SERVICE_URL || 'http://localhost:4004/graphql',
        },
      ],
    }),
    // Enable query planning cache
    experimental_pollInterval: 10000,
    // Custom error handling
    willSendRequest({ request, context }) {
      // Forward authentication headers
      if (context.headers?.authorization) {
        request.http.headers.set('authorization', context.headers.authorization);
      }
    },
  });
}

/**
 * Create Gateway Server
 */
export async function createGatewayServer() {
  const gateway = createGateway();

  const server = new ApolloServer({
    gateway,
    // Subscription support through gateway
    subscriptions: {
      'graphql-ws': {
        onConnect: async (ctx) => {
          const token = ctx.connectionParams?.authorization;
          if (!token) {
            throw new Error('Missing auth token');
          }
          const user = await validateAuth({ headers: { authorization: token } });
          return { user };
        },
      },
    },
    // Context from gateway
    context: async ({ req }) => {
      const token = req.headers.authorization;
      const user = token ? await validateAuth({ headers: { authorization: token } }) : null;

      return {
        user,
        headers: req.headers,
      };
    },
    // Performance plugins
    plugins: [
      {
        requestDidStart() {
          return {
            willSendResponse(requestContext) {
              // Add tracing headers
              requestContext.response.http.headers.set(
                'x-trace-id',
                requestContext.request.http.headers.get('x-trace-id') ||
                require('crypto').randomBytes(16).toString('hex')
              );
            },
          };
        },
      },
    ],
  });

  await server.start();
  return server;
}

/**
 * Lambda handler for Gateway
 */
export const gatewayHandler = async () => {
  const server = await createGatewayServer();
  return startServerAndCreateLambdaHandler(server);
};

/**
 * Deployment configuration for subgraphs
 */
export const federationConfig = {
  services: [
    {
      name: 'users',
      handler: 'src/graphql/federation/users.handler',
      memory: 512,
      timeout: 30,
      environment: {
        SERVICE_NAME: 'users',
        USERS_TABLE: '${self:service}-${self:provider.stage}-users',
      },
    },
    {
      name: 'secrets',
      handler: 'src/graphql/federation/secrets.handler',
      memory: 512,
      timeout: 30,
      environment: {
        SERVICE_NAME: 'secrets',
        SECRETS_PREFIX: '${self:service}-${self:provider.stage}',
      },
    },
    {
      name: 'audit',
      handler: 'src/graphql/federation/audit.handler',
      memory: 256,
      timeout: 30,
      environment: {
        SERVICE_NAME: 'audit',
        AUDIT_TABLE: '${self:service}-${self:provider.stage}-audit',
      },
    },
    {
      name: 'contractors',
      handler: 'src/graphql/federation/contractors.handler',
      memory: 512,
      timeout: 30,
      environment: {
        SERVICE_NAME: 'contractors',
        CONTRACTORS_TABLE: '${self:service}-${self:provider.stage}-contractors',
      },
    },
  ],
  gateway: {
    handler: 'src/graphql/federation.gatewayHandler',
    memory: 1024,
    timeout: 60,
    environment: {
      USER_SERVICE_URL: { 'Fn::Sub': 'https://${ApiGatewayRestApi}.execute-api.${AWS::Region}.amazonaws.com/${self:provider.stage}/users' },
      SECRETS_SERVICE_URL: { 'Fn::Sub': 'https://${ApiGatewayRestApi}.execute-api.${AWS::Region}.amazonaws.com/${self:provider.stage}/secrets' },
      AUDIT_SERVICE_URL: { 'Fn::Sub': 'https://${ApiGatewayRestApi}.execute-api.${AWS::Region}.amazonaws.com/${self:provider.stage}/audit' },
      CONTRACTOR_SERVICE_URL: { 'Fn::Sub': 'https://${ApiGatewayRestApi}.execute-api.${AWS::Region}.amazonaws.com/${self:provider.stage}/contractors' },
    },
  },
};

export default {
  createSubgraphServices,
  createGateway,
  createGatewayServer,
  gatewayHandler,
  federationConfig,
};

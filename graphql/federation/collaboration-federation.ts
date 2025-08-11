/**
 * GraphQL Federation Strategy for Collaboration Services
 * Service boundaries, schema stitching, and gateway configuration
 */

import { buildFederatedSchema } from '@apollo/federation';
import { GraphQLSchema, GraphQLError } from 'graphql';
import { ApolloGateway, RemoteGraphQLDataSource } from '@apollo/gateway';
import { ApolloServer } from 'apollo-server-express';
import { AuthContext } from '../types/context';

// =============================================================================
// SERVICE BOUNDARIES AND RESPONSIBILITIES
// =============================================================================

/**
 * Collaboration Services Architecture:
 *
 * 1. Document Service - Core document management
 * 2. Real-time Service - Presence, cursors, live updates
 * 3. Comment Service - Comments, threads, reactions
 * 4. Version Service - Version control, branches, merging
 * 5. Integration Service - Paintbox, Brand Portal connections
 * 6. Analytics Service - Activity tracking, metrics
 * 7. Notification Service - Real-time notifications
 */

export interface ServiceEndpoint {
  name: string;
  url: string;
  schema: GraphQLSchema;
  responsibilities: string[];
  entities: string[];
}

// =============================================================================
// DOCUMENT SERVICE (Primary)
// =============================================================================

export const documentServiceSchema = buildFederatedSchema({
  typeDefs: `
    # Document service is responsible for core document management
    extend type Query {
      document(id: UUID!): Document
      documents(filter: DocumentFilter, sort: [DocumentSort!], pagination: PaginationInput): DocumentConnection!
      myDocuments(filter: MyDocumentFilter, sort: [DocumentSort!], pagination: PaginationInput): DocumentConnection!
      searchDocuments(query: NonEmptyString!, filter: SearchFilter): DocumentSearchConnection!
      documentTemplates(type: DocumentType, category: String): [DocumentTemplate!]!
    }

    extend type Mutation {
      createDocument(input: CreateDocumentInput!): Document!
      updateDocument(input: UpdateDocumentInput!): Document!
      updateDocumentContent(input: UpdateDocumentContentInput!): DocumentContentUpdateResult!
      deleteDocument(input: DeleteDocumentInput!): DocumentDeletionResult!
      cloneDocument(input: CloneDocumentInput!): Document!
      shareDocument(input: ShareDocumentInput!): DocumentSharing!
    }

    # Primary entity - owned by Document Service
    type Document @key(fields: "id") {
      id: UUID!
      name: NonEmptyString!
      type: DocumentType!
      status: DocumentStatus!
      content: DocumentContent!

      # External references (resolved by other services)
      owner: User! @provides(fields: "id firstName lastName")
      organization: Organization! @provides(fields: "id name")
      activeUsers: [PresenceSession!]! @external
      comments: [Comment!]! @external
      versions: [DocumentVersion!]! @external
      activity: [ActivityEvent!]! @external
    }

    # Entity extensions for external services
    extend type User @key(fields: "id") {
      id: UUID! @external
      firstName: String! @external
      lastName: String! @external
    }

    extend type Organization @key(fields: "id") {
      id: UUID! @external
      name: String! @external
    }
  `,
  resolvers: {
    Document: {
      __resolveReference: (ref: { id: string }, context: AuthContext) => {
        return context.dataLoaders.collaboration.document.load(ref.id);
      }
    }
  }
});

// =============================================================================
// REAL-TIME SERVICE
// =============================================================================

export const realtimeServiceSchema = buildFederatedSchema({
  typeDefs: `
    # Real-time service handles presence, cursors, and live collaboration
    extend type Query {
      documentPresence(documentId: UUID!): [PresenceSession!]!
      myActiveSessions: [PresenceSession!]!
      documentLocks(documentId: UUID!): [LockInfo!]!
    }

    extend type Mutation {
      joinDocument(input: JoinDocumentInput!): PresenceSession!
      leaveDocument(documentId: UUID!): Boolean!
      updatePresence(input: UpdatePresenceInput!): PresenceSession!
      requestDocumentLock(input: RequestDocumentLockInput!): LockInfo!
      releaseDocumentLock(lockId: UUID!): Boolean!
    }

    extend type Subscription {
      documentPresenceChanged(documentId: UUID!): PresenceChangeEvent!
      cursorPositionChanged(documentId: UUID!): CursorPositionEvent!
      userTypingStatusChanged(documentId: UUID!): TypingStatusEvent!
      documentLocksChanged(documentId: UUID!): DocumentLockChangeEvent!
    }

    # Primary entity - owned by Real-time Service
    type PresenceSession @key(fields: "id") {
      id: UUID!
      status: PresenceStatus!
      joinedAt: DateTime!
      lastSeenAt: DateTime!

      # External references
      user: User! @provides(fields: "id firstName lastName avatar")
      document: Document! @provides(fields: "id name")
    }

    # Extend Document with presence information
    extend type Document @key(fields: "id") {
      id: UUID! @external
      activeUsers: [PresenceSession!]! @requires(fields: "id")
      presenceInfo: PresenceInfo!
    }
  `,
  resolvers: {
    Document: {
      activeUsers: (document: { id: string }, args: any, context: AuthContext) => {
        return context.dataLoaders.collaboration.documentPresence.load(document.id);
      }
    },
    PresenceSession: {
      __resolveReference: (ref: { id: string }, context: AuthContext) => {
        return context.dataLoaders.collaboration.presenceSession.load(ref.id);
      }
    }
  }
});

// =============================================================================
// COMMENT SERVICE
// =============================================================================

export const commentServiceSchema = buildFederatedSchema({
  typeDefs: `
    # Comment service handles all commenting functionality
    extend type Query {
      comment(id: UUID!): Comment
      documentComments(documentId: UUID!, filter: CommentFilter): CommentConnection!
      commentThreads(documentId: UUID!, filter: ThreadFilter): CommentThreadConnection!
      myComments(filter: MyCommentFilter): CommentConnection!
    }

    extend type Mutation {
      addComment(input: CreateCommentInput!): Comment!
      updateComment(input: UpdateCommentInput!): Comment!
      deleteComment(id: UUID!): Boolean!
      resolveComment(input: ResolveCommentInput!): Comment!
      addCommentReaction(input: AddReactionInput!): Reaction!
    }

    extend type Subscription {
      commentAdded(documentId: UUID!): CommentEvent!
      commentUpdated(documentId: UUID!): CommentUpdateEvent!
      commentResolutionChanged(documentId: UUID!): CommentResolutionEvent!
    }

    # Primary entity - owned by Comment Service
    type Comment @key(fields: "id") {
      id: UUID!
      content: CommentContent!
      status: CommentStatus!
      priority: CommentPriority!

      # External references
      author: User! @provides(fields: "id firstName lastName avatar")
      document: Document! @provides(fields: "id name")
    }

    type CommentThread @key(fields: "id") {
      id: UUID!
      subject: String
      status: ThreadStatus!

      # External references
      document: Document! @provides(fields: "id name")
      rootComment: Comment!
    }

    # Extend Document with comment information
    extend type Document @key(fields: "id") {
      id: UUID! @external
      comments: [Comment!]! @requires(fields: "id")
      commentThreads: [CommentThread!]!
    }
  `,
  resolvers: {
    Document: {
      comments: (document: { id: string }, args: any, context: AuthContext) => {
        return context.dataLoaders.collaboration.documentComments.load(document.id);
      }
    },
    Comment: {
      __resolveReference: (ref: { id: string }, context: AuthContext) => {
        return context.dataLoaders.collaboration.comment.load(ref.id);
      }
    }
  }
});

// =============================================================================
// VERSION SERVICE
// =============================================================================

export const versionServiceSchema = buildFederatedSchema({
  typeDefs: `
    # Version service handles version control and branching
    extend type Query {
      documentVersion(id: UUID!): DocumentVersion
      documentVersions(documentId: UUID!, branchId: UUID): DocumentVersionConnection!
      documentBranches(documentId: UUID!): [DocumentBranch!]!
      compareVersions(sourceVersionId: UUID!, targetVersionId: UUID!): VersionComparison!
    }

    extend type Mutation {
      createDocumentVersion(input: CreateDocumentVersionInput!): DocumentVersion!
      createDocumentBranch(input: CreateDocumentBranchInput!): DocumentBranch!
      mergeBranches(input: MergeBranchInput!): MergeResult!
      revertToVersion(input: RevertToVersionInput!): Document!
    }

    extend type Subscription {
      documentVersionCreated(documentId: UUID!): DocumentVersionEvent!
      documentBranchActivity(documentId: UUID!): DocumentBranchEvent!
      documentMergeActivity(documentId: UUID!): DocumentMergeEvent!
    }

    # Primary entities - owned by Version Service
    type DocumentVersion @key(fields: "id") {
      id: UUID!
      version: NonEmptyString!
      content: DocumentContent!
      isCurrentVersion: Boolean!

      # External references
      author: User! @provides(fields: "id firstName lastName")
      document: Document! @provides(fields: "id name")
    }

    type DocumentBranch @key(fields: "id") {
      id: UUID!
      name: NonEmptyString!
      isMain: Boolean!

      # External references
      document: Document! @provides(fields: "id name")
      creator: User! @provides(fields: "id firstName lastName")
    }

    # Extend Document with version information
    extend type Document @key(fields: "id") {
      id: UUID! @external
      currentVersion: DocumentVersion! @requires(fields: "id")
      versions: [DocumentVersion!]! @requires(fields: "id")
      branches: [DocumentBranch!]!
    }
  `,
  resolvers: {
    Document: {
      versions: (document: { id: string }, args: any, context: AuthContext) => {
        return context.dataLoaders.collaboration.documentVersions.load(document.id);
      }
    },
    DocumentVersion: {
      __resolveReference: (ref: { id: string }, context: AuthContext) => {
        return context.dataLoaders.collaboration.documentVersion.load(ref.id);
      }
    }
  }
});

// =============================================================================
// INTEGRATION SERVICE
// =============================================================================

export const integrationServiceSchema = buildFederatedSchema({
  typeDefs: `
    # Integration service handles external system integrations
    extend type Query {
      linkedPaintboxEstimates(documentId: UUID!): [PaintboxEstimate!]!
      availableBrandThemes: [BrandPortalTheme!]!
      documentsWithBrandTheme(themeId: UUID!): [Document!]!
    }

    extend type Mutation {
      linkPaintboxEstimate(input: LinkPaintboxEstimateInput!): Document!
      unlinkPaintboxEstimate(input: UnlinkPaintboxEstimateInput!): Boolean!
      applyBrandTheme(input: ApplyBrandThemeInput!): Document!
      syncDocumentWithExternal(input: SyncDocumentInput!): SyncResult!
    }

    extend type Subscription {
      paintboxEstimateChanged(documentId: UUID!): PaintboxIntegrationEvent!
      brandThemeChanged(documentId: UUID!): BrandThemeEvent!
      externalSyncStatusChanged(documentId: UUID!): ExternalSyncEvent!
    }

    # Primary entities - owned by Integration Service
    type PaintboxEstimate @key(fields: "id") {
      id: UUID!
      estimateNumber: String!
      projectName: String!
      status: EstimateStatus!
    }

    type BrandPortalTheme @key(fields: "id") {
      id: UUID!
      name: String!
      colors: BrandColors!
      fonts: BrandFonts!
    }

    # Extend Document with integration information
    extend type Document @key(fields: "id") {
      id: UUID! @external
      paintboxEstimate: PaintboxEstimate @requires(fields: "id")
      brandPortalTheme: BrandPortalTheme @requires(fields: "id")
    }
  `,
  resolvers: {
    Document: {
      paintboxEstimate: (document: { id: string }, args: any, context: AuthContext) => {
        // Implementation would check for linked estimate
        return null; // Stub
      }
    }
  }
});

// =============================================================================
// ANALYTICS SERVICE
// =============================================================================

export const analyticsServiceSchema = buildFederatedSchema({
  typeDefs: `
    # Analytics service handles activity tracking and metrics
    extend type Query {
      documentActivity(documentId: UUID!, filter: ActivityFilter): ActivityEventConnection!
      organizationActivity(filter: ActivityFilter): ActivityEventConnection!
      collaborationMetrics(documentIds: [UUID!], dateRange: DateRangeInput): CollaborationMetrics!
      documentAnalytics(documentId: UUID!, dateRange: DateRangeInput): DocumentAnalytics!
    }

    extend type Subscription {
      documentActivity(documentId: UUID!, filter: ActivitySubscriptionFilter): ActivityEvent!
      organizationActivity(filter: ActivitySubscriptionFilter): ActivityEvent!
      collaborationMetrics(documentIds: [UUID!]): CollaborationMetricsEvent!
    }

    # Primary entity - owned by Analytics Service
    type ActivityEvent @key(fields: "id") {
      id: UUID!
      type: ActivityEventType!
      action: ActivityAction!
      timestamp: DateTime!

      # External references
      actor: User @provides(fields: "id firstName lastName")
      target: ActivityTarget
    }

    # Extend Document with analytics information
    extend type Document @key(fields: "id") {
      id: UUID! @external
      activity: [ActivityEvent!]! @requires(fields: "id")
      metrics: DocumentMetrics!
    }
  `,
  resolvers: {
    Document: {
      activity: (document: { id: string }, args: any, context: AuthContext) => {
        return context.dataLoaders.collaboration.documentActivity.load(document.id);
      }
    }
  }
});

// =============================================================================
// FEDERATION GATEWAY CONFIGURATION
// =============================================================================

export class CollaborationGateway {
  private gateway: ApolloGateway;
  private server: ApolloServer;

  constructor() {
    this.setupGateway();
    this.setupServer();
  }

  private setupGateway(): void {
    this.gateway = new ApolloGateway({
      serviceList: [
        { name: 'document', url: process.env.DOCUMENT_SERVICE_URL || 'http://localhost:4001/graphql' },
        { name: 'realtime', url: process.env.REALTIME_SERVICE_URL || 'http://localhost:4002/graphql' },
        { name: 'comment', url: process.env.COMMENT_SERVICE_URL || 'http://localhost:4003/graphql' },
        { name: 'version', url: process.env.VERSION_SERVICE_URL || 'http://localhost:4004/graphql' },
        { name: 'integration', url: process.env.INTEGRATION_SERVICE_URL || 'http://localhost:4005/graphql' },
        { name: 'analytics', url: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:4006/graphql' }
      ],

      // Custom data source for enhanced security and logging
      buildService: ({ name, url }) => {
        return new CollaborationDataSource({ url, name });
      },

      // Schema composition options
      experimental_pollInterval: 30000, // 30 seconds
      experimental_schemaConfigDeliveryEndpoint: process.env.SCHEMA_REGISTRY_URL,

      // Error handling
      serviceHealthCheck: true,
      uplinkMaxRetries: 3
    });
  }

  private setupServer(): void {
    this.server = new ApolloServer({
      gateway: this.gateway,
      subscriptions: {
        path: '/graphql',
        onConnect: (connectionParams: any, webSocket: any) => {
          // WebSocket authentication
          return this.authenticateWebSocket(connectionParams);
        }
      },
      context: ({ req, connection }) => {
        if (connection) {
          // WebSocket context
          return {
            ...connection.context,
            isWebSocket: true
          };
        }

        // HTTP context
        return this.createHttpContext(req);
      },
      plugins: [
        // Performance monitoring
        {
          requestDidStart() {
            return {
              willSendResponse(requestContext) {
                // Log federation performance
                console.log(`Federation query took ${requestContext.request.http?.body} ms`);
              }
            };
          }
        },

        // Schema introspection control
        {
          requestDidStart() {
            return {
              didResolveOperation(requestContext) {
                if (requestContext.request.operationName === 'IntrospectionQuery' &&
                    process.env.NODE_ENV === 'production') {
                  throw new GraphQLError('Introspection disabled in production');
                }
              }
            };
          }
        }
      ]
    });
  }

  private async authenticateWebSocket(connectionParams: any): Promise<any> {
    const token = connectionParams.authorization || connectionParams.Authorization;
    if (!token) {
      throw new Error('Missing authentication token');
    }

    // Validate JWT token
    try {
      const user = await this.validateJWT(token.replace('Bearer ', ''));
      return { user, isAuthenticated: true };
    } catch (error) {
      throw new Error('Invalid authentication token');
    }
  }

  private createHttpContext(req: any): any {
    // Extract context from HTTP request
    const authHeader = req.headers.authorization;
    const user = authHeader ? this.validateJWT(authHeader.replace('Bearer ', '')) : null;

    return {
      req,
      user,
      isAuthenticated: !!user,
      requestId: req.headers['x-request-id'] || this.generateRequestId(),
      organizationId: req.headers['x-organization-id'],
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.connection.remoteAddress
    };
  }

  private async validateJWT(token: string): Promise<any> {
    // JWT validation implementation
    // This would integrate with your authentication service
    return null; // Stub
  }

  private generateRequestId(): string {
    return require('crypto').randomUUID();
  }

  public getServer(): ApolloServer {
    return this.server;
  }
}

// =============================================================================
// CUSTOM DATA SOURCE FOR ENHANCED FEDERATION
// =============================================================================

class CollaborationDataSource extends RemoteGraphQLDataSource {
  private serviceName: string;

  constructor({ url, name }: { url: string; name: string }) {
    super({ url });
    this.serviceName = name;
  }

  willSendRequest({ request, context }: any): void {
    // Forward authentication and context headers
    if (context.user) {
      request.http.headers.set('x-user-id', context.user.id);
      request.http.headers.set('x-organization-id', context.organizationId);
    }

    if (context.requestId) {
      request.http.headers.set('x-request-id', context.requestId);
    }

    // Service-specific headers
    request.http.headers.set('x-service-name', this.serviceName);
    request.http.headers.set('x-federation-version', '2.0');

    // Trace correlation
    request.http.headers.set('x-trace-id', context.traceId || this.generateTraceId());
  }

  didReceiveResponse({ response, request, context }: any): any {
    // Log service response times
    const duration = Date.now() - request.startTime;
    console.log(`Service ${this.serviceName} responded in ${duration}ms`);

    // Handle service-specific errors
    if (response.errors) {
      response.errors = response.errors.map((error: any) => ({
        ...error,
        extensions: {
          ...error.extensions,
          service: this.serviceName,
          traceId: context.traceId
        }
      }));
    }

    return response;
  }

  didEncounterError(error: any): any {
    // Enhanced error logging for federation
    console.error(`Federation error in service ${this.serviceName}:`, {
      error: error.message,
      service: this.serviceName,
      stack: error.stack
    });

    return error;
  }

  private generateTraceId(): string {
    return require('crypto').randomBytes(16).toString('hex');
  }
}

// =============================================================================
// SERVICE DEPLOYMENT CONFIGURATION
// =============================================================================

export interface ServiceConfiguration {
  name: string;
  port: number;
  healthCheckPath: string;
  schema: GraphQLSchema;
  resolvers: any;
  dataSources: any[];
  subscriptions?: {
    enabled: boolean;
    path: string;
  };
}

export const serviceConfigurations: ServiceConfiguration[] = [
  {
    name: 'document',
    port: 4001,
    healthCheckPath: '/health',
    schema: documentServiceSchema,
    resolvers: {},
    dataSources: []
  },
  {
    name: 'realtime',
    port: 4002,
    healthCheckPath: '/health',
    schema: realtimeServiceSchema,
    resolvers: {},
    dataSources: [],
    subscriptions: {
      enabled: true,
      path: '/graphql'
    }
  },
  {
    name: 'comment',
    port: 4003,
    healthCheckPath: '/health',
    schema: commentServiceSchema,
    resolvers: {},
    dataSources: []
  },
  {
    name: 'version',
    port: 4004,
    healthCheckPath: '/health',
    schema: versionServiceSchema,
    resolvers: {},
    dataSources: []
  },
  {
    name: 'integration',
    port: 4005,
    healthCheckPath: '/health',
    schema: integrationServiceSchema,
    resolvers: {},
    dataSources: []
  },
  {
    name: 'analytics',
    port: 4006,
    healthCheckPath: '/health',
    schema: analyticsServiceSchema,
    resolvers: {},
    dataSources: []
  }
];

// =============================================================================
// FEDERATION UTILITIES
// =============================================================================

/**
 * Service Health Monitoring
 */
export class ServiceHealthMonitor {
  private services: Map<string, ServiceHealth> = new Map();

  public async checkServiceHealth(serviceName: string, url: string): Promise<ServiceHealth> {
    try {
      const startTime = Date.now();
      const response = await fetch(`${url}/health`);
      const responseTime = Date.now() - startTime;

      const health: ServiceHealth = {
        service: serviceName,
        status: response.ok ? 'HEALTHY' : 'UNHEALTHY',
        responseTime: responseTime,
        lastCheck: new Date(),
        errorRate: 0
      };

      this.services.set(serviceName, health);
      return health;
    } catch (error) {
      const health: ServiceHealth = {
        service: serviceName,
        status: 'UNHEALTHY',
        responseTime: 0,
        lastCheck: new Date(),
        errorRate: 100
      };

      this.services.set(serviceName, health);
      return health;
    }
  }

  public getServiceHealth(serviceName: string): ServiceHealth | null {
    return this.services.get(serviceName) || null;
  }

  public getAllServicesHealth(): ServiceHealth[] {
    return Array.from(this.services.values());
  }
}

interface ServiceHealth {
  service: string;
  status: 'HEALTHY' | 'UNHEALTHY' | 'DEGRADED';
  responseTime: number;
  lastCheck: Date;
  errorRate: number;
}

/**
 * Schema Composition Utilities
 */
export class SchemaComposer {
  public static async composeSchemas(services: ServiceConfiguration[]): Promise<GraphQLSchema> {
    // Implementation for composing federated schemas
    // This would handle schema validation, entity resolution, etc.
    throw new Error('Not implemented');
  }

  public static validateEntityReferences(schema: GraphQLSchema): ValidationResult[] {
    // Validate that all @key and @external references are properly defined
    throw new Error('Not implemented');
  }
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export default CollaborationGateway;

import { 
  GraphQLResolveInfo, 
  GraphQLError,
  GraphQLFieldResolver 
} from 'graphql';
import { 
  AuthenticationError, 
  ForbiddenError, 
  UserInputError 
} from 'apollo-server-errors';
import { PubSub } from 'graphql-subscriptions';
import { withFilter } from 'graphql-subscriptions';

// Import our custom utilities
import { DataLoaderContext } from '../dataloaders/index';
import { 
  fieldPermissionCheck, 
  maskSensitiveData, 
  AuthContext,
  hasRequiredRole,
  UserRole 
} from '../directives/auth';
import { 
  resilientResolver, 
  withErrorBoundary,
  PartialResponseBuilder,
  ValidationError,
  NotFoundError,
  ConflictError 
} from '../errors/index';
import { 
  eventPublisher, 
  organizationFilter, 
  severityFilter 
} from '../subscriptions/index';

// Types and interfaces
interface SecurityEvent {
  id: string;
  eventType: string;
  severity: string;
  title: string;
  description: string;
  organizationId: string;
  timestamp: Date;
  source: string;
  assetId?: string;
  userId?: string;
  metadata: Record<string, any>;
}

interface Alert {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  organizationId: string;
  assignedToId?: string;
  assetId?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Asset {
  id: string;
  name: string;
  assetType: string;
  organizationId: string;
  ownerId?: string;
  riskScore: number;
  healthStatus: string;
  createdAt: Date;
  updatedAt: Date;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  organizationId: string;
  permissions: string[];
}

// Mock data services (in production, these would be real database/API clients)
class MockDataService {
  // Security Events
  async getSecurityEvent(id: string): Promise<SecurityEvent | null> {
    // Simulate database query
    const event: SecurityEvent = {
      id,
      eventType: 'UNAUTHORIZED_ACCESS',
      severity: 'HIGH',
      title: 'Unauthorized access attempt detected',
      description: 'Multiple failed login attempts from suspicious IP',
      organizationId: 'org-123',
      timestamp: new Date(),
      source: 'Auth Service',
      assetId: 'asset-456',
      userId: 'user-789',
      metadata: {
        ipAddress: '192.168.1.100',
        attempts: 5,
        userAgent: 'Mozilla/5.0...'
      }
    };
    return event;
  }

  async getSecurityEvents(
    filter: any,
    pagination: { first?: number; after?: string }
  ): Promise<{ events: SecurityEvent[]; hasNextPage: boolean; endCursor: string }> {
    // Simulate filtered database query with pagination
    const events: SecurityEvent[] = []; // Would be populated from database
    return {
      events,
      hasNextPage: false,
      endCursor: 'cursor-123'
    };
  }

  async createSecurityEvent(input: any): Promise<SecurityEvent> {
    // Simulate event creation
    const event: SecurityEvent = {
      id: 'event-' + Math.random().toString(36).substr(2, 9),
      ...input,
      timestamp: new Date(),
    };
    
    // Publish real-time update
    await eventPublisher.publishSecurityEvent({
      type: 'CREATED',
      event,
      organizationId: event.organizationId,
      timestamp: new Date(),
    });
    
    return event;
  }

  // Similar methods for Alerts, Assets, Users...
  async getAlert(id: string): Promise<Alert | null> {
    // Mock implementation
    return null;
  }

  async getAsset(id: string): Promise<Asset | null> {
    // Mock implementation
    return null;
  }

  async getUser(id: string): Promise<User | null> {
    // Mock implementation
    return null;
  }
}

const dataService = new MockDataService();

// GraphQL Context interface
interface GraphQLContext extends AuthContext {
  dataloaders: DataLoaderContext;
  pubsub: PubSub;
  services: {
    data: MockDataService;
  };
  requestId: string;
}

// Example resolvers with best practices
export const securityEventResolvers = {
  Query: {
    // Single security event query with error handling and authorization
    securityEvent: resilientResolver(
      async (
        parent: any,
        args: { id: string },
        context: GraphQLContext,
        info: GraphQLResolveInfo
      ): Promise<SecurityEvent | null> => {
        // Validate input
        if (!args.id) {
          throw new UserInputError('Security event ID is required');
        }

        // Check authentication (handled by @auth directive, but showing explicit check)
        if (!context.user) {
          throw new AuthenticationError('Authentication required');
        }

        // Use DataLoader for efficient database access
        const event = await context.dataloaders.securityEventLoader.load(args.id);
        
        if (!event) {
          throw new NotFoundError('SecurityEvent', args.id);
        }

        // Check organization scope
        if (event.organizationId !== context.user.organizationId) {
          throw new ForbiddenError('Access denied to this security event');
        }

        // Apply field-level permissions and data masking
        return maskSensitiveData(event, 'SecurityEvent.metadata', context);
      },
      null, // fallback value
      'Failed to fetch security event'
    ),

    // Complex query with filtering, pagination, and aggregations
    securityEvents: withErrorBoundary(
      async (
        parent: any,
        args: {
          filter?: any;
          sort?: any;
          first?: number;
          after?: string;
        },
        context: GraphQLContext,
        info: GraphQLResolveInfo
      ) => {
        // Validate pagination arguments
        if (args.first && (args.first < 1 || args.first > 100)) {
          throw new UserInputError('first must be between 1 and 100');
        }

        // Apply organization filter automatically
        const filter = {
          ...args.filter,
          organizationId: context.user!.organizationId,
        };

        // Check for expensive operations
        const isComplexQuery = info.fieldNodes.some(node =>
          node.selectionSet?.selections.some((selection: any) =>
            selection.name?.value === 'aggregations'
          )
        );

        if (isComplexQuery && !hasRequiredRole(context.user!.role, UserRole.ANALYST)) {
          throw new ForbiddenError('Aggregations require ANALYST role or higher');
        }

        try {
          // Use service layer with proper error handling
          const result = await context.services.data.getSecurityEvents(filter, {
            first: args.first || 20,
            after: args.after,
          });

          // Build connection response
          return {
            edges: result.events.map((event, index) => ({
              node: event,
              cursor: Buffer.from(`${event.id}-${index}`).toString('base64'),
            })),
            pageInfo: {
              hasNextPage: result.hasNextPage,
              hasPreviousPage: !!args.after,
              startCursor: result.events.length > 0 ? 
                Buffer.from(`${result.events[0].id}-0`).toString('base64') : null,
              endCursor: result.endCursor,
            },
            totalCount: result.events.length, // In production, get from count query
          };

        } catch (error) {
          // Log error with context
          console.error('Error fetching security events:', {
            error: error instanceof Error ? error.message : error,
            userId: context.user!.id,
            organizationId: context.user!.organizationId,
            filter,
          });
          
          // Re-throw with appropriate GraphQL error
          if (error instanceof Error && error.message.includes('timeout')) {
            throw new GraphQLError('Query timed out, please refine your filters', {
              extensions: { code: 'TIMEOUT' }
            });
          }
          
          throw error;
        }
      },
      {
        fallback: {
          edges: [],
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: null,
            endCursor: null,
          },
          totalCount: 0,
        },
        logError: true,
        alertOnError: true,
        retryAttempts: 2,
        retryDelay: 1000,
      }
    ),

    // Search query with full-text search capabilities
    searchEvents: async (
      parent: any,
      args: {
        query: string;
        filter?: any;
        first?: number;
        after?: string;
      },
      context: GraphQLContext,
      info: GraphQLResolveInfo
    ) => {
      // Validate search query
      if (!args.query || args.query.trim().length < 3) {
        throw new UserInputError('Search query must be at least 3 characters long');
      }

      // Sanitize search query to prevent injection
      const sanitizedQuery = args.query.replace(/[<>"'%;()&+]/g, '');
      
      if (sanitizedQuery !== args.query) {
        throw new UserInputError('Search query contains invalid characters');
      }

      // Apply rate limiting for search queries
      const rateLimitKey = `search:${context.user!.id}`;
      // Implementation would use rate limiter here

      try {
        // Perform search (integrate with Elasticsearch, etc.)
        const searchResults = await performSecurityEventSearch({
          query: sanitizedQuery,
          organizationId: context.user!.organizationId,
          filter: args.filter,
          pagination: { first: args.first || 20, after: args.after },
        });

        return {
          events: {
            edges: searchResults.events.map(event => ({
              node: event,
              cursor: event.id,
            })),
            pageInfo: {
              hasNextPage: searchResults.hasNextPage,
              hasPreviousPage: false,
              startCursor: null,
              endCursor: null,
            },
            totalCount: searchResults.totalCount,
          },
          suggestions: searchResults.suggestions || [],
          facets: searchResults.facets || {},
          totalTime: searchResults.executionTimeMs,
        };

      } catch (error) {
        console.error('Search error:', error);
        throw new GraphQLError('Search temporarily unavailable', {
          extensions: { code: 'SEARCH_ERROR' }
        });
      }
    },
  },

  Mutation: {
    // Create security event with validation and side effects
    createSecurityEvent: async (
      parent: any,
      args: { input: any },
      context: GraphQLContext,
      info: GraphQLResolveInfo
    ) => {
      // Input validation
      const { input } = args;
      
      if (!input.eventType || !input.severity || !input.title) {
        throw new UserInputError('Missing required fields: eventType, severity, title');
      }

      // Validate enum values
      const validSeverities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
      if (!validSeverities.includes(input.severity)) {
        throw new UserInputError(`Invalid severity. Must be one of: ${validSeverities.join(', ')}`);
      }

      // Check permissions
      fieldPermissionCheck('SECURITY_EVENT', 'CREATE', context);

      // Sanitize input
      const sanitizedInput = {
        ...input,
        organizationId: context.user!.organizationId,
        title: input.title.trim().substring(0, 255),
        description: input.description?.trim().substring(0, 1000),
        metadata: sanitizeMetadata(input.metadata),
      };

      try {
        // Create event
        const event = await context.services.data.createSecurityEvent(sanitizedInput);

        // Trigger related processes
        await triggerSecurityEventProcessing(event, context);

        return {
          success: true,
          event,
          message: 'Security event created successfully',
        };

      } catch (error) {
        console.error('Failed to create security event:', error);
        
        if (error instanceof Error && error.message.includes('duplicate')) {
          throw new ConflictError('Security event with similar properties already exists');
        }

        return {
          success: false,
          event: null,
          message: 'Failed to create security event',
          errors: [{
            message: error instanceof Error ? error.message : 'Unknown error',
            code: 'CREATION_FAILED',
          }],
        };
      }
    },

    // Bulk update with transaction handling
    bulkUpdateSecurityEvents: async (
      parent: any,
      args: { eventIds: string[]; updates: any },
      context: GraphQLContext,
      info: GraphQLResolveInfo
    ) => {
      // Validate bulk operation limits
      if (args.eventIds.length > 50) {
        throw new UserInputError('Cannot update more than 50 events at once');
      }

      // Check permissions
      fieldPermissionCheck('SECURITY_EVENT', 'UPDATE', context);

      const results = new PartialResponseBuilder();
      let successCount = 0;
      let failureCount = 0;
      
      // Process in batches for better performance
      const batchSize = 10;
      const batches = [];
      
      for (let i = 0; i < args.eventIds.length; i += batchSize) {
        batches.push(args.eventIds.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        await Promise.allSettled(
          batch.map(async (eventId) => {
            try {
              // Verify ownership
              const event = await context.dataloaders.securityEventLoader.load(eventId);
              if (!event || event.organizationId !== context.user!.organizationId) {
                throw new ForbiddenError(`Access denied to event ${eventId}`);
              }

              // Perform update (mock implementation)
              await updateSecurityEvent(eventId, args.updates);
              successCount++;

            } catch (error) {
              failureCount++;
              results.addError(new GraphQLError(
                `Failed to update event ${eventId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                { path: ['bulkUpdateSecurityEvents', eventId] }
              ));
            }
          })
        );
      }

      return {
        success: failureCount === 0,
        successCount,
        failureCount,
        message: `Updated ${successCount} events, ${failureCount} failed`,
        ...results.build(),
      };
    },
  },

  Subscription: {
    // Real-time security event updates with filtering
    securityEventUpdates: {
      subscribe: withFilter(
        () => context.pubsub.asyncIterator(['SECURITY_EVENT_CREATED', 'SECURITY_EVENT_UPDATED']),
        (payload, variables, context) => {
          // Apply organization and severity filters
          return organizationFilter(payload, variables, context) &&
                 severityFilter(payload, variables);
        }
      ),
      resolve: (payload: any) => ({
        type: payload.type,
        event: payload.event,
        timestamp: payload.timestamp,
      }),
    },

    // Live event stream with backpressure handling
    liveEventStream: {
      subscribe: async function* (
        parent: any,
        args: { filter?: any; bufferSize?: number },
        context: GraphQLContext
      ) {
        // Check permissions
        if (!hasRequiredRole(context.user!.role, UserRole.ANALYST)) {
          throw new ForbiddenError('Live event stream requires ANALYST role');
        }

        const bufferSize = Math.min(args.bufferSize || 100, 1000);
        const eventBuffer: SecurityEvent[] = [];
        
        // Set up event listener
        const unsubscribe = context.pubsub.asyncIterator(['SECURITY_EVENT_CREATED']);
        
        try {
          for await (const event of unsubscribe) {
            // Apply filters
            if (args.filter && !matchesFilter(event, args.filter)) {
              continue;
            }

            // Organization scope check
            if (event.organizationId !== context.user!.organizationId) {
              continue;
            }

            // Buffer management for backpressure
            eventBuffer.push(event);
            
            if (eventBuffer.length >= bufferSize) {
              const batch = eventBuffer.splice(0, bufferSize);
              yield {
                events: batch,
                bufferSize: eventBuffer.length,
                timestamp: new Date(),
              };
            }
          }
        } finally {
          // Cleanup
          if (typeof unsubscribe === 'function') {
            unsubscribe();
          }
        }
      },
    },
  },

  // Field resolvers with DataLoader optimization
  SecurityEvent: {
    // Related asset with caching
    asset: async (
      parent: SecurityEvent,
      args: any,
      context: GraphQLContext,
      info: GraphQLResolveInfo
    ) => {
      if (!parent.assetId) {
        return null;
      }

      // Use DataLoader for efficient batching
      return context.dataloaders.assetLoader.load(parent.assetId);
    },

    // User who triggered/reported the event
    user: async (
      parent: SecurityEvent,
      args: any,
      context: GraphQLContext,
      info: GraphQLResolveInfo
    ) => {
      if (!parent.userId) {
        return null;
      }

      return context.dataloaders.userLoader.load(parent.userId);
    },

    // Related alerts with filtering
    relatedAlerts: async (
      parent: SecurityEvent,
      args: { first?: number; severity?: string[] },
      context: GraphQLContext,
      info: GraphQLResolveInfo
    ) => {
      // Use specialized loader for event-alert relationships
      const allAlerts = await context.dataloaders.eventAlertsLoader.load(parent.id);
      
      // Apply filters
      let filteredAlerts = allAlerts;
      
      if (args.severity && args.severity.length > 0) {
        filteredAlerts = allAlerts.filter(alert => 
          args.severity!.includes(alert.severity)
        );
      }

      // Apply pagination
      const limit = Math.min(args.first || 20, 100);
      const paginatedAlerts = filteredAlerts.slice(0, limit);

      return {
        edges: paginatedAlerts.map(alert => ({
          node: alert,
          cursor: alert.id,
        })),
        pageInfo: {
          hasNextPage: filteredAlerts.length > limit,
          hasPreviousPage: false,
          startCursor: paginatedAlerts.length > 0 ? paginatedAlerts[0].id : null,
          endCursor: paginatedAlerts.length > 0 ? paginatedAlerts[paginatedAlerts.length - 1].id : null,
        },
        totalCount: filteredAlerts.length,
      };
    },

    // Computed field with caching
    riskScore: resilientResolver(
      async (
        parent: SecurityEvent,
        args: any,
        context: GraphQLContext,
        info: GraphQLResolveInfo
      ): Promise<number> => {
        // Use cached risk score if available
        const cached = await getCachedRiskScore(parent.id);
        if (cached !== null) {
          return cached;
        }

        // Calculate risk score based on multiple factors
        const riskScore = await calculateEventRiskScore(parent);
        
        // Cache the result
        await setCachedRiskScore(parent.id, riskScore, 300); // 5 min cache
        
        return riskScore;
      },
      0, // Default risk score
      'Risk score temporarily unavailable'
    ),

    // Sensitive metadata with field-level authorization
    metadata: (
      parent: SecurityEvent,
      args: any,
      context: GraphQLContext,
      info: GraphQLResolveInfo
    ) => {
      // Check if user has permission to view metadata
      try {
        fieldPermissionCheck('SECURITY_EVENT', 'READ_METADATA', context);
        return parent.metadata;
      } catch {
        // Return sanitized version for unauthorized users
        return {
          source: parent.metadata.source,
          eventType: parent.metadata.eventType,
          // Sensitive fields are filtered out
        };
      }
    },
  },
};

// Helper functions
async function performSecurityEventSearch(params: any) {
  // Mock search implementation
  return {
    events: [],
    hasNextPage: false,
    totalCount: 0,
    suggestions: [],
    facets: {},
    executionTimeMs: 150,
  };
}

function sanitizeMetadata(metadata: any): any {
  if (!metadata || typeof metadata !== 'object') {
    return {};
  }

  // Remove potentially dangerous fields
  const sanitized = { ...metadata };
  delete sanitized.password;
  delete sanitized.token;
  delete sanitized.secret;
  delete sanitized.key;

  return sanitized;
}

async function triggerSecurityEventProcessing(event: SecurityEvent, context: GraphQLContext): Promise<void> {
  // Trigger alert creation if needed
  if (event.severity === 'CRITICAL' || event.severity === 'HIGH') {
    // Create alert asynchronously
    createAlertFromEvent(event).catch(error => {
      console.error('Failed to create alert from event:', error);
    });
  }

  // Update metrics
  updateSecurityMetrics(event.organizationId, event.eventType, event.severity);

  // Notify relevant teams
  if (event.severity === 'CRITICAL') {
    notifySecurityTeam(event).catch(error => {
      console.error('Failed to notify security team:', error);
    });
  }
}

async function updateSecurityEvent(id: string, updates: any): Promise<void> {
  // Mock update implementation
  console.log(`Updating event ${id} with:`, updates);
}

function matchesFilter(event: any, filter: any): boolean {
  // Mock filter matching
  return true;
}

async function getCachedRiskScore(eventId: string): Promise<number | null> {
  // Mock cache implementation
  return null;
}

async function setCachedRiskScore(eventId: string, score: number, ttlSeconds: number): Promise<void> {
  // Mock cache implementation
}

async function calculateEventRiskScore(event: SecurityEvent): Promise<number> {
  // Mock risk calculation
  const severityScores = { LOW: 25, MEDIUM: 50, HIGH: 75, CRITICAL: 100 };
  return severityScores[event.severity as keyof typeof severityScores] || 0;
}

async function createAlertFromEvent(event: SecurityEvent): Promise<void> {
  // Mock alert creation
}

function updateSecurityMetrics(orgId: string, eventType: string, severity: string): void {
  // Mock metrics update
}

async function notifySecurityTeam(event: SecurityEvent): Promise<void> {
  // Mock notification
}

// Export resolver examples
export const exampleResolvers = {
  ...securityEventResolvers,
};

// Additional resolver patterns and utilities
export const resolverPatterns = {
  // Cursor-based pagination helper
  createCursorPagination: <T>(
    items: T[],
    first: number,
    after?: string,
    getId: (item: T) => string = (item: any) => item.id
  ) => {
    const startIndex = after ? 
      items.findIndex(item => getId(item) === after) + 1 : 0;
    
    const selectedItems = items.slice(startIndex, startIndex + first);
    const hasNextPage = startIndex + first < items.length;
    
    return {
      edges: selectedItems.map(item => ({
        node: item,
        cursor: getId(item),
      })),
      pageInfo: {
        hasNextPage,
        hasPreviousPage: startIndex > 0,
        startCursor: selectedItems.length > 0 ? getId(selectedItems[0]) : null,
        endCursor: selectedItems.length > 0 ? getId(selectedItems[selectedItems.length - 1]) : null,
      },
      totalCount: items.length,
    };
  },

  // Aggregation helper
  createAggregation: <T, K extends keyof T>(
    items: T[],
    groupByField: K,
    countField?: keyof T
  ) => {
    const groups = new Map<T[K], number>();
    
    for (const item of items) {
      const key = item[groupByField];
      const count = countField ? (item[countField] as number) : 1;
      groups.set(key, (groups.get(key) || 0) + count);
    }
    
    return Array.from(groups.entries()).map(([key, count]) => ({
      [groupByField]: key,
      count,
      percentage: (count / items.length) * 100,
    }));
  },

  // Field selection optimizer
  getRequestedFields: (info: GraphQLResolveInfo): Set<string> => {
    const fields = new Set<string>();
    
    const extractFields = (selections: any[], prefix = '') => {
      for (const selection of selections) {
        if (selection.kind === 'Field') {
          const fieldName = prefix ? `${prefix}.${selection.name.value}` : selection.name.value;
          fields.add(fieldName);
          
          if (selection.selectionSet) {
            extractFields(selection.selectionSet.selections, fieldName);
          }
        }
      }
    };
    
    info.fieldNodes.forEach(node => {
      if (node.selectionSet) {
        extractFields(node.selectionSet.selections);
      }
    });
    
    return fields;
  },
};

// Export everything
export default exampleResolvers;
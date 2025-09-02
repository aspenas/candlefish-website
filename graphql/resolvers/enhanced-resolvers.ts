/**
 * Enhanced Resolver Implementation for Real-Time Collaboration Platform
 * Optimized resolver patterns with DataLoader integration, caching, and performance monitoring
 */

import { 
  AuthenticationError, 
  ForbiddenError, 
  UserInputError, 
  withFilter 
} from 'apollo-server-express';
import { GraphQLResolveInfo } from 'graphql';
import { AuthContext } from '../types/context';
import { EnhancedCollaborationDataLoaders } from '../dataloaders/enhanced-dataloaders';
import { 
  requireAuth, 
  requirePermission, 
  requireResourcePermission, 
  Permission 
} from '../middleware/authorization-middleware';
import { 
  Project, 
  Document, 
  User, 
  Comment, 
  Version,
  AISuggestion,
  PresenceSession,
  ActivityEvent,
  CreateProjectInput,
  UpdateProjectInput,
  CreateDocumentInput,
  UpdateDocumentInput,
  ProjectFilters,
  DocumentFilters
} from '../types/schema';

// =============================================================================
// PERFORMANCE MONITORING
// =============================================================================

interface ResolverMetrics {
  name: string;
  executionTime: number;
  dataLoaderHits: number;
  dataLoaderMisses: number;
  complexity: number;
  timestamp: Date;
}

class ResolverMetricsCollector {
  private metrics: ResolverMetrics[] = [];
  
  recordExecution(
    resolverName: string,
    executionTime: number,
    dataLoaderStats: { hits: number; misses: number },
    complexity: number = 1
  ) {
    this.metrics.push({
      name: resolverName,
      executionTime,
      dataLoaderHits: dataLoaderStats.hits,
      dataLoaderMisses: dataLoaderStats.misses,
      complexity,
      timestamp: new Date()
    });
    
    // Keep only last 1000 metrics for memory efficiency
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }
  
  getAverageExecutionTime(resolverName: string): number {
    const resolverMetrics = this.metrics.filter(m => m.name === resolverName);
    if (resolverMetrics.length === 0) return 0;
    
    const totalTime = resolverMetrics.reduce((sum, m) => sum + m.executionTime, 0);
    return totalTime / resolverMetrics.length;
  }
  
  getMetricsSummary() {
    const summary = new Map<string, {
      count: number;
      avgTime: number;
      totalComplexity: number;
      cacheHitRate: number;
    }>();
    
    this.metrics.forEach(metric => {
      const existing = summary.get(metric.name) || {
        count: 0,
        avgTime: 0,
        totalComplexity: 0,
        cacheHitRate: 0
      };
      
      existing.count++;
      existing.avgTime = (existing.avgTime * (existing.count - 1) + metric.executionTime) / existing.count;
      existing.totalComplexity += metric.complexity;
      
      const totalRequests = metric.dataLoaderHits + metric.dataLoaderMisses;
      if (totalRequests > 0) {
        existing.cacheHitRate = metric.dataLoaderHits / totalRequests;
      }
      
      summary.set(metric.name, existing);
    });
    
    return Object.fromEntries(summary);
  }
}

const metricsCollector = new ResolverMetricsCollector();

// =============================================================================
// RESOLVER DECORATOR FOR PERFORMANCE MONITORING
// =============================================================================

function withMetrics(resolverName: string, complexity: number = 1) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      const context = args[2] as AuthContext;
      
      // Get initial DataLoader stats
      const initialStats = context.dataLoaders?.getMetrics() || {};
      
      try {
        const result = await method.apply(this, args);
        
        // Calculate execution time
        const executionTime = Date.now() - startTime;
        
        // Get final DataLoader stats and calculate difference
        const finalStats = context.dataLoaders?.getMetrics() || {};
        const dataLoaderStats = calculateDataLoaderDifference(initialStats, finalStats);
        
        // Record metrics
        metricsCollector.recordExecution(
          resolverName,
          executionTime,
          dataLoaderStats,
          complexity
        );
        
        return result;
      } catch (error) {
        const executionTime = Date.now() - startTime;
        metricsCollector.recordExecution(
          resolverName,
          executionTime,
          { hits: 0, misses: 0 },
          complexity
        );
        throw error;
      }
    };
    
    return descriptor;
  };
}

function calculateDataLoaderDifference(initial: any, final: any) {
  let totalHits = 0;
  let totalMisses = 0;
  
  Object.keys(final).forEach(loaderName => {
    const initialMetrics = initial[loaderName] || { cacheHits: 0, cacheMisses: 0 };
    const finalMetrics = final[loaderName] || { cacheHits: 0, cacheMisses: 0 };
    
    totalHits += finalMetrics.cacheHits - initialMetrics.cacheHits;
    totalMisses += finalMetrics.cacheMisses - initialMetrics.cacheMisses;
  });
  
  return { hits: totalHits, misses: totalMisses };
}

// =============================================================================
// ENHANCED QUERY RESOLVERS
// =============================================================================

export class EnhancedQueryResolvers {
  // =============================================================================
  // PROJECT QUERIES
  // =============================================================================
  
  @withMetrics('Query.project', 2)
  static async project(
    parent: any,
    args: { id: string },
    context: AuthContext,
    info: GraphQLResolveInfo
  ): Promise<Project> {
    return await requireAuth(async () => {
      const project = await context.dataLoaders.project.load(args.id);
      
      if (!project) {
        throw new UserInputError(`Project with ID ${args.id} not found`);
      }
      
      return project;
    })(parent, args, context, info);
  }
  
  @withMetrics('Query.projects', 3)
  static async projects(
    parent: any,
    args: {
      filters?: ProjectFilters;
      first?: number;
      after?: string;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    },
    context: AuthContext,
    info: GraphQLResolveInfo
  ): Promise<{ edges: Array<{ node: Project; cursor: string }>; pageInfo: any }> {
    return await requireAuth(async () => {
      // Build filter key for DataLoader
      const filterKey = [
        args.filters?.workspaceId || 'null',
        args.filters?.status || 'null',
        args.filters?.search || 'null',
        args.sortBy || 'updated',
        args.first?.toString() || '20',
        args.after || '0'
      ].join(':');
      
      const projects = await context.dataLoaders.documentsWithFilters.load(filterKey);
      
      // Convert to connection format
      const edges = projects.map((project, index) => ({
        node: project,
        cursor: Buffer.from(`${index}`).toString('base64')
      }));
      
      const pageInfo = {
        hasNextPage: projects.length === (args.first || 20),
        hasPreviousPage: Boolean(args.after),
        startCursor: edges[0]?.cursor,
        endCursor: edges[edges.length - 1]?.cursor
      };
      
      return { edges, pageInfo };
    })(parent, args, context, info);
  }
  
  @withMetrics('Query.myProjects', 2)
  static async myProjects(
    parent: any,
    args: any,
    context: AuthContext,
    info: GraphQLResolveInfo
  ): Promise<Project[]> {
    return await requireAuth(async () => {
      return await context.dataLoaders.userProjects.load(context.user!.id);
    })(parent, args, context, info);
  }
  
  // =============================================================================
  // DOCUMENT QUERIES
  // =============================================================================
  
  @withMetrics('Query.document', 2)
  static async document(
    parent: any,
    args: { id: string },
    context: AuthContext,
    info: GraphQLResolveInfo
  ): Promise<Document> {
    return await requireAuth(async () => {
      const document = await context.dataLoaders.document.load(args.id);
      
      if (!document) {
        throw new UserInputError(`Document with ID ${args.id} not found`);
      }
      
      return document;
    })(parent, args, context, info);
  }
  
  @withMetrics('Query.documents', 4)
  static async documents(
    parent: any,
    args: {
      filters?: DocumentFilters;
      first?: number;
      after?: string;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    },
    context: AuthContext,
    info: GraphQLResolveInfo
  ): Promise<{ edges: Array<{ node: Document; cursor: string }>; pageInfo: any }> {
    return await requireAuth(async () => {
      const filterKey = [
        args.filters?.projectId || 'null',
        args.filters?.status || 'null',
        args.filters?.search || 'null',
        args.sortBy || 'updated',
        args.first?.toString() || '20',
        args.after || '0'
      ].join(':');
      
      const documents = await context.dataLoaders.documentsWithFilters.load(filterKey);
      
      const edges = documents.map((doc, index) => ({
        node: doc,
        cursor: Buffer.from(`${index}`).toString('base64')
      }));
      
      const pageInfo = {
        hasNextPage: documents.length === (args.first || 20),
        hasPreviousPage: Boolean(args.after),
        startCursor: edges[0]?.cursor,
        endCursor: edges[edges.length - 1]?.cursor
      };
      
      return { edges, pageInfo };
    })(parent, args, context, info);
  }
  
  @withMetrics('Query.myRecentDocuments', 2)
  static async myRecentDocuments(
    parent: any,
    args: { limit?: number },
    context: AuthContext,
    info: GraphQLResolveInfo
  ): Promise<Document[]> {
    return await requireAuth(async () => {
      return await context.dataLoaders.userRecentDocuments.load(context.user!.id);
    })(parent, args, context, info);
  }
  
  // =============================================================================
  // AI INTEGRATION QUERIES
  // =============================================================================
  
  @withMetrics('Query.aiSuggestions', 3)
  static async aiSuggestions(
    parent: any,
    args: { 
      documentId: string;
      types?: string[];
      limit?: number;
    },
    context: AuthContext,
    info: GraphQLResolveInfo
  ): Promise<AISuggestion[]> {
    return await requireAuth(async () => {
      const suggestions = await context.dataLoaders.documentAISuggestions.load(args.documentId);
      
      // Filter by types if specified
      if (args.types && args.types.length > 0) {
        return suggestions.filter(s => args.types!.includes(s.type));
      }
      
      // Apply limit
      if (args.limit) {
        return suggestions.slice(0, args.limit);
      }
      
      return suggestions;
    })(parent, args, context, info);
  }
  
  @withMetrics('Query.projectAnalytics', 5)
  static async projectAnalytics(
    parent: any,
    args: { 
      projectId: string;
      timeRange?: { start: Date; end: Date };
      metrics?: string[];
    },
    context: AuthContext,
    info: GraphQLResolveInfo
  ): Promise<any> {
    return await requirePermission(Permission.VIEW_ANALYTICS)(async () => {
      return await context.dataLoaders.projectAnalytics.load(args.projectId);
    })(parent, args, context, info);
  }
}

// =============================================================================
// ENHANCED MUTATION RESOLVERS
// =============================================================================

export class EnhancedMutationResolvers {
  // =============================================================================
  // PROJECT MUTATIONS
  // =============================================================================
  
  @withMetrics('Mutation.createProject', 3)
  static async createProject(
    parent: any,
    args: { input: CreateProjectInput },
    context: AuthContext,
    info: GraphQLResolveInfo
  ): Promise<{ project: Project; errors?: string[] }> {
    return await requirePermission(Permission.VERIFIED_USER)(async () => {
      try {
        const query = `
          INSERT INTO projects (
            name, description, workspace_id, organization_id, owner_id, 
            visibility, settings, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *
        `;
        
        const values = [
          args.input.name,
          args.input.description,
          args.input.workspaceId,
          context.user!.organizationId,
          context.user!.id,
          args.input.visibility || 'private',
          JSON.stringify(args.input.settings || {}),
          JSON.stringify(args.input.metadata || {})
        ];
        
        const result = await context.db.query(query, values);
        const projectRow = result.rows[0];
        
        // Transform database row to Project type
        const project: Project = {
          id: projectRow.id,
          name: projectRow.name,
          description: projectRow.description,
          status: projectRow.status,
          visibility: projectRow.visibility,
          workspaceId: projectRow.workspace_id,
          organizationId: projectRow.organization_id,
          ownerId: projectRow.owner_id,
          settings: projectRow.settings,
          metadata: projectRow.metadata,
          createdAt: projectRow.created_at,
          updatedAt: projectRow.updated_at,
          documentCount: 0,
          collaboratorCount: 1,
          workspace: null
        };
        
        // Invalidate related caches
        await context.dataLoaders.invalidateEntity('user', context.user!.id);
        
        return { project };
      } catch (error) {
        console.error('Error creating project:', error);
        return { 
          project: null, 
          errors: ['Failed to create project. Please try again.'] 
        };
      }
    })(parent, args, context, info);
  }
  
  @withMetrics('Mutation.updateProject', 3)
  static async updateProject(
    parent: any,
    args: { id: string; input: UpdateProjectInput },
    context: AuthContext,
    info: GraphQLResolveInfo
  ): Promise<{ project: Project; errors?: string[] }> {
    return await requireResourcePermission(
      Permission.EDIT_PROJECT,
      () => ({ type: 'project', id: args.id })
    )(async () => {
      try {
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;
        
        if (args.input.name !== undefined) {
          updates.push(`name = $${paramIndex++}`);
          values.push(args.input.name);
        }
        
        if (args.input.description !== undefined) {
          updates.push(`description = $${paramIndex++}`);
          values.push(args.input.description);
        }
        
        if (args.input.status !== undefined) {
          updates.push(`status = $${paramIndex++}`);
          values.push(args.input.status);
        }
        
        if (args.input.visibility !== undefined) {
          updates.push(`visibility = $${paramIndex++}`);
          values.push(args.input.visibility);
        }
        
        if (args.input.settings !== undefined) {
          updates.push(`settings = $${paramIndex++}`);
          values.push(JSON.stringify(args.input.settings));
        }
        
        updates.push(`updated_at = NOW()`);
        values.push(args.id);
        
        const query = `
          UPDATE projects 
          SET ${updates.join(', ')}
          WHERE id = $${paramIndex} AND organization_id = $${paramIndex + 1}
          RETURNING *
        `;
        
        values.push(context.user!.organizationId);
        
        const result = await context.db.query(query, values);
        
        if (result.rows.length === 0) {
          throw new UserInputError('Project not found or access denied');
        }
        
        // Invalidate caches
        await context.dataLoaders.invalidateEntity('project', args.id);
        
        // Load updated project through DataLoader
        const project = await context.dataLoaders.project.load(args.id);
        
        return { project };
      } catch (error) {
        console.error('Error updating project:', error);
        return { 
          project: null, 
          errors: ['Failed to update project. Please try again.'] 
        };
      }
    })(parent, args, context, info);
  }
  
  // =============================================================================
  // DOCUMENT MUTATIONS
  // =============================================================================
  
  @withMetrics('Mutation.createDocument', 3)
  static async createDocument(
    parent: any,
    args: { input: CreateDocumentInput },
    context: AuthContext,
    info: GraphQLResolveInfo
  ): Promise<{ document: Document; errors?: string[] }> {
    return await requireResourcePermission(
      Permission.EDIT_PROJECT,
      () => ({ type: 'project', id: args.input.projectId })
    )(async () => {
      const client = await context.db.connect();
      
      try {
        await client.query('BEGIN');
        
        // Create document
        const documentQuery = `
          INSERT INTO documents (
            title, type, project_id, created_by, status, settings, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `;
        
        const documentValues = [
          args.input.title,
          args.input.type || 'document',
          args.input.projectId,
          context.user!.id,
          'draft',
          JSON.stringify(args.input.settings || {}),
          JSON.stringify(args.input.metadata || {})
        ];
        
        const documentResult = await client.query(documentQuery, documentValues);
        const documentRow = documentResult.rows[0];
        
        // Create initial version
        const versionQuery = `
          INSERT INTO versions (
            document_id, content, sequence_number, created_by, change_summary
          ) VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `;
        
        const versionValues = [
          documentRow.id,
          args.input.content || '',
          1,
          context.user!.id,
          'Initial version'
        ];
        
        const versionResult = await client.query(versionQuery, versionValues);
        const versionRow = versionResult.rows[0];
        
        // Update document with current version
        await client.query(
          'UPDATE documents SET current_version_id = $1 WHERE id = $2',
          [versionRow.id, documentRow.id]
        );
        
        await client.query('COMMIT');
        
        // Invalidate related caches
        await context.dataLoaders.invalidateEntity('project', args.input.projectId);
        
        // Create Document object
        const document: Document = {
          id: documentRow.id,
          title: documentRow.title,
          content: args.input.content || '',
          status: documentRow.status,
          type: documentRow.type,
          projectId: documentRow.project_id,
          currentVersionId: versionRow.id,
          createdBy: documentRow.created_by,
          metadata: documentRow.metadata,
          settings: documentRow.settings,
          createdAt: documentRow.created_at,
          updatedAt: documentRow.updated_at,
          version: 1,
          commentCount: 0,
          activeCollaborators: 0,
          qualityScore: null,
          organizationId: context.user!.organizationId,
          projectName: null
        };
        
        return { document };
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating document:', error);
        return { 
          document: null, 
          errors: ['Failed to create document. Please try again.'] 
        };
      } finally {
        client.release();
      }
    })(parent, args, context, info);
  }
  
  // =============================================================================
  // AI MUTATIONS
  // =============================================================================
  
  @withMetrics('Mutation.generateAISuggestion', 4)
  static async generateAISuggestion(
    parent: any,
    args: {
      documentId: string;
      type: string;
      context?: any;
      agentId?: string;
    },
    context: AuthContext,
    info: GraphQLResolveInfo
  ): Promise<{ suggestion: AISuggestion; errors?: string[] }> {
    return await requireResourcePermission(
      Permission.VIEW,
      () => ({ type: 'document', id: args.documentId })
    )(async () => {
      try {
        // Get document content for context
        const document = await context.dataLoaders.document.load(args.documentId);
        
        if (!document) {
          throw new UserInputError('Document not found');
        }
        
        // Call AI service (placeholder implementation)
        const aiContext = {
          documentContent: document.content,
          documentType: document.type,
          userPreferences: context.user!.collaborationPreferences,
          ...args.context
        };
        
        const aiResponse = await context.services.ai.generateSuggestion({
          type: args.type,
          context: aiContext,
          agentId: args.agentId
        });
        
        // Save suggestion to database
        const query = `
          INSERT INTO ai_suggestions (
            document_id, agent_id, type, content, confidence, context, status, expires_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *
        `;
        
        const values = [
          args.documentId,
          args.agentId || 'default-agent',
          args.type,
          JSON.stringify(aiResponse.content),
          aiResponse.confidence,
          JSON.stringify(aiContext),
          'active',
          new Date(Date.now() + 24 * 60 * 60 * 1000) // Expires in 24 hours
        ];
        
        const result = await context.db.query(query, values);
        const suggestionRow = result.rows[0];
        
        // Invalidate cache
        await context.dataLoaders.invalidateEntity('document', args.documentId);
        
        const suggestion: AISuggestion = {
          id: suggestionRow.id,
          documentId: suggestionRow.document_id,
          agentId: suggestionRow.agent_id,
          type: suggestionRow.type,
          content: suggestionRow.content,
          confidence: suggestionRow.confidence,
          context: suggestionRow.context,
          status: suggestionRow.status,
          feedback: null,
          createdAt: suggestionRow.created_at,
          expiresAt: suggestionRow.expires_at,
          agent: {
            name: 'NANDA Assistant',
            capabilities: ['text-generation', 'analysis']
          }
        };
        
        return { suggestion };
      } catch (error) {
        console.error('Error generating AI suggestion:', error);
        return { 
          suggestion: null, 
          errors: ['Failed to generate AI suggestion. Please try again.'] 
        };
      }
    })(parent, args, context, info);
  }
}

// =============================================================================
// ENHANCED SUBSCRIPTION RESOLVERS
// =============================================================================

export class EnhancedSubscriptionResolvers {
  @withMetrics('Subscription.documentChanged', 2)
  static documentChanged = {
    subscribe: withFilter(
      (parent: any, args: any, context: AuthContext) => context.pubsub.asyncIterator('DOCUMENT_CHANGED'),
      async (payload: any, variables: any, context: AuthContext) => {
        // Check if user has access to the document
        if (!context.user) return false;
        
        const hasAccess = await context.authService.hasPermission(
          context.user.id,
          Permission.VIEW,
          context,
          'document',
          payload.documentChanged.document.id
        );
        
        return hasAccess && payload.documentChanged.document.id === variables.documentId;
      }
    ),
    resolve: (payload: any) => payload.documentChanged
  };
  
  @withMetrics('Subscription.aiSuggestionsGenerated', 3)
  static aiSuggestionsGenerated = {
    subscribe: withFilter(
      (parent: any, args: any, context: AuthContext) => context.pubsub.asyncIterator('AI_SUGGESTION_GENERATED'),
      async (payload: any, variables: any, context: AuthContext) => {
        if (!context.user) return false;
        
        const hasAccess = await context.authService.hasPermission(
          context.user.id,
          Permission.VIEW,
          context,
          'document',
          payload.aiSuggestionGenerated.documentId
        );
        
        return hasAccess && payload.aiSuggestionGenerated.documentId === variables.documentId;
      }
    ),
    resolve: (payload: any) => payload.aiSuggestionGenerated
  };
}

// =============================================================================
// FIELD RESOLVERS WITH DATALOADER OPTIMIZATION
// =============================================================================

export const EnhancedFieldResolvers = {
  Project: {
    documents: async (parent: Project, args: any, context: AuthContext) => {
      return await context.dataLoaders.projectDocuments.load(parent.id);
    },
    
    collaborators: async (parent: Project, args: any, context: AuthContext) => {
      return await context.dataLoaders.projectCollaborators.load(parent.id);
    },
    
    analytics: async (parent: Project, args: any, context: AuthContext) => {
      // Check permission before loading analytics
      const hasPermission = await context.authService.hasPermission(
        context.user!.id,
        Permission.VIEW_ANALYTICS,
        context,
        'project',
        parent.id
      );
      
      if (!hasPermission) {
        throw new ForbiddenError('Insufficient permissions to view analytics');
      }
      
      return await context.dataLoaders.projectAnalytics.load(parent.id);
    }
  },
  
  Document: {
    comments: async (parent: Document, args: any, context: AuthContext) => {
      return await context.dataLoaders.documentComments.load(parent.id);
    },
    
    versions: async (parent: Document, args: any, context: AuthContext) => {
      return await context.dataLoaders.documentVersions.load(parent.id);
    },
    
    aiSuggestions: async (parent: Document, args: any, context: AuthContext) => {
      return await context.dataLoaders.documentAISuggestions.load(parent.id);
    },
    
    presence: async (parent: Document, args: any, context: AuthContext) => {
      return await context.dataLoaders.documentPresence.load(parent.id);
    }
  },
  
  User: {
    projects: async (parent: User, args: any, context: AuthContext) => {
      // Only load if requesting own projects or has permission
      if (parent.id === context.user?.id || 
          await context.authService.hasPermission(context.user!.id, Permission.VIEW_ANALYTICS, context)) {
        return await context.dataLoaders.userProjects.load(parent.id);
      }
      return [];
    },
    
    recentDocuments: async (parent: User, args: any, context: AuthContext) => {
      if (parent.id === context.user?.id) {
        return await context.dataLoaders.userRecentDocuments.load(parent.id);
      }
      return [];
    }
  }
};

// =============================================================================
// RESOLVER COMPOSITION
// =============================================================================

export const enhancedResolvers = {
  Query: {
    ...EnhancedQueryResolvers,
    
    // Metrics endpoint for monitoring
    resolverMetrics: requirePermission(Permission.SYSTEM_ADMIN)(
      async () => metricsCollector.getMetricsSummary()
    )
  },
  
  Mutation: {
    ...EnhancedMutationResolvers
  },
  
  Subscription: {
    ...EnhancedSubscriptionResolvers
  },
  
  ...EnhancedFieldResolvers
};

export default enhancedResolvers;
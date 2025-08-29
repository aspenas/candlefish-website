import { QueryResolvers, MutationResolvers, ThreatIntelligenceResolvers } from '../../../generated/graphql';
import { Context } from '../../../types/context';
import { AuthenticationError, ForbiddenError, ValidationError } from '../../../errors';
import { validatePaginationArgs, createConnection } from '../../../utils/pagination';
import { validateThreatIntelligenceInput, validateThreatIntelligenceFilter } from '../validators';
import { AuditLogger } from '../../../utils/audit-logger';

// Query resolvers for Threat Intelligence
const Query: Pick<QueryResolvers, 'threatIntelligence' | 'threat' | 'searchThreats' | 'threatLandscape' | 'threatAnalytics' | 'attributionAnalysis' | 'threatIntelligenceDashboard'> = {
  async threatIntelligence(
    parent,
    { filter, sort, first, after, last, before },
    context: Context
  ) {
    const { dataSources, organizationId, userId, userRole } = context;
    
    if (!organizationId) {
      throw new AuthenticationError('Organization context required');
    }
    
    // Validate pagination arguments
    validatePaginationArgs({ first, after, last, before });
    
    // Validate and sanitize filter
    const validatedFilter = validateThreatIntelligenceFilter(filter);
    
    // Add organization scope to filter
    const scopedFilter = {
      ...validatedFilter,
      organizationId,
    };
    
    // Fetch threats with pagination
    const { threats, totalCount, pageInfo } = await dataSources.threatIntelligence.findMany(
      scopedFilter,
      {
        sort,
        first,
        after,
        last,
        before,
      }
    );
    
    // Create connection
    const edges = threats.map((threat, index) => ({
      node: threat,
      cursor: threat.id,
    }));
    
    return {
      edges,
      pageInfo,
      totalCount,
      filter: scopedFilter, // Pass filter to connection resolver for aggregations
    };
  },
  
  async threat(parent, { id }, context: Context) {
    const { dataLoaders, organizationId } = context;
    
    if (!organizationId) {
      throw new AuthenticationError('Organization context required');
    }
    
    const threat = await dataLoaders.threats.load(id);
    
    if (!threat) {
      return null;
    }
    
    // Verify organization access
    if (threat.organizationId !== organizationId) {
      throw new ForbiddenError('Access denied to threat intelligence');
    }
    
    return threat;
  },
  
  async searchThreats(
    parent,
    { query, filter, sort, first = 20, after },
    context: Context
  ) {
    const { dataSources, organizationId } = context;
    
    if (!organizationId) {
      throw new AuthenticationError('Organization context required');
    }
    
    const startTime = Date.now();
    
    const validatedFilter = validateThreatIntelligenceFilter(filter);
    const scopedFilter = {
      ...validatedFilter,
      organizationId,
    };
    
    // Perform search with elasticsearch or similar
    const searchResult = await dataSources.threatIntelligence.search(
      query,
      scopedFilter,
      {
        sort,
        first,
        after,
      }
    );
    
    const totalTime = Date.now() - startTime;
    
    // Create connection from search results
    const connection = createConnection(
      searchResult.threats,
      searchResult.pageInfo,
      searchResult.totalCount
    );
    
    return {
      threats: connection,
      suggestions: searchResult.suggestions,
      facets: searchResult.facets,
      totalTime,
      searchId: searchResult.searchId,
    };
  },
  
  async threatLandscape(
    parent,
    { organizationId: orgId, sector, region, timeRange },
    context: Context
  ) {
    const { dataSources, organizationId } = context;
    
    // Use provided orgId if user has admin privileges, otherwise use context orgId
    const targetOrgId = context.userRole === 'SUPER_ADMIN' ? orgId : organizationId;
    
    if (!targetOrgId) {
      throw new AuthenticationError('Organization context required');
    }
    
    return dataSources.threatIntelligence.getThreatLandscape({
      organizationId: targetOrgId,
      sector,
      region,
      timeRange,
    });
  },
  
  async threatAnalytics(
    parent,
    { organizationId: orgId, timeRange, filters },
    context: Context
  ) {
    const { dataSources, organizationId } = context;
    
    const targetOrgId = context.userRole === 'SUPER_ADMIN' ? orgId : organizationId;
    
    if (!targetOrgId) {
      throw new AuthenticationError('Organization context required');
    }
    
    return dataSources.analytics.getThreatAnalytics({
      organizationId: targetOrgId,
      timeRange,
      filters,
    });
  },
  
  async attributionAnalysis(
    parent,
    { indicators, threatTypes, confidence = 'MEDIUM' },
    context: Context
  ) {
    const { dataSources, organizationId } = context;
    
    if (!organizationId) {
      throw new AuthenticationError('Organization context required');
    }
    
    return dataSources.attribution.analyzeAttribution({
      indicators,
      threatTypes,
      confidence,
      organizationId,
    });
  },
  
  async threatIntelligenceDashboard(
    parent,
    { organizationId: orgId, timeRange },
    context: Context
  ) {
    const { dataSources, organizationId } = context;
    
    const targetOrgId = context.userRole === 'SUPER_ADMIN' ? orgId : organizationId;
    
    if (!targetOrgId) {
      throw new AuthenticationError('Organization context required');
    }
    
    return dataSources.dashboard.getThreatIntelligenceDashboard({
      organizationId: targetOrgId,
      timeRange,
    });
  },
};

// Mutation resolvers for Threat Intelligence
const Mutation: Pick<MutationResolvers, 'createThreatIntelligence' | 'updateThreatIntelligence' | 'deleteThreatIntelligence'> = {
  async createThreatIntelligence(
    parent,
    { input },
    context: Context
  ) {
    const { dataSources, dataLoaders, organizationId, userId } = context;
    
    if (!organizationId || !userId) {
      throw new AuthenticationError('Authentication required');
    }
    
    // Validate input
    const validatedInput = validateThreatIntelligenceInput(input);
    
    try {
      // Create threat intelligence
      const threat = await dataSources.threatIntelligence.create({
        ...validatedInput,
        organizationId,
        createdBy: userId,
      });
      
      // Clear relevant caches
      dataLoaders.threats.clear(threat.id);
      
      // Log audit event
      await AuditLogger.log({
        action: 'CREATE_THREAT_INTELLIGENCE',
        entityType: 'ThreatIntelligence',
        entityId: threat.id,
        userId,
        organizationId,
        metadata: { input: validatedInput },
      });
      
      return {
        success: true,
        threat,
        errors: [],
        message: 'Threat intelligence created successfully',
      };
    } catch (error) {
      console.error('Error creating threat intelligence:', error);
      
      return {
        success: false,
        threat: null,
        errors: [{
          message: error.message,
          field: 'general',
          code: 'CREATE_ERROR',
        }],
        message: 'Failed to create threat intelligence',
      };
    }
  },
  
  async updateThreatIntelligence(
    parent,
    { id, input },
    context: Context
  ) {
    const { dataSources, dataLoaders, organizationId, userId } = context;
    
    if (!organizationId || !userId) {
      throw new AuthenticationError('Authentication required');
    }
    
    // Verify threat exists and user has access
    const existingThreat = await dataLoaders.threats.load(id);
    if (!existingThreat) {
      return {
        success: false,
        threat: null,
        errors: [{
          message: 'Threat intelligence not found',
          field: 'id',
          code: 'NOT_FOUND',
        }],
        message: 'Threat intelligence not found',
      };
    }
    
    if (existingThreat.organizationId !== organizationId) {
      throw new ForbiddenError('Access denied to threat intelligence');
    }
    
    // Validate input
    const validatedInput = validateThreatIntelligenceInput(input, true); // partial update
    
    try {
      const updatedThreat = await dataSources.threatIntelligence.update(id, {
        ...validatedInput,
        updatedBy: userId,
        updatedAt: new Date(),
      });
      
      // Clear caches
      dataLoaders.threats.clear(id);
      
      // Clear related caches that might be affected
      if (validatedInput.threatActorIds) {
        validatedInput.threatActorIds.forEach(actorId => {
          dataLoaders.threatsByActor.clear(actorId);
        });
      }
      
      if (validatedInput.campaignIds) {
        validatedInput.campaignIds.forEach(campaignId => {
          dataLoaders.threatsByCampaign.clear(campaignId);
        });
      }
      
      // Log audit event
      await AuditLogger.log({
        action: 'UPDATE_THREAT_INTELLIGENCE',
        entityType: 'ThreatIntelligence',
        entityId: id,
        userId,
        organizationId,
        metadata: {
          input: validatedInput,
          previousValues: existingThreat,
        },
      });
      
      return {
        success: true,
        threat: updatedThreat,
        errors: [],
        message: 'Threat intelligence updated successfully',
      };
    } catch (error) {
      console.error('Error updating threat intelligence:', error);
      
      return {
        success: false,
        threat: null,
        errors: [{
          message: error.message,
          field: 'general',
          code: 'UPDATE_ERROR',
        }],
        message: 'Failed to update threat intelligence',
      };
    }
  },
  
  async deleteThreatIntelligence(
    parent,
    { id },
    context: Context
  ) {
    const { dataSources, dataLoaders, organizationId, userId } = context;
    
    if (!organizationId || !userId) {
      throw new AuthenticationError('Authentication required');
    }
    
    // Verify threat exists and user has access
    const existingThreat = await dataLoaders.threats.load(id);
    if (!existingThreat) {
      return {
        success: false,
        message: 'Threat intelligence not found',
      };
    }
    
    if (existingThreat.organizationId !== organizationId) {
      throw new ForbiddenError('Access denied to threat intelligence');
    }
    
    try {
      await dataSources.threatIntelligence.delete(id);
      
      // Clear all related caches
      dataLoaders.threats.clear(id);
      
      // Clear relationship caches
      existingThreat.threatActorIds?.forEach(actorId => {
        dataLoaders.threatsByActor.clear(actorId);
      });
      
      existingThreat.campaignIds?.forEach(campaignId => {
        dataLoaders.threatsByCampaign.clear(campaignId);
      });
      
      // Log audit event
      await AuditLogger.log({
        action: 'DELETE_THREAT_INTELLIGENCE',
        entityType: 'ThreatIntelligence',
        entityId: id,
        userId,
        organizationId,
        metadata: { deletedThreat: existingThreat },
      });
      
      return {
        success: true,
        message: 'Threat intelligence deleted successfully',
      };
    } catch (error) {
      console.error('Error deleting threat intelligence:', error);
      
      return {
        success: false,
        message: 'Failed to delete threat intelligence',
      };
    }
  },
};

// Type resolvers for ThreatIntelligence
const ThreatIntelligence: ThreatIntelligenceResolvers = {
  // Federation resolver
  __resolveReference: async (reference: { id: string }, context: Context) => {
    return context.dataLoaders.threats.load(reference.id);
  },
  
  // Relationship resolvers using DataLoaders
  threatActors: async (parent, args, context: Context) => {
    const { dataLoaders } = context;
    
    if (parent.threatActorIds && parent.threatActorIds.length > 0) {
      return dataLoaders.actorsByIds.load(parent.threatActorIds);
    }
    
    return dataLoaders.actorsByThreat.load(parent.id);
  },
  
  campaigns: async (parent, args, context: Context) => {
    const { dataLoaders } = context;
    
    if (parent.campaignIds && parent.campaignIds.length > 0) {
      return dataLoaders.campaignsByIds.load(parent.campaignIds);
    }
    
    return dataLoaders.campaignsByThreat.load(parent.id);
  },
  
  indicators: async (parent, args, context: Context) => {
    return context.dataLoaders.indicatorsByThreat.load(parent.id);
  },
  
  iocs: async (parent, args, context: Context) => {
    return context.dataLoaders.iocsByThreat.load(parent.id);
  },
  
  relatedThreats: async (parent, args, context: Context) => {
    const { dataSources } = context;
    
    // Find related threats based on similar indicators, actors, or campaigns
    return dataSources.threatIntelligence.findRelatedThreats(parent.id, {
      maxResults: 10,
      similarityThreshold: 0.7,
      organizationId: parent.organizationId,
    });
  },
  
  mitigations: async (parent, args, context: Context) => {
    return context.dataLoaders.mitigationsByThreat.load(parent.id);
  },
  
  // External federated fields
  affectedAssets: async (parent, args, context: Context) => {
    // This would be resolved by the Asset service
    return [];
  },
  
  relatedAlerts: async (parent, args, context: Context) => {
    // This would be resolved by the Alert service
    return [];
  },
  
  relatedIncidents: async (parent, args, context: Context) => {
    // This would be resolved by the Incident service
    return [];
  },
  
  // Computed fields
  sources: async (parent, args, context: Context) => {
    const { dataSources } = context;
    
    if (parent.sourceIds && parent.sourceIds.length > 0) {
      return dataSources.threatSource.findByIds(parent.sourceIds);
    }
    
    return [];
  },
  
  // Audit trail - external resolution
  auditTrail: async (parent, args, context: Context) => {
    // This would be resolved by the Audit service
    return [];
  },
  
  createdBy: async (parent, args, context: Context) => {
    if (parent.createdById) {
      // This would be resolved by the Auth service
      return { id: parent.createdById };
    }
    return null;
  },
  
  updatedBy: async (parent, args, context: Context) => {
    if (parent.updatedById) {
      // This would be resolved by the Auth service
      return { id: parent.updatedById };
    }
    return null;
  },
};

export const threatIntelligenceResolvers = {
  Query,
  Mutation,
  ThreatIntelligence,
};

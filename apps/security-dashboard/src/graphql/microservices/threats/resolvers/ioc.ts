import { QueryResolvers, MutationResolvers, IOCResolvers } from '../../../generated/graphql';
import { Context } from '../../../types/context';
import { AuthenticationError, ForbiddenError, ValidationError } from '../../../errors';
import { validatePaginationArgs, createConnection } from '../../../utils/pagination';
import { validateIOCInput, validateIOCFilter, validateBulkImportInput } from '../validators';
import { AuditLogger } from '../../../utils/audit-logger';
import { IOCEnrichmentService } from '../services/ioc-enrichment';
import { IOCMatchingService } from '../services/ioc-matching';

// Query resolvers for IOCs
const Query: Pick<QueryResolvers, 'iocs' | 'ioc' | 'searchIOCs' | 'enrichIOC'> = {
  async iocs(
    parent,
    { filter, sort, first, after },
    context: Context
  ) {
    const { dataSources, organizationId } = context;
    
    if (!organizationId) {
      throw new AuthenticationError('Organization context required');
    }
    
    validatePaginationArgs({ first, after });
    
    const validatedFilter = validateIOCFilter(filter);
    const scopedFilter = {
      ...validatedFilter,
      organizationId,
    };
    
    const { iocs, totalCount, pageInfo } = await dataSources.ioc.findMany(
      scopedFilter,
      {
        sort,
        first,
        after,
      }
    );
    
    const edges = iocs.map(ioc => ({
      node: ioc,
      cursor: ioc.id,
    }));
    
    return {
      edges,
      pageInfo,
      totalCount,
      filter: scopedFilter,
    };
  },
  
  async ioc(parent, { id }, context: Context) {
    const { dataLoaders, organizationId } = context;
    
    if (!organizationId) {
      throw new AuthenticationError('Organization context required');
    }
    
    const ioc = await dataLoaders.iocs.load(id);
    
    if (!ioc) {
      return null;
    }
    
    // Verify organization access through related threats or direct ownership
    const hasAccess = await context.dataSources.ioc.verifyAccess(id, organizationId);
    
    if (!hasAccess) {
      throw new ForbiddenError('Access denied to IOC');
    }
    
    return ioc;
  },
  
  async searchIOCs(
    parent,
    { query, types, confidence, activeOnly = true, first = 50 },
    context: Context
  ) {
    const { dataSources, organizationId } = context;
    
    if (!organizationId) {
      throw new AuthenticationError('Organization context required');
    }
    
    const startTime = Date.now();
    
    // Perform IOC search with fuzzy matching
    const searchResult = await dataSources.ioc.search(
      query,
      {
        types,
        confidence,
        isActive: activeOnly,
        organizationId,
      },
      {
        first,
        fuzzyMatching: true,
        includeEnrichment: true,
      }
    );
    
    const totalTime = Date.now() - startTime;
    
    const connection = createConnection(
      searchResult.iocs,
      searchResult.pageInfo,
      searchResult.totalCount
    );
    
    return {
      iocs: connection,
      suggestions: searchResult.suggestions,
      facets: searchResult.facets,
      totalTime,
      searchId: searchResult.searchId,
    };
  },
  
  async enrichIOC(
    parent,
    { value, type, sources },
    context: Context
  ) {
    const { organizationId } = context;
    
    if (!organizationId) {
      throw new AuthenticationError('Organization context required');
    }
    
    // Rate limiting is handled by the @rateLimit directive
    const enrichmentService = new IOCEnrichmentService(context);
    
    try {
      const enrichment = await enrichmentService.enrichIndicator(
        value,
        type,
        sources
      );
      
      return enrichment;
    } catch (error) {
      console.error('IOC enrichment error:', error);
      throw new Error('Enrichment service temporarily unavailable');
    }
  },
};

// Mutation resolvers for IOCs
const Mutation: Pick<MutationResolvers, 'createIOC' | 'updateIOC' | 'deleteIOC' | 'whitelistIOC' | 'removeIOCWhitelist' | 'bulkImportIOCs'> = {
  async createIOC(
    parent,
    { input },
    context: Context
  ) {
    const { dataSources, dataLoaders, organizationId, userId } = context;
    
    if (!organizationId || !userId) {
      throw new AuthenticationError('Authentication required');
    }
    
    const validatedInput = validateIOCInput(input);
    
    try {
      // Check for duplicates
      const existingIOC = await dataSources.ioc.findByValue(
        validatedInput.value,
        validatedInput.type,
        organizationId
      );
      
      if (existingIOC) {
        return {
          success: false,
          ioc: null,
          errors: [{
            message: 'IOC with this value already exists',
            field: 'value',
            code: 'DUPLICATE_IOC',
          }],
          message: 'IOC already exists',
        };
      }
      
      // Create IOC with enrichment
      const enrichmentService = new IOCEnrichmentService(context);
      const enrichment = await enrichmentService.enrichIndicator(
        validatedInput.value,
        validatedInput.type
      );
      
      const ioc = await dataSources.ioc.create({
        ...validatedInput,
        enrichment,
        organizationId,
        createdBy: userId,
      });
      
      // Check for immediate matches against existing events
      const matchingService = new IOCMatchingService(context);
      const matches = await matchingService.findMatches(ioc.id);
      
      if (matches.length > 0) {
        // Create alerts for matches
        await Promise.all(
          matches.map(match =>
            context.dataSources.alert.createFromIOCMatch(match, ioc)
          )
        );
      }
      
      // Clear relevant caches
      dataLoaders.iocs.clear(ioc.id);
      
      // Log audit event
      await AuditLogger.log({
        action: 'CREATE_IOC',
        entityType: 'IOC',
        entityId: ioc.id,
        userId,
        organizationId,
        metadata: { input: validatedInput, matchCount: matches.length },
      });
      
      return {
        success: true,
        ioc,
        errors: [],
        message: `IOC created successfully${matches.length > 0 ? ` with ${matches.length} matches found` : ''}`,
      };
    } catch (error) {
      console.error('Error creating IOC:', error);
      
      return {
        success: false,
        ioc: null,
        errors: [{
          message: error.message,
          field: 'general',
          code: 'CREATE_ERROR',
        }],
        message: 'Failed to create IOC',
      };
    }
  },
  
  async updateIOC(
    parent,
    { id, input },
    context: Context
  ) {
    const { dataSources, dataLoaders, organizationId, userId } = context;
    
    if (!organizationId || !userId) {
      throw new AuthenticationError('Authentication required');
    }
    
    const existingIOC = await dataLoaders.iocs.load(id);
    if (!existingIOC) {
      return {
        success: false,
        ioc: null,
        errors: [{
          message: 'IOC not found',
          field: 'id',
          code: 'NOT_FOUND',
        }],
        message: 'IOC not found',
      };
    }
    
    const hasAccess = await dataSources.ioc.verifyAccess(id, organizationId);
    if (!hasAccess) {
      throw new ForbiddenError('Access denied to IOC');
    }
    
    const validatedInput = validateIOCInput(input, true);
    
    try {
      const updatedIOC = await dataSources.ioc.update(id, {
        ...validatedInput,
        updatedBy: userId,
        updatedAt: new Date(),
      });
      
      // Clear caches
      dataLoaders.iocs.clear(id);
      dataLoaders.iocEnrichment.clear(id);
      
      // If IOC was reactivated, check for new matches
      if (input.isActive && !existingIOC.isActive) {
        const matchingService = new IOCMatchingService(context);
        const matches = await matchingService.findMatches(id);
        
        if (matches.length > 0) {
          await Promise.all(
            matches.map(match =>
              context.dataSources.alert.createFromIOCMatch(match, updatedIOC)
            )
          );
        }
      }
      
      await AuditLogger.log({
        action: 'UPDATE_IOC',
        entityType: 'IOC',
        entityId: id,
        userId,
        organizationId,
        metadata: {
          input: validatedInput,
          previousValues: existingIOC,
        },
      });
      
      return {
        success: true,
        ioc: updatedIOC,
        errors: [],
        message: 'IOC updated successfully',
      };
    } catch (error) {
      console.error('Error updating IOC:', error);
      
      return {
        success: false,
        ioc: null,
        errors: [{
          message: error.message,
          field: 'general',
          code: 'UPDATE_ERROR',
        }],
        message: 'Failed to update IOC',
      };
    }
  },
  
  async deleteIOC(
    parent,
    { id },
    context: Context
  ) {
    const { dataSources, dataLoaders, organizationId, userId } = context;
    
    if (!organizationId || !userId) {
      throw new AuthenticationError('Authentication required');
    }
    
    const existingIOC = await dataLoaders.iocs.load(id);
    if (!existingIOC) {
      return {
        success: false,
        message: 'IOC not found',
      };
    }
    
    const hasAccess = await dataSources.ioc.verifyAccess(id, organizationId);
    if (!hasAccess) {
      throw new ForbiddenError('Access denied to IOC');
    }
    
    try {
      await dataSources.ioc.delete(id);
      
      // Clear caches
      dataLoaders.iocs.clear(id);
      dataLoaders.iocEnrichment.clear(id);
      
      await AuditLogger.log({
        action: 'DELETE_IOC',
        entityType: 'IOC',
        entityId: id,
        userId,
        organizationId,
        metadata: { deletedIOC: existingIOC },
      });
      
      return {
        success: true,
        message: 'IOC deleted successfully',
      };
    } catch (error) {
      console.error('Error deleting IOC:', error);
      
      return {
        success: false,
        message: 'Failed to delete IOC',
      };
    }
  },
  
  async whitelistIOC(
    parent,
    { id, reason, expiresAt },
    context: Context
  ) {
    const { dataSources, dataLoaders, organizationId, userId } = context;
    
    if (!organizationId || !userId) {
      throw new AuthenticationError('Authentication required');
    }
    
    const existingIOC = await dataLoaders.iocs.load(id);
    if (!existingIOC) {
      return {
        success: false,
        ioc: null,
        suppressionRule: null,
        message: 'IOC not found',
      };
    }
    
    const hasAccess = await dataSources.ioc.verifyAccess(id, organizationId);
    if (!hasAccess) {
      throw new ForbiddenError('Access denied to IOC');
    }
    
    try {
      // Update IOC whitelist status
      const updatedIOC = await dataSources.ioc.update(id, {
        isWhitelisted: true,
        whitelistReason: reason,
        whitelistExpiresAt: expiresAt,
        updatedBy: userId,
        updatedAt: new Date(),
      });
      
      // Create suppression rule
      const suppressionRule = await dataSources.suppressionRule.create({
        iocId: id,
        reason,
        expiresAt,
        organizationId,
        createdBy: userId,
      });
      
      // Clear caches
      dataLoaders.iocs.clear(id);
      
      await AuditLogger.log({
        action: 'WHITELIST_IOC',
        entityType: 'IOC',
        entityId: id,
        userId,
        organizationId,
        metadata: { reason, expiresAt },
      });
      
      return {
        success: true,
        ioc: updatedIOC,
        suppressionRule,
        message: 'IOC whitelisted successfully',
      };
    } catch (error) {
      console.error('Error whitelisting IOC:', error);
      
      return {
        success: false,
        ioc: null,
        suppressionRule: null,
        message: 'Failed to whitelist IOC',
      };
    }
  },
  
  async removeIOCWhitelist(
    parent,
    { id },
    context: Context
  ) {
    const { dataSources, dataLoaders, organizationId, userId } = context;
    
    if (!organizationId || !userId) {
      throw new AuthenticationError('Authentication required');
    }
    
    const existingIOC = await dataLoaders.iocs.load(id);
    if (!existingIOC) {
      return {
        success: false,
        ioc: null,
        message: 'IOC not found',
      };
    }
    
    const hasAccess = await dataSources.ioc.verifyAccess(id, organizationId);
    if (!hasAccess) {
      throw new ForbiddenError('Access denied to IOC');
    }
    
    try {
      // Remove whitelist status
      const updatedIOC = await dataSources.ioc.update(id, {
        isWhitelisted: false,
        whitelistReason: null,
        whitelistExpiresAt: null,
        updatedBy: userId,
        updatedAt: new Date(),
      });
      
      // Remove suppression rules
      await dataSources.suppressionRule.deleteByIOC(id);
      
      // Clear caches
      dataLoaders.iocs.clear(id);
      
      // Re-check for matches now that whitelist is removed
      const matchingService = new IOCMatchingService(context);
      const matches = await matchingService.findMatches(id);
      
      if (matches.length > 0) {
        await Promise.all(
          matches.map(match =>
            context.dataSources.alert.createFromIOCMatch(match, updatedIOC)
          )
        );
      }
      
      await AuditLogger.log({
        action: 'REMOVE_IOC_WHITELIST',
        entityType: 'IOC',
        entityId: id,
        userId,
        organizationId,
        metadata: { matchCount: matches.length },
      });
      
      return {
        success: true,
        ioc: updatedIOC,
        message: `IOC whitelist removed successfully${matches.length > 0 ? ` and ${matches.length} new matches found` : ''}`,
      };
    } catch (error) {
      console.error('Error removing IOC whitelist:', error);
      
      return {
        success: false,
        ioc: null,
        message: 'Failed to remove IOC whitelist',
      };
    }
  },
  
  async bulkImportIOCs(
    parent,
    { input },
    context: Context
  ) {
    const { dataSources, organizationId, userId } = context;
    
    if (!organizationId || !userId) {
      throw new AuthenticationError('Authentication required');
    }
    
    const validatedInput = validateBulkImportInput(input);
    
    try {
      const importResult = await dataSources.ioc.bulkImport({
        ...validatedInput,
        organizationId,
        importedBy: userId,
      });
      
      // Log bulk import audit event
      await AuditLogger.log({
        action: 'BULK_IMPORT_IOCS',
        entityType: 'IOC',
        entityId: `bulk-import-${Date.now()}`,
        userId,
        organizationId,
        metadata: {
          source: input.source,
          format: input.format,
          importedCount: importResult.importedCount,
          errorCount: importResult.errorCount,
        },
      });
      
      return {
        success: importResult.errorCount === 0,
        importedCount: importResult.importedCount,
        skippedCount: importResult.skippedCount,
        errorCount: importResult.errorCount,
        errors: importResult.errors,
        summary: importResult.summary,
        message: `Bulk import completed: ${importResult.importedCount} imported, ${importResult.errorCount} errors`,
      };
    } catch (error) {
      console.error('Error in bulk IOC import:', error);
      
      return {
        success: false,
        importedCount: 0,
        skippedCount: 0,
        errorCount: 1,
        errors: [{
          line: 0,
          indicator: 'general',
          error: error.message,
        }],
        summary: {
          totalProcessed: 0,
          newIndicators: 0,
          updatedIndicators: 0,
          duplicates: 0,
          byType: [],
          byConfidence: [],
        },
        message: 'Bulk import failed',
      };
    }
  },
};

// Type resolvers for IOC
const IOC: IOCResolvers = {
  __resolveReference: async (reference: { id: string }, context: Context) => {
    return context.dataLoaders.iocs.load(reference.id);
  },
  
  // Relationship resolvers
  threatActors: async (parent, args, context: Context) => {
    const { dataLoaders } = context;
    
    if (parent.threatActorIds && parent.threatActorIds.length > 0) {
      return dataLoaders.actorsByIds.load(parent.threatActorIds);
    }
    
    return [];
  },
  
  campaigns: async (parent, args, context: Context) => {
    const { dataLoaders } = context;
    
    if (parent.campaignIds && parent.campaignIds.length > 0) {
      return dataLoaders.campaignsByIds.load(parent.campaignIds);
    }
    
    return [];
  },
  
  malwareFamilies: async (parent, args, context: Context) => {
    const { dataLoaders } = context;
    
    if (parent.malwareFamilyIds && parent.malwareFamilyIds.length > 0) {
      return dataLoaders.malwareFamilies.loadMany(parent.malwareFamilyIds);
    }
    
    return [];
  },
  
  relatedIOCs: async (parent, args, context: Context) => {
    const { dataSources } = context;
    
    return dataSources.ioc.findRelatedIOCs(parent.id, {
      maxResults: 10,
      similarityThreshold: 0.8,
    });
  },
  
  sightings: async (parent, args, context: Context) => {
    const { dataSources } = context;
    
    return dataSources.ioc.getSightings(parent.id);
  },
  
  matches: async (parent, args, context: Context) => {
    const { dataSources } = context;
    
    return dataSources.ioc.getMatches(parent.id);
  },
  
  sources: async (parent, args, context: Context) => {
    const { dataSources } = context;
    
    if (parent.sourceIds && parent.sourceIds.length > 0) {
      return dataSources.threatSource.findByIds(parent.sourceIds);
    }
    
    return [];
  },
  
  feeds: async (parent, args, context: Context) => {
    const { dataLoaders } = context;
    
    if (parent.feedIds && parent.feedIds.length > 0) {
      return dataLoaders.feeds.loadMany(parent.feedIds);
    }
    
    return [];
  },
  
  // Enrichment data - uses DataLoader for caching
  enrichment: async (parent, args, context: Context) => {
    if (!parent.id) return null;
    
    return context.dataLoaders.iocEnrichment.load(parent.id);
  },
  
  // External federated fields
  geoLocation: async (parent, args, context: Context) => {
    // Resolved by external service
    return null;
  },
  
  reputation: async (parent, args, context: Context) => {
    if (parent.enrichment?.reputation?.overallScore !== undefined) {
      if (parent.enrichment.reputation.overallScore > 0.8) return 'MALICIOUS';
      if (parent.enrichment.reputation.overallScore > 0.5) return 'SUSPICIOUS';
      if (parent.enrichment.reputation.overallScore > 0.2) return 'UNKNOWN';
      return 'CLEAN';
    }
    return 'UNKNOWN';
  },
  
  suppressionRules: async (parent, args, context: Context) => {
    // Resolved by external service
    return [];
  },
};

export const iocResolvers = {
  Query,
  Mutation,
  IOC,
};

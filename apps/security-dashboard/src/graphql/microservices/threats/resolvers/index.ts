import { Resolvers } from '../../../generated/graphql';
import { Context } from '../../../types/context';
import { createDataLoaders, ThreatDataLoaders } from '../dataloaders';
import { threatIntelligenceResolvers } from './threat-intelligence';
import { iocResolvers } from './ioc';
import { threatActorResolvers } from './threat-actor';
import { threatCampaignResolvers } from './campaign';
import { threatFeedResolvers } from './feed';
import { correlationResolvers } from './correlation';
import { analyticsResolvers } from './analytics';
import { subscriptionResolvers } from './subscriptions';
import { malwareFamilyResolvers } from './malware';
import { threatToolResolvers } from './tools';
import { mitigationResolvers } from './mitigation';
import { reportResolvers } from './report';

// Main resolver composition with DataLoader integration
export const threatResolvers: Resolvers = {
  Query: {
    // Threat Intelligence Queries
    ...threatIntelligenceResolvers.Query,
    
    // IOC Queries
    ...iocResolvers.Query,
    
    // Actor Queries
    ...threatActorResolvers.Query,
    
    // Campaign Queries
    ...threatCampaignResolvers.Query,
    
    // Feed Queries
    ...threatFeedResolvers.Query,
    
    // Correlation Queries
    ...correlationResolvers.Query,
    
    // Analytics Queries
    ...analyticsResolvers.Query,
    
    // Malware Queries
    ...malwareFamilyResolvers.Query,
    
    // Tool Queries
    ...threatToolResolvers.Query,
    
    // Mitigation Queries
    ...mitigationResolvers.Query,
    
    // Report Queries
    ...reportResolvers.Query,
  },
  
  Mutation: {
    // Threat Intelligence Mutations
    ...threatIntelligenceResolvers.Mutation,
    
    // IOC Mutations
    ...iocResolvers.Mutation,
    
    // Actor Mutations
    ...threatActorResolvers.Mutation,
    
    // Campaign Mutations
    ...threatCampaignResolvers.Mutation,
    
    // Feed Mutations
    ...threatFeedResolvers.Mutation,
    
    // Correlation Mutations
    ...correlationResolvers.Mutation,
    
    // Mitigation Mutations
    ...mitigationResolvers.Mutation,
    
    // Report Mutations
    ...reportResolvers.Mutation,
  },
  
  Subscription: {
    ...subscriptionResolvers,
  },
  
  // Type resolvers for complex field resolution
  ThreatIntelligence: {
    ...threatIntelligenceResolvers.ThreatIntelligence,
  },
  
  IOC: {
    ...iocResolvers.IOC,
  },
  
  ThreatActor: {
    ...threatActorResolvers.ThreatActor,
  },
  
  ThreatCampaign: {
    ...threatCampaignResolvers.ThreatCampaign,
  },
  
  ThreatFeed: {
    ...threatFeedResolvers.ThreatFeed,
  },
  
  ThreatCorrelation: {
    ...correlationResolvers.ThreatCorrelation,
  },
  
  MalwareFamily: {
    ...malwareFamilyResolvers.MalwareFamily,
  },
  
  ThreatTool: {
    ...threatToolResolvers.ThreatTool,
  },
  
  ThreatMitigation: {
    ...mitigationResolvers.ThreatMitigation,
  },
  
  ThreatReport: {
    ...reportResolvers.ThreatReport,
  },
  
  // Indicator resolver (federated type)
  Indicator: {
    __resolveReference: async (reference: { id: string }, context: Context) => {
      const { dataSources, dataLoaders } = context;
      return dataLoaders.indicators.load(reference.id);
    },
    
    // Resolve relationships using DataLoaders
    ioc: async (parent: any, _: any, context: Context) => {
      if (parent.iocId) {
        return context.dataLoaders.iocs.load(parent.iocId);
      }
      return null;
    },
    
    threats: async (parent: any, _: any, context: Context) => {
      return context.dataLoaders.threatsByIndicator.load(parent.id);
    },
    
    actors: async (parent: any, _: any, context: Context) => {
      return context.dataLoaders.actorsByIndicator.load(parent.id);
    },
    
    campaigns: async (parent: any, _: any, context: Context) => {
      return context.dataLoaders.campaignsByIndicator.load(parent.id);
    },
  },
  
  // Connection resolvers
  ThreatIntelligenceConnection: {
    aggregations: async (parent: any, _: any, context: Context) => {
      const { organizationId } = context;
      const filter = parent.filter || {};
      
      return context.dataSources.threatIntelligence.getAggregations(
        organizationId,
        filter
      );
    },
  },
  
  IOCConnection: {
    aggregations: async (parent: any, _: any, context: Context) => {
      const { organizationId } = context;
      const filter = parent.filter || {};
      
      return context.dataSources.ioc.getAggregations(
        organizationId,
        filter
      );
    },
  },
  
  // Federation reference resolvers
  User: {
    __resolveReference: (reference: { id: string }) => ({ id: reference.id }),
  },
  
  Asset: {
    __resolveReference: (reference: { id: string }) => ({ id: reference.id }),
  },
  
  Alert: {
    __resolveReference: (reference: { id: string }) => ({ id: reference.id }),
  },
  
  SecurityEvent: {
    __resolveReference: (reference: { id: string }) => ({ id: reference.id }),
  },
  
  Incident: {
    __resolveReference: (reference: { id: string }) => ({ id: reference.id }),
  },
  
  MitreTechnique: {
    __resolveReference: (reference: { id: string }) => ({ id: reference.id }),
  },
};

// Context creation with DataLoaders
export const createThreatContext = (baseContext: any): Context => {
  const dataLoaders = createDataLoaders(baseContext.dataSources);
  
  return {
    ...baseContext,
    dataLoaders,
  };
};

// Export individual resolver modules for testing
export {
  threatIntelligenceResolvers,
  iocResolvers,
  threatActorResolvers,
  threatCampaignResolvers,
  threatFeedResolvers,
  correlationResolvers,
  analyticsResolvers,
  subscriptionResolvers,
  malwareFamilyResolvers,
  threatToolResolvers,
  mitigationResolvers,
  reportResolvers,
};

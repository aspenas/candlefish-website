/**
 * Candlefish AI Documentation Platform - GraphQL Resolvers
 * Architecture: Federation-ready resolver structure for operational craft
 */

import { IResolvers } from '@graphql-tools/utils';
import { Context } from '../context';

// Import resolver modules
import { userResolvers } from './user';
import { documentationResolvers } from './documentation';
import { partnerResolvers } from './partner';
import { operatorResolvers } from './operator';
import { apiReferenceResolvers } from './apiReference';
import { searchResolvers } from './search';
import { analyticsResolvers } from './analytics';
import { contentResolvers } from './content';
import { assetResolvers } from './asset';

// Custom scalars
import { GraphQLDateTime, GraphQLJSON, GraphQLUpload } from 'graphql-scalars';

/**
 * Root resolver combining all domain resolvers
 * Philosophy: Operational craft - clear separation of concerns
 */
export const resolvers: IResolvers<any, Context> = {
  // Custom scalars
  DateTime: GraphQLDateTime,
  JSON: GraphQLJSON,
  Upload: GraphQLUpload,

  // Interface resolvers for proper type resolution
  Node: {
    __resolveType(obj: any) {
      if (obj.email && obj.role) return 'User';
      if (obj.title && obj.content && obj.category) return 'Documentation';
      if (obj.name && obj.tier) return 'Partner';
      if (obj.fullName && obj.partner) return 'Operator';
      if (obj.endpoint && obj.method) return 'APIReference';
      if (obj.filename && obj.mimeType) return 'Asset';
      return null;
    },
  },

  Content: {
    __resolveType(obj: any) {
      if (obj.category && obj.tableOfContents) return 'Documentation';
      if (obj.partner && obj.resourceType) return 'PartnerResource';
      if (obj.client && obj.industry) return 'CaseStudy';
      if (obj.endpoint && obj.method) return 'APIReference';
      return null;
    },
  },

  ContentBlock: {
    __resolveType(obj: any) {
      switch (obj.type) {
        case 'text':
          return 'TextBlock';
        case 'code':
          return 'CodeBlock';
        case 'image':
          return 'ImageBlock';
        case 'video':
          return 'VideoBlock';
        default:
          return null;
      }
    },
  },

  // Root query resolvers
  Query: {
    // User queries
    ...userResolvers.Query,

    // Documentation queries
    ...documentationResolvers.Query,

    // Partner queries
    ...partnerResolvers.Query,

    // Operator queries
    ...operatorResolvers.Query,

    // API Reference queries
    ...apiReferenceResolvers.Query,

    // Search queries
    ...searchResolvers.Query,

    // Analytics queries
    ...analyticsResolvers.Query,

    // Asset queries
    ...assetResolvers.Query,
  },

  // Root mutation resolvers
  Mutation: {
    // User mutations
    ...userResolvers.Mutation,

    // Documentation mutations
    ...documentationResolvers.Mutation,

    // Partner mutations
    ...partnerResolvers.Mutation,

    // Operator mutations
    ...operatorResolvers.Mutation,

    // API Reference mutations
    ...apiReferenceResolvers.Mutation,

    // Content mutations
    ...contentResolvers.Mutation,

    // Asset mutations
    ...assetResolvers.Mutation,
  },

  // Subscription resolvers
  Subscription: {
    // Documentation subscriptions
    ...documentationResolvers.Subscription,

    // Partner subscriptions
    ...partnerResolvers.Subscription,

    // Operator subscriptions
    ...operatorResolvers.Subscription,

    // API Reference subscriptions
    ...apiReferenceResolvers.Subscription,
  },

  // Type resolvers for field resolution
  User: userResolvers.User,
  Documentation: documentationResolvers.Documentation,
  Partner: partnerResolvers.Partner,
  Operator: operatorResolvers.Operator,
  APIReference: apiReferenceResolvers.APIReference,
  Asset: assetResolvers.Asset,

  // Content block resolvers
  TextBlock: contentResolvers.TextBlock,
  CodeBlock: contentResolvers.CodeBlock,
  ImageBlock: contentResolvers.ImageBlock,
  VideoBlock: contentResolvers.VideoBlock,
};

export default resolvers;

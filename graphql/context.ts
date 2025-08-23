/**
 * GraphQL Context - Request scoped services and data loaders
 * Philosophy: Operational craft - efficient data loading with proper caching
 */

import { Request } from 'express';
import { PubSub } from 'graphql-subscriptions';
import DataLoader from 'dataloader';

// Database models
import { User, Documentation, Partner, Operator, APIReference, Asset } from '../models';
import { DatabaseService } from '../services/database';
import { SearchService } from '../services/search';
import { AuthService } from '../services/auth';
import { CacheService } from '../services/cache';
import { AnalyticsService } from '../services/analytics';
import { NotificationService } from '../services/notification';

export interface Context {
  // Request context
  req: Request;
  user?: User;
  
  // Services
  db: DatabaseService;
  search: SearchService;
  auth: AuthService;
  cache: CacheService;
  analytics: AnalyticsService;
  notifications: NotificationService;
  pubsub: PubSub;
  
  // DataLoaders for N+1 query prevention
  loaders: {
    // User loaders
    userById: DataLoader<string, User | null>;
    usersByIds: DataLoader<string[], User[]>;
    
    // Documentation loaders
    documentationById: DataLoader<string, Documentation | null>;
    documentationBySlug: DataLoader<string, Documentation | null>;
    documentationsByCategory: DataLoader<string, Documentation[]>;
    documentationsByAuthor: DataLoader<string, Documentation[]>;
    relatedDocumentation: DataLoader<string, Documentation[]>;
    
    // Partner loaders
    partnerById: DataLoader<string, Partner | null>;
    partnerBySlug: DataLoader<string, Partner | null>;
    partnersByTier: DataLoader<string, Partner[]>;
    partnersByIndustry: DataLoader<string, Partner[]>;
    
    // Operator loaders
    operatorById: DataLoader<string, Operator | null>;
    operatorsByPartner: DataLoader<string, Operator[]>;
    operatorsBySkill: DataLoader<string, Operator[]>;
    
    // API Reference loaders
    apiReferenceById: DataLoader<string, APIReference | null>;
    apiReferenceBySlug: DataLoader<string, APIReference | null>;
    apiReferencesByService: DataLoader<string, APIReference[]>;
    
    // Asset loaders
    assetById: DataLoader<string, Asset | null>;
    assetsByIds: DataLoader<string[], Asset[]>;
    
    // Relationship loaders
    categoriesByDocument: DataLoader<string, any[]>;
    tagsByDocument: DataLoader<string, string[]>;
    feedbackByContent: DataLoader<string, any[]>;
    reactionsByContent: DataLoader<string, any[]>;
  };
}

/**
 * Create DataLoader instances for efficient batch loading
 * Each loader implements the DataLoader pattern to solve N+1 queries
 */
export function createDataLoaders(db: DatabaseService): Context['loaders'] {
  return {
    // User loaders
    userById: new DataLoader(async (ids: readonly string[]) => {
      const users = await db.users.findByIds([...ids]);
      return ids.map(id => users.find(user => user.id === id) || null);
    }),

    usersByIds: new DataLoader(async (idArrays: readonly string[][]) => {
      const allIds = [...new Set(idArrays.flat())];
      const users = await db.users.findByIds(allIds);
      
      return idArrays.map(ids => 
        ids.map(id => users.find(user => user.id === id)).filter(Boolean) as User[]
      );
    }),

    // Documentation loaders
    documentationById: new DataLoader(async (ids: readonly string[]) => {
      const docs = await db.documentation.findByIds([...ids]);
      return ids.map(id => docs.find(doc => doc.id === id) || null);
    }),

    documentationBySlug: new DataLoader(async (slugs: readonly string[]) => {
      const docs = await db.documentation.findBySlugs([...slugs]);
      return slugs.map(slug => docs.find(doc => doc.slug === slug) || null);
    }),

    documentationsByCategory: new DataLoader(async (categoryIds: readonly string[]) => {
      const results = await db.documentation.findByCategoryIds([...categoryIds]);
      return categoryIds.map(id => results.filter(doc => doc.categoryId === id));
    }),

    documentationsByAuthor: new DataLoader(async (authorIds: readonly string[]) => {
      const results = await db.documentation.findByAuthorIds([...authorIds]);
      return authorIds.map(id => results.filter(doc => doc.authorId === id));
    }),

    relatedDocumentation: new DataLoader(async (docIds: readonly string[]) => {
      const results = await db.documentation.findRelated([...docIds]);
      return docIds.map(id => results[id] || []);
    }),

    // Partner loaders
    partnerById: new DataLoader(async (ids: readonly string[]) => {
      const partners = await db.partners.findByIds([...ids]);
      return ids.map(id => partners.find(partner => partner.id === id) || null);
    }),

    partnerBySlug: new DataLoader(async (slugs: readonly string[]) => {
      const partners = await db.partners.findBySlugs([...slugs]);
      return slugs.map(slug => partners.find(partner => partner.slug === slug) || null);
    }),

    partnersByTier: new DataLoader(async (tiers: readonly string[]) => {
      const results = await db.partners.findByTiers([...tiers]);
      return tiers.map(tier => results.filter(partner => partner.tier === tier));
    }),

    partnersByIndustry: new DataLoader(async (industries: readonly string[]) => {
      const results = await db.partners.findByIndustries([...industries]);
      return industries.map(industry => 
        results.filter(partner => partner.industries.includes(industry))
      );
    }),

    // Operator loaders
    operatorById: new DataLoader(async (ids: readonly string[]) => {
      const operators = await db.operators.findByIds([...ids]);
      return ids.map(id => operators.find(op => op.id === id) || null);
    }),

    operatorsByPartner: new DataLoader(async (partnerIds: readonly string[]) => {
      const results = await db.operators.findByPartnerIds([...partnerIds]);
      return partnerIds.map(id => results.filter(op => op.partnerId === id));
    }),

    operatorsBySkill: new DataLoader(async (skills: readonly string[]) => {
      const results = await db.operators.findBySkills([...skills]);
      return skills.map(skill => 
        results.filter(op => op.skills.some(s => s.name === skill))
      );
    }),

    // API Reference loaders
    apiReferenceById: new DataLoader(async (ids: readonly string[]) => {
      const refs = await db.apiReferences.findByIds([...ids]);
      return ids.map(id => refs.find(ref => ref.id === id) || null);
    }),

    apiReferenceBySlug: new DataLoader(async (slugs: readonly string[]) => {
      const refs = await db.apiReferences.findBySlugs([...slugs]);
      return slugs.map(slug => refs.find(ref => ref.slug === slug) || null);
    }),

    apiReferencesByService: new DataLoader(async (serviceIds: readonly string[]) => {
      const results = await db.apiReferences.findByServiceIds([...serviceIds]);
      return serviceIds.map(id => results.filter(ref => ref.serviceId === id));
    }),

    // Asset loaders
    assetById: new DataLoader(async (ids: readonly string[]) => {
      const assets = await db.assets.findByIds([...ids]);
      return ids.map(id => assets.find(asset => asset.id === id) || null);
    }),

    assetsByIds: new DataLoader(async (idArrays: readonly string[][]) => {
      const allIds = [...new Set(idArrays.flat())];
      const assets = await db.assets.findByIds(allIds);
      
      return idArrays.map(ids => 
        ids.map(id => assets.find(asset => asset.id === id)).filter(Boolean) as Asset[]
      );
    }),

    // Relationship loaders
    categoriesByDocument: new DataLoader(async (docIds: readonly string[]) => {
      const results = await db.documentationCategories.findByDocumentIds([...docIds]);
      return docIds.map(id => results.filter(cat => cat.documentIds?.includes(id)) || []);
    }),

    tagsByDocument: new DataLoader(async (docIds: readonly string[]) => {
      const results = await db.tags.findByDocumentIds([...docIds]);
      return docIds.map(id => results[id] || []);
    }),

    feedbackByContent: new DataLoader(async (contentIds: readonly string[]) => {
      const results = await db.feedback.findByContentIds([...contentIds]);
      return contentIds.map(id => results.filter(fb => fb.contentId === id));
    }),

    reactionsByContent: new DataLoader(async (contentIds: readonly string[]) => {
      const results = await db.reactions.findByContentIds([...contentIds]);
      return contentIds.map(id => results.filter(reaction => reaction.contentId === id));
    }),
  };
}

/**
 * Context factory function
 * Creates a new context for each GraphQL request
 */
export function createContext(
  req: Request,
  services: {
    db: DatabaseService;
    search: SearchService;
    auth: AuthService;
    cache: CacheService;
    analytics: AnalyticsService;
    notifications: NotificationService;
    pubsub: PubSub;
  }
): Context {
  const loaders = createDataLoaders(services.db);
  
  return {
    req,
    user: req.user as User | undefined,
    ...services,
    loaders,
  };
}

/**
 * Authorization helpers for resolvers
 */
export class AuthorizationError extends Error {
  constructor(message = 'Not authorized') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export function requireAuth(context: Context): User {
  if (!context.user) {
    throw new AuthorizationError('Authentication required');
  }
  return context.user;
}

export function requireRole(context: Context, roles: string[]): User {
  const user = requireAuth(context);
  if (!roles.includes(user.role)) {
    throw new AuthorizationError(`Required role: ${roles.join(' or ')}`);
  }
  return user;
}

export function requirePermission(context: Context, permission: string): User {
  const user = requireAuth(context);
  if (!user.permissions.includes(permission)) {
    throw new AuthorizationError(`Required permission: ${permission}`);
  }
  return user;
}

/**
 * Field-level authorization decorator
 */
export function authorized(roles?: string[], permissions?: string[]) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(parent: any, args: any, context: Context, info: any) {
      // Check authentication
      if (roles || permissions) {
        requireAuth(context);
      }
      
      // Check roles
      if (roles && roles.length > 0) {
        requireRole(context, roles);
      }
      
      // Check permissions
      if (permissions && permissions.length > 0) {
        for (const permission of permissions) {
          requirePermission(context, permission);
        }
      }
      
      return originalMethod.call(this, parent, args, context, info);
    };
    
    return descriptor;
  };
}
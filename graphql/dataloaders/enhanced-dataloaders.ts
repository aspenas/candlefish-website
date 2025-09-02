/**
 * Enhanced DataLoader Implementation for Real-Time Collaboration Platform
 * Provides comprehensive N+1 prevention, Redis caching, and performance monitoring
 */

import DataLoader from 'dataloader';
import { Redis } from 'ioredis';
import { Pool } from 'pg';
import { AuthContext } from '../types/context';
import { 
  Project, 
  Document, 
  User, 
  Comment, 
  Version, 
  PresenceSession,
  NandaAgent,
  AISuggestion,
  Workspace,
  ActivityEvent
} from '../types/schema';

// =============================================================================
// ENHANCED DATALOADER CONFIGURATION
// =============================================================================

interface DataLoaderConfig {
  redis: Redis;
  db: Pool;
  maxBatchSize?: number;
  cacheKeyPrefix?: string;
  cacheTTL?: number;
  metricsEnabled?: boolean;
}

interface DataLoaderMetrics {
  cacheHits: number;
  cacheMisses: number;
  batchLoads: number;
  totalRequests: number;
  averageBatchSize: number;
  lastUpdated: Date;
}

class DataLoaderMetricsCollector {
  private metrics: Map<string, DataLoaderMetrics> = new Map();

  recordCacheHit(loaderName: string) {
    const metric = this.getOrCreateMetric(loaderName);
    metric.cacheHits++;
    metric.totalRequests++;
    metric.lastUpdated = new Date();
  }

  recordCacheMiss(loaderName: string) {
    const metric = this.getOrCreateMetric(loaderName);
    metric.cacheMisses++;
    metric.totalRequests++;
    metric.lastUpdated = new Date();
  }

  recordBatchLoad(loaderName: string, batchSize: number) {
    const metric = this.getOrCreateMetric(loaderName);
    metric.batchLoads++;
    metric.averageBatchSize = 
      (metric.averageBatchSize * (metric.batchLoads - 1) + batchSize) / metric.batchLoads;
    metric.lastUpdated = new Date();
  }

  private getOrCreateMetric(loaderName: string): DataLoaderMetrics {
    if (!this.metrics.has(loaderName)) {
      this.metrics.set(loaderName, {
        cacheHits: 0,
        cacheMisses: 0,
        batchLoads: 0,
        totalRequests: 0,
        averageBatchSize: 0,
        lastUpdated: new Date()
      });
    }
    return this.metrics.get(loaderName)!;
  }

  getMetrics(): Record<string, DataLoaderMetrics> {
    return Object.fromEntries(this.metrics);
  }

  getCacheHitRate(loaderName: string): number {
    const metric = this.metrics.get(loaderName);
    if (!metric || metric.totalRequests === 0) return 0;
    return metric.cacheHits / metric.totalRequests;
  }
}

// =============================================================================
// ENHANCED CACHING UTILITIES
// =============================================================================

interface CacheOptions {
  ttl?: number;
  prefix?: string;
  serialize?: (value: any) => string;
  deserialize?: (value: string) => any;
}

class EnhancedCacheManager {
  constructor(private redis: Redis, private metricsCollector: DataLoaderMetricsCollector) {}

  async get<T>(key: string, loaderName: string, options: CacheOptions = {}): Promise<T | null> {
    try {
      const cacheKey = options.prefix ? `${options.prefix}:${key}` : key;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        this.metricsCollector.recordCacheHit(loaderName);
        return options.deserialize ? options.deserialize(cached) : JSON.parse(cached);
      } else {
        this.metricsCollector.recordCacheMiss(loaderName);
        return null;
      }
    } catch (error) {
      console.warn(`Cache get error for ${key}:`, error);
      this.metricsCollector.recordCacheMiss(loaderName);
      return null;
    }
  }

  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    try {
      const cacheKey = options.prefix ? `${options.prefix}:${key}` : key;
      const serialized = options.serialize ? options.serialize(value) : JSON.stringify(value);
      
      if (options.ttl) {
        await this.redis.setex(cacheKey, options.ttl, serialized);
      } else {
        await this.redis.set(cacheKey, serialized);
      }
    } catch (error) {
      console.warn(`Cache set error for ${key}:`, error);
    }
  }

  async mget<T>(keys: string[], loaderName: string, options: CacheOptions = {}): Promise<(T | null)[]> {
    try {
      const cacheKeys = keys.map(key => options.prefix ? `${options.prefix}:${key}` : key);
      const cached = await this.redis.mget(...cacheKeys);
      
      return cached.map((item, index) => {
        if (item) {
          this.metricsCollector.recordCacheHit(loaderName);
          return options.deserialize ? options.deserialize(item) : JSON.parse(item);
        } else {
          this.metricsCollector.recordCacheMiss(loaderName);
          return null;
        }
      });
    } catch (error) {
      console.warn(`Cache mget error:`, error);
      keys.forEach(() => this.metricsCollector.recordCacheMiss(loaderName));
      return keys.map(() => null);
    }
  }

  async mset<T>(keyValuePairs: Array<[string, T]>, options: CacheOptions = {}): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();
      
      for (const [key, value] of keyValuePairs) {
        const cacheKey = options.prefix ? `${options.prefix}:${key}` : key;
        const serialized = options.serialize ? options.serialize(value) : JSON.stringify(value);
        
        if (options.ttl) {
          pipeline.setex(cacheKey, options.ttl, serialized);
        } else {
          pipeline.set(cacheKey, serialized);
        }
      }
      
      await pipeline.exec();
    } catch (error) {
      console.warn(`Cache mset error:`, error);
    }
  }

  async invalidate(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.warn(`Cache invalidation error for pattern ${pattern}:`, error);
    }
  }
}

// =============================================================================
// ENHANCED DATALOADER FACTORY
// =============================================================================

function createEnhancedDataLoader<K, V>(
  batchLoadFn: (keys: readonly K[]) => Promise<V[]>,
  config: {
    name: string;
    cacheManager: EnhancedCacheManager;
    metricsCollector: DataLoaderMetricsCollector;
    cacheOptions?: CacheOptions;
    maxBatchSize?: number;
    cacheKeyFn?: (key: K) => string;
  }
): DataLoader<K, V> {
  return new DataLoader<K, V>(
    async (keys) => {
      const keyArray = Array.from(keys);
      const cacheKeys = keyArray.map(key => 
        config.cacheKeyFn ? config.cacheKeyFn(key) : String(key)
      );

      // Try to get from cache first
      const cached = await config.cacheManager.mget<V>(
        cacheKeys, 
        config.name, 
        config.cacheOptions
      );

      // Identify keys that need to be loaded from database
      const uncachedKeys: K[] = [];
      const uncachedIndices: number[] = [];
      
      cached.forEach((item, index) => {
        if (item === null) {
          uncachedKeys.push(keyArray[index]);
          uncachedIndices.push(index);
        }
      });

      // Load uncached items from database
      let dbResults: V[] = [];
      if (uncachedKeys.length > 0) {
        config.metricsCollector.recordBatchLoad(config.name, uncachedKeys.length);
        dbResults = await batchLoadFn(uncachedKeys);
        
        // Cache the results
        const cacheEntries: Array<[string, V]> = dbResults.map((result, index) => [
          config.cacheKeyFn ? config.cacheKeyFn(uncachedKeys[index]) : String(uncachedKeys[index]),
          result
        ]);
        
        await config.cacheManager.mset(cacheEntries, config.cacheOptions);
      }

      // Merge cached and database results
      const results: V[] = new Array(keyArray.length);
      let dbIndex = 0;
      
      cached.forEach((item, index) => {
        if (item !== null) {
          results[index] = item;
        } else {
          results[index] = dbResults[dbIndex++];
        }
      });

      return results;
    },
    {
      maxBatchSize: config.maxBatchSize || 100,
      cacheKeyFn: config.cacheKeyFn ? config.cacheKeyFn : (key) => String(key)
    }
  );
}

// =============================================================================
// ENHANCED DATALOADER IMPLEMENTATIONS
// =============================================================================

export class EnhancedCollaborationDataLoaders {
  private config: DataLoaderConfig;
  private cacheManager: EnhancedCacheManager;
  private metricsCollector: DataLoaderMetricsCollector;

  // Primary Entity Loaders
  public readonly project: DataLoader<string, Project>;
  public readonly document: DataLoader<string, Document>;
  public readonly user: DataLoader<string, User>;
  public readonly comment: DataLoader<string, Comment>;
  public readonly version: DataLoader<string, Version>;
  public readonly workspace: DataLoader<string, Workspace>;

  // AI Integration Loaders
  public readonly nandaAgent: DataLoader<string, NandaAgent>;
  public readonly aiSuggestion: DataLoader<string, AISuggestion>;
  public readonly aiAnalysis: DataLoader<string, any>;

  // Collaboration Loaders
  public readonly presenceSession: DataLoader<string, PresenceSession>;
  public readonly activityEvent: DataLoader<string, ActivityEvent>;

  // Relationship Loaders
  public readonly projectDocuments: DataLoader<string, Document[]>;
  public readonly documentVersions: DataLoader<string, Version[]>;
  public readonly documentComments: DataLoader<string, Comment[]>;
  public readonly documentPresence: DataLoader<string, PresenceSession[]>;
  public readonly userProjects: DataLoader<string, Project[]>;
  public readonly userRecentDocuments: DataLoader<string, Document[]>;
  public readonly projectCollaborators: DataLoader<string, User[]>;
  public readonly workspaceProjects: DataLoader<string, Project[]>;

  // AI-specific Loaders
  public readonly documentAISuggestions: DataLoader<string, AISuggestion[]>;
  public readonly userAIUsage: DataLoader<string, any>;
  public readonly projectAIMetrics: DataLoader<string, any>;

  // Advanced Query Loaders
  public readonly documentsWithFilters: DataLoader<string, Document[]>;
  public readonly projectAnalytics: DataLoader<string, any>;
  public readonly collaborationMetrics: DataLoader<string, any>;

  constructor(config: DataLoaderConfig) {
    this.config = config;
    this.metricsCollector = new DataLoaderMetricsCollector();
    this.cacheManager = new EnhancedCacheManager(config.redis, this.metricsCollector);

    // Initialize primary entity loaders
    this.project = this.createProjectLoader();
    this.document = this.createDocumentLoader();
    this.user = this.createUserLoader();
    this.comment = this.createCommentLoader();
    this.version = this.createVersionLoader();
    this.workspace = this.createWorkspaceLoader();

    // Initialize AI integration loaders
    this.nandaAgent = this.createNandaAgentLoader();
    this.aiSuggestion = this.createAISuggestionLoader();
    this.aiAnalysis = this.createAIAnalysisLoader();

    // Initialize collaboration loaders
    this.presenceSession = this.createPresenceSessionLoader();
    this.activityEvent = this.createActivityEventLoader();

    // Initialize relationship loaders
    this.projectDocuments = this.createProjectDocumentsLoader();
    this.documentVersions = this.createDocumentVersionsLoader();
    this.documentComments = this.createDocumentCommentsLoader();
    this.documentPresence = this.createDocumentPresenceLoader();
    this.userProjects = this.createUserProjectsLoader();
    this.userRecentDocuments = this.createUserRecentDocumentsLoader();
    this.projectCollaborators = this.createProjectCollaboratorsLoader();
    this.workspaceProjects = this.createWorkspaceProjectsLoader();

    // Initialize AI-specific loaders
    this.documentAISuggestions = this.createDocumentAISuggestionsLoader();
    this.userAIUsage = this.createUserAIUsageLoader();
    this.projectAIMetrics = this.createProjectAIMetricsLoader();

    // Initialize advanced query loaders
    this.documentsWithFilters = this.createDocumentsWithFiltersLoader();
    this.projectAnalytics = this.createProjectAnalyticsLoader();
    this.collaborationMetrics = this.createCollaborationMetricsLoader();
  }

  // =============================================================================
  // PRIMARY ENTITY LOADER FACTORIES
  // =============================================================================

  private createProjectLoader(): DataLoader<string, Project> {
    return createEnhancedDataLoader(
      async (ids) => {
        const query = `
          SELECT 
            p.*,
            w.name as workspace_name,
            w.settings as workspace_settings,
            (SELECT COUNT(*) FROM documents WHERE project_id = p.id) as document_count,
            (SELECT COUNT(DISTINCT u.id) FROM project_collaborators pc 
             JOIN users u ON pc.user_id = u.id WHERE pc.project_id = p.id) as collaborator_count
          FROM projects p
          LEFT JOIN workspaces w ON p.workspace_id = w.id
          WHERE p.id = ANY($1)
        `;
        
        const result = await this.config.db.query(query, [ids]);
        
        return ids.map(id => {
          const row = result.rows.find(r => r.id === id);
          return row ? this.transformProjectRow(row) : null;
        }).filter(Boolean) as Project[];
      },
      {
        name: 'project',
        cacheManager: this.cacheManager,
        metricsCollector: this.metricsCollector,
        cacheOptions: { 
          ttl: 300, // 5 minutes
          prefix: 'project'
        }
      }
    );
  }

  private createDocumentLoader(): DataLoader<string, Document> {
    return createEnhancedDataLoader(
      async (ids) => {
        const query = `
          SELECT 
            d.*,
            p.name as project_name,
            p.organization_id,
            v.content as current_content,
            v.sequence_number as current_version,
            (SELECT COUNT(*) FROM comments WHERE document_id = d.id AND status = 'active') as comment_count,
            (SELECT COUNT(*) FROM presence_sessions WHERE document_id = d.id AND status = 'active') as active_collaborators,
            (SELECT AVG(rating) FROM document_quality_metrics WHERE document_id = d.id) as quality_score
          FROM documents d
          LEFT JOIN projects p ON d.project_id = p.id
          LEFT JOIN versions v ON d.current_version_id = v.id
          WHERE d.id = ANY($1)
        `;
        
        const result = await this.config.db.query(query, [ids]);
        
        return ids.map(id => {
          const row = result.rows.find(r => r.id === id);
          return row ? this.transformDocumentRow(row) : null;
        }).filter(Boolean) as Document[];
      },
      {
        name: 'document',
        cacheManager: this.cacheManager,
        metricsCollector: this.metricsCollector,
        cacheOptions: { 
          ttl: 60, // 1 minute for frequently changing documents
          prefix: 'document'
        }
      }
    );
  }

  private createUserLoader(): DataLoader<string, User> {
    return createEnhancedDataLoader(
      async (ids) => {
        const query = `
          SELECT 
            u.*,
            up.preferences as collaboration_preferences,
            (SELECT COUNT(*) FROM project_collaborators WHERE user_id = u.id) as project_count,
            (SELECT COUNT(*) FROM presence_sessions WHERE user_id = u.id AND status = 'active') as active_sessions
          FROM users u
          LEFT JOIN user_preferences up ON u.id = up.user_id
          WHERE u.id = ANY($1)
        `;
        
        const result = await this.config.db.query(query, [ids]);
        
        return ids.map(id => {
          const row = result.rows.find(r => r.id === id);
          return row ? this.transformUserRow(row) : null;
        }).filter(Boolean) as User[];
      },
      {
        name: 'user',
        cacheManager: this.cacheManager,
        metricsCollector: this.metricsCollector,
        cacheOptions: { 
          ttl: 600, // 10 minutes
          prefix: 'user'
        }
      }
    );
  }

  // =============================================================================
  // RELATIONSHIP LOADER FACTORIES
  // =============================================================================

  private createProjectDocumentsLoader(): DataLoader<string, Document[]> {
    return createEnhancedDataLoader(
      async (projectIds) => {
        const query = `
          SELECT 
            d.*,
            v.content as current_content,
            v.sequence_number as current_version,
            (SELECT COUNT(*) FROM comments WHERE document_id = d.id AND status = 'active') as comment_count
          FROM documents d
          LEFT JOIN versions v ON d.current_version_id = v.id
          WHERE d.project_id = ANY($1)
          ORDER BY d.updated_at DESC
        `;
        
        const result = await this.config.db.query(query, [projectIds]);
        
        return projectIds.map(projectId => {
          const docs = result.rows
            .filter(row => row.project_id === projectId)
            .map(row => this.transformDocumentRow(row));
          return docs;
        });
      },
      {
        name: 'projectDocuments',
        cacheManager: this.cacheManager,
        metricsCollector: this.metricsCollector,
        cacheOptions: { 
          ttl: 120, // 2 minutes
          prefix: 'project-docs'
        }
      }
    );
  }

  private createDocumentAISuggestionsLoader(): DataLoader<string, AISuggestion[]> {
    return createEnhancedDataLoader(
      async (documentIds) => {
        const query = `
          SELECT 
            s.*,
            a.name as agent_name,
            a.capabilities as agent_capabilities
          FROM ai_suggestions s
          LEFT JOIN nanda_agents a ON s.agent_id = a.id
          WHERE s.document_id = ANY($1)
            AND s.status = 'active'
            AND s.expires_at > NOW()
          ORDER BY s.confidence DESC, s.created_at DESC
        `;
        
        const result = await this.config.db.query(query, [documentIds]);
        
        return documentIds.map(docId => {
          const suggestions = result.rows
            .filter(row => row.document_id === docId)
            .map(row => this.transformAISuggestionRow(row));
          return suggestions;
        });
      },
      {
        name: 'documentAISuggestions',
        cacheManager: this.cacheManager,
        metricsCollector: this.metricsCollector,
        cacheOptions: { 
          ttl: 30, // 30 seconds for real-time AI suggestions
          prefix: 'doc-ai-suggestions'
        }
      }
    );
  }

  // =============================================================================
  // ADVANCED QUERY LOADERS
  // =============================================================================

  private createDocumentsWithFiltersLoader(): DataLoader<string, Document[]> {
    return createEnhancedDataLoader(
      async (filterKeys) => {
        // filterKey format: "projectId:status:search:sortBy:limit:offset"
        const results = await Promise.all(
          filterKeys.map(async (filterKey) => {
            const [projectId, status, search, sortBy, limit, offset] = filterKey.split(':');
            
            let query = `
              SELECT DISTINCT
                d.*,
                v.content as current_content,
                v.sequence_number as current_version,
                (SELECT COUNT(*) FROM comments WHERE document_id = d.id AND status = 'active') as comment_count,
                ts_rank(to_tsvector('english', d.title || ' ' || COALESCE(v.content, '')), plainto_tsquery($3)) as search_rank
              FROM documents d
              LEFT JOIN versions v ON d.current_version_id = v.id
              WHERE 1=1
            `;
            
            const params: any[] = [];
            let paramCount = 0;

            if (projectId && projectId !== 'null') {
              query += ` AND d.project_id = $${++paramCount}`;
              params.push(projectId);
            }

            if (status && status !== 'null') {
              query += ` AND d.status = $${++paramCount}`;
              params.push(status);
            }

            if (search && search !== 'null') {
              query += ` AND (to_tsvector('english', d.title || ' ' || COALESCE(v.content, '')) @@ plainto_tsquery($${++paramCount}))`;
              params.push(search);
            }

            // Add search parameter for ranking (always needed for ts_rank)
            params.push(search || '');

            // Sorting
            switch (sortBy) {
              case 'updated':
                query += ' ORDER BY d.updated_at DESC';
                break;
              case 'created':
                query += ' ORDER BY d.created_at DESC';
                break;
              case 'title':
                query += ' ORDER BY d.title ASC';
                break;
              case 'relevance':
                if (search && search !== 'null') {
                  query += ' ORDER BY search_rank DESC, d.updated_at DESC';
                } else {
                  query += ' ORDER BY d.updated_at DESC';
                }
                break;
              default:
                query += ' ORDER BY d.updated_at DESC';
            }

            // Pagination
            if (limit && limit !== 'null') {
              query += ` LIMIT ${parseInt(limit)}`;
            }
            if (offset && offset !== 'null') {
              query += ` OFFSET ${parseInt(offset)}`;
            }

            const result = await this.config.db.query(query, params);
            return result.rows.map(row => this.transformDocumentRow(row));
          })
        );

        return results;
      },
      {
        name: 'documentsWithFilters',
        cacheManager: this.cacheManager,
        metricsCollector: this.metricsCollector,
        cacheOptions: { 
          ttl: 60, // 1 minute for filtered searches
          prefix: 'docs-filtered'
        }
      }
    );
  }

  // =============================================================================
  // DATA TRANSFORMATION METHODS
  // =============================================================================

  private transformProjectRow(row: any): Project {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      status: row.status,
      visibility: row.visibility,
      workspaceId: row.workspace_id,
      organizationId: row.organization_id,
      ownerId: row.owner_id,
      settings: row.settings || {},
      metadata: row.metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      // Computed fields
      documentCount: parseInt(row.document_count) || 0,
      collaboratorCount: parseInt(row.collaborator_count) || 0,
      workspace: row.workspace_name ? {
        name: row.workspace_name,
        settings: row.workspace_settings || {}
      } : null
    };
  }

  private transformDocumentRow(row: any): Document {
    return {
      id: row.id,
      title: row.title,
      content: row.current_content || '',
      status: row.status,
      type: row.type,
      projectId: row.project_id,
      currentVersionId: row.current_version_id,
      createdBy: row.created_by,
      metadata: row.metadata || {},
      settings: row.settings || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      // Computed fields
      version: parseInt(row.current_version) || 1,
      commentCount: parseInt(row.comment_count) || 0,
      activeCollaborators: parseInt(row.active_collaborators) || 0,
      qualityScore: parseFloat(row.quality_score) || null,
      organizationId: row.organization_id,
      projectName: row.project_name
    };
  }

  private transformUserRow(row: any): User {
    return {
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      username: row.username,
      avatar: row.avatar,
      status: row.status,
      timezone: row.timezone,
      locale: row.locale,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      // Extended fields
      collaborationPreferences: row.collaboration_preferences || {},
      projectCount: parseInt(row.project_count) || 0,
      activeSessions: parseInt(row.active_sessions) || 0
    };
  }

  private transformAISuggestionRow(row: any): AISuggestion {
    return {
      id: row.id,
      documentId: row.document_id,
      agentId: row.agent_id,
      type: row.type,
      content: row.content,
      confidence: parseFloat(row.confidence),
      context: row.context || {},
      status: row.status,
      feedback: row.feedback,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      // Agent info
      agent: {
        name: row.agent_name,
        capabilities: row.agent_capabilities || []
      }
    };
  }

  // =============================================================================
  // ADDITIONAL LOADER FACTORIES (Simplified for brevity)
  // =============================================================================

  private createCommentLoader() {
    return createEnhancedDataLoader(async (ids) => [], {
      name: 'comment', cacheManager: this.cacheManager, metricsCollector: this.metricsCollector
    });
  }

  private createVersionLoader() {
    return createEnhancedDataLoader(async (ids) => [], {
      name: 'version', cacheManager: this.cacheManager, metricsCollector: this.metricsCollector
    });
  }

  private createWorkspaceLoader() {
    return createEnhancedDataLoader(async (ids) => [], {
      name: 'workspace', cacheManager: this.cacheManager, metricsCollector: this.metricsCollector
    });
  }

  private createNandaAgentLoader() {
    return createEnhancedDataLoader(async (ids) => [], {
      name: 'nandaAgent', cacheManager: this.cacheManager, metricsCollector: this.metricsCollector
    });
  }

  private createAISuggestionLoader() {
    return createEnhancedDataLoader(async (ids) => [], {
      name: 'aiSuggestion', cacheManager: this.cacheManager, metricsCollector: this.metricsCollector
    });
  }

  private createAIAnalysisLoader() {
    return createEnhancedDataLoader(async (ids) => [], {
      name: 'aiAnalysis', cacheManager: this.cacheManager, metricsCollector: this.metricsCollector
    });
  }

  private createPresenceSessionLoader() {
    return createEnhancedDataLoader(async (ids) => [], {
      name: 'presenceSession', cacheManager: this.cacheManager, metricsCollector: this.metricsCollector
    });
  }

  private createActivityEventLoader() {
    return createEnhancedDataLoader(async (ids) => [], {
      name: 'activityEvent', cacheManager: this.cacheManager, metricsCollector: this.metricsCollector
    });
  }

  private createDocumentVersionsLoader() {
    return createEnhancedDataLoader(async (ids) => [], {
      name: 'documentVersions', cacheManager: this.cacheManager, metricsCollector: this.metricsCollector
    });
  }

  private createDocumentCommentsLoader() {
    return createEnhancedDataLoader(async (ids) => [], {
      name: 'documentComments', cacheManager: this.cacheManager, metricsCollector: this.metricsCollector
    });
  }

  private createDocumentPresenceLoader() {
    return createEnhancedDataLoader(async (ids) => [], {
      name: 'documentPresence', cacheManager: this.cacheManager, metricsCollector: this.metricsCollector
    });
  }

  private createUserProjectsLoader() {
    return createEnhancedDataLoader(async (ids) => [], {
      name: 'userProjects', cacheManager: this.cacheManager, metricsCollector: this.metricsCollector
    });
  }

  private createUserRecentDocumentsLoader() {
    return createEnhancedDataLoader(async (ids) => [], {
      name: 'userRecentDocuments', cacheManager: this.cacheManager, metricsCollector: this.metricsCollector
    });
  }

  private createProjectCollaboratorsLoader() {
    return createEnhancedDataLoader(async (ids) => [], {
      name: 'projectCollaborators', cacheManager: this.cacheManager, metricsCollector: this.metricsCollector
    });
  }

  private createWorkspaceProjectsLoader() {
    return createEnhancedDataLoader(async (ids) => [], {
      name: 'workspaceProjects', cacheManager: this.cacheManager, metricsCollector: this.metricsCollector
    });
  }

  private createUserAIUsageLoader() {
    return createEnhancedDataLoader(async (ids) => [], {
      name: 'userAIUsage', cacheManager: this.cacheManager, metricsCollector: this.metricsCollector
    });
  }

  private createProjectAIMetricsLoader() {
    return createEnhancedDataLoader(async (ids) => [], {
      name: 'projectAIMetrics', cacheManager: this.cacheManager, metricsCollector: this.metricsCollector
    });
  }

  private createProjectAnalyticsLoader() {
    return createEnhancedDataLoader(async (ids) => [], {
      name: 'projectAnalytics', cacheManager: this.cacheManager, metricsCollector: this.metricsCollector
    });
  }

  private createCollaborationMetricsLoader() {
    return createEnhancedDataLoader(async (ids) => [], {
      name: 'collaborationMetrics', cacheManager: this.cacheManager, metricsCollector: this.metricsCollector
    });
  }

  // =============================================================================
  // CACHE MANAGEMENT AND INVALIDATION
  // =============================================================================

  async invalidateEntity(entityType: string, id: string): Promise<void> {
    await this.cacheManager.invalidate(`${entityType}:${id}`);
    
    // Invalidate related caches
    switch (entityType) {
      case 'project':
        await this.cacheManager.invalidate(`project-docs:${id}`);
        await this.cacheManager.invalidate(`project-analytics:${id}`);
        break;
      case 'document':
        await this.cacheManager.invalidate(`doc-ai-suggestions:${id}`);
        await this.cacheManager.invalidate(`document-comments:${id}`);
        await this.cacheManager.invalidate(`document-versions:${id}`);
        break;
      case 'user':
        await this.cacheManager.invalidate(`user-projects:${id}`);
        await this.cacheManager.invalidate(`user-recent-docs:${id}`);
        break;
    }
  }

  async invalidateAll(): Promise<void> {
    const patterns = [
      'project:*',
      'document:*', 
      'user:*',
      'project-docs:*',
      'doc-ai-suggestions:*',
      'docs-filtered:*'
    ];

    await Promise.all(patterns.map(pattern => 
      this.cacheManager.invalidate(pattern)
    ));
  }

  getMetrics(): Record<string, DataLoaderMetrics> {
    return this.metricsCollector.getMetrics();
  }

  getCacheHitRates(): Record<string, number> {
    const loaderNames = [
      'project', 'document', 'user', 'projectDocuments', 
      'documentAISuggestions', 'documentsWithFilters'
    ];
    
    return loaderNames.reduce((rates, name) => {
      rates[name] = this.metricsCollector.getCacheHitRate(name);
      return rates;
    }, {} as Record<string, number>);
  }
}

// =============================================================================
// DATALOADER FACTORY FUNCTION
// =============================================================================

export function createEnhancedCollaborationDataLoaders(config: DataLoaderConfig): EnhancedCollaborationDataLoaders {
  return new EnhancedCollaborationDataLoaders(config);
}

export default EnhancedCollaborationDataLoaders;
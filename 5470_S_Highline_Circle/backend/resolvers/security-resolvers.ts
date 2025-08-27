// =====================================================
// SECURITY OPERATIONS GRAPHQL RESOLVERS
// =====================================================
// Comprehensive resolver implementation with DataLoader optimization
// Supports TimescaleDB, Neo4j, Vector DB, and Kafka integration
// =====================================================

import DataLoader from 'dataloader';
import { PubSub, withFilter } from 'graphql-subscriptions';
import { AuthenticationError, ForbiddenError, UserInputError } from 'apollo-server-express';
import { 
  SecurityEvent, 
  ThreatIntelligence, 
  SecurityCase, 
  IOC, 
  MitreAttackPattern,
  SecurityPlaybook,
  PlaybookExecution
} from '../types/security-types';
import {
  TimescaleDBService,
  Neo4jService,
  VectorDBService,
  KafkaService,
  RedisService
} from '../services';
import {
  SecurityEventService,
  ThreatIntelligenceService,
  CaseManagementService,
  PlaybookService,
  MitreService,
  IOCService,
  CorrelationEngine,
  ThreatHuntingEngine
} from '../services/security';

// =====================================================
// DATALOADER SETUP FOR N+1 OPTIMIZATION
// =====================================================

export class SecurityDataLoaders {
  // Security Events DataLoaders
  public readonly eventsByIds = new DataLoader<string, SecurityEvent>(
    async (ids: readonly string[]) => {
      const events = await SecurityEventService.getEventsByIds(ids as string[]);
      return ids.map(id => events.find(event => event.id === id) || null);
    },
    { cache: true, maxBatchSize: 100 }
  );

  public readonly eventsByCorrelationIds = new DataLoader<string, SecurityEvent[]>(
    async (correlationIds: readonly string[]) => {
      const results = await SecurityEventService.getCorrelatedEventsBatch(correlationIds as string[]);
      return correlationIds.map(id => results[id] || []);
    },
    { cache: true, maxBatchSize: 50 }
  );

  // Threat Intelligence DataLoaders
  public readonly threatIntelByIds = new DataLoader<string, ThreatIntelligence>(
    async (ids: readonly string[]) => {
      const threatIntel = await ThreatIntelligenceService.getThreatIntelByIds(ids as string[]);
      return ids.map(id => threatIntel.find(ti => ti.id === id) || null);
    },
    { cache: true, maxBatchSize: 100 }
  );

  public readonly threatIntelByEventIds = new DataLoader<string, ThreatIntelligence[]>(
    async (eventIds: readonly string[]) => {
      const results = await ThreatIntelligenceService.getThreatIntelByEventIds(eventIds as string[]);
      return eventIds.map(id => results[id] || []);
    },
    { cache: true, maxBatchSize: 100 }
  );

  // IOC DataLoaders
  public readonly iocsByIds = new DataLoader<string, IOC>(
    async (ids: readonly string[]) => {
      const iocs = await IOCService.getIOCsByIds(ids as string[]);
      return ids.map(id => iocs.find(ioc => ioc.id === id) || null);
    },
    { cache: true, maxBatchSize: 200 }
  );

  public readonly iocsByEventIds = new DataLoader<string, IOC[]>(
    async (eventIds: readonly string[]) => {
      const results = await IOCService.getIOCsByEventIds(eventIds as string[]);
      return eventIds.map(id => results[id] || []);
    },
    { cache: true, maxBatchSize: 100 }
  );

  // MITRE ATT&CK DataLoaders
  public readonly mitrePatternsByIds = new DataLoader<string, MitreAttackPattern>(
    async (ids: readonly string[]) => {
      const patterns = await MitreService.getAttackPatternsByIds(ids as string[]);
      return ids.map(id => patterns.find(pattern => pattern.id === id) || null);
    },
    { cache: true, maxBatchSize: 100 }
  );

  public readonly mitrePatternsByEventIds = new DataLoader<string, MitreAttackPattern[]>(
    async (eventIds: readonly string[]) => {
      const results = await MitreService.getAttackPatternsByEventIds(eventIds as string[]);
      return eventIds.map(id => results[id] || []);
    },
    { cache: true, maxBatchSize: 100 }
  );

  // Case Management DataLoaders
  public readonly casesByIds = new DataLoader<string, SecurityCase>(
    async (ids: readonly string[]) => {
      const cases = await CaseManagementService.getCasesByIds(ids as string[]);
      return ids.map(id => cases.find(case => case.id === id) || null);
    },
    { cache: true, maxBatchSize: 50 }
  );

  public readonly casesByEventIds = new DataLoader<string, SecurityCase[]>(
    async (eventIds: readonly string[]) => {
      const results = await CaseManagementService.getCasesByEventIds(eventIds as string[]);
      return eventIds.map(id => results[id] || []);
    },
    { cache: true, maxBatchSize: 100 }
  );

  // Playbook DataLoaders
  public readonly playbooksByIds = new DataLoader<string, SecurityPlaybook>(
    async (ids: readonly string[]) => {
      const playbooks = await PlaybookService.getPlaybooksByIds(ids as string[]);
      return ids.map(id => playbooks.find(pb => pb.id === id) || null);
    },
    { cache: true, maxBatchSize: 50 }
  );

  public readonly playbookExecutionsByIds = new DataLoader<string, PlaybookExecution>(
    async (ids: readonly string[]) => {
      const executions = await PlaybookService.getExecutionsByIds(ids as string[]);
      return ids.map(id => executions.find(ex => ex.id === id) || null);
    },
    { cache: true, maxBatchSize: 50 }
  );

  // Clear all caches
  public clearAll(): void {
    this.eventsByIds.clearAll();
    this.eventsByCorrelationIds.clearAll();
    this.threatIntelByIds.clearAll();
    this.threatIntelByEventIds.clearAll();
    this.iocsByIds.clearAll();
    this.iocsByEventIds.clearAll();
    this.mitrePatternsByIds.clearAll();
    this.mitrePatternsByEventIds.clearAll();
    this.casesByIds.clearAll();
    this.casesByEventIds.clearAll();
    this.playbooksByIds.clearAll();
    this.playbookExecutionsByIds.clearAll();
  }
}

// =====================================================
// PUBSUB SETUP FOR SUBSCRIPTIONS
// =====================================================

const pubsub = new PubSub();

// Subscription channels
export const SUBSCRIPTION_CHANNELS = {
  SECURITY_EVENT_STREAM: 'SECURITY_EVENT_STREAM',
  CRITICAL_SECURITY_ALERTS: 'CRITICAL_SECURITY_ALERTS',
  CASE_UPDATES: 'CASE_UPDATES',
  CASE_ASSIGNMENTS: 'CASE_ASSIGNMENTS',
  PLAYBOOK_EXECUTION_UPDATES: 'PLAYBOOK_EXECUTION_UPDATES',
  PLAYBOOK_APPROVAL_REQUESTS: 'PLAYBOOK_APPROVAL_REQUESTS',
  NEW_THREAT_INTELLIGENCE: 'NEW_THREAT_INTELLIGENCE',
  IOC_UPDATES: 'IOC_UPDATES',
  SYSTEM_HEALTH_UPDATES: 'SYSTEM_HEALTH_UPDATES',
  ATTACK_PATTERN_DETECTIONS: 'ATTACK_PATTERN_DETECTIONS',
  EVENT_CORRELATIONS: 'EVENT_CORRELATIONS'
};

// =====================================================
// CONTEXT INTERFACE
// =====================================================

export interface SecurityContext {
  user: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
    teamId?: string;
  };
  dataSources: {
    timescaleDB: TimescaleDBService;
    neo4j: Neo4jService;
    vectorDB: VectorDBService;
    kafka: KafkaService;
    redis: RedisService;
  };
  services: {
    securityEvents: SecurityEventService;
    threatIntelligence: ThreatIntelligenceService;
    caseManagement: CaseManagementService;
    playbooks: PlaybookService;
    mitre: MitreService;
    iocs: IOCService;
    correlationEngine: CorrelationEngine;
    threatHunting: ThreatHuntingEngine;
  };
  dataLoaders: SecurityDataLoaders;
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

const requireAuth = (context: SecurityContext) => {
  if (!context.user) {
    throw new AuthenticationError('Authentication required');
  }
};

const requirePermission = (context: SecurityContext, permission: string) => {
  requireAuth(context);
  if (!context.user.permissions.includes(permission)) {
    throw new ForbiddenError(`Permission required: ${permission}`);
  }
};

const validatePagination = (pagination: any) => {
  if (pagination?.first && pagination.first > 1000) {
    throw new UserInputError('Maximum page size is 1000');
  }
};

// =====================================================
// QUERY RESOLVERS
// =====================================================

export const queryResolvers = {
  // Security Events
  securityEvents: async (
    parent: any,
    { filter, sort, pagination }: any,
    context: SecurityContext
  ) => {
    requirePermission(context, 'READ_SECURITY_EVENTS');
    validatePagination(pagination);

    const result = await context.services.securityEvents.getSecurityEvents({
      filter,
      sort,
      pagination
    });

    return result;
  },

  securityEvent: async (
    parent: any,
    { id }: { id: string },
    context: SecurityContext
  ) => {
    requirePermission(context, 'READ_SECURITY_EVENTS');
    return context.dataLoaders.eventsByIds.load(id);
  },

  // Time Series Aggregation with TimescaleDB
  eventsTimeSeriesAggregation: async (
    parent: any,
    { timeRange, interval, groupBy, filter }: any,
    context: SecurityContext
  ) => {
    requirePermission(context, 'READ_ANALYTICS');

    const query = `
      SELECT 
        time_bucket('${interval.toLowerCase()}', timestamp) AS bucket,
        ${groupBy ? groupBy.map(field => `${field},`).join(' ') : ''}
        COUNT(*) as count,
        AVG(risk_score) as avg_risk_score,
        MAX(severity::int) as max_severity
      FROM security_events 
      WHERE timestamp >= $1 AND timestamp <= $2
      ${filter ? buildWhereClause(filter) : ''}
      ${groupBy ? `GROUP BY bucket, ${groupBy.join(', ')}` : 'GROUP BY bucket'}
      ORDER BY bucket ASC
    `;

    const result = await context.dataSources.timescaleDB.query(query, [
      timeRange.start,
      timeRange.end
    ]);

    return {
      series: transformTimeSeriesData(result.rows, groupBy),
      timeRange,
      interval
    };
  },

  // Graph-based Event Correlation with Neo4j
  eventCorrelationGraph: async (
    parent: any,
    { eventId, maxDepth = 3, minCorrelationScore = 0.7 }: any,
    context: SecurityContext
  ) => {
    requirePermission(context, 'READ_CORRELATIONS');

    const cypherQuery = `
      MATCH (central:SecurityEvent {id: $eventId})
      CALL apoc.path.subgraphAll(central, {
        relationshipFilter: "CORRELATES_WITH",
        labelFilter: "SecurityEvent",
        maxLevel: $maxDepth,
        minLevel: 1
      })
      YIELD nodes, relationships
      UNWIND relationships as rel
      WHERE rel.score >= $minCorrelationScore
      RETURN central, nodes, relationships
    `;

    const result = await context.dataSources.neo4j.run(cypherQuery, {
      eventId,
      maxDepth,
      minCorrelationScore
    });

    return transformCorrelationGraph(result.records);
  },

  // Advanced Threat Hunting
  threatHunt: async (
    parent: any,
    { query, timeRange }: any,
    context: SecurityContext
  ) => {
    requirePermission(context, 'THREAT_HUNTING');

    const huntResult = await context.services.threatHunting.executeHunt({
      ...query,
      timeRange
    });

    return huntResult;
  },

  // Threat Intelligence
  threatIntelligence: async (
    parent: any,
    { filter, sort, pagination }: any,
    context: SecurityContext
  ) => {
    requirePermission(context, 'READ_THREAT_INTELLIGENCE');
    validatePagination(pagination);

    return context.services.threatIntelligence.getThreatIntelligence({
      filter,
      sort,
      pagination
    });
  },

  // IOC Management with Vector Similarity Search
  findSimilarIOCs: async (
    parent: any,
    { ioc, threshold = 0.8, limit = 10 }: any,
    context: SecurityContext
  ) => {
    requirePermission(context, 'READ_IOCS');

    // Convert IOC to vector embedding
    const vector = await context.services.iocs.generateIOCEmbedding(ioc);

    // Search for similar IOCs using vector database
    const similarIOCs = await context.dataSources.vectorDB.similaritySearch({
      vector,
      threshold,
      limit,
      collection: 'ioc_embeddings'
    });

    return similarIOCs.map(result => ({
      ioc: result.metadata.ioc,
      similarityScore: result.score,
      similarityFactors: result.metadata.factors
    }));
  },

  // MITRE ATT&CK Patterns
  mitreAttackPatterns: async (
    parent: any,
    { filter, pagination }: any,
    context: SecurityContext
  ) => {
    requirePermission(context, 'READ_MITRE_DATA');
    validatePagination(pagination);

    return context.services.mitre.getAttackPatterns({ filter, pagination });
  },

  mitreTactics: async (
    parent: any,
    args: any,
    context: SecurityContext
  ) => {
    requirePermission(context, 'READ_MITRE_DATA');
    return context.services.mitre.getTactics();
  },

  // Security Cases
  securityCases: async (
    parent: any,
    { filter, sort, pagination }: any,
    context: SecurityContext
  ) => {
    requirePermission(context, 'READ_CASES');
    validatePagination(pagination);

    return context.services.caseManagement.getCases({
      filter,
      sort,
      pagination
    });
  },

  securityCase: async (
    parent: any,
    { id }: { id: string },
    context: SecurityContext
  ) => {
    requirePermission(context, 'READ_CASES');
    return context.dataLoaders.casesByIds.load(id);
  },

  // Case Analytics
  caseMetrics: async (
    parent: any,
    { timeRange, teamFilter, severityFilter }: any,
    context: SecurityContext
  ) => {
    requirePermission(context, 'READ_ANALYTICS');

    return context.services.caseManagement.getCaseMetrics({
      timeRange,
      teamFilter,
      severityFilter
    });
  },

  // Security Playbooks
  securityPlaybooks: async (
    parent: any,
    { filter, pagination }: any,
    context: SecurityContext
  ) => {
    requirePermission(context, 'READ_PLAYBOOKS');
    validatePagination(pagination);

    return context.services.playbooks.getPlaybooks({ filter, pagination });
  },

  securityPlaybook: async (
    parent: any,
    { id }: { id: string },
    context: SecurityContext
  ) => {
    requirePermission(context, 'READ_PLAYBOOKS');
    return context.dataLoaders.playbooksByIds.load(id);
  },

  // Playbook Executions
  playbookExecutions: async (
    parent: any,
    { filter, pagination }: any,
    context: SecurityContext
  ) => {
    requirePermission(context, 'READ_PLAYBOOK_EXECUTIONS');
    validatePagination(pagination);

    return context.services.playbooks.getExecutions({ filter, pagination });
  },

  playbookExecution: async (
    parent: any,
    { id }: { id: string },
    context: SecurityContext
  ) => {
    requirePermission(context, 'READ_PLAYBOOK_EXECUTIONS');
    return context.dataLoaders.playbookExecutionsByIds.load(id);
  },

  // System Status
  securityOperationsStatus: async (
    parent: any,
    args: any,
    context: SecurityContext
  ) => {
    requirePermission(context, 'READ_SYSTEM_STATUS');

    const [
      systemHealth,
      activeIncidents,
      criticalAlerts,
      playbooksRunning,
      avgResponseTime,
      slaCompliance
    ] = await Promise.all([
      context.services.securityEvents.getSystemHealth(),
      context.services.caseManagement.getActiveIncidentCount(),
      context.services.securityEvents.getCriticalAlertCount(),
      context.services.playbooks.getRunningExecutionCount(),
      context.services.caseManagement.getAverageResponseTime(),
      context.services.caseManagement.getSLACompliance()
    ]);

    return {
      systemHealth,
      activeIncidents,
      criticalAlerts,
      playbooksRunning,
      averageResponseTime: avgResponseTime,
      slaCompliance,
      lastUpdated: new Date()
    };
  },

  // Advanced Analytics
  securityMetrics: async (
    parent: any,
    { timeRange, metrics }: any,
    context: SecurityContext
  ) => {
    requirePermission(context, 'READ_ANALYTICS');

    const report = await context.services.securityEvents.generateMetricsReport({
      timeRange,
      metrics
    });

    return report;
  },

  // Compliance Reporting
  complianceReport: async (
    parent: any,
    { framework, assessmentDate }: any,
    context: SecurityContext
  ) => {
    requirePermission(context, 'READ_COMPLIANCE');

    return context.services.caseManagement.generateComplianceReport({
      framework,
      assessmentDate
    });
  },

  // Neo4j Graph Analysis
  attackPathAnalysis: async (
    parent: any,
    { startNode, endNode, maxHops = 5 }: any,
    context: SecurityContext
  ) => {
    requirePermission(context, 'ADVANCED_ANALYTICS');

    const cypherQuery = `
      MATCH (start {id: $startNode}), (end {id: $endNode})
      CALL apoc.algo.dijkstra(start, end, 'ATTACK_PATH', 'weight') 
      YIELD path, weight
      RETURN path, weight
      ORDER BY weight ASC
      LIMIT 10
    `;

    const result = await context.dataSources.neo4j.run(cypherQuery, {
      startNode,
      endNode
    });

    return transformAttackPathResult(result.records);
  },

  // Entity Relationship Graph
  entityRelationshipGraph: async (
    parent: any,
    { entityId, entityType, depth = 2 }: any,
    context: SecurityContext
  ) => {
    requirePermission(context, 'READ_CORRELATIONS');

    const cypherQuery = `
      MATCH (central:${entityType} {id: $entityId})
      CALL apoc.path.subgraphAll(central, {
        maxLevel: $depth,
        minLevel: 1
      })
      YIELD nodes, relationships
      RETURN central, nodes, relationships
    `;

    const result = await context.dataSources.neo4j.run(cypherQuery, {
      entityId,
      depth
    });

    return transformEntityGraph(result.records);
  }
};

// =====================================================
// MUTATION RESOLVERS
// =====================================================

export const mutationResolvers = {
  // Security Event Ingestion
  ingestSecurityEvent: async (
    parent: any,
    { input }: any,
    context: SecurityContext
  ) => {
    requirePermission(context, 'INGEST_EVENTS');

    // Validate CEF format
    if (input.cefVersion < 0 || input.cefVersion > 1) {
      throw new UserInputError('Invalid CEF version');
    }

    const event = await context.services.securityEvents.ingestEvent(input);

    // Publish to real-time stream
    pubsub.publish(SUBSCRIPTION_CHANNELS.SECURITY_EVENT_STREAM, {
      securityEventStream: event
    });

    // Check for critical alerts
    if (event.severity === 'CRITICAL') {
      pubsub.publish(SUBSCRIPTION_CHANNELS.CRITICAL_SECURITY_ALERTS, {
        criticalSecurityAlerts: event
      });
    }

    // Trigger correlation analysis
    context.services.correlationEngine.analyzeEvent(event);

    return event;
  },

  // Batch Event Ingestion with Kafka Integration
  batchIngestSecurityEvents: async (
    parent: any,
    { events, batchSize = 1000 }: any,
    context: SecurityContext
  ) => {
    requirePermission(context, 'BATCH_INGEST_EVENTS');

    if (events.length > 10000) {
      throw new UserInputError('Maximum batch size is 10,000 events');
    }

    // Process in batches to avoid memory issues
    const results = await context.services.securityEvents.batchIngestEvents({
      events,
      batchSize
    });

    // Publish successful events to Kafka for downstream processing
    const successfulEvents = events.slice(0, results.successCount);
    for (const event of successfulEvents) {
      await context.dataSources.kafka.publish('security-events', event);
    }

    return results;
  },

  // Event Management
  updateSecurityEvent: async (
    parent: any,
    { id, input }: any,
    context: SecurityContext
  ) => {
    requirePermission(context, 'UPDATE_EVENTS');

    const updatedEvent = await context.services.securityEvents.updateEvent(id, input);
    
    // Clear cache
    context.dataLoaders.eventsByIds.clear(id);

    return updatedEvent;
  },

  deleteSecurityEvent: async (
    parent: any,
    { id }: { id: string },
    context: SecurityContext
  ) => {
    requirePermission(context, 'DELETE_EVENTS');

    const success = await context.services.securityEvents.deleteEvent(id);
    
    // Clear cache
    context.dataLoaders.eventsByIds.clear(id);

    return success;
  },

  // Threat Intelligence Management
  createThreatIntelligence: async (
    parent: any,
    { input }: any,
    context: SecurityContext
  ) => {
    requirePermission(context, 'CREATE_THREAT_INTELLIGENCE');

    const threatIntel = await context.services.threatIntelligence.createThreatIntelligence(input);

    // Publish to subscribers
    pubsub.publish(SUBSCRIPTION_CHANNELS.NEW_THREAT_INTELLIGENCE, {
      newThreatIntelligence: threatIntel
    });

    return threatIntel;
  },

  // IOC Management
  createIOC: async (
    parent: any,
    { input }: any,
    context: SecurityContext
  ) => {
    requirePermission(context, 'CREATE_IOCS');

    const ioc = await context.services.iocs.createIOC(input);

    // Generate and store vector embedding for similarity search
    const embedding = await context.services.iocs.generateIOCEmbedding(input.value);
    await context.dataSources.vectorDB.upsert({
      id: ioc.id,
      vector: embedding,
      metadata: { ioc, type: input.type, value: input.value }
    });

    // Publish update
    pubsub.publish(SUBSCRIPTION_CHANNELS.IOC_UPDATES, {
      iocUpdates: ioc
    });

    return ioc;
  },

  whitelistIOC: async (
    parent: any,
    { id, reason }: any,
    context: SecurityContext
  ) => {
    requirePermission(context, 'WHITELIST_IOCS');

    const ioc = await context.services.iocs.whitelistIOC(id, reason);
    
    // Clear cache
    context.dataLoaders.iocsByIds.clear(id);

    return ioc;
  },

  // Case Management
  createSecurityCase: async (
    parent: any,
    { input }: any,
    context: SecurityContext
  ) => {
    requirePermission(context, 'CREATE_CASES');

    const securityCase = await context.services.caseManagement.createCase({
      ...input,
      createdBy: context.user.id
    });

    // Publish to subscribers
    pubsub.publish(SUBSCRIPTION_CHANNELS.CASE_UPDATES, {
      caseUpdates: securityCase
    });

    // If assigned, notify assignee
    if (input.assigneeId) {
      pubsub.publish(SUBSCRIPTION_CHANNELS.CASE_ASSIGNMENTS, {
        caseAssignments: securityCase
      });
    }

    return securityCase;
  },

  assignCase: async (
    parent: any,
    { caseId, assigneeId }: any,
    context: SecurityContext
  ) => {
    requirePermission(context, 'ASSIGN_CASES');

    const securityCase = await context.services.caseManagement.assignCase({
      caseId,
      assigneeId,
      assignedBy: context.user.id
    });

    // Clear cache and publish updates
    context.dataLoaders.casesByIds.clear(caseId);
    
    pubsub.publish(SUBSCRIPTION_CHANNELS.CASE_ASSIGNMENTS, {
      caseAssignments: securityCase
    });

    return securityCase;
  },

  // Playbook Management
  createSecurityPlaybook: async (
    parent: any,
    { input }: any,
    context: SecurityContext
  ) => {
    requirePermission(context, 'CREATE_PLAYBOOKS');

    const playbook = await context.services.playbooks.createPlaybook({
      ...input,
      authorId: context.user.id
    });

    return playbook;
  },

  // Playbook Execution with SOAR Integration
  executePlaybook: async (
    parent: any,
    { playbookId, inputData, caseId, automated = false }: any,
    context: SecurityContext
  ) => {
    requirePermission(context, 'EXECUTE_PLAYBOOKS');

    const execution = await context.services.playbooks.executePlaybook({
      playbookId,
      inputData,
      caseId,
      automated,
      executedBy: context.user.id
    });

    // Publish execution updates
    pubsub.publish(SUBSCRIPTION_CHANNELS.PLAYBOOK_EXECUTION_UPDATES, {
      playbookExecutionUpdates: execution
    });

    // Check for approval requirements
    const approvalSteps = execution.stepExecutions.filter(
      step => step.step.requiresApproval
    );

    if (approvalSteps.length > 0) {
      pubsub.publish(SUBSCRIPTION_CHANNELS.PLAYBOOK_APPROVAL_REQUESTS, {
        playbookApprovalRequests: execution
      });
    }

    return execution;
  },

  approvePlaybookStep: async (
    parent: any,
    { executionId, stepId, approved, comments }: any,
    context: SecurityContext
  ) => {
    requirePermission(context, 'APPROVE_PLAYBOOK_STEPS');

    const approval = await context.services.playbooks.approveStep({
      executionId,
      stepId,
      approved,
      comments,
      approverId: context.user.id
    });

    // Clear cache and publish updates
    context.dataLoaders.playbookExecutionsByIds.clear(executionId);
    
    const execution = await context.dataLoaders.playbookExecutionsByIds.load(executionId);
    pubsub.publish(SUBSCRIPTION_CHANNELS.PLAYBOOK_EXECUTION_UPDATES, {
      playbookExecutionUpdates: execution
    });

    return approval;
  },

  // Response Actions (SOAR Integration)
  isolateHost: async (
    parent: any,
    { hostname, reason }: any,
    context: SecurityContext
  ) => {
    requirePermission(context, 'RESPONSE_ACTIONS');

    const action = await context.services.playbooks.executeResponseAction({
      actionType: 'ISOLATE_HOST',
      parameters: { hostname },
      reason,
      executedBy: context.user.id
    });

    return action;
  },

  blockIP: async (
    parent: any,
    { ipAddress, duration, reason }: any,
    context: SecurityContext
  ) => {
    requirePermission(context, 'RESPONSE_ACTIONS');

    const action = await context.services.playbooks.executeResponseAction({
      actionType: 'BLOCK_IP',
      parameters: { ipAddress, duration },
      reason,
      executedBy: context.user.id
    });

    return action;
  },

  blockDomain: async (
    parent: any,
    { domain, duration, reason }: any,
    context: SecurityContext
  ) => {
    requirePermission(context, 'RESPONSE_ACTIONS');

    const action = await context.services.playbooks.executeResponseAction({
      actionType: 'BLOCK_DOMAIN',
      parameters: { domain, duration },
      reason,
      executedBy: context.user.id
    });

    return action;
  }
};

// =====================================================
// FIELD RESOLVERS
// =====================================================

export const fieldResolvers = {
  SecurityEvent: {
    // Optimize N+1 queries for related entities
    mitreAttackPatterns: (parent: SecurityEvent, args: any, context: SecurityContext) => {
      return context.dataLoaders.mitrePatternsByEventIds.load(parent.id);
    },

    threatIntelligence: (parent: SecurityEvent, args: any, context: SecurityContext) => {
      return context.dataLoaders.threatIntelByEventIds.load(parent.id);
    },

    cases: (parent: SecurityEvent, args: any, context: SecurityContext) => {
      return context.dataLoaders.casesByEventIds.load(parent.id);
    },

    correlatedEvents: (parent: SecurityEvent, args: any, context: SecurityContext) => {
      return context.dataLoaders.eventsByCorrelationIds.load(parent.id);
    }
  },

  ThreatIntelligence: {
    associatedEvents: async (parent: ThreatIntelligence, args: any, context: SecurityContext) => {
      return context.services.securityEvents.getEventsByThreatIntelligenceId(parent.id);
    },

    mitreAttackPatterns: (parent: ThreatIntelligence, args: any, context: SecurityContext) => {
      return context.dataLoaders.mitrePatternsByEventIds.load(parent.id);
    }
  },

  SecurityCase: {
    securityEvents: (parent: SecurityCase, args: any, context: SecurityContext) => {
      return context.services.securityEvents.getEventsByCaseId(parent.id);
    },

    playbooks: (parent: SecurityCase, args: any, context: SecurityContext) => {
      return context.services.playbooks.getExecutionsByCaseId(parent.id);
    }
  },

  MitreAttackPattern: {
    associatedEvents: async (parent: MitreAttackPattern, args: any, context: SecurityContext) => {
      return context.services.securityEvents.getEventsByMitreAttackPatternId(parent.id);
    }
  }
};

// =====================================================
// SUBSCRIPTION RESOLVERS
// =====================================================

export const subscriptionResolvers = {
  securityEventStream: {
    subscribe: withFilter(
      () => pubsub.asyncIterator(SUBSCRIPTION_CHANNELS.SECURITY_EVENT_STREAM),
      (payload, variables) => {
        if (!variables.filter) return true;
        
        const event = payload.securityEventStream;
        
        // Apply severity filter
        if (variables.filter.severities && 
            !variables.filter.severities.includes(event.severity)) {
          return false;
        }

        // Apply risk score threshold
        if (variables.filter.riskScoreThreshold && 
            event.riskScore < variables.filter.riskScoreThreshold) {
          return false;
        }

        // Apply vendor filter
        if (variables.filter.deviceVendors && 
            !variables.filter.deviceVendors.includes(event.deviceVendor)) {
          return false;
        }

        return true;
      }
    )
  },

  criticalSecurityAlerts: {
    subscribe: () => pubsub.asyncIterator(SUBSCRIPTION_CHANNELS.CRITICAL_SECURITY_ALERTS)
  },

  caseUpdates: {
    subscribe: withFilter(
      () => pubsub.asyncIterator(SUBSCRIPTION_CHANNELS.CASE_UPDATES),
      (payload, variables) => {
        if (!variables.caseId) return true;
        return payload.caseUpdates.id === variables.caseId;
      }
    )
  },

  caseAssignments: {
    subscribe: withFilter(
      () => pubsub.asyncIterator(SUBSCRIPTION_CHANNELS.CASE_ASSIGNMENTS),
      (payload, variables) => {
        return payload.caseAssignments.assignee?.id === variables.analystId;
      }
    )
  },

  playbookExecutionUpdates: {
    subscribe: withFilter(
      () => pubsub.asyncIterator(SUBSCRIPTION_CHANNELS.PLAYBOOK_EXECUTION_UPDATES),
      (payload, variables) => {
        return payload.playbookExecutionUpdates.id === variables.executionId;
      }
    )
  },

  playbookApprovalRequests: {
    subscribe: withFilter(
      () => pubsub.asyncIterator(SUBSCRIPTION_CHANNELS.PLAYBOOK_APPROVAL_REQUESTS),
      (payload, variables) => {
        const execution = payload.playbookApprovalRequests;
        const pendingApprovals = execution.stepExecutions.filter(
          step => step.step.requiresApproval && 
                  step.status === 'WAITING_FOR_APPROVAL' &&
                  step.step.approvers.some(approver => approver.id === variables.analystId)
        );
        return pendingApprovals.length > 0;
      }
    )
  },

  newThreatIntelligence: {
    subscribe: withFilter(
      () => pubsub.asyncIterator(SUBSCRIPTION_CHANNELS.NEW_THREAT_INTELLIGENCE),
      (payload, variables) => {
        if (!variables.source) return true;
        return payload.newThreatIntelligence.source.name === variables.source;
      }
    )
  },

  iocUpdates: {
    subscribe: () => pubsub.asyncIterator(SUBSCRIPTION_CHANNELS.IOC_UPDATES)
  },

  systemHealthUpdates: {
    subscribe: () => pubsub.asyncIterator(SUBSCRIPTION_CHANNELS.SYSTEM_HEALTH_UPDATES)
  },

  attackPatternDetections: {
    subscribe: () => pubsub.asyncIterator(SUBSCRIPTION_CHANNELS.ATTACK_PATTERN_DETECTIONS)
  },

  eventCorrelations: {
    subscribe: () => pubsub.asyncIterator(SUBSCRIPTION_CHANNELS.EVENT_CORRELATIONS)
  }
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function buildWhereClause(filter: any): string {
  const conditions = [];

  if (filter.severities) {
    conditions.push(`severity = ANY($${conditions.length + 3})`);
  }
  
  if (filter.sourceIps) {
    conditions.push(`source_ip = ANY($${conditions.length + 3})`);
  }

  if (filter.riskScoreRange) {
    if (filter.riskScoreRange.min !== undefined) {
      conditions.push(`risk_score >= $${conditions.length + 3}`);
    }
    if (filter.riskScoreRange.max !== undefined) {
      conditions.push(`risk_score <= $${conditions.length + 3}`);
    }
  }

  return conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';
}

function transformTimeSeriesData(rows: any[], groupBy?: string[]): any[] {
  if (!groupBy || groupBy.length === 0) {
    return [{
      name: 'Events',
      data: rows.map(row => ({
        timestamp: row.bucket,
        value: parseInt(row.count),
        metadata: {
          avgRiskScore: parseFloat(row.avg_risk_score || 0),
          maxSeverity: parseInt(row.max_severity || 0)
        }
      }))
    }];
  }

  // Group by the specified fields
  const groupedData = rows.reduce((acc, row) => {
    const key = groupBy.map(field => row[field]).join('|');
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push({
      timestamp: row.bucket,
      value: parseInt(row.count),
      metadata: {
        avgRiskScore: parseFloat(row.avg_risk_score || 0),
        maxSeverity: parseInt(row.max_severity || 0)
      }
    });
    return acc;
  }, {});

  return Object.entries(groupedData).map(([name, data]) => ({
    name,
    data
  }));
}

function transformCorrelationGraph(records: any[]): any {
  // Transform Neo4j result records into correlation graph structure
  const centralEvent = records[0]?.get('central');
  const nodes = records[0]?.get('nodes') || [];
  const relationships = records[0]?.get('relationships') || [];

  return {
    centralEvent,
    correlatedEvents: nodes.map(node => ({
      event: node,
      correlationScore: 0.8, // Default score, should come from relationship
      correlationType: 'TEMPORAL',
      distance: 1
    })),
    relationships: relationships.map(rel => ({
      source: rel.start.toString(),
      target: rel.end.toString(),
      relationshipType: rel.type,
      score: rel.properties.score || 0.7,
      evidence: rel.properties.evidence || []
    })),
    metadata: {
      totalEvents: nodes.length + 1,
      maxDepth: 3,
      correlationAlgorithm: 'TEMPORAL_PROXIMITY',
      processingTime: 150
    }
  };
}

function transformAttackPathResult(records: any[]): any {
  // Transform Neo4j attack path analysis results
  const paths = records.map(record => {
    const path = record.get('path');
    const weight = record.get('weight');

    return {
      nodes: path.segments.map(segment => ({
        id: segment.start.identity.toString(),
        type: segment.start.labels[0],
        name: segment.start.properties.name,
        properties: segment.start.properties
      })),
      edges: path.segments.map(segment => ({
        source: segment.start.identity.toString(),
        target: segment.end.identity.toString(),
        relationship: segment.relationship.type,
        properties: segment.relationship.properties
      })),
      length: path.length,
      riskScore: weight
    };
  });

  return {
    paths,
    totalPaths: paths.length,
    shortestPath: paths[0],
    riskScore: paths[0]?.riskScore || 0,
    recommendations: [
      'Implement additional monitoring for identified attack paths',
      'Review access controls for critical systems',
      'Consider network segmentation to limit lateral movement'
    ]
  };
}

function transformEntityGraph(records: any[]): any {
  // Transform Neo4j entity relationship graph results
  const central = records[0]?.get('central');
  const nodes = records[0]?.get('nodes') || [];
  const relationships = records[0]?.get('relationships') || [];

  return {
    centralEntity: {
      id: central.identity.toString(),
      type: central.labels[0],
      name: central.properties.name,
      properties: central.properties
    },
    relatedEntities: nodes.map(node => ({
      id: node.identity.toString(),
      type: node.labels[0],
      name: node.properties.name,
      properties: node.properties
    })),
    relationships: relationships.map(rel => ({
      source: rel.start.identity.toString(),
      target: rel.end.identity.toString(),
      type: rel.type,
      properties: rel.properties
    })),
    depth: 2
  };
}

// =====================================================
// COMBINED RESOLVERS EXPORT
// =====================================================

export const resolvers = {
  Query: queryResolvers,
  Mutation: mutationResolvers,
  Subscription: subscriptionResolvers,
  ...fieldResolvers
};
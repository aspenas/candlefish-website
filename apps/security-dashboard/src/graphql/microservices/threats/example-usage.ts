/**
 * Comprehensive example of the Threat Intelligence GraphQL API usage
 * This file demonstrates how to use all the components together
 */

import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { 
  createThreatIntelligenceSubgraph, 
  startThreatIntelligenceService,
  threatIntelligenceHealthCheck 
} from './federation';
import { ThreatSubscriptionPublisher } from './resolvers/subscriptions';
import { getThreatCache } from './cache/redis-cache';
import { getThreatQueryOptimizer, withPerformanceMonitoring } from './performance/query-optimization';

// Example GraphQL queries that demonstrate the API capabilities
const EXAMPLE_QUERIES = {
  // 1. Basic threat intelligence query with pagination and filtering
  BASIC_THREAT_QUERY: `
    query GetThreats(
      $filter: ThreatIntelligenceFilter
      $first: Int
      $after: String
    ) {
      threatIntelligence(
        filter: $filter
        first: $first
        after: $after
        sort: { field: CREATED_AT, direction: DESC }
      ) {
        edges {
          node {
            id
            title
            description
            threatType
            severity
            confidence
            category
            firstSeen
            lastSeen
            
            # Relationships using DataLoaders
            threatActors {
              id
              name
              sophistication
            }
            
            campaigns {
              id
              name
              status
              isActive
            }
            
            indicators {
              id
              type
              value
              confidence
            }
            
            iocs {
              id
              type
              value
              isActive
            }
            
            mitigations {
              id
              name
              effectiveness
            }
          }
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
        totalCount
        aggregations {
          byThreatType {
            threatType
            count
            percentage
          }
          bySeverity {
            severity
            count
          }
          byConfidence {
            confidence
            count
          }
        }
      }
    }
  `,
  
  // 2. IOC search with enrichment
  IOC_SEARCH_QUERY: `
    query SearchIOCs(
      $query: String!
      $types: [IOCType!]
      $confidence: ThreatConfidence
      $first: Int
    ) {
      searchIOCs(
        query: $query
        types: $types
        confidence: $confidence
        activeOnly: true
        first: $first
      ) {
        iocs {
          edges {
            node {
              id
              type
              value
              confidence
              severity
              isActive
              isWhitelisted
              
              # Enrichment data (cached for 24 hours)
              enrichment {
                asn {
                  number
                  name
                  country
                }
                whoisData {
                  registrar
                  creationDate
                  expirationDate
                }
                reputation {
                  overallScore
                  sources {
                    source
                    score
                    categories
                  }
                }
                malwareAnalysis {
                  detectionRate
                  engines {
                    name
                    detected
                    result
                  }
                }
              }
              
              # Relationships
              threatActors {
                id
                name
              }
              
              sightings {
                source
                timestamp
                confidence
              }
              
              matches {
                asset {
                  id
                  name
                }
                matchType
                confidence
                timestamp
              }
            }
          }
        }
        suggestions
        facets {
          types {
            iocType
            count
          }
          confidence {
            confidence
            count
          }
        }
        totalTime
      }
    }
  `,
  
  // 3. Comprehensive threat analytics query
  THREAT_ANALYTICS_QUERY: `
    query GetThreatAnalytics(
      $organizationId: ID!
      $timeRange: TimeRange!
      $filters: ThreatAnalyticsFilter
    ) {
      threatAnalytics(
        organizationId: $organizationId
        timeRange: $timeRange
        filters: $filters
      ) {
        threatDistribution {
          byType {
            threatType
            count
            percentage
            trend
          }
          bySeverity {
            severity
            count
          }
          evolution {
            timestamp
            threatType
            count
            severity
          }
        }
        
        actorAnalysis {
          topActors {
            actor {
              id
              name
              sophistication
            }
            activityScore
            threatCount
            trend
          }
          activityTrends {
            actor {
              id
              name
            }
            timeline {
              timestamp
              value
            }
          }
        }
        
        campaignAnalysis {
          activeCampaigns
          newCampaigns
          impactAnalysis {
            campaign {
              id
              name
            }
            impact {
              scope
              severity
              financialImpact
            }
            affectedSectors
          }
        }
        
        geographicAnalysis {
          threatsByRegion {
            region
            country
            threatCount
            severityScore
            primaryThreats
          }
          attackOrigins {
            country
            attackCount
            primaryActors {
              id
              name
            }
          }
        }
        
        predictions {
          emergingThreats {
            threatType
            probability
            timeframe
            confidence
          }
          actorBehaviorPredictions {
            actor {
              id
              name
            }
            predictedActivity
            probability
          }
        }
        
        lastUpdated
      }
    }
  `,
  
  // 4. Attribution analysis query
  ATTRIBUTION_ANALYSIS_QUERY: `
    query AnalyzeAttribution(
      $indicators: [String!]!
      $threatTypes: [ThreatType!]
      $confidence: ThreatConfidence
    ) {
      attributionAnalysis(
        indicators: $indicators
        threatTypes: $threatTypes
        confidence: $confidence
      ) {
        threatActor {
          id
          name
          aliases
          actorType
          sophistication
          motivations
          countries
        }
        confidence
        score
        evidence {
          type
          description
          confidence
          source
        }
        reasoning
        alternatives {
          threatActor {
            id
            name
          }
          confidence
          score
          reasoning
        }
      }
    }
  `,
};

// Example mutations demonstrating CRUD operations
const EXAMPLE_MUTATIONS = {
  // 1. Create new threat intelligence
  CREATE_THREAT_INTELLIGENCE: `
    mutation CreateThreatIntelligence($input: CreateThreatIntelligenceInput!) {
      createThreatIntelligence(input: $input) {
        success
        threat {
          id
          title
          threatType
          severity
          confidence
        }
        errors {
          message
          field
          code
        }
        message
      }
    }
  `,
  
  // 2. Bulk import IOCs
  BULK_IMPORT_IOCS: `
    mutation BulkImportIOCs($input: BulkImportIOCsInput!) {
      bulkImportIOCs(input: $input) {
        success
        importedCount
        skippedCount
        errorCount
        errors {
          line
          indicator
          error
        }
        summary {
          totalProcessed
          newIndicators
          updatedIndicators
          duplicates
          byType {
            iocType
            count
          }
        }
        message
      }
    }
  `,
  
  // 3. Create threat feed
  CREATE_THREAT_FEED: `
    mutation CreateThreatFeed($input: CreateThreatFeedInput!) {
      createThreatFeed(input: $input) {
        success
        feed {
          id
          name
          url
          feedType
          format
          status
          isActive
        }
        errors {
          message
          field
        }
        message
      }
    }
  `,
  
  // 4. IOC enrichment
  ENRICH_IOC: `
    query EnrichIOC(
      $value: String!
      $type: IOCType!
      $sources: [String!]
    ) {
      enrichIOC(
        value: $value
        type: $type
        sources: $sources
      ) {
        asn {
          number
          name
          country
        }
        whoisData {
          registrar
          registrant
          creationDate
          expirationDate
        }
        dnsData {
          aRecords
          mxRecords {
            priority
            exchange
          }
        }
        reputation {
          overallScore
          sources {
            source
            score
            categories
            lastUpdated
          }
        }
        malwareAnalysis {
          detectionRate
          engines {
            name
            detected
            result
          }
          behaviors {
            category
            description
            severity
          }
        }
        enrichedAt
        sources
      }
    }
  `,
};

// Example subscriptions for real-time updates
const EXAMPLE_SUBSCRIPTIONS = {
  // 1. Threat intelligence updates
  THREAT_INTELLIGENCE_UPDATES: `
    subscription ThreatIntelligenceUpdates(
      $organizationId: ID!
      $filter: ThreatIntelligenceFilter
    ) {
      threatIntelligenceUpdates(
        organizationId: $organizationId
        filter: $filter
      ) {
        type
        threat {
          id
          title
          threatType
          severity
          confidence
        }
        previousValues
        changedFields
        timestamp
        source
      }
    }
  `,
  
  // 2. IOC match notifications
  IOC_MATCHES: `
    subscription IOCMatches(
      $organizationId: ID!
      $confidence: ThreatConfidence
      $severity: Severity
    ) {
      iocMatches(
        organizationId: $organizationId
        confidence: $confidence
        severity: $severity
      ) {
        ioc {
          id
          type
          value
          confidence
        }
        match {
          asset {
            id
            name
          }
          matchType
          confidence
          timestamp
        }
        alert {
          id
          title
          severity
        }
        priority
        timestamp
      }
    }
  `,
  
  // 3. Threat landscape updates
  THREAT_LANDSCAPE_UPDATES: `
    subscription ThreatLandscapeUpdates(
      $organizationId: ID!
      $sectors: [IndustrySector!]
      $regions: [String!]
    ) {
      threatLandscapeUpdates(
        organizationId: $organizationId
        sectors: $sectors
        regions: $regions
      ) {
        type
        changes {
          summary
          newThreats {
            id
            title
            threatType
          }
          updatedActors {
            id
            name
          }
          emergingTechniques {
            id
            name
          }
        }
        affectedSectors
        affectedRegions
        significance
        timestamp
      }
    }
  `,
};

// Example usage of the API with client code
export class ThreatIntelligenceAPIExample {
  private apolloClient: any; // Apollo Client instance
  
  constructor(apolloClient: any) {
    this.apolloClient = apolloClient;
  }
  
  // Example 1: Fetch recent threats with caching
  async getRecentThreats(organizationId: string) {
    try {
      const { data } = await this.apolloClient.query({
        query: EXAMPLE_QUERIES.BASIC_THREAT_QUERY,
        variables: {
          filter: {
            dateRange: {
              from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
              to: new Date(),
            },
            severities: ['HIGH', 'CRITICAL'],
            isActive: true,
          },
          first: 50,
        },
        // Enable caching
        fetchPolicy: 'cache-first',
        // Set custom error policy
        errorPolicy: 'all',
      });
      
      return {
        threats: data.threatIntelligence.edges.map(edge => edge.node),
        totalCount: data.threatIntelligence.totalCount,
        aggregations: data.threatIntelligence.aggregations,
      };
    } catch (error) {
      console.error('Error fetching recent threats:', error);
      throw error;
    }
  }
  
  // Example 2: Search IOCs with enrichment
  async searchAndEnrichIOCs(query: string, types: string[] = []) {
    try {
      const { data } = await this.apolloClient.query({
        query: EXAMPLE_QUERIES.IOC_SEARCH_QUERY,
        variables: {
          query,
          types: types.length > 0 ? types : undefined,
          confidence: 'MEDIUM',
          first: 25,
        },
      });
      
      const iocs = data.searchIOCs.iocs.edges.map(edge => edge.node);
      
      // Enrich IOCs that don't have enrichment data
      const enrichmentPromises = iocs
        .filter(ioc => !ioc.enrichment)
        .map(async (ioc) => {
          try {
            const enrichmentData = await this.apolloClient.query({
              query: EXAMPLE_MUTATIONS.ENRICH_IOC,
              variables: {
                value: ioc.value,
                type: ioc.type,
                sources: ['virustotal', 'shodan', 'whois'],
              },
            });
            
            return {
              ...ioc,
              enrichment: enrichmentData.data.enrichIOC,
            };
          } catch (error) {
            console.warn(`Failed to enrich IOC ${ioc.id}:`, error);
            return ioc;
          }
        });
      
      const enrichedIOCs = await Promise.allSettled(enrichmentPromises);
      
      return {
        iocs: enrichedIOCs
          .filter(result => result.status === 'fulfilled')
          .map(result => (result as any).value),
        suggestions: data.searchIOCs.suggestions,
        facets: data.searchIOCs.facets,
        totalTime: data.searchIOCs.totalTime,
      };
    } catch (error) {
      console.error('Error searching IOCs:', error);
      throw error;
    }
  }
  
  // Example 3: Get comprehensive threat analytics
  async getThreatAnalytics(organizationId: string, timeRange: any) {
    try {
      const { data } = await this.apolloClient.query({
        query: EXAMPLE_QUERIES.THREAT_ANALYTICS_QUERY,
        variables: {
          organizationId,
          timeRange,
          filters: {
            threatTypes: ['MALWARE', 'APT', 'RANSOMWARE'],
            severityThreshold: 'MEDIUM',
            confidenceThreshold: 'MEDIUM',
          },
        },
        // Cache for 15 minutes
        fetchPolicy: 'cache-first',
      });
      
      return {
        distribution: data.threatAnalytics.threatDistribution,
        actors: data.threatAnalytics.actorAnalysis,
        campaigns: data.threatAnalytics.campaignAnalysis,
        geographic: data.threatAnalytics.geographicAnalysis,
        predictions: data.threatAnalytics.predictions,
      };
    } catch (error) {
      console.error('Error fetching threat analytics:', error);
      throw error;
    }
  }
  
  // Example 4: Attribution analysis
  async analyzeAttribution(indicators: string[]) {
    try {
      const { data } = await this.apolloClient.query({
        query: EXAMPLE_QUERIES.ATTRIBUTION_ANALYSIS_QUERY,
        variables: {
          indicators,
          threatTypes: ['APT', 'MALWARE', 'RANSOMWARE'],
          confidence: 'MEDIUM',
        },
      });
      
      return data.attributionAnalysis;
    } catch (error) {
      console.error('Error analyzing attribution:', error);
      throw error;
    }
  }
  
  // Example 5: Bulk import IOCs
  async bulkImportIOCs(csvData: string, source: string) {
    try {
      const { data } = await this.apolloClient.mutate({
        mutation: EXAMPLE_MUTATIONS.BULK_IMPORT_IOCS,
        variables: {
          input: {
            source,
            format: 'CSV',
            data: csvData,
            defaultConfidence: 'MEDIUM',
            defaultSeverity: 'MEDIUM',
            tags: ['bulk-import', source.toLowerCase()],
            dryRun: false,
          },
        },
      });
      
      return data.bulkImportIOCs;
    } catch (error) {
      console.error('Error bulk importing IOCs:', error);
      throw error;
    }
  }
  
  // Example 6: Set up real-time subscriptions
  setupRealtimeSubscriptions(organizationId: string) {
    // Threat intelligence updates
    const threatUpdatesSubscription = this.apolloClient.subscribe({
      query: EXAMPLE_SUBSCRIPTIONS.THREAT_INTELLIGENCE_UPDATES,
      variables: {
        organizationId,
        filter: {
          severities: ['HIGH', 'CRITICAL'],
        },
      },
    });
    
    threatUpdatesSubscription.subscribe({
      next: ({ data }) => {
        const update = data.threatIntelligenceUpdates;
        console.log('Threat update received:', {
          type: update.type,
          threat: update.threat.title,
          severity: update.threat.severity,
        });
        
        // Handle the update (e.g., show notification, update UI)
        this.handleThreatUpdate(update);
      },
      error: (error) => {
        console.error('Threat updates subscription error:', error);
      },
    });
    
    // IOC match notifications
    const iocMatchesSubscription = this.apolloClient.subscribe({
      query: EXAMPLE_SUBSCRIPTIONS.IOC_MATCHES,
      variables: {
        organizationId,
        confidence: 'MEDIUM',
        severity: 'MEDIUM',
      },
    });
    
    iocMatchesSubscription.subscribe({
      next: ({ data }) => {
        const match = data.iocMatches;
        console.log('IOC match detected:', {
          ioc: `${match.ioc.type}: ${match.ioc.value}`,
          asset: match.match.asset.name,
          confidence: match.match.confidence,
        });
        
        // Handle the match (e.g., create alert, notify security team)
        this.handleIOCMatch(match);
      },
      error: (error) => {
        console.error('IOC matches subscription error:', error);
      },
    });
    
    return {
      threatUpdates: threatUpdatesSubscription,
      iocMatches: iocMatchesSubscription,
    };
  }
  
  private handleThreatUpdate(update: any) {
    // Implementation for handling threat updates
    // This could update a dashboard, send notifications, etc.
  }
  
  private handleIOCMatch(match: any) {
    // Implementation for handling IOC matches
    // This could create alerts, escalate to security team, etc.
  }
}

// Example server startup with all optimizations
export async function startOptimizedThreatIntelligenceService() {
  console.log('Starting Threat Intelligence Service with full optimizations...');
  
  try {
    // Initialize cache
    const cache = getThreatCache();
    const cacheHealthy = await cache.healthCheck();
    
    if (!cacheHealthy) {
      console.warn('Redis cache is not available, continuing without cache');
    } else {
      console.log('✓ Redis cache connected and healthy');
    }
    
    // Initialize query optimizer
    const optimizer = getThreatQueryOptimizer();
    console.log('✓ Query optimizer initialized');
    
    // Start the federated subgraph
    const { server, url } = await startThreatIntelligenceService(4006);
    console.log(`✓ Threat Intelligence Service started at ${url}`);
    
    // Set up health monitoring
    setInterval(async () => {
      const health = await threatIntelligenceHealthCheck();
      if (health.service === 'unhealthy') {
        console.error('Service health check failed:', health);
      }
    }, 30000); // Check every 30 seconds
    
    // Example of publishing real-time updates
    setTimeout(async () => {
      await ThreatSubscriptionPublisher.publishThreatIntelligenceUpdate(
        'example-org-id',
        'CREATED',
        {
          id: 'threat-123',
          title: 'New APT Campaign Detected',
          threatType: 'APT',
          severity: 'HIGH',
          confidence: 'HIGH',
        },
        undefined,
        ['title', 'severity'],
        'automated-detection'
      );
      
      console.log('✓ Example threat update published');
    }, 5000);
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('Received SIGTERM, shutting down gracefully...');
      await cache.cleanup();
      await ThreatSubscriptionPublisher.cleanup();
      process.exit(0);
    });
    
    return { server, url };
  } catch (error) {
    console.error('Failed to start Threat Intelligence Service:', error);
    process.exit(1);
  }
}

// Export example queries for testing and documentation
export {
  EXAMPLE_QUERIES,
  EXAMPLE_MUTATIONS,
  EXAMPLE_SUBSCRIPTIONS,
};

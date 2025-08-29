import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GraphQLSchema, buildSchema, execute, parse } from 'graphql';
import { securityResolvers } from '../example-resolvers';

// Mock database and external services
const mockDatabase = {
  query: vi.fn(),
  transaction: vi.fn(),
};

const mockTimescaleDB = {
  query: vi.fn(),
  insert: vi.fn(),
};

const mockNeo4j = {
  run: vi.fn(),
  close: vi.fn(),
};

const mockKafka = {
  producer: vi.fn(),
  consumer: vi.fn(),
  send: vi.fn(),
};

const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  hget: vi.fn(),
  hset: vi.fn(),
};

// Test schema
const testSchema = buildSchema(`
  type SecurityEvent {
    id: ID!
    timestamp: String!
    type: String!
    severity: Severity!
    source: String!
    destination: String
    description: String!
    mitre_tactics: [String!]!
    mitre_techniques: [String!]!
    metadata: JSON
  }

  type ThreatIntelligence {
    id: ID!
    name: String!
    severity: Severity!
    confidence: Float!
    first_seen: String!
    last_seen: String!
    indicators: [IOC!]!
    mitre_mapping: MitreMapping!
    source: String!
    tags: [String!]!
  }

  type IOC {
    type: IOCType!
    value: String!
    confidence: Float!
  }

  type MitreMapping {
    tactics: [String!]!
    techniques: [String!]!
  }

  type Incident {
    id: ID!
    title: String!
    description: String!
    severity: Severity!
    status: IncidentStatus!
    assignee: String
    created_at: String!
    updated_at: String!
    events: [SecurityEvent!]!
    assets_affected: [String!]!
    tags: [String!]!
  }

  enum Severity {
    LOW
    MEDIUM
    HIGH
    CRITICAL
  }

  enum IOCType {
    IP
    DOMAIN
    HASH
    URL
    EMAIL
  }

  enum IncidentStatus {
    OPEN
    INVESTIGATING
    RESOLVED
    CLOSED
    FALSE_POSITIVE
  }

  scalar JSON

  type Query {
    securityEvents(limit: Int, offset: Int, severity: Severity): [SecurityEvent!]!
    threatIntelligence(limit: Int, offset: Int): [ThreatIntelligence!]!
    incidents(status: IncidentStatus): [Incident!]!
    securityEvent(id: ID!): SecurityEvent
    incident(id: ID!): Incident
    threatMetrics: ThreatMetrics!
    mitreTechniques: [MitreTechnique!]!
  }

  type Mutation {
    createSecurityEvent(input: SecurityEventInput!): SecurityEvent!
    updateIncident(id: ID!, input: IncidentInput!): Incident!
    createIncident(input: IncidentInput!): Incident!
    markThreatFalsePositive(id: ID!, reason: String!): ThreatIntelligence!
  }

  type Subscription {
    securityEventAdded: SecurityEvent!
    threatDetected: ThreatIntelligence!
    incidentUpdated: Incident!
  }

  type ThreatMetrics {
    total_threats: Int!
    active_incidents: Int!
    resolved_today: Int!
    critical_alerts: Int!
    threat_trends: [ThreatTrend!]!
  }

  type ThreatTrend {
    timestamp: String!
    count: Int!
    severity: Severity!
  }

  type MitreTechnique {
    id: String!
    name: String!
    tactic: String!
    description: String!
    platforms: [String!]!
  }

  input SecurityEventInput {
    type: String!
    severity: Severity!
    source: String!
    destination: String
    description: String!
    mitre_tactics: [String!]!
    mitre_techniques: [String!]!
    metadata: JSON
  }

  input IncidentInput {
    title: String!
    description: String!
    severity: Severity!
    assignee: String
    tags: [String!]
    event_ids: [ID!]
  }
`);

// Mock context
const mockContext = {
  db: mockDatabase,
  timescale: mockTimescaleDB,
  neo4j: mockNeo4j,
  kafka: mockKafka,
  redis: mockRedis,
  user: {
    id: 'user-123',
    email: 'analyst@company.com',
    role: 'SECURITY_ANALYST',
    permissions: ['READ_EVENTS', 'WRITE_INCIDENTS'],
  },
  pubsub: {
    publish: vi.fn(),
    subscribe: vi.fn(),
  },
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
};

describe('Security GraphQL Resolvers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Query Resolvers', () => {
    it('fetches security events with filtering', async () => {
      const mockEvents = [
        {
          id: 'evt-1',
          timestamp: '2024-01-15T10:00:00Z',
          type: 'MALWARE_DETECTED',
          severity: 'HIGH',
          source: '192.168.1.100',
          description: 'Malware detected on endpoint',
          mitre_tactics: ['Initial Access'],
          mitre_techniques: ['T1566.001'],
        },
      ];

      mockTimescaleDB.query.mockResolvedValue({ rows: mockEvents });

      const query = `
        query GetSecurityEvents($severity: Severity, $limit: Int) {
          securityEvents(severity: $severity, limit: $limit) {
            id
            type
            severity
            source
            description
            mitre_tactics
          }
        }
      `;

      const result = await execute({
        schema: testSchema,
        document: parse(query),
        rootValue: securityResolvers,
        contextValue: mockContext,
        variableValues: { severity: 'HIGH', limit: 10 },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data?.securityEvents).toHaveLength(1);
      expect(result.data?.securityEvents[0].type).toBe('MALWARE_DETECTED');
      expect(mockTimescaleDB.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE severity = $1'),
        ['HIGH', 10, 0]
      );
    });

    it('fetches threat intelligence data', async () => {
      const mockThreats = [
        {
          id: 'threat-1',
          name: 'APT Campaign',
          severity: 'CRITICAL',
          confidence: 0.95,
          first_seen: '2024-01-10T00:00:00Z',
          last_seen: '2024-01-15T12:00:00Z',
          source: 'Commercial TI',
          tags: ['apt', 'targeted'],
        },
      ];

      mockDatabase.query.mockResolvedValue({ rows: mockThreats });

      const query = `
        query GetThreatIntelligence {
          threatIntelligence {
            id
            name
            severity
            confidence
            source
            tags
          }
        }
      `;

      const result = await execute({
        schema: testSchema,
        document: parse(query),
        rootValue: securityResolvers,
        contextValue: mockContext,
      });

      expect(result.errors).toBeUndefined();
      expect(result.data?.threatIntelligence).toHaveLength(1);
      expect(result.data?.threatIntelligence[0].name).toBe('APT Campaign');
      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM threat_intelligence'),
        expect.any(Array)
      );
    });

    it('fetches incidents by status', async () => {
      const mockIncidents = [
        {
          id: 'inc-1',
          title: 'Security Incident',
          description: 'Unauthorized access detected',
          severity: 'HIGH',
          status: 'INVESTIGATING',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T14:30:00Z',
        },
      ];

      mockDatabase.query.mockResolvedValue({ rows: mockIncidents });

      const query = `
        query GetIncidents($status: IncidentStatus) {
          incidents(status: $status) {
            id
            title
            severity
            status
          }
        }
      `;

      const result = await execute({
        schema: testSchema,
        document: parse(query),
        rootValue: securityResolvers,
        contextValue: mockContext,
        variableValues: { status: 'INVESTIGATING' },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data?.incidents[0].status).toBe('INVESTIGATING');
      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE status = $1'),
        ['INVESTIGATING']
      );
    });

    it('fetches threat metrics and trends', async () => {
      const mockMetrics = {
        total_threats: 1247,
        active_incidents: 23,
        resolved_today: 45,
        critical_alerts: 5,
      };

      const mockTrends = [
        { timestamp: '2024-01-15T00:00:00Z', count: 12, severity: 'HIGH' },
        { timestamp: '2024-01-15T06:00:00Z', count: 8, severity: 'CRITICAL' },
      ];

      mockDatabase.query
        .mockResolvedValueOnce({ rows: [mockMetrics] })
        .mockResolvedValueOnce({ rows: mockTrends });

      const query = `
        query GetThreatMetrics {
          threatMetrics {
            total_threats
            active_incidents
            resolved_today
            critical_alerts
            threat_trends {
              timestamp
              count
              severity
            }
          }
        }
      `;

      const result = await execute({
        schema: testSchema,
        document: parse(query),
        rootValue: securityResolvers,
        contextValue: mockContext,
      });

      expect(result.errors).toBeUndefined();
      expect(result.data?.threatMetrics.total_threats).toBe(1247);
      expect(result.data?.threatMetrics.threat_trends).toHaveLength(2);
    });

    it('fetches MITRE ATT&CK techniques', async () => {
      const mockTechniques = [
        {
          id: 'T1566.001',
          name: 'Spearphishing Attachment',
          tactic: 'Initial Access',
          description: 'Adversaries may send spearphishing emails with a malicious attachment',
          platforms: ['Windows', 'macOS', 'Linux'],
        },
      ];

      mockDatabase.query.mockResolvedValue({ rows: mockTechniques });

      const query = `
        query GetMitreTechniques {
          mitreTechniques {
            id
            name
            tactic
            description
            platforms
          }
        }
      `;

      const result = await execute({
        schema: testSchema,
        document: parse(query),
        rootValue: securityResolvers,
        contextValue: mockContext,
      });

      expect(result.errors).toBeUndefined();
      expect(result.data?.mitreTechniques[0].id).toBe('T1566.001');
      expect(result.data?.mitreTechniques[0].tactic).toBe('Initial Access');
    });
  });

  describe('Mutation Resolvers', () => {
    it('creates new security event', async () => {
      const mockEvent = {
        id: 'evt-new',
        timestamp: '2024-01-15T15:00:00Z',
        type: 'SUSPICIOUS_NETWORK_ACTIVITY',
        severity: 'MEDIUM',
        source: '10.0.0.50',
        description: 'Unusual network traffic pattern detected',
        mitre_tactics: ['Command and Control'],
        mitre_techniques: ['T1071.001'],
      };

      mockTimescaleDB.insert.mockResolvedValue({ rows: [mockEvent] });
      mockKafka.send.mockResolvedValue({ success: true });

      const mutation = `
        mutation CreateSecurityEvent($input: SecurityEventInput!) {
          createSecurityEvent(input: $input) {
            id
            type
            severity
            source
            description
          }
        }
      `;

      const input = {
        type: 'SUSPICIOUS_NETWORK_ACTIVITY',
        severity: 'MEDIUM',
        source: '10.0.0.50',
        description: 'Unusual network traffic pattern detected',
        mitre_tactics: ['Command and Control'],
        mitre_techniques: ['T1071.001'],
      };

      const result = await execute({
        schema: testSchema,
        document: parse(mutation),
        rootValue: securityResolvers,
        contextValue: mockContext,
        variableValues: { input },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data?.createSecurityEvent.type).toBe('SUSPICIOUS_NETWORK_ACTIVITY');
      expect(mockTimescaleDB.insert).toHaveBeenCalled();
      expect(mockKafka.send).toHaveBeenCalledWith(
        expect.objectContaining({
          topic: 'security-events',
          messages: [expect.objectContaining({ value: expect.stringContaining('SUSPICIOUS_NETWORK_ACTIVITY') })],
        })
      );
    });

    it('creates new incident', async () => {
      const mockIncident = {
        id: 'inc-new',
        title: 'New Security Incident',
        description: 'Potential data breach detected',
        severity: 'HIGH',
        status: 'OPEN',
        assignee: 'analyst@company.com',
        created_at: '2024-01-15T15:00:00Z',
        updated_at: '2024-01-15T15:00:00Z',
      };

      mockDatabase.query.mockResolvedValue({ rows: [mockIncident] });

      const mutation = `
        mutation CreateIncident($input: IncidentInput!) {
          createIncident(input: $input) {
            id
            title
            severity
            status
            assignee
          }
        }
      `;

      const input = {
        title: 'New Security Incident',
        description: 'Potential data breach detected',
        severity: 'HIGH',
        assignee: 'analyst@company.com',
        tags: ['data-breach', 'investigation'],
      };

      const result = await execute({
        schema: testSchema,
        document: parse(mutation),
        rootValue: securityResolvers,
        contextValue: mockContext,
        variableValues: { input },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data?.createIncident.title).toBe('New Security Incident');
      expect(result.data?.createIncident.status).toBe('OPEN');
    });

    it('updates incident status and details', async () => {
      const mockUpdatedIncident = {
        id: 'inc-123',
        title: 'Updated Security Incident',
        severity: 'HIGH',
        status: 'RESOLVED',
        assignee: 'senior-analyst@company.com',
        updated_at: '2024-01-15T16:00:00Z',
      };

      mockDatabase.query.mockResolvedValue({ rows: [mockUpdatedIncident] });

      const mutation = `
        mutation UpdateIncident($id: ID!, $input: IncidentInput!) {
          updateIncident(id: $id, input: $input) {
            id
            title
            status
            assignee
          }
        }
      `;

      const result = await execute({
        schema: testSchema,
        document: parse(mutation),
        rootValue: securityResolvers,
        contextValue: mockContext,
        variableValues: {
          id: 'inc-123',
          input: {
            title: 'Updated Security Incident',
            description: 'Updated incident description',
            severity: 'HIGH',
            assignee: 'senior-analyst@company.com',
          },
        },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data?.updateIncident.status).toBe('RESOLVED');
      expect(result.data?.updateIncident.assignee).toBe('senior-analyst@company.com');
    });

    it('marks threat as false positive', async () => {
      const mockUpdatedThreat = {
        id: 'threat-123',
        name: 'False Positive Threat',
        severity: 'LOW',
        confidence: 0.1,
        status: 'FALSE_POSITIVE',
        false_positive_reason: 'Legitimate software behavior',
      };

      mockDatabase.query.mockResolvedValue({ rows: [mockUpdatedThreat] });

      const mutation = `
        mutation MarkFalsePositive($id: ID!, $reason: String!) {
          markThreatFalsePositive(id: $id, reason: $reason) {
            id
            name
            confidence
          }
        }
      `;

      const result = await execute({
        schema: testSchema,
        document: parse(mutation),
        rootValue: securityResolvers,
        contextValue: mockContext,
        variableValues: {
          id: 'threat-123',
          reason: 'Legitimate software behavior',
        },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data?.markThreatFalsePositive.confidence).toBe(0.1);
    });
  });

  describe('Authentication and Authorization', () => {
    it('requires authentication for sensitive operations', async () => {
      const unauthenticatedContext = { ...mockContext, user: null };

      const mutation = `
        mutation CreateIncident($input: IncidentInput!) {
          createIncident(input: $input) {
            id
          }
        }
      `;

      const result = await execute({
        schema: testSchema,
        document: parse(mutation),
        rootValue: securityResolvers,
        contextValue: unauthenticatedContext,
        variableValues: {
          input: {
            title: 'Test Incident',
            description: 'Test Description',
            severity: 'HIGH',
          },
        },
      });

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0].message).toContain('Authentication required');
    });

    it('checks user permissions for write operations', async () => {
      const restrictedContext = {
        ...mockContext,
        user: {
          ...mockContext.user,
          permissions: ['READ_EVENTS'], // No WRITE_INCIDENTS permission
        },
      };

      const mutation = `
        mutation CreateIncident($input: IncidentInput!) {
          createIncident(input: $input) {
            id
          }
        }
      `;

      const result = await execute({
        schema: testSchema,
        document: parse(mutation),
        rootValue: securityResolvers,
        contextValue: restrictedContext,
        variableValues: {
          input: {
            title: 'Test Incident',
            description: 'Test Description',
            severity: 'HIGH',
          },
        },
      });

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0].message).toContain('Insufficient permissions');
    });
  });

  describe('Error Handling', () => {
    it('handles database connection errors gracefully', async () => {
      mockDatabase.query.mockRejectedValue(new Error('Database connection failed'));

      const query = `
        query GetIncidents {
          incidents {
            id
            title
          }
        }
      `;

      const result = await execute({
        schema: testSchema,
        document: parse(query),
        rootValue: securityResolvers,
        contextValue: mockContext,
      });

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0].message).toContain('Database error');
      expect(mockContext.logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Database connection failed')
      );
    });

    it('validates input data for security events', async () => {
      const mutation = `
        mutation CreateSecurityEvent($input: SecurityEventInput!) {
          createSecurityEvent(input: $input) {
            id
          }
        }
      `;

      const invalidInput = {
        type: '', // Invalid empty type
        severity: 'INVALID_SEVERITY',
        source: '999.999.999.999', // Invalid IP
        description: 'Test',
        mitre_tactics: [],
        mitre_techniques: [],
      };

      const result = await execute({
        schema: testSchema,
        document: parse(mutation),
        rootValue: securityResolvers,
        contextValue: mockContext,
        variableValues: { input: invalidInput },
      });

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0].message).toContain('Validation error');
    });
  });

  describe('Performance and Caching', () => {
    it('caches frequently accessed threat intelligence', async () => {
      const cacheKey = 'threat_intel:recent';
      const cachedData = JSON.stringify([{ id: 'cached-threat' }]);

      mockRedis.get.mockResolvedValue(cachedData);

      const query = `
        query GetThreatIntelligence {
          threatIntelligence {
            id
            name
          }
        }
      `;

      const result = await execute({
        schema: testSchema,
        document: parse(query),
        rootValue: securityResolvers,
        contextValue: mockContext,
      });

      expect(mockRedis.get).toHaveBeenCalledWith(cacheKey);
      expect(mockDatabase.query).not.toHaveBeenCalled(); // Should use cached data
      expect(result.data?.threatIntelligence[0].id).toBe('cached-threat');
    });

    it('implements rate limiting for expensive operations', async () => {
      const rateLimitKey = `rate_limit:${mockContext.user.id}:threat_analysis`;
      mockRedis.get.mockResolvedValue('10'); // User has made 10 requests

      const query = `
        query AnalyzeThreats {
          threatMetrics {
            total_threats
          }
        }
      `;

      const result = await execute({
        schema: testSchema,
        document: parse(query),
        rootValue: securityResolvers,
        contextValue: mockContext,
      });

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0].message).toContain('Rate limit exceeded');
    });
  });
});
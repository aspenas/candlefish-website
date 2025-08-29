import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { threatIntelligenceResolvers } from '../threat-intelligence';
import { createMockContext, mockThreatData, mockIOCData, mockThreatActorData } from '../../test/helpers/graphql-test-helpers';
import { ThreatSeverity, IOCType, ThreatActorType } from '../../types';

describe('Threat Intelligence Resolvers', () => {
  let mockContext: any;

  beforeEach(() => {
    mockContext = createMockContext();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Query Resolvers', () => {
    describe('threats', () => {
      it('should fetch all threats with pagination', async () => {
        const mockThreats = [mockThreatData(), mockThreatData()];
        mockContext.dataSources.threatAPI.getThreats.mockResolvedValue({
          data: mockThreats,
          pagination: { page: 1, limit: 10, total: 2 }
        });

        const result = await threatIntelligenceResolvers.Query.threats(
          null,
          { page: 1, limit: 10 },
          mockContext
        );

        expect(result.data).toHaveLength(2);
        expect(result.pagination.total).toBe(2);
        expect(mockContext.dataSources.threatAPI.getThreats).toHaveBeenCalledWith({
          page: 1,
          limit: 10,
          filter: {}
        });
      });

      it('should filter threats by severity', async () => {
        const criticalThreats = [mockThreatData({ severity: ThreatSeverity.CRITICAL })];
        mockContext.dataSources.threatAPI.getThreats.mockResolvedValue({
          data: criticalThreats,
          pagination: { page: 1, limit: 10, total: 1 }
        });

        const result = await threatIntelligenceResolvers.Query.threats(
          null,
          { page: 1, limit: 10, filter: { severity: ThreatSeverity.CRITICAL } },
          mockContext
        );

        expect(result.data[0].severity).toBe(ThreatSeverity.CRITICAL);
        expect(mockContext.dataSources.threatAPI.getThreats).toHaveBeenCalledWith({
          page: 1,
          limit: 10,
          filter: { severity: ThreatSeverity.CRITICAL }
        });
      });

      it('should handle authentication errors', async () => {
        mockContext.user = null;

        await expect(
          threatIntelligenceResolvers.Query.threats(
            null,
            { page: 1, limit: 10 },
            mockContext
          )
        ).rejects.toThrow('Authentication required');
      });

      it('should handle database connection errors', async () => {
        mockContext.dataSources.threatAPI.getThreats.mockRejectedValue(
          new Error('Database connection failed')
        );

        await expect(
          threatIntelligenceResolvers.Query.threats(
            null,
            { page: 1, limit: 10 },
            mockContext
          )
        ).rejects.toThrow('Database connection failed');
      });
    });

    describe('threat', () => {
      it('should fetch a single threat by ID', async () => {
        const threat = mockThreatData();
        mockContext.dataSources.threatAPI.getThreatById.mockResolvedValue(threat);

        const result = await threatIntelligenceResolvers.Query.threat(
          null,
          { id: threat.id },
          mockContext
        );

        expect(result.id).toBe(threat.id);
        expect(mockContext.dataSources.threatAPI.getThreatById).toHaveBeenCalledWith(threat.id);
      });

      it('should return null for non-existent threat', async () => {
        mockContext.dataSources.threatAPI.getThreatById.mockResolvedValue(null);

        const result = await threatIntelligenceResolvers.Query.threat(
          null,
          { id: 'non-existent' },
          mockContext
        );

        expect(result).toBeNull();
      });
    });

    describe('indicatorsOfCompromise', () => {
      it('should fetch IOCs with filtering', async () => {
        const mockIOCs = [
          mockIOCData({ type: IOCType.IP }),
          mockIOCData({ type: IOCType.DOMAIN })
        ];
        mockContext.dataSources.iocAPI.getIOCs.mockResolvedValue({
          data: mockIOCs,
          pagination: { page: 1, limit: 20, total: 2 }
        });

        const result = await threatIntelligenceResolvers.Query.indicatorsOfCompromise(
          null,
          { page: 1, limit: 20, filter: { type: IOCType.IP } },
          mockContext
        );

        expect(result.data).toHaveLength(2);
        expect(mockContext.dataSources.iocAPI.getIOCs).toHaveBeenCalledWith({
          page: 1,
          limit: 20,
          filter: { type: IOCType.IP }
        });
      });
    });

    describe('threatActors', () => {
      it('should fetch threat actors with attribution data', async () => {
        const mockActors = [
          mockThreatActorData({ type: ThreatActorType.APT }),
          mockThreatActorData({ type: ThreatActorType.CYBERCRIMINAL })
        ];
        mockContext.dataSources.threatActorAPI.getThreatActors.mockResolvedValue({
          data: mockActors,
          pagination: { page: 1, limit: 15, total: 2 }
        });

        const result = await threatIntelligenceResolvers.Query.threatActors(
          null,
          { page: 1, limit: 15 },
          mockContext
        );

        expect(result.data).toHaveLength(2);
        expect(result.data[0].attribution).toBeDefined();
      });
    });
  });

  describe('Mutation Resolvers', () => {
    describe('createThreat', () => {
      it('should create a new threat with validation', async () => {
        const threatInput = {
          name: 'New Advanced Persistent Threat',
          description: 'Sophisticated threat targeting financial institutions',
          severity: ThreatSeverity.HIGH,
          confidence: 0.85,
          indicators: [
            { type: IOCType.IP, value: '192.168.1.100', confidence: 0.9 },
            { type: IOCType.DOMAIN, value: 'malicious.example.com', confidence: 0.8 }
          ],
          mitre_tactics: ['Initial Access', 'Persistence'],
          mitre_techniques: ['T1566.001', 'T1547.001']
        };

        const createdThreat = mockThreatData(threatInput);
        mockContext.dataSources.threatAPI.createThreat.mockResolvedValue(createdThreat);

        const result = await threatIntelligenceResolvers.Mutation.createThreat(
          null,
          { input: threatInput },
          mockContext
        );

        expect(result.name).toBe(threatInput.name);
        expect(result.severity).toBe(threatInput.severity);
        expect(mockContext.dataSources.threatAPI.createThreat).toHaveBeenCalledWith(threatInput);
      });

      it('should validate required fields', async () => {
        const incompleteInput = {
          name: 'Incomplete Threat'
          // Missing required fields
        };

        await expect(
          threatIntelligenceResolvers.Mutation.createThreat(
            null,
            { input: incompleteInput },
            mockContext
          )
        ).rejects.toThrow('Validation failed');
      });

      it('should check user permissions for threat creation', async () => {
        mockContext.user.permissions = ['READ_THREATS']; // No WRITE permission

        const threatInput = {
          name: 'Unauthorized Threat',
          description: 'Should not be created',
          severity: ThreatSeverity.MEDIUM,
          confidence: 0.7
        };

        await expect(
          threatIntelligenceResolvers.Mutation.createThreat(
            null,
            { input: threatInput },
            mockContext
          )
        ).rejects.toThrow('Insufficient permissions');
      });
    });

    describe('updateThreat', () => {
      it('should update threat with version control', async () => {
        const threatId = 'threat-123';
        const updateInput = {
          severity: ThreatSeverity.CRITICAL,
          confidence: 0.95,
          version: 2
        };

        const updatedThreat = mockThreatData({ ...updateInput, id: threatId });
        mockContext.dataSources.threatAPI.updateThreat.mockResolvedValue(updatedThreat);

        const result = await threatIntelligenceResolvers.Mutation.updateThreat(
          null,
          { id: threatId, input: updateInput },
          mockContext
        );

        expect(result.severity).toBe(ThreatSeverity.CRITICAL);
        expect(result.confidence).toBe(0.95);
        expect(mockContext.dataSources.threatAPI.updateThreat).toHaveBeenCalledWith(threatId, updateInput);
      });

      it('should handle version conflicts', async () => {
        const threatId = 'threat-123';
        const updateInput = { severity: ThreatSeverity.CRITICAL, version: 1 };

        mockContext.dataSources.threatAPI.updateThreat.mockRejectedValue(
          new Error('Version conflict: threat was updated by another user')
        );

        await expect(
          threatIntelligenceResolvers.Mutation.updateThreat(
            null,
            { id: threatId, input: updateInput },
            mockContext
          )
        ).rejects.toThrow('Version conflict');
      });
    });

    describe('createIOC', () => {
      it('should create new indicator with threat association', async () => {
        const iocInput = {
          type: IOCType.HASH,
          value: 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890',
          confidence: 0.95,
          threat_id: 'threat-456',
          tags: ['malware', 'trojan'],
          description: 'SHA-256 hash of malicious executable'
        };

        const createdIOC = mockIOCData(iocInput);
        mockContext.dataSources.iocAPI.createIOC.mockResolvedValue(createdIOC);

        const result = await threatIntelligenceResolvers.Mutation.createIOC(
          null,
          { input: iocInput },
          mockContext
        );

        expect(result.type).toBe(IOCType.HASH);
        expect(result.confidence).toBe(0.95);
        expect(result.threat_id).toBe('threat-456');
      });

      it('should validate IOC format based on type', async () => {
        const invalidIPInput = {
          type: IOCType.IP,
          value: 'invalid-ip-address',
          confidence: 0.8
        };

        await expect(
          threatIntelligenceResolvers.Mutation.createIOC(
            null,
            { input: invalidIPInput },
            mockContext
          )
        ).rejects.toThrow('Invalid IP address format');
      });
    });
  });

  describe('Subscription Resolvers', () => {
    describe('threatUpdates', () => {
      it('should subscribe to real-time threat updates', async () => {
        const mockPubSub = mockContext.pubsub;
        const subscription = await threatIntelligenceResolvers.Subscription.threatUpdates.subscribe();

        expect(mockPubSub.asyncIterator).toHaveBeenCalledWith('THREAT_UPDATED');
      });

      it('should filter subscription based on severity', async () => {
        const filter = { severity: ThreatSeverity.CRITICAL };
        const subscription = await threatIntelligenceResolvers.Subscription.threatUpdates.subscribe(
          null,
          { filter },
          mockContext
        );

        expect(mockContext.pubsub.asyncIterator).toHaveBeenCalledWith(['THREAT_UPDATED']);
      });
    });

    describe('iocUpdates', () => {
      it('should subscribe to IOC updates with type filtering', async () => {
        const filter = { type: IOCType.IP };
        const subscription = await threatIntelligenceResolvers.Subscription.iocUpdates.subscribe(
          null,
          { filter },
          mockContext
        );

        expect(mockContext.pubsub.asyncIterator).toHaveBeenCalledWith('IOC_UPDATED');
      });
    });
  });

  describe('Type Resolvers', () => {
    describe('Threat', () => {
      it('should resolve threat indicators', async () => {
        const threat = mockThreatData();
        const mockIndicators = [
          mockIOCData({ threat_id: threat.id }),
          mockIOCData({ threat_id: threat.id })
        ];

        mockContext.dataSources.iocAPI.getIOCsByThreatId.mockResolvedValue(mockIndicators);

        const result = await threatIntelligenceResolvers.Threat.indicators(
          threat,
          {},
          mockContext
        );

        expect(result).toHaveLength(2);
        expect(mockContext.dataSources.iocAPI.getIOCsByThreatId).toHaveBeenCalledWith(threat.id);
      });

      it('should resolve associated threat actors', async () => {
        const threat = mockThreatData();
        const mockActors = [mockThreatActorData()];

        mockContext.dataSources.threatActorAPI.getActorsByThreatId.mockResolvedValue(mockActors);

        const result = await threatIntelligenceResolvers.Threat.associated_actors(
          threat,
          {},
          mockContext
        );

        expect(result).toHaveLength(1);
        expect(mockContext.dataSources.threatActorAPI.getActorsByThreatId).toHaveBeenCalledWith(threat.id);
      });

      it('should calculate risk score dynamically', async () => {
        const threat = mockThreatData({
          severity: ThreatSeverity.HIGH,
          confidence: 0.9
        });

        const result = await threatIntelligenceResolvers.Threat.risk_score(
          threat,
          {},
          mockContext
        );

        // Risk score should be calculated based on severity and confidence
        expect(result).toBeGreaterThan(0);
        expect(result).toBeLessThanOrEqual(100);
      });
    });

    describe('IOC', () => {
      it('should resolve associated threat', async () => {
        const ioc = mockIOCData({ threat_id: 'threat-123' });
        const associatedThreat = mockThreatData({ id: 'threat-123' });

        mockContext.dataSources.threatAPI.getThreatById.mockResolvedValue(associatedThreat);

        const result = await threatIntelligenceResolvers.IOC.threat(
          ioc,
          {},
          mockContext
        );

        expect(result.id).toBe('threat-123');
        expect(mockContext.dataSources.threatAPI.getThreatById).toHaveBeenCalledWith('threat-123');
      });

      it('should validate IOC value format', async () => {
        const ioc = mockIOCData({ type: IOCType.EMAIL, value: 'test@example.com' });

        const isValid = await threatIntelligenceResolvers.IOC.is_valid(
          ioc,
          {},
          mockContext
        );

        expect(isValid).toBe(true);
      });
    });
  });

  describe('Dataloader Integration', () => {
    it('should use dataloaders to prevent N+1 queries', async () => {
      const threats = [mockThreatData(), mockThreatData(), mockThreatData()];
      
      // Mock the dataloader
      mockContext.dataloaders.threatIndicators.loadMany.mockResolvedValue([
        [mockIOCData()],
        [mockIOCData(), mockIOCData()],
        []
      ]);

      const results = await Promise.all(
        threats.map(threat => 
          threatIntelligenceResolvers.Threat.indicators(threat, {}, mockContext)
        )
      );

      // Should batch load all indicators in one call
      expect(mockContext.dataloaders.threatIndicators.loadMany).toHaveBeenCalledTimes(1);
      expect(results[0]).toHaveLength(1);
      expect(results[1]).toHaveLength(2);
      expect(results[2]).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle and format GraphQL errors properly', async () => {
      mockContext.dataSources.threatAPI.getThreats.mockRejectedValue(
        new Error('Internal server error')
      );

      await expect(
        threatIntelligenceResolvers.Query.threats(
          null,
          { page: 1, limit: 10 },
          mockContext
        )
      ).rejects.toThrow('Internal server error');
    });

    it('should sanitize error messages for production', async () => {
      process.env.NODE_ENV = 'production';
      
      mockContext.dataSources.threatAPI.getThreats.mockRejectedValue(
        new Error('Database password is incorrect')
      );

      await expect(
        threatIntelligenceResolvers.Query.threats(
          null,
          { page: 1, limit: 10 },
          mockContext
        )
      ).rejects.toThrow('An internal error occurred');

      process.env.NODE_ENV = 'test';
    });
  });

  describe('Performance Optimizations', () => {
    it('should implement query complexity analysis', async () => {
      const complexQuery = {
        page: 1,
        limit: 1000, // Large limit
        include_indicators: true,
        include_actors: true,
        include_campaigns: true
      };

      mockContext.queryComplexity = 1500; // Exceeds limit

      await expect(
        threatIntelligenceResolvers.Query.threats(
          null,
          complexQuery,
          mockContext
        )
      ).rejects.toThrow('Query complexity exceeds maximum allowed');
    });

    it('should implement caching for expensive operations', async () => {
      const threat = mockThreatData();
      
      mockContext.cache.get.mockResolvedValue(null);
      mockContext.dataSources.threatAPI.calculateRiskScore.mockResolvedValue(85);

      const result1 = await threatIntelligenceResolvers.Threat.risk_score(
        threat,
        {},
        mockContext
      );
      
      const result2 = await threatIntelligenceResolvers.Threat.risk_score(
        threat,
        {},
        mockContext
      );

      expect(result1).toBe(85);
      expect(result2).toBe(85);
      
      // Should cache the result after first calculation
      expect(mockContext.cache.set).toHaveBeenCalledWith(
        `risk_score:${threat.id}`,
        85,
        { ttl: 300 } // 5 minutes
      );
    });
  });
});
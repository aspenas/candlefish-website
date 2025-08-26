import { graphql, buildSchema } from 'graphql';
import { createMockContext, MockContext } from '../../utils/graphql-test-utils';
import { securityDashboardResolvers } from '../../../graphql/resolvers/security-dashboard-resolvers';
import { ThreatLevel, AssetType, Environment, Platform } from '../../../graphql/types/security';

// Mock the schema for testing
const typeDefs = `
  type Query {
    securityOverview(organizationId: ID!): SecurityOverview!
    assets(organizationId: ID!, filter: AssetFilter): [Asset!]!
    asset(id: ID!): Asset
    vulnerabilities(assetId: ID!): [Vulnerability!]!
  }

  type Mutation {
    createAsset(organizationId: ID!, input: CreateAssetInput!): Asset!
    createVulnerability(input: CreateVulnerabilityInput!): Vulnerability!
  }

  type Subscription {
    securityEventAdded(organizationId: ID!): SecurityEvent!
    kongAdminApiStatusChanged: KongAdminApiStatus!
  }

  type SecurityOverview {
    totalAssets: Int!
    criticalVulnerabilities: Int!
    activeAlerts: Int!
    complianceScore: Float!
    threatLevel: ThreatLevel!
  }

  type Asset {
    id: ID!
    organizationId: ID!
    name: String!
    assetType: AssetType!
    environment: Environment!
    platform: Platform!
    vulnerabilities: [Vulnerability!]!
    securityEvents(limit: Int): [SecurityEvent!]!
    createdAt: String!
    updatedAt: String!
  }

  type Vulnerability {
    id: ID!
    assetId: ID!
    title: String!
    description: String!
    severity: ThreatLevel!
    status: String!
    detectedAt: String!
  }

  type SecurityEvent {
    id: ID!
    assetId: ID!
    organizationId: ID!
    eventType: String!
    severity: ThreatLevel!
    title: String!
    description: String!
    createdAt: String!
  }

  type KongAdminApiStatus {
    isSecure: Boolean!
    protocol: String!
    isVulnerable: Boolean!
    riskLevel: ThreatLevel!
    recommendedActions: [String!]!
    lastChecked: String!
  }

  input AssetFilter {
    assetType: AssetType
    environment: Environment
    platform: Platform
  }

  input CreateAssetInput {
    name: String!
    assetType: AssetType!
    environment: Environment!
    platform: Platform!
    url: String
    description: String
  }

  input CreateVulnerabilityInput {
    assetId: ID!
    title: String!
    description: String!
    severity: ThreatLevel!
    cveId: String
  }

  enum ThreatLevel {
    LOW
    MEDIUM
    HIGH
    CRITICAL
  }

  enum AssetType {
    APPLICATION
    DATABASE
    API
    WEBSITE
  }

  enum Environment {
    DEVELOPMENT
    STAGING
    PRODUCTION
  }

  enum Platform {
    KUBERNETES
    AWS
    GCP
    AZURE
    ON_PREMISE
  }
`;

const schema = buildSchema(typeDefs);
const rootValue = securityDashboardResolvers;

describe('Security Dashboard GraphQL Resolvers', () => {
  let mockContext: MockContext;

  beforeEach(() => {
    mockContext = createMockContext();
  });

  describe('Query Resolvers', () => {
    describe('securityOverview', () => {
      it('should return security overview for organization', async () => {
        const organizationId = 'org-123';

        // Mock service responses
        mockContext.securityService.getSecurityOverview.mockResolvedValue({
          totalAssets: 5,
          criticalVulnerabilities: 2,
          activeAlerts: 3,
          complianceScore: 75.5,
          threatLevel: ThreatLevel.HIGH,
          vulnerabilitiesBySeverity: [
            { severity: ThreatLevel.CRITICAL, count: 2 },
            { severity: ThreatLevel.HIGH, count: 1 },
          ],
        });

        const query = `
          query SecurityOverview($organizationId: ID!) {
            securityOverview(organizationId: $organizationId) {
              totalAssets
              criticalVulnerabilities
              activeAlerts
              complianceScore
              threatLevel
            }
          }
        `;

        const result = await graphql({
          schema,
          source: query,
          rootValue,
          contextValue: mockContext,
          variableValues: { organizationId },
        });

        expect(result.errors).toBeUndefined();
        expect(result.data).toBeDefined();
        expect(result.data!.securityOverview).toEqual({
          totalAssets: 5,
          criticalVulnerabilities: 2,
          activeAlerts: 3,
          complianceScore: 75.5,
          threatLevel: 'HIGH',
        });

        expect(mockContext.securityService.getSecurityOverview).toHaveBeenCalledWith(
          organizationId
        );
      });

      it('should handle service errors gracefully', async () => {
        const organizationId = 'org-123';

        mockContext.securityService.getSecurityOverview.mockRejectedValue(
          new Error('Database connection failed')
        );

        const query = `
          query SecurityOverview($organizationId: ID!) {
            securityOverview(organizationId: $organizationId) {
              totalAssets
            }
          }
        `;

        const result = await graphql({
          schema,
          source: query,
          rootValue,
          contextValue: mockContext,
          variableValues: { organizationId },
        });

        expect(result.errors).toBeDefined();
        expect(result.errors![0].message).toContain('Database connection failed');
      });
    });

    describe('assets', () => {
      it('should return filtered assets', async () => {
        const organizationId = 'org-123';
        const mockAssets = [
          {
            id: 'asset-1',
            organizationId,
            name: 'Web App',
            assetType: AssetType.APPLICATION,
            environment: Environment.PRODUCTION,
            platform: Platform.KUBERNETES,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
          {
            id: 'asset-2',
            organizationId,
            name: 'API Gateway',
            assetType: AssetType.API,
            environment: Environment.PRODUCTION,
            platform: Platform.AWS,
            createdAt: '2024-01-02T00:00:00Z',
            updatedAt: '2024-01-02T00:00:00Z',
          },
        ];

        mockContext.securityService.getAssets.mockResolvedValue(mockAssets);

        const query = `
          query Assets($organizationId: ID!, $filter: AssetFilter) {
            assets(organizationId: $organizationId, filter: $filter) {
              id
              name
              assetType
              environment
              platform
            }
          }
        `;

        const filter = { environment: Environment.PRODUCTION };
        const result = await graphql({
          schema,
          source: query,
          rootValue,
          contextValue: mockContext,
          variableValues: { organizationId, filter },
        });

        expect(result.errors).toBeUndefined();
        expect(result.data!.assets).toHaveLength(2);
        expect(result.data!.assets[0]).toEqual({
          id: 'asset-1',
          name: 'Web App',
          assetType: 'APPLICATION',
          environment: 'PRODUCTION',
          platform: 'KUBERNETES',
        });

        expect(mockContext.securityService.getAssets).toHaveBeenCalledWith(
          organizationId,
          filter
        );
      });

      it('should return empty array when no assets found', async () => {
        const organizationId = 'org-123';

        mockContext.securityService.getAssets.mockResolvedValue([]);

        const query = `
          query Assets($organizationId: ID!) {
            assets(organizationId: $organizationId) {
              id
              name
            }
          }
        `;

        const result = await graphql({
          schema,
          source: query,
          rootValue,
          contextValue: mockContext,
          variableValues: { organizationId },
        });

        expect(result.errors).toBeUndefined();
        expect(result.data!.assets).toEqual([]);
      });
    });

    describe('asset', () => {
      it('should return single asset by ID', async () => {
        const assetId = 'asset-123';
        const mockAsset = {
          id: assetId,
          organizationId: 'org-123',
          name: 'Test Asset',
          assetType: AssetType.APPLICATION,
          environment: Environment.PRODUCTION,
          platform: Platform.KUBERNETES,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        };

        mockContext.securityService.getAssetById.mockResolvedValue(mockAsset);

        const query = `
          query Asset($id: ID!) {
            asset(id: $id) {
              id
              name
              assetType
            }
          }
        `;

        const result = await graphql({
          schema,
          source: query,
          rootValue,
          contextValue: mockContext,
          variableValues: { id: assetId },
        });

        expect(result.errors).toBeUndefined();
        expect(result.data!.asset).toEqual({
          id: assetId,
          name: 'Test Asset',
          assetType: 'APPLICATION',
        });
      });

      it('should return null when asset not found', async () => {
        const assetId = 'non-existent';

        mockContext.securityService.getAssetById.mockResolvedValue(null);

        const query = `
          query Asset($id: ID!) {
            asset(id: $id) {
              id
              name
            }
          }
        `;

        const result = await graphql({
          schema,
          source: query,
          rootValue,
          contextValue: mockContext,
          variableValues: { id: assetId },
        });

        expect(result.errors).toBeUndefined();
        expect(result.data!.asset).toBeNull();
      });
    });
  });

  describe('Mutation Resolvers', () => {
    describe('createAsset', () => {
      it('should create new asset successfully', async () => {
        const organizationId = 'org-123';
        const input = {
          name: 'New Web App',
          assetType: AssetType.APPLICATION,
          environment: Environment.PRODUCTION,
          platform: Platform.KUBERNETES,
          url: 'https://app.example.com',
          description: 'Main web application',
        };

        const expectedAsset = {
          id: 'asset-new',
          organizationId,
          ...input,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        };

        mockContext.securityService.createAsset.mockResolvedValue(expectedAsset);

        const mutation = `
          mutation CreateAsset($organizationId: ID!, $input: CreateAssetInput!) {
            createAsset(organizationId: $organizationId, input: $input) {
              id
              name
              assetType
              environment
              platform
              url
              description
            }
          }
        `;

        const result = await graphql({
          schema,
          source: mutation,
          rootValue,
          contextValue: mockContext,
          variableValues: { organizationId, input },
        });

        expect(result.errors).toBeUndefined();
        expect(result.data!.createAsset).toEqual({
          id: 'asset-new',
          name: 'New Web App',
          assetType: 'APPLICATION',
          environment: 'PRODUCTION',
          platform: 'KUBERNETES',
          url: 'https://app.example.com',
          description: 'Main web application',
        });

        expect(mockContext.securityService.createAsset).toHaveBeenCalledWith(
          organizationId,
          input
        );
      });

      it('should handle validation errors', async () => {
        const organizationId = 'org-123';
        const input = {
          name: '', // Invalid: empty name
          assetType: AssetType.APPLICATION,
          environment: Environment.PRODUCTION,
          platform: Platform.KUBERNETES,
        };

        mockContext.securityService.createAsset.mockRejectedValue(
          new Error('Asset name is required')
        );

        const mutation = `
          mutation CreateAsset($organizationId: ID!, $input: CreateAssetInput!) {
            createAsset(organizationId: $organizationId, input: $input) {
              id
              name
            }
          }
        `;

        const result = await graphql({
          schema,
          source: mutation,
          rootValue,
          contextValue: mockContext,
          variableValues: { organizationId, input },
        });

        expect(result.errors).toBeDefined();
        expect(result.errors![0].message).toContain('Asset name is required');
      });
    });

    describe('createVulnerability', () => {
      it('should create new vulnerability successfully', async () => {
        const input = {
          assetId: 'asset-123',
          title: 'SQL Injection Vulnerability',
          description: 'Critical SQL injection in user input validation',
          severity: ThreatLevel.CRITICAL,
          cveId: 'CVE-2024-12345',
        };

        const expectedVulnerability = {
          id: 'vuln-new',
          ...input,
          status: 'OPEN',
          detectedAt: '2024-01-01T00:00:00Z',
        };

        mockContext.securityService.createVulnerability.mockResolvedValue(expectedVulnerability);

        const mutation = `
          mutation CreateVulnerability($input: CreateVulnerabilityInput!) {
            createVulnerability(input: $input) {
              id
              title
              severity
              status
            }
          }
        `;

        const result = await graphql({
          schema,
          source: mutation,
          rootValue,
          contextValue: mockContext,
          variableValues: { input },
        });

        expect(result.errors).toBeUndefined();
        expect(result.data!.createVulnerability).toEqual({
          id: 'vuln-new',
          title: 'SQL Injection Vulnerability',
          severity: 'CRITICAL',
          status: 'OPEN',
        });
      });
    });
  });

  describe('Field Resolvers', () => {
    describe('Asset.vulnerabilities', () => {
      it('should resolve vulnerabilities for asset using DataLoader', async () => {
        const assetId = 'asset-123';
        const mockVulnerabilities = [
          {
            id: 'vuln-1',
            assetId,
            title: 'Test Vulnerability',
            severity: ThreatLevel.HIGH,
            status: 'OPEN',
          },
        ];

        mockContext.dataloaders.assetVulnerabilities.load.mockResolvedValue(mockVulnerabilities);

        const query = `
          query Asset($id: ID!) {
            asset(id: $id) {
              id
              vulnerabilities {
                id
                title
                severity
              }
            }
          }
        `;

        // Mock asset resolver to return basic asset
        mockContext.securityService.getAssetById.mockResolvedValue({
          id: assetId,
          name: 'Test Asset',
          organizationId: 'org-123',
          assetType: AssetType.APPLICATION,
          environment: Environment.PRODUCTION,
          platform: Platform.KUBERNETES,
        });

        const result = await graphql({
          schema,
          source: query,
          rootValue,
          contextValue: mockContext,
          variableValues: { id: assetId },
        });

        expect(result.errors).toBeUndefined();
        expect(result.data!.asset.vulnerabilities).toEqual([
          {
            id: 'vuln-1',
            title: 'Test Vulnerability',
            severity: 'HIGH',
          },
        ]);

        expect(mockContext.dataloaders.assetVulnerabilities.load).toHaveBeenCalledWith(assetId);
      });
    });

    describe('Asset.securityEvents', () => {
      it('should resolve security events with limit', async () => {
        const assetId = 'asset-123';
        const limit = 5;
        const mockEvents = [
          {
            id: 'event-1',
            assetId,
            title: 'Suspicious Activity',
            severity: ThreatLevel.MEDIUM,
            eventType: 'LOGIN_ATTEMPT',
          },
        ];

        mockContext.dataloaders.assetSecurityEvents.load.mockResolvedValue(mockEvents);

        const query = `
          query Asset($id: ID!) {
            asset(id: $id) {
              id
              securityEvents(limit: 5) {
                id
                title
                severity
                eventType
              }
            }
          }
        `;

        // Mock asset resolver
        mockContext.securityService.getAssetById.mockResolvedValue({
          id: assetId,
          name: 'Test Asset',
          organizationId: 'org-123',
          assetType: AssetType.APPLICATION,
          environment: Environment.PRODUCTION,
          platform: Platform.KUBERNETES,
        });

        const result = await graphql({
          schema,
          source: query,
          rootValue,
          contextValue: mockContext,
          variableValues: { id: assetId },
        });

        expect(result.errors).toBeUndefined();
        expect(result.data!.asset.securityEvents).toEqual([
          {
            id: 'event-1',
            title: 'Suspicious Activity',
            severity: 'MEDIUM',
            eventType: 'LOGIN_ATTEMPT',
          },
        ]);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle rate limiting errors', async () => {
      mockContext.securityService.getSecurityOverview.mockRejectedValue(
        new Error('Rate limit exceeded')
      );

      const query = `
        query SecurityOverview($organizationId: ID!) {
          securityOverview(organizationId: $organizationId) {
            totalAssets
          }
        }
      `;

      const result = await graphql({
        schema,
        source: query,
        rootValue,
        contextValue: mockContext,
        variableValues: { organizationId: 'org-123' },
      });

      expect(result.errors).toBeDefined();
      expect(result.errors![0].message).toContain('Rate limit exceeded');
    });

    it('should handle authorization errors', async () => {
      mockContext.user = null; // No authenticated user

      const query = `
        query SecurityOverview($organizationId: ID!) {
          securityOverview(organizationId: $organizationId) {
            totalAssets
          }
        }
      `;

      const result = await graphql({
        schema,
        source: query,
        rootValue,
        contextValue: mockContext,
        variableValues: { organizationId: 'org-123' },
      });

      expect(result.errors).toBeDefined();
      expect(result.errors![0].message).toContain('Authentication required');
    });
  });

  describe('Performance Tests', () => {
    it('should handle large datasets efficiently', async () => {
      const organizationId = 'org-123';
      const largeAssetList = Array.from({ length: 1000 }, (_, i) => ({
        id: `asset-${i}`,
        organizationId,
        name: `Asset ${i}`,
        assetType: AssetType.APPLICATION,
        environment: Environment.PRODUCTION,
        platform: Platform.KUBERNETES,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }));

      mockContext.securityService.getAssets.mockResolvedValue(largeAssetList);

      const query = `
        query Assets($organizationId: ID!) {
          assets(organizationId: $organizationId) {
            id
            name
          }
        }
      `;

      const startTime = Date.now();
      const result = await graphql({
        schema,
        source: query,
        rootValue,
        contextValue: mockContext,
        variableValues: { organizationId },
      });
      const duration = Date.now() - startTime;

      expect(result.errors).toBeUndefined();
      expect(result.data!.assets).toHaveLength(1000);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});

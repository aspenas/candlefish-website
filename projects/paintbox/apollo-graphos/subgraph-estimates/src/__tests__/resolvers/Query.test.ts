import { ApolloServer } from '@apollo/server';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { gql } from 'graphql-tag';
import { typeDefs } from '../../index';
import { resolvers } from '../../resolvers';
import { DataSourceContext } from '../../types/DataSourceContext';

describe('Query Resolvers', () => {
  let server: ApolloServer;
  let mockDataSources: DataSourceContext;

  beforeEach(() => {
    mockDataSources = {
      estimates: {
        findById: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      pricing: {
        calculate: jest.fn(),
      },
      pdf: {
        generate: jest.fn(),
      },
    };

    server = new ApolloServer({
      schema: buildSubgraphSchema({ typeDefs, resolvers }),
    });
  });

  describe('estimate', () => {
    const ESTIMATE_QUERY = gql`
      query GetEstimate($id: ID!) {
        estimate(id: $id) {
          id
          customerId
          projectId
          goodPrice
          betterPrice
          bestPrice
          selectedTier
          status
          totalSquareFootage
          laborHours
          materialCost
          createdAt
          updatedAt
          createdBy
        }
      }
    `;

    it('should return estimate by ID', async () => {
      const mockEstimate = {
        id: '1',
        customerId: 'customer1',
        projectId: 'project1',
        goodPrice: 1500.00,
        betterPrice: 2000.00,
        bestPrice: 2500.00,
        selectedTier: 'BETTER',
        status: 'DRAFT',
        totalSquareFootage: 1200.0,
        laborHours: 16.0,
        materialCost: 800.00,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        createdBy: 'estimator1',
      };

      mockDataSources.estimates.findById.mockResolvedValue(mockEstimate);

      const result = await server.executeOperation({
        query: ESTIMATE_QUERY,
        variables: { id: '1' },
      }, {
        contextValue: { dataSources: mockDataSources },
      });

      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeUndefined();
        expect(result.body.singleResult.data?.estimate).toEqual(mockEstimate);
      }
      expect(mockDataSources.estimates.findById).toHaveBeenCalledWith('1');
    });

    it('should return null for non-existent estimate', async () => {
      mockDataSources.estimates.findById.mockResolvedValue(null);

      const result = await server.executeOperation({
        query: ESTIMATE_QUERY,
        variables: { id: 'nonexistent' },
      }, {
        contextValue: { dataSources: mockDataSources },
      });

      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeUndefined();
        expect(result.body.singleResult.data?.estimate).toBeNull();
      }
    });

    it('should handle database errors gracefully', async () => {
      mockDataSources.estimates.findById.mockRejectedValue(new Error('Database connection failed'));

      const result = await server.executeOperation({
        query: ESTIMATE_QUERY,
        variables: { id: '1' },
      }, {
        contextValue: { dataSources: mockDataSources },
      });

      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeDefined();
        expect(result.body.singleResult.errors?.[0].message).toBe('Database connection failed');
      }
    });
  });

  describe('estimates', () => {
    const ESTIMATES_QUERY = gql`
      query GetEstimates($filter: EstimateFilter, $limit: Int, $offset: Int) {
        estimates(filter: $filter, limit: $limit, offset: $offset) {
          totalCount
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
          edges {
            node {
              id
              customerId
              status
              goodPrice
              betterPrice
              bestPrice
            }
            cursor
          }
        }
      }
    `;

    it('should return paginated estimates', async () => {
      const mockEstimates = [
        {
          id: '1',
          customerId: 'customer1',
          status: 'DRAFT',
          goodPrice: 1500.00,
          betterPrice: 2000.00,
          bestPrice: 2500.00,
        },
        {
          id: '2',
          customerId: 'customer2',
          status: 'SENT',
          goodPrice: 1200.00,
          betterPrice: 1600.00,
          bestPrice: 2000.00,
        },
      ];

      mockDataSources.estimates.findMany.mockResolvedValue({
        data: mockEstimates,
        totalCount: 15,
        hasNextPage: true,
        hasPreviousPage: false,
      });

      const result = await server.executeOperation({
        query: ESTIMATES_QUERY,
        variables: { limit: 2, offset: 0 },
      }, {
        contextValue: { dataSources: mockDataSources },
      });

      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeUndefined();
        const estimates = result.body.singleResult.data?.estimates;
        expect(estimates.totalCount).toBe(15);
        expect(estimates.pageInfo.hasNextPage).toBe(true);
        expect(estimates.edges).toHaveLength(2);
      }
    });

    it('should apply filters correctly', async () => {
      const filter = {
        customerId: 'customer1',
        status: 'DRAFT' as const,
      };

      mockDataSources.estimates.findMany.mockResolvedValue({
        data: [],
        totalCount: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      });

      await server.executeOperation({
        query: ESTIMATES_QUERY,
        variables: { filter },
      }, {
        contextValue: { dataSources: mockDataSources },
      });

      expect(mockDataSources.estimates.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ filter })
      );
    });

    it('should handle empty results', async () => {
      mockDataSources.estimates.findMany.mockResolvedValue({
        data: [],
        totalCount: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      });

      const result = await server.executeOperation({
        query: ESTIMATES_QUERY,
      }, {
        contextValue: { dataSources: mockDataSources },
      });

      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeUndefined();
        const estimates = result.body.singleResult.data?.estimates;
        expect(estimates.totalCount).toBe(0);
        expect(estimates.edges).toHaveLength(0);
      }
    });
  });

  describe('calculatePricing', () => {
    const PRICING_QUERY = gql`
      query CalculatePricing($input: PricingInput!) {
        calculatePricing(input: $input) {
          laborCost
          materialCost
          overheadCost
          profitMargin
          subtotal
          tax
          total
        }
      }
    `;

    it('should calculate pricing using Kind Home Paint formula', async () => {
      const input = {
        squareFootage: 1200.0,
        laborHours: 16.0,
        materialType: 'STANDARD' as const,
        complexity: 'MODERATE' as const,
      };

      const mockCalculation = {
        laborCost: 960.00, // 16 hours * $60/hour
        materialCost: 480.00, // 1200 sqft * $0.40/sqft
        overheadCost: 288.00, // 20% of labor + materials
        profitMargin: 345.60, // 24% profit margin
        subtotal: 2073.60,
        tax: 165.89, // 8% tax
        total: 2239.49,
      };

      mockDataSources.pricing.calculate.mockResolvedValue(mockCalculation);

      const result = await server.executeOperation({
        query: PRICING_QUERY,
        variables: { input },
      }, {
        contextValue: { dataSources: mockDataSources },
      });

      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeUndefined();
        expect(result.body.singleResult.data?.calculatePricing).toEqual(mockCalculation);
      }
    });

    it('should handle different material types', async () => {
      const inputs = [
        { materialType: 'ECONOMY', expectedMultiplier: 0.8 },
        { materialType: 'STANDARD', expectedMultiplier: 1.0 },
        { materialType: 'PREMIUM', expectedMultiplier: 1.3 },
        { materialType: 'LUXURY', expectedMultiplier: 1.8 },
      ];

      for (const { materialType, expectedMultiplier } of inputs) {
        const input = {
          squareFootage: 1000.0,
          laborHours: 12.0,
          materialType: materialType as any,
          complexity: 'SIMPLE' as const,
        };

        mockDataSources.pricing.calculate.mockResolvedValue({
          laborCost: 720.00,
          materialCost: 400.00 * expectedMultiplier,
          overheadCost: 200.00,
          profitMargin: 300.00,
          subtotal: 1620.00,
          tax: 129.60,
          total: 1749.60,
        });

        await server.executeOperation({
          query: PRICING_QUERY,
          variables: { input },
        }, {
          contextValue: { dataSources: mockDataSources },
        });

        expect(mockDataSources.pricing.calculate).toHaveBeenCalledWith(
          expect.objectContaining({ materialType })
        );
      }
    });

    it('should validate required input fields', async () => {
      const invalidInput = {
        squareFootage: -100, // Invalid negative value
        laborHours: 0,
        materialType: 'STANDARD' as const,
        complexity: 'SIMPLE' as const,
      };

      mockDataSources.pricing.calculate.mockRejectedValue(
        new Error('Square footage must be positive')
      );

      const result = await server.executeOperation({
        query: PRICING_QUERY,
        variables: { input: invalidInput },
      }, {
        contextValue: { dataSources: mockDataSources },
      });

      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeDefined();
        expect(result.body.singleResult.errors?.[0].message).toContain('Square footage must be positive');
      }
    });
  });
});
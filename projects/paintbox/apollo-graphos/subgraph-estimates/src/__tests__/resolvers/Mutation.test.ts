import { ApolloServer } from '@apollo/server';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { gql } from 'graphql-tag';
import { typeDefs } from '../../index';
import { resolvers } from '../../resolvers';
import { DataSourceContext } from '../../types/DataSourceContext';

describe('Mutation Resolvers', () => {
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

  describe('createEstimate', () => {
    const CREATE_ESTIMATE_MUTATION = gql`
      mutation CreateEstimate($input: CreateEstimateInput!) {
        createEstimate(input: $input) {
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
          createdBy
        }
      }
    `;

    it('should create a new estimate with calculated pricing', async () => {
      const input = {
        customerId: 'customer1',
        projectId: 'project1',
        notes: 'Exterior painting project',
      };

      const mockCreatedEstimate = {
        id: 'estimate1',
        customerId: 'customer1',
        projectId: 'project1',
        goodPrice: 1800.00,
        betterPrice: 2400.00,
        bestPrice: 3000.00,
        selectedTier: 'BETTER',
        status: 'DRAFT',
        totalSquareFootage: 1500.0,
        laborHours: 20.0,
        materialCost: 600.00,
        createdAt: '2025-01-15T10:00:00Z',
        updatedAt: '2025-01-15T10:00:00Z',
        createdBy: 'estimator1',
        notes: 'Exterior painting project',
      };

      mockDataSources.estimates.create.mockResolvedValue(mockCreatedEstimate);

      const result = await server.executeOperation({
        query: CREATE_ESTIMATE_MUTATION,
        variables: { input },
      }, {
        contextValue: { 
          dataSources: mockDataSources,
          user: { id: 'estimator1' },
        },
      });

      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeUndefined();
        expect(result.body.singleResult.data?.createEstimate).toMatchObject({
          customerId: 'customer1',
          projectId: 'project1',
          status: 'DRAFT',
        });
      }
      expect(mockDataSources.estimates.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 'customer1',
          projectId: 'project1',
        })
      );
    });

    it('should create estimate without project ID', async () => {
      const input = {
        customerId: 'customer2',
        notes: 'Interior touch-up work',
      };

      const mockCreatedEstimate = {
        id: 'estimate2',
        customerId: 'customer2',
        projectId: null,
        goodPrice: 900.00,
        betterPrice: 1200.00,
        bestPrice: 1500.00,
        selectedTier: 'GOOD',
        status: 'DRAFT',
        totalSquareFootage: 800.0,
        laborHours: 10.0,
        materialCost: 320.00,
        createdAt: '2025-01-15T10:00:00Z',
        updatedAt: '2025-01-15T10:00:00Z',
        createdBy: 'estimator1',
        notes: 'Interior touch-up work',
      };

      mockDataSources.estimates.create.mockResolvedValue(mockCreatedEstimate);

      const result = await server.executeOperation({
        query: CREATE_ESTIMATE_MUTATION,
        variables: { input },
      }, {
        contextValue: { 
          dataSources: mockDataSources,
          user: { id: 'estimator1' },
        },
      });

      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeUndefined();
        expect(result.body.singleResult.data?.createEstimate.projectId).toBeNull();
      }
    });

    it('should handle validation errors', async () => {
      const input = {
        customerId: '', // Empty customer ID
        notes: 'Invalid estimate',
      };

      mockDataSources.estimates.create.mockRejectedValue(
        new Error('Customer ID is required')
      );

      const result = await server.executeOperation({
        query: CREATE_ESTIMATE_MUTATION,
        variables: { input },
      }, {
        contextValue: { 
          dataSources: mockDataSources,
          user: { id: 'estimator1' },
        },
      });

      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeDefined();
        expect(result.body.singleResult.errors?.[0].message).toBe('Customer ID is required');
      }
    });
  });

  describe('updateEstimate', () => {
    const UPDATE_ESTIMATE_MUTATION = gql`
      mutation UpdateEstimate($id: ID!, $input: UpdateEstimateInput!) {
        updateEstimate(id: $id, input: $input) {
          id
          selectedTier
          status
          notes
          updatedAt
        }
      }
    `;

    it('should update estimate tier and status', async () => {
      const input = {
        selectedTier: 'BEST',
        status: 'REVIEW',
        notes: 'Updated with premium materials',
      };

      const mockUpdatedEstimate = {
        id: 'estimate1',
        selectedTier: 'BEST',
        status: 'REVIEW',
        notes: 'Updated with premium materials',
        updatedAt: '2025-01-15T11:00:00Z',
      };

      mockDataSources.estimates.update.mockResolvedValue(mockUpdatedEstimate);

      const result = await server.executeOperation({
        query: UPDATE_ESTIMATE_MUTATION,
        variables: { id: 'estimate1', input },
      }, {
        contextValue: { dataSources: mockDataSources },
      });

      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeUndefined();
        expect(result.body.singleResult.data?.updateEstimate).toEqual(mockUpdatedEstimate);
      }
      expect(mockDataSources.estimates.update).toHaveBeenCalledWith('estimate1', input);
    });

    it('should handle partial updates', async () => {
      const input = {
        status: 'SENT',
      };

      const mockUpdatedEstimate = {
        id: 'estimate1',
        selectedTier: 'BETTER',
        status: 'SENT',
        notes: 'Original notes',
        updatedAt: '2025-01-15T11:30:00Z',
      };

      mockDataSources.estimates.update.mockResolvedValue(mockUpdatedEstimate);

      const result = await server.executeOperation({
        query: UPDATE_ESTIMATE_MUTATION,
        variables: { id: 'estimate1', input },
      }, {
        contextValue: { dataSources: mockDataSources },
      });

      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeUndefined();
        expect(result.body.singleResult.data?.updateEstimate.status).toBe('SENT');
      }
    });

    it('should handle non-existent estimate', async () => {
      const input = {
        status: 'SENT',
      };

      mockDataSources.estimates.update.mockRejectedValue(
        new Error('Estimate not found')
      );

      const result = await server.executeOperation({
        query: UPDATE_ESTIMATE_MUTATION,
        variables: { id: 'nonexistent', input },
      }, {
        contextValue: { dataSources: mockDataSources },
      });

      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeDefined();
        expect(result.body.singleResult.errors?.[0].message).toBe('Estimate not found');
      }
    });
  });

  describe('deleteEstimate', () => {
    const DELETE_ESTIMATE_MUTATION = gql`
      mutation DeleteEstimate($id: ID!) {
        deleteEstimate(id: $id)
      }
    `;

    it('should delete existing estimate', async () => {
      mockDataSources.estimates.delete.mockResolvedValue(true);

      const result = await server.executeOperation({
        query: DELETE_ESTIMATE_MUTATION,
        variables: { id: 'estimate1' },
      }, {
        contextValue: { dataSources: mockDataSources },
      });

      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeUndefined();
        expect(result.body.singleResult.data?.deleteEstimate).toBe(true);
      }
      expect(mockDataSources.estimates.delete).toHaveBeenCalledWith('estimate1');
    });

    it('should handle non-existent estimate deletion', async () => {
      mockDataSources.estimates.delete.mockResolvedValue(false);

      const result = await server.executeOperation({
        query: DELETE_ESTIMATE_MUTATION,
        variables: { id: 'nonexistent' },
      }, {
        contextValue: { dataSources: mockDataSources },
      });

      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeUndefined();
        expect(result.body.singleResult.data?.deleteEstimate).toBe(false);
      }
    });

    it('should handle database errors during deletion', async () => {
      mockDataSources.estimates.delete.mockRejectedValue(
        new Error('Cannot delete estimate with active projects')
      );

      const result = await server.executeOperation({
        query: DELETE_ESTIMATE_MUTATION,
        variables: { id: 'estimate1' },
      }, {
        contextValue: { dataSources: mockDataSources },
      });

      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeDefined();
        expect(result.body.singleResult.errors?.[0].message).toBe('Cannot delete estimate with active projects');
      }
    });
  });

  describe('generatePDF', () => {
    const GENERATE_PDF_MUTATION = gql`
      mutation GeneratePDF($estimateId: ID!) {
        generatePDF(estimateId: $estimateId) {
          success
          url
          error
        }
      }
    `;

    it('should generate PDF successfully', async () => {
      const mockPDFResult = {
        success: true,
        url: 'https://storage.paintbox.com/estimates/estimate1.pdf',
        error: null,
      };

      mockDataSources.pdf.generate.mockResolvedValue(mockPDFResult);

      const result = await server.executeOperation({
        query: GENERATE_PDF_MUTATION,
        variables: { estimateId: 'estimate1' },
      }, {
        contextValue: { dataSources: mockDataSources },
      });

      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeUndefined();
        expect(result.body.singleResult.data?.generatePDF).toEqual(mockPDFResult);
      }
      expect(mockDataSources.pdf.generate).toHaveBeenCalledWith('estimate1');
    });

    it('should handle PDF generation failure', async () => {
      const mockPDFResult = {
        success: false,
        url: null,
        error: 'Template rendering failed',
      };

      mockDataSources.pdf.generate.mockResolvedValue(mockPDFResult);

      const result = await server.executeOperation({
        query: GENERATE_PDF_MUTATION,
        variables: { estimateId: 'estimate1' },
      }, {
        contextValue: { dataSources: mockDataSources },
      });

      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeUndefined();
        const pdfResult = result.body.singleResult.data?.generatePDF;
        expect(pdfResult.success).toBe(false);
        expect(pdfResult.error).toBe('Template rendering failed');
      }
    });

    it('should handle service unavailable errors', async () => {
      mockDataSources.pdf.generate.mockRejectedValue(
        new Error('PDF service temporarily unavailable')
      );

      const result = await server.executeOperation({
        query: GENERATE_PDF_MUTATION,
        variables: { estimateId: 'estimate1' },
      }, {
        contextValue: { dataSources: mockDataSources },
      });

      expect(result.body.kind).toBe('single');
      if (result.body.kind === 'single') {
        expect(result.body.singleResult.errors).toBeDefined();
        expect(result.body.singleResult.errors?.[0].message).toBe('PDF service temporarily unavailable');
      }
    });
  });
});
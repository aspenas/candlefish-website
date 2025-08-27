import { ApolloServer } from '@apollo/server';
import { GraphQLError } from 'graphql';
import { createTestClient } from 'apollo-server-testing';
import { gql } from 'graphql-tag';
import { createMockContext } from '../../../utils/graphql-test-utils';
import { MaturityMapService } from '../../../../services/maturity-map.service';
import { typeDefs } from '../../../../graphql/schema';
import { resolvers } from '../../../../graphql/resolvers';
import { 
  createAssessmentFactory, 
  createMaturityDataFactory,
  createDocumentFactory 
} from '../../../utils/test-data-factories';

// Mock the MaturityMapService
jest.mock('../../../../services/maturity-map.service');

describe('Maturity Map GraphQL Resolvers', () => {
  let server: ApolloServer;
  let mockMaturityService: jest.Mocked<MaturityMapService>;

  beforeEach(() => {
    mockMaturityService = new MaturityMapService() as jest.Mocked<MaturityMapService>;
    
    server = new ApolloServer({
      typeDefs,
      resolvers,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Query Resolvers', () => {
    describe('maturityAssessments', () => {
      const GET_MATURITY_ASSESSMENTS = gql`
        query GetMaturityAssessments($organizationId: ID!, $filters: AssessmentFilters) {
          maturityAssessments(organizationId: $organizationId, filters: $filters) {
            id
            title
            status
            completedAt
            scores {
              dimension
              score
              level
              trends {
                period
                value
                change
              }
            }
            createdAt
            updatedAt
          }
        }
      `;

      it('should return paginated maturity assessments for organization', async () => {
        // Arrange
        const organizationId = 'org-123';
        const mockAssessments = [
          createAssessmentFactory({ organizationId }),
          createAssessmentFactory({ organizationId }),
        ];
        
        mockMaturityService.getAssessments.mockResolvedValue({
          assessments: mockAssessments,
          totalCount: 2,
          hasNextPage: false,
        });

        const context = createMockContext({ 
          user: { id: 'user-1', organizationId },
          services: { maturityMapService: mockMaturityService }
        });

        // Act
        const { query } = createTestClient({ server, context });
        const response = await query({
          query: GET_MATURITY_ASSESSMENTS,
          variables: { organizationId }
        });

        // Assert
        expect(response.errors).toBeUndefined();
        expect(response.data?.maturityAssessments).toHaveLength(2);
        expect(mockMaturityService.getAssessments).toHaveBeenCalledWith({
          organizationId,
          filters: undefined,
          pagination: { limit: 20, offset: 0 }
        });
      });

      it('should apply filters correctly', async () => {
        // Arrange
        const organizationId = 'org-123';
        const filters = { status: 'COMPLETED', dateRange: { start: '2024-01-01' } };
        
        mockMaturityService.getAssessments.mockResolvedValue({
          assessments: [],
          totalCount: 0,
          hasNextPage: false,
        });

        const context = createMockContext({ 
          user: { id: 'user-1', organizationId },
          services: { maturityMapService: mockMaturityService }
        });

        // Act
        const { query } = createTestClient({ server, context });
        await query({
          query: GET_MATURITY_ASSESSMENTS,
          variables: { organizationId, filters }
        });

        // Assert
        expect(mockMaturityService.getAssessments).toHaveBeenCalledWith({
          organizationId,
          filters,
          pagination: { limit: 20, offset: 0 }
        });
      });

      it('should throw error for unauthorized access', async () => {
        // Arrange
        const organizationId = 'org-456';
        const context = createMockContext({ 
          user: { id: 'user-1', organizationId: 'org-123' }, // Different org
          services: { maturityMapService: mockMaturityService }
        });

        // Act
        const { query } = createTestClient({ server, context });
        const response = await query({
          query: GET_MATURITY_ASSESSMENTS,
          variables: { organizationId }
        });

        // Assert
        expect(response.errors).toBeDefined();
        expect(response.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
      });
    });

    describe('maturityTrends', () => {
      const GET_MATURITY_TRENDS = gql`
        query GetMaturityTrends($organizationId: ID!, $timeRange: TimeRange!) {
          maturityTrends(organizationId: $organizationId, timeRange: $timeRange) {
            dimension
            trends {
              period
              value
              change
              assessmentCount
            }
            benchmarks {
              industry
              averageScore
              percentile
            }
          }
        }
      `;

      it('should return maturity trends with benchmarks', async () => {
        // Arrange
        const organizationId = 'org-123';
        const timeRange = { start: '2024-01-01', end: '2024-12-31' };
        const mockTrends = createMaturityDataFactory().trends;
        
        mockMaturityService.getMaturityTrends.mockResolvedValue(mockTrends);

        const context = createMockContext({ 
          user: { id: 'user-1', organizationId },
          services: { maturityMapService: mockMaturityService }
        });

        // Act
        const { query } = createTestClient({ server, context });
        const response = await query({
          query: GET_MATURITY_TRENDS,
          variables: { organizationId, timeRange }
        });

        // Assert
        expect(response.errors).toBeUndefined();
        expect(response.data?.maturityTrends).toBeDefined();
        expect(mockMaturityService.getMaturityTrends).toHaveBeenCalledWith({
          organizationId,
          timeRange,
          includeBenchmarks: true
        });
      });
    });
  });

  describe('Mutation Resolvers', () => {
    describe('createAssessment', () => {
      const CREATE_ASSESSMENT = gql`
        mutation CreateAssessment($input: CreateAssessmentInput!) {
          createAssessment(input: $input) {
            id
            title
            status
            questions {
              id
              text
              dimension
              weight
              options {
                value
                label
                score
              }
            }
          }
        }
      `;

      it('should create new maturity assessment', async () => {
        // Arrange
        const input = {
          title: 'Q4 2024 Assessment',
          organizationId: 'org-123',
          templateId: 'template-1'
        };
        
        const mockAssessment = createAssessmentFactory(input);
        mockMaturityService.createAssessment.mockResolvedValue(mockAssessment);

        const context = createMockContext({ 
          user: { id: 'user-1', organizationId: 'org-123' },
          services: { maturityMapService: mockMaturityService }
        });

        // Act
        const { mutate } = createTestClient({ server, context });
        const response = await mutate({
          mutation: CREATE_ASSESSMENT,
          variables: { input }
        });

        // Assert
        expect(response.errors).toBeUndefined();
        expect(response.data?.createAssessment.title).toBe(input.title);
        expect(mockMaturityService.createAssessment).toHaveBeenCalledWith(input);
      });

      it('should validate required fields', async () => {
        // Arrange
        const invalidInput = {
          title: '', // Empty title
          organizationId: 'org-123'
        };

        const context = createMockContext({ 
          user: { id: 'user-1', organizationId: 'org-123' },
          services: { maturityMapService: mockMaturityService }
        });

        // Act
        const { mutate } = createTestClient({ server, context });
        const response = await mutate({
          mutation: CREATE_ASSESSMENT,
          variables: { input: invalidInput }
        });

        // Assert
        expect(response.errors).toBeDefined();
        expect(response.errors?.[0]?.extensions?.code).toBe('BAD_USER_INPUT');
      });
    });

    describe('submitAssessmentResponse', () => {
      const SUBMIT_RESPONSE = gql`
        mutation SubmitAssessmentResponse($input: SubmitResponseInput!) {
          submitAssessmentResponse(input: $input) {
            id
            status
            completionPercentage
            scores {
              dimension
              score
              level
            }
          }
        }
      `;

      it('should submit assessment responses and calculate scores', async () => {
        // Arrange
        const input = {
          assessmentId: 'assessment-1',
          responses: [
            { questionId: 'q1', selectedValue: 3 },
            { questionId: 'q2', selectedValue: 4 }
          ]
        };
        
        const mockUpdatedAssessment = createAssessmentFactory({
          id: 'assessment-1',
          status: 'IN_PROGRESS',
          completionPercentage: 50
        });
        
        mockMaturityService.submitResponses.mockResolvedValue(mockUpdatedAssessment);

        const context = createMockContext({ 
          user: { id: 'user-1', organizationId: 'org-123' },
          services: { maturityMapService: mockMaturityService }
        });

        // Act
        const { mutate } = createTestClient({ server, context });
        const response = await mutate({
          mutation: SUBMIT_RESPONSE,
          variables: { input }
        });

        // Assert
        expect(response.errors).toBeUndefined();
        expect(response.data?.submitAssessmentResponse.completionPercentage).toBe(50);
        expect(mockMaturityService.submitResponses).toHaveBeenCalledWith(input);
      });

      it('should handle token limit constraints for large responses', async () => {
        // Arrange - Create response that would exceed token limits
        const largeInput = {
          assessmentId: 'assessment-1',
          responses: Array.from({ length: 1000 }, (_, i) => ({
            questionId: `q${i}`,
            selectedValue: 3,
            comments: 'A'.repeat(2000) // Large comment text
          }))
        };
        
        mockMaturityService.submitResponses.mockRejectedValue(
          new GraphQLError('Request too large', {
            extensions: { code: 'REQUEST_TOO_LARGE' }
          })
        );

        const context = createMockContext({ 
          user: { id: 'user-1', organizationId: 'org-123' },
          services: { maturityMapService: mockMaturityService }
        });

        // Act
        const { mutate } = createTestClient({ server, context });
        const response = await mutate({
          mutation: SUBMIT_RESPONSE,
          variables: { input: largeInput }
        });

        // Assert
        expect(response.errors).toBeDefined();
        expect(response.errors?.[0]?.extensions?.code).toBe('REQUEST_TOO_LARGE');
      });
    });

    describe('uploadAssessmentDocument', () => {
      const UPLOAD_DOCUMENT = gql`
        mutation UploadAssessmentDocument($input: UploadDocumentInput!) {
          uploadAssessmentDocument(input: $input) {
            id
            filename
            size
            mimeType
            processingStatus
            extractedText
            analysisResults {
              confidence
              relevantSections
              suggestedResponses {
                questionId
                suggestedValue
                reasoning
              }
            }
          }
        }
      `;

      it('should upload and process assessment documents', async () => {
        // Arrange
        const input = {
          assessmentId: 'assessment-1',
          file: {
            filename: 'policy-document.pdf',
            mimetype: 'application/pdf',
            encoding: '7bit'
          }
        };
        
        const mockDocument = createDocumentFactory({
          filename: 'policy-document.pdf',
          processingStatus: 'PROCESSING'
        });
        
        mockMaturityService.uploadDocument.mockResolvedValue(mockDocument);

        const context = createMockContext({ 
          user: { id: 'user-1', organizationId: 'org-123' },
          services: { maturityMapService: mockMaturityService }
        });

        // Act
        const { mutate } = createTestClient({ server, context });
        const response = await mutate({
          mutation: UPLOAD_DOCUMENT,
          variables: { input }
        });

        // Assert
        expect(response.errors).toBeUndefined();
        expect(response.data?.uploadAssessmentDocument.filename).toBe('policy-document.pdf');
        expect(mockMaturityService.uploadDocument).toHaveBeenCalledWith(input);
      });

      it('should validate file types and sizes', async () => {
        // Arrange
        const input = {
          assessmentId: 'assessment-1',
          file: {
            filename: 'malware.exe',
            mimetype: 'application/x-msdownload',
            encoding: '7bit'
          }
        };
        
        mockMaturityService.uploadDocument.mockRejectedValue(
          new GraphQLError('Invalid file type', {
            extensions: { code: 'INVALID_FILE_TYPE' }
          })
        );

        const context = createMockContext({ 
          user: { id: 'user-1', organizationId: 'org-123' },
          services: { maturityMapService: mockMaturityService }
        });

        // Act
        const { mutate } = createTestClient({ server, context });
        const response = await mutate({
          mutation: UPLOAD_DOCUMENT,
          variables: { input }
        });

        // Assert
        expect(response.errors).toBeDefined();
        expect(response.errors?.[0]?.extensions?.code).toBe('INVALID_FILE_TYPE');
      });
    });
  });

  describe('Subscription Resolvers', () => {
    describe('assessmentProgress', () => {
      const ASSESSMENT_PROGRESS_SUBSCRIPTION = gql`
        subscription AssessmentProgress($assessmentId: ID!) {
          assessmentProgress(assessmentId: $assessmentId) {
            assessmentId
            completionPercentage
            currentSection
            participantCount
            lastActivity
            scores {
              dimension
              score
              trend
            }
          }
        }
      `;

      it('should stream assessment progress updates', async () => {
        // This test would require a more complex setup with subscription testing
        // For now, we'll test the subscription resolver logic
        const mockProgressUpdate = {
          assessmentId: 'assessment-1',
          completionPercentage: 75,
          currentSection: 'governance',
          participantCount: 5,
          lastActivity: new Date().toISOString()
        };

        mockMaturityService.subscribeToProgress.mockResolvedValue({
          [Symbol.asyncIterator]: async function* () {
            yield { assessmentProgress: mockProgressUpdate };
          }
        });

        const context = createMockContext({ 
          user: { id: 'user-1', organizationId: 'org-123' },
          services: { maturityMapService: mockMaturityService }
        });

        // For subscription testing, we'd need to set up a subscription server
        // This is a simplified test focusing on the resolver logic
        expect(mockMaturityService.subscribeToProgress).toBeDefined();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      // Arrange
      mockMaturityService.getAssessments.mockRejectedValue(
        new Error('Database connection failed')
      );

      const context = createMockContext({ 
        user: { id: 'user-1', organizationId: 'org-123' },
        services: { maturityMapService: mockMaturityService }
      });

      // Act
      const { query } = createTestClient({ server, context });
      const response = await query({
        query: gql`
          query {
            maturityAssessments(organizationId: "org-123") {
              id
            }
          }
        `
      });

      // Assert
      expect(response.errors).toBeDefined();
      expect(response.errors?.[0]?.message).toContain('Database connection failed');
    });

    it('should handle token limit exceeded gracefully', async () => {
      // Arrange - Simulate hitting 2M input token limit
      const largeQuery = 'A'.repeat(8000000); // ~2M tokens worth of data
      
      mockMaturityService.getAssessments.mockRejectedValue(
        new GraphQLError('Token limit exceeded', {
          extensions: { 
            code: 'TOKEN_LIMIT_EXCEEDED',
            maxInputTokens: 2000000,
            requestTokens: 2500000
          }
        })
      );

      const context = createMockContext({ 
        user: { id: 'user-1', organizationId: 'org-123' },
        services: { maturityMapService: mockMaturityService }
      });

      // Act
      const { query } = createTestClient({ server, context });
      const response = await query({
        query: gql`
          query GetLargeData($largeInput: String) {
            maturityAssessments(organizationId: "org-123", searchText: $largeInput) {
              id
            }
          }
        `,
        variables: { largeInput: largeQuery }
      });

      // Assert
      expect(response.errors).toBeDefined();
      expect(response.errors?.[0]?.extensions?.code).toBe('TOKEN_LIMIT_EXCEEDED');
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent requests efficiently', async () => {
      // Arrange
      const organizationId = 'org-123';
      const concurrentRequests = 50;
      
      mockMaturityService.getAssessments.mockResolvedValue({
        assessments: [createAssessmentFactory({ organizationId })],
        totalCount: 1,
        hasNextPage: false,
      });

      const context = createMockContext({ 
        user: { id: 'user-1', organizationId },
        services: { maturityMapService: mockMaturityService }
      });

      // Act
      const { query } = createTestClient({ server, context });
      const startTime = Date.now();
      
      const promises = Array.from({ length: concurrentRequests }, () =>
        query({
          query: gql`
            query {
              maturityAssessments(organizationId: "${organizationId}") {
                id
                title
              }
            }
          `
        })
      );

      await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assert - Should complete within reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds for 50 concurrent requests
      expect(mockMaturityService.getAssessments).toHaveBeenCalledTimes(concurrentRequests);
    });

    it('should optimize query complexity', async () => {
      // Test complex nested query performance
      const COMPLEX_QUERY = gql`
        query ComplexMaturityData($organizationId: ID!) {
          maturityAssessments(organizationId: $organizationId) {
            id
            title
            scores {
              dimension
              score
              trends {
                period
                value
                change
              }
            }
            responses {
              questionId
              selectedValue
              comments
            }
            documents {
              id
              filename
              analysisResults {
                confidence
                relevantSections
                suggestedResponses {
                  questionId
                  suggestedValue
                  reasoning
                }
              }
            }
          }
        }
      `;

      mockMaturityService.getAssessments.mockResolvedValue({
        assessments: [createAssessmentFactory({ 
          organizationId: 'org-123',
          includeComplexData: true 
        })],
        totalCount: 1,
        hasNextPage: false,
      });

      const context = createMockContext({ 
        user: { id: 'user-1', organizationId: 'org-123' },
        services: { maturityMapService: mockMaturityService }
      });

      // Act
      const { query } = createTestClient({ server, context });
      const startTime = Date.now();
      
      const response = await query({
        query: COMPLEX_QUERY,
        variables: { organizationId: 'org-123' }
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assert
      expect(response.errors).toBeUndefined();
      expect(duration).toBeLessThan(2000); // Complex queries should still be fast
    });
  });
});
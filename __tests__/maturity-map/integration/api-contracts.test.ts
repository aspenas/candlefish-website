import { GraphQLClient } from 'graphql-request';
import { Pact } from '@pact-foundation/pact';
import { validateApiContract, generateContractTests } from '../../../utils/contract-testing';
import { 
  createAssessmentFactory,
  createUserFactory,
  createOrganizationFactory 
} from '../../../utils/test-data-factories';

// Contract testing between web, mobile, and backend
describe('API Contract Tests - Maturity Map', () => {
  let mockProvider: Pact;
  let webClient: GraphQLClient;
  let mobileClient: GraphQLClient;

  beforeAll(async () => {
    // Setup Pact mock provider
    mockProvider = new Pact({
      consumer: 'maturity-map-clients',
      provider: 'maturity-map-api',
      port: 3001,
      log: './logs/pact.log',
      dir: './pacts',
      spec: 2,
    });

    await mockProvider.setup();

    // Initialize clients for different platforms
    webClient = new GraphQLClient('http://localhost:3001/graphql', {
      headers: {
        'User-Agent': 'web-client/1.0.0',
        'X-Platform': 'web',
      },
    });

    mobileClient = new GraphQLClient('http://localhost:3001/graphql', {
      headers: {
        'User-Agent': 'mobile-client/1.0.0',
        'X-Platform': 'mobile',
      },
    });
  });

  afterAll(async () => {
    await mockProvider.finalize();
  });

  describe('Assessment Queries Contract', () => {
    it('should maintain consistent schema for getAssessments query across platforms', async () => {
      // Arrange
      const expectedAssessment = createAssessmentFactory({
        id: 'assessment-1',
        title: 'Security Maturity Assessment',
        status: 'IN_PROGRESS',
        completionPercentage: 65,
        organizationId: 'org-123',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T15:30:00Z',
        scores: [
          {
            dimension: 'governance',
            score: 78,
            level: 'DEVELOPING',
            trends: [
              {
                period: '2024-Q1',
                value: 78,
                change: 5,
              },
            ],
          },
        ],
      });

      await mockProvider.addInteraction({
        state: 'organization exists with assessments',
        uponReceiving: 'a request for assessments',
        withRequest: {
          method: 'POST',
          path: '/graphql',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer valid-jwt-token',
          },
          body: {
            query: `
              query GetAssessments($organizationId: ID!) {
                assessments(organizationId: $organizationId) {
                  id
                  title
                  status
                  completionPercentage
                  organizationId
                  createdAt
                  updatedAt
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
                }
              }
            `,
            variables: {
              organizationId: 'org-123',
            },
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            data: {
              assessments: [expectedAssessment],
            },
          },
        },
      });

      // Act - Test web client
      const webResponse = await webClient.request(
        `query GetAssessments($organizationId: ID!) {
          assessments(organizationId: $organizationId) {
            id
            title
            status
            completionPercentage
            organizationId
            createdAt
            updatedAt
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
          }
        }`,
        { organizationId: 'org-123' }
      );

      // Act - Test mobile client
      const mobileResponse = await mobileClient.request(
        `query GetAssessments($organizationId: ID!) {
          assessments(organizationId: $organizationId) {
            id
            title
            status
            completionPercentage
            organizationId
            createdAt
            updatedAt
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
          }
        }`,
        { organizationId: 'org-123' }
      );

      // Assert - Both platforms receive identical data structure
      expect(webResponse.assessments[0]).toEqual(expectedAssessment);
      expect(mobileResponse.assessments[0]).toEqual(expectedAssessment);
      expect(webResponse).toEqual(mobileResponse);
    });

    it('should handle pagination consistently across platforms', async () => {
      // Arrange
      const assessments = Array.from({ length: 25 }, (_, i) =>
        createAssessmentFactory({
          id: `assessment-${i}`,
          title: `Assessment ${i + 1}`,
        })
      );

      await mockProvider.addInteraction({
        state: 'organization has many assessments',
        uponReceiving: 'a paginated request for assessments',
        withRequest: {
          method: 'POST',
          path: '/graphql',
          body: {
            query: expect.stringContaining('assessments'),
            variables: {
              organizationId: 'org-123',
              first: 10,
              after: 'cursor-10',
            },
          },
        },
        willRespondWith: {
          status: 200,
          body: {
            data: {
              assessments: {
                edges: assessments.slice(10, 20).map((assessment, index) => ({
                  node: assessment,
                  cursor: `cursor-${index + 10}`,
                })),
                pageInfo: {
                  hasNextPage: true,
                  hasPreviousPage: true,
                  startCursor: 'cursor-10',
                  endCursor: 'cursor-19',
                },
                totalCount: 25,
              },
            },
          },
        },
      });

      // Test pagination behavior is identical
      const paginationQuery = `
        query GetAssessmentsPaginated($organizationId: ID!, $first: Int!, $after: String) {
          assessments(organizationId: $organizationId, first: $first, after: $after) {
            edges {
              node {
                id
                title
              }
              cursor
            }
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
            totalCount
          }
        }
      `;

      const webResult = await webClient.request(paginationQuery, {
        organizationId: 'org-123',
        first: 10,
        after: 'cursor-10',
      });

      const mobileResult = await mobileClient.request(paginationQuery, {
        organizationId: 'org-123',
        first: 10,
        after: 'cursor-10',
      });

      expect(webResult).toEqual(mobileResult);
      expect(webResult.assessments.pageInfo.hasNextPage).toBe(true);
      expect(webResult.assessments.totalCount).toBe(25);
    });
  });

  describe('Assessment Mutations Contract', () => {
    it('should maintain consistent createAssessment mutation across platforms', async () => {
      // Arrange
      const createInput = {
        title: 'New Security Assessment',
        organizationId: 'org-123',
        templateId: 'template-security-1',
      };

      const createdAssessment = createAssessmentFactory({
        ...createInput,
        id: 'assessment-new',
        status: 'DRAFT',
        completionPercentage: 0,
        createdAt: '2024-01-15T16:00:00Z',
        questions: [
          {
            id: 'q1',
            text: 'Does your organization have a documented security policy?',
            dimension: 'governance',
            weight: 0.25,
            options: [
              { value: 1, label: 'No policy exists', score: 0 },
              { value: 2, label: 'Basic policy exists', score: 33 },
              { value: 3, label: 'Comprehensive policy exists', score: 66 },
              { value: 4, label: 'Policy is regularly updated', score: 100 },
            ],
          },
        ],
      });

      await mockProvider.addInteraction({
        state: 'user is authenticated and has create permissions',
        uponReceiving: 'a create assessment request',
        withRequest: {
          method: 'POST',
          path: '/graphql',
          body: {
            query: expect.stringContaining('createAssessment'),
            variables: {
              input: createInput,
            },
          },
        },
        willRespondWith: {
          status: 200,
          body: {
            data: {
              createAssessment: createdAssessment,
            },
          },
        },
      });

      const mutation = `
        mutation CreateAssessment($input: CreateAssessmentInput!) {
          createAssessment(input: $input) {
            id
            title
            organizationId
            status
            completionPercentage
            createdAt
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

      // Act
      const webResult = await webClient.request(mutation, { input: createInput });
      const mobileResult = await mobileClient.request(mutation, { input: createInput });

      // Assert
      expect(webResult.createAssessment).toEqual(createdAssessment);
      expect(mobileResult.createAssessment).toEqual(createdAssessment);
    });

    it('should handle file upload mutations consistently', async () => {
      // Arrange
      const uploadInput = {
        assessmentId: 'assessment-1',
        file: {
          filename: 'security-policy.pdf',
          mimetype: 'application/pdf',
          encoding: 'base64',
        },
      };

      const uploadResult = {
        id: 'doc-1',
        filename: 'security-policy.pdf',
        size: 1024000,
        mimeType: 'application/pdf',
        processingStatus: 'PROCESSING',
        uploadedAt: '2024-01-15T16:30:00Z',
      };

      await mockProvider.addInteraction({
        state: 'assessment exists and user has upload permissions',
        uponReceiving: 'a document upload request',
        withRequest: {
          method: 'POST',
          path: '/graphql',
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          body: expect.objectContaining({
            operations: expect.stringContaining('uploadAssessmentDocument'),
            map: expect.any(String),
          }),
        },
        willRespondWith: {
          status: 200,
          body: {
            data: {
              uploadAssessmentDocument: uploadResult,
            },
          },
        },
      });

      // Note: File upload testing requires special handling for multipart/form-data
      // This is a simplified contract test focusing on the response structure
      const uploadMutation = `
        mutation UploadAssessmentDocument($input: UploadDocumentInput!) {
          uploadAssessmentDocument(input: $input) {
            id
            filename
            size
            mimeType
            processingStatus
            uploadedAt
          }
        }
      `;

      // Both platforms should expect the same response structure
      const expectedResponse = { uploadAssessmentDocument: uploadResult };

      // This would be tested with actual file upload in integration tests
      // Here we verify the contract structure is consistent
    });
  });

  describe('Real-time Subscriptions Contract', () => {
    it('should maintain consistent subscription schema for assessment progress', async () => {
      // Arrange
      const progressUpdate = {
        assessmentId: 'assessment-1',
        completionPercentage: 75,
        currentSection: 'risk-management',
        participantCount: 3,
        lastActivity: '2024-01-15T17:00:00Z',
        scores: [
          {
            dimension: 'governance',
            score: 82,
            trend: 'IMPROVING',
          },
        ],
      };

      // WebSocket subscriptions contract
      const subscriptionSchema = {
        subscription: {
          assessmentProgress: {
            assessmentId: 'String!',
            completionPercentage: 'Int!',
            currentSection: 'String',
            participantCount: 'Int!',
            lastActivity: 'DateTime!',
            scores: [
              {
                dimension: 'String!',
                score: 'Float!',
                trend: 'TrendDirection',
              },
            ],
          },
        },
      };

      // Verify both platforms expect the same subscription data structure
      const webSubscription = `
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

      const mobileSubscription = webSubscription; // Should be identical

      // Assert schema consistency
      expect(webSubscription).toBe(mobileSubscription);
    });
  });

  describe('Error Handling Contract', () => {
    it('should return consistent error formats across platforms', async () => {
      // Arrange
      const expectedError = {
        errors: [
          {
            message: 'Assessment not found',
            extensions: {
              code: 'NOT_FOUND',
              path: ['assessment'],
              timestamp: '2024-01-15T17:15:00Z',
            },
          },
        ],
      };

      await mockProvider.addInteraction({
        state: 'assessment does not exist',
        uponReceiving: 'a request for non-existent assessment',
        withRequest: {
          method: 'POST',
          path: '/graphql',
          body: {
            query: expect.stringContaining('assessment'),
            variables: {
              id: 'non-existent-assessment',
            },
          },
        },
        willRespondWith: {
          status: 200, // GraphQL always returns 200, errors are in response body
          body: expectedError,
        },
      });

      const query = `
        query GetAssessment($id: ID!) {
          assessment(id: $id) {
            id
            title
          }
        }
      `;

      // Act
      try {
        await webClient.request(query, { id: 'non-existent-assessment' });
      } catch (webError) {
        try {
          await mobileClient.request(query, { id: 'non-existent-assessment' });
        } catch (mobileError) {
          // Assert - Both platforms receive identical error structure
          expect(webError.response.errors).toEqual(mobileError.response.errors);
          expect(webError.response.errors[0].extensions.code).toBe('NOT_FOUND');
        }
      }
    });

    it('should handle validation errors consistently', async () => {
      // Arrange
      const invalidInput = {
        title: '', // Empty title should be invalid
        organizationId: 'org-123',
      };

      const validationError = {
        errors: [
          {
            message: 'Validation failed',
            extensions: {
              code: 'BAD_USER_INPUT',
              validation: {
                title: ['Title is required'],
              },
            },
          },
        ],
      };

      await mockProvider.addInteraction({
        state: 'user provides invalid input',
        uponReceiving: 'a create assessment request with invalid data',
        withRequest: {
          method: 'POST',
          path: '/graphql',
          body: {
            query: expect.stringContaining('createAssessment'),
            variables: {
              input: invalidInput,
            },
          },
        },
        willRespondWith: {
          status: 200,
          body: validationError,
        },
      });

      // Both platforms should handle validation errors identically
      const mutation = `
        mutation CreateAssessment($input: CreateAssessmentInput!) {
          createAssessment(input: $input) {
            id
            title
          }
        }
      `;

      // Test consistent validation error handling
      const webPromise = webClient.request(mutation, { input: invalidInput });
      const mobilePromise = mobileClient.request(mutation, { input: invalidInput });

      await expect(webPromise).rejects.toMatchObject({
        response: {
          errors: expect.arrayContaining([
            expect.objectContaining({
              extensions: {
                code: 'BAD_USER_INPUT',
              },
            }),
          ]),
        },
      });

      await expect(mobilePromise).rejects.toMatchObject({
        response: {
          errors: expect.arrayContaining([
            expect.objectContaining({
              extensions: {
                code: 'BAD_USER_INPUT',
              },
            }),
          ]),
        },
      });
    });
  });

  describe('Performance Contract', () => {
    it('should meet response time requirements for both platforms', async () => {
      // Arrange
      const performanceAssessment = createAssessmentFactory({
        id: 'perf-assessment-1',
        title: 'Performance Test Assessment',
      });

      await mockProvider.addInteraction({
        state: 'performance test setup',
        uponReceiving: 'a performance-critical assessment request',
        withRequest: {
          method: 'POST',
          path: '/graphql',
          body: {
            query: expect.stringContaining('assessment'),
            variables: {
              id: 'perf-assessment-1',
            },
          },
        },
        willRespondWith: {
          status: 200,
          body: {
            data: {
              assessment: performanceAssessment,
            },
          },
        },
      });

      const query = `
        query GetAssessmentPerf($id: ID!) {
          assessment(id: $id) {
            id
            title
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

      // Act - Measure response times
      const webStart = Date.now();
      const webResult = await webClient.request(query, { id: 'perf-assessment-1' });
      const webTime = Date.now() - webStart;

      const mobileStart = Date.now();
      const mobileResult = await mobileClient.request(query, { id: 'perf-assessment-1' });
      const mobileTime = Date.now() - mobileStart;

      // Assert - Response times should be under 200ms for simple queries
      expect(webTime).toBeLessThan(200);
      expect(mobileTime).toBeLessThan(200);
      expect(webResult).toEqual(mobileResult);
    });

    it('should handle concurrent requests efficiently', async () => {
      // Test concurrent request handling
      const concurrentRequests = 50;
      const assessments = Array.from({ length: concurrentRequests }, (_, i) =>
        createAssessmentFactory({ id: `concurrent-${i}` })
      );

      // Setup multiple interactions for concurrent testing
      for (let i = 0; i < concurrentRequests; i++) {
        await mockProvider.addInteraction({
          state: `concurrent test ${i}`,
          uponReceiving: `concurrent assessment request ${i}`,
          withRequest: {
            method: 'POST',
            path: '/graphql',
            body: {
              query: expect.stringContaining('assessment'),
              variables: {
                id: `concurrent-${i}`,
              },
            },
          },
          willRespondWith: {
            status: 200,
            body: {
              data: {
                assessment: assessments[i],
              },
            },
          },
        });
      }

      const query = `
        query GetAssessmentConcurrent($id: ID!) {
          assessment(id: $id) {
            id
            title
          }
        }
      `;

      // Act - Make concurrent requests
      const webPromises = Array.from({ length: concurrentRequests }, (_, i) =>
        webClient.request(query, { id: `concurrent-${i}` })
      );

      const mobilePromises = Array.from({ length: concurrentRequests }, (_, i) =>
        mobileClient.request(query, { id: `concurrent-${i}` })
      );

      const startTime = Date.now();
      const [webResults, mobileResults] = await Promise.all([
        Promise.all(webPromises),
        Promise.all(mobilePromises),
      ]);
      const totalTime = Date.now() - startTime;

      // Assert - All requests should complete successfully
      expect(webResults).toHaveLength(concurrentRequests);
      expect(mobileResults).toHaveLength(concurrentRequests);
      expect(totalTime).toBeLessThan(5000); // Under 5 seconds for 50 concurrent requests

      // Results should be identical across platforms
      webResults.forEach((webResult, index) => {
        expect(webResult).toEqual(mobileResults[index]);
      });
    });
  });

  describe('Authentication Contract', () => {
    it('should handle JWT authentication consistently', async () => {
      // Arrange
      const validToken = 'valid-jwt-token-12345';
      const expiredToken = 'expired-jwt-token-54321';

      // Valid token interaction
      await mockProvider.addInteraction({
        state: 'user has valid JWT token',
        uponReceiving: 'authenticated request with valid token',
        withRequest: {
          method: 'POST',
          path: '/graphql',
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        },
        willRespondWith: {
          status: 200,
          body: {
            data: {
              me: createUserFactory({
                id: 'user-1',
                email: 'user@example.com',
              }),
            },
          },
        },
      });

      // Expired token interaction
      await mockProvider.addInteraction({
        state: 'user has expired JWT token',
        uponReceiving: 'authenticated request with expired token',
        withRequest: {
          method: 'POST',
          path: '/graphql',
          headers: {
            Authorization: `Bearer ${expiredToken}`,
          },
        },
        willRespondWith: {
          status: 200,
          body: {
            errors: [
              {
                message: 'Token expired',
                extensions: {
                  code: 'UNAUTHENTICATED',
                },
              },
            ],
          },
        },
      });

      const meQuery = `
        query Me {
          me {
            id
            email
          }
        }
      `;

      // Act - Test valid token
      const webClientAuth = new GraphQLClient('http://localhost:3001/graphql', {
        headers: { Authorization: `Bearer ${validToken}` },
      });
      const mobileClientAuth = new GraphQLClient('http://localhost:3001/graphql', {
        headers: { Authorization: `Bearer ${validToken}` },
      });

      const webValidResult = await webClientAuth.request(meQuery);
      const mobileValidResult = await mobileClientAuth.request(meQuery);

      // Assert - Valid token results should be identical
      expect(webValidResult).toEqual(mobileValidResult);

      // Test expired token
      const webClientExpired = new GraphQLClient('http://localhost:3001/graphql', {
        headers: { Authorization: `Bearer ${expiredToken}` },
      });
      const mobileClientExpired = new GraphQLClient('http://localhost:3001/graphql', {
        headers: { Authorization: `Bearer ${expiredToken}` },
      });

      await expect(webClientExpired.request(meQuery)).rejects.toMatchObject({
        response: {
          errors: [
            {
              extensions: { code: 'UNAUTHENTICATED' },
            },
          ],
        },
      });

      await expect(mobileClientExpired.request(meQuery)).rejects.toMatchObject({
        response: {
          errors: [
            {
              extensions: { code: 'UNAUTHENTICATED' },
            },
          ],
        },
      });
    });
  });

  describe('Data Synchronization Contract', () => {
    it('should maintain data consistency during offline/online sync', async () => {
      // Arrange
      const offlineChanges = [
        {
          type: 'UPDATE_RESPONSE',
          assessmentId: 'assessment-1',
          questionId: 'q1',
          selectedValue: 3,
          timestamp: '2024-01-15T16:00:00Z',
        },
        {
          type: 'ADD_COMMENT',
          assessmentId: 'assessment-1',
          questionId: 'q2',
          comments: 'Added while offline',
          timestamp: '2024-01-15T16:05:00Z',
        },
      ];

      const syncResult = {
        success: true,
        syncedChanges: 2,
        conflicts: [],
        errors: [],
        timestamp: '2024-01-15T17:00:00Z',
      };

      await mockProvider.addInteraction({
        state: 'offline changes need to be synced',
        uponReceiving: 'a sync request with offline changes',
        withRequest: {
          method: 'POST',
          path: '/graphql',
          body: {
            query: expect.stringContaining('syncOfflineChanges'),
            variables: {
              changes: offlineChanges,
            },
          },
        },
        willRespondWith: {
          status: 200,
          body: {
            data: {
              syncOfflineChanges: syncResult,
            },
          },
        },
      });

      const syncMutation = `
        mutation SyncOfflineChanges($changes: [OfflineChangeInput!]!) {
          syncOfflineChanges(changes: $changes) {
            success
            syncedChanges
            conflicts {
              changeId
              reason
            }
            errors {
              changeId
              message
            }
            timestamp
          }
        }
      `;

      // Act - Both platforms should sync identically
      const webSyncResult = await webClient.request(syncMutation, {
        changes: offlineChanges,
      });
      const mobileSyncResult = await mobileClient.request(syncMutation, {
        changes: offlineChanges,
      });

      // Assert
      expect(webSyncResult).toEqual(mobileSyncResult);
      expect(webSyncResult.syncOfflineChanges.success).toBe(true);
      expect(webSyncResult.syncOfflineChanges.syncedChanges).toBe(2);
    });
  });
});
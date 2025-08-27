import { MaturityMapService } from '../../../../services/maturity-map.service';
import { DatabaseService } from '../../../../services/database.service';
import { FileService } from '../../../../services/file.service';
import { AIAnalysisService } from '../../../../services/ai-analysis.service';
import { CacheService } from '../../../../services/cache.service';
import { 
  createAssessmentFactory, 
  createMaturityDataFactory,
  createDocumentFactory,
  createUserFactory,
  createOrganizationFactory
} from '../../../utils/test-data-factories';

// Mock all dependencies
jest.mock('../../../../services/database.service');
jest.mock('../../../../services/file.service');
jest.mock('../../../../services/ai-analysis.service');
jest.mock('../../../../services/cache.service');

describe('MaturityMapService', () => {
  let maturityMapService: MaturityMapService;
  let mockDatabase: jest.Mocked<DatabaseService>;
  let mockFileService: jest.Mocked<FileService>;
  let mockAIService: jest.Mocked<AIAnalysisService>;
  let mockCacheService: jest.Mocked<CacheService>;

  beforeEach(() => {
    mockDatabase = new DatabaseService() as jest.Mocked<DatabaseService>;
    mockFileService = new FileService() as jest.Mocked<FileService>;
    mockAIService = new AIAnalysisService() as jest.Mocked<AIAnalysisService>;
    mockCacheService = new CacheService() as jest.Mocked<CacheService>;

    maturityMapService = new MaturityMapService(
      mockDatabase,
      mockFileService,
      mockAIService,
      mockCacheService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Assessment Management', () => {
    describe('createAssessment', () => {
      it('should create new assessment with questions from template', async () => {
        // Arrange
        const input = {
          title: 'Q4 2024 Security Assessment',
          organizationId: 'org-123',
          templateId: 'template-security-1',
          userId: 'user-1'
        };

        const mockTemplate = {
          id: 'template-security-1',
          name: 'Security Maturity Template',
          questions: [
            {
              id: 'q1',
              text: 'Does your organization have a documented security policy?',
              dimension: 'governance',
              weight: 0.3,
              options: [
                { value: 1, label: 'No policy exists', score: 0 },
                { value: 2, label: 'Basic policy exists', score: 25 },
                { value: 3, label: 'Comprehensive policy exists', score: 75 },
                { value: 4, label: 'Policy is regularly reviewed and updated', score: 100 }
              ]
            }
          ]
        };

        const expectedAssessment = createAssessmentFactory({
          ...input,
          questions: mockTemplate.questions,
          status: 'DRAFT'
        });

        mockDatabase.findById.mockResolvedValueOnce(mockTemplate);
        mockDatabase.create.mockResolvedValueOnce(expectedAssessment);

        // Act
        const result = await maturityMapService.createAssessment(input);

        // Assert
        expect(result).toEqual(expectedAssessment);
        expect(mockDatabase.findById).toHaveBeenCalledWith('template', input.templateId);
        expect(mockDatabase.create).toHaveBeenCalledWith('assessment', expect.objectContaining({
          title: input.title,
          organizationId: input.organizationId,
          status: 'DRAFT',
          questions: mockTemplate.questions
        }));
      });

      it('should throw error if template not found', async () => {
        // Arrange
        const input = {
          title: 'Test Assessment',
          organizationId: 'org-123',
          templateId: 'non-existent-template',
          userId: 'user-1'
        };

        mockDatabase.findById.mockResolvedValueOnce(null);

        // Act & Assert
        await expect(maturityMapService.createAssessment(input))
          .rejects
          .toThrow('Assessment template not found');

        expect(mockDatabase.create).not.toHaveBeenCalled();
      });

      it('should validate user permissions for organization', async () => {
        // Arrange
        const input = {
          title: 'Test Assessment',
          organizationId: 'org-456',
          templateId: 'template-1',
          userId: 'user-1'
        };

        const mockUser = createUserFactory({ 
          id: 'user-1', 
          organizationId: 'org-123' // Different organization
        });

        mockDatabase.findById
          .mockResolvedValueOnce({ id: 'template-1' }) // Template exists
          .mockResolvedValueOnce(mockUser); // User lookup

        // Act & Assert
        await expect(maturityMapService.createAssessment(input))
          .rejects
          .toThrow('User not authorized for this organization');
      });
    });

    describe('getAssessments', () => {
      it('should return paginated assessments with filters', async () => {
        // Arrange
        const params = {
          organizationId: 'org-123',
          filters: { status: 'COMPLETED', dateRange: { start: '2024-01-01', end: '2024-12-31' } },
          pagination: { limit: 10, offset: 0 }
        };

        const mockAssessments = [
          createAssessmentFactory({ organizationId: 'org-123', status: 'COMPLETED' }),
          createAssessmentFactory({ organizationId: 'org-123', status: 'COMPLETED' })
        ];

        mockDatabase.findWithPagination.mockResolvedValueOnce({
          items: mockAssessments,
          totalCount: 2,
          hasNextPage: false
        });

        // Act
        const result = await maturityMapService.getAssessments(params);

        // Assert
        expect(result.assessments).toEqual(mockAssessments);
        expect(result.totalCount).toBe(2);
        expect(result.hasNextPage).toBe(false);
        
        expect(mockDatabase.findWithPagination).toHaveBeenCalledWith('assessment', {
          where: {
            organizationId: 'org-123',
            status: 'COMPLETED',
            createdAt: { gte: '2024-01-01', lte: '2024-12-31' }
          },
          ...params.pagination
        });
      });

      it('should use cached results when available', async () => {
        // Arrange
        const params = {
          organizationId: 'org-123',
          pagination: { limit: 10, offset: 0 }
        };

        const cachedResult = {
          assessments: [createAssessmentFactory()],
          totalCount: 1,
          hasNextPage: false
        };

        mockCacheService.get.mockResolvedValueOnce(cachedResult);

        // Act
        const result = await maturityMapService.getAssessments(params);

        // Assert
        expect(result).toEqual(cachedResult);
        expect(mockDatabase.findWithPagination).not.toHaveBeenCalled();
      });
    });

    describe('submitResponses', () => {
      it('should save responses and calculate scores', async () => {
        // Arrange
        const input = {
          assessmentId: 'assessment-1',
          responses: [
            { questionId: 'q1', selectedValue: 3, comments: 'We have basic policies' },
            { questionId: 'q2', selectedValue: 4, comments: 'Regular security training' }
          ]
        };

        const mockAssessment = createAssessmentFactory({
          id: 'assessment-1',
          questions: [
            {
              id: 'q1',
              dimension: 'governance',
              weight: 0.5,
              options: [
                { value: 1, score: 0 }, { value: 2, score: 25 }, 
                { value: 3, score: 75 }, { value: 4, score: 100 }
              ]
            },
            {
              id: 'q2',
              dimension: 'governance',
              weight: 0.5,
              options: [
                { value: 1, score: 0 }, { value: 2, score: 25 }, 
                { value: 3, score: 75 }, { value: 4, score: 100 }
              ]
            }
          ]
        });

        mockDatabase.findById.mockResolvedValueOnce(mockAssessment);
        mockDatabase.update.mockResolvedValueOnce({
          ...mockAssessment,
          responses: input.responses,
          scores: [
            { dimension: 'governance', score: 87.5, level: 'ADVANCED' }
          ],
          completionPercentage: 100,
          status: 'COMPLETED'
        });

        // Act
        const result = await maturityMapService.submitResponses(input);

        // Assert
        expect(result.completionPercentage).toBe(100);
        expect(result.status).toBe('COMPLETED');
        expect(result.scores).toHaveLength(1);
        expect(result.scores[0].score).toBe(87.5);
        
        expect(mockDatabase.update).toHaveBeenCalledWith('assessment', 'assessment-1', 
          expect.objectContaining({
            responses: input.responses,
            scores: expect.any(Array),
            completionPercentage: 100,
            status: 'COMPLETED',
            completedAt: expect.any(String)
          })
        );
      });

      it('should handle partial submissions', async () => {
        // Arrange
        const input = {
          assessmentId: 'assessment-1',
          responses: [
            { questionId: 'q1', selectedValue: 3 }
            // Only 1 of 2 questions answered
          ]
        };

        const mockAssessment = createAssessmentFactory({
          id: 'assessment-1',
          questions: [
            { id: 'q1', dimension: 'governance' },
            { id: 'q2', dimension: 'governance' }
          ]
        });

        mockDatabase.findById.mockResolvedValueOnce(mockAssessment);
        mockDatabase.update.mockResolvedValueOnce({
          ...mockAssessment,
          responses: input.responses,
          completionPercentage: 50,
          status: 'IN_PROGRESS'
        });

        // Act
        const result = await maturityMapService.submitResponses(input);

        // Assert
        expect(result.completionPercentage).toBe(50);
        expect(result.status).toBe('IN_PROGRESS');
      });

      it('should validate response data integrity', async () => {
        // Arrange
        const input = {
          assessmentId: 'assessment-1',
          responses: [
            { questionId: 'q1', selectedValue: 5 } // Invalid value
          ]
        };

        const mockAssessment = createAssessmentFactory({
          id: 'assessment-1',
          questions: [
            {
              id: 'q1',
              options: [
                { value: 1, score: 0 }, { value: 2, score: 25 }, 
                { value: 3, score: 75 }, { value: 4, score: 100 }
              ] // Max value is 4
            }
          ]
        });

        mockDatabase.findById.mockResolvedValueOnce(mockAssessment);

        // Act & Assert
        await expect(maturityMapService.submitResponses(input))
          .rejects
          .toThrow('Invalid response value for question q1');
      });
    });
  });

  describe('Document Processing', () => {
    describe('uploadDocument', () => {
      it('should upload document and trigger AI analysis', async () => {
        // Arrange
        const input = {
          assessmentId: 'assessment-1',
          file: {
            filename: 'security-policy.pdf',
            mimetype: 'application/pdf',
            size: 1024000, // 1MB
            buffer: Buffer.from('mock file content')
          }
        };

        const mockDocument = createDocumentFactory({
          filename: 'security-policy.pdf',
          assessmentId: 'assessment-1',
          processingStatus: 'UPLOADED'
        });

        mockFileService.uploadFile.mockResolvedValueOnce({
          fileId: 'file-123',
          url: 'https://storage.example.com/file-123',
          size: 1024000
        });

        mockDatabase.create.mockResolvedValueOnce(mockDocument);

        // Mock AI analysis (async)
        mockAIService.analyzeDocument.mockResolvedValueOnce({
          confidence: 0.85,
          extractedText: 'Security policy content...',
          relevantSections: [
            { section: 'Access Control', confidence: 0.9 },
            { section: 'Incident Response', confidence: 0.8 }
          ],
          suggestedResponses: [
            { questionId: 'q1', suggestedValue: 3, reasoning: 'Policy exists but needs updates' }
          ]
        });

        // Act
        const result = await maturityMapService.uploadDocument(input);

        // Assert
        expect(result.filename).toBe('security-policy.pdf');
        expect(result.processingStatus).toBe('UPLOADED');
        
        expect(mockFileService.uploadFile).toHaveBeenCalledWith(input.file);
        expect(mockDatabase.create).toHaveBeenCalledWith('document', expect.objectContaining({
          filename: 'security-policy.pdf',
          assessmentId: 'assessment-1',
          size: 1024000
        }));

        // AI analysis should be triggered asynchronously
        expect(mockAIService.analyzeDocument).toHaveBeenCalledWith({
          documentId: mockDocument.id,
          fileUrl: 'https://storage.example.com/file-123',
          assessmentId: 'assessment-1'
        });
      });

      it('should validate file types and sizes', async () => {
        // Arrange
        const invalidInput = {
          assessmentId: 'assessment-1',
          file: {
            filename: 'malware.exe',
            mimetype: 'application/x-msdownload',
            size: 50000000, // 50MB - too large
            buffer: Buffer.from('malicious content')
          }
        };

        // Act & Assert
        await expect(maturityMapService.uploadDocument(invalidInput))
          .rejects
          .toThrow('Invalid file type or size');

        expect(mockFileService.uploadFile).not.toHaveBeenCalled();
      });

      it('should handle file upload failures gracefully', async () => {
        // Arrange
        const input = {
          assessmentId: 'assessment-1',
          file: {
            filename: 'policy.pdf',
            mimetype: 'application/pdf',
            size: 1000,
            buffer: Buffer.from('content')
          }
        };

        mockFileService.uploadFile.mockRejectedValueOnce(new Error('S3 upload failed'));

        // Act & Assert
        await expect(maturityMapService.uploadDocument(input))
          .rejects
          .toThrow('File upload failed: S3 upload failed');

        expect(mockDatabase.create).not.toHaveBeenCalled();
      });
    });

    describe('processDocumentWithAI', () => {
      it('should analyze document and suggest responses', async () => {
        // Arrange
        const documentId = 'doc-123';
        const mockDocument = createDocumentFactory({
          id: documentId,
          filename: 'policy.pdf',
          assessmentId: 'assessment-1'
        });

        const mockAssessment = createAssessmentFactory({
          id: 'assessment-1',
          questions: [
            { id: 'q1', text: 'Do you have access control policies?' },
            { id: 'q2', text: 'Is there incident response plan?' }
          ]
        });

        mockDatabase.findById
          .mockResolvedValueOnce(mockDocument)
          .mockResolvedValueOnce(mockAssessment);

        mockAIService.analyzeDocument.mockResolvedValueOnce({
          confidence: 0.92,
          extractedText: 'Comprehensive access control policies...',
          relevantSections: [
            { section: 'Access Control', confidence: 0.95, page: 5 },
            { section: 'Authentication', confidence: 0.88, page: 8 }
          ],
          suggestedResponses: [
            {
              questionId: 'q1',
              suggestedValue: 4,
              reasoning: 'Document shows comprehensive access control framework',
              confidence: 0.94
            },
            {
              questionId: 'q2',
              suggestedValue: 3,
              reasoning: 'Basic incident response mentioned but limited detail',
              confidence: 0.78
            }
          ]
        });

        // Act
        await maturityMapService.processDocumentWithAI(documentId);

        // Assert
        expect(mockDatabase.update).toHaveBeenCalledWith('document', documentId, {
          processingStatus: 'COMPLETED',
          extractedText: expect.any(String),
          analysisResults: expect.objectContaining({
            confidence: 0.92,
            relevantSections: expect.any(Array),
            suggestedResponses: expect.any(Array)
          })
        });
      });

      it('should handle AI analysis token limits gracefully', async () => {
        // Arrange
        const documentId = 'doc-large';
        const mockDocument = createDocumentFactory({
          id: documentId,
          size: 20000000 // 20MB document
        });

        mockDatabase.findById.mockResolvedValueOnce(mockDocument);
        
        mockAIService.analyzeDocument.mockRejectedValueOnce(
          new Error('Token limit exceeded: Document too large for analysis')
        );

        // Act
        await maturityMapService.processDocumentWithAI(documentId);

        // Assert
        expect(mockDatabase.update).toHaveBeenCalledWith('document', documentId, {
          processingStatus: 'FAILED',
          errorMessage: 'Token limit exceeded: Document too large for analysis'
        });
      });

      it('should chunk large documents for processing', async () => {
        // Arrange
        const documentId = 'doc-large';
        const mockDocument = createDocumentFactory({
          id: documentId,
          size: 15000000 // 15MB - needs chunking
        });

        mockDatabase.findById.mockResolvedValueOnce(mockDocument);
        
        // Mock chunked analysis
        mockAIService.analyzeDocumentInChunks.mockResolvedValueOnce({
          confidence: 0.87,
          extractedText: 'Large document content...',
          chunks: [
            { chunkId: 1, analysis: { confidence: 0.9 } },
            { chunkId: 2, analysis: { confidence: 0.84 } }
          ],
          aggregatedResults: {
            relevantSections: [],
            suggestedResponses: []
          }
        });

        // Act
        await maturityMapService.processDocumentWithAI(documentId);

        // Assert
        expect(mockAIService.analyzeDocumentInChunks).toHaveBeenCalled();
        expect(mockDatabase.update).toHaveBeenCalledWith('document', documentId, 
          expect.objectContaining({
            processingStatus: 'COMPLETED'
          })
        );
      });
    });
  });

  describe('Analytics and Reporting', () => {
    describe('getMaturityTrends', () => {
      it('should calculate trends over time with benchmarks', async () => {
        // Arrange
        const params = {
          organizationId: 'org-123',
          timeRange: { start: '2024-01-01', end: '2024-12-31' },
          includeBenchmarks: true
        };

        const mockHistoricalData = [
          { period: '2024-Q1', dimension: 'governance', score: 65 },
          { period: '2024-Q2', dimension: 'governance', score: 72 },
          { period: '2024-Q3', dimension: 'governance', score: 78 },
          { period: '2024-Q4', dimension: 'governance', score: 85 }
        ];

        const mockBenchmarkData = {
          industry: 'financial-services',
          averageScore: 75,
          percentile: 80
        };

        mockDatabase.query.mockResolvedValueOnce(mockHistoricalData);
        mockDatabase.query.mockResolvedValueOnce([mockBenchmarkData]);

        // Act
        const result = await maturityMapService.getMaturityTrends(params);

        // Assert
        expect(result).toEqual([
          {
            dimension: 'governance',
            trends: [
              { period: '2024-Q1', value: 65, change: 0 },
              { period: '2024-Q2', value: 72, change: 7 },
              { period: '2024-Q3', value: 78, change: 6 },
              { period: '2024-Q4', value: 85, change: 7 }
            ],
            benchmarks: mockBenchmarkData
          }
        ]);
      });

      it('should handle missing historical data', async () => {
        // Arrange
        const params = {
          organizationId: 'org-new',
          timeRange: { start: '2024-01-01', end: '2024-12-31' }
        };

        mockDatabase.query.mockResolvedValueOnce([]); // No historical data

        // Act
        const result = await maturityMapService.getMaturityTrends(params);

        // Assert
        expect(result).toEqual([]);
      });
    });

    describe('generateMaturityReport', () => {
      it('should generate comprehensive PDF report', async () => {
        // Arrange
        const params = {
          assessmentId: 'assessment-1',
          includeCharts: true,
          includeRecommendations: true
        };

        const mockAssessment = createAssessmentFactory({
          id: 'assessment-1',
          status: 'COMPLETED',
          scores: [
            { dimension: 'governance', score: 85, level: 'ADVANCED' },
            { dimension: 'risk-management', score: 72, level: 'DEVELOPING' }
          ]
        });

        mockDatabase.findById.mockResolvedValueOnce(mockAssessment);
        mockFileService.generatePDFReport.mockResolvedValueOnce({
          fileId: 'report-123',
          url: 'https://storage.example.com/report-123.pdf',
          size: 2048000
        });

        // Act
        const result = await maturityMapService.generateMaturityReport(params);

        // Assert
        expect(result.reportUrl).toBe('https://storage.example.com/report-123.pdf');
        expect(mockFileService.generatePDFReport).toHaveBeenCalledWith(
          expect.objectContaining({
            assessment: mockAssessment,
            includeCharts: true,
            includeRecommendations: true
          })
        );
      });
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle high concurrent assessment submissions', async () => {
      // Arrange
      const concurrentSubmissions = 100;
      const submissions = Array.from({ length: concurrentSubmissions }, (_, i) => ({
        assessmentId: `assessment-${i}`,
        responses: [{ questionId: 'q1', selectedValue: 3 }]
      }));

      // Mock successful database operations
      mockDatabase.findById.mockImplementation((table, id) => 
        Promise.resolve(createAssessmentFactory({ id }))
      );
      mockDatabase.update.mockImplementation((table, id, data) => 
        Promise.resolve({ id, ...data })
      );

      // Act
      const startTime = Date.now();
      const promises = submissions.map(submission =>
        maturityMapService.submitResponses(submission)
      );
      
      await Promise.all(promises);
      const duration = Date.now() - startTime;

      // Assert
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(mockDatabase.update).toHaveBeenCalledTimes(concurrentSubmissions);
    });

    it('should implement proper caching strategy', async () => {
      // Arrange
      const organizationId = 'org-123';
      const cacheKey = `assessments:${organizationId}:page:0`;
      
      const mockResult = {
        assessments: [createAssessmentFactory()],
        totalCount: 1,
        hasNextPage: false
      };

      // First call - cache miss
      mockCacheService.get.mockResolvedValueOnce(null);
      mockDatabase.findWithPagination.mockResolvedValueOnce({
        items: mockResult.assessments,
        totalCount: 1,
        hasNextPage: false
      });

      // Act - First call
      await maturityMapService.getAssessments({
        organizationId,
        pagination: { limit: 20, offset: 0 }
      });

      // Assert - Should set cache
      expect(mockCacheService.set).toHaveBeenCalledWith(
        cacheKey,
        mockResult,
        3600 // 1 hour TTL
      );

      // Second call - cache hit
      mockCacheService.get.mockResolvedValueOnce(mockResult);
      
      const result = await maturityMapService.getAssessments({
        organizationId,
        pagination: { limit: 20, offset: 0 }
      });

      // Assert - Should use cached result
      expect(result).toEqual(mockResult);
      expect(mockDatabase.findWithPagination).toHaveBeenCalledTimes(1); // Only first call
    });

    it('should optimize database queries with proper indexing hints', async () => {
      // Arrange
      const params = {
        organizationId: 'org-123',
        filters: { 
          status: 'COMPLETED',
          dateRange: { start: '2024-01-01', end: '2024-12-31' }
        },
        pagination: { limit: 50, offset: 100 }
      };

      // Act
      await maturityMapService.getAssessments(params);

      // Assert - Verify optimized query structure
      expect(mockDatabase.findWithPagination).toHaveBeenCalledWith('assessment', 
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 'org-123',
            status: 'COMPLETED'
          }),
          orderBy: { createdAt: 'desc' },
          limit: 50,
          offset: 100
        })
      );
    });
  });
});
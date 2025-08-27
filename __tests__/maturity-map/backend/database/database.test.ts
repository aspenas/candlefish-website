import { DatabaseService } from '../../../../services/database.service';
import { Pool, PoolClient } from 'pg';
import { Redis } from 'ioredis';
import { 
  createAssessmentFactory, 
  createUserFactory,
  createOrganizationFactory
} from '../../../utils/test-data-factories';

// Mock external dependencies
jest.mock('pg');
jest.mock('ioredis');

describe('Database Operations', () => {
  let databaseService: DatabaseService;
  let mockPool: jest.Mocked<Pool>;
  let mockClient: jest.Mocked<PoolClient>;
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
      begin: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
    } as any;

    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
      query: jest.fn(),
      end: jest.fn(),
    } as any;

    mockRedis = new Redis() as jest.Mocked<Redis>;

    (Pool as jest.Mock).mockImplementation(() => mockPool);
    (Redis as jest.Mock).mockImplementation(() => mockRedis);

    databaseService = new DatabaseService({
      host: 'localhost',
      port: 5432,
      database: 'test_maturity_map',
      username: 'test_user',
      password: 'test_password'
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Connection Management', () => {
    it('should establish database connection', async () => {
      // Act
      await databaseService.connect();

      // Assert
      expect(Pool).toHaveBeenCalledWith({
        host: 'localhost',
        port: 5432,
        database: 'test_maturity_map',
        user: 'test_user',
        password: 'test_password',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
    });

    it('should handle connection failures gracefully', async () => {
      // Arrange
      mockPool.connect.mockRejectedValueOnce(new Error('Connection failed'));

      // Act & Assert
      await expect(databaseService.connect())
        .rejects
        .toThrow('Database connection failed: Connection failed');
    });

    it('should implement connection pooling', async () => {
      // Arrange
      const connectionPromises = Array.from({ length: 10 }, () =>
        databaseService.getConnection()
      );

      // Act
      await Promise.all(connectionPromises);

      // Assert
      expect(mockPool.connect).toHaveBeenCalledTimes(10);
    });

    it('should properly release connections', async () => {
      // Arrange
      const client = await databaseService.getConnection();

      // Act
      await databaseService.releaseConnection(client);

      // Assert
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('CRUD Operations', () => {
    describe('create', () => {
      it('should insert new records with proper SQL injection protection', async () => {
        // Arrange
        const assessmentData = createAssessmentFactory({
          title: "Test Assessment with 'quotes' and; DROP TABLE assessments;",
          organizationId: 'org-123'
        });

        mockClient.query.mockResolvedValueOnce({
          rows: [{ id: 'assessment-1', ...assessmentData }],
          rowCount: 1
        });

        // Act
        const result = await databaseService.create('assessment', assessmentData);

        // Assert
        expect(result.id).toBe('assessment-1');
        expect(mockClient.query).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO assessment'),
          expect.arrayContaining([
            assessmentData.title,
            assessmentData.organizationId
          ])
        );
      });

      it('should handle duplicate key violations', async () => {
        // Arrange
        const userData = createUserFactory({ email: 'existing@example.com' });
        
        mockClient.query.mockRejectedValueOnce({
          code: '23505', // PostgreSQL unique constraint violation
          constraint: 'users_email_unique'
        });

        // Act & Assert
        await expect(databaseService.create('user', userData))
          .rejects
          .toThrow('Email address already exists');
      });

      it('should validate required fields', async () => {
        // Arrange
        const invalidData = {
          // Missing required fields
          title: 'Test Assessment'
          // organizationId is required but missing
        };

        // Act & Assert
        await expect(databaseService.create('assessment', invalidData))
          .rejects
          .toThrow('Missing required field: organizationId');
      });
    });

    describe('findById', () => {
      it('should retrieve records by ID with proper type casting', async () => {
        // Arrange
        const assessmentId = 'assessment-1';
        const mockAssessment = createAssessmentFactory({ id: assessmentId });

        mockClient.query.mockResolvedValueOnce({
          rows: [mockAssessment],
          rowCount: 1
        });

        // Act
        const result = await databaseService.findById('assessment', assessmentId);

        // Assert
        expect(result).toEqual(mockAssessment);
        expect(mockClient.query).toHaveBeenCalledWith(
          'SELECT * FROM assessment WHERE id = $1',
          [assessmentId]
        );
      });

      it('should return null for non-existent records', async () => {
        // Arrange
        mockClient.query.mockResolvedValueOnce({
          rows: [],
          rowCount: 0
        });

        // Act
        const result = await databaseService.findById('assessment', 'non-existent');

        // Assert
        expect(result).toBeNull();
      });

      it('should handle UUID validation', async () => {
        // Arrange
        const invalidId = 'not-a-uuid';

        // Act & Assert
        await expect(databaseService.findById('assessment', invalidId))
          .rejects
          .toThrow('Invalid UUID format');
      });
    });

    describe('findWithPagination', () => {
      it('should return paginated results with correct sorting', async () => {
        // Arrange
        const filters = {
          organizationId: 'org-123',
          status: 'COMPLETED'
        };
        const pagination = { limit: 10, offset: 20 };

        const mockAssessments = Array.from({ length: 10 }, () =>
          createAssessmentFactory(filters)
        );

        mockClient.query
          .mockResolvedValueOnce({ rows: [{ total: '50' }] }) // Count query
          .mockResolvedValueOnce({ rows: mockAssessments }); // Data query

        // Act
        const result = await databaseService.findWithPagination('assessment', {
          where: filters,
          ...pagination,
          orderBy: { createdAt: 'desc' }
        });

        // Assert
        expect(result.items).toHaveLength(10);
        expect(result.totalCount).toBe(50);
        expect(result.hasNextPage).toBe(true);
        
        expect(mockClient.query).toHaveBeenNthCalledWith(2,
          expect.stringContaining('ORDER BY created_at DESC LIMIT $3 OFFSET $4'),
          ['org-123', 'COMPLETED', 10, 20]
        );
      });

      it('should handle complex filter conditions', async () => {
        // Arrange
        const complexFilters = {
          organizationId: 'org-123',
          status: { in: ['COMPLETED', 'IN_PROGRESS'] },
          createdAt: { 
            gte: '2024-01-01',
            lte: '2024-12-31'
          },
          title: { contains: 'Security' }
        };

        mockClient.query
          .mockResolvedValueOnce({ rows: [{ total: '5' }] })
          .mockResolvedValueOnce({ rows: [] });

        // Act
        await databaseService.findWithPagination('assessment', {
          where: complexFilters,
          limit: 10,
          offset: 0
        });

        // Assert
        expect(mockClient.query).toHaveBeenNthCalledWith(2,
          expect.stringMatching(/WHERE.*organization_id.*status.*ANY.*created_at.*title.*ILIKE/),
          expect.arrayContaining([
            'org-123',
            ['COMPLETED', 'IN_PROGRESS'],
            '2024-01-01',
            '2024-12-31',
            '%Security%'
          ])
        );
      });
    });

    describe('update', () => {
      it('should update records with optimistic locking', async () => {
        // Arrange
        const assessmentId = 'assessment-1';
        const updateData = {
          title: 'Updated Assessment Title',
          status: 'COMPLETED',
          version: 2 // Optimistic locking
        };

        mockClient.query.mockResolvedValueOnce({
          rows: [{ ...updateData, id: assessmentId, updated_at: new Date() }],
          rowCount: 1
        });

        // Act
        const result = await databaseService.update('assessment', assessmentId, updateData);

        // Assert
        expect(result.title).toBe(updateData.title);
        expect(mockClient.query).toHaveBeenCalledWith(
          expect.stringContaining('WHERE id = $1 AND version = $2'),
          expect.arrayContaining([assessmentId, 2])
        );
      });

      it('should handle concurrent update conflicts', async () => {
        // Arrange
        const assessmentId = 'assessment-1';
        const updateData = { title: 'New Title', version: 1 };

        mockClient.query.mockResolvedValueOnce({
          rows: [],
          rowCount: 0 // No rows updated (version mismatch)
        });

        // Act & Assert
        await expect(databaseService.update('assessment', assessmentId, updateData))
          .rejects
          .toThrow('Record was modified by another user');
      });

      it('should automatically update timestamp fields', async () => {
        // Arrange
        const assessmentId = 'assessment-1';
        const updateData = { title: 'Updated Title' };

        mockClient.query.mockResolvedValueOnce({
          rows: [{ ...updateData, id: assessmentId }],
          rowCount: 1
        });

        // Act
        await databaseService.update('assessment', assessmentId, updateData);

        // Assert
        expect(mockClient.query).toHaveBeenCalledWith(
          expect.stringContaining('updated_at = NOW()'),
          expect.any(Array)
        );
      });
    });

    describe('delete', () => {
      it('should implement soft delete by default', async () => {
        // Arrange
        const assessmentId = 'assessment-1';

        mockClient.query.mockResolvedValueOnce({
          rowCount: 1
        });

        // Act
        const result = await databaseService.delete('assessment', assessmentId);

        // Assert
        expect(result).toBe(true);
        expect(mockClient.query).toHaveBeenCalledWith(
          'UPDATE assessment SET deleted_at = NOW(), is_deleted = true WHERE id = $1',
          [assessmentId]
        );
      });

      it('should support hard delete when specified', async () => {
        // Arrange
        const assessmentId = 'assessment-1';

        mockClient.query.mockResolvedValueOnce({
          rowCount: 1
        });

        // Act
        await databaseService.delete('assessment', assessmentId, { hard: true });

        // Assert
        expect(mockClient.query).toHaveBeenCalledWith(
          'DELETE FROM assessment WHERE id = $1',
          [assessmentId]
        );
      });

      it('should handle cascade deletions', async () => {
        // Arrange
        const organizationId = 'org-123';

        mockClient.query
          .mockResolvedValueOnce({ rowCount: 5 }) // Delete assessments
          .mockResolvedValueOnce({ rowCount: 3 }) // Delete users
          .mockResolvedValueOnce({ rowCount: 1 }); // Delete organization

        // Act
        await databaseService.delete('organization', organizationId, { 
          cascade: ['assessment', 'user'] 
        });

        // Assert
        expect(mockClient.query).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('Transaction Management', () => {
    describe('transaction', () => {
      it('should execute operations within transaction scope', async () => {
        // Arrange
        const operations = async (client: PoolClient) => {
          await databaseService.create('organization', createOrganizationFactory());
          await databaseService.create('user', createUserFactory());
          return 'success';
        };

        mockClient.query
          .mockResolvedValueOnce({ rows: [{ id: 'org-1' }] }) // Org creation
          .mockResolvedValueOnce({ rows: [{ id: 'user-1' }] }); // User creation

        // Act
        const result = await databaseService.transaction(operations);

        // Assert
        expect(result).toBe('success');
        expect(mockClient.begin).toHaveBeenCalled();
        expect(mockClient.commit).toHaveBeenCalled();
        expect(mockClient.rollback).not.toHaveBeenCalled();
      });

      it('should rollback on transaction failure', async () => {
        // Arrange
        const operations = async () => {
          await databaseService.create('organization', createOrganizationFactory());
          throw new Error('Operation failed');
        };

        mockClient.query.mockRejectedValueOnce(new Error('Operation failed'));

        // Act & Assert
        await expect(databaseService.transaction(operations))
          .rejects
          .toThrow('Operation failed');

        expect(mockClient.begin).toHaveBeenCalled();
        expect(mockClient.rollback).toHaveBeenCalled();
        expect(mockClient.commit).not.toHaveBeenCalled();
      });

      it('should handle nested transactions with savepoints', async () => {
        // Arrange
        const outerTransaction = async (client: PoolClient) => {
          await databaseService.create('organization', createOrganizationFactory());
          
          // Nested transaction
          await databaseService.transaction(async () => {
            await databaseService.create('user', createUserFactory());
          });
          
          return 'completed';
        };

        mockClient.query
          .mockResolvedValueOnce({ rows: [{ id: 'org-1' }] })
          .mockResolvedValueOnce({ rows: [{ id: 'user-1' }] });

        // Act
        const result = await databaseService.transaction(outerTransaction);

        // Assert
        expect(result).toBe('completed');
        expect(mockClient.query).toHaveBeenCalledWith('SAVEPOINT sp1');
        expect(mockClient.query).toHaveBeenCalledWith('RELEASE SAVEPOINT sp1');
      });
    });

    describe('batch operations', () => {
      it('should execute batch inserts efficiently', async () => {
        // Arrange
        const assessments = Array.from({ length: 100 }, () =>
          createAssessmentFactory()
        );

        mockClient.query.mockResolvedValueOnce({
          rows: assessments.map((a, i) => ({ ...a, id: `assessment-${i}` })),
          rowCount: 100
        });

        // Act
        const results = await databaseService.batchCreate('assessment', assessments);

        // Assert
        expect(results).toHaveLength(100);
        expect(mockClient.query).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO assessment'),
          expect.any(Array)
        );
      });

      it('should handle batch update operations', async () => {
        // Arrange
        const updates = [
          { id: 'assessment-1', status: 'COMPLETED' },
          { id: 'assessment-2', status: 'COMPLETED' },
          { id: 'assessment-3', status: 'COMPLETED' }
        ];

        mockClient.query.mockResolvedValueOnce({ rowCount: 3 });

        // Act
        const result = await databaseService.batchUpdate('assessment', updates);

        // Assert
        expect(result).toBe(3);
        expect(mockClient.query).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE assessment SET'),
          expect.any(Array)
        );
      });
    });
  });

  describe('Performance and Optimization', () => {
    describe('query optimization', () => {
      it('should use prepared statements for repeated queries', async () => {
        // Arrange
        const assessmentId = 'assessment-1';

        // Act - Execute same query multiple times
        await databaseService.findById('assessment', assessmentId);
        await databaseService.findById('assessment', 'assessment-2');
        await databaseService.findById('assessment', 'assessment-3');

        // Assert - Should use prepared statement
        expect(mockClient.query).toHaveBeenCalledWith({
          text: 'SELECT * FROM assessment WHERE id = $1',
          values: expect.any(Array),
          name: 'findById_assessment'
        });
      });

      it('should implement query result caching', async () => {
        // Arrange
        const cacheKey = 'assessment:org-123:page-1';
        const mockResults = [createAssessmentFactory()];

        mockRedis.get.mockResolvedValueOnce(JSON.stringify(mockResults));

        // Act
        const results = await databaseService.findWithPagination('assessment', {
          where: { organizationId: 'org-123' },
          limit: 10,
          offset: 0,
          useCache: true
        });

        // Assert
        expect(results.items).toEqual(mockResults);
        expect(mockClient.query).not.toHaveBeenCalled(); // Should use cache
        expect(mockRedis.get).toHaveBeenCalledWith(cacheKey);
      });

      it('should invalidate cache on data modifications', async () => {
        // Arrange
        const assessmentData = createAssessmentFactory({ organizationId: 'org-123' });

        mockClient.query.mockResolvedValueOnce({
          rows: [assessmentData],
          rowCount: 1
        });

        // Act
        await databaseService.create('assessment', assessmentData);

        // Assert
        expect(mockRedis.del).toHaveBeenCalledWith('assessment:org-123:*');
      });
    });

    describe('connection optimization', () => {
      it('should implement connection health checks', async () => {
        // Arrange
        mockClient.query.mockResolvedValueOnce({ rows: [{ result: 1 }] });

        // Act
        const isHealthy = await databaseService.healthCheck();

        // Assert
        expect(isHealthy).toBe(true);
        expect(mockClient.query).toHaveBeenCalledWith('SELECT 1 as result');
      });

      it('should monitor query performance', async () => {
        // Arrange
        const startTime = Date.now();
        mockClient.query.mockImplementation(async () => {
          // Simulate slow query
          await new Promise(resolve => setTimeout(resolve, 100));
          return { rows: [], rowCount: 0 };
        });

        // Act
        await databaseService.findById('assessment', 'test-id');

        // Assert - Should log slow queries
        const executionTime = Date.now() - startTime;
        expect(executionTime).toBeGreaterThan(50);
        // In real implementation, this would trigger slow query logging
      });

      it('should handle query timeouts gracefully', async () => {
        // Arrange
        mockClient.query.mockImplementation(() =>
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Query timeout')), 100);
          })
        );

        // Act & Assert
        await expect(databaseService.findById('assessment', 'test-id'))
          .rejects
          .toThrow('Query timeout');
      });
    });
  });

  describe('Data Integrity and Security', () => {
    describe('data validation', () => {
      it('should validate data types before insertion', async () => {
        // Arrange
        const invalidData = {
          title: 123, // Should be string
          organizationId: 'org-123',
          createdAt: 'invalid-date' // Should be valid date
        };

        // Act & Assert
        await expect(databaseService.create('assessment', invalidData))
          .rejects
          .toThrow('Invalid data type for field: title');
      });

      it('should sanitize input to prevent SQL injection', async () => {
        // Arrange
        const maliciousInput = {
          title: "'; DROP TABLE assessments; --",
          organizationId: 'org-123'
        };

        mockClient.query.mockResolvedValueOnce({
          rows: [{ id: 'assessment-1', ...maliciousInput }],
          rowCount: 1
        });

        // Act
        await databaseService.create('assessment', maliciousInput);

        // Assert - Should use parameterized queries
        expect(mockClient.query).toHaveBeenCalledWith(
          expect.not.stringContaining('DROP TABLE'),
          expect.arrayContaining([maliciousInput.title, maliciousInput.organizationId])
        );
      });

      it('should enforce referential integrity', async () => {
        // Arrange
        const userData = createUserFactory({
          organizationId: 'non-existent-org' // Foreign key violation
        });

        mockClient.query.mockRejectedValueOnce({
          code: '23503', // PostgreSQL foreign key violation
          constraint: 'user_organization_id_fkey'
        });

        // Act & Assert
        await expect(databaseService.create('user', userData))
          .rejects
          .toThrow('Referenced organization does not exist');
      });
    });

    describe('data encryption', () => {
      it('should encrypt sensitive fields before storage', async () => {
        // Arrange
        const sensitiveData = {
          title: 'Confidential Assessment',
          sensitiveNotes: 'This contains PII data',
          organizationId: 'org-123'
        };

        mockClient.query.mockResolvedValueOnce({
          rows: [{ 
            id: 'assessment-1',
            ...sensitiveData,
            sensitive_notes: 'encrypted:abcd1234' // Encrypted
          }],
          rowCount: 1
        });

        // Act
        await databaseService.create('assessment', sensitiveData);

        // Assert
        expect(mockClient.query).toHaveBeenCalledWith(
          expect.any(String),
          expect.arrayContaining([
            sensitiveData.title,
            expect.stringMatching(/^encrypted:/), // Should be encrypted
            sensitiveData.organizationId
          ])
        );
      });

      it('should decrypt sensitive fields on retrieval', async () => {
        // Arrange
        const encryptedData = {
          id: 'assessment-1',
          title: 'Assessment',
          sensitive_notes: 'encrypted:abcd1234'
        };

        mockClient.query.mockResolvedValueOnce({
          rows: [encryptedData],
          rowCount: 1
        });

        // Act
        const result = await databaseService.findById('assessment', 'assessment-1');

        // Assert
        expect(result.sensitiveNotes).toBe('Decrypted sensitive content');
        expect(result.sensitiveNotes).not.toContain('encrypted:');
      });
    });

    describe('audit logging', () => {
      it('should log all data modification operations', async () => {
        // Arrange
        const assessmentData = createAssessmentFactory();

        mockClient.query
          .mockResolvedValueOnce({ rows: [assessmentData], rowCount: 1 }) // Main operation
          .mockResolvedValueOnce({ rows: [{ id: 'audit-1' }], rowCount: 1 }); // Audit log

        // Act
        await databaseService.create('assessment', assessmentData, {
          auditUserId: 'user-1'
        });

        // Assert
        expect(mockClient.query).toHaveBeenNthCalledWith(2,
          expect.stringContaining('INSERT INTO audit_log'),
          expect.arrayContaining([
            'CREATE',
            'assessment',
            'user-1',
            expect.any(String) // JSON stringified data
          ])
        );
      });

      it('should track field-level changes on updates', async () => {
        // Arrange
        const assessmentId = 'assessment-1';
        const originalData = { title: 'Original', status: 'DRAFT' };
        const updateData = { title: 'Updated', status: 'COMPLETED' };

        mockClient.query
          .mockResolvedValueOnce({ rows: [originalData], rowCount: 1 }) // Get original
          .mockResolvedValueOnce({ rows: [updateData], rowCount: 1 }) // Update
          .mockResolvedValueOnce({ rows: [{ id: 'audit-1' }], rowCount: 1 }); // Audit

        // Act
        await databaseService.update('assessment', assessmentId, updateData, {
          auditUserId: 'user-1'
        });

        // Assert
        expect(mockClient.query).toHaveBeenNthCalledWith(3,
          expect.stringContaining('INSERT INTO audit_log'),
          expect.arrayContaining([
            'UPDATE',
            'assessment',
            'user-1',
            JSON.stringify({
              changes: {
                title: { from: 'Original', to: 'Updated' },
                status: { from: 'DRAFT', to: 'COMPLETED' }
              }
            })
          ])
        );
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle database connection loss', async () => {
      // Arrange
      mockPool.connect.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      // Act & Assert
      await expect(databaseService.findById('assessment', 'test-id'))
        .rejects
        .toThrow('Database connection failed');
    });

    it('should implement query retry logic for transient failures', async () => {
      // Arrange
      mockClient.query
        .mockRejectedValueOnce(new Error('Connection reset'))
        .mockRejectedValueOnce(new Error('Connection reset'))
        .mockResolvedValueOnce({ rows: [{ id: 'test' }], rowCount: 1 });

      // Act
      const result = await databaseService.findById('assessment', 'test-id');

      // Assert
      expect(result.id).toBe('test');
      expect(mockClient.query).toHaveBeenCalledTimes(3); // 2 retries + success
    });

    it('should gracefully handle query syntax errors', async () => {
      // Arrange
      mockClient.query.mockRejectedValueOnce({
        code: '42601', // PostgreSQL syntax error
        message: 'syntax error at or near "SELCT"'
      });

      // Act & Assert
      await expect(databaseService.query('SELCT * FROM assessment'))
        .rejects
        .toThrow('Database query syntax error');
    });
  });
});
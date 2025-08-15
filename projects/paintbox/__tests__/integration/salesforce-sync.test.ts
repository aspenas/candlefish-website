import { SalesforceAPI } from '@/lib/services/salesforce-api';
import { salesforceConfig } from '@/lib/config/integrations';

// Mock Salesforce SDK
const mockSalesforceClient = {
  login: jest.fn(),
  query: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  composite: jest.fn(),
  bulk: jest.fn(),
};

jest.mock('jsforce', () => ({
  Connection: jest.fn().mockImplementation(() => mockSalesforceClient),
}));

describe('Salesforce Integration', () => {
  let salesforceAPI: SalesforceAPI;

  beforeEach(() => {
    jest.clearAllMocks();
    salesforceAPI = new SalesforceAPI({
      username: 'test@paintbox.com',
      password: 'password123',
      securityToken: 'token123',
      sandbox: true,
    });

    mockSalesforceClient.login.mockResolvedValue({
      id: 'user123',
      organizationId: 'org123',
    });
  });

  describe('Authentication and Connection', () => {
    it('should authenticate with Salesforce successfully', async () => {
      const result = await salesforceAPI.authenticate();

      expect(result.authenticated).toBe(true);
      expect(result.userId).toBe('user123');
      expect(mockSalesforceClient.login).toHaveBeenCalledWith(
        'test@paintbox.com',
        'password123token123'
      );
    });

    it('should handle authentication failures', async () => {
      mockSalesforceClient.login.mockRejectedValue(
        new Error('INVALID_LOGIN: Invalid username, password, security token; or user locked out.')
      );

      await expect(salesforceAPI.authenticate()).rejects.toThrow('INVALID_LOGIN');
    });

    it('should refresh session when expired', async () => {
      // First call succeeds
      mockSalesforceClient.query.mockResolvedValueOnce({
        totalSize: 1,
        records: [{ Id: 'account123' }],
      });

      // Second call fails with session error
      mockSalesforceClient.query.mockRejectedValueOnce({
        name: 'INVALID_SESSION_ID',
        message: 'Session expired or invalid',
      });

      // Re-login succeeds
      mockSalesforceClient.login.mockResolvedValue({
        id: 'user123',
        organizationId: 'org123',
      });

      // Retry succeeds
      mockSalesforceClient.query.mockResolvedValueOnce({
        totalSize: 1,
        records: [{ Id: 'account123' }],
      });

      const result1 = await salesforceAPI.query('SELECT Id FROM Account LIMIT 1');
      const result2 = await salesforceAPI.query('SELECT Id FROM Account LIMIT 1');

      expect(result1.records).toHaveLength(1);
      expect(result2.records).toHaveLength(1);
      expect(mockSalesforceClient.login).toHaveBeenCalledTimes(2); // Initial + refresh
    });
  });

  describe('Customer Sync', () => {
    const mockCustomer = {
      id: 'customer123',
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@example.com',
      phone: '(555) 123-4567',
      address: {
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345',
      },
    };

    it('should create new Account in Salesforce', async () => {
      mockSalesforceClient.create.mockResolvedValue({
        success: true,
        id: 'acc123',
      });

      const result = await salesforceAPI.createCustomer(mockCustomer);

      expect(result.success).toBe(true);
      expect(result.salesforceId).toBe('acc123');
      expect(mockSalesforceClient.create).toHaveBeenCalledWith('Account', {
        Name: 'John Smith',
        FirstName: 'John',
        LastName: 'Smith',
        PersonEmail: 'john.smith@example.com',
        PersonMobilePhone: '(555) 123-4567',
        BillingStreet: '123 Main St',
        BillingCity: 'Anytown',
        BillingState: 'CA',
        BillingPostalCode: '12345',
        RecordTypeId: salesforceConfig.personAccountRecordTypeId,
        Paintbox_Customer_ID__c: 'customer123',
      });
    });

    it('should update existing customer', async () => {
      const updatedCustomer = {
        ...mockCustomer,
        phone: '(555) 987-6543',
        address: {
          ...mockCustomer.address,
          street: '456 Oak Ave',
        },
      };

      mockSalesforceClient.query.mockResolvedValue({
        totalSize: 1,
        records: [{ Id: 'acc123', Paintbox_Customer_ID__c: 'customer123' }],
      });

      mockSalesforceClient.update.mockResolvedValue({
        success: true,
        id: 'acc123',
      });

      const result = await salesforceAPI.updateCustomer(updatedCustomer);

      expect(result.success).toBe(true);
      expect(mockSalesforceClient.update).toHaveBeenCalledWith('Account', {
        Id: 'acc123',
        PersonMobilePhone: '(555) 987-6543',
        BillingStreet: '456 Oak Ave',
      });
    });

    it('should find customer by email', async () => {
      mockSalesforceClient.query.mockResolvedValue({
        totalSize: 1,
        records: [{
          Id: 'acc123',
          Name: 'John Smith',
          PersonEmail: 'john.smith@example.com',
          Paintbox_Customer_ID__c: 'customer123',
        }],
      });

      const result = await salesforceAPI.findCustomerByEmail('john.smith@example.com');

      expect(result.found).toBe(true);
      expect(result.customer.salesforceId).toBe('acc123');
      expect(mockSalesforceClient.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE PersonEmail = 'john.smith@example.com'")
      );
    });

    it('should handle duplicate customer detection', async () => {
      mockSalesforceClient.query.mockResolvedValue({
        totalSize: 2,
        records: [
          { Id: 'acc123', Name: 'John Smith', PersonEmail: 'john.smith@example.com' },
          { Id: 'acc456', Name: 'John Smith', PersonEmail: 'j.smith@example.com' },
        ],
      });

      const result = await salesforceAPI.findPotentialDuplicates(mockCustomer);

      expect(result.duplicates).toHaveLength(2);
      expect(result.confidence).toBeGreaterThan(0.8); // High confidence match
    });
  });

  describe('Estimate Sync', () => {
    const mockEstimate = {
      id: 'estimate123',
      customerId: 'customer123',
      projectId: 'project123',
      goodPrice: 1500.00,
      betterPrice: 2000.00,
      bestPrice: 2500.00,
      selectedTier: 'BETTER',
      status: 'SENT',
      totalSquareFootage: 1200,
      laborHours: 16,
      materialCost: 480.00,
      createdAt: '2025-01-15T10:00:00Z',
      notes: 'Kitchen and living room painting',
    };

    it('should create Opportunity in Salesforce', async () => {
      // Find the Account first
      mockSalesforceClient.query.mockResolvedValue({
        totalSize: 1,
        records: [{ Id: 'acc123', Paintbox_Customer_ID__c: 'customer123' }],
      });

      mockSalesforceClient.create.mockResolvedValue({
        success: true,
        id: 'opp123',
      });

      const result = await salesforceAPI.createEstimate(mockEstimate);

      expect(result.success).toBe(true);
      expect(result.opportunityId).toBe('opp123');
      expect(mockSalesforceClient.create).toHaveBeenCalledWith('Opportunity', {
        Name: 'Paint Estimate - estimate123',
        AccountId: 'acc123',
        Amount: 2000.00, // Better tier selected
        StageName: 'Proposal/Price Quote',
        CloseDate: expect.any(String),
        Paintbox_Estimate_ID__c: 'estimate123',
        Description: 'Kitchen and living room painting',
        Paintbox_Square_Footage__c: 1200,
        Paintbox_Labor_Hours__c: 16,
        Paintbox_Material_Cost__c: 480.00,
        Paintbox_Good_Price__c: 1500.00,
        Paintbox_Better_Price__c: 2000.00,
        Paintbox_Best_Price__c: 2500.00,
        Paintbox_Selected_Tier__c: 'BETTER',
      });
    });

    it('should update Opportunity stage based on estimate status', async () => {
      const statusMappings = [
        { estimateStatus: 'DRAFT', salesforceStage: 'Prospecting' },
        { estimateStatus: 'REVIEW', salesforceStage: 'Qualification' },
        { estimateStatus: 'SENT', salesforceStage: 'Proposal/Price Quote' },
        { estimateStatus: 'ACCEPTED', salesforceStage: 'Negotiation/Review' },
        { estimateStatus: 'REJECTED', salesforceStage: 'Closed Lost' },
      ];

      for (const mapping of statusMappings) {
        mockSalesforceClient.query.mockResolvedValue({
          totalSize: 1,
          records: [{ Id: 'opp123', Paintbox_Estimate_ID__c: 'estimate123' }],
        });

        mockSalesforceClient.update.mockResolvedValue({
          success: true,
          id: 'opp123',
        });

        await salesforceAPI.updateEstimateStatus('estimate123', mapping.estimateStatus);

        expect(mockSalesforceClient.update).toHaveBeenCalledWith('Opportunity', {
          Id: 'opp123',
          StageName: mapping.salesforceStage,
        });
      }
    });

    it('should sync pricing tier changes', async () => {
      mockSalesforceClient.query.mockResolvedValue({
        totalSize: 1,
        records: [{ Id: 'opp123', Paintbox_Estimate_ID__c: 'estimate123' }],
      });

      mockSalesforceClient.update.mockResolvedValue({
        success: true,
        id: 'opp123',
      });

      await salesforceAPI.updatePricingTier('estimate123', {
        selectedTier: 'BEST',
        newAmount: 2500.00,
      });

      expect(mockSalesforceClient.update).toHaveBeenCalledWith('Opportunity', {
        Id: 'opp123',
        Amount: 2500.00,
        Paintbox_Selected_Tier__c: 'BEST',
      });
    });

    it('should attach Company Cam photos to Opportunity', async () => {
      const photoManifest = {
        estimateId: 'estimate123',
        photos: [
          { wwTag: 'WW15-001', url: 'https://companycam.com/photo1.jpg' },
          { wwTag: 'WW15-002', url: 'https://companycam.com/photo2.jpg' },
        ],
      };

      mockSalesforceClient.query.mockResolvedValue({
        totalSize: 1,
        records: [{ Id: 'opp123' }],
      });

      mockSalesforceClient.create.mockResolvedValue({
        success: true,
        id: 'att123',
      });

      const result = await salesforceAPI.attachPhotoManifest('estimate123', photoManifest);

      expect(result.success).toBe(true);
      expect(mockSalesforceClient.create).toHaveBeenCalledWith('Attachment', {
        ParentId: 'opp123',
        Name: 'Photo_Manifest_estimate123.json',
        Body: expect.any(String), // Base64 encoded JSON
        ContentType: 'application/json',
      });
    });
  });

  describe('Data Synchronization', () => {
    it('should perform bidirectional sync', async () => {
      // Mock Paintbox changes
      const paintboxUpdates = [
        { type: 'customer_updated', id: 'customer123', data: { phone: '(555) 999-8888' } },
        { type: 'estimate_created', id: 'estimate456', data: mockEstimate },
      ];

      // Mock Salesforce changes
      mockSalesforceClient.query.mockResolvedValue({
        totalSize: 1,
        records: [{
          Id: 'acc123',
          Paintbox_Customer_ID__c: 'customer123',
          LastModifiedDate: '2025-01-15T12:00:00Z',
          PersonMobilePhone: '(555) 111-2222', // Changed in Salesforce
        }],
      });

      const syncResult = await salesforceAPI.performBidirectionalSync({
        paintboxUpdates,
        lastSyncTime: '2025-01-15T10:00:00Z',
      });

      expect(syncResult.paintboxToSalesforce.processed).toBe(2);
      expect(syncResult.salesforceToPaintbox.records).toHaveLength(1);
    });

    it('should handle sync conflicts with conflict resolution', async () => {
      const conflictData = {
        paintboxRecord: {
          id: 'customer123',
          phone: '(555) 123-4567',
          lastModified: '2025-01-15T11:00:00Z',
        },
        salesforceRecord: {
          Id: 'acc123',
          PersonMobilePhone: '(555) 987-6543',
          LastModifiedDate: '2025-01-15T11:30:00Z', // Newer
        },
      };

      const resolution = await salesforceAPI.resolveConflict(conflictData, {
        strategy: 'latest_timestamp', // Use newer record
      });

      expect(resolution.winner).toBe('salesforce');
      expect(resolution.action).toBe('update_paintbox');
      expect(resolution.data.phone).toBe('(555) 987-6543');
    });

    it('should batch sync operations for performance', async () => {
      const batchUpdates = Array.from({ length: 50 }, (_, i) => ({
        Id: `acc${i}`,
        PersonMobilePhone: `(555) 123-${String(i).padStart(4, '0')}`,
      }));

      mockSalesforceClient.composite.mockResolvedValue({
        compositeResponse: batchUpdates.map((update, i) => ({
          httpStatusCode: 200,
          referenceId: `ref${i}`,
          body: { success: true, id: update.Id },
        })),
      });

      const result = await salesforceAPI.batchUpdateAccounts(batchUpdates);

      expect(result.successful).toBe(50);
      expect(result.failed).toBe(0);
    });

    it('should handle API limits and throttling', async () => {
      let callCount = 0;
      mockSalesforceClient.query.mockImplementation(() => {
        callCount++;
        if (callCount <= 3) {
          throw {
            name: 'REQUEST_LIMIT_EXCEEDED',
            message: 'API request limit exceeded',
          };
        }
        return Promise.resolve({
          totalSize: 1,
          records: [{ Id: 'acc123' }],
        });
      });

      const result = await salesforceAPI.queryWithRetry('SELECT Id FROM Account LIMIT 1', {
        maxRetries: 5,
        backoffMultiplier: 1.5,
      });

      expect(result.records).toHaveLength(1);
      expect(callCount).toBe(4); // 3 failures + 1 success
    });
  });

  describe('Reports and Analytics', () => {
    it('should generate customer pipeline report', async () => {
      const mockOpportunities = [
        {
          Id: 'opp1',
          Amount: 2000,
          StageName: 'Proposal/Price Quote',
          Paintbox_Selected_Tier__c: 'BETTER',
        },
        {
          Id: 'opp2',
          Amount: 3500,
          StageName: 'Negotiation/Review',
          Paintbox_Selected_Tier__c: 'BEST',
        },
      ];

      mockSalesforceClient.query.mockResolvedValue({
        totalSize: 2,
        records: mockOpportunities,
      });

      const report = await salesforceAPI.generatePipelineReport({
        dateRange: {
          start: '2025-01-01',
          end: '2025-01-31',
        },
      });

      expect(report.totalOpportunities).toBe(2);
      expect(report.totalValue).toBe(5500);
      expect(report.averageValue).toBe(2750);
      expect(report.tierBreakdown.BETTER).toBe(1);
      expect(report.tierBreakdown.BEST).toBe(1);
    });

    it('should track conversion rates by pricing tier', async () => {
      mockSalesforceClient.query
        .mockResolvedValueOnce({ // All opportunities
          totalSize: 10,
          records: Array.from({ length: 10 }, (_, i) => ({
            Id: `opp${i}`,
            Paintbox_Selected_Tier__c: i < 4 ? 'GOOD' : i < 7 ? 'BETTER' : 'BEST',
          })),
        })
        .mockResolvedValueOnce({ // Closed won
          totalSize: 6,
          records: Array.from({ length: 6 }, (_, i) => ({
            Id: `opp${i}`,
            Paintbox_Selected_Tier__c: i < 2 ? 'GOOD' : i < 4 ? 'BETTER' : 'BEST',
          })),
        });

      const conversionReport = await salesforceAPI.getConversionRatesByTier();

      expect(conversionReport.GOOD.rate).toBe(0.5); // 2/4
      expect(conversionReport.BETTER.rate).toBe(0.67); // 2/3 (rounded)
      expect(conversionReport.BEST.rate).toBe(0.67); // 2/3 (rounded)
    });

    it('should create dashboard data for sales metrics', async () => {
      const mockMetrics = {
        thisMonth: {
          newLeads: 25,
          estimatesSent: 18,
          estimatesAccepted: 12,
          revenue: 24000,
        },
        lastMonth: {
          newLeads: 22,
          estimatesSent: 16,
          estimatesAccepted: 10,
          revenue: 20000,
        },
      };

      mockSalesforceClient.query
        .mockResolvedValueOnce({ totalSize: 25 }) // This month leads
        .mockResolvedValueOnce({ totalSize: 18 }) // This month estimates
        .mockResolvedValueOnce({ // This month won opportunities
          totalSize: 12,
          records: Array.from({ length: 12 }, () => ({ Amount: 2000 })),
        })
        .mockResolvedValueOnce({ totalSize: 22 }) // Last month leads
        .mockResolvedValueOnce({ totalSize: 16 }) // Last month estimates
        .mockResolvedValueOnce({ // Last month won opportunities
          totalSize: 10,
          records: Array.from({ length: 10 }, () => ({ Amount: 2000 })),
        });

      const dashboard = await salesforceAPI.getDashboardMetrics();

      expect(dashboard.thisMonth.newLeads).toBe(25);
      expect(dashboard.growth.leadsGrowth).toBeCloseTo(0.136); // (25-22)/22
      expect(dashboard.growth.revenueGrowth).toBe(0.2); // (24000-20000)/20000
    });
  });

  describe('Error Handling and Data Integrity', () => {
    it('should validate required fields before sync', async () => {
      const incompleteCustomer = {
        id: 'customer123',
        firstName: 'John',
        // Missing lastName and email
      };

      await expect(salesforceAPI.createCustomer(incompleteCustomer))
        .rejects.toThrow('Missing required field: lastName');
    });

    it('should handle Salesforce field validation errors', async () => {
      mockSalesforceClient.create.mockRejectedValue({
        name: 'FIELD_CUSTOM_VALIDATION_EXCEPTION',
        message: 'Email address must be unique',
        fields: ['PersonEmail'],
      });

      await expect(salesforceAPI.createCustomer(mockCustomer))
        .rejects.toThrow('Email address must be unique');
    });

    it('should maintain data consistency during failures', async () => {
      // Mock partial failure in batch operation
      mockSalesforceClient.composite.mockResolvedValue({
        compositeResponse: [
          { httpStatusCode: 200, body: { success: true, id: 'acc1' } },
          { httpStatusCode: 400, body: { errors: ['Invalid email'] } },
          { httpStatusCode: 200, body: { success: true, id: 'acc3' } },
        ],
      });

      const result = await salesforceAPI.batchCreateCustomers([
        { id: 'cust1', email: 'valid1@test.com' },
        { id: 'cust2', email: 'invalid-email' },
        { id: 'cust3', email: 'valid3@test.com' },
      ]);

      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors[0].customerId).toBe('cust2');
    });

    it('should rollback changes on critical failures', async () => {
      const rollbackSpy = jest.spyOn(salesforceAPI, 'rollbackTransaction');

      mockSalesforceClient.create
        .mockResolvedValueOnce({ success: true, id: 'acc123' })
        .mockRejectedValueOnce(new Error('Critical system error'));

      await expect(
        salesforceAPI.createCustomerWithEstimate(mockCustomer, mockEstimate)
      ).rejects.toThrow('Critical system error');

      expect(rollbackSpy).toHaveBeenCalledWith(['acc123']);
    });

    it('should log all sync operations for audit trail', async () => {
      const auditSpy = jest.spyOn(salesforceAPI, 'auditLog');

      mockSalesforceClient.create.mockResolvedValue({
        success: true,
        id: 'acc123',
      });

      await salesforceAPI.createCustomer(mockCustomer);

      expect(auditSpy).toHaveBeenCalledWith({
        operation: 'create_customer',
        paintboxId: 'customer123',
        salesforceId: 'acc123',
        timestamp: expect.any(String),
        success: true,
      });
    });
  });
});
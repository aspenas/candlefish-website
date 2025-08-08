import { NextRequest } from 'next/server';
import { GET as searchContacts, POST as createContact, PUT as bulkUpdateContacts } from '@/app/api/v1/salesforce/contacts/route';
import { GET as getContact, PUT as updateContact, DELETE as deleteContact } from '@/app/api/v1/salesforce/contacts/[id]/route';
import { POST as triggerSync, GET as getSyncStatus } from '@/app/api/v1/salesforce/sync/route';
import { salesforceService } from '@/lib/services/salesforce';

// Mock the Salesforce service
jest.mock('@/lib/services/salesforce');
jest.mock('@/lib/logging/simple-logger');

const mockSalesforceService = salesforceService as jest.Mocked<typeof salesforceService>;

describe('Salesforce API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Contact Search API', () => {
    it('should search contacts successfully', async () => {
      const mockContacts = [
        {
          Id: 'contact123',
          Name: 'John Doe',
          Email: 'john@example.com',
        },
      ];

      mockSalesforceService.searchContacts.mockResolvedValue(mockContacts);

      const request = new NextRequest('http://localhost/api/v1/salesforce/contacts?query=John&limit=10');
      const response = await searchContacts(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockContacts);
      expect(data.count).toBe(1);
      expect(mockSalesforceService.searchContacts).toHaveBeenCalledWith('John', 10);
    });

    it('should return 400 for missing query parameter', async () => {
      const request = new NextRequest('http://localhost/api/v1/salesforce/contacts');
      const response = await searchContacts(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Query parameter is required');
    });

    it('should handle service errors', async () => {
      mockSalesforceService.searchContacts.mockRejectedValue(new Error('API Error'));

      const request = new NextRequest('http://localhost/api/v1/salesforce/contacts?query=John');
      const response = await searchContacts(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to search contacts');
    });

    it('should validate limit parameter', async () => {
      const request = new NextRequest('http://localhost/api/v1/salesforce/contacts?query=John&limit=200');
      const response = await searchContacts(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid parameters');
      expect(data.details).toBeDefined();
    });
  });

  describe('Contact Creation API', () => {
    it('should create contact successfully', async () => {
      mockSalesforceService.createContact.mockResolvedValue('new_contact_123');

      const contactData = {
        FirstName: 'Jane',
        LastName: 'Smith',
        Email: 'jane@example.com',
      };

      const request = new NextRequest('http://localhost/api/v1/salesforce/contacts', {
        method: 'POST',
        body: JSON.stringify(contactData),
      });

      const response = await createContact(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('new_contact_123');
      expect(mockSalesforceService.createContact).toHaveBeenCalledWith(contactData);
    });

    it('should validate contact data', async () => {
      const invalidData = {
        FirstName: 'Jane',
        // Missing required LastName
        Email: 'invalid-email', // Invalid email format
      };

      const request = new NextRequest('http://localhost/api/v1/salesforce/contacts', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      const response = await createContact(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid contact data');
      expect(data.details).toBeDefined();
    });

    it('should handle creation errors', async () => {
      mockSalesforceService.createContact.mockRejectedValue(new Error('Creation failed'));

      const contactData = {
        LastName: 'Smith',
        Email: 'jane@example.com',
      };

      const request = new NextRequest('http://localhost/api/v1/salesforce/contacts', {
        method: 'POST',
        body: JSON.stringify(contactData),
      });

      const response = await createContact(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to create contact');
    });
  });

  describe('Contact Bulk Update API', () => {
    it('should bulk update contacts successfully', async () => {
      mockSalesforceService.updateContact.mockResolvedValue();

      const updates = [
        { id: 'contact1', data: { Phone: '555-1111' } },
        { id: 'contact2', data: { Phone: '555-2222' } },
      ];

      const request = new NextRequest('http://localhost/api/v1/salesforce/contacts', {
        method: 'PUT',
        body: JSON.stringify({ updates }),
      });

      const response = await bulkUpdateContacts(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.summary.total).toBe(2);
      expect(data.summary.successful).toBe(2);
      expect(data.summary.failed).toBe(0);
      expect(mockSalesforceService.updateContact).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures in bulk update', async () => {
      mockSalesforceService.updateContact
        .mockResolvedValueOnce() // First update succeeds
        .mockRejectedValueOnce(new Error('Update failed')); // Second update fails

      const updates = [
        { id: 'contact1', data: { Phone: '555-1111' } },
        { id: 'contact2', data: { Phone: '555-2222' } },
      ];

      const request = new NextRequest('http://localhost/api/v1/salesforce/contacts', {
        method: 'PUT',
        body: JSON.stringify({ updates }),
      });

      const response = await bulkUpdateContacts(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(false);
      expect(data.summary.successful).toBe(1);
      expect(data.summary.failed).toBe(1);
    });

    it('should validate bulk update format', async () => {
      const request = new NextRequest('http://localhost/api/v1/salesforce/contacts', {
        method: 'PUT',
        body: JSON.stringify({ updates: 'invalid' }), // Should be array
      });

      const response = await bulkUpdateContacts(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Updates must be an array');
    });
  });

  describe('Individual Contact API', () => {
    it('should get contact by ID successfully', async () => {
      const mockContact = {
        Id: 'contact123',
        Name: 'John Doe',
        Email: 'john@example.com',
      };

      mockSalesforceService.getContact.mockResolvedValue(mockContact);

      const request = new NextRequest('http://localhost/api/v1/salesforce/contacts/contact123');
      const response = await getContact(request, { params: { id: 'contact123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockContact);
      expect(mockSalesforceService.getContact).toHaveBeenCalledWith('contact123');
    });

    it('should return 404 for non-existent contact', async () => {
      mockSalesforceService.getContact.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/v1/salesforce/contacts/nonexistent');
      const response = await getContact(request, { params: { id: 'nonexistent' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Contact not found');
    });

    it('should update contact by ID successfully', async () => {
      mockSalesforceService.updateContact.mockResolvedValue();

      const updateData = { Phone: '555-9999' };

      const request = new NextRequest('http://localhost/api/v1/salesforce/contacts/contact123', {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      const response = await updateContact(request, { params: { id: 'contact123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Contact updated successfully');
      expect(mockSalesforceService.updateContact).toHaveBeenCalledWith('contact123', updateData);
    });

    it('should delete contact by ID successfully', async () => {
      mockSalesforceService.deleteContact.mockResolvedValue();

      const request = new NextRequest('http://localhost/api/v1/salesforce/contacts/contact123', {
        method: 'DELETE',
      });

      const response = await deleteContact(request, { params: { id: 'contact123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Contact deleted successfully');
      expect(mockSalesforceService.deleteContact).toHaveBeenCalledWith('contact123');
    });
  });

  describe('Sync API', () => {
    it('should trigger manual sync successfully', async () => {
      const mockSyncResult = {
        success: true,
        processed: 150,
        errors: [],
        conflicts: [],
      };

      mockSalesforceService.performBatchSync.mockResolvedValue(mockSyncResult);

      const request = new NextRequest('http://localhost/api/v1/salesforce/sync', {
        method: 'POST',
      });

      const response = await triggerSync(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockSyncResult);
      expect(mockSalesforceService.performBatchSync).toHaveBeenCalled();
    });

    it('should handle sync failures', async () => {
      const mockSyncResult = {
        success: false,
        processed: 50,
        errors: ['Connection timeout', 'Rate limit exceeded'],
        conflicts: [],
      };

      mockSalesforceService.performBatchSync.mockResolvedValue(mockSyncResult);

      const request = new NextRequest('http://localhost/api/v1/salesforce/sync', {
        method: 'POST',
      });

      const response = await triggerSync(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(false);
      expect(data.data.errors).toHaveLength(2);
    });

    it('should get sync status successfully', async () => {
      mockSalesforceService.testConnection.mockResolvedValue(true);

      // Mock cache access
      const mockCache = {
        get: jest.fn().mockResolvedValue('2023-07-01T10:00:00.000Z'),
      };

      (salesforceService as any).cache = mockCache;

      const request = new NextRequest('http://localhost/api/v1/salesforce/sync');
      const response = await getSyncStatus(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.connected).toBe(true);
      expect(data.data.syncInterval).toBe('5 minutes');
      expect(mockSalesforceService.testConnection).toHaveBeenCalled();
    });

    it('should handle sync status errors gracefully', async () => {
      mockSalesforceService.testConnection.mockRejectedValue(new Error('Connection failed'));

      const request = new NextRequest('http://localhost/api/v1/salesforce/sync');
      const response = await getSyncStatus(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to get sync status');
    });
  });

  describe('Request Validation', () => {
    it('should handle malformed JSON requests', async () => {
      const request = new NextRequest('http://localhost/api/v1/salesforce/contacts', {
        method: 'POST',
        body: 'invalid json{',
      });

      const response = await createContact(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should validate email formats', async () => {
      const invalidData = {
        LastName: 'Smith',
        Email: 'not-an-email',
      };

      const request = new NextRequest('http://localhost/api/v1/salesforce/contacts', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      const response = await createContact(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid contact data');
    });

    it('should handle missing required fields', async () => {
      const incompleteData = {
        FirstName: 'Jane',
        // Missing LastName
      };

      const request = new NextRequest('http://localhost/api/v1/salesforce/contacts', {
        method: 'POST',
        body: JSON.stringify(incompleteData),
      });

      const response = await createContact(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.details).toContainEqual(
        expect.objectContaining({
          path: ['LastName'],
          code: 'too_small',
        })
      );
    });
  });

  describe('Error Response Format', () => {
    it('should return consistent error format', async () => {
      mockSalesforceService.searchContacts.mockRejectedValue(new Error('Test error'));

      const request = new NextRequest('http://localhost/api/v1/salesforce/contacts?query=test');
      const response = await searchContacts(request);
      const data = await response.json();

      expect(data).toMatchObject({
        success: false,
        error: expect.any(String),
        message: expect.any(String),
      });
    });

    it('should return consistent success format', async () => {
      mockSalesforceService.searchContacts.mockResolvedValue([]);

      const request = new NextRequest('http://localhost/api/v1/salesforce/contacts?query=test');
      const response = await searchContacts(request);
      const data = await response.json();

      expect(data).toMatchObject({
        success: true,
        data: expect.any(Array),
        count: expect.any(Number),
      });
    });
  });
});

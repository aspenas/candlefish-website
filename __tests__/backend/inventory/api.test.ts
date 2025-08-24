import request from 'supertest';
import { app } from '../../../5470_S_Highline_Circle/backend/test-app';
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

describe('Inventory API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'healthy',
        service: 'highline-inventory',
      });
    });
  });

  describe('Room Management', () => {
    const mockRoom = {
      id: 'room-1',
      name: 'Living Room',
      description: 'Main living area',
      items: [],
    };

    it('should get all rooms', async () => {
      const response = await request(app)
        .get('/api/v1/rooms')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should create a new room', async () => {
      const newRoom = {
        name: 'Bedroom',
        description: 'Master bedroom',
      };

      const response = await request(app)
        .post('/api/v1/rooms')
        .send(newRoom)
        .expect(201);

      expect(response.body).toMatchObject(newRoom);
      expect(response.body.id).toBeDefined();
    });

    it('should get a specific room by ID', async () => {
      const response = await request(app)
        .get('/api/v1/rooms/room-1')
        .expect(200);

      expect(response.body.id).toBe('room-1');
    });

    it('should update a room', async () => {
      const updates = { name: 'Updated Living Room' };

      const response = await request(app)
        .put('/api/v1/rooms/room-1')
        .send(updates)
        .expect(200);

      expect(response.body.name).toBe('Updated Living Room');
    });

    it('should delete a room', async () => {
      await request(app)
        .delete('/api/v1/rooms/room-1')
        .expect(204);
    });

    it('should return 404 for non-existent room', async () => {
      await request(app)
        .get('/api/v1/rooms/non-existent')
        .expect(404);
    });
  });

  describe('Item Management', () => {
    const mockItem = {
      id: 'item-1',
      name: 'Sofa',
      description: 'Comfortable 3-seat sofa',
      category: 'Furniture',
      quantity: 1,
      unitPrice: 800.00,
      totalValue: 800.00,
      location: 'Living Room',
      sku: 'SOFA-001',
      isActive: true,
    };

    it('should get all items', async () => {
      const response = await request(app)
        .get('/api/v1/items')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should create a new item', async () => {
      const newItem = {
        name: 'Coffee Table',
        description: 'Modern glass coffee table',
        category: 'Furniture',
        quantity: 1,
        unitPrice: 300.00,
        location: 'Living Room',
        sku: 'TABLE-001',
      };

      const response = await request(app)
        .post('/api/v1/items')
        .send(newItem)
        .expect(201);

      expect(response.body).toMatchObject(newItem);
      expect(response.body.id).toBeDefined();
      expect(response.body.totalValue).toBe(300.00);
    });

    it('should get a specific item by ID', async () => {
      const response = await request(app)
        .get('/api/v1/items/item-1')
        .expect(200);

      expect(response.body.id).toBe('item-1');
    });

    it('should update an item', async () => {
      const updates = { name: 'Updated Sofa', unitPrice: 850.00 };

      const response = await request(app)
        .put('/api/v1/items/item-1')
        .send(updates)
        .expect(200);

      expect(response.body.name).toBe('Updated Sofa');
      expect(response.body.unitPrice).toBe(850.00);
      expect(response.body.totalValue).toBe(850.00); // Should recalculate
    });

    it('should delete an item (soft delete)', async () => {
      await request(app)
        .delete('/api/v1/items/item-1')
        .expect(204);
    });

    it('should bulk update items', async () => {
      const bulkUpdates = [
        { id: 'item-1', quantity: 2 },
        { id: 'item-2', unitPrice: 1200.00 },
      ];

      const response = await request(app)
        .post('/api/v1/items/bulk')
        .send({ items: bulkUpdates })
        .expect(200);

      expect(response.body.updated).toBe(2);
    });

    it('should validate required fields on item creation', async () => {
      const invalidItem = {
        description: 'Missing name field',
      };

      const response = await request(app)
        .post('/api/v1/items')
        .send(invalidItem)
        .expect(400);

      expect(response.body.error).toContain('name');
    });
  });

  describe('Search and Filter', () => {
    it('should search items by query', async () => {
      const response = await request(app)
        .get('/api/v1/search?q=sofa')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter items by category', async () => {
      const response = await request(app)
        .get('/api/v1/filter?category=Furniture')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter items by price range', async () => {
      const response = await request(app)
        .get('/api/v1/filter?minPrice=100&maxPrice=1000')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should handle empty search results', async () => {
      const response = await request(app)
        .get('/api/v1/search?q=nonexistentitem')
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe('Analytics', () => {
    it('should get summary analytics', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/summary')
        .expect(200);

      expect(response.body).toMatchObject({
        totalItems: expect.any(Number),
        totalValue: expect.any(Number),
        categories: expect.any(Number),
      });
    });

    it('should get room analytics', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/by-room')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should get category analytics', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/by-category')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Export Functionality', () => {
    it('should export to Excel', async () => {
      const response = await request(app)
        .get('/api/v1/export/excel')
        .expect(200);

      expect(response.headers['content-type']).toContain('application/vnd.openxmlformats');
    });

    it('should export to CSV', async () => {
      const response = await request(app)
        .get('/api/v1/export/csv')
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
    });

    it('should export to PDF', async () => {
      const response = await request(app)
        .get('/api/v1/export/pdf')
        .expect(200);

      expect(response.headers['content-type']).toContain('application/pdf');
    });
  });

  describe('AI Features', () => {
    it('should get AI insights', async () => {
      const response = await request(app)
        .get('/api/v1/ai/insights')
        .expect(200);

      expect(response.body).toHaveProperty('insights');
    });

    it('should get price optimization for item', async () => {
      const response = await request(app)
        .get('/api/v1/ai/price-optimization/item-1')
        .expect(200);

      expect(response.body).toHaveProperty('suggestedPrice');
      expect(response.body).toHaveProperty('confidence');
    });

    it('should get market analysis by category', async () => {
      const response = await request(app)
        .get('/api/v1/ai/market-analysis/Furniture')
        .expect(200);

      expect(response.body).toHaveProperty('marketTrends');
    });

    it('should get bundle suggestions', async () => {
      const response = await request(app)
        .get('/api/v1/ai/bundle-suggestions')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should get predictive trends', async () => {
      const response = await request(app)
        .get('/api/v1/ai/predictive-trends')
        .expect(200);

      expect(response.body).toHaveProperty('trends');
    });
  });

  describe('Import Functionality', () => {
    it('should import Excel file', async () => {
      const mockExcelFile = Buffer.from('mock excel data');

      const response = await request(app)
        .post('/api/v1/import/excel')
        .attach('file', mockExcelFile, 'test.xlsx')
        .expect(200);

      expect(response.body).toHaveProperty('imported');
      expect(response.body).toHaveProperty('errors');
    });

    it('should handle invalid file format', async () => {
      const mockTextFile = Buffer.from('invalid file');

      await request(app)
        .post('/api/v1/import/excel')
        .attach('file', mockTextFile, 'test.txt')
        .expect(400);
    });
  });

  describe('Collaboration Features', () => {
    it('should get item notes', async () => {
      const response = await request(app)
        .get('/api/v1/items/item-1/notes')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should add item note', async () => {
      const note = {
        content: 'This item needs repair',
        author: 'John Doe',
      };

      const response = await request(app)
        .post('/api/v1/items/item-1/notes')
        .send(note)
        .expect(201);

      expect(response.body).toMatchObject(note);
      expect(response.body.id).toBeDefined();
    });

    it('should update note', async () => {
      const updates = { content: 'Updated note content' };

      const response = await request(app)
        .put('/api/v1/notes/note-1')
        .send(updates)
        .expect(200);

      expect(response.body.content).toBe('Updated note content');
    });

    it('should delete note', async () => {
      await request(app)
        .delete('/api/v1/notes/note-1')
        .expect(204);
    });

    it('should get buyer interests', async () => {
      const response = await request(app)
        .get('/api/v1/buyer/interests')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should set item interest', async () => {
      const interest = { level: 'high', notes: 'Interested buyer' };

      const response = await request(app)
        .put('/api/v1/items/item-1/interest')
        .send(interest)
        .expect(200);

      expect(response.body).toMatchObject(interest);
    });
  });

  describe('Bundle Management', () => {
    it('should get all bundles', async () => {
      const response = await request(app)
        .get('/api/v1/bundles')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should create a bundle', async () => {
      const bundle = {
        name: 'Living Room Set',
        description: 'Complete living room furniture',
        items: ['item-1', 'item-2'],
        discountPercent: 10,
      };

      const response = await request(app)
        .post('/api/v1/bundles')
        .send(bundle)
        .expect(201);

      expect(response.body).toMatchObject(bundle);
      expect(response.body.id).toBeDefined();
    });

    it('should update a bundle', async () => {
      const updates = { discountPercent: 15 };

      const response = await request(app)
        .put('/api/v1/bundles/bundle-1')
        .send(updates)
        .expect(200);

      expect(response.body.discountPercent).toBe(15);
    });

    it('should delete a bundle', async () => {
      await request(app)
        .delete('/api/v1/bundles/bundle-1')
        .expect(204);
    });
  });

  describe('Webhook Endpoints', () => {
    it('should handle NANDA webhook', async () => {
      const payload = {
        action: 'item_updated',
        data: { id: 'item-1', quantity: 5 },
      };

      const response = await request(app)
        .post('/api/v1/webhook/nanda')
        .send(payload)
        .expect(200);

      expect(response.body.status).toBe('processed');
    });

    it('should handle n8n webhook', async () => {
      const payload = {
        trigger: 'low_stock_alert',
        items: ['item-1', 'item-2'],
      };

      const response = await request(app)
        .post('/api/v1/webhook/n8n')
        .send(payload)
        .expect(200);

      expect(response.body.status).toBe('received');
    });

    it('should validate webhook payloads', async () => {
      await request(app)
        .post('/api/v1/webhook/nanda')
        .send({}) // Empty payload
        .expect(400);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Mock database error
      jest.spyOn(console, 'error').mockImplementation();

      const response = await request(app)
        .get('/api/v1/items')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle malformed request bodies', async () => {
      const response = await request(app)
        .post('/api/v1/items')
        .send('invalid json')
        .type('application/json')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle unauthorized requests', async () => {
      const response = await request(app)
        .post('/api/v1/admin/setup-database')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on AI endpoints', async () => {
      // Make multiple rapid requests
      const promises = Array(10).fill(null).map(() =>
        request(app).get('/api/v1/ai/insights')
      );

      const responses = await Promise.all(promises);
      const rateLimited = responses.some(r => r.status === 429);

      expect(rateLimited).toBe(true);
    });
  });

  describe('Data Validation', () => {
    it('should validate item price is positive', async () => {
      const invalidItem = {
        name: 'Test Item',
        category: 'Test',
        quantity: 1,
        unitPrice: -100,
        location: 'Test Room',
        sku: 'TEST-001',
      };

      const response = await request(app)
        .post('/api/v1/items')
        .send(invalidItem)
        .expect(400);

      expect(response.body.error).toContain('price');
    });

    it('should validate quantity is non-negative', async () => {
      const invalidItem = {
        name: 'Test Item',
        category: 'Test',
        quantity: -5,
        unitPrice: 100,
        location: 'Test Room',
        sku: 'TEST-002',
      };

      const response = await request(app)
        .post('/api/v1/items')
        .send(invalidItem)
        .expect(400);

      expect(response.body.error).toContain('quantity');
    });

    it('should validate SKU uniqueness', async () => {
      const duplicateItem = {
        name: 'Duplicate Item',
        category: 'Test',
        quantity: 1,
        unitPrice: 100,
        location: 'Test Room',
        sku: 'EXISTING-SKU',
      };

      const response = await request(app)
        .post('/api/v1/items')
        .send(duplicateItem)
        .expect(400);

      expect(response.body.error).toContain('SKU');
    });
  });
});

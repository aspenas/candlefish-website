/**
 * Integration tests for actual API endpoints
 * Tests real Next.js API routes with proper request/response handling
 */

import { NextRequest } from 'next/server';
import { GET } from '../../app/api/health/route';
import { POST as ContactPost } from '../../app/api/contact/route';

// Mock environment variables
const originalEnv = process.env;

describe('API Endpoints Integration Tests', () => {
  beforeEach(() => {
    // Reset environment variables
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Health Check Endpoint', () => {
    it('GET /api/health - returns healthy status', async () => {
      const response = await GET();

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.status).toBe('healthy');
      expect(data.timestamp).toBeDefined();
      expect(data.uptime).toBeDefined();
      expect(data.memory).toBeDefined();
      expect(data.version).toBeDefined();
      expect(data.environment).toBeDefined();
    });

    it('returns environment information', async () => {
      process.env.NODE_ENV = 'test';
      process.env.npm_package_version = '2.0.0';

      const response = await GET();
      const data = await response.json();

      expect(data.environment).toBe('test');
      expect(data.version).toBe('2.0.0');
    });

    it('includes memory usage information', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.memory).toMatchObject({
        rss: expect.any(Number),
        heapTotal: expect.any(Number),
        heapUsed: expect.any(Number),
        external: expect.any(Number),
        arrayBuffers: expect.any(Number)
      });
    });

  });

  describe('Contact Form Endpoint', () => {
    it('POST /api/contact - successfully submits contact form', async () => {
      const contactData = {
        name: 'John Doe',
        email: 'john@example.com',
        company: 'Example Corp',
        type: 'inquiry',
        message: 'I am interested in your automation services'
      };

      const request = new NextRequest('http://localhost/api/contact', {
        method: 'POST',
        body: JSON.stringify(contactData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await ContactPost(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.message).toContain('received');
    });

    it('validates required fields', async () => {
      const incompleteData = {
        name: 'John Doe',
        email: 'john@example.com'
        // Missing type and message
      };

      const request = new NextRequest('http://localhost/api/contact', {
        method: 'POST',
        body: JSON.stringify(incompleteData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await ContactPost(request);

      expect(response.status).toBe(400);
      const data = await response.json();

      expect(data.error).toBe('Missing required fields');
    });

    it('validates email format', async () => {
      const invalidEmailData = {
        name: 'John Doe',
        email: 'invalid-email',
        type: 'inquiry',
        message: 'Test message'
      };

      const request = new NextRequest('http://localhost/api/contact', {
        method: 'POST',
        body: JSON.stringify(invalidEmailData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await ContactPost(request);

      expect(response.status).toBe(400);
      const data = await response.json();

      expect(data.error).toBe('Invalid email address');
    });

    it('accepts optional company field', async () => {
      const contactData = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        type: 'consultation',
        message: 'Looking for automation consultation'
        // No company field
      };

      const request = new NextRequest('http://localhost/api/contact', {
        method: 'POST',
        body: JSON.stringify(contactData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await ContactPost(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.success).toBe(true);
    });

    it('handles JSON parsing errors gracefully', async () => {
      const request = new NextRequest('http://localhost/api/contact', {
        method: 'POST',
        body: 'invalid-json',
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await ContactPost(request);

      expect(response.status).toBe(500);
      const data = await response.json();

      expect(data.error).toBe('Failed to process contact form');
    });
  });

  describe('Request Logging and Monitoring', () => {
    it('logs contact form submissions', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const contactData = {
        name: 'Test User',
        email: 'test@example.com',
        company: 'Test Corp',
        type: 'inquiry',
        message: 'Testing logging functionality'
      };

      const request = new NextRequest('http://localhost/api/contact', {
        method: 'POST',
        body: JSON.stringify(contactData),
        headers: { 'Content-Type': 'application/json' }
      });

      await ContactPost(request);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Contact form submission:',
        expect.objectContaining({
          timestamp: expect.any(String),
          name: 'Test User',
          email: 'test@example.com',
          company: 'Test Corp',
          type: 'inquiry'
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Data Flow Validation', () => {
    it('maintains data integrity through the contact form flow', async () => {
      const originalData = {
        name: 'Complete User',
        email: 'complete@example.com',
        company: 'Complete Company',
        type: 'consultation',
        message: 'This is a complete test message for data flow validation'
      };

      const request = new NextRequest('http://localhost/api/contact', {
        method: 'POST',
        body: JSON.stringify(originalData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await ContactPost(request);
      const result = await response.json();

      // Verify the entire flow completed successfully
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
    });

    it('validates that health check returns consistent data structure', async () => {
      // Call health check multiple times to ensure consistency
      const response1 = await GET();
      const response2 = await GET();

      const data1 = await response1.json();
      const data2 = await response2.json();

      // Structure should be consistent
      expect(Object.keys(data1)).toEqual(Object.keys(data2));
      expect(data1.status).toBe(data2.status);
      expect(data1.version).toBe(data2.version);
      expect(data1.environment).toBe(data2.environment);
    });
  });
})

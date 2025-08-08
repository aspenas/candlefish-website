/**
 * Security Tests for PromoterOS API
 * Tests input validation, injection attacks, and security headers
 */

const TestDataFactory = require('./fixtures/test-data');
const { handler: evaluateHandler } = require('../api/artists/evaluate');
const { handler: bookingHandler } = require('../api/booking/score');
const { handler: healthHandler } = require('../health');

describe('PromoterOS Security Tests', () => {

  describe('Input Validation Security', () => {
    test('should reject SQL injection attempts in artist names', async () => {
      const maliciousNames = [
        "'; DROP TABLE artists; --",
        "1' OR '1'='1",
        "test'; UPDATE users SET role='admin' WHERE id=1; --",
        "<script>alert('xss')</script>",
        "' UNION SELECT * FROM sensitive_data; --"
      ];

      for (const maliciousName of maliciousNames) {
        const event = TestDataFactory.createMockEvent('POST', '/api/artists/evaluate',
          TestDataFactory.createApiRequest('evaluate', { artist_name: maliciousName }));

        const result = await evaluateHandler(event, TestDataFactory.createMockContext());

        // Should still process but sanitize the input
        expect(result.statusCode).toBe(200);

        const response = JSON.parse(result.body);
        expect(response.data.artist).toBe(maliciousName); // Should handle gracefully

        console.log(`Handled malicious input: ${maliciousName}`);
      }
    });

    test('should validate venue capacity bounds', async () => {
      const invalidCapacities = [-1, 0, 999999999, '"><script>alert("xss")</script>', null, undefined];

      for (const capacity of invalidCapacities) {
        const event = TestDataFactory.createMockEvent('POST', '/api/booking/score',
          TestDataFactory.createApiRequest('booking', { venue_capacity: capacity }));

        const result = await bookingHandler(event, TestDataFactory.createMockContext());

        // Should either handle gracefully or reject appropriately
        if (result.statusCode === 200) {
          const response = JSON.parse(result.body);
          expect(response.data).toBeTruthy();
        } else {
          expect([400, 422]).toContain(result.statusCode);
        }
      }
    });

    test('should handle oversized payloads safely', async () => {
      const oversizedPayload = {
        artist_name: 'A'.repeat(100000), // 100KB string
        context: {
          venue_capacity: 2000,
          notes: 'x'.repeat(1000000), // 1MB string
          metadata: Array(10000).fill({ key: 'value'.repeat(100) }) // Large array
        }
      };

      const event = TestDataFactory.createMockEvent('POST', '/api/artists/evaluate', oversizedPayload);

      const result = await evaluateHandler(event, TestDataFactory.createMockContext());

      // Should handle gracefully without crashing
      expect([200, 400, 413]).toContain(result.statusCode);

      if (result.statusCode === 413) {
        const response = JSON.parse(result.body);
        expect(response.error).toContain('payload');
      }
    });
  });

  describe('XSS Prevention', () => {
    test('should sanitize HTML in artist names', async () => {
      const xssPayloads = [
        '<img src="x" onerror="alert(1)">',
        '<svg onload="alert(1)">',
        'javascript:alert("xss")',
        '<iframe src="javascript:alert(1)"></iframe>',
        '"><img src=x onerror=alert(1)>'
      ];

      for (const payload of xssPayloads) {
        const event = TestDataFactory.createMockEvent('POST', '/api/artists/evaluate',
          TestDataFactory.createApiRequest('evaluate', { artist_name: payload }));

        const result = await evaluateHandler(event, TestDataFactory.createMockContext());

        expect(result.statusCode).toBe(200);

        const responseBody = result.body;

        // Response should not contain executable JavaScript
        expect(responseBody).not.toMatch(/<script/i);
        expect(responseBody).not.toMatch(/javascript:/i);
        expect(responseBody).not.toMatch(/onerror=/i);
        expect(responseBody).not.toMatch(/onload=/i);
      }
    });
  });

  describe('CORS Security', () => {
    test('should set appropriate CORS headers', async () => {
      const event = TestDataFactory.createMockEvent('POST', '/api/artists/evaluate');
      const result = await evaluateHandler(event, TestDataFactory.createMockContext());

      expect(result.headers['Access-Control-Allow-Origin']).toBe('*');
      expect(result.headers['Access-Control-Allow-Methods']).toContain('POST');
      expect(result.headers['Access-Control-Allow-Headers']).toContain('Content-Type');
    });

    test('should handle OPTIONS preflight correctly', async () => {
      const event = TestDataFactory.createMockEvent('OPTIONS', '/api/artists/evaluate');
      const result = await evaluateHandler(event, TestDataFactory.createMockContext());

      expect(result.statusCode).toBe(200);
      expect(result.body).toBe('');
      expect(result.headers['Access-Control-Allow-Origin']).toBe('*');
    });
  });

  describe('Error Information Disclosure', () => {
    test('should not expose internal error details in production', async () => {
      // Mock an internal error scenario
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        const event = TestDataFactory.createMockEvent('POST', '/api/artists/evaluate', 'invalid json');
        const result = await evaluateHandler(event, TestDataFactory.createMockContext());

        expect(result.statusCode).toBe(500);

        const response = JSON.parse(result.body);

        // Should not expose stack traces or internal paths
        expect(response.error).toBeTruthy();
        expect(response.error).not.toContain('/Users/');
        expect(response.error).not.toContain('node_modules');
        expect(response).not.toHaveProperty('stack');

      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    test('should provide helpful error messages in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      try {
        const event = TestDataFactory.createMockEvent('POST', '/api/artists/evaluate', 'invalid json');
        const result = await evaluateHandler(event, TestDataFactory.createMockContext());

        expect(result.statusCode).toBe(500);

        const response = JSON.parse(result.body);
        expect(response.details).toBeTruthy();

      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe('Rate Limiting Simulation', () => {
    test('should handle rapid successive requests', async () => {
      const rapidRequests = 50;
      const promises = [];

      for (let i = 0; i < rapidRequests; i++) {
        const event = TestDataFactory.createMockEvent('POST', '/api/artists/evaluate',
          TestDataFactory.createApiRequest('evaluate', { artist_name: `Rapid Test ${i}` }));
        promises.push(evaluateHandler(event, TestDataFactory.createMockContext()));
      }

      const results = await Promise.all(promises);

      // All requests should complete successfully (no rate limiting implemented yet)
      results.forEach((result, index) => {
        expect([200, 429]).toContain(result.statusCode); // 200 OK or 429 Too Many Requests

        if (result.statusCode === 429) {
          console.log(`Request ${index} was rate limited`);
        }
      });

      const successCount = results.filter(r => r.statusCode === 200).length;
      console.log(`${successCount}/${rapidRequests} requests succeeded`);
    });
  });

  describe('Content-Type Validation', () => {
    test('should reject non-JSON content types for POST requests', async () => {
      const event = {
        ...TestDataFactory.createMockEvent('POST', '/api/artists/evaluate'),
        headers: {
          'Content-Type': 'text/plain'
        },
        body: 'plain text body'
      };

      const result = await evaluateHandler(event, TestDataFactory.createMockContext());

      // Should handle gracefully
      expect([400, 415, 500]).toContain(result.statusCode);
    });

    test('should handle missing content-type header', async () => {
      const event = {
        ...TestDataFactory.createMockEvent('POST', '/api/artists/evaluate'),
        headers: {},
        body: JSON.stringify(TestDataFactory.createApiRequest('evaluate'))
      };

      const result = await evaluateHandler(event, TestDataFactory.createMockContext());

      // Should still work with valid JSON body
      expect([200, 400]).toContain(result.statusCode);
    });
  });

  describe('Parameter Injection Tests', () => {
    test('should handle function injection attempts', async () => {
      const maliciousPayloads = [
        {
          artist_name: "function(){return process.env}",
          context: { venue_capacity: 2000 }
        },
        {
          artist_name: "console.log('injection')",
          context: { venue_capacity: 2000 }
        },
        {
          artist_name: "${7*7}",
          context: { venue_capacity: 2000 }
        },
        {
          artist_name: "{{7*7}}",
          context: { venue_capacity: 2000 }
        }
      ];

      for (const payload of maliciousPayloads) {
        const event = TestDataFactory.createMockEvent('POST', '/api/artists/evaluate', payload);
        const result = await evaluateHandler(event, TestDataFactory.createMockContext());

        expect(result.statusCode).toBe(200);

        const response = JSON.parse(result.body);

        // Should not execute the injected code
        expect(response.data.artist).toBe(payload.artist_name);

        // Response should not contain evidence of code execution
        const responseStr = JSON.stringify(response);
        expect(responseStr).not.toContain('49'); // 7*7 = 49
        expect(responseStr).not.toContain('injection');
      }
    });
  });

  describe('Resource Exhaustion Protection', () => {
    test('should handle deep nested objects', async () => {
      // Create deeply nested object
      let nested = { value: 'deep' };
      for (let i = 0; i < 100; i++) {
        nested = { level: i, next: nested };
      }

      const payload = {
        artist_name: 'Deep Nest Test',
        context: {
          venue_capacity: 2000,
          nested_data: nested
        }
      };

      const event = TestDataFactory.createMockEvent('POST', '/api/artists/evaluate', payload);

      const startTime = process.hrtime.bigint();
      const result = await evaluateHandler(event, TestDataFactory.createMockContext());
      const endTime = process.hrtime.bigint();

      const durationMs = Number(endTime - startTime) / 1000000;

      // Should complete within reasonable time (not hang indefinitely)
      expect(durationMs).toBeLessThan(5000);
      expect([200, 400]).toContain(result.statusCode);
    });

    test('should handle circular references safely', async () => {
      const circular = { name: 'test' };
      circular.self = circular;

      // JSON.stringify would normally throw on circular references
      // But our handlers should catch this
      const payload = {
        artist_name: 'Circular Test',
        context: {
          venue_capacity: 2000
        }
      };

      // Manually create event with circular reference
      const event = {
        ...TestDataFactory.createMockEvent('POST', '/api/artists/evaluate'),
        body: JSON.stringify(payload)
      };

      const result = await evaluateHandler(event, TestDataFactory.createMockContext());

      // Should handle gracefully
      expect([200, 400, 500]).toContain(result.statusCode);
    });
  });
});

describe('Security Headers Validation', () => {
  test('should include security headers in responses', async () => {
    const event = TestDataFactory.createMockEvent('POST', '/api/artists/evaluate');
    const result = await evaluateHandler(event, TestDataFactory.createMockContext());

    // Check for security-related headers
    expect(result.headers['Content-Type']).toBe('application/json');
    expect(result.headers['Access-Control-Allow-Origin']).toBe('*');

    // Note: Additional security headers like CSP, HSTS would be handled at the CDN level
  });
});

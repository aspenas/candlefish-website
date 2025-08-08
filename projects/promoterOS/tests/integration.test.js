/**
 * Integration Tests for PromoterOS API
 * Tests the complete flow from HTTP request to response
 */

describe('PromoterOS API Integration Tests', () => {
  const baseUrl = process.env.TEST_API_URL || 'http://localhost:9999/.netlify/functions';

  describe('Artist Evaluation Flow', () => {
    test('should handle complete artist evaluation workflow', async () => {
      // Skip if running without actual server
      if (process.env.NODE_ENV !== 'integration') {
        return;
      }

      const artistRequest = {
        artist_name: 'Chappell Roan',
        context: {
          venue_capacity: 2500,
          date: '2024-12-01',
          budget_max: 75000
        }
      };

      const response = await fetch(`${baseUrl}/api/artists/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(artistRequest)
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/json');
      expect(response.headers.get('access-control-allow-origin')).toBe('*');

      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.artist).toBe('Chappell Roan');
      expect(data.data.booking_analysis.score).toBeGreaterThanOrEqual(0);
      expect(data.data.booking_analysis.score).toBeLessThanOrEqual(100);
    });

    test('should handle booking score evaluation workflow', async () => {
      if (process.env.NODE_ENV !== 'integration') {
        return;
      }

      const bookingRequest = {
        artist_name: 'Sabrina Carpenter',
        venue_capacity: 2000,
        target_date: '2024-10-15',
        priority_factors: ['brand_alignment', 'audience_expansion_potential']
      };

      const response = await fetch(`${baseUrl}/api/booking/score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookingRequest)
      });

      expect(response.status).toBe(200);

      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.booking_score.overall_score).toBeGreaterThanOrEqual(0);
      expect(data.data.booking_score.overall_score).toBeLessThanOrEqual(100);
      expect(data.data.recommendation.action).toBeTruthy();
      expect(data.data.financial_analysis).toHaveProperty('revenue_breakdown');
      expect(data.data.action_plan).toHaveProperty('immediate_actions');
    });
  });

  describe('Health Check Integration', () => {
    test('should provide healthy system status', async () => {
      if (process.env.NODE_ENV !== 'integration') {
        return;
      }

      const response = await fetch(`${baseUrl}/health`);

      expect(response.status).toBe(200);

      const healthData = await response.json();

      expect(healthData.status).toBe('healthy');
      expect(healthData).toHaveProperty('timestamp');
      expect(healthData).toHaveProperty('version');
      expect(healthData.services.api).toBe('operational');
      expect(healthData.memory.used).toBeGreaterThan(0);
      expect(healthData.system.node_version).toBeTruthy();
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle malformed requests gracefully', async () => {
      if (process.env.NODE_ENV !== 'integration') {
        return;
      }

      const response = await fetch(`${baseUrl}/api/artists/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: 'invalid json'
      });

      expect(response.status).toBe(500);

      const errorData = await response.json();
      expect(errorData).toHaveProperty('error');
      expect(errorData).toHaveProperty('timestamp');
    });

    test('should reject invalid HTTP methods', async () => {
      if (process.env.NODE_ENV !== 'integration') {
        return;
      }

      const response = await fetch(`${baseUrl}/api/artists/evaluate`, {
        method: 'GET'
      });

      expect(response.status).toBe(405);
    });

    test('should handle CORS preflight requests', async () => {
      if (process.env.NODE_ENV !== 'integration') {
        return;
      }

      const response = await fetch(`${baseUrl}/api/artists/evaluate`, {
        method: 'OPTIONS'
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('access-control-allow-origin')).toBe('*');
      expect(response.headers.get('access-control-allow-methods')).toContain('POST');
    });
  });

  describe('Performance Integration', () => {
    test('should respond within acceptable time limits', async () => {
      if (process.env.NODE_ENV !== 'integration') {
        return;
      }

      const start = Date.now();

      const response = await fetch(`${baseUrl}/api/booking/score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          artist_name: 'Tommy Richman',
          venue_capacity: 1500
        })
      });

      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(5000); // Should respond within 5 seconds

      const data = await response.json();
      expect(data.metadata.processing_time_ms).toBeLessThan(1000); // Claimed processing time
    });
  });
});

// Mock fetch for non-integration environments
if (typeof fetch === 'undefined') {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      headers: {
        get: jest.fn((header) => {
          const headers = {
            'content-type': 'application/json',
            'access-control-allow-origin': '*',
            'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS'
          };
          return headers[header.toLowerCase()];
        })
      },
      json: () => Promise.resolve({
        success: true,
        data: {
          artist: 'Test Artist',
          booking_analysis: { score: 75 },
          booking_score: { overall_score: 80 }
        }
      })
    })
  );
}

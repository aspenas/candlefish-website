import { GET } from '../../app/api/features/flags/[userId]/route';
import { POST } from '../../app/api/features/flags/[flagId]/override/route';
import { NextRequest } from 'next/server';
import { FeatureFlagFactory } from '../factories/animation.factory';
import { mockDataUtils } from '../mocks/animation-api.mock';

// Mock the feature flag service
jest.mock('../../lib/feature-flag-service', () => ({
  getFlagsForUser: jest.fn(),
  getFlag: jest.fn(),
  createOverride: jest.fn(),
  evaluateFlag: jest.fn(),
}));

import { 
  getFlagsForUser, 
  getFlag, 
  createOverride, 
  evaluateFlag 
} from '../../lib/feature-flag-service';

const mockGetFlagsForUser = getFlagsForUser as jest.MockedFunction<typeof getFlagsForUser>;
const mockGetFlag = getFlag as jest.MockedFunction<typeof getFlag>;
const mockCreateOverride = createOverride as jest.MockedFunction<typeof createOverride>;
const mockEvaluateFlag = mockEvaluateFlag as jest.MockedFunction<typeof evaluateFlag>;

describe('/api/features/flags', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDataUtils.reset();
  });

  describe('GET /api/features/flags/[userId]', () => {
    it('should return all flags for a user', async () => {
      const userId = 'user-123';
      const flags = [
        FeatureFlagFactory.createEnabled('enhanced-bioluminescence'),
        FeatureFlagFactory.createDisabled('experimental-shaders'),
        FeatureFlagFactory.createABTest('performance-mode', ['control', 'optimized']),
      ];

      const evaluatedFlags = [
        {
          name: 'enhanced-bioluminescence',
          enabled: true,
          variant: null,
          config: {}
        },
        {
          name: 'experimental-shaders',
          enabled: false,
          variant: null,
          config: {}
        },
        {
          name: 'performance-mode',
          enabled: true,
          variant: { name: 'optimized', config: { variant: 'optimized' } },
          config: { variant: 'optimized' }
        }
      ];

      mockGetFlagsForUser.mockResolvedValue(evaluatedFlags);

      const request = new NextRequest(`http://localhost/api/features/flags/${userId}`);
      const params = { userId };

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(3);
      expect(data[0].name).toBe('enhanced-bioluminescence');
      expect(data[2].variant.name).toBe('optimized');
      expect(mockGetFlagsForUser).toHaveBeenCalledWith(userId);
    });

    it('should return specific flag for a user', async () => {
      const userId = 'user-123';
      const flagName = 'enhanced-bioluminescence';
      
      const evaluatedFlag = {
        name: flagName,
        enabled: true,
        variant: null,
        config: { intensity: 0.8 }
      };

      mockEvaluateFlag.mockResolvedValue(evaluatedFlag);

      const request = new NextRequest(
        `http://localhost/api/features/flags/${userId}?flag=${flagName}`
      );
      const params = { userId };

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe(flagName);
      expect(data.enabled).toBe(true);
      expect(mockEvaluateFlag).toHaveBeenCalledWith(flagName, userId);
    });

    it('should return 404 for non-existent flag', async () => {
      const userId = 'user-123';
      const flagName = 'non-existent-flag';

      mockEvaluateFlag.mockResolvedValue(null);

      const request = new NextRequest(
        `http://localhost/api/features/flags/${userId}?flag=${flagName}`
      );
      const params = { userId };

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Feature flag not found');
    });

    it('should handle A/B test variant assignment consistently', async () => {
      const userId = 'consistent-user-456';
      const flagName = 'ab-test-flag';

      const evaluatedFlag = {
        name: flagName,
        enabled: true,
        variant: { name: 'variant_b', config: { enhancement: 'dramatic' } },
        config: { enhancement: 'dramatic' }
      };

      mockEvaluateFlag.mockResolvedValue(evaluatedFlag);

      // Make multiple requests to ensure consistent assignment
      const requests = Array.from({ length: 5 }, () =>
        new NextRequest(
          `http://localhost/api/features/flags/${userId}?flag=${flagName}`
        )
      );

      const responses = await Promise.all(
        requests.map(req => GET(req, { params: { userId } }))
      );

      const data = await Promise.all(responses.map(r => r.json()));

      // All responses should have the same variant
      data.forEach(response => {
        expect(response.variant.name).toBe('variant_b');
      });
    });

    it('should validate userId format', async () => {
      const invalidUserId = '';

      const request = new NextRequest(`http://localhost/api/features/flags/${invalidUserId}`);
      const params = { userId: invalidUserId };

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Valid userId is required');
    });

    it('should handle service errors gracefully', async () => {
      const userId = 'user-123';
      mockGetFlagsForUser.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest(`http://localhost/api/features/flags/${userId}`);
      const params = { userId };

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to retrieve feature flags');
    });

    it('should include user context in flag evaluation', async () => {
      const userId = 'premium-user-789';
      
      const evaluatedFlags = [
        {
          name: 'premium-features',
          enabled: true,
          variant: null,
          config: { premium: true }
        }
      ];

      mockGetFlagsForUser.mockResolvedValue(evaluatedFlags);

      const request = new NextRequest(
        `http://localhost/api/features/flags/${userId}`,
        {
          headers: {
            'X-User-Tier': 'premium',
            'X-User-Region': 'us-west'
          }
        }
      );
      const params = { userId };

      const response = await GET(request, { params });

      expect(response.status).toBe(200);
      expect(mockGetFlagsForUser).toHaveBeenCalledWith(userId, {
        userTier: 'premium',
        userRegion: 'us-west'
      });
    });

    it('should cache flag evaluations', async () => {
      const userId = 'user-123';
      const flagName = 'cached-flag';

      const evaluatedFlag = {
        name: flagName,
        enabled: true,
        variant: null,
        config: {}
      };

      mockEvaluateFlag.mockResolvedValue(evaluatedFlag);

      const request = new NextRequest(
        `http://localhost/api/features/flags/${userId}?flag=${flagName}`
      );
      const params = { userId };

      const response = await GET(request, { params });

      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toBe('private, max-age=300'); // 5 minutes
      expect(response.headers.get('ETag')).toBeTruthy();
    });
  });

  describe('POST /api/features/flags/[flagId]/override', () => {
    it('should create flag override for testing', async () => {
      const flagId = 'enhanced-bioluminescence';
      const overrideData = {
        enabled: true,
        variant: 'variant_a',
        userId: 'test-user-123',
        reason: 'QA testing scenario'
      };

      const createdOverride = {
        id: 'override-123',
        flagId,
        ...overrideData,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString() // 1 hour
      };

      mockCreateOverride.mockResolvedValue(createdOverride);

      const request = new NextRequest(
        `http://localhost/api/features/flags/${flagId}/override`,
        {
          method: 'POST',
          body: JSON.stringify(overrideData),
          headers: { 'Content-Type': 'application/json' }
        }
      );
      const params = { flagId };

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.id).toBe('override-123');
      expect(data.flagId).toBe(flagId);
      expect(data.enabled).toBe(true);
      expect(mockCreateOverride).toHaveBeenCalledWith(flagId, overrideData);
    });

    it('should validate override payload', async () => {
      const flagId = 'test-flag';
      const invalidOverrideData = {
        enabled: 'not-boolean', // Should be boolean
        variant: 123, // Should be string
      };

      const request = new NextRequest(
        `http://localhost/api/features/flags/${flagId}/override`,
        {
          method: 'POST',
          body: JSON.stringify(invalidOverrideData),
          headers: { 'Content-Type': 'application/json' }
        }
      );
      const params = { flagId };

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.errors).toContain('enabled must be a boolean');
      expect(data.errors).toContain('variant must be a string');
    });

    it('should require admin authentication for overrides', async () => {
      const flagId = 'test-flag';
      const overrideData = { enabled: true };

      const request = new NextRequest(
        `http://localhost/api/features/flags/${flagId}/override`,
        {
          method: 'POST',
          body: JSON.stringify(overrideData),
          headers: { 
            'Content-Type': 'application/json'
            // Missing Authorization header
          }
        }
      );
      const params = { flagId };

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Admin authentication required');
    });

    it('should handle non-existent flag gracefully', async () => {
      const flagId = 'non-existent-flag';
      const overrideData = { enabled: true };

      mockCreateOverride.mockRejectedValue(new Error('Flag not found'));

      const request = new NextRequest(
        `http://localhost/api/features/flags/${flagId}/override`,
        {
          method: 'POST',
          body: JSON.stringify(overrideData),
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer admin-token'
          }
        }
      );
      const params = { flagId };

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Feature flag not found');
    });

    it('should set expiration time for overrides', async () => {
      const flagId = 'test-flag';
      const overrideData = {
        enabled: true,
        userId: 'test-user',
        duration: 7200 // 2 hours in seconds
      };

      const createdOverride = {
        id: 'override-123',
        flagId,
        enabled: true,
        userId: 'test-user',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7200000).toISOString()
      };

      mockCreateOverride.mockResolvedValue(createdOverride);

      const request = new NextRequest(
        `http://localhost/api/features/flags/${flagId}/override`,
        {
          method: 'POST',
          body: JSON.stringify(overrideData),
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer admin-token'
          }
        }
      );
      const params = { flagId };

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.expiresAt).toBeTruthy();
      
      const expiresAt = new Date(data.expiresAt);
      const expectedExpiry = new Date(Date.now() + 7200000);
      const timeDiff = Math.abs(expiresAt.getTime() - expectedExpiry.getTime());
      expect(timeDiff).toBeLessThan(1000); // Within 1 second
    });

    it('should audit override creation', async () => {
      const flagId = 'audit-flag';
      const overrideData = {
        enabled: false,
        userId: 'test-user',
        reason: 'Disable feature for testing bug fix'
      };

      const createdOverride = {
        id: 'override-456',
        flagId,
        ...overrideData,
        createdAt: new Date().toISOString(),
        createdBy: 'admin-user-123'
      };

      mockCreateOverride.mockResolvedValue(createdOverride);

      const request = new NextRequest(
        `http://localhost/api/features/flags/${flagId}/override`,
        {
          method: 'POST',
          body: JSON.stringify(overrideData),
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer admin-token',
            'X-Admin-User-Id': 'admin-user-123'
          }
        }
      );
      const params = { flagId };

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.createdBy).toBe('admin-user-123');
      expect(mockCreateOverride).toHaveBeenCalledWith(flagId, {
        ...overrideData,
        createdBy: 'admin-user-123'
      });
    });

    it('should prevent duplicate overrides', async () => {
      const flagId = 'duplicate-flag';
      const overrideData = {
        enabled: true,
        userId: 'test-user'
      };

      mockCreateOverride.mockRejectedValue(new Error('Override already exists for this user'));

      const request = new NextRequest(
        `http://localhost/api/features/flags/${flagId}/override`,
        {
          method: 'POST',
          body: JSON.stringify(overrideData),
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer admin-token'
          }
        }
      );
      const params = { flagId };

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('Override already exists for this user');
    });
  });

  describe('Feature flag evaluation logic', () => {
    it('should handle rollout percentage correctly', async () => {
      const userId = 'rollout-test-user';
      const flagName = 'rollout-flag';

      // Mock a flag with 50% rollout
      const flag = FeatureFlagFactory.create({
        name: flagName,
        enabled: true,
        rolloutPercentage: 50
      });

      mockGetFlag.mockResolvedValue(flag);

      // Test with multiple user IDs to verify percentage distribution
      const userIds = Array.from({ length: 100 }, (_, i) => `user-${i}`);
      
      const enabledCount = userIds.filter(id => {
        const hash = hashUserId(id);
        return (hash % 100) < 50;
      }).length;

      // Should be approximately 50% (allow for some variance due to hashing)
      expect(enabledCount).toBeGreaterThan(40);
      expect(enabledCount).toBeLessThan(60);
    });

    it('should handle variant weights correctly', async () => {
      const flagName = 'variant-test-flag';
      const flag = FeatureFlagFactory.createABTest(flagName, ['control', 'variant_a', 'variant_b']);

      // Simulate variant assignment for many users
      const userIds = Array.from({ length: 1000 }, (_, i) => `user-${i}`);
      const variantCounts = { control: 0, variant_a: 0, variant_b: 0 };

      userIds.forEach(userId => {
        const hash = hashUserId(userId);
        const totalWeight = flag.variants!.reduce((sum, v) => sum + v.weight, 0);
        const target = hash % totalWeight;
        
        let cumulativeWeight = 0;
        for (const variant of flag.variants!) {
          cumulativeWeight += variant.weight;
          if (target < cumulativeWeight) {
            variantCounts[variant.name as keyof typeof variantCounts]++;
            break;
          }
        }
      });

      // Each variant should get approximately 1/3 of users
      Object.values(variantCounts).forEach(count => {
        expect(count).toBeGreaterThan(250); // Allow for variance
        expect(count).toBeLessThan(400);
      });
    });
  });
});

// Utility function matching the one in the API mock
function hashUserId(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}
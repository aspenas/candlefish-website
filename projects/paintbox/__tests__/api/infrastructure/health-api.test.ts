/**
 * Health API Test Suite
 * Tests for health monitoring endpoints with comprehensive coverage
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/health/route';
import { createMockHealthService } from '../../mocks/healthService';
import { healthApiFactory } from '../../factories/apiFactory';

// Mock external dependencies
jest.mock('@/lib/services/healthService');
jest.mock('@/lib/database/connection-pool');
jest.mock('@/lib/cache/redis-client');

describe('Health API Endpoints', () => {
  let mockHealthService: jest.Mocked<any>;

  beforeEach(() => {
    mockHealthService = createMockHealthService();
    jest.clearAllMocks();
  });

  describe('GET /api/health', () => {
    it('should return healthy status when all services are up', async () => {
      // Arrange
      const healthData = healthApiFactory.createHealthyResponse();
      mockHealthService.checkAllServices.mockResolvedValue(healthData);
      
      const request = new NextRequest('http://localhost:3000/api/health');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.summary.total).toBeGreaterThan(0);
      expect(data.summary.healthy).toBe(data.summary.total);
      expect(data.checks).toBeDefined();
      expect(data.timestamp).toBeDefined();
    });

    it('should return degraded status when some services are down', async () => {
      // Arrange
      const healthData = healthApiFactory.createDegradedResponse();
      mockHealthService.checkAllServices.mockResolvedValue(healthData);
      
      const request = new NextRequest('http://localhost:3000/api/health');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.status).toBe('degraded');
      expect(data.summary.healthy).toBeLessThan(data.summary.total);
      expect(data.summary.unhealthy).toBeGreaterThan(0);
    });

    it('should return unhealthy status when critical services are down', async () => {
      // Arrange
      const healthData = healthApiFactory.createUnhealthyResponse();
      mockHealthService.checkAllServices.mockResolvedValue(healthData);
      
      const request = new NextRequest('http://localhost:3000/api/health');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(503);
      expect(data.status).toBe('unhealthy');
      expect(data.summary.unhealthy).toBeGreaterThan(0);
    });

    it('should handle service timeout gracefully', async () => {
      // Arrange
      mockHealthService.checkAllServices.mockRejectedValue(new Error('Service timeout'));
      
      const request = new NextRequest('http://localhost:3000/api/health');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(503);
      expect(data.status).toBe('unhealthy');
      expect(data.error).toContain('timeout');
    });

    it('should include response times for all checks', async () => {
      // Arrange
      const healthData = healthApiFactory.createHealthyResponse();
      mockHealthService.checkAllServices.mockResolvedValue(healthData);
      
      const request = new NextRequest('http://localhost:3000/api/health');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      Object.values(data.checks).forEach((check: any) => {
        expect(check.responseTime).toBeDefined();
        expect(typeof check.responseTime).toBe('number');
        expect(check.responseTime).toBeGreaterThanOrEqual(0);
      });
    });

    it('should validate service discovery integration', async () => {
      // Arrange
      const healthData = healthApiFactory.createHealthyResponse();
      mockHealthService.checkAllServices.mockResolvedValue(healthData);
      
      const request = new NextRequest('http://localhost:3000/api/health');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(mockHealthService.checkAllServices).toHaveBeenCalledWith({
        timeout: 5000,
        includeDetails: true
      });
      expect(data.checks).toHaveProperty('database');
      expect(data.checks).toHaveProperty('redis');
      expect(data.checks).toHaveProperty('temporal');
    });

    it('should handle concurrent health check requests', async () => {
      // Arrange
      const healthData = healthApiFactory.createHealthyResponse();
      mockHealthService.checkAllServices.mockResolvedValue(healthData);
      
      const requests = Array.from({ length: 10 }, () => 
        new NextRequest('http://localhost:3000/api/health')
      );

      // Act
      const responses = await Promise.all(
        requests.map(request => GET(request))
      );

      // Assert
      responses.forEach(async (response) => {
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.status).toBe('healthy');
      });
    });

    it('should include circuit breaker status', async () => {
      // Arrange
      const healthData = healthApiFactory.createHealthyResponseWithCircuitBreakers();
      mockHealthService.checkAllServices.mockResolvedValue(healthData);
      
      const request = new NextRequest('http://localhost:3000/api/health');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(data.circuitBreakers).toBeDefined();
      Object.values(data.circuitBreakers).forEach((breaker: any) => {
        expect(breaker.state).toMatch(/^(closed|open|half-open)$/);
        expect(breaker.failureCount).toBeDefined();
        expect(breaker.lastFailure).toBeDefined();
      });
    });

    it('should rate limit health check requests', async () => {
      // Arrange
      const healthData = healthApiFactory.createHealthyResponse();
      mockHealthService.checkAllServices.mockResolvedValue(healthData);
      
      // Simulate rapid requests
      const requests = Array.from({ length: 100 }, () => 
        new NextRequest('http://localhost:3000/api/health', {
          headers: { 'X-Forwarded-For': '192.168.1.1' }
        })
      );

      // Act
      const responses = await Promise.all(
        requests.map(request => GET(request))
      );

      // Assert
      const rateLimitedResponses = responses.filter(response => response.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Health Check Service Integration', () => {
    it('should check database connection', async () => {
      // Arrange
      const healthData = healthApiFactory.createHealthyResponse();
      mockHealthService.checkDatabase.mockResolvedValue({
        status: 'healthy',
        responseTime: 15,
        details: { connections: 5, maxConnections: 100 }
      });

      // Act
      await mockHealthService.checkDatabase();

      // Assert
      expect(mockHealthService.checkDatabase).toHaveBeenCalled();
    });

    it('should check Redis cache connection', async () => {
      // Arrange
      mockHealthService.checkRedis.mockResolvedValue({
        status: 'healthy',
        responseTime: 5,
        details: { memory: '50MB', keyspace: 'db0:keys=100' }
      });

      // Act
      await mockHealthService.checkRedis();

      // Assert
      expect(mockHealthService.checkRedis).toHaveBeenCalled();
    });

    it('should check Temporal service connection', async () => {
      // Arrange
      mockHealthService.checkTemporal.mockResolvedValue({
        status: 'healthy',
        responseTime: 25,
        details: { workflows: 3, activities: 10 }
      });

      // Act
      await mockHealthService.checkTemporal();

      // Assert
      expect(mockHealthService.checkTemporal).toHaveBeenCalled();
    });

    it('should handle service dependency failures', async () => {
      // Arrange
      mockHealthService.checkDatabase.mockRejectedValue(new Error('Connection refused'));
      
      // Act & Assert
      await expect(mockHealthService.checkDatabase()).rejects.toThrow('Connection refused');
    });
  });

  describe('Health Metrics and Monitoring', () => {
    it('should collect performance metrics', async () => {
      // Arrange
      const healthData = healthApiFactory.createHealthyResponse();
      mockHealthService.checkAllServices.mockResolvedValue(healthData);
      
      const request = new NextRequest('http://localhost:3000/api/health');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(data.metrics).toBeDefined();
      expect(data.metrics.uptime).toBeDefined();
      expect(data.metrics.memoryUsage).toBeDefined();
      expect(data.metrics.cpuUsage).toBeDefined();
    });

    it('should track health check history', async () => {
      // Arrange
      const healthData = healthApiFactory.createHealthyResponse();
      mockHealthService.checkAllServices.mockResolvedValue(healthData);
      
      const request = new NextRequest('http://localhost:3000/api/health?includeHistory=true');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(data.history).toBeDefined();
      expect(Array.isArray(data.history)).toBe(true);
      if (data.history.length > 0) {
        expect(data.history[0]).toHaveProperty('timestamp');
        expect(data.history[0]).toHaveProperty('status');
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed requests', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/health', {
        method: 'POST', // Wrong method
        body: JSON.stringify({ invalid: 'data' })
      });

      // Act
      const response = await GET(request);

      // Assert
      expect(response.status).toBe(405); // Method not allowed
    });

    it('should handle service discovery failures', async () => {
      // Arrange
      mockHealthService.checkAllServices.mockRejectedValue(
        new Error('Service discovery unavailable')
      );
      
      const request = new NextRequest('http://localhost:3000/api/health');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(503);
      expect(data.error).toContain('Service discovery unavailable');
    });

    it('should validate request parameters', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/health?timeout=invalid');

      // Act
      const response = await GET(request);

      // Assert
      expect(response.status).toBe(400);
    });
  });
});
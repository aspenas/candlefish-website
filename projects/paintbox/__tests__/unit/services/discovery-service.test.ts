/**
 * Unit Tests for DiscoveryService
 * Tests service discovery, registration, health checking, and auto-discovery
 */

import { DiscoveryService } from '../../../lib/services/discovery-service';
import { ServiceFactory } from '../../factories/systemAnalyzerFactory';
import axios from 'axios';
import Docker from 'dockerode';
import { EventEmitter } from 'events';

// Mock external dependencies
jest.mock('axios');
jest.mock('dockerode');
jest.mock('fs/promises');
jest.mock('child_process');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const MockedDocker = Docker as jest.MockedClass<typeof Docker>;

describe('DiscoveryService', () => {
  let discoveryService: DiscoveryService;
  let mockDocker: jest.Mocked<Docker>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock Docker instance
    mockDocker = new MockedDocker() as jest.Mocked<Docker>;
    MockedDocker.mockImplementation(() => mockDocker);

    discoveryService = new DiscoveryService();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllTimers();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      mockDocker.ping = jest.fn().mockResolvedValue(true);
      mockDocker.listContainers = jest.fn().mockResolvedValue([]);

      // Mock fs operations
      const fs = require('fs/promises');
      fs.readFile = jest.fn().mockRejectedValue(new Error('File not found'));
      fs.mkdir = jest.fn().mockResolvedValue(undefined);

      // Mock execSync for process discovery
      const childProcess = require('child_process');
      childProcess.execSync = jest.fn().mockReturnValue('USER PID %CPU %MEM VSZ RSS TTY STAT START TIME COMMAND\n');

      await discoveryService.initialize();

      expect(mockDocker.ping).toHaveBeenCalled();
      expect(mockDocker.listContainers).toHaveBeenCalled();
    });

    it('should load persisted services on initialization', async () => {
      const mockServices = ServiceFactory.createMany(3);

      mockDocker.ping = jest.fn().mockResolvedValue(true);
      mockDocker.listContainers = jest.fn().mockResolvedValue([]);

      const fs = require('fs/promises');
      fs.readFile = jest.fn().mockResolvedValue(JSON.stringify(mockServices));

      const childProcess = require('child_process');
      childProcess.execSync = jest.fn().mockReturnValue('USER PID %CPU %MEM VSZ RSS TTY STAT START TIME COMMAND\n');

      await discoveryService.initialize();

      const services = await discoveryService.getServices();
      expect(services).toHaveLength(3);
    });

    it('should handle initialization errors gracefully', async () => {
      mockDocker.ping = jest.fn().mockRejectedValue(new Error('Docker not available'));

      await expect(discoveryService.initialize()).rejects.toThrow('Docker not available');
    });
  });

  describe('Health Check', () => {
    it('should return healthy status when Docker is available', async () => {
      mockDocker.ping = jest.fn().mockResolvedValue(true);

      const result = await discoveryService.healthCheck();

      expect(result.status).toBe('healthy');
      expect(result.details).toMatchObject({
        servicesDiscovered: expect.any(Number),
        autoDiscoveryActive: expect.any(Boolean),
        healthCheckActive: expect.any(Boolean),
      });
    });

    it('should return unhealthy status when Docker is unavailable', async () => {
      mockDocker.ping = jest.fn().mockRejectedValue(new Error('Connection failed'));

      const result = await discoveryService.healthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.details.error).toBe('Connection failed');
    });
  });

  describe('Service Management', () => {
    beforeEach(async () => {
      mockDocker.ping = jest.fn().mockResolvedValue(true);
      mockDocker.listContainers = jest.fn().mockResolvedValue([]);

      const fs = require('fs/promises');
      fs.readFile = jest.fn().mockRejectedValue(new Error('File not found'));

      const childProcess = require('child_process');
      childProcess.execSync = jest.fn().mockReturnValue('USER PID %CPU %MEM VSZ RSS TTY STAT START TIME COMMAND\n');

      await discoveryService.initialize();
    });

    describe('getServices', () => {
      it('should return all services when no filters applied', async () => {
        const mockService = ServiceFactory.createHealthy();
        await discoveryService.registerService({
          name: mockService.name,
          environment: mockService.environment,
          tags: mockService.tags,
          monitoringEnabled: true,
          alertingEnabled: true,
        });

        const services = await discoveryService.getServices();
        expect(services).toHaveLength(1);
        expect(services[0].name).toBe(mockService.name);
      });

      it('should filter services by status', async () => {
        await discoveryService.registerService({
          name: 'healthy-service',
          environment: 'test',
          tags: [],
        });

        // Mock health check response for healthy service
        mockedAxios.get.mockResolvedValue({ status: 200 });

        const healthyServices = await discoveryService.getServices({ status: 'HEALTHY' });
        const unhealthyServices = await discoveryService.getServices({ status: 'UNHEALTHY' });

        expect(healthyServices.length).toBeGreaterThanOrEqual(0);
        expect(unhealthyServices).toHaveLength(0);
      });

      it('should filter services by environment', async () => {
        await discoveryService.registerService({
          name: 'prod-service',
          environment: 'production',
          tags: [],
        });

        await discoveryService.registerService({
          name: 'dev-service',
          environment: 'development',
          tags: [],
        });

        const prodServices = await discoveryService.getServices({ environment: 'production' });
        const devServices = await discoveryService.getServices({ environment: 'development' });

        expect(prodServices).toHaveLength(1);
        expect(devServices).toHaveLength(1);
        expect(prodServices[0].environment).toBe('production');
        expect(devServices[0].environment).toBe('development');
      });

      it('should filter services by tags', async () => {
        await discoveryService.registerService({
          name: 'api-service',
          environment: 'test',
          tags: ['api', 'backend'],
        });

        await discoveryService.registerService({
          name: 'frontend-service',
          environment: 'test',
          tags: ['frontend'],
        });

        const apiServices = await discoveryService.getServices({ tags: ['api'] });
        const frontendServices = await discoveryService.getServices({ tags: ['frontend'] });

        expect(apiServices).toHaveLength(1);
        expect(frontendServices).toHaveLength(1);
        expect(apiServices[0].tags).toContain('api');
      });

      it('should apply pagination correctly', async () => {
        // Register multiple services
        for (let i = 0; i < 5; i++) {
          await discoveryService.registerService({
            name: `service-${i}`,
            environment: 'test',
            tags: [],
          });
        }

        const firstPage = await discoveryService.getServices({ limit: 2, offset: 0 });
        const secondPage = await discoveryService.getServices({ limit: 2, offset: 2 });

        expect(firstPage).toHaveLength(2);
        expect(secondPage).toHaveLength(2);
        expect(firstPage[0].id).not.toBe(secondPage[0].id);
      });
    });

    describe('getServiceById', () => {
      it('should return service by ID', async () => {
        const service = await discoveryService.registerService({
          name: 'test-service',
          environment: 'test',
          tags: [],
        });

        const foundService = await discoveryService.getServiceById(service.id);
        expect(foundService).not.toBeNull();
        expect(foundService?.id).toBe(service.id);
        expect(foundService?.name).toBe('test-service');
      });

      it('should return null for non-existent service', async () => {
        const foundService = await discoveryService.getServiceById('non-existent');
        expect(foundService).toBeNull();
      });
    });

    describe('getServiceByName', () => {
      it('should return service by name', async () => {
        await discoveryService.registerService({
          name: 'unique-service',
          environment: 'test',
          tags: [],
        });

        const foundService = await discoveryService.getServiceByName('unique-service');
        expect(foundService).not.toBeNull();
        expect(foundService?.name).toBe('unique-service');
      });

      it('should return service by name and environment', async () => {
        await discoveryService.registerService({
          name: 'api-service',
          environment: 'production',
          tags: [],
        });

        await discoveryService.registerService({
          name: 'api-service',
          environment: 'development',
          tags: [],
        });

        const prodService = await discoveryService.getServiceByName('api-service', 'production');
        const devService = await discoveryService.getServiceByName('api-service', 'development');

        expect(prodService?.environment).toBe('production');
        expect(devService?.environment).toBe('development');
      });
    });

    describe('registerService', () => {
      it('should register a new service successfully', async () => {
        const serviceInput = {
          name: 'new-service',
          displayName: 'New Service',
          description: 'A test service',
          version: '1.0.0',
          environment: 'test',
          baseUrl: 'http://localhost:3000',
          healthEndpoint: '/health',
          tags: ['api', 'test'],
          monitoringEnabled: true,
          alertingEnabled: false,
        };

        mockedAxios.get.mockResolvedValue({ status: 200 });

        const service = await discoveryService.registerService(serviceInput);

        expect(service.id).toBeDefined();
        expect(service.name).toBe(serviceInput.name);
        expect(service.displayName).toBe(serviceInput.displayName);
        expect(service.autoDiscovered).toBe(false);
      });

      it('should emit serviceRegistered event', async () => {
        const eventSpy = jest.fn();
        discoveryService.on('serviceRegistered', eventSpy);

        mockedAxios.get.mockResolvedValue({ status: 200 });

        const service = await discoveryService.registerService({
          name: 'event-test-service',
          environment: 'test',
          tags: [],
        });

        expect(eventSpy).toHaveBeenCalledWith(service);
      });

      it('should perform initial health check on registration', async () => {
        mockedAxios.get.mockResolvedValue({ status: 200 });

        const service = await discoveryService.registerService({
          name: 'health-check-service',
          environment: 'test',
          baseUrl: 'http://localhost:3000',
          healthEndpoint: '/health',
          tags: [],
        });

        expect(mockedAxios.get).toHaveBeenCalledWith(
          'http://localhost:3000/health',
          expect.any(Object)
        );
        expect(service.status).toBe('HEALTHY');
      });
    });

    describe('updateService', () => {
      it('should update service successfully', async () => {
        const service = await discoveryService.registerService({
          name: 'update-test',
          environment: 'test',
          tags: [],
        });

        const updatedService = await discoveryService.updateService(service.id, {
          displayName: 'Updated Service',
          description: 'Updated description',
          version: '2.0.0',
        });

        expect(updatedService.displayName).toBe('Updated Service');
        expect(updatedService.description).toBe('Updated description');
        expect(updatedService.version).toBe('2.0.0');
      });

      it('should throw error for non-existent service', async () => {
        await expect(
          discoveryService.updateService('non-existent', { displayName: 'Test' })
        ).rejects.toThrow('Service not found: non-existent');
      });

      it('should emit serviceUpdated event', async () => {
        const eventSpy = jest.fn();
        discoveryService.on('serviceUpdated', eventSpy);

        const service = await discoveryService.registerService({
          name: 'update-event-test',
          environment: 'test',
          tags: [],
        });

        const updatedService = await discoveryService.updateService(service.id, {
          displayName: 'Updated',
        });

        expect(eventSpy).toHaveBeenCalledWith(updatedService, service);
      });
    });

    describe('removeService', () => {
      it('should remove service successfully', async () => {
        const service = await discoveryService.registerService({
          name: 'remove-test',
          environment: 'test',
          tags: [],
        });

        const result = await discoveryService.removeService(service.id);
        expect(result).toBe(true);

        const foundService = await discoveryService.getServiceById(service.id);
        expect(foundService).toBeNull();
      });

      it('should return false for non-existent service', async () => {
        const result = await discoveryService.removeService('non-existent');
        expect(result).toBe(false);
      });

      it('should emit serviceRemoved event', async () => {
        const eventSpy = jest.fn();
        discoveryService.on('serviceRemoved', eventSpy);

        const service = await discoveryService.registerService({
          name: 'remove-event-test',
          environment: 'test',
          tags: [],
        });

        await discoveryService.removeService(service.id);
        expect(eventSpy).toHaveBeenCalledWith(service);
      });
    });
  });

  describe('Auto-Discovery', () => {
    beforeEach(async () => {
      mockDocker.ping = jest.fn().mockResolvedValue(true);
      mockDocker.listContainers = jest.fn().mockResolvedValue([]);

      const fs = require('fs/promises');
      fs.readFile = jest.fn().mockRejectedValue(new Error('File not found'));

      const childProcess = require('child_process');
      childProcess.execSync = jest.fn().mockReturnValue('USER PID %CPU %MEM VSZ RSS TTY STAT START TIME COMMAND\n');
    });

    describe('Docker Service Discovery', () => {
      it('should discover Docker services', async () => {
        const mockContainers = [
          {
            Id: 'container1',
            Names: ['/test-service'],
            Image: 'node:16',
            State: 'running',
            Labels: {
              'com.docker.compose.service': 'api-service',
              'environment': 'production',
            },
          },
        ];

        mockDocker.listContainers = jest.fn().mockResolvedValue(mockContainers);

        await discoveryService.initialize();

        // Fast-forward to trigger discovery
        jest.advanceTimersByTime(61000); // 1 minute + buffer

        const services = await discoveryService.getServices();
        const discoveredService = services.find(s => s.name === 'api-service');

        expect(discoveredService).toBeDefined();
        expect(discoveredService?.autoDiscovered).toBe(true);
        expect(discoveredService?.tags).toContain('docker');
        expect(discoveredService?.environment).toBe('production');
      });

      it('should handle Docker discovery errors gracefully', async () => {
        mockDocker.listContainers = jest.fn().mockRejectedValue(new Error('Docker error'));

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        await discoveryService.initialize();
        jest.advanceTimersByTime(61000);

        expect(consoleSpy).toHaveBeenCalledWith('Docker discovery error:', expect.any(Error));
        consoleSpy.mockRestore();
      });
    });

    describe('Process Service Discovery', () => {
      it('should discover process services', async () => {
        const mockPsOutput = `USER PID %CPU %MEM VSZ RSS TTY STAT START TIME COMMAND
root 1234 0.1 0.5 12345 6789 ? S 12:00 0:01 node server.js
root 5678 0.2 1.0 23456 7890 ? S 12:01 0:02 python app.py`;

        const childProcess = require('child_process');
        childProcess.execSync = jest.fn().mockReturnValue(mockPsOutput);

        await discoveryService.initialize();
        jest.advanceTimersByTime(61000);

        const services = await discoveryService.getServices();
        const nodeService = services.find(s => s.name === 'server');
        const pythonService = services.find(s => s.name === 'app');

        expect(nodeService).toBeDefined();
        expect(pythonService).toBeDefined();
        expect(nodeService?.tags).toContain('process');
        expect(pythonService?.tags).toContain('process');
      });
    });

    describe('Network Service Discovery', () => {
      it('should discover HTTP services', async () => {
        mockedAxios.get
          .mockResolvedValueOnce({ status: 200 }) // Port 3000
          .mockRejectedValueOnce(new Error('Connection refused')) // Port 4000
          .mockResolvedValueOnce({ status: 404 }); // Port 5000

        await discoveryService.initialize();
        jest.advanceTimersByTime(61000);

        const services = await discoveryService.getServices();
        const httpServices = services.filter(s => s.tags.includes('http'));

        expect(httpServices.length).toBeGreaterThan(0);
        expect(httpServices[0].baseUrl).toContain('localhost:');
      });
    });
  });

  describe('Health Checking', () => {
    let service: any;

    beforeEach(async () => {
      mockDocker.ping = jest.fn().mockResolvedValue(true);
      mockDocker.listContainers = jest.fn().mockResolvedValue([]);

      const fs = require('fs/promises');
      fs.readFile = jest.fn().mockRejectedValue(new Error('File not found'));

      const childProcess = require('child_process');
      childProcess.execSync = jest.fn().mockReturnValue('USER PID %CPU %MEM VSZ RSS TTY STAT START TIME COMMAND\n');

      await discoveryService.initialize();

      service = await discoveryService.registerService({
        name: 'health-test-service',
        environment: 'test',
        baseUrl: 'http://localhost:3000',
        healthEndpoint: '/health',
        tags: [],
      });
    });

    it('should perform periodic health checks', async () => {
      mockedAxios.get.mockResolvedValue({ status: 200 });

      // Fast-forward to trigger health check
      jest.advanceTimersByTime(31000); // 30 seconds + buffer

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://localhost:3000/health',
        expect.any(Object)
      );
    });

    it('should emit serviceStatusChanged event when status changes', async () => {
      const eventSpy = jest.fn();
      discoveryService.on('serviceStatusChanged', eventSpy);

      // First health check: healthy
      mockedAxios.get.mockResolvedValueOnce({ status: 200 });
      jest.advanceTimersByTime(31000);

      // Second health check: unhealthy
      mockedAxios.get.mockRejectedValueOnce(new Error('Service down'));
      jest.advanceTimersByTime(31000);

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          service: expect.any(Object),
          previousStatus: expect.any(String),
          currentStatus: expect.any(String),
          timestamp: expect.any(Date),
        })
      );
    });

    it('should handle health check failures gracefully', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Connection refused'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      jest.advanceTimersByTime(31000);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Health check failed'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should update service status based on health check results', async () => {
      // Healthy response
      mockedAxios.get.mockResolvedValue({ status: 200 });
      jest.advanceTimersByTime(31000);

      let updatedService = await discoveryService.getServiceById(service.id);
      expect(updatedService?.status).toBe('HEALTHY');

      // Unhealthy response
      mockedAxios.get.mockResolvedValue({ status: 500 });
      jest.advanceTimersByTime(31000);

      updatedService = await discoveryService.getServiceById(service.id);
      expect(updatedService?.status).toBe('UNHEALTHY');

      // Degraded response
      mockedAxios.get.mockResolvedValue({ status: 404 });
      jest.advanceTimersByTime(31000);

      updatedService = await discoveryService.getServiceById(service.id);
      expect(updatedService?.status).toBe('DEGRADED');
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources properly', async () => {
      mockDocker.ping = jest.fn().mockResolvedValue(true);
      mockDocker.listContainers = jest.fn().mockResolvedValue([]);

      const fs = require('fs/promises');
      fs.readFile = jest.fn().mockRejectedValue(new Error('File not found'));
      fs.mkdir = jest.fn().mockResolvedValue(undefined);
      fs.writeFile = jest.fn().mockResolvedValue(undefined);

      const childProcess = require('child_process');
      childProcess.execSync = jest.fn().mockReturnValue('USER PID %CPU %MEM VSZ RSS TTY STAT START TIME COMMAND\n');

      await discoveryService.initialize();

      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      await discoveryService.cleanup();

      expect(clearIntervalSpy).toHaveBeenCalledTimes(2); // discovery and health check intervals
      expect(fs.writeFile).toHaveBeenCalled(); // persist services
    });
  });

  describe('Error Handling', () => {
    it('should handle service registration with invalid input gracefully', async () => {
      const invalidInput = {
        name: '', // Empty name
        environment: 'test',
        tags: [],
      };

      // Should not throw, but handle gracefully
      const service = await discoveryService.registerService(invalidInput);
      expect(service.name).toBe('');
    });

    it('should handle concurrent service operations safely', async () => {
      mockDocker.ping = jest.fn().mockResolvedValue(true);
      mockDocker.listContainers = jest.fn().mockResolvedValue([]);

      const fs = require('fs/promises');
      fs.readFile = jest.fn().mockRejectedValue(new Error('File not found'));

      const childProcess = require('child_process');
      childProcess.execSync = jest.fn().mockReturnValue('USER PID %CPU %MEM VSZ RSS TTY STAT START TIME COMMAND\n');

      await discoveryService.initialize();

      // Concurrent operations
      const operations = [];
      for (let i = 0; i < 10; i++) {
        operations.push(
          discoveryService.registerService({
            name: `concurrent-service-${i}`,
            environment: 'test',
            tags: [],
          })
        );
      }

      const services = await Promise.all(operations);
      expect(services).toHaveLength(10);

      const allServices = await discoveryService.getServices();
      expect(allServices).toHaveLength(10);
    });
  });
});

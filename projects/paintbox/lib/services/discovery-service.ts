import { Service, ServiceFilters, RegisterServiceInput, UpdateServiceInput, ServiceStatus } from '../types/system-analyzer';
import { EventEmitter } from 'events';
import Docker from 'dockerode';
import * as fs from 'fs/promises';
import * as path from 'path';
import axios from 'axios';

export class DiscoveryService extends EventEmitter {
  private services: Map<string, Service> = new Map();
  private docker: Docker;
  private discoveryInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private initialized = false;

  constructor() {
    super();
    this.docker = new Docker();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('🔍 Initializing Discovery Service...');
    
    try {
      // Load existing services from persistent storage
      await this.loadPersistedServices();
      
      // Start auto-discovery
      await this.startAutoDiscovery();
      
      // Start health checking
      this.startHealthChecking();
      
      this.initialized = true;
      console.log(`✅ Discovery Service initialized with ${this.services.size} services`);
    } catch (error) {
      console.error('❌ Failed to initialize Discovery Service:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
    }
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    await this.persistServices();
    console.log('✅ Discovery Service cleaned up');
  }

  async healthCheck(): Promise<{ status: string; details?: any }> {
    try {
      // Check Docker connection
      await this.docker.ping();
      
      return {
        status: 'healthy',
        details: {
          servicesDiscovered: this.services.size,
          autoDiscoveryActive: this.discoveryInterval !== null,
          healthCheckActive: this.healthCheckInterval !== null,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  // Service management methods
  async getServices(filters: ServiceFilters = {}): Promise<Service[]> {
    const { status, environment, tags, limit = 50, offset = 0 } = filters;
    let filteredServices = Array.from(this.services.values());

    // Apply filters
    if (status) {
      filteredServices = filteredServices.filter(s => s.status === status);
    }

    if (environment) {
      filteredServices = filteredServices.filter(s => s.environment === environment);
    }

    if (tags && tags.length > 0) {
      filteredServices = filteredServices.filter(s => 
        tags.some(tag => s.tags.includes(tag))
      );
    }

    // Apply pagination
    return filteredServices.slice(offset, offset + limit);
  }

  async getServicesByIds(ids: string[]): Promise<Service[]> {
    return ids.map(id => this.services.get(id)).filter(Boolean) as Service[];
  }

  async getServiceById(id: string): Promise<Service | null> {
    return this.services.get(id) || null;
  }

  async getServiceByName(name: string, environment?: string): Promise<Service | null> {
    const services = Array.from(this.services.values());
    return services.find(s => 
      s.name === name && (!environment || s.environment === environment)
    ) || null;
  }

  async registerService(input: RegisterServiceInput): Promise<Service> {
    const service: Service = {
      id: `service-${Date.now()}-${Math.random().toString(36).substring(2)}`,
      name: input.name,
      displayName: input.displayName,
      description: input.description,
      version: input.version,
      environment: input.environment,
      status: 'UNKNOWN' as ServiceStatus,
      healthEndpoint: input.healthEndpoint,
      baseUrl: input.baseUrl,
      tags: input.tags,
      dependencies: [], // Will be resolved after creation
      containers: [],
      processes: [],
      metrics: [],
      alerts: [],
      discoveredAt: new Date(),
      autoDiscovered: false,
      monitoringEnabled: input.monitoringEnabled ?? true,
      alertingEnabled: input.alertingEnabled ?? true,
      healthCheckInterval: input.healthCheckInterval,
      healthCheckTimeout: input.healthCheckTimeout,
      healthCheckRetries: input.healthCheckRetries,
    };

    this.services.set(service.id, service);

    // Perform initial health check
    await this.performHealthCheck(service);

    // Emit service registered event
    this.emit('serviceRegistered', service);

    console.log(`📝 Registered service: ${service.name} (${service.id})`);
    return service;
  }

  async updateService(id: string, input: UpdateServiceInput): Promise<Service> {
    const service = this.services.get(id);
    if (!service) {
      throw new Error(`Service not found: ${id}`);
    }

    // Update service properties
    const updatedService: Service = {
      ...service,
      displayName: input.displayName ?? service.displayName,
      description: input.description ?? service.description,
      version: input.version ?? service.version,
      baseUrl: input.baseUrl ?? service.baseUrl,
      healthEndpoint: input.healthEndpoint ?? service.healthEndpoint,
      tags: input.tags ?? service.tags,
      monitoringEnabled: input.monitoringEnabled ?? service.monitoringEnabled,
      alertingEnabled: input.alertingEnabled ?? service.alertingEnabled,
      healthCheckInterval: input.healthCheckInterval ?? service.healthCheckInterval,
      healthCheckTimeout: input.healthCheckTimeout ?? service.healthCheckTimeout,
      healthCheckRetries: input.healthCheckRetries ?? service.healthCheckRetries,
    };

    this.services.set(id, updatedService);

    // Emit service updated event
    this.emit('serviceUpdated', updatedService, service);

    console.log(`📝 Updated service: ${updatedService.name} (${id})`);
    return updatedService;
  }

  async removeService(id: string): Promise<boolean> {
    const service = this.services.get(id);
    if (!service) {
      return false;
    }

    this.services.delete(id);

    // Emit service removed event
    this.emit('serviceRemoved', service);

    console.log(`🗑️  Removed service: ${service.name} (${id})`);
    return true;
  }

  async getServiceDependencies(serviceId: string): Promise<Service[]> {
    const service = this.services.get(serviceId);
    if (!service) {
      return [];
    }

    // Return dependent services
    return service.dependencies
      .map(dep => this.services.get(dep.dependsOnId))
      .filter(Boolean) as Service[];
  }

  // Auto-discovery methods
  private async startAutoDiscovery(): Promise<void> {
    // Initial discovery
    await this.discoverDockerServices();
    await this.discoverProcessServices();
    await this.discoverNetworkServices();

    // Schedule periodic discovery
    this.discoveryInterval = setInterval(async () => {
      try {
        await this.discoverDockerServices();
        await this.discoverProcessServices();
        await this.discoverNetworkServices();
      } catch (error) {
        console.error('Discovery error:', error);
      }
    }, 60000); // Every minute
  }

  private async discoverDockerServices(): Promise<void> {
    try {
      const containers = await this.docker.listContainers({ all: true });
      
      for (const containerInfo of containers) {
        const serviceName = this.extractServiceName(containerInfo);
        const environment = this.extractEnvironment(containerInfo);
        
        if (!serviceName) continue;

        // Check if service already exists
        const existingService = Array.from(this.services.values())
          .find(s => s.name === serviceName && s.environment === environment);

        if (!existingService) {
          // Create new auto-discovered service
          const service: Service = {
            id: `service-${Date.now()}-${Math.random().toString(36).substring(2)}`,
            name: serviceName,
            displayName: containerInfo.Names[0]?.replace('/', ''),
            description: `Auto-discovered Docker service: ${serviceName}`,
            version: containerInfo.Image.split(':')[1] || 'latest',
            environment,
            status: containerInfo.State === 'running' ? 'HEALTHY' : 'UNHEALTHY',
            tags: this.extractTags(containerInfo),
            dependencies: [],
            containers: [],
            processes: [],
            metrics: [],
            alerts: [],
            discoveredAt: new Date(),
            autoDiscovered: true,
            monitoringEnabled: true,
            alertingEnabled: true,
            healthCheckInterval: 30000, // 30 seconds
            healthCheckTimeout: 10000,  // 10 seconds
            healthCheckRetries: 3,
          };

          this.services.set(service.id, service);
          this.emit('serviceDiscovered', service);
          
          console.log(`🔍 Auto-discovered Docker service: ${serviceName}`);
        }
      }
    } catch (error) {
      console.error('Docker discovery error:', error);
    }
  }

  private async discoverProcessServices(): Promise<void> {
    try {
      const { execSync } = require('child_process');
      
      // Get running processes
      const psOutput = execSync('ps aux', { encoding: 'utf8' });
      const lines = psOutput.split('\n').slice(1);

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 11) continue;

        const command = parts.slice(10).join(' ');
        const serviceName = this.extractServiceNameFromCommand(command);
        
        if (!serviceName) continue;

        // Check if service already exists
        const existingService = Array.from(this.services.values())
          .find(s => s.name === serviceName);

        if (!existingService) {
          const service: Service = {
            id: `service-${Date.now()}-${Math.random().toString(36).substring(2)}`,
            name: serviceName,
            displayName: serviceName,
            description: `Auto-discovered process service: ${serviceName}`,
            environment: 'host',
            status: 'HEALTHY',
            tags: ['process', 'auto-discovered'],
            dependencies: [],
            containers: [],
            processes: [],
            metrics: [],
            alerts: [],
            discoveredAt: new Date(),
            autoDiscovered: true,
            monitoringEnabled: true,
            alertingEnabled: true,
          };

          this.services.set(service.id, service);
          this.emit('serviceDiscovered', service);
          
          console.log(`🔍 Auto-discovered process service: ${serviceName}`);
        }
      }
    } catch (error) {
      console.error('Process discovery error:', error);
    }
  }

  private async discoverNetworkServices(): Promise<void> {
    // Discover services by scanning common ports
    const commonPorts = [80, 443, 3000, 4000, 5000, 8000, 8080, 9000];
    
    for (const port of commonPorts) {
      try {
        const response = await axios.get(`http://localhost:${port}/health`, {
          timeout: 2000,
          validateStatus: () => true, // Don't throw on non-2xx responses
        });

        if (response.status < 500) {
          const serviceName = `http-service-${port}`;
          
          const existingService = Array.from(this.services.values())
            .find(s => s.name === serviceName);

          if (!existingService) {
            const service: Service = {
              id: `service-${Date.now()}-${Math.random().toString(36).substring(2)}`,
              name: serviceName,
              displayName: `HTTP Service (Port ${port})`,
              description: `Auto-discovered HTTP service on port ${port}`,
              environment: 'localhost',
              status: 'HEALTHY',
              baseUrl: `http://localhost:${port}`,
              healthEndpoint: '/health',
              tags: ['http', 'auto-discovered'],
              dependencies: [],
              containers: [],
              processes: [],
              metrics: [],
              alerts: [],
              discoveredAt: new Date(),
              autoDiscovered: true,
              monitoringEnabled: true,
              alertingEnabled: true,
            };

            this.services.set(service.id, service);
            this.emit('serviceDiscovered', service);
            
            console.log(`🔍 Auto-discovered HTTP service on port ${port}`);
          }
        }
      } catch (error) {
        // Ignore connection errors - service not running on this port
      }
    }
  }

  // Health checking
  private startHealthChecking(): void {
    this.healthCheckInterval = setInterval(async () => {
      const services = Array.from(this.services.values())
        .filter(s => s.monitoringEnabled);

      await Promise.allSettled(
        services.map(service => this.performHealthCheck(service))
      );
    }, 30000); // Every 30 seconds
  }

  private async performHealthCheck(service: Service): Promise<void> {
    try {
      const startTime = Date.now();
      let newStatus: ServiceStatus = 'UNKNOWN';

      if (service.healthEndpoint && service.baseUrl) {
        // HTTP health check
        const response = await axios.get(
          `${service.baseUrl}${service.healthEndpoint}`,
          {
            timeout: service.healthCheckTimeout || 10000,
            validateStatus: (status) => status < 500,
          }
        );

        newStatus = response.status < 300 ? 'HEALTHY' : 
                   response.status < 400 ? 'DEGRADED' : 'UNHEALTHY';
      } else {
        // Basic connectivity check
        try {
          if (service.baseUrl) {
            await axios.get(service.baseUrl, { 
              timeout: 5000,
              validateStatus: () => true,
            });
            newStatus = 'HEALTHY';
          }
        } catch {
          newStatus = 'UNHEALTHY';
        }
      }

      const responseTime = Date.now() - startTime;
      const previousStatus = service.status;

      // Update service status
      const updatedService = {
        ...service,
        status: newStatus,
        lastHealthCheck: new Date(),
        lastStatusChange: newStatus !== previousStatus ? new Date() : service.lastStatusChange,
      };

      this.services.set(service.id, updatedService);

      // Emit status change event
      if (newStatus !== previousStatus) {
        this.emit('serviceStatusChanged', {
          service: updatedService,
          previousStatus,
          currentStatus: newStatus,
          timestamp: new Date(),
          responseTime,
        });
      }

    } catch (error) {
      console.error(`Health check failed for ${service.name}:`, error);
      
      const updatedService = {
        ...service,
        status: 'UNHEALTHY' as ServiceStatus,
        lastHealthCheck: new Date(),
        lastStatusChange: service.status !== 'UNHEALTHY' ? new Date() : service.lastStatusChange,
      };

      this.services.set(service.id, updatedService);
    }
  }

  // Helper methods
  private extractServiceName(containerInfo: any): string | null {
    // Try to extract service name from labels
    const labels = containerInfo.Labels || {};
    
    if (labels['com.docker.compose.service']) {
      return labels['com.docker.compose.service'];
    }
    
    if (labels['service.name']) {
      return labels['service.name'];
    }
    
    // Extract from container name
    const name = containerInfo.Names[0]?.replace('/', '') || '';
    if (name.includes('_')) {
      return name.split('_')[0];
    }
    
    return name || null;
  }

  private extractEnvironment(containerInfo: any): string {
    const labels = containerInfo.Labels || {};
    return labels['environment'] || labels['env'] || 'docker';
  }

  private extractTags(containerInfo: any): string[] {
    const labels = containerInfo.Labels || {};
    const tags = ['docker', 'auto-discovered'];
    
    if (labels['com.docker.compose.service']) {
      tags.push('compose');
    }
    
    if (containerInfo.State === 'running') {
      tags.push('running');
    }
    
    return tags;
  }

  private extractServiceNameFromCommand(command: string): string | null {
    // Extract service names from common patterns
    const patterns = [
      /node\s+(?:.*\/)?([^\/\s]+)\.js/, // Node.js services
      /python\s+(?:.*\/)?([^\/\s]+)\.py/, // Python services
      /java\s+.*-jar\s+(?:.*\/)?([^\/\s]+)\.jar/, // Java services
      /nginx/, // Nginx
      /redis-server/, // Redis
      /postgres/, // PostgreSQL
      /mysql/, // MySQL
    ];

    for (const pattern of patterns) {
      const match = command.match(pattern);
      if (match) {
        return match[1] || pattern.source.replace(/[^\w]/g, '');
      }
    }

    return null;
  }

  // Persistence
  private async loadPersistedServices(): Promise<void> {
    try {
      const servicesFile = path.join(process.cwd(), 'data', 'services.json');
      const data = await fs.readFile(servicesFile, 'utf8');
      const services = JSON.parse(data);
      
      for (const service of services) {
        // Convert date strings back to Date objects
        service.discoveredAt = new Date(service.discoveredAt);
        if (service.lastHealthCheck) {
          service.lastHealthCheck = new Date(service.lastHealthCheck);
        }
        if (service.lastStatusChange) {
          service.lastStatusChange = new Date(service.lastStatusChange);
        }
        
        this.services.set(service.id, service);
      }
      
      console.log(`📁 Loaded ${services.length} persisted services`);
    } catch (error) {
      // File doesn't exist or is invalid - start with empty services
      console.log('📁 No persisted services found, starting fresh');
    }
  }

  private async persistServices(): Promise<void> {
    try {
      const servicesDir = path.join(process.cwd(), 'data');
      await fs.mkdir(servicesDir, { recursive: true });
      
      const servicesFile = path.join(servicesDir, 'services.json');
      const services = Array.from(this.services.values());
      
      await fs.writeFile(servicesFile, JSON.stringify(services, null, 2));
      console.log(`💾 Persisted ${services.length} services`);
    } catch (error) {
      console.error('Failed to persist services:', error);
    }
  }
}
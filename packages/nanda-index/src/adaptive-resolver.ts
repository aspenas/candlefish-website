/**
 * Adaptive Resolver - Intelligent routing and load balancing for AI agents
 * Implements geo-aware routing, DDoS protection, and traffic shaping
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import NodeCache from 'node-cache';
import axios, { AxiosInstance } from 'axios';
import pLimit from 'p-limit';
import { AdaptiveResolverConfig } from './types';

/**
 * Endpoint health and performance metrics
 */
interface EndpointMetrics {
  url: string;
  region: string;
  latency: number[];
  successRate: number;
  requestCount: number;
  errorCount: number;
  lastCheck: number;
  status: 'healthy' | 'degraded' | 'unhealthy';
  weight: number; // For weighted round-robin
}

/**
 * Traffic shaping configuration
 */
interface TrafficShaping {
  canaryPercentage: number;
  blueGreenRatio: number;
  rateLimit: {
    requests: number;
    window: number;
  };
  circuitBreaker: {
    threshold: number;
    timeout: number;
    halfOpenRequests: number;
  };
}

/**
 * Session binding for stateful connections
 */
interface SessionBinding {
  sessionId: string;
  clientId: string;
  endpointUrl: string;
  createdAt: number;
  lastUsed: number;
  requestCount: number;
}

/**
 * DDoS protection state
 */
interface DDoSProtection {
  enabled: boolean;
  suspiciousIPs: Map<string, number>;
  blockedIPs: Set<string>;
  requestPatterns: Map<string, number[]>;
  challengeTokens: Map<string, string>;
}

/**
 * Adaptive Resolver - Intelligent request routing
 */
export class AdaptiveResolver extends EventEmitter {
  private config: AdaptiveResolverConfig;
  private endpoints: Map<string, EndpointMetrics>;
  private sessions: Map<string, SessionBinding>;
  private cache: NodeCache;
  private http: AxiosInstance;
  private ddosProtection: DDoSProtection;
  private trafficShaping: TrafficShaping;
  private concurrencyLimit: ReturnType<typeof pLimit>;
  
  // Shuffle sharding for isolation
  private shards: Map<string, string[]>;
  private currentShard: number;
  
  // Performance tracking
  private metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    avgLatency: number;
    p95Latency: number;
    p99Latency: number;
    activeConnections: number;
  };

  constructor(config: AdaptiveResolverConfig) {
    super();
    
    this.config = config;
    this.endpoints = new Map();
    this.sessions = new Map();
    this.shards = new Map();
    this.currentShard = 0;
    
    // Initialize cache
    this.cache = new NodeCache({
      stdTTL: 60,
      checkperiod: 10,
      useClones: false
    });
    
    // HTTP client
    this.http = axios.create({
      timeout: 5000,
      headers: {
        'User-Agent': 'NANDA-AdaptiveResolver/1.0'
      }
    });
    
    // DDoS protection
    this.ddosProtection = {
      enabled: config.security.ddosProtection,
      suspiciousIPs: new Map(),
      blockedIPs: new Set(),
      requestPatterns: new Map(),
      challengeTokens: new Map()
    };
    
    // Traffic shaping defaults
    this.trafficShaping = {
      canaryPercentage: 0,
      blueGreenRatio: 100,
      rateLimit: config.security.rateLimiting || {
        requests: 1000,
        window: 60000
      },
      circuitBreaker: {
        threshold: 50, // 50% error rate
        timeout: 30000, // 30 seconds
        halfOpenRequests: 3
      }
    };
    
    // Concurrency control
    this.concurrencyLimit = pLimit(100);
    
    // Initialize metrics
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      avgLatency: 0,
      p95Latency: 0,
      p99Latency: 0,
      activeConnections: 0
    };
    
    // Start background tasks
    this.startBackgroundTasks();
  }

  /**
   * Route request to best available endpoint
   */
  async route(request: {
    agentId: string;
    capability: string;
    clientIP: string;
    sessionId?: string;
    region?: string;
    priority?: 'low' | 'normal' | 'high';
    metadata?: Record<string, any>;
  }): Promise<{
    endpoint: string;
    token: string;
    ttl: number;
    sessionId: string;
  }> {
    const startTime = Date.now();
    this.metrics.totalRequests++;
    this.metrics.activeConnections++;
    
    try {
      // DDoS protection
      if (this.ddosProtection.enabled) {
        await this.checkDDoSProtection(request.clientIP);
      }
      
      // Rate limiting
      await this.checkRateLimit(request.clientIP);
      
      // Session binding
      if (request.sessionId) {
        const session = this.sessions.get(request.sessionId);
        if (session && this.isEndpointHealthy(session.endpointUrl)) {
          session.lastUsed = Date.now();
          session.requestCount++;
          
          return {
            endpoint: session.endpointUrl,
            token: this.generateEphemeralToken(request),
            ttl: 300,
            sessionId: request.sessionId
          };
        }
      }
      
      // Select endpoint based on strategy
      const endpoint = await this.selectEndpoint(request);
      
      if (!endpoint) {
        throw new Error('No healthy endpoints available');
      }
      
      // Create session binding
      const sessionId = request.sessionId || this.generateSessionId();
      const session: SessionBinding = {
        sessionId,
        clientId: request.clientIP,
        endpointUrl: endpoint,
        createdAt: Date.now(),
        lastUsed: Date.now(),
        requestCount: 1
      };
      this.sessions.set(sessionId, session);
      
      // Generate ephemeral token
      const token = this.generateEphemeralToken(request);
      
      // Update metrics
      const latency = Date.now() - startTime;
      this.updateLatencyMetrics(latency);
      this.metrics.successfulRequests++;
      
      this.emit('request:routed', {
        agentId: request.agentId,
        endpoint,
        latency
      });
      
      return {
        endpoint,
        token,
        ttl: 300, // 5 minutes
        sessionId
      };
      
    } catch (error) {
      this.metrics.failedRequests++;
      this.emit('error', error);
      throw error;
    } finally {
      this.metrics.activeConnections--;
    }
  }

  /**
   * Register a new endpoint
   */
  async registerEndpoint(params: {
    url: string;
    region: string;
    capabilities: string[];
    weight?: number;
  }): Promise<void> {
    const metrics: EndpointMetrics = {
      url: params.url,
      region: params.region,
      latency: [],
      successRate: 100,
      requestCount: 0,
      errorCount: 0,
      lastCheck: Date.now(),
      status: 'healthy',
      weight: params.weight || 1
    };
    
    // Perform initial health check
    await this.healthCheck(metrics);
    
    this.endpoints.set(params.url, metrics);
    
    // Update shards
    this.updateShards();
    
    this.emit('endpoint:registered', params.url);
  }

  /**
   * Select best endpoint based on routing strategy
   */
  private async selectEndpoint(request: any): Promise<string | null> {
    const healthyEndpoints = Array.from(this.endpoints.values())
      .filter(e => e.status === 'healthy' || e.status === 'degraded');
    
    if (healthyEndpoints.length === 0) {
      return null;
    }
    
    let selected: EndpointMetrics | null = null;
    
    if (this.config.strategies.geographic && request.region) {
      // Geographic routing
      const regional = healthyEndpoints.filter(e => e.region === request.region);
      if (regional.length > 0) {
        selected = this.selectByLatency(regional);
      }
    }
    
    if (!selected && this.config.strategies.loadBalanced) {
      // Weighted round-robin with shuffle sharding
      selected = this.selectByShuffle(healthyEndpoints, request.clientIP);
    }
    
    if (!selected) {
      // Fallback to least connections
      selected = healthyEndpoints.reduce((prev, curr) =>
        prev.requestCount < curr.requestCount ? prev : curr
      );
    }
    
    // Apply traffic shaping
    if (selected && this.trafficShaping.canaryPercentage > 0) {
      const isCanary = Math.random() * 100 < this.trafficShaping.canaryPercentage;
      if (isCanary) {
        // Route to canary endpoint if available
        const canary = healthyEndpoints.find(e => e.url.includes('canary'));
        if (canary) selected = canary;
      }
    }
    
    return selected ? selected.url : null;
  }

  /**
   * Select endpoint by lowest latency
   */
  private selectByLatency(endpoints: EndpointMetrics[]): EndpointMetrics {
    return endpoints.reduce((prev, curr) => {
      const prevAvg = prev.latency.length > 0 
        ? prev.latency.reduce((a, b) => a + b, 0) / prev.latency.length 
        : Infinity;
      const currAvg = curr.latency.length > 0
        ? curr.latency.reduce((a, b) => a + b, 0) / curr.latency.length
        : Infinity;
      return prevAvg < currAvg ? prev : curr;
    });
  }

  /**
   * Select endpoint using shuffle sharding
   */
  private selectByShuffle(
    endpoints: EndpointMetrics[],
    clientIP: string
  ): EndpointMetrics | null {
    // Hash client IP to determine shard
    const hash = crypto.createHash('sha256').update(clientIP).digest();
    const shardIndex = hash.readUInt32BE(0) % 10; // 10 shards
    
    const shardKey = `shard-${shardIndex}`;
    let shard = this.shards.get(shardKey);
    
    if (!shard || shard.length === 0) {
      // Create shard with subset of endpoints
      const shardSize = Math.max(2, Math.floor(endpoints.length / 3));
      shard = endpoints
        .sort(() => Math.random() - 0.5)
        .slice(0, shardSize)
        .map(e => e.url);
      this.shards.set(shardKey, shard);
    }
    
    // Select from shard using weighted round-robin
    const shardEndpoints = endpoints.filter(e => shard!.includes(e.url));
    if (shardEndpoints.length === 0) return null;
    
    const totalWeight = shardEndpoints.reduce((sum, e) => sum + e.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const endpoint of shardEndpoints) {
      random -= endpoint.weight;
      if (random <= 0) return endpoint;
    }
    
    return shardEndpoints[0];
  }

  /**
   * Health check for endpoint
   */
  private async healthCheck(endpoint: EndpointMetrics): Promise<void> {
    try {
      const start = Date.now();
      const response = await this.http.get(`${endpoint.url}/health`, {
        timeout: 2000
      });
      
      const latency = Date.now() - start;
      endpoint.latency.push(latency);
      
      // Keep only last 100 latency measurements
      if (endpoint.latency.length > 100) {
        endpoint.latency.shift();
      }
      
      // Update success rate
      endpoint.requestCount++;
      endpoint.successRate = 
        ((endpoint.successRate * (endpoint.requestCount - 1)) + 100) / endpoint.requestCount;
      
      // Determine status
      if (endpoint.successRate > 95 && latency < 1000) {
        endpoint.status = 'healthy';
      } else if (endpoint.successRate > 80 && latency < 2000) {
        endpoint.status = 'degraded';
      } else {
        endpoint.status = 'unhealthy';
      }
      
      endpoint.lastCheck = Date.now();
      
    } catch (error) {
      endpoint.errorCount++;
      endpoint.successRate = 
        ((endpoint.successRate * endpoint.requestCount) + 0) / (endpoint.requestCount + 1);
      endpoint.requestCount++;
      
      if (endpoint.successRate < 50) {
        endpoint.status = 'unhealthy';
      }
    }
  }

  /**
   * Check if endpoint is healthy
   */
  private isEndpointHealthy(url: string): boolean {
    const endpoint = this.endpoints.get(url);
    return endpoint ? endpoint.status !== 'unhealthy' : false;
  }

  /**
   * DDoS protection check
   */
  private async checkDDoSProtection(clientIP: string): Promise<void> {
    // Check if IP is blocked
    if (this.ddosProtection.blockedIPs.has(clientIP)) {
      throw new Error('Access denied');
    }
    
    // Track request pattern
    const now = Date.now();
    const pattern = this.ddosProtection.requestPatterns.get(clientIP) || [];
    pattern.push(now);
    
    // Keep only last minute of requests
    const oneMinuteAgo = now - 60000;
    const recentRequests = pattern.filter(t => t > oneMinuteAgo);
    this.ddosProtection.requestPatterns.set(clientIP, recentRequests);
    
    // Check for suspicious patterns
    if (recentRequests.length > 100) { // More than 100 requests per minute
      const suspiciousCount = (this.ddosProtection.suspiciousIPs.get(clientIP) || 0) + 1;
      this.ddosProtection.suspiciousIPs.set(clientIP, suspiciousCount);
      
      if (suspiciousCount > 3) {
        // Block IP after 3 strikes
        this.ddosProtection.blockedIPs.add(clientIP);
        this.emit('ddos:blocked', clientIP);
        throw new Error('Access denied');
      }
      
      // Require challenge
      const token = crypto.randomBytes(16).toString('hex');
      this.ddosProtection.challengeTokens.set(clientIP, token);
      throw new Error(`Challenge required: ${token}`);
    }
  }

  /**
   * Rate limiting check
   */
  private async checkRateLimit(clientIP: string): Promise<void> {
    const key = `ratelimit:${clientIP}`;
    const current = this.cache.get<number>(key) || 0;
    
    if (current >= this.trafficShaping.rateLimit.requests) {
      throw new Error('Rate limit exceeded');
    }
    
    this.cache.set(
      key,
      current + 1,
      Math.floor(this.trafficShaping.rateLimit.window / 1000)
    );
  }

  /**
   * Generate ephemeral token for session
   */
  private generateEphemeralToken(request: any): string {
    const payload = {
      agentId: request.agentId,
      capability: request.capability,
      clientIP: request.clientIP,
      timestamp: Date.now(),
      nonce: crypto.randomBytes(8).toString('hex')
    };
    
    const token = crypto
      .createHmac('sha256', this.config.agent_id)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    // Cache token for validation
    this.cache.set(`token:${token}`, payload, 300);
    
    return token;
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Update latency metrics
   */
  private updateLatencyMetrics(latency: number): void {
    // Simple moving average
    this.metrics.avgLatency = 
      (this.metrics.avgLatency * (this.metrics.totalRequests - 1) + latency) / 
      this.metrics.totalRequests;
    
    // Would need to maintain sorted list for accurate percentiles
    // For now, use approximations
    this.metrics.p95Latency = Math.max(this.metrics.p95Latency, latency * 0.95);
    this.metrics.p99Latency = Math.max(this.metrics.p99Latency, latency * 0.99);
  }

  /**
   * Update shuffle shards
   */
  private updateShards(): void {
    // Recreate shards when endpoints change
    this.shards.clear();
  }

  /**
   * Configure traffic shaping
   */
  configureTrafficShaping(config: Partial<TrafficShaping>): void {
    this.trafficShaping = { ...this.trafficShaping, ...config };
    this.emit('traffic:configured', this.trafficShaping);
  }

  /**
   * Start blue-green deployment
   */
  startBlueGreenDeployment(params: {
    blueEndpoints: string[];
    greenEndpoints: string[];
    ratio: number; // Percentage to green (0-100)
  }): void {
    // Mark endpoints as blue or green
    params.blueEndpoints.forEach(url => {
      const endpoint = this.endpoints.get(url);
      if (endpoint) {
        endpoint.weight = (100 - params.ratio) / params.blueEndpoints.length;
      }
    });
    
    params.greenEndpoints.forEach(url => {
      const endpoint = this.endpoints.get(url);
      if (endpoint) {
        endpoint.weight = params.ratio / params.greenEndpoints.length;
      }
    });
    
    this.trafficShaping.blueGreenRatio = params.ratio;
    this.emit('deployment:bluegreen', params);
  }

  /**
   * Start canary deployment
   */
  startCanaryDeployment(params: {
    canaryEndpoint: string;
    percentage: number;
  }): void {
    this.trafficShaping.canaryPercentage = params.percentage;
    this.emit('deployment:canary', params);
  }

  /**
   * Background tasks
   */
  private startBackgroundTasks(): void {
    // Health checks
    setInterval(() => {
      this.endpoints.forEach(endpoint => {
        this.healthCheck(endpoint).catch(err => 
          this.emit('error', { context: 'health check', error: err })
        );
      });
    }, 30000); // Every 30 seconds
    
    // Session cleanup
    setInterval(() => {
      const now = Date.now();
      const timeout = 3600000; // 1 hour
      
      this.sessions.forEach((session, id) => {
        if (now - session.lastUsed > timeout) {
          this.sessions.delete(id);
        }
      });
    }, 60000); // Every minute
    
    // DDoS cleanup
    setInterval(() => {
      // Clear old suspicious IPs
      this.ddosProtection.suspiciousIPs.clear();
      
      // Unblock IPs after cooldown
      // In production, this would be more sophisticated
    }, 300000); // Every 5 minutes
    
    // Metrics reporting
    setInterval(() => {
      this.emit('metrics', this.getMetrics());
    }, 10000); // Every 10 seconds
  }

  /**
   * Get resolver metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      endpoints: Array.from(this.endpoints.values()).map(e => ({
        url: e.url,
        status: e.status,
        successRate: e.successRate,
        avgLatency: e.latency.length > 0 
          ? e.latency.reduce((a, b) => a + b, 0) / e.latency.length 
          : 0
      })),
      activeSessions: this.sessions.size,
      blockedIPs: this.ddosProtection.blockedIPs.size
    };
  }

  /**
   * Cleanup and close
   */
  close(): void {
    this.cache.close();
    this.removeAllListeners();
  }
}
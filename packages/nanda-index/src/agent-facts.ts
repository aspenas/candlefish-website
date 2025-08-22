/**
 * AgentFacts Resolver - W3C Verifiable Credentials v2 Implementation
 * Handles agent capability discovery and verification
 */

import { EventEmitter } from 'events';
import * as ed25519 from 'ed25519';
import NodeCache from 'node-cache';
import axios, { AxiosInstance } from 'axios';
import pLimit from 'p-limit';
import { z } from 'zod';
import { AgentFacts, AgentFactsSchema } from './types';

/**
 * Trusted issuer registry for verifying credentials
 */
interface TrustedIssuer {
  id: string;
  name: string;
  publicKey: string;
  type: 'enterprise' | 'community' | 'self';
  trustLevel: number; // 0-100
  domains: string[];
}

/**
 * Agent capability with detailed metadata
 */
export interface AgentCapability {
  type: string;
  version: string;
  endpoints: EndpointInfo[];
  pricing?: PricingInfo;
  limits?: RateLimits;
  sla?: SLAInfo;
}

interface EndpointInfo {
  url: string;
  protocol: string;
  ttl: number;
  priority: number;
  region?: string;
  latency?: number;
  availability?: number;
}

interface PricingInfo {
  model: string;
  currency: string;
  rates: Record<string, number>;
  micropayment: boolean;
}

interface RateLimits {
  requests: number;
  window: number;
  burstLimit?: number;
  quotaReset?: string;
}

interface SLAInfo {
  uptime: number;
  responseTime: number;
  supportTier: string;
}

/**
 * AgentFacts Resolver - Fetches and verifies agent capabilities
 */
export class AgentFactsResolver extends EventEmitter {
  private cache: NodeCache;
  private http: AxiosInstance;
  private trustedIssuers: Map<string, TrustedIssuer>;
  private concurrencyLimit: ReturnType<typeof pLimit>;
  private revocationList: Set<string>;
  
  // Performance tracking
  private metrics: {
    resolutions: number;
    verifications: number;
    cacheHits: number;
    cacheMisses: number;
    errors: number;
  };

  constructor(config: {
    cacheTTL?: number;
    httpTimeout?: number;
    maxConcurrency?: number;
    trustedIssuers?: TrustedIssuer[];
  } = {}) {
    super();
    
    // Initialize cache with TTL
    this.cache = new NodeCache({
      stdTTL: config.cacheTTL || 300, // 5 minutes default
      checkperiod: 60,
      useClones: false
    });
    
    // HTTP client with timeout
    this.http = axios.create({
      timeout: config.httpTimeout || 5000,
      headers: {
        'User-Agent': 'NANDA-AgentFacts-Resolver/1.0',
        'Accept': 'application/json, application/ld+json'
      }
    });
    
    // Initialize trusted issuers
    this.trustedIssuers = new Map();
    this.loadTrustedIssuers(config.trustedIssuers || this.getDefaultIssuers());
    
    // Concurrency control
    this.concurrencyLimit = pLimit(config.maxConcurrency || 10);
    
    // Revocation list (would be loaded from VC-Status-List)
    this.revocationList = new Set();
    
    // Initialize metrics
    this.metrics = {
      resolutions: 0,
      verifications: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0
    };
    
    // Start background tasks
    this.startBackgroundTasks();
  }

  /**
   * Resolve agent facts from URL with caching and verification
   */
  async resolveAgentFacts(
    factsUrl: string,
    options: {
      verifySignature?: boolean;
      allowSelfSigned?: boolean;
      maxRedirects?: number;
      timeout?: number;
    } = {}
  ): Promise<AgentFacts> {
    try {
      // Check cache first
      const cacheKey = `facts:${factsUrl}`;
      const cached = this.cache.get<AgentFacts>(cacheKey);
      if (cached) {
        this.metrics.cacheHits++;
        this.emit('cache:hit', factsUrl);
        return cached;
      }
      
      this.metrics.cacheMisses++;
      this.metrics.resolutions++;
      
      // Fetch from URL
      const response = await this.concurrencyLimit(() => 
        this.http.get(factsUrl, {
          maxRedirects: options.maxRedirects || 3,
          timeout: options.timeout || this.http.defaults.timeout,
          validateStatus: (status) => status === 200
        })
      );
      
      // Parse and validate
      const facts = AgentFactsSchema.parse(response.data);
      
      // Verify signature if requested
      if (options.verifySignature !== false) {
        await this.verifyCredential(facts, options.allowSelfSigned || false);
      }
      
      // Check revocation status
      if (this.isRevoked(facts.id)) {
        throw new Error(`Credential ${facts.id} has been revoked`);
      }
      
      // Calculate dynamic TTL based on endpoint TTLs
      const ttl = this.calculateTTL(facts);
      
      // Cache the verified facts
      this.cache.set(cacheKey, facts, ttl);
      
      this.emit('facts:resolved', facts);
      return facts;
      
    } catch (error) {
      this.metrics.errors++;
      this.emit('error', { factsUrl, error });
      throw error;
    }
  }

  /**
   * Get specific capability from agent facts
   */
  async getAgentCapability(
    factsUrl: string,
    capabilityType: string
  ): Promise<AgentCapability | null> {
    const facts = await this.resolveAgentFacts(factsUrl);
    
    const capability = facts.credentialSubject.capabilities.find(
      cap => cap.type === capabilityType
    );
    
    if (!capability) {
      return null;
    }
    
    // Enhance with runtime metrics
    const enhanced: AgentCapability = {
      type: capability.type,
      version: capability.version,
      endpoints: await this.enhanceEndpoints(capability.endpoints),
      pricing: facts.credentialSubject.pricing,
      limits: this.extractRateLimits(capability.endpoints),
      sla: await this.getSLAInfo(factsUrl)
    };
    
    return enhanced;
  }

  /**
   * Select best endpoint based on criteria
   */
  async selectBestEndpoint(
    facts: AgentFacts,
    criteria: {
      region?: string;
      protocol?: string;
      minPriority?: number;
      maxLatency?: number;
    } = {}
  ): Promise<EndpointInfo | null> {
    const allEndpoints: EndpointInfo[] = [];
    
    // Collect all endpoints from all capabilities
    for (const capability of facts.credentialSubject.capabilities) {
      const enhanced = await this.enhanceEndpoints(capability.endpoints);
      allEndpoints.push(...enhanced);
    }
    
    // Filter by criteria
    let filtered = allEndpoints;
    
    if (criteria.region) {
      filtered = filtered.filter(e => e.region === criteria.region);
    }
    
    if (criteria.protocol) {
      filtered = filtered.filter(e => e.protocol === criteria.protocol);
    }
    
    if (criteria.minPriority !== undefined) {
      filtered = filtered.filter(e => e.priority >= criteria.minPriority);
    }
    
    if (criteria.maxLatency !== undefined) {
      filtered = filtered.filter(e => 
        e.latency !== undefined && e.latency <= criteria.maxLatency
      );
    }
    
    // Sort by priority and latency
    filtered.sort((a, b) => {
      // Higher priority is better
      const priorityDiff = b.priority - a.priority;
      if (priorityDiff !== 0) return priorityDiff;
      
      // Lower latency is better
      const aLatency = a.latency || Infinity;
      const bLatency = b.latency || Infinity;
      return aLatency - bLatency;
    });
    
    return filtered[0] || null;
  }

  /**
   * Verify W3C Verifiable Credential
   */
  private async verifyCredential(
    facts: AgentFacts,
    allowSelfSigned: boolean
  ): Promise<void> {
    this.metrics.verifications++;
    
    // Extract issuer
    const issuerId = facts.issuer.id;
    const issuerKey = facts.issuer.publicKey;
    
    // Check if issuer is trusted
    const trustedIssuer = this.trustedIssuers.get(issuerId);
    
    if (!trustedIssuer && !allowSelfSigned) {
      throw new Error(`Untrusted issuer: ${issuerId}`);
    }
    
    // Get public key for verification
    const publicKey = trustedIssuer 
      ? Buffer.from(trustedIssuer.publicKey, 'hex')
      : Buffer.from(issuerKey, 'hex');
    
    // Prepare verification payload
    const payload = this.canonicalizeCredential(facts);
    
    // Extract and verify signature
    const signature = Buffer.from(facts.proof.proofValue, 'base64');
    
    const isValid = ed25519.Verify(
      Buffer.from(payload),
      signature,
      publicKey
    );
    
    if (!isValid) {
      throw new Error('Invalid credential signature');
    }
    
    // Check expiration
    if (facts.expirationDate) {
      const expiry = new Date(facts.expirationDate);
      if (expiry < new Date()) {
        throw new Error('Credential has expired');
      }
    }
    
    this.emit('credential:verified', facts.id);
  }

  /**
   * Canonicalize credential for signature verification
   */
  private canonicalizeCredential(facts: AgentFacts): string {
    // Remove proof before canonicalization
    const { proof, ...credentialWithoutProof } = facts;
    
    // Sort keys and stringify (simplified canonicalization)
    return JSON.stringify(credentialWithoutProof, Object.keys(credentialWithoutProof).sort());
  }

  /**
   * Calculate dynamic TTL based on endpoint TTLs
   */
  private calculateTTL(facts: AgentFacts): number {
    let minTTL = Infinity;
    
    for (const capability of facts.credentialSubject.capabilities) {
      for (const endpoint of capability.endpoints) {
        if (endpoint.ttl < minTTL) {
          minTTL = endpoint.ttl;
        }
      }
    }
    
    // Use minimum TTL from endpoints, but cap at 1 hour
    return Math.min(minTTL, 3600);
  }

  /**
   * Enhance endpoints with runtime metrics
   */
  private async enhanceEndpoints(
    endpoints: any[]
  ): Promise<EndpointInfo[]> {
    return Promise.all(endpoints.map(async (endpoint) => {
      const enhanced: EndpointInfo = {
        url: endpoint.url,
        protocol: endpoint.protocol,
        ttl: endpoint.ttl,
        priority: endpoint.priority,
        region: endpoint.region
      };
      
      // Get cached metrics
      const metricsKey = `metrics:${endpoint.url}`;
      const metrics = this.cache.get<{ latency: number; availability: number }>(metricsKey);
      
      if (metrics) {
        enhanced.latency = metrics.latency;
        enhanced.availability = metrics.availability;
      } else {
        // Perform health check
        try {
          const start = Date.now();
          await this.http.head(endpoint.url, { timeout: 2000 });
          enhanced.latency = Date.now() - start;
          enhanced.availability = 100; // Successful response
          
          // Cache metrics
          this.cache.set(metricsKey, {
            latency: enhanced.latency,
            availability: enhanced.availability
          }, 60); // 1 minute cache
        } catch {
          enhanced.availability = 0; // Failed health check
        }
      }
      
      return enhanced;
    }));
  }

  /**
   * Extract rate limits from endpoints
   */
  private extractRateLimits(endpoints: any[]): RateLimits | undefined {
    // Find the most restrictive rate limit
    let minRequests = Infinity;
    let window = 0;
    
    for (const endpoint of endpoints) {
      if (endpoint.rateLimit) {
        if (endpoint.rateLimit.requests < minRequests) {
          minRequests = endpoint.rateLimit.requests;
          window = endpoint.rateLimit.window;
        }
      }
    }
    
    if (minRequests === Infinity) {
      return undefined;
    }
    
    return {
      requests: minRequests,
      window: window
    };
  }

  /**
   * Get SLA information for an agent
   */
  private async getSLAInfo(factsUrl: string): Promise<SLAInfo | undefined> {
    // This would fetch from a separate SLA endpoint or database
    // For now, return mock data
    return {
      uptime: 99.9,
      responseTime: 100,
      supportTier: 'standard'
    };
  }

  /**
   * Check if credential is revoked
   */
  private isRevoked(credentialId: string): boolean {
    return this.revocationList.has(credentialId);
  }

  /**
   * Update revocation list
   */
  async updateRevocationList(statusListUrl: string): Promise<void> {
    try {
      const response = await this.http.get(statusListUrl);
      const revoked = response.data.revoked || [];
      
      this.revocationList.clear();
      revoked.forEach((id: string) => this.revocationList.add(id));
      
      this.emit('revocation:updated', revoked.length);
    } catch (error) {
      this.emit('error', { context: 'revocation update', error });
    }
  }

  /**
   * Load trusted issuers
   */
  private loadTrustedIssuers(issuers: TrustedIssuer[]): void {
    for (const issuer of issuers) {
      this.trustedIssuers.set(issuer.id, issuer);
    }
  }

  /**
   * Get default trusted issuers
   */
  private getDefaultIssuers(): TrustedIssuer[] {
    return [
      {
        id: 'did:web:candlefish.ai',
        name: 'Candlefish AI',
        publicKey: '', // Would be actual key
        type: 'enterprise',
        trustLevel: 100,
        domains: ['candlefish.ai', '*.candlefish.ai']
      },
      {
        id: 'did:web:openai.com',
        name: 'OpenAI',
        publicKey: '', // Would be actual key
        type: 'enterprise',
        trustLevel: 95,
        domains: ['openai.com', 'api.openai.com']
      },
      {
        id: 'did:web:anthropic.com',
        name: 'Anthropic',
        publicKey: '', // Would be actual key
        type: 'enterprise',
        trustLevel: 95,
        domains: ['anthropic.com', 'api.anthropic.com']
      }
    ];
  }

  /**
   * Start background tasks
   */
  private startBackgroundTasks(): void {
    // Periodic revocation list update
    setInterval(() => {
      this.updateRevocationList('https://nanda.candlefish.ai/revocation-list')
        .catch(err => this.emit('error', err));
    }, 3600000); // Every hour
    
    // Periodic metrics reporting
    setInterval(() => {
      this.emit('metrics', this.getMetrics());
    }, 60000); // Every minute
  }

  /**
   * Get resolver metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      cacheSize: this.cache.keys().length,
      trustedIssuers: this.trustedIssuers.size,
      revocationListSize: this.revocationList.size
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.flushAll();
    this.emit('cache:cleared');
  }

  /**
   * Close resolver and cleanup
   */
  close(): void {
    this.cache.close();
    this.removeAllListeners();
  }
}
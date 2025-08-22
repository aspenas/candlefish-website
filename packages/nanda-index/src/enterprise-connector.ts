/**
 * Enterprise Connector - Integration with existing AI agent registries
 * Supports Google A2A, Microsoft NLWeb, MCP servers, and Web3 markets
 */

import { EventEmitter } from 'events';
import axios, { AxiosInstance } from 'axios';
import NodeCache from 'node-cache';
import pLimit from 'p-limit';
import { OAuth2Client } from 'google-auth-library';
import { NANDAIndexRecord, EnterpriseRegistry, AgentFacts } from './types';

/**
 * Supported enterprise platforms
 */
export enum EnterprisePlatform {
  GOOGLE_A2A = 'google_a2a',
  MICROSOFT_NLWEB = 'microsoft_nlweb',
  SALESFORCE_EINSTEIN = 'salesforce_einstein',
  AWS_BEDROCK = 'aws_bedrock',
  MCP_SERVER = 'mcp_server',
  OPENAI_GPT_STORE = 'openai_gpt_store',
  ANTHROPIC_CLAUDE = 'anthropic_claude',
  HUGGINGFACE_HUB = 'huggingface_hub',
  WEB3_MARKET = 'web3_market'
}

/**
 * Platform-specific agent metadata
 */
interface PlatformAgent {
  platform: EnterprisePlatform;
  nativeId: string;
  name: string;
  description: string;
  capabilities: string[];
  endpoints: PlatformEndpoint[];
  pricing?: PlatformPricing;
  metadata: Record<string, any>;
}

interface PlatformEndpoint {
  url: string;
  protocol: string;
  authentication: string;
  rateLimit?: {
    requests: number;
    window: number;
  };
}

interface PlatformPricing {
  model: string;
  currency: string;
  inputCost?: number;
  outputCost?: number;
  fixedCost?: number;
}

/**
 * Sync status for registry
 */
interface SyncStatus {
  platform: EnterprisePlatform;
  lastSync: number;
  nextSync: number;
  totalAgents: number;
  syncedAgents: number;
  failedAgents: number;
  status: 'idle' | 'syncing' | 'error';
  error?: string;
}

/**
 * Cross-registry federation
 */
interface FederationConfig {
  trustedRegistries: string[];
  crossSigningEnabled: boolean;
  sharedNamespace: string;
  conflictResolution: 'local' | 'remote' | 'newest' | 'manual';
}

/**
 * Enterprise Connector - Bridges NANDA with existing platforms
 */
export class EnterpriseConnector extends EventEmitter {
  private registries: Map<EnterprisePlatform, EnterpriseRegistry>;
  private syncStatus: Map<EnterprisePlatform, SyncStatus>;
  private cache: NodeCache;
  private http: AxiosInstance;
  private concurrencyLimit: ReturnType<typeof pLimit>;
  private federationConfig: FederationConfig;
  
  // Platform-specific clients
  private googleClient?: OAuth2Client;
  private microsoftClient?: any; // Would use @azure/identity
  private salesforceClient?: any; // Would use jsforce
  
  // Metrics
  private metrics: {
    totalSynced: number;
    totalFailed: number;
    platformCounts: Map<EnterprisePlatform, number>;
    syncDuration: Map<EnterprisePlatform, number[]>;
  };

  constructor(config: {
    registries?: EnterpriseRegistry[];
    federationConfig?: FederationConfig;
    cacheTTL?: number;
    maxConcurrency?: number;
  } = {}) {
    super();
    
    this.registries = new Map();
    this.syncStatus = new Map();
    
    // Initialize cache
    this.cache = new NodeCache({
      stdTTL: config.cacheTTL || 600, // 10 minutes default
      checkperiod: 60,
      useClones: false
    });
    
    // HTTP client
    this.http = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'NANDA-EnterpriseConnector/1.0'
      }
    });
    
    // Concurrency control
    this.concurrencyLimit = pLimit(config.maxConcurrency || 5);
    
    // Federation config
    this.federationConfig = config.federationConfig || {
      trustedRegistries: [],
      crossSigningEnabled: false,
      sharedNamespace: 'urn:nanda:federated',
      conflictResolution: 'newest'
    };
    
    // Initialize metrics
    this.metrics = {
      totalSynced: 0,
      totalFailed: 0,
      platformCounts: new Map(),
      syncDuration: new Map()
    };
    
    // Load registries
    if (config.registries) {
      config.registries.forEach(reg => this.addRegistry(reg));
    }
    
    // Start sync scheduler
    this.startSyncScheduler();
  }

  /**
   * Add an enterprise registry
   */
  addRegistry(registry: EnterpriseRegistry): void {
    const platform = this.detectPlatform(registry.type);
    this.registries.set(platform, registry);
    
    // Initialize sync status
    this.syncStatus.set(platform, {
      platform,
      lastSync: 0,
      nextSync: Date.now() + (registry.syncInterval * 1000),
      totalAgents: 0,
      syncedAgents: 0,
      failedAgents: 0,
      status: 'idle'
    });
    
    // Initialize platform-specific client
    this.initializePlatformClient(platform, registry);
    
    this.emit('registry:added', platform);
  }

  /**
   * Sync agents from a specific platform
   */
  async syncPlatform(platform: EnterprisePlatform): Promise<SyncStatus> {
    const registry = this.registries.get(platform);
    if (!registry) {
      throw new Error(`Registry not found for platform: ${platform}`);
    }
    
    const status = this.syncStatus.get(platform)!;
    status.status = 'syncing';
    
    const startTime = Date.now();
    
    try {
      // Fetch agents from platform
      const agents = await this.fetchPlatformAgents(platform, registry);
      status.totalAgents = agents.length;
      
      // Convert to NANDA format and store
      const results = await Promise.allSettled(
        agents.map(agent => 
          this.concurrencyLimit(() => this.importAgent(agent, registry))
        )
      );
      
      // Update status
      status.syncedAgents = results.filter(r => r.status === 'fulfilled').length;
      status.failedAgents = results.filter(r => r.status === 'rejected').length;
      status.lastSync = Date.now();
      status.nextSync = Date.now() + (registry.syncInterval * 1000);
      status.status = 'idle';
      
      // Update metrics
      this.metrics.totalSynced += status.syncedAgents;
      this.metrics.totalFailed += status.failedAgents;
      
      const duration = Date.now() - startTime;
      const durations = this.metrics.syncDuration.get(platform) || [];
      durations.push(duration);
      this.metrics.syncDuration.set(platform, durations);
      
      this.emit('sync:completed', { platform, status });
      return status;
      
    } catch (error) {
      status.status = 'error';
      status.error = error instanceof Error ? error.message : 'Unknown error';
      this.emit('sync:error', { platform, error });
      throw error;
    }
  }

  /**
   * Fetch agents from enterprise platform
   */
  private async fetchPlatformAgents(
    platform: EnterprisePlatform,
    registry: EnterpriseRegistry
  ): Promise<PlatformAgent[]> {
    switch (platform) {
      case EnterprisePlatform.GOOGLE_A2A:
        return this.fetchGoogleA2AAgents(registry);
      
      case EnterprisePlatform.MICROSOFT_NLWEB:
        return this.fetchMicrosoftNLWebAgents(registry);
      
      case EnterprisePlatform.SALESFORCE_EINSTEIN:
        return this.fetchSalesforceEinsteinAgents(registry);
      
      case EnterprisePlatform.AWS_BEDROCK:
        return this.fetchAWSBedrockAgents(registry);
      
      case EnterprisePlatform.MCP_SERVER:
        return this.fetchMCPServerAgents(registry);
      
      case EnterprisePlatform.OPENAI_GPT_STORE:
        return this.fetchOpenAIGPTStoreAgents(registry);
      
      case EnterprisePlatform.ANTHROPIC_CLAUDE:
        return this.fetchAnthropicClaudeAgents(registry);
      
      case EnterprisePlatform.HUGGINGFACE_HUB:
        return this.fetchHuggingFaceAgents(registry);
      
      case EnterprisePlatform.WEB3_MARKET:
        return this.fetchWeb3MarketAgents(registry);
      
      default:
        return this.fetchCustomAgents(registry);
    }
  }

  /**
   * Google A2A (Agent-to-Agent) integration
   */
  private async fetchGoogleA2AAgents(registry: EnterpriseRegistry): Promise<PlatformAgent[]> {
    // Authenticate with Google
    if (!this.googleClient) {
      throw new Error('Google client not initialized');
    }
    
    const response = await this.http.get(`${registry.endpoint}/agents`, {
      headers: {
        'Authorization': `Bearer ${await this.getGoogleToken()}`
      }
    });
    
    return response.data.agents.map((agent: any) => ({
      platform: EnterprisePlatform.GOOGLE_A2A,
      nativeId: agent.id,
      name: agent.name,
      description: agent.description,
      capabilities: agent.capabilities || [],
      endpoints: [{
        url: agent.endpoint,
        protocol: 'grpc',
        authentication: 'oauth2',
        rateLimit: {
          requests: 1000,
          window: 60
        }
      }],
      pricing: {
        model: 'usage',
        currency: 'USD',
        inputCost: agent.pricing?.input || 0,
        outputCost: agent.pricing?.output || 0
      },
      metadata: agent.metadata || {}
    }));
  }

  /**
   * Microsoft NLWeb integration
   */
  private async fetchMicrosoftNLWebAgents(registry: EnterpriseRegistry): Promise<PlatformAgent[]> {
    const response = await this.http.get(`${registry.endpoint}/api/agents`, {
      headers: {
        'Authorization': `Bearer ${await this.getMicrosoftToken(registry)}`,
        'api-version': '2024-01-01'
      }
    });
    
    return response.data.value.map((agent: any) => ({
      platform: EnterprisePlatform.MICROSOFT_NLWEB,
      nativeId: agent.id,
      name: agent.properties.name,
      description: agent.properties.description,
      capabilities: agent.properties.skills || [],
      endpoints: [{
        url: `${registry.endpoint}/agents/${agent.id}/invoke`,
        protocol: 'https',
        authentication: 'azure-ad'
      }],
      metadata: agent.properties
    }));
  }

  /**
   * Salesforce Einstein integration
   */
  private async fetchSalesforceEinsteinAgents(registry: EnterpriseRegistry): Promise<PlatformAgent[]> {
    // Would use jsforce for actual implementation
    const response = await this.http.get(`${registry.endpoint}/services/data/v59.0/einstein/agents`, {
      headers: {
        'Authorization': `Bearer ${registry.authentication.credentials.accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data.agents.map((agent: any) => ({
      platform: EnterprisePlatform.SALESFORCE_EINSTEIN,
      nativeId: agent.Id,
      name: agent.Name,
      description: agent.Description,
      capabilities: agent.Capabilities?.split(',') || [],
      endpoints: [{
        url: `${registry.endpoint}/services/einstein/agent/${agent.Id}`,
        protocol: 'https',
        authentication: 'salesforce-oauth'
      }],
      metadata: agent
    }));
  }

  /**
   * AWS Bedrock integration
   */
  private async fetchAWSBedrockAgents(registry: EnterpriseRegistry): Promise<PlatformAgent[]> {
    // Would use AWS SDK for actual implementation
    const response = await this.http.get(`${registry.endpoint}/agents`, {
      headers: {
        'Authorization': this.generateAWSSignature(registry),
        'x-amz-target': 'BedrockAgent.ListAgents'
      }
    });
    
    return response.data.agentSummaries.map((agent: any) => ({
      platform: EnterprisePlatform.AWS_BEDROCK,
      nativeId: agent.agentId,
      name: agent.agentName,
      description: agent.description,
      capabilities: ['text-generation', 'rag'],
      endpoints: [{
        url: `${registry.endpoint}/agents/${agent.agentId}/invoke`,
        protocol: 'https',
        authentication: 'aws-sigv4'
      }],
      metadata: agent
    }));
  }

  /**
   * MCP Server integration
   */
  private async fetchMCPServerAgents(registry: EnterpriseRegistry): Promise<PlatformAgent[]> {
    const response = await this.http.get(`${registry.endpoint}/servers`, {
      headers: registry.authentication.type === 'apikey' 
        ? { 'X-API-Key': registry.authentication.credentials.apiKey }
        : {}
    });
    
    return response.data.servers.map((server: any) => ({
      platform: EnterprisePlatform.MCP_SERVER,
      nativeId: server.id,
      name: server.name,
      description: server.description,
      capabilities: server.tools?.map((t: any) => t.name) || [],
      endpoints: [{
        url: server.endpoint,
        protocol: server.protocol || 'json-rpc',
        authentication: 'mcp-auth'
      }],
      metadata: server
    }));
  }

  /**
   * OpenAI GPT Store integration
   */
  private async fetchOpenAIGPTStoreAgents(registry: EnterpriseRegistry): Promise<PlatformAgent[]> {
    const response = await this.http.get(`${registry.endpoint}/gpts`, {
      headers: {
        'Authorization': `Bearer ${registry.authentication.credentials.apiKey}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });
    
    return response.data.data.map((gpt: any) => ({
      platform: EnterprisePlatform.OPENAI_GPT_STORE,
      nativeId: gpt.id,
      name: gpt.name,
      description: gpt.description,
      capabilities: gpt.tools?.map((t: any) => t.type) || [],
      endpoints: [{
        url: `https://api.openai.com/v1/assistants/${gpt.id}`,
        protocol: 'https',
        authentication: 'bearer'
      }],
      pricing: {
        model: 'usage',
        currency: 'USD',
        inputCost: 0.01, // Per 1K tokens
        outputCost: 0.03
      },
      metadata: gpt
    }));
  }

  /**
   * Anthropic Claude integration
   */
  private async fetchAnthropicClaudeAgents(registry: EnterpriseRegistry): Promise<PlatformAgent[]> {
    // Anthropic doesn't have a traditional agent store yet
    // This would integrate with Claude Apps when available
    return [{
      platform: EnterprisePlatform.ANTHROPIC_CLAUDE,
      nativeId: 'claude-3-opus',
      name: 'Claude 3 Opus',
      description: 'Most capable Claude model',
      capabilities: ['text-generation', 'analysis', 'coding'],
      endpoints: [{
        url: 'https://api.anthropic.com/v1/messages',
        protocol: 'https',
        authentication: 'x-api-key'
      }],
      pricing: {
        model: 'usage',
        currency: 'USD',
        inputCost: 0.015,
        outputCost: 0.075
      },
      metadata: {}
    }];
  }

  /**
   * HuggingFace Hub integration
   */
  private async fetchHuggingFaceAgents(registry: EnterpriseRegistry): Promise<PlatformAgent[]> {
    const response = await this.http.get(`${registry.endpoint}/api/models`, {
      params: {
        filter: 'text-generation',
        sort: 'downloads',
        direction: -1,
        limit: 100
      },
      headers: {
        'Authorization': `Bearer ${registry.authentication.credentials.apiKey}`
      }
    });
    
    return response.data.map((model: any) => ({
      platform: EnterprisePlatform.HUGGINGFACE_HUB,
      nativeId: model.id,
      name: model.id,
      description: model.description || 'HuggingFace model',
      capabilities: model.pipeline_tag ? [model.pipeline_tag] : [],
      endpoints: [{
        url: `https://api-inference.huggingface.co/models/${model.id}`,
        protocol: 'https',
        authentication: 'bearer'
      }],
      metadata: model
    }));
  }

  /**
   * Web3 Market integration (for DID-based agents)
   */
  private async fetchWeb3MarketAgents(registry: EnterpriseRegistry): Promise<PlatformAgent[]> {
    // This would integrate with decentralized agent markets
    // Using smart contracts and IPFS
    return [];
  }

  /**
   * Custom platform integration
   */
  private async fetchCustomAgents(registry: EnterpriseRegistry): Promise<PlatformAgent[]> {
    const response = await this.http.get(registry.endpoint, {
      headers: this.getAuthHeaders(registry)
    });
    
    // Map based on configured mappings
    const agents = this.extractByPath(response.data, registry.mappings.agent_id);
    
    return agents.map((agent: any) => ({
      platform: EnterprisePlatform.WEB3_MARKET,
      nativeId: this.extractByPath(agent, registry.mappings.agent_id),
      name: this.extractByPath(agent, registry.mappings.agent_name),
      description: '',
      capabilities: this.extractByPath(agent, registry.mappings.capabilities) || [],
      endpoints: [{
        url: registry.endpoint,
        protocol: 'https',
        authentication: registry.authentication.type
      }],
      metadata: this.extractByPath(agent, registry.mappings.metadata) || {}
    }));
  }

  /**
   * Import platform agent to NANDA Index
   */
  private async importAgent(
    agent: PlatformAgent,
    registry: EnterpriseRegistry
  ): Promise<NANDAIndexRecord> {
    // Generate NANDA-compatible URN
    const agentName = `urn:nanda:${agent.platform}:${agent.nativeId}`;
    
    // Create agent facts
    const facts: AgentFacts = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://nanda.candlefish.ai/v1/context'
      ],
      id: `https://nanda.candlefish.ai/agents/${agent.nativeId}`,
      type: ['VerifiableCredential', 'AgentFacts'],
      issuer: {
        id: `did:web:${agent.platform}.com`,
        name: agent.platform,
        publicKey: '' // Would be actual key
      },
      issuanceDate: new Date().toISOString(),
      credentialSubject: {
        id: agent.nativeId,
        capabilities: agent.capabilities.map(cap => ({
          type: cap,
          version: '1.0',
          endpoints: agent.endpoints.map(ep => ({
            url: ep.url,
            protocol: ep.protocol,
            ttl: 3600,
            priority: 50,
            rateLimit: ep.rateLimit
          }))
        })),
        pricing: agent.pricing,
        metadata: {
          name: agent.name,
          description: agent.description,
          vendor: agent.platform,
          category: [agent.platform],
          tags: agent.capabilities
        }
      },
      proof: {
        type: 'Ed25519Signature2020',
        created: new Date().toISOString(),
        verificationMethod: `did:web:${agent.platform}.com#key-1`,
        proofPurpose: 'assertionMethod',
        proofValue: '' // Would be actual signature
      }
    };
    
    // Store facts (would upload to actual storage)
    const factsUrl = await this.storeFacts(facts);
    
    // Create NANDA record
    const record: NANDAIndexRecord = {
      agent_id: agent.nativeId,
      agent_name: agentName,
      primary_facts_url: factsUrl,
      private_facts_url: factsUrl, // Same for now
      adaptive_resolver_url: `https://resolver.nanda.candlefish.ai/${agent.nativeId}`,
      ttl: 3600,
      signature: Buffer.alloc(64), // Would be signed
      version: BigInt(1),
      updated_at: Date.now()
    };
    
    // Cache the imported agent
    this.cache.set(`imported:${agent.platform}:${agent.nativeId}`, record);
    
    // Update platform count
    const count = this.metrics.platformCounts.get(agent.platform) || 0;
    this.metrics.platformCounts.set(agent.platform, count + 1);
    
    this.emit('agent:imported', { platform: agent.platform, agent: record });
    return record;
  }

  /**
   * Cross-sign credentials between registries
   */
  async crossSignCredential(
    credential: AgentFacts,
    targetRegistry: string
  ): Promise<AgentFacts> {
    if (!this.federationConfig.crossSigningEnabled) {
      throw new Error('Cross-signing not enabled');
    }
    
    if (!this.federationConfig.trustedRegistries.includes(targetRegistry)) {
      throw new Error('Target registry not trusted');
    }
    
    // Add additional signature from target registry
    // This would involve key exchange and mutual authentication
    const crossSigned = { ...credential };
    crossSigned.proof = {
      ...credential.proof,
      proofValue: credential.proof.proofValue + ':' + targetRegistry
    };
    
    return crossSigned;
  }

  /**
   * Resolve conflicts between registries
   */
  private resolveConflict(
    local: NANDAIndexRecord,
    remote: NANDAIndexRecord
  ): NANDAIndexRecord {
    switch (this.federationConfig.conflictResolution) {
      case 'local':
        return local;
      
      case 'remote':
        return remote;
      
      case 'newest':
        return local.updated_at > remote.updated_at ? local : remote;
      
      case 'manual':
        this.emit('conflict:detected', { local, remote });
        return local; // Default to local, wait for manual resolution
      
      default:
        return local;
    }
  }

  /**
   * Helper methods
   */
  
  private detectPlatform(type: string): EnterprisePlatform {
    const mapping: Record<string, EnterprisePlatform> = {
      'google': EnterprisePlatform.GOOGLE_A2A,
      'microsoft': EnterprisePlatform.MICROSOFT_NLWEB,
      'salesforce': EnterprisePlatform.SALESFORCE_EINSTEIN,
      'aws': EnterprisePlatform.AWS_BEDROCK,
      'mcp': EnterprisePlatform.MCP_SERVER,
      'openai': EnterprisePlatform.OPENAI_GPT_STORE,
      'anthropic': EnterprisePlatform.ANTHROPIC_CLAUDE,
      'huggingface': EnterprisePlatform.HUGGINGFACE_HUB,
      'web3': EnterprisePlatform.WEB3_MARKET
    };
    
    return mapping[type] || EnterprisePlatform.WEB3_MARKET;
  }

  private initializePlatformClient(
    platform: EnterprisePlatform,
    registry: EnterpriseRegistry
  ): void {
    switch (platform) {
      case EnterprisePlatform.GOOGLE_A2A:
        this.googleClient = new OAuth2Client({
          clientId: registry.authentication.credentials.clientId,
          clientSecret: registry.authentication.credentials.clientSecret
        });
        break;
      
      // Initialize other platform clients...
    }
  }

  private async getGoogleToken(): Promise<string> {
    if (!this.googleClient) throw new Error('Google client not initialized');
    const { token } = await this.googleClient.getAccessToken();
    return token || '';
  }

  private async getMicrosoftToken(registry: EnterpriseRegistry): Promise<string> {
    // Would use @azure/identity
    return registry.authentication.credentials.accessToken || '';
  }

  private generateAWSSignature(registry: EnterpriseRegistry): string {
    // Would use AWS Signature V4
    return 'AWS4-HMAC-SHA256 ...';
  }

  private getAuthHeaders(registry: EnterpriseRegistry): Record<string, string> {
    switch (registry.authentication.type) {
      case 'oauth2':
        return { 'Authorization': `Bearer ${registry.authentication.credentials.accessToken}` };
      case 'apikey':
        return { 'X-API-Key': registry.authentication.credentials.apiKey };
      case 'jwt':
        return { 'Authorization': `Bearer ${registry.authentication.credentials.jwt}` };
      default:
        return {};
    }
  }

  private extractByPath(obj: any, path: string): any {
    return path.split('.').reduce((acc, part) => acc?.[part], obj);
  }

  private async storeFacts(facts: AgentFacts): Promise<string> {
    // Would store to actual storage backend
    const id = facts.credentialSubject.id;
    this.cache.set(`facts:${id}`, facts);
    return `https://nanda.candlefish.ai/facts/${id}`;
  }

  /**
   * Start sync scheduler
   */
  private startSyncScheduler(): void {
    setInterval(() => {
      const now = Date.now();
      
      this.syncStatus.forEach((status, platform) => {
        if (status.status === 'idle' && now >= status.nextSync) {
          this.syncPlatform(platform).catch(err => 
            this.emit('error', { platform, error: err })
          );
        }
      });
    }, 60000); // Check every minute
  }

  /**
   * Get connector metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      platformCounts: Object.fromEntries(this.metrics.platformCounts),
      syncStatus: Array.from(this.syncStatus.values()),
      registries: this.registries.size
    };
  }

  /**
   * Cleanup
   */
  close(): void {
    this.cache.close();
    this.removeAllListeners();
  }
}
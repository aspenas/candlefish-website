/**
 * NANDA Index - Core Implementation
 * Revolutionary AI Agent Discovery Infrastructure
 */

import { EventEmitter } from 'events';
import * as ed25519 from 'ed25519';
import { v7 as uuidv7 } from 'uuid';
import * as msgpack from 'msgpack-lite';
import * as cbor from 'cbor-x';
import murmurhash from 'murmurhash3js';
import NodeCache from 'node-cache';
import pLimit from 'p-limit';
import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  QueryCommand,
  ScanCommand,
  BatchWriteItemCommand
} from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { createClient } from '@redis/client';
import type {
  NANDAIndexRecord,
  CompressedNANDARecord,
  CRDTOperation,
  IndexStatistics,
  AgentFacts
} from './types';

export * from './types';
export { AgentFactsResolver } from './agent-facts';
export { AdaptiveResolver } from './adaptive-resolver';
export { PrivacyLayer } from './privacy-layer';
export { EnterpriseConnector } from './enterprise-connector';

/**
 * NANDA Index Core - Manages the distributed agent index
 */
export class NANDAIndex extends EventEmitter {
  private dynamodb: DynamoDBDocumentClient;
  private redis: ReturnType<typeof createClient>;
  private cache: NodeCache;
  private nodeId: string;
  private vectorClock: Map<string, number>;
  private privateKey: Buffer;
  private publicKey: Buffer;
  private concurrencyLimit: ReturnType<typeof pLimit>;

  // Performance metrics
  private metrics: {
    totalQueries: number;
    totalUpdates: number;
    queryLatencies: number[];
    updateLatencies: number[];
    errorCount: number;
    startTime: number;
  };

  constructor(config: {
    region?: string;
    dynamoTableName?: string;
    redisUrl?: string;
    nodeId?: string;
    privateKeyHex?: string;
    concurrency?: number;
  } = {}) {
    super();

    // Initialize DynamoDB
    const client = new DynamoDBClient({
      region: config.region || 'us-east-1'
    });
    this.dynamodb = DynamoDBDocumentClient.from(client, {
      marshallOptions: {
        convertEmptyValues: true,
        removeUndefinedValues: true,
        convertClassInstanceToMap: true
      }
    });

    // Initialize Redis for caching and pub/sub
    this.redis = createClient({
      url: config.redisUrl || 'redis://localhost:6379'
    });

    // Local cache for hot data
    this.cache = new NodeCache({
      stdTTL: 60, // 1 minute default TTL
      checkperiod: 10,
      useClones: false
    });

    // Node identification for CRDT
    this.nodeId = config.nodeId || uuidv7();
    this.vectorClock = new Map();

    // Ed25519 keys for signing
    if (config.privateKeyHex) {
      this.privateKey = Buffer.from(config.privateKeyHex, 'hex');
      this.publicKey = ed25519.publicKey(this.privateKey);
    } else {
      const seed = Buffer.from(uuidv7().replace(/-/g, ''), 'hex');
      const keypair = ed25519.MakeKeypair(seed);
      this.privateKey = keypair.privateKey;
      this.publicKey = keypair.publicKey;
    }

    // Concurrency control
    this.concurrencyLimit = pLimit(config.concurrency || 100);

    // Initialize metrics
    this.metrics = {
      totalQueries: 0,
      totalUpdates: 0,
      queryLatencies: [],
      updateLatencies: [],
      errorCount: 0,
      startTime: Date.now()
    };

    // Start background tasks
    this.startBackgroundTasks();
  }

  /**
   * Initialize the index and connect to services
   */
  async initialize(): Promise<void> {
    // Connect to Redis
    await this.redis.connect();

    // Subscribe to CRDT updates
    const subscriber = this.redis.duplicate();
    await subscriber.connect();
    await subscriber.subscribe('nanda:updates', (message) => {
      this.handleCRDTUpdate(JSON.parse(message));
    });

    // Create DynamoDB table if needed
    await this.ensureTableExists();

    // Load initial data
    await this.loadInitialData();

    this.emit('initialized');
  }

  /**
   * Register a new AI agent in the index
   */
  async registerAgent(params: {
    agentName: string;
    primaryFactsUrl: string;
    privateFactsUrl: string;
    adaptiveResolverUrl: string;
    ttl?: number;
    metadata?: Record<string, any>;
  }): Promise<NANDAIndexRecord> {
    const startTime = Date.now();

    try {
      // Generate agent ID (UUID v7 for time-ordering)
      const agentId = uuidv7();

      // Create the record
      const record: NANDAIndexRecord = {
        agent_id: agentId,
        agent_name: this.formatAgentName(params.agentName),
        primary_facts_url: params.primaryFactsUrl,
        private_facts_url: params.privateFactsUrl,
        adaptive_resolver_url: params.adaptiveResolverUrl,
        ttl: params.ttl || 3600, // 1 hour default
        signature: Buffer.alloc(64), // Will be filled below
        version: BigInt(1),
        updated_at: Date.now()
      };

      // Sign the record
      record.signature = this.signRecord(record);

      // Store in DynamoDB
      await this.storeRecord(record);

      // Update cache
      this.cache.set(agentId, record, record.ttl);

      // Publish CRDT update
      await this.publishCRDTUpdate({
        type: 'insert',
        record,
        timestamp: Date.now(),
        node_id: this.nodeId,
        vector_clock: this.incrementVectorClock()
      });

      // Update metrics
      this.metrics.totalUpdates++;
      this.metrics.updateLatencies.push(Date.now() - startTime);

      this.emit('agent:registered', record);
      return record;

    } catch (error) {
      this.metrics.errorCount++;
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Query agents by various criteria
   */
  async queryAgents(params: {
    name?: string;
    capability?: string;
    vendor?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<NANDAIndexRecord[]> {
    const startTime = Date.now();

    try {
      // Check cache first
      const cacheKey = `query:${JSON.stringify(params)}`;
      const cached = this.cache.get<NANDAIndexRecord[]>(cacheKey);
      if (cached) {
        this.metrics.totalQueries++;
        return cached;
      }

      // Query from DynamoDB
      const results = await this.queryDynamoDB(params);

      // Cache results
      this.cache.set(cacheKey, results, 30); // 30 seconds cache

      // Update metrics
      this.metrics.totalQueries++;
      this.metrics.queryLatencies.push(Date.now() - startTime);

      return results;

    } catch (error) {
      this.metrics.errorCount++;
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Get a specific agent by ID
   */
  async getAgent(agentId: string): Promise<NANDAIndexRecord | null> {
    const startTime = Date.now();

    try {
      // Check cache
      const cached = this.cache.get<NANDAIndexRecord>(agentId);
      if (cached) {
        this.metrics.totalQueries++;
        return cached;
      }

      // Get from DynamoDB
      const command = new GetItemCommand({
        TableName: 'nanda-index',
        Key: {
          agent_id: { S: agentId }
        }
      });

      const response = await this.dynamodb.send(command);
      if (!response.Item) {
        return null;
      }

      const record = this.unmarshalRecord(response.Item);

      // Verify signature
      if (!this.verifySignature(record)) {
        throw new Error('Invalid signature on record');
      }

      // Cache the record
      this.cache.set(agentId, record, record.ttl);

      // Update metrics
      this.metrics.totalQueries++;
      this.metrics.queryLatencies.push(Date.now() - startTime);

      return record;

    } catch (error) {
      this.metrics.errorCount++;
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Update an existing agent
   */
  async updateAgent(
    agentId: string,
    updates: Partial<NANDAIndexRecord>
  ): Promise<NANDAIndexRecord> {
    const startTime = Date.now();

    try {
      // Get existing record
      const existing = await this.getAgent(agentId);
      if (!existing) {
        throw new Error(`Agent ${agentId} not found`);
      }

      // Merge updates
      const updated: NANDAIndexRecord = {
        ...existing,
        ...updates,
        agent_id: agentId, // Ensure ID doesn't change
        version: existing.version + BigInt(1),
        updated_at: Date.now()
      };

      // Re-sign the record
      updated.signature = this.signRecord(updated);

      // Store updated record
      await this.storeRecord(updated);

      // Update cache
      this.cache.set(agentId, updated, updated.ttl);

      // Publish CRDT update
      await this.publishCRDTUpdate({
        type: 'update',
        record: updated,
        timestamp: Date.now(),
        node_id: this.nodeId,
        vector_clock: this.incrementVectorClock()
      });

      // Update metrics
      this.metrics.totalUpdates++;
      this.metrics.updateLatencies.push(Date.now() - startTime);

      this.emit('agent:updated', updated);
      return updated;

    } catch (error) {
      this.metrics.errorCount++;
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Compress a record for network transmission
   */
  compressRecord(record: NANDAIndexRecord): CompressedNANDARecord {
    // Use CBOR for efficient binary encoding
    const data = cbor.encode(record);

    // Calculate checksum
    const checksum = murmurhash.x86.hash128(data);

    return {
      data,
      checksum
    };
  }

  /**
   * Decompress a record received from network
   */
  decompressRecord(compressed: CompressedNANDARecord): NANDAIndexRecord {
    // Verify checksum
    const checksum = murmurhash.x86.hash128(compressed.data);
    if (checksum !== compressed.checksum) {
      throw new Error('Checksum mismatch - data corrupted');
    }

    // Decode CBOR
    return cbor.decode(compressed.data);
  }

  /**
   * Get current index statistics
   */
  getStatistics(): IndexStatistics {
    const now = Date.now();
    const uptime = (now - this.metrics.startTime) / 1000;

    const calculatePercentile = (arr: number[], p: number) => {
      if (arr.length === 0) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const index = Math.ceil(sorted.length * p / 100) - 1;
      return sorted[Math.max(0, index)];
    };

    return {
      total_agents: this.cache.keys().length,
      active_agents: this.cache.keys().filter(k => !this.cache.getTtl(k)).length,
      updates_per_second: this.metrics.totalUpdates / uptime,
      query_latency_p50: calculatePercentile(this.metrics.queryLatencies, 50),
      query_latency_p95: calculatePercentile(this.metrics.queryLatencies, 95),
      query_latency_p99: calculatePercentile(this.metrics.queryLatencies, 99),
      storage_size_bytes: 0, // Would need to query DynamoDB
      network_bandwidth_mbps: 0, // Would need network monitoring
      error_rate: this.metrics.errorCount / (this.metrics.totalQueries + this.metrics.totalUpdates),
      uptime_seconds: uptime
    };
  }

  /**
   * Private helper methods
   */

  private formatAgentName(name: string): string {
    // Ensure URN format
    if (!name.startsWith('urn:')) {
      return `urn:nanda:${name.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;
    }
    return name;
  }

  private signRecord(record: Omit<NANDAIndexRecord, 'signature'>): Buffer {
    // Create signing payload (exclude signature field)
    const payload = msgpack.encode({
      agent_id: record.agent_id,
      agent_name: record.agent_name,
      primary_facts_url: record.primary_facts_url,
      private_facts_url: record.private_facts_url,
      adaptive_resolver_url: record.adaptive_resolver_url,
      ttl: record.ttl,
      version: record.version.toString(),
      updated_at: record.updated_at
    });

    // Sign with Ed25519
    return Buffer.from(ed25519.Sign(payload, this.privateKey));
  }

  private verifySignature(record: NANDAIndexRecord): boolean {
    const payload = msgpack.encode({
      agent_id: record.agent_id,
      agent_name: record.agent_name,
      primary_facts_url: record.primary_facts_url,
      private_facts_url: record.private_facts_url,
      adaptive_resolver_url: record.adaptive_resolver_url,
      ttl: record.ttl,
      version: record.version.toString(),
      updated_at: record.updated_at
    });

    return ed25519.Verify(payload, record.signature, this.publicKey);
  }

  private incrementVectorClock(): Map<string, number> {
    const current = this.vectorClock.get(this.nodeId) || 0;
    this.vectorClock.set(this.nodeId, current + 1);
    return new Map(this.vectorClock);
  }

  private async handleCRDTUpdate(operation: CRDTOperation): Promise<void> {
    // Implement CRDT merge logic
    // This would handle conflicts and ensure eventual consistency
    // For now, we'll do a simple last-write-wins
    if (operation.record && operation.record.agent_id) {
      const existing = await this.getAgent(operation.record.agent_id);
      if (!existing || operation.timestamp > existing.updated_at) {
        await this.storeRecord(operation.record as NANDAIndexRecord);
        this.cache.set(operation.record.agent_id, operation.record);
      }
    }
  }

  private async publishCRDTUpdate(operation: CRDTOperation): Promise<void> {
    await this.redis.publish('nanda:updates', JSON.stringify(operation));
  }

  private async storeRecord(record: NANDAIndexRecord): Promise<void> {
    const command = new PutItemCommand({
      TableName: 'nanda-index',
      Item: this.marshalRecord(record)
    });
    await this.dynamodb.send(command);
  }

  private marshalRecord(record: NANDAIndexRecord): any {
    return {
      agent_id: { S: record.agent_id },
      agent_name: { S: record.agent_name },
      primary_facts_url: { S: record.primary_facts_url },
      private_facts_url: { S: record.private_facts_url },
      adaptive_resolver_url: { S: record.adaptive_resolver_url },
      ttl: { N: record.ttl.toString() },
      signature: { B: record.signature },
      version: { N: record.version.toString() },
      updated_at: { N: record.updated_at.toString() }
    };
  }

  private unmarshalRecord(item: any): NANDAIndexRecord {
    return {
      agent_id: item.agent_id.S,
      agent_name: item.agent_name.S,
      primary_facts_url: item.primary_facts_url.S,
      private_facts_url: item.private_facts_url.S,
      adaptive_resolver_url: item.adaptive_resolver_url.S,
      ttl: parseInt(item.ttl.N),
      signature: Buffer.from(item.signature.B, 'base64'),
      version: BigInt(item.version.N),
      updated_at: parseInt(item.updated_at.N)
    };
  }

  private async queryDynamoDB(params: any): Promise<NANDAIndexRecord[]> {
    // Implement query logic based on params
    const command = new ScanCommand({
      TableName: 'nanda-index',
      Limit: params.limit || 100
    });

    const response = await this.dynamodb.send(command);
    return (response.Items || []).map(item => this.unmarshalRecord(item));
  }

  private async ensureTableExists(): Promise<void> {
    // This would create the DynamoDB table if it doesn't exist
    // Implementation depends on permissions and setup
  }

  private async loadInitialData(): Promise<void> {
    // Load any initial data from DynamoDB into cache
    const results = await this.queryDynamoDB({ limit: 1000 });
    results.forEach(record => {
      this.cache.set(record.agent_id, record, record.ttl);
    });
  }

  private startBackgroundTasks(): void {
    // Periodic cleanup of expired entries
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 60000); // Every minute

    // Periodic metrics reporting
    setInterval(() => {
      this.emit('metrics', this.getStatistics());
    }, 10000); // Every 10 seconds
  }

  private async cleanupExpiredEntries(): Promise<void> {
    // Remove expired entries from cache and optionally from DynamoDB
    const now = Date.now();
    const keys = this.cache.keys();

    for (const key of keys) {
      const record = this.cache.get<NANDAIndexRecord>(key);
      if (record && record.updated_at + (record.ttl * 1000) < now) {
        this.cache.del(key);
        this.emit('agent:expired', record);
      }
    }
  }

  /**
   * Cleanup and close connections
   */
  async close(): Promise<void> {
    await this.redis.disconnect();
    this.cache.flushAll();
    this.removeAllListeners();
  }
}

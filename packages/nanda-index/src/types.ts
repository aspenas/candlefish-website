/**
 * NANDA Index Types - Core data structures for AI Agent Discovery
 * Based on NANDA paper (arxiv:2507.14263)
 */

import { z } from 'zod';

/**
 * Core NANDA Index Record - Lean structure (<120 bytes)
 * This is the fundamental unit of the NANDA Index
 */
export interface NANDAIndexRecord {
  // 16 bytes - Unique agent identifier (UUID v7 for time-ordering)
  agent_id: string;

  // 32 bytes - URN-formatted agent name (e.g., "urn:nanda:openai:gpt-4")
  agent_name: string;

  // 32 bytes - URL to public agent facts (HTTP/HTTPS/IPFS)
  primary_facts_url: string;

  // 32 bytes - URL to private agent facts (Tor/IPFS/encrypted)
  private_facts_url: string;

  // 32 bytes - URL to adaptive resolver for dynamic routing
  adaptive_resolver_url: string;

  // 4 bytes - Time-to-live in seconds
  ttl: number;

  // 64 bytes - Ed25519 signature for authenticity
  signature: Buffer;

  // 8 bytes - CRDT vector clock for distributed updates
  version: BigInt;

  // 8 bytes - Unix timestamp of last update
  updated_at: number;
}

/**
 * Compressed binary format for network transmission
 */
export interface CompressedNANDARecord {
  data: Buffer; // CBOR-encoded record
  checksum: string; // MurmurHash3 for integrity
}

/**
 * Agent Facts Schema - W3C Verifiable Credentials v2 compatible
 */
export const AgentFactsSchema = z.object({
  '@context': z.array(z.string()).default([
    'https://www.w3.org/2018/credentials/v1',
    'https://nanda.candlefish.ai/v1/context'
  ]),

  id: z.string().url(),
  type: z.array(z.string()).default(['VerifiableCredential', 'AgentFacts']),

  issuer: z.object({
    id: z.string(),
    name: z.string().optional(),
    publicKey: z.string() // Ed25519 public key
  }),

  issuanceDate: z.string().datetime(),
  expirationDate: z.string().datetime().optional(),

  credentialSubject: z.object({
    id: z.string(), // Agent ID

    capabilities: z.array(z.object({
      type: z.string(), // e.g., "text-generation", "image-analysis"
      version: z.string(),
      endpoints: z.array(z.object({
        url: z.string().url(),
        protocol: z.enum(['http', 'https', 'websocket', 'grpc', 'graphql']),
        ttl: z.number(), // Endpoint-specific TTL
        priority: z.number().min(0).max(100),
        region: z.string().optional(), // Geographic region
        rateLimit: z.object({
          requests: z.number(),
          window: z.number() // in seconds
        }).optional()
      }))
    })),

    pricing: z.object({
      model: z.enum(['free', 'freemium', 'usage', 'subscription', 'enterprise']),
      currency: z.string().default('USD'),
      rates: z.record(z.number()).optional(), // Key-value pairs for different metrics
      micropayment: z.boolean().default(false)
    }).optional(),

    compliance: z.object({
      gdpr: z.boolean().optional(),
      ccpa: z.boolean().optional(),
      hipaa: z.boolean().optional(),
      sox: z.boolean().optional(),
      iso27001: z.boolean().optional()
    }).optional(),

    metadata: z.object({
      name: z.string(),
      description: z.string(),
      vendor: z.string(),
      category: z.array(z.string()),
      tags: z.array(z.string()),
      icon: z.string().url().optional(),
      documentation: z.string().url().optional()
    })
  }),

  proof: z.object({
    type: z.string().default('Ed25519Signature2020'),
    created: z.string().datetime(),
    verificationMethod: z.string(),
    proofPurpose: z.string().default('assertionMethod'),
    proofValue: z.string() // Base64-encoded signature
  })
});

export type AgentFacts = z.infer<typeof AgentFactsSchema>;

/**
 * CRDT Operation for distributed consensus
 */
export interface CRDTOperation {
  type: 'insert' | 'update' | 'delete';
  record: Partial<NANDAIndexRecord>;
  timestamp: number;
  node_id: string;
  vector_clock: Map<string, number>;
}

/**
 * Adaptive Resolver Configuration
 */
export interface AdaptiveResolverConfig {
  agent_id: string;

  // Routing strategies
  strategies: {
    geographic: boolean; // Route to nearest endpoint
    loadBalanced: boolean; // Distribute across endpoints
    failover: boolean; // Automatic failover on errors
    canary: boolean; // Percentage-based rollout
  };

  // Security settings
  security: {
    requireAuth: boolean;
    allowedOrigins: string[];
    rateLimiting: {
      enabled: boolean;
      maxRequests: number;
      windowMs: number;
    };
    ddosProtection: boolean;
  };

  // Performance settings
  performance: {
    cacheEnabled: boolean;
    cacheTTL: number;
    compressionEnabled: boolean;
    http2Enabled: boolean;
    http3Enabled: boolean;
  };

  // Observability
  observability: {
    tracingEnabled: boolean;
    metricsEnabled: boolean;
    loggingLevel: 'debug' | 'info' | 'warn' | 'error';
    openTelemetryEndpoint?: string;
  };
}

/**
 * Enterprise Registry Integration
 */
export interface EnterpriseRegistry {
  type: 'google' | 'microsoft' | 'salesforce' | 'aws' | 'custom';
  endpoint: string;
  authentication: {
    type: 'oauth2' | 'apikey' | 'jwt' | 'saml';
    credentials: Record<string, any>;
  };
  syncInterval: number; // in seconds
  mappings: {
    agent_id: string;
    agent_name: string;
    capabilities: string;
    metadata: string;
  };
}

/**
 * Privacy-preserving lookup request
 */
export interface PrivateLookupRequest {
  query_hash: string; // SHA-256 hash of the query
  zero_knowledge_proof?: string; // Optional ZK proof
  mix_net_route?: string[]; // Onion routing path
  ephemeral_key?: string; // For response encryption
}

/**
 * Index statistics for monitoring
 */
export interface IndexStatistics {
  total_agents: number;
  active_agents: number;
  updates_per_second: number;
  query_latency_p50: number;
  query_latency_p95: number;
  query_latency_p99: number;
  storage_size_bytes: number;
  network_bandwidth_mbps: number;
  error_rate: number;
  uptime_seconds: number;
}

/**
 * Subscription tiers for monetization
 */
export enum SubscriptionTier {
  FREE = 'free', // 100 queries/day, basic features
  DEVELOPER = 'developer', // 10k queries/day, API access
  ENTERPRISE = 'enterprise', // Unlimited, SLA, support
  SOVEREIGN = 'sovereign' // Self-hosted, full control
}

/**
 * Governance action for decentralized control
 */
export interface GovernanceAction {
  id: string;
  type: 'proposal' | 'vote' | 'execution';
  title: string;
  description: string;
  proposer: string;
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  votes: {
    for: number;
    against: number;
    abstain: number;
  };
  threshold: number;
  deadline: Date;
}

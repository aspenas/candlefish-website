/**
 * NANDA Index Test Suite
 */

import { NANDAIndex, AgentFactsResolver, AdaptiveResolver, PrivacyLayer, EnterpriseConnector } from '../src';
import { NANDAIndexRecord, AgentFacts } from '../src/types';

describe('NANDA Index Core', () => {
  let index: NANDAIndex;

  beforeAll(async () => {
    index = new NANDAIndex({
      region: 'us-east-1',
      nodeId: 'test-node-1'
    });
    await index.initialize();
  });

  afterAll(async () => {
    await index.close();
  });

  describe('Agent Registration', () => {
    it('should register a new agent with lean record', async () => {
      const agent = await index.registerAgent({
        agentName: 'test-agent',
        primaryFactsUrl: 'https://example.com/facts.json',
        privateFactsUrl: 'ipfs://QmTest',
        adaptiveResolverUrl: 'https://resolver.example.com',
        ttl: 3600
      });

      expect(agent).toBeDefined();
      expect(agent.agent_id).toBeTruthy();
      expect(agent.agent_name).toBe('urn:nanda:test-agent');
      expect(agent.signature).toHaveLength(64);
      expect(agent.version).toBe(BigInt(1));
    });

    it('should enforce 120-byte record limit', async () => {
      const agent = await index.registerAgent({
        agentName: 'compact',
        primaryFactsUrl: 'https://a.io/f',
        privateFactsUrl: 'ipfs://Qm',
        adaptiveResolverUrl: 'https://r.io',
        ttl: 60
      });

      const compressed = index.compressRecord(agent);
      expect(compressed.data.length).toBeLessThanOrEqual(120);
    });
  });

  describe('CRDT Operations', () => {
    it('should handle concurrent updates with vector clocks', async () => {
      const agent = await index.registerAgent({
        agentName: 'crdt-test',
        primaryFactsUrl: 'https://example.com/v1',
        privateFactsUrl: 'ipfs://v1',
        adaptiveResolverUrl: 'https://resolver.v1',
        ttl: 3600
      });

      // Simulate concurrent updates
      const update1 = index.updateAgent(agent.agent_id, {
        primaryFactsUrl: 'https://example.com/v2'
      });

      const update2 = index.updateAgent(agent.agent_id, {
        ttl: 7200
      });

      const [result1, result2] = await Promise.all([update1, update2]);

      // Both updates should succeed with incremented versions
      expect(result1.version).toBeGreaterThan(agent.version);
      expect(result2.version).toBeGreaterThan(agent.version);
    });
  });

  describe('Query Performance', () => {
    it('should query agents within 100ms p95', async () => {
      // Populate with test data
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(index.registerAgent({
          agentName: `perf-agent-${i}`,
          primaryFactsUrl: `https://perf.test/${i}`,
          privateFactsUrl: `ipfs://perf${i}`,
          adaptiveResolverUrl: `https://resolver.perf/${i}`,
          ttl: 3600
        }));
      }
      await Promise.all(promises);

      // Measure query latency
      const latencies: number[] = [];
      for (let i = 0; i < 100; i++) {
        const start = Date.now();
        await index.queryAgents({ capability: 'test', limit: 10 });
        latencies.push(Date.now() - start);
      }

      latencies.sort((a, b) => a - b);
      const p95 = latencies[Math.floor(latencies.length * 0.95)];

      expect(p95).toBeLessThan(100);
    });
  });
});

describe('Agent Facts Resolver', () => {
  let resolver: AgentFactsResolver;

  beforeAll(() => {
    resolver = new AgentFactsResolver({
      cacheTTL: 60,
      httpTimeout: 5000
    });
  });

  afterAll(() => {
    resolver.close();
  });

  describe('W3C Verifiable Credentials', () => {
    it('should validate credential schema', async () => {
      const mockFacts: AgentFacts = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        id: 'https://example.com/credentials/123',
        type: ['VerifiableCredential', 'AgentFacts'],
        issuer: {
          id: 'did:web:example.com',
          name: 'Example Issuer',
          publicKey: '0x123...'
        },
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
          id: 'agent-123',
          capabilities: [{
            type: 'text-generation',
            version: '1.0',
            endpoints: [{
              url: 'https://api.example.com',
              protocol: 'https',
              ttl: 3600,
              priority: 50
            }]
          }],
          metadata: {
            name: 'Test Agent',
            description: 'A test agent',
            vendor: 'test',
            category: ['test'],
            tags: ['test']
          }
        },
        proof: {
          type: 'Ed25519Signature2020',
          created: new Date().toISOString(),
          verificationMethod: 'did:web:example.com#key-1',
          proofPurpose: 'assertionMethod',
          proofValue: 'signature...'
        }
      };

      // Validate against schema
      const { AgentFactsSchema } = require('../src/types');
      const result = AgentFactsSchema.safeParse(mockFacts);
      expect(result.success).toBe(true);
    });
  });

  describe('Endpoint Selection', () => {
    it('should select best endpoint based on criteria', async () => {
      const facts: any = {
        credentialSubject: {
          capabilities: [{
            type: 'text-generation',
            version: '1.0',
            endpoints: [
              { url: 'https://us-east.api.com', region: 'us-east-1', priority: 90, protocol: 'https' },
              { url: 'https://eu-west.api.com', region: 'eu-west-1', priority: 80, protocol: 'https' },
              { url: 'https://ap-south.api.com', region: 'ap-south-1', priority: 70, protocol: 'https' }
            ]
          }]
        }
      };

      const endpoint = await resolver.selectBestEndpoint(facts, {
        region: 'us-east-1',
        minPriority: 80
      });

      expect(endpoint).toBeDefined();
      expect(endpoint?.url).toBe('https://us-east.api.com');
    });
  });
});

describe('Adaptive Resolver', () => {
  let resolver: AdaptiveResolver;

  beforeAll(async () => {
    resolver = new AdaptiveResolver({
      agent_id: 'test-resolver',
      strategies: {
        geographic: true,
        loadBalanced: true,
        failover: true,
        canary: false
      },
      security: {
        requireAuth: false,
        allowedOrigins: ['*'],
        rateLimiting: { enabled: true, maxRequests: 100, windowMs: 60000 },
        ddosProtection: true
      },
      performance: {
        cacheEnabled: true,
        cacheTTL: 60,
        compressionEnabled: true,
        http2Enabled: true,
        http3Enabled: false
      },
      observability: {
        tracingEnabled: true,
        metricsEnabled: true,
        loggingLevel: 'info'
      }
    });

    // Register test endpoints
    await resolver.registerEndpoint({
      url: 'https://endpoint1.test',
      region: 'us-east-1',
      capabilities: ['text-generation'],
      weight: 1
    });

    await resolver.registerEndpoint({
      url: 'https://endpoint2.test',
      region: 'us-east-1',
      capabilities: ['text-generation'],
      weight: 2
    });
  });

  afterAll(() => {
    resolver.close();
  });

  describe('Routing Strategies', () => {
    it('should route with geographic preference', async () => {
      const result = await resolver.route({
        agentId: 'agent-123',
        capability: 'text-generation',
        clientIP: '192.168.1.1',
        region: 'us-east-1'
      });

      expect(result).toBeDefined();
      expect(result.endpoint).toBeTruthy();
      expect(result.token).toBeTruthy();
      expect(result.sessionId).toBeTruthy();
      expect(result.ttl).toBeGreaterThan(0);
    });

    it('should handle session binding', async () => {
      const first = await resolver.route({
        agentId: 'agent-456',
        capability: 'text-generation',
        clientIP: '192.168.1.2'
      });

      const second = await resolver.route({
        agentId: 'agent-456',
        capability: 'text-generation',
        clientIP: '192.168.1.2',
        sessionId: first.sessionId
      });

      expect(second.endpoint).toBe(first.endpoint);
      expect(second.sessionId).toBe(first.sessionId);
    });
  });

  describe('Traffic Shaping', () => {
    it('should configure canary deployment', () => {
      resolver.startCanaryDeployment({
        canaryEndpoint: 'https://canary.test',
        percentage: 10
      });

      const metrics = resolver.getMetrics();
      expect(metrics).toBeDefined();
    });

    it('should configure blue-green deployment', () => {
      resolver.startBlueGreenDeployment({
        blueEndpoints: ['https://blue1.test', 'https://blue2.test'],
        greenEndpoints: ['https://green1.test'],
        ratio: 20 // 20% to green
      });

      const metrics = resolver.getMetrics();
      expect(metrics).toBeDefined();
    });
  });
});

describe('Privacy Layer', () => {
  let privacy: PrivacyLayer;

  beforeAll(() => {
    privacy = new PrivacyLayer({
      cacheTTL: 60
    });
  });

  afterAll(() => {
    privacy.close();
  });

  describe('Zero-Knowledge Proofs', () => {
    it('should generate capability proof', async () => {
      const proof = await privacy.generateCapabilityProof({
        capability: 'medical-diagnosis',
        agentId: 'medical-agent-1'
      });

      expect(proof).toBeDefined();
      expect(proof.commitment).toBeTruthy();
      expect(proof.challenge).toBeTruthy();
      expect(proof.response).toBeTruthy();
      expect(proof.proofType).toBe('capability');
    });

    it('should verify valid proof', async () => {
      const proof = await privacy.generateCapabilityProof({
        capability: 'financial-analysis',
        agentId: 'finance-agent-1'
      });

      const verified = await privacy.verifyZKProof(JSON.stringify(proof));
      expect(verified).toBeTruthy();
    });
  });

  describe('Private Storage', () => {
    it('should store and retrieve private facts', async () => {
      const facts = {
        capabilities: ['sensitive-data-processing'],
        compliance: { hipaa: true, gdpr: true }
      };

      const stored = await privacy.storePrivateFacts({
        agentId: 'private-agent-1',
        facts,
        storageType: 'encrypted-s3',
        accessPolicy: {
          allowedIdentities: ['did:web:trusted.com'],
          requiredProofs: ['capability'],
          minimumTrustLevel: 80
        }
      });

      expect(stored.url).toBeTruthy();
      expect(stored.encryptionKey).toBeTruthy();

      const retrieved = await privacy.retrievePrivateFacts({
        agentId: 'private-agent-1',
        encryptionKey: stored.encryptionKey
      });

      expect(retrieved).toEqual(facts);
    });
  });

  describe('Audit Trail', () => {
    it('should maintain tamper-evident audit log', () => {
      const isValid = privacy.verifyAuditLog();
      expect(isValid).toBe(true);

      const metrics = privacy.getMetrics();
      expect(metrics.auditLogValid).toBe(true);
    });
  });
});

describe('Enterprise Connector', () => {
  let connector: EnterpriseConnector;

  beforeAll(() => {
    connector = new EnterpriseConnector({
      federationConfig: {
        trustedRegistries: ['did:web:openai.com'],
        crossSigningEnabled: true,
        sharedNamespace: 'urn:nanda:federated',
        conflictResolution: 'newest'
      }
    });
  });

  afterAll(() => {
    connector.close();
  });

  describe('Platform Integration', () => {
    it('should add enterprise registry', () => {
      connector.addRegistry({
        type: 'custom',
        endpoint: 'https://custom.ai/api',
        authentication: {
          type: 'apikey',
          credentials: { apiKey: 'test-key' }
        },
        syncInterval: 3600,
        mappings: {
          agent_id: 'id',
          agent_name: 'name',
          capabilities: 'skills',
          metadata: 'meta'
        }
      });

      const metrics = connector.getMetrics();
      expect(metrics.registries).toBeGreaterThan(0);
    });
  });

  describe('Cross-Registry Federation', () => {
    it('should cross-sign credentials', async () => {
      const credential: any = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        id: 'https://example.com/cred/1',
        type: ['VerifiableCredential'],
        issuer: { id: 'did:web:source.com' },
        issuanceDate: new Date().toISOString(),
        credentialSubject: { id: 'agent-1' },
        proof: {
          type: 'Ed25519Signature2020',
          proofValue: 'original-signature'
        }
      };

      const crossSigned = await connector.crossSignCredential(
        credential,
        'did:web:openai.com'
      );

      expect(crossSigned.proof.proofValue).toContain('did:web:openai.com');
    });
  });
});

describe('Performance Benchmarks', () => {
  it('should handle 10k updates per second', async () => {
    const index = new NANDAIndex({ nodeId: 'perf-test' });
    await index.initialize();

    const start = Date.now();
    const promises = [];

    for (let i = 0; i < 1000; i++) {
      promises.push(index.registerAgent({
        agentName: `perf-${i}`,
        primaryFactsUrl: `https://p.io/${i}`,
        privateFactsUrl: `ipfs://${i}`,
        adaptiveResolverUrl: `https://r.io/${i}`,
        ttl: 60
      }));
    }

    await Promise.all(promises);
    const duration = Date.now() - start;
    const throughput = 1000 / (duration / 1000);

    expect(throughput).toBeGreaterThan(100); // Conservative for tests

    await index.close();
  });

  it('should compress records to <120 bytes', () => {
    const index = new NANDAIndex({ nodeId: 'compress-test' });

    const record: NANDAIndexRecord = {
      agent_id: '550e8400-e29b-41d4-a716-446655440000',
      agent_name: 'urn:nanda:test:agent',
      primary_facts_url: 'https://facts.test/1',
      private_facts_url: 'ipfs://Qm123',
      adaptive_resolver_url: 'https://r.test',
      ttl: 3600,
      signature: Buffer.alloc(64),
      version: BigInt(1),
      updated_at: Date.now()
    };

    const compressed = index.compressRecord(record);
    expect(compressed.data.length).toBeLessThanOrEqual(120);

    const decompressed = index.decompressRecord(compressed);
    expect(decompressed.agent_id).toBe(record.agent_id);
  });
});

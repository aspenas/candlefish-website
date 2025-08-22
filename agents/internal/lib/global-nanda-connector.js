/**
 * Global NANDA Registry Connector
 * Prepares Candlefish.ai agents for global NANDA network integration
 */

const axios = require('axios');
const EventEmitter = require('events');
const crypto = require('crypto');

class GlobalNANDAConnector extends EventEmitter {
  constructor(config = {}) {
    super();

    // Configuration
    this.localOrchestrator = config.orchestratorURL || 'http://localhost:7010';
    this.publicEndpoint = config.publicEndpoint || 'https://nanda.candlefish.ai';
    this.organizationId = 'candlefish-ai';

    // Global NANDA registry (when available)
    this.globalRegistry = process.env.GLOBAL_NANDA_URL || 'https://index.nanda.ai';
    this.registrationStatus = 'pending';

    // Agent capabilities aggregation
    this.localAgents = new Map();
    this.externalAgents = new Map();

    // DID (Decentralized Identifier) for Candlefish
    this.did = this.generateDID();
  }

  generateDID() {
    // Generate a unique DID for Candlefish.ai
    const timestamp = Date.now();
    const random = crypto.randomBytes(16).toString('hex');
    return `did:nanda:candlefish:${timestamp}:${random}`;
  }

  /**
   * Register Candlefish.ai with global NANDA network
   */
  async connectToGlobalNANDA() {
    console.log('[GlobalNANDA] Attempting to connect to global registry...');

    try {
      // Get all local agent capabilities
      const capabilities = await this.aggregateCapabilities();

      // Prepare registration payload
      const registration = {
        did: this.did,
        organization: this.organizationId,
        endpoint: this.publicEndpoint,
        capabilities: capabilities,
        agents: Array.from(this.localAgents.values()),
        metadata: {
          name: 'Candlefish AI Network',
          description: 'Enterprise NANDA agent network for business automation',
          version: '2.0.0',
          protocols: ['nanda-v1', 'consortium-v1', 'crdt-sync'],
          authentication: ['jwt', 'did-auth'],
          sla: {
            availability: '99.9%',
            latency_p95: '100ms',
            throughput: '10000 req/s'
          }
        },
        signature: this.signRegistration(registration)
      };

      // Attempt registration
      const response = await axios.post(`${this.globalRegistry}/register`, registration, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'X-NANDA-Version': '1.0.0'
        }
      });

      if (response.data.success) {
        this.registrationStatus = 'registered';
        this.registrationId = response.data.registration_id;

        console.log(`[GlobalNANDA] Successfully registered with ID: ${this.registrationId}`);
        this.emit('registered', { id: this.registrationId });

        // Start heartbeat to maintain registration
        this.startHeartbeat();

        // Start discovery of external agents
        this.startDiscovery();

        return {
          success: true,
          registration_id: this.registrationId,
          did: this.did
        };
      }

    } catch (error) {
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        console.log('[GlobalNANDA] Global registry not yet available. Will retry later.');
        this.scheduleRetry();
      } else {
        console.error('[GlobalNANDA] Registration failed:', error.message);
      }

      return {
        success: false,
        error: error.message,
        retry_scheduled: true
      };
    }
  }

  /**
   * Aggregate capabilities from all local agents
   */
  async aggregateCapabilities() {
    try {
      const response = await axios.get(`${this.localOrchestrator}/agents`);
      const agents = response.data.agents || [];

      const capabilities = new Set();

      for (const agent of agents) {
        this.localAgents.set(agent.id, {
          id: agent.id,
          name: agent.name,
          endpoint: `${this.publicEndpoint}/api/${agent.id.split(':')[1]}`,
          capabilities: agent.capabilities
        });

        // Aggregate all unique capabilities
        if (agent.capabilities) {
          agent.capabilities.forEach(cap => capabilities.add(cap));
        }
      }

      return Array.from(capabilities);
    } catch (error) {
      console.error('[GlobalNANDA] Failed to aggregate capabilities:', error);
      return [];
    }
  }

  /**
   * Sign registration for authenticity
   */
  signRegistration(data) {
    const message = JSON.stringify(data);
    const hash = crypto.createHash('sha256').update(message).digest();

    // In production, use proper digital signature
    const signature = crypto.createHmac('sha256', process.env.NANDA_SIGNING_KEY || 'candlefish-key')
      .update(hash)
      .digest('base64');

    return signature;
  }

  /**
   * Discover external NANDA agents
   */
  async discoverExternalAgents(capabilities = []) {
    if (this.registrationStatus !== 'registered') {
      console.log('[GlobalNANDA] Not registered yet, cannot discover agents');
      return [];
    }

    try {
      const response = await axios.post(`${this.globalRegistry}/discover`, {
        capabilities: capabilities,
        location: 'us-west',
        max_results: 100
      }, {
        headers: {
          'Authorization': `Bearer ${this.registrationId}`,
          'X-NANDA-DID': this.did
        }
      });

      const agents = response.data.agents || [];

      // Cache discovered agents
      for (const agent of agents) {
        this.externalAgents.set(agent.did, agent);
      }

      console.log(`[GlobalNANDA] Discovered ${agents.length} external agents`);
      this.emit('agents_discovered', agents);

      return agents;
    } catch (error) {
      console.error('[GlobalNANDA] Discovery failed:', error.message);
      return [];
    }
  }

  /**
   * Form consortium with external agents
   */
  async formExternalConsortium(task, requiredCapabilities) {
    // Find suitable external agents
    const candidates = [];

    for (const [did, agent] of this.externalAgents) {
      const hasCapability = requiredCapabilities.some(cap =>
        agent.capabilities && agent.capabilities.includes(cap)
      );

      if (hasCapability) {
        candidates.push(agent);
      }
    }

    if (candidates.length === 0) {
      console.log('[GlobalNANDA] No external agents found with required capabilities');
      return null;
    }

    // Create consortium proposal
    const consortium = {
      id: `consortium-${Date.now()}`,
      initiator: this.did,
      task: task,
      requirements: requiredCapabilities,
      participants: candidates.map(a => a.did),
      created_at: new Date().toISOString()
    };

    // Send invitations to external agents
    const acceptances = await this.inviteToConsortium(candidates, consortium);

    if (acceptances.length > 0) {
      console.log(`[GlobalNANDA] Formed external consortium with ${acceptances.length} agents`);

      return {
        consortium_id: consortium.id,
        participants: acceptances,
        task: task
      };
    }

    return null;
  }

  async inviteToConsortium(agents, consortium) {
    const invitations = agents.map(agent =>
      this.sendConsortiumInvite(agent, consortium)
    );

    const results = await Promise.allSettled(invitations);

    return results
      .filter(r => r.status === 'fulfilled' && r.value.accepted)
      .map(r => r.value);
  }

  async sendConsortiumInvite(agent, consortium) {
    try {
      const response = await axios.post(`${agent.endpoint}/consortium/invite`, {
        consortium: consortium,
        initiator: {
          did: this.did,
          name: 'Candlefish AI',
          endpoint: this.publicEndpoint
        },
        compensation: {
          type: 'credits',
          amount: 100
        }
      }, {
        timeout: 5000
      });

      return {
        agent: agent.did,
        accepted: response.data.accepted,
        bid: response.data.bid
      };
    } catch (error) {
      console.error(`[GlobalNANDA] Failed to invite ${agent.did}:`, error.message);
      return { agent: agent.did, accepted: false };
    }
  }

  /**
   * Handle incoming consortium invitations
   */
  async handleConsortiumInvite(invitation) {
    // Evaluate if we should participate
    const evaluation = this.evaluateInvitation(invitation);

    if (evaluation.accept) {
      console.log(`[GlobalNANDA] Accepting consortium invitation: ${invitation.consortium.id}`);

      return {
        accepted: true,
        agent_id: this.did,
        capabilities: await this.aggregateCapabilities(),
        bid: evaluation.bid,
        availability: 'immediate'
      };
    }

    return {
      accepted: false,
      reason: evaluation.reason
    };
  }

  evaluateInvitation(invitation) {
    // Simple evaluation logic
    const ourCapabilities = Array.from(this.localAgents.values())
      .flatMap(a => a.capabilities || []);

    const canFulfill = invitation.consortium.requirements.some(req =>
      ourCapabilities.includes(req)
    );

    if (!canFulfill) {
      return { accept: false, reason: 'No matching capabilities' };
    }

    // Calculate bid based on task complexity
    const bid = 50 + Math.floor(Math.random() * 100);

    return {
      accept: true,
      bid: bid
    };
  }

  /**
   * Maintain registration with heartbeat
   */
  startHeartbeat() {
    setInterval(async () => {
      if (this.registrationStatus === 'registered') {
        try {
          await axios.post(`${this.globalRegistry}/heartbeat`, {
            registration_id: this.registrationId,
            did: this.did,
            status: 'active',
            metrics: await this.getMetrics()
          });
        } catch (error) {
          console.error('[GlobalNANDA] Heartbeat failed:', error.message);
        }
      }
    }, 60000); // Every minute
  }

  /**
   * Start periodic discovery
   */
  startDiscovery() {
    // Discover new agents every 5 minutes
    setInterval(() => {
      this.discoverExternalAgents();
    }, 300000);

    // Initial discovery
    this.discoverExternalAgents();
  }

  /**
   * Schedule retry for registration
   */
  scheduleRetry() {
    setTimeout(() => {
      this.connectToGlobalNANDA();
    }, 300000); // Retry in 5 minutes
  }

  async getMetrics() {
    try {
      const response = await axios.get(`${this.localOrchestrator}/health`);
      return response.data.metrics || {};
    } catch (error) {
      return {};
    }
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      registration_status: this.registrationStatus,
      registration_id: this.registrationId,
      did: this.did,
      local_agents: this.localAgents.size,
      external_agents: this.externalAgents.size,
      global_registry: this.globalRegistry,
      public_endpoint: this.publicEndpoint
    };
  }
}

// Singleton instance
let connector = null;

module.exports = {
  GlobalNANDAConnector,

  // Get or create singleton
  getInstance: (config) => {
    if (!connector) {
      connector = new GlobalNANDAConnector(config);
    }
    return connector;
  }
};

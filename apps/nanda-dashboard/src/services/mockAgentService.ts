import {
  LivingAgent,
  AgentMessage,
  AgentBid,
  AgentConsortium,
  AgentNegotiation,
  PerformanceOptimization,
  AgentCapability,
  AgentReputation
} from '../types/agent.types';

// Mock agent names
const AGENT_NAMES = [
  'Apollo', 'Artemis', 'Athena', 'Hermes', 'Dionysus', 'Persephone',
  'Phoenix', 'Orion', 'Cassandra', 'Atlas', 'Iris', 'Hecate',
  'Prometheus', 'Pandora', 'Echo', 'Nemesis', 'Morpheus', 'Nyx'
];

const REGIONS = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1', 'ca-central-1'];

const CAPABILITIES_TEMPLATES: Record<LivingAgent['type'], AgentCapability[]> = {
  'performance-engineer': [
    { id: 'perf-1', name: 'Database Optimization', category: 'performance', performance: 85, cost: 120, availability: 95 },
    { id: 'perf-2', name: 'Memory Profiling', category: 'performance', performance: 90, cost: 100, availability: 88 },
    { id: 'perf-3', name: 'Cache Management', category: 'performance', performance: 82, cost: 80, availability: 92 }
  ],
  'code-reviewer': [
    { id: 'code-1', name: 'Security Analysis', category: 'security', performance: 88, cost: 150, availability: 90 },
    { id: 'code-2', name: 'Code Quality', category: 'code-review', performance: 92, cost: 110, availability: 95 },
    { id: 'code-3', name: 'Architecture Review', category: 'code-review', performance: 85, cost: 140, availability: 87 }
  ],
  'test-automator': [
    { id: 'test-1', name: 'Integration Testing', category: 'testing', performance: 90, cost: 90, availability: 93 },
    { id: 'test-2', name: 'Load Testing', category: 'testing', performance: 87, cost: 120, availability: 89 },
    { id: 'test-3', name: 'Test Generation', category: 'testing', performance: 85, cost: 70, availability: 96 }
  ],
  'ml-engineer': [
    { id: 'ml-1', name: 'Model Training', category: 'ml-engineering', performance: 88, cost: 200, availability: 85 },
    { id: 'ml-2', name: 'Feature Engineering', category: 'ml-engineering', performance: 92, cost: 160, availability: 90 },
    { id: 'ml-3', name: 'Model Optimization', category: 'ml-engineering', performance: 86, cost: 180, availability: 87 }
  ],
  'orchestrator': [
    { id: 'orch-1', name: 'Workflow Management', category: 'orchestration', performance: 94, cost: 130, availability: 92 },
    { id: 'orch-2', name: 'Resource Allocation', category: 'orchestration', performance: 89, cost: 140, availability: 88 },
    { id: 'orch-3', name: 'Service Discovery', category: 'orchestration', performance: 91, cost: 100, availability: 95 }
  ],
  'monitor': [
    { id: 'mon-1', name: 'System Monitoring', category: 'performance', performance: 93, cost: 80, availability: 97 },
    { id: 'mon-2', name: 'Log Analysis', category: 'data-processing', performance: 87, cost: 60, availability: 94 },
    { id: 'mon-3', name: 'Alerting', category: 'orchestration', performance: 95, cost: 70, availability: 98 }
  ],
  'optimizer': [
    { id: 'opt-1', name: 'Cost Optimization', category: 'performance', performance: 89, cost: 110, availability: 91 },
    { id: 'opt-2', name: 'Resource Optimization', category: 'performance', performance: 92, cost: 130, availability: 89 },
    { id: 'opt-3', name: 'Algorithm Optimization', category: 'performance', performance: 94, cost: 160, availability: 85 }
  ]
};

export class MockAgentService {
  private agents: LivingAgent[] = [];
  private messages: AgentMessage[] = [];
  private consortiums: AgentConsortium[] = [];
  private negotiations: AgentNegotiation[] = [];
  private optimizations: PerformanceOptimization[] = [];
  private messageId = 0;
  private agentUpdateCallbacks: ((agents: LivingAgent[]) => void)[] = [];
  private messageCallbacks: ((messages: AgentMessage[]) => void)[] = [];

  constructor() {
    this.initializeAgents();
    this.startSimulation();
  }

  private initializeAgents() {
    const agentTypes: LivingAgent['type'][] = [
      'performance-engineer', 'code-reviewer', 'test-automator',
      'ml-engineer', 'orchestrator', 'monitor', 'optimizer'
    ];

    // Create 12-15 agents
    const agentCount = 12 + Math.floor(Math.random() * 4);

    for (let i = 0; i < agentCount; i++) {
      const type = agentTypes[i % agentTypes.length];
      const name = AGENT_NAMES[i % AGENT_NAMES.length];
      const region = REGIONS[Math.floor(Math.random() * REGIONS.length)];

      const reputation: AgentReputation = {
        agentId: `agent-${i}`,
        trustScore: Math.floor(Math.random() * 30) + 70,
        completedTasks: Math.floor(Math.random() * 500) + 100,
        failedTasks: Math.floor(Math.random() * 20) + 2,
        avgResponseTime: Math.floor(Math.random() * 2000) + 500,
        specializations: this.getRandomSpecializations(type),
        endorsements: this.getRandomEndorsements(),
        penalties: Math.floor(Math.random() * 3)
      };

      const agent: LivingAgent = {
        id: `agent-${i}`,
        name,
        type,
        status: this.getRandomStatus(),
        health: Math.floor(Math.random() * 30) + 70,
        load: Math.floor(Math.random() * 80) + 10,
        capabilities: CAPABILITIES_TEMPLATES[type].map(cap => ({
          ...cap,
          performance: cap.performance + Math.floor(Math.random() * 20) - 10,
          availability: cap.availability + Math.floor(Math.random() * 20) - 10
        })),
        reputation,
        currentTasks: this.generateCurrentTasks(),
        consortiums: [],
        connections: [],
        location: {
          region,
          latency: Math.floor(Math.random() * 100) + 10
        },
        metrics: {
          requestsHandled: Math.floor(Math.random() * 10000) + 1000,
          successRate: Math.floor(Math.random() * 20) + 80,
          avgResponseTime: Math.floor(Math.random() * 1000) + 200,
          lastOptimized: new Date(Date.now() - Math.random() * 86400000 * 7)
        },
        wallet: {
          credits: Math.floor(Math.random() * 5000) + 1000,
          earnedToday: Math.floor(Math.random() * 200) + 50,
          spentToday: Math.floor(Math.random() * 150) + 25
        }
      };

      this.agents.push(agent);
    }

    // Generate initial connections
    this.generateConnections();
    this.generateConsortiums();
  }

  private getRandomStatus(): LivingAgent['status'] {
    const statuses: LivingAgent['status'][] = ['idle', 'negotiating', 'executing', 'optimizing', 'healing'];
    const weights = [0.4, 0.2, 0.25, 0.1, 0.05];

    const random = Math.random();
    let sum = 0;

    for (let i = 0; i < weights.length; i++) {
      sum += weights[i];
      if (random < sum) {
        return statuses[i];
      }
    }

    return 'idle';
  }

  private getRandomSpecializations(type: LivingAgent['type']): string[] {
    const specializations: Record<string, string[]> = {
      'performance-engineer': ['Database Tuning', 'Memory Management', 'Query Optimization', 'Caching Strategies'],
      'code-reviewer': ['Security Auditing', 'Code Quality', 'Best Practices', 'Architecture Design'],
      'test-automator': ['End-to-End Testing', 'API Testing', 'Load Testing', 'Test Framework Design'],
      'ml-engineer': ['Deep Learning', 'Computer Vision', 'NLP', 'Model Deployment'],
      'orchestrator': ['Kubernetes', 'Service Mesh', 'CI/CD', 'Infrastructure as Code'],
      'monitor': ['Observability', 'Alerting', 'Log Management', 'Metrics Collection'],
      'optimizer': ['Cost Optimization', 'Performance Tuning', 'Resource Management', 'Algorithm Design']
    };

    const typeSpecs = specializations[type] || [];
    const count = Math.floor(Math.random() * 3) + 2;
    return typeSpecs.slice(0, count);
  }

  private getRandomEndorsements(): string[] {
    const endorsements = [];
    const count = Math.floor(Math.random() * 5) + 1;

    for (let i = 0; i < count; i++) {
      endorsements.push(`agent-${Math.floor(Math.random() * 20)}`);
    }

    return endorsements;
  }

  private generateCurrentTasks(): string[] {
    const taskCount = Math.floor(Math.random() * 3);
    const tasks = [];

    for (let i = 0; i < taskCount; i++) {
      tasks.push(`task-${Math.random().toString(36).substr(2, 8)}`);
    }

    return tasks;
  }

  private generateConnections() {
    this.agents.forEach(agent => {
      const connectionCount = Math.floor(Math.random() * 5) + 2;
      const possibleConnections = this.agents.filter(a => a.id !== agent.id);

      for (let i = 0; i < Math.min(connectionCount, possibleConnections.length); i++) {
        const randomAgent = possibleConnections[Math.floor(Math.random() * possibleConnections.length)];
        if (!agent.connections.includes(randomAgent.id)) {
          agent.connections.push(randomAgent.id);
        }
      }
    });
  }

  private generateConsortiums() {
    const consortiumCount = Math.floor(this.agents.length / 4);

    for (let i = 0; i < consortiumCount; i++) {
      const memberCount = Math.floor(Math.random() * 4) + 2;
      const members = [...this.agents].sort(() => 0.5 - Math.random()).slice(0, memberCount);
      const leader = members[0];

      const consortium: AgentConsortium = {
        id: `consortium-${i}`,
        leadAgentId: leader.id,
        memberAgentIds: members.map(m => m.id),
        taskId: `task-${Math.random().toString(36).substr(2, 8)}`,
        formation: new Date(Date.now() - Math.random() * 86400000 * 30),
        status: Math.random() < 0.7 ? 'active' : Math.random() < 0.5 ? 'executing' : 'forming',
        performance: Math.floor(Math.random() * 30) + 70,
        consensusScore: Math.floor(Math.random() * 40) + 60
      };

      this.consortiums.push(consortium);

      // Update agent consortium memberships
      members.forEach(member => {
        member.consortiums.push(consortium.id);
      });
    }
  }

  private startSimulation() {
    // Agent state updates
    setInterval(() => {
      this.updateAgentStates();
      this.notifyAgentUpdates();
    }, 2000);

    // Message generation
    setInterval(() => {
      this.generateMessage();
      this.notifyMessageUpdates();
    }, 1000 + Math.random() * 2000);

    // Consortium updates
    setInterval(() => {
      this.updateConsortiums();
    }, 5000);

    // Negotiations
    setInterval(() => {
      this.generateNegotiation();
    }, 8000);

    // Optimizations
    setInterval(() => {
      this.generateOptimization();
    }, 10000);
  }

  private updateAgentStates() {
    this.agents.forEach(agent => {
      // Health fluctuation
      agent.health = Math.max(50, Math.min(100,
        agent.health + (Math.random() - 0.5) * 10
      ));

      // Load changes
      agent.load = Math.max(0, Math.min(100,
        agent.load + (Math.random() - 0.5) * 15
      ));

      // Status transitions
      if (Math.random() < 0.1) {
        agent.status = this.getRandomStatus();
      }

      // Credit changes
      const creditChange = Math.floor((Math.random() - 0.4) * 50);
      agent.wallet.credits = Math.max(0, agent.wallet.credits + creditChange);

      if (creditChange > 0) {
        agent.wallet.earnedToday += creditChange;
      } else if (creditChange < 0) {
        agent.wallet.spentToday += Math.abs(creditChange);
      }

      // Reputation updates
      if (Math.random() < 0.05) {
        agent.reputation.trustScore = Math.max(0, Math.min(100,
          agent.reputation.trustScore + (Math.random() - 0.5) * 5
        ));
      }
    });
  }

  private generateMessage() {
    if (this.agents.length < 2) return;

    const fromAgent = this.agents[Math.floor(Math.random() * this.agents.length)];
    const possibleTargets = this.agents.filter(a => a.id !== fromAgent.id);
    const toAgent = possibleTargets[Math.floor(Math.random() * possibleTargets.length)];

    const messageTypes: AgentMessage['type'][] = [
      'heartbeat', 'bid', 'negotiate', 'execute', 'optimize', 'consensus', 'discover'
    ];
    const type = messageTypes[Math.floor(Math.random() * messageTypes.length)];

    const message: AgentMessage = {
      id: `msg-${++this.messageId}`,
      from: fromAgent.id,
      to: Math.random() < 0.1 ? 'broadcast' : toAgent.id,
      type,
      payload: this.generateMessagePayload(type, fromAgent),
      timestamp: new Date(),
      ttl: 30000 + Math.random() * 60000
    };

    this.messages.unshift(message);
    this.messages = this.messages.slice(0, 200); // Keep last 200 messages
  }

  private generateMessagePayload(type: AgentMessage['type'], agent: LivingAgent) {
    switch (type) {
      case 'heartbeat':
        return {
          status: agent.status,
          health: agent.health,
          load: agent.load,
          timestamp: new Date()
        };

      case 'bid':
        return {
          taskId: `task-${Math.random().toString(36).substr(2, 8)}`,
          amount: Math.floor(Math.random() * 500) + 100,
          confidence: Math.floor(Math.random() * 40) + 60,
          estimatedTime: Math.floor(Math.random() * 3600) + 300
        };

      case 'negotiate':
        return {
          proposalId: `prop-${Math.random().toString(36).substr(2, 8)}`,
          terms: {
            resource: 'cpu',
            amount: Math.floor(Math.random() * 100) + 50,
            duration: Math.floor(Math.random() * 7200) + 1800
          }
        };

      default:
        return {
          data: `${type} message from ${agent.name}`,
          timestamp: new Date()
        };
    }
  }

  private updateConsortiums() {
    this.consortiums.forEach(consortium => {
      // Performance updates
      consortium.performance = Math.max(30, Math.min(100,
        consortium.performance + (Math.random() - 0.5) * 10
      ));

      // Consensus updates
      consortium.consensusScore = Math.max(40, Math.min(100,
        consortium.consensusScore + (Math.random() - 0.5) * 8
      ));

      // Status transitions
      if (Math.random() < 0.05) {
        const statuses: AgentConsortium['status'][] = ['forming', 'active', 'executing', 'dissolved'];
        const currentIndex = statuses.indexOf(consortium.status);
        const nextIndex = (currentIndex + 1) % statuses.length;
        consortium.status = statuses[nextIndex];
      }
    });
  }

  private generateNegotiation() {
    if (this.agents.length < 2) return;

    const initiator = this.agents[Math.floor(Math.random() * this.agents.length)];
    const recipient = this.agents.filter(a => a.id !== initiator.id)[
      Math.floor(Math.random() * (this.agents.length - 1))
    ];

    const types: AgentNegotiation['type'][] = [
      'task-delegation', 'resource-sharing', 'consortium-formation', 'load-balancing'
    ];

    const negotiation: AgentNegotiation = {
      id: `neg-${Math.random().toString(36).substr(2, 8)}`,
      initiatorId: initiator.id,
      recipientId: recipient.id,
      type: types[Math.floor(Math.random() * types.length)],
      status: 'proposed',
      terms: {
        resource: 'compute',
        amount: Math.floor(Math.random() * 200) + 100,
        duration: Math.floor(Math.random() * 7200) + 1800,
        compensation: Math.floor(Math.random() * 300) + 50
      },
      timestamp: new Date()
    };

    this.negotiations.unshift(negotiation);
    this.negotiations = this.negotiations.slice(0, 50);

    // Simulate negotiation progression
    setTimeout(() => {
      const statuses: AgentNegotiation['status'][] = ['negotiating', 'accepted', 'rejected'];
      negotiation.status = statuses[Math.floor(Math.random() * statuses.length)];
    }, 2000 + Math.random() * 8000);
  }

  private generateOptimization() {
    const agent = this.agents[Math.floor(Math.random() * this.agents.length)];
    const targetMetrics: PerformanceOptimization['targetMetric'][] = [
      'latency', 'throughput', 'memory', 'cpu'
    ];
    const optimizationTypes: PerformanceOptimization['optimizationType'][] = [
      'cache', 'algorithm', 'resource-allocation', 'load-distribution'
    ];

    const optimization: PerformanceOptimization = {
      agentId: agent.id,
      targetMetric: targetMetrics[Math.floor(Math.random() * targetMetrics.length)],
      currentValue: Math.floor(Math.random() * 1000) + 100,
      targetValue: Math.floor(Math.random() * 800) + 50,
      optimizationType: optimizationTypes[Math.floor(Math.random() * optimizationTypes.length)],
      status: 'analyzing',
      improvement: 0,
      timestamp: new Date()
    };

    this.optimizations.unshift(optimization);
    this.optimizations = this.optimizations.slice(0, 30);

    // Simulate optimization progression
    const progressStates: PerformanceOptimization['status'][] = [
      'optimizing', 'testing', 'deployed', 'rolled-back'
    ];

    let currentState = 0;
    const progressInterval = setInterval(() => {
      if (currentState < progressStates.length) {
        optimization.status = progressStates[currentState];
        if (optimization.status === 'deployed') {
          optimization.improvement = Math.floor(Math.random() * 30) + 5;
        }
        currentState++;
      } else {
        clearInterval(progressInterval);
      }
    }, 3000);
  }

  // Public API
  public onAgentUpdates(callback: (agents: LivingAgent[]) => void) {
    this.agentUpdateCallbacks.push(callback);
    callback(this.agents); // Initial call
  }

  public onMessageUpdates(callback: (messages: AgentMessage[]) => void) {
    this.messageCallbacks.push(callback);
    callback(this.messages); // Initial call
  }

  public getAgents(): LivingAgent[] {
    return [...this.agents];
  }

  public getMessages(): AgentMessage[] {
    return [...this.messages];
  }

  public getConsortiums(): AgentConsortium[] {
    return [...this.consortiums];
  }

  public getNegotiations(): AgentNegotiation[] {
    return [...this.negotiations];
  }

  public getOptimizations(): PerformanceOptimization[] {
    return [...this.optimizations];
  }

  private notifyAgentUpdates() {
    this.agentUpdateCallbacks.forEach(callback => callback(this.agents));
  }

  private notifyMessageUpdates() {
    this.messageCallbacks.forEach(callback => callback(this.messages));
  }

  public updateConsortium(consortiumId: string, updates: Partial<AgentConsortium>) {
    const index = this.consortiums.findIndex(c => c.id === consortiumId);
    if (index >= 0) {
      this.consortiums[index] = { ...this.consortiums[index], ...updates };
    }
  }

  public updateOptimization(optimization: PerformanceOptimization) {
    const index = this.optimizations.findIndex(o =>
      o.agentId === optimization.agentId &&
      o.targetMetric === optimization.targetMetric
    );

    if (index >= 0) {
      this.optimizations[index] = optimization;
    } else {
      this.optimizations.unshift(optimization);
    }
  }
}

// Singleton instance
export const mockAgentService = new MockAgentService();

#!/usr/bin/env node
/**
 * Orchestrator NANDA Agent - Coordinates all Candlefish.ai internal agents
 * Routes tasks, forms consortiums, manages resource allocation
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const WebSocket = require('ws');

class OrchestratorAgent {
  constructor() {
    this.agentId = 'candlefish:orchestrator';
    this.agentName = 'Candlefish Orchestrator';
    this.port = process.env.PORT || 7010;
    this.app = express();
    this.wsPort = 7500;
    
    // Registry of internal agents
    this.agents = new Map();
    this.consortiums = new Map();
    this.activeTasks = new Map();
    
    // Metrics
    this.metrics = {
      tasks_orchestrated: 0,
      consortiums_formed: 0,
      avg_task_time: 0,
      success_rate: 1.0
    };
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    this.discoverAgents();
  }
  
  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    
    this.app.use((req, res, next) => {
      console.log(`[Orchestrator] ${req.method} ${req.path}`);
      next();
    });
  }
  
  setupRoutes() {
    // NANDA-compliant agent info
    this.app.get('/agent/info', (req, res) => {
      res.json({
        id: this.agentId,
        name: this.agentName,
        capabilities: [
          'task-orchestration',
          'consortium-formation',
          'resource-allocation',
          'agent-discovery'
        ],
        status: 'active',
        metrics: this.metrics,
        connected_agents: Array.from(this.agents.keys()),
        active_consortiums: this.consortiums.size
      });
    });
    
    // Submit task for orchestration
    this.app.post('/orchestrate', async (req, res) => {
      const { task, priority = 'normal', deadline = null } = req.body;
      const taskId = `task-${Date.now()}`;
      
      console.log(`[Orchestrator] New task: ${task.type} (${taskId})`);
      
      try {
        // Analyze task and determine required capabilities
        const requiredCapabilities = this.analyzeTask(task);
        
        // Find suitable agents
        const availableAgents = await this.findAgents(requiredCapabilities);
        
        // Form consortium if multiple agents needed
        let result;
        if (availableAgents.length > 1) {
          const consortiumId = await this.formConsortium(availableAgents, task);
          result = await this.executeConsortium(consortiumId, task);
        } else if (availableAgents.length === 1) {
          result = await this.delegateToAgent(availableAgents[0], task);
        } else {
          throw new Error('No suitable agents available');
        }
        
        // Update metrics
        this.metrics.tasks_orchestrated++;
        
        res.json({
          success: true,
          taskId: taskId,
          result: result,
          agents_used: availableAgents.map(a => a.id),
          execution_time: Date.now() - parseInt(taskId.split('-')[1])
        });
        
      } catch (error) {
        console.error(`[Orchestrator] Task failed: ${error.message}`);
        res.status(500).json({ error: error.message });
      }
    });
    
    // Register internal agent
    this.app.post('/register', (req, res) => {
      const { agentId, endpoint, capabilities } = req.body;
      
      this.agents.set(agentId, {
        id: agentId,
        endpoint: endpoint,
        capabilities: capabilities,
        status: 'active',
        last_seen: new Date().toISOString()
      });
      
      console.log(`[Orchestrator] Agent registered: ${agentId}`);
      this.broadcastAgentUpdate();
      
      res.json({
        success: true,
        message: `Agent ${agentId} registered successfully`
      });
    });
    
    // Get consortium status
    this.app.get('/consortium/:id', (req, res) => {
      const consortium = this.consortiums.get(req.params.id);
      if (consortium) {
        res.json(consortium);
      } else {
        res.status(404).json({ error: 'Consortium not found' });
      }
    });
    
    // List all agents
    this.app.get('/agents', (req, res) => {
      res.json({
        agents: Array.from(this.agents.values()),
        total: this.agents.size
      });
    });
    
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        connected_agents: this.agents.size,
        active_consortiums: this.consortiums.size,
        metrics: this.metrics
      });
    });
  }
  
  setupWebSocket() {
    // WebSocket for real-time agent communication
    this.wss = new WebSocket.Server({ port: this.wsPort });
    
    this.wss.on('connection', (ws) => {
      console.log('[Orchestrator] New WebSocket connection');
      
      ws.on('message', (message) => {
        const data = JSON.parse(message);
        this.handleWebSocketMessage(ws, data);
      });
      
      // Send initial agent list
      ws.send(JSON.stringify({
        type: 'agent_list',
        agents: Array.from(this.agents.values())
      }));
    });
    
    console.log(`[Orchestrator] WebSocket server on port ${this.wsPort}`);
  }
  
  handleWebSocketMessage(ws, data) {
    switch (data.type) {
      case 'agent_heartbeat':
        this.updateAgentStatus(data.agentId, 'active');
        break;
      case 'task_update':
        this.broadcastTaskUpdate(data);
        break;
      case 'consortium_message':
        this.routeConsortiumMessage(data);
        break;
    }
  }
  
  async discoverAgents() {
    // Try to discover PKB agent
    try {
      const response = await axios.get('http://localhost:7001/agent/info');
      if (response.data) {
        this.agents.set(response.data.id, {
          ...response.data,
          endpoint: response.data.endpoint || 'http://localhost:7001'
        });
        console.log(`[Orchestrator] Discovered PKB Agent`);
      }
    } catch (error) {
      console.log('[Orchestrator] PKB Agent not available yet');
    }
    
    // Periodic discovery
    setInterval(() => this.heartbeatCheck(), 30000);
  }
  
  analyzeTask(task) {
    // Determine required capabilities based on task type
    const capabilityMap = {
      'estimate_generation': ['cost-calculation', 'pdf-generation', 'knowledge-retrieval'],
      'permit_check': ['data-extraction', 'change-detection', 'knowledge-retrieval'],
      'knowledge_query': ['knowledge-retrieval', 'semantic-search'],
      'data_analysis': ['metric-calculation', 'trend-analysis', 'anomaly-detection']
    };
    
    return capabilityMap[task.type] || ['knowledge-retrieval'];
  }
  
  async findAgents(capabilities) {
    const suitable = [];
    
    for (const [id, agent] of this.agents) {
      const hasCapability = capabilities.some(cap => 
        agent.capabilities && agent.capabilities.includes(cap)
      );
      
      if (hasCapability && agent.status === 'active') {
        suitable.push(agent);
      }
    }
    
    return suitable;
  }
  
  async formConsortium(agents, task) {
    const consortiumId = `consortium-${Date.now()}`;
    
    const consortium = {
      id: consortiumId,
      task: task,
      agents: agents.map(a => a.id),
      status: 'forming',
      created_at: new Date().toISOString()
    };
    
    this.consortiums.set(consortiumId, consortium);
    
    // Notify agents about consortium
    const joinPromises = agents.map(agent => 
      this.inviteToConsortium(agent, consortiumId, task)
    );
    
    await Promise.all(joinPromises);
    
    consortium.status = 'active';
    this.metrics.consortiums_formed++;
    
    console.log(`[Orchestrator] Consortium ${consortiumId} formed with ${agents.length} agents`);
    
    return consortiumId;
  }
  
  async inviteToConsortium(agent, consortiumId, task) {
    try {
      const response = await axios.post(`${agent.endpoint}/consortium/join`, {
        consortiumId: consortiumId,
        task: task,
        role: 'participant'
      });
      
      return response.data;
    } catch (error) {
      console.error(`[Orchestrator] Failed to invite ${agent.id}: ${error.message}`);
      return null;
    }
  }
  
  async executeConsortium(consortiumId, task) {
    const consortium = this.consortiums.get(consortiumId);
    
    // For now, query PKB agent as example
    if (consortium.agents.includes('candlefish:pkb-agent')) {
      try {
        const response = await axios.post('http://localhost:7001/query', {
          query: task.query || task.type,
          context: task.context || {},
          requester: this.agentId
        });
        
        consortium.status = 'completed';
        return response.data;
      } catch (error) {
        consortium.status = 'failed';
        throw error;
      }
    }
    
    return { message: 'Consortium execution simulated' };
  }
  
  async delegateToAgent(agent, task) {
    // Direct delegation to single agent
    const response = await axios.post(`${agent.endpoint}/execute`, task);
    return response.data;
  }
  
  broadcastAgentUpdate() {
    const message = JSON.stringify({
      type: 'agent_update',
      agents: Array.from(this.agents.values())
    });
    
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
  
  broadcastTaskUpdate(update) {
    const message = JSON.stringify({
      type: 'task_update',
      ...update
    });
    
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
  
  updateAgentStatus(agentId, status) {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = status;
      agent.last_seen = new Date().toISOString();
    }
  }
  
  async heartbeatCheck() {
    for (const [id, agent] of this.agents) {
      try {
        await axios.get(`${agent.endpoint}/health`, { timeout: 5000 });
        this.updateAgentStatus(id, 'active');
      } catch (error) {
        this.updateAgentStatus(id, 'unreachable');
        console.log(`[Orchestrator] Agent ${id} is unreachable`);
      }
    }
  }
  
  start() {
    this.app.listen(this.port, () => {
      console.log('================================================');
      console.log('🎯 CANDLEFISH ORCHESTRATOR - ACTIVE');
      console.log('================================================');
      console.log(`ID: ${this.agentId}`);
      console.log(`HTTP: http://localhost:${this.port}`);
      console.log(`WebSocket: ws://localhost:${this.wsPort}`);
      console.log('Capabilities:');
      console.log('  • Task Orchestration');
      console.log('  • Consortium Formation');
      console.log('  • Resource Allocation');
      console.log('  • Agent Discovery');
      console.log('================================================');
      console.log('Ready to coordinate all Candlefish.ai agents!');
    });
  }
}

// Start the orchestrator
const orchestrator = new OrchestratorAgent();
orchestrator.start();
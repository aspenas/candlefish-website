#!/usr/bin/env node
/**
 * PKB NANDA Agent - Internal Knowledge Management Service
 * Provides context and memory to all Candlefish.ai services
 */

const express = require('express');
const cors = require('cors');
const { createHash } = require('crypto');

class PKBAgent {
  constructor() {
    this.agentId = 'candlefish:pkb-agent';
    this.agentName = 'PKB Knowledge Agent';
    this.port = process.env.PORT || 7001;
    this.app = express();
    
    // In-memory knowledge store (in production, this would be PostgreSQL/Vector DB)
    this.knowledge = new Map();
    this.context = new Map();
    
    // Agent metrics
    this.metrics = {
      queries_processed: 0,
      knowledge_items: 0,
      avg_response_time: 0,
      cache_hits: 0
    };
    
    // Internal credit system
    this.credits = 1000;
    this.reputation = 95.0;
    
    this.setupMiddleware();
    this.setupRoutes();
    this.initializeKnowledge();
  }
  
  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    
    // Log all requests
    this.app.use((req, res, next) => {
      console.log(`[PKB Agent] ${req.method} ${req.path}`);
      next();
    });
  }
  
  setupRoutes() {
    // NANDA-compliant agent info endpoint
    this.app.get('/agent/info', (req, res) => {
      res.json({
        id: this.agentId,
        name: this.agentName,
        capabilities: [
          'knowledge-retrieval',
          'context-provision',
          'semantic-search',
          'memory-augmentation'
        ],
        status: 'active',
        metrics: this.metrics,
        reputation: this.reputation,
        endpoint: `http://localhost:${this.port}`
      });
    });
    
    // Query knowledge base
    this.app.post('/query', async (req, res) => {
      const startTime = Date.now();
      const { query, context, requester } = req.body;
      
      try {
        // Simulate knowledge retrieval
        const results = await this.searchKnowledge(query, context);
        
        // Update metrics
        this.metrics.queries_processed++;
        this.metrics.avg_response_time = 
          (this.metrics.avg_response_time + (Date.now() - startTime)) / 2;
        
        // Provide context to requesting agent
        res.json({
          success: true,
          query: query,
          results: results,
          context: this.getContextFor(requester),
          metadata: {
            response_time: Date.now() - startTime,
            knowledge_items: results.length,
            confidence: this.calculateConfidence(results)
          }
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Add knowledge
    this.app.post('/ingest', async (req, res) => {
      const { data, type, source } = req.body;
      
      try {
        const id = this.addKnowledge(data, type, source);
        this.metrics.knowledge_items++;
        
        res.json({
          success: true,
          id: id,
          message: 'Knowledge ingested successfully'
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Provide context for other agents
    this.app.get('/context/:agentId', (req, res) => {
      const { agentId } = req.params;
      const context = this.getContextFor(agentId);
      
      res.json({
        agentId: agentId,
        context: context,
        timestamp: new Date().toISOString()
      });
    });
    
    // NANDA consortium participation
    this.app.post('/consortium/join', (req, res) => {
      const { consortiumId, task, role } = req.body;
      
      console.log(`[PKB Agent] Joining consortium ${consortiumId} as ${role}`);
      
      res.json({
        accepted: true,
        agentId: this.agentId,
        contribution: 'Providing historical context and knowledge retrieval',
        bid: 50 // Low bid since we provide value to all
      });
    });
    
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        metrics: this.metrics
      });
    });
  }
  
  initializeKnowledge() {
    // Seed with Candlefish.ai domain knowledge
    this.addKnowledge({
      topic: 'Paintbox',
      content: 'Paint estimation platform using AI for accurate quotes',
      related: ['estimates', 'painting', 'contractors', 'pricing']
    }, 'service', 'internal');
    
    this.addKnowledge({
      topic: 'Clark County Permits',
      content: 'Automated permit scraping and monitoring system',
      related: ['permits', 'construction', 'monitoring', 'nevada']
    }, 'service', 'internal');
    
    this.addKnowledge({
      topic: 'NANDA Protocol',
      content: 'Network Architecture for Next-generation Distributed Agents',
      related: ['agents', 'discovery', 'protocol', 'MIT']
    }, 'technology', 'internal');
    
    console.log(`[PKB Agent] Initialized with ${this.knowledge.size} knowledge items`);
  }
  
  searchKnowledge(query, context = {}) {
    // Simple keyword search (in production, use vector similarity)
    const results = [];
    const queryLower = query.toLowerCase();
    
    for (const [id, item] of this.knowledge.entries()) {
      const content = JSON.stringify(item).toLowerCase();
      if (content.includes(queryLower)) {
        results.push({
          id: id,
          ...item,
          relevance: this.calculateRelevance(query, item)
        });
      }
    }
    
    // Sort by relevance
    results.sort((a, b) => b.relevance - a.relevance);
    
    // Cache hit tracking
    if (results.length > 0) {
      this.metrics.cache_hits++;
    }
    
    return results.slice(0, 5); // Top 5 results
  }
  
  addKnowledge(data, type, source) {
    const id = createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex')
      .substring(0, 12);
    
    this.knowledge.set(id, {
      ...data,
      type: type,
      source: source,
      timestamp: new Date().toISOString(),
      access_count: 0
    });
    
    return id;
  }
  
  getContextFor(agentId) {
    // Provide relevant context based on requesting agent
    const context = {
      timestamp: new Date().toISOString(),
      relevant_knowledge: []
    };
    
    // Customize context based on agent type
    if (agentId.includes('paintbox')) {
      context.relevant_knowledge = this.searchKnowledge('paintbox estimates pricing');
      context.recent_estimates = ['EST-001', 'EST-002']; // Would be real data
    } else if (agentId.includes('clark')) {
      context.relevant_knowledge = this.searchKnowledge('permits clark county');
      context.recent_permits = ['PMT-123', 'PMT-124'];
    }
    
    return context;
  }
  
  calculateRelevance(query, item) {
    // Simple relevance scoring
    const queryWords = query.toLowerCase().split(' ');
    const content = JSON.stringify(item).toLowerCase();
    let score = 0;
    
    for (const word of queryWords) {
      if (content.includes(word)) {
        score += 10;
      }
    }
    
    return score;
  }
  
  calculateConfidence(results) {
    if (results.length === 0) return 0;
    if (results.length >= 5) return 0.95;
    return 0.5 + (results.length * 0.1);
  }
  
  start() {
    this.app.listen(this.port, () => {
      console.log('================================================');
      console.log('🧠 PKB NANDA AGENT - ACTIVE');
      console.log('================================================');
      console.log(`ID: ${this.agentId}`);
      console.log(`Endpoint: http://localhost:${this.port}`);
      console.log('Capabilities:');
      console.log('  • Knowledge Retrieval');
      console.log('  • Context Provision');
      console.log('  • Semantic Search');
      console.log('  • Memory Augmentation');
      console.log('================================================');
      console.log('Ready to provide context to all Candlefish.ai agents!');
    });
  }
}

// Start the agent
const agent = new PKBAgent();
agent.start();
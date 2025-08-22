#!/usr/bin/env node
/**
 * Clark County Scraper NANDA Agent
 * Monitors permits and provides intelligence to other agents
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');

class ClarkScraperAgent {
  constructor() {
    this.agentId = 'candlefish:clark-scraper';
    this.agentName = 'Clark County Permit Intelligence';
    this.port = process.env.PORT || 7004;
    this.app = express();
    
    this.orchestratorURL = 'http://localhost:7010';
    this.pkbURL = 'http://localhost:7001';
    
    // Permit monitoring state
    this.permits = new Map();
    this.subscribers = new Set();
    this.lastScrapeTime = null;
    
    // Metrics
    this.metrics = {
      permits_tracked: 0,
      new_permits_today: 0,
      alerts_sent: 0,
      avg_scrape_time: 0
    };
    
    this.setupMiddleware();
    this.setupRoutes();
    this.registerWithOrchestrator();
    this.startMonitoring();
  }
  
  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    
    this.app.use((req, res, next) => {
      console.log(`[Clark Scraper] ${req.method} ${req.path}`);
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
          'permit-monitoring',
          'data-extraction',
          'change-detection',
          'alert-generation',
          'competitor-analysis'
        ],
        status: 'active',
        metrics: this.metrics,
        endpoint: `http://localhost:${this.port}`,
        last_scrape: this.lastScrapeTime
      });
    });
    
    // Monitor specific address
    this.app.post('/monitor/address', async (req, res) => {
      const { address, notifyAgent } = req.body;
      
      this.subscribers.add({
        address: address.toLowerCase(),
        agent: notifyAgent,
        created: new Date().toISOString()
      });
      
      // Store in PKB for persistence
      await this.storeInPKB({
        type: 'monitor-request',
        address: address,
        requester: notifyAgent
      });
      
      res.json({
        success: true,
        message: `Monitoring ${address} for permit activity`
      });
    });
    
    // Get permits for area
    this.app.post('/permits/search', async (req, res) => {
      const { zipCode, dateRange, permitType } = req.body;
      
      const matches = [];
      for (const [id, permit] of this.permits) {
        if ((!zipCode || permit.zipCode === zipCode) &&
            (!permitType || permit.type === permitType)) {
          matches.push(permit);
        }
      }
      
      res.json({
        results: matches,
        count: matches.length,
        query: { zipCode, dateRange, permitType }
      });
    });
    
    // Analyze competition (for Paintbox)
    this.app.post('/analyze/competition', async (req, res) => {
      const { address, radius = 5 } = req.body;
      
      // Find painting permits near address
      const competitors = this.findNearbyPermits(address, radius, 'painting');
      
      // Get insights from PKB
      const insights = await this.queryPKB(`painting contractors ${address}`);
      
      res.json({
        competitors: competitors.length,
        recent_permits: competitors.slice(0, 10),
        market_insights: {
          avg_project_value: this.calculateAverage(competitors, 'value'),
          busy_season: this.detectSeasonality(competitors),
          growth_rate: this.calculateGrowthRate(competitors)
        },
        recommendations: this.generateRecommendations(competitors, insights)
      });
    });
    
    // Execute task from orchestrator
    this.app.post('/execute', async (req, res) => {
      const { type, data } = req.body;
      
      switch (type) {
        case 'permit_check':
          const permits = await this.checkPermits(data);
          res.json({ permits });
          break;
          
        case 'market_analysis':
          const analysis = await this.analyzeMarket(data);
          res.json({ analysis });
          break;
          
        default:
          res.json({ message: `Task ${type} acknowledged` });
      }
    });
    
    // Join consortium
    this.app.post('/consortium/join', (req, res) => {
      const { consortiumId, task, role } = req.body;
      
      console.log(`[Clark Scraper] Joining consortium ${consortiumId} as ${role}`);
      
      res.json({
        accepted: true,
        agentId: this.agentId,
        contribution: 'Providing permit data and competitive intelligence',
        bid: 75 // Lower bid for data provision
      });
    });
    
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        metrics: this.metrics,
        permits_tracked: this.permits.size,
        active_monitors: this.subscribers.size
      });
    });
  }
  
  async registerWithOrchestrator() {
    try {
      const response = await axios.post(`${this.orchestratorURL}/register`, {
        agentId: this.agentId,
        endpoint: `http://localhost:${this.port}`,
        capabilities: [
          'permit-monitoring',
          'data-extraction',
          'change-detection',
          'alert-generation'
        ]
      });
      
      console.log('[Clark Scraper] Registered with orchestrator');
    } catch (error) {
      console.log('[Clark Scraper] Orchestrator not available, will retry...');
      setTimeout(() => this.registerWithOrchestrator(), 10000);
    }
  }
  
  async storeInPKB(data) {
    try {
      await axios.post(`${this.pkbURL}/ingest`, {
        data: data,
        type: 'permit-data',
        source: this.agentId
      });
    } catch (error) {
      console.error('[Clark Scraper] Failed to store in PKB:', error.message);
    }
  }
  
  async queryPKB(query) {
    try {
      const response = await axios.post(`${this.pkbURL}/query`, {
        query: query,
        requester: this.agentId
      });
      return response.data.results;
    } catch (error) {
      console.error('[Clark Scraper] PKB query failed:', error.message);
      return [];
    }
  }
  
  startMonitoring() {
    // Simulate permit monitoring every 30 seconds
    setInterval(() => this.scrapePermits(), 30000);
    
    console.log('[Clark Scraper] Monitoring started (30s intervals)');
  }
  
  async scrapePermits() {
    const startTime = Date.now();
    
    // Simulate finding new permits
    const newPermits = this.generateMockPermits();
    
    for (const permit of newPermits) {
      const permitId = `PMT-${permit.number}`;
      
      if (!this.permits.has(permitId)) {
        this.permits.set(permitId, permit);
        this.metrics.permits_tracked++;
        this.metrics.new_permits_today++;
        
        // Check if any subscriber is interested
        await this.notifySubscribers(permit);
        
        // Store in PKB for analysis
        await this.storeInPKB(permit);
      }
    }
    
    this.lastScrapeTime = new Date().toISOString();
    this.metrics.avg_scrape_time = 
      (this.metrics.avg_scrape_time + (Date.now() - startTime)) / 2;
    
    console.log(`[Clark Scraper] Scraped ${newPermits.length} permits in ${Date.now() - startTime}ms`);
  }
  
  generateMockPermits() {
    // Simulate realistic permit data
    const types = ['painting', 'remodel', 'new-construction', 'electrical', 'plumbing'];
    const streets = ['Main St', 'Oak Ave', 'Sunset Blvd', 'Paradise Rd', 'Las Vegas Blvd'];
    
    const permits = [];
    const count = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < count; i++) {
      permits.push({
        number: Date.now() + i,
        type: types[Math.floor(Math.random() * types.length)],
        address: `${Math.floor(Math.random() * 9999)} ${streets[Math.floor(Math.random() * streets.length)]}`,
        zipCode: '89101',
        value: Math.floor(Math.random() * 50000) + 5000,
        contractor: `Contractor ${Math.floor(Math.random() * 100)}`,
        status: 'approved',
        date: new Date().toISOString()
      });
    }
    
    return permits;
  }
  
  async notifySubscribers(permit) {
    for (const subscriber of this.subscribers) {
      if (permit.address.toLowerCase().includes(subscriber.address)) {
        // Notify through orchestrator
        try {
          await axios.post(`${this.orchestratorURL}/orchestrate`, {
            task: {
              type: 'permit_notification',
              target: subscriber.agent,
              permit: permit
            }
          });
          
          this.metrics.alerts_sent++;
          console.log(`[Clark Scraper] Notified ${subscriber.agent} about permit at ${permit.address}`);
        } catch (error) {
          console.error('[Clark Scraper] Failed to notify subscriber:', error.message);
        }
      }
    }
  }
  
  findNearbyPermits(address, radius, type) {
    // Simplified: return all permits of type
    const nearby = [];
    for (const [id, permit] of this.permits) {
      if (!type || permit.type === type) {
        nearby.push(permit);
      }
    }
    return nearby;
  }
  
  calculateAverage(permits, field) {
    if (permits.length === 0) return 0;
    const sum = permits.reduce((acc, p) => acc + (p[field] || 0), 0);
    return Math.round(sum / permits.length);
  }
  
  detectSeasonality(permits) {
    // Simple mock seasonality
    return 'Spring/Summer peak (March-August)';
  }
  
  calculateGrowthRate(permits) {
    // Mock growth rate
    return '+12% YoY';
  }
  
  generateRecommendations(competitors, insights) {
    const recommendations = [];
    
    if (competitors.length > 10) {
      recommendations.push('High competition in area - differentiate with premium service');
    }
    
    const avgValue = this.calculateAverage(competitors, 'value');
    if (avgValue > 20000) {
      recommendations.push('Area shows high-value projects - target luxury market');
    }
    
    recommendations.push('Monitor new permits daily for lead generation');
    
    return recommendations;
  }
  
  checkPermits(data) {
    // Return permits matching criteria
    const matches = [];
    for (const [id, permit] of this.permits) {
      if (data.address && permit.address.includes(data.address)) {
        matches.push(permit);
      }
    }
    return matches;
  }
  
  async analyzeMarket(data) {
    const permits = Array.from(this.permits.values());
    
    return {
      total_permits: permits.length,
      by_type: this.groupByType(permits),
      avg_value: this.calculateAverage(permits, 'value'),
      top_contractors: this.getTopContractors(permits),
      trends: 'Increasing permit activity in luxury residential'
    };
  }
  
  groupByType(permits) {
    const groups = {};
    for (const permit of permits) {
      groups[permit.type] = (groups[permit.type] || 0) + 1;
    }
    return groups;
  }
  
  getTopContractors(permits) {
    const contractors = {};
    for (const permit of permits) {
      contractors[permit.contractor] = (contractors[permit.contractor] || 0) + 1;
    }
    
    return Object.entries(contractors)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
  }
  
  start() {
    this.app.listen(this.port, () => {
      console.log('================================================');
      console.log('🏗️  CLARK COUNTY SCRAPER NANDA AGENT - ACTIVE');
      console.log('================================================');
      console.log(`ID: ${this.agentId}`);
      console.log(`Endpoint: http://localhost:${this.port}`);
      console.log('Capabilities:');
      console.log('  • Permit Monitoring');
      console.log('  • Data Extraction');
      console.log('  • Change Detection');
      console.log('  • Alert Generation');
      console.log('  • Competitive Analysis');
      console.log('================================================');
      console.log('Monitoring Clark County permits every 30 seconds...');
    });
  }
}

// Start the agent
const agent = new ClarkScraperAgent();
agent.start();
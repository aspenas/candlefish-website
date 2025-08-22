#!/usr/bin/env node
/**
 * PromoterOS NANDA Agent
 * Event management, ticket sales, and marketing automation
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');

class PromoterAgent {
  constructor() {
    this.agentId = 'candlefish:promoter';
    this.agentName = 'PromoterOS Event Management';
    this.port = process.env.PORT || 7006;
    this.app = express();
    
    // Integration endpoints
    this.promoterAPI = process.env.PROMOTER_API || 'https://promoter.candlefish.ai/api';
    this.orchestratorURL = 'http://localhost:7010';
    this.pkbURL = 'http://localhost:7001';
    this.intelligenceURL = 'http://localhost:7005';
    this.paintboxURL = 'http://localhost:7003';
    
    // Event management state
    this.events = new Map();
    this.tickets = new Map();
    this.attendees = new Map();
    
    // Metrics
    this.metrics = {
      events_created: 0,
      tickets_sold: 0,
      revenue_generated: 0,
      marketing_campaigns: 0,
      conversion_rate: 0
    };
    
    this.setupMiddleware();
    this.setupRoutes();
    this.registerWithOrchestrator();
    this.initializeEventTracking();
  }
  
  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    
    this.app.use((req, res, next) => {
      console.log(`[Promoter Agent] ${req.method} ${req.path}`);
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
          'event-creation',
          'ticket-management',
          'attendee-tracking',
          'marketing-automation',
          'revenue-optimization',
          'cross-promotion'
        ],
        status: 'active',
        metrics: this.metrics,
        endpoint: `http://localhost:${this.port}`,
        integrations: {
          stripe: process.env.STRIPE_KEY ? 'connected' : 'disconnected',
          mailchimp: process.env.MAILCHIMP_KEY ? 'connected' : 'disconnected',
          social: 'ready'
        }
      });
    });
    
    // Create event with intelligent promotion
    this.app.post('/event/create', async (req, res) => {
      const { title, description, date, venue, capacity, pricing } = req.body;
      
      const eventId = `EVT-${Date.now()}`;
      const event = {
        id: eventId,
        title,
        description,
        date,
        venue,
        capacity,
        pricing,
        tickets_available: capacity,
        tickets_sold: 0,
        status: 'upcoming',
        created_at: new Date().toISOString()
      };
      
      this.events.set(eventId, event);
      this.metrics.events_created++;
      
      // Store in PKB for context
      await this.storeInPKB(event, 'event');
      
      // Get marketing insights from Intelligence
      const insights = await this.getMarketingInsights(event);
      
      // Form marketing consortium
      const consortium = await this.formMarketingConsortium(event, insights);
      
      res.json({
        success: true,
        event: event,
        marketing_insights: insights,
        consortium_id: consortium
      });
    });
    
    // Sell ticket with cross-service integration
    this.app.post('/ticket/purchase', async (req, res) => {
      const { eventId, customer, quantity, paymentMethod } = req.body;
      
      const event = this.events.get(eventId);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }
      
      if (event.tickets_available < quantity) {
        return res.status(400).json({ error: 'Not enough tickets available' });
      }
      
      // Process ticket sale
      const ticketId = `TKT-${Date.now()}`;
      const ticket = {
        id: ticketId,
        event_id: eventId,
        customer: customer,
        quantity: quantity,
        price_per_ticket: event.pricing.standard,
        total_amount: event.pricing.standard * quantity,
        status: 'confirmed',
        purchased_at: new Date().toISOString()
      };
      
      // Update event capacity
      event.tickets_available -= quantity;
      event.tickets_sold += quantity;
      
      this.tickets.set(ticketId, ticket);
      this.metrics.tickets_sold += quantity;
      this.metrics.revenue_generated += ticket.total_amount;
      
      // Store customer in PKB for future marketing
      await this.storeCustomerData(customer, ticket);
      
      // Check for cross-promotion opportunities
      const crossPromo = await this.checkCrossPromotion(customer);
      
      res.json({
        success: true,
        ticket: ticket,
        cross_promotion: crossPromo,
        remaining_tickets: event.tickets_available
      });
    });
    
    // Marketing automation
    this.app.post('/marketing/campaign', async (req, res) => {
      const { eventId, campaignType, targetAudience } = req.body;
      
      const event = this.events.get(eventId);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }
      
      // Get audience insights from PKB
      const audienceData = await this.getAudienceData(targetAudience);
      
      // Create optimized campaign
      const campaign = await this.createOptimizedCampaign(event, campaignType, audienceData);
      
      this.metrics.marketing_campaigns++;
      
      res.json({
        success: true,
        campaign: campaign,
        expected_reach: campaign.reach,
        expected_conversions: campaign.conversions
      });
    });
    
    // Cross-service event recommendations
    this.app.post('/recommend/events', async (req, res) => {
      const { customerId, preferences } = req.body;
      
      // Get customer history from PKB
      const history = await this.getCustomerHistory(customerId);
      
      // Get intelligence insights
      const insights = await this.getCustomerInsights(customerId);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(history, insights, preferences);
      
      res.json({
        customer_id: customerId,
        recommendations: recommendations,
        personalization_score: 0.85
      });
    });
    
    // Consortium participation
    this.app.post('/consortium/join', (req, res) => {
      const { consortiumId, task, role } = req.body;
      
      console.log(`[Promoter Agent] Joining consortium ${consortiumId} as ${role}`);
      
      res.json({
        accepted: true,
        agentId: this.agentId,
        contribution: 'Providing event management and marketing automation',
        bid: 120
      });
    });
    
    // Execute task from orchestrator
    this.app.post('/execute', async (req, res) => {
      const { type, data } = req.body;
      
      switch (type) {
        case 'event_promotion':
          const result = await this.executePromotion(data);
          res.json(result);
          break;
          
        case 'audience_analysis':
          const analysis = await this.analyzeAudience(data);
          res.json(analysis);
          break;
          
        default:
          res.json({ message: `Task ${type} acknowledged` });
      }
    });
    
    // Analytics endpoint
    this.app.get('/analytics/events', async (req, res) => {
      const analytics = {
        total_events: this.events.size,
        active_events: Array.from(this.events.values()).filter(e => e.status === 'upcoming').length,
        total_revenue: this.metrics.revenue_generated,
        avg_ticket_price: this.metrics.tickets_sold > 0 ? 
          this.metrics.revenue_generated / this.metrics.tickets_sold : 0,
        conversion_rate: this.calculateConversionRate(),
        top_events: this.getTopEvents()
      };
      
      res.json(analytics);
    });
    
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        metrics: this.metrics,
        active_events: this.events.size
      });
    });
  }
  
  async registerWithOrchestrator() {
    try {
      const response = await axios.post(`${this.orchestratorURL}/register`, {
        agentId: this.agentId,
        endpoint: `http://localhost:${this.port}`,
        capabilities: [
          'event-creation',
          'ticket-management',
          'marketing-automation',
          'revenue-optimization'
        ]
      });
      
      console.log('[Promoter Agent] Registered with orchestrator');
    } catch (error) {
      console.log('[Promoter Agent] Orchestrator not available, will retry...');
      setTimeout(() => this.registerWithOrchestrator(), 10000);
    }
  }
  
  async storeInPKB(data, type) {
    try {
      await axios.post(`${this.pkbURL}/ingest`, {
        data: data,
        type: type,
        source: this.agentId
      });
    } catch (error) {
      console.error('[Promoter Agent] Failed to store in PKB:', error.message);
    }
  }
  
  async getMarketingInsights(event) {
    try {
      const response = await axios.post(`${this.intelligenceURL}/analyze/insights`, {
        domain: 'event_marketing',
        data: event
      });
      
      return response.data.insights;
    } catch (error) {
      console.error('[Promoter Agent] Failed to get insights:', error.message);
      return [];
    }
  }
  
  async formMarketingConsortium(event, insights) {
    try {
      const response = await axios.post(`${this.orchestratorURL}/orchestrate`, {
        task: {
          type: 'event_marketing',
          event: event,
          insights: insights,
          goals: ['maximize_attendance', 'optimize_revenue']
        },
        priority: 'high'
      });
      
      return response.data.taskId;
    } catch (error) {
      console.error('[Promoter Agent] Failed to form consortium:', error.message);
      return null;
    }
  }
  
  async storeCustomerData(customer, ticket) {
    const customerData = {
      ...customer,
      purchase_history: [ticket],
      lifetime_value: ticket.total_amount,
      last_purchase: ticket.purchased_at
    };
    
    await this.storeInPKB(customerData, 'customer');
    
    // Update attendee tracking
    if (!this.attendees.has(customer.email)) {
      this.attendees.set(customer.email, {
        ...customer,
        events_attended: []
      });
    }
    
    this.attendees.get(customer.email).events_attended.push(ticket.event_id);
  }
  
  async checkCrossPromotion(customer) {
    // Check with Paintbox for home improvement interest
    try {
      const paintboxResponse = await axios.post(`${this.paintboxURL}/customer/check`, {
        email: customer.email,
        phone: customer.phone
      });
      
      const promotions = [];
      
      if (paintboxResponse.data.is_customer) {
        promotions.push({
          service: 'paintbox',
          offer: '10% off next paint job for event attendees',
          code: 'EVENT10'
        });
      }
      
      return promotions;
    } catch (error) {
      return [];
    }
  }
  
  async getAudienceData(targetAudience) {
    try {
      const response = await axios.post(`${this.pkbURL}/query`, {
        query: `audience ${targetAudience}`,
        requester: this.agentId
      });
      
      return response.data.results;
    } catch (error) {
      return [];
    }
  }
  
  async createOptimizedCampaign(event, campaignType, audienceData) {
    const campaign = {
      id: `CAMP-${Date.now()}`,
      event_id: event.id,
      type: campaignType,
      audience_size: audienceData.length,
      channels: this.selectChannels(campaignType),
      budget: this.calculateBudget(event, audienceData.length),
      expected_roi: 2.5,
      status: 'active'
    };
    
    // Calculate expected metrics
    campaign.reach = audienceData.length * 0.7;
    campaign.conversions = campaign.reach * 0.15;
    
    return campaign;
  }
  
  selectChannels(campaignType) {
    const channelMap = {
      'social': ['facebook', 'instagram', 'twitter'],
      'email': ['mailchimp', 'sendgrid'],
      'paid': ['google-ads', 'facebook-ads'],
      'organic': ['seo', 'content-marketing']
    };
    
    return channelMap[campaignType] || ['email'];
  }
  
  calculateBudget(event, audienceSize) {
    const baseRate = 0.50; // $0.50 per potential attendee
    const eventValue = event.pricing.standard;
    const budgetRatio = 0.1; // 10% of expected revenue
    
    return Math.min(
      audienceSize * baseRate,
      eventValue * event.capacity * budgetRatio
    );
  }
  
  async getCustomerHistory(customerId) {
    try {
      const response = await axios.post(`${this.pkbURL}/query`, {
        query: `customer ${customerId}`,
        requester: this.agentId
      });
      
      return response.data.results;
    } catch (error) {
      return [];
    }
  }
  
  async getCustomerInsights(customerId) {
    try {
      const response = await axios.post(`${this.intelligenceURL}/analyze/insights`, {
        domain: 'customer_behavior',
        filter: { customer_id: customerId }
      });
      
      return response.data.insights;
    } catch (error) {
      return [];
    }
  }
  
  generateRecommendations(history, insights, preferences) {
    const recommendations = [];
    const upcomingEvents = Array.from(this.events.values())
      .filter(e => e.status === 'upcoming');
    
    for (const event of upcomingEvents) {
      let score = 0;
      
      // Score based on preferences
      if (preferences && preferences.categories) {
        for (const cat of preferences.categories) {
          if (event.description.toLowerCase().includes(cat.toLowerCase())) {
            score += 10;
          }
        }
      }
      
      // Score based on history
      if (history.length > 0) {
        // Similar events attended
        score += 5;
      }
      
      // Score based on insights
      if (insights.length > 0) {
        score += 3;
      }
      
      if (score > 0) {
        recommendations.push({
          event: event,
          score: score,
          reason: this.generateReason(score)
        });
      }
    }
    
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }
  
  generateReason(score) {
    if (score >= 15) return 'Highly recommended based on your preferences';
    if (score >= 10) return 'Matches your interests';
    if (score >= 5) return 'Similar to events you enjoyed';
    return 'You might be interested';
  }
  
  calculateConversionRate() {
    if (this.metrics.marketing_campaigns === 0) return 0;
    return (this.metrics.tickets_sold / (this.metrics.marketing_campaigns * 100)) * 100;
  }
  
  getTopEvents() {
    return Array.from(this.events.values())
      .sort((a, b) => b.tickets_sold - a.tickets_sold)
      .slice(0, 5)
      .map(e => ({
        id: e.id,
        title: e.title,
        tickets_sold: e.tickets_sold,
        revenue: e.tickets_sold * e.pricing.standard
      }));
  }
  
  async executePromotion(data) {
    // Execute targeted promotion
    const campaign = await this.createOptimizedCampaign(
      data.event,
      'social',
      data.audience || []
    );
    
    return {
      success: true,
      campaign_id: campaign.id,
      expected_reach: campaign.reach
    };
  }
  
  async analyzeAudience(data) {
    const audienceData = await this.getAudienceData(data.segment);
    
    return {
      segment: data.segment,
      size: audienceData.length,
      characteristics: this.extractCharacteristics(audienceData),
      recommendations: ['Use social media', 'Email campaign', 'Early bird pricing']
    };
  }
  
  extractCharacteristics(audienceData) {
    // Analyze audience characteristics
    return {
      avg_age: 32,
      interests: ['music', 'technology', 'networking'],
      preferred_channels: ['email', 'instagram']
    };
  }
  
  initializeEventTracking() {
    // Periodic event status updates
    setInterval(() => {
      this.updateEventStatuses();
    }, 60000); // Every minute
    
    console.log('[Promoter Agent] Event tracking initialized');
  }
  
  updateEventStatuses() {
    const now = new Date();
    
    for (const [id, event] of this.events) {
      const eventDate = new Date(event.date);
      
      if (eventDate < now && event.status === 'upcoming') {
        event.status = 'completed';
        console.log(`[Promoter Agent] Event ${id} marked as completed`);
      }
    }
  }
  
  start() {
    this.app.listen(this.port, () => {
      console.log('================================================');
      console.log('🎫 PROMOTEROS NANDA AGENT - ACTIVE');
      console.log('================================================');
      console.log(`ID: ${this.agentId}`);
      console.log(`Endpoint: http://localhost:${this.port}`);
      console.log('Capabilities:');
      console.log('  • Event Creation & Management');
      console.log('  • Ticket Sales & Processing');
      console.log('  • Marketing Automation');
      console.log('  • Audience Analytics');
      console.log('  • Cross-Service Promotion');
      console.log('  • Revenue Optimization');
      console.log('================================================');
      console.log('Ready to manage events and drive attendance!');
    });
  }
}

// Start the agent
const agent = new PromoterAgent();
agent.start();
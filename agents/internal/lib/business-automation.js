/**
 * Business Automation Engine for NANDA Agents
 * Implements immediate business value features
 */

const axios = require('axios');
const EventEmitter = require('events');

class BusinessAutomation extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.orchestratorURL = config.orchestratorURL || 'http://localhost:7010';
    this.pkbURL = config.pkbURL || 'http://localhost:7001';
    this.paintboxURL = config.paintboxURL || 'http://localhost:7003';
    this.clarkURL = config.clarkURL || 'http://localhost:7004';
    this.intelligenceURL = config.intelligenceURL || 'http://localhost:7005';
    
    // Business rules
    this.rules = new Map();
    this.workflows = new Map();
    
    // Initialize default rules
    this.initializeBusinessRules();
  }
  
  initializeBusinessRules() {
    // Lead Generation Rule: New permit → Send quote
    this.addRule('lead_generation', {
      trigger: 'new_permit',
      condition: (permit) => permit.type === 'painting' || permit.type === 'remodel',
      action: async (permit) => {
        console.log(`[BusinessAutomation] New lead opportunity: ${permit.address}`);
        
        // Generate quick estimate
        const estimate = await this.generateQuickEstimate(permit);
        
        // Store lead in PKB
        await this.storeLeadInPKB(permit, estimate);
        
        // Queue for follow-up
        this.emit('new_lead', { permit, estimate });
        
        return {
          action: 'quote_generated',
          permit_id: permit.number,
          estimate_id: estimate.id,
          potential_value: estimate.value
        };
      }
    });
    
    // Price Optimization Rule: Adjust based on competition
    this.addRule('dynamic_pricing', {
      trigger: 'estimate_request',
      condition: (data) => data.enableDynamicPricing === true,
      action: async (data) => {
        // Get competitive intelligence
        const competition = await this.analyzeCompetition(data.address);
        
        // Get demand insights
        const demand = await this.getDemandInsights(data.zipCode);
        
        // Calculate optimal price
        const pricing = this.calculateOptimalPrice(data, competition, demand);
        
        return {
          base_price: pricing.base,
          adjusted_price: pricing.adjusted,
          adjustment_reason: pricing.reason,
          confidence: pricing.confidence
        };
      }
    });
    
    // Customer Intelligence Rule: Enhance with history
    this.addRule('customer_enrichment', {
      trigger: 'customer_lookup',
      condition: (customer) => customer.email || customer.phone,
      action: async (customer) => {
        // Query PKB for customer history
        const history = await this.getCustomerHistory(customer);
        
        // Calculate customer value score
        const score = this.calculateCustomerScore(history);
        
        // Get recommendations
        const recommendations = this.getCustomerRecommendations(score, history);
        
        return {
          customer: customer,
          history: history,
          lifetime_value: score.ltv,
          risk_score: score.risk,
          recommendations: recommendations
        };
      }
    });
    
    // Automated Follow-up Rule
    this.addRule('auto_followup', {
      trigger: 'estimate_sent',
      condition: (estimate) => estimate.auto_followup === true,
      action: async (estimate) => {
        // Schedule follow-ups
        const followups = [
          { delay: 3 * 24 * 60 * 60 * 1000, type: 'gentle_reminder' },
          { delay: 7 * 24 * 60 * 60 * 1000, type: 'value_proposition' },
          { delay: 14 * 24 * 60 * 60 * 1000, type: 'special_offer' }
        ];
        
        for (const followup of followups) {
          setTimeout(async () => {
            await this.sendFollowup(estimate, followup.type);
          }, followup.delay);
        }
        
        return {
          scheduled: followups.length,
          estimate_id: estimate.id
        };
      }
    });
    
    // Inventory Alert Rule
    this.addRule('inventory_management', {
      trigger: 'inventory_check',
      condition: (inventory) => inventory.paint_gallons < 50,
      action: async (inventory) => {
        // Calculate reorder quantity based on demand
        const demand = await this.predictDemand();
        const reorderQty = Math.max(100, demand.next_30_days * 1.2);
        
        this.emit('reorder_needed', {
          item: 'paint',
          current: inventory.paint_gallons,
          reorder: reorderQty
        });
        
        return {
          alert: 'low_inventory',
          reorder_quantity: reorderQty,
          urgency: inventory.paint_gallons < 20 ? 'high' : 'medium'
        };
      }
    });
  }
  
  addRule(name, rule) {
    this.rules.set(name, rule);
    console.log(`[BusinessAutomation] Added rule: ${name}`);
  }
  
  async processEvent(event, data) {
    const results = [];
    
    for (const [name, rule] of this.rules) {
      if (rule.trigger === event && rule.condition(data)) {
        try {
          const result = await rule.action(data);
          results.push({ rule: name, result });
          
          this.emit('rule_executed', { rule: name, event, result });
        } catch (error) {
          console.error(`[BusinessAutomation] Rule ${name} failed:`, error);
          this.emit('rule_failed', { rule: name, error: error.message });
        }
      }
    }
    
    return results;
  }
  
  async generateQuickEstimate(permit) {
    try {
      // Estimate based on permit value and type
      const sqft = this.estimateSqftFromPermit(permit);
      const rate = permit.type === 'painting' ? 3.5 : 4.5;
      
      const estimate = {
        id: `QE-${Date.now()}`,
        permit_number: permit.number,
        address: permit.address,
        estimated_sqft: sqft,
        estimated_cost: sqft * rate,
        confidence: 0.7,
        generated_at: new Date().toISOString()
      };
      
      // Call Paintbox for detailed estimate if needed
      if (sqft > 2000) {
        const detailed = await axios.post(`${this.paintboxURL}/estimate/create`, {
          project: { address: permit.address },
          rooms: this.estimateRoomsFromSqft(sqft),
          options: { quality: 'standard' }
        });
        
        estimate.detailed_estimate = detailed.data.estimateId;
      }
      
      return estimate;
    } catch (error) {
      console.error('[BusinessAutomation] Quick estimate failed:', error);
      return { id: `QE-ERROR-${Date.now()}`, value: 0 };
    }
  }
  
  estimateSqftFromPermit(permit) {
    // Heuristic based on permit value
    if (permit.value < 10000) return 1000;
    if (permit.value < 25000) return 2000;
    if (permit.value < 50000) return 3500;
    return 5000;
  }
  
  estimateRoomsFromSqft(sqft) {
    const roomCount = Math.ceil(sqft / 400);
    const rooms = [];
    
    for (let i = 0; i < roomCount; i++) {
      rooms.push({
        name: `Room ${i + 1}`,
        width: 20,
        length: 20,
        height: 9
      });
    }
    
    return rooms;
  }
  
  async analyzeCompetition(address) {
    try {
      const response = await axios.post(`${this.clarkURL}/analyze/competition`, {
        address: address,
        radius: 5
      });
      
      return response.data;
    } catch (error) {
      console.error('[BusinessAutomation] Competition analysis failed:', error);
      return { competitors: 0, avg_project_value: 0 };
    }
  }
  
  async getDemandInsights(zipCode) {
    try {
      const response = await axios.post(`${this.intelligenceURL}/analyze/insights`, {
        domain: 'demand',
        filter: { zipCode }
      });
      
      return response.data.insights[0] || { demand_level: 'normal' };
    } catch (error) {
      return { demand_level: 'normal' };
    }
  }
  
  calculateOptimalPrice(data, competition, demand) {
    let basePrice = data.base_price || 1000;
    let adjustedPrice = basePrice;
    let reason = [];
    
    // Competition adjustment
    if (competition.competitors > 5) {
      adjustedPrice *= 0.95; // 5% discount for high competition
      reason.push('High competition (-5%)');
    } else if (competition.competitors < 2) {
      adjustedPrice *= 1.1; // 10% premium for low competition
      reason.push('Low competition (+10%)');
    }
    
    // Demand adjustment
    if (demand.demand_level === 'high') {
      adjustedPrice *= 1.15; // 15% premium for high demand
      reason.push('High demand (+15%)');
    } else if (demand.demand_level === 'low') {
      adjustedPrice *= 0.9; // 10% discount for low demand
      reason.push('Low demand (-10%)');
    }
    
    // Size adjustment
    if (data.sqft > 3000) {
      adjustedPrice *= 0.95; // Volume discount
      reason.push('Volume discount (-5%)');
    }
    
    return {
      base: basePrice,
      adjusted: Math.round(adjustedPrice),
      reason: reason.join(', ') || 'No adjustments',
      confidence: 0.85
    };
  }
  
  async getCustomerHistory(customer) {
    try {
      const query = customer.email || customer.phone || customer.name;
      const response = await axios.post(`${this.pkbURL}/query`, {
        query: `customer ${query}`,
        requester: 'business-automation'
      });
      
      return response.data.results || [];
    } catch (error) {
      return [];
    }
  }
  
  calculateCustomerScore(history) {
    const projects = history.filter(h => h.type === 'project');
    const totalValue = projects.reduce((sum, p) => sum + (p.value || 0), 0);
    
    return {
      ltv: totalValue,
      projects_count: projects.length,
      avg_project_value: projects.length ? totalValue / projects.length : 0,
      risk: projects.length === 0 ? 'new' : 'returning',
      vip: totalValue > 50000
    };
  }
  
  getCustomerRecommendations(score, history) {
    const recommendations = [];
    
    if (score.vip) {
      recommendations.push('VIP treatment - assign senior estimator');
      recommendations.push('Offer premium package with warranty');
    }
    
    if (score.risk === 'new') {
      recommendations.push('First-time customer discount (10%)');
      recommendations.push('Include references and portfolio');
    } else {
      recommendations.push('Loyalty discount (5%)');
      recommendations.push('Fast-track scheduling available');
    }
    
    if (score.avg_project_value > 10000) {
      recommendations.push('Upsell opportunity - suggest additional services');
    }
    
    return recommendations;
  }
  
  async storeLeadInPKB(permit, estimate) {
    try {
      await axios.post(`${this.pkbURL}/ingest`, {
        data: {
          type: 'lead',
          source: 'permit_monitoring',
          permit: permit,
          estimate: estimate,
          status: 'new',
          created_at: new Date().toISOString()
        },
        type: 'lead',
        source: 'business-automation'
      });
    } catch (error) {
      console.error('[BusinessAutomation] Failed to store lead:', error);
    }
  }
  
  async sendFollowup(estimate, type) {
    console.log(`[BusinessAutomation] Sending ${type} follow-up for estimate ${estimate.id}`);
    
    // In production, this would integrate with email/SMS service
    const templates = {
      gentle_reminder: 'Hi! Just following up on your paint estimate...',
      value_proposition: 'Did you know we offer a 5-year warranty?',
      special_offer: 'Special offer: 10% off if you book this week!'
    };
    
    this.emit('followup_sent', {
      estimate_id: estimate.id,
      type: type,
      message: templates[type]
    });
  }
  
  async predictDemand() {
    try {
      const response = await axios.post(`${this.intelligenceURL}/predict`, {
        metric: 'paint_demand',
        horizon: '30d'
      });
      
      return {
        next_30_days: response.data.prediction.predicted || 200
      };
    } catch (error) {
      return { next_30_days: 200 }; // Default
    }
  }
  
  // Workflow automation
  async executeWorkflow(workflowName, data) {
    const workflow = this.workflows.get(workflowName);
    if (!workflow) {
      throw new Error(`Workflow ${workflowName} not found`);
    }
    
    const results = [];
    for (const step of workflow.steps) {
      try {
        const result = await this.executeStep(step, data);
        results.push(result);
        data = { ...data, ...result }; // Pass results forward
      } catch (error) {
        console.error(`[BusinessAutomation] Workflow step failed:`, error);
        if (!step.optional) throw error;
      }
    }
    
    return results;
  }
  
  async executeStep(step, data) {
    switch (step.type) {
      case 'estimate':
        return await this.generateQuickEstimate(data);
      case 'competition':
        return await this.analyzeCompetition(data.address);
      case 'customer':
        return await this.getCustomerHistory(data);
      case 'notify':
        this.emit(step.event, data);
        return { notified: true };
      default:
        return {};
    }
  }
}

module.exports = BusinessAutomation;
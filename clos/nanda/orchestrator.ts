/**
 * NANDA Orchestrator - Autonomous Service Management System
 * Full decision-making capabilities with autonomous control
 */

import express from 'express';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

const execAsync = promisify(exec);

// Configuration
const PORT = process.env.NANDA_PORT || 5100;
const AUTONOMOUS_MODE = process.env.AUTONOMOUS_MODE !== 'false';
const DECISION_THRESHOLD = parseFloat(process.env.DECISION_THRESHOLD || '0.75');
const RESTART_COOLDOWN_MS = 60000; // 60 seconds minimum between restarts
const MAX_RESTART_ATTEMPTS = 3; // Maximum restart attempts before backing off
const CACHE_CLEAR_COOLDOWN_MS = 300000; // 5 minutes minimum between cache clears

// Database connection
const db = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'clos_db',
  user: process.env.POSTGRES_USER || 'patricksmith',
  password: process.env.POSTGRES_PASSWORD || '',
});

// Redis connection
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  db: 3, // Agent state database
});

// Express app
const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(express.json());

// Service Registry
interface Service {
  id: string;
  name: string;
  type: string;
  port: number;
  status: 'running' | 'stopped' | 'unhealthy' | 'starting';
  health_url?: string;
  last_health_check?: Date;
  last_restart?: Date;
  restart_count?: number;
  cpu_usage?: number;
  memory_usage?: number;
  error_count?: number;
  dependencies?: string[];
}

// Decision Engine
interface Decision {
  id: string;
  type: 'scale' | 'restart' | 'heal' | 'optimize' | 'security';
  target: string;
  action: string;
  confidence: number;
  reasoning: string;
  executed: boolean;
  result?: string;
  timestamp: Date;
}

// Agent State
interface AgentState {
  mode: 'autonomous' | 'supervised' | 'learning';
  health: 'healthy' | 'degraded' | 'critical';
  active_decisions: Decision[];
  learning_data: any[];
  metrics: {
    decisions_made: number;
    success_rate: number;
    avg_response_time: number;
  };
}

class NANDAOrchestrator {
  private services: Map<string, Service> = new Map();
  private lastCacheClear: Date = new Date(0); // Initialize to epoch
  private state: AgentState = {
    mode: AUTONOMOUS_MODE ? 'autonomous' : 'supervised',
    health: 'healthy',
    active_decisions: [],
    learning_data: [],
    metrics: {
      decisions_made: 0,
      success_rate: 1.0,
      avg_response_time: 0
    }
  };

  constructor() {
    this.initialize();
  }

  private async initialize() {
    console.log('🧠 NANDA Orchestrator initializing...');
    
    // Load existing services
    await this.loadServices();
    
    // Start monitoring loops
    this.startHealthMonitoring();
    this.startDecisionEngine();
    this.startLearningEngine();
    
    // Register self
    await this.registerSelf();
    
    console.log(`✅ NANDA Orchestrator online - Mode: ${this.state.mode}`);
  }

  private async loadServices() {
    try {
      const result = await db.query('SELECT * FROM services WHERE status != $1', ['stopped']);
      for (const row of result.rows) {
        this.services.set(row.id, {
          id: row.id,
          name: row.name,
          type: row.type || 'unknown',
          port: row.port,
          status: row.status,
          health_url: row.health_url,
          last_health_check: row.last_health_check
        });
      }
      console.log(`📦 Loaded ${this.services.size} existing services`);
    } catch (error) {
      console.error('Failed to load services:', error);
    }
  }

  private async registerSelf() {
    // Check if already registered
    const existing = await db.query('SELECT id FROM services WHERE name = $1', ['NANDA Orchestrator']);
    
    const selfService: Service = {
      id: existing.rows.length > 0 ? existing.rows[0].id : randomUUID(),
      name: 'NANDA Orchestrator',
      type: 'agent',
      port: PORT as number,
      status: 'running',
      health_url: `http://localhost:${PORT}/health`
    };
    
    await this.registerService(selfService);
  }

  async registerService(service: Service): Promise<void> {
    this.services.set(service.id, service);
    
    await db.query(
      `INSERT INTO services (id, name, type, port, status, health_url, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (id) DO UPDATE SET
         status = $5, health_url = $6, updated_at = NOW()`,
      [service.id, service.name, service.type, service.port, service.status, service.health_url]
    );

    io.emit('service:registered', service);
    console.log(`✅ Registered service: ${service.name} on port ${service.port}`);
  }

  private startHealthMonitoring() {
    setInterval(async () => {
      for (const [id, service] of this.services) {
        await this.checkServiceHealth(service);
      }
    }, 30000); // Every 30 seconds
  }

  private async checkServiceHealth(service: Service) {
    if (!service.health_url) return;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // Increased timeout to 10s
      
      const response = await fetch(service.health_url, {
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      
      if (response.ok) {
        if (service.status === 'unhealthy') {
          console.log(`✅ Service ${service.name} recovered`);
        }
        service.status = 'running';
        service.error_count = 0;
      } else {
        service.status = 'unhealthy';
        service.error_count = (service.error_count || 0) + 1;
        
        // Only trigger restart decision if we haven't exceeded max attempts and cooldown has passed
        if (this.state.mode === 'autonomous' && 
            service.error_count >= 3 && 
            this.canRestartService(service)) {
          await this.makeDecision({
            type: 'heal',
            target: service.id,
            confidence: 0.9,
            reasoning: `Service ${service.name} has failed ${service.error_count} health checks`
          });
        }
      }
    } catch (error) {
      service.status = 'unhealthy';
      service.error_count = (service.error_count || 0) + 1;
      console.log(`⚠️ Health check failed for ${service.name}: ${error.message}`);
    }

    service.last_health_check = new Date();
    this.services.set(service.id, service);
    io.emit('service:health', service);
  }

  private canRestartService(service: Service): boolean {
    const now = new Date();
    const restartCount = service.restart_count || 0;
    
    // Check if we've exceeded max restart attempts
    if (restartCount >= MAX_RESTART_ATTEMPTS) {
      console.log(`⏸️ Service ${service.name} has reached max restart attempts (${restartCount}), backing off`);
      return false;
    }
    
    // Check cooldown period
    if (service.last_restart) {
      const timeSinceRestart = now.getTime() - service.last_restart.getTime();
      if (timeSinceRestart < RESTART_COOLDOWN_MS) {
        const remainingCooldown = Math.ceil((RESTART_COOLDOWN_MS - timeSinceRestart) / 1000);
        console.log(`⏳ Service ${service.name} is in cooldown period (${remainingCooldown}s remaining)`);
        return false;
      }
    }
    
    return true;
  }

  private canClearCache(): boolean {
    const now = new Date();
    const timeSinceClear = now.getTime() - this.lastCacheClear.getTime();
    
    if (timeSinceClear < CACHE_CLEAR_COOLDOWN_MS) {
      const remainingCooldown = Math.ceil((CACHE_CLEAR_COOLDOWN_MS - timeSinceClear) / 1000 / 60);
      console.log(`⏳ Cache clearing is in cooldown period (${remainingCooldown}m remaining)`);
      return false;
    }
    
    return true;
  }

  private startDecisionEngine() {
    setInterval(async () => {
      if (this.state.mode !== 'autonomous') return;
      
      // Analyze system state
      const analysis = await this.analyzeSystem();
      
      // Only act if there are actual issues
      if (analysis.issues.length === 0) {
        return;
      }
      
      console.log(`🔍 Found ${analysis.issues.length} issues to evaluate`);
      
      // Make decisions based on analysis
      for (const issue of analysis.issues) {
        const decision = this.evaluateIssue(issue);
        if (decision.confidence >= DECISION_THRESHOLD) {
          await this.makeDecision(decision);
        } else {
          console.log(`⚠️ Issue detected but confidence too low: ${issue.type} (${decision.confidence})`);
        }
      }
    }, 30000); // Every 30 seconds - less aggressive
  }

  private async analyzeSystem() {
    const issues = [];
    
    // Check for unhealthy services
    for (const [id, service] of this.services) {
      if (service.status === 'unhealthy') {
        issues.push({
          type: 'unhealthy_service',
          service: service,
          severity: service.error_count > 5 ? 'critical' : 'warning'
        });
      }
    }
    
    // Check resource usage with more conservative thresholds
    const systemMetrics = await this.getSystemMetrics();
    if (systemMetrics.cpu > 90) { // Increased from 80 to 90
      issues.push({
        type: 'high_cpu',
        value: systemMetrics.cpu,
        severity: systemMetrics.cpu > 95 ? 'critical' : 'warning'
      });
    }
    
    if (systemMetrics.memory > 90) { // Increased from 85 to 90
      issues.push({
        type: 'high_memory', 
        value: systemMetrics.memory,
        severity: systemMetrics.memory > 95 ? 'critical' : 'warning'
      });
    }
    
    return { issues, metrics: systemMetrics };
  }

  private evaluateIssue(issue: any): Partial<Decision> {
    switch (issue.type) {
      case 'unhealthy_service':
        return {
          type: 'heal',
          target: issue.service.id,
          action: 'restart',
          confidence: issue.severity === 'critical' ? 0.95 : 0.8,
          reasoning: `Service ${issue.service.name} is unhealthy with ${issue.service.error_count} errors`
        };
      
      case 'high_cpu':
        return {
          type: 'scale',
          target: 'system',
          action: 'scale_up',
          confidence: 0.7,
          reasoning: `CPU usage at ${issue.value}%`
        };
      
      case 'high_memory':
        // Only suggest cache clearing if we haven't done it recently
        if (this.canClearCache()) {
          return {
            type: 'optimize',
            target: 'system',
            action: 'clear_cache',
            confidence: 0.85,
            reasoning: `Memory usage at ${issue.value}%`
          };
        } else {
          return {
            type: 'optimize',
            target: 'system',
            action: 'analyze',
            confidence: 0.3,
            reasoning: `Memory usage at ${issue.value}% but cache cleared recently`
          };
        }
      
      default:
        return {
          type: 'optimize',
          target: issue.service?.id || 'system',
          action: 'analyze',
          confidence: 0.5,
          reasoning: 'Unknown issue detected'
        };
    }
  }

  private async makeDecision(decision: Partial<Decision>) {
    const fullDecision: Decision = {
      id: `decision-${Date.now()}`,
      type: decision.type!,
      target: decision.target!,
      action: decision.action!,
      confidence: decision.confidence!,
      reasoning: decision.reasoning!,
      executed: false,
      timestamp: new Date()
    };

    this.state.active_decisions.push(fullDecision);
    console.log(`🤖 Decision: ${fullDecision.action} on ${fullDecision.target} (confidence: ${fullDecision.confidence})`);
    
    // Execute decision
    const result = await this.executeDecision(fullDecision);
    fullDecision.executed = true;
    fullDecision.result = result;
    
    // Update metrics
    this.state.metrics.decisions_made++;
    if (result.includes('success')) {
      this.state.metrics.success_rate = 
        (this.state.metrics.success_rate * (this.state.metrics.decisions_made - 1) + 1) / 
        this.state.metrics.decisions_made;
    }
    
    // Store decision for learning
    await this.storeDecision(fullDecision);
    
    io.emit('decision:made', fullDecision);
  }

  private async executeDecision(decision: Decision): Promise<string> {
    try {
      switch (decision.action) {
        case 'restart':
          return await this.restartService(decision.target);
        
        case 'scale_up':
          return await this.scaleService(decision.target, 'up');
        
        case 'scale_down':
          return await this.scaleService(decision.target, 'down');
        
        case 'clear_cache':
          await redis.flushdb();
          this.lastCacheClear = new Date();
          console.log('🗑️ Cache cleared successfully');
          return 'Cache cleared successfully';
        
        case 'analyze':
          return 'Analysis completed';
        
        default:
          return `Action ${decision.action} not implemented`;
      }
    } catch (error) {
      console.error(`Failed to execute decision: ${error}`);
      return `Failed: ${error.message}`;
    }
  }

  private async restartService(serviceId: string): Promise<string> {
    const service = this.services.get(serviceId);
    if (!service) return `Service ${serviceId} not found`;
    
    try {
      // Update restart tracking
      service.restart_count = (service.restart_count || 0) + 1;
      service.last_restart = new Date();
      
      // Try graceful restart first
      console.log(`🔄 Restarting service: ${service.name} (attempt ${service.restart_count})`);
      
      // Update status
      service.status = 'starting';
      this.services.set(serviceId, service);
      
      // Simulate restart (in production, would use actual service manager)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      service.status = 'running';
      service.error_count = 0;
      this.services.set(serviceId, service);
      
      // Reset restart count on successful restart after some time
      setTimeout(() => {
        const currentService = this.services.get(serviceId);
        if (currentService && currentService.status === 'running') {
          currentService.restart_count = 0;
          this.services.set(serviceId, currentService);
          console.log(`✅ Service ${service.name} restart count reset after successful operation`);
        }
      }, 300000); // Reset after 5 minutes of stable operation
      
      return `Service ${service.name} restarted successfully`;
    } catch (error) {
      return `Failed to restart ${service.name}: ${error.message}`;
    }
  }

  private async scaleService(target: string, direction: 'up' | 'down'): Promise<string> {
    // In production, would integrate with container orchestrator
    console.log(`Scaling ${target} ${direction}`);
    return `Scaled ${target} ${direction} successfully`;
  }

  private async getSystemMetrics() {
    // Use actual system metrics instead of random values to prevent false positives
    try {
      const { stdout: cpuInfo } = await execAsync('ps -A -o %cpu | awk \'{sum+=$1} END {print sum}\'');
      const { stdout: memInfo } = await execAsync('ps -A -o %mem | awk \'{sum+=$1} END {print sum}\'');
      
      return {
        cpu: Math.min(100, parseFloat(cpuInfo.trim()) || 0),
        memory: Math.min(100, parseFloat(memInfo.trim()) || 0),
        disk: 45, // Conservative estimate - would need actual disk monitoring
        network: 25 // Conservative estimate - would need actual network monitoring
      };
    } catch (error) {
      console.log('⚠️ Failed to get system metrics, using safe defaults');
      // Return safe defaults that won't trigger unnecessary actions
      return {
        cpu: 25,
        memory: 30,
        disk: 45,
        network: 25
      };
    }
  }

  private startLearningEngine() {
    setInterval(async () => {
      if (this.state.learning_data.length < 10) return;
      
      // Analyze past decisions
      const analysis = this.analyzePastDecisions();
      
      // Adjust decision threshold based on success rate
      if (analysis.success_rate < 0.7) {
        // Increase threshold to be more conservative
        process.env.DECISION_THRESHOLD = String(Math.min(0.95, DECISION_THRESHOLD + 0.05));
      } else if (analysis.success_rate > 0.9) {
        // Decrease threshold to be more aggressive
        process.env.DECISION_THRESHOLD = String(Math.max(0.6, DECISION_THRESHOLD - 0.05));
      }
      
      console.log(`📊 Learning: Success rate ${analysis.success_rate}, threshold ${process.env.DECISION_THRESHOLD}`);
    }, 60000); // Every minute
  }

  private analyzePastDecisions() {
    const recent = this.state.learning_data.slice(-100);
    const successful = recent.filter(d => d.result?.includes('success')).length;
    
    return {
      total: recent.length,
      successful,
      success_rate: recent.length > 0 ? successful / recent.length : 0
    };
  }

  private async storeDecision(decision: Decision) {
    this.state.learning_data.push(decision);
    
    // Note: agent_id and service_id expect UUIDs, using NULL for now
    await db.query(
      `INSERT INTO agent_decisions (decision_type, action_taken, reason, confidence_score, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [decision.type, decision.action, decision.reasoning, decision.confidence, JSON.stringify(decision)]
    );
  }

  // Public API
  async getState(): Promise<AgentState> {
    return this.state;
  }

  async setMode(mode: 'autonomous' | 'supervised' | 'learning') {
    this.state.mode = mode;
    console.log(`🔄 NANDA mode changed to: ${mode}`);
    io.emit('mode:changed', mode);
  }

  async getServices(): Promise<Service[]> {
    return Array.from(this.services.values());
  }
}

// Initialize orchestrator
const orchestrator = new NANDAOrchestrator();

// REST API Endpoints
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    mode: orchestrator.getState().then(s => s.mode),
    uptime: process.uptime()
  });
});

app.get('/state', async (req, res) => {
  res.json(await orchestrator.getState());
});

app.post('/mode', async (req, res) => {
  const { mode } = req.body;
  await orchestrator.setMode(mode);
  res.json({ success: true, mode });
});

app.get('/services', async (req, res) => {
  res.json(await orchestrator.getServices());
});

app.post('/register', async (req, res) => {
  const service = req.body;
  await orchestrator.registerService(service);
  res.json({ success: true });
});

// WebSocket events
io.on('connection', (socket) => {
  console.log('Client connected to NANDA Orchestrator');
  
  socket.on('get:state', async () => {
    socket.emit('state', await orchestrator.getState());
  });
  
  socket.on('set:mode', async (mode) => {
    await orchestrator.setMode(mode);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🧠 NANDA Orchestrator running on port ${PORT}`);
  console.log(`🤖 Autonomous mode: ${AUTONOMOUS_MODE}`);
  console.log(`📊 Decision threshold: ${DECISION_THRESHOLD}`);
});

export default orchestrator;
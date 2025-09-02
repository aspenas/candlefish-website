/**
 * NANDA V2 Orchestrator - Fixed Version for 5470 S Highline Circle
 * Inventory Management System Integration
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

// Database connection - Fixed for local setup
const db = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5434'),
  database: process.env.POSTGRES_DB || 'highline_inventory',
  user: process.env.POSTGRES_USER || 'highline',
  password: process.env.POSTGRES_PASSWORD || 'rtpm_secure_password_123',
});

// Redis connection
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  db: 3,
});

// Express app with CORS
const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: ['https://inventory.highline.work', 'http://localhost:3050', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

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
  public services: Map<string, Service> = new Map();
  public state: AgentState = {
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
    console.log('🧠 NANDA Orchestrator initializing for 5470 S Highline Circle...');
    console.log(`Mode: ${this.state.mode}`);
    
    // Test database connection
    try {
      await db.query('SELECT 1');
      console.log('✅ Database connected');
    } catch (error) {
      console.error('⚠️ Database connection failed:', error instanceof Error ? error.message : error);
    }

    // Test Redis connection
    try {
      await redis.ping();
      console.log('✅ Redis connected');
    } catch (error) {
      console.error('⚠️ Redis connection failed:', error instanceof Error ? error.message : error);
    }
    
    // Register inventory services
    await this.registerInventoryServices();
    
    // Start monitoring
    this.startHealthMonitoring();
    this.startDecisionEngine();
    
    console.log(`✅ NANDA Orchestrator ready on port ${PORT}`);
  }

  private async registerInventoryServices() {
    // Register backend API
    await this.registerService({
      id: 'backend-api',
      name: '5470 Inventory Backend',
      type: 'api',
      port: 4050,
      status: 'running',
      health_url: 'https://5470-inventory.fly.dev/api/v1/health'
    });

    // Register frontend
    await this.registerService({
      id: 'frontend-web',
      name: '5470 Inventory Frontend',
      type: 'web',
      port: 3000,
      status: 'running',
      health_url: 'https://inventory.highline.work'
    });

    console.log('📦 Registered inventory services');
  }

  async registerService(service: Service): Promise<void> {
    this.services.set(service.id, service);
    
    try {
      await db.query(
        `INSERT INTO services (id, name, type, port, status, health_url, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (id) DO UPDATE SET
           status = $5, health_url = $6, updated_at = NOW()`,
        [service.id, service.name, service.type, service.port, service.status, service.health_url]
      );
    } catch (error) {
      console.error('Failed to register service in DB:', error);
    }

    io.emit('service:registered', service);
    console.log(`✅ Registered service: ${service.name}`);
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
      const timeout = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(service.health_url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'NANDA-Orchestrator/2.0'
        }
      });
      
      clearTimeout(timeout);
      
      if (response.ok) {
        service.status = 'running';
        service.error_count = 0;
      } else {
        service.status = 'unhealthy';
        service.error_count = (service.error_count || 0) + 1;
      }
    } catch (error) {
      service.status = 'unhealthy';
      service.error_count = (service.error_count || 0) + 1;
      console.log(`⚠️ Health check failed for ${service.name}`);
    }

    service.last_health_check = new Date();
    this.services.set(service.id, service);
    io.emit('service:health', service);
  }

  private startDecisionEngine() {
    setInterval(async () => {
      if (this.state.mode !== 'autonomous') return;
      
      const unhealthyServices = Array.from(this.services.values())
        .filter(s => s.status === 'unhealthy' && (s.error_count || 0) >= 3);
      
      for (const service of unhealthyServices) {
        const decision: Decision = {
          id: randomUUID(),
          type: 'heal',
          target: service.id,
          action: 'alert',
          confidence: 0.9,
          reasoning: `Service ${service.name} has failed ${service.error_count} health checks`,
          executed: false,
          timestamp: new Date()
        };
        
        await this.executeDecision(decision);
      }
    }, 60000); // Every minute
  }

  private async executeDecision(decision: Decision): Promise<string> {
    console.log(`🤖 Executing decision: ${decision.action} on ${decision.target}`);
    
    this.state.active_decisions.push(decision);
    this.state.metrics.decisions_made++;
    
    // For now, just log and emit events
    io.emit('decision:executed', decision);
    
    decision.executed = true;
    decision.result = 'Notification sent';
    
    return decision.result;
  }

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
app.get('/', (req, res) => {
  res.json({
    service: 'NANDA Orchestrator',
    version: '2.0',
    status: 'operational',
    mode: orchestrator.state.mode,
    services: orchestrator.services.size,
    uptime: process.uptime()
  });
});

app.get('/health', async (req, res) => {
  res.json({
    status: 'healthy',
    mode: orchestrator.state.mode,
    uptime: process.uptime(),
    services: orchestrator.services.size
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
  console.log(`🧠 NANDA Orchestrator running on http://localhost:${PORT}`);
  console.log(`🤖 Autonomous mode: ${AUTONOMOUS_MODE}`);
  console.log(`📊 Decision threshold: ${DECISION_THRESHOLD}`);
  console.log(`🌐 Frontend: https://inventory.highline.work`);
  console.log(`🔧 Backend: https://5470-inventory.fly.dev`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close();
  await db.end();
  redis.disconnect();
  process.exit(0);
});

export default orchestrator;
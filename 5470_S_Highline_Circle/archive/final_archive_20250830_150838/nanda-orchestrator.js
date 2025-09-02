/**
 * NANDA V2 Orchestrator - Production Ready for 5470 S Highline Circle
 */

const express = require('express');
const { Pool } = require('pg');
const Redis = require('ioredis');
const { Server: SocketIOServer } = require('socket.io');
const { createServer } = require('http');
const { exec } = require('child_process');
const { promisify } = require('util');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cors = require('cors');

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
  retryStrategy: (times) => {
    if (times > 3) {
      console.error('Redis connection failed after 3 attempts');
      return null;
    }
    return Math.min(times * 50, 2000);
  }
});

// Express app with CORS
const app = express();
app.use(cors({
  origin: ['https://inventory.highline.work', 'http://localhost:3050', 'http://localhost:3000', 'https://5470-inventory.fly.dev'],
  credentials: true
}));
app.use(express.json());

const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: ['https://inventory.highline.work', 'http://localhost:3050', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

class NANDAOrchestrator {
  constructor() {
    this.services = new Map();
    this.state = {
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
    this.initialize();
  }

  async initialize() {
    console.log('🧠 NANDA Orchestrator V2 initializing for 5470 S Highline Circle...');
    console.log(`📍 Mode: ${this.state.mode}`);
    console.log(`🎯 Decision Threshold: ${DECISION_THRESHOLD}`);
    
    // Test database connection
    try {
      await db.query('SELECT 1');
      console.log('✅ PostgreSQL connected successfully');
      
      // Ensure tables exist
      await this.ensureTablesExist();
    } catch (error) {
      console.error('⚠️  PostgreSQL connection failed:', error.message);
      console.log('   Continuing without database persistence...');
    }

    // Test Redis connection
    try {
      await redis.ping();
      console.log('✅ Redis connected successfully');
    } catch (error) {
      console.error('⚠️  Redis connection failed:', error.message);
      console.log('   Continuing without Redis caching...');
    }
    
    // Register inventory services
    await this.registerInventoryServices();
    
    // Start monitoring loops
    this.startHealthMonitoring();
    this.startDecisionEngine();
    
    console.log(`\n✨ NANDA Orchestrator ready on http://localhost:${PORT}`);
    console.log(`🌐 Frontend: https://inventory.highline.work`);
    console.log(`🔧 Backend: https://5470-inventory.fly.dev`);
  }

  async ensureTablesExist() {
    // Check if services table exists, if not create it
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'services'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('📦 Creating services table...');
      await db.query(`
        CREATE TABLE IF NOT EXISTS services (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(100) NOT NULL,
          port INTEGER,
          status VARCHAR(50) DEFAULT 'unknown',
          health_url VARCHAR(500),
          last_health_check TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          metadata JSONB DEFAULT '{}'
        )
      `);
    }
  }

  async registerInventoryServices() {
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

    // Register self
    await this.registerService({
      id: 'nanda-orchestrator',
      name: 'NANDA Orchestrator',
      type: 'orchestrator',
      port: PORT,
      status: 'running',
      health_url: `http://localhost:${PORT}/health`
    });

    console.log('📦 Registered 3 inventory services');
  }

  async registerService(service) {
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
      // Database might not be available, continue anyway
      console.log(`   Note: Could not persist service ${service.name} to database`);
    }

    io.emit('service:registered', service);
    console.log(`✅ Registered service: ${service.name}`);
  }

  startHealthMonitoring() {
    setInterval(async () => {
      for (const [id, service] of this.services) {
        await this.checkServiceHealth(service);
      }
    }, 30000); // Every 30 seconds
    
    // Initial health check
    setTimeout(() => {
      for (const [id, service] of this.services) {
        this.checkServiceHealth(service);
      }
    }, 5000);
  }

  async checkServiceHealth(service) {
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
        if (service.status !== 'running') {
          console.log(`✅ Service ${service.name} is now healthy`);
        }
        service.status = 'running';
        service.error_count = 0;
      } else {
        service.status = 'unhealthy';
        service.error_count = (service.error_count || 0) + 1;
        console.log(`⚠️  Service ${service.name} returned status ${response.status}`);
      }
    } catch (error) {
      service.status = 'unhealthy';
      service.error_count = (service.error_count || 0) + 1;
      if (service.error_count === 1) {
        console.log(`⚠️  Health check failed for ${service.name}: ${error.message}`);
      }
    }

    service.last_health_check = new Date();
    this.services.set(service.id, service);
    io.emit('service:health', service);
  }

  startDecisionEngine() {
    setInterval(async () => {
      if (this.state.mode !== 'autonomous') return;
      
      const unhealthyServices = Array.from(this.services.values())
        .filter(s => s.status === 'unhealthy' && (s.error_count || 0) >= 3);
      
      for (const service of unhealthyServices) {
        const decision = {
          id: crypto.randomUUID(),
          type: 'heal',
          target: service.id,
          action: 'alert',
          confidence: 0.9,
          reasoning: `Service ${service.name} has failed ${service.error_count} health checks`,
          executed: false,
          timestamp: new Date()
        };
        
        if (decision.confidence >= DECISION_THRESHOLD) {
          await this.executeDecision(decision);
        }
      }
    }, 60000); // Every minute
  }

  async executeDecision(decision) {
    console.log(`🤖 Decision: ${decision.action} on ${decision.target} (confidence: ${decision.confidence})`);
    
    this.state.active_decisions.push(decision);
    this.state.metrics.decisions_made++;
    
    // Emit decision event
    io.emit('decision:executed', decision);
    
    decision.executed = true;
    decision.result = 'Notification sent';
    
    // Update success rate
    const successCount = this.state.active_decisions.filter(d => d.result && d.result.includes('success')).length;
    this.state.metrics.success_rate = successCount / this.state.metrics.decisions_made;
    
    return decision.result;
  }

  async getState() {
    return this.state;
  }

  async setMode(mode) {
    this.state.mode = mode;
    console.log(`🔄 NANDA mode changed to: ${mode}`);
    io.emit('mode:changed', mode);
  }

  async getServices() {
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
    uptime: process.uptime(),
    endpoints: {
      health: '/health',
      state: '/state',
      services: '/services',
      mode: '/mode'
    }
  });
});

app.get('/health', async (req, res) => {
  res.json({
    status: 'healthy',
    mode: orchestrator.state.mode,
    uptime: process.uptime(),
    services: orchestrator.services.size,
    timestamp: new Date().toISOString()
  });
});

app.get('/state', async (req, res) => {
  res.json(await orchestrator.getState());
});

app.post('/mode', async (req, res) => {
  const { mode } = req.body;
  if (['autonomous', 'supervised', 'learning'].includes(mode)) {
    await orchestrator.setMode(mode);
    res.json({ success: true, mode });
  } else {
    res.status(400).json({ error: 'Invalid mode' });
  }
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
  console.log('📡 Client connected to NANDA Orchestrator');
  
  socket.on('get:state', async () => {
    socket.emit('state', await orchestrator.getState());
  });
  
  socket.on('get:services', async () => {
    socket.emit('services', await orchestrator.getServices());
  });
  
  socket.on('set:mode', async (mode) => {
    await orchestrator.setMode(mode);
  });
  
  socket.on('disconnect', () => {
    console.log('📡 Client disconnected');
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`\n🚀 NANDA Orchestrator is LIVE!`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🤖 Mode: ${AUTONOMOUS_MODE ? 'AUTONOMOUS' : 'SUPERVISED'}`);
  console.log(`📊 Decision Threshold: ${DECISION_THRESHOLD}`);
  console.log('\n📡 Monitoring:');
  console.log(`   • Frontend: https://inventory.highline.work`);
  console.log(`   • Backend: https://5470-inventory.fly.dev`);
  console.log(`   • Orchestrator: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close();
  await db.end();
  redis.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  server.close();
  await db.end();
  redis.disconnect();
  process.exit(0);
});

module.exports = orchestrator;
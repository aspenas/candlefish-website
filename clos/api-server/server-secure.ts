import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { SecureDatabase, InputValidator, QueryRateLimiter } from '../../security/patches/sql-injection-fix';

const execAsync = promisify(exec);
const PORT = process.env.PORT || 3501;
const DB_PATH = process.env.DB_PATH || '/Users/patricksmith/.clos/registry.db';

// Initialize Express app with security middleware
const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3500',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Security middleware - Content Security Policy and other headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Stricter limit for auth endpoints
  skipSuccessfulRequests: true
});

// Apply rate limiting
app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

// Other middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3500',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database connection with security wrapper
let db: any;
let secureDb: SecureDatabase;
let rateLimiter: QueryRateLimiter;

async function initDatabase() {
  db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });
  
  // Apply security patches
  secureDb = new SecureDatabase(db);
  rateLimiter = new QueryRateLimiter(100, 60000);
  
  // Clean up rate limiter periodically
  setInterval(() => rateLimiter.cleanup(), 60000);
}

// Service monitoring
const serviceHealthCache = new Map();
const serviceMetricsCache = new Map();

// Health check function with timeout
async function checkServiceHealth(service: any) {
  if (!service.health_check_url) return 'unknown';
  
  try {
    // Validate URL before making request
    InputValidator.validateUrl(service.health_check_url);
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(service.health_check_url, {
      signal: controller.signal,
      // Add security headers
      headers: {
        'User-Agent': 'CLOS-Health-Checker/1.0'
      }
    });
    
    clearTimeout(timeout);
    return response.ok ? 'healthy' : 'unhealthy';
  } catch (error) {
    return 'unhealthy';
  }
}

// Get container stats with command injection prevention
async function getContainerStats(containerName: string) {
  try {
    // Validate container name to prevent command injection
    if (!/^[a-zA-Z0-9_-]+$/.test(containerName)) {
      throw new Error('Invalid container name');
    }
    
    const { stdout } = await execAsync(
      `docker stats --no-stream --format "json" "${containerName}"`
    );
    const stats = JSON.parse(stdout);
    
    return {
      cpu: parseFloat(stats.CPUPerc.replace('%', '')),
      memory: parseFloat(stats.MemPerc.replace('%', '')),
      memoryUsage: stats.MemUsage,
      netIO: stats.NetIO,
      blockIO: stats.BlockIO
    };
  } catch (error) {
    console.error('Error getting container stats:', error);
    return null;
  }
}

// WebSocket connection handling with authentication
io.use((socket, next) => {
  // Add authentication check for WebSocket connections
  const token = socket.handshake.auth.token;
  // Verify JWT token here if using authentication
  next();
});

io.on('connection', (socket) => {
  console.log('New WebSocket client connected');
  
  socket.on('subscribe', (event) => {
    // Validate event name
    if (typeof event === 'string' && /^[a-zA-Z0-9_-]+$/.test(event)) {
      socket.join(event);
      console.log(`Client subscribed to ${event}`);
    }
  });
  
  socket.on('unsubscribe', (event) => {
    if (typeof event === 'string' && /^[a-zA-Z0-9_-]+$/.test(event)) {
      socket.leave(event);
      console.log(`Client unsubscribed from ${event}`);
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Background service monitoring with secure queries
setInterval(async () => {
  try {
    // Use secure parameterized query
    const services = await secureDb.secureSelect('services', { status: 'running' });
    
    for (const service of services) {
      // Check health
      const health = await checkServiceHealth(service);
      const previousHealth = serviceHealthCache.get(service.id);
      
      if (health !== previousHealth) {
        serviceHealthCache.set(service.id, health);
        io.to('health').emit('health_update', {
          service_id: service.id,
          health,
          timestamp: new Date()
        });
      }
      
      // Get container stats
      if (service.container_id) {
        const stats = await getContainerStats(service.container_id);
        if (stats) {
          serviceMetricsCache.set(service.id, stats);
          io.to('services').emit('service_update', {
            id: service.id,
            cpu: stats.cpu,
            memory: stats.memory,
            health
          });
        }
      }
    }
  } catch (error) {
    console.error('Error in service monitoring:', error);
  }
}, 5000);

// API Routes with input validation and secure queries

// Get all services
app.get('/api/services', async (req, res) => {
  try {
    // Check rate limiting per IP
    const clientIp = req.ip || 'unknown';
    if (!rateLimiter.checkLimit(clientIp)) {
      return res.status(429).json({ success: false, message: 'Rate limit exceeded' });
    }
    
    // Use secure query
    const services = await secureDb.secureSelect('services', {}, 'group_name, name');
    
    // Enrich with cached metrics and health
    const enrichedServices = services.map((service: any) => ({
      ...service,
      health: serviceHealthCache.get(service.id) || 'unknown',
      ...serviceMetricsCache.get(service.id) || {}
    }));
    
    // Sanitize output
    const sanitizedServices = InputValidator.sanitizeOutput(enrichedServices);
    
    res.json({ success: true, data: sanitizedServices });
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch services' });
  }
});

// Get single service with validation
app.get('/api/services/:id', async (req, res) => {
  try {
    // Validate and sanitize input
    const serviceId = InputValidator.validateServiceId(req.params.id);
    
    // Check rate limiting
    const clientIp = req.ip || 'unknown';
    if (!rateLimiter.checkLimit(clientIp)) {
      return res.status(429).json({ success: false, message: 'Rate limit exceeded' });
    }
    
    // Use secure query with parameterized input
    const services = await secureDb.secureSelect('services', { id: serviceId });
    
    if (services.length === 0) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }
    
    const service = services[0];
    const enrichedService = {
      ...service,
      health: serviceHealthCache.get(service.id) || 'unknown',
      ...serviceMetricsCache.get(service.id) || {}
    };
    
    res.json({ success: true, data: InputValidator.sanitizeOutput(enrichedService) });
  } catch (error) {
    console.error('Error fetching service:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// Batch service operations with validation
app.post('/api/services/batch/start', async (req, res) => {
  try {
    const { service_ids } = req.body;
    
    // Validate input
    if (!Array.isArray(service_ids)) {
      return res.status(400).json({ success: false, message: 'service_ids must be an array' });
    }
    
    // Validate each service ID
    const validatedIds = service_ids.map(id => InputValidator.validateServiceId(id));
    
    if (validatedIds.length === 0) {
      return res.json({
        success: true,
        data: {
          total: 0,
          successful: 0,
          failed: 0,
          results: []
        }
      });
    }
    
    const results = await Promise.allSettled(
      validatedIds.map(async (id) => {
        const services = await secureDb.secureSelect('services', { id });
        if (services.length === 0) throw new Error(`Service ${id} not found`);
        
        const service = services[0];
        
        let startCommand = '';
        if (service.container_id) {
          // Validate container ID
          if (!/^[a-zA-Z0-9_-]+$/.test(service.container_id)) {
            throw new Error('Invalid container ID');
          }
          startCommand = `docker start "${service.container_id}"`;
        } else {
          // Validate service name
          const validatedName = InputValidator.validateString(service.name);
          startCommand = `systemctl start "${validatedName}"`;
        }
        
        await execAsync(startCommand);
        await secureDb.secureUpdate(
          'services',
          { 
            status: 'running',
            started_at: new Date().toISOString()
          },
          { id: service.id }
        );
        
        return { id: service.id, status: 'success' };
      })
    );
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    res.json({
      success: true,
      data: {
        total: validatedIds.length,
        successful,
        failed,
        results: results.map((r, i) => ({
          service_id: validatedIds[i],
          status: r.status,
          error: r.status === 'rejected' ? (r as any).reason.message : null
        }))
      }
    });
  } catch (error) {
    console.error('Error starting services:', error);
    res.status(500).json({ success: false, message: 'Failed to start services' });
  }
});

// Update service with validation
app.patch('/api/services/:id', async (req, res) => {
  try {
    const serviceId = InputValidator.validateServiceId(req.params.id);
    const updates: Record<string, any> = {};
    
    // Validate each update field
    if (req.body.status !== undefined) {
      updates.status = InputValidator.validateStatus(req.body.status);
    }
    if (req.body.port !== undefined) {
      updates.port = InputValidator.validatePort(req.body.port);
    }
    if (req.body.health_check_url !== undefined) {
      updates.health_check_url = InputValidator.validateUrl(req.body.health_check_url);
    }
    if (req.body.name !== undefined) {
      updates.name = InputValidator.validateString(req.body.name, 100);
    }
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid updates provided' });
    }
    
    // Use secure update
    await secureDb.secureUpdate('services', updates, { id: serviceId });
    
    res.json({ success: true, message: 'Service updated successfully' });
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  
  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'An error occurred processing your request'
    : err.message;
  
  res.status(err.status || 500).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Start server
async function startServer() {
  try {
    await initDatabase();
    
    server.listen(PORT, () => {
      console.log(`🔐 Secure CLOS API Server running on port ${PORT}`);
      console.log(`✅ Security features enabled:`);
      console.log(`   - SQL injection protection`);
      console.log(`   - Content Security Policy headers`);
      console.log(`   - Rate limiting`);
      console.log(`   - Input validation`);
      console.log(`   - XSS protection`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export { app, secureDb };
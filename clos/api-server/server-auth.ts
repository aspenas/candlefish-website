/**
 * CLOS API Server with Authentication
 * Production-ready server with JWT auth, RBAC, and NANDA integration
 */

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { createAuthRoutes } from './auth/auth.routes';
import { AuthMiddleware } from './auth/auth.middleware';
import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const execAsync = promisify(exec);
const PORT = process.env.PORT || 3501;

// Database configuration
const pgConfig = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'clos_db',
  user: process.env.POSTGRES_USER || 'clos_admin',
  password: process.env.POSTGRES_PASSWORD || 'clos_secure_password_2024',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || 'redis_secure_password_2024',
  retryStrategy: (times: number) => Math.min(times * 50, 2000)
};

// Initialize Express app
const app = express();
const server = createServer(app);

// Initialize Socket.IO with authentication
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3500',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Initialize database and Redis
const db = new Pool(pgConfig);
const redis = new Redis(redisConfig);

// Initialize authentication middleware
const authMiddleware = new AuthMiddleware(db, redis);

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3500',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check endpoint (public)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

// Authentication routes (public)
app.use('/api/auth', createAuthRoutes(db, redis));

// Apply authentication to all other routes
app.use('/api', authMiddleware.authenticate);

// Apply rate limiting
app.use('/api', authMiddleware.rateLimit(100, 60000)); // 100 requests per minute

// Apply audit logging
app.use('/api', authMiddleware.auditLog(db));

// Service monitoring cache
const serviceHealthCache = new Map();
const serviceMetricsCache = new Map();

// WebSocket authentication
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (token) {
      const authService = new (require('./auth/auth.service').AuthService)(db, redis);
      const user = await authService.verifyToken(token);
      socket.data.user = user;
    }
    next();
  } catch (error) {
    next(new Error('Authentication failed'));
  }
});

// WebSocket connection handling
io.on('connection', (socket) => {
  const user = socket.data.user;
  console.log(`WebSocket client connected: ${user?.username || 'anonymous'}`);
  
  socket.on('subscribe', (event) => {
    // Check permissions before allowing subscription
    if (user || event === 'public') {
      socket.join(event);
      console.log(`Client subscribed to ${event}`);
    }
  });
  
  socket.on('unsubscribe', (event) => {
    socket.leave(event);
    console.log(`Client unsubscribed from ${event}`);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Background service monitoring
setInterval(async () => {
  try {
    const services = await db.query(
      'SELECT * FROM services WHERE status = $1 AND is_active = true',
      ['running']
    );
    
    for (const service of services.rows) {
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
      
      // Store metrics in PostgreSQL
      if (service.container_id) {
        const stats = await getContainerStats(service.container_id);
        if (stats) {
          await db.query(
            `INSERT INTO health_metrics 
             (service_id, cpu_usage, memory_usage, disk_usage, response_time)
             VALUES ($1, $2, $3, $4, $5)`,
            [service.id, stats.cpu, stats.memory, 0, 0]
          );
          
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
}, 30000); // Check every 30 seconds

// API Routes

// Get all services
app.get('/api/services', 
  authMiddleware.requirePermission('read'),
  async (req, res) => {
    try {
      const services = await db.query(
        'SELECT * FROM services WHERE is_active = true ORDER BY group_name, name'
      );
      
      // Enrich with cached metrics and health
      const enrichedServices = services.rows.map((service: any) => ({
        ...service,
        health: serviceHealthCache.get(service.id) || 'unknown',
        ...serviceMetricsCache.get(service.id) || {}
      }));
      
      res.json({ success: true, data: enrichedServices });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to fetch services' });
    }
  }
);

// Get single service
app.get('/api/services/:id',
  authMiddleware.requirePermission('read'),
  async (req, res) => {
    try {
      const service = await db.query(
        'SELECT * FROM services WHERE id = $1',
        [req.params.id]
      );
      
      if (service.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Service not found' });
      }
      
      const enrichedService = {
        ...service.rows[0],
        health: serviceHealthCache.get(service.rows[0].id) || 'unknown',
        ...serviceMetricsCache.get(service.rows[0].id) || {}
      };
      
      res.json({ success: true, data: enrichedService });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to fetch service' });
    }
  }
);

// Start service (requires write permission)
app.post('/api/services/:id/start',
  authMiddleware.requirePermission('write'),
  async (req, res) => {
    try {
      const service = await db.query(
        'SELECT * FROM services WHERE id = $1',
        [req.params.id]
      );
      
      if (service.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Service not found' });
      }
      
      // Check if user owns the service or is admin
      if (req.user?.role !== 'admin' && service.rows[0].owner_id !== req.user?.userId) {
        return res.status(403).json({ success: false, message: 'Permission denied' });
      }
      
      // Execute start command
      let startCommand = '';
      if (service.rows[0].container_id) {
        startCommand = `docker start ${service.rows[0].container_id}`;
      } else {
        startCommand = `systemctl start ${service.rows[0].name}`;
      }
      
      await execAsync(startCommand);
      
      // Update database
      await db.query(
        'UPDATE services SET status = $1, started_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['running', service.rows[0].id]
      );
      
      // Log action
      await db.query(
        `INSERT INTO audit_log (user_id, action, resource_type, resource_id)
         VALUES ($1, $2, $3, $4)`,
        [req.user?.userId, 'start_service', 'service', service.rows[0].id]
      );
      
      // Emit update
      io.to('services').emit('service_update', {
        id: service.rows[0].id,
        status: 'running',
        started_at: new Date()
      });
      
      res.json({ success: true, data: { ...service.rows[0], status: 'running' } });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to start service' });
    }
  }
);

// Stop service (requires admin for critical services)
app.post('/api/services/:id/stop',
  authMiddleware.requirePermission('write'),
  async (req, res) => {
    try {
      const service = await db.query(
        'SELECT * FROM services WHERE id = $1',
        [req.params.id]
      );
      
      if (service.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Service not found' });
      }
      
      // Check if critical service (requires admin)
      if (service.rows[0].labels?.critical && req.user?.role !== 'admin') {
        return res.status(403).json({ 
          success: false, 
          message: 'Admin permission required for critical services' 
        });
      }
      
      // Execute stop command
      let stopCommand = '';
      if (service.rows[0].container_id) {
        stopCommand = `docker stop ${service.rows[0].container_id}`;
      } else {
        stopCommand = `systemctl stop ${service.rows[0].name}`;
      }
      
      await execAsync(stopCommand);
      
      // Update database
      await db.query(
        'UPDATE services SET status = $1, stopped_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['stopped', service.rows[0].id]
      );
      
      // Emit update
      io.to('services').emit('service_update', {
        id: service.rows[0].id,
        status: 'stopped',
        stopped_at: new Date()
      });
      
      res.json({ success: true, data: { ...service.rows[0], status: 'stopped' } });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to stop service' });
    }
  }
);

// Batch operations (admin only)
app.post('/api/services/batch/start',
  authMiddleware.requireAdmin,
  async (req, res) => {
    try {
      const { service_ids } = req.body;
      const results = await Promise.allSettled(
        service_ids.map(async (id: string) => {
          const service = await db.query('SELECT * FROM services WHERE id = $1', [id]);
          if (service.rows.length > 0 && service.rows[0].container_id) {
            await execAsync(`docker start ${service.rows[0].container_id}`);
            await db.query(
              'UPDATE services SET status = $1 WHERE id = $2',
              ['running', id]
            );
          }
          return id;
        })
      );
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      res.json({
        success: true,
        data: { total: service_ids.length, successful, failed }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Batch operation failed' });
    }
  }
);

// Get service logs
app.get('/api/services/:id/logs',
  authMiddleware.requirePermission('read'),
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const logs = await db.query(
        `SELECT * FROM logs 
         WHERE service_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2`,
        [req.params.id, limit]
      );
      
      res.json({ 
        success: true, 
        data: {
          items: logs.rows,
          total: logs.rows.length,
          page: 1,
          per_page: limit
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to fetch logs' });
    }
  }
);

// Get system health
app.get('/api/health',
  authMiddleware.optionalAuth,
  async (req, res) => {
    try {
      // Check Docker
      let dockerStatus = 'unhealthy';
      try {
        await execAsync('docker info');
        dockerStatus = 'healthy';
      } catch {}
      
      // Check database
      const dbStatus = await db.query('SELECT 1');
      
      // Count services
      const services = await db.query(
        'SELECT status, COUNT(*) as count FROM services GROUP BY status'
      );
      const serviceStats = services.rows.reduce((acc: any, row: any) => {
        acc[row.status] = parseInt(row.count);
        return acc;
      }, {});
      
      // Get uptime
      const uptime = process.uptime();
      
      res.json({
        success: true,
        data: {
          docker: dockerStatus,
          database: dbStatus ? 'healthy' : 'unhealthy',
          services: serviceStats,
          uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
          timestamp: new Date()
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to get system health' });
    }
  }
);

// Helper functions
async function checkServiceHealth(service: any) {
  if (!service.health_check_url) return 'unknown';
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(service.health_check_url, {
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    return response.ok ? 'healthy' : 'unhealthy';
  } catch (error) {
    return 'unhealthy';
  }
}

async function getContainerStats(containerName: string) {
  try {
    const { stdout } = await execAsync(
      `docker stats --no-stream --format "json" ${containerName}`
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
    return null;
  }
}

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// Start server
async function startServer() {
  try {
    // Test database connection
    await db.query('SELECT 1');
    console.log('✅ Database connected');
    
    // Test Redis connection
    await redis.ping();
    console.log('✅ Redis connected');
    
    server.listen(PORT, () => {
      console.log(`🚀 CLOS API Server with Auth running on port ${PORT}`);
      console.log(`📡 WebSocket server ready for connections`);
      console.log(`🔐 Authentication enabled with JWT and API keys`);
      console.log(`👥 Users: Patrick (admin), Tyler, Aaron, James (users)`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    db.end();
    redis.disconnect();
    process.exit(0);
  });
});

startServer().catch(console.error);
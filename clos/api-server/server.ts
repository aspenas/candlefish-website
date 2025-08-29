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

const execAsync = promisify(exec);
const PORT = process.env.PORT || 3501;
const DB_PATH = process.env.DB_PATH || '/Users/patricksmith/.clos/registry.db';

// Initialize Express app
const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3500',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
let db: any;

async function initDatabase() {
  db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });
}

// Service monitoring
const serviceHealthCache = new Map();
const serviceMetricsCache = new Map();

// Health check function
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

// Get container stats
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

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('New WebSocket client connected');
  
  socket.on('subscribe', (event) => {
    socket.join(event);
    console.log(`Client subscribed to ${event}`);
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
    const services = await db.all('SELECT * FROM services WHERE status = "running"');
    
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
}, 5000); // Check every 5 seconds

// API Routes

// Get all services
app.get('/api/services', async (req, res) => {
  try {
    const services = await db.all('SELECT * FROM services ORDER BY group_name, name');
    
    // Enrich with cached metrics and health
    const enrichedServices = services.map((service: any) => ({
      ...service,
      health: serviceHealthCache.get(service.id) || 'unknown',
      ...serviceMetricsCache.get(service.id) || {}
    }));
    
    res.json({ success: true, data: enrichedServices });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch services' });
  }
});

// Batch service operations (must be before :id routes)
app.post('/api/services/batch/start', async (req, res) => {
  try {
    const { service_ids } = req.body;
    
    if (!Array.isArray(service_ids)) {
      return res.status(400).json({ success: false, message: 'service_ids must be an array' });
    }
    
    if (service_ids.length === 0) {
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
      service_ids.map(async (id) => {
        const service = await db.get('SELECT * FROM services WHERE id = ?', id);
        if (!service) throw new Error(`Service ${id} not found`);
        
        let startCommand = '';
        if (service.container_id) {
          startCommand = `docker start ${service.container_id}`;
        } else {
          startCommand = `systemctl start ${service.name}`;
        }
        
        await execAsync(startCommand);
        await db.run(
          'UPDATE services SET status = ?, started_at = ? WHERE id = ?',
          ['running', new Date().toISOString(), service.id]
        );
        
        return { id: service.id, status: 'success' };
      })
    );
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    res.json({
      success: true,
      data: {
        total: service_ids.length,
        successful,
        failed,
        results: results.map((r, i) => ({
          service_id: service_ids[i],
          status: r.status,
          error: r.status === 'rejected' ? (r as any).reason.message : null
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to start services' });
  }
});

app.post('/api/services/batch/stop', async (req, res) => {
  try {
    const { service_ids } = req.body;
    
    if (!Array.isArray(service_ids)) {
      return res.status(400).json({ success: false, message: 'service_ids must be an array' });
    }
    
    if (service_ids.length === 0) {
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
      service_ids.map(async (id) => {
        const service = await db.get('SELECT * FROM services WHERE id = ?', id);
        if (!service) throw new Error(`Service ${id} not found`);
        
        let stopCommand = '';
        if (service.container_id) {
          stopCommand = `docker stop ${service.container_id}`;
        } else {
          stopCommand = `systemctl stop ${service.name}`;
        }
        
        await execAsync(stopCommand);
        await db.run(
          'UPDATE services SET status = ?, stopped_at = ? WHERE id = ?',
          ['stopped', new Date().toISOString(), service.id]
        );
        
        return { id: service.id, status: 'success' };
      })
    );
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    res.json({
      success: true,
      data: {
        total: service_ids.length,
        successful,
        failed,
        results: results.map((r, i) => ({
          service_id: service_ids[i],
          status: r.status,
          error: r.status === 'rejected' ? (r as any).reason.message : null
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to stop services' });
  }
});

// Get single service
app.get('/api/services/:id', async (req, res) => {
  try {
    const service = await db.get('SELECT * FROM services WHERE id = ?', req.params.id);
    
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }
    
    const enrichedService = {
      ...service,
      health: serviceHealthCache.get(service.id) || 'unknown',
      ...serviceMetricsCache.get(service.id) || {}
    };
    
    res.json({ success: true, data: enrichedService });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch service' });
  }
});

// Start service
app.post('/api/services/:id/start', async (req, res) => {
  try {
    const service = await db.get('SELECT * FROM services WHERE id = ?', req.params.id);
    
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }
    
    // Execute start command based on service type
    let startCommand = '';
    
    if (service.container_id) {
      startCommand = `docker start ${service.container_id}`;
    } else {
      // For non-containerized services, use systemctl or custom scripts
      startCommand = `systemctl start ${service.name}`;
    }
    
    await execAsync(startCommand);
    
    // Update database
    await db.run(
      'UPDATE services SET status = ?, started_at = ? WHERE id = ?',
      ['running', new Date().toISOString(), service.id]
    );
    
    // Emit update
    io.to('services').emit('service_update', {
      id: service.id,
      status: 'running',
      started_at: new Date()
    });
    
    res.json({ success: true, data: { ...service, status: 'running' } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to start service' });
  }
});

// Stop service
app.post('/api/services/:id/stop', async (req, res) => {
  try {
    const service = await db.get('SELECT * FROM services WHERE id = ?', req.params.id);
    
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }
    
    // Execute stop command
    let stopCommand = '';
    
    if (service.container_id) {
      stopCommand = `docker stop ${service.container_id}`;
    } else {
      stopCommand = `systemctl stop ${service.name}`;
    }
    
    await execAsync(stopCommand);
    
    // Update database
    await db.run(
      'UPDATE services SET status = ?, stopped_at = ? WHERE id = ?',
      ['stopped', new Date().toISOString(), service.id]
    );
    
    // Emit update
    io.to('services').emit('service_update', {
      id: service.id,
      status: 'stopped',
      stopped_at: new Date()
    });
    
    res.json({ success: true, data: { ...service, status: 'stopped' } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to stop service' });
  }
});

// Get service logs
app.get('/api/services/:id/logs', async (req, res) => {
  try {
    const service = await db.get('SELECT * FROM services WHERE id = ?', req.params.id);
    
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }
    
    const limit = parseInt(req.query.limit as string) || 100;
    let logs = '';
    
    if (service.container_id) {
      const { stdout } = await execAsync(`docker logs --tail ${limit} ${service.container_id}`);
      logs = stdout;
    } else {
      // For non-containerized services, read from journalctl or log files
      const { stdout } = await execAsync(`journalctl -u ${service.name} -n ${limit} --no-pager`);
      logs = stdout;
    }
    
    const logEntries = logs.split('\n').filter(Boolean).map((line, index) => ({
      id: `${service.id}-${Date.now()}-${index}`,
      service_id: service.id,
      timestamp: new Date(),
      level: 'info',
      message: line
    }));
    
    res.json({ 
      success: true, 
      data: {
        items: logEntries,
        total: logEntries.length,
        page: 1,
        per_page: limit
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch logs' });
  }
});

// Get port allocations
app.get('/api/ports', async (req, res) => {
  try {
    const ports = await db.all(
      'SELECT port, name, group_name, status FROM services ORDER BY port'
    );
    
    res.json({ success: true, data: ports });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch ports' });
  }
});

// Resolve port conflicts
app.post('/api/ports/resolve', async (req, res) => {
  try {
    const { port, force = false } = req.body;
    
    // Check for conflicts
    const conflicts = await db.all(
      'SELECT * FROM services WHERE port = ? AND status = "running"',
      port
    );
    
    if (conflicts.length > 0 && !force) {
      return res.status(409).json({ 
        success: false, 
        message: 'Port conflict detected',
        conflicts 
      });
    }
    
    // If force, stop conflicting services
    if (force && conflicts.length > 0) {
      for (const service of conflicts) {
        if (service.container_id) {
          await execAsync(`docker stop ${service.container_id}`);
        }
        await db.run(
          'UPDATE services SET status = "stopped" WHERE id = ?',
          service.id
        );
      }
    }
    
    res.json({ success: true, data: [] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to resolve conflicts' });
  }
});

// Get individual service health
app.get('/api/services/:id/health', async (req, res) => {
  try {
    const service = await db.get('SELECT * FROM services WHERE id = ?', req.params.id);
    
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }
    
    const health = await checkServiceHealth(service);
    const stats = serviceMetricsCache.get(service.id);
    
    res.json({
      success: true,
      data: {
        service_id: service.id,
        health,
        status: service.status,
        last_checked: new Date(),
        metrics: stats || null,
        endpoint: service.health_check_url
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get service health' });
  }
});

// Get service metrics endpoint
app.get('/api/services/:id/metrics', async (req, res) => {
  try {
    const service = await db.get('SELECT * FROM services WHERE id = ?', req.params.id);
    
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }
    
    const stats = serviceMetricsCache.get(service.id);
    
    res.json({
      success: true,
      data: {
        service_id: service.id,
        cpu: stats?.cpu || 0,
        memory: stats?.memory || 0,
        memory_usage: stats?.memoryUsage || 'N/A',
        net_io: stats?.netIO || 'N/A',
        block_io: stats?.blockIO || 'N/A',
        timestamp: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get service metrics' });
  }
});

// Get system health
app.get('/api/health', async (req, res) => {
  try {
    // Check Docker
    let dockerStatus = 'unhealthy';
    try {
      await execAsync('docker info');
      dockerStatus = 'healthy';
    } catch {}
    
    // Check database
    const dbStatus = db ? 'healthy' : 'unhealthy';
    
    // Count services
    const services = await db.all('SELECT status, COUNT(*) as count FROM services GROUP BY status');
    const serviceStats = services.reduce((acc: any, row: any) => {
      acc[row.status] = row.count;
      return acc;
    }, {});
    
    // Get uptime
    const { stdout } = await execAsync('uptime');
    const uptimeMatch = stdout.match(/up\s+(.+?),/);
    const uptime = uptimeMatch ? uptimeMatch[1] : 'unknown';
    
    res.json({
      success: true,
      data: {
        docker: dockerStatus,
        database: dbStatus,
        services: serviceStats,
        uptime,
        timestamp: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get system health' });
  }
});

// Log streaming endpoint
app.get('/api/logs/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  const serviceId = req.query.service_id as string;
  
  // Send initial message
  res.write('data: {"type":"connected"}\n\n');
  
  // Set up log watching (simplified version)
  const interval = setInterval(async () => {
    try {
      if (serviceId) {
        const service = await db.get('SELECT * FROM services WHERE id = ?', serviceId);
        if (service && service.container_id) {
          const { stdout } = await execAsync(`docker logs --tail 1 ${service.container_id}`);
          if (stdout) {
            res.write(`data: ${JSON.stringify({
              type: 'log',
              service_id: serviceId,
              message: stdout.trim(),
              timestamp: new Date()
            })}\n\n`);
          }
        }
      }
    } catch (error) {
      console.error('Error streaming logs:', error);
    }
  }, 1000);
  
  req.on('close', () => {
    clearInterval(interval);
  });
});

// Start server
async function startServer() {
  await initDatabase();
  
  server.listen(PORT, () => {
    console.log(`CLOS API Server running on port ${PORT}`);
    console.log(`WebSocket server ready for connections`);
  });
}

startServer().catch(console.error);
"use strict";
/**
 * NANDA V2 Orchestrator - Fixed Version for 5470 S Highline Circle
 * Inventory Management System Integration
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const pg_1 = require("pg");
const ioredis_1 = __importDefault(require("ioredis"));
const socket_io_1 = require("socket.io");
const http_1 = require("http");
const child_process_1 = require("child_process");
const util_1 = require("util");
const crypto_1 = require("crypto");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
// Configuration
const PORT = process.env.NANDA_PORT || 5100;
const AUTONOMOUS_MODE = process.env.AUTONOMOUS_MODE !== 'false';
const DECISION_THRESHOLD = parseFloat(process.env.DECISION_THRESHOLD || '0.75');
// Database connection - Fixed for local setup
const db = new pg_1.Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5434'),
    database: process.env.POSTGRES_DB || 'highline_inventory',
    user: process.env.POSTGRES_USER || 'highline',
    password: process.env.POSTGRES_PASSWORD || 'rtpm_secure_password_123',
});
// Redis connection
const redis = new ioredis_1.default({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    db: 3,
});
// Express app with CORS
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: ['https://inventory.highline.work', 'http://localhost:3050', 'http://localhost:3000'],
        methods: ['GET', 'POST'],
        credentials: true
    }
});
app.use(express_1.default.json());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
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
        console.log('🧠 NANDA Orchestrator initializing for 5470 S Highline Circle...');
        console.log(`Mode: ${this.state.mode}`);
        // Test database connection
        try {
            await db.query('SELECT 1');
            console.log('✅ Database connected');
        }
        catch (error) {
            console.error('⚠️ Database connection failed:', error instanceof Error ? error.message : error);
        }
        // Test Redis connection
        try {
            await redis.ping();
            console.log('✅ Redis connected');
        }
        catch (error) {
            console.error('⚠️ Redis connection failed:', error instanceof Error ? error.message : error);
        }
        // Register inventory services
        await this.registerInventoryServices();
        // Start monitoring
        this.startHealthMonitoring();
        this.startDecisionEngine();
        console.log(`✅ NANDA Orchestrator ready on port ${PORT}`);
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
        console.log('📦 Registered inventory services');
    }
    async registerService(service) {
        this.services.set(service.id, service);
        try {
            await db.query(`INSERT INTO services (id, name, type, port, status, health_url, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (id) DO UPDATE SET
           status = $5, health_url = $6, updated_at = NOW()`, [service.id, service.name, service.type, service.port, service.status, service.health_url]);
        }
        catch (error) {
            console.error('Failed to register service in DB:', error);
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
    }
    async checkServiceHealth(service) {
        if (!service.health_url)
            return;
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
            }
            else {
                service.status = 'unhealthy';
                service.error_count = (service.error_count || 0) + 1;
            }
        }
        catch (error) {
            service.status = 'unhealthy';
            service.error_count = (service.error_count || 0) + 1;
            console.log(`⚠️ Health check failed for ${service.name}`);
        }
        service.last_health_check = new Date();
        this.services.set(service.id, service);
        io.emit('service:health', service);
    }
    startDecisionEngine() {
        setInterval(async () => {
            if (this.state.mode !== 'autonomous')
                return;
            const unhealthyServices = Array.from(this.services.values())
                .filter(s => s.status === 'unhealthy' && (s.error_count || 0) >= 3);
            for (const service of unhealthyServices) {
                const decision = {
                    id: (0, crypto_1.randomUUID)(),
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
    async executeDecision(decision) {
        console.log(`🤖 Executing decision: ${decision.action} on ${decision.target}`);
        this.state.active_decisions.push(decision);
        this.state.metrics.decisions_made++;
        // For now, just log and emit events
        io.emit('decision:executed', decision);
        decision.executed = true;
        decision.result = 'Notification sent';
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
exports.default = orchestrator;

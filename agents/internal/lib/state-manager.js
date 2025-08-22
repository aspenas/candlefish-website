/**
 * State Manager with Redis persistence for NANDA agents
 * Handles state persistence, recovery, and distributed coordination
 */

const Redis = require('ioredis');
const EventEmitter = require('events');

class StateManager extends EventEmitter {
  constructor(agentId, redisUrl = process.env.REDIS_URL || 'redis://localhost:6379') {
    super();
    this.agentId = agentId;
    this.redis = new Redis(redisUrl);
    this.pubClient = new Redis(redisUrl);
    this.subClient = new Redis(redisUrl);
    
    // State tracking
    this.state = {
      agent_id: agentId,
      status: 'initializing',
      capabilities: [],
      metrics: {},
      last_checkpoint: null
    };
    
    // Set up pub/sub
    this.setupPubSub();
    
    // Automatic checkpointing every 30 seconds
    this.checkpointInterval = setInterval(() => this.checkpoint(), 30000);
  }
  
  setupPubSub() {
    // Subscribe to agent channels
    this.subClient.subscribe(`agent:${this.agentId}:commands`);
    this.subClient.subscribe('agent:global:announcements');
    
    this.subClient.on('message', (channel, message) => {
      try {
        const data = JSON.parse(message);
        this.emit('message', { channel, data });
        
        // Handle specific commands
        if (channel === `agent:${this.agentId}:commands`) {
          this.handleCommand(data);
        }
      } catch (error) {
        console.error('[StateManager] Error parsing message:', error);
      }
    });
  }
  
  async initialize() {
    // Try to recover previous state
    const recovered = await this.recover();
    
    if (recovered) {
      console.log(`[StateManager] Recovered state for ${this.agentId}`);
      this.state = { ...this.state, ...recovered };
    } else {
      console.log(`[StateManager] Starting fresh for ${this.agentId}`);
    }
    
    this.state.status = 'active';
    await this.checkpoint();
    
    // Announce agent is online
    await this.announce('agent_online', {
      agent_id: this.agentId,
      timestamp: new Date().toISOString()
    });
  }
  
  async checkpoint() {
    this.state.last_checkpoint = new Date().toISOString();
    
    // Save state to Redis with TTL of 1 hour
    await this.redis.setex(
      `agent:${this.agentId}:state`,
      3600,
      JSON.stringify(this.state)
    );
    
    // Also save to persistent backup
    await this.redis.set(
      `agent:${this.agentId}:state:backup`,
      JSON.stringify(this.state)
    );
    
    console.log(`[StateManager] Checkpointed state for ${this.agentId}`);
  }
  
  async recover() {
    try {
      // Try to get recent state first
      let stateStr = await this.redis.get(`agent:${this.agentId}:state`);
      
      // Fall back to backup if needed
      if (!stateStr) {
        stateStr = await this.redis.get(`agent:${this.agentId}:state:backup`);
      }
      
      if (stateStr) {
        return JSON.parse(stateStr);
      }
    } catch (error) {
      console.error(`[StateManager] Recovery failed for ${this.agentId}:`, error);
    }
    
    return null;
  }
  
  async updateState(updates) {
    this.state = { ...this.state, ...updates };
    
    // Checkpoint critical updates immediately
    if (updates.status || updates.capabilities) {
      await this.checkpoint();
    }
  }
  
  async updateMetric(name, value) {
    this.state.metrics[name] = value;
    
    // Also track in time series for monitoring
    const timestamp = Date.now();
    await this.redis.zadd(
      `metrics:${this.agentId}:${name}`,
      timestamp,
      `${timestamp}:${value}`
    );
    
    // Keep only last 1000 data points
    await this.redis.zremrangebyrank(
      `metrics:${this.agentId}:${name}`,
      0,
      -1001
    );
  }
  
  async getMetricHistory(name, duration = 3600000) {
    const now = Date.now();
    const start = now - duration;
    
    const results = await this.redis.zrangebyscore(
      `metrics:${this.agentId}:${name}`,
      start,
      now
    );
    
    return results.map(entry => {
      const [timestamp, value] = entry.split(':');
      return {
        timestamp: parseInt(timestamp),
        value: parseFloat(value)
      };
    });
  }
  
  async announce(event, data) {
    const message = {
      agent_id: this.agentId,
      event: event,
      data: data,
      timestamp: new Date().toISOString()
    };
    
    await this.pubClient.publish(
      'agent:global:announcements',
      JSON.stringify(message)
    );
  }
  
  async sendCommand(targetAgent, command, data) {
    const message = {
      from: this.agentId,
      command: command,
      data: data,
      timestamp: new Date().toISOString()
    };
    
    await this.pubClient.publish(
      `agent:${targetAgent}:commands`,
      JSON.stringify(message)
    );
  }
  
  handleCommand(message) {
    const { command, data, from } = message;
    
    switch (command) {
      case 'ping':
        this.sendCommand(from, 'pong', { agent_id: this.agentId });
        break;
        
      case 'status':
        this.sendCommand(from, 'status_response', this.state);
        break;
        
      case 'checkpoint':
        this.checkpoint();
        break;
        
      default:
        this.emit('command', { command, data, from });
    }
  }
  
  async registerCapability(capability) {
    if (!this.state.capabilities.includes(capability)) {
      this.state.capabilities.push(capability);
      await this.checkpoint();
      
      // Register in global capability index
      await this.redis.sadd(`capabilities:${capability}:agents`, this.agentId);
    }
  }
  
  async findAgentsWithCapability(capability) {
    const agents = await this.redis.smembers(`capabilities:${capability}:agents`);
    return agents;
  }
  
  async lock(resource, ttl = 5000) {
    const lockKey = `locks:${resource}`;
    const lockId = `${this.agentId}:${Date.now()}`;
    
    // Try to acquire lock with NX (only if not exists) and PX (TTL in ms)
    const result = await this.redis.set(lockKey, lockId, 'PX', ttl, 'NX');
    
    if (result === 'OK') {
      return lockId;
    }
    
    return null;
  }
  
  async unlock(resource, lockId) {
    const lockKey = `locks:${resource}`;
    
    // Only unlock if we own the lock
    const currentLock = await this.redis.get(lockKey);
    if (currentLock === lockId) {
      await this.redis.del(lockKey);
      return true;
    }
    
    return false;
  }
  
  async cleanup() {
    // Announce going offline
    await this.announce('agent_offline', {
      agent_id: this.agentId,
      timestamp: new Date().toISOString()
    });
    
    // Final checkpoint
    this.state.status = 'offline';
    await this.checkpoint();
    
    // Clean up connections
    clearInterval(this.checkpointInterval);
    await this.subClient.unsubscribe();
    await this.redis.quit();
    await this.pubClient.quit();
    await this.subClient.quit();
  }
}

module.exports = StateManager;
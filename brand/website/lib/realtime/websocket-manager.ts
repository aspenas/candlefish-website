/**
 * Real-time Data Manager for Atelier Operations
 * Simulates live system metrics and operational data streams
 * In production, this would connect to actual WebSocket endpoints
 */

class EventEmitter {
  private events: { [key: string]: Function[] } = {};

  on(event: string, callback: Function) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  off(event: string, callback: Function) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(cb => cb !== callback);
  }

  emit(event: string, ...args: any[]) {
    if (!this.events[event]) return;
    this.events[event].forEach(callback => callback(...args));
  }

  removeAllListeners() {
    this.events = {};
  }
}

export interface SystemMetrics {
  cpu: number;
  memory: number;
  requests: number;
  latency: number;
  timestamp: number;
}

export interface ProjectMetrics {
  projectId: string;
  name: string;
  metrics: Record<string, number>;
  status: 'healthy' | 'warning' | 'critical';
}

export interface QueueUpdate {
  position: number;
  ahead: number;
  estimatedTime: Date;
  movement: number;
}

export class RealTimeManager extends EventEmitter {
  private intervals: NodeJS.Timeout[] = [];
  private isConnected = false;
  private baseMetrics = {
    cpu: 23.4,
    memory: 67.2,
    requests: 142,
    latency: 12,
  };
  private queueSize = 15;
  private activeConnections = 247;

  constructor() {
    super();
    this.initialize();
  }

  private initialize(): void {
    this.connect();
  }

  /**
   * Simulate connection and start data streams
   */
  private connect(): void {
    setTimeout(() => {
      this.isConnected = true;
      console.log('Connected to Atelier data streams');
      this.emit('operational:connected');
      this.startMetricsStream();
      this.startHealthStream();
      this.startQueueStream();
    }, 1000);
  }

  /**
   * Start operational metrics stream
   */
  private startMetricsStream(): void {
    const metricsInterval = setInterval(() => {
      const metrics: SystemMetrics = {
        cpu: Math.max(0, Math.min(100, this.baseMetrics.cpu + (Math.random() - 0.5) * 10)),
        memory: Math.max(0, Math.min(100, this.baseMetrics.memory + (Math.random() - 0.5) * 5)),
        requests: Math.max(0, this.baseMetrics.requests + Math.floor((Math.random() - 0.5) * 20)),
        latency: Math.max(5, this.baseMetrics.latency + Math.floor((Math.random() - 0.5) * 8)),
        timestamp: Date.now(),
      };

      // Update base values for next iteration
      this.baseMetrics = { ...metrics };

      this.emit('metrics:update', metrics);
    }, 2000);

    this.intervals.push(metricsInterval);
  }

  /**
   * Start health monitoring stream
   */
  private startHealthStream(): void {
    const healthInterval = setInterval(() => {
      const health = {
        operational: true,
        degraded: Math.random() < 0.1,
        incident: Math.random() < 0.02,
        uptime: Date.now() - (7 * 24 * 60 * 60 * 1000), // 7 days
        services: {
          webgl: true,
          realtime: true,
          instruments: true,
          queue: true,
        },
      };

      this.emit('health:update', health);
    }, 10000);

    this.intervals.push(healthInterval);
  }

  /**
   * Start queue updates stream
   */
  private startQueueStream(): void {
    const queueInterval = setInterval(() => {
      // Simulate queue movement
      if (Math.random() < 0.3) {
        this.queueSize = Math.max(0, this.queueSize + Math.floor((Math.random() - 0.7) * 3));
      }

      // Update active connections
      this.activeConnections = Math.max(0, this.activeConnections + Math.floor((Math.random() - 0.5) * 10));

      const queueUpdate: QueueUpdate = {
        position: this.queueSize,
        ahead: this.queueSize - 1,
        estimatedTime: new Date(Date.now() + this.queueSize * 45 * 60 * 1000),
        movement: Math.random() < 0.3 ? -1 : 0,
      };

      this.emit('queue:update', queueUpdate);
    }, 5000);

    this.intervals.push(queueInterval);
  }

  /**
   * Subscribe to project updates (simulated)
   */
  public subscribeToProject(projectId: string): void {
    console.log(`Subscribed to project: ${projectId}`);
    // In a real implementation, this would subscribe to specific project streams
  }

  /**
   * Unsubscribe from project updates (simulated)
   */
  public unsubscribeFromProject(projectId: string): void {
    console.log(`Unsubscribed from project: ${projectId}`);
    // In a real implementation, this would unsubscribe from project streams
  }

  /**
   * Join the queue (simulated)
   */
  public joinQueue(email: string): Promise<QueueUpdate> {
    return new Promise((resolve) => {
      // Simulate API call delay
      setTimeout(() => {
        this.queueSize++;
        const queueUpdate: QueueUpdate = {
          position: this.queueSize,
          ahead: this.queueSize - 1,
          estimatedTime: new Date(Date.now() + this.queueSize * 45 * 60 * 1000),
          movement: 0,
        };
        resolve(queueUpdate);
        console.log(`${email} joined queue at position ${this.queueSize}`);
      }, 1500);
    });
  }

  /**
   * Get current queue position (simulated)
   */
  public getQueuePosition(email: string): Promise<QueueUpdate> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const queueUpdate: QueueUpdate = {
          position: Math.floor(Math.random() * 20) + 1,
          ahead: Math.floor(Math.random() * 19),
          estimatedTime: new Date(Date.now() + Math.random() * 3600000),
          movement: Math.floor((Math.random() - 0.5) * 3),
        };
        resolve(queueUpdate);
      }, 800);
    });
  }

  /**
   * Get current system status
   */
  public getCurrentStatus(): {
    metrics: SystemMetrics;
    connections: number;
    queueSize: number;
  } {
    return {
      metrics: {
        ...this.baseMetrics,
        timestamp: Date.now(),
      },
      connections: this.activeConnections,
      queueSize: this.queueSize,
    };
  }

  /**
   * Clean up all intervals and listeners
   */
  public disconnect(): void {
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
    this.isConnected = false;
    this.removeAllListeners();
    console.log('Disconnected from Atelier data streams');
  }

  /**
   * Check connection status
   */
  public getConnectionStatus(): {
    operational: boolean;
    projects: boolean;
    queue: boolean;
  } {
    return {
      operational: this.isConnected,
      projects: this.isConnected,
      queue: this.isConnected,
    };
  }

  /**
   * Trigger a manual update (for testing/demo purposes)
   */
  public triggerUpdate(type: 'metrics' | 'health' | 'queue'): void {
    switch (type) {
      case 'metrics':
        const metrics: SystemMetrics = {
          cpu: Math.random() * 100,
          memory: Math.random() * 100,
          requests: Math.floor(Math.random() * 1000),
          latency: Math.floor(Math.random() * 50) + 10,
          timestamp: Date.now(),
        };
        this.emit('metrics:update', metrics);
        break;
      case 'health':
        this.emit('health:update', {
          operational: true,
          degraded: Math.random() < 0.2,
          incident: false,
        });
        break;
      case 'queue':
        this.emit('queue:update', {
          position: this.queueSize,
          ahead: this.queueSize - 1,
          estimatedTime: new Date(Date.now() + Math.random() * 3600000),
          movement: Math.floor((Math.random() - 0.5) * 3),
        });
        break;
    }
  }
}

// Singleton instance
let rtManager: RealTimeManager | null = null;

export function getWebSocketManager(): RealTimeManager {
  if (!rtManager) {
    rtManager = new RealTimeManager();
  }
  return rtManager;
}

export function cleanupWebSocketManager(): void {
  if (rtManager) {
    rtManager.disconnect();
    rtManager = null;
  }
}

// Export the RealTimeManager as default for backward compatibility
export { RealTimeManager as WebSocketManager };

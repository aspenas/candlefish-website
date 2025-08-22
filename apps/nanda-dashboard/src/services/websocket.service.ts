import { 
  WebSocketMessage, 
  RealtimeMetrics, 
  AgentMetrics, 
  Alert, 
  Agent,
  AlertHistory 
} from '../types/rtpm.types';

export interface WebSocketConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
  subscriptions: string[];
}

export interface WebSocketEventHandlers {
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (error: Event) => void;
  onMessage?: (message: WebSocketMessage) => void;
  onMetrics?: (metrics: RealtimeMetrics) => void;
  onAgentMetrics?: (agentId: string, metrics: AgentMetrics) => void;
  onAlert?: (alert: AlertHistory) => void;
  onAgentStatus?: (agentId: string, status: Agent['status']) => void;
  onReconnect?: (attempt: number) => void;
  onConnectionStateChange?: (state: ConnectionState) => void;
}

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';

export class WebSocketService {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private handlers: WebSocketEventHandlers;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private messageQueue: any[] = [];
  private isReconnecting = false;

  constructor(config: WebSocketConfig, handlers: WebSocketEventHandlers = {}) {
    this.config = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      subscriptions: ['metrics', 'alerts', 'agent_status'],
      ...config
    };
    this.handlers = handlers;
  }

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.setConnectionState('connecting');
      
      try {
        this.ws = new WebSocket(this.config.url);
        
        this.ws.onopen = () => {
          console.log('WebSocket connected to:', this.config.url);
          this.setConnectionState('connected');
          this.reconnectAttempts = 0;
          this.isReconnecting = false;
          
          // Send subscriptions
          this.sendSubscriptions();
          
          // Start heartbeat
          this.startHeartbeat();
          
          // Send queued messages
          this.flushMessageQueue();
          
          this.handlers.onOpen?.();
          resolve();
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          this.setConnectionState('disconnected');
          this.stopHeartbeat();
          this.handlers.onClose?.(event);
          
          // Auto-reconnect unless explicitly closed
          if (event.code !== 1000 && !this.isReconnecting) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.setConnectionState('error');
          this.handlers.onError?.(error);
          reject(error);
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

      } catch (error) {
        this.setConnectionState('error');
        reject(error);
      }
    });
  }

  public disconnect(): void {
    this.isReconnecting = false;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.setConnectionState('disconnected');
  }

  public send(message: any): boolean {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        return false;
      }
    } else {
      // Queue message for later
      this.messageQueue.push(message);
      return false;
    }
  }

  public subscribe(topics: string[]): void {
    this.send({
      type: 'subscribe',
      topics,
      timestamp: new Date().toISOString()
    });
  }

  public unsubscribe(topics: string[]): void {
    this.send({
      type: 'unsubscribe',
      topics,
      timestamp: new Date().toISOString()
    });
  }

  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.handlers.onConnectionStateChange?.(state);
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    // Parse timestamp if it's a string
    if (typeof message.timestamp === 'string') {
      message.timestamp = new Date(message.timestamp);
    }

    // Call general message handler
    this.handlers.onMessage?.(message);

    // Call specific handlers based on message type
    switch (message.type) {
      case 'metrics':
        if (message.agentId) {
          this.handlers.onAgentMetrics?.(message.agentId, message.data as AgentMetrics);
        } else {
          this.handlers.onMetrics?.(message.data as RealtimeMetrics);
        }
        break;

      case 'alert':
        this.handlers.onAlert?.(message.data as AlertHistory);
        break;

      case 'agent_status':
        if (message.agentId) {
          this.handlers.onAgentStatus?.(message.agentId, message.data.status);
        }
        break;

      case 'system_health':
        // Could add system health handler here
        break;

      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  private sendSubscriptions(): void {
    if (this.config.subscriptions.length > 0) {
      this.subscribe(this.config.subscriptions);
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({
          type: 'ping',
          timestamp: new Date().toISOString()
        });
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.setConnectionState('error');
      return;
    }

    this.isReconnecting = true;
    this.setConnectionState('reconnecting');
    
    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts),
      30000 // Max 30 seconds
    );

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.handlers.onReconnect?.(this.reconnectAttempts);
      this.connect().catch(() => {
        // Reconnection failed, schedule another attempt
        this.scheduleReconnect();
      });
    }, delay);
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.send(message);
    }
  }
}

// WebSocket hook for React components
export function useWebSocket(config: WebSocketConfig, handlers: WebSocketEventHandlers = {}) {
  const [service] = React.useState(() => new WebSocketService(config, handlers));
  const [connectionState, setConnectionState] = React.useState<ConnectionState>('disconnected');

  React.useEffect(() => {
    const enhancedHandlers = {
      ...handlers,
      onConnectionStateChange: (state: ConnectionState) => {
        setConnectionState(state);
        handlers.onConnectionStateChange?.(state);
      }
    };

    // Update handlers
    Object.assign(service['handlers'], enhancedHandlers);

    // Connect
    service.connect().catch(console.error);

    return () => {
      service.disconnect();
    };
  }, [service]);

  return {
    service,
    connectionState,
    isConnected: connectionState === 'connected',
    send: (message: any) => service.send(message),
    subscribe: (topics: string[]) => service.subscribe(topics),
    unsubscribe: (topics: string[]) => service.unsubscribe(topics),
    disconnect: () => service.disconnect()
  };
}

// Mock WebSocket service for development
export class MockWebSocketService extends WebSocketService {
  private mockTimer: NodeJS.Timeout | null = null;
  private mockAgents: Agent[] = [];

  constructor(config: WebSocketConfig, handlers: WebSocketEventHandlers = {}) {
    super(config, handlers);
    this.generateMockAgents();
  }

  public connect(): Promise<void> {
    return new Promise((resolve) => {
      // Simulate connection delay
      setTimeout(() => {
        this.setConnectionState('connected');
        this.handlers.onOpen?.();
        this.startMockDataStream();
        resolve();
      }, 1000);
    });
  }

  public disconnect(): void {
    if (this.mockTimer) {
      clearInterval(this.mockTimer);
      this.mockTimer = null;
    }
    this.setConnectionState('disconnected');
  }

  private setConnectionState(state: ConnectionState): void {
    // Access protected method through bracket notation
    (this as any)['connectionState'] = state;
    this.handlers.onConnectionStateChange?.(state);
  }

  private generateMockAgents(): void {
    const platforms = ['OpenAI', 'Anthropic', 'Google', 'Cohere', 'Mistral', 'Local'];
    const regions = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'];
    
    for (let i = 1; i <= 50; i++) {
      this.mockAgents.push({
        id: `agent-${i.toString().padStart(3, '0')}`,
        name: `Agent-${i.toString().padStart(3, '0')}`,
        status: Math.random() > 0.1 ? 'online' : 'offline',
        version: `v${Math.floor(Math.random() * 3) + 1}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`,
        capabilities: ['text-generation', 'code-completion', 'analysis'].slice(0, Math.floor(Math.random() * 3) + 1),
        lastSeen: new Date(),
        region: regions[Math.floor(Math.random() * regions.length)],
        platform: platforms[Math.floor(Math.random() * platforms.length)]
      });
    }
  }

  private startMockDataStream(): void {
    this.mockTimer = setInterval(() => {
      // Send random metrics
      if (Math.random() > 0.3) {
        const agent = this.mockAgents[Math.floor(Math.random() * this.mockAgents.length)];
        const metrics: AgentMetrics = {
          agentId: agent.id,
          timestamp: new Date(),
          cpu: Math.random() * 100,
          memory: Math.random() * 100,
          requestRate: Math.random() * 100,
          errorRate: Math.random() * 10,
          responseTime: Math.random() * 1000 + 50,
          throughput: Math.random() * 50,
          activeConnections: Math.floor(Math.random() * 100)
        };

        this.handlers.onAgentMetrics?.(agent.id, metrics);
      }

      // Send system metrics
      if (Math.random() > 0.7) {
        const systemMetrics: RealtimeMetrics = {
          timestamp: new Date(),
          agents: {
            total: this.mockAgents.length,
            online: this.mockAgents.filter(a => a.status === 'online').length,
            offline: this.mockAgents.filter(a => a.status === 'offline').length,
            warning: this.mockAgents.filter(a => a.status === 'warning').length,
            error: this.mockAgents.filter(a => a.status === 'error').length
          },
          system: {
            avgCpu: Math.random() * 100,
            avgMemory: Math.random() * 100,
            avgResponseTime: Math.random() * 1000 + 100,
            requestRate: Math.random() * 1000,
            errorRate: Math.random() * 5,
            throughput: Math.random() * 500,
            activeConnections: Math.floor(Math.random() * 1000) + 500
          },
          network: {
            latency: Math.random() * 100 + 10,
            bandwidth: Math.random() * 1000,
            packetLoss: Math.random() * 5
          }
        };

        this.handlers.onMetrics?.(systemMetrics);
      }

      // Occasionally send alerts
      if (Math.random() > 0.95) {
        const agent = this.mockAgents[Math.floor(Math.random() * this.mockAgents.length)];
        const alert: AlertHistory = {
          id: `alert-${Date.now()}`,
          alertId: `alert-rule-${Math.floor(Math.random() * 10)}`,
          agentId: agent.id,
          triggeredAt: new Date(),
          value: Math.random() * 100,
          threshold: 80,
          severity: ['warning', 'error', 'critical'][Math.floor(Math.random() * 3)] as any,
          message: `High ${['CPU', 'Memory', 'Response Time'][Math.floor(Math.random() * 3)]} on ${agent.name}`,
          acknowledged: false
        };

        this.handlers.onAlert?.(alert);
      }
    }, 2000);
  }
}

// React import for TypeScript
import React from 'react';
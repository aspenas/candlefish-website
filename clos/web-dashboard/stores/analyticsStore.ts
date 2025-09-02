import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { io, Socket } from 'socket.io-client';

// Types for analytics data
export interface AgentPerformanceMetric {
  agentId: string;
  agentName: string;
  timestamp: string;
  responseTime: number;
  successRate: number;
  memoryUsage: number;
  cpuUsage: number;
  requestCount: number;
  errorCount: number;
}

export interface ServiceHealthMetric {
  serviceId: string;
  serviceName: string;
  status: 'healthy' | 'warning' | 'critical' | 'down';
  uptime: number;
  lastCheck: string;
  errorRate: number;
  responseTime: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface SystemOverview {
  totalAgents: number;
  activeAgents: number;
  totalServices: number;
  healthyServices: number;
  systemLoad: number;
  memoryUsage: number;
  diskUsage: number;
  networkActivity: number;
}

export interface AlertItem {
  id: string;
  type: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  source: string;
  timestamp: string;
  acknowledged: boolean;
  resolved: boolean;
}

export interface Widget {
  id: string;
  type: 'chart' | 'metric' | 'list' | 'grid';
  title: string;
  position: { x: number; y: number; w: number; h: number };
  config: Record<string, any>;
  visible: boolean;
}

interface AnalyticsState {
  // Data
  agentPerformance: AgentPerformanceMetric[];
  serviceHealth: ServiceHealthMetric[];
  systemOverview: SystemOverview | null;
  alerts: AlertItem[];
  widgets: Widget[];
  
  // UI State
  isLoading: boolean;
  error: string | null;
  lastUpdate: string | null;
  
  // WebSocket
  socket: Socket | null;
  isConnected: boolean;
  
  // Filters & Settings
  timeRange: '1h' | '4h' | '12h' | '24h' | '7d';
  selectedAgents: string[];
  selectedServices: string[];
  alertsFilter: 'all' | 'unacknowledged' | 'critical';
  
  // Actions
  initializeSocket: (token: string) => void;
  disconnectSocket: () => void;
  fetchAnalyticsData: () => Promise<void>;
  fetchAgentPerformance: () => Promise<void>;
  fetchServiceHealth: () => Promise<void>;
  fetchSystemOverview: () => Promise<void>;
  fetchAlerts: () => Promise<void>;
  acknowledgeAlert: (alertId: string) => Promise<void>;
  resolveAlert: (alertId: string) => Promise<void>;
  updateWidget: (widgetId: string, updates: Partial<Widget>) => void;
  addWidget: (widget: Omit<Widget, 'id'>) => void;
  removeWidget: (widgetId: string) => void;
  setTimeRange: (range: '1h' | '4h' | '12h' | '24h' | '7d') => void;
  setSelectedAgents: (agents: string[]) => void;
  setSelectedServices: (services: string[]) => void;
  setAlertsFilter: (filter: 'all' | 'unacknowledged' | 'critical') => void;
  setError: (error: string | null) => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const useAnalyticsStore = create<AnalyticsState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    agentPerformance: [],
    serviceHealth: [],
    systemOverview: null,
    alerts: [],
    widgets: [
      {
        id: 'system-overview',
        type: 'metric',
        title: 'System Overview',
        position: { x: 0, y: 0, w: 6, h: 3 },
        config: {},
        visible: true,
      },
      {
        id: 'agent-performance-chart',
        type: 'chart',
        title: 'Agent Performance',
        position: { x: 6, y: 0, w: 6, h: 6 },
        config: { chartType: 'line', metrics: ['responseTime', 'successRate'] },
        visible: true,
      },
      {
        id: 'service-health-grid',
        type: 'grid',
        title: 'Service Health',
        position: { x: 0, y: 3, w: 6, h: 6 },
        config: {},
        visible: true,
      },
      {
        id: 'recent-alerts',
        type: 'list',
        title: 'Recent Alerts',
        position: { x: 0, y: 9, w: 12, h: 4 },
        config: { limit: 10 },
        visible: true,
      },
    ],
    
    isLoading: false,
    error: null,
    lastUpdate: null,
    socket: null,
    isConnected: false,
    
    timeRange: '4h',
    selectedAgents: [],
    selectedServices: [],
    alertsFilter: 'all',

    initializeSocket: (token: string) => {
      const socket = io(API_BASE_URL, {
        auth: { token },
        transports: ['websocket'],
      });

      socket.on('connect', () => {
        console.log('Analytics WebSocket connected');
        set({ socket, isConnected: true });
      });

      socket.on('disconnect', () => {
        console.log('Analytics WebSocket disconnected');
        set({ isConnected: false });
      });

      // Real-time data updates
      socket.on('agent_performance_update', (data: AgentPerformanceMetric) => {
        set((state) => ({
          agentPerformance: [...state.agentPerformance.slice(-99), data],
          lastUpdate: new Date().toISOString(),
        }));
      });

      socket.on('service_health_update', (data: ServiceHealthMetric) => {
        set((state) => ({
          serviceHealth: state.serviceHealth.map(service =>
            service.serviceId === data.serviceId ? data : service
          ),
          lastUpdate: new Date().toISOString(),
        }));
      });

      socket.on('system_overview_update', (data: SystemOverview) => {
        set({ systemOverview: data, lastUpdate: new Date().toISOString() });
      });

      socket.on('new_alert', (data: AlertItem) => {
        set((state) => ({
          alerts: [data, ...state.alerts],
          lastUpdate: new Date().toISOString(),
        }));
      });

      socket.on('alert_updated', (data: AlertItem) => {
        set((state) => ({
          alerts: state.alerts.map(alert =>
            alert.id === data.id ? data : alert
          ),
          lastUpdate: new Date().toISOString(),
        }));
      });

      set({ socket });
    },

    disconnectSocket: () => {
      const { socket } = get();
      if (socket) {
        socket.disconnect();
        set({ socket: null, isConnected: false });
      }
    },

    fetchAnalyticsData: async () => {
      set({ isLoading: true, error: null });
      try {
        await Promise.all([
          get().fetchAgentPerformance(),
          get().fetchServiceHealth(),
          get().fetchSystemOverview(),
          get().fetchAlerts(),
        ]);
      } catch (error) {
        console.error('Failed to fetch analytics data:', error);
        set({ error: 'Failed to fetch analytics data' });
      } finally {
        set({ isLoading: false });
      }
    },

    fetchAgentPerformance: async () => {
      const { timeRange } = get();
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`${API_BASE_URL}/api/v1/analytics/agents/performance?timeRange=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch agent performance');
      }

      const data = await response.json();
      set({ 
        agentPerformance: data.data || [],
        lastUpdate: new Date().toISOString(),
      });
    },

    fetchServiceHealth: async () => {
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`${API_BASE_URL}/api/v1/analytics/services/health`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch service health');
      }

      const data = await response.json();
      set({ 
        serviceHealth: data.data || [],
        lastUpdate: new Date().toISOString(),
      });
    },

    fetchSystemOverview: async () => {
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`${API_BASE_URL}/api/v1/analytics/system/overview`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch system overview');
      }

      const data = await response.json();
      set({ 
        systemOverview: data.data,
        lastUpdate: new Date().toISOString(),
      });
    },

    fetchAlerts: async () => {
      const { alertsFilter } = get();
      const token = localStorage.getItem('accessToken');
      
      const params = new URLSearchParams({ filter: alertsFilter });
      const response = await fetch(`${API_BASE_URL}/api/v1/analytics/alerts?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch alerts');
      }

      const data = await response.json();
      set({ 
        alerts: data.data || [],
        lastUpdate: new Date().toISOString(),
      });
    },

    acknowledgeAlert: async (alertId: string) => {
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`${API_BASE_URL}/api/v1/analytics/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to acknowledge alert');
      }

      set((state) => ({
        alerts: state.alerts.map(alert =>
          alert.id === alertId ? { ...alert, acknowledged: true } : alert
        ),
      }));
    },

    resolveAlert: async (alertId: string) => {
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`${API_BASE_URL}/api/v1/analytics/alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to resolve alert');
      }

      set((state) => ({
        alerts: state.alerts.map(alert =>
          alert.id === alertId ? { ...alert, resolved: true } : alert
        ),
      }));
    },

    updateWidget: (widgetId: string, updates: Partial<Widget>) => {
      set((state) => ({
        widgets: state.widgets.map(widget =>
          widget.id === widgetId ? { ...widget, ...updates } : widget
        ),
      }));
    },

    addWidget: (widget: Omit<Widget, 'id'>) => {
      const id = `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      set((state) => ({
        widgets: [...state.widgets, { ...widget, id }],
      }));
    },

    removeWidget: (widgetId: string) => {
      set((state) => ({
        widgets: state.widgets.filter(widget => widget.id !== widgetId),
      }));
    },

    setTimeRange: (range: '1h' | '4h' | '12h' | '24h' | '7d') => {
      set({ timeRange: range });
      // Refetch data with new time range
      get().fetchAgentPerformance();
    },

    setSelectedAgents: (agents: string[]) => set({ selectedAgents: agents }),
    setSelectedServices: (services: string[]) => set({ selectedServices: services }),
    setAlertsFilter: (filter: 'all' | 'unacknowledged' | 'critical') => {
      set({ alertsFilter: filter });
      get().fetchAlerts();
    },
    setError: (error: string | null) => set({ error }),
  }))
);
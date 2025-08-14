import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  TemporalConnection,
  TemporalWorkflow,
  APIKey,
  APIKeyUsage,
  MonitoringMetric,
  Alert,
  NotificationChannel,
  CircuitBreaker,
  SecurityScan,
  Vulnerability,
  WebSocketEvent,
  ProductionStore
} from '@/lib/types/production';

interface ProductionStoreActions {
  // Temporal actions
  fetchTemporalConnections: () => Promise<void>;
  createTemporalConnection: (connection: Omit<TemporalConnection, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTemporalConnection: (id: string, updates: Partial<TemporalConnection>) => Promise<void>;
  deleteTemporalConnection: (id: string) => Promise<void>;
  testTemporalConnection: (id: string) => Promise<boolean>;
  fetchTemporalWorkflows: (connectionId?: string) => Promise<void>;
  setSelectedConnection: (connectionId?: string) => void;

  // API Key actions
  fetchAPIKeys: () => Promise<void>;
  createAPIKey: (keyData: Omit<APIKey, 'id' | 'keyPrefix' | 'createdAt' | 'usage'>) => Promise<{ key: string; secret: string }>;
  rotateAPIKey: (id: string) => Promise<{ key: string; secret: string }>;
  revokeAPIKey: (id: string) => Promise<void>;
  fetchAPIKeyUsage: (id: string) => Promise<void>;

  // Monitoring actions
  fetchMetrics: (metricNames?: string[], timeRange?: { from: string; to: string }) => Promise<void>;
  createAlert: (alert: Omit<Alert, 'id' | 'createdAt'>) => Promise<void>;
  updateAlert: (id: string, updates: Partial<Alert>) => Promise<void>;
  deleteAlert: (id: string) => Promise<void>;
  fetchAlerts: () => Promise<void>;
  createNotificationChannel: (channel: Omit<NotificationChannel, 'id' | 'createdAt'>) => Promise<void>;
  updateNotificationChannel: (id: string, updates: Partial<NotificationChannel>) => Promise<void>;
  deleteNotificationChannel: (id: string) => Promise<void>;
  fetchNotificationChannels: () => Promise<void>;

  // Circuit Breaker actions
  fetchCircuitBreakers: () => Promise<void>;
  createCircuitBreaker: (breaker: Omit<CircuitBreaker, 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateCircuitBreaker: (name: string, updates: Partial<CircuitBreaker>) => Promise<void>;
  resetCircuitBreaker: (name: string) => Promise<void>;
  fetchCircuitBreakerMetrics: (name: string) => Promise<void>;

  // Security actions
  fetchSecurityScans: () => Promise<void>;
  createSecurityScan: (scan: Omit<SecurityScan, 'id' | 'startedAt'>) => Promise<void>;
  cancelSecurityScan: (id: string) => Promise<void>;
  fetchVulnerabilities: () => Promise<void>;
  updateVulnerabilityStatus: (id: string, status: Vulnerability['status']) => Promise<void>;

  // WebSocket actions
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
  handleWebSocketEvent: (event: WebSocketEvent) => void;

  // Utility actions
  setLoading: (section: keyof ProductionStore, loading: boolean) => void;
  reset: () => void;
}

type ProductionStoreState = ProductionStore & ProductionStoreActions;

export const useProductionStore = create<ProductionStoreState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    temporal: {
      connections: [],
      workflows: [],
      selectedConnection: undefined,
      isLoading: false,
    },
    apiKeys: {
      keys: [],
      usage: {},
      rotationSchedule: [],
      isLoading: false,
    },
    monitoring: {
      metrics: {},
      alerts: [],
      channels: [],
      dashboards: [],
      realTimeData: {},
      isLoading: false,
    },
    circuitBreakers: {
      breakers: [],
      metrics: {},
      isLoading: false,
    },
    security: {
      scans: [],
      vulnerabilities: [],
      compliance: [],
      isLoading: false,
    },

    // Temporal actions
    fetchTemporalConnections: async () => {
      set((state) => ({ temporal: { ...state.temporal, isLoading: true } }));
      try {
        const response = await fetch('/api/v1/temporal/connections');
        const data = await response.json();
        if (data.success) {
          set((state) => ({
            temporal: { ...state.temporal, connections: data.data, isLoading: false }
          }));
        }
      } catch (error) {
        console.error('Failed to fetch temporal connections:', error);
        set((state) => ({ temporal: { ...state.temporal, isLoading: false } }));
      }
    },

    createTemporalConnection: async (connectionData) => {
      try {
        const response = await fetch('/api/v1/temporal/connections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(connectionData),
        });
        const data = await response.json();
        if (data.success) {
          set((state) => ({
            temporal: {
              ...state.temporal,
              connections: [...state.temporal.connections, data.data]
            }
          }));
        }
      } catch (error) {
        console.error('Failed to create temporal connection:', error);
        throw error;
      }
    },

    updateTemporalConnection: async (id, updates) => {
      try {
        const response = await fetch(`/api/v1/temporal/connections/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        const data = await response.json();
        if (data.success) {
          set((state) => ({
            temporal: {
              ...state.temporal,
              connections: state.temporal.connections.map(conn =>
                conn.id === id ? { ...conn, ...data.data } : conn
              )
            }
          }));
        }
      } catch (error) {
        console.error('Failed to update temporal connection:', error);
        throw error;
      }
    },

    deleteTemporalConnection: async (id) => {
      try {
        const response = await fetch(`/api/v1/temporal/connections/${id}`, {
          method: 'DELETE',
        });
        const data = await response.json();
        if (data.success) {
          set((state) => ({
            temporal: {
              ...state.temporal,
              connections: state.temporal.connections.filter(conn => conn.id !== id)
            }
          }));
        }
      } catch (error) {
        console.error('Failed to delete temporal connection:', error);
        throw error;
      }
    },

    testTemporalConnection: async (id) => {
      try {
        const response = await fetch(`/api/v1/temporal/connections/${id}/test`, {
          method: 'POST',
        });
        const data = await response.json();
        return data.success;
      } catch (error) {
        console.error('Failed to test temporal connection:', error);
        return false;
      }
    },

    fetchTemporalWorkflows: async (connectionId) => {
      set((state) => ({ temporal: { ...state.temporal, isLoading: true } }));
      try {
        const url = connectionId
          ? `/api/v1/temporal/workflows?connectionId=${connectionId}`
          : '/api/v1/temporal/workflows';
        const response = await fetch(url);
        const data = await response.json();
        if (data.success) {
          set((state) => ({
            temporal: { ...state.temporal, workflows: data.data, isLoading: false }
          }));
        }
      } catch (error) {
        console.error('Failed to fetch temporal workflows:', error);
        set((state) => ({ temporal: { ...state.temporal, isLoading: false } }));
      }
    },

    setSelectedConnection: (connectionId) => {
      set((state) => ({
        temporal: { ...state.temporal, selectedConnection: connectionId }
      }));
    },

    // API Key actions
    fetchAPIKeys: async () => {
      set((state) => ({ apiKeys: { ...state.apiKeys, isLoading: true } }));
      try {
        const response = await fetch('/api/v1/keys');
        const data = await response.json();
        if (data.success) {
          set((state) => ({
            apiKeys: { ...state.apiKeys, keys: data.data, isLoading: false }
          }));
        }
      } catch (error) {
        console.error('Failed to fetch API keys:', error);
        set((state) => ({ apiKeys: { ...state.apiKeys, isLoading: false } }));
      }
    },

    createAPIKey: async (keyData) => {
      try {
        const response = await fetch('/api/v1/keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(keyData),
        });
        const data = await response.json();
        if (data.success) {
          set((state) => ({
            apiKeys: {
              ...state.apiKeys,
              keys: [...state.apiKeys.keys, data.data.key]
            }
          }));
          return { key: data.data.key.keyPrefix, secret: data.data.secret };
        }
        throw new Error(data.error || 'Failed to create API key');
      } catch (error) {
        console.error('Failed to create API key:', error);
        throw error;
      }
    },

    rotateAPIKey: async (id) => {
      try {
        const response = await fetch(`/api/v1/keys/${id}/rotate`, {
          method: 'POST',
        });
        const data = await response.json();
        if (data.success) {
          set((state) => ({
            apiKeys: {
              ...state.apiKeys,
              keys: state.apiKeys.keys.map(key =>
                key.id === id ? { ...key, ...data.data.key } : key
              )
            }
          }));
          return { key: data.data.key.keyPrefix, secret: data.data.secret };
        }
        throw new Error(data.error || 'Failed to rotate API key');
      } catch (error) {
        console.error('Failed to rotate API key:', error);
        throw error;
      }
    },

    revokeAPIKey: async (id) => {
      try {
        const response = await fetch(`/api/v1/keys/${id}`, {
          method: 'DELETE',
        });
        const data = await response.json();
        if (data.success) {
          set((state) => ({
            apiKeys: {
              ...state.apiKeys,
              keys: state.apiKeys.keys.map(key =>
                key.id === id ? { ...key, status: 'revoked' as const } : key
              )
            }
          }));
        }
      } catch (error) {
        console.error('Failed to revoke API key:', error);
        throw error;
      }
    },

    fetchAPIKeyUsage: async (id) => {
      try {
        const response = await fetch(`/api/v1/keys/${id}/usage`);
        const data = await response.json();
        if (data.success) {
          set((state) => ({
            apiKeys: {
              ...state.apiKeys,
              usage: { ...state.apiKeys.usage, [id]: data.data }
            }
          }));
        }
      } catch (error) {
        console.error('Failed to fetch API key usage:', error);
      }
    },

    // Monitoring actions
    fetchMetrics: async (metricNames, timeRange) => {
      set((state) => ({ monitoring: { ...state.monitoring, isLoading: true } }));
      try {
        const params = new URLSearchParams();
        if (metricNames) params.append('metrics', metricNames.join(','));
        if (timeRange) {
          params.append('from', timeRange.from);
          params.append('to', timeRange.to);
        }

        const response = await fetch(`/api/v1/monitoring/metrics?${params}`);
        const data = await response.json();
        if (data.success) {
          set((state) => ({
            monitoring: { ...state.monitoring, metrics: data.data, isLoading: false }
          }));
        }
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
        set((state) => ({ monitoring: { ...state.monitoring, isLoading: false } }));
      }
    },

    createAlert: async (alertData) => {
      try {
        const response = await fetch('/api/v1/monitoring/alerts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(alertData),
        });
        const data = await response.json();
        if (data.success) {
          set((state) => ({
            monitoring: {
              ...state.monitoring,
              alerts: [...state.monitoring.alerts, data.data]
            }
          }));
        }
      } catch (error) {
        console.error('Failed to create alert:', error);
        throw error;
      }
    },

    updateAlert: async (id, updates) => {
      try {
        const response = await fetch(`/api/v1/monitoring/alerts/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        const data = await response.json();
        if (data.success) {
          set((state) => ({
            monitoring: {
              ...state.monitoring,
              alerts: state.monitoring.alerts.map(alert =>
                alert.id === id ? { ...alert, ...data.data } : alert
              )
            }
          }));
        }
      } catch (error) {
        console.error('Failed to update alert:', error);
        throw error;
      }
    },

    deleteAlert: async (id) => {
      try {
        const response = await fetch(`/api/v1/monitoring/alerts/${id}`, {
          method: 'DELETE',
        });
        const data = await response.json();
        if (data.success) {
          set((state) => ({
            monitoring: {
              ...state.monitoring,
              alerts: state.monitoring.alerts.filter(alert => alert.id !== id)
            }
          }));
        }
      } catch (error) {
        console.error('Failed to delete alert:', error);
        throw error;
      }
    },

    fetchAlerts: async () => {
      try {
        const response = await fetch('/api/v1/monitoring/alerts');
        const data = await response.json();
        if (data.success) {
          set((state) => ({
            monitoring: { ...state.monitoring, alerts: data.data }
          }));
        }
      } catch (error) {
        console.error('Failed to fetch alerts:', error);
      }
    },

    createNotificationChannel: async (channelData) => {
      try {
        const response = await fetch('/api/v1/monitoring/notifications/channels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(channelData),
        });
        const data = await response.json();
        if (data.success) {
          set((state) => ({
            monitoring: {
              ...state.monitoring,
              channels: [...state.monitoring.channels, data.data]
            }
          }));
        }
      } catch (error) {
        console.error('Failed to create notification channel:', error);
        throw error;
      }
    },

    updateNotificationChannel: async (id, updates) => {
      try {
        const response = await fetch(`/api/v1/monitoring/notifications/channels/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        const data = await response.json();
        if (data.success) {
          set((state) => ({
            monitoring: {
              ...state.monitoring,
              channels: state.monitoring.channels.map(channel =>
                channel.id === id ? { ...channel, ...data.data } : channel
              )
            }
          }));
        }
      } catch (error) {
        console.error('Failed to update notification channel:', error);
        throw error;
      }
    },

    deleteNotificationChannel: async (id) => {
      try {
        const response = await fetch(`/api/v1/monitoring/notifications/channels/${id}`, {
          method: 'DELETE',
        });
        const data = await response.json();
        if (data.success) {
          set((state) => ({
            monitoring: {
              ...state.monitoring,
              channels: state.monitoring.channels.filter(channel => channel.id !== id)
            }
          }));
        }
      } catch (error) {
        console.error('Failed to delete notification channel:', error);
        throw error;
      }
    },

    fetchNotificationChannels: async () => {
      try {
        const response = await fetch('/api/v1/monitoring/notifications/channels');
        const data = await response.json();
        if (data.success) {
          set((state) => ({
            monitoring: { ...state.monitoring, channels: data.data }
          }));
        }
      } catch (error) {
        console.error('Failed to fetch notification channels:', error);
      }
    },

    // Circuit Breaker actions
    fetchCircuitBreakers: async () => {
      set((state) => ({ circuitBreakers: { ...state.circuitBreakers, isLoading: true } }));
      try {
        const response = await fetch('/api/v1/circuit-breakers');
        const data = await response.json();
        if (data.success) {
          set((state) => ({
            circuitBreakers: { ...state.circuitBreakers, breakers: data.data, isLoading: false }
          }));
        }
      } catch (error) {
        console.error('Failed to fetch circuit breakers:', error);
        set((state) => ({ circuitBreakers: { ...state.circuitBreakers, isLoading: false } }));
      }
    },

    createCircuitBreaker: async (breakerData) => {
      try {
        const response = await fetch('/api/v1/circuit-breakers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(breakerData),
        });
        const data = await response.json();
        if (data.success) {
          set((state) => ({
            circuitBreakers: {
              ...state.circuitBreakers,
              breakers: [...state.circuitBreakers.breakers, data.data]
            }
          }));
        }
      } catch (error) {
        console.error('Failed to create circuit breaker:', error);
        throw error;
      }
    },

    updateCircuitBreaker: async (name, updates) => {
      try {
        const response = await fetch(`/api/v1/circuit-breakers/${name}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        const data = await response.json();
        if (data.success) {
          set((state) => ({
            circuitBreakers: {
              ...state.circuitBreakers,
              breakers: state.circuitBreakers.breakers.map(breaker =>
                breaker.name === name ? { ...breaker, ...data.data } : breaker
              )
            }
          }));
        }
      } catch (error) {
        console.error('Failed to update circuit breaker:', error);
        throw error;
      }
    },

    resetCircuitBreaker: async (name) => {
      try {
        const response = await fetch(`/api/v1/circuit-breakers/${name}/reset`, {
          method: 'POST',
        });
        const data = await response.json();
        if (data.success) {
          set((state) => ({
            circuitBreakers: {
              ...state.circuitBreakers,
              breakers: state.circuitBreakers.breakers.map(breaker =>
                breaker.name === name ? { ...breaker, ...data.data } : breaker
              )
            }
          }));
        }
      } catch (error) {
        console.error('Failed to reset circuit breaker:', error);
        throw error;
      }
    },

    fetchCircuitBreakerMetrics: async (name) => {
      try {
        const response = await fetch(`/api/v1/circuit-breakers/${name}/metrics`);
        const data = await response.json();
        if (data.success) {
          set((state) => ({
            circuitBreakers: {
              ...state.circuitBreakers,
              metrics: { ...state.circuitBreakers.metrics, [name]: data.data }
            }
          }));
        }
      } catch (error) {
        console.error('Failed to fetch circuit breaker metrics:', error);
      }
    },

    // Security actions
    fetchSecurityScans: async () => {
      set((state) => ({ security: { ...state.security, isLoading: true } }));
      try {
        const response = await fetch('/api/v1/security/scans');
        const data = await response.json();
        if (data.success) {
          set((state) => ({
            security: { ...state.security, scans: data.data, isLoading: false }
          }));
        }
      } catch (error) {
        console.error('Failed to fetch security scans:', error);
        set((state) => ({ security: { ...state.security, isLoading: false } }));
      }
    },

    createSecurityScan: async (scanData) => {
      try {
        const response = await fetch('/api/v1/security/scans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(scanData),
        });
        const data = await response.json();
        if (data.success) {
          set((state) => ({
            security: {
              ...state.security,
              scans: [...state.security.scans, data.data]
            }
          }));
        }
      } catch (error) {
        console.error('Failed to create security scan:', error);
        throw error;
      }
    },

    cancelSecurityScan: async (id) => {
      try {
        const response = await fetch(`/api/v1/security/scans/${id}`, {
          method: 'DELETE',
        });
        const data = await response.json();
        if (data.success) {
          set((state) => ({
            security: {
              ...state.security,
              scans: state.security.scans.map(scan =>
                scan.id === id ? { ...scan, status: 'cancelled' as const } : scan
              )
            }
          }));
        }
      } catch (error) {
        console.error('Failed to cancel security scan:', error);
        throw error;
      }
    },

    fetchVulnerabilities: async () => {
      try {
        const response = await fetch('/api/v1/security/vulnerabilities');
        const data = await response.json();
        if (data.success) {
          set((state) => ({
            security: { ...state.security, vulnerabilities: data.data }
          }));
        }
      } catch (error) {
        console.error('Failed to fetch vulnerabilities:', error);
      }
    },

    updateVulnerabilityStatus: async (id, status) => {
      try {
        const response = await fetch(`/api/v1/security/vulnerabilities/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
        const data = await response.json();
        if (data.success) {
          set((state) => ({
            security: {
              ...state.security,
              vulnerabilities: state.security.vulnerabilities.map(vuln =>
                vuln.id === id ? { ...vuln, status } : vuln
              )
            }
          }));
        }
      } catch (error) {
        console.error('Failed to update vulnerability status:', error);
        throw error;
      }
    },

    // WebSocket actions (placeholder - would need actual WebSocket implementation)
    connectWebSocket: () => {
      // TODO: Implement WebSocket connection
    },

    disconnectWebSocket: () => {
      // TODO: Implement WebSocket disconnection
    },

    handleWebSocketEvent: (event) => {
      // TODO: Handle incoming WebSocket events
      console.log('WebSocket event received:', event);
    },

    // Utility actions
    setLoading: (section, loading) => {
      set((state) => ({
        [section]: { ...state[section], isLoading: loading }
      }));
    },

    reset: () => {
      set({
        temporal: { connections: [], workflows: [], selectedConnection: undefined, isLoading: false },
        apiKeys: { keys: [], usage: {}, rotationSchedule: [], isLoading: false },
        monitoring: { metrics: {}, alerts: [], channels: [], dashboards: [], realTimeData: {}, isLoading: false },
        circuitBreakers: { breakers: [], metrics: {}, isLoading: false },
        security: { scans: [], vulnerabilities: [], compliance: [], isLoading: false },
      });
    },
  }))
);

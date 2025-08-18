/**
 * Infrastructure Management Store
 * Zustand store for managing health monitoring, workflows, and system state
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { devtools } from 'zustand/middleware';
import {
  HealthStore,
  WorkflowStore,
  LoadTestStore,
  DRStore,
  AlertStore,
  HealthResponse,
  WorkflowExecution,
  LoadTestResult,
  BackupStatus,
  AlertMessage,
  LoadTestScenario,
  WorkflowInput,
  LoadTestRealTimeMetrics,
  DRDrill,
  RestorePoint,
  FailoverStatus,
  DRMetrics,
  WorkflowMetrics,
} from '@/lib/types/infrastructure';

// ===== HEALTH MONITORING STORE =====

interface HealthStoreActions {
  updateHealth: (health: HealthResponse) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addHealthMetric: (metric: { timestamp: string; responseTime: number; status: string }) => void;
  toggleAutoRefresh: () => void;
  setRefreshInterval: (interval: number) => void;
  clearHealthHistory: () => void;
}

export const useHealthStore = create<HealthStore & HealthStoreActions>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // State
      currentHealth: null,
      healthHistory: {
        responseTime: [],
        timestamp: [],
        status: [],
      },
      isLoading: false,
      error: null,
      lastUpdate: null,
      autoRefresh: true,
      refreshInterval: 30000, // 30 seconds

      // Actions
      updateHealth: (health) => {
        set({
          currentHealth: health,
          lastUpdate: new Date().toISOString(),
          error: null,
        });

        // Add to history (keep last 100 points)
        const { healthHistory } = get();
        const newHistory = {
          responseTime: [...healthHistory.responseTime, health.summary.total > 0
            ? Object.values(health.checks).reduce((sum, check) => sum + check.responseTime, 0) / health.summary.total
            : 0].slice(-100),
          timestamp: [...healthHistory.timestamp, health.timestamp].slice(-100),
          status: [...healthHistory.status, health.status].slice(-100),
        };

        set({ healthHistory: newHistory });
      },

      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),

      addHealthMetric: (metric) => {
        const { healthHistory } = get();
        set({
          healthHistory: {
            responseTime: [...healthHistory.responseTime, metric.responseTime].slice(-100),
            timestamp: [...healthHistory.timestamp, metric.timestamp].slice(-100),
            status: [...healthHistory.status, metric.status as any].slice(-100),
          },
        });
      },

      toggleAutoRefresh: () => set((state) => ({ autoRefresh: !state.autoRefresh })),
      setRefreshInterval: (interval) => set({ refreshInterval: interval }),
      clearHealthHistory: () => set({
        healthHistory: { responseTime: [], timestamp: [], status: [] }
      }),
    })),
    { name: 'health-store' }
  )
);

// ===== WORKFLOW MANAGEMENT STORE =====

interface WorkflowStoreActions {
  addExecution: (execution: WorkflowExecution) => void;
  updateExecution: (id: string, updates: Partial<WorkflowExecution>) => void;
  setActiveExecution: (execution: WorkflowExecution | null) => void;
  setExecuting: (isExecuting: boolean) => void;
  updateMetrics: (metrics: WorkflowMetrics) => void;
  setFilters: (filters: Partial<WorkflowStore['filters']>) => void;
  clearExecutions: () => void;
  getExecutionById: (id: string) => WorkflowExecution | undefined;
}

export const useWorkflowStore = create<WorkflowStore & WorkflowStoreActions>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // State
      executions: [],
      activeExecution: null,
      metrics: null,
      isExecuting: false,
      executionHistory: [],
      filters: {},

      // Actions
      addExecution: (execution) => {
        set((state) => ({
          executions: [execution, ...state.executions].slice(0, 1000), // Keep last 1000
          executionHistory: [execution, ...state.executionHistory].slice(0, 1000),
        }));
      },

      updateExecution: (id, updates) => {
        set((state) => ({
          executions: state.executions.map((exec) =>
            exec.id === id ? { ...exec, ...updates } : exec
          ),
          executionHistory: state.executionHistory.map((exec) =>
            exec.id === id ? { ...exec, ...updates } : exec
          ),
          activeExecution: state.activeExecution?.id === id
            ? { ...state.activeExecution, ...updates }
            : state.activeExecution,
        }));
      },

      setActiveExecution: (execution) => set({ activeExecution: execution }),
      setExecuting: (isExecuting) => set({ isExecuting }),
      updateMetrics: (metrics) => set({ metrics }),
      setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
      clearExecutions: () => set({ executions: [], executionHistory: [], activeExecution: null }),

      getExecutionById: (id) => {
        const { executions } = get();
        return executions.find((exec) => exec.id === id);
      },
    })),
    { name: 'workflow-store' }
  )
);

// ===== LOAD TESTING STORE =====

interface LoadTestStoreActions {
  addScenario: (scenario: LoadTestScenario) => void;
  updateScenario: (id: string, updates: Partial<LoadTestScenario>) => void;
  deleteScenario: (id: string) => void;
  setActiveTest: (test: LoadTestResult | null) => void;
  addTestResult: (result: LoadTestResult) => void;
  updateTestResult: (id: string, updates: Partial<LoadTestResult>) => void;
  setRealTimeMetrics: (metrics: LoadTestRealTimeMetrics | null) => void;
  setRunning: (isRunning: boolean) => void;
  clearTestHistory: () => void;
}

export const useLoadTestStore = create<LoadTestStore & LoadTestStoreActions>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // State
      scenarios: [],
      activeTest: null,
      testHistory: [],
      realTimeMetrics: null,
      isRunning: false,

      // Actions
      addScenario: (scenario) => {
        set((state) => ({
          scenarios: [...state.scenarios, scenario],
        }));
      },

      updateScenario: (id, updates) => {
        set((state) => ({
          scenarios: state.scenarios.map((scenario) =>
            scenario.id === id ? { ...scenario, ...updates } : scenario
          ),
        }));
      },

      deleteScenario: (id) => {
        set((state) => ({
          scenarios: state.scenarios.filter((scenario) => scenario.id !== id),
        }));
      },

      setActiveTest: (test) => set({ activeTest: test }),

      addTestResult: (result) => {
        set((state) => ({
          testHistory: [result, ...state.testHistory].slice(0, 100), // Keep last 100
        }));
      },

      updateTestResult: (id, updates) => {
        set((state) => ({
          testHistory: state.testHistory.map((result) =>
            result.id === id ? { ...result, ...updates } : result
          ),
          activeTest: state.activeTest?.id === id
            ? { ...state.activeTest, ...updates }
            : state.activeTest,
        }));
      },

      setRealTimeMetrics: (metrics) => set({ realTimeMetrics: metrics }),
      setRunning: (isRunning) => set({ isRunning }),
      clearTestHistory: () => set({ testHistory: [], activeTest: null }),
    })),
    { name: 'load-test-store' }
  )
);

// ===== DISASTER RECOVERY STORE =====

interface DRStoreActions {
  updateBackupStatus: (backups: BackupStatus[]) => void;
  addBackup: (backup: BackupStatus) => void;
  updateBackup: (id: string, updates: Partial<BackupStatus>) => void;
  updateRestorePoints: (points: RestorePoint[]) => void;
  updateFailoverStatus: (status: FailoverStatus) => void;
  updateMetrics: (metrics: DRMetrics) => void;
  addDrill: (drill: DRDrill) => void;
  updateDrill: (id: string, updates: Partial<DRDrill>) => void;
  setRestoring: (isRestoring: boolean) => void;
}

export const useDRStore = create<DRStore & DRStoreActions>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // State
      backupStatus: [],
      restorePoints: [],
      failoverStatus: {
        primaryRegion: 'us-east-1',
        secondaryRegion: 'us-west-2',
        status: 'active',
        healthChecks: {
          primary: true,
          secondary: true,
        },
      },
      metrics: {
        rto: 15, // 15 minutes
        rpo: 5,  // 5 minutes
        lastSuccessfulBackup: new Date().toISOString(),
        backupFrequency: 'hourly',
        replicationLag: 2, // 2 seconds
      },
      drills: [],
      isRestoring: false,

      // Actions
      updateBackupStatus: (backups) => set({ backupStatus: backups }),

      addBackup: (backup) => {
        set((state) => ({
          backupStatus: [backup, ...state.backupStatus].slice(0, 100),
        }));
      },

      updateBackup: (id, updates) => {
        set((state) => ({
          backupStatus: state.backupStatus.map((backup) =>
            backup.id === id ? { ...backup, ...updates } : backup
          ),
        }));
      },

      updateRestorePoints: (points) => set({ restorePoints: points }),
      updateFailoverStatus: (status) => set({ failoverStatus: status }),
      updateMetrics: (metrics) => set({ metrics }),

      addDrill: (drill) => {
        set((state) => ({
          drills: [drill, ...state.drills].slice(0, 50),
        }));
      },

      updateDrill: (id, updates) => {
        set((state) => ({
          drills: state.drills.map((drill) =>
            drill.id === id ? { ...drill, ...updates } : drill
          ),
        }));
      },

      setRestoring: (isRestoring) => set({ isRestoring }),
    })),
    { name: 'dr-store' }
  )
);

// ===== ALERT MANAGEMENT STORE =====

interface AlertStoreActions {
  addAlert: (alert: AlertMessage) => void;
  acknowledgeAlert: (id: string) => void;
  removeAlert: (id: string) => void;
  setFilters: (filters: Partial<AlertStore['filters']>) => void;
  clearAlerts: () => void;
  markAllAsRead: () => void;
}

export const useAlertStore = create<AlertStore & AlertStoreActions>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // State
      alerts: [],
      unreadCount: 0,
      filters: {},

      // Actions
      addAlert: (alert) => {
        set((state) => ({
          alerts: [alert, ...state.alerts].slice(0, 500), // Keep last 500
          unreadCount: alert.acknowledged ? state.unreadCount : state.unreadCount + 1,
        }));
      },

      acknowledgeAlert: (id) => {
        set((state) => ({
          alerts: state.alerts.map((alert) =>
            alert.id === id ? { ...alert, acknowledged: true } : alert
          ),
          unreadCount: Math.max(0, state.unreadCount - 1),
        }));
      },

      removeAlert: (id) => {
        set((state) => {
          const alertToRemove = state.alerts.find((alert) => alert.id === id);
          return {
            alerts: state.alerts.filter((alert) => alert.id !== id),
            unreadCount: alertToRemove && !alertToRemove.acknowledged
              ? Math.max(0, state.unreadCount - 1)
              : state.unreadCount,
          };
        });
      },

      setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
      clearAlerts: () => set({ alerts: [], unreadCount: 0 }),
      markAllAsRead: () => set((state) => ({
        alerts: state.alerts.map((alert) => ({ ...alert, acknowledged: true })),
        unreadCount: 0,
      })),
    })),
    { name: 'alert-store' }
  )
);

// ===== COMBINED INFRASTRUCTURE STORE =====

interface InfrastructureStoreActions {
  initializeStores: () => void;
  resetAllStores: () => void;
}

export const useInfrastructureStore = create<InfrastructureStoreActions>()(
  devtools((set, get) => ({
    initializeStores: () => {
      // Initialize all stores with default data
      console.log('Initializing infrastructure stores...');
    },

    resetAllStores: () => {
      useHealthStore.getState().clearHealthHistory();
      useWorkflowStore.getState().clearExecutions();
      useLoadTestStore.getState().clearTestHistory();
      useAlertStore.getState().clearAlerts();
    },
  }))
);

// ===== SELECTOR HOOKS =====

// Health selectors
export const useHealthStatus = () => useHealthStore((state) => state.currentHealth?.status);
export const useHealthChecks = () => useHealthStore((state) => state.currentHealth?.checks);
export const useHealthMetrics = () => useHealthStore((state) => state.healthHistory);

// Workflow selectors
export const useActiveWorkflow = () => useWorkflowStore((state) => state.activeExecution);
export const useWorkflowMetrics = () => useWorkflowStore((state) => state.metrics);
export const useRecentExecutions = () => useWorkflowStore((state) =>
  state.executions.slice(0, 10)
);

// Load test selectors
export const useActiveLoadTest = () => useLoadTestStore((state) => state.activeTest);
export const useLoadTestMetrics = () => useLoadTestStore((state) => state.realTimeMetrics);

// DR selectors
export const useBackupStatus = () => useDRStore((state) => state.backupStatus);
export const useFailoverStatus = () => useDRStore((state) => state.failoverStatus);

// Alert selectors
export const useUnreadAlerts = () => useAlertStore((state) => state.unreadCount);
export const useCriticalAlerts = () => useAlertStore((state) =>
  state.alerts.filter((alert) => alert.severity === 'critical').slice(0, 5)
);

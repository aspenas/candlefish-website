/**
 * Dashboard Context for System Analyzer
 *
 * Provides centralized state management for:
 * - Dashboard filters and preferences
 * - Real-time updates
 * - Error handling
 * - Loading states
 */

'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { useSubscription } from '@apollo/client';
import {
  Service,
  Alert,
  SystemAnalysis,
  DashboardFilters,
  ServiceStatus,
  AlertSeverity,
  NotificationMessage,
  ServiceStatusUpdate,
} from '../types/dashboard';
import {
  SERVICE_STATUS_CHANGED,
  ALERT_TRIGGERED,
  ALERT_RESOLVED,
  SYSTEM_ANALYSIS_UPDATED,
} from '../graphql/queries';
import { toast } from 'sonner';

// Dashboard State
interface DashboardState {
  // Data
  services: Service[];
  alerts: Alert[];
  systemAnalysis: SystemAnalysis | null;

  // UI State
  filters: DashboardFilters;
  selectedService: Service | null;
  selectedAlert: Alert | null;

  // Loading States
  loading: {
    services: boolean;
    alerts: boolean;
    analysis: boolean;
    serviceDetails: boolean;
  };

  // Error States
  errors: {
    services: string | null;
    alerts: string | null;
    analysis: string | null;
    serviceDetails: string | null;
  };

  // Real-time State
  isRealTimeEnabled: boolean;
  lastUpdated: string | null;

  // Notifications
  notifications: NotificationMessage[];

  // View State
  view: 'overview' | 'services' | 'alerts' | 'metrics' | 'insights';
  sidebarCollapsed: boolean;
  darkMode: boolean;
}

// Action Types
type DashboardAction =
  // Data Actions
  | { type: 'SET_SERVICES'; payload: Service[] }
  | { type: 'SET_ALERTS'; payload: Alert[] }
  | { type: 'SET_SYSTEM_ANALYSIS'; payload: SystemAnalysis }
  | { type: 'UPDATE_SERVICE'; payload: Service }
  | { type: 'ADD_ALERT'; payload: Alert }
  | { type: 'UPDATE_ALERT'; payload: Alert }
  | { type: 'REMOVE_ALERT'; payload: string }

  // UI Actions
  | { type: 'SET_FILTERS'; payload: Partial<DashboardFilters> }
  | { type: 'RESET_FILTERS' }
  | { type: 'SELECT_SERVICE'; payload: Service | null }
  | { type: 'SELECT_ALERT'; payload: Alert | null }
  | { type: 'SET_VIEW'; payload: DashboardState['view'] }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'TOGGLE_DARK_MODE' }
  | { type: 'SET_SIDEBAR_COLLAPSED'; payload: boolean }

  // Loading Actions
  | { type: 'SET_LOADING'; payload: { key: keyof DashboardState['loading']; loading: boolean } }
  | { type: 'SET_ERROR'; payload: { key: keyof DashboardState['errors']; error: string | null } }

  // Real-time Actions
  | { type: 'TOGGLE_REAL_TIME' }
  | { type: 'SET_LAST_UPDATED'; payload: string }
  | { type: 'SERVICE_STATUS_UPDATE'; payload: ServiceStatusUpdate }

  // Notification Actions
  | { type: 'ADD_NOTIFICATION'; payload: NotificationMessage }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'CLEAR_NOTIFICATIONS' };

// Initial State
const initialState: DashboardState = {
  services: [],
  alerts: [],
  systemAnalysis: null,
  filters: {},
  selectedService: null,
  selectedAlert: null,
  loading: {
    services: false,
    alerts: false,
    analysis: false,
    serviceDetails: false,
  },
  errors: {
    services: null,
    alerts: null,
    analysis: null,
    serviceDetails: null,
  },
  isRealTimeEnabled: true,
  lastUpdated: null,
  notifications: [],
  view: 'overview',
  sidebarCollapsed: false,
  darkMode: typeof window !== 'undefined' ? localStorage.getItem('darkMode') === 'true' : false,
};

// Reducer
function dashboardReducer(state: DashboardState, action: DashboardAction): DashboardState {
  switch (action.type) {
    case 'SET_SERVICES':
      return {
        ...state,
        services: action.payload,
        loading: { ...state.loading, services: false },
        errors: { ...state.errors, services: null },
        lastUpdated: new Date().toISOString(),
      };

    case 'SET_ALERTS':
      return {
        ...state,
        alerts: action.payload,
        loading: { ...state.loading, alerts: false },
        errors: { ...state.errors, alerts: null },
        lastUpdated: new Date().toISOString(),
      };

    case 'SET_SYSTEM_ANALYSIS':
      return {
        ...state,
        systemAnalysis: action.payload,
        loading: { ...state.loading, analysis: false },
        errors: { ...state.errors, analysis: null },
        lastUpdated: new Date().toISOString(),
      };

    case 'UPDATE_SERVICE':
      return {
        ...state,
        services: state.services.map(service =>
          service.id === action.payload.id ? action.payload : service
        ),
        selectedService: state.selectedService?.id === action.payload.id ? action.payload : state.selectedService,
        lastUpdated: new Date().toISOString(),
      };

    case 'ADD_ALERT':
      return {
        ...state,
        alerts: [action.payload, ...state.alerts],
        lastUpdated: new Date().toISOString(),
      };

    case 'UPDATE_ALERT':
      return {
        ...state,
        alerts: state.alerts.map(alert =>
          alert.id === action.payload.id ? action.payload : alert
        ),
        selectedAlert: state.selectedAlert?.id === action.payload.id ? action.payload : state.selectedAlert,
        lastUpdated: new Date().toISOString(),
      };

    case 'REMOVE_ALERT':
      return {
        ...state,
        alerts: state.alerts.filter(alert => alert.id !== action.payload),
        selectedAlert: state.selectedAlert?.id === action.payload ? null : state.selectedAlert,
        lastUpdated: new Date().toISOString(),
      };

    case 'SET_FILTERS':
      return {
        ...state,
        filters: { ...state.filters, ...action.payload },
      };

    case 'RESET_FILTERS':
      return {
        ...state,
        filters: {},
      };

    case 'SELECT_SERVICE':
      return {
        ...state,
        selectedService: action.payload,
      };

    case 'SELECT_ALERT':
      return {
        ...state,
        selectedAlert: action.payload,
      };

    case 'SET_VIEW':
      return {
        ...state,
        view: action.payload,
      };

    case 'TOGGLE_SIDEBAR':
      return {
        ...state,
        sidebarCollapsed: !state.sidebarCollapsed,
      };

    case 'SET_SIDEBAR_COLLAPSED':
      return {
        ...state,
        sidebarCollapsed: action.payload,
      };

    case 'TOGGLE_DARK_MODE':
      const newDarkMode = !state.darkMode;
      if (typeof window !== 'undefined') {
        localStorage.setItem('darkMode', newDarkMode.toString());
        document.documentElement.classList.toggle('dark', newDarkMode);
      }
      return {
        ...state,
        darkMode: newDarkMode,
      };

    case 'SET_LOADING':
      return {
        ...state,
        loading: { ...state.loading, [action.payload.key]: action.payload.loading },
      };

    case 'SET_ERROR':
      return {
        ...state,
        errors: { ...state.errors, [action.payload.key]: action.payload.error },
      };

    case 'TOGGLE_REAL_TIME':
      return {
        ...state,
        isRealTimeEnabled: !state.isRealTimeEnabled,
      };

    case 'SET_LAST_UPDATED':
      return {
        ...state,
        lastUpdated: action.payload,
      };

    case 'SERVICE_STATUS_UPDATE':
      return {
        ...state,
        services: state.services.map(service =>
          service.id === action.payload.service.id
            ? { ...service, status: action.payload.currentStatus }
            : service
        ),
        lastUpdated: new Date().toISOString(),
      };

    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications.slice(0, 4)], // Keep max 5 notifications
      };

    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload),
      };

    case 'CLEAR_NOTIFICATIONS':
      return {
        ...state,
        notifications: [],
      };

    default:
      return state;
  }
}

// Context
interface DashboardContextType {
  state: DashboardState;
  dispatch: React.Dispatch<DashboardAction>;

  // Helper functions
  setServices: (services: Service[]) => void;
  setAlerts: (alerts: Alert[]) => void;
  setSystemAnalysis: (analysis: SystemAnalysis) => void;
  updateService: (service: Service) => void;
  addAlert: (alert: Alert) => void;
  updateAlert: (alert: Alert) => void;
  removeAlert: (alertId: string) => void;
  setFilters: (filters: Partial<DashboardFilters>) => void;
  resetFilters: () => void;
  selectService: (service: Service | null) => void;
  selectAlert: (alert: Alert | null) => void;
  setView: (view: DashboardState['view']) => void;
  toggleSidebar: () => void;
  toggleDarkMode: () => void;
  setLoading: (key: keyof DashboardState['loading'], loading: boolean) => void;
  setError: (key: keyof DashboardState['errors'], error: string | null) => void;
  toggleRealTime: () => void;
  addNotification: (notification: Omit<NotificationMessage, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

// Provider
interface DashboardProviderProps {
  children: ReactNode;
}

export function DashboardProvider({ children }: DashboardProviderProps) {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);

  // Real-time subscriptions
  useSubscription(SERVICE_STATUS_CHANGED, {
    skip: !state.isRealTimeEnabled,
    onData: ({ data }) => {
      if (data.data?.serviceStatusChanged) {
        dispatch({ type: 'SERVICE_STATUS_UPDATE', payload: data.data.serviceStatusChanged });

        // Show notification for status changes
        const update = data.data.serviceStatusChanged;
        const notification: Omit<NotificationMessage, 'id' | 'timestamp'> = {
          type: update.currentStatus === ServiceStatus.HEALTHY ? 'success' : 'warning',
          title: 'Service Status Changed',
          message: `${update.service.displayName || update.service.name} is now ${update.currentStatus.toLowerCase()}`,
          dismissible: true,
        };
        addNotification(notification);
      }
    },
  });

  useSubscription(ALERT_TRIGGERED, {
    skip: !state.isRealTimeEnabled,
    onData: ({ data }) => {
      if (data.data?.alertTriggered) {
        dispatch({ type: 'ADD_ALERT', payload: data.data.alertTriggered });

        // Show toast notification for new alerts
        const alert = data.data.alertTriggered;
        toast.error(`${alert.severity} Alert: ${alert.name}`, {
          description: alert.description,
          duration: alert.severity === AlertSeverity.CRITICAL ? 0 : 5000, // Critical alerts don't auto-dismiss
        });
      }
    },
  });

  useSubscription(ALERT_RESOLVED, {
    skip: !state.isRealTimeEnabled,
    onData: ({ data }) => {
      if (data.data?.alertResolved) {
        dispatch({ type: 'UPDATE_ALERT', payload: data.data.alertResolved });

        // Show success toast
        const alert = data.data.alertResolved;
        toast.success(`Alert Resolved: ${alert.name}`);
      }
    },
  });

  useSubscription(SYSTEM_ANALYSIS_UPDATED, {
    skip: !state.isRealTimeEnabled,
    onData: ({ data }) => {
      if (data.data?.systemAnalysisUpdated) {
        dispatch({ type: 'SET_SYSTEM_ANALYSIS', payload: data.data.systemAnalysisUpdated });
      }
    },
  });

  // Initialize dark mode
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.classList.toggle('dark', state.darkMode);
    }
  }, []);

  // Helper functions
  const setServices = (services: Service[]) =>
    dispatch({ type: 'SET_SERVICES', payload: services });

  const setAlerts = (alerts: Alert[]) =>
    dispatch({ type: 'SET_ALERTS', payload: alerts });

  const setSystemAnalysis = (analysis: SystemAnalysis) =>
    dispatch({ type: 'SET_SYSTEM_ANALYSIS', payload: analysis });

  const updateService = (service: Service) =>
    dispatch({ type: 'UPDATE_SERVICE', payload: service });

  const addAlert = (alert: Alert) =>
    dispatch({ type: 'ADD_ALERT', payload: alert });

  const updateAlert = (alert: Alert) =>
    dispatch({ type: 'UPDATE_ALERT', payload: alert });

  const removeAlert = (alertId: string) =>
    dispatch({ type: 'REMOVE_ALERT', payload: alertId });

  const setFilters = (filters: Partial<DashboardFilters>) =>
    dispatch({ type: 'SET_FILTERS', payload: filters });

  const resetFilters = () =>
    dispatch({ type: 'RESET_FILTERS' });

  const selectService = (service: Service | null) =>
    dispatch({ type: 'SELECT_SERVICE', payload: service });

  const selectAlert = (alert: Alert | null) =>
    dispatch({ type: 'SELECT_ALERT', payload: alert });

  const setView = (view: DashboardState['view']) =>
    dispatch({ type: 'SET_VIEW', payload: view });

  const toggleSidebar = () =>
    dispatch({ type: 'TOGGLE_SIDEBAR' });

  const toggleDarkMode = () =>
    dispatch({ type: 'TOGGLE_DARK_MODE' });

  const setLoading = (key: keyof DashboardState['loading'], loading: boolean) =>
    dispatch({ type: 'SET_LOADING', payload: { key, loading } });

  const setError = (key: keyof DashboardState['errors'], error: string | null) =>
    dispatch({ type: 'SET_ERROR', payload: { key, error } });

  const toggleRealTime = () =>
    dispatch({ type: 'TOGGLE_REAL_TIME' });

  const addNotification = (notification: Omit<NotificationMessage, 'id' | 'timestamp'>) => {
    const fullNotification: NotificationMessage = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_NOTIFICATION', payload: fullNotification });
  };

  const removeNotification = (id: string) =>
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });

  const clearNotifications = () =>
    dispatch({ type: 'CLEAR_NOTIFICATIONS' });

  const value: DashboardContextType = {
    state,
    dispatch,
    setServices,
    setAlerts,
    setSystemAnalysis,
    updateService,
    addAlert,
    updateAlert,
    removeAlert,
    setFilters,
    resetFilters,
    selectService,
    selectAlert,
    setView,
    toggleSidebar,
    toggleDarkMode,
    setLoading,
    setError,
    toggleRealTime,
    addNotification,
    removeNotification,
    clearNotifications,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

// Hook
export function useDashboard(): DashboardContextType {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}

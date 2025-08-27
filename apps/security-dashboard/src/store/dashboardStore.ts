import { create } from 'zustand';
import { 
  EventFilter, 
  ThreatFilter, 
  IncidentFilter, 
  ConnectionStatus 
} from '../types/security';

interface DashboardState {
  // Filters
  eventFilter: EventFilter;
  threatFilter: ThreatFilter;
  incidentFilter: IncidentFilter;
  
  // UI State
  sidebarOpen: boolean;
  selectedView: string;
  refreshInterval: number;
  
  // Real-time connection
  connectionStatus: ConnectionStatus;
  
  // Loading states
  isLoading: {
    events: boolean;
    threats: boolean;
    incidents: boolean;
    metrics: boolean;
  };
  
  // Actions
  setEventFilter: (filter: Partial<EventFilter>) => void;
  setThreatFilter: (filter: Partial<ThreatFilter>) => void;
  setIncidentFilter: (filter: Partial<IncidentFilter>) => void;
  clearAllFilters: () => void;
  
  setSidebarOpen: (open: boolean) => void;
  setSelectedView: (view: string) => void;
  setRefreshInterval: (interval: number) => void;
  
  setConnectionStatus: (status: ConnectionStatus) => void;
  setLoading: (section: keyof DashboardState['isLoading'], loading: boolean) => void;
}

const initialEventFilter: EventFilter = {};
const initialThreatFilter: ThreatFilter = {};
const initialIncidentFilter: IncidentFilter = {};

const initialConnectionStatus: ConnectionStatus = {
  connected: false,
  reconnecting: false,
};

export const useDashboardStore = create<DashboardState>()((set, get) => ({
  // Initial state
  eventFilter: initialEventFilter,
  threatFilter: initialThreatFilter,
  incidentFilter: initialIncidentFilter,
  
  sidebarOpen: true,
  selectedView: 'overview',
  refreshInterval: 30000, // 30 seconds
  
  connectionStatus: initialConnectionStatus,
  
  isLoading: {
    events: false,
    threats: false,
    incidents: false,
    metrics: false,
  },

  // Filter actions
  setEventFilter: (filter: Partial<EventFilter>) => {
    set((state) => ({
      eventFilter: { ...state.eventFilter, ...filter }
    }));
  },

  setThreatFilter: (filter: Partial<ThreatFilter>) => {
    set((state) => ({
      threatFilter: { ...state.threatFilter, ...filter }
    }));
  },

  setIncidentFilter: (filter: Partial<IncidentFilter>) => {
    set((state) => ({
      incidentFilter: { ...state.incidentFilter, ...filter }
    }));
  },

  clearAllFilters: () => {
    set({
      eventFilter: initialEventFilter,
      threatFilter: initialThreatFilter,
      incidentFilter: initialIncidentFilter,
    });
  },

  // UI actions
  setSidebarOpen: (sidebarOpen: boolean) => {
    set({ sidebarOpen });
  },

  setSelectedView: (selectedView: string) => {
    set({ selectedView });
  },

  setRefreshInterval: (refreshInterval: number) => {
    set({ refreshInterval });
  },

  // Connection actions
  setConnectionStatus: (connectionStatus: ConnectionStatus) => {
    set({ connectionStatus });
  },

  setLoading: (section: keyof DashboardState['isLoading'], loading: boolean) => {
    set((state) => ({
      isLoading: {
        ...state.isLoading,
        [section]: loading,
      }
    }));
  },
}));
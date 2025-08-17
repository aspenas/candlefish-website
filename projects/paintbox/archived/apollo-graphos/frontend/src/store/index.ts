import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type {
  Customer,
  Project,
  Estimate,
  Integration,
  LoadingState,
  ErrorState,
} from '@/types/graphql';

// UI State
interface UIState {
  sidebarOpen: boolean;
  currentView: string;
  selectedCustomerId?: string;
  selectedProjectId?: string;
  selectedEstimateId?: string;
  showMobileMenu: boolean;
  activeTab: string;
  searchQuery: string;
  filters: Record<string, any>;
  notifications: Notification[];
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  actions?: NotificationAction[];
}

interface NotificationAction {
  label: string;
  action: () => void;
  variant?: 'primary' | 'secondary';
}

// Real-time updates state
interface RealtimeState {
  connectedSubscriptions: Set<string>;
  subscriptionErrors: Record<string, string>;
  lastUpdateTimestamp: Record<string, number>;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
}

// Form state
interface FormState {
  estimateForm: {
    isOpen: boolean;
    mode: 'create' | 'edit';
    data: Partial<Estimate>;
    errors: Record<string, string>;
  };
  customerForm: {
    isOpen: boolean;
    mode: 'create' | 'edit';
    data: Partial<Customer>;
    errors: Record<string, string>;
  };
  projectForm: {
    isOpen: boolean;
    mode: 'create' | 'edit';
    data: Partial<Project>;
    errors: Record<string, string>;
  };
}

// Main store interface
interface AppStore {
  // UI State
  ui: UIState;
  loading: LoadingState;
  errors: ErrorState;
  realtime: RealtimeState;
  forms: FormState;

  // Actions - UI
  setSidebarOpen: (open: boolean) => void;
  setCurrentView: (view: string) => void;
  setSelectedCustomer: (id?: string) => void;
  setSelectedProject: (id?: string) => void;
  setSelectedEstimate: (id?: string) => void;
  setShowMobileMenu: (show: boolean) => void;
  setActiveTab: (tab: string) => void;
  setSearchQuery: (query: string) => void;
  setFilters: (filters: Record<string, any>) => void;
  clearFilters: () => void;

  // Actions - Loading
  setLoading: (key: keyof LoadingState, loading: boolean) => void;
  setError: (key: keyof ErrorState, error?: string) => void;
  clearError: (key: keyof ErrorState) => void;
  clearAllErrors: () => void;

  // Actions - Notifications
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;

  // Actions - Real-time
  addSubscription: (subscriptionId: string) => void;
  removeSubscription: (subscriptionId: string) => void;
  setSubscriptionError: (subscriptionId: string, error?: string) => void;
  updateLastTimestamp: (entity: string, timestamp: number) => void;
  setConnectionStatus: (status: 'connected' | 'disconnected' | 'reconnecting') => void;

  // Actions - Forms
  openEstimateForm: (mode: 'create' | 'edit', data?: Partial<Estimate>) => void;
  closeEstimateForm: () => void;
  setEstimateFormData: (data: Partial<Estimate>) => void;
  setEstimateFormErrors: (errors: Record<string, string>) => void;

  openCustomerForm: (mode: 'create' | 'edit', data?: Partial<Customer>) => void;
  closeCustomerForm: () => void;
  setCustomerFormData: (data: Partial<Customer>) => void;
  setCustomerFormErrors: (errors: Record<string, string>) => void;

  openProjectForm: (mode: 'create' | 'edit', data?: Partial<Project>) => void;
  closeProjectForm: () => void;
  setProjectFormData: (data: Partial<Project>) => void;
  setProjectFormErrors: (errors: Record<string, string>) => void;

  // Reset functions
  reset: () => void;
}

// Initial state
const initialUIState: UIState = {
  sidebarOpen: true,
  currentView: 'dashboard',
  showMobileMenu: false,
  activeTab: 'overview',
  searchQuery: '',
  filters: {},
  notifications: [],
};

const initialLoadingState: LoadingState = {
  estimates: false,
  customers: false,
  projects: false,
  integrations: false,
  calculations: false,
};

const initialErrorState: ErrorState = {};

const initialRealtimeState: RealtimeState = {
  connectedSubscriptions: new Set(),
  subscriptionErrors: {},
  lastUpdateTimestamp: {},
  connectionStatus: 'disconnected',
};

const initialFormState: FormState = {
  estimateForm: {
    isOpen: false,
    mode: 'create',
    data: {},
    errors: {},
  },
  customerForm: {
    isOpen: false,
    mode: 'create',
    data: {},
    errors: {},
  },
  projectForm: {
    isOpen: false,
    mode: 'create',
    data: {},
    errors: {},
  },
};

// Create store
export const useAppStore = create<AppStore>()(
  devtools(
    immer((set, get) => ({
      // State
      ui: initialUIState,
      loading: initialLoadingState,
      errors: initialErrorState,
      realtime: initialRealtimeState,
      forms: initialFormState,

      // UI Actions
      setSidebarOpen: (open) =>
        set((state) => {
          state.ui.sidebarOpen = open;
        }),

      setCurrentView: (view) =>
        set((state) => {
          state.ui.currentView = view;
        }),

      setSelectedCustomer: (id) =>
        set((state) => {
          state.ui.selectedCustomerId = id;
        }),

      setSelectedProject: (id) =>
        set((state) => {
          state.ui.selectedProjectId = id;
        }),

      setSelectedEstimate: (id) =>
        set((state) => {
          state.ui.selectedEstimateId = id;
        }),

      setShowMobileMenu: (show) =>
        set((state) => {
          state.ui.showMobileMenu = show;
        }),

      setActiveTab: (tab) =>
        set((state) => {
          state.ui.activeTab = tab;
        }),

      setSearchQuery: (query) =>
        set((state) => {
          state.ui.searchQuery = query;
        }),

      setFilters: (filters) =>
        set((state) => {
          state.ui.filters = { ...state.ui.filters, ...filters };
        }),

      clearFilters: () =>
        set((state) => {
          state.ui.filters = {};
        }),

      // Loading Actions
      setLoading: (key, loading) =>
        set((state) => {
          state.loading[key] = loading;
        }),

      setError: (key, error) =>
        set((state) => {
          state.errors[key] = error;
        }),

      clearError: (key) =>
        set((state) => {
          delete state.errors[key];
        }),

      clearAllErrors: () =>
        set((state) => {
          state.errors = {};
        }),

      // Notification Actions
      addNotification: (notification) =>
        set((state) => {
          const id = `notification-${Date.now()}-${Math.random()}`;
          state.ui.notifications.push({
            ...notification,
            id,
            timestamp: Date.now(),
            read: false,
          });
        }),

      markNotificationRead: (id) =>
        set((state) => {
          const notification = state.ui.notifications.find((n) => n.id === id);
          if (notification) {
            notification.read = true;
          }
        }),

      removeNotification: (id) =>
        set((state) => {
          state.ui.notifications = state.ui.notifications.filter((n) => n.id !== id);
        }),

      clearNotifications: () =>
        set((state) => {
          state.ui.notifications = [];
        }),

      // Real-time Actions
      addSubscription: (subscriptionId) =>
        set((state) => {
          state.realtime.connectedSubscriptions.add(subscriptionId);
        }),

      removeSubscription: (subscriptionId) =>
        set((state) => {
          state.realtime.connectedSubscriptions.delete(subscriptionId);
          delete state.realtime.subscriptionErrors[subscriptionId];
        }),

      setSubscriptionError: (subscriptionId, error) =>
        set((state) => {
          if (error) {
            state.realtime.subscriptionErrors[subscriptionId] = error;
          } else {
            delete state.realtime.subscriptionErrors[subscriptionId];
          }
        }),

      updateLastTimestamp: (entity, timestamp) =>
        set((state) => {
          state.realtime.lastUpdateTimestamp[entity] = timestamp;
        }),

      setConnectionStatus: (status) =>
        set((state) => {
          state.realtime.connectionStatus = status;
        }),

      // Form Actions - Estimates
      openEstimateForm: (mode, data) =>
        set((state) => {
          state.forms.estimateForm.isOpen = true;
          state.forms.estimateForm.mode = mode;
          state.forms.estimateForm.data = data || {};
          state.forms.estimateForm.errors = {};
        }),

      closeEstimateForm: () =>
        set((state) => {
          state.forms.estimateForm.isOpen = false;
          state.forms.estimateForm.data = {};
          state.forms.estimateForm.errors = {};
        }),

      setEstimateFormData: (data) =>
        set((state) => {
          state.forms.estimateForm.data = { ...state.forms.estimateForm.data, ...data };
        }),

      setEstimateFormErrors: (errors) =>
        set((state) => {
          state.forms.estimateForm.errors = errors;
        }),

      // Form Actions - Customers
      openCustomerForm: (mode, data) =>
        set((state) => {
          state.forms.customerForm.isOpen = true;
          state.forms.customerForm.mode = mode;
          state.forms.customerForm.data = data || {};
          state.forms.customerForm.errors = {};
        }),

      closeCustomerForm: () =>
        set((state) => {
          state.forms.customerForm.isOpen = false;
          state.forms.customerForm.data = {};
          state.forms.customerForm.errors = {};
        }),

      setCustomerFormData: (data) =>
        set((state) => {
          state.forms.customerForm.data = { ...state.forms.customerForm.data, ...data };
        }),

      setCustomerFormErrors: (errors) =>
        set((state) => {
          state.forms.customerForm.errors = errors;
        }),

      // Form Actions - Projects
      openProjectForm: (mode, data) =>
        set((state) => {
          state.forms.projectForm.isOpen = true;
          state.forms.projectForm.mode = mode;
          state.forms.projectForm.data = data || {};
          state.forms.projectForm.errors = {};
        }),

      closeProjectForm: () =>
        set((state) => {
          state.forms.projectForm.isOpen = false;
          state.forms.projectForm.data = {};
          state.forms.projectForm.errors = {};
        }),

      setProjectFormData: (data) =>
        set((state) => {
          state.forms.projectForm.data = { ...state.forms.projectForm.data, ...data };
        }),

      setProjectFormErrors: (errors) =>
        set((state) => {
          state.forms.projectForm.errors = errors;
        }),

      // Reset
      reset: () =>
        set(() => ({
          ui: initialUIState,
          loading: initialLoadingState,
          errors: initialErrorState,
          realtime: initialRealtimeState,
          forms: initialFormState,
        })),
    })),
    {
      name: 'paintbox-app-store',
    }
  )
);

// Selectors
export const useUIState = () => useAppStore((state) => state.ui);
export const useLoadingState = () => useAppStore((state) => state.loading);
export const useErrorState = () => useAppStore((state) => state.errors);
export const useRealtimeState = () => useAppStore((state) => state.realtime);
export const useFormState = () => useAppStore((state) => state.forms);

// Actions
export const useUIActions = () => useAppStore((state) => ({
  setSidebarOpen: state.setSidebarOpen,
  setCurrentView: state.setCurrentView,
  setSelectedCustomer: state.setSelectedCustomer,
  setSelectedProject: state.setSelectedProject,
  setSelectedEstimate: state.setSelectedEstimate,
  setShowMobileMenu: state.setShowMobileMenu,
  setActiveTab: state.setActiveTab,
  setSearchQuery: state.setSearchQuery,
  setFilters: state.setFilters,
  clearFilters: state.clearFilters,
}));

export const useNotificationActions = () => useAppStore((state) => ({
  addNotification: state.addNotification,
  markNotificationRead: state.markNotificationRead,
  removeNotification: state.removeNotification,
  clearNotifications: state.clearNotifications,
}));

export const useFormActions = () => useAppStore((state) => ({
  openEstimateForm: state.openEstimateForm,
  closeEstimateForm: state.closeEstimateForm,
  setEstimateFormData: state.setEstimateFormData,
  setEstimateFormErrors: state.setEstimateFormErrors,
  openCustomerForm: state.openCustomerForm,
  closeCustomerForm: state.closeCustomerForm,
  setCustomerFormData: state.setCustomerFormData,
  setCustomerFormErrors: state.setCustomerFormErrors,
  openProjectForm: state.openProjectForm,
  closeProjectForm: state.closeProjectForm,
  setProjectFormData: state.setProjectFormData,
  setProjectFormErrors: state.setProjectFormErrors,
}));

import { 
  useQuery, 
  useMutation, 
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions 
} from '@tanstack/react-query';
import { 
  SecurityEvent,
  Threat,
  Incident,
  DashboardMetrics,
  EventFilter,
  ThreatFilter,
  IncidentFilter,
  User,
  LoginRequest,
  LoginResponse,
  ApiResponse,
  PaginatedResponse
} from '../types/security';
import { apiClient } from '../lib/api-client';

// Query Keys
export const queryKeys = {
  events: ['events'] as const,
  eventsPaginated: (filters?: EventFilter, page?: number, limit?: number) => 
    ['events', 'paginated', { filters, page, limit }] as const,
  
  threats: ['threats'] as const,
  threatsPaginated: (filters?: ThreatFilter, page?: number, limit?: number) => 
    ['threats', 'paginated', { filters, page, limit }] as const,
  
  incidents: ['incidents'] as const,
  incidentsPaginated: (filters?: IncidentFilter, page?: number, limit?: number) => 
    ['incidents', 'paginated', { filters, page, limit }] as const,
  
  dashboardMetrics: ['dashboard', 'metrics'] as const,
  complianceReports: ['compliance', 'reports'] as const,
  
  users: ['users'] as const,
  currentUser: ['users', 'me'] as const,
} as const;

// Authentication hooks
export const useLogin = (
  options?: UseMutationOptions<ApiResponse<LoginResponse>, Error, LoginRequest>
) => {
  return useMutation({
    mutationFn: (credentials: LoginRequest) => apiClient.login(credentials),
    ...options,
  });
};

export const useLogout = (
  options?: UseMutationOptions<ApiResponse<void>, Error, void>
) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => apiClient.logout(),
    onSuccess: () => {
      // Clear all cached data on logout
      queryClient.clear();
    },
    ...options,
  });
};

export const useCurrentUser = (
  options?: UseQueryOptions<ApiResponse<User>, Error>
) => {
  return useQuery({
    queryKey: queryKeys.currentUser,
    queryFn: () => apiClient.getCurrentUser(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

// Security Events hooks
export const useEvents = (
  filters?: EventFilter,
  page = 1,
  limit = 20,
  options?: UseQueryOptions<ApiResponse<PaginatedResponse<SecurityEvent>>, Error>
) => {
  return useQuery({
    queryKey: queryKeys.eventsPaginated(filters, page, limit),
    queryFn: () => apiClient.getEvents(filters, page, limit),
    staleTime: 30 * 1000, // 30 seconds
    ...options,
  });
};

export const useCreateEvent = (
  options?: UseMutationOptions<ApiResponse<SecurityEvent>, Error, Partial<SecurityEvent>>
) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (event: Partial<SecurityEvent>) => apiClient.createEvent(event),
    onSuccess: () => {
      // Invalidate events queries to refetch data
      queryClient.invalidateQueries({ queryKey: queryKeys.events });
    },
    ...options,
  });
};

export const useUpdateEventStatus = (
  options?: UseMutationOptions<ApiResponse<SecurityEvent>, Error, { eventId: string; status: string }>
) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ eventId, status }) => apiClient.updateEventStatus(eventId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events });
    },
    ...options,
  });
};

// Threats hooks
export const useThreats = (
  filters?: ThreatFilter,
  page = 1,
  limit = 20,
  options?: UseQueryOptions<ApiResponse<PaginatedResponse<Threat>>, Error>
) => {
  return useQuery({
    queryKey: queryKeys.threatsPaginated(filters, page, limit),
    queryFn: () => apiClient.getThreats(filters, page, limit),
    staleTime: 30 * 1000, // 30 seconds
    ...options,
  });
};

export const useCreateThreat = (
  options?: UseMutationOptions<ApiResponse<Threat>, Error, Partial<Threat>>
) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (threat: Partial<Threat>) => apiClient.createThreat(threat),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.threats });
    },
    ...options,
  });
};

export const useUpdateThreatStatus = (
  options?: UseMutationOptions<ApiResponse<Threat>, Error, { threatId: string; status: string }>
) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ threatId, status }) => apiClient.updateThreatStatus(threatId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.threats });
    },
    ...options,
  });
};

// Incidents hooks
export const useIncidents = (
  filters?: IncidentFilter,
  page = 1,
  limit = 20,
  options?: UseQueryOptions<ApiResponse<PaginatedResponse<Incident>>, Error>
) => {
  return useQuery({
    queryKey: queryKeys.incidentsPaginated(filters, page, limit),
    queryFn: () => apiClient.getIncidents(filters, page, limit),
    staleTime: 30 * 1000, // 30 seconds
    ...options,
  });
};

export const useCreateIncident = (
  options?: UseMutationOptions<ApiResponse<Incident>, Error, Partial<Incident>>
) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (incident: Partial<Incident>) => apiClient.createIncident(incident),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.incidents });
    },
    ...options,
  });
};

export const useUpdateIncidentStatus = (
  options?: UseMutationOptions<ApiResponse<Incident>, Error, { incidentId: string; status: string }>
) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ incidentId, status }) => apiClient.updateIncidentStatus(incidentId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.incidents });
    },
    ...options,
  });
};

export const useAssignIncident = (
  options?: UseMutationOptions<ApiResponse<Incident>, Error, { incidentId: string; userId: string }>
) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ incidentId, userId }) => apiClient.assignIncident(incidentId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.incidents });
    },
    ...options,
  });
};

// Dashboard metrics hooks
export const useDashboardMetrics = (
  options?: UseQueryOptions<ApiResponse<DashboardMetrics>, Error>
) => {
  return useQuery({
    queryKey: queryKeys.dashboardMetrics,
    queryFn: () => apiClient.getDashboardMetrics(),
    staleTime: 10 * 1000, // 10 seconds - frequent updates for dashboard
    refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds
    ...options,
  });
};

// Compliance hooks
export const useComplianceReports = (
  options?: UseQueryOptions<ApiResponse<any>, Error>
) => {
  return useQuery({
    queryKey: queryKeys.complianceReports,
    queryFn: () => apiClient.getComplianceReports(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

// User management hooks
export const useUsers = (
  options?: UseQueryOptions<ApiResponse<User[]>, Error>
) => {
  return useQuery({
    queryKey: queryKeys.users,
    queryFn: () => apiClient.getUsers(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
};

// Custom hook for handling WebSocket real-time updates
export const useRealTimeUpdates = () => {
  const queryClient = useQueryClient();
  
  const startListening = () => {
    apiClient.connectWebSocket((update) => {
      // Handle different types of real-time updates
      switch (update.type) {
        case 'NEW_EVENT':
        case 'THREAT_DETECTED':
          // Invalidate events and threats queries
          queryClient.invalidateQueries({ queryKey: queryKeys.events });
          queryClient.invalidateQueries({ queryKey: queryKeys.threats });
          queryClient.invalidateQueries({ queryKey: queryKeys.dashboardMetrics });
          break;
          
        case 'INCIDENT_CREATED':
        case 'INCIDENT_UPDATED':
          // Invalidate incidents queries
          queryClient.invalidateQueries({ queryKey: queryKeys.incidents });
          queryClient.invalidateQueries({ queryKey: queryKeys.dashboardMetrics });
          break;
          
        case 'METRICS_UPDATED':
          // Invalidate dashboard metrics
          queryClient.invalidateQueries({ queryKey: queryKeys.dashboardMetrics });
          break;
          
        default:
          // For any other updates, refresh dashboard metrics
          queryClient.invalidateQueries({ queryKey: queryKeys.dashboardMetrics });
          break;
      }
    });
  };
  
  const stopListening = () => {
    apiClient.disconnectWebSocket();
  };
  
  const getConnectionStatus = () => {
    return apiClient.getWebSocketStatus();
  };
  
  return {
    startListening,
    stopListening,
    getConnectionStatus,
  };
};
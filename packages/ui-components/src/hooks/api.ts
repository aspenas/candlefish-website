import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ApiResponse, PaginatedResponse, User, Organization, Project } from '@/types'
import { useAuthStore } from '@/stores/auth'
import { useNotify } from '@/stores/notifications'

// Base API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1'

interface RequestConfig extends RequestInit {
  requiresAuth?: boolean
}

// API client with authentication
async function apiClient<T>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<T> {
  const { requiresAuth = true, headers, ...rest } = config
  const token = useAuthStore.getState().token

  const requestHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...headers,
  }

  if (requiresAuth && token) {
    requestHeaders.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: requestHeaders,
    ...rest,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || 'An error occurred')
  }

  return response.json()
}

// Query keys
export const queryKeys = {
  users: ['users'] as const,
  user: (id: string) => ['users', id] as const,
  organizations: ['organizations'] as const,
  organization: (id: string) => ['organizations', id] as const,
  projects: ['projects'] as const,
  project: (id: string) => ['projects', id] as const,
  projectsByOrg: (orgId: string) => ['projects', 'org', orgId] as const,
}

// Authentication hooks
export const useLogin = () => {
  const login = useAuthStore((state) => state.login)
  const notify = useNotify()

  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      return apiClient<ApiResponse<{ user: User; token: string; organization?: Organization }>>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
        requiresAuth: false,
      })
    },
    onSuccess: (data) => {
      if (data.success) {
        login(data.data.user, data.data.token, data.data.organization)
        notify.success('Welcome back!', 'Successfully logged in')
      }
    },
    onError: (error: Error) => {
      notify.error('Login failed', error.message)
    },
  })
}

export const useLogout = () => {
  const logout = useAuthStore((state) => state.logout)
  const queryClient = useQueryClient()
  const notify = useNotify()

  return useMutation({
    mutationFn: async () => {
      return apiClient<ApiResponse>('/auth/logout', { method: 'POST' })
    },
    onSuccess: () => {
      logout()
      queryClient.clear()
      notify.success('Logged out successfully')
    },
    onError: (error: Error) => {
      // Still logout even if API call fails
      logout()
      queryClient.clear()
      notify.warning('Logged out', error.message)
    },
  })
}

// User hooks
export const useCurrentUser = () => {
  const user = useAuthStore((state) => state.user)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  return useQuery({
    queryKey: queryKeys.users,
    queryFn: () => apiClient<ApiResponse<User>>('/auth/me'),
    enabled: isAuthenticated && !user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const useUpdateUser = () => {
  const queryClient = useQueryClient()
  const setUser = useAuthStore((state) => state.setUser)
  const notify = useNotify()

  return useMutation({
    mutationFn: async (userData: Partial<User>) => {
      return apiClient<ApiResponse<User>>('/users/profile', {
        method: 'PATCH',
        body: JSON.stringify(userData),
      })
    },
    onSuccess: (data) => {
      if (data.success) {
        setUser(data.data)
        queryClient.invalidateQueries({ queryKey: queryKeys.users })
        notify.success('Profile updated successfully')
      }
    },
    onError: (error: Error) => {
      notify.error('Failed to update profile', error.message)
    },
  })
}

// Organization hooks
export const useOrganizations = () => {
  return useQuery({
    queryKey: queryKeys.organizations,
    queryFn: () => apiClient<PaginatedResponse<Organization>>('/organizations'),
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

export const useOrganization = (id: string) => {
  return useQuery({
    queryKey: queryKeys.organization(id),
    queryFn: () => apiClient<ApiResponse<Organization>>(`/organizations/${id}`),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const useCreateOrganization = () => {
  const queryClient = useQueryClient()
  const notify = useNotify()

  return useMutation({
    mutationFn: async (orgData: { name: string; description?: string }) => {
      return apiClient<ApiResponse<Organization>>('/organizations', {
        method: 'POST',
        body: JSON.stringify(orgData),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations })
      notify.success('Organization created successfully')
    },
    onError: (error: Error) => {
      notify.error('Failed to create organization', error.message)
    },
  })
}

// Project hooks
export const useProjects = (organizationId?: string) => {
  return useQuery({
    queryKey: organizationId
      ? queryKeys.projectsByOrg(organizationId)
      : queryKeys.projects,
    queryFn: () => {
      const endpoint = organizationId
        ? `/organizations/${organizationId}/projects`
        : '/projects'
      return apiClient<PaginatedResponse<Project>>(endpoint)
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const useProject = (id: string) => {
  return useQuery({
    queryKey: queryKeys.project(id),
    queryFn: () => apiClient<ApiResponse<Project>>(`/projects/${id}`),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const useCreateProject = () => {
  const queryClient = useQueryClient()
  const notify = useNotify()

  return useMutation({
    mutationFn: async (projectData: {
      name: string
      description?: string
      organizationId: string
    }) => {
      return apiClient<ApiResponse<Project>>('/projects', {
        method: 'POST',
        body: JSON.stringify(projectData),
      })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects })
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectsByOrg(variables.organizationId)
      })
      notify.success('Project created successfully')
    },
    onError: (error: Error) => {
      notify.error('Failed to create project', error.message)
    },
  })
}

export const useUpdateProject = () => {
  const queryClient = useQueryClient()
  const notify = useNotify()

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: Partial<Project>
    }) => {
      return apiClient<ApiResponse<Project>>(`/projects/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.project(variables.id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.projects })
      if (data.data.organizationId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.projectsByOrg(data.data.organizationId)
        })
      }
      notify.success('Project updated successfully')
    },
    onError: (error: Error) => {
      notify.error('Failed to update project', error.message)
    },
  })
}

export const useDeleteProject = () => {
  const queryClient = useQueryClient()
  const notify = useNotify()

  return useMutation({
    mutationFn: async (id: string) => {
      return apiClient<ApiResponse>(`/projects/${id}`, {
        method: 'DELETE',
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects })
      notify.success('Project deleted successfully')
    },
    onError: (error: Error) => {
      notify.error('Failed to delete project', error.message)
    },
  })
}

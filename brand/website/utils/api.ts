import { ApiResponse, PaginatedResponse } from '../types/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
}

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { params, ...fetchOptions } = options;
  
  // Build URL with query parameters
  let url = `${API_BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      searchParams.append(key, String(value));
    });
    url += `?${searchParams.toString()}`;
  }

  // Get auth token from localStorage
  const authTokens = localStorage.getItem('auth_tokens');
  const token = authTokens ? JSON.parse(authTokens).accessToken : null;

  // Set default headers
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      throw new ApiError(
        `Unexpected response type: ${contentType}`,
        response.status
      );
    }

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.message || `HTTP ${response.status}`,
        response.status,
        data
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Network or other errors
    throw new ApiError(
      error instanceof Error ? error.message : 'Network error',
      0
    );
  }
}

// HTTP method helpers
export const api = {
  get: <T>(endpoint: string, params?: Record<string, string | number | boolean>) =>
    request<T>(endpoint, { method: 'GET', params }),

  post: <T>(endpoint: string, data?: any) =>
    request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(endpoint: string, data?: any) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T>(endpoint: string, data?: any) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),
};

// Specific API functions
export const authApi = {
  login: (credentials: { email: string; password: string }) =>
    api.post('/auth/login', credentials),

  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    company?: string;
    phone?: string;
  }) => api.post('/auth/register', data),

  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),

  logout: () => api.post('/auth/logout'),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }),
};

export const cmsApi = {
  getPages: (params?: { published?: boolean }) =>
    api.get('/cms/pages', params),

  getPage: (slug: string) =>
    api.get(`/cms/pages/${slug}`),
};

export const leadApi = {
  createLead: (data: {
    email: string;
    firstName?: string;
    lastName?: string;
    company?: string;
    phone?: string;
    message?: string;
    source: string;
    interests?: string[];
  }) => api.post('/leads', data),

  getLeads: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    source?: string;
    search?: string;
  }) => api.get<PaginatedResponse<any>>('/leads', params),

  updateLead: (id: string, data: Partial<any>) =>
    api.patch(`/leads/${id}`, data),
};

export const assessmentApi = {
  getAssessments: () => api.get('/assessments'),

  getAssessment: (id: string) =>
    api.get(`/assessments/${id}`),

  submitAssessment: (id: string, data: {
    answers: Array<{
      questionId: string;
      value: any;
      text?: string;
    }>;
    email?: string;
    company?: string;
  }) => api.post(`/assessments/${id}/submit`, data),

  getResults: (responseId: string) =>
    api.get(`/assessments/results/${responseId}`),
};

export const caseStudyApi = {
  getCaseStudies: (params?: {
    page?: number;
    limit?: number;
    industry?: string;
    technology?: string;
    featured?: boolean;
    search?: string;
  }) => api.get<PaginatedResponse<any>>('/case-studies', params),

  getCaseStudy: (slug: string) =>
    api.get(`/case-studies/${slug}`),

  getIndustries: () => api.get('/case-studies/industries'),

  getTechnologies: () => api.get('/case-studies/technologies'),
};

export const blogApi = {
  getPosts: (params?: {
    page?: number;
    limit?: number;
    category?: string;
    tag?: string;
    author?: string;
    search?: string;
    published?: boolean;
  }) => api.get<PaginatedResponse<any>>('/blog/posts', params),

  getPost: (slug: string) =>
    api.get(`/blog/posts/${slug}`),

  getCategories: () => api.get('/blog/categories'),

  getTags: () => api.get('/blog/tags'),

  getAuthors: () => api.get('/blog/authors'),
};

export const contactApi = {
  submitForm: (formId: string, data: Record<string, any>) =>
    api.post(`/contact/forms/${formId}/submit`, data),

  getForms: () => api.get('/contact/forms'),

  getForm: (id: string) =>
    api.get(`/contact/forms/${id}`),
};

export const analyticsApi = {
  getDashboard: (params?: {
    dateFrom?: string;
    dateTo?: string;
  }) => api.get('/analytics/dashboard', params),

  getPageViews: (params?: {
    path?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => api.get('/analytics/pageviews', params),

  trackEvent: (event: {
    name: string;
    properties?: Record<string, any>;
  }) => api.post('/analytics/events', event),
};

export const newsletterApi = {
  subscribe: (data: {
    email: string;
    preferences?: {
      frequency: 'weekly' | 'monthly' | 'quarterly';
      topics: string[];
      format: 'html' | 'text';
    };
    source?: string;
  }) => api.post('/newsletter/subscribe', data),

  unsubscribe: (email: string, token?: string) =>
    api.post('/newsletter/unsubscribe', { email, token }),

  updatePreferences: (email: string, preferences: {
    frequency: 'weekly' | 'monthly' | 'quarterly';
    topics: string[];
    format: 'html' | 'text';
  }) => api.patch('/newsletter/preferences', { email, preferences }),
};

export const proposalApi = {
  getProposals: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    clientId?: string;
  }) => api.get<PaginatedResponse<any>>('/proposals', params),

  getProposal: (id: string) =>
    api.get(`/proposals/${id}`),

  createProposal: (data: any) =>
    api.post('/proposals', data),

  updateProposal: (id: string, data: any) =>
    api.patch(`/proposals/${id}`, data),

  sendProposal: (id: string) =>
    api.post(`/proposals/${id}/send`),

  acceptProposal: (id: string) =>
    api.post(`/proposals/${id}/accept`),
};

export const clientApi = {
  getProjects: (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }) => api.get<PaginatedResponse<any>>('/client/projects', params),

  getProject: (id: string) =>
    api.get(`/client/projects/${id}`),

  getDocuments: (projectId?: string) =>
    api.get('/client/documents', projectId ? { projectId } : undefined),

  downloadDocument: (id: string) =>
    api.get(`/client/documents/${id}/download`),

  getMilestones: (projectId: string) =>
    api.get(`/client/projects/${projectId}/milestones`),
};

export { ApiError };
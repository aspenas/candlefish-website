import axios, { AxiosError } from 'axios';
import { API_URL } from '../config';

const API_BASE_URL = API_URL;

// Enhanced axios client with retry logic and better error handling
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
  withCredentials: false, // Explicitly set CORS credentials
});

// Request interceptor for debugging
apiClient.interceptors.request.use(
  (config) => {
    console.log('API Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`,
      headers: config.headers
    });
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Retry logic for failed requests
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const isRetryableError = (error: AxiosError) => {
  if (!error.response) return true; // Network errors are retryable
  const status = error.response.status;
  return status >= 500 || status === 408 || status === 429; // Server errors and timeouts
};

// Helper function to convert snake_case to camelCase
const toCamelCase = (obj: any): any => {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(toCamelCase);
  }
  
  const camelCaseObj: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    camelCaseObj[camelKey] = toCamelCase(value);
  }
  return camelCaseObj;
};

// Enhanced response interceptor with retry logic
apiClient.interceptors.response.use(
  (response) => {
    console.log('API Response:', {
      status: response.status,
      statusText: response.statusText,
      url: response.config.url,
      dataType: typeof response.data,
      hasData: !!response.data
    });

    // Ensure response data is properly formatted
    const data = response.data;

    // Handle empty or malformed responses
    if (data === null || data === undefined) {
      console.warn('Received null/undefined response from API');
      return { ...response, data: [] };
    }

    // Convert snake_case fields to camelCase
    const camelCaseData = toCamelCase(data);
    
    // Return the response with transformed data
    return { ...response, data: camelCaseData };
  },
  async (error: AxiosError) => {
    const config = error.config as any;
    
    console.error('API Error Details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: config?.url,
      method: config?.method,
      baseURL: config?.baseURL,
      message: error.message,
      code: error.code,
      isNetworkError: !error.response,
      data: error.response?.data
    });

    // Implement retry logic
    if (config && isRetryableError(error)) {
      config.__retryCount = config.__retryCount || 0;
      
      if (config.__retryCount < MAX_RETRIES) {
        config.__retryCount++;
        console.log(`Retrying request (${config.__retryCount}/${MAX_RETRIES}):`, config.url);
        
        await sleep(RETRY_DELAY * config.__retryCount); // Exponential backoff
        return apiClient(config);
      }
    }

    // Handle network errors (CORS, connection issues)
    if (error.code === 'ERR_NETWORK' || !error.response) {
      console.error('Network error - possible CORS or connection issue. Check backend connectivity.');
      
      // For critical endpoints, show user-friendly messages
      const url = config?.url || '';
      if (url.includes('/items') || url.includes('/health')) {
        console.error('Critical endpoint failed:', url);
      }
    }

    // Return sensible defaults for specific endpoints after all retries failed
    if ((error.response?.status === 404 || error.response?.status === 500) || !error.response) {
      const url = config?.url || '';

      if (url.includes('/items')) {
        console.warn('Returning empty items array due to API error');
        return Promise.resolve({ data: toCamelCase({ items: [], total: 0 }) });
      }
      if (url.includes('/analytics')) {
        return Promise.resolve({ data: toCamelCase({}) });
      }
      if (url.includes('/rooms')) {
        return Promise.resolve({ data: toCamelCase({ rooms: [] }) });
      }
      if (url.includes('/categories')) {
        return Promise.resolve({ data: toCamelCase({ categories: [] }) });
      }
    }

    return Promise.reject(error);
  }
);

export const api = {
  // Health check
  healthCheck: () => apiClient.get('/health', { baseURL: API_BASE_URL.replace('/api/v1', '') }),
  
  // Summary
  getSummary: () => apiClient.get('/analytics/summary'),

  // Items
  getItems: (params?: any) => apiClient.get('/items', { params }),
  getItem: (id: string) => apiClient.get(`/items/${id}`),
  createItem: (data: any) => apiClient.post('/items', data),
  updateItem: (id: string, data: any) => apiClient.put(`/items/${id}`, data),
  deleteItem: (id: string) => apiClient.delete(`/items/${id}`),
  bulkUpdateItems: (data: any) => apiClient.post('/items/bulk', data),

  // Search
  searchItems: (params: any) => apiClient.get('/search', { params }),
  filterItems: (params: URLSearchParams) => apiClient.get(`/filter?${params.toString()}`),

  // Rooms
  getRooms: () => apiClient.get('/rooms'),
  getRoom: (id: string) => apiClient.get(`/rooms/${id}`),

  // Analytics
  getRoomAnalytics: () => apiClient.get('/analytics/by-room'),
  getCategoryAnalytics: () => apiClient.get('/analytics/by-category'),

  // Export
  exportExcel: (itemIds?: string[]) => {
    const url = itemIds && itemIds.length > 0
      ? `${API_BASE_URL}/export/excel?items=${itemIds.join(',')}`
      : `${API_BASE_URL}/export/excel`;
    window.open(url, '_blank');
  },
  exportPDF: (itemIds?: string[]) => {
    const url = itemIds && itemIds.length > 0
      ? `${API_BASE_URL}/export/pdf?items=${itemIds.join(',')}`
      : `${API_BASE_URL}/export/pdf`;
    window.open(url, '_blank');
  },
  exportCSV: (itemIds?: string[]) => {
    const url = itemIds && itemIds.length > 0
      ? `${API_BASE_URL}/export/csv?items=${itemIds.join(',')}`
      : `${API_BASE_URL}/export/csv`;
    window.open(url, '_blank');
  },
  exportBuyerView: () => window.open(`${API_BASE_URL}/export/buyer-view`, '_blank'),

  // Transactions
  getTransactions: () => apiClient.get('/transactions'),
  createTransaction: (data: any) => apiClient.post('/transactions', data),

  // Activities
  getActivities: (limit?: number) => apiClient.get('/activities', { params: { limit } }),

  // AI Insights
  getAIInsights: () => apiClient.get('/ai/insights'),
  getRecommendations: (itemIds?: string[]) =>
    apiClient.post('/ai/recommendations', { itemIds }),
  getPriceOptimization: (itemId: string) =>
    apiClient.get(`/ai/price-optimization/${itemId}`),
  getMarketAnalysis: (category: string) =>
    apiClient.get(`/ai/market-analysis/${category}`),
  getBundleSuggestions: () => apiClient.get('/ai/bundle-suggestions'),
  getPredictiveTrends: (timeRange: string) =>
    apiClient.get(`/ai/predictive-trends?range=${timeRange}`),

  // Collaboration - Notes
  getItemNotes: (itemId: string, role: string = 'buyer') =>
    apiClient.get(`/items/${itemId}/notes?role=${role}`),
  addItemNote: (itemId: string, note: any, role: string = 'buyer') =>
    apiClient.post(`/items/${itemId}/notes?role=${role}`, note),
  updateNote: (noteId: string, note: any, role: string = 'buyer') =>
    apiClient.put(`/notes/${noteId}?role=${role}`, note),
  deleteNote: (noteId: string, role: string = 'buyer') =>
    apiClient.delete(`/notes/${noteId}?role=${role}`),

  // Collaboration - Buyer Interest
  getItemInterest: (itemId: string) => apiClient.get(`/items/${itemId}/interest`),
  setItemInterest: (itemId: string, interest: any) =>
    apiClient.put(`/items/${itemId}/interest`, interest),
  getBuyerInterests: () => apiClient.get('/buyer/interests'),

  // Collaboration - Bundles
  getBundles: () => apiClient.get('/bundles'),
  createBundle: (bundle: any, role: string = 'buyer') =>
    apiClient.post(`/bundles?role=${role}`, bundle),
  updateBundle: (bundleId: string, bundle: any) =>
    apiClient.put(`/bundles/${bundleId}`, bundle),
  deleteBundle: (bundleId: string) => apiClient.delete(`/bundles/${bundleId}`),

  // Collaboration - Overview
  getCollaborationOverview: () => apiClient.get('/collaboration/overview'),

  // Photo operations
  uploadItemPhoto: (itemId: string, formData: FormData) =>
    apiClient.post(`/items/${itemId}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),

  createPhotoSession: (data: any) => apiClient.post('/photos/sessions', data),
  getPhotoSession: (id: string) => apiClient.get(`/photos/sessions/${id}`),
  updatePhotoSession: (id: string, data: any) => apiClient.put(`/photos/sessions/${id}`, data),

  batchUploadPhotos: (sessionId: string, formData: FormData) =>
    apiClient.post(`/photos/batch/${sessionId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),

  getRoomPhotoProgress: () => apiClient.get('/rooms/progress'),
};

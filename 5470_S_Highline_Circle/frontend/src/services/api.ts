import axios from 'axios';
import { API_URL } from '../config';

const API_BASE_URL = API_URL;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor - simplified without auth
apiClient.interceptors.response.use(
  (response) => {
    // Ensure response data is properly formatted
    const data = response.data;

    // Handle empty or malformed responses
    if (data === null || data === undefined) {
      console.warn('Received null/undefined response from API');
      return { data: [] };
    }

    // Return the response object as-is, the component will handle parsing
    return response;
  },
  (error) => {
    console.error('API Error Details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      method: error.config?.method,
      baseURL: error.config?.baseURL,
      message: error.message,
      data: error.response?.data
    });

    // Handle network errors (CORS, connection issues)
    if (error.code === 'ERR_NETWORK' || !error.response) {
      console.error('Network error - possible CORS or connection issue');
    }

    // Return sensible defaults for specific endpoints wrapped in response format
    if (error.response?.status === 404 || error.response?.status === 500) {
      const url = error.config?.url || '';

      if (url.includes('/items')) {
        return Promise.resolve({ data: { items: [], total: 0 } });
      }
      if (url.includes('/analytics')) {
        return Promise.resolve({ data: {} });
      }
      if (url.includes('/rooms')) {
        return Promise.resolve({ data: { rooms: [] } });
      }
      if (url.includes('/categories')) {
        return Promise.resolve({ data: { categories: [] } });
      }
    }

    return Promise.reject(error);
  }
);

export const api = {
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

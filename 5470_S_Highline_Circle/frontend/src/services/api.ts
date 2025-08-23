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
  (response) => response.data,
  (error) => Promise.reject(error)
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
};

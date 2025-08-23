import axios from 'axios';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3080/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
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
};

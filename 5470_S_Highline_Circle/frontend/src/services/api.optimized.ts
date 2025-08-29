import axios, { AxiosError } from 'axios';
import { API_URL } from '../config';

const API_BASE_URL = API_URL;

// Create axios instance with optimized defaults
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 second timeout
});

// Request cache for GET requests
const cache = new Map();
const CACHE_DURATION = 60000; // 1 minute cache

// Cache helper functions
const getCacheKey = (url: string, params?: any) => {
  return `${url}${params ? JSON.stringify(params) : ''}`;
};

const getCachedData = (key: string) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  cache.delete(key);
  return null;
};

const setCachedData = (key: string, data: any) => {
  cache.set(key, { data, timestamp: Date.now() });
  // Limit cache size
  if (cache.size > 100) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
};

// Request interceptor for caching
apiClient.interceptors.request.use(
  (config) => {
    // Only cache GET requests
    if (config.method === 'get') {
      const cacheKey = getCacheKey(config.url || '', config.params);
      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        // Return cached data by rejecting with special flag
        return Promise.reject({
          __cached: true,
          data: cachedData,
          config,
        });
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor with better error handling
apiClient.interceptors.response.use(
  (response) => {
    // Cache successful GET responses
    if (response.config.method === 'get') {
      const cacheKey = getCacheKey(response.config.url || '', response.config.params);
      setCachedData(cacheKey, response.data);
    }

    // Ensure response data is properly formatted
    const data = response.data;
    
    if (data === null || data === undefined) {
      console.warn('Received null/undefined response from API');
      return { data: [] };
    }

    return response;
  },
  (error: AxiosError | any) => {
    // Handle cached responses
    if (error.__cached) {
      return Promise.resolve({ data: error.data, config: error.config });
    }

    console.error('API Error:', {
      status: error.response?.status,
      url: error.config?.url,
      message: error.message,
    });

    // Handle network errors
    if (error.code === 'ERR_NETWORK' || !error.response) {
      // Try to return cached data if available
      if (error.config?.method === 'get') {
        const cacheKey = getCacheKey(error.config.url || '', error.config.params);
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
          console.log('Returning stale cached data due to network error');
          return Promise.resolve({ data: cachedData.data });
        }
      }
      console.error('Network error - no cached data available');
    }

    // Return sensible defaults for specific endpoints
    if (error.response?.status === 404 || error.response?.status === 500) {
      const url = error.config?.url || '';
      
      if (url.includes('/items')) {
        return Promise.resolve({ data: [] });
      }
      if (url.includes('/analytics')) {
        return Promise.resolve({ data: {} });
      }
      if (url.includes('/rooms')) {
        return Promise.resolve({ data: [] });
      }
      if (url.includes('/categories')) {
        return Promise.resolve({ data: [] });
      }
    }

    return Promise.reject(error);
  }
);

// Batch API requests helper
const batchRequests = async (requests: Promise<any>[]) => {
  try {
    return await Promise.all(requests);
  } catch (error) {
    console.error('Batch request failed:', error);
    // Return partial results
    return Promise.allSettled(requests);
  }
};

// Optimized API client with request deduplication
class OptimizedAPI {
  private pendingRequests = new Map<string, Promise<any>>();

  private async dedupedRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    // Check if request is already in progress
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    // Start new request
    const promise = requestFn()
      .finally(() => {
        this.pendingRequests.delete(key);
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  // Summary
  getSummary = () => 
    this.dedupedRequest('summary', () => 
      apiClient.get('/analytics/summary').then(res => res.data)
    );

  // Items with pagination support
  getItems = (params?: any) => 
    this.dedupedRequest(`items-${JSON.stringify(params)}`, () => 
      apiClient.get('/items', { params }).then(res => res.data)
    );
    
  getItem = (id: string) => 
    this.dedupedRequest(`item-${id}`, () => 
      apiClient.get(`/items/${id}`).then(res => res.data)
    );
    
  createItem = (data: any) => 
    apiClient.post('/items', data).then(res => res.data);
    
  updateItem = (id: string, data: any) => 
    apiClient.put(`/items/${id}`, data).then(res => {
      // Invalidate cache for this item
      cache.delete(`/items/${id}`);
      cache.delete('/items');
      return res.data;
    });
    
  deleteItem = (id: string) => 
    apiClient.delete(`/items/${id}`).then(res => {
      // Invalidate cache
      cache.delete(`/items/${id}`);
      cache.delete('/items');
      return res.data;
    });
    
  bulkUpdateItems = (data: any) => 
    apiClient.post('/items/bulk', data).then(res => {
      // Clear items cache
      cache.delete('/items');
      return res.data;
    });

  // Search with debounce support
  searchItems = (params: any) => 
    this.dedupedRequest(`search-${JSON.stringify(params)}`, () => 
      apiClient.get('/search', { params }).then(res => res.data)
    );
    
  filterItems = (params: URLSearchParams) => 
    this.dedupedRequest(`filter-${params.toString()}`, () => 
      apiClient.get(`/filter?${params.toString()}`).then(res => res.data)
    );

  // Rooms
  getRooms = () => 
    this.dedupedRequest('rooms', () => 
      apiClient.get('/rooms').then(res => res.data)
    );
    
  getRoom = (id: string) => 
    this.dedupedRequest(`room-${id}`, () => 
      apiClient.get(`/rooms/${id}`).then(res => res.data)
    );

  // Analytics with caching
  getRoomAnalytics = () => 
    this.dedupedRequest('room-analytics', () => 
      apiClient.get('/analytics/by-room').then(res => res.data)
    );
    
  getCategoryAnalytics = () => 
    this.dedupedRequest('category-analytics', () => 
      apiClient.get('/analytics/by-category').then(res => res.data)
    );

  // Batch load critical data
  loadDashboardData = () => 
    batchRequests([
      this.getSummary(),
      this.getRoomAnalytics(),
      this.getCategoryAnalytics(),
    ]);

  // Export functions
  exportExcel = (itemIds?: string[]) => {
    const url = itemIds && itemIds.length > 0
      ? `${API_BASE_URL}/export/excel?items=${itemIds.join(',')}`
      : `${API_BASE_URL}/export/excel`;
    window.open(url, '_blank');
  };
  
  exportPDF = (itemIds?: string[]) => {
    const url = itemIds && itemIds.length > 0
      ? `${API_BASE_URL}/export/pdf?items=${itemIds.join(',')}`
      : `${API_BASE_URL}/export/pdf`;
    window.open(url, '_blank');
  };
  
  exportCSV = (itemIds?: string[]) => {
    const url = itemIds && itemIds.length > 0
      ? `${API_BASE_URL}/export/csv?items=${itemIds.join(',')}`
      : `${API_BASE_URL}/export/csv`;
    window.open(url, '_blank');
  };
  
  exportBuyerView = () => 
    window.open(`${API_BASE_URL}/export/buyer-view`, '_blank');

  // Transactions
  getTransactions = () => 
    apiClient.get('/transactions').then(res => res.data);
    
  createTransaction = (data: any) => 
    apiClient.post('/transactions', data).then(res => res.data);

  // Activities
  getActivities = (limit?: number) => 
    apiClient.get('/activities', { params: { limit } }).then(res => res.data);

  // AI Insights with caching
  getAIInsights = () => 
    this.dedupedRequest('ai-insights', () => 
      apiClient.get('/ai/insights').then(res => res.data)
    );
    
  getRecommendations = (itemIds?: string[]) =>
    apiClient.post('/ai/recommendations', { itemIds }).then(res => res.data);
    
  getPriceOptimization = (itemId: string) =>
    this.dedupedRequest(`price-opt-${itemId}`, () => 
      apiClient.get(`/ai/price-optimization/${itemId}`).then(res => res.data)
    );
    
  getMarketAnalysis = (category: string) =>
    this.dedupedRequest(`market-${category}`, () => 
      apiClient.get(`/ai/market-analysis/${category}`).then(res => res.data)
    );
    
  getBundleSuggestions = () => 
    apiClient.get('/ai/bundle-suggestions').then(res => res.data);
    
  getPredictiveTrends = (timeRange: string) =>
    apiClient.get(`/ai/predictive-trends?range=${timeRange}`).then(res => res.data);

  // Photo operations with progress tracking
  uploadItemPhoto = async (itemId: string, formData: FormData) => {
    try {
      const response = await apiClient.post(`/items/${itemId}/photos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          // Emit progress event if needed
          window.dispatchEvent(new CustomEvent('photo-upload-progress', { 
            detail: { itemId, progress: percentCompleted } 
          }));
        },
      });
      // Clear item cache
      cache.delete(`/items/${itemId}`);
      return response.data;
    } catch (error) {
      console.error('Photo upload failed:', error);
      throw error;
    }
  };

  // Clear all caches
  clearCache = () => {
    cache.clear();
    this.pendingRequests.clear();
  };

  // Prefetch data for route
  prefetchRouteData = (route: string) => {
    switch (route) {
      case 'dashboard':
        this.getSummary();
        this.getRoomAnalytics();
        break;
      case 'inventory':
        this.getItems();
        this.getRooms();
        break;
      case 'analytics':
        this.getRoomAnalytics();
        this.getCategoryAnalytics();
        break;
      case 'insights':
        this.getAIInsights();
        break;
      default:
        break;
    }
  };
}

// Export optimized API instance
export const api = new OptimizedAPI();

// Export cache control functions
export const clearAPICache = () => api.clearCache();
export const prefetchData = (route: string) => api.prefetchRouteData(route);
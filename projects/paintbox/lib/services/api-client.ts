/**
 * API Client for backend communication
 * Handles all API calls to the backend server
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_URL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data, success: true };
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Salesforce endpoints
  async searchSalesforce(query: string, type: 'contacts' | 'accounts' = 'contacts') {
    return this.request(`/api/v1/salesforce/search?q=${encodeURIComponent(query)}&type=${type}`);
  }

  async getSalesforceContact(id: string) {
    return this.request(`/api/v1/salesforce/contacts/${id}`);
  }

  async getSalesforceAccount(id: string) {
    return this.request(`/api/v1/salesforce/accounts/${id}`);
  }

  // CompanyCam endpoints
  async getCompanyCamProjects() {
    return this.request('/api/v1/companycam/projects');
  }

  async uploadCompanyCamPhoto(projectId: string, file: File) {
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('projectId', projectId);

    return this.request('/api/v1/companycam/photos', {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set content-type for FormData
    });
  }

  // Calculation endpoints
  async calculateEstimate(data: any) {
    if (!this.baseUrl) {
      throw new Error('Backend API URL not configured for calculations');
    }

    return this.request('/api/v1/calculations/estimate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async calculatePricingTiers(measurements: any[], laborRate: number, paintPrice: number) {
    if (!this.baseUrl) {
      throw new Error('Backend API URL not configured for pricing calculations');
    }

    return this.request('/api/v1/calculations/pricing-tiers', {
      method: 'POST',
      body: JSON.stringify({ measurements, laborRate, paintPrice }),
    });
  }

  // Estimate endpoints
  async saveEstimate(estimate: any) {
    return this.request('/api/v1/estimates', {
      method: 'POST',
      body: JSON.stringify(estimate),
    });
  }

  async getEstimate(id: string) {
    return this.request(`/api/v1/estimates/${id}`);
  }

  async updateEstimate(id: string, updates: any) {
    return this.request(`/api/v1/estimates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  // Health check
  async healthCheck() {
    return this.request('/health');
  }

  // Test endpoint
  async testSecrets() {
    return this.request('/api/v1/test/secrets');
  }
}

export const apiClient = new ApiClient();

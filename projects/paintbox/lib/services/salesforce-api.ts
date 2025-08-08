/**
 * Salesforce API Service
 * Wrapper that uses backend API when available, falls back to mock data for demo
 */

import { apiClient } from './api-client';
import type { SalesforceContact, SalesforceAccount } from '@/lib/services/salesforce';

class SalesforceApiService {
  private useBackend: boolean = false;
  private useMockData: boolean = true; // Default to mock data for now

  constructor() {
    // Check if backend is available
    this.checkBackendAvailability();
  }

  private async checkBackendAvailability() {
    if (process.env.NEXT_PUBLIC_API_URL) {
      try {
        const result = await apiClient.healthCheck();
        this.useBackend = result.success;
        this.useMockData = !result.success; // Use mock if backend fails
        console.log(`Salesforce API: Using ${this.useBackend ? 'backend' : 'mock data'}`);
      } catch (error) {
        console.warn('Backend not available, using mock data');
        this.useBackend = false;
        this.useMockData = true;
      }
    }
  }

  async searchContacts(query: string, limit = 10): Promise<SalesforceContact[]> {
    if (this.useBackend) {
      const result = await apiClient.searchSalesforce(query, 'contacts');
      if (result.success && result.data) {
        return (result.data as any).contacts || [];
      }
    }

    // Use mock data if backend not available
    if (this.useMockData) {
      const { mockApi } = await import('./mock-api');
      return mockApi.searchContacts(query);
    }

    // Fallback to direct service
    const { salesforceService } = await import('@/lib/services/salesforce');
    return salesforceService.searchContacts(query, limit);
  }

  async searchAccounts(query: string, limit = 10): Promise<SalesforceAccount[]> {
    if (this.useBackend) {
      const result = await apiClient.searchSalesforce(query, 'accounts');
      if (result.success && result.data) {
        return (result.data as any).accounts || [];
      }
    }

    // Use mock data if backend not available
    if (this.useMockData) {
      const { mockApi } = await import('./mock-api');
      return mockApi.searchAccounts(query);
    }

    // Fallback to direct service
    const { salesforceService } = await import('@/lib/services/salesforce');
    return salesforceService.searchAccounts(query, limit);
  }

  async getContact(id: string): Promise<SalesforceContact | null> {
    if (this.useBackend) {
      const result = await apiClient.getSalesforceContact(id);
      if (result.success && result.data) {
        return result.data as SalesforceContact;
      }
    }

    // Fallback to direct service
    return salesforceService.getContact(id);
  }

  async getAccount(id: string): Promise<SalesforceAccount | null> {
    if (this.useBackend) {
      const result = await apiClient.getSalesforceAccount(id);
      if (result.success && result.data) {
        return result.data as SalesforceAccount;
      }
    }

    // Fallback to direct service
    return salesforceService.getAccount(id);
  }

  async initialize(): Promise<void> {
    // Check backend availability first
    await this.checkBackendAvailability();

    // If using mock data, no initialization needed
    if (this.useMockData) {
      console.log('Using mock Salesforce data');
      return;
    }

    // If not using backend, initialize direct service
    if (!this.useBackend && !this.useMockData) {
      const { salesforceService } = await import('@/lib/services/salesforce');
      await salesforceService.initialize();
    }
  }

  async testConnection(): Promise<boolean> {
    if (this.useBackend) {
      const result = await apiClient.testSecrets();
      return result.success && (result.data as any)?.hasSalesforceCredentials;
    }

    return salesforceService.testConnection();
  }
}

export const salesforceApi = new SalesforceApiService();

/**
 * Salesforce API Service - Production Implementation
 * Direct integration with Salesforce CRM using production credentials
 */

import { apiClient } from './api-client';
import type { SalesforceContact, SalesforceAccount } from '@/lib/services/salesforce';
import { logger } from '@/lib/logging/simple-logger';

class SalesforceApiService {
  private useBackend: boolean = false;
  private isProduction: boolean = true;

  constructor() {
    // Check if backend API is available for optimized routing
    this.checkBackendAvailability();
  }

  private async checkBackendAvailability() {
    if (process.env.NEXT_PUBLIC_API_URL) {
      try {
        const result = await apiClient.healthCheck();
        this.useBackend = result.success;
        logger.info(`Salesforce API: Using ${this.useBackend ? 'backend API' : 'direct service'}`);
      } catch (error) {
        logger.warn('Backend API not available, using direct Salesforce service');
        this.useBackend = false;
      }
    }
  }

  async searchContacts(query: string, limit = 10): Promise<SalesforceContact[]> {
    if (this.useBackend) {
      try {
        const result = await apiClient.searchSalesforce(query, 'contacts');
        if (result.success && result.data) {
          return (result.data as any).contacts || [];
        }
      } catch (error) {
        logger.warn('Backend API search failed, falling back to direct service', { error });
      }
    }

    // Use direct Salesforce service (production)
    const { salesforceService } = await import('@/lib/services/salesforce');
    return salesforceService.searchContacts(query, limit);
  }

  async searchAccounts(query: string, limit = 10): Promise<SalesforceAccount[]> {
    if (this.useBackend) {
      try {
        const result = await apiClient.searchSalesforce(query, 'accounts');
        if (result.success && result.data) {
          return (result.data as any).accounts || [];
        }
      } catch (error) {
        logger.warn('Backend API search failed, falling back to direct service', { error });
      }
    }

    // Use direct Salesforce service (production)
    const { salesforceService } = await import('@/lib/services/salesforce');
    return salesforceService.searchAccounts(query, limit);
  }

  async getContact(id: string): Promise<SalesforceContact | null> {
    if (this.useBackend) {
      try {
        const result = await apiClient.getSalesforceContact(id);
        if (result.success && result.data) {
          return result.data as SalesforceContact;
        }
      } catch (error) {
        logger.warn('Backend API get contact failed, falling back to direct service', { error });
      }
    }

    // Use direct Salesforce service (production)
    const { salesforceService } = await import('@/lib/services/salesforce');
    return salesforceService.getContact(id);
  }

  async getAccount(id: string): Promise<SalesforceAccount | null> {
    if (this.useBackend) {
      try {
        const result = await apiClient.getSalesforceAccount(id);
        if (result.success && result.data) {
          return result.data as SalesforceAccount;
        }
      } catch (error) {
        logger.warn('Backend API get account failed, falling back to direct service', { error });
      }
    }

    // Use direct Salesforce service (production)
    const { salesforceService } = await import('@/lib/services/salesforce');
    return salesforceService.getAccount(id);
  }

  async initialize(): Promise<{ success: boolean; error?: string }> {
    try {
      // Check backend availability first
      await this.checkBackendAvailability();

      logger.info('Initializing production Salesforce service');

      // Always initialize direct service for production reliability
      const { salesforceService } = await import('@/lib/services/salesforce');
      await salesforceService.initialize();

      logger.info('Salesforce service initialized successfully');
      return { success: true };
    } catch (error) {
      logger.error('Failed to initialize Salesforce service:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  async testConnection(): Promise<boolean> {
    if (this.useBackend) {
      try {
        const result = await apiClient.testSecrets();
        return result.success && (result.data as any)?.hasSalesforceCredentials;
      } catch (error) {
        logger.warn('Backend API connection test failed, testing direct service', { error });
      }
    }

    // Use direct Salesforce service (production)
    const { salesforceService } = await import('@/lib/services/salesforce');
    return salesforceService.testConnection();
  }
}

export const salesforceApi = new SalesforceApiService();

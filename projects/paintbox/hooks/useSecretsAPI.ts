import { useState, useCallback } from 'react';
import { ServiceStatus, AuditEvent, AppConfig } from '@/components/secrets/types';

interface UseSecretsAPIReturn {
  loading: boolean;
  error: string | null;
  config: AppConfig | null;
  fetchConfig: () => Promise<void>;
  getServiceStatus: (service: string) => Promise<ServiceStatus>;
  getAuditEvents: (params?: Record<string, string>) => Promise<{ events: AuditEvent[]; total: number }>;
  requestToken: (service: string) => Promise<{ token: string; expiresAt: string }>;
  checkHealth: () => Promise<{ status: string; timestamp: string }>;
}

export const useSecretsAPI = (): UseSecretsAPIReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);

  const handleError = (err: unknown) => {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    setError(message);
    throw err;
  };

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/secrets/config');
      if (!response.ok) {
        throw new Error(`Failed to fetch config: ${response.status}`);
      }

      const configData = await response.json();
      setConfig(configData);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getServiceStatus = useCallback(async (service: string): Promise<ServiceStatus> => {
    setError(null);

    try {
      const response = await fetch(`/api/v1/services/${service}/status`);
      if (!response.ok) {
        throw new Error(`Failed to get ${service} status: ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      handleError(err);
      // Return error status as fallback
      return {
        service,
        status: 'error',
        lastCheck: new Date().toISOString(),
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }
  }, []);

  const getAuditEvents = useCallback(async (params: Record<string, string> = {}) => {
    setLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams(params);
      const response = await fetch(`/api/v1/audit/events?${searchParams}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch audit events: ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      handleError(err);
      // Return mock data as fallback
      return {
        events: [
          {
            id: '1',
            timestamp: new Date().toISOString(),
            service: 'mock',
            action: 'api_error',
            success: false,
            error: 'Failed to fetch real audit data'
          }
        ] as AuditEvent[],
        total: 1
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const requestToken = useCallback(async (service: string) => {
    setError(null);

    try {
      const response = await fetch('/api/v1/secrets/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ service }),
      });

      if (!response.ok) {
        throw new Error(`Failed to request token: ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      handleError(err);
      throw err;
    }
  }, []);

  const checkHealth = useCallback(async () => {
    setError(null);

    try {
      const response = await fetch('/api/v1/secrets/health');
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      handleError(err);
      // Return mock health status
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }
  }, []);

  return {
    loading,
    error,
    config,
    fetchConfig,
    getServiceStatus,
    getAuditEvents,
    requestToken,
    checkHealth,
  };
};

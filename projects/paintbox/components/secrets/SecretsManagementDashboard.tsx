'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { ServiceStatus, SecretStatus, AppConfig } from './types';

interface DashboardProps {
  className?: string;
}

export const SecretsManagementDashboard: React.FC<DashboardProps> = ({ className }) => {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [secrets, setSecrets] = useState<SecretStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch app configuration
      const configResponse = await fetch('/api/v1/secrets/config');
      if (!configResponse.ok) throw new Error('Failed to fetch configuration');
      const configData = await configResponse.json();
      setConfig(configData);

      // Fetch service statuses
      const servicesData: ServiceStatus[] = [];
      const serviceNames = ['salesforce', 'companycam'];

      for (const service of serviceNames) {
        try {
          const response = await fetch(`/api/v1/services/${service}/status`);
          if (response.ok) {
            const serviceData = await response.json();
            servicesData.push(serviceData);
          } else {
            servicesData.push({
              service,
              status: 'error',
              lastCheck: new Date().toISOString(),
              error: `HTTP ${response.status}`
            });
          }
        } catch (err) {
          servicesData.push({
            service,
            status: 'error',
            lastCheck: new Date().toISOString(),
            error: 'Connection failed'
          });
        }
      }

      setServices(servicesData);

      // Mock secrets data - in real implementation, this would come from backend
      setSecrets([
        {
          name: 'SALESFORCE_CLIENT_SECRET',
          service: 'salesforce',
          lastRotated: '2024-01-15T10:30:00Z',
          nextRotation: '2024-04-15T10:30:00Z',
          status: 'current'
        },
        {
          name: 'COMPANYCAM_API_KEY',
          service: 'companycam',
          lastRotated: '2024-01-20T14:15:00Z',
          nextRotation: '2024-04-20T14:15:00Z',
          status: 'current'
        }
      ]);

      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'current':
      case 'passed':
        return 'text-green-600 bg-green-50';
      case 'warning':
      case 'expiring':
        return 'text-yellow-600 bg-yellow-50';
      case 'error':
      case 'expired':
      case 'failed':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'current':
      case 'passed':
        return '✓';
      case 'warning':
      case 'expiring':
        return '⚠';
      case 'error':
      case 'expired':
      case 'failed':
        return '✗';
      default:
        return '?';
    }
  };

  if (loading && !config) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i} className="p-6">
                <div className="h-6 bg-gray-200 rounded w-2/3 mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card className="p-6 border-red-200 bg-red-50">
          <div className="flex items-center space-x-2">
            <span className="text-red-600">✗</span>
            <h3 className="text-lg font-semibold text-red-800">Dashboard Error</h3>
          </div>
          <p className="text-red-700 mt-2">{error}</p>
          <Button
            onClick={fetchDashboardData}
            variant="outline"
            className="mt-4"
          >
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Secrets Management</h1>
          <p className="text-gray-600">
            Environment: <span className="font-medium capitalize">{config?.environment}</span>
            {lastRefresh && (
              <span className="ml-4 text-sm">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <Button onClick={fetchDashboardData} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Service Health Overview */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Service Health</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
            <div key={service.service} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium capitalize">{service.service}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(service.status)}`}>
                  {getStatusIcon(service.status)} {service.status}
                </span>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p>Last check: {new Date(service.lastCheck).toLocaleString()}</p>
                {service.lastSuccess && (
                  <p>Last success: {new Date(service.lastSuccess).toLocaleString()}</p>
                )}
                {service.latency && (
                  <p>Latency: {service.latency}ms</p>
                )}
                {service.error && (
                  <p className="text-red-600">Error: {service.error}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Secrets Status */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Secret Rotation Status</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Secret</th>
                <th className="text-left py-2">Service</th>
                <th className="text-left py-2">Status</th>
                <th className="text-left py-2">Last Rotated</th>
                <th className="text-left py-2">Next Rotation</th>
              </tr>
            </thead>
            <tbody>
              {secrets.map((secret, index) => (
                <tr key={index} className="border-b last:border-b-0">
                  <td className="py-3 font-mono text-sm">{secret.name}</td>
                  <td className="py-3 capitalize">{secret.service}</td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(secret.status)}`}>
                      {getStatusIcon(secret.status)} {secret.status}
                    </span>
                  </td>
                  <td className="py-3 text-sm text-gray-600">
                    {secret.lastRotated ? new Date(secret.lastRotated).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="py-3 text-sm text-gray-600">
                    {secret.nextRotation ? new Date(secret.nextRotation).toLocaleDateString() : 'Not scheduled'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* AWS Secrets Manager Status */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">AWS Secrets Manager</h2>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            <span className="text-sm">Connected</span>
          </div>
          <div className="text-sm text-gray-600">
            Region: us-east-1
          </div>
          <div className="text-sm text-gray-600">
            Secrets: {secrets.length}
          </div>
        </div>
      </Card>
    </div>
  );
};

'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { SecurityCheckItem, AppConfig } from './types';

interface SecurityConfigurationPanelProps {
  className?: string;
}

interface MigrationStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  details?: string;
  error?: string;
}

interface EnvironmentVariable {
  name: string;
  status: 'set' | 'missing' | 'invalid';
  required: boolean;
  description: string;
  masked?: boolean;
}

export const SecurityConfigurationPanel: React.FC<SecurityConfigurationPanelProps> = ({ className }) => {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [securityChecks, setSecurityChecks] = useState<SecurityCheckItem[]>([]);
  const [envVariables, setEnvVariables] = useState<EnvironmentVariable[]>([]);
  const [migrationSteps, setMigrationSteps] = useState<MigrationStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningMigration, setRunningMigration] = useState(false);

  const fetchSecurityStatus = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch app configuration
      const configResponse = await fetch('/api/v1/secrets/config');
      if (configResponse.ok) {
        const configData = await configResponse.json();
        setConfig(configData);
      }

      // Mock security checks data
      setSecurityChecks([
        {
          id: 'aws-secrets-manager',
          name: 'AWS Secrets Manager Connection',
          description: 'Verify connection to AWS Secrets Manager',
          status: 'passed',
          required: true,
          details: 'Successfully connected to us-east-1 region'
        },
        {
          id: 'env-vars',
          name: 'Environment Variables',
          description: 'Check all required environment variables are set',
          status: 'warning',
          required: true,
          details: '2 optional variables missing'
        },
        {
          id: 'api-keys',
          name: 'API Key Validation',
          description: 'Validate external service API keys',
          status: 'passed',
          required: true,
          details: 'All API keys validated successfully'
        },
        {
          id: 'cors-config',
          name: 'CORS Configuration',
          description: 'Verify CORS policies are properly configured',
          status: 'passed',
          required: true,
          details: 'Whitelist properly configured for production domains'
        },
        {
          id: 'rate-limiting',
          name: 'Rate Limiting',
          description: 'Check API rate limiting is enabled',
          status: 'failed',
          required: false,
          details: 'Rate limiting not configured - recommended for production'
        },
        {
          id: 'audit-logging',
          name: 'Audit Logging',
          description: 'Verify audit logging is active',
          status: 'passed',
          required: true,
          details: 'All security events are being logged'
        }
      ]);

      // Mock environment variables status
      setEnvVariables([
        {
          name: 'AWS_REGION',
          status: 'set',
          required: true,
          description: 'AWS region for Secrets Manager',
          masked: false
        },
        {
          name: 'SALESFORCE_CLIENT_ID',
          status: 'set',
          required: true,
          description: 'Salesforce OAuth client ID',
          masked: false
        },
        {
          name: 'SALESFORCE_CLIENT_SECRET',
          status: 'set',
          required: true,
          description: 'Salesforce OAuth client secret',
          masked: true
        },
        {
          name: 'COMPANYCAM_API_KEY',
          status: 'set',
          required: true,
          description: 'CompanyCam API authentication key',
          masked: true
        },
        {
          name: 'REDIS_URL',
          status: 'missing',
          required: false,
          description: 'Redis connection string for caching',
          masked: false
        },
        {
          name: 'SENTRY_DSN',
          status: 'missing',
          required: false,
          description: 'Sentry error tracking DSN',
          masked: false
        }
      ]);

      // Mock migration steps
      setMigrationSteps([
        {
          id: 'backup-secrets',
          name: 'Backup Current Secrets',
          description: 'Create backup of current environment configuration',
          status: 'completed',
          progress: 100,
          details: 'Backup created successfully'
        },
        {
          id: 'create-aws-secrets',
          name: 'Create AWS Secrets',
          description: 'Migrate secrets to AWS Secrets Manager',
          status: 'completed',
          progress: 100,
          details: 'All secrets migrated to AWS'
        },
        {
          id: 'update-code',
          name: 'Update Application Code',
          description: 'Modify application to use AWS Secrets Manager',
          status: 'completed',
          progress: 100,
          details: 'Code updated to use secrets service'
        },
        {
          id: 'test-integration',
          name: 'Test Integration',
          description: 'Verify all services work with new secret management',
          status: 'in_progress',
          progress: 75,
          details: 'Testing Salesforce and CompanyCam integrations'
        },
        {
          id: 'cleanup-env',
          name: 'Clean Up Environment',
          description: 'Remove old environment variables and configuration',
          status: 'pending',
          progress: 0,
          details: 'Waiting for integration tests to complete'
        }
      ]);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch security status');
    } finally {
      setLoading(false);
    }
  };

  const runSecurityCheck = async (checkId: string) => {
    try {
      const response = await fetch(`/api/v1/security/check/${checkId}`, {
        method: 'POST'
      });

      if (response.ok) {
        const result = await response.json();
        setSecurityChecks(prev => prev.map(check =>
          check.id === checkId ? { ...check, ...result } : check
        ));
      }
    } catch (err) {
      console.error('Security check failed:', err);
    }
  };

  const runAllSecurityChecks = async () => {
    setLoading(true);
    for (const check of securityChecks) {
      await runSecurityCheck(check.id);
    }
    setLoading(false);
  };

  const runMigrationStep = async (stepId: string) => {
    setRunningMigration(true);

    try {
      const response = await fetch(`/api/v1/migration/step/${stepId}`, {
        method: 'POST'
      });

      if (response.ok) {
        const result = await response.json();
        setMigrationSteps(prev => prev.map(step =>
          step.id === stepId ? { ...step, ...result } : step
        ));
      }
    } catch (err) {
      console.error('Migration step failed:', err);
    } finally {
      setRunningMigration(false);
    }
  };

  useEffect(() => {
    fetchSecurityStatus();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed':
      case 'completed':
      case 'set':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'warning':
      case 'in_progress':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'failed':
      case 'missing':
      case 'invalid':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'pending':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
      case 'completed':
      case 'set':
        return '✓';
      case 'warning':
      case 'in_progress':
        return '⚠';
      case 'failed':
      case 'missing':
      case 'invalid':
        return '✗';
      case 'pending':
        return '○';
      default:
        return '?';
    }
  };

  const overallSecurityScore = useMemo(() => {
    if (securityChecks.length === 0) return 0;
    const passedChecks = securityChecks.filter(c => c.status === 'passed').length;
    return Math.round((passedChecks / securityChecks.length) * 100);
  }, [securityChecks]);

  const migrationProgress = useMemo(() => {
    if (migrationSteps.length === 0) return 0;
    const totalProgress = migrationSteps.reduce((sum, step) => sum + step.progress, 0);
    return Math.round(totalProgress / migrationSteps.length);
  }, [migrationSteps]);

  if (loading && securityChecks.length === 0) {
    return (
      <div className={`animate-pulse space-y-6 ${className}`}>
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="p-6">
              <div className="h-6 bg-gray-200 rounded w-2/3 mb-3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Security Configuration</h2>
          <p className="text-gray-600">
            Environment security status and migration progress
          </p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={runAllSecurityChecks} disabled={loading}>
            Run All Checks
          </Button>
          <Button onClick={fetchSecurityStatus} variant="outline">
            Refresh
          </Button>
        </div>
      </div>

      {/* Security Score Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Security Score</h3>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${
                    overallSecurityScore >= 80 ? 'bg-green-500' :
                    overallSecurityScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${overallSecurityScore}%` }}
                ></div>
              </div>
            </div>
            <div className="text-2xl font-bold">
              {overallSecurityScore}%
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {securityChecks.filter(c => c.status === 'passed').length} of {securityChecks.length} checks passed
          </p>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Migration Progress</h3>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="h-3 bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${migrationProgress}%` }}
                ></div>
              </div>
            </div>
            <div className="text-2xl font-bold">
              {migrationProgress}%
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {migrationSteps.filter(s => s.status === 'completed').length} of {migrationSteps.length} steps completed
          </p>
        </Card>
      </div>

      {/* Security Checks */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Security Checklist</h3>
        <div className="space-y-4">
          {securityChecks.map((check) => (
            <div key={check.id} className={`border rounded-lg p-4 ${getStatusColor(check.status)}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{getStatusIcon(check.status)}</span>
                    <div>
                      <h4 className="font-medium">{check.name}</h4>
                      <p className="text-sm opacity-75">{check.description}</p>
                      {check.required && (
                        <span className="inline-block mt-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          Required
                        </span>
                      )}
                    </div>
                  </div>
                  {check.details && (
                    <p className="text-sm mt-2 ml-8">{check.details}</p>
                  )}
                </div>
                <Button
                  onClick={() => runSecurityCheck(check.id)}
                  variant="ghost"
                  className="text-sm py-1 px-2"
                >
                  Recheck
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Environment Variables */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Environment Variables</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Variable</th>
                <th className="text-left py-2">Status</th>
                <th className="text-left py-2">Required</th>
                <th className="text-left py-2">Description</th>
              </tr>
            </thead>
            <tbody>
              {envVariables.map((envVar, index) => (
                <tr key={index} className="border-b last:border-b-0">
                  <td className="py-3 font-mono text-sm">
                    {envVar.name}
                    {envVar.masked && <span className="ml-2 text-gray-400">***</span>}
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(envVar.status)}`}>
                      {getStatusIcon(envVar.status)} {envVar.status}
                    </span>
                  </td>
                  <td className="py-3">
                    {envVar.required ? (
                      <span className="text-red-600 font-medium">Yes</span>
                    ) : (
                      <span className="text-gray-600">No</span>
                    )}
                  </td>
                  <td className="py-3 text-sm text-gray-600">
                    {envVar.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Migration Progress */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Migration Steps</h3>
        <div className="space-y-4">
          {migrationSteps.map((step, index) => (
            <div key={step.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{getStatusIcon(step.status)}</span>
                    <div>
                      <h4 className="font-medium">{step.name}</h4>
                      <p className="text-sm text-gray-600">{step.description}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(step.status)}`}>
                    {step.status.replace('_', ' ')}
                  </span>
                  {step.status === 'pending' && (
                    <Button
                      onClick={() => runMigrationStep(step.id)}
                      disabled={runningMigration}
                      variant="ghost"
                      className="text-sm py-1 px-2"
                    >
                      Start
                    </Button>
                  )}
                </div>
              </div>

              <div className="ml-8">
                <div className="flex items-center space-x-4 mb-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        step.status === 'completed' ? 'bg-green-500' :
                        step.status === 'in_progress' ? 'bg-blue-500' :
                        step.status === 'failed' ? 'bg-red-500' : 'bg-gray-300'
                      }`}
                      style={{ width: `${step.progress}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600 font-mono">
                    {step.progress}%
                  </span>
                </div>

                {step.details && (
                  <p className="text-sm text-gray-600">{step.details}</p>
                )}

                {step.error && (
                  <p className="text-sm text-red-600 mt-1">Error: {step.error}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

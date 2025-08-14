'use client';

import React, { useEffect, useState } from 'react';
import { useProductionStore } from '@/stores/useProductionStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { APIKey } from '@/lib/types/production';
import {
  PlusIcon,
  EyeIcon,
  KeyIcon,
  TrashIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  ChartBarIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';

interface KeyFormData {
  name: string;
  permissions: string[];
  expiresAt?: string;
  rateLimits: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
}

interface KeyCreatedData {
  key: string;
  secret: string;
}

export function APIKeyManager() {
  const {
    apiKeys,
    fetchAPIKeys,
    createAPIKey,
    rotateAPIKey,
    revokeAPIKey,
    fetchAPIKeyUsage,
  } = useProductionStore();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showKeyDetails, setShowKeyDetails] = useState<string | null>(null);
  const [showUsageDialog, setShowUsageDialog] = useState<string | null>(null);
  const [keyForm, setKeyForm] = useState<KeyFormData>({
    name: '',
    permissions: [],
    rateLimits: {
      requestsPerMinute: 100,
      requestsPerHour: 1000,
      requestsPerDay: 10000,
    },
  });
  const [createdKey, setCreatedKey] = useState<KeyCreatedData | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  const availablePermissions = [
    'read:connections',
    'write:connections',
    'read:workflows',
    'write:workflows',
    'read:metrics',
    'write:alerts',
    'read:security',
    'write:security',
    'admin:all',
  ];

  useEffect(() => {
    fetchAPIKeys();
  }, [fetchAPIKeys]);

  const handleCreateKey = async () => {
    try {
      setProcessing('create');
      const result = await createAPIKey(keyForm);
      setCreatedKey(result);
      setShowCreateDialog(false);
      setKeyForm({
        name: '',
        permissions: [],
        rateLimits: {
          requestsPerMinute: 100,
          requestsPerHour: 1000,
          requestsPerDay: 10000,
        },
      });
    } catch (error) {
      console.error('Failed to create API key:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleRotateKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to rotate this API key? The old key will be invalidated.')) {
      return;
    }

    try {
      setProcessing(`rotate-${keyId}`);
      const result = await rotateAPIKey(keyId);
      setCreatedKey(result);
    } catch (error) {
      console.error('Failed to rotate API key:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return;
    }

    try {
      setProcessing(`revoke-${keyId}`);
      await revokeAPIKey(keyId);
    } catch (error) {
      console.error('Failed to revoke API key:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleShowUsage = async (keyId: string) => {
    setShowUsageDialog(keyId);
    await fetchAPIKeyUsage(keyId);
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const getStatusBadge = (status: APIKey['status']) => {
    const variants = {
      active: 'bg-green-100 text-green-800',
      revoked: 'bg-red-100 text-red-800',
      expired: 'bg-yellow-100 text-yellow-800',
    };
    return variants[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const isExpiringSoon = (expiresAt?: string) => {
    if (!expiresAt) return false;
    const expirationDate = new Date(expiresAt);
    const now = new Date();
    const daysUntilExpiration = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiration <= 30 && daysUntilExpiration > 0;
  };

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Key Management</h1>
          <p className="text-gray-600">Create and manage API keys for external integrations</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="flex items-center gap-2">
          <PlusIcon className="h-4 w-4" />
          Create API Key
        </Button>
      </div>

      {/* API Keys List */}
      <div className="space-y-4">
        {apiKeys.isLoading ? (
          <Card className="p-6 flex items-center justify-center">
            <LoadingSpinner size="sm" />
          </Card>
        ) : apiKeys.keys.length === 0 ? (
          <Card className="p-8 text-center">
            <KeyIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No API Keys</h3>
            <p className="text-gray-600 mb-6">
              Create your first API key to start integrating with external services
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>Create API Key</Button>
          </Card>
        ) : (
          apiKeys.keys.map((key) => (
            <Card key={key.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">{key.name}</h3>
                    <Badge className={getStatusBadge(key.status)}>
                      {key.status}
                    </Badge>
                    {isExpiringSoon(key.expiresAt) && (
                      <Badge className="bg-yellow-100 text-yellow-800">
                        <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                        Expires Soon
                      </Badge>
                    )}
                    {isExpired(key.expiresAt) && (
                      <Badge className="bg-red-100 text-red-800">
                        <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                        Expired
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Key Prefix</p>
                      <p className="text-sm text-gray-900 font-mono">{key.keyPrefix}...</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Created</p>
                      <p className="text-sm text-gray-900">{formatDate(key.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Last Used</p>
                      <p className="text-sm text-gray-900">{formatDate(key.lastUsedAt)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Expires</p>
                      <p className="text-sm text-gray-900">
                        {key.expiresAt ? formatDate(key.expiresAt) : 'Never'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-sm">
                    <div>
                      <span className="font-medium text-gray-500">Usage (This Month): </span>
                      <span className="text-gray-900">{key.usage.thisMonth.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500">Permissions: </span>
                      <span className="text-gray-900">{key.permissions.length}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mt-3">
                    {key.permissions.slice(0, 5).map((permission) => (
                      <Badge key={permission} variant="outline" className="text-xs">
                        {permission}
                      </Badge>
                    ))}
                    {key.permissions.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{key.permissions.length - 5} more
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleShowUsage(key.id)}
                  >
                    <ChartBarIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowKeyDetails(key.id)}
                  >
                    <EyeIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRotateKey(key.id)}
                    disabled={
                      key.status !== 'active' || processing === `rotate-${key.id}`
                    }
                  >
                    {processing === `rotate-${key.id}` ? (
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowPathIcon className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRevokeKey(key.id)}
                    disabled={
                      key.status !== 'active' || processing === `revoke-${key.id}`
                    }
                    className="text-red-600 hover:text-red-700"
                  >
                    {processing === `revoke-${key.id}` ? (
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    ) : (
                      <TrashIcon className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Create API Key Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <div className="sm:max-w-lg">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900">Create API Key</h3>
            <p className="text-sm text-gray-600">
              Create a new API key for external integrations
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Key Name</Label>
              <Input
                id="name"
                value={keyForm.name}
                onChange={(e) => setKeyForm({ ...keyForm, name: e.target.value })}
                placeholder="Production Integration"
              />
            </div>

            <div>
              <Label htmlFor="permissions">Permissions</Label>
              <div className="mt-2 space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3">
                {availablePermissions.map((permission) => (
                  <div key={permission} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={permission}
                      checked={keyForm.permissions.includes(permission)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setKeyForm({
                            ...keyForm,
                            permissions: [...keyForm.permissions, permission],
                          });
                        } else {
                          setKeyForm({
                            ...keyForm,
                            permissions: keyForm.permissions.filter((p) => p !== permission),
                          });
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor={permission} className="text-sm font-mono">
                      {permission}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="expiresAt">Expiration Date (Optional)</Label>
              <Input
                id="expiresAt"
                type="date"
                value={keyForm.expiresAt || ''}
                onChange={(e) =>
                  setKeyForm({ ...keyForm, expiresAt: e.target.value || undefined })
                }
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div>
              <Label>Rate Limits</Label>
              <div className="grid grid-cols-3 gap-3 mt-2">
                <div>
                  <Label htmlFor="perMinute" className="text-xs">
                    Per Minute
                  </Label>
                  <Input
                    id="perMinute"
                    type="number"
                    value={keyForm.rateLimits.requestsPerMinute}
                    onChange={(e) =>
                      setKeyForm({
                        ...keyForm,
                        rateLimits: {
                          ...keyForm.rateLimits,
                          requestsPerMinute: parseInt(e.target.value),
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="perHour" className="text-xs">
                    Per Hour
                  </Label>
                  <Input
                    id="perHour"
                    type="number"
                    value={keyForm.rateLimits.requestsPerHour}
                    onChange={(e) =>
                      setKeyForm({
                        ...keyForm,
                        rateLimits: {
                          ...keyForm.rateLimits,
                          requestsPerHour: parseInt(e.target.value),
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="perDay" className="text-xs">
                    Per Day
                  </Label>
                  <Input
                    id="perDay"
                    type="number"
                    value={keyForm.rateLimits.requestsPerDay}
                    onChange={(e) =>
                      setKeyForm({
                        ...keyForm,
                        rateLimits: {
                          ...keyForm.rateLimits,
                          requestsPerDay: parseInt(e.target.value),
                        },
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateKey}
              disabled={!keyForm.name || keyForm.permissions.length === 0 || processing === 'create'}
            >
              {processing === 'create' ? (
                <ArrowPathIcon className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Create Key
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Key Created Dialog */}
      <Dialog open={!!createdKey} onOpenChange={() => setCreatedKey(null)}>
        <div className="sm:max-w-md">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900">API Key Created</h3>
            <p className="text-sm text-red-600">
              Save these credentials securely. You won't be able to see the secret again.
            </p>
          </div>

          {createdKey && (
            <div className="space-y-4">
              <div>
                <Label>API Key</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    value={createdKey.key}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(createdKey.key, 'key')}
                  >
                    {copiedField === 'key' ? (
                      <CheckIcon className="h-4 w-4 text-green-600" />
                    ) : (
                      <ClipboardDocumentIcon className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div>
                <Label>Secret</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    value={createdKey.secret}
                    readOnly
                    className="font-mono text-sm"
                    type="password"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(createdKey.secret, 'secret')}
                  >
                    {copiedField === 'secret' ? (
                      <CheckIcon className="h-4 w-4 text-green-600" />
                    ) : (
                      <ClipboardDocumentIcon className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <div className="flex">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Important Security Notice
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <ul className="list-disc list-inside space-y-1">
                        <li>Store these credentials securely</li>
                        <li>Never commit them to version control</li>
                        <li>The secret cannot be recovered if lost</li>
                        <li>You can rotate the key if needed</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end mt-6">
            <Button onClick={() => setCreatedKey(null)}>I've Saved The Credentials</Button>
          </div>
        </div>
      </Dialog>

      {/* Key Details Dialog */}
      {showKeyDetails && (
        <Dialog open={!!showKeyDetails} onOpenChange={() => setShowKeyDetails(null)}>
          <div className="sm:max-w-lg">
            {(() => {
              const key = apiKeys.keys.find((k) => k.id === showKeyDetails);
              if (!key) return null;

              return (
                <div>
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-900">API Key Details</h3>
                    <p className="text-sm text-gray-600">{key.name}</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label>Status</Label>
                      <Badge className={cn('mt-1', getStatusBadge(key.status))}>
                        {key.status}
                      </Badge>
                    </div>

                    <div>
                      <Label>Key Prefix</Label>
                      <p className="text-sm text-gray-900 mt-1 font-mono">{key.keyPrefix}...</p>
                    </div>

                    <div>
                      <Label>Permissions</Label>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {key.permissions.map((permission) => (
                          <Badge key={permission} variant="outline" className="text-xs">
                            {permission}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label>Rate Limits</Label>
                      <div className="mt-2 space-y-1 text-sm">
                        <p>
                          <span className="font-medium">Per Minute:</span>{' '}
                          {key.rateLimits.requestsPerMinute.toLocaleString()}
                        </p>
                        <p>
                          <span className="font-medium">Per Hour:</span>{' '}
                          {key.rateLimits.requestsPerHour.toLocaleString()}
                        </p>
                        <p>
                          <span className="font-medium">Per Day:</span>{' '}
                          {key.rateLimits.requestsPerDay.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div>
                      <Label>Usage Statistics</Label>
                      <div className="mt-2 space-y-1 text-sm">
                        <p>
                          <span className="font-medium">Total:</span>{' '}
                          {key.usage.total.toLocaleString()}
                        </p>
                        <p>
                          <span className="font-medium">This Month:</span>{' '}
                          {key.usage.thisMonth.toLocaleString()}
                        </p>
                        <p>
                          <span className="font-medium">This Week:</span>{' '}
                          {key.usage.thisWeek.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Created</Label>
                        <p className="text-sm text-gray-900 mt-1">
                          {new Date(key.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <Label>Last Used</Label>
                        <p className="text-sm text-gray-900 mt-1">
                          {key.lastUsedAt
                            ? new Date(key.lastUsedAt).toLocaleString()
                            : 'Never'}
                        </p>
                      </div>
                    </div>

                    {key.expiresAt && (
                      <div>
                        <Label>Expires</Label>
                        <p className="text-sm text-gray-900 mt-1">
                          {new Date(key.expiresAt).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <Button variant="outline" onClick={() => setShowKeyDetails(null)}>
                      Close
                    </Button>
                    {key.status === 'active' && (
                      <Button onClick={() => handleShowUsage(key.id)}>
                        <ChartBarIcon className="h-4 w-4 mr-2" />
                        View Usage
                      </Button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </Dialog>
      )}

      {/* Usage Dialog */}
      {showUsageDialog && (
        <Dialog open={!!showUsageDialog} onOpenChange={() => setShowUsageDialog(null)}>
          <div className="sm:max-w-2xl">
            {(() => {
              const key = apiKeys.keys.find((k) => k.id === showUsageDialog);
              const usage = apiKeys.usage[showUsageDialog!] || [];

              if (!key) return null;

              return (
                <div>
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-900">Usage Statistics</h3>
                    <p className="text-sm text-gray-600">{key.name}</p>
                  </div>

                  <div className="space-y-6">
                    {/* Usage Summary */}
                    <div className="grid grid-cols-3 gap-4">
                      <Card className="p-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-900">
                            {key.usage.total.toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-600">Total Requests</p>
                        </div>
                      </Card>
                      <Card className="p-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-900">
                            {key.usage.thisMonth.toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-600">This Month</p>
                        </div>
                      </Card>
                      <Card className="p-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-900">
                            {key.usage.thisWeek.toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-600">This Week</p>
                        </div>
                      </Card>
                    </div>

                    {/* Recent Usage */}
                    {usage.length > 0 ? (
                      <div>
                        <h4 className="text-md font-medium text-gray-900 mb-3">
                          Recent Usage
                        </h4>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {usage.slice(0, 10).map((entry, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                            >
                              <div>
                                <p className="font-medium text-gray-900">
                                  {new Date(entry.timestamp).toLocaleDateString()}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {entry.requests} requests
                                  {entry.errors > 0 && `, ${entry.errors} errors`}
                                </p>
                              </div>
                              <div className="text-right">
                                <div className="text-sm text-gray-500">
                                  Top Endpoints:
                                </div>
                                <div className="text-xs text-gray-400">
                                  {Object.entries(entry.endpoints)
                                    .sort(([, a], [, b]) => (b as number) - (a as number))
                                    .slice(0, 2)
                                    .map(([endpoint, count]) => `${endpoint}: ${count}`)
                                    .join(', ')}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No usage data available</p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end mt-6">
                    <Button onClick={() => setShowUsageDialog(null)}>Close</Button>
                  </div>
                </div>
              );
            })()}
          </div>
        </Dialog>
      )}
    </div>
  );
}

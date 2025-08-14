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
import type { SecurityScan, Vulnerability, ScanSummary } from '@/lib/types/production';
import {
  PlusIcon,
  EyeIcon,
  TrashIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
  ClockIcon,
  PlayIcon,
  StopIcon,
  CheckCircleIcon,
  XCircleIcon,
  BugAntIcon,
  DocumentTextIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

interface ScanFormData {
  name: string;
  type: 'vulnerability' | 'compliance' | 'dependency' | 'secret';
  target: {
    type: 'repository' | 'deployment' | 'container' | 'api';
    identifier: string;
  };
  config: {
    depth: 'shallow' | 'deep';
    includeDependencies: boolean;
    excludePatterns?: string[];
  };
}

interface VulnerabilityFilterData {
  severity: string;
  status: string;
  category: string;
  search: string;
}

export function SecurityScanner() {
  const {
    security,
    fetchSecurityScans,
    createSecurityScan,
    cancelSecurityScan,
    fetchVulnerabilities,
    updateVulnerabilityStatus,
  } = useProductionStore();

  const [showCreateScan, setShowCreateScan] = useState(false);
  const [showScanDetails, setShowScanDetails] = useState<string | null>(null);
  const [showVulnerabilityDetails, setShowVulnerabilityDetails] = useState<string | null>(null);
  const [showVulnerabilityList, setShowVulnerabilityList] = useState(false);
  const [scanForm, setScanForm] = useState<ScanFormData>({
    name: '',
    type: 'vulnerability',
    target: { type: 'repository', identifier: '' },
    config: { depth: 'deep', includeDependencies: true },
  });
  const [vulnerabilityFilter, setVulnerabilityFilter] = useState<VulnerabilityFilterData>({
    severity: 'all',
    status: 'all',
    category: 'all',
    search: '',
  });
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchSecurityScans();
    fetchVulnerabilities();
  }, [fetchSecurityScans, fetchVulnerabilities]);

  const handleCreateScan = async () => {
    try {
      setProcessing('create');
      await createSecurityScan(scanForm);
      setShowCreateScan(false);
      setScanForm({
        name: '',
        type: 'vulnerability',
        target: { type: 'repository', identifier: '' },
        config: { depth: 'deep', includeDependencies: true },
      });
    } catch (error) {
      console.error('Failed to create security scan:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleCancelScan = async (scanId: string) => {
    if (confirm('Are you sure you want to cancel this scan?')) {
      try {
        setProcessing(`cancel-${scanId}`);
        await cancelSecurityScan(scanId);
      } catch (error) {
        console.error('Failed to cancel scan:', error);
      } finally {
        setProcessing(null);
      }
    }
  };

  const handleUpdateVulnerabilityStatus = async (
    vulnerabilityId: string,
    status: Vulnerability['status']
  ) => {
    try {
      await updateVulnerabilityStatus(vulnerabilityId, status);
    } catch (error) {
      console.error('Failed to update vulnerability status:', error);
    }
  };

  const getScanStatusIcon = (status: SecurityScan['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'running':
        return <ArrowPathIcon className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'cancelled':
        return <StopIcon className="h-5 w-5 text-yellow-500" />;
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getScanStatusBadge = (status: SecurityScan['status']) => {
    const variants = {
      completed: 'bg-green-100 text-green-800',
      running: 'bg-blue-100 text-blue-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-yellow-100 text-yellow-800',
      pending: 'bg-gray-100 text-gray-800',
    };
    return variants[status] || 'bg-gray-100 text-gray-800';
  };

  const getSeverityBadge = (severity: Vulnerability['severity']) => {
    const variants = {
      critical: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-blue-100 text-blue-800',
    };
    return variants[severity] || 'bg-gray-100 text-gray-800';
  };

  const getVulnerabilityStatusBadge = (status: Vulnerability['status']) => {
    const variants = {
      open: 'bg-red-100 text-red-800',
      fixed: 'bg-green-100 text-green-800',
      accepted: 'bg-yellow-100 text-yellow-800',
      false_positive: 'bg-gray-100 text-gray-800',
    };
    return variants[status] || 'bg-gray-100 text-gray-800';
  };

  const getScanTypeIcon = (type: SecurityScan['type']) => {
    switch (type) {
      case 'vulnerability':
        return <BugAntIcon className="h-5 w-5" />;
      case 'compliance':
        return <DocumentTextIcon className="h-5 w-5" />;
      case 'dependency':
        return <ShieldCheckIcon className="h-5 w-5" />;
      case 'secret':
        return <ShieldExclamationIcon className="h-5 w-5" />;
      default:
        return <ShieldCheckIcon className="h-5 w-5" />;
    }
  };

  const filteredVulnerabilities = security.vulnerabilities.filter((vuln) => {
    const matchesSeverity = vulnerabilityFilter.severity === 'all' || vuln.severity === vulnerabilityFilter.severity;
    const matchesStatus = vulnerabilityFilter.status === 'all' || vuln.status === vulnerabilityFilter.status;
    const matchesCategory = vulnerabilityFilter.category === 'all' || vuln.category === vulnerabilityFilter.category;
    const matchesSearch = !vulnerabilityFilter.search || 
      vuln.title.toLowerCase().includes(vulnerabilityFilter.search.toLowerCase()) ||
      vuln.description.toLowerCase().includes(vulnerabilityFilter.search.toLowerCase());
    
    return matchesSeverity && matchesStatus && matchesCategory && matchesSearch;
  });

  const severityCounts = security.vulnerabilities.reduce((acc, vuln) => {
    acc[vuln.severity] = (acc[vuln.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusCounts = security.vulnerabilities.reduce((acc, vuln) => {
    acc[vuln.status] = (acc[vuln.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000);
    
    if (duration < 60) return `${duration}s`;
    if (duration < 3600) return `${Math.floor(duration / 60)}m`;
    return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Security Scanner</h1>
          <p className="text-gray-600">Scan and manage security vulnerabilities</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowVulnerabilityList(true)}
            className="flex items-center gap-2"
          >
            <BugAntIcon className="h-4 w-4" />
            View Vulnerabilities
          </Button>
          <Button
            onClick={() => setShowCreateScan(true)}
            className="flex items-center gap-2"
          >
            <PlusIcon className="h-4 w-4" />
            Start Scan
          </Button>
        </div>
      </div>

      {/* Security Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Vulnerabilities</p>
              <p className="text-2xl font-bold text-gray-900">
                {security.vulnerabilities.length}
              </p>
            </div>
            <BugAntIcon className="h-8 w-8 text-red-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Critical</p>
              <p className="text-2xl font-bold text-red-600">
                {severityCounts.critical || 0}
              </p>
            </div>
            <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">High</p>
              <p className="text-2xl font-bold text-orange-600">
                {severityCounts.high || 0}
              </p>
            </div>
            <ExclamationTriangleIcon className="h-8 w-8 text-orange-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Fixed</p>
              <p className="text-2xl font-bold text-green-600">
                {statusCounts.fixed || 0}
              </p>
            </div>
            <CheckCircleIcon className="h-8 w-8 text-green-500" />
          </div>
        </Card>
      </div>

      {/* Recent Scans */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Recent Scans</h2>
          <Button
            variant="outline"
            onClick={() => fetchSecurityScans()}
            className="flex items-center gap-2"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        <div className="space-y-4">
          {security.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="sm" />
            </div>
          ) : security.scans.length === 0 ? (
            <div className="text-center py-8">
              <ShieldCheckIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No security scans found</p>
              <Button onClick={() => setShowCreateScan(true)} className="mt-4">
                Start Your First Scan
              </Button>
            </div>
          ) : (
            security.scans.map((scan) => (
              <div
                key={scan.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {getScanTypeIcon(scan.type)}
                    {getScanStatusIcon(scan.status)}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{scan.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {scan.type}
                      </Badge>
                      <Badge className={getScanStatusBadge(scan.status)}>
                        {scan.status}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {scan.target.type}: {scan.target.identifier}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Started {new Date(scan.startedAt).toLocaleString()}
                      {scan.completedAt && ` • ${formatDuration(scan.startedAt, scan.completedAt)}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {scan.results && (
                    <div className="text-right text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-red-600 font-medium">
                          {scan.results.summary.severityBreakdown.critical || 0} Critical
                        </span>
                        <span className="text-orange-600 font-medium">
                          {scan.results.summary.severityBreakdown.high || 0} High
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {scan.results.summary.totalVulnerabilities} total issues
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowScanDetails(scan.id)}
                    >
                      <EyeIcon className="h-4 w-4" />
                    </Button>
                    {(scan.status === 'running' || scan.status === 'pending') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelScan(scan.id)}
                        disabled={processing === `cancel-${scan.id}`}
                        className="text-red-600"
                      >
                        {processing === `cancel-${scan.id}` ? (
                          <ArrowPathIcon className="h-4 w-4 animate-spin" />
                        ) : (
                          <StopIcon className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Create Scan Dialog */}
      <Dialog open={showCreateScan} onOpenChange={setShowCreateScan}>
        <div className="sm:max-w-md">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900">Start Security Scan</h3>
            <p className="text-sm text-gray-600">Configure a new security scan</p>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="scanName">Scan Name</Label>
              <Input
                id="scanName"
                value={scanForm.name}
                onChange={(e) => setScanForm({ ...scanForm, name: e.target.value })}
                placeholder="Production Security Scan"
              />
            </div>

            <div>
              <Label htmlFor="scanType">Scan Type</Label>
              <Select
                value={scanForm.type}
                onValueChange={(value: any) => setScanForm({ ...scanForm, type: value })}
              >
                <option value="vulnerability">Vulnerability Scan</option>
                <option value="compliance">Compliance Check</option>
                <option value="dependency">Dependency Audit</option>
                <option value="secret">Secret Detection</option>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="targetType">Target Type</Label>
                <Select
                  value={scanForm.target.type}
                  onValueChange={(value: any) =>
                    setScanForm({
                      ...scanForm,
                      target: { ...scanForm.target, type: value },
                    })
                  }
                >
                  <option value="repository">Repository</option>
                  <option value="deployment">Deployment</option>
                  <option value="container">Container</option>
                  <option value="api">API</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="targetIdentifier">Target Identifier</Label>
                <Input
                  id="targetIdentifier"
                  value={scanForm.target.identifier}
                  onChange={(e) =>
                    setScanForm({
                      ...scanForm,
                      target: { ...scanForm.target, identifier: e.target.value },
                    })
                  }
                  placeholder="github.com/org/repo"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="scanDepth">Scan Depth</Label>
              <Select
                value={scanForm.config.depth}
                onValueChange={(value: any) =>
                  setScanForm({
                    ...scanForm,
                    config: { ...scanForm.config, depth: value },
                  })
                }
              >
                <option value="shallow">Shallow (Fast)</option>
                <option value="deep">Deep (Comprehensive)</option>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="includeDependencies"
                checked={scanForm.config.includeDependencies}
                onCheckedChange={(checked) =>
                  setScanForm({
                    ...scanForm,
                    config: { ...scanForm.config, includeDependencies: checked },
                  })
                }
              />
              <Label htmlFor="includeDependencies">Include dependencies</Label>
            </div>

            <div>
              <Label htmlFor="excludePatterns">Exclude Patterns (Optional)</Label>
              <textarea
                id="excludePatterns"
                className="w-full mt-1 p-2 border border-gray-300 rounded-md text-sm"
                rows={3}
                value={scanForm.config.excludePatterns?.join('\n') || ''}
                onChange={(e) =>
                  setScanForm({
                    ...scanForm,
                    config: {
                      ...scanForm.config,
                      excludePatterns: e.target.value
                        .split('\n')
                        .filter(pattern => pattern.trim()),
                    },
                  })
                }
                placeholder="*.test.js&#10;node_modules/**&#10;*.md"
              />
              <p className="text-xs text-gray-500 mt-1">One pattern per line</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setShowCreateScan(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateScan}
              disabled={
                !scanForm.name ||
                !scanForm.target.identifier ||
                processing === 'create'
              }
            >
              {processing === 'create' ? (
                <ArrowPathIcon className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <PlayIcon className="h-4 w-4 mr-2" />
              )}
              Start Scan
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Scan Details Dialog */}
      {showScanDetails && (
        <Dialog open={!!showScanDetails} onOpenChange={() => setShowScanDetails(null)}>
          <div className="sm:max-w-2xl">
            {(() => {
              const scan = security.scans.find((s) => s.id === showScanDetails);
              if (!scan) return null;

              return (
                <div>
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-900">Scan Details</h3>
                    <p className="text-sm text-gray-600">{scan.name}</p>
                  </div>

                  <div className="space-y-6">
                    {/* Scan Information */}
                    <Card className="p-4">
                      <h4 className="font-medium text-gray-900 mb-3">Scan Information</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Type:</span>
                          <span className="ml-2 text-gray-900 capitalize">{scan.type}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Status:</span>
                          <Badge className={cn('ml-2', getScanStatusBadge(scan.status))}>
                            {scan.status}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-gray-600">Target:</span>
                          <span className="ml-2 text-gray-900">
                            {scan.target.type}: {scan.target.identifier}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Depth:</span>
                          <span className="ml-2 text-gray-900 capitalize">
                            {scan.config.depth}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Started:</span>
                          <span className="ml-2 text-gray-900">
                            {new Date(scan.startedAt).toLocaleString()}
                          </span>
                        </div>
                        {scan.completedAt && (
                          <div>
                            <span className="text-gray-600">Duration:</span>
                            <span className="ml-2 text-gray-900">
                              {formatDuration(scan.startedAt, scan.completedAt)}
                            </span>
                          </div>
                        )}
                      </div>
                    </Card>

                    {/* Results Summary */}
                    {scan.results && (
                      <Card className="p-4">
                        <h4 className="font-medium text-gray-900 mb-3">Results Summary</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-red-600">
                              {scan.results.summary.severityBreakdown.critical || 0}
                            </p>
                            <p className="text-sm text-gray-600">Critical</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-orange-600">
                              {scan.results.summary.severityBreakdown.high || 0}
                            </p>
                            <p className="text-sm text-gray-600">High</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-yellow-600">
                              {scan.results.summary.severityBreakdown.medium || 0}
                            </p>
                            <p className="text-sm text-gray-600">Medium</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-blue-600">
                              {scan.results.summary.severityBreakdown.low || 0}
                            </p>
                            <p className="text-sm text-gray-600">Low</p>
                          </div>
                        </div>
                      </Card>
                    )}

                    {/* Top Vulnerabilities */}
                    {scan.results && scan.results.vulnerabilities.length > 0 && (
                      <Card className="p-4">
                        <h4 className="font-medium text-gray-900 mb-3">
                          Top Vulnerabilities
                        </h4>
                        <div className="space-y-3 max-h-60 overflow-y-auto">
                          {scan.results.vulnerabilities
                            .slice(0, 5)
                            .map((vulnerability) => (
                              <div
                                key={vulnerability.id}
                                className="flex items-start justify-between p-3 bg-gray-50 rounded-md"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h5 className="font-medium text-gray-900 text-sm">
                                      {vulnerability.title}
                                    </h5>
                                    <Badge className={getSeverityBadge(vulnerability.severity)}>
                                      {vulnerability.severity}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-gray-600 line-clamp-2">
                                    {vulnerability.description}
                                  </p>
                                  {vulnerability.location.file && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      {vulnerability.location.file}
                                      {vulnerability.location.line && `:${vulnerability.location.line}`}
                                    </p>
                                  )}
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setShowVulnerabilityDetails(vulnerability.id)}
                                >
                                  <EyeIcon className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                        </div>
                      </Card>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <Button variant="outline" onClick={() => setShowScanDetails(null)}>
                      Close
                    </Button>
                    {scan.results && scan.results.vulnerabilities.length > 0 && (
                      <Button onClick={() => setShowVulnerabilityList(true)}>
                        <BugAntIcon className="h-4 w-4 mr-2" />
                        View All Vulnerabilities
                      </Button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </Dialog>
      )}

      {/* Vulnerability List Dialog */}
      <Dialog open={showVulnerabilityList} onOpenChange={setShowVulnerabilityList}>
        <div className="sm:max-w-6xl">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900">Vulnerabilities</h3>
            <p className="text-sm text-gray-600">
              Manage and track security vulnerabilities
            </p>
          </div>

          {/* Filters */}
          <Card className="p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="severityFilter">Severity</Label>
                <Select
                  value={vulnerabilityFilter.severity}
                  onValueChange={(value) =>
                    setVulnerabilityFilter({ ...vulnerabilityFilter, severity: value })
                  }
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="statusFilter">Status</Label>
                <Select
                  value={vulnerabilityFilter.status}
                  onValueChange={(value) =>
                    setVulnerabilityFilter({ ...vulnerabilityFilter, status: value })
                  }
                >
                  <option value="all">All Statuses</option>
                  <option value="open">Open</option>
                  <option value="fixed">Fixed</option>
                  <option value="accepted">Accepted</option>
                  <option value="false_positive">False Positive</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="categoryFilter">Category</Label>
                <Select
                  value={vulnerabilityFilter.category}
                  onValueChange={(value) =>
                    setVulnerabilityFilter({ ...vulnerabilityFilter, category: value })
                  }
                >
                  <option value="all">All Categories</option>
                  <option value="injection">Injection</option>
                  <option value="broken_auth">Broken Authentication</option>
                  <option value="sensitive_data">Sensitive Data</option>
                  <option value="xss">Cross-Site Scripting</option>
                  <option value="security_misconfig">Security Misconfiguration</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="searchFilter">Search</Label>
                <Input
                  id="searchFilter"
                  value={vulnerabilityFilter.search}
                  onChange={(e) =>
                    setVulnerabilityFilter({ ...vulnerabilityFilter, search: e.target.value })
                  }
                  placeholder="Search vulnerabilities..."
                />
              </div>
            </div>
          </Card>

          {/* Vulnerability List */}
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {filteredVulnerabilities.length === 0 ? (
              <div className="text-center py-8">
                <ShieldCheckIcon className="h-12 w-12 text-green-400 mx-auto mb-4" />
                <p className="text-gray-600">No vulnerabilities found</p>
              </div>
            ) : (
              filteredVulnerabilities.map((vulnerability) => (
                <Card key={vulnerability.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-gray-900">
                          {vulnerability.title}
                        </h4>
                        <Badge className={getSeverityBadge(vulnerability.severity)}>
                          {vulnerability.severity}
                        </Badge>
                        <Badge className={getVulnerabilityStatusBadge(vulnerability.status)}>
                          {vulnerability.status.replace('_', ' ')}
                        </Badge>
                        {vulnerability.cve && (
                          <Badge variant="outline" className="text-xs">
                            {vulnerability.cve}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {vulnerability.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Category: {vulnerability.category.replace('_', ' ')}</span>
                        {vulnerability.location.file && (
                          <span>
                            File: {vulnerability.location.file}
                            {vulnerability.location.line && `:${vulnerability.location.line}`}
                          </span>
                        )}
                        <span>
                          First detected: {new Date(vulnerability.firstDetected).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Select
                        value={vulnerability.status}
                        onValueChange={(value: any) =>
                          handleUpdateVulnerabilityStatus(vulnerability.id, value)
                        }
                      >
                        <option value="open">Open</option>
                        <option value="fixed">Fixed</option>
                        <option value="accepted">Accepted</option>
                        <option value="false_positive">False Positive</option>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowVulnerabilityDetails(vulnerability.id)}
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          <div className="flex justify-between items-center mt-6">
            <p className="text-sm text-gray-600">
              Showing {filteredVulnerabilities.length} of {security.vulnerabilities.length} vulnerabilities
            </p>
            <Button onClick={() => setShowVulnerabilityList(false)}>Close</Button>
          </div>
        </div>
      </Dialog>

      {/* Vulnerability Details Dialog */}
      {showVulnerabilityDetails && (
        <Dialog
          open={!!showVulnerabilityDetails}
          onOpenChange={() => setShowVulnerabilityDetails(null)}
        >
          <div className="sm:max-w-2xl">
            {(() => {
              const vulnerability = security.vulnerabilities.find(
                (v) => v.id === showVulnerabilityDetails
              );
              if (!vulnerability) return null;

              return (
                <div>
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-900">
                      Vulnerability Details
                    </h3>
                    <p className="text-sm text-gray-600">{vulnerability.title}</p>
                  </div>

                  <div className="space-y-6">
                    {/* Overview */}
                    <Card className="p-4">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={getSeverityBadge(vulnerability.severity)}>
                              {vulnerability.severity}
                            </Badge>
                            <Badge className={getVulnerabilityStatusBadge(vulnerability.status)}>
                              {vulnerability.status.replace('_', ' ')}
                            </Badge>
                            {vulnerability.cve && (
                              <Badge variant="outline">{vulnerability.cve}</Badge>
                            )}
                          </div>
                          {vulnerability.score && (
                            <p className="text-sm text-gray-600">
                              CVSS Score: {vulnerability.score}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <h5 className="font-medium text-gray-900 mb-1">Description</h5>
                          <p className="text-sm text-gray-600">{vulnerability.description}</p>
                        </div>

                        <div>
                          <h5 className="font-medium text-gray-900 mb-1">Category</h5>
                          <p className="text-sm text-gray-600 capitalize">
                            {vulnerability.category.replace('_', ' ')}
                          </p>
                        </div>

                        <div>
                          <h5 className="font-medium text-gray-900 mb-1">Location</h5>
                          <div className="text-sm text-gray-600">
                            {vulnerability.location.file && (
                              <p>
                                File: {vulnerability.location.file}
                                {vulnerability.location.line && ` (Line ${vulnerability.location.line})`}
                              </p>
                            )}
                            {vulnerability.location.component && (
                              <p>Component: {vulnerability.location.component}</p>
                            )}
                            {vulnerability.location.dependency && (
                              <p>Dependency: {vulnerability.location.dependency}</p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h5 className="font-medium text-gray-900 mb-1">First Detected</h5>
                            <p className="text-sm text-gray-600">
                              {new Date(vulnerability.firstDetected).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <h5 className="font-medium text-gray-900 mb-1">Last Seen</h5>
                            <p className="text-sm text-gray-600">
                              {new Date(vulnerability.lastSeen).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Card>

                    {/* Remediation */}
                    {vulnerability.remediation && (
                      <Card className="p-4">
                        <h4 className="font-medium text-gray-900 mb-3">Remediation</h4>
                        <div className="space-y-3">
                          <div>
                            <h5 className="font-medium text-gray-900 mb-1">Description</h5>
                            <p className="text-sm text-gray-600">
                              {vulnerability.remediation.description}
                            </p>
                          </div>

                          <div>
                            <h5 className="font-medium text-gray-900 mb-1">Effort</h5>
                            <Badge
                              className={cn(
                                vulnerability.remediation.effort === 'low' && 'bg-green-100 text-green-800',
                                vulnerability.remediation.effort === 'medium' && 'bg-yellow-100 text-yellow-800',
                                vulnerability.remediation.effort === 'high' && 'bg-red-100 text-red-800'
                              )}
                            >
                              {vulnerability.remediation.effort}
                            </Badge>
                          </div>

                          {vulnerability.remediation.references.length > 0 && (
                            <div>
                              <h5 className="font-medium text-gray-900 mb-1">References</h5>
                              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                {vulnerability.remediation.references.map((ref, index) => (
                                  <li key={index}>
                                    <a
                                      href={ref}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:underline"
                                    >
                                      {ref}
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </Card>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setShowVulnerabilityDetails(null)}
                    >
                      Close
                    </Button>
                    <Select
                      value={vulnerability.status}
                      onValueChange={(value: any) => {
                        handleUpdateVulnerabilityStatus(vulnerability.id, value);
                        setShowVulnerabilityDetails(null);
                      }}
                    >
                      <option value="open">Mark as Open</option>
                      <option value="fixed">Mark as Fixed</option>
                      <option value="accepted">Mark as Accepted</option>
                      <option value="false_positive">Mark as False Positive</option>
                    </Select>
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
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Progress } from '../ui/Progress';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Extension, NetlifySite } from '../../types/netlify';
import { netlifyApi, handleApiError } from '../../lib/netlify-api';
import { cn } from '../../utils/cn';

interface BulkOperation {
  siteId: string;
  extensionId: string;
  action: 'enable' | 'disable';
}

interface DeploymentProgress {
  siteId: string;
  siteName: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  operations: {
    extensionId: string;
    extensionName: string;
    action: 'enable' | 'disable';
    status: 'pending' | 'in-progress' | 'completed' | 'failed';
    error?: string;
    startTime?: Date;
    endTime?: Date;
  }[];
  startTime?: Date;
  endTime?: Date;
  error?: string;
}

interface BulkDeploymentInterfaceProps {
  sites: NetlifySite[];
  availableExtensions: Extension[];
  onDeploymentComplete?: (results: DeploymentProgress[]) => void;
  className?: string;
}

const statusColors = {
  pending: 'text-light-secondary',
  'in-progress': 'text-operation-processing',
  completed: 'text-operation-complete',
  failed: 'text-operation-alert'
};

const statusIcons = {
  pending: '⏳',
  'in-progress': '🔄',
  completed: '✅',
  failed: '❌'
};

const BulkDeploymentInterface: React.FC<BulkDeploymentInterfaceProps> = ({
  sites,
  availableExtensions,
  onDeploymentComplete,
  className
}) => {
  const [selectedSites, setSelectedSites] = useState<Set<string>>(new Set());
  const [selectedExtensions, setSelectedExtensions] = useState<Map<string, 'enable' | 'disable'>>(new Map());
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentProgress, setDeploymentProgress] = useState<DeploymentProgress[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Reset deployment progress when not deploying
  useEffect(() => {
    if (!isDeploying) {
      setDeploymentProgress([]);
    }
  }, [isDeploying]);

  // Calculate deployment statistics
  const stats = useMemo(() => {
    const totalOperations = Array.from(selectedExtensions.keys()).length * selectedSites.size;
    const completedOperations = deploymentProgress.reduce((acc, site) =>
      acc + site.operations.filter(op => op.status === 'completed').length, 0);
    const failedOperations = deploymentProgress.reduce((acc, site) =>
      acc + site.operations.filter(op => op.status === 'failed').length, 0);
    const completedSites = deploymentProgress.filter(site => site.status === 'completed').length;
    const failedSites = deploymentProgress.filter(site => site.status === 'failed').length;

    return {
      totalOperations,
      completedOperations,
      failedOperations,
      completedSites,
      failedSites,
      progress: totalOperations > 0 ? (completedOperations + failedOperations) / totalOperations * 100 : 0
    };
  }, [selectedExtensions, selectedSites, deploymentProgress]);

  const handleSiteToggle = useCallback((siteId: string) => {
    setSelectedSites(prev => {
      const next = new Set(prev);
      if (next.has(siteId)) {
        next.delete(siteId);
      } else {
        next.add(siteId);
      }
      return next;
    });
  }, []);

  const handleSelectAllSites = useCallback(() => {
    if (selectedSites.size === sites.length) {
      setSelectedSites(new Set());
    } else {
      setSelectedSites(new Set(sites.map(site => site.id)));
    }
  }, [sites, selectedSites.size]);

  const handleExtensionToggle = useCallback((extensionId: string, action: 'enable' | 'disable') => {
    setSelectedExtensions(prev => {
      const next = new Map(prev);
      if (next.has(extensionId) && next.get(extensionId) === action) {
        next.delete(extensionId);
      } else {
        next.set(extensionId, action);
      }
      return next;
    });
  }, []);

  const handleBulkExtensionAction = useCallback((action: 'enable' | 'disable') => {
    const newSelections = new Map(selectedExtensions);
    availableExtensions.forEach(ext => {
      newSelections.set(ext.id, action);
    });
    setSelectedExtensions(newSelections);
  }, [availableExtensions, selectedExtensions]);

  const initializeDeploymentProgress = useCallback((): DeploymentProgress[] => {
    return Array.from(selectedSites).map(siteId => {
      const site = sites.find(s => s.id === siteId)!;
      return {
        siteId,
        siteName: site.name,
        status: 'pending',
        operations: Array.from(selectedExtensions.entries()).map(([extensionId, action]) => {
          const extension = availableExtensions.find(ext => ext.id === extensionId)!;
          return {
            extensionId,
            extensionName: extension.name,
            action,
            status: 'pending'
          };
        })
      };
    });
  }, [selectedSites, selectedExtensions, sites, availableExtensions]);

  const updateProgressForSite = useCallback((siteId: string, updates: Partial<DeploymentProgress>) => {
    setDeploymentProgress(prev => prev.map(site =>
      site.siteId === siteId ? { ...site, ...updates } : site
    ));
  }, []);

  const updateOperationProgress = useCallback((siteId: string, extensionId: string, updates: Partial<DeploymentProgress['operations'][0]>) => {
    setDeploymentProgress(prev => prev.map(site =>
      site.siteId === siteId
        ? {
            ...site,
            operations: site.operations.map(op =>
              op.extensionId === extensionId ? { ...op, ...updates } : op
            )
          }
        : site
    ));
  }, []);

  const executeBulkDeployment = useCallback(async () => {
    setIsDeploying(true);
    setError(null);

    const progress = initializeDeploymentProgress();
    setDeploymentProgress(progress);

    try {
      // Process each site sequentially to avoid overwhelming the API
      for (const siteProgress of progress) {
        updateProgressForSite(siteProgress.siteId, {
          status: 'in-progress',
          startTime: new Date()
        });

        let siteHasErrors = false;

        // Process extensions for this site
        for (const operation of siteProgress.operations) {
          updateOperationProgress(siteProgress.siteId, operation.extensionId, {
            status: 'in-progress',
            startTime: new Date()
          });

          try {
            if (operation.action === 'enable') {
              await netlifyApi.enableExtension(siteProgress.siteId, operation.extensionId);
            } else {
              await netlifyApi.disableExtension(siteProgress.siteId, operation.extensionId);
            }

            updateOperationProgress(siteProgress.siteId, operation.extensionId, {
              status: 'completed',
              endTime: new Date()
            });
          } catch (error) {
            siteHasErrors = true;
            updateOperationProgress(siteProgress.siteId, operation.extensionId, {
              status: 'failed',
              error: handleApiError(error),
              endTime: new Date()
            });
          }

          // Small delay between operations to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Update site completion status
        updateProgressForSite(siteProgress.siteId, {
          status: siteHasErrors ? 'failed' : 'completed',
          endTime: new Date()
        });

        // Delay between sites
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Call completion callback with final results
      if (onDeploymentComplete) {
        onDeploymentComplete(deploymentProgress);
      }
    } catch (error) {
      setError(handleApiError(error));
    } finally {
      setIsDeploying(false);
    }
  }, [initializeDeploymentProgress, updateProgressForSite, updateOperationProgress, onDeploymentComplete, deploymentProgress]);

  const resetDeployment = useCallback(() => {
    setSelectedSites(new Set());
    setSelectedExtensions(new Map());
    setDeploymentProgress([]);
    setError(null);
  }, []);

  const canStartDeployment = selectedSites.size > 0 && selectedExtensions.size > 0 && !isDeploying;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="mb-8">
        <h2 className="type-title text-light-primary mb-2">Bulk Deployment</h2>
        <p className="text-light-secondary">
          Deploy extensions to multiple sites simultaneously. Select sites and extensions, then execute the bulk deployment.
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <Card className="card-operational border-operation-alert/50 bg-operation-alert/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-operation-alert text-xl">⚠️</div>
                <div>
                  <h3 className="text-operation-alert font-medium mb-1">Deployment Error</h3>
                  <p className="text-sm text-light-secondary">{error}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setError(null)}
                className="border-operation-alert/30 text-operation-alert hover:bg-operation-alert/10"
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Site Selection */}
      <Card className="card-operational">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="type-subtitle text-light-primary">Target Sites ({selectedSites.size}/{sites.length})</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAllSites}
              className="border-interface-border/30 text-light-secondary hover:bg-interface-border/10"
            >
              {selectedSites.size === sites.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {sites.map(site => (
              <label key={site.id} className="flex items-center gap-3 p-3 rounded border border-interface-border/20 hover:border-operation-active/30 cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={selectedSites.has(site.id)}
                  onChange={() => handleSiteToggle(site.id)}
                  className="w-4 h-4 text-operation-active bg-depth-ocean/20 border-interface-border/30 rounded focus:ring-operation-active focus:ring-2"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-light-primary truncate">{site.name}</span>
                    <Badge
                      className={cn(
                        'text-xs',
                        site.status === 'active' ? 'bg-operation-complete/20 text-operation-complete border-operation-complete/30' :
                        site.status === 'building' ? 'bg-operation-processing/20 text-operation-processing border-operation-processing/30' :
                        site.status === 'error' ? 'bg-operation-alert/20 text-operation-alert border-operation-alert/30' :
                        'bg-light-tertiary/20 text-light-tertiary border-light-tertiary/30'
                      )}
                    >
                      {site.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-light-secondary truncate">{site.url}</div>
                </div>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Extension Selection */}
      <Card className="card-operational">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="type-subtitle text-light-primary">Operations ({selectedExtensions.size})</h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkExtensionAction('enable')}
                className="border-operation-complete/30 text-operation-complete hover:bg-operation-complete/10"
              >
                Enable All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkExtensionAction('disable')}
                className="border-operation-alert/30 text-operation-alert hover:bg-operation-alert/10"
              >
                Disable All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedExtensions(new Map())}
                className="border-interface-border/30 text-light-secondary hover:bg-interface-border/10"
              >
                Clear
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableExtensions.map(extension => {
              const selectedAction = selectedExtensions.get(extension.id);

              return (
                <div key={extension.id} className="p-4 border border-interface-border/20 rounded">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      {extension.icon ? (
                        <img src={extension.icon} alt={`${extension.name} icon`} className="w-6 h-6" />
                      ) : (
                        <div className="w-6 h-6 bg-operation-active/20 rounded flex items-center justify-center text-xs">
                          {extension.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-light-primary truncate">{extension.name}</h4>
                      <p className="text-sm text-light-secondary line-clamp-2">{extension.description}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={selectedAction === 'enable' ? 'primary' : 'outline'}
                      onClick={() => handleExtensionToggle(extension.id, 'enable')}
                      className={cn(
                        'flex-1',
                        selectedAction === 'enable'
                          ? 'bg-operation-complete text-depth-void'
                          : 'border-operation-complete/30 text-operation-complete hover:bg-operation-complete/10'
                      )}
                    >
                      Enable
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedAction === 'disable' ? 'primary' : 'outline'}
                      onClick={() => handleExtensionToggle(extension.id, 'disable')}
                      className={cn(
                        'flex-1',
                        selectedAction === 'disable'
                          ? 'bg-operation-alert text-depth-void'
                          : 'border-operation-alert/30 text-operation-alert hover:bg-operation-alert/10'
                      )}
                    >
                      Disable
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Deployment Summary & Controls */}
      <Card className="card-operational">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="type-subtitle text-light-primary mb-2">Deployment Summary</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-light-secondary">Sites:</span>
                  <span className="ml-2 text-operation-active font-medium">{selectedSites.size}</span>
                </div>
                <div>
                  <span className="text-light-secondary">Operations:</span>
                  <span className="ml-2 text-operation-active font-medium">{selectedExtensions.size}</span>
                </div>
                <div>
                  <span className="text-light-secondary">Total Tasks:</span>
                  <span className="ml-2 text-operation-active font-medium">{stats.totalOperations}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={resetDeployment}
                disabled={isDeploying}
                className="border-interface-border/30 text-light-secondary hover:bg-interface-border/10"
              >
                Reset
              </Button>
              <Button
                onClick={executeBulkDeployment}
                disabled={!canStartDeployment}
                loading={isDeploying}
                className="bg-operation-active text-depth-void hover:bg-interface-hover"
              >
                {isDeploying ? 'Deploying...' : 'Start Deployment'}
              </Button>
            </div>
          </div>

          {/* Progress Overview */}
          {isDeploying && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-light-secondary">Overall Progress</span>
                <span className="text-sm text-operation-active font-medium">
                  {Math.round(stats.progress)}% ({stats.completedOperations + stats.failedOperations}/{stats.totalOperations})
                </span>
              </div>
              <Progress value={stats.progress} className="mb-4" />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center p-2 bg-depth-ocean/10 rounded">
                  <div className="text-lg font-medium text-operation-complete">{stats.completedSites}</div>
                  <div className="text-light-secondary">Sites Complete</div>
                </div>
                <div className="text-center p-2 bg-depth-ocean/10 rounded">
                  <div className="text-lg font-medium text-operation-alert">{stats.failedSites}</div>
                  <div className="text-light-secondary">Sites Failed</div>
                </div>
                <div className="text-center p-2 bg-depth-ocean/10 rounded">
                  <div className="text-lg font-medium text-operation-complete">{stats.completedOperations}</div>
                  <div className="text-light-secondary">Tasks Complete</div>
                </div>
                <div className="text-center p-2 bg-depth-ocean/10 rounded">
                  <div className="text-lg font-medium text-operation-alert">{stats.failedOperations}</div>
                  <div className="text-light-secondary">Tasks Failed</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Progress */}
      {deploymentProgress.length > 0 && (
        <Card className="card-operational">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="type-subtitle text-light-primary">Detailed Progress</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="border-interface-border/30 text-light-secondary hover:bg-interface-border/10"
              >
                {showAdvanced ? 'Hide Details' : 'Show Details'}
              </Button>
            </div>

            <div className="space-y-4">
              {deploymentProgress.map(site => (
                <div key={site.siteId} className="border border-interface-border/20 rounded p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{statusIcons[site.status]}</span>
                      <div>
                        <h4 className="font-medium text-light-primary">{site.siteName}</h4>
                        <p className={cn('text-sm', statusColors[site.status])}>
                          {site.status.charAt(0).toUpperCase() + site.status.slice(1)}
                        </p>
                      </div>
                    </div>
                    {site.startTime && (
                      <div className="text-sm text-light-secondary">
                        {site.endTime
                          ? `${Math.round((site.endTime.getTime() - site.startTime.getTime()) / 1000)}s`
                          : `${Math.round((Date.now() - site.startTime.getTime()) / 1000)}s`
                        }
                      </div>
                    )}
                  </div>

                  {site.error && (
                    <div className="mb-3 p-2 bg-operation-alert/10 border border-operation-alert/30 rounded text-sm text-operation-alert">
                      {site.error}
                    </div>
                  )}

                  {showAdvanced && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {site.operations.map(operation => (
                        <div key={operation.extensionId} className="flex items-center justify-between p-2 bg-depth-ocean/10 rounded text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{statusIcons[operation.status]}</span>
                            <span className="text-light-primary">{operation.extensionName}</span>
                            <Badge
                              className={cn(
                                'text-xs',
                                operation.action === 'enable'
                                  ? 'bg-operation-complete/20 text-operation-complete border-operation-complete/30'
                                  : 'bg-operation-alert/20 text-operation-alert border-operation-alert/30'
                              )}
                            >
                              {operation.action}
                            </Badge>
                          </div>
                          {operation.error && (
                            <span className="text-xs text-operation-alert truncate ml-2" title={operation.error}>
                              {operation.error}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BulkDeploymentInterface;

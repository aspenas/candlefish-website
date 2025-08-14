'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useProductionStore } from '@/stores/useProductionStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { CircuitBreaker, CircuitBreakerMetrics } from '@/lib/types/production';
import {
  PlusIcon,
  EyeIcon,
  TrashIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  CpuChipIcon,
  BoltIcon,
  AdjustmentsHorizontalIcon,
  ChartBarIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
} from '@heroicons/react/24/outline';

interface BreakerFormData {
  name: string;
  service: string;
  failureThreshold: number;
  recoveryTimeout: number;
  requestTimeout: number;
  config: {
    enabled: boolean;
    automaticRecovery: boolean;
    notificationsEnabled: boolean;
  };
}

interface MetricsChartProps {
  metrics: CircuitBreakerMetrics[];
  title: string;
  dataKey: keyof CircuitBreakerMetrics;
  color?: string;
  unit?: string;
}

function MetricsChart({ metrics, title, dataKey, color = '#3B82F6', unit = '' }: MetricsChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !metrics?.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const padding = 30;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Get data points
    const values = metrics.map(m => m[dataKey] as number);
    const maxValue = Math.max(...values) || 1;
    const minValue = Math.min(...values) || 0;
    const range = maxValue - minValue || 1;

    // Draw grid lines
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 3; i++) {
      const y = padding + (chartHeight * i) / 3;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Draw chart line
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    metrics.forEach((point, index) => {
      const x = padding + (chartWidth * index) / (metrics.length - 1);
      const value = point[dataKey] as number;
      const y = padding + chartHeight - ((value - minValue) / range) * chartHeight;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw area fill
    ctx.fillStyle = color + '20';
    ctx.beginPath();
    metrics.forEach((point, index) => {
      const x = padding + (chartWidth * index) / (metrics.length - 1);
      const value = point[dataKey] as number;
      const y = padding + chartHeight - ((value - minValue) / range) * chartHeight;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.lineTo(padding + chartWidth, padding + chartHeight);
    ctx.lineTo(padding, padding + chartHeight);
    ctx.closePath();
    ctx.fill();

    // Draw latest value
    if (metrics.length > 0) {
      const latestValue = metrics[metrics.length - 1][dataKey] as number;
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${latestValue}${unit}`, 5, 15);
    }
  }, [metrics, dataKey, color, unit]);

  return (
    <div className="relative">
      <h5 className="text-xs font-medium text-gray-600 mb-1">{title}</h5>
      <canvas
        ref={canvasRef}
        width={200}
        height={80}
        className="w-full h-16 border border-gray-200 rounded"
      />
    </div>
  );
}

export function CircuitBreakerPanel() {
  const {
    circuitBreakers,
    fetchCircuitBreakers,
    createCircuitBreaker,
    updateCircuitBreaker,
    resetCircuitBreaker,
    fetchCircuitBreakerMetrics,
  } = useProductionStore();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showBreakerDetails, setShowBreakerDetails] = useState<string | null>(null);
  const [showMetricsDialog, setShowMetricsDialog] = useState<string | null>(null);
  const [breakerForm, setBreakerForm] = useState<BreakerFormData>({
    name: '',
    service: '',
    failureThreshold: 5,
    recoveryTimeout: 30,
    requestTimeout: 5000,
    config: {
      enabled: true,
      automaticRecovery: true,
      notificationsEnabled: true,
    },
  });
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchCircuitBreakers();
  }, [fetchCircuitBreakers]);

  const handleCreateBreaker = async () => {
    try {
      setProcessing('create');
      await createCircuitBreaker(breakerForm);
      setShowCreateDialog(false);
      setBreakerForm({
        name: '',
        service: '',
        failureThreshold: 5,
        recoveryTimeout: 30,
        requestTimeout: 5000,
        config: {
          enabled: true,
          automaticRecovery: true,
          notificationsEnabled: true,
        },
      });
    } catch (error) {
      console.error('Failed to create circuit breaker:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleResetBreaker = async (name: string) => {
    if (confirm('Are you sure you want to reset this circuit breaker?')) {
      try {
        setProcessing(`reset-${name}`);
        await resetCircuitBreaker(name);
      } catch (error) {
        console.error('Failed to reset circuit breaker:', error);
      } finally {
        setProcessing(null);
      }
    }
  };

  const handleToggleBreaker = async (breaker: CircuitBreaker) => {
    try {
      setProcessing(`toggle-${breaker.name}`);
      await updateCircuitBreaker(breaker.name, {
        config: { ...breaker.config, enabled: !breaker.config.enabled },
      });
    } catch (error) {
      console.error('Failed to toggle circuit breaker:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleShowMetrics = async (name: string) => {
    setShowMetricsDialog(name);
    await fetchCircuitBreakerMetrics(name);
  };

  const getStateIcon = (state: CircuitBreaker['state']) => {
    switch (state) {
      case 'closed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'open':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'half_open':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStateBadge = (state: CircuitBreaker['state']) => {
    const variants = {
      closed: 'bg-green-100 text-green-800',
      open: 'bg-red-100 text-red-800',
      half_open: 'bg-yellow-100 text-yellow-800',
    };
    return variants[state] || 'bg-gray-100 text-gray-800';
  };

  const getHealthScore = (breaker: CircuitBreaker) => {
    const { successCount, failureCount, timeouts } = breaker.metrics;
    const totalRequests = successCount + failureCount + timeouts;
    
    if (totalRequests === 0) return 100;
    
    const successRate = (successCount / totalRequests) * 100;
    return Math.round(successRate);
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Circuit Breaker Panel</h1>
          <p className="text-gray-600">Monitor and manage service circuit breakers</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => fetchCircuitBreakers()}
            className="flex items-center gap-2"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2"
          >
            <PlusIcon className="h-4 w-4" />
            Create Circuit Breaker
          </Button>
        </div>
      </div>

      {/* Circuit Breakers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {circuitBreakers.isLoading ? (
          <Card className="p-6 flex items-center justify-center">
            <LoadingSpinner size="sm" />
          </Card>
        ) : circuitBreakers.breakers.length === 0 ? (
          <Card className="p-8 text-center col-span-full">
            <BoltIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Circuit Breakers</h3>
            <p className="text-gray-600 mb-6">
              Create circuit breakers to improve service reliability
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>Create Circuit Breaker</Button>
          </Card>
        ) : (
          circuitBreakers.breakers.map((breaker) => {
            const healthScore = getHealthScore(breaker);
            const isHealthy = healthScore >= 95;
            const isWarning = healthScore >= 80 && healthScore < 95;
            const isCritical = healthScore < 80;

            return (
              <Card key={breaker.name} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getStateIcon(breaker.state)}
                    <div>
                      <h3 className="font-semibold text-gray-900">{breaker.name}</h3>
                      <p className="text-sm text-gray-600">{breaker.service}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStateBadge(breaker.state)}>
                      {breaker.state.replace('_', ' ')}
                    </Badge>
                    {!breaker.config.enabled && (
                      <Badge className="bg-gray-100 text-gray-800">Disabled</Badge>
                    )}
                  </div>
                </div>

                {/* Health Score */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Health Score</span>
                    <span
                      className={cn(
                        'text-sm font-bold',
                        isHealthy && 'text-green-600',
                        isWarning && 'text-yellow-600',
                        isCritical && 'text-red-600'
                      )}
                    >
                      {healthScore}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={cn(
                        'h-2 rounded-full transition-all duration-300',
                        isHealthy && 'bg-green-500',
                        isWarning && 'bg-yellow-500',
                        isCritical && 'bg-red-500'
                      )}
                      style={{ width: `${healthScore}%` }}
                    />
                  </div>
                </div>

                {/* Metrics Summary */}
                <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                  <div>
                    <p className="text-gray-500">Success</p>
                    <p className="font-semibold text-green-600">
                      {breaker.metrics.successCount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Failures</p>
                    <p className="font-semibold text-red-600">
                      {breaker.metrics.failureCount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Timeouts</p>
                    <p className="font-semibold text-yellow-600">
                      {breaker.metrics.timeouts.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Consecutive</p>
                    <p className="font-semibold text-gray-900">
                      {breaker.metrics.consecutiveFailures}
                    </p>
                  </div>
                </div>

                {/* Configuration Summary */}
                <div className="border-t border-gray-200 pt-3 mb-4">
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div>Threshold: {breaker.failureThreshold}</div>
                    <div>Timeout: {formatDuration(breaker.recoveryTimeout)}</div>
                    <div>Request: {breaker.requestTimeout}ms</div>
                    <div>
                      Auto Recovery:{' '}
                      {breaker.config.automaticRecovery ? (
                        <CheckCircleIcon className="h-3 w-3 inline text-green-500" />
                      ) : (
                        <XCircleIcon className="h-3 w-3 inline text-red-500" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Last Events */}
                <div className="text-xs text-gray-500 mb-4">
                  {breaker.metrics.lastSuccessTime && (
                    <div>
                      Last Success: {new Date(breaker.metrics.lastSuccessTime).toLocaleString()}
                    </div>
                  )}
                  {breaker.metrics.lastFailureTime && (
                    <div>
                      Last Failure: {new Date(breaker.metrics.lastFailureTime).toLocaleString()}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleShowMetrics(breaker.name)}
                  >
                    <ChartBarIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBreakerDetails(breaker.name)}
                  >
                    <EyeIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleResetBreaker(breaker.name)}
                    disabled={processing === `reset-${breaker.name}`}
                  >
                    {processing === `reset-${breaker.name}` ? (
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowPathIcon className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleBreaker(breaker)}
                    disabled={processing === `toggle-${breaker.name}`}
                    className={breaker.config.enabled ? 'text-red-600' : 'text-green-600'}
                  >
                    {processing === `toggle-${breaker.name}` ? (
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    ) : breaker.config.enabled ? (
                      <PauseIcon className="h-4 w-4" />
                    ) : (
                      <PlayIcon className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Create Circuit Breaker Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <div className="sm:max-w-md">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900">Create Circuit Breaker</h3>
            <p className="text-sm text-gray-600">
              Configure a new circuit breaker for service protection
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Circuit Breaker Name</Label>
              <Input
                id="name"
                value={breakerForm.name}
                onChange={(e) => setBreakerForm({ ...breakerForm, name: e.target.value })}
                placeholder="database-connection"
              />
            </div>

            <div>
              <Label htmlFor="service">Service Name</Label>
              <Input
                id="service"
                value={breakerForm.service}
                onChange={(e) => setBreakerForm({ ...breakerForm, service: e.target.value })}
                placeholder="Database Service"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="failureThreshold">Failure Threshold</Label>
                <Input
                  id="failureThreshold"
                  type="number"
                  min="1"
                  value={breakerForm.failureThreshold}
                  onChange={(e) =>
                    setBreakerForm({
                      ...breakerForm,
                      failureThreshold: parseInt(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="recoveryTimeout">Recovery Timeout (s)</Label>
                <Input
                  id="recoveryTimeout"
                  type="number"
                  min="1"
                  value={breakerForm.recoveryTimeout}
                  onChange={(e) =>
                    setBreakerForm({
                      ...breakerForm,
                      recoveryTimeout: parseInt(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="requestTimeout">Request Timeout (ms)</Label>
                <Input
                  id="requestTimeout"
                  type="number"
                  min="100"
                  step="100"
                  value={breakerForm.requestTimeout}
                  onChange={(e) =>
                    setBreakerForm({
                      ...breakerForm,
                      requestTimeout: parseInt(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Switch
                  id="enabled"
                  checked={breakerForm.config.enabled}
                  onCheckedChange={(checked) =>
                    setBreakerForm({
                      ...breakerForm,
                      config: { ...breakerForm.config, enabled: checked },
                    })
                  }
                />
                <Label htmlFor="enabled">Enable circuit breaker</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="automaticRecovery"
                  checked={breakerForm.config.automaticRecovery}
                  onCheckedChange={(checked) =>
                    setBreakerForm({
                      ...breakerForm,
                      config: { ...breakerForm.config, automaticRecovery: checked },
                    })
                  }
                />
                <Label htmlFor="automaticRecovery">Automatic recovery</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="notificationsEnabled"
                  checked={breakerForm.config.notificationsEnabled}
                  onCheckedChange={(checked) =>
                    setBreakerForm({
                      ...breakerForm,
                      config: { ...breakerForm.config, notificationsEnabled: checked },
                    })
                  }
                />
                <Label htmlFor="notificationsEnabled">Enable notifications</Label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateBreaker}
              disabled={!breakerForm.name || !breakerForm.service || processing === 'create'}
            >
              {processing === 'create' ? (
                <ArrowPathIcon className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Create Circuit Breaker
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Circuit Breaker Details Dialog */}
      {showBreakerDetails && (
        <Dialog open={!!showBreakerDetails} onOpenChange={() => setShowBreakerDetails(null)}>
          <div className="sm:max-w-2xl">
            {(() => {
              const breaker = circuitBreakers.breakers.find(
                (b) => b.name === showBreakerDetails
              );
              if (!breaker) return null;

              return (
                <div>
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-900">
                      Circuit Breaker Details
                    </h3>
                    <p className="text-sm text-gray-600">{breaker.name}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Configuration */}
                    <Card className="p-4">
                      <h4 className="font-medium text-gray-900 mb-3">Configuration</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Service:</span>
                          <span className="text-gray-900">{breaker.service}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">State:</span>
                          <Badge className={getStateBadge(breaker.state)}>
                            {breaker.state.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Failure Threshold:</span>
                          <span className="text-gray-900">{breaker.failureThreshold}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Recovery Timeout:</span>
                          <span className="text-gray-900">
                            {formatDuration(breaker.recoveryTimeout)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Request Timeout:</span>
                          <span className="text-gray-900">{breaker.requestTimeout}ms</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Enabled:</span>
                          <span className="text-gray-900">
                            {breaker.config.enabled ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Auto Recovery:</span>
                          <span className="text-gray-900">
                            {breaker.config.automaticRecovery ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Notifications:</span>
                          <span className="text-gray-900">
                            {breaker.config.notificationsEnabled ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>
                    </Card>

                    {/* Metrics */}
                    <Card className="p-4">
                      <h4 className="font-medium text-gray-900 mb-3">Current Metrics</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Success Count:</span>
                          <span className="text-green-600 font-medium">
                            {breaker.metrics.successCount.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Failure Count:</span>
                          <span className="text-red-600 font-medium">
                            {breaker.metrics.failureCount.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Timeouts:</span>
                          <span className="text-yellow-600 font-medium">
                            {breaker.metrics.timeouts.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Consecutive Failures:</span>
                          <span className="text-gray-900 font-medium">
                            {breaker.metrics.consecutiveFailures}
                          </span>
                        </div>
                        {breaker.metrics.lastSuccessTime && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Last Success:</span>
                            <span className="text-gray-900 text-xs">
                              {new Date(breaker.metrics.lastSuccessTime).toLocaleString()}
                            </span>
                          </div>
                        )}
                        {breaker.metrics.lastFailureTime && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Last Failure:</span>
                            <span className="text-gray-900 text-xs">
                              {new Date(breaker.metrics.lastFailureTime).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>

                  <div className="mt-6">
                    <Card className="p-4">
                      <h4 className="font-medium text-gray-900 mb-3">Timeline</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Created:</span>
                          <span className="text-gray-900">
                            {new Date(breaker.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Last Updated:</span>
                          <span className="text-gray-900">
                            {new Date(breaker.updatedAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </Card>
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <Button variant="outline" onClick={() => setShowBreakerDetails(null)}>
                      Close
                    </Button>
                    <Button onClick={() => handleShowMetrics(breaker.name)}>
                      <ChartBarIcon className="h-4 w-4 mr-2" />
                      View Metrics
                    </Button>
                  </div>
                </div>
              );
            })()}
          </div>
        </Dialog>
      )}

      {/* Metrics Dialog */}
      {showMetricsDialog && (
        <Dialog open={!!showMetricsDialog} onOpenChange={() => setShowMetricsDialog(null)}>
          <div className="sm:max-w-4xl">
            {(() => {
              const breaker = circuitBreakers.breakers.find(
                (b) => b.name === showMetricsDialog
              );
              const metrics = circuitBreakers.metrics[showMetricsDialog!] || [];

              if (!breaker) return null;

              return (
                <div>
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-900">
                      Circuit Breaker Metrics
                    </h3>
                    <p className="text-sm text-gray-600">{breaker.name}</p>
                  </div>

                  {metrics.length === 0 ? (
                    <div className="text-center py-8">
                      <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No metrics data available</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card className="p-4">
                        <MetricsChart
                          metrics={metrics}
                          title="Request Count"
                          dataKey="requestCount"
                          color="#3B82F6"
                        />
                      </Card>
                      <Card className="p-4">
                        <MetricsChart
                          metrics={metrics}
                          title="Success Count"
                          dataKey="successCount"
                          color="#10B981"
                        />
                      </Card>
                      <Card className="p-4">
                        <MetricsChart
                          metrics={metrics}
                          title="Failure Count"
                          dataKey="failureCount"
                          color="#EF4444"
                        />
                      </Card>
                      <Card className="p-4">
                        <MetricsChart
                          metrics={metrics}
                          title="Average Response Time"
                          dataKey="averageResponseTime"
                          color="#8B5CF6"
                          unit="ms"
                        />
                      </Card>
                      <Card className="p-4">
                        <MetricsChart
                          metrics={metrics}
                          title="P95 Response Time"
                          dataKey="p95ResponseTime"
                          color="#F59E0B"
                          unit="ms"
                        />
                      </Card>
                      <Card className="p-4">
                        <MetricsChart
                          metrics={metrics}
                          title="Timeouts"
                          dataKey="timeouts"
                          color="#F97316"
                        />
                      </Card>
                    </div>
                  )}

                  <div className="flex justify-end mt-6">
                    <Button onClick={() => setShowMetricsDialog(null)}>Close</Button>
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
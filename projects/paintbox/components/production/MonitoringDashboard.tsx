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
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { MonitoringMetric, Alert, NotificationChannel } from '@/lib/types/production';
import {
  PlusIcon,
  EyeIcon,
  TrashIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  BellIcon,
  ChartBarIcon,
  ClockIcon,
  CpuChipIcon,
  CircleStackIcon,
  CloudIcon,
  SignalIcon,
  AdjustmentsHorizontalIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

interface AlertFormData {
  name: string;
  description: string;
  metricName: string;
  condition: {
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    threshold: number;
    duration: number;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  notifications: {
    channels: string[];
  };
}

interface ChannelFormData {
  name: string;
  type: 'email' | 'slack' | 'webhook' | 'sms';
  config: {
    email?: { address: string };
    slack?: { webhook: string; channel: string };
    webhook?: { url: string; headers?: Record<string, string> };
    sms?: { phoneNumber: string };
  };
  enabled: boolean;
}

interface MetricChartProps {
  metric: MonitoringMetric[];
  title: string;
  unit?: string;
  color?: string;
}

function MetricChart({ metric, title, unit = '', color = '#3B82F6' }: MetricChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !metric?.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Get data points
    const values = metric.map(m => m.value);
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const range = maxValue - minValue || 1;

    // Draw grid lines
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding + (chartHeight * i) / 4;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Draw chart line
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    metric.forEach((point, index) => {
      const x = padding + (chartWidth * index) / (metric.length - 1);
      const y = padding + chartHeight - ((point.value - minValue) / range) * chartHeight;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw data points
    ctx.fillStyle = color;
    metric.forEach((point, index) => {
      const x = padding + (chartWidth * index) / (metric.length - 1);
      const y = padding + chartHeight - ((point.value - minValue) / range) * chartHeight;
      
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw labels
    ctx.fillStyle = '#6B7280';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    
    // Y-axis labels
    for (let i = 0; i <= 4; i++) {
      const value = minValue + (range * (4 - i)) / 4;
      const y = padding + (chartHeight * i) / 4;
      ctx.textAlign = 'right';
      ctx.fillText(value.toFixed(1) + unit, padding - 10, y + 4);
    }

    // Latest value
    if (metric.length > 0) {
      const latestValue = metric[metric.length - 1].value;
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(latestValue.toFixed(1) + unit, 10, 25);
    }
  }, [metric, color, unit]);

  const latestValue = metric?.length > 0 ? metric[metric.length - 1].value : 0;

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-700">{title}</h4>
        <span className="text-sm text-gray-500">
          {latestValue.toFixed(1)}{unit}
        </span>
      </div>
      <canvas
        ref={canvasRef}
        width={300}
        height={120}
        className="w-full h-24 border border-gray-200 rounded"
      />
    </div>
  );
}

export function MonitoringDashboard() {
  const {
    monitoring,
    fetchMetrics,
    createAlert,
    updateAlert,
    deleteAlert,
    fetchAlerts,
    createNotificationChannel,
    updateNotificationChannel,
    deleteNotificationChannel,
    fetchNotificationChannels,
  } = useProductionStore();

  const [showCreateAlert, setShowCreateAlert] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showAlertDetails, setShowAlertDetails] = useState<string | null>(null);
  const [alertForm, setAlertForm] = useState<AlertFormData>({
    name: '',
    description: '',
    metricName: '',
    condition: { operator: 'gt', threshold: 0, duration: 5 },
    severity: 'medium',
    notifications: { channels: [] },
  });
  const [channelForm, setChannelForm] = useState<ChannelFormData>({
    name: '',
    type: 'email',
    config: {},
    enabled: true,
  });
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const metricNames = [
    'cpu_usage',
    'memory_usage',
    'disk_usage',
    'network_in',
    'network_out',
    'response_time',
    'error_rate',
    'requests_per_second',
  ];

  useEffect(() => {
    fetchMetrics();
    fetchAlerts();
    fetchNotificationChannels();
  }, [fetchMetrics, fetchAlerts, fetchNotificationChannels]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchMetrics();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, fetchMetrics]);

  const handleCreateAlert = async () => {
    try {
      await createAlert(alertForm);
      setShowCreateAlert(false);
      setAlertForm({
        name: '',
        description: '',
        metricName: '',
        condition: { operator: 'gt', threshold: 0, duration: 5 },
        severity: 'medium',
        notifications: { channels: [] },
      });
    } catch (error) {
      console.error('Failed to create alert:', error);
    }
  };

  const handleCreateChannel = async () => {
    try {
      await createNotificationChannel(channelForm);
      setShowCreateChannel(false);
      setChannelForm({
        name: '',
        type: 'email',
        config: {},
        enabled: true,
      });
    } catch (error) {
      console.error('Failed to create notification channel:', error);
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    if (confirm('Are you sure you want to delete this alert?')) {
      try {
        await deleteAlert(alertId);
      } catch (error) {
        console.error('Failed to delete alert:', error);
      }
    }
  };

  const handleDeleteChannel = async (channelId: string) => {
    if (confirm('Are you sure you want to delete this notification channel?')) {
      try {
        await deleteNotificationChannel(channelId);
      } catch (error) {
        console.error('Failed to delete notification channel:', error);
      }
    }
  };

  const getAlertStatusBadge = (status: Alert['status']) => {
    const variants = {
      active: 'bg-red-100 text-red-800',
      resolved: 'bg-green-100 text-green-800',
      suppressed: 'bg-yellow-100 text-yellow-800',
    };
    return variants[status] || 'bg-gray-100 text-gray-800';
  };

  const getSeverityBadge = (severity: Alert['severity']) => {
    const variants = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800',
    };
    return variants[severity] || 'bg-gray-100 text-gray-800';
  };

  const getMetricIcon = (metricName: string) => {
    switch (metricName) {
      case 'cpu_usage':
        return <CpuChipIcon className="h-5 w-5" />;
      case 'memory_usage':
        return <CircleStackIcon className="h-5 w-5" />;
      case 'disk_usage':
        return <CircleStackIcon className="h-5 w-5" />;
      case 'network_in':
      case 'network_out':
        return <CloudIcon className="h-5 w-5" />;
      case 'response_time':
        return <ClockIcon className="h-5 w-5" />;
      case 'error_rate':
        return <ExclamationTriangleIcon className="h-5 w-5" />;
      case 'requests_per_second':
        return <SignalIcon className="h-5 w-5" />;
      default:
        return <ChartBarIcon className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Monitoring Dashboard</h1>
          <p className="text-gray-600">Real-time metrics and alerting</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
            />
            <Label>Auto-refresh</Label>
          </div>
          <Select
            value={selectedTimeRange}
            onValueChange={setSelectedTimeRange}
          >
            <option value="5m">5 minutes</option>
            <option value="1h">1 hour</option>
            <option value="6h">6 hours</option>
            <option value="24h">24 hours</option>
            <option value="7d">7 days</option>
          </Select>
          <Button
            variant="outline"
            onClick={() => fetchMetrics()}
            className="flex items-center gap-2"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {monitoring.isLoading ? (
          <Card className="p-6 flex items-center justify-center">
            <LoadingSpinner size="sm" />
          </Card>
        ) : (
          metricNames.map((metricName) => {
            const metricData = monitoring.metrics[metricName] || [];
            return (
              <Card key={metricName} className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  {getMetricIcon(metricName)}
                  <h3 className="font-medium text-gray-900 capitalize">
                    {metricName.replace('_', ' ')}
                  </h3>
                </div>
                <MetricChart
                  metric={metricData}
                  title=""
                  unit={metricName.includes('usage') ? '%' : metricName.includes('time') ? 'ms' : ''}
                  color={metricName.includes('error') ? '#EF4444' : '#3B82F6'}
                />
              </Card>
            );
          })
        )}
      </div>

      {/* Alerts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Alerts */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Active Alerts</h2>
            <Button
              onClick={() => setShowCreateAlert(true)}
              className="flex items-center gap-2"
            >
              <PlusIcon className="h-4 w-4" />
              Create Alert
            </Button>
          </div>

          <div className="space-y-4">
            {monitoring.alerts.filter(alert => alert.status === 'active').length === 0 ? (
              <div className="text-center py-8">
                <CheckCircleIcon className="h-12 w-12 text-green-400 mx-auto mb-4" />
                <p className="text-gray-600">No active alerts</p>
              </div>
            ) : (
              monitoring.alerts
                .filter(alert => alert.status === 'active')
                .map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start justify-between p-4 border border-red-200 bg-red-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-gray-900">{alert.name}</h4>
                        <Badge className={getSeverityBadge(alert.severity)}>
                          {alert.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{alert.description}</p>
                      <p className="text-xs text-gray-500">
                        Triggered {alert.triggeredAt ? new Date(alert.triggeredAt).toLocaleString() : 'Unknown'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAlertDetails(alert.id)}
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateAlert(alert.id, { status: 'resolved' })}
                      >
                        <CheckCircleIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </Card>

        {/* All Alerts */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">All Alerts</h2>
            <Button
              variant="outline"
              onClick={() => fetchAlerts()}
            >
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {monitoring.alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-gray-900">{alert.name}</h4>
                    <Badge className={getAlertStatusBadge(alert.status)}>
                      {alert.status}
                    </Badge>
                    <Badge className={getSeverityBadge(alert.severity)}>
                      {alert.severity}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{alert.metricName}</p>
                  <p className="text-xs text-gray-500">
                    {alert.condition.operator} {alert.condition.threshold} for {alert.condition.duration}m
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAlertDetails(alert.id)}
                  >
                    <EyeIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteAlert(alert.id)}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Notification Channels */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Notification Channels</h2>
          <Button
            onClick={() => setShowCreateChannel(true)}
            className="flex items-center gap-2"
          >
            <PlusIcon className="h-4 w-4" />
            Add Channel
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {monitoring.channels.map((channel) => (
            <Card key={channel.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <BellIcon className="h-4 w-4 text-gray-400" />
                    <h4 className="font-medium text-gray-900">{channel.name}</h4>
                    <Badge variant="outline" className="text-xs">
                      {channel.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">
                    {channel.type === 'email' && channel.config.email?.address}
                    {channel.type === 'slack' && channel.config.slack?.channel}
                    {channel.type === 'webhook' && channel.config.webhook?.url}
                    {channel.type === 'sms' && channel.config.sms?.phoneNumber}
                  </p>
                  <Badge className={channel.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                    {channel.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateNotificationChannel(channel.id, { enabled: !channel.enabled })
                    }
                  >
                    {channel.enabled ? (
                      <XCircleIcon className="h-4 w-4" />
                    ) : (
                      <CheckCircleIcon className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteChannel(channel.id)}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      {/* Create Alert Dialog */}
      <Dialog open={showCreateAlert} onOpenChange={setShowCreateAlert}>
        <div className="sm:max-w-md">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900">Create Alert</h3>
            <p className="text-sm text-gray-600">Set up monitoring alerts for your metrics</p>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="alertName">Alert Name</Label>
              <Input
                id="alertName"
                value={alertForm.name}
                onChange={(e) => setAlertForm({ ...alertForm, name: e.target.value })}
                placeholder="High CPU Usage Alert"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={alertForm.description}
                onChange={(e) => setAlertForm({ ...alertForm, description: e.target.value })}
                placeholder="Alert when CPU usage exceeds 80%"
              />
            </div>

            <div>
              <Label htmlFor="metricName">Metric</Label>
              <Select
                value={alertForm.metricName}
                onValueChange={(value) => setAlertForm({ ...alertForm, metricName: value })}
              >
                <option value="">Select a metric</option>
                {metricNames.map((metric) => (
                  <option key={metric} value={metric}>
                    {metric.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="operator">Condition</Label>
                <Select
                  value={alertForm.condition.operator}
                  onValueChange={(value: any) =>
                    setAlertForm({
                      ...alertForm,
                      condition: { ...alertForm.condition, operator: value },
                    })
                  }
                >
                  <option value="gt">Greater than</option>
                  <option value="gte">Greater than or equal</option>
                  <option value="lt">Less than</option>
                  <option value="lte">Less than or equal</option>
                  <option value="eq">Equal to</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="threshold">Threshold</Label>
                <Input
                  id="threshold"
                  type="number"
                  value={alertForm.condition.threshold}
                  onChange={(e) =>
                    setAlertForm({
                      ...alertForm,
                      condition: {
                        ...alertForm.condition,
                        threshold: parseFloat(e.target.value),
                      },
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="duration">Duration (min)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={alertForm.condition.duration}
                  onChange={(e) =>
                    setAlertForm({
                      ...alertForm,
                      condition: {
                        ...alertForm.condition,
                        duration: parseInt(e.target.value),
                      },
                    })
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="severity">Severity</Label>
              <Select
                value={alertForm.severity}
                onValueChange={(value: any) => setAlertForm({ ...alertForm, severity: value })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </Select>
            </div>

            <div>
              <Label>Notification Channels</Label>
              <div className="mt-2 space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-md p-3">
                {monitoring.channels.map((channel) => (
                  <div key={channel.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={channel.id}
                      checked={alertForm.notifications.channels.includes(channel.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAlertForm({
                            ...alertForm,
                            notifications: {
                              channels: [...alertForm.notifications.channels, channel.id],
                            },
                          });
                        } else {
                          setAlertForm({
                            ...alertForm,
                            notifications: {
                              channels: alertForm.notifications.channels.filter(
                                (id) => id !== channel.id
                              ),
                            },
                          });
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor={channel.id} className="text-sm">
                      {channel.name} ({channel.type})
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setShowCreateAlert(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateAlert}
              disabled={
                !alertForm.name ||
                !alertForm.metricName ||
                alertForm.notifications.channels.length === 0
              }
            >
              Create Alert
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Create Notification Channel Dialog */}
      <Dialog open={showCreateChannel} onOpenChange={setShowCreateChannel}>
        <div className="sm:max-w-md">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900">Add Notification Channel</h3>
            <p className="text-sm text-gray-600">Configure how you want to receive alerts</p>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="channelName">Channel Name</Label>
              <Input
                id="channelName"
                value={channelForm.name}
                onChange={(e) => setChannelForm({ ...channelForm, name: e.target.value })}
                placeholder="Production Alerts"
              />
            </div>

            <div>
              <Label htmlFor="channelType">Channel Type</Label>
              <Select
                value={channelForm.type}
                onValueChange={(value: any) =>
                  setChannelForm({ ...channelForm, type: value, config: {} })
                }
              >
                <option value="email">Email</option>
                <option value="slack">Slack</option>
                <option value="webhook">Webhook</option>
                <option value="sms">SMS</option>
              </Select>
            </div>

            {channelForm.type === 'email' && (
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={channelForm.config.email?.address || ''}
                  onChange={(e) =>
                    setChannelForm({
                      ...channelForm,
                      config: { email: { address: e.target.value } },
                    })
                  }
                  placeholder="alerts@company.com"
                />
              </div>
            )}

            {channelForm.type === 'slack' && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="slackWebhook">Webhook URL</Label>
                  <Input
                    id="slackWebhook"
                    value={channelForm.config.slack?.webhook || ''}
                    onChange={(e) =>
                      setChannelForm({
                        ...channelForm,
                        config: {
                          slack: {
                            ...channelForm.config.slack,
                            webhook: e.target.value,
                          },
                        },
                      })
                    }
                    placeholder="https://hooks.slack.com/services/..."
                  />
                </div>
                <div>
                  <Label htmlFor="slackChannel">Channel</Label>
                  <Input
                    id="slackChannel"
                    value={channelForm.config.slack?.channel || ''}
                    onChange={(e) =>
                      setChannelForm({
                        ...channelForm,
                        config: {
                          slack: {
                            ...channelForm.config.slack,
                            channel: e.target.value,
                          },
                        },
                      })
                    }
                    placeholder="#alerts"
                  />
                </div>
              </div>
            )}

            {channelForm.type === 'webhook' && (
              <div>
                <Label htmlFor="webhookUrl">Webhook URL</Label>
                <Input
                  id="webhookUrl"
                  value={channelForm.config.webhook?.url || ''}
                  onChange={(e) =>
                    setChannelForm({
                      ...channelForm,
                      config: { webhook: { url: e.target.value } },
                    })
                  }
                  placeholder="https://api.example.com/alerts"
                />
              </div>
            )}

            {channelForm.type === 'sms' && (
              <div>
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  value={channelForm.config.sms?.phoneNumber || ''}
                  onChange={(e) =>
                    setChannelForm({
                      ...channelForm,
                      config: { sms: { phoneNumber: e.target.value } },
                    })
                  }
                  placeholder="+1234567890"
                />
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                id="enabled"
                checked={channelForm.enabled}
                onCheckedChange={(checked) =>
                  setChannelForm({ ...channelForm, enabled: checked })
                }
              />
              <Label htmlFor="enabled">Enable channel</Label>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setShowCreateChannel(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateChannel}
              disabled={!channelForm.name || !channelForm.type}
            >
              Create Channel
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
/**
 * Slack Integration Panel
 * Webhook configuration, message templates, and delivery monitoring
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Edit,
  Trash2,
  Send,
  Eye,
  Copy,
  Check,
  X,
  AlertCircle,
  MessageSquare,
  Settings,
  Webhook,
  Bell,
  Clock,
  CheckCircle,
  XCircle,
  Loader,
  Hash,
  User,
  Link,
  Code,
  Play,
  Pause,
} from 'lucide-react';
import { format } from 'date-fns';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

import {
  SlackWebhookConfig,
  SlackMessageTemplate,
  SlackEventConfig,
  SlackDeliveryStatus,
} from '@/lib/types/infrastructure';

// ===== TYPES =====

interface WebhookFormData {
  url: string;
  channel: string;
  username: string;
  iconEmoji: string;
  enabled: boolean;
}

interface TemplateFormData {
  name: string;
  template: string;
  eventType: string;
  variables: string[];
}

interface EventConfigFormData {
  eventType: string;
  enabled: boolean;
  webhookId: string;
  templateId?: string;
  conditions: Record<string, any>;
}

// ===== MOCK DATA =====

const mockWebhooks: SlackWebhookConfig[] = [
  {
    url: 'https://hooks.slack.com/services/T1234/B5678/xyz123',
    channel: '#alerts',
    username: 'Infrastructure Bot',
    iconEmoji: ':robot_face:',
    enabled: true,
  },
  {
    url: 'https://hooks.slack.com/services/T1234/B9876/abc456',
    channel: '#deployments',
    username: 'Deploy Bot',
    iconEmoji: ':rocket:',
    enabled: true,
  },
];

const mockTemplates: SlackMessageTemplate[] = [
  {
    id: 'health-alert',
    name: 'Health Alert',
    template: ':warning: *{{severity}}* Health Alert\n\n*Service:* {{service}}\n*Status:* {{status}}\n*Message:* {{message}}\n*Time:* {{timestamp}}',
    variables: ['severity', 'service', 'status', 'message', 'timestamp'],
    eventType: 'health-alert',
  },
  {
    id: 'deployment-complete',
    name: 'Deployment Complete',
    template: ':rocket: *Deployment Complete*\n\n*Environment:* {{environment}}\n*Version:* {{version}}\n*Duration:* {{duration}}\n*Status:* {{status}}',
    variables: ['environment', 'version', 'duration', 'status'],
    eventType: 'deployment',
  },
];

const mockDeliveries: SlackDeliveryStatus[] = [
  {
    id: 'del-1',
    timestamp: new Date().toISOString(),
    webhookId: 'webhook-1',
    status: 'delivered',
    message: 'Health alert sent successfully',
    responseTime: 250,
  },
  {
    id: 'del-2',
    timestamp: new Date(Date.now() - 300000).toISOString(),
    webhookId: 'webhook-2',
    status: 'failed',
    message: 'Deployment notification failed',
    error: 'Invalid channel',
    responseTime: 5000,
  },
];

// ===== COMPONENTS =====

const WebhookCard: React.FC<{
  webhook: SlackWebhookConfig & { id: string };
  onEdit: (webhook: SlackWebhookConfig & { id: string }) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
  onTest: (id: string) => void;
}> = ({ webhook, onEdit, onDelete, onToggle, onTest }) => {
  const [copied, setCopied] = useState(false);

  const copyUrl = () => {
    navigator.clipboard.writeText(webhook.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className={cn('p-4', !webhook.enabled && 'opacity-60')}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-green-100 text-green-600">
              <Webhook className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-medium text-sm">{webhook.channel}</h3>
              <p className="text-xs text-gray-500">{webhook.username}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={cn(
              'text-xs',
              webhook.enabled 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            )}>
              {webhook.enabled ? 'Active' : 'Disabled'}
            </Badge>
            <Switch
              checked={webhook.enabled}
              onCheckedChange={(enabled) => onToggle(webhook.id, enabled)}
            />
          </div>
        </div>

        <div className="mb-3">
          <div className="flex items-center space-x-2 text-xs">
            <Code className="h-3 w-3 text-gray-400" />
            <span className="font-mono text-gray-600 truncate">
              {webhook.url.replace(/\/([^\/]+)$/, '/***')}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyUrl}
              className="h-5 w-5 p-0"
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-600" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1 text-xs text-gray-500">
            <Hash className="h-3 w-3" />
            <span>{webhook.channel}</span>
            <span className="mx-1">•</span>
            <span>{webhook.iconEmoji}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onTest(webhook.id)}
              disabled={!webhook.enabled}
              className="h-7 px-2 text-xs"
            >
              <Send className="h-3 w-3 mr-1" />
              Test
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(webhook)}
              className="h-7 px-2"
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(webhook.id)}
              className="h-7 px-2 text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

const TemplateCard: React.FC<{
  template: SlackMessageTemplate;
  onEdit: (template: SlackMessageTemplate) => void;
  onDelete: (id: string) => void;
  onPreview: (template: SlackMessageTemplate) => void;
}> = ({ template, onEdit, onDelete, onPreview }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-medium text-sm">{template.name}</h3>
              <p className="text-xs text-gray-500">{template.eventType}</p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {template.variables.length} variables
          </Badge>
        </div>

        <div className="mb-3 p-2 bg-gray-50 rounded text-xs font-mono">
          {template.template.slice(0, 100)}
          {template.template.length > 100 && '...'}
        </div>

        <div className="mb-3">
          <div className="flex flex-wrap gap-1">
            {template.variables.slice(0, 4).map((variable) => (
              <Badge key={variable} variant="outline" className="text-xs">
                {variable}
              </Badge>
            ))}
            {template.variables.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{template.variables.length - 4} more
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Event: {template.eventType}
          </div>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPreview(template)}
              className="h-7 px-2"
            >
              <Eye className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(template)}
              className="h-7 px-2"
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(template.id)}
              className="h-7 px-2 text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

const DeliveryStatus: React.FC<{
  deliveries: SlackDeliveryStatus[];
}> = ({ deliveries }) => {
  const getStatusIcon = (status: SlackDeliveryStatus['status']) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Loader className="h-4 w-4 text-yellow-600 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: SlackDeliveryStatus['status']) => {
    switch (status) {
      case 'delivered':
        return 'text-green-600 bg-green-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Recent Deliveries</h3>
      
      <div className="space-y-3">
        {deliveries.length > 0 ? (
          deliveries.map((delivery) => (
            <div
              key={delivery.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                {getStatusIcon(delivery.status)}
                <div>
                  <p className="text-sm font-medium">{delivery.message}</p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(delivery.timestamp), 'PPpp')}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                {delivery.responseTime && (
                  <span className="text-xs text-gray-500">
                    {delivery.responseTime}ms
                  </span>
                )}
                <Badge className={cn('text-xs', getStatusColor(delivery.status))}>
                  {delivery.status}
                </Badge>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No recent deliveries</p>
          </div>
        )}
      </div>
    </Card>
  );
};

const WebhookForm: React.FC<{
  webhook?: SlackWebhookConfig & { id: string };
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: WebhookFormData) => void;
}> = ({ webhook, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState<WebhookFormData>({
    url: '',
    channel: '',
    username: 'Infrastructure Bot',
    iconEmoji: ':robot_face:',
    enabled: true,
  });

  useEffect(() => {
    if (webhook) {
      setFormData({
        url: webhook.url,
        channel: webhook.channel,
        username: webhook.username || 'Infrastructure Bot',
        iconEmoji: webhook.iconEmoji || ':robot_face:',
        enabled: webhook.enabled,
      });
    } else {
      setFormData({
        url: '',
        channel: '',
        username: 'Infrastructure Bot',
        iconEmoji: ':robot_face:',
        enabled: true,
      });
    }
  }, [webhook]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <div className="max-w-md mx-auto p-6">
        <h2 className="text-xl font-semibold mb-4">
          {webhook ? 'Edit Webhook' : 'Add Webhook'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Webhook URL *
            </label>
            <Input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
              placeholder="https://hooks.slack.com/services/..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Channel *
            </label>
            <Input
              type="text"
              value={formData.channel}
              onChange={(e) => setFormData(prev => ({ ...prev, channel: e.target.value }))}
              placeholder="#alerts"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <Input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
              placeholder="Infrastructure Bot"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Icon Emoji
            </label>
            <Input
              type="text"
              value={formData.iconEmoji}
              onChange={(e) => setFormData(prev => ({ ...prev, iconEmoji: e.target.value }))}
              placeholder=":robot_face:"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.enabled}
              onCheckedChange={(enabled) => setFormData(prev => ({ ...prev, enabled }))}
              id="enabled"
            />
            <label htmlFor="enabled" className="text-sm text-gray-700">
              Enable webhook
            </label>
          </div>

          <div className="flex space-x-3 pt-4">
            <Button type="submit" className="flex-1">
              {webhook ? 'Update' : 'Create'} Webhook
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
};

const TemplateForm: React.FC<{
  template?: SlackMessageTemplate;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: TemplateFormData) => void;
}> = ({ template, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    template: '',
    eventType: '',
    variables: [],
  });

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        template: template.template,
        eventType: template.eventType,
        variables: template.variables,
      });
    } else {
      setFormData({
        name: '',
        template: '',
        eventType: '',
        variables: [],
      });
    }
  }, [template]);

  const extractVariables = (templateText: string) => {
    const matches = templateText.match(/\{\{([^}]+)\}\}/g) || [];
    return [...new Set(matches.map(match => match.slice(2, -2)))];
  };

  const handleTemplateChange = (templateText: string) => {
    const variables = extractVariables(templateText);
    setFormData(prev => ({ ...prev, template: templateText, variables }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <div className="max-w-2xl mx-auto p-6">
        <h2 className="text-xl font-semibold mb-4">
          {template ? 'Edit Template' : 'Create Template'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template Name *
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Health Alert Template"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Type *
              </label>
              <Input
                type="text"
                value={formData.eventType}
                onChange={(e) => setFormData(prev => ({ ...prev, eventType: e.target.value }))}
                placeholder="health-alert"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message Template *
            </label>
            <Textarea
              value={formData.template}
              onChange={(e) => handleTemplateChange(e.target.value)}
              placeholder=":warning: *{{severity}}* Alert\n\n*Service:* {{service}}\n*Status:* {{status}}"
              rows={6}
              className="font-mono text-sm"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Use {'{{variable}}'} syntax for dynamic content
            </p>
          </div>

          {formData.variables.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Detected Variables
              </label>
              <div className="flex flex-wrap gap-2">
                {formData.variables.map((variable) => (
                  <Badge key={variable} variant="outline" className="text-xs">
                    {variable}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <Button type="submit" className="flex-1">
              {template ? 'Update' : 'Create'} Template
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
};

// ===== MAIN COMPONENT =====

export const SlackIntegrationPanel: React.FC = () => {
  const [webhooks, setWebhooks] = useState<(SlackWebhookConfig & { id: string })[]>(
    mockWebhooks.map((w, i) => ({ ...w, id: `webhook-${i + 1}` }))
  );
  const [templates, setTemplates] = useState<SlackMessageTemplate[]>(mockTemplates);
  const [deliveries, setDeliveries] = useState<SlackDeliveryStatus[]>(mockDeliveries);

  const [selectedWebhook, setSelectedWebhook] = useState<(SlackWebhookConfig & { id: string }) | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<SlackMessageTemplate | null>(null);
  const [showWebhookForm, setShowWebhookForm] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<SlackMessageTemplate | null>(null);

  // Webhook management
  const handleSaveWebhook = (data: WebhookFormData) => {
    if (selectedWebhook) {
      setWebhooks(prev => prev.map(w => 
        w.id === selectedWebhook.id ? { ...data, id: w.id } : w
      ));
    } else {
      const newWebhook = { ...data, id: `webhook-${Date.now()}` };
      setWebhooks(prev => [...prev, newWebhook]);
    }
    setSelectedWebhook(null);
  };

  const handleDeleteWebhook = (id: string) => {
    setWebhooks(prev => prev.filter(w => w.id !== id));
  };

  const handleToggleWebhook = (id: string, enabled: boolean) => {
    setWebhooks(prev => prev.map(w => 
      w.id === id ? { ...w, enabled } : w
    ));
  };

  const handleTestWebhook = async (id: string) => {
    const webhook = webhooks.find(w => w.id === id);
    if (!webhook) return;

    // Add test delivery
    const testDelivery: SlackDeliveryStatus = {
      id: `test-${Date.now()}`,
      timestamp: new Date().toISOString(),
      webhookId: id,
      status: 'pending',
      message: 'Test message sent',
    };

    setDeliveries(prev => [testDelivery, ...prev]);

    // Simulate delivery result
    setTimeout(() => {
      setDeliveries(prev => prev.map(d => 
        d.id === testDelivery.id 
          ? { ...d, status: 'delivered', responseTime: 245 }
          : d
      ));
    }, 2000);
  };

  // Template management
  const handleSaveTemplate = (data: TemplateFormData) => {
    if (selectedTemplate) {
      setTemplates(prev => prev.map(t => 
        t.id === selectedTemplate.id 
          ? { ...data, id: t.id }
          : t
      ));
    } else {
      const newTemplate: SlackMessageTemplate = {
        ...data,
        id: `template-${Date.now()}`,
      };
      setTemplates(prev => [...prev, newTemplate]);
    }
    setSelectedTemplate(null);
  };

  const handleDeleteTemplate = (id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  const stats = useMemo(() => {
    const totalDeliveries = deliveries.length;
    const successful = deliveries.filter(d => d.status === 'delivered').length;
    const failed = deliveries.filter(d => d.status === 'failed').length;
    const successRate = totalDeliveries > 0 ? (successful / totalDeliveries) * 100 : 0;

    return {
      totalWebhooks: webhooks.length,
      activeWebhooks: webhooks.filter(w => w.enabled).length,
      totalTemplates: templates.length,
      successRate,
      totalDeliveries,
    };
  }, [webhooks, templates, deliveries]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Slack Integration</h1>
          <p className="text-gray-600 mt-1">
            Manage webhooks, message templates, and delivery monitoring
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => {
              setSelectedTemplate(null);
              setShowTemplateForm(true);
            }}
            variant="outline"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Template
          </Button>
          <Button
            onClick={() => {
              setSelectedWebhook(null);
              setShowWebhookForm(true);
            }}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Webhook
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-green-100 text-green-600">
              <Webhook className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Webhooks</p>
              <p className="text-xl font-semibold">
                {stats.activeWebhooks}/{stats.totalWebhooks}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Templates</p>
              <p className="text-xl font-semibold">{stats.totalTemplates}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Deliveries</p>
              <p className="text-xl font-semibold">{stats.totalDeliveries}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Success Rate</p>
              <p className="text-xl font-semibold">{stats.successRate.toFixed(1)}%</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-red-100 text-red-600">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Alerts</p>
              <p className="text-xl font-semibold">
                {deliveries.filter(d => d.status === 'failed').length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Webhooks Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Webhooks ({webhooks.length})</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {webhooks.map((webhook) => (
              <WebhookCard
                key={webhook.id}
                webhook={webhook}
                onEdit={(w) => {
                  setSelectedWebhook(w);
                  setShowWebhookForm(true);
                }}
                onDelete={handleDeleteWebhook}
                onToggle={handleToggleWebhook}
                onTest={handleTestWebhook}
              />
            ))}
          </AnimatePresence>
        </div>

        {webhooks.length === 0 && (
          <Card className="p-8 text-center">
            <Webhook className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No webhooks configured
            </h3>
            <p className="text-gray-600 mb-4">
              Add your first Slack webhook to start receiving notifications
            </p>
            <Button
              onClick={() => {
                setSelectedWebhook(null);
                setShowWebhookForm(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Webhook
            </Button>
          </Card>
        )}
      </div>

      {/* Templates Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Message Templates ({templates.length})</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onEdit={(t) => {
                  setSelectedTemplate(t);
                  setShowTemplateForm(true);
                }}
                onDelete={handleDeleteTemplate}
                onPreview={setPreviewTemplate}
              />
            ))}
          </AnimatePresence>
        </div>

        {templates.length === 0 && (
          <Card className="p-8 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No templates created
            </h3>
            <p className="text-gray-600 mb-4">
              Create message templates to standardize your notifications
            </p>
            <Button
              onClick={() => {
                setSelectedTemplate(null);
                setShowTemplateForm(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </Card>
        )}
      </div>

      {/* Delivery Status */}
      <DeliveryStatus deliveries={deliveries} />

      {/* Modals */}
      <WebhookForm
        webhook={selectedWebhook}
        isOpen={showWebhookForm}
        onClose={() => {
          setShowWebhookForm(false);
          setSelectedWebhook(null);
        }}
        onSave={handleSaveWebhook}
      />

      <TemplateForm
        template={selectedTemplate}
        isOpen={showTemplateForm}
        onClose={() => {
          setShowTemplateForm(false);
          setSelectedTemplate(null);
        }}
        onSave={handleSaveTemplate}
      />

      {/* Template Preview Modal */}
      {previewTemplate && (
        <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
          <div className="max-w-md mx-auto p-6">
            <h2 className="text-xl font-semibold mb-4">Template Preview</h2>
            <div className="bg-gray-100 p-4 rounded-lg font-mono text-sm">
              {previewTemplate.template}
            </div>
            <div className="mt-4">
              <h3 className="font-medium mb-2">Variables:</h3>
              <div className="flex flex-wrap gap-2">
                {previewTemplate.variables.map((variable) => (
                  <Badge key={variable} variant="outline" className="text-xs">
                    {variable}
                  </Badge>
                ))}
              </div>
            </div>
            <Button
              onClick={() => setPreviewTemplate(null)}
              className="w-full mt-4"
            >
              Close
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  );
};

export default SlackIntegrationPanel;
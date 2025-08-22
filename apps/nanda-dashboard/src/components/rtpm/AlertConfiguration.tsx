import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Edit3,
  Trash2,
  Bell,
  BellOff,
  AlertTriangle,
  AlertCircle,
  Info,
  Zap,
  Mail,
  MessageSquare,
  Globe,
  Phone,
  Monitor,
  Save,
  X,
  Copy,
  Search,
  Filter,
  Eye,
  Clock,
  Users
} from 'lucide-react';
import {
  Alert,
  AlertAction,
  AlertCondition,
  AlertSeverity,
  AlertOperator,
  MetricType,
  Agent
} from '../../types/rtpm.types';

interface AlertConfigurationProps {
  alerts: Alert[];
  agents: Agent[];
  onCreateAlert: (alert: Omit<Alert, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateAlert: (id: string, alert: Partial<Alert>) => void;
  onDeleteAlert: (id: string) => void;
  onTestAlert: (alert: Alert) => void;
  className?: string;
}

interface AlertFormData {
  name: string;
  description: string;
  agentId?: string;
  metric: MetricType;
  operator: AlertOperator;
  threshold: number;
  severity: AlertSeverity;
  enabled: boolean;
  actions: AlertAction[];
  conditions: AlertCondition[];
  cooldownPeriod: number;
}

const defaultFormData: AlertFormData = {
  name: '',
  description: '',
  metric: 'cpu',
  operator: 'gt',
  threshold: 80,
  severity: 'warning',
  enabled: true,
  actions: [],
  conditions: [],
  cooldownPeriod: 300 // 5 minutes
};

const severityConfig = {
  info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30' },
  warning: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' },
  error: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30' },
  critical: { icon: Zap, color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/30' }
};

const metricLabels = {
  cpu: 'CPU Usage (%)',
  memory: 'Memory Usage (%)',
  responseTime: 'Response Time (ms)',
  requestRate: 'Request Rate (/s)',
  errorRate: 'Error Rate (%)',
  throughput: 'Throughput (/s)',
  activeConnections: 'Active Connections',
  queueDepth: 'Queue Depth',
  diskUsage: 'Disk Usage (%)',
  networkLatency: 'Network Latency (ms)',
  uptime: 'Uptime (%)'
};

const operatorLabels = {
  gt: 'Greater than',
  gte: 'Greater than or equal',
  lt: 'Less than',
  lte: 'Less than or equal',
  eq: 'Equal to',
  neq: 'Not equal to',
  contains: 'Contains',
  not_contains: 'Does not contain'
};

const actionIcons = {
  email: Mail,
  webhook: Globe,
  slack: MessageSquare,
  sms: Phone,
  dashboard: Monitor
};

const SeverityBadge: React.FC<{ severity: AlertSeverity; className?: string }> = ({ severity, className = '' }) => {
  const config = severityConfig[severity];
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${config.color} ${config.bg} ${config.border} border ${className}`}>
      <Icon className="w-3 h-3" />
      <span className="capitalize">{severity}</span>
    </div>
  );
};

const AlertCard: React.FC<{
  alert: Alert;
  agents: Agent[];
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onTest: () => void;
  onDuplicate: () => void;
}> = ({ alert, agents, onEdit, onDelete, onToggle, onTest, onDuplicate }) => {
  const agent = alert.agentId ? agents.find(a => a.id === alert.agentId) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`
        bg-gray-800/50 backdrop-blur-sm border rounded-xl p-4 transition-all duration-200
        ${alert.enabled ? 'border-gray-700' : 'border-gray-600/50 opacity-60'}
        hover:border-gray-600 hover:shadow-lg
      `}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggle}
            className={`p-2 rounded-lg transition-colors ${
              alert.enabled
                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
            }`}
          >
            {alert.enabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          </button>

          <div>
            <h3 className="text-white font-medium">{alert.name}</h3>
            <p className="text-gray-400 text-sm">{alert.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <SeverityBadge severity={alert.severity} />

          <div className="flex items-center gap-1">
            <button
              onClick={onTest}
              className="p-1.5 rounded hover:bg-gray-700/50 text-gray-400 hover:text-white"
              title="Test alert"
            >
              <Eye className="w-4 h-4" />
            </button>

            <button
              onClick={onDuplicate}
              className="p-1.5 rounded hover:bg-gray-700/50 text-gray-400 hover:text-white"
              title="Duplicate alert"
            >
              <Copy className="w-4 h-4" />
            </button>

            <button
              onClick={onEdit}
              className="p-1.5 rounded hover:bg-gray-700/50 text-gray-400 hover:text-white"
              title="Edit alert"
            >
              <Edit3 className="w-4 h-4" />
            </button>

            <button
              onClick={onDelete}
              className="p-1.5 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400"
              title="Delete alert"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <span className="text-gray-400 text-xs">Target:</span>
          <p className="text-white text-sm">
            {agent ? agent.name : 'All Agents'}
          </p>
        </div>

        <div>
          <span className="text-gray-400 text-xs">Condition:</span>
          <p className="text-white text-sm">
            {metricLabels[alert.metric]} {operatorLabels[alert.operator]} {alert.threshold}
          </p>
        </div>
      </div>

      {alert.actions.length > 0 && (
        <div className="mb-3">
          <span className="text-gray-400 text-xs block mb-2">Actions:</span>
          <div className="flex items-center gap-2">
            {alert.actions.map((action, index) => {
              const Icon = actionIcons[action.type as keyof typeof actionIcons];
              return (
                <div
                  key={index}
                  className="flex items-center gap-1 px-2 py-1 bg-gray-700/50 rounded text-xs text-gray-300"
                >
                  <Icon className="w-3 h-3" />
                  <span className="capitalize">{action.type}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-gray-700/50">
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Cooldown: {alert.cooldownPeriod}s</span>
          </div>

          {alert.lastTriggered && (
            <div>
              Last triggered: {new Date(alert.lastTriggered).toLocaleString()}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const AlertForm: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  initialData?: Alert;
  agents: Agent[];
  onSubmit: (data: AlertFormData) => void;
}> = ({ isOpen, onClose, initialData, agents, onSubmit }) => {
  const [formData, setFormData] = useState<AlertFormData>(() => {
    if (initialData) {
      return {
        name: initialData.name,
        description: initialData.description || '',
        agentId: initialData.agentId,
        metric: initialData.metric,
        operator: initialData.operator,
        threshold: initialData.threshold,
        severity: initialData.severity,
        enabled: initialData.enabled,
        actions: initialData.actions,
        conditions: initialData.conditions || [],
        cooldownPeriod: initialData.cooldownPeriod || 300
      };
    }
    return { ...defaultFormData };
  });

  const [newAction, setNewAction] = useState<Partial<AlertAction>>({
    type: 'email',
    enabled: true,
    config: {}
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  const addAction = () => {
    if (newAction.type) {
      setFormData({
        ...formData,
        actions: [...formData.actions, newAction as AlertAction]
      });
      setNewAction({ type: 'email', enabled: true, config: {} });
    }
  };

  const removeAction = (index: number) => {
    setFormData({
      ...formData,
      actions: formData.actions.filter((_, i) => i !== index)
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">
                  {initialData ? 'Edit Alert' : 'Create Alert'}
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Alert Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                      placeholder="High CPU Usage"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Severity
                    </label>
                    <select
                      value={formData.severity}
                      onChange={(e) => setFormData({ ...formData, severity: e.target.value as AlertSeverity })}
                      className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="info">Info</option>
                      <option value="warning">Warning</option>
                      <option value="error">Error</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                    rows={3}
                    placeholder="Alert description..."
                  />
                </div>

                {/* Target */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Target Agent
                  </label>
                  <select
                    value={formData.agentId || ''}
                    onChange={(e) => setFormData({ ...formData, agentId: e.target.value || undefined })}
                    className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">All Agents</option>
                    {agents.map(agent => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name} ({agent.id})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Condition */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Metric
                    </label>
                    <select
                      value={formData.metric}
                      onChange={(e) => setFormData({ ...formData, metric: e.target.value as MetricType })}
                      className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                    >
                      {Object.entries(metricLabels).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Operator
                    </label>
                    <select
                      value={formData.operator}
                      onChange={(e) => setFormData({ ...formData, operator: e.target.value as AlertOperator })}
                      className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                    >
                      {Object.entries(operatorLabels).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Threshold
                    </label>
                    <input
                      type="number"
                      value={formData.threshold}
                      onChange={(e) => setFormData({ ...formData, threshold: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                      step="0.1"
                      required
                    />
                  </div>
                </div>

                {/* Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Cooldown Period (seconds)
                    </label>
                    <input
                      type="number"
                      value={formData.cooldownPeriod}
                      onChange={(e) => setFormData({ ...formData, cooldownPeriod: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                      min="0"
                    />
                  </div>

                  <div className="flex items-center">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.enabled}
                        onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                        className="rounded border-gray-600 bg-gray-700"
                      />
                      <span className="text-gray-300">Enable alert</span>
                    </label>
                  </div>
                </div>

                {/* Actions */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Actions
                  </label>

                  <div className="space-y-2 mb-4">
                    {formData.actions.map((action, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                        <div className="flex items-center gap-2">
                          {React.createElement(actionIcons[action.type as keyof typeof actionIcons], { className: "w-4 h-4" })}
                          <span className="capitalize">{action.type}</span>
                          {!action.enabled && <span className="text-gray-500 text-sm">(disabled)</span>}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAction(index)}
                          className="p-1 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={newAction.type}
                      onChange={(e) => setNewAction({ ...newAction, type: e.target.value as AlertAction['type'] })}
                      className="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="email">Email</option>
                      <option value="webhook">Webhook</option>
                      <option value="slack">Slack</option>
                      <option value="sms">SMS</option>
                      <option value="dashboard">Dashboard</option>
                    </select>

                    <button
                      type="button"
                      onClick={addAction}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      Add Action
                    </button>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex items-center gap-3 pt-6 border-t border-gray-700">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {initialData ? 'Update Alert' : 'Create Alert'}
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const AlertConfiguration: React.FC<AlertConfigurationProps> = ({
  alerts,
  agents,
  onCreateAlert,
  onUpdateAlert,
  onDeleteAlert,
  onTestAlert,
  className = ''
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<AlertSeverity | 'all'>('all');
  const [filterEnabled, setFilterEnabled] = useState<'all' | 'enabled' | 'disabled'>('all');

  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      const matchesSearch = !searchTerm ||
        alert.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSeverity = filterSeverity === 'all' || alert.severity === filterSeverity;
      const matchesEnabled = filterEnabled === 'all' ||
        (filterEnabled === 'enabled' && alert.enabled) ||
        (filterEnabled === 'disabled' && !alert.enabled);

      return matchesSearch && matchesSeverity && matchesEnabled;
    });
  }, [alerts, searchTerm, filterSeverity, filterEnabled]);

  const handleFormSubmit = (data: AlertFormData) => {
    if (editingAlert) {
      onUpdateAlert(editingAlert.id, {
        ...data,
        updatedAt: new Date()
      });
    } else {
      onCreateAlert({
        ...data,
        enabled: data.enabled
      });
    }
    setEditingAlert(null);
  };

  const handleEdit = (alert: Alert) => {
    setEditingAlert(alert);
    setShowForm(true);
  };

  const handleDuplicate = (alert: Alert) => {
    const duplicated = {
      ...alert,
      name: `${alert.name} (Copy)`,
      id: undefined,
      createdAt: undefined,
      updatedAt: undefined
    };
    setEditingAlert(duplicated as Alert);
    setShowForm(true);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Alert Configuration</h2>
          <p className="text-gray-400 mt-1">Configure monitoring alerts and notification rules</p>
        </div>

        <button
          onClick={() => {
            setEditingAlert(null);
            setShowForm(true);
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Alert
        </button>
      </div>

      {/* Filters */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search alerts..."
                className="w-full pl-10 pr-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value as AlertSeverity | 'all')}
            className="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Severities</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
            <option value="critical">Critical</option>
          </select>

          <select
            value={filterEnabled}
            onChange={(e) => setFilterEnabled(e.target.value as 'all' | 'enabled' | 'disabled')}
            className="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Alerts</option>
            <option value="enabled">Enabled Only</option>
            <option value="disabled">Disabled Only</option>
          </select>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700/50">
          <div className="text-sm text-gray-400">
            Showing {filteredAlerts.length} of {alerts.length} alerts
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>{alerts.filter(a => a.enabled).length} enabled</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
              <span>{alerts.filter(a => !a.enabled).length} disabled</span>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredAlerts.map(alert => (
            <AlertCard
              key={alert.id}
              alert={alert}
              agents={agents}
              onEdit={() => handleEdit(alert)}
              onDelete={() => onDeleteAlert(alert.id)}
              onToggle={() => onUpdateAlert(alert.id, { enabled: !alert.enabled })}
              onTest={() => onTestAlert(alert)}
              onDuplicate={() => handleDuplicate(alert)}
            />
          ))}
        </AnimatePresence>
      </div>

      {filteredAlerts.length === 0 && (
        <div className="text-center py-12">
          <Bell className="w-16 h-16 mx-auto text-gray-500 mb-4" />
          <h3 className="text-xl font-medium text-gray-300 mb-2">No alerts found</h3>
          <p className="text-gray-500 mb-6">
            {searchTerm || filterSeverity !== 'all' || filterEnabled !== 'all'
              ? 'Try adjusting your filters'
              : 'Create your first alert to start monitoring your agents'
            }
          </p>
          {(!searchTerm && filterSeverity === 'all' && filterEnabled === 'all') && (
            <button
              onClick={() => {
                setEditingAlert(null);
                setShowForm(true);
              }}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 mx-auto"
            >
              <Plus className="w-5 h-5" />
              Create Your First Alert
            </button>
          )}
        </div>
      )}

      {/* Alert Form Modal */}
      <AlertForm
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingAlert(null);
        }}
        initialData={editingAlert || undefined}
        agents={agents}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
};

export default AlertConfiguration;

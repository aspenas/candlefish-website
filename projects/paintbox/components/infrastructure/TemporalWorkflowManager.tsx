/**
 * Temporal Workflow Manager
 * Workflow execution interface with real-time status tracking
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Square,
  Clock,
  DollarSign,
  User,
  MessageSquare,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RotateCcw,
  Filter,
  Search,
  Download,
  Eye,
  Trash2,
  Settings,
  TrendingUp,
  Zap,
  Timer,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Dialog } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

import {
  useWorkflowStore,
  useActiveWorkflow,
  useWorkflowMetrics,
  useRecentExecutions,
} from '@/stores/useInfrastructureStore';
import { useWorkflowWebSocket } from '@/hooks/useInfrastructureWebSocket';
import {
  WorkflowInput,
  WorkflowExecution,
  WorkflowMetrics,
} from '@/lib/types/infrastructure';

// ===== TYPES =====

interface WorkflowFormData {
  prompt: string;
  userId: string;
  conversationId?: string;
  timeout?: number;
  maxCost?: number;
  preferredModel?: string;
}

interface ExecutionCardProps {
  execution: WorkflowExecution;
  onView: (execution: WorkflowExecution) => void;
  onCancel: (id: string) => void;
  onRetry: (execution: WorkflowExecution) => void;
}

interface MetricsCardProps {
  metrics: WorkflowMetrics;
}

// ===== COMPONENTS =====

const StatusIcon: React.FC<{ status: WorkflowExecution['status'] }> = ({ status }) => {
  const icons = {
    running: <Activity className="h-4 w-4 animate-pulse text-blue-600" />,
    completed: <CheckCircle className="h-4 w-4 text-green-600" />,
    failed: <XCircle className="h-4 w-4 text-red-600" />,
    cancelled: <Square className="h-4 w-4 text-gray-600" />,
    terminated: <AlertTriangle className="h-4 w-4 text-orange-600" />,
  };
  return icons[status] || <Clock className="h-4 w-4 text-gray-400" />;
};

const StatusBadge: React.FC<{ status: WorkflowExecution['status'] }> = ({ status }) => {
  const variants = {
    running: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
    terminated: 'bg-orange-100 text-orange-800',
  };

  return (
    <Badge className={cn('text-xs', variants[status])}>
      {status}
    </Badge>
  );
};

const ExecutionCard: React.FC<ExecutionCardProps> = ({ 
  execution, 
  onView, 
  onCancel, 
  onRetry 
}) => {
  const getDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    return end.getTime() - start.getTime();
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const duration = getDuration(execution.startTime, execution.endTime);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <StatusIcon status={execution.status} />
            <div>
              <h3 className="font-medium text-sm truncate max-w-48">
                {execution.input.prompt.slice(0, 60)}
                {execution.input.prompt.length > 60 && '...'}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                ID: {execution.id.slice(0, 8)}
              </p>
            </div>
          </div>
          <StatusBadge status={execution.status} />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-3 text-xs">
          <div className="flex items-center space-x-2">
            <User className="h-3 w-3 text-gray-400" />
            <span className="text-gray-600">{execution.input.userId}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="h-3 w-3 text-gray-400" />
            <span className="text-gray-600">{formatDuration(duration)}</span>
          </div>
          {execution.output?.metadata && (
            <>
              <div className="flex items-center space-x-2">
                <DollarSign className="h-3 w-3 text-gray-400" />
                <span className="text-gray-600">
                  ${execution.output.metadata.llmCost.toFixed(4)}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Zap className="h-3 w-3 text-gray-400" />
                <span className="text-gray-600">
                  {execution.output.metadata.toolsUsed.length} tools
                </span>
              </div>
            </>
          )}
        </div>

        {execution.status === 'running' && execution.progress && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-600">Progress</span>
              <span className="text-xs text-gray-600">{execution.progress}%</span>
            </div>
            <Progress value={execution.progress} className="h-2" />
          </div>
        )}

        {execution.error && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            {execution.error}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {formatDistanceToNow(new Date(execution.startTime), { addSuffix: true })}
          </div>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onView(execution)}
              className="h-7 px-2"
            >
              <Eye className="h-3 w-3" />
            </Button>
            {execution.status === 'running' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCancel(execution.id)}
                className="h-7 px-2 text-red-600 hover:text-red-700"
              >
                <Square className="h-3 w-3" />
              </Button>
            )}
            {execution.status === 'failed' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRetry(execution)}
                className="h-7 px-2 text-blue-600 hover:text-blue-700"
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

const MetricsCard: React.FC<MetricsCardProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="p-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Executions</p>
            <p className="text-xl font-semibold">{metrics.totalExecutions}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-green-100 text-green-600">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Success Rate</p>
            <p className="text-xl font-semibold">{metrics.successRate.toFixed(1)}%</p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
            <Timer className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Avg Duration</p>
            <p className="text-xl font-semibold">
              {Math.round(metrics.averageDuration / 1000)}s
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Avg Cost</p>
            <p className="text-xl font-semibold">${metrics.averageCost.toFixed(4)}</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

const WorkflowForm: React.FC<{
  onSubmit: (data: WorkflowFormData) => void;
  isExecuting: boolean;
}> = ({ onSubmit, isExecuting }) => {
  const [formData, setFormData] = useState<WorkflowFormData>({
    prompt: '',
    userId: 'current-user',
    timeout: 300000, // 5 minutes
    maxCost: 1.0,
    preferredModel: 'claude-3-sonnet',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.prompt.trim()) {
      onSubmit(formData);
      setFormData(prev => ({ ...prev, prompt: '' }));
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Execute Workflow</h3>
        <Badge variant="outline" className="text-xs">
          Temporal
        </Badge>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Prompt *
          </label>
          <Textarea
            value={formData.prompt}
            onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
            placeholder="Enter your workflow prompt..."
            rows={3}
            className="w-full"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User ID
            </label>
            <Input
              type="text"
              value={formData.userId}
              onChange={(e) => setFormData(prev => ({ ...prev, userId: e.target.value }))}
              placeholder="user-123"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Timeout (ms)
            </label>
            <Input
              type="number"
              value={formData.timeout}
              onChange={(e) => setFormData(prev => ({ ...prev, timeout: parseInt(e.target.value) }))}
              min={10000}
              max={1800000}
              step={10000}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Cost ($)
            </label>
            <Input
              type="number"
              value={formData.maxCost}
              onChange={(e) => setFormData(prev => ({ ...prev, maxCost: parseFloat(e.target.value) }))}
              min={0.01}
              max={10}
              step={0.01}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Preferred Model
          </label>
          <select
            value={formData.preferredModel}
            onChange={(e) => setFormData(prev => ({ ...prev, preferredModel: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="claude-3-sonnet">Claude 3 Sonnet</option>
            <option value="claude-3-haiku">Claude 3 Haiku</option>
            <option value="gpt-4">GPT-4</option>
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
          </select>
        </div>

        <Button
          type="submit"
          disabled={!formData.prompt.trim() || isExecuting}
          className="w-full"
        >
          {isExecuting ? (
            <>
              <Activity className="h-4 w-4 mr-2 animate-spin" />
              Executing...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Execute Workflow
            </>
          )}
        </Button>
      </form>
    </Card>
  );
};

const ExecutionDetails: React.FC<{
  execution: WorkflowExecution;
  isOpen: boolean;
  onClose: () => void;
}> = ({ execution, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Workflow Details</h2>
          <StatusBadge status={execution.status} />
        </div>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="font-medium mb-2">Execution Info</h3>
              <div className="space-y-2 text-sm">
                <div><strong>ID:</strong> {execution.id}</div>
                <div><strong>Status:</strong> {execution.status}</div>
                <div><strong>Started:</strong> {format(new Date(execution.startTime), 'PPpp')}</div>
                {execution.endTime && (
                  <div><strong>Ended:</strong> {format(new Date(execution.endTime), 'PPpp')}</div>
                )}
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-medium mb-2">Input Parameters</h3>
              <div className="space-y-2 text-sm">
                <div><strong>User:</strong> {execution.input.userId}</div>
                <div><strong>Model:</strong> {execution.input.options?.preferredModel || 'default'}</div>
                <div><strong>Timeout:</strong> {execution.input.options?.timeout || 'default'}ms</div>
                <div><strong>Max Cost:</strong> ${execution.input.options?.maxCost || 'unlimited'}</div>
              </div>
            </Card>
          </div>

          {/* Prompt */}
          <Card className="p-4">
            <h3 className="font-medium mb-2">Prompt</h3>
            <div className="bg-gray-50 p-3 rounded text-sm font-mono whitespace-pre-wrap">
              {execution.input.prompt}
            </div>
          </Card>

          {/* Output */}
          {execution.output && (
            <Card className="p-4">
              <h3 className="font-medium mb-2">Response</h3>
              <div className="bg-gray-50 p-3 rounded text-sm whitespace-pre-wrap">
                {execution.output.response}
              </div>
              
              {execution.output.metadata && (
                <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <strong>Duration:</strong> {execution.output.metadata.duration}ms
                  </div>
                  <div>
                    <strong>Cost:</strong> ${execution.output.metadata.llmCost.toFixed(4)}
                  </div>
                  <div>
                    <strong>Tools:</strong> {execution.output.metadata.toolsUsed.join(', ') || 'None'}
                  </div>
                  <div>
                    <strong>Success:</strong> {execution.output.metadata.success ? 'Yes' : 'No'}
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Error */}
          {execution.error && (
            <Card className="p-4 border-red-200 bg-red-50">
              <h3 className="font-medium mb-2 text-red-800">Error</h3>
              <div className="text-sm text-red-700 font-mono">
                {execution.error}
              </div>
            </Card>
          )}
        </div>
      </div>
    </Dialog>
  );
};

// ===== MAIN COMPONENT =====

export const TemporalWorkflowManager: React.FC = () => {
  const {
    executions,
    isExecuting,
    addExecution,
    updateExecution,
    setExecuting,
    setFilters,
    filters,
  } = useWorkflowStore();

  const activeWorkflow = useActiveWorkflow();
  const workflowMetrics = useWorkflowMetrics();
  const recentExecutions = useRecentExecutions();

  const { subscribeToWorkflow, cancelWorkflow } = useWorkflowWebSocket();

  const [selectedExecution, setSelectedExecution] = useState<WorkflowExecution | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Execute workflow
  const executeWorkflow = async (formData: WorkflowFormData) => {
    try {
      setExecuting(true);

      const workflowInput: WorkflowInput = {
        prompt: formData.prompt,
        userId: formData.userId,
        conversationId: formData.conversationId,
        options: {
          timeout: formData.timeout,
          maxCost: formData.maxCost,
          preferredModel: formData.preferredModel,
        },
      };

      const response = await fetch('/api/v1/agent/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workflowInput),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Create execution record
      const execution: WorkflowExecution = {
        id: result.workflowId || `wf_${Date.now()}`,
        status: 'running',
        startTime: new Date().toISOString(),
        input: workflowInput,
        progress: 0,
      };

      addExecution(execution);
      subscribeToWorkflow(execution.id);

    } catch (error) {
      console.error('Failed to execute workflow:', error);
      setExecuting(false);
    }
  };

  // Cancel workflow
  const handleCancelWorkflow = async (workflowId: string) => {
    try {
      cancelWorkflow(workflowId);
      updateExecution(workflowId, { status: 'cancelled' });
    } catch (error) {
      console.error('Failed to cancel workflow:', error);
    }
  };

  // Retry workflow
  const handleRetryWorkflow = (execution: WorkflowExecution) => {
    executeWorkflow({
      prompt: execution.input.prompt,
      userId: execution.input.userId,
      conversationId: execution.input.conversationId,
      timeout: execution.input.options?.timeout,
      maxCost: execution.input.options?.maxCost,
      preferredModel: execution.input.options?.preferredModel,
    });
  };

  // Filtered executions
  const filteredExecutions = useMemo(() => {
    let filtered = executions;

    if (searchTerm) {
      filtered = filtered.filter(execution =>
        execution.input.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
        execution.input.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        execution.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(execution => execution.status === statusFilter);
    }

    return filtered;
  }, [executions, searchTerm, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Temporal Workflows</h1>
          <p className="text-gray-600 mt-1">
            Execute and monitor agent workflows with real-time tracking
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            {executions.filter(e => e.status === 'running').length} Running
          </Badge>
          <Badge variant="outline" className="text-xs">
            {executions.length} Total
          </Badge>
        </div>
      </div>

      {/* Metrics */}
      {workflowMetrics && <MetricsCard metrics={workflowMetrics} />}

      {/* Workflow Form */}
      <WorkflowForm onSubmit={executeWorkflow} isExecuting={isExecuting} />

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search workflows..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </Card>

      {/* Executions List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">
          Workflow Executions ({filteredExecutions.length})
        </h2>
        
        <AnimatePresence>
          {filteredExecutions.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredExecutions.map((execution) => (
                <ExecutionCard
                  key={execution.id}
                  execution={execution}
                  onView={setSelectedExecution}
                  onCancel={handleCancelWorkflow}
                  onRetry={handleRetryWorkflow}
                />
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <Activity className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No workflows found
              </h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your filters'
                  : 'Execute your first workflow to get started'
                }
              </p>
            </Card>
          )}
        </AnimatePresence>
      </div>

      {/* Execution Details Modal */}
      {selectedExecution && (
        <ExecutionDetails
          execution={selectedExecution}
          isOpen={!!selectedExecution}
          onClose={() => setSelectedExecution(null)}
        />
      )}
    </div>
  );
};

export default TemporalWorkflowManager;
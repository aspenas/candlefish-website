/**
 * Load Testing Console
 * Real-time metrics display, scenario management, and test execution
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Square,
  Plus,
  Edit,
  Trash2,
  Copy,
  Download,
  Users,
  Zap,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  BarChart3,
  Target,
  Settings,
  RefreshCw,
  Calendar,
  Timer,
  Gauge,
} from 'lucide-react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { format, formatDistanceToNow } from 'date-fns';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Dialog } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

import {
  useLoadTestStore,
  useActiveLoadTest,
  useLoadTestMetrics,
} from '@/stores/useInfrastructureStore';
import { useLoadTestWebSocket } from '@/hooks/useInfrastructureWebSocket';
import {
  LoadTestScenario,
  LoadTestResult,
  LoadTestRealTimeMetrics,
  LoadTestEndpoint,
  LoadTestMetrics,
} from '@/lib/types/infrastructure';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// ===== TYPES =====

interface ScenarioFormData {
  name: string;
  description: string;
  config: {
    duration: number;
    rampUp: number;
    virtualUsers: number;
    requestsPerSecond?: number;
  };
  endpoints: LoadTestEndpoint[];
}

interface EndpointFormData {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  headers: Record<string, string>;
  body?: any;
  weight: number;
}

// ===== MOCK DATA =====

const mockScenarios: LoadTestScenario[] = [
  {
    id: 'scenario-1',
    name: 'API Health Check',
    description: 'Basic health check endpoints',
    config: {
      duration: 300, // 5 minutes
      rampUp: 60,    // 1 minute
      virtualUsers: 50,
      requestsPerSecond: 10,
    },
    endpoints: [
      {
        method: 'GET',
        url: '/api/health',
        weight: 70,
      },
      {
        method: 'GET',
        url: '/api/status',
        weight: 30,
      },
    ],
  },
  {
    id: 'scenario-2',
    name: 'Workflow Stress Test',
    description: 'Heavy workflow execution testing',
    config: {
      duration: 600, // 10 minutes
      rampUp: 120,   // 2 minutes
      virtualUsers: 100,
      requestsPerSecond: 25,
    },
    endpoints: [
      {
        method: 'POST',
        url: '/api/v1/agent/execute',
        headers: { 'Content-Type': 'application/json' },
        body: { prompt: 'test workflow', userId: 'load-test' },
        weight: 60,
      },
      {
        method: 'GET',
        url: '/api/v1/agent/status/{workflowId}',
        weight: 40,
      },
    ],
  },
];

const mockResults: LoadTestResult[] = [
  {
    id: 'result-1',
    scenarioId: 'scenario-1',
    startTime: new Date(Date.now() - 900000).toISOString(),
    endTime: new Date(Date.now() - 600000).toISOString(),
    status: 'completed',
    metrics: {
      totalRequests: 1500,
      successfulRequests: 1485,
      failedRequests: 15,
      averageResponseTime: 245,
      p95ResponseTime: 580,
      p99ResponseTime: 1200,
      requestsPerSecond: 5.0,
      errorRate: 1.0,
      throughput: 4.95,
    },
  },
];

// ===== COMPONENTS =====

const MetricsChart: React.FC<{
  metrics: LoadTestRealTimeMetrics[];
  type: 'response-time' | 'throughput' | 'errors';
}> = ({ metrics, type }) => {
  const chartData = useMemo(() => {
    const labels = metrics.map(m => 
      new Date(m.timestamp).toLocaleTimeString('en-US', { 
        hour12: false, 
        minute: '2-digit', 
        second: '2-digit' 
      })
    );

    let data: number[] = [];
    let label = '';
    let color = '';

    switch (type) {
      case 'response-time':
        data = metrics.map(m => m.responseTime);
        label = 'Response Time (ms)';
        color = 'rgb(59, 130, 246)';
        break;
      case 'throughput':
        data = metrics.map(m => m.requestsPerSecond);
        label = 'Requests/Second';
        color = 'rgb(16, 185, 129)';
        break;
      case 'errors':
        data = metrics.map(m => m.errorRate);
        label = 'Error Rate (%)';
        color = 'rgb(239, 68, 68)';
        break;
    }

    return {
      labels,
      datasets: [
        {
          label,
          data,
          borderColor: color,
          backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.1)'),
          borderWidth: 2,
          fill: true,
          tension: 0.4,
        },
      ],
    };
  }, [metrics, type]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      x: {
        display: true,
        grid: { display: false },
      },
      y: {
        display: true,
        beginAtZero: true,
        grid: { color: 'rgba(0, 0, 0, 0.1)' },
      },
    },
  };

  return (
    <div className="h-48">
      <Line data={chartData} options={options} />
    </div>
  );
};

const ScenarioCard: React.FC<{
  scenario: LoadTestScenario;
  onEdit: (scenario: LoadTestScenario) => void;
  onDelete: (id: string) => void;
  onRun: (id: string) => void;
  onDuplicate: (scenario: LoadTestScenario) => void;
  isRunning?: boolean;
}> = ({ scenario, onEdit, onDelete, onRun, onDuplicate, isRunning }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-medium text-sm">{scenario.name}</h3>
            <p className="text-xs text-gray-500 mt-1">{scenario.description}</p>
          </div>
          <div className="flex items-center space-x-2">
            {isRunning && (
              <Badge className="text-xs bg-green-100 text-green-800">
                Running
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {scenario.endpoints.length} endpoints
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-3 text-xs">
          <div className="flex items-center space-x-2">
            <Users className="h-3 w-3 text-gray-400" />
            <span className="text-gray-600">{scenario.config.virtualUsers} users</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="h-3 w-3 text-gray-400" />
            <span className="text-gray-600">{scenario.config.duration}s</span>
          </div>
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-3 w-3 text-gray-400" />
            <span className="text-gray-600">{scenario.config.rampUp}s ramp</span>
          </div>
          <div className="flex items-center space-x-2">
            <Zap className="h-3 w-3 text-gray-400" />
            <span className="text-gray-600">
              {scenario.config.requestsPerSecond || 'Max'} req/s
            </span>
          </div>
        </div>

        <div className="mb-3">
          <div className="text-xs text-gray-600 mb-1">Endpoints:</div>
          <div className="space-y-1">
            {scenario.endpoints.slice(0, 2).map((endpoint, index) => (
              <div key={index} className="flex items-center text-xs">
                <Badge variant="outline" className="mr-2 text-xs px-1">
                  {endpoint.method}
                </Badge>
                <span className="text-gray-600 truncate">{endpoint.url}</span>
                <span className="ml-auto text-gray-500">{endpoint.weight}%</span>
              </div>
            ))}
            {scenario.endpoints.length > 2 && (
              <div className="text-xs text-gray-500">
                +{scenario.endpoints.length - 2} more endpoints
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {scenario.config.duration / 60} min test
          </div>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRun(scenario.id)}
              disabled={isRunning}
              className="h-7 px-2 text-green-600 hover:text-green-700"
            >
              <Play className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDuplicate(scenario)}
              className="h-7 px-2"
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(scenario)}
              className="h-7 px-2"
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(scenario.id)}
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

const RealTimeMetrics: React.FC<{
  metrics: LoadTestRealTimeMetrics | null;
  isRunning: boolean;
}> = ({ metrics, isRunning }) => {
  if (!isRunning || !metrics) {
    return (
      <Card className="p-6 text-center">
        <Activity className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No Active Tests
        </h3>
        <p className="text-gray-600">
          Start a load test to see real-time metrics
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Users</p>
              <p className="text-xl font-semibold">{metrics.activeUsers}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-green-100 text-green-600">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Requests/sec</p>
              <p className="text-xl font-semibold">{metrics.requestsPerSecond}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
              <Timer className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Response Time</p>
              <p className="text-xl font-semibold">{metrics.responseTime}ms</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className={cn(
              'p-2 rounded-lg',
              metrics.errorRate > 5 
                ? 'bg-red-100 text-red-600' 
                : 'bg-yellow-100 text-yellow-600'
            )}>
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Error Rate</p>
              <p className="text-xl font-semibold">{metrics.errorRate.toFixed(1)}%</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Error Breakdown */}
      {metrics.errors.length > 0 && (
        <Card className="p-4">
          <h3 className="font-medium mb-3">Current Errors</h3>
          <div className="space-y-2">
            {metrics.errors.map((error, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{error.type}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-600">{error.count}</span>
                  <Badge variant="outline" className="text-xs">
                    {error.percentage.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

const TestResultCard: React.FC<{
  result: LoadTestResult;
  scenario: LoadTestScenario | undefined;
  onView: (result: LoadTestResult) => void;
  onDownload: (result: LoadTestResult) => void;
}> = ({ result, scenario, onView, onDownload }) => {
  const getStatusIcon = (status: LoadTestResult['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'cancelled':
        return <Square className="h-4 w-4 text-gray-600" />;
      case 'running':
        return <Activity className="h-4 w-4 text-blue-600 animate-pulse" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: LoadTestResult['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
      case 'cancelled':
        return 'text-gray-600 bg-gray-50';
      case 'running':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const duration = result.endTime 
    ? new Date(result.endTime).getTime() - new Date(result.startTime).getTime()
    : Date.now() - new Date(result.startTime).getTime();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            {getStatusIcon(result.status)}
            <div>
              <h3 className="font-medium text-sm">
                {scenario?.name || 'Unknown Scenario'}
              </h3>
              <p className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(result.startTime), { addSuffix: true })}
              </p>
            </div>
          </div>
          <Badge className={cn('text-xs', getStatusColor(result.status))}>
            {result.status}
          </Badge>
        </div>

        {result.status === 'completed' && (
          <div className="grid grid-cols-3 gap-4 mb-3 text-xs">
            <div>
              <span className="text-gray-500">Success Rate:</span>
              <div className="font-medium">
                {((result.metrics.successfulRequests / result.metrics.totalRequests) * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <span className="text-gray-500">Avg Response:</span>
              <div className="font-medium">{result.metrics.averageResponseTime}ms</div>
            </div>
            <div>
              <span className="text-gray-500">Throughput:</span>
              <div className="font-medium">{result.metrics.requestsPerSecond.toFixed(1)} req/s</div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Duration: {Math.round(duration / 1000)}s
          </div>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onView(result)}
              className="h-7 px-2"
            >
              <BarChart3 className="h-3 w-3" />
            </Button>
            {result.status === 'completed' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDownload(result)}
                className="h-7 px-2"
              >
                <Download className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

const ScenarioForm: React.FC<{
  scenario?: LoadTestScenario;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ScenarioFormData) => void;
}> = ({ scenario, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState<ScenarioFormData>({
    name: '',
    description: '',
    config: {
      duration: 300,
      rampUp: 60,
      virtualUsers: 50,
    },
    endpoints: [],
  });

  const [currentEndpoint, setCurrentEndpoint] = useState<EndpointFormData>({
    method: 'GET',
    url: '',
    headers: {},
    weight: 100,
  });

  useEffect(() => {
    if (scenario) {
      setFormData({
        name: scenario.name,
        description: scenario.description,
        config: scenario.config,
        endpoints: scenario.endpoints,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        config: {
          duration: 300,
          rampUp: 60,
          virtualUsers: 50,
        },
        endpoints: [],
      });
    }
  }, [scenario]);

  const addEndpoint = () => {
    if (currentEndpoint.url) {
      setFormData(prev => ({
        ...prev,
        endpoints: [...prev.endpoints, currentEndpoint],
      }));
      setCurrentEndpoint({
        method: 'GET',
        url: '',
        headers: {},
        weight: 100,
      });
    }
  };

  const removeEndpoint = (index: number) => {
    setFormData(prev => ({
      ...prev,
      endpoints: prev.endpoints.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <div className="max-w-4xl mx-auto p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">
          {scenario ? 'Edit Scenario' : 'Create Scenario'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scenario Name *
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="API Load Test"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <Input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Test description..."
              />
            </div>
          </div>

          {/* Configuration */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration (seconds) *
              </label>
              <Input
                type="number"
                value={formData.config.duration}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  config: { ...prev.config, duration: parseInt(e.target.value) }
                }))}
                min={10}
                max={3600}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ramp Up (seconds) *
              </label>
              <Input
                type="number"
                value={formData.config.rampUp}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  config: { ...prev.config, rampUp: parseInt(e.target.value) }
                }))}
                min={0}
                max={600}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Virtual Users *
              </label>
              <Input
                type="number"
                value={formData.config.virtualUsers}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  config: { ...prev.config, virtualUsers: parseInt(e.target.value) }
                }))}
                min={1}
                max={1000}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Requests/sec
              </label>
              <Input
                type="number"
                value={formData.config.requestsPerSecond || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  config: { 
                    ...prev.config, 
                    requestsPerSecond: e.target.value ? parseInt(e.target.value) : undefined 
                  }
                }))}
                min={1}
                max={1000}
                placeholder="Unlimited"
              />
            </div>
          </div>

          {/* Endpoints */}
          <div>
            <h3 className="text-lg font-medium mb-4">Endpoints</h3>
            
            {/* Add Endpoint Form */}
            <Card className="p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <select
                    value={currentEndpoint.method}
                    onChange={(e) => setCurrentEndpoint(prev => ({ 
                      ...prev, 
                      method: e.target.value as any 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <Input
                    type="text"
                    value={currentEndpoint.url}
                    onChange={(e) => setCurrentEndpoint(prev => ({ 
                      ...prev, 
                      url: e.target.value 
                    }))}
                    placeholder="/api/endpoint"
                  />
                </div>
                <div>
                  <Input
                    type="number"
                    value={currentEndpoint.weight}
                    onChange={(e) => setCurrentEndpoint(prev => ({ 
                      ...prev, 
                      weight: parseInt(e.target.value) 
                    }))}
                    placeholder="Weight %"
                    min={1}
                    max={100}
                  />
                </div>
                <div>
                  <Button
                    type="button"
                    onClick={addEndpoint}
                    disabled={!currentEndpoint.url}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
              </div>
            </Card>

            {/* Endpoints List */}
            <div className="space-y-2">
              {formData.endpoints.map((endpoint, index) => (
                <Card key={index} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline">{endpoint.method}</Badge>
                      <span className="font-mono text-sm">{endpoint.url}</span>
                      <span className="text-xs text-gray-500">{endpoint.weight}%</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEndpoint(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            {formData.endpoints.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No endpoints added yet</p>
              </div>
            )}
          </div>

          <div className="flex space-x-3 pt-4">
            <Button 
              type="submit" 
              className="flex-1"
              disabled={formData.endpoints.length === 0}
            >
              {scenario ? 'Update' : 'Create'} Scenario
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

export const LoadTestingConsole: React.FC = () => {
  const {
    scenarios,
    activeTest,
    testHistory,
    realTimeMetrics,
    isRunning,
    addScenario,
    updateScenario,
    deleteScenario,
    setActiveTest,
    addTestResult,
    setRunning,
    setRealTimeMetrics,
  } = useLoadTestStore();

  const { startLoadTest, stopLoadTest } = useLoadTestWebSocket();

  const [selectedScenario, setSelectedScenario] = useState<LoadTestScenario | null>(null);
  const [showScenarioForm, setShowScenarioForm] = useState(false);
  const [metricsHistory, setMetricsHistory] = useState<LoadTestRealTimeMetrics[]>([]);

  // Initialize with mock data
  useEffect(() => {
    mockScenarios.forEach(scenario => {
      if (!scenarios.find(s => s.id === scenario.id)) {
        addScenario(scenario);
      }
    });
    mockResults.forEach(result => {
      if (!testHistory.find(r => r.id === result.id)) {
        addTestResult(result);
      }
    });
  }, []);

  // Handle scenario management
  const handleSaveScenario = (data: ScenarioFormData) => {
    if (selectedScenario) {
      updateScenario(selectedScenario.id, { ...data, id: selectedScenario.id });
    } else {
      const newScenario: LoadTestScenario = {
        ...data,
        id: `scenario-${Date.now()}`,
      };
      addScenario(newScenario);
    }
    setSelectedScenario(null);
  };

  const handleDuplicateScenario = (scenario: LoadTestScenario) => {
    const duplicated: LoadTestScenario = {
      ...scenario,
      id: `scenario-${Date.now()}`,
      name: `${scenario.name} (Copy)`,
    };
    addScenario(duplicated);
  };

  const handleRunTest = async (scenarioId: string) => {
    const scenario = scenarios.find(s => s.id === scenarioId);
    if (!scenario) return;

    setRunning(true);
    startLoadTest(scenarioId);

    // Create test result
    const testResult: LoadTestResult = {
      id: `test-${Date.now()}`,
      scenarioId,
      startTime: new Date().toISOString(),
      status: 'running',
      metrics: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        requestsPerSecond: 0,
        errorRate: 0,
        throughput: 0,
      },
    };

    setActiveTest(testResult);
    addTestResult(testResult);

    // Simulate real-time metrics
    const interval = setInterval(() => {
      const mockMetrics: LoadTestRealTimeMetrics = {
        timestamp: new Date().toISOString(),
        activeUsers: Math.floor(Math.random() * scenario.config.virtualUsers),
        requestsPerSecond: Math.floor(Math.random() * (scenario.config.requestsPerSecond || 50)),
        responseTime: Math.floor(200 + Math.random() * 300),
        errorRate: Math.random() * 5,
        errors: [
          { type: '500 Internal Server Error', count: Math.floor(Math.random() * 10), percentage: 2.5 },
          { type: '404 Not Found', count: Math.floor(Math.random() * 5), percentage: 1.0 },
        ],
      };

      setRealTimeMetrics(mockMetrics);
      setMetricsHistory(prev => [...prev.slice(-49), mockMetrics]);
    }, 2000);

    // Auto-stop after duration
    setTimeout(() => {
      clearInterval(interval);
      setRunning(false);
      setRealTimeMetrics(null);
      setActiveTest(null);
    }, scenario.config.duration * 1000);
  };

  const handleStopTest = () => {
    if (activeTest) {
      stopLoadTest(activeTest.id);
      setRunning(false);
      setRealTimeMetrics(null);
      setActiveTest(null);
    }
  };

  const handleDownloadResult = (result: LoadTestResult) => {
    const data = JSON.stringify(result, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `load-test-${result.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stats = useMemo(() => {
    const completed = testHistory.filter(t => t.status === 'completed');
    const avgSuccessRate = completed.length > 0 
      ? completed.reduce((sum, t) => sum + (t.metrics.successfulRequests / t.metrics.totalRequests * 100), 0) / completed.length
      : 0;
    const avgResponseTime = completed.length > 0
      ? completed.reduce((sum, t) => sum + t.metrics.averageResponseTime, 0) / completed.length
      : 0;

    return {
      totalScenarios: scenarios.length,
      totalTests: testHistory.length,
      activeTests: testHistory.filter(t => t.status === 'running').length,
      avgSuccessRate,
      avgResponseTime,
    };
  }, [scenarios, testHistory]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Load Testing Console</h1>
          <p className="text-gray-600 mt-1">
            Real-time performance testing with scenario management
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {isRunning && (
            <Button
              onClick={handleStopTest}
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700"
            >
              <Square className="h-4 w-4 mr-2" />
              Stop Test
            </Button>
          )}
          <Button
            onClick={() => {
              setSelectedScenario(null);
              setShowScenarioForm(true);
            }}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Scenario
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Scenarios</p>
              <p className="text-xl font-semibold">{stats.totalScenarios}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-green-100 text-green-600">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Tests</p>
              <p className="text-xl font-semibold">{stats.totalTests}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Tests</p>
              <p className="text-xl font-semibold">{stats.activeTests}</p>
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
              <p className="text-xl font-semibold">{stats.avgSuccessRate.toFixed(1)}%</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-red-100 text-red-600">
              <Timer className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Response</p>
              <p className="text-xl font-semibold">{stats.avgResponseTime.toFixed(0)}ms</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Real-time Metrics */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Real-time Metrics</h2>
        <RealTimeMetrics metrics={realTimeMetrics} isRunning={isRunning} />
      </div>

      {/* Charts */}
      {metricsHistory.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="p-4">
            <h3 className="font-medium mb-4">Response Time</h3>
            <MetricsChart metrics={metricsHistory} type="response-time" />
          </Card>
          <Card className="p-4">
            <h3 className="font-medium mb-4">Throughput</h3>
            <MetricsChart metrics={metricsHistory} type="throughput" />
          </Card>
          <Card className="p-4">
            <h3 className="font-medium mb-4">Error Rate</h3>
            <MetricsChart metrics={metricsHistory} type="errors" />
          </Card>
        </div>
      )}

      {/* Scenarios */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Test Scenarios ({scenarios.length})</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {scenarios.map((scenario) => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                onEdit={(s) => {
                  setSelectedScenario(s);
                  setShowScenarioForm(true);
                }}
                onDelete={deleteScenario}
                onRun={handleRunTest}
                onDuplicate={handleDuplicateScenario}
                isRunning={activeTest?.scenarioId === scenario.id}
              />
            ))}
          </AnimatePresence>
        </div>

        {scenarios.length === 0 && (
          <Card className="p-8 text-center">
            <Target className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No scenarios created
            </h3>
            <p className="text-gray-600 mb-4">
              Create your first load test scenario to get started
            </p>
            <Button
              onClick={() => {
                setSelectedScenario(null);
                setShowScenarioForm(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Scenario
            </Button>
          </Card>
        )}
      </div>

      {/* Test History */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Test History ({testHistory.length})</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {testHistory.map((result) => (
              <TestResultCard
                key={result.id}
                result={result}
                scenario={scenarios.find(s => s.id === result.scenarioId)}
                onView={() => {}}
                onDownload={handleDownloadResult}
              />
            ))}
          </AnimatePresence>
        </div>

        {testHistory.length === 0 && (
          <Card className="p-8 text-center">
            <BarChart3 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No test results
            </h3>
            <p className="text-gray-600">
              Run your first load test to see results here
            </p>
          </Card>
        )}
      </div>

      {/* Scenario Form Modal */}
      <ScenarioForm
        scenario={selectedScenario}
        isOpen={showScenarioForm}
        onClose={() => {
          setShowScenarioForm(false);
          setSelectedScenario(null);
        }}
        onSave={handleSaveScenario}
      />
    </div>
  );
};

export default LoadTestingConsole;
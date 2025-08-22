import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChartBarIcon,
  CpuChipIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  LightBulbIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  BeakerIcon
} from '@heroicons/react/24/outline';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { PerformanceOptimization, LivingAgent } from '../../types/agent.types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface OptimizationSuggestion {
  id: string;
  agentId: string;
  type: 'algorithm' | 'resource' | 'configuration' | 'architecture';
  title: string;
  description: string;
  expectedImprovement: number;
  effort: 'low' | 'medium' | 'high';
  priority: number;
  status: 'pending' | 'testing' | 'implemented' | 'failed';
  timestamp: Date;
}

interface PerformanceMetric {
  timestamp: Date;
  latency: number;
  throughput: number;
  memoryUsage: number;
  cpuUsage: number;
  errorRate: number;
  efficiency: number;
}

interface Props {
  agents: LivingAgent[];
  optimizations: PerformanceOptimization[];
  onOptimizationUpdate: (optimization: PerformanceOptimization) => void;
  className?: string;
}

const SelfOptimizationPanel: React.FC<Props> = ({
  agents,
  optimizations,
  onOptimizationUpdate,
  className = ''
}) => {
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [performanceHistory, setPerformanceHistory] = useState<PerformanceMetric[]>([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('1h');
  const [autoOptimizationEnabled, setAutoOptimizationEnabled] = useState(true);
  const [activeOptimizations, setActiveOptimizations] = useState<number>(0);

  // Generate performance metrics history
  useEffect(() => {
    const generateMetrics = () => {
      const now = new Date();
      const metrics: PerformanceMetric[] = [];
      const timeRangeMs = {
        '1h': 3600000,
        '6h': 21600000,
        '24h': 86400000,
        '7d': 604800000
      };

      const range = timeRangeMs[selectedTimeRange];
      const points = selectedTimeRange === '7d' ? 168 : selectedTimeRange === '24h' ? 144 : 60;
      const interval = range / points;

      for (let i = points; i >= 0; i--) {
        const timestamp = new Date(now.getTime() - (i * interval));
        metrics.push({
          timestamp,
          latency: Math.random() * 100 + 50 + Math.sin(i * 0.1) * 20,
          throughput: Math.random() * 1000 + 500 + Math.cos(i * 0.15) * 200,
          memoryUsage: Math.random() * 30 + 40 + Math.sin(i * 0.08) * 10,
          cpuUsage: Math.random() * 40 + 30 + Math.cos(i * 0.12) * 15,
          errorRate: Math.max(0, Math.random() * 5 + Math.sin(i * 0.2) * 2),
          efficiency: Math.min(100, 70 + Math.random() * 25 + Math.cos(i * 0.1) * 10)
        });
      }

      setPerformanceHistory(metrics);
    };

    generateMetrics();
    const interval = setInterval(generateMetrics, 30000);
    return () => clearInterval(interval);
  }, [selectedTimeRange]);

  // Generate optimization suggestions
  useEffect(() => {
    const generateSuggestions = () => {
      const suggestionTemplates = [
        {
          type: 'algorithm' as const,
          title: 'Implement Lazy Loading',
          description: 'Defer initialization of expensive resources until needed',
          effort: 'medium' as const,
          expectedImprovement: 25
        },
        {
          type: 'resource' as const,
          title: 'Memory Pool Optimization',
          description: 'Use object pooling to reduce garbage collection pressure',
          effort: 'high' as const,
          expectedImprovement: 35
        },
        {
          type: 'configuration' as const,
          title: 'Adjust Thread Pool Size',
          description: 'Optimize thread pool based on current workload patterns',
          effort: 'low' as const,
          expectedImprovement: 15
        },
        {
          type: 'architecture' as const,
          title: 'Introduce Caching Layer',
          description: 'Add distributed caching for frequently accessed data',
          effort: 'high' as const,
          expectedImprovement: 45
        },
        {
          type: 'algorithm' as const,
          title: 'Batch Processing',
          description: 'Group similar operations to reduce overhead',
          effort: 'medium' as const,
          expectedImprovement: 20
        }
      ];

      const newSuggestions = agents.flatMap(agent => {
        const agentSuggestions = suggestionTemplates
          .filter(() => Math.random() < 0.4)
          .map((template, index) => ({
            id: `${agent.id}-${template.type}-${index}`,
            agentId: agent.id,
            ...template,
            priority: Math.floor(Math.random() * 10) + 1,
            status: (Math.random() < 0.7 ? 'pending' : Math.random() < 0.5 ? 'testing' : 'implemented') as 'pending' | 'testing' | 'implemented',
            timestamp: new Date(Date.now() - Math.random() * 86400000)
          }));

        return agentSuggestions;
      });

      setSuggestions(newSuggestions);
      setActiveOptimizations(newSuggestions.filter(s => s.status === 'testing').length);
    };

    generateSuggestions();
    const interval = setInterval(generateSuggestions, 15000);
    return () => clearInterval(interval);
  }, [agents]);

  const effortColors = {
    low: 'bg-green-500/20 text-green-300 border-green-500/30',
    medium: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    high: 'bg-red-500/20 text-red-300 border-red-500/30'
  };

  const statusColors = {
    pending: '#6B7280',
    testing: '#F59E0B',
    implemented: '#10B981',
    failed: '#EF4444'
  };

  const typeIcons = {
    algorithm: BeakerIcon,
    resource: CpuChipIcon,
    configuration: ChartBarIcon,
    architecture: LightBulbIcon
  };

  // Chart configurations
  const performanceChartData = {
    labels: performanceHistory.slice(-20).map(m =>
      m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    ),
    datasets: [
      {
        label: 'Latency (ms)',
        data: performanceHistory.slice(-20).map(m => m.latency),
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Throughput (ops/s)',
        data: performanceHistory.slice(-20).map(m => m.throughput / 10), // Scaled for visibility
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: false,
        tension: 0.4
      }
    ]
  };

  const resourceUtilizationData = {
    labels: ['CPU', 'Memory', 'Network', 'Storage'],
    datasets: [{
      data: [
        performanceHistory[performanceHistory.length - 1]?.cpuUsage || 0,
        performanceHistory[performanceHistory.length - 1]?.memoryUsage || 0,
        Math.random() * 60 + 20, // Network
        Math.random() * 80 + 10  // Storage
      ],
      backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'],
      borderColor: ['#1D4ED8', '#059669', '#D97706', '#7C3AED'],
      borderWidth: 2
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#E5E7EB' }
      }
    },
    scales: {
      x: { ticks: { color: '#9CA3AF' }, grid: { color: '#374151' } },
      y: { ticks: { color: '#9CA3AF' }, grid: { color: '#374151' } }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: { color: '#E5E7EB' }
      }
    }
  };

  const implementSuggestion = (suggestionId: string) => {
    setSuggestions(prev => prev.map(s =>
      s.id === suggestionId
        ? { ...s, status: 'testing' }
        : s
    ));

    // Simulate implementation after delay
    setTimeout(() => {
      setSuggestions(prev => prev.map(s =>
        s.id === suggestionId
          ? { ...s, status: Math.random() < 0.8 ? 'implemented' : 'failed' }
          : s
      ));
    }, 3000);
  };

  const topSuggestions = suggestions
    .filter(s => s.status === 'pending')
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 5);

  return (
    <div className={`bg-slate-800 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ArrowTrendingUpIcon className="w-6 h-6 text-blue-400" />
              Self-Optimization Engine
            </h2>
            <p className="text-slate-300 text-sm">
              {activeOptimizations} optimizations running •
              {suggestions.filter(s => s.status === 'implemented').length} improvements deployed
            </p>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoOptimizationEnabled}
                onChange={(e) => setAutoOptimizationEnabled(e.target.checked)}
                className="rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-slate-300 text-sm">Auto-optimize</span>
            </label>

            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value as typeof selectedTimeRange)}
              className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-1 text-sm"
            >
              <option value="1h">1 Hour</option>
              <option value="6h">6 Hours</option>
              <option value="24h">24 Hours</option>
              <option value="7d">7 Days</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 p-6">
        {/* Performance Charts */}
        <div className="xl:col-span-2 space-y-6">
          {/* Real-time Performance */}
          <div className="bg-slate-700 rounded-lg p-4">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <ChartBarIcon className="w-5 h-5" />
              Real-time Performance
            </h3>
            <div className="h-64">
              <Line data={performanceChartData} options={chartOptions} />
            </div>
          </div>

          {/* Resource Utilization */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-700 rounded-lg p-4">
              <h4 className="text-white font-semibold mb-4">Resource Utilization</h4>
              <div className="h-48">
                <Doughnut data={resourceUtilizationData} options={doughnutOptions} />
              </div>
            </div>

            <div className="bg-slate-700 rounded-lg p-4">
              <h4 className="text-white font-semibold mb-4">System Health</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Overall Efficiency</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-slate-600 rounded-full h-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '87%' }}
                        transition={{ duration: 1 }}
                        className="bg-green-500 h-2 rounded-full"
                      />
                    </div>
                    <span className="text-white font-medium">87%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Error Rate</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-slate-600 rounded-full h-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '12%' }}
                        transition={{ duration: 1 }}
                        className="bg-red-500 h-2 rounded-full"
                      />
                    </div>
                    <span className="text-white font-medium">1.2%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Response Time</span>
                  <div className="flex items-center gap-2">
                    <ArrowTrendingDownIcon className="w-4 h-4 text-green-400" />
                    <span className="text-green-400 font-medium">-15ms</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Throughput</span>
                  <div className="flex items-center gap-2">
                    <ArrowTrendingUpIcon className="w-4 h-4 text-blue-400" />
                    <span className="text-blue-400 font-medium">+23%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Optimization Suggestions */}
        <div className="space-y-6">
          <div className="bg-slate-700 rounded-lg p-4">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <LightBulbIcon className="w-5 h-5 text-yellow-400" />
              AI Suggestions
            </h3>

            <div className="space-y-3">
              <AnimatePresence>
                {topSuggestions.map((suggestion, index) => {
                  const IconComponent = typeIcons[suggestion.type];

                  return (
                    <motion.div
                      key={suggestion.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-slate-600 rounded-lg p-3"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <IconComponent className="w-4 h-4 text-blue-400" />
                          <span className="text-white font-medium text-sm">
                            {suggestion.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded-full border ${effortColors[suggestion.effort]}`}>
                            {suggestion.effort.toUpperCase()}
                          </span>
                          <span className="text-green-400 text-xs font-medium">
                            +{suggestion.expectedImprovement}%
                          </span>
                        </div>
                      </div>

                      <p className="text-slate-300 text-xs mb-3">
                        {suggestion.description}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400 text-xs">Priority:</span>
                          <div className="flex">
                            {[...Array(10)].map((_, i) => (
                              <div
                                key={i}
                                className={`w-1 h-3 mr-0.5 rounded-full ${
                                  i < suggestion.priority ? 'bg-yellow-400' : 'bg-slate-700'
                                }`}
                              />
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={() => implementSuggestion(suggestion.id)}
                          className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1 rounded-lg transition-colors"
                        >
                          Implement
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* Recent Optimizations */}
          <div className="bg-slate-700 rounded-lg p-4">
            <h3 className="text-white font-semibold mb-4">Recent Changes</h3>

            <div className="space-y-2">
              {suggestions
                .filter(s => s.status === 'implemented' || s.status === 'failed')
                .slice(0, 4)
                .map(suggestion => (
                  <div key={suggestion.id} className="flex items-center gap-3 p-2 bg-slate-600 rounded">
                    {suggestion.status === 'implemented' ? (
                      <CheckCircleIcon className="w-4 h-4 text-green-400" />
                    ) : (
                      <ExclamationTriangleIcon className="w-4 h-4 text-red-400" />
                    )}
                    <div className="flex-1">
                      <div className="text-white text-sm">{suggestion.title}</div>
                      <div className="text-slate-400 text-xs">
                        {suggestion.timestamp.toLocaleDateString()}
                      </div>
                    </div>
                    <div className={`text-xs font-medium ${
                      suggestion.status === 'implemented' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {suggestion.status === 'implemented'
                        ? `+${suggestion.expectedImprovement}%`
                        : 'FAILED'
                      }
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelfOptimizationPanel;

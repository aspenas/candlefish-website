'use client';

import React, { useState } from 'react';
import { useAnalyticsStore, Widget } from '../../stores/analyticsStore';
import { 
  X,
  BarChart3,
  Activity,
  Server,
  AlertTriangle,
  TrendingUp,
  Grid3x3,
  List,
  PieChart
} from 'lucide-react';

interface AddWidgetModalProps {
  onClose: () => void;
  onAdd: (widget: Omit<Widget, 'id'>) => void;
}

const AddWidgetModal: React.FC<AddWidgetModalProps> = ({ onClose, onAdd }) => {
  const { addWidget } = useAnalyticsStore();
  const [selectedType, setSelectedType] = useState<string>('chart');
  const [widgetConfig, setWidgetConfig] = useState<{
    title: string;
    type: 'chart' | 'metric' | 'list' | 'grid';
    position: { x: number; y: number; w: number; h: number };
    config: Record<string, any>;
  }>({
    title: '',
    type: 'chart',
    position: { x: 0, y: 0, w: 6, h: 4 },
    config: {},
  });

  const widgetTypes = [
    {
      id: 'chart',
      name: 'Performance Chart',
      description: 'Line, area, or bar charts for metrics',
      icon: BarChart3,
      color: 'text-blue-600 bg-blue-100',
    },
    {
      id: 'metric',
      name: 'Metric Display',
      description: 'Single or grouped metric displays',
      icon: Activity,
      color: 'text-green-600 bg-green-100',
    },
    {
      id: 'grid',
      name: 'Service Grid',
      description: 'Grid layout for services or agents',
      icon: Grid3x3,
      color: 'text-purple-600 bg-purple-100',
    },
    {
      id: 'list',
      name: 'Data List',
      description: 'Scrollable list of items',
      icon: List,
      color: 'text-orange-600 bg-orange-100',
    },
    {
      id: 'trend',
      name: 'Trend Analysis',
      description: 'Historical trends and comparisons',
      icon: TrendingUp,
      color: 'text-indigo-600 bg-indigo-100',
    },
    {
      id: 'pie',
      name: 'Distribution Chart',
      description: 'Pie or donut charts for distributions',
      icon: PieChart,
      color: 'text-pink-600 bg-pink-100',
    },
  ];

  const chartConfigs = {
    chart: {
      chartType: 'line',
      metrics: ['responseTime'],
      showComparison: false,
      timeRange: '4h',
    },
    metric: {
      metricType: 'system-overview',
      showTrend: true,
      layout: 'grid',
    },
    grid: {
      itemType: 'services',
      columns: 2,
      showDetails: true,
    },
    list: {
      dataSource: 'alerts',
      limit: 10,
      showFilters: true,
    },
    trend: {
      compareWith: 'previous-period',
      metrics: ['responseTime', 'successRate'],
      period: '24h',
    },
    pie: {
      dataSource: 'service-status',
      showLegend: true,
      showPercentages: true,
    },
  };

  const handleTypeSelect = (type: string) => {
    setSelectedType(type);
    setWidgetConfig(prev => ({
      ...prev,
      type: type as 'chart' | 'metric' | 'list' | 'grid',
      config: chartConfigs[type as keyof typeof chartConfigs] || {},
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!widgetConfig.title.trim()) {
      alert('Please enter a widget title');
      return;
    }

    const newWidget: Omit<Widget, 'id'> = {
      ...widgetConfig,
      type: widgetConfig.type as 'list' | 'grid' | 'metric' | 'chart',
      visible: true,
    };

    addWidget(newWidget);
    onAdd(newWidget);
    onClose();
  };

  const renderConfigOptions = () => {
    switch (selectedType) {
      case 'chart':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chart Type
              </label>
              <select
                value={(widgetConfig.config as any).chartType || 'line'}
                onChange={(e) => setWidgetConfig(prev => ({
                  ...prev,
                  config: { ...prev.config, chartType: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="line">Line Chart</option>
                <option value="area">Area Chart</option>
                <option value="bar">Bar Chart</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Primary Metric
              </label>
              <select
                value={(widgetConfig.config as any).metrics?.[0] || 'responseTime'}
                onChange={(e) => setWidgetConfig(prev => ({
                  ...prev,
                  config: { ...prev.config, metrics: [e.target.value] }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="responseTime">Response Time</option>
                <option value="successRate">Success Rate</option>
                <option value="memoryUsage">Memory Usage</option>
                <option value="cpuUsage">CPU Usage</option>
                <option value="requestCount">Request Count</option>
                <option value="errorCount">Error Count</option>
              </select>
            </div>
          </div>
        );

      case 'metric':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Metric Type
              </label>
              <select
                value={(widgetConfig.config as any).metricType || 'system-overview'}
                onChange={(e) => setWidgetConfig(prev => ({
                  ...prev,
                  config: { ...prev.config, metricType: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="system-overview">System Overview</option>
                <option value="agent-summary">Agent Summary</option>
                <option value="service-summary">Service Summary</option>
                <option value="custom-metrics">Custom Metrics</option>
              </select>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="showTrend"
                checked={(widgetConfig.config as any).showTrend || false}
                onChange={(e) => setWidgetConfig(prev => ({
                  ...prev,
                  config: { ...prev.config, showTrend: e.target.checked }
                }))}
                className="mr-2"
              />
              <label htmlFor="showTrend" className="text-sm text-gray-700">
                Show trend indicators
              </label>
            </div>
          </div>
        );

      case 'list':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Source
              </label>
              <select
                value={(widgetConfig.config as any).dataSource || 'alerts'}
                onChange={(e) => setWidgetConfig(prev => ({
                  ...prev,
                  config: { ...prev.config, dataSource: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="alerts">Recent Alerts</option>
                <option value="activities">Recent Activities</option>
                <option value="errors">Recent Errors</option>
                <option value="performance">Performance Issues</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Items to Show
              </label>
              <input
                type="number"
                value={(widgetConfig.config as any).limit || 10}
                onChange={(e) => setWidgetConfig(prev => ({
                  ...prev,
                  config: { ...prev.config, limit: parseInt(e.target.value) }
                }))}
                min="5"
                max="50"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="text-sm text-gray-600">
            Additional configuration options will be available after widget creation.
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Add Widget</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Widget Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Widget Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              {widgetTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => handleTypeSelect(type.id)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      selectedType === type.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center mb-2">
                      <div className={`p-2 rounded-md ${type.color} mr-3`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="font-medium text-gray-900">{type.name}</h3>
                    </div>
                    <p className="text-sm text-gray-600">{type.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Widget Configuration */}
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Widget Title
              </label>
              <input
                type="text"
                value={widgetConfig.title}
                onChange={(e) => setWidgetConfig(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter widget title..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Size */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Width (columns)
                </label>
                <select
                  value={widgetConfig.position.w}
                  onChange={(e) => setWidgetConfig(prev => ({
                    ...prev,
                    position: { ...prev.position, w: parseInt(e.target.value) }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={3}>Quarter (3 cols)</option>
                  <option value={6}>Half (6 cols)</option>
                  <option value={9}>Three Quarters (9 cols)</option>
                  <option value={12}>Full Width (12 cols)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Height
                </label>
                <select
                  value={widgetConfig.position.h}
                  onChange={(e) => setWidgetConfig(prev => ({
                    ...prev,
                    position: { ...prev.position, h: parseInt(e.target.value) }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={3}>Small (3 units)</option>
                  <option value={4}>Medium (4 units)</option>
                  <option value={6}>Large (6 units)</option>
                  <option value={8}>Extra Large (8 units)</option>
                </select>
              </div>
            </div>

            {/* Type-specific Configuration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Configuration
              </label>
              <div className="bg-gray-50 rounded-lg p-4">
                {renderConfigOptions()}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Add Widget
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddWidgetModal;
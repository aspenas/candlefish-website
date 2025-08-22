import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  FileText,
  FileSpreadsheet,
  Image,
  FileJson,
  Calendar,
  Filter,
  Settings,
  X,
  CheckCircle,
  Clock,
  AlertCircle,
  BarChart3
} from 'lucide-react';
import {
  Agent,
  AgentMetrics,
  TimeRange,
  MetricType,
  ExportConfig,
  AlertHistory
} from '../../types/rtpm.types';

interface ExportManagerProps {
  isOpen: boolean;
  onClose: () => void;
  agents: Agent[];
  agentMetrics: Map<string, AgentMetrics[]>;
  alerts: AlertHistory[];
  className?: string;
}

interface ExportJob {
  id: string;
  name: string;
  format: ExportConfig['format'];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  createdAt: Date;
  downloadUrl?: string;
  error?: string;
  size?: string;
}

const ExportFormats = {
  csv: {
    icon: FileText,
    label: 'CSV',
    description: 'Comma-separated values for spreadsheets',
    extension: '.csv',
    mimeType: 'text/csv'
  },
  excel: {
    icon: FileSpreadsheet,
    label: 'Excel',
    description: 'Microsoft Excel workbook',
    extension: '.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  },
  json: {
    icon: FileJson,
    label: 'JSON',
    description: 'JavaScript Object Notation',
    extension: '.json',
    mimeType: 'application/json'
  },
  pdf: {
    icon: FileText,
    label: 'PDF',
    description: 'Portable Document Format with charts',
    extension: '.pdf',
    mimeType: 'application/pdf'
  }
};

const TimeRangeOptions = [
  { value: '1h', label: 'Last 1 hour' },
  { value: '6h', label: 'Last 6 hours' },
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'custom', label: 'Custom range' }
];

const MetricOptions = [
  { value: 'cpu', label: 'CPU Usage' },
  { value: 'memory', label: 'Memory Usage' },
  { value: 'responseTime', label: 'Response Time' },
  { value: 'requestRate', label: 'Request Rate' },
  { value: 'errorRate', label: 'Error Rate' },
  { value: 'throughput', label: 'Throughput' },
  { value: 'activeConnections', label: 'Active Connections' },
  { value: 'networkLatency', label: 'Network Latency' }
];

const FormatCard: React.FC<{
  format: keyof typeof ExportFormats;
  selected: boolean;
  onClick: () => void;
}> = ({ format, selected, onClick }) => {
  const config = ExportFormats[format];
  const Icon = config.icon;

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        p-4 rounded-lg border-2 transition-all duration-200 text-left w-full
        ${selected
          ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20'
          : 'border-gray-700 bg-gray-800/30 hover:border-gray-600 hover:bg-gray-800/50'
        }
      `}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded ${selected ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-700/50 text-gray-400'}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className={`font-medium ${selected ? 'text-blue-400' : 'text-white'}`}>
            {config.label}
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            {config.description}
          </p>
        </div>
      </div>
    </motion.button>
  );
};

const ExportJobCard: React.FC<{
  job: ExportJob;
  onDownload: () => void;
  onDelete: () => void;
}> = ({ job, onDownload, onDelete }) => {
  const StatusIcon = {
    pending: Clock,
    processing: Clock,
    completed: CheckCircle,
    failed: AlertCircle
  }[job.status];

  const statusColors = {
    pending: 'text-yellow-400',
    processing: 'text-blue-400',
    completed: 'text-green-400',
    failed: 'text-red-400'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <StatusIcon className={`w-5 h-5 ${statusColors[job.status]}`} />
          <div>
            <h4 className="text-white font-medium">{job.name}</h4>
            <p className="text-sm text-gray-400">
              {job.format.toUpperCase()} • {job.createdAt.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {job.status === 'completed' && (
            <button
              onClick={onDownload}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
            >
              Download
            </button>
          )}
          <button
            onClick={onDelete}
            className="p-1 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress bar for processing jobs */}
      {job.status === 'processing' && (
        <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
          <motion.div
            className="bg-blue-500 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${job.progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}

      {/* Error message for failed jobs */}
      {job.status === 'failed' && job.error && (
        <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-400">
          {job.error}
        </div>
      )}

      {/* File size for completed jobs */}
      {job.status === 'completed' && job.size && (
        <div className="text-xs text-gray-400">
          File size: {job.size}
        </div>
      )}
    </motion.div>
  );
};

export const ExportManager: React.FC<ExportManagerProps> = ({
  isOpen,
  onClose,
  agents,
  agentMetrics,
  alerts,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [exportConfig, setExportConfig] = useState<Partial<ExportConfig>>({
    format: 'csv',
    timeRange: '24h',
    metrics: ['cpu', 'memory', 'responseTime'],
    includeCharts: true,
    includeAlerts: true
  });
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [customDateRange, setCustomDateRange] = useState({
    start: '',
    end: ''
  });
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([
    {
      id: '1',
      name: 'Agent Performance Report',
      format: 'pdf',
      status: 'completed',
      progress: 100,
      createdAt: new Date(Date.now() - 3600000),
      downloadUrl: '#',
      size: '2.4 MB'
    },
    {
      id: '2',
      name: 'Metrics Data Export',
      format: 'csv',
      status: 'processing',
      progress: 65,
      createdAt: new Date(Date.now() - 300000)
    },
    {
      id: '3',
      name: 'Alert History',
      format: 'excel',
      status: 'failed',
      progress: 0,
      createdAt: new Date(Date.now() - 600000),
      error: 'Insufficient data in the selected time range'
    }
  ]);

  const handleExport = async () => {
    const newJob: ExportJob = {
      id: Date.now().toString(),
      name: `${exportConfig.format?.toUpperCase()} Export`,
      format: exportConfig.format!,
      status: 'processing',
      progress: 0,
      createdAt: new Date()
    };

    setExportJobs(prev => [newJob, ...prev]);

    // Simulate export process
    const updateProgress = (progress: number) => {
      setExportJobs(prev => prev.map(job =>
        job.id === newJob.id ? { ...job, progress } : job
      ));
    };

    try {
      // Simulate progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        updateProgress(i);
      }

      // Generate actual export data
      const exportData = generateExportData();
      const blob = createExportBlob(exportData, exportConfig.format!);
      const url = URL.createObjectURL(blob);

      setExportJobs(prev => prev.map(job =>
        job.id === newJob.id
          ? {
              ...job,
              status: 'completed',
              progress: 100,
              downloadUrl: url,
              size: formatFileSize(blob.size)
            }
          : job
      ));

    } catch (error) {
      setExportJobs(prev => prev.map(job =>
        job.id === newJob.id
          ? {
              ...job,
              status: 'failed',
              error: 'Export failed. Please try again.'
            }
          : job
      ));
    }
  };

  const generateExportData = () => {
    const data: any[] = [];

    // Generate sample data based on selected agents and metrics
    const targetAgents = selectedAgents.length > 0
      ? agents.filter(a => selectedAgents.includes(a.id))
      : agents.slice(0, 10); // Limit for demo

    targetAgents.forEach(agent => {
      const metrics = agentMetrics.get(agent.id);
      if (metrics && metrics.length > 0) {
        const latestMetrics = metrics[metrics.length - 1];

        const row: any = {
          agentId: agent.id,
          agentName: agent.name,
          status: agent.status,
          platform: agent.platform,
          region: agent.region,
          version: agent.version,
          lastSeen: agent.lastSeen?.toISOString()
        };

        // Add selected metrics
        exportConfig.metrics?.forEach(metric => {
          row[metric] = latestMetrics[metric] || 0;
        });

        data.push(row);
      }
    });

    return data;
  };

  const createExportBlob = (data: any[], format: ExportConfig['format']) => {
    switch (format) {
      case 'csv':
        return new Blob([generateCSV(data)], { type: 'text/csv' });
      case 'json':
        return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      case 'excel':
        // In a real implementation, use a library like SheetJS
        return new Blob([generateCSV(data)], { type: 'text/csv' });
      case 'pdf':
        // In a real implementation, use a library like jsPDF
        return new Blob(['PDF content would go here'], { type: 'application/pdf' });
      default:
        return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    }
  };

  const generateCSV = (data: any[]) => {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' && value.includes(',')
            ? `"${value}"`
            : value;
        }).join(',')
      )
    ].join('\n');

    return csvContent;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownload = (job: ExportJob) => {
    if (job.downloadUrl) {
      const a = document.createElement('a');
      a.href = job.downloadUrl;
      a.download = `${job.name}${ExportFormats[job.format].extension}`;
      a.click();
    }
  };

  const handleDeleteJob = (jobId: string) => {
    setExportJobs(prev => prev.filter(job => job.id !== jobId));
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
            className={`bg-gray-900 border border-gray-700 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden ${className}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div>
                <h2 className="text-xl font-semibold text-white">Export Manager</h2>
                <p className="text-gray-400 mt-1">Export agent data and performance reports</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-700">
              <button
                onClick={() => setActiveTab('new')}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'new'
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                New Export
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'history'
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Export History
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {activeTab === 'new' ? (
                <div className="space-y-6">
                  {/* Format Selection */}
                  <div>
                    <h3 className="text-lg font-medium text-white mb-4">Export Format</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(Object.keys(ExportFormats) as Array<keyof typeof ExportFormats>).map(format => (
                        <FormatCard
                          key={format}
                          format={format}
                          selected={exportConfig.format === format}
                          onClick={() => setExportConfig({ ...exportConfig, format })}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Time Range */}
                  <div>
                    <h3 className="text-lg font-medium text-white mb-4">Time Range</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                      {TimeRangeOptions.map(option => (
                        <button
                          key={option.value}
                          onClick={() => setExportConfig({ ...exportConfig, timeRange: option.value as TimeRange })}
                          className={`p-3 rounded-lg border transition-colors ${
                            exportConfig.timeRange === option.value
                              ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                              : 'border-gray-700 bg-gray-800/30 text-gray-300 hover:border-gray-600'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>

                    {exportConfig.timeRange === 'custom' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Start Date</label>
                          <input
                            type="datetime-local"
                            value={customDateRange.start}
                            onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">End Date</label>
                          <input
                            type="datetime-local"
                            value={customDateRange.end}
                            onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Metrics Selection */}
                  <div>
                    <h3 className="text-lg font-medium text-white mb-4">Metrics to Include</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {MetricOptions.map(metric => (
                        <label key={metric.value} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={exportConfig.metrics?.includes(metric.value as MetricType)}
                            onChange={(e) => {
                              const newMetrics = e.target.checked
                                ? [...(exportConfig.metrics || []), metric.value as MetricType]
                                : exportConfig.metrics?.filter(m => m !== metric.value) || [];
                              setExportConfig({ ...exportConfig, metrics: newMetrics });
                            }}
                            className="rounded border-gray-600 bg-gray-700"
                          />
                          <span className="text-sm text-gray-300">{metric.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Agent Selection */}
                  <div>
                    <h3 className="text-lg font-medium text-white mb-4">
                      Agents ({selectedAgents.length > 0 ? selectedAgents.length : 'All'})
                    </h3>
                    <div className="max-h-40 overflow-y-auto border border-gray-700 rounded-lg p-4">
                      <label className="flex items-center gap-2 cursor-pointer mb-2">
                        <input
                          type="checkbox"
                          checked={selectedAgents.length === 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAgents([]);
                            }
                          }}
                          className="rounded border-gray-600 bg-gray-700"
                        />
                        <span className="text-sm font-medium text-gray-300">All Agents</span>
                      </label>
                      {agents.slice(0, 20).map(agent => (
                        <label key={agent.id} className="flex items-center gap-2 cursor-pointer mb-1">
                          <input
                            type="checkbox"
                            checked={selectedAgents.includes(agent.id)}
                            onChange={(e) => {
                              const newSelected = e.target.checked
                                ? [...selectedAgents, agent.id]
                                : selectedAgents.filter(id => id !== agent.id);
                              setSelectedAgents(newSelected);
                            }}
                            className="rounded border-gray-600 bg-gray-700"
                          />
                          <span className="text-sm text-gray-300">{agent.name}</span>
                          <span className="text-xs text-gray-500">({agent.status})</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Additional Options */}
                  <div>
                    <h3 className="text-lg font-medium text-white mb-4">Additional Options</h3>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={exportConfig.includeCharts || false}
                          onChange={(e) => setExportConfig({ ...exportConfig, includeCharts: e.target.checked })}
                          className="rounded border-gray-600 bg-gray-700"
                        />
                        <span className="text-sm text-gray-300">Include charts and visualizations (PDF only)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={exportConfig.includeAlerts || false}
                          onChange={(e) => setExportConfig({ ...exportConfig, includeAlerts: e.target.checked })}
                          className="rounded border-gray-600 bg-gray-700"
                        />
                        <span className="text-sm text-gray-300">Include alert history</span>
                      </label>
                    </div>
                  </div>

                  {/* Export Button */}
                  <div className="flex justify-end pt-6 border-t border-gray-700">
                    <button
                      onClick={handleExport}
                      disabled={!exportConfig.format || !exportConfig.metrics?.length}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Download className="w-5 h-5" />
                      Start Export
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-white">Recent Exports</h3>
                    <div className="text-sm text-gray-400">
                      {exportJobs.length} {exportJobs.length === 1 ? 'export' : 'exports'}
                    </div>
                  </div>

                  {exportJobs.length > 0 ? (
                    <div className="space-y-4">
                      {exportJobs.map(job => (
                        <ExportJobCard
                          key={job.id}
                          job={job}
                          onDownload={() => handleDownload(job)}
                          onDelete={() => handleDeleteJob(job.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <BarChart3 className="w-16 h-16 mx-auto text-gray-500 mb-4" />
                      <h3 className="text-xl font-medium text-gray-300 mb-2">No exports yet</h3>
                      <p className="text-gray-500 mb-6">Create your first export to see it here</p>
                      <button
                        onClick={() => setActiveTab('new')}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      >
                        Create Export
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ExportManager;

'use client';

import React from 'react';
import { useAnalyticsStore } from '../../stores/analyticsStore';
import { 
  Clock, 
  Server, 
  Bot,
  Filter
} from 'lucide-react';
import { cn } from '../../lib/utils';

const DashboardFilters: React.FC = () => {
  const {
    timeRange,
    selectedAgents,
    selectedServices,
    alertsFilter,
    agentPerformance,
    serviceHealth,
    setTimeRange,
    setSelectedAgents,
    setSelectedServices,
    setAlertsFilter,
  } = useAnalyticsStore();

  const timeRangeOptions = [
    { value: '1h', label: '1 Hour' },
    { value: '4h', label: '4 Hours' },
    { value: '12h', label: '12 Hours' },
    { value: '24h', label: '24 Hours' },
    { value: '7d', label: '7 Days' },
  ] as const;

  const alertFilterOptions = [
    { value: 'all', label: 'All Alerts' },
    { value: 'unacknowledged', label: 'Unacknowledged' },
    { value: 'critical', label: 'Critical Only' },
  ] as const;

  // Get unique agents and services
  const availableAgents = Array.from(
    new Set(agentPerformance.map(metric => metric.agentName))
  );
  
  const availableServices = Array.from(
    new Set(serviceHealth.map(service => service.serviceName))
  );

  const handleAgentToggle = (agentName: string) => {
    const newSelection = selectedAgents.includes(agentName)
      ? selectedAgents.filter(name => name !== agentName)
      : [...selectedAgents, agentName];
    setSelectedAgents(newSelection);
  };

  const handleServiceToggle = (serviceName: string) => {
    const newSelection = selectedServices.includes(serviceName)
      ? selectedServices.filter(name => name !== serviceName)
      : [...selectedServices, serviceName];
    setSelectedServices(newSelection);
  };

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
      {/* Time Range Filter */}
      <div className="flex items-center space-x-2">
        <Clock className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">Time Range:</span>
        <div className="flex space-x-1">
          {timeRangeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setTimeRange(option.value)}
              className={cn(
                'px-3 py-1 text-sm rounded-md transition-colors',
                timeRange === option.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Agent Filter */}
      {availableAgents.length > 0 && (
        <div className="flex items-center space-x-2">
          <Bot className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Agents:</span>
          <div className="flex flex-wrap gap-1 max-w-md">
            <button
              onClick={() => setSelectedAgents([])}
              className={cn(
                'px-2 py-1 text-xs rounded-md transition-colors',
                selectedAgents.length === 0
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              )}
            >
              All
            </button>
            {availableAgents.slice(0, 5).map((agentName) => (
              <button
                key={agentName}
                onClick={() => handleAgentToggle(agentName)}
                className={cn(
                  'px-2 py-1 text-xs rounded-md transition-colors',
                  selectedAgents.includes(agentName) || selectedAgents.length === 0
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                )}
              >
                {agentName}
              </button>
            ))}
            {availableAgents.length > 5 && (
              <span className="text-xs text-gray-500 px-2 py-1">
                +{availableAgents.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Service Filter */}
      {availableServices.length > 0 && (
        <div className="flex items-center space-x-2">
          <Server className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Services:</span>
          <div className="flex flex-wrap gap-1 max-w-md">
            <button
              onClick={() => setSelectedServices([])}
              className={cn(
                'px-2 py-1 text-xs rounded-md transition-colors',
                selectedServices.length === 0
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              )}
            >
              All
            </button>
            {availableServices.slice(0, 4).map((serviceName) => (
              <button
                key={serviceName}
                onClick={() => handleServiceToggle(serviceName)}
                className={cn(
                  'px-2 py-1 text-xs rounded-md transition-colors',
                  selectedServices.includes(serviceName) || selectedServices.length === 0
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                )}
              >
                {serviceName}
              </button>
            ))}
            {availableServices.length > 4 && (
              <span className="text-xs text-gray-500 px-2 py-1">
                +{availableServices.length - 4} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Alert Filter */}
      <div className="flex items-center space-x-2">
        <Filter className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">Alerts:</span>
        <select
          value={alertsFilter}
          onChange={(e) => setAlertsFilter(e.target.value as any)}
          className="px-3 py-1 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {alertFilterOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Clear Filters */}
      {(selectedAgents.length > 0 || selectedServices.length > 0 || alertsFilter !== 'all' || timeRange !== '4h') && (
        <button
          onClick={() => {
            setSelectedAgents([]);
            setSelectedServices([]);
            setAlertsFilter('all');
            setTimeRange('4h');
          }}
          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 underline"
        >
          Clear Filters
        </button>
      )}
    </div>
  );
};

export default DashboardFilters;
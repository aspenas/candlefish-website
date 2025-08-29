'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Service } from '@/types/api';
import { serviceApi, queryKeys } from '@/lib/api';
import { useServiceUpdates } from '@/hooks/useWebSocket';
import { LogViewer } from './LogViewer';
import { Play, Square, Activity, Eye, AlertTriangle } from 'lucide-react';

interface ServiceGridProps {
  services: Service[];
}

export function ServiceGrid({ services }: ServiceGridProps) {
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { services: liveServices } = useServiceUpdates();

  // Merge static services with live updates
  const mergedServices = services.map(service => {
    const liveService = liveServices.find(ls => ls.id === service.id);
    return liveService ? { ...service, ...liveService } : service;
  });

  const startServiceMutation = useMutation({
    mutationFn: (serviceId: string) => serviceApi.startService(serviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services });
    },
  });

  const stopServiceMutation = useMutation({
    mutationFn: (serviceId: string) => serviceApi.stopService(serviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services });
    },
  });

  const handleServiceAction = async (service: Service) => {
    try {
      if (service.status === 'running') {
        await stopServiceMutation.mutateAsync(service.id);
      } else {
        await startServiceMutation.mutateAsync(service.id);
      }
    } catch (error) {
      console.error('Service action failed:', error);
    }
  };

  const handleViewLogs = (serviceId: string) => {
    setSelectedService(serviceId);
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'stopped':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      case 'unhealthy':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy':
        return 'text-green-600 dark:text-green-400';
      case 'unhealthy':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-yellow-600 dark:text-yellow-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Play className="w-3 h-3 text-green-600" />;
      case 'stopped':
        return <Square className="w-3 h-3 text-gray-600" />;
      case 'unhealthy':
        return <AlertTriangle className="w-3 h-3 text-red-600" />;
      default:
        return <Square className="w-3 h-3 text-gray-600" />;
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mergedServices.map((service) => (
          <div
            key={service.id || service.name}
            className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                  {service.name}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Port: {service.port}
                </p>
                {service.health && (
                  <div className="flex items-center mt-1">
                    <Activity className={`w-3 h-3 mr-1 ${getHealthColor(service.health)}`} />
                    <span className={`text-xs ${getHealthColor(service.health)}`}>
                      {service.health}
                    </span>
                  </div>
                )}
              </div>
              <span
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                  service.status
                )}`}
              >
                <span className="mr-1">{getStatusIcon(service.status)}</span>
                {service.status}
              </span>
            </div>
            
            <div className="space-y-2 text-sm mb-4">
              {typeof service.cpu === 'number' && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">CPU:</span>
                  <div className="flex items-center">
                    <div className="w-16 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mr-2">
                      <div 
                        className="bg-blue-600 h-1.5 rounded-full transition-all" 
                        style={{ width: `${Math.min(service.cpu, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-900 dark:text-white min-w-[2.5rem]">
                      {service.cpu.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}
              {typeof service.memory === 'number' && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">Memory:</span>
                  <div className="flex items-center">
                    <div className="w-16 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mr-2">
                      <div 
                        className="bg-green-600 h-1.5 rounded-full transition-all" 
                        style={{ width: `${Math.min(service.memory, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-900 dark:text-white min-w-[2.5rem]">
                      {service.memory.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Group:</span>
                <span className="text-slate-900 dark:text-white">{service.group}</span>
              </div>
              {service.started_at && (
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Started:</span>
                  <span className="text-slate-900 dark:text-white text-xs">
                    {new Date(service.started_at).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => handleServiceAction(service)}
                disabled={startServiceMutation.isPending || stopServiceMutation.isPending}
                className="flex-1 px-3 py-2 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
              >
                {service.status === 'running' ? (
                  <>
                    <Square className="w-3 h-3" />
                    Stop
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3" />
                    Start
                  </>
                )}
              </button>
              <button 
                onClick={() => handleViewLogs(service.id || service.name)}
                className="flex-1 px-3 py-2 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded transition-colors flex items-center justify-center gap-1"
              >
                <Eye className="w-3 h-3" />
                Logs
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Log Viewer Modal */}
      {selectedService && (
        <LogViewer
          serviceId={selectedService}
          onClose={() => setSelectedService(null)}
        />
      )}
    </>
  );
}
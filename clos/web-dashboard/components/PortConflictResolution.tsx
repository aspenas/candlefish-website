'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PortConflict, Port } from '@/types/api';
import { portApi, queryKeys } from '@/lib/api';
import { X, AlertTriangle, RefreshCw, Check, ArrowRight } from 'lucide-react';

interface PortConflictResolutionProps {
  conflicts: PortConflict[];
  onClose: () => void;
  onResolved?: (resolvedPorts: Port[]) => void;
}

interface ResolutionChoice {
  conflictPort: number;
  selectedPort: number;
  affectedServices: string[];
}

export function PortConflictResolution({ 
  conflicts, 
  onClose, 
  onResolved 
}: PortConflictResolutionProps) {
  const [resolutions, setResolutions] = useState<ResolutionChoice[]>(
    conflicts.map(conflict => ({
      conflictPort: conflict.port,
      selectedPort: conflict.suggested_ports[0] || conflict.port,
      affectedServices: conflict.conflicting_services,
    }))
  );
  
  const queryClient = useQueryClient();
  
  const resolveConflictsMutation = useMutation({
    mutationFn: () => portApi.resolveConflicts({ 
      conflicts,
      auto_resolve: false,
    }),
    onSuccess: (resolvedPorts) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ports });
      queryClient.invalidateQueries({ queryKey: queryKeys.services });
      onResolved?.(resolvedPorts);
      onClose();
    },
  });
  
  const autoResolveMutation = useMutation({
    mutationFn: () => portApi.resolveConflicts({ 
      conflicts,
      auto_resolve: true,
    }),
    onSuccess: (resolvedPorts) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ports });
      queryClient.invalidateQueries({ queryKey: queryKeys.services });
      onResolved?.(resolvedPorts);
      onClose();
    },
  });
  
  const updateResolution = (conflictPort: number, newPort: number) => {
    setResolutions(prev => 
      prev.map(res => 
        res.conflictPort === conflictPort 
          ? { ...res, selectedPort: newPort }
          : res
      )
    );
  };
  
  const handleManualResolve = () => {
    // For now, just call the API with the conflicts
    // In a real implementation, you'd send the specific port mappings
    resolveConflictsMutation.mutate();
  };
  
  const handleAutoResolve = () => {
    autoResolveMutation.mutate();
  };
  
  const totalConflicts = conflicts.length;
  const totalAffectedServices = conflicts.reduce((acc, c) => acc + c.conflicting_services.length, 0);
  
  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-orange-600" />
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                Port Conflict Resolution
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {totalConflicts} conflict{totalConflicts !== 1 ? 's' : ''} affecting {totalAffectedServices} service{totalAffectedServices !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
              <h3 className="font-medium text-slate-900 dark:text-white mb-3">
                Quick Resolution
              </h3>
              <div className="flex gap-3">
                <button
                  onClick={handleAutoResolve}
                  disabled={autoResolveMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-4 h-4 ${autoResolveMutation.isPending ? 'animate-spin' : ''}`} />
                  Auto-resolve All
                </button>
                <p className="text-sm text-slate-600 dark:text-slate-400 self-center">
                  Automatically assign suggested ports to conflicting services
                </p>
              </div>
            </div>
            
            {/* Conflicts List */}
            <div>
              <h3 className="font-medium text-slate-900 dark:text-white mb-4">
                Manual Resolution
              </h3>
              
              <div className="space-y-4">
                {conflicts.map((conflict, index) => {
                  const resolution = resolutions.find(r => r.conflictPort === conflict.port);
                  
                  return (
                    <div 
                      key={conflict.port}
                      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4"
                    >
                      {/* Conflict Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-red-600 dark:text-red-400">
                              {index + 1}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-medium text-slate-900 dark:text-white">
                              Port {conflict.port} Conflict
                            </h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {conflict.conflicting_services.length} services competing for this port
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Conflicting Services */}
                      <div className="mb-4">
                        <h5 className="text-sm font-medium text-slate-900 dark:text-white mb-2">
                          Conflicting Services:
                        </h5>
                        <div className="flex flex-wrap gap-2">
                          {conflict.conflicting_services.map(service => (
                            <span 
                              key={service}
                              className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-xs rounded"
                            >
                              {service}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      {/* Resolution Options */}
                      <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-slate-600 dark:text-slate-400 min-w-0">
                            Reassign to:
                          </span>
                          
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-slate-900 dark:text-white px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded">
                              :{conflict.port}
                            </span>
                            <ArrowRight className="w-4 h-4 text-slate-400" />
                            <select
                              value={resolution?.selectedPort || conflict.suggested_ports[0]}
                              onChange={(e) => updateResolution(conflict.port, parseInt(e.target.value))}
                              className="font-mono text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              {conflict.suggested_ports.map(port => (
                                <option key={port} value={port}>
                                  :{port}
                                </option>
                              ))}
                            </select>
                          </div>
                          
                          <div className="flex-1" />
                          
                          {resolution?.selectedPort !== conflict.port && (
                            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                              <Check className="w-4 h-4" />
                              <span className="text-xs">Will resolve</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                          Suggested ports: {conflict.suggested_ports.join(', ')}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer Actions */}
        <div className="border-t border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Review the port assignments above and apply changes
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleManualResolve}
                disabled={resolveConflictsMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className={`w-4 h-4 ${resolveConflictsMutation.isPending ? 'animate-spin' : ''}`} />
                Apply Resolutions
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
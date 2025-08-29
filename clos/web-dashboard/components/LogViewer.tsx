'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { serviceApi, queryKeys } from '@/lib/api';
import { useLogStream } from '@/hooks/useWebSocket';
import { LogEntry } from '@/types/api';
import { X, Download, Filter, Search, Trash2, Play, Pause, ChevronDown } from 'lucide-react';

interface LogViewerProps {
  serviceId: string;
  onClose: () => void;
}

const LOG_LEVELS = ['debug', 'info', 'warn', 'error', 'fatal'];

const LOG_COLORS = {
  debug: 'text-slate-500',
  info: 'text-blue-600',
  warn: 'text-yellow-600',
  error: 'text-red-600',
  fatal: 'text-red-800 font-bold',
};

export function LogViewer({ serviceId, onClose }: LogViewerProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const logsContainerRef = useRef<HTMLDivElement>(null);
  
  // WebSocket log stream
  const { logs: streamLogs, clearLogs, isConnected } = useLogStream(serviceId);
  
  // Fetch initial logs
  const { data: initialLogs, isLoading } = useQuery({
    queryKey: queryKeys.serviceLogs(serviceId, { limit: 100 }),
    queryFn: () => serviceApi.getLogs(serviceId, { limit: 100 }),
  });
  
  // Combine initial and stream logs
  const allLogs = [...(initialLogs?.items || []), ...streamLogs];
  
  // Filter logs
  const filteredLogs = allLogs.filter(log => {
    if (selectedLevel && log.level !== selectedLevel) return false;
    if (searchTerm && !log.message.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });
  
  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll]);
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is already applied through filtering
  };
  
  const handleLevelChange = (level: string) => {
    setSelectedLevel(level);
  };
  
  const clearAllLogs = () => {
    clearLogs();
  };
  
  const downloadLogs = () => {
    const logText = filteredLogs.map(log => 
      `[${new Date(log.timestamp).toISOString()}] [${log.level.toUpperCase()}] ${log.message}`
    ).join('\\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${serviceId}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const getLevelColor = (level: string) => {
    return LOG_COLORS[level as keyof typeof LOG_COLORS] || 'text-slate-600';
  };
  
  const formatTimestamp = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  };
  
  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-6xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Logs: {serviceId}
            </h2>
            <div className="flex items-center gap-2">
              {isConnected ? (
                <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
                  Connected
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                  <div className="w-2 h-2 bg-red-600 rounded-full" />
                  Disconnected
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-md transition-colors ${showFilters 
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400' 
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
              title="Toggle filters"
            >
              <Filter className="w-4 h-4" />
            </button>
            <button
              onClick={downloadLogs}
              className="p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-md transition-colors"
              title="Download logs"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={clearAllLogs}
              className="p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-md transition-colors"
              title="Clear logs"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`p-2 rounded-md transition-colors ${autoScroll 
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400' 
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
              title={autoScroll ? 'Disable auto-scroll' : 'Enable auto-scroll'}
            >
              {autoScroll ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Filters */}
        {showFilters && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <div className="flex flex-wrap gap-4 items-end">
              {/* Search */}
              <div className="flex-1 min-w-[200px]">
                <form onSubmit={handleSearch} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search logs..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
                  >
                    Search
                  </button>
                </form>
              </div>
              
              {/* Level Filter */}
              <div className="relative">
                <select
                  value={selectedLevel}
                  onChange={(e) => handleLevelChange(e.target.value)}
                  className="appearance-none bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Levels</option>
                  {LOG_LEVELS.map(level => (
                    <option key={level} value={level}>
                      {level.toUpperCase()}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        )}
        
        {/* Logs Container */}
        <div 
          ref={logsContainerRef}
          className="flex-1 overflow-y-auto p-4 bg-slate-950 font-mono text-xs"
        >
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}
          
          {!isLoading && filteredLogs.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              No logs to display
            </div>
          )}
          
          {filteredLogs.map((log, index) => (
            <div 
              key={log.id || index}
              className="flex gap-2 hover:bg-slate-900 px-2 py-0.5 rounded"
            >
              <span className="text-slate-600 dark:text-slate-500 min-w-[90px]">
                {formatTimestamp(log.timestamp)}
              </span>
              <span className={`min-w-[60px] ${getLevelColor(log.level)}`}>
                [{log.level.toUpperCase()}]
              </span>
              <span className="text-slate-300 flex-1 break-all">
                {log.message}
              </span>
            </div>
          ))}
        </div>
        
        {/* Footer */}
        <div className="p-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Showing {filteredLogs.length} log entries
          </span>
          <span className="text-xs text-slate-500">
            {autoScroll ? 'Auto-scrolling enabled' : 'Auto-scrolling disabled'}
          </span>
        </div>
      </div>
    </div>
  );
}
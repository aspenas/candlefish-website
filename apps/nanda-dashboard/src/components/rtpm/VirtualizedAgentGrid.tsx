import React, { useState, useMemo, useCallback, useRef } from 'react';
import { FixedSizeList as List } from 'react-window';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Grid3X3,
  List as ListIcon,
  MoreVertical,
  Activity,
  Cpu,
  MemoryStick,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  AlertCircle,
  Pause,
  ChevronDown
} from 'lucide-react';
import {
  Agent,
  AgentMetrics,
  GridViewConfig,
  VirtualizedAgentRow
} from '../../types/rtpm.types';

interface VirtualizedAgentGridProps {
  agents: Agent[];
  agentMetrics: Map<string, AgentMetrics>;
  onAgentSelect?: (agent: Agent) => void;
  onAgentsSelect?: (agents: Agent[]) => void;
  selectedAgents?: string[];
  config?: Partial<GridViewConfig>;
  className?: string;
}

interface AgentCardProps {
  agent: Agent;
  metrics: AgentMetrics | undefined;
  isSelected: boolean;
  onClick: () => void;
  viewMode: 'grid' | 'list' | 'compact';
  style?: React.CSSProperties;
}

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filters: {
    status: Agent['status'][];
    regions: string[];
    platforms: string[];
    search: string;
  };
  onFiltersChange: (filters: any) => void;
  agents: Agent[];
}

const StatusIcon: React.FC<{ status: Agent['status']; className?: string }> = ({ status, className = "w-4 h-4" }) => {
  switch (status) {
    case 'online':
      return <CheckCircle className={`${className} text-green-400`} />;
    case 'offline':
      return <XCircle className={`${className} text-gray-400`} />;
    case 'warning':
      return <AlertCircle className={`${className} text-yellow-400`} />;
    case 'error':
      return <XCircle className={`${className} text-red-400`} />;
    case 'maintenance':
      return <Pause className={`${className} text-blue-400`} />;
    default:
      return <XCircle className={`${className} text-gray-400`} />;
  }
};

const MetricBadge: React.FC<{ 
  value: number; 
  unit: string; 
  threshold?: { warning: number; critical: number };
  icon: React.ReactNode;
}> = ({ value, unit, threshold, icon }) => {
  const getColor = () => {
    if (!threshold) return 'text-gray-400';
    if (value >= threshold.critical) return 'text-red-400';
    if (value >= threshold.warning) return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <div className={`flex items-center gap-1 ${getColor()}`}>
      {icon}
      <span className="text-xs font-medium">
        {value.toFixed(1)}{unit}
      </span>
    </div>
  );
};

const AgentCard: React.FC<AgentCardProps> = ({
  agent,
  metrics,
  isSelected,
  onClick,
  viewMode,
  style
}) => {
  const getStatusColor = (status: Agent['status']) => {
    switch (status) {
      case 'online': return 'border-green-500/30 bg-green-500/5';
      case 'offline': return 'border-gray-500/30 bg-gray-500/5';
      case 'warning': return 'border-yellow-500/30 bg-yellow-500/5';
      case 'error': return 'border-red-500/30 bg-red-500/5';
      case 'maintenance': return 'border-blue-500/30 bg-blue-500/5';
      default: return 'border-gray-500/30 bg-gray-500/5';
    }
  };

  if (viewMode === 'compact') {
    return (
      <motion.div
        style={style}
        whileHover={{ scale: 1.01 }}
        onClick={onClick}
        className={`
          p-2 border rounded-lg cursor-pointer transition-all duration-200
          ${isSelected ? 'border-blue-500 bg-blue-500/10' : `border-gray-700 ${getStatusColor(agent.status)}`}
          hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-500/10
        `}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <StatusIcon status={agent.status} className="w-3 h-3 flex-shrink-0" />
            <span className="text-white text-sm font-medium truncate">{agent.name}</span>
            {agent.platform && (
              <span className="text-xs text-gray-400 bg-gray-700/50 px-1 rounded">
                {agent.platform}
              </span>
            )}
          </div>
          
          {metrics && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <MetricBadge
                value={metrics.cpu}
                unit="%"
                threshold={{ warning: 70, critical: 90 }}
                icon={<Cpu className="w-3 h-3" />}
              />
              <MetricBadge
                value={metrics.responseTime}
                unit="ms"
                threshold={{ warning: 1000, critical: 5000 }}
                icon={<Clock className="w-3 h-3" />}
              />
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  if (viewMode === 'list') {
    return (
      <motion.div
        style={style}
        whileHover={{ scale: 1.005 }}
        onClick={onClick}
        className={`
          p-4 border rounded-lg cursor-pointer transition-all duration-200
          ${isSelected ? 'border-blue-500 bg-blue-500/10' : `border-gray-700 ${getStatusColor(agent.status)}`}
          hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-500/10
        `}
      >
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
          {/* Agent Info */}
          <div className="flex items-center gap-3">
            <StatusIcon status={agent.status} />
            <div>
              <h3 className="text-white font-medium">{agent.name}</h3>
              <p className="text-gray-400 text-sm">{agent.id}</p>
            </div>
          </div>

          {/* Platform & Version */}
          <div>
            <p className="text-white text-sm">{agent.platform || 'Unknown'}</p>
            <p className="text-gray-400 text-xs">{agent.version}</p>
          </div>

          {/* Region */}
          <div>
            <p className="text-white text-sm">{agent.region || 'Global'}</p>
            <p className="text-gray-400 text-xs">
              {agent.lastSeen ? new Date(agent.lastSeen).toLocaleTimeString() : '—'}
            </p>
          </div>

          {/* Metrics */}
          {metrics ? (
            <div className="grid grid-cols-2 gap-2">
              <MetricBadge
                value={metrics.cpu}
                unit="%"
                threshold={{ warning: 70, critical: 90 }}
                icon={<Cpu className="w-4 h-4" />}
              />
              <MetricBadge
                value={metrics.memory}
                unit="%"
                threshold={{ warning: 80, critical: 95 }}
                icon={<MemoryStick className="w-4 h-4" />}
              />
              <MetricBadge
                value={metrics.responseTime}
                unit="ms"
                threshold={{ warning: 1000, critical: 5000 }}
                icon={<Clock className="w-4 h-4" />}
              />
              <MetricBadge
                value={metrics.errorRate}
                unit="%"
                threshold={{ warning: 5, critical: 10 }}
                icon={<AlertTriangle className="w-4 h-4" />}
              />
            </div>
          ) : (
            <div className="text-gray-500 text-sm">No metrics</div>
          )}

          {/* Actions */}
          <div className="flex justify-end">
            <button className="p-1 rounded hover:bg-gray-700/50 text-gray-400 hover:text-white">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Grid view (default)
  return (
    <motion.div
      style={style}
      whileHover={{ scale: 1.02, y: -2 }}
      onClick={onClick}
      className={`
        p-4 border rounded-xl cursor-pointer transition-all duration-200
        ${isSelected ? 'border-blue-500 bg-blue-500/10' : `border-gray-700 ${getStatusColor(agent.status)}`}
        hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-500/10
      `}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon status={agent.status} />
            <span className="text-white font-medium truncate">{agent.name}</span>
          </div>
          <button className="p-1 rounded hover:bg-gray-700/50 text-gray-400 hover:text-white">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>

        {/* Platform & Version */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Platform:</span>
            <span className="text-white">{agent.platform || 'Unknown'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Version:</span>
            <span className="text-white">{agent.version}</span>
          </div>
          {agent.region && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Region:</span>
              <span className="text-white">{agent.region}</span>
            </div>
          )}
        </div>

        {/* Metrics */}
        {metrics ? (
          <div className="grid grid-cols-2 gap-2">
            <MetricBadge
              value={metrics.cpu}
              unit="%"
              threshold={{ warning: 70, critical: 90 }}
              icon={<Cpu className="w-4 h-4" />}
            />
            <MetricBadge
              value={metrics.memory}
              unit="%"
              threshold={{ warning: 80, critical: 95 }}
              icon={<MemoryStick className="w-4 h-4" />}
            />
            <MetricBadge
              value={metrics.responseTime}
              unit="ms"
              threshold={{ warning: 1000, critical: 5000 }}
              icon={<Clock className="w-4 h-4" />}
            />
            <MetricBadge
              value={metrics.errorRate}
              unit="%"
              threshold={{ warning: 5, critical: 10 }}
              icon={<AlertTriangle className="w-4 h-4" />}
            />
          </div>
        ) : (
          <div className="text-center py-4">
            <Activity className="w-8 h-8 mx-auto text-gray-500 mb-2" />
            <p className="text-gray-500 text-sm">No metrics available</p>
          </div>
        )}

        {/* Last Seen */}
        <div className="text-xs text-gray-400 border-t border-gray-700/50 pt-2">
          Last seen: {agent.lastSeen ? new Date(agent.lastSeen).toLocaleString() : 'Never'}
        </div>
      </div>
    </motion.div>
  );
};

const FilterPanel: React.FC<FilterPanelProps> = ({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  agents
}) => {
  const uniqueRegions = useMemo(() => 
    [...new Set(agents.map(a => a.region).filter(Boolean))],
    [agents]
  );

  const uniquePlatforms = useMemo(() => 
    [...new Set(agents.map(a => a.platform).filter(Boolean))],
    [agents]
  );

  const statusOptions = [
    { value: 'online', label: 'Online', color: 'text-green-400' },
    { value: 'offline', label: 'Offline', color: 'text-gray-400' },
    { value: 'warning', label: 'Warning', color: 'text-yellow-400' },
    { value: 'error', label: 'Error', color: 'text-red-400' },
    { value: 'maintenance', label: 'Maintenance', color: 'text-blue-400' }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          className="fixed right-0 top-0 h-full w-80 bg-gray-800/95 backdrop-blur-sm border-l border-gray-700 z-50 overflow-y-auto"
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-semibold">Filters</h3>
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-gray-700/50 text-gray-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Search */}
              <div>
                <label className="text-gray-300 text-sm font-medium mb-2 block">Search</label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
                  placeholder="Search agents..."
                  className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Status */}
              <div>
                <label className="text-gray-300 text-sm font-medium mb-2 block">Status</label>
                <div className="space-y-2">
                  {statusOptions.map(status => (
                    <label key={status.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.status.includes(status.value as Agent['status'])}
                        onChange={(e) => {
                          const newStatus = e.target.checked
                            ? [...filters.status, status.value as Agent['status']]
                            : filters.status.filter(s => s !== status.value);
                          onFiltersChange({ ...filters, status: newStatus });
                        }}
                        className="rounded border-gray-600 bg-gray-700"
                      />
                      <span className={`text-sm ${status.color}`}>{status.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Regions */}
              {uniqueRegions.length > 0 && (
                <div>
                  <label className="text-gray-300 text-sm font-medium mb-2 block">Regions</label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {uniqueRegions.map(region => (
                      <label key={region} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.regions.includes(region)}
                          onChange={(e) => {
                            const newRegions = e.target.checked
                              ? [...filters.regions, region]
                              : filters.regions.filter(r => r !== region);
                            onFiltersChange({ ...filters, regions: newRegions });
                          }}
                          className="rounded border-gray-600 bg-gray-700"
                        />
                        <span className="text-sm text-gray-300">{region}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Platforms */}
              {uniquePlatforms.length > 0 && (
                <div>
                  <label className="text-gray-300 text-sm font-medium mb-2 block">Platforms</label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {uniquePlatforms.map(platform => (
                      <label key={platform} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.platforms.includes(platform)}
                          onChange={(e) => {
                            const newPlatforms = e.target.checked
                              ? [...filters.platforms, platform]
                              : filters.platforms.filter(p => p !== platform);
                            onFiltersChange({ ...filters, platforms: newPlatforms });
                          }}
                          className="rounded border-gray-600 bg-gray-700"
                        />
                        <span className="text-sm text-gray-300">{platform}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Clear Filters */}
              <button
                onClick={() => onFiltersChange({
                  status: [],
                  regions: [],
                  platforms: [],
                  search: ''
                })}
                className="w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const VirtualizedAgentGrid: React.FC<VirtualizedAgentGridProps> = ({
  agents,
  agentMetrics,
  onAgentSelect,
  onAgentsSelect,
  selectedAgents = [],
  config = {},
  className = ''
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'compact'>(config.viewMode || 'grid');
  const [sortBy, setSortBy] = useState<string>(config.sortBy || 'name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(config.sortOrder || 'asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: [] as Agent['status'][],
    regions: [] as string[],
    platforms: [] as string[],
    search: ''
  });

  const listRef = useRef<List>(null);

  // Filter and sort agents
  const filteredAndSortedAgents = useMemo(() => {
    let filtered = agents.filter(agent => {
      // Search filter
      const searchMatch = !filters.search || 
        agent.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        agent.id.toLowerCase().includes(filters.search.toLowerCase());

      // Status filter
      const statusMatch = filters.status.length === 0 || filters.status.includes(agent.status);

      // Region filter
      const regionMatch = filters.regions.length === 0 || 
        (agent.region && filters.regions.includes(agent.region));

      // Platform filter
      const platformMatch = filters.platforms.length === 0 || 
        (agent.platform && filters.platforms.includes(agent.platform));

      return searchMatch && statusMatch && regionMatch && platformMatch;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof Agent];
      let bValue: any = b[sortBy as keyof Agent];

      // Handle metrics sorting
      if (sortBy.startsWith('metrics.')) {
        const metricKey = sortBy.split('.')[1] as keyof AgentMetrics;
        aValue = agentMetrics.get(a.id)?.[metricKey] || 0;
        bValue = agentMetrics.get(b.id)?.[metricKey] || 0;
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [agents, agentMetrics, filters, sortBy, sortOrder]);

  // Calculate item size based on view mode
  const getItemSize = () => {
    switch (viewMode) {
      case 'compact': return 50;
      case 'list': return 120;
      case 'grid': return 280;
      default: return 280;
    }
  };

  // Render function for virtualized list
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const agent = filteredAndSortedAgents[index];
    const metrics = agentMetrics.get(agent.id);
    const isSelected = selectedAgents.includes(agent.id);

    return (
      <div style={style} className="p-2">
        <AgentCard
          agent={agent}
          metrics={metrics}
          isSelected={isSelected}
          onClick={() => onAgentSelect?.(agent)}
          viewMode={viewMode}
        />
      </div>
    );
  }, [filteredAndSortedAgents, agentMetrics, selectedAgents, viewMode, onAgentSelect]);

  const handleSortChange = (newSortBy: string) => {
    if (newSortBy === sortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Controls */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4 justify-between">
          {/* Left side controls */}
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Search agents..."
                className="pl-10 pr-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
                className="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="name">Name</option>
                <option value="status">Status</option>
                <option value="platform">Platform</option>
                <option value="region">Region</option>
                <option value="lastSeen">Last Seen</option>
                <option value="metrics.cpu">CPU Usage</option>
                <option value="metrics.memory">Memory Usage</option>
                <option value="metrics.responseTime">Response Time</option>
              </select>
              
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-2 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-300 hover:text-white hover:bg-gray-600/50"
              >
                {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-2">
            {/* View mode */}
            <div className="flex bg-gray-700/50 rounded-lg border border-gray-600">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-l-lg transition-colors ${
                  viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 transition-colors ${
                  viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                <ListIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('compact')}
                className={`p-2 rounded-r-lg transition-colors ${
                  viewMode === 'compact' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                <Activity className="w-4 h-4" />
              </button>
            </div>

            {/* Filter button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-300 hover:text-white hover:bg-gray-600/50"
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700/50">
          <div className="text-sm text-gray-400">
            Showing {filteredAndSortedAgents.length} of {agents.length} agents
          </div>
          
          {selectedAgents.length > 0 && (
            <div className="text-sm text-blue-400">
              {selectedAgents.length} selected
            </div>
          )}
        </div>
      </div>

      {/* Virtualized Grid */}
      <div className="flex-1 min-h-0">
        {filteredAndSortedAgents.length > 0 ? (
          <List
            ref={listRef}
            height={600}
            itemCount={filteredAndSortedAgents.length}
            itemSize={getItemSize()}
            className="scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
          >
            {Row}
          </List>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-400">
            <div className="text-center">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No agents found matching your filters</p>
            </div>
          </div>
        )}
      </div>

      {/* Filter Panel */}
      <FilterPanel
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onFiltersChange={setFilters}
        agents={agents}
      />
    </div>
  );
};

export default VirtualizedAgentGrid;
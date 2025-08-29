import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useQuery } from '@apollo/client';
import { motion, AnimatePresence } from 'framer-motion';
import * as d3 from 'd3';
import { 
  Target, 
  ChevronDown, 
  ChevronRight, 
  Info, 
  ExternalLink,
  Search,
  Filter,
  Maximize2,
  Eye,
  AlertCircle
} from 'lucide-react';

// Components
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Tooltip } from '../ui/Tooltip';

// GraphQL
import { GET_MITRE_ATTACK_FRAMEWORK } from '../../graphql/queries/threat-detection.graphql';

// Types
import { SecurityEvent, Severity } from '../../types/security';

interface MITREAttackVisualizationProps {
  events: SecurityEvent[];
  className?: string;
  interactive?: boolean;
  showDetails?: boolean;
}

interface MITRETactic {
  id: string;
  name: string;
  shortName: string;
  description: string;
  techniques: MITRETechnique[];
}

interface MITRETechnique {
  id: string;
  name: string;
  description: string;
  platforms: string[];
  dataSourcesRequired: string[];
  defensesBypassed: string[];
  detectionMethods: string[];
  subTechniques: MITRESubTechnique[];
}

interface MITRESubTechnique {
  id: string;
  name: string;
  description: string;
  platforms: string[];
}

interface TacticStats {
  eventCount: number;
  severityBreakdown: Record<Severity, number>;
  techniques: Array<{
    techniqueId: string;
    techniqueName: string;
    eventCount: number;
    severity: Severity;
  }>;
}

// MITRE ATT&CK Tactics in order
const MITRE_TACTICS_ORDER = [
  'initial-access',
  'execution',
  'persistence',
  'privilege-escalation',
  'defense-evasion',
  'credential-access',
  'discovery',
  'lateral-movement',
  'collection',
  'command-and-control',
  'exfiltration',
  'impact'
];

const TACTIC_COLORS = {
  'initial-access': '#FF6B6B',
  'execution': '#4ECDC4',
  'persistence': '#45B7D1',
  'privilege-escalation': '#96CEB4',
  'defense-evasion': '#FFEAA7',
  'credential-access': '#DDA0DD',
  'discovery': '#98D8C8',
  'lateral-movement': '#F7DC6F',
  'collection': '#BB8FCE',
  'command-and-control': '#85C1E9',
  'exfiltration': '#F8C471',
  'impact': '#EC7063'
};

const SEVERITY_COLORS = {
  CRITICAL: '#EF4444',
  HIGH: '#F97316',
  MEDIUM: '#EAB308',
  LOW: '#3B82F6'
};

export const MITREAttackVisualization: React.FC<MITREAttackVisualizationProps> = ({
  events,
  className = '',
  interactive = true,
  showDetails = true
}) => {
  const [selectedTactic, setSelectedTactic] = useState<string | null>(null);
  const [selectedTechnique, setSelectedTechnique] = useState<string | null>(null);
  const [expandedTactics, setExpandedTactics] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<Severity[]>([]);
  const [viewMode, setViewMode] = useState<'matrix' | 'flow' | 'heatmap'>('matrix');
  
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // GraphQL Query for MITRE data
  const { data: mitreData, loading: mitreLoading } = useQuery(GET_MITRE_ATTACK_FRAMEWORK, {
    fetchPolicy: 'cache-first'
  });

  // Process events to extract MITRE mapping
  const tacticStats = useMemo(() => {
    const stats: Record<string, TacticStats> = {};
    
    events.forEach(event => {
      if (event.mitreAttackTactics) {
        event.mitreAttackTactics.forEach(tactic => {
          const tacticId = tactic.tacticId.toLowerCase().replace(/[^a-z0-9]/g, '-');
          
          if (!stats[tacticId]) {
            stats[tacticId] = {
              eventCount: 0,
              severityBreakdown: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 },
              techniques: []
            };
          }
          
          stats[tacticId].eventCount++;
          stats[tacticId].severityBreakdown[event.severity]++;
          
          // Add technique stats
          tactic.techniques?.forEach(technique => {
            const existingTechnique = stats[tacticId].techniques.find(
              t => t.techniqueId === technique.techniqueId
            );
            
            if (existingTechnique) {
              existingTechnique.eventCount++;
              if (event.severity === 'CRITICAL' || event.severity === 'HIGH') {
                existingTechnique.severity = event.severity;
              }
            } else {
              stats[tacticId].techniques.push({
                techniqueId: technique.techniqueId,
                techniqueName: technique.techniqueName,
                eventCount: 1,
                severity: event.severity
              });
            }
          });
        });
      }
    });
    
    return stats;
  }, [events]);

  // Filter tactics based on search and severity
  const filteredTactics = useMemo(() => {
    if (!mitreData?.mitreAttackFramework?.tactics) return [];
    
    return mitreData.mitreAttackFramework.tactics.filter((tactic: MITRETactic) => {
      const tacticId = tactic.id.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const stats = tacticStats[tacticId];
      
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          tactic.name.toLowerCase().includes(searchLower) ||
          tactic.description.toLowerCase().includes(searchLower) ||
          tactic.techniques.some(tech => 
            tech.name.toLowerCase().includes(searchLower) ||
            tech.description.toLowerCase().includes(searchLower)
          );
        
        if (!matchesSearch) return false;
      }
      
      // Severity filter
      if (filterSeverity.length > 0 && stats) {
        const hasMatchingSeverity = filterSeverity.some(
          severity => stats.severityBreakdown[severity] > 0
        );
        if (!hasMatchingSeverity) return false;
      }
      
      return true;
    });
  }, [mitreData, tacticStats, searchTerm, filterSeverity]);

  // D3 Visualization Effect
  useEffect(() => {
    if (viewMode === 'flow' && svgRef.current && filteredTactics.length > 0) {
      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();
      
      const width = 800;
      const height = 400;
      const margin = { top: 20, right: 20, bottom: 20, left: 20 };
      
      svg.attr('width', width).attr('height', height);
      
      // Create flow diagram
      const nodes = MITRE_TACTICS_ORDER.map((tacticId, index) => {
        const stats = tacticStats[tacticId];
        return {
          id: tacticId,
          name: tacticId.replace(/-/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase()),
          x: (width - margin.left - margin.right) * (index / (MITRE_TACTICS_ORDER.length - 1)) + margin.left,
          y: height / 2,
          eventCount: stats?.eventCount || 0,
          severity: stats ? Object.keys(stats.severityBreakdown).find(
            key => stats.severityBreakdown[key as Severity] > 0
          ) : 'LOW'
        };
      });
      
      const links = nodes.slice(0, -1).map((node, index) => ({
        source: node,
        target: nodes[index + 1],
        strength: Math.min(node.eventCount, nodes[index + 1].eventCount)
      }));
      
      // Draw links
      svg.selectAll('.link')
        .data(links)
        .enter()
        .append('line')
        .attr('class', 'link')
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y)
        .attr('stroke', '#4B5563')
        .attr('stroke-width', d => Math.max(1, d.strength / 2))
        .attr('opacity', 0.6);
      
      // Draw nodes
      const nodeGroups = svg.selectAll('.node')
        .data(nodes)
        .enter()
        .append('g')
        .attr('class', 'node')
        .attr('transform', d => `translate(${d.x},${d.y})`);
      
      nodeGroups.append('circle')
        .attr('r', d => Math.max(10, Math.min(30, d.eventCount * 2)))
        .attr('fill', d => TACTIC_COLORS[d.id as keyof typeof TACTIC_COLORS] || '#6B7280')
        .attr('stroke', d => SEVERITY_COLORS[d.severity as Severity] || '#6B7280')
        .attr('stroke-width', 2)
        .attr('opacity', 0.8);
      
      nodeGroups.append('text')
        .text(d => d.eventCount)
        .attr('text-anchor', 'middle')
        .attr('dy', '0.3em')
        .attr('fill', 'white')
        .attr('font-size', '12px')
        .attr('font-weight', 'bold');
      
      nodeGroups.append('text')
        .text(d => d.name)
        .attr('text-anchor', 'middle')
        .attr('dy', '2.5em')
        .attr('fill', '#D1D5DB')
        .attr('font-size', '10px')
        .style('text-transform', 'capitalize');
    }
  }, [viewMode, filteredTactics, tacticStats]);

  const handleTacticClick = (tacticId: string) => {
    if (interactive) {
      setSelectedTactic(selectedTactic === tacticId ? null : tacticId);
      setExpandedTactics(prev => {
        const next = new Set(prev);
        if (next.has(tacticId)) {
          next.delete(tacticId);
        } else {
          next.add(tacticId);
        }
        return next;
      });
    }
  };

  const getTacticIntensity = (tacticId: string) => {
    const stats = tacticStats[tacticId];
    if (!stats) return 0;
    
    const maxEvents = Math.max(...Object.values(tacticStats).map(s => s.eventCount));
    return maxEvents > 0 ? stats.eventCount / maxEvents : 0;
  };

  const getTacticSeverity = (tacticId: string): Severity => {
    const stats = tacticStats[tacticId];
    if (!stats) return 'LOW';
    
    if (stats.severityBreakdown.CRITICAL > 0) return 'CRITICAL';
    if (stats.severityBreakdown.HIGH > 0) return 'HIGH';
    if (stats.severityBreakdown.MEDIUM > 0) return 'MEDIUM';
    return 'LOW';
  };

  if (mitreLoading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
        </div>
      </Card>
    );
  }

  return (
    <Card className={`${className}`}>
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <Target className="w-5 h-5 mr-2" />
            MITRE ATT&CK Framework
          </h3>
          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === 'matrix' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('matrix')}
            >
              Matrix
            </Button>
            <Button
              variant={viewMode === 'flow' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('flow')}
            >
              Flow
            </Button>
            <Button
              variant={viewMode === 'heatmap' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('heatmap')}
            >
              Heatmap
            </Button>
          </div>
        </div>
        
        {/* Search and Filters */}
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search tactics and techniques..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            {Object.keys(SEVERITY_COLORS).map((severity) => (
              <Badge
                key={severity}
                variant={filterSeverity.includes(severity as Severity) ? "default" : "outline"}
                className={`cursor-pointer text-xs ${
                  filterSeverity.includes(severity as Severity) 
                    ? `bg-${severity.toLowerCase()}-500/20 text-${severity.toLowerCase()}-400 border-${severity.toLowerCase()}-500/30`
                    : ''
                }`}
                onClick={() => {
                  setFilterSeverity(prev => 
                    prev.includes(severity as Severity)
                      ? prev.filter(s => s !== severity)
                      : [...prev, severity as Severity]
                  );
                }}
              >
                {severity}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4">
        {viewMode === 'flow' && (
          <div className="mb-6" ref={containerRef}>
            <svg ref={svgRef} className="w-full" />
          </div>
        )}

        {viewMode === 'matrix' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {MITRE_TACTICS_ORDER.map((tacticId) => {
              const tactic = filteredTactics.find((t: MITRETactic) => 
                t.id.toLowerCase().replace(/[^a-z0-9]/g, '-') === tacticId
              );
              
              if (!tactic && !tacticStats[tacticId]) return null;
              
              const stats = tacticStats[tacticId];
              const intensity = getTacticIntensity(tacticId);
              const severity = getTacticSeverity(tacticId);
              const isExpanded = expandedTactics.has(tacticId);
              
              return (
                <motion.div
                  key={tacticId}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                    selectedTactic === tacticId
                      ? 'border-blue-500 bg-blue-500/10 shadow-md'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'
                  }`}
                  onClick={() => handleTacticClick(tacticId)}
                  style={{
                    backgroundColor: intensity > 0 
                      ? `${TACTIC_COLORS[tacticId as keyof typeof TACTIC_COLORS]}${Math.round(intensity * 30).toString(16).padStart(2, '0')}`
                      : undefined
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                      <Badge 
                        className={`text-xs ${
                          stats && stats.eventCount > 0
                            ? `bg-${severity.toLowerCase()}-500/20 text-${severity.toLowerCase()}-400 border-${severity.toLowerCase()}-500/30`
                            : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                        }`}
                        variant="outline"
                      >
                        {stats ? stats.eventCount : 0}
                      </Badge>
                    </div>
                    {tactic && (
                      <Tooltip content={tactic.description}>
                        <Info className="w-4 h-4 text-gray-400 hover:text-gray-300" />
                      </Tooltip>
                    )}
                  </div>
                  
                  <h4 className="font-medium text-white mb-1 capitalize">
                    {(tactic?.name || tacticId).replace(/-/g, ' ')}
                  </h4>
                  
                  {stats && stats.eventCount > 0 && (
                    <div className="text-xs text-gray-400 space-y-1">
                      <div className="flex justify-between">
                        <span>Critical:</span>
                        <span className="text-red-400">{stats.severityBreakdown.CRITICAL}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>High:</span>
                        <span className="text-orange-400">{stats.severityBreakdown.HIGH}</span>
                      </div>
                    </div>
                  )}

                  <AnimatePresence>
                    {isExpanded && tactic && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mt-4 pt-4 border-t border-gray-700 space-y-2"
                      >
                        {stats?.techniques.slice(0, 3).map((technique) => (
                          <div 
                            key={technique.techniqueId}
                            className="flex items-center justify-between text-xs"
                          >
                            <span className="text-gray-300 truncate">
                              {technique.techniqueName}
                            </span>
                            <Badge
                              className={`ml-2 text-xs ${
                                technique.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                                technique.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400' :
                                technique.severity === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-blue-500/20 text-blue-400'
                              }`}
                              variant="outline"
                            >
                              {technique.eventCount}
                            </Badge>
                          </div>
                        ))}
                        
                        {stats && stats.techniques.length > 3 && (
                          <div className="text-xs text-gray-400 text-center pt-2">
                            +{stats.techniques.length - 3} more techniques
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}

        {viewMode === 'heatmap' && (
          <div className="grid grid-cols-6 gap-1">
            {MITRE_TACTICS_ORDER.map((tacticId) => {
              const stats = tacticStats[tacticId];
              const intensity = getTacticIntensity(tacticId);
              const severity = getTacticSeverity(tacticId);
              
              return (
                <div
                  key={tacticId}
                  className={`aspect-square rounded p-2 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
                    selectedTactic === tacticId ? 'ring-2 ring-blue-500' : ''
                  }`}
                  style={{
                    backgroundColor: intensity > 0 
                      ? SEVERITY_COLORS[severity]
                      : '#374151',
                    opacity: intensity > 0 ? 0.3 + (intensity * 0.7) : 0.3
                  }}
                  onClick={() => handleTacticClick(tacticId)}
                >
                  <div className="text-xs font-medium text-white mb-1">
                    {stats ? stats.eventCount : 0}
                  </div>
                  <div className="text-xs text-white/80 leading-tight">
                    {tacticId.replace(/-/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase())}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {Object.keys(tacticStats).length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No MITRE ATT&CK data available for current events</p>
            <p className="text-sm mt-2">Events with MITRE mapping will appear here</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default MITREAttackVisualization;
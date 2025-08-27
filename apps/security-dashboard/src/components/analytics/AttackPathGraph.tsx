import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { motion } from 'framer-motion';
import { Target, Maximize2, Download, Filter, Search } from 'lucide-react';

// Components
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';

// Types
import { SecurityEvent, Severity } from '../../types/security';

interface AttackPathGraphProps {
  events: SecurityEvent[];
  className?: string;
}

interface GraphNode {
  id: string;
  type: 'asset' | 'technique' | 'actor' | 'indicator';
  label: string;
  severity: Severity;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
  eventCount: number;
  metadata: Record<string, any>;
}

interface GraphLink {
  source: string;
  target: string;
  type: 'uses' | 'targets' | 'indicates' | 'precedes';
  weight: number;
  timestamp: string;
}

interface ForceSimulation extends d3.Simulation<GraphNode, GraphLink> {}

const NODE_COLORS = {
  asset: '#3B82F6',
  technique: '#EF4444',
  actor: '#8B5CF6',
  indicator: '#F59E0B'
};

const NODE_TYPES = {
  asset: 'Assets',
  technique: 'Techniques',
  actor: 'Actors',
  indicator: 'Indicators'
};

const SEVERITY_SIZES = {
  CRITICAL: 12,
  HIGH: 10,
  MEDIUM: 8,
  LOW: 6
};

// Process events into graph data
const processEventsToGraph = (events: SecurityEvent[]) => {
  const nodes = new Map<string, GraphNode>();
  const links: GraphLink[] = [];
  
  events.forEach(event => {
    // Create asset node
    if (event.asset) {
      const assetId = `asset-${event.asset.id}`;
      if (!nodes.has(assetId)) {
        nodes.set(assetId, {
          id: assetId,
          type: 'asset',
          label: event.asset.name,
          severity: event.severity,
          eventCount: 0,
          metadata: {
            type: event.asset.type,
            environment: event.asset.environment,
            platform: event.asset.platform
          }
        });
      }
      nodes.get(assetId)!.eventCount++;
    }

    // Create technique nodes from MITRE mapping
    if (event.mitreAttackTactics) {
      event.mitreAttackTactics.forEach(tactic => {
        tactic.techniques?.forEach(technique => {
          const techniqueId = `technique-${technique.techniqueId}`;
          if (!nodes.has(techniqueId)) {
            nodes.set(techniqueId, {
              id: techniqueId,
              type: 'technique',
              label: technique.techniqueName,
              severity: event.severity,
              eventCount: 0,
              metadata: {
                tacticId: tactic.tacticId,
                tacticName: tactic.tacticName,
                techniqueId: technique.techniqueId
              }
            });
          }
          nodes.get(techniqueId)!.eventCount++;

          // Link technique to asset
          if (event.asset) {
            links.push({
              source: techniqueId,
              target: `asset-${event.asset.id}`,
              type: 'targets',
              weight: event.riskScore || 50,
              timestamp: event.timestamp
            });
          }
        });
      });
    }

    // Create indicator nodes
    if (event.indicators) {
      event.indicators.forEach(indicator => {
        const indicatorId = `indicator-${indicator.type}-${indicator.value.substring(0, 8)}`;
        if (!nodes.has(indicatorId)) {
          nodes.set(indicatorId, {
            id: indicatorId,
            type: 'indicator',
            label: `${indicator.type}: ${indicator.value.substring(0, 20)}...`,
            severity: event.severity,
            eventCount: 0,
            metadata: {
              type: indicator.type,
              value: indicator.value,
              confidence: indicator.confidence,
              source: indicator.source
            }
          });
        }
        nodes.get(indicatorId)!.eventCount++;

        // Link indicators to techniques
        if (event.mitreAttackTactics) {
          event.mitreAttackTactics.forEach(tactic => {
            tactic.techniques?.forEach(technique => {
              links.push({
                source: indicatorId,
                target: `technique-${technique.techniqueId}`,
                type: 'indicates',
                weight: indicator.confidence,
                timestamp: event.timestamp
              });
            });
          });
        }
      });
    }

    // Create actor nodes (simplified - based on geo location and threat patterns)
    if (event.geoLocation && event.threatLevel && ['HIGH', 'CRITICAL'].includes(event.threatLevel)) {
      const actorId = `actor-${event.geoLocation.country}-${event.source}`;
      if (!nodes.has(actorId)) {
        nodes.set(actorId, {
          id: actorId,
          type: 'actor',
          label: `${event.geoLocation.country} Actor`,
          severity: event.severity,
          eventCount: 0,
          metadata: {
            country: event.geoLocation.country,
            region: event.geoLocation.region,
            source: event.source
          }
        });
      }
      nodes.get(actorId)!.eventCount++;

      // Link actors to techniques
      if (event.mitreAttackTactics) {
        event.mitreAttackTactics.forEach(tactic => {
          tactic.techniques?.forEach(technique => {
            links.push({
              source: actorId,
              target: `technique-${technique.techniqueId}`,
              type: 'uses',
              weight: event.riskScore || 50,
              timestamp: event.timestamp
            });
          });
        });
      }
    }
  });

  return {
    nodes: Array.from(nodes.values()),
    links
  };
};

export const AttackPathGraph: React.FC<AttackPathGraphProps> = ({
  events,
  className = ''
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Process graph data
  const { nodes, links } = useMemo(() => processEventsToGraph(events), [events]);

  // Filter data
  const filteredData = useMemo(() => {
    let filteredNodes = nodes;
    let filteredLinks = links;

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filteredNodes = nodes.filter(node => 
        node.label.toLowerCase().includes(searchLower) ||
        Object.values(node.metadata).some(value => 
          String(value).toLowerCase().includes(searchLower)
        )
      );
      
      const nodeIds = new Set(filteredNodes.map(n => n.id));
      filteredLinks = links.filter(link => 
        nodeIds.has(link.source as string) && nodeIds.has(link.target as string)
      );
    }

    // Type filter
    if (filterType !== 'all') {
      filteredNodes = filteredNodes.filter(node => node.type === filterType);
      
      const nodeIds = new Set(filteredNodes.map(n => n.id));
      filteredLinks = filteredLinks.filter(link => 
        nodeIds.has(link.source as string) && nodeIds.has(link.target as string)
      );
    }

    return { nodes: filteredNodes, links: filteredLinks };
  }, [nodes, links, searchTerm, filterType]);

  // D3 Force Simulation
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    if (filteredData.nodes.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = isFullscreen ? window.innerHeight - 200 : 600;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    const g = svg.append('g');

    // Create arrow markers for directed links
    svg.append('defs').selectAll('marker')
      .data(['uses', 'targets', 'indicates', 'precedes'])
      .enter().append('marker')
      .attr('id', d => `arrow-${d}`)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 15)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#6B7280');

    // Force simulation
    const simulation = d3.forceSimulation(filteredData.nodes as d3.SimulationNodeDatum[])
      .force('link', d3.forceLink<GraphNode, GraphLink>(filteredData.links)
        .id(d => d.id)
        .distance(d => 100 - (d.weight / 2))
        .strength(0.3)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => SEVERITY_SIZES[d.severity as Severity] + 5));

    // Create links
    const link = g.append('g')
      .attr('stroke', '#6B7280')
      .attr('stroke-opacity', 0.6)
      .selectAll('line')
      .data(filteredData.links)
      .enter().append('line')
      .attr('stroke-width', d => Math.sqrt(d.weight / 10))
      .attr('marker-end', d => `url(#arrow-${d.type})`);

    // Create nodes
    const node = g.append('g')
      .selectAll('circle')
      .data(filteredData.nodes)
      .enter().append('circle')
      .attr('r', d => SEVERITY_SIZES[d.severity])
      .attr('fill', d => NODE_COLORS[d.type])
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        setSelectedNode(d);
        event.stopPropagation();
      })
      .on('mouseover', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', SEVERITY_SIZES[d.severity] * 1.5)
          .attr('stroke-width', 3);

        // Highlight connected links
        link.style('stroke-opacity', l => 
          l.source === d || l.target === d ? 1 : 0.1
        );
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', SEVERITY_SIZES[d.severity])
          .attr('stroke-width', 2);

        // Reset link opacity
        link.style('stroke-opacity', 0.6);
      });

    // Add drag behavior
    const drag = d3.drag<SVGCircleElement, GraphNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    node.call(drag);

    // Add labels
    const labels = g.append('g')
      .selectAll('text')
      .data(filteredData.nodes)
      .enter().append('text')
      .text(d => d.label)
      .attr('font-size', 10)
      .attr('dx', 12)
      .attr('dy', 4)
      .attr('fill', '#D1D5DB')
      .style('pointer-events', 'none');

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x!)
        .attr('y1', d => (d.source as GraphNode).y!)
        .attr('x2', d => (d.target as GraphNode).x!)
        .attr('y2', d => (d.target as GraphNode).y!);

      node
        .attr('cx', d => d.x!)
        .attr('cy', d => d.y!);

      labels
        .attr('x', d => d.x!)
        .attr('y', d => d.y!);
    });

    // Clear selection on background click
    svg.on('click', () => {
      setSelectedNode(null);
    });

  }, [filteredData, isFullscreen]);

  // Node type statistics
  const nodeStats = useMemo(() => {
    const stats = filteredData.nodes.reduce((acc, node) => {
      acc[node.type] = (acc[node.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(stats).map(([type, count]) => ({
      type: type as keyof typeof NODE_TYPES,
      count,
      color: NODE_COLORS[type as keyof typeof NODE_COLORS]
    }));
  }, [filteredData.nodes]);

  return (
    <div className={`${className} ${isFullscreen ? 'fixed inset-4 z-50 bg-gray-900' : ''}`}>
      <Card className=\"h-full\">
        <div className=\"p-4 border-b border-gray-700\">
          <div className=\"flex items-center justify-between mb-4\">
            <h3 className=\"text-lg font-semibold text-white flex items-center\">
              <Target className=\"w-5 h-5 mr-2\" />
              Attack Path Analysis
            </h3>
            <div className=\"flex items-center space-x-2\">
              <Button
                variant=\"outline\"
                size=\"sm\"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                <Maximize2 className=\"w-4 h-4\" />
              </Button>
              <Button variant=\"outline\" size=\"sm\">
                <Download className=\"w-4 h-4\" />
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className=\"grid grid-cols-1 md:grid-cols-3 gap-4\">
            <div className=\"relative\">
              <Search className=\"absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400\" />
              <Input
                placeholder=\"Search nodes...\"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className=\"pl-10\"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className=\"px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm\"
            >
              <option value=\"all\">All Types</option>
              {Object.entries(NODE_TYPES).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>

            <div className=\"flex items-center space-x-2\">
              <span className=\"text-sm text-gray-400\">Nodes:</span>
              <span className=\"text-sm text-white font-medium\">{filteredData.nodes.length}</span>
              <span className=\"text-sm text-gray-400\">Links:</span>
              <span className=\"text-sm text-white font-medium\">{filteredData.links.length}</span>
            </div>
          </div>
        </div>

        <div className=\"flex h-full\">
          {/* Graph Visualization */}
          <div className=\"flex-1\" ref={containerRef}>
            <svg
              ref={svgRef}
              className=\"w-full h-full\"
              style={{ height: isFullscreen ? 'calc(100vh - 200px)' : '600px' }}
            />

            {filteredData.nodes.length === 0 && (
              <div className=\"absolute inset-0 flex items-center justify-center\">
                <div className=\"text-center text-gray-400\">
                  <Target className=\"w-12 h-12 mx-auto mb-4 opacity-50\" />
                  <p>No attack paths to display</p>
                  <p className=\"text-sm mt-2\">
                    {searchTerm || filterType !== 'all'
                      ? 'Adjust your filters to see results'
                      : 'Attack paths will appear as events are analyzed'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Side Panel */}
          <div className=\"w-80 border-l border-gray-700 p-4 overflow-y-auto\">
            {/* Legend */}
            <div className=\"mb-6\">
              <h4 className=\"text-sm font-semibold text-white mb-3\">Node Types</h4>
              <div className=\"space-y-2\">
                {nodeStats.map(({ type, count, color }) => (
                  <div key={type} className=\"flex items-center justify-between\">
                    <div className=\"flex items-center space-x-2\">
                      <div 
                        className=\"w-3 h-3 rounded-full\" 
                        style={{ backgroundColor: color }}
                      />
                      <span className=\"text-sm text-gray-300\">{NODE_TYPES[type]}</span>
                    </div>
                    <span className=\"text-sm text-white font-medium\">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Node Details */}
            {selectedNode ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className=\"space-y-4\"
              >
                <div className=\"border-b border-gray-700 pb-4\">
                  <h4 className=\"text-sm font-semibold text-white mb-2\">Selected Node</h4>
                  <div className=\"space-y-2\">
                    <div className=\"flex items-center space-x-2\">
                      <div 
                        className=\"w-3 h-3 rounded-full\" 
                        style={{ backgroundColor: NODE_COLORS[selectedNode.type] }}
                      />
                      <Badge variant=\"outline\">{selectedNode.type}</Badge>
                    </div>
                    <p className=\"text-sm text-white font-medium\">{selectedNode.label}</p>
                    <div className=\"text-xs text-gray-400 space-y-1\">
                      <div>Events: {selectedNode.eventCount}</div>
                      <div>Severity: {selectedNode.severity}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h5 className=\"text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide\">
                    Metadata
                  </h5>
                  <div className=\"space-y-1 text-xs\">
                    {Object.entries(selectedNode.metadata).map(([key, value]) => (
                      <div key={key} className=\"flex justify-between\">
                        <span className=\"text-gray-400\">{key}:</span>
                        <span className=\"text-gray-300\">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className=\"text-center py-8 text-gray-400\">
                <p className=\"text-sm\">Click on a node to view details</p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AttackPathGraph;
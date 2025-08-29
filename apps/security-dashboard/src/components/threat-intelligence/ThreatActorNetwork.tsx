import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useQuery } from '@apollo/client';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Target,
  Globe,
  Shield,
  Activity,
  Search,
  Filter,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Info,
  ExternalLink,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';

// GraphQL Operations
import { GET_THREAT_ACTORS } from '../../graphql/threat-intelligence-operations';

// Components
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';
import { Tooltip } from '../ui/Tooltip';

// Types
interface ThreatActorNetworkProps {
  organizationId: string;
  data?: any;
  className?: string;
}

interface NetworkNode {
  id: string;
  type: 'actor' | 'campaign' | 'technique' | 'country' | 'sector';
  name: string;
  group: string;
  size: number;
  color: string;
  data: any;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface NetworkLink {
  source: string | NetworkNode;
  target: string | NetworkNode;
  type: 'operates' | 'targets' | 'uses' | 'attributed_to' | 'related_to';
  strength: number;
  data?: any;
}

interface NetworkData {
  nodes: NetworkNode[];
  links: NetworkLink[];
}

const ACTOR_SOPHISTICATION_COLORS = {
  MINIMAL: '#6b7280',
  INTERMEDIATE: '#3b82f6',
  ADVANCED: '#f59e0b',
  EXPERT: '#ef4444',
  INNOVATOR: '#8b5cf6',
  STRATEGIC: '#ec4899'
};

const NODE_COLORS = {
  actor: '#3b82f6',
  campaign: '#f59e0b',
  technique: '#10b981',
  country: '#ef4444',
  sector: '#8b5cf6'
};

export const ThreatActorNetwork: React.FC<ThreatActorNetworkProps> = ({
  organizationId,
  data,
  className = ''
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<NetworkNode, NetworkLink> | null>(null);
  
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSophistication, setFilterSophistication] = useState<string>('all');
  const [showInactive, setShowInactive] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Fetch threat actors data
  const {
    data: actorsData,
    loading: actorsLoading,
    error: actorsError,
    refetch: refetchActors
  } = useQuery(GET_THREAT_ACTORS, {
    variables: {
      filter: {
        isActive: showInactive ? undefined : true
      },
      first: 100
    },
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all'
  });

  // Process data for network visualization
  const networkData: NetworkData = useMemo(() => {
    if (!actorsData?.threatActors?.edges) {
      return { nodes: [], links: [] };
    }

    const actors = actorsData.threatActors.edges.map((edge: any) => edge.node);
    const nodes: NetworkNode[] = [];
    const links: NetworkLink[] = [];
    const nodeMap = new Map<string, NetworkNode>();

    // Create actor nodes
    actors.forEach((actor: any) => {
      if (filterType !== 'all' && actor.actorType !== filterType) return;
      if (filterSophistication !== 'all' && actor.sophistication !== filterSophistication) return;
      if (searchTerm && !actor.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !actor.aliases.some((alias: string) => alias.toLowerCase().includes(searchTerm.toLowerCase()))) return;

      const node: NetworkNode = {
        id: actor.id,
        type: 'actor',
        name: actor.name,
        group: actor.actorType,
        size: Math.max(10, Math.min(30, (actor.campaigns?.length || 0) * 5 + 10)),
        color: ACTOR_SOPHISTICATION_COLORS[actor.sophistication as keyof typeof ACTOR_SOPHISTICATION_COLORS] || NODE_COLORS.actor,
        data: actor
      };
      
      nodes.push(node);
      nodeMap.set(actor.id, node);
    });

    // Add campaign nodes and links
    actors.forEach((actor: any) => {
      const actorNode = nodeMap.get(actor.id);
      if (!actorNode) return;

      actor.campaigns?.forEach((campaign: any) => {
        let campaignNode = nodeMap.get(campaign.id);
        
        if (!campaignNode) {
          campaignNode = {
            id: campaign.id,
            type: 'campaign',
            name: campaign.name,
            group: campaign.status,
            size: 15,
            color: NODE_COLORS.campaign,
            data: campaign
          };
          nodes.push(campaignNode);
          nodeMap.set(campaign.id, campaignNode);
        }

        // Link actor to campaign
        links.push({
          source: actor.id,
          target: campaign.id,
          type: 'operates',
          strength: campaign.isActive ? 2 : 1
        });
      });

      // Add country nodes and links
      actor.countries?.forEach((country: string) => {
        let countryNode = nodeMap.get(`country-${country}`);
        
        if (!countryNode) {
          countryNode = {
            id: `country-${country}`,
            type: 'country',
            name: country,
            group: 'location',
            size: 12,
            color: NODE_COLORS.country,
            data: { country, type: 'location' }
          };
          nodes.push(countryNode);
          nodeMap.set(`country-${country}`, countryNode);
        }

        // Link actor to country
        links.push({
          source: actor.id,
          target: `country-${country}`,
          type: 'attributed_to',
          strength: 1
        });
      });

      // Add targeted sector nodes and links
      actor.targetedSectors?.forEach((sector: string) => {
        let sectorNode = nodeMap.get(`sector-${sector}`);
        
        if (!sectorNode) {
          sectorNode = {
            id: `sector-${sector}`,
            type: 'sector',
            name: sector,
            group: 'target',
            size: 12,
            color: NODE_COLORS.sector,
            data: { sector, type: 'target' }
          };
          nodes.push(sectorNode);
          nodeMap.set(`sector-${sector}`, sectorNode);
        }

        // Link actor to sector
        links.push({
          source: actor.id,
          target: `sector-${sector}`,
          type: 'targets',
          strength: 1
        });
      });
    });

    // Add relationships between actors
    actors.forEach((actor: any) => {
      const actorNode = nodeMap.get(actor.id);
      if (!actorNode) return;

      // Find related actors through shared campaigns
      const relatedActors = new Set<string>();
      actor.campaigns?.forEach((campaign: any) => {
        actors.forEach((otherActor: any) => {
          if (otherActor.id !== actor.id) {
            const hasSharedCampaign = otherActor.campaigns?.some((c: any) => c.id === campaign.id);
            if (hasSharedCampaign) {
              relatedActors.add(otherActor.id);
            }
          }
        });
      });

      // Create links between related actors
      relatedActors.forEach(relatedId => {
        const relatedNode = nodeMap.get(relatedId);
        if (relatedNode) {
          links.push({
            source: actor.id,
            target: relatedId,
            type: 'related_to',
            strength: 0.5
          });
        }
      });
    });

    return { nodes, links };
  }, [actorsData, filterType, filterSophistication, searchTerm, showInactive]);

  // Initialize D3 force simulation
  useEffect(() => {
    if (!svgRef.current || networkData.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
        setZoomLevel(event.transform.k);
      });

    svg.call(zoom);

    // Create container for zoomable content
    const container = svg.append('g').attr('class', 'zoom-container');

    // Create simulation
    const simulation = d3.forceSimulation<NetworkNode>(networkData.nodes)
      .force('link', d3.forceLink<NetworkNode, NetworkLink>(networkData.links)
        .id(d => d.id)
        .distance(d => {
          const linkStrength = typeof d.strength === 'number' ? d.strength : 1;
          return 50 + (100 / linkStrength);
        })
        .strength(d => {
          const linkStrength = typeof d.strength === 'number' ? d.strength : 1;
          return 0.1 * linkStrength;
        })
      )
      .force('charge', d3.forceManyBody()
        .strength(d => -300 - (d.size * 10))
      )
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<NetworkNode>()
        .radius(d => d.size + 5)
      );

    simulationRef.current = simulation;

    // Create link elements
    const links = container.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(networkData.links)
      .enter().append('line')
      .attr('stroke', '#4b5563')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => {
        const linkStrength = typeof d.strength === 'number' ? d.strength : 1;
        return Math.sqrt(linkStrength) * 2;
      })
      .attr('stroke-dasharray', d => {
        return d.type === 'related_to' ? '3,3' : null;
      });

    // Create node elements
    const nodes = container.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(networkData.nodes)
      .enter().append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(d3.drag<SVGGElement, NetworkNode>()
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
        })
      );

    // Add circles to nodes
    nodes.append('circle')
      .attr('r', d => d.size)
      .attr('fill', d => d.color)
      .attr('stroke', '#374151')
      .attr('stroke-width', 2);

    // Add labels to nodes
    nodes.append('text')
      .text(d => d.name)
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('fill', '#ffffff')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .style('pointer-events', 'none')
      .style('user-select', 'none');

    // Add node interaction
    nodes.on('click', (event, d) => {
      setSelectedNode(d);
      event.stopPropagation();
    });

    // Add hover effects
    nodes.on('mouseover', function(event, d) {
      d3.select(this).select('circle')
        .transition()
        .duration(200)
        .attr('stroke-width', 4)
        .attr('r', d.size + 2);
    }).on('mouseout', function(event, d) {
      d3.select(this).select('circle')
        .transition()
        .duration(200)
        .attr('stroke-width', 2)
        .attr('r', d.size);
    });

    // Update positions on simulation tick
    simulation.on('tick', () => {
      links
        .attr('x1', d => (d.source as NetworkNode).x!)
        .attr('y1', d => (d.source as NetworkNode).y!)
        .attr('x2', d => (d.target as NetworkNode).x!)
        .attr('y2', d => (d.target as NetworkNode).y!);

      nodes.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Click on empty space to deselect
    svg.on('click', () => {
      setSelectedNode(null);
    });

    return () => {
      simulation.stop();
    };
  }, [networkData, dimensions]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const container = svgRef.current?.parentElement;
      if (container) {
        setDimensions({
          width: container.clientWidth,
          height: Math.min(600, container.clientHeight)
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Zoom controls
  const handleZoom = useCallback((direction: 'in' | 'out' | 'reset') => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const zoom = d3.zoom<SVGSVGElement, unknown>();

    if (direction === 'reset') {
      svg.transition().duration(750).call(
        zoom.transform,
        d3.zoomIdentity
      );
      setZoomLevel(1);
    } else {
      const scaleFactor = direction === 'in' ? 1.5 : 0.67;
      svg.transition().duration(300).call(
        zoom.scaleBy,
        scaleFactor
      );
    }
  }, []);

  // Export network as SVG
  const exportNetwork = useCallback(() => {
    if (!svgRef.current) return;

    const svgElement = svgRef.current;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElement);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'threat-actor-network.svg';
    link.click();
    
    URL.revokeObjectURL(url);
  }, []);

  if (actorsError) {
    return (
      <Card className={`p-6 ${className}`}>
        <ErrorMessage
          title="Failed to Load Threat Actor Network"
          message={actorsError.message}
          onRetry={() => refetchActors()}
        />
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header and Controls */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Threat Actor Network
          </h2>
          
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-sm">
              {networkData.nodes.filter(n => n.type === 'actor').length} actors
            </Badge>
            <Badge variant="outline" className="text-sm">
              {networkData.links.length} connections
            </Badge>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search actors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
          >
            <option value="all">All Types</option>
            <option value="INDIVIDUAL">Individual</option>
            <option value="GROUP">Group</option>
            <option value="ORGANIZATION">Organization</option>
            <option value="NATION_STATE">Nation State</option>
            <option value="UNKNOWN">Unknown</option>
          </select>

          {/* Sophistication Filter */}
          <select
            value={filterSophistication}
            onChange={(e) => setFilterSophistication(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
          >
            <option value="all">All Levels</option>
            <option value="MINIMAL">Minimal</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
            <option value="EXPERT">Expert</option>
            <option value="INNOVATOR">Innovator</option>
            <option value="STRATEGIC">Strategic</option>
          </select>

          {/* Status Toggle */}
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            <span className="text-sm text-white">Show Inactive</span>
          </label>
        </div>

        {/* Network Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => handleZoom('in')}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleZoom('out')}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleZoom('reset')}>
              <RotateCcw className="w-4 h-4" />
            </Button>
            <span className="text-sm text-gray-400">
              Zoom: {Math.round(zoomLevel * 100)}%
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={exportNetwork}>
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetchActors()}>
              <Activity className="w-4 h-4 mr-1" />
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      {/* Main Network Visualization */}
      <div className="grid grid-cols-12 gap-6">
        {/* Network Canvas */}
        <div className="col-span-8">
          <Card className="p-2 h-fit">
            {actorsLoading ? (
              <div className="flex items-center justify-center h-96">
                <LoadingSpinner size="lg" />
                <span className="ml-4 text-gray-400">Loading network data...</span>
              </div>
            ) : networkData.nodes.length > 0 ? (
              <div className="relative">
                <svg
                  ref={svgRef}
                  width={dimensions.width}
                  height={dimensions.height}
                  className="border border-gray-700 rounded"
                />
                
                {/* Legend */}
                <div className="absolute top-4 left-4 p-3 bg-gray-900/90 rounded border border-gray-700">
                  <h4 className="text-sm font-semibold text-white mb-2">Legend</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLORS.actor }} />
                      <span className="text-gray-300">Threat Actors</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLORS.campaign }} />
                      <span className="text-gray-300">Campaigns</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLORS.country }} />
                      <span className="text-gray-300">Countries</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLORS.sector }} />
                      <span className="text-gray-300">Target Sectors</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-96 text-gray-400">
                <div className="text-center">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No threat actors found</p>
                  <p className="text-sm mt-2">
                    {searchTerm || filterType !== 'all' || filterSophistication !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Threat actors will appear here when detected'}
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Node Details Panel */}
        <div className="col-span-4">
          <Card className="p-4 h-fit">
            <h3 className="text-lg font-semibold text-white mb-4">
              {selectedNode ? 'Node Details' : 'Select a Node'}
            </h3>
            
            {selectedNode ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                {/* Node Header */}
                <div className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: selectedNode.color }}
                  />
                  <div>
                    <h4 className="font-semibold text-white">{selectedNode.name}</h4>
                    <Badge variant="outline" className="text-xs mt-1">
                      {selectedNode.type.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                {/* Node-specific details */}
                {selectedNode.type === 'actor' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-300">Aliases</label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedNode.data.aliases?.slice(0, 3).map((alias: string) => (
                          <Badge key={alias} variant="outline" className="text-xs">
                            {alias}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-xs font-semibold text-gray-300">Type</label>
                      <p className="text-sm text-white">{selectedNode.data.actorType}</p>
                    </div>
                    
                    <div>
                      <label className="text-xs font-semibold text-gray-300">Sophistication</label>
                      <Badge
                        variant="outline"
                        className="text-xs"
                        style={{ 
                          color: selectedNode.color,
                          borderColor: selectedNode.color + '40',
                          backgroundColor: selectedNode.color + '10'
                        }}
                      >
                        {selectedNode.data.sophistication}
                      </Badge>
                    </div>
                    
                    <div>
                      <label className="text-xs font-semibold text-gray-300">Status</label>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          selectedNode.data.isActive 
                            ? 'text-green-400 bg-green-500/10 border-green-500/20'
                            : 'text-red-400 bg-red-500/10 border-red-500/20'
                        }`}
                      >
                        {selectedNode.data.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-300">Motivations</label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedNode.data.motivations?.slice(0, 3).map((motivation: string) => (
                          <Badge key={motivation} variant="outline" className="text-xs">
                            {motivation.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-300">First/Last Seen</label>
                      <p className="text-sm text-gray-400">
                        {new Date(selectedNode.data.firstSeen).toLocaleDateString()} - {' '}
                        {new Date(selectedNode.data.lastSeen).toLocaleDateString()}
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-300">Targeted Sectors</label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedNode.data.targetedSectors?.slice(0, 3).map((sector: string) => (
                          <Badge key={sector} variant="outline" className="text-xs">
                            {sector}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {selectedNode.type === 'campaign' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-300">Status</label>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          selectedNode.data.isActive 
                            ? 'text-green-400 bg-green-500/10 border-green-500/20'
                            : 'text-gray-400 bg-gray-500/10 border-gray-500/20'
                        }`}
                      >
                        {selectedNode.data.status}
                      </Badge>
                    </div>
                    
                    <div>
                      <label className="text-xs font-semibold text-gray-300">Duration</label>
                      <p className="text-sm text-gray-400">
                        {new Date(selectedNode.data.startDate).toLocaleDateString()}
                        {selectedNode.data.endDate && ` - ${new Date(selectedNode.data.endDate).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Info className="w-4 h-4 mr-1" />
                    Details
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Report
                  </Button>
                </div>
              </motion.div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Click on a node to view details</p>
                <p className="text-sm mt-2">
                  Explore the threat actor network by clicking on actors, campaigns, or other entities
                </p>
              </div>
            )}
          </Card>

          {/* Network Statistics */}
          <Card className="p-4 mt-4">
            <h3 className="text-lg font-semibold text-white mb-4">Network Statistics</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-300">Total Nodes</span>
                <Badge variant="outline" className="text-xs">
                  {networkData.nodes.length}
                </Badge>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-300">Total Links</span>
                <Badge variant="outline" className="text-xs">
                  {networkData.links.length}
                </Badge>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-300">Threat Actors</span>
                <Badge variant="outline" className="text-xs">
                  {networkData.nodes.filter(n => n.type === 'actor').length}
                </Badge>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-300">Active Campaigns</span>
                <Badge variant="outline" className="text-xs">
                  {networkData.nodes.filter(n => n.type === 'campaign' && n.data?.isActive).length}
                </Badge>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-300">Countries</span>
                <Badge variant="outline" className="text-xs">
                  {networkData.nodes.filter(n => n.type === 'country').length}
                </Badge>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-300">Target Sectors</span>
                <Badge variant="outline" className="text-xs">
                  {networkData.nodes.filter(n => n.type === 'sector').length}
                </Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ThreatActorNetwork;
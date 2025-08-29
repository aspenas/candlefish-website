import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe,
  MapPin,
  Activity,
  TrendingUp,
  Filter,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Search,
  Users,
  Target,
  AlertTriangle,
  Info
} from 'lucide-react';

// GraphQL Operations
import { useThreatLandscape } from '../../hooks/useThreatIntelligence';

// Components
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';
import { Tooltip } from '../ui/Tooltip';

// Types
interface GeographicThreatMapProps {
  organizationId: string;
  data?: any;
  className?: string;
}

interface ThreatLocation {
  country: string;
  countryCode: string;
  region: string;
  threatCount: number;
  actorCount: number;
  campaignCount: number;
  riskScore: number;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  threats: Array<{
    id: string;
    title: string;
    severity: string;
    confidence: string;
    type: string;
  }>;
}

interface MapProjection {
  scale: number;
  translate: [number, number];
  rotate: [number, number];
}

// World map topology (simplified)
const WORLD_TOPOLOGY = {
  // This would typically be loaded from a topojson file
  // For demo purposes, we'll use a simplified approach
  countries: [] as any[]
};

const THREAT_COLORS = {
  LOW: '#22c55e',
  MEDIUM: '#eab308',
  HIGH: '#f97316',
  CRITICAL: '#ef4444'
};

const RISK_LEVELS = {
  0: { color: '#6b7280', label: 'No Data' },
  1: { color: '#22c55e', label: 'Low Risk' },
  2: { color: '#84cc16', label: 'Medium-Low Risk' },
  3: { color: '#eab308', label: 'Medium Risk' },
  4: { color: '#f97316', label: 'High Risk' },
  5: { color: '#ef4444', label: 'Critical Risk' }
};

export const GeographicThreatMap: React.FC<GeographicThreatMapProps> = ({
  organizationId,
  data,
  className = ''
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  const [selectedCountry, setSelectedCountry] = useState<ThreatLocation | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<ThreatLocation | null>(null);
  const [viewMode, setViewMode] = useState<'heatmap' | 'points' | 'both'>('heatmap');
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [timeRange, setTimeRange] = useState({ start: '30d', end: 'now' });
  const [projection, setProjection] = useState<MapProjection>({
    scale: 150,
    translate: [400, 300],
    rotate: [0, 0]
  });
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  // Fetch threat landscape data
  const {
    data: landscapeData,
    loading: landscapeLoading,
    error: landscapeError,
    refetch: refetchLandscape
  } = useThreatLandscape(organizationId, selectedSector !== 'all' ? selectedSector : undefined, selectedRegion !== 'all' ? selectedRegion : undefined, timeRange);

  // Process threat data for geographic visualization
  const threatLocations: ThreatLocation[] = useMemo(() => {
    if (!landscapeData?.threatLandscape?.heatmapData) return [];

    return landscapeData.threatLandscape.heatmapData.map((item: any) => ({
      country: item.country,
      countryCode: item.country.substring(0, 2).toUpperCase(), // Simplified
      region: item.region,
      threatCount: item.threatLevel || 0,
      actorCount: item.actorCount || 0,
      campaignCount: item.campaignCount || 0,
      riskScore: Math.min(5, Math.floor(item.riskScore / 20)), // Convert to 0-5 scale
      coordinates: item.coordinates || { latitude: 0, longitude: 0 },
      threats: [] // Would be populated from the threats data
    }));
  }, [landscapeData]);

  // Get risk level for a location
  const getRiskLevel = (riskScore: number) => {
    return RISK_LEVELS[riskScore as keyof typeof RISK_LEVELS] || RISK_LEVELS[0];
  };

  // Initialize D3 map
  useEffect(() => {
    if (!svgRef.current || threatLocations.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;

    // Create map projection
    const mapProjection = d3.geoNaturalEarth1()
      .scale(projection.scale)
      .translate(projection.translate)
      .rotate(projection.rotate);

    const path = d3.geoPath().projection(mapProjection);

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 8])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
        setProjection(prev => ({
          ...prev,
          scale: event.transform.k * 150
        }));
      });

    svg.call(zoom);

    // Create container for zoomable content
    const container = svg.append('g').attr('class', 'map-container');

    // Add ocean background
    container.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', '#0f172a');

    // Add graticule (grid lines)
    const graticule = d3.geoGraticule();
    container.append('path')
      .datum(graticule)
      .attr('d', path)
      .attr('fill', 'none')
      .attr('stroke', '#374151')
      .attr('stroke-width', 0.5)
      .attr('opacity', 0.3);

    // Create a simple world map using rectangles for demonstration
    // In a real implementation, you would load and render actual geographic data
    const countries = container.append('g').attr('class', 'countries');
    
    // Generate simplified country representations
    threatLocations.forEach((location) => {
      const [x, y] = mapProjection([location.coordinates.longitude, location.coordinates.latitude]) || [0, 0];
      const riskLevel = getRiskLevel(location.riskScore);

      // Country circle representation
      countries.append('circle')
        .attr('cx', x)
        .attr('cy', y)
        .attr('r', Math.max(3, Math.sqrt(location.threatCount) * 2))
        .attr('fill', riskLevel.color)
        .attr('stroke', '#374151')
        .attr('stroke-width', 1)
        .attr('opacity', 0.8)
        .style('cursor', 'pointer')
        .on('mouseover', (event) => {
          setHoveredCountry(location);
          if (tooltipRef.current) {
            const tooltip = d3.select(tooltipRef.current);
            tooltip.style('display', 'block')
              .style('left', (event.pageX + 10) + 'px')
              .style('top', (event.pageY - 10) + 'px');
          }
        })
        .on('mouseout', () => {
          setHoveredCountry(null);
          if (tooltipRef.current) {
            d3.select(tooltipRef.current).style('display', 'none');
          }
        })
        .on('click', () => {
          setSelectedCountry(location);
        });

      // Add threat count labels for significant locations
      if (location.threatCount > 10) {
        countries.append('text')
          .attr('x', x)
          .attr('y', y + 4)
          .attr('text-anchor', 'middle')
          .attr('font-size', '10px')
          .attr('font-weight', 'bold')
          .attr('fill', '#ffffff')
          .attr('stroke', '#000000')
          .attr('stroke-width', 0.5)
          .style('pointer-events', 'none')
          .text(location.threatCount);
      }
    });

    // Add threat connections (lines between related locations)
    if (viewMode === 'both' || viewMode === 'points') {
      const connections = container.append('g').attr('class', 'connections');
      
      // Create connections between high-threat locations
      const highThreatLocations = threatLocations.filter(l => l.threatCount > 5);
      for (let i = 0; i < highThreatLocations.length - 1; i++) {
        for (let j = i + 1; j < highThreatLocations.length; j++) {
          const source = highThreatLocations[i];
          const target = highThreatLocations[j];
          
          const [x1, y1] = mapProjection([source.coordinates.longitude, source.coordinates.latitude]) || [0, 0];
          const [x2, y2] = mapProjection([target.coordinates.longitude, target.coordinates.latitude]) || [0, 0];

          // Only draw connections for nearby locations or high-activity pairs
          const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
          if (distance < 200 && (source.actorCount > 0 && target.actorCount > 0)) {
            connections.append('line')
              .attr('x1', x1)
              .attr('y1', y1)
              .attr('x2', x2)
              .attr('y2', y2)
              .attr('stroke', '#60a5fa')
              .attr('stroke-width', 1)
              .attr('opacity', 0.3)
              .attr('stroke-dasharray', '2,2');
          }
        }
      }
    }

    // Add legend
    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(20, ${height - 150})`);

    legend.append('rect')
      .attr('width', 140)
      .attr('height', 120)
      .attr('fill', '#1f2937')
      .attr('stroke', '#374151')
      .attr('rx', 4);

    legend.append('text')
      .attr('x', 10)
      .attr('y', 20)
      .attr('fill', '#ffffff')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .text('Threat Risk Levels');

    Object.entries(RISK_LEVELS).forEach(([level, info], index) => {
      const y = 35 + (index * 15);
      
      legend.append('circle')
        .attr('cx', 20)
        .attr('cy', y)
        .attr('r', 6)
        .attr('fill', info.color);

      legend.append('text')
        .attr('x', 35)
        .attr('y', y + 4)
        .attr('fill', '#d1d5db')
        .attr('font-size', '10px')
        .text(info.label);
    });

    return () => {
      svg.selectAll('*').remove();
    };
  }, [threatLocations, dimensions, projection, viewMode]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const container = svgRef.current?.parentElement;
      if (container) {
        setDimensions({
          width: container.clientWidth,
          height: Math.min(500, container.clientHeight)
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Zoom controls
  const handleZoom = (direction: 'in' | 'out' | 'reset') => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const zoom = d3.zoom<SVGSVGElement, unknown>();

    if (direction === 'reset') {
      svg.transition().duration(750).call(
        zoom.transform,
        d3.zoomIdentity
      );
      setProjection({
        scale: 150,
        translate: [400, 300],
        rotate: [0, 0]
      });
    } else {
      const scaleFactor = direction === 'in' ? 1.5 : 0.67;
      svg.transition().duration(300).call(
        zoom.scaleBy,
        scaleFactor
      );
    }
  };

  // Export map
  const exportMap = () => {
    if (!svgRef.current) return;

    const svgElement = svgRef.current;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElement);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'threat-map.svg';
    link.click();
    
    URL.revokeObjectURL(url);
  };

  if (landscapeError) {
    return (
      <Card className={`p-6 ${className}`}>
        <ErrorMessage
          title="Failed to Load Geographic Threat Data"
          message={landscapeError.message}
          onRetry={() => refetchLandscape()}
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
            <Globe className="w-5 h-5 mr-2" />
            Geographic Threat Map
          </h2>
          
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-sm">
              {threatLocations.length} locations
            </Badge>
            <Badge variant="outline" className="text-sm">
              {threatLocations.reduce((sum, loc) => sum + loc.threatCount, 0)} threats
            </Badge>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* Sector Filter */}
          <select
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
          >
            <option value="all">All Sectors</option>
            <option value="FINANCIAL">Financial</option>
            <option value="HEALTHCARE">Healthcare</option>
            <option value="GOVERNMENT">Government</option>
            <option value="TECHNOLOGY">Technology</option>
            <option value="ENERGY">Energy</option>
            <option value="EDUCATION">Education</option>
          </select>

          {/* Region Filter */}
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
          >
            <option value="all">All Regions</option>
            <option value="North America">North America</option>
            <option value="Europe">Europe</option>
            <option value="Asia">Asia</option>
            <option value="South America">South America</option>
            <option value="Africa">Africa</option>
            <option value="Oceania">Oceania</option>
          </select>

          {/* View Mode */}
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as 'heatmap' | 'points' | 'both')}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
          >
            <option value="heatmap">Heatmap</option>
            <option value="points">Points</option>
            <option value="both">Both</option>
          </select>

          {/* Time Range */}
          <select
            value={`${timeRange.start}-${timeRange.end}`}
            onChange={(e) => {
              const [start, end] = e.target.value.split('-');
              setTimeRange({ start, end });
            }}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
          >
            <option value="24h-now">Last 24 Hours</option>
            <option value="7d-now">Last 7 Days</option>
            <option value="30d-now">Last 30 Days</option>
            <option value="90d-now">Last 90 Days</option>
          </select>
        </div>

        {/* Map Controls */}
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
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={exportMap}>
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetchLandscape()}>
              <Activity className="w-4 h-4 mr-1" />
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      {/* Main Map */}
      <div className="grid grid-cols-12 gap-6">
        {/* Map Canvas */}
        <div className="col-span-9">
          <Card className="p-2">
            {landscapeLoading ? (
              <div className="flex items-center justify-center h-96">
                <LoadingSpinner size="lg" />
                <span className="ml-4 text-gray-400">Loading threat map...</span>
              </div>
            ) : (
              <div className="relative">
                <svg
                  ref={svgRef}
                  width={dimensions.width}
                  height={dimensions.height}
                  className="border border-gray-700 rounded bg-slate-900"
                />
                
                {/* Tooltip */}
                <div
                  ref={tooltipRef}
                  className="absolute bg-gray-900 border border-gray-700 rounded p-3 text-sm text-white shadow-lg pointer-events-none z-10"
                  style={{ display: 'none' }}
                >
                  {hoveredCountry && (
                    <div>
                      <h4 className="font-semibold">{hoveredCountry.country}</h4>
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between">
                          <span>Threats:</span>
                          <Badge variant="outline" className="text-xs">
                            {hoveredCountry.threatCount}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Actors:</span>
                          <Badge variant="outline" className="text-xs">
                            {hoveredCountry.actorCount}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Campaigns:</span>
                          <Badge variant="outline" className="text-xs">
                            {hoveredCountry.campaignCount}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Risk Level:</span>
                          <Badge
                            variant="outline"
                            className="text-xs"
                            style={{ 
                              color: getRiskLevel(hoveredCountry.riskScore).color,
                              borderColor: getRiskLevel(hoveredCountry.riskScore).color + '40'
                            }}
                          >
                            {getRiskLevel(hoveredCountry.riskScore).label}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Location Details Panel */}
        <div className="col-span-3">
          <Card className="p-4">
            <h3 className="text-lg font-semibold text-white mb-4">
              {selectedCountry ? 'Location Details' : 'Select a Location'}
            </h3>
            
            {selectedCountry ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                {/* Location Header */}
                <div>
                  <h4 className="font-semibold text-white text-lg">{selectedCountry.country}</h4>
                  <p className="text-gray-400 text-sm">{selectedCountry.region}</p>
                  <Badge
                    variant="outline"
                    className="mt-2"
                    style={{ 
                      color: getRiskLevel(selectedCountry.riskScore).color,
                      borderColor: getRiskLevel(selectedCountry.riskScore).color + '40',
                      backgroundColor: getRiskLevel(selectedCountry.riskScore).color + '10'
                    }}
                  >
                    {getRiskLevel(selectedCountry.riskScore).label}
                  </Badge>
                </div>

                {/* Threat Statistics */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-900 rounded">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <span className="text-sm text-gray-300">Total Threats</span>
                    </div>
                    <Badge variant="outline" className="text-sm">
                      {selectedCountry.threatCount}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-900 rounded">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-blue-400" />
                      <span className="text-sm text-gray-300">Threat Actors</span>
                    </div>
                    <Badge variant="outline" className="text-sm">
                      {selectedCountry.actorCount}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-900 rounded">
                    <div className="flex items-center space-x-2">
                      <Target className="w-4 h-4 text-orange-400" />
                      <span className="text-sm text-gray-300">Campaigns</span>
                    </div>
                    <Badge variant="outline" className="text-sm">
                      {selectedCountry.campaignCount}
                    </Badge>
                  </div>
                </div>

                {/* Recent Threats */}
                <div>
                  <h5 className="text-sm font-semibold text-white mb-2">Recent Threats</h5>
                  {selectedCountry.threats.length > 0 ? (
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {selectedCountry.threats.slice(0, 5).map((threat) => (
                        <div key={threat.id} className="p-2 bg-gray-900 rounded text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-white font-medium truncate">{threat.title}</span>
                            <Badge
                              variant="outline"
                              className="text-xs"
                              style={{ color: THREAT_COLORS[threat.severity as keyof typeof THREAT_COLORS] }}
                            >
                              {threat.severity}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-2 text-gray-400">
                            <span>{threat.type}</span>
                            <span>•</span>
                            <span>{threat.confidence} confidence</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">No recent threats</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Info className="w-4 h-4 mr-1" />
                    Details
                  </Button>
                </div>
              </motion.div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Click on a location to view details</p>
                <p className="text-sm mt-2">
                  Explore global threat activity by clicking on map locations
                </p>
              </div>
            )}
          </Card>

          {/* Top Threat Locations */}
          <Card className="p-4 mt-4">
            <h3 className="text-lg font-semibold text-white mb-4">Top Threat Locations</h3>
            
            <div className="space-y-2">
              {threatLocations
                .sort((a, b) => b.threatCount - a.threatCount)
                .slice(0, 10)
                .map((location, index) => (
                  <div
                    key={location.country}
                    className="flex items-center justify-between p-2 bg-gray-900 rounded cursor-pointer hover:bg-gray-800 transition-colors"
                    onClick={() => setSelectedCountry(location)}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono text-gray-400 w-4">
                        #{index + 1}
                      </span>
                      <span className="text-sm text-white truncate">
                        {location.country}
                      </span>
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: getRiskLevel(location.riskScore).color }}
                      />
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {location.threatCount}
                    </Badge>
                  </div>
                ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default GeographicThreatMap;
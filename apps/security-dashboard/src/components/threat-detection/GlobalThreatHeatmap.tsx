import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import * as d3 from 'd3';
import { 
  Globe, 
  Zap, 
  Filter, 
  Maximize2, 
  Minimize2, 
  RotateCcw,
  Play,
  Pause,
  Settings,
  AlertTriangle
} from 'lucide-react';

// Components
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Slider } from '../ui/Slider';
import { Switch } from '../ui/Switch';
import { Select } from '../ui/Select';

// Types
import { SecurityEvent, Severity } from '../../types/security';

interface GlobalThreatHeatmapProps {
  events: SecurityEvent[];
  className?: string;
  height?: number;
  enableWebGL?: boolean;
  realtime?: boolean;
}

interface ThreatPoint {
  id: string;
  lat: number;
  lng: number;
  intensity: number;
  severity: Severity;
  eventCount: number;
  country: string;
  region: string;
  events: SecurityEvent[];
  timestamp: number;
}

interface HeatmapSettings {
  intensity: number;
  radius: number;
  blur: number;
  showCountries: boolean;
  showLabels: boolean;
  animationSpeed: number;
  colorScheme: 'threat' | 'severity' | 'intensity';
  projection: 'mercator' | 'naturalEarth' | 'orthographic';
}

const SEVERITY_COLORS = {
  CRITICAL: '#DC2626',
  HIGH: '#EA580C',
  MEDIUM: '#D97706',
  LOW: '#2563EB'
};

const THREAT_COLOR_SCALE = [
  '#1E3A8A', // Dark blue (low)
  '#1E40AF', 
  '#2563EB',
  '#3B82F6',
  '#60A5FA', // Light blue
  '#FBBF24', // Yellow
  '#F59E0B',
  '#EF4444', // Red
  '#DC2626',
  '#B91C1C'  // Dark red (high)
];

// WebGL Heatmap class for performance
class WebGLHeatmap {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | null;
  private program: WebGLProgram | null;
  private vertices: Float32Array;
  private vertexBuffer: WebGLBuffer | null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    this.program = null;
    this.vertices = new Float32Array([]);
    this.vertexBuffer = null;
    
    if (this.gl) {
      this.initWebGL();
    }
  }

  private initWebGL() {
    if (!this.gl) return;

    const vertexShaderSource = `
      attribute vec2 a_position;
      attribute float a_intensity;
      uniform vec2 u_resolution;
      uniform mat3 u_transform;
      varying float v_intensity;
      
      void main() {
        vec3 position = u_transform * vec3(a_position, 1.0);
        vec2 clipSpace = ((position.xy / u_resolution) * 2.0) - 1.0;
        gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
        gl_PointSize = 20.0;
        v_intensity = a_intensity;
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;
      varying float v_intensity;
      uniform vec3 u_colorScale[10];
      
      void main() {
        float dist = distance(gl_PointCoord, vec2(0.5));
        if (dist > 0.5) discard;
        
        float alpha = 1.0 - (dist * 2.0);
        int colorIndex = int(v_intensity * 9.0);
        vec3 color = u_colorScale[colorIndex];
        
        gl_FragColor = vec4(color, alpha * v_intensity);
      }
    `;

    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (vertexShader && fragmentShader) {
      this.program = this.createProgram(vertexShader, fragmentShader);
      this.vertexBuffer = this.gl.createBuffer();
    }
  }

  private createShader(type: number, source: string): WebGLShader | null {
    if (!this.gl) return null;

    const shader = this.gl.createShader(type);
    if (!shader) return null;

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Shader compilation error:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  private createProgram(vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram | null {
    if (!this.gl) return null;

    const program = this.gl.createProgram();
    if (!program) return null;

    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      console.error('Program linking error:', this.gl.getProgramInfoLog(program));
      this.gl.deleteProgram(program);
      return null;
    }

    return program;
  }

  updateData(points: ThreatPoint[]) {
    if (!this.gl || !this.program) return;

    const vertices = [];
    points.forEach(point => {
      vertices.push(point.lng, point.lat, point.intensity);
    });

    this.vertices = new Float32Array(vertices);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.vertices, this.gl.DYNAMIC_DRAW);
  }

  render() {
    if (!this.gl || !this.program) return;

    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    this.gl.useProgram(this.program);

    // Set uniforms
    const resolutionUniform = this.gl.getUniformLocation(this.program, 'u_resolution');
    this.gl.uniform2f(resolutionUniform, this.canvas.width, this.canvas.height);

    // Bind attributes
    const positionAttribute = this.gl.getAttribLocation(this.program, 'a_position');
    const intensityAttribute = this.gl.getAttribLocation(this.program, 'a_intensity');

    this.gl.enableVertexAttribArray(positionAttribute);
    this.gl.enableVertexAttribArray(intensityAttribute);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.vertexAttribPointer(positionAttribute, 2, this.gl.FLOAT, false, 12, 0);
    this.gl.vertexAttribPointer(intensityAttribute, 1, this.gl.FLOAT, false, 12, 8);

    // Enable blending for heatmap effect
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    this.gl.drawArrays(this.gl.POINTS, 0, this.vertices.length / 3);
  }
}

export const GlobalThreatHeatmap: React.FC<GlobalThreatHeatmapProps> = ({
  events,
  className = '',
  height = 400,
  enableWebGL = true,
  realtime = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const webglHeatmap = useRef<WebGLHeatmap | null>(null);
  const animationFrameRef = useRef<number>();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(realtime);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  const [settings, setSettings] = useState<HeatmapSettings>({
    intensity: 0.7,
    radius: 25,
    blur: 15,
    showCountries: true,
    showLabels: true,
    animationSpeed: 1,
    colorScheme: 'threat',
    projection: 'mercator'
  });

  // Process events into threat points
  const threatPoints = useMemo(() => {
    const pointsMap = new Map<string, ThreatPoint>();
    const timeWindow = 24 * 60 * 60 * 1000; // 24 hours
    const cutoffTime = currentTime - timeWindow;

    events
      .filter(event => {
        const eventTime = new Date(event.timestamp).getTime();
        return eventTime > cutoffTime && event.geoLocation;
      })
      .forEach(event => {
        const { geoLocation } = event;
        if (!geoLocation?.latitude || !geoLocation?.longitude) return;

        const key = `${geoLocation.latitude}-${geoLocation.longitude}`;
        
        if (!pointsMap.has(key)) {
          pointsMap.set(key, {
            id: key,
            lat: geoLocation.latitude,
            lng: geoLocation.longitude,
            intensity: 0,
            severity: event.severity,
            eventCount: 0,
            country: geoLocation.country,
            region: geoLocation.region,
            events: [],
            timestamp: new Date(event.timestamp).getTime()
          });
        }

        const point = pointsMap.get(key)!;
        point.eventCount++;
        point.events.push(event);
        
        // Calculate intensity based on severity and recency
        const severityWeight = {
          CRITICAL: 1.0,
          HIGH: 0.75,
          MEDIUM: 0.5,
          LOW: 0.25
        }[event.severity];

        const timeWeight = Math.max(0.1, 1 - (currentTime - new Date(event.timestamp).getTime()) / timeWindow);
        point.intensity = Math.min(1, point.intensity + (severityWeight * timeWeight * 0.1));

        // Update severity to highest found
        if (event.severity === 'CRITICAL') point.severity = 'CRITICAL';
        else if (event.severity === 'HIGH' && point.severity !== 'CRITICAL') point.severity = 'HIGH';
        else if (event.severity === 'MEDIUM' && !['CRITICAL', 'HIGH'].includes(point.severity)) point.severity = 'MEDIUM';
      });

    return Array.from(pointsMap.values()).sort((a, b) => b.intensity - a.intensity);
  }, [events, currentTime]);

  // Country aggregated data
  const countryStats = useMemo(() => {
    const stats = new Map<string, { eventCount: number; severity: Severity; intensity: number }>();
    
    threatPoints.forEach(point => {
      const country = point.country;
      if (!stats.has(country)) {
        stats.set(country, { eventCount: 0, severity: 'LOW', intensity: 0 });
      }
      
      const stat = stats.get(country)!;
      stat.eventCount += point.eventCount;
      stat.intensity = Math.max(stat.intensity, point.intensity);
      
      // Update severity to highest
      if (point.severity === 'CRITICAL') stat.severity = 'CRITICAL';
      else if (point.severity === 'HIGH' && stat.severity !== 'CRITICAL') stat.severity = 'HIGH';
      else if (point.severity === 'MEDIUM' && !['CRITICAL', 'HIGH'].includes(stat.severity)) stat.severity = 'MEDIUM';
    });
    
    return stats;
  }, [threatPoints]);

  // Initialize WebGL heatmap
  useEffect(() => {
    if (enableWebGL && canvasRef.current && !webglHeatmap.current) {
      webglHeatmap.current = new WebGLHeatmap(canvasRef.current);
    }
  }, [enableWebGL]);

  // Update WebGL data
  useEffect(() => {
    if (webglHeatmap.current && threatPoints.length > 0) {
      webglHeatmap.current.updateData(threatPoints);
    }
  }, [threatPoints]);

  // D3 map rendering
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = containerRef.current.clientWidth;
    const height = isFullscreen ? window.innerHeight - 100 : 400;

    svg.attr('width', width).attr('height', height);

    // Set up projection
    let projection;
    switch (settings.projection) {
      case 'naturalEarth':
        projection = d3.geoNaturalEarth1();
        break;
      case 'orthographic':
        projection = d3.geoOrthographic();
        break;
      default:
        projection = d3.geoMercator();
    }

    projection.fitSize([width, height], { type: 'Sphere' });
    const path = d3.geoPath(projection);

    // Add graticule
    const graticule = d3.geoGraticule();
    svg.append('path')
      .datum(graticule)
      .attr('class', 'graticule')
      .attr('d', path)
      .attr('fill', 'none')
      .attr('stroke', '#374151')
      .attr('stroke-width', 0.5)
      .attr('opacity', 0.3);

    // Color scale
    const colorScale = d3.scaleSequential(d3.interpolateReds)
      .domain([0, Math.max(...threatPoints.map(p => p.intensity))]);

    // Render threat points
    if (threatPoints.length > 0) {
      const pointsGroup = svg.append('g').attr('class', 'threat-points');
      
      pointsGroup.selectAll('circle')
        .data(threatPoints)
        .enter()
        .append('circle')
        .attr('cx', d => {
          const coords = projection([d.lng, d.lat]);
          return coords ? coords[0] : 0;
        })
        .attr('cy', d => {
          const coords = projection([d.lng, d.lat]);
          return coords ? coords[1] : 0;
        })
        .attr('r', d => Math.max(3, Math.min(20, d.intensity * settings.radius)))
        .attr('fill', d => {
          if (settings.colorScheme === 'severity') {
            return SEVERITY_COLORS[d.severity];
          } else {
            return colorScale(d.intensity);
          }
        })
        .attr('opacity', 0.7)
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
          // Tooltip
          const tooltip = d3.select('body')
            .append('div')
            .attr('class', 'threat-tooltip')
            .style('position', 'absolute')
            .style('background', '#1F2937')
            .style('border', '1px solid #374151')
            .style('border-radius', '8px')
            .style('padding', '12px')
            .style('color', 'white')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('z-index', '1000')
            .style('opacity', 0);

          tooltip.html(`
            <div><strong>${d.country}, ${d.region}</strong></div>
            <div>Events: ${d.eventCount}</div>
            <div>Severity: ${d.severity}</div>
            <div>Intensity: ${(d.intensity * 100).toFixed(1)}%</div>
          `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px')
          .transition()
          .duration(200)
          .style('opacity', 1);
        })
        .on('mouseout', function() {
          d3.selectAll('.threat-tooltip').remove();
        })
        .on('click', (event, d) => {
          setSelectedCountry(selectedCountry === d.country ? null : d.country);
        });

      // Add pulsing animation for high-intensity points
      pointsGroup.selectAll('circle')
        .filter(d => d.intensity > 0.7)
        .append('animate')
        .attr('attributeName', 'r')
        .attr('values', d => {
          const base = Math.max(3, Math.min(20, d.intensity * settings.radius));
          return `${base};${base * 1.5};${base}`;
        })
        .attr('dur', '2s')
        .attr('repeatCount', 'indefinite');
    }

  }, [threatPoints, settings, isFullscreen, selectedCountry]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying || !realtime) return;

    const animate = () => {
      setCurrentTime(Date.now());
      
      if (webglHeatmap.current) {
        webglHeatmap.current.render();
      }
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, realtime]);

  // Handle fullscreen
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // Handle setting changes
  const handleSettingChange = useCallback((key: keyof HeatmapSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  return (
    <Card className={`${className} ${isFullscreen ? 'fixed inset-4 z-50' : ''}`}>
      <div className=\"p-4 border-b border-gray-700\">
        <div className=\"flex items-center justify-between mb-4\">
          <h3 className=\"text-lg font-semibold text-white flex items-center\">
            <Globe className=\"w-5 h-5 mr-2\" />
            Global Threat Heatmap
          </h3>
          <div className=\"flex items-center space-x-2\">
            <Button
              variant=\"outline\"
              size=\"sm\"
              onClick={() => setIsPlaying(!isPlaying)}
              className=\"flex items-center space-x-1\"
            >
              {isPlaying ? <Pause className=\"w-4 h-4\" /> : <Play className=\"w-4 h-4\" />}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </Button>
            <Button
              variant=\"outline\"
              size=\"sm\"
              onClick={() => setCurrentTime(Date.now())}
            >
              <RotateCcw className=\"w-4 h-4\" />
            </Button>
            <Button
              variant=\"outline\"
              size=\"sm\"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? <Minimize2 className=\"w-4 h-4\" /> : <Maximize2 className=\"w-4 h-4\" />}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className=\"grid grid-cols-2 md:grid-cols-4 gap-4 mb-4\">
          <div className=\"text-center\">
            <div className=\"text-2xl font-bold text-white\">{threatPoints.length}</div>
            <div className=\"text-xs text-gray-400\">Threat Locations</div>
          </div>
          <div className=\"text-center\">
            <div className=\"text-2xl font-bold text-white\">{countryStats.size}</div>
            <div className=\"text-xs text-gray-400\">Countries Affected</div>
          </div>
          <div className=\"text-center\">
            <div className=\"text-2xl font-bold text-white\">
              {threatPoints.reduce((sum, p) => sum + p.eventCount, 0)}
            </div>
            <div className=\"text-xs text-gray-400\">Total Events</div>
          </div>
          <div className=\"text-center\">
            <div className=\"text-2xl font-bold text-red-400\">
              {threatPoints.filter(p => p.severity === 'CRITICAL').length}
            </div>
            <div className=\"text-xs text-gray-400\">Critical Locations</div>
          </div>
        </div>

        {/* Settings */}
        <div className=\"grid grid-cols-2 md:grid-cols-4 gap-4 text-sm\">
          <div className=\"space-y-2\">
            <label className=\"text-gray-300\">Projection</label>
            <select
              value={settings.projection}
              onChange={(e) => handleSettingChange('projection', e.target.value)}
              className=\"w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white\"
            >
              <option value=\"mercator\">Mercator</option>
              <option value=\"naturalEarth\">Natural Earth</option>
              <option value=\"orthographic\">Orthographic</option>
            </select>
          </div>
          
          <div className=\"space-y-2\">
            <label className=\"text-gray-300\">Color Scheme</label>
            <select
              value={settings.colorScheme}
              onChange={(e) => handleSettingChange('colorScheme', e.target.value)}
              className=\"w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white\"
            >
              <option value=\"threat\">Threat Intensity</option>
              <option value=\"severity\">Severity Based</option>
              <option value=\"intensity\">Pure Intensity</option>
            </select>
          </div>

          <div className=\"space-y-2\">
            <label className=\"text-gray-300\">Point Size</label>
            <Slider
              value={[settings.radius]}
              onValueChange={([value]) => handleSettingChange('radius', value)}
              max={50}
              min={5}
              step={1}
              className=\"w-full\"
            />
          </div>

          <div className=\"flex items-center space-x-2\">
            <Switch
              checked={enableWebGL}
              onCheckedChange={() => {}}
              disabled
            />
            <span className=\"text-gray-300 text-xs\">WebGL Acceleration</span>
          </div>
        </div>
      </div>

      <div className=\"relative\" ref={containerRef} style={{ height: isFullscreen ? 'calc(100vh - 200px)' : height }}>
        {/* WebGL Canvas (if enabled) */}
        {enableWebGL && (
          <canvas
            ref={canvasRef}
            className=\"absolute inset-0 w-full h-full\"
            style={{ mixBlendMode: 'screen' }}
          />
        )}
        
        {/* SVG Map */}
        <svg
          ref={svgRef}
          className=\"w-full h-full\"
          style={{ background: '#0F172A' }}
        />

        {/* Legend */}
        <div className=\"absolute bottom-4 left-4 bg-gray-800/90 backdrop-blur rounded-lg p-4 space-y-2\">
          <h4 className=\"text-white font-semibold text-sm\">Threat Intensity</h4>
          <div className=\"flex items-center space-x-2\">
            <div className=\"w-4 h-4 rounded bg-blue-500\" />
            <span className=\"text-xs text-gray-300\">Low</span>
          </div>
          <div className=\"flex items-center space-x-2\">
            <div className=\"w-4 h-4 rounded bg-yellow-500\" />
            <span className=\"text-xs text-gray-300\">Medium</span>
          </div>
          <div className=\"flex items-center space-x-2\">
            <div className=\"w-4 h-4 rounded bg-red-500\" />
            <span className=\"text-xs text-gray-300\">High</span>
          </div>
        </div>

        {/* Selected Country Info */}
        {selectedCountry && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className=\"absolute top-4 right-4 bg-gray-800/90 backdrop-blur rounded-lg p-4 max-w-xs\"
          >
            <div className=\"flex items-center justify-between mb-2\">
              <h4 className=\"text-white font-semibold\">{selectedCountry}</h4>
              <Button
                variant=\"ghost\"
                size=\"sm\"
                onClick={() => setSelectedCountry(null)}
                className=\"p-1 h-6 w-6\"
              >
                ×
              </Button>
            </div>
            {countryStats.get(selectedCountry) && (
              <div className=\"space-y-1 text-sm\">
                <div className=\"flex justify-between\">
                  <span className=\"text-gray-400\">Events:</span>
                  <span className=\"text-white\">{countryStats.get(selectedCountry)!.eventCount}</span>
                </div>
                <div className=\"flex justify-between\">
                  <span className=\"text-gray-400\">Severity:</span>
                  <Badge className={`text-xs ${
                    countryStats.get(selectedCountry)!.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                    countryStats.get(selectedCountry)!.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400' :
                    countryStats.get(selectedCountry)!.severity === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {countryStats.get(selectedCountry)!.severity}
                  </Badge>
                </div>
                <div className=\"flex justify-between\">
                  <span className=\"text-gray-400\">Intensity:</span>
                  <span className=\"text-white\">{(countryStats.get(selectedCountry)!.intensity * 100).toFixed(1)}%</span>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* No Data State */}
        {threatPoints.length === 0 && (
          <div className=\"absolute inset-0 flex items-center justify-center bg-gray-900/50\">
            <div className=\"text-center text-gray-400\">
              <Globe className=\"w-12 h-12 mx-auto mb-4 opacity-50\" />
              <p>No threat data available</p>
              <p className=\"text-sm mt-2\">Threats will appear as events are processed</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default GlobalThreatHeatmap;
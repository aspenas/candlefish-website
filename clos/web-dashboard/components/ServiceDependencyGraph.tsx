'use client';

import { useEffect, useRef, useState } from 'react';
import { Service } from '@/types/api';

interface ServiceDependencyGraphProps {
  services: Service[];
}

interface GraphNode {
  id: string;
  name: string;
  group: string;
  status: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface GraphLink {
  source: string;
  target: string;
  type: string;
}

// Service dependency mappings based on known architecture
const getDependencies = (): GraphLink[] => [
  // Core dependencies
  { source: 'clos-caddy', target: 'clos-dashboard', type: 'proxy' },
  { source: 'clos-dashboard', target: 'clos-postgres', type: 'database' },
  { source: 'clos-dashboard', target: 'clos-redis', type: 'cache' },
  
  // Candlefish dependencies
  { source: 'candlefish-web', target: 'candlefish-api', type: 'api' },
  { source: 'candlefish-api', target: 'candlefish-postgres', type: 'database' },
  { source: 'candlefish-api', target: 'candlefish-redis', type: 'cache' },
  
  // Security dashboard dependencies
  { source: 'security-dashboard', target: 'security-api', type: 'api' },
  { source: 'security-api', target: 'security-postgres', type: 'database' },
  { source: 'security-api', target: 'security-redis', type: 'cache' },
  { source: 'security-dashboard', target: 'security-grafana', type: 'monitoring' },
  { source: 'security-grafana', target: 'security-prometheus', type: 'metrics' },
  
  // PKB dependencies
  { source: 'pkb-frontend', target: 'pkb-api-service', type: 'api' },
  { source: 'pkb-streamlit', target: 'pkb-api-service', type: 'api' },
  { source: 'pkb-api-service', target: 'pkb-postgres', type: 'database' },
  { source: 'pkb-api-service', target: 'pkb-redis', type: 'cache' },
  
  // Temporal dependencies
  { source: 'temporal-ui', target: 'temporal-frontend', type: 'api' },
  { source: 'temporal-worker', target: 'temporal-frontend', type: 'connection' },
  { source: 'temporal-agent', target: 'temporal-frontend', type: 'connection' },
  
  // Agent dependencies
  { source: 'paintbox-agent', target: 'agent-registry', type: 'registry' },
  { source: 'crown-trophy-agent', target: 'agent-registry', type: 'registry' },
  { source: 'clark-county-agent', target: 'agent-registry', type: 'registry' },
  { source: 'temporal-agent', target: 'agent-registry', type: 'registry' },
  
  // Monitoring dependencies
  { source: 'grafana-monitoring', target: 'prometheus-main', type: 'metrics' },
  { source: 'prometheus-main', target: 'clos-dashboard', type: 'scrape' },
  { source: 'security-prometheus', target: 'security-api', type: 'scrape' },
  { source: 'dashboard-prometheus', target: 'security-dashboard', type: 'scrape' },
  
  // AI service dependencies
  { source: 'goose-ai', target: 'ollama', type: 'llm' },
  { source: 'mlflow', target: 'mlflow-artifacts', type: 'storage' },
];

export function ServiceDependencyGraph({ services }: ServiceDependencyGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const updateCanvasSize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    // Create nodes from services
    const nodes: Map<string, GraphNode> = new Map();
    services.forEach(service => {
      nodes.set(service.id || service.name, {
        id: service.id || service.name,
        name: service.name,
        group: service.group,
        status: service.status,
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: 0,
        vy: 0
      });
    });

    // Get links
    const links = getDependencies().filter(link => 
      nodes.has(link.source) && nodes.has(link.target)
    );

    // Force simulation
    const simulate = () => {
      const alpha = 0.1;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Apply forces
      nodes.forEach(node => {
        // Center force
        node.vx! += (centerX - node.x!) * alpha * 0.01;
        node.vy! += (centerY - node.y!) * alpha * 0.01;

        // Repulsion force between nodes
        nodes.forEach(other => {
          if (node.id === other.id) return;
          const dx = node.x! - other.x!;
          const dy = node.y! - other.y!;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            const force = (150 - dist) / dist * alpha * 2;
            node.vx! += dx * force;
            node.vy! += dy * force;
          }
        });
      });

      // Apply link forces
      links.forEach(link => {
        const source = nodes.get(link.source);
        const target = nodes.get(link.target);
        if (!source || !target) return;

        const dx = target.x! - source.x!;
        const dy = target.y! - source.y!;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const force = (dist - 100) * alpha * 0.1;

        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        source.vx! += fx;
        source.vy! += fy;
        target.vx! -= fx;
        target.vy! -= fy;
      });

      // Update positions
      nodes.forEach(node => {
        node.vx! *= 0.9; // Damping
        node.vy! *= 0.9;
        node.x! += node.vx!;
        node.y! += node.vy!;

        // Keep nodes within bounds
        node.x = Math.max(30, Math.min(canvas.width - 30, node.x!));
        node.y = Math.max(30, Math.min(canvas.height - 30, node.y!));
      });
    };

    // Render function
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Set dark mode colors based on document class
      const isDarkMode = document.documentElement.classList.contains('dark');
      
      // Draw links
      ctx.strokeStyle = isDarkMode ? '#475569' : '#cbd5e1';
      ctx.lineWidth = 1;
      
      links.forEach(link => {
        const source = nodes.get(link.source);
        const target = nodes.get(link.target);
        if (!source || !target) return;

        ctx.beginPath();
        ctx.moveTo(source.x!, source.y!);
        ctx.lineTo(target.x!, target.y!);
        ctx.stroke();

        // Draw arrow
        const angle = Math.atan2(target.y! - source.y!, target.x! - source.x!);
        const arrowLength = 10;
        const arrowAngle = Math.PI / 6;
        
        const arrowX = target.x! - Math.cos(angle) * 30;
        const arrowY = target.y! - Math.sin(angle) * 30;
        
        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(
          arrowX - arrowLength * Math.cos(angle - arrowAngle),
          arrowY - arrowLength * Math.sin(angle - arrowAngle)
        );
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(
          arrowX - arrowLength * Math.cos(angle + arrowAngle),
          arrowY - arrowLength * Math.sin(angle + arrowAngle)
        );
        ctx.stroke();

        // Draw link type label
        const midX = (source.x! + target.x!) / 2;
        const midY = (source.y! + target.y!) / 2;
        ctx.font = '10px sans-serif';
        ctx.fillStyle = isDarkMode ? '#94a3b8' : '#64748b';
        ctx.fillText(link.type, midX, midY);
      });

      // Draw nodes
      nodes.forEach(node => {
        // Node circle
        ctx.beginPath();
        ctx.arc(node.x!, node.y!, 20, 0, Math.PI * 2);
        
        // Fill based on status
        if (node.status === 'running') {
          ctx.fillStyle = isDarkMode ? '#10b981' : '#22c55e';
        } else if (node.status === 'unhealthy') {
          ctx.fillStyle = isDarkMode ? '#ef4444' : '#f87171';
        } else {
          ctx.fillStyle = isDarkMode ? '#6b7280' : '#9ca3af';
        }
        ctx.fill();

        // Node border
        ctx.strokeStyle = isDarkMode ? '#1e293b' : '#e2e8f0';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Highlight if hovered or selected
        if (node.id === hoveredNode || node.id === selectedNode) {
          ctx.beginPath();
          ctx.arc(node.x!, node.y!, 25, 0, Math.PI * 2);
          ctx.strokeStyle = isDarkMode ? '#3b82f6' : '#60a5fa';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Node label
        ctx.font = '12px sans-serif';
        ctx.fillStyle = isDarkMode ? '#f1f5f9' : '#1e293b';
        ctx.textAlign = 'center';
        ctx.fillText(node.name, node.x!, node.y! + 35);
        
        // Group label
        ctx.font = '10px sans-serif';
        ctx.fillStyle = isDarkMode ? '#94a3b8' : '#64748b';
        ctx.fillText(`[${node.group}]`, node.x!, node.y! + 48);
      });
    };

    // Animation loop
    const animate = () => {
      simulate();
      render();
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animate();

    // Mouse interaction
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      let foundNode: string | null = null;
      nodes.forEach(node => {
        const dx = x - node.x!;
        const dy = y - node.y!;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 25) {
          foundNode = node.id;
        }
      });
      setHoveredNode(foundNode);
      canvas.style.cursor = foundNode ? 'pointer' : 'default';
    };

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      let foundNode: string | null = null;
      nodes.forEach(node => {
        const dx = x - node.x!;
        const dy = y - node.y!;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 25) {
          foundNode = node.id;
        }
      });
      setSelectedNode(foundNode);
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('click', handleClick);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [services]);

  const selectedService = services.find(s => (s.id || s.name) === selectedNode);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
      <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">
        Service Dependency Graph
      </h3>
      
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="w-full h-[500px] rounded-lg bg-slate-50 dark:bg-slate-900"
        />
        
        {selectedService && (
          <div className="absolute top-4 right-4 bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4 border border-slate-200 dark:border-slate-700 max-w-xs">
            <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
              {selectedService.name}
            </h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Group:</span>
                <span className="text-slate-900 dark:text-white">{selectedService.group}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Status:</span>
                <span className={`font-medium ${
                  selectedService.status === 'running' ? 'text-green-600' : 'text-gray-600'
                }`}>
                  {selectedService.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Port:</span>
                <span className="text-slate-900 dark:text-white">{selectedService.port}</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-4 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-slate-600 dark:text-slate-400">Running</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
          <span className="text-slate-600 dark:text-slate-400">Stopped</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span className="text-slate-600 dark:text-slate-400">Unhealthy</span>
        </div>
      </div>
    </div>
  );
}
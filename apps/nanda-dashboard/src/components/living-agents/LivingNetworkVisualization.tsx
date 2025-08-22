import React, { useEffect, useRef, useState, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { motion } from 'framer-motion';
import { LivingAgent, AgentMessage, AgentNegotiation } from '../../types/agent.types';

interface NetworkNode {
  id: string;
  name: string;
  type: LivingAgent['type'];
  status: LivingAgent['status'];
  health: number;
  load: number;
  credits: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
}

interface NetworkLink {
  source: string;
  target: string;
  type: 'communication' | 'negotiation' | 'consortium' | 'resource-flow';
  strength: number;
  animated: boolean;
  messageId?: string;
}

interface Props {
  agents: LivingAgent[];
  messages: AgentMessage[];
  negotiations: AgentNegotiation[];
  onAgentSelect: (agentId: string) => void;
  className?: string;
}

const LivingNetworkVisualization: React.FC<Props> = ({
  agents,
  messages,
  negotiations,
  onAgentSelect,
  className = ''
}) => {
  const fgRef = useRef<any>();
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [networkData, setNetworkData] = useState<{ nodes: NetworkNode[], links: NetworkLink[] }>({
    nodes: [],
    links: []
  });

  // Color schemes for different agent types and statuses
  const agentTypeColors = {
    'performance-engineer': '#3B82F6',
    'code-reviewer': '#10B981',
    'test-automator': '#F59E0B',
    'ml-engineer': '#8B5CF6',
    'orchestrator': '#EF4444',
    'monitor': '#6B7280',
    'optimizer': '#EC4899'
  };

  const statusColors = {
    'idle': '#6B7280',
    'negotiating': '#F59E0B',
    'executing': '#10B981',
    'optimizing': '#8B5CF6',
    'healing': '#EF4444'
  };

  // Transform agent data to network format
  useEffect(() => {
    const nodes: NetworkNode[] = agents.map(agent => ({
      id: agent.id,
      name: agent.name,
      type: agent.type,
      status: agent.status,
      health: agent.health,
      load: agent.load,
      credits: agent.wallet.credits
    }));

    const links: NetworkLink[] = [];

    // Add communication links from messages
    messages.forEach(message => {
      if (message.from !== message.to && message.to !== 'broadcast') {
        links.push({
          source: message.from,
          target: message.to,
          type: 'communication',
          strength: 1,
          animated: Date.now() - message.timestamp.getTime() < 5000, // Animate recent messages
          messageId: message.id
        });
      }
    });

    // Add negotiation links
    negotiations.forEach(negotiation => {
      links.push({
        source: negotiation.initiatorId,
        target: negotiation.recipientId,
        type: 'negotiation',
        strength: negotiation.status === 'negotiating' ? 3 : 1,
        animated: negotiation.status === 'negotiating'
      });
    });

    // Add consortium connections
    agents.forEach(agent => {
      agent.connections.forEach(connectionId => {
        if (agents.some(a => a.id === connectionId)) {
          links.push({
            source: agent.id,
            target: connectionId,
            type: 'consortium',
            strength: 2,
            animated: false
          });
        }
      });
    });

    setNetworkData({ nodes, links });
  }, [agents, messages, negotiations]);

  // Node rendering with dynamic styling
  const paintNode = useCallback((node: NetworkNode, ctx: CanvasRenderingContext2D) => {
    const size = Math.max(6, Math.min(20, (node.credits / 100) * 15));
    const isSelected = selectedNode === node.id;

    // Draw main node circle
    ctx.beginPath();
    ctx.arc(node.x!, node.y!, size, 0, 2 * Math.PI);
    ctx.fillStyle = agentTypeColors[node.type];
    ctx.fill();

    // Draw status ring
    ctx.beginPath();
    ctx.arc(node.x!, node.y!, size + 3, 0, 2 * Math.PI);
    ctx.strokeStyle = statusColors[node.status];
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.stroke();

    // Draw health indicator
    const healthAngle = (node.health / 100) * 2 * Math.PI;
    ctx.beginPath();
    ctx.arc(node.x!, node.y!, size + 6, -Math.PI / 2, -Math.PI / 2 + healthAngle);
    ctx.strokeStyle = node.health > 70 ? '#10B981' : node.health > 40 ? '#F59E0B' : '#EF4444';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw load indicator (inner circle)
    if (node.load > 50) {
      ctx.beginPath();
      ctx.arc(node.x!, node.y!, size * 0.6, 0, 2 * Math.PI);
      ctx.fillStyle = `rgba(239, 68, 68, ${node.load / 100})`;
      ctx.fill();
    }

    // Draw label
    if (isSelected || size > 10) {
      ctx.font = '12px Inter, sans-serif';
      ctx.fillStyle = '#1F2937';
      ctx.textAlign = 'center';
      ctx.fillText(node.name, node.x!, node.y! + size + 15);

      // Draw credits
      ctx.font = '10px Inter, sans-serif';
      ctx.fillStyle = '#6B7280';
      ctx.fillText(`${node.credits}c`, node.x!, node.y! + size + 28);
    }
  }, [selectedNode, agentTypeColors, statusColors]);

  // Link rendering with animations
  const paintLink = useCallback((link: NetworkLink, ctx: CanvasRenderingContext2D) => {
    const start = link.source;
    const end = link.target;

    if (typeof start === 'object' && typeof end === 'object') {
      const linkColors = {
        'communication': '#3B82F6',
        'negotiation': '#F59E0B',
        'consortium': '#8B5CF6',
        'resource-flow': '#10B981'
      };

      ctx.beginPath();
      ctx.moveTo(start.x!, start.y!);
      ctx.lineTo(end.x!, end.y!);
      ctx.strokeStyle = link.animated ? linkColors[link.type] : `${linkColors[link.type]}80`;
      ctx.lineWidth = link.strength;

      if (link.animated) {
        ctx.setLineDash([5, 5]);
        ctx.lineDashOffset = -Date.now() * 0.01;
      } else {
        ctx.setLineDash([]);
      }

      ctx.stroke();
      ctx.setLineDash([]);

      // Draw message flow animation
      if (link.animated && link.type === 'communication') {
        const dx = end.x! - start.x!;
        const dy = end.y! - start.y!;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const progress = ((Date.now() * 0.002) % distance) / distance;

        const messageX = start.x! + dx * progress;
        const messageY = start.y! + dy * progress;

        ctx.beginPath();
        ctx.arc(messageX, messageY, 3, 0, 2 * Math.PI);
        ctx.fillStyle = linkColors[link.type];
        ctx.fill();
      }
    }
  }, []);

  const handleNodeClick = useCallback((node: NetworkNode) => {
    setSelectedNode(node.id);
    onAgentSelect(node.id);
  }, [onAgentSelect]);

  const handleBackgroundClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`relative w-full h-full bg-slate-900 rounded-lg overflow-hidden ${className}`}
    >
      {/* Network Title */}
      <div className="absolute top-4 left-4 z-10">
        <h3 className="text-lg font-semibold text-white">Living Network</h3>
        <p className="text-sm text-slate-300">
          {agents.length} agents • {networkData.links.filter(l => l.animated).length} active connections
        </p>
      </div>

      {/* Legend */}
      <div className="absolute top-4 right-4 z-10 bg-slate-800/90 rounded-lg p-3 text-xs">
        <div className="text-white font-medium mb-2">Agent Types</div>
        {Object.entries(agentTypeColors).map(([type, color]) => (
          <div key={type} className="flex items-center gap-2 mb-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-slate-300 capitalize">
              {type.replace('-', ' ')}
            </span>
          </div>
        ))}
      </div>

      {/* Status Legend */}
      <div className="absolute bottom-4 right-4 z-10 bg-slate-800/90 rounded-lg p-3 text-xs">
        <div className="text-white font-medium mb-2">Status</div>
        {Object.entries(statusColors).map(([status, color]) => (
          <div key={status} className="flex items-center gap-2 mb-1">
            <div
              className="w-3 h-3 rounded-full border-2"
              style={{ borderColor: color }}
            />
            <span className="text-slate-300 capitalize">{status}</span>
          </div>
        ))}
      </div>

      {/* Force Graph */}
      <ForceGraph2D
        ref={fgRef}
        graphData={networkData}
        nodeCanvasObject={paintNode}
        linkCanvasObject={paintLink}
        onNodeClick={handleNodeClick}
        onBackgroundClick={handleBackgroundClick}
        nodePointerAreaPaint={(node: NetworkNode, color, ctx) => {
          const size = Math.max(6, Math.min(20, (node.credits / 100) * 15));
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(node.x!, node.y!, size + 5, 0, 2 * Math.PI);
          ctx.fill();
        }}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={0.8}
        linkDirectionalParticles={link => link.animated ? 2 : 0}
        linkDirectionalParticleSpeed={0.01}
        linkDirectionalParticleWidth={2}
        cooldownTicks={100}
        d3AlphaDecay={0.01}
        d3VelocityDecay={0.3}
        nodeRelSize={1}
        linkWidth={link => link.strength}
        backgroundColor="rgba(15, 23, 42, 1)"
        showNavInfo={false}
        enableZoomInteraction={true}
        enablePanInteraction={true}
        minZoom={0.5}
        maxZoom={3}
      />

      {/* Selected Agent Info Panel */}
      {selectedNode && (
        <motion.div
          initial={{ x: -300 }}
          animate={{ x: 0 }}
          className="absolute top-20 left-4 bg-slate-800/95 rounded-lg p-4 min-w-64 z-20"
        >
          {(() => {
            const agent = agents.find(a => a.id === selectedNode);
            return agent ? (
              <div>
                <h4 className="text-white font-semibold text-base mb-2">{agent.name}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Type:</span>
                    <span className="text-white capitalize">{agent.type.replace('-', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Status:</span>
                    <span
                      className="capitalize font-medium"
                      style={{ color: statusColors[agent.status] }}
                    >
                      {agent.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Health:</span>
                    <span className="text-white">{agent.health}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Load:</span>
                    <span className="text-white">{agent.load}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Credits:</span>
                    <span className="text-white">{agent.wallet.credits}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Success Rate:</span>
                    <span className="text-white">{agent.metrics.successRate}%</span>
                  </div>
                </div>
              </div>
            ) : null;
          })()}
        </motion.div>
      )}
    </motion.div>
  );
};

export default LivingNetworkVisualization;

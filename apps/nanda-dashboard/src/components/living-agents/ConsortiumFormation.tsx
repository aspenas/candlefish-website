import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as d3 from 'd3';
import {
  UsersIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  CogIcon,
  ShareIcon
} from '@heroicons/react/24/outline';
import { LivingAgent, AgentConsortium } from '../../types/agent.types';

interface ConsortiumNode {
  id: string;
  name: string;
  type: 'agent' | 'consortium';
  agentType?: LivingAgent['type'];
  status?: string;
  members?: string[];
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface TaskDelegation {
  id: string;
  fromAgent: string;
  toAgent: string;
  task: string;
  status: 'proposed' | 'accepted' | 'rejected' | 'completed';
  timestamp: Date;
  estimatedTime: number;
}

interface ResourcePool {
  consortiumId: string;
  resources: {
    compute: number;
    memory: number;
    storage: number;
    network: number;
  };
  utilization: {
    compute: number;
    memory: number;
    storage: number;
    network: number;
  };
}

interface Props {
  agents: LivingAgent[];
  consortiums: AgentConsortium[];
  onConsortiumUpdate: (consortium: AgentConsortium) => void;
  className?: string;
}

const ConsortiumFormation: React.FC<Props> = ({
  agents,
  consortiums,
  onConsortiumUpdate,
  className = ''
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedConsortium, setSelectedConsortium] = useState<string | null>(null);
  const [taskDelegations, setTaskDelegations] = useState<TaskDelegation[]>([]);
  const [resourcePools, setResourcePools] = useState<ResourcePool[]>([]);
  const [formationAnimations, setFormationAnimations] = useState<Record<string, boolean>>({});

  // Generate mock task delegations
  useEffect(() => {
    const generateDelegations = () => {
      const newDelegations: TaskDelegation[] = [];

      consortiums.forEach(consortium => {
        if (consortium.status === 'active' || consortium.status === 'executing') {
          const members = agents.filter(a => consortium.memberAgentIds.includes(a.id));
          const leadAgent = agents.find(a => a.id === consortium.leadAgentId);

          if (leadAgent && members.length > 1) {
            members.forEach(member => {
              if (member.id !== consortium.leadAgentId && Math.random() < 0.3) {
                newDelegations.push({
                  id: `del-${consortium.id}-${member.id}`,
                  fromAgent: consortium.leadAgentId,
                  toAgent: member.id,
                  task: getRandomTask(member.type),
                  status: Math.random() < 0.8 ? 'accepted' : 'proposed',
                  timestamp: new Date(),
                  estimatedTime: Math.floor(Math.random() * 3600000) + 300000
                });
              }
            });
          }
        }
      });

      setTaskDelegations(newDelegations);
    };

    generateDelegations();
    const interval = setInterval(generateDelegations, 8000);
    return () => clearInterval(interval);
  }, [consortiums, agents]);

  // Generate resource pools
  useEffect(() => {
    const newResourcePools = consortiums.map(consortium => ({
      consortiumId: consortium.id,
      resources: {
        compute: Math.floor(Math.random() * 1000) + 500,
        memory: Math.floor(Math.random() * 2048) + 1024,
        storage: Math.floor(Math.random() * 5000) + 2000,
        network: Math.floor(Math.random() * 1000) + 100
      },
      utilization: {
        compute: Math.floor(Math.random() * 80) + 10,
        memory: Math.floor(Math.random() * 70) + 15,
        storage: Math.floor(Math.random() * 60) + 20,
        network: Math.floor(Math.random() * 90) + 5
      }
    }));

    setResourcePools(newResourcePools);
  }, [consortiums]);

  const getRandomTask = (agentType: LivingAgent['type']) => {
    const tasksByType = {
      'performance-engineer': ['Optimize database queries', 'Profile memory usage', 'Analyze bottlenecks'],
      'code-reviewer': ['Review pull request', 'Check security vulnerabilities', 'Validate architecture'],
      'test-automator': ['Run integration tests', 'Generate test cases', 'Validate API endpoints'],
      'ml-engineer': ['Train ML model', 'Feature engineering', 'Model validation'],
      'orchestrator': ['Coordinate deployment', 'Manage workflow', 'Resource allocation'],
      'monitor': ['System health check', 'Log analysis', 'Alert management'],
      'optimizer': ['Performance tuning', 'Resource optimization', 'Cost analysis']
    };

    const tasks = tasksByType[agentType] || ['General task'];
    return tasks[Math.floor(Math.random() * tasks.length)];
  };

  const statusColors = {
    'forming': '#F59E0B',
    'active': '#10B981',
    'executing': '#3B82F6',
    'dissolved': '#6B7280'
  };

  const agentTypeColors = {
    'performance-engineer': '#3B82F6',
    'code-reviewer': '#10B981',
    'test-automator': '#F59E0B',
    'ml-engineer': '#8B5CF6',
    'orchestrator': '#EF4444',
    'monitor': '#6B7280',
    'optimizer': '#EC4899'
  };

  // D3 Clustering Visualization
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = 600;
    const height = 400;

    svg.selectAll("*").remove();

    // Prepare nodes data
    const nodes: ConsortiumNode[] = [
      // Add individual agents
      ...agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        type: 'agent' as const,
        agentType: agent.type,
        status: agent.status
      })),
      // Add consortium nodes
      ...consortiums.map(consortium => ({
        id: `consortium-${consortium.id}`,
        name: `Consortium ${consortium.id.slice(-4)}`,
        type: 'consortium' as const,
        status: consortium.status,
        members: consortium.memberAgentIds
      }))
    ];

    const links = consortiums.flatMap(consortium =>
      consortium.memberAgentIds.map(memberId => ({
        source: memberId,
        target: `consortium-${consortium.id}`
      }))
    );

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => (d as ConsortiumNode).id).distance(80))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    // Create links
    const link = svg.append('g')
      .selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('stroke', '#64748B')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.6);

    // Create nodes
    const node = svg.append('g')
      .selectAll('g')
      .data(nodes)
      .enter().append('g')
      .call(d3.drag<SVGGElement, ConsortiumNode>()
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
        }));

    // Agent nodes
    node.filter(d => d.type === 'agent')
      .append('circle')
      .attr('r', 15)
      .attr('fill', d => agentTypeColors[d.agentType as LivingAgent['type']])
      .attr('stroke', '#1F2937')
      .attr('stroke-width', 2);

    // Consortium nodes
    node.filter(d => d.type === 'consortium')
      .append('polygon')
      .attr('points', '0,-20 17,-10 17,10 0,20 -17,10 -17,-10')
      .attr('fill', d => statusColors[d.status as keyof typeof statusColors])
      .attr('stroke', '#1F2937')
      .attr('stroke-width', 2);

    // Labels
    node.append('text')
      .text(d => d.name.split(' ')[0])
      .attr('text-anchor', 'middle')
      .attr('dy', 35)
      .attr('fill', '#E5E7EB')
      .attr('font-size', '10px')
      .attr('font-family', 'Inter, sans-serif');

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as ConsortiumNode).x!)
        .attr('y1', d => (d.source as ConsortiumNode).y!)
        .attr('x2', d => (d.target as ConsortiumNode).x!)
        .attr('y2', d => (d.target as ConsortiumNode).y!);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Click handlers
    node.filter(d => d.type === 'consortium')
      .on('click', (event, d) => {
        setSelectedConsortium(d.id.replace('consortium-', ''));
      });

  }, [agents, consortiums]);

  return (
    <div className={`bg-slate-800 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <UsersIcon className="w-6 h-6 text-purple-400" />
              Consortium Formation
            </h2>
            <p className="text-slate-300 text-sm">
              {consortiums.length} active consortiums •
              {consortiums.filter(c => c.status === 'forming').length} forming
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
        {/* Clustering Visualization */}
        <div className="bg-slate-900 rounded-lg p-4">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <ShareIcon className="w-5 h-5" />
            Network Clustering
          </h3>
          <svg
            ref={svgRef}
            width="100%"
            height="400"
            viewBox="0 0 600 400"
            className="border border-slate-700 rounded"
          />
          <div className="mt-2 text-xs text-slate-400">
            Circles: Individual Agents • Hexagons: Consortiums
          </div>
        </div>

        {/* Consortium List */}
        <div className="space-y-4">
          <h3 className="text-white font-semibold">Active Consortiums</h3>

          <AnimatePresence>
            {consortiums.map(consortium => {
              const members = agents.filter(a => consortium.memberAgentIds.includes(a.id));
              const leadAgent = agents.find(a => a.id === consortium.leadAgentId);

              return (
                <motion.div
                  key={consortium.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`
                    bg-slate-700 rounded-lg p-4 cursor-pointer transition-all hover:bg-slate-600/50
                    ${selectedConsortium === consortium.id ? 'ring-2 ring-purple-500' : ''}
                  `}
                  onClick={() => setSelectedConsortium(consortium.id)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: statusColors[consortium.status] }}
                      />
                      <span className="text-white font-medium">
                        Consortium {consortium.id.slice(-6)}
                      </span>
                    </div>
                    <div className="text-slate-300 text-sm">
                      {members.length} agents
                    </div>
                  </div>

                  <div className="text-sm text-slate-400 mb-2">
                    Lead: {leadAgent?.name || 'Unknown'}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-300 text-sm">Performance:</span>
                      <div className="w-16 bg-slate-600 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{ width: `${consortium.performance}%` }}
                        />
                      </div>
                      <span className="text-white text-sm">{consortium.performance}%</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-300">Consensus:</span>
                      <span className="text-white">{consortium.consensusScore}%</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Task Delegation Flow */}
      <div className="p-6 border-t border-slate-700">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <ArrowRightIcon className="w-5 h-5 text-blue-400" />
          Task Delegation Flow
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {taskDelegations.slice(0, 6).map((delegation, index) => {
              const fromAgent = agents.find(a => a.id === delegation.fromAgent);
              const toAgent = agents.find(a => a.id === delegation.toAgent);

              return (
                <motion.div
                  key={delegation.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-slate-700 rounded-lg p-3"
                >
                  <div className="flex items-center gap-2 mb-2">
                    {delegation.status === 'accepted' ? (
                      <CheckCircleIcon className="w-4 h-4 text-green-400" />
                    ) : delegation.status === 'rejected' ? (
                      <XCircleIcon className="w-4 h-4 text-red-400" />
                    ) : (
                      <CogIcon className="w-4 h-4 text-yellow-400 animate-spin" />
                    )}
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      delegation.status === 'accepted' ? 'bg-green-500/20 text-green-300' :
                      delegation.status === 'rejected' ? 'bg-red-500/20 text-red-300' :
                      'bg-yellow-500/20 text-yellow-300'
                    }`}>
                      {delegation.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="text-sm">
                    <div className="text-slate-300 mb-1">
                      <span className="text-white font-medium">{fromAgent?.name}</span>
                      <ArrowRightIcon className="w-3 h-3 inline mx-2" />
                      <span className="text-white font-medium">{toAgent?.name}</span>
                    </div>
                    <div className="text-slate-400 text-xs">{delegation.task}</div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Selected Consortium Details Modal */}
      <AnimatePresence>
        {selectedConsortium && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedConsortium(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-800 rounded-lg max-w-3xl w-full mx-4 max-h-[80vh] overflow-y-auto"
            >
              {(() => {
                const consortium = consortiums.find(c => c.id === selectedConsortium);
                if (!consortium) return null;

                const members = agents.filter(a => consortium.memberAgentIds.includes(a.id));
                const leadAgent = agents.find(a => a.id === consortium.leadAgentId);
                const resourcePool = resourcePools.find(rp => rp.consortiumId === consortium.id);

                return (
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <h3 className="text-2xl font-bold text-white mb-2">
                          Consortium {consortium.id.slice(-6)}
                        </h3>
                        <div className="flex items-center gap-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            consortium.status === 'active' ? 'bg-green-500/20 text-green-300' :
                            consortium.status === 'forming' ? 'bg-yellow-500/20 text-yellow-300' :
                            'bg-blue-500/20 text-blue-300'
                          }`}>
                            {consortium.status.toUpperCase()}
                          </span>
                          <span className="text-slate-300">
                            Formed: {consortium.formation.toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedConsortium(null)}
                        className="text-slate-400 hover:text-white"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Resource Pool */}
                    {resourcePool && (
                      <div className="mb-6 p-4 bg-slate-700 rounded-lg">
                        <h4 className="text-white font-semibold mb-3">Shared Resource Pool</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {Object.entries(resourcePool.resources).map(([resource, total]) => (
                            <div key={resource} className="text-center">
                              <div className="text-slate-300 text-sm capitalize mb-1">{resource}</div>
                              <div className="w-full bg-slate-600 rounded-full h-2 mb-1">
                                <div
                                  className="bg-blue-500 h-2 rounded-full transition-all"
                                  style={{ width: `${resourcePool.utilization[resource as keyof typeof resourcePool.utilization]}%` }}
                                />
                              </div>
                              <div className="text-xs text-slate-400">
                                {resourcePool.utilization[resource as keyof typeof resourcePool.utilization]}% of {total}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Members */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {members.map(member => (
                        <div
                          key={member.id}
                          className={`p-4 rounded-lg ${
                            member.id === consortium.leadAgentId
                              ? 'bg-purple-500/20 border border-purple-500/30'
                              : 'bg-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: agentTypeColors[member.type] }}
                            />
                            <span className="text-white font-medium">{member.name}</span>
                            {member.id === consortium.leadAgentId && (
                              <span className="text-xs px-2 py-1 bg-purple-500 text-white rounded-full">
                                LEAD
                              </span>
                            )}
                          </div>

                          <div className="text-sm text-slate-300 capitalize mb-2">
                            {member.type.replace('-', ' ')}
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-slate-400">Health:</span>
                              <span className="text-white ml-1">{member.health}%</span>
                            </div>
                            <div>
                              <span className="text-slate-400">Load:</span>
                              <span className="text-white ml-1">{member.load}%</span>
                            </div>
                            <div>
                              <span className="text-slate-400">Credits:</span>
                              <span className="text-white ml-1">{member.wallet.credits}</span>
                            </div>
                            <div>
                              <span className="text-slate-400">Success:</span>
                              <span className="text-white ml-1">{member.metrics.successRate}%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ConsortiumFormation;

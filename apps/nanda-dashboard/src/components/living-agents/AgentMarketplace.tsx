import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrophyIcon,
  CurrencyDollarIcon,
  ClockIcon,
  StarIcon,
  BoltIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { LivingAgent, AgentBid, AgentReputation } from '../../types/agent.types';

interface MarketplaceTask {
  id: string;
  title: string;
  description: string;
  requiredCapabilities: string[];
  maxBudget: number;
  deadline: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  bids: AgentBid[];
  status: 'open' | 'bidding' | 'awarded' | 'completed';
  winningBid?: string;
}

interface Props {
  agents: LivingAgent[];
  tasks: MarketplaceTask[];
  onTaskUpdate: (taskId: string, updates: Partial<MarketplaceTask>) => void;
  className?: string;
}

const AgentMarketplace: React.FC<Props> = ({
  agents,
  tasks,
  onTaskUpdate,
  className = ''
}) => {
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [biddingAnimations, setBiddingAnimations] = useState<Record<string, boolean>>({});

  const priorityColors = {
    low: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    medium: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    high: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    critical: 'bg-red-500/20 text-red-300 border-red-500/30'
  };

  // Simulate real-time bidding
  useEffect(() => {
    const interval = setInterval(() => {
      tasks.forEach(task => {
        if (task.status === 'bidding' && Math.random() < 0.3) {
          const availableAgents = agents.filter(agent =>
            agent.status === 'idle' &&
            !task.bids.some(bid => bid.agentId === agent.id)
          );

          if (availableAgents.length > 0) {
            const randomAgent = availableAgents[Math.floor(Math.random() * availableAgents.length)];
            const newBid: AgentBid = {
              agentId: randomAgent.id,
              queryId: task.id,
              confidence: Math.floor(Math.random() * 40) + 60,
              estimatedTime: Math.floor(Math.random() * 3600000) + 300000,
              bidAmount: Math.floor(Math.random() * (task.maxBudget * 0.8)) + (task.maxBudget * 0.2),
              capabilities: randomAgent.capabilities,
              timestamp: new Date()
            };

            const updatedBids = [...task.bids, newBid];
            onTaskUpdate(task.id, { bids: updatedBids });

            // Trigger animation
            setBiddingAnimations(prev => ({ ...prev, [task.id]: true }));
            setTimeout(() => {
              setBiddingAnimations(prev => ({ ...prev, [task.id]: false }));
            }, 2000);
          }
        }
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [tasks, agents, onTaskUpdate]);

  const getReputationScore = (agentId: string): AgentReputation | null => {
    const agent = agents.find(a => a.id === agentId);
    return agent?.reputation || null;
  };

  const getBidRanking = (task: MarketplaceTask) => {
    return task.bids
      .map(bid => {
        const reputation = getReputationScore(bid.agentId);
        const agent = agents.find(a => a.id === bid.agentId);

        // Calculate composite score
        const reputationScore = (reputation?.trustScore || 0) / 100;
        const confidenceScore = bid.confidence / 100;
        const priceScore = 1 - (bid.bidAmount / task.maxBudget);
        const timeScore = Math.max(0, 1 - (bid.estimatedTime / 7200000)); // 2 hours max

        const compositeScore =
          reputationScore * 0.3 +
          confidenceScore * 0.3 +
          priceScore * 0.2 +
          timeScore * 0.2;

        return {
          ...bid,
          agent,
          reputation,
          compositeScore,
          rank: 0
        };
      })
      .sort((a, b) => b.compositeScore - a.compositeScore)
      .map((bid, index) => ({ ...bid, rank: index + 1 }));
  };

  const selectWinner = (taskId: string, bidId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      onTaskUpdate(taskId, {
        status: 'awarded',
        winningBid: bidId
      });
    }
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className={`bg-slate-800 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <CurrencyDollarIcon className="w-6 h-6 text-green-400" />
              Agent Marketplace
            </h2>
            <p className="text-slate-300 text-sm">
              {tasks.filter(t => t.status === 'bidding').length} active auctions •
              {tasks.reduce((sum, t) => sum + t.bids.length, 0)} total bids
            </p>
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-6">
        <AnimatePresence>
          {tasks.map(task => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: biddingAnimations[task.id] ? 1.02 : 1
              }}
              exit={{ opacity: 0, y: -20 }}
              className={`
                bg-slate-700 rounded-lg p-4 cursor-pointer transition-all hover:bg-slate-600/50
                ${selectedTask === task.id ? 'ring-2 ring-blue-500' : ''}
                ${biddingAnimations[task.id] ? 'shadow-lg shadow-blue-500/20' : ''}
              `}
              onClick={() => setSelectedTask(task.id)}
            >
              {/* Task Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-white font-semibold">{task.title}</h3>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${priorityColors[task.priority]}`}>
                    {task.priority.toUpperCase()}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-green-400 font-bold">{task.maxBudget} credits</div>
                  <div className="text-slate-400 text-xs flex items-center gap-1">
                    <ClockIcon className="w-3 h-3" />
                    {formatTime(task.deadline.getTime() - Date.now())}
                  </div>
                </div>
              </div>

              {/* Task Description */}
              <p className="text-slate-300 text-sm mb-3 line-clamp-2">{task.description}</p>

              {/* Required Capabilities */}
              <div className="flex flex-wrap gap-1 mb-3">
                {task.requiredCapabilities.slice(0, 3).map(cap => (
                  <span key={cap} className="px-2 py-1 bg-slate-600 text-slate-300 rounded text-xs">
                    {cap}
                  </span>
                ))}
                {task.requiredCapabilities.length > 3 && (
                  <span className="px-2 py-1 bg-slate-600 text-slate-300 rounded text-xs">
                    +{task.requiredCapabilities.length - 3} more
                  </span>
                )}
              </div>

              {/* Bidding Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-blue-400">
                    <TrophyIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">{task.bids.length} bids</span>
                  </div>
                  {task.status === 'bidding' && (
                    <motion.div
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="text-xs text-yellow-400 flex items-center gap-1"
                    >
                      <BoltIcon className="w-3 h-3" />
                      LIVE
                    </motion.div>
                  )}
                </div>

                {task.bids.length > 0 && (
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Best bid</div>
                    <div className="text-sm font-medium text-white">
                      {Math.min(...task.bids.map(b => b.bidAmount))} credits
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Selected Task Details Modal */}
      <AnimatePresence>
        {selectedTask && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedTask(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-800 rounded-lg max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto"
            >
              {(() => {
                const task = tasks.find(t => t.id === selectedTask);
                if (!task) return null;

                const rankedBids = getBidRanking(task);

                return (
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <h3 className="text-2xl font-bold text-white mb-2">{task.title}</h3>
                        <p className="text-slate-300">{task.description}</p>
                      </div>
                      <button
                        onClick={() => setSelectedTask(null)}
                        className="text-slate-400 hover:text-white"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Bids List */}
                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                        <TrophyIcon className="w-5 h-5 text-yellow-400" />
                        Bidding Competition ({rankedBids.length} agents)
                      </h4>

                      {rankedBids.map((bid, index) => (
                        <motion.div
                          key={bid.agentId}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className={`
                            bg-slate-700 rounded-lg p-4 border-l-4
                            ${bid.rank === 1 ? 'border-yellow-400 bg-yellow-500/5' :
                              bid.rank === 2 ? 'border-slate-400' :
                              'border-slate-600'}
                          `}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="flex flex-col items-center">
                                <div className={`
                                  w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                                  ${bid.rank === 1 ? 'bg-yellow-400 text-black' :
                                    bid.rank === 2 ? 'bg-slate-400 text-black' :
                                    bid.rank === 3 ? 'bg-amber-600 text-white' :
                                    'bg-slate-600 text-slate-300'}
                                `}>
                                  #{bid.rank}
                                </div>
                                {bid.rank === 1 && (
                                  <TrophyIcon className="w-4 h-4 text-yellow-400 mt-1" />
                                )}
                              </div>

                              <div>
                                <div className="text-white font-semibold">{bid.agent?.name}</div>
                                <div className="text-slate-300 text-sm capitalize">
                                  {bid.agent?.type.replace('-', ' ')}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-6">
                              {/* Reputation */}
                              <div className="text-center">
                                <div className="flex items-center gap-1 text-sm">
                                  <StarIcon className="w-4 h-4 text-yellow-400" />
                                  <span className="text-white font-medium">
                                    {bid.reputation?.trustScore || 0}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-400">Trust Score</div>
                              </div>

                              {/* Confidence */}
                              <div className="text-center">
                                <div className="flex items-center gap-1 text-sm">
                                  <ShieldCheckIcon className="w-4 h-4 text-blue-400" />
                                  <span className="text-white font-medium">{bid.confidence}%</span>
                                </div>
                                <div className="text-xs text-slate-400">Confidence</div>
                              </div>

                              {/* Time */}
                              <div className="text-center">
                                <div className="text-white font-medium text-sm">
                                  {formatTime(bid.estimatedTime)}
                                </div>
                                <div className="text-xs text-slate-400">Est. Time</div>
                              </div>

                              {/* Bid Amount */}
                              <div className="text-center">
                                <div className="text-green-400 font-bold text-lg">
                                  {bid.bidAmount}
                                </div>
                                <div className="text-xs text-slate-400">Credits</div>
                              </div>

                              {/* Action Button */}
                              {task.status === 'bidding' && (
                                <button
                                  onClick={() => selectWinner(task.id, bid.agentId)}
                                  className={`
                                    px-4 py-2 rounded-lg font-medium transition-all
                                    ${bid.rank === 1
                                      ? 'bg-green-500 hover:bg-green-600 text-white'
                                      : 'bg-slate-600 hover:bg-slate-500 text-slate-300'
                                    }
                                  `}
                                >
                                  {bid.rank === 1 ? 'Award Task' : 'Select'}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Capabilities */}
                          <div className="mt-3 flex flex-wrap gap-1">
                            {bid.capabilities.slice(0, 4).map(cap => (
                              <span
                                key={cap.id}
                                className="px-2 py-1 bg-slate-600 text-slate-300 rounded text-xs"
                              >
                                {cap.name} ({cap.performance}%)
                              </span>
                            ))}
                          </div>
                        </motion.div>
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

export default AgentMarketplace;

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  EyeIcon, 
  CurrencyDollarIcon, 
  UsersIcon, 
  ChatBubbleLeftRightIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';

// Import common components
import ErrorBoundary from '../common/ErrorBoundary';
import LoadingSpinner from '../common/LoadingSpinner';

// Import all components
import LivingNetworkVisualization from './LivingNetworkVisualization';
import AgentMarketplace from './AgentMarketplace';
import ConsortiumFormation from './ConsortiumFormation';
import SelfOptimizationPanel from './SelfOptimizationPanel';
import AgentCommunicationFeed from './AgentCommunicationFeed';

// Import mock service and types
import { mockAgentService } from '../../services/mockAgentService';
import { 
  LivingAgent, 
  AgentMessage, 
  AgentConsortium, 
  AgentNegotiation,
  PerformanceOptimization
} from '../../types/agent.types';

interface MarketplaceTask {
  id: string;
  title: string;
  description: string;
  requiredCapabilities: string[];
  maxBudget: number;
  deadline: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  bids: any[];
  status: 'open' | 'bidding' | 'awarded' | 'completed';
  winningBid?: string;
}

type ViewType = 'network' | 'marketplace' | 'consortiums' | 'optimization' | 'communication';

export function LivingAgentEcosystem() {
  // State management
  const [agents, setAgents] = useState<LivingAgent[]>([]);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [consortiums, setConsortiums] = useState<AgentConsortium[]>([]);
  const [negotiations, setNegotiations] = useState<AgentNegotiation[]>([]);
  const [optimizations, setOptimizations] = useState<PerformanceOptimization[]>([]);
  const [marketplaceTasks, setMarketplaceTasks] = useState<MarketplaceTask[]>([]);
  
  const [activeView, setActiveView] = useState<ViewType>('network');
  const [, setSelectedAgent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Initialize data from mock service
  useEffect(() => {
    // Set up data subscriptions
    mockAgentService.onAgentUpdates((updatedAgents) => {
      setAgents(updatedAgents);
      setIsLoading(false);
    });

    mockAgentService.onMessageUpdates((updatedMessages) => {
      setMessages(updatedMessages);
    });

    // Get initial data
    setConsortiums(mockAgentService.getConsortiums());
    setNegotiations(mockAgentService.getNegotiations());
    setOptimizations(mockAgentService.getOptimizations());

    // Generate mock marketplace tasks
    const mockTasks: MarketplaceTask[] = [
      {
        id: 'task-1',
        title: 'Optimize Database Query Performance',
        description: 'Need to improve query performance on our main product database. Currently seeing 2-3 second response times.',
        requiredCapabilities: ['Database Optimization', 'Performance Analysis', 'Query Tuning'],
        maxBudget: 500,
        deadline: new Date(Date.now() + 86400000 * 2),
        priority: 'high',
        bids: [],
        status: 'bidding'
      },
      {
        id: 'task-2',
        title: 'Security Audit of API Endpoints',
        description: 'Comprehensive security review of REST API endpoints, including authentication and authorization checks.',
        requiredCapabilities: ['Security Analysis', 'API Testing', 'Vulnerability Assessment'],
        maxBudget: 800,
        deadline: new Date(Date.now() + 86400000 * 5),
        priority: 'critical',
        bids: [],
        status: 'bidding'
      },
      {
        id: 'task-3',
        title: 'ML Model Training Pipeline',
        description: 'Set up automated training pipeline for customer behavior prediction model.',
        requiredCapabilities: ['Model Training', 'Pipeline Development', 'Data Processing'],
        maxBudget: 1200,
        deadline: new Date(Date.now() + 86400000 * 7),
        priority: 'medium',
        bids: [],
        status: 'bidding'
      }
    ];
    
    setMarketplaceTasks(mockTasks);
  }, []);

  // Update data periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setConsortiums(mockAgentService.getConsortiums());
      setNegotiations(mockAgentService.getNegotiations());
      setOptimizations(mockAgentService.getOptimizations());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleTaskUpdate = (taskId: string, updates: Partial<MarketplaceTask>) => {
    setMarketplaceTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    ));
  };

  const handleConsortiumUpdate = (consortium: AgentConsortium) => {
    mockAgentService.updateConsortium(consortium.id, consortium);
  };

  const handleOptimizationUpdate = (optimization: PerformanceOptimization) => {
    mockAgentService.updateOptimization(optimization);
  };

  const handleAgentSelect = (agentId: string) => {
    setSelectedAgent(agentId);
  };

  const views = [
    { id: 'network', label: 'Network', icon: EyeIcon },
    { id: 'marketplace', label: 'Marketplace', icon: CurrencyDollarIcon },
    { id: 'consortiums', label: 'Consortiums', icon: UsersIcon },
    { id: 'optimization', label: 'Optimization', icon: ArrowTrendingUpIcon },
    { id: 'communication', label: 'Communication', icon: ChatBubbleLeftRightIcon }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <LoadingSpinner 
          message="Initializing AI Agent Ecosystem..." 
          size="lg"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-4xl font-bold text-white mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-green-400 bg-clip-text text-transparent">
          NANDA Living Agent Ecosystem
        </h1>
        <p className="text-slate-300 text-lg max-w-3xl mx-auto">
          Watch AI agents communicate, negotiate, and self-optimize in real-time as they form consortiums, 
          compete in the marketplace, and continuously evolve their performance.
        </p>
      </motion.div>

      {/* Stats Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8"
      >
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 border border-slate-700">
          <div className="text-2xl font-bold text-blue-400">{agents.length}</div>
          <div className="text-slate-300 text-sm">Active Agents</div>
        </div>
        
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 border border-slate-700">
          <div className="text-2xl font-bold text-green-400">{consortiums.length}</div>
          <div className="text-slate-300 text-sm">Consortiums</div>
        </div>
        
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 border border-slate-700">
          <div className="text-2xl font-bold text-yellow-400">{negotiations.length}</div>
          <div className="text-slate-300 text-sm">Negotiations</div>
        </div>
        
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 border border-slate-700">
          <div className="text-2xl font-bold text-purple-400">
            {messages.filter(m => Date.now() - m.timestamp.getTime() < 60000).length}
          </div>
          <div className="text-slate-300 text-sm">Messages/Min</div>
        </div>
        
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 border border-slate-700">
          <div className="text-2xl font-bold text-red-400">{optimizations.length}</div>
          <div className="text-slate-300 text-sm">Optimizations</div>
        </div>
      </motion.div>

      {/* View Navigation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-wrap justify-center gap-2 mb-8"
      >
        {views.map(view => {
          const IconComponent = view.icon;
          return (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id as ViewType)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
                ${activeView === view.id
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }
              `}
            >
              <IconComponent className="w-5 h-5" />
              {view.label}
            </button>
          );
        })}
      </motion.div>

      {/* Main Content Area */}
      <div className="min-h-[600px]">
        <ErrorBoundary>
          {activeView === 'network' && (
            <motion.div
              key="network"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <LivingNetworkVisualization
                agents={agents}
                messages={messages}
                negotiations={negotiations}
                onAgentSelect={handleAgentSelect}
                className="h-[600px]"
              />
            </motion.div>
          )}

          {activeView === 'marketplace' && (
            <motion.div
              key="marketplace"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <AgentMarketplace
                agents={agents}
                tasks={marketplaceTasks}
                onTaskUpdate={handleTaskUpdate}
                className="min-h-[600px]"
              />
            </motion.div>
          )}

          {activeView === 'consortiums' && (
            <motion.div
              key="consortiums"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <ConsortiumFormation
                agents={agents}
                consortiums={consortiums}
                onConsortiumUpdate={handleConsortiumUpdate}
                className="min-h-[600px]"
              />
            </motion.div>
          )}

          {activeView === 'optimization' && (
            <motion.div
              key="optimization"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <SelfOptimizationPanel
                agents={agents}
                optimizations={optimizations}
                onOptimizationUpdate={handleOptimizationUpdate}
                className="min-h-[600px]"
              />
            </motion.div>
          )}

          {activeView === 'communication' && (
            <motion.div
              key="communication"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <AgentCommunicationFeed
                agents={agents}
                messages={messages}
                negotiations={negotiations}
                className="min-h-[600px]"
              />
            </motion.div>
          )}
        </ErrorBoundary>
      </div>

      {/* Real-time Activity Indicators */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-6 right-6 space-y-2"
      >
        {/* Active Negotiations Indicator */}
        {negotiations.filter(n => n.status === 'negotiating').length > 0 && (
          <div className="bg-yellow-500/20 backdrop-blur-sm border border-yellow-500/30 rounded-lg px-3 py-2 text-yellow-300 text-sm flex items-center gap-2">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-2 h-2 bg-yellow-400 rounded-full"
            />
            {negotiations.filter(n => n.status === 'negotiating').length} Active Negotiations
          </div>
        )}

        {/* Live Communications Indicator */}
        {messages.filter(m => Date.now() - m.timestamp.getTime() < 5000).length > 0 && (
          <div className="bg-green-500/20 backdrop-blur-sm border border-green-500/30 rounded-lg px-3 py-2 text-green-300 text-sm flex items-center gap-2">
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="w-2 h-2 bg-green-400 rounded-full"
            />
            Live Communications
          </div>
        )}

        {/* Optimization in Progress */}
        {optimizations.filter(o => o.status === 'optimizing' || o.status === 'testing').length > 0 && (
          <div className="bg-blue-500/20 backdrop-blur-sm border border-blue-500/30 rounded-lg px-3 py-2 text-blue-300 text-sm flex items-center gap-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full"
            />
            Self-Optimizing
          </div>
        )}
      </motion.div>

      {/* Performance Metrics Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-400"
      >
        <div className="bg-slate-800/30 rounded-lg p-3">
          <div className="font-medium mb-1">System Performance</div>
          <div>Avg Response Time: 147ms</div>
          <div>Success Rate: 94.2%</div>
          <div>Network Health: 89%</div>
        </div>
        
        <div className="bg-slate-800/30 rounded-lg p-3">
          <div className="font-medium mb-1">Agent Economics</div>
          <div>Total Credits Traded: {agents.reduce((sum, agent) => sum + agent.wallet.credits, 0).toLocaleString()}</div>
          <div>Active Bids: {marketplaceTasks.reduce((sum, task) => sum + task.bids.length, 0)}</div>
          <div>Avg Trust Score: {(agents.reduce((sum, agent) => sum + agent.reputation.trustScore, 0) / agents.length).toFixed(1)}</div>
        </div>
        
        <div className="bg-slate-800/30 rounded-lg p-3">
          <div className="font-medium mb-1">Ecosystem Health</div>
          <div>Agent Utilization: {(agents.reduce((sum, agent) => sum + agent.load, 0) / agents.length).toFixed(1)}%</div>
          <div>Consortium Formation Rate: 78%</div>
          <div>Optimization Success: 82%</div>
        </div>
      </motion.div>
    </div>
  );
}
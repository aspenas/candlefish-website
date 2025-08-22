import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChatBubbleLeftRightIcon,
  BoltIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserGroupIcon as HandshakeIcon,
  ExclamationTriangleIcon,
  HeartIcon,
  CpuChipIcon,
  ArrowPathIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { AgentMessage, LivingAgent, AgentNegotiation } from '../../types/agent.types';

interface ProtocolMessage {
  id: string;
  type: 'handshake' | 'discovery' | 'consensus' | 'heartbeat' | 'error-recovery' | 'resource-request';
  from: string;
  to: string;
  data: any;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'sent' | 'received' | 'acknowledged' | 'failed';
}

interface ConversationThread {
  id: string;
  participants: string[];
  topic: string;
  messageCount: number;
  lastActivity: Date;
  status: 'active' | 'consensus-reached' | 'failed' | 'timeout';
}

interface Props {
  agents: LivingAgent[];
  messages: AgentMessage[];
  negotiations: AgentNegotiation[];
  className?: string;
}

const AgentCommunicationFeed: React.FC<Props> = ({
  agents,
  messages,
  negotiations,
  className = ''
}) => {
  const [protocolMessages, setProtocolMessages] = useState<ProtocolMessage[]>([]);
  const [conversations, setConversations] = useState<ConversationThread[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'protocols' | 'negotiations' | 'errors'>('all');
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Simulate real-time protocol messages
  useEffect(() => {
    const generateProtocolMessage = () => {
      const messageTypes: ProtocolMessage['type'][] = [
        'handshake', 'discovery', 'consensus', 'heartbeat', 'error-recovery', 'resource-request'
      ];

      const fromAgent = agents[Math.floor(Math.random() * agents.length)];
      const toAgent = agents[Math.floor(Math.random() * agents.length)];

      if (fromAgent && toAgent && fromAgent.id !== toAgent.id) {
        const type = messageTypes[Math.floor(Math.random() * messageTypes.length)];
        const messageData = generateMessageData(type, fromAgent, toAgent);

        const newMessage: ProtocolMessage = {
          id: `proto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type,
          from: fromAgent.id,
          to: toAgent.id,
          data: messageData,
          timestamp: new Date(),
          priority: Math.random() < 0.1 ? 'critical' : Math.random() < 0.3 ? 'high' : Math.random() < 0.6 ? 'medium' : 'low',
          status: Math.random() < 0.95 ? 'sent' : 'failed'
        };

        setProtocolMessages(prev => [newMessage, ...prev].slice(0, 100));

        // Update conversations
        updateConversations(fromAgent.id, toAgent.id, type);
      }
    };

    const interval = setInterval(generateProtocolMessage, Math.random() * 3000 + 1000);
    return () => clearInterval(interval);
  }, [agents]);

  const generateMessageData = (type: ProtocolMessage['type'], from: LivingAgent, to: LivingAgent) => {
    switch (type) {
      case 'handshake':
        return {
          protocol: 'NANDA-MESH-v1.2',
          capabilities: from.capabilities.map(c => c.name),
          version: '1.2.0',
          auth_token: 'auth_' + Math.random().toString(36).substr(2, 16)
        };

      case 'discovery':
        return {
          query: 'service_discovery',
          services: ['code-review', 'performance-analysis', 'testing'],
          region: from.location.region,
          load_capacity: 100 - from.load
        };

      case 'consensus':
        return {
          proposal_id: 'prop_' + Math.random().toString(36).substr(2, 8),
          vote: Math.random() < 0.8 ? 'approve' : 'reject',
          reason: 'Resource allocation optimization',
          weight: from.reputation.trustScore
        };

      case 'heartbeat':
        return {
          status: from.status,
          health: from.health,
          load: from.load,
          uptime: Math.floor(Math.random() * 86400),
          last_optimization: from.metrics.lastOptimized
        };

      case 'error-recovery':
        return {
          error_type: 'connection_timeout',
          recovery_action: 'reconnect_with_backoff',
          attempt: Math.floor(Math.random() * 5) + 1,
          max_retries: 5
        };

      case 'resource-request':
        return {
          resource_type: ['cpu', 'memory', 'network'][Math.floor(Math.random() * 3)],
          amount: Math.floor(Math.random() * 100) + 10,
          duration: Math.floor(Math.random() * 3600) + 300,
          priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
        };

      default:
        return {};
    }
  };

  const updateConversations = (from: string, to: string, messageType: string) => {
    setConversations(prev => {
      const existingThread = prev.find(c =>
        c.participants.includes(from) && c.participants.includes(to)
      );

      if (existingThread) {
        return prev.map(c =>
          c.id === existingThread.id
            ? {
                ...c,
                messageCount: c.messageCount + 1,
                lastActivity: new Date(),
                status: messageType === 'consensus' && Math.random() < 0.3 ? 'consensus-reached' : c.status
              }
            : c
        );
      } else {
        const newThread: ConversationThread = {
          id: `thread-${from}-${to}`,
          participants: [from, to],
          topic: getConversationTopic(messageType),
          messageCount: 1,
          lastActivity: new Date(),
          status: 'active'
        };
        return [newThread, ...prev].slice(0, 20);
      }
    });
  };

  const getConversationTopic = (messageType: string) => {
    const topics = {
      'handshake': 'Initial Connection',
      'discovery': 'Service Discovery',
      'consensus': 'Decision Making',
      'heartbeat': 'Health Check',
      'error-recovery': 'Error Recovery',
      'resource-request': 'Resource Negotiation'
    };
    return topics[messageType as keyof typeof topics] || 'General Communication';
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (autoScroll) {
      scrollToBottom();
    }
  }, [protocolMessages, autoScroll]);

  const getMessageIcon = (type: ProtocolMessage['type']) => {
    switch (type) {
      case 'handshake': return HandshakeIcon;
      case 'discovery': return CpuChipIcon;
      case 'consensus': return CheckCircleIcon;
      case 'heartbeat': return HeartIcon;
      case 'error-recovery': return ArrowPathIcon;
      case 'resource-request': return ShieldCheckIcon;
      default: return ChatBubbleLeftRightIcon;
    }
  };

  const getStatusColor = (status: ProtocolMessage['status']) => {
    switch (status) {
      case 'sent': return 'text-blue-400';
      case 'received': return 'text-green-400';
      case 'acknowledged': return 'text-green-300';
      case 'failed': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  const getPriorityColor = (priority: ProtocolMessage['priority']) => {
    switch (priority) {
      case 'critical': return 'border-l-red-500 bg-red-500/5';
      case 'high': return 'border-l-orange-500 bg-orange-500/5';
      case 'medium': return 'border-l-yellow-500 bg-yellow-500/5';
      default: return 'border-l-slate-500';
    }
  };

  const filteredMessages = protocolMessages.filter(message => {
    if (selectedFilter === 'protocols') return ['handshake', 'discovery', 'consensus'].includes(message.type);
    if (selectedFilter === 'negotiations') return message.type === 'resource-request';
    if (selectedFilter === 'errors') return message.status === 'failed' || message.type === 'error-recovery';
    if (selectedAgent) return message.from === selectedAgent || message.to === selectedAgent;
    return true;
  });

  const getAgentName = (agentId: string) => {
    return agents.find(a => a.id === agentId)?.name || `Agent-${agentId.slice(-4)}`;
  };

  return (
    <div className={`bg-slate-800 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ChatBubbleLeftRightIcon className="w-6 h-6 text-green-400" />
              Agent Communication Feed
            </h2>
            <p className="text-slate-300 text-sm">
              {protocolMessages.filter(m => Date.now() - m.timestamp.getTime() < 60000).length} messages in last minute •
              {conversations.filter(c => c.status === 'active').length} active conversations
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded border-slate-600 bg-slate-700 text-green-500 focus:ring-green-500"
              />
              <span className="text-slate-300 text-sm">Auto-scroll</span>
            </label>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-4">
          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value as typeof selectedFilter)}
            className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-1 text-sm"
          >
            <option value="all">All Messages</option>
            <option value="protocols">Protocols</option>
            <option value="negotiations">Negotiations</option>
            <option value="errors">Errors</option>
          </select>

          <select
            value={selectedAgent || ''}
            onChange={(e) => setSelectedAgent(e.target.value || null)}
            className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-1 text-sm"
          >
            <option value="">All Agents</option>
            {agents.map(agent => (
              <option key={agent.id} value={agent.id}>{agent.name}</option>
            ))}
          </select>
        </div>

        {/* Active Conversations */}
        <div className="flex flex-wrap gap-2">
          <AnimatePresence>
            {conversations.slice(0, 5).map(conversation => (
              <motion.div
                key={conversation.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className={`px-3 py-1 rounded-full text-xs font-medium border ${
                  conversation.status === 'active' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                  conversation.status === 'consensus-reached' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                  'bg-slate-500/20 text-slate-300 border-slate-500/30'
                }`}
              >
                {conversation.topic} ({conversation.messageCount})
                {conversation.status === 'active' && (
                  <motion.span
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="ml-1"
                  >
                    ●
                  </motion.span>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="h-96 overflow-y-auto p-4 space-y-2">
        <AnimatePresence>
          {filteredMessages.map((message, index) => {
            const IconComponent = getMessageIcon(message.type);

            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ delay: index * 0.02 }}
                className={`border-l-4 bg-slate-700 rounded-r-lg p-3 ${getPriorityColor(message.priority)}`}
              >
                <div className="flex items-start gap-3">
                  <IconComponent className={`w-5 h-5 mt-0.5 ${
                    message.status === 'failed' ? 'text-red-400' : 'text-blue-400'
                  }`} />

                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-medium text-sm capitalize">
                        {message.type.replace('-', ' ')}
                      </span>
                      <span className="text-slate-400 text-xs">
                        {getAgentName(message.from)} → {getAgentName(message.to)}
                      </span>
                      <span className={`text-xs font-medium ${getStatusColor(message.status)}`}>
                        {message.status.toUpperCase()}
                      </span>
                      <span className="text-slate-500 text-xs ml-auto">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>

                    {/* Message Data */}
                    <div className="bg-slate-600 rounded p-2 text-xs">
                      <pre className="text-slate-300 font-mono whitespace-pre-wrap text-wrap">
                        {JSON.stringify(message.data, null, 2)}
                      </pre>
                    </div>

                    {/* Status indicators */}
                    {message.priority === 'critical' && (
                      <div className="flex items-center gap-1 mt-2 text-red-400 text-xs">
                        <ExclamationTriangleIcon className="w-3 h-3" />
                        <span>Critical Priority</span>
                      </div>
                    )}

                    {message.status === 'failed' && (
                      <div className="flex items-center gap-1 mt-2 text-red-400 text-xs">
                        <XCircleIcon className="w-3 h-3" />
                        <span>Message delivery failed</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Real-time Activity Indicator */}
      <div className="p-3 border-t border-slate-700 bg-slate-750">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-2 h-2 bg-green-400 rounded-full"
              />
              <span className="text-slate-300">
                {protocolMessages.filter(m => Date.now() - m.timestamp.getTime() < 5000).length} recent
              </span>
            </div>

            <div className="text-slate-400">
              Total: {protocolMessages.length} messages
            </div>

            <div className="text-slate-400">
              Failed: {protocolMessages.filter(m => m.status === 'failed').length}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <BoltIcon className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-400 text-sm font-medium">LIVE</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentCommunicationFeed;

import React, { useState, useEffect, useMemo } from 'react';
import { useSubscription } from '@apollo/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  Target,
  Zap,
  Eye,
  Settings,
  Play,
  Pause,
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  BarChart3,
  Network,
  Link
} from 'lucide-react';

// GraphQL Operations
import { 
  CORRELATION_MATCHES,
  THREAT_INTELLIGENCE_UPDATES,
  IOC_MATCHES 
} from '../../graphql/threat-intelligence-operations';

// Hooks
import { useThreatCorrelations } from '../../hooks/useThreatIntelligence';

// Components
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';
import { Input } from '../ui/Input';

// Types
interface CorrelationEnginePanelProps {
  organizationId: string;
  className?: string;
}

interface CorrelationRule {
  id: string;
  name: string;
  description: string;
  correlationType: string;
  confidence: number;
  threshold: number;
  timeWindow: number;
  isActive: boolean;
  status: string;
  matchCount: number;
  falsePositiveRate: number;
  effectivenessScore: number;
  rules: Array<{
    id: string;
    field: string;
    operator: string;
    value: string;
    weight: number;
    isRequired: boolean;
  }>;
  logic: string;
  tags: string[];
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface CorrelationMatch {
  id: string;
  correlation: {
    id: string;
    name: string;
    correlationType: string;
    confidence: number;
  };
  match: {
    id: string;
    confidence: number;
    score: number;
    timestamp: string;
    details: {
      matchingFields: string[];
      weights: number[];
      calculations: Record<string, any>;
      reasoning: string;
    };
  };
  events: Array<{
    id: string;
    type: string;
    timestamp: string;
    source: string;
    severity: string;
  }>;
  indicators: Array<{
    id: string;
    type: string;
    value: string;
    confidence: string;
  }>;
  metadata?: Record<string, any>;
}

interface RealtimeAlert {
  type: string;
  timestamp: string;
  correlation: CorrelationRule;
  match: CorrelationMatch;
  confidence: number;
  severity: string;
}

const CORRELATION_TYPES = [
  'TEMPORAL',
  'SPATIAL', 
  'BEHAVIORAL',
  'INDICATOR_BASED',
  'PATTERN_BASED',
  'THREAT_ACTOR',
  'CAMPAIGN',
  'TECHNIQUE',
  'ASSET_BASED'
];

const STATUS_COLORS = {
  ACTIVE: 'text-green-400 bg-green-500/10 border-green-500/20',
  INACTIVE: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
  TESTING: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  ERROR: 'text-red-400 bg-red-500/10 border-red-500/20',
  TUNING: 'text-blue-400 bg-blue-500/10 border-blue-500/20'
};

export const CorrelationEnginePanel: React.FC<CorrelationEnginePanelProps> = ({
  organizationId,
  className = ''
}) => {
  const [selectedTab, setSelectedTab] = useState<'rules' | 'matches' | 'alerts' | 'analytics'>('rules');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedRule, setSelectedRule] = useState<CorrelationRule | null>(null);
  const [realtimeAlerts, setRealtimeAlerts] = useState<RealtimeAlert[]>([]);
  const [recentMatches, setRecentMatches] = useState<CorrelationMatch[]>([]);
  const [engineRunning, setEngineRunning] = useState(true);

  // Fetch correlation rules
  const {
    data: correlationsData,
    loading: correlationsLoading,
    error: correlationsError,
    refetch: refetchCorrelations
  } = useThreatCorrelations(organizationId);

  // Real-time subscriptions
  const { data: correlationMatches } = useSubscription(CORRELATION_MATCHES, {
    variables: { organizationId },
    onData: ({ data }) => {
      if (data?.data?.correlationMatches) {
        const match = data.data.correlationMatches;
        setRecentMatches(prev => [match, ...prev.slice(0, 49)]); // Keep last 50
        
        // Create alert for high-confidence matches
        if (match.match.confidence > 0.8) {
          const alert: RealtimeAlert = {
            type: 'CORRELATION_MATCH',
            timestamp: new Date().toISOString(),
            correlation: match.correlation,
            match: match,
            confidence: match.match.confidence,
            severity: match.match.confidence > 0.9 ? 'HIGH' : 'MEDIUM'
          };
          setRealtimeAlerts(prev => [alert, ...prev.slice(0, 99)]); // Keep last 100
        }
      }
    }
  });

  const { data: threatUpdates } = useSubscription(THREAT_INTELLIGENCE_UPDATES, {
    variables: { organizationId },
    onData: ({ data }) => {
      // Process threat intelligence updates for correlation
      console.log('Threat update received:', data);
    }
  });

  const { data: iocMatches } = useSubscription(IOC_MATCHES, {
    variables: { organizationId },
    onData: ({ data }) => {
      // Process IOC matches for correlation
      console.log('IOC match received:', data);
    }
  });

  // Process correlation rules
  const correlationRules: CorrelationRule[] = useMemo(() => {
    if (!correlationsData?.threatCorrelations?.edges) return [];
    
    return correlationsData.threatCorrelations.edges.map((edge: any) => edge.node);
  }, [correlationsData]);

  // Filter rules
  const filteredRules = useMemo(() => {
    return correlationRules.filter(rule => {
      if (searchTerm && !rule.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      if (filterType !== 'all' && rule.correlationType !== filterType) {
        return false;
      }
      if (filterStatus !== 'all' && rule.status !== filterStatus) {
        return false;
      }
      return true;
    });
  }, [correlationRules, searchTerm, filterType, filterStatus]);

  // Calculate engine statistics
  const engineStats = useMemo(() => {
    const totalRules = correlationRules.length;
    const activeRules = correlationRules.filter(r => r.isActive).length;
    const totalMatches = correlationRules.reduce((sum, r) => sum + r.matchCount, 0);
    const avgEffectiveness = correlationRules.length > 0 
      ? correlationRules.reduce((sum, r) => sum + r.effectivenessScore, 0) / correlationRules.length
      : 0;
    const avgFalsePositive = correlationRules.length > 0
      ? correlationRules.reduce((sum, r) => sum + r.falsePositiveRate, 0) / correlationRules.length
      : 0;

    return {
      totalRules,
      activeRules,
      totalMatches,
      avgEffectiveness,
      avgFalsePositive,
      recentAlertsCount: realtimeAlerts.length,
      recentMatchesCount: recentMatches.length
    };
  }, [correlationRules, realtimeAlerts, recentMatches]);

  // Toggle correlation engine
  const toggleEngine = () => {
    setEngineRunning(prev => !prev);
    // In a real implementation, this would send a mutation to start/stop the engine
  };

  if (correlationsError) {
    return (
      <Card className={`p-6 ${className}`}>
        <ErrorMessage
          title="Failed to Load Correlation Engine"
          message={correlationsError.message}
          onRetry={() => refetchCorrelations()}
        />
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header and Engine Status */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Zap className="w-6 h-6 text-yellow-400" />
              <h1 className="text-2xl font-bold text-white">
                Correlation Engine
              </h1>
            </div>
            
            {/* Engine Status */}
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                engineRunning ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              }`} />
              <span className="text-sm text-gray-400">
                {engineRunning ? 'Running' : 'Stopped'}
              </span>
            </div>

            {/* Real-time Activity */}
            {realtimeAlerts.length > 0 && (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/20 animate-pulse">
                <Activity className="w-3 h-3 mr-1" />
                {realtimeAlerts.length} new alerts
              </Badge>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant={engineRunning ? 'default' : 'outline'}
              size="sm"
              onClick={toggleEngine}
              className="flex items-center space-x-1"
            >
              {engineRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{engineRunning ? 'Pause' : 'Start'}</span>
            </Button>

            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Engine Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {[
            {
              label: 'Total Rules',
              value: engineStats.totalRules,
              icon: Target,
              color: 'text-blue-400'
            },
            {
              label: 'Active Rules',
              value: engineStats.activeRules,
              icon: CheckCircle,
              color: 'text-green-400'
            },
            {
              label: 'Total Matches',
              value: engineStats.totalMatches,
              icon: Link,
              color: 'text-purple-400'
            },
            {
              label: 'Effectiveness',
              value: `${engineStats.avgEffectiveness.toFixed(1)}%`,
              icon: TrendingUp,
              color: 'text-yellow-400'
            },
            {
              label: 'False Positive',
              value: `${(engineStats.avgFalsePositive * 100).toFixed(1)}%`,
              icon: XCircle,
              color: 'text-orange-400'
            },
            {
              label: 'Recent Alerts',
              value: engineStats.recentAlertsCount,
              icon: AlertTriangle,
              color: 'text-red-400'
            },
            {
              label: 'Recent Matches',
              value: engineStats.recentMatchesCount,
              icon: Activity,
              color: 'text-green-400'
            }
          ].map((stat, index) => (
            <Card key={stat.label} className="p-3">
              <div className="flex items-center space-x-2">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <div>
                  <div className="text-lg font-bold text-white">
                    {stat.value}
                  </div>
                  <div className="text-xs text-gray-400">
                    {stat.label}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      {/* Navigation Tabs */}
      <Card className="p-1">
        <nav className="flex space-x-1">
          {[
            { id: 'rules', name: 'Rules', icon: Target },
            { id: 'matches', name: 'Matches', icon: Link },
            { id: 'alerts', name: 'Alerts', icon: AlertTriangle },
            { id: 'analytics', name: 'Analytics', icon: BarChart3 }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded transition-all duration-200 ${
                selectedTab === tab.id
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{tab.name}</span>
              {tab.id === 'alerts' && realtimeAlerts.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {realtimeAlerts.length}
                </Badge>
              )}
            </button>
          ))}
        </nav>
      </Card>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {selectedTab === 'rules' && (
            <div className="grid grid-cols-12 gap-6">
              {/* Rules List */}
              <div className="col-span-8">
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Correlation Rules</h3>
                    <Button variant="outline" size="sm">
                      <Plus className="w-4 h-4 mr-1" />
                      New Rule
                    </Button>
                  </div>

                  {/* Filters */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Search rules..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                    >
                      <option value="all">All Types</option>
                      {CORRELATION_TYPES.map(type => (
                        <option key={type} value={type}>
                          {type.replace('_', ' ')}
                        </option>
                      ))}
                    </select>

                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                    >
                      <option value="all">All Status</option>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="TESTING">Testing</option>
                      <option value="ERROR">Error</option>
                      <option value="TUNING">Tuning</option>
                    </select>
                  </div>

                  {/* Rules List */}
                  {correlationsLoading ? (
                    <div className="text-center py-12">
                      <LoadingSpinner size="lg" />
                      <p className="text-gray-400 mt-4">Loading correlation rules...</p>
                    </div>
                  ) : filteredRules.length > 0 ? (
                    <div className="space-y-4">
                      {filteredRules.map((rule) => (
                        <motion.div
                          key={rule.id}
                          layout
                          className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                            selectedRule?.id === rule.id
                              ? 'border-blue-500 bg-blue-500/10'
                              : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                          }`}
                          onClick={() => setSelectedRule(rule)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h4 className="font-semibold text-white">{rule.name}</h4>
                                <Badge 
                                  className={STATUS_COLORS[rule.status as keyof typeof STATUS_COLORS]}
                                  variant="outline"
                                >
                                  {rule.status}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {rule.correlationType.replace('_', ' ')}
                                </Badge>
                              </div>
                              
                              <p className="text-sm text-gray-300 mb-3">{rule.description}</p>
                              
                              <div className="grid grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-400">Confidence: </span>
                                  <span className="text-white">{rule.confidence}%</span>
                                </div>
                                <div>
                                  <span className="text-gray-400">Matches: </span>
                                  <span className="text-white">{rule.matchCount}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400">Effectiveness: </span>
                                  <span className="text-white">{rule.effectivenessScore.toFixed(1)}%</span>
                                </div>
                                <div>
                                  <span className="text-gray-400">FP Rate: </span>
                                  <span className="text-white">{(rule.falsePositiveRate * 100).toFixed(1)}%</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2">
                              <Button variant="ghost" size="sm">
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-400">
                      <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No correlation rules found</p>
                      <p className="text-sm mt-2">
                        {searchTerm || filterType !== 'all' || filterStatus !== 'all'
                          ? 'Try adjusting your filters'
                          : 'Create your first correlation rule to get started'}
                      </p>
                    </div>
                  )}
                </Card>
              </div>

              {/* Rule Details Panel */}
              <div className="col-span-4">
                <Card className="p-4">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    {selectedRule ? 'Rule Details' : 'Select a Rule'}
                  </h3>
                  
                  {selectedRule ? (
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-white">{selectedRule.name}</h4>
                        <Badge
                          className={STATUS_COLORS[selectedRule.status as keyof typeof STATUS_COLORS]}
                          variant="outline"
                        >
                          {selectedRule.status}
                        </Badge>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-gray-300">Description</label>
                        <p className="text-sm text-white mt-1">{selectedRule.description}</p>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-gray-300">Type</label>
                        <p className="text-sm text-white mt-1">{selectedRule.correlationType}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-semibold text-gray-300">Confidence</label>
                          <p className="text-sm text-white">{selectedRule.confidence}%</p>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-300">Threshold</label>
                          <p className="text-sm text-white">{selectedRule.threshold}</p>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-gray-300">Time Window</label>
                        <p className="text-sm text-white">{selectedRule.timeWindow}s</p>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-gray-300">Rules</label>
                        <div className="space-y-2 mt-1">
                          {selectedRule.rules.map((rule) => (
                            <div key={rule.id} className="p-2 bg-gray-900 rounded text-xs">
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline" className="text-xs">
                                  {rule.field}
                                </Badge>
                                <span className="text-gray-400">{rule.operator}</span>
                                <span className="text-white">{rule.value}</span>
                                <span className="text-gray-400">({rule.weight})</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-gray-300">Logic</label>
                        <p className="text-sm text-white">{selectedRule.logic}</p>
                      </div>

                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1">
                          <Eye className="w-4 h-4 mr-1" />
                          Test
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-400">
                      <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Select a rule to view details</p>
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}

          {selectedTab === 'matches' && (
            <Card className="p-4">
              <h3 className="text-lg font-semibold text-white mb-4">Recent Correlation Matches</h3>
              
              {recentMatches.length > 0 ? (
                <div className="space-y-4">
                  {recentMatches.slice(0, 20).map((match) => (
                    <div key={match.id} className="p-4 border border-gray-700 rounded-lg bg-gray-800/50">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-white">{match.correlation.name}</h4>
                          <Badge variant="outline" className="text-xs mt-1">
                            {match.correlation.correlationType}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-400">
                            {new Date(match.match.timestamp).toLocaleString()}
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              match.match.confidence > 0.8 ? 'text-green-400 bg-green-500/10' :
                              match.match.confidence > 0.6 ? 'text-yellow-400 bg-yellow-500/10' :
                              'text-gray-400 bg-gray-500/10'
                            }`}
                          >
                            {(match.match.confidence * 100).toFixed(0)}% confidence
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <label className="text-xs font-semibold text-gray-300">Events</label>
                          <p className="text-sm text-white">{match.events.length}</p>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-300">Indicators</label>
                          <p className="text-sm text-white">{match.indicators.length}</p>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-gray-300">Reasoning</label>
                        <p className="text-sm text-gray-300 mt-1">{match.match.details.reasoning}</p>
                      </div>

                      <div className="flex items-center space-x-2 mt-3">
                        {match.match.details.matchingFields.map((field) => (
                          <Badge key={field} variant="outline" className="text-xs">
                            {field}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <Link className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No recent matches</p>
                  <p className="text-sm mt-2">Correlation matches will appear here</p>
                </div>
              )}
            </Card>
          )}

          {selectedTab === 'alerts' && (
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Real-time Alerts</h3>
                <Button variant="outline" size="sm" onClick={() => setRealtimeAlerts([])}>
                  Clear All
                </Button>
              </div>
              
              {realtimeAlerts.length > 0 ? (
                <div className="space-y-3">
                  {realtimeAlerts.map((alert, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-3 rounded-lg border-l-4 ${
                        alert.severity === 'HIGH' ? 'border-red-500 bg-red-500/10' :
                        alert.severity === 'MEDIUM' ? 'border-yellow-500 bg-yellow-500/10' :
                        'border-blue-500 bg-blue-500/10'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <AlertTriangle className={`w-4 h-4 ${
                              alert.severity === 'HIGH' ? 'text-red-400' :
                              alert.severity === 'MEDIUM' ? 'text-yellow-400' :
                              'text-blue-400'
                            }`} />
                            <span className="font-semibold text-white">
                              {alert.correlation.name}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                alert.severity === 'HIGH' ? 'text-red-400 border-red-500/20' :
                                alert.severity === 'MEDIUM' ? 'text-yellow-400 border-yellow-500/20' :
                                'text-blue-400 border-blue-500/20'
                              }`}
                            >
                              {alert.severity}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-300 mt-1">
                            Correlation match with {(alert.confidence * 100).toFixed(0)}% confidence
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-400">
                            {new Date(alert.timestamp).toLocaleTimeString()}
                          </div>
                          <Clock className="w-3 h-3 text-gray-400 mt-1" />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No recent alerts</p>
                  <p className="text-sm mt-2">Correlation alerts will appear here</p>
                </div>
              )}
            </Card>
          )}

          {selectedTab === 'analytics' && (
            <Card className="p-4">
              <h3 className="text-lg font-semibold text-white mb-4">Correlation Analytics</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-900 rounded">
                  <div className="text-2xl font-bold text-white">{engineStats.totalRules}</div>
                  <div className="text-sm text-gray-400">Total Rules</div>
                </div>
                
                <div className="p-4 bg-gray-900 rounded">
                  <div className="text-2xl font-bold text-green-400">{engineStats.activeRules}</div>
                  <div className="text-sm text-gray-400">Active Rules</div>
                </div>
                
                <div className="p-4 bg-gray-900 rounded">
                  <div className="text-2xl font-bold text-purple-400">{engineStats.totalMatches}</div>
                  <div className="text-sm text-gray-400">Total Matches</div>
                </div>
                
                <div className="p-4 bg-gray-900 rounded">
                  <div className="text-2xl font-bold text-yellow-400">
                    {engineStats.avgEffectiveness.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-400">Avg Effectiveness</div>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="font-semibold text-white mb-3">Rule Performance</h4>
                <div className="space-y-3">
                  {correlationRules
                    .sort((a, b) => b.effectivenessScore - a.effectivenessScore)
                    .slice(0, 10)
                    .map((rule) => (
                      <div key={rule.id} className="flex items-center justify-between p-3 bg-gray-900 rounded">
                        <div>
                          <div className="font-medium text-white">{rule.name}</div>
                          <div className="text-sm text-gray-400">{rule.correlationType}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-white">
                            {rule.effectivenessScore.toFixed(1)}%
                          </div>
                          <div className="text-xs text-gray-400">
                            {rule.matchCount} matches
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default CorrelationEnginePanel;
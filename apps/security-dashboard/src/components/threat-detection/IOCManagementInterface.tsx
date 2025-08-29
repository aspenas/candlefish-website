import React, { useMemo, useState, useCallback } from 'react';
import { useLazyQuery, useMutation } from '@apollo/client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  Search, 
  Filter, 
  Plus, 
  Download, 
  Upload, 
  Copy, 
  ExternalLink, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Globe,
  Shield,
  Target,
  Hash
} from 'lucide-react';

// Components
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Tooltip } from '../ui/Tooltip';
import { Select } from '../ui/Select';

// GraphQL
import { SEARCH_SIMILAR_IOCS } from '../../graphql/queries/threat-detection.graphql';

// Types
import { SecurityEvent, Severity } from '../../types/security';

interface IOCManagementInterfaceProps {
  events: SecurityEvent[];
  className?: string;
  maxIOCs?: number;
  enableSimilaritySearch?: boolean;
}

interface IOC {
  id: string;
  type: IOCType;
  value: string;
  confidence: number;
  severity: Severity;
  source: string;
  firstSeen: string;
  lastSeen: string;
  tags: string[];
  description: string;
  tlp: 'WHITE' | 'GREEN' | 'AMBER' | 'RED';
  status: 'ACTIVE' | 'EXPIRED' | 'DEPRECATED' | 'PENDING';
  falsePositive: boolean;
  reputation: {
    score: number;
    classification: 'MALICIOUS' | 'SUSPICIOUS' | 'BENIGN' | 'UNKNOWN';
    sources: Array<{
      name: string;
      score: number;
      lastUpdated: string;
    }>;
  };
  relatedEvents: Array<{
    id: string;
    timestamp: string;
    severity: Severity;
    type: string;
  }>;
  enrichment?: {
    geoLocation?: {
      country: string;
      region: string;
      organization: string;
      isp: string;
    };
    whoisData?: any;
    threatIntelligence?: {
      campaigns: string[];
      threatActors: string[];
      malwareFamilies: string[];
    };
  };
}

type IOCType = 'IP' | 'DOMAIN' | 'URL' | 'HASH' | 'EMAIL' | 'FILE_PATH' | 'REGISTRY_KEY' | 'MUTEX' | 'USER_AGENT';

const IOC_TYPE_ICONS = {
  IP: Globe,
  DOMAIN: Globe,
  URL: ExternalLink,
  HASH: Hash,
  EMAIL: '@',
  FILE_PATH: '📁',
  REGISTRY_KEY: '🔑',
  MUTEX: '🔒',
  USER_AGENT: '🌐'
};

const IOC_TYPE_COLORS = {
  IP: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  DOMAIN: 'text-green-400 bg-green-500/10 border-green-500/20',
  URL: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  HASH: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  EMAIL: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
  FILE_PATH: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  REGISTRY_KEY: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  MUTEX: 'text-red-400 bg-red-500/10 border-red-500/20',
  USER_AGENT: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
};

const TLP_COLORS = {
  WHITE: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
  GREEN: 'text-green-400 bg-green-500/10 border-green-500/20',
  AMBER: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  RED: 'text-red-400 bg-red-500/10 border-red-500/20'
};

const STATUS_COLORS = {
  ACTIVE: 'text-green-400 bg-green-500/10 border-green-500/20',
  EXPIRED: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
  DEPRECATED: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  PENDING: 'text-blue-400 bg-blue-500/10 border-blue-500/20'
};

const REPUTATION_COLORS = {
  MALICIOUS: 'text-red-400',
  SUSPICIOUS: 'text-orange-400',
  BENIGN: 'text-green-400',
  UNKNOWN: 'text-gray-400'
};

// Extract IOCs from security events
const extractIOCsFromEvents = (events: SecurityEvent[]): IOC[] => {
  const iocMap = new Map<string, IOC>();

  events.forEach(event => {
    if (event.indicators) {
      event.indicators.forEach(indicator => {
        const key = `${indicator.type}-${indicator.value}`;
        
        if (!iocMap.has(key)) {
          iocMap.set(key, {
            id: key,
            type: indicator.type as IOCType,
            value: indicator.value,
            confidence: indicator.confidence,
            severity: event.severity,
            source: indicator.source || event.source,
            firstSeen: indicator.firstSeen || event.timestamp,
            lastSeen: indicator.lastSeen || event.timestamp,
            tags: event.tags || [],
            description: `IOC from ${event.type} event`,
            tlp: inferTLP(event.severity),
            status: 'ACTIVE',
            falsePositive: event.falsePositiveProbability ? event.falsePositiveProbability > 0.7 : false,
            reputation: {
              score: calculateReputationScore(indicator.confidence, event.severity),
              classification: classifyIOC(indicator.confidence, event.severity),
              sources: [{
                name: event.source,
                score: indicator.confidence,
                lastUpdated: event.timestamp
              }]
            },
            relatedEvents: [{
              id: event.id,
              timestamp: event.timestamp,
              severity: event.severity,
              type: event.type
            }],
            enrichment: event.geoLocation ? {
              geoLocation: {
                country: event.geoLocation.country,
                region: event.geoLocation.region,
                organization: event.geoLocation.organization || 'Unknown',
                isp: event.geoLocation.isp || 'Unknown'
              }
            } : undefined
          });
        } else {
          const ioc = iocMap.get(key)!;
          ioc.lastSeen = event.timestamp;
          ioc.relatedEvents.push({
            id: event.id,
            timestamp: event.timestamp,
            severity: event.severity,
            type: event.type
          });
          
          // Update confidence and reputation
          ioc.confidence = Math.max(ioc.confidence, indicator.confidence);
          ioc.reputation.score = Math.max(ioc.reputation.score, calculateReputationScore(indicator.confidence, event.severity));
          ioc.reputation.classification = classifyIOC(ioc.confidence, event.severity);
        }
      });
    }

    // Extract IPs from sourceIP and destinationIP
    if (event.sourceIP) {
      const key = `IP-${event.sourceIP}`;
      if (!iocMap.has(key)) {
        iocMap.set(key, createIPIOC(event.sourceIP, event, 'source'));
      }
    }

    if (event.destinationIP && event.destinationIP !== event.sourceIP) {
      const key = `IP-${event.destinationIP}`;
      if (!iocMap.has(key)) {
        iocMap.set(key, createIPIOC(event.destinationIP, event, 'destination'));
      }
    }
  });

  return Array.from(iocMap.values()).sort((a, b) => b.reputation.score - a.reputation.score);
};

const createIPIOC = (ip: string, event: SecurityEvent, type: 'source' | 'destination'): IOC => ({
  id: `IP-${ip}`,
  type: 'IP',
  value: ip,
  confidence: event.riskScore || 60,
  severity: event.severity,
  source: event.source,
  firstSeen: event.timestamp,
  lastSeen: event.timestamp,
  tags: [`${type}-ip`, ...(event.tags || [])],
  description: `${type.charAt(0).toUpperCase() + type.slice(1)} IP from ${event.type} event`,
  tlp: inferTLP(event.severity),
  status: 'ACTIVE',
  falsePositive: false,
  reputation: {
    score: event.riskScore || 60,
    classification: classifyIOC(event.riskScore || 60, event.severity),
    sources: [{
      name: event.source,
      score: event.riskScore || 60,
      lastUpdated: event.timestamp
    }]
  },
  relatedEvents: [{
    id: event.id,
    timestamp: event.timestamp,
    severity: event.severity,
    type: event.type
  }],
  enrichment: event.geoLocation ? {
    geoLocation: {
      country: event.geoLocation.country,
      region: event.geoLocation.region,
      organization: event.geoLocation.organization || 'Unknown',
      isp: event.geoLocation.isp || 'Unknown'
    }
  } : undefined
});

const inferTLP = (severity: Severity): IOC['tlp'] => {
  switch (severity) {
    case 'CRITICAL': return 'RED';
    case 'HIGH': return 'AMBER';
    case 'MEDIUM': return 'GREEN';
    case 'LOW': return 'WHITE';
    default: return 'WHITE';
  }
};

const calculateReputationScore = (confidence: number, severity: Severity): number => {
  let score = confidence;
  
  switch (severity) {
    case 'CRITICAL': score += 20; break;
    case 'HIGH': score += 15; break;
    case 'MEDIUM': score += 10; break;
    case 'LOW': score += 5; break;
  }
  
  return Math.min(100, score);
};

const classifyIOC = (confidence: number, severity: Severity): IOC['reputation']['classification'] => {
  if (confidence >= 80 && ['CRITICAL', 'HIGH'].includes(severity)) return 'MALICIOUS';
  if (confidence >= 60 || severity === 'MEDIUM') return 'SUSPICIOUS';
  if (confidence >= 40) return 'UNKNOWN';
  return 'BENIGN';
};

export const IOCManagementInterface: React.FC<IOCManagementInterfaceProps> = ({
  events,
  className = '',
  maxIOCs = 100,
  enableSimilaritySearch = true
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<IOCType[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterTLP, setFilterTLP] = useState<string[]>([]);
  const [selectedIOC, setSelectedIOC] = useState<IOC | null>(null);
  const [sortBy, setSortBy] = useState<'reputation' | 'confidence' | 'lastSeen' | 'relatedEvents'>('reputation');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'timeline'>('list');

  // Extract IOCs from events
  const iocs = useMemo(() => extractIOCsFromEvents(events), [events]);

  // Similarity search
  const [searchSimilarIOCs] = useLazyQuery(SEARCH_SIMILAR_IOCS);

  // Filter and sort IOCs
  const filteredIOCs = useMemo(() => {
    let filtered = iocs.filter(ioc => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          ioc.value.toLowerCase().includes(searchLower) ||
          ioc.description.toLowerCase().includes(searchLower) ||
          ioc.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
          ioc.source.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }

      // Type filter
      if (filterType.length > 0 && !filterType.includes(ioc.type)) {
        return false;
      }

      // Status filter
      if (filterStatus.length > 0 && !filterStatus.includes(ioc.status)) {
        return false;
      }

      // TLP filter
      if (filterTLP.length > 0 && !filterTLP.includes(ioc.tlp)) {
        return false;
      }

      return true;
    });

    // Sort IOCs
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'reputation':
          return b.reputation.score - a.reputation.score;
        case 'confidence':
          return b.confidence - a.confidence;
        case 'lastSeen':
          return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
        case 'relatedEvents':
          return b.relatedEvents.length - a.relatedEvents.length;
        default:
          return b.reputation.score - a.reputation.score;
      }
    });

    return filtered.slice(0, maxIOCs);
  }, [iocs, searchTerm, filterType, filterStatus, filterTLP, sortBy, maxIOCs]);

  const handleCopyIOC = useCallback((value: string) => {
    navigator.clipboard.writeText(value);
    // You could add a toast notification here
  }, []);

  const handleSimilaritySearch = useCallback(async (ioc: IOC) => {
    if (enableSimilaritySearch) {
      try {
        const { data } = await searchSimilarIOCs({
          variables: {
            ioc: ioc.value,
            threshold: 0.8,
            limit: 10
          }
        });
        
        console.log('Similar IOCs:', data?.searchSimilarIOCs);
        // Handle similar IOCs result
      } catch (error) {
        console.error('Similarity search failed:', error);
      }
    }
  }, [searchSimilarIOCs, enableSimilaritySearch]);

  const IOCCard: React.FC<{ ioc: IOC; index: number }> = ({ ioc, index }) => {
    const IconComponent = IOC_TYPE_ICONS[ioc.type];
    const isSelected = selectedIOC?.id === ioc.id;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.02 }}
        className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
          isSelected
            ? 'border-blue-500 bg-blue-500/10 shadow-md'
            : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'
        } ${ioc.falsePositive ? 'opacity-60' : ''}`}
        onClick={() => setSelectedIOC(isSelected ? null : ioc)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${IOC_TYPE_COLORS[ioc.type]}`}>
              {typeof IconComponent === 'string' ? (
                <span className="text-sm">{IconComponent}</span>
              ) : (
                <IconComponent className="w-4 h-4" />
              )}
            </div>
            <div>
              <Badge className={IOC_TYPE_COLORS[ioc.type]} variant="outline">
                {ioc.type}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge className={TLP_COLORS[ioc.tlp]} variant="outline" size="sm">
              TLP:{ioc.tlp}
            </Badge>
            <Badge className={STATUS_COLORS[ioc.status]} variant="outline" size="sm">
              {ioc.status}
            </Badge>
            <div className={`text-xs font-bold px-2 py-1 rounded ${
              ioc.reputation.score >= 80 ? 'bg-red-900 text-red-300' :
              ioc.reputation.score >= 60 ? 'bg-orange-900 text-orange-300' :
              ioc.reputation.score >= 40 ? 'bg-yellow-900 text-yellow-300' :
              'bg-green-900 text-green-300'
            }`}>
              {ioc.reputation.score}
            </div>
          </div>
        </div>

        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-sm text-white break-all">{ioc.value}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleCopyIOC(ioc.value);
              }}
              className="p-1 h-6 w-6"
            >
              <Copy className="w-3 h-3" />
            </Button>
          </div>
          <p className="text-xs text-gray-400">{ioc.description}</p>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
          <div className="flex items-center space-x-4">
            <span>Confidence: {ioc.confidence}%</span>
            <span className={REPUTATION_COLORS[ioc.reputation.classification]}>
              {ioc.reputation.classification}
            </span>
            <span>Events: {ioc.relatedEvents.length}</span>
          </div>
          <div className="flex items-center space-x-2">
            {ioc.falsePositive && (
              <Tooltip content="Marked as false positive">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
              </Tooltip>
            )}
            <span>{new Date(ioc.lastSeen).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Tags */}
        {ioc.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {ioc.tags.slice(0, 3).map((tag, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {ioc.tags.length > 3 && (
              <Badge variant="outline" className="text-xs text-gray-400">
                +{ioc.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Enrichment Data */}
        {ioc.enrichment?.geoLocation && (
          <div className="text-xs text-gray-400 space-y-1">
            <div className="flex items-center space-x-2">
              <Globe className="w-3 h-3" />
              <span>{ioc.enrichment.geoLocation.country}, {ioc.enrichment.geoLocation.region}</span>
            </div>
            {ioc.enrichment.geoLocation.organization !== 'Unknown' && (
              <div className="ml-5 text-xs text-gray-500">
                {ioc.enrichment.geoLocation.organization} ({ioc.enrichment.geoLocation.isp})
              </div>
            )}
          </div>
        )}

        {/* Expanded Details */}
        <AnimatePresence>
          {isSelected && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="pt-4 mt-4 border-t border-gray-700 space-y-4"
            >
              {/* Related Events */}
              <div>
                <h5 className="text-sm font-semibold text-white mb-2">
                  Related Events ({ioc.relatedEvents.length})
                </h5>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {ioc.relatedEvents.slice(0, 5).map((event, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs p-2 bg-gray-900 rounded">
                      <div className="flex items-center space-x-2">
                        <Badge 
                          className={
                            event.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                            event.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400' :
                            event.severity === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-blue-500/20 text-blue-400'
                          }
                          variant="outline"
                        >
                          {event.severity}
                        </Badge>
                        <span className="text-gray-300">{event.type}</span>
                      </div>
                      <span className="text-gray-400">
                        {new Date(event.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reputation Sources */}
              <div>
                <h5 className="text-sm font-semibold text-white mb-2">Reputation Sources</h5>
                <div className="space-y-1">
                  {ioc.reputation.sources.map((source, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="text-gray-300">{source.name}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full" 
                            style={{ width: `${source.score}%` }}
                          />
                        </div>
                        <span className="text-gray-400">{source.score}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSimilaritySearch(ioc);
                  }}
                  disabled={!enableSimilaritySearch}
                >
                  <Search className="w-3 h-3 mr-1" />
                  Similar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Lookup
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Target className="w-3 h-3 mr-1" />
                  Hunt
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <Card className={`${className}`}>
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <Zap className="w-5 h-5 mr-2" />
            IOC Management ({filteredIOCs.length})
          </h3>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Upload className="w-4 h-4 mr-1" />
              Import
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add IOC
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search IOCs, values, tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-300">Type:</span>
                {Object.keys(IOC_TYPE_COLORS).map((type) => (
                  <Badge
                    key={type}
                    variant={filterType.includes(type as IOCType) ? "default" : "outline"}
                    className={`cursor-pointer text-xs ${
                      filterType.includes(type as IOCType) 
                        ? IOC_TYPE_COLORS[type as IOCType]
                        : ''
                    }`}
                    onClick={() => {
                      setFilterType(prev => 
                        prev.includes(type as IOCType)
                          ? prev.filter(t => t !== type)
                          : [...prev, type as IOCType]
                      );
                    }}
                  >
                    {type}
                  </Badge>
                ))}
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm"
              >
                <option value="reputation">Reputation Score</option>
                <option value="confidence">Confidence</option>
                <option value="lastSeen">Last Seen</option>
                <option value="relatedEvents">Related Events</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                List
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                Grid
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 max-h-[600px] overflow-y-auto">
        {filteredIOCs.length > 0 ? (
          <div className={`space-y-4 ${viewMode === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 gap-4' : ''}`}>
            {filteredIOCs.map((ioc, index) => (
              <IOCCard key={ioc.id} ioc={ioc} index={index} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No IOCs found</p>
            <p className="text-sm mt-2">
              {searchTerm || filterType.length > 0 || filterStatus.length > 0
                ? 'Adjust your filters to see results'
                : 'IOCs will be extracted from security events'}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default IOCManagementInterface;
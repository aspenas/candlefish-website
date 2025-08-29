import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  AlertTriangle,
  Eye,
  Clock,
  MapPin,
  Users,
  Target,
  Database,
  ExternalLink,
  TrendingUp,
  Activity,
  Search,
  Filter
} from 'lucide-react';

// Components
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

// Types
interface RecentThreatsListProps {
  threats: any[];
  threatUpdates?: any;
  iocMatches?: any;
  newIOCs?: any;
  organizationId: string;
  className?: string;
}

interface ThreatItem {
  id: string;
  title: string;
  description: string;
  severity: string;
  confidence: string;
  threatType: string;
  category: string;
  firstSeen: string;
  lastSeen: string;
  lastUpdated: string;
  attribution?: {
    actor?: string;
    campaign?: string;
    country?: string;
  };
  indicators?: Array<{
    type: string;
    value: string;
    confidence: string;
  }>;
  targetedSectors: string[];
  targetedRegions: string[];
  tags: string[];
  sources: Array<{
    name: string;
    reliability: string;
  }>;
}

const SEVERITY_COLORS = {
  CRITICAL: 'text-red-400 bg-red-500/10 border-red-500/20',
  HIGH: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  MEDIUM: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  LOW: 'text-blue-400 bg-blue-500/10 border-blue-500/20'
};

const CONFIDENCE_COLORS = {
  CONFIRMED: 'text-green-400 bg-green-500/10 border-green-500/20',
  HIGH: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  MEDIUM: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  LOW: 'text-gray-400 bg-gray-500/10 border-gray-500/20'
};

const THREAT_TYPE_ICONS = {
  MALWARE: Shield,
  APT: Users,
  PHISHING: AlertTriangle,
  RANSOMWARE: Database,
  BOTNET: Activity,
  EXPLOIT_KIT: Target,
  TROJAN: Shield,
  BACKDOOR: Shield,
  ROOTKIT: Shield,
  KEYLOGGER: Eye,
  SPYWARE: Eye,
  ADWARE: Shield,
  WORM: Activity,
  VIRUS: Shield,
  SCAM: AlertTriangle,
  FRAUD: AlertTriangle,
  INSIDER_THREAT: Users,
  SUPPLY_CHAIN: Target,
  WATERING_HOLE: Target,
  SOCIAL_ENGINEERING: Users
};

export const RecentThreatsList: React.FC<RecentThreatsListProps> = ({
  threats,
  threatUpdates,
  iocMatches,
  newIOCs,
  organizationId,
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [expandedThreat, setExpandedThreat] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>('lastUpdated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Combine real-time updates with threats
  const combinedThreats = useMemo(() => {
    const threatsList: ThreatItem[] = [...(threats || [])];
    
    // Add threats from real-time updates
    if (threatUpdates?.data?.threatIntelligenceUpdates?.threat) {
      const realtimeThreat = threatUpdates.data.threatIntelligenceUpdates.threat;
      const existingIndex = threatsList.findIndex(t => t.id === realtimeThreat.id);
      
      if (existingIndex >= 0) {
        threatsList[existingIndex] = realtimeThreat;
      } else {
        threatsList.unshift(realtimeThreat);
      }
    }

    return threatsList;
  }, [threats, threatUpdates]);

  // Filter and search threats
  const filteredThreats = useMemo(() => {
    return combinedThreats.filter((threat) => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          threat.title.toLowerCase().includes(searchLower) ||
          threat.description.toLowerCase().includes(searchLower) ||
          threat.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
          threat.attribution?.actor?.toLowerCase().includes(searchLower) ||
          threat.attribution?.campaign?.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }

      // Severity filter
      if (filterSeverity.length > 0 && !filterSeverity.includes(threat.severity)) {
        return false;
      }

      // Type filter
      if (filterType !== 'all' && threat.threatType !== filterType) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      const aValue = a[sortBy as keyof ThreatItem] || '';
      const bValue = b[sortBy as keyof ThreatItem] || '';
      
      if (sortOrder === 'desc') {
        return bValue > aValue ? 1 : -1;
      } else {
        return aValue > bValue ? 1 : -1;
      }
    });
  }, [combinedThreats, searchTerm, filterSeverity, filterType, sortBy, sortOrder]);

  // Get threat type icon
  const getThreatTypeIcon = (type: string) => {
    return THREAT_TYPE_ICONS[type as keyof typeof THREAT_TYPE_ICONS] || Shield;
  };

  // Calculate time ago
  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  return (
    <Card className={`${className}`}>
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            Recent Threat Intelligence
          </h3>
          
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              {filteredThreats.length} threats
            </Badge>
            
            {/* Real-time indicators */}
            {(threatUpdates?.data || iocMatches?.data || newIOCs?.data) && (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/20 animate-pulse">
                <Activity className="w-3 h-3 mr-1" />
                Live
              </Badge>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search threats..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Severity Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <div className="flex space-x-1">
              {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((severity) => (
                <Badge
                  key={severity}
                  variant={filterSeverity.includes(severity) ? "default" : "outline"}
                  className={`cursor-pointer text-xs ${
                    filterSeverity.includes(severity) 
                      ? SEVERITY_COLORS[severity]
                      : ''
                  }`}
                  onClick={() => {
                    setFilterSeverity(prev => 
                      prev.includes(severity)
                        ? prev.filter(s => s !== severity)
                        : [...prev, severity]
                    );
                  }}
                >
                  {severity}
                </Badge>
              ))}
            </div>
          </div>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
          >
            <option value="all">All Types</option>
            {Object.keys(THREAT_TYPE_ICONS).map(type => (
              <option key={type} value={type}>
                {type.replace('_', ' ')}
              </option>
            ))}
          </select>

          {/* Sort Options */}
          <div className="flex items-center space-x-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
            >
              <option value="lastUpdated">Last Updated</option>
              <option value="firstSeen">First Seen</option>
              <option value="severity">Severity</option>
              <option value="confidence">Confidence</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {filteredThreats.length > 0 ? (
          <div className="divide-y divide-gray-700">
            <AnimatePresence>
              {filteredThreats.map((threat, index) => {
                const ThreatIcon = getThreatTypeIcon(threat.threatType);
                const isExpanded = expandedThreat === threat.id;
                
                return (
                  <motion.div
                    key={threat.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className={`p-4 cursor-pointer transition-all duration-200 ${
                      isExpanded
                        ? 'bg-blue-500/10 border-l-4 border-blue-500'
                        : 'hover:bg-gray-800/50'
                    }`}
                    onClick={() => setExpandedThreat(isExpanded ? null : threat.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <ThreatIcon className="w-5 h-5 text-blue-400 mt-1" />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-semibold text-white truncate">
                              {threat.title}
                            </h4>
                            <Badge 
                              className={SEVERITY_COLORS[threat.severity as keyof typeof SEVERITY_COLORS]}
                              variant="outline"
                            >
                              {threat.severity}
                            </Badge>
                            <Badge
                              className={CONFIDENCE_COLORS[threat.confidence as keyof typeof CONFIDENCE_COLORS]}
                              variant="outline"
                            >
                              {threat.confidence}
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-gray-300 mb-3 line-clamp-2">
                            {threat.description}
                          </p>

                          <div className="flex items-center space-x-4 text-xs text-gray-400">
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{getTimeAgo(threat.lastUpdated)}</span>
                            </div>
                            
                            {threat.attribution?.actor && (
                              <div className="flex items-center space-x-1">
                                <Users className="w-3 h-3" />
                                <span>{threat.attribution.actor}</span>
                              </div>
                            )}
                            
                            {threat.targetedRegions.length > 0 && (
                              <div className="flex items-center space-x-1">
                                <MapPin className="w-3 h-3" />
                                <span>{threat.targetedRegions[0]}</span>
                                {threat.targetedRegions.length > 1 && (
                                  <span>+{threat.targetedRegions.length - 1}</span>
                                )}
                              </div>
                            )}
                            
                            {threat.indicators && threat.indicators.length > 0 && (
                              <div className="flex items-center space-x-1">
                                <Database className="w-3 h-3" />
                                <span>{threat.indicators.length} IOCs</span>
                              </div>
                            )}
                          </div>

                          {/* Tags */}
                          {threat.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {threat.tags.slice(0, 3).map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {threat.tags.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{threat.tags.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="pt-4 mt-4 border-t border-gray-700"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Attribution */}
                            {threat.attribution && (
                              <div>
                                <h5 className="text-sm font-semibold text-white mb-2">Attribution</h5>
                                <div className="space-y-1 text-sm">
                                  {threat.attribution.actor && (
                                    <div>
                                      <span className="text-gray-400">Actor: </span>
                                      <span className="text-white">{threat.attribution.actor}</span>
                                    </div>
                                  )}
                                  {threat.attribution.campaign && (
                                    <div>
                                      <span className="text-gray-400">Campaign: </span>
                                      <span className="text-white">{threat.attribution.campaign}</span>
                                    </div>
                                  )}
                                  {threat.attribution.country && (
                                    <div>
                                      <span className="text-gray-400">Country: </span>
                                      <span className="text-white">{threat.attribution.country}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Targeting */}
                            <div>
                              <h5 className="text-sm font-semibold text-white mb-2">Targeting</h5>
                              <div className="space-y-2">
                                {threat.targetedSectors.length > 0 && (
                                  <div>
                                    <span className="text-xs text-gray-400">Sectors: </span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {threat.targetedSectors.slice(0, 3).map(sector => (
                                        <Badge key={sector} variant="outline" className="text-xs">
                                          {sector}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {threat.targetedRegions.length > 0 && (
                                  <div>
                                    <span className="text-xs text-gray-400">Regions: </span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {threat.targetedRegions.slice(0, 3).map(region => (
                                        <Badge key={region} variant="outline" className="text-xs">
                                          {region}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Indicators */}
                            {threat.indicators && threat.indicators.length > 0 && (
                              <div>
                                <h5 className="text-sm font-semibold text-white mb-2">
                                  Indicators ({threat.indicators.length})
                                </h5>
                                <div className="space-y-1 max-h-24 overflow-y-auto">
                                  {threat.indicators.slice(0, 5).map((indicator, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-xs p-2 bg-gray-900 rounded">
                                      <div className="flex items-center space-x-2">
                                        <Badge variant="outline" className="text-xs">
                                          {indicator.type}
                                        </Badge>
                                        <span className="font-mono text-gray-300 truncate">
                                          {indicator.value}
                                        </span>
                                      </div>
                                      <Badge
                                        variant="outline"
                                        className={`text-xs ${CONFIDENCE_COLORS[indicator.confidence as keyof typeof CONFIDENCE_COLORS]}`}
                                      >
                                        {indicator.confidence}
                                      </Badge>
                                    </div>
                                  ))}
                                  {threat.indicators.length > 5 && (
                                    <div className="text-xs text-gray-400 text-center py-1">
                                      +{threat.indicators.length - 5} more indicators
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Sources */}
                            <div>
                              <h5 className="text-sm font-semibold text-white mb-2">Sources</h5>
                              <div className="space-y-1">
                                {threat.sources.slice(0, 3).map((source, idx) => (
                                  <div key={idx} className="flex items-center justify-between text-xs p-2 bg-gray-900 rounded">
                                    <span className="text-white">{source.name}</span>
                                    <Badge
                                      variant="outline"
                                      className={`text-xs ${
                                        source.reliability === 'COMPLETELY_RELIABLE' ? 'text-green-400 bg-green-500/10' :
                                        source.reliability === 'USUALLY_RELIABLE' ? 'text-blue-400 bg-blue-500/10' :
                                        'text-yellow-400 bg-yellow-500/10'
                                      }`}
                                    >
                                      {source.reliability}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Timeline */}
                          <div className="mt-4 pt-4 border-t border-gray-700">
                            <div className="flex items-center space-x-6 text-xs text-gray-400">
                              <div>
                                <span className="text-gray-500">First Seen: </span>
                                <span className="text-white">
                                  {new Date(threat.firstSeen).toLocaleString()}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Last Seen: </span>
                                <span className="text-white">
                                  {new Date(threat.lastSeen).toLocaleString()}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Updated: </span>
                                <span className="text-white">
                                  {new Date(threat.lastUpdated).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No recent threats found</p>
            <p className="text-sm mt-2">
              {searchTerm || filterSeverity.length > 0 || filterType !== 'all'
                ? 'Try adjusting your filters'
                : 'Threat intelligence will appear here as it\'s collected'}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default RecentThreatsList;
import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  Globe, 
  Target, 
  Activity, 
  Calendar, 
  TrendingUp, 
  AlertTriangle,
  ExternalLink,
  Info,
  Filter,
  Search,
  Zap
} from 'lucide-react';

// Components
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Avatar } from '../ui/Avatar';
import { Progress } from '../ui/Progress';

// Types
import { SecurityEvent, Severity } from '../../types/security';

interface ThreatActorAttributionCardsProps {
  events: SecurityEvent[];
  className?: string;
  maxActors?: number;
  showDetails?: boolean;
}

interface ThreatActorInfo {
  id: string;
  name: string;
  aliases: string[];
  country: string;
  region: string;
  motivation: string;
  sophistication: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  targetSectors: string[];
  firstSeen: string;
  lastSeen: string;
  confidence: number;
  eventCount: number;
  severityBreakdown: Record<Severity, number>;
  campaigns: Array<{
    id: string;
    name: string;
    description: string;
    startDate: string;
    endDate?: string;
    attribution: string;
  }>;
  ttps: Array<{
    tacticId: string;
    techniqueId: string;
    description: string;
  }>;
  indicators: Array<{
    type: string;
    value: string;
    confidence: number;
  }>;
  riskScore: number;
  trend: number;
}

const SOPHISTICATION_COLORS = {
  LOW: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  MEDIUM: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  HIGH: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  CRITICAL: 'text-red-400 bg-red-500/10 border-red-500/20'
};

const MOTIVATION_ICONS = {
  'Financial': '💰',
  'Espionage': '🕵️',
  'Hacktivism': '✊',
  'Cyber Crime': '🔒',
  'State-Sponsored': '🏛️',
  'Terrorism': '💥',
  'Unknown': '❓'
};

const COUNTRY_FLAGS = {
  'Russia': '🇷🇺',
  'China': '🇨🇳',
  'North Korea': '🇰🇵',
  'Iran': '🇮🇷',
  'USA': '🇺🇸',
  'Unknown': '🏴‍☠️'
};

// Mock threat actor data generation
const generateThreatActorData = (events: SecurityEvent[]): ThreatActorInfo[] => {
  const actorMap = new Map<string, ThreatActorInfo>();

  events.forEach(event => {
    if (event.threatLevel && ['HIGH', 'CRITICAL'].includes(event.threatLevel) && 
        event.geoLocation && event.mitreAttackTactics) {
      
      // Generate actor based on geo location and threat patterns
      const actorName = generateActorName(event.geoLocation.country, event.threatLevel);
      
      if (!actorMap.has(actorName)) {
        actorMap.set(actorName, {
          id: actorName.toLowerCase().replace(/\\s+/g, '-'),
          name: actorName,
          aliases: generateAliases(actorName),
          country: event.geoLocation.country,
          region: event.geoLocation.region,
          motivation: inferMotivation(event.type, event.metadata),
          sophistication: event.threatLevel as any || 'MEDIUM',
          targetSectors: inferTargetSectors(event.asset?.type, event.metadata),
          firstSeen: event.timestamp,
          lastSeen: event.timestamp,
          confidence: calculateConfidence(event),
          eventCount: 0,
          severityBreakdown: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 },
          campaigns: generateCampaigns(actorName),
          ttps: event.mitreAttackTactics.map(tactic => ({
            tacticId: tactic.tacticId,
            techniqueId: tactic.techniques[0]?.techniqueId || '',
            description: tactic.techniques[0]?.techniqueName || tactic.tacticName
          })),
          indicators: event.indicators?.map(ind => ({
            type: ind.type,
            value: ind.value,
            confidence: ind.confidence
          })) || [],
          riskScore: calculateRiskScore(event),
          trend: Math.random() * 20 - 10 // Random trend for demo
        });
      }

      const actor = actorMap.get(actorName)!;
      actor.eventCount++;
      actor.severityBreakdown[event.severity]++;
      actor.lastSeen = event.timestamp;
      
      // Update confidence and risk score
      actor.confidence = Math.min(100, actor.confidence + calculateConfidence(event));
      actor.riskScore = Math.max(actor.riskScore, calculateRiskScore(event));
    }
  });

  return Array.from(actorMap.values())
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 20);
};

const generateActorName = (country: string, threatLevel: string): string => {
  const prefixes = ['APT', 'Dark', 'Shadow', 'Lazarus', 'Cozy', 'Fancy', 'Carbanak'];
  const suffixes = ['Bear', 'Panda', 'Kitten', 'Spider', 'Dragon', 'Wolf', 'Group'];
  const numbers = Math.floor(Math.random() * 99) + 1;
  
  if (country === 'Russia') return `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${suffixes[0]}`;
  if (country === 'China') return `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${suffixes[1]}`;
  if (country === 'North Korea') return `Lazarus ${numbers}`;
  if (country === 'Iran') return `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${suffixes[2]}`;
  
  return `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${numbers}`;
};

const generateAliases = (name: string): string[] => {
  const aliases = [];
  if (Math.random() > 0.5) aliases.push(`${name.split(' ')[0]}Group`);
  if (Math.random() > 0.5) aliases.push(`${name.replace(/\\s+/g, '')}`);
  return aliases;
};

const inferMotivation = (eventType: string, metadata: any): string => {
  if (eventType.includes('AUTHENTICATION') || eventType.includes('ACCESS')) return 'Espionage';
  if (eventType.includes('MALWARE') || eventType.includes('RANSOMWARE')) return 'Financial';
  if (metadata?.campaign) return 'State-Sponsored';
  return 'Cyber Crime';
};

const inferTargetSectors = (assetType?: string, metadata?: any): string[] => {
  const sectors = ['Financial', 'Healthcare', 'Government', 'Technology', 'Energy', 'Manufacturing'];
  return [sectors[Math.floor(Math.random() * sectors.length)]];
};

const calculateConfidence = (event: SecurityEvent): number => {
  let confidence = 50;
  if (event.indicators && event.indicators.length > 0) confidence += 20;
  if (event.mitreAttackTactics && event.mitreAttackTactics.length > 0) confidence += 15;
  if (event.geoLocation) confidence += 10;
  if (event.riskScore && event.riskScore > 70) confidence += 5;
  return Math.min(100, confidence);
};

const calculateRiskScore = (event: SecurityEvent): number => {
  let score = 0;
  if (event.severity === 'CRITICAL') score += 40;
  else if (event.severity === 'HIGH') score += 30;
  else if (event.severity === 'MEDIUM') score += 20;
  else score += 10;
  
  if (event.threatLevel === 'CRITICAL') score += 30;
  else if (event.threatLevel === 'HIGH') score += 20;
  
  return Math.min(100, score + (event.riskScore || 0));
};

const generateCampaigns = (actorName: string) => {
  const campaignNames = ['Operation Shadow', 'Project Dark', 'Silent Storm', 'Ghost Protocol'];
  return [{
    id: `${actorName}-campaign-1`,
    name: `${campaignNames[Math.floor(Math.random() * campaignNames.length)]}`,
    description: 'Multi-stage cyber espionage campaign',
    startDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
    attribution: actorName
  }];
};

export const ThreatActorAttributionCards: React.FC<ThreatActorAttributionCardsProps> = ({
  events,
  className = '',
  maxActors = 12,
  showDetails = true
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSophistication, setFilterSophistication] = useState<string[]>([]);
  const [filterMotivation, setFilterMotivation] = useState<string[]>([]);
  const [selectedActor, setSelectedActor] = useState<ThreatActorInfo | null>(null);
  const [sortBy, setSortBy] = useState<'riskScore' | 'eventCount' | 'confidence' | 'lastSeen'>('riskScore');

  // Generate threat actor data from events
  const threatActors = useMemo(() => {
    return generateThreatActorData(events);
  }, [events]);

  // Filter and sort actors
  const filteredActors = useMemo(() => {
    let filtered = threatActors.filter(actor => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          actor.name.toLowerCase().includes(searchLower) ||
          actor.aliases.some(alias => alias.toLowerCase().includes(searchLower)) ||
          actor.country.toLowerCase().includes(searchLower) ||
          actor.motivation.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }

      // Sophistication filter
      if (filterSophistication.length > 0 && 
          !filterSophistication.includes(actor.sophistication)) {
        return false;
      }

      // Motivation filter
      if (filterMotivation.length > 0 && 
          !filterMotivation.includes(actor.motivation)) {
        return false;
      }

      return true;
    });

    // Sort actors
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'riskScore':
          return b.riskScore - a.riskScore;
        case 'eventCount':
          return b.eventCount - a.eventCount;
        case 'confidence':
          return b.confidence - a.confidence;
        case 'lastSeen':
          return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
        default:
          return b.riskScore - a.riskScore;
      }
    });

    return filtered.slice(0, maxActors);
  }, [threatActors, searchTerm, filterSophistication, filterMotivation, sortBy, maxActors]);

  const uniqueMotivations = useMemo(() => 
    [...new Set(threatActors.map(actor => actor.motivation))],
    [threatActors]
  );

  return (
    <Card className={`${className}`}>
      <div className=\"p-4 border-b border-gray-700\">
        <div className=\"flex items-center justify-between mb-4\">
          <h3 className=\"text-lg font-semibold text-white flex items-center\">
            <Shield className=\"w-5 h-5 mr-2\" />
            Threat Actor Attribution ({filteredActors.length})
          </h3>
          <div className=\"flex items-center space-x-2\">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className=\"px-3 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm\"
            >
              <option value=\"riskScore\">Risk Score</option>
              <option value=\"eventCount\">Event Count</option>
              <option value=\"confidence\">Confidence</option>
              <option value=\"lastSeen\">Last Seen</option>
            </select>
          </div>
        </div>

        {/* Filters */}
        <div className=\"space-y-3\">
          <div className=\"relative\">
            <Search className=\"absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400\" />
            <Input
              placeholder=\"Search threat actors...\"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className=\"pl-10\"
            />
          </div>

          <div className=\"flex items-center space-x-4\">
            <div className=\"flex items-center space-x-2\">
              <Filter className=\"w-4 h-4 text-gray-400\" />
              <span className=\"text-sm text-gray-300\">Sophistication:</span>
              {Object.keys(SOPHISTICATION_COLORS).map((level) => (
                <Badge
                  key={level}
                  variant={filterSophistication.includes(level) ? \"default\" : \"outline\"}
                  className={`cursor-pointer text-xs ${
                    filterSophistication.includes(level) 
                      ? SOPHISTICATION_COLORS[level as keyof typeof SOPHISTICATION_COLORS]
                      : ''
                  }`}
                  onClick={() => {
                    setFilterSophistication(prev => 
                      prev.includes(level)
                        ? prev.filter(s => s !== level)
                        : [...prev, level]
                    );
                  }}
                >
                  {level}
                </Badge>
              ))}
            </div>

            <div className=\"flex items-center space-x-2\">
              <span className=\"text-sm text-gray-300\">Motivation:</span>
              {uniqueMotivations.map((motivation) => (
                <Badge
                  key={motivation}
                  variant={filterMotivation.includes(motivation) ? \"default\" : \"outline\"}
                  className=\"cursor-pointer text-xs\"
                  onClick={() => {
                    setFilterMotivation(prev => 
                      prev.includes(motivation)
                        ? prev.filter(m => m !== motivation)
                        : [...prev, motivation]
                    );
                  }}
                >
                  {MOTIVATION_ICONS[motivation as keyof typeof MOTIVATION_ICONS] || '❓'} {motivation}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className=\"p-4 max-h-[600px] overflow-y-auto\">
        {filteredActors.length > 0 ? (
          <div className=\"space-y-4\">
            {filteredActors.map((actor, index) => (
              <motion.div
                key={actor.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                  selectedActor?.id === actor.id
                    ? 'border-blue-500 bg-blue-500/10 shadow-md'
                    : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'
                }`}
                onClick={() => setSelectedActor(selectedActor?.id === actor.id ? null : actor)}
              >
                <div className=\"flex items-start justify-between mb-3\">
                  <div className=\"flex items-center space-x-3\">
                    <Avatar className=\"w-10 h-10 bg-gradient-to-br from-red-500 to-orange-600\">
                      <span className=\"text-white font-bold text-sm\">
                        {actor.name.split(' ').map(word => word[0]).join('')}
                      </span>
                    </Avatar>
                    <div>
                      <div className=\"flex items-center space-x-2 mb-1\">
                        <h4 className=\"font-semibold text-white\">{actor.name}</h4>
                        <span className=\"text-lg\">
                          {COUNTRY_FLAGS[actor.country as keyof typeof COUNTRY_FLAGS] || '🏴‍☠️'}
                        </span>
                      </div>
                      {actor.aliases.length > 0 && (
                        <p className=\"text-xs text-gray-400\">
                          aka: {actor.aliases.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className=\"text-right space-y-1\">
                    <div className=\"flex items-center space-x-2\">
                      <Badge 
                        className={SOPHISTICATION_COLORS[actor.sophistication]}
                        variant=\"outline\"
                      >
                        {actor.sophistication}
                      </Badge>
                      <div className={`px-2 py-1 rounded text-xs font-bold ${
                        actor.riskScore >= 80 ? 'bg-red-900 text-red-300' :
                        actor.riskScore >= 60 ? 'bg-orange-900 text-orange-300' :
                        actor.riskScore >= 40 ? 'bg-yellow-900 text-yellow-300' :
                        'bg-blue-900 text-blue-300'
                      }`}>
                        {actor.riskScore}
                      </div>
                    </div>
                    <div className=\"flex items-center space-x-1 text-xs text-gray-400\">
                      {actor.trend > 0 ? (
                        <TrendingUp className=\"w-3 h-3 text-red-400\" />
                      ) : (
                        <TrendingUp className=\"w-3 h-3 text-green-400 rotate-180\" />
                      )}
                      <span>{Math.abs(actor.trend).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                <div className=\"grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3\">
                  <div>
                    <span className=\"text-gray-400\">Events:</span>
                    <span className=\"ml-1 text-white font-medium\">{actor.eventCount}</span>
                  </div>
                  <div>
                    <span className=\"text-gray-400\">Confidence:</span>
                    <span className=\"ml-1 text-white font-medium\">{actor.confidence}%</span>
                  </div>
                  <div className=\"flex items-center space-x-1\">
                    <span className=\"text-gray-400\">Motivation:</span>
                    <span className=\"text-white font-medium\">
                      {MOTIVATION_ICONS[actor.motivation as keyof typeof MOTIVATION_ICONS]} 
                      {actor.motivation}
                    </span>
                  </div>
                  <div>
                    <span className=\"text-gray-400\">Sectors:</span>
                    <span className=\"ml-1 text-white font-medium\">{actor.targetSectors[0]}</span>
                  </div>
                </div>

                {/* Severity Breakdown */}
                <div className=\"mb-3\">
                  <div className=\"flex items-center justify-between text-xs text-gray-400 mb-1\">
                    <span>Event Severity</span>
                    <span>Total: {actor.eventCount}</span>
                  </div>
                  <div className=\"grid grid-cols-4 gap-1\">
                    {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as Severity[]).map((severity) => (
                      <div key={severity} className=\"text-center\">
                        <div className={`h-2 rounded ${
                          severity === 'CRITICAL' ? 'bg-red-500' :
                          severity === 'HIGH' ? 'bg-orange-500' :
                          severity === 'MEDIUM' ? 'bg-yellow-500' :
                          'bg-blue-500'
                        }`} style={{
                          opacity: actor.severityBreakdown[severity] / Math.max(...Object.values(actor.severityBreakdown), 1)
                        }} />
                        <div className={`text-xs mt-1 ${
                          severity === 'CRITICAL' ? 'text-red-400' :
                          severity === 'HIGH' ? 'text-orange-400' :
                          severity === 'MEDIUM' ? 'text-yellow-400' :
                          'text-blue-400'
                        }`}>
                          {actor.severityBreakdown[severity]}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                  {selectedActor?.id === actor.id && showDetails && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className=\"pt-4 border-t border-gray-700 space-y-4\"
                    >
                      {/* Campaigns */}
                      {actor.campaigns.length > 0 && (
                        <div>
                          <h5 className=\"text-sm font-semibold text-white mb-2\">Active Campaigns</h5>
                          <div className=\"space-y-2\">
                            {actor.campaigns.map((campaign) => (
                              <div key={campaign.id} className=\"p-3 bg-gray-900 rounded border border-gray-700\">
                                <div className=\"flex items-center justify-between mb-1\">
                                  <span className=\"font-medium text-white\">{campaign.name}</span>
                                  <Badge variant=\"outline\" className=\"text-xs\">
                                    Active
                                  </Badge>
                                </div>
                                <p className=\"text-xs text-gray-400 mb-2\">{campaign.description}</p>
                                <div className=\"text-xs text-gray-500\">
                                  Started: {new Date(campaign.startDate).toLocaleDateString()}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* TTPs */}
                      {actor.ttps.length > 0 && (
                        <div>
                          <h5 className=\"text-sm font-semibold text-white mb-2\">
                            Tactics, Techniques & Procedures
                          </h5>
                          <div className=\"flex flex-wrap gap-2\">
                            {actor.ttps.slice(0, 5).map((ttp, index) => (
                              <Badge 
                                key={index} 
                                variant=\"outline\" 
                                className=\"text-xs bg-purple-500/10 text-purple-400 border-purple-500/30\"
                              >
                                {ttp.description}
                              </Badge>
                            ))}
                            {actor.ttps.length > 5 && (
                              <Badge variant=\"outline\" className=\"text-xs text-gray-400\">
                                +{actor.ttps.length - 5} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Indicators */}
                      {actor.indicators.length > 0 && (
                        <div>
                          <h5 className=\"text-sm font-semibold text-white mb-2\">
                            <Zap className=\"w-4 h-4 inline mr-1\" />
                            Key Indicators
                          </h5>
                          <div className=\"space-y-1\">
                            {actor.indicators.slice(0, 3).map((indicator, index) => (
                              <div key={index} className=\"flex items-center justify-between text-xs\">
                                <span className=\"text-gray-300 font-mono\">{indicator.value}</span>
                                <div className=\"flex items-center space-x-2\">
                                  <Badge variant=\"outline\" className=\"text-xs\">
                                    {indicator.type}
                                  </Badge>
                                  <span className=\"text-gray-400\">{indicator.confidence}%</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className=\"text-center py-12 text-gray-400\">
            <Shield className=\"w-12 h-12 mx-auto mb-4 opacity-50\" />
            <p>No threat actors identified</p>
            <p className=\"text-sm mt-2\">
              {searchTerm || filterSophistication.length > 0 || filterMotivation.length > 0
                ? 'Adjust your filters to see results'
                : 'Threat actors will appear as events are analyzed'}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ThreatActorAttributionCards;
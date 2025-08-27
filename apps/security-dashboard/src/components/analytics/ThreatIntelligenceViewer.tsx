import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Globe, 
  TrendingUp, 
  AlertTriangle, 
  Eye, 
  ExternalLink,
  Filter,
  Search,
  Calendar,
  MapPin
} from 'lucide-react';

// Components
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

// Types
import { SecurityEvent } from '../../types/security';

interface ThreatIntelligenceViewerProps {
  events: SecurityEvent[];
  className?: string;
}

interface ThreatIntelItem {
  id: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  confidence: number;
  source: string;
  timestamp: string;
  tags: string[];
  indicators: Array<{
    type: string;
    value: string;
    confidence: number;
  }>;
  attribution: {
    actor?: string;
    campaign?: string;
    family?: string;
  };
  references: Array<{
    url: string;
    title: string;
    type: string;
  }>;
  affectedSectors: string[];
  affectedRegions: string[];
  mitreMapping: Array<{
    tacticId: string;
    techniqueId: string;
  }>;
}

// Generate threat intelligence from events
const generateThreatIntelligence = (events: SecurityEvent[]): ThreatIntelItem[] => {
  const intelligence: ThreatIntelItem[] = [];
  const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // Last 7 days

  // Group events by patterns
  const eventsBySource = events
    .filter(event => new Date(event.timestamp).getTime() > cutoffTime)
    .reduce((acc, event) => {
      if (!acc[event.source]) acc[event.source] = [];
      acc[event.source].push(event);
      return acc;
    }, {} as Record<string, SecurityEvent[]>);

  Object.entries(eventsBySource).forEach(([source, sourceEvents]) => {
    if (sourceEvents.length >= 5) { // Only create intelligence for sources with multiple events
      const highSeverityEvents = sourceEvents.filter(e => ['CRITICAL', 'HIGH'].includes(e.severity));
      
      if (highSeverityEvents.length > 0) {
        const mostRecent = sourceEvents.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )[0];

        // Extract unique countries
        const countries = [...new Set(sourceEvents
          .map(e => e.geoLocation?.country)
          .filter(Boolean)
        )];

        // Extract MITRE mappings
        const mitreMapping = sourceEvents
          .flatMap(e => e.mitreAttackTactics || [])
          .flatMap(tactic => tactic.techniques?.map(tech => ({
            tacticId: tactic.tacticId,
            techniqueId: tech.techniqueId
          })) || []);

        // Extract indicators
        const indicators = sourceEvents
          .flatMap(e => e.indicators || [])
          .slice(0, 10); // Limit to prevent clutter

        intelligence.push({
          id: `intel-${source}-${Date.now()}`,
          title: `Increased Activity from ${source}`,
          description: `Multiple security events detected from ${source} with ${highSeverityEvents.length} high-severity incidents. Pattern suggests coordinated attack campaign.`,
          severity: highSeverityEvents.some(e => e.severity === 'CRITICAL') ? 'CRITICAL' : 'HIGH',
          confidence: Math.min(95, 60 + (highSeverityEvents.length * 5)),
          source: 'Internal Analysis',
          timestamp: mostRecent.timestamp,
          tags: ['automated-analysis', 'threat-campaign', source.toLowerCase().replace(/\\s+/g, '-')],
          indicators,
          attribution: {
            actor: countries.length === 1 ? `${countries[0]} Actor` : 'Multi-region Actor',
            campaign: `Operation ${source.substring(0, 8)}`,
            family: mostRecent.type.replace(/_/g, ' ')
          },
          references: [{
            url: '#',
            title: 'Internal Threat Analysis Report',
            type: 'report'
          }],
          affectedSectors: ['Technology', 'Financial'], // Simplified
          affectedRegions: countries,
          mitreMapping: mitreMapping.slice(0, 5)
        });
      }
    }
  });

  // Add some sample external threat intelligence
  intelligence.push(
    {
      id: 'intel-apt29-2024',
      title: 'APT29 Targeting Cloud Infrastructure',
      description: 'Advanced Persistent Threat group APT29 has been observed targeting cloud infrastructure using sophisticated supply chain attacks and credential harvesting techniques.',
      severity: 'CRITICAL',
      confidence: 95,
      source: 'CISA',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      tags: ['apt29', 'cloud-attacks', 'supply-chain', 'russia'],
      indicators: [
        { type: 'DOMAIN', value: 'malicious-domain.com', confidence: 90 },
        { type: 'IP', value: '192.168.1.100', confidence: 85 },
        { type: 'HASH', value: 'a1b2c3d4e5f6...', confidence: 95 }
      ],
      attribution: {
        actor: 'APT29 (Cozy Bear)',
        campaign: 'Operation Cloud Strike',
        family: 'Sophisticated APT'
      },
      references: [
        { url: 'https://cisa.gov/alert', title: 'CISA Alert AA24-001A', type: 'advisory' },
        { url: 'https://mitre.org/attack', title: 'MITRE ATT&CK Mapping', type: 'framework' }
      ],
      affectedSectors: ['Government', 'Defense', 'Technology'],
      affectedRegions: ['United States', 'Europe', 'Australia'],
      mitreMapping: [
        { tacticId: 'TA0001', techniqueId: 'T1566' },
        { tacticId: 'TA0003', techniqueId: 'T1055' }
      ]
    },
    {
      id: 'intel-ransomware-2024',
      title: 'New Ransomware Variant Targeting Healthcare',
      description: 'A new ransomware variant has been identified specifically targeting healthcare organizations with improved encryption and evasion techniques.',
      severity: 'HIGH',
      confidence: 88,
      source: 'Threat Research Team',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      tags: ['ransomware', 'healthcare', 'encryption', 'evasion'],
      indicators: [
        { type: 'HASH', value: 'b2c3d4e5f6a1...', confidence: 92 },
        { type: 'REGISTRY_KEY', value: 'HKEY_LOCAL_MACHINE\\...', confidence: 80 }
      ],
      attribution: {
        actor: 'Unknown',
        campaign: 'MediCrypt Campaign',
        family: 'MediCrypt Ransomware'
      },
      references: [
        { url: '#', title: 'Ransomware Analysis Report', type: 'report' },
        { url: '#', title: 'IOC Package', type: 'ioc' }
      ],
      affectedSectors: ['Healthcare', 'Medical Devices'],
      affectedRegions: ['North America', 'Europe'],
      mitreMapping: [
        { tacticId: 'TA0040', techniqueId: 'T1486' },
        { tacticId: 'TA0005', techniqueId: 'T1027' }
      ]
    }
  );

  return intelligence.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
};

export const ThreatIntelligenceViewer: React.FC<ThreatIntelligenceViewerProps> = ({
  events,
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string[]>([]);
  const [filterSource, setFilterSource] = useState('all');
  const [selectedItem, setSelectedItem] = useState<ThreatIntelItem | null>(null);

  // Generate threat intelligence
  const intelligence = useMemo(() => generateThreatIntelligence(events), [events]);

  // Filter intelligence
  const filteredIntelligence = useMemo(() => {
    return intelligence.filter(item => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          item.title.toLowerCase().includes(searchLower) ||
          item.description.toLowerCase().includes(searchLower) ||
          item.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
          item.attribution.actor?.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }

      // Severity filter
      if (filterSeverity.length > 0 && !filterSeverity.includes(item.severity)) {
        return false;
      }

      // Source filter
      if (filterSource !== 'all' && item.source !== filterSource) {
        return false;
      }

      return true;
    });
  }, [intelligence, searchTerm, filterSeverity, filterSource]);

  // Get unique sources
  const sources = useMemo(() => 
    [...new Set(intelligence.map(item => item.source))],
    [intelligence]
  );

  const SEVERITY_COLORS = {
    CRITICAL: 'text-red-400 bg-red-500/10 border-red-500/20',
    HIGH: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    MEDIUM: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    LOW: 'text-blue-400 bg-blue-500/10 border-blue-500/20'
  };

  return (
    <Card className={`${className}`}>
      <div className=\"p-4 border-b border-gray-700\">
        <div className=\"flex items-center justify-between mb-4\">
          <h3 className=\"text-lg font-semibold text-white flex items-center\">
            <Shield className=\"w-5 h-5 mr-2\" />
            Threat Intelligence Feed
          </h3>
          <Badge variant=\"outline\" className=\"text-xs\">
            {filteredIntelligence.length} items
          </Badge>
        </div>

        {/* Filters */}
        <div className=\"grid grid-cols-1 md:grid-cols-3 gap-4\">
          <div className=\"relative\">
            <Search className=\"absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400\" />
            <Input
              placeholder=\"Search intelligence...\"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className=\"pl-10\"
            />
          </div>

          <div className=\"flex items-center space-x-2\">
            <Filter className=\"w-4 h-4 text-gray-400\" />
            <div className=\"flex space-x-1\">
              {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((severity) => (
                <Badge
                  key={severity}
                  variant={filterSeverity.includes(severity) ? \"default\" : \"outline\"}
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

          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className=\"px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm\"
          >
            <option value=\"all\">All Sources</option>
            {sources.map(source => (
              <option key={source} value={source}>{source}</option>
            ))}
          </select>
        </div>
      </div>

      <div className=\"max-h-96 overflow-y-auto\">
        {filteredIntelligence.length > 0 ? (
          <div className=\"space-y-4 p-4\">
            {filteredIntelligence.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                  selectedItem?.id === item.id
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'
                }`}
                onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
              >
                <div className=\"flex items-start justify-between mb-3\">
                  <div className=\"flex items-center space-x-3\">
                    <Badge 
                      className={SEVERITY_COLORS[item.severity]}
                      variant=\"outline\"
                    >
                      {item.severity}
                    </Badge>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      item.confidence >= 90 ? 'bg-green-900 text-green-300' :
                      item.confidence >= 70 ? 'bg-yellow-900 text-yellow-300' :
                      'bg-gray-900 text-gray-300'
                    }`}>
                      {item.confidence}% confidence
                    </div>
                  </div>
                  
                  <div className=\"text-right text-xs text-gray-400\">
                    <div>{item.source}</div>
                    <div>{new Date(item.timestamp).toLocaleDateString()}</div>
                  </div>
                </div>

                <h4 className=\"font-semibold text-white mb-2\">{item.title}</h4>
                <p className=\"text-sm text-gray-300 mb-3\">{item.description}</p>

                {/* Tags */}
                <div className=\"flex flex-wrap gap-1 mb-3\">
                  {item.tags.slice(0, 4).map((tag) => (
                    <Badge key={tag} variant=\"outline\" className=\"text-xs\">
                      {tag}
                    </Badge>
                  ))}
                  {item.tags.length > 4 && (
                    <Badge variant=\"outline\" className=\"text-xs text-gray-400\">
                      +{item.tags.length - 4}
                    </Badge>
                  )}
                </div>

                {/* Attribution */}
                {item.attribution.actor && (
                  <div className=\"text-xs text-gray-400 mb-2\">
                    <strong>Attribution:</strong> {item.attribution.actor}
                    {item.attribution.campaign && ` • ${item.attribution.campaign}`}
                  </div>
                )}

                {/* Affected Regions */}
                {item.affectedRegions.length > 0 && (
                  <div className=\"flex items-center text-xs text-gray-400\">
                    <MapPin className=\"w-3 h-3 mr-1\" />
                    <span>{item.affectedRegions.slice(0, 3).join(', ')}</span>
                    {item.affectedRegions.length > 3 && (
                      <span> +{item.affectedRegions.length - 3} more</span>
                    )}
                  </div>
                )}

                {/* Expanded Details */}
                {selectedItem?.id === item.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.3 }}
                    className=\"pt-4 mt-4 border-t border-gray-700 space-y-4\"
                  >
                    {/* Indicators */}
                    {item.indicators.length > 0 && (
                      <div>
                        <h5 className=\"text-sm font-semibold text-white mb-2\">
                          Indicators of Compromise
                        </h5>
                        <div className=\"space-y-2\">
                          {item.indicators.slice(0, 5).map((indicator, idx) => (
                            <div key={idx} className=\"flex items-center justify-between text-xs p-2 bg-gray-900 rounded\">
                              <div className=\"flex items-center space-x-2\">
                                <Badge variant=\"outline\" className=\"text-xs\">{indicator.type}</Badge>
                                <span className=\"font-mono text-gray-300\">{indicator.value}</span>
                              </div>
                              <span className=\"text-gray-400\">{indicator.confidence}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* MITRE Mapping */}
                    {item.mitreMapping.length > 0 && (
                      <div>
                        <h5 className=\"text-sm font-semibold text-white mb-2\">
                          MITRE ATT&CK Mapping
                        </h5>
                        <div className=\"flex flex-wrap gap-2\">
                          {item.mitreMapping.map((mapping, idx) => (
                            <Badge key={idx} variant=\"outline\" className=\"text-xs\">
                              {mapping.techniqueId}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* References */}
                    {item.references.length > 0 && (
                      <div>
                        <h5 className=\"text-sm font-semibold text-white mb-2\">References</h5>
                        <div className=\"space-y-1\">
                          {item.references.map((ref, idx) => (
                            <div key={idx} className=\"flex items-center space-x-2 text-xs\">
                              <ExternalLink className=\"w-3 h-3 text-gray-400\" />
                              <a 
                                href={ref.url} 
                                className=\"text-blue-400 hover:text-blue-300 underline\"
                                target=\"_blank\"
                                rel=\"noopener noreferrer\"
                              >
                                {ref.title}
                              </a>
                              <Badge variant=\"outline\" className=\"text-xs\">{ref.type}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Affected Sectors */}
                    {item.affectedSectors.length > 0 && (
                      <div>
                        <h5 className=\"text-sm font-semibold text-white mb-2\">Affected Sectors</h5>
                        <div className=\"flex flex-wrap gap-1\">
                          {item.affectedSectors.map((sector) => (
                            <Badge key={sector} variant=\"outline\" className=\"text-xs\">
                              {sector}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className=\"text-center py-12 text-gray-400\">
            <Shield className=\"w-12 h-12 mx-auto mb-4 opacity-50\" />
            <p>No threat intelligence available</p>
            <p className=\"text-sm mt-2\">
              {searchTerm || filterSeverity.length > 0 || filterSource !== 'all'
                ? 'Adjust your filters to see results'
                : 'Intelligence will appear as threats are analyzed'}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ThreatIntelligenceViewer;
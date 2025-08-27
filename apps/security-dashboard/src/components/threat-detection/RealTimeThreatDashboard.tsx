import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useQuery, useSubscription } from '@apollo/client';
import { 
  Shield, 
  AlertTriangle, 
  Activity, 
  Target, 
  Globe, 
  Filter,
  Search,
  Download,
  Pause,
  Play,
  Settings,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FixedSizeList as List } from 'react-window';
import { format, formatDistanceToNow } from 'date-fns';

// Components
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { Switch } from '../ui/Switch';
import { LiveEventStream } from './LiveEventStream';
import { ThreatMetricsOverview } from './ThreatMetricsOverview';
import { GlobalThreatHeatmap } from './GlobalThreatHeatmap';
import { MITREAttackVisualization } from './MITREAttackVisualization';
import { ThreatActorAttributionCards } from './ThreatActorAttributionCards';
import { IOCManagementInterface } from './IOCManagementInterface';

// GraphQL
import { GET_SECURITY_EVENTS, GET_SECURITY_METRICS } from '../../graphql/queries/threat-detection.graphql';
import { ON_SECURITY_EVENT_CREATED, ON_SECURITY_METRICS_UPDATE } from '../../graphql/subscriptions/threat-detection.graphql';

// Types
import { SecurityEvent, SecurityMetrics, Severity, ThreatLevel } from '../../types/security';

interface RealTimeThreatDashboardProps {
  className?: string;
  autoRefresh?: boolean;
  maxEvents?: number;
}

interface EventFilter {
  severity: Severity[];
  sources: string[];
  timeRange: string;
  searchTerm: string;
  showOnlyThreats: boolean;
}

const SEVERITY_COLORS = {
  CRITICAL: 'text-red-500 bg-red-500/10 border-red-500/20',
  HIGH: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
  MEDIUM: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
  LOW: 'text-blue-500 bg-blue-500/10 border-blue-500/20'
} as const;

const THREAT_LEVEL_COLORS = {
  CRITICAL: 'text-red-400',
  HIGH: 'text-orange-400',
  MEDIUM: 'text-yellow-400',
  LOW: 'text-blue-400'
} as const;

export const RealTimeThreatDashboard: React.FC<RealTimeThreatDashboardProps> = ({
  className = '',
  autoRefresh = true,
  maxEvents = 1000
}) => {
  // State
  const [isStreamPaused, setIsStreamPaused] = useState(false);
  const [eventFilter, setEventFilter] = useState<EventFilter>({
    severity: [],
    sources: [],
    timeRange: '24h',
    searchTerm: '',
    showOnlyThreats: false
  });
  const [selectedView, setSelectedView] = useState<'events' | 'heatmap' | 'mitre' | 'actors' | 'iocs'>('events');
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);

  // Refs
  const eventListRef = useRef<List>(null);
  const streamPauseTimeRef = useRef<number | null>(null);

  // GraphQL Queries
  const { 
    data: eventsData, 
    loading: eventsLoading, 
    error: eventsError,
    refetch: refetchEvents
  } = useQuery(GET_SECURITY_EVENTS, {
    variables: {
      filter: {
        severity: eventFilter.severity.length > 0 ? eventFilter.severity : undefined,
        sources: eventFilter.sources.length > 0 ? eventFilter.sources : undefined,
        timeRange: eventFilter.timeRange,
        searchTerm: eventFilter.searchTerm || undefined,
        showOnlyThreats: eventFilter.showOnlyThreats
      },
      pagination: { limit: maxEvents, offset: 0 },
      sort: { field: 'timestamp', direction: 'DESC' }
    },
    pollInterval: autoRefresh && !isStreamPaused ? 5000 : 0
  });

  const { 
    data: metricsData, 
    loading: metricsLoading 
  } = useQuery(GET_SECURITY_METRICS, {
    variables: {
      timeRange: { 
        start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString(),
        period: 'HOUR'
      },
      groupBy: 'HOUR'
    },
    pollInterval: autoRefresh ? 30000 : 0
  });

  // Real-time Subscriptions
  useSubscription(ON_SECURITY_EVENT_CREATED, {
    skip: isStreamPaused,
    variables: {
      filter: {
        severity: eventFilter.severity.length > 0 ? eventFilter.severity : undefined,
        sources: eventFilter.sources.length > 0 ? eventFilter.sources : undefined
      }
    },
    onData: ({ data }) => {
      if (data?.data?.onSecurityEventCreated) {
        const newEvent = data.data.onSecurityEventCreated;
        setEvents(prevEvents => {
          // Add new event to the beginning and limit total events
          const updatedEvents = [newEvent, ...prevEvents].slice(0, maxEvents);
          return updatedEvents;
        });
        
        // Auto-scroll to top if user is near the top
        if (eventListRef.current) {
          eventListRef.current.scrollToItem(0, 'start');
        }
      }
    }
  });

  useSubscription(ON_SECURITY_METRICS_UPDATE, {
    skip: !autoRefresh,
    onData: ({ data }) => {
      if (data?.data?.onSecurityMetricsUpdate) {
        // Metrics will be automatically updated through the query polling
      }
    }
  });

  // Effects
  useEffect(() => {
    if (eventsData?.securityEvents?.items) {
      setEvents(eventsData.securityEvents.items);
    }
  }, [eventsData]);

  // Memoized values
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      if (eventFilter.searchTerm) {
        const searchLower = eventFilter.searchTerm.toLowerCase();
        const matchesSearch = 
          event.title.toLowerCase().includes(searchLower) ||
          event.description.toLowerCase().includes(searchLower) ||
          event.source.toLowerCase().includes(searchLower) ||
          event.sourceIP?.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }

      if (eventFilter.severity.length > 0 && !eventFilter.severity.includes(event.severity)) {
        return false;
      }

      if (eventFilter.sources.length > 0 && !eventFilter.sources.includes(event.source)) {
        return false;
      }

      if (eventFilter.showOnlyThreats && event.threatLevel === 'LOW') {
        return false;
      }

      return true;
    });
  }, [events, eventFilter]);

  const eventSeverityStats = useMemo(() => {
    const stats = filteredEvents.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    }, {} as Record<Severity, number>);

    return {
      critical: stats.CRITICAL || 0,
      high: stats.HIGH || 0,
      medium: stats.MEDIUM || 0,
      low: stats.LOW || 0
    };
  }, [filteredEvents]);

  // Handlers
  const handlePauseStream = useCallback(() => {
    setIsStreamPaused(!isStreamPaused);
    if (!isStreamPaused) {
      streamPauseTimeRef.current = Date.now();
    } else {
      streamPauseTimeRef.current = null;
    }
  }, [isStreamPaused]);

  const handleExportEvents = useCallback(() => {
    const csv = [
      'Timestamp,Severity,Type,Title,Source,Source IP,Destination IP,Risk Score',
      ...filteredEvents.map(event => 
        `${event.timestamp},${event.severity},${event.type},${event.title.replace(/,/g, ';')},${event.source},${event.sourceIP || ''},${event.destinationIP || ''},${event.riskScore || ''}`
      )
    ].join('\\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-events-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredEvents]);

  const handleFilterChange = useCallback((key: keyof EventFilter, value: any) => {
    setEventFilter(prev => ({ ...prev, [key]: value }));
  }, []);

  // Event List Item Renderer
  const EventListItem = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const event = filteredEvents[index];
    if (!event) return null;

    const isSelected = selectedEvent?.id === event.id;

    return (
      <div style={style}>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: index * 0.02 }}
          className={`p-4 mb-2 rounded-lg border cursor-pointer transition-all duration-200 ${
            isSelected 
              ? 'border-blue-500 bg-blue-500/10 shadow-md' 
              : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'
          }`}
          onClick={() => setSelectedEvent(event)}
        >
          <div className=\"flex items-start justify-between mb-2\">
            <div className=\"flex items-center space-x-3\">
              <Badge 
                className={`${SEVERITY_COLORS[event.severity]} text-xs font-medium`}
                variant=\"outline\"
              >
                {event.severity}
              </Badge>
              {event.threatLevel && (
                <span className={`text-xs ${THREAT_LEVEL_COLORS[event.threatLevel as ThreatLevel]}`}>
                  <Target className=\"w-3 h-3 inline mr-1\" />
                  {event.threatLevel}
                </span>
              )}
              <span className=\"text-xs text-gray-400\">
                {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
              </span>
            </div>
            <div className=\"flex items-center space-x-2\">
              {event.riskScore && (
                <span className={`text-xs font-mono px-2 py-1 rounded ${
                  event.riskScore >= 80 ? 'bg-red-900 text-red-300' :
                  event.riskScore >= 60 ? 'bg-orange-900 text-orange-300' :
                  event.riskScore >= 40 ? 'bg-yellow-900 text-yellow-300' :
                  'bg-blue-900 text-blue-300'
                }`}>
                  {event.riskScore}
                </span>
              )}
              {event.geoLocation && (
                <span className=\"text-xs text-gray-400\">
                  <Globe className=\"w-3 h-3 inline mr-1\" />
                  {event.geoLocation.country}
                </span>
              )}
            </div>
          </div>
          
          <h4 className=\"font-medium text-white mb-1 line-clamp-2\">{event.title}</h4>
          <p className=\"text-sm text-gray-300 mb-2 line-clamp-2\">{event.description}</p>
          
          <div className=\"flex items-center justify-between text-xs text-gray-400\">
            <div className=\"flex items-center space-x-4\">
              <span>Source: {event.source}</span>
              {event.sourceIP && <span>IP: {event.sourceIP}</span>}
              {event.asset && <span>Asset: {event.asset.name}</span>}
            </div>
            <div className=\"flex items-center space-x-2\">
              {event.mitreAttackTactics && event.mitreAttackTactics.length > 0 && (
                <Badge variant=\"secondary\" className=\"text-xs\">
                  MITRE: {event.mitreAttackTactics[0].tacticName}
                </Badge>
              )}
              {event.indicators && event.indicators.length > 0 && (
                <span className=\"text-amber-400\">
                  <Zap className=\"w-3 h-3 inline\" /> IOCs
                </span>
              )}
            </div>
          </div>

          {/* CEF Fields Display */}
          {event.cefFields && (
            <div className=\"mt-2 p-2 bg-gray-900 rounded text-xs font-mono\">
              <span className=\"text-gray-500\">CEF:</span>
              <span className=\"text-green-400 ml-2\">
                {event.cefFields.deviceVendor}|{event.cefFields.deviceProduct}|
                {event.cefFields.deviceVersion}|{event.cefFields.signatureID}|
                {event.cefFields.name}|{event.cefFields.severity}
              </span>
            </div>
          )}
        </motion.div>
      </div>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className=\"flex items-center justify-between\">
        <div className=\"flex items-center space-x-4\">
          <div className=\"flex items-center space-x-2\">
            <Shield className=\"w-6 h-6 text-blue-400\" />
            <h2 className=\"text-2xl font-bold text-white\">Real-time Threat Detection</h2>
          </div>
          <div className=\"flex items-center space-x-2\">
            <div className={`w-3 h-3 rounded-full ${isStreamPaused ? 'bg-yellow-500' : 'bg-green-500'} animate-pulse`} />
            <span className=\"text-sm text-gray-400\">
              {isStreamPaused ? 'Stream Paused' : 'Live Stream Active'}
            </span>
          </div>
        </div>
        
        <div className=\"flex items-center space-x-3\">
          <Button
            variant=\"outline\"
            size=\"sm\"
            onClick={handlePauseStream}
            className=\"flex items-center space-x-2\"
          >
            {isStreamPaused ? <Play className=\"w-4 h-4\" /> : <Pause className=\"w-4 h-4\" />}
            <span>{isStreamPaused ? 'Resume' : 'Pause'} Stream</span>
          </Button>
          <Button
            variant=\"outline\"
            size=\"sm\"
            onClick={handleExportEvents}
            className=\"flex items-center space-x-2\"
          >
            <Download className=\"w-4 h-4\" />
            <span>Export</span>
          </Button>
          <Button variant=\"outline\" size=\"sm\">
            <Settings className=\"w-4 h-4\" />
          </Button>
        </div>
      </div>

      {/* Metrics Overview */}
      <ThreatMetricsOverview 
        metrics={metricsData?.securityMetrics}
        loading={metricsLoading}
        eventStats={eventSeverityStats}
      />

      {/* Filters */}
      <Card className=\"p-4\">
        <div className=\"flex items-center justify-between mb-4\">
          <h3 className=\"text-lg font-semibold text-white flex items-center\">
            <Filter className=\"w-5 h-5 mr-2\" />
            Event Filters
          </h3>
          <div className=\"flex items-center space-x-2\">
            <Switch
              checked={eventFilter.showOnlyThreats}
              onCheckedChange={(checked) => handleFilterChange('showOnlyThreats', checked)}
              className=\"data-[state=checked]:bg-red-600\"
            />
            <span className=\"text-sm text-gray-300\">Threats Only</span>
          </div>
        </div>
        
        <div className=\"grid grid-cols-1 md:grid-cols-4 gap-4\">
          <div className=\"space-y-2\">
            <label className=\"text-sm text-gray-300\">Search Events</label>
            <div className=\"relative\">
              <Search className=\"absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400\" />
              <Input
                placeholder=\"Search events, IPs, sources...\"
                value={eventFilter.searchTerm}
                onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                className=\"pl-10\"
              />
            </div>
          </div>
          
          <div className=\"space-y-2\">
            <label className=\"text-sm text-gray-300\">Severity</label>
            <div className=\"flex flex-wrap gap-2\">
              {Object.keys(SEVERITY_COLORS).map((severity) => (
                <Badge
                  key={severity}
                  variant={eventFilter.severity.includes(severity as Severity) ? \"default\" : \"outline\"}
                  className={`cursor-pointer ${SEVERITY_COLORS[severity as Severity]}`}
                  onClick={() => {
                    const currentSeverity = eventFilter.severity;
                    if (currentSeverity.includes(severity as Severity)) {
                      handleFilterChange('severity', currentSeverity.filter(s => s !== severity));
                    } else {
                      handleFilterChange('severity', [...currentSeverity, severity as Severity]);
                    }
                  }}
                >
                  {severity}
                </Badge>
              ))}
            </div>
          </div>
          
          <div className=\"space-y-2\">
            <label className=\"text-sm text-gray-300\">Time Range</label>
            <select
              value={eventFilter.timeRange}
              onChange={(e) => handleFilterChange('timeRange', e.target.value)}
              className=\"w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white text-sm\"
            >
              <option value=\"1h\">Last Hour</option>
              <option value=\"6h\">Last 6 Hours</option>
              <option value=\"24h\">Last 24 Hours</option>
              <option value=\"7d\">Last 7 Days</option>
              <option value=\"30d\">Last 30 Days</option>
            </select>
          </div>
          
          <div className=\"space-y-2\">
            <label className=\"text-sm text-gray-300\">View</label>
            <div className=\"flex space-x-1\">
              {[
                { key: 'events', label: 'Events', icon: Activity },
                { key: 'heatmap', label: 'Heatmap', icon: Globe },
                { key: 'mitre', label: 'MITRE', icon: Target },
                { key: 'actors', label: 'Actors', icon: Shield },
                { key: 'iocs', label: 'IOCs', icon: Zap }
              ].map(({ key, label, icon: Icon }) => (
                <Button
                  key={key}
                  variant={selectedView === key ? \"default\" : \"outline\"}
                  size=\"sm\"
                  onClick={() => setSelectedView(key as any)}
                  className=\"flex items-center space-x-1 text-xs\"
                >
                  <Icon className=\"w-3 h-3\" />
                  <span className=\"hidden sm:inline\">{label}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Main Content Area */}
      <div className=\"grid grid-cols-1 xl:grid-cols-3 gap-6\">
        {/* Event Stream */}
        <div className=\"xl:col-span-2\">
          <Card className=\"h-[800px] flex flex-col\">
            <div className=\"p-4 border-b border-gray-700 flex items-center justify-between\">
              <h3 className=\"text-lg font-semibold text-white flex items-center\">
                <Activity className=\"w-5 h-5 mr-2\" />
                Live Security Events ({filteredEvents.length})
              </h3>
              <div className=\"text-sm text-gray-400\">
                {eventsLoading && 'Loading...'}
                {eventsError && 'Error loading events'}
                {!eventsLoading && !eventsError && `${filteredEvents.length} events`}
              </div>
            </div>
            
            <div className=\"flex-1 overflow-hidden\">
              {filteredEvents.length > 0 ? (
                <List
                  ref={eventListRef}
                  height={750}
                  itemCount={filteredEvents.length}
                  itemSize={180}
                  className=\"scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600\"
                >
                  {EventListItem}
                </List>
              ) : (
                <div className=\"flex items-center justify-center h-full text-gray-400\">
                  <div className=\"text-center\">
                    <Shield className=\"w-12 h-12 mx-auto mb-4 opacity-50\" />
                    <p>No security events match your filters</p>
                    <p className=\"text-sm mt-2\">Adjust your filters or wait for new events</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Side Panel */}
        <div className=\"space-y-6\">
          {selectedView === 'events' && selectedEvent && (
            <LiveEventStream 
              event={selectedEvent} 
              onClose={() => setSelectedEvent(null)}
            />
          )}
          
          {selectedView === 'heatmap' && (
            <GlobalThreatHeatmap 
              events={filteredEvents}
              className=\"h-96\"
            />
          )}
          
          {selectedView === 'mitre' && (
            <MITREAttackVisualization 
              events={filteredEvents}
              className=\"h-96\"
            />
          )}
          
          {selectedView === 'actors' && (
            <ThreatActorAttributionCards 
              events={filteredEvents}
              className=\"h-96\"
            />
          )}
          
          {selectedView === 'iocs' && (
            <IOCManagementInterface 
              events={filteredEvents}
              className=\"h-96\"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default RealTimeThreatDashboard;
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Copy, 
  ExternalLink, 
  AlertTriangle, 
  Shield, 
  Clock, 
  MapPin, 
  User, 
  Server, 
  Network,
  Eye,
  Target,
  Zap,
  Hash,
  Download,
  Share2
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

// Components
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Tooltip } from '../ui/Tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';

// Types
import { SecurityEvent, Severity } from '../../types/security';

interface LiveEventStreamProps {
  event: SecurityEvent;
  onClose: () => void;
  className?: string;
}

const SEVERITY_COLORS = {
  CRITICAL: 'text-red-400 bg-red-500/10 border-red-500/20',
  HIGH: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  MEDIUM: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  LOW: 'text-blue-400 bg-blue-500/10 border-blue-500/20'
};

const THREAT_LEVEL_COLORS = {
  CRITICAL: 'text-red-400',
  HIGH: 'text-orange-400',
  MEDIUM: 'text-yellow-400',
  LOW: 'text-blue-400'
};

export const LiveEventStream: React.FC<LiveEventStreamProps> = ({
  event,
  onClose,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  // Process event metadata
  const processedMetadata = useMemo(() => {
    if (!event.metadata || typeof event.metadata !== 'object') return {};
    
    const metadata = { ...event.metadata };
    
    // Remove null/undefined values
    Object.keys(metadata).forEach(key => {
      if (metadata[key] === null || metadata[key] === undefined) {
        delete metadata[key];
      }
    });
    
    return metadata;
  }, [event.metadata]);

  // Format CEF string
  const cefString = useMemo(() => {
    if (!event.cefFields) return null;
    
    const { cefFields } = event;
    return `CEF:${cefFields.version}|${cefFields.deviceVendor}|${cefFields.deviceProduct}|${cefFields.deviceVersion}|${cefFields.signatureID}|${cefFields.name}|${cefFields.severity}|${cefFields.extension || ''}`;
  }, [event.cefFields]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const handleExport = () => {
    const eventData = {
      ...event,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(eventData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-event-${event.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      className={`${className}`}
    >
      <Card className=\"h-full\">
        {/* Header */}
        <div className=\"p-4 border-b border-gray-700\">
          <div className=\"flex items-start justify-between mb-3\">
            <div className=\"flex items-center space-x-3\">
              <Badge 
                className={`${SEVERITY_COLORS[event.severity]} font-medium`}
                variant=\"outline\"
              >
                {event.severity}
              </Badge>
              {event.threatLevel && (
                <span className={`text-sm font-medium ${THREAT_LEVEL_COLORS[event.threatLevel as keyof typeof THREAT_LEVEL_COLORS]}`}>
                  <Target className=\"w-4 h-4 inline mr-1\" />
                  {event.threatLevel}
                </span>
              )}
            </div>
            
            <div className=\"flex items-center space-x-2\">
              <Button
                variant=\"ghost\"
                size=\"sm\"
                onClick={handleExport}
                className=\"p-2\"
              >
                <Download className=\"w-4 h-4\" />
              </Button>
              <Button
                variant=\"ghost\"
                size=\"sm\"
                onClick={() => handleCopy(event.id)}
                className=\"p-2\"
              >
                <Share2 className=\"w-4 h-4\" />
              </Button>
              <Button
                variant=\"ghost\"
                size=\"sm\"
                onClick={onClose}
                className=\"p-2\"
              >
                <X className=\"w-4 h-4\" />
              </Button>
            </div>
          </div>

          <h3 className=\"text-lg font-semibold text-white mb-2\">{event.title}</h3>
          <p className=\"text-sm text-gray-300 mb-3\">{event.description}</p>

          {/* Quick Stats */}
          <div className=\"grid grid-cols-2 gap-4 text-sm\">
            <div className=\"flex items-center space-x-2 text-gray-400\">
              <Clock className=\"w-4 h-4\" />
              <span>{formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}</span>
            </div>
            <div className=\"flex items-center space-x-2 text-gray-400\">
              <Server className=\"w-4 h-4\" />
              <span>{event.source}</span>
            </div>
            {event.riskScore && (
              <div className=\"flex items-center space-x-2\">
                <Shield className=\"w-4 h-4 text-gray-400\" />
                <span className={`font-medium ${
                  event.riskScore >= 80 ? 'text-red-400' :
                  event.riskScore >= 60 ? 'text-orange-400' :
                  event.riskScore >= 40 ? 'text-yellow-400' :
                  'text-blue-400'
                }`}>
                  Risk: {event.riskScore}
                </span>
              </div>
            )}
            {event.geoLocation && (
              <div className=\"flex items-center space-x-2 text-gray-400\">
                <MapPin className=\"w-4 h-4\" />
                <span>{event.geoLocation.country}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className=\"p-4\">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className=\"grid w-full grid-cols-5\">
              <TabsTrigger value=\"overview\" className=\"text-xs\">Overview</TabsTrigger>
              <TabsTrigger value=\"network\" className=\"text-xs\">Network</TabsTrigger>
              <TabsTrigger value=\"indicators\" className=\"text-xs\">IOCs</TabsTrigger>
              <TabsTrigger value=\"mitre\" className=\"text-xs\">MITRE</TabsTrigger>
              <TabsTrigger value=\"raw\" className=\"text-xs\">Raw</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value=\"overview\" className=\"space-y-4 mt-4\">
              {/* Basic Information */}
              <div className=\"space-y-3\">
                <h4 className=\"font-semibold text-white\">Event Details</h4>
                <div className=\"grid grid-cols-1 gap-3 text-sm\">
                  <div className=\"flex justify-between\">
                    <span className=\"text-gray-400\">Event ID:</span>
                    <div className=\"flex items-center space-x-2\">
                      <span className=\"font-mono text-white\">{event.id}</span>
                      <Button
                        variant=\"ghost\"
                        size=\"sm\"
                        onClick={() => handleCopy(event.id)}
                        className=\"p-1 h-5 w-5\"
                      >
                        <Copy className=\"w-3 h-3\" />
                      </Button>
                    </div>
                  </div>
                  <div className=\"flex justify-between\">
                    <span className=\"text-gray-400\">Timestamp:</span>
                    <span className=\"text-white\">{format(new Date(event.timestamp), 'yyyy-MM-dd HH:mm:ss')}</span>
                  </div>
                  <div className=\"flex justify-between\">
                    <span className=\"text-gray-400\">Type:</span>
                    <span className=\"text-white\">{event.type.replace(/_/g, ' ')}</span>
                  </div>
                  <div className=\"flex justify-between\">
                    <span className=\"text-gray-400\">Status:</span>
                    <Badge variant=\"outline\" className=\"text-xs\">
                      {event.status}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Asset Information */}
              {event.asset && (
                <div className=\"space-y-3\">
                  <h4 className=\"font-semibold text-white\">Affected Asset</h4>
                  <div className=\"p-3 bg-gray-800 rounded-lg border border-gray-700\">
                    <div className=\"flex items-center justify-between mb-2\">
                      <span className=\"font-medium text-white\">{event.asset.name}</span>
                      <Badge variant=\"outline\" className=\"text-xs\">{event.asset.type}</Badge>
                    </div>
                    <div className=\"text-sm space-y-1\">
                      <div className=\"flex justify-between\">
                        <span className=\"text-gray-400\">Environment:</span>
                        <span className=\"text-white\">{event.asset.environment}</span>
                      </div>
                      <div className=\"flex justify-between\">
                        <span className=\"text-gray-400\">Platform:</span>
                        <span className=\"text-white\">{event.asset.platform}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* User Information */}
              {event.user && (
                <div className=\"space-y-3\">
                  <h4 className=\"font-semibold text-white\">Associated User</h4>
                  <div className=\"p-3 bg-gray-800 rounded-lg border border-gray-700\">
                    <div className=\"flex items-center space-x-3\">
                      <User className=\"w-5 h-5 text-gray-400\" />
                      <div>
                        <div className=\"font-medium text-white\">{event.user.name}</div>
                        <div className=\"text-sm text-gray-400\">{event.user.email}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tags */}
              {event.tags && event.tags.length > 0 && (
                <div className=\"space-y-3\">
                  <h4 className=\"font-semibold text-white\">Tags</h4>
                  <div className=\"flex flex-wrap gap-2\">
                    {event.tags.map((tag, index) => (
                      <Badge key={index} variant=\"outline\" className=\"text-xs\">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Network Tab */}
            <TabsContent value=\"network\" className=\"space-y-4 mt-4\">
              <div className=\"space-y-4\">
                <h4 className=\"font-semibold text-white flex items-center\">
                  <Network className=\"w-5 h-5 mr-2\" />
                  Network Information
                </h4>
                
                <div className=\"grid grid-cols-1 gap-4\">
                  {/* Source Information */}
                  {event.sourceIP && (
                    <div className=\"p-3 bg-gray-800 rounded-lg border border-gray-700\">
                      <h5 className=\"font-medium text-white mb-2\">Source</h5>
                      <div className=\"space-y-2 text-sm\">
                        <div className=\"flex justify-between\">
                          <span className=\"text-gray-400\">IP Address:</span>
                          <div className=\"flex items-center space-x-2\">
                            <span className=\"font-mono text-white\">{event.sourceIP}</span>
                            <Button
                              variant=\"ghost\"
                              size=\"sm\"
                              onClick={() => handleCopy(event.sourceIP!)}
                              className=\"p-1 h-5 w-5\"
                            >
                              <Copy className=\"w-3 h-3\" />
                            </Button>
                          </div>
                        </div>
                        {event.sourcePort && (
                          <div className=\"flex justify-between\">
                            <span className=\"text-gray-400\">Port:</span>
                            <span className=\"text-white\">{event.sourcePort}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Destination Information */}
                  {event.destinationIP && (
                    <div className=\"p-3 bg-gray-800 rounded-lg border border-gray-700\">
                      <h5 className=\"font-medium text-white mb-2\">Destination</h5>
                      <div className=\"space-y-2 text-sm\">
                        <div className=\"flex justify-between\">
                          <span className=\"text-gray-400\">IP Address:</span>
                          <div className=\"flex items-center space-x-2\">
                            <span className=\"font-mono text-white\">{event.destinationIP}</span>
                            <Button
                              variant=\"ghost\"
                              size=\"sm\"
                              onClick={() => handleCopy(event.destinationIP!)}
                              className=\"p-1 h-5 w-5\"
                            >
                              <Copy className=\"w-3 h-3\" />
                            </Button>
                          </div>
                        </div>
                        {event.destinationPort && (
                          <div className=\"flex justify-between\">
                            <span className=\"text-gray-400\">Port:</span>
                            <span className=\"text-white\">{event.destinationPort}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Protocol Information */}
                  {event.protocol && (
                    <div className=\"p-3 bg-gray-800 rounded-lg border border-gray-700\">
                      <h5 className=\"font-medium text-white mb-2\">Protocol</h5>
                      <div className=\"text-sm\">
                        <span className=\"text-white\">{event.protocol}</span>
                      </div>
                    </div>
                  )}

                  {/* Geolocation */}
                  {event.geoLocation && (
                    <div className=\"p-3 bg-gray-800 rounded-lg border border-gray-700\">
                      <h5 className=\"font-medium text-white mb-2\">Geographic Location</h5>
                      <div className=\"space-y-2 text-sm\">
                        <div className=\"flex justify-between\">
                          <span className=\"text-gray-400\">Country:</span>
                          <span className=\"text-white\">{event.geoLocation.country}</span>
                        </div>
                        <div className=\"flex justify-between\">
                          <span className=\"text-gray-400\">Region:</span>
                          <span className=\"text-white\">{event.geoLocation.region}</span>
                        </div>
                        <div className=\"flex justify-between\">
                          <span className=\"text-gray-400\">City:</span>
                          <span className=\"text-white\">{event.geoLocation.city}</span>
                        </div>
                        {event.geoLocation.organization && (
                          <div className=\"flex justify-between\">
                            <span className=\"text-gray-400\">Organization:</span>
                            <span className=\"text-white\">{event.geoLocation.organization}</span>
                          </div>
                        )}
                        {event.geoLocation.isp && (
                          <div className=\"flex justify-between\">
                            <span className=\"text-gray-400\">ISP:</span>
                            <span className=\"text-white\">{event.geoLocation.isp}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Indicators Tab */}
            <TabsContent value=\"indicators\" className=\"space-y-4 mt-4\">
              <div className=\"space-y-4\">
                <h4 className=\"font-semibold text-white flex items-center\">
                  <Zap className=\"w-5 h-5 mr-2\" />
                  Indicators of Compromise
                </h4>
                
                {event.indicators && event.indicators.length > 0 ? (
                  <div className=\"space-y-3\">
                    {event.indicators.map((indicator, index) => (
                      <div key={index} className=\"p-3 bg-gray-800 rounded-lg border border-gray-700\">
                        <div className=\"flex items-center justify-between mb-2\">
                          <Badge variant=\"outline\" className=\"text-xs\">{indicator.type}</Badge>
                          <div className=\"flex items-center space-x-2\">
                            <span className={`text-xs font-medium ${
                              indicator.confidence >= 80 ? 'text-red-400' :
                              indicator.confidence >= 60 ? 'text-orange-400' :
                              indicator.confidence >= 40 ? 'text-yellow-400' :
                              'text-blue-400'
                            }`}>
                              {indicator.confidence}% confidence
                            </span>
                          </div>
                        </div>
                        <div className=\"flex items-center justify-between\">
                          <span className=\"font-mono text-sm text-white break-all\">{indicator.value}</span>
                          <div className=\"flex items-center space-x-2 ml-2\">
                            <Button
                              variant=\"ghost\"
                              size=\"sm\"
                              onClick={() => handleCopy(indicator.value)}
                              className=\"p-1 h-6 w-6\"
                            >
                              <Copy className=\"w-3 h-3\" />
                            </Button>
                            <Button
                              variant=\"ghost\"
                              size=\"sm\"
                              className=\"p-1 h-6 w-6\"
                            >
                              <ExternalLink className=\"w-3 h-3\" />
                            </Button>
                          </div>
                        </div>
                        {indicator.source && (
                          <div className=\"text-xs text-gray-400 mt-1\">
                            Source: {indicator.source}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className=\"text-center py-8 text-gray-400\">
                    <Zap className=\"w-8 h-8 mx-auto mb-2 opacity-50\" />
                    <p>No indicators of compromise found</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* MITRE Tab */}
            <TabsContent value=\"mitre\" className=\"space-y-4 mt-4\">
              <div className=\"space-y-4\">
                <h4 className=\"font-semibold text-white flex items-center\">
                  <Target className=\"w-5 h-5 mr-2\" />
                  MITRE ATT&CK Mapping
                </h4>
                
                {event.mitreAttackTactics && event.mitreAttackTactics.length > 0 ? (
                  <div className=\"space-y-4\">
                    {event.mitreAttackTactics.map((tactic, tacticIndex) => (
                      <div key={tacticIndex} className=\"p-4 bg-gray-800 rounded-lg border border-gray-700\">
                        <div className=\"mb-3\">
                          <h5 className=\"font-medium text-white\">{tactic.tacticName}</h5>
                          <span className=\"text-xs text-gray-400\">{tactic.tacticId}</span>
                        </div>
                        
                        {tactic.techniques && tactic.techniques.length > 0 && (
                          <div className=\"space-y-3\">
                            <h6 className=\"text-sm font-medium text-gray-300\">Techniques</h6>
                            {tactic.techniques.map((technique, techIndex) => (
                              <div key={techIndex} className=\"pl-4 border-l-2 border-gray-700\">
                                <div className=\"flex items-center justify-between mb-1\">
                                  <span className=\"text-sm text-white\">{technique.techniqueName}</span>
                                  <span className=\"text-xs text-gray-400 font-mono\">{technique.techniqueId}</span>
                                </div>
                                
                                {technique.subTechniques && technique.subTechniques.length > 0 && (
                                  <div className=\"mt-2 space-y-1\">
                                    <span className=\"text-xs text-gray-400\">Sub-techniques:</span>
                                    {technique.subTechniques.map((subTech, subIndex) => (
                                      <div key={subIndex} className=\"pl-4 text-xs\">
                                        <span className=\"text-gray-300\">{subTech.subTechniqueName}</span>
                                        <span className=\"text-gray-500 ml-2\">({subTech.subTechniqueId})</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className=\"text-center py-8 text-gray-400\">
                    <Target className=\"w-8 h-8 mx-auto mb-2 opacity-50\" />
                    <p>No MITRE ATT&CK mapping available</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Raw Data Tab */}
            <TabsContent value=\"raw\" className=\"space-y-4 mt-4\">
              <div className=\"space-y-4\">
                <div className=\"flex items-center justify-between\">
                  <h4 className=\"font-semibold text-white flex items-center\">
                    <Hash className=\"w-5 h-5 mr-2\" />
                    Raw Event Data
                  </h4>
                  <Button
                    variant=\"outline\"
                    size=\"sm\"
                    onClick={() => handleCopy(JSON.stringify(event, null, 2))}
                    className=\"flex items-center space-x-1\"
                  >
                    <Copy className=\"w-3 h-3\" />
                    <span>Copy All</span>
                  </Button>
                </div>

                {/* CEF Format */}
                {cefString && (
                  <div className=\"space-y-2\">
                    <h5 className=\"text-sm font-semibold text-white\">CEF Format</h5>
                    <div className=\"p-3 bg-gray-900 rounded border border-gray-700\">
                      <div className=\"flex items-center justify-between mb-2\">
                        <span className=\"text-xs text-gray-400 uppercase tracking-wide\">Common Event Format</span>
                        <Button
                          variant=\"ghost\"
                          size=\"sm\"
                          onClick={() => handleCopy(cefString)}
                          className=\"p-1 h-5 w-5\"
                        >
                          <Copy className=\"w-3 h-3\" />
                        </Button>
                      </div>
                      <pre className=\"text-xs font-mono text-green-400 whitespace-pre-wrap break-all\">
                        {cefString}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Metadata */}
                {Object.keys(processedMetadata).length > 0 && (
                  <div className=\"space-y-2\">
                    <h5 className=\"text-sm font-semibold text-white\">Metadata</h5>
                    <div className=\"p-3 bg-gray-900 rounded border border-gray-700\">
                      <div className=\"flex items-center justify-between mb-2\">
                        <span className=\"text-xs text-gray-400 uppercase tracking-wide\">Event Metadata</span>
                        <Button
                          variant=\"ghost\"
                          size=\"sm\"
                          onClick={() => handleCopy(JSON.stringify(processedMetadata, null, 2))}
                          className=\"p-1 h-5 w-5\"
                        >
                          <Copy className=\"w-3 h-3\" />
                        </Button>
                      </div>
                      <pre className=\"text-xs font-mono text-blue-400 whitespace-pre-wrap break-all max-h-48 overflow-y-auto\">
                        {JSON.stringify(processedMetadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Full JSON */}
                <div className=\"space-y-2\">
                  <h5 className=\"text-sm font-semibold text-white\">Complete Event JSON</h5>
                  <div className=\"p-3 bg-gray-900 rounded border border-gray-700\">
                    <div className=\"flex items-center justify-between mb-2\">
                      <span className=\"text-xs text-gray-400 uppercase tracking-wide\">Full Event Object</span>
                      <Button
                        variant=\"ghost\"
                        size=\"sm\"
                        onClick={() => handleCopy(JSON.stringify(event, null, 2))}
                        className=\"p-1 h-5 w-5\"
                      >
                        <Copy className=\"w-3 h-3\" />
                      </Button>
                    </div>
                    <pre className=\"text-xs font-mono text-gray-300 whitespace-pre-wrap break-all max-h-96 overflow-y-auto\">
                      {JSON.stringify(event, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </Card>
    </motion.div>
  );
};

export default LiveEventStream;
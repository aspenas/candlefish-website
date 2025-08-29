import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client';
import { FixedSizeList as List } from 'react-window';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  Plus,
  Download,
  Upload,
  Shield,
  Eye,
  EyeOff,
  AlertTriangle,
  Clock,
  Globe,
  Hash,
  Database,
  TrendingUp,
  Trash2,
  Edit,
  ExternalLink,
  RefreshCw,
  CheckCircle,
  XCircle,
  Info,
  Copy
} from 'lucide-react';

// GraphQL Operations
import {
  GET_IOCS,
  SEARCH_IOCS,
  ENRICH_IOC,
  CREATE_IOC,
  UPDATE_IOC,
  WHITELIST_IOC,
  BULK_IMPORT_IOCS
} from '../../graphql/threat-intelligence-operations';

// Components
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';
import { Tooltip } from '../ui/Tooltip';

// Hooks
import { useDebounce } from '../../hooks/useDebounce';

// Types
interface IOCManagementPanelProps {
  organizationId: string;
  className?: string;
}

interface IOC {
  id: string;
  type: string;
  value: string;
  category: string;
  confidence: string;
  severity: string;
  description?: string;
  firstSeen: string;
  lastSeen: string;
  expiresAt?: string;
  isActive: boolean;
  isWhitelisted: boolean;
  whitelistReason?: string;
  falsePositiveRate?: number;
  killChainPhase: string;
  context: Array<{
    contextType: string;
    value: string;
    description?: string;
    confidence: number;
  }>;
  threatActors: Array<{
    id: string;
    name: string;
    aliases: string[];
    actorType: string;
    sophistication: string;
    isActive: boolean;
  }>;
  campaigns: Array<{
    id: string;
    name: string;
    status: string;
    isActive: boolean;
    startDate: string;
    endDate?: string;
  }>;
  sightings: Array<{
    id: string;
    source: string;
    location?: string;
    timestamp: string;
    confidence: string;
    context?: string;
  }>;
  enrichment?: {
    enrichedAt: string;
    sources: string[];
    asn?: {
      number: number;
      name: string;
      country?: string;
      registry?: string;
    };
    whoisData?: {
      registrar?: string;
      registrant?: string;
      creationDate?: string;
      expirationDate?: string;
      nameServers: string[];
    };
    geoLocation?: {
      country?: string;
      region?: string;
      city?: string;
      latitude?: number;
      longitude?: number;
    };
    reputation?: {
      overallScore: number;
      categories: string[];
      firstSeen?: string;
      lastSeen?: string;
    };
    malwareAnalysis?: {
      detectionRate: number;
      firstSubmission?: string;
      lastAnalysis?: string;
      engines: Array<{
        name: string;
        version?: string;
        result?: string;
        detected: boolean;
        category?: string;
      }>;
      signatures: string[];
      behaviors: Array<{
        category: string;
        description: string;
        severity: string;
      }>;
    };
  };
  tags: string[];
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

const IOC_TYPES = [
  'IP_ADDRESS', 'DOMAIN', 'URL', 'EMAIL_ADDRESS', 'FILE_HASH', 'MD5', 'SHA1', 'SHA256',
  'REGISTRY_KEY', 'MUTEX', 'USER_AGENT', 'SSL_CERTIFICATE', 'CVE', 'YARA_RULE', 'SIGMA_RULE'
];

const IOC_CATEGORIES = [
  'NETWORK', 'HOST', 'EMAIL', 'FILE', 'REGISTRY', 'PROCESS', 'SERVICE', 'CERTIFICATE', 'BEHAVIORAL'
];

const CONFIDENCE_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CONFIRMED'];
const SEVERITY_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export const IOCManagementPanel: React.FC<IOCManagementPanelProps> = ({
  organizationId,
  className = ''
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedConfidence, setSelectedConfidence] = useState<string[]>([]);
  const [selectedSeverity, setSelectedSeverity] = useState<string[]>([]);
  const [showActive, setShowActive] = useState(true);
  const [showWhitelisted, setShowWhitelisted] = useState(false);
  const [selectedIOCs, setSelectedIOCs] = useState<string[]>([]);
  const [expandedIOC, setExpandedIOC] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortBy, setSortBy] = useState<string>('lastSeen');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Queries
  const {
    data: iocsData,
    loading: iocsLoading,
    error: iocsError,
    fetchMore,
    refetch: refetchIOCs
  } = useQuery(GET_IOCS, {
    variables: {
      filter: {
        types: selectedTypes.length > 0 ? selectedTypes : undefined,
        categories: selectedCategories.length > 0 ? selectedCategories : undefined,
        confidence: selectedConfidence.length > 0 ? selectedConfidence : undefined,
        severity: selectedSeverity.length > 0 ? selectedSeverity : undefined,
        isActive: showActive ? true : undefined,
        isWhitelisted: showWhitelisted ? true : undefined
      },
      sort: {
        field: sortBy,
        direction: sortOrder.toUpperCase()
      },
      first: 50
    },
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all'
  });

  const [searchIOCs, { data: searchData, loading: searchLoading }] = useLazyQuery(SEARCH_IOCS, {
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all'
  });

  const [enrichIOC, { loading: enrichLoading }] = useLazyQuery(ENRICH_IOC, {
    fetchPolicy: 'no-cache',
    errorPolicy: 'all'
  });

  // Mutations
  const [createIOC] = useMutation(CREATE_IOC, {
    refetchQueries: [{ query: GET_IOCS }],
    awaitRefetchQueries: true
  });

  const [updateIOC] = useMutation(UPDATE_IOC, {
    refetchQueries: [{ query: GET_IOCS }],
    awaitRefetchQueries: true
  });

  const [whitelistIOC] = useMutation(WHITELIST_IOC, {
    refetchQueries: [{ query: GET_IOCS }],
    awaitRefetchQueries: true
  });

  const [bulkImportIOCs] = useMutation(BULK_IMPORT_IOCS, {
    refetchQueries: [{ query: GET_IOCS }],
    awaitRefetchQueries: true
  });

  // Get IOCs data
  const iocs = useMemo(() => {
    if (debouncedSearchQuery && searchData?.searchIOCs?.iocs) {
      return searchData.searchIOCs.iocs;
    }
    return iocsData?.iocs?.edges?.map(edge => edge.node) || [];
  }, [iocsData, searchData, debouncedSearchQuery]);

  // Search effect
  React.useEffect(() => {
    if (debouncedSearchQuery.trim()) {
      searchIOCs({
        variables: {
          query: debouncedSearchQuery,
          types: selectedTypes.length > 0 ? selectedTypes : undefined,
          confidence: selectedConfidence.length > 0 ? selectedConfidence[0] : undefined,
          activeOnly: showActive
        }
      });
    }
  }, [debouncedSearchQuery, selectedTypes, selectedConfidence, showActive, searchIOCs]);

  // Handle IOC enrichment
  const handleEnrichIOC = useCallback(async (ioc: IOC) => {
    try {
      const { data } = await enrichIOC({
        variables: {
          value: ioc.value,
          type: ioc.type
        }
      });

      if (data?.enrichIOC) {
        // Update IOC with enrichment data
        await updateIOC({
          variables: {
            id: ioc.id,
            input: {
              enrichment: data.enrichIOC
            }
          }
        });
      }
    } catch (error) {
      console.error('Error enriching IOC:', error);
    }
  }, [enrichIOC, updateIOC]);

  // Handle IOC whitelist
  const handleWhitelistIOC = useCallback(async (iocId: string, reason: string) => {
    try {
      await whitelistIOC({
        variables: {
          id: iocId,
          reason
        }
      });
    } catch (error) {
      console.error('Error whitelisting IOC:', error);
    }
  }, [whitelistIOC]);

  // Copy to clipboard
  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  // IOC severity colors
  const getSeverityColor = (severity: string) => {
    const colors = {
      CRITICAL: 'text-red-400 bg-red-500/10 border-red-500/20',
      HIGH: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
      MEDIUM: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
      LOW: 'text-blue-400 bg-blue-500/10 border-blue-500/20'
    };
    return colors[severity as keyof typeof colors] || colors.MEDIUM;
  };

  // IOC type icons
  const getIOCTypeIcon = (type: string) => {
    const icons = {
      IP_ADDRESS: Globe,
      DOMAIN: Globe,
      URL: ExternalLink,
      EMAIL_ADDRESS: '@',
      FILE_HASH: Hash,
      MD5: Hash,
      SHA1: Hash,
      SHA256: Hash,
      REGISTRY_KEY: Database,
      MUTEX: Shield,
      USER_AGENT: Info,
      SSL_CERTIFICATE: Shield,
      CVE: AlertTriangle,
      YARA_RULE: Search,
      SIGMA_RULE: Search
    };
    const IconComponent = icons[type as keyof typeof icons];
    return IconComponent || Hash;
  };

  // Render IOC item
  const renderIOCItem = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const ioc = iocs[index];
    if (!ioc) return null;

    const IconComponent = getIOCTypeIcon(ioc.type);
    const isExpanded = expandedIOC === ioc.id;
    const isSelected = selectedIOCs.includes(ioc.id);

    return (
      <div style={style}>
        <motion.div
          layout
          className={`p-4 m-2 rounded-lg border cursor-pointer transition-all duration-200 ${
            isSelected
              ? 'border-blue-500 bg-blue-500/10'
              : isExpanded
                ? 'border-gray-600 bg-gray-800'
                : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
          }`}
          onClick={() => setExpandedIOC(isExpanded ? null : ioc.id)}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              {/* Selection checkbox */}
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => {
                  e.stopPropagation();
                  setSelectedIOCs(prev =>
                    prev.includes(ioc.id)
                      ? prev.filter(id => id !== ioc.id)
                      : [...prev, ioc.id]
                  );
                }}
                className="mt-1"
              />

              {/* IOC Icon and Type */}
              <div className="flex items-center space-x-2">
                <IconComponent className="w-4 h-4 text-gray-400" />
                <Badge variant="outline" className="text-xs">
                  {ioc.type.replace('_', ' ')}
                </Badge>
              </div>

              {/* IOC Value and Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-sm text-white truncate">
                    {ioc.value}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(ioc.value);
                    }}
                    className="p-1"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
                
                {ioc.description && (
                  <p className="text-sm text-gray-400 mt-1 truncate">
                    {ioc.description}
                  </p>
                )}

                <div className="flex items-center space-x-2 mt-2">
                  <Badge className={getSeverityColor(ioc.severity)} variant="outline">
                    {ioc.severity}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      ioc.confidence === 'CONFIRMED' ? 'text-green-400 bg-green-500/10' :
                      ioc.confidence === 'HIGH' ? 'text-blue-400 bg-blue-500/10' :
                      ioc.confidence === 'MEDIUM' ? 'text-yellow-400 bg-yellow-500/10' :
                      'text-gray-400 bg-gray-500/10'
                    }`}
                  >
                    {ioc.confidence}
                  </Badge>
                  
                  {ioc.isWhitelisted && (
                    <Badge variant="outline" className="text-green-400 bg-green-500/10">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Whitelisted
                    </Badge>
                  )}

                  {!ioc.isActive && (
                    <Badge variant="outline" className="text-gray-400 bg-gray-500/10">
                      <XCircle className="w-3 h-3 mr-1" />
                      Inactive
                    </Badge>
                  )}
                </div>

                {/* Tags */}
                {ioc.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {ioc.tags.slice(0, 3).map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {ioc.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{ioc.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-1">
              <Tooltip content="Enrich IOC">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEnrichIOC(ioc);
                  }}
                  disabled={enrichLoading}
                >
                  <RefreshCw className={`w-4 h-4 ${enrichLoading ? 'animate-spin' : ''}`} />
                </Button>
              </Tooltip>

              <Tooltip content={ioc.isWhitelisted ? 'Remove from whitelist' : 'Add to whitelist'}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!ioc.isWhitelisted) {
                      const reason = prompt('Reason for whitelisting:');
                      if (reason) {
                        handleWhitelistIOC(ioc.id, reason);
                      }
                    }
                  }}
                >
                  {ioc.isWhitelisted ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </Tooltip>

              <Tooltip content="View details">
                <Button variant="ghost" size="sm">
                  {isExpanded ? <Eye className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />}
                </Button>
              </Tooltip>
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
                className="pt-4 mt-4 border-t border-gray-700 space-y-4"
              >
                {/* Temporal Information */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <h5 className="text-xs font-semibold text-gray-300 mb-1">First Seen</h5>
                    <p className="text-sm text-white">
                      {new Date(ioc.firstSeen).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-gray-300 mb-1">Last Seen</h5>
                    <p className="text-sm text-white">
                      {new Date(ioc.lastSeen).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-gray-300 mb-1">Kill Chain Phase</h5>
                    <p className="text-sm text-white">{ioc.killChainPhase}</p>
                  </div>
                  {ioc.falsePositiveRate && (
                    <div>
                      <h5 className="text-xs font-semibold text-gray-300 mb-1">False Positive Rate</h5>
                      <p className="text-sm text-white">{(ioc.falsePositiveRate * 100).toFixed(1)}%</p>
                    </div>
                  )}
                </div>

                {/* Context */}
                {ioc.context.length > 0 && (
                  <div>
                    <h5 className="text-sm font-semibold text-white mb-2">Context</h5>
                    <div className="space-y-2">
                      {ioc.context.map((ctx, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-gray-900 rounded">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">{ctx.contextType}</Badge>
                            <span className="text-sm text-white">{ctx.value}</span>
                          </div>
                          <span className="text-xs text-gray-400">{ctx.confidence}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Threat Actors */}
                {ioc.threatActors.length > 0 && (
                  <div>
                    <h5 className="text-sm font-semibold text-white mb-2">Associated Threat Actors</h5>
                    <div className="flex flex-wrap gap-2">
                      {ioc.threatActors.map(actor => (
                        <Badge
                          key={actor.id}
                          variant="outline"
                          className={`text-xs ${
                            actor.isActive ? 'text-red-400 bg-red-500/10' : 'text-gray-400 bg-gray-500/10'
                          }`}
                        >
                          {actor.name} ({actor.actorType})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Campaigns */}
                {ioc.campaigns.length > 0 && (
                  <div>
                    <h5 className="text-sm font-semibold text-white mb-2">Associated Campaigns</h5>
                    <div className="flex flex-wrap gap-2">
                      {ioc.campaigns.map(campaign => (
                        <Badge
                          key={campaign.id}
                          variant="outline"
                          className={`text-xs ${
                            campaign.isActive ? 'text-orange-400 bg-orange-500/10' : 'text-gray-400 bg-gray-500/10'
                          }`}
                        >
                          {campaign.name} ({campaign.status})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Enrichment Data */}
                {ioc.enrichment && (
                  <div>
                    <h5 className="text-sm font-semibold text-white mb-2">Enrichment Data</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Geolocation */}
                      {ioc.enrichment.geoLocation && (
                        <div className="p-3 bg-gray-900 rounded">
                          <h6 className="text-xs font-semibold text-gray-300 mb-2">Location</h6>
                          <p className="text-sm text-white">
                            {[
                              ioc.enrichment.geoLocation.city,
                              ioc.enrichment.geoLocation.region,
                              ioc.enrichment.geoLocation.country
                            ].filter(Boolean).join(', ')}
                          </p>
                        </div>
                      )}

                      {/* ASN */}
                      {ioc.enrichment.asn && (
                        <div className="p-3 bg-gray-900 rounded">
                          <h6 className="text-xs font-semibold text-gray-300 mb-2">ASN</h6>
                          <p className="text-sm text-white">
                            AS{ioc.enrichment.asn.number} - {ioc.enrichment.asn.name}
                          </p>
                          {ioc.enrichment.asn.country && (
                            <p className="text-xs text-gray-400">{ioc.enrichment.asn.country}</p>
                          )}
                        </div>
                      )}

                      {/* Reputation */}
                      {ioc.enrichment.reputation && (
                        <div className="p-3 bg-gray-900 rounded">
                          <h6 className="text-xs font-semibold text-gray-300 mb-2">Reputation</h6>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-white">
                              Score: {ioc.enrichment.reputation.overallScore}/100
                            </span>
                            <div className="flex space-x-1">
                              {ioc.enrichment.reputation.categories.map(cat => (
                                <Badge key={cat} variant="outline" className="text-xs">
                                  {cat}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Malware Analysis */}
                      {ioc.enrichment.malwareAnalysis && (
                        <div className="p-3 bg-gray-900 rounded">
                          <h6 className="text-xs font-semibold text-gray-300 mb-2">Malware Analysis</h6>
                          <p className="text-sm text-white">
                            Detection: {(ioc.enrichment.malwareAnalysis.detectionRate * 100).toFixed(1)}%
                          </p>
                          <p className="text-xs text-gray-400">
                            {ioc.enrichment.malwareAnalysis.engines.length} engines analyzed
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Sightings */}
                {ioc.sightings.length > 0 && (
                  <div>
                    <h5 className="text-sm font-semibold text-white mb-2">Recent Sightings</h5>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {ioc.sightings.slice(0, 5).map((sighting, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-gray-900 rounded text-xs">
                          <div className="flex items-center space-x-2">
                            <span className="text-white">{sighting.source}</span>
                            {sighting.location && (
                              <span className="text-gray-400">@ {sighting.location}</span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">
                              {sighting.confidence}
                            </Badge>
                            <span className="text-gray-400">
                              {new Date(sighting.timestamp).toLocaleDateString()}
                            </span>
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
      </div>
    );
  };

  if (iocsError && !iocsData) {
    return (
      <Card className={`p-6 ${className}`}>
        <ErrorMessage
          title="Failed to Load IOCs"
          message={iocsError.message}
          onRetry={() => refetchIOCs()}
        />
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Search and Filters */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <Database className="w-5 h-5 mr-2" />
            IOC Management
          </h2>
          
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-sm">
              {iocs.length.toLocaleString()} IOCs
            </Badge>
            {selectedIOCs.length > 0 && (
              <Badge className="bg-blue-500/20 text-blue-400">
                {selectedIOCs.length} selected
              </Badge>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search IOCs by value, description, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          {searchLoading && (
            <LoadingSpinner className="absolute right-3 top-1/2 transform -translate-y-1/2" />
          )}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
            <select
              multiple
              value={selectedTypes}
              onChange={(e) => setSelectedTypes(Array.from(e.target.selectedOptions, option => option.value))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
              size={3}
            >
              {IOC_TYPES.map(type => (
                <option key={type} value={type}>
                  {type.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
            <select
              multiple
              value={selectedCategories}
              onChange={(e) => setSelectedCategories(Array.from(e.target.selectedOptions, option => option.value))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
              size={3}
            >
              {IOC_CATEGORIES.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Confidence Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Confidence</label>
            <div className="space-y-1">
              {CONFIDENCE_LEVELS.map(level => (
                <label key={level} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedConfidence.includes(level)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedConfidence([...selectedConfidence, level]);
                      } else {
                        setSelectedConfidence(selectedConfidence.filter(c => c !== level));
                      }
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm text-white">{level}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Status Filters */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showActive}
                  onChange={(e) => setShowActive(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-white">Show Active</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showWhitelisted}
                  onChange={(e) => setShowWhitelisted(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-white">Show Whitelisted</span>
              </label>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add IOC
            </Button>
            <Button variant="outline" size="sm">
              <Upload className="w-4 h-4 mr-1" />
              Bulk Import
            </Button>
            {selectedIOCs.length > 0 && (
              <>
                <Button variant="outline" size="sm">
                  <Eye className="w-4 h-4 mr-1" />
                  Whitelist Selected
                </Button>
                <Button variant="outline" size="sm">
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete Selected
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
            >
              <option value="lastSeen">Last Seen</option>
              <option value="firstSeen">First Seen</option>
              <option value="confidence">Confidence</option>
              <option value="severity">Severity</option>
              <option value="type">Type</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </Card>

      {/* IOC List */}
      <Card className="p-4">
        {iocsLoading && !iocs.length ? (
          <div className="text-center py-12">
            <LoadingSpinner size="lg" />
            <p className="text-gray-400 mt-4">Loading IOCs...</p>
          </div>
        ) : iocs.length > 0 ? (
          <List
            height={600}
            itemCount={iocs.length}
            itemSize={120}
            className="w-full"
          >
            {renderIOCItem}
          </List>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No IOCs found</p>
            <p className="text-sm mt-2">
              {searchQuery || selectedTypes.length > 0 || selectedCategories.length > 0
                ? 'Try adjusting your search criteria'
                : 'IOCs will appear here as they are detected'}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default IOCManagementPanel;
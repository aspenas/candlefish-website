import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useSubscription, useApolloClient } from '@apollo/client';

// GraphQL Operations
import {
  GET_THREAT_INTELLIGENCE_DASHBOARD,
  GET_THREAT_INTELLIGENCE,
  SEARCH_THREATS,
  GET_IOCS,
  SEARCH_IOCS,
  ENRICH_IOC,
  GET_THREAT_ACTORS,
  GET_THREAT_CAMPAIGNS,
  GET_THREAT_FEEDS,
  GET_THREAT_CORRELATIONS,
  GET_THREAT_ANALYTICS,
  GET_THREAT_LANDSCAPE,
  THREAT_INTELLIGENCE_UPDATES,
  IOC_MATCHES,
  NEW_IOCS,
  THREAT_FEED_UPDATES,
  CORRELATION_MATCHES,
  THREAT_ACTOR_ACTIVITY,
  CAMPAIGN_UPDATES,
  THREAT_LANDSCAPE_UPDATES,
  CREATE_IOC,
  UPDATE_IOC,
  WHITELIST_IOC,
  BULK_IMPORT_IOCS,
  CREATE_THREAT_CORRELATION,
  UPDATE_THREAT_FEED,
  SYNC_THREAT_FEED
} from '../graphql/threat-intelligence-operations';

// Hooks
import { useDebounce } from './useDebounce';
import { useConnectionStatus } from './useConnectionStatus';

// Types
export interface ThreatIntelligenceFilters {
  threatTypes?: string[];
  severities?: string[];
  categories?: string[];
  targetedSectors?: string[];
  sources?: string[];
  confidence?: string[];
  timeRange?: {
    start: string;
    end: string;
  };
  isActive?: boolean;
}

export interface IOCFilters {
  types?: string[];
  categories?: string[];
  confidence?: string[];
  severity?: string[];
  isActive?: boolean;
  isWhitelisted?: boolean;
}

export interface RealTimeUpdates {
  threatUpdates: number;
  iocMatches: number;
  newIOCs: number;
  feedUpdates: number;
  correlationMatches: number;
  actorActivity: number;
  campaignUpdates: number;
  landscapeUpdates: number;
}

// Main hook for Threat Intelligence Dashboard
export const useThreatIntelligenceDashboard = (organizationId: string, timeRange = { start: '24h', end: 'now' }) => {
  const [realtimeUpdates, setRealtimeUpdates] = useState<RealTimeUpdates>({
    threatUpdates: 0,
    iocMatches: 0,
    newIOCs: 0,
    feedUpdates: 0,
    correlationMatches: 0,
    actorActivity: 0,
    campaignUpdates: 0,
    landscapeUpdates: 0
  });

  const { isConnected } = useConnectionStatus();

  // Main dashboard query
  const dashboardQuery = useQuery(GET_THREAT_INTELLIGENCE_DASHBOARD, {
    variables: {
      organizationId,
      timeRange
    },
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
    pollInterval: 30000, // Poll every 30 seconds
    notifyOnNetworkStatusChange: true
  });

  // Real-time subscriptions
  const threatIntelUpdates = useSubscription(THREAT_INTELLIGENCE_UPDATES, {
    variables: { organizationId },
    skip: !isConnected,
    onData: () => {
      setRealtimeUpdates(prev => ({ ...prev, threatUpdates: prev.threatUpdates + 1 }));
    }
  });

  const iocMatchesSubscription = useSubscription(IOC_MATCHES, {
    variables: { organizationId },
    skip: !isConnected,
    onData: () => {
      setRealtimeUpdates(prev => ({ ...prev, iocMatches: prev.iocMatches + 1 }));
    }
  });

  const newIOCsSubscription = useSubscription(NEW_IOCS, {
    variables: { organizationId },
    skip: !isConnected,
    onData: () => {
      setRealtimeUpdates(prev => ({ ...prev, newIOCs: prev.newIOCs + 1 }));
    }
  });

  const feedUpdatesSubscription = useSubscription(THREAT_FEED_UPDATES, {
    variables: { organizationId },
    skip: !isConnected,
    onData: () => {
      setRealtimeUpdates(prev => ({ ...prev, feedUpdates: prev.feedUpdates + 1 }));
    }
  });

  const correlationMatchesSubscription = useSubscription(CORRELATION_MATCHES, {
    variables: { organizationId },
    skip: !isConnected,
    onData: () => {
      setRealtimeUpdates(prev => ({ ...prev, correlationMatches: prev.correlationMatches + 1 }));
    }
  });

  const actorActivitySubscription = useSubscription(THREAT_ACTOR_ACTIVITY, {
    variables: { organizationId },
    skip: !isConnected,
    onData: () => {
      setRealtimeUpdates(prev => ({ ...prev, actorActivity: prev.actorActivity + 1 }));
    }
  });

  const campaignUpdatesSubscription = useSubscription(CAMPAIGN_UPDATES, {
    variables: { organizationId },
    skip: !isConnected,
    onData: () => {
      setRealtimeUpdates(prev => ({ ...prev, campaignUpdates: prev.campaignUpdates + 1 }));
    }
  });

  const landscapeUpdatesSubscription = useSubscription(THREAT_LANDSCAPE_UPDATES, {
    variables: { organizationId },
    skip: !isConnected,
    onData: () => {
      setRealtimeUpdates(prev => ({ ...prev, landscapeUpdates: prev.landscapeUpdates + 1 }));
    }
  });

  // Reset realtime updates counter
  const resetRealtimeUpdates = useCallback(() => {
    setRealtimeUpdates({
      threatUpdates: 0,
      iocMatches: 0,
      newIOCs: 0,
      feedUpdates: 0,
      correlationMatches: 0,
      actorActivity: 0,
      campaignUpdates: 0,
      landscapeUpdates: 0
    });
  }, []);

  return {
    ...dashboardQuery,
    realtimeUpdates,
    resetRealtimeUpdates,
    subscriptions: {
      threatIntelUpdates,
      iocMatches: iocMatchesSubscription,
      newIOCs: newIOCsSubscription,
      feedUpdates: feedUpdatesSubscription,
      correlationMatches: correlationMatchesSubscription,
      actorActivity: actorActivitySubscription,
      campaignUpdates: campaignUpdatesSubscription,
      landscapeUpdates: landscapeUpdatesSubscription
    },
    isConnected
  };
};

// Hook for Threat Intelligence with search and filtering
export const useThreatIntelligence = (organizationId: string, filters?: ThreatIntelligenceFilters, searchQuery?: string) => {
  const [searchMode, setSearchMode] = useState(false);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Regular query
  const regularQuery = useQuery(GET_THREAT_INTELLIGENCE, {
    variables: {
      filter: {
        ...filters,
        organizationId
      },
      sort: {
        field: 'lastUpdated',
        direction: 'DESC'
      },
      first: 50
    },
    skip: searchMode,
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all'
  });

  // Search query
  const searchQuery = useQuery(SEARCH_THREATS, {
    variables: {
      query: debouncedSearchQuery,
      filter: {
        ...filters,
        organizationId
      },
      first: 50
    },
    skip: !searchMode || !debouncedSearchQuery,
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all'
  });

  // Switch between regular and search mode
  useEffect(() => {
    setSearchMode(Boolean(debouncedSearchQuery?.trim()));
  }, [debouncedSearchQuery]);

  const activeQuery = searchMode ? searchQuery : regularQuery;
  
  return {
    ...activeQuery,
    data: searchMode ? searchQuery.data?.searchThreats : regularQuery.data?.threatIntelligence,
    searchMode,
    searchQuery: debouncedSearchQuery
  };
};

// Hook for IOC Management
export const useIOCManagement = (organizationId: string, filters?: IOCFilters, searchQuery?: string) => {
  const [searchMode, setSearchMode] = useState(false);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const client = useApolloClient();

  // Regular IOCs query
  const iocsQuery = useQuery(GET_IOCS, {
    variables: {
      filter: {
        ...filters,
        organizationId
      },
      sort: {
        field: 'lastSeen',
        direction: 'DESC'
      },
      first: 100
    },
    skip: searchMode,
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all'
  });

  // Search IOCs query
  const searchIOCsQuery = useQuery(SEARCH_IOCS, {
    variables: {
      query: debouncedSearchQuery,
      types: filters?.types,
      confidence: filters?.confidence?.[0],
      activeOnly: filters?.isActive !== false,
      first: 100
    },
    skip: !searchMode || !debouncedSearchQuery,
    fetchPolicy: 'cache-and-network',
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

  // Switch between regular and search mode
  useEffect(() => {
    setSearchMode(Boolean(debouncedSearchQuery?.trim()));
  }, [debouncedSearchQuery]);

  const activeQuery = searchMode ? searchIOCsQuery : iocsQuery;

  // Enrichment helper
  const enrichIOC = useCallback(async (value: string, type: string) => {
    const result = await client.query({
      query: ENRICH_IOC,
      variables: { value, type },
      fetchPolicy: 'no-cache'
    });
    return result.data?.enrichIOC;
  }, [client]);

  // Bulk operations
  const bulkWhitelist = useCallback(async (iocIds: string[], reason: string) => {
    const promises = iocIds.map(id => 
      whitelistIOC({
        variables: { id, reason }
      })
    );
    return Promise.all(promises);
  }, [whitelistIOC]);

  const bulkDelete = useCallback(async (iocIds: string[]) => {
    // Implementation would depend on having a bulk delete mutation
    console.warn('Bulk delete not implemented');
  }, []);

  return {
    ...activeQuery,
    data: searchMode ? searchIOCsQuery.data?.searchIOCs : iocsQuery.data?.iocs,
    searchMode,
    searchQuery: debouncedSearchQuery,
    mutations: {
      createIOC,
      updateIOC,
      whitelistIOC,
      bulkImportIOCs
    },
    helpers: {
      enrichIOC,
      bulkWhitelist,
      bulkDelete
    }
  };
};

// Hook for Threat Actors
export const useThreatActors = (organizationId: string, filters?: any) => {
  return useQuery(GET_THREAT_ACTORS, {
    variables: {
      filter: {
        ...filters,
        organizationId
      },
      sort: {
        field: 'lastSeen',
        direction: 'DESC'
      },
      first: 100
    },
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all'
  });
};

// Hook for Threat Campaigns
export const useThreatCampaigns = (organizationId: string, filters?: any) => {
  return useQuery(GET_THREAT_CAMPAIGNS, {
    variables: {
      filter: {
        ...filters,
        organizationId
      },
      sort: {
        field: 'startDate',
        direction: 'DESC'
      },
      first: 100
    },
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all'
  });
};

// Hook for Threat Feeds Management
export const useThreatFeeds = (organizationId: string) => {
  const query = useQuery(GET_THREAT_FEEDS, {
    variables: {
      filter: { organizationId },
      sort: {
        field: 'lastUpdate',
        direction: 'DESC'
      },
      first: 50
    },
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all'
  });

  const [updateFeed] = useMutation(UPDATE_THREAT_FEED, {
    refetchQueries: [{ query: GET_THREAT_FEEDS }],
    awaitRefetchQueries: true
  });

  const [syncFeed] = useMutation(SYNC_THREAT_FEED, {
    refetchQueries: [{ query: GET_THREAT_FEEDS }],
    awaitRefetchQueries: true
  });

  const syncAllFeeds = useCallback(async () => {
    if (!query.data?.threatFeeds?.edges) return;
    
    const feeds = query.data.threatFeeds.edges.map((edge: any) => edge.node);
    const promises = feeds
      .filter((feed: any) => feed.isActive)
      .map((feed: any) => 
        syncFeed({
          variables: { id: feed.id }
        })
      );
    
    return Promise.allSettled(promises);
  }, [query.data, syncFeed]);

  return {
    ...query,
    mutations: {
      updateFeed,
      syncFeed
    },
    helpers: {
      syncAllFeeds
    }
  };
};

// Hook for Threat Correlations
export const useThreatCorrelations = (organizationId: string) => {
  const query = useQuery(GET_THREAT_CORRELATIONS, {
    variables: {
      filter: { organizationId },
      first: 50
    },
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all'
  });

  const [createCorrelation] = useMutation(CREATE_THREAT_CORRELATION, {
    refetchQueries: [{ query: GET_THREAT_CORRELATIONS }],
    awaitRefetchQueries: true
  });

  return {
    ...query,
    mutations: {
      createCorrelation
    }
  };
};

// Hook for Threat Analytics
export const useThreatAnalytics = (
  organizationId: string, 
  timeRange = { start: '7d', end: 'now' },
  filters?: any
) => {
  return useQuery(GET_THREAT_ANALYTICS, {
    variables: {
      organizationId,
      timeRange,
      filters
    },
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
    pollInterval: 300000, // Poll every 5 minutes for analytics
  });
};

// Hook for Threat Landscape
export const useThreatLandscape = (
  organizationId: string,
  sector?: string,
  region?: string,
  timeRange = { start: '30d', end: 'now' }
) => {
  return useQuery(GET_THREAT_LANDSCAPE, {
    variables: {
      organizationId,
      sector,
      region,
      timeRange
    },
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all'
  });
};

// Hook for managing filters and search state
export const useFilterState = <T extends Record<string, any>>(initialFilters: T) => {
  const [filters, setFilters] = useState<T>(initialFilters);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  // Update active filters count
  useEffect(() => {
    const count = Object.entries(filters).reduce((acc, [key, value]) => {
      if (Array.isArray(value) && value.length > 0) return acc + 1;
      if (typeof value === 'boolean' && value !== initialFilters[key]) return acc + 1;
      if (value !== undefined && value !== initialFilters[key]) return acc + 1;
      return acc;
    }, 0);
    setActiveFiltersCount(count);
  }, [filters, initialFilters]);

  const updateFilter = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
    setSearchQuery('');
  }, [initialFilters]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  return {
    filters,
    searchQuery,
    activeFiltersCount,
    updateFilter,
    setSearchQuery,
    resetFilters,
    clearSearch,
    hasActiveFilters: activeFiltersCount > 0,
    hasSearch: Boolean(searchQuery.trim())
  };
};

// Hook for pagination
export const usePagination = (pageSize = 50) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [cursor, setCursor] = useState<string | null>(null);
  
  const nextPage = useCallback((newCursor?: string) => {
    setCurrentPage(prev => prev + 1);
    setCursor(newCursor || null);
  }, []);

  const prevPage = useCallback(() => {
    setCurrentPage(prev => Math.max(1, prev - 1));
    setCursor(null); // Reset cursor for previous page
  }, []);

  const resetPagination = useCallback(() => {
    setCurrentPage(1);
    setCursor(null);
  }, []);

  return {
    currentPage,
    cursor,
    pageSize,
    nextPage,
    prevPage,
    resetPagination
  };
};

// Hook for export functionality
export const useDataExport = () => {
  const [exporting, setExporting] = useState(false);

  const exportToCSV = useCallback(async (data: any[], filename: string, columns?: string[]) => {
    setExporting(true);
    try {
      // Simple CSV export implementation
      const headers = columns || Object.keys(data[0] || {});
      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header];
            return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
          }).join(',')
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }, []);

  const exportToJSON = useCallback(async (data: any, filename: string) => {
    setExporting(true);
    try {
      const jsonContent = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }, []);

  return {
    exporting,
    exportToCSV,
    exportToJSON
  };
};

export default {
  useThreatIntelligenceDashboard,
  useThreatIntelligence,
  useIOCManagement,
  useThreatActors,
  useThreatCampaigns,
  useThreatFeeds,
  useThreatCorrelations,
  useThreatAnalytics,
  useThreatLandscape,
  useFilterState,
  usePagination,
  useDataExport
};
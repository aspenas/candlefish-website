import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type {
  Valuation,
  PriceHistory,
  MarketComparison,
  AppraisalRequest,
  PriceAlert,
  PortfolioMetrics,
  ValuationRequest,
  AppraisalRequestData,
  PriceAlertRequest,
} from '../types';

// Keys for React Query cache management
export const valuationKeys = {
  all: ['valuations'] as const,
  item: (itemId: string) => ['valuations', 'item', itemId] as const,
  priceHistory: (itemId: string, timeRange?: string) => 
    ['valuations', 'priceHistory', itemId, timeRange] as const,
  marketComparisons: (valuationId: string) => 
    ['valuations', 'marketComparisons', valuationId] as const,
  appraisalRequests: (itemId?: string) => 
    ['appraisalRequests', itemId] as const,
  priceAlerts: (itemId?: string) => 
    ['priceAlerts', itemId] as const,
  portfolioMetrics: () => ['portfolio', 'metrics'] as const,
  portfolioAnalytics: (timeRange?: string) => 
    ['portfolio', 'analytics', timeRange] as const,
};

// Hook for getting item valuations
export const useValuations = (itemId: string) => {
  return useQuery({
    queryKey: valuationKeys.item(itemId),
    queryFn: async () => {
      const response = await api.getValuations(itemId);
      return response.data as Valuation[];
    },
    enabled: !!itemId,
  });
};

// Hook for creating valuations
export const useCreateValuation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ValuationRequest) => {
      const response = await api.createValuation(data);
      return response.data as Valuation;
    },
    onSuccess: (newValuation) => {
      // Invalidate and refetch item valuations
      queryClient.invalidateQueries({
        queryKey: valuationKeys.item(newValuation.item_id),
      });
      
      // Also invalidate portfolio metrics
      queryClient.invalidateQueries({
        queryKey: valuationKeys.portfolioMetrics(),
      });
    },
  });
};

// Hook for updating valuations
export const useUpdateValuation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ valuationId, data }: { valuationId: string; data: Partial<Valuation> }) => {
      const response = await api.updateValuation(valuationId, data);
      return response.data as Valuation;
    },
    onSuccess: (updatedValuation) => {
      // Update specific valuation in cache
      queryClient.setQueryData(
        valuationKeys.item(updatedValuation.item_id),
        (oldData: Valuation[] | undefined) => {
          if (!oldData) return [updatedValuation];
          return oldData.map(v => v.id === updatedValuation.id ? updatedValuation : v);
        }
      );

      // Invalidate portfolio metrics
      queryClient.invalidateQueries({
        queryKey: valuationKeys.portfolioMetrics(),
      });
    },
  });
};

// Hook for price history
export const usePriceHistory = (itemId: string, timeRange?: string) => {
  return useQuery({
    queryKey: valuationKeys.priceHistory(itemId, timeRange),
    queryFn: async () => {
      const response = await api.getPriceHistory(itemId, timeRange);
      return response.data as PriceHistory[];
    },
    enabled: !!itemId,
  });
};

// Hook for market comparisons
export const useMarketComparisons = (valuationId: string) => {
  return useQuery({
    queryKey: valuationKeys.marketComparisons(valuationId),
    queryFn: async () => {
      const response = await api.getMarketComparisons(valuationId);
      return response.data as MarketComparison[];
    },
    enabled: !!valuationId,
  });
};

// Hook for refreshing market comparisons
export const useRefreshMarketComparisons = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (valuationId: string) => {
      const response = await api.refreshMarketComparisons(valuationId);
      return response.data as MarketComparison[];
    },
    onSuccess: (newComparisons, valuationId) => {
      // Update market comparisons cache
      queryClient.setQueryData(
        valuationKeys.marketComparisons(valuationId),
        newComparisons
      );
    },
  });
};

// Hook for appraisal requests
export const useAppraisalRequests = (itemId?: string) => {
  return useQuery({
    queryKey: valuationKeys.appraisalRequests(itemId),
    queryFn: async () => {
      const response = await api.getAppraisalRequests(itemId);
      return response.data as AppraisalRequest[];
    },
  });
};

// Hook for creating appraisal requests
export const useCreateAppraisalRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AppraisalRequestData) => {
      const response = await api.createAppraisalRequest(data);
      return response.data as AppraisalRequest;
    },
    onSuccess: (newRequest) => {
      // Invalidate appraisal requests
      queryClient.invalidateQueries({
        queryKey: valuationKeys.appraisalRequests(),
      });
      queryClient.invalidateQueries({
        queryKey: valuationKeys.appraisalRequests(newRequest.item_id),
      });
    },
  });
};

// Hook for price alerts
export const usePriceAlerts = (itemId?: string) => {
  return useQuery({
    queryKey: valuationKeys.priceAlerts(itemId),
    queryFn: async () => {
      const response = await api.getPriceAlerts(itemId);
      return response.data as PriceAlert[];
    },
  });
};

// Hook for creating price alerts
export const useCreatePriceAlert = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: PriceAlertRequest) => {
      const response = await api.createPriceAlert(data);
      return response.data as PriceAlert;
    },
    onSuccess: (newAlert) => {
      // Invalidate price alerts
      queryClient.invalidateQueries({
        queryKey: valuationKeys.priceAlerts(),
      });
      queryClient.invalidateQueries({
        queryKey: valuationKeys.priceAlerts(newAlert.item_id),
      });
    },
  });
};

// Hook for updating price alerts
export const useUpdatePriceAlert = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ alertId, data }: { alertId: string; data: Partial<PriceAlert> }) => {
      const response = await api.updatePriceAlert(alertId, data);
      return response.data as PriceAlert;
    },
    onSuccess: (updatedAlert) => {
      // Update alert in cache
      queryClient.setQueryData(
        valuationKeys.priceAlerts(updatedAlert.item_id),
        (oldData: PriceAlert[] | undefined) => {
          if (!oldData) return [updatedAlert];
          return oldData.map(a => a.id === updatedAlert.id ? updatedAlert : a);
        }
      );
    },
  });
};

// Hook for toggling price alerts
export const useTogglePriceAlert = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ alertId, isActive }: { alertId: string; isActive: boolean }) => {
      const response = await api.togglePriceAlert(alertId, isActive);
      return response.data as PriceAlert;
    },
    onSuccess: (updatedAlert) => {
      // Update alert in cache
      queryClient.setQueryData(
        valuationKeys.priceAlerts(updatedAlert.item_id),
        (oldData: PriceAlert[] | undefined) => {
          if (!oldData) return [updatedAlert];
          return oldData.map(a => a.id === updatedAlert.id ? updatedAlert : a);
        }
      );
    },
  });
};

// Hook for deleting price alerts
export const useDeletePriceAlert = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string) => {
      await api.deletePriceAlert(alertId);
      return alertId;
    },
    onSuccess: (deletedAlertId) => {
      // Remove alert from all relevant caches
      queryClient.setQueriesData(
        { queryKey: ['priceAlerts'] },
        (oldData: PriceAlert[] | undefined) => {
          if (!oldData) return [];
          return oldData.filter(a => a.id !== deletedAlertId);
        }
      );
    },
  });
};

// Hook for portfolio metrics
export const usePortfolioMetrics = () => {
  return useQuery({
    queryKey: valuationKeys.portfolioMetrics(),
    queryFn: async () => {
      const response = await api.getPortfolioMetrics();
      return response.data as PortfolioMetrics;
    },
  });
};

// Hook for portfolio analytics with time range
export const usePortfolioAnalytics = (timeRange?: string) => {
  return useQuery({
    queryKey: valuationKeys.portfolioAnalytics(timeRange),
    queryFn: async () => {
      const response = await api.getPortfolioAnalytics(timeRange);
      return response.data;
    },
  });
};

// Hook for triggering AI valuations
export const useTriggerAIValuation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, forceRefresh }: { itemId: string; forceRefresh?: boolean }) => {
      const response = await api.triggerAIValuation(itemId, forceRefresh);
      return response.data as Valuation;
    },
    onSuccess: (newValuation) => {
      // Invalidate item valuations to refetch
      queryClient.invalidateQueries({
        queryKey: valuationKeys.item(newValuation.item_id),
      });
      
      // Invalidate portfolio metrics
      queryClient.invalidateQueries({
        queryKey: valuationKeys.portfolioMetrics(),
      });
    },
  });
};

// Hook for triggering market analysis
export const useTriggerMarketAnalysis = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const response = await api.triggerMarketAnalysis(itemId);
      return response.data as Valuation;
    },
    onSuccess: (newValuation) => {
      // Invalidate item valuations to refetch
      queryClient.invalidateQueries({
        queryKey: valuationKeys.item(newValuation.item_id),
      });
      
      // Invalidate portfolio metrics
      queryClient.invalidateQueries({
        queryKey: valuationKeys.portfolioMetrics(),
      });
    },
  });
};

// Combined hook for item valuation data
export const useItemValuationData = (itemId: string, timeRange?: string) => {
  const valuations = useValuations(itemId);
  const priceHistory = usePriceHistory(itemId, timeRange);
  const appraisalRequests = useAppraisalRequests(itemId);
  const priceAlerts = usePriceAlerts(itemId);

  const currentValuation = valuations.data?.[0]; // Assuming most recent first
  const marketComparisons = useMarketComparisons(currentValuation?.id || '');

  return {
    valuations: valuations.data || [],
    currentValuation,
    priceHistory: priceHistory.data || [],
    marketComparisons: marketComparisons.data || [],
    appraisalRequests: appraisalRequests.data || [],
    priceAlerts: priceAlerts.data || [],
    isLoading: valuations.isLoading || priceHistory.isLoading,
    error: valuations.error || priceHistory.error,
  };
};
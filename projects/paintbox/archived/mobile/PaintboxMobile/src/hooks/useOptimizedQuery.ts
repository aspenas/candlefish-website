import { useQuery, QueryResult, QueryHookOptions, OperationVariables } from '@apollo/client';
import { DocumentNode } from 'graphql';
import { useCallback, useMemo, useRef, useEffect } from 'react';
import { PerformanceMonitor, BatchRequestHandler } from '../services/performanceOptimizations';

interface OptimizedQueryOptions<TData, TVariables extends OperationVariables>
  extends QueryHookOptions<TData, TVariables> {
  // Enable query batching
  enableBatching?: boolean;
  // Custom cache key for batching
  batchKey?: string;
  // Enable performance monitoring
  trackPerformance?: boolean;
  // Prefetch related queries
  prefetchQueries?: DocumentNode[];
}

interface OptimizedQueryResult<TData, TVariables extends OperationVariables>
  extends QueryResult<TData, TVariables> {
  // Performance metrics
  responseTime?: number;
  cacheHit?: boolean;
}

const performanceMonitor = PerformanceMonitor.getInstance();
const batchHandler = new BatchRequestHandler();

export function useOptimizedQuery<TData = any, TVariables extends OperationVariables = OperationVariables>(
  query: DocumentNode,
  options: OptimizedQueryOptions<TData, TVariables> = {}
): OptimizedQueryResult<TData, TVariables> {
  const {
    enableBatching = false,
    batchKey,
    trackPerformance = true,
    prefetchQueries = [],
    ...apolloOptions
  } = options;

  const startTimeRef = useRef<number>();
  const operationName = query.definitions[0]?.kind === 'OperationDefinition'
    ? query.definitions[0].name?.value || 'Unknown'
    : 'Unknown';

  // Enhanced fetch policy for better caching
  const optimizedOptions = useMemo(() => ({
    ...apolloOptions,
    fetchPolicy: apolloOptions.fetchPolicy || 'cache-first',
    errorPolicy: apolloOptions.errorPolicy || 'all',
    notifyOnNetworkStatusChange: apolloOptions.notifyOnNetworkStatusChange ?? true,
    onQueryUpdated: (observableQuery: any) => {
      if (trackPerformance && startTimeRef.current) {
        const responseTime = Date.now() - startTimeRef.current;
        performanceMonitor.trackApiCall(operationName, responseTime);
      }
      return apolloOptions.onQueryUpdated?.(observableQuery);
    },
  }), [apolloOptions, trackPerformance, operationName]);

  // Track query start time
  useEffect(() => {
    if (trackPerformance) {
      startTimeRef.current = Date.now();
    }
  }, [options.variables, trackPerformance]);

  // Execute the query
  const result = useQuery<TData, TVariables>(query, optimizedOptions);

  // Calculate performance metrics
  const responseTime = useMemo(() => {
    if (trackPerformance && startTimeRef.current && !result.loading) {
      return Date.now() - startTimeRef.current;
    }
    return undefined;
  }, [result.loading, trackPerformance]);

  // Determine if result came from cache
  const cacheHit = useMemo(() => {
    return result.networkStatus === 1 && !result.loading && result.data;
  }, [result.networkStatus, result.loading, result.data]);

  // Prefetch related queries
  useEffect(() => {
    if (result.data && prefetchQueries.length > 0) {
      prefetchQueries.forEach(prefetchQuery => {
        // Would implement prefetching logic here
        console.log(`Prefetching related query for ${operationName}`);
      });
    }
  }, [result.data, prefetchQueries, operationName]);

  // Enhanced refetch with batching support
  const refetch = useCallback(
    async (variables?: Partial<TVariables>) => {
      if (enableBatching && batchKey) {
        return batchHandler.batchedRequest(
          `${operationName}_refetch_${JSON.stringify(variables)}`,
          () => result.refetch(variables),
          batchKey
        );
      }
      return result.refetch(variables);
    },
    [result.refetch, enableBatching, batchKey, operationName]
  );

  // Return enhanced result
  return {
    ...result,
    refetch,
    responseTime,
    cacheHit,
  };
}

// Hook for optimized mutations with performance tracking
export function useOptimizedMutation<TData = any, TVariables extends OperationVariables = OperationVariables>(
  mutation: DocumentNode,
  options: any = {}
) {
  const performanceMonitor = PerformanceMonitor.getInstance();
  const operationName = mutation.definitions[0]?.kind === 'OperationDefinition'
    ? mutation.definitions[0].name?.value || 'Unknown'
    : 'Unknown';

  const { useMutation } = require('@apollo/client');

  const [mutate, result] = useMutation<TData, TVariables>(mutation, {
    ...options,
    onCompleted: (data: TData) => {
      console.log(`Mutation ${operationName} completed successfully`);
      options.onCompleted?.(data);
    },
    onError: (error: any) => {
      console.error(`Mutation ${operationName} failed:`, error);
      performanceMonitor.trackApiCall(`${operationName}_error`, 0);
      options.onError?.(error);
    },
  });

  const optimizedMutate = useCallback(
    async (mutationOptions?: any) => {
      const startTime = Date.now();

      try {
        const result = await mutate(mutationOptions);
        const duration = Date.now() - startTime;
        performanceMonitor.trackApiCall(operationName, duration);

        console.log(`Mutation ${operationName} completed in ${duration}ms`);
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        performanceMonitor.trackApiCall(`${operationName}_error`, duration);
        throw error;
      }
    },
    [mutate, operationName, performanceMonitor]
  );

  return [optimizedMutate, result];
}

// Hook for optimized subscriptions
export function useOptimizedSubscription<TData = any, TVariables extends OperationVariables = OperationVariables>(
  subscription: DocumentNode,
  options: any = {}
) {
  const { useSubscription } = require('@apollo/client');
  const performanceMonitor = PerformanceMonitor.getInstance();

  const operationName = subscription.definitions[0]?.kind === 'OperationDefinition'
    ? subscription.definitions[0].name?.value || 'Unknown'
    : 'Unknown';

  const result = useSubscription<TData, TVariables>(subscription, {
    ...options,
    onData: (data: any) => {
      performanceMonitor.trackApiCall(`${operationName}_subscription`, 0);
      options.onData?.(data);
    },
  });

  return result;
}

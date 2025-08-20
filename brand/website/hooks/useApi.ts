import { useState, useEffect, useCallback } from 'react';
import { ApiResponse, PaginatedResponse } from '../types/api';

interface UseApiOptions {
  immediate?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  execute: (...args: any[]) => Promise<T>;
  reset: () => void;
}

export function useApi<T>(
  apiFunction: (...args: any[]) => Promise<ApiResponse<T>>,
  options: UseApiOptions = {}
): UseApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(options.immediate || false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async (...args: any[]): Promise<T> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiFunction(...args);
      
      if (!response.success) {
        throw new Error(response.error || 'API request failed');
      }
      
      setData(response.data);
      options.onSuccess?.(response.data);
      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      options.onError?.(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [apiFunction, options]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (options.immediate) {
      execute();
    }
  }, [execute, options.immediate]);

  return { data, loading, error, execute, reset };
}

interface UsePaginatedApiState<T> extends UseApiState<PaginatedResponse<T>> {
  page: number;
  setPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export function usePaginatedApi<T>(
  apiFunction: (...args: any[]) => Promise<ApiResponse<PaginatedResponse<T>>>,
  initialPage: number = 1,
  options: UseApiOptions = {}
): UsePaginatedApiState<T> {
  const [page, setPageState] = useState(initialPage);
  const { data, loading, error, execute, reset } = useApi(apiFunction, options);

  const setPage = useCallback((newPage: number) => {
    setPageState(newPage);
  }, []);

  const nextPage = useCallback(() => {
    if (data && page < data.totalPages) {
      setPageState(page + 1);
    }
  }, [data, page]);

  const prevPage = useCallback(() => {
    if (page > 1) {
      setPageState(page - 1);
    }
  }, [page]);

  const hasNextPage = Boolean(data && page < data.totalPages);
  const hasPrevPage = page > 1;

  // Execute API call when page changes
  useEffect(() => {
    if (options.immediate || page !== initialPage) {
      execute(page);
    }
  }, [page, execute, options.immediate, initialPage]);

  return {
    data,
    loading,
    error,
    execute,
    reset,
    page,
    setPage,
    nextPage,
    prevPage,
    hasNextPage,
    hasPrevPage
  };
}